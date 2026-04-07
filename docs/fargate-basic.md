# Deploy Containerized Apps to AWS ECS Fargate

Run any Docker container as a production web service on [AWS ECS Fargate](https://aws.amazon.com/fargate/) - serverless containers with an [Application Load Balancer](https://aws.amazon.com/elasticloadbalancing/application-load-balancer/) in front. No EC2 instances, no cluster management, and automatic health checks and restarts.

Works with any language or framework you can containerize: Next.js, Express, NestJS, Django, Rails, Go, Rust, and more.

## AWS Resources

| Resource                                                                  | Purpose                                                   |
| ------------------------------------------------------------------------- | --------------------------------------------------------- |
| [ECS Cluster](https://aws.amazon.com/ecs/)                                | Container orchestration                                   |
| [Fargate Task](https://aws.amazon.com/fargate/)                           | Serverless container runtime                              |
| [Application Load Balancer](https://aws.amazon.com/elasticloadbalancing/) | Public HTTP/HTTPS endpoint, health checks                 |
| [VPC](https://aws.amazon.com/vpc/)                                        | Network isolation (created automatically if not provided) |
| [CloudWatch Logs](https://aws.amazon.com/cloudwatch/)                     | Container logs, retained for 1 week                       |
| [ACM Certificate](https://aws.amazon.com/certificate-manager/)            | SSL for custom domain (optional)                          |
| [Route53](https://aws.amazon.com/route53/)                                | DNS A record (optional)                                   |

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) installed and running locally
- [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html) configured
- [AWS CDK](https://docs.aws.amazon.com/cdk/v2/guide/getting_started.html) bootstrapped:
  ```bash
  cdk bootstrap aws://YOUR_ACCOUNT_ID/us-east-1
  ```

## Installation

```bash
bun add @thunder-so/thunder --development
# or
npm install @thunder-so/thunder --save-dev
```

## Dockerfile

Your app needs a `Dockerfile`. Here's a production-ready example for a Node.js app:

```dockerfile
# Dockerfile

# Build stage
FROM public.ecr.aws/docker/library/node:22-alpine AS builder
WORKDIR /app
COPY . .
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm install
RUN pnpm run build

# Production stage
FROM public.ecr.aws/docker/library/node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY --from=builder /app/ ./
EXPOSE 3000
CMD ["pnpm", "start"]
```

Add a `.dockerignore` to keep the build context lean:

```
.git
node_modules
cdk.out
stack
.DS_Store
```

## Stack File

```typescript
import { Cdk, Fargate, type FargateProps } from "@thunder-so/thunder";

const config: FargateProps = {
  env: {
    account: "123456789012",
    region: "us-east-1",
  },
  application: "myapp",
  service: "api",
  environment: "dev",

  rootDir: ".",

  serviceProps: {
    dockerFile: "Dockerfile",
    architecture: Cdk.aws_ecs.CpuArchitecture.ARM64,
    cpu: 256, // 0.25 vCPU
    memorySize: 512, // 512 MB
    port: 3000,
    desiredCount: 1,
    healthCheckPath: "/health",
  },
};

new Fargate(
  new Cdk.App(),
  `${config.application}-${config.service}-${config.environment}-stack`,
  config,
);
```

## Deploy

```bash
npx cdk deploy --app "npx tsx stack/dev.ts" --profile default
```

CDK builds your Docker image, pushes it to ECR, and deploys the service. The ALB DNS name is output:

```
Outputs:
myapp-api-dev-stack.LoadBalancerDNS = myapp-api-dev-1234567890.us-east-1.elb.amazonaws.com
```

## Custom Domain with HTTPS (Optional)

1. [Create a Route53 Hosted Zone](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/AboutHZWorkingWith.html)
2. [Request an ACM certificate](https://docs.aws.amazon.com/acm/latest/userguide/gs-acm-request-public.html) in the **same region as your service**

```typescript
const config: FargateProps = {
  // ...
  domain: "api.example.com",
  regionalCertificateArn:
    "arn:aws:acm:us-east-1:123456789012:certificate/abc-123",
  hostedZoneId: "Z1234567890ABC",
};
```

When a domain is configured:

- HTTPS listener is added on port 443
- HTTP on port 80 redirects to HTTPS
- Route53 A record is created pointing to the ALB

## Environment Variables

```typescript
serviceProps: {
  // ...
  variables: [
    { NODE_ENV: 'production' },
    { PORT: '3000' },
  ],
},
```

## Secrets from AWS Secrets Manager

```bash
aws secretsmanager create-secret \
  --name "/myapp/DATABASE_URL" \
  --secret-string "postgres://user:pass@host/db"
```

```typescript
serviceProps: {
  // ...
  secrets: [
    { key: 'DATABASE_URL', resource: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:/myapp/DATABASE_URL-abc123' },
  ],
},
```

Secrets are injected as environment variables at container startup. The task role is automatically granted read access.

## Health Check

The ALB and ECS both perform health checks. By default they hit `/`. Configure a dedicated health endpoint:

```typescript
serviceProps: {
  healthCheckPath: '/health',
},
```

Your app should return `200 OK` on that path within 5 seconds.

## CPU & Memory Sizing

Fargate uses [fixed CPU/memory combinations](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-cpu-memory-error.html):

| CPU (units) | vCPU | Valid Memory (MB) |
| ----------- | ---- | ----------------- |
| 256         | 0.25 | 512, 1024, 2048   |
| 512         | 0.5  | 1024–4096         |
| 1024        | 1    | 2048–8192         |
| 2048        | 2    | 4096–16384        |
| 4096        | 4    | 8192–30720        |

## Estimated Cost

A minimal deployment (1 task, `us-east-1`, no free tier):

| Component                            | Monthly        |
| ------------------------------------ | -------------- |
| Fargate (1 task, 0.25 vCPU / 512 MB) | ~$9            |
| Application Load Balancer            | ~$22           |
| CloudWatch Logs                      | <$1            |
| Route53                              | $0.50          |
| **Total**                            | **~$33/month** |

See [Fargate pricing](https://aws.amazon.com/fargate/pricing/) and [ALB pricing](https://aws.amazon.com/elasticloadbalancing/pricing/).

## Stack Outputs

| Output            | Description                                      |
| ----------------- | ------------------------------------------------ |
| `LoadBalancerDNS` | ALB DNS name                                     |
| `Route53Domain`   | Custom domain URL (only if domain is configured) |

## Destroy

```bash
npx cdk destroy --app "npx tsx stack/dev.ts" --profile default
```

## Next Steps

- [fargate-nixpacks.md](./fargate-nixpacks.md) - Auto-generate Dockerfiles with Nixpacks
- [fargate-full.md](./fargate-full.md) - Full configuration reference
