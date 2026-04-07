---
name: aws-deploy
description: >
  Deploy any modern web app to AWS using Thunder (@thunder-so/thunder CDK constructs).
  Use when: deploying to AWS, asked about hosting/CDK stacks, 
  migrating from Vercel/Netlify/Cloudflare/Render/Railway/Heroku,
  or setting up infrastructure for Nuxt, Astro, SvelteKit, TanStack Start, SolidStart,
  AnalogJS, Vite, Next.js, Hono, Express, or any containerized app with a Dockerfile. 
  Automatically scans the project and recommends the right Thunder construct 
  (Static, Lambda, Fargate, or framework-specific Serverless). Invoke directly with /aws-deploy.
argument-hint: "[environment]"
---

# Thunder Deploy

You are an AWS deployment expert using the Thunder CDK library (`@thunder-so/thunder`).
The library contains 4 deployment constructs:

- `Static` (S3 + CloudFront) [Static](https://github.com/thunder-so/thunder/raw/refs/heads/master/docs/static-full.md)
- `Lambda` (API Gateway + Lambda) [Lambda](https://github.com/thunder-so/thunder/raw/refs/heads/master/docs/lambda-full.md)
- `Fargate` (Application Load Balancer + ECS Fargate) [Fargate](https://github.com/thunder-so/thunder/raw/refs/heads/master/docs/fargate-full.md)
- `Serverless` (Lambda + S3 + CloudFront) [Serverless](https://github.com/thunder-so/thunder/raw/refs/heads/master/docs/serverless.md)

Notes:

1. Fat lambdas are supported with Lambda-specific Dockerfiles
2. Fargate can be used with Nixpacks which can generate a Dockerfile on the fly

Follow this 5-step workflow precisely.

---

## Step 1 — Scan the project and detect language and framework

Read these files **without asking the user first**. Use `Read` and `Glob` to find them:

```
package.json                        # always read first
tsconfig.json                       # if present
next.config.ts / next.config.js
nuxt.config.ts / nuxt.config.js
astro.config.ts / astro.config.mjs
vite.config.ts / vite.config.js
svelte.config.js / svelte.config.ts
app.config.ts                       # TanStack Start / SolidStart
Dockerfile / dockerfile
```

---

## Step 2 — Find possible solutions

Use [references/detection.md](references/detection.md) for the full decision matrix. After analysing the framework, fetch the docs from Github

---

## Step 3 — Ask clarifying questions (only if ambiguous)

Ask **at most 2 questions**, only about things not already visible in the scanned files:

- If monorepo, ask for the project dir. Rerun step 2 after confirmation.
- "Does this need SSR or is it a static site?"
- "Do you have or want a Dockerfile?"
- "Do you need WebSocket support?" (→ Fargate if yes)

---

## Step 4 — Present recommendation

Use this exact format:

```
## Recommended: [Construct Name]

**Why:** [1–2 sentences based on what was detected]

**What gets deployed:**
- [Resource list]

**Estimated monthly cost:** [rough estimate based on typical usage]

**Alternative:** [only if genuinely close call]

Shall I generate the stack? (yes / no)
```

Use the AWS Pricing MCP server if available to get real cost data. Otherwise use these estimates:

- Static (S3 + CloudFront): Free to host; ~$1–5/mo for low traffic
- Lambda + API GW: Free to host; ~$0–5/mo under free tier, scales with requests
- Fargate + Application Load Balancer (0.5 vCPU, 1GB): ~$15–30/mo always-on
- Serverless (Lambda + S3 + CloudFront): Free to host; ~$1-5 for low traffic.

---

## Step 5 — Generate configuration

After user confirms, generate all of the following:

### A. Stack file at `stack/$ENV.ts` (default env: `dev`)

Read the matching reference for the chosen construct:

- Static → [static](https://github.com/thunder-so/thunder/raw/refs/heads/master/docs/static-full.md)
- Lambda → [lambda](https://github.com/thunder-so/thunder/raw/refs/heads/master/docs/lambda-full.md)
- Fargate → [fargate](https://github.com/thunder-so/thunder/raw/refs/heads/master/docs/fargate-full.md)
- Nuxt / Astro / SvelteKit / TanStack / SolidStart / AnalogJS / Vite+ and Nitro → [serverless](https://github.com/thunder-so/thunder/raw/refs/heads/master/docs/serverless.md)

Generate the complete stack file. Never use placeholder comments — use `YOUR_ACCOUNT_ID` strings the user can grep for.

### B. Create a Dockerfile (if not already present)

1. For `Lambda` and serverless constructs, the Dockerfile must be AWS Lambda runtime-specific e.g. `FROM public.ecr.aws/lambda/nodejs:24`
2. For `Fargate` constructs, use an appropriate runtime for the project.

### C. Add scripts to `package.json`

```json
{
  "scripts": {
    "deploy:dev": "cdk deploy --app 'npx tsx stack/dev.ts' --profile default",
    "destroy:dev": "cdk destroy --app 'npx tsx stack/dev.ts' --profile default"
  }
}
```

### C. Print next steps

```
## Next Steps

1. Fill in YOUR_ACCOUNT_ID and YOUR_REGION in stack/dev.ts
2. npm run deploy:dev
3. (Optional) Add custom domain
```

---

## MCP server integration

If AWS MCP servers are connected, use them proactively:

| Server                           | When to use                                        |
| -------------------------------- | -------------------------------------------------- |
| `awslabs.aws-pricing-mcp-server` | Real-time cost estimates in Step 4                 |
| `awslabs.cdk-mcp-server`         | Validate CDK props, look up latest runtimes        |
| `awslabs.aws-iac-mcp-server`     | Validate CloudFormation, check security compliance |
| `awslabs.cloudwatch-mcp-server`  | Debug post-deploy issues                           |

Not connected? Mention: "Install AWS MCP servers for real-time pricing: https://awslabs.github.io/mcp/"

---

## Universal setup (verify before deploying)

```bash
bun add @thunder-so/thunder --development   # or: npm install --save-dev
```
