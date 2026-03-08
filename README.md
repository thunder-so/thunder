# @thunder-so/thunder

<p>
    <a href="https://www.npmjs.com/package/@thunder-so/thunder"><img alt="Version" src="https://img.shields.io/npm/v/@thunder-so/thunder.svg" /></a>
    <a href="https://www.npmjs.com/package/@thunder-so/thunder"><img alt="License" src="https://img.shields.io/npm/l/@thunder-so/thunder.svg" /></a>
</p>

The unified AWS CDK library and CLI for deploying modern web applications. One library to rule them all: Static SPAs, Serverless Functions, Containers, and Full-stack Frameworks.

## Features

- **Unified Constructs:** One-line deployment for `Static`, `Lambda`, `Fargate`, `EC2`, `Nuxt`, and `Astro`.
- **Thunder CLI (`th`):** Context-aware CLI for initializing, deploying, and managing your infrastructure.
- **VPC Link Pattern:** Easily connect your compute resources to a shared VPC.
- **SST-style Discovery:** Automatic metadata storage in S3 for resource discovery and console integration.
- **High-Performance Serving:** Pre-configured CloudFront distributions with OAC, security headers, and edge optimizations.
- **Built-in CI/CD:** Optional AWS CodePipeline integration with GitHub support.

## Supported Frameworks & Patterns

- **Static:** Vite (React, Vue, Svelte, Solid), Next.js (SSG), Astro (SSG), Gatsby.
- **Serverless:** Node.js Lambda, Bun (via Layer), Container-based Lambda.
- **Containers:** ECS Fargate with ALB, Docker on EC2 with Elastic IP.
- **Full-stack SSR:** Nuxt.js, Astro (SSR), and extensibility for SvelteKit, TanStack Start, AnalogJS.

## Quick Start

### 1. Install

```bash
npm install @thunder-so/thunder aws-cdk-lib constructs --save-dev
```

### 2. Initialize

```bash
npx th init
```

### 3. Configure

```typescript
// bin/nuxt.ts
import { App } from 'aws-cdk-lib';
import { NuxtStack } from '@thunder-so/thunder';

const app = new App();

new NuxtStack(app, 'MyNuxtApp', {
  application: 'myapp',
  service: 'web',
  environment: 'prod',
  env: { account: '123456789012', region: 'us-east-1' },
  serverProps: {
    codeDir: './.output/server',
    memorySize: 1024,
    keepWarm: true,
  },
  buildProps: {
    outputDir: './.output/public',
  },
  domain: 'app.example.com',
  hostedZoneId: 'Z123456789',
  globalCertificateArn: 'arn:aws:acm:us-east-1:...',
  regionalCertificateArn: 'arn:aws:acm:us-east-1:...',
});
```

### 4. Deploy

```bash
npx th deploy --stage prod
```

## CLI Commands

| Command | Description |
| :--- | :--- |
| `th init` | Scaffold a new project or service |
| `th dev` | Local development with hotswap (Alpha) |
| `th deploy` | Deploy stacks to AWS |
| `th destroy` | Remove resources from AWS |
| `th secrets` | Manage SSM/Secrets Manager secrets |

## Documentation

For detailed documentation on each construct and advanced configurations, see the [Wiki](https://github.com/thunder-so/thunder/wiki).

## License

Apache-2.0
