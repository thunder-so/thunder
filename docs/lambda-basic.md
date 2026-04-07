# Deploy a Serverless API with AWS Lambda and API Gateway

Run your Node.js backend on [AWS Lambda](https://aws.amazon.com/lambda/) with an [API Gateway HTTP API](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api.html) as the public endpoint. No servers to provision, scales to zero when idle, and pay only for what you use.

Works with any framework that exports a Lambda handler: [Express.js](https://expressjs.com/), [Hono](https://hono.dev/), [Fastify](https://fastify.dev/), [NestJS](https://nestjs.com/), [Koa](https://koajs.com/), and more.

## AWS Resources

| Resource                                                       | Purpose                                            |
| -------------------------------------------------------------- | -------------------------------------------------- |
| [Lambda Function](https://aws.amazon.com/lambda/)              | Runs your server code                              |
| [API Gateway HTTP API](https://aws.amazon.com/api-gateway/)    | Public HTTP endpoint, routes all traffic to Lambda |
| [CloudWatch Logs](https://aws.amazon.com/cloudwatch/)          | Function logs, retained for 1 month                |
| [ACM Certificate](https://aws.amazon.com/certificate-manager/) | SSL for custom domain (optional)                   |
| [Route53](https://aws.amazon.com/route53/)                     | DNS A + AAAA records (optional)                    |

## Prerequisites

- [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html) configured
- [AWS CDK](https://docs.aws.amazon.com/cdk/v2/guide/getting_started.html) bootstrapped:
  ```bash
  cdk bootstrap aws://YOUR_ACCOUNT_ID/us-east-1
  ```
- Your function built to a `dist/` directory with an `index.handler` export

## Installation

```bash
bun add @thunder-so/thunder --development
# or
npm install @thunder-so/thunder --save-dev
```

## Handler Requirements

Your Lambda handler must follow the [AWS Lambda handler signature](https://docs.aws.amazon.com/lambda/latest/dg/nodejs-handler.html). For HTTP APIs, use the v2 payload format:

```typescript
// src/index.ts
export const handler = async (event: any) => {
  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Hello from Lambda" }),
  };
};
```

For Express/Hono/Fastify, use an adapter like [`@hono/node-server`](https://hono.dev/docs/getting-started/aws-lambda) or [`serverless-http`](https://github.com/dougmoscrop/serverless-http):

```typescript
// src/index.ts (Hono example)
import { Hono } from "hono";
import { handle } from "hono/aws-lambda";

const app = new Hono();
app.get("/", (c) => c.json({ message: "Hello" }));

export const handler = handle(app);
```

## Stack File

```typescript
import { Cdk, Lambda, type LambdaProps } from "@thunder-so/thunder";

const config: LambdaProps = {
  env: {
    account: "123456789012",
    region: "us-east-1",
  },
  application: "myapp",
  service: "api",
  environment: "dev",

  rootDir: ".",

  functionProps: {
    runtime: Cdk.aws_lambda.Runtime.NODEJS_22_X,
    architecture: Cdk.aws_lambda.Architecture.ARM_64,
    codeDir: "dist", // directory containing your built handler
    handler: "index.handler",
    memorySize: 512,
    timeout: 10,
  },
};

new Lambda(
  new Cdk.App(),
  `${config.application}-${config.service}-${config.environment}-stack`,
  config,
);
```

## Deploy

```bash
# Build your app first
npm run build

# Deploy
npx cdk deploy --app "npx tsx stack/dev.ts" --profile default
```

CDK outputs the API Gateway URL:

```
Outputs:
myapp-api-dev-stack.ApiGatewayUrl = https://abc123.execute-api.us-east-1.amazonaws.com
```

## Custom Domain (Optional)

1. [Create a Route53 Hosted Zone](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/AboutHZWorkingWith.html)
2. [Request an ACM certificate](https://docs.aws.amazon.com/acm/latest/userguide/gs-acm-request-public.html) in the **same region as your function**

```typescript
const config: LambdaProps = {
  // ...
  domain: "api.example.com",
  regionalCertificateArn:
    "arn:aws:acm:us-east-1:123456789012:certificate/abc-123",
  hostedZoneId: "Z1234567890ABC",
};
```

> Unlike Static, the Lambda certificate must be **regional** (same region as the function), not global.

## Environment Variables

```typescript
functionProps: {
  // ...
  variables: [
    { NODE_ENV: 'production' },
    { API_BASE_URL: 'https://api.example.com' },
  ],
},
```

## Secrets from AWS Secrets Manager

Store sensitive values in [AWS Secrets Manager](https://aws.amazon.com/secrets-manager/) and inject them as environment variables at deploy time:

```bash
aws secretsmanager create-secret \
  --name "/myapp/DATABASE_URL" \
  --secret-string "postgres://user:pass@host/db"
```

```typescript
functionProps: {
  // ...
  secrets: [
    { key: 'DATABASE_URL', resource: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:/myapp/DATABASE_URL-abc123' },
  ],
},
```

Thunder automatically grants the Lambda execution role `secretsmanager:GetSecretValue` on each secret.

## Stack Outputs

| Output              | Description                                      |
| ------------------- | ------------------------------------------------ |
| `ApiGatewayUrl`     | API Gateway endpoint URL                         |
| `LambdaFunction`    | Lambda function name                             |
| `LambdaFunctionUrl` | Direct Lambda URL (only if `url: true`)          |
| `Route53Domain`     | Custom domain URL (only if domain is configured) |

## Destroy

```bash
npx cdk destroy --app "npx tsx stack/dev.ts" --profile default
```

## Next Steps

- [lambda-containers.md](./lambda-containers.md) - Container images and Bun runtime with Lambda
- [lambda-full.md](./lambda-full.md) - Full configuration reference
