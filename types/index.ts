export * from "./AppProps";
export * from "./CloudFrontProps";
export * from "./ContextProps";
export * from "./Ec2Props";
export * from "./FargateProps";
export * from "./LambdaProps";
export * from "./PipelineProps";
export * from "./ServerlessProps";
export * from "./StaticProps";
export * from "./TemplateProps";
export * from "./VpcProps";

// Framework aliases for ServerlessProps
export type {
  ServerlessProps as NuxtProps,
  ServerlessProps as AstroProps,
  ServerlessProps as SvelteKitProps,
  ServerlessProps as SolidStartProps,
  ServerlessProps as AnalogJSProps,
  ServerlessProps as TanStackStartProps,
} from "./ServerlessProps";
