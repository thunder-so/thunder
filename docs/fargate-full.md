# ECS Fargate Configuration Reference

Complete reference for every option available in the `Fargate` construct. Covers container configuration, compute sizing, Nixpacks, secrets, custom domains, and VPC integration. For a quick start see [fargate-basic.md](./fargate-basic.md).

## Full Example

```typescript
import { Cdk, Fargate, type FargateProps } from "@thunder-so/thunder";

const config: FargateProps = {
  // Identity
  env: {
    account: "123456789012",
    region: "us-east-1",
  },
  application: "myapp",
  service: "api",
  environment: "prod",

  // Source
  rootDir: ".", // monorepo: e.g. 'apps/api'

  // Custom Domain
  domain: "api.example.com",
  regionalCertificateArn:
    "arn:aws:acm:us-east-1:123456789012:certificate/abc-123",
  hostedZoneId: "Z1234567890ABC",

  // Service
  serviceProps: {
    dockerFile: "Dockerfile",
    dockerBuildArgs: ["NODE_ENV=production"],
    architecture: Cdk.aws_ecs.CpuArchitecture.ARM64,
    cpu: 512,
    memorySize: 1024,
    port: 3000,
    desiredCount: 2,
    healthCheckPath: "/health",
    variables: [{ NODE_ENV: "production" }],
    secrets: [
      {
        key: "DATABASE_URL",
        resource:
          "arn:aws:secretsmanager:us-east-1:123456789012:secret:/myapp/db-abc123",
      },
    ],
  },

  // Build props (Nixpacks — used when no dockerFile is specified)
  // buildProps: {
  //   runtime_version: '22',
  //   installcmd: 'pnpm install',
  //   buildcmd: 'pnpm run build',
  //   startcmd: 'pnpm start',
  // },

  // VPC (optional)
  // vpc: existingVpc,

  // Debug
  debug: false,
};

new Fargate(new Cdk.App(), "myapp-api-prod-stack", config);
```

## Property Reference

### Identity (`AppProps`)

| Property      | Type      | Required | Default | Description                                     |
| ------------- | --------- | -------- | ------- | ----------------------------------------------- |
| `env.account` | `string`  | Yes      | -       | AWS account ID                                  |
| `env.region`  | `string`  | Yes      | -       | AWS region                                      |
| `application` | `string`  | Yes      | -       | Project name                                    |
| `service`     | `string`  | Yes      | -       | Service name                                    |
| `environment` | `string`  | Yes      | -       | Environment label                               |
| `rootDir`     | `string`  | No       | `.`     | Root of your app. Used as Docker build context. |
| `debug`       | `boolean` | No       | `false` | Enable verbose logging                          |

### Custom Domain

| Property                 | Type     | Description                                                         |
| ------------------------ | -------- | ------------------------------------------------------------------- |
| `domain`                 | `string` | Public domain, e.g. `api.example.com`                               |
| `regionalCertificateArn` | `string` | ACM certificate ARN - **must be in the same region as the service** |
| `hostedZoneId`           | `string` | Route53 hosted zone ID                                              |

When all three are provided: HTTPS listener is added, HTTP redirects to HTTPS, and a Route53 A record is created.

### `serviceProps`

#### Container

| Property          | Type              | Default      | Description                                       |
| ----------------- | ----------------- | ------------ | ------------------------------------------------- |
| `dockerFile`      | `string`          | `Dockerfile` | Path to Dockerfile relative to `rootDir`          |
| `dockerBuildArgs` | `string[]`        | -            | Build args in `KEY=VALUE` format                  |
| `architecture`    | `CpuArchitecture` | `X86_64`     | `ARM64` or `X86_64`. ARM64 is cheaper on Fargate. |
| `port`            | `number`          | `3000`       | Port your container listens on                    |
| `healthCheckPath` | `string`          | `/`          | HTTP path for ALB and ECS health checks           |

#### Compute

