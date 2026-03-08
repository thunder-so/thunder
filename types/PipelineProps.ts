export interface SourceProps {
    /**
     * Optional. The GitHub repository owner.
     */
    readonly owner?: string;
    /**
     * Optional. The GitHub repository name.
     */
    readonly repo?: string;
    /**
     * Optional. The branch or ref to use. Defaults to 'main'.
     */
    readonly branchOrRef?: string;
}

export interface PipelineWithRuntimeProps {
  /**
   * Enable pipeline mode with Github Access Token stored as a secret in SSM Secret Manager.
   * Provide the ARN to your Secrets Manager secret.
   */
  readonly accessTokenSecretArn?: string;

  /**
   * Configure your Github repository
   */
  readonly sourceProps?: SourceProps;

  /**
   * Optional. The properties for CodeBuild build process.
   */
  readonly buildProps?: {
    /**
     * Optional. The runtime name. Defaults to 'nodejs'.
     */
    readonly runtime?: string;
    /**
     * Optional. The runtime version. Defaults to '24'.
     */
    readonly runtime_version?: string|number;
    /**
     * Optional. The install command. Defaults to 'npm install'.
     */
    readonly installcmd?: string;
    /**
     * Optional. The build command. Defaults to 'npm run build'.
     */
    readonly buildcmd?: string;
    /**
     * Optional. The output directory. Defaults to '.output'.
     */
    readonly outputDir?: string;
    /**
     * Optional. Files to include in the build context.
     */
    readonly include?: string[];
    /**
     * Optional. Files to exclude from the build context.
     */
    readonly exclude?: string[];
    /**
     * Optional. Environment variables for the build.
     */
    readonly environment?: Array<{ [key: string]: string; }>;
    /**
     * Optional. Secrets from AWS Secrets Manager for the build.
     */
    readonly secrets?: { key: string; resource: string; }[];
    
    /**
     * Optional. Path to a custom Dockerfile for the build environment.
     * Example: 'runtime/Dockerfile'
     */
    readonly customRuntime?: string;
  };

  /**
   * Optional. If you have a custom buildspec.yml file for your app, provide the relative path to the file.
   */
  readonly buildSpecFilePath?: string;

  /**
   * Optional. The ARN of the Event Bus.
   * - The pipeline events are broadcast to an event bus. Defaults to null.
   */
  readonly eventTarget?: string;
}

export interface PipelineWithBuildSystemProps {
  /**
   * Enable pipeline mode with Github Access Token stored as a secret in SSM Secret Manager.
   * Provide the ARN to your Secrets Manager secret.
   */
  readonly accessTokenSecretArn?: string;

  /**
   * Configure your Github repository
   */
  readonly sourceProps?: SourceProps;

  /**
   * Optional. The properties for CodeBuild build process.
   */
  readonly buildProps?: {
    /**
     * Optional. Build system to use. Supports 'Nixpacks' or 'Custom Dockerfile'.
     */
    readonly buildSystem?: 'Nixpacks' | 'Custom Dockerfile';
    /**
     * Optional. Runtime name (e.g., nodejs, python). Defaults to 'nodejs'.
     */
    readonly runtime?: string;
    /**
     * Optional. Runtime version (e.g., 18, 22). Defaults to '24'.
     */
    readonly runtime_version?: string | number;
    /**
     * Optional. Custom install command for Nixpacks. Defaults to 'npm install'.
     */
    readonly installcmd?: string;
    /**
     * Optional. Custom build command for Nixpacks. Defaults to 'npm run build'.
     */
    readonly buildcmd?: string;
    /**
     * Optional. Custom start command for Nixpacks.
     */
    readonly startcmd?: string;
    /**
     * Optional. The directory where the app's build output is located.
     */
    readonly outputDir?: string;
    /**
     * Optional. Files to include in build context.
     */
    readonly include?: string[];
    /**
     * Optional. Files to exclude from build context.
     */
    readonly exclude?: string[];
    /**
     * Optional. Environment variables for build.
     */
    readonly environment?: Array<{ [key: string]: string; }>;
    /**
     * Optional. Secrets for build (from Secrets Manager).
     */
    readonly secrets?: { key: string; resource: string; }[];
  };

  /**
   * Optional. If you have a custom buildspec.yml file for your app, provide the relative path to the file.
   */
  readonly buildSpecFilePath?: string;

  /**
   * Optional. The ARN of the Event Bus.
   * - The pipeline events are broadcast to an event bus. Defaults to null.
   */
  readonly eventTarget?: string;
}