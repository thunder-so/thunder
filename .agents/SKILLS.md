# Claude Skills Implementation Plan for Thunder

## Overview

This document outlines the comprehensive plan for implementing Claude Code skills in the Thunder AWS CDK library to enable intelligent stack selection and configuration generation.

---

## Current State Analysis

### Project: `@thunder-so/thunder`
A unified AWS CDK library for deploying web applications with multiple deployment patterns.

### Available Stacks

| Stack | Purpose | Resources |
|-------|---------|-----------|
| **Static** | Static SPA hosting | S3 + CloudFront + Route53 |
| **Lambda** | Serverless functions | Lambda + API Gateway + ECR |
| **Fargate** | Container orchestration | ECS Fargate + ALB + VPC |
| **EC2** | Single container hosting | EC2 + Elastic IP + Docker |
| **Template** | Coolify one-click templates | EC2 + Docker Compose |
| **Nuxt** | Full-stack Nuxt.js | Lambda SSR + S3 + CloudFront |
| **Astro** | Full-stack Astro SSR | Lambda SSR + S3 + CloudFront + Edge |
| **VPC** | Shared infrastructure | VPC with public/private subnets |

### Current CLI
- `th init` - Initialize project
- `th deploy` - Deploy services
- `th destroy` - Remove resources

### Missing Infrastructure
- No `.claude/` directory
- No intelligent stack selection
- No automated configuration generation

---

## Recommended Architecture

### Option A: Project-Level Skills (Immediate Use)
**Location**: `.claude/skills/` within repo
- Automatically available in project
- Version-controlled with code
- No installation required
- Best for team collaboration

### Option B: Plugin Distribution (Global Distribution)
**Location**: `thunder-claude-plugin/` directory
- Install once, use everywhere
- Distributed via marketplace
- Namespaced: `/thunder:select-stack`
- Best for community distribution

**Recommendation**: Start with Option A, package as Option B later.

---

## Skill System Design

### 1. Master Stack Selector Skill (`select-stack`)

**Purpose**: Primary entry point for "deploy on AWS" requests

**Detection Logic**:
```
Framework Detection:
├── Nuxt.js → NuxtStack
├── Astro → AstroStack
├── Next.js (SSG) → StaticStack
├── React/Vue/Svelte SPA → StaticStack
│
Container Detection:
├── Dockerfile exists → Fargate/EC2
├── docker-compose.yml → TemplateStack
│
Architecture Analysis:
├── Simple API → LambdaStack
├── Long-running service → FargateStack
├── Single container → EC2Stack
└── Pre-built template → TemplateStack
```

**User Flow**:
1. Analyze project structure (package.json, configs, Docker files)
2. Detect framework and architecture patterns
3. Ask clarifying questions if ambiguous
4. Present 1-2 recommendations with rationale
5. Generate configuration files upon confirmation

### 2. Individual Stack Skills

