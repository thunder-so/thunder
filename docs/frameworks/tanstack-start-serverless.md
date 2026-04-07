# Deploy TanStack Start to AWS Lambda + S3 + CloudFront

Deploy your TanStack Start app with server-side rendering to AWS using Thunder's `TanStackStart` construct. This creates a hybrid architecture: [Lambda](https://aws.amazon.com/lambda/) handles SSR and API routes, [S3](https://aws.amazon.com/s3/) hosts static assets, and [CloudFront](https://aws.amazon.com/cloudfront/) unifies both.

## 1. Create a New TanStack Start Project

```bash
bunx create-tanstack-start my-app
cd my-app
```

Reference: [TanStack Start Quick Start](https://tanstack.com/start/latest/docs/framework/react/quick-start)

## 2. Configure Nitro for AWS Lambda

TanStack Start uses [Nitro](https://nitro.unjs.io/) for server-side rendering. You **must** explicitly set the `aws-lambda` preset - the default is `node-server` which won't work on Lambda.

Edit `app.config.ts` (or create it if it doesn't exist):

```typescript
import { defineConfig } from "@tanstack/start/config";
import { nitro } from "nitro/vite";

export default defineConfig({
  vite: {
    plugins: [
      nitro({
        preset: "aws-lambda", // Required for Lambda deployment
      }),
    ],
  },
});
```

**Alternative:** If using `@tanstack/nitro-v2-vite-plugin`:

```typescript
import { nitroV2Plugin } from "@tanstack/nitro-v2-vite-plugin";

export default defineConfig({
  vite: {
    plugins: [
      nitroV2Plugin({
        preset: "aws-lambda",
      }),
    ],
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
import {
  Cdk,
  TanStackStart,
  type TanStackStartProps,
} from "@thunder-so/thunder";

const config: TanStackStartProps = {
  env: {
    account: "123456789012", // Your AWS account ID
    region: "us-east-1",
  },
  application: "myapp",
  service: "web",
  environment: "prod",

  rootDir: ".",
};

new TanStackStart(
  new Cdk.App(),
  `${config.application}-${config.service}-${config.environment}-stack`,
  config,
);
```

## 6. Deploy

```bash
npx cdk deploy --app "npx tsx stack/prod.ts" --profile default
```

CDK outputs the CloudFront and API Gateway URLs:

```
Outputs:
myapp-web-prod-stack.CloudFrontUrl = https://d1234abcd.cloudfront.net
myapp-web-prod-stack.ApiGatewayUrl = https://abc123.execute-api.us-east-1.amazonaws.com
```

## Custom Domain (Optional)

1. [Create a Route53 Hosted Zone](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/AboutHZWorkingWith.html)
2. [Request a global ACM certificate](https://docs.aws.amazon.com/acm/latest/userguide/gs-acm-request-public.html) in **`us-east-1`** (for CloudFront)
3. [Request a regional ACM certificate](https://docs.aws.amazon.com/acm/latest/userguide/gs-acm-request-public.html) in your **function's region** (for API Gateway)

Update your stack:

```typescript
const config: TanStackStartProps = {
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
const config: TanStackStartProps = {
  // ...
  serverProps: {
    variables: [
      { NODE_ENV: "production" },
      { API_BASE_URL: "https://api.example.com" },
    ],
  },
};
```

## Secrets from AWS Secrets Manager

```bash
aws secretsmanager create-secret \
  --name "/myapp/DATABASE_URL" \
  --secret-string "postgres://user:pass@host/db"
```

```typescript
serverProps: {
  secrets: [
    { key: 'DATABASE_URL', resource: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:/myapp/DATABASE_URL-abc123' },
  ],
},
```

## Performance Tuning

```typescript
serverProps: {
  memorySize: 1792,  // More memory = more CPU
  timeout: 10,
  keepWarm: true,    // Ping every 5 min to prevent cold starts
  tracing: true,     // Enable AWS X-Ray
},
```

## Container Mode (Optional)

For larger apps, use Docker:

Create `Dockerfile`:

```dockerfile
FROM public.ecr.aws/lambda/nodejs:22

COPY .output/server/ ./

CMD ["index.handler"]
```

Update your stack:

```typescript
serverProps: {
  dockerFile: 'Dockerfile',
  memorySize: 2048,
},
```

## Troubleshooting

**Error: `Runtime.HandlerNotFound: index.handler is undefined`**

You forgot to set `preset: 'aws-lambda'` in your Nitro config. The default `node-server` preset outputs an HTTP server, not a Lambda handler.

**Static assets not loading**

Check that your build output is in `.output/public/`. Thunder automatically deploys this to S3 and routes `*.*` requests through CloudFront.

## Related

- [serverless.md](../serverless.md) - Serverless construct overview
- [lambda-basic.md](../lambda-basic.md) - Lambda construct reference
- [static-basic.md](../static-basic.md) - Static construct reference
