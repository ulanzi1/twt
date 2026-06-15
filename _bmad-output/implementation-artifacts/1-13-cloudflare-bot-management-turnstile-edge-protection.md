# Story 1.13: Cloudflare + Bot Management + Turnstile Edge Protection `[PRIMITIVE]`

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As **any visitor to a TWT-hosted surface**,
I want **Cloudflare with Bot Management + Turnstile gating all public traffic, sitting behind a single `packages/edge` provider abstraction**,
so that **the backend is unreachable except through the edge, bot/abuse traffic is filtered before it reaches the app, and a future pivot to a different edge vendor is a single-module change**.

## Acceptance Criteria

> Source: epics.md L1232–1248 (Story 1.13), expanded with the implied "leave the system working end-to-end" requirements surfaced during analysis. ACs marked **(deferred-apply)** ship as authored-but-not-live config, matching the project's substrate pattern (D1-1.2 / D1-1.5 in [`infra/gcp/.terraform-plan-expectations.md`](../../infra/gcp/.terraform-plan-expectations.md)) — there is no live Cloudflare zone in this environment.

**AC-1 — `packages/edge` provider abstraction (AR-52).** A new `@twt/edge` package owns the vendor-neutral edge seam. It exports an `EdgeProvider` / `TurnstileVerifier` interface, a `createCloudflareTurnstileVerifier(...)` implementation, and the `noopTurnstileVerifier` default. A pivot to a non-Cloudflare edge is a single-module change inside `packages/edge` — no consumer (apps/api, apps/admin) imports `cloudflare`-specific anything. The package has **no dependency on `@twt/domain`** (mirror `@twt/queue`).

**AC-2 — Real Turnstile server-side verification, wired into auth entry points (Story 1.9).** The existing no-op `TurnstileVerifier` seam at the login + password-reset entry points is replaced by a Cloudflare siteverify call (`createCloudflareTurnstileVerifier`) **when configured**. The verifier POSTs to `https://challenges.cloudflare.com/turnstile/v0/siteverify` with `secret` + `response` (+ `remoteip`, `idempotency_key`) and returns `true` only on `success: true`.

**AC-3 — Entry points ENFORCE the verify result (regression fix).** `admin-auth.handlers.ts` currently `await`s `deps.turnstile.verify(...)` **but discards the boolean** (L46 login, L180 password-reset). The handlers must reject with a generic 401/403 when verification returns `false` (anti-enumeration: same generic envelope as a bad credential). The no-op default still returns `true`, so existing tests stay green.

**AC-4 — Fail-closed + safe-by-default.** When a Turnstile secret IS configured, a siteverify network error / timeout / `internal-error` fails **closed** in production (request rejected) — never silently passes. When NO secret is configured (local dev / CI / not-yet-provisioned), the seam resolves to `noopTurnstileVerifier` (always pass) so the stack runs without a live Cloudflare account. Selection is config-driven in `deps.ts`, mirroring the argon2-pepper "secret NAME, not value" pattern.

**AC-5 — Turnstile widget on the authentication surface (apps/admin).** The admin `LoginPage` renders the Turnstile widget (Cloudflare `api.js`) and submits the token as `turnstileToken` on login + recovery. The widget renders **only when** a build-time site key is present (absent → no widget, matching the no-op server seam). The contracts already carry `turnstileToken?` (login.ts L16–17, password-reset.ts L15) — reuse, do not re-add.

**AC-6 — `infra/cloudflare/` edge configuration as Terraform (deferred-apply).** `infra/cloudflare/` is populated with `cloudflare/cloudflare`-provider HCL mirroring the `infra/gcp/` module convention, expressing: (a) all public traffic proxied through Cloudflare; (b) **origin firewall / edge-only ingress** — backend rejects non-Cloudflare-originating traffic (mechanism per the ADR); (c) **Bot Management** with per-surface sensitivity (WAF custom rules keyed on bot score); (d) **Turnstile** widget config for the FR-88 surfaces (signup, claim filing, helpdesk forms) + auth entry points; (e) observable edge metrics. Includes `README.md` + `.terraform-plan-expectations.md`; live `terraform apply` is deferred to a D-item (no live zone here).

**AC-7 — Pivot-readiness ADR (AR-52, Sprint Change Proposal Item 6).** A new ADR (`docs/adr/ADR-0010-…`) records: Cloudflare as v1 edge/WAF default; the edge-only-ingress mechanism chosen (§5.8); the `packages/edge` abstraction + the four §5.8a substitution points; the DPDPA-compatibility OPEN status (legal review pending — do not assert "compliant"); and the Bot-Management plan-tier dependency. Status: `drafted` or `under-trustee-review`.

**AC-8 — Tests.** Unit tests for the Cloudflare verifier (siteverify success; `success:false` with `error-codes`; `timeout-or-duplicate` replay; network/timeout fail-closed; `idempotency_key` passthrough; `remoteip` passthrough). Integration test proving an auth entry point rejects when the injected verifier returns `false` and succeeds when it returns `true`. Existing Story 1.9 auth tests remain green (no-op default unchanged).

## Tasks / Subtasks

