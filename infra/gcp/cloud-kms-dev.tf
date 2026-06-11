# Cloud KMS substrate for Story 1.5 (PII encryption tiers).
#
# Architecture references:
# - §2.7 line 1498-1534: three-tier PII strategy; Tier-1 envelope (KEK in HSM);
#   Tier-2 HMAC-SHA-256 blind index.
# - §5.2 line 2952: Cloud KMS HSM-backed canonical service map.
# - §5.9 line 3318-3373: KEK rotation cadence (annual) + DEK re-encryption saga
#   + KEK-roots destruction discipline + 30-day delayed-destruction maximum.
# - §2.10a IAM Isolation Commitment line 1676-1730: per-key IAM bindings;
#   cross-project topology for high-sensitivity tier is Story 1.15 territory
#   (D4-1.5).
#
# Story 1.5 commits the IaC + the local-dev fake-KMS substrate. Live
# `terraform apply` against the twt-dev project is deferred (D1-1.5, analogous
# to Story 1.2 D1-1.2).

resource "google_kms_key_ring" "twt_dev" {
  name     = "twt-dev-keyring"
  location = var.region
  project  = var.project_id

  lifecycle {
    prevent_destroy = true
  }
}

resource "google_kms_crypto_key" "pii_tier_1_kek" {
  name     = "pii-tier-1-kek"
  key_ring = google_kms_key_ring.twt_dev.id
  purpose  = "ENCRYPT_DECRYPT"

  version_template {
    algorithm        = "GOOGLE_SYMMETRIC_ENCRYPTION"
    protection_level = "HSM"
  }

  rotation_period            = "${var.kms_kek_rotation_period_seconds}s"
  destroy_scheduled_duration = "${var.kms_destroy_scheduled_duration_seconds}s"

  lifecycle {
    prevent_destroy = true
  }
}

resource "google_kms_crypto_key" "pii_tier_2_hmac" {
  name     = "pii-tier-2-hmac"
  key_ring = google_kms_key_ring.twt_dev.id
  purpose  = "MAC"

  version_template {
    algorithm        = "HMAC_SHA256"
    protection_level = "HSM"
  }

  # Cloud KMS MAC keys do not support automatic rotation (only ENCRYPT_DECRYPT
  # purpose keys do). Rotation for the HMAC key is manual — create a new key
  # version and update the KmsKeyRef; see docs/runbooks/secret-rotation.md §2.1.2.
  destroy_scheduled_duration = "${var.kms_destroy_scheduled_duration_seconds}s"

  lifecycle {
    prevent_destroy = true
  }
}

# Per-key IAM bindings. var.app_service_account_email is nullable at Story 1.5
# (allows commit-without-substantive-IAM-binding); Story 1.15 substantively
# populates the service account email (D4-1.5).
#
# _iam_member (additive) is used instead of _iam_binding (replace-all) so that
# Story 1.15 can add additional principals (DR / break-glass SA) without
# removing this binding. for_each with empty set produces zero instances when
# the SA email is null OR empty-string, cleanly avoiding any interpolation of a
# null/blank value (an empty string would otherwise emit an invalid
# "serviceAccount:" member that fails only at apply time).
resource "google_kms_crypto_key_iam_member" "pii_tier_1_kek_encrypter_decrypter" {
  for_each      = var.app_service_account_email != null && var.app_service_account_email != "" ? toset([var.app_service_account_email]) : toset([])
  crypto_key_id = google_kms_crypto_key.pii_tier_1_kek.id
  role          = "roles/cloudkms.cryptoKeyEncrypterDecrypter"
  member        = "serviceAccount:${each.value}"
}

resource "google_kms_crypto_key_iam_member" "pii_tier_2_hmac_signer_verifier" {
  for_each      = var.app_service_account_email != null && var.app_service_account_email != "" ? toset([var.app_service_account_email]) : toset([])
  crypto_key_id = google_kms_crypto_key.pii_tier_2_hmac.id
  role          = "roles/cloudkms.signerVerifier"
  member        = "serviceAccount:${each.value}"
}

# Defense-in-depth: keyring-level IAM is intentionally empty at Story 1.5.
# Per-key IAM is the only access path. Story 1.15 may add keyring-level
# read-only bindings for the high-sensitivity tier per §5.9 line 3345-3353.
