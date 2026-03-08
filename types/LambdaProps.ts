import { AppProps } from './AppProps'
import { PipelineWithRuntimeProps  } from './PipelineProps'
import { Runtime, Architecture } from 'aws-cdk-lib/aws-lambda'
import { VpcLinkProps } from './VpcProps'

/**
 * Lambda function configuration properties
 */
interface LambdaFunctionProps {
  /**
   * Enable Lambda URL
   */
  readonly url?: boolean;
  /**
   * Lambda runtime (e.g., nodejs, python)
   */
  readonly runtime?: Runtime;
  /**
   * Lambda architecture (e.g., x86_64, arm64)
   */
  readonly architecture?: Architecture;
  /**
   * Directory containing Lambda code
   */
  readonly codeDir?: string;
  /**
   * Lambda handler (e.g., index.handler)
   */
  readonly handler?: string;
  /**
   * Files to include in deployment
   */
  readonly include?: string[];
  /**
   * Files to exclude from deployment
   */
  readonly exclude?: string[];
  /**
   * Memory size (MB)
   */
  readonly memorySize?: number;
  /**
   * Timeout (seconds)
   */
  readonly timeout?: number;
  /**
   * Enable X-Ray tracing
   */
  readonly tracing?: boolean;
  /**
   * Reserved concurrency
   */
  readonly reservedConcurrency?: number;
  /**
   * Provisioned concurrency
   */
  readonly provisionedConcurrency?: number;
  /**
   * Environment variables for Lambda
   */
  readonly variables?: Array<{ [key: string]: string }>;
  /**
   * Create a secret with AWS Secrets Manager and pass them to the Lambda function as environment variables.
   * The library will create permission for Lambda to access the secret value.
   * 
   *   secrets: [
   *     { key: 'PUBLIC_EXAMPLE', resource: 'your-secret-arn' }
   *   ]
   */
  readonly secrets?: { key: string; resource: string }[];
  /**
   * Path to Dockerfile for Lambda deployment
   */
  readonly dockerFile?: string;
  /**
   * Docker build arguments
   */
  readonly dockerBuildArgs?: string[];
  /**
   * Enable Bun runtime for Lambda. Provide a Bun Lambda Layer ARN.
   * See: https://github.com/oven-sh/bun/tree/main/packages/bun-lambda
   */
  readonly bunLayerArn?: string;
  /**
   * Keep the Lambda warm by invoking it every 5 minutes.
   */
  readonly keepWarm?: boolean;
}

/**
 * Domain and certificate properties
 */
interface LambdaDomainProps {
  /**
   * Optional. The domain (without the protocol) at which the app shall be publicly available.
   */
  readonly domain?: string;
  /**
   * Optional. The ARN of the regional certificate to use with API Gateway.
   */
  readonly regionalCertificateArn?: string;
  /**
   * Optional. The ID of the hosted zone to create a DNS record for the specified domain.
   */
  readonly hostedZoneId?: string;
}

export interface LambdaProps extends 
  PipelineWithRuntimeProps,
  LambdaDomainProps, 
  AppProps,
  VpcLinkProps {
    readonly functionProps?: LambdaFunctionProps;
}
