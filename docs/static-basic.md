# Deploy Static Sites and SPAs to AWS S3 + CloudFront

Host your frontend on AWS in minutes. Thunder's `Static` construct deploys your build output to [Amazon S3](https://aws.amazon.com/s3/) and serves it globally through a [CloudFront](https://aws.amazon.com/cloudfront/) CDN - with HTTPS, HTTP/3, Brotli compression, and security headers out of the box.

Works with any framework that produces a static output folder: Vite (React, Vue, Svelte, Solid), Next.js static export, Astro SSG, Gatsby, and more.

## AWS Resources

| Resource                                                                                                                                        | Purpose                                                              |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| [S3 Bucket](https://aws.amazon.com/s3/)                                                                                                         | Stores your build output. Private, accessed only via CloudFront OAC. |
| [CloudFront Distribution](https://aws.amazon.com/cloudfront/)                                                                                   | Global CDN. HTTP/3, TLS 1.2+, Brotli/Gzip compression.               |
| [Origin Access Control (OAC)](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html) | Secures S3 - no public bucket access.                                |
| [ACM Certificate](https://aws.amazon.com/certificate-manager/)                                                                                  | SSL/TLS for your custom domain (optional).                           |
| [Route53](https://aws.amazon.com/route53/)                                                                                                      | DNS A + AAAA records for IPv4/IPv6 (optional).                       |

## Prerequisites

- [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html) configured with credentials
- [AWS CDK](https://docs.aws.amazon.com/cdk/v2/guide/getting_started.html) bootstrapped in your target account/region:
  ```bash
  cdk bootstrap aws://YOUR_ACCOUNT_ID/us-east-1
  ```
- Your app's build output directory (e.g. `dist/`)

## Installation

```bash
bun add @thunder-so/thunder --development
# or
npm install @thunder-so/thunder --save-dev
```

## Stack File

Create `stack/dev.ts` (use separate files per environment):

```typescript
import { Cdk, Static, type StaticProps } from "@thunder-so/thunder";

const config: StaticProps = {
  env: {
    account: "123456789012",
    region: "us-east-1",
  },
  application: "myapp",
  service: "web",
  environment: "dev",

  rootDir: ".", // monorepo: e.g. 'apps/web'
  outputDir: "dist", // your framework's build output folder
};

new Static(
  new Cdk.App(),
  `${config.application}-${config.service}-${config.environment}-stack`,
  config,
);
```

## Deploy

```bash
npx cdk deploy --app "npx tsx stack/dev.ts" --profile default
```

After deployment, CDK outputs the CloudFront distribution URL:

```
Outputs:
myapp-web-dev-stack.DistributionUrl = https://d1234abcd.cloudfront.net
```

## Custom Domain (Optional)

To serve from your own domain you need:

1. A [Route53 Hosted Zone](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/AboutHZWorkingWith.html) for your domain
2. A [public ACM certificate](https://docs.aws.amazon.com/acm/latest/userguide/gs-acm-request-public.html) issued in **`us-east-1`** (required for CloudFront, regardless of your app's region)

```typescript
const config: StaticProps = {
  // ...
  domain: "app.example.com",
  globalCertificateArn:
    "arn:aws:acm:us-east-1:123456789012:certificate/abc-123",
  hostedZoneId: "Z1234567890ABC",
};
```

> The certificate **must** be in `us-east-1` because CloudFront is a global service.

## Configuration Reference

### Core

| Property      | Type      | Required | Description                                   |
| ------------- | --------- | -------- | --------------------------------------------- |
| `env.account` | `string`  | Yes      | AWS account ID                                |
| `env.region`  | `string`  | Yes      | AWS region                                    |
| `application` | `string`  | Yes      | Project identifier                            |
| `service`     | `string`  | Yes      | Service identifier                            |
| `environment` | `string`  | Yes      | Environment name (e.g. `prod`)                |
| `rootDir`     | `string`  | No       | Root of your app. Defaults to `.`             |
| `outputDir`   | `string`  | No       | Build output directory. Defaults to `dist`    |
| `debug`       | `boolean` | No       | Enables S3 access logs and CloudFront logging |

### Domain

| Property               | Type     | Description                               |
| ---------------------- | -------- | ----------------------------------------- |
| `domain`               | `string` | Custom domain, e.g. `app.example.com`     |
| `globalCertificateArn` | `string` | ACM certificate ARN (must be `us-east-1`) |
| `hostedZoneId`         | `string` | Route53 hosted zone ID                    |

### CloudFront Behavior

| Property           | Type       | Description                                                                                        |
| ------------------ | ---------- | -------------------------------------------------------------------------------------------------- |
| `errorPagePath`    | `string`   | Custom 404 page path, e.g. `/404.html`. Defaults to `/index.html`                                  |
| `allowHeaders`     | `string[]` | Headers to include in cache key and forward to origin                                              |
| `allowCookies`     | `string[]` | Cookies to include in cache key                                                                    |
| `allowQueryParams` | `string[]` | Query params to include in cache key                                                               |
| `denyQueryParams`  | `string[]` | Query params to strip from cache key (e.g. UTM params). Mutually exclusive with `allowQueryParams` |

## Default Security Headers

The distribution ships with a secure-by-default response headers policy:

| Header                      | Value                                                       |
| --------------------------- | ----------------------------------------------------------- |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload`              |
| `X-Frame-Options`           | `DENY`                                                      |
| `X-Content-Type-Options`    | `nosniff`                                                   |
| `Referrer-Policy`           | `strict-origin-when-cross-origin`                           |
| `Content-Security-Policy`   | `default-src 'self'; style-src https: 'unsafe-inline'; ...` |
| `X-XSS-Protection`          | `1; mode=block`                                             |

To add custom headers per path, see [static-edge-functions.md](./static-edge-functions.md).

## Destroy

```bash
npx cdk destroy --app "npx tsx stack/dev.ts" --profile default
```

> The S3 hosting bucket uses `RemovalPolicy.RETAIN` to prevent accidental data loss. Delete it manually from the AWS console if needed.

## Next Steps

- [static-edge-functions.md](./static-edge-functions.md) - Add redirects, rewrites, and custom headers via Lambda@Edge
- [static-full.md](./static-full.md) - Full configuration reference with all options
