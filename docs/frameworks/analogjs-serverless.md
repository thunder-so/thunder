# Deploy AnalogJS to AWS Lambda + S3 + CloudFront

Deploy your AnalogJS app with server-side rendering to AWS using Thunder's `AnalogJS` construct. This creates a hybrid architecture: [Lambda](https://aws.amazon.com/lambda/) handles SSR and API routes, [S3](https://aws.amazon.com/s3/) hosts static assets, and [CloudFront](https://aws.amazon.com/cloudfront/) unifies both.

## 1. Create a New AnalogJS Project

```bash
bunx create-analog@latest my-analog-app
cd my-analog-app
```

Reference: [AnalogJS Getting Started](https://analogjs.org/docs/getting-started)

## 2. Configure Nitro for AWS Lambda

AnalogJS uses [Nitro](https://nitro.unjs.io/) for server-side rendering. Set the `aws-lambda` preset in `vite.config.ts`:

```typescript
import { defineConfig } from "vite";
import analog from "@analogjs/platform";

export default defineConfig({
  plugins: [
    analog({
      nitro: {
        preset: "aws-lambda",
      },
    }),
  ],
});
```

Reference: [Nitro AWS Lambda Preset](https://nitro.build/deploy/providers/aws)

## 3. Build Your App

```bash
bun run build
```

This generates:

- `dist/analog/server/` - Lambda handler
- `dist/analog/public/` - Static assets for S3

## 4. Install Thunder

```bash
bun add @thunder-so/thunder --development
```

## 5. Create Stack File

Create `stack/prod.ts`:

```typescript
import { Cdk, AnalogJS, type AnalogJSProps } from "@thunder-so/thunder";

const config: AnalogJSProps = {
  env: {
    account: "123456789012",
    region: "us-east-1",
  },
  application: "myapp",
  service: "web",
  environment: "prod",
  rootDir: ".",
};

new AnalogJS(
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
const config: AnalogJSProps = {
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
