# Static Hosting Configuration Reference

Complete reference for every option available in the `Static` construct. Covers S3, CloudFront, Lambda@Edge, custom domains, and cache behavior. For a quick start see [static-basic.md](./static-basic.md).

## Full Example

```typescript
import { Cdk, Static, type StaticProps } from "@thunder-so/thunder";

const config: StaticProps = {
  // Identity
  env: {
    account: "123456789012",
    region: "us-east-1",
  },
  application: "myapp",
  service: "web",
  environment: "prod",

  // Source
  rootDir: ".", // monorepo: e.g. 'apps/web'
  outputDir: "dist", // build output folder

  // Custom Domain
  domain: "app.example.com",
  globalCertificateArn:
    "arn:aws:acm:us-east-1:123456789012:certificate/abc-123",
  hostedZoneId: "Z1234567890ABC",

  // CloudFront Behavior
  errorPagePath: "/404.html",
  allowHeaders: ["Accept-Language"],
  allowCookies: ["session-*"],
  allowQueryParams: ["lang", "theme"],
  // denyQueryParams: ['utm_source', 'fbclid'],  // mutually exclusive with allowQueryParams

  // Lambda@Edge
  redirects: [
    { source: "/old", destination: "/new" },
    { source: "/blog/:year/:month", destination: "/posts/:year/:month" },
  ],
  rewrites: [{ source: "/app/*", destination: "/index.html" }],
  headers: [
    {
      path: "/assets/*",
      name: "Cache-Control",
      value: "public, max-age=31536000, immutable",
    },
    { path: "/**", name: "X-Frame-Options", value: "SAMEORIGIN" },
  ],

  // Debug
  debug: false,
};

new Static(new Cdk.App(), "myapp-web-prod-stack", config);
```

## Property Reference

### Identity (`AppProps`)

| Property           | Type      | Required | Default | Description                                   |
| ------------------ | --------- | -------- | ------- | --------------------------------------------- |
| `env.account`      | `string`  | Yes      | -       | AWS account ID                                |
| `env.region`       | `string`  | Yes      | -       | AWS region                                    |
| `application`      | `string`  | Yes      | -       | Project name, used in resource naming         |
| `service`          | `string`  | Yes      | -       | Service name, used in resource naming         |
| `environment`      | `string`  | Yes      | -       | Environment label, e.g. `prod`, `dev`         |
| `rootDir`          | `string`  | No       | `.`     | Root of your app. Supports monorepos          |
| `contextDirectory` | `string`  | No       | -       | CDK context directory override                |
| `debug`            | `boolean` | No       | `false` | Enables S3 access logs and CloudFront logging |

### Source

| Property    | Type     | Required | Default | Description                                   |
| ----------- | -------- | -------- | ------- | --------------------------------------------- |
| `outputDir` | `string` | No       | `dist`  | Build output directory, relative to `rootDir` |

### Custom Domain (`DomainProps`)

| Property               | Type     | Description                                      |
| ---------------------- | -------- | ------------------------------------------------ |
| `domain`               | `string` | Public domain, e.g. `app.example.com`            |
| `globalCertificateArn` | `string` | ACM certificate ARN - **must be in `us-east-1`** |
| `hostedZoneId`         | `string` | Route53 hosted zone ID                           |

All three must be provided together for DNS to be configured.

### CloudFront (`CloudFrontProps`)

| Property           | Type       | Default       | Description                                                                |
| ------------------ | ---------- | ------------- | -------------------------------------------------------------------------- |
| `errorPagePath`    | `string`   | `/index.html` | Path served for 404 errors                                                 |
| `allowHeaders`     | `string[]` | `[]`          | Headers forwarded to origin and included in cache key                      |
| `allowCookies`     | `string[]` | `[]`          | Cookies forwarded to origin and included in cache key                      |
| `allowQueryParams` | `string[]` | `[]`          | Query params included in cache key                                         |
| `denyQueryParams`  | `string[]` | `[]`          | Query params stripped from cache key. Ignored if `allowQueryParams` is set |

### Lambda@Edge (`EdgeProps`)

| Property    | Type                                              | Description                                                        |
| ----------- | ------------------------------------------------- | ------------------------------------------------------------------ |
| `redirects` | `{ source: string; destination: string }[]`       | 301 redirects. Supports wildcards (`*`) and placeholders (`:name`) |
| `rewrites`  | `{ source: string; destination: string }[]`       | Internal path rewrites. Same pattern syntax as redirects           |
| `headers`   | `{ path: string; name: string; value: string }[]` | Custom response headers per path pattern                           |

See [static-edge-functions.md](./static-edge-functions.md) for pattern syntax and examples.

## CloudFront Distribution Details

- **Protocol:** HTTP/3 with HTTP/2 fallback
- **TLS:** Minimum TLS 1.2 (2021 security policy)
- **Compression:** Brotli and Gzip enabled
- **Default cache TTL:** 1 minute for HTML, optimized long-term caching for static assets (`*.js`, `*.css`, `*.png`, etc.)
- **Static asset patterns** (`*.js`, `*.css`, `*.png`, `*.jpg`, `*.jpeg`, `*.gif`, `*.ico`) use `CachePolicy.CACHING_OPTIMIZED` with CORS headers
- **OAC:** S3 bucket is fully private; CloudFront accesses it via SigV4-signed Origin Access Control

## S3 Bucket Details

- Versioning enabled
- Server-side encryption (S3-managed)
- All public access blocked
- `RemovalPolicy.RETAIN` - the bucket is **not** deleted when the stack is destroyed

## Stack Outputs

| Output            | Description                                                 |
| ----------------- | ----------------------------------------------------------- |
| `DistributionId`  | CloudFront distribution ID                                  |
| `DistributionUrl` | CloudFront distribution URL (`https://xxxx.cloudfront.net`) |
| `Route53Domain`   | Custom domain URL (only if `domain` is set)                 |

## Supported Frameworks

Any framework that produces a static output directory works:

| Framework                                                                                 | Output Dir | Notes                                           |
| ----------------------------------------------------------------------------------------- | ---------- | ----------------------------------------------- |
| [Vite](https://vite.dev/) (React, Vue, Svelte, Solid)                                     | `dist`     | Default                                         |
| [Next.js](https://nextjs.org/docs/app/building-your-application/deploying/static-exports) | `out`      | Requires `output: 'export'` in `next.config.js` |
| [Astro](https://docs.astro.build/en/guides/deploy/)                                       | `dist`     | SSG mode (`output: 'static'`)                   |
| [Gatsby](https://www.gatsbyjs.com/)                                                       | `public`   | -                                               |

## Related

- [static-basic.md](./static-basic.md) - Quick start
- [static-edge-functions.md](./static-edge-functions.md) - Redirects, rewrites, and custom headers
