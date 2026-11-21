---
baseline_commit: 0bb128df
---

<!--
PINNED: `0bb128df` = the tip of `governance/registration-change-2026-11-21` (2026-11-21), which sits on `origin/main` `90535934` and
carries this row, the epics.md Story 3.15 block and author-commit `2026-11-21-482`. Authored in its OWN worktree
`/Users/dev/Developer/projects/TWT/.claude/worktrees/3-15-assisted-signup-field-worker-code`, branch
`story/3-15-assisted-signup-field-worker-code` (upstream UNSET — push with an explicit refspec, [[project_story_branch_upstream_is_main]]).
⚠ This branch STACKS on the governance branch: it lands only after `governance/registration-change-2026-11-21` has landed on `main`
(rebase onto `origin/main` then). Every `apps/` / `packages/` claim was traced by hand at `90535934` (the governance branch changes ⛔ code).
Re-locate by FUNCTION, ⛔ by line number. "The pin is an ancestor of HEAD" is durable; "the code claims were re-derived" is perishable —
Task 0.1 re-derives them ([[feedback_story_validate_footguns]] #24).

§0 GATE (the routing template's, applied FIRST):
  · HOW a code is captured, WHERE the question sits in the wizard, WHAT the route returns, THAT the payment step stops taking a code —
    the AUTHOR's (DL1–DL13, BigDev at Task 0.2).
  · WHAT A MEMBER IS TOLD when they type the code of a worker who is suspended or ended — the Panel's (it discloses a third person's
    status — inherited verbatim from Story 13.8's block, C2). PQ1, ONE non-blocking question, added to the field-worker drafts note
    (unsent) at Task 0.3; built on the silent side.
  · WHETHER and HOW MUCH the worker is credited — ⛔ this story: the credit rules are ruled (`-454` Q6 C, `-465` Q1 B, FR-85 / `-441`)
    and are applied by Story 13.5 from the stored capture. This story records the capture those rules read.
  ⚠ CORRECTION of the author's own record: author-commit `2026-11-21-482` decision 4, the epics.md Story 3.15 block and the sprint row
  say "⛔ Panel question" and list FR-85 / `-454` Q6 C as applied here. Both are wrong: PQ1 IS a Panel question (Story 13.8 C2), and
  credit is ⛔ classified at capture. Task 0.4's entry amends `-482` decision 4 by name; the block and row get dated lines.
-->

# Story 3.15: "Have You Been Assisted?" — A Field Worker's Code at Signup

Status: ready-for-dev

## Story

As a **person signing up whom a field worker helped**,
I want **the app to ask whether someone helped me, and to take the 6-digit code they gave me**,
so that **the worker who helped me can be credited — without it changing anything about my own membership.**

## The rulings and records this story builds on

| Source | What it says (verbatim where it binds) | Status |
|---|---|---|
| `2026-11-21-482` decision 4 | *"Signup asks whether someone helped; Yes takes the field worker's 6-digit code, resolved to the worker (Story 13.2's door; FR-85; `-454` Q6 C held credit). It never blocks a signup. 13.8 keeps the member-invite deep link and adopter chain."* — ⚠ the credit clause is corrected here (§0). | author-commit |
| BigDev, 2026-11-21 | *"when self registeration a form should ask have you been assisted ? If yes enter the code shared. In which field worker shared code will be entered."* | session |
| epics.md Story 13.8, C2 / C4 (inherited) | *"INSERT the capture, then `resolveAttributionForRequest(request, scopeTx, { code, asOf: { captureId: <the new row's attributionId> } })` in the same `ScopeTx` — ONLY for a 6-digit code"* · *"A not-credited code must ⛔ block or delay a signup. Whether and how a member is told is a PANEL question this story raises (it discloses a third person's status — template §0); a known-but-not-credited code must ⛔ reuse Story 3.6's unknown-code rejection copy … send nothing, or neutral wording. Policy meaning for the member: "who introduced you never changes what you are covered for.""* | inherited (13.8 block, NARROWED 2026-11-21 to this story for 6-digit codes) |
| `2026-11-07-454` Q6 C | *"under review — held, and credited if cleared; at the worker's own request — not credited."* | **Trustee-ratified** — applied by 13.5, ⛔ here |
| `2026-11-17-465` Q1 B | *"Held, and credited if the ending is undone — by mistake or on appeal."* | **Trustee-ratified** — applied by 13.5 |
| `2026-11-03-441` Q2 A / 13.1 QE11 | `acceptsNewAttributions` = `active` only | **Trustee-confirmed** — applied by 13.5 |
| epics.md Story 3.6b AC | *"the member can paste a 6-digit Reference Code; the code is validated against Epic 13's field-worker allocation registry; unknown codes are rejected with "Please ask your introducer for the correct code or skip if you don't have one"; skipping is permitted"* — built as a raw capture with ⛔ validation (D2 port seam); this story moves it out of payment and validates it. | spec |
| PRD FR-1 consequence (edited 2026-11-21) / FR-82 | *"Signup asks "Did someone help you register?" — Yes takes a 6-digit field-worker code (Story 3.15)…"* · FR-82: *"Accepts: 6-digit numeric (field worker), member username/eHRMS (adopter), empty (organic). Parsed and stored as `attribution_source`."* | PRD |

## 📜 Policy meaning (AI-10-1)

**This story introduces ⛔ predicate that gates a member's access to a benefit, and changes none.** In the member's terms: *"Telling us
who helped you sign up — or not telling us — never changes your membership or what your family is covered for."* Checked against the
Niyamavali: ⛔ clause makes membership or eligibility depend on an introducer (§2.1's four conditions are registration, KYC, the fee and
admission) — ⛔ conflict. The capture feeds only the field worker's credit (Story 13.5), which is the worker's, ⛔ the member's.

## ⭐ THE INVARIANTS

- **N1 — It never blocks or delays a signup.** "No", a skipped step, a timeout, an unknown code, a server error — every path lets the
  member continue to the next step.
- **N2 — The member learns nothing about the worker.** ⛔ name, ⛔ number, ⛔ status. A known code is accepted the same way whatever the
  worker's state (PQ1 built silent); only a code nobody holds is refused.
- **N3 — One capture per member, made while signing up.** `member_attribution` keeps `UNIQUE(member_id)`; captures only in `pending-kyc`
  / `pending-fee`; a recorded code is ⛔ changed by this story.
- **N4 — Credit is ⛔ decided here.** The capture is stored verbatim with its DB `captured_at`; 13.5 derives the holder and the worker's
  state AT that capture (`resolveAttribution({ captureId })` + `getFieldWorkerStateAt({ captureId })`). ⛔ a stored worker id, ⛔ a
  stored "credited" flag.
- **N5 — The Pariwar comes from the member's session, ⛔ the body.** Through 13.2's API door only.
- **N6 — ONE writer of `member_attribution`.** After this story the payment step writes ⛔ capture.

## Found facts (traced at `90535934`)

- **F1 — The table.** `member_attribution` (`packages/domain/src/schema/member_attribution.ts`; migration `0027_vyawastha-shulk-receipts.sql`):
  `attribution_id` (uuid PK), `member_id` (FK `members`, cascade), `pariwar_id`, `attribution_source` (text, verbatim, *"NO field-worker
  FK, NO registry validation (D2)"*), `captured_at` (`defaultNow()` — the TRANSACTION start). `UNIQUE(member_id)`
  (`member_attribution_member_uq`). RLS tenant-isolated + FORCE; `GRANT SELECT, INSERT` only (⛔ UPDATE, ⛔ DELETE). ⇒ ⛔ migration needed.
- **F2 — The writer.** `insertMemberAttribution(db, { memberId, pariwarId, attributionSource })` in `packages/domain/src/payment/attribution-write.ts`
  (exported through the `payment` domain namespace).
- **F3 — Today's capture, in the payment step.** `apps/api/src/modules/vyawastha-shulk/handlers.ts` (signup confirm, tx-1): after the
  receipt, `if (body.referenceCode !== undefined)` → `SAVEPOINT attr_capture` → `insertMemberAttribution` → any error rolled back to the
  savepoint and SUPPRESSED (AR-67: the receipt always commits); after commit, audit `member_attribution.captured`. Contract
  `VyawasthaShulkConfirmRequest.referenceCode` = optional `^\d{6}$` (`packages/contracts/src/payments/vyawastha-shulk.ts`; the renewal
  confirm reuses the schema and ignores it). Mobile: `apps/mobile/app/(signup)/payment.tsx` (`referenceCode` state, the input, i18n
  `payment.reference_code_label` / `payment.reference_code_help` in `packages/i18n/locales/{en,hi}/common.json`). Tests:
  `apps/api/tests/integration/vyawastha-shulk/vyawastha-shulk.spec.ts` (*"Reference Code (AC4)"*, a 6-digit code → a row; omitted → none;
  `'12ab'` → 400), `packages/domain/tests/integration/payment/vyawastha-shulk.spec.ts`.
- **F4 — The door.** `apps/api/src/modules/field-worker/attribution-code-access.ts` `resolveAttributionForRequest(request, scopeTx, {
  code, asOf })` → `FieldWorkerId | null`. Pariwar from `request.requestContext.pariwarId` (set by the member-session guard), asserted
  equal to `scopeTx.pariwarId`; `asOf: { captureId }` joins the capture's `captured_at` IN SQL (⛔ read it into JS). Throws
  `InvalidAttributionCodeError` (format, ⛔ statement sent) and `AttributionCaptureMismatchError` — both re-exported BY NAME from the door
  for `instanceof`. `null` = the code is held by nobody in the Pariwar, or was allocated only after the capture.
- **F5 — The reach fence.** `apps/api/tests/unit/attribution-code-reach-fence.test.ts`: a file under `apps/api/src` that IMPORTS THE DOOR
  is a sanctioned caller (⛔ an ALLOWED entry); naming `attributionCode`, importing `@twt/domain`'s `attributionCode` namespace, or naming
  the registry table / schema / domain functions is REACH and fails. The door's exports are pinned to eleven — ⛔ add one. The fence lives
  in the `apps/api` UNIT suite ([[project_source_fence_lives_in_api_unit_suite]]).
- **F6 — Credit is derivable later.** `fieldWorker.acceptsNewAttributions(state)` (`packages/domain/src/field-worker/state.ts`, `active`
  only) and `getFieldWorkerStateAt(db, pariwarId, fieldWorkerId, { captureId })` (`field-worker/read.ts` — the worker's state AT the
  capture, in SQL, with the transaction-start clock caveat (8)) exist for Story 13.5's backfill. ⇒ storing the code + `captured_at` is
  ALL 13.5 needs (N4).
- **F7 — Codes exist only for approved workers, per Pariwar.** Allocated at approval (13.1a); a code from another Pariwar resolves to
  `null` in this one. Signup always joins the configured default Pariwar (`defaultSignupPariwarId`).
- **F8 — The wizard.** `apps/mobile/lib/wizard-steps.ts` `WIZARD_STEPS = ['tc', 'kyc', 'workplace', 'nominees', 'medical', 'whatsapp',
  'payment']` (pinned by `apps/mobile/tests/unit/workplace.test.ts`); `(signup)/tc.tsx` advances with the literal
  `router.replace('/(signup)/kyc')`; `(signup)/_layout.tsx` derives "Step N of M". Typed routes: `.expo/types/router.d.ts` is absent in
  a fresh worktree ⇒ regenerate before trusting `tsc` ([[project_mobile_typed_routes_worktree]]). ⚠ Pre-existing, ⛔ fixed here: ⛔
  route sends a returning member back into the wizard (`(auth)/otp.tsx` routes a signed-in member to `/(tabs)`), so the step is asked
  on the first pass only.
- **F9 — Models.** Member routes: `apps/api/src/modules/terms/member-terms.routes.ts` (`requireMemberSession`, `/api/v1/member/...`);
  per-member rate limit: `apps/api/src/modules/member-language/routes.ts` (`perMemberKey`, `hook: 'preHandler'` —
  [[project_rate_limit_prehandler_hook_order]]). Mobile optional step: `apps/mobile/app/(signup)/whatsapp.tsx` (a bounded status read
  that skips the step, refs against double taps, `withTimeout`, `AnnouncedText`, `useAnnounceOnChange`, every failure continues).
- **F10 — Audit, export, erasure.** `apps/api/src/audit/audit-sink.ts` already has `member_attribution.captured` (no PII). The data export
  already carries `attribution` (`packages/domain/src/data-export/assemble.ts`); RTBF keeps it (`member/anonymize.ts` — governance history).
- **F11 — Copy and gates.** Words in `packages/i18n/locales/{en,hi}/common.json` (the `common` namespace is registered; parity gate
  `packages/i18n/scripts/check-parity.ts`). The microcopy gate (`microcopy.yaml` `scope.code_globs`) lists specific mobile files (e.g.
  `apps/mobile/app/(signup)/kyc.tsx`) — a new screen is unscanned until added.
- **F12 — Numbers.** ⛔ migration, ⛔ permission key, ⛔ roster row (PQ1 is non-blocking — built on the silent side). Decision: `-482` is
  on the governance branch, `-481` on `story/6-22b-…` ⇒ next free ≥ `-483` — RE-READ at Task 0.1 across every ref and worktree.

## Build decisions — PROPOSED (BigDev answers at Task 0.2)

- **DL1 — Two member routes**, new module `apps/api/src/modules/member-attribution/`: `GET /api/v1/member/signup/assisted-code` →
  `{ recorded: boolean }` (lets the step skip when a code is already recorded); `POST /api/v1/member/signup/assisted-code` with
  `{ code }` (`^\d{6}$`, `.strict()`) → `201 { recorded: true }`. `requireMemberSession`; the POST rate-limited per member (F9).
  Contracts in `packages/contracts/src/members/` (exported from the index); OpenAPI regenerated.
- **DL2 — The POST, in ONE scope tx, in this order:** (1) the member's state is `pending-kyc` or `pending-fee`, else 409
  `attribution.not_signing_up`; (2) read the member's existing capture — same code ⇒ 200 `{ recorded: true }` (idempotent, ⛔ new row);
  a different code ⇒ 409 `attribution.already_recorded`; (3) `insertMemberAttribution`; (4) `resolveAttributionForRequest(request,
  scopeTx, { code, asOf: { captureId: row.attributionId } })`; `null` ⇒ throw 422 `attribution.code_not_found` — the tx ROLLS BACK, ⛔
  row stored; (5) commit, THEN audit `member_attribution.captured`. A `23505` on `member_attribution_member_uq` (two taps racing) ⇒
  the tx rolls back, then re-read and answer as (2) ([[project_domain_limit_clamp_and_savepoint_retry]]: ⛔ continue a tx after 23505).
- **DL3 — The response says nothing about the worker** (N2): ⛔ id, ⛔ name, ⛔ state.
- **DL4 — A known code of a worker who is not `active`** (suspended for any reason, ended, died) is recorded and answered EXACTLY as an
  active worker's (201). Built PQ1 A; the credit consequence is 13.5's.
- **DL5 — "No" stores nothing** and calls nothing (as today: ⛔ code ⇒ ⛔ row ⇒ `organic` by absence).
- **DL6 — The payment step stops capturing** (N6): remove `referenceCode` from `VyawasthaShulkConfirmRequest`, the handler's capture
  block (savepoint + audit), the input and its state in `payment.tsx`, and the two `payment.reference_code_*` keys (en + hi); update the
  AC4 tests to prove a body with `referenceCode` is refused 400 (`.strict()`). *Considered:* keep the payment box as a second chance for a
  member who skipped — rejected: two writers of one `UNIQUE` row, and the payment savepoint would silently swallow the conflict.
  ⚠ ⛔ app is live, so ⛔ old client sends the field.
- **DL7 — The wizard:** `WIZARD_STEPS` becomes `['tc', 'assisted', 'kyc', 'workplace', 'nominees', 'medical', 'whatsapp', 'payment']`;
  `tc.tsx` routes to `/(signup)/assisted`; the new `(signup)/assisted.tsx` routes to `/(signup)/kyc`. On mount: the GET (bounded, 5 s);
  recorded, failed or hung ⇒ straight on to `kyc` (the whatsapp precedent).
- **DL8 — The screen:** the question with two equal buttons, *Yes* / *No*. Yes shows a numeric code box (6 digits, `keyboardType` number
  pad), *Continue* and *Continue without a code*. Continue ⇒ POST: 201 / 200 ⇒ a short confirmation, then on; 422 ⇒ the not-found line
  under the box (focus stays; the member may retry or continue without); 400 ⇒ the "6 digits" line; 409 / 429 / 5xx / timeout ⇒ on to
  `kyc` with ⛔ message (N1).
- **DL9 — Words (English and Hindi; approved word for word at Task 0.2; Hindi is OUR translation, ⛔ ratified):**
  - `signup.assisted.title` — *"Did someone help you register?"* / *"क्या किसी ने पंजीकरण में आपकी मदद की?"*
  - `signup.assisted.body` — *"If someone helped you sign up, you can enter the 6-digit code they gave you. It does not change your
    membership."* / *"अगर किसी ने आपको जुड़ने में मदद की है, तो आप उनका दिया हुआ 6-अंकों का कोड डाल सकते हैं। इससे आपकी सदस्यता पर
    कोई असर नहीं पड़ता।"*
  - `signup.assisted.yes` / `.no` — *"Yes"* / *"No"* · *"हाँ"* / *"नहीं"*
  - `signup.assisted.code_label` — *"6-digit code"* / *"6-अंकों का कोड"*
  - `signup.assisted.continue` — *"Continue"* / *"आगे बढ़ें"* · `signup.assisted.skip` — *"Continue without a code"* / *"बिना कोड के आगे बढ़ें"*
  - `signup.assisted.not_found` — *"Please ask the person who helped you for the correct code, or continue without one."* / *"कृपया
    जिन्होंने आपकी मदद की, उनसे सही कोड पूछें, या बिना कोड के आगे बढ़ें।"* (the 3.6b AC's meaning, in plain words)
  - `signup.assisted.format` — *"The code has 6 digits."* / *"कोड में 6 अंक होते हैं।"*
  - `signup.assisted.saved` — *"Thank you. The code is saved."* / *"धन्यवाद। कोड सहेज लिया गया है।"*
- **DL10 — ⛔ new member event, ⛔ schema change, ⛔ permission key.** The member event vocabulary is untouched (the schema comment: *"NO
  `member.reference_code.captured` lifecycle event is minted"*); the existing audit action is reused.
- **DL11 — Credit is ⛔ classified here** (N4) — 13.5 reads the capture. ⛔ `acceptsNewAttributions` call in this story.
- **DL12 — Records:** `deferred-work.md` — 13.8 C2 / C4 DISCHARGED for 6-digit codes at signup (the adopter-username widening stays
  13.8's); C5 (the silence warning, `-454` Q4 A) annotated *"the record of which teachers a worker brings in now exists (3.15); the
  warning and its period are still unbuilt and unruled — owner unchanged"*; a new observed line: ⛔ route back into the signup wizard
  for a returning member (F8). epics.md: dated lines on 3.6b (*"the payment step's Reference Code moved to Story 3.15 (DL6)"*), 3.15
  (the §0 correction) and 13.8.
- **DL13 — Not in scope:** member usernames / eHRMS as codes (13.8); a field-worker draft's automatic code (13.9 — it must use THIS
  route's writer, ⛔ a second); showing the worker anything; commission (13.5); the silence warning; changing or removing a recorded code;
  a second chance after the wizard (F8).

## Panel question — PROPOSED (non-blocking; added to the UNSENT field-worker drafts note at Task 0.3)

- **PQ1 — When a person types the code of a field worker who is suspended or has been ended, is the person told?**
  - **A (our suggestion):** ⛔ — the code is accepted like any other; whether the worker is credited follows your credit rulings
    (held while under review or ended; ⛔ credited at the worker's own request). *Cost:* the person cannot know the code may earn nothing.
  - **B:** the app says *"This code can't be used right now"* and lets them continue. *Cost:* it tells a member that a named worker's code
    is not working — a disclosure about the worker — and may make them doubt the person who helped them.
  - *Built:* A. ⛔ gate on go-live (A is the safe side).

## Acceptance Criteria

1. **AC1 (Task 0 — governance FIRST).** Before any `apps/` / `packages/` change: Task 0.1 recorded; Task 0.2 answers recorded verbatim;
   PQ1 added to the unsent drafts note (committed alone); the author-commit entry (amending `-482` decision 4) committed ALONE; the
   sprint row `in-progress`. ([[feedback_governance_commits_precede_implementation]])
2. **AC2 (DL1, DL2, DL3).** Live-DB API tests on the POST: a held code ⇒ 201, one row with `attribution_source` = the code; the body
   carries ⛔ worker field (a schema test: the response is exactly `{ recorded: true }`); the same code again ⇒ 200, still one row; a
   different code after one is recorded ⇒ 409 `attribution.already_recorded`, the row unchanged; a code nobody holds ⇒ 422
   `attribution.code_not_found` and ⛔ row (with a passing control beside it — [[feedback_assertion_after_savepoint_rollback_is_vacuous]]);
   `'12ab'` / 5 digits / extra key ⇒ 400; a member in `lock-in` ⇒ 409 `attribution.not_signing_up`; ⛔ member session ⇒ 401; two
   concurrent POSTs ⇒ one row, both answered (201 + 200, or 200 + 200).
3. **AC3 (N5, F4).** A code allocated in ANOTHER Pariwar ⇒ 422 (the door's Pariwar is the session's); a code allocated AFTER the capture
   instant cannot credit (13.2's AT4 (c) — a test with an allocation stamped after `captured_at` ⇒ 422); the GET returns `recorded` for
   the session's member only.
4. **AC4 (DL4, N2).** For each worker state — `active`, suspended `under_review`, suspended `at_worker_request`, `terminated` — the POST
   answers byte-identically (status + body); a test asserts the four responses are equal.
5. **AC5 (DL6, N6).** `referenceCode` is gone from `VyawasthaShulkConfirmRequest`; a confirm carrying it ⇒ 400; the confirm handler
   writes ⛔ `member_attribution` row (grep-test: `insertMemberAttribution` is called from exactly one `apps/api/src` file — the new
   module); `payment.tsx` has ⛔ code input; the two keys are removed in en AND hi (parity green). OpenAPI regenerated (compare with
   anchors resolved — [[project_openapi_yaml_anchor_renumbering]]).
6. **AC6 (DL7, DL8, N1) — mobile vitest.** `WIZARD_STEPS` updated (and `workplace.test.ts`'s pin); the step: renders both buttons; No ⇒
   `kyc` with ⛔ request; Yes + 6 digits + Continue ⇒ one POST (a double tap makes ONE), then `kyc`; 422 ⇒ the not-found line and the
   member can still continue without; 409 / 429 / 500 / timeout ⇒ `kyc`, ⛔ message; GET `recorded: true` ⇒ straight to `kyc`; a hung
   GET ⇒ `kyc` after the bound. ⚠ [[project_tanstack_instant_mock_hides_notready_flip]] / [[project_jsdom_disabled_button_keeps_focus]].
7. **AC7 (DL9).** Every string comes from `common.json` (⛔ inline literals), en + hi, the Task-0.2-approved text; the new screen is added to
   `microcopy.yaml` `scope.code_globs` and the gate is green ON it ([[feedback_gate_scope_semantic_coverage]]); the typed routes are
   regenerated and `tsc` checks the two new `router.replace` literals (F8).
8. **AC8 (F5).** The attribution reach fence is green with ⛔ edit to its ALLOWED list (the new module imports the door only); the door's
   export pin is unchanged.
9. **AC9 (records).** DL12 written; `pnpm ci:local` green on a FRESH container with `DATABASE_URL` pointing at it
   ([[project_prepush_hook_inherits_5432]], [[project_known_livedb_test_failures]]).

## Tasks / Subtasks

- [ ] **Task 0 — Governance FIRST (AC1).** ⛔ No `apps/` / `packages/` file before 0.4 is committed.
  - [ ] 0.1 `git fetch origin`; confirm `merge-base --is-ancestor 0bb128df HEAD`; `git diff --name-only 90535934..origin/main -- apps
        packages` and re-read every F-fact whose file moved. Has the governance branch landed? (If yes, rebase onto `origin/main`.) Re-read
        the next free decision id and the ledger letter across EVERY ref and worktree (`git branch -a`, `git worktree list`, the working
        copies) — ⛔ HEAD only. Check rows `13-8`, `13-9`, `13-5` for any start that touches `member_attribution`.
  - [ ] 0.2 Put DL1–DL13 to BigDev (the question dialog; recommended first), with DL6 (removing the payment box) and DL9 (the words, en +
        hi) as separate questions. Record the answers verbatim here.
  - [ ] 0.3 Add PQ1 as Q4 to `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-11-21-registration-field-worker-drafts.md`
        (on `governance/registration-change-2026-11-21`, ⛔ SENT — if it has been sent by now, write a short separate note instead);
        template order; commit it ALONE.
  - [ ] 0.4 Author-commit entry (`<date>-<next>`): DL1–DL13 as answered, the §0 split, PQ1 open + built side, and AMENDING `-482`
        decision 4 by name (PQ1 is a Panel question; credit is ⛔ classified at capture); committed ALONE. ⚠ If refused, ask once
        ([[project_decision_log_writes_user_inserted]]).
  - [ ] 0.5 Dated lines: the `3-15` sprint row comment (*"⛔ Panel question"* corrected), epics.md 3.15 / 3.6b / 13.8 (DL12).
  - [ ] 0.6 Sprint row `3-15-…` `ready-for-dev → in-progress` (map only; one ledger entry at the end — [[project_sprint_status_safe_prepend]]).
- [ ] **Task 1 — Contracts (AC2, AC5).** `packages/contracts/src/members/`: `MemberAssistedCodeRequest` (`{ code }`, `^\d{6}$`, strict),
      `MemberAssistedCodeResponse` (`{ recorded: true }`, strict), `MemberAssistedCodeStatusResponse` (`{ recorded: boolean }`); the error
      codes; export from the index. Remove `referenceCode` from `VyawasthaShulkConfirmRequest`. Fixture / contract tests outside `tsc`
      ([[project_contracts_tests_outside_tsc]]).
- [ ] **Task 2 — API (AC2, AC3, AC4, AC8).**
  - [ ] 2.1 `apps/api/src/modules/member-attribution/` (routes, handlers, index): DL2's order; `openScopeTx` / `closeScopeTx`; import
        `resolveAttributionForRequest` FROM THE DOOR (⛔ `@twt/domain`'s `attributionCode`); `insertMemberAttribution` via the `payment`
        domain namespace; the member state through the existing member read (`getCurrentMemberState`); audit after commit. Register in
        `server.ts`.
  - [ ] 2.2 Remove the capture block from `vyawastha-shulk/handlers.ts`' signup confirm (DL6) — keep AR-67's "the receipt always commits".
  - [ ] 2.3 Integration tests (own container, DB named `twt_dev`): AC2–AC4; update the 3.6b AC4 tests (now: `referenceCode` ⇒ 400). Seed
        field workers + codes with `packages/domain/tests/integration/attribution-code/_fixtures.ts` (read it first).
  - [ ] 2.4 Run the reach fence and the whole `apps/api` unit suite (AC8).
- [ ] **Task 3 — Mobile (AC6, AC7).** `lib/wizard-steps.ts`; `(signup)/tc.tsx` target; `(signup)/assisted.tsx` (the whatsapp model, F9);
      `lib/member-api.ts` (or the api-client) GET + POST; remove the box from `payment.tsx`; `common.json` en + hi (DL9) and the removed
      keys; `microcopy.yaml`; vitest. Regenerate typed routes (`CI=1 npx expo start --port <free>` until `.expo/types/router.d.ts`
      exists). ⚠ [[project_tamagui_button_text_one_line]] for the two buttons; [[project_uset_fresh_closure_memo_trap]] (⛔ `t` in deps).
- [ ] **Task 4 — Gates (AC9).** i18n parity; microcopy; OpenAPI emit; `pnpm ci:local` on a fresh container.
- [ ] **Task 5 — Records.** DL12; story Dev Agent Record, File List, Change Log; sprint row → `review`; ONE ledger entry (safe prepend,
      YAML parses, row count holds).

## Dev Notes

### Traps

1. **⛔ Import `attributionCode` from `@twt/domain` in `apps/api`.** The reach fence fails it. Import `resolveAttributionForRequest` (and,
   if needed, `InvalidAttributionCodeError`) from `../field-worker/attribution-code-access.js`.
2. **⛔ Read `captured_at` into JS, ⛔ resolve with `'now'`.** The capture instant is NAMED (`{ captureId }`) so allocation-after-capture is
   decided in SQL at microsecond precision (13.2 AT4 (c)).
3. **The unknown-code path must leave ⛔ row.** Throw inside the scope tx so `closeScopeTx` rolls back; assert the absence WITH a control.
4. **23505 aborts the transaction.** ⛔ catch it and keep going in the same tx — roll back, then re-read in a fresh one.
5. **⛔ Different answers by worker state** (AC4). The handler must not branch on the worker at all — it only checks `null`.
6. **The payment handler's savepoint swallowed errors.** Removing the block must not change AR-67 (the receipt commits whatever happens).
7. **Typed routes in a worktree are blind** until regenerated (F8).
8. **Hand-format; Prettier is ⛔ enforced** ([[project_prettier_not_enforced]]). Devanagari is typed as characters; scan added lines for
   invisible characters ([[project_unicode_escapes_written_raw]]).
9. **Every `git push` needs `DATABASE_URL=<your container>`** ([[project_prepush_hook_inherits_5432]]).

### What this story does ⛔ do
It does not credit or pay anyone, tell the member anything about the worker, accept member usernames as codes, change a recorded code,
build the silence warning, or let a returning member back into the wizard.

### Project Structure Notes
- New: `apps/api/src/modules/member-attribution/{routes,handlers,index}.ts`, `apps/mobile/app/(signup)/assisted.tsx`, contracts in
  `packages/contracts/src/members/`, tests beside each.
- Updated: `apps/api/src/server.ts`, `apps/api/src/modules/vyawastha-shulk/handlers.ts`, `packages/contracts/src/payments/vyawastha-shulk.ts`,
  `apps/mobile/lib/wizard-steps.ts`, `apps/mobile/app/(signup)/{tc,payment}.tsx`, `apps/mobile/lib/member-api.ts`,
  `packages/i18n/locales/{en,hi}/common.json`, `microcopy.yaml`, `apps/mobile/tests/unit/workplace.test.ts`, the two vyawastha-shulk specs,
  the OpenAPI output.

### Testing
Unit (contracts, api with `DATABASE_URL` UNSET), live-DB (api, own container, `twt_dev`), mobile vitest. Every "nothing written"
assertion has a passing control beside it. A domain red hides the other packages — re-run the whole job
([[project_known_livedb_test_failures]]).

### References
- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-11-21-registration.md` · `.decision-log.md` `-482`, `-454` Q6, `-465` Q1,
  `-441` · epics.md Stories 3.6b, 3.15, 13.2, 13.5, 13.8 · Story 13.2's file (`13-2-6-digit-attribution-code-generation-per-pariwar.md`) —
  the door and the fence · `deferred-work.md` 13.1c C5.

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List
- Ultimate context engine analysis completed - comprehensive developer guide created (create-story, 2026-11-21, at `90535934` via `0bb128df`).

### File List

## Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-21 | Created by `bmad-create-story 3.15` in its own worktree, stacked on `governance/registration-change-2026-11-21` (`0bb128df`). §0 applied: PQ1 (is the member told about a worker's status) is the Panel's, inherited from 13.8 C2 — correcting `-482` decision 4's "⛔ Panel question"; credit left to 13.5 (N4); ⛔ migration. DL1–DL13 PROPOSED. ⛔ Code. |
