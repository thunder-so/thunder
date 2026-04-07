# Thunder - CDK Library for AWS Deployments

## Summary

Thunder (`@thunder-so/thunder`) is an AWS CDK library for deploying modern web applications. It provides opinionated, production-ready infrastructure patterns for one-line deployment of common web application architectures.

**One library to rule them all**: Static SPAs, Lambda Functions, Containers (Fargate/EC2), and Full-stack Frameworks.

---

## Project Overview

Thunder provides high-level abstractions over AWS CDK, enabling developers to deploy complete infrastructure stacks with minimal configuration. The library covers the full spectrum of web deployment patterns from static sites to full-stack serverless applications.

---

## Stacks

| Stack                                                                        | Description                                              | Use Cases                                     | Status   |
| ---------------------------------------------------------------------------- | -------------------------------------------------------- | --------------------------------------------- | -------- |
| `Static`                                                                     | S3 + CloudFront for static SPAs                          | React, Vue, Svelte, Next.js (SSG), Gatsby     | **DONE** |
| `Lambda`                                                                     | Lambda + API Gateway for serverless                      | API endpoints, background jobs, microservices | **DONE** |
| `Fargate`                                                                    | ECS Fargate + ALB for containers                         | Long-running containers, microservices        | **DONE** |
| `EC2`                                                                        | EC2 instance with Docker + Elastic IP                    | Single containers, dev environments           | **DONE** |
| `Template`                                                                   | Coolify One-Click Service Template on EC2                | Pre-built apps (n8n, Plausible, etc.)         | **DONE** |
| `Serverless`                                                                 | Unified full-stack serverless (Lambda + S3 + CloudFront) | SSR meta-frameworks                           | **DONE** |
| `Nuxt` / `Astro` / `TanStackStart` / `SvelteKit` / `SolidStart` / `AnalogJS` | Framework-specific wrappers over `Serverless`            | SSR applications per framework                | **DONE** |
| `Vpc`                                                                        | Shared VPC with public/private subnets                   | Shared networking infrastructure              | **DONE** |

---

## Stack Details

### 1. Static Stack

**Purpose**: Static SPA hosting
**Resources**: S3 + CloudFront (OAC) + Route53 + Lambda@Edge
**Key Features**:

- Zero-downtime deployment without bucket pruning
- Origin Access Control (OAC) for secure S3 access
- Lambda@Edge for redirects/rewrites
- Custom security headers policy
- CI/CD pipeline support

**Entry Point**: `bin/static.ts`
**Stack File**: `stacks/StaticStack.ts`
**Constructs**:

- `HostingConstruct` (S3 + CloudFront + Route53)
- `DeployConstruct` (direct local deployment)
- `PipelineConstruct` (CodePipeline CI/CD)

### 2. Lambda Stack

**Purpose**: Serverless functions
**Resources**: Lambda (Zip or Container) + API Gateway v2 + ECR + Route53
**Key Features**:

- Bun runtime support via Lambda Layer
- Keep-warm scheduling (EventBridge)
- Provisioned concurrency support
- X-Ray tracing
- VPC integration

**Entry Point**: `bin/lambda.ts`
**Stack File**: `stacks/LambdaStack.ts`
**Constructs**:

- `FunctionsConstruct` (Lambda + API Gateway)
- `PipelineConstruct` (ECR-based CI/CD)

### 3. Fargate Stack

**Purpose**: Container orchestration
**Resources**: ECS Fargate + ALB + VPC + ECR + Route53
**Key Features**:

- ARM64 or X86_64 architecture support
- Auto-scaling capabilities
- Health checks with customizable paths
- Circuit breaker deployments
- Nixpacks integration for Dockerfile generation
- Rolling updates

**Entry Point**: `bin/fargate.ts`
**Stack File**: `stacks/FargateStack.ts`
**Constructs**:

- `ServiceConstruct` (ECS service + ALB + VPC)
- `PipelineConstruct` (ECR-based CI/CD)

### 4. EC2 Stack

