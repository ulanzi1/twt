# ADR-0011: Multi-Pariwar provisioning surface — global-scope permission gate, self-scoped write, env-resolved DeployTrigger, GitHub Actions → Dokploy API deploy model, dev-agent-wires/operator-applies split

> **Status:** drafted
> **Date:** 2026-06-15 (date entered current status)
> **Author:** Solo Builder (BigDev), at Story 1.15 closure
> **Ratifying trustees:** <pending; populated at `ratified` status>
> **Supersedes:** —
> **Superseded by:** —

## Context

Story 1.15 is the FIRST story to land a **global-scoped, permission-gated write surface** (multi-Pariwar provisioning, FR-61/FR-62) and the FIRST to wire the **CI→deploy** leg (architecture §5.3/§5.4). Both warrant an ADR per the architecture-amendment discipline: a new authorization primitive + a deploy-substrate posture are control mechanisms, not properties. Per [[feedback_architecture_vs_adr_boundary]], the architecture commits the *property* (multi-tenant isolation §1.2; URL path scope §2.5; Dokploy substrate §5.3; WIF CI/CD §5.4); this ADR records the *controls* chosen.

The forcing conditions:

- **A global route has no `request.scopeTx`.** The per-tenant `requirePermissionHook` (Story 1.9) loads grants from the scope tx set by `/:pariwarId/`; a GLOBAL route (provisioning a Pariwar that does not exist yet) has no such param → the hook hard-throws 500. This was the documented **D4-1.11a** landmine that forced the audit-integrity surface onto session-only gating.
- **The chicken-and-egg write.** `upsertPariwarPassport` writes through an RLS `WITH CHECK` that requires `pariwar_id = current app.pariwar_id`; a NEW Pariwar has no membership + no prior scope.
- **GCP + Dokploy are operator-confirmed available** (staging + prod), so the deploy legs are **live-wired**, not authored-not-applied — BUT the dev agent has NO live credentials (escrow-sealed).
- **`national` scope does not exist** — Story 1.8 reconciled `national → global` (`scope.ts`, ADR-0008); the wire value is `global`.

## Decision

### 1. `requireGlobalPermission(deps, key)` — the global-scope permission gate (AC-1a; closes D4-1.11a)

A new reusable Fastify pre-handler, co-located in `apps/api/src/modules/rbac/index.ts` as the deliberate sibling of `requirePermissionHook`. It loads the actor's grants from the BYPASSRLS **`deps.servicePool`** (no `app.pariwar_id` context → all grant rows across tenants, via a new `loadGlobalActorGrants` helper — NOT `loadActorGrants`, whose `scopeTx.scopeSet` guard throws on a global route), then calls the pure `rbac.requirePermission` with `resource: { dimension: 'global', value: null, pariwarId: ADMIN_GLOBAL_NAMESPACE }`. The nil-UUID `ADMIN_GLOBAL_NAMESPACE` stands in for the absent active Pariwar; a `global` grant bypasses the active-Pariwar filter regardless (`check.ts` L172), and a non-global grant can never match the nil-UUID active scope → fail-closed deny. Missing session ⇒ 401 (upstream `requireAdminSession`); missing `actorId` after the session guard ⇒ 500 (programming error, same contract as `requirePermissionHook`); deny ⇒ `AuthorizationDeniedError` → 403 + `authz.denied` audit (`pariwarId: null`).

**It is retrofitted onto the trustee audit-integrity surface (AC-1b), discharging D4-1.11a at the call site** — all three `modules/audit-log/` routes now gate on `[requireAdminSession, requireGlobalPermission('audit.verify')]`. This also tightens **CR-A-3** at the endpoint boundary (the gate runs `hasPermission` → `scopeWithinCeiling`, which the advisory session-handler union does not).

### 2. Self-scoped provisioning write (the chicken-and-egg)

The provisioning handler mints `pariwar_id = ids.pariwarId(randomUUID())`, then **self-scopes to that freshly-minted id**: `openScopeTx(deps, newId)` → `upsertPariwarPassport(scopeTx.tx, …)` → commit. The RLS `WITH CHECK` passes because `row.pariwar_id === newId === app.pariwar_id`. RLS is exercised faithfully — `scope-tx.ts` sheds superuser via `SET LOCAL ROLE twt_app`, so the policy is really enforced in CI. **No BYPASSRLS shortcut / `runAsCrossTenant`** for the write. RLS is the *data* boundary; the global `pariwar.provision` gate is the *action* boundary (architecture §2.6 "RLS then authz"). The write emits its own `pariwar.provisioned` audit event (no spurious `scope.change` — `openScopeTx` does not emit one).

