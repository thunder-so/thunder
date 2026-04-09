import { Stack, Duration, CfnOutput, Aws } from "aws-cdk-lib";
import { Construct } from "constructs";
import { ARecord, HostedZone, RecordTarget } from "aws-cdk-lib/aws-route53";
import { ComputeConstruct } from "../lib/ec2/compute";
import { PipelineConstruct } from "../lib/ec2/pipeline";
import { MetadataConstruct } from "../lib/constructs/metadata";
import { Ec2Props } from "../types";
import { getResourceIdPrefix } from "../lib/utils";

export class Ec2 extends Stack {
  constructor(scope: Construct, id: string, props: Ec2Props) {
    // Populate default env if not provided
    props = {
      ...props,
      env: {
        account:
          props.env?.account ||
          process.env.CDK_DEFAULT_ACCOUNT ||
          Aws.ACCOUNT_ID,
        region:
          props.env?.region || process.env.CDK_DEFAULT_REGION || Aws.REGION,
      },
    } as Ec2Props;

    super(scope, id, props);

    if (!props.application || !props.environment || !props.service) {
      throw new Error("Mandatory stack properties missing.");
    }

    if (props.domain && !props.acmeEmail) {
      throw new Error("acmeEmail is required when domain is set.");
    }

    if (
      !props.serviceProps?.authorizedKeys ||
      props.serviceProps.authorizedKeys.length === 0
    ) {
      throw new Error("At least one authorizedKey must be provided");
    }

    const resourceIdPrefix = getResourceIdPrefix(
      props.application,
      props.service,
      props.environment,
    );

    // 1. EC2 Compute
    const ec2 = new ComputeConstruct(this, "EC2", props);

    // 2. Route53 DNS (if domain + hostedZoneId provided)
    if (props.domain && props.hostedZoneId) {
      const zone = HostedZone.fromHostedZoneId(
        this,
        "HostedZone",
        props.hostedZoneId,
      );
      new ARecord(this, "ARecord", {
        zone,
        recordName: props.domain,
        target: RecordTarget.fromIpAddresses(ec2.instance.elasticIp.ref),
        ttl: Duration.minutes(5),
      });
    }

    // 3. Pipeline (if GitHub access token provided)
    let pipeline: PipelineConstruct | undefined;
    if (props?.accessTokenSecretArn) {
      if (
        !props.sourceProps?.owner ||
        !props.sourceProps?.repo ||
        !props.sourceProps?.branchOrRef
      ) {
        throw new Error(
          "Missing sourceProps: Github owner, repo and branch/ref required.",
        );
      }

      pipeline = new PipelineConstruct(this, "Pipeline", {
        ...props,
        instanceId: ec2.instance.instance.instanceId,
      });
    }

    // 4. Outputs
    const mainPort = props.serviceProps?.port ?? 3000;
    const portSuffix = mainPort === 80 ? "" : `:${mainPort}`;
    const serviceUrl = props.domain
      ? `https://${props.domain}`
      : `http://${ec2.instance.elasticIp.ref}${portSuffix}`;

    new CfnOutput(this, "InstanceId", {
      value: ec2.instance.instance.instanceId,
      description: "EC2 Instance ID",
      exportName: `${resourceIdPrefix}-InstanceId`,
    });

    new CfnOutput(this, "ElasticIp", {
      value: ec2.instance.elasticIp.ref,
      description: "Elastic IP address of the instance",
      exportName: `${resourceIdPrefix}-ElasticIp`,
    });

    new CfnOutput(this, "PublicDns", {
      value: ec2.instance.instance.instancePublicDnsName,
      description: "Public IPv4 DNS name of the instance",
      exportName: `${resourceIdPrefix}-PublicDns`,
    });

    new CfnOutput(this, "ServiceUrl", {
      value: serviceUrl,
      description: "Service URL",
      exportName: `${resourceIdPrefix}-ServiceUrl`,
    });

    // 5. Metadata
    new MetadataConstruct(this, "Metadata", {
      context: { metadata: props },
      stackType: "EC2",
      resources: {
        InstanceId: ec2.instance.instance.instanceId,
        ElasticIp: ec2.instance.elasticIp.ref,
        ServiceUrl: serviceUrl,
        Route53Domain: props.domain ? `https://${props.domain}` : undefined,
        CodePipelineName: pipeline?.codePipeline.pipelineName,
      },
    });
  }
}
