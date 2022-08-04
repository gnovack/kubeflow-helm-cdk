import { ICluster } from "aws-cdk-lib/aws-eks";
import { Construct } from "constructs";
import { HelmCharts, HelmRepositories } from "../config/helm";

export interface SecretsProviderDeploymentProps {
    cluster: ICluster;
}

export class SecretsProviderDeployment extends Construct {
    
    constructor(scope: Construct, id: string, props: SecretsProviderDeploymentProps) {
        super(scope, id);

        const cluster = props.cluster;

        cluster.addHelmChart(id + "CsiDriver", {
            repository: HelmRepositories.SECRET_STORE_CSI_DRIVER,
            chart: HelmCharts.SECRET_STORE_CSI_DRIVER,
            release: "secrets-store-csi-driver",
            namespace: "kube-system",
            values: {
                syncSecret: {
                    enabled: true
                },
                enableSecretRotation: true
            }
        });

        const ascpServiceAccount = cluster.addManifest(id + "AscpServiceAccount", {
            "apiVersion": "v1",
            "kind": "ServiceAccount",
            "metadata": {
                "name": "csi-secrets-store-provider-aws",
                "namespace": "kube-system"
            }
        });

        const ascpClusterRole = cluster.addManifest(id + "AscpClusterRole", {
            "apiVersion": "rbac.authorization.k8s.io/v1",
            "kind": "ClusterRole",
            "metadata": {
              "name": "csi-secrets-store-provider-aws-cluster-role"
            },
            "rules": [
              {
                "apiGroups": [
                  ""
                ],
                "resources": [
                  "serviceaccounts/token"
                ],
                "verbs": [
                  "create"
                ]
              },
              {
                "apiGroups": [
                  ""
                ],
                "resources": [
                  "serviceaccounts"
                ],
                "verbs": [
                  "get"
                ]
              },
              {
                "apiGroups": [
                  ""
                ],
                "resources": [
                  "pods"
                ],
                "verbs": [
                  "get"
                ]
              },
              {
                "apiGroups": [
                  ""
                ],
                "resources": [
                  "nodes"
                ],
                "verbs": [
                  "get"
                ]
              }
            ]
        });

        const ascpClusterRoleBinding = cluster.addManifest(id + "AscpClusterRoleBinding", {
            "apiVersion": "rbac.authorization.k8s.io/v1",
            "kind": "ClusterRoleBinding",
            "metadata": {
              "name": "csi-secrets-store-provider-aws-cluster-rolebinding"
            },
            "roleRef": {
              "apiGroup": "rbac.authorization.k8s.io",
              "kind": "ClusterRole",
              "name": "csi-secrets-store-provider-aws-cluster-role"
            },
            "subjects": [
              {
                "kind": "ServiceAccount",
                "name": "csi-secrets-store-provider-aws",
                "namespace": "kube-system"
              }
            ]
        });

        const ascpDaemonset = cluster.addManifest(id + "AscpDaemonset", {
            "apiVersion": "apps/v1",
            "kind": "DaemonSet",
            "metadata": {
              "namespace": "kube-system",
              "name": "csi-secrets-store-provider-aws",
              "labels": {
                "app": "csi-secrets-store-provider-aws"
              }
            },
            "spec": {
              "updateStrategy": {
                "type": "RollingUpdate"
              },
              "selector": {
                "matchLabels": {
                  "app": "csi-secrets-store-provider-aws"
                }
              },
              "template": {
                "metadata": {
                  "labels": {
                    "app": "csi-secrets-store-provider-aws"
                  }
                },
                "spec": {
                  "serviceAccountName": "csi-secrets-store-provider-aws",
                  "hostNetwork": true,
                  "containers": [
                    {
                      "name": "provider-aws-installer",
                      "image": "public.ecr.aws/aws-secrets-manager/secrets-store-csi-driver-provider-aws:1.0.r2-6-gee95299-2022.04.14.21.07",
                      "imagePullPolicy": "Always",
                      "args": [
                        "--provider-volume=/etc/kubernetes/secrets-store-csi-providers"
                      ],
                      "resources": {
                        "requests": {
                          "cpu": "50m",
                          "memory": "100Mi"
                        },
                        "limits": {
                          "cpu": "50m",
                          "memory": "100Mi"
                        }
                      },
                      "volumeMounts": [
                        {
                          "mountPath": "/etc/kubernetes/secrets-store-csi-providers",
                          "name": "providervol"
                        },
                        {
                          "name": "mountpoint-dir",
                          "mountPath": "/var/lib/kubelet/pods",
                          "mountPropagation": "HostToContainer"
                        }
                      ]
                    }
                  ],
                  "volumes": [
                    {
                      "name": "providervol",
                      "hostPath": {
                        "path": "/etc/kubernetes/secrets-store-csi-providers"
                      }
                    },
                    {
                      "name": "mountpoint-dir",
                      "hostPath": {
                        "path": "/var/lib/kubelet/pods",
                        "type": "DirectoryOrCreate"
                      }
                    }
                  ],
                  "nodeSelector": {
                    "kubernetes.io/os": "linux"
                  }
                }
              }
            }
        });
    }
}