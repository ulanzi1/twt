# Outputs from the reusable cloud-sql module (Story 1.15).
#
# The connection-string secret VALUE is intentionally NOT exposed — consumers fetch
# it from Secret Manager at runtime (architecture §5.9). The module exposes the
# secret id/name + the pg-boss CREATE grant SQL (D3-1.12).

output "instance_name" {
  description = "Cloud SQL instance short name (e.g., twt-staging-postgres)."
  value       = google_sql_database_instance.main.name
}

output "instance_connection_name" {
  description = "Fully-qualified Cloud SQL connection name (project:region:instance)."
  value       = google_sql_database_instance.main.connection_name
}

output "private_ip_address" {
  description = "Private IP assigned to the instance. Sensitive — never surface in logs."
  value       = google_sql_database_instance.main.private_ip_address
  sensitive   = true
}

output "app_database_name" {
  description = "Application database created on the instance."
  value       = google_sql_database.app.name
}

output "app_role_name" {
  description = "Application Postgres role (non-superuser)."
  value       = google_sql_user.app.name
}

output "secret_id" {
  description = "Secret Manager resource ID for the connection-string secret (W12, per-env)."
  value       = google_secret_manager_secret.conn_string.id
}

output "secret_name" {
  description = "Secret Manager secret short name (W12, per-env)."
  value       = google_secret_manager_secret.conn_string.secret_id
}

output "pgboss_create_grant_sql" {
  description = "D3-1.12: the one-time GRANT the operator runs (as the DB owner) on first start so pg-boss can create its `pgboss` schema. Empty when grant_pgboss_create = false. Terraform's google_sql_user cannot issue a DB-level GRANT, so this is delivered as runnable SQL the operator pipes into psql against the new instance."
  value = var.grant_pgboss_create ? format(
    "GRANT CREATE ON DATABASE %s TO %s;",
    local.app_database_name,
    local.app_role_name,
  ) : ""
}
