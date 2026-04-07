# Framework Detection Reference

## Full decision matrix. Read this when the quick signals in SKILL.md are ambiguous or conflicting

## Detection Priority

1. **package.json deps**
2. **Framework adapter config**
3. **Framework config content**
4. **Dockerfile present**
5. **File structure**

---

## Next.js

Read `next.config.ts` or `next.config.js`:

| Config                 | → Construct                  | Docs                                                                                                     |
| ---------------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------- |
| `output: 'export'`     | `Static`                     | https://github.com/thunder-so/thunder/raw/refs/heads/master/docs/frameworks/nextjs-static.md             |
| `output: 'standalone'` | `Fargate`                    | https://github.com/thunder-so/thunder/raw/refs/heads/master/docs/frameworks/nextjs-fargate-dockerfile.md |
| not set                | Ask: "Static export or SSR?" |                                                                                                          |

Note: There is **no** Thunder serverless construct for Next.js. SSR → always Fargate.

---

## Nuxt

Read `nuxt.config.ts`:

| Config                        | → Construct         | Docs                                                                                           |
| ----------------------------- | ------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `nitro.preset: 'aws-lambda'`  | `Nuxt` (Serverless) | https://github.com/thunder-so/thunder/raw/refs/heads/master/docs/frameworks/nuxt-serverless.md |
| `nitro.preset: 'node-server'` | `Fargate`           | https://github.com/thunder-so/thunder/raw/refs/heads/master/docs/frameworks/nuxt-fargate.md    |
| `ssr: false`                  | any                 | `Static`                                                                                       | https://github.com/thunder-so/thunder/raw/refs/heads/master/docs/static-basic.md |

Nuxt can be deployed on AWS using `Static`, `Fargate` and dedicated serverless `Nuxt` constructs.
Ask the user which mode they prefer.
Note: Nuxt Content `nuxt/content` cannot be deployed using `Static` construct. Use the serverless `Nuxt` construct instead.

---

## Astro

Read `astro.config.ts` / `astro.config.mjs`:

| Config             | → Construct          | Docs                                                                                            |
| ------------------ | -------------------- | ----------------------------------------------------------------------------------------------- |
| `output: 'server'` | `Astro` (Serverless) | https://github.com/thunder-so/thunder/raw/refs/heads/master/docs/frameworks/astro-serverless.md |
| `output: 'static'` | `Static`             | https://github.com/thunder-so/thunder/raw/refs/heads/master/docs/frameworks/astro-static.md     |
| `output: 'server'` | `Fargate`            | https://github.com/thunder-so/thunder/raw/refs/heads/master/docs/frameworks/astro-fargate.md    |

Nuxt can be deployed on AWS using `Static`, `Fargate` and dedicated serverless `Astro` constructs.
Ask the user which mode they prefer.

---

## SvelteKit

Read `svelte.config.js`:

| Adapter                              | → Construct | Docs                                                                                                |
| ------------------------------------ | ----------- | --------------------------------------------------------------------------------------------------- |
| `@sveltejs/adapter-static`           | `Static`    | https://github.com/thunder-so/thunder/raw/refs/heads/master/docs/static-basic.md                    |
| `@sveltejs/adapter-node`             | `Fargate`   | https://github.com/thunder-so/thunder/raw/refs/heads/master/docs/frameworks/sveltekit-fargate.md    |
| `@foladayo/sveltekit-adapter-lambda` | `SvelteKit` | https://github.com/thunder-so/thunder/raw/refs/heads/master/docs/frameworks/sveltekit-serverless.md |

Nuxt can be deployed on AWS using `Static`, `Fargate` and dedicated serverless `SvelteKit` constructs.
Ask the user which mode they prefer.

---

## TanStack Start

- app.config.ts/js is present
- `"@tanstack/start"` in deps
- `import { defineConfig } from '@tanstack/start/config'` is found

| Adapter                   | → Construct     | Docs                                                                                                     |
| ------------------------- | --------------- | -------------------------------------------------------------------------------------------------------- |
| nitro.preset = aws-lambda | `TanStackStart` | https://github.com/thunder-so/thunder/raw/refs/heads/master/docs/frameworks/tanstack-start-serverless.md |
| No presets                | `Fargate`       | https://github.com/thunder-so/thunder/raw/refs/heads/master/docs/frameworks/tanstack-start-fargate.md    |

TanStack Start can be deployed on AWS using `Fargate` and dedicated serverless `TanStackStart` constructs.
Ask the user which mode they prefer.

---

## SolidStart

- app.config.ts/js is present
- `"@solidjs/start"` in deps
- `import { defineConfig } from "@solidjs/start/config"` found

| Adapter                   | → Construct  | Docs                                                                                                 |
| ------------------------- | ------------ | ---------------------------------------------------------------------------------------------------- |
| nitro.preset = aws-lambda | `SolidStart` | https://github.com/thunder-so/thunder/raw/refs/heads/master/docs/frameworks/solidstart-serverless.md |
| No presets                | `Fargate`    | https://github.com/thunder-so/thunder/raw/refs/heads/master/docs/frameworks/solidstart-fargate.md    |

Solid Start can be deployed on AWS using `Fargate` and dedicated serverless `SolidStart` constructs.
Ask the user which mode they prefer.

---

## AnalogJS

- `vite.config.ts` contains `import analog from '@analogjs/platform'`
- `"@analogjs/platform"` in deps

| Adapter                   | → Construct | Docs                                                                                               |
| ------------------------- | ----------- | -------------------------------------------------------------------------------------------------- |
| static: true              | `Static`    | https://github.com/thunder-so/thunder/raw/refs/heads/master/docs/static-basic.md                   |
| nitro.preset = aws-lambda | `AnalogJS`  | https://github.com/thunder-so/thunder/raw/refs/heads/master/docs/frameworks/analogjs-serverless.md |
| No presets                | `Fargate`   | https://github.com/thunder-so/thunder/raw/refs/heads/master/docs/frameworks/analogjs-fargate.md    |

AnalogJS can be deployed on AWS using `Static`, `Fargate` and dedicated serverless `AnalogJS` constructs.
Ask the user which mode they prefer.

---

## Pure API backends

| Dep                           | → Construct           | Notes                          |
| ----------------------------- | --------------------- | ------------------------------ |
| `hono`                        | `Lambda`              | Hono has native Lambda adapter |
| `express` (no meta-framework) | `Lambda`              |                                |
| `fastify`                     | `Lambda` or `Fargate` | Fargate if WebSocket needed    |
| `elysia`                      | `Lambda` (Bun)        |                                |
| Any + Dockerfile              | `Fargate`             |                                |
| Any + WebSocket requirement   | `Fargate`             |                                |

---

## Pure Vite SPA

- `"vite"` in deps, NO meta-framework, no SSR
- → `Static` — outputDir: `dist`
- `vite+` or `vite-plus` with `nitro` for SSR - we can use the generic `Serverless` construct

---

## Conflict resolution

| Conflict                       | Resolution                              |
| ------------------------------ | --------------------------------------- |
| Multiple frameworks (monorepo) | Ask which app/package to deploy         |
| No signals at all              | Ask: "API, static site, or full-stack?" |
