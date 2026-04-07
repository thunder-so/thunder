# Metadata Discovery

Thunder implements an "SST-style" discovery mechanism to enable the Thunder CLI and potential future Thunder Console to automatically identify and interact with deployed resources without relying on manual tagging or complex CloudFormation stack queries.

## How Thunder Tags Deployments

Thunder uses a state-based approach rather than traditional AWS resource tags for discovery.

### State Storage

When you deploy a Thunder service, it automatically stores its deployment state in a centralized S3 bucket named `thunder-metadata-<account>-<region>`.

### Key Structure

Files are stored with the following hierarchy:

```
apps/<application>/<environment>/<service>/metadata.json
apps/<application>/<environment>/<service>/context.json
```

### metadata.json

Contains stack identity and deployed resource references:

```json
{
  "stack_type": "Nuxt",
  "stack_version": "1.2.3",
  "resources": {
    "DistributionId": "E1234567890",
    "DistributionUrl": "https://d123.cloudfront.net",
    "Route53Domain": "https://myapp.com"
  },
  "created_at": "2026-03-27T12:00:00.000Z"
}
```

### context.json

Contains the deployment configuration used to deploy the stack:

```json
{
  "metadata": {
    "debug": false,
    "rootDir": ".",
    "application": "myapp",
    "service": "web",
    "environment": "prod",
    "env": {
      "account": "123456789012",
      "region": "us-east-1"
    },
    "sourceProps": { ... },
    "buildProps": { ... },
    "accessTokenSecretArn": "arn:aws:secretsmanager:...",
    "eventTarget": "...",
    "contextDirectory": "..."
  }
}
```

### Audit Trail

Thunder tracks deployment lifecycle with timestamps on `metadata.json`:

- **`created_at`**: Set when the stack is first deployed
- **`updated_at`**: Added when the stack is updated (only present after updates)
- **`deleted_at`**: Added when the stack is deleted (file remains in S3 for history)

**Note**: Due to CloudFormation limitations, `created_at` is not preserved during updates/deletes. Each timestamp represents the time of that specific action.

## How the CLI/Console Discovers Apps

1. **Bucket Resolution**: The tool determines the discovery bucket name based on the current AWS account and region.
2. **S3 Scanning**: It lists the objects in the bucket under the `apps/` prefix.
3. **Metadata Parsing**: It reads the `metadata.json` and `context.json` files to discover:
   - All deployed Thunder apps
   - Their environments/stages
   - Their individual services and associated resource IDs/URLs
4. **Automatic Discovery**: Because the `MetadataConstruct` is embedded in every Thunder stack, new services and updates are automatically reflected in S3 upon successful deployment.

## Implementation Details

### MetadataConstruct

- **Location**: `lib/constructs/metadata.ts`
- **Used by**: All Thunder stacks (Static, Lambda, Fargate, EC2, Nuxt, Astro, VPC, Template)

### MetadataProps

```typescript
interface MetadataProps extends AppProps {
  stackType: string; // e.g. "Nuxt", "Static", "Fargate"
  stackProps?: Record<string, any>; // framework-specific config merged into context
  resources: Record<string, any>; // deployed resource IDs/URLs
  sourceProps?: SourceProps; // CI/CD source config
  buildProps?: Record<string, any>; // build configuration
  accessTokenSecretArn?: string; // GitHub token secret ARN
  eventTarget?: string; // CodePipeline event target
}
```

### Bucket Creation

- Uses `AwsCustomResource` to create the metadata bucket if it doesn't exist
- Idempotent: Ignores `BucketAlreadyOwnedByYou` and `BucketAlreadyExists` errors
- Shared across all Thunder stacks in the same account/region
- Never deleted by Thunder (RETAIN policy)

### Initial Deployment

- Uses `BucketDeployment` to upload both `metadata.json` and `context.json` via `Source.jsonData`
- Sets `created_at` timestamp on `metadata.json`
- `retainOnDelete: true` to preserve metadata history

### Update/Delete Tracking

- Uses `AwsCustomResource` with `onUpdate` and `onDelete` hooks on `metadata.json` only
- `onUpdate`: Overwrites `metadata.json` with `updated_at` timestamp
- `onDelete`: Overwrites `metadata.json` with `deleted_at` timestamp
- File remains in S3 after stack deletion

## Bucket Lifecycle

- **Creation**: Automatic on first deployment to an account/region
- **Sharing**: Multiple Thunder stacks share the same metadata bucket
- **Retention**: Bucket is never deleted by Thunder
- **Permissions**: Minimal IAM (S3 create/read/write only)

## Technical Architecture

### Bucket Creation

```typescript
AwsCustomResource with onCreate: S3.createBucket
- Ignores BucketAlreadyOwnedByYou/BucketAlreadyExists errors
- Idempotent across multiple stacks
- installLatestAwsSdk: false (uses Lambda built-in SDK)
```

### File Writing

```typescript
1. BucketDeployment (onCreate)
   - Writes metadata.json (stack_type, stack_version, resources, created_at)
   - Writes context.json (deployment configuration)

2. AwsCustomResource (onUpdate) — metadata.json only
   - Overwrites metadata.json with updated_at

3. AwsCustomResource (onDelete) — metadata.json only
   - Overwrites metadata.json with deleted_at
   - File retained in S3 (retainOnDelete: true)
```

## Known Limitations

1. **Timestamp Preservation**: `created_at` is not preserved during stack updates or deletes due to CloudFormation's stateless nature. To preserve it would require a Lambda function with read-merge-write logic.

2. **Manual Cleanup**: Deleted stack metadata remains in S3 indefinitely (marked with `deleted_at`). Manual cleanup may be needed for long-term maintenance.
