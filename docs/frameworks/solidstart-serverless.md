# Deploy Solid Start to AWS Lambda + S3 + CloudFront

Deploy your Solid Start app with server-side rendering to AWS using Thunder's `SolidStart` construct. This creates a hybrid architecture: [Lambda](https://aws.amazon.com/lambda/) handles SSR and API routes, [S3](https://aws.amazon.com/s3/) hosts static assets, and [CloudFront](https://aws.amazon.com/cloudfront/) unifies both.

## 1. Create a New Solid Start Project

```bash
bunx create-solid@latest my-solid-app
cd my-solid-app
```

Reference: [Solid Start Getting Started](https://docs.solidjs.com/solid-start/getting-started)

## 2. Configure Nitro for AWS Lambda

Solid Start uses [Nitro](https://nitro.unjs.io/) for server-side rendering. Set the `aws-lambda` preset in `app.config.ts`:

```typescript
import { defineConfig } from "@solidjs/start/config";

export default defineConfig({
  server: {
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
import { Cdk, SolidStart, type SolidStartProps } from "@thunder-so/thunder";

const config: SolidStartProps = {
  env: {
    account: "123456789012",
    region: "us-east-1",
  },
  application: "myapp",
  service: "web",
  environment: "prod",
  rootDir: ".",
};

new SolidStart(
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
const config: SolidStartProps = {
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
