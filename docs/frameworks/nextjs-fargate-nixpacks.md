# Deploy Next.js to AWS Fargate with Nixpacks

Run your Next.js app on [AWS ECS Fargate](https://aws.amazon.com/fargate/) without writing a Dockerfile. [Nixpacks](https://nixpacks.com/) auto-detects your project and generates an optimized container image.

## 1. Create a New Next.js Project

```bash
bunx create-next-app@latest my-nextjs-app
cd my-nextjs-app
```

Reference: [Next.js Installation Docs](https://nextjs.org/docs/getting-started/installation)

## 2. Install Nixpacks CLI

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

Reference: [Nixpacks Installation](https://nixpacks.com/docs/install)

## 3. Install Thunder

```bash
bun add @thunder-so/thunder --development
```

## 4. Create Stack File

Create `stack/prod.ts`:

```typescript
import { Cdk, Fargate, type FargateProps } from "@thunder-so/thunder";

const config: FargateProps = {
  env: {
    account: "123456789012",
    region: "us-east-1",
  },
  application: "myapp",
  service: "web",
  environment: "prod",
  rootDir: ".",

  serviceProps: {
    architecture: Cdk.aws_ecs.CpuArchitecture.ARM64,
    cpu: 512,
    memorySize: 1024,
    port: 3000,
    desiredCount: 1,
    healthCheckPath: "/",
  },

  buildProps: {
    runtime_version: "22",
    startcmd: "bun start",
  },
};

new Fargate(
  new Cdk.App(),
  `${config.application}-${config.service}-${config.environment}-stack`,
  config,
);
```

## 5. Deploy

```bash
npx cdk deploy --app "npx tsx stack/prod.ts" --profile default
```

Nixpacks generates a Dockerfile during `cdk synth`, then CDK builds and deploys it.

## Custom Domain with HTTPS

```typescript
const config: FargateProps = {
  // ...
  domain: "app.example.com",
  regionalCertificateArn:
    "arn:aws:acm:us-east-1:123456789012:certificate/abc-123",
  hostedZoneId: "Z1234567890ABC",
};
```

## Environment Variables

```typescript
serviceProps: {
  // ...
  variables: [
    { NODE_ENV: 'production' },
  ],
  secrets: [
    { key: 'DATABASE_URL', resource: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:/myapp/db-abc123' },
  ],
},
```

## Related

- [fargate-nixpacks.md](../fargate-nixpacks.md) - Nixpacks reference
- [nextjs-fargate-dockerfile.md](./nextjs-fargate-dockerfile.md) - Next.js with custom Dockerfile
