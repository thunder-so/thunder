# Lambda Configuration Reference

Complete reference for every option available in the `Lambda` construct. Covers zip and container deployments, concurrency, secrets, custom domains, and VPC integration. For a quick start see [lambda-basic.md](./lambda-basic.md).

## Examples

### Zip Deployment

```typescript
import { Cdk, Lambda, type LambdaProps } from "@thunder-so/thunder";

const config: LambdaProps = {
  env: { account: "123456789012", region: "us-east-1" },
  application: "myapp",
  service: "api",
  environment: "prod",
  rootDir: ".",

  domain: "api.example.com",
  regionalCertificateArn:
    "arn:aws:acm:us-east-1:123456789012:certificate/abc-123",
  hostedZoneId: "Z1234567890ABC",

  functionProps: {
    runtime: Cdk.aws_lambda.Runtime.NODEJS_22_X,
    architecture: Cdk.aws_lambda.Architecture.ARM_64,
    codeDir: "dist",
    handler: "index.handler",
    include: ["package.json"],
    exclude: ["**/*.test.js"],
    memorySize: 1792,
    timeout: 10,
    tracing: true,
    reservedConcurrency: 10,
    provisionedConcurrency: 2,
    keepWarm: true,
    url: true,
    variables: [{ NODE_ENV: "production" }, { LOG_LEVEL: "info" }],
    secrets: [
      {
        key: "DATABASE_URL",
        resource:
          "arn:aws:secretsmanager:us-east-1:123456789012:secret:/myapp/db-abc123",
      },
    ],
  },
};

new Lambda(new Cdk.App(), "myapp-api-prod-stack", config);
```

### Container Deployment

```typescript
import { Cdk, Lambda, type LambdaProps } from "@thunder-so/thunder";

const config: LambdaProps = {
  env: { account: "123456789012", region: "us-east-1" },
  application: "myapp",
  service: "api",
  environment: "prod",
  rootDir: ".",

  domain: "api.example.com",
  regionalCertificateArn:
    "arn:aws:acm:us-east-1:123456789012:certificate/abc-123",
  hostedZoneId: "Z1234567890ABC",

  functionProps: {
    dockerFile: "Dockerfile",
    dockerBuildArgs: ["NODE_ENV=production"],
    memorySize: 1792,
    timeout: 10,
    tracing: true,
    keepWarm: true,
    variables: [{ NODE_ENV: "production" }],
    secrets: [
      {
        key: "DATABASE_URL",
        resource:
          "arn:aws:secretsmanager:us-east-1:123456789012:secret:/myapp/db-abc123",
      },
    ],
  },
};

new Lambda(new Cdk.App(), "myapp-api-prod-stack", config);
```

## Property Reference

### Identity (`AppProps`)

| Property      | Type      | Required | Default | Description            |
| ------------- | --------- | -------- | ------- | ---------------------- |
| `env.account` | `string`  | Yes      | -       | AWS account ID         |
| `env.region`  | `string`  | Yes      | -       | AWS region             |
| `application` | `string`  | Yes      | -       | Project name           |
| `service`     | `string`  | Yes      | -       | Service name           |
| `environment` | `string`  | Yes      | -       | Environment label      |
| `rootDir`     | `string`  | No       | `.`     | Root of your app       |
| `debug`       | `boolean` | No       | `false` | Enable verbose logging |

### Custom Domain

| Property                 | Type     | Description                                                          |
| ------------------------ | -------- | -------------------------------------------------------------------- |
| `domain`                 | `string` | Public domain, e.g. `api.example.com`                                |
| `regionalCertificateArn` | `string` | ACM certificate ARN - **must be in the same region as the function** |
| `hostedZoneId`           | `string` | Route53 hosted zone ID                                               |

### `functionProps`

#### Zip Deployment

