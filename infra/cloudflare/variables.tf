# Input variables for the Cloudflare edge module (Story 1.13 substrate).
#
# Defaults match the architecture-committed posture (§5.8 network topology / §5.8a
# Edge/WAF capability bar). Everything vendor-specific lives in THIS module +
# packages/edge — consumers stay vendor-neutral (AR-52). No default for account/zone
# identifiers — they are per-environment and supplied via tfvars.

variable "cloudflare_api_token" {
  description = "Cloudflare API token (scoped: Zone:Edit, Bot Management, Turnstile). Sensitive — never committed; resolved from Secret Manager / env at apply time."
  type        = string
  sensitive   = true
  default     = null # provider also reads CLOUDFLARE_API_TOKEN from the environment.
}

variable "account_id" {
  description = "Cloudflare account ID that owns the zone + Turnstile widgets. No default — supply per environment."
  type        = string
}

variable "zone_id" {
  description = "Cloudflare zone ID for the TWT apex domain. No default — supply per environment."
  type        = string
}

variable "zone_name" {
  description = "The apex domain (e.g., example.org). Used to derive the FR-88 surface hostnames + Turnstile widget domains."
  type        = string
}

variable "environment" {
  description = "Environment tag (dev | staging | prod). Drives default resource names + the strictness of the security posture."
  type        = string
  default     = "dev"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "environment must be one of: dev, staging, prod."
  }
}

variable "origin_hostname" {
  description = "The GCP Cloud Run origin hostname all proxied traffic is routed to (architecture §5.8 — backend reachable only through the edge). Live value is Story 1.15 territory."
  type        = string
  default     = null
}

# ── Bot Management / WAF (AC-6c, §5.8a) ─────────────────────────────────────────

variable "enable_bot_management" {
  description = "Provision the cloudflare_bot_management resource (ML bot scoring). PLAN-TIER DEPENDENT: full Bot Management is Enterprise; Super Bot Fight Mode is the Pro/Business equivalent. The architecture commits the CAPABILITY, not the SKU — ADR-0010 records this. false at dev (no paid plan); the WAF custom rules below still express per-surface sensitivity."
  type        = bool
  default     = false
}

variable "bot_score_challenge_threshold" {
  description = "cf.bot_management.score below this is CHALLENGED on standard surfaces (1 = definitely bot, 99 = definitely human). 30 is a conservative default."
  type        = number
  default     = 30

  validation {
    condition     = var.bot_score_challenge_threshold >= 1 && var.bot_score_challenge_threshold <= 99
    error_message = "bot_score_challenge_threshold must be between 1 and 99 (Cloudflare bot-score range)."
  }
}

variable "bot_score_sensitive_threshold" {
  description = "Stricter cf.bot_management.score floor for the FR-88 high-sensitivity surfaces (signup, claim filing, helpdesk forms). Higher than the standard threshold → more aggressive challenge. Per-surface sensitivity per architecture L3483 + §5.8a."
  type        = number
  default     = 50

  validation {
    condition     = var.bot_score_sensitive_threshold >= 1 && var.bot_score_sensitive_threshold <= 99
    error_message = "bot_score_sensitive_threshold must be between 1 and 99."
  }
}

variable "sensitive_surface_paths" {
  description = "URL path prefixes for the FR-88 high-sensitivity surfaces gated with stricter bot/Turnstile policy. Auth lands at /api/v1/auth/* (Story 1.9). Signup/claim/helpdesk land in later epics (forward-referenced)."
  type        = list(string)
  default = [
    "/api/v1/auth/login",
    "/api/v1/auth/password-reset/request",
    "/signup",
    "/claims/file",
    "/helpdesk",
  ]
}

# ── Turnstile (AC-6d) ───────────────────────────────────────────────────────────

variable "turnstile_widget_mode" {
  description = "Turnstile challenge mode: managed (Cloudflare decides), non-interactive, or invisible. 'managed' is the §5.8a default (challenge only when warranted)."
  type        = string
  default     = "managed"

  validation {
    condition     = contains(["managed", "non-interactive", "invisible"], var.turnstile_widget_mode)
    error_message = "turnstile_widget_mode must be one of: managed, non-interactive, invisible."
  }
}

variable "turnstile_extra_domains" {
  description = "Additional hostnames (beyond zone_name + www) the Turnstile widgets are valid for — e.g., a staging subdomain or localhost for dev. Cloudflare's test keys cover localhost without a real widget."
  type        = list(string)
  default     = []
}

# ── Edge-only ingress (AC-6b, AR-33, §5.8) ──────────────────────────────────────

variable "edge_only_ingress_mechanism" {
  description = "How the backend is made unreachable except through Cloudflare (ADR-0010 §decision). 'tunnel' = Cloudflare Tunnel (origin has no public ingress — cleanest for Cloud Run private ingress); 'header_secret' = inject a shared-secret header the origin verifies (defense-in-depth, vendor-neutral guard behind @twt/edge); 'aop_mtls' = Authenticated Origin Pulls. Live wiring (the GCP ingress side) is deferred with Story 1.15."
  type        = string
  default     = "header_secret"

  validation {
    condition     = contains(["tunnel", "header_secret", "aop_mtls"], var.edge_only_ingress_mechanism)
    error_message = "edge_only_ingress_mechanism must be one of: tunnel, header_secret, aop_mtls."
  }
}

variable "edge_auth_header_name" {
  description = "Header name injected by Cloudflare + verified at the origin when edge_only_ingress_mechanism = header_secret. The VALUE is a secret resolved from Secret Manager, never committed."
  type        = string
  default     = "x-twt-edge-auth"
}

variable "edge_auth_secret" {
  description = "The shared-secret VALUE injected as the edge-auth header (edge_only_ingress_mechanism = header_secret). Sensitive — no default; must be supplied at apply time via TF_VAR_edge_auth_secret or a secrets backend. Never committed. Resolved from Secret Manager at live-apply time (D2-1.13)."
  type        = string
  sensitive   = true
  default     = null
}

# ── Observability (AC-6e, §5.8a Category 5) ─────────────────────────────────────

variable "enable_logpush" {
  description = "Provision a Logpush job exporting edge request/challenge/bot logs to the observability sink (the 'observable edge metrics' bar). false at dev; the live sink (GCS bucket / SIEM) is an ops decision wired at Story 1.15."
  type        = bool
  default     = false
}

variable "logpush_destination_conf" {
  description = "Logpush destination (e.g., gs://bucket/edge-logs or an HTTPS sink). Only used when enable_logpush = true."
  type        = string
  default     = null
}
