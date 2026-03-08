import { UserData } from "aws-cdk-lib/aws-ec2";

export interface UserDataProps {
  authorizedKeys: string[];
  /** Hydrated docker-compose.yml content (from hydrate.ts) */
  composeYaml: string;
  /** Hydrated .env file content (from hydrate.ts) */
  envFileContent: string;
  /** Template slug, used as directory name on the instance */
  templateSlug: string;
  /** CloudWatch agent config JSON string */
  cloudWatchAgentConfig: string;
  /** If set, Traefik is started and routes traffic via Let's Encrypt TLS */
  domain?: string;
  /** Required when domain is set */
  acmeEmail?: string;
}

/**
 * Builds an EC2 UserData object containing the full bootstrap script.
 * Everything runs once on first boot.
 */
export function buildUserData(props: UserDataProps): UserData {
  const userData = UserData.forLinux({ shebang: "#!/bin/bash" });

  userData.addCommands(
    // Redirect all output to user-data.log for CloudWatch ingestion
    `exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1`,
    `echo "==> Bootstrap started at $(date)"`,

    // ----------------------------------------------------------------
    // System packages
    // ----------------------------------------------------------------
    `echo "==> Installing system packages"`,
    `apt-get update -y`,
    `apt-get install -y ca-certificates curl gnupg git unzip awscli`,

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
    `systemctl enable docker`,
    `systemctl start docker`,
    `echo "==> Docker version: $(docker --version)"`,
    `echo "==> Docker Compose version: $(docker compose version)"`,

    // ----------------------------------------------------------------
    // Authorized SSH keys
    // ----------------------------------------------------------------
    `echo "==> Injecting authorized SSH keys"`,
    `mkdir -p /home/ubuntu/.ssh`,
    `chmod 700 /home/ubuntu/.ssh`,
    ...props.authorizedKeys.map(
      (key) => `echo "${escapeForBash(key)}" >> /home/ubuntu/.ssh/authorized_keys`
    ),
    `chmod 600 /home/ubuntu/.ssh/authorized_keys`,
    `chown -R ubuntu:ubuntu /home/ubuntu/.ssh`,

    // ----------------------------------------------------------------
    // CloudWatch agent
    // ----------------------------------------------------------------
    `echo "==> Installing CloudWatch agent"`,
    `wget -q https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb -O /tmp/amazon-cloudwatch-agent.deb`,
    `dpkg -i /tmp/amazon-cloudwatch-agent.deb`,
    `rm /tmp/amazon-cloudwatch-agent.deb`,

    // Write agent config inline
    `echo "==> Writing CloudWatch agent config"`,
    `mkdir -p /opt/aws/amazon-cloudwatch-agent/etc`,
    writeHereDoc(
      "/opt/aws/amazon-cloudwatch-agent/etc/config.json",
      props.cloudWatchAgentConfig
    ),

    `echo "==> Starting CloudWatch agent"`,
    `/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl `,
    `  -a fetch-config -m ec2 `,
    `  -c file:/opt/aws/amazon-cloudwatch-agent/etc/config.json -s`,
    `echo "==> CloudWatch agent started"`,

    // ----------------------------------------------------------------
    // Docker network
    // ----------------------------------------------------------------
    `docker network create coolify 2>/dev/null || true`,

    // ----------------------------------------------------------------
    // Traefik (only when domain is provided)
    // ----------------------------------------------------------------
    ...buildTraefikBlock(props),

    // ----------------------------------------------------------------
    // Write compose files
    // ----------------------------------------------------------------
    `echo "==> Writing service files for ${props.templateSlug}"`,
    `mkdir -p /data/services/${props.templateSlug}/volumes`,

    writeHereDoc(
      `/data/services/${props.templateSlug}/.env`,
      props.envFileContent
    ),

    writeHereDoc(
      `/data/services/${props.templateSlug}/docker-compose.yml`,
      props.composeYaml
    ),

    // Pre-create volume directories so they are not created as root by Docker
    // and ensure they are writable by any user.
    `echo "==> Pre-creating volume directories"`,
    `cd /data/services/${props.templateSlug}`,
    // Find all ./volumes/xxx paths in the compose file and create them
    `grep -oE '\./volumes/[^: "]+' docker-compose.yml | xargs -r mkdir -p || true`,
    `chmod -R 777 /data/services/${props.templateSlug}/volumes`,

    // ----------------------------------------------------------------
    // Start the service
    // ----------------------------------------------------------------
    `echo "==> Starting service"`,
    `cd /data/services/${props.templateSlug}`,
    `docker compose --env-file .env pull`,
    `docker compose --env-file .env up -d`,

    `echo "==> Bootstrap complete at $(date)"`,
    `echo "==> Service status:"`,
    `docker compose --env-file /data/services/${props.templateSlug}/.env -f /data/services/${props.templateSlug}/docker-compose.yml ps`
  );

  return userData;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildTraefikBlock(props: UserDataProps): string[] {
  if (!props.domain) {
    return [
      `echo "==> No domain provided — skipping Traefik (services will be accessible via EIP)"`,
    ];
  }

  const email = props.acmeEmail ?? `admin@${props.domain}`;

  return [
    `echo "==> Starting Traefik"`,
    `mkdir -p /data/traefik/certs`,
    `touch /data/traefik/certs/acme.json`,
    `chmod 600 /data/traefik/certs/acme.json`,
    `docker run -d `,
    `  --name traefik `,
    `  --restart unless-stopped `,
    `  --network coolify `,
    `  -p 80:80 `,
    `  -p 443:443 `,
    `  -v /var/run/docker.sock:/var/run/docker.sock:ro `,
    `  -v /data/traefik/certs:/certs `,
    `  traefik:v3 `,
    `    --providers.docker=true `,
    `    --providers.docker.exposedbydefault=false `,
    `    --providers.docker.network=coolify `,
    `    --entrypoints.web.address=:80 `,
    `    --entrypoints.web.http.redirections.entrypoint.to=websecure `,
    `    --entrypoints.web.http.redirections.entrypoint.scheme=https `,
    `    --entrypoints.websecure.address=:443 `,
    `    --certificatesresolvers.letsencrypt.acme.email=${email} `,
    `    --certificatesresolvers.letsencrypt.acme.storage=/certs/acme.json `,
    `    --certificatesresolvers.letsencrypt.acme.tlschallenge=true`,
    `echo "==> Traefik started"`,
  ];
}

/**
 * Writes a multiline string to a file on the EC2 instance using a bash heredoc.
 * Uses a random delimiter to avoid conflicts with file content.
 */
function writeHereDoc(filePath: string, content: string): string {
  // Use a unique delimiter that is extremely unlikely to appear in the content
  const delimiter = `COOLIFY_HEREDOC_EOF`;
  return `cat > ${filePath} << '${delimiter}'
${content}
${delimiter}`;
}

/**
 * Escapes a string for safe embedding inside a bash double-quoted string.
 * Used only for SSH public keys, which should never contain special chars —
 * but we escape defensively.
 */
function escapeForBash(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\$/g, "\\$")
    .replace(/`/g, "\\`");
}
