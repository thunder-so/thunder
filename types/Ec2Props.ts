import { AppProps } from './AppProps'
import { PipelineWithBuildSystemProps  } from './PipelineProps'
import { CpuArchitecture } from 'aws-cdk-lib/aws-ecs'
import { VpcLinkProps } from './VpcProps'

/**
 * Properties for the running service on EC2
 */
interface Ec2ServiceProps {
  /**
   * CPU Architecture for the Docker image.
   * @default CpuArchitecture.ARM64
   */
  readonly architecture?: CpuArchitecture;
  /**
   * Port the application container listens on.
   * @default 3000
   */
  readonly port?: number;
  /**
   * Runtime environment variables for the container.
   */
  readonly variables?: Array<{ [key: string]: string }>;
  /**
   * Path to the Dockerfile relative to rootDir.
   * @default 'Dockerfile'
   */
  readonly dockerFile?: string;
  /**
   * Docker build-time arguments.
   */
  readonly dockerBuildArgs?: string[];
  /**
   * EC2 instance type (e.g. 't3.micro').
   * @default 't3.micro'
   */
  readonly instanceType?: string;
  /**
   * SSH public keys to inject into the 'ubuntu' user.
   */
  readonly authorizedKeys?: string[];
}

/**
 * Domain and SSL properties
 */
interface Ec2DomainProps {
  /**
   * Domain name for the service (e.g. 'app.example.com').
   */
  readonly domain?: string;
  /**
   * Route53 Hosted Zone ID for automated DNS.
   */
  readonly hostedZoneId?: string;
  /**
   * Email for Let's Encrypt / ACME registration.
   * Required if 'domain' is set.
   */
  readonly acmeEmail?: string;
}

export interface Ec2Props extends 
  PipelineWithBuildSystemProps,
  Ec2DomainProps,
  AppProps,
  VpcLinkProps {
    readonly serviceProps?: Ec2ServiceProps;
}
