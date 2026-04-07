// Stacks
export { Static } from "./stacks/StaticStack";
export { Lambda } from "./stacks/LambdaStack";
export { Fargate } from "./stacks/FargateStack";
export { Ec2 } from "./stacks/Ec2Stack";
export { Template } from "./stacks/TemplateStack";
export { Vpc } from "./stacks/VpcStack";

// Serverless framework stacks (new unified abstraction)
export * from "./lib/serverless";
export { ServerlessStack as Serverless } from "./stacks/ServerlessStack";

// Types
export type { StaticProps } from "./types/StaticProps";
export type { LambdaProps } from "./types/LambdaProps";
export type { FargateProps } from "./types/FargateProps";
export type { Ec2Props } from "./types/Ec2Props";
export type { TemplateProps } from "./types/TemplateProps";

// Serverless framework types
export type { ServerlessProps as NuxtProps } from "./types/ServerlessProps";
export type { ServerlessProps as AstroProps } from "./types/ServerlessProps";
export type { ServerlessProps as TanStackStartProps } from "./types/ServerlessProps";
export type { ServerlessProps as SvelteKitProps } from "./types/ServerlessProps";
export type { ServerlessProps as SolidStartProps } from "./types/ServerlessProps";
export type { ServerlessProps as AnalogJSProps } from "./types/ServerlessProps";
export type {
  ServerlessProps,
  ServerlessServerProps,
  ServerlessClientProps,
} from "./types/ServerlessProps";

// Coolify Template utilities
export { fetchTemplate } from "./lib/template/template/fetch";
export { hydrateTemplate } from "./lib/template/template/hydrate";

// Re-export everything from aws-cdk-lib
export * as Cdk from "aws-cdk-lib";
