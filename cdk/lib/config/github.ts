import { env } from "process"; 

export class GithubConfig {
    static readonly GITHUB_REPO: string = "gnovack/kubeflow-helm-cdk";
    static readonly GITHUB_CODESTAR_CONNECTION_ARN = env.GITHUB_CODESTAR_CONNECTION_ARN as string;
}