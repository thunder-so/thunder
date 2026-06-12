import { Runtime, Architecture } from "aws-cdk-lib/aws-lambda";
import { AppProps } from "./AppProps";
import { CloudFrontProps } from "./CloudFrontProps";
import { PipelineWithRuntimeProps } from "./PipelineProps";

export interface ServerlessProps
  extends AppProps, PipelineWithRuntimeProps, CloudFrontProps {
  // Domain & DNS
  domain?: string;
  hostedZoneId?: string;
  globalCertificateArn?: string;
  regionalCertificateArn?: string;

  // Framework-specific overrides
  serverProps?: ServerlessServerProps;
  clientProps?: ServerlessClientProps;
}

export interface ServerlessServerProps {
  codeDir?: string;
  handler?: string;
  runtime?: Runtime;
  architecture?: Architecture;
  memorySize?: number;
  timeout?: number;
  reservedConcurrency?: number;
  provisionedConcurrency?: number;
  dockerFile?: string;
  dockerBuildArgs?: Record<string, string | number>;
  include?: string[];
  exclude?: string[];
  variables?: Array<Record<string, string>>;
  secrets?: Array<{ key: string; resource: string }>;
  paths?: string[];
  keepWarm?: boolean;
  tracing?: boolean;
  /**
   * Enable Lambda Insights for system-level metrics (memory, CPU, cold starts).
   * Attaches the CloudWatch Lambda Insights extension layer.
   */
  insights?: boolean;
  streaming?: boolean;
}

export interface ServerlessClientProps {
  outputDir?: string;
  include?: string[];
  exclude?: string[];
  useFallbackEdge?: boolean;
}

export interface FrameworkConfig {
  name: string;
  defaultServerDir: string;
  defaultClientDir: string;
  defaultHandler: string;
  defaultServerPaths: string[];
  requiresFallbackEdge: boolean;
  nitroPreset?: string;
  buildCommand?: string;
  adapterRequired?: boolean;
  defaultIncludes?: string[];
}

export type { Runtime, Architecture } from "aws-cdk-lib/aws-lambda";