- [x] **Task 1 — Scaffold `packages/edge` (`@twt/edge`)** (AC: 1)
  - [x] Create `packages/edge/` mirroring `packages/queue/` scaffolding exactly: `package.json` (`name: "@twt/edge"`, `"type": "module"`, `main: "./src/index.ts"`, same scripts), `tsconfig.json`, `eslint.config.js`, `vitest.config.ts`, `src/index.ts`, `tests/`.
  - [x] No `@twt/domain` dependency. Only dev-deps (`@twt/eslint-config-twt`, types, vitest, tsx, typescript). `fetch` is global (Node 22) — no HTTP-client dependency needed.
  - [x] `pnpm-workspace.yaml` already globs `packages/*` — no edit needed; run `pnpm install` to link.
- [x] **Task 2 — Edge provider interface + Turnstile verifier** (AC: 1, 2, 4)
  - [x] Define the vendor-neutral `TurnstileVerifier` interface in `@twt/edge` (promote the shape from `apps/api/.../shared/turnstile.ts`; keep `verify(input): Promise<boolean>` + `TurnstileVerification { token?, remoteIp? }`).
  - [x] Export `noopTurnstileVerifier` (always-pass) from `@twt/edge`.
  - [x] Implement `createCloudflareTurnstileVerifier(opts)`: POST siteverify with `secret`, `response`(=token), optional `remoteip`, optional `idempotency_key` (UUID). Parse `{ success, "error-codes", challenge_ts, hostname, action, cdata }`. Return `success === true`. Fail-closed on fetch error / non-2xx / `internal-error` (configurable `failOpen` default `false`).
  - [x] Export constants: `TURNSTILE_SITEVERIFY_URL`, `TURNSTILE_WIDGET_SCRIPT_URL`, and the documented Cloudflare testing keys (see Dev Notes).
- [x] **Task 3 — Consume `@twt/edge` in apps/api; select real-vs-noop by config** (AC: 2, 4)
  - [x] Add `"@twt/edge": "workspace:*"` to `apps/api/package.json`.
  - [x] Replace `apps/api/src/modules/auth/shared/turnstile.ts` with a **thin re-export** (recommended — preserves the 3 existing import sites unchanged): split into `export type { TurnstileVerifier, TurnstileVerification }` + `export { noopTurnstileVerifier }` (isolatedModules-safe). The 3 import sites (`context.ts:17`, `deps.ts:20`, `tests/integration/_setup.ts:21`) need no edits.
  - [x] `config.ts`: add Turnstile config — **OPTIONAL, not required** (unlike argon2 which uses `requireEnv()`). Use `env['TURNSTILE_SECRET_NAME']` (returns `undefined` when absent; no throw). Added `readonly turnstile: { readonly secretName?: string; secretEnvFallback: string; failOpen: boolean }` to `ApiConfig`. Absent → `deps.ts` keeps `noopTurnstileVerifier`; stack boots without any Cloudflare config.
  - [x] `deps.ts`: when the Turnstile secret resolves, build `createCloudflareTurnstileVerifier(...)`; else keep `noopTurnstileVerifier`. Resolve the secret with the existing `resolveSecretValue` (`packages/domain/src/secrets.ts`), same path argon2 uses. (`buildTurnstileVerifier` helper.)
- [x] **Task 4 — Enforce the verify result at entry points (regression fix)** (AC: 3)
  - [x] `admin-auth.handlers.ts` `login` (L~46) and `passwordResetRequest` (L~180): capture the boolean from `deps.turnstile.verify(...)`; on `false`, emit an auth audit line (`login.failure` reason `turnstile`) and throw the generic `UnauthorizedError('Invalid credentials', 'auth.invalid_credentials')` (do NOT reveal "captcha failed" → anti-enumeration consistency with the lockout path).
  - [x] Verify no other entry point silently ignores the result (grep `deps.turnstile.verify` → only the 2 sites, both now capture + enforce).
- [x] **Task 5 — Turnstile widget on admin LoginPage** (AC: 5)
  - [x] `apps/admin/src/routes/LoginPage.tsx`: render the Turnstile widget (load `api.js` explicit-render, `window.turnstile.render`) gated on a build-time `import.meta.env.VITE_TURNSTILE_SITE_KEY`; absent → render nothing (dev default). Added `apps/admin/src/vite-env.d.ts` to type the var.
  - [x] Thread the obtained token into `api.login(...)` ONLY. Extended `apps/admin/src/api/client.ts` `login(email, password)` to accept an optional `turnstileToken?: string` third param and include it in the POST body. The `LoginRequest` contract already carries `turnstileToken?: z.string().optional()` — reused, not re-added.
  - [x] **Did NOT touch `api.consumeRecovery()`.** `consumeRecovery` is the MFA second-factor (recovery code); the server's `recoveryConsume` handler does NOT call `deps.turnstile.verify()`, and `RecoveryConsumeRequest` has no `turnstileToken` field. Adding it would be dead code.
  - [x] The `passwordResetRequest` server endpoint also has a Turnstile verify call, but the admin password-reset UI is deferred (DD-2) — no client function exists yet. Noted in completion notes; UI not scaffolded here.
  - [x] Reset/re-render the widget after the credentials form submits (token is single-use, `resetTurnstile()` on failure); handle the no-token dev path gracefully (widget absent → send no token → server no-op passes).
