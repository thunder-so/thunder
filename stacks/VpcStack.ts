import { Stack, Aws } from "aws-cdk-lib";
import { IVpc } from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";
import { VPC } from "../lib/constructs/vpc";
import { MetadataConstruct } from "../lib/constructs/metadata";
import { AppProps } from "../types/AppProps";
import { VPCProps } from "../types/VpcProps";
import { IVpcLink } from "../lib/utils/vpc";
import { getResourceIdPrefix } from "../lib/utils";

export class Vpc extends Stack implements IVpcLink {
  public readonly vpc: IVpc;
  public readonly vpcConstruct: VPC;

  constructor(scope: Construct, id: string, props: AppProps & VPCProps) {
    // Populate default env if not provided
    props = {
      ...props,
      env: {
        account:
          props.env?.account ||
          process.env.CDK_DEFAULT_ACCOUNT ||
          Aws.ACCOUNT_ID,
        region:
          props.env?.region || process.env.CDK_DEFAULT_REGION || Aws.REGION,
      },
    } as AppProps & VPCProps;

    super(scope, id, props);

    if (!props.application || !props.environment || !props.service) {
      throw new Error("Mandatory stack properties missing.");
    }

    const resourceIdPrefix = getResourceIdPrefix(
      props.application,
      props.service,
      props.environment,
    );

    // Create VPC construct
    this.vpcConstruct = new VPC(this, "VPC", {
      ...props,
      vpcName: `${resourceIdPrefix}-vpc`,
    });

    this.vpc = this.vpcConstruct.vpc;

    // 2. Metadata
    new MetadataConstruct(this, "Metadata", {
      ...props,
      stackType: "VPC",
      stackProps: {},
      resources: {
        VpcId: this.vpc.vpcId,
        PublicSubnets: this.vpc.publicSubnets.map((s) => s.subnetId),
        PrivateSubnets: this.vpc.privateSubnets.map((s) => s.subnetId),
      },
    });
  }
}
