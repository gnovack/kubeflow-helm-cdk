import { ICluster } from "aws-cdk-lib/aws-eks";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Asset } from "aws-cdk-lib/aws-s3-assets";
import { ISecret, Secret } from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";


export interface DexDeploymentProps {
    cluster: ICluster;
    chartAsset: Asset;
    release?: string;
    namespace?: string;
    clientCredentials?: ISecret;
    userPassword: ISecret;
}

export class DexDeployment extends Construct {

    private readonly DEFAULT_RELEASE = "dex"
    private readonly DEFAULT_NAMESPACE = "auth"

    readonly clientCredentials: ISecret;
    readonly userPassword: ISecret;
    
    constructor(scope: Construct, id: string, props: DexDeploymentProps) {
        super(scope, id);
        
        const namespace = props.namespace ?? this.DEFAULT_NAMESPACE;
        
        this.clientCredentials = new Secret(this, "ClientCredentials", {
            secretName: "oidcClientCredentials",
            generateSecretString: {
              secretStringTemplate: JSON.stringify({ CLIENT_ID: "kubeflow-oidc-authservice" }),
              generateStringKey: "CLIENT_SECRET"
            }
        });
        
        this.userPassword = props.userPassword;

        const namespaceManifest = props.cluster.addManifest("DexNamespace", {
            "apiVersion": "v1",
            "kind": "Namespace",
            "metadata": {          
                "name": namespace,
                "labels": {
                    "istio-injection": "enabled"
                }
            }
        });

        const serviceAccount = props.cluster.addServiceAccount("DexServiceAccount", {
            name: "dex-sa",
            namespace: namespace
        });
        serviceAccount.node.addDependency(namespaceManifest);

        serviceAccount.role.addToPrincipalPolicy(PolicyStatement.fromJson({
            "Effect": "Allow",
            "Action": ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"],
            "Resource": [this.clientCredentials.secretArn, this.userPassword.secretArn]
        }));

        const helmChart = props.cluster.addHelmChart(id, {
            chartAsset: props.chartAsset,
            release: props.release ?? this.DEFAULT_RELEASE,
            namespace: namespace,
            values: {
                dex: {
                    serviceAccount: {
                        create: false,
                        name: serviceAccount.serviceAccountName
                    }
                },
                secretProviderClass: {
                    clientCredentialsSecret: {
                        awsSecret: this.clientCredentials.secretName
                    },
                    staticPasswordSecret: {
                        awsSecret: this.userPassword.secretName
                    }
                }
            }
        });
        helmChart.node.addDependency(namespaceManifest);
        
    }
}