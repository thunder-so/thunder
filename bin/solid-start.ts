import { App } from "aws-cdk-lib";
import { SolidStart, type SolidStartProps } from "../";
import {
  getMetadata,
  resolveEnv,
  mapLambdaRuntime,
  mapLambdaArch,
  getResourceIdPrefix,
} from "./utils";

const app = new App();
const raw = getMetadata(app);

const metadata: SolidStartProps = {
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

new SolidStart(
  app,
  `${getResourceIdPrefix(metadata.application, metadata.service, metadata.environment)}-stack`,
  metadata,
);
app.synth();
