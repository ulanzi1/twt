---
baseline_commit: 66dd3253ddea1f1d7abb68dd3594e574089a0b86
---

# Story 3.10: Voluntary Withdrawal Flow with ₹110 Forfeit + 12-Month Rejoin Lock

Status: in-progress

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a member choosing to leave TWT voluntarily,
I want a withdrawal flow that forfeits the ₹110 Vyawastha Shulk, preserves my contribution history (anonymized later via Story 3.12), and blocks rejoin under the same identity for 12 months,
so that voluntary exit is dignified, audit-preserved, and abuse-resistant.

## Acceptance Criteria

**AC1 — The withdrawal flow (five stages).** Given FR-6 + UX-DR55 Pattern 4 dignified-validation copy, when the withdrawal flow is implemented, then the flow includes, in order:
- **(a) Acknowledgment screen** — states plainly what withdrawal does: *"Withdrawing will forfeit your ₹110, retain your contribution history (later anonymized), and prevent rejoin for 12 months under the same identity — are you sure?"* Bilingual (en/hi parity, Story 2.1 contract; tone passes the Story 2.2 vocabulary check).
- **(b) Optional reason capture** — a bounded dropdown (`reason_code`, non-PII enum) + an OPTIONAL free-text field (`reason_text`, potentially PII → Tier-1 encrypted, never in any event/audit payload). Both optional; a member may withdraw with no reason.
- **(c) Step-up OTP** — `requireMemberStepUp(deps, 'withdrawal')` gates the confirm route (new DISTINCT action context `'withdrawal'`; an elevation for `nominee_change`/`medical_change`/etc. does NOT satisfy it, and vice-versa).
- **(d) Final confirmation** — an explicit confirm action distinct from the acknowledgment (two-step intent; no accidental single-tap withdrawal).
- **(e) State transition to `withdrawn`** — the confirm handler emits `member.withdrawal_completed` via `projectMemberState`, advancing the lifecycle `active` / `active-in-grace` / `lapsed-unpaid` → `withdrawn`. A `member.withdrawal_requested` NON-TRANSITION marker MAY be emitted at flow start (see Dev Notes — decide per the marker guidance); the `withdrawal_completed` transition is the load-bearing one.

**AC2 — Dignified-validation copy (Pattern 4), validated against Story 0.9.** Given UX-DR55 Pattern 4 (§Pattern 4: Dignified Validation, ux-design-specification.md:2334) validated against Story 0.9 bereaved-spouse findings, when any withdrawal screen is rendered, then: NO aggressive retention attempts, NO scarcity/loss framing, NO "are you sure you want to lose…" dark patterns. The framing is *"we understand; here is exactly what happens."* All member-facing strings resolve from `@twt/i18n` (en/hi parity). The ₹110 forfeit is stated as fact, not as a threat.

**AC3 — 12-month rejoin lock, enforced at signup.** Given FR-6 + architecture §2.12 (line 1735), when a withdrawal completes, then a rejoin-lock record is written with `rejoin_permitted_at = withdrawn_at + 12 months` (clock-injected, no raw `Date.now()`). When a later signup attempt (Story 3.6a `signupCreate`) resolves the same identity within the window, then signup is BLOCKED with a clear, dignified copy block: *"This identity withdrew on {withdrawn_at}; rejoin is permitted on {rejoin_permitted_at}."* (error code `auth.rejoin_locked`). **v1 keys the lock on the mobile blind index** (the only durable identity blind-index today — see Dev Notes §"Rejoin-lock key: decision + rationale"); the record carries a NULLABLE `aadhaar_hmac` **forward-compat seam column** so Story 3.3a can backfill the architecture-committed Aadhaar-HMAC key later WITHOUT a schema migration.

**AC4 — Audit + event-stream discipline.** Given the withdrawal completes, when persisted, then (a) the audit log records the withdrawal via Story 1.10 (NON-PII context: masked mobile / member_id / `reason_code` only — NEVER the free-text `reason_text`); (b) the `member.withdrawal_completed` event (and the optional `member.withdrawal_requested` marker) carry the `auditShape` payload ONLY — the frozen `WithdrawalCompletedPayloadSchema` / `WithdrawalRequestedPayloadSchema` are `.strict()` and MUST NOT be widened; (c) the reason PII lives ONLY in the new `member_withdrawals` table, Tier-1 encrypted.

**AC5 — Terminal-state discipline + history intact.** Given the withdrawal, when the transition applies, then: withdrawal is legal ONLY from `active` / `active-in-grace` / `lapsed-unpaid` (the reducer already enforces this — a withdrawal event from any other state is IDENTITY/no-op); a member already `withdrawn` / `anonymized` cannot re-withdraw (guard the route). This story (3.10) closes at `state = withdrawn` with contribution history **intact and NOT-yet-anonymized** — the RTBF anonymization is Story 3.12's consumer extension (do NOT anonymize here). No refund is issued (the ₹110 is forfeited, not returned).

## Tasks / Subtasks

> **Execution-order constraint (mirror 3.9):** Tasks 1–3 (domain storage/schema/migration + repo) must be complete before Tasks 4–5 (contracts, API routes). Tasks 6–8 (signup rejoin-lock wiring, api-client, mobile) depend on the routes + contracts existing. Do NOT start Task 8 mobile screens before Task 5 routes exist.

