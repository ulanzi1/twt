# Story 3.3a: DigiLocker Provider-Interface Abstraction

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As Solo Builder authoring the KYC primitive that downstream stories (signup KYC in 3.3b, the future hard-mandatory feature flag) consume,
I want a DigiLocker integration sealed behind a provider-interface abstraction,
so that architectural-freeze **row 13** (AR-43) is enforced by construction — a future KYC-provider swap is a single-module change, not a rewrite.

## Acceptance Criteria

Verbatim from epics.md#Story 3.3a (lines 1646-1663), with reconciliations folded into Dev Notes. **The epic's `packages/digilocker` location is superseded — see Dev Notes §CRITICAL.**

**AC1 — the frozen abstraction (Given AR-43 + architectural-freeze row 13)**
1. A `KycProvider` interface exposes exactly three methods: `initiate(memberId, intent)`, `verifyAndPullProfile(callbackPayload)`, `getStatus(transactionId)`.
2. The concrete DigiLocker implementation lives in **one** provider module; it is the **only** place the DigiLocker OAuth client / eAadhaar-XML transport is imported.
3. Consumer code imports **only** the `KycProvider` type (and the neutral `KycProfile` / `KycError` types) — never the DigiLocker concrete client. **A CI gate asserts no code outside the provider directory imports the DigiLocker SDK/transport.**
4. The pulled profile is mapped to a provider-neutral `KycProfile` shape: `aadhaarMaskedId`, `name`, `dob`, `photoUrl`, `verificationStrength`.
5. Failure modes are normalized into a provider-neutral `KycError` taxonomy: at minimum `provider_unavailable`, `user_consent_denied`, `verification_failed` (+ `signature_invalid`, `certificate_stale`, `transaction_expired`, `transaction_not_found`).

**AC2 — provider swap is a single-module change (Given a future provider swap)**
6. The active provider is chosen by a registry/selector seam designed so a future **FR-58C** feature-flag flip selects a different `KycProvider` implementation **with no consumer code change**. (FR-58C flag *infrastructure* is not built yet — wire the seam with a safe default; see Dev Notes §Provider registry.)

**AC3 — signature trust (Given architecture §2.8 / §3.8 signature-verification policy)**
7. The DigiLocker provider verifies the eAadhaar PKI signature against a cached issuer public certificate; verification failure normalizes to `KycError(verification_failed | signature_invalid)` and **never** silently accepts. Cached-certificate staleness obeys the two-window budget (within-budget → trust + alarm; past hard-limit → fail closed). Staleness-budget **values live in `ADR-0026-digilocker-signature-policy`, which this story authors** (its adr-index write-trigger is "Story 3.3a closure" — Task 7); the code wires the mechanism reading those values via named constants. Do **not** hardcode invented numbers.

## Tasks / Subtasks

