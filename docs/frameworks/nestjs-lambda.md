# Deploy NestJS to AWS Lambda

Deploy a [NestJS](https://nestjs.com/) API to [AWS Lambda](https://aws.amazon.com/lambda/) with [API Gateway](https://aws.amazon.com/api-gateway/) as the public HTTP endpoint. NestJS adapts to Lambda using `@vendia/serverless-express`, which wraps the Express HTTP adapter in a Lambda-compatible handler.

## 1. Create a New NestJS Project

```bash
npm install -g @nestjs/cli
nest new my-nestjs-api
cd my-nestjs-api
```

Reference: [NestJS First Steps](https://docs.nestjs.com/first-steps)

## 2. Install the Lambda Adapter

`@vendia/serverless-express` bridges NestJS's Express adapter to the Lambda handler format expected by API Gateway.

```bash
npm install @vendia/serverless-express
npm install -D @types/aws-lambda
```

## 3. Create the Lambda Handler

Create a separate entry point for Lambda. This bootstraps the NestJS app once (on cold start) and reuses it across invocations.

```typescript title="src/lambda.ts"
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { configure as serverlessExpress } from '@vendia/serverless-express';
import express from 'express';
import { AppModule } from './app.module';

let cachedHandler: any;

async function bootstrap() {
  const expressApp = express();
  const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp));
  await app.init();
  return serverlessExpress({ app: expressApp });
}

export const handler = async (event: any, context: any) => {
  if (!cachedHandler) {
    cachedHandler = await bootstrap();
  }
  return cachedHandler(event, context);
};
```

Reference: [NestJS Serverless docs](https://docs.nestjs.com/faq/serverless)

## 4. Install Thunder

```bash
npm install @thunder-so/thunder --save-dev
```

## 5. Create Stack File (Zip mode)

The `Lambda` construct provisions a Lambda function and an API Gateway HTTP API. Point `codeDir` at the NestJS build output (`dist/`) and set the handler to the Lambda entry point.

```typescript title="stack/prod.ts"
import { Cdk, Lambda, type LambdaProps } from '@thunder-so/thunder';

const config: LambdaProps = {
  env: {
    account: 'YOUR_ACCOUNT_ID',
    region: 'us-east-1',
  },
  application: 'myapp',
  service: 'api',
  environment: 'prod',
  rootDir: '.',
  functionProps: {
    runtime: Cdk.aws_lambda.Runtime.NODEJS_22_X,
    architecture: Cdk.aws_lambda.Architecture.ARM_64,
    codeDir: 'dist',
    handler: 'lambda.handler',
    memorySize: 1792,
    timeout: 10,
    keepWarm: true,
  },
};

new Lambda(
  new Cdk.App(),
  `${config.application}-${config.service}-${config.environment}-stack`,
  config,
);
```

## 6. Deploy

Build the NestJS app first — `nest build` compiles TypeScript to `dist/`. Then deploy with CDK.

```bash
npm run build
npx cdk deploy --app "npx tsx stack/prod.ts" --profile default
```

```
Outputs:
myapp-api-prod-stack.ApiGatewayUrl = https://abc123.execute-api.us-east-1.amazonaws.com
```

## Container Mode (Optional)

For larger apps with heavy dependencies, deploy as a container image. The 250 MB Zip limit doesn't apply to container Lambdas (up to 10 GB).

```typescript title="stack/prod.ts"
functionProps: {
  dockerFile: 'Dockerfile',
  memorySize: 1792,
  timeout: 10,
  keepWarm: true,
},
```

```dockerfile title="Dockerfile"
FROM public.ecr.aws/lambda/nodejs:22 AS builder
WORKDIR ${LAMBDA_TASK_ROOT}
COPY . .
RUN npm ci
RUN npm run build

FROM public.ecr.aws/lambda/nodejs:22
WORKDIR ${LAMBDA_TASK_ROOT}
COPY --from=builder /var/task/dist/ ./
COPY --from=builder /var/task/node_modules ./node_modules
CMD ["lambda.handler"]
```

## Environment Variables and Secrets

```typescript
functionProps: {
  variables: [
    { NODE_ENV: 'production' },
  ],
  secrets: [
    { key: 'DATABASE_URL', resource: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:/myapp/DATABASE_URL-abc123' },
  ],
},
```

## Related

- [lambda-basic.md](../lambda-basic.md) - Lambda construct reference
- [lambda-containers.md](../lambda-containers.md) - Container images with Lambda
- [nestjs-fargate.md](./nestjs-fargate.md) - NestJS on Fargate
