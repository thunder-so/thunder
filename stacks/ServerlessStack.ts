import { Stack } from "aws-cdk-lib";
import { IRole } from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import { ServerlessProps } from "../types/ServerlessProps";
import {
  getFrameworkConfig,
  mergePropsWithDefaults,
} from "../lib/utils/framework-config";
import { ServerlessServer } from "../lib/serverless/server";
import { ServerlessClient } from "../lib/serverless/client";
import { ServerlessPipeline } from "../lib/serverless/pipeline";
import { MetadataConstruct } from "../lib/constructs/metadata";

export interface ServerlessStackProps extends ServerlessProps {
  framework?: string;
}

export class ServerlessStack extends Stack {
  public readonly lambdaRole: IRole;
  constructor(scope: Construct, id: string, props: ServerlessStackProps) {
    super(scope, id, props);

    const frameworkConfig = getFrameworkConfig(props.framework ?? "generic");
    const mergedProps = mergePropsWithDefaults(props, frameworkConfig);

    const server = new ServerlessServer(this, "Server", mergedProps);
    this.lambdaRole = server.lambdaFunction.role!;

    const client = new ServerlessClient(this, "Client", {
      ...mergedProps,
      httpOrigin: server.httpOrigin,
    });

    let pipeline: ServerlessPipeline | undefined;
    if (props.accessTokenSecretArn && props.sourceProps) {
      pipeline = new ServerlessPipeline(this, "Pipeline", {
        ...mergedProps,
        lambdaFunction: server.lambdaFunction,
        staticAssetsBucket: client.staticAssetsBucket,
        cdn: client.cdn,
        clientOutputDir:
          mergedProps.clientProps?.outputDir ||
          frameworkConfig.defaultClientDir,
        serverCodeDir:
          mergedProps.serverProps?.codeDir || frameworkConfig.defaultServerDir,
      });
    }

    new MetadataConstruct(this, "Metadata", {
      ...mergedProps,
      stackType: "SERVERLESS",
      stackProps: {
        framework: props.framework,
        serverProps: props.serverProps,
        domain: props.domain,
        globalCertificateArn: props.globalCertificateArn,
        regionalCertificateArn: props.regionalCertificateArn,
        hostedZoneId: props.hostedZoneId,
      },
      resources: {
        DistributionId: client.cdn.distributionId,
        DistributionUrl: `https://${client.cdn.distributionDomainName}`,
        LambdaFunctionArn: server.lambdaFunction.functionArn,
        Route53Domain: props.domain ? `https://${props.domain}` : undefined,
        CodePipelineName: pipeline?.codePipeline.pipelineName,
      },
    });
  }
}
