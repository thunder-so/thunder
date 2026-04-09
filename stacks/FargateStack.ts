import { Stack, Aws } from "aws-cdk-lib";
import { Construct } from "constructs";
import { ServiceConstruct } from "../lib/fargate/service";
import { PipelineConstruct } from "../lib/fargate/pipeline";
import { MetadataConstruct } from "../lib/constructs/metadata";
import { FargateProps } from "../types";
import { getResourceIdPrefix } from "../lib/utils";

export class Fargate extends Stack {
  constructor(scope: Construct, id: string, props: FargateProps) {
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
    } as FargateProps;

    super(scope, id, props);

    if (!props.application || !props.environment || !props.service) {
      throw new Error("Mandatory stack properties missing.");
    }

    const resourceIdPrefix = getResourceIdPrefix(
      props.application,
      props.service,
      props.environment,
    );

    // Create Fargate construct
    const fargate = new ServiceConstruct(this, "Fargate", props);

    // Pipeline (if GitHub access token provided)
    let pipeline: PipelineConstruct | undefined;
    if (props?.accessTokenSecretArn) {
      // Check for sourceProps
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
        clusterName: fargate.clusterName,
        fargateService: fargate.fargateService,
        taskDefinition: fargate.taskDefinition,
      });
    }

    // Metadata
    new MetadataConstruct(this, "Metadata", {
      context: { metadata: props },
      stackType: "FARGATE",
      resources: {
        LoadBalancerDNS: fargate.loadBalancerDnsName,
        ServiceUrl: props.domain
          ? `https://${props.domain}`
          : `http://${fargate.loadBalancerDnsName}`,
        Route53Domain: props.domain ? `https://${props.domain}` : undefined,
        CodePipelineName: pipeline?.codePipeline.pipelineName,
      },
    });
  }
}
