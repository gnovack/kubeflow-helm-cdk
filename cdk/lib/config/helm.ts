export class HelmRepositories {
  static readonly JETSTACK: string = "https://charts.jetstack.io";
  static readonly ISTIO: string =
    "https://istio-release.storage.googleapis.com/charts";
  static readonly SECRET_STORE_CSI_DRIVER =
    "https://kubernetes-sigs.github.io/secrets-store-csi-driver/charts";
}

export class HelmCharts {
  static readonly CERT_MANAGER: string = "cert-manager";
  static readonly ISTIO_BASE: string = "base";
  static readonly ISTIO_ISTIOD: string = "istiod";
  static readonly SECRET_STORE_CSI_DRIVER = "secrets-store-csi-driver";
}
