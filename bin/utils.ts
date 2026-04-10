import { Runtime, Architecture } from "aws-cdk-lib/aws-lambda";
import { CpuArchitecture } from "aws-cdk-lib/aws-ecs";
import { App, Aws } from "aws-cdk-lib";

export { getResourceIdPrefix } from "../lib/utils/naming";

export function mapLambdaRuntime(rt?: string | Runtime): Runtime | undefined {
  if (!rt) return undefined;
  if ((rt as any)?.name) return rt as Runtime;
  const s = String(rt).toLowerCase();
  if (s === "provided") return Runtime.PROVIDED_AL2023;
  if (s.startsWith("nodejs")) {
    if (s.includes("22")) return Runtime.NODEJS_22_X;
    if (s.includes("20")) return Runtime.NODEJS_20_X;
    if (s.includes("18")) return Runtime.NODEJS_18_X;
  }
  return Runtime.NODEJS_22_X;
}

export function mapLambdaArch(
  a?: string | Architecture,
): Architecture | undefined {
  if (!a) return undefined;
  if ((a as any)?.name) return a as Architecture;
  const s = String(a).toLowerCase();
  if (s === "arm" || s === "arm64") return Architecture.ARM_64;
  if (s === "x86" || s === "x86_64" || s === "x64") return Architecture.X86_64;
  console.warn(`Unrecognized architecture: "${a}" — using stack defaults`);
  return undefined;
}

export function mapFargateArch(
  a?: string | CpuArchitecture,
): CpuArchitecture | undefined {
  if (!a) return undefined;
  if ((a as any)?.name) return a as CpuArchitecture;
  const s = String(a).toLowerCase();
  if (s === "arm" || s === "arm64") return CpuArchitecture.ARM64;
  if (s === "x86" || s === "x86_64" || s === "x64")
    return CpuArchitecture.X86_64;
  console.warn(`Unrecognized architecture: "${a}" — using stack defaults`);
  return undefined;
}

export function resolveEnv(rawMetadata: any) {
  return {
    account:
      rawMetadata.env?.account ||
      process.env.CDK_DEFAULT_ACCOUNT ||
      Aws.ACCOUNT_ID,
    region:
      rawMetadata.env?.region || process.env.CDK_DEFAULT_REGION || Aws.REGION,
  };
}

export function getMetadata(app: App): any {
  const raw = app.node.tryGetContext("metadata");
  if (!raw) throw new Error("Context metadata missing!");
  return raw;
}
