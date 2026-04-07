import { Stack, RemovalPolicy, Aws } from "aws-cdk-lib";
import { Construct } from "constructs";
import { Repository } from "aws-cdk-lib/aws-ecr";
import { FunctionsConstruct } from "../lib/lambda/functions";
import { PipelineConstruct } from "../lib/lambda/pipeline";
import { MetadataConstruct } from "../lib/constructs/metadata";
import { LambdaProps } from "../types/LambdaProps";
import { getResourceIdPrefix } from "../lib/utils";

export class Lambda extends Stack {
  constructor(scope: Construct, id: string, props: LambdaProps) {
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
    } as LambdaProps;

    super(scope, id, props);

    if (!props.application || !props.environment || !props.service) {
      throw new Error("Mandatory stack properties missing.");
    }

    const resourceIdPrefix = getResourceIdPrefix(
      props.application,
      props.service,
      props.environment,
    );

    // ECR repository for container images
    const ecr = new Repository(this, "Repository", {
      repositoryName: `${resourceIdPrefix}-repository`,
      removalPolicy: RemovalPolicy.DESTROY,
      emptyOnDelete: true,
    });

    // Create Lambda construct
    const lambda = new FunctionsConstruct(this, "Lambda", {
      ...props,
      repository: ecr,
    });

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
        repository: ecr,
        lambdaFunction: lambda.lambdaFunction,
      });
    }

    // Metadata
    new MetadataConstruct(this, "Metadata", {
      ...props,
      stackType: "LAMBDA",
      stackProps: {
        functionProps: props.functionProps,
        domain: props.domain,
        regionalCertificateArn: props.regionalCertificateArn,
        hostedZoneId: props.hostedZoneId,
      },
      resources: {
        LambdaFunction: lambda.lambdaFunction.functionName,
        LambdaFunctionArn: lambda.lambdaFunction.functionArn,
        ApiGatewayUrl: lambda.apiGateway?.url,
        LambdaFunctionUrl: lambda.lambdaFunctionUrl?.url,
        Route53Domain: props.domain ? `https://${props.domain}` : undefined,
        CodePipelineName: pipeline?.codePipeline.pipelineName,
      },
    });
  }
}