- [x] **Task 1 — `member_withdrawals` storage table (domain).** (AC1b, AC3, AC4, AC5)
  - [x] New schema `packages/domain/src/schema/member_withdrawals.ts` — ONE row per member (PK = `member_id`, FK → `members.member_id` `onDelete: 'cascade'` for RTBF; mirror `member_kyc_profiles.ts` PK+FK posture). Columns: `pariwar_id` (RLS predicate, branded), `reason_code text` NULLABLE (bounded dropdown value, non-PII), `reason_text_ciphertext` NULLABLE `piiColumn(1, 'member_withdrawal')` (Tier-1 envelope of the optional free-text — mirror `member_kyc_profiles` name/dob ciphertext), `withdrawn_at timestamptz NOT NULL`, `rejoin_permitted_at timestamptz NOT NULL`, `aadhaar_hmac text` **NULLABLE forward-compat seam** (Story 3.3a backfill — see Dev Notes; annotate as non-PII per blind-index posture), `created_at`.
  - [x] Add `MEMBER_WITHDRAWAL_FIELD_CLASS = 'member_withdrawal'` to `apps/api/src/context.ts` (mirror `MEMBER_ADDRESS_FIELD_CLASS`).
  - [x] RLS policy `packages/domain/src/policies/member-withdrawals-rls.ts` (mirror `member-addresses-rls.ts`: tenant-isolated, FORCE RLS); register in the policy barrel `policies/index.ts`. GRANT SELECT + INSERT + **UPDATE** on this table (unlike the append-only Life Events tables — the `aadhaar_hmac` seam column is designed to be backfilled by a later UPDATE; and RTBF/anonymization may touch it). Note the deviation from the append-only pattern in the schema header.
  - [x] Migration `0032_member-withdrawals.sql` (hand-authored; latest applied is `0031` — confirm before numbering; mirror `0030_member-addresses.sql` GRANT + FORCE RLS + POLICY structure). Add the matching `migrations/meta/_journal.json` `when` entry (drizzle skips by journal `when`, not SQL hash — [[project_live_db_test_gotchas]]). Never regenerate an applied migration; never `DROP SCHEMA`.

- [x] **Task 2 — Withdrawal write + rejoin-lock read (domain).** (AC1e, AC3, AC5)
  - [x] `packages/domain/src/member/withdrawal.ts`: `insertMemberWithdrawal(client, { memberId, pariwarId, reasonCode?, reasonTextCiphertext?, withdrawnAt, rejoinPermittedAt })` (single-row insert; `ON CONFLICT (member_id) DO NOTHING` or reject a second withdrawal — a member has at most one active withdrawal record). Export from `member/index.ts`.
  - [x] The rejoin-lock READ is served pre-scope at signup via the servicePool (BYPASSRLS) — see Task 6. Provide `getRejoinLockByMemberId` or fold it into the signup repo query (Task 6 extends `resolveMembersByMobile`); keep the domain accessor thin.
  - [x] `AadhaarHmac`/`WithdrawalId` brand only if a new id is needed (PK is `member_id`, already `MemberId` — likely NO new brand required; confirm).

- [x] **Task 3 — Confirm the reducer needs NO change (domain).** (AC5)
  - [x] `packages/domain/src/member/state.ts:110` already routes `member.withdrawal_completed`: `active` / `active-in-grace` / `lapsed-unpaid` → `withdrawn`, else IDENTITY. `member.withdrawal_requested` is a NON-TRANSITION marker (identity). **Do NOT touch `state.ts` or `events.ts`** — Story 3.1 froze both events + payload schemas; this story is the FIRST EMITTER, not an author. Add a DB-free unit test asserting the withdrawal transition + the terminal-state no-op (from `withdrawn`/`anonymized`/pre-active → identity), mirroring `tests/member/life-events-markers.test.ts`.

- [x] **Task 4 — Contracts (`packages/contracts/src/withdrawal/`).** (AC1, AC3)
  - [x] `WithdrawalReasonCode` — a bounded `z.enum([...])` of dropdown reason codes (e.g. `financial`, `relocation`, `dissatisfied`, `personal`, `other`; confirm the set against UX/i18n — keep it small, non-PII). Plain primitives, no `@twt/domain` import (browser-bundle rule); NO `.openapi()` unless the withdrawal route is added to `openapi/v1.yaml` (match the nominee/medical/life-events posture — verify before authoring; keep `v1.yaml` byte-stable + determinism gate green).
  - [x] `WithdrawalConfirmRequest` = `{ reasonCode?: WithdrawalReasonCode, reasonText?: string (max length, optional) }` `.strict()`. `reasonText` is REQUEST-only PII (never echoed back).
  - [x] `WithdrawalStatusResponse` (or reuse a member-status shape) — the confirm response: `{ state: 'withdrawn', withdrawnAt, rejoinPermittedAt }` so the mobile client can show the dignified "you have withdrawn; rejoin permitted on {date}" confirmation. Barrel-export from `contracts/src/index.ts`.

