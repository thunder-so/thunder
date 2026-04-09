import { ServerlessStack } from "../../../stacks/ServerlessStack";
import { ServerlessProps } from "../../../types";

export class AnalogJS extends ServerlessStack {
  constructor(scope: any, id: string, props: ServerlessProps) {
    super(scope, id, {
      ...props,
      framework: "analogjs",
    });
  }
}
