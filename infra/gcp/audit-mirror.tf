# Off-site audit-log mirror substrate — Story 1.10 Task 8.4 (DD-5, AC-3/AC-4).
#
# Architecture references:
# - §1.5 L876-887: write-path scoping, restricted IAM, cross-project isolation;
#   append-only object-name patterns; no overwrites.
# - §2.10 / §2.10a L1655-1730: audit-mirror credential separation + the four
#   Isolation-Commitment properties (compromise of prod creds ⇏ mirror modify;
#   compromise of audit-read ⇏ prod access; sole-engineer creds ⇏ audit-write;
#   controls survive routine IAM mistakes + quarterly attestation).
# - §5.2 L2948/L2968: cold tier = Cloud Storage Bucket Lock + Object Retention
#   Lock (Cohasset WORM-equivalent), 7-year retention per FR-47.
#
# Like cloud-kms-dev.tf / cloud-sql-dev.tf, Story 1.10 commits the IaC SHAPE; the
# live `terraform apply` (and the irreversible retention LOCK) are deferred
# (D1-1.5 precedent). The 6-hourly trigger is pg-boss cron at Story 1.12 (the
# function + CLI ship now in apps/jobs/src/audit/).
#
# ── AC-4: one-way push, separate tenancy ──────────────────────────────────────
# The bucket + writer SA live in a SEPARATE GCP project (var.audit_mirror_project_id,
# default twt-audit-mirror), reached via the aliased provider below. The mirror
# project grants NO inbound IAM to any primary-project identity — there are
# deliberately ZERO bindings here referencing the primary app SA. The primary
# pushes using the MIRROR writer SA's own credential (a key distributed to the
# primary via Secret Manager — the one-way push credential), and that SA can only
# CREATE objects (roles/storage.objectCreator — no get/delete/overwrite). So even
# a full compromise of prod credentials cannot modify or erase mirrored audit
# data (§2.10a property 1). The mirror project is assumed provisioned + billing-
# linked out-of-band (a prerequisite, like the primary project); see the runbook.

# Aliased provider bound to the separate mirror project. Credentials resolve via
# ADC (the operator's gcloud login at apply time); the runtime push credential is
# the writer SA key (Secret Manager), NOT this provider.
provider "google" {
  alias   = "audit_mirror"
  project = var.audit_mirror_project_id
  region  = var.region
}

locals {
  audit_mirror_bucket = coalesce(
    var.audit_mirror_bucket_name,
    "twt-audit-mirror-${var.environment}",
  )
}

# The WORM bucket. Bucket Lock (retention_policy) + Object Retention Lock
# (enable_object_retention) together give Cohasset WORM-equivalent immutability.
# ⚠ is_locked is IRREVERSIBLE once true (the retention policy can never be
# shortened/removed and the bucket can never be deleted until every object ages
# out). Gated behind var.enable_retention_lock (default false) so dev/staging
# applies never accidentally lock a bucket (§5.2 L2968 misconfiguration guard).
resource "google_storage_bucket" "audit_mirror" {
  provider = google.audit_mirror

  name     = local.audit_mirror_bucket
  project  = var.audit_mirror_project_id
  location = var.region

  # No public access; IAM is the only path; ACLs disabled.
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"

  # Enable per-object retention capability (Object Retention Lock).
  enable_object_retention = true

  # Bucket Lock — WORM for the whole bucket. is_locked makes it irreversible.
  retention_policy {
    retention_period = var.audit_retention_seconds
    is_locked        = var.enable_retention_lock
  }

  # Append-only by object-name convention (the mirror writes new segment objects,
  # never overwrites). Versioning off — retention + objectCreator-only is the WORM
  # guarantee; versioning would only add cost.
  versioning {
    enabled = false
  }

  labels = {
    managed_by  = "terraform"
    component   = "audit-mirror"
    environment = var.environment
  }

  lifecycle {
    prevent_destroy = true
  }
}

# Write-only mirror service account (lives in the mirror project). Its key is the
# one-way push credential handed to the primary via Secret Manager (deferred with
# the live apply). It is NEVER granted read/delete/admin on the bucket.
resource "google_service_account" "audit_mirror_writer" {
  provider = google.audit_mirror

  project      = var.audit_mirror_project_id
  account_id   = "audit-mirror-writer"
  display_name = "TWT audit-log mirror writer (one-way push, objectCreator only)"
}

# AUTHORITATIVE objectCreator binding: ONLY the writer SA may create objects.
# Using _iam_binding (replace-all) — not _iam_member — is the "deny writes from
# any principal except that SA" belt-and-braces (§1.5 L885): any other principal
# that somehow acquired objectCreator is removed on the next apply. There is no
# objectAdmin / objectUser / legacyBucketWriter binding anywhere → no
# delete/overwrite path exists for any identity.
resource "google_storage_bucket_iam_binding" "audit_mirror_object_creator" {
  provider = google.audit_mirror

  bucket  = google_storage_bucket.audit_mirror.name
  role    = "roles/storage.objectCreator"
  members = ["serviceAccount:${google_service_account.audit_mirror_writer.email}"]
}

# ── AC-4 / §2.10a operator obligations (enforced out-of-band; documented here) ─
# These cannot be expressed as project-level Terraform without org/folder access,
# so they are the apply-time runbook checklist (docs/runbooks/audit-mirror-attestation.md):
#   1. The mirror project sits in a SEPARATE folder from the primary; no primary-
#      project SA holds ANY role in the mirror project (verify: `gcloud projects
#      get-iam-policy <mirror>` lists no primary-project members).
#   2. Org policy `constraints/iam.disableServiceAccountKeyCreation` is EXEMPTED
#      only for audit-mirror-writer (its key is the push credential); enforced
#      elsewhere.
#   3. Org policy `constraints/storage.retentionPolicySeconds` (if used) ≥ 7y.
#   4. Quarterly attestation (§2.10a): confirm the bucket retention policy is
#      locked, the objectCreator binding still lists ONLY the writer SA, and no
#      delete/admin binding has appeared.
