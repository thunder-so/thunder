import { Runtime, Architecture } from 'aws-cdk-lib/aws-lambda';
import { AppProps } from './AppProps';
import { PipelineWithRuntimeProps } from './PipelineProps';
import { CloudFrontProps } from './CloudFrontProps';

export interface NuxtServerProps {
  /**
   * Optional. The Lambda runtime version. Defaults to Runtime.NODEJS_20_X.
   */
  readonly runtime?: Runtime;
  /**
   * Optional. The Lambda CPU architecture. Defaults to Architecture.ARM_64.
   */
  readonly architecture?: Architecture;
  /**
   * Optional. The path to the code directory. Defaults to '.output/server'.
   */
  readonly codeDir?: string;
  /**
   * Optional. The Lambda function handler path. Defaults to 'index.handler'.
   */
  readonly handler?: string;
  /**
   * Optional. Server-side rendered paths.
   */
  readonly paths?: string[];
  /**
   * Optional. Files to include in the Lambda package.
   */
  readonly include?: string[];
  /**
   * Optional. Files to exclude from the Lambda package.
   */
  readonly exclude?: string[];
  /**
   * Optional. Lambda memory allocation in MB. Defaults to 1792.
   */
  readonly memorySize?: number;
  /**
   * Optional. Lambda timeout in seconds. Defaults to 10.
   */
  readonly timeout?: number;
  /**
   * Optional. Enable AWS X-Ray tracing. Defaults to Tracing.DISABLED.
   */
  readonly tracing?: boolean;
  /**
   * Optional. Maximum concurrent executions.
   */
  readonly reservedConcurrency?: number;
  /**
   * Optional. Pre-warmed concurrent executions.
   */
  readonly provisionedConcurrency?: number;
  /**
   * Optional. Environment variables for the Lambda function.
   */
  readonly variables?: Array<{ [key: string]: string; }>;
  /**
   * Optional. Create a secret with AWS Secrets Manager and pass them to the Lambda function as environment variables.
   */
  readonly secrets?: { key: string; resource: string }[];
  /**
   * Optional. Path to Dockerfile for custom container builds.
   */
  readonly dockerFile?: string;
  /**
   * Optional. Build arguments for Docker builds.
   */
  readonly dockerBuildArgs?: string[];
  /**
   * Optional. Periodically invoke the function to prevent cold starts. Defaults to false.
   */
  readonly keepWarm?: boolean;
}

export interface NuxtDomainProps {
  /**
   * Optional. The domain (without the protocol) at which the app shall be publicly available.
   */
  readonly domain?: string;
  /**
   * Optional. The ARN of the certificate to use on CloudFront for the app to make it accessible via HTTPS.
   */
  readonly globalCertificateArn?: string;
  /**
   * Optional. The ARN of the certificate to use for API Gateway for the app to make it accessible via HTTPS.
   */
  readonly regionalCertificateArn?: string;
  /**
   * Optional. The ID of the hosted zone to create a DNS record for the specified domain.
   */
  readonly hostedZoneId?: string;
}

export interface NuxtProps extends 
  AppProps, 
  PipelineWithRuntimeProps, 
  NuxtDomainProps,
  CloudFrontProps {
    readonly serverProps?: NuxtServerProps;
}
