# infra/gcp

GCP infrastructure-as-code. Story 1.2 lands the substrate; Story 1.5 + 1.15
extend.

Per architecture §Project Structure (architecture lines 4165-4168), this
directory is the architecture-committed home for GCP IaC. Each substrate
artifact lands per the Story that materializes its surface.

## Story 1.2 — Cloud SQL Postgres dev (this folder)

Terraform module (HCL) for the dev environment Cloud SQL Postgres instance.
Designed for Story 1.15 module-reuse: pass tfvars for `environment`,
`availability_type`, `tier`, and `network_self_link` to provision the
staging + prod instances.

| File                            | Purpose                                                          |
| ------------------------------- | ---------------------------------------------------------------- |
| `versions.tf`                   | Terraform >= 1.7, `hashicorp/google` ~> 5.0, `hashicorp/random`  |
| `variables.tf`                  | 17 inputs (project_id, region, env, tier, …) with defaults       |
| `network.tf`                    | Private Services Access bootstrap (global IP range + peering)    |
| `cloud-sql-dev.tf`              | Cloud SQL instance + DB + role + Secret Manager secret + version |
| `outputs.tf`                    | `instance_connection_name`, `secret_id`, db + role names         |
| `terraform.tfvars.example`      | Sample dev tfvars + apply runbook                                |
| `.gitignore`                    | Excludes `*.tfstate`, populated `*.tfvars`, `.terraform/`        |

### Provisioned resources (named-id reference)

| Resource type                      | Name                                | Notes                                          |
| ---------------------------------- | ----------------------------------- | ---------------------------------------------- |
| GCP project                        | `twt-dev`                           | Pre-existing; provisioning prerequisite       |
| Cloud SQL instance                 | `twt-dev-postgres`                  | Postgres 16, ZONAL, db-custom-2-7680           |
| Application database               | `twt_dev`                           | Owned by the application role                  |
| Application Postgres role          | `twt_dev_app`                       | Non-superuser; no BYPASSRLS                    |
| Secret Manager secret              | `twt-dev-cloud-sql-conn-string`     | Connection string with random 32-char password |
| Compute global address             | `twt-dev-cloud-sql-psa-range`       | /16 reserved for PSA peering                  |
| Service Networking connection      | `servicenetworking.googleapis.com`  | VPC peering to Google-managed services         |

### Apply sequence (BigDev runbook)

```sh
# 0. Prerequisites (one-time per GCP project):
#    gcloud projects create twt-dev --name="TWT Dev"
#    gcloud billing projects link twt-dev --billing-account=<id>
#    gcloud services enable sqladmin.googleapis.com secretmanager.googleapis.com \
#      servicenetworking.googleapis.com compute.googleapis.com --project=twt-dev
#    gcloud auth application-default login

# 1. Populate tfvars (do NOT commit):
cp infra/gcp/terraform.tfvars.example infra/gcp/terraform.tfvars
# edit project_id

# 2. Apply:
cd infra/gcp
terraform init
terraform plan -out=tfplan
terraform apply tfplan

# 3. Verify the secret is populated:
SECRET=$(terraform output -raw secret_name)
gcloud secrets versions access latest --secret="$SECRET" --project=twt-dev | head -c 16
# Should print the first 16 chars of "postgresql://" + masked password.

# 4. Local-developer connectivity via Cloud SQL Auth Proxy:
cloud-sql-proxy --port=5432 $(terraform output -raw instance_connection_name) &
psql "postgresql://twt_dev_app:<password>@127.0.0.1:5432/twt_dev?sslmode=disable" \
  -c "SELECT version();"
```

### Cost envelope

`db-custom-2-7680` ZONAL in `asia-south1` ≈ **$45-60 USD/month** (verify at
provisioning time). REGIONAL HA at staging + prod approximately doubles
per-instance cost. Per architecture §5.13 + Story 0.12 Decision
2026-06-05-028, per-Pariwar v1 cloud-infrastructure budget is NOT explicitly
envelope-bounded in Phase-0 reconciliation; BigDev provisions against a
personal-funded `twt-dev` project at minimal cost. `twt-staging` + `twt-prod`
provisioning is Story 1.15 territory + lands with Dokploy auto-deploy.

## Cloud KMS substrate (Story 1.5)

Story 1.5 adds `cloud-kms-dev.tf` to this directory with:

| Resource                                      | Name                                  | Notes                                                 |
| --------------------------------------------- | ------------------------------------- | ----------------------------------------------------- |
| `google_kms_key_ring`                         | `twt-dev-keyring`                     | `asia-south1`; attached to `twt-dev` GCP project      |
| `google_kms_crypto_key` (Tier-1 KEK)          | `pii-tier-1-kek`                      | ENCRYPT_DECRYPT + GOOGLE_SYMMETRIC_ENCRYPTION + HSM   |
| `google_kms_crypto_key` (Tier-2 HMAC)         | `pii-tier-2-hmac`                     | MAC + HMAC_SHA256 + HSM                               |
| `google_kms_crypto_key_iam_member` (Tier-1)   | `roles/cloudkms.cryptoKeyEncrypterDecrypter` | additive; bound to `var.app_service_account_email` when non-null |
| `google_kms_crypto_key_iam_member` (Tier-2)   | `roles/cloudkms.signerVerifier`        | additive; bound to `var.app_service_account_email` when non-null |

