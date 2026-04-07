import { Stack, CfnOutput, Aws } from "aws-cdk-lib";
import { Construct } from "constructs";
import { TemplateConstruct } from "../lib/template";
import { MetadataConstruct } from "../lib/constructs/metadata";
import { TemplateProps } from "../types/TemplateProps";

export class Template extends Stack {
  constructor(scope: Construct, id: string, props: TemplateProps) {
    // Populate default env if not provided
    props = {
      ...props,
      env: {
        account:
          props.env?.account ||
          process.env.CDK_DEFAULT_ACCOUNT ||
          Aws.ACCOUNT_ID,
        region:
          props.env?.region || process.env.CDK_DEFAULT_REGION || Aws.REGION,
      },
    } as TemplateProps;

    super(scope, id, props);

    if (!props.application || !props.environment || !props.service) {
      throw new Error("Mandatory stack properties missing.");
    }

    if (props.domain && !props.acmeEmail) {
      throw new Error("acmeEmail is required when domain is set.");
    }

    if (props.authorizedKeys.length === 0) {
      throw new Error("At least one authorizedKey must be provided");
    }

    // 1. Template (Coolify-style) Construct
    const template = new TemplateConstruct(this, "Template", props);

    // 2. Metadata
    new MetadataConstruct(this, "Metadata", {
      ...props,
      stackType: "TEMPLATE",
      stackProps: {
        templateSlug: props.templateSlug,
        instanceType: props.instanceType,
        authorizedKeys: props.authorizedKeys,
        hydrateResult: props.hydrateResult,
        domain: props.domain,
        hostedZoneId: props.hostedZoneId,
        acmeEmail: props.acmeEmail,
      },
      resources: {
        TemplateSlug: props.templateSlug,
        InstanceId: template.instance.instance.instanceId,
        ElasticIp: template.instance.elasticIp.ref,
        ServiceUrl: props.domain
          ? `https://${props.domain}`
          : `http://${template.instance.elasticIp.ref}`,
        Route53Domain: props.domain ? `https://${props.domain}` : undefined,
      },
    });

    const resourceIdPrefix = `${props.application}-${props.service}-${props.environment}`;

    new CfnOutput(this, "TemplateSlug", {
      value: props.templateSlug,
      description: "The slug of the template used",
      exportName: `${resourceIdPrefix}-TemplateSlug`,
    });

    if (props.domain) {
      new CfnOutput(this, "Route53Domain", {
        value: `https://${props.domain}`,
        description: "The custom domain URL",
        exportName: `${resourceIdPrefix}-Route53Domain`,
      });
    }
  }
}
