# infra/cloudflare

PR-1 placeholder — substantive IaC for cloudflare lands in downstream Epic 1 stories.

Per architecture §Project Structure (architecture lines 4165-4168), this directory is the architecture-committed home for cloudflare infrastructure-as-code. The directory's existence at PR-1 reserves the path; substantive Terraform / Pulumi / Dokploy / Cloudflare manifests land per surface as they materialize.

## Landing-story map (provisional)

- `cloudflare/` — Story 1.13 (Cloudflare Bot Management + Turnstile + edge protection); Story 1.14 (rate limiting + WAF rules).
- `gcp/` — Story 1.2 (Cloud SQL Postgres); Story 1.5 (Cloud KMS / HSM envelope encryption); Story 1.15 (Dokploy auto-deploy pipeline + multi-Pariwar provisioning).
- `dokploy/` — Story 1.15 (Dokploy deploy manifests; per-Pariwar provisioning recipes).
