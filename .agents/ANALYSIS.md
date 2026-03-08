# Unified Thunder Library Analysis

This document analyzes the consolidated `@thunder-so/thunder` library, which provides a high-level, opinionated abstraction over AWS CDK for modern web deployment patterns.

## 1. Library Architecture

The library is organized by service type, with shared infrastructure patterns implemented as generic constructs and utilities.

### Core Structure:
- **`stacks/`**: Entry-point CloudFormation stacks (e.g., `StaticStack`, `LambdaStack`).
- **`lib/`**: Sub-divided by feature area (`static`, `lambda`, `fargate`, `ec2`, `template`, `nuxt`, `astro`).
- **`lib/constructs/`**: Generic infrastructure shared across service types (`vpc`, `discovery`).
- **`lib/utils/`**: Helper logic for naming, paths, and VPC resolution.
- **`types/`**: Standardized property interfaces for all constructs.

---

## 2. Service Implementations

### **Static (SPA)**
- **Constructs**: `StaticHosting`, `StaticPipeline`, `StaticDeploy`.
- **Resources**: S3, CloudFront, Route53, Lambda@Edge (Redirects/Rewrites).
- **Features**: Zero-downtime deployment, OAC support, custom headers.

### **Lambda**
- **Constructs**: `LambdaFunctions`, `LambdaPipeline`.
- **Resources**: Lambda (Zip or Container), API Gateway v2, ECR, Route53.
- **Features**: Bun runtime support, keep-warm scheduling, VPC integration.

### **Fargate**
- **Constructs**: `FargateService`, `FargatePipeline`.
- **Resources**: ECS Fargate, ALB, VPC, ECR, Route53.
- **Features**: Nixpacks integration, circuit breaker deployments, rolling updates.

### **EC2 & Template (Coolify)**
- **Constructs**: `Ec2Compute`, `Ec2Pipeline`, `TemplateConstruct`.
- **Resources**: EC2, Elastic IP, Route53, CloudWatch Agent.
- **Features**: Docker-on-EC2, Traefik TLS (Let's Encrypt), Coolify template hydration.

### **Frameworks (Nuxt & Astro)**
- **Constructs**: `NuxtConstruct`, `AstroConstruct`, `FrameworkPipeline`.
- **Resources**: Lambda (SSR), S3 (Assets), CloudFront (Dual-Origin), API Gateway.
- **Features**: Nitro preset optimization, Astro 404/403 Edge fallback.

---

## 3. Shared Patterns

### **VPC Link Pattern**
- Implemented via `resolveVpc` utility.
- Allows constructs to accept an `IVpc` directly or a construct implementing `IVpcLink`.
- Integrated into: Lambda, Fargate, EC2, Template.

### **Metadata Discovery (SST-style)**
- Implemented via `DiscoveryConstruct`.
- Stores `metadata.json` in `thunder-discovery-<account>-<region>` bucket.
- Standardized fields: `DistributionId`, `ServiceUrl`, `CodePipelineName`, `Route53Domain`.

### **Resource Naming**
- **Prefix**: `app(7)-svc(7)-env(7)` (23 characters).
- **Utility**: `getResourceIdPrefix`.
- Ensures global uniqueness while respecting AWS name limits.

---

## 4. Status Overview

| Feature | Status |
| :--- | :--- |
| **Monorepo Support** | [x] **DONE** (Path-based filters in CodeBuild) |
| **SST-style Discovery** | [x] **DONE** (Standardized metadata files) |
| **VPC Integration** | [x] **DONE** (Unified Link pattern) |
| **Nixpacks Support** | [x] **DONE** (Automated Dockerfile generation) |
| **Framework Fallbacks** | [x] **DONE** (Astro Edge function) |
| **Local Dev Parity** | [ ] **TODO** (CLI integration pending) |
| **Console UI** | [ ] **TODO** (Discovery backend ready) |
