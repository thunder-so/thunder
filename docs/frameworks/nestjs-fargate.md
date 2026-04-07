# Deploy NestJS to AWS Fargate

Run your [NestJS](https://nestjs.com/) API as a Node.js server inside a Docker container on [AWS ECS Fargate](https://aws.amazon.com/fargate/) using Thunder's `Fargate` construct. Traffic is routed through an [Application Load Balancer](https://aws.amazon.com/elasticloadbalancing/application-load-balancer/). No Lambda adapter needed — NestJS runs as a standard HTTP server.

## 1. Create a New NestJS Project

```bash
npm install -g @nestjs/cli
nest new my-nestjs-api
cd my-nestjs-api
```

Reference: [NestJS First Steps](https://docs.nestjs.com/first-steps)

## 2. Configure the Port

NestJS listens on port 3000 by default. Make it configurable via environment variable so the container runtime can override it if needed.

```typescript title="src/main.ts"
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
```

## 3. Install Thunder

```bash
npm install @thunder-so/thunder --save-dev
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

The multi-stage build compiles TypeScript in the builder stage, then copies only the compiled output and production dependencies into the final image.

```dockerfile title="Dockerfile"
FROM public.ecr.aws/docker/library/node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM public.ecr.aws/docker/library/node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
EXPOSE 3000
CMD ["node", "dist/main"]
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
- [nestjs-lambda.md](./nestjs-lambda.md) - NestJS on Lambda
