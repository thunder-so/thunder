import { App, Aws } from "aws-cdk-lib";
import { Static, type StaticProps } from "../";

const app = new App();

const rawMetadata: any = app.node.tryGetContext("metadata");

if (!rawMetadata) {
  throw new Error("Context metadata missing!");
}

const metadata: StaticProps = {
  ...rawMetadata,
  env: {
    account:
      rawMetadata.env?.account ||
      process.env.CDK_DEFAULT_ACCOUNT ||
      Aws.ACCOUNT_ID,
    region:
      rawMetadata.env?.region || process.env.CDK_DEFAULT_REGION || Aws.REGION,
  },
};

new Static(
  app,
  `${metadata.application}-${metadata.service}-${metadata.environment}-stack`,
  metadata,
);

app.synth();
