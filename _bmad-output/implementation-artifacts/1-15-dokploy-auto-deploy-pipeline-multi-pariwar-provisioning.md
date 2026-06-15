# Story 1.15: Dokploy Auto-Deploy Pipeline + Multi-Pariwar Provisioning (SM-1 C1)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As **Solo Builder + Trustee Panel**,
I want a **Dokploy auto-deploy pipeline triggered by release-branch pushes + a minimal admin UI for multi-Pariwar provisioning**,
so that **new Pariwars can be onboarded with a path-scoped URL + branding bundle in a single demo'able workflow (SM-1 demo beat C1)**.

This is a `[SURFACE]` story (FR-61 + FR-62 + AR-25). It is the FIRST story that lands a **global-scoped, permission-gated write surface** and the FIRST that wires the **CI→deploy** leg. It lands four things:

1. **A buildable provisioning slice** — `apps/api` provisioning module (global `pariwar.provision` gate) + `packages/contracts` transport + `apps/admin` minimal UI + a deploy seam — all unit/integration-tested in this environment.
2. **Live-wired cloud substrate (staging + prod)** — GitHub Actions → Dokploy API deploy (WIF-keyless build/push to Artifact Registry, then `POST` the Dokploy deploy API), WIF pool/provider, staging+prod Cloud SQL via module reuse. **Authored + wired in this story**; the live `terraform apply` + Dokploy app creation are the **operator activation leg** (BigDev runs them with the escrow-sealed credentials — those are deliberately NOT in the dev-agent environment).
3. **Runbook reconciliation** — the `docs/runbooks/multi-pariwar-provisioning.md` + `deploy.md` + `rollback.md` runbooks ALREADY EXIST (authored at Story 0.1); 1.15 reconciles them to the AS-BUILT pipeline.
4. **A new architectural primitive** — `requireGlobalPermission(deps, key)`, the global-scope permission pre-handler that discharges deferred-work **D4-1.11a**.

> **SCOPE DISCIPLINE — read before writing code.** GCP + Dokploy **are now available** (operator-confirmed), so the deploy legs are **live-wired**, not "authored-not-applied" — BUT the split below is load-bearing:
> - **The dev agent (you) authors + wires + TESTS** the entire slice and the live pipeline: the provisioning code (AC-1…AC-4), the **live `DeployTrigger` Dokploy-API client** (AC-3) resolved by env (fake in dev/test, live in staging/prod), the **GitHub Actions → Dokploy API** workflow (AC-5), and the WIF + staging/prod Cloud SQL Terraform (AC-5). All of this is mergeable and CI-green **independent of a successful live deploy**.
> - **The operator (BigDev) executes the live activation** — `terraform apply` (staging then prod), WIF binding, Dokploy app creation, secret push — using the **escrow-sealed credentials that are deliberately NOT in the dev-agent environment**. The dev agent ships the runnable apply-sequence + the live client; it does NOT run live cloud commands.
> - **Env scope = staging + prod** (dev stays authored). **Deploy model = GitHub Actions → Dokploy API** (WIF-keyless). **The live on-stage SM-1 2nd-Pariwar demo is a TRACKED FOLLOW-ON**, not a merge gate (AC-7): 1.15 proves the slice against the dev/fake substrate + wires the live path; the real 2nd-Pariwar-serving-real-traffic demo runs post-merge once the operator confirms staging green.
> - **Cloudflare path-routing stays GATED** on the §5.8a DPDPA legal review (D1-1.13, ADR-0010 OPEN) — route straight to Dokploy for now and **do not assert DPDPA compliance**.

## Acceptance Criteria

Derived from epics.md Story 1.15 (L1269–1289), FR-61/FR-62 (L122), AR-25/AR-28/AR-29/AR-54 (L301–339), architecture §2.5 (URL path scope), §5.3/§5.4 (deploy substrate + CI/CD), §5.10 (operations), and the established substrate discipline (deferred-work.md).

### AC-1 — Provisioning API module, global-scoped + permission-gated (epic block 2, clause "`pariwar.provision` at national scope")

**Given** the provisioning surface is a GLOBAL action (creating a *new* Pariwar — there is no `/p/:pariwarId/` to scope to, because the Pariwar does not exist yet) requiring `pariwar.provision` at the `national` (== canonical **`global`**) scope
**When** the `apps/api/src/modules/pariwar-provisioning/` module is authored and registered in `server.ts`
**Then** it exposes (all under `requireAdminSession` + the new `requireGlobalPermission` gate, see AC-1a):
- `POST /api/v1/provisioning/pariwars` — provisions a new Pariwar: mint a fresh `pariwar_id` (UUID v4), persist the Pariwar-Passport (Story 1.7), emit a `pariwar.provisioned` audit event, return the created passport + initial provisioning status.
- `POST /api/v1/provisioning/pariwars/:pariwarId/deploy` — trigger a Dokploy build for an existing Pariwar via the deploy seam (AC-3); emit `pariwar.deploy_triggered`; return deploy status.
- `GET /api/v1/provisioning/pariwars` — the provisioning-status view: list provisioned Pariwars (passport rows; cross-readable via the Story 1.7 carve-out) with their latest deploy status. Under the named **read** rate ceiling (`namedRateLimits(deps).read`) + bounded pagination per the Story 1.14 forced-pagination discipline.
**And** the endpoints are NOT under `/p/:pariwarId/` (a global surface, mirroring the `/api/v1/audit/...` global convention — see `modules/audit-log/index.ts` header "GLOBAL, not tenant-scoped")
**And** every route carries the `ADMIN_SESSION_GUARD`-tagged `requireAdminSession(deps)` pre-handler so the Story 1.14 login-wall guard (`login-wall.spec.ts`) passes "by construction".

### AC-1a — `requireGlobalPermission` pre-handler primitive (discharges D4-1.11a)

**Given** deferred-work **D4-1.11a**: "`requirePermissionHook` needs `request.scopeTx` (set from `/:pariwarId/`), which a GLOBAL route lacks → it hard-throws 500. Re-trigger: a global-scope preHandler that loads national-scope grants without a `:pariwarId` param."
**When** the reusable `requireGlobalPermission(deps, key)` pre-handler is authored (home: `apps/api/src/modules/rbac/` alongside `requirePermissionHook`)
**Then** it loads the actor's grants by querying `role_grants` via **`deps.servicePool`** (BYPASSRLS — no `app.pariwar_id` context, returns ALL grant rows across tenants for the user) as `EffectiveGrant[]` — same SQL as `loadActorGrants` (`SELECT pariwar_id, role, scope_dimension, scope_value FROM role_grants WHERE user_id = $1`) but using `servicePool.query()` directly (do NOT reuse `loadActorGrants`: it has a `scopeTx.scopeSet` guard that throws on a global route); then calls `rbac.requirePermission({ actorId, grants, key, resource: { dimension: 'global', value: null, pariwarId: ADMIN_GLOBAL_NAMESPACE } }, { onAuthorizationDenied: (denial) => deps.auditSink.emit({ type: 'authz.denied', actorId, pariwarId: null, traceId: request.requestContext.traceId, context: { permissionKey: denial.permissionKey, ... }, at: deps.clock() }) })` — the exact pattern of `requirePermissionHook` so `AuthorizationDeniedError` is thrown (403) and the audit sink fires; `ADMIN_GLOBAL_NAMESPACE` (`'00000000-0000-0000-0000-000000000000'`, `context.ts:L28`) is the nil-UUID sentinel — `global` grants bypass the active-Pariwar filter regardless (`check.ts` L172); missing session → 401
**And** it MUST run AFTER `requireAdminSession` (which sets `requestContext.actorId`); fail loud (500) if `actorId` is absent (programming error — same contract as `requirePermissionHook`)
**And** the trustee audit-integrity surface is retrofitted to consume it (AC-1b) — fully closing D4-1.11a at the call site, not just shipping the primitive.

