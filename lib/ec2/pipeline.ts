import path from 'path';
import { Construct } from 'constructs';
import { CfnOutput, Duration, RemovalPolicy, SecretValue } from 'aws-cdk-lib';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { PipelineProject, BuildSpec, LinuxArmBuildImage, LinuxBuildImage, ComputeType, BuildEnvironmentVariableType } from 'aws-cdk-lib/aws-codebuild';
import { CpuArchitecture } from 'aws-cdk-lib/aws-ecs';
import { Pipeline, Artifact, PipelineType } from 'aws-cdk-lib/aws-codepipeline';
import { GitHubSourceAction, GitHubTrigger, CodeBuildAction, CodeBuildActionType } from 'aws-cdk-lib/aws-codepipeline-actions';
import { Repository } from 'aws-cdk-lib/aws-ecr';
import { Ec2Props } from '../../types/Ec2Props';
import { getResourceIdPrefix } from '../utils';

export interface EC2PipelineProps extends Ec2Props {}

export class PipelineConstruct extends Construct {
  private resourceIdPrefix: string;
  public readonly ecrRepository: Repository;
  public readonly codeBuildProject: PipelineProject;
  public readonly codePipeline: Pipeline;
  public readonly deployProject: PipelineProject;
  private rootDir: string;

  constructor(scope: Construct, id: string, props: EC2PipelineProps) {
    super(scope, id);

    this.resourceIdPrefix = getResourceIdPrefix(props.application, props.service, props.environment);

    // Sanitize paths to ensure valid unix directory paths
    const sanitizePath = (filepath: string | undefined): string => {
      if (!filepath) return '';
      return filepath.replace(/[^a-zA-Z0-9._\-@#$%^&*+=~ /]|\/+/g, m => m.includes('/') ? '/' : '').replace(/^\/+|\/+$/g, '');
    };

    this.rootDir = path.join(props.contextDirectory || '', sanitizePath(props?.rootDir));

    this.ecrRepository = this.createEcrRepository(props);
    this.codeBuildProject = this.createBuildProject(props);
    this.deployProject = this.createDeployProject(props);
    this.codePipeline = this.createPipeline(props);

    new CfnOutput(this, 'CodePipelineName', {
      value: this.codePipeline.pipelineName,
      description: 'The name of the EC2 deployment pipeline',
      exportName: `${this.resourceIdPrefix}-CodePipelineName`,
    });
  }

  private createEcrRepository(props: EC2PipelineProps): Repository {
    const repo = new Repository(this, 'ServiceEcrRepo', {
      repositoryName: `${this.resourceIdPrefix}-repo`,
      removalPolicy: RemovalPolicy.DESTROY,
      emptyOnDelete: true,
    });

    return repo;
  }

  private createBuildProject(props: EC2PipelineProps): PipelineProject {
    let buildCommands: string[];
    let dockerfilePath = props.serviceProps?.dockerFile || 'Dockerfile';
    if (props.buildProps?.buildSystem === 'Nixpacks') {
      const installCmd = props.buildProps?.installcmd ? `--install-cmd "${props.buildProps.installcmd}"` : '';
      const buildCmd = props.buildProps?.buildcmd ? `--build-cmd "${props.buildProps.buildcmd}"` : '';
      const startCmd = props.buildProps?.startcmd ? `--start-cmd "${props.buildProps.startcmd}"` : '';
      
      buildCommands = [
        'curl -sSL https://nixpacks.com/install.sh | bash',
        'export DOCKER_BUILDKIT=1',
        'export DOCKER_CLI_EXPERIMENTAL=enabled',
        'mkdir -p .nixpacks',
        `nixpacks build --env NIXPACKS_NODE_VERSION=${props.buildProps?.runtime_version || '20'} --out . . ${installCmd} ${buildCmd} ${startCmd}`,
        'ls -a',
        'export IMAGE_TAG=$(date +%Y%m%d%H%M%S)',
        'aws --version',
        'aws ecr get-login-password --region $AWS_DEFAULT_REGION | docker login --username AWS --password-stdin $ECR_REPO',
        `docker build -t $ECR_REPO:$IMAGE_TAG -f ${dockerfilePath} .`,
        'docker push $ECR_REPO:$IMAGE_TAG',
        'export IMAGE_DIGEST=$(docker inspect --format="{{index .RepoDigests 0}}" $ECR_REPO:$IMAGE_TAG | cut -d"@" -f2)',
      ];
      dockerfilePath = '.nixpacks/Dockerfile';
    } else {
      buildCommands = [
        'export IMAGE_TAG=$(date +%Y%m%d%H%M%S)',
        'aws --version',
        'aws ecr get-login-password --region $AWS_DEFAULT_REGION | docker login --username AWS --password-stdin $ECR_REPO',
        `docker build -t $ECR_REPO:$IMAGE_TAG -f ${dockerfilePath} .`,
        'docker push $ECR_REPO:$IMAGE_TAG',
        'export IMAGE_DIGEST=$(docker inspect --format="{{index .RepoDigests 0}}" $ECR_REPO:$IMAGE_TAG | cut -d"@" -f2)',
      ];
    }

    const buildSpec = BuildSpec.fromObject({
      version: '0.2',
      phases: {
        pre_build: {
          commands: [
            ...(this.rootDir ? [`cd ${this.rootDir}`] : []),
            ...buildCommands.slice(0, buildCommands.indexOf(`docker build -t $ECR_REPO:$IMAGE_TAG -f ${dockerfilePath} .`))
          ],
        },
        build: {
          commands: buildCommands.slice(buildCommands.indexOf(`docker build -t $ECR_REPO:$IMAGE_TAG -f ${dockerfilePath} .`), buildCommands.indexOf('docker push $ECR_REPO:$IMAGE_TAG') + 1),
        },
        post_build: {
          commands: buildCommands.slice(buildCommands.indexOf('export IMAGE_DIGEST=$(docker inspect --format="{{index .RepoDigests 0}}" $ECR_REPO:$IMAGE_TAG | cut -d"@" -f2)'), buildCommands.length).concat([
            'export IMAGE_URI=$ECR_REPO@$IMAGE_DIGEST',
            'echo $IMAGE_URI > imageUri.txt',
            'echo $IMAGE_TAG > imageTag.txt',
            'echo $IMAGE_DIGEST > imageDigest.txt',
          ]),
        },
      },
      artifacts: {
        files: this.rootDir ? [
          `${this.rootDir}/imageUri.txt`,
          `${this.rootDir}/imageTag.txt`,
          `${this.rootDir}/imageDigest.txt`,
        ] : [
          'imageUri.txt',
          'imageTag.txt',
          'imageDigest.txt',
        ],
      },
    });

    const buildEnvironmentVariables: Record<string, any> = {
      ECR_REPO: { value: this.ecrRepository.repositoryUri },
      ...(props.buildProps?.environment
        ? Object.entries(Object.assign({}, ...(props.buildProps.environment))).reduce(
            (acc, [key, value]) => ({ ...acc, [key]: { value, type: BuildEnvironmentVariableType.PLAINTEXT } }),
            {}
          )
        : {}),
      ...(props.buildProps?.secrets
        ? Object.fromEntries(
            props.buildProps.secrets.map(({ key, resource }) => [
              key,
              { value: resource, type: BuildEnvironmentVariableType.PARAMETER_STORE },
            ])
          )
        : {}),
    };

    const project = new PipelineProject(this, 'ServiceDockerBuild', {
      projectName: `${this.resourceIdPrefix}-docker-build`,
      buildSpec,
      environment: {
        buildImage: props.serviceProps?.architecture === CpuArchitecture.ARM64 
          ? LinuxArmBuildImage.AMAZON_LINUX_2_STANDARD_3_0 
          : LinuxBuildImage.STANDARD_7_0,
        computeType: ComputeType.SMALL,
        privileged: true,
      },
      environmentVariables: buildEnvironmentVariables,
      timeout: Duration.minutes(20),
    });

    this.ecrRepository.grantPullPush(project);

    project.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['secretsmanager:GetSecretValue'],
        resources: ['*'],
      })
    );

