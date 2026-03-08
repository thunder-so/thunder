import { type ResponseHeadersPolicyProps } from "aws-cdk-lib/aws-cloudfront";

/**
 * CloudFront Lambda@edge properties
 */
export interface EdgeProps {
  /**
   * Optional: Redirects with Lambda@Edge
   * Array of redirects: source and destination paths
   */
  readonly redirects?: { source: string; destination: string }[];
  /**
   * Optional: Rewrites with Lambda@Edge
   * Array of rewrites: source and destination paths
   */
  readonly rewrites?: { source: string; destination: string }[];
  /**
   * Optional: Custom headers with Lambda@Edge
   */
  readonly headers?: { path: string; name: string; value: string }[];
}

/**
 * AWS CloudFront properties
 */
export interface CloudFrontProps {
  /**
   * Optional. Custom response headers.
   */
  readonly responseHeadersPolicy?: ResponseHeadersPolicyProps;

  /**
   * Optional. The path to the error page in the output directory. e.g. /404.html
   * Relative to the output directory.
   */
  readonly errorPagePath?: string;
  /**
   * Optional. An array of headers to include in the cache key and pass to the origin on requests.
   * No headers are passed by default.
   */
  readonly allowHeaders?: string[];
  /**
   * Optional. An array of cookies to include in the cache key and pass to the origin on requests.
   * No cookies are passed by default.
   */
  readonly allowCookies?: string[];
  /**
   * Optional. An array of query parameter keys to include in the cache key and pass to the origin on requests.
   * No query parameters are passed by default.
   * You have specific query parameters that alter the content (e.g., ?userId=, ?lang=, etc.).
   * You want to cache different versions of the content based on these parameters.
   */
  readonly allowQueryParams?: string[];
  /**
   * Optional. An array of query param keys to deny passing to the origin on requests.
   * You have query parameters that should be ignored for caching purposes (e.g., tracking parameters like ?utm_source= or ?fbclid=).
   * You want to prevent these parameters from affecting cache performance.
   * Note that this config can not be combined with allowQueryParams.
   * If both are specified, the denyQueryParams will be ignored.
   */
  readonly denyQueryParams?: string[];
}

export interface CloudFrontWithEdgeProps extends EdgeProps, CloudFrontProps {}