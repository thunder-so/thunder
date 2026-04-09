import { ServerlessStack } from "../../../stacks/ServerlessStack";
import { ServerlessProps } from "../../../types";

export class SolidStart extends ServerlessStack {
  constructor(scope: any, id: string, props: ServerlessProps) {
    super(scope, id, {
      ...props,
      framework: "solid-start",
    });
  }
}