| Property       | Type           | Default                         | Description                                                                                                 |
| -------------- | -------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `runtime`      | `Runtime`      | `NODEJS_20_X`                   | Lambda runtime. See [supported runtimes](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html) |
| `architecture` | `Architecture` | `ARM_64`                        | `ARM_64` or `X86_64`. ARM is cheaper and often faster                                                       |
| `codeDir`      | `string`       | `.`                             | Directory containing your built handler, relative to `rootDir`                                              |
| `handler`      | `string`       | `index.handler`                 | Handler in `file.export` format                                                                             |
| `include`      | `string[]`     | -                               | Extra files to copy into `codeDir` before packaging (e.g. `package.json`)                                   |
| `exclude`      | `string[]`     | `['**/*.svg', '**/*.map', ...]` | Glob patterns to exclude from the zip                                                                       |

#### Container Deployment

| Property          | Type       | Description                                                            |
| ----------------- | ---------- | ---------------------------------------------------------------------- |
| `dockerFile`      | `string`   | Path to Dockerfile relative to `rootDir`. Enables container mode.      |
| `dockerBuildArgs` | `string[]` | Build args in `KEY=VALUE` format, passed to `docker build --build-arg` |

When `dockerFile` is set, `runtime`, `architecture`, `codeDir`, `handler`, `include`, and `exclude` are ignored.

#### Performance

| Property     | Type      | Default | Description                                                                                                |
| ------------ | --------- | ------- | ---------------------------------------------------------------------------------------------------------- |
| `memorySize` | `number`  | `1792`  | Memory in MB. Also controls proportional CPU allocation. [Pricing](https://aws.amazon.com/lambda/pricing/) |
| `timeout`    | `number`  | `10`    | Max execution time in seconds (max 900)                                                                    |
| `tracing`    | `boolean` | `false` | Enable [AWS X-Ray](https://aws.amazon.com/xray/) tracing                                                   |

#### Concurrency

| Property                 | Type     | Description                                                                                           |
| ------------------------ | -------- | ----------------------------------------------------------------------------------------------------- |
| `reservedConcurrency`    | `number` | Hard cap on simultaneous executions. Prevents the function from consuming all account concurrency.    |
| `provisionedConcurrency` | `number` | Pre-warmed instances. Eliminates cold starts for latency-sensitive workloads. Incurs additional cost. |

See [Lambda concurrency docs](https://docs.aws.amazon.com/lambda/latest/dg/configuration-concurrency.html).

#### Warm-up

| Property   | Type      | Default | Description                                                                                                                                 |
| ---------- | --------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `keepWarm` | `boolean` | `false` | Creates an EventBridge rule that pings the function every 5 minutes to prevent cold starts                                                  |
| `url`      | `boolean` | `false` | Enables a [Lambda Function URL](https://docs.aws.amazon.com/lambda/latest/dg/lambda-urls.html) (public, no auth) in addition to API Gateway |

#### Environment

| Property    | Type                                  | Description                                                                             |
| ----------- | ------------------------------------- | --------------------------------------------------------------------------------------- |
| `variables` | `Array<{ [key: string]: string }>`    | Plain environment variables                                                             |
| `secrets`   | `{ key: string; resource: string }[]` | Secrets Manager ARNs injected as env vars. Lambda is automatically granted read access. |

### VPC

| Property | Type               | Description                                                                                              |
| -------- | ------------------ | -------------------------------------------------------------------------------------------------------- |
| `vpc`    | `IVpc \| IVpcLink` | Attach the Lambda to an existing VPC. Useful for accessing RDS, ElastiCache, or other private resources. |

## API Gateway Details

- Uses [HTTP API](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api.html) (v2) - lower latency and cost than REST API
- Routes `GET` and `HEAD /{proxy+}` to the Lambda function
- No CORS preflight configured by default (add it in your handler if needed)
- Custom domain uses a regional endpoint with TLS 1.2

## Stack Outputs

| Output              | Description                                      |
| ------------------- | ------------------------------------------------ |
| `ApiGatewayUrl`     | API Gateway endpoint                             |
| `LambdaFunction`    | Lambda function name                             |
| `LambdaFunctionUrl` | Lambda Function URL (only if `url: true`)        |
| `Route53Domain`     | Custom domain URL (only if domain is configured) |

## Related

- [lambda-basic.md](./lambda-basic.md) - Quick start
- [lambda-containers.md](./lambda-containers.md) - Container images and Bun runtime with Lambda
