# Deploy Astro with SSR to AWS Lambda + S3 + CloudFront

Deploy your Astro app with server-side rendering to AWS using Thunder's `Astro` construct. This creates a hybrid architecture: [Lambda](https://aws.amazon.com/lambda/) handles SSR and API routes, [S3](https://aws.amazon.com/s3/) hosts static assets, and [CloudFront](https://aws.amazon.com/cloudfront/) unifies both.

## 1. Create a New Astro Project

```bash
bunx create-astro@latest my-astro-app
cd my-astro-app
```

Reference: [Astro Installation Docs](https://docs.astro.build/en/install-and-setup/)

## 2. Install AWS Adapter

```bash
bun add @astro-aws/adapter
```

## 3. Configure Astro for AWS Lambda

Edit `astro.config.mjs`:

```javascript
import { defineConfig } from "astro/config";
import aws from "@astro-aws/adapter";

export default defineConfig({
  output: "server", // Enable SSR
  adapter: aws(),
});
```

Reference: [@astro-aws/adapter](https://www.npmjs.com/package/@astro-aws/adapter)

## 4. Build Your App

```bash
bun run build
```

This generates:

- `dist/lambda/` - Lambda handler
- `dist/client/` - Static assets for S3

## 5. Install Thunder

```bash
bun add @thunder-so/thunder --development
```

## 6. Create Stack File

Create `stack/prod.ts`:

```typescript
import { Cdk, Astro, type AstroProps } from "@thunder-so/thunder";

const config: AstroProps = {
  env: {
    account: "123456789012",
    region: "us-east-1",
  },
  application: "myapp",
  service: "web",
  environment: "prod",
  rootDir: ".",
};

new Astro(
  new Cdk.App(),
  `${config.application}-${config.service}-${config.environment}-stack`,
  config,
);
```

## 7. Deploy

```bash
npx cdk deploy --app "npx tsx stack/prod.ts" --profile default
```

## Custom Domain

```typescript
const config: AstroProps = {
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
    { key: 'API_KEY', resource: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:/myapp/api-abc123' },
  ],
},
```

## Related

- [serverless.md](../serverless.md) - Serverless construct overview
- [astro-static.md](./astro-static.md) - Astro static site
- [astro-fargate.md](./astro-fargate.md) - Astro on Fargate