**Purpose**: Single EC2 container hosting
**Resources**: EC2 + Elastic IP + Route53 + CloudWatch Agent
**Key Features**:

- Docker-on-EC2 deployment
- Elastic IP assignment
- Let's Encrypt SSL (via acmeEmail)
- SSH access with authorized keys
- CloudWatch monitoring
- Nixpacks support

**Entry Point**: `bin/ec2.ts`
**Stack File**: `stacks/Ec2Stack.ts`
**Constructs**:

- `ComputeConstruct` (EC2 instance + Docker)
- `PipelineConstruct` (CI/CD)
- `Ec2Instance` (instance provisioning)
- `UserData` (EC2 bootstrap scripts)
- `CloudwatchAgent` (monitoring)

### 5. Template Stack

**Purpose**: Coolify one-click templates
**Resources**: EC2 + Docker Compose + Traefik
**Key Features**:

- Fetches templates from Coolify GitHub repo
- Hydrates SERVICE_FQDN, SERVICE_PASSWORD variables
- Traefik reverse proxy with Let's Encrypt
- Multi-service Docker Compose support

**Entry Point**: `bin/template.ts`
**Stack File**: `stacks/TemplateStack.ts`
**Constructs**:

- `TemplateConstruct` (template deployment)
- `TemplateFetcher` (fetches from GitHub)
- `TemplateHydrator` (variable substitution)

### 6. Serverless Stack (Unified Full-Stack)

**Purpose**: Full-stack SSR deployment for meta-frameworks
**Resources**: Lambda (SSR) + S3 (static assets) + CloudFront (dual origin) + API Gateway
**Key Features**:

- Single unified stack for all SSR meta-frameworks
- Framework-specific configs via `FRAMEWORK_CONFIGS` (server dir, client dir, handler, nitro preset)
- Optional Lambda@Edge fallback for 404/403 (Astro only, `requiresFallbackEdge: true`)
- CI/CD pipeline support
- All framework-specific exports (`Nuxt`, `Astro`, `TanStackStart`, `SvelteKit`, `SolidStart`, `AnalogJS`) are thin wrappers over `ServerlessStack`

**Entry Points**: `bin/nuxt.ts`, `bin/astro.ts`, `bin/tanstack-start.ts`, `bin/sveltekit.ts`, `bin/solid-start.ts`, `bin/analogjs.ts`
**Stack File**: `stacks/ServerlessStack.ts`
**Constructs**:

- `ServerlessServer` (`lib/serverless/server.ts`) — Lambda + API Gateway
- `ServerlessClient` (`lib/serverless/client.ts`) — S3 + CloudFront
- `ServerlessPipeline` (`lib/serverless/pipeline.ts`) — CodePipeline CI/CD
- `MetadataConstruct` — deployment state tracking

**Framework Configs** (`lib/utils/framework-config.ts`):
| Framework | Server Dir | Client Dir | Handler | Edge Fallback |
|-----------|-----------|-----------|---------|---------------|
| `nuxt` | `.output/server` | `.output/public` | `index.handler` | No |
| `astro` | `dist/lambda` | `dist/client` | `entry.handler` | Yes |
| `tanstack-start` | `.output/server` | `.output/public` | `index.handler` | No |
| `sveltekit` | `build` | `build/client` | `index.handler` | No |
| `solid-start` | `.output/server` | `.output/public` | `index.handler` | No |
| `analogjs` | `dist/analog/server` | `dist/analog/public` | `index.handler` | No |

### 7. VPC Stack

**Purpose**: Shared VPC infrastructure
**Resources**: VPC with public/private subnets, NAT gateways
**Key Features**:

- Shared networking for multiple services
- Implements IVpcLink interface
- Configurable CIDR, AZs, NAT gateways
- Can be linked to other stacks

**Stack File**: `stacks/VpcStack.ts`
**Constructs**:

- `VPC` (`lib/constructs/vpc.ts`)

---

## Architecture

### Project Structure

