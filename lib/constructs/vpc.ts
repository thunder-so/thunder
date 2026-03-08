import { Construct } from 'constructs';
import { Vpc, SubnetType, IpAddresses, IVpc } from 'aws-cdk-lib/aws-ec2';
import { VPCProps } from '../../types/VpcProps';
import { IVpcLink } from '../utils/vpc';

export interface VpcConstructProps extends VPCProps {
  vpcName: string;
}

/**
 * VPC construct provides a shared VPC with public and private subnets.
 */
export class VPC extends Construct implements IVpcLink {
  public readonly vpc: IVpc;

  constructor(scope: Construct, id: string, props: VpcConstructProps) {
    super(scope, id);

    this.vpc = new Vpc(this, 'Vpc', {
      vpcName: props.vpcName,
      ipAddresses: props.cidr ? IpAddresses.cidr(props.cidr) : undefined,
      maxAzs: props.maxAzs ?? 2,
      natGateways: props.createNatGateways ? (props.maxAzs ?? 2) : 0,
      subnetConfiguration: [
        {
          name: 'public',
          subnetType: SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: 'private',
          subnetType: SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24,
        }
      ],
    });
  }
}
