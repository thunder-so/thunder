import { ServerlessStack } from "../../../stacks/ServerlessStack";
import { ServerlessProps } from "../../../types";

export class Nuxt extends ServerlessStack {
  constructor(scope: any, id: string, props: ServerlessProps) {
    super(scope, id, {
      ...props,
      framework: "nuxt",
    });
  }
}
