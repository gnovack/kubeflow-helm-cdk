import { ICluster, KubernetesManifest } from "aws-cdk-lib/aws-eks";
import { Asset } from "aws-cdk-lib/aws-s3-assets";
import { Construct } from "constructs";


export interface KubeflowDeploymentProps {
    cluster: ICluster;
    chartAsset: Asset;
    release?: string;
    namespace?: string;
    createNamespace?: boolean;
}

export class KubeflowDeployment extends Construct {

    private readonly DEFAULT_RELEASE = "kubeflow"
    private readonly DEFAULT_NAMESPACE = "kubeflow"
    
    constructor(scope: Construct, id: string, props: KubeflowDeploymentProps) {
        super(scope, id);
        
        const namespace = props.namespace ? props.namespace : this.DEFAULT_NAMESPACE;
        
        const namespaceManifest = new KubernetesManifest(this, "KubeflowNamespace", {
                cluster: props.cluster,
                manifest: [{
                    "apiVersion": "v1",
                    "kind": "Namespace",
                    "metadata": {          
                        "name": namespace ?? this.DEFAULT_NAMESPACE,
                        "labels": {
                            "istio-injection": "enabled"
                        }
                    }
                }],
                overwrite: true
            }
        );

        const chart = props.cluster.addHelmChart(id, {
            chartAsset: props.chartAsset,
            release: props.release ?? this.DEFAULT_RELEASE,
            namespace: namespace ?? this.DEFAULT_NAMESPACE
        });
        chart.node.addDependency(namespaceManifest);

    }
}