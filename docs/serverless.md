# Deploy Full-Stack Meta-Frameworks to AWS Lambda + S3 + CloudFront

Thunder's `Serverless` construct deploys modern full-stack frameworks with server-side rendering (SSR) to AWS using a hybrid architecture: [AWS Lambda](https://aws.amazon.com/lambda/) handles dynamic server requests, [S3](https://aws.amazon.com/s3/) hosts static assets, and [CloudFront](https://aws.amazon.com/cloudfront/) unifies both behind a single domain with intelligent routing.

This pattern works with any meta-framework that uses [Nitro](https://nitro.unjs.io/) or a compatible server runtime: Nuxt, Astro, TanStack Start, SvelteKit, Solid Start, AnalogJS, and more.

## Architecture

```
User Request
    ↓
CloudFront (CDN)
    ├─→ /assets/* → S3 (static files: JS, CSS, images)
    ├─→ /api/* → Lambda (API routes)
    └─→ /* → Lambda (SSR pages)
```

- **Static assets** (`*.js`, `*.css`, `*.png`, etc.) are cached long-term at CloudFront edge locations
- **Dynamic requests** (SSR pages, API routes) hit Lambda through API Gateway
- **Single domain** - no CORS issues, unified caching strategy

## AWS Resources

| Resource                                                                                                                                        | Purpose                                      |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| [Lambda Function](https://aws.amazon.com/lambda/)                                                                                               | Runs your server-side code (SSR, API routes) |
| [API Gateway HTTP API](https://aws.amazon.com/api-gateway/)                                                                                     | Routes dynamic requests to Lambda            |
| [S3 Bucket](https://aws.amazon.com/s3/)                                                                                                         | Hosts static assets (JS, CSS, images)        |
| [CloudFront Distribution](https://aws.amazon.com/cloudfront/)                                                                                   | Global CDN with origin routing               |
| [Origin Access Control (OAC)](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html) | Secures S3 - no public bucket access         |
| [ACM Certificate](https://aws.amazon.com/certificate-manager/)                                                                                  | SSL/TLS for custom domain (optional)         |
| [Route53](https://aws.amazon.com/route53/)                                                                                                      | DNS A + AAAA records (optional)              |

## Supported Frameworks

| Framework                                    | Construct       | Server Runtime                     | Notes                                              |
| -------------------------------------------- | --------------- | ---------------------------------- | -------------------------------------------------- |
| [Nuxt](https://nuxt.com/)                    | `Nuxt`          | Nitro                              | Vue-based, `aws-lambda` preset                     |
| [Astro](https://astro.build/)                | `Astro`         | @astro-aws/adapter                 | Requires Lambda@Edge fallback                      |
| [TanStack Start](https://tanstack.com/start) | `TanStackStart` | Nitro                              | React-based, explicit `aws-lambda` preset required |
| [SvelteKit](https://kit.svelte.dev/)         | `SvelteKit`     | @foladayo/sveltekit-adapter-lambda | Requires `serveStatic: true`                       |
| [Solid Start](https://start.solidjs.com/)    | `SolidStart`    | Nitro                              | SolidJS-based, `aws-lambda` preset                 |
| [AnalogJS](https://analogjs.org/)            | `AnalogJS`      | Nitro                              | Angular-based, `aws-lambda` preset                 |

See [framework-specific guides](#framework-guides) below for setup instructions.

## Prerequisites

- [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html) configured
- [AWS CDK](https://docs.aws.amazon.com/cdk/v2/guide/getting_started.html) bootstrapped:
  ```bash
  cdk bootstrap aws://YOUR_ACCOUNT_ID/us-east-1
  ```
- Your app built with framework-specific build command

## Installation

```bash
bun add @thunder-so/thunder --development
# or
npm install @thunder-so/thunder --save-dev
```

## Basic Example (Nuxt)

```typescript
import { Cdk, Nuxt, type NuxtProps } from "@thunder-so/thunder";

const config: NuxtProps = {
  env: { account: "123456789012", region: "us-east-1" },
  application: "myapp",
  service: "web",
  environment: "prod",
  rootDir: ".",
};

new Nuxt(new Cdk.App(), "myapp-web-prod-stack", config);
```

## Deploy

```bash
# Build your app first
bun run build

# Deploy
npx cdk deploy --app "npx tsx stack/prod.ts" --profile default
```

CDK outputs the CloudFront URL and API Gateway URL:

```
Outputs:
myapp-web-prod-stack.CloudFrontUrl = https://d1234abcd.cloudfront.net
myapp-web-prod-stack.ApiGatewayUrl = https://abc123.execute-api.us-east-1.amazonaws.com
```

## Custom Domain (Optional)

1. [Create a Route53 Hosted Zone](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/AboutHZWorkingWith.html)
2. [Request a global ACM certificate](https://docs.aws.amazon.com/acm/latest/userguide/gs-acm-request-public.html) in **`us-east-1`** (for CloudFront)
3. [Request a regional ACM certificate](https://docs.aws.amazon.com/acm/latest/userguide/gs-acm-request-public.html) in your **function's region** (for API Gateway)

```typescript
const config: ServerlessBaseProps = {
  // ...
  domain: "app.example.com",
  hostedZoneId: "Z1234567890ABC",
  globalCertificateArn:
    "arn:aws:acm:us-east-1:123456789012:certificate/abc-123",
  regionalCertificateArn:
    "arn:aws:acm:us-east-1:123456789012:certificate/def-456",
};
```

> CloudFront requires a certificate in `us-east-1` (global). API Gateway requires a certificate in the same region as your Lambda function.

## Configuration

### Server (Lambda)

```typescript
serverProps: {
  memorySize: 1792,
  timeout: 10,
  keepWarm: true,
  tracing: true,
  variables: [
    { NODE_ENV: 'production' },
  ],
  secrets: [
    { key: 'DATABASE_URL', resource: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:/myapp/db-abc123' },
  ],
},
```

### CloudFront Cache Behavior

```typescript
// Cache control
allowHeaders: ['Accept-Language'],
allowCookies: ['session-*'],
allowQueryParams: ['lang'],
denyQueryParams: ['utm_source', 'fbclid'],  // mutually exclusive with allowQueryParams

// Custom error page
errorPagePath: '/404.html',
```

## Container Mode (Docker)

For larger apps or custom runtimes, use Docker:

```typescript
serverProps: {
  dockerFile: 'Dockerfile',
  dockerBuildArgs: { NODE_ENV: 'production' },
  memorySize: 2048,
},
```

Thunder builds and pushes the image to [Amazon ECR](https://aws.amazon.com/ecr/) automatically. See framework-specific docs for Dockerfile examples.

## Environment Variables

```typescript
serverProps: {
  variables: [
    { NODE_ENV: 'production' },
    { API_BASE_URL: 'https://api.example.com' },
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
serverProps: {
  secrets: [
    { key: 'DATABASE_URL', resource: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:/myapp/DATABASE_URL-abc123' },
  ],
},
```

## Keep Warm

Prevent cold starts by pinging the Lambda every 5 minutes:

```typescript
serverProps: {
  keepWarm: true,
},
```

## Stack Outputs

| Output          | Description                                      |
| --------------- | ------------------------------------------------ |
| `CloudFrontUrl` | CloudFront distribution URL                      |
| `ApiGatewayUrl` | API Gateway endpoint URL                         |
| `Route53Domain` | Custom domain URL (only if domain is configured) |

## Framework Guides

Detailed setup instructions for each framework:

- [Nuxt Serverless](./frameworks/nuxt-serverless.md)
- [Astro Serverless](./frameworks/astro-serverless.md)
- [TanStack Start Serverless](./frameworks/tanstack-start-serverless.md)
- [SvelteKit Serverless](./frameworks/sveltekit-serverless.md)
- [Solid Start Serverless](./frameworks/solidstart-serverless.md)
- [AnalogJS Serverless](./frameworks/analogjs-serverless.md)

## Generic Serverless Deployment

For any Vite/Nitro-based meta-framework not explicitly supported, use the generic `Serverless` construct:

```typescript
import { Cdk, Serverless, type ServerlessProps } from "@thunder-so/thunder";

const config: ServerlessProps = {
  env: { account: "123456789012", region: "us-east-1" },
  application: "myapp",
  service: "web",
  environment: "prod",
  rootDir: ".",

  serverProps: {
    codeDir: ".output/server", // Your framework's server output
    handler: "index.handler",
    runtime: Cdk.aws_lambda.Runtime.NODEJS_22_X,
    architecture: Cdk.aws_lambda.Architecture.ARM_64,
    memorySize: 1792,
    timeout: 10,
  },

  clientProps: {
    outputDir: ".output/public", // Your framework's static assets
  },
};

new Serverless(new Cdk.App(), "myapp-web-prod-stack", config);
```

This works with any framework that outputs a Lambda-compatible handler and static assets.

```bash
npx cdk destroy --app "npx tsx stack/prod.ts" --profile default
```

> The S3 bucket uses `RemovalPolicy.RETAIN` to prevent accidental data loss. Delete it manually from the AWS console if needed.

## Related

- [lambda-basic.md](./lambda-basic.md) - Lambda construct reference
- [static-basic.md](./static-basic.md) - Static construct reference
- [fargate-basic.md](./fargate-basic.md) - Fargate construct reference
