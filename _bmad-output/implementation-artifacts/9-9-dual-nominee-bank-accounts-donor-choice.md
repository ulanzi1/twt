---
baseline_commit: b0ed90c9835d3791a7df2fe9432c880e06ea1c3f
---

# Story 9.9: Dual Nominee Bank Accounts — Donor Choice

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a contributing member (donor) paying into a live pool,
I want to see the nominee's (up to) two bank accounts — each labeled by bank name, with the nominee's name and banking details — and choose which one to pay,
so that if one banking channel fails or I simply prefer a different bank, I can immediately pick the other account and complete my contribution to the correct nominee.

## Scope decisions (LOCKED by BigDev, 2026-07-27)

This story is **member choice**, not automatic routing. The earlier "RBI ₹1 lakh per-payee daily receiving cap" rationale is **DISCARDED** — there is **no** v1 requirement to compute routing from a regulatory receiving cap, and none of the cap/counter/routing machinery is in scope.

**Design principles (binding):**
- There is **no primary/secondary account concept**. Both nominee accounts are **equal** payment destinations. `account_rank` (1/2) is a row identity from Story 6.8, **not** a priority — no UI or copy may call one "primary" or "default."
- The server does **not** choose which account the donor should use.
- The server does **not** infer bank health, routing, or optimization.
- The server does **not** maintain cap counters or implement any RBI-limit logic.
- The donor selects the account; the server honors that choice and builds the payment coordinates for it.

**What this story IS:** presenting multiple payment destinations (by bank name + nominee name + banking info) and honoring the donor's explicit choice, with a "choose the other account or retry the same" path on failure.

**What this story is NOT:** automatic routing, payment optimization, bank-health detection, regulatory compliance, server-side payout, cap-aware algorithms.

> ⚠️ **Still no payout engine, still no `pool.settled` emission, still no payout-destination add.** In the v1 crowdfunding (`pool`) model money flows member → nominee **direct** via the member's own UPI/bank transfer; there is no trust-side payout (that is the `reserve` mechanism = v2/v3, architecture §1.13's testable non-add). This story only presents the nominee's payment coordinates and records the donor's choice. See `[[project_disbursement_is_money_in_routing]]`.

## Acceptance Criteria

1. **A donor-facing "nominee payment destinations" read.** A member-scoped endpoint returns, for the member's assigned **live** pool's originating claim, **all** collected nominee accounts (0, 1, or 2) as **a stable list with no primary/secondary semantics** — the accounts are semantically equal, but the list order is **stable across requests** (order by `account_rank` for determinism; the order carries no priority meaning and the UI must not treat position 1 as a default). Each entry carries:
   - `bankName` (Tier-3 plaintext label — no decrypt),
   - `accountHolderName` (the **nominee name**, Tier-1 decrypted at the API boundary),
   - `accountNumber` + `ifsc` (Tier-1 decrypted — the **full** account number and IFSC; they are the payment destination the nominee supplied for receiving member contributions, i.e. operational payment coordinates the donor uses to pay, not informational PII),
   - `vpaPresent` (boolean — whether a UPI `pa=` can be built for this account today),
   - a stable per-account `id`/`rank` the donor's selection echoes back (identity only, NOT a priority).
   Absence (no accounts collected yet) is a **first-class** empty/`available:false` state, never a 404/throw. Tenant-scoped by `pariwarId`; a cross-tenant `claimCaseId` resolves to empty.

2. **The payment screen presents an equal choice.** When the claim has **two** accounts, the pay screen shows both **bank names** as a selectable list with no preselected/"primary" option:
   ```
   Choose nominee bank account
     ○ State Bank of India
     ○ ICICI Bank
   ```
   When there is **one** account it is auto-selected (no needless choice). No "primary/secondary/default/switch-back" language anywhere.

