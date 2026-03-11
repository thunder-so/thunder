# thunder

<p>
    <a href="https://www.npmjs.com/package/@thunder-so/thunder"><img alt="Version" src="https://img.shields.io/npm/v/@thunder-so/thunder.svg" /></a>
    <a href="https://www.npmjs.com/package/@thunder-so/thunder"><img alt="License" src="https://img.shields.io/npm/l/@thunder-so/thunder.svg" /></a>
</p>

Build full-stack apps on your own AWS.

Thunder is a CDK library and CLI for deploying modern web applications on AWS. One library to rule them all: [Static SPAs](#static), [Lambda Functions](#lambda), [Containers on Fargate](#fargate) and [EC2](#ec2), and [Full-stack Frameworks](#full-stack-frameworks).

## Table of Contents

- [Features](#features)
- [Supported Frameworks & Patterns](#supported-frameworks--patterns)
- [Quick Start](#quick-start)
- [Stacks](#stacks)
  - [Static](#static) - S3 + CloudFront + Route53
  - [Lambda](#lambda) - API Gateway + Lambda
  - [Fargate](#fargate) - ECS Fargate + ALB + CloudFront
  - [EC2](#ec2) - EC2 + Docker + Elastic IP
  - [Nuxt](#nuxt) - Serverless full-stack with Lambda
  - [Astro](#astro) - Serverless full-stack SSR with Lambda
  - [Template](#template) - Coolify-style templates
- [CLI Commands](#cli-commands)
- [Documentation](#documentation)
- [License](#license)

## Features

- **Constructs:** One-line deployment for `Static`, `Lambda`, `Fargate`, `EC2`, `Nuxt`, and `Astro`.
- **Thunder CLI (`th`):** Context-aware CLI for initializing, deploying, and managing your infrastructure.
- **VPC Link Pattern:** Easily connect your compute resources to a shared VPC.
- **High-Performance Serving:** Pre-configured [CloudFront](https://aws.amazon.com/cloudfront/) distributions with OAC, security headers, and edge optimizations.
- **Built-in CI/CD:** Optional [AWS CodePipeline](https://aws.amazon.com/codepipeline/) integration with GitHub support.

## Supported Frameworks & Patterns

- **Static:** Vite (React, Vue, Svelte, Solid), Next.js (SSG), Astro (SSG), Gatsby.
- **Serverless:** Node.js Lambda, Bun, Container-based Lambda.
- **Containers:** [ECS Fargate](https://aws.amazon.com/fargate/) with ALB, Docker on [EC2](https://aws.amazon.com/ec2/) with Elastic IP.
- **Full-stack SSR:** [Nuxt.js](https://nuxt.com/), [Astro](https://astro.build/) (SSR), and extensibility for SvelteKit, TanStack Start, AnalogJS.

## Quick Start

### 1. Install

```bash
bun add @thunder-so/thunder --development
```

### 2. Initialize

```bash
npx th init
```

### 3. Configure

Create a stack file (e.g., `stack/dev.ts`):

```typescript
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

### 4. Deploy

```bash
npx cdk deploy --app "npx tsx stack/dev.ts" --profile default
```

## Stacks

### Static

Deploy static websites to [S3](https://aws.amazon.com/s3/) with [CloudFront](https://aws.amazon.com/cloudfront/) CDN and [Route53](https://aws.amazon.com/route53/) DNS.

**Best for:** Static sites, SPAs, JAMstack applications

**AWS Resources:**
- [S3 Bucket](https://aws.amazon.com/s3/) - Static file hosting
- [CloudFront Distribution](https://aws.amazon.com/cloudfront/) - Global CDN with caching
- [Route53](https://aws.amazon.com/route53/) - DNS management (optional)
- [ACM Certificate](https://aws.amazon.com/certificate-manager/) - SSL/TLS certificates (optional)
- [Lambda@Edge](https://aws.amazon.com/lambda/edge/) - Request/response manipulation (optional)

**Example:**
```typescript
import { Cdk, Static, type StaticProps } from '@thunder-so/thunder';

const config: StaticProps = {
  env: { account: '123456789012', region: 'us-east-1' },
  application: 'myapp',
  service: 'web',
  environment: 'prod',
  rootDir: '.',
  outputDir: 'dist',
  
  // Optional: Custom domain
  domain: 'example.com',
  globalCertificateArn: 'arn:aws:acm:us-east-1:...',
  hostedZoneId: 'Z123456789',
  
  // Optional: Lambda@Edge for redirects/headers/rewrites
  redirects: [{ source: '/old', destination: '/' }],
  rewrites: [{ source: '/old', destination: '/new' }],
  headers: [{ path: '/*', name: 'X-Custom-Header', value: 'value' }],
};

new Static(new Cdk.App(), 'myapp-web-prod-stack', config);
```

---

### Lambda

Deploy serverless functions with [API Gateway](https://aws.amazon.com/api-gateway/) and optional [Lambda Function URL](https://docs.aws.amazon.com/lambda/latest/dg/lambda-urls.html).

**Best for:** Serverless APIs, microservices, event-driven applications

**AWS Resources:**
- [Lambda Function](https://aws.amazon.com/lambda/) - Compute layer
- [API Gateway](https://aws.amazon.com/api-gateway/) - HTTP API with custom domain support
- [CloudWatch Logs](https://aws.amazon.com/cloudwatch/) - Logging and monitoring
- [Secrets Manager](https://aws.amazon.com/secrets-manager/) - Secure secret injection (optional)

**Example:**
```typescript
import { Cdk, Lambda, type LambdaProps } from '@thunder-so/thunder';

const config: LambdaProps = {
  env: { account: '123456789012', region: 'us-east-1' },
  application: 'myapp',
  service: 'api',
  environment: 'prod',
  rootDir: '.',
  
  functionProps: {
    runtime: Cdk.aws_lambda.Runtime.NODEJS_22_X,
    architecture: Cdk.aws_lambda.Architecture.ARM_64,
    codeDir: 'src',
    handler: 'index.handler',
    memorySize: 512,
    timeout: 30,
    url: true, // Enable function URL
    keepWarm: true, // Prevent cold starts
    variables: [{ NODE_ENV: 'production' }],
    secrets: [{ key: 'DATABASE_URL', resource: 'arn:aws:secretsmanager:...' }],
  },
  
  // Optional: Custom domain
  domain: 'api.example.com',
  regionalCertificateArn: 'arn:aws:acm:us-east-1:...',
  hostedZoneId: 'Z123456789',
};

new Lambda(new Cdk.App(), 'myapp-api-prod-stack', config);
```

---

### Fargate

Deploy containerized applications on [ECS Fargate](https://aws.amazon.com/fargate/) with Application Load Balancer and [CloudFront](https://aws.amazon.com/cloudfront/).

**Best for:** Containerized web applications, microservices, long-running processes

**AWS Resources:**
- [ECS Cluster](https://aws.amazon.com/ecs/) - Container orchestration
- [Fargate Task](https://aws.amazon.com/fargate/) - Serverless containers
- [Application Load Balancer](https://aws.amazon.com/elasticloadbalancing/) - Traffic distribution
- [ECR Repository](https://aws.amazon.com/ecr/) - Container registry (via CodePipeline)
- [CloudWatch Logs](https://aws.amazon.com/cloudwatch/) - Container logging

**Example:**
```typescript
import { Cdk, Fargate, type FargateProps } from '@thunder-so/thunder';

const config: FargateProps = {
  env: { account: '123456789012', region: 'us-east-1' },
  application: 'myapp',
  service: 'api',
  environment: 'prod',
  rootDir: '.',
  
  serviceProps: {
    architecture: Cdk.aws_ecs.CpuArchitecture.ARM64,
    desiredCount: 2,
    cpu: 512, // 0.5 vCPU
    memorySize: 1024, // 1 GB
    port: 3000,
    healthCheckPath: '/health',
    variables: [{ NODE_ENV: 'production' }],
    dockerFile: 'Dockerfile',
  },
  
  // Optional: Custom domain
  domain: 'api.example.com',
  globalCertificateArn: 'arn:aws:acm:us-east-1:...',
  hostedZoneId: 'Z123456789',
};

new Fargate(new Cdk.App(), 'myapp-api-prod-stack', config);
```

---

### EC2

Deploy Docker containers on [EC2](https://aws.amazon.com/ec2/) instances with Elastic IP for simple, cost-effective hosting.

**Best for:** Single-instance applications, development environments, simple Docker deployments

**AWS Resources:**
- [EC2 Instance](https://aws.amazon.com/ec2/) - Virtual server
- [Elastic IP](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/elastic-ip-addresses-eip.html) - Static public IP
- [VPC](https://aws.amazon.com/vpc/) - Network isolation
- [Security Group](https://docs.aws.amazon.com/vpc/latest/userguide/security-groups.html) - Firewall rules
- [Route53](https://aws.amazon.com/route53/) - DNS records (optional)

**Example:**
```typescript
import { Cdk, Ec2, type Ec2Props } from '@thunder-so/thunder';

const config: Ec2Props = {
  env: { account: '123456789012', region: 'us-east-1' },
  application: 'myapp',
  service: 'api',
  environment: 'prod',
  rootDir: '.',
  
  serviceProps: {
    instanceType: 't3.micro',
    port: 3000,
    authorizedKeys: ['ssh-rsa AAAAB3... user@example.com'],
    dockerFile: 'Dockerfile',
    variables: [{ NODE_ENV: 'production' }],
  },
  
  // Optional: Custom domain with SSL
  domain: 'api.example.com',
  hostedZoneId: 'Z123456789',
  acmeEmail: 'admin@example.com', // For Let's Encrypt
};

new Ec2(new Cdk.App(), 'myapp-api-prod-stack', config);
```

---

### Full-Stack Frameworks

#### Nuxt

Deploy [Nuxt.js](https://nuxt.com/) SSR applications with hybrid rendering - Lambda for server-side and S3 for static assets.

**Best for:** Vue-based full-stack applications with server-side rendering

**AWS Resources:**
- [Lambda Function](https://aws.amazon.com/lambda/) - SSR server
- [S3 Bucket](https://aws.amazon.com/s3/) - Static assets
- [CloudFront Distribution](https://aws.amazon.com/cloudfront/) - Unified CDN
- [API Gateway](https://aws.amazon.com/api-gateway/) - HTTP API

**Example:**
```typescript
import { Cdk, Nuxt, type NuxtProps } from '@thunder-so/thunder';

const config: NuxtProps = {
  env: { account: '123456789012', region: 'us-east-1' },
  application: 'myapp',
  service: 'web',
  environment: 'prod',
  rootDir: '.',
  
  serverProps: {
    runtime: Cdk.aws_lambda.Runtime.NODEJS_22_X,
    architecture: Cdk.aws_lambda.Architecture.ARM_64,
    memorySize: 1792,
    timeout: 10,
    keepWarm: true,
  },
  
  // Optional: Custom domain
  domain: 'example.com',
  globalCertificateArn: 'arn:aws:acm:us-east-1:...',
  hostedZoneId: 'Z123456789',
};

new Nuxt(new Cdk.App(), 'myapp-web-prod-stack', config);
```

---

#### Astro

Deploy [Astro](https://astro.build/) SSR applications with the same infrastructure pattern as Nuxt.

**Best for:** Content-focused websites with server-side rendering and islands architecture

**AWS Resources:** Same as [Nuxt](#nuxt)

**Example:**
```typescript
import { Cdk, Astro, type NuxtProps as AstroProps } from '@thunder-so/thunder';

const config: AstroProps = {
  env: { account: '123456789012', region: 'us-east-1' },
  application: 'myapp',
  service: 'web',
  environment: 'prod',
  rootDir: '.',
  
  serverProps: {
    runtime: Cdk.aws_lambda.Runtime.NODEJS_22_X,
    architecture: Cdk.aws_lambda.Architecture.ARM_64,
    memorySize: 1024,
  },
};

new Astro(new Cdk.App(), 'myapp-web-prod-stack', config);
```

---

### Template

Deploy [Coolify](https://coolify.io/)-style templates on EC2. Automatically fetches and hydrates Docker Compose templates from the [Coolify templates repository](https://github.com/coollabsio/coolify).

**Best for:** Self-hosted applications, databases, dev tools (e.g., n8n, WordPress, databases)

**AWS Resources:** Same as [EC2](#ec2)

**Example:**
```typescript
import { Cdk, Template, type TemplateProps, fetchTemplate, hydrateTemplate } from '@thunder-so/thunder';
import { InstanceType, InstanceClass, InstanceSize } from 'aws-cdk-lib/aws-ec2';

async function main() {
  // Fetch template from Coolify repository
  const { parsed: parsedTemplate, port } = await fetchTemplate('n8n');
  
  // Hydrate template with variables
  const hydrateResult = hydrateTemplate(parsedTemplate, {
    domain: 'n8n.example.com',
    fallbackPort: port,
  });
  
  const config: TemplateProps = {
    env: { account: '123456789012', region: 'us-east-1' },
    application: 'myapp',
    service: 'n8n',
    environment: 'prod',
    
    templateSlug: 'n8n',
    instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.MICRO),
    authorizedKeys: ['ssh-rsa AAAAB3... user@example.com'],
    hydrateResult,
    
    // Optional: Custom domain with SSL
    domain: 'n8n.example.com',
    hostedZoneId: 'Z123456789',
    acmeEmail: 'admin@example.com',
  };
  
  new Template(new Cdk.App(), 'myapp-n8n-prod-stack', config);
}

main();
```

**Available Templates:** See the [Coolify templates repository](https://github.com/coollabsio/coolify/tree/v4.x/templates/compose) for available templates.

---

## CLI Commands

| Command | Description |
| :--- | :--- |
| `th init` | Scaffold a new project or service |
| `th deploy` | Deploy stacks to AWS |
| `th destroy` | Remove resources from AWS |

## Documentation

For detailed documentation on each construct and advanced configurations, see the [Wiki](https://github.com/thunder-so/thunder/wiki).

## License

Apache-2.0
