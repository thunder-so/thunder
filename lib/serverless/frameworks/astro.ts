import { ServerlessStack } from "../../../stacks/ServerlessStack";
import { ServerlessProps } from "../../../types";

export class Astro extends ServerlessStack {
  constructor(scope: any, id: string, props: ServerlessProps) {
    super(scope, id, {
      ...props,
      framework: "astro",
      clientProps: {
        useFallbackEdge: true, // Astro needs Lambda@Edge fallback
        ...props.clientProps,
      },
    });
  }
}
