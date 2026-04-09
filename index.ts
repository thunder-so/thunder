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
export * from "./types";

// Coolify Template utilities
export { fetchTemplate } from "./lib/template/template/fetch";
export { hydrateTemplate } from "./lib/template/template/hydrate";

// Re-export everything from aws-cdk-lib
export * as Cdk from "aws-cdk-lib";
