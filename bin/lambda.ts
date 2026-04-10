import { App } from "aws-cdk-lib";
import { Lambda, type LambdaProps } from "../";
import {
  getMetadata,
  resolveEnv,
  mapLambdaRuntime,
  mapLambdaArch,
  getResourceIdPrefix,
} from "./utils";

const app = new App();
const raw = getMetadata(app);

const metadata: LambdaProps = {
  ...raw,
  env: resolveEnv(raw),
  functionProps: {
    ...raw.functionProps,
    ...(mapLambdaRuntime(raw.functionProps?.runtime) && {
      runtime: mapLambdaRuntime(raw.functionProps?.runtime),
    }),
    ...(mapLambdaArch(raw.functionProps?.architecture) && {
      architecture: mapLambdaArch(raw.functionProps?.architecture),
    }),
  },
};

new Lambda(
  app,
  `${getResourceIdPrefix(metadata.application, metadata.service, metadata.environment)}-stack`,
  metadata,
);
app.synth();
