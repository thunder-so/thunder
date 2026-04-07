import { App } from "aws-cdk-lib";
import { Nuxt, type NuxtProps } from "../";
import {
  getMetadata,
  resolveEnv,
  mapLambdaRuntime,
  mapLambdaArch,
} from "./utils";

const app = new App();
const raw = getMetadata(app);

const metadata: NuxtProps = {
  ...raw,
  env: resolveEnv(raw),
  serverProps: {
    ...raw.serverProps,
    ...(mapLambdaRuntime(raw.serverProps?.runtime) && {
      runtime: mapLambdaRuntime(raw.serverProps?.runtime),
    }),
    ...(mapLambdaArch(raw.serverProps?.architecture) && {
      architecture: mapLambdaArch(raw.serverProps?.architecture),
    }),
  },
};

new Nuxt(
  app,
  `${metadata.application}-${metadata.service}-${metadata.environment}-stack`,
  metadata,
);
app.synth();