Each stack has a dedicated skill for:
- Generating stack-specific configuration
- Creating bin/*.ts entry points
- Setting up thunder.config.ts
- Providing best practice guidance
- Troubleshooting common issues

**Skills Required**:
- `/select-stack` - Master selector
- `/static` - Static SPA deployment
- `/lambda` - Serverless functions
- `/fargate` - Container orchestration
- `/ec2` - Single EC2 container
- `/template` - Coolify templates
- `/nuxt` - Nuxt.js full-stack
- `/astro` - Astro full-stack
- `/vpc` - VPC infrastructure
- `/troubleshoot` - Issue resolution

### 3. Utility Skills

- `/config` - Manage thunder.config.ts
- `/deploy-guide` - Deployment walkthrough
- `/teardown` - Safe resource cleanup

---

## File Structure

```
.claude/
├── CLAUDE.md                     # Project context
└── skills/
    ├── select-stack/
    │   ├── SKILL.md              # Skill definition
    │   ├── decision-matrix.md    # Selection criteria
    │   └── examples/
    │       ├── react-spa.md
    │       ├── nuxt-app.md
    │       └── api-service.md
    │
    ├── static/
    │   ├── SKILL.md
    │   └── templates/
    │       ├── bin-static.ts
    │       └── thunder.config.static.ts
    │
    ├── lambda/
    │   ├── SKILL.md
    │   └── templates/
    │       ├── bin-lambda.ts
    │       └── thunder.config.lambda.ts
    │
    ├── fargate/
    │   ├── SKILL.md
    │   └── templates/
    │       ├── bin-fargate.ts
    │       └── thunder.config.fargate.ts
    │
    ├── ec2/
    │   ├── SKILL.md
    │   └── templates/
    │       ├── bin-ec2.ts
    │       └── thunder.config.ec2.ts
    │
    ├── nuxt/
    │   ├── SKILL.md
    │   └── templates/
    │       ├── bin-nuxt.ts
    │       └── thunder.config.nuxt.ts
    │
    ├── astro/
    │   ├── SKILL.md
    │   └── templates/
    │       ├── bin-astro.ts
    │       └── thunder.config.astro.ts
    │
    ├── template/
    │   ├── SKILL.md
    │   └── templates/
    │       ├── bin-template.ts
    │       └── thunder.config.template.ts
    │
    ├── vpc/
    │   ├── SKILL.md
    │   └── templates/
    │       └── bin-vpc.ts
    │
    └── troubleshoot/
        ├── SKILL.md
        └── common-issues.md
```

---

## Stack Selection Matrix

| Use Case | Detection Signals | Primary Stack | Alternative |
|----------|-------------------|---------------|-------------|
| React/Vue/Angular SPA | `react`, `vue` in deps | **Static** | - |
| SSG Framework (Next.js, Gatsby) | `next`, `gatsby` in deps | **Static** | - |
| Nuxt.js Application | `nuxt` in deps | **Nuxt** | Fargate |
| Astro Application | `astro` in deps | **Astro** | Static |
| API-only Backend | No frontend deps | **Lambda** | Fargate |
| Container w/ Dockerfile | `Dockerfile` present | **Fargate** | EC2 |
| Simple Container | Single container | **EC2** | Fargate |
| Coolify Template | `docker-compose.yml` | **Template** | EC2 |
| Multi-service App | Multiple services | **Fargate** | Multiple stacks |
| Background Workers | Queue/scheduling needs | **Lambda** | Fargate |
| Microservices | Service architecture | **Fargate** + VPC | Multiple stacks |

---

## Skill Content Structure

### SKILL.md Format

```yaml
---
name: thunder:select-stack
description: |
  Analyzes project and recommends appropriate Thunder AWS deployment stack.
  Use when user asks to deploy on AWS, setup infrastructure, or wants to
  create a new deployment.
argument-hint: [optional project description or specific stack name]
disable-model-invocation: false
allowed-tools: Read, Grep, Glob, Bash
---

## Context
When a user wants to deploy on AWS, follow this process:

### Step 1: Project Analysis
1. Read package.json to detect frameworks
2. Check for existing configuration files (thunder.config.ts, bin/*.ts)
3. Look for Dockerfile or docker-compose.yml
4. Identify build scripts and entry points

### Step 2: Framework Detection
Common patterns:
- React/Vue/Svelte SPA → Static stack
- Nuxt.js → Nuxt stack
- Astro → Astro stack
- Next.js (with export) → Static stack
- Next.js (with server) → Fargate stack
- Express/Fastify API → Lambda or Fargate
- Docker container → Fargate or EC2

### Step 3: Ask Clarifying Questions
If multiple options apply:
- "Do you need server-side rendering (SSR)?"
- "Do you have a backend API?"
- "Is this a static site or dynamic application?"
- "Do you need WebSocket support?"
- "Do you have a Dockerfile?"

### Step 4: Recommendation
Present best option with:
- Why this stack fits
- Key features provided
- Cost considerations
- Alternative if applicable

### Step 5: Configuration Generation
Upon confirmation:
1. Create bin/<stack>.ts entry point
2. Create/update thunder.config.ts
3. Add deployment scripts to package.json
4. Provide next steps

## Templates
Reference files in ./templates/ directory for code generation.
```

---

## User Interaction Examples

### Example 1: React SPA

**User**: "Deploy my React app to AWS"

**Claude Analysis**:
- Detects React in package.json
- Finds build script (likely `npm run build`)
- No SSR indicators
- No Dockerfile

**Claude Response**:
"I see you have a React application. The **Static** stack is perfect for this:

**What it provides:**
- S3 bucket for your built files
- CloudFront CDN for fast global access
- SSL certificate and custom domain support
- Automatic cache invalidation on deploy
- CI/CD pipeline integration

**Next steps:**
1. Build your app: `npm run build`
2. Configure output directory (default: `dist` or `build`)
3. Deploy with `th deploy`

Shall I set up the Static stack configuration?"

### Example 2: Nuxt.js Full-Stack

**User**: "How do I deploy my Nuxt app?"

**Claude Analysis**:
- Detects Nuxt dependency
- Finds nuxt.config.ts
- Likely needs SSR support

**Claude Response**:
"I found your Nuxt.js project. For full-stack Nuxt apps, I recommend the **Nuxt** stack:

**Architecture:**
- Lambda functions for server-side rendering (SSR)
- S3 bucket for static assets (JS, CSS, images)
- CloudFront distribution with dual origins
- API routes supported via API Gateway
- Edge-optimized for global performance

**Alternative:** If you need WebSocket support or long-running processes, consider the **Fargate** stack instead.

Would you like me to configure the Nuxt stack?"

### Example 3: Ambiguous Project

**User**: "Deploy my app to AWS"

**Claude Analysis**:
- Limited context, no clear framework detected
- Need to ask questions

**Claude Response**:
"I'd be happy to help you deploy to AWS! To recommend the best stack, I need to understand your application better:

1. **What framework are you using?** (React, Vue, Nuxt, Astro, Express, etc.)
2. **Does your app need server-side rendering (SSR)?**
3. **Do you have a backend API?**
4. **Is this a static site or dynamic application?**
5. **Do you have a Dockerfile?**

Or you can tell me more about your app and I'll analyze your project files."

---

## Configuration Templates

### thunder.config.ts Template

```typescript
export default {
  application: '${application}',
  service: '${service}',
  environment: '${environment}',
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  
  // Stack-specific configuration
  $STACK_CONFIG
};
```

### bin/<stack>.ts Template

```typescript
#!/usr/bin/env -S npx tsx
import { App } from 'aws-cdk-lib';
import { $StackName } from '@thunder-so/thunder';
import config from '../thunder.config.ts';

const app = new App();

new $StackName(app, '$StackName', {
  ...config,
  $SPECIFIC_PROPS
});

app.synth();
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Create `.claude/` directory structure
- [ ] Write CLAUDE.md project context
- [ ] Implement `select-stack` skill with framework detection
- [ ] Implement `static` skill (most common use case)
- [ ] Create templates for Static stack
- [ ] Test with sample React project

### Phase 2: Core Stacks (Week 2)
- [ ] Implement `lambda` skill
- [ ] Implement `fargate` skill
- [ ] Implement `ec2` skill
- [ ] Create templates for each
- [ ] Add stack-specific configuration examples

### Phase 3: Framework-Specific (Week 3)
- [ ] Implement `nuxt` skill
- [ ] Implement `astro` skill
- [ ] Implement `template` skill
- [ ] Create framework detection helpers
- [ ] Add SSR vs SSG detection logic

### Phase 4: Utilities & Polish (Week 4)
- [ ] Implement `troubleshoot` skill
- [ ] Implement `config` skill
- [ ] Add comprehensive examples
- [ ] Write skill documentation
- [ ] Test with real projects

### Phase 5: Plugin Packaging (Week 5)
- [ ] Create `thunder-claude-plugin` directory
- [ ] Write plugin.json manifest
- [ ] Package skills for distribution
- [ ] Write installation documentation
- [ ] Publish to marketplace

---

## Key Design Decisions

### 1. Detection Strategy
- **Automated detection** for clear cases (framework in package.json)
- **Interactive questions** for ambiguous cases
- **Confidence scoring** to determine when to ask

### 2. Configuration Approach
- Generate minimal viable configuration
- Include helpful comments explaining options
- Reference external docs for advanced settings
- Allow user customization after generation

### 3. Error Handling
- Validate AWS credentials before generation
- Check for existing configurations
- Provide clear error messages with solutions
- Offer rollback options

### 4. Documentation Integration
- Link to existing `.agents/` documentation
- Include inline comments in generated code
- Reference PRD and CLI docs
- Provide external resource links

---

## Testing Strategy

### Test Scenarios
1. **React SPA** → Static stack
2. **Nuxt SSR app** → Nuxt stack
3. **Express API** → Lambda or Fargate
4. **Docker app** → Fargate or EC2
5. **Multi-service app** → Multiple stacks
6. **Ambiguous project** → Interactive flow

### Validation Checklist
- [ ] Skill triggers on appropriate prompts
- [ ] Correct stack recommended for project type
- [ ] Generated files are syntactically correct
- [ ] Configuration matches project structure
- [ ] User questions are relevant and helpful
- [ ] Error messages are clear and actionable

---

## Future Enhancements

### Advanced Features
- **Multi-stack recommendations** for microservices
- **Migration skills** (Static → Fargate, etc.)
- **Cost estimation** before deployment
- **Performance optimization** suggestions
- **Security best practices** enforcement

### Framework Support
- TanStack Start
- Angular AnalogJS
- SvelteKit
- React Router v7
- SolidStart

### Integration Points
- CI/CD pipeline generation
- Database setup assistance
- Secrets management
- Monitoring configuration
- Custom domain setup

---

## Success Metrics

### User Experience
- Time to first deployment reduced by 50%
- Stack selection accuracy >90%
- User satisfaction with recommendations
- Reduced support questions

### Technical
- All major framework types covered
- Generated configs deploy successfully
- Skills trigger appropriately
- No false positives in detection

### Adoption
- Skills used in X% of new projects
- Plugin installations (if distributed)
- Community contributions
- Documentation engagement

---

## Resources

### Documentation
- [Claude Code Skills Documentation](https://docs.anthropic.com/en/docs/claude-code/skills)
- [Claude Code Plugins](https://docs.anthropic.com/en/docs/claude-code/plugins)
- [Thunder PRD](./PRD.md)
- [Thunder CLI Scope](./CLI.md)

### References
- Agent Skills standard: https://agentskills.io
- AWS CDK patterns: https://docs.aws.amazon.com/cdk/
- Framework detection: package.json analysis

---

## Notes

- Keep SKILL.md files under 500 lines
- Use frontmatter for metadata
- Include examples in separate files
- Test with real projects before finalizing
- Document edge cases and limitations
- Consider monorepo scenarios
- Support both TypeScript and JavaScript projects

---

**Last Updated**: 2026-03-08
**Status**: Planning Complete - Ready for Implementation
