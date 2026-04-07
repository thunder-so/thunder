# Serverless Meta-Framework Architecture

Thunder provides a unified serverless deployment pattern for all SSR meta-frameworks via a single `ServerlessStack` with framework-specific thin wrappers.

---

## Architecture Overview

```
CloudFront Distribution
├── Default behavior  → API Gateway → Lambda (SSR)
├── /api/*            → API Gateway → Lambda (SSR, no cache)
└── *.*               → S3 Bucket (static assets, long-lived cache)
```

All frameworks share the same three constructs:

- `ServerlessServer` — Lambda + API Gateway
- `ServerlessClient` — S3 + CloudFront + optional Lambda@Edge fallback
- `ServerlessPipeline` — CodePipeline CI/CD (optional)

---

## File Structure

```
lib/serverless/
├── server.ts              # ServerlessServer construct
├── client.ts              # ServerlessClient construct
├── pipeline.ts            # ServerlessPipeline construct
├── index.ts               # Re-exports all framework stacks + constructs
└── frameworks/
    ├── index.ts
    ├── nuxt.ts
    ├── astro.ts
    ├── tanstack-start.ts
    ├── sveltekit.ts
    ├── solid-start.ts
    └── analogjs.ts

stacks/ServerlessStack.ts  # Orchestrator stack
types/ServerlessProps.ts   # All TypeScript interfaces
lib/utils/framework-config.ts  # Framework presets registry
```

---

## Props Interface

```typescript
// types/ServerlessProps.ts

interface ServerlessProps
  extends AppProps, PipelineWithRuntimeProps, CloudFrontProps {
  domain?: string;
  hostedZoneId?: string;
  globalCertificateArn?: string; // CloudFront cert (must be us-east-1)
  regionalCertificateArn?: string; // API Gateway cert (regional)
  serverProps?: ServerlessServerProps;
  clientProps?: ServerlessClientProps;
}

interface ServerlessServerProps {
  codeDir?: string; // Server bundle dir (framework default if omitted)
  handler?: string; // Lambda handler (framework default if omitted)
  runtime?: Runtime; // Default: NODEJS_20_X
  architecture?: Architecture; // Default: ARM_64
  memorySize?: number; // Default: 1792
  timeout?: number; // Default: 10s
  reservedConcurrency?: number;
  provisionedConcurrency?: number;
  dockerFile?: string; // Enables container mode when set
  dockerBuildArgs?: Record<string, string | number>;
  include?: string[]; // Files copied into codeDir before deploy
  exclude?: string[];
  variables?: Array<Record<string, string>>;
  secrets?: Array<{ key: string; resource: string }>;
  paths?: string[]; // CloudFront paths routed to Lambda (default: ['/api/*'])
  keepWarm?: boolean; // EventBridge ping every 5 min
  tracing?: boolean; // X-Ray tracing
  streaming?: boolean; // (prop exists, not yet wired to API GW streaming)
}

interface ServerlessClientProps {
  outputDir?: string; // Static assets dir (framework default if omitted)
  include?: string[];
  exclude?: string[];
  useFallbackEdge?: boolean; // Lambda@Edge 404/403 fallback (Astro only)
}

interface FrameworkConfig {
  name: string;
  defaultServerDir: string;
  defaultClientDir: string;
  defaultHandler: string;
  defaultServerPaths: string[];
  requiresFallbackEdge: boolean;
  nitroPreset?: string;
  adapterRequired?: boolean;
  defaultIncludes?: string[]; // Files auto-included in Lambda ZIP (e.g. package.json for SvelteKit)
}
```

All framework-specific types (`NuxtProps`, `AstroProps`, `TanStackStartProps`, etc.) are type aliases for `ServerlessProps`.

---

## Framework Configs

Defined in `lib/utils/framework-config.ts`:

| Framework        | Server Dir           | Client Dir           | Handler         | Edge Fallback | Notes                                                                        |
| ---------------- | -------------------- | -------------------- | --------------- | ------------- | ---------------------------------------------------------------------------- |
| `nuxt`           | `.output/server`     | `.output/public`     | `index.handler` | No            | `NITRO_PRESET=aws-lambda`                                                    |
| `astro`          | `dist/lambda`        | `dist/client`        | `entry.handler` | Yes           | Lambda@Edge for SPA routing                                                  |
| `tanstack-start` | `.output/server`     | `.output/public`     | `index.handler` | No            | Must set `preset: 'aws-lambda'` explicitly                                   |
| `sveltekit`      | `build`              | `build/client`       | `index.handler` | No            | `defaultIncludes: ['package.json']`; requires `serveStatic: true` in adapter |
| `solid-start`    | `.output/server`     | `.output/public`     | `index.handler` | No            | Standard `aws-lambda` preset                                                 |
| `analogjs`       | `dist/analog/server` | `dist/analog/public` | `index.handler` | No            | Angular + Nitro                                                              |

