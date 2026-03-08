import { AppProps } from './AppProps'
import { CloudFrontWithEdgeProps } from './CloudFrontProps'
import { PipelineWithRuntimeProps  } from './PipelineProps'

/**
 * Domain and certificate properties
 */
export interface DomainProps {
  /**
   * Optional. The domain (without the protocol) at which the app shall be publicly available.
   */ 
  readonly domain?: string;
  /**
   * Optional. The ARN of the certificate to use on CloudFront for the app to make it accessible via HTTPS.
   */ 
  readonly globalCertificateArn?: string;
  /**
   * Optional. The ID of the hosted zone to create a DNS record for the specified domain.
   */ 
  readonly hostedZoneId?: string;
}

export interface StaticProps extends 
  PipelineWithRuntimeProps,
  DomainProps,
  CloudFrontWithEdgeProps,
  AppProps {
    /**
     * The directory where the app's build output is located.
     * It is relative to the root directory.
     */
    readonly outputDir?: string;
}