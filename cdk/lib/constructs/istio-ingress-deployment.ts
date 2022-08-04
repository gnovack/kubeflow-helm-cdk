import { ICluster } from "aws-cdk-lib/aws-eks";
import { Asset } from "aws-cdk-lib/aws-s3-assets";
import { Construct } from "constructs";

export interface IstioIngressDeploymentProps {
    cluster: ICluster;
    chartAsset: Asset;
    release?: string;
    namespace?: string;
    createNamespace?: boolean;
}

export class IstioIngressDeployment extends Construct {

    private readonly DEFAULT_RELEASE = "istio-ingressgateway"
    private readonly DEFAULT_NAMESPACE = "istio-system"
    
    constructor(scope: Construct, id: string, props: IstioIngressDeploymentProps) {
        super(scope, id);

        props.cluster.addHelmChart(id, {
            chartAsset: props.chartAsset,
            release: props.release ?? this.DEFAULT_RELEASE,
            namespace: props.namespace ?? this.DEFAULT_NAMESPACE,
            createNamespace: props.createNamespace ?? true
        });
    }
}