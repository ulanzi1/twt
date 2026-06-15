# infra/dokploy

Dokploy deploy substrate — **Story 1.15** (FR-61/FR-62, architecture §5.3/§5.4).
Replaces the PR-1 placeholder. The deploy model is **GitHub Actions → Dokploy API**:
`.github/workflows/deploy-{staging,prod}.yml` build + push images to Artifact
Registry (WIF-keyless), then `POST` the Dokploy deploy API. This directory holds the
Dokploy **application definitions** + the **per-Pariwar branding-swap recipe** + the
**path-scoped routing** the deploy-config reader (`apps/api` AC-3) emits.

> **Dev-agent / operator split (load-bearing).** The dev agent authored + wired this
> substrate + the live `DeployTrigger` Dokploy-API client + the workflows + the WIF /
> staging-prod Cloud SQL Terraform — all CI-green — but runs **NO live cloud commands**.
> The operator (BigDev) creates the Dokploy applications from `compose.yaml`, pushes the
> per-env secrets, and runs the documented apply-sequence. See `../gcp/README.md` §Story 1.15
> and `docs/runbooks/deploy.md`.

## Files

| File                       | Purpose                                                                 |
| -------------------------- | ----------------------------------------------------------------------- |
| `compose.yaml`             | The 4 Dokploy applications (`api` / `admin` / `jobs` / `public`) — image refs, env, routing labels. |
| `per-pariwar-profile.md`   | The per-Pariwar build profile + branding-bundle-swap recipe + the `/p/<id>/` path-scope descriptor. |

## The four applications

| App      | Workspace      | Role                                                       | Path-scope                       |
| -------- | -------------- | --------------------------------------------------------- | -------------------------------- |
| `api`    | `@twt/api`     | Fastify API (provisioning + auth + audit surfaces)        | `/api/v1/**`                     |
| `admin`  | `@twt/admin`   | Admin SPA (provisioning + audit-integrity UI)             | `/admin/**`                      |
| `jobs`   | `@twt/jobs`    | pg-boss worker (audit integrity cron, mirror, idempotency)| _(no ingress — worker)_          |
| `public` | `@twt/public`  | Public Astro shell — serves each Pariwar's branded chrome | `/p/<pariwar_id>/**` (per §2.5)   |

## Path-scoped routing (AC-3) — straight to Dokploy, Cloudflare path-routing GATED

Each Pariwar is served under the **`/p/<pariwar_id>/`** prefix (architecture §2.5 + AR-25)
on the SINGLE multi-tenant deployment — NOT a separate stack per Pariwar. The active
Pariwar is selected by the URL path; branding is resolved at request time from the
Pariwar-Passport (the cross-readable accessor), so a new Pariwar serves immediately on
its `/p/<id>/` URL after provisioning, with no rebuild.

The deploy-config reader (`apps/api/src/modules/pariwar-provisioning/deploy-config.ts`)
emits the `{ pariwarId, pathScope: "/p/<id>/", branding }` descriptor the live
`DeployTrigger` POSTs to Dokploy. **Cloudflare path-routing stays GATED** on the §5.8a
DPDPA legal review (D1-1.13, ADR-0010 OPEN) — route straight to Dokploy for now and
**do NOT assert DPDPA compliance**.

## Migration trigger (§5.3 — recorded, not executed)

The Dokploy→Cloud Run/GKE migration trigger (2nd Pariwar **with a bespoke build** OR
≥70% host utilization, §5.3) is *evaluated + recorded* in `docs/runbooks/deploy.md`,
not executed here. The v1 multi-tenant single deployment + path-scope serves the SM-1
2nd-Pariwar demo without a migration.
