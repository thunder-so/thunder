import { Aws } from "aws-cdk-lib";
import { Construct } from "constructs";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { BucketDeployment, Source } from "aws-cdk-lib/aws-s3-deployment";
import {
  AwsCustomResource,
  AwsCustomResourcePolicy,
  PhysicalResourceId,
} from "aws-cdk-lib/custom-resources";
import { createRequire } from "module";
import type { ContextProps } from "../../types";

const require = createRequire(import.meta.url);
const { version: STACK_VERSION } = require("../../package.json");

export interface MetadataProps {
  readonly context: ContextProps;
  readonly stackType: string;
  readonly resources: Record<string, any>;
}

export class MetadataConstruct extends Construct {
  constructor(scope: Construct, id: string, props: MetadataProps) {
    super(scope, id);

    const account = props.context.metadata.env?.account || Aws.ACCOUNT_ID;
    const region = props.context.metadata.env?.region || Aws.REGION;
    const bucketName = `thunder-metadata-${account}-${region}`;

    const bucketChecker = new AwsCustomResource(this, "BucketChecker", {
      onCreate: {
        service: "S3",
        action: "createBucket",
        parameters: { Bucket: bucketName },
        physicalResourceId: PhysicalResourceId.of(bucketName),
        ignoreErrorCodesMatching: "BucketAlreadyOwnedByYou|BucketAlreadyExists",
      },
      onDelete: {
        service: "S3",
        action: "headBucket",
        parameters: { Bucket: bucketName },
        physicalResourceId: PhysicalResourceId.of(bucketName),
        ignoreErrorCodesMatching: ".*",
      },
      policy: AwsCustomResourcePolicy.fromSdkCalls({
        resources: [`arn:aws:s3:::${bucketName}`],
      }),
      installLatestAwsSdk: false,
    });

    const discoveryBucket = Bucket.fromBucketName(
      this,
      "DiscoveryBucket",
      bucketName,
    );

    // Store context as-is
    const contextContent = props.context;

    // Metadata content (for metadata.json)
    const metadataContent = {
      stack_type: props.stackType,
      stack_version: STACK_VERSION,
      resources: props.resources,
      created_at: new Date().toISOString(),
    };

    const destinationPrefix = `apps/${props.context.metadata.application}/${props.context.metadata.environment}/${props.context.metadata.service}`;

    const deployment = new BucketDeployment(this, "Metadata", {
      sources: [
        Source.jsonData("metadata.json", metadataContent),
        Source.jsonData("context.json", contextContent),
      ],
      destinationBucket: discoveryBucket,
      destinationKeyPrefix: destinationPrefix,
      prune: false,
      retainOnDelete: true,
    });

    deployment.node.addDependency(bucketChecker);

    const metadataKey = `${destinationPrefix}/metadata.json`;

    const metadataTimestamps = new AwsCustomResource(
      this,
      "MetadataTimestamps",
      {
        onUpdate: {
          service: "S3",
          action: "putObject",
          parameters: {
            Bucket: bucketName,
            Key: metadataKey,
            Body: JSON.stringify({
              ...metadataContent,
              updated_at: new Date().toISOString(),
            }),
            ContentType: "application/json",
          },
          physicalResourceId: PhysicalResourceId.of(
            `${bucketName}/${metadataKey}`,
          ),
        },
        onDelete: {
          service: "S3",
          action: "putObject",
          parameters: {
            Bucket: bucketName,
            Key: metadataKey,
            Body: JSON.stringify({
              ...metadataContent,
              deleted_at: new Date().toISOString(),
            }),
            ContentType: "application/json",
          },
          physicalResourceId: PhysicalResourceId.of(
            `${bucketName}/${metadataKey}`,
          ),
          ignoreErrorCodesMatching: ".*",
        },
        policy: AwsCustomResourcePolicy.fromSdkCalls({
          resources: [`arn:aws:s3:::${bucketName}/*`],
        }),
        installLatestAwsSdk: false,
      },
    );

    metadataTimestamps.node.addDependency(deployment);
  }
}
