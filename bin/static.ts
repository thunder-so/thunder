import { App } from "aws-cdk-lib";
import { StaticStack, type StaticProps } from '../';

const app = new App();

const metadata: StaticProps = app.node.tryGetContext('metadata');

if (!metadata) {
  throw new Error('Context metadata missing!');
}

new StaticStack(app, `${metadata.application}-${metadata.service}-${metadata.environment}-stack`, metadata);

app.synth();
