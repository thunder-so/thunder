import { App } from "aws-cdk-lib";
import { Static, type StaticProps } from '../';

const app = new App();

const metadata: StaticProps = app.node.tryGetContext('metadata');

if (!metadata) {
  throw new Error('Context metadata missing!');
}

new Static(app, `${metadata.application}-${metadata.service}-${metadata.environment}-stack`, metadata);

app.synth();
