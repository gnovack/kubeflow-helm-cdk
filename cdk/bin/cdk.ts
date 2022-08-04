#!/usr/bin/env node
import { App } from 'aws-cdk-lib';
import { AwsConfig } from '../lib/config/aws';
import { DeploymentStack } from '../lib/stacks/deployment-stack';

const app = new App();

new DeploymentStack(app, 'DeploymentStack', {
  env: { account: AwsConfig.DEPLOYMENT_STACK_ACCOUNT, region: AwsConfig.DEPLOYMENT_STACK_REGION },
});

app.synth();