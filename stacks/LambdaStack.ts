import { Stack, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Repository } from 'aws-cdk-lib/aws-ecr';
import { FunctionsConstruct } from '../lib/lambda/functions';
import { PipelineConstruct } from '../lib/lambda/pipeline';
import { DiscoveryConstruct } from '../lib/constructs/discovery';
import { LambdaProps } from '../types/LambdaProps';
import { getResourceIdPrefix } from '../lib/utils';

export class Lambda extends Stack {
  constructor(scope: Construct, id: string, props: LambdaProps) {
    super(scope, id, props);

    // Check mandatory properties
    if (!props?.env) {
      throw new Error('Must provide AWS account and region.');
    }
    if (!props.application || !props.environment || !props.service) {
      throw new Error('Mandatory stack properties missing.');
    }

    const resourceIdPrefix = getResourceIdPrefix(props.application, props.service, props.environment);

    // ECR repository for container images
    const ecr = new Repository(this, 'Repository', {
      repositoryName: `${resourceIdPrefix}-repository`,
      removalPolicy: RemovalPolicy.DESTROY,
      emptyOnDelete: true,
    });

    // Create Lambda construct
    const lambda = new FunctionsConstruct(this, 'Lambda', {
      ...props,
      repository: ecr,
    });

    // Pipeline (if GitHub access token provided)
    let pipeline: PipelineConstruct | undefined;
    if (props?.accessTokenSecretArn) {
      // Check for sourceProps
      if (!props.sourceProps?.owner || !props.sourceProps?.repo || !props.sourceProps?.branchOrRef) {
        throw new Error('Missing sourceProps: Github owner, repo and branch/ref required.');
      }

      pipeline = new PipelineConstruct(this, 'Pipeline', {
        ...props,
        repository: ecr,
        lambdaFunction: lambda.lambdaFunction,
      });
    }

    // Discovery (Metadata)
    // new DiscoveryConstruct(this, 'Discovery', {
    //   ...props,
    //   metadata: {
    //     type: 'Lambda',
    //     LambdaFunction: lambda.lambdaFunction.functionName,
    //     ApiGatewayUrl: lambda.apiGateway?.url || '',
    //     LambdaFunctionUrl: lambda.lambdaFunctionUrl?.url || '',
    //     Route53Domain: props.domain ? `https://${props.domain}` : undefined,
    //     CodePipelineName: pipeline?.codePipeline.pipelineName,
    //   }
    // });
  }
}
