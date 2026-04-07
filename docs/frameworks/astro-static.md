# Deploy Astro Static Site to AWS S3 + CloudFront

Host your Astro site as a static site on AWS using Thunder's `Static` construct. This guide covers static site generation (SSG) mode - HTML, CSS, and JavaScript served from [S3](https://aws.amazon.com/s3/) through [CloudFront](https://aws.amazon.com/cloudfront/).

## 1. Create a New Astro Project

```bash
bunx create-astro@latest my-astro-site
cd my-astro-site
```

When prompted:

- Template: Choose any (e.g., "Empty", "Blog", "Portfolio")
- TypeScript: Yes (recommended)
- Install dependencies: Yes
- Git repository: Yes (optional)

Reference: [Astro Installation Docs](https://docs.astro.build/en/install-and-setup/)

## 2. Configure Static Output

Edit `astro.config.mjs`:

```javascript
import { defineConfig } from "astro/config";

export default defineConfig({
  output: "static", // Default, but explicit is better
});
```

Reference: [Astro Static Exports](https://docs.astro.build/en/guides/deploy/)

## 3. Build Your App

```bash
bun run build
```

This generates static files in the `dist/` directory.

## 4. Install Thunder

```bash
bun add @thunder-so/thunder --development
```

## 5. Create Stack File

Create `stack/prod.ts`:

```typescript
import { Cdk, Static, type StaticProps } from "@thunder-so/thunder";

const config: StaticProps = {
  env: {
    account: "123456789012",
    region: "us-east-1",
  },
  application: "myapp",
  service: "web",
  environment: "prod",
  rootDir: ".",
  outputDir: "dist",
};

new Static(
  new Cdk.App(),
  `${config.application}-${config.service}-${config.environment}-stack`,
  config,
);
```

## 6. Deploy

```bash
npx cdk deploy --app "npx tsx stack/prod.ts" --profile default
```

## Custom Domain

```typescript
const config: StaticProps = {
  // ...
  domain: "site.example.com",
  globalCertificateArn:
    "arn:aws:acm:us-east-1:123456789012:certificate/abc-123",
  hostedZoneId: "Z1234567890ABC",
};
```

## Redirects and Rewrites

```typescript
const config: StaticProps = {
  // ...
  redirects: [{ source: "/old-page", destination: "/new-page" }],
  rewrites: [{ source: "/blog/*", destination: "/posts/*" }],
};
```

## Related

- [static-basic.md](../static-basic.md) - Static construct reference
- [astro-serverless.md](./astro-serverless.md) - Astro with SSR on Lambda
