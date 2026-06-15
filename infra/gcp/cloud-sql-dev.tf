# Cloud SQL Postgres — DEV instance (Story 1.2 substrate; Story 1.15 module reuse).
#
# Story 1.15 (D3-1.2) extracted the inline resources into ./modules/cloud-sql and
# this file now CONSUMES that module. Behaviour for dev is unchanged — the resource
# config is identical; only the Terraform address moved to
# `module.cloud_sql_dev.google_sql_*`. (An already-applied dev state migrates with
# `terraform state mv google_sql_database_instance.main 'module.cloud_sql_dev[0].google_sql_database_instance.main'`
# etc.; a fresh apply plans the same 5 resources under the new address.)
#
# The three env instances are `count`-gated on `var.environment` so a single apply
# (with the matching `-var-file`) provisions exactly one environment; the Private
# Services Access bootstrap (network.tf) is per-env via `var.environment` and is
# passed in via `network_self_link` + the module-level `depends_on`.

module "cloud_sql_dev" {
  source = "./modules/cloud-sql"
  count  = var.environment == "dev" ? 1 : 0

  project_id                     = var.project_id
  region                         = var.region
  environment                    = "dev"
  instance_name                  = var.instance_name
  database_version               = var.database_version
  tier                           = var.tier
  availability_type              = var.availability_type # dev default ZONAL
  disk_size_gb                   = var.disk_size_gb
  backup_start_time              = var.backup_start_time
  transaction_log_retention_days = var.transaction_log_retention_days
  retained_backups_count         = var.retained_backups_count
  deletion_protection            = var.deletion_protection
  enable_pgaudit                 = var.enable_pgaudit
  app_database_name              = var.app_database_name
  app_role_name                  = var.app_role_name
  secret_name                    = var.secret_name
  network_self_link              = local.network_self_link
  maintenance_window_day         = var.maintenance_window_day
  maintenance_window_hour        = var.maintenance_window_hour
  extra_labels                   = var.extra_labels

  depends_on = [google_service_networking_connection.private_vpc_connection]
}

# The single active env's module outputs (exactly one of dev/staging/prod has
# count = 1 for any given apply). `outputs.tf` reads through this so the output
# block is env-agnostic.
locals {
  cloud_sql = one(concat(module.cloud_sql_dev, module.cloud_sql_staging, module.cloud_sql_prod))
}