### AC-1b — Retrofit the trustee audit-integrity surface to a real `audit.verify` gate (closes D4-1.11a at the call site)

**Given** AC-1a ships `requireGlobalPermission`, and the trustee audit-integrity endpoints (`modules/audit-log/index.ts`) currently gate on `requireAdminSession` ONLY — the documented D4-1.11a gap — while the SPA already *advisory*-gates the same surface on `audit.verify` (`IntegrityRoute.tsx` / `hasAuditVerify`)
**When** the audit-log module is upgraded
**Then** all three endpoints of that surface — `POST /api/v1/audit/verify-integrity`, `GET /api/v1/audit/integrity-checks`, and `POST /api/v1/audit/integrity-checks/:checkId/acknowledge` — gate on `[requireAdminSession(deps), requireGlobalPermission(deps, 'audit.verify')]`, so an authenticated admin lacking `audit.verify` at `global` scope now gets a real **403** (not merely a hidden nav entry); the global-route 500 landmine the header warned about is gone because the gate no longer needs `request.scopeTx`
**And** this also tightens **CR-A-3** at the endpoint boundary: `requireGlobalPermission` calls `hasPermission`, which enforces `scopeWithinCeiling` (the advisory session-handler union does NOT), so a non-`super_admin` role mistakenly granted at `global` no longer passes the action gate
**And** the existing audit integration tests are updated — a `super_admin` (global `audit.verify`) still passes all three; an admin without it now gets 403 — and **D4-1.11a** (plus the CR-A-3 *endpoint* note) are marked **discharged** in `deferred-work.md`
**And** the SPA gate stays as the advisory UX layer (no client change required); the server is now the real boundary it always claimed to be.

### AC-2 — Provisioning transport contracts (`packages/contracts/src/pariwar-provisioning/`)

