import { ICluster, KubernetesManifest } from "aws-cdk-lib/aws-eks";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Asset } from "aws-cdk-lib/aws-s3-assets";
import { ISecret } from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";


export interface AuthServiceDeploymentProps {
    cluster: ICluster;
    chartAsset: Asset;
    clientCredentials: ISecret;
    release?: string;
    namespace?: string;
}

export class AuthServiceDeployment extends Construct {

    private readonly DEFAULT_RELEASE = "oidc-authservice"
    private readonly DEFAULT_NAMESPACE = "istio-system"
    
    constructor(scope: Construct, id: string, props: AuthServiceDeploymentProps) {
        super(scope, id);

        const namespace = props.namespace ??  this.DEFAULT_NAMESPACE;        
        const clientCredentials = props.clientCredentials;

        const namespaceManifest = new KubernetesManifest(this, "IstioNamespace", {
            cluster: props.cluster,
            manifest: [{
                "apiVersion": "v1",
                "kind": "Namespace",
                "metadata": {          
                    "name": namespace
                }
            }],
            overwrite: true
        });

        const sa = props.cluster.addServiceAccount("AuthServiceServiceAccount", {
            name: "oidc-authservice-sa",
            namespace: namespace
        });
        sa.node.addDependency(namespaceManifest);

        sa.role.addToPrincipalPolicy(PolicyStatement.fromJson({
            "Effect": "Allow",
            "Action": ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"],
            "Resource": [clientCredentials.secretArn]
        }));

        const helmChart = props.cluster.addHelmChart(id, {
            chartAsset: props.chartAsset,
            release: props.release ?? this.DEFAULT_RELEASE,
            namespace: namespace,
            values: {
                serviceAccount: {
                    create: false,
                    name: sa.serviceAccountName
                },
                secretProviderClass: {
                  enabled: true,
                  awsSecretName: clientCredentials.secretName
                }
            }
        });
        helmChart.node.addDependency(namespaceManifest);
    }
}