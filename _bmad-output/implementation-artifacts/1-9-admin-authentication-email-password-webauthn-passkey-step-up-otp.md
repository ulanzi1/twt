# Story 1.9: Admin Authentication — Email/Password + WebAuthn Passkey + Step-Up OTP `[SURFACE]`

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Pariwar admin,
I want to log into the admin surface with email + password + a WebAuthn passkey, with a fresh step-up OTP gating my high-stakes actions,
so that admin access is phishing-resistant and privileged operations carry a second factor that a stolen session cannot satisfy.

## Context — what this story actually is

This is the **`apps/api` Fastify framework-landing story**, wearing an admin-auth hat. Stories 1.1–1.8 built domain + contracts substrate and deliberately stopped at the HTTP boundary because **no framework was chosen to couple to** (Story 1.8 Dev Note "apps/api is not ready"; `apps/api/src/index.ts` is a 4-line `export {}` placeholder). Story 1.9 stands up Fastify and proves it end-to-end by shipping the first real surface: admin authentication. It therefore **discharges a cluster of deferred items that all re-trigger on "apps/api framework landing"** — see Dev Note "Deferred items this story discharges." Treat the framework substrate as a first-class deliverable, not incidental scaffolding: every later epic's routes inherit it.

Scope it with discipline. The auth **API surface** (on `apps/api`) is the committed deliverable and must work end-to-end (integration-tested). The admin **web UI** (`apps/admin`) is **out of scope** — `apps/admin` is a bare TS skeleton, it has no React/Vite/Tamagui yet, and the design-system foundation (tokens/typography) does not land until **Story 1.17**. Building styled admin chrome now would reinvent ahead of the design system. See Dev Note "UI scope decision" + the closing question.

## Acceptance Criteria