`mergePropsWithDefaults()` merges framework config defaults with user-provided `serverProps`/`clientProps`, with user values taking precedence.

---

## ServerlessServer

**File**: `lib/serverless/server.ts`

Resolves `codeDir` as `contextDirectory + rootDir + serverProps.codeDir`.

**ZIP mode** (default): Creates a `Function` from `Code.fromAsset(codeDir)`.

**Container mode** (when `serverProps.dockerFile` is set):

- Copies the Dockerfile into `codeDir` via `includeFilesAndDirectories()`
- Creates a `DockerImageFunction` using `DockerImageCode.fromImageAsset(codeDir)`
- Passes `NODE_ENV` + any `dockerBuildArgs` as Docker build args

Both modes set `NITRO_PRESET=aws-lambda` and `NODE_OPTIONS=--enable-source-maps` as Lambda env vars.

**API Gateway**: HTTP API v2 with `/{proxy+}` route (GET, HEAD). Optionally creates a custom `DomainName` if `domain` + `regionalCertificateArn` are provided.

**Keep-warm**: EventBridge rule firing every 5 minutes with a fake API GW v2 event payload targeting the Lambda function.

**Provisioned concurrency**: Creates a `Version` + `Alias` (`live`) when `provisionedConcurrency` is set.

**Public properties**:

- `lambdaFunction: Function`
- `httpOrigin: HttpOrigin` (points to `<apiId>.execute-api.<region>.amazonaws.com`)

---

## ServerlessClient

**File**: `lib/serverless/client.ts`

**S3 bucket** (`<prefix>-assets`): versioned, SSE-S3, block public access, OAC-based access.

**Origin Access Control (OAC)**: Uses `CfnOriginAccessControl` + `S3BucketOrigin.withOriginAccessControl()`. Bucket policy uses `AnyPrincipal` with `AWS:SourceArn` condition scoped to the OAC ARN. This supports IPv6 (unlike legacy OAI).

**Lambda@Edge fallback** (when `clientProps.useFallbackEdge = true`):

- Inline Node.js function attached to `ORIGIN_RESPONSE` event
- On `404`: redirects to `<uri>/index.html` (for SPA routing)
- On `403`: returns a `404 Not Found`
- Used by Astro only

**CloudFront distribution**:

- `defaultBehavior`: routes to `httpOrigin` (Lambda via API GW), TTL 0–1s, security headers policy
- `*.*` behavior: routes to S3, `CACHING_OPTIMIZED` (long-lived)
- Per-path behaviors from `serverProps.paths` (default `/api/*`): routes to `httpOrigin`, `ALLOW_ALL` methods
- HTTP/3, TLS 1.2+, optional access logging (when `debug: true`)

**Cache policy** (server): TTL 0/0/1s. Forwards headers/cookies/query strings only if explicitly listed in `clientProps.allowHeaders` / `allowCookies` / `allowQueryParams` / `denyQueryParams`. Also reads top-level `CloudFrontProps` fields for backward compat.

**Deployments**: `BucketDeployment` from `contextDirectory + rootDir + clientProps.outputDir`. Cache-control: `public, max-age=31536000, immutable`. Invalidates `/**` on deploy.

**DNS**: Route53 A + AAAA alias records pointing to CloudFront (when `domain` + `globalCertificateArn` + `hostedZoneId` are set).

**CfnOutputs**: `DistributionId`, `DistributionUrl`, `Route53Domain` (if domain set).

**Public properties**:

- `staticAssetsBucket: Bucket`
- `cdn: Distribution`
- `originAccessControl: CfnOriginAccessControl`

---

## ServerlessPipeline

**File**: `lib/serverless/pipeline.ts`

Triggered when `accessTokenSecretArn` + `sourceProps` are set on the stack.

**Stages**: Source (GitHub webhook) → Build (CodeBuild) → Deploy (CodeBuild).

**ZIP mode**:

- Build: install → build → `zip -r function.zip .` from `serverCodeDir`
- Deploy: `lambda update-function-code --zip-file`, `s3 sync`, CloudFront invalidation