The Tier-1 KEK carries `rotation_period = ${var.kms_kek_rotation_period_seconds}s`
(default 31536000 = 365 days; architecture §5.9 line 3324). The Tier-2 HMAC key
does **not** have `rotation_period` — Cloud KMS MAC keys do not support automatic
rotation; HMAC key rotation is manual per `docs/runbooks/secret-rotation.md §2.1.2`.
Both keys carry `destroy_scheduled_duration = ${var.kms_destroy_scheduled_duration_seconds}s`
(default 2592000 = 30 days; architecture §5.9 line 3356 platform max) with
`lifecycle { prevent_destroy = true }` on both keys and the keyring (defense
against unintended `terraform destroy`; aligns with §5.9 line 3357-3360
two-person approval). IAM uses `_iam_member` (additive) so Story 1.15 can add
additional principals without removing existing bindings.

**Do NOT `terraform apply cloud-kms-dev.tf` at Story 1.5 closure.** Live Cloud
KMS provisioning is deferred (D1-1.5, analogous to Story 1.2 D1-1.2).
Story 1.15 substantively provisions multi-environment KMS (`cloud-kms-staging.tf`
+ `cloud-kms-prod.tf`) + high-sensitivity-tier IAM cross-project topology
(D4-1.5). The Story 1.5 substrate is structurally exercised via the local-dev
fake-KMS provider (`KMS_TEST_MODE=fake`) inside `pnpm crypto:check`.

See `.terraform-plan-expectations.md` for the expected `terraform plan` shape.

## Audit-log off-site mirror (Story 1.10)

Story 1.10 adds `audit-mirror.tf` — the Object-Retention-Locked GCS bucket + the
write-only push service account, provisioned in a **separate GCP project**
(`var.audit_mirror_project_id`, default `twt-audit-mirror`) via an aliased
provider. This is the cold-tier WORM mirror for `audit_log_entries` (AR-9/10,
§2.10a, §5.2).

| Resource                                   | Name                              | Notes                                                                |
| ------------------------------------------ | --------------------------------- | -------------------------------------------------------------------- |
| `provider "google"` (alias)                | `google.audit_mirror`             | Bound to the SEPARATE `twt-audit-mirror` project (AC-4 tenancy split)|
| `google_storage_bucket`                    | `twt-audit-mirror-${env}`         | `asia-south1`; Bucket Lock + Object Retention Lock; 7-year; PAP enforced |
| `google_service_account`                   | `audit-mirror-writer`             | Write-only one-way push credential (key → Secret Manager, deferred)  |
| `google_storage_bucket_iam_binding`        | `roles/storage.objectCreator`     | **Authoritative** — ONLY the writer SA; no delete/admin/read anywhere |

Key properties:

- **Append-only / no overwrite:** the mirror job (`apps/jobs/src/audit/mirror.ts`)
  writes one segment object per run, named by the seq range it carries
  (`audit/segment-<minSeq>-<maxSeq>.jsonl`). The objectCreator-only SA + Object
  Retention Lock + the `ifGenerationMatch:0` upload precondition forbid overwrites
  (§1.5 L885).
- **AC-4 one-way push:** the bucket + SA live in the separate project; **no
  primary-project identity holds any role in the mirror project**. Even a full
  prod-credential compromise cannot modify/erase mirrored audit data (§2.10a
  property 1). The primary pushes using the mirror writer SA's own key.
- **Irreversible lock guard:** `var.enable_retention_lock` defaults **false** —
  dev/staging get a retention policy that is NOT locked (still tear-down-able).
  Set `true` only for the production mirror after verifying the 7-year period;
  locking is permanent (§5.2 L2968).

**Do NOT `terraform apply audit-mirror.tf` at Story 1.10 closure.** Live
provisioning + the retention LOCK are deferred (D1-1.5 precedent). The substrate
is structurally exercised by the local/CI fake `MirrorTarget`
(`MIRROR_MODE=fake`) in `pnpm --filter @twt/jobs test`. The 6-hourly trigger is
pg-boss cron at Story 1.12. Quarterly attestation: `docs/runbooks/audit-mirror-attestation.md`.

## Landing-story map (full)

| Subfolder / artifact                | Story / Epic            | Concern                                                  |
| ----------------------------------- | ----------------------- | -------------------------------------------------------- |
| `cloud-sql-dev.tf` (+ siblings)     | Story 1.2               | Cloud SQL Postgres dev instance + Secret Manager         |
| `cloud-kms-dev.tf`                  | Story 1.5               | Tier-1 KEK + Tier-2 HMAC HSM-backed; rotation; IaC only  |
| `audit-mirror.tf`                   | **Story 1.10 (this)**   | Separate-project WORM GCS audit mirror + write-only SA    |
| `twt-staging` + `twt-prod` SQL/KMS  | Story 1.15              | Module re-use with `environment` tfvar override          |
| Workload Identity Federation pool   | Story 1.15              | CI/CD auth per architecture §5.4                         |
| Dokploy substrate                   | Story 1.15              | Deploy pipeline + multi-Pariwar provisioning             |
