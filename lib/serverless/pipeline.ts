import { Construct } from "constructs";
import { Duration, CfnOutput, SecretValue, RemovalPolicy } from "aws-cdk-lib";
import { Pipeline, Artifact, PipelineType } from "aws-cdk-lib/aws-codepipeline";
import {
  GitHubSourceAction,
  GitHubTrigger,
  CodeBuildAction,
} from "aws-cdk-lib/aws-codepipeline-actions";
import {
  PipelineProject,
  LinuxArmBuildImage,
  LinuxBuildImage,
  ComputeType,
  BuildSpec,
  BuildEnvironmentVariableType,
} from "aws-cdk-lib/aws-codebuild";
import {
  Bucket,
  BucketEncryption,
  BlockPublicAccess,
  ObjectOwnership,
} from "aws-cdk-lib/aws-s3";
import { PolicyStatement, Effect, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import {
  Function as LambdaFunction,
  Architecture,
} from "aws-cdk-lib/aws-lambda";
import { Repository } from "aws-cdk-lib/aws-ecr";
import { Distribution } from "aws-cdk-lib/aws-cloudfront";
import { ServerlessProps } from "../../types";
import { getResourceIdPrefix } from "../utils";
import { EventsConstruct } from "../constructs/events";

export interface ServerlessPipelineProps extends ServerlessProps {
  lambdaFunction: LambdaFunction;
  staticAssetsBucket: Bucket;
  cdn: Distribution;
  clientOutputDir: string;
  serverCodeDir: string;
}

export class ServerlessPipeline extends Construct {
  public readonly codePipeline: Pipeline;

  constructor(scope: Construct, id: string, props: ServerlessPipelineProps) {
    super(scope, id);

    const prefix = getResourceIdPrefix(
      props.application,
      props.service,
      props.environment,
    );
    const isContainer = !!props.serverProps?.dockerFile;

    // Create ECR repo here when pipeline is in container mode
    const ecrRepository = isContainer
      ? new Repository(this, "EcrRepository", {
          repositoryName: `${prefix}-ecr`,
          removalPolicy: RemovalPolicy.RETAIN,
        })
      : undefined;

    const artifactBucket = new Bucket(this, "ArtifactsBucket", {
      bucketName: `${prefix}-pipeline-artifacts`,
      encryption: BucketEncryption.S3_MANAGED,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      objectOwnership: ObjectOwnership.OBJECT_WRITER,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const sourceOutput = new Artifact("SourceOutput");
    const buildOutput = new Artifact("BuildOutput");

    const sourceAction = new GitHubSourceAction({
      actionName: "GitHub_Source",
      owner: props.sourceProps!.owner!,
      repo: props.sourceProps!.repo!,
      branch: props.sourceProps?.branchOrRef || "main",
      oauthToken: SecretValue.secretsManager(props.accessTokenSecretArn!),
      output: sourceOutput,
      trigger: GitHubTrigger.WEBHOOK,
    });

    const bp = props.buildProps;
    const rootDir = props.rootDir && props.rootDir !== "." ? props.rootDir : "";
    const arch = props.serverProps?.architecture;
    const buildImage =
      arch === Architecture.ARM_64
        ? LinuxArmBuildImage.AMAZON_LINUX_2023_STANDARD_3_0
        : LinuxBuildImage.STANDARD_7_0;

    const envVars = {
      ...(bp?.environment
        ? Object.entries(Object.assign({}, ...bp.environment)).reduce(
            (acc, [k, v]) => ({
              ...acc,
              [k]: { value: v, type: BuildEnvironmentVariableType.PLAINTEXT },
            }),
            {},
          )
        : {}),
      ...(bp?.secrets
        ? Object.fromEntries(
            bp.secrets.map(({ key, resource }) => [
              key,
              {
                value: resource,
                type: BuildEnvironmentVariableType.PARAMETER_STORE,
              },
            ]),
          )
        : {}),
    };

    let buildProject: PipelineProject;
    let deployProject: PipelineProject;

    if (isContainer) {
      // Container build: docker build → push ECR
      const repo = ecrRepository!;

      repo.addToResourcePolicy(
        new PolicyStatement({
          effect: Effect.ALLOW,
          principals: [new ServicePrincipal("lambda.amazonaws.com")],
          actions: ["ecr:BatchGetImage", "ecr:GetDownloadUrlForLayer"],
        }),
      );
      repo.grantPull(props.lambdaFunction);

      buildProject = new PipelineProject(this, "DockerBuildProject", {
        projectName: `${prefix}-docker-build`,
        buildSpec: BuildSpec.fromObject({
          version: "0.2",
          phases: {
            pre_build: {
              commands: [
                "export IMAGE_TAG=$CODEBUILD_RESOLVED_SOURCE_VERSION",
                "aws ecr get-login-password --region $AWS_DEFAULT_REGION | docker login --username AWS --password-stdin $ECR_REPO",
              ],
            },
            build: {
              commands: [
                ...(rootDir ? [`cd ${rootDir}`] : []),
                bp?.installcmd || "npm install",
                bp?.buildcmd || "npm run build",
                `docker build -t $ECR_REPO:$IMAGE_TAG -f ${props.serverProps!.dockerFile} ${props.serverCodeDir}`,
                "docker push $ECR_REPO:$IMAGE_TAG",
                "echo $ECR_REPO:$IMAGE_TAG > imageUri.txt",
              ],
            },
          },
          artifacts: {
            files: ["imageUri.txt", `${props.clientOutputDir}/**/*`],
          },
        }),
        environment: {
          buildImage,
          computeType: ComputeType.MEDIUM,
          privileged: true,
        },
        environmentVariables: {
          ECR_REPO: { value: repo.repositoryUri },
          ...envVars,
        },
        timeout: Duration.minutes(20),
      });

      repo.grantPullPush(buildProject);

      deployProject = new PipelineProject(this, "DockerDeployProject", {
        projectName: `${prefix}-docker-deploy`,
        buildSpec: BuildSpec.fromObject({
          version: "0.2",
          phases: {
            build: {
              commands: [
                "IMAGE_URI=$(cat imageUri.txt)",
                "aws lambda wait function-updated --function-name $LAMBDA_FUNCTION_NAME || true",
                "aws lambda update-function-code --function-name $LAMBDA_FUNCTION_NAME --image-uri $IMAGE_URI",
                "aws lambda wait function-updated --function-name $LAMBDA_FUNCTION_NAME",
                `aws s3 sync ${props.clientOutputDir}/ s3://$S3_BUCKET/ --delete`,
                'aws cloudfront create-invalidation --distribution-id $CF_DISTRIBUTION_ID --paths "/*"',
              ],
            },
          },
        }),
        environment: { buildImage, computeType: ComputeType.SMALL },
        environmentVariables: {
          LAMBDA_FUNCTION_NAME: { value: props.lambdaFunction.functionName },
          S3_BUCKET: { value: props.staticAssetsBucket.bucketName },
          CF_DISTRIBUTION_ID: { value: props.cdn.distributionId },
        },
        timeout: Duration.minutes(10),
      });
    } else {
      // ── Zip build: install → build → zip server bundle ────────────────────
      buildProject = new PipelineProject(this, "ZipBuildProject", {
        projectName: `${prefix}-zip-build`,
        buildSpec: BuildSpec.fromObject({
          version: "0.2",
          phases: {
            install: {
              "runtime-versions": {
                [bp?.runtime || "nodejs"]: bp?.runtime_version || 22,
              },
              commands: [
                ...(rootDir ? [`cd ${rootDir}`] : []),
                bp?.installcmd || "npm install",
              ],
            },
            build: { commands: [bp?.buildcmd || "npm run build"] },
            post_build: {
              commands: [
                `cd ${props.serverCodeDir}`,
                "zip -r $CODEBUILD_SRC_DIR/function.zip .",
                "cd $CODEBUILD_SRC_DIR",
              ],
            },
          },
          artifacts: {
            files: ["function.zip", `${props.clientOutputDir}/**/*`],
          },
        }),
        environment: { buildImage, computeType: ComputeType.MEDIUM },
        environmentVariables: envVars,
        timeout: Duration.minutes(15),
      });

      deployProject = new PipelineProject(this, "ZipDeployProject", {
        projectName: `${prefix}-zip-deploy`,
        buildSpec: BuildSpec.fromObject({
          version: "0.2",
          phases: {
            build: {
              commands: [
                "aws lambda update-function-code --function-name $LAMBDA_FUNCTION_NAME --zip-file fileb://function.zip",
                "aws lambda wait function-updated --function-name $LAMBDA_FUNCTION_NAME",
                `aws s3 sync ${props.clientOutputDir}/ s3://$S3_BUCKET/ --delete`,
                'aws cloudfront create-invalidation --distribution-id $CF_DISTRIBUTION_ID --paths "/*"',
              ],
            },
          },
        }),
        environment: { buildImage, computeType: ComputeType.SMALL },
        environmentVariables: {
          LAMBDA_FUNCTION_NAME: { value: props.lambdaFunction.functionName },
          S3_BUCKET: { value: props.staticAssetsBucket.bucketName },
          CF_DISTRIBUTION_ID: { value: props.cdn.distributionId },
        },
        timeout: Duration.minutes(10),
      });
    }

    // Grant deploy permissions
    deployProject.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          "lambda:UpdateFunctionCode",
          "lambda:GetFunction",
          "lambda:GetFunctionConfiguration",
        ],
        resources: [props.lambdaFunction.functionArn],
      }),
    );
    props.staticAssetsBucket.grantReadWrite(deployProject);
    deployProject.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["cloudfront:CreateInvalidation"],
        resources: [
          `arn:aws:cloudfront::*:distribution/${props.cdn.distributionId}`,
        ],
      }),
    );

    this.codePipeline = new Pipeline(this, "Pipeline", {
      pipelineName: `${prefix}-pipeline`,
      pipelineType: PipelineType.V2,
      artifactBucket,
      stages: [
        {
          stageName: "Source",
          actions: [sourceAction],
        },
        {
          stageName: "Build",
          actions: [
            new CodeBuildAction({
              actionName: "Build",
              project: buildProject,
              input: sourceOutput,
              outputs: [buildOutput],
            }),
          ],
        },
        {
          stageName: "Deploy",
          actions: [
            new CodeBuildAction({
              actionName: "Deploy",
              project: deployProject,
              input: buildOutput,
            }),
          ],
        },
      ],
    });

    new EventsConstruct(this, "Events", {
      ...props,
      codePipeline: this.codePipeline,
    });

    new CfnOutput(this, "CodePipelineName", {
      value: this.codePipeline.pipelineName,
      exportName: `${prefix}-CodePipelineName`,
    });
  }
}