### 3. Env-resolved `DeployTrigger` seam (fake + live Dokploy-API client) (AC-3/AC-5)

`deps.deployTrigger` is the §5.6 seam pattern (same shape as `auditSink` / `turnstile`), now shipping **two** implementations resolved by `resolveDeployTriggerFromEnv(mode)` reading `DEPLOY_TRIGGER_MODE=fake|live` (default `fake`, validated in `config.ts`) — mirroring `resolveIntegritySinkFromEnv`. The **fake** (structured-log + in-memory status) runs in dev/test/CI; the **live Dokploy-API client** (`DOKPLOY_API_URL` + `DOKPLOY_API_TOKEN` from Secret Manager) runs in staging/prod and maps a non-2xx / transport failure to a 502 `BadGatewayError` (never a raw throw). Live fails CLOSED if the creds are absent. The deploy-config reader emits the `/p/<pariwar_id>/` path-scope + branding reference from the Passport (cross-readable; no scope).

### 4. Deploy model = GitHub Actions → Dokploy API (staging + prod)

Release-branch push → **WIF-keyless** auth → build + push per-app images (`api`/`admin`/`jobs`/`public`) to **Artifact Registry** (`asia-south1`) → `POST` the **Dokploy deploy API** (`.github/workflows/deploy-{staging,prod}.yml`). The per-app matrix is the build axis; the **per-Pariwar dimension is resolved at RUNTIME** via the Passport branding swap (one image set serves every Pariwar under its path-scope) — a bespoke per-Pariwar build is only the §5.3 migration trigger. Env scope = **staging + prod** (dev stays authored). Prod carries the **≥2-principal promotion approval gate** (the GitHub `production` Environment required-reviewers rule) + the **strictest WIF claim** (release branch + the deploy-prod workflow only). WIF is `infra/gcp/wif.tf` (per-env pool/provider + deployer SA + least-privilege IAM).

### 5. Dev-agent-wires / operator-applies activation split (load-bearing)

The dev agent **authored + wired + TESTED** the entire slice + the live client + the workflows + the WIF/staging-prod Cloud SQL Terraform (the Cloud SQL flat file was extracted into `infra/gcp/modules/cloud-sql/` and reused per-env — the **D3-1.2 test** holds: staging/prod via tfvar overrides only) — all CI-green, mergeable independent of a green live deploy. The **operator (BigDev)** runs the live activation (`terraform apply` staging → smoke → prod; WIF binding; Dokploy app creation; secret push; the D3-1.12 pg-boss CREATE grant) with the **escrow-sealed credentials that are deliberately absent from the dev-agent environment**. The dev agent runs NO live cloud commands.

### 6. Cloudflare path-routing STAYS GATED (D1-1.13)

`/p/<id>/` traffic routes **straight to Dokploy** (Traefik `PathPrefix`); the Cloudflare path-route is NOT enabled because the §5.8a Cloudflare-DPDPA legal review is OPEN (ADR-0010). This ADR does **NOT** assert DPDPA compliance.

### 7. Source-tree variances recorded

`requireGlobalPermission` co-located in `modules/rbac/index.ts` (sibling to `requirePermissionHook`); the `DeployTrigger` seam in `context.ts`/`AppDeps`; `apps/api/src/modules/pariwar-provisioning/` + `apps/admin/src/modules/pariwar-provisioning/` + `/provisioning` route fill the architecture-tree "empty at v1" slots; `infra/gcp/modules/cloud-sql/` is the D3-1.2 module extraction. The provisioning contracts are consumed from the `@twt/contracts` root barrel (no subpath exports map on the package — the pariwar-passport precedent).

## Alternatives considered

- **Reuse `requirePermissionHook` with a synthetic scope tx for global routes** — Rejected: it would fabricate a fake `/:pariwarId/` scope (the nil-UUID) inside the per-tenant primitive, polluting the tenant gate with a global special-case and risking a real-tenant collision. A distinct global gate keeps each primitive single-purpose.
- **BYPASSRLS raw INSERT for the provisioning write** — Rejected: it would skip the RLS `WITH CHECK` entirely, forfeiting the §1.2 posture (the data boundary must be exercised in CI). Self-scoping is faithful + cheap.
- **Webhook-only `DeployTrigger` (no API client) / direct `kubectl`** — The fake-only seam (no live client) was the Story-1.11-era pattern; Story 1.15 graduates it because GCP+Dokploy are now available. A Cloud Run/GKE `kubectl` deploy is the §5.3 migration end-state, not v1.
- **Per-Pariwar image build matrix in v1** — Deferred: the runtime branding swap (Passport read) serves every Pariwar from one image set; a per-Pariwar build is the §5.3 migration trigger, not the SM-1 demo path.
- **Service-account JSON key for CI auth** — Rejected: WIF (keyless) is the §5.4 commitment; no long-lived key is created.