> **AC source map.** AC-1…AC-4 reconcile the epic's two BDD blocks (epics.md L1141–1152) against architecture §2.3 (admin auth), §2.4 (session model), §2.2 (step-up OTP set + TTLs). Where the epic's wording conflicts with architecture, the divergence is called out **inline** and in Dev Notes "Reconciliations you MUST surface" — do **not** silently follow the epic's looser wording (same discipline as Story 1.8's scope-enum reconciliation). AC-5…AC-10 are the framework-substrate + closeout ACs required for the surface to leave the system working end-to-end (per the workflow's "a story must leave the system working" rule), each justified inline.

**AC-1 — First factor: email + Argon2id (peppered) password.**
**Given** AR-22 + architecture §2.3
**When** the admin login first factor is implemented
**Then** passwords are hashed with **Argon2id** via **`@node-rs/argon2`** (native; avoid the pure-JS `argon2`), peppered using Argon2's keyed mode (the `secret` parameter), the pepper sourced from Secret Manager via the existing `packages/domain/src/secrets.ts` resolution pattern (never an env-literal in prod)
**And** Argon2id parameters (memoryCost, timeCost, parallelism) meet the OWASP-2026 baseline (≈ m=64 MiB, t=3, p=1) and are **recorded in the ADR with a review cadence** (§2.3 "Password-hash parameters")
**And** the admin **email is Tier-1 PII** (§2.7) — store it as Tier-1 ciphertext (`encryptTier1`/`decryptTier1`) **plus** a Tier-2 **blind index** (`blindIndex`) for the equality login lookup; **never store admin email in plaintext** and never look up by a plaintext column (see Dev Note "Admin email is Tier-1 PII")
**And** lockout fires after N failed password attempts (N + escalation policy in the ADR); a normal lockout escalates to helpdesk, and a hostile-trustee-class lock (§2.1) requires **trustee-quorum unlock**, not single-admin self-unlock.

**AC-2 — Second factor: WebAuthn passkey (SimpleWebAuthn).**
**Given** AR-22 + architecture §2.3
**When** the WebAuthn second factor is implemented
**Then** registration + authentication use **`@simplewebauthn/server` (v13.x)** with the **v13 `WebAuthnCredential` type** (post-v11: `id`/`publicKey`/`counter`; types imported from `@simplewebauthn/server`, **not** the removed `/types` subpath — see Dev Note "SimpleWebAuthn v13 API")
**And** each admin may register **at most 2 passkey devices** (this is the correct home for the epic's "max 2 trusted devices per admin", epics.md L1146 — see Reconciliation R1); registering a 3rd is rejected (or drops-oldest only with an explicit step-up) and is audited
**And** the **enrollment ceremony** requires either (a) an existing active 2nd factor (a registered passkey **or** an unused recovery code) **or** (b) a single-use out-of-band signed email link with short TTL — **password-only access does NOT grant passkey-enrollment authority** (§2.3 "WebAuthn enrollment ceremony")
**And** **10 one-time-use backup recovery codes** are provisioned at first enrollment, stored hashed (never plaintext), each consumption audited and the code burned (§2.3).

**AC-3 — Admin session model: server-side `@fastify/session` + Postgres store.**
**Given** architecture §2.4 (admin web row) + §2.4 "Session lifecycle correctness"
**When** the admin session is implemented
**Then** the admin session uses **`@fastify/session` + `@fastify/cookie`** with a **Postgres-backed session store**, an **HttpOnly + Secure + SameSite=Lax** cookie, **idle timeout 12h / absolute timeout 7 days**, and **server-side revocation by deleting the session row** — this supersedes the epic AC's JWT/refresh-token wording (**Reconciliation R1** — see Dev Notes for the full session-model reconciliation)
**And** the **session ID rotates** on every auth-state change: login, role change, password reset, WebAuthn re-enrollment (defeats fixation)
**And** state-changing admin requests carry **CSRF protection** via the double-submit-cookie pattern + an origin/referer check (SameSite=Lax is a baseline, not the only line)
**And** suspending an admin (FR-56, future) is designed to cascade-delete that admin's sessions — leave the revocation seam, do not build the suspension flow here.

**AC-4 — Step-up OTP: mechanism + gating middleware (delivery is Epic 5).**
**Given** architecture §2.2 (step-up set + TTL) + the epic's step-up block (epics.md L1148–1152) + epics.md L2235–2248 ("Story 1.9 admin auth … owns the gating decision")
**When** step-up is implemented
**Then** a route is marked step-up-gated by a **middleware annotation** the consuming handler declares; an annotated action with no fresh step-up in the current window returns a structured "step-up required" response
**And** the OTP mechanism generates a single-use code, stores **only its hash**, enforces **TTL 3 minutes**, invalidates on next-OTP-request, and is **rate-limited per actor + per IP** (separate cost vs abuse budgets, §2.2 "Discipline")
**And** on success the **elevated context expires after ~5 minutes**; on failure the attempt is audited
**And** **delivery is behind a port interface** (`StepUpOtpDeliveryPort`) with a **dev/log stub** in Epic 1 — the real **SMS-DLT delivery via the channel dispatcher is Story 5.6/5.9 (Epic 5)** and does not exist yet; **do not attempt real SMS** (Reconciliation R3). The middleware **owns the gating decision**; the channel owns transport
**And** the step-up mechanism emits an audit line **per send AND per consume**, tagged with the operation identifier (`otp_hash`, never plaintext; `actor_id`, `action_context`, `sent_at`) — via the audit seam (AC-9), sink deferred to Story 1.10.

**AC-5 — Fastify framework landing (`apps/api`).**
**Given** architecture §3 canonical source tree (L4253–4295) + §1.2 (session-variable middleware) + §1.3 (Zod validator-per-route)
**When** the framework is stood up
**Then** `apps/api/src/server.ts` boots Fastify with: **request-context** middleware (AsyncLocalStorage hydration of `{ pariwarId?, actorId?, traceId }` at request entry, §"AsyncLocalStorage" L3891), **error-mapping** middleware (`DomainError` → typed 4xx in the `ErrorResponse` envelope from `@twt/contracts/_common/errors`; uncaught → 500, no internal leak), the **`@fastify/rate-limit`** plugin, and the **`fastify-type-provider-zod` + `fastify-zod-openapi` + `@fastify/swagger`** stack (§3.1 L1794–1796) so routes validate via Zod and emit OpenAPI (discharges D3-1.4)
**And** the layout follows the committed tree exactly: `src/server.ts`, `src/plugins/{zod-openapi,swagger,session,cookie,rate-limit}/`, `src/middleware/{request-context,scope-resolution,audit-context,error-mapping}/`, `src/modules/auth/{admin,shared}/`, `src/modules/rbac/`, `src/modules/multi-tenant/` — do **not** invent a different structure (architecture §3 L4253–4295)
**And** each module follows the 5-file shape where it crosses the complexity threshold (`*.handlers.ts`/`*.service.ts`/`*.repo.ts`/`*.types.ts`/`*.test.ts`, §"File organization within a module" L3740); RBAC + multi-tenant isolation are named uncompromisable subsystems → 5-file shape mandatory there.

**AC-6 — Scope-resolution middleware + RBAC HTTP adapter (discharge the 1.6/1.8 deferrals).**
**Given** architecture §2.5 (URL path scope) + §1.2 (fail-closed scope) + Story 1.8 framework-agnostic `requirePermission` + deferred D4-1.6, D3-1.8, W9-CR1.6
**When** the multi-tenant + RBAC HTTP layer is wired
**Then** **scope-resolution middleware** (`src/middleware/scope-resolution/`) extracts `pariwar_id` from the `/api/v1/p/:pariwarId/...` path, **re-parses it as a strict UUID at the boundary** (independent of auth output, §1.2 "Session-variable re-parse"), verifies the authenticated admin has a `role_grants` membership in that `pariwar_id`, **opens a request transaction and calls `setPariwarScope` inside it** (`db.ts` warns: `SET LOCAL` outside a tx leaks scope to the next pooled request — this middleware is the named owner of that invariant), and 404s when the Pariwar doesn't exist or the admin has no membership
**And** the first DB query path calls **`assertPariwarScopeSet`** (the loud fail-closed complement, `db.ts`) so a missing-scope bug surfaces as an explicit error, not silent empty rows
**And** the **RBAC HTTP adapter** (`src/modules/rbac/`) mounts Story 1.8's framework-agnostic **`requirePermission(key, scope, resourceLocator)`** as a Fastify pre-handler, loading the actor's grants from `role_grants` scoped by the active `pariwar_id`, yielding the structured **403** (`AuthorizationDeniedError` → `ErrorResponse`) on deny (this is the second guard, **after** RLS — §2.6)
**And** the **`W9-CR1.6`** runtime guard decision is taken here: validate (or explicitly defer with rationale) the `setPariwarScope` transaction-active check now that the production call site exists.

**AC-7 — Admin identity table + auth schema + retro FKs (discharge D4-1.7 / D4-1.8).**
**Given** architecture §3.13 (`identity_type` extensible identity model) + the dangling no-FK `uuid`s in `role_grants` + `pariwar_passport`
**When** the identity + auth tables land (migration `0005`)
**Then** a **global identity table** lands (recommended `users`, PK `uuid`, with an extensible **`identity_type`** enum/text seeded `admin` for v1 — member/partner/nominee extend it later, §3.13) — it is **keyed to the human, not to a Pariwar**, because a person can admin multiple Pariwars (the `role_grants (user_id, pariwar_id, role)` join carries the tenancy). **`pariwar_passport` is NOT this table** — it is the *Pariwar's* org-identity document (1:1 with a Pariwar); do not conflate or extend it
**And** the auth tables land: password credentials (email Tier-1 ciphertext + blind index + Argon2id hash), `webauthn_credentials` (the v13 `WebAuthnCredential` fields + `counter`), `recovery_codes` (hashed, one-time), the admin **session store** table, and `step_up_otps` (hash + TTL + `action_context` + informational `pariwar_id`) — see Dev Note "Recommended schema"
**And** these identity/auth tables are **global, NOT pariwar-RLS-scoped** — login happens **before** any `app.pariwar_id` is set, so copying the `role_grants` scoped-RLS construct onto them would make login return 0 rows. Model them as a **carve-out family** alongside `pariwar-passport-rls.ts` (intentionally not pariwar-keyed; access via a narrow auth repo + explicit grants), with the posture **recorded in the ADR and surfaced for architecture confirmation** (Reconciliation R2 — this is load-bearing; do not silently scope them)
**And** the retroactive FKs are added now that `users` exists: **`role_grants.user_id` → `users.id`** (D4-1.8) and **`pariwar_passport.created_by` → `users.id`** (D4-1.7) — both previously unconstrained `uuid` precisely "until Story 1.9+".

**AC-8 — Transport contracts + OpenAPI + (optionally) api-client.**
**Given** architecture §1.3 (hand-written Zod contracts) + §3.1 + deferred D2-1.4, D3-1.4, D14-1.4
**When** the auth contracts land
**Then** `.strict()` Zod request/response contracts for the admin-auth + step-up routes land in **`packages/contracts/src/auth/`** (login, passkey register-options/verify, passkey auth-options/verify, step-up request/verify, recovery-code consume), reusing `_common/primitives.ts` + `_common/errors.ts`; every object ends `.strict()`; `z.input`/`z.output` naming
**And** these become the **first real `paths` in OpenAPI** (Stories 1.4/1.7/1.8 registered components-only) — register them and re-emit; `contracts:check-openapi-determinism` stays byte-stable; decide build-time-script vs runtime-extraction emission (D14-1.4) and record the choice
**And** the **`packages/api-client/` first generator invocation** (D2-1.4: `@hey-api/openapi-ts` config + auth-tag client + `linguist-generated` marker) is **recommended to land here** (first real routes are its trigger) but may be a fast-follow — **record the land/defer decision** either way; never hand-write the client.

**AC-9 — Audit seam + Turnstile seam (sinks are later stories).**
**Given** Story 1.8's `onAuthorizationDenied` seam precedent + epics.md L1152/L1244 + deferred audit-sink (1.10) + Turnstile (1.13)
**When** the seams are wired
**Then** every privileged auth event — login success/failure, lockout, passkey enroll/auth, recovery-code consume, password-reset request/consume, step-up send/consume/fail, scope change (§2.5 "Scope-change audit emission") — is emitted to an **injectable audit seam** (default: structured log; **the FR-47 tamper-evident hash-chain sink is Story 1.10**, not built here — Reconciliation R4)
**And** the auth entry points expose a **Turnstile verification seam** (no-op default) so **Story 1.13** can wire Cloudflare Turnstile without touching auth code (epics.md L1244) — do not build the Cloudflare/edge integration here.

**AC-10 — Gate green + provenance.**
**Then** `pnpm turbo run lint typecheck test build` is green; `db:migrate` applies `0005` clean and `db:check` is byte-stable; the new RLS/carve-out policies have positive + negative regression tests and the identity/auth tables are added to the cross-pariwar leak suite **as carve-out (cross-readable-by-design) or global tables — not as scoped-must-return-0 tables** (contrast `role_grants`; same care as Story 1.8's classification call)
**And** **ADR-0009** drafted (admin-auth: session-model reconciliation; Argon2id params + pepper; SimpleWebAuthn v13 + enrollment ceremony; identity-table RLS posture; step-up delivery-port seam), `.decision-log.md` entry added, **deferred-work dispositions** recorded per [[feedback_closure_language_precision]] (close D3-1.8/D4-1.6/D4-1.7/D4-1.8/D3-1.4/D2-1.4 legs; open new D-items for SMS delivery→5.6, audit sink→1.10, Turnstile→1.13, admin UI→post-1.17), README landing-lines flipped, `docs/knowledge-transfer/adr-index.md` row added, and `sprint-status.yaml` `1-9-…` → `review`.

## Tasks / Subtasks

- [x] **Task 0 — Verify baseline + read the files you extend** (AC: all)
  - [x] 0.1 At HEAD, `pnpm install --frozen-lockfile` then `pnpm turbo run lint typecheck test build` — confirm green (Story 1.8 baseline; note any anomaly in Completion Notes).
  - [x] 0.2 Bring up local Postgres (Docker `postgres:16-alpine`, host port **5433** per Story 1.6/1.7/1.8 Debug Log), set `DATABASE_URL`, run the integration suites — confirm the live-DB substrate is green through migration `0004` before adding `0005`.
  - [x] 0.3 Read end-to-end before writing (extend, do not reinvent): **`apps/api` first** — `apps/api/vitest.config.ts` (currently only picks up `.test.ts`; you will update it in Task 8), `apps/api/tests/smoke.test.ts`, `apps/api/tsconfig.json`, `apps/api/.env.example` (you will add new vars in Task 1.5), `apps/api/package.json` (build-tooling-only today). Then domain + contracts: `packages/domain/src/ids/index.ts` (branded-ID + smart-constructor + typed-error); `packages/domain/src/errors.ts` (`AuthorizationDeniedError` + `ErrorResponseShape` + `toErrorResponse` already exist — reuse); `packages/domain/src/index.ts` (namespace re-export); `packages/domain/src/db.ts` (`createDb`, `setPariwarScope` ⚠ tx-only, `assertPariwarScopeSet`, `withPariwarScope`, `UUID_REGEX`); `packages/domain/src/policies/_roles.ts` (`appRole`/`serviceRole`) + `pariwar-passport-rls.ts` (the **carve-out** RLS precedent for your global identity tables) + `role-grants-rls.ts` (the **scoped** precedent — what NOT to copy onto identity tables); `packages/domain/src/schema/{pariwar_passport,role_grants,events_log}.ts` (column/enum/no-FK idiom); `packages/domain/src/rbac/{check,scope,roles}.ts` (`requirePermission`/`hasPermission`/`onAuthorizationDenied` seam you will mount); `packages/domain/src/encryption/index.ts` (`encryptTier1`/`decryptTier1`/`blindIndex`/`withEncryptionContext`/`encryptionContextStorage` — admin email path); `packages/domain/src/secrets.ts` (Secret-Manager-vs-env resolution — model the pepper resolution on it); `packages/contracts/src/_common/{primitives,errors}.ts` + `scripts/emit-openapi.ts`; `packages/domain/migrations/0002`+`0003`+`0004` (ENABLE/FORCE/GRANT hand-supplement template) + `meta/_journal.json` (idx 4 → next **0005**); `packages/domain/src/test-utils/integration-setup.ts` + `tests/integration/_helpers.ts` + `multi-tenant/cross-pariwar-leak.spec.ts`.

- [x] **Task 1 — Fastify framework landing on `apps/api`** (AC-5)
  - [x] 1.1 Add the runtime deps to `apps/api/package.json` (currently build-tooling only): `fastify`, `@fastify/cookie`, `@fastify/session`, `@fastify/rate-limit`, `@fastify/swagger`, `@fastify/csrf-protection`, `fastify-type-provider-zod`, `fastify-zod-openapi`, `@simplewebauthn/server`, `@node-rs/argon2`, `@twt/domain` + `@twt/contracts` (`workspace:*`), `pg`. **Use Fastify 5.x** (see Dev Note "Dependency versions") — `fastify-type-provider-zod` and `fastify-zod-openapi` have Fastify-4 and Fastify-5 major versions that are not interchangeable; pin the Fastify-5 compatible versions. Honor the §1.3 drizzle-zod ↔ fastify-type-provider-zod incompatibility note (contracts are hand-written, never drizzle-zod-generated). Record the Fastify major version selection in ADR-0009.
  - [x] 1.2 `src/server.ts`: Fastify factory (exported for tests; bound to a per-workspace `createDb` pool, §1.1 pool-isolation), register the Zod type provider + plugins (`plugins/{zod-openapi,swagger,session,cookie,rate-limit,csrf-protection}/`). CSRF: register `@fastify/csrf-protection` with `sessionPlugin: '@fastify/session'` (double-submit-cookie mode); add an `origin`/`referer` pre-handler check (SameSite=Lax baseline + active CSRF token check on state-changing routes). See Dev Note "CSRF implementation".
  - [x] 1.3 `src/middleware/request-context/`: AsyncLocalStorage hydration of `{ traceId, actorId?, pariwarId? }` at request entry; also populate `encryptionContextStorage` (discharges D14-1.5(b)) so Tier-1 encrypt/decrypt has its context inside handlers.
  - [x] 1.4 `src/middleware/error-mapping/`: `DomainError` subclasses → typed 4xx in the `ErrorResponse` envelope; uncaught → 500 with a generated `requestId`, no internal detail leaked. Reuse `toErrorResponse(requestId)` from `domain/errors.ts`.
  - [x] 1.5 Health/readiness route + a Fastify smoke/integration test that boots the app in-process (`fastify.inject` — not supertest; Fastify's native injection is lighter and doesn't need an HTTP port) — replace the placeholder `export {}` in `src/index.ts` with the real entry (or keep `index.ts` as a thin re-export of `server.ts` + a `main()` boot guard). **Update `apps/api/.env.example`** with the new required env vars (without these the app crashes on startup): `SESSION_SECRET` (≥32 chars random string for local dev), `WEBAUTHN_RP_ID` (e.g. `localhost`), `WEBAUTHN_EXPECTED_ORIGIN` (e.g. `http://localhost:3001`), `ARGON2_PEPPER_SECRET_NAME` (Secret Manager secret name, e.g. `twt-dev-argon2-pepper`). For local dev the pepper value itself goes in Secret Manager (or uses the `DATABASE_URL`-style env fallback if you add one — pattern from `secrets.ts`).

- [x] **Task 2 — Identity + auth schema + migration 0005** (AC-7)
  - [x] 2.1 Author `packages/domain/src/schema/users.ts` (global identity; `id uuid pk`, `identity_type` enum seeded `admin`, `status`, `created_at`, audit columns). Branded `UserId` added to `ids/index.ts` (branding mandatory on first PR for a new ID, §Naming L3706).
  - [x] 2.2 Author the auth tables (recommended split — see Dev Note "Recommended schema"): `admin_credentials` (`user_id`, `email_ciphertext` Tier-1, `email_blind_index` unique, `password_hash`, lockout counters), `webauthn_credentials` (`user_id`, `credential_id`, `public_key`, `counter`, `transports`, `device_label`, `created_at`; ≤2 per user enforced in service + a partial constraint), `recovery_codes` (`user_id`, `code_hash`, `consumed_at`), `admin_sessions` (session-store shape compatible with the chosen store), `step_up_otps` (`user_id`, `otp_hash`, `action_context`, `pariwar_id` informational, `expires_at`, `consumed_at`, attempt counters).
  - [x] 2.3 RLS posture (AC-7, Reconciliation R2): these are **global identity tables** — author `policies/identity-auth-rls.ts` as a **carve-out family** (model on `pariwar-passport-rls.ts`, NOT `role-grants-rls.ts`); intentionally not pariwar-keyed; document WHY in the file header (auth precedes scope). Record the posture in ADR-0009 and **surface for architecture confirmation** (closing question). Do **not** apply the `app.pariwar_id` scoped construct.
  - [x] 2.4 Migration `0005_admin-identity-auth.sql`: `db:generate --name admin-identity-auth`, hand-supplement ENABLE/FORCE RLS + GRANTs per the 0002/0003 template, **add the retro FKs** `role_grants.user_id → users.id` (D4-1.8) and `pariwar_passport.created_by → users.id` (D4-1.7) as `ALTER TABLE` after the `CREATE TABLE users`, bump `meta/_journal.json` idx → **5** (trailing newline), `db:migrate`, confirm `db:check` clean. Verify `relrowsecurity`/grants via psql (the Story 1.8 Debug-Log discipline).

- [x] **Task 3 — Scope-resolution middleware + RBAC HTTP adapter** (AC-6)
  - [x] 3.1 `src/middleware/scope-resolution/`: extract `:pariwarId` from `/api/v1/p/:pariwarId/...`, strict-UUID re-parse, verify `role_grants` membership, open a tx + `setPariwarScope` inside it, 404 on miss. First query path calls `assertPariwarScopeSet`.
  - [x] 3.2 `src/modules/multi-tenant/`: the request-lifecycle integration that owns the scope tx and exposes the tx-bound `Db` to handlers.
  - [x] 3.3 `src/modules/rbac/`: Fastify pre-handler adapter mounting `requirePermission`; loads grants from `role_grants` (scoped); deny → 403 `ErrorResponse`; wire the `onAuthorizationDenied` seam to the audit seam (Task 6).
  - [x] 3.4 Take the **W9-CR1.6** decision (runtime `SET LOCAL` tx-active guard): **recommended to implement now** — the call site exists in scope-resolution middleware, `db.ts` already documents the invariant ("⚠ MUST be called INSIDE an active transaction"), and the guard is cheap (an in-context flag set when `setPariwarScope` runs, checked before any scoped query). Implementing now closes D4-1.6 cleanly and prevents the bug permanently. If implementation proves non-trivial, defer with explicit rationale in Completion Notes + deferred-work.

- [x] **Task 4 — Admin auth module (password + WebAuthn + recovery + reset + lockout)** (AC-1, AC-2, AC-8)
  - [x] 4.1 `src/modules/auth/admin/` (5-file shape): password verify (Argon2id `@node-rs/argon2`, pepper via `secret` param from Secret Manager); email lookup via **blind index** (never plaintext); login issues the `@fastify/session` cookie; session-ID rotation on auth-state change.
  - [x] 4.2 WebAuthn register: `generateRegistrationOptions`/`verifyRegistrationResponse` (v13); enforce the **enrollment ceremony** gate (existing 2nd factor OR signed email link) + the ≤2-device cap; persist the v13 `WebAuthnCredential` (`id`/`publicKey`/`counter`).
  - [x] 4.3 WebAuthn authenticate: `generateAuthenticationOptions`/`verifyAuthenticationResponse`; bump stored `counter`; RP ID / expected-origin from config (per-environment), never trust client-supplied origin.
  - [x] 4.4 Recovery codes: provision 10 at first enrollment (hashed), consume-and-burn path, audit per use.
  - [x] 4.5 Password reset: signed email-link (short TTL, single-use), **WebAuthn re-enrollment required after reset**, reset emits an audit line, session-ID rotates.
  - [x] 4.6 Lockout: N-fail counter + helpdesk escalation; trustee-quorum unlock seam for hostile-trustee class (do not build the quorum flow — seam it).
  - [x] 4.7 `src/modules/auth/shared/`: cross-flow primitives (signed-link signing/verify, the email-Tier-1 helpers wiring, audit-emit helper).

- [x] **Task 5 — Step-up OTP mechanism + gating middleware** (AC-4)
  - [x] 5.1 OTP mechanism (`auth/shared/` or a `step-up/` sub-module): generate → store hash only → TTL 3 min → single-use → invalidate-on-next → per-actor/per-IP rate limits.
  - [x] 5.2 `StepUpOtpDeliveryPort` interface + a **dev/log stub** implementation; document that Story 5.6/5.9 supplies the SMS-DLT adapter. Do NOT add SMS provider deps.
  - [x] 5.3 Gating middleware: a per-route annotation marking an action step-up-gated; checks for a fresh elevated context; missing → structured "step-up required"; success → elevated window ~5 min; failure audited.
  - [x] 5.4 Audit per send + per consume (`otp_hash`, `actor_id`, `action_context`, `sent_at`) via the audit seam.

- [x] **Task 6 — Audit seam + Turnstile seam** (AC-9)
  - [x] 6.1 Define an injectable `AuthAuditSink` (default: structured log) that all privileged auth events call; wire the RBAC `onAuthorizationDenied` into it. **Do not** build the FR-47 hash chain (Story 1.10) — leave the seam abstract; record the wiring point as a D-item → 1.10.
  - [x] 6.2 Scope-change audit emission (§2.5): emit actor + prev-scope + new-scope on active-`pariwar_id` change.
  - [x] 6.3 Turnstile verification seam (no-op default) at the login + passkey-auth entry points; D-item → 1.13.

- [x] **Task 7 — Transport contracts + OpenAPI + api-client** (AC-8)
  - [x] 7.1 `packages/contracts/src/auth/*.ts` `.strict()` Zod for every route (login, passkey register/auth options+verify, step-up request/verify, recovery consume, password-reset request/consume); reuse `PariwarIdSchema`/`UserIdSchema` + `ErrorResponse`. Re-export from `contracts/src/index.ts`; add the `@twt/contracts/auth` subpath if needed.
  - [x] 7.2 Register the auth routes' Zod schemas as the **first OpenAPI `paths`** (not just components); re-emit; confirm `check-openapi-determinism` byte-stable. Record the build-time-vs-runtime emission decision (D14-1.4).
  - [x] 7.3 `packages/api-client/` first generator invocation (D2-1.4) — recommended here; `@hey-api/openapi-ts` config + auth-tag client + `.gitattributes linguist-generated=true` + CODEOWNERS bot-ownership of `dist/*`. If deferred to a fast-follow, state it explicitly in Completion Notes + deferred-work.

- [x] **Task 8 — Tests** (AC-1…AC-9)
  - [x] 8.0 **Test infrastructure setup — do this first, before writing any test.** (a) Update `apps/api/vitest.config.ts`: add `tests/integration/**/*.spec.ts` to the `include` array and add `pool: 'forks'` (the current config only picks up `tests/**/*.test.ts` with no forks pool — integration specs are silently never run without this change). (b) Create `apps/api/tests/integration/_setup.ts`: export a `createTestApp(opts?)` factory that calls `server.ts`'s Fastify factory with a test `createDb` pool (uses `DATABASE_URL` from env, guarded by `hasDatabase = !!process.env['DATABASE_URL']`), a `teardown(app)` function that closes the app + pool, and re-export `setupLiveDb` from `packages/domain` for the DB-isolation BEGIN/ROLLBACK pattern. Integration specs import `{ createTestApp, teardown, hasDatabase }` from this file and guard with `describe.skipIf(!hasDatabase)(...)`. All HTTP assertions use `app.inject({ ... })` — not supertest.
  - [x] 8.1 Unit (domain + apps/api): Argon2id verify (pepper applied), blind-index email lookup (plaintext never queried), WebAuthn options/verify happy + tamper paths (counter regression rejected), ≤2-device cap, enrollment-ceremony gate (password-only denied), recovery-code burn, lockout counter, step-up TTL/single-use/elevated-window expiry, session-ID rotation, error-mapping `DomainError`→4xx.
  - [x] 8.2 Integration (`DATABASE_URL`-gated, `fastify.inject`, `setupLiveDb`, `SET LOCAL ROLE twt_app` where RLS matters): full login → passkey → step-up flow; scope-resolution 404 on non-member; `assertPariwarScopeSet` loud-fail; RBAC 403 on under-privileged actor; migration `0005` retro-FK integrity (orphan `role_grants.user_id` insert now rejected).
  - [x] 8.3 RLS/leak suite: add `users`/auth tables to `cross-pariwar-leak.spec.ts` **as global/carve-out (cross-readable-by-design or non-tenant) tables — NOT scoped-must-return-0** (Reconciliation R2); positive+negative policy assertions for the identity-auth carve-out.
  - [x] 8.4 Contracts: `.strict()` + unknown-key rejection per auth object; OpenAPI determinism re-run with the new paths.

- [x] **Task 9 — Docs + closeout** (AC-10)
  - [x] 9.1 Draft `docs/adr/ADR-0009-admin-authentication.md` (R1 session-model reconciliation + the epic-AC patch note; Argon2id params/pepper + review cadence; SimpleWebAuthn v13 + enrollment ceremony + ≤2 devices + recovery codes; identity-table RLS posture R2; step-up delivery-port seam R3; audit/Turnstile seams; api-client land/defer). Add the `docs/knowledge-transfer/adr-index.md` row (ADR-0009) + bump the header count.
  - [x] 9.2 `.decision-log.md`: Story 1.9 author-commit decision (next id after `2026-06-11-044`). Surface the R1 epic-AC patch as a **correct-course note** (epics.md L1147 admin "90d refresh/15min access" → reconciled to §2.4 admin session model) — do **not** edit epics.md/architecture.md silently.
  - [x] 9.3 `deferred-work.md`: mark **Closed by [edit]** the apps/api-landing legs — D3-1.8 (HTTP middleware adapter), D4-1.6 (scope-resolution middleware), D4-1.7 (`pariwar_passport.created_by` FK), D4-1.8 (`role_grants.user_id` FK), D3-1.4 (fastify-zod wiring), D14-1.5(b) (encryptionContext hydration), and (if landed) D2-1.4 (api-client) + D1-1.7 (passport subpath/write contract). **Open** new D-items: SMS step-up delivery → Story 5.6/5.9; FR-47 audit sink → 1.10; Turnstile → 1.13; admin web UI → post-1.17; W9-CR1.6 (if deferred). Tag each per [[feedback_closure_language_precision]].
  - [x] 9.4 Flip README landing-lines (`apps/api/README.md` if present, `packages/domain/README.md` map for `users`/auth schema + policies, `packages/contracts/src/auth/README.md`). Run the full gate (AC-10). Fill Dev Agent Record; Status → `review`.
  - [x] 9.5 Update `sprint-status.yaml`: `1-9-…` → `review`, refresh `last_updated`.

## Dev Notes

### Dependency versions (pin these — Fastify 5.x is the committed target)

Architecture defers version pinning to implementation ADRs (§Coherence Validation L4645). Commit these in `apps/api/package.json` and record Fastify major version selection in ADR-0009:

| Package | Version | Notes |
|---|---|---|
| `fastify` | `^5.3.0` | 5.x is the post-2024 stable release; 4.x EOL trajectory |
| `@fastify/cookie` | `^11.0.0` | v11 for Fastify 5 (v9 for Fastify 4 — not compatible) |
| `@fastify/session` | `^10.0.0` | v10 for Fastify 5 |
| `@fastify/rate-limit` | `^10.0.0` | v10 for Fastify 5 |
| `@fastify/swagger` | `^9.0.0` | v9 for Fastify 5 |
| `@fastify/csrf-protection` | `^7.0.0` | v7 for Fastify 5; requires `@fastify/session` registered first |
| `fastify-type-provider-zod` | `^5.0.0` | v5 for Fastify 5 (v4 for Fastify 4 — not compatible) |
| `fastify-zod-openapi` | `^3.0.0` | v3 for Fastify 5 (v2 for Fastify 4 — not compatible) |
| `@simplewebauthn/server` | `^13.3.0` | v13 post-v11 breaking-change (see Dev Note below) |
| `@node-rs/argon2` | `^2.0.0` | Native; avoid pure-JS `argon2` package |
| `pg` | `^8.13.0` | Existing version from packages/domain — align |

> If any version above has released a newer stable since 2026-06-11, use the newer stable and record the delta in Completion Notes. The critical constraint is **Fastify 4 vs 5 ecosystem alignment** — do not mix 4-series and 5-series plugins.

### CSRF implementation

AC-3 commits to double-submit-cookie CSRF + origin/referer check. Use `@fastify/csrf-protection` (the standard Fastify CSRF plugin):

1. Register it **after** `@fastify/session` and `@fastify/cookie` are registered (it wraps the session to store the CSRF secret).
2. Configure with `sessionPlugin: '@fastify/session'` (cookie-storage mode) — this implements the double-submit-cookie pattern automatically.
3. For state-changing routes (POST/PUT/PATCH/DELETE), Fastify will require the `csrf-token` header or `_csrf` body field. The step-up OTP gating and auth routes are state-changing.
4. Add an `onRequest` pre-handler that checks `Origin` / `Referer` header against the configured `WEBAUTHN_EXPECTED_ORIGIN` as a defense-in-depth layer (SameSite=Lax is the baseline, not the sole line — AC-3).
5. Passkey authentication routes (OPTIONS generation for WebAuthn) are idempotent reads and do NOT need CSRF. Only the verify/POST endpoints do.

### What Story 1.9 substantively becomes

The **first runnable HTTP surface** and the **admin authentication substrate**. It converts `apps/api` from a 4-line placeholder into a booting Fastify app with the committed plugin/middleware/module tree (§3 L4253–4295), and proves it by shipping admin auth end-to-end: email+Argon2id(peppered) first factor, WebAuthn-passkey second factor, server-side `@fastify/session` Postgres-backed sessions, and a step-up-OTP mechanism + gating middleware (delivery seamed to Epic 5). It creates the **`users` identity table** the whole system has been waiting on (discharging the `role_grants` + `pariwar_passport` no-FK deferrals), and mounts Story 1.8's framework-agnostic `requirePermission` + the §2.5 scope-resolution middleware as real Fastify pre-handlers. The hard parts are **not** the happy paths — they are (1) the three load-bearing reconciliations below, and (2) standing up the framework substrate cleanly enough that 14 downstream epics inherit it without rework.

### Reconciliations you MUST surface (not silently resolve)

Per [[feedback_architecture_vs_prd_boundary]] (architecture commits state/transitions/mechanism; PRD/epic commits policy/cadence) and [[feedback_closure_language_precision]]. Each is a genuine divergence — resolve in ADR-0009 + decision-log; raise a one-line correct-course note where a source doc needs patching. Do **not** edit epics.md/architecture.md from inside dev-story.

1. **R1 — Session model (the load-bearing one).** The epic AC says "refresh tokens are 90 days; access tokens are short-lived (≤ 15 min)" (epics.md L1147) and "max 2 trusted devices per admin" (L1146). But architecture §2.4 is explicit: **admin web** = `@fastify/session` + **Postgres-backed session store**, HttpOnly/Secure/SameSite=Lax cookie, **idle 12h / absolute 7d**, revoke-by-row-delete. The JWT **access-15min + refresh** model is the **mobile/native API** row (§2.4) → **Story 3.2**, and the **90-day refresh** + **2-trusted-devices** are the **member** session model (§2.2). The epic AC for admin imported member/mobile properties. → **Canonical for admin auth: §2.4 admin-web session-cookie model.** Map "≤2 trusted devices" to **≤2 registered WebAuthn passkeys** (a coherent admin property — keep it). Reconcile "90d refresh / 15min access" away (mobile-only). Flag a correct-course patch against epics.md L1147.

2. **R2 — Identity/auth tables are global, NOT pariwar-scoped.** RLS (§1.2) isolates *tenant data*. Identity is cross-tenant by nature (a person admins multiple Pariwars; the `(user_id, pariwar_id, role)` join carries tenancy). **Login executes before any `app.pariwar_id` is set** — you look up the admin by email blind index, verify factors, *then* resolve their Pariwar memberships from `role_grants` and set scope. If you copy the `role_grants` scoped-RLS construct (`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`) onto `users`/credentials/sessions, **every login returns 0 rows** and auth is structurally impossible. → Model the identity/auth tables as a **carve-out family** alongside `pariwar-passport-rls.ts` (the established cross-tenant precedent), intentionally not pariwar-keyed, accessed via a narrow auth repo + explicit grants. Record in ADR-0009; **surface for architecture confirmation** (the exact mechanism — carve-out policy vs dedicated auth DB role vs documented no-RLS-with-grants — is a real decision; see closing question).

3. **R3 — Step-up OTP delivery does not exist in Epic 1.** §2.2 commits step-up delivery via **SMS-DLT-transactional through the channel dispatcher**, which is **Epic 5 (Story 5.6 SMS provider / 5.9 step-up delivery)**. epics.md L2235–2248 splits ownership: **Story 1.9 owns the gating decision + OTP mechanism**; Story 5.6/5.9 owns transport. → Build generate/hash-store/TTL/single-use/rate-limit/gating-middleware behind a **`StepUpOtpDeliveryPort`** with a dev/log stub. **Do not** add an SMS provider or attempt real delivery. New D-item → 5.6/5.9.

4. **R4 — Audit sink is Story 1.10.** Emit every privileged auth event to an **injectable audit seam** (default structured log), exactly as Story 1.8 exposed `onAuthorizationDenied` without building the sink. The FR-47 tamper-evident hash-chain audit log is Story 1.10 — do not build hash chaining, `events_log` writes, or the off-site mirror here. New D-item → 1.10.

### Admin email is Tier-1 PII — the login-lookup subtlety

§2.7 classifies **email as Tier-1** (envelope-encrypted ciphertext). But login is an **equality lookup by email**, and Tier-1 ciphertext is non-deterministic (per-row DEK) so you cannot query it. → Store admin email as **Tier-1 ciphertext** (`encryptTier1`/`decryptTier1`, for display/recovery) **plus** a **Tier-2 blind index** (`blindIndex` — HMAC-SHA-256, deterministic, namespaced per §2.7 "HMAC input namespacing": `HMAC(key, "email:" || normalized_email)`). Login = `blindIndex(email)` → unique-index lookup → row → verify password/passkey. Never persist or query a plaintext email column. The encryption context must be populated (request-context middleware hydrates `encryptionContextStorage`, Task 1.3). This is the first real consumer of the Story 1.5 encryption substrate at the HTTP layer (discharges D14-1.5(b)).

### SimpleWebAuthn v13 API (avoid the v11 breaking-change trap)

`@simplewebauthn/server@13.x`. The **v11 breaking change** renamed `AuthenticatorDevice` → **`WebAuthnCredential`** (`credentialID`→**`id`**, `credentialPublicKey`→**`publicKey`**, `counter` unchanged) and **moved types into the package** — import `WebAuthnCredential` from `@simplewebauthn/server`, **not** the removed `@simplewebauthn/types` / `/types` subpath. Server functions: `generateRegistrationOptions` / `verifyRegistrationResponse` (registration), `generateAuthenticationOptions` / `verifyAuthenticationResponse` (login). Persist `id` (credential id), `publicKey` (bytea/base64url), `counter` (bump on each auth — a non-increasing counter is a cloned-authenticator signal → reject). `rpID` + `expectedOrigin` are **per-environment config** (prod/staging/local), server-side — never trust a client-supplied origin. The browser ceremony (`@simplewebauthn/browser`) belongs to the admin UI (out of scope here) — the API surface only does options-generation + response-verification.

### Argon2id + pepper

Use **`@node-rs/argon2`** (native; the pure-JS `argon2` is ~100× slower and pushes you to weaker params). Pepper = a server-side secret combined with the password via Argon2's keyed mode — pass it as the **`secret`** option to `hash`/`verify` (cleaner than manual HMAC-then-hash). Source the pepper from **Secret Manager** via the `secrets.ts` resolution pattern (prod path), env fallback for local dev only. Params (OWASP-2026 ≈ `memoryCost: 65536` KiB, `timeCost: 3`, `parallelism: 1`) + the pepper-rotation story go in ADR-0009 with a review cadence (§2.3).

### Recommended identity + auth schema (concrete, to prevent reinvention)

`users` is global identity — **not** `pariwar_passport` (that is the *Pariwar's* org document). Suggested tables (the dev refines column-level within the architecture constraints; record final shape in the ADR):

| Table | Key columns | RLS posture |
|---|---|---|
| `users` | `id uuid pk`, `identity_type` (enum/text, seed `admin`; §3.13 extensible), `status`, `created_at` | **global** (carve-out family) |
| `admin_credentials` | `user_id fk`, `email_ciphertext` (Tier-1), `email_blind_index` **unique**, `password_hash`, `failed_attempts`, `locked_until` | global |
| `webauthn_credentials` | `user_id fk`, `credential_id` **unique**, `public_key`, `counter`, `transports`, `device_label`, `created_at` (≤2/user) | global |
| `recovery_codes` | `user_id fk`, `code_hash`, `consumed_at` | global |
| `admin_sessions` | per the chosen store's shape (`sid`, `sess jsonb`, `expire`) | global |
| `step_up_otps` | `user_id fk`, `otp_hash`, `action_context`, `pariwar_id` (informational), `expires_at`, `consumed_at`, `attempts` | global |

Branded `UserId` lands in `ids/index.ts` (branding mandatory on first PR, §Naming L3706). Retro FKs in `0005`: `role_grants.user_id → users.id`, `pariwar_passport.created_by → users.id`.

### `@fastify/session` Postgres store — a known sharp edge

`@fastify/session` requires `@fastify/cookie` and consumes an `express-session`-compatible `Store`. `connect-pg-simple` is the common Postgres store but has a documented `@fastify/session` interop issue (fastify/help #604) — **do not use connect-pg-simple**. **Implement a Drizzle-backed `Store` directly**: four methods (`get`, `set`, `destroy`, `touch`) backed by raw Drizzle queries against `admin_sessions`, using the same pool as the rest of the app (cleaner, single ORM, single pool, no interop bug, aligns with the Postgres-only §1.4 posture). ~30 lines. Record the choice in ADR-0009. The store table is global (R2).

### Deferred items this story discharges (the apps/api-landing cluster)

All re-trigger on "apps/api framework landing" — verify each against `deferred-work.md` and close the leg per [[feedback_closure_language_precision]]:

**Primary closures** (the story's work directly produces these — close as "Closed by [edit]"):
- **D3-1.8** — HTTP-middleware adapter + scope-resolution middleware (Task 3).
- **D4-1.6** — apps/api scope-resolution middleware → `src/middleware/scope-resolution/` (Task 3.1).
- **D4-1.7** — FK on `pariwar_passport.created_by` → `users.id` (Task 2.4).
- **D4-1.8** — FK on `role_grants.user_id` → `users.id` (Task 2.4).
- **W9-CR1.6** — `setPariwarScope` tx-active guard decision (Task 3.4; close as Closed-by-edit if implemented, or Resolved-via-deferral if deferred with rationale).

**Follow-on closures** (close after the feature is built, as the scaffolding enables them):
- **D3-1.4** — `fastify-type-provider-zod` + `fastify-zod-openapi` + `@fastify/swagger` runtime wiring (Task 1).
- **D14-1.5(b)** — Fastify pre-handler populates `encryptionContextStorage` (Task 1.3).
- **D2-1.4** — `packages/api-client/` first generator invocation (Task 7.3; recommended, land/defer recorded).
- **D14-1.4** — OpenAPI build-time-script vs runtime-extraction emission decision (Task 7.2).
- **D1-1.7** — `@twt/contracts/pariwar-passport` subpath + write/upsert contract (optional, if the first PII-bearing routes touch it).

Items that **remain deferred** (do not pull them in): D1-1.4 (OpenAPI semantic-diff CI gate → 1.16c), D7-1.4 (validator-presence ESLint rule → 1.16a), D8-1.4 (cross-surface parity test fastify runtime — light touch only), D6-1.6 (TanStack query isolation → admin UI, post-1.17).

### UI scope decision

The story title says "log into the admin **app**," but `apps/admin` is a bare TS skeleton (no React/Vite/Tamagui) and the **design-system foundation is Story 1.17** (tokens/typography/numerals). Building styled admin chrome now reinvents ahead of the design system and is the wrong altitude for a `[SURFACE]` substrate story (the 1.6/1.7/1.8 pattern is substrate-first). → **Recommended scope: API-first.** Ship the admin-auth API on `apps/api`, fully integration-tested (`fastify.inject`), demoable via the OpenAPI/api-client (epic demo beat "Admin logs in via passkey + step-up OTP" is satisfiable through the API). Defer the `apps/admin` login UI to land with the design system + admin chrome (post-1.17). **This is a scope decision worth confirming — see closing question.**

### Baseline state (built by Stories 1.1–1.8; do not reinvent)

- **`apps/api`** — bare: `package.json` (build-tooling only), `src/index.ts` = `export {}`, `tests/smoke.test.ts`, Dockerfile (multi-stage Node 20-alpine + pnpm). No framework. Canonical target tree is architecture §3 L4253–4295.
- **`packages/domain`** — `ids/index.ts` (branded-ID factory + `InvalidBrandedIdError` — copy for `UserId`); `errors.ts` (typed errors + `AuthorizationDeniedError` + `ErrorResponseShape` + `toErrorResponse` — reuse for error-mapping); `db.ts` (`createDb`, `setPariwarScope` ⚠ tx-only, `assertPariwarScopeSet`, `withPariwarScope`, `UUID_REGEX`); `encryption/` (`encryptTier1`/`decryptTier1`/`blindIndex`/`withEncryptionContext`/`encryptionContextStorage`); `secrets.ts` (Secret-Manager-vs-env); `policies/_roles.ts` (`appRole`/`serviceRole`), `pariwar-passport-rls.ts` (**carve-out** model for identity tables), `role-grants-rls.ts` (**scoped** — what NOT to copy onto identity tables); `rbac/` (`requirePermission`/`hasPermission`/`onAuthorizationDenied` seam); `schema/{users? no — create it, pariwar_passport, role_grants, events_log}`.
- **Migrations:** `0000`…`0004_role-grants`, journal idx **4**. Forward-only (§1.8); drizzle-kit emits CREATE; ENABLE/FORCE/GRANT + role DDL hand-supplemented (template `0002`/`0003`/`0004`). Next = **`0005`**.
- **`packages/contracts`** — `_common/primitives.ts` (`PariwarIdSchema` — add `UserIdSchema`), `_common/errors.ts` (`ErrorResponse` — reuse), `scripts/emit-openapi.ts` (manual registry; `check-openapi-determinism` byte-identical). `@twt/contracts` → `@twt/domain` is legal; **domain → contracts/events is forbidden** (turbo cycle — align by shape, not hard import).
- **Test substrate:** `setupLiveDb` per-test BEGIN/ROLLBACK; `_helpers.ts` (`seedEvent`/`seedPassport`/`seedRoleGrant`, branded `PARIWAR_A/B/X/Y`, `enterAppScope`); integration `tests/integration/**/*.spec.ts`, `pool: 'forks'`, `DATABASE_URL`-gated, skip cleanly when unset; CI `twt_dev_app` is superuser+BYPASSRLS → `SET LOCAL ROLE twt_app` in RLS tests. Local Docker `postgres:16-alpine` host port **5433**; CI 5432.

### Dev guardrails — what makes this go smoothly

- **Don't pariwar-scope the auth tables (R2).** The single biggest disaster vector. Login precedes scope. Model on `pariwar-passport-rls.ts` (carve-out), never `role-grants-rls.ts` (scoped). Add them to the leak suite as carve-out/global, not must-return-0.
- **Don't follow the epic's session wording (R1).** Admin = `@fastify/session` + Postgres store (§2.4), not JWT 90d/15min. That's mobile/Story 3.2.
- **Don't send real OTP SMS (R3) or build the audit hash chain (R4).** Seam both. Delivery → Epic 5; sink → 1.10.
- **`SET LOCAL` needs a transaction.** The scope-resolution middleware MUST open a tx before `setPariwarScope` (`db.ts` warns leaks to the next pooled request otherwise). `assertPariwarScopeSet` is the loud complement.
- **Email is Tier-1 + blind index.** Never a plaintext email column or lookup.
- **SimpleWebAuthn v13 types** from `/server`, not `/types`; `WebAuthnCredential`/`id`/`publicKey`/`counter`. Bump+check `counter`.
- **Don't invert package layers.** `@twt/domain` must not import `@twt/contracts`/`@twt/events`. The middleware/handlers in `apps/api` may import both.
- **Branding mandatory on `UserId`** (first PR for a new ID, §Naming L3706).
- **Don't gold-plate.** No admin React UI, no Cloudflare/Turnstile build, no SMS, no audit chain, no semantic-diff CI gate, no validator ESLint rule. Build the surface; seam the rest.

### Project Structure Notes

New (relative to repo root):
```
apps/api/src/
  server.ts                         [NEW] Fastify boot + ALS + plugin/middleware registration
  plugins/{zod-openapi,swagger,session,cookie,rate-limit}/   [NEW]
  middleware/{request-context,scope-resolution,audit-context,error-mapping}/  [NEW]
  modules/auth/{admin,shared}/      [NEW] 5-file shape (admin = password+WebAuthn+recovery+reset+step-up)
  modules/rbac/                     [NEW] requirePermission Fastify adapter
  modules/multi-tenant/             [NEW] scope tx integration
packages/domain/src/schema/
  users.ts, admin_credentials.ts, webauthn_credentials.ts,
  recovery_codes.ts, admin_sessions.ts, step_up_otps.ts        [NEW]
packages/domain/src/policies/
  identity-auth-rls.ts              [NEW] carve-out family (NOT scoped)
packages/domain/src/ids/index.ts    [MOD] add branded UserId
packages/domain/migrations/
  0005_admin-identity-auth.sql + meta/0005_snapshot.json       [NEW] (+ retro FKs)
packages/contracts/src/auth/        [NEW] .strict() Zod (first OpenAPI paths)
packages/api-client/                [NEW?] first @hey-api/openapi-ts invocation (Task 7.3, land/defer)
docs/adr/ADR-0009-admin-authentication.md                      [NEW]
```
Modified: `apps/api/package.json` (runtime deps) + `src/index.ts`; `packages/domain/src/{index,schema/index,policies/index}.ts`; `migrations/meta/_journal.json` (→5); `packages/domain/tests/integration/{_helpers.ts, multi-tenant/cross-pariwar-leak.spec.ts}`; `packages/contracts/src/index.ts` (+ exports map for `/auth`); `scripts/emit-openapi.ts` (+ `openapi/v1.yaml`); `docs/knowledge-transfer/adr-index.md`; `.decision-log.md`; `deferred-work.md`; `sprint-status.yaml`; this story file. drizzle-kit globs auto-pick `schema/*.ts` + `policies/*-rls.ts` — no `drizzle.config.ts` change.

### Testing standards summary

Unit (vitest, co-located + `packages/domain/tests/`): Argon2id+pepper verify, blind-index lookup, WebAuthn v13 options/verify (incl. counter-regression reject + ≤2-device cap + enrollment-ceremony gate), recovery-code burn, lockout, step-up TTL/single-use/elevated-window, session-ID rotation, error-mapping. Integration (`DATABASE_URL`-gated, `fastify.inject`, `setupLiveDb`, `SET LOCAL ROLE twt_app`): login→passkey→step-up flow; scope-resolution 404 + `assertPariwarScopeSet` loud-fail; RBAC 403; `0005` retro-FK integrity (orphan `user_id` now rejected); identity/auth tables in the leak suite as **carve-out/global, not must-return-0**. Contracts: `.strict()` + unknown-key rejection; OpenAPI determinism with the new paths. Local Postgres Docker `postgres:16-alpine` port 5433; CI 5432; suites skip cleanly without `DATABASE_URL`.

### References

- [Source: epics.md#Story-1.9] (L1135–1152); Epic 1 framing + AR list (L972–984, AR-22 L289, AR-23 L1574, AR-24 L291/L1353–1356); step-up ownership split (L2235–2248); Turnstile wiring point (L1244); admin device-token registration consumer (L2111); NFR-28/29 (L234–235).
- [Source: architecture.md] §2.1 threat actors (compromised admin → WebAuthn 2nd factor, L1311); §2.2 member auth + **step-up set + TTLs + OTP discipline** (L1321–1383); §2.3 **admin auth — email+password+WebAuthn passkey, Argon2id, enrollment ceremony, recovery codes, lockout, param-ADR** (L1385–1408); §2.4 **session model — admin `@fastify/session`+Postgres store, session-ID rotation, CSRF, JWT algo pinning** (L1410–1447); §2.5 **multi-Pariwar URL scope + auth-middleware contract + scope-change audit** (L1449–1474); §2.6 RBAC second-guard-after-RLS (L1476–1496); §2.7 PII tiers (email Tier-1; blind-index namespacing) (L1498–1533); §1.2 session-variable middleware + fail-closed scope + carve-out (L726–769); §1.3 Zod validator-per-route + drizzle-zod/fastify-type-provider note (L771–793); §3.1 fastify-zod-openapi stack (L1794–1796); §3.13 `identity_type` extensible identity + grant tuple (L2406–2421); §3 canonical `apps/api` source tree (L4253–4295); §Naming patterns (L3661–3717); §5-file module shape (L3740–3753); AsyncLocalStorage request context (L3891).
- [Source: deferred-work.md] D3-1.8, D4-1.6, D4-1.7, D4-1.8, D3-1.4, D14-1.4, D2-1.4, D14-1.5(b), W9-CR1.6, D1-1.7 (all 1.9-triggered); D1-1.4/D7-1.4/D8-1.4/D6-1.6 (remain deferred).
- [Source: Story 1.8 file] framework-agnostic `requirePermission`/`hasPermission` + `onAuthorizationDenied` seam, scoped-vs-carve-out RLS distinction, migration hand-supplement + journal-bump choreography, `setupLiveDb`/`_helpers.ts`/leak-suite test substrate, ADR/decision-log/deferred-work closeout pattern, "apps/api is not ready → defer HTTP middleware to 1.9" note.
- [Source: Story 1.7 file + `schema/pariwar_passport.ts`] carve-out RLS precedent (cross-Pariwar read, tenant write); `created_by uuid` no-FK "until Story 1.9+"; schemas-only OpenAPI registration.
- [Source: `schema/role_grants.ts`] `(user_id, pariwar_id, role)` tuple, `user_id` no-FK "until Story 1.9+", `role_grants_pariwar_user_idx` ("the Story-1.9 middleware query"), scoped RLS (NOT to be copied onto identity tables).
- [Source: web] `@simplewebauthn/server@13.3.0` (v11 `AuthenticatorDevice`→`WebAuthnCredential`, types from `/server`); `@node-rs/argon2` (OWASP-2026 m=64MiB/t=3/p=1) over pure-JS `argon2`; `@fastify/session` needs `@fastify/cookie` + an express-session-compatible `Store` — use a Drizzle-backed implementation (connect-pg-simple has documented `@fastify/session` interop issue fastify/help #604; see Dev Note "Fastify session store"); `@fastify/csrf-protection` v7 for Fastify 5 double-submit-cookie CSRF.

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (Claude Opus 4.8) via bmad-dev-story.

### Debug Log References

- Task 0 baseline: `pnpm turbo run lint typecheck test build` → 56/56 FULL TURBO. Live DB (Docker `postgres:16-alpine` port 5433, migrations 0000–0004 applied): `@twt/domain` 155 passed / 1 skip incl. RLS + adversarial leak.
- Task 1: Fastify boots via `fastify.inject`; 4 smoke tests pass (liveness + Zod serialize, request-id echo, 404 envelope, `/docs/json` OpenAPI). apps/api lint + typecheck + build green.

### Completion Notes List

**Task 1 — Fastify framework landing (AC-5).** Stood up `apps/api/src/server.ts` (`buildServer(deps)` factory, exported for tests, bound to an injected `AppDeps`), the committed plugin/middleware tree (`plugins/{zod-openapi,swagger,session,cookie,rate-limit,csrf-protection}`, `middleware/{request-context,error-mapping}`), config loader (`config.ts`), DI seam (`context.ts` + `deps.ts`), HTTP error hierarchy (`http-errors.ts`), health + readiness routes, boot guard (`index.ts`). request-context middleware hydrates an ALS `{traceId, actorId?, pariwarId?}` **and** the domain `encryptionContextStorage` (admin-global namespace — Reconciliation R2; discharges D14-1.5(b)). error-mapping projects every throw into the `_common/errors.ts` `ErrorResponse` envelope (Zod-validation→400, `ApiError`→its status, `AuthorizationDeniedError`→403, scope/id errors→4xx, uncaught→500 no-leak). CSRF: `@fastify/csrf-protection` with `sessionPlugin:'@fastify/session'` + an Origin/Referer defense-in-depth hook; the CSRF-token mint route lands at `/api/v1/auth/csrf`. Session: a direct pg-pool-backed `PgSessionStore` (`connect-pg-simple` avoided per fastify/help #604; raw parameterized SQL keeps Task 1 decoupled from the Task-2 `admin_sessions` schema object), HttpOnly+Secure+SameSite=Lax, idle 12h.

> **DEP-VERSION RECONCILIATION (surfaced, recorded in ADR-0009).** Two deltas from the story's pinned versions, both driven by the repo's actual zod 3.25.76 (classic Zod-3 API) + Fastify 5 ecosystem:
> 1. **`fastify-type-provider-zod` ^5 → ^4.0.2.** v5/v6 require **Zod 4** schemas (`$ZodType`); the committed contracts (`packages/contracts`) are classic Zod-3 — at runtime v5 throws `FST_ERR_INVALID_SCHEMA` on a `z.object().strict()`. v4.0.2 (peer `zod ^3.14.2`, `fastify ^5.0.0`) is the only Fastify-5-compatible provider for Zod-3 schemas. Verified: smoke serializer + `/docs/json` green on v4.
> 2. **`fastify-zod-openapi` dropped.** It is a *competing* type provider to `fastify-type-provider-zod` (cannot both be the active one on one instance) and targets a different `zod-openapi` API. `fastify-type-provider-zod` is the single wired provider; the canonical OpenAPI artifact stays the build-time contracts script (`@asteasolutions/zod-to-openapi`) — **D14-1.4 = build-time-script**. `@fastify/swagger` exposes a live `/docs/json` from the same Zod route schemas.
> 3. Newer-stable bumps (story authorised "use newer stable + record delta"): `@fastify/session` ^10→^11, `@fastify/rate-limit` ^10→^11, `@fastify/csrf-protection` ^7→^8 (the current Fastify-5 majors). `fastify` ^5.8, `@node-rs/argon2` ^2.0.2, `@simplewebauthn/server` ^13.3.1 as pinned.

**Task 2 — Identity + auth schema + migration 0005 (AC-7, R2).** `schema/users.ts` (GLOBAL identity, `identity_type` pgEnum seeded `admin`, `user_status` enum) + branded `UserId`; `admin_credentials` (email Tier-1 ciphertext via `piiColumn(1)` + Tier-2 blind index UNIQUE + Argon2id hash + lockout), `webauthn_credentials` (v13 fields + `counter` bigint), `recovery_codes`, `admin_sessions`, `step_up_otps`. `policies/identity-auth-rls.ts` — the **carve-out family** (ENABLE+FORCE RLS + `USING(true)` per table, R2). Migration `0005` (hand-supplemented GRANT+FORCE) + retro FKs `role_grants.user_id→users.id` (D4-1.8) + `pariwar_passport.created_by→users.id` (D4-1.7); journal idx→5; `db:migrate` clean + `db:check` byte-stable; psql-verified (`relrowsecurity=t relforcerowsecurity=t`, 6 policies, both FKs, full CRUD grants). Retro FK rippled into `_helpers.ts` (`seedUser` + branding) — 155 domain tests stay green.

**Task 3 — Scope-resolution + RBAC HTTP adapter (AC-6).** `middleware/scope-resolution/` (strict-UUID re-parse → 404 no-oracle; scope tx; membership-by-grant-load → 404 on 0); `modules/multi-tenant/scope-tx.ts` (BEGIN → `SET LOCAL ROLE twt_app` [production-faithful RLS] → `setPariwarScope` → `assertPariwarScopeSet`) + commit-on-2xx lifecycle hooks; `modules/rbac/` (raw-SQL scoped grant load + `requirePermission` pre-handler → 403 + `onAuthorizationDenied`→audit). Added `bindScopedDb` to domain. **W9-CR1.6 implemented** (closes D4-1.6). 5 DB-level scope-tx tests.

**Task 4 — Admin auth module (AC-1/2/8).** 5-file `modules/auth/admin/` + `modules/auth/shared/` (password Argon2id+pepper, email Tier-1+blind-index, recovery SHA-256, signed-link single-use via state-binding, audit, WebAuthn provider seam, session-guard). Two-step login + session-id rotation per auth-state change; lockout; enrollment ceremony (full-session OR single-use signed link; password-only denied); ≤2-device cap; WebAuthn counter-regression rejection; 10 one-time recovery codes; password reset → force WebAuthn re-enrollment + session revocation. 10 integration tests (incl. login→scoped-route 404/403).

**Task 5 — Step-up OTP + gating (AC-4, R3).** `modules/step-up/` — 6-digit OTP, SHA-256 hash-only, TTL 3min, single-use, invalidate-on-next, attempt-cap, per-actor+per-IP rate limit; `StepUpOtpDeliveryPort` dev stub (real SMS-DLT → 5.6/5.9); `requireStepUp(actionContext)` gate → structured 403; ~5min elevated window bound to action_context; audit per send (otp_hash) / consume / failure. 4 integration tests.

**Task 6 — Audit + Turnstile seams (AC-9, R4).** `audit/audit-sink.ts` `AuthAuditSink` (default log; FR-47 sink → 1.10) wired via `emitAuthAudit` + RBAC `onAuthorizationDenied`; scope-change emission (§2.5); no-op `TurnstileVerifier` at login + reset (→ 1.13).

**Task 7 — Contracts + OpenAPI + api-client (AC-8).** `contracts/src/auth/*` `.strict()` Zod + `UserIdSchema`; **10 auth routes as the first real OpenAPI `paths`** (determinism byte-stable). **D14-1.4 = build-time-script**; **api-client (D2-1.4) deferred to a fast-follow**.

**Task 8 — Tests.** apps/api 14 unit + 23 integration (`fastify.inject`, cookie-threaded, `pool:'forks'`). Domain leak suite: `users`/`admin_credentials` as **global carve-out (NOT must-return-0)** + retro-FK integrity (orphan rejected `23503`). Contracts: 22 auth tests (`.strict()` + unknown-key). `UserId` branded-id test.

**Task 9 — Docs + closeout.** ADR-0009 drafted; adr-index row (127→128); Decision `2026-06-12-045`; deferred-work Story 1.9 section; READMEs. **AC-10 gate green:** turbo 56/56 WITH `DATABASE_URL` (live RLS); `db:check` + determinism byte-stable. Closure posture per [[feedback_closure_language_precision]]: apps/api-landing cluster = **Closed by [edit]**; SMS/audit-sink/Turnstile/admin-UI/api-client/ADR-ratification = **Resolved via explicit deferral**; R1 epics.md L1147 + R2 architecture confirmation = surfaced, **Not addressed** in-repo.

### File List

**New — apps/api:** `README.md`, `src/{config,context,deps,http-errors,types,health,server,index}.ts`, `src/audit/audit-sink.ts`, `src/plugins/{cookie,session,rate-limit,csrf-protection,zod-openapi,swagger}/index.ts`, `src/plugins/session/store.ts`, `src/middleware/{request-context,scope-resolution,error-mapping}/index.ts`, `src/modules/auth/admin/{index,admin-auth.repo,admin-auth.service,admin-auth.handlers,admin-auth.routes,admin-auth.types}.ts`, `src/modules/auth/shared/{password,email-index,recovery,signed-link,audit,webauthn,step-up-delivery,turnstile,session-guard}.ts`, `src/modules/rbac/index.ts`, `src/modules/multi-tenant/{index,scope-tx}.ts`, `src/modules/step-up/{index,gate,step-up.repo,step-up.service,step-up.handlers}.ts`, `tests/integration/{_setup,_webauthn-fake,scope-tx.spec,admin-auth.spec,step-up.spec}.ts`, `tests/unit/auth-primitives.test.ts`.
**New — packages:** `domain/src/schema/{users,admin_credentials,webauthn_credentials,recovery_codes,admin_sessions,step_up_otps}.ts`, `domain/src/policies/identity-auth-rls.ts`, `domain/migrations/0005_admin-identity-auth.sql` + `meta/0005_snapshot.json`, `contracts/src/auth/{index,login,passkey,recovery,password-reset,step-up}.ts` + `README.md`, `contracts/tests/auth.test.ts`.
**New — docs:** `docs/adr/ADR-0009-admin-authentication.md`.
**Modified:** `apps/api/{package.json,.env.example,vitest.config.ts,src/index.ts,tests/smoke.test.ts}`; `domain/src/{db,index,secrets,ids/index,schema/index,schema/role_grants,schema/pariwar_passport,policies/index}.ts`, `domain/migrations/meta/_journal.json`, `domain/README.md`, `domain/tests/integration/{_helpers,multi-tenant/cross-pariwar-leak.spec}.ts`, `domain/tests/ids/branded-ids.test.ts`; `contracts/src/{index,_common/primitives}.ts`, `contracts/scripts/emit-openapi.ts`; `openapi/v1.yaml`; `pnpm-lock.yaml`; `docs/knowledge-transfer/adr-index.md`; `.decision-log.md`; `_bmad-output/implementation-artifacts/{deferred-work.md,sprint-status.yaml}`; this story file.

### Review Findings

> Code review of Group A (Domain + Contracts) — 2026-06-12. 3 layers: Blind Hunter, Edge Case Hunter, Acceptance Auditor. 14 patches, 1 decision-needed, 5 deferred, 7 dismissed.

**Decision-needed:**
- [x] [Review][Patch] `admin_sessions` add `user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE` column — add to schema, migration 0005, and `PgSessionStore.set()` write path; update suspend-cascade query to `DELETE WHERE user_id = $1`; add index on `user_id` [`packages/domain/src/schema/admin_sessions.ts`, `apps/api/src/plugins/session/store.ts`, `packages/domain/migrations/0005_admin-identity-auth.sql`]

**Patches — Group A (Domain + Contracts):**
- [x] [Review][Patch] `LoginRequest.password` min(1) too permissive — enforce `min(12)` matching the reset-path floor [`packages/contracts/src/auth/login.ts:22`]
- [x] [Review][Patch] `resolveSecretValue` routes through `fetchConnectionString` — semantic mismatch (pepper/generic secret calling a DB-connection-named fn); extract a shared `fetchSecretValue()` primitive used by both [`packages/domain/src/secrets.ts:106`]
- [x] [Review][Patch] `users` + `admin_credentials` `updated_at` columns have no BEFORE UPDATE trigger — add `set_updated_at()` triggers in migration 0005 mirroring `pariwar_passport` (migration 0003 precedent) [`packages/domain/migrations/0005_admin-identity-auth.sql`]
- [x] [Review][Patch] `admin_sessions` no index on `(sess->>'userId')` — FR-56 suspension `DELETE … WHERE sess->>'userId' = $1` is a full table scan; resolved via proper FK column + indexed `user_id` column (Decision 1) [`packages/domain/migrations/0005_admin-identity-auth.sql`]
- [x] [Review][Patch] `step_up_otps` missing partial composite index — add `(user_id, expires_at) WHERE consumed_at IS NULL` for the hot verify-path lookup [`packages/domain/migrations/0005_admin-identity-auth.sql`]
- [x] [Review][Patch] `RecoveryConsumeResponse.authenticated` + `PasskeyAuthVerifyResponse.authenticated` as `z.boolean()` — allows `{authenticated: false}` with 200 OK; must be `z.literal(true)` (failures must be 4xx, not 200+false) [`packages/contracts/src/auth/recovery.ts`, `passkey.ts`]
- [x] [Review][Patch] `failedAttempts` + `attempts` columns have no `CHECK (>= 0)` — add non-negative constraints per `events_log.event_version` precedent [`packages/domain/migrations/0005_admin-identity-auth.sql`]
- [x] [Review][Patch] `PasskeyRegisterVerifyResponse.recoveryCodes` unconstrained — first-enrollment must guarantee exactly 10 non-empty codes; add `.length(10)` + `z.string().min(1)` element schema [`packages/contracts/src/auth/passkey.ts:283`]
- [x] [Review][Patch] `PasswordResetConsumeRequest.token` min(1) — no entropy floor on the reset token; add `min(32)` [`packages/contracts/src/auth/password-reset.ts:341`]
- [x] [Review][Patch] `resolveSecretValue` envFallback accepts whitespace-only strings — add `.trim() !== ''` guard [`packages/domain/src/secrets.ts:114`]
- [x] [Review][Patch] `StepUpVerifyRequest.otp` `min(1)/max(16)` too loose — tighten to actual 6-digit OTP bounds e.g. `min(6).max(8)` [`packages/contracts/src/auth/step-up.ts:416`]
- [x] [Review][Patch] `_journal.json` + `0005_snapshot.json` missing trailing newlines — spec mandates trailing newline on journal bump [`packages/domain/migrations/meta/`]
- [x] [Review][Patch] `password_hash` tagged `piiColumn(1, 'admin_password_hash')` — Argon2id hash is not reversible Tier-1 ciphertext; use plain `text()` column (piiColumn is annotation-only but the 1.16b CI gate will misclassify it) [`packages/domain/src/schema/admin_credentials.ts:47`]
- [x] [Review][Patch] Migration 0005 CREATE TABLE ordering — header comment claims `users` is ordered before auth tables but SQL creates `admin_credentials` + `admin_sessions` first; reorder to match comment [`packages/domain/migrations/0005_admin-identity-auth.sql:52`]

**Deferred — Group A:**
- [x] [Review][Defer] `isRLSEnabled: false` in snapshot vs `ENABLE ROW LEVEL SECURITY` in SQL — pre-existing pattern from 0002/0003/0004 (hand-supplements invisible to drizzle-kit); consistent, but snapshot does not reflect actual DB state — deferred, pre-existing
- [x] [Review][Defer] `step_up_otps.pariwarId` nullable uuid with no FK — spec explicitly marks this informational only, not an RLS key; no FK is architecturally intentional — deferred, pre-existing
- [x] [Review][Defer] `SecondFactorMethod` enum not extensible — adding a 3rd method would break contract-validating clients before a contract update; design choice for future evolution — deferred, pre-existing
- [x] [Review][Defer] `recovery_codes.codeHash` no per-user uniqueness constraint — collision probability negligible with proper random code generation; service handles the consumed_at burn correctly — deferred, pre-existing
- [x] [Review][Defer] `seedUser` test helper non-UUID id — would throw `InvalidBrandedIdError` with potentially confusing message; test infra only, not prod risk — deferred, pre-existing

> Code review of Group B (API Framework) — 2026-06-12. 3 layers: Blind Hunter, Edge Case Hunter, Acceptance Auditor. 12 patches, 0 decision-needed, 4 deferred, 9 dismissed.

**Patches — Group B (API Framework):**
- [x] [Review][Patch] `intEnv` rejects `0` as invalid (`n <= 0`) — lockoutThreshold=0 is a valid ops override ("lock on first attempt"); change guard to `n < 0` [`apps/api/src/config.ts`]
- [x] [Review][Patch] `WEBAUTHN_EXPECTED_ORIGIN` not validated as a URL in `loadConfig` — malformed value (no scheme) causes `originOf` to return null, falling back to raw string comparison that can never match a parsed origin; validate at boot [`apps/api/src/config.ts`]
- [x] [Review][Patch] `buildEncryptionDeps` — unrecognized `KMS_TEST_MODE` value silently falls through to fake KMS provider; a production typo (e.g. `KMS_TEST_MODE=prod`) silently uses fake deterministic keys; throw on unrecognized modes [`apps/api/src/deps.ts`]
- [x] [Review][Patch] `createDeps` — pepper not validated non-empty; an empty-payload Secret Manager secret passes through, zeroing out the Argon2 + HMAC key material; add non-empty guard before use [`apps/api/src/deps.ts`]
- [x] [Review][Patch] `main()` — pool leaked if `buildServer()` throws (signal handlers registered only after `app.listen`); wrap post-`createDeps` code in try/finally to `pool.end()` on error [`apps/api/src/index.ts`]
- [x] [Review][Patch] `main()` — SIGTERM/SIGINT double-invocation race: second signal calls `close()` concurrently; add a `closing` flag to prevent double pool drain [`apps/api/src/index.ts`]
- [x] [Review][Patch] `requestContextHook` — `x-request-id` header accepted verbatim with no length cap or control-char filtering; attacker-controlled traceId is written to structured logs and echoed in `ErrorResponse`; sanitize: strip control chars + cap at 128 chars [`apps/api/src/middleware/request-context/index.ts`]
- [x] [Review][Patch] `originCheckHook` — `request.headers.referer` may be `string[]` (duplicate headers); `originOf(string[])` coerces array to comma-joined string, `new URL` throws, returns null, silently bypassing the Referer branch; normalize to first element before passing to `originOf` [`apps/api/src/plugins/csrf-protection/index.ts`]
- [x] [Review][Patch] `originCheckHook` — `Origin: null` (sandboxed iframes, `data:` URIs) causes `originOf` to return null; falls through to Referer branch and if absent → allowed; explicitly reject the literal string `'null'` as an origin for state-changing requests [`apps/api/src/plugins/csrf-protection/index.ts`]
- [x] [Review][Patch] `PgSessionStore.get()` — `row.expire instanceof Date` is false when pg returns TIMESTAMPTZ as a string (driver type-parser config); server-side expiry check is silently skipped, serving expired sessions; coerce `row.expire` with `new Date(row.expire)` before the check [`apps/api/src/plugins/session/store.ts`]
- [x] [Review][Patch] `scopeResolutionHook finally` — `closeScopeTx(scopeTx, false)` inside `finally` may itself throw, masking the original exception and producing a misleading 500; wrap the `closeScopeTx` call in a try/catch that logs the secondary error and re-throws the original [`apps/api/src/middleware/scope-resolution/index.ts`]
- [x] [Review][Patch] `errorMappingHandler` 4xx catch-all — passes `error.message` verbatim to the client for Fastify-internal 4xx errors (e.g. rate-limit 429); violates the "no internal detail leaked" contract stated in the file header; replace with a static safe message keyed on the status code [`apps/api/src/middleware/error-mapping/index.ts`]

**Deferred — Group B:**
- [x] [Review][Defer] `scope.change` audit event emitted on every scoped request, not just transitions — produces audit flood; AC-9 intent is transition events (§2.5 "Scope-change audit emission"); architectural: requires explicit scope-change detection — deferred, needs spec clarification
- [x] [Review][Defer] `SESSION_SECRET` entropy not validated — all-spaces string passes 32-char check; operational concern, cannot be fully enforced in code without arbitrary entropy checks — deferred, operational
- [x] [Review][Defer] `AuthorizationDeniedError`/`ApiError` check ordering in `errorMappingHandler` — `ApiError` branch fires first; consequence depends on `AuthorizationDeniedError` class hierarchy (whether it extends `ApiError`); verify hierarchy before deciding — deferred, needs hierarchy check
- [x] [Review][Defer] `buildEncryptionDeps` reads `KMS_TEST_MODE` directly from `process.env` instead of injected `ApiConfig` — breaks injection discipline; `buildEncryptionDeps` is also called from tests with pepper only, making migration to config invasive — deferred, refactor scope

> Code review of Group C (Auth Modules) — 2026-06-12. 3 layers: Blind Hunter, Edge Case Hunter, Acceptance Auditor. 7 patches, 5 deferred, 8 dismissed.

**Patches — Group C (Auth Modules):**
- [x] [Review][Patch] `burnOtp` TOCTOU — `UPDATE ... WHERE id = $1` lacks `AND consumed_at IS NULL`; two concurrent verify requests both succeed; replaced with atomic `UPDATE ... AND consumed_at IS NULL RETURNING id`, return false if no row — `step-up.repo.ts`, `step-up.service.ts`
- [x] [Review][Patch] `passkeyRegisterVerify` missing `session.regenerate()` on re-enrollment — bumps `authStateVersion` only; AC-3 requires session ID rotation on every auth-state change including WebAuthn re-enrollment; added full regenerate-and-restore pattern — `admin-auth.handlers.ts`
- [x] [Review][Patch] Logout emits `'login.success'` instead of `'login.logout'` — wrong audit type; added `'login.logout'` to `AuthAuditEventType` union and corrected the call site — `audit-sink.ts`, `admin-auth.handlers.ts`
- [x] [Review][Patch] Clone detection skips counter=0 credentials (`owner.credential.counter > 0` guard) — a software passkey that always reports counter=0 is never clone-checked; replaced with `!(newCounter === 0 && owner.credential.counter === 0)` to skip only when authenticator provably doesn't use counters — `admin-auth.service.ts`
- [x] [Review][Patch] `session-guard.ts` only enforces `absoluteExpiry` when `typeof absoluteExpiry === 'number'` — sessions with missing/undefined absoluteExpiry (migrated rows) bypass the 7-day hard cap; changed to strict check that destroys + 401s when undefined — `session-guard.ts`
- [x] [Review][Patch] `consumePasswordReset` deletes passkeys but NOT recovery codes — old codes remain valid for MFA after a forced reset; added `repo.deleteRecoveryCodes` call after `deleteAllCredentials` — `admin-auth.repo.ts`, `admin-auth.service.ts`
- [x] [Review][Patch] `passkeyAuthVerify` does not clear `webauthnChallenge`/`webauthnChallengeKind` on auth failure — stale challenge reusable in session; cleared on failure path before throwing — `admin-auth.handlers.ts`

**Deferred — Group C:**
- [x] [Review][Defer] `verifyFirstFactor` dummy hash uses weak params (`m=8,t=1,p=1`) — timing oracle distinguishing "no such user" from "wrong password"; fix requires precomputing a production-params dummy hash and threading through `AppDeps` — deferred, design work CR-C-1
- [x] [Review][Defer] Hostile-trustee-class lockout has no trustee-quorum unlock path (AC-1) — current lockout is time-based only; quorum-unlock requires separate lock-tier + unlock route — deferred, needs quorum infrastructure not in Epic 1 CR-C-2
- [x] [Review][Defer] Session rotation on role change (AC-3) — role-grant mutation routes not in Story 1.9; any story landing role mutations must call `session.regenerate()` — deferred, trigger: role-mutation story CR-C-3
- [x] [Review][Defer] `recovery_code.consume` audit missing consumed code hash in context — `context: { code_hash }` would improve forensic traceability — deferred, completeness gap CR-C-4
- [x] [Review][Defer] Enrollment-token concurrent TOCTOU — two concurrent requests with the same token both see `count === 0` and both enroll; bounded by `MAX_DEVICES` cap — deferred, architectural fix needed CR-C-5

> Code review of Group D (Tests) — 2026-06-12. 3 layers: Blind Hunter, Edge Case Hunter, Acceptance Auditor. 7 patches, 7 deferred, 3 dismissed (BH H-3 incorrect — `enrollFirstPasskey` if-guard preserves preset credential; BH M-9/ECH F10 duplicate — `openScopeTx` cleans up internally).

**Patches — Group D (Tests):**
- [x] [Review][Patch] `scope-tx.spec.ts` seeds pariwar-dimension grant with `scope_value = NULL` — ill-formed per `isGrantScopeWellFormed`; RBAC engine silently drops it; changed to `scope_value = pariwarA` — `scope-tx.spec.ts:34`
- [x] [Review][Patch] `admin-auth.spec.ts` had a local duplicate `makeClient` (24 lines) identical to `_setup.ts` export — removed, import added; `Client` type derived via `ReturnType<typeof makeClient>` — `admin-auth.spec.ts:22–60`
- [x] [Review][Patch] AC-9 audit assertions missing — added: `login.success` × 2 to full-login test, `login.failure` × 2 to enumeration test, `recovery_code.consume` × 1 to recovery-code test, `passkey.auth.failure` × 1 to counter-regression test — `admin-auth.spec.ts`
- [x] [Review][Patch] Password-reset test did not verify old recovery codes are burned (C-6 untested end-to-end) — captured recovery codes from `enrollFirstPasskey`, then after reset attempted old code reuse → asserted 401 — `admin-auth.spec.ts:361`
- [x] [Review][Patch] No logout test — added: authenticated login → `POST /logout` → 204 + `login.logout` audit; subsequent guarded request → 401 — `admin-auth.spec.ts`
- [x] [Review][Patch] C-4 counter-zero paths untested — added: (a) `newCounter=0, stored=0` → auth succeeds (bypass correct); (b) `newCounter=0, stored=5` → auth rejected (regression from non-zero) — `admin-auth.spec.ts`
- [x] [Review][Patch] `afterAll` pool cleanup: `pool.connect()` outside try/finally — if connect throws, `pool.end()` never called → test runner hangs; wrapped in nested try/finally — `admin-auth.spec.ts:78`, `scope-tx.spec.ts:47`

**Deferred — Group D:**
- [x] [Review][Defer] AC-3 session-rotation assertions — requires raw `app.inject()` cookie comparison or `makeClient` redesign to track SID across state transitions — deferred, test infrastructure change CR-D-1
- [x] [Review][Defer] AC-7 rate-limit fires (login + step-up 429) — `TEST_ENV` sets ceilings to 100k by design; per-test env override pattern not yet established — deferred CR-D-2
- [x] [Review][Defer] AC-8 CSRF negative test (mismatched/absent Origin → 403) — coverage gap, not a correctness bug; dedicated CSRF spec warranted when surface grows CR-D-3
- [x] [Review][Defer] AC-1 lockout time-based unlock — requires clock injection in the HTTP E2E layer; clock not currently threaded to `requireAdminSession` — deferred CR-D-4
- [x] [Review][Defer] Enrollment token single-use after device enrolled — coverage gap CR-D-5
- [x] [Review][Defer] 7-day absolute session expiry test — needs `SESSION_ABSOLUTE_MS` override to a short value + frozen clock in E2E — deferred CR-D-6
- [x] [Review][Defer] WebAuthn challenge cleared on failure retry (C-7 path) — coverage gap for the Group C patch CR-D-7

> Code review of Group E (ADR + OpenAPI) — 2026-06-12. 3 layers: Blind Hunter, Edge Case Hunter, Acceptance Auditor. 11 patches, 5 deferred, 3 dismissed (BH F-ADR-1 non-sequential AC tags — intentional architectural-dependency ordering; ECH PasskeyAuthOptionsRequest empty-body — Fastify body parser handles `{}` normally; AA scope.change flood duplicate — already tracked as CR-B-1 in deferred-work.md).

**Patches — Group E (ADR + OpenAPI):**
- [x] [Review][Patch] `emit-openapi.ts`: `POST /api/v1/auth/logout` absent from committed spec — route exists (204 + audit), is CSRF-gated, was undiscoverable by consumers; added to registry with 204/401/403 responses — `packages/contracts/scripts/emit-openapi.ts`
- [x] [Review][Patch] `emit-openapi.ts`: `passkey/register/verify` missing `409` — `registerVerify` throws `ConflictError` "Maximum passkey devices reached" at line 101 (same cap as options); added to errors — `packages/contracts/scripts/emit-openapi.ts:167`
- [x] [Review][Patch] `emit-openapi.ts`: `passkey/authenticate/options` missing `409` — `authOptions` throws `ConflictError` "No passkey enrolled" at line 137; added — `packages/contracts/scripts/emit-openapi.ts:168`
- [x] [Review][Patch] `emit-openapi.ts`: `step-up/request` + `step-up/verify` missing `429` — `stepUpRate` applied in step-up/index.ts; both routes can return 429 — `packages/contracts/scripts/emit-openapi.ts:173-174`
- [x] [Review][Patch] `emit-openapi.ts`: `password-reset/request` missing `429` — `LOGIN_RATE` applied at admin-auth.routes.ts line 85; added — `packages/contracts/scripts/emit-openapi.ts:171`
- [x] [Review][Patch] `emit-openapi.ts`: `requestBody.required` absent on all 10 POST routes — OpenAPI 3.x defaults to `false`; added `required: true` to all POST requestBody blocks — `packages/contracts/scripts/emit-openapi.ts:191`
- [x] [Review][Patch] `emit-openapi.ts`: `400` absent on all POST routes — Zod validation always possible; systematic gap across the spec; added `400: 'Request validation failed'` to every POST route — `packages/contracts/scripts/emit-openapi.ts:181`
- [x] [Review][Patch] `openapi/v1.yaml` schema drift (Group A contracts not re-emitted): `LoginRequest.password` minLength 1→12, `StepUpVerifyRequest.otp` 1-16→6-8, `PasswordResetConsumeRequest.token` 1→32, `authenticated` boolean→literal(true) × 2, `recoveryCodes` gains length(10) constraint — fixed by re-running determinism check after emit script patches
- [x] [Review][Patch] ADR-0009 §3: lockout parameters absent (AC-1 gap) — N=5, 15 min, `LOCKOUT_THRESHOLD`/`LOCKOUT_MS` env-overridable, `locked_until` column mechanism, trustee-quorum unlock deferred (CR-C-2) — `docs/adr/ADR-0009-admin-authentication.md:§3`
- [x] [Review][Patch] ADR-0009 §7: rate limit thresholds absent — login 10 req/min (`LOGIN_RATE_MAX`), step-up 5 req/min (`STEP_UP_RATE_MAX`) composite `actorId|IP`, global 300 req/min (`RATE_LIMIT_MAX`) — `docs/adr/ADR-0009-admin-authentication.md:§7`
- [x] [Review][Patch] ADR-0009 §8: AC-9 not cited + full audit event taxonomy absent — added explicit AC-9 citation and all 16 event types from `audit-sink.ts` — `docs/adr/ADR-0009-admin-authentication.md:§8`

**Deferred — Group E:**
- [x] [Review][Defer] `GET /api/v1/auth/csrf` absent from OpenAPI spec — `schema: {hide:true}` intentional; ADR §2 already names it; add to spec when a second CSRF-gated route lands CR-E-1
- [x] [Review][Defer] Cookie name `twt_admin_sid` not documented in ADR §2 — LOW, add at API-client fast-follow CR-E-2
- [x] [Review][Defer] `passkey/register/options` + `register/verify` missing `401` — session vs token paths have different exposure; defer until paths are split CR-E-3
- [x] [Review][Defer] `recoveryCodes` first-enrollment semantics missing from OpenAPI description — LOW, informational CR-E-4
- [x] [Review][Defer] ADR-0009 status → `under-trustee-review` — process decision; requires trustee engagement CR-E-5

### Change Log

| Date | Change |
|---|---|
| 2026-06-12 | Story 1.9 substantive author-commit — `apps/api` Fastify framework landing + admin authentication (email/password Argon2id+pepper + WebAuthn v13 passkey + step-up OTP); `users` global identity + 5 auth tables + carve-out RLS + migration 0005 + retro FKs; scope-resolution + RBAC HTTP adapters (W9-CR1.6 implemented); first real OpenAPI `paths`; audit/Turnstile/step-up-delivery seams; ADR-0009 + Decision 2026-06-12-045. Gate: turbo 56/56 + db:check + determinism green. Status → review. |
