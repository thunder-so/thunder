import { StaticProps } from "./StaticProps";
import { LambdaProps } from "./LambdaProps";
import { FargateProps } from "./FargateProps";
import { ServerlessProps } from "./ServerlessProps";
import { Ec2Props } from "./Ec2Props";
import { TemplateProps } from "./TemplateProps";
import { AppProps } from "./AppProps";
import { VPCProps } from "./VpcProps";

/**
 * Context wrapper for CDK deployment
 * This is the canonical shape passed through:
 * Console DB → SQS → Runner → cdk.context.json → MetadataConstruct → S3 → Import
 */
export interface ContextProps {
  metadata:
    | StaticProps
    | LambdaProps
    | FargateProps
    | ServerlessProps
    | Ec2Props
    | TemplateProps
    | (AppProps & VPCProps);
}
