import { UserData } from "aws-cdk-lib/aws-ec2";
import { CpuArchitecture } from "aws-cdk-lib/aws-ecs";

export interface UserDataProps {
  authorizedKeys: string[];
  /** CloudWatch agent config JSON string */
  cloudWatchAgentConfig: string;
  /** Image URI from ECR */
  imageUri: string;
  /** Application port */
  port: number;
  /** Environment variables for the container */
  variables?: Array<{ [key: string]: string }>;
  /** If set, Traefik is started and routes traffic via Let's Encrypt TLS */
  domain?: string;
  /** Required when domain is set */
  acmeEmail?: string;
  /** Architecture of the instance */
  architecture?: CpuArchitecture;
}

/**
 * Builds an EC2 UserData object containing the full bootstrap script.
 */
export function buildUserData(props: UserDataProps): UserData {
  const userData = UserData.forLinux({ shebang: "#!/bin/bash" });

  const envFlags = (props.variables || [])
    .flatMap((obj) => Object.entries(obj))
    .map(([k, v]) => `-e ${k}='${v.replace(/'/g, "'\\\\''")}'`)
    .join(" ");

  const ecrRegistry = props.imageUri.split("/")[0];
  const arch = props.architecture === CpuArchitecture.ARM64 ? "arm64" : "amd64";

  userData.addCommands(
    // Redirect all output to user-data.log for CloudWatch ingestion
    `exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1`,
    `echo "==> Bootstrap started at $(date)"`,
    `export DEBIAN_FRONTEND=noninteractive`,

    // ----------------------------------------------------------------
    // System packages
    // ----------------------------------------------------------------
    `echo "==> Installing system packages"`,
    `sudo apt-get update -y`,
    `sudo apt-get install -y ca-certificates curl gnupg git unzip awscli amazon-ecr-credential-helper jq psmisc`,

    // ----------------------------------------------------------------
    // Docker
    // ----------------------------------------------------------------
    `echo "==> Installing Docker"`,
    `install -m 0755 -d /etc/apt/keyrings`,
    `curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc`,
    `chmod a+r /etc/apt/keyrings/docker.asc`,
    `echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null`,
    `apt-get update -y`,
    `apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin`,
    `systemctl enable docker.socket`,
    `systemctl enable docker`,
    `systemctl daemon-reload`,
    `systemctl restart docker.socket`,
    `systemctl restart docker`,
    `echo "==> Docker version: $(docker --version)"`,
    `echo "==> Docker Compose version: $(docker compose version)"`,

    // ----------------------------------------------------------------
    // Authorized SSH keys
    // ----------------------------------------------------------------
    `echo "==> Injecting authorized SSH keys"`,
    `sudo mkdir -p /home/ubuntu/.ssh`,
    `sudo chmod 700 /home/ubuntu/.ssh`,
    ...props.authorizedKeys.map(
      (key) => `sudo echo "${escapeForBash(key)}" >> /home/ubuntu/.ssh/authorized_keys`
    ),
    `sudo chmod 600 /home/ubuntu/.ssh/authorized_keys`,
    `sudo chown -R ubuntu:ubuntu /home/ubuntu/.ssh`,

    // ----------------------------------------------------------------
    // CloudWatch agent
    // ----------------------------------------------------------------
    `echo "==> Creating log files"`,
    `sudo touch /var/log/user-data.log /var/log/syslog`,

    `echo "==> Installing CloudWatch agent for ${arch}"`,
    `wget -q https://amazoncloudwatch-agent.s3.amazonaws.com/ubuntu/${arch}/latest/amazon-cloudwatch-agent.deb -O /tmp/amazon-cloudwatch-agent.deb`,
    `sudo dpkg -i /tmp/amazon-cloudwatch-agent.deb`,
    `rm /tmp/amazon-cloudwatch-agent.deb`,

    `echo "==> Writing CloudWatch agent config"`,
    writeHereDoc(
      "/tmp/amazon-cloudwatch-agent-config.json",
      props.cloudWatchAgentConfig
    ),

    `echo "==> Starting CloudWatch agent"`,
    `/usr/bin/amazon-cloudwatch-agent-ctl \\`,
    `  -a fetch-config -m ec2 \\`,
    `  -c file:/tmp/amazon-cloudwatch-agent-config.json -s`,
    `echo "==> CloudWatch agent status: $(systemctl is-active amazon-cloudwatch-agent)"`,

    // ----------------------------------------------------------------
    // Docker network
    // ----------------------------------------------------------------
    `echo "==> Creating Docker network: thunder"`,
    `docker network create thunder 2>/dev/null || true`,

    // ----------------------------------------------------------------
    // Traefik (only when domain is provided)
    // ----------------------------------------------------------------
    ...buildTraefikBlock(props),

    // ----------------------------------------------------------------
    // Pull and Run Application
    // ----------------------------------------------------------------
    `echo "==> Logging into ECR"`,
    `aws ecr get-login-password --region $(echo ${ecrRegistry} | cut -d. -f4) | docker login --username AWS --password-stdin ${ecrRegistry}`,
    `echo "==> Pulling image: ${props.imageUri}"`,
    `docker pull ${props.imageUri}`,

    `echo "==> Starting application container"`,
    props.domain 
      ? `docker run -d \\
          --name app \\
          --restart unless-stopped \\
          --network thunder \\
          -l "traefik.enable=true" \\
          -l "traefik.http.routers.app.rule=Host('${props.domain}')" \\
          -l "traefik.http.routers.app.entrypoints=websecure" \\
          -l "traefik.http.routers.app.tls=true" \\
          -l "traefik.http.routers.app.tls.certresolver=letsencrypt" \\
          -l "traefik.http.services.app.loadbalancer.server.port=${props.port}" \\
          ${envFlags} \\
          ${props.imageUri}`
      : `docker run -d \\
          --name app \\
          --restart unless-stopped \\
          -p 0.0.0.0:${props.port}:${props.port} \\
          ${envFlags} \\
          ${props.imageUri}`,

    `echo "==> Container status: $(docker ps -a --filter name=app)"`,
    `echo "==> Bootstrap complete at $(date)"`
  );

  return userData;
}

