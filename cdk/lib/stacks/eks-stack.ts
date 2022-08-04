import { Stack, StackProps, Tags } from 'aws-cdk-lib';
import { InstanceType, SubnetType, Vpc } from 'aws-cdk-lib/aws-ec2';
import { AlbControllerVersion, Cluster, KubernetesVersion } from 'aws-cdk-lib/aws-eks';
import { AccountPrincipal, PolicyDocument, PolicyStatement, Role } from 'aws-cdk-lib/aws-iam';
import { Asset } from 'aws-cdk-lib/aws-s3-assets';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import { CertManagerDeployment } from '../constructs/cert-manager-deployment';
import { IstioDeployment } from '../constructs/istio-deployment';
import { IstioIngressDeployment } from '../constructs/istio-ingress-deployment';
import * as path from 'path';
import { DexDeployment } from '../constructs/dex-deployment';
import { SecretsProviderDeployment } from '../constructs/secrets-provider-deployment';
import { AuthServiceDeployment } from '../constructs/oidc-authservice-deployment';
import { KubeflowDeployment } from '../constructs/kubeflow-deployment';
import { AuthConfig } from '../config/auth';


export interface EksStackProps extends StackProps {
  clusterName?: string;
  kubernetesVersion?: KubernetesVersion;
  albControllerVersion?: AlbControllerVersion;
}

export class EksStack extends Stack {

  private readonly DEFAULT_CLUSTER_NAME = "KubeflowCluster";
  private readonly DEFAULT_KUBERNETES_VERSION = KubernetesVersion.V1_19;
  private readonly DEFAULT_ALB_CONTROLLER_VERSION = AlbControllerVersion.V2_3_1;

  constructor(scope: Construct, id: string, props?: EksStackProps) {
    super(scope, id, props);

    const accountId = this.account;
    const clusterName = props?.clusterName ?? this.DEFAULT_CLUSTER_NAME
    const kubernetesVersion = props?.kubernetesVersion ?? this.DEFAULT_KUBERNETES_VERSION;
    const albControllerVersion = props?.albControllerVersion ?? this.DEFAULT_ALB_CONTROLLER_VERSION;

    // Manually created secret
    const userPasswordSecret = Secret.fromSecretCompleteArn(
      this, 
      "UserPasswordSecret", 
      AuthConfig.SAMPLE_USER_PASSWORD_ARN
    );

    const kubernetesApiAccessPolicy = new PolicyStatement({
      actions: [
        "eks:AccessKubernetesApi",
        "eks:DescribeCluster"
      ],
      resources: [
        `arn:aws:eks:*:${accountId}:cluster/*`
      ]
    })

    const eksClusterMasterRole = new Role(this, "EksClusterMasterRole", {
      assumedBy: new AccountPrincipal(accountId),
      roleName: "EksClusterMasterRole",
      inlinePolicies: {
        "KubernetesApiAccess": new PolicyDocument({
          statements: [kubernetesApiAccessPolicy]
        })
      }
    });

    const kubeflowVpc = new Vpc(this, "KubeflowVpc", {
      vpcName: "KubeflowVpc",
      cidr: "10.0.0.0/16",
      maxAzs: 2,
      natGateways: 1,
      subnetConfiguration: [
        {
          name: "PrivateSubnet",
          subnetType: SubnetType.PRIVATE_WITH_NAT,
        },
        {
          name: "PublicSubnet",
          subnetType: SubnetType.PUBLIC
        }
      ]
    });

    const cluster = new Cluster(this, "KubeflowCluster", {
      clusterName: clusterName,
      version: kubernetesVersion,
      vpc: kubeflowVpc,
      defaultCapacity: 2,
      mastersRole: eksClusterMasterRole,
      defaultCapacityInstance: new InstanceType("m5.xlarge"),
      albController: {
        version: albControllerVersion
      },
      outputClusterName: true
    });

    kubeflowVpc.publicSubnets.forEach(subnet => {
      Tags.of(subnet).add(`kubernetes.io/cluster/${clusterName}`, "owned")
    });

    kubeflowVpc.privateSubnets.forEach(subnet => {
      Tags.of(subnet).add(`kubernetes.io/cluster/${clusterName}`, "owned")
    });

    const certManagerDeployment = new CertManagerDeployment(this, "CertManagerDeployment", {
      cluster: cluster
    });

    const istioDeployment = new IstioDeployment(this, "IstioDeployment", {
      cluster: cluster
    });

    const istioIngress = new IstioIngressDeployment(this, "IstioIngressDeployment", {
      cluster: cluster,
      chartAsset: new Asset(this, "IstioIngressChart", {
        path: path.join(__dirname, "../../../charts/istio-ingress")
      }),
      createNamespace: false
    });

    const secretsProvider = new SecretsProviderDeployment(this, "SecretsProviderDeployment", {
      cluster: cluster
    });

    const dex = new DexDeployment(this, "DexDeployment", {
      cluster: cluster,
      chartAsset: new Asset(this, "DexChart", {
        path: path.join(__dirname, "../../../charts/dex-istio")
      }),
      userPassword: userPasswordSecret
    });

    const oidcAuthservice = new AuthServiceDeployment(this, "AuthServiceDeployment", {
      cluster: cluster,
      chartAsset: new Asset(this, "AuthServiceChart", {
        path: path.join(__dirname, "../../../charts/oidc-authservice")
      }),
      clientCredentials: dex.clientCredentials
    });
    oidcAuthservice.node.addDependency(istioDeployment);

    const kubeflow = new KubeflowDeployment(this, "KubeflowDeployment", {
      cluster: cluster,
      chartAsset: new Asset(this, "KubeflowChart", {
        path: path.join(__dirname, "../../../charts/kubeflow")
      }),
    });
  }
}