- [x] **Task 5 — API withdrawal route (`apps/api/src/modules/withdrawal/` — new module).** (AC1, AC4, AC5)
  - [x] `POST /api/v1/member/withdrawal` — preHandler `[requireMemberSession, requireMemberStepUp(deps, 'withdrawal')]`. Handler (mirror `life-events/handlers.ts` scope-tx ordering): (1) load current state; **guard** the member is in a withdrawable state — write a NEW `assertWithdrawable` function local to this module (do NOT import or call `assertMemberExistsAndNotTerminal` from life-events; that function only rejects `{withdrawn, anonymized}` and throws `life_events.member_terminal`, which is the wrong check and the wrong error code here); `assertWithdrawable` must ONLY permit `{active, active-in-grace, lapsed-unpaid}` and reject everything else — including pre-active states (`pending-fee`, `pending-verification`, `locked-in`) where the reducer would silently return identity — with a withdrawal-specific error code (e.g. `withdrawal.invalid_state`); (2) compute `rejoinPermittedAt = clock() + 12 months` (clock-injected; use the same date-math seam the renewal 3.8 grace window uses — no raw `Date.now()`); (3) in ONE member scope-tx: `insertMemberWithdrawal(...)` (Tier-1-encrypt `reasonText` if present via the module's crypto helper — mirror `life-events/address-crypto.ts`) + `projectMemberState(scopeTx.client, { eventType: 'member.withdrawal_completed', payload: { from_state: <current>, to_state: 'withdrawn', trigger: 'voluntary_withdrawal', actor: 'member' }, ... })`; (4) emit the audit line AFTER the status build succeeds (nominee.handlers.ts:158 ordering — a rollback must not leave a phantom audit); (5) return `WithdrawalStatusResponse`.
  - [x] Decide + document the `member.withdrawal_requested` marker (AC1e / Dev Notes §"withdrawal_requested marker"): either emit it at flow start (a distinct request → server records the intent marker) OR omit it if the flow is a single confirm call. Whichever — keep it a NON-TRANSITION marker; do NOT let it move state.
  - [x] Register `registerWithdrawalModule` in `apps/api/src/server.ts`. Confirm `login-wall.spec.ts` stays green (new session-gated route recognized).
  - [x] Add audit-sink action type(s) `member_withdrawal.completed` (NON-PII context: `member_id`, masked mobile, `reason_code`, `rejoin_permitted_at` — NEVER `reason_text`) to `apps/api/src/audit/audit-sink.ts` (mirror `member_life_events.*` at :124).

- [x] **Task 6 — Signup rejoin-lock enforcement (extend Story 3.6a `signupCreate`).** (AC3) — **the abuse-resistance spine; do not skip.**
  - [x] Extend `resolveMembersByMobile` (`apps/api/src/modules/auth/member/member-auth.repo.ts:35`) to also return, per resolved membership, the member `state` (LEFT JOIN `members`) and `rejoin_permitted_at` (LEFT JOIN `member_withdrawals`). It already runs on the BYPASSRLS `servicePool` pre-scope — the new joins read cross-tenant safely there. **Also widen the `ResolvedMembership` TypeScript interface** (`member-auth.repo.ts:21-26` — currently `{ memberId, pariwarId, pariwarName }`) to add `state?: string | null` and `rejoinPermittedAt?: string | null`; without this the TypeScript compiler rejects access to those fields in `signup.handlers.ts` at the branch point.
  - [x] In `signup.handlers.ts` (the duplicate-signup guard at ~line 100), branch on the resolved membership for THIS pariwar:
    - state NOT in {`withdrawn`, `anonymized`} → existing 409 `auth.member_already_exists` (UNCHANGED).
    - state in {`withdrawn`, `anonymized`} AND `now < rejoin_permitted_at` → **403 `auth.rejoin_locked`** with a payload/message carrying `withdrawn_at` + `rejoin_permitted_at` so the client renders the dignified date copy (AC3). Audit the blocked attempt (NON-PII: masked mobile + `rejoin_permitted_at`).
    - state in {`withdrawn`, `anonymized`} AND `now >= rejoin_permitted_at` → **post-window rejoin is OUT OF SCOPE for 3.10** (architecture §1.14 line 1248 routes it `withdrawn → pending-fee`, a reactivation path that collides with the `member_identities` `UNIQUE(pariwar_id, mobile_blind_index)` row and is a distinct capability). For v1, keep the current behavior (still 409 `auth.member_already_exists`) and **record the post-window rejoin path as explicitly DEFERRED** (Completion Notes + [[deferred-work]]). Do NOT silently pretend it works.
  - [x] The rejoin check keys on the mobile blind index the signup handler ALREADY computes (`resolveMembersByMobile(servicePool, blindIndex)`); no new crypto.

- [x] **Task 7 — api-client SDK.** (AC1) Add `withdrawMember(body: WithdrawalConfirmRequest)` (response-validated against `WithdrawalStatusResponse`) to `packages/api-client/src/index.ts` (`WITHDRAWAL_BASE` const; mirror the `lifeEvents*` methods). The signup rejoin-lock 403 surfaces through the EXISTING signup api-client method — ensure `auth.rejoin_locked` is a distinguishable error code on that path (the client keys on `error.code`, not bare 403 — 3.9 step-up lesson).

- [x] **Task 8 — Mobile withdrawal flow + rejoin-block copy (`apps/mobile`).** (AC1, AC2)
  - [x] New screen group `apps/mobile/app/(withdrawal)/` (mirror the `(life-events)` group): acknowledgment screen (AC1a) → reason screen (dropdown + optional free-text, AC1b) → step-up OTP (reuse `useStepUpGate` keyed on `error.code === 'auth.step_up_required'` → request/verify/retry the SAME confirm mutation — 3.9 precedent) → final confirmation (AC1d) → withdrawn confirmation view showing `rejoinPermittedAt`. Register the `(withdrawal)` group in `app/_layout.tsx`; add an entry point from profile/settings (NOT a prominent home CTA — withdrawal is deliberate, not encouraged).
  - [x] Wrap scrollable content in `ScrollView` (3.5 review lesson — bare `YStack flex={1}` clips CTAs on small devices). Calm register throughout; no urgency/scarcity theater (AC2).
  - [x] **Rejoin-block copy at signup:** in the mobile `(signup)` flow, when `signupCreate` returns `auth.rejoin_locked`, render the dignified date-block screen (*"This identity withdrew on {date}; rejoin is permitted on {date}"*) — route to a dignified explanation surface, NOT a generic error toast (Pattern 4 recovery, ux-design-specification.md:2369). Reuse the 503/unavailable graceful-surface pattern from 3.6a `tc.tsx` / 3.5 `medical.tsx`.
  - [x] Verify mobile via `typecheck` + `lint` (build/test are intentional repo no-ops — 3.8/3.9 Dev Agent Record).

- [x] **Task 9 — i18n keys (en + hi parity).** (AC1, AC2) Add `withdrawal.*` keys to `packages/i18n/locales/{en,hi}/common.json`: acknowledgment title/body (the exact forfeit + 12-month + anonymization copy), reason dropdown labels (one per `WithdrawalReasonCode`) + free-text placeholder, step-up prompt (reuse `lifeEvents.step_up_*` if aligned), final-confirm CTA, withdrawn-confirmation copy (with `{date}` interpolation), and the signup `rejoin_locked` block copy (with `{withdrawnDate}` + `{rejoinDate}`). Calm/dignified register — run the tone check (Story 2.2). Keep en/hi parity (the i18n parity gate must stay green).

- [x] **Task 10 — Tests.** (all ACs)
  - [x] Domain unit (`packages/domain/tests/member/withdrawal.test.ts`): reducer withdrawal transition from each of `active`/`active-in-grace`/`lapsed-unpaid` → `withdrawn`; terminal/pre-active states → identity (no-op); `withdrawal_requested` marker is identity.
  - [x] Domain integration (`tests/integration/member/member-withdrawals.spec.ts`, :5433): row persists; `reason_text_ciphertext` is ciphertext at rest (never plaintext); cross-tenant RLS invisibility (positive + negative); FK cascade (RTBF) deletes the row; `aadhaar_hmac` accepts a backfill UPDATE (seam works).
  - [x] API integration (`apps/api/tests/integration/withdrawal/withdrawal.spec.ts`, :5433): confirm route requires `withdrawal` step-up (403 `auth.step_up_required` without elevation; passes WITH matching-context elevation; a `nominee_change` elevation does NOT satisfy it — the reverse cross-context assertion, 3.9 P8); emits `member.withdrawal_completed` (right type, `auditShape`-only payload, NO reason PII in the event); state → `withdrawn`; audit line written with `reason_code` but NEVER `reason_text`; reason PII never echoed / never at-rest plaintext; already-`withdrawn` member re-withdrawal rejected.
  - [x] Signup rejoin-lock integration (extend `apps/api/tests/integration/.../signup*.spec.ts`): a withdrawn member's mobile → signup 403 `auth.rejoin_locked` with `rejoin_permitted_at`; a non-withdrawn duplicate → still 409 `auth.member_already_exists`; (clock-advanced past the window path → documented DEFERRED, assert current 409 behavior).
  - [x] `pnpm ci:local` (DATABASE_URL on :5433) is the merge gate — GitHub Actions suspended ([[project_ci_actions_suspension_local_mirror]]). Run it green before marking review. Confirm any suspect live-DB flake by isolating the spec ([[project_known_livedb_test_failures]]).

### Review Findings

> Code review run 2026-07-02 via bmad-code-review (Blind Hunter + Edge Case Hunter + Acceptance Auditor).

**Decision-needed:**
- [x] [Review][Decision] D1 — Reason capture is radio buttons, not a bounded dropdown per AC1(b) — Dismissed: radio-button style accepted as satisfying AC1(b) spirit (bounded non-PII selection); no code change required.

**Patches:**
- [x] [Review][Patch] P1 — `addMonths` Feb 29 leap-year overflow → rejoin lock 1 day too late [`apps/api/src/modules/withdrawal/handlers.ts:47-51`] — fixed: added `targetMonth` check + `setDate(0)` clamp
- [x] [Review][Patch] P2 — Concurrent withdrawal race → unhandled 500 on PK collision (no error translation in handler) [`apps/api/src/modules/withdrawal/handlers.ts`] — fixed: added `catch` block translating `code === '23505'` → `ConflictError('withdrawal.invalid_state')`
- [x] [Review][Patch] P3 — `assertWithdrawable` throws `ConflictError` (409) for "member not found" — should be 404 [`apps/api/src/modules/withdrawal/handlers.ts:83`] — fixed: changed to `NotFoundError`
- [x] [Review][Patch] P4 — Missing index on `member_withdrawals.pariwar_id` (RLS policies + signup LEFT JOIN scan this column) [`packages/domain/migrations/0032_member-withdrawals.sql`] — fixed: added `CREATE INDEX member_withdrawals_pariwar_id_idx`
- [x] [Review][Patch] P5 — Double `deps.clock()` call: `withdrawnAt` captured pre-tx vs `getMemberStateAt` uses a second clock in-tx → `from_state` and `withdrawn_at` can reflect different instants [`apps/api/src/modules/withdrawal/handlers.ts:85,106`] — fixed: `assertWithdrawable` now takes `at: Date`; caller passes `withdrawnAt`
- [x] [Review][Patch] P6 — `onVerifyOtp` stuck UI: after `stepUpVerify` succeeds but `withdrawMember` retry throws, `otp` is cleared → Verify button permanently disabled [`apps/mobile/app/(withdrawal)/index.tsx:onVerifyOtp`] — fixed: `verifySucceeded` flag; calls `stepUp.reset()` on mutation failure so Confirm button reappears

**Deferred:**
- [x] [Review][Defer] W-R1 — Phantom audit on COMMIT failure (scope-tx design; pre-existing pattern shared with all handlers) — deferred, pre-existing
- [x] [Review][Defer] W-R2 — `withdrawn_at` in `member_withdrawals` vs `occurred_at` in `events_log` slight divergence (pre-existing clock/scope-tx architecture) — deferred, pre-existing
- [x] [Review][Defer] W-R3 — FOR ALL RLS policy scope allows any same-pariwar session to UPDATE any member's withdrawal row (by-design for aadhaar_hmac backfill seam; no route exposes it) — deferred, by-design
- [x] [Review][Defer] W-R4 — `withdrawn` state with no `member_withdrawals` row → falls silently to 409 `auth.member_already_exists` trap (inconsistent state not reachable in normal operation; RTBF story 3.12 would cascade-delete the row) — deferred, pre-existing
- [x] [Review][Defer] W-R5 — URL params in `rejoin-locked.tsx` not validated before `formatWithdrawalDate` (has a fallback; cosmetic; requires deliberate deep-linking to trigger) — deferred, pre-existing
- [x] [Review][Defer] W-R6 — Past-window withdrawn member loses forensic audit traceability (falls to `member_signup.failure` audit with `member_already_exists`; same category as deferred W2 in deferred-work.md) — deferred, pre-existing
- [x] [Review][Defer] W-R7 — `resolveMembersByMobile` LEFT JOIN `member_withdrawals` missing `pariwar_id` predicate → cross-pariwar lock pollution in R2 multi-pariwar case (R2 is explicitly D1/deferred in v1) — deferred, pre-existing
- [x] [Review][Defer] W-R8 — Stale `now` in signup rejoin-lock boundary comparison (milliseconds in practice; pre-existing pattern across signup handler) — deferred, pre-existing
- [x] [Review][Defer] W-R9 — Post-lock members blocked with 409 instead of rejoin path (already in deferred-work.md W2) — deferred, pre-existing
- [x] [Review][Defer] W-R10 — `masked_mobile` absent from `member_withdrawal.completed` audit context (already in deferred-work.md W3) — deferred, pre-existing

## Dev Notes

### Rejoin-lock key: decision + rationale (READ FIRST — this shaped the story)

The epic AC says *"rejoin under same `aadhaar + ehrms` is blocked"*; architecture §2.12 (line 1735) commits the mechanism as *"Aadhaar HMAC hash retained for the 12-month rejoin lock."* **Neither can be implemented as written against the shipped code:**
- The full Aadhaar is **masked to last-4 at the KYC provider boundary** (`apps/api/src/modules/kyc/providers/digilocker/mapper.ts:4-5`) and never retained — there is nothing to HMAC at withdrawal time.
- **eHRMS is stored nowhere** in the schema today (no field exists), despite the epic narrative.
- **Manual-fallback KYC members have no Aadhaar at all** (`verification_strength = self_declared`).
- The **only durable identity blind-index that exists is the mobile blind index** (`member_identities.mobile_blind_index`), which is already the Story 3.6a signup dedup key.

**Decision (user-confirmed, 2026-07-01): key the v1 lock on the mobile blind index, and add a NULLABLE `aadhaar_hmac` forward-compat seam column** to `member_withdrawals` so Story 3.3a can backfill the architecture-committed Aadhaar-HMAC key later WITHOUT a schema migration. This ships the SURFACE lock now and leaves a clean seam for the architecture-faithful key.

**Honesty obligations (non-negotiable — [[feedback_record_unattested_no_backfill]], [[feedback_closure_language_precision]]):**
- Record in Completion Notes that the architecture §2.12 Aadhaar-HMAC control is **un-attested / not-yet-wired** and carried as OPEN RISK (the mobile-blind-index lock is evadable with a fresh mobile number). Do NOT claim the architecture control is satisfied.
- Record the **post-12-month rejoin path (architecture §1.14 line 1248, `withdrawn → pending-fee`) as explicitly DEFERRED** — it is a reactivation capability that collides with the `member_identities` UNIQUE index and is out of scope for this [SURFACE] story. Add both to [[deferred-work]].

### The lifecycle events already exist — this story is the FIRST EMITTER, not an author

`member.withdrawal_requested` (marker) and `member.withdrawal_completed` (transition) were BOTH authored + frozen in Story 3.1 (`packages/domain/src/member/events.ts:97-98, :170, :220-221`; payload schemas `WithdrawalCompletedPayloadSchema` / `WithdrawalRequestedPayloadSchema` are `z.object({ ...auditShape }).strict()`). The reducer (`state.ts:110-114`) already routes the transition. **Do NOT add event types, widen payloads, or touch the reducer** — the frozen `.strict()` schemas mean you *cannot* stuff the withdrawal reason into the event anyway (that is by design: R1 PII discipline). Grep confirms these two events have ZERO current emitters — 3.10 is the first.

### withdrawal_requested marker (decide in Task 5)

The `withdrawal_requested` NON-TRANSITION marker exists for flows that record the INTENT before the completion (events.ts:113-114). If the mobile flow is a single confirm call (ack + reason + step-up + confirm all resolve to one `POST /withdrawal`), the marker adds little and MAY be omitted. If you split "request" (start) from "confirm" (complete), emit `withdrawal_requested` at start. Either is spec-legal; document the choice. The marker must stay identity (never move state).

### Persistence pattern (mirror 3.4/3.5/3.8/3.9)

One member scope-tx per write: persist the `member_withdrawals` row + `projectMemberState(scopeTx.client, {...})` in the SAME transaction, then emit the audit line AFTER the status build succeeds (`nominee.handlers.ts:158` comment — a rollback must not leave a phantom audit). Tier-1-encrypt the optional `reason_text` via a module crypto helper mirroring `apps/api/src/modules/life-events/address-crypto.ts`. The `withdrawal-crypto.ts` encryption context must scope to `pariwarId` (NOT `memberId`) — matching `address-crypto.ts`'s `encContext` shape exactly: `{ pariwarId, fieldClass: MEMBER_WITHDRAWAL_FIELD_CLASS }`. `member_withdrawals` is tenant-isolated (RLS + FORCE), `piiColumn(1, 'member_withdrawal')` on the reason ciphertext for the Story 1.16b PII-shielding CI gate.

**Deviation from the append-only Life Events tables:** `member_withdrawals` grants **UPDATE** (not INSERT-only) because the `aadhaar_hmac` seam is designed for later backfill and RTBF may touch the row. Note this in the schema header (contrast `member_addresses`/`member_postings`, which are INSERT-only append-only history).

### Step-up: member analogue (Story 3.2/1.9/3.9)

Use `requireMemberStepUp(deps, 'withdrawal')` from `apps/api/src/modules/auth/member/member-step-up.gate.ts:21`. Elevation lives in `member_step_up_elevations` (server record), bound to a single `action_context` for a ~5-min window. Use the DISTINCT context `'withdrawal'` (existing contexts in use: `nominee_change`, `medical_change`, `member.login`, `member.demo`) so no other elevation satisfies it. **Mobile: detect the 403 by `error.code === 'auth.step_up_required'`, not bare HTTP 403** (a plain 403 can mean wrong-role/wrong-pariwar) — `apps/api/src/http-errors.ts:115`; drive `POST /member/auth/step-up/request` → `/verify` → retry the SAME mutation (`useStepUpGate`, 3.9).

### Signup rejoin-lock: where + how (Story 3.6a integration)

The rejoin check runs in `signup.handlers.ts` (`signupCreate`), at the existing duplicate-signup guard (~line 100) that calls `resolveMembersByMobile(deps.servicePool, blindIndex)`. That query runs on the BYPASSRLS `servicePool` PRE-scope (no member context yet), joining `member_identities → pariwar_passport`. Extend it to LEFT JOIN `members` (for `state`) and `member_withdrawals` (for `rejoin_permitted_at`), then branch (Task 6). The mobile blind index is the ONLY key needed here — the handler already computes it. Keep AC1's existing ordering (the Pariwar-unconfigured 503 and mobile-mismatch/consumed checks are unchanged).

### PII discipline (R1) — non-negotiable

- The `member.withdrawal_completed` / `withdrawal_requested` event payloads carry `auditShape` ONLY (frozen `.strict()` — cannot carry the reason). 
- The audit context carries `reason_code` (bounded enum, non-PII) + masked mobile + `member_id` + `rejoin_permitted_at` — **NEVER `reason_text`**.
- The free-text `reason_text` lives ONLY in `member_withdrawals.reason_text_ciphertext` (Tier-1 envelope). Tests assert it is never in the event payload, the audit context, the confirm response, or at-rest plaintext.
- `reason_code` and `aadhaar_hmac` and `district`-style geographic/marker fields are non-PII; the mobile blind index is a deterministic HMAC (not raw PII).

### Existing source map (files to read before editing)

- `apps/api/src/modules/life-events/{handlers.ts,routes.ts,index.ts,address-crypto.ts}` — the FRESHEST module precedent (scope-tx ordering, Tier-1 crypto helper, `assertMemberExistsAndNotTerminal` guard at `handlers.ts:41-106`, audit-after-ok). Model the withdrawal module on this; write a NEW `assertWithdrawable` local to the withdrawal module — do NOT import the life-events guard.
- `packages/domain/src/member/{state.ts:110,events.ts:97}` — the frozen withdrawal transition + payload schemas (READ; do NOT edit).
- `packages/domain/src/member/project.ts:72` — `projectMemberState` signature (`{ memberId, pariwarId, eventType, payload, actorId }`); it `.parse()`s the payload against `MEMBER_EVENT_PAYLOAD_SCHEMAS`.
- `apps/api/src/modules/auth/member/{signup.handlers.ts:100,member-auth.repo.ts:35}` — the duplicate-signup guard + `resolveMembersByMobile` to extend (Task 6). **Current behavior:** blanket 409 for any existing member in the pariwar. **Change:** distinguish withdrawn+in-window → `rejoin_locked`.
- `apps/api/src/modules/auth/member/member-step-up.gate.ts:21` — `requireMemberStepUp(deps, actionContext)`.
- `packages/domain/src/schema/{member_kyc_profiles.ts,member_addresses.ts}` — the PK+FK+`piiColumn` table templates; `member-addresses-rls.ts` + `0030_member-addresses.sql` for the RLS+migration shape.
- `apps/mobile/app/(life-events)/` + `components/life-events/{useStepUpGate.ts,...}` — the screen-group + step-up UI precedent to mirror for `(withdrawal)`.
- `apps/api/src/audit/audit-sink.ts:124` — the `member_life_events.*` action-type pattern to extend.

### Previous story intelligence (3.9 — Life Events)

- **Mobile reachability (3.8→3.9 top lesson):** do NOT build an API surface with no mobile path. The step-up flow + the rejoin-block copy MUST both be wired end-to-end in mobile, or the ACs aren't met.
- **Step-up 403 by error CODE, not status** (`auth.step_up_required`), retry the SAME mutation.
- **MMKV is the app's AsyncStorage** ([[project_mmkv_asyncstorage_equivalent]]) — if any withdrawal-form draft persistence is added (likely unnecessary; withdrawal is short + deliberate), use `mmkvStorage`, and DO NOT persist PII (the 3.9 D1 lesson stripped Tier-1 address from the draft store). Prefer NO draft persistence for the reason free-text (Tier-1 PII).
- **ci:local is the merge gate**; integration suites need DATABASE_URL on :5433. Own-committing writers accumulate rows — assert membership, not counts ([[project_live_db_test_gotchas]]).
- **Contract openapi posture:** match nominee/medical/life-events (no `.openapi()`) to keep `v1.yaml` byte-stable unless you deliberately add the path (determinism + pii-scrape gates green).

### Testing standards

- Domain unit tests DB-free where possible (reducer purity + payload-schema rejection); the rest run against `twt-test-pg` Docker on :5433.
- Clock injection: `rejoin_permitted_at = clock() + 12 months` — no raw `Date.now()` (architecture §1.12; 3.8 renewal grace-window precedent). Unit-test the 12-month math with an injected clock.
- API integration under `apps/api/tests/integration/withdrawal/`. Assert: event emitted (right type, `auditShape`-only), audit line (reason_code, no reason_text), step-up enforced + context-isolated, PII never leaks, terminal-state re-withdrawal rejected, rejoin lock fires at signup.

### Project Structure Notes

- New API module: `apps/api/src/modules/withdrawal/` (`index.ts`, `routes.ts`, `handlers.ts`, `withdrawal-crypto.ts`).
- New contracts dir: `packages/contracts/src/withdrawal/`.
- New domain schema: `packages/domain/src/schema/member_withdrawals.ts` + RLS policy + `member/withdrawal.ts` accessor.
- New migration: `0032_member-withdrawals.sql` (latest applied is `0031` — confirm before numbering).
- New mobile group: `apps/mobile/app/(withdrawal)/`.
- Extends (not new): `signup.handlers.ts` + `member-auth.repo.ts` (rejoin lock); `audit-sink.ts`; `context.ts` (field class); `api-client/src/index.ts`; i18n locales.
- No conflicts with the unified structure — follows the per-surface module + per-table schema + Expo-router-group conventions established in Epic 3 (3.9 is the template).

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.10] — the five-stage flow, dignified copy, 12-month rejoin lock, closes at `withdrawn` with history intact (3.12 anonymizes).
- [Source: _bmad-output/planning-artifacts/epics.md#FR-6 (line 40)] — ₹110 forfeited; history retained; 12-month rejoin lock under same identity (Aadhaar + eHRMS).
- [Source: _bmad-output/planning-artifacts/architecture.md#2.12 (line 1735)] — "Aadhaar HMAC hash retained for the 12-month rejoin lock" (the committed-but-un-wired control the seam column anticipates).
- [Source: _bmad-output/planning-artifacts/architecture.md#1.14 (lines 1245,1248)] — `active → withdrawn` on member-initiated withdrawal; `withdrawn → pending-fee` re-signup after lock period (the DEFERRED post-window path).
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Pattern 4: Dignified Validation (line 2334, recovery 2369)] — no dark patterns; dignified explanation surface for blocked/failed states.
- [Source: packages/domain/src/member/events.ts:97-98,170,220-221] — the frozen `withdrawal_completed`/`withdrawal_requested` events + `.strict()` payload schemas (emit; do NOT widen).
- [Source: packages/domain/src/member/state.ts:110-114,151-153] — the reducer's withdrawal transition + documentation matrix (no change needed).
- [Source: apps/api/src/modules/kyc/providers/digilocker/mapper.ts:4-5] — full Aadhaar masked at the boundary (why the Aadhaar-HMAC key can't be built today).
- [Source: apps/api/src/modules/auth/member/signup.handlers.ts:100 + member-auth.repo.ts:35] — the duplicate-signup guard + `resolveMembersByMobile` the rejoin lock extends.
- [Source: apps/api/src/modules/auth/member/member-step-up.gate.ts:21] — `requireMemberStepUp` member step-up gate.
- [Source: _bmad-output/implementation-artifacts/3-9-life-events-panel.md#Dev Notes] — scope-tx ordering, step-up mobile wiring, Tier-1 crypto helper, contract-openapi posture, ci:local gate, MMKV/PII-in-draft lesson.

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (Claude Code, bmad-create-story workflow)

### Debug Log References

- `pnpm --filter @twt/domain exec vitest run tests/member/withdrawal.test.ts` → 10/10 (reducer transition + terminal no-op + marker identity + frozen-payload strictness).
- `DATABASE_URL=…:5433 pnpm --filter @twt/domain exec vitest run tests/integration/member/member-withdrawals.spec.ts` → 6/6.
- `DATABASE_URL=…:5433 pnpm --filter @twt/api exec vitest run tests/integration/withdrawal/withdrawal.spec.ts` → 6/6.
- `DATABASE_URL=…:5433 pnpm --filter @twt/api exec vitest run tests/integration/signup/signup-create.spec.ts` → 11/11 (9 existing + 2 new rejoin-lock).
- `DATABASE_URL=…:5433 pnpm ci:local` → all 16 static jobs green; integration set green on re-run (`@twt/api` 288/288). One transient flake in `@twt/jobs` `member-renewal-lifecycle.test.ts` (remindersDue) on the first concurrent run — passes 2/2 in isolation and on the re-run of the full integration turbo set; the documented shared-DB concurrent-load flake class ([[project_known_livedb_test_failures]]), untouched by this story (no jobs/renewal changes).
- Mobile: `pnpm --filter mobile typecheck` + `pnpm --filter mobile lint` green (build/test are intentional repo no-ops — 3.8/3.9 precedent).

### Completion Notes List

- **First emitter, not an author (frozen-schema discipline).** `state.ts` + `events.ts` were NOT touched — Story 3.1 froze the `withdrawal_completed`/`withdrawal_requested` events, their `.strict()` auditShape-only payloads, and the reducer transition. 3.10 is the first production emitter of `member.withdrawal_completed`. The frozen payload structurally cannot carry the reason (by-design R1) — verified by a unit test that asserts smuggling `reason_code`/`reason_text` into the payload throws.
- **withdrawal_requested marker OMITTED (Task 5 decision).** The flow is a single confirm call (ack + reason + step-up + confirm all resolve to one `POST /api/v1/member/withdrawal`), so the non-transition `withdrawal_requested` marker adds no audit value and is not emitted (spec-legal per Dev Notes §"withdrawal_requested marker"). Only `withdrawal_completed` is emitted.
- **assertWithdrawable is NEW + local (NOT the life-events guard).** It permits ONLY `{active, active-in-grace, lapsed-unpaid}` and rejects everything else — including pre-active states (`pending-kyc/fee/valid`, `lock-in`) where the reducer would silently return identity (a phantom withdrawal) — with `withdrawal.invalid_state`. The life-events `assertMemberExistsAndNotTerminal` (rejects only `{withdrawn, anonymized}` with `life_events.member_terminal`) is deliberately NOT reused. Integration-tested: pre-active member → 409 invalid_state; already-withdrawn → 409 invalid_state.
- **Rejoin-lock key = mobile blind index (v1); Aadhaar-HMAC control UN-ATTESTED / OPEN RISK.** The architecture §2.12 Aadhaar-HMAC rejoin key is un-wireable today (Aadhaar masked to last-4 at the KYC boundary + discarded; eHRMS stored nowhere; manual-KYC members have no Aadhaar). v1 keys the lock on `member_identities.mobile_blind_index` (evadable with a fresh mobile — recorded as open risk, NOT claimed satisfied) and ships a NULLABLE `member_withdrawals.aadhaar_hmac` forward-compat seam (the table grants UPDATE so Story 3.3a can backfill the architecture-committed key WITHOUT a migration). Recorded in deferred-work.md W1. Decision user-confirmed 2026-07-01.
- **Post-12-month rejoin path DEFERRED.** A withdrawn member past their window still receives the unchanged 409 `auth.member_already_exists` (arch §1.14 `withdrawn → pending-fee` reactivation collides with the `member_identities` UNIQUE index — a distinct capability). Explicitly asserted by `signup-create.spec.ts` and recorded in deferred-work.md W2. Not silently pretended to work.
- **Signup rejoin enforcement.** `resolveMembersByMobile` (BYPASSRLS servicePool, pre-scope) was extended to LEFT JOIN `members` (state) + `member_withdrawals` (rejoin_permitted_at, withdrawn_at); `ResolvedMembership` widened. `signup.handlers.ts` branches: withdrawn/anonymized + `now < rejoin_permitted_at` → **403 `auth.rejoin_locked`** carrying `{withdrawn_at, rejoin_permitted_at}` in `error.details` (audited `member_withdrawal.rejoin_blocked`, masked mobile only); otherwise the unchanged 409.
- **PII discipline (R1) — verified.** Reason free-text is Tier-1-encrypted (`withdrawal-crypto.ts`, `encContext` scoped to `pariwarId` + `MEMBER_WITHDRAWAL_FIELD_CLASS`, mirroring address-crypto exactly) into `member_withdrawals.reason_text_ciphertext` (`piiColumn(1, 'member_withdrawal')`). Tests assert the free-text is NEVER in the event payload, the audit context, the confirm response, or at-rest plaintext. `reason_code` (bounded enum) is the only reason field in the audit context.
- **api-client `ApiError` now carries `error.details`.** Extended so the mobile signup rejoin-block screen can render the dignified date copy from `auth.rejoin_locked` details. `withdrawMember` added; `auth.rejoin_locked` is keyed on `error.code` (not bare 403) on the signup path.
- **Mobile.** New `(withdrawal)` group — a single staged screen (ack → optional reason → step-up → final confirm → withdrawn confirmation) so the Tier-1 free-text reason never leaves component state (never a route param, never a draft — the 3.9 PII-in-draft lesson). Step-up reuses `useStepUpGate('withdrawal')`. Signup `auth.rejoin_locked` routes to a dignified date-block screen in the `(auth)` group (no session exists during signup). Understated `WithdrawalEntry` placed at the bottom of the home tab (no profile/settings screen exists yet — deferred-work.md W4). Dignified Pattern-4 copy throughout; ScrollView wraps every stage (3.5 clipping lesson).
- **MMKV note.** No withdrawal-form draft persistence was added (withdrawal is short + deliberate; the reason free-text is Tier-1 PII — the 3.9 D1 lesson). [[project_mmkv_asyncstorage_equivalent]] not needed here.
- **Contracts openapi posture.** No `.openapi()` on the withdrawal contracts (nominee/medical/life-events posture); openapi/v1.yaml byte-stable, determinism + pii-scrape gates green.

### File List

**Domain (`packages/domain`)**
- `src/schema/member_withdrawals.ts` (new)
- `src/policies/member-withdrawals-rls.ts` (new)
- `src/policies/index.ts` (modified — barrel export)
- `src/schema/index.ts` (modified — barrel export)
- `src/member/withdrawal.ts` (new — insert + in-scope read accessors)
- `src/member/index.ts` (modified — barrel export)
- `migrations/0032_member-withdrawals.sql` (new)
- `migrations/meta/_journal.json` (modified — 0032 journal entry)
- `tests/member/withdrawal.test.ts` (new — DB-free reducer unit)
- `tests/integration/member/member-withdrawals.spec.ts` (new — live-DB)

**Contracts (`packages/contracts`)**
- `src/withdrawal/withdrawal.ts` (new)
- `src/withdrawal/index.ts` (new)
- `src/index.ts` (modified — barrel export)

**API (`apps/api`)**
- `src/context.ts` (modified — `MEMBER_WITHDRAWAL_FIELD_CLASS`)
- `src/audit/audit-sink.ts` (modified — `member_withdrawal.completed` / `.rejoin_blocked`)
- `src/modules/withdrawal/withdrawal-crypto.ts` (new)
- `src/modules/withdrawal/handlers.ts` (new)
- `src/modules/withdrawal/routes.ts` (new)
- `src/modules/withdrawal/index.ts` (new)
- `src/server.ts` (modified — register module)
- `src/modules/auth/member/member-auth.repo.ts` (modified — `resolveMembersByMobile` joins + `ResolvedMembership`)
- `src/modules/auth/member/signup.handlers.ts` (modified — rejoin-lock branch)
- `tests/integration/withdrawal/withdrawal.spec.ts` (new — live-DB)
- `tests/integration/signup/signup-create.spec.ts` (modified — 2 rejoin-lock tests)

**api-client (`packages/api-client`)**
- `src/index.ts` (modified — `withdrawMember`, `WITHDRAWAL_BASE`, `ApiError.details`)

**i18n (`packages/i18n`)**
- `locales/en/common.json` (modified — `withdrawal.*`)
- `locales/hi/common.json` (modified — `withdrawal.*`)

**Mobile (`apps/mobile`)**
- `app/(withdrawal)/_layout.tsx` (new)
- `app/(withdrawal)/index.tsx` (new — staged flow)
- `app/(auth)/rejoin-locked.tsx` (new — signup rejoin-block screen)
- `components/withdrawal/format-date.ts` (new)
- `components/withdrawal/WithdrawalEntry.tsx` (new)
- `app/(auth)/otp.tsx` (modified — route to rejoin-locked on `auth.rejoin_locked`)
- `app/_layout.tsx` (modified — register `(withdrawal)` group)
- `app/(tabs)/index.tsx` (modified — mount `WithdrawalEntry`)

**Docs**
- `_bmad-output/implementation-artifacts/deferred-work.md` (modified — W1–W5)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified — status flip)

## Change Log

| Date       | Change                                                                 |
| ---------- | --------------------------------------------------------------------- |
| 2026-07-02 | Implemented Story 3.10 — all 10 tasks complete. NEW `member_withdrawals` Tier-1 table (migration 0032; GRANTs UPDATE for the aadhaar_hmac backfill seam + RTBF) + domain accessor + reducer unit test (state.ts/events.ts UNCHANGED — first emitter). NEW `apps/api/src/modules/withdrawal` (step-up-gated `POST /member/withdrawal`, `assertWithdrawable` guard, clock+12mo, scope-tx persist+project+audit-after-ok; audit-sink `member_withdrawal.completed`/`.rejoin_blocked`). NEW contracts + api-client `withdrawMember` (+`ApiError.details`). Signup rejoin-lock: `resolveMembersByMobile` extended (state/rejoin/withdrawn joins) → signup 403 `auth.rejoin_locked` in-window, unchanged 409 otherwise; post-window rejoin DEFERRED. NEW mobile `(withdrawal)` group (dignified Pattern-4 staged flow) + signup rejoin-block screen + understated home entry. i18n en/hi parity. Tests: domain unit 10/10, domain integration 6/6, api integration 6/6, signup 11/11; ci:local green (one documented jobs concurrent-load flake, innocent). Rejoin-lock keys on mobile blind index (v1); architecture §2.12 Aadhaar-HMAC control recorded UN-ATTESTED/open-risk + post-12mo rejoin path recorded DEFERRED (deferred-work.md W1/W2). Status → review. |
| 2026-07-01 | Created Story 3.10 — context-engineered voluntary withdrawal flow (ack → reason → step-up `'withdrawal'` → confirm → `member.withdrawal_completed` transition to `withdrawn`; NEW `member_withdrawals` Tier-1 table + migration 0032; 12-month rejoin lock keyed on the mobile blind index with a NULLABLE `aadhaar_hmac` forward-compat seam; signup `signupCreate` rejoin-block extension; dignified Pattern-4 UX; `(withdrawal)` mobile group). Design decision (user-confirmed): rejoin lock keys on mobile blind index now + Aadhaar-HMAC seam for a Story 3.3a backfill — the architecture §2.12 Aadhaar-HMAC control is recorded un-attested/open-risk; the post-12-month rejoin path (arch §1.14 `withdrawn → pending-fee`) is recorded DEFERRED. Reducer + withdrawal events unchanged (frozen by Story 3.1; this story is the first emitter). |
