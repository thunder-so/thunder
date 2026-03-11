import { App } from "aws-cdk-lib";
import { InstanceType } from "aws-cdk-lib/aws-ec2";
import { Template, type TemplateProps, fetchTemplate, hydrateTemplate } from '../';

const app = new App();

const rawMetadata: any = app.node.tryGetContext('metadata');

if (!rawMetadata) {
  throw new Error('Context metadata missing!');
}

async function main() {
  const config = {
    application: rawMetadata.application,
    service: rawMetadata.service,
    environment: rawMetadata.environment,
    templateSlug: rawMetadata.templateSlug || "emby",
    instanceType: new InstanceType(rawMetadata.instanceType || "t3.nano"),
    authorizedKeys: rawMetadata.authorizedKeys || [],
    domain: rawMetadata.domain || undefined,
    hostedZoneId: rawMetadata.hostedZoneId || undefined,
    acmeEmail: rawMetadata.acmeEmail || undefined,
    logRetentionDays: rawMetadata.logRetentionDays || 30,
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT!,
      region: process.env.CDK_DEFAULT_REGION!,
    },
  };

  console.log(`[app] Fetching Coolify template: ${config.templateSlug}`);
  const { parsed: parsedTemplate, port } = await fetchTemplate(config.templateSlug);

  console.log(`[app] Hydrating template variables`);
  const hydrateResult = hydrateTemplate(parsedTemplate, {
    domain: config.domain,
    fallbackPort: port,
  });

  console.log(
    `[app] Resolved ${Object.keys(hydrateResult.resolvedVars).length} SERVICE_* variables`
  );

  const metadata: TemplateProps = {
    ...config,
    hydrateResult,
  };

  new Template(app, `${config.application}-${config.service}-${config.environment}-stack`, metadata);

  app.synth();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
