# Deploy Nuxt to AWS Lambda + S3 + CloudFront

Deploy your Nuxt app with server-side rendering to AWS using Thunder's `Nuxt` construct. This creates a hybrid architecture: [Lambda](https://aws.amazon.com/lambda/) handles SSR and API routes, [S3](https://aws.amazon.com/s3/) hosts static assets, and [CloudFront](https://aws.amazon.com/cloudfront/) unifies both.

## 1. Create a New Nuxt Project

```bash
bunx nuxi@latest init my-nuxt-app
cd my-nuxt-app
```

Reference: [Nuxt Installation Docs](https://nuxt.com/docs/getting-started/installation)

## 2. Configure Nitro for AWS Lambda

Nuxt uses [Nitro](https://nitro.unjs.io/) for server-side rendering. Set the `aws-lambda` preset via environment variable:

Create `.env`:

```bash
NITRO_PRESET=aws-lambda
```

Or set it in `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  nitro: {
    preset: "aws-lambda",
  },
});
```

Reference: [Nitro AWS Lambda Preset](https://nitro.build/deploy/providers/aws)

## 3. Build Your App

```bash
bun run build
```

This generates:

- `.output/server/` - Lambda handler
- `.output/public/` - Static assets for S3

## 4. Install Thunder

```bash
bun add @thunder-so/thunder --development
```

## 5. Create Stack File

Create `stack/prod.ts`:

```typescript
import { Cdk, Nuxt, type NuxtProps } from "@thunder-so/thunder";

const config: NuxtProps = {
  env: {
    account: "123456789012",
    region: "us-east-1",
  },
  application: "myapp",
  service: "web",
  environment: "prod",
  rootDir: ".",
};

new Nuxt(
  new Cdk.App(),
  `${config.application}-${config.service}-${config.environment}-stack`,
  config,
);
```

## 6. Deploy

```bash
npx cdk deploy --app "npx tsx stack/prod.ts" --profile default
```

## Custom Domain

```typescript
const config: NuxtProps = {
  // ...
  domain: "app.example.com",
  hostedZoneId: "Z1234567890ABC",
  globalCertificateArn:
    "arn:aws:acm:us-east-1:123456789012:certificate/abc-123",
  regionalCertificateArn:
    "arn:aws:acm:us-east-1:123456789012:certificate/def-456",
};
```

## Environment Variables

```typescript
serverProps: {
  variables: [
    { NODE_ENV: 'production' },
  ],
  secrets: [
    { key: 'DATABASE_URL', resource: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:/myapp/db-abc123' },
  ],
},
```

## Performance Tuning

```typescript
serverProps: {
  memorySize: 1792,
  timeout: 10,
  keepWarm: true,
  tracing: true,
},
```

## Related

- [serverless.md](../serverless.md) - Serverless construct overview
- [lambda-basic.md](../lambda-basic.md) - Lambda construct reference
