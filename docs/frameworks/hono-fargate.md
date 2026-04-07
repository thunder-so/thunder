# Deploy Hono to AWS Fargate

Run your [Hono](https://hono.dev/) API as a Node.js server inside a Docker container on [AWS ECS Fargate](https://aws.amazon.com/fargate/) using Thunder's `Fargate` construct. Traffic is routed through an [Application Load Balancer](https://aws.amazon.com/elasticloadbalancing/application-load-balancer/).

## 1. Create a New Hono Project

```bash
mkdir my-hono-api && cd my-hono-api
bun init -y
bun add hono @hono/node-server
```

## 2. Write the Server

Use `@hono/node-server` to run Hono as a standard HTTP server — the same code works locally and inside the container.

```typescript title="src/index.ts"
import { Hono } from 'hono'
import { serve } from '@hono/node-server'

const app = new Hono()

app.get('/', (c) => c.json({ message: 'Hello from Hono!' }))

serve({
  fetch: app.fetch,
  port: Number(process.env.PORT) || 3000,
})
```

Reference: [Hono Node.js adapter](https://hono.dev/docs/getting-started/nodejs)

## 3. Install Thunder

```bash
bun add @thunder-so/thunder --development
```

## 4. Create Stack File

The `Fargate` construct creates an ECS cluster, a Fargate task definition, and an Application Load Balancer.

```typescript title="stack/prod.ts"
import { Cdk, Fargate, type FargateProps } from '@thunder-so/thunder';

const config: FargateProps = {
  env: {
    account: 'YOUR_ACCOUNT_ID',
    region: 'us-east-1',
  },
  application: 'myapp',
  service: 'api',
  environment: 'prod',
  rootDir: '.',
  serviceProps: {
    dockerFile: 'Dockerfile',
    architecture: Cdk.aws_ecs.CpuArchitecture.ARM64,
    cpu: 512,
    memorySize: 1024,
    port: 3000,
    desiredCount: 1,
    healthCheckPath: '/',
  },
};

new Fargate(
  new Cdk.App(),
  `${config.application}-${config.service}-${config.environment}-stack`,
  config,
);
```

## 5. Create Dockerfile

```dockerfile title="Dockerfile"
FROM oven/bun:latest AS builder
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

FROM oven/bun:latest AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
EXPOSE 3000
CMD ["bun", "run", "dist/index.js"]
```

## 6. Deploy

CDK builds the Docker image, pushes it to [ECR](https://aws.amazon.com/ecr/), and deploys it to Fargate.

```bash
npx cdk deploy --app "npx tsx stack/prod.ts" --profile default
```

```
Outputs:
myapp-api-prod-stack.LoadBalancerDNS = myapp-api-prod-1234567890.us-east-1.elb.amazonaws.com
```

## Environment Variables and Secrets

```typescript
serviceProps: {
  variables: [
    { NODE_ENV: 'production' },
  ],
  secrets: [
    { key: 'DATABASE_URL', resource: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:/myapp/DATABASE_URL-abc123' },
  ],
},
```

## Related

- [fargate-basic.md](../fargate-basic.md) - Fargate construct reference
- [hono-lambda.md](./hono-lambda.md) - Hono on Lambda
