import { App } from "aws-cdk-lib";
import { FargateStack, type FargateProps } from '../';
import { CpuArchitecture } from 'aws-cdk-lib/aws-ecs';

const app = new App();

const rawMetadata: any = app.node.tryGetContext('metadata');

if (!rawMetadata) {
  throw new Error('Context metadata missing!');
}

function mapArch(a?: string | CpuArchitecture): CpuArchitecture | undefined {
  if (!a) return undefined;
  if ((a as any)?.name) return a as CpuArchitecture;
  const s = String(a).toLowerCase();
  if (s === 'arm' || s === 'arm64') return CpuArchitecture.ARM64;
  if (s === 'x86' || s === 'x86_64' || s === 'x64') return CpuArchitecture.X86_64;
  console.warn(`Unrecognized architecture string in context: "${a}" — using stack defaults`);
  return undefined;
}

const mappedArch = mapArch(rawMetadata.serviceProps?.architecture as any);

const metadata: FargateProps = {
  ...rawMetadata,
  serviceProps: {
    ...rawMetadata.serviceProps,
    ...(mappedArch && { architecture: mappedArch })
  }
};

new FargateStack(app, `${metadata.application}-${metadata.service}-${metadata.environment}-stack`, metadata);

app.synth();
