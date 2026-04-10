import { App, Aws } from "aws-cdk-lib";
import { Static, type StaticProps } from "../";
import { getResourceIdPrefix, getMetadata, resolveEnv } from "./utils";

const app = new App();
const raw = getMetadata(app);

const metadata: StaticProps = {
  ...raw,
  env: resolveEnv(raw),
};

new Static(
  app,
  `${getResourceIdPrefix(metadata.application, metadata.service, metadata.environment)}-stack`,
  metadata,
);

app.synth();
