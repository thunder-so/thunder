import { Stack, Duration, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { ARecord, HostedZone, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { ComputeConstruct } from '../lib/ec2/compute';
import { PipelineConstruct } from '../lib/ec2/pipeline';
import { DiscoveryConstruct } from '../lib/constructs/discovery';
import { Ec2Props } from '../types/Ec2Props';
import { getResourceIdPrefix } from '../lib/utils';

export class Ec2 extends Stack {
  constructor(scope: Construct, id: string, props: Ec2Props) {
    super(scope, id, props);

    // Check mandatory properties
    if (!props?.env) {
      throw new Error('Must provide AWS account and region.');
    }
    if (!props.application || !props.environment || !props.service) {
      throw new Error('Mandatory stack properties missing.');
    }

    if (props.domain && !props.acmeEmail) {
      throw new Error('acmeEmail is required when domain is set.');
    }

    if (!props.serviceProps?.authorizedKeys || props.serviceProps.authorizedKeys.length === 0) {
      throw new Error('At least one authorizedKey must be provided');
    }

    const resourceIdPrefix = getResourceIdPrefix(props.application, props.service, props.environment);

    // 1. EC2 Compute
    const ec2 = new ComputeConstruct(this, 'EC2', props);

    // 2. Route53 DNS (if domain + hostedZoneId provided)
    if (props.domain && props.hostedZoneId) {
      const zone = HostedZone.fromHostedZoneId(this, 'HostedZone', props.hostedZoneId);
      new ARecord(this, 'ARecord', {
        zone,
        recordName: props.domain,
        target: RecordTarget.fromIpAddresses(ec2.instance.elasticIp.ref),
        ttl: Duration.minutes(5),
      });
    }

    // 3. Pipeline (if GitHub access token provided)
    let pipeline: PipelineConstruct | undefined;
    if (props?.accessTokenSecretArn) {
      if (!props.sourceProps?.owner || !props.sourceProps?.repo || !props.sourceProps?.branchOrRef) {
        throw new Error('Missing sourceProps: Github owner, repo and branch/ref required.');
      }

      pipeline = new PipelineConstruct(this, 'Pipeline', props);
    }

    // 4. Outputs
    new CfnOutput(this, 'InstanceId', {
      value: ec2.instance.instance.instanceId,
      description: 'EC2 Instance ID',
    });

    new CfnOutput(this, 'ElasticIp', {
      value: ec2.instance.elasticIp.ref,
      description: 'Elastic IP address of the instance',
    });

    const mainPort = props.serviceProps?.port ?? 3000;
    const portSuffix = mainPort === 80 ? "" : `:${mainPort}`;
    const serviceUrl = props.domain ? `https://${props.domain}` : `http://${ec2.instance.elasticIp.ref}${portSuffix}`;

    new CfnOutput(this, 'ServiceUrl', {
      value: serviceUrl,
      description: 'Service URL',
    });

    if (props.domain) {
      new CfnOutput(this, 'Route53Domain', {
        value: `https://${props.domain}`,
        description: 'The custom domain URL',
        exportName: `${resourceIdPrefix}-Route53Domain`,
      });
    }

    // 5. Discovery (Metadata)
    // new DiscoveryConstruct(this, 'Discovery', {
    //   ...props,
    //   metadata: {
    //     type: 'EC2',
    //     InstanceId: ec2.instance.instance.instanceId,
    //     ElasticIp: ec2.instance.elasticIp.ref,
    //     ServiceUrl: serviceUrl,
    //     Route53Domain: props.domain ? `https://${props.domain}` : undefined,
    //     CodePipelineName: pipeline?.codePipeline.pipelineName,
    //   }
    // });

  }
}