```
@thunder-so/thunder/
├── bin/                          # CDK entry points
│   ├── static.ts                 # Static SPA deployment
│   ├── lambda.ts                 # Lambda deployment
│   ├── fargate.ts                # Fargate deployment
│   ├── ec2.ts                    # EC2 deployment
│   ├── template.ts               # Coolify template deployment
│   ├── nuxt.ts                   # Nuxt deployment
│   ├── astro.ts                  # Astro deployment
│   ├── tanstack-start.ts         # TanStack Start deployment
│   ├── sveltekit.ts              # SvelteKit deployment
│   ├── solid-start.ts            # Solid Start deployment
│   ├── analogjs.ts               # AnalogJS deployment
│   └── utils.ts                  # Shared bin utilities
│
├── cli/                          # Thunder CLI
│   └── th.mjs                    # Main CLI entry
│
├── lib/                          # CDK constructs
│   ├── constructs/               # Shared constructs
│   │   ├── vpc.ts                # VPC construct
│   │   ├── metadata.ts           # SST-style metadata discovery
│   │   └── events.ts             # EventBridge pipeline events
│   │
│   ├── ec2/                      # EC2 implementation
│   │   ├── compute.ts            # EC2 compute
│   │   ├── pipeline.ts           # EC2 pipeline
│   │   └── constructs/
│   │       ├── cloudwatch-agent.ts
│   │       ├── ec2-instance.ts
│   │       └── user-data.ts
│   │
│   ├── fargate/                  # Fargate implementation
│   │   ├── service.ts            # ECS Fargate service
│   │   └── pipeline.ts           # Fargate pipeline
│   │
│   ├── lambda/                   # Lambda implementation
│   │   ├── functions.ts          # Lambda + API Gateway
│   │   └── pipeline.ts           # Lambda pipeline
│   │
│   ├── serverless/               # Unified SSR framework implementation
│   │   ├── index.ts              # Re-exports all framework stacks + constructs
│   │   ├── server.ts             # ServerlessServer (Lambda + API Gateway)
│   │   ├── client.ts             # ServerlessClient (S3 + CloudFront)
│   │   ├── pipeline.ts           # ServerlessPipeline (CodePipeline CI/CD)
│   │   └── frameworks/           # Framework-specific thin wrappers
│   │       ├── index.ts          # Exports all framework stacks
│   │       ├── nuxt.ts           # Nuxt → ServerlessStack
│   │       ├── astro.ts          # Astro → ServerlessStack
│   │       ├── tanstack-start.ts # TanStack Start → ServerlessStack
│   │       ├── sveltekit.ts      # SvelteKit → ServerlessStack
│   │       ├── solid-start.ts    # Solid Start → ServerlessStack
│   │       └── analogjs.ts       # AnalogJS → ServerlessStack
│   │
│   ├── static/                   # Static implementation
│   │   ├── hosting.ts            # S3 + CloudFront + Route53
│   │   ├── pipeline.ts           # Static CI/CD
│   │   └── deploy.ts             # Direct S3 deployment
│   │
│   ├── template/                 # Coolify template implementation
│   │   ├── index.ts              # TemplateConstruct
│   │   ├── template/
│   │   │   ├── fetch.ts          # Fetch from GitHub
│   │   │   └── hydrate.ts        # Variable hydration
│   │   └── constructs/
│   │       ├── cloudwatch-agent.ts
│   │       ├── ec2-instance.ts
│   │       └── user-data.ts
│   │
│   └── utils/                    # Shared utilities
│       ├── index.ts              # Main exports
│       ├── naming.ts             # Resource naming
│       ├── paths.ts              # Path sanitization
│       ├── nixpacks.ts           # Nixpacks integration
│       ├── vpc.ts                # VPC linking
│       └── framework-config.ts   # Framework presets + mergePropsWithDefaults
│
├── stacks/                       # Stack definitions
│   ├── StaticStack.ts
│   ├── LambdaStack.ts
│   ├── FargateStack.ts
│   ├── Ec2Stack.ts
│   ├── TemplateStack.ts
│   ├── ServerlessStack.ts        # Unified SSR stack (replaces NuxtStack/AstroStack)
│   └── VpcStack.ts
│
├── types/                        # TypeScript interfaces
│   ├── AppProps.ts               # Base props
│   ├── StaticProps.ts
│   ├── LambdaProps.ts
│   ├── FargateProps.ts
│   ├── Ec2Props.ts
│   ├── TemplateProps.ts
│   ├── ServerlessProps.ts        # Unified SSR props (aliased as NuxtProps, AstroProps, etc.)
│   ├── VpcProps.ts
│   ├── CloudFrontProps.ts
│   └── PipelineProps.ts
│
├── scripts/                      # Build/install scripts
│   └── postinstall.js
│
├── runtime/                      # Lambda runtime assets
│   └── Dockerfile
│
├── .agents/                      # Documentation
│   ├── PRD.md                    # This file
│   ├── CLI.md                    # CLI scope
│   ├── SERVERLESS.md             # Serverless/SSR architecture details
│   └── METADATA.md               # Discovery mechanism
│
├── index.ts                      # Main exports
└── package.json
```