    return project;
  }

  private createDeployProject(props: EC2PipelineProps): PipelineProject {
    const imageUriPath = this.rootDir ? `${this.rootDir}/imageUri.txt` : 'imageUri.txt';
    const deployProject = new PipelineProject(this, 'Ec2DeployProject', {
      projectName: `${this.resourceIdPrefix}-ec2-deploy`,
      buildSpec: BuildSpec.fromObject({
        version: '0.2',
        phases: {
          pre_build: {
            commands: [
              ...(this.rootDir ? [`cd ${this.rootDir}`] : []),
              `IMAGE_URI=$(cat ${imageUriPath})`,
              'echo "Deploying image: $IMAGE_URI"',
            ],
          },
          build: {
            commands: [
              '# Use SSM to run commands on EC2 instances tagged with Name',
              `INSTANCE_TAG=${this.resourceIdPrefix}`,
              'echo "Finding instances with tag: $INSTANCE_TAG"',
              'INSTANCE_IDS=$(aws ec2 describe-instances --filters "Name=tag:Name,Values=$INSTANCE_TAG" --query "Reservations[].Instances[].InstanceId" --output text)',
              'echo "Found instances: $INSTANCE_IDS"',
              'for id in $INSTANCE_IDS; do',
              '  echo "Sending SSM command to $id"',
              `  aws ssm send-command --instance-ids $id --document-name "AWS-RunShellScript" --parameters commands="aws ecr get-login-password --region $AWS_DEFAULT_REGION | docker login --username AWS --password-stdin $ECR_REPO; docker pull $IMAGE_URI; docker stop app || true; docker rm app || true; docker run -d --name app --restart unless-stopped -p 80:${props.serviceProps?.port || 3000} $IMAGE_URI" --comment "Deploy new image" --region $AWS_DEFAULT_REGION`,
              'done',
            ],
          },
        },
      }),
      environment: {
        buildImage: LinuxBuildImage.STANDARD_7_0,
        computeType: ComputeType.SMALL,
        privileged: true,
      },
      environmentVariables: {
        ECR_REPO: { value: this.ecrRepository.repositoryUri },
      },
      timeout: Duration.minutes(15),
    });

    deployProject.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'ssm:SendCommand',
          'ssm:ListCommands',
          'ssm:GetCommandInvocation',
          'ec2:DescribeInstances',
        ],
        resources: ['*'],
      })
    );

    return deployProject;
  }

  private createPipeline(props: EC2PipelineProps): Pipeline {
    const sourceOutput = new Artifact('SourceOutput');
    const buildOutput = new Artifact('BuildOutput');

    return new Pipeline(this, 'Ec2Pipeline', {
      pipelineName: `${this.resourceIdPrefix}-pipeline`,
      pipelineType: PipelineType.V2,
      stages: [
        {
          stageName: 'Source',
          actions: [
            new GitHubSourceAction({
              actionName: 'GithubSourceAction',
              owner: props.sourceProps?.owner!,
              repo: props.sourceProps?.repo!,
              branch: props.sourceProps?.branchOrRef || 'main',
              oauthToken: SecretValue.secretsManager(props.accessTokenSecretArn!),
              output: sourceOutput,
              trigger: GitHubTrigger.WEBHOOK,
            })
          ],
        },
        {
          stageName: 'Build',
          actions: [
            new CodeBuildAction({
              actionName: 'BuildAction',
              project: this.codeBuildProject,
              input: sourceOutput,
              outputs: [buildOutput],
              type: CodeBuildActionType.BUILD,
            }),
          ],
        },
        {
          stageName: 'Deploy',
          actions: [
            new CodeBuildAction({
              actionName: 'DeployAction',
              project: this.deployProject,
              input: buildOutput,
            }),
          ],
        },
      ],
    });
  }
}
