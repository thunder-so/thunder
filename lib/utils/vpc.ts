import { IVpc } from 'aws-cdk-lib/aws-ec2';

/**
 * Interface for constructs that can be linked to a VPC.
 */
export interface IVpcLink {
  readonly vpc: IVpc;
}

/**
 * Helper to resolve an IVpc from either an IVpc or an IVpcLink.
 */
export function resolveVpc(vpc?: IVpc | IVpcLink): IVpc | undefined {
  if (!vpc) return undefined;
  return (vpc as IVpcLink).vpc ? (vpc as IVpcLink).vpc : (vpc as IVpc);
}