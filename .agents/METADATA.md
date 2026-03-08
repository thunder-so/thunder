# Metadata Discovery

Thunder implements an "SST-style" discovery mechanism to enable the Thunder CLI and potential future Thunder Console to automatically identify and interact with deployed resources without relying on manual tagging or complex CloudFormation stack queries.

## How Thunder Tags Deployments

- [x] **DONE**: Thunder uses a state-based approach rather than traditional AWS resource tags for discovery.

### State Storage
When you deploy a Thunder service, it automatically stores its deployment state in a centralized S3 bucket named `thunder-discovery-<account>-<region>`.

### Key Structure
Metadata files are stored with the following hierarchy:
`apps/<application>/<environment>/<service>/metadata.json`

### Metadata Content
The `metadata.json` file contains a standardized set of properties that align with the service's `CfnOutput` names:
```json
{
  "id": "myapp-prod-web",
  "application": "myapp",
  "service": "web",
  "environment": "prod",
  "region": "us-east-1",
  "timestamp": "2026-03-04T12:00:00.000Z",
  "type": "Nuxt",
  "DistributionId": "E1234567890",
  "DistributionUrl": "https://d123.cloudfront.net",
  "Route53Domain": "https://myapp.com",
  "CodePipelineName": "myapp-prod-web-pipeline"
}
```

## How the CLI/Console Discovers Apps

1.  **Bucket Resolution**: The tool determines the discovery bucket name based on the current AWS account and region.
2.  **S3 Scanning**: It lists the objects in the bucket under the `apps/` prefix.
3.  **Metadata Parsing**: It reads the `metadata.json` files to discover:
    - All deployed Thunder apps.
    - Their environments/stages.
    - Their individual services and associated resource IDs/URLs.
4.  **Automatic Discovery**: Because the `DiscoveryConstruct` is embedded in every Thunder stack, new services and updates are automatically reflected in S3 upon successful deployment.

## Implementation Details

- [x] **DONE**: **`DiscoveryConstruct`**: A shared construct located in `lib/constructs/discovery.ts`.
- [x] **DONE**: **`BucketDeployment`**: Uses `aws-s3-deployment` to upload `Source.jsonData` during the CDK deployment phase.
- [x] **DONE**: **Standardization**: Metadata field names are strictly aligned with `CfnOutput` logical IDs (e.g., `DistributionId`, `ServiceUrl`).
- [x] **DONE**: Each deployment stores its metadata in a centralized S3 bucket (`thunder-discovery-<account>-<region>`). 

Metadata includes:
- [x] App identity (application, service, environment)
- [x] Resource ARNs, IDs and URLs (Aligned with `CfnOutput` names)
- [x] Deployment timestamps
- [x] Framework-specific metadata
- [x] Route53 domain integration


## ISSUES:

7:11:10 PM | CREATE_FAILED        | Custom::CDKBucketDeployment               | Discovery/StoreMet...omResource/Default
Received response status [FAILED] from custom resource. Message returned: Command '['/opt/awscli/aws', 's3', 'sync', '/tmp/tmpxgahyp87/contents', 's3://thunder-discovery-047719662375-us-east
-1/apps/nuxt3/dev/fargate']' returned non-zero exit status 1. (RequestId: afc6bb52-d373-4b97-9a7d-36d0ab9b9425)
7:11:10 PM | ROLLBACK_IN_PROGRESS | AWS::CloudFormation::Stack                | nuxt3-fargate-dev-stack
The following resource(s) failed to create: [DiscoveryStoreMetadataCustomResource5F6695DB, FargateFargateService7449B65B]. Rollback requested by user.
7:11:10 PM | ROLLBACK_IN_PROGRESS | AWS::CloudFormation::Stack                | nuxt3-fargate-dev-stack
The following resource(s) failed to create: [DiscoveryStoreMetadataCustomResource5F6695DB, FargateFargateService7449B65B]. Rollback requested by user.
7:11:37 PM | DELETE_FAILED        | Custom::CDKBucketDeployment               | Discovery/StoreMet...omResource/Default
Received response status [FAILED] from custom resource. Message returned: Command '['/opt/awscli/aws', 's3', 'rm', 's3://thunder-discovery-047719662375-us-east-1/apps/nuxt3/dev/fargate', '--
recursive']' returned non-zero exit status 1. (RequestId: f9383113-0976-4fe3-af60-bcefbf14d514)

❌  nuxt3-fargate-dev-stack failed: ToolkitError: The stack named nuxt3-fargate-dev-stack failed creation, it may need to be manually deleted from the AWS console: ROLLBACK_FAILED (The following resource(s) failed to delete: [DiscoveryStoreMetadataCustomResource5F6695DB]. ): Received response status [FAILED] from custom resource. Message returned: Command '['/opt/awscli/aws', 's3', 'sync', '/tmp/tmpxgahyp87/contents', 's3://thunder-discovery-047719662375-us-east-1/apps/nuxt3/dev/fargate']' returned non-zero exit status 1. (RequestId: afc6bb52-d373-4b97-9a7d-36d0ab9b9425), Received response status [FAILED] from custom resource. Message returned: Command '['/opt/awscli/aws', 's3', 'rm', 's3://thunder-discovery-047719662375-us-east-1/apps/nuxt3/dev/fargate', '--recursive']' returned non-zero exit status 1. (RequestId: f9383113-0976-4fe3-af60-bcefbf14d514)

The following resource(s) failed to delete: [DiscoveryStoreMetadataCustomResource5F6695DB].
Received response status [FAILED] from custom resource. Message returned: Command '['/opt/awscli/aws', 's3', 'rm', 's3://thunder-discovery-047719662375-us-east-1/apps/nuxt3/dev/fargate', '--recursive']' returned non-zero exit status 1. (RequestId: f9383113-0976-4fe3-af60-bcefbf14d514)