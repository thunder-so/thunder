import { Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { NuxtConstruct } from '../lib/nuxt';
import { FrameworkPipeline } from '../lib/frameworks/pipeline';
import { DiscoveryConstruct } from '../lib/constructs/discovery';
import { NuxtProps } from '../types/NuxtProps';

export class Nuxt extends Stack {
  constructor(scope: Construct, id: string, props: NuxtProps) {
    super(scope, id, props);

    // 1. Nuxt (SSR Server + Client Origin)
    const nuxt = new NuxtConstruct(this, 'Nuxt', props);

    // 2. Pipeline (Optional)
    let pipeline: FrameworkPipeline | undefined;
    if (props.accessTokenSecretArn && props.sourceProps) {
      pipeline = new FrameworkPipeline(this, 'Pipeline', props);
    }

    // 3. Discovery (Metadata)
    // new DiscoveryConstruct(this, 'Discovery', {
    //   ...props,
    //   metadata: {
    //     type: 'Nuxt',
    //     DistributionId: nuxt.client.cdn.distributionId,
    //     DistributionUrl: `https://${nuxt.client.cdn.distributionDomainName}`,
    //     Route53Domain: props.domain ? `https://${props.domain}` : undefined,
    //     CodePipelineName: pipeline?.codePipeline.pipelineName,
    //   }
    // });
  }
}
