import process = require("process");

export class Env {
  static readonly account = process.env.CDK_DEFAULT_ACCOUNT;
  static readonly region = process.env.CDK_DEFAULT_REGION;
}