---

## Shared Infrastructure Patterns

### VPC Link Pattern

All compute stacks (Lambda, Fargate, EC2, Template) support a `link` pattern for VPC integration:

- Implemented via `resolveVpc()` utility
- Accepts `IVpc` directly or `IVpcLink` implementing construct
- Provides consistent VPC connectivity across stacks

```typescript
// Explicit VPC passing
const vpc = new VpcStack(this, 'MyVPC', { ... });

new FargateStack(this, 'MyService', {
  vpc: vpc,
  // ...
});

// Via link property
new FargateStack(this, 'MyService', {
  link: vpc,  // IVpcLink interface
  // ...
});
```

### Resource Naming

**Pattern**: 23-character prefix ensuring uniqueness and AWS name limits

- **Format**: `${app.substring(0,7)}-${service.substring(0,7)}-${env.substring(0,7)}`
- **Utility**: `getResourceIdPrefix()` in `lib/utils/naming.ts`
- **Example**: `myapp-t-web-dev` (app="myapplication", service="webfrontend", env="development")

### Path Sanitization

**Purpose**: Ensure valid Unix directory paths for Docker builds and deployments

- **Utility**: `sanitizePath()` in `lib/utils/paths.ts`
- **Regex**: Removes invalid characters, normalizes slashes
- **Use Case**: User-provided rootDir/outputDir sanitization

---

## Common Features Across Stacks

### 1. Monorepo Support

- **Path-based filters** in CodeBuild webhooks
- **rootDir/outputDir** resolution for monorepo packages
- **Context directory** support for taking source from any path

### 2. CI/CD Pipeline Integration

Optional AWS CodePipeline with GitHub support:

- Triggered by `accessTokenSecretArn` + `sourceProps` + `buildProps`
- Path-based filtering for monorepos
- ECR integration for container stacks
- S3 deployment for static stacks

### 3. Nixpacks Integration

Automatic Dockerfile generation:

- **Utility**: `generateNixpacksDockerfile()` in `lib/utils/nixpacks.ts`
- **Supported**: Fargate, EC2, Template stacks
- **Build system**: Detects language and generates optimized Dockerfile

### 4. Framework Fallbacks

Astro-specific Edge function for 404/403 handling:

- Implemented in `lib/astro/client.ts`
- CloudFront origin failover to S3 for SPA routing

### 5. Bun Support

Bun runtime for Lambda:

- Lambda Layer integration
- Custom runtime configuration for CodeBuild

---

## Status Overview

