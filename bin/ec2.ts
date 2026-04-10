import { App } from "aws-cdk-lib";
import { Ec2, type Ec2Props } from "../";
import {
  getMetadata,
  resolveEnv,
  mapFargateArch,
  getResourceIdPrefix,
} from "./utils";

const app = new App();
const raw = getMetadata(app);

const metadata: Ec2Props = {
  ...raw,
  env: resolveEnv(raw),
  serviceProps: {
    ...raw.serviceProps,
    ...(mapFargateArch(raw.serviceProps?.architecture) && {
      architecture: mapFargateArch(raw.serviceProps?.architecture),
    }),
  },
};

new Ec2(
  app,
  `${getResourceIdPrefix(metadata.application, metadata.service, metadata.environment)}-stack`,
  metadata,
);
app.synth();
