# Outputs exposed by the GCP infrastructure module.
#
# Connection-string secret VALUE is intentionally NOT exposed as a Terraform
# output — consumers fetch it from Secret Manager at runtime (architecture
# §5.9 line 3320-3327). The module exposes the secret resource ID + name so
# consumers can resolve the secret without hard-coding paths.

output "instance_name" {
  description = "Cloud SQL instance short name (e.g., twt-dev-postgres)."
  value       = google_sql_database_instance.main.name
}

output "instance_connection_name" {
  description = "Fully-qualified Cloud SQL connection name (project:region:instance) — used by the Cloud SQL Auth Proxy invocation."
  value       = google_sql_database_instance.main.connection_name
}

output "private_ip_address" {
  description = "Private IP assigned to the instance. Marked sensitive — do not surface in commit messages or logs."
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
  description = "Secret Manager resource ID for the connection-string secret (fully-qualified)."
  value       = google_secret_manager_secret.conn_string.id
}

output "secret_name" {
  description = "Secret Manager secret name (short form, e.g., twt-dev-cloud-sql-conn-string)."
  value       = google_secret_manager_secret.conn_string.secret_id
}
