# Cloud SQL Postgres dev instance — Story 1.2 substrate.
#
# Authority transcribed per architecture §1.1 line 691-714 (managed Postgres
# in India region — Cloud SQL), §5.1 line 2920-2939 (asia-south1 primary),
# §5.7 line 3186-3233 (regional HA + automated backups + PITR), §5.8 line
# 3235-3277 (private IP only; no public IPv4).
#
# Resources owned by this file:
#   - random_password.app_password — 32-char alphanumeric password for the
#     application Postgres role. Persisted in Terraform state; rotate via
#     `terraform taint` + `apply` and re-publish the Secret Manager version.
#   - google_sql_database_instance.main — the Cloud SQL instance.
#   - google_sql_database.app — the application database (twt_${environment}).
#   - google_sql_user.app — the application Postgres role; non-superuser, no
#     BYPASSRLS per architecture §1.2 line 717-725. The BYPASSRLS attribute is
#     the Postgres role-level attribute that defeats Row-Level Security
#     policies; Story 1.6 commits the substantive enforcement at the migration
#     layer (packages/domain/migrations/0002_events-log-rls.sql includes
#     `ALTER ROLE twt_app NOBYPASSRLS;` + a migration-time self-test that fails
#     the migrator if the application group role somehow gained BYPASSRLS).
#     Cloud SQL's google_sql_user resource does NOT expose the role-attribute
#     flags directly, so the declarative enforcement lives at the migration
#     layer; this Terraform comment is the discoverability surface for an
#     operator reading the IaC. Closes Story 1.2 deferred W1.
#   - google_secret_manager_secret.conn_string — connection-string secret.
#   - google_secret_manager_secret_version.conn_string_v1 — first version.
#
# Story 1.5 (Cloud KMS + envelope encryption) will extend this with KMS
# integration for at-rest CMEK; Story 1.15 (Dokploy auto-deploy + multi-Pariwar
# provisioning) will reuse the entire module for staging + prod.

resource "random_password" "app_password" {
  length  = 32
  special = false

  keepers = {
    instance_name = local.instance_name
  }
}

resource "google_sql_database_instance" "main" {
  name                = local.instance_name
  database_version    = var.database_version
  region              = var.region
  deletion_protection = var.deletion_protection

  depends_on = [google_service_networking_connection.private_vpc_connection]

  settings {
    tier              = var.tier
    availability_type = var.availability_type
    disk_size         = var.disk_size_gb
    disk_autoresize   = true
    disk_type         = "PD_SSD"
    user_labels       = local.default_labels

    backup_configuration {
      enabled                        = true
      start_time                     = var.backup_start_time
      point_in_time_recovery_enabled = true
      transaction_log_retention_days = var.transaction_log_retention_days
      location                       = var.region

      backup_retention_settings {
        retained_backups = var.retained_backups_count
        retention_unit   = "COUNT"
      }
    }

    ip_configuration {
      ipv4_enabled    = false
      private_network = local.network_self_link
      require_ssl     = true
    }

    insights_config {
      query_insights_enabled  = true
      query_string_length     = 4500
      record_application_tags = false
      record_client_address   = false
    }

    dynamic "database_flags" {
      for_each = var.enable_pgaudit ? [1] : []
      content {
        name  = "cloudsql.enable_pgaudit"
        value = "on"
      }
    }

    maintenance_window {
      day          = var.maintenance_window_day
      hour         = var.maintenance_window_hour
      update_track = "stable"
    }
  }
}

resource "google_sql_database" "app" {
  name     = local.app_database_name
  instance = google_sql_database_instance.main.name
}

resource "google_sql_user" "app" {
  name     = local.app_role_name
  instance = google_sql_database_instance.main.name
  password = random_password.app_password.result
}

resource "google_secret_manager_secret" "conn_string" {
  secret_id = local.secret_name
  labels    = local.default_labels

  replication {
    user_managed {
      replicas {
        location = var.region
      }
    }
  }
}

resource "google_secret_manager_secret_version" "conn_string_v1" {
  secret = google_secret_manager_secret.conn_string.id

  secret_data = format(
    "postgresql://%s:%s@%s:5432/%s?sslmode=require",
    google_sql_user.app.name,
    random_password.app_password.result,
    google_sql_database_instance.main.private_ip_address,
    google_sql_database.app.name,
  )
}
