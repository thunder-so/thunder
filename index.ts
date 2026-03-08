// Stacks
export { Static } from './stacks/StaticStack';
export { Lambda } from './stacks/LambdaStack';
export { Fargate } from './stacks/FargateStack';
export { Ec2 } from './stacks/Ec2Stack';
export { Template } from './stacks/TemplateStack';
export { Nuxt } from './stacks/NuxtStack';
export { Astro } from './stacks/AstroStack';
export { Vpc } from './stacks/VpcStack';

// Types
export type { StaticProps } from './types/StaticProps';
export type { LambdaProps } from './types/LambdaProps';
export type { FargateProps } from './types/FargateProps';
export type { Ec2Props } from './types/Ec2Props';
export type { TemplateProps } from './types/TemplateProps';
export type { NuxtProps } from './types/NuxtProps';
export type { NuxtProps as AstroProps } from './types/NuxtProps';

// Re-export everything from aws-cdk-lib
export * as Cdk from 'aws-cdk-lib';