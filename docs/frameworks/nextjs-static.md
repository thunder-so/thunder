# Deploy Next.js Static Export to AWS S3 + CloudFront

Host your Next.js app as a static site on AWS using Thunder's `Static` construct. This guide covers static export mode - no server required, just HTML, CSS, and JavaScript served from [S3](https://aws.amazon.com/s3/) through [CloudFront](https://aws.amazon.com/cloudfront/).

Perfect for marketing sites, blogs, documentation, and SPAs that don't need server-side rendering.

## 1. Create a New Next.js Project

```bash
bunx create-next-app@latest my-nextjs-app
cd my-nextjs-app
```

When prompted:

- TypeScript: Yes
- ESLint: Yes
- Tailwind CSS: Yes (optional)
- `src/` directory: No (optional)
- App Router: Yes
- Turbopack: Yes (optional)
- Import alias: `@/*` (default)

Reference: [Next.js Installation Docs](https://nextjs.org/docs/getting-started/installation)

## 2. Configure Static Export

Edit `next.config.ts`:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  // Optional: change output directory from 'out' to 'dist'
  distDir: "dist",
};

export default nextConfig;
```

Reference: [Next.js Static Exports](https://nextjs.org/docs/app/guides/static-exports)

## 3. Build Your App

```bash
bun run build
```

This generates static files in the `dist/` directory (or `out/` if you didn't set `distDir`).

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
    account: "123456789012", // Your AWS account ID
    region: "us-east-1",
  },
  application: "myapp",
  service: "web",
  environment: "prod",

  rootDir: ".",
  outputDir: "dist", // Match your next.config.ts distDir
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

CDK outputs the CloudFront URL:

```
Outputs:
myapp-web-prod-stack.DistributionUrl = https://d1234abcd.cloudfront.net
```

## Custom Domain (Optional)

1. [Create a Route53 Hosted Zone](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/AboutHZWorkingWith.html)
2. [Request an ACM certificate](https://docs.aws.amazon.com/acm/latest/userguide/gs-acm-request-public.html) in **`us-east-1`**

Update your stack:

```typescript
const config: StaticProps = {
  // ...
  domain: "app.example.com",
  globalCertificateArn:
    "arn:aws:acm:us-east-1:123456789012:certificate/abc-123",
  hostedZoneId: "Z1234567890ABC",
};
```

## Redirects and Rewrites

Add URL redirects or rewrites using Lambda@Edge:

```typescript
const config: StaticProps = {
  // ...
  redirects: [{ source: "/old-page", destination: "/new-page" }],
  rewrites: [
    { source: "/app/*", destination: "/index.html" }, // SPA fallback
  ],
};
```

See [static-edge-functions.md](../static-edge-functions.md) for pattern syntax.

## Custom Headers

Add security or cache headers:

```typescript
const config: StaticProps = {
  // ...
  headers: [
    {
      path: "/assets/*",
      name: "Cache-Control",
      value: "public, max-age=31536000, immutable",
    },
  ],
};
```

## Limitations of Static Export

Next.js static export doesn't support:

- Server-side rendering (SSR)
- API routes
- Image optimization (use `unoptimized: true` in `next.config.ts`)
- Incremental Static Regeneration (ISR)
- Dynamic routes without `generateStaticParams`

For these features, use [Next.js on Fargate](./nextjs-fargate-dockerfile.md) instead.

## Related

- [static-basic.md](../static-basic.md) - Static construct reference
- [static-edge-functions.md](../static-edge-functions.md) - Redirects, rewrites, headers
- [static-full.md](../static-full.md) - Full configuration reference
- [nextjs-fargate-dockerfile.md](./nextjs-fargate-dockerfile.md) - Next.js with SSR on Fargate
