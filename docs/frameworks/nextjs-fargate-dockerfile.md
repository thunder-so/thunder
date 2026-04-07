# Deploy Next.js to AWS Fargate with Dockerfile

Run your Next.js app with full SSR support on [AWS ECS Fargate](https://aws.amazon.com/fargate/) using Thunder's `Fargate` construct. This deploys your app as a Docker container with an [Application Load Balancer](https://aws.amazon.com/elasticloadbalancing/application-load-balancer/) in front - no EC2 instances to manage.

Perfect for Next.js apps that need server-side rendering, API routes, or features not supported by static export.

## 1. Create a New Next.js Project

```bash
bunx create-next-app@latest my-nextjs-app
cd my-nextjs-app
```

When prompted:
- TypeScript: Yes
- ESLint: Yes
- Tailwind CSS: Yes (optional)
- `src/` directory: No (optional)
- App Router: Yes
- Turbopack: Yes (optional)

Reference: [Next.js Installation Docs](https://nextjs.org/docs/getting-started/installation)

## 2. Configure Next.js for Standalone Output

Edit `next.config.ts`:

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',  // Optimized for Docker
};

export default nextConfig;
```

Reference: [Next.js Standalone Output](https://nextjs.org/docs/app/api-reference/next-config-js/output)

## 3. Create Dockerfile

Create `Dockerfile` in your project root:

```dockerfile
# Build stage
FROM oven/bun:latest AS builder
WORKDIR /app

COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

# Production stage
FROM public.ecr.aws/docker/library/node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
```

Add `.dockerignore`:

```
.git
node_modules
.next
.DS_Store
cdk.out
stack
```

Reference: [Next.js Docker Deployment](https://nextjs.org/docs/app/guides/docker)

## 4. Install Thunder

```bash
bun add @thunder-so/thunder --development
```

## 5. Create Stack File

Create `stack/prod.ts`:

```typescript
import { Cdk, Fargate, type FargateProps } from '@thunder-so/thunder';

const config: FargateProps = {
  env: {
    account: '123456789012',  // Your AWS account ID
    region: 'us-east-1',
  },
  application: 'myapp',
  service: 'web',
  environment: 'prod',

  rootDir: '.',

  serviceProps: {
    dockerFile: 'Dockerfile',
    architecture: Cdk.aws_ecs.CpuArchitecture.ARM64,
    cpu: 512,        // 0.5 vCPU
    memorySize: 1024, // 1 GB
    port: 3000,
    desiredCount: 1,
    healthCheckPath: '/',
  },
};

new Fargate(
  new Cdk.App(),
  `${config.application}-${config.service}-${config.environment}-stack`,
  config
);
```

## 6. Deploy

```bash
npx cdk deploy --app "npx tsx stack/prod.ts" --profile default
```

CDK builds your Docker image, pushes it to ECR, and deploys to Fargate. The ALB DNS name is output:

```
Outputs:
myapp-web-prod-stack.LoadBalancerDNS = myapp-web-prod-1234567890.us-east-1.elb.amazonaws.com
```

## Custom Domain with HTTPS (Optional)

1. [Create a Route53 Hosted Zone](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/AboutHZWorkingWith.html)
2. [Request an ACM certificate](https://docs.aws.amazon.com/acm/latest/userguide/gs-acm-request-public.html) in the **same region as your service**

Update your stack:

```typescript
const config: FargateProps = {
  // ...
  domain: 'app.example.com',
  regionalCertificateArn: 'arn:aws:acm:us-east-1:123456789012:certificate/abc-123',
  hostedZoneId: 'Z1234567890ABC',
};
```

When a domain is configured:
- HTTPS listener is added on port 443
- HTTP on port 80 redirects to HTTPS
- Route53 A record is created

## Environment Variables

```typescript
serviceProps: {
  // ...
  variables: [
    { NODE_ENV: 'production' },
    { NEXT_PUBLIC_API_URL: 'https://api.example.com' },
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

## Scaling

Increase task count for high availability:

```typescript
serviceProps: {
  desiredCount: 2,  // Run 2 containers
  cpu: 1024,        // 1 vCPU per task
  memorySize: 2048, // 2 GB per task
},
```

See [Fargate CPU/memory combinations](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-cpu-memory-error.html).

## Cost Estimate

Minimal deployment (1 task, `us-east-1`, no free tier):

| Component | Monthly |
|---|---|
| Fargate (1 task, 0.5 vCPU / 1 GB) | ~$15 |
| Application Load Balancer | ~$22 |
| CloudWatch Logs | <$1 |
| Route53 | $0.50 |
| **Total** | **~$38/month** |

## Related

- [fargate-basic.md](../fargate-basic.md) - Fargate construct reference
- [fargate-nixpacks.md](../fargate-nixpacks.md) - Auto-generate Dockerfiles with Nixpacks
- [fargate-full.md](../fargate-full.md) - Full configuration reference
- [nextjs-fargate-nixpacks.md](./nextjs-fargate-nixpacks.md) - Next.js on Fargate without writing a Dockerfile
