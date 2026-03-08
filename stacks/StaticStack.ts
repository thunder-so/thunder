import { Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { HostingConstruct } from '../lib/static/hosting';
import { PipelineConstruct } from '../lib/static/pipeline';
import { DeployConstruct } from '../lib/static/deploy';
import { DiscoveryConstruct } from '../lib/constructs/discovery';
import { StaticProps } from '../types/StaticProps'

export class Static extends Stack {
  constructor(scope: Construct, id: string, props: StaticProps) {
    super(scope, id, props);

    // 1. Hosting (S3 + CloudFront + Route53)
    const hosting = new HostingConstruct(this, 'Hosting', props);

    // 2. Direct Deploy (Optional - used when deploying from local)
    if (!props.accessTokenSecretArn) {
        new DeployConstruct(this, 'Deploy', {
            ...props,
            HostingBucket: hosting.hostingBucket,
            Distribution: hosting.distribution
        });
    }

    // 3. Pipeline (CI/CD)
    let pipeline: PipelineConstruct | undefined;
    if (props.accessTokenSecretArn) {
      pipeline = new PipelineConstruct(this, 'Pipeline', {
        ...props,
        HostingBucket: hosting.hostingBucket,
        Distribution: hosting.distribution
      });
    }

    // 4. Discovery (Metadata)
    // new DiscoveryConstruct(this, 'Discovery', {
    //   ...props,
    //   metadata: {
    //     type: 'Static',
    //     DistributionId: hosting.distribution.distributionId,
    //     DistributionUrl: `https://${hosting.distribution.distributionDomainName}`,
    //     Route53Domain: props.domain ? `https://${props.domain}` : undefined,
    //     CodePipelineName: pipeline?.codePipeline.pipelineName,
    //   }
    // });
  }
}