**Given** the `packages/contracts/src/pariwar-provisioning/` slot does not exist yet
**When** the transport Zod schemas are authored
**Then** they define at minimum: `AddPariwarRequest` (the Add-Pariwar form payload — see AC-4 field list), `ProvisionedPariwar` / `ProvisioningStatusList` (status view), `DeployTriggerResponse`
**And** they **REUSE** `@twt/contracts/pariwar-passport` (`BrandingBundle` schema with the `#RRGGBB` hex shape + the `hi | en` locale) — do NOT redefine branding/locale shapes (anti-reinvention; the passport contracts already enforce the hex shape)
**And** every `z.object({...})` ends with `.strict()` (architecture §Format patterns L3824–3826); types are consumed via `@twt/contracts/pariwar-provisioning` (no shadow `*.types.ts` in apps/api — anti-pattern #2)
**And** `pnpm contracts:check-openapi-determinism` stays green after re-emit.

### AC-3 — Deploy seam + path-scoped deploy config reader (epic block 1, clause "deploy script reads target-Pariwar configuration from Pariwar-Passport and applies path-scoped routing")

**Given** the deploy trigger touches a live external system (Dokploy) that is **absent** in this environment, and the architecture's seam pattern (the §5.6 observability seams ship structured-log fakes in dev, live wiring at the "Category-5 graduation")
**When** the deploy abstraction is authored
**Then** a `DeployTrigger` interface is injected through `AppDeps` (`deps.deployTrigger`) with a **dev/test fake** (structured-log + in-memory status) as the default; the live Dokploy-webhook implementation is the deferred Category-5 leg
**And** a deploy-config reader (home: `infra/dokploy/` script or `apps/api` provisioning service) reads the target Pariwar's config from the **Pariwar-Passport** (`getPariwarPassport` / `getBrandingBundle` — the cross-readable accessor; NO scope needed) and produces the **path-scoped routing** descriptor (the `/p/<pariwar_id>/` prefix per architecture §2.5 + AR-25) + the branding-bundle reference for the build
**And** this reader is unit-tested against a fixture passport (fresh-from-DB read + correct path-scope + branding reference), proving "deploy script reads from Pariwar-Passport and applies path-scoped routing" without a live Dokploy.

### AC-4 — Admin provisioning UI: deliberately minimal (epic block 2)

**Given** the epic's explicit minimalism: "scope is bounded to SM-1 operational provisioning controls only … Operational configuration that belongs in Epic 10 (admin operations console — bulk ops, feature flags, news/blog, helpdesk, reports, moderation) is NOT in scope here; this UI is provisioning-only"
**When** `apps/admin/src/modules/pariwar-provisioning/` + a `/provisioning` route are authored
**Then** the surface ships EXACTLY three controls and nothing more:
  - **(a) "Add Pariwar" form** — fields: display name EN, display name HI, legal name, trust registration ID (optional), locale default (`hi | en`), branding bundle (logo URL(s) + primary/secondary/optional-accent hex colors), path-scope / short-name assignment → `POST /api/v1/provisioning/pariwars`
  - **(b) "Trigger Dokploy build" action** → `POST /api/v1/provisioning/pariwars/:pariwarId/deploy`
  - **(c) provisioning-status view** → `GET /api/v1/provisioning/pariwars`
**And** the route + nav entry are gated CLIENT-SIDE + ADVISORY on `nationalGrants.includes('pariwar.provision')` — mirror the EXACT pattern of `IntegrityRoute.tsx` (`IntegrityGateView` pure gate → `AccessDenied` panel) and the `RootLayout.tsx` `TopBar` nav gate (`hasAuditVerify` → write a `hasPariwarProvision(grants)` sibling helper in `api/hooks.ts`); `requireGlobalPermission` (AC-1a) is the REAL server boundary
**And** the typed client (`api/client.ts`) + TanStack Query hooks (`api/hooks.ts`) are extended following the established cache-disabled / mutation-invalidates-list pattern; the new route is added to `router.tsx` (code-based routing per DD-1)
**And** NO Epic-10 controls (feature flags, bulk ops, news/blog, helpdesk, reports, moderation) appear — verified by review against the epic exclusion list.

### AC-5 — Live deploy pipeline, GitHub Actions → Dokploy API (staging + prod) — wired-here, applied-by-operator

**Given** GCP + Dokploy are available (staging + prod), the chosen deploy model **GitHub Actions → Dokploy API** (WIF-keyless build/push to Artifact Registry, then `POST` the Dokploy deploy API — architecture §5.4 dev→staging→prod promotion gate), and the dev-agent / operator split (the dev agent has NO live credentials)
**When** the deploy pipeline is wired
**Then** the following land as **real, wired, CI-validated** artifacts (NOT mere placeholders):
  - **Live `DeployTrigger` Dokploy-API client** (AC-3) — a real implementation that reads `DOKPLOY_API_URL` + `DOKPLOY_API_TOKEN` (Secret Manager per env) and `POST`s the Dokploy deploy endpoint, **env-resolved** so dev/test gets the fake and staging/prod gets the live client (mirror `resolveIntegritySinkFromEnv`). Unit-tested against a mocked Dokploy API (request shape + auth header + error mapping).
  - **`infra/dokploy/`** — substantive deploy config (replaces the PR-1 placeholder README): per-Pariwar build profile + branding-bundle-swap recipe + the path-scoped routing the deploy reader (AC-3) emits + the Dokploy application definitions for `apps/api`, `apps/admin`, `apps/jobs`, `apps/public`.
  - **`.github/workflows/deploy-staging.yml` + `deploy-prod.yml`** — release-branch push → WIF-auth to GCP → build + push image to Artifact Registry (`asia-south1`) → `POST` Dokploy deploy API; per-Pariwar build matrix (§5.4); **prod carries the ≥2-principal promotion approval gate** (§5.4) and the strictest WIF claim (release branch + this workflow only). Mirror `.github/workflows/ci.yml` conventions (pnpm + setup-node + `--frozen-lockfile`); `actionlint`-clean.
  - **WIF Terraform** in `infra/gcp/` (D4-1.2 pool+provider, scoped per-env to repo + release-branch + deploy-workflow; prod strictest) + **staging+prod Cloud SQL via module reuse** — the D3-1.2 test: the module must provision staging + prod with tfvar overrides only (`environment`/`availability_type`/`tier`/`network_self_link`), **no HCL edits**; if HCL edits are needed, the module is under-parameterized → refactor it. Per-env Secret Manager connection-string names (W12) + the pg-boss `CREATE` grant on first start (D3-1.12).
**And** the **operator activation leg** is delivered as a runnable apply-sequence (extend `infra/gcp/README.md` + `docs/runbooks/deploy.md`): `terraform apply` staging → smoke → prod; WIF binding; Dokploy app creation; secret push. The dev agent updates `.terraform-plan-expectations.md` for staging + prod but does **NOT** run live cloud commands.
**And** `deferred-work.md` is reconciled: **D3-1.2 / D4-1.2 / D3-1.12 / W12 / W7 / W8 / W9** move to *"wired in 1.15; live apply = operator activation leg"* (no longer open-ended); **D4-1.5** (high-sensitivity IAM topology) and **D2-1.13** (Cloudflare-side edge ingress) are advanced as far as the non-gated parts allow; **D1-1.13** (Cloudflare zone / DPDPA) **stays GATED** — route straight to Dokploy, **do NOT assert DPDPA compliance** (§5.8a legal review, ADR-0010 OPEN).

### AC-6 — Runbook reconciliation (Story 0.1 extension — DO NOT recreate)

**Given** `docs/runbooks/multi-pariwar-provisioning.md`, `deploy.md`, and `rollback.md` ALREADY EXIST (Story 0.1, "draft — awaiting ≥2-trustee sign-off") and were authored AHEAD of implementation
**When** the runbooks are reconciled to the AS-BUILT pipeline
**Then** `multi-pariwar-provisioning.md` is updated so its procedure matches reality: the actual endpoint paths (AC-1), the deploy seam (AC-3), the admin UI flow (AC-4), the `pariwar.provision` GLOBAL gate (AC-1a), and the **self-scoped provisioning write** (Dev Note "Provisioning write" below); `deploy.md` reflects the GitHub Actions → Dokploy leg (AC-5); `rollback.md` covers the new-Pariwar rollback (the runbook §3 "inactive ≠ deleted; never re-allocate a `pariwar_id`" forbidden-actions list stays authoritative)
**And** the runbook changelog records a **material edit** (re-sign required: ≥2 trustees) per the runbook's own changelog discipline
**And** the runbook's "documented in the runbook (Story 0.1) with rollback procedure" requirement (epic block 1, "And") is satisfied by this reconciliation.

### AC-7 — In-story proof (dev/fake) + live path wired; the on-stage demo is a tracked follow-on (SM-1 C1)

**Given** epic block 3: "provisioning form → Dokploy trigger → branding-bundle swap → path-scoped URL serving traffic — completes within ~10 minutes", and the operator decision that 1.15 **builds + wires** the live path but the live on-stage 2nd-Pariwar demo runs **post-merge** (not a merge gate)
**When** the slice (AC-1…AC-5) is wired
**Then** the in-story proof is the **dev/fake** end-to-end, exercised by an integration test: Add-Pariwar form → `POST provisioning/pariwars` (real passport persisted) → Trigger build → `POST .../deploy` (fake `DeployTrigger` returns a status) → status view reflects the new Pariwar + its `/p/<id>/` path scope — so the slice is *proven*, not asserted
**And** the **live path is wired** (AC-5): the same flow, with `DeployTrigger` resolved to the live Dokploy-API client, is documented as the operator walkthrough against **staging** (the dry-run target) ahead of prod
**And** the **live on-stage SM-1 demo** (a real 2nd Pariwar serving real traffic on its own `/p/<id>/` URL) is recorded as a **TRACKED FOLLOW-ON** in `deferred-work.md` + a `.decision-log.md` entry (owner: BigDev), to run once the operator confirms staging is green — explicitly NOT closed by this story, explicitly NOT blocking merge.

### AC-8 — ADR + migration discipline + green gates

**Given** the architecture-amendment discipline (a new primitive + a substrate posture warrant an ADR; §1.14 "no new migration for a new Pariwar — RLS-tagged rows inherit isolation" per the provisioning runbook §2.2)
**When** the story is implemented
**Then** **no new DB migration** is created for provisioning (a new Pariwar is rows tagged with a new `pariwar_id`, not new schema — confirm against `multi-pariwar-provisioning.md` §2.2); a new **ADR-0011** records the decisions: the `requireGlobalPermission` global-scope gate, the self-scoped provisioning write, the env-resolved `DeployTrigger` (fake + live Dokploy-API client), the **GitHub Actions → Dokploy API** deploy model (staging + prod), and the **dev-agent-wires / operator-applies** activation split
**And** tests cover: provisioning happy-path (provision → status), the `requireGlobalPermission` allow/deny matrix (super_admin allowed; a pariwar-scoped-only admin denied 403; unauth 401), cross-tenant write isolation of the self-scoped write, the deploy-config reader (AC-3), and the admin UI client-gate (`hasPariwarProvision` + the gate view) — mirroring `IntegrityGateView`'s pure-unit-testability
**And** `pnpm turbo run lint typecheck test build` is GREEN and the `apps/api` integration suite is GREEN against the live test DB (`twt-test-pg` Docker on 5433).

## Tasks / Subtasks

- [x] **Task 1 — `requireGlobalPermission` pre-handler primitive + audit-surface retrofit (AC-1a, AC-1b)** — closes D4-1.11a
  - [x] Author `requireGlobalPermission(deps, key)` in `apps/api/src/modules/rbac/index.ts` (alongside `requirePermissionHook`). Implementation: (1) Guard `actorId = request.requestContext.actorId` — throw 500 if absent (programming error, same contract as `requirePermissionHook`). (2) Write a new `loadGlobalActorGrants(pool, actorId)` helper in the same file (`async function loadGlobalActorGrants(pool: pg.Pool, actorId: string): Promise<rbac.EffectiveGrant[]>`) — do NOT reuse `loadActorGrants` (it has a `scopeTx.scopeSet` guard that throws on a global route). Query: `SELECT pariwar_id, role, scope_dimension, scope_value FROM role_grants WHERE user_id = $1` on `pool` (BYPASSRLS servicePool); map rows to `EffectiveGrant[]` (same shape as `loadActorGrants`). (3) Call `rbac.requirePermission({ actorId, grants, key, resource: { dimension: 'global', value: null, pariwarId: ADMIN_GLOBAL_NAMESPACE } }, { onAuthorizationDenied: (denial) => deps.auditSink.emit({ ... }) })` — import `ADMIN_GLOBAL_NAMESPACE` from `../../context.js`; the nil-UUID sentinel is the `pariwarId` for global operations (global grants bypass the active-Pariwar filter regardless — `check.ts:L172`). `rbac.requirePermission` throws `AuthorizationDeniedError` on deny → 403 via error-mapping middleware (do NOT catch it).
  - [x] Unit-test the allow/deny matrix (super_admin global → allow; pariwar_admin-only → deny; unknown role → deny; unauth → 500-guard path). _(`tests/unit/require-global-permission.test.ts`, 5 tests green; also asserts `authz.denied` emitted with `pariwarId: null`.)_
  - [x] **Retrofit (AC-1b):** add `requireGlobalPermission(deps, 'audit.verify')` after `requireAdminSession` on all three `modules/audit-log/index.ts` routes; update the audit integration tests (super_admin passes; no-grant admin → 403); remove the "do not change" caveat in that module's header. _(audit-integrity-ui.spec.ts 14/14 green against live test DB incl. the new AC-1b gate matrix.)_
  - [x] Mark **D4-1.11a** + the **CR-A-3 endpoint** note DISCHARGED in `deferred-work.md`. _(also marked D6-1.11b discharged via D4-1.11a.)_
- [x] **Task 2 — Provisioning transport contracts (AC-2)**
  - [x] Create `packages/contracts/src/pariwar-provisioning/` (`add-pariwar.ts`, `status.ts`, `index.ts`); reuse `@twt/contracts/pariwar-passport` `BrandingBundle` + locale; all `.strict()`. _(10-test `.strict()`+reuse suite green; `AddPariwarRequest` rejects a client-supplied `pariwarId`.)_
  - [x] Wire into the contracts barrel + re-emit OpenAPI; confirm `pnpm contracts:check-openapi-determinism` green. _(registered 5 components + 3 real paths in `emit-openapi.ts`; openapi/v1.yaml 46835 bytes, determinism green, 84/84 contracts tests pass.)_
- [x] **Task 3 — Deploy seam (fake + live Dokploy-API client) + path-scoped config reader (AC-3)**
  - [x] Add `DeployTrigger` interface + dev/test fake to `AppDeps`/`context.ts` (structured-log + in-memory status). _(`modules/pariwar-provisioning/deploy-trigger.ts`; `deps.deployTrigger` wired in `deps.ts` + `_setup.ts`.)_
  - [x] Add the **live Dokploy-API client** impl (`DOKPLOY_API_URL` + `DOKPLOY_API_TOKEN`); env-resolve fake-vs-live via a `resolveDeployTriggerFromEnv()` function reading `DEPLOY_TRIGGER_MODE=fake|live` (default `'fake'`), mirroring `resolveIntegritySinkFromEnv`. Add `DEPLOY_TRIGGER_MODE` to `apps/api/src/config.ts` alongside the other env vars. Unit-test the live client against a mocked HTTP endpoint (request shape + `Authorization: Bearer <token>` header + error→`DomainError` mapping). _(error→502 `BadGatewayError` `provisioning.deploy_failed`/`deploy_unreachable`; live fails CLOSED without creds.)_
  - [x] Author the deploy-config reader: read Passport via `getPariwarPassport`/`getBrandingBundle`, emit the `/p/<pariwar_id>/` path-scope + branding reference. Unit-test against a fixture passport. _(`deploy-config.ts` `buildDeployConfig` pure + `readDeployConfig` DB wrapper; 8-test unit suite green.)_
- [x] **Task 4 — Provisioning API module (AC-1)**
  - [x] Author `apps/api/src/modules/pariwar-provisioning/index.ts`: the 3 routes, each `preHandler: [requireAdminSession(deps), requireGlobalPermission(deps, 'pariwar.provision')]`.
  - [x] `POST /provisioning/pariwars`: mint `pariwar_id` (UUID v4 → `ids.pariwarId(randomUUID())`), **self-scope** via `openScopeTx(deps, newId)` then `upsertPariwarPassport(scopeTx.tx, { pariwarId: newId, displayNameEn, displayNameHi, legalName, trustRegistrationId, brandingBundle, localeDefault })`, close tx (commit on 2xx), emit `pariwar.provisioned`. _(createdBy omitted = system-null per the story's exact field list; actor attribution lives in the audit event.)_
  - [x] `POST /provisioning/pariwars/:pariwarId/deploy`: read path-scoped config from Passport (404 if absent), invoke `deps.deployTrigger`, emit `pariwar.deploy_triggered`, return status.
  - [x] `GET /provisioning/pariwars`: cross-readable passport list (new `passport.listPariwarPassports` domain accessor) + deploy status; `config: { rateLimit: namedRateLimits(deps).read }` + bounded query schema (`.max(100)` cap, default 30) per Story 1.14.
  - [x] Add `'pariwar.provisioned'` + `'pariwar.deploy_triggered'` to the `AuthAuditEventType` union in `apps/api/src/audit/audit-sink.ts` (mapper is generic — `action: event.type`, default 200 — so no sink-mapper change needed).
  - [x] Register the module in `server.ts` (after `registerAuditLogModule`). _(Full apps/api suite 110/110 green on live DB incl. the new 9-test provisioning spec; login-wall + forced-pagination guards auto-cover the routes.)_
- [x] **Task 5 — Admin provisioning UI (AC-4)**
  - [x] `apps/admin/src/modules/pariwar-provisioning/` — Add-Pariwar form (`AddPariwarForm.tsx`, RHF + zodResolver over `AddPariwarRequest`, blank-optional→undefined coercion), Trigger-build action (per-row in the status table), status view (`ProvisioningStatusTable.tsx`); assembled in `ProvisioningPage.tsx`. EXACTLY the 3 AC-4 controls — NO Epic-10 controls.
  - [x] Extend `api/client.ts` (3 typed calls; `apiFetch` input type relaxed to `unknown` so branded `PariwarIdSchema` outputs infer correctly) + `api/hooks.ts` (`useProvisionedPariwars`/`useAddPariwar`/`useTriggerDeploy` + `hasPariwarProvision(grants)`); add `/provisioning` route to `router.tsx`; gate via a pure `ProvisioningGateView` mirroring `IntegrityGateView`; add the nav entry to `RootLayout.tsx` `TopBar` gated on `hasPariwarProvision`. _(admin suite 25/25 green incl. 5 gate + 3 form tests; `tsc + vite build` green.)_
- [x] **Task 6 — Live deploy pipeline wired (staging + prod), applied-by-operator (AC-5)**
  - [x] `infra/dokploy/` substantive deploy config (per-Pariwar profile + branding swap + path-scope + Dokploy app definitions for api/admin/jobs/public); replace the placeholder README. _(`README.md` rewritten, `compose.yaml` 4-app stack + Traefik PathPrefix routing, `per-pariwar-profile.md` branding-swap recipe.)_
  - [x] `.github/workflows/deploy-staging.yml` + `deploy-prod.yml` — release-branch push → WIF-auth → build + push to Artifact Registry → `POST` Dokploy deploy API; per-app matrix (per-Pariwar = runtime branding swap, §5.4); prod = `production` Environment ≥2-reviewer gate + strictest WIF claim + manual workflow_dispatch promotion. Mirror `ci.yml` (pnpm 10.30.3 + node 22.12.0 + `--frozen-lockfile`); YAML validated (actionlint unavailable in dev env — operator runs it).
  - [x] WIF Terraform (`infra/gcp/wif.tf`, D4-1.2; per-env pool/provider, prod strictest via `wif_prod_workflow_ref`, deployer SA + Artifact Registry + least-privilege IAM) + staging/prod Cloud SQL via module refactor + reuse: (1) extracted `infra/gcp/modules/cloud-sql/{versions,variables,main,outputs}.tf` (parameterised environment/availability_type/tier/network_self_link + W12 secret_name + D3-1.12 `pgboss_create_grant_sql` output); (2) `cloud-sql-dev.tf` now consumes the module (behavior-preserving; `state mv` documented); (3) `cloud-sql-staging.tf` + `cloud-sql-prod.tf` consume the same module with overrides only (D3-1.2 test holds). `.terraform-plan-expectations.md` updated for the module-address migration + staging/prod plans.
  - [x] Author the **operator apply-sequence** (`infra/gcp/README.md` §Story 1.15 + `docs/runbooks/deploy.md`): `terraform apply` staging → smoke → prod; WIF binding; Dokploy app creation; secret push; the D3-1.12 pg-boss CREATE grant. Dev agent ran NO live cloud commands.
  - [x] Reconcile `deferred-work.md`: **D3-1.2 / D4-1.2 / D3-1.12 / W12 / W7 / W8 / W9** → *"WIRED in 1.15; live apply = operator activation leg"*; **D4-1.5 / D2-1.13** advanced as far as non-gated (deploy-SA separation / Dokploy path routing) with the gated remainder recorded; **D1-1.13** STAYS GATED (route straight to Dokploy; DPDPA NOT asserted).
- [x] **Task 7 — Runbook reconciliation (AC-6)**
  - [x] Reconcile `multi-pariwar-provisioning.md` (§0 AS-BUILT + endpoints/global-gate/self-scoped-write/deploy-seam + Cloudflare GATED) + `deploy.md` (§0 GitHub Actions → Dokploy leg, AR path, `production` ≥2-reviewer gate, ADR-0011) + `rollback.md` (§0 + §2.4 new-Pariwar rollback deferring to provisioning §3 forbidden-actions) to the AS-BUILT pipeline; marked material edit (re-sign required, ≥2 trustees) in all three changelogs.
- [x] **Task 8 — In-story proof + ADR + green gates (AC-7, AC-8)**
  - [x] Author the dev/fake-substrate walkthrough + the provision→status integration test (`apps/api/tests/integration/pariwar-provisioning.spec.ts`, 9 tests incl. the AC-7 provision→trigger→status proof); document the live staging walkthrough (`infra/gcp/README.md` §Story 1.15 + `docs/runbooks/deploy.md`); record the live on-stage 2nd-Pariwar demo as a **tracked follow-on** (deferred-work D1-1.15 + `.decision-log.md` Decision 2026-06-15-050, owner BigDev) — NOT a merge gate.
  - [x] Author ADR-0011 (global-permission gate + self-scoped provisioning write + env-resolved `DeployTrigger` + the GitHub Actions→Dokploy API deploy model + the dev-agent/operator activation split); adr-index updated (Section A row, total → 129).
  - [x] Confirm NO new migration; run `pnpm turbo run lint typecheck test build` (**64/64 GREEN**) + the apps/api live-test-DB suite (**110/110 GREEN**) + @twt/domain live-DB (**207/208**, 1 pre-existing KMS skip) + OpenAPI determinism + db:check — all GREEN.

### Review Findings

- [x] [Review][Decision] `deploy-prod.yml` promotes via `workflow_dispatch` only (no release-branch push trigger) — **Resolved: manual-promotion model accepted** as compliant with §5.4 "≥2-principal promotion approval gate". Prod is a human-gated image promotion from staging, not an automatic build-on-push. AC-5 "release-branch push" applies to staging; prod gate is the `production` environment ≥2-reviewer approval.
- [x] [Review][Patch] `closeScopeTx(scopeTx, false)` in POST /provisioning/pariwars catch block — if the ROLLBACK itself throws, the original error is shadowed and the connection may be returned to the pool in a broken state [apps/api/src/modules/pariwar-provisioning/index.ts]
- [x] [Review][Patch] `deps.deployTrigger.latest(newId)` called after COMMIT, outside try/catch — if it throws, client receives 500 even though the Pariwar was successfully provisioned; caller retries unnecessarily [apps/api/src/modules/pariwar-provisioning/index.ts]
- [x] [Review][Patch] `Promise.all` in GET /provisioning/pariwars — one `deployTrigger.latest()` rejection fails the entire list endpoint with 500; wrap each `.latest()` call in `.catch(() => null)` [apps/api/src/modules/pariwar-provisioning/index.ts]
- [x] [Review][Patch] No HTTP fetch timeout in `createLiveDokployDeployTrigger` — a hung Dokploy server leaves the Fastify handler pending indefinitely, exhausting the connection pool under load [apps/api/src/modules/pariwar-provisioning/deploy-trigger.ts]
- [x] [Review][Patch] `res.json()` returning `null` (a valid JSON parse, not a throw) — `body` becomes `null` after the `try/catch`, `body.deploymentId` then throws TypeError; add `?? {}` or a type-check after the silent catch [apps/api/src/modules/pariwar-provisioning/deploy-trigger.ts]
- [x] [Review][Patch] Missing 403 test for authenticated-but-no-grant admin on `POST /api/v1/provisioning/pariwars/:pariwarId/deploy` — the allow/deny matrix test covers POST /pariwars and GET /pariwars but not the deploy endpoint (AC-8 matrix gap) [apps/api/tests/integration/pariwar-provisioning.spec.ts]
- [x] [Review][Patch] `DOKPLOY_API_TOKEN` fetched via `gcloud secrets versions access` is never registered with the GitHub Actions secret masker; if `ACTIONS_STEP_DEBUG=true`, the token appears in plaintext in runner logs — add `echo "::add-mask::${DOKPLOY_API_TOKEN}"` after resolving the secret [.github/workflows/deploy-staging.yml, deploy-prod.yml]
- [x] [Review][Patch] `${{ inputs.image_tag }}` interpolated raw into the curl `-d` JSON body AND into the `gcloud artifacts docker images describe` argument in `deploy-prod.yml` — a workflow_dispatch with a crafted image_tag injects extra JSON fields or shell metacharacters [.github/workflows/deploy-prod.yml]
- [x] [Review][Defer] In-process `lastByPariwar` Map in `createLiveDokployDeployTrigger` — deploy status is lost on pod restart or scale-out, `GET /provisioning/pariwars` always returns `latestDeploy: null` after any restart [apps/api/src/modules/pariwar-provisioning/deploy-trigger.ts] — deferred, pre-existing architectural choice (fake has same property); fixing requires a DB-backed deploy-status store (new feature scope)

## Dev Notes

### Ground-truth: most of the substrate ALREADY EXISTS — extend, do not reinvent

| Need | Already exists | Action |
|---|---|---|
| Pariwar identity + branding data model | `packages/domain/src/schema/pariwar_passport.ts` (Story 1.7, `done`) | **Consume.** The provisioning write upserts a `pariwarPassport` row. |
| Branding/locale transport shape | `@twt/contracts/pariwar-passport` (`BrandingBundle` hex shape, `hi|en` locale) | **Reuse** in `AddPariwarRequest` — do NOT redefine. |
| Passport read (cross-tenant) | `packages/domain/src/pariwar-passport/read.ts` (`getPariwarPassport`, cross-readable, no scope) | **Consume** in the status view + deploy reader. |
| Passport write (invalidate-on-write) | `packages/domain/src/pariwar-passport/write.ts` (`upsertPariwarPassport`) | **Consume** — see "Provisioning write" below. |
| `pariwar.provision` permission key | `packages/domain/src/rbac/permissions.ts` L86 (in `SEED_PERMISSION_KEYS`) | **Consume.** super_admin carries it at `global` (roles.ts derives Super Admin from the full catalog). |
| Pure permission predicate | `packages/domain/src/rbac/check.ts` (`hasPermission`, `requirePermission`) | **Consume** in `requireGlobalPermission`. |
| Global-grants read posture | `apps/api/src/modules/auth/admin/admin-session.handler.ts` (BYPASSRLS `servicePool`, role→bundle union) | **Mirror exactly** for `requireGlobalPermission`. |
| Session global-grants on the client | `SessionResponse.nationalGrants: string[]` + `useSession()` | **Consume** for the client gate (`hasPariwarProvision`). |
| Scope-tx lifecycle | `apps/api/src/modules/multi-tenant/scope-tx.ts` (`openScopeTx`/`closeScopeTx`) | **Consume** for the self-scoped write. |
| Login-wall "by construction" guard | `route-registry.ts` + `login-wall.spec.ts` (Story 1.14) — every authed route needs the `ADMIN_SESSION_GUARD` tag | **Satisfy:** put `requireAdminSession(deps)` first in every route's preHandler list. |
| Forced-pagination guard | Story 1.14 (`.max()` bound on every collection GET) + `namedRateLimits(deps).read` | **Satisfy** on `GET /provisioning/pariwars`. |
| Admin SPA module pattern | `apps/admin/src/modules/audit-integrity/` + `IntegrityRoute.tsx` gate + `RootLayout` nav gate | **Mirror** for the provisioning module + gate + nav. |
| Deploy/rollback/provisioning runbooks | `docs/runbooks/{multi-pariwar-provisioning,deploy,rollback}.md` (Story 0.1) | **Reconcile**, do NOT recreate. |
| Infra home | `infra/dokploy/` (placeholder README), `infra/gcp/` | **Fill in** per the landing-story map in `infra/dokploy/README.md`. |

### CRITICAL — `national` scope DOES NOT EXIST; the canonical value is `global`

The epic says "`pariwar.provision` permission at `national` scope". There is **no `'national'`** in the scope enum — Story 1.8 reconciled `national → global` (`packages/domain/src/rbac/scope.ts` L16; ADR-0008). The `SCOPE_DIMENSIONS` are `['self','block','pariwar','district','state','global']`. **Filtering `role_grants` on `scope_dimension = 'national'` returns ZERO rows → fail-closed deny on every request.** Use `'global'` everywhere (the session handler already calls the global ceiling "national" only in prose; the wire value is `global`). The `nationalGrants` field name on `SessionResponse` is a *label*, not a scope value — it carries the keys held at `scope_dimension='global'`.

### CRITICAL — Provisioning write: self-scope to the NEW `pariwar_id` (the chicken-and-egg)

`upsertPariwarPassport` writes through the `pariwarPassportTenantIsolationWrite` RLS policy, whose `WITH CHECK` requires `pariwar_id = current app.pariwar_id`. A NEW Pariwar has no membership and no prior scope. **Solution: self-scope to the freshly-minted id.** In the handler: `const newId = ids.pariwarId(randomUUID()); const scopeTx = await openScopeTx(deps, newId); try { await upsertPariwarPassport(scopeTx.tx, { pariwarId: newId, ... }); await closeScopeTx(scopeTx, true); } catch { await closeScopeTx(scopeTx, false); throw; }`. The `WITH CHECK` passes because `row.pariwar_id === newId === app.pariwar_id`. The *authorization* to do this is the GLOBAL `pariwar.provision` gate (AC-1a) at the HTTP boundary — RLS is the data boundary, the permission gate is the action boundary (architecture §2.6 "RLS then authz"). **Do NOT** reach for `runAsCrossTenant` / a BYPASSRLS raw insert for the write — self-scoping exercises RLS faithfully (the §1.2 posture; `scope-tx.ts` sheds superuser via `SET LOCAL ROLE twt_app` so the policy is really enforced in CI). The `servicePool` BYPASSRLS path is correct ONLY for the *read* posture in `requireGlobalPermission` (grants across tenants) and the cross-readable status list (which already needs no scope via the carve-out).

> NOTE the scope-resolution audit emission: `openScopeTx` itself does NOT emit `scope.change` (only `scopeResolutionHook` does, and you are not using it here). The provisioning write should emit its OWN `pariwar.provisioned` event. Good — no spurious `scope.change` for a non-navigational write.

### CRITICAL — global routes have no `request.scopeTx`; the 500 landmine

`requirePermissionHook` (the per-tenant gate) hard-throws 500 on a route with no `/:pariwarId/` param (documented in `modules/audit-log/index.ts` header + deferred-work D4-1.11a). **Do NOT** put `requirePermissionHook` or `scopeResolutionHook` on the provisioning routes. Use the NEW `requireGlobalPermission` (AC-1a) instead. This is the whole reason the primitive exists.

### Deploy pipeline is an ENV-RESOLVED SEAM with a live impl (GitHub Actions → Dokploy API)

`deps.deployTrigger` is the §5.6 seam pattern, but now ships **two** implementations resolved by env via `resolveDeployTriggerFromEnv()` reading `DEPLOY_TRIGGER_MODE=fake|live` (default `'fake'`) — mirror `resolveIntegritySinkFromEnv` in `apps/jobs/src/audit/integrity-observability.ts:L132` which reads `INTEGRITY_OBSERVABILITY_MODE`. The **fake** (structured-log + in-memory status) runs in dev/test; the **live Dokploy-API client** (`DOKPLOY_API_URL` + `DOKPLOY_API_TOKEN` from Secret Manager) runs in staging/prod. Add `DEPLOY_TRIGGER_MODE` to `apps/api/src/config.ts`. Unit-test the live client against a mocked HTTP endpoint (request shape, `Authorization: Bearer <token>` header, error→`DomainError` mapping) — no network in CI.

Deploy model is **GitHub Actions → Dokploy API** (operator-chosen): release-branch push → WIF-keyless build + push to Artifact Registry (`asia-south1`) → `POST` the Dokploy deploy API. The `.github/workflows/ci.yml` jobs are the convention to mirror (pnpm + `actions/setup-node` + `--frozen-lockfile`); add `deploy-staging.yml` + `deploy-prod.yml` (prod = ≥2-principal approval + strictest WIF claim, §5.4).

**Dev-agent / operator split (load-bearing):** the dev agent authors + wires + unit-tests the live client, the workflows, and the WIF + staging/prod Cloud SQL Terraform — all CI-green — but runs **NO live cloud commands** (no `terraform apply`, no live Dokploy `POST`): the credentials are escrow-sealed and absent from the dev environment. The operator (BigDev) runs the documented apply-sequence (staging → smoke → prod). The migration trigger (2nd Pariwar OR ≥70% utilization → Dokploy→Cloud Run/GKE, §5.3) is *evaluated + recorded* in the runbook, not executed here.

### Source-tree variance to record in completion notes (1.13/1.14 discipline)

- `apps/api/src/modules/pariwar-provisioning/` — the architecture tree (L4308) lists this module "empty at v1"; this story fills it. Expected, not a variance.
- `apps/admin/src/modules/pariwar-provisioning/` + a `/provisioning` route — the architecture tree (L4249) lists the admin "pariwar-provisioning/ (2nd-Pariwar wizard, empty at v1)"; this story fills it.
- `requireGlobalPermission` co-located in `modules/rbac/index.ts` — a deliberate sibling to `requirePermissionHook` (record in the ADR).
- `DeployTrigger` seam in `context.ts`/`AppDeps` — same seam pattern as `auditSink`/`turnstile`.

### Testing standards

- **Integration (apps/api):** live test DB `twt-test-pg` (Docker, port 5433) via `fastify.inject` (no supertest). Cover provision→status happy path, the global-permission allow/deny matrix, and cross-tenant write isolation (a Pariwar-A-only admin cannot provision; the self-scoped write only ever writes its own new id). **Live-DB gotchas (project memory):** never regenerate an applied migration (this story adds none); assert *membership* not row counts (own-committing writers accumulate rows across tests); shed superuser in tests so RLS actually runs (`scope-tx.ts` already does `SET LOCAL ROLE twt_app`).
- **Unit (domain/contracts):** the deploy-config reader against a fixture passport; the contracts `.strict()` + OpenAPI determinism.
- **Unit (admin):** `hasPariwarProvision` + the pure `ProvisioningGateView` (mirror `IntegrityGateView` — no router/hooks, so it is unit-testable). Login-wall + forced-pagination guards (Story 1.14) will auto-cover the new API routes — run those suites.
- **Fastify onSend caution (project memory):** if you add any `onSend` header hook, the async-onSend double-send trap (`ERR_HTTP_HEADERS_SENT` on `void reply.status(204).send()`) bites — prefer `onRequest` for body-independent headers, and run the DB-gated suites. (This story likely needs no new onSend.)

### Project Structure Notes

- API module: `apps/api/src/modules/pariwar-provisioning/` (register in `server.ts` after audit-log). Global routes under `/api/v1/provisioning/...` (NOT `/p/:pariwarId/...`), following the `/api/v1/audit/...` global-convention deviation from the `/api/v1/global/` prefix.
- Contracts: `packages/contracts/src/pariwar-provisioning/`, exported via the barrel; consumed as `@twt/contracts/pariwar-provisioning`.
- Admin: `apps/admin/src/modules/pariwar-provisioning/` + `/provisioning` route in `router.tsx` (code-based, DD-1) + nav in `RootLayout.tsx`.
- Infra: `infra/dokploy/` (deploy config), `.github/workflows/deploy-*.yml`, `infra/gcp/` (WIF + staging/prod module reuse).
- Runbooks: reconcile `docs/runbooks/{multi-pariwar-provisioning,deploy,rollback}.md`.
- ADR: `docs/adr/ADR-0011-*.md` (next number; ADR-0010 is the latest).

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-1.15] (L1269–1289) — story statement + 3 BDD blocks; minimal-UI scope + Epic-10 exclusion; `pariwar.provision` at national scope; ~10-min demo beat C1.
- [Source: _bmad-output/planning-artifacts/epics.md] L122 (FR-62 GitHub→Dokploy auto-deploy + K8s migration path), L301–339 (AR-25/28/29/54), L974/L980 (Epic 1 FRs + demoable closure C1).
- [Source: _bmad-output/planning-artifacts/architecture.md#2.5] (L1449–1474) — multi-Pariwar active scope = URL path prefix `/p/<pariwar_id>/`; auth-middleware contract; scope-change audit.
- [Source: _bmad-output/planning-artifacts/architecture.md#2.6] (L1476–1492) — RBAC permission keys + scope dimensions; "RLS then authz".
- [Source: _bmad-output/planning-artifacts/architecture.md#5.3] (L2995–3042) — Dokploy substrate; migration trigger; failure-fallback runbook; IAM isolation (`twt-dokploy-prod`); supply-chain pinning.
- [Source: _bmad-output/planning-artifacts/architecture.md#5.4] (L3044–3098) — CI/CD: GitHub Actions + WIF + Artifact Registry; per-Pariwar build matrix; dev→staging→prod promotion gate.
- [Source: _bmad-output/planning-artifacts/architecture.md#5.10] (L3375–3413) — operations; Solo Builder on-call; Dokploy fallback = runbook, not standby.
- [Source: _bmad-output/planning-artifacts/architecture.md] L4168 (`infra/dokploy/`), L4249 (admin pariwar-provisioning), L4308 (api pariwar-provisioning), L4524 (multi-tenant module map).
- [Source: packages/domain/src/rbac/scope.ts] L11–48 — `national → global` reconciliation; `SCOPE_DIMENSIONS`.
- [Source: packages/domain/src/rbac/check.ts] L150–198 (`hasPermission`, global grant applies cross-Pariwar) + L239–250 (`requirePermission`).
- [Source: packages/domain/src/rbac/permissions.ts] L81–91 — `pariwar.provision` in the seed catalog.
- [Source: packages/domain/src/rbac/roles.ts] L72–77 — super_admin = full catalog at `global` ceiling.
- [Source: apps/api/src/modules/auth/admin/admin-session.handler.ts] — BYPASSRLS global-grants read posture to mirror.
- [Source: apps/api/src/modules/rbac/index.ts] — `requirePermissionHook` (needs scopeTx; the 500 landmine) + `loadActorGrants`.
- [Source: apps/api/src/modules/multi-tenant/scope-tx.ts] — `openScopeTx`/`closeScopeTx` for the self-scoped write.
- [Source: apps/api/src/modules/audit-log/index.ts] — GLOBAL-route convention + "requireAdminSession not requirePermissionHook" rationale.
- [Source: apps/api/src/modules/auth/shared/session-guard.ts] — `requireAdminSession` + `ADMIN_SESSION_GUARD` tag (login-wall guard).
- [Source: apps/api/src/server.ts] — module registration order.
- [Source: packages/domain/src/pariwar-passport/{read,write}.ts] + schema — passport read/write to consume.
- [Source: apps/admin/src/routes/IntegrityRoute.tsx + RootLayout.tsx; apps/admin/src/api/{client,hooks}.ts; router.tsx] — the admin gate + nav + client + Query patterns to mirror.
- [Source: docs/runbooks/multi-pariwar-provisioning.md] — the Story 0.1 runbook to reconcile (§2.2 "no new schema for a new Pariwar"; §3 rollback forbidden-actions).
- [Source: _bmad-output/implementation-artifacts/deferred-work.md] — D4-1.11a (global-scope preHandler), D1-1.13/D2-1.13 (Cloudflare/edge), D3-1.12 (pg-boss CREATE), D4-1.5 (IAM topology), D3-1.2/D4-1.2 (staging/prod Cloud SQL + WIF), W7/W8/W9/W12/W21 (multi-env infra), W-04 (per-Pariwar localization).
- [Source: docs/adr/ADR-0008-rbac-permission-model.md] — `national→global` ratification.

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (Claude Opus 4.8) — bmad-dev-story workflow.

### Debug Log References

- `pnpm turbo run lint typecheck test build` → **64/64 successful** (DB-free `test` task; integration suites skip without `DATABASE_URL`).
- apps/api live-DB suite (`twt-test-pg` Docker :5433) → **15 files / 110 tests passed**.
- `@twt/domain` live-DB suite → **207 passed / 1 skipped** (pre-existing KMS-gated skip — not a regression).
- `pnpm contracts:check-openapi-determinism` → byte-stable (46835 bytes). `pnpm db:check` → "Everything's fine" (NO new migration, AC-8).
- Live-DB landmine hit + fixed: the `$2`-parameter-reuse bug (`VALUES (…, 'pariwar_admin', 'pariwar', $2)` → `$3`) in the new provisioning spec's grant helper — the exact documented `scope-tx.spec.ts` trap [[project_live_db_test_gotchas]].
- **Infra validation pass (post-implementation, on request — terraform 1.15.6 + actionlint 1.7.12 installed via Homebrew):**
  - `actionlint .github/workflows/deploy-{staging,prod}.yml` → **clean (exit 0)**, including the shellcheck pass on the `run:` blocks.
  - `terraform fmt -recursive` (infra/gcp) → reformatted `wif.tf` (alignment); `terraform fmt -check -recursive` → clean.
  - `terraform validate` (infra/gcp, providers via a local `releases.hashicorp.com` mirror because `registry.terraform.io` 502'd) → **"Success! The configuration is valid."**
  - **Real bug surfaced + fixed:** `${environment}` interpolation inside `variable` block `description` strings is rejected by terraform ("Variables may not be used here") — a LATENT defect in the pre-existing Story 1.2 root `variables.tf` too (it was authored-not-applied, so never `validate`d). Reworded all `${environment}` → `<environment>` in `infra/gcp/variables.tf` + `infra/gcp/modules/cloud-sql/variables.tf` (doc-string only; no behavior change). The single-platform `.terraform.lock.hcl` generated during validation was removed so the operator regenerates a proper multi-platform lock on first real init.

### Completion Notes List

Implemented Story 1.15 `[SURFACE]` end-to-end across 8 tasks. Highlights + decisions:

- **AC-1a/AC-1b — `requireGlobalPermission` primitive (closes D4-1.11a).** Authored in `modules/rbac/index.ts` (sibling of `requirePermissionHook`) + `loadGlobalActorGrants` (BYPASSRLS `servicePool`, no scope tx). Retrofitted onto all 3 audit-integrity routes → an admin without global `audit.verify` now gets a real 403 (CR-A-3 endpoint leg + D6-1.11b also discharged). Unit matrix (5) + the updated audit integration suite (14, incl. 3 new AC-1b tests) green.
- **AC-2 — contracts.** `@twt/contracts/pariwar-provisioning` (`AddPariwarRequest` / `ProvisionedPariwar` / `ProvisioningStatusList` / `DeployTriggerResponse` / `DeployStatusView`), reusing the 1.7 `BrandingBundle` + `LocaleDefault`; all `.strict()`; 10-test suite; 5 OpenAPI components + 3 real paths registered, determinism green. `apiFetch` input type relaxed to `unknown` so the branded `PariwarIdSchema` output infers correctly client-side.
- **AC-3/AC-5 — deploy seam.** `DeployTrigger` in `AppDeps`, env-resolved (`DEPLOY_TRIGGER_MODE=fake|live`, validated in `config.ts`): in-memory fake (dev/test/CI) + live Dokploy-API client (Bearer auth, 2xx→triggered, error→502 `BadGatewayError`, fail-closed). Pure `buildDeployConfig` reader emits `/p/<id>/` + branding from the Passport. 8-test unit suite.
- **AC-1 — provisioning API module.** 3 GLOBAL routes gated `[requireAdminSession, requireGlobalPermission('pariwar.provision')]`; the **self-scoped write** (`openScopeTx(newId)` → `upsertPariwarPassport` → commit) so RLS `WITH CHECK` passes; new `pariwar.provisioned` / `pariwar.deploy_triggered` audit types (generic sink mapper — no mapper change); new `passport.listPariwarPassports` domain accessor; registered in `server.ts`. 9-test integration spec (provision→deploy→status proof + allow/deny matrix + cross-tenant isolation).
- **AC-4 — admin UI.** `apps/admin` `/provisioning` page — exactly the 3 controls (Add-Pariwar form, per-row Trigger-build, status view); `hasPariwarProvision` advisory gate mirroring `IntegrityRoute`; nav entry in `RootLayout`. 5 gate + 3 form tests.
- **AC-5 — live pipeline (operator-applied).** `infra/gcp/modules/cloud-sql/` extraction (D3-1.2 test holds — staging/prod via tfvar overrides only); `cloud-sql-{dev,staging,prod}.tf` consume it (`count`-gated per env; `state mv` documented); `wif.tf` (D4-1.2, per-env pool/provider + deployer SA + Artifact Registry + least-privilege IAM, prod strictest); `deploy-{staging,prod}.yml` (WIF-keyless build/push → POST Dokploy; prod = `production` Environment ≥2-reviewer gate); `infra/dokploy/` substantive (compose + per-Pariwar branding-swap recipe). Operator apply-sequence in `infra/gcp/README.md` + `deploy.md`. **No live cloud commands run.** (terraform/actionlint unavailable in the dev env — YAML validated; operator runs `terraform validate`/`plan` + `actionlint` as the first live step.)
- **AC-6 — runbooks.** All three reconciled to AS-BUILT with material-edit changelog rows (≥2-trustee re-sign).
- **AC-7/AC-8 — proof + ADR + gates.** In-story proof = the dev/FAKE integration test; the live on-stage 2nd-Pariwar demo is a TRACKED FOLLOW-ON (deferred-work D1-1.15 + Decision 2026-06-15-050, owner BigDev), NOT a merge gate. ADR-0011 drafted + adr-index updated. NO new migration. All green gates pass.

**Source-tree variances (recorded per the 1.13/1.14 discipline):** `requireGlobalPermission` co-located in `modules/rbac/`; `DeployTrigger` seam in `context.ts`; the `pariwar-provisioning/` modules (api + admin) fill the architecture-tree "empty at v1" slots; `infra/gcp/modules/cloud-sql/` is the D3-1.2 extraction; provisioning contracts consumed from the `@twt/contracts` root barrel (no subpath exports map — the pariwar-passport precedent). `createdBy` omitted from the provisioning write (per the story's exact field list — system-null; actor attribution lives in the `pariwar.provisioned` audit event).

### Completion Notes List — closure language ([[feedback_closure_language_precision]])

**Closed by [edit]:** D4-1.11a, CR-A-3 (endpoint leg), D6-1.11b. **Wired in 1.15 (live apply = operator leg):** D3-1.2, D4-1.2, D3-1.12, W7, W8, W9, W12. **Advanced (gated remainder recorded):** D4-1.5, D2-1.13. **Stays GATED:** D1-1.13 (DPDPA). **Newly opened deferrals:** D1-1.15 (tracked on-stage demo), D2-1.15 (image signing), D3-1.15 (multi-env KMS module).

### File List

**New — apps/api:**
- `apps/api/src/modules/pariwar-provisioning/index.ts`
- `apps/api/src/modules/pariwar-provisioning/deploy-trigger.ts`
- `apps/api/src/modules/pariwar-provisioning/deploy-config.ts`
- `apps/api/tests/integration/pariwar-provisioning.spec.ts`
- `apps/api/tests/unit/require-global-permission.test.ts`
- `apps/api/tests/unit/deploy-trigger.test.ts`

**Modified — apps/api:**
- `apps/api/src/modules/rbac/index.ts` (requireGlobalPermission + loadGlobalActorGrants)
- `apps/api/src/modules/audit-log/index.ts` (AC-1b retrofit + header)
- `apps/api/src/audit/audit-sink.ts` (2 new event types)
- `apps/api/src/context.ts` (DeployTrigger in AppDeps)
- `apps/api/src/config.ts` (DEPLOY_TRIGGER_MODE)
- `apps/api/src/deps.ts` (wire deployTrigger)
- `apps/api/src/http-errors.ts` (BadGatewayError 502)
- `apps/api/src/server.ts` (register provisioning module)
- `apps/api/tests/integration/_setup.ts` (deployTrigger test wiring)
- `apps/api/tests/integration/audit-integrity-ui.spec.ts` (AC-1b grants + matrix)

**New — packages/contracts:**
- `packages/contracts/src/pariwar-provisioning/{add-pariwar,status,index}.ts`
- `packages/contracts/tests/pariwar-provisioning.test.ts`

**Modified — packages:**
- `packages/contracts/src/index.ts` (barrel)
- `packages/contracts/scripts/emit-openapi.ts` (components + paths)
- `packages/domain/src/pariwar-passport/read.ts` (listPariwarPassports)
- `openapi/v1.yaml` (re-emitted)

**New — apps/admin:**
- `apps/admin/src/modules/pariwar-provisioning/{AddPariwarForm,ProvisioningStatusTable,ProvisioningPage}.tsx`
- `apps/admin/src/routes/ProvisioningRoute.tsx`
- `apps/admin/tests/{provisioning-gate,add-pariwar-form}.test.tsx`

**Modified — apps/admin:**
- `apps/admin/src/api/client.ts`, `apps/admin/src/api/hooks.ts`
- `apps/admin/src/router.tsx`, `apps/admin/src/routes/RootLayout.tsx`

**New — infra:**
- `infra/gcp/modules/cloud-sql/{versions,variables,main,outputs}.tf`
- `infra/gcp/cloud-sql-staging.tf`, `infra/gcp/cloud-sql-prod.tf`, `infra/gcp/wif.tf`
- `infra/dokploy/compose.yaml`, `infra/dokploy/per-pariwar-profile.md`
- `.github/workflows/deploy-staging.yml`, `.github/workflows/deploy-prod.yml`

**Modified — infra:**
- `infra/gcp/cloud-sql-dev.tf` (→ module), `infra/gcp/outputs.tf`, `infra/gcp/locals.tf`, `infra/gcp/variables.tf`, `infra/gcp/README.md`, `infra/gcp/.terraform-plan-expectations.md`
- `infra/dokploy/README.md`

**New — docs:**
- `docs/adr/ADR-0011-dokploy-auto-deploy-multi-pariwar-provisioning.md`

**Modified — docs + ledgers:**
- `docs/knowledge-transfer/adr-index.md`
- `docs/runbooks/{multi-pariwar-provisioning,deploy,rollback}.md`
- `_bmad-output/implementation-artifacts/deferred-work.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `.decision-log.md`
- `_bmad-output/implementation-artifacts/1-15-dokploy-auto-deploy-pipeline-multi-pariwar-provisioning.md` (this story file)

### Change Log

| Date | Change |
|---|---|
| 2026-06-15 | Story 1.15 implemented (Tasks 1–8): `requireGlobalPermission` primitive + audit retrofit (closes D4-1.11a); provisioning contracts; env-resolved `DeployTrigger` (fake + live Dokploy-API client); provisioning API module (self-scoped write) + admin UI; live deploy pipeline wired (Cloud SQL module extraction + WIF + Dokploy + `deploy-{staging,prod}.yml`, operator-applied); 3 runbooks reconciled (material edit); ADR-0011 drafted; deferred-work reconciled; live on-stage demo recorded as tracked follow-on. Green gates: turbo 64/64 + apps/api live-DB 110/110 + domain 207/1-skip + OpenAPI determinism + db:check. NO new migration. Status → review. |
