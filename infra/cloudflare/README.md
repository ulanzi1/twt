# infra/cloudflare

Cloudflare edge infrastructure-as-code. **Story 1.13** lands the substrate (edge
proxy + Bot Management + Turnstile + edge-only ingress); Story 1.14 extends it with
rate-limiting / WAF rule policy.

Per architecture §Project Structure (lines 4165-4168), this directory is the
architecture-committed home for Cloudflare IaC. This module is the **control
mechanism** for architecture §5.8a's vendor-neutral Edge/WAF capability bar (AR-52);
everything Cloudflare-specific lives here + in `packages/edge`, so a pivot to a
different edge vendor is a single-module change. See `docs/adr/ADR-0010-edge-waf-cloudflare-turnstile.md`.

> **Deferred-apply.** There is no live TWT Cloudflare zone in this environment. The
> HCL is authored-but-not-applied (mirrors infra/gcp's D1-1.2 / D1-1.5 substrate
> pattern). Live `terraform apply` + zone onboarding is a **D-item**, gated on the
> §5.8a Cloudflare-DPDPA compatibility legal review (architecture L247-254), recorded
> **OPEN** in ADR-0010. Do NOT assert DPDPA compliance.

## Story 1.13 — Cloudflare edge (this folder)

Terraform module (HCL) targeting the `cloudflare/cloudflare` v4 provider. Designed for
Story 1.15 multi-environment reuse via the `environment` tfvar.

| File                            | Purpose                                                                 |
| ------------------------------- | ----------------------------------------------------------------------- |
| `versions.tf`                   | Terraform >= 1.7, `cloudflare/cloudflare` >= 4.40 < 5.0, provider block  |
| `variables.tf`                  | Inputs (account/zone ids, bot thresholds, turnstile, edge-ingress, …)    |
| `locals.tf`                     | Derived names + the FR-88 sensitive-surface wirefilter expression        |
| `zone.tf`                       | Zone settings (TLS-strict, HSTS) + proxied DNS records (AC-6a)           |
| `waf.tf`                        | Bot Management + per-surface WAF custom rules on bot score (AC-6c)       |
| `turnstile.tf`                  | Turnstile widgets for auth + FR-88 member surfaces (AC-6d)               |
| `origin-ingress.tf`             | Edge-only ingress — edge-auth header injection (AC-6b, AR-33)            |
| `observability.tf`              | Logpush job for observable edge metrics (AC-6e)                          |
| `outputs.tf`                    | Turnstile site keys (public) + secret keys (sensitive) + ruleset id      |
| `terraform.tfvars.example`      | Sample tfvars + the deferred onboarding runbook                          |
| `.gitignore`                    | Excludes `*.tfstate`, populated `*.tfvars`, `.terraform/`                |
| `.terraform-plan-expectations.md` | Expected `terraform plan` shape for the deferred live-apply leg        |

### The §5.8a capability bar → where each control lands

| §5.8a capability                 | Expressed by                                                            |
| -------------------------------- | ----------------------------------------------------------------------- |
| All public traffic proxied       | `zone.tf` — `cloudflare_record` `proxied = true`                        |
| Edge-only ingress (AR-33)        | `origin-ingress.tf` — edge-auth header (or Tunnel / AOP per ADR-0010)   |
| Bot management + challenge       | `waf.tf` — `cloudflare_bot_management` + bot-score WAF custom rules      |
| CAPTCHA-style challenge (FR-88)  | `turnstile.tf` — widgets; server verify in `@twt/edge`                  |
| Ingress signature verification   | `origin-ingress.tf` header + a vendor-neutral origin guard (behind edge)|
| Observable edge metrics          | `observability.tf` — Logpush + native Cloudflare Analytics              |
| Rate limiting (Layer 1)          | Cloudflare front line; the server-side POLICY layer is **Story 1.14**    |

### Edge-only ingress mechanism (ADR-0010 decision)

`var.edge_only_ingress_mechanism` selects how the backend is made unreachable except
through Cloudflare:

- **`header_secret`** (default) — Cloudflare injects a shared-secret header
  (`origin-ingress.tf`); a vendor-neutral Fastify guard at the origin rejects any
  request lacking it. Defense-in-depth; simplest to wire on Cloud Run.
