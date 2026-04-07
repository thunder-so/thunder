import { App } from "aws-cdk-lib";
import { Fargate, type FargateProps } from "../";
import { getMetadata, resolveEnv, mapFargateArch } from "./utils";

const app = new App();
const raw = getMetadata(app);

const metadata: FargateProps = {
  ...raw,
  env: resolveEnv(raw),
  serviceProps: {
    ...raw.serviceProps,
    ...(mapFargateArch(raw.serviceProps?.architecture) && {
      architecture: mapFargateArch(raw.serviceProps?.architecture),
    }),
  },
};

new Fargate(
  app,
  `${metadata.application}-${metadata.service}-${metadata.environment}-stack`,
  metadata,
);
app.synth();
