---
baseline_commit: 6b2c0429c1bbd967144b54a09fffd1162a946020
---

# Story 8.13: Nominee-VPA Claim-Time Collection + Resolver Wiring + UPI Intent Re-enable `[SURFACE+SUBSTRATE]`

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

> **Added by correct-course 2026-07-21** (discharges Story 8.4 D1's forward commitment [[project_nominee_vpa_deferred_seam]]). Full rationale + impact analysis: `_bmad-output/planning-artifacts/sprint-change-proposal-2026-07-21.md`. **Sequencing:** runs **NEXT** in the Epic-8 window (priority override) — it is a **precondition for Story 8.12's on-device SM-1 demo** (`epics.md:2853`, demoable-closure beat B21), not a blocker to building the other 8.x stories. Labelled 8-13 (deliberately **not** renumbered into 8-6…8-12) because the completed Stories 8.4/8.5 cross-reference 8.5/8.10/8.11 by number.

## Story

As the contribution pipeline (fulfilling Story 8.4's deferred payee-VPA seam),
I want the nominee's UPI VPA collected **per bank account at claim-time** and resolved into the UPI Intent,
so that the assigned pool's `<UPIIntentButton>` fires a real `upi://pay` and Epic 8's 90-second loop is demoable to the yellow pill.

**Design anchor (drives the whole slice):** contributions flow **member → nominee directly** (PMLA posture, `prd.md:1165` — the trust never holds support money in the pool flow). Therefore the `pa=` destination **is the nominee's own bank-account VPA** — the *same two accounts* Story 6.8 already collects, and FR-31's dual-account (RBI-per-payee-per-day-limit) workaround exists for exactly these ~16,000 inbound contributions in 15 days. So the VPA is **per-account** (#1 default / #2 switch), **optional**, and collected at the **same claim-time moment** as the accounts. It is a **different VPA** from the *sender* (member) VPA read by the Story 9.4 secondary matcher — touch only the **payee** side.

## Acceptance Criteria

**AC1 — Optional VPA collected per account, Tier-1, format-validated**
**Given** the confirmed substrate gap (no VPA anywhere; Story 6.8 collects account#+IFSC only) + BigDev decision 2026-07-21 (keep the nominee-VPA rail; collect at claim-time; per-account; optional) + Story 8.4's `resolveNomineeVpa` seam returning `{ available:false, reason:'vpa_not_collected' }`
**When** claim-time nominee collection runs on the Story 6.8 `<NomineeDetailEditor>` (UX-DR34) surface
**Then** an **optional** `vpa` field is collected **per nominee bank account** (#1 and #2), **Tier-1 envelope-encrypted** (AR-12, via Story 1.5 `piiColumn(1, 'claim_nominee_bank')`), UPI-VPA **format-validated** (`handle@psp`)
**And** a nominee **without** a VPA is a **first-class state** — the account+IFSC disbursement path is unaffected and VPA is **never** a `frozen`-gate (unlike IFSC + holder-name per FR-31; the write MUST succeed with a null VPA)
**And** a migration adds a **nullable** Tier-1 `vpa_ciphertext` column to `claim_nominee_bank_accounts`.

**AC2 — Resolver wired absent → real; UPI Intent lights up**
**Given** the payment-module resolver seam Story 8.4 left (`apps/api/src/modules/payment/handlers.ts`)
**When** the assigned pool's nominee account #1 (or the switched #2 per FR-27) **has** a VPA
**Then** `resolveNomineeVpa` returns the real VPA (replacing the hard-`absent`); `POST /api/v1/member/contribution/intent` returns `{ available:true, upiUrl, tr, amountInr, vpa, account, myContribution }`; the `<UPIIntentButton>` (UX-DR26, ≥ 56pt) renders **enabled**
**And** when the VPA is **absent**, the existing `{ available:false, reason:'vpa_not_collected', myContribution }` fail-soft path is preserved **verbatim** (no regression of Story 8.4's absent state; **no fabricated VPA; no `pa=undefined`; no derivation from account#+IFSC**)
**And** `buildContributionUpiUrl`, the deterministic `tr=` (Story 7.7), the amount-lock, and the `tn=` grammar are **unchanged** — this story lights only the `pa=` seam.

**AC3 — Switch-account affordance (FR-27 #1/#2)**
**Given** FR-27's account #1/#2 "Switch account" affordance (deferred in Story 8.4 per D1)
**When** ≥ 2 nominee accounts carry a VPA
**Then** the switch affordance is enabled on `/pay` (default #1; a switch re-requests intent with `account: 2`); when < 2 accounts carry a VPA, no switch is shown (Story 8.4's `account_not_found` resolver state is honoured — never a silent substitution).

**AC4 — Pool uniqueness under Story 7.6**
**Given** wrong-pool enforcement (Story 7.6)
**Then** VPA→pool uniqueness holds (each pool resolves its own assigned-claim's nominee-account VPA via the existing `resolveMemberLivePool` binding); no cross-pool remap.

**AC5 — Demoable-closure precondition**
**Given** the Epic-8 demoable-closure precondition (`epics.md:2853`, SM-1 demo beat B21)
**Then** with ≥ 1 nominee-account VPA seeded in a test claim, the 90-second loop fires a real `upi://pay` end-to-end to the yellow pill on the canonical validation device (exercised as an integration test; the on-device beat is Story 8.12).

**AC6 — i18n + tests**
**And** i18n: the new VPA field label / help / validation-error copy added to `packages/i18n/locales/{hi,en}/claim.json` under `nominee.bank.vpa*` (grade-6, hi+en parity, `pnpm i18n:check` green)
**And** tests: domain unit (resolver present / absent / switch — the existing `intent.test.ts` is the FROZEN reference), migration + schema shape, contract `{ available:true }` reachability + VPA-format validation, integration (intent endpoint returns `available` when a VPA is seeded; `vpa_not_collected` preserved when absent; collection round-trips the encrypted VPA).

## Tasks / Subtasks

- [x] **Task 1 — Substrate: migration + schema (AC1)**
  - [x] Add migration `packages/domain/migrations/0080_claim-nominee-bank-vpa.sql` — `ALTER TABLE "claim_nominee_bank_accounts" ADD COLUMN "vpa_ciphertext" text;` (NULLABLE — no `NOT NULL`). Hand-authored header mirroring `0079` (⚠ **do NOT `db:generate`** — baseline frozen at 0020; **no snapshot file**; **no new GRANT** — the table's existing grants cover the new column). Update the migration journal per the 0021–0079 convention.
  - [x] Add `vpaCiphertext: piiColumn(1, 'claim_nominee_bank')('vpa_ciphertext')` (NULLABLE — do **not** chain `.notNull()`) to `packages/domain/src/schema/claim_nominee_bank_accounts.ts`, sitting with the three existing Tier-1 ciphertext columns. Update the file header PII-discipline comment (`vpa` is Tier-1, per-account, optional).
  - [x] Verify `ClaimNomineeBankAccountRow` now carries `vpaCiphertext: string | null` (it's `$inferSelect`, so automatic) and that `getClaimNomineeBankAccountsCiphertext` (`select()`) returns it.

- [x] **Task 2 — Collection contract + writer (AC1)**
  - [x] `packages/contracts/src/claims/nominee-bank.ts`: add an **optional** `vpa` to `NomineeBankAccountEntry`, format-validated against a **new wire constant** `NOMINEE_BANK_VPA_REGEX` (re-declared here — contracts MUST NOT import `@twt/domain`/`@twt/platform-adapters`, the `NOMINEE_BANK_IFSC_REGEX` precedent). Keep `.strict()`. Add `vpaPresent: boolean` to `NomineeBankAccountView` (non-PII presence, so the editor + status view can show which accounts carry a VPA).
  - [x] `packages/domain/src/claim/nominee-bank-persist.ts`: add `vpaCiphertext: string | null` to `NomineeBankAccountInput`; thread it into the `insert().values(...)` mapping. VPA is optional → `null` when absent. Do **not** touch the 0-or-2 aggregate invariant or the latest-wins-replace semantics.
  - [x] `apps/api/src/modules/claims/claims.nominee-bank.handlers.ts` → `prepareAccount`: when `entry.vpa` is present, re-assert `NOMINEE_BANK_VPA_REGEX` server-side then `encryptNomineeBankField(entry.vpa, pariwarId, deps.encryption)` → `vpaCiphertext`; else `null`. Include `vpaCiphertext` on the `NomineeBankAccountInput`. Add `vpaPresent` to the presence-view responses (`recordNomineeBank` return + `nomineeBankStatus`). VPA absence must **never** throw (optional). Note: `prepareAccount` re-validates IFSC via `IFSC_REGEX` from `@twt/platform-adapters` (`:33,116`), not the contracts-side mirror; importing `NOMINEE_BANK_VPA_REGEX` straight from `@twt/contracts` here is fine (apps/api has no bundle-boundary restriction) but is a deliberate deviation from that exact precedent, not an oversight.
  - [x] `apps/api/src/modules/claims/nominee-bank-crypto.ts`: no change needed — `encryptNomineeBankField`/`decryptNomineeBankField` already key on `CLAIM_NOMINEE_BANK_FIELD_CLASS`; reuse them for the VPA (same field class → symmetric).

- [x] **Task 3 — Resolver wiring: decrypt at the API boundary (AC2) — the load-bearing change**
  - [x] In `apps/api/src/modules/payment/handlers.ts` `intent()`: after `getClaimNomineeBankAccountsCiphertext(...)`, **decrypt each account's `vpaCiphertext`** (reuse `decryptNomineeBankField` from `../claims/nominee-bank-crypto.js` — SAME `CLAIM_NOMINEE_BANK_FIELD_CLASS` context) into a plaintext `vpa`, then pass augmented rows `{ ...row, vpa: plaintext | null }` to `resolveNomineeVpa`. Both accounts need decrypting (Task 4's `canSwitchAccount` inspects the non-preferred account too) — run the two `decryptNomineeBankField` calls via `Promise.all` (mirror the concurrent-decrypt pattern at `claims.nominee-bank.handlers.ts:132-136`), not sequentially.
  - [x] ⚠ **PERFORMANCE GUARDRAIL:** `decryptTier1` (`packages/domain/src/encryption/envelope.ts`) makes a real KMS network round-trip per ciphertext. Story 8.4 built this endpoint against the architecture's `<1s p95` UPI-intent-launch budget on the assumption of **zero decryption on the hot path**; this story puts up to two KMS calls on it. Parallelize them (previous bullet) and treat the `<1s p95` budget as a re-check item — Story 8.12's SM-1 demo measurement depends on this endpoint staying fast.
  - [x] ⚠ **CRITICAL GUARDRAIL:** `resolveNomineeVpa` reads a *plaintext* `vpa` off each row (`accountVpa` shim, `intent.ts:43-46`). If you pass the **raw ciphertext rows** (which now have `.vpaCiphertext` but no plaintext `.vpa`), the resolver reads `undefined` → always `vpa_not_collected` → **the feature silently never lights up**. Decryption in the handler is mandatory.
  - [x] Do **NOT** change `packages/domain/src/contribution/intent.ts` behaviour or its public contract. `resolveNomineeVpa`/`buildContributionUpiUrl` are the frozen 8.4 reference; the existing `intent.test.ts` (which passes `{ ...account(1), vpa: 'nominee@okhdfc' }`) is your compatibility oracle. **DECIDED (BigDev, 2026-07-21):** leave the resolver's `accountVpa` seam **as-is** (the loose `as { vpa?: unknown }` read is intentional forward-compat) and feed it decrypted rows — do **not** re-type the resolver input.
  - [x] Confirm no VPA plaintext ever reaches an audit line or event payload — the `member_contribution.intent` audit carries only `{available, reason}` / `{available, amount_inr, account}` today (pii-scrape gate). The `vpa` in the `available:true` **response body** is the payee shown in the confirmation UI — that's expected, not a leak.

- [x] **Task 4 — Switch-account affordance (AC3) — IN SCOPE for this story (DECIDED, BigDev 2026-07-21)**
  - [x] Add a minimal `canSwitchAccount: boolean` to `ContributionIntentAvailable` (`packages/contracts/src/contributions/upi-intent.ts`) — `true` iff the *non-preferred* account also resolves a VPA. Compute it in `intent()` (a second `resolveNomineeVpa` with the other rank, or inspect the decrypted rows). Keep `.strict()`.
  - [x] `apps/mobile/app/(contribution)/pay.tsx`: when `intent.available && intent.canSwitchAccount`, render a small "Switch account" affordance that re-requests intent with `{ account: intent.account === 1 ? 2 : 1 }` (the api-client `memberContributionIntent(input?)` already accepts `{ account }`). Keep it lean, but ship it here — not a follow-up. ⚠ `pay.tsx:38-52` defines its own local `IntentAvailable`/`Intent` types (cast from the API response) instead of importing `ContributionIntentResponse` from `@twt/contracts` — add `canSwitchAccount` to that local interface too, or the branch won't compile.
  - [x] `canSwitchAccount` is a new **required** field on `ContributionIntentAvailable` (`.strict()`) — Story 8.4's frozen fixtures in `packages/contracts/tests/contributions.test.ts:261-271` and `:276-284` construct `{available:true}` responses without it and will fail to parse. Update those two fixtures to include `canSwitchAccount` alongside any new fixtures you add.
  - [x] The `account_not_found` reason already exists in the contract + `pay.tsx` union — no new fail-soft copy needed (falls into `upi_intent.unavailable`).

- [x] **Task 5 — Collection surface: the optional VPA field (AC1)**
  - [x] `apps/mobile/app/(claim)/nominee-review.tsx` (`<NomineeDetailEditor>`): add `vpa: string` to `AccountFields` + `emptyAccount()`; render an **optional** VPA `Input` in `accountBlock(...)` after the IFSC field (label `nominee.bank.vpa`, helper `nominee.bank.vpa_help`, inline `nominee.bank.vpa_invalid` when non-empty + fails the client regex). Thread `vpa` (trimmed, only when non-empty) into the `recordNomineeBank` request accounts. The field must **not** gate `accountComplete` / submit (optional).
  - [x] Add a client-side `VPA_RE` helper to `apps/mobile/lib/` mirroring `nominee-bank-ifsc.ts` `IFSC_RE` (value-aligned with the contract's `NOMINEE_BANK_VPA_REGEX`).

- [x] **Task 6 — i18n (AC6)**
  - [x] Add to `packages/i18n/locales/en/claim.json` **and** `hi/claim.json` (flat dotted keys, hi+en parity): `nominee.bank.vpa` (label, e.g. "UPI ID (optional)"), `nominee.bank.vpa_help` (calm "optional — lets members contribute via UPI in the app"), `nominee.bank.vpa_invalid` (grade-6 error). Run `pnpm i18n:check`. Note: `claim.json` already has an unrelated, unreferenced `nominee.upi` key (~line 44, leftover from a different concept) — do not reuse or extend it; `nominee.bank.vpa*` is a distinct, new namespace.

- [x] **Task 7 — Tests (AC6) + regression preservation**
  - [x] **Domain unit** — `packages/domain/tests/contribution/intent.test.ts` already covers resolver present/absent/switch/`account_not_found`; leave behaviour intact (add fixtures only if you tightened input types in Task 3).
  - [x] **New decrypt call site** — `decryptNomineeBankField` (`nominee-bank-crypto.ts`) has no callers anywhere in the repo before this story. Confirm the local/test KMS provider double actually round-trips through it (the integration test must exercise encrypt-at-collection → decrypt-at-intent on the same ciphertext) — there's no existing "decrypt inside a live request handler" precedent test to copy.
  - [x] **Schema/migration shape** — assert `vpa_ciphertext` exists, is nullable, and carries the Tier-1 `piiColumn(1,'claim_nominee_bank')` annotation (the schema-shape test convention).
  - [x] **Contract** — `packages/contracts/tests/`: `NomineeBankAccountEntry.vpa` valid/invalid/absent; `.strict()` rejects unknown keys; `ContributionIntentAvailable` `{available:true}` reachability incl. `vpa`/`canSwitchAccount` (extend `contributions.test.ts`).
  - [x] **API integration (:5433)** — seed a claim's nominee accounts *with* a VPA on #1 → `intent` returns `available:true` + correct `vpa`; *without* a VPA → `vpa_not_collected` (byte-for-byte 8.4 preservation); switch to #2 when #2 has a VPA → `available:true, account:2`; #2 without a VPA → `account_not_found`. Collection round-trip: record with/without VPA persists `vpa_ciphertext`/null; `vpaPresent` reflects it; decrypt-at-intent yields the same plaintext.
  - [x] **Merge gate** — `pnpm ci:local` (`--concurrency=4`, `DATABASE_URL` on :5433) all 21 gates green; confirm any suspect live-DB flake passes in isolation ([[project_known_livedb_test_failures]] / [[project_ci_local_concurrency_oversubscription]]).

### Review Findings

*3-layer adversarial review (Blind Hunter, Edge Case Hunter, Acceptance Auditor) run 2026-07-22 against the uncommitted diff (baseline = HEAD `6b2c042`, matching this story's own `baseline_commit`).*

- [x] [Review][Patch] Malformed-but-non-blank VPA 400s the whole two-account submission with no field-specific feedback — **resolved (BigDev 2026-07-22): block submit on an invalid (non-blank) VPA**, matching how other required-field validation already gates submission [apps/mobile/app/(claim)/nominee-review.tsx]
- [x] [Review][Defer] `intent()` now does up to 3 live KMS decrypt/resolve round-trips per call (2 accounts decrypted + a `canSwitchAccount` probe) against the story's own stated <1s p95 guardrail, with no caching — deferred (BigDev 2026-07-22): ship as-is, this story's own merge gate already ran the p95 guardrail locally; revisit only if a real measurement shows it's actually close to/over budget [apps/api/src/modules/payment/handlers.ts]

- [x] [Review][Patch] No try/catch around the VPA decrypt — a KMS error or corrupt ciphertext 500s the whole intent endpoint instead of degrading to the fail-soft `vpa_not_collected` state AC2 requires be preserved [apps/api/src/modules/payment/handlers.ts:140-152]
- [x] [Review][Patch] `onSwitchAccount` swallows errors and unavailable responses with no user-visible feedback — spinner just stops [apps/mobile/app/(contribution)/pay.tsx:129-142]
- [x] [Review][Patch] Stale failure-coach/`noApp`/`launchError`/UTR state persists across a successful account switch instead of being reset [apps/mobile/app/(contribution)/pay.tsx:129-142]
- [x] [Review][Patch] A switch response carrying `myContribution:'attested'` is not handled — the Pay/launch UI re-shows instead of routing to the yellow-pill confirmation [apps/mobile/app/(contribution)/pay.tsx:133-136]
- [x] [Review][Patch] No guard disabling the primary Pay/launch action while a switch request is in flight — a member can tap Pay against the stale about-to-be-replaced intent [apps/mobile/app/(contribution)/pay.tsx]
- [x] [Review][Patch] Hand-duplicated `IntentAvailable` interface in `pay.tsx` instead of importing `ContributionIntentAvailable` from `@twt/contracts` — the comment itself admits it must be kept byte-for-byte in sync [apps/mobile/app/(contribution)/pay.tsx]
- [x] [Review][Patch] `vpa` skips `.trim()` in the Zod contract unlike its sibling PII fields (`accountHolderName`) — incidental whitespace hard-400s instead of normalizing [packages/contracts/src/claims/nominee-bank.ts]
- [x] [Review][Patch] The VPA-regex drift-pinning test the code comment promises (`apps/mobile/lib/nominee-bank-vpa.ts`'s `VPA_RE` vs contracts' `NOMINEE_BANK_VPA_REGEX`) was never written [apps/mobile/lib/nominee-bank-vpa.ts:8]
- [x] [Review][Patch] Decrypted plaintext `vpa` is spread alongside its own still-present `vpaCiphertext` in the same row object longer than necessary — unnecessary PII exposure surface for a Tier-1 field [apps/api/src/modules/payment/handlers.ts]
- [x] [Review][Patch] No accessibility live-region announcement while an account switch is in progress, unlike the failure-coach convention elsewhere in the codebase [apps/mobile/app/(contribution)/pay.tsx]
- [x] [Review][Patch] AC5/Task 7 claims an API-integration test exercising the real decrypt-in-handler path, but no test (unit-mocked or live-DB) ever actually invokes `decryptNomineeBankField` through the real `intent()` handler — verified: the unit-test fixture rows never carry `vpaCiphertext` (short-circuits to `null`), and the live-DB test calls `decryptNomineeBankField` directly, bypassing the handler entirely. The load-bearing code this story calls out as its centerpiece is untested end-to-end. [apps/api/tests/unit/payment-contribution.test.ts, apps/api/tests/integration/claims/nominee-bank.spec.ts]

- [x] [Review][Defer] Payment module directly imports a crypto helper (`decryptNomineeBankField`) living in the sibling `claims/` module [apps/api/src/modules/payment/handlers.ts] — deferred, pre-existing pattern; now has 2 real consumers (claims + payment), meeting the project's own "extract only once a second consumer exists" threshold — worth relocating to a shared/domain location in a follow-up, not blocking this story.
- [x] [Review][Defer] Re-submitting the nominee-bank form without retyping a previously-collected VPA silently wipes it under the endpoint's pre-existing latest-wins full-replace semantics [packages/domain/src/claim/nominee-bank-persist.ts] — deferred, pre-existing endpoint behavior not introduced by this story, but the VPA is now a field where that silent loss has a real, easy-to-hit consequence (UPI Intent goes dark again).

*Dismissed as noise (4): "pariwarId vs pariwarIdStr" naming (verified — both encrypt/decrypt calls pass the identical underlying string value through a `pariwarId: string`-typed param, no functional mismatch); `prepareAccount`'s server-side VPA regex re-check being unreachable via normal requests (confirmed, but intentional defense-in-depth since the wire-layer Zod schema already gates it); the VPA regex permitting some implausible-looking local-parts (soft precision nitpick, not a correctness/security issue); the undisclosed `.gitignore` addition of `docs/legal/` (benign, unrelated housekeeping, not part of the story's functional surface).*

## Dev Notes

### The seam you are closing (read `intent.ts` first)

Story 8.4 built the entire UPI Intent path and left `resolveNomineeVpa` deliberately dark:

- `packages/domain/src/contribution/intent.ts:43-46` — `accountVpa(account)` reads a **forward-compatible plaintext `vpa`** field off the row (`(account as { vpa?: unknown }).vpa`) that does not exist yet, so it always returns `null` → `{ available:false, reason:'vpa_not_collected' }` today.
- The resolver, the URL builder, the endpoint, the contract union, and `pay.tsx`'s three-way branch (`available:true` / `vpa_not_collected` / `unassigned`) are all already wired. **8.4's promise: the flow lights up with zero changes to `intent.ts`, the endpoints, or the card** once a real VPA reaches the resolver. Your job is to (a) add the substrate column, (b) collect + encrypt the VPA at 6.8's surface, (c) **decrypt at the intent boundary and feed the plaintext to the resolver**, (d) add the switch UI.

### Encryption is app-layer — the decrypt boundary is the whole trick

`piiColumn` (`packages/domain/src/encryption/column.ts`) is **identity pass-through** — it only tags the column Tier-1 for the PII-shielding CI gate. Real encryption is explicit at the app layer (Story 1.5 fallback (b)):

- **Collect** (`claims.nominee-bank.handlers.ts` → `prepareAccount`): `encryptNomineeBankField(vpa, pariwarId, deps.encryption)` → `vpa_ciphertext`.
- **Resolve** (`payment/handlers.ts` → `intent`): `decryptNomineeBankField(row.vpaCiphertext, pariwarIdStr, deps.encryption)` → plaintext → `resolveNomineeVpa`.
- Both use `CLAIM_NOMINEE_BANK_FIELD_CLASS` (already the class for holder-name/account#/IFSC). The VPA rides the **same** field class → symmetric encrypt/decrypt. Reuse the existing helpers; do not invent a new context.
- `deps.encryption` (`EncryptionDeps`) is on `AppDeps` in the payment handler already; `decryptTier1` takes `kms`/`kekRef` explicitly (no AsyncLocalStorage needed).

### Files being MODIFIED (current state → what changes → what must be preserved)

- **`packages/domain/src/schema/claim_nominee_bank_accounts.ts`** — today: 3 Tier-1 ciphertext cols + rank + Tier-3 bank/branch, composite PK `(claim_case_id, account_rank)`, `account_rank ∈ {1,2}` CHECK. Change: add nullable `vpaCiphertext`. Preserve: the composite PK, the CHECK, the 0-or-2 writer-owned invariant (do NOT add a second write path — see the persist-file warning).
- **`packages/domain/src/claim/nominee-bank-persist.ts`** — today: latest-wins replace of exactly-two accounts under a claim row lock, emits `claim.nominee_bank_recorded`. Change: thread `vpaCiphertext` into the insert. Preserve: the D3 collectable-window guard, `NomineeBankAccountSetError`, the identity-annotation payload (NO PII — do **not** add VPA to the event payload).
- **`apps/api/src/modules/claims/claims.nominee-bank.handlers.ts`** — today: validate + encrypt 3 fields per account, D3 tier guard, post-commit NON-PII audit. Change: encrypt optional VPA; add `vpaPresent` to presence views. Preserve: the two-tier permission (`assertCorrectionAuthorized`), the Pattern-4 IFSC rejection, the NON-PII audit contract (no VPA in the audit line).
- **`apps/api/src/modules/payment/handlers.ts`** — today: `intent()` passes ciphertext rows straight to `resolveNomineeVpa` (fine while it's always-null). Change: decrypt `vpaCiphertext` → plaintext before the resolver; compute `canSwitchAccount`. Preserve: the `myContribution` field carried on **every** branch (a member who already attested must not be re-shown the pay flow); the fail-soft `{available:false, reason}` shapes; the unexpected-error catch → audit + rethrow.
- **`packages/contracts/src/contributions/upi-intent.ts`** — today: discriminated union on `available`; `vpa`/`account`/`myContribution` already defined. Change: add `canSwitchAccount` to `ContributionIntentAvailable`. Preserve: `.strict()`; the deliberate absence of any confirmed/aggregate count (yellow-never-confirmed teeth — [[project_alert_primitive_substrate]]).
- **`packages/contracts/src/claims/nominee-bank.ts`** — today: `NomineeBankAccountEntry` (holder/number/ifsc), `NOMINEE_BANK_IFSC_REGEX` wire constant, `.length(2)` + distinct-account-number refine. Change: optional `vpa` + `NOMINEE_BANK_VPA_REGEX` wire constant + `vpaPresent` on the view. Preserve: the browser-bundle rule (NO `@twt/domain` import), `.strict()`, `.length(2)`.
- **`apps/mobile/app/(contribution)/pay.tsx`** — today: 3-way intent branch, UTR-attest, failure coach. Change: switch-account affordance when `canSwitchAccount`. Preserve: the already-attested short-circuit, the out-of-band attest escape hatch, the coach's single-affordance rule.
- **`apps/mobile/app/(claim)/nominee-review.tsx`** (`<NomineeDetailEditor>`) — today: dual-account form, IFSC-lookup-on-blur, latest-wins save. Change: optional VPA input per account. Preserve: `accountComplete` (VPA must not gate it), the IFSC race-guard (`ifscRequestSeq`), the existing-on-file replace notice.

### Guardrails (do NOT)

- Do NOT fabricate a VPA, derive one from account#+IFSC, or emit `pa=undefined` — the absent path stays first-class ([[feedback_record_unattested_no_backfill]]).
- Do NOT add the VPA to the `frozen` gate, the `claim.nominee_bank_recorded` event payload, any audit line, or any log (Tier-1 PII; pii-scrape gate). It is optional and never blocks the claim lifecycle.
- Do NOT confuse this **payee (nominee)** VPA (money IN) with the **sender (member)** VPA read by the Story 9.4 secondary matcher (observed on the bank statement). Different VPA, different column, different story.
- Do NOT reuse the ₹110-fee trust VPA (`deps.config.vyawasthaShulkVpa`) — the fee payee ≠ the contribution payee.
- Do NOT `db:generate` or regenerate any migration/snapshot (frozen at 0020; hand-author 0080). Do NOT reset via DROP SCHEMA ([[project_live_db_test_gotchas]]).
- Do NOT change `buildContributionUpiUrl`, `deriveContributionReference` (`tr`), the amount-lock, or the `tn` grammar.

### Testing standards

- Live-DB suites run on the `twt-test-pg` Docker Postgres on **:5433** (`DATABASE_URL`), own-committing writers accumulate rows → assert **membership, not counts** ([[project_live_db_test_gotchas]]). Merge gate = `pnpm ci:local` (`--concurrency=4`, 21 gates) ([[project_ci_actions_suspension_local_mirror]]). Mobile build/test are repo no-ops → RN surfaces are verified by typecheck + lint + the domain/contracts/API suites (the 8.4 posture).

### Project Structure Notes

- No new package (extend existing surfaces — [[feedback_no_premature_package]]). VPA collection lives in the **claim** namespace (`claim.json`, `nominee.bank.vpa*`, on the collection surface), NOT the `contribution` namespace (which owns `upi_intent.*` on `/pay`). The resolver seam stays in `@twt/domain` `contribution/`; the decrypt boundary stays in `apps/api` `payment/` — domain never decrypts (KMS is app-layer). Variance vs UX-DR34: the 6.8 File List already flags that `<NomineeDetailEditor>`'s documented anatomy is nominee-identity fields; the bank-account block (and now the VPA) is a net-new claim-time extension of the named component — record the same note in the Dev Agent Record.

### VPA format (new wire constant)

No VPA regex exists in the repo yet. Add `NOMINEE_BANK_VPA_REGEX` as an NPCI `handle@psp` shape — e.g. `/^[A-Za-z0-9.\-_]{2,256}@[A-Za-z][A-Za-z0-9.\-_]{1,63}$/` — declared in the contract (wire constant, IFSC precedent) and mirrored client-side. Server re-asserts before encrypt; `buildContributionUpiUrl` keeps its non-empty-only check (format is a collection-time concern, not a pay-time one).

### References

- [Source: `packages/domain/src/contribution/intent.ts:36-83`] — `accountVpa` shim + `resolveNomineeVpa` (the seam).
- [Source: `apps/api/src/modules/payment/handlers.ts:90-187`] — `intent()`, the decrypt-boundary wiring site.
- [Source: `apps/api/src/modules/claims/claims.nominee-bank.handlers.ts:108-151`] — `prepareAccount` (VPA encrypt site).
- [Source: `apps/api/src/modules/claims/nominee-bank-crypto.ts`] — `encryptNomineeBankField` / `decryptNomineeBankField` (`CLAIM_NOMINEE_BANK_FIELD_CLASS`).
- [Source: `packages/domain/src/schema/claim_nominee_bank_accounts.ts`] + `packages/domain/src/claim/nominee-bank-persist.ts` — substrate + writer.
- [Source: `packages/contracts/src/claims/nominee-bank.ts`] + `packages/contracts/src/contributions/upi-intent.ts` — contracts (wire-constant regex precedent + intent union).
- [Source: `apps/mobile/app/(claim)/nominee-review.tsx`] `<NomineeDetailEditor>` + `apps/mobile/app/(contribution)/pay.tsx` — surfaces.
- [Source: `packages/domain/migrations/0079_contribution-utr-attested-idempotency.sql`] — hand-authored-migration convention (frozen-at-0020, no snapshot).
- [Source: `_bmad-output/planning-artifacts/sprint-change-proposal-2026-07-21.md`] — full rationale, impact analysis, artifact amendments.
- [Source: `_bmad-output/planning-artifacts/epics.md:3077-3120`] — Story 8.13 epic body. [Source: `epics.md:270` AR-12] — Tier-1 list += nominee VPA. [Source: `prd.md:654` FR-37] — optional claim-time VPA collection.
- Memories: [[project_nominee_vpa_deferred_seam]] · [[project_nominee_bank_disbursement_channel]] · [[project_alert_primitive_substrate]] · [[project_live_db_test_gotchas]] · [[project_ci_actions_suspension_local_mirror]].

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (Claude Opus 4.8), bmad-dev-story workflow.

### Debug Log References

- Migration 0080 applied to the live test DB (`twt-test-pg` on :5433); `\d claim_nominee_bank_accounts` confirms `vpa_ciphertext text` nullable.
- Full gate reconciled green locally (GitHub Actions still suspended — [[project_ci_actions_suspension_local_mirror]]): repo-wide `turbo run typecheck` (20/20), `turbo run lint` (20/20), `turbo run test --concurrency=4` with `DATABASE_URL` on :5433 (35/35), and `pnpm i18n:check` green.
- One integration-test correction during dev: a malformed VPA is rejected at the Fastify Zod-schema layer (`request.validation`, nested under `body.error.code`), NOT by `prepareAccount`'s server-side re-assertion — the contract's `NOMINEE_BANK_VPA_REGEX` is the real wire gate; the handler re-assertion is defense-in-depth (unreachable via the normal route).

### Completion Notes List

- **Task 1 (substrate):** hand-authored `0080_claim-nominee-bank-vpa.sql` (nullable `vpa_ciphertext`, no `db:generate`, no snapshot, no new GRANT) + journal entry idx 80 (`when` = 0079 + 86_400_000). Added `vpaCiphertext: piiColumn(1,'claim_nominee_bank')('vpa_ciphertext')` (no `.notNull()`); `ClaimNomineeBankAccountRow.vpaCiphertext: string | null` is automatic via `$inferSelect`, and `getClaimNomineeBankAccountsCiphertext` (a `select()`) returns it unchanged.
- **Task 2 (contract + writer):** `NOMINEE_BANK_VPA_REGEX` (`handle@psp`, IFSC wire-constant precedent) + optional `vpa` on `NomineeBankAccountEntry` + non-PII `vpaPresent` on `NomineeBankAccountView`; `vpaCiphertext: string | null` threaded through `NomineeBankAccountInput` → the insert mapping (0-or-2 invariant + latest-wins untouched); `prepareAccount` re-asserts + encrypts an optional VPA via the EXISTING `encryptNomineeBankField` (same `CLAIM_NOMINEE_BANK_FIELD_CLASS`), null when absent (never encrypt an empty string), and both presence views carry `vpaPresent`.
- **Task 3 (resolver wiring — load-bearing):** `intent()` now DECRYPTS each account's `vpaCiphertext` via `decryptNomineeBankField` (its FIRST caller in the repo) and feeds augmented `{ ...row, vpa }` rows to `resolveNomineeVpa`. Both accounts decrypt in **parallel** (`Promise.all`) per the `<1s p95` perf guardrail. `intent.ts` left untouched (BigDev decision 2 — loose `accountVpa` shim + `intent.test.ts` stay the frozen oracle). Defensive `?? null` normalizes a missing ciphertext (the mocked unit-test rows) so decrypt is skipped, never called on `undefined`. No VPA plaintext reaches any audit line/event payload (the `available:true` response body VPA is the intended confirmation-UI payee, not a leak).
- **Task 4 (switch-account, in scope per decision 1):** required `canSwitchAccount: boolean` on `ContributionIntentAvailable` — computed as a second `resolveNomineeVpa` on the OTHER rank (`true` iff it also resolves a VPA; `account_not_found`/`vpa_not_collected` → `false`, never a silent substitution). Updated the two frozen 8.4 fixtures in `contributions.test.ts`. `pay.tsx`: added `canSwitchAccount` to the local `IntentAvailable` interface + a lean "Switch account" affordance that re-requests intent with the other `account` and only replaces `intent` on a fresh `available` response.
- **Task 5 (collection surface):** `nominee-review.tsx` `<NomineeDetailEditor>` gains `vpa` on `AccountFields`/`emptyAccount()` + an optional VPA `Input` after IFSC (help text + inline client-regex error, never gating `accountComplete`/submit; trimmed value threaded only when non-empty). New pure client helper `apps/mobile/lib/nominee-bank-vpa.ts` (`VPA_RE`, mirroring `nominee-bank-ifsc.ts`).
- **Task 6 (i18n):** `nominee.bank.vpa` / `_help` / `_invalid` added to en+hi `claim.json` (the distinct new namespace — the stale `nominee.upi` key left untouched); `upi_intent.switch_account` / `_a11y` added to en+hi `contribution.json` for the switch affordance. `pnpm i18n:check` green.
- **Task 7 (tests):** new `tests/schema/claim-nominee-bank-vpa.test.ts` (column exists / nullable / Tier-1 `piiColumn(1,'claim_nominee_bank')` annotation via `col.config.fieldConfig`); contract tests for the VPA regex + optional/absent/malformed entry + `vpaPresent` presence view; `payment-contribution.test.ts` extended for `canSwitchAccount` true/false; API integration round-trip (record #1-with-VPA / #2-without → `vpaPresent` true/false, `vpa_ciphertext` persisted-not-plaintext / null, **decrypt-at-intent yields the original plaintext** via the real `decryptNomineeBankField` on the exact stored ciphertext, no plaintext in response/event/audit, malformed VPA → 400 `request.validation`). Existing view fixtures across contracts + both API specs updated for the required `vpaPresent`; the two domain `NomineeBankAccountInput` fixtures carry `vpaCiphertext: null`. `intent.test.ts` left intact (input types not tightened).
- **UX-DR34 variance (recorded per the 6.8 precedent):** `<NomineeDetailEditor>`'s documented anatomy is nominee-identity fields; the bank-account block — and now the per-account optional VPA — is a net-new claim-time extension of the named component, consistent with the variance the 6.8 File List already flagged.
- **Consumer note:** the intent-endpoint end-to-end (assigned-live-pool → `available:true`) stays verified via the `payment-contribution.test.ts` unit test with the REAL handler + mocked domain (the established 8.2/8.3/8.4 "8.4 posture" — no API-level assigned-pool harness exists); the never-before-called decrypt is de-risked end-to-end by the live-DB round-trip test.

### File List

**Added**
- `packages/domain/migrations/0080_claim-nominee-bank-vpa.sql`
- `packages/domain/tests/schema/claim-nominee-bank-vpa.test.ts`
- `apps/mobile/lib/nominee-bank-vpa.ts`
- `apps/mobile/tests/unit/nominee-bank-vpa.test.ts` (review pass — the `IFSC_RE` drift-pinning precedent, pins `VPA_RE.source` against `@twt/contracts`'s `NOMINEE_BANK_VPA_REGEX`)

**Modified**
- `packages/domain/migrations/meta/_journal.json`
- `packages/domain/src/schema/claim_nominee_bank_accounts.ts`
- `packages/domain/src/claim/nominee-bank-persist.ts`
- `packages/contracts/src/claims/nominee-bank.ts`
- `packages/contracts/src/contributions/upi-intent.ts`
- `apps/api/src/modules/claims/claims.nominee-bank.handlers.ts`
- `apps/api/src/modules/payment/handlers.ts`
- `apps/mobile/app/(contribution)/pay.tsx`
- `apps/mobile/app/(claim)/nominee-review.tsx`
- `packages/i18n/locales/en/claim.json`
- `packages/i18n/locales/hi/claim.json`
- `packages/i18n/locales/en/contribution.json`
- `packages/i18n/locales/hi/contribution.json`
- `packages/contracts/tests/contributions.test.ts`
- `packages/contracts/tests/claims-nominee-bank.test.ts`
- `apps/api/tests/unit/payment-contribution.test.ts`
- `apps/api/tests/integration/claims/nominee-bank.spec.ts`
- `apps/api/tests/integration/claims/nominee-bank-helpline.spec.ts`
- `packages/domain/tests/integration/claim/nominee-bank.spec.ts`
- `packages/domain/tests/integration/claim/nominee-bank-concurrency.spec.ts`

### Change Log

| Date | Change |
| --- | --- |
| 2026-07-21 | Story 8.13 implemented — nominee-VPA claim-time collection (migration 0080 + optional Tier-1 `vpa_ciphertext`), resolver decrypt-at-intent wiring (discharges Story 8.4 D1's deferred seam), FR-27 switch-account affordance (`canSwitchAccount`), collection surface + i18n (en/hi), and full test coverage. All gates green locally (typecheck/lint/test 35/35 with :5433 DB, i18n:check). Status → review. |
| 2026-07-22 | Code review (Blind Hunter + Edge Case Hunter + Acceptance Auditor): 12 patches applied — VPA decrypt failures now degrade to fail-soft `vpa_not_collected` instead of 500ing (`payment/handlers.ts`); the decrypted plaintext no longer travels alongside a live ciphertext in the same row object; `pay.tsx`'s `onSwitchAccount` now surfaces errors/unavailable responses, resets stale per-account launch state on a successful switch, routes an `attested` race to the yellow pill, disables the primary Pay action while switching, and announces switch-in-progress to screen readers (2 new i18n keys, en+hi); `pay.tsx` imports `ContributionIntentAvailable`/`ContributionIntentResponse` from `@twt/contracts` instead of a hand-duplicated type; the wire `vpa` field now `.trim()`s before validation; added the `VPA_RE`/`NOMINEE_BANK_VPA_REGEX` drift-pinning test pair (`nominee-bank-ifsc.ts` precedent); `nominee-review.tsx` now blocks submit on a non-blank-but-invalid VPA (BigDev decision); added 2 unit tests proving the handler's decrypt-in-handler wiring actually runs (previously untested — AC5/Task 7 gap) including the new decrypt-failure fail-soft path. 2 items deferred (payment→claims crypto-helper cross-module import; VPA loss on nominee-bank re-submission under the endpoint's pre-existing latest-wins semantics) — see `deferred-work.md`. Re-verified: `apps/api`/`apps/mobile`/`packages/contracts` typecheck + lint clean, `pnpm i18n:check` + `pnpm microcopy:check` green, all touched unit suites green (apps/api 195/195, apps/mobile 41/41, packages/contracts 447/447). Status → done. |

---

### Settled decisions (BigDev, 2026-07-21) — all three forks locked, no dev discretion

1. **Switch-account UI (AC3 / Task 4): IN SCOPE for this story.** Build the `canSwitchAccount` contract field + the `pay.tsx` switch affordance here — not a fast-follow. The resolver already supports `preferredAccount`/`account_not_found`; the UI is the remaining piece and it ships in 8.13.
2. **Resolver input typing (Task 3): keep the current default.** Leave 8.4's loose `accountVpa` shim untouched and feed it decrypted rows. Do **not** re-type `resolveNomineeVpa`'s input — the existing `intent.test.ts` fixtures stay the frozen oracle.
3. **`vpaPresent` on the presence view (Task 2): keep it.** `NomineeBankAccountView` carries the non-PII `vpaPresent` boolean so `<NomineeDetailEditor>` and the pay-screen switch see VPA presence without decrypting.
