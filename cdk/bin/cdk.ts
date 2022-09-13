#!/usr/bin/env node
import { App } from "aws-cdk-lib";

import { DeploymentStack } from "../lib/stacks/deployment-stack";
import { Env } from "../lib/config/env";

const env = {
  account: Env.account,
  region: Env.region,
};

const app = new App();
new DeploymentStack(app, "DeploymentStack", { env });

app.synth();
