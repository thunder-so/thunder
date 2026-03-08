# Unified CDK Library PRD

## Project Overview

- [x] **DONE**: Merge the existing 7 CDK libraries into a single unified library: `@thunder-so/thunder`

**Source Libraries:**
- `@thunder-so/cdk-spa` -> `Static`
- `@thunder-so/cdk-functions` -> `Lambda`
- `@thunder-so/cdk-webservice` -> `Fargate` / `VPC`
- `@thunder-so/cdk-nuxt` -> `Nuxt`
- `@thunder-so/cdk-astro` -> `Astro`
- `@thunder-so/cdk-ec2` -> `EC2`
- `@thunder-so/cdk-coolify` -> `Template`

## Target Constructs

| Construct | Description | Base Pattern | Status |
|-----------|-------------|--------------|--------|
| `Static` | S3 + CloudFront for static SPAs | cdk-spa | **DONE** |
| `Lambda` | Lambda + API Gateway for serverless | cdk-functions | **DONE** |
| `Fargate` | ECS Fargate + ALB for containers | cdk-webservice | **DONE** |
| `EC2` | EC2 instance with Docker + Elastic IP | cdk-ec2 | **DONE** |
| `Nuxt` | Full-stack Nuxt.js (Lambda + S3 + CloudFront) | cdk-nuxt | **DONE** |
| `Astro` | Full-stack Astro SSR (with Edge fallback) | cdk-astro | **DONE** |
| `Template` | Coolify One-Click Service Template on EC2 | cdk-coolify | **DONE** |
| `VPC` | Shared VPC with public/private subnets | cdk-webservice | **DONE** |


## Future Extensibility

- [ ] **TODO**: The library should support additional Vite + Nitro-based frameworks:
    - TanStack Start
    - Angular AnalogJS
    - SvelteKit
    - React Router v7
    - SolidStart

Each framework construct will have preset configurations optimized for that framework.

## Architecture

- [x] **DONE**: Project structure implemented according to the defined architecture.

```
@thunder-so/thunder/
├── bin/
│   ├── static.ts                 # Context-driven SPA deployment
│   ├── lambda.ts                 # Context-driven Lambda deployment
│   ├── fargate.ts                # Context-driven Fargate deployment
│   ├── nuxt.ts                   # Context-driven Nuxt deployment
│   ├── ec2.ts                    # Context-driven EC2 deployment
│   ├── template.ts               # Context-driven Coolify deployment
│   └── astro.ts                  # Context-driven Astro deployment
├── lib/
│   ├── static/
│   │   ├── hosting.ts            # Static Hosting 
│   │   ├── pipeline.ts           # Static Pipeline 
│   │   └── deploy.ts             # Direct Deploy
│   ├── lambda/
│   │   ├── functions.ts          # Lambda function hosting 
│   │   └── pipeline.ts           # Lambda Pipeline 
│   ├── fargate/
│   │   ├── service.ts            # ECS Fargete service hosting 
│   │   └── pipeline.ts           # Fargate Pipeline 
│   ├── ec2/
│   │   ├── constructs/
│   │   │   ├── cloudwatch-agent.ts      # Cloudwatch agent config
│   │   │   ├── ec2-instance.ts          # Instance config
│   │   │   ├── user-data.ts             # User data config
│   │   ├── compute.ts                   # EC2 service hosting 
│   │   └── pipeline.ts                  # EC2 Pipeline 
│   ├── template/
│   │   ├── constructs/
│   │   │   ├── cloudwatch-agent.ts      # Cloudwatch agent config
│   │   │   ├── ec2-instance.ts          # Instance config
│   │   │   ├── user-data.ts             # User data config
│   │   ├── template/
│   │   │   ├── fetch.ts                 # Fetch coolify template
│   │   │   ├── hydrate.ts               # Hydrate configs
│   │   └── index.ts                     # TemplateConstruct
│   ├── nuxt/
│   │   ├── client.ts                    # Nuxt client hosting (S3 + CloudFront)
│   │   ├── server.ts                    # Nuxt server hosting (Lambda)
│   │   └── index.ts                     # NuxtConstruct
│   ├── astro/
│   │   ├── client.ts                    # Astro client hosting (S3 + CloudFront + Fallback)
│   │   └── index.ts                     # AstroConstruct
│   ├── constructs/
│   │   ├── vpc.ts                       # Shared VPC Construct
│   │   └── discovery.ts                 # SST-style Discovery Construct
│   └── utils/
│       ├── nixpacks.ts           # Nixpacks dockefile generator
│       ├── naming.ts             # Resource naming utilities
│       ├── paths.ts              # Path sanitization
│       └── vpc-link.ts           # VPC linking logic
├── stacks/
│   ├── StaticStack.ts
│   ├── LambdaStack.ts
│   ├── FargateStack.ts
│   ├── NuxtStack.ts
│   ├── AstroStack.ts
│   ├── Ec2Stack.ts
│   ├── TemplateStack.ts
│   └── VpcStack.ts
├── types/
│   ├── AppProps.ts
│   ├── CloudFrontProps.ts
│   ├── Ec2Props.ts
│   ├── FargateProps.ts
│   ├── LambdaProps.ts
│   ├── PipelineProps.ts
│   ├── StaticProps.ts
│   ├── TemplateProps.ts
│   ├── NuxtProps.ts
│   └── VpcProps.ts
├── index.ts                      # Main exports
└── package.json
```

## Shared Infrastructure Patterns

### VPC Link Pattern

- [x] **DONE**: All relevant constructs (Lambda, Fargate, EC2, Template) support a `link` pattern for VPC integration via `resolveVpc` utility and `IVpcLink` interface.

```typescript
// Explicit passing via props
const vpc = new VpcStack(this, 'MyVPC', { ... });

new FargateStack(this, 'MyService', {
  vpc: vpc,
  // ...
});
```

### Metadata Discovery (SST-style)

- [x] **DONE**: Each deployment stores its metadata in a centralized S3 bucket (`thunder-discovery-<account>-<region>`). 

Metadata includes:
- [x] App identity (application, service, environment)
- [x] Resource ARNs, IDs and URLs (Aligned with `CfnOutput` names)
- [x] Deployment timestamps
- [x] Framework-specific metadata
- [x] Route53 domain integration

## Common Features

- [x] **DONE**: **23-character resource prefix:** `${app.substring(0,7)}-${service.substring(0,7)}-${env.substring(0,7)}`
- [x] **DONE**: **Path sanitization:** Custom regex for unix directory paths
- [x] **DONE**: **Monorepo support:** CodeBuild path filters and rootDir/outputDir resolution
- [x] **DONE**: **Context directory support:** Takes source code from any path in the system
- [x] **DONE**: **Bun support:** Lambda layer integration
- [x] **DONE**: **Zero-downtime deployment:** S3 bucket deployment without pruning
- [x] **DONE**: **Framework Fallbacks:** Astro-specific Edge function for 404/403 redirection
