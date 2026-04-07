# Deploy Astro to AWS Fargate

Run your Astro app with full SSR support on [AWS ECS Fargate](https://aws.amazon.com/fargate/) using Thunder's `Fargate` construct.

## 1. Create a New Astro Project

```bash
bunx create-astro@latest my-astro-app
cd my-astro-app
```

Reference: [Astro Installation Docs](https://docs.astro.build/en/install-and-setup/)

## 2. Configure Astro for Node Server

Edit `astro.config.mjs`:

```javascript
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

export default defineConfig({
  output: 'server',
  adapter: node({
    mode: 'standalone',
  }),
});
```

## 3. Create Dockerfile

```dockerfile
FROM oven/bun:latest AS builder
WORKDIR /app

COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

FROM public.ecr.aws/docker/library/node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4321

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

EXPOSE 4321

CMD ["node", "./dist/server/entry.mjs"]
```

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
    account: '123456789012',
    region: 'us-east-1',
  },
  application: 'myapp',
  service: 'web',
  environment: 'prod',
  rootDir: '.',

  serviceProps: {
    dockerFile: 'Dockerfile',
    architecture: Cdk.aws_ecs.CpuArchitecture.ARM64,
    cpu: 512,
    memorySize: 1024,
    port: 4321,
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

## Custom Domain

```typescript
const config: FargateProps = {
  // ...
  domain: 'app.example.com',
  regionalCertificateArn: 'arn:aws:acm:us-east-1:123456789012:certificate/abc-123',
  hostedZoneId: 'Z1234567890ABC',
};
```

## Related

- [fargate-basic.md](../fargate-basic.md) - Fargate construct reference
- [astro-serverless.md](./astro-serverless.md) - Astro on Lambda
