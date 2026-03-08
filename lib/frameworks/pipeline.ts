import { Construct } from "constructs";
import { CfnOutput, SecretValue } from "aws-cdk-lib";
import { Pipeline, Artifact, PipelineType } from "aws-cdk-lib/aws-codepipeline";
import { GitHubSourceAction, GitHubTrigger, CodeBuildAction } from "aws-cdk-lib/aws-codepipeline-actions";
import { PipelineProject, LinuxArmBuildImage, ComputeType, BuildSpec } from "aws-cdk-lib/aws-codebuild";
import { NuxtProps } from "../../types/NuxtProps";
import { getResourceIdPrefix } from "../utils";

export class FrameworkPipeline extends Construct {
  private resourceIdPrefix: string;
  public codePipeline: Pipeline;

  constructor(scope: Construct, id: string, props: NuxtProps) {
    super(scope, id);

    this.resourceIdPrefix = getResourceIdPrefix(props.application, props.service, props.environment);

    const sourceOutput = new Artifact();
    const buildOutput = new Artifact();

    const project = new PipelineProject(this, "BuildProject", {
      projectName: `${this.resourceIdPrefix}-build`,
      buildSpec: BuildSpec.fromObject({
        version: "0.2",
        phases: {
          install: {
            commands: ["npm install"],
          },
          build: {
            commands: ["npm run build"],
          },
        },
        artifacts: {
          files: ["**/*"],
          "base-directory": props.buildProps?.outputDir || ".output",
        },
      }),
      environment: {
        buildImage: LinuxArmBuildImage.AMAZON_LINUX_2023_STANDARD_3_0,
        computeType: ComputeType.MEDIUM,
      },
    });

    this.codePipeline = new Pipeline(this, "Pipeline", {
      pipelineName: `${this.resourceIdPrefix}-pipeline`,
      pipelineType: PipelineType.V2,
      stages: [
        {
          stageName: "Source",
          actions: [
            new GitHubSourceAction({
              actionName: "GitHub_Source",
              owner: props.sourceProps?.owner!,
              repo: props.sourceProps?.repo!,
              branch: props.sourceProps?.branchOrRef || "main",
              oauthToken: SecretValue.secretsManager(props.accessTokenSecretArn!),
              output: sourceOutput,
              trigger: GitHubTrigger.WEBHOOK,
            }),
          ],
        },
        {
          stageName: "Build",
          actions: [
            new CodeBuildAction({
              actionName: "Build",
              project,
              input: sourceOutput,
              outputs: [buildOutput],
            }),
          ],
        },
        // TODO: Add Deploy stage based on framework needs (S3/Lambda update)
      ],
    });

    new CfnOutput(this, "CodePipelineName", {
      value: this.codePipeline.pipelineName,
      description: "The name of the deployment pipeline",
      exportName: `${this.resourceIdPrefix}-CodePipelineName`,
    });
  }
}
