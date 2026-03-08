import { Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { AstroConstruct } from '../lib/astro';
import { FrameworkPipeline } from '../lib/frameworks/pipeline';
import { DiscoveryConstruct } from '../lib/constructs/discovery';
import { NuxtProps as AstroProps } from '../types/NuxtProps';

export class Astro extends Stack {
  constructor(scope: Construct, id: string, props: AstroProps) {
    super(scope, id, props);

    // 1. Astro (SSR Server + Client Origin with Edge Fallback)
    const astro = new AstroConstruct(this, 'Astro', props);

    // 2. Pipeline (Optional)
    let pipeline: FrameworkPipeline | undefined;
    if (props.accessTokenSecretArn && props.sourceProps) {
      pipeline = new FrameworkPipeline(this, 'Pipeline', props);
    }

    // 3. Discovery (Metadata)
    // new DiscoveryConstruct(this, 'Discovery', {
    //   ...props,
    //   metadata: {
    //     type: 'Astro',
    //     DistributionId: astro.client.cdn.distributionId,
    //     DistributionUrl: `https://${astro.client.cdn.distributionDomainName}`,
    //     Route53Domain: props.domain ? `https://${props.domain}` : undefined,
    //     CodePipelineName: pipeline?.codePipeline.pipelineName,
    //   }
    // });
  }
}