function buildTraefikBlock(props: UserDataProps): string[] {
  if (!props.domain) return [];

  const email = props.acmeEmail ?? `admin@${props.domain}`;

  return [
    `echo "==> Starting Traefik"`,
    `mkdir -p /data/traefik/certs`,
    `touch /data/traefik/certs/acme.json`,
    `chmod 600 /data/traefik/certs/acme.json`,
    `docker run -d \\
      --name traefik \\
      --restart unless-stopped \\
      --network thunder \\
      -p 80:80 \\
      -p 443:443 \\
      -v /var/run/docker.sock:/var/run/docker.sock:ro \\
      -v /data/traefik/certs:/certs \\
      traefik:v3 \\
        --providers.docker=true \\
        --providers.docker.exposedbydefault=false \\
        --providers.docker.network=thunder \\
        --entrypoints.web.address=:80 \\
        --entrypoints.web.http.redirections.entrypoint.to=websecure \\
        --entrypoints.web.http.redirections.entrypoint.scheme=https \\
        --entrypoints.websecure.address=:443 \\
        --certificatesresolvers.letsencrypt.acme.email=${email} \\
        --certificatesresolvers.letsencrypt.acme.storage=/certs/acme.json \\
        --certificatesresolvers.letsencrypt.acme.tlschallenge=true`,
    `echo "==> Traefik started"`,
  ];
}

function writeHereDoc(filePath: string, content: string): string {
  const delimiter = `EOF_HEREDOC`;
  return `cat > ${filePath} << '${delimiter}'\n${content}\n${delimiter}`;
}

function escapeForBash(str: string): string {
  return str
    .replace(/\\\\/g, "\\\\\\\\")
    .replace(/"/g, '\\\\"')
    .replace(/\\$/g, "\\\\$")
    .replace(/`/g, "\\\\`");
}
