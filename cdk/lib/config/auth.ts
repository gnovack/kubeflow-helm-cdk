import { env } from "process";

export class AuthConfig {
    static readonly SAMPLE_USER_PASSWORD_ARN = env.SAMPLE_USER_PASSWORD_ARN as string;
}