- **`tunnel`** — Cloudflare Tunnel (`cloudflared`); the origin has NO public ingress.
  Cleanest end state; the GCP/Tunnel wiring is Story 1.15.
- **`aop_mtls`** — Authenticated Origin Pulls (Cloudflare client-cert mTLS).

The break-glass bypass path must remain **time-bounded + audit-logged** (§5.8
L3257-3266). The GCP ingress side (Cloud Run ingress restriction) is wired at Story 1.15.

### Turnstile secret handling

`terraform apply` produces, per widget, a PUBLIC site key + a SECRET key. The site
keys are safe to expose (build-time `VITE_TURNSTILE_SITE_KEY` for apps/admin). The
secret keys are **pushed to GCP Secret Manager out-of-band** and referenced by NAME
(apps/api `TURNSTILE_SECRET_NAME`) — never committed, never an env literal in prod
(same discipline as the argon2 pepper + the Cloud SQL connection string).

```sh
# After apply (live-apply D-item):
terraform output -raw turnstile_auth_secret_key | \
  gcloud secrets create twt-prod-turnstile-secret --data-file=- --project=twt-prod
# then set apps/api TURNSTILE_SECRET_NAME=twt-prod-turnstile-secret
```

### Bot Management plan-tier dependency

Full **Bot Management** (`cf.bot_management.score`, verified-bot list) is a Cloudflare
**Enterprise** add-on; **Super Bot Fight Mode** is the Pro/Business equivalent. The
architecture commits the *capability* ("bot management + challenge"), not the SKU.
`var.enable_bot_management` defaults **false** (no paid plan at dev). The custom-rules
ruleset `cloudflare_ruleset.waf_custom` is nonetheless ALWAYS present (Story 6.30,
`2026-10-10-312` AL10): it is the zone's ONE entry point for `http_request_firewall_custom`,
and its FIRST rule skips the edge challenges for the two app-link verification files (below).
The per-surface bot-score rules (Rules 1–3) are added to it only when
`enable_bot_management = true` — they need a plan that populates `cf.bot_management.score`.
Recorded in ADR-0010 so the capability bar is not quietly assumed at a tier the trust has
not bought.

See `.terraform-plan-expectations.md` for the expected `terraform plan` shape.

### App-link verification files skip the edge challenges (Story 6.30)

`/.well-known/apple-app-site-association` and `/.well-known/assetlinks.json` are fetched by
Apple's CDN and Android's verifier — bots by design. A challenge is not a clean 200, and
verification then fails SILENTLY. `waf_custom`'s first rule skips, for EXACTLY those two
paths: the rest of the ruleset, Browser Integrity Check and the zone security level (both
always on — `zone.tf`), and Super Bot Fight Mode (`phases = ["http_request_sbfm"]`). ⛔ Never
`/peer-request` (a human page — normal edge rules apply). ⚠ Free-plan **Bot Fight Mode**
cannot be skipped by a rule: the operator records whether it is on (roster Row 29). The
DPDPA reading (the skip is ⛔ not a material change to the cleared edge design) is the
author's, recorded with its ground on Row 29; if questioned it goes to Row 3's owners. Prove
it on a real request at the device proof (`curl -A` a non-browser user agent).

### Logpush fields — ⛔ never `ClientRequestURI`

`observability.tf` logs `ClientRequestPath`, which EXCLUDES the query string. An app link
carries its code in the query (`/peer-request?c=<code>`, Story 6.30 AL4), so the code is ⛔ not
in the edge logs as configured. ⛔ Never add `ClientRequestURI` to `logpull_options` — it
carries the query. ⚠ This covers the EDGE only: the origin's Traefik access log records the path
WITH its query — see `infra/dokploy/README.md` (App links) and roster Row 29 note (7).

## Landing-story map (provisional)

- `cloudflare/` (this module) — Story 1.13 (Cloudflare Bot Management + Turnstile +
  edge protection); Story 1.14 (rate limiting + WAF rule policy).
- `gcp/` — Story 1.2 (Cloud SQL Postgres); Story 1.5 (Cloud KMS / HSM envelope
  encryption); Story 1.10 (off-site audit mirror); Story 1.15 (Dokploy auto-deploy +
  multi-Pariwar provisioning + the GCP edge-ingress side).
- `dokploy/` — Story 1.15 (Dokploy deploy manifests; per-Pariwar provisioning recipes).
