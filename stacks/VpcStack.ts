import { Stack } from 'aws-cdk-lib';
import { IVpc } from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { VPC } from '../lib/constructs/vpc';
import { DiscoveryConstruct } from '../lib/constructs/discovery';
import { AppProps } from '../types/AppProps'
import { VPCProps } from '../types/VpcProps'
import { IVpcLink } from '../lib/utils/vpc';
import { getResourceIdPrefix } from '../lib/utils';

export class Vpc extends Stack implements IVpcLink {
  public readonly vpc: IVpc;
  public readonly vpcConstruct: VPC;

  constructor(scope: Construct, id: string, props: AppProps & VPCProps) {
    super(scope, id, props);

    // Check mandatory properties
    if (!props?.env) {
      throw new Error('Must provide AWS account and region.');
    }
    if (!props.application || !props.environment || !props.service) {
      throw new Error('Mandatory stack properties missing.');
    }

    const resourceIdPrefix = getResourceIdPrefix(props.application, props.service, props.environment);

    // Create VPC construct
    this.vpcConstruct = new VPC(this, 'VPC', {
      ...props,
      vpcName: `${resourceIdPrefix}-vpc`,
    });

    this.vpc = this.vpcConstruct.vpc;

    // 2. Discovery (Metadata)
    // new DiscoveryConstruct(this, 'Discovery', {
    //   ...props,
    //   metadata: {
    //     type: 'VPC',
    //     VpcId: this.vpc.vpcId,
    //     PublicSubnets: this.vpc.publicSubnets.map(s => s.subnetId),
    //     PrivateSubnets: this.vpc.privateSubnets.map(s => s.subnetId),
    //   }
    // });
  }
}
