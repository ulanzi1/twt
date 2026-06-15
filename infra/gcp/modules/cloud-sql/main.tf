# Reusable Cloud SQL Postgres module — Story 1.15 (D3-1.2 module extraction).
#
# Extracted VERBATIM from the Story 1.2 flat `cloud-sql-dev.tf` so dev behaviour is
# unchanged (the resource CONFIG is identical; only the Terraform ADDRESS moves to
# `module.cloud_sql_<env>.*`). The root (cloud-sql-{dev,staging,prod}.tf) instantiates
# this once per env with tfvar overrides ONLY (the D3-1.2 test). The Private Services
# Access bootstrap (network.tf) stays in the root and is passed in via
# `network_self_link` + a module-level `depends_on`.

locals {
  instance_name     = coalesce(var.instance_name, "twt-${var.environment}-postgres")
  app_database_name = coalesce(var.app_database_name, "twt_${var.environment}")
  app_role_name     = coalesce(var.app_role_name, "twt_${var.environment}_app")
  secret_name       = coalesce(var.secret_name, "twt-${var.environment}-cloud-sql-conn-string")

  # Framework identity labels ALWAYS win over caller-supplied `extra_labels`.
  default_labels = merge(
    var.extra_labels,
    {
      managed_by  = "terraform"
      component   = "cloud-sql"
      environment = var.environment
    },
  )
}

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
      private_network = var.network_self_link
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
