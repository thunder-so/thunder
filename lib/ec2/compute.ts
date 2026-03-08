import path from 'path';
import { Construct } from 'constructs';
import { DockerImageAsset, Platform } from 'aws-cdk-lib/aws-ecr-assets';
import { InstanceType } from 'aws-cdk-lib/aws-ec2';
import { CpuArchitecture } from 'aws-cdk-lib/aws-ecs';
import { Ec2Props } from '../../types/Ec2Props';
import { generateNixpacksDockerfile, getResourceIdPrefix, resolveVpc } from '../utils';
import { CloudWatchAgent } from './constructs/cloudwatch-agent';
import { Ec2Instance } from './constructs/ec2-instance';
import { buildUserData } from './constructs/user-data';

export class ComputeConstruct extends Construct {
  public readonly instance: Ec2Instance;
  public readonly cloudWatchAgent: CloudWatchAgent;

  constructor(scope: Construct, id: string, props: Ec2Props) {
    super(scope, id);

    const resourceIdPrefix = getResourceIdPrefix(props.application, props.service, props.environment);

    const vpc = resolveVpc(props.vpc);

    // 1. Resolve Root Directory
    const sanitizePath = (p: string | undefined): string => {
      if (!p) return '';
      return p.replace(/[^a-zA-Z0-9._\-@#$%^&*+=~ /]|\/+/g, m => m.includes('/') ? '/' : '').replace(/^\/+|\/+$/g, '')
    };
    const rootDir = path.join(props.contextDirectory || '', sanitizePath(props.rootDir));

    // 2. Handle Nixpacks / Dockerfile
    let dockerfilePath = props.serviceProps?.dockerFile || 'Dockerfile';
    if (props.buildProps?.buildSystem === 'Nixpacks') {
      dockerfilePath = generateNixpacksDockerfile(rootDir, props.buildProps);
    }

    // 3. Create Docker Image Asset (Builds and pushes to ECR)
    const platform = props.serviceProps?.architecture === CpuArchitecture.ARM64 
      ? Platform.LINUX_ARM64 
      : Platform.LINUX_AMD64;

    const imageAsset = new DockerImageAsset(this, 'AppImage', {
      directory: rootDir,
      file: dockerfilePath,
      platform: platform,
      buildArgs: props.serviceProps?.dockerBuildArgs ? Object.fromEntries(
        props.serviceProps.dockerBuildArgs.map(arg => arg.split('='))
      ) : undefined,
    });

    // 4. Setup CloudWatch Agent
    this.cloudWatchAgent = new CloudWatchAgent(this, 'CloudWatchAgent', {
      stackName: resourceIdPrefix,
    });

    // 5. Build User Data
    const userData = buildUserData({
      authorizedKeys: props.serviceProps?.authorizedKeys || [],
      cloudWatchAgentConfig: this.cloudWatchAgent.agentConfigJson,
      imageUri: imageAsset.imageUri,
      port: props.serviceProps?.port || 3000,
      variables: props.serviceProps?.variables,
      domain: props.domain,
      acmeEmail: props.acmeEmail,
      architecture: props.serviceProps?.architecture || CpuArchitecture.X86_64,
    });

    // 6. Provision EC2 Instance
    this.instance = new Ec2Instance(this, 'Instance', {
      instanceType: new InstanceType(props.serviceProps?.instanceType || 't3.micro'),
      userData,
      stackName: resourceIdPrefix,
      architecture: props.serviceProps?.architecture || CpuArchitecture.X86_64,
      vpc: vpc,
      extraPorts: props.domain ? [] : [props.serviceProps?.port || 3000],
    });

    // Grant the instance role permission to pull the image
    imageAsset.repository.grantPull(this.instance.instance.role);
  }
}
