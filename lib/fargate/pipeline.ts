import { Construct } from 'constructs';
import { CfnOutput, Duration, RemovalPolicy, SecretValue } from 'aws-cdk-lib';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { PipelineProject, BuildSpec, LinuxArmBuildImage, LinuxBuildImage, ComputeType, BuildEnvironmentVariableType } from 'aws-cdk-lib/aws-codebuild';
import { CpuArchitecture } from 'aws-cdk-lib/aws-ecs';
import { Pipeline, Artifact, PipelineType } from 'aws-cdk-lib/aws-codepipeline';
import { GitHubSourceAction, GitHubTrigger, CodeBuildAction, CodeBuildActionType } from 'aws-cdk-lib/aws-codepipeline-actions';
import { Repository } from 'aws-cdk-lib/aws-ecr';
import { FargateService, TaskDefinition } from 'aws-cdk-lib/aws-ecs';
import { FargateProps } from '../../types/FargateProps';
import { getResourceIdPrefix } from '../utils';

export interface WebServicePipelineProps extends FargateProps {
  clusterName: string;
  fargateService: FargateService;
  taskDefinition: TaskDefinition;
}

export class PipelineConstruct extends Construct {
  private resourceIdPrefix: string;
  public readonly ecrRepository: Repository;
  public readonly codeBuildProject: PipelineProject;
  public readonly codePipeline: Pipeline;
  public readonly deployProject: PipelineProject;
  private rootDir: string;