| Feature                                                         | Status       | Notes                                              |
| --------------------------------------------------------------- | ------------ | -------------------------------------------------- |
| **Static Stack**                                                | [x] **DONE** | Production-ready                                   |
| **Lambda Stack**                                                | [x] **DONE** | Production-ready                                   |
| **Fargate Stack**                                               | [x] **DONE** | Production-ready                                   |
| **EC2 Stack**                                                   | [x] **DONE** | Production-ready                                   |
| **Template Stack**                                              | [x] **DONE** | Production-ready                                   |
| **Serverless Stack**                                            | [x] **DONE** | Unified SSR stack for all meta-frameworks          |
| **Nuxt / Astro / TanStack / SvelteKit / SolidStart / AnalogJS** | [x] **DONE** | Framework wrappers over ServerlessStack            |
| **VPC Stack**                                                   | [x] **DONE** | Production-ready                                   |
| **VPC Link Pattern**                                            | [x] **DONE** | All compute stacks                                 |
| **Monorepo Support**                                            | [x] **DONE** | Path filters, rootDir                              |
| **Nixpacks Integration**                                        | [x] **DONE** | Auto Dockerfile gen                                |
| **Metadata Discovery**                                          | [x] **DONE** | SST-style in S3 (metadata.json + context.json)     |
| **CI/CD Pipelines**                                             | [x] **DONE** | CodePipeline + GitHub                              |
| **Bun Support**                                                 | [x] **DONE** | Lambda layer                                       |
| **EventBridge Pipeline Events**                                 | [x] **DONE** | EventsConstruct for cross-account event forwarding |
| **CLI Framework**                                               | [x] **DONE** | Basic structure                                    |

---

## Supported Frameworks & Patterns

### Static Sites

- **Vite-based**: React, Vue, Svelte, Solid
- **Next.js**: Static Site Generation (SSG)
- **Astro**: Static Site Generation
- **Gatsby**: Static site generator
- **Other**: Any framework outputting to a directory

### Serverless

- **Node.js**: Lambda functions
- **Bun**: Via Lambda Layer
- **Containers**: Container-based Lambda
- **Runtimes**: Node.js 18.x, 20.x

### Containers

- **ECS Fargate**: Serverless containers with ALB
- **EC2 Docker**: Single-container on EC2
- **Architectures**: ARM64, X86_64
- **Orchestration**: Supports docker-compose (Template)

### Full-Stack SSR

- **Nuxt.js**: Universal Vue applications
- **Astro**: Content-focused websites with SSR (Lambda@Edge fallback)
- **TanStack Start**: Type-safe full-stack React
- **SvelteKit**: Svelte full-stack framework
- **Solid Start**: SolidJS full-stack framework
- **AnalogJS**: Angular full-stack framework
- **Extensible**: Any Nitro/Vite-based framework via generic `Serverless` construct

---

## Key Design Principles

1. **One-Line Deployment**: Minimal configuration for common patterns
2. **Convention over Configuration**: Sensible defaults, customization when needed
3. **Framework Agnostic**: Works with any framework, optimized for popular ones
4. **Production Ready**: Security, monitoring, CI/CD included
5. **Cost Optimized**: Uses most cost-effective AWS services for each pattern
6. **Developer Experience**: Fast feedback loops, clear errors, helpful defaults
7. **Composable**: Stacks can be combined for complex architectures

---

## Quick Start

### Installation

```bash
bun add @thunder-so/thunder -d
```

### Basic Usage

```typescript
// stack/dev.ts
import { Cdk, Static, type StaticProps } from "@thunder-so/thunder";

const myApp: StaticProps = {
  env: {
    account: "123456789012",
    region: "us-east-1",
  },
  application: "myapp",
  service: "web",
  environment: "prod",
  rootDir: ".",
  outputDir: "dist",
};

new Static(
  new Cdk.App(),
  `${myApp.application}-${myApp.service}-${myApp.environment}-stack`,
  myApp,
);
```

### Deployment

```bash
npx cdk deploy --app "npx tsx stack/dev.ts" --profile default
```

---

## Documentation

- **This PRD**: Project overview and architecture
- **CLI.md**: CLI command reference and scope
- **SERVERLESS.md**: Serverless/SSR architecture details
- **METADATA.md**: Discovery/metadata mechanism details

---

## License

Apache-2.0

---

**Last Updated**: 2026-04-03
**Status**: Production-ready stacks, CLI implementation in progress
