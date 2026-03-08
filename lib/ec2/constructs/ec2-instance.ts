import { Tags } from "aws-cdk-lib";
import {
  InstanceType,
  UserData,
  Vpc,
  IVpc,
  SubnetType,
  SecurityGroup,
  Peer,
  Port,
  MachineImage,
  OperatingSystemType,
  Instance,
  CfnEIP,
  BlockDeviceVolume,
  EbsDeviceVolumeType,
} from "aws-cdk-lib/aws-ec2";
import { CpuArchitecture } from "aws-cdk-lib/aws-ecs";
import { Role, ServicePrincipal, ManagedPolicy } from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

export interface Ec2InstanceProps {
  instanceType: InstanceType;
  userData: UserData;
  stackName: string;
  /** Additional TCP ports to open in the security group */
  extraPorts?: number[];
  /** CPU Architecture for the AMI */
  architecture?: CpuArchitecture;
  /** Optional existing VPC */
  vpc?: IVpc;
}

export class Ec2Instance extends Construct {
  public readonly instance: Instance;
  public readonly elasticIp: CfnEIP;
  public readonly securityGroup: SecurityGroup;

  constructor(scope: Construct, id: string, props: Ec2InstanceProps) {
    super(scope, id);

    // ----------------------------------------------------------------
    // VPC — single public subnet, no NAT gateway needed
    // ----------------------------------------------------------------
    const vpc = props.vpc || new Vpc(this, "Vpc", {
      maxAzs: 1,
      subnetConfiguration: [
        {
          name: "public",
          subnetType: SubnetType.PUBLIC,
          cidrMask: 24,
        },
      ],
      natGateways: 0,
    });

    // ----------------------------------------------------------------
    // Security group
    // ----------------------------------------------------------------
    this.securityGroup = new SecurityGroup(this, "SecurityGroup", {
      vpc,
      description: `${props.stackName} - service`,
      allowAllOutbound: true,
    });

    // SSH
    this.securityGroup.addIngressRule(
      Peer.anyIpv4(),
      Port.tcp(22),
      "SSH access"
    );

    // HTTP — Traefik redirect to HTTPS, or direct service access if no domain
    this.securityGroup.addIngressRule(
      Peer.anyIpv4(),
      Port.tcp(80),
      "HTTP"
    );

    // HTTPS — Traefik TLS termination
    this.securityGroup.addIngressRule(
      Peer.anyIpv4(),
      Port.tcp(443),
      "HTTPS"
    );

    // Additional service ports
    if (props.extraPorts) {
      for (const port of props.extraPorts) {
        if ([22, 80, 443].includes(port)) continue;
        
        this.securityGroup.addIngressRule(
          Peer.anyIpv4(),
          Port.tcp(port),
          `Service port ${port}`
        );
      }
    }

    // ----------------------------------------------------------------
    // IAM role
    // ----------------------------------------------------------------
    const role = new Role(this, "InstanceRole", {
      assumedBy: new ServicePrincipal("ec2.amazonaws.com"),
      description: `${props.stackName} EC2 instance role`,
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName(
          "AmazonSSMManagedInstanceCore"
        ),
        ManagedPolicy.fromAwsManagedPolicyName(
          "CloudWatchAgentServerPolicy"
        ),
        ManagedPolicy.fromAwsManagedPolicyName(
          "AmazonEC2ContainerRegistryReadOnly"
        ),
      ],
    });

    // ----------------------------------------------------------------
    // AMI — latest Ubuntu 22.04 LTS
    // ----------------------------------------------------------------
    const arch = props.architecture === CpuArchitecture.ARM64 ? "arm64" : "amd64";
    const ami = MachineImage.fromSsmParameter(
      `/aws/service/canonical/ubuntu/server/22.04/stable/current/${arch}/hvm/ebs-gp2/ami-id`,
      { os: OperatingSystemType.LINUX }
    );

    // ----------------------------------------------------------------
    // EC2 Instance
    // ----------------------------------------------------------------
    this.instance = new Instance(this, "Instance", {
      vpc,
      instanceType: props.instanceType,
      machineImage: ami,
      securityGroup: this.securityGroup,
      role,
      userData: props.userData,
      userDataCausesReplacement: true,
      vpcSubnets: { subnetType: SubnetType.PUBLIC },
      blockDevices: [
        {
          deviceName: "/dev/sda1",
          volume: BlockDeviceVolume.ebs(30, {
            volumeType: EbsDeviceVolumeType.GP3,
            encrypted: true,
            deleteOnTermination: true,
          }),
        },
      ],
    });

    // ----------------------------------------------------------------
    // Elastic IP — stable address across stop/start
    // ----------------------------------------------------------------
    this.elasticIp = new CfnEIP(this, "ElasticIp", {
      instanceId: this.instance.instanceId,
      tags: [{ key: "Name", value: `${props.stackName}-eip` }],
    });

    // Tag the instance
    Tags.of(this.instance).add("Name", props.stackName);
    Tags.of(this.instance).add("ManagedBy", "cdk-templates");
  }
}