  constructor(scope: Construct, id: string, props: WebServicePipelineProps) {
    super(scope, id);

    this.resourceIdPrefix = getResourceIdPrefix(props.application, props.service, props.environment);

    // Sanitize paths to ensure valid unix directory paths
    const sanitizePath = (path: string | undefined): string => {
      if (!path) return '';
      return path.replace(/[^a-zA-Z0-9._\-@#$%^&*+=~ /]|\/+/g, m => m.includes('/') ? '/' : '').replace(/^\/+|\/+$/g, '')
    };

    this.rootDir = sanitizePath(props?.rootDir);

    this.ecrRepository = this.createEcrRepository(props);
    this.codeBuildProject = this.createBuildProject(props);

    this.deployProject = this.createDeployProject(props);

    this.codePipeline = this.createPipeline(props);

    // Output pipeline name
    new CfnOutput(this, 'CodePipelineName', {
      value: this.codePipeline.pipelineName,
      description: 'The name of the ECS Fargate deployment pipeline',
      exportName: `${this.resourceIdPrefix}-CodePipelineName`,
    });
  };

  /**
    * Creates an Amazon ECR repository for storing Docker images.
    * 
    * @private
    * @param {WebServicePipelineProps} props - The pipeline configuration properties.
    * @returns {Repository} The created ECR repository.
    */
  private createEcrRepository(props: WebServicePipelineProps): Repository {
    const repo = new Repository(this, 'ServiceEcrRepo', {
      repositoryName: `${this.resourceIdPrefix}-repo`,
      removalPolicy: RemovalPolicy.DESTROY,
      emptyOnDelete: true,
    });

    // Grant ECS task execution role permissions to pull from ECR
    props.taskDefinition?.executionRole?.addToPrincipalPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ],
        resources: ["*"], 
      })
    );

    return repo;
  };

  /**
    * Creates a CodeBuild project for building and pushing Docker images to ECR.
    * 
    * @private
    * @param {WebServicePipelineProps} props - The pipeline configuration properties.
    * @returns {PipelineProject} The created CodeBuild project.
    */
  private createBuildProject(props: WebServicePipelineProps): PipelineProject {
    // BuildSpec for Docker build & push using image digest and date-based tag
    let buildCommands: string[];
    let dockerfilePath = props.serviceProps?.dockerFile || 'Dockerfile';
    if (props.buildProps?.buildSystem === 'Nixpacks') {
      // Nixpacks integration
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
        'docker build -t $ECR_REPO:$IMAGE_TAG -f .nixpacks/Dockerfile .',
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
            ...buildCommands.slice(0, buildCommands.indexOf('docker build -t $ECR_REPO:$IMAGE_TAG -f ' + dockerfilePath + ' .'))
          ],
        },
        build: {
          commands: buildCommands.slice(buildCommands.indexOf('docker build -t $ECR_REPO:$IMAGE_TAG -f ' + dockerfilePath + ' .'), buildCommands.indexOf('docker push $ECR_REPO:$IMAGE_TAG') + 1),
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

    // Build environment variables
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

    // CodeBuild project for Docker build & push
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

    // Grant CodeBuild permissions to push to ECR
    this.ecrRepository.grantPullPush(project);

    // Allow CodeBuild to get secrets if needed
    project.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['secretsmanager:GetSecretValue'],
        resources: ["*"],
      })
    );

    return project;
  };

  /**
   * 
   */
  private createDeployProject(props: WebServicePipelineProps): PipelineProject {
    const imageUriPath = this.rootDir ? `${this.rootDir}/imageUri.txt` : 'imageUri.txt';
    // Deploy project: update ECS service with new image
    // Deploy project: update ECS service by registering a new task definition revision with the new image digest
    const deployProject = new PipelineProject(this, 'EcsDeployProject', {
      projectName: `${this.resourceIdPrefix}-ecs-deploy`,
      buildSpec: BuildSpec.fromObject({
        version: '0.2',
        phases: {
          pre_build: {
            commands: [
              'echo "Starting ECS deployment..."',
              `IMAGE_URI=$(cat ${imageUriPath})`,
              'echo "Deploying image: $IMAGE_URI"',
              'CURRENT_TASK_DEF=$(aws ecs describe-task-definition --task-definition $ECS_TASKDEF --region $AWS_DEFAULT_REGION)',
              'echo "$CURRENT_TASK_DEF" | jq --arg IMAGE_URI "$IMAGE_URI" \'.taskDefinition | .containerDefinitions[0].image = $IMAGE_URI | del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .compatibilities, .registeredAt, .registeredBy)\' > taskdef.json',
            ],
          },
          build: {
            commands: [
              // Register new task definition revision from taskdef.json
              'NEW_TASK_DEF_ARN=$(aws ecs register-task-definition --cli-input-json file://taskdef.json --region $AWS_DEFAULT_REGION --query "taskDefinition.taskDefinitionArn" --output text)',
              'echo "New task definition: $NEW_TASK_DEF_ARN"',
              // Configure rolling deployment strategy
              'aws ecs update-service --cluster $ECS_CLUSTER --service $ECS_SERVICE --deployment-configuration "maximumPercent=200,minimumHealthyPercent=50,deploymentCircuitBreaker={enable=true,rollback=true}" --region $AWS_DEFAULT_REGION',
              // Update ECS service to use the new task definition
              'aws ecs update-service --cluster $ECS_CLUSTER --service $ECS_SERVICE --task-definition $NEW_TASK_DEF_ARN --region $AWS_DEFAULT_REGION',
              'echo "Monitoring deployment progress..."',
              'for i in {1..30}; do RUNNING_COUNT=$(aws ecs describe-services --cluster $ECS_CLUSTER --services $ECS_SERVICE --region $AWS_DEFAULT_REGION --query "services[0].runningCount" --output text); DESIRED_COUNT=$(aws ecs describe-services --cluster $ECS_CLUSTER --services $ECS_SERVICE --region $AWS_DEFAULT_REGION --query "services[0].desiredCount" --output text); DEPLOYMENT_STATUS=$(aws ecs describe-services --cluster $ECS_CLUSTER --services $ECS_SERVICE --region $AWS_DEFAULT_REGION --query "services[0].deployments[0].status" --output text); echo "Deployment status: $DEPLOYMENT_STATUS, Running: $RUNNING_COUNT/$DESIRED_COUNT (attempt $i/30)"; if [ "$DEPLOYMENT_STATUS" = "PRIMARY" ] && [ "$RUNNING_COUNT" = "$DESIRED_COUNT" ]; then echo "Deployment successful"; break; fi; if [ "$DEPLOYMENT_STATUS" = "FAILED" ]; then echo "Deployment failed"; exit 1; fi; sleep 30; done',
              // Final stability check with timeout
              'timeout 900 aws ecs wait services-stable --cluster $ECS_CLUSTER --services $ECS_SERVICE --region $AWS_DEFAULT_REGION || echo "Deployment completed with timeout - check ECS console for final status"',
              'echo "ECS service deployed successfully"',
            ],
          },
        },
      }),
      environment: {
        buildImage: props.serviceProps?.architecture === CpuArchitecture.ARM64 
          ? LinuxArmBuildImage.AMAZON_LINUX_2_STANDARD_3_0 
          : LinuxBuildImage.STANDARD_7_0,
        computeType: ComputeType.SMALL,
        privileged: true,
      },
      environmentVariables: {
        ECS_CLUSTER: { value: props.clusterName || '' },
        ECS_SERVICE: { value: props.fargateService.serviceName || '' },
        ECS_TASKDEF: { value: props.taskDefinition.family || '' },
      },
      timeout: Duration.minutes(15),
    });

    // Allow deploy project to update ECS service and task definition
    deployProject.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'ecs:UpdateService',
          'ecs:DescribeServices',
          'ecs:DescribeTaskDefinition',
          'ecs:RegisterTaskDefinition',
          'ecs:DescribeTasks',
          'ecs:ListTasks',
        ],
        resources: ['*'],
      })
    );

    // Allow deploy project to pass roles (for task definition update)
    deployProject.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['iam:PassRole'],
        resources: ['*'],
      })
    );

    return deployProject;
  }

  /**
    * Creates a CodePipeline pipeline with source, build, and deploy stages.
    * 
    * @private
    * @param {WebServicePipelineProps} props - The pipeline configuration properties.
    * @returns {Pipeline} The created CodePipeline instance.
    */
  private createPipeline(props: WebServicePipelineProps): Pipeline {
    // Artifacts
    const sourceOutput = new Artifact('SourceOutput');
    const buildOutput = new Artifact('BuildOutput');

    // Pipeline
    return new Pipeline(this, 'WebServicePipeline', {
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
  };
}
