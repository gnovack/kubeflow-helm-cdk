import { KubernetesManifest, ICluster } from "aws-cdk-lib/aws-eks";
import { Construct } from "constructs";
import { HelmCharts, HelmRepositories } from "../config/helm";

export interface IstioDeploymentProps {
    cluster: ICluster;
    baseRelease?: string;
    isitodRelease?: string;
    namespace?: string;
    version?: string;
}

export class IstioVersion {
    static readonly V_1_13_0 = "v1.13.0";
    static readonly V_1_12_7 = "v1.12.7";
}

export class IstioDeployment extends Construct {

    private readonly DEFAULT_BASE_RELEASE = "istio-base"
    private readonly DEFAULT_ISITOD_RELEASE = "istiod"
    private readonly DEFAULT_NAMESPACE = "istio-system"
    private readonly DEFAULT_VERSION = IstioVersion.V_1_13_0;
    
    constructor(scope: Construct, id: string, props: IstioDeploymentProps) {
        super(scope, id);

        const namespace = props.namespace ? props.namespace : this.DEFAULT_NAMESPACE;

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

        const baseChart = props.cluster.addHelmChart(`${id}-base`, {
            repository: HelmRepositories.ISTIO,
            chart: HelmCharts.ISTIO_BASE,
            release: props.baseRelease ?? this.DEFAULT_BASE_RELEASE,
            namespace: namespace,
            version: props.version ?? this.DEFAULT_VERSION
        });
        baseChart.node.addDependency(namespaceManifest);

        const istiodChart = props.cluster.addHelmChart(`${id}-istiod`, {
            repository: HelmRepositories.ISTIO,
            chart: HelmCharts.ISTIO_ISTIOD,
            release: props.isitodRelease ?? this.DEFAULT_ISITOD_RELEASE,
            namespace: namespace,
            version: props.version ?? this.DEFAULT_VERSION
        });
        istiodChart.node.addDependency(baseChart);
        istiodChart.node.addDependency(namespaceManifest);
    }
}