# Thunder - CDK Library for AWS Deployments

## Executive Summary

Thunder (`@thunder-so/thunder`) is an AWS CDK library for deploying modern web applications. It provides opinionated, production-ready infrastructure patterns for one-line deployment of common web application architectures.

**One library to rule them all**: Static SPAs, Lambda Functions, Containers (Fargate/EC2), and Full-stack Frameworks (Nuxt/Astro).

---

## Project Overview

Thunder provides high-level abstractions over AWS CDK, enabling developers to deploy complete infrastructure stacks with minimal configuration. The library covers the full spectrum of web deployment patterns from static sites to full-stack serverless applications.

---

## Stacks

| Stack | Description | Use Cases | Status |
|-----------|-------------|-----------|--------|
| `Static` | S3 + CloudFront for static SPAs | React, Vue, Svelte, Next.js (SSG), Gatsby | **DONE** |
| `Lambda` | Lambda + API Gateway for serverless | API endpoints, background jobs, microservices | **DONE** |
| `Fargate` | ECS Fargate + ALB for containers | Long-running containers, microservices | **DONE** |
| `EC2` | EC2 instance with Docker + Elastic IP | Single containers, dev environments | **DONE** |
| `Template` | Coolify One-Click Service Template on EC2 | Pre-built apps (n8n, Plausible, etc.) | **DONE** |
| `Nuxt` | Full-stack Nuxt.js (Lambda + S3 + CloudFront) | SSR Nuxt applications | **DONE** |
| `Astro` | Full-stack Astro SSR (with Edge fallback) | SSR Astro applications | **DONE** |
| `VPC` | Shared VPC with public/private subnets | Shared networking infrastructure | **DONE** |

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

### 6. Nuxt Stack
**Purpose**: Full-stack Nuxt.js deployment
**Resources**: Lambda (SSR) + S3 (Assets) + CloudFront (Dual Origin) + API Gateway
**Key Features**:
- Nitro preset optimized for AWS Lambda
- Static assets served from S3
- SSR via Lambda function
- API routes support
- Unified CloudFront distribution

**Entry Point**: `bin/nuxt.ts`
**Stack File**: `stacks/NuxtStack.ts`
**Constructs**:
- `NuxtConstruct` (SSR server + client)
- `ServerConstruct` (Lambda SSR)
- `ClientConstruct` (S3 + CloudFront)
- `FrameworkPipeline` (CI/CD)

### 7. Astro Stack
**Purpose**: Full-stack Astro SSR deployment
**Resources**: Lambda (SSR) + S3 + CloudFront + Edge Function fallback
**Key Features**:
- Same architecture as Nuxt (Lambda + S3 + CloudFront)
- Lambda@Edge fallback for 404/403 handling
- Edge-optimized for global distribution
- Astro-specific optimizations

**Entry Point**: `bin/astro.ts`
**Stack File**: `stacks/AstroStack.ts`
**Constructs**:
- `AstroConstruct` (SSR server + client)
- `ClientConstruct` (S3 + CloudFront + Edge fallback)
- `FrameworkPipeline` (CI/CD)

### 8. VPC Stack
**Purpose**: Shared VPC infrastructure
**Resources**: VPC with public/private subnets, NAT gateways
**Key Features**:
- Shared networking for multiple services
- Implements IVpcLink interface
- Configurable CIDR, AZs, NAT gateways
- Can be linked to other stacks

**Entry Point**: `bin/vpc.ts`
**Stack File**: `stacks/VpcStack.ts`
**Constructs**:
- `VPC` (shared VPC construct)

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
│   └── vpc.ts                    # VPC deployment
│
├── cli/                          # Thunder CLI
│   ├── th.mjs                    # Main CLI entry
│   ├── th-init.mjs               # Init command
│   ├── th-deploy.mjs             # Deploy command
│   └── th-destroy.mjs            # Destroy command
│
├── lib/                          # CDK constructs
│   ├── astro/                    # Astro framework support
│   │   ├── index.ts              # AstroConstruct
│   │   └── client.ts             # Astro client (S3 + CloudFront + Edge)
│   │
│   ├── constructs/               # Shared constructs
│   │   ├── vpc.ts                # VPC construct
│   │   └── discovery.ts          # SST-style metadata discovery
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
│   ├── frameworks/               # Framework pipeline
│   │   └── pipeline.ts           # Shared framework CI/CD
│   │
│   ├── lambda/                   # Lambda implementation
│   │   ├── functions.ts          # Lambda + API Gateway
│   │   └── pipeline.ts           # Lambda pipeline
│   │
│   ├── nuxt/                     # Nuxt implementation
│   │   ├── index.ts              # NuxtConstruct
│   │   ├── server.ts             # Nuxt server (Lambda)
│   │   └── client.ts             # Nuxt client (S3 + CloudFront)
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
│       └── vpc-link.ts           # VPC linking
│
├── stacks/                       # Stack definitions
│   ├── StaticStack.ts
│   ├── LambdaStack.ts
│   ├── FargateStack.ts
│   ├── Ec2Stack.ts
│   ├── TemplateStack.ts
│   ├── NuxtStack.ts
│   ├── AstroStack.ts
│   └── VpcStack.ts
│
├── types/                        # TypeScript interfaces
│   ├── AppProps.ts               # Base props
│   ├── StaticProps.ts
│   ├── LambdaProps.ts
│   ├── FargateProps.ts
│   ├── Ec2Props.ts
│   ├── TemplateProps.ts
│   ├── NuxtProps.ts
│   ├── VpcProps.ts
│   ├── CloudFrontProps.ts
│   └── PipelineProps.ts
│
├── .agents/                      # Documentation
│   ├── PRD.md                    # This file
│   ├── CLI.md                    # CLI scope
│   ├── SKILLS.md                 # Claude skills plan
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

