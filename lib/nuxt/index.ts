import { Construct } from 'constructs';
import { CfnDistribution } from 'aws-cdk-lib/aws-cloudfront';
import { NuxtProps } from '../../types/NuxtProps';
import { ServerConstruct } from './server';
import { ClientConstruct } from './client';

export { ServerConstruct, ClientConstruct };

export class NuxtConstruct extends Construct {
  public readonly server: ServerConstruct;
  public readonly client: ClientConstruct;

  constructor(scope: Construct, id: string, props: NuxtProps) {
    super(scope, id);

    this.server = new ServerConstruct(this, 'Server', props);
    this.client = new ClientConstruct(this, 'Client', props, {
      httpOrigin: this.server.httpOrigin,
    });

    // OAC Patch - although withOriginAccessControl is used, sometimes CDK still adds OAI
    const cfnDistribution = this.client.cdn.node.defaultChild as CfnDistribution;
    cfnDistribution.addOverride(
      "Properties.DistributionConfig.Origins.1.S3OriginConfig.OriginAccessIdentity",
      ""
    );
    cfnDistribution.addPropertyOverride(
      "DistributionConfig.Origins.1.OriginAccessControlId",
      this.client.originAccessControl?.attrId
    );

    const s3OriginNode = this.client.cdn.node
      .findAll()
      .filter((child) => child.node.id === "S3Origin");

    if (s3OriginNode && s3OriginNode.length > 0) {
      const resourceNode = s3OriginNode[0].node.findChild("Resource");
      if (resourceNode) {
        resourceNode.node.tryRemoveChild("Resource")
      }
    };
  }
}
