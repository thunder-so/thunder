import { ServerlessStack } from "../../../stacks/ServerlessStack";
import { ServerlessProps } from "../../../types";

export class TanStackStart extends ServerlessStack {
  constructor(scope: any, id: string, props: ServerlessProps) {
    super(scope, id, {
      ...props,
      framework: "tanstack-start",
      serverProps: {
        streaming: true, // TanStack Start default
        ...props.serverProps,
      },
    });
  }
}
