import { env } from "process";

export class AwsConfig {
    static readonly DEPLOYMENT_STACK_ACCOUNT = env.DEPLOYMENT_STACK_ACCOUNT
    static readonly DEPLOYMENT_STACK_REGION = env.DEPLOYMENT_STACK_REGION
}