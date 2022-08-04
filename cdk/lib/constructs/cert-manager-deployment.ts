import { ICluster } from "aws-cdk-lib/aws-eks";
import { Construct } from "constructs";
import { HelmCharts, HelmRepositories } from "../config/helm";

export interface CertManagerDeploymentProps {
    cluster: ICluster;
    release?: string;
    namespace?: string;
    createNamespace?: boolean;
    version?: string;
}

export class CertManagerVersion {
    static readonly V_1_3_1 = "v1.3.1";
}

export class CertManagerDeployment extends Construct {

    private readonly DEFAULT_RELEASE = "cert-manager";
    private readonly DEFAULT_NAMESPACE = "cert-manager";
    private readonly DEFAULT_VERSION = CertManagerVersion.V_1_3_1;
    
    constructor(scope: Construct, id: string, props: CertManagerDeploymentProps) {
        super(scope, id);

        props.cluster.addHelmChart(id, {
            repository: HelmRepositories.JETSTACK,
            chart: HelmCharts.CERT_MANAGER,
            release: props.release ?? this.DEFAULT_RELEASE,
            namespace: props.namespace ?? this.DEFAULT_NAMESPACE,
            createNamespace: props.createNamespace ?? true,
            version: props.version ?? this.DEFAULT_VERSION,
            values: {
                installCRDs: true
            }
        });
    }
}