| Property       | Type     | Default | Description                                                                                                                                                 |
| -------------- | -------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cpu`          | `number` | `256`   | CPU units (256 = 0.25 vCPU). Must be a [valid Fargate combination](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-cpu-memory-error.html). |
| `memorySize`   | `number` | `512`   | Memory in MB. Must be valid for the chosen CPU.                                                                                                             |
| `desiredCount` | `number` | `1`     | Number of running task instances                                                                                                                            |

#### Environment

| Property    | Type                                  | Description                                                                                                   |
| ----------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `variables` | `Array<{ [key: string]: string }>`    | Plain environment variables injected into the container                                                       |
| `secrets`   | `{ key: string; resource: string }[]` | Secrets Manager ARNs injected as env vars at container start. Task role is granted read access automatically. |

### `buildProps` (Nixpacks)

Nixpacks is used automatically when no `dockerFile` is set in `serviceProps`.

| Property          | Type                                  | Default | Description                                            |
| ----------------- | ------------------------------------- | ------- | ------------------------------------------------------ |
| `runtime_version` | `string \| number`                    | `24`    | Node.js version for Nixpacks (`NIXPACKS_NODE_VERSION`) |
| `installcmd`      | `string`                              | auto    | Override install command                               |
| `buildcmd`        | `string`                              | auto    | Override build command                                 |
| `startcmd`        | `string`                              | auto    | Override start command                                 |
| `environment`     | `Array<{ [key: string]: string }>`    | -       | Build-time environment variables                       |
| `secrets`         | `{ key: string; resource: string }[]` | -       | Build-time secrets from Secrets Manager                |

### VPC

| Property | Type               | Description                                                                                                        |
| -------- | ------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `vpc`    | `IVpc \| IVpcLink` | Attach to an existing VPC. If not provided, a new VPC with 2 public subnets across 2 AZs is created automatically. |

## Networking Details

- Tasks run in **public subnets** with `assignPublicIp: true` (no NAT Gateway cost)
- A dedicated security group restricts inbound traffic to the ALB only
- The ALB security group allows all outbound traffic
- Health check: `wget` to `localhost:PORT/healthCheckPath`, 15s interval, 5s timeout, 3 retries, 60s grace period

## Load Balancer Details

- HTTP/1.1 and HTTP/2 supported
- HTTP (port 80) is always created; HTTPS (port 443) is added when a domain is configured
- HTTP → HTTPS redirect is automatic when HTTPS is enabled
- ALB name is derived from `application-service-environment`

## Stack Outputs

| Output            | Description                                      |
| ----------------- | ------------------------------------------------ |
| `LoadBalancerDNS` | ALB DNS name                                     |
| `Route53Domain`   | Custom domain URL (only if domain is configured) |

## CPU / Memory Valid Combinations

| CPU  | vCPU | Valid Memory Values (MB)        |
| ---- | ---- | ------------------------------- |
| 256  | 0.25 | 512, 1024, 2048                 |
| 512  | 0.5  | 1024, 2048, 3072, 4096          |
| 1024 | 1    | 2048–8192 (in 1024 increments)  |
| 2048 | 2    | 4096–16384 (in 1024 increments) |
| 4096 | 4    | 8192–30720 (in 1024 increments) |

## Estimated Cost

| Scenario                       | Monthly (no free tier, `us-east-1`) |
| ------------------------------ | ----------------------------------- |
| 1 task (0.25 vCPU / 512 MB)    | ~$33                                |
| 2 tasks (0.5 vCPU / 1 GB each) | ~$47                                |

The ALB (~$22/month) is the dominant fixed cost. See [Fargate pricing](https://aws.amazon.com/fargate/pricing/).

## Related

- [fargate-basic.md](./fargate-basic.md) - Quick start with Dockerfile
- [fargate-nixpacks.md](./fargate-nixpacks.md) - Auto-generate Dockerfiles with Nixpacks
