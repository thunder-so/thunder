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
import { AppProps } from "../../types/AppProps";
import { SourceProps } from "../../types/PipelineProps";

const require = createRequire(import.meta.url);
const { version: STACK_VERSION } = require("../../package.json");

export interface MetadataProps extends AppProps {
  readonly stackType: string;
  readonly stackProps?: Record<string, any>;
  readonly resources: Record<string, any>;
  readonly sourceProps?: SourceProps;
  readonly buildProps?: Record<string, any>;
  readonly accessTokenSecretArn?: string;
  readonly eventTarget?: string;
}

export class MetadataConstruct extends Construct {
  constructor(scope: Construct, id: string, props: MetadataProps) {
    super(scope, id);

    const account = props.env?.account || Aws.ACCOUNT_ID;
    const region = props.env?.region || Aws.REGION;
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

    // Context metadata content (for context.json)
    const contextMetadata = {
      debug: props.debug || false,
      rootDir: props.rootDir || "/",
      ...(props.stackProps || {}),
      sourceProps: props.sourceProps,
      buildProps: props.buildProps,
      env: {
        region: region,
        account: account,
      },
      application: props.application,
      service: props.service,
      environment: props.environment,
      accessTokenSecretArn: props.accessTokenSecretArn,
      eventTarget: props.eventTarget,
      contextDirectory: props.contextDirectory,
    };

    const contextContent = {
      metadata: contextMetadata,
    };

    // Metadata content (for metadata.json)
    const metadataContent = {
      stack_type: props.stackType,
      stack_version: STACK_VERSION,
      resources: props.resources,
      created_at: new Date().toISOString(),
    };

    const destinationPrefix = `apps/${props.application}/${props.environment}/${props.service}`;

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
