# Outputs exposed by the GCP infrastructure module.
#
# Connection-string secret VALUE is intentionally NOT exposed as a Terraform
# output — consumers fetch it from Secret Manager at runtime (architecture
# §5.9 line 3320-3327). The module exposes the secret resource ID + name so
# consumers can resolve the secret without hard-coding paths.

# Cloud SQL outputs now read through the single active env module (Story 1.15,
# D3-1.2) — `local.cloud_sql` is whichever of cloud_sql_{dev,staging,prod} has
# count = 1 for this apply (see cloud-sql-dev.tf).

output "instance_name" {
  description = "Cloud SQL instance short name (e.g., twt-staging-postgres)."
  value       = local.cloud_sql.instance_name
}

output "instance_connection_name" {
  description = "Fully-qualified Cloud SQL connection name (project:region:instance) — used by the Cloud SQL Auth Proxy invocation."
  value       = local.cloud_sql.instance_connection_name
}

output "private_ip_address" {
  description = "Private IP assigned to the instance. Marked sensitive — do not surface in commit messages or logs."
  value       = local.cloud_sql.private_ip_address
  sensitive   = true
}

output "app_database_name" {
  description = "Application database created on the instance."
  value       = local.cloud_sql.app_database_name
}

output "app_role_name" {
  description = "Application Postgres role (non-superuser)."
  value       = local.cloud_sql.app_role_name
}

output "secret_id" {
  description = "Secret Manager resource ID for the connection-string secret (fully-qualified)."
  value       = local.cloud_sql.secret_id
}

output "secret_name" {
  description = "Secret Manager secret name (short form, e.g., twt-staging-cloud-sql-conn-string)."
  value       = local.cloud_sql.secret_name
}

output "pgboss_create_grant_sql" {
  description = "D3-1.12: the one-time GRANT CREATE the operator pipes into psql on first start so pg-boss can create its schema. Echoed from the active env module."
  value       = local.cloud_sql.pgboss_create_grant_sql
}

# Story 1.5 — Cloud KMS substrate outputs.

output "kms_tier_1_kek_resource_name" {
  description = "Fully-qualified Cloud KMS resource name for the Tier-1 KEK (HSM-backed). Format: projects/<id>/locations/<region>/keyRings/twt-dev-keyring/cryptoKeys/pii-tier-1-kek. Consumed by Secret Manager + apps/api at Story 1.15 live provisioning."
  value       = google_kms_crypto_key.pii_tier_1_kek.id
}

output "kms_tier_2_hmac_resource_name" {
  description = "Fully-qualified Cloud KMS resource name for the Tier-2 HMAC key (HSM-backed). Format: projects/<id>/locations/<region>/keyRings/twt-dev-keyring/cryptoKeys/pii-tier-2-hmac."
  value       = google_kms_crypto_key.pii_tier_2_hmac.id
}

# Story 1.15 — Workload Identity Federation outputs (the deploy workflows feed these
# into google-github-actions/auth). Null on dev / when WIF is not provisioned.

output "wif_provider_name" {
  description = "Fully-qualified WIF provider resource name for `workload_identity_provider:` in the deploy workflow. Format: projects/<num>/locations/global/workloadIdentityPools/twt-<env>-gh-pool/providers/github-actions."
  value       = one(google_iam_workload_identity_pool_provider.github_actions[*].name)
}

output "deployer_service_account_email" {
  description = "The per-env deployer SA the deploy workflow impersonates (`service_account:` in google-github-actions/auth)."
  value       = one(google_service_account.deployer[*].email)
}

output "artifact_registry_repository_url" {
  description = "The Docker push target base URL: <region>-docker.pkg.dev/<project>/<repo>."
  value       = one([for r in google_artifact_registry_repository.images : "${r.location}-docker.pkg.dev/${var.project_id}/${r.repository_id}"])
}
