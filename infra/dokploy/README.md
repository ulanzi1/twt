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

## App links (Story 6.30, `2026-10-10-312` AL9) — exact paths on the `public` service

A second Traefik router on `public`, `twt-public-app-links`, serves the app-link surfaces at the ROOT (they cannot live under
`/p/<id>/`: Apple and Android fetch `/.well-known/…` at the host root, and the link in a text is `https://<domain>/peer-request?c=…`):

| Path | What | Matcher |
| --- | --- | --- |
| `/.well-known/apple-app-site-association` | iOS Universal Links file (server endpoint, `application/json`) | `Path(...)` — exact |
| `/.well-known/assetlinks.json` | Android App Links file | `Path(...)` — exact |
| `/peer-request` | the plain fallback page (one `Path(...)` per entry of `packages/contracts/src/app-links/app-link-paths.json`) | `Path(...)` — exact |
| `/_astro/*` | the site's hashed static CSS (public, data-free — ⛔ never a page); without it the fallback page is unstyled | `PathPrefix(...)` |

⛔ Never `PathPrefix(`/.well-known/`)` (ACME and any future well-known path would reach Astro); ⛔ never `PathPrefix(`/peer-request`)`
(a plain string prefix — `/peer-requests` would match). Traefik's `Path()` ignores the query. A new app-link path needs a new
`Path(...)` here — `apps/public/tests/app-link-pages-lockstep.test.ts` fails otherwise.

The `public` service's environment carries ONLY the app-link variables (every value public; unset is safe — the files answer 404,
the page says "the app" and shows ⛔ no store button). Values are owed at roster Row 29 (a) / (c):

| Variable | Holds |
| --- | --- |
| `APP_LINKS_IOS_APP_IDS` | comma list of `<TEAMID>.<bundleId>` (the production app) |
| `APP_LINKS_ANDROID_APPS` | JSON list `[{ "package": "…", "sha256": ["AA:BB:…"] }]` — the Play App Signing key's fingerprint (+ the upload key's) |
| `APP_STORE_URL_ANDROID` / `APP_STORE_URL_IOS` | the store listing (`https://play.google.com/…` / `https://apps.apple.com/…` only); unset ⇒ ⛔ no button |
| `APP_DISPLAY_NAME` | the app's display name on the fallback page — decided WITH the production identity; unset ⇒ "the app" |

The `jobs` service gains `APP_LINKS_BASE_URL` (the Trust's domain as an https origin — read by Story 6.27c). ⚠ The `public`
service's own `DATABASE_URL` / `PUBLIC_API_ORIGIN` are still ⛔ not wired in this file (a deferred-work item, outside 6.30), and the
as-built `/p/` rule vs the root-level Astro pages mismatch is recorded, ⛔ not re-architected. The edge rule that keeps Cloudflare's
challenges off the two files is `infra/cloudflare/waf.tf` (the `waf_custom` skip). Dev wires, operator applies (ADR-0011 §5) —
roster Row 29 (g).

⚠ **The origin's access log.** Traefik's access log (Dokploy's "Requests" monitoring) records `RequestPath` WITH the query string,
so `/peer-request?c=<code>` would be written at the origin even though the edge logs exclude it (`infra/cloudflare/README.md`,
Logpush fields). The operator keeps Traefik access logging OFF on this deployment, or drops the query from it — recorded at roster
Row 29 note (7).

## Migration trigger (§5.3 — recorded, not executed)

The Dokploy→Cloud Run/GKE migration trigger (2nd Pariwar **with a bespoke build** OR
≥70% host utilization, §5.3) is *evaluated + recorded* in `docs/runbooks/deploy.md`,
not executed here. The v1 multi-tenant single deployment + path-scope serves the SM-1
2nd-Pariwar demo without a migration.
