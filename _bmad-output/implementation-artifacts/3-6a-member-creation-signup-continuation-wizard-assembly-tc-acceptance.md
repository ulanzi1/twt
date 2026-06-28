# Story 3.6a: Member Creation from Signup-Continuation + Wizard Assembly + T&C Acceptance `[SURFACE]`

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Sushil-class teacher starting signup (a verified mobile, no member record yet),
I want my member account created from the OTP signup-continuation seam, the signup wizard assembled end-to-end (`tc → kyc → nominees → medical → [payment]`), and to accept the Terms & Conditions,
so that a real first-time user can finally reach the KYC step E2E (the reachability every prior Epic 3 story deferred to "Story 3.6") and arrives at the payment step (Story 3.6b) with member-creation + T&C-acceptance already recorded.

### Story context (read this first)

**This story is the FIRST half of a split.** `/bmad-create-story 3.6` was split with BigDev on 2026-06-27 into:

- **Story 3.6a (this story)** — `[SURFACE]`: **member creation** from the Story 3.2 `signup_continuation` seam, the **signup-wizard assembly** (the `(signup)` Expo Router group chrome + new-member entry + ordered steps), and **T&C acceptance** (the `tc_acceptance` consent — the second consent-registry consumer after Story 3.5).
- **Story 3.6b** — `[SURFACE]` (backlog): the **₹110 Vyawastha Shulk UPI payment + receipt** (`vyawastha_shulk_receipts`, AR-67), the **Reference Code port seam** (Epic 13 not built yet), and the **5-condition lock-in entry gate** (`member.vyawastha_shulk_paid` transition + `member.lock_in_entered` marker with the `lock_in_days_at_join` snapshot). Create it with `/bmad-create-story 3.6b` AFTER 3.6a merges (so it inherits 3.6a's actuals).

**Why 3.6a exists / why it is load-bearing.** Every Epic 3 story so far (3.3b KYC, 3.4 nominees, 3.5 medical) shipped a fully-working API + screen but **could not be reached E2E by a real first-time user**, because **member creation was explicitly deferred to "Story 3.6"** in three frozen places: `members.ts` ("`member_id` minted by the signup flow (Story 3.6)"), `member_identities.ts` ("Mobile is written by the signup flow (Story 3.6)"), and Story 3.2 R5 ("Story 3.6 consumes the `signup_continuation` token to create the member + upgrade to a full session"). **No production code emits `member.signup_initiated` or calls `projectMemberState` yet** — the tests seed members via `projectMemberState(member.signup_initiated)`. 3.6a is the story that finally creates the member in production and wires the wizard chrome, completing the reachability of 3.3b/3.4/3.5.

**What 3.6a builds:**

1. **Member creation from `signup_continuation`** — a new authenticated-by-continuation-token endpoint that consumes the single-use jti, mints the `memberId`, writes `member_identities` (Tier-1 mobile), emits `member.signup_initiated` (→ `pending-kyc`, the first production `projectMemberState` call), and upgrades to a full member session (mirroring `completeMemberLogin`).
2. **T&C acceptance** — a member-facing GET (current effective T&C for the Pariwar) + POST accept that records a `tc_acceptance` `consent_records` entry via the **audit-or-throw chain** (the exact template Story 3.5 established; 3.6a is the second consumer).
3. **Signup-wizard assembly (mobile)** — the `(signup)` group chrome: the new-member entry (from the 3.2 OTP `signup_continuation` placeholder), an ordered, resumable wizard (`tc → kyc → nominees → medical → [payment hand-off]`) with a progress indicator, wiring the existing `kyc.tsx` / `nominees.tsx` / `medical.tsx` screens + a new `tc.tsx`.

**Resolved scope decisions (BigDev, 2026-06-27 — folded, not silently assumed):**

- **D1 — Pariwar at signup: single default Pariwar for v1.** The `signup_continuation` token carries only the mobile blind index (no `pariwarId`). v1 launches one Pariwar; signup creates the member in the **v1 default/launch Pariwar** (resolve from config — see R3). Multi-Pariwar signup selection is deferred (the architecture already supports one mobile → members in multiple Pariwars via Pariwar-Passport; v1 signup creates exactly one).
- **D2 — Reference Code: port seam (Story 3.6b).** Reference-code capture/validation is **3.6b** (it pairs with payment); 3.6a does not touch it.
- **D3 — Payment model: receipt-event + gated transition (Story 3.6b).** 3.6a does not pay or enter lock-in.

**What this story does NOT do (scope guards — mirror the 3.3b/3.4/3.5 boundary discipline):**

- **It does NOT build payment, the receipt table, the reference-code seam, or the lock-in gate.** Those are **Story 3.6b**. A 3.6a member ends signup-entry in `pending-kyc`, progresses through KYC (3.3b) to `pending-fee`, and stops at the **payment hand-off placeholder**. `member.vyawastha_shulk_paid` (the `pending-fee → lock-in` transition) and `member.lock_in_entered` are 3.6b's.
- **It does NOT re-author the member.* event vocabulary or the reducer** (Story 3.1 froze it). `member.signup_initiated` already exists with its payload schema; 3.6a EMITS it (no widening needed — the existing `SignupInitiatedPayloadSchema = z.object({ ...auditShape }).strict()` is complete for the `from_state: null → to_state: 'pending-kyc'` creation event).
- **It does NOT re-author the OTP / continuation token machinery** (Story 3.2 froze it). 3.6a CONSUMES the `signup_continuation` token + the `member_signup_continuations` single-use table; it adds only the **consume** repo function (the table + insert already exist).
- **It does NOT build the admin T&C-authoring surface** (Story 2.7 / the existing `terms-and-conditions` admin module already authors + approves versions). 3.6a builds only the **member-facing read + accept**.
- **It is migration-free.** All tables it touches already exist (`members`, `member_identities`, `member_signup_continuations` from 3.1/3.2; `consent_records`, `terms_and_conditions_versions` from 2.7). Story 3.6b owns the next migration (0027).

## Acceptance Criteria

**AC1 — Member creation from the `signup_continuation` seam (the deferred R2 obligation; first production `projectMemberState`)**
**Given** Story 3.2's `signup_continuation` seam — a single-use `member_signup_continuations` row (`jti` PK, `mobile_blind_index`, `expires_at`, `consumed_at`, `created_at`) + a 30-min bearer token `{ sub: mobileBlindIndex, intent: 'signup', jti }` — and the architecture-frozen rule that `member_id` is **minted by the signup flow** as the event-stream `stream_id` (`members.ts` header; architecture §1.14)
**When** a first-time signup (no existing member for the mobile) POSTs to the new signup-create endpoint with the `signup_continuation` token (Authorization bearer) + the plaintext `mobile` + `deviceId` (+ optional `deviceLabel`)
**Then** the server (a) verifies the token (`intent === 'signup'`, signature, not expired); (b) **re-derives the mobile blind index from the supplied `mobile`** (under `MEMBER_IDENTITY_NAMESPACE`) and asserts it **equals the token `sub`** — reject 401 `auth.signup_mobile_mismatch` otherwise (this binds the plaintext mobile, which the token does not carry, to the verified continuation); (c) **atomically consumes the `jti`** (`UPDATE … SET consumed_at WHERE jti = $1 AND consumed_at IS NULL RETURNING` — already consumed → 409 `auth.signup_continuation_consumed`; row missing/expired → 401 `auth.signup_continuation_expired`, member restarts OTP); (d) resolves the v1 default Pariwar (AC2); (e) mints a fresh `memberId`; (f) in ONE member scope-tx (`openScopeTx` under the default Pariwar) emits `member.signup_initiated` via `projectMemberState` (`{ from_state: null, to_state: 'pending-kyc', trigger: 'signup', actor: 'member' }`, `actorId = memberIdStr`) — creating the `members` row (`pending-kyc`) + the event stream — AND inserts the `member_identities` row (`mobile_ciphertext` Tier-1 envelope of the normalized mobile, `mobile_blind_index`, `pariwar_id`).
**And** after the scope-tx commits, the server **upgrades to a full member session** (trusted-device bind + access+refresh tokens), mirroring `completeMemberLogin`, and returns the **full-session response shape** (identical to a returning-member single-membership login) so the wizard proceeds authenticated with no second OTP.

**AC2 — Single default Pariwar for v1 (D1)**
**Given** the v1 single-Pariwar launch posture (BigDev 2026-06-27) and that the `signup_continuation` token carries no `pariwarId`
**When** a new member is created (AC1)
**Then** the member is assigned the **v1 default/launch Pariwar**, resolved from a single documented source (config `defaultSignupPariwarId` — see R3), and the member is created in that Pariwar's scope (the `member.signup_initiated` event + `members` row + `member_identities` row all carry it).
**And** multi-Pariwar signup selection is explicitly **deferred** (recorded in Completion Notes): the `member_identities` `UNIQUE(pariwar_id, mobile_blind_index)` already permits the same mobile in other Pariwars later; v1 signup creates exactly one. The pre-create check rejects a duplicate signup for the same `(default Pariwar, mobile)` with a clear 409 (`auth.member_already_exists`) rather than a raw unique-violation 500.

**AC3 — T&C acceptance → `tc_acceptance` consent (audit-or-throw; the 2nd consent-registry consumer)**
**Given** the consent registry (Story 2.7, `consentType = 'tc_acceptance'`) + the **audit-or-throw template Story 3.5 established** (write the Story 1.10 audit line FIRST, thread its `auditId` into `recordConsent`) + the member-facing current-effective-T&C resolver (`terms-and-conditions` `getEffectiveTc`)
**When** the member views and accepts the current Terms & Conditions in the wizard
**Then** `GET /api/v1/member/terms` returns the **current effective** T&C version for the member's Pariwar (`tcVersionId` + rendered markdown via `renderTcMarkdown` + effective window); **if no effective T&C exists** for the Pariwar it returns **503** (`terms.unavailable` — the registry is unprovisioned for this Pariwar, not a client error), and the screen renders a graceful unavailable state.
**And** `POST /api/v1/member/terms/accept` records a `consent_records` entry (`consentType = 'tc_acceptance'`, `consentArtifactRef = <tcVersionId>`, `grantedViaActor = 'member_self'`, `consentPayload = { tcVersionId, locale, ... }`, `auditId` threaded) inside ONE member scope-tx, resolving the effective T&C **server-side** (the client-supplied `tcVersionId` may be compared to detect staleness but the server's resolved version wins); if the T&C cannot be resolved at accept time the whole accept **fails atomically** (no consent, no orphan) with a 409 (`terms.unavailable`).
**And** the accept is the second copy of the 3.5 chain: resolve clause/version → `audit.writeAuditEntry` (servicePool, NON-PII hash) FIRST → `recordConsent({ auditId })` inside the scope-tx → `emitAuthAudit` fire-and-forget LAST (only after `ok = true`); on a post-audit scope-tx rollback, emit a compensating audit line (mirror Story 3.5's `*.disclosure_rolled_back` P1 patch) so the audit chain reconciles instead of over-counting.

**AC4 — Signup-wizard assembly (mobile) + reachability (the deferred chrome from 3.2/3.3b/3.4/3.5)**
**Given** 3.3b/3.4/3.5 each shipped its step (`kyc.tsx` / `nominees.tsx` / `medical.tsx`) as a reachable screen with a placeholder host, deferring the wizard chrome + new-member entry to Story 3.6; and Story 3.2 left the `signup_continuation` branch of `(auth)/otp.tsx` as a placeholder notice
**When** the signup wizard is assembled
**Then** the `(signup)` group provides: (a) the **new-member entry** — the 3.2 OTP `signup_continuation` outcome navigates into `(signup)`, calls the signup-create endpoint (AC1) to obtain a full session, then drives the wizard; (b) an **ordered, resumable step flow** `tc → kyc → nominees → medical → [payment hand-off]` with a **progress indicator**, navigable within the session/continuation TTL; (c) the existing `kyc.tsx` / `nominees.tsx` / `medical.tsx` wired into the flow (their step order preserved) + a new `tc.tsx` step; (d) a **payment hand-off placeholder** at the end (Story 3.6b builds `payment.tsx` + lock-in).
**And** the wizard is screen-reader-accessible per the inherited Story 0.10 P0-2c gate (every control `accessibilityLabel` + `accessibilityHint`; the progress/step state announced; bilingual via `@twt/i18n` Pattern 6), matching the discipline 3.3b/3.4/3.5 applied to each step.

**AC5 — Scope guard: 3.6a stops at `pending-fee` / the payment hand-off (no payment, no lock-in)**
**Given** the split (D1–D3): 3.6a = entry + wizard + T&C; 3.6b = payment + reference code + lock-in gate
**When** 3.6a is implemented
**Then** it does NOT build the UPI payment flow, the `vyawastha_shulk_receipts` table, the `reference_code` seam, the `vyawastha_shulk.paid` event, the gated `member.vyawastha_shulk_paid` transition, the widened `member.lock_in_entered`, or the `lock_in_days_at_join` snapshot — **all of those are Story 3.6b**.
**And** a member created by 3.6a ends at `pending-kyc`, progresses through the KYC step (3.3b: `member.kyc_completed` / `member.kyc_manual_fallback` → `pending-fee`), records nominees (3.4) + medical (3.5) + T&C (this story), and **stops at the payment hand-off** — the lifecycle does not advance past `pending-fee` until 3.6b.

## Tasks / Subtasks

- [x] **Task 1 — `consumeSignupContinuation` repo function (single-use jti consumption)** (AC1)
  - [x] In `apps/api/src/modules/auth/member/member-auth.repo.ts`, add `consumeSignupContinuation(pool, jti, now): Promise<'consumed' | 'already_consumed' | 'expired_or_missing'>` — an atomic `UPDATE member_signup_continuations SET consumed_at = $now WHERE jti = $1 AND consumed_at IS NULL AND expires_at > $now RETURNING jti`. **Mirror the existing `consumePariwarSelect` (repo line ~398)** exactly (it is the single-use jti precedent — PR-Patch-10). Distinguish "already consumed" (row exists, `consumed_at` set) from "expired/missing" with a second probe or a `RETURNING`-aware branch so AC1's 409 vs 401 are precise. **The table + `insertSignupContinuation` already exist (Story 3.2) — do NOT recreate them; this is migration-free.**
  - [x] Add a `verifySignupContinuation` helper alongside `tokens.ts` `signSignupContinuation` (or reuse `request.server.jwt.verify` with a `SignupContinuationClaims` type, mirroring how `selectPariwar` verifies `PariwarSelectClaims`). Assert `intent === 'signup'`.

- [x] **Task 2 — Default-Pariwar resolution (D1) + duplicate-signup guard** (AC1, AC2)
  - [x] Add `defaultSignupPariwarId` to `apps/api/src/config.ts` (env-driven; the v1 launch Pariwar provisioned by the `pariwar-provisioning` module). Document in Completion Notes that v1 = single Pariwar; multi-Pariwar signup selection is deferred. **Confirm the launch Pariwar exists** (a `pariwar_passport` row) **and has at least one approved/effective `terms_and_conditions_versions` row** before relying on it — without the T&C row, AC3's GET returns 503 and accept returns 409, making the wizard stall at the T&C step for every new member. See Dev Notes R3.
  - [x] Before creating the member, check `member_identities` (servicePool, like login's `resolveMembersByMobile`) for an existing member under `(defaultSignupPariwarId, mobileBlindIndex)`; if found, reject 409 `auth.member_already_exists` (clean error, not a raw `23505` from the `member_identities_pariwar_mobile_uq` unique index).

- [x] **Task 3 — Member-creation handler + route (the first production `projectMemberState`)** (AC1, AC2)
  - [x] Add `apps/api/src/modules/auth/member/signup.handlers.ts` (or extend `member-auth.handlers.ts`) — `signupCreate(request)`:
    1. Read the `signup_continuation` token (bearer) + body `{ mobile, deviceId, deviceLabel? }`. Verify the token (Task 1 helper).
    2. `normalizeMobile(mobile)` → `mobileBlindIndex(mobile, deps.encryption)`; assert it `=== claims.sub` else 401 `auth.signup_mobile_mismatch`.
    3. `consumeSignupContinuation(deps.pool, claims.jti, now)` → branch 409/401 per AC1(c).
    4. Resolve `pariwarId = defaultSignupPariwarId`; duplicate-signup guard (Task 2).
    5. Mint `const memberId = ids.memberId(randomUUID())`.
    6. `openScopeTx(deps, pariwarIdStr)`; inside: `projectMemberState(scopeTx.client, { memberId, pariwarId, eventType: 'member.signup_initiated', payload: { from_state: null, to_state: 'pending-kyc', trigger: 'signup', actor: 'member' }, actorId: memberIdStr })` THEN insert the `member_identities` row (encrypt the normalized mobile to `mobile_ciphertext` via the Tier-1 helper the member-auth module already uses — `auth/shared/email-index.ts` `encryptTier1` + `serializeEnvelope`, the pattern `member_identities` was designed for; `mobile_blind_index = mobileBlindIndex`). `closeScopeTx(scopeTx, ok)` in `finally`.
    7. After commit, upgrade to a full session: call/replicate `completeMemberLogin(deps, request, { memberId: memberIdStr, pariwarId: pariwarIdStr }, deviceId, deviceLabel, masked, otpAuditTag?)` to bind the trusted device + issue access+refresh tokens. Return the **full-session shape**.
  - [x] Register `POST /api/v1/member/auth/signup/create` in `member-auth.routes.ts` as a **public (pre-session) route** (the caller holds a `signup_continuation` token, not a member session) with the per-IP rate limit (`MEMBER_OTP_IP_RATE`), parallel to `/otp/verify`. Audit every branch via `emitAuthAudit` (`member_signup.created` / `member_signup.failure`) with masked-mobile only (no plaintext, no token).
  - [x] Register the `member_signup.created` (+ `.failure`) audit type in `apps/api/src/audit/audit-sink.ts` (mirror the `member_login.*` registrations).

- [x] **Task 4 — Contracts: signup-create + member-T&C DTOs + OpenAPI** (AC1, AC3)
  - [x] Add `MemberSignupCreateRequest = { mobile, deviceId, deviceLabel? }` (`.strict()`) and reuse the existing full-session response contract (the same shape `completeMemberLogin` returns for a single-membership login — do NOT fork a second session shape; the mobile client is already coupled on it). Place under `packages/contracts/src/members/` (mirror `members/auth.ts`).
  - [x] Add `packages/contracts/src/terms/member-terms.ts`: `MemberTermsResponse = { tcVersionId, effectiveFrom, html, locale }` and `MemberTermsAcceptRequest = { tcVersionId, locale }` + `MemberTermsAcceptResponse = { accepted: true, consentId }` (or echo a minimal summary). **Contracts MUST NOT import `@twt/domain`** (browser-bundle rule) — re-declare wire shapes from `_common` + `.strict()`.
  - [x] Export from `packages/contracts/src/index.ts`; add components + path registration in `packages/contracts/scripts/emit-openapi.ts`; regenerate `openapi/v1.yaml` (the contracts-determinism gate must stay green).

- [x] **Task 5 — Member-facing T&C module (read current effective + accept → `tc_acceptance` consent)** (AC3)
  - [x] Add `apps/api/src/modules/terms/member-terms.handlers.ts` + `.routes.ts` (new member-facing module — the existing `terms-and-conditions` module is the ADMIN authoring surface; keep them separate). Routes behind `requireMemberSession(deps)`:
    - `GET /api/v1/member/terms` — `getEffectiveTc(scopeTx.tx, pariwarId)` → if null, **503** `terms.unavailable`; else return `{ tcVersionId, effectiveFrom, html: row.bodyHtmlRendered, locale }`. **Emit the PRECOMPUTED `body_html_rendered` column — do NOT re-render at read time.** The schema deliberately precomputes the sanitized HTML at write (`terms_and_conditions_versions.ts` header: "render ONCE at write, emit with `set:html`, keeps markdown libs out of the read graph"); re-running `renderTcMarkdown` per request would duplicate that work and re-introduce the markdown dependency.
    - `POST /api/v1/member/terms/accept` — the audit-or-throw chain (COPY Story 3.5's `medical.handlers.ts` submit, the canonical template):
      1. `openScopeTx(deps, pariwarIdStr)`; member-existence + terminal-state guard (reuse `member.memberExists` + `getMemberStateAt`; `TERMINAL_STATES = {'withdrawn','anonymized'}` — see W-carryforward on the local set).
      2. `getEffectiveTc(scopeTx.tx, pariwarId)` → if null throw 409 `terms.unavailable` (no consent without a resolvable version, AC3). Server-resolved `tcVersionId` wins (optionally compare to the client's to detect staleness).
      3. `audit.writeAuditEntry(deps.servicePool, { pariwarId, actorId: memberIdStr, actorRole: null, action: 'member_terms.accepted', resourceLocator: \`member:${memberIdStr}:tc\`, requestPayloadHash: sha256(canonicalJson({ tc_version_id, locale })), responseStatus: 200, traceId })` → `auditId`.
      4. `consent.recordConsent(scopeTx.tx, { pariwarId, subjectId: memberIdStr, consentType: 'tc_acceptance', consentArtifactRef: tcVersionId, grantedViaActor: 'member_self', consentPayload: { tcVersionId, locale }, auditId })` (omit `consentId`; use the returned `consentRow.consentId`).
      5. Wrap the scope-tx steps in try/catch; on rollback emit a compensating `member_terms.accept_rolled_back` (5xx) audit line (Story 3.5 P1 template) so the chain reconciles.
      6. Set `ok = true` only after success; `emitAuthAudit(deps, request, 'member_terms.accepted', { actorId, pariwarId, context: { tc_version_id } })` LAST; `closeScopeTx(scopeTx, ok)` in `finally`.
  - [x] Register `registerMemberTermsModule` in `apps/api/src/server.ts`; register the `member_terms.accepted` audit type in `audit-sink.ts`.
  - [x] **No new consent type** — `tc_acceptance` already exists in `consentTypeEnum` (Story 2.7). **No migration.**

- [x] **Task 6 — Mobile: signup-wizard assembly + entry + `tc.tsx`** (AC4)
  - [x] Upgrade `apps/mobile/app/(signup)/_layout.tsx` from a bare `Stack` to the **wizard chrome**: a progress indicator (step N of M), the ordered Stack (`tc → kyc → nominees → medical → payment`), and resumable navigation. Keep `headerShown: false` like `(auth)`.
  - [x] Wire the **new-member entry**: in `apps/mobile/app/(auth)/otp.tsx`, replace the `signup_continuation` placeholder notice (Story 3.2 PR-Defer-1) with a real hand-off — call the signup-create SDK method (Task 7) using the continuation token, store the returned full session, and `router.replace` into `(signup)` at the first step.
  - [x] Add `apps/mobile/app/(signup)/tc.tsx` — fetch `GET /member/terms`, **display the server-returned HTML** (already rendered at write time by `terms_and_conditions_versions`; this screen emits the precomputed `body_html_rendered`, it does NOT call any markdown renderer itself), scrollable so the member can read it in full; an accept CTA (disabled until viewed), POST accept, advance to `kyc`. Handle the 503/unavailable state with a graceful retry affordance (mirror 3.5's `medical.tsx` `loadFailed` + `medical.retry` pattern). **`ScrollView` wrapping is mandatory** (3.5 review patch: bare `YStack flex={1}` clips the CTA on small devices).
  - [x] Accessibility (AC4 / P0-2c): every control `accessibilityLabel` + `accessibilityHint`; the step/progress state announced; bilingual via `@twt/i18n`. Mobile `build`/`test` are no-ops by repo design → verify via `typecheck` + `lint` (3.2/3.3b/3.5 precedent); record the a11y discipline in Completion Notes.
  - [x] Add SDK methods in `packages/api-client/src/index.ts`: `signupCreate`, `memberTerms`, `memberTermsAccept` (mirror the existing member-auth + `medicalDisclose`/`medicalStatus` client methods).

- [x] **Task 7 — i18n copy** (AC3, AC4)
  - [x] Add the wizard chrome + T&C-step strings (step labels/progress, T&C intro, accept CTA, unavailable/retry, success) to `packages/i18n/locales/en/common.json` + `hi/common.json`. Follow the Story 2.2 tone guide (calm-precise member register; UX-DR55 dignified-validation grammar). **Do NOT** put the legal T&C body in i18n — it comes from `terms_and_conditions_versions` per Pariwar (the canonical legal text), exactly as 3.5's IMA/ack copy comes from the clause payload.

- [x] **Task 8 — Tests** (all ACs)
  - [x] API integration (live DB :5433): `apps/api/tests/integration/signup/signup-create.spec.ts` —
    - Full first-signup path: `/otp/request` → `/otp/verify` (no member → `signup_continuation` token) → `/signup/create` → asserts ONE `member.signup_initiated` event (`from_state: null → pending-kyc`), a `members` row in `pending-kyc`, a `member_identities` row (encrypted mobile round-trips; `mobile_blind_index` matches), and a full session (access+refresh) returned.
    - jti single-use: a second `/signup/create` with the same token → **409** `auth.signup_continuation_consumed`; expired token → **401**; mobile-mismatch (token `sub` ≠ blind index of a different `mobile`) → **401** `auth.signup_mobile_mismatch`.
    - duplicate signup: a `/signup/create` for a mobile that already has a member in the default Pariwar → **409** `auth.member_already_exists` (no second member, no second event).
    - E2E reachability: after `/signup/create`, drive `/kyc` (3.3b manual fallback) → `pending-fee` with the SAME session token (proves the wizard chain works without re-seeding).
  - [x] API integration: `apps/api/tests/integration/terms/member-terms.spec.ts` — seed a member (now via `/signup/create`, or the existing `seedMember` helper) + seed an **approved/effective** T&C version in the member's Pariwar; assert: GET returns the effective version + rendered HTML; accept → one `consent_records` row (`tc_acceptance`, `consent_artifact_ref = tcVersionId`, `audit_id` non-null pointing at a real chain line) inside the tx; **no-effective-T&C → GET 503 AND accept 409 with NO partial writes** (audit-or-throw atomicity — the highest-value test, mirroring 3.5 AC6); terminal-state → 409; no-token → 401.
  - [x] Run `pnpm ci:local` ([[project_ci_actions_suspension_local_mirror]]) as the merge gate (CI Actions suspended); integration needs `DATABASE_URL` on `:5433`. Watch for the known parallel-`:5433` `test (unit)` flake 3.4/3.5 documented (the canonical `integration-tests` job is the signal). Confirm `login-wall.spec.ts` passes WITH the new public `/signup/create` route (guard marker + allowlist, as 3.3b did for its public callback).

- [x] **Task 9 — Friction-budget disposition + sprint ledger** (housekeeping)
  - [x] The friction-budget CI gate fires on the new member-facing screens (`tc.tsx` + wizard chrome). Add a **Story 3.6a disposition note** to `friction-budget.md` (mirror the 3.5 disposition paragraph): the wizard chrome + a mandatory legal acceptance are **necessary v1 signup steps, zero gratuitous friction** — no new ledger row warranted. Verify the new screens stay **under** the `friction-budget.yaml` page-weight ceiling; **do not touch the best-ever baseline** unless the measurement DECREASES it ([[project_friction_budget_baseline_ratchet]]).
  - [x] On completion, flip `development_status[3-6a-member-creation-signup-continuation-wizard-assembly-tc-acceptance]` and append the combined `ready-for-dev→in-progress→review` ledger COMMENT entry per [[project_sprint_status_ledger]].

## Dev Notes

### Reuse map — extend these, do NOT reinvent

| Need | Reuse (do not rebuild) | Source |
| --- | --- | --- |
| Member full-session issuance (trusted-device bind + access+refresh) | `completeMemberLogin(deps, request, membership, deviceId, deviceLabel, masked, otpAuditTag)` | `apps/api/src/modules/auth/member/member-auth.handlers.ts:49` |
| Single-use jti consume (the consumeSignupContinuation pattern) | `consumePariwarSelect` (atomic UPDATE … RETURNING) | `apps/api/src/modules/auth/member/member-auth.repo.ts:~398` |
| `signup_continuation` token sign/verify | `signSignupContinuation` + `request.server.jwt.verify<…Claims>` | `apps/api/src/modules/auth/member/tokens.ts:48`; `member-auth.handlers.ts` `selectPariwar` verify |
| Mobile Tier-1 encrypt + blind index | `mobileBlindIndex(mobile, deps.encryption)` + `encryptTier1`/`serializeEnvelope` | `apps/api/src/modules/auth/shared/email-index.ts`; `member-auth.handlers.ts` |
| `member_identities` row shape (Tier-1 mobile + blind index, tenant-isolated) | the table the signup flow was designed to populate | `packages/domain/src/schema/member_identities.ts` |
| Member-state event emission (first production call) | `member.projectMemberState({ eventType: 'member.signup_initiated', payload, actorId })` | `packages/domain/src/member/project.ts`; seed precedent `nominee-declare.spec.ts:34` |
| `member.signup_initiated` payload schema (already complete — emit, do NOT widen) | `SignupInitiatedPayloadSchema = z.object({ ...auditShape }).strict()` | `packages/domain/src/member/events.ts:50` |
| Scope-tx lifecycle | `openScopeTx` / `closeScopeTx` | `apps/api/src/modules/multi-tenant/scope-tx.js` |
| **Audit-or-throw consent chain (write audit FIRST, thread id; compensating line on rollback)** | Story 3.5 `medical.handlers.ts` submit — THE template (2nd consumer = this story) | `apps/api/src/modules/medical/medical.handlers.ts` |
| Consent grant | `consent.recordConsent(tx, { consentType: 'tc_acceptance', consentArtifactRef, grantedViaActor, consentPayload, auditId })` | `packages/domain/src/consent/write.ts` |
| Hash-chain audit writer (returns `auditId`) | `audit.writeAuditEntry(deps.servicePool, {...})` | `packages/domain/src/audit/write.ts` |
| Current-effective T&C resolution (emit precomputed HTML) | `getEffectiveTc(db, pariwarId)` → emit the row's `bodyHtmlRendered` (`body_html_rendered`, precomputed at write) | `packages/domain/src/terms-and-conditions/read.ts:27`; `schema/terms_and_conditions_versions.ts:90` |
| Member existence + terminal-state guard | `member.memberExists` + `getMemberStateAt` (non-nullable → `pending-kyc`) | `packages/domain/src/member/read.ts` |
| Member-session guard | `requireMemberSession(deps)` | `apps/api/src/modules/auth/shared/member-session-guard.ts` |
| Mobile signup screen + a11y + retry/ScrollView discipline | `(signup)/medical.tsx` + `(signup)/nominees.tsx` + `(signup)/_layout.tsx` | `apps/mobile/app/(signup)/` |
| Contracts DTO discipline (no `@twt/domain`, `.strict()`, OpenAPI emit) | `members/auth.ts` + `medical/disclosure.ts` | `packages/contracts/src/` |

### R1 — Member creation: who, where, what (the load-bearing AC1)

Three frozen documents agree member creation is THIS work: `members.ts` ("`member_id` minted by the signup flow (Story 3.6)"), `member_identities.ts` ("Mobile is written by the signup flow (Story 3.6) in-scope"), and Story 3.2 R5 ("Story 3.6 consumes the `signup_continuation` token to create the member + upgrade to a full session"). The split assigns it to **3.6a**. The creation is exactly two writes in ONE scope-tx + a session upgrade after commit:

1. **`member.signup_initiated` via `projectMemberState`** — creates the `members` row (`pending-kyc`, `state_event_version = 1`) AND the event stream (`stream_id = member_id`). This is the **first production `projectMemberState` call** — every prior caller was a test seed. The payload is the existing `SignupInitiatedPayloadSchema` (`{ ...auditShape }`); `from_state: null`, `to_state: 'pending-kyc'`, `trigger: 'signup'`, `actor: 'member'`, `actorId = memberIdStr`.
2. **`member_identities` INSERT** — `mobile_ciphertext` (Tier-1 envelope of the normalized mobile) + `mobile_blind_index` + `pariwar_id`. The FK `member_identities.member_id → members.member_id` is satisfied because (1) runs first in the same tx under the same Pariwar scope (same RLS family — `member_identities` is tenant-isolated, like `members`).

The `member.signup_initiated` event and the `member_identities` row MUST be in the SAME scope-tx so a member can never exist without its identity row (and vice-versa). The session upgrade (`completeMemberLogin`) happens AFTER the commit (it writes to the carve-out auth tables on `deps.pool`, not the member scope-tx).

### R2 — The mobile-binding wrinkle (why the request re-sends the plaintext mobile)

The `signup_continuation` token payload is `{ sub: mobileBlindIndex, intent: 'signup', jti }` — it carries the **blind index, not the plaintext mobile**. But `member_identities.mobile_ciphertext` needs the plaintext to encrypt. Resolution (AC1(b)): the `/signup/create` request body re-sends `mobile` (the client has it from the OTP step). The server re-derives `mobileBlindIndex(mobile)` and asserts it equals `claims.sub` — this **binds** the supplied plaintext to the verified continuation (a mismatched mobile → 401). Then it encrypts the plaintext → `mobile_ciphertext`. Do NOT try to recover the plaintext from the token or the continuation row; neither stores it (by design — the continuation table is PII-free, carrying only the blind index).

### R3 — Default Pariwar (D1): resolution + the must-exist precondition

v1 launches a single Pariwar; signup creates members there. Resolve `pariwarId` from **one documented source** — recommended: a `defaultSignupPariwarId` config value (env-driven), pointing at the launch Pariwar the `pariwar-provisioning` module provisioned. **Precondition (state in Completion Notes + flag to BigDev if unmet):** that Pariwar's `pariwar_passport` row MUST exist before signup works (the `members.pariwar_id` + RLS rely on a real tenant). Also, **for the T&C step to function, the default Pariwar must have an approved/effective `terms_and_conditions_versions` row** — the same per-Pariwar provisioning dependency Story 3.5 flagged for `niy.medical.ima-list`/`niy.concealment.r14` (the registry/T&C bootstrap is a Story 1.15 / 2.4 / provisioning concern; 3.6a's AC3 makes a missing T&C a clean 503/409, not a crash). The provisioning of the launch Pariwar's T&C + niyamavali clauses is the **cross-cutting "every production Pariwar must carry its registry before a member can finish signup" obligation** 3.5 R6 raised — 3.6a is where it becomes user-visible.

### R4 — T&C acceptance is the SECOND consent-registry consumer (copy 3.5 exactly)

Story 3.5 (medical) was the FIRST `recordConsent` consumer and built the audit-or-throw template precisely so 3.6 could copy it (3.5 line 19: "later stories (3.6 `tc_acceptance`, Epic 6 `claim_time_dpdpa`) will copy 3.5"). Copy `medical.handlers.ts` submit's ordering verbatim: resolve the artifact (here `getEffectiveTc` → `tcVersionId`) → `writeAuditEntry` (servicePool, NON-PII hash) FIRST → `recordConsent({ auditId })` inside the member scope-tx → set `ok = true` after success → `emitAuthAudit` LAST → compensating audit line on rollback (3.5's P1 patch — `member_terms.accept_rolled_back` 5xx). The `consent_artifact_ref = tcVersionId` (T&C version is the legal basis, exactly as 3.5 used `niy.concealment.r14`'s `clause_version_id`). `tc_acceptance` is a non-PII consent (the T&C body is public legal text); `consent_payload` carries `{ tcVersionId, locale }` (operational context, not Tier-1 PII).

**The compensating audit line is MANDATORY — do not omit it.** If the scope-tx rolls back after `writeAuditEntry` succeeds, the audit log will show a `member_terms.accepted` with no matching consent record — an orphan that breaks the audit-chain invariant Epic 6 (`claim_time_dpdpa`) and future consent consumers rely on. 3.5's P1 patch resolved this by catching the rollback error and emitting a `*.disclosure_rolled_back` 5xx line immediately after. 3.6a MUST do the same (`member_terms.accept_rolled_back`). This pattern is template-forward: it is the chain discipline every future consumer (Epic 6 onward) inherits from 3.6a.

### R5 — No new events, no reducer change, no widening

Unlike 3.4 (widened `NomineesDeclaredPayloadSchema`) and 3.5 (widened `MedicalDisclosedPayloadSchema`), **3.6a widens nothing**. `member.signup_initiated` is already complete (`auditShape` only — a creation event needs no extra fields). T&C acceptance is a `consent_records` row, **not** a member event (the lifecycle has no `tc` event; the 3.6b gate checks the consent row's existence as condition (d)). Do NOT invent a `member.tc_accepted` event or touch `member/state.ts`.

### R6 — Wizard order + step placement

Recommended order: signup-create (member → `pending-kyc`) → **`tc`** → `kyc` (→ `pending-fee`) → `nominees` → `medical` → `[payment hand-off]` (3.6b). Rationale: accept terms first; KYC is the only state-advancing step before payment; nominees/medical/T&C are non-transition markers/consents that may be recorded in `pending-kyc` or `pending-fee`. The only HARD constraint: the `tc_acceptance` consent + nominee + medical events must exist **before** the 3.6b lock-in gate fires (the gate checks them as conditions b/c/d). T&C may technically be placed anywhere before payment, but `tc` first is the clean signup convention. Record the chosen order in Completion Notes for 3.6b to assert against.

### R7 — `member.signup_initiated` is reducer-IDENTITY from any non-initial state

The reducer (`member/state.ts:63`) returns the current state unchanged for `member.signup_initiated` (IDENTITY contract — a corrupt replay must not regress an active member to `pending-kyc`). The machine `initial` is `pending-kyc`, so a brand-new stream's first fold of `signup_initiated` lands at `pending-kyc` correctly. This is why creation works by appending `signup_initiated` to an empty stream. Do NOT special-case it; the existing reducer already handles it.

### Migration discipline

**3.6a is migration-free.** All tables exist: `members` (0018, Story 3.1), `member_identities` + `member_signup_continuations` (Story 3.2 migration), `consent_records` + `terms_and_conditions_versions` (Story 2.7). `tc_acceptance` is already in `consentTypeEnum`. The next migration number (**0027**) belongs to **Story 3.6b** (`vyawastha_shulk_receipts` + `members.lock_in_days_at_join` + the `niy.lock-in.policy` seed). Never regenerate an applied migration; never `DROP SCHEMA` ([[project_live_db_test_gotchas]]). If a migration somehow becomes necessary here, hand-author 0027 and coordinate the number with 3.6b.

### Project Structure Notes

- **New — `apps/api`:** `src/modules/auth/member/signup.handlers.ts` (or extend `member-auth.handlers.ts`), `src/modules/terms/{member-terms.handlers.ts, member-terms.routes.ts, index.ts}`, `tests/integration/signup/signup-create.spec.ts`, `tests/integration/terms/member-terms.spec.ts`.
- **New — `@twt/contracts`:** `src/members/signup.ts` (or add to `members/auth.ts`), `src/terms/member-terms.ts`.
- **New — `apps/mobile`:** `app/(signup)/tc.tsx`.
- **Edited — `apps/api`:** `src/modules/auth/member/{member-auth.repo.ts (+ consumeSignupContinuation), member-auth.routes.ts (+ /signup/create), tokens.ts (+ verify helper)}`, `src/config.ts` (+ `defaultSignupPariwarId`), `src/audit/audit-sink.ts` (+ `member_signup.*` + `member_terms.*`), `src/server.ts` (+ `registerMemberTermsModule`).
- **Edited — `@twt/contracts`:** `src/index.ts`, `scripts/emit-openapi.ts`, `openapi/v1.yaml`.
- **Edited — `apps/mobile`:** `app/(signup)/_layout.tsx` (wizard chrome), `app/(auth)/otp.tsx` (signup_continuation hand-off).
- **Edited — other:** `packages/api-client/src/index.ts` (+ `signupCreate`/`memberTerms`/`memberTermsAccept`), `packages/i18n/locales/{en,hi}/common.json`, `friction-budget.md`, `_bmad-output/implementation-artifacts/sprint-status.yaml`.
- **Naming discipline:** DB columns snake_case, TS fields camelCase (architecture L3663-3677). Contracts `.strict()`, no `@twt/domain` import, ESM `.js` specifiers.
- **Domain may not import `@twt/events`** (turbo cycle — [[project_member_lifecycle_domain_substrate]]); the projector hits `events_log` directly. Contracts may not import `@twt/domain` (browser-bundle rule).

### Testing standards summary

- Unit (vitest) co-located under each package's `tests/`. DB-gated integration runs against `twt-test-pg` Docker on **:5433** ([[project_live_db_test_gotchas]]); **assert membership not counts** (own-committing writers accumulate rows).
- The AC3 atomicity test (no-effective-T&C → no partial consent + no orphan audit line) is the highest-value new test — it proves 3.6a copies 3.5's audit-or-throw correctly (the template Epic 6 inherits next).
- The signup-create E2E (OTP → continuation → create → KYC with the same session) proves the long-deferred reachability — it is the story's headline test.
- `actorId` for `projectMemberState` is a `uuid` column: pass `memberIdStr` (member-actor) or `null` (system/SIE) — **never the string `'system'`** (the 3.4/3.5 `22P02` gotcha).
- RLS: `member_identities` is tenant-isolated; the pre-scope mobile lookup uses `deps.servicePool` (BYPASSRLS) — mirror login. Integration RLS assertions `SET LOCAL ROLE twt_app` to shed superuser.
- Merge gate: `pnpm ci:local` mirrors all ci.yml jobs ([[project_ci_actions_suspension_local_mirror]]); confirm `login-wall.spec.ts` accepts the new public `/signup/create` route.
- If `onSend` hooks are touched, run the DB-gated suites ([[project_fastify_onsend_doublesend]]) — not expected here.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.6 (lines 1717-1737)] — the parent story: wizard assembler + member creation + the 5-condition lock-in gate. 3.6a takes member-creation + wizard + T&C; 3.6b takes payment + reference-code + gate.
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 3 (lines 1567-1591)] — epic objectives + dependencies (Epic 1 event log + Epic 2 registry/consent).
- [Source: _bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md#FR-1 (lines 220-256)] — `pending-kyc` initial state on signup-form completion; ₹110 Vyawastha Shulk (3.6b).
- [Source: architecture.md#1.14 Member Lifecycle State Model (lines 1219-1248)] — state model; `pending-fee` "(signup begun)"; member-state derived from event replay.
- [Source: _bmad-output/implementation-artifacts/3-2-member-mobile-otp-authentication.md (R5, lines 144-150)] — the `signup_continuation` token spec (30-min, single-use jti, `{sub: mobileBlindIndex, intent:'signup', jti}`) 3.6a consumes; the `member_signup_continuations` table; "Story 3.6 wires signup onto the seam."
- [Source: _bmad-output/implementation-artifacts/3-3b-digilocker-kyc-flow-in-signup-manual-fallback.md (R2 / "Who creates the member", lines 138-139)] — member creation deferred to 3.6; KYC assumes a seeded `pending-kyc` member + session; the wizard chrome is 3.6.
- [Source: _bmad-output/implementation-artifacts/3-5-medical-disclosure-with-ima-list-concealment-denial-ack.md] — the audit-or-throw consent template (3.6a is the 2nd consumer): submit ordering, the compensating-audit P1 patch, the `ScrollView`/retry mobile patches, the `actorId` `22P02` gotcha, per-Pariwar registry provisioning (R6).
- [Source: apps/api/src/modules/auth/member/{member-auth.handlers.ts:49 completeMemberLogin, :206 signup_continuation branch, member-auth.repo.ts:~398 consumePariwarSelect, tokens.ts:48 signSignupContinuation}] — the seams to consume/mirror.
- [Source: packages/domain/src/schema/{members.ts, member_identities.ts}] — the lifecycle anchor (PII-free) + the Tier-1 mobile identity row signup writes.
- [Source: packages/domain/src/member/{events.ts:50, state.ts:63, project.ts}] — `SignupInitiatedPayloadSchema`; the reducer's `signup_initiated` identity branch; the projector (first production call).
- [Source: packages/domain/src/{consent/write.ts, terms-and-conditions/read.ts:27 getEffectiveTc}, schema/terms_and_conditions_versions.ts:88-92 (body_markdown source + precomputed body_html_rendered)] — consent grant + member-facing T&C resolution (emit the precomputed HTML).
- [Source: packages/domain/src/schema/consent_records.ts:75,96] — `tc_acceptance` consent type (already in the enum); audit-or-throw obligation; no-FK-on-`consent_artifact_ref`.

## Previous Story Intelligence

- **3.5 (medical) is the audit-or-throw template** — 3.6a's T&C accept is the second copy. Reuse the exact submit ordering (resolve → `writeAuditEntry` first → `recordConsent` in-tx → `emitAuthAudit` last → compensating line on rollback). 3.5's review surfaced the rollback-orphan-audit nuance and resolved it with `*.disclosure_rolled_back`; apply the same to `member_terms.accept_rolled_back`.
- **3.5/3.4 gotchas to pre-empt:** `actorId: 'system'` → `22P02` (use `null`); `getMemberStateAt` is non-nullable (use `member.memberExists` for a clean 409, not `if (!state)`); `TERMINAL_STATES` is a local hardcoded set (W5 — keep `{'withdrawn','anonymized'}`, note the drift risk); status/GET on a missing member returns benign empty (W11) — fine here.
- **3.3b deferred reachability to 3.6** (R2): "a real first-signup user cannot reach the KYC step E2E until 3.6 wires member-creation-from-`signup_continuation` + the wizard chrome." 3.6a discharges exactly this — the signup-create → KYC E2E test is the proof.
- **3.2 deferred the wizard + continuation consumption to 3.6** (PR-Defer-1): `(auth)/otp.tsx` shows a placeholder for `signup_continuation`. 3.6a replaces it with the real hand-off. 3.2 built `completeMemberLogin`, the continuation token + table + insert; 3.6a adds only the consume + the create endpoint.
- **2.7 (consent registry) + the existing `terms-and-conditions` admin module** are both shipped; 3.6a adds the member-facing T&C read/accept on top (the admin module authors/approves; the member accepts).

## Git Intelligence Summary

Recent Epic-3 commits (3.1 → 3.5) show the cadence: domain schema + RLS + accessors → contracts → apps/api module → mobile screen → tests, merged via `pnpm ci:local` (Actions suspended — [[project_ci_actions_suspension_local_mirror]]). Migrations advanced 0018 (3.1) → 0026 (3.5). **3.6a breaks the per-story-migration pattern: it is migration-free** (it consumes the 3.1/3.2/2.7 substrate). The branch is `main` (3.5 merged as #49); start 3.6a from a fresh branch off `main` and commit manually (branch + selective stage, not the `commit-story` helper — [[project_story_automator_ops]]).

## Latest Tech Information

No new external libraries. Stack is fixed: Fastify member JWT sessions (3.2), `@fastify/jwt` continuation/select tokens, Google Tink + Cloud KMS Tier-1 envelope (Story 1.5), Drizzle 0.45, Zod + `.strict()` contracts, Expo Router `(signup)` group, `@twt/i18n`. The OTP/continuation seam (3.2), consent registry (2.7), audit chain (1.10), and member lifecycle projector (3.1) are all already shipped — 3.6a wires existing primitives, adds no dependencies.

## Project Context Reference

No `project-context.md` exists in this repo (only the generator template). Binding conventions live in CLAUDE.md auto-memory: [[project_member_lifecycle_domain_substrate]], [[project_live_db_test_gotchas]], [[project_ci_actions_suspension_local_mirror]], [[project_sprint_status_ledger]], [[project_friction_budget_baseline_ratchet]], [[project_eslint_config_per_package_cwd]], [[project_fastify_onsend_doublesend]], [[project_story_automator_ops]].

## Story Completion Status

Ultimate context engine analysis completed — comprehensive developer guide created. Status: ready-for-dev.

**Split + decisions resolved with BigDev 2026-06-27:** Story 3.6 split into **3.6a** (this — member creation + wizard + T&C) and **3.6b** (payment + reference-code seam + lock-in gate, backlog). Pariwar at signup = single v1 default (D1); Reference Code = port seam in 3.6b (D2); payment = receipt-event + gated transition in 3.6b (D3). No open decisions remain for 3.6a.

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (BMAD dev-story workflow, 2026-06-28).

### Debug Log References

- `pnpm ci:local` (DATABASE_URL on :5433) — 16/17 jobs green incl. the canonical **integration-tests**; the lone `test (unit)` failure is the documented parallel-:5433 contention flake ([[project_ci_actions_suspension_local_mirror]]) — confirmed by running `pnpm turbo run test` WITHOUT DATABASE_URL → 25/25 tasks green.
- New specs on :5433: `signup-create.spec.ts` (9) + `member-terms.spec.ts` (5) = 14/14; full member-surface regression (login-wall/member-auth/kyc/medical/nominee/terms-and-conditions) = 62/62.
- Contracts determinism + PII-scrape + friction-budget + i18n-parity gates: green.

### Completion Notes List

**What shipped (all 9 tasks, all 5 ACs):**
- **AC1 — member creation from `signup_continuation`** (`signup.handlers.ts` `signupCreate`, the FIRST production `projectMemberState` caller): verifies the continuation bearer (`verifySignupContinuation`), re-derives the blind index from the re-sent plaintext mobile and binds it to the token `sub` (R2; mismatch → 401 `auth.signup_mobile_mismatch`), atomically consumes the single-use jti (`consumeSignupContinuation` — mirror of `consumePariwarSelect`; already-consumed → 409 `auth.signup_continuation_consumed`, missing/expired → 401 `auth.signup_continuation_expired`), then in ONE scope-tx emits `member.signup_initiated` (`{from_state:null→pending-kyc}`) + inserts the Tier-1 `member_identities` row (`insertMemberIdentity` domain accessor), and after commit reuses `completeMemberLogin` for the full session (exported it for reuse).
- **AC2 — single default Pariwar (D1):** resolved from new config `defaultSignupPariwarId` (`DEFAULT_SIGNUP_PARIWAR_ID`); a duplicate signup for `(default Pariwar, mobile)` → clean 409 `auth.member_already_exists` (pre-check via `resolveMembersByMobile` + a unique-violation catch via `isMemberIdentityDuplicate` for the race). **Multi-Pariwar signup selection is DEFERRED** (the `UNIQUE(pariwar_id, mobile_blind_index)` already permits the same mobile in other Pariwars later; v1 creates exactly one).
- **AC3 — T&C accept (`tc_acceptance`, the 2nd consent-registry consumer):** new member-facing `modules/terms` module; GET emits the PRECOMPUTED `body_html_rendered` (no read-time markdown render; 503 `terms.unavailable` when unprovisioned); accept copies Story 3.5's audit-or-throw chain VERBATIM (resolve effective T&C server-side → `writeAuditEntry` FIRST → `recordConsent({auditId})` in the scope-tx → `ok=true` → `emitAuthAudit` last → compensating `member_terms.accept_rolled_back` 5xx on rollback). No-effective-T&C → 409 atomically (no orphan consent/audit — the highest-value test passes).
- **AC4 — wizard assembly (mobile):** `(signup)/_layout.tsx` upgraded to wizard chrome (progress indicator derived from the route segment + ordered Stack via `lib/wizard-steps.ts`); `(auth)/otp.tsx` `signup_continuation` placeholder replaced with the real hand-off (`signupCreate` SDK → store full session → enter `(signup)/tc`); new `tc.tsx` (scroll-to-read gate, accept CTA, 503/retry, a11y); `tc→kyc→nominees→medical→payment` chained; a new `payment.tsx` PLACEHOLDER (3.6b replaces it). a11y: every control `accessibilityLabel`+`accessibilityHint`, progress announced, bilingual via `@twt/i18n`. Mobile build/test are repo no-ops → verified by `typecheck` + `lint`.
- **AC5 — scope guard:** NO payment/receipt-table/reference-code/lock-in-gate/`vyawastha_shulk.paid`/`member.lock_in_entered` — all 3.6b. A 3.6a member ends at `pending-kyc`, progresses through KYC → `pending-fee`, and stops at the payment hand-off placeholder. **Migration-free** (consumes 3.1/3.2/2.7 tables; no 0027).

**Decisions / deviations (folded, not silently assumed):**
- **Pariwar-unconfigured 503 is checked BEFORE the jti is consumed** (a pure server-misconfiguration with no member dependency — burning a one-shot continuation on it would just re-503 on retry). All member-dependent rejections (mismatch/consumed/duplicate) keep AC1's ordering.
- **GET `/member/terms` `locale`** comes from an optional `?locale` query (en|hi, default en) and is echoed into the response (the T&C registry stores one canonical legal body per Pariwar — no per-locale column); the accept request carries the member's UI `locale` into the consent payload.
- **T&C body on mobile** is displayed as scrollable text via a minimal tag-strip of the server's already-sanitized HTML (RN has no DOM `set:html`, and "no new libraries") — NOT a markdown re-render (the precomputed `body_html_rendered` is still the source).
- The existing kyc/nominees/medical screens' terminal navigation was re-pointed to the next wizard step (was `/(tabs)`), preserving their step order — the minimal "wired into the flow" edit.

**Wizard order (record for 3.6b to assert against, R6):** `signup-create (→pending-kyc) → tc → kyc (→pending-fee) → nominees → medical → [payment hand-off]`. The HARD constraint for 3.6b's lock-in gate: the `tc_acceptance` consent + nominee + medical events all exist before payment — satisfied.

**Provisioning precondition (R3 — flag to BigDev):** for signup to function in prod, `DEFAULT_SIGNUP_PARIWAR_ID` must point at a launch Pariwar that (a) has a `pariwar_passport` row and (b) carries an approved/effective `terms_and_conditions_versions` row — without (b), AC3's GET 503s and accept 409s, stalling the wizard at the T&C step for every new member. This is the cross-cutting "every production Pariwar must carry its registry before a member can finish signup" obligation 3.5 R6 raised — 3.6a is where it becomes user-visible.

### File List

**New — apps/api:** `src/modules/auth/member/signup.handlers.ts`, `src/modules/terms/{member-terms.handlers.ts,member-terms.routes.ts,index.ts}`, `tests/integration/signup/signup-create.spec.ts`, `tests/integration/terms/member-terms.spec.ts`.
**New — @twt/contracts:** `src/members/signup.ts`, `src/terms/{member-terms.ts,index.ts}`.
**New — @twt/domain:** `src/member/identity-write.ts`.
**New — apps/mobile:** `app/(signup)/{tc.tsx,payment.tsx}`, `lib/wizard-steps.ts`.
**Edited — apps/api:** `src/modules/auth/member/{member-auth.repo.ts (+consumeSignupContinuation), tokens.ts (+verifySignupContinuation), member-auth.handlers.ts (export completeMemberLogin), member-auth.routes.ts (+ /signup/create)}`, `src/config.ts (+defaultSignupPariwarId)`, `src/audit/audit-sink.ts (+member_signup.* +member_terms.accepted)`, `src/server.ts (+registerMemberTermsModule)`, `tests/integration/login-wall.spec.ts (+ /signup/create allowlist)`.
**Edited — @twt/contracts:** `src/index.ts`, `src/members/index.ts`, `scripts/emit-openapi.ts`, `openapi/v1.yaml` (regenerated).
**Edited — @twt/domain:** `src/member/index.ts`.
**Edited — @twt/api-client:** `src/index.ts (+signupCreate/memberTerms/memberTermsAccept)`.
**Edited — apps/mobile:** `app/(signup)/{_layout.tsx,kyc.tsx,nominees.tsx,medical.tsx}`, `app/(auth)/otp.tsx`.
**Edited — other:** `packages/i18n/locales/{en,hi}/common.json`, `friction-budget.md`, `_bmad-output/implementation-artifacts/sprint-status.yaml`.

### Change Log

- 2026-06-28 — Implemented Story 3.6a (dev-story): member creation from the `signup_continuation` seam (first production `projectMemberState`), the member-facing T&C read/accept (2nd consent-registry consumer, audit-or-throw), and the signup-wizard assembly + entry hand-off + `tc.tsx`/`payment.tsx`. Migration-free. 14 new integration tests; `ci:local` green (integration-tests canonical signal; `test (unit)` parallel-:5433 flake confirmed via isolated run). Status ready-for-dev → in-progress → review.