## Thunder CLI

**Location**: `cli/th.mjs`

The Thunder CLI provides context-aware infrastructure management:

### Commands

| Command | Description | Status |
|---------|-------------|--------|
| `th init` | Scaffold new project/service | [ ] **TODO** |
| `th deploy` | Deploy stacks to AWS | [ ] **TODO** |
| `th destroy` | Remove resources from AWS | [ ] **TODO** |

### CLI Architecture
- **Runtime**: Node.js
- **Core Libraries**: `commander`, `inquirer`, `chalk`, `ora`, `shelljs`
- **Context Resolution**: Reads `bin/*.ts` files
- **Environment**: Injects CDK context via environment variables

### Context Resolution
1. CLI scans `bin/` directory for stack entry points
2. Executes via `ts-node` or `tsx`
3. Injects context: app, env, service, account, region
4. Delegates to CDK for actual deployment

**Status**: Basic CLI structure done, full implementation pending

---

## CLI Mandates

1. **Context-Awareness**: [x] **DONE** - Auto-detects environment from repository
2. **Zero-Config Defaults**: [x] **DONE** - Sensible defaults for AWS regions, accounts, resource sizing
3. **Local Dev Parity**: [ ] **TODO** - Local development loop (future scope)
4. **SST-Style Metadata**: [x] **DONE** - Discovery bucket for deployment state

---

## Future Extensibility

### Framework Support

The library should support additional Vite + Nitro-based frameworks:
- [ ] TanStack Start
- [ ] Angular AnalogJS
- [ ] SvelteKit
- [ ] React Router v7
- [ ] SolidStart

Each framework construct will have preset configurations optimized for that framework.

### Console UI

Future scope: SST-style Console UI for:
- Resource visualization
- Log streaming
- Real-time monitoring
- Deployment history

**Prerequisite**: Metadata Discovery system (already implemented)

---

## Status Overview

| Feature | Status | Notes |
|---------|--------|-------|
| **Static Stack** | [x] **DONE** | Production-ready |
| **Lambda Stack** | [x] **DONE** | Production-ready |
| **Fargate Stack** | [x] **DONE** | Production-ready |
| **EC2 Stack** | [x] **DONE** | Production-ready |
| **Template Stack** | [x] **DONE** | Production-ready |
| **Nuxt Stack** | [x] **DONE** | Production-ready |
| **Astro Stack** | [x] **DONE** | Production-ready |
| **VPC Stack** | [x] **DONE** | Production-ready |
| **VPC Link Pattern** | [x] **DONE** | All compute stacks |
| **Monorepo Support** | [x] **DONE** | Path filters, rootDir |
| **Nixpacks Integration** | [x] **DONE** | Auto Dockerfile gen |
| **Metadata Discovery** | [x] **DONE** | SST-style in S3 |
| **CI/CD Pipelines** | [x] **DONE** | CodePipeline + GitHub |
| **Bun Support** | [x] **DONE** | Lambda layer |
| **CLI Framework** | [x] **DONE** | Basic structure |
| **th init Command** | [ ] **TODO** | Scaffold projects |
| **th deploy Command** | [ ] **TODO** | Deploy stacks |
| **th destroy Command** | [ ] **TODO** | Remove resources |
| **Console UI** | [ ] **TODO** | Future scope |
| **Additional Frameworks** | [ ] **TODO** | TanStack, SvelteKit, etc. |
| **Claude Skills** | [ ] **TODO** | See SKILLS.md |

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
- **Astro**: Content-focused websites with SSR
- **Extensible**: TanStack Start, SvelteKit, AnalogJS (planned)

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
import { Cdk, Static, type StaticProps } from '@thunder-so/thunder';

const myApp: StaticProps = {
  env: { 
    account: '123456789012', 
    region: 'us-east-1' 
  },
  application: 'myapp',
  service: 'web',
  environment: 'prod',
  rootDir: '.',
  outputDir: 'dist',
};

new Static(
  new Cdk.App(),
  `${myApp.application}-${myApp.service}-${myApp.environment}-stack`,
  myApp
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
- **SKILLS.md**: Claude Code skills implementation plan
- **METADATA.md**: Discovery/metadata mechanism details

---

## License

Apache-2.0

---

**Last Updated**: 2026-03-08
**Status**: Production-ready stacks, CLI implementation in progress