- [x] **Task 6 — `infra/cloudflare/` Terraform (deferred-apply)** (AC: 6)
  - [x] Author HCL mirroring `infra/gcp/` file layout: `versions.tf` (`cloudflare/cloudflare` v4 provider pin), `variables.tf`, `locals.tf`, resource `.tf` files (`zone.tf` proxy + TLS-strict, `waf.tf` Bot-Management + per-surface bot-score WAF rules, `turnstile.tf` widgets, `origin-ingress.tf` edge-only ingress, `observability.tf` logpush), `outputs.tf`, `terraform.tfvars.example`, `.gitignore`, `README.md`, `.terraform-plan-expectations.md`. (terraform not installed locally → fmt/validate is part of the deferred live-apply leg, per substrate pattern.)
  - [x] Update `infra/cloudflare/README.md` (was a PR-1 placeholder) to the real module README, keeping the landing-story map + adding the §5.8a capability→control table.
  - [x] Add a deferred D-item for the live `terraform apply` + zone onboarding (no live Cloudflare account here), citing the §5.8a DPDPA legal-review gate → `deferred-work.md` D1-1.13 (+ D2/D3/D4/D5-1.13).
- [x] **Task 7 — ADR-0010 edge/WAF + pivot-readiness** (AC: 7)
  - [x] Authored `docs/adr/ADR-0010-edge-waf-cloudflare-turnstile.md` from `_adr-template.md`. Cites architecture §5.8 (L3235–3277), §5.8a capability bar (L3279–3316), §2.11 (L1700–1716), §3.11 (L2372). Records substitution points §2.1/§2.11/§3.11/§5.8, the edge-only-ingress mechanism choice (`header_secret`→`tunnel`), Bot-Management plan-tier dependency, DPDPA-open status. Links `[[feedback_architecture_vs_adr_boundary]]`. Status `drafted`; added the `docs/knowledge-transfer/adr-index.md` row (decision-log entry is a governance follow-up).
- [x] **Task 8 — Tests** (AC: 8)
  - [x] `packages/edge/tests/turnstile-verifier.test.ts`: verifier unit tests (mock `fetch`): success; `success:false`+`error-codes`; `timeout-or-duplicate`; `internal-error`; network error fail-closed (+ failOpen override); non-2xx fail-closed; `idempotency_key` + `remoteip` passthrough; missing-token reject; empty-secret throws; no-op always-true. (12 tests.)
  - [x] `apps/api/tests/integration/turnstile-enforcement.spec.ts`: HERMETIC rejection block (verify→false → generic 401 + `login.failure` reason=turnstile, pre-DB, runs without a DB) for both login + password-reset; DB-gated pass-through block (false blocks vs true proceeds on the same valid account). Existing Story 1.9 auth suites unaffected (no-op default unchanged).
  - [x] Run `pnpm turbo lint typecheck test` green across touched workspaces.

## Dev Notes

### Scope reality — what exists, what is forward-referenced

The epic AC names two wiring targets: "**the public landing surface (Epic 11a)** and **authentication entry points (Story 1.9)**." Ground truth in this repo:

- **Auth entry points (Story 1.9) — EXIST and are the real wiring target.** `apps/api` Fastify is live with a `TurnstileVerifier` seam already called (but not enforced) at login + password-reset; `apps/admin` has a real React `LoginPage`. This is where Turnstile actually lands.
- **Public landing surface (Epic 11a) — DOES NOT EXIST yet.** `apps/public/` is a stub (`src/index.ts` + a smoke test); the Astro SSR shell is initialized in **Story 2.5** and extended in Epic 11a (architecture L4206–4222, epics.md L1387). **Do NOT scaffold Astro here.** The public-landing limb is satisfied by shipping the *consume-everywhere primitive* (`@twt/edge` verifier + a documented widget-mount recipe) that Story 2.5 / Epic 11a will mount on the real public forms. State this boundary explicitly in completion notes.
- **This is a `[PRIMITIVE]` story** — the deliverable weight is the abstraction + real verifier + infra/ADR, not member-facing UI.

### Architecture compliance — the §5.8a capability bar is the spec

Story 1.13 is the control mechanism for the architecture's **Edge / WAF capability bar** (vendor-neutral, outcome-oriented). The selected implementation must demonstrate (architecture §5.8a, L3285–3302):

