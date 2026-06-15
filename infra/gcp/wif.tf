# Workload Identity Federation — keyless GitHub Actions → GCP (Story 1.15, AC-5; D4-1.2).
#
# The deploy pipeline (.github/workflows/deploy-{staging,prod}.yml) authenticates to
# GCP with NO long-lived service-account key (architecture §5.4): GitHub's OIDC token
# is exchanged for a short-lived GCP credential that impersonates a per-env deployer
# SA, scoped by an attribute condition to THIS repo + the release-branch model. Prod
# carries the strictest claim (release branch + the deploy-prod workflow only).
#
# Provisioned only for staging + prod with `github_repository` set (dev has no CI
# deploy). All resources are count-gated on `local.enable_wif`.

locals {
  enable_wif = var.environment != "dev" && var.github_repository != null

  # Prod is the strictest env: trust ONLY the deploy-prod workflow on a release
  # branch. Staging trusts the configured ref (default main) + any release branch.
  wif_attribute_condition = var.environment == "prod" ? join(" && ", compact([
    "attribute.repository == \"${var.github_repository}\"",
    "attribute.ref.startsWith(\"refs/heads/release/\")",
    var.wif_prod_workflow_ref != null ? "attribute.workflow_ref == \"${var.wif_prod_workflow_ref}\"" : "",
    ])) : join(" && ", [
    "attribute.repository == \"${var.github_repository}\"",
    "(attribute.ref == \"${var.wif_allowed_ref}\" || attribute.ref.startsWith(\"refs/heads/release/\"))",
  ])
}

resource "google_artifact_registry_repository" "images" {
  count = local.enable_wif ? 1 : 0

  location      = var.region
  repository_id = var.artifact_registry_repository
  description   = "TWT container images (${var.environment}) — pushed by the WIF deploy pipeline."
  format        = "DOCKER"
  labels = {
    managed_by  = "terraform"
    component   = "artifact-registry"
    environment = var.environment
  }
}

resource "google_iam_workload_identity_pool" "github" {
  count = local.enable_wif ? 1 : 0

  workload_identity_pool_id = "twt-${var.environment}-gh-pool"
  display_name              = "TWT ${var.environment} GitHub Actions"
  description               = "OIDC federation for GitHub Actions deploys (${var.environment})."
}

resource "google_iam_workload_identity_pool_provider" "github_actions" {
  count = local.enable_wif ? 1 : 0

  workload_identity_pool_id          = google_iam_workload_identity_pool.github[0].workload_identity_pool_id
  workload_identity_pool_provider_id = "github-actions"
  display_name                       = "GitHub Actions OIDC"

  attribute_mapping = {
    "google.subject"         = "assertion.sub"
    "attribute.repository"   = "assertion.repository"
    "attribute.ref"          = "assertion.ref"
    "attribute.workflow_ref" = "assertion.workflow_ref"
  }

  # CEL guard: federation is REJECTED unless the token is from this repo on an
  # allowed ref (prod: a release branch + the deploy-prod workflow).
  attribute_condition = local.wif_attribute_condition

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

# The per-env deployer service account the WIF principal impersonates.
resource "google_service_account" "deployer" {
  count = local.enable_wif ? 1 : 0

  account_id   = "twt-${var.environment}-deployer"
  display_name = "TWT ${var.environment} CI deployer (WIF)"
  description  = "Impersonated by GitHub Actions via WIF to build/push images + read the Dokploy deploy secret."
}

# Allow ONLY tokens from this repo (via the pool's attribute.repository) to
# impersonate the deployer SA — the keyless-auth binding.
resource "google_service_account_iam_member" "wif_impersonation" {
  count = local.enable_wif ? 1 : 0

  service_account_id = google_service_account.deployer[0].name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github[0].name}/attribute.repository/${var.github_repository}"
}

# Deployer SA project bindings — least privilege for the GitHub Actions → Dokploy API
# leg: push images to Artifact Registry + read the Dokploy API token from Secret Manager.
resource "google_project_iam_member" "deployer_artifact_writer" {
  count = local.enable_wif ? 1 : 0

  project = var.project_id
  role    = "roles/artifactregistry.writer"
  member  = "serviceAccount:${google_service_account.deployer[0].email}"
}

resource "google_project_iam_member" "deployer_secret_accessor" {
  count = local.enable_wif ? 1 : 0

  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.deployer[0].email}"
}
