import { App } from "aws-cdk-lib";
import { AstroStack, type NuxtProps as AstroProps } from '../';
import { Runtime, Architecture } from 'aws-cdk-lib/aws-lambda';

const app = new App();

const rawMetadata: any = app.node.tryGetContext('metadata');

if (!rawMetadata) {
  throw new Error('Context metadata missing!');
}

function mapRuntime(rt?: string | Runtime): Runtime | undefined {
  if (!rt) return undefined;
  if ((rt as any)?.name) return rt as Runtime;
  const s = String(rt).toLowerCase();
  if (s === 'provided') return Runtime.PROVIDED_AL2023;
  if (s.startsWith('nodejs')) {
    if (s.includes('22')) return Runtime.NODEJS_22_X;
    if (s.includes('20')) return Runtime.NODEJS_20_X;
    if (s.includes('18')) return Runtime.NODEJS_18_X;
  }
  return Runtime.NODEJS_22_X;
}

function mapArch(a?: string | Architecture): Architecture | undefined {
  if (!a) return undefined;
  if ((a as any)?.name) return a as Architecture;
  const s = String(a).toLowerCase();
  if (s === 'arm' || s === 'arm64') return Architecture.ARM_64;
  if (s === 'x86' || s === 'x86_64' || s === 'x64') return Architecture.X86_64;
  console.warn(`Unrecognized architecture string in context: "${a}" — using stack defaults`);
  return undefined;
}

const mappedRuntime = mapRuntime(rawMetadata.serverProps?.runtime as any);
const mappedArch = mapArch(rawMetadata.serverProps?.architecture as any);

const metadata: AstroProps = {
  ...rawMetadata,
  serverProps: {
    ...rawMetadata.serverProps,
    ...(mappedRuntime && { runtime: mappedRuntime }),
    ...(mappedArch && { architecture: mappedArch })
  }
};

new AstroStack(app, `${metadata.application}-${metadata.service}-${metadata.environment}-stack`, metadata);

app.synth();
