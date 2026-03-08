import { Stack, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { TemplateConstruct } from '../lib/template';
import { DiscoveryConstruct } from '../lib/constructs/discovery';
import { TemplateProps } from '../types/TemplateProps';

export class Template extends Stack {
  constructor(scope: Construct, id: string, props: TemplateProps) {
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

    if (props.authorizedKeys.length === 0) {
      throw new Error('At least one authorizedKey must be provided');
    }

    // 1. Template (Coolify-style) Construct
    const template = new TemplateConstruct(this, 'Template', props);

    // 2. Discovery (Metadata)
    // new DiscoveryConstruct(this, 'Discovery', {
    //   ...props,
    //   metadata: {
    //     type: 'Template',
    //     TemplateSlug: props.templateSlug,
    //     InstanceId: template.instance.instance.instanceId,
    //     ElasticIp: template.instance.elasticIp.ref,
    //     ServiceUrl: props.domain ? `https://${props.domain}` : `http://${template.instance.elasticIp.ref}`,
    //     Route53Domain: props.domain ? `https://${props.domain}` : undefined,
    //   }
    // });

    new CfnOutput(this, 'TemplateSlug', {
      value: props.templateSlug,
      description: 'The slug of the template used',
    });

    if (props.domain) {
      new CfnOutput(this, 'Route53Domain', {
        value: `https://${props.domain}`,
        description: 'The custom domain URL',
      });
    }
  }
}
