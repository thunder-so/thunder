import { FrameworkConfig, ServerlessProps } from "../../types/ServerlessProps";

export const FRAMEWORK_CONFIGS: Record<string, FrameworkConfig> = {
  nuxt: {
    name: "Nuxt",
    defaultServerDir: ".output/server",
    defaultClientDir: ".output/public",
    defaultHandler: "index.handler",
    defaultServerPaths: ["/api/*"],
    requiresFallbackEdge: false,
    nitroPreset: "aws-lambda",
  },
  astro: {
    name: "Astro",
    defaultServerDir: "dist/lambda",
    defaultClientDir: "dist/client",
    defaultHandler: "entry.handler",
    defaultServerPaths: ["/api/*"],
    requiresFallbackEdge: true,
    nitroPreset: "aws-lambda",
  },
  "tanstack-start": {
    name: "TanStack Start",
    defaultServerDir: ".output/server",
    defaultClientDir: ".output/public",
    defaultHandler: "index.handler",
    defaultServerPaths: ["/api/*"],
    requiresFallbackEdge: false,
    nitroPreset: "aws-lambda",
  },
  sveltekit: {
    name: "SvelteKit",
    defaultServerDir: "build",
    defaultClientDir: "build/client",
    defaultHandler: "index.handler",
    defaultServerPaths: ["/api/*"],
    requiresFallbackEdge: false,
    adapterRequired: true,
    defaultIncludes: ["package.json"],
  },
  "solid-start": {
    name: "Solid Start",
    defaultServerDir: ".output/server",
    defaultClientDir: ".output/public",
    defaultHandler: "index.handler",
    defaultServerPaths: ["/api/*"],
    requiresFallbackEdge: false,
    nitroPreset: "aws-lambda",
  },
  analogjs: {
    name: "AnalogJS",
    defaultServerDir: "dist/analog/server",
    defaultClientDir: "dist/analog/public",
    defaultHandler: "index.handler",
    defaultServerPaths: ["/api/*"],
    requiresFallbackEdge: false,
    nitroPreset: "aws-lambda",
  },
};

export function getFrameworkConfig(framework: string): FrameworkConfig {
  const config = FRAMEWORK_CONFIGS[framework];
  if (!config) {
    throw new Error(`Unknown framework: ${framework}`);
  }
  return config;
}

export function mergePropsWithDefaults(
  props: ServerlessProps & { framework: string },
  config: FrameworkConfig,
): ServerlessProps & { framework: string } {
  return {
    ...props,
    serverProps: {
      codeDir: config.defaultServerDir,
      handler: config.defaultHandler,
      paths: config.defaultServerPaths,
      ...(config.defaultIncludes && { include: config.defaultIncludes }),
      ...props.serverProps,
    },
    clientProps: {
      outputDir: config.defaultClientDir,
      useFallbackEdge: config.requiresFallbackEdge,
      ...props.clientProps,
    },
  };
}
