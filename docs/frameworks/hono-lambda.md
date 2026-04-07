# Deploy Hono to AWS Lambda

Deploy a [Hono](https://hono.dev/) API to [AWS Lambda](https://aws.amazon.com/lambda/) with [API Gateway](https://aws.amazon.com/api-gateway/) as the public HTTP endpoint. Hono has first-class support for Lambda via its `hono/aws-lambda` adapter.

## 1. Create a New Hono Project

```bash
mkdir my-hono-api && cd my-hono-api
bun init -y
```

Install Hono and a bundler:

```bash
bun add hono
bun add -D esbuild
```

## 2. Write the Handler

Hono's `handle()` adapter wraps your app in the Lambda handler signature expected by API Gateway v2.

```typescript title="src/index.ts"
import { Hono } from 'hono'
import { handle } from 'hono/aws-lambda'

const app = new Hono()

app.get('/', (c) => c.json({ message: 'Hello from Hono!' }))

export const handler = handle(app)
```

Reference: [Hono AWS Lambda adapter](https://hono.dev/docs/getting-started/aws-lambda)

## 3. Configure the Build

Hono on Lambda works best bundled to a single file with esbuild. Add a build script to `package.json`:

```json title="package.json"
{
  "scripts": {
    "build": "esbuild --bundle --outfile=./dist/index.js --platform=node --target=node22 ./src/index.ts"
  }
}
```

Running `bun run build` produces `dist/index.js` — the file Lambda will execute.

## 4. Install Thunder

```bash
bun add @thunder-so/thunder --development
```

## 5. Create Stack File (Zip mode)

The `Lambda` construct provisions a Lambda function and an API Gateway HTTP API. The Zip mode packages `dist/` directly — no Docker required.

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
    handler: 'index.handler',
    memorySize: 512,
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

Build the handler first, then deploy with CDK. CDK outputs the API Gateway URL.

```bash
bun run build
npx cdk deploy --app "npx tsx stack/prod.ts" --profile default
```

```
Outputs:
myapp-api-prod-stack.ApiGatewayUrl = https://abc123.execute-api.us-east-1.amazonaws.com
```

## Container Mode (Optional)

For larger apps or when you need native modules, deploy as a container image. The Dockerfile builds and bundles the app, then copies only the compiled output into the Lambda runtime image.

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
RUN npm install
RUN npm run build

FROM public.ecr.aws/lambda/nodejs:22
WORKDIR ${LAMBDA_TASK_ROOT}
COPY --from=builder /var/task/dist/* ./
COPY --from=builder /var/task/node_modules ./node_modules
CMD ["index.handler"]
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
- [hono-fargate.md](./hono-fargate.md) - Hono on Fargate
