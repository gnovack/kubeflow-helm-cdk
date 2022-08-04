import { Stack, StackProps } from "aws-cdk-lib";
import { CodePipeline, CodePipelineSource, ShellStep } from "aws-cdk-lib/pipelines";
import { Construct } from "constructs";
import { GithubConfig } from "../config/github";
import { EksDeploymentStage } from "../stages/eks-deployment-stage";

export class DeploymentStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        const pipeline = new CodePipeline(this, "EksDeploymentPipeline", {
            pipelineName: "EksDeploymentPipeline",
            synth: new ShellStep("Synth", {
                input: CodePipelineSource.connection(GithubConfig.GITHUB_REPO, "master", {
                    connectionArn: GithubConfig.GITHUB_CODESTAR_CONNECTION_ARN
                }),
                commands: [
                    "cd cdk",
                    "npm ci",
                    "npm run build",
                    "npx cdk synth"
                ],
                primaryOutputDirectory: "cdk/cdk.out"
            })
        });

        const eksDeploymentStage = new EksDeploymentStage(this, "EksDeploymentStage", {
            env: { account: this.account, region: this.region }
        });

        pipeline.addStage(eksDeploymentStage);
    }
}