- [x] **Task 1 — Author the frozen abstraction in `@twt/contracts/kyc`** (AC: #1, #4, #5)
  - [x] In `packages/contracts/src/kyc/` author the provider-neutral contract (replacing the placeholder `.gitkeep`): `KycProvider` interface (3 methods), `KycProfile`, `KycError`/`KycErrorCode`, plus supporting types `KycIntent`, `KycInitiation`, `KycCallbackPayload`, `KycTransactionStatus`, `KycVerificationStrength`.
  - [x] All `z.object({...})` end with `.strict()` (the contracts directory discipline — see `kyc/README.md`). Data shapes (`KycProfile`, `KycError`, `KycInitiation`, …) are Zod schemas + paired `z.output` types. `KycProvider` is a **pure TS interface** (a port; no runtime).
  - [x] Add a `KycProviderError` class that `extends Error` directly (there is **no** base error class in contracts — `_common/errors.ts` contains only the `ErrorCode` type, `defineErrorCode` factory, and `ErrorResponse` Zod schema; `errors/index.ts` is a blank barrel stub). Mirror the exact pattern of `ConsentNotFoundError` / `MemberStateDirectWriteError` in `packages/domain/src/*/errors.ts`: `public readonly name = 'KycProviderError'`, `public readonly code: KycErrorCode`, `public readonly retriable: boolean`. Add a `toErrorResponse(requestId: string)` projector returning `{ error: { code, message, details: { retriable }, request_id: requestId } }` — define `ErrorResponseShape` as a local interface in the file (same technique as `packages/domain/src/errors.ts` line 44-52; contracts cannot mirror the domain's import of it because that would cycle). The app boundary `catch`es `KycProviderError` and maps `code` → HTTP status.
  - [x] Re-export from the top barrel: add `export * from './kyc/index.js';` to `packages/contracts/src/index.ts` with the Story-3.3a provenance comment. **No `.openapi()` registration** in 3.3a (no HTTP endpoint yet → `openapi/v1.yaml` stays byte-identical; `contracts:check-openapi-determinism` green).
- [x] **Task 2 — DigiLocker provider implementation** (AC: #1, #2, #4, #5, #7)
  - [x] Author `apps/api/src/modules/kyc/providers/digilocker/` implementing `KycProvider`. This directory is the **sole** holder of DigiLocker-specifics (OAuth2 client, eAadhaar-XML fetch + parse, PKI signature verification, mapping to `KycProfile`, error normalization).
  - [x] `initiate(memberId, intent)`: OAuth 2.0 authorization-code + **PKCE** — generate `state` + `code_verifier`/`code_challenge`; validate `redirect_uri` against the server-side allowlist (§2.8); persist a `kyc_transactions` row; return `KycInitiation { transactionId, authorizationUrl, expiresAt }`.
  - [x] `verifyAndPullProfile(callbackPayload)`: validate `state` ↔ transaction; exchange `code` at the token endpoint; pull eAadhaar XML; verify PKI signature against the cached cert (Task 3); map to `KycProfile` (mask Aadhaar to last 4 → `aadhaarMaskedId`; `verificationStrength: 'aadhaar_kyc'`); normalize all failure paths to `KycError`. Apply HTTP timeout + circuit-breaker + retry per §3.12; respect NFR-27 (8s p95 budget — surface a timeout as `provider_unavailable`). _(Timeout via AbortController → `provider_unavailable`; a single-request circuit-breaker is documented as the §3.12 shared-infra hook — the seam is never live-exercised in 3.3a.)_
  - [x] `getStatus(transactionId)`: return `KycTransactionStatus` from the `kyc_transactions` row.
  - [x] Isolate the transport/SDK dependency here and **pin it** with provenance per §2.8 (npm provenance / SLSA; no auto-update of supply-chain-sensitive packages). No first-party Node SDK exists (see §Latest Tech) → implement a direct OAuth2 client (e.g. `undici`/`fetch` + PKCE) + XML signature verification (e.g. `xml-crypto`). _(Node 22 global `fetch` — no `undici` needed; `xml-crypto` pinned EXACTLY to `6.1.2` in apps/api.)_
- [x] **Task 3 — Cert cache + transaction persistence (domain schema + ONE migration)** (AC: #7)
  - [x] `packages/domain/src/schema/digilocker_public_certs.ts` — issuer public-certificate cache (`cert_id`, `pem`, `fetched_at`, `not_after`, …) per §3.8. _(GLOBAL infra table — see RLS note below.)_
  - [x] `packages/domain/src/schema/kyc_transactions.ts` — provider transaction state: `transaction_id`, `member_id`, `pariwar_id`, `provider`, `intent`, `state` (OAuth state), `code_verifier` (secret — **store plaintext, rely on short TTL + RLS**; hashing adds complexity without benefit given the 15-minute expiry window and row-level isolation; **never logged**), `redirect_uri` (stored at `initiate` time, validated on `verifyAndPullProfile` callback — prevents a redirect swap between initiation and callback; not a secret but critical for OAuth PKCE integrity), `status`, `created_at`, `expires_at`. TTL is enforced at the application layer via an `expires_at` check in `verifyAndPullProfile` — a transaction past its `expires_at` normalizes to `KycError(transaction_expired)`. **Stores NO eAadhaar PII** — the `KycProfile` is returned to the caller (3.3b persists it under its own PII policy), never parked here.
  - [x] RLS policies in `packages/domain/src/policies/` (tenant-isolated) + register in the policies barrel; cert-cache + transaction accessors in `packages/domain/src/kyc/` (read/write/index) + `export * as kyc from './kyc/index.js';` in the domain top barrel. **Key security accessor:** `deactivateDigiLockerCert(keyId)` in `write.ts` — sets `is_active = false`, **never deletes** (row preserved for audit); called in the ADR-0026 §4 key-compromise procedure (step 1). Find it by name in an incident. _(VARIANCE: `kyc_transactions` is tenant-isolated as written; `digilocker_public_certs` is GLOBAL-access (member-auth carve-out posture) — issuer certs have no tenant dimension + the unscoped daily refresh job must write them. A tenant predicate would break both. Both ENABLE+FORCE RLS.)_
  - [x] `refreshDigiLockerCerts()` refresh function + the two-window staleness-budget evaluation (within-budget vs hard-limit) living with the provider, reading the budget values from `ADR-0026` named constants (Task 7). **Cron wiring** (`apps/jobs` daily pg-boss job) is the operational seam — ships in **3.3b/ops** (confirmed split); 3.3a delivers the function only. _(Both live in `providers/digilocker/{cert-refresh,staleness-policy}.ts`.)_
  - [x] **Migration:** generate ONCE → inspect → hand-supplement `GRANT`/`FORCE ROW LEVEL SECURITY` → migrate :5433 → `db:check` "Everything's fine". **Next number is `0023`.** Never regenerate an applied migration; never `DROP SCHEMA` ([[project_live_db_test_gotchas]]). Caveat: 0021/0022 snapshots are hand-managed/absent. _(DECISION: HAND-AUTHORED `0023_kyc-digilocker.sql` — NOT `db:generate`. With snapshots stopping at 0020, a generate would diff against 0020 and wrongly re-emit the already-applied otp_rate_buckets + member_pariwar_selects → 42P07. Followed the 0021/0022 hand-authored precedent + 0017 tenant-RLS DDL. `db:check` green; applied + RLS verified on :5433.)_
- [x] **Task 4 — Provider registry + FR-58C swap seam** (AC: #2, #6)
  - [x] `apps/api/src/modules/kyc/provider-registry.ts` — `getActiveKycProvider(ctx): KycProvider`. Today returns the DigiLocker provider (the only registered impl) via a documented seam where a future FR-58C flag read selects among registered providers. **No consumer change** when a new provider is registered + the flag flips. _(The flag read is a DOCUMENTED seam — FR-58C infra is not built; `createKycProviderRegistry` selects by `activeProviderKey`.)_
  - [x] Config/secrets seam (`apps/api/src/config.ts` + `deps.ts`): DigiLocker `client_id`/`client_secret` are **Secret-Manager NAMEs** resolved via `resolveSecretValue` (never env literals in prod — §2.3/AC-1 pattern). Mirror the **Turnstile optional seam**: absent DigiLocker config resolves to a **fixture provider** so the stack boots with zero live-govt config and CI never hits the real API. _(`buildKycProviderRegistry` mirrors `buildTurnstileVerifier`; `kycProviders` added to `AppDeps` + test `_setup.ts`.)_
  - [x] **No route registration in 3.3a** (PRIMITIVE — no surface). `registerKycModule` + `server.ts` wiring + HTTP routes land in **3.3b**. Wire the provider + registry as importable units only.
- [x] **Task 5 — CI import-boundary gate** (AC: #3)
  - [x] Add `scripts/kyc-provider-boundary/{lib.ts,lib.test.ts,check.ts,README.md}` — an **AST scanner** (clone `scripts/member-state-invariant/` exactly: pure `lib.ts` + DB-free `lib.test.ts` + `check.ts` entrypoint, precision-scan not git-diff, self-green by construction). It scans `apps/api/src` + `packages/*/src` and fails (exit 1, naming file+line) on any import of the DigiLocker SDK/transport (`xml-crypto` + `@xmldom/xmldom`/`xpath`/`@xmldom/is-dom-node`) from outside the **allowlist** = `apps/api/src/modules/kyc/providers/digilocker/**`. _(267 files scanned, self-green; the fixture signer that imports xml-crypto lives under tests/, outside the src scan scope.)_
  - [x] Register `kyc-provider:test` + `kyc-provider:check` in root `package.json`; add a `run "kyc-provider-boundary" …` line to `scripts/ci-local.sh` AND the matching job to `.github/workflows/ci.yml`.
  - [x] Optional companion: a `no-restricted-imports` rule in `packages/eslint-config-twt` banning the DigiLocker package outside the provider dir. _(PARKED as a `// TODO` mirroring the crowdfunding-SDK TODO — an active base-ban + digilocker carve-out would have to re-declare the whole rule to preserve the `pg` ban given the per-package cwd-glob model [[project_eslint_config_per_package_cwd]]; net risk > value for a dev-time hint when the CI gate is the authoritative teeth.)_
- [x] **Task 6 — Tests + green merge gate** (AC: all)
  - [x] **Unit (DB-free):** `KycProfile` mapping; `KycError` normalization for each failure code; signature verification with **fixtures** (a known-good signed eAadhaar XML + issuer cert, and tampered/wrong-cert negatives); registry selection; fixture-provider seam. _(`apps/api/tests/unit/kyc-provider.test.ts`; `packages/contracts/tests/kyc.test.ts` — 23 contract tests.)_
  - [x] **Integration (:5433):** cert-cache + `kyc_transactions` accessors + RLS (`SET LOCAL ROLE twt_app` before asserting policy — superuser bypasses RLS). _(domain `kyc-substrate.spec.ts` — 7 tests; api `digilocker-provider.spec.ts` — 6 tests full-flow + AC5 negatives + cert-refresh. Membership asserts; per-test ROLLBACK isolation.)_
  - [x] Run `pnpm ci:local` (the merge gate — mirrors all ci.yml jobs incl. the new `kyc-provider-boundary`) per [[project_ci_actions_suspension_local_mirror]]; integration needs `DATABASE_URL` on :5433. **`ci:local PASSED — 18 jobs green` (final code state).**
- [x] **Task 7 — Author `ADR-0026-digilocker-signature-policy` (this story is the ADR's write-trigger)** (AC: #7)
  - [x] The adr-index slot `ADR-NNNN-digilocker-signature-policy` (Section A, line 82) is `slot-reserved-pre-write` with trigger **"Story 3.3a closure"** — so 3.3a **authors it**. Next free number is **0026**. Mirror the Story 1.9 → ADR-0009 authoring pattern.
  - [x] Write `docs/adr/ADR-0026-digilocker-signature-policy.md` with `Status: drafted`. Commit the **values the code reads**: the two-window staleness budget (within-budget **7d** + hard-limit **30d**), key-rotation cadence, key-compromise / re-verification procedure, and offline-cache validity semantics. **The values live in the ADR** — the provider reads them via named constants citing `ADR-0026` (`staleness-policy.ts`).
  - [x] Flip the adr-index Section A row (line 82) `slot-reserved-pre-write` → `drafted`; update the status-summary counts (`slot-reserved` 119→118, `drafted` 0→1) + append a dated summary note. Trustee ratification is a later event — landed `drafted` (un-attested-pending), not `ratified`. _(Total unchanged at 143 — slot FILL, not new row.)_
  - [x] Update the `ADR-NNNN` reference in `packages/contracts/src/kyc/README.md` to `ADR-0026`.

## Dev Notes

### CRITICAL — package location (resolves an epic-vs-architecture conflict)
The epic AC text says author in **`packages/digilocker`** with `packages/digilocker/providers/digilocker.ts`. **Do NOT create that package.** This mirrors the exact Story 3.1 precedent (epic said `packages/member-lifecycle`; reality was `packages/domain/src/member/`). The canonical homes are a **two-part split**:

1. **Frozen provider-neutral abstraction → `packages/contracts/src/kyc/` (`@twt/contracts`).** This directory already exists as a **purpose-built placeholder**: its `README.md` names *"Stories 3.3 / 3.3a / 3.3b"* as the landing stories and says "DigiLocker provider abstraction + signature verification policy" lands here, consumed via `@twt/contracts`. It also pre-commits the discipline: `.strict()` default, and **no type-shadowing** ("do NOT redeclare types in `apps/api/modules/kyc/kyc.types.ts` that shadow contracts here"). The `KycProvider` port + `KycProfile` + `KycError` are exactly this abstraction.
2. **DigiLocker concrete provider → `apps/api/src/modules/kyc/providers/digilocker/`.** Architecture §3.8 (line 2314) commits "Provider interface in `apps/api/modules/digilocker/`; isolates the DigiLocker SDK"; the canonical source tree (line 4275) + integration list (line 4564) both name **`apps/api/src/modules/kyc/`** as "DigiLocker + manual fallback (FR-2) behind a provider interface." Architecture commits structural location and is newer than epics.md ([[feedback_architecture_vs_prd_boundary]]).

**Consume convention:** the top barrel, `import type { KycProvider, KycProfile, KycError } from '@twt/contracts'` (matches `members/index.ts`: "Consume via the `@twt/contracts` top barrel"). **⚠️ The kyc README explicitly says `import type { Foo } from '@twt/contracts/kyc'` — this is WRONG and aspirational.** The contracts `package.json` has no `exports` map (`"main": "./src/index.ts"` only), so no subpath resolution exists. Do **not** add a subpath exports entry to contracts `package.json` in this story. Always use the top barrel (`@twt/contracts`). If you read the kyc README during Task 1 and see that import path, ignore it for imports — follow the top-barrel convention from `members/index.ts`.

Record this as a deliberate variance in Project Structure Notes. (Flagged to the user — see end of story.)

### Scope boundary — 3.3a (this PRIMITIVE) vs 3.3b (the SURFACE)
Keep these on the right side of the line; do not bleed 3.3b into 3.3a:

| In 3.3a (the seam) | In 3.3b (the surface) |
|---|---|
| `KycProvider` interface + `KycProfile` + `KycError` in contracts | Signup UI KYC step; member chooses DigiLocker vs manual |
| DigiLocker provider: OAuth+PKCE initiate, verify+pull, getStatus, signature verify, mapping, error normalization | Emitting `member.kyc_completed` / `member.kyc_manual_fallback` + the lifecycle transition (`pending-kyc → pending-fee` / `→ pending-valid`) |
| `digilocker_public_certs` + `kyc_transactions` tables + accessors + migration 0023 | Manual-fallback fields + empathy copy ("DigiLocker is unavailable…") |
| Provider registry + FR-58C swap seam (safe default) | Hard-mandatory flag UI (manual hidden + copy block); accessibility gate (P0-2c) |
| CI import-boundary gate; cert-refresh function | Daily cert-refresh **cron registration** in `apps/jobs`; HTTP route registration in `server.ts` |
| _(none — values authored in ADR-0026)_ | **Category 5 ops obligations from ADR-0026:** (a) staleness alarm route for the within-budget window (7–30 days since last refresh); (b) quarterly key-compromise rehearsal + annual trust-anchor review. The daily cron must bump `fetched_at` on every success for the staleness budget to mean anything. |

The events 3.3b will emit (`member.kyc_completed`, `member.kyc_manual_fallback`) **already exist** from Story 3.1 (`packages/domain/src/member/events.ts` + `packages/events/src/registry.ts`) — 3.3a does **not** touch the event vocabulary. 3.3a's deliverable is the *typed seam that produces a `KycProfile`*; 3.3b wires that profile into the lifecycle.

### The recommended abstraction shapes (refine, don't hand-roll)
```ts
// @twt/contracts — packages/contracts/src/kyc/*
export type KycIntent = 'signup' | 'relink';              // AR-24 lists "DigiLocker re-link" as step-up-gated
export const KycVerificationStrength = z.enum(['aadhaar_kyc', 'self_declared', 'unverified']);
export const KycProfile = z.object({
  aadhaarMaskedId: z.string(),     // last 4 only — masked at the provider boundary
  name: z.string(),
  dob: z.string(),                 // DigiLocker eAadhaar DoB
  photoUrl: z.string(),            // or a reference/handle; never log
  verificationStrength: KycVerificationStrength,
}).strict();                       // DigiLocker pull ⇒ 'aadhaar_kyc'; manual fallback (3.3b) ⇒ 'self_declared'

export const KycErrorCode = z.enum([
  'provider_unavailable', 'user_consent_denied', 'verification_failed',
  'signature_invalid', 'certificate_stale', 'transaction_expired', 'transaction_not_found',
]);
export const KycError = z.object({ code: KycErrorCode, retriable: z.boolean(), message: z.string() }).strict();

export interface KycProvider {
  initiate(memberId: string, intent: KycIntent): Promise<KycInitiation>;            // { transactionId, authorizationUrl, expiresAt }
  verifyAndPullProfile(callback: KycCallbackPayload): Promise<KycProfile>;          // throws KycProviderError on failure
  getStatus(transactionId: string): Promise<KycTransactionStatus>;
}
```
`KycProvider.initiate` uses `memberId: string` (not `MemberId` from `@twt/domain`). Contracts source files **must NOT import `@twt/domain`** — the domain barrel re-exports `encryption` which pulls in `node:async_hooks`, breaking Vite browser bundles (the explicit rule in `packages/contracts/src/rules/clause.ts` lines 23-28). The `ClauseId` precedent proves this: `ClauseIdSchema` is re-declared locally in contracts without importing domain. The pattern in `members/auth.ts` is `memberId: UuidString` (from `_common/primitives`), which resolves to `string`. Use `string` here — the app-layer caller passes a branded `MemberId` (TypeScript widens it). Do NOT add a domain import to the contracts package.

### DigiLocker integration specifics (ground truth — see §Latest Tech for sources)
Direct integration, **no aggregator** for v1 (§2.8). Flow via **Meri Pehchaan** (`meripehchaan.gov.in` / `api.digitallocker.gov.in`), OAuth 2.0 authorization-code + PKCE:
- `initiate` → build authorize URL (`/oauth2/1/authorize`) with `state` + `code_challenge`; `redirect_uri` validated against the per-environment server-side allowlist (§2.8) and audit-logged on change.
- token exchange → `/oauth2/1/token` (authorization code → access token + name/DoB/gender + eAadhaar availability).
- profile pull → `/oauth2/3/xml/eaadhaar` (PKI-signed XML from UIDAI CIDR).
- **Optional → mandatory** switch is itself an FR-58C-gated migration; the provider stays optional in 3.3a.

### Signature verification + certificate cache (AC3, §2.8 / §3.8)
- eAadhaar is a **PKI-signed XML (XMLDSig)**. Verify at the application layer against the issuer's public certificate.
- Certificates cached in `digilocker_public_certs`; refreshed by a daily pg-boss job (cron wiring is the 3.3b/ops seam). **Not fail-closed on refresh failure** — last-good cert is used within the staleness budget, with alarms.
- **Two-window staleness budget (ADR-owned — do NOT invent the numbers):** within-budget → cached cert trusted + staleness alarm fires; past hard-limit → new verifications **fail closed** → caller routes the member to `pending-valid` manual fallback (that routing is 3.3b). Existing verified members are unaffected.
- Signature-verification failure → `KycError(verification_failed | signature_invalid)`; **never** silently accept.
- **This story authors the staleness ADR** — `ADR-0026-digilocker-signature-policy` (the adr-index L82 slot's write-trigger *is* "Story 3.3a closure"; it is `slot-reserved-pre-write` today). Task 7 writes it `drafted` with the budget/rotation/compromise values; the verify path reads those values via named constants citing `ADR-0026`. This is *authoring the source of truth*, not back-filling — distinct from [[feedback_record_unattested_no_backfill]] (which forbids inventing values for evidence that was promised-but-never-captured; here the ADR is the deliverable).

### Provider registry + the FR-58C swap seam (AC2/AC6 — honest about unbuilt infra)
`apps/api/src/modules/feature-flags/` (FR-58C) is **not built yet** (not in `apps/api/src/modules/`). Do NOT block on it. `getActiveKycProvider()` returns the DigiLocker provider via a seam where a *future* one-line flag read selects among a provider map — proving "a new provider in the registry + a flag flip is the whole change; consumers unchanged." State plainly in Completion Notes that the flag read is a documented seam, not a live flag.

### Config / secrets seam — boot without live DigiLocker (CI uses a fixture)
Follow the established pattern (`apps/api/src/config.ts` header + `deps.ts`): store the DigiLocker `client_id`/`client_secret` as **Secret-Manager secret NAMEs** resolved through `resolveSecretValue` (`packages/domain/src/secrets.ts`) — never env literals in prod. Mirror the **Turnstile optional seam** (`noopTurnstileVerifier` in `apps/api/src/modules/auth/shared/turnstile.ts` + the `buildTurnstileVerifier` function in `deps.ts`): when DigiLocker config is absent, `deps.ts` resolves the provider to a **`fixtureKycProvider`** so the API boots with zero live-govt config and CI never calls the real government API.

**Fixture provider concrete behavior** (specify exactly so tests are deterministic):
```ts
// apps/api/src/modules/kyc/providers/fixture.ts
export const fixtureKycProvider: KycProvider = {
  async initiate(_memberId, _intent) {
    return {
      transactionId: 'fixture-txn-00000000-0000-0000-0000-000000000001',
      authorizationUrl: 'http://localhost/mock-digilocker/authorize',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    };
  },
  async verifyAndPullProfile(_callback) {
    return {
      aadhaarMaskedId: 'XXXX',
      name: 'Fixture Member',
      dob: '1990-01-01',
      photoUrl: '',
      verificationStrength: 'aadhaar_kyc',
    };
  },
  async getStatus(transactionId) {
    return { transactionId, status: 'verified' };
  },
};
```
Unit tests that exercise the registry or the config seam should use `fixtureKycProvider` directly. Integration tests against `:5433` (cert-cache + kyc_transactions accessors) should also use the fixture, never the real DigiLocker transport.

### PII discipline
`KycProfile` (name, DoB, photo, masked-Aadhaar) is PII. Do NOT log it. `kyc_transactions` stores **no** eAadhaar PII (only OAuth `state`/`code_verifier`/status) — the profile is returned to the caller. `code_verifier` is a secret stored plaintext with a 15-minute TTL + RLS (no hashing needed at this TTL). The `contracts:check-pii-scrape` gate runs over contracts — keep `KycProfile` out of any public-surface schema.

### Dependency direction (avoid a cycle)
`@twt/contracts` → `@twt/domain` (legal). `apps/api` → both (legal). The provider lives in `apps/api` so it may freely import the DigiLocker transport, contracts types, and domain accessors. Nothing in `packages/*` imports the provider. This is what makes the import-boundary gate self-green by construction (only `apps/api/.../providers/digilocker/**` touches the SDK).

### Project Structure Notes
- **New files:**
  - `packages/contracts/src/kyc/{index.ts, provider.ts, profile.ts, errors.ts}` (replace the `.gitkeep`).
  - `apps/api/src/modules/kyc/{index.ts, context.ts, provider-registry.ts}` + `apps/api/src/modules/kyc/providers/digilocker/{index.ts, client.ts, signature.ts, mapper.ts, cert-refresh.ts, staleness-policy.ts}` + a fixture provider (`providers/fixture.ts`). (`context.ts` holds `KycProviderContext` — the scoped db + pariwarId shape the provider receives.)
  - `packages/domain/src/schema/{digilocker_public_certs.ts, kyc_transactions.ts}`, `packages/domain/src/policies/{digilocker-public-certs-rls.ts, kyc-transactions-rls.ts}`, `packages/domain/src/kyc/{read.ts, write.ts, index.ts}`, a new hand-supplemented `0023` migration + `meta/`, tests under `packages/domain/tests/kyc/`.
  - `scripts/kyc-provider-boundary/{lib.ts, lib.test.ts, check.ts, README.md}`.
  - `docs/adr/ADR-0026-digilocker-signature-policy.md` (Status: drafted — Task 7).
- **Edited files:** `packages/contracts/src/index.ts` (re-export kyc), `packages/domain/src/schema/index.ts` + `policies/index.ts` + `index.ts` (register schema/RLS/`kyc` namespace), `apps/api/src/config.ts` + `deps.ts` (DigiLocker secret-name seam + fixture fallback), root `package.json` (`kyc-provider:test`/`:check`), `scripts/ci-local.sh`, `.github/workflows/ci.yml`, `docs/knowledge-transfer/adr-index.md` (flip L82 slot → `drafted` + counts), `packages/contracts/src/kyc/README.md` (`ADR-NNNN` → `ADR-0026`), optionally `packages/eslint-config-twt/index.js`.
- **Module shape:** mirror the freshest conventions — contracts dir like `members/` (barrel `index.ts` + per-concern files, `.strict()` Zod, ESM `.js` import specifiers); domain accessor split read/write/index like `consent/`; CI gate cloned from `member-state-invariant/`.
- **Variances (recorded):** (1) location moved from epic's `packages/digilocker` → `@twt/contracts/kyc` (abstraction) + `apps/api/src/modules/kyc/providers/digilocker/` (impl), rationale above; (2) architecture §3.8 suggests the signed-XML schema in `packages/domain/digilocker/` — kept **co-located in the provider** instead, because freeze-row-13's load-bearing property ("single-module swap") is maximized when ALL DigiLocker-specifics (XML parse + verify + OAuth) live in one directory; only the cert-cache **table** lives in `packages/domain` (Drizzle tables must). (3) `KycVerificationStrength` and the `KycError` codes beyond the three AC-named ones are additive refinements.

### Testing standards summary
- Vitest. Unit tests DB-free + pure (mapping, error normalization, signature verify against fixtures, registry/fixture-seam). Integration tests need live Postgres on **:5433** (`twt-test-pg`) per [[project_live_db_test_gotchas]] — never regenerate an applied migration (drizzle keys on journal `when` → 42P07); never `DROP SCHEMA` (strips `twt_app` USAGE → 42P01); assert membership not exact counts.
- RLS integration tests `SET LOCAL ROLE twt_app` before asserting policy (login role is superuser → bypasses RLS).
- The merge gate is `pnpm ci:local` ([[project_ci_actions_suspension_local_mirror]]); the new `kyc-provider-boundary` gate is precision-scan (not git-diff), self-green by construction like `member-state-invariant` / `domain-accessor-invariants`.
- **Do NOT** call the live DigiLocker government API in any test — use the fixture provider + signed-XML/cert fixtures.

### References
- [Source: epics.md#Story 3.3a (lines 1646-1663)] — ACs verbatim + `[PRIMITIVE]` label.
- [Source: epics.md#Story 3.3b (lines 1665-1681)] — the SURFACE that consumes this seam (scope boundary).
- [Source: epics.md#Epic 3 (lines 1567-1591)] — epic objectives, demoable scenarios, dependencies; freeze row 13 (line 530).
- [Source: architecture.md#2.8 DigiLocker integration (lines 1602-1634)] — OAuth+PKCE, signature-verification policy, key-compromise, callback allowlist, SDK pinning + provenance.
- [Source: architecture.md#3.8 DigiLocker integration transport (lines 2310-2331)] — provider-interface location, signed-XML schema, `digilocker_public_certs`, aggregator substitution path, staleness budget.
- [Source: architecture.md (lines 4275, 4564)] — canonical `apps/api/src/modules/kyc/` home; integration-list "behind a provider interface."
- [Source: architecture.md#AR-43 (line 319) / #AR-51 (line 336) / freeze row 13 (line 530)] — provider-interface freeze; signature/key-rotation/offline-cache semantics.
- [Source: packages/contracts/src/kyc/README.md] — the purpose-built landing placeholder + `.strict()` / no-type-shadowing discipline + the signature-policy ADR pointer.
- [Source: packages/contracts/src/members/{index.ts, auth.ts}] — the freshest contracts conventions (top-barrel consume, `.strict()`, `_common/primitives`, ESM `.js` specifiers).
- [Source: scripts/member-state-invariant/{check.ts, lib.ts, README.md}] — the AST CI-gate pattern to clone for Task 5.
- [Source: packages/domain/src/member/events.ts + packages/events/src/registry.ts] — `member.kyc_completed` / `member.kyc_manual_fallback` already exist (3.3a does not touch the event vocabulary).
- [Source: apps/api/src/config.ts + deps.ts] — Secret-Manager-name + Turnstile optional-seam pattern to mirror for DigiLocker config + the fixture-provider fallback.
- [Source: docs/knowledge-transfer/adr-index.md (Section A, line 82)] — the `digilocker-signature-policy` slot is `slot-reserved-pre-write` with write-trigger "Story 3.3a closure" → this story authors `ADR-0026` (Task 7).
- [Source: docs/adr/ADR-0009-admin-authentication.md + adr-index status-summary] — the story-authors-an-ADR pattern (author file `drafted` + flip the index row + reconcile counts) to mirror.

## Previous Story Intelligence

From Stories 3.1 (member lifecycle PRIMITIVE) and 3.2 (member auth SURFACE) — both just merged (#45, #46):
- **PRIMITIVE shape is settled.** Domain module = table in `schema/`, RLS in `policies/`, accessors split `read.ts`/`write.ts`/`index.ts` behind a barrel, typed errors re-surfaced at the `@twt/domain` top level for app-layer error-mapping. Contracts module = `members/`-style barrel with `.strict()` Zod. Mirror; do NOT invent a new shape.
- **Epic-vs-architecture location conflicts are a known pattern here.** 3.1 explicitly overrode the epic's `packages/member-lifecycle` → `packages/domain/src/member/` with a documented rationale. 3.3a does the same for `packages/digilocker`. Always record the variance + flag it.
- **Migration discipline (3.1 + 3.2 Debug Logs):** `db:generate` ONCE → inspect → hand-supplement GRANT/FORCE-RLS → apply to :5433 → `db:check` "Everything's fine". 3.2 burned a re-review because the recorded green gate **predated** later patches + a hand-authored migration (0021/0022) whose drizzle snapshots are absent — so **re-run `pnpm ci:local` after the final code state**, and be careful with `db:generate` given the existing snapshot drift.
- **AI-2-2 lesson (load-bearing invariant ⇒ machine guard, not a reviewer note):** the `member-state-invariant` + `domain-accessor-invariants` gates exist because invariants that lived only in review got violated. AC3's "no app code imports the DigiLocker SDK" is exactly such an invariant → it needs the CI gate (Task 5), not a comment.
- **Transport-free PRIMITIVE / audit-or-throw is a CONSUMER obligation.** Like `consent`/`member`, the KYC seam does not orchestrate audit/HTTP/auth. The 3.3b signup route writes the audit line + emits events; 3.3a returns typed data/errors.

## Git Intelligence Summary

Last 5 commits: `01097f5` Story 3.2 member mobile+OTP auth [SURFACE] (#46) · `8a741d1` Story 3.1 member lifecycle state machine + event stream [PRIMITIVE] (#45) · `f974689` AI-2-3 test-quality checkpoint · `56fff0e` AI-2-2 domain-accessor pagination invariant gate · `aa34a08` Epic 2 retrospective. Signal: Epic 3 is mid-flight; 3.1 (lifecycle) + 3.2 (auth) are merged and 3.3a is the next `[PRIMITIVE]` building on them. The member state machine + the `member.kyc_*` events that 3.3b will fire already exist on `main`; 3.3a slots the provider seam between them and the signup surface. The recent gate-adding commits (AI-2-2, member-state-invariant) are the model for Task 5.

## Latest Tech Information

- **No first-party/maintained Node SDK for DigiLocker.** Integrate directly: OAuth 2.0 authorization-code + PKCE (`undici`/`fetch`) + XMLDSig verification (e.g. `xml-crypto`). The official path is **Meri Pehchaan** (`meripehchaan.gov.in` / `api.digitallocker.gov.in`); aggregators (Setu, Surepass, Decentro, Eko) exist as the §3.8 substitution path but are **not** used for v1.
- **Endpoints (current):** `/oauth2/1/authorize` → `/oauth2/1/token` → `/oauth2/3/xml/eaadhaar`. Token response carries name/DoB/gender + eAadhaar availability; the XML pull returns the PKI-signed eAadhaar from UIDAI's CIDR. The eAadhaar XML format has changed across API versions (v1.10 / v1.11 / v2.0) — pin the provider's transport version per §2.8 and treat the parser as version-specific inside the provider directory.
- **Supply-chain:** pin the OAuth/XML libs with provenance (npm provenance / SLSA); no auto-update of supply-chain-sensitive packages (§2.8).

Sources: [DigiLocker — Meri Pehchaan](https://digilocker.meripehchaan.gov.in/) · [Authorized Partner API Specification v2.0](https://meripehchaan.gov.in/assets/img/chose/Digital%20Locker%20Authorized%20Partner%20API%20Specification%20v2.0.pdf) · [DigiLocker Integration Architecture (OAuth-based)](https://medium.com/@abhaygzb15/digilocker-integration-architecture-a-secure-oauth-based-system-2b844ba63ccc) · [API Setu — DigiLocker data exchange](https://www.digilocker.gov.in/web/data-exchange) · [Setu DigiLocker docs](https://docs.setu.co/data/digilocker/quickstart)

## Project Context Reference

No `project-context.md` present. Cross-cutting facts applied from auto-memory: [[project_live_db_test_gotchas]] (test DB on :5433; migration/reset gotchas), [[project_ci_actions_suspension_local_mirror]] (`pnpm ci:local` is the merge gate; GitHub Actions suspended), [[feedback_architecture_vs_prd_boundary]] (architecture commits structural location), [[project_member_lifecycle_domain_substrate]] (member events/state on `main`), [[feedback_record_unattested_no_backfill]] (don't back-fill the signature-policy ADR values), [[project_eslint_config_per_package_cwd]] (cwd-relative role globs if adding an eslint carve-out).

## Story Completion Status

Ultimate context engine analysis completed — comprehensive developer guide created. Ready for `dev-story`.

**Decisions locked by the user (2026-06-25):**
1. **`kyc_transactions` stays in 3.3a.** Task 3 keeps both tables (`digilocker_public_certs` + `kyc_transactions`); the seam ships stateful (`getStatus` + PKCE `state`/`verifier` persistence are provider-internal here).
2. **Wire the staleness mechanism; values live in the ADR.** 3.3a authors `ADR-0026-digilocker-signature-policy` (its write-trigger *is* this story's closure — Task 7) and wires the two-window mechanism reading the ADR-committed values via named constants. No invented numbers in code.
3. **Cert-refresh split confirmed.** 3.3a ships `refreshDigiLockerCerts()` (the function); the `apps/jobs` daily pg-boss scheduler registration lands in **3.3b/ops**.

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (Claude Opus 4.8) — bmad-dev-story workflow.

### Debug Log References

- **Build order:** Task 3 (domain substrate) was built BEFORE Task 2 (provider) — the provider's `initiate`/`verifyAndPullProfile`/`getStatus` consume the Task-3 `kyc_transactions` + cert-cache accessors, so the substrate must exist first to compile/test. Story-file boxes checked in 1→7 order once each was genuinely done.
- **Migration 0023 — hand-authored (NOT `db:generate`):** meta/ snapshots stop at `0020`; `0021`/`0022` are hand-authored, snapshot-absent. A `db:generate` would diff the current schema against `0020_snapshot.json` and re-emit the already-applied `otp_rate_buckets` + `member_pariwar_selects` → `42P07`. Followed the 0021/0022 hand-authored precedent + the 0017 tenant-RLS DDL shape; added the journal entry (idx 23). `db:check` "Everything's fine"; applied to :5433 + verified RLS forced (`relrowsecurity`/`relforcerowsecurity` = t/t), policies, grants, indexes.
- **xml-crypto 6.x verify API:** probed the sign/verify roundtrip — v6 needs a real X.509 cert PEM (not a bare SPKI key) for `publicCert` + the exclusive-c14n transform on the reference. Confirmed the verify key resolves as `getCertFromKeyInfo(keyInfo) || publicCert` (signed-xml.js L242), so setting `publicCert` to the cached cert + overriding `getCertFromKeyInfo` PINS verification to OUR cert (ignores the embedded KeyInfo) — the AC7 property.
- **ci:local cascade:** the first full run failed 4 jobs (typecheck/build/test/crypto-check) — all cascaded from ONE `tsc --noEmit` error in `digilocker-provider.spec.ts` (`makeProvider = (deps = {})` inferred `deps: {}`). vitest's esbuild transpile ran the spec fine; `tsc` (turbo) caught it. Fixed by typing the override param (`ProviderOverrides`). Re-ran: **`ci:local PASSED — 18 jobs green`.**
- **Independent re-verification (2026-06-26, fresh dev-story session):** re-ran the merge gate against the unchanged final working tree (no intervening edits since the 2026-06-25 close) per the 3.2 "recorded-green can predate patches" lesson — **`ci:local PASSED — 18 jobs green`** again, incl. `kyc-provider-boundary` + `integration-tests` (live DB :5433: `digilocker-provider.spec.ts` ×6, `kyc-substrate.spec.ts` ×7), `db-check`, `contracts-determinism`, `pii-scrape`. File List re-confirmed against `git status` (all artifacts present; `.gitkeep` replaced). The work remains uncommitted on `main` — committing/PR is a separate, user-initiated step.

### Completion Notes List

Story 3.3a (DigiLocker Provider-Interface Abstraction [PRIMITIVE]) is COMPLETE — all 7 tasks + all 7 ACs satisfied; `pnpm ci:local` green (18 jobs incl. the new `kyc-provider-boundary` gate + live-DB integration).

- **AC1 (frozen abstraction):** `KycProvider` port (exactly 3 methods) + `KycProfile` + `KycError`/`KycProviderError` in `@twt/contracts/kyc`, consumed via the top barrel. The DigiLocker concrete impl is the SOLE holder of the transport.
- **AC2/AC6 (single-module swap):** `provider-registry.ts` `getActiveKycProvider(ctx)` selects by `activeProviderKey` — the FR-58C flag read is a documented seam (flag infra not built). The fixture provider stays registered so a swap is a key flip, no consumer change.
- **AC3 (import boundary):** the `kyc-provider-boundary` CI gate (AST scanner cloned from `member-state-invariant`) bans the DigiLocker transport outside `providers/digilocker/**` — self-green over 267 files; wired into `package.json` + `ci-local.sh` + `ci.yml`.
- **AC4 (neutral profile):** `mapper.ts` maps eAadhaar → `KycProfile`, masking Aadhaar to last 4.
- **AC5 (error taxonomy):** every failure normalizes to `KycProviderError` (7 codes; `retriable` only on `provider_unavailable`); transport maps `access_denied` → `user_consent_denied`, timeout/non-2xx → `provider_unavailable`.
- **AC7 (signature trust):** `signature.ts` verifies the eAadhaar XMLDSig against the CACHED cert (pinned; embedded KeyInfo ignored), never silently accepts; the two-window staleness budget (7d/30d) reads `ADR-0026` named constants; `refreshDigiLockerCerts()` ships (cron is 3.3b/ops).
- **ADR-0026 authored** (`drafted`, un-attested-pending) — the values the code reads; adr-index slot flipped + counts reconciled (total unchanged at 143).
- **Recorded variances:** (1) location `packages/digilocker` → `@twt/contracts/kyc` + `apps/api/.../providers/digilocker/` (the Story-3.1 precedent); (2) `digilocker_public_certs` is GLOBAL-access RLS (issuer certs have no tenant dimension + the unscoped refresh job), `kyc_transactions` tenant-isolated; (3) `xml-crypto` pinned EXACTLY `6.1.2` (Node-22 global `fetch`, no `undici`); (4) the eslint companion is PARKED (the CI gate is the authoritative teeth); (5) migration 0023 hand-authored (snapshot-drift, the 0021/0022 precedent).

### File List

**New:**
- `packages/contracts/src/kyc/{profile.ts, provider.ts, errors.ts, index.ts}` (replaced the `.gitkeep`)
- `packages/contracts/tests/kyc.test.ts`
- `packages/domain/src/schema/{digilocker_public_certs.ts, kyc_transactions.ts}`
- `packages/domain/src/policies/{digilocker-public-certs-rls.ts, kyc-transactions-rls.ts}`
- `packages/domain/src/kyc/{read.ts, write.ts, index.ts}`
- `packages/domain/migrations/0023_kyc-digilocker.sql`
- `packages/domain/tests/integration/kyc/kyc-substrate.spec.ts`
- `apps/api/src/modules/kyc/{index.ts, context.ts, provider-registry.ts}`
- `apps/api/src/modules/kyc/providers/fixture.ts`
- `apps/api/src/modules/kyc/providers/digilocker/{index.ts, client.ts, signature.ts, mapper.ts, cert-refresh.ts, staleness-policy.ts}`
- `apps/api/tests/unit/kyc-provider.test.ts`
- `apps/api/tests/integration/kyc/digilocker-provider.spec.ts`
- `apps/api/tests/fixtures/kyc/{sign-eaadhaar.ts, eaadhaar-test-cert.pem, eaadhaar-test-key.pem, eaadhaar-wrong-cert.pem}` (throwaway test fixtures)
- `scripts/kyc-provider-boundary/{lib.ts, lib.test.ts, check.ts, README.md}`
- `docs/adr/ADR-0026-digilocker-signature-policy.md`

**Edited:**
- `packages/contracts/src/index.ts` (re-export kyc) · `packages/contracts/src/kyc/README.md` (ADR-NNNN → ADR-0026)
- `packages/domain/src/index.ts` (kyc namespace + ids) · `packages/domain/src/ids/index.ts` (KycTransactionId/DigiLockerCertId) · `packages/domain/src/schema/index.ts` · `packages/domain/src/policies/index.ts` · `packages/domain/migrations/meta/_journal.json` (idx 23)
- `apps/api/src/config.ts` (digilocker config) · `apps/api/src/deps.ts` (`buildKycProviderRegistry`) · `apps/api/src/context.ts` (`kycProviders` on AppDeps) · `apps/api/tests/integration/_setup.ts` (fixture registry) · `apps/api/package.json` (`xml-crypto@6.1.2` exact) · `pnpm-lock.yaml`
- `package.json` (`kyc-provider:test`/`:check`) · `scripts/ci-local.sh` · `.github/workflows/ci.yml` (`kyc-provider-boundary` job)
- `packages/eslint-config-twt/index.js` (parked TODO)
- `docs/knowledge-transfer/adr-index.md` (slot flip + counts + dated note)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (status)

## Change Log

| Date | Change |
|---|---|
| 2026-06-26 | **Applied all 7 review patches.** P1 replay guard (`txn.status !== 'pending'` check in `verifyAndPullProfile`); P2 X.509 `notAfter` expiry gate; P3 single-parse — `verifyEaadhaarSignature` returns `doc`, `mapEaadhaarToKycProfile` accepts `string\|Node`; P4 `maskAadhaar` short-mask fix (`last4.length === 4`); P5 `getStatus` unrecognized-status throws instead of coercing to `'pending'`; P6 two-phase parse-then-write in `refreshDigiLockerCerts`; P7 `dob` guard added. Unit tests updated (26 pass); 2 new integration tests added (8 pass total). Typecheck clean. Status → done. |
| 2026-06-26 | **Code review (bmad-code-review).** 2/3 layers (Blind Hunter + Acceptance Auditor) produced findings; Edge Case Hunter timed out. 7 patch items + 2 deferred. See `### Review Findings` below. |
| 2026-06-26 | **Re-verification pass (dev-story, no incomplete tasks → Step 9 gate).** Re-ran `pnpm ci:local` with `DATABASE_URL` on :5433 against the unchanged final working tree — **18 jobs green** (incl. `kyc-provider-boundary` + live-DB `integration-tests`). File List re-confirmed complete vs `git status`. Status stays `review`; no code changes. Recorded the independent re-run for honest provenance (work still uncommitted on `main`). |
| 2026-06-25 | **Implemented Story 3.3a [PRIMITIVE].** 7 tasks: (1) `@twt/contracts/kyc` frozen abstraction (`KycProvider` port + `KycProfile` + `KycError`/`KycProviderError`); (2) DigiLocker provider (OAuth2+PKCE, XMLDSig verify pinned to cached cert, mapper, error normalization) — sole transport holder, `xml-crypto@6.1.2` pinned; (3) `digilocker_public_certs` (GLOBAL) + `kyc_transactions` (tenant) schema + RLS + accessors + hand-authored migration 0023; (4) provider registry + FR-58C swap seam + config/deps fixture fallback; (5) `kyc-provider-boundary` CI import-gate; (6) unit + integration tests, `ci:local` green (18 jobs); (7) authored `ADR-0026-digilocker-signature-policy` (drafted) + flipped the adr-index slot. Status → review. |
| 2026-06-25 | Story created via bmad-create-story. Resolved epic-vs-architecture location conflict (`packages/digilocker` → `@twt/contracts/kyc` abstraction + `apps/api/src/modules/kyc/providers/digilocker/` impl). Scoped 3.3a (seam) vs 3.3b (surface). Status → ready-for-dev. |
| 2026-06-25 | User locked the 3 open questions: (1) `kyc_transactions` stays in 3.3a; (2) wire the staleness mechanism, values in the ADR; (3) cert-refresh cron → 3.3b. Discovered the `digilocker-signature-policy` ADR slot's write-trigger is "Story 3.3a closure" → added **Task 7: author `ADR-0026-digilocker-signature-policy`** (drafted) + flip the adr-index slot. |
| 2026-06-25 | Validate pass 2 (bmad-create-story validate): 5 improvements applied post-implementation — (E1) `kyc_transactions.redirect_uri` field added to Task 3 schema spec (OAuth PKCE integrity; stored at initiate, validated on callback); (E2) `deactivateDigiLockerCert` named in Task 3 (security-critical key-compromise accessor, ADR-0026 §4 step 1); (E3) `context.ts` added to Project Structure Notes new-files list; (O1) Category 5 ops obligations from ADR-0026 (staleness alarm + quarterly rehearsal) added to scope boundary table; (O2) stale unit test count corrected. |
| 2026-06-25 | Validate pass 1 (bmad-create-story validate): 6 improvements applied — (C1) `KycProvider.initiate` `MemberId`→`string` (contracts MUST NOT import domain per browser-bundle rule); (C2) `KycProviderError` extends `Error` directly — no base class exists in contracts; (E1) fixture provider concrete return values specified; (E2) `code_verifier` strategy resolved (plaintext + 15-min TTL + RLS, no hashing); (E3) kyc README subpath import path flagged as wrong — top barrel canonical, no subpath exports map; (O1) code snippet updated to match C1/C2 fixes. |

---

### Review Findings

_Code review 2026-06-26 — Blind Hunter + Acceptance Auditor (Edge Case Hunter timed out). 4 dismissed as noise._

- [x] [Review][Patch] No replay guard: `verifyAndPullProfile` does not check `txn.status === 'pending'` before token exchange — a verified/failed transaction can be replayed [apps/api/src/modules/kyc/providers/digilocker/index.ts]
- [x] [Review][Patch] X.509 `notAfter` not evaluated at verification time — ADR-0026 §5 requires `not_before ≤ now < not_after` as an independent gate alongside staleness; an X.509-expired but `is_active` cert is currently trusted [apps/api/src/modules/kyc/providers/digilocker/index.ts + packages/domain/src/kyc/read.ts]
- [x] [Review][Patch] Double XML parse: `verifyEaadhaarSignature` and `mapEaadhaarToKycProfile` each re-parse the same XML string independently — any non-deterministic parse edge case could cause the verified document to differ from the mapped one [apps/api/src/modules/kyc/providers/digilocker/signature.ts + mapper.ts]
- [x] [Review][Patch] `maskAadhaar` returns a short mask (`XXXXXXXX1`, `XXXXXXXX12`, `XXXXXXXX123`) for a reference with 1–3 digit characters — inconsistent format vs the documented `XXXXXXXX1234` / `XXXX` contract [apps/api/src/modules/kyc/providers/digilocker/mapper.ts]
- [x] [Review][Patch] `getStatus` silently coerces any unrecognized DB `status` value to `'pending'` — masks DB corruption, violates AC5 (failure modes should surface as `KycError`) [apps/api/src/modules/kyc/providers/digilocker/index.ts]
- [x] [Review][Patch] `refreshDigiLockerCerts` upserts certs one-at-a-time without a wrapping transaction — a partial refresh (failure after cert N) leaves the DB in a mixed-freshness state with no indication of which certs were committed [apps/api/src/modules/kyc/providers/digilocker/cert-refresh.ts]
- [x] [Review][Patch] `mapEaadhaarToKycProfile` guards `name` but not `dob` — an eAadhaar response with a `Poi` element missing the `dob` attribute silently produces `KycProfile { dob: '' }` [apps/api/src/modules/kyc/providers/digilocker/mapper.ts]
- [x] [Review][Defer] XPath injection risk in `mapper.ts` `attr()` / `text()`: `localName` is interpolated directly into the XPath expression without escaping — currently called only with string literals so no active vulnerability; becomes relevant if field names are ever derived from input [apps/api/src/modules/kyc/providers/digilocker/mapper.ts] — deferred, pre-existing design
- [x] [Review][Defer] `assertRedirectUriAllowed` in `initiate` always self-validates: called with `config.redirectUri` which is always in `config.redirectUriAllowlist` — the guard is vacuous today; the intent is to validate a caller-supplied redirect in a future surface (3.3b) [apps/api/src/modules/kyc/providers/digilocker/index.ts] — deferred, intentional 3.3a scope
