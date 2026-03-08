import { CfnOutput, Duration } from "aws-cdk-lib";
import { Construct } from "constructs";
import { ARecord, HostedZone, RecordTarget } from "aws-cdk-lib/aws-route53";
import { InstanceType, InstanceClass, InstanceSize } from "aws-cdk-lib/aws-ec2";
import { CloudWatchAgent } from "./constructs/cloudwatch-agent";
import { Ec2Instance } from "./constructs/ec2-instance";
import { buildUserData } from "./constructs/user-data";
import { TemplateProps } from "../../types/TemplateProps";
import { getResourceIdPrefix, resolveVpc } from "../utils";

export class TemplateConstruct extends Construct {
  public readonly instance: Ec2Instance;
  public readonly cloudWatchAgent: CloudWatchAgent;

  constructor(scope: Construct, id: string, props: TemplateProps) {
    super(scope, id);

    const resourceIdPrefix = getResourceIdPrefix(props.application, props.service, props.environment);

    const vpc = resolveVpc(props.vpc);

    // 1. CloudWatch log groups + agent config
    this.cloudWatchAgent = new CloudWatchAgent(this, "CloudWatchAgent", {
      stackName: resourceIdPrefix,
      logRetentionDays: props.logRetentionDays,
    });

    // 2. User data script
    const userData = buildUserData({
      authorizedKeys: props.authorizedKeys,
      composeYaml: props.hydrateResult.composeYaml,
      envFileContent: props.hydrateResult.envFileContent,
      templateSlug: props.templateSlug,
      cloudWatchAgentConfig: this.cloudWatchAgent.agentConfigJson,
      domain: props.domain,
      acmeEmail: props.acmeEmail,
    });

    // 3. EC2 instance
    this.instance = new Ec2Instance(this, "Server", {
      instanceType: props.instanceType || InstanceType.of(InstanceClass.T3, InstanceSize.MICRO),
      userData,
      stackName: resourceIdPrefix,
      vpc: vpc,
      extraPorts: props.hydrateResult.exposedPorts,
    });

    // 4. Route53 DNS (if domain + hostedZoneId provided)
    if (props.domain && props.hostedZoneId) {
      const zone = HostedZone.fromHostedZoneId(this, "HostedZone", props.hostedZoneId);
      new ARecord(this, "ARecord", {
        zone,
        recordName: props.domain,
        target: RecordTarget.fromIpAddresses(this.instance.elasticIp.ref),
        ttl: Duration.minutes(5),
      });
    }

    // Outputs
    new CfnOutput(this, "InstanceId", {
      value: this.instance.instance.instanceId,
      description: "EC2 Instance ID",
    });

    new CfnOutput(this, "ElasticIp", {
      value: this.instance.elasticIp.ref,
      description: "Elastic IP address of the instance",
    });

    const mainPort = props.hydrateResult.exposedPorts[0] ?? 80;
    const portSuffix = mainPort === 80 ? "" : `:${mainPort}`;

    new CfnOutput(this, "ServiceUrl", {
      value: props.domain
        ? `https://${props.domain}`
        : `http://${this.instance.elasticIp.ref}${portSuffix}`,
      description: "Service URL",
    });
  }
}
