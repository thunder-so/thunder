import path from "path";
import { Aws, Duration, RemovalPolicy, CfnOutput } from "aws-cdk-lib";
import { Construct } from "constructs";
import {
  PolicyStatement,
  Effect,
  ServicePrincipal,
  AnyPrincipal,
} from "aws-cdk-lib/aws-iam";
import {
  Bucket,
  BlockPublicAccess,
  ObjectOwnership,
  BucketEncryption,
} from "aws-cdk-lib/aws-s3";
import {
  BucketDeployment,
  CacheControl,
  Source,
  StorageClass,
} from "aws-cdk-lib/aws-s3-deployment";
import {
  Distribution,
  CachePolicy,
  SecurityPolicyProtocol,
  HttpVersion,
  ResponseHeadersPolicy,
  HeadersFrameOption,
  HeadersReferrerPolicy,
  type BehaviorOptions,
  AllowedMethods,
  ViewerProtocolPolicy,
  CacheCookieBehavior,
  CacheHeaderBehavior,
  CacheQueryStringBehavior,
  CfnOriginAccessControl,
  CachedMethods,
  LambdaEdgeEventType,
  AccessLevel,
  experimental,
  IOrigin,
} from "aws-cdk-lib/aws-cloudfront";
import { HttpOrigin, S3BucketOrigin } from "aws-cdk-lib/aws-cloudfront-origins";
import { RetentionDays, LogGroup } from "aws-cdk-lib/aws-logs";
import { Certificate } from "aws-cdk-lib/aws-certificatemanager";
import {
  AaaaRecord,
  ARecord,
  HostedZone,
  type IHostedZone,
  RecordTarget,
} from "aws-cdk-lib/aws-route53";
import { CloudFrontTarget } from "aws-cdk-lib/aws-route53-targets";
import { Runtime, Code } from "aws-cdk-lib/aws-lambda";
import {
  ServerlessProps,
  ServerlessClientProps,
  ServerlessServerProps,
} from "../../types/ServerlessProps";
import { getResourceIdPrefix } from "../utils";

export interface ServerlessClientConstructProps extends ServerlessProps {
  httpOrigin: HttpOrigin;
  framework: string;
}

export class ServerlessClient extends Construct {
  private readonly resourceIdPrefix: string;
  public staticAssetsBucket: Bucket;
  private accessLogsBucket: Bucket | undefined;
  public cdn: Distribution;
  private s3Origin: IOrigin;
  public originAccessControl: CfnOriginAccessControl | undefined;
  private fallbackFunction: experimental.EdgeFunction | undefined;