**Container mode** (when `serverProps.dockerFile` is set):

- Creates an ECR repository (`<prefix>-ecr`, RETAIN on delete)
- Build: install → build → `docker build -f <dockerFile> <serverCodeDir>` → `docker push`
- Deploy: `lambda update-function-code --image-uri`, `s3 sync`, CloudFront invalidation

**Architecture**: ARM_64 → `LinuxArmBuildImage.AMAZON_LINUX_2023_STANDARD_3_0`; X86_64 → `LinuxBuildImage.STANDARD_7_0`.

**EventBridge**: `EventsConstruct` is always created, forwarding pipeline state changes to `eventTarget` if set.

**CfnOutput**: `CodePipelineName`.

---

## ServerlessStack (Orchestrator)

**File**: `stacks/ServerlessStack.ts`

```typescript
export interface ServerlessStackProps extends ServerlessProps {
  framework: string; // e.g. 'nuxt', 'astro', 'tanstack-start'
}
```

1. Calls `getFrameworkConfig(framework)` + `mergePropsWithDefaults()` to apply framework defaults
2. Creates `ServerlessServer` → exposes `lambdaFunction`, `httpOrigin`
3. Creates `ServerlessClient` with `httpOrigin` passed in
4. Optionally creates `ServerlessPipeline` (when `accessTokenSecretArn` + `sourceProps` present)
5. Creates `MetadataConstruct` with `stackType = framework`, resources = `DistributionId`, `DistributionUrl`, `LambdaFunctionArn`, `Route53Domain`, `CodePipelineName`

---

## Framework Wrappers

Each file in `lib/serverless/frameworks/` is a one-liner that calls `ServerlessStack` with the framework key:

```typescript
// frameworks/nuxt.ts
export class Nuxt extends ServerlessStack {
  constructor(scope, id, props: ServerlessProps) {
    super(scope, id, { ...props, framework: "nuxt" });
  }
}
```

All six frameworks follow this exact pattern.

---

## Framework-Specific Build Notes

### TanStack Start

- Must explicitly set `preset: 'aws-lambda'` — the default is `node-server` (not Lambda-compatible)
- Two plugin variants: `nitro({ preset: 'aws-lambda' })` from `nitro/vite`, or `nitroV2Plugin({ preset: 'aws-lambda' })` from `@tanstack/nitro-v2-vite-plugin`
- Without the preset, Lambda errors with `Runtime.HandlerNotFound: index.handler is undefined or not exported`

### SvelteKit

- Use `@foladayo/sveltekit-adapter-lambda` with `serveStatic: true` — without it, prerendered routes return 404
- Root `package.json` must be included in the Lambda ZIP (`defaultIncludes: ['package.json']` in framework config) — the ESM build requires `"type": "module"` to load
- Requires Node.js 22+ runtime

### Astro

- Uses `@astro-aws/adapter` (`output: 'server'`)
- Lambda@Edge fallback is required for SPA-style client routing (`requiresFallbackEdge: true`)
- Handler is `entry.handler` (not `index.handler`)

### Nuxt

- Set `NITRO_PRESET=aws-lambda` (also injected automatically by the construct)

### Solid Start

- Use standard `aws-lambda` preset; `aws-lambda-streaming` is experimental and not compatible with standard HTTP API Gateway

### AnalogJS

```typescript
// vite.config.ts
analog({ nitro: { preset: "aws-lambda" } });
```

---

## Container Mode Dockerfiles

When `serverProps.dockerFile` is set, the construct copies the Dockerfile into `codeDir` and builds a container Lambda. All frameworks use the same pattern:

```dockerfile
FROM public.ecr.aws/lambda/nodejs:24
COPY . ./
CMD ["index.handler"]   # or "entry.handler" for Astro
```

The build context is `codeDir` (the server output directory), so `COPY . ./` picks up the entire server bundle.

---

## CloudFront Routing Summary

| Path pattern                 | Origin               | Cache                        | Methods            |
| ---------------------------- | -------------------- | ---------------------------- | ------------------ |
| `*.*` (static assets)        | S3 via OAC           | `CACHING_OPTIMIZED` (1 year) | GET, HEAD, OPTIONS |
| `/api/*` (or custom `paths`) | API Gateway → Lambda | TTL 0–1s                     | ALL                |
| `/**` (default, SSR)         | API Gateway → Lambda | TTL 0–1s                     | GET, HEAD          |

Lambda@Edge (Astro only) runs on `ORIGIN_RESPONSE` for the default behavior.
