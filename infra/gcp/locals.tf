# Root-level derived names for the per-env Private Services Access bootstrap.
#
# Story 1.15 (D3-1.2) moved the Cloud SQL naming + label locals INTO
# ./modules/cloud-sql (the module computes its own). What remains here is what the
# root still owns: the PSA range name + the network self_link the per-env Cloud SQL
# module instance is bound to. All names follow the twt-${environment}-* pattern so
# a single apply (with the matching -var-file) provisions exactly one environment.

locals {
  network_self_link = coalesce(var.network_self_link, "projects/${var.project_id}/global/networks/default")
  psa_range_name    = "twt-${var.environment}-cloud-sql-psa-range"
}