  constructor(
    scope: Construct,
    id: string,
    props: ServerlessClientConstructProps,
  ) {
    super(scope, id);

    // Set the resource prefix
    this.resourceIdPrefix = getResourceIdPrefix(
      props.application,
      props.service,
      props.environment,
    );

    // Create the static asset bucket
    this.staticAssetsBucket = this.createStaticAssetsBucket(props);

    // Create the fallback Lambda@edge if needed
    if (props.clientProps?.useFallbackEdge) {
      this.fallbackFunction = this.createEdgeLambda(props);
    }

    // Create the CDN
    this.cdn = this.createCloudFrontDistribution(props);

    // Grant CloudFront permission to get the objects from the s3 bucket origin
    this.staticAssetsBucket.addToResourcePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["s3:GetObject"], // 's3:ListBucket' slows down deployment
        principals: [new ServicePrincipal("cloudfront.amazonaws.com")],
        resources: [`${this.staticAssetsBucket.bucketArn}/*`],
        conditions: {
          StringEquals: {
            "AWS:SourceArn": `arn:aws:cloudfront::${Aws.ACCOUNT_ID}:distribution/${this.cdn.distributionId}`,
          },
        },
      }),
    );

    // Bucket deployment
    this.setupDeployments(props);

    // Set the domains with Route53
    if (props.domain && props.globalCertificateArn && props.hostedZoneId) {
      this.createDnsRecords(props);
    }

    // Standardized Outputs
    new CfnOutput(this, "DistributionId", {
      value: this.cdn.distributionId,
      description: "The ID of the CloudFront distribution",
      exportName: `${this.resourceIdPrefix}-DistributionId`,
    });

    new CfnOutput(this, "DistributionUrl", {
      value: `https://${this.cdn.distributionDomainName}`,
      description: "The URL of the CloudFront distribution",
      exportName: `${this.resourceIdPrefix}-DistributionUrl`,
    });

    if (props.domain) {
      new CfnOutput(this, "Route53Domain", {
        value: `https://${props.domain}`,
        description: "The custom domain URL",
        exportName: `${this.resourceIdPrefix}-Route53Domain`,
      });
    }
  }

  /**
   * Creates the bucket to store the static deployment asset files of the app.
   *
   * @private
   */
  private createStaticAssetsBucket(
    props: ServerlessClientConstructProps,
  ): Bucket {
    // Hosting bucket access log bucket
    const originLogsBucket = props.debug
      ? new Bucket(this, "OriginLogsBucket", {
          bucketName: `${this.resourceIdPrefix}-origin-logs`,
          encryption: BucketEncryption.S3_MANAGED,
          blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
          objectOwnership: ObjectOwnership.OBJECT_WRITER,
          enforceSSL: true,
          removalPolicy: RemovalPolicy.DESTROY,
          autoDeleteObjects: false,
        })
      : undefined;

    const bucket = new Bucket(this, "AssetsBucket", {
      bucketName: `${this.resourceIdPrefix}-assets`,
      encryption: BucketEncryption.S3_MANAGED,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      objectOwnership: ObjectOwnership.BUCKET_OWNER_ENFORCED,
      serverAccessLogsBucket: originLogsBucket,
      versioned: true,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: false,
    });

    // Create the Origin Access Control
    this.originAccessControl = new CfnOriginAccessControl(this, "OAC", {
      originAccessControlConfig: {
        name: `${this.resourceIdPrefix}-OAC`,
        description: `Origin Access Control for ${this.resourceIdPrefix}`,
        originAccessControlOriginType: "s3",
        signingBehavior: "always",
        signingProtocol: "sigv4",
      },
    });

    this.s3Origin = S3BucketOrigin.withOriginAccessControl(bucket, {
      originId: `${this.resourceIdPrefix}-s3origin`,
      originAccessLevels: [AccessLevel.READ],
      originAccessControlId: this.originAccessControl?.attrId,
    });

    // Update the bucket policy to allow access from CloudFront via OAC
    bucket.addToResourcePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["s3:GetObject"],
        principals: [new AnyPrincipal()],
        resources: [`${bucket.bucketArn}/*`],
        conditions: {
          StringEquals: {
            "AWS:SourceArn": `arn:aws:cloudfront::${Aws.ACCOUNT_ID}:origin-access-control/${this.originAccessControl?.attrId}`,
            "aws:SourceAccount": Aws.ACCOUNT_ID,
          },
        },
      }),
    );

    return bucket;
  }

  /**
   * Creates the CloudFront function that fallbacks the request URL for SPA-style routing
   *
   * @private
   */
  private createEdgeLambda(
    props: ServerlessClientConstructProps,
  ): experimental.EdgeFunction {
    const edgeFunction = new experimental.EdgeFunction(
      this,
      "FallbackEdgeFunction",
      {
        functionName: `${this.resourceIdPrefix}-fallback-edge`,
        runtime: props.serverProps?.runtime || Runtime.NODEJS_20_X,
        handler: "index.handler",
        memorySize: 128,
        code: Code.fromInline(`
        'use strict';

        exports.handler = (event, context, callback) => {
          const response = event.Records[0].cf.response;
          const request = event.Records[0].cf.request;
          const host = event.Records[0].cf.config.distributionDomainName;

          // http origin returned a 404 for path, redirect to s3 origin
          if (response.status == '404') {
            let redirectUrl;

            if (request.uri.endsWith('/')) {
              redirectUrl = 'https://' + host + request.uri + 'index.html';
            } else if (!request.uri.includes('.')) {
              redirectUrl = 'https://' + host + request.uri + '/index.html';
            }

            // Return a 302 redirect response
            callback(null, {
              status: '302',
              statusDescription: 'Found',
              headers: {
                'Location': [{ key: 'Location', value: redirectUrl }],
              }
            });

          // S3 origin returned 403 Access Denied for index.html, return a true 404
          } else if (response.status == '403') {

            callback(null, {
              status: '404',
              statusDescription: 'Not Found',
              headers: response.headers,
              body: '<h1>404 Not Found</h1>',
            });

          } else {
            // passthrough all else
            callback(null, response);
          }
        };
      `),
      },
    );

    // Grant the Edge Lambda permission to read from the S3 bucket
    this.staticAssetsBucket.grantRead(edgeFunction);

    return edgeFunction;
  }

  /**
   * Creates the CloudFront distribution that routes incoming requests to the Lambda function (via API gateway)
   * or the S3 assets folder (with caching).
   *
   * @private
   */
  private createCloudFrontDistribution(
    props: ServerlessClientConstructProps,
  ): Distribution {
    // access logs bucket
    this.accessLogsBucket = props.debug
      ? new Bucket(this, "AccessLogsBucket", {
          bucketName: `${this.resourceIdPrefix}-access-logs`,
          encryption: BucketEncryption.S3_MANAGED,
          blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
          objectOwnership: ObjectOwnership.OBJECT_WRITER,
          enforceSSL: true,
          removalPolicy: RemovalPolicy.DESTROY,
          autoDeleteObjects: false,
        })
      : undefined;

    /**
     * Response Headers Policy
     * This policy is used to set default security headers for the CloudFront distribution.
     */
    const responseHeadersPolicy = new ResponseHeadersPolicy(
      this,
      "ResponseHeadersPolicy",
      (props.responseHeadersPolicy ??
        props.clientProps?.responseHeadersPolicy) || {
        comment: "ResponseHeadersPolicy" + Aws.STACK_NAME + "-" + Aws.REGION,
        securityHeadersBehavior: {
          contentSecurityPolicy: {
            contentSecurityPolicy:
              "default-src 'self'; style-src https: 'unsafe-inline'; script-src https: 'unsafe-inline' 'wasm-unsafe-eval'; font-src https: 'unsafe-inline'; connect-src https: wss: 'unsafe-inline'; img-src https: data:; base-uri 'self'; form-action 'self';",
            override: true,
          },
          strictTransportSecurity: {
            accessControlMaxAge: Duration.days(365),
            includeSubdomains: true,
            preload: true,
            override: true,
          },
          contentTypeOptions: {
            override: true,
          },
          referrerPolicy: {
            referrerPolicy:
              HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
            override: true,
          },
          frameOptions: {
            frameOption: HeadersFrameOption.DENY,
            override: true,
          },
          xssProtection: {
            protection: true,
            modeBlock: true,
            override: true,
          },
        },
        corsBehavior: {
          accessControlAllowCredentials: false,
          accessControlAllowHeaders: ["*"],
          accessControlAllowMethods: ["GET", "HEAD", "OPTIONS"],
          accessControlAllowOrigins: ["*"],
          accessControlExposeHeaders: [],
          accessControlMaxAge: Duration.seconds(600),
          originOverride: true,
        },
        customHeadersBehavior: {
          customHeaders: [],
        },
        removeHeaders: ["server", "age", "date"],
      },
    );

    /**
     * The default cache policy for SSR
     * This policy is used for the default and API behaviours of the CloudFront distribution.
     */
    const serverCachePolicy = new CachePolicy(this, "ServerCachePolicy", {
      cachePolicyName: `${this.resourceIdPrefix}-cache-policy`,
      comment: "Cache policy for SSR",
      defaultTtl: Duration.seconds(0),
      minTtl: Duration.seconds(0),
      maxTtl: Duration.seconds(1),
      headerBehavior: (props.allowHeaders ?? props.clientProps?.allowHeaders)
        ?.length
        ? CacheHeaderBehavior.allowList(
            ...(props.allowHeaders ?? props.clientProps!.allowHeaders)!,
          )
        : CacheHeaderBehavior.none(),
      cookieBehavior: (props.allowCookies ?? props.clientProps?.allowCookies)
        ?.length
        ? CacheCookieBehavior.allowList(
            ...(props.allowCookies ?? props.clientProps!.allowCookies)!,
          )
        : CacheCookieBehavior.none(),
      queryStringBehavior: (
        props.allowQueryParams ?? props.clientProps?.allowQueryParams
      )?.length
        ? CacheQueryStringBehavior.allowList(
            ...(props.allowQueryParams ?? props.clientProps!.allowQueryParams)!,
          )
        : (props.denyQueryParams ?? props.clientProps?.denyQueryParams)?.length
          ? CacheQueryStringBehavior.denyList(
              ...(props.denyQueryParams ?? props.clientProps!.denyQueryParams)!,
            )
          : CacheQueryStringBehavior.none(),
      enableAcceptEncodingGzip: true,
      enableAcceptEncodingBrotli: true,
    });

    /**
     * ROUTE BEHAVIORS
     *
     * Creates a behavior for the CloudFront distribution to route incoming web requests
     * to the Lambda function (via API gateway).
     * Additionally, this automatically redirects HTTP requests to HTTPS.
     */
    const defaultRouteBehavior: BehaviorOptions = {
      origin: props.httpOrigin,
      compress: true,
      allowedMethods: AllowedMethods.ALLOW_GET_HEAD,
      cachePolicy: serverCachePolicy,
      viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      responseHeadersPolicy: responseHeadersPolicy,
      ...(this.fallbackFunction && {
        edgeLambdas: [
          {
            functionVersion: this.fallbackFunction.currentVersion,
            eventType: LambdaEdgeEventType.ORIGIN_RESPONSE,
          },
        ],
      }),
    };

    const additionalBehaviors: Record<string, BehaviorOptions> = {};

    const apiRouteBehavior: BehaviorOptions = {
      origin: props.httpOrigin,
      compress: true,
      allowedMethods: AllowedMethods.ALLOW_ALL,
      cachedMethods: CachedMethods.CACHE_GET_HEAD_OPTIONS,
      cachePolicy: serverCachePolicy,
      viewerProtocolPolicy: ViewerProtocolPolicy.HTTPS_ONLY,
    };

    const staticAssetsBehavior: BehaviorOptions = {
      origin: this.s3Origin,
      compress: true,
      allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
      cachedMethods: CachedMethods.CACHE_GET_HEAD_OPTIONS,
      cachePolicy: CachePolicy.CACHING_OPTIMIZED,
      viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    };

    // loop through the server paths and attach api behavior - default to /api/*
    for (const pattern of props.serverProps?.paths || ["/api/*"]) {
      additionalBehaviors[pattern] = apiRouteBehavior;
    }
    // take all the static assets and attach the static assets behavior
    additionalBehaviors["*.*"] = staticAssetsBehavior;

    /**
     * Create the CDN
     */
    return new Distribution(this, "CDN", {
      comment: "Stack: " + Aws.STACK_NAME,
      enableLogging: props.debug ? true : false,
      minimumProtocolVersion: SecurityPolicyProtocol.TLS_V1_2_2021,
      httpVersion: HttpVersion.HTTP3,
      defaultBehavior: defaultRouteBehavior,
      additionalBehaviors: additionalBehaviors,
      logBucket: this.accessLogsBucket,
      logIncludesCookies: true,
      ...(props.domain && props.globalCertificateArn
        ? {
            domainNames: [props.domain],
            certificate: Certificate.fromCertificateArn(
              this,
              `${this.resourceIdPrefix}-global-certificate`,
              props.globalCertificateArn,
            ),
          }
        : {}),
    });
  }

  /**
   * Sets up the deployment of static assets to S3
   */
  private setupDeployments(props: ServerlessClientConstructProps): void {
    const assetsSourcePath = path.join(
      props.contextDirectory || "",
      props.rootDir || "./",
      props.clientProps?.outputDir || ".output/public",
    );

    new BucketDeployment(this, "AssetsDeployment", {
      sources: [
        Source.asset(assetsSourcePath, {
          exclude: props.buildProps?.exclude,
        }),
      ],
      include: props.buildProps?.include,
      destinationBucket: this.staticAssetsBucket,
      distribution: this.cdn,
      distributionPaths: ["/**"],
      prune: false,
      storageClass: StorageClass.STANDARD,
      cacheControl: [
        CacheControl.setPublic(),
        CacheControl.maxAge(Duration.days(365)),
        CacheControl.fromString("immutable"),
      ],
      logGroup: new LogGroup(this, "BucketDeploymentLogGroup", {
        logGroupName: `${this.resourceIdPrefix}-deployment-logs`,
        retention: RetentionDays.ONE_DAY,
      }),
      metadata: {
        revision: new Date().toISOString(),
      },
      memoryLimit: 1792,
    });
  }

  /**
   * Resolves the hosted zone at which the DNS records shall be created to access the app on the internet.
   *
   * @param props
   * @private
   */
  private findHostedZone(
    props: ServerlessClientConstructProps,
  ): IHostedZone | void {
    const domainParts = props.domain?.split(".");
    if (!domainParts) return;

    return HostedZone.fromHostedZoneAttributes(this, "HostedZone", {
      hostedZoneId: props.hostedZoneId as string,
      zoneName: domainParts[domainParts.length - 1], // Support subdomains
    });
  }

  /**
   * Creates the DNS records to access the app on the internet via the custom domain.
   *
   * @param props
   * @private
   */
  private createDnsRecords(props: ServerlessClientConstructProps): void {
    const hostedZone = this.findHostedZone(props);
    const dnsTarget = RecordTarget.fromAlias(new CloudFrontTarget(this.cdn));

    // Create a record for IPv4
    new ARecord(this, "Ipv4Record", {
      recordName: props.domain,
      zone: hostedZone as IHostedZone,
      target: dnsTarget,
    });

    // Create a record for IPv6
    new AaaaRecord(this, "Ipv6Record", {
      recordName: props.domain,
      zone: hostedZone as IHostedZone,
      target: dnsTarget,
    });
  }
}
