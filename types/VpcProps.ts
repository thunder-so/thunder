import { IVpc } from 'aws-cdk-lib/aws-ec2';
import { IVpcLink } from '../lib/utils/vpc';

export interface VPCProps {
  cidr?: string;
  maxAzs?: number;
  createNatGateways?: boolean;
}

export interface VpcLinkProps {
  /**
   * Optional. An existing VPC to use for the resource.
   * Can be an IVpc or a construct that implements IVpcLink.
   */
  readonly vpc?: IVpc | IVpcLink;
}
