# Derived resource names and shared labels for the GCP infrastructure module.
#
# Centralised here so cloud-sql-dev.tf and network.tf reference a single source
# of truth for naming conventions. All names follow the twt-${environment}-*
# pattern to support Story 1.15 module reuse for staging + prod.

locals {
  instance_name     = coalesce(var.instance_name, "twt-${var.environment}-postgres")
  app_database_name = coalesce(var.app_database_name, "twt_${var.environment}")
  app_role_name     = coalesce(var.app_role_name, "twt_${var.environment}_app")
  secret_name       = coalesce(var.secret_name, "twt-${var.environment}-cloud-sql-conn-string")
  network_self_link = coalesce(var.network_self_link, "projects/${var.project_id}/global/networks/default")
  psa_range_name    = "twt-${var.environment}-cloud-sql-psa-range"

  # Framework identity labels (`managed_by`, `component`, `environment`) ALWAYS
  # win over caller-supplied labels. `var.extra_labels` (or the deprecated
  # `var.labels`) lands at the BOTTOM of the merge so caller additions are kept
  # but cannot override framework identity. Caller-supplied `managed_by` /
  # `component` / `environment` keys are silently dropped.
  default_labels = merge(
    var.extra_labels,
    var.labels,
    {
      managed_by  = "terraform"
      component   = "cloud-sql"
      environment = var.environment
    },
  )
}
