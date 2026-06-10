# Input variables for the GCP infrastructure module (Story 1.2 substrate).
#
# Defaults match the architecture-committed dev posture:
# - asia-south1 (architecture §5.1 line 2920-2939; AR-27 epics line 300)
# - Postgres 16 (architecture §1.1 + §5.2)
# - db-custom-2-7680 dev tier (2 vCPU / 7.5 GB RAM minimum-viable)
# - ZONAL availability at dev; REGIONAL at staging + prod (architecture §5.7)
# - private IP only (architecture §5.8 line 3270 "Cloud SQL has no public IP")

variable "project_id" {
  description = "GCP project ID (e.g., twt-dev). No default — must be supplied per environment."
  type        = string
}

variable "region" {
  description = "GCP region. asia-south1 is the architecturally-frozen v1 primary."
  type        = string
  default     = "asia-south1"
}

variable "environment" {
  description = "Environment tag (dev | staging | prod). Drives default resource names + availability_type recommendations."
  type        = string
  default     = "dev"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "environment must be one of: dev, staging, prod."
  }
}

variable "instance_name" {
  description = "Cloud SQL instance name. If null, defaults to twt-${environment}-postgres."
  type        = string
  default     = null
}

variable "database_version" {
  description = "Cloud SQL Postgres major version. Architecture commits Postgres 16."
  type        = string
  default     = "POSTGRES_16"
}

variable "tier" {
  description = "Cloud SQL machine tier. Dev = db-custom-2-7680 (2 vCPU / 7.5 GB RAM). Staging + prod scale per ops policy + Story 1.15."
  type        = string
  default     = "db-custom-2-7680"
}

variable "availability_type" {
  description = "ZONAL (single-zone, cost-optimized; dev) or REGIONAL (multi-zone HA; staging + prod) per architecture §5.7 line 3192-3193."
  type        = string
  default     = "ZONAL"

  validation {
    condition     = contains(["ZONAL", "REGIONAL"], var.availability_type)
    error_message = "availability_type must be ZONAL or REGIONAL."
  }
}

variable "disk_size_gb" {
  description = "Initial disk size in GB. Cloud SQL auto-resize is enabled so this is a floor, not a ceiling."
  type        = number
  default     = 20
}

variable "backup_start_time" {
  description = "Daily backup window start, HH:MM in UTC. 20:30 UTC = 02:00 IST (off-peak for IN business hours)."
  type        = string
  default     = "20:30"
}

variable "transaction_log_retention_days" {
  description = "PITR transaction-log retention in days. Cloud SQL platform max is 35 days; the dev tier (db-custom-2-7680) defaults to 7 days. Staging/prod (Story 1.15) can raise this up to 35. Architecture §5.7 line 3194 commits 'up to 35 days' as the platform ceiling."
  type        = number
  default     = 7

  validation {
    condition     = var.transaction_log_retention_days >= 1 && var.transaction_log_retention_days <= 35
    error_message = "transaction_log_retention_days must be between 1 and 35 (Cloud SQL platform ceiling)."
  }
}

variable "retained_backups_count" {
  description = "Number of automated backup snapshots to retain. Cloud SQL default = 7; we keep 30 for the v1 substrate."
  type        = number
  default     = 30
}

variable "deletion_protection" {
  description = "Cloud SQL deletion-protection flag. Non-negotiable true per architecture §5.8 line 3270."
  type        = bool
  default     = true
}

variable "enable_pgaudit" {
  description = "Enable cloudsql.enable_pgaudit DB flag for audit-mirror defense-in-depth per architecture §1.5."
  type        = bool
  default     = true
}

variable "app_database_name" {
  description = "Application database name. If null, defaults to twt_${environment}."
  type        = string
  default     = null
}

variable "app_role_name" {
  description = "Application Postgres role. Non-superuser, no BYPASSRLS, preparing Story 1.6 RLS isolation per architecture §1.2 line 717-725. If null, defaults to twt_${environment}_app."
  type        = string
  default     = null
}

variable "secret_name" {
  description = "Secret Manager secret name for the connection string. If null, defaults to twt-${environment}-cloud-sql-conn-string."
  type        = string
  default     = null
}

variable "network_self_link" {
  description = "VPC self_link for Private Services Access. If null, falls back to the project's 'default' VPC (acceptable for dev; staging + prod must pass an explicit custom network)."
  type        = string
  default     = null
}

variable "labels" {
  description = "DEPRECATED in favour of `extra_labels`. Retained as a parameter slot for backwards compatibility with any caller still passing it; the framework labels (`managed_by`, `component`, `environment`) now always win."
  type        = map(string)
  default     = {}
}

variable "extra_labels" {
  description = "Caller-supplied resource labels merged BENEATH the module's framework labels. Framework labels (`managed_by = terraform`, `component = cloud-sql`, `environment = var.environment`) override any conflicting key in this map."
  type        = map(string)
  default     = {}
}

variable "maintenance_window_day" {
  description = "Maintenance window day of week (1 = Monday … 7 = Sunday). Default 7 (Sunday)."
  type        = number
  default     = 7

  validation {
    condition     = var.maintenance_window_day >= 1 && var.maintenance_window_day <= 7
    error_message = "maintenance_window_day must be between 1 (Monday) and 7 (Sunday)."
  }
}

variable "maintenance_window_hour" {
  description = "Maintenance window start hour in UTC (0–23). Default 21 = Sunday-UTC 21:00 = Monday 02:30 IST (the IST day rolls over when adding +5h30), off-peak for IN business hours."
  type        = number
  default     = 21

  validation {
    condition     = var.maintenance_window_hour >= 0 && var.maintenance_window_hour <= 23
    error_message = "maintenance_window_hour must be between 0 and 23 (UTC)."
  }
}

# Story 1.5 — Cloud KMS substrate variables.

variable "kms_kek_rotation_period_seconds" {
  description = "Cloud KMS KEK rotation period in seconds. Default 31536000 = 365 days per architecture §5.9 line 3324 annual cadence. Validation band: 30 days minimum, 2 years maximum."
  type        = number
  default     = 31536000

  validation {
    condition     = var.kms_kek_rotation_period_seconds >= 2592000 && var.kms_kek_rotation_period_seconds <= 63072000
    error_message = "kms_kek_rotation_period_seconds must be between 2592000 (30 days) and 63072000 (2 years)."
  }
}

variable "kms_destroy_scheduled_duration_seconds" {
  description = "Cloud KMS delayed-destruction window in seconds. Default 2592000 = 30 days per architecture §5.9 line 3356 Cloud KMS platform maximum. Validation band: 1 day minimum, 30 days maximum (Cloud KMS hard cap)."
  type        = number
  default     = 2592000

  validation {
    condition     = var.kms_destroy_scheduled_duration_seconds >= 86400 && var.kms_destroy_scheduled_duration_seconds <= 2592000
    error_message = "kms_destroy_scheduled_duration_seconds must be between 86400 (1 day) and 2592000 (30 days, Cloud KMS platform max)."
  }
}

variable "app_service_account_email" {
  description = "Application service account email for KMS per-key IAM bindings. Nullable at Story 1.5 (commit-without-substantive-IAM-binding posture); Story 1.15 substantively populates."
  type        = string
  default     = null
}
