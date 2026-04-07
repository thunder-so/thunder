# Deploy SvelteKit to AWS Lambda + S3 + CloudFront

Deploy your SvelteKit app with server-side rendering to AWS using Thunder's `SvelteKit` construct. This creates a hybrid architecture: [Lambda](https://aws.amazon.com/lambda/) handles SSR and API routes, [S3](https://aws.amazon.com/s3/) hosts static assets, and [CloudFront](https://aws.amazon.com/cloudfront/) unifies both.

## 1. Create a New SvelteKit Project

```bash
bunx sv create my-sveltekit-app
cd my-sveltekit-app
```

Reference: [SvelteKit Creating a Project](https://svelte.dev/docs/kit/creating-a-project)

## 2. Install Lambda Adapter

```bash
bun add -D @foladayo/sveltekit-adapter-lambda
```

## 3. Configure SvelteKit for AWS Lambda

Edit `svelte.config.js`:

```javascript
import adapter from "@foladayo/sveltekit-adapter-lambda";

export default {
  kit: {
    adapter: adapter({
      precompress: false,
      serveStatic: true, // Required: serves prerendered pages
    }),
  },
};
```

Reference: [@foladayo/sveltekit-adapter-lambda](https://www.npmjs.com/package/@foladayo/sveltekit-adapter-lambda)

## 4. Build Your App

```bash
bun run build
```

This generates:

- `build/` - Lambda handler (flat structure)
- `build/client/` - Static assets for S3

## 5. Install Thunder

```bash
bun add @thunder-so/thunder --development
```

## 6. Create Stack File

Create `stack/prod.ts`:

```typescript
import { Cdk, SvelteKit, type SvelteKitProps } from "@thunder-so/thunder";

const config: SvelteKitProps = {
  env: {
    account: "123456789012",
    region: "us-east-1",
  },
  application: "myapp",
  service: "web",
  environment: "prod",
  rootDir: ".",
};

new SvelteKit(
  new Cdk.App(),
  `${config.application}-${config.service}-${config.environment}-stack`,
  config,
);
```

## 7. Deploy

```bash
npx cdk deploy --app "npx tsx stack/prod.ts" --profile default
```

## Custom Domain

```typescript
const config: SvelteKitProps = {
  // ...
  domain: "app.example.com",
  hostedZoneId: "Z1234567890ABC",
  globalCertificateArn:
    "arn:aws:acm:us-east-1:123456789012:certificate/abc-123",
  regionalCertificateArn:
    "arn:aws:acm:us-east-1:123456789012:certificate/def-456",
};
```

## Environment Variables

```typescript
serverProps: {
  variables: [
    { NODE_ENV: 'production' },
  ],
  secrets: [
    { key: 'DATABASE_URL', resource: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:/myapp/db-abc123' },
  ],
},
```

## Important Notes

- **`serveStatic: true` is required** - Without it, prerendered pages return 404
- **`package.json` is auto-included** - The build output uses ESM and needs `"type": "module"`
- **Requires Node.js 22+** - Use `Runtime.NODEJS_22_X`

## Related

- [serverless.md](../serverless.md) - Serverless construct overview
- [lambda-basic.md](../lambda-basic.md) - Lambda construct reference
