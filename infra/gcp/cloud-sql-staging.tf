# Cloud SQL Postgres — STAGING instance (Story 1.15, AC-5; D3-1.2 module reuse).
#
# Consumes ./modules/cloud-sql with tfvar OVERRIDES ONLY (the D3-1.2 test): the
# only per-env differences baked here are `environment` + `availability_type`
# (REGIONAL HA per architecture §5.7); everything else (tier, network, secret name,
# retention) flows from the operator's `terraform.staging.tfvars`. If staging ever
# needs an HCL edit to the MODULE, the module is under-parameterized → fix the module.
#
# Apply: `terraform apply -var-file=terraform.staging.tfvars` (var.environment=staging
# → this instance has count = 1, dev/prod = 0; network.tf provisions the staging PSA).

module "cloud_sql_staging" {
  source = "./modules/cloud-sql"
  count  = var.environment == "staging" ? 1 : 0

  project_id                     = var.project_id
  region                         = var.region
  environment                    = "staging"
  instance_name                  = var.instance_name
  database_version               = var.database_version
  tier                           = var.tier
  availability_type              = "REGIONAL" # staging HA (§5.7)
  disk_size_gb                   = var.disk_size_gb
  backup_start_time              = var.backup_start_time
  transaction_log_retention_days = var.transaction_log_retention_days
  retained_backups_count         = var.retained_backups_count
  deletion_protection            = var.deletion_protection
  enable_pgaudit                 = var.enable_pgaudit
  app_database_name              = var.app_database_name
  app_role_name                  = var.app_role_name
  secret_name                    = var.secret_name # null → module defaults to twt-staging-cloud-sql-conn-string (W12)
  network_self_link              = local.network_self_link
  maintenance_window_day         = var.maintenance_window_day
  maintenance_window_hour        = var.maintenance_window_hour
  extra_labels                   = var.extra_labels

  depends_on = [google_service_networking_connection.private_vpc_connection]
}
