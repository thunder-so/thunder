# Deploy Nuxt to AWS Fargate

Run your Nuxt app with full SSR support on [AWS ECS Fargate](https://aws.amazon.com/fargate/) using Thunder's `Fargate` construct.

## 1. Create a New Nuxt Project

```bash
bunx nuxi@latest init my-nuxt-app
cd my-nuxt-app
```

Reference: [Nuxt Installation Docs](https://nuxt.com/docs/getting-started/installation)

## 2. Create Dockerfile

```dockerfile
FROM oven/bun:latest AS builder
WORKDIR /app

COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

FROM oven/bun:latest AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

COPY --from=builder /app/.output ./

EXPOSE 3000

CMD ["bun", "run", "server/index.mjs"]
```

## 3. Install Thunder

```bash
bun add @thunder-so/thunder --development
```

## 4. Create Stack File

Create `stack/prod.ts`:

```typescript
import { Cdk, Fargate, type FargateProps } from "@thunder-so/thunder";

const config: FargateProps = {
  env: {
    account: "123456789012",
    region: "us-east-1",
  },
  application: "myapp",
  service: "web",
  environment: "prod",
  rootDir: ".",

  serviceProps: {
    dockerFile: "Dockerfile",
    architecture: Cdk.aws_ecs.CpuArchitecture.ARM64,
    cpu: 512,
    memorySize: 1024,
    port: 3000,
    desiredCount: 1,
    healthCheckPath: "/",
  },
};

new Fargate(
  new Cdk.App(),
  `${config.application}-${config.service}-${config.environment}-stack`,
  config,
);
```

## 5. Deploy

```bash
npx cdk deploy --app "npx tsx stack/prod.ts" --profile default
```

## Custom Domain with HTTPS

```typescript
const config: FargateProps = {
  // ...
  domain: "app.example.com",
  regionalCertificateArn:
    "arn:aws:acm:us-east-1:123456789012:certificate/abc-123",
  hostedZoneId: "Z1234567890ABC",
};
```

## Environment Variables

```typescript
serviceProps: {
  // ...
  variables: [
    { NODE_ENV: 'production' },
  ],
  secrets: [
    { key: 'DATABASE_URL', resource: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:/myapp/db-abc123' },
  ],
},
```

## Related

- [fargate-basic.md](../fargate-basic.md) - Fargate construct reference
- [nuxt-serverless.md](./nuxt-serverless.md) - Nuxt on Lambda
