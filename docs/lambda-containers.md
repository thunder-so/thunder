# AWS Lambda with Container Images and Bun Runtime

Deploy AWS Lambda functions as Docker container images to use custom runtimes like [Bun](https://bun.sh/), ship larger packages, or include system-level dependencies. Thunder builds and pushes the image to [Amazon ECR](https://aws.amazon.com/ecr/) automatically during `cdk deploy`.

Use container Lambda when:

- Your deployment package exceeds the 250 MB zip limit
- You need a runtime not natively supported by Lambda (e.g. Bun)
- You want to use system-level dependencies (native modules, binaries)

## Node.js Container Image

### 1. Create a Dockerfile

```dockerfile
# Dockerfile
FROM public.ecr.aws/lambda/nodejs:22 AS builder
WORKDIR ${LAMBDA_TASK_ROOT}

COPY . .
RUN npm ci
RUN npm run build

FROM public.ecr.aws/lambda/nodejs:22
WORKDIR ${LAMBDA_TASK_ROOT}

COPY --from=builder /var/task/dist/ ./
COPY --from=builder /var/task/node_modules ./node_modules

CMD ["index.handler"]
```

### 2. Stack File

```typescript
import { Cdk, Lambda, type LambdaProps } from "@thunder-so/thunder";

const config: LambdaProps = {
  env: { account: "123456789012", region: "us-east-1" },
  application: "myapp",
  service: "api",
  environment: "prod",
  rootDir: ".",

  functionProps: {
    dockerFile: "Dockerfile", // path relative to rootDir
    memorySize: 1792,
    timeout: 10,
    variables: [{ NODE_ENV: "production" }],
  },
};

new Lambda(new Cdk.App(), "myapp-api-prod-stack", config);
```

> When `dockerFile` is set, `runtime`, `architecture`, `codeDir`, `handler`, `include`, and `exclude` are ignored - the Dockerfile controls the build entirely.

## Bun Runtime Container Image

[Bun](https://bun.sh/) is a fast JavaScript runtime with native TypeScript support. Since Lambda doesn't have a managed Bun runtime, you deploy it as a container.

### 1. Create the Bun Dockerfile

```dockerfile
# Dockerfile.bun

# Stage 1: Build the Bun Lambda bootstrap
FROM oven/bun:latest AS bun
WORKDIR /tmp
RUN apt-get update && apt-get install -y curl
RUN curl -fsSL https://raw.githubusercontent.com/oven-sh/bun/main/packages/bun-lambda/runtime.ts -o runtime.ts
RUN bun install aws4fetch
RUN bun build --compile runtime.ts --outfile bootstrap

# Stage 2: Build your app
FROM oven/bun:latest AS builder
WORKDIR /tmp
COPY . .
RUN bun install
RUN bun run build

# Stage 3: Runtime image
FROM public.ecr.aws/lambda/provided:al2023
WORKDIR ${LAMBDA_TASK_ROOT}

COPY --from=bun /usr/local/bin/bun /opt/bun
COPY --from=bun /tmp/bootstrap ${LAMBDA_RUNTIME_DIR}
COPY --from=builder /tmp/dist/ ./
COPY --from=builder /tmp/node_modules ./node_modules
COPY --from=builder /tmp/lambda-bun.js ./lambda-bun.js

CMD ["lambda-bun.fetch"]
```

### 2. Create the Bun Handler Shim

Bun's Lambda runtime expects a `fetch`-compatible handler:

```javascript
// lambda-bun.js
const { handler } = require("./index.js");
exports.fetch = handler;
```

If you're using [Hono](https://hono.dev/) with Bun:

```typescript
// src/index.ts
import { Hono } from "hono";

const app = new Hono();
app.get("/", (c) => c.json({ ok: true }));

export default app; // Bun's fetch handler
```

### 3. Stack File

```typescript
import { Cdk, Lambda, type LambdaProps } from "@thunder-so/thunder";

const config: LambdaProps = {
  env: { account: "123456789012", region: "us-east-1" },
  application: "myapp",
  service: "api",
  environment: "prod",
  rootDir: ".",

  functionProps: {
    dockerFile: "Dockerfile.bun",
    memorySize: 512,
    timeout: 10,
    keepWarm: true,
  },
};

new Lambda(new Cdk.App(), "myapp-api-prod-stack", config);
```

## Docker Build Arguments

Pass build-time arguments to your Dockerfile:

```typescript
functionProps: {
  dockerFile: 'Dockerfile',
  dockerBuildArgs: ['NODE_ENV=production', 'APP_VERSION=1.2.3'],
},
```

In your Dockerfile:

```dockerfile
ARG NODE_ENV
ARG APP_VERSION
```

## Keep Warm

Container Lambdas have longer cold starts than zip-based functions. Use `keepWarm` to schedule an EventBridge ping every 5 minutes:

```typescript
functionProps: {
  dockerFile: 'Dockerfile',
  keepWarm: true,
},
```

This creates an [EventBridge rule](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-rules.html) that invokes the function with a synthetic API Gateway v2 event.

## Notes on Container Deployments

- The entire `rootDir` is used as the Docker build context
- CDK builds and pushes the image to [Amazon ECR](https://aws.amazon.com/ecr/) automatically during `cdk deploy`
- `timeout`, `memorySize`, `tracing`, `keepWarm`, `variables`, and `secrets` all work the same as zip deployments
- For more on Lambda container images, see the [AWS docs](https://docs.aws.amazon.com/lambda/latest/dg/images-create.html)

## Related

- [lambda-basic.md](./lambda-basic.md) - Basic zip-based deployment
- [lambda-full.md](./lambda-full.md) - Full configuration reference
