# Auto-generate Dockerfiles for Fargate with Nixpacks

Skip writing a `Dockerfile` entirely. [Nixpacks](https://nixpacks.com/) inspects your project, detects the language and framework, and generates an optimized container image automatically. Thunder runs Nixpacks during `cdk synth` and uses the result as your Fargate container.

Works with Node.js, Python, Go, Ruby, Rust, PHP, Java, Deno, and more.

## How It Works

When no `dockerFile` is specified in `serviceProps`, Thunder automatically runs the Nixpacks CLI during `cdk synth` to generate a `.nixpacks/Dockerfile` in your project root. That generated Dockerfile is then used as the container image for your Fargate task.

The flow:

1. `cdk deploy` triggers synth
2. Thunder runs `nixpacks build --out .` in your `rootDir`
3. Nixpacks detects your runtime (Node, Python, Go, etc.) and generates `.nixpacks/Dockerfile`
4. CDK builds and pushes the image to ECR using that Dockerfile
5. Fargate pulls and runs the image

## Prerequisites

Install the [Nixpacks CLI](https://nixpacks.com/docs/install):

```bash
# macOS / Linux
curl -sSL https://nixpacks.com/install.sh | bash

# or via npm
npm install -g nixpacks
```

Verify:

```bash
nixpacks --version
```

## Basic Example

```typescript
import { Cdk, Fargate, type FargateProps } from "@thunder-so/thunder";

const config: FargateProps = {
  env: { account: "123456789012", region: "us-east-1" },
  application: "myapp",
  service: "api",
  environment: "prod",
  rootDir: ".",

  serviceProps: {
    port: 3000,
    cpu: 512,
    memorySize: 1024,
    desiredCount: 1,
  },
};

new Fargate(new Cdk.App(), "myapp-api-prod-stack", config);
```

## Custom Commands

Override Nixpacks' auto-detected commands:

```typescript
buildProps: {
  installcmd: 'pnpm install',
  buildcmd: 'pnpm run build',
  startcmd: 'pnpm start',
},
```

If not set, Nixpacks auto-detects the best commands for your project based on `package.json`, `Pipfile`, `go.mod`, etc.

## Node.js Version

Control the Node.js version via `runtime_version`:

```typescript
buildProps: {
  runtime_version: '22',  // sets NIXPACKS_NODE_VERSION
},
```

## Build Environment Variables

Pass environment variables into the Nixpacks build:

```typescript
buildProps: {
  environment: [
    { VITE_API_URL: 'https://api.example.com' },
  ],
},
```

## Build Secrets

Inject secrets from AWS Secrets Manager into the build environment:

```typescript
buildProps: {
  secrets: [
    { key: 'NPM_TOKEN', resource: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:/myapp/NPM_TOKEN-abc123' },
  ],
},
```

## Full Example with Domain

```typescript
import { Cdk, Fargate, type FargateProps } from "@thunder-so/thunder";

const config: FargateProps = {
  env: { account: "123456789012", region: "us-east-1" },
  application: "myapp",
  service: "web",
  environment: "prod",
  rootDir: ".",

  domain: "app.example.com",
  regionalCertificateArn:
    "arn:aws:acm:us-east-1:123456789012:certificate/abc-123",
  hostedZoneId: "Z1234567890ABC",

  serviceProps: {
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

  buildProps: {
    runtime_version: "22",
    startcmd: "node dist/server.js",
  },
};

new Fargate(new Cdk.App(), "myapp-web-prod-stack", config);
```

## Supported Languages & Frameworks

Nixpacks auto-detects and supports:

- **Node.js** - npm, pnpm, yarn, bun
- **Python** - pip, pipenv, poetry
- **Go**
- **Ruby** - bundler
- **Rust** - cargo
- **PHP** - composer
- **Java** - maven, gradle
- **Deno**

See the full list in the [Nixpacks documentation](https://nixpacks.com/docs/providers).

## Nixpacks Configuration File

For advanced control, add a `nixpacks.toml` to your project root:

```toml
# nixpacks.toml
[phases.install]
cmds = ["pnpm install --frozen-lockfile"]

[phases.build]
cmds = ["pnpm run build"]

[start]
cmd = "node dist/server.js"
```

See [Nixpacks configuration docs](https://nixpacks.com/docs/configuration/file).

## Troubleshooting

**`nixpacks: command not found`** - Install the CLI before running `cdk deploy`. Thunder calls it during synth.

**Wrong Node version** - Set `runtime_version` in `buildProps` or add a `.node-version` / `.nvmrc` file to your project root.

**Build fails** - Run `nixpacks build .` locally first to debug. The generated Dockerfile is at `.nixpacks/Dockerfile`.

**Port mismatch** - Ensure `serviceProps.port` matches the port your app listens on. Nixpacks sets `PORT` as an env var; use `process.env.PORT` in your app.

## Related

- [fargate-basic.md](./fargate-basic.md) - Basic Dockerfile-based deployment
- [fargate-full.md](./fargate-full.md) - Full configuration reference
