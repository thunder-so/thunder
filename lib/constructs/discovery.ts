import { Aws, Duration, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Bucket, IBucket, BucketEncryption, BlockPublicAccess } from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { AppProps } from '../../types/AppProps';

export interface DiscoveryProps extends AppProps {
  /**
   * The metadata object to store.
   */
  readonly metadata: Record<string, any>;
  /**
   * Whether to create the discovery bucket if it doesn't exist.
   * Only one stack should create the bucket.
   * @default false
   */
  readonly createBucket?: boolean;
}

/**
 * DiscoveryConstruct stores deployment metadata in a centralized S3 bucket
 * to enable external tools and the Thunder Console to discover deployed applications.
 */
export class DiscoveryConstruct extends Construct {
  constructor(scope: Construct, id: string, props: DiscoveryProps) {
    super(scope, id);

    const account = props.env?.account || Aws.ACCOUNT_ID;
    const region = props.env?.region || Aws.REGION;
    const bucketName = `thunder-discovery-${account}-${region}`;

    // Import or create the discovery bucket
    let discoveryBucket: IBucket;
    if (props.createBucket) {
      discoveryBucket = new Bucket(this, 'DiscoveryBucketResource', {
        bucketName: bucketName,
        encryption: BucketEncryption.S3_MANAGED,
        blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
        removalPolicy: RemovalPolicy.RETAIN,
      });
    } else {
      discoveryBucket = Bucket.fromBucketName(this, 'DiscoveryBucket', bucketName);
    }

    // Metadata file content
    const metadataContent = {
      id: `${props.application}-${props.environment}-${props.service}`,
      application: props.application,
      service: props.service,
      environment: props.environment,
      region: region,
      timestamp: new Date().toISOString(),
      ...props.metadata
    };

    // Store metadata in S3 using BucketDeployment
    // Key: apps/<app>/<stage>/<service>/metadata.json
    new BucketDeployment(this, 'StoreMetadata', {
      sources: [Source.jsonData('metadata.json', metadataContent)],
      destinationBucket: discoveryBucket,
      destinationKeyPrefix: `apps/${props.application}/${props.environment}/${props.service}`,
      prune: false,
      retainOnDelete: false,
    });
  }
}
