import { App } from "aws-cdk-lib";
import { Ec2, type Ec2Props } from '../';
import { CpuArchitecture } from 'aws-cdk-lib/aws-ecs';

const app = new App();

const rawMetadata: any = app.node.tryGetContext('metadata');

if (!rawMetadata) {
  throw new Error('Context metadata missing!');
}

function mapArch(a?: string | CpuArchitecture): CpuArchitecture | undefined {
  if (!a) return undefined;
  if (typeof a !== 'string') return a as CpuArchitecture;
  const s = String(a).toLowerCase();
  if (s === 'arm' || s === 'arm64') return CpuArchitecture.ARM64;
  if (s === 'x86' || s === 'x86_64' || s === 'x64') return CpuArchitecture.X86_64;
  return undefined;
}

const mappedArch = mapArch(rawMetadata.serviceProps?.architecture);

const metadata: Ec2Props = {
  ...rawMetadata,
  serviceProps: {
    ...rawMetadata.serviceProps,
    ...(mappedArch && { architecture: mappedArch })
  }
};

const name = `${metadata.application}-${metadata.service}-${metadata.environment}-stack`;
new Ec2(app, name, metadata);

app.synth();
