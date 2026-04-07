# CloudFront Redirects, Rewrites, and Custom Headers with Lambda@Edge

Add URL redirects, path rewrites, and custom HTTP response headers to your CloudFront distribution - no origin round-trip required. Thunder deploys [Lambda@Edge](https://aws.amazon.com/lambda/edge/) functions automatically when you configure these options, running your rules at AWS edge locations worldwide.

Two functions are created:

| Function                  | CloudFront Event  | Purpose                                           |
| ------------------------- | ----------------- | ------------------------------------------------- |
| `RedirectRewriteFunction` | `viewer-request`  | Evaluates redirects and rewrites before the cache |
| `HeadersFunction`         | `viewer-response` | Injects custom headers into responses             |

> Lambda@Edge functions are always deployed to `us-east-1` and replicated globally by CloudFront.

## Redirects

A redirect returns an HTTP `301 Moved Permanently` response, causing the browser to navigate to a new URL. Use redirects when a URL has permanently moved.

```typescript
import { Cdk, Static, type StaticProps } from "@thunder-so/thunder";

const config: StaticProps = {
  // ...core config...

  redirects: [
    // Static redirect
    { source: "/home", destination: "/" },

    // Wildcard - captures everything after /guide/
    { source: "/guide/*", destination: "/docs/*" },

    // Named placeholders
    { source: "/blog/:year/:month", destination: "/posts/:year/:month" },
  ],
};
```

### Pattern Syntax

| Pattern      | Matches                                        |
| ------------ | ---------------------------------------------- |
| `/about`     | Exact path `/about`                            |
| `/blog/*`    | Any path starting with `/blog/`                |
| `/user/:id`  | `/user/123`, `/user/abc`, etc.                 |
| `/a/:x/b/:y` | `/a/foo/b/bar` → placeholders `x=foo`, `y=bar` |

Wildcards (`*`) and placeholders (`:name`) can be used in both `source` and `destination`. Placeholders are positional - they map by name between source and destination.

## Rewrites

A rewrite changes the path the request is forwarded to internally, without changing the URL in the browser. Use rewrites to serve a different file while keeping the original URL visible.

```typescript
const config: StaticProps = {
  // ...

  rewrites: [
    // Serve index.html for all app routes (SPA fallback)
    { source: "/app/*", destination: "/index.html" },

    // Map a vanity URL to a real path
    { source: "/profile/:username", destination: "/user/:username" },
  ],
};
```

### SPA Fallback Pattern

For client-side routed SPAs, rewrite all unmatched paths to `index.html`:

```typescript
rewrites: [
  { source: '/*', destination: '/index.html' },
],
```

> Rewrites run after redirects. If a path matches a redirect rule, the rewrite is never evaluated.

## Custom HTTP Headers

Use `headers` to inject or override HTTP response headers for specific path patterns. This runs at the `viewer-response` stage, so it applies to both cached and uncached responses.

```typescript
const config: StaticProps = {
  // ...

  headers: [
    // Cache HTML for 10 minutes
    { path: "/*", name: "Cache-Control", value: "public, max-age=600" },

    // Long-lived cache for hashed assets
    {
      path: "/assets/*",
      name: "Cache-Control",
      value: "public, max-age=31536000, immutable",
    },

    // Restrict embedding to same origin
    { path: "/**", name: "X-Frame-Options", value: "SAMEORIGIN" },

    // CORS for a specific API path
    {
      path: "/api/*",
      name: "Access-Control-Allow-Origin",
      value: "https://app.example.com",
    },
  ],
};
```

### Path Syntax

| Path                 | Matches                           |
| -------------------- | --------------------------------- |
| `/*`                 | Root-level paths only             |
| `/**`                | All paths including nested        |
| `/blog/*`            | All paths under `/blog/`          |
| `/assets/*.{js,css}` | JS and CSS files under `/assets/` |

### Header Evaluation Order

Headers are applied in array order. Later entries for the same header name on the same path will overwrite earlier ones.

> Custom headers defined here are applied **after** the built-in security headers policy. To override a default security header (e.g. `X-Frame-Options`), specify it explicitly here.

## Default Security Headers

These are always applied by the CloudFront Response Headers Policy, regardless of your `headers` config:

| Header                      | Default                                                                                                           |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload`                                                                    |
| `X-Frame-Options`           | `DENY`                                                                                                            |
| `X-Content-Type-Options`    | `nosniff`                                                                                                         |
| `Referrer-Policy`           | `strict-origin-when-cross-origin`                                                                                 |
| `X-XSS-Protection`          | `1; mode=block`                                                                                                   |
| `Content-Security-Policy`   | `default-src 'self'; style-src https: 'unsafe-inline'; script-src https: 'unsafe-inline' 'wasm-unsafe-eval'; ...` |

Default CORS headers (applied to all origins):

| Header                         | Default              |
| ------------------------------ | -------------------- |
| `Access-Control-Allow-Origin`  | `*`                  |
| `Access-Control-Allow-Methods` | `GET, HEAD, OPTIONS` |
| `Access-Control-Allow-Headers` | `*`                  |
| `Access-Control-Max-Age`       | `600`                |

## Full Example

```typescript
import { Cdk, Static, type StaticProps } from "@thunder-so/thunder";

const config: StaticProps = {
  env: { account: "123456789012", region: "us-east-1" },
  application: "myapp",
  service: "web",
  environment: "prod",
  rootDir: ".",
  outputDir: "dist",

  domain: "app.example.com",
  globalCertificateArn:
    "arn:aws:acm:us-east-1:123456789012:certificate/abc-123",
  hostedZoneId: "Z1234567890ABC",

  redirects: [{ source: "/old-page", destination: "/new-page" }],

  rewrites: [{ source: "/app/*", destination: "/index.html" }],

  headers: [
    { path: "/**", name: "X-Frame-Options", value: "SAMEORIGIN" },
    {
      path: "/assets/*",
      name: "Cache-Control",
      value: "public, max-age=31536000, immutable",
    },
  ],
};

new Static(new Cdk.App(), "myapp-web-prod-stack", config);
```

## Troubleshooting

**Redirects not firing:** Lambda@Edge logs appear in CloudWatch in the region closest to the viewer, not `us-east-1`. Check the relevant regional log group `/aws/lambda/us-east-1.RedirectRewriteFunction`.

**Headers not appearing:** Verify the path pattern matches your URL. Use `/**` to match all paths including nested ones.

**CSP blocking resources:** The default CSP is strict. Override it with a `headers` entry:

```typescript
{ path: '/**', name: 'Content-Security-Policy', value: 'your-custom-policy' }
```

## Related

- [static-basic.md](./static-basic.md) - Basic setup
- [static-full.md](./static-full.md) - Full configuration reference
