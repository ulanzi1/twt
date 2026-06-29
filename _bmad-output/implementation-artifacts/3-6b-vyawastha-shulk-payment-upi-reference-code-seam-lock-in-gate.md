# Story 3.6b: Signup ₹110 Vyawastha Shulk via UPI Intent + Reference Code Port Seam + 5-Condition Lock-In Entry Gate `[SURFACE]`

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Sushil-class teacher who has created my member account, accepted the T&C, and completed KYC + nominees + medical disclosure (Story 3.6a + 3.3b/3.4/3.5),
I want to pay the mandatory ₹110 Vyawastha Shulk via UPI Intent, optionally paste a 6-digit Reference Code from my field-worker introducer, and — only once every signup prerequisite is recorded — enter the `lock-in` state with the clock running and my lock-in policy snapshotted,
so that signup completes in a single session, my fee receipt is retained indefinitely for future-benefit eligibility (AR-67), and downstream lock-in / contribution / claim eligibility have their required entry conditions met.

### Story context (read this first)

**This story is the SECOND half of the Story 3.6 split.** `/bmad-create-story 3.6` was split with BigDev on 2026-06-27. **Story 3.6a shipped + merged** (PR #50, `done`): member creation from the `signup_continuation` seam, the signup-wizard chrome (`tc → kyc → nominees → medical → [payment]`), and T&C acceptance. **3.6b (this story)** builds the final hand-off: the **₹110 Vyawastha Shulk UPI Intent payment + indefinitely-retained receipt** (AR-67), the **Reference Code port seam** (Epic 13 field-worker registry not built — D2), and the **5-condition lock-in entry gate** — the load-bearing boundary that `member.vyawastha_shulk_paid` (→ `pending-fee → lock-in`) + the `member.lock_in_entered` clock-start marker (with the `lock_in_days_at_join` snapshot) only fire once **all five** signup prerequisites exist.

**Why 3.6b is load-bearing — it closes the signup loop.** Every Epic-3 signup surface so far ends a member at `pending-fee` (after KYC) and stops at 3.6a's `payment.tsx` **placeholder**. The lifecycle does not advance past `pending-fee` until this story. 3.6b is the **FIRST production caller of `member.vyawastha_shulk_paid` and `member.lock_in_entered`** — both event types + the `pending-fee → lock-in` transition were already FROZEN by Story 3.1 (`packages/domain/src/member/events.ts` + `state.ts`); every prior reference was a test seed (`seedWithdrawnMember`). 3.6b EMITS them in production, exactly as 3.6a was first to emit `member.signup_initiated`.

**Resolved scope decisions (BigDev 2026-06-27, from the 3.6-split ledger — folded, not silently assumed):**

- **D2 — Reference Code = port seam.** Epic 13 (field-worker attribution registry) is NOT built. 3.6b **captures + stores** the optional 6-digit code as `attribution_source` with **no validation against a non-existent registry** and **no `attributed_to_fieldworker_id` resolution**; skipping is permitted (the code is not mandatory). Validation, the field-worker allocation registry, and commission flow are deferred to Epic 13 (FR-87 commission is v2). The epics AC's "validated against Epic 13's allocation registry / unknown codes rejected" is **explicitly NOT done in v1** — that line describes the eventual Epic-13-activated behaviour; the v1 port seam captures-and-defers (see R5).
- **D3 — Payment model = separate always-retained receipt + GATED lifecycle transition.** The `vyawastha_shulk_receipts` row is persisted on EVERY successful UTR self-attest (AR-67, indefinite retention) — even if other lifecycle steps are somehow incomplete. The `member.vyawastha_shulk_paid` **lifecycle event** (which the reducer uses to move `pending-fee → lock-in`) + the `member.lock_in_entered` marker are **GATED** on all five conditions and emitted only when the gate passes (see R2 — this is the story's load-bearing AC2).

**What this story does NOT do (scope guards — mirror the 3.3b/3.4/3.5/3.6a boundary discipline):**

- **It does NOT re-author the `member.*` event vocabulary or the reducer** (Story 3.1 froze them). `member.vyawastha_shulk_paid` (`{...auditShape, utr, amount_inr}`) and `member.lock_in_entered` (`{...auditShape}`) already exist; the reducer already transitions `pending-fee → lock-in` on the former. 3.6b **emits** them and **widens ONLY `LockInEnteredPayloadSchema`** to carry the `lock_in_days_at_join` snapshot + the resolved policy version (mirroring how 3.4/3.5 widened their marker payloads — a non-transition-affecting widen; R3). It does NOT touch `member/state.ts`.
- **It does NOT build the Epic-13 field-worker registry, code validation, attribution chain, or commission flow** (D2 — port seam only).
- **It does NOT build the contribution/support-flow payment** (member → nominee monthly UPI, Epic 8) — only the member → trust signup fee. It does NOT build the bank-statement reconciliation/matcher (Epic 8): the signup Shulk UTR is **self-attested**, not matcher-verified (no reconciliation gate on lock-in entry).
- **It does NOT build the lock-in clock widget** (Story 3.7 — it consumes `member.lock_in_entered.occurred_at` + the snapshot) or annual renewal (Story 3.8).
- **It does NOT advance the lifecycle past `lock-in`.** `member.lock_in_expired` (the SIE-fired `lock-in → active | pending-valid` transition) is Story 3.7.

## Acceptance Criteria

**AC1 — UPI Intent dispatch + indefinitely-retained Vyawastha Shulk receipt (FR-1 + AR-67)**
**Given** a member in `pending-fee` (KYC done, fee unpaid) holding a full member session, and the v1 ₹110 mandatory Vyawastha Shulk
**When** the member requests payment and self-attests the UTR after returning from their UPI app
**Then** `POST /api/v1/member/vyawastha-shulk/intent` returns a **server-constructed** UPI Intent URL — `upi://pay?pa={trust VPA}&am={110}&cu=INR&tn=signup-shulk-{memberId}&tr=signup-{memberId}-{nonce}` — with the VPA + amount resolved **server-side** from config (never client-supplied; the client never names the amount or payee), plus the `tr` idempotency nonce echoed back for the confirm step.
**And** `POST /api/v1/member/vyawastha-shulk/confirm` (body `{ tr, utr, referenceCode? }`) persists a `vyawastha_shulk_receipts` row with `paid_at`, `valid_through` (= `paid_at + 1 year`), `amount_inr` (110), `utr`, `payment_method` (`upi_intent`), `member_id`, `pariwar_id` — **indefinitely retained per AR-67** (forward-compat for FR-100 future-benefit eligibility reconstruction). The UTR is validated **permissively** (12-digit numeric OR 22-char alphanumeric NEFT/RTGS, per UX §"UTR self-attest") — not matcher-verified (Epic 8 reconciliation is out of scope; signup Shulk is self-attested).
**And** confirm is **idempotent on `tr`** (a re-confirm with the same `tr` returns the existing receipt + lock-in status, does NOT insert a second receipt, and does NOT re-emit lifecycle events) — `tr` carries a UNIQUE constraint; the architecture §"Idempotency" `tr=` keyed-store requirement is satisfied by the unique receipt row.
**And** the receipt is persisted **even if** the lock-in gate (AC2) is not satisfied — the receipt is a stand-alone durable fact (D3); lock-in entry is a separate gated step.

**AC2 — The 5-condition lock-in entry gate (this story's load-bearing AC; the boundary that payment alone does NOT activate membership)**
**Given** the explicit boundary (epics L1732) that a successful Vyawastha Shulk payment **alone** does NOT enter `lock-in`
**When** confirm has persisted the receipt and evaluates whether to enter lock-in
**Then** ALL FIVE of the following must hold for `member.vyawastha_shulk_paid` + `member.lock_in_entered` to be emitted: **(a)** the member is in `pending-fee` — i.e. KYC completed or manual-fallback recorded (Story 3.3b: `member.kyc_completed` / `member.kyc_manual_fallback`); **(b)** nominee declaration recorded (Story 3.4: ≥1 row in `member_nominees`); **(c)** medical disclosure + concealment ack recorded (Story 3.5: ≥1 row in `member_medical_disclosures`); **(d)** T&C acceptance recorded (Story 2.7 consent registry: a valid `tc_acceptance` `consent_records` row — `consentExists(...)`); **(e)** Vyawastha Shulk payment recorded (the receipt just persisted, AC1).
**And** if any of (a)–(d) is missing, the receipt persists but **no** lifecycle event is emitted; the response carries a clear, machine-readable list of the **outstanding** step(s) so the UI can signal which is incomplete; `member.lock_in_entered` is **NOT** emitted prematurely; the member remains in `pending-fee`.
**And** the gate evaluation + the two emitted events run inside **ONE** member scope-tx (after the receipt is durably persisted), so a member can never be `lock-in` without all five facts, and a partial failure rolls the transition back without losing the receipt.

**AC3 — `lock-in` entry with `lock_in_days_at_join` snapshot resolved from the Niyamavali policy (FR-8)**
**Given** the gate (AC2) is satisfied and the lock-in policy lives in the Niyamavali registry as clause `niy.lock-in.policy` (Epic 2 registry; v1 = 30-day lock-in, trustee-adjustable via the Story 2.4 amend workflow)
**When** the lock-in transition fires
**Then** `member.vyawastha_shulk_paid` (`{...auditShape (from `pending-fee` → `lock-in`), utr, amount_inr}`) is emitted via `projectMemberState` — the reducer transitions `pending-fee → lock-in` — immediately followed in the same scope-tx by `member.lock_in_entered` (the clock-start MARKER; `from_state === to_state === 'lock-in'`) carrying the **widened** payload `{...auditShape, lock_in_days_at_join, lock_in_policy_version}`, where `lock_in_days_at_join` is snapshotted from `resolveByClauseId('niy.lock-in.policy')`'s payload at the moment of transition and `lock_in_policy_version` is that clause's `clause_version_id` (audit-reproducibility — mirrors 3.5's `ima_list_version`).
**And** the **authoritative historical record of the snapshot is the `member.lock_in_entered` event payload** (`lock_in_days_at_join` + `lock_in_policy_version`) — replay-derivable, immutable, audit-reproducible. The new `members.lock_in_days_at_join` column is a **derived query optimization ONLY** (a projection of that event, the same relationship `members.state` has to the event stream — "persisted state is optimization only", architecture §1.14): it is written from the **same resolved value** inside the **same scope-tx** that emits the event (so the two can never diverge at write time), and any consumer needing the authoritative value (audit, dispute, RTBF reconstruction) replays the event rather than trusting the column. The column exists solely so Story 4.1's snapshot-resolution engine (epics L1899: "the engine resolves the lock-in policy from the member's snapshot, NOT the current clause") can read it without a stream replay. It is written by a plain in-scope-tx `UPDATE` (the `members.state` write-rejection trigger fires only on `state` changes, so a non-`state` column update needs no projector guard; see R3). New graduations of the lock-in policy do NOT retroactively re-lock existing members (FR-8) — the snapshotted event payload is the member's permanent join-time value; the column merely mirrors it.
**And** if `niy.lock-in.policy` is unprovisioned for the member's Pariwar at confirm time, the receipt is still persisted but the lock-in transition returns **503** `lock_in.policy_unavailable` (no event emitted; idempotent re-confirm completes lock-in once the clause is provisioned) — the same cross-cutting "every production Pariwar must carry its registry before a member finishes signup" precondition 3.5 R6 / 3.6a R3 raised (see R6).

**AC4 — Reference Code port seam (D2 — capture + store, defer validation to Epic 13)**
**Given** FR-82 (optional 6-digit Reference Code at signup, member side) and that Epic 13's field-worker allocation registry is **not built**
**When** the member optionally pastes a 6-digit Reference Code on the payment screen (or skips it)
**Then** a supplied code is **format-validated** (6 numeric digits) and stored as `attribution_source` (a new minimal `member_attribution` row: `member_id`, `pariwar_id`, `attribution_source`, `captured_at`) — **no** validation against an allocation registry (none exists), **no** `attributed_to_fieldworker_id` resolution, **no** rejection of "unknown" codes; an omitted/blank code is permitted and stores nothing.
**And** NO `member.reference_code.captured` lifecycle event is minted (the 14-event member vocabulary is frozen — R5); the capture is recorded via a Story 1.10 audit line only. The eventual Epic-13 validation + chain attribution + commission flow (FR-87, v2) backfill/consume `attribution_source` when that epic activates.
**And** the share-sheet auto-population path (UX §7 invite flow — inviter member-id baked into the deep link → signup auto-fills the field) is compatible with this seam (it lands a value in the same field) but the deep-link plumbing itself is NOT in 3.6b scope.

**AC5 — Mobile payment screen replaces the 3.6a placeholder + accessibility (AC4-equivalent P0-2c gate)**
**Given** 3.6a shipped `(signup)/payment.tsx` as a deliberate PLACEHOLDER (it `router.replace('/(tabs)')`s with no payment)
**When** the real payment step is built
**Then** `(signup)/payment.tsx` is REPLACED with the real flow: a **Pay via UPI** CTA → call the intent endpoint → `Linking.openURL(upiUrl)` to hand off to the OS UPI app → on return, a **UTR self-attest** field (long-press paste, permissive validation) + an **optional Reference Code** field → confirm → on `lockInEntered: true` navigate to the home/`(tabs)` (Story 3.7's lock-in widget will render there); on outstanding steps, surface which step is incomplete; on `503 lock_in.policy_unavailable`, a graceful retry affordance (mirror 3.5/3.6a's `loadFailed` + retry pattern).
**And** the screen is screen-reader-accessible per the inherited Story 0.10 P0-2c gate — every control carries `accessibilityLabel` + `accessibilityHint`; payment state + outstanding-step messages announced (polite live region); bilingual via `@twt/i18n` (do NOT put the trust VPA, amount, or legal copy in i18n where server-authoritative — amount/VPA come from the server; only the UI chrome is i18n). The wizard chrome's progress indicator (3.6a's `lib/wizard-steps.ts`) already includes `payment` as the final step — no chrome change needed beyond the screen body.

## Tasks / Subtasks

- [x] **Task 1 — Migration 0027 (hand-authored): `vyawastha_shulk_receipts` + `member_attribution` + `members.lock_in_days_at_join`** (AC1, AC3, AC4)
  - [x] Hand-author `packages/domain/migrations/0027_vyawastha-shulk-receipts.sql` — **DO NOT `db:generate`** (drizzle snapshots stop at 0020; regen would diff against `0020_snapshot.json` and re-emit applied 0021-0026 → `42P07`; 0021-0026 are all hand-authored, snapshot-absent — known non-gate-blocking drift). **Mirror `0026_member-medical-disclosures.sql`** (the tenant-isolated table + GRANT + FORCE RLS + tenant-isolation policies pattern). Add the journal entry: `packages/domain/migrations/meta/_journal.json` → `{ "idx": 27, "version": "7", "when": 1783050000000, "tag": "0027_vyawastha-shulk-receipts", "breakpoints": true }` (idx-26 `when` 1782963600000 + 86400000). No snapshot file (matching 0021-0026; `drizzle-kit check` tolerates it). Roles (`twt_app`) exist from 0002. ([[project_live_db_test_gotchas]])
  - [x] `vyawastha_shulk_receipts` — TENANT-ISOLATED: `receipt_id` uuid PK (`gen_random_uuid()`), `member_id` uuid NOT NULL (FK → `members.member_id` ON DELETE CASCADE — RTBF 3.12; mirror 0026), `pariwar_id` uuid NOT NULL, `tr` text NOT NULL **UNIQUE** (the idempotency key, AC1), `utr` text NOT NULL, `amount_inr` integer NOT NULL, `payment_method` text NOT NULL, `paid_at` timestamptz NOT NULL DEFAULT now(), `valid_through` timestamptz NOT NULL, `created_at` timestamptz NOT NULL DEFAULT now(). **GRANT SELECT, INSERT** only (receipts are immutable durable facts — no UPDATE/DELETE beyond the FK cascade; mirror 0026's append-only rationale + AR-67 indefinite retention). RLS + FORCE + tenant-isolation select/write policies (copy 0026 verbatim, rename). Index on `(pariwar_id, member_id)`.
  - [x] `member_attribution` — TENANT-ISOLATED, minimal port seam: `attribution_id` uuid PK, `member_id` uuid NOT NULL (FK → `members.member_id` ON DELETE CASCADE), `pariwar_id` uuid NOT NULL, `attribution_source` text NOT NULL, `captured_at` timestamptz NOT NULL DEFAULT now(). **NO FK to any field-worker/Epic-13 table** (none exists — D2). GRANT SELECT, INSERT. RLS + policies. (Latest-wins is not needed; one row per capture is fine — a member captures once at signup.)
  - [x] `members.lock_in_days_at_join` — `ALTER TABLE "members" ADD COLUMN "lock_in_days_at_join" smallint;` (**nullable** — only populated at lock-in entry; pre-lock-in members carry NULL). No trigger change needed (the 0018 trigger RAISEs only when `NEW.state IS DISTINCT FROM OLD.state` and the writer guard is off; a non-`state` column update is unaffected — verified in 0018). Add the Drizzle column to `packages/domain/src/schema/members.ts` (`smallint('lock_in_days_at_join')`, no `.notNull()`).

- [x] **Task 2 — Domain schema modules + accessors (receipt + attribution write/read)** (AC1, AC4)
  - [x] `packages/domain/src/schema/vyawastha_shulk_receipts.ts` + `member_attribution.ts` — Drizzle table defs (snake_case columns, camelCase fields; header style mirrors `member_medical_disclosures.ts`). Export inferred row types. Register in the schema barrel.
  - [x] `packages/domain/src/payment/receipt-write.ts` — `insertVyawasthaShulkReceipt(tx, input)`: insert the row; on the `tr` UNIQUE violation (`23505` narrowed to the `vyawastha_shulk_receipts_tr_*` constraint name — mirror 3.6a's `isMemberIdentityDuplicate` P9 narrowing), the caller treats it as the idempotent re-confirm path (return the existing row). `receipt-read.ts` — `getReceiptByTr(tx, pariwarId, tr)` + `getLatestReceipt(tx, pariwarId, memberId)` for status/idempotency. Module split + barrel mirror `nominee/` (`declaration-write`/`declaration-read`/`index`).
  - [x] `packages/domain/src/payment/attribution-write.ts` — `insertMemberAttribution(tx, { memberId, pariwarId, attributionSource })`. New `packages/domain/src/payment/index.ts` barrel; export from `packages/domain/src/index.ts`.

- [x] **Task 3 — Lock-in policy resolution + the 5-condition gate (domain)** (AC2, AC3)
  - [x] `packages/domain/src/member/lock-in.ts` — `resolveLockInPolicy(db, pariwarId): Promise<{ lockInDays: number; lockInPolicyVersion: ClauseVersionId } | null>` wrapping `niyamavali.resolveByClauseId(db, pariwarId, clauseId('niy.lock-in.policy'))` (mirror `medical/ima-list.ts` `resolveImaList`'s registry-backed pattern); parse the clause payload with a `.passthrough()` Zod schema reading `{ lock_in_days: number }`; `lockInPolicyVersion = row.clauseVersionId`. Return null when the clause is unprovisioned (→ AC3's 503). Also `setLockInDaysAtJoin(tx, memberId, days)` — a plain `UPDATE members SET lock_in_days_at_join = $days WHERE member_id = $1` (in-scope-tx; state unchanged → trigger-safe).
  - [x] `packages/domain/src/member/lock-in-gate.ts` — `evaluateLockInGate(tx, pariwarId, memberId, now): Promise<{ satisfied: boolean; outstanding: LockInGateStep[] }>` reading the four pre-payment facts: (a) `getMemberStateAt(tx, memberId, now) === 'pending-fee'` (KYC done; a `pending-kyc` member has KYC outstanding; anything past `pending-fee` means already locked-in/active → not a fresh signup); (b) `getMemberNominees(tx, pariwarId, memberId).length > 0`; (c) `getLatestMedicalDisclosure(tx, pariwarId, memberId) !== null`; (d) `consentExists(tx, pariwarId, memberIdStr, 'tc_acceptance', now)`. `LockInGateStep` is a typed enum (`'kyc' | 'nominees' | 'medical' | 'tc'`) the contract echoes for the UI. (Payment (e) is the receipt the handler just wrote — the gate does NOT re-read it.)
  - [x] Unit tests (DB-free where possible; integration for the read accessors) for `evaluateLockInGate` per-condition-missing matrices + `resolveLockInPolicy` payload parse.

- [x] **Task 4 — Widen `LockInEnteredPayloadSchema`** (AC3)
  - [x] In `packages/domain/src/member/events.ts`, widen `LockInEnteredPayloadSchema` from `z.object({ ...auditShape }).strict()` to `z.object({ ...auditShape, lock_in_days_at_join: z.number().int().positive(), lock_in_policy_version: z.string().min(1) }).strict()`. Update the JSDoc (it's a marker — `from_state === to_state === 'lock-in'`; the widen carries the snapshot for audit-reproducibility, exactly as 3.4/3.5 widened their markers; reducer behaviour UNCHANGED — `member.lock_in_entered` is already `default → identity` in `state.ts`; R3/R5). **Do NOT touch `state.ts`, `VyawasthaShulkPaidPayloadSchema`, or the `MEMBER_EVENT_TYPES` tuple.** Verify the `EVENT_TYPE_REGISTRY` (`packages/events`) still type-checks (it consumes `MEMBER_EVENT_PAYLOAD_SCHEMAS`).

- [x] **Task 5 — Contracts: vyawastha-shulk DTOs + OpenAPI** (AC1, AC2, AC4)
  - [x] `packages/contracts/src/payments/vyawastha-shulk.ts` (new `payments/` group + `index.ts` barrel) — `.strict()`, **no `@twt/domain` import** (browser-bundle rule): `VyawasthaShulkIntentResponse = { upiUrl, tr, amountInr, vpa }`; `VyawasthaShulkConfirmRequest = { tr, utr, referenceCode? }` (UTR `.regex` permissive: `^\d{12}$|^[A-Za-z0-9]{22}$`; referenceCode `.regex(^\d{6}$).optional()`); `VyawasthaShulkConfirmResponse = { receipt: { paidAt, validThrough, amountInr, utr, paymentMethod }, lockInEntered: boolean, lockInDaysAtJoin?: number, outstanding: LockInGateStep[] }`; `VyawasthaShulkStatusResponse = { paid, validThrough?, lockInEntered, outstanding }`; `LockInGateStep = z.enum(['kyc','nominees','medical','tc'])`.
  - [x] Export from `packages/contracts/src/index.ts`; add components + path registration in `packages/contracts/scripts/emit-openapi.ts`; regenerate `packages/contracts/openapi/v1.yaml` (the **contracts-determinism gate** must stay green — run the emit script, commit the regenerated yaml).

- [x] **Task 6 — apps/api `vyawastha-shulk` module (intent + confirm + status)** (AC1, AC2, AC3, AC4)
  - [x] New `apps/api/src/modules/vyawastha-shulk/{handlers.ts, routes.ts, index.ts}` (feature-module shape mirroring `terms`/`medical`/`nominee`/`kyc`). **NOTE the naming choice (flag in Completion Notes):** the architecture names a generic `apps/api/src/modules/payment/` for UPI Intent dispatch (L4286/L4599), but that is Epic 8's contribution (member→nominee) surface; 3.6b keeps the signup-fee path in its own `vyawastha-shulk/` module to avoid prematurely coupling with the Epic-8 payment module shape. All routes behind `requireMemberSession(deps)`.
  - [x] `POST /api/v1/member/vyawastha-shulk/intent` — resolve `vpa` + `amountInr` from new config (`vyawasthaShulkVpa`, `vyawasthaShulkAmountInr` default 110 — env-driven, mirror `defaultSignupPariwarId` in `config.ts`); 503 `vyawastha_shulk.unconfigured` if VPA unset (server gap, like 3.6a's pariwar-unconfigured 503). Build `tr = \`signup-${memberId}-${randomUUID()}\`` and the `upi://pay?...` URL **server-side**; return `{ upiUrl, tr, amountInr, vpa }`. Audit `member_vyawastha_shulk.intent`.
  - [x] `POST /api/v1/member/vyawastha-shulk/confirm` — the load-bearing path:
    1. `openScopeTx(deps, pariwarIdStr)`; member-existence + terminal-state guard (`memberExists` + `getMemberStateAt`; `TERMINAL_STATES = {'withdrawn','anonymized'}` — keep the local set, note W-drift).
    2. Persist the receipt via `insertVyawasthaShulkReceipt` (`valid_through = paidAt + 1yr`, `payment_method = 'upi_intent'`, `amount_inr` server-authoritative). On the `tr` UNIQUE violation → idempotent re-confirm: load the existing receipt + re-evaluate lock-in status, return WITHOUT a second insert or re-emit.
    3. Capture optional Reference Code: if `referenceCode` present, `insertMemberAttribution` + an audit line (`member_attribution.captured`) — **no registry validation** (D2).
    4. `evaluateLockInGate(scopeTx.tx, pariwarId, memberId, now)`. If NOT satisfied → set `ok = true`, return `{ receipt, lockInEntered: false, outstanding }` (receipt persisted, no lifecycle event).
    5. If satisfied → `resolveLockInPolicy(scopeTx.tx, pariwarId)`; if null → throw 503 `lock_in.policy_unavailable` (rolls back the gate/transition but the receipt step is a SEPARATE prior commit — see ordering note below). If resolved → `projectMemberState(scopeTx.client, { eventType: 'member.vyawastha_shulk_paid', payload: { from_state: 'pending-fee', to_state: 'lock-in', trigger: 'vyawastha_shulk_paid', actor: 'member', utr, amount_inr }, actorId: memberIdStr })` THEN `projectMemberState(..., { eventType: 'member.lock_in_entered', payload: { from_state: 'lock-in', to_state: 'lock-in', trigger: 'lock_in_entered', actor: 'member', lock_in_days_at_join: lockInDays, lock_in_policy_version: lockInPolicyVersion } })` THEN `setLockInDaysAtJoin(scopeTx.tx, memberId, lockInDays)`. `ok = true`; `closeScopeTx` in `finally`. Audit `member_vyawastha_shulk.paid` (UTR-masked / amount only — no PII) + `member.lock_in_entered` audit LAST after `ok`.
    - **Ordering decision (flag in Completion Notes, R2):** the receipt must survive a lock-in-policy 503 (D3 — receipt always retained). Persist the receipt + capture attribution in a **first** scope-tx that COMMITS, then run the gate + transition in a **second** scope-tx. A 503/gate-fail in the second tx leaves the receipt durably committed; the idempotent `tr` re-confirm completes lock-in later. (Alternative single-tx: persist receipt, and on policy-503 still COMMIT the receipt but skip events — but two scope-txs is the cleaner faithful model of "receipt always, transition gated".)
  - [x] `GET /api/v1/member/vyawastha-shulk/status` — `{ paid: getLatestReceipt !== null, validThrough?, lockInEntered: state === 'lock-in' (or past), outstanding: evaluateLockInGate.outstanding }` for the UI.
  - [x] Register `registerVyawasthaShulkModule` in `apps/api/src/server.ts`. Register audit types `member_vyawastha_shulk.intent` / `.paid` / `.failure` + `member_attribution.captured` + `member.lock_in_entered` in `apps/api/src/audit/audit-sink.ts` (mirror `member_kyc.*`). Add `vyawasthaShulkVpa` + `vyawasthaShulkAmountInr` to `config.ts`.
  - [x] **`login-wall.spec.ts`:** these are session-guarded (not public) — confirm they require a member session (NOT added to the public allowlist, unlike 3.6a's `/signup/create`).

- [x] **Task 7 — Seed `niy.lock-in.policy` clause + provisioning precondition** (AC3)
  - [x] Add a seed for the `niy.lock-in.policy` Niyamavali clause (mirror how Story 3.5 seeded `niy.medical.ima-list` / `niy.concealment.r14` via `niyamavali.createClause`): payload `{ lock_in_days: 30 }` (v1 = 30-day per FR-8), `benefit_mechanism: 'pool'` (match 3.5 seeds). Tests seed it per-Pariwar; production provisioning of the launch Pariwar's clause is the same cross-cutting registry-bootstrap obligation as the T&C row (3.6a R3 / 3.5 R6). **Flag in Completion Notes (R6):** `DEFAULT_SIGNUP_PARIWAR_ID` must carry an effective `niy.lock-in.policy` clause or every paid member 503s at the lock-in step (receipt retained; re-confirm completes once provisioned).

- [x] **Task 8 — Mobile: replace `payment.tsx` placeholder with the real UPI + UTR + reference-code flow** (AC5)
  - [x] REPLACE `apps/mobile/app/(signup)/payment.tsx` (3.6a placeholder) with the real screen: **Pay via UPI** CTA → `vyawasthaShulkIntent()` → `Linking.openURL(upiUrl)`; on return, a **UTR self-attest** `Input` (long-press paste; permissive client-side hint, server validates) + an **optional Reference Code** `Input` (6-digit) → `vyawasthaShulkConfirm({ tr, utr, referenceCode })`. On `lockInEntered: true` → `router.replace('/(tabs)')` (Story 3.7 renders the lock-in clock there). On `outstanding.length > 0` → show which step(s) are incomplete (map the `LockInGateStep` enum to bilingual labels). On `503 lock_in.policy_unavailable` → graceful retry (mirror 3.6a `tc.tsx` `loadFailed` + retry). **`ScrollView` wrapping mandatory** (3.5/3.6a patch — bare `YStack flex={1}` clips the CTA on small devices).
  - [x] Accessibility (AC5 / P0-2c): EVERY control `accessibilityLabel` + `accessibilityHint` (the 3.6a review's P4-P7 patches show the cost of missing hints — pre-empt them; the action label must name the ACTION, not a heading — WCAG 2.5.3 Label-in-Name, 3.6a P7). Payment status + outstanding messages announced (polite live region). Bilingual via `@twt/i18n`. Mobile `build`/`test` are repo no-ops → verify via `typecheck` + `lint` (3.2/3.3b/3.5/3.6a precedent); record the a11y discipline in Completion Notes.
  - [x] Add SDK methods to `packages/api-client/src/index.ts`: `vyawasthaShulkIntent()`, `vyawasthaShulkConfirm(input)`, `vyawasthaShulkStatus()` (mirror the existing `memberTerms`/`medicalDisclose` session-authenticated client methods at L228-239).

- [x] **Task 9 — i18n copy** (AC4, AC5)
  - [x] Add the payment-step strings (Pay-via-UPI CTA, UTR field label + paste hint, optional Reference Code field + skip affordance, outstanding-step labels for `kyc`/`nominees`/`medical`/`tc`, policy-unavailable retry, success) to `packages/i18n/locales/{en,hi}/common.json` under a `payment.*` namespace. Follow the Story 2.2 calm-precise member register (UX-DR55 dignified-validation; "Agency without anxiety — no urgency theater", UX §). **Do NOT** put the VPA, amount, or `tr` in i18n — those are server-authoritative. **i18n-parity gate** must stay green (every EN key has an HI key).

- [x] **Task 10 — Tests** (all ACs)
  - [x] Domain integration (`packages/domain/tests/integration/`, :5433): `vyawastha_shulk_receipts` RLS cross-Pariwar denial + FK cascade RTBF + `tr` UNIQUE idempotency round-trip; `member_attribution` RLS + cascade; `lock_in_days_at_join` column write trigger-safe (state unchanged → no RAISE). Domain unit: `evaluateLockInGate` per-missing-condition matrix; `resolveLockInPolicy` payload parse + null-when-unprovisioned; widened `LockInEnteredPayloadSchema` `.strict()` rejects unknown keys + requires the two new fields.
  - [x] API integration (`apps/api/tests/integration/vyawastha-shulk/*.spec.ts`, :5433) — **assert membership not counts** ([[project_live_db_test_gotchas]]; own-committing writers accumulate rows):
    - **Headline (the full signup loop):** seed/drive a member through `/signup/create` → `/kyc` (manual fallback → `pending-fee`) → seed nominees + medical + `tc_acceptance` + the `niy.lock-in.policy` clause → `/vyawastha-shulk/intent` → `/confirm` → assert ONE `member.vyawastha_shulk_paid` (`pending-fee → lock-in`) + ONE `member.lock_in_entered` (with `lock_in_days_at_join: 30` + a real `lock_in_policy_version`), `members.state = 'lock-in'`, `members.lock_in_days_at_join = 30`, a `vyawastha_shulk_receipts` row (`valid_through ≈ +1yr`, `utr` round-trips).
    - **Gate (AC2) — the highest-value tests:** confirm with EACH of (a) KYC missing [member in `pending-kyc`], (b) nominees missing, (c) medical missing, (d) `tc_acceptance` missing → receipt persisted, NO lifecycle event, `lockInEntered: false`, `outstanding` names the right step; member stays `pending-fee`/`pending-kyc`.
    - **Idempotency (AC1):** re-confirm with the same `tr` → same receipt (no 2nd row), no 2nd `vyawastha_shulk_paid` event.
    - **Policy-unavailable (AC3):** gate satisfied but `niy.lock-in.policy` unprovisioned → 503 `lock_in.policy_unavailable`, receipt persisted, no event; then provision the clause + re-confirm (same `tr`) → lock-in completes.
    - **Reference Code (AC4):** confirm with a 6-digit code → `member_attribution` row + audit line, no registry validation; omitted code → no row; malformed code → 400 (contract regex).
    - **Auth:** no-session → 401; terminal-state member → 409.
  - [x] Run `pnpm ci:local` ([[project_ci_actions_suspension_local_mirror]]) as the merge gate (CI Actions suspended); integration needs `DATABASE_URL` on `:5433`. The canonical `integration-tests` job is the signal; the parallel-`:5433` `test (unit)` flake is documented (confirm via isolated `pnpm turbo run test` without `DATABASE_URL` = green). contracts-determinism / pii-scrape / friction-budget / i18n-parity must be green.

- [x] **Task 11 — Friction-budget disposition + sprint ledger** (housekeeping)
  - [x] The friction-budget CI gate fires on the new `payment.tsx` surface. Add a **Story 3.6b disposition note** to `friction-budget.md` (mirror 3.5/3.6a): the UPI pay + UTR self-attest + optional reference code are **necessary v1 signup-completion steps** (the mandatory ₹110 is FR-1; UTR self-attest is the minimum payment-confirmation surface; the reference code is optional/skippable) — **zero gratuitous friction**, no new ledger row. Verify the new screen stays **under** the `friction-budget.yaml` page-weight ceiling; **do not touch the best-ever baseline** unless the measurement DECREASES it ([[project_friction_budget_baseline_ratchet]]).
  - [x] On completion, flip `development_status[3-6b-vyawastha-shulk-payment-upi-reference-code-seam-lock-in-gate]` and append the combined `ready-for-dev → in-progress → review` ledger COMMENT entry per [[project_sprint_status_ledger]].

### Review Findings

- [x] [Review][Patch] **[HIGH] Attribution failure rolls back receipt (AR-67 violated)** — `insertMemberAttribution` sits inside the same tx-1 scope-tx as `insertVyawasthaShulkReceipt`. Any non-UNIQUE attribution error (transient DB, RLS `WITH CHECK` failure) causes tx-1 to rollback and the receipt is lost, violating AR-67 + D3. Fix: move attribution into a separate `try/catch` inside tx-1 that catches all errors independently (or move attribution to tx-2), so the receipt always commits. [`apps/api/src/modules/vyawastha-shulk/handlers.ts`]
- [x] [Review][Patch] **[MED] `member.lock_in_entered` audit guard uses wrong axis — two bugs** — The `!idempotent` flag guards the audit emit, but it conflates "same `tr`" with "did we emit the event." Two cases break: (1) policy-503 → re-confirm: `idempotent=true`, events ARE emitted in tx-2, audit suppressed — event log has the entry, audit trail doesn't; (2) already-locked-in fresh `tr`: `idempotent=false`, `LOCK_IN_OR_PAST` early-returns without emitting events, audit fires spuriously with no corresponding event. Fix: replace `!idempotent` with a dedicated `lockInEnteredEventEmitted` boolean set only when `projectMemberState` is actually called for `lock_in_entered`. [`apps/api/src/modules/vyawastha-shulk/handlers.ts`]
- [x] [Review][Patch] **[MED] `getReceiptByTr` not scoped to `memberId` — cross-member receipt exposure** — The query filters by `(pariwarId, tr)` but not `memberId`. Member B (same pariwar) submitting member A's `tr` triggers the UNIQUE violation → `idempotent=true` → `getReceiptByTr` returns A's row → B's response includes A's `utr`/`paidAt`; if the gate passes, lock-in events fire for B against A's receipt. Fix: add `memberId` filter to `getReceiptByTr` and treat a mismatch as not-found (not idempotent). [`packages/domain/src/payment/receipt-read.ts`, `apps/api/src/modules/vyawastha-shulk/handlers.ts`]
- [x] [Review][Patch] **[LOW] `member.lock_in_entered` audit context missing `lock_in_policy_version`** — Audit-sink comment says "context carries lock_in_days_at_join + lock_in_policy_version" but the actual emit is `context: { lock_in_days_at_join }` only. [`apps/api/src/modules/vyawastha-shulk/handlers.ts`]
- [x] [Review][Patch] **[LOW] `member_vyawastha_shulk.failure` audit not emitted for `lock_in.policy_unavailable` 503** — The catch guard `if (!(err instanceof ServiceUnavailableError))` suppresses the failure audit for ALL `ServiceUnavailableError`s including policy-503. An operationally significant failure leaves no `failure` audit trace. Fix: only suppress `failure` for the `vyawastha_shulk.unconfigured` 503; let `lock_in.policy_unavailable` emit `failure`. [`apps/api/src/modules/vyawastha-shulk/handlers.ts`]
- [x] [Review][Patch] **[LOW] `member_vyawastha_shulk.paid` audit fires on already-locked-in re-confirm where no new receipt was persisted** — Condition `!idempotent || lockInEntered` fires `paid` audit when `idempotent=true && lockInEntered=true` (already-locked-in member, `LOCK_IN_OR_PAST` early return). No new receipt was written; audit semantics say "receipt was persisted." Fix: gate the `paid` audit on `!idempotent` only, regardless of `lockInEntered`. [`apps/api/src/modules/vyawastha-shulk/handlers.ts`]
- [x] [Review][Patch] **[LOW] Terminal state not re-checked in tx-2 — misleading outstanding response** — `TERMINAL_STATES` guard is in tx-1 only. If a member transitions to `withdrawn` between tx-1 commit and tx-2, `getMemberStateAt` returns `withdrawn`, `LOCK_IN_OR_PAST` miss, gate fires with `outstanding: ['kyc']` instead of a 409. No incorrect state transition occurs. Fix: add a terminal-state check at the top of tx-2. [`apps/api/src/modules/vyawastha-shulk/handlers.ts`]
- [x] [Review][Patch] **[LOW] `member_attribution` no UNIQUE constraint on `member_id` — multiple rows accumulate** — A locked-in member (not blocked by `TERMINAL_STATES` in tx-1) submitting a fresh `tr` + `referenceCode` writes a second attribution row. Epic 13 attribution chain would need to handle multi-row members. Fix: add `UNIQUE (member_id)` to `member_attribution`, or block confirms from members in lock-in/past state in tx-1. [`packages/domain/migrations/0027_vyawastha-shulk-receipts.sql`]
- [x] [Review][Patch] **[LOW] `valid_through` 365-day arithmetic is 1 day short in leap years** — `now.getTime() + 365 * 24 * 60 * 60 * 1000` misses leap-year days. Low impact in v1 (no business logic gates on the column), but latent billing risk for FR-100 benefit eligibility. Fix: use a SQL interval: `paid_at + interval '1 year'`. [`apps/api/src/modules/vyawastha-shulk/handlers.ts`]
- [x] [Review][Patch] **[LOW] Mobile outstanding steps rendered as text with no navigation CTA** — When `lockInEntered: false` + `outstanding` non-empty, the screen lists missing steps as plain text but provides no button or `router.push()` to navigate back and fix the step. Fix: add a "Go back" or per-step navigation affordance so users aren't stranded. [`apps/mobile/app/(signup)/payment.tsx`]
- [x] [Review][Defer] **[LOW] `pgViolation` `.cause` fallback fragility** [`packages/domain/src/payment/receipt-write.ts`] — deferred, pre-existing: deliberate mirror of 3.6a's `isMemberIdentityDuplicate` pattern; architectural fragility against future Drizzle version changes, not introduced by 3.6b.
- [x] [Review][Defer] **[LOW] Headline test missing assertion that `tr=` appears in the UPI URL** [`apps/api/tests/integration/vyawastha-shulk/vyawastha-shulk.spec.ts`] — deferred, pre-existing: test coverage gap; implementation currently correct; add as a future regression guard.

## Dev Notes

### Reuse map — extend these, do NOT reinvent

| Need | Reuse (do not rebuild) | Source |
| --- | --- | --- |
| Member-state event emission (FIRST production `vyawastha_shulk_paid` + `lock_in_entered` caller) | `member.projectMemberState(scopeTx.client, { eventType, payload, actorId })` — call TWICE in one scope-tx | `packages/domain/src/member/project.ts:72`; the 3.6a `signup.handlers.ts` scope-tx pattern |
| `member.vyawastha_shulk_paid` payload schema (already complete — emit, do NOT widen) | `VyawasthaShulkPaidPayloadSchema = z.object({ ...auditShape, utr, amount_inr }).strict()` | `packages/domain/src/member/events.ts:62` |
| `pending-fee → lock-in` transition (already encoded — emitter, not reducer, owns the gate) | reducer `case 'member.vyawastha_shulk_paid': if (state === 'pending-fee') return 'lock-in'` | `packages/domain/src/member/state.ts` |
| `member.lock_in_entered` marker (widen ONLY this — add the snapshot) | `LockInEnteredPayloadSchema` (currently `{...auditShape}`) | `packages/domain/src/member/events.ts` (LockInEnteredPayloadSchema) |
| Niyamavali clause resolution (lock-in policy) | `niyamavali.resolveByClauseId(db, pariwarId, clauseId)` — wrap like the IMA resolver | `packages/domain/src/niyamavali/read.ts:26`; `medical/ima-list.ts` (the registry-backed wrapper pattern) |
| Niyamavali clause SEED (the `niy.lock-in.policy` seed) | `niyamavali.createClause(db, input)` (3.5 seeded `niy.medical.ima-list` / `niy.concealment.r14` this way) | `packages/domain/src/niyamavali/write.ts:128`; 3.5's seed |
| T&C consent existence (gate condition d) | `consent.consentExists(tx, pariwarId, subjectId, 'tc_acceptance', validAt)` | `packages/domain/src/consent/read.ts:36` |
| Nominee existence (gate condition b) | `nominee.getMemberNominees(tx, pariwarId, memberId)` → length | `packages/domain/src/nominee/declaration-read.ts:21` |
| Medical disclosure existence (gate condition c) | `medical.getLatestMedicalDisclosure(tx, pariwarId, memberId)` → not-null | `packages/domain/src/medical/disclosure-read.ts:49` |
| Member existence + lifecycle state (gate condition a) | `member.memberExists` + `member.getMemberStateAt(tx, memberId, now)` | `packages/domain/src/member/read.ts:36,60` |
| Scope-tx lifecycle | `openScopeTx(deps, pariwarIdStr)` / `closeScopeTx(scopeTx, ok)` (scopeTx.client for the projector, scopeTx.tx for Drizzle accessors) | `apps/api/src/modules/multi-tenant/scope-tx.ts` |
| Member-session guard | `requireMemberSession(deps)` | `apps/api/src/modules/auth/shared/member-session-guard.ts` |
| Tenant-isolated table + RLS + GRANT + journal (the migration template) | `0026_member-medical-disclosures.sql` + `member_medical_disclosures.ts` | `packages/domain/migrations/0026_*.sql`; `packages/domain/src/schema/member_medical_disclosures.ts` |
| `23505` unique-violation narrowing (the `tr` idempotency catch) | 3.6a's `isMemberIdentityDuplicate` (narrowed to the constraint NAME — P9 patch) | `packages/domain/src/member/identity-write.ts:53` |
| Audit line (reference-code capture + payment audits) | `audit.writeAuditEntry` / `emitAuthAudit(deps, request, type, { context })` | `packages/domain/src/audit/write.ts`; `apps/api/src/modules/auth/shared/audit.ts` |
| Config value (VPA / amount / — mirror `defaultSignupPariwarId`) | `apps/api/src/config.ts` (the `DEFAULT_SIGNUP_PARIWAR_ID` env pattern at L188/L346) | `apps/api/src/config.ts` |
| Mobile signup screen + a11y + ScrollView/retry discipline + wizard chrome | the 3.6a `tc.tsx` (retry/503/a11y) + `payment.tsx` placeholder it replaces + `lib/wizard-steps.ts` (already lists `payment` last) | `apps/mobile/app/(signup)/` |
| api-client session-authenticated method shape | `memberTerms` / `memberTermsAccept` / `medicalDisclose` | `packages/api-client/src/index.ts:228-239` |
| Contracts DTO discipline (no `@twt/domain`, `.strict()`, OpenAPI emit) | `terms/member-terms.ts` + `medical/disclosure.ts` | `packages/contracts/src/` |

### R1 — 3.6b is the first PRODUCTION caller of the payment + lock-in events (the FROZEN substrate it emits)

Story 3.1 already defined `member.vyawastha_shulk_paid` (`{...auditShape, utr, amount_inr}`) + `member.lock_in_entered` (`{...auditShape}`) in `events.ts` AND the `pending-fee → lock-in` reducer branch in `state.ts`. Every prior reference is a **test seed** (`seedWithdrawnMember` folds `pending-kyc→pending-fee→lock-in→active→withdrawn` to exercise withdrawal). 3.6b is the first to emit these in production — mirroring how 3.6a was first to emit `member.signup_initiated`. **You are NOT designing the state machine; you are emitting into it.** The reducer's `member.vyawastha_shulk_paid` branch is what advances `pending-fee → lock-in` — so emitting that event IS entering lock-in. That is precisely why the gate (R2) must be checked **before** emitting it.

### R2 — The 5-condition gate is the EMITTER's responsibility, not the reducer's (the load-bearing AC2)

The reducer is total + agnostic: it transitions `pending-fee → lock-in` the instant it sees `member.vyawastha_shulk_paid`, with no knowledge of nominees/medical/T&C. The architectural contract (`state.ts` header) is explicit: *"Whether a transition SHOULD be emitted is the EMITTER's concern (the signup route / SIE scheduler), not the reducer's."* So the **handler** owns the gate: persist the receipt always (D3), then evaluate (a)-(d) [+ (e) = the receipt just written], and emit `vyawastha_shulk_paid` + `lock_in_entered` ONLY when all five hold. In the normal wizard order (3.6a R6: `tc → kyc → nominees → medical → payment`) all four are already satisfied by the time the member reaches payment — the gate is **defense-in-depth** against a skipped/partial step, exactly the boundary epics L1732-1735 mandates ("payment alone does NOT activate membership; the event is NOT emitted prematurely"). Receipt-always + transition-gated is BigDev decision **D3**.

**Receipt durability vs. transition atomicity (the ordering nuance).** The receipt must survive a gate-fail or a lock-in-policy 503 (D3 — AR-67 indefinite retention is unconditional). The two emitted events + the `lock_in_days_at_join` write must be atomic with each other. Recommended: a **first** scope-tx persists the receipt (+ attribution) and COMMITS; a **second** scope-tx runs the gate + (if satisfied) the two `projectMemberState` calls + `setLockInDaysAtJoin`. A failure in the second tx rolls back the transition but leaves the receipt durably committed; the idempotent `tr` re-confirm (AC1) completes lock-in later. Document this two-tx choice in Completion Notes.

### R3 — Widen ONLY `LockInEnteredPayloadSchema`; the column write is trigger-safe; do NOT touch the reducer

`member.lock_in_entered` is a non-transition MARKER (`from_state === to_state === 'lock-in'`; the reducer's `default → identity`). Widening its payload to `{...auditShape, lock_in_days_at_join, lock_in_policy_version}` carries the FR-8 snapshot for audit-reproducibility and does **not** change reducer behaviour — identical to how 3.4 widened `NomineesDeclaredPayloadSchema` and 3.5 widened `MedicalDisclosedPayloadSchema`. `member.vyawastha_shulk_paid` needs **no** widen (`{utr, amount_inr}` is already there).

**Source-of-truth semantics (keep these EXPLICIT — they are the trade that makes the column safe):** the **event payload is authoritative**; the `members.lock_in_days_at_join` **column is a derived query optimization, never an independent fact** — exactly as `members.state` is a projection of the event stream, not a second source of truth (architecture §1.14: "persisted state is optimization only"). Write the column from the **same** `lockInDays` value, in the **same** scope-tx, immediately after emitting `member.lock_in_entered`, so a divergence is structurally impossible at write time. Never write the column from any other path; never let a reader treat it as authoritative for audit/dispute/RTBF (those replay the event). It exists ONLY to spare Story 4.1's snapshot-resolution engine (epics L1899) a stream replay on the hot path. Writing it is a plain `UPDATE members SET lock_in_days_at_join = $n WHERE member_id = $1` — the 0018 `members_reject_unguarded_state_write` trigger RAISEs **only** when `NEW.state IS DISTINCT FROM OLD.state` (verified: the snapshot UPDATE leaves `state = 'lock-in'` unchanged), so it needs **no** `app.member_state_writer` guard. (Do the column write AFTER the two events so `state` is already `lock-in`.)

### R4 — UPI Intent is OS-level; the server only builds the URL + accepts the self-attested UTR

There is NO payment gateway and NO `apps/api/src/modules/payment/` module yet (architecture names it for Epic 8 contributions; 3.6b uses its own `vyawastha-shulk/`). The architecture is explicit (L1568): *"UPI Intent payment handoff is OS-level and out of scope; the OS UPI [app handles it]."* So: the server builds `upi://pay?pa={vpa}&am={amount}&cu=INR&tn=signup-shulk-{memberId}&tr={tr}` (VPA + amount **server-authoritative** — never client-named, or a malicious client pays ₹0 / a wrong payee), the mobile `Linking.openURL`s it, the member pays in their UPI app, returns, and **self-attests the UTR** (permissive: 12-digit numeric OR 22-char alphanumeric, UX §"UTR self-attest"). The async matcher/bank-statement reconciliation (Epic 8) does NOT gate signup lock-in — the signup Shulk is trusted on self-attest (the receipt records the UTR for later audit/refund analysis, AR-67). `tr` is the idempotency key (architecture §"Idempotency" L283: keyed store covering `tr=`) — implemented as the UNIQUE receipt column.

### R5 — Reference Code is a PORT SEAM only (D2); no new event; defer validation to Epic 13

FR-82 stores the code as `attribution_source`; FR-87 (adopter-chain attribution / commission) is **v2** and gated at ≥1-lakh members. Epic 13 (the field-worker allocation registry) is **not built**, so there is nothing to validate against. The epics AC line ("validated against Epic 13's registry; unknown codes rejected") describes the eventual Epic-13-activated behaviour — **v1 captures-and-defers**: format-check 6 digits, store, no rejection, skipping allowed. Do **not** mint a `member.reference_code.captured` event — the 14-event `MEMBER_EVENT_TYPES` tuple is frozen (Story 3.1) and `reference_code.captured` is not a member-lifecycle transition. Record the capture via a Story 1.10 audit line + the `member_attribution` row; Epic 13 backfills attribution when it activates. The `member_attribution` table carries **no FK** to a field-worker registry (none exists).

### R6 — Provisioning precondition: the launch Pariwar must carry `niy.lock-in.policy` (the cross-cutting registry-bootstrap obligation)

For lock-in to fire, `DEFAULT_SIGNUP_PARIWAR_ID` must have an effective `niy.lock-in.policy` clause (v1 payload `{ lock_in_days: 30 }`). This is the SAME cross-cutting "every production Pariwar must carry its registry before a member can finish signup" obligation 3.5 R6 raised (its `niy.medical.ima-list` / `niy.concealment.r14`) and 3.6a R3 made user-visible (the effective T&C row). If the clause is unprovisioned, a paid member 503s at lock-in (`lock_in.policy_unavailable`) with the receipt retained — the idempotent re-confirm completes once provisioned. **Flag this precondition to BigDev in Completion Notes** (it joins the 3.6a R3 T&C precondition + the `pariwar_passport` precondition as the launch-Pariwar provisioning checklist). The clause is trustee-adjustable post-launch via the Story 2.4 amend workflow (FR-8 ramp 1mo→3mo→6mo→12mo) — new graduations do NOT re-lock existing members because each carries the join-time snapshot.

### R7 — `actorId` is a `uuid` column — never the string `'system'`

For `projectMemberState`, pass `memberIdStr` (the member-actor — the member self-pays + self-enters lock-in) for both emitted events. NEVER the string `'system'` on the `actor_id` uuid column (the 3.4/3.5 `22P02` gotcha; 3.4's review fixed a seed that hit it). The `actor` payload field is `'member'`; the `actor_id` column is the member's uuid.

### Migration discipline

3.6b owns migration **0027** (`vyawastha_shulk_receipts` + `member_attribution` + the `members.lock_in_days_at_join` column add). Hand-author it (snapshots stopped at 0020 — `db:generate` would re-emit applied 0021-0026 → `42P07`; never regenerate an applied migration; never `DROP SCHEMA` — strips `twt_app` USAGE → `42P01`). Journal idx-27, `when` = 1783050000000 (idx-26 `when` + 86400000). No snapshot file. ([[project_live_db_test_gotchas]])

### Project Structure Notes

- **New — `apps/api`:** `src/modules/vyawastha-shulk/{handlers.ts, routes.ts, index.ts}`, `tests/integration/vyawastha-shulk/*.spec.ts`.
- **New — `@twt/domain`:** `src/schema/{vyawastha_shulk_receipts.ts, member_attribution.ts}`, `src/payment/{receipt-write.ts, receipt-read.ts, attribution-write.ts, index.ts}`, `src/member/{lock-in.ts, lock-in-gate.ts}`, `migrations/0027_vyawastha-shulk-receipts.sql`.
- **New — `@twt/contracts`:** `src/payments/{vyawastha-shulk.ts, index.ts}`.
- **Edited — `@twt/domain`:** `src/member/events.ts` (widen `LockInEnteredPayloadSchema` ONLY), `src/schema/members.ts` (+ `lockInDaysAtJoin` column), `src/schema/index.ts` + `src/index.ts` (barrels), `migrations/meta/_journal.json` (+ idx-27).
- **Edited — `apps/api`:** `src/config.ts` (+ `vyawasthaShulkVpa` + `vyawasthaShulkAmountInr`), `src/audit/audit-sink.ts` (+ `member_vyawastha_shulk.*` + `member_attribution.captured` + `member.lock_in_entered`), `src/server.ts` (+ `registerVyawasthaShulkModule`).
- **Edited — `@twt/contracts`:** `src/index.ts`, `scripts/emit-openapi.ts`, `openapi/v1.yaml` (regenerated).
- **Edited — `apps/mobile`:** `app/(signup)/payment.tsx` (REPLACE the 3.6a placeholder).
- **Edited — other:** `packages/api-client/src/index.ts` (+ `vyawasthaShulkIntent`/`vyawasthaShulkConfirm`/`vyawasthaShulkStatus`), `packages/i18n/locales/{en,hi}/common.json` (+ `payment.*`), `friction-budget.md`, `_bmad-output/implementation-artifacts/sprint-status.yaml`. Plus the `niy.lock-in.policy` seed (Task 7).
- **Naming discipline:** DB columns snake_case, TS fields camelCase (architecture L3663-3677). Contracts `.strict()`, no `@twt/domain` import, ESM `.js` specifiers.
- **Domain may not import `@twt/events`** (turbo cycle — [[project_member_lifecycle_domain_substrate]]); `member/` and `payment/` and `niyamavali/` are all `@twt/domain`-internal (no cycle — `medical/ima-list.ts` already imports `niyamavali/read.ts`). Contracts may not import `@twt/domain` (browser-bundle rule).

### Testing standards summary

- Unit (vitest) co-located under each package's `tests/`; DB-gated integration runs against `twt-test-pg` Docker on **:5433** ([[project_live_db_test_gotchas]]); **assert membership not counts** (own-committing writers accumulate rows).
- The **gate matrix** (AC2 — receipt persisted + NO lifecycle event per each of the 4 missing pre-conditions) is the highest-value new suite: it proves payment-alone does NOT enter lock-in (the load-bearing boundary).
- The **full-loop headline** (signup-create → kyc → nominees/medical/tc seeded → intent → confirm → `lock-in` with `lock_in_days_at_join: 30`) proves the signup loop finally closes end-to-end.
- **Idempotency** (`tr` re-confirm → one receipt, one event pair) + **policy-503 then re-confirm** are the two robustness tests.
- `actorId` for `projectMemberState` is a `uuid` column: pass `memberIdStr` — never `'system'` (R7).
- RLS: the new tables are tenant-isolated; integration RLS assertions `SET LOCAL ROLE twt_app` to shed superuser; cross-Pariwar denial + FK-cascade-RTBF round-trips mirror 3.4/3.5.
- Merge gate: `pnpm ci:local` mirrors all ci.yml jobs ([[project_ci_actions_suspension_local_mirror]]); contracts-determinism + i18n-parity + friction-budget + pii-scrape must be green.
- No `onSend` hooks expected; if touched, run the DB-gated suites ([[project_fastify_onsend_doublesend]]).

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.6 (lines 1717-1737)] — the parent story: UPI Intent (`tn=signup-shulk-{member_id}`, `tr=signup-{member_id}-{nonce}`), receipt fields (`paid_at/valid_through/amount/utr/payment_method`), the 5-condition gate (a-e), the `lock_in_days_at_join` snapshot. 3.6a took member-creation + wizard + T&C; 3.6b takes payment + reference-code + gate.
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 3 (lines 1567-1591) + #Story 3.7 (1739-1755) + L1899] — epic objectives; Story 3.7 consumes `member.lock_in_entered.occurred_at` + the snapshot (the clock widget); Story 4.1 resolves lock-in from the member's snapshot, not the current clause.
- [Source: _bmad-output/planning-artifacts/architecture.md#1.13 Hook 3 (lines 1167-1181)] — AR-67 Vyawastha Shulk receipt indefinite retention + post-hoc reconstructibility (FR-100 forward-compat); OQ-17 RTBF retention-horizon open.
- [Source: _bmad-output/planning-artifacts/architecture.md#1.14 (lines 1219-1268)] — the member state model; `pending-fee` "(signup begun) UPI Intent created, payment not confirmed → Payment confirmed → lock-in"; member-state derived from event replay.
- [Source: _bmad-output/planning-artifacts/architecture.md L283 (idempotency `tr=`), L1568 (UPI handoff OS-level/out-of-scope), L4286/L4598-4601 (payment module + the Pay→UPI→return→UTR flow)] — the payment seam shape.
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md §"UPI Intent pre-fill" / "UTR self-attest" (L255-257) + §7 invite/Reference Code (L267) + "Agency without anxiety" (L313/L389)] — the no-type pre-fill, permissive UTR validation, share-sheet reference-code auto-population, calm/no-urgency-theater register.
- [Source: _bmad-output/implementation-artifacts/3-6a-member-creation-signup-continuation-wizard-assembly-tc-acceptance.md] — the predecessor: the wizard chrome + `payment.tsx` placeholder 3.6b replaces, `lib/wizard-steps.ts` (already lists `payment` last), the scope-tx + `projectMemberState` pattern, the audit-or-throw template, the `tr`-style `23505`-narrowing (P9), the a11y patches (P4-P7), the R3 provisioning precondition this story extends.
- [Source: _bmad-output/implementation-artifacts/3-5-medical-disclosure-with-ima-list-concealment-denial-ack.md] — the registry-backed clause resolver (`resolveImaList` → `resolveByClauseId`), the clause seed pattern (`createClause`), the marker-payload widen precedent, the `actorId` `22P02` gotcha, the R6 per-Pariwar provisioning obligation.
- [Source: packages/domain/src/member/{events.ts:62 VyawasthaShulkPaidPayloadSchema, events.ts LockInEnteredPayloadSchema, state.ts vyawastha_shulk_paid branch, project.ts:72 projectMemberState}] — the frozen events + reducer 3.6b emits into.
- [Source: packages/domain/src/schema/members.ts (+ the 0018 state-writer trigger), packages/domain/migrations/0018_ordinary_venom.sql L62-72] — the members anchor + the trigger that fires only on `state` changes (the `lock_in_days_at_join` column-write is trigger-safe).
- [Source: packages/domain/src/{niyamavali/read.ts:26 resolveByClauseId, consent/read.ts:36 consentExists, nominee/declaration-read.ts:21 getMemberNominees, medical/disclosure-read.ts:49 getLatestMedicalDisclosure, member/read.ts:36/60}] — the gate-condition read accessors.
- [Source: packages/domain/migrations/0026_member-medical-disclosures.sql] — the hand-authored tenant-isolated table + GRANT + RLS migration template for 0027.

## Previous Story Intelligence

- **3.6a (merged, PR #50) is the direct predecessor** — it created the member, wired the wizard chrome (`(signup)/_layout.tsx` + `lib/wizard-steps.ts`, which ALREADY lists `payment` as the final step), and left `payment.tsx` as a placeholder + recorded the wizard order (`signup-create → tc → kyc → nominees → medical → [payment]`) explicitly for 3.6b to assert against. The four pre-payment gate facts (KYC `pending-fee`, nominees, medical, `tc_acceptance`) are all guaranteed present by the time the wizard reaches payment.
- **3.6a's review patches to pre-empt:** narrow the `tr` `23505` catch to the constraint NAME (their P9 — a broad `23505` match mis-maps unrelated unique violations); every mobile control needs BOTH `accessibilityLabel` + `accessibilityHint` and the action label must name the ACTION not a heading (their P4-P7 + the WCAG 2.5.3 P7); `ScrollView`-wrap the screen so the CTA isn't clipped on small devices (3.5/3.6a patch); declare any query/body params in the route schema so they reach OpenAPI (their P10).
- **3.5/3.4 gotchas:** `actorId: 'system'` → `22P02` (use `memberIdStr`); `getMemberStateAt` is non-nullable (use `memberExists` for a clean 409, not `if (!state)`); `TERMINAL_STATES` is a local hardcoded set (keep `{'withdrawn','anonymized'}`, note the drift). The clause-resolver `.safeParse()` (not `.parse()`) discipline (3.5 Chunk-A patch) applies to `resolveLockInPolicy`.
- **3.5 is the registry-backed-clause precedent** — `resolveLockInPolicy` mirrors `resolveImaList` (wrap `resolveByClauseId`, parse the payload, surface the `clause_version_id` as the recorded version). The `niy.lock-in.policy` seed mirrors 3.5's `niy.medical.ima-list` seed.

## Git Intelligence Summary

Recent Epic-3 commits (3.1 → 3.6a, PRs #44-#50) show the cadence: domain schema + migration + RLS + accessors → contracts + OpenAPI → apps/api module → mobile screen → tests → `pnpm ci:local` merge gate (Actions suspended — [[project_ci_actions_suspension_local_mirror]]). Migrations advanced 0018 (3.1) → 0026 (3.5); **3.6a was migration-free**, so **3.6b resumes the migration cadence at 0027**. Start 3.6b from a **fresh branch off `main`** (3.6a merged as #50) and commit manually (branch + selective stage, not the `commit-story` helper — [[project_story_automator_ops]]). Always `git fetch origin` before reasoning about `origin/main` ([[git_fetch_before_remote_reasoning]]).

## Latest Tech Information

No new external libraries. Stack is fixed: Fastify member JWT sessions (3.2), Drizzle 0.45 (hand-authored migration 0027), Zod + `.strict()` contracts, `@fastify/jwt`, the Niyamavali registry (Epic 2), the member lifecycle projector (3.1), Expo Router `(signup)` group + `Linking.openURL` for the OS UPI handoff (`upi://pay?` — no SDK; OS-level, architecture L1568), `@twt/i18n`. The events (`member.vyawastha_shulk_paid` / `member.lock_in_entered`), the reducer transition, the consent/nominee/medical/niyamavali read accessors, and the audit chain are all already shipped — 3.6b wires existing primitives + adds the receipt/attribution tables + the lock-in snapshot column; it adds no dependencies.

## Project Context Reference

No `project-context.md` exists in this repo (only the generator template). Binding conventions live in CLAUDE.md auto-memory: [[project_member_lifecycle_domain_substrate]], [[project_live_db_test_gotchas]], [[project_ci_actions_suspension_local_mirror]], [[project_sprint_status_ledger]], [[project_friction_budget_baseline_ratchet]], [[project_eslint_config_per_package_cwd]], [[project_fastify_onsend_doublesend]], [[project_story_automator_ops]], [[git_fetch_before_remote_reasoning]].

## Story Completion Status

Ultimate context engine analysis completed — comprehensive developer guide created. Status: ready-for-dev.

**Split context:** Story 3.6 was split with BigDev 2026-06-27 into **3.6a** (member creation + wizard + T&C — merged, PR #50) and **3.6b** (this — payment + reference-code seam + lock-in gate). The two BigDev scope decisions this story carries: **D2** Reference Code = port seam (Epic 13 registry not built → capture + store, defer validation); **D3** payment = always-retained receipt (AR-67) + GATED `member.vyawastha_shulk_paid` transition.

**Design decisions folded (not silently assumed) — flagged for BigDev review at implementation:**
1. **Module naming** `apps/api/src/modules/vyawastha-shulk/` (not the architecture's generic `payment/`, reserved for Epic 8 contributions) — keeps the signup-fee path self-contained (R4 / Task 6).
2. **Two-scope-tx ordering** — receipt commits in tx-1 (durable per D3/AR-67), gate + transition in tx-2 (atomic, gated); a tx-2 failure leaves the receipt + completes via the idempotent `tr` re-confirm (R2).
3. **Lock-in snapshot** — the widened `member.lock_in_entered` payload is the **authoritative historical record** (replay-derivable, immutable); the `members.lock_in_days_at_join` column is a **derived query optimization ONLY** (Story 4.1 read-cache), written from the same value in the same scope-tx so it cannot diverge — same source-of-truth/projection relationship as `members.state` ↔ the event stream. Column write is trigger-safe (R3). *(BigDev-confirmed: semantics kept explicit — event = truth, column = optimization.)*
4. **`niy.lock-in.policy` provisioning precondition** — a paid member 503s at lock-in if the launch Pariwar lacks the clause; receipt retained + idempotent re-confirm completes (R6 — joins the 3.6a R3 launch-Pariwar checklist).
5. **Reference Code** stored in a new `member_attribution` table with no field-worker FK + no validation; no new lifecycle event (vocabulary frozen) — audit line only (R5/D2).

No open decisions block implementation; the above are recorded for transparency and BigDev confirmation.

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (Amelia / bmad-dev-story workflow).

### Debug Log References

- `tr` idempotency narrowing: the Drizzle insert wraps the pg error in `.cause`, so `isReceiptTrDuplicate`
  reads `{code, constraint}` from `err` OR `err.cause` (verified against live `vyawastha_shulk_receipts_tr_uq`).
- Migration 0027 applied to the test DB via `pnpm db:migrate` (idx-27, `when` 1783050000000); verified the
  two tables + the `members.lock_in_days_at_join` column + the `tr` UNIQUE constraint exist.
- **Pre-existing flake (NOT 3.6b):** `packages/domain/tests/integration/terms-and-conditions/tc-registry.spec.ts`
  fails 2 tests (`getEffectiveTc` → undefined) on a CLEAN tree too — confirmed by stashing all 3.6b changes and
  re-running (same failure). It is the documented live-DB/test-pollution flake ([[project_live_db_test_gotchas]],
  [[project_ci_actions_suspension_local_mirror]]); unrelated to this story. Every other suite is green in isolation.

### Completion Notes List

**Implementation summary.** 3.6b closes the signup loop: it is the FIRST production caller of
`member.vyawastha_shulk_paid` (→ `pending-fee → lock-in`) + `member.lock_in_entered` (both FROZEN by Story 3.1).
Migration 0027 adds `vyawastha_shulk_receipts` (append-only, AR-67) + `member_attribution` (D2 port seam) +
`members.lock_in_days_at_join`. New domain accessors (`payment/*`, `member/lock-in.ts`, `member/lock-in-gate.ts`),
contracts (`payments/vyawastha-shulk.ts` + OpenAPI), the apps/api `vyawastha-shulk` module (intent/confirm/status),
the api-client SDK methods, the real mobile `payment.tsx`, and i18n `payment.*`.

**Verification.** Domain typecheck/lint/unit (6) green; domain integration `payment/` (6) green; apps/api full
suite green incl. the new vyawastha-shulk integration suite (15) + login-wall (3); contracts typecheck + OpenAPI
determinism green; i18n parity (51) green; api-client + mobile typecheck/lint green. CI gates green:
member-state-invariant, benefit-mechanism, friction-budget, schema-diff, pii-scrape, microcopy, contracts-determinism.

**Flagged decisions (folded, per the story's transparency contract).**

1. **Module naming (R4).** The signup-fee path lives in its own `apps/api/src/modules/vyawastha-shulk/`, NOT the
   architecture's generic `modules/payment/` (reserved for Epic 8 member→nominee contributions) — avoids premature
   coupling with the Epic-8 payment-module shape.
2. **Two-scope-tx ordering (R2/D3).** tx-1 persists the receipt (+ optional attribution) and COMMITS; tx-2 runs the
   gate + (if satisfied) the two `projectMemberState` emits + `setLockInDaysAtJoin`. A gate-fail or policy-503 in
   tx-2 leaves the receipt durably committed; the idempotent `tr` re-confirm completes lock-in later.
3. **Lock-in snapshot source-of-truth (R3).** The `member.lock_in_entered` payload (`lock_in_days_at_join` +
   `lock_in_policy_version`) is authoritative; `members.lock_in_days_at_join` is a derived read-cache, written from
   the SAME value in the SAME scope-tx, AFTER the events (state already `lock-in`) — a plain UPDATE that is
   trigger-safe (the 0018 state-writer trigger fires only on `state` changes; verified by an integration test).
4. **⚠ Provisioning precondition (R6) — for BigDev.** `DEFAULT_SIGNUP_PARIWAR_ID` MUST carry an effective
   `niy.lock-in.policy` clause (v1 `{lock_in_days: 30}`) or every paid member 503s `lock_in.policy_unavailable` at
   the lock-in step (receipt retained; idempotent re-confirm completes once provisioned). This joins the launch-Pariwar
   provisioning checklist alongside 3.6a's effective-T&C row and the `pariwar_passport`. The clause is seeded into
   `packages/domain/seed/niyamavali-v1-clauses.sql` for dev/staging; production provisioning is the cross-cutting
   registry-bootstrap obligation. Also set `VYAWASTHA_SHULK_VPA` (+ optionally `VYAWASTHA_SHULK_AMOUNT_INR`, default 110).
5. **Reference Code (D2/R5).** Stored in `member_attribution` with NO field-worker FK + NO registry validation; no
   new lifecycle event (the 14-event vocabulary is frozen); the capture is recorded via an `member_attribution.captured`
   audit line only. Epic 13 backfills attribution/commission when it activates.
6. **a11y discipline (AC5/P0-2c).** Every `payment.tsx` control carries `accessibilityLabel` + `accessibilityHint`;
   action labels NAME THE ACTION (WCAG 2.5.3, pre-empting 3.6a P4–P7); status + outstanding-step messages use polite
   live regions; the screen is ScrollView-wrapped (3.5/3.6a clip patch). Mobile build/test are repo no-ops → verified
   via typecheck + lint.

### File List

**New — `@twt/domain`:** `src/schema/vyawastha_shulk_receipts.ts`, `src/schema/member_attribution.ts`,
`src/payment/{receipt-write.ts, receipt-read.ts, attribution-write.ts, index.ts}`, `src/member/lock-in.ts`,
`src/member/lock-in-gate.ts`, `migrations/0027_vyawastha-shulk-receipts.sql`,
`tests/member/lock-in.test.ts`, `tests/integration/payment/vyawastha-shulk.spec.ts`.
**New — `@twt/contracts`:** `src/payments/{vyawastha-shulk.ts, index.ts}`.
**New — `apps/api`:** `src/modules/vyawastha-shulk/{handlers.ts, routes.ts, index.ts}`,
`tests/integration/vyawastha-shulk/vyawastha-shulk.spec.ts`.
**Edited — `@twt/domain`:** `src/member/events.ts` (widen `LockInEnteredPayloadSchema`), `src/schema/members.ts`
(+ `lockInDaysAtJoin`), `src/schema/index.ts`, `src/member/index.ts`, `src/index.ts` (barrels),
`src/ids/index.ts` (+ `VyawasthaShulkReceiptId`/`MemberAttributionId`), `migrations/meta/_journal.json` (+ idx-27),
`seed/niyamavali-v1-clauses.sql` (+ `niy.lock-in.policy`).
**Edited — `@twt/contracts`:** `src/index.ts`, `scripts/emit-openapi.ts`, `openapi/v1.yaml` (regenerated).
**Edited — `apps/api`:** `src/config.ts` (+ `vyawasthaShulkVpa`/`vyawasthaShulkAmountInr`),
`src/audit/audit-sink.ts` (+ `member_vyawastha_shulk.*` / `member_attribution.captured` / `member.lock_in_entered`),
`src/server.ts` (+ `registerVyawasthaShulkModule`).
**Edited — other:** `packages/api-client/src/index.ts` (+ `vyawasthaShulkIntent`/`Confirm`/`Status`),
`packages/i18n/locales/{en,hi}/common.json` (+ `payment.*`), `apps/mobile/app/(signup)/payment.tsx` (REPLACED
placeholder), `friction-budget.md` (3.6b disposition), `_bmad-output/implementation-artifacts/sprint-status.yaml`.

### Change Log

- 2026-06-28 — Story 3.6b implemented (all 11 tasks; ACs 1–5). Migration 0027 + receipt/attribution tables +
  lock-in snapshot column; the 5-condition lock-in entry gate (the load-bearing AC2); first production
  `member.vyawastha_shulk_paid` + `member.lock_in_entered` emit; Reference Code port seam (D2); real mobile
  payment screen; contracts + OpenAPI + i18n. Status → review.