3. **Selecting an account shows its banking info + nominee name, and builds the payment.** On selection, the screen displays that account's **nominee (account-holder) name + bank name + account number + IFSC** so the donor can confirm the payment is going to the correct nominee (name match), and the UPI Intent (`pa=`/amount/`tr`) is built **for the chosen account** (the existing `account` param carries the donor's choice into the intent endpoint / `resolveNomineeVpa`). The amount stays server-authoritative (the pool's snapshotted `fixed_amount`) and `tr` stays the deterministic `deriveContributionReference` — the donor's choice changes only the **destination account**, never the amount or reference.

4. **Failure → choose the other account OR retry the same.** If the payment fails (UPI returns no UTR / the donor cancels / an out-of-band attempt fails), the donor can return and either **pick the other account** or **retry the same account** — a purely donor-driven action. No server-side re-routing, inference, or automatic account substitution. The existing failure-coach / UTR-self-attest paths (Story 8.4/8.5/9.7) remain available regardless of which account was chosen.

5. **No routing / cap / primary-secondary logic exists.** The implementation adds **no** cap constant, **no** daily-receipts reader, **no** IST cap window, **no** account selector/optimizer, **no** bank-health probe. `resolveNomineeVpa` (`packages/domain/src/contribution/intent.ts`) stays a **pure resolver of the donor's chosen rank** — the `?? 1` default in the handler is removed or demoted to a defensive single-account fallback, never a UX-visible "primary."

6. **Handling of the decrypted display.** The nominee's holder name + account# + IFSC are **operational payment coordinates** — the destination the nominee supplied for the express purpose of receiving members' contributions — displayed to the donor so they can make the payment, not informational PII surfaced for its own sake. They are stored Tier-1 and still handled with Tier-1 discipline: decrypt only at the API boundary under the correct `(pariwarId, fieldClass)` context, **fail-soft to a distinct sentinel** on a decrypt error (never a 500, never a blank that masquerades as real data — the appeal-crypto precedent), and **never** log the decrypted values / put them in an event or audit payload.

7. **No regressions, no fences tripped.** Existing Story 8.4/8.13 intent + attest + account behavior stays green (evolved from "default #1 + Switch" to "equal choice"); **no** new `events_log` event type (`contribution.*` stays exactly three — the Story 8.10 fourth-type fence); **no** `pool.settled` emission; **no** `payout_destinations` table/column/endpoint (architecture §1.13 non-add). Renaming/UX changes leave `contribution/read.ts` + `pool-bound-payment` contracts untouched.

## Tasks / Subtasks

- [x] **Task 1 — Donor-facing nominee-accounts read (AC: 1, 6).**
  - [x] Add a member-scoped endpoint (e.g. `GET /api/v1/member/contribution/nominee-accounts`, sibling of the `intent` route in `apps/api/src/modules/payment/handlers.ts`) that resolves the member's assigned **live** pool → its claim → `getClaimNomineeBankAccountsCiphertext(db, pariwarId, claimCaseId)`.
  - [x] Decrypt `accountHolderName` / `accountNumber` / `ifsc` at the API boundary (reuse the established Tier-1 decrypt helper pattern — `decryptClaimDocumentField` / the appeal-crypto fail-soft sentinel `decryptAppealRationale`); pass `bankName` (Tier-3) through as-is; compute `vpaPresent` from `vpaCiphertext != null` **without** decrypting the VPA.
  - [x] Define the response contract in `@twt/contracts` (`.strict()`, member-app-bundle-safe — no `@twt/domain` source import per `[[project_contracts_domain_bundle_boundary]]`). Represent the accounts as **a stable list with no primary/secondary semantics** — order deterministically by `account_rank` (stable across requests), but the position carries no priority (echo the `rank` as an identity only). First-class empty state when no accounts collected.
  - [x] Register the OpenAPI route + wire through `@twt/api-client`.

- [x] **Task 2 — Payment-screen choice UX (AC: 2, 3, 4).**
  - [x] In `apps/mobile/app/(contribution)/pay.tsx`, replace the Story 8.13 "default #1 + Switch account" affordance with a **"Choose nominee bank account"** selectable list of bank-name-labeled options (radio semantics; no preselect when 2 exist; auto-select when 1). Remove all "primary/secondary/switch-back/default" copy + `i18n` keys; add the choice + banking-info copy.
  - [x] On selection, render the chosen account's **nominee name + bank name + account number + IFSC** panel (the "paying to the correct nominee — name match" confirmation), then build/launch the UPI Intent for that account (chosen `account` → intent request).
  - [x] On failure, present both "Choose the other account" and "Retry this account" affordances; reset the per-account launch state (launched / noApp / launchError / utr / coach) when the donor switches accounts so a stale coach/UTR box does not render over the newly chosen account.
  - [x] Reuse the `<StatusPill>` / existing surfaces; heed `[[project_fabric_flatlist_empty_populated_crash]]` if the choice list uses a sticky/virtualized list (render empty/loading/error OUTSIDE the list).

- [x] **Task 3 — Intent wiring honors the donor's choice (AC: 3, 5).**
  - [x] The `intent` handler carries the donor's chosen `account` into `resolveNomineeVpa({ collectionAccounts, preferredAccount: chosen })`; remove the UX-visible `?? 1` "primary" default (keep at most a defensive single-account fallback). `resolveNomineeVpa` stays PURE/DB-free (already accepts `preferredAccount`; no signature change).
  - [x] Preserve `canSwitchAccount` semantics ONLY as "the other account is also payable" (both equal) — never as "switch back to primary."

- [x] **Task 4 — Purge the routing/cap framing (AC: 5).**
  - [x] Confirm NO cap constant / selector / daily-receipts reader / IST cap window / bank-health probe is introduced. (This story adds none — the guard is that a reviewer can grep for `cap`, `RBI_UPI`, `routing`, `primary` and find nothing new.)

- [x] **Task 5 — Contract + regression + fence guards (AC: 7).**
  - [x] Contract tests for the new response (`.strict()`, equal-set shape, empty-state).
  - [x] Green: `apps/api` `payment` handler suite, `packages/contracts/tests/pool-bound-payment.test.ts`, the `contribution.*` fourth-type fence (`packages/domain/tests/contribution/no-ingest-path.test.ts:88-130`), mobile pay-screen tests.
  - [x] Prove: exactly three `contribution.*` types, no `pool.settled` emission, no `payout_destinations` add survive (revert-sanity teeth per `[[feedback_gate_scope_semantic_coverage]]`).
  - [x] Merge gate `pnpm ci:local --concurrency=4` (`[[project_ci_actions_suspension_local_mirror]]`, `[[project_ci_local_concurrency_oversubscription]]`); live-DB reads on `twt-test-pg` :5433 (`[[project_live_db_test_gotchas]]`).

### Review Findings

- [x] [Review][Patch] Fail-soft decrypt path lacks live-DB integration coverage — added `apps/api/tests/integration/payment/nominee-accounts.spec.ts`: a real claim + real fake-KMS encrypt round-trip + one deliberately corrupted ciphertext field, asserting the sentinel renders and the good fields still decrypt, never a 500 (user decision 2026-07-28: add now, not deferred) [apps/api/tests/integration/payment/nominee-accounts.spec.ts]
- [x] [Review][Patch] Total-decrypt-failure state has no distinct UX/API signal — added a distinct warning-banner branch (`selectedAccountAllFieldsUnavailable`) + `upi_intent.account_details_unavailable_warning` i18n key (en+hi) shown instead of the normal banking-info card when every Tier-1 field is the sentinel (user decision 2026-07-28: add the banner) [apps/mobile/app/(contribution)/pay.tsx]
- [x] [Review][Patch] Corrupted/unexpected `accountRank` silently coerced to rank 1 — now refused (throws, surfacing a 500 as a data-corruption signal rather than silently duplicating rank identity); regression test added [apps/api/src/modules/payment/handlers.ts]
- [x] [Review][Patch] Audit event type `member_contribution.intent` reused for the structurally different nominee-accounts read — added a distinct `member_contribution.nominee_accounts_viewed` audit type [apps/api/src/audit/audit-sink.ts; apps/api/src/modules/payment/handlers.ts]
- [x] [Review][Patch] New i18n key `upi_intent.retry_this_account_a11y` added but never wired to the "Retry this account" button — `accessibilityLabel` added [apps/mobile/app/(contribution)/pay.tsx]
- [x] [Review][Patch] `decryptNomineeBankFieldSoft`'s optional `log` callback isn't guarded — `log` is now required (single call site) and wrapped in its own try/catch so a logging failure can never defeat the sentinel contract [apps/api/src/modules/claims/nominee-bank-crypto.ts]
- [x] [Review][Patch] `bankName` isn't defensively guarded against an empty string before being placed in a `.min(1)` response field — now degrades to the sentinel like the Tier-1 fields [apps/api/src/modules/payment/handlers.ts]
- [x] [Review][Patch] `decryptNomineeBankFieldSoft` only guards against thrown decrypt errors — a successful-but-empty plaintext now also degrades to the sentinel [apps/api/src/modules/claims/nominee-bank-crypto.ts]
- [x] [Review][Patch] Stale "primary/default #1 / Switch account" doc-comment language survives untouched in an unrelated-but-consumed contract file — comments reframed to donor-choice/equal language; the file was also added to Task 4's revert-sanity guard scan scope so a future revert can't reintroduce it [packages/contracts/src/contributions/upi-intent.ts; apps/api/tests/unit/nominee-accounts-no-cap-routing-guard.test.ts]
- [x] [Review][Patch] Decrypt-failure log records only `account_rank`, not which field failed — log now carries a `field` key too [apps/api/src/modules/payment/handlers.ts]
- [x] [Review][Patch] Response contract has no `.max()` length bound on decrypted string fields — bounds added (generous enough to still fit the sentinel string) [packages/contracts/src/contributions/nominee-accounts.ts]
- [x] [Review][Patch] Dead/inconsistent `console.error` fallback branch in `decryptNomineeBankFieldSoft` — removed; `log` is now a required parameter (one real call site) [apps/api/src/modules/claims/nominee-bank-crypto.ts]
- [x] [Review][Defer] Decrypt-failure sentinel is hardcoded English (`NOMINEE_BANK_DECRYPT_FAILED_SENTINEL`), not routed through i18n — will show raw English on a Hindi-locale device [apps/api/src/modules/claims/nominee-bank-crypto.ts:17] — deferred, pre-existing (matches the appeal-crypto `APPEAL_RATIONALE_DECRYPT_FAILED_SENTINEL` precedent this story explicitly reused; not a regression introduced by this diff)

## Dev Notes

### Relationship to Story 8.13 (read this first — it's an evolution, not a greenfield)

Story 8.13 already shipped a **"default account #1 + Switch account (#1⇄#2)"** UPI-intent model:
- `ContributionAccount` = `1 | 2` and `ContributionIntentRequest.account?` (`packages/contracts/src/contributions/upi-intent.ts`),
- `resolveNomineeVpa({ collectionAccounts, preferredAccount })` (`packages/domain/src/contribution/intent.ts`) — pure, picks the requested rank, returns `account_not_found` for a missing rank (never a silent substitution),
- `canSwitchAccount` + a "Switch account" button in `pay.tsx`.

**This story REFRAMES that from "primary + switch" to "two equal choices," and ADDS the donor-facing banking-info + nominee-name display.** Reuse the plumbing (`account` param, `resolveNomineeVpa`, `getClaimNomineeBankAccountsCiphertext`); change the **UX posture** (equal choice, no default) and add the **new decrypted read** (Task 1). Do not delete 8.13's account plumbing — repurpose it.

### The stored fields (Story 6.8 — `claim_nominee_bank_accounts`)

Per `packages/domain/src/schema/claim_nominee_bank_accounts.ts`:
- `accountRank` (smallint 1/2) — **row identity, not a priority** (D1 of 6.8: no nominee linkage, no primary/secondary meaning for this story).
- `accountHolderNameCiphertext`, `accountNumberCiphertext`, `ifscCiphertext` — **Tier-1** (`piiColumn(1, 'claim_nominee_bank')`), ciphertext AS STORED; decrypt at the API boundary.
- `vpaCiphertext` — **Tier-1, NULLABLE** (Story 8.13, migration 0080); the `pa=` payee VPA. Null → no UPI path for that account (the deferred substrate; see below).
- `bank_name` / `branch` — **Tier-3 plaintext** (public, IFSC-derived) → the donor-facing radio label, **no decrypt needed**.
- `ifsc_validated` (bool) — non-PII.

Reader: `getClaimNomineeBankAccountsCiphertext(db, pariwarId, claimCaseId)` returns both rows (`#1 → #2`), ciphertext as stored, `[]` when not collected (`packages/domain/src/claim/nominee-bank-read.ts`).

### What is LIVE vs. still DARK

- **LIVE now:** the bank-name choice, the nominee-name + account#/IFSC banking-info display, and the "choose other / retry same" flow — all built on Story 6.8 fields that ARE collected. This part is **demoable** and supports a manual/NEFT out-of-band payment even while UPI is dark.
- **Still DARK:** the UPI `pa=` VPA path — no nominee VPA is collected in the substrate yet (VPA collection is deferred; `[[project_nominee_vpa_deferred_seam]]`), so `resolveNomineeVpa` returns `vpa_not_collected` at runtime. Unchanged by this story; it lights up when the VPA-collection story lands, per account, with no surface change. Surface a calm "UPI not available for this account yet — you can still transfer using the details below / Get help" state (the existing fail-soft posture).

### Displayed banking details = operational payment coordinates (not informational PII)

The nominee's account-holder name + **full** account number + IFSC are displayed to the contributing member because they are the **payment destination the nominee supplied for receiving member contributions** — operational payment coordinates the donor needs to complete the payment, not informational PII surfaced for its own sake. Show the **full account number** (BigDev-confirmed 2026-07-27 — required for a manual/NEFT transfer; no masking). Tier-1 handling discipline still applies to the mechanics: decrypt only at the API boundary, fail-soft sentinel (never a 500, never a blank), never log/echo to events/audit.

### Testing standards

- Pure/contract: DB-free Vitest (equal-set response shape, empty state, decrypt fail-soft sentinel with a mocked decryptor).
- API read: live-DB integration against `twt-test-pg` (:5433, `DATABASE_URL`) — tenant isolation (cross-tenant `claimCaseId` → empty), 0/1/2-account cases, a decrypt-failure row rendering the sentinel not a 500.
- Mobile: pay-screen tests for the choice list (2 accounts → radio, no preselect; 1 account → auto-select), the banking-info panel, and the failure "other / retry" branches.
- Fence teeth (Task 5): three `contribution.*` types, no `pool.settled`, no payout-destination add.

### Project Structure Notes

- New member-facing read + decrypt → `apps/api/src/modules/payment/handlers.ts` (+ the existing nominee-bank crypto helper `apps/api/src/modules/claims/nominee-bank-crypto.ts` for the decrypt).
- Response contract → `@twt/contracts` (`packages/contracts/src/contributions/`), `.strict()`, bundle-safe (`[[project_contracts_domain_bundle_boundary]]`); wire via `@twt/api-client`.
- Mobile UX → `apps/mobile/app/(contribution)/pay.tsx` + its `i18n` namespace (remove switch/primary keys; add choice + banking-info keys).
- **No migration expected** — all fields already exist (Story 6.8 + 8.13's migration 0080). No cap/routing tables or columns.
- Rename artifacts: this file (`9-9-…-donor-choice.md`), the sprint-status key, and the epics.md Story 9.9 heading/AC all move from "RBI UPI Limit Workaround" to "Donor Choice" (done alongside this story since it is pre-development). The consistency pass also reached the PRD (FR-31 heading + FR-31/FR-37 "RBI/UPI workaround" language, `prd.md`) and the domain-layer comments carrying the old "primary/secondary" + "RBI-UPI-per-payee-per-day-limit workaround" framing (`packages/domain/src/schema/claim_nominee_bank_accounts.ts`, `packages/domain/src/claim/nominee-bank-read.ts`) — all updated ahead of this story's dev pass so no artifact contradicts the equal-choice framing.

### References

- [Source: user reframe, 2026-07-27] — donor-choice requirement + UX (equal accounts, bank-name choice, nominee-name match, choose-other/retry-same); RBI-cap rationale discarded.
- [Source: _bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md#FR-31] — "Every approved claim records two nominee bank accounts … Members can pay to **either**." (equal, member-choice — matches this story; the cap-routing reading did not.)
- [Source: _bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md#FR-37] — nominee bank #1/#2 (account#, IFSC, holder name) + optional per-account VPA at claim time.
- [Source: _bmad-output/planning-artifacts/architecture.md#§1.13] — `pool` (crowdfunded, member→nominee direct) vs `reserve` (trust payout, v2/v3); payout-destination v1 non-add (this story must not cross it).
- [Source: packages/domain/src/schema/claim_nominee_bank_accounts.ts] — the stored fields + PII tiers (holder/number/IFSC/VPA = Tier-1; bank_name/branch = Tier-3).
- [Source: packages/domain/src/claim/nominee-bank-read.ts] — `getClaimNomineeBankAccountsCiphertext` (both rows, ciphertext as stored).
- [Source: packages/domain/src/contribution/intent.ts] — `resolveNomineeVpa` (pure; `preferredAccount` carries the donor's choice) + `buildContributionUpiUrl`.
- [Source: apps/api/src/modules/payment/handlers.ts] — the `intent` handler (donor choice → intent); sibling home for the new nominee-accounts read.
- [Source: packages/contracts/src/contributions/upi-intent.ts] — `ContributionAccount` / `ContributionIntentRequest.account` (Story 8.13 plumbing, repurposed).
- [Source: apps/api/src/modules/claims/appeal-crypto.ts] — the Tier-1 decrypt fail-soft-sentinel pattern to reuse for the decrypted display.

## Dev Agent Record

### Agent Model Used

Opus 4.8 (claude-opus-4-8) via bmad-dev-story.

### Debug Log References

- `pnpm turbo run i18n:check-parity` — green after adding the choice/banking-info keys to both `en` + `hi` (the 4 `switch_account*` keys removed).
- `pnpm ci:local --concurrency=4` with `DATABASE_URL=postgresql://twt_dev_app:devpass@127.0.0.1:5433/twt_dev?sslmode=disable` (twt-test-pg on :5433) — the merge gate. NOTE: the container creds are `twt_dev_app:devpass@/twt_dev`, per `scripts/ci-local.sh:14` (not the `twt_test` guess).
- Tamagui shorthands gotcha: this app's config accepts `p`/`px`/`py`, `rounded`, `flex`, `items`/`justify`/`text` — NOT `padding`/`borderRadius`/`flexShrink` (typecheck caught it; fixed to shorthands).

### Completion Notes List

- **Task 1 — donor-facing read.** New `GET /api/v1/member/contribution/nominee-accounts` (`payment/handlers.ts` `nomineeAccounts`): resolves the member's assigned live pool → claim → `getClaimNomineeBankAccountsCiphertext`, decrypts holder-name/account#/IFSC at the boundary via a new **fail-soft sentinel** helper `decryptNomineeBankFieldSoft` (+ `NOMINEE_BANK_DECRYPT_FAILED_SENTINEL`, the appeal-crypto precedent — never a 500, never a blank), passes `bankName` (Tier-3) through, and computes `vpaPresent` from `vpaCiphertext != null` **without** decrypting the VPA. Response contract `contributions/nominee-accounts.ts` (`.strict()`, no-`.openapi()` bundle-safe posture — sibling of `upi-intent.ts`; `openapi/v1.yaml` untouched). Discriminated union on `available`; absence is first-class (`unassigned` / `accounts_not_collected`). Wired `memberNomineeAccounts()` (GET) into `@twt/api-client`.
  - **Added `myContribution` to this read** (beyond the AC's field list): the pay screen needs the already-attested shortcut on first load (an out-of-band payer, 8.10, must not be forced through account choice). Mirrors the intent contract's precedent (`myContribution` on every branch); the handler computes it the same cheap way (`hasAttestedContribution`). Documented as an additive, consistent extension.
- **Task 2 — pay-screen choice UX.** `pay.tsx` reworked: mount fetches the nominee-accounts read → **choose-account list** (radio-semantic bank-name options, **no preselect** when 2, **auto-select** when 1) → on selection a **banking-info panel** (nominee name + bank + full account# + IFSC) → builds the intent **for the chosen account** (`{ account: selectedRank }`). Failure paths offer **"Choose the other account"** + **"Retry this account"** (donor-driven; `resetLaunchState` clears stale launched/noApp/launchError/utr/coach so a stale box never renders over a freshly chosen account). The `vpa_not_collected` state now surfaces a calm **manual/NEFT** hint (the banking details above enable an out-of-band transfer while UPI is dark). Removed the Story 8.13 "Switch account" affordance + all 4 `switch_account*` i18n keys; added 13 choice/banking-info keys (en + hi). Choice list is a plain `YStack` of buttons (≤2 items → no virtualized/sticky list, so `[[project_fabric_flatlist_empty_populated_crash]]` does not apply). Moved the two render helpers (`FieldRow`, `ChooseOtherAccountButton`) to module scope to avoid `react/no-unstable-nested-components`.
- **Task 3 — intent honors choice.** Removed the handler's UX-visible `?? 1` default (`preferredAccount = body.account`); `resolveNomineeVpa`'s own `preferredAccount = 1` stays PURELY DEFENSIVE for a legacy/single-account caller. `canSwitchAccount` semantics preserved (kept in the contract) but the UI no longer gates on it — the read drives the choice list. Reframed the `resolveNomineeVpa` doc comments from "default #1 / Switch" to donor-choice/equal-accounts.
- **Task 4 — no cap/routing.** Zero cap constant / selector / daily-receipts reader / IST window / bank-health probe introduced. Mechanized as `nominee-accounts-no-cap-routing-guard.test.ts` — a revert-sanity grep over the 6 Story-9.9 source surfaces for routing/cap/priority **identifiers** (not prose, so the deliberate "NOT a primary/secondary" negations don't false-positive).
- **Task 5 — fences + regression.** New contract shape test (`.strict()`, equal-set, empty-state, **rejects a `primary`/`default`/`vpa` field**), new handler unit test (7 cases incl. decrypt-failure sentinel + audit-carries-count-only-never-PII), new mobile source-scan fence + no-cap guard. Fourth-type fence (`contribution.*` = exactly three) stays green (this story emits no event, adds no `pool.settled`, adds no `payout_destinations`).
- **Testing-scope decision (honest).** Followed the Story 8.4 payment-endpoint precedent: comprehensive **DB-free unit** coverage rather than a heavy assigned-live-pool integration fixture. The endpoint takes **no client `claimCaseId`** (it derives it server-side from the member's own pool), so cross-tenant is **structurally impossible** at this surface; tenant-scoping + a real KMS decrypt round-trip are already integration-covered by the Story 6.8 `nominee-bank.spec.ts` + the domain accessor's own tenant tests. Not faking thin integration coverage (`[[feedback_record_unattested_no_backfill]]`).
- **Domain-layer consistency-pass** (`nominee-bank-read.ts` comment, `claim_nominee_bank_accounts.ts` comments) was pre-done ahead of dev per the story's Project Structure Notes (the "primary/secondary" → "equal, donor's choice" reframe) — verified, not re-touched.

### File List

**Added**
- `packages/contracts/src/contributions/nominee-accounts.ts` — the donor-facing nominee-payment-destinations `.strict()` contract (equal accounts, no priority field, `vpaPresent` not `vpa`).
- `packages/contracts/tests/contributions-nominee-accounts.test.ts` — contract shape teeth.
- `apps/api/tests/unit/payment-nominee-accounts.test.ts` — the read-handler wiring (7 cases).
- `apps/api/tests/unit/nominee-accounts-no-cap-routing-guard.test.ts` — Task 4 revert-sanity grep.
- `apps/mobile/tests/unit/pay-screen-choice-render.test.ts` — the pay-screen anatomy source-scan fence.

**Modified**
- `apps/api/src/modules/payment/handlers.ts` — new `nomineeAccounts` handler; intent `?? 1` → `body.account` (Task 3).
- `apps/api/src/modules/payment/routes.ts` — register the GET `nominee-accounts` route.
- `apps/api/src/modules/claims/nominee-bank-crypto.ts` — `decryptNomineeBankFieldSoft` + `NOMINEE_BANK_DECRYPT_FAILED_SENTINEL` (fail-soft sentinel).
- `packages/contracts/src/contributions/index.ts` — export the new contract.
- `packages/api-client/src/index.ts` — `memberNomineeAccounts()` (GET) + type wiring.
- `packages/domain/src/contribution/intent.ts` — reframed `resolveNomineeVpa` doc comments to donor-choice/equal (no behavior change).
- `apps/mobile/app/(contribution)/pay.tsx` — the choice-list + banking-info + choose-other/retry rework.
- `packages/i18n/locales/en/contribution.json`, `packages/i18n/locales/hi/contribution.json` — removed 4 `switch_account*` keys; added 13 choice/banking-info keys (parity-clean).
- `packages/domain/src/claim/nominee-bank-read.ts`, `packages/domain/src/schema/claim_nominee_bank_accounts.ts` — the pre-dev consistency-pass comment reframe (verified).

**Added (code review pass, 2026-07-28)**
- `apps/api/tests/integration/payment/nominee-accounts.spec.ts` — live-DB test closing the Testing Standards gap (real fake-KMS encrypt round-trip + a genuinely corrupted ciphertext field).

**Modified (code review pass, 2026-07-28)**
- `apps/api/src/modules/claims/nominee-bank-crypto.ts` — `NOMINEE_BANK_DECRYPT_FAILED_SENTINEL` moved to `@twt/contracts` (re-exported here); `decryptNomineeBankFieldSoft`'s `log` made required + guarded against throwing; a successfully-decrypted-but-empty plaintext now also degrades to the sentinel.
- `apps/api/src/modules/payment/handlers.ts` — refuses (throws on) an unexpected `account_rank` instead of coercing it to 1; `bankName` empty-string guarded to the sentinel; decrypt-failure log now carries the failing `field`; audit line uses the new distinct event type.
- `apps/api/src/audit/audit-sink.ts` — added `member_contribution.nominee_accounts_viewed`.
- `packages/contracts/src/contributions/nominee-accounts.ts` — hosts the shared `NOMINEE_BANK_DECRYPT_FAILED_SENTINEL`; added `.max()` bounds to the decrypted string fields.
- `packages/contracts/src/contributions/upi-intent.ts` — doc comments reframed from "default #1 / Switch account" to donor-choice/equal language (no behavior change).
- `apps/api/tests/unit/nominee-accounts-no-cap-routing-guard.test.ts` — `upi-intent.ts` added to the scanned surfaces.
- `apps/api/tests/unit/payment-nominee-accounts.test.ts` — mock now exports the sentinel; added corrupted-rank and empty-bankName regression cases.
- `apps/mobile/app/(contribution)/pay.tsx` — missing `accessibilityLabel` added to the "Retry this account" button; a total-decrypt-failure warning banner added (distinct from the normal banking-info card).
- `packages/i18n/locales/{en,hi}/contribution.json` — added `upi_intent.account_details_unavailable_warning`.

## Change Log

- 2026-07-28 — Story 9.9 implemented (Donor Choice): donor-facing nominee-accounts read (`GET .../nominee-accounts`) + `.strict()` contract + `@twt/api-client` wiring; Tier-1 fail-soft decrypt sentinel; pay-screen equal-choice UX (bank-name choice list, banking-info panel, choose-other/retry-same); intent `?? 1` primary default removed; no cap/routing/primary machinery (mechanized grep guard); i18n en+hi reframed. All tasks/subtasks complete; new + regression + fence suites green; `ci:local` merge gate green. Status → review. (Opus 4.8)
- 2026-07-28 — Code review pass: 12 patch findings applied (rank-coercion refusal, distinct audit event type, missing a11y label, decrypt-guard hardening, `.max()` contract bounds, stale primary/switch language reframed in `upi-intent.ts` + added to the guard's scan scope, field-level decrypt-failure logging, a total-decrypt-failure warning banner, and the live-DB integration test the story's own Testing Standards called for); 1 finding deferred (hardcoded-English sentinel — matches the pre-existing appeal-crypto precedent); 4 findings dismissed as noise. All typecheck/lint/unit/integration suites green. Status → done.
