import { AppProps } from './AppProps'
import { PipelineWithBuildSystemProps  } from './PipelineProps'
import { CpuArchitecture } from 'aws-cdk-lib/aws-ecs'
import { VpcLinkProps } from './VpcProps'

/**
 * ECS Fargate container configuration properties
 */
interface FargateServiceProps {
  /**
   * CPU architecture for the Fargate task (ARM64 or X86_64)
   */
  readonly architecture?: CpuArchitecture;
  /**
   * Number of task instances to run
   */
  readonly desiredCount?: number;
  /**
   * CPU units allocated to the task (256, 512, 1024, 2048, 4096)
   */
  readonly cpu?: number;
  /**
   * Memory allocated to the task in MB
   */
  readonly memorySize?: number;
  /**
   * Container port to expose
   */
  readonly port?: number;
  /**
   * Environment variables for the container
   */
  readonly variables?: Array<{ [key: string]: string; }>;
  /**
   * Secrets from Secrets Manager to inject as environment variables
   */
  readonly secrets?: { key: string; resource: string; }[];
  /**
   * Path to Dockerfile relative to project root
   */
  readonly dockerFile?: string;
  /**
   * Build arguments to pass to Docker build
   */
  readonly dockerBuildArgs?: string[];
}

/**
 * Domain and certificate properties
 */
interface FargateDomainProps {
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

export interface FargateProps extends 
  PipelineWithBuildSystemProps,
  FargateDomainProps,
  AppProps,
  VpcLinkProps {
    readonly serviceProps?: FargateServiceProps;
}
