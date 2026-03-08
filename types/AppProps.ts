import { type StackProps } from "aws-cdk-lib"

/**
 * Application identity and environment properties
 */
export interface AppProps extends StackProps {
  /**
   * Debug
   */
  readonly debug?: boolean;

  /**
   * The AWS environment (account/region) where this stack will be deployed.
   */
  readonly env: {
    // The ID of your AWS account on which to deploy the stack.
    readonly account: string;

    // The AWS region where to deploy the app.
    readonly region: string;
  };

  /**
   * A string identifier for the project the app is part of.
   */
  readonly application: string;

  /**
   * A string identifier for the project's service the app is created for.
   */
  readonly service: string;

  /**
   * A string to identify the environment of the app.
   */
  readonly environment: string;

  /**
   * The path to the root directory of your application.
   * Defaults to '.'
   */
  readonly rootDir?: string;

  /**
   * Optional: directory containing the context for deployment
   * Used for deployments with cdk.context.json
   */
  readonly contextDirectory?: string;
}