- **Rate limiting** — per-IP + per-session (Cloudflare front-line is *Layer 1*; the §2.11 layered structure stays; **Story 1.14 owns the server-side rate-limit policy layer** — don't build it here). Named values: public search 60 req/min per IP, CAPTCHA challenge above (architecture L3483).
- **Bot management + CAPTCHA-style challenge** — allow/challenge/block; challenge on FR-88 surfaces (signup, claim filing, helpdesk forms).
- **Ingress signature verification** — verify inbound origin before backend (§3.11 webhook persist+ack assumes verified ingress).
- **Edge-only ingress** — backend not directly reachable from public internet; break-glass bypass is time-bounded + audit-logged (§5.8, L3251–3266).
- **DPDPA-compatible posture** — **OPEN**: Cloudflare-DPDPA compatibility is a [P0] surface pending legal review (architecture L247–254). **Do not assert compliance** anywhere; record the pivot path. Target region GCP `asia-south1`.
- **Observable edge metrics** — request/error/challenge/bot-classification rates queryable (Category 5).

**Pivot readiness (AR-52, the load-bearing constraint).** "Cloudflare-specific features sit behind a `packages/edge` provider-interface abstraction so a pivot to a different edge vendor is a single-module change" (epics.md L1246–1248, L4364). The four substitution points that must stay clean (§5.8a L3308–3313): **§2.1** (scraper threat → bot mgmt), **§2.11** (rate-limit Layer 1), **§3.11** (ingress signature), **§5.8** (edge-only ingress). Concretely: keep every `cloudflare`-named string, the siteverify URL, the widget script, and Bot-Management semantics *inside* `packages/edge` (and `infra/cloudflare/`). Consumers import only the neutral interface.

| AR | Commitment | Where it lands here |
|----|-----------|---------------------|
| **AR-33** | Edge-only ingress; backend not directly reachable; break-glass time-bounded + audited | `infra/cloudflare/` origin firewall + ADR-0010 mechanism |
| **AR-52** | Edge/WAF capability bar + pivot readiness; abstraction at `packages/edge` | `@twt/edge` package + ADR-0010 substitution points |
| **AR-25** | Multi-Pariwar URL path scope (referenced by 1.15, not this story) | n/a — context only |

### Reuse, do NOT reinvent — existing seams

Story 1.9 deliberately pre-built the Turnstile seam and handed the real integration to this story (deferred-work.md **D3-1.9** L140: *"the no-op `TurnstileVerifier` seam is called at the login + password-reset entry points; the real Cloudflare/edge integration is **Story 1.13**. Re-trigger: Story 1.13."*).

| Existing artifact | What it is | Action in 1.13 |
|---|---|---|
| `apps/api/src/modules/auth/shared/turnstile.ts` | `TurnstileVerifier` iface + `noopTurnstileVerifier` | **Promote** the interface into `@twt/edge`; replace this file with a thin re-export from `@twt/edge` (recommended — 3 import sites in context.ts:17, deps.ts:20, _setup.ts:21 need no changes) |
| `apps/api/src/deps.ts` L112 `turnstile: noopTurnstileVerifier` | DI wiring point | Swap to config-driven real-vs-noop selection |
| `apps/api/src/context.ts` L60 `readonly turnstile: TurnstileVerifier` | `AppDeps` member | Keep; just re-source the type from `@twt/edge` |
| `apps/api/tests/integration/_setup.ts` L21/77/118 | test override of `turnstile` | Keep; re-source import (via thin re-export, no path change). AC-8 integration test injects verifier directly via `buildTestDeps({ turnstile: { verify: async () => false } })` — do NOT set `TURNSTILE_SECRET_NAME` in TEST_ENV; the no-op default is intentional for all other tests |
| `packages/contracts/src/auth/login.ts` L16–17, `password-reset.ts` L15 | `turnstileToken: z.string().optional()` | **Reuse** — already present; do not re-add |
| `packages/queue/` (Story 1.12) | Reference primitive-package shape | **Copy the scaffolding pattern** for `packages/edge` (pure wrapper, no domain dep, registry of constants, sanctioned construction fn) |
| `apps/api/src/config.ts` (argon2 pepper) | Secret-NAME-not-value config pattern | **Mirror** for the Turnstile secret |
| `apps/api/src/deps.ts` `createSimpleWebAuthnProvider(...)` / `createLogStepUpDelivery(...)` | factory-injected provider precedent | **Mirror** for `createCloudflareTurnstileVerifier(...)` |
| `infra/gcp/` (`versions.tf`/`variables.tf`/`locals.tf`/`outputs.tf`/`terraform.tfvars.example`/`.terraform-plan-expectations.md`/`README.md`) | Terraform module convention | **Mirror** file-for-file for `infra/cloudflare/` |

### ⚠️ Load-bearing regression — `verify()` result is currently discarded

`admin-auth.handlers.ts` does `await deps.turnstile.verify({ token, remoteIp })` at **L46 (login)** and **L180 (password-reset)** **without checking the returned boolean**. The no-op (always `true`) has masked this. A real verifier that returns `false` would do nothing — the abuse gate would be inert. **AC-3 makes this a hard requirement:** capture the boolean and reject on `false` with the *generic* `UnauthorizedError('Invalid credentials', 'auth.invalid_credentials')` envelope (same anti-enumeration discipline as the lockout path in the same handler), and audit it. This is the "leave the system working end-to-end" obligation — it is a requirement even though the epic AC doesn't spell it out.

### Cloudflare Turnstile siteverify — verified API specifics (June 2026)

Authoritative ([Cloudflare server-side validation docs](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)):

- **Endpoint:** `POST https://challenges.cloudflare.com/turnstile/v0/siteverify`
- **POST params:** `secret` (required, the widget's secret key — **server-only**, never client), `response` (required, the client token), `remoteip` (optional), `idempotency_key` (optional UUID — lets a timed-out call be safely retried with the *same* token).
- **Response JSON:** `success` (bool), `challenge_ts` (ISO 8601), `hostname`, `error-codes` (array; empty on success), `action`, `cdata`. (`metadata.ephemeral_id` is Enterprise-only.)
- **Error codes:** `missing-input-secret`, `invalid-input-secret`, `missing-input-response`, `invalid-input-response`, `bad-request`, `timeout-or-duplicate` (token already validated — single-use; treat as fail), `internal-error` (retry-recommended → in prod, fail-closed).
- **Token is single-use** — a replay returns `timeout-or-duplicate`. Don't cache/replay tokens.
- **Client widget script:** `https://challenges.cloudflare.com/turnstile/v0/api.js`.
- **Testing keys (stable, well-documented — use in tests/local, never prod):**
  - Site key always-passes (visible): `1x00000000000000000000AA`; always-blocks: `2x00000000000000000000AB`; forces-interactive: `3x00000000000000000000FF`.
  - Secret key always-passes: `1x0000000000000000000000000000000AA`; always-fails: `2x0000000000000000000000000000000AA`; token-already-spent: `3x0000000000000000000000000000000AA`.
- **Security:** the secret key must only ever be used server-side in `@twt/edge`. Resolve it from Secret Manager (NAME in config), never an env literal in prod — same rule as the argon2 pepper.

### Bot Management — plan-tier nuance (for the ADR, not a code blocker)

Cloudflare **Bot Management** (ML bot score `cf.bot_management.score`, verified-bot list, managed challenge) is an **Enterprise add-on**; **Super Bot Fight Mode** is the Pro/Business equivalent. The architecture commits the *capability* ("bot management + challenge"), not the SKU. The `infra/cloudflare/` config expresses the intended WAF rules (per-surface sensitivity via bot-score thresholds); the actual enablement depends on the Cloudflare plan, which is an ops/contract decision. **Record this dependency in ADR-0010** so the capability bar isn't quietly assumed at a tier the trust hasn't bought. Per-surface "sensitivity" = WAF custom rules grouped by route (e.g. signup/claim/helpdesk stricter than read surfaces).

### Edge-only ingress mechanism — ADR decision

Architecture §5.8 (L3251–3260) commits the *property* (backend not publicly reachable) but defers the *mechanism* to an ADR contingent on edge selection. Candidates: **Cloudflare Tunnel (`cloudflared`)** — origin has no public ingress at all (cleanest for GCP Cloud Run private ingress); **Authenticated Origin Pulls (mTLS)**; or **IP-allowlist of Cloudflare ranges + a shared-secret header**. Pick one in ADR-0010 and express it in `infra/cloudflare/` (+ the GCP ingress side is `infra/gcp/`, but live wiring is deferred with the rest). Optionally add a defense-in-depth Fastify guard behind `@twt/edge` (e.g. verify a Cloudflare-set header / shared secret) — keep that vendor-neutral too. Break-glass path must stay time-bounded + audit-logged (§5.8 L3257–3266).

### Config / env additions

Follow `apps/api/.env.example` + `config.ts` conventions exactly:
- `TURNSTILE_SECRET_NAME` — Secret Manager secret NAME for the Turnstile secret key (prod; value never in env). **This var is OPTIONAL** — unlike `ARGON2_PEPPER_SECRET_NAME` which uses `requireEnv()` and throws on startup if absent. Turnstile uses `env['TURNSTILE_SECRET_NAME']` (returns `undefined` if not set) so the seam stays no-op in all environments that haven't provisioned the secret. Do NOT use `requireEnv()` here.
- Optional `TURNSTILE_SITE_KEY` for server-side parity / docs. The admin app uses a build-time `VITE_TURNSTILE_SITE_KEY` (site keys are public).
- Absent secret ⇒ `deps.ts` keeps `noopTurnstileVerifier` ⇒ stack boots and tests pass with zero Cloudflare config. Document all new vars in `apps/api/.env.example` with the "do not set values in non-local contexts" preamble.

### Testing standards + project gotchas

- **Vitest**, `vitest run --passWithNoTests`, per-package `vitest.config.ts` (copy `packages/queue/vitest.config.ts`). Mock global `fetch` for verifier unit tests — no live network.
- **No live Cloudflare** in tests/CI — the no-op default keeps the suite hermetic; the real verifier is exercised purely against a mocked `fetch`.
- **Live-DB test gotchas** (carry-over, [[project_live_db_test_gotchas]]): if any test touches the DB — never regenerate an applied migration (drizzle skips by journal `when`, not SQL hash → 42P07); never reset via `DROP SCHEMA` (strips `twt_app` USAGE → 42P01); own-committing writers accumulate rows → assert membership, not counts. (Story 1.13 likely needs **no** migration — Turnstile/edge is stateless config + a verifier seam. If you find yourself adding a table, stop and reconsider.)
- Keep `apps/api` Story 1.9 auth integration suites green — they're the regression guard for AC-3.

### Previous-story intelligence (Story 1.12, pg-boss primitive)

- `packages/queue` is the freshest `[PRIMITIVE]`-package precedent: pure wrapper, **no `@twt/domain` dependency**, a `QUEUE_NAMES` constants registry, a single sanctioned construction fn (`createQueueClient`) + graceful-stop helper, types re-exported from one place. Replicate this shape for `@twt/edge` (one construction fn, constants registry, neutral types, no domain coupling).
- Commit discipline ([[project_story_automator_ops]]): commit manually — branch + selective stage (not the `commit-story` helper).

### Project Structure Notes

- **`packages/edge` is a deliberate variance from the architecture source tree.** Architecture's §Project Structure (L4140–4419) does NOT list `packages/edge`; its §4.13 security mapping (L4529) points only to `infra/cloudflare/` + `apps/api/src/plugins/rate-limit/`. The **epics override** (AR-52, epics.md L1248 + L4364, Sprint Change Proposal Item 6) explicitly require the `packages/edge` provider-interface. Per [[feedback_architecture_vs_adr_boundary]], the epic/ADR layer commits the control mechanism; this is an intentional, recorded addition, not a freelance structure invention. Note it in completion notes + ADR-0010. (`packages/platform-adapters/` is the sibling "substrate-agnostic" home but is UI-oriented; `packages/edge` is the right new home for the edge seam.)
- New package auto-resolves via `pnpm-workspace.yaml` `packages/*` glob — no workspace-file edit.
- Terraform: `infra/cloudflare/` mirrors `infra/gcp/` exactly (same file set + `.terraform-plan-expectations.md` for the deferred live-apply leg). Provider: `cloudflare/cloudflare`.
- ADR number: existing run is ADR-0003…ADR-0009 → **ADR-0010** is next.

### References

- epics.md L1232–1248 — Story 1.13 ACs (FR-88, AR-33, AR-52, `packages/edge` single-module-change). [Source: _bmad-output/planning-artifacts/epics.md]
- epics.md L306 (AR-33), L337 (AR-52), L976 (Epic-1 anchoring ARs), L163 (FR-88), L211 (NFR-17), L4364 (packages/edge per AR-52), L1387 (Astro shell = Epic 2/Story 2.5).
- architecture.md §5.8 Network topology L3235–3277; §5.8a Edge/WAF capability bar + pivot disposition L3279–3316; §2.11 Rate limiting L1700–1716; §3.11 Webhook ingress L2372; P0 edge-DPDPA risk L247–254; budgets L3482–3483; source tree L4140–4419 (infra dirs L4165–4168); §4.13 security mapping L4529; external integrations L4573. [Source: _bmad-output/planning-artifacts/architecture.md]
- deferred-work.md L140 — D3-1.9 (Turnstile real integration → 1.13). [Source: _bmad-output/implementation-artifacts/deferred-work.md]
- Existing code seams: `apps/api/src/modules/auth/shared/turnstile.ts`; `apps/api/src/modules/auth/admin/admin-auth.handlers.ts` L46/L180 (result discarded — AC-3); `apps/api/src/deps.ts` L112; `apps/api/src/context.ts` L60; `apps/api/src/config.ts` (argon2-pepper pattern); `apps/api/tests/integration/_setup.ts` L21/77/118; `packages/contracts/src/auth/login.ts` L16–17 + `password-reset.ts` L15; `apps/admin/src/routes/LoginPage.tsx`; `apps/admin/src/api/client.ts` L109/L141; `packages/queue/` (primitive pattern); `infra/gcp/*.tf` + `infra/cloudflare/README.md`.
- Cloudflare Turnstile server-side validation — https://developers.cloudflare.com/turnstile/get-started/server-side-validation/ ; client widget — https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/
- ADR convention: `docs/adr/_adr-template.md`; `docs/adr/ADR-0009-admin-authentication.md` (style exemplar).

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (Opus 4.8) — bmad-dev-story workflow.

### Debug Log References

- **pnpm link ordering.** `pnpm install` was first run before `@twt/edge` was declared in `apps/api/package.json`, so the `apps/api → @twt/edge` symlink wasn't created and `tsc` reported `TS2307: Cannot find module '@twt/edge'`. Re-running `pnpm install` after adding the workspace dep created the symlink; typecheck then clean. (Lesson: add the consumer's `workspace:*` dep BEFORE `pnpm install`.)
- **node:crypto in the browser bundle.** The admin `LoginPage` does NOT import `@twt/edge` (its `turnstile.ts` imports `node:crypto` for `randomUUID`, which would break the Vite browser build). The widget script URL is inlined in `LoginPage.tsx` with a comment cross-referencing `@twt/edge`'s `TURNSTILE_WIDGET_SCRIPT_URL`. This keeps the one admin-side Cloudflare touch-point isolated to a single component (client-side pivot seam).
- **Live-DB verification.** An unrelated Postgres on `127.0.0.1:5432` lacks the project role (NOT mutated); the project's test DB is the `twt-test-pg` Docker container on **5433** ([[project_live_db_test_gotchas]]). Pointed `DATABASE_URL` at it (migrations already 14/14) and ran the **full** apps/api integration suite: **66/66 passed, 0 skipped** — including the new DB-gated turnstile pass-through/block block AND the 13-test `admin-auth.spec.ts` AC-3 regression guard (no-op default unchanged ⇒ Story 1.9 auth fully green). The AC-3 rejection guard is ALSO hermetic (pre-DB) so it runs without a DB too.

### Completion Notes List

- **AC-1 `@twt/edge` package** — new `packages/edge` mirrors the `@twt/queue` primitive shape exactly (pure wrapper, **no `@twt/domain` dependency**, constants registry, single sanctioned `createCloudflareTurnstileVerifier` factory + `noopTurnstileVerifier` default, neutral types re-exported from one barrel). Exports the `TurnstileVerifier` interface, the `EdgeProvider` forward-looking aggregate, `TURNSTILE_SITEVERIFY_URL` / `TURNSTILE_WIDGET_SCRIPT_URL`, and the documented Cloudflare testing keys.
- **AC-2/AC-4 real verifier + config-driven selection** — `createCloudflareTurnstileVerifier` POSTs siteverify (`secret`+`response`+optional `remoteip`/`idempotency_key`), returns `success === true`, **fails closed** on transport failure (network/timeout/non-2xx/unparseable) with a configurable `failOpen` (default false); a `success:false` verdict (incl. `timeout-or-duplicate`/`internal-error`) is always a reject. `deps.ts` selects real-vs-noop from `config.turnstile.secretName` (OPTIONAL `TURNSTILE_SECRET_NAME` via `env[...]`, NOT `requireEnv`); absent ⇒ no-op ⇒ stack boots with zero Cloudflare config. Secret resolves through the existing `resolveSecretValue` (Secret-Manager-NAME-not-value, mirrors the argon2 pepper). The old `apps/api/.../shared/turnstile.ts` is now a thin re-export from `@twt/edge` — the 3 import sites are unchanged.
- **AC-3 load-bearing regression FIXED** — `admin-auth.handlers.ts` `login` + `passwordResetRequest` previously `await`ed `deps.turnstile.verify(...)` but **discarded the boolean**. They now capture it and, on `false`, emit `login.failure` (reason `turnstile`) + throw the GENERIC `UnauthorizedError('Invalid credentials','auth.invalid_credentials')` (anti-enumeration — never "captcha failed"). No-op default returns true ⇒ Story 1.9 suite stays green. Grep confirms these are the only two `turnstile.verify` sites.
- **AC-5 admin widget** — `LoginPage` renders the Cloudflare Turnstile widget (explicit `window.turnstile.render`) gated on build-time `import.meta.env.VITE_TURNSTILE_SITE_KEY` (added `apps/admin/src/vite-env.d.ts` typing); absent ⇒ no widget (dev default). `api.login(email, password, turnstileToken?)` forwards the token ONLY (the `LoginRequest` contract already carries `turnstileToken?` — reused). The widget resets after submit (single-use token). `api.consumeRecovery()` deliberately untouched (recovery is the MFA second factor, not Turnstile-gated). **The admin password-reset UI is deferred (DD-2)** — the server endpoint IS gated, but no client reset form exists yet (D4-1.13).
- **AC-6 `infra/cloudflare/` Terraform (deferred-apply)** — full module mirroring `infra/gcp/` (`versions.tf` pins `cloudflare/cloudflare` v4; `zone.tf` proxy+TLS-strict; `waf.tf` Bot-Management + per-surface bot-score WAF rules; `turnstile.tf` widgets; `origin-ingress.tf` edge-only ingress; `observability.tf` logpush; outputs/tfvars/.gitignore/README/.terraform-plan-expectations). **Live apply is deferred (D1-1.13)** — no live zone; gated on the §5.8a DPDPA legal review (recorded OPEN, compliance NOT asserted).
- **AC-7 ADR-0010** — `docs/adr/ADR-0010-edge-waf-cloudflare-turnstile.md` (status `drafted`): Cloudflare v1 default, the `packages/edge` abstraction + four §5.8a substitution points, edge-only-ingress mechanism (`header_secret` default → `tunnel` end-state), Bot-Management plan-tier dependency, DPDPA-OPEN. Added the `docs/knowledge-transfer/adr-index.md` row. **Governance follow-up:** the `.decision-log.md` ratification entry + the index row's Decision number are pending the trustee step (not fabricated here).
- **AC-8 tests** — 12 verifier unit tests (mocked `fetch`, hermetic) + the apps/api integration spec (hermetic AC-3 rejection for both endpoints + DB-gated false-blocks-vs-true-proceeds) + 2 admin widget-gating tests. `pnpm turbo run lint typecheck test` green across the whole repo (53/53 tasks); the full apps/api integration suite verified against the live `twt-test-pg` DB (66/66, 0 skipped) — the `admin-auth` suite is the AC-3 regression guard.
- **Scope boundary (stated explicitly per Dev Notes).** The epic AC names "public landing surface (Epic 11a) + auth entry points (Story 1.9)". `apps/public` is a STUB (the Astro shell is Story 2.5; Epic 11a not built) — **no Astro was scaffolded**. The public-landing limb is satisfied by shipping the *consume-everywhere primitive* (`@twt/edge` verifier + the documented widget-mount recipe now live on apps/admin LoginPage); Story 2.5 / Epic 11a mounts it on the real member forms (D3-1.13).
- **Recorded source-tree variance.** `packages/edge` is NOT in architecture's §Project Structure (which lists only `infra/cloudflare/` + `plugins/rate-limit/`); the epics layer (AR-52, Sprint Change Proposal Item 6) override-requires it. Recorded in ADR-0010 + here per [[feedback_architecture_vs_adr_boundary]] (epic/ADR commits the control mechanism).
- **No migration** — Turnstile/edge is stateless config + a verifier seam; no table added (per [[project_live_db_test_gotchas]] guidance).
- **Deferred legs** opened in `deferred-work.md`: D1-1.13 (live apply, DPDPA-gated), D2-1.13 (GCP edge-ingress side → 1.15), D3-1.13 (FR-88 member surfaces → 2.5/11a), D4-1.13 (admin password-reset UI widget), D5-1.13 (Bot-Management plan tier). Discharges deferred-work D3-1.9 (Turnstile real integration).

### File List

**New — `packages/edge` (`@twt/edge`, AC-1/2/4/8):**
- `packages/edge/package.json`
- `packages/edge/tsconfig.json`
- `packages/edge/eslint.config.js`
- `packages/edge/vitest.config.ts`
- `packages/edge/src/index.ts`
- `packages/edge/src/turnstile.ts`
- `packages/edge/tests/turnstile-verifier.test.ts`

**New — apps/api tests (AC-8):**
- `apps/api/tests/integration/turnstile-enforcement.spec.ts`

**New — apps/admin (AC-5):**
- `apps/admin/src/vite-env.d.ts`
- `apps/admin/tests/login-turnstile.test.tsx`

**New — infra/cloudflare Terraform (AC-6):**
- `infra/cloudflare/versions.tf`
- `infra/cloudflare/variables.tf`
- `infra/cloudflare/locals.tf`
- `infra/cloudflare/zone.tf`
- `infra/cloudflare/waf.tf`
- `infra/cloudflare/turnstile.tf`
- `infra/cloudflare/origin-ingress.tf`
- `infra/cloudflare/observability.tf`
- `infra/cloudflare/outputs.tf`
- `infra/cloudflare/terraform.tfvars.example`
- `infra/cloudflare/.gitignore`
- `infra/cloudflare/.terraform-plan-expectations.md`

**New — ADR (AC-7):**
- `docs/adr/ADR-0010-edge-waf-cloudflare-turnstile.md`

**Modified — apps/api (AC-2/3/4):**
- `apps/api/package.json` (add `@twt/edge` workspace dep)
- `apps/api/src/config.ts` (OPTIONAL `turnstile` config block)
- `apps/api/src/deps.ts` (config-driven `buildTurnstileVerifier`)
- `apps/api/src/modules/auth/admin/admin-auth.handlers.ts` (AC-3 enforce verdict)
- `apps/api/src/modules/auth/shared/turnstile.ts` (thin re-export from `@twt/edge`)
- `apps/api/.env.example` (document new `TURNSTILE_*` vars)

**Modified — apps/admin (AC-5):**
- `apps/admin/src/api/client.ts` (`login` optional `turnstileToken`)
- `apps/admin/src/routes/LoginPage.tsx` (Turnstile widget)

**Modified — docs / infra / tracking:**
- `infra/cloudflare/README.md` (placeholder → real module README)
- `docs/knowledge-transfer/adr-index.md` (ADR-0010 row)
- `_bmad-output/implementation-artifacts/deferred-work.md` (D1–D5-1.13)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (status flip)
- `pnpm-lock.yaml` (workspace link)

### Review Findings

- [x] [Review][Decision] AC-5 "login + recovery" spec wording vs implementation that excludes consumeRecovery — DISMISSED. "recovery" in AC-5 refers to the password-reset recovery flow (deferred D4-1.13), not the MFA recovery-code second factor. `recoveryConsume` is intentionally excluded: the server handler does not call `turnstile.verify()` and `RecoveryConsumeRequest` carries no `turnstileToken` field; adding it would be dead code. Implementation is correct.

- [x] [Review][Patch] `res.json()` failure after a 200 OK falls into the transport-error catch → `failOpen=true` silently passes the user [packages/edge/src/turnstile.ts]
- [x] [Review][Patch] WAF `cloudflare_ruleset.waf_custom` always created; `cf.bot_management.score` evaluates to 1 on plans without Bot Management → entire auth/sensitive surface blocked/challenged at apply [infra/cloudflare/waf.tf]
- [x] [Review][Patch] Literal placeholder `REPLACE_AT_APPLY__edge_auth_secret` committed to git with no apply-time validation preventing accidental use [infra/cloudflare/origin-ingress.tf]
- [x] [Review][Patch] Script `load` event listener added to existing element but never removed in useEffect cleanup → listener leak under React Strict Mode [apps/admin/src/routes/LoginPage.tsx]
- [x] [Review][Patch] No cross-variable validation: `bot_score_sensitive_threshold` < `bot_score_challenge_threshold` silently inverts the per-surface security posture [infra/cloudflare/variables.tf]
- [x] [Review][Patch] `passwordResetRequest` Turnstile failure emits `login.failure` event type, conflating login brute-force with password-reset abuse in audit queries — `password_reset.failure` would match the existing naming pattern [apps/api/src/modules/auth/admin/admin-auth.handlers.ts:195]

- [x] [Review][Defer] Stale spent Turnstile token state on hypothetical back-navigation from MFA stage to credentials stage [apps/admin/src/routes/LoginPage.tsx] — deferred, pre-existing; back-navigation from MFA to credentials is not exposed in the current UI
- [x] [Review][Defer] `starts_with` matching on sensitive path prefixes silently inherits strict bot-score threshold for future routes sharing a prefix (e.g. `/api/v1/auth/login-*`) [infra/cloudflare/locals.tf] — deferred, pre-existing; design choice in deferred-apply HCL, acceptable as authored

**Second-pass findings (re-run post-patch):**

- [x] [Review][Patch] `outputs.tf` references `cloudflare_ruleset.waf_custom.id` as a scalar; after the first-pass F3 count gate this causes `Error: Missing resource instance key` at `terraform plan` when `enable_bot_management = false` → fixed with `var.enable_bot_management ? cloudflare_ruleset.waf_custom[0].id : null` [infra/cloudflare/outputs.tf]
- [x] [Review][Patch] No plan-time guard for `var.edge_auth_secret = null` when `edge_only_ingress_mechanism = "header_secret"` → added `lifecycle.precondition` on `cloudflare_ruleset.edge_origin_auth` for a clear plan-time error [infra/cloudflare/origin-ingress.tf]

### Change Log

| Date | Change |
|---|---|
| 2026-06-15 | Story 1.13 implemented (Tasks 1–8). New `@twt/edge` primitive (vendor-neutral Turnstile verifier + no-op default + Cloudflare siteverify factory); config-driven real-vs-noop selection in apps/api; **AC-3 regression fix** (enforce the previously-discarded `turnstile.verify` verdict at login + password-reset); admin LoginPage Turnstile widget (site-key-gated); `infra/cloudflare/` Terraform (deferred-apply); ADR-0010 (drafted); tests green repo-wide (53/53 turbo tasks). Status → review. |
