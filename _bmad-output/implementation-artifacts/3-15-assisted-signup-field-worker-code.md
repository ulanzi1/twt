---
baseline_commit: 99922af1
---

<!--
PINNED: `99922af1` = `origin/main` on 2026-11-22, after `governance/registration-change-2026-11-21` LANDED by fast-forward (PR #336,
`aa17300a..47b656d6`; then ledger `2026-11-22n`). `main` now carries this row, the epics.md Story 3.15 block, author-commit
`2026-11-21-482` and the two unsent registration Panel notes. Authored in its OWN worktree
`/Users/dev/Developer/projects/TWT/.claude/worktrees/3-15-assisted-signup-field-worker-code`, branch
`story/3-15-assisted-signup-field-worker-code` (upstream UNSET — push with an explicit refspec, [[project_story_branch_upstream_is_main]]).
The branch sits directly on `99922af1` (merge-base = that tip) and lands on its own — ⛔ stacked on anything. Every `apps/` / `packages/`
claim was traced by hand at `90535934` and RE-TRACED at `99922af1` (code that moved in between: marketplace work, plus
`data-export/assemble.ts` and `member/anonymize.ts` with ⛔ attribution change). Re-locate by FUNCTION, ⛔ by line number. "The pin is an
ancestor of HEAD" is durable; "the code claims were re-derived" is perishable — Task 0.1 re-derives them
([[feedback_story_validate_footguns]] #24).

§0 GATE (the routing template's, applied FIRST):
  · HOW a code is captured, WHERE the question sits in the wizard, WHAT the route returns, THAT the payment step stops taking a code —
    the AUTHOR's (DL1–DL13, BigDev at Task 0.2).
  · WHAT A MEMBER IS TOLD when they type the code of a worker who is suspended or ended — the Panel's (it discloses a third person's
    status — inherited verbatim from Story 13.8's block, C2). PQ1 — ✅ RULED A by the Panel (DR and KB), Decision `2026-11-22-493`:
    the person is ⛔ told; asked directly, ⛔ through a note.
  · WHETHER and HOW MUCH the worker is credited — ⛔ this story: the credit rules are ruled (`-454` Q6 C, `-465` Q1 B, FR-85 / `-441`)
    and are applied by Story 13.5 from the stored capture. This story records the capture those rules read. ⚠ The inherited 13.8 C2
    says *"FR-85 is applied HERE"*; this story MOVES that check to 13.5 (DL11) — recorded at every site that names it (DL12), ⛔ "discharged".
  · WHO supplies the Panel-ruled worker count (`-459` Q2 A, `deferred-work.md` 13.1d C4) now that this story wires the resolution — the
    AUTHOR's (DL14): the ruling is made; only where it is built was open — ✅ ANSWERED A by BigDev 2026-11-22 (*"DL14 A"*): Story 13.5.
  ⚠ CORRECTION of the author's own record: author-commit `2026-11-21-482` decision 4, the epics.md Story 3.15 block and the sprint row
  say "⛔ Panel question" and list FR-85 / `-454` Q6 C as applied here. Both are wrong: PQ1 IS a Panel question (Story 13.8 C2), and
  credit is ⛔ classified at capture. Task 0.4's entry amends `-482` decision 4 by name; the block and row get dated lines.
-->

# Story 3.15: "Have You Been Assisted?" — A Field Worker's Code at Signup

Status: review

## Story

As a **person signing up whom a field worker helped**,
I want **the app to ask whether someone helped me, and to take the 6-digit code they gave me**,
so that **the worker who helped me can be credited — without it changing anything about my own membership.**

## The rulings and records this story builds on

| Source | What it says (verbatim where it binds) | Status |
|---|---|---|
| `2026-11-21-482` decision 4 | *"Signup asks whether someone helped; Yes takes the field worker's 6-digit code, resolved to the worker (Story 13.2's door; FR-85; `-454` Q6 C held credit). It never blocks a signup. 13.8 keeps the member-invite deep link and adopter chain."* — ⚠ the credit clause is corrected here (§0). | author-commit |
| BigDev, 2026-11-21 | *"when self registeration a form should ask have you been assisted ? If yes enter the code shared. In which field worker shared code will be entered."* | session |
| epics.md Story 13.8, C2 / C4 (inherited) | *"INSERT the capture, then `resolveAttributionForRequest(request, scopeTx, { code, asOf: { captureId: <the new row's attributionId> } })` in the same `ScopeTx` — ONLY for a 6-digit code"* · *"apply FR-85's deactivated-code rejection from 13.1's lifecycle state (⛔ in the lookup)"* · 13.1's C2: *"**FR-85 is applied HERE, from 13.1's state.** Call `fieldWorker.acceptsNewAttributions(state)` … on the worker `resolveAttributionForRequest` returned … When resolving a STORED capture (13.5's backfill), ask `getFieldWorkerStateAt(db, pariwarId, id, { captureId })`"* — ⚠ this story MOVES the FR-85 check to 13.5 (DL11, DL12) · *"A not-credited code must ⛔ block or delay a signup. Whether and how a member is told is a PANEL question this story raises (it discloses a third person's status — template §0); a known-but-not-credited code must ⛔ reuse Story 3.6's unknown-code rejection copy … send nothing, or neutral wording. Policy meaning for the member: "who introduced you never changes what you are covered for.""* | inherited (13.8 block, NARROWED 2026-11-21 to this story for 6-digit codes) |
| `2026-11-07-454` Q6 C | *"under review — held, and credited if cleared; at the worker's own request — not credited."* | **Trustee-ratified** — applied by 13.5, ⛔ here |
| `2026-11-17-465` Q1 B | *"Held, and credited if the ending is undone — by mistake or on appeal."* | **Trustee-ratified** — applied by 13.5 |
| `2026-11-03-441` Q2 A / 13.1 QE11 | `acceptsNewAttributions` = `active` only | **Trustee-confirmed** — applied by 13.5 |
| `2026-11-08-459` Q2 A (WIDENED) / `deferred-work.md` 13.1d C4 | The District Admin at the other end of a move request sees *"other details like work history with organization, number of member onboarded, etc."* · C4: *"When 13.8 wires that resolution, it also supplies a count read (by worker, inside one Pariwar; a number, never a member's name) for 13.1d's request read."* | **Trustee-ratified** — where it is built: DL14 |
| PRD FR-85 (+ annotations `-454`, `-465`) | *"Field worker can be deactivated; existing attributions preserved; new attributions on deactivated code rejected."* · *"The credit recorder (Stories 13.8 / 13.5) builds the held credit."* | PRD — "rejected" is applied as ⛔ credited, by 13.5 (13.8 C2: a not-credited code ⛔ blocks a signup) |
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
  worker's state (PQ1 RULED A, `-493`); only a code nobody holds is refused.
- **N3 — One capture per member, made while signing up.** `member_attribution` keeps `UNIQUE(member_id)`; captures only in `pending-kyc`
  / `pending-fee`; a recorded code is ⛔ changed by this story.
- **N4 — Credit is ⛔ decided here.** The capture is stored verbatim with its DB `captured_at`; 13.5 derives the holder and the worker's
  state AT that capture (`resolveAttribution({ captureId })` + `getFieldWorkerStateAt({ captureId })`). ⛔ a stored worker id, ⛔ a
  stored "credited" flag.
- **N5 — The Pariwar comes from the member's session, ⛔ the body.** Through 13.2's API door only.
- **N6 — ONE writer of `member_attribution`.** After this story the payment step writes ⛔ capture.

## Found facts (traced at `90535934`, re-traced at `99922af1`)

- **F1 — The table.** `member_attribution` (`packages/domain/src/schema/member_attribution.ts`; migration `0027_vyawastha-shulk-receipts.sql`):
  `attribution_id` (uuid PK), `member_id` (FK `members`, cascade), `pariwar_id`, `attribution_source` (text, verbatim, *"NO field-worker
  FK, NO registry validation (D2)"*), `captured_at` (`defaultNow()` — the TRANSACTION start). `UNIQUE(member_id)`
  (`member_attribution_member_uq`). RLS tenant-isolated + FORCE; `GRANT SELECT, INSERT` only (⛔ UPDATE, ⛔ DELETE). ⇒ ⛔ migration needed.
- **F2 — The writer.** `insertMemberAttribution(db, { memberId, pariwarId, attributionSource })` in `packages/domain/src/payment/attribution-write.ts`
  (exported through the `payment` domain namespace). It is the ONLY accessor: ⛔ read of `member_attribution` by member exists (DL2 adds
  one). Its header, the schema header (`schema/member_attribution.ts`: *"STILL unvalidated … Story 13.8 wires the lookup into signup"*)
  and the contract's `referenceCode` doc comment describe the 3.6b seam — they go stale with this story (Task 2.1).
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
- **F7 — Codes are allocated at REGISTRATION, per Pariwar** *(dated line 2026-11-23, review R5 / P8 h: unique per Pariwar only — "a code from another Pariwar resolves to `null` in this one" holds when its digits are not also held here)*. `apps/api/src/modules/field-worker/handlers.ts` (the register handler)
  runs `registerFieldWorker` THEN `allocateAttributionCodeForRequest` on the SAME transaction (I11) — so a `pending_kyc` worker (never
  approved) already HOLDS a code that resolves, and so does a worker ended from `pending_kyc`. The worker can READ their code only after
  approval (13.1a's code route / 13.1b's SMS). One permanent code per worker, ⛔ freed or reused (migration 0199, append-only). A code from
  another Pariwar resolves to `null` in this one. Signup always joins the configured default Pariwar (`defaultSignupPariwarId`).
  `allocated_at` is stamped by a `BEFORE INSERT` trigger (DB clock) — a `twt_app` insert can ⛔ set it (AC3's test, Task 2.3).
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
  Mobile API calls: the signup screens import `memberAuth` from `apps/mobile/lib/member-api.ts`, which is
  `createMemberAuthClient` in `packages/api-client/src/index.ts` (e.g. `memberTermsAccept`) — new methods go THERE. Errors:
  `new ApiError(422, CODE, msg)` (`known-people/handlers.ts` precedent), `ConflictError(msg, code)` (`apps/api/src/http-errors.ts`).
  Member state: `memberDomain.getCurrentMemberState(tx, memberId)` (`packages/domain/src/member/read.ts`).
- **F9b — OpenAPI is a hand-kept list.** `openapi/v1.yaml` is emitted by `packages/contracts/scripts/emit-openapi.ts`, which imports each
  schema and registers each path by hand (e.g. `/api/v1/member/language`); `VyawasthaShulkConfirmRequest.referenceCode` is in it today.
  `ci:local` runs `contracts:check-openapi-determinism`.
- **F10 — Audit, export, erasure.** `apps/api/src/audit/audit-sink.ts` already has `member_attribution.captured` (no PII). The data export
  already carries `attribution` (`packages/domain/src/data-export/assemble.ts`); RTBF keeps it (`member/anonymize.ts` — governance history).
- **F11 — Copy and gates.** Words in `packages/i18n/locales/{en,hi}/common.json` (the `common` namespace is registered; parity gate
  `packages/i18n/scripts/check-parity.ts`). The microcopy gate (`microcopy.yaml` `scope.code_globs`) lists specific mobile files (e.g.
  `apps/mobile/app/(signup)/kyc.tsx`) — a new screen is unscanned until added.
- **F12 — Numbers.** ⛔ migration, ⛔ permission key, ⛔ roster row (PQ1 is RULED — `-493`). Decision: `-482` is
  on the governance branch, `-481` on `story/6-22b-…` ⇒ next free ≥ `-483` at creation; ⭐ at `origin/main` `aa17300a` (2026-11-22) `main` holds up to `-492`; this branch holds `-493` (PQ1's ruling, 2026-11-22) ⇒ next free ≥ `-494` —
  RE-READ at Task 0.1 across every ref and worktree.
- **F13 — Reads owed by "the first story that resolves a capture".** (a) `-459` Q2 A's worker count (`deferred-work.md` 13.1d C4,
  trigger *"13.8 create-story"*; 13.1d is `done`, its request read has ⛔ count) — DL14, ANSWERED A: Story 13.5 builds it. (b) 13.2's D2: the allocator's AT4 probe reads
  `member_attribution WHERE pariwar_id = $1 AND attribution_source = $2` with ⛔ index; *"run `EXPLAIN` at real volumes when this story
  first reads `member_attribution` by code"*. This story reads ONLY by `attribution_id` (PK, inside `resolveAttribution`) and `member_id`
  (`UNIQUE`) ⇒ D2 is ⛔ triggered (DL14 A keeps the read BY CODE out of this story; it travels with the count to 13.5). (c) 13.2 C4 / 13.5 C4 — backfilling 3.6b's
  payment-step captures — stays 13.5's: this story resolves only the rows it writes.

## Build decisions — PROPOSED at v1.2; ANSWERED at Task 0.2 on 2026-11-22 (recorded in `2026-11-22-494`: DL1–DL13 "Accept all", DL9 "Approve as written", DL6 "remove it"; DL14 "DL14 A" — P8 i)

- **DL1 — Two member routes**, new module `apps/api/src/modules/member-attribution/`: `GET /api/v1/member/signup/assisted-code` →
  `{ recorded: boolean }` (lets the step skip when a code is already recorded); `POST /api/v1/member/signup/assisted-code` with
  `{ code }` (`^\d{6}$`, `.strict()`) → `201 { recorded: true }`. `requireMemberSession`; the POST rate-limited per member exactly as
  member-language (F9): `max: deps.config.writeRateMax` (env `WRITE_RATE_MAX`, default 30), `timeWindow: '1 minute'`, `perMemberKey`,
  `hook: 'preHandler'`. ⚠ 201-vs-422 tells a caller whether a code is held (3.6b's AC requires refusing unknown codes); the rate limit
  is the bound, and FR-86's throttling is ⛔ here (DL13). Contracts in `packages/contracts/src/members/` (exported from the index);
  schemas + both paths registered in `emit-openapi.ts` (F9b), then OpenAPI regenerated.
- **DL2 — The POST, in ONE scope tx, in this order:** (1) `memberDomain.getCurrentMemberState(tx, memberId)` is `pending-kyc` or
  `pending-fee`, else `ConflictError` 409 `attribution.not_signing_up`; (2) read the member's existing capture with a NEW domain read
  `readMemberAttributionForMember(db, memberId) → { attributionSource } | null` beside the writer in `payment/attribution-write.ts`
  (exported through the `payment` namespace; the GET uses it too) — same code ⇒ 200 `{ recorded: true }` (idempotent, ⛔ new row);
  a different code ⇒ 409 `attribution.already_recorded`; (3) `insertMemberAttribution`; (4) `resolveAttributionForRequest(request,
  scopeTx, { code, asOf: { captureId: row.attributionId } })`; `null` ⇒ throw `new ApiError(422, 'attribution.code_not_found', …)` — the
  tx ROLLS BACK, ⛔ row stored; (5) commit, THEN audit `member_attribution.captured`. Error codes live in the contracts (Task 1). A `23505` on `member_attribution_member_uq` (two taps racing) ⇒
  the tx rolls back, then re-read and answer as (2) ([[project_domain_limit_clamp_and_savepoint_retry]]: ⛔ continue a tx after 23505).
- **DL3 — The response says nothing about the worker** (N2): ⛔ id, ⛔ name, ⛔ state.
- **DL4 — A known code of a worker who is not `active`** (never approved — `pending_kyc`, F7 —, suspended for any reason, ended — from
  any state —, died) is recorded and answered EXACTLY as an active worker's (201). PQ1 RULED A (`-493`); the credit consequence is 13.5's.
- **DL5 — "No" stores nothing** and calls nothing (as today: ⛔ code ⇒ ⛔ row ⇒ `organic` by absence).
- **DL6 — The payment step stops capturing** (N6): remove `referenceCode` from `VyawasthaShulkConfirmRequest`, the handler's capture
  block (savepoint + audit), the input and its state in `payment.tsx`, and the two `payment.reference_code_*` keys (en + hi); update the
  AC4 tests to prove a body with `referenceCode` is refused 400 (`.strict()`). *Considered:* keep the payment box as a second chance for a
  member who skipped — rejected: two writers of one `UNIQUE` row, and the payment savepoint would silently swallow the conflict.
  ⚠ ⛔ app is live, so ⛔ old client sends the field. ⚠ The epics.md 3.15 block says the box *"stops taking 6-digit codes (member-invite
  usernames stay Story 13.8's)"*; the contract accepts ONLY `^\d{6}$` today, so stopping 6-digit codes leaves it taking nothing — the
  box is REMOVED, and Story 13.8 builds its own capture surface for usernames / eHRMS (DL12 line). `UNIQUE(member_id)` + FR-82's one
  field make a worker's code and an inviter MUTUALLY EXCLUSIVE for one member — by design, ⛔ changed here; 13.8 must write through the
  same one-row rule. The renewal confirm reuses `VyawasthaShulkConfirmRequest`: ⛔ renewal client sends `referenceCode` (grep: only
  `(signup)/payment.tsx`), so the narrowing is safe there too.
- **DL7 — The wizard:** `WIZARD_STEPS` becomes `['tc', 'assisted', 'kyc', 'workplace', 'nominees', 'medical', 'whatsapp', 'payment']`;
  `tc.tsx` routes to `/(signup)/assisted`; the new `(signup)/assisted.tsx` routes to `/(signup)/kyc`. On mount: the GET (bounded, 5 s);
  recorded, failed or hung ⇒ straight on to `kyc` (the whatsapp precedent). `assisted` is ⛔ a lock-in step: ⛔ add it to `payment.tsx`'s
  `LockInGateStep` / `packages/domain/src/member/lock-in-gate.ts` outstanding steps (N1). A skipped step is ⛔ subtracted from
  *"Step N of M"* (the whatsapp `-375` accepted cost).
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
- **DL11 — Credit is ⛔ classified here** (N4) — 13.5 reads the capture. ⛔ `acceptsNewAttributions` call in this story. This MOVES the
  inherited *"FR-85 is applied HERE"* (13.8 C2 / 13.1 C2) to Story 13.5, which applies it to every 3.15 capture with
  `getFieldWorkerStateAt(…, { captureId })` (the worker's state AT the capture, in SQL) and builds the held credit (`-454` Q6 C,
  `-465` Q1 B). Lossless: the capture + its `captured_at` are all that check needs (F6). Recorded at every site (DL12).
- **DL12 — Records (closure language exact — [[feedback_closure_language_precision]]):**
  - `deferred-work.md`, one scoped dated line at EACH site: 13.1's C2 (*"Story 13.8 (the first signup consumer): FR-85 is applied from
    13.1's state"*) and 13.2's C2 (*"FR-85 lives in the caller … by whoever records an attribution"*) — *"capture + resolution for 6-digit
    codes at signup: Closed by Story 3.15; the FR-85 check: MOVED to Story 13.5 (3.15 DL11); the adopter-username form stays 13.8's"*;
    13.2's C4 / 13.5 C4 (backfilling 3.6b's captures) — *"not addressed by 3.15 (it resolves only the rows it writes); owner unchanged"*;
    13.1d C4 (the count) — *"not addressed by 3.15; MOVED to Story 13.5 (3.15 DL14 A, BigDev 2026-11-22); trigger: 13.5 create-story;
    13.2's D2 (`EXPLAIN` on a read BY CODE) travels with it"*; 13.1c C5 (the silence warning, `-454` Q4 A) — *"the record of which teachers a worker
    brings in now exists (3.15); the warning and its period are still unbuilt and unruled — owner unchanged"*; a new observed line: ⛔
    route back into the signup wizard for a returning member (F8).
  - epics.md dated lines: 3.6b (*"the payment step's Reference Code moved to Story 3.15 (DL6)"* — the heading is Story 3.6, row `3-6b`; epics.md has no "3.6b" heading, though `-494`'s References cite "Stories 3.6b" — code review round 2, P8 e); 3.15 (the §0 correction); 13.8 (6-digit
    capture + resolution Closed by 3.15; the payment box is REMOVED, so 13.8 builds its own capture surface for usernames / eHRMS through
    the same one-row rule; the FR-85 check moved to 13.5); ⭐ 13.5 (*"owns FR-85 and the held credit for every Story 3.15 capture —
    `getFieldWorkerStateAt({ captureId })` on the holder `resolveAttribution({ captureId })` returns (3.15 DL11)"* + *"supplies `-459` Q2 A's count of members a worker brought in (by worker, inside one Pariwar, a number,
    ⛔ a member's name) for 13.1d's move-request read; decide 13.2's D2 (`EXPLAIN` / index) with it (3.15 DL14 A)"*).
  - PRD FR-85: a dated annotation line — *"the credit recorder is Story 13.5 for 6-digit codes captured at signup (Story 3.15)"*
    (annotated, ⛔ rewritten).
  - Code comments (Task 2.1): the headers of `schema/member_attribution.ts` and `payment/attribution-write.ts` and the contract's
    `referenceCode` comment — the capture is now resolved at signup by Story 3.15; ⛔ "13.8 wires the lookup".
- **DL13 — Not in scope:** member usernames / eHRMS as codes (13.8); a field-worker draft's automatic code (13.9 — it must use THIS
  route's writer, ⛔ a second); showing the worker anything; commission (13.5); the silence warning; FR-86's anti-fraud throttling
  (code use per day / per device — Epic 13); changing or removing a recorded code; a second chance after the wizard (F8).
- **DL14 — The worker count (`-459` Q2 A; F13 (a)).** The ruling is made; this decides only WHERE it is built. ✅ **ANSWERED A**
  (BigDev, 2026-11-22, verbatim: *"DL14 A"*) — recorded in Task 0.4's author-commit with DL1–DL13.
  - **A (recommended — CHOSEN):** ⛔ here — MOVED to Story 13.5, which already resolves each capture to its holder for credit; dated lines on
    `deferred-work.md` 13.1d C4 (trigger *"13.8 create-story"* → *"13.5 create-story"*) and the 13.5 block. *Cost:* the District Admin's
    move-request view keeps showing ⛔ count until 13.5 lands; ⛔ migration here.
  - **B (⛔ taken):** build `countMembersOnboardedByFieldWorker(db, pariwarId, fieldWorkerId) → number` here (a count of this worker's
    `member_attribution` rows whose `captured_at >= allocated_at`; Pariwar-scoped; ⛔ a member's name) and wire it into 13.1d's request
    read. *Cost:* a read BY CODE ⇒ 13.2's D2 fires (`EXPLAIN`, likely an index on `(pariwar_id, attribution_source)` = a migration);
    touches 13.1d's shipped read and its tests; counts every capture, including ones 13.5 will not credit — "onboarded" ≠ "credited"
    must be said in the view.

## Panel question — ✅ RULED (Decision `2026-11-22-493`, Trustee-ratified, DR and KB)

BigDev asked the Panel directly (*"let me ask Panel directly, PQ1 is simple question"*); the ruling, verbatim: *"by DR and KB / go with
option A."* ⛔ routing-note file carries PQ1. The question as put is quoted in `-493`.

- **PQ1 — When a person types the code of a field worker who is suspended, has been ended, or was never approved, is the person told?**
  - **The one fact that decides it:** telling the person anything about the code is telling them something about the worker who gave it
    — a third person's standing with the Trust.
  - **A (our suggestion):** ⛔ — the code is accepted like any other; whether the worker is credited follows your credit rulings
    (held while under review or ended; ⛔ credited at the worker's own request). *Cost:* the person cannot know the code may earn nothing.
  - **B:** the app says *"This code can't be used right now"* and lets them continue. *Cost:* it tells a member that a named worker's code
    is not working — a disclosure about the worker — and may make them doubt the person who helped them.
  - ✅ **Ruled: A.** Built as DL4. PRD FR-85 is annotated for the signup capture (`-493`; Task 0.5).

## Acceptance Criteria

1. **AC1 (Task 0 — governance FIRST).** Before any `apps/` / `packages/` change: Task 0.1 recorded; Task 0.2 answers recorded verbatim;
   PQ1's ruling `-493` committed alone (✅ done, `c88268f5`); the author-commit entry (amending `-482` decision 4) committed ALONE; the
   sprint row `in-progress`. ([[feedback_governance_commits_precede_implementation]])
2. **AC2 (DL1, DL2, DL3).** Live-DB API tests on the POST: a held code ⇒ 201, one row with `attribution_source` = the code; the body
   carries ⛔ worker field (a schema test: the response is exactly `{ recorded: true }`); the same code again ⇒ 200, still one row; a
   different code after one is recorded ⇒ 409 `attribution.already_recorded`, the row unchanged; a code nobody holds ⇒ 422
   `attribution.code_not_found` and ⛔ row (with a passing control beside it — [[feedback_assertion_after_savepoint_rollback_is_vacuous]]);
   the GET ⇒ `{ recorded: false }` before and `{ recorded: true }` after; `readMemberAttributionForMember` has its own live-DB test;
   `'12ab'` / 5 digits / extra key ⇒ 400; a member in `lock-in` ⇒ 409 `attribution.not_signing_up`; ⛔ member session ⇒ 401; two
   concurrent POSTs ⇒ one row, both answered (201 + 200, or 200 + 200).
3. **AC3 (N5, F4).** A code allocated in ANOTHER Pariwar ⇒ 422 (the door's Pariwar is the session's); a code allocated AFTER the capture
   instant cannot credit (13.2's AT4 (c) — a code row inserted with `allocated_at` = `now() + interval '1 hour'` under
   `session_replication_role = 'replica'` (the stamp trigger would overwrite it otherwise — F7) ⇒ 422, with a control code allocated in the
   past ⇒ 201); the GET returns `recorded` for the session's member only. *(Dated line 2026-11-23, review R5 / P8 h: codes are unique per Pariwar ONLY, so "a code allocated in ANOTHER Pariwar ⇒ 422" holds when those digits are not also held in the member's own Pariwar; the same digits held in two Pariwars are legal and recorded in each — the R5 leg.)*
4. **AC4 (DL4, N2).** For each worker state — `pending_kyc` (registered, never approved), `active`, suspended `under_review`, suspended
   `at_worker_request`, `terminated` from `active`, `terminated` from `pending_kyc` — the POST answers byte-identically (status + body); a
   test asserts the six responses are equal. *(Dated line 2026-11-23, review P6: the test now proves EIGHT states — `terminated` from `suspended` and `terminated` with reason `died` added, per `-493`: "ended (from any state), or died".)*
5. **AC5 (DL6, N6).** `referenceCode` is gone from `VyawasthaShulkConfirmRequest`; a confirm carrying it ⇒ 400; the confirm handler
   writes ⛔ `member_attribution` row (grep-test: `insertMemberAttribution` is called from exactly one `apps/api/src` file — the new
   module); `payment.tsx` has ⛔ code input; the two keys are removed in en AND hi (parity green). The three new schemas and both paths
   are registered in `packages/contracts/scripts/emit-openapi.ts`; `openapi/v1.yaml` regenerated — it shows both paths and ⛔
   `referenceCode` (compare with anchors resolved — [[project_openapi_yaml_anchor_renumbering]]); the determinism check is green.
6. **AC6 (DL7, DL8, N1) — mobile vitest.** `WIZARD_STEPS` updated (and `workplace.test.ts`'s pin); the step: renders both buttons; No ⇒
   `kyc` with ⛔ request; Yes + 6 digits + Continue ⇒ one POST (a double tap makes ONE), then `kyc`; 422 ⇒ the not-found line and the
   member can still continue without; 409 / 429 / 500 / timeout ⇒ `kyc`, ⛔ message; GET `recorded: true` ⇒ straight to `kyc`; a hung
   GET ⇒ `kyc` after the bound. ⚠ [[project_tanstack_instant_mock_hides_notready_flip]] / [[project_jsdom_disabled_button_keeps_focus]].
7. **AC7 (DL9).** Every string comes from `common.json` (⛔ inline literals), en + hi, the Task-0.2-approved text; the new screen is added to
   `microcopy.yaml` `scope.code_globs` and the gate is green ON it ([[feedback_gate_scope_semantic_coverage]]); the typed routes are
   regenerated and `tsc` checks the two new `router.replace` literals (F8).
8. **AC8 (F5).** The attribution reach fence is green with ⛔ edit to its ALLOWED list (the new module imports the door only); the door's
   export pin is unchanged.
9. **AC9 (records).** DL12 written at EVERY site it lists (a grep for each quoted anchor finds its dated line); DL14 A applied (the 13.1d C4 and 13.5 dated lines; ⛔ count built here); `pnpm ci:local` green on a FRESH container with `DATABASE_URL` pointing at it
   ([[project_prepush_hook_inherits_5432]], [[project_known_livedb_test_failures]]).

## Tasks / Subtasks

- [x] **Task 0 — Governance FIRST (AC1).** ⛔ No `apps/` / `packages/` file before 0.4 is committed.
  - [x] 0.1 `git fetch origin`; confirm `merge-base --is-ancestor 99922af1 HEAD` (the pin; the governance branch landed in it, PR #336);
        `git diff --name-only 99922af1..origin/main -- apps packages` and re-read every F-fact whose file moved; if `origin/main` moved,
        rebase onto it. Re-read the next free decision id and the ledger letter across EVERY ref and worktree (`git branch -a`,
        `git worktree list`, the working copies) — ⛔ HEAD only. Check rows `13-8`, `13-9`, `13-5`, `3-16` (it edits the wizard's `kyc`
        step) for any start that touches `member_attribution` or `WIZARD_STEPS`.
        ✅ 2026-11-22: `origin/main` = `99922af1` = the pin (⛔ drift, ⛔ rebase; `99922af1..origin/main -- apps packages` empty);
        highest decision id on every ref and worktree `-493` (this branch) ⇒ `-494`; highest ledger letter `2026-11-22p` (this branch)
        ⇒ `q`; rows 13-8 / 13-9 / 13-5 / 3-16 `backlog` with ⛔ branch; the 3-13 and 6-39a branches touch ⛔ wizard / attribution file.
  - [x] 0.2 Put DL1–DL13 to BigDev (the question dialog; recommended first), with DL6 (removing the payment box) and DL9 (the words,
        en + hi) as separate questions. Record the answers verbatim here. ✅ DL14 already ANSWERED: *"DL14 A"* (BigDev, 2026-11-22).
        ✅ 2026-11-22, verbatim: DL1–DL5, DL7, DL8, DL10–DL13 — *"Accept all (Recommended)"*; DL9 — *"Approve as written
        (Recommended)"*; DL6 — *"remove it, just to confirm, member would still see the membership payment screen"* (confirmed: yes —
        only the code box goes; the payment screen is unchanged).
  - [x] 0.3 ~~Add PQ1 to the field-worker drafts note~~ — DROPPED: BigDev asked the Panel directly; RULED A, Decision `2026-11-22-493`
        (Trustee-ratified, DR and KB), committed alone at `c88268f5` (2026-11-22, before dev-story). ⛔ edit the drafts note.
  - [x] 0.4 Author-commit entry (`<date>-<next>`): DL1–DL14 as answered, the §0 split, PQ1 RULED A (cite `-493`), AMENDING `-482` decision 4
        by name (PQ1 was a Panel question; credit is ⛔ classified at capture), and recording that the inherited *"FR-85 is applied HERE"*
        moves to Story 13.5 (DL11); committed ALONE. ⚠ If refused, ask once
        ([[project_decision_log_writes_user_inserted]]). ✅ `2026-11-22-494`, committed alone at `77c23484`.
  - [x] 0.5 Dated lines: the `3-15` sprint row comment (*"⛔ Panel question"* and *"FR-85 acceptsNewAttributions; -454 Q6 C held credit"*
        corrected), epics.md 3.15 / 3.6b / 13.8 / 13.5, PRD FR-85, and the `deferred-work.md` sites (DL12; DL14 as answered) — plus
        `-493`'s Consequence 2: PRD FR-85's signup annotation, and *"whether and how a member is told is a PANEL question"* marked RULED
        `-493` A at epics.md 13.8 C2 and `deferred-work.md` 13.1 C2.
  - [x] 0.6 Sprint row `3-15-…` `ready-for-dev → in-progress` (map only; one ledger entry at the end — [[project_sprint_status_safe_prepend]]).
- [x] **Task 1 — Contracts (AC2, AC5).** `packages/contracts/src/members/`: `MemberAssistedCodeRequest` (`{ code }`, `^\d{6}$`, strict),
      `MemberAssistedCodeResponse` (`{ recorded: true }`, strict), `MemberAssistedCodeStatusResponse` (`{ recorded: boolean }`); the error
      codes; export from the index. Remove `referenceCode` from `VyawasthaShulkConfirmRequest` (and its doc comment). Register the three
      schemas and both paths in `scripts/emit-openapi.ts` (F9b). Fixture / contract tests outside `tsc`
      ([[project_contracts_tests_outside_tsc]]).
- [x] **Task 2 — API (AC2, AC3, AC4, AC8).**
  - [x] 2.1 `apps/api/src/modules/member-attribution/` (routes, handlers, index): DL2's order; `openScopeTx` / `closeScopeTx`; import
        `resolveAttributionForRequest` FROM THE DOOR (⛔ `@twt/domain`'s `attributionCode`); `insertMemberAttribution` and the new
        `readMemberAttributionForMember` (DL2) via the `payment` domain namespace; the member state through `getCurrentMemberState`; audit
        after commit. Register in `server.ts`. Update the stale headers of `schema/member_attribution.ts` and `payment/attribution-write.ts`
        (comments only — DL12; ⛔ schema change).
  - [x] 2.2 Remove the capture block from `vyawastha-shulk/handlers.ts`' signup confirm (DL6) — keep AR-67's "the receipt always commits"
        (drop `attributionCaptured` and its post-commit audit with it).
  - [x] 2.3 Integration tests (own container, DB named `twt_dev`): AC2–AC4; update the 3.6b AC4 tests (now: `referenceCode` ⇒ 400). ⛔
        import `packages/domain/tests/**` — `apps/api` tests cannot (`_field-worker-fixture.ts`'s header). Seed workers with
        `apps/api/tests/integration/_field-worker-fixture.ts` (`registerTestFieldWorker`, `approveTestFieldWorker`,
        `actTestFieldWorker` — it suspends with `under_review` only: add a reason parameter for `at_worker_request` —,
        `terminateTestFieldWorker`) and allocate each code through the door's `allocateAttributionCodeForRequest` (as
        `attribution-code-access.spec.ts` does); clean up like `field-worker/_registration-harness.ts` (the codes table is append-only —
        replica mode). AC3's future-dated code: an owner-pool insert under `SET LOCAL session_replication_role = 'replica'` (F7).
  - [x] 2.4 Run the reach fence and the whole `apps/api` unit suite (AC8).
- [x] **Task 3 — Mobile (AC6, AC7).** `lib/wizard-steps.ts`; `(signup)/tc.tsx` target; `(signup)/assisted.tsx` (the whatsapp model, F9);
      GET + POST as two methods on `createMemberAuthClient` in `packages/api-client/src/index.ts` (reached through `memberAuth` in
      `lib/member-api.ts` — F9); remove the box from `payment.tsx`; `common.json` en + hi (DL9) and the removed
      keys; `microcopy.yaml`; vitest. Regenerate typed routes (`CI=1 npx expo start --port <free>` until `.expo/types/router.d.ts`
      exists). ⚠ [[project_tamagui_button_text_one_line]] for the two buttons; [[project_uset_fresh_closure_memo_trap]] (⛔ `t` in deps).
- [x] **Task 4 — Gates (AC9).** i18n parity; microcopy; OpenAPI emit; `pnpm ci:local` on a fresh container.
      ✅ `ci:local` **41/41 green** at `e3105ae7` on a FRESH `twt-3-15-pg` (:5447), `.expo/types` moved aside (run 2; run 1's two reds in Debug Log).
- [x] **Task 5 — Records.** DL12; story Dev Agent Record, File List, Change Log; sprint row → `review`; ONE ledger entry (safe prepend,
      YAML parses, row count holds).

### Review Findings

Code review 2026-11-22: `99922af1..83fb1ee2`, full story review with Blind Hunter, Edge Case Hunter and Acceptance Auditor.
After deduplication: **0 decision-needed, 5 patch, 0 defer, 1 dismissed**. Findings below remain open; implementation was not patched.

Disposition (BigDev, 2026-11-22): **2 — Leave as action items**. R1–R5 remain unchecked; no implementation patches applied. Story and sprint row returned to `in-progress`.

Dated line 2026-11-23 (code review round 2, P8 a): R1–R5 were RESOLVED at `f1a5e585` (Change Log 1.6); "remain open", "remain unchecked" and "returned to `in-progress`" above describe the state at `34cfa95a` only. Row history: `review` → `in-progress` (ledger `2026-11-22r`, `34cfa95a`) → `review` (ledger `2026-11-22s`, `468f4d3f`).

- [x] [Review][Patch] **R1 / P2 — Freeze the submitted code while its immutable capture is pending.** [`apps/mobile/app/(signup)/assisted.tsx:170`] The input remains editable during the POST. Submit A, edit the displayed value to B, then let A succeed: the screen says the code is saved and advances although A, not the displayed B, was permanently captured. A rejection likewise attaches A's error to B. Disable editing while busy and guard `onChangeText` against in-flight changes. Sources: blind + edge. Reproduced with a held POST in the temporary review harness.
- [x] [Review][Patch] **R2 / P2 — Cancel status-read and saved-timer navigation on blur.** [`apps/mobile/app/(signup)/assisted.tsx:66`] The focus cleanup invalidates only the POST continuation. A pending GET (recorded or failure/timeout) or the saved-state timer can still call `router.replace` while the screen remains mounted behind another route, replacing the active screen with KYC. Bind these continuations to focus and cancel/restart them appropriately. Sources: blind + edge. Both the late GET and saved timer reproduced after invoking focus cleanup without unmounting.
- [x] [Review][Patch] **R3 / P2 — Announce the code-entry phase after Yes.** [`apps/mobile/app/(signup)/assisted.tsx:124`] Checklist family 13(d), AC6 / DL8: Yes removes the choice buttons and shows the code form, but the announcement hook covers only `ask`; the new phase has neither an announcement nor focus transfer. Announce the code-entry phase using the existing localized label, with a regression assertion. Source: auditor. Temporary render check confirmed no announcement or input focus after Yes; native device behavior remains un-attested.
- [x] [Review][Patch] **R4 / P2 — Add runtime denial evidence for hostile/non-access bearers on the new mutation route.** [`apps/api/tests/integration/member-attribution/assisted-code.spec.ts:255`] Checklist family 3 requires these cases per new mutation route. Current tests exercise valid access tokens and an absent token only. Exercise a tampered token and validly signed non-access token kinds (including signup-continuation / Pariwar-select), plus a non-member actor as applicable, asserting denial and no capture beside a valid-member control. The shared guard appears correct; this is missing required regression evidence, not a demonstrated authentication bypass. Source: auditor.
- [x] [Review][Patch] **R5 / P3 — Make the cross-Pariwar isolation fixture deterministic.** [`apps/api/tests/integration/member-attribution/assisted-code.spec.ts:312`] Independently allocated codes in P and Q may legally contain the same digits: uniqueness is per Pariwar. The test assumes they differ, causing a legitimate collision to fail CI; simply removing the inequality assertion would still leave the expected 422 incorrect. Construct distinct fixture codes deterministically, and preferably cover the valid same-digits-in-two-Pariwars case separately. Source: blind.

Review validation: **191 existing targeted tests passed** (35 mobile, 124 API one-writer/reach-fence, 5 contracts, 27 live-DB assisted-code/payment on the story's isolated :5447 container). Four temporary mobile reproduction checks passed, demonstrating R1, both R2 continuations and R3; these checks assert the observed defects and are not permanent regression coverage. Temporary harness: `/private/tmp/twt-315-review-repro/`.

Triage: the disabled skip button during the bounded POST was dismissed because DL7/DL8 and AC6 expressly accept bounded request waiting before automatic continuation. The overlapping member-lifecycle candidate was not promoted: the capture's transaction-start timestamp permits capture-before-transition ordering. Authorized inactive-worker capture, credit deferral to 13.5, payment-contract narrowing and the declared lack of a device pass were not treated as new defects.

Checklist: families 1 and 2 covered by state/idempotency tests; family 3 has R4 (cross-Pariwar and per-member reads otherwise covered); family 6 covered by explicit field selection and insert-only capture; family 8 covered by awaited commit before session-attributed audit (no admin mutation); family 10 covered by explicit un-attested/deferred records; family 12 covered by session identity, strict request shape and unique capture; family 13 has R3. Families 4, 5, 7, 9 and 11 untouched.

### Review Findings — round 2 (2026-11-23)

Code review round 2, 2026-11-23: `99922af1..468f4d3f`, the whole story at v1.6, reviewed in two chunks as BigDev chose ("B, yes"): group 1 = code, tests, contracts, OpenAPI, i18n (2992 lines); group 2 = records (814 lines). Three layers per group (Blind Hunter, Edge Case Hunter, Acceptance Auditor). The Blind Hunters saw the diff only and were NOT told R1–R5 were found; the other layers were told, to verify the fixes. After deduplication: **0 decision-needed, 8 patch (P8 bundles 12 small record corrections), 3 defer, 24 dismissed**. R1–R5 are confirmed delivered by the Auditor, and neither Blind Hunter re-found any of them. All layers were read-only; the worktree was clean and `main` unmoved afterwards. The review layers ran no tests (round 1's 191 are not re-run); the patch pass that followed ran the tests, mutation checks and gates recorded under "Review round 2 — patch pass" in the Dev Agent Record. Each patch below was checked by the reviewer against the code or the record, unless marked "not re-checked".

- [x] [Review][Patch] **P1 — `-493` (and `-494`'s title) say "supersedes no ratified text" and "consistent with `-454` Q6 C", but `-454` says FR-85 "stands as written" for an ENDED worker and a suspension at the worker's own request.** [`.decision-log.md:72` — `-493` title and "Against the question as put"; compare `-454` "Read against PRD FR-85"] Ruling A accepts and records exactly those codes at signup and keeps "rejected" only as "not credited"; the 2026-11-17 annotation narrows FR-85 only for an ending later undone. That is a narrowing of `-454`'s "stands as written", recorded as no change. The Panel ruled the substance (option A as put named the at-the-worker's-request case), so this is the record's label, not a new Panel question. The log is append-only: the fix is a new author-commit entry that names the narrowing of `-454` and of the PRD annotation, and corrects the "supersedes no ratified text" line for `-493` and `-494` ([[feedback_supersede_never_reinterpret]]). If BigDev would rather the Panel hear the narrowing again, that is his call. Sources: auditor + blind (records). **Resolved 2026-11-23:** decision `2026-11-23-495` (`b3d3fb0d`, with a one-line quote fix at `25390bdd`), each committed alone; PRD FR-85 carries a dated annotation line pointing to it.
- [x] [Review][Patch] **P2 — D3 overstates the bound on the 201-vs-422 oracle.** [`deferred-work.md:11` (D3); `apps/api/src/modules/member-attribution/handlers.ts:73-75`] D3 says one recorded code per member makes "a new signup per probe" the attacker's cost. A miss throws 422 and rolls back, storing nothing and using up nothing, so one signing-up member can probe at the write limit (`WRITE_RATE_MAX` a minute) until the first hit; DL1's own text ("this limit is the bound") is the accurate one. Correct D3 with a dated line, and have FR-86's owner confirm its throttle covers failed-code probing (Story 13.6's AC speaks of same-IP signup bursts; not re-checked). Sources: blind + auditor (records). **Resolved 2026-11-23:** a dated CORRECTION line under D3 in `deferred-work.md` (the original line is not edited); it puts on Story 13.6's create-story the question whether FR-86's throttle covers one member probing codes.
- [x] [Review][Patch] **P3 — The R2 fix is incomplete: a POST that settles while the step is blurred is dropped, so the capture is stored and the screen never learns it.** [`apps/mobile/app/(signup)/assisted.tsx:66-74,117-124`] Blur bumps `actionVersion`, so when the pending POST settles `isCurrent()` is false and the handler returns before `setStage('saved')` or the error line; `finally` unlocks the box. On re-focus the member sees an editable box: the same code answers 200 and proceeds, but an edited code gets a silent 409 exit with the first code permanently recorded. Only the navigation should be focus-bound; the state half should survive blur (set `saved` or the error, let the focus-bound timer move on at re-focus). No test lets a POST settle after blur — the three R2 legs cover the status read and the saved timer. Reachability: the same premise R2 accepted (a route pushed over the still-mounted step). I found no producer inside `(signup)` (no push or link there); a deep link or notification tap is the plausible one. Low. Sources: edge ×2. **Resolved 2026-11-23:** `assisted.tsx` keeps the POST's result on blur and moves on at focus (an `exiting` state and an effect; `actionVersion` removed). The patch review of this very fix added: the saved and error lines mount only while FOCUSED (so they are spoken at re-focus, not over another screen), a synchronous `focusedRef` so a continuation in the instant between blur and the effect cleanup cannot move a blurred step, and an `exitingRef` guard (a second press while the step waits for focus makes no second request — tested). The second patch-review round added the same `focusedRef` check to the status read's "answer" branch, so a "not recorded" answer in the instant after the blur does not speak the question over another screen. Fourteen new legs in all (the file went 24 → 38): P3 eight (201; 422 and 400; 409, 429, 500, no network, and a 15 s timeout — each after blur); beside R2 three "very instant of the blur" status legs (recorded, not recorded, fails); P5 two; P7 one. Mutation runs: the original five P3 legs red on the pre-patch screen; each new guard red when removed (`focusedRef` in the status read, `exitingRef`, the focus gate on the lines, `goNext`'s guard).
- [x] [Review][Patch] **P4 — No 429 leg for the POST's per-member rate limit.** [`apps/api/tests/integration/member-attribution/assisted-code.spec.ts` (none); `routes.ts:27-31,51`] DL1 / DL13 name this limit as the only bound on the 201-vs-422 oracle and the mobile step treats a 429 as "continue silently", yet nothing under `member-attribution/` mentions 429 or `WRITE_RATE_MAX` (grep: empty). The precedent pins it: `member-language.spec.ts:181` (`WRITE_RATE_MAX: '2'` ⇒ 200, 200, 429; another member untouched). Add one leg the same way. Sources: blind + edge + auditor. **Resolved 2026-11-23:** a 429 leg (`WRITE_RATE_MAX: '2'`: 422, 422, 429; the held code not recorded; a second member 201 beside it) — red with the route's rate limit removed (mutation run: the third POST returned 201).
- [x] [Review][Patch] **P5 — Checklist family 13 residuals on the new screen.** [`assisted.tsx:148`; `apps/mobile/tests/unit/assisted-step-render.test.ts` — the Spinner mock and the announce assertions] (a) the loading `Spinner` carries `accessibilityLabel` but is a `YStack` container with no `accessible={true}` (`@tamagui/spinner` spreads its props onto a `YStack`; the test's Spinner mock drops the label, so nothing could see it); (d) `mock.announce` is asserted for the title and the code label only — the not-found, format and saved lines are checked by role or text, so swapping `AnnouncedText` for a bare alert would stay green. Both low. Sources: edge + auditor. **Resolved 2026-11-23:** `accessible` on the loading `Spinner` (the mock now keeps label and flag; a leg, red on the pre-patch screen); announce asserted for the format, not-found and saved lines (a leg, red with `AnnouncedText` swapped for a bare alert). Both are proved against jsdom mocks only: the `Spinner` leg shows that the screen passes `accessible` and the label, not that the real `@tamagui/spinner` container becomes an accessibility element, and "spoken at re-focus" is un-attested on a device (deferred W2 (iii)). Not added: a spoken pending state for the POST — no AC ratifies one; it could reuse the existing `loading` string if BigDev wants it (noted, not decided).
- [x] [Review][Patch] **P6 — AC4 pins six worker states, but `-493` rules "ended (from any state), or died".** [`assisted-code.spec.ts:449`; `apps/api/tests/integration/_field-worker-fixture.ts` `terminateTestFieldWorker` — `reasonCode: 'inactive'` only] No leg ends a worker with reason `died` or ends a suspended worker. Not a live defect: the handler never reads worker state and `resolveAttribution` reads only `field_worker_attribution_codes` (read in `packages/domain/src/attribution-code/resolve.ts`). Give the fixture a reason parameter and add `died` and ended-from-suspended, or narrow the AC4 / `-493` wording to the six states proven. Sources: auditor + edge + blind (records). **Resolved 2026-11-23:** AC4 now proves eight states (ended-from-suspended and `died` added; the fixture's `terminateTestFieldWorker` takes a reason, default `inactive`); each seed's state is proved by `workerStateOfCode` before the equality.
- [x] [Review][Patch] **P7 — "Continue without a code" is disabled while the POST is pending, against N1 ("never blocks or delays a signup").** [`assisted.tsx:223`; N1; DL7; DL8] Round 1 dismissed this on the ground that DL7 / DL8 / AC6 "expressly accept bounded request waiting". What they say: the status GET is bounded at 5 s (DL7), and a POST timeout moves on to KYC (DL8); none says Skip is disabled during the POST. `goNext` already invalidates the pending POST's continuation (`leaving`), so an enabled Skip is safe — a capture that still lands is stored. Re-raised by two layers and kept as a patch because the dismissal's cited authority is weaker than stated; BigDev may overrule it and record that a bounded wait on the member's own Continue is accepted. Sources: blind + edge (records). **Resolved 2026-11-23:** Skip stays enabled while the POST is pending; a leg (Continue disabled and read as disabled beside it — the Button mock now carries `accessibilityState` — the POST's late 201 changes nothing), red on the pre-patch screen and red when `accessibilityState={{ disabled: busy }}` is put back on Skip. Disclosed: a POST already on the wire is not aborted, so a member who pressed Continue and then Skip may still have the code recorded (N3, permanent; deferred D4).
- [x] [Review][Patch] **P8 — Twelve small record corrections** (a–l). (a) The Review Findings preamble above still says "remain open … implementation was not patched … R1–R5 remain unchecked … returned to `in-progress`" while all five are `[x]` and Status is `review`: add a dated line; the sprint row comments and the Change Log also omit the `review → in-progress` bounce of ledger `2026-11-22r` (commit `34cfa95a`). (b) Completion Notes: "shown RED before the fix (or by a mutation after it)" — R1, R3 and R4 state a mutation, R2 and R5 state none: carry R2 / R5 as un-attested RED evidence or run the mutation; do not back-fill. (c) `ci:local` 41/41: Task 4 anchors it at `e3105ae7` (before R1–R5); the follow-up run (ledger `2026-11-22s`, `468f4d3f`) names no commit and does not say it ran on the working tree 26 s before `f1a5e585` was committed — say which. (d) Project Structure Notes list "the drafts note" among updated records [story line 394]; Task 0.3 and `-493` consequence 3 say it was not changed, and the File List omits it. (e) `-494` References and DL12 cite "epics.md Story 3.6b"; no such heading exists, the dated line sits under Story 3.6 (row 3-6b). (f) epics.md Story 3.6 dated note [`epics.md:1909`] sits between two And-clauses with no blank line after it, so the next lines render inside the blockquote, and the `reference_code.captured` event clause below it is not annotated (3.15 DL10: never minted). (g) The `-459` Q2 A worker count moved to 13.5 (DL14 A), but two sites outside DL12's list still name 13.8 as its owner — `docs/launch-gate-inventory/inventory-roster.md` Row 51 (the 2026-11-08 line: "cannot be computed until Story 13.8 resolves a member's code to a worker") and `_bmad-output/implementation-artifacts/13-1d-field-worker-move-requests-and-notices.md:320` ("Not counted yet until Story 13.8 (C4)"); add a dated line at each, and restate in the `deferred-work.md` 13.1d C4 line the original "whether 13.1d's go-live waits for it" consequence. (h) AC3 and F7 hold only while the digits are not also held in the member's own Pariwar (R5 found uniqueness is per Pariwar): add a dated clarification. (i) The DL1–DL13 heading still reads "PROPOSED (BigDev answers at Task 0.2)" and DL9 "approved … at Task 0.2" though both were answered. (j) DL13's "no change or removal of a recorded code" has no deferred item with an owner or trigger (D1–D3 exist), and "13.9 must use this route's writer" is recorded only in `-494` and D1, not in the epics.md 13.9 block. (k) DL12's "13.2's C4 / 13.5 C4" site: epics.md 13.5's inherited C4 has no dated line (`grep 'not addressed by' epics.md` is empty); DL12's wording is ambiguous — add the line or say which site was meant (auditor + edge; not re-run). (l) `deferred-work.md` 13.1f C1 and 13.1c C3: the edge hunter says 3.15 fired their trigger ("first attribution recorder's create-story") with no dated line; I confirmed the two lines exist, not the claim (not re-checked). Sources: blind + edge + auditor (records). **Resolved 2026-11-23:** (a) dated line under round 1 + Change Log 1.7 + the sprint row comments (the `review` → `in-progress` bounce of ledger `2026-11-22r`, and ledger `2026-11-23a`); (b) R2 evidenced by a mutation run, R5 recorded as not constructible; (c) dated line — the 41/41 is not anchored to a commit; to be superseded by the push-time `ci:local`, recorded at landing; (d) corrected; (e) cited as Story 3.6 (row `3-6b`) in DL12 and in epics.md; (f) epics.md Story 3.6 note spaced and the `reference_code.captured` clause annotated; (g) dated lines at roster Row 51 and deferred-work 13.1d C4 (the 13-1d story gets one bracketed dated note; the epics.md 13.1d block and the 13-1d story's other lines naming Story 13.8 for the count point to deferred-work 13.1d C4, which carries the move, and are not annotated one by one); (h) AC3 and F7 clarified; (i) heading corrected; (j) deferred D4 and an epics.md 13.9 line; (k) epics.md 13.5 C4 dated line; (l) dated lines at 13.1f C1 and 13.1c C3.
- [x] [Review][Defer] **Hindi-first digits: `SIX_DIGITS = /^\d{6}$/` refuses Devanagari digits** [`assisted.tsx:44`; `packages/contracts/src/members/assisted-code.ts`; `members-assisted-code.test.ts`] — deferred (un-attested; owner: the device pass, D2). `\d` is ASCII-only and the contract test pins the refusal of Arabic-Indic digits on purpose; if the number pad on a Hindi device emits Devanagari digits a correct code cannot be entered. If the pass shows it, normalise on the client before the regex and the send.
- [x] [Review][Defer] **Native side effects of the R1 / R2 fixes that jsdom cannot see** [`assisted.tsx:191` — `disabled={busy}` maps to `editable: !disabled` in `@tamagui/input`'s native build; `assisted.tsx:57-98`] — deferred (un-attested; owner: D2). (i) Flipping a focused TextInput to non-editable normally drops focus and the keyboard, so DL8's "focus stays" after a 422 is not attested on a device; (ii) the 5 s status-read bound now starts after `useFocusEffect` reports focus, not at mount, and the test's focus mock fires synchronously.
- [x] [Review][Defer] **`whatsapp.tsx:227` carries the same labelled-container `Spinner` (family 13a)** [`apps/mobile/app/(signup)/whatsapp.tsx:227`] — deferred, pre-existing (3.15's screen copied it; P5 fixes the copy only).

Dismissed (24, not listed one by one): decided by BigDev or the Panel in DL1–DL14 or already disclosed — the `referenceCode` 400 (DL6), the code dropped on a transient failure with no way back (DL7 / DL8, D1), the permanent capture (DL13), the 1.2 s "saved" line (DL8), the post-commit audit line (DL2 (5), the 3.6b precedent), the insert-then-roll-back on a miss (DL2 order), the state check before the existing-capture check (DL2 order); the lock-in race (round 1 triaged it: the capture's time is its transaction start; re-raised by two layers, no new fact); the one-writer fence matching by name (AC5 as written; `apps/api/src` has no `.insert(` call at all); `⛔` in OpenAPI text (16 uses on `main` already); step-count comments in `_layout.tsx` (dated history, the 3.15 line is added beneath); an unused error-code constant and tests that grep source text (disclosed: `tsc` cannot check the route literals); `-493`'s scope ("died" is an ending); "built" in `-493` (the entry predates the code); R3's un-moved focus (stated in its resolution); a "decision 4" label in `-494` (it names "its row-6 words"); the `⛔` polarity worry (the repo's convention, 6677 uses in the log). Not recorded: one Blind Hunter remark that ledger letter `af` is duplicated on `main` (pre-existing, not verified).

Checklist verdicts (Auditor, group 1): families 1, 2, 3, 6, 8, 10, 11, 12 covered (by test or by construction); family 13 has P5; families 4, 5, 7, 9 untouched.

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
  `packages/contracts/scripts/emit-openapi.ts`, `openapi/v1.yaml`, `packages/domain/src/payment/attribution-write.ts` (+ the `payment`
  index), `packages/domain/src/schema/member_attribution.ts` (comment only), `packages/api-client/src/index.ts`,
  `apps/mobile/lib/wizard-steps.ts`, `apps/mobile/app/(signup)/{tc,payment}.tsx`, `packages/i18n/locales/{en,hi}/common.json`,
  `microcopy.yaml`, `apps/mobile/tests/unit/workplace.test.ts`, `apps/api/tests/integration/_field-worker-fixture.ts` (reason parameter),
  the two vyawastha-shulk specs. Records: `deferred-work.md`, epics.md, PRD FR-85, `.decision-log.md`, sprint-status (NOT the drafts note — Task 0.3 was dropped and `-493` consequence 3 leaves it unchanged; corrected at code review round 2, P8 d).

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

Claude Opus 5.5 (`claude-opus-5-5`), `bmad-dev-story 3.15` on the story's worktree, 2026-11-22.

### Debug Log References

- Own DB container `twt-3-15-pg` (:5447, `twt_dev`, postgres:16-alpine), recreated FRESH before `ci:local`; ⛔ :5432 / :5433 used.
- Task 0.1 (2026-11-22): `origin/main` = `99922af1` = the pin; highest decision id anywhere `-493` ⇒ `-494`; ledger letter ⇒ `q`.
- `ci:local` run 1 (fresh container, `.expo/types` moved aside): 39/41 — `integration-tests` green; red: `friction-budget` (AC-4:
  the new member-facing step had no declaration — a REAL finding, fixed by a new row + disposition, gate re-run green) and
  `test (unit)` (two `apps/admin` 5 s timeouts in files this story does ⛔ touch — `moderation-section`, `news-page`; 4/4 alone; the
  whole unit job re-run: 37/37 tasks green — the known concurrency-4 load class, [[project_ci_local_concurrency_oversubscription]]).
- Mutation checks (each restored, `cmp`-verified): the 422 refusal disabled ⇒ 3 legs red; the 23505 retry removed ⇒ the two
  deterministic race legs red (the plain `Promise.all` race leg stayed green — it never reached 23505, hence the held-lock legs);
  a planted `#FF0000` in `assisted.tsx` ⇒ the microcopy gate red; `tc.tsx` pointed back at `kyc` ⇒ the route source test red.
- Typed routes regenerated (`CI=1 npx expo start --port 8197`); mobile `tsc` green WITH and WITHOUT `.expo/types`. ⚠ As
  [[project_mobile_typed_routes_worktree]] records, `tsc` does ⛔ catch a wrong `'/(signup)/…'` literal under expo-router 55 — the
  two new literals are guarded by a SOURCE test (proved red), ⛔ by `tsc` (AC7's "tsc checks the literals" is met only in that sense).

### Completion Notes List
- Ultimate context engine analysis completed - comprehensive developer guide created (create-story, 2026-11-21, at `90535934` via `0bb128df`).
- **Governance first (AC1):** author-commit `2026-11-22-494` committed ALONE (`77c23484`) — DL1–DL14 as answered, amending `-482`
  decision 4 by name; then the Task 0 records (`64a410bd`): dated lines at epics.md 3.15 / 3.6 / 13.8 / 13.5, PRD FR-85, the
  `deferred-work.md` sites, the sprint row → `in-progress`. ⚠ epics.md has ⛔ "3.6b" block — the AC the story calls "3.6b's" is under
  Story 3.6 (row `3-6b`); the dated line sits there.
- **Contracts (Task 1):** `members/assisted-code.ts` — request `{ code }` (`^\d{6}$`, strict), responses `{ recorded: true }` /
  `{ recorded: boolean }` (strict — ⛔ worker field), `MEMBER_ASSISTED_CODE_ERROR_CODES`; `referenceCode` removed from
  `VyawasthaShulkConfirmRequest`; both paths + three schemas in `emit-openapi.ts`; `openapi/v1.yaml` regenerated — compared with
  anchors resolved: +1 path, +3 schemas, changed only the confirm path + its request schema; `referenceCode` appears nowhere;
  determinism green.
- **API (Task 2):** `modules/member-attribution/` — DL2's order in one scope tx; the door imported from
  `../field-worker/attribution-code-access.js` (reach fence green, ⛔ ALLOWED edit, export pin unchanged — AC8); a 23505 on
  `member_attribution_member_uq` rolls back and the attempt re-runs in a FRESH tx (new `isMemberAttributionDuplicate`); audit
  `member_attribution.captured` after commit, only on a new row. Domain: `readMemberAttributionForMember` beside the writer. The
  payment confirm's capture block (savepoint + audit) removed; `ok1 = true` right after the receipt (AR-67 unchanged). The fixture's
  `actTestFieldWorker` takes a suspension reason.
- **Tests:** live-DB `assisted-code.spec.ts` 12 legs (AC2: 201 + one row + strict body, 200 repeat, 409 different, 422 + ⛔ row WITH a
  control, 400 ×5, `pending-kyc` may, lock-in 409, 401 ×2, a concurrent pair, two DETERMINISTIC 23505 legs (a held uncommitted
  capture, `waitForBlockedBy`); AC3: another Pariwar 422 + control, a future-dated code 422 + control (replica-mode insert, the
  stamp checked), the GET per member; AC4: six worker states, each seed's state asserted from `field_workers`, six byte-identical
  answers). Domain live-DB: the new read (per member, RLS + control) and the 23505 narrowing. Unit: the one-writer AST gate (AC5). The
  3.6b AC4 legs now prove a `referenceCode` ⇒ 400, ⛔ receipt, ⛔ attribution, and a control confirm writes ⛔ attribution.
- **Mobile (Task 3):** `(signup)/assisted.tsx`; `WIZARD_STEPS` + the `workplace.test.ts` pin; `tc.tsx` → `assisted`; the payment box,
  its state and its two keys removed (en + hi); `signup.assisted.*` en + hi — checked word for word against DL9; ⛔ invisible
  characters in the added lines; api-client `assistedCodeStatus` / `assistedCodeRecord`; `microcopy.yaml` scans the screen (proved
  red). 18 render legs in a real `<LocaleProvider>`: both buttons' props equal, No ⛔ request, recorded / failed / hung (held open,
  ⛔ moved before 5 s) status ⇒ KYC, one request for a double tap, saved then on, format line ⛔ request + server 400, 422 retry or
  skip, 409 ×2 / 429 / 500 / network ⇒ KYC ⛔ message, a hung POST ⇒ KYC at 15 s ⛔ before; the route source check. Full mobile
  suite 2312 green.
- **Records (Task 5):** `friction-budget.md` — ONE new row (the screen, `forced`, never blocking) + the Story 3.15 disposition (the
  payment box removed = friction removed); `deferred-work.md` — "BUILT on the story branch, ⛔ merged" lines at 13.1 C2 / 13.2 C2
  carrying *"capture + resolution for 6-digit codes at signup: Closed by Story 3.15"* (once it lands), and a new 3.15 section: D1 ⛔
  way back into the wizard (F8), D2 ⛔ device pass, D3 the 201-vs-422 signal → FR-86. AC9 sites checked by grep: 13.1 C2, 13.2 C2,
  13.2 C4, 13.1d C4, 13.1c C5 (deferred-work); 3.15, 3.6, 13.8, 13.5 (epics.md); FR-85 (PRD); the two code headers + the contract
  comment.
- ⚠ **Un-attested** ([[feedback_record_unattested_no_backfill]]): ⛔ run on a device or emulator; the Hindi skip label's wrapping and
  the screen-reader announcements are unproven outside jsdom (deferred D2). ⛔ pushed, ⛔ PR.
- **Review follow-up (`bmad-dev-story 3.15`, 2026-11-22, after the review record `34cfa95a`):** all five findings fixed, each leg
  shown RED before the fix (or by a mutation after it), then green:
  - ✅ Resolved review finding [P2]: **R1** — while the POST is open the code box is `disabled` (the repo's `Input` lock, as in
    `nominee-review.tsx`) AND `onChangeText` ignores a change (`busyRef`), so "saved" / the not-found line always sit beside the digits
    that were SENT. Two legs (held POST + an edit ⇒ the value and the sent code stay `482913`; a held 422 ⇒ the line on the sent code,
    the box editable again, the retry sends the new code). Mutation: the `busyRef` guard removed ⇒ both legs red (the mock forwards a
    change to a read-only box, so the guard itself is what is tested).
  - ✅ Resolved review finding [P2]: **R2** — a `focused` state set by `useFocusEffect`; the status read runs only while focused and
    `loading`, the "saved" timer only while focused and `saved`; both cancelled on blur. On re-focus a `loading` step reads again and
    a `saved` step shows its line again, then moves on once (never stuck — N1). The test's `useFocusEffect` mock now BLURS and
    RE-FOCUSES the still-mounted step. Three legs: a late "recorded" read after blur ⛔ moves, re-focus reads again and moves once; a
    failed and a hung-past-the-bound read after blur ⛔ move; the saved timer ⛔ fires after blur, re-focus moves once.
  - ✅ Resolved review finding [P2]: **R3** — the code-entry phase is announced by its label (`signup.assisted.code_label`) through
    the same `useAnnounceOnChange`; the question is ⛔ re-announced. Focus is ⛔ moved (the hook's own rule). One leg; mutation: the
    `code` branch removed ⇒ red. ⚠ A real screen reader is still un-attested (deferred D2).
  - ✅ Resolved review finding [P2]: **R4** — live-DB leg (family 3): a tampered access token (the signature kept, `sub` swapped for
    ANOTHER signing-up member of the same Pariwar), a signup-continuation token, a Pariwar-select token and a validly signed
    `typ: 'system'` token naming the real member and Pariwar ⇒ 401 `auth.session_required` on BOTH routes; a ghost member and the real
    member under another Pariwar's claim ⇒ 409 `attribution.not_signing_up`; ⛔ capture for either member, ⛔ audit line — CONTROL: the
    member's own token ⇒ 201, one row, one audit line. Mutation: the guard's `typ` check disabled ⇒ red (the `system` token recorded
    201); restored, `git diff` empty.
  - ✅ Resolved review finding [P3]: **R5** — the cross-Pariwar leg no longer hopes two random draws differ: Q's code is CONSTRUCTED
    (`unheldCode([ours])`) and inserted by a new `seedWorkerWithCode` helper (owner pool, replica mode, `allocated_at` an hour back or
    ahead — the future-dated AC3 leg now uses it too); a control proves the inserted row resolves in Q (a Q member records it, 201).
    New leg: the SAME digits held in P and Q is legal — a member of each records them (201 + 201, one row each).
  - Dated line 2026-11-23 (code review round 2, P8 b): the blanket *"shown RED before the fix (or by a mutation after it)"* above is stated for R1, R3 and R4, and is evidenced for R2 since this date: with the `focused` gate removed from the status read and from the saved timer, all three R2 legs go red (mutation runs in the round-2 PATCH pass, 2026-11-23, on two states of the screen. On the first — before `goNext` had a focus guard of its own — loosening the two effect guards `if (!focused || stage !== …) return` to `if (stage !== …) return` turned all three R2 legs and the P3 201 leg red. On the FINAL screen `goNext` also refuses a blurred step, so loosening the two effect guards alone turns two legs red ("recorded after blur" and "not recorded in the very instant of the blur"); removing `goNext`'s guard AND both effect guards turns six red (R2's recorded-after-blur, fails-or-hangs and saved-timer legs, two "very instant" status legs and the P3 201 leg); removing `goNext`'s guard alone is red through the "fails in the very instant of the blur" leg. Files restored each time). For R5 it is NOT constructible as a red run: the defect was two independent draws landing on the same six digits (about 1 in 900,000 a run), so no honest failing run exists; the new leg states the legal same-digits case directly, which the old fixture could not. Carried as un-attested, not back-filled.
  - Tests: mobile `assisted-step-render` 18 → 24 legs, full mobile suite 2318 green; `assisted-code.spec.ts` 12 → 14 legs green on
    the story's container; mobile `tsc` + eslint clean on the changed files; ⛔ invisible characters in the added lines.
  - Gate: `ci:local` on a FRESH `twt-3-15-pg` (:5447) — run 1 was 40/41: `integration-tests` never ran (MY `DATABASE_URL` lacked
    `?sslmode=disable`, so `db:migrate` could not connect — ⛔ a code red; the container stayed unwritten); the agent's re-run of the
    job was refused by the auto-mode classifier (`db:migrate`); BigDev ran `ci:local` with the corrected URL: **41/41 green**
    (*"ci:local PASSED — 41 job(s) green"*). Code committed `f1a5e585`. ⛔ pushed, ⛔ PR. A device pass is still owed (deferred D2).
  - Dated line 2026-11-23 (code review round 2, P8 c): the 41/41 above is NOT anchored to a commit. Task 4 and ledger `2026-11-22q` anchor an earlier 41/41 at `e3105ae7` (before R1–R5). This run is not timestamped; `f1a5e585` was committed 26 s before `468f4d3f` (23:38:19 and 23:38:45), so it very likely ran on a working tree that preceded `f1a5e585`, but the record does not say whether that tree is the one that became `f1a5e585`. It is carried as "41/41 on a working tree that probably preceded `f1a5e585`, identity with that commit not attested", and is to be superseded by the `ci:local` run of this branch's push (the pre-push hook, on a fresh container), whose result goes in the landing records — it is NOT claimed here.

#### Review round 2 — patch pass (2026-11-23)

BigDev: *"apply all patch, then run adversarial on patches applied and apply patches, open pr, land once actions report is green."*

- Applied P1–P8 (Review Findings — round 2). Governance first: decision `2026-11-23-495` alone (`b3d3fb0d`; a one-line quote fix `25390bdd`, also alone), then the review record (`8a14c3cb`), then the patches.
- The PATCH diff was itself reviewed before commit (the repo's rule — a fix is not trusted on its tests): two rounds, three layers each (Blind, Edge, Auditor), all read-only. Round 1 of that review found and these edits fixed: the saved / error lines could be spoken while the step was blurred (now mounted only when focused); `goNext` could move a blurred step in the instant before the blur cleanup (a synchronous `focusedRef`); the box unlocked before the move allowed a second request (`exitingRef`); the P7 test could not see `accessibilityState` on Skip (the Button mock now carries it); 429 and 400 after blur were untested; two quotes had dropped a negation marker (the PRD annotation and `-495`); a deferred-work line re-opened a question `-460` item 4 had closed; a roster line said "built by" for a count that is not built. Round 2 found and these edits fixed: a status read answering "not recorded" in the instant after the blur would speak the question over another screen (the `focusedRef` check now covers that branch); the `exitingRef` guard and the 15 s timeout path after blur had no leg; my R2 mutation evidence no longer matched the final screen (restated above); a resolution sentence said a file "is not edited" that was edited; a count of sites was wrong.
- Not decided here, by BigDev's instruction to apply all: P7 (Skip enabled during the POST) stays as written; BigDev may overrule it. A POST already on the wire is not aborted, so Continue-then-Skip may still record the code (deferred D4).
- Verified on the final tree: mobile `assisted-step-render` 24 → 38 legs green; full mobile suite 2332 passed (118 files); `assisted-code.spec.ts` 14 → 15 legs and the one-writer fence green on the story's container (:5447); `tsc --noEmit` and eslint clean in `apps/mobile` and `apps/api`. Mutations (each run, restored, `git diff` unchanged by the mutation): see P3, P4, P5, P7 and the R2 line above.
- NOT run here: `ci:local` for this tree — the pre-push hook runs it on push, on a fresh container; its result and the GitHub CI result go in the landing records, not here. No device pass (deferred D2, W1, W2).
- First push attempt (2026-11-23): the pre-push hook's `ci:local` (fresh container `:5448`, tree `3fefcae1`) failed ONE job, `test (unit)`: `assisted-step-render.test.ts > AC6 — the question > renders Yes and No as two buttons of EQUAL weight` saw `announce` called 0 times. The other 40 jobs passed, including `integration-tests` (API: 250 files, 3413 tests, with this story's spec and the one-writer fence); the API unit task showed "failed" only because turbo cancelled it when mobile failed. The push was refused and nothing reached origin. Cause — inferred from the failing assertion, NOT reproduced (the file passed alone, 8 times in parallel, and 6 times under 16 busy loops): `ask()` returned as soon as `findByTestId` saw the node, and the question is spoken from a passive effect that React can flush a macrotask later on a loaded machine. Fix: `ask()` settles before it returns, and the one new leg of mine with the same shape does the same (test-only, commit `fix(3.15): the flaky wait…`). The same assertion passed in the earlier 41/41 runs because the race depends on load. The next push's `ci:local` is the evidence that it holds; it is not claimed here.

### File List

Governance / records: `.decision-log.md`, `_bmad-output/implementation-artifacts/3-15-assisted-signup-field-worker-code.md`,
`_bmad-output/implementation-artifacts/deferred-work.md`, `_bmad-output/implementation-artifacts/sprint-status.yaml`,
`_bmad-output/planning-artifacts/epics.md`, `_bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md`, `friction-budget.md`,
`microcopy.yaml`. Touched again at code review round 2 (2026-11-23): `docs/launch-gate-inventory/inventory-roster.md` (Row 51, one dated line), `_bmad-output/implementation-artifacts/13-1d-field-worker-move-requests-and-notices.md` (one bracketed dated note), `apps/mobile/app/(signup)/assisted.tsx`, `apps/mobile/tests/unit/assisted-step-render.test.ts`, `apps/api/tests/integration/member-attribution/assisted-code.spec.ts`, `apps/api/tests/integration/_field-worker-fixture.ts`.

Contracts / OpenAPI: `packages/contracts/src/members/assisted-code.ts` (new), `packages/contracts/src/members/index.ts`,
`packages/contracts/src/payments/vyawastha-shulk.ts`, `packages/contracts/scripts/emit-openapi.ts`, `openapi/v1.yaml`,
`packages/contracts/tests/members-assisted-code.test.ts` (new).

Domain: `packages/domain/src/payment/attribution-write.ts`, `packages/domain/src/payment/index.ts`,
`packages/domain/src/schema/member_attribution.ts` (comments only), `packages/domain/tests/integration/payment/vyawastha-shulk.spec.ts`.

API: `apps/api/src/modules/member-attribution/{handlers,routes,index}.ts` (new), `apps/api/src/server.ts`,
`apps/api/src/modules/vyawastha-shulk/handlers.ts`, `apps/api/src/audit/audit-sink.ts` (comment),
`apps/api/tests/integration/member-attribution/assisted-code.spec.ts` (new), `apps/api/tests/integration/_field-worker-fixture.ts`,
`apps/api/tests/integration/vyawastha-shulk/vyawastha-shulk.spec.ts`, `apps/api/tests/unit/member-attribution-one-writer.test.ts` (new).

API client / i18n: `packages/api-client/src/index.ts`, `packages/i18n/locales/en/common.json`, `packages/i18n/locales/hi/common.json`.

Review follow-up (v1.6) touched only files already listed: `apps/mobile/app/(signup)/assisted.tsx`,
`apps/mobile/tests/unit/assisted-step-render.test.ts`, `apps/api/tests/integration/member-attribution/assisted-code.spec.ts`.

Mobile: `apps/mobile/app/(signup)/assisted.tsx` (new), `apps/mobile/app/(signup)/tc.tsx`, `apps/mobile/app/(signup)/payment.tsx`,
`apps/mobile/app/(signup)/_layout.tsx` (comment), `apps/mobile/lib/wizard-steps.ts`,
`apps/mobile/tests/unit/assisted-step-render.test.ts` (new), `apps/mobile/tests/unit/workplace.test.ts`.

## Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-21 | Created by `bmad-create-story 3.15` in its own worktree, stacked on `governance/registration-change-2026-11-21` (`0bb128df`). §0 applied: PQ1 (is the member told about a worker's status) is the Panel's, inherited from 13.8 C2 — correcting `-482` decision 4's "⛔ Panel question"; credit left to 13.5 (N4); ⛔ migration. DL1–DL13 PROPOSED. ⛔ Code. |
| 1.1 | 2026-11-22 | Both branches rebased onto `origin/main` `aa17300a` (BigDev: "rebase both branches onto main"); the governance tip `0bb128df` is now `47b656d6`. The pin (`baseline_commit` and the PINNED comment) moves to `47b656d6`; Task 0.1's ancestor check names `47b656d6`; F12's decision floor re-read: next free ≥ `-493`. ⛔ F-fact re-traced (Task 0.1 still does that against `90535934..origin/main`). |
| 1.2 | 2026-11-22 | Validate pass (`bmad-create-story validate 3.15`, on its worktree, at `99922af1`): re-pinned to `99922af1` (the governance branch LANDED, PR #336 — ⛔ stacked); F7 corrected (codes are allocated at REGISTRATION ⇒ a `pending_kyc` worker holds one; AC4 now six states); the inherited *"FR-85 is applied HERE"* quoted in full and recorded as MOVED to 13.5 at every site (DL11, DL12 — ⛔ "discharged"); the Panel-ruled worker count (`-459` Q2 A, 13.1d C4) surfaced as DL14 (F13); 13.2 D2 shown ⛔ triggered; Task 2.3's fixtures re-pointed to the `apps/api` fixture (⛔ domain tests); the api-client, `emit-openapi.ts`, a new domain read, the rate limit, the lock-in gate, the stale code comments, DL6's epics-block wording and FR-86 named; PQ1 gets its own deciding fact. ⛔ Code. |
| 1.3 | 2026-11-22 | PQ1 RULED A by the Panel (DR and KB; BigDev asked directly: *"by DR and KB / go with option A."*) — Decision `2026-11-22-493`, Trustee-ratified, committed alone at `c88268f5`. Task 0.3 dropped; AC1, §0, N2, F12 (next free ≥ `-494`), DL4, Task 0.4 / 0.5 updated. ⛔ built behaviour changes (DL4 was already A). ⛔ Code. |
| 1.4 | 2026-11-22 | DL14 ANSWERED A by BigDev (*"DL14 A"*): the `-459` Q2 A worker count is MOVED to Story 13.5 (with 13.2's D2); ⛔ built here, ⛔ migration. §0, F13, DL12's 13.1d C4 / 13.5 lines, DL14, Task 0.2, AC9 updated. Task 0.4's author-commit records it with DL1–DL13. ⛔ Code. |
| 1.5 | 2026-11-22 | `bmad-dev-story 3.15`: Task 0 (author-commit `-494` alone; DL1–DL13 answered — *"Accept all"*, DL9 *"Approve as written"*, DL6 *"remove it"*; dated lines), Tasks 1–3 built (contracts + OpenAPI, the member-attribution module, the payment step's capture removed, the `assisted` wizard step), Task 4 gates, Task 5 records (friction-budget row + disposition, deferred-work). Status → review. |
| 1.6 | 2026-11-22 | Review follow-up (`bmad-dev-story 3.15`): addressed code review findings — 5 items resolved (R1–R5; review record `34cfa95a`, code `f1a5e585`). R1 code frozen while pending; R2 status read + saved timer bound to focus; R3 code-entry phase announced; R4 hostile-bearer denial legs; R5 deterministic cross-Pariwar fixture + same-digits leg. `ci:local` 41/41 on a fresh container (run by BigDev). Status → review. |
| 1.7 | 2026-11-23 | Code review round 2 (`bmad-code-review 3.15`, on its worktree, two chunks, three layers each, at `468f4d3f`): 0 decision-needed, 8 patch (P1–P8), 3 defer (W1–W3), 24 dismissed; BigDev: *"apply all patch"*. P1: decision `2026-11-23-495` (`b3d3fb0d`, with a one-line quote fix at `25390bdd`), each committed alone. Review record `8a14c3cb`. P2–P8 applied (see Review Findings — round 2). Also records, retroactively, round 1's review record (`34cfa95a`, row `review` → `in-progress`), which had no Change Log row. The patch diff itself was reviewed in two rounds (three layers each) before commit — see the Dev Agent Record, "Review round 2 — patch pass". Status stays `review` until the landing. |
