# Thunder CLI Scope

The Thunder CLI (`th`) is the primary interface for developing, deploying, and managing applications built with `@thunder-so/thunder`. It is designed to be a thin, context-aware wrapper around the AWS CDK, providing a developer experience similar to SST but tailored for the Thunder ecosystem.

## Core Mandates

1.  **Context-Awareness:** [x] **DONE**: The CLI automatically detects the current environment, application, and service from the repository structure or configuration, minimizing repetitive flag usage.
2.  **Zero-Config Defaults:** [x] **DONE**: "It just works" out of the box with sensible defaults for AWS regions, accounts, and resource sizing.
3.  **Local Dev Parity:** [ ] **TODO**: Enables a local development loop that closely mirrors production, including live Lambda iteration (future scope) and local emulation of static sites.

## Command Reference

### `th init`
- [ ] **TODO**: Scaffolds a new Thunder project or adds a new service to an existing monorepo.

-   **Usage:** `th init [template] [name]`
-   **Features:**
    -   Detects if running in an existing workspace (monorepo).
    -   Prompts for project type: `static`, `lambda`, `fargate`, `nuxt`, `astro`, `ec2`, `template`.
    -   Generates `thunder.config.ts` (or updates it).
    -   Creates necessary `bin/*.ts` entry points.
    -   Sets up `.gitignore` and `package.json` scripts.

### `th deploy`
- [ ] **TODO**: Deploys the application to AWS.

-   **Usage:** `th deploy [--stage <stage>] [--filter <service>]`
-   **Features:**
    -   **Stage Management:** defaults to `dev` for local, but supports `prod`, `staging`, `pr-*`.
    -   **Context-Driven:** [x] **DONE**: Reads `bin/*.ts` files to determine which stacks to deploy.
    -   **Metadata Push:** [x] **DONE**: Updates the `thunder-discovery` bucket with new resource ARNs and endpoints after successful deployment.
    -   **Output:** Prints critical URLs (CloudFront, API Gateway, ALB) to the console.

### `th destroy`
- [ ] **TODO**: Tears down resources.

-   **Usage:** `th remove [--stage <stage>] [--filter <service>]`
-   **Features:**
    -   **Safety Checks:** Prompts for confirmation, especially for `prod` stages or stateful resources (RDS, S3).
    -   **Metadata Cleanup:** Removes entries from the `thunder-discovery` bucket.

## Implementation Details

### Context Resolution (`bin/*.ts`)
- [x] **DONE**: The CLI relies on the convention of `bin/<type>.ts` files. 
-   `th deploy` scans `bin/` directory.
-   It executes these scripts using `ts-node` or `tsx`.
-   The scripts instantiate the Stacks (e.g., `NuxtStack`, `FargateStack`).
-   The CLI injects context (app, env, service, account, region) via environment variables or context context keys.

### CLI Architecture
- [ ] **TODO**:
-   **Runtime:** Node.js
-   **Core Libs:** `aws-cdk` (programmatic), `aws-sdk` (v3), `inquirer` (prompts), `commander` (args), `ink` (TUI).
-   **Build:** `esbuild` for fast bundling of Lambda code during `th dev`.

## Comparison with SST

| Feature | SST CLI | Thunder CLI |
| :--- | :--- | :--- |
| **Engine** | Pulumi / Terraform (v3) | AWS CDK (Native) |
| **Language** | TypeScript / Python / Go | TypeScript (Strict) |
| **State** | Cloud State Backend | CloudFormation + S3 Metadata |
| **Local Dev** | Live Lambda (Multiplexing) | Hotswap + Local Framework Server |
| **Constructs** | Broad (150+ providers) | Focused (AWS Web patterns) |
