import { InstanceType } from "aws-cdk-lib/aws-ec2";
import { AppProps } from './AppProps';
import { HydrateResult } from '../lib/template/template/hydrate';
import { VpcLinkProps } from './VpcProps';

/**
 * Domain and SSL properties
 */
interface TemplateDomainProps {
  /**
   * Domain name for the service (e.g. 'app.example.com').
   */
  readonly domain?: string;
  /**
   * Route53 Hosted Zone ID for automated DNS.
   */
  readonly hostedZoneId?: string;
  /**
   * Email for Let's Encrypt / ACME registration.
   * Required if 'domain' is set.
   */
  readonly acmeEmail?: string;
}

export interface TemplateBaseProps {
  /**
   * Optional. The EC2 instance type for the template server. Defaults to InstanceType.of(InstanceClass.T3, InstanceSize.MICRO).
   */
  readonly instanceType?: InstanceType;
  /**
   * The hydrated template result containing compose configuration.
   */
  readonly hydrateResult: HydrateResult;
  /**
   * SSH public keys for instance access.
   */
  readonly authorizedKeys: string[];
  /**
   * The template identifier slug.
   */
  readonly templateSlug: string;
  /**
   * Optional. CloudWatch log retention in days. Defaults to RetentionDays.ONE_MONTH (30 days).
   */
  readonly logRetentionDays?: number;
}

export interface TemplateProps extends 
  AppProps, 
  VpcLinkProps, 
  TemplateDomainProps,
  TemplateBaseProps {}