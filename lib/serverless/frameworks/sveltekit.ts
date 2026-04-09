import { ServerlessStack } from "../../../stacks/ServerlessStack";
import { ServerlessProps } from "../../../types";

export class SvelteKit extends ServerlessStack {
  constructor(scope: any, id: string, props: ServerlessProps) {
    super(scope, id, {
      ...props,
      framework: "sveltekit",
    });
  }
}