## Consequences

- **Security** — A second global-scope action boundary now exists; it is fail-closed by construction (`scopeWithinCeiling` enforced). The provisioning write cannot escape its own tenant (self-scope + RLS). The deployer SA is separated from the KEK-roots + audit-mirror roles (advances D4-1.5; the cross-project KEK topology remains deferred). The Dokploy API token lives in Secret Manager, read via the deployer SA's `secretAccessor` binding.
- **Operational** — A new operator obligation: the staging→smoke→prod apply-sequence (`infra/gcp/README.md` §Story 1.15) + the GitHub Environment ≥2-reviewer rule + the per-env Dokploy secrets + the D3-1.12 pg-boss CREATE grant. The runbooks (`multi-pariwar-provisioning.md` / `deploy.md` / `rollback.md`) were reconciled to AS-BUILT (material edit; ≥2-trustee re-sign).
- **Demo** — AC-7 in-story proof is the dev/FAKE provision→deploy→status integration test; the **live on-stage 2nd-Pariwar demo is a TRACKED FOLLOW-ON** (deferred-work + `.decision-log.md`, owner BigDev), NOT a merge gate.
- **Migration / pivot path** — The §5.3 Dokploy→Cloud Run/GKE migration (2nd-Pariwar bespoke build OR ≥70% utilization) is recorded in the deploy runbook; the env-resolved `DeployTrigger` seam keeps the deploy mechanism swappable behind one factory.
- **Failure modes accepted** — live `DeployTrigger` fails closed on absent creds / Dokploy outage (502); the provisioning write fails closed on RLS/permission denial; the dev agent cannot validate `terraform`/`actionlint` locally (operator runs them as the first live step).

## References

- [Source: epics.md, Story 1.15 L1269-1289] — story statement; minimal-UI scope + Epic-10 exclusion; `pariwar.provision` at national(=global) scope; ~10-min demo beat C1
- [Source: architecture.md §2.5 L1449-1474] — multi-Pariwar active scope = `/p/<pariwar_id>/` URL path prefix (AR-25)
- [Source: architecture.md §2.6 L1476-1492] — "RLS then authz"; permission keys + scope dimensions
- [Source: architecture.md §5.3 L2995-3043] — Dokploy substrate; migration trigger; IAM isolation
- [Source: architecture.md §5.4 L3044-3098] — GitHub Actions + WIF + Artifact Registry; dev→staging→prod promotion gate
- [Source: docs/adr/ADR-0008-rbac-permission-model.md] — `national → global` reconciliation
- [Source: deferred-work.md] — D4-1.11a (discharged here), CR-A-3 (endpoint leg discharged), D3-1.2 / D4-1.2 / D3-1.12 / W7 / W8 / W9 / W12 (wired here), D4-1.5 / D2-1.13 (advanced), D1-1.13 (stays GATED)
- [Source: infra/gcp/modules/cloud-sql/, infra/gcp/wif.tf, infra/dokploy/, .github/workflows/deploy-{staging,prod}.yml] — the AS-BUILT substrate
- Memory: [[feedback_architecture_vs_adr_boundary]] — discipline anchor (architecture commits the property; this ADR commits the control)
- Memory: [[feedback_closure_language_precision]] — DPDPA stays OPEN; tracked follow-on recorded as deferral, not closure

---

## Changelog

| Date | Status flip | Author | Notes |
|---|---|---|---|
| 2026-06-15 | (initial draft) | Solo Builder (BigDev) | Authored at Story 1.15 closure — `requireGlobalPermission` global-scope gate (closes D4-1.11a) + audit retrofit (AC-1b); self-scoped provisioning write; env-resolved `DeployTrigger` (fake + live Dokploy-API client); GitHub Actions → Dokploy API deploy model (staging + prod, prod ≥2-principal + strictest WIF); dev-agent-wires/operator-applies split; Cloudflare path-routing GATED (D1-1.13) |
