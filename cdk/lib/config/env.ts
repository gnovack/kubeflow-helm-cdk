import process = require("process");

export class Env {
  static readonly account = process.env.CDK_DEFAULT_ACCOUNT;
  static readonly region = process.env.CDK_DEFAULT_REGION;

  static readonly SAMPLE_USER_PASSWORD_ARN =
    process.env.SAMPLE_USER_PASSWORD_ARN ??
    "arn:aws:secretsmanager:us-west-2:xxx:secret:dexUserPassword-j5qJDL";
}
