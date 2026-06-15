# Inputs for the reusable cloud-sql module (Story 1.15, D3-1.2).
#
# THE D3-1.2 TEST: staging + prod must be provisioned by passing tfvar overrides to
# this module ONLY — `environment`, `availability_type`, `tier`, `network_self_link`,
# and the W12 per-env Secret Manager connection-string name. If staging/prod ever
# need an HCL edit to THIS module, the module is under-parameterized → refactor it.
# Every behavioural knob is therefore a variable here.

variable "project_id" {
  description = "GCP project ID (e.g., twt-dev / twt-staging / twt-prod)."
  type        = string
}

variable "region" {
  description = "GCP region. asia-south1 is the architecturally-frozen v1 primary."
  type        = string
  default     = "asia-south1"
}

variable "environment" {
  description = "Environment tag (dev | staging | prod). Drives default resource names."
  type        = string

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "environment must be one of: dev, staging, prod."
  }
}

variable "instance_name" {
  description = "Cloud SQL instance name. If null, defaults to twt-<environment>-postgres."
  type        = string
  default     = null
}

variable "database_version" {
  description = "Cloud SQL Postgres major version. Architecture commits Postgres 16."
  type        = string
  default     = "POSTGRES_16"
}

variable "tier" {
  description = "Cloud SQL machine tier. Dev = db-custom-2-7680; staging/prod scale per ops policy."
  type        = string
  default     = "db-custom-2-7680"
}

variable "availability_type" {
  description = "ZONAL (dev, cost-optimized) or REGIONAL (staging + prod HA) per architecture §5.7."
  type        = string
  default     = "ZONAL"

  validation {
    condition     = contains(["ZONAL", "REGIONAL"], var.availability_type)
    error_message = "availability_type must be ZONAL or REGIONAL."
  }
}

variable "disk_size_gb" {
  description = "Initial disk size in GB (auto-resize enabled, so a floor not a ceiling)."
  type        = number
  default     = 20
}

variable "backup_start_time" {
  description = "Daily backup window start, HH:MM UTC. 20:30 UTC = 02:00 IST (off-peak)."
  type        = string
  default     = "20:30"
}

variable "transaction_log_retention_days" {
  description = "PITR transaction-log retention in days (1–35, Cloud SQL platform ceiling)."
  type        = number
  default     = 7

  validation {
    condition     = var.transaction_log_retention_days >= 1 && var.transaction_log_retention_days <= 35
    error_message = "transaction_log_retention_days must be between 1 and 35."
  }
}

variable "retained_backups_count" {
  description = "Number of automated backup snapshots to retain."
  type        = number
  default     = 30
}

variable "deletion_protection" {
  description = "Cloud SQL deletion-protection flag. Non-negotiable true per architecture §5.8."
  type        = bool
  default     = true
}

variable "enable_pgaudit" {
  description = "Enable cloudsql.enable_pgaudit DB flag (audit-mirror defense-in-depth, §1.5)."
  type        = bool
  default     = true
}

variable "app_database_name" {
  description = "Application database name. If null, defaults to twt_<environment>."
  type        = string
  default     = null
}

variable "app_role_name" {
  description = "Application Postgres role (non-superuser, no BYPASSRLS). If null, twt_<environment>_app."
  type        = string
  default     = null
}

variable "secret_name" {
  description = "W12: per-env Secret Manager secret name for the connection string. If null, twt-<environment>-cloud-sql-conn-string."
  type        = string
  default     = null
}

variable "network_self_link" {
  description = "VPC self_link for Private Services Access. REQUIRED — the root passes the per-env network; staging/prod MUST be an explicit custom network."
  type        = string
}

variable "maintenance_window_day" {
  description = "Maintenance window day of week (1 = Monday … 7 = Sunday)."
  type        = number
  default     = 7

  validation {
    condition     = var.maintenance_window_day >= 1 && var.maintenance_window_day <= 7
    error_message = "maintenance_window_day must be between 1 (Monday) and 7 (Sunday)."
  }
}

variable "maintenance_window_hour" {
  description = "Maintenance window start hour in UTC (0–23)."
  type        = number
  default     = 21

  validation {
    condition     = var.maintenance_window_hour >= 0 && var.maintenance_window_hour <= 23
    error_message = "maintenance_window_hour must be between 0 and 23 (UTC)."
  }
}

variable "extra_labels" {
  description = "Caller labels merged BENEATH the framework labels (managed_by/component/environment win)."
  type        = map(string)
  default     = {}
}

variable "grant_pgboss_create" {
  description = "D3-1.12: when true, the module emits the pg-boss `GRANT CREATE ON DATABASE` SQL (via the `pgboss_create_grant_sql` output) the operator runs once on first start so pg-boss can create its own schema. Terraform's google_sql_user cannot issue a DB-level GRANT, so this is delivered as a runnable SQL output, not an apply-time resource."
  type        = bool
  default     = true
}
