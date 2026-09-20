---
baseline_commit: da823aeb
---

<!--
BASELINE — `governance(6.18): Task 0 …`. The Panel's rulings this story builds are in `.decision-log.md` as
`2026-09-20-229` … `-232` (all UNCOMMITTED when this file was written).

⚠⚠ EVERY CLAIM BELOW ABOUT STORY 6.18 IS AGAINST ITS UNCOMMITTED WORKING TREE on `story/6-18-nominee-name-check`
(`returnToDistrictAdmin`, `getLiveReturnRow`, migrations 0116–0118, the keys `claim.check_nominee_name` /
`claim.view_nominee_name_check`). 6.18 is `in-progress` with 73 open review patches and its Tasks 5, 6, 7 RE-OPENED.
Re-run `git diff --name-only da823aeb..HEAD -- packages apps scripts` and re-read 6.18's `### Review Findings` before Task 1.

STATUS IS `backlog`, NOT `ready-for-dev` — a DELIBERATE deviation from the create-story default, recorded in
`-232` consequence 2: nine Panel questions (K L M O P Q R T U, plus N as a confirm) are open and a developer cannot safely start.
"A story a developer cannot safely start is not ready."

GLYPH REGISTER: `⛔` sits ONLY on a negation word (NOT / no / never / don't); `⭐` = key fact or action; `⚠` = hazard.
ADDRESSING RULE: no `file:NNN` pointers into `.decision-log.md`, `deferred-work.md` or `sprint-status.yaml` (newest-first — every
prepend rots every number). Cite decision ids, clauses, item headings and row keys. `file:NNN` is used ONLY for code, and the
6.18 line numbers rot when its patches land — the function names are the stable handle.
LETTERS: `D1`…`D14` are 6.19's own author decisions; the Panel's open questions keep the letters `-232` gave them (K L M, and N as a
confirm) and continue (O P Q R T U); other stories' letters are qualified (`6.18 D1`, `6.16 D-F`).
VALIDATION: v0.2 applied a fresh-context validator's findings (Change Log). Its claims were re-verified in the tree before applying.
-->

# Story 6.19: The Correction-Return Reminders, the Posted Letter and the Closure `[SURFACE]`

Status: backlog

> **Not in `epics.md`'s story list.** Commissioned by the Trustee Panel (Dhiraj Rahul + Kalpana Bharti) on 2026-09-20 through the
> follow-ups to Story 6.18's code-review decision D2 — decisions `-229` → `-232` — and by BigDev's own call, the same day, that the
> build is **its own story** (*"Create another story"*, `-230`). Like 6.17 and 6.18 it needs a `> ⚠ Minted by…` header in
> `epics.md` and the Epic 6 retrospective stays `done` (Task 0).
>
> ⭐ **6.18 must not go live without 6.19.** Until this ships, a claim the Pariwar Admin has sent back waits forever if the family
> never answers — the outcome the Panel ruled against. Nothing is live today (`-232` consequence 5).

## The rulings this story builds — verbatim keys, and OUR reading of them

⚠ Each ruling is one compact sentence. The **reading** column is ours and is ⛔ **not ratified**; every place it could be read another
way is a numbered Panel question in *⚖️ Open Panel questions*. Verbatim text lives in `.decision-log.md`.

| Decision | The Panel said (verbatim, typos as relayed) | Our reading |
|---|---|---|
| `-229` | *"option C, Allow refusal only after a waiting period of 90 days with system sending and recording that enough reminder has been sent. For intial 7 days daily, therafter twice a week for a month, thereafter once a week."* | 90 calendar days; reminders recorded; daily days 1–7, twice a week for the next month, then weekly. |
| `-230` 1–5 | *"both … Use standard channel"* · *"Day claim was sent back, yes second return restart the clock."* · *"All reminders sent and delivered. If number is dead a letter will be sent by District Admin on physical address, tracking number needs to be entered … Delivery date should be updated in system with screenshot within 14 days of sending letter … If no action taken within 30 days one more letter …"* · *"Until claim is corrected or 90 days lapsed."* | Reminders go to the District Admin **and** the family; a dead number is answered by posted letters. |
| `-231` | *"system should not auto close instead it remind the District Admin for closure, following with Pariwar admin approves the closure."* · *"Yes it's the second refusal"* · *"Channel reports invalid. Address is mandatory in claim filing form. We will have reminder after 7 days for district admin for updation daily until 12th day, thereafter escalated to Pariwar admin."* · *"30 days since delivery, 90 days enough."* · *"Claendar days"* · *"Reaplced by one reminder after 30 days since delivery"* | ⭐ **The system never closes a claim.** The closure is the **second refusal** and is ⛔ not appealable. |
| `-232` | *"either the family in the app, or the helpline operator"* · *"Address of both nominee and claimant if they are different person. Also capture name of claimant and mobile"* · *"Yes pariwar Admin can decline to approve a closure with note, escalate it to Superadmin."* · *"Once daily until for next 7 days then escalate"* · *"Yes, that's right."* (**J** — ⭐ **ratifies our parse of `-231` F**: the District Admin's regular reminders are replaced by ONE reminder 30 days after the first letter's delivery) | Address (+ claimant name/mobile) captured **at claim filing**; the Pariwar Admin may **decline**; the day-90 reminder runs 7 days, then escalates. |

**⭐ `-231` supersedes `-230` clause 3's last sentence ("auto closure").** `-230`'s title and consequence 1 are kept as written and
point to `-231`; this story is built against `-231`.

## Story

As the **District Admin** (with the **Pariwar Admin** above me), I want a claim that has been sent back for a bank-name correction to
be **chased on a fixed, recorded schedule** — reminders to me and to the family, a posted-letter track when the family's number is
dead, and a closure I can request and the Pariwar Admin decides once 90 days have passed — so that a family is **never refused for
silence without having been reached**, and a claim **never waits forever**.

## ⭐ THE INVARIANTS — read these first; every AC below serves one of them

1. **⛔ The system NEVER closes a claim.** It reminds and escalates; a **human requests** the closure (District Admin) and a **human decides** it (Pariwar Admin approves, or declines with a note → Super Admin). No job, sweep or timer may call the closure writer. (`-231` B)
2. **⛔ A corrected claim is never closed as "no response".** The closure request **and** its approval each re-check `isReturnedClaimResubmitted` under the trustee lock (AC6).
3. **⛔ Never write `delivered` for an accepted send.** A reminder record says what is KNOWN; `delivered` only when a real signal arrived (T1).
4. **⛔ No name, ever, in a family reminder** — a non-name reference only (T6).
5. **⛔ `voteOnFrozenClaim` is untouched** — the closure goes through a NEW writer (T2).
6. **⛔ Ordinary refusals keep 6.16's one appeal.** Only the closure is unappealable (AC7).
7. **⛔ A new claimant PII surface is Tier-1, gated, audited, and has no erasure path yet** — record the gap, do not fix it (T8).

## 📜 Policy meaning (AI-10-1)

⭐ This story introduces **two predicates that gate a member's claim**: *(1) a sent-back claim may be closed only 90 calendar days after
it was sent back, and only through a human request and a human approval; (2) a claim closed for no response cannot be appealed.*

**The sentence, in the family's terms (ours, for the Panel to correct):** *"If your bank details need correcting we will remind you
regularly, and if we cannot reach you by phone we will write to you by post. If we have still not heard from you after 90 days, the
District Admin may ask for your claim to be closed, and the Pariwar Admin decides. A claim closed for no response cannot be appealed."*

**Checked against the Niyamavali? ⛔ NO — and here is why.** `docs/legal/` is **absent from the public repo by design**
([[project_legal_corpus_private_repo_split]]); the planning-docs pass that could read `docs/legal/niyamavali.md` found **nothing** on
non-response, closure or timelines in it; and the Niyamavali is an agent-drafted design reference, **⛔ not ratified and never a
blocker** ([[feedback_niyamavali_rulebook_not_spec]]). The sentence was checked against decisions `-226` → `-232` instead. ⚠ It **does
tension with the PRD**: FR-43A makes internal appeal the *primary* grievance path and only Stage 3 non-appealable, and 6.16's own
Given requires counsel's procedural-fairness review (Story 0.13) before go-live — the ruling amends neither. ⇒ **Q-S** (a go-live
gate, ⛔ not a build blocker).

## 🎯 What already EXISTS — re-derived 2026-09-20 (⛔ do not rebuild any of it)

**The return the reminders key off (6.18, UNCOMMITTED).** `returnToDistrictAdmin` (`packages/domain/src/claim/state-trustee-decision-persist.ts`)
writes ONE `claim_state_trustee_decisions` row, phase `correction_return`, outcome `returned_for_correction`, **no event, no state
move**; `getLiveReturnRow` (module-private; the exported accessor is `getLiveCorrectionReturn`) returns the live row (`superseded_at IS NULL`) and its **`decidedAt` is the day the claim was sent back** —
the 90-day clock's anchor; a second return is a new row, ⭐ so a new clock **for free**. The partial-unique index is one live per
(claim, phase).

**"Corrected" is a DIFFERENT predicate from "the row is superseded".** The return row is superseded **only** by the Pariwar Admin's
next vote (`voteOnFrozenClaim`, the conditional `UPDATE … WHERE superseded_at IS NULL`). "Corrected" is `isReturnedClaimResubmitted`
(two live accounts, all `updated_at` later than the return's `decidedAt`, and a current passing name check). ⛔ Keying the stop on
"row superseded" alone keeps reminding a family that has already corrected.

**The dispatch primitive — compose, never edit.** `dispatch(alert, deps)` (`packages/channels/src/dispatch.ts`) walks the ladder
`push → whatsapp → sms` (+ a Telegram side-channel, announcements only). `apps/jobs/src/scheduler/contribution-notify.ts` is the ONE live
caller (`fanOutAlert`, `fanOutAlertToMembers`; `backoffMs: []` so pg-boss owns retry). `packages/channels/src` is a **frozen surface** (the
`channels-determinism` gate is the tripwire). The `Alert` category set is a strict discriminated union — a 10th category redefines
FR-71's "7 push categories". Resolvers (`packages/domain/src/notifications/delivery.ts`) are **member-centric**: `resolvePushTargets`
takes `principalType 'member'|'admin'`; `resolveWaTarget` / `resolveSmsTarget` / `resolveTelegramTarget` are member-only.

**The scheduler analogue.** Pending-match retry (Story 9.10, `runPendingMatchRetrySweep`) and the deadline-reminder sweep
(`runDeadlineReminderSweep`) in `apps/jobs/src/scheduler/contribution-notify-triggers.ts`: a cross-tenant BYPASSRLS scan with `ORDER BY`
and a bounded batch that alarms at the cap, per-entity try/catch, a child queue, a keyed-store claim, a trimmed result, and a throw on
undelivered so pg-boss retries. Registration is `boss.createQueue` → `boss.work` → `boss.schedule(queue, cron, {}, {tz:'Asia/Kolkata'})`,
with queue names in `packages/queue/src/index.ts` `QUEUE_NAMES` and `boot.ts`. The clock convention is `deps.now?.() ?? new Date()`.
**Calendar-day math:** `packages/domain/src/cycle-calendar/holiday-resolver.ts` — `istDateOf`, `addCalendarDays`, fixed +05:30, ⛔ no
`setDate`.

**Documents.** `ClaimDocumentStorage` (`put | getBytes | signedReadUrl | delete?`, `packages/contracts/src/claims/documents.ts`), the GCS /
local-fs / in-memory adapters in `packages/platform-adapters`, the instance `deps.claimDocumentStorage`; keys
`pariwar/{pariwarId}/claim/{claimCaseId}/{documentType}/{documentId}`; limits `CLAIM_DOCUMENT_ALLOWED_MIME_TYPES` (jpeg, png, pdf) and
`CLAIM_DOCUMENT_MAX_BYTES` (10 MiB), enforced in the handler before `put`; the staff-upload precedent is the helpline
`POST …/claims/:claimCaseId/documents` (multipart, `request.file()`); signed reads are TTL-limited (`claims.verifier-console.handlers.ts`).

**Closure vocabulary.** `claim.state_trustee_denied` (an edge from `state_trustee_freeze` only) and `claim.denied_no_appeal` — an
**identity annotation** (`requireIdentityTransition`, payload MUST carry `deceased_member_id`), emitted **only** by the stage-3 uphold
(`appeal-persist.ts`), consumed **only** by the account-frozen overlay unfreeze (`ACCOUNT_UNFREEZE_EVENT_TYPES` in
`packages/domain/src/member/overlay.ts`). 6.16 D-F: **exactly one appeal journey per claim, ever** (a unique constraint on
`claim_appeals.claim_case_id`); an appeal starts only from `denied`.

**Recipients.** The District Admin = the live `claim_shepherd_assignments` row (`shepherdActorId`, one live per claim). `users.contact_phone`
exists (`schema/users.ts`) and has **no dispatch resolver**. The Pariwar Admin recipient: **no accessor exists** that lists actors by role
and scope for notification. ⭐ Only **admin push** (device tokens, `principalType 'admin'`) is reachable today.

## ⚠ THE TRAPS

**T1 — "delivered" is ⛔ NOT attainable today, and 6.19 must ⛔ never write it for an accepted send.** SMS: `sms-dlt.ts` — *"The gateway
gives NO synchronous delivery receipt at accept time (no DLR seam in v1)"*; no SMS DLR webhook or table exists. WhatsApp: the Meta status
callback (`apps/jobs/src/wa-webhook-processor.ts`) writes `whatsapp_send_status` keyed by `wamid`, with **no claim or reminder linkage**,
**nothing seeds a row at send time**, and `MemberFanOutResult` **drops `providerMessageId`** (`grep providerMessageId
contribution-notify.ts` is empty). Push: token invalidation only. ⇒ The Panel's *"sent **and delivered**"* cannot be attested for SMS
without new integration; the best honest signals are `accepted` and a **send-time `invalid_number` rejection** (`sms-errors.ts` — its codes
are marked INDICATIVE and unverified against the real gateway). ⇒ **Q-O.** Use closure language precisely
([[feedback_closure_language_precision]]): a reminder record says what is KNOWN, and `delivered` only when a real signal arrived.

**T2 — ⛔ do not loosen `voteOnFrozenClaim`.** It blocks **both** approve and deny while a return is live and unresubmitted. The closure goes
through a **NEW writer**; amending the deny path would let an ordinary deny skip the "awaiting correction" block.

**T3 — appeal eligibility is read in THREE places, all of which must learn the closure:** `assertAppealInitiable`
(`packages/domain/src/claim/appeal-eligibility.ts` — `current_state === 'denied'` + no `claim_appeals` row), `can_initiate` in
`apps/api/src/modules/claims/claims.appeal.handlers.ts` (`claimRow.currentState === 'denied' && journey === undefined`), and the mobile
`AppealStatusCard` + the `can_initiate` contract (`packages/contracts/src/claims/appeal.ts`). Updating one leaves the UI offering an appeal
that 409s (`appeal.not_denied`).

**T4 — the overlay.** A `denied` claim with no `denied_no_appeal` leaves the deceased's account frozen forever; `denied_no_appeal` must carry
`deceased_member_id` ([[project_claim_overlay_unfreeze_seam]]). ⚠ A NEW lifecycle state or unfreeze type would trigger the standing
`NOT_DECEASED` re-examination fence ([[project_death_is_an_overlay_not_a_state]]) — **D1 adds neither.**

**T5 — the reminder record is ⛔ NOT `idempotency_keys`.** The keyed store has a TTL and `purgeExpiredKeys` (`boot.ts`) deletes lapsed rows
regardless of status; `recordResult` does not extend `expires_at`. It is an idempotency **guard**, not an audit record. A short TTL also
re-opens the slot and **re-sends**.

**T6 — the family message ⛔ never names anyone.** The existing pool reminders NAME the family (`resolvePoolIdentity`); 6.19's rule is the
**opposite** — ⛔ do not reuse it. `claim_status_change` carries `{claim_id, new_status}` and has a deep-link case, but renders English-only
static copy; Hindi copy rides inside payload strings the producer resolves with `t()`, `DEFAULT_LOCALE` is `hi`. The `microcopy` gate scans
`notify.*` and a literal panic word breaks it. Tone: warm-formal, never dunning — architecture's *witness, not bailiff* and UX Stance #5 (*no punitive auto-action*). ⚠ **`render.ts`'s headings are STATIC ENGLISH and neither candidate category can carry a Hindi, name-free reminder:** `deadline_reminder` renders "Deadline reminder / {subject} — due {deadline_display}" (and deep-links to `renewals` when there is no `pool_id`), `claim_status_change` renders "Your claim is now {new_status}" — so the message rides `alert_published`'s `{title, body}` (D7). ⚠ **`Alert.member_id` is a REQUIRED UUID** (`packages/contracts/src/alerts/alert.ts`), and a family recipient — in Ravi-mode the app session IS the deceased member, and `claimantActorId` is null — has no member identity: the existing member fan-out would address the **deceased's own** account. The developer must define the recipient path (D7).

**T7 — a family reminder can resolve to NO target.** WhatsApp is dual-gated (a per-Pariwar toggle plus an ACTIVE member opt-in within the 24h
Meta window, user-initiated only); SMS is restricted (PRD §4.10: OTP, step-up OTP, per-member WhatsApp-failure fallback, degraded-mode bridge
— ⛔ no bulk-alert SMS; architecture §3.4: members without a WA opt-in get push only, ⛔ no transactional-fallback SMS — while Story 5.6 AC(c)
sends SMS when "no opted-in higher-tier channel" — **the two planning statements disagree**); a nominee is **not necessarily a member**, so
no opt-in state may exist; lifecycle-driven dispatch suppression mutes member-class push for `claim-filed-frozen` accounts and **"claim-shepherd
communications continue"** — ⚠ this is architecture PROSE, ⛔ not live behaviour — no caller passes `suppression` to `dispatch()` today (grep), so the no-op default applies, and classing matters only if it is wired; cost-suppression (AR-18; `costToggleEnabled` is fail-safe `false`, so off unless enabled) can drop a WA send if the
member acted in-app within ~6h unless the category is `time_critical`. ⇒ **Q-P.**

**T8 — claimant data is a NEW PII surface.** The system holds **no claimant personal data**: only `claimantActorId` (`null` on the helpline path
— `claims.helpline.handlers.ts` — and defaulting to `null` on the member path, INFERENCE: not traced end to end) and a relationship label; the
filing contract says *"never the claimant's PII"* on `ClaimantRelationship` — ⛔ leave that comment untouched (`-232` consequence 3). Tier-1
(`piiColumn(1, …)`), never logged, never echoed except through a gated, audited read. **⛔ No RTBF path exists for a claimant**
(`member/anonymize.ts` mentions no `claim*` table; `claim_nominee_bank_accounts` and `claim_documents` are not anonymized either) — **record the
gap, ⛔ do not fix it here.** Contracts ⛔ never import `@twt/domain` ([[project_contracts_domain_bundle_boundary]]).

**T9 — a non-appealable closure is ⛔ NOT a non-refileable one.** `getClaimByDeceasedMember` deliberately filters out `CLAIM_TERMINAL_STATES`
(`settled`/`denied`) — *"a death whose earlier claim already reached a terminal outcome must be able to re-file (e.g. a fresh claim after
`denied`)"*. A family whose claim was closed for silence can **file a new claim for the same death**. ⇒ **Q-Q.**

**T10 — sequencing.** 6.18's `TRUSTEE_RETURNABLE_STATES` still lists `state_trustee_approved` (its D1 removes it) and `state_trustee_denied` has an edge
only from `state_trustee_freeze`: the closure is reachable from `verifier_approved` / `reversed` / `state_trustee_freeze` **only after 6.18 D1
lands**. Migrations are numbered **0119+ only after 6.18 lands** (0116–0118 are untracked). A live return and a route-to-R9 can coexist today
(neither checks the other — 6.18's patch): the closure writer **refuses** a claim with a live routing row (a typed 409). ⚠ `hasLiveRoutedRow` and `getLiveReturnRow` are **module-private** in `state-trustee-decision-persist.ts`; the **exported** accessors are `getLiveCorrectionReturn`, `hasLiveReturnRow` and `isReturnedClaimResubmitted` — export the routing check, or place the writer in that module.

**T11 — `commitCycleFreeze` excludes a live return row.** A closure the Pariwar Admin **declines** keeps the claim under correction and
uncommittable; what happens next is the Super Admin's and is ⛔ ruled nowhere (Q-K).

## ⚖️ Decisions — the AUTHOR's (BigDev's; ⏳ PROPOSED here, confirmed in Task 0 as an author-commit like `-228`)

⛔ None of these is the Panel's — each is "the code should do X" (the Panel-routing §0 gate) — **except D3**, whose exact reminder days fix what a family receives: it is carried in the routing batch as a **confirm**, ⛔ not left as our unchallenged reading.

- **D1 — closure modelling: `denied` + `denied_no_appeal` through a NEW writer, ⛔ no new state.** *Options:* (a) `denied` + an appeal-ineligibility marker; (b) `claim.denied_no_appeal` alone (an identity annotation, so it needs `denied` first — a complement, not an alternative); (c) a new terminal state (a 33rd event, `ALTER TYPE claim_lifecycle_state`, the `filing.ts` mirror, the events registry, `CLAIM_TERMINAL_STATES` consumers in ICP and the shepherd, member copy, and the `NOT_DECEASED` fence). ⭐ **(a)+(b) is recommended** — closest to precedent (stage-3 uphold already pairs `denied` with `denied_no_appeal`), lowest blast radius: the new writer, on a **new claim-scoped closure table**, supersedes the live return row (conditional `UPDATE`), then emits the existing `claim.state_trustee_denied` chain (`state_trustee_frozen` from `verifier_approved`/`reversed`, then `denied`), then `claim.denied_no_appeal` (`trigger: correction_closure_approved`, carrying `deceased_member_id`) — **one scope-tx under the trustee advisory lock**. The three appeal sites (T3) additionally refuse when a `denied_no_appeal` event exists in the claim's stream — the event **is** the marker. *Cost:* one migration, the writer, three appeal-site edits, a mobile status string, and a reason code (`other` + rationale, or `ADD VALUE` in its OWN migration).
- **D2 — the reminder record is a dedicated append-only table**, keyed `(return decision_id, schedule slot, recipient kind)` with a UNIQUE key (at-least-once redelivery), carrying `attempt_state` and a `delivery_state` that only a real signal fills. ⛔ Not `idempotency_keys` (T5), ⛔ not a claim event (the 6.18 return deliberately mints none). Own RLS policy file, own hand-authored migration.
- **D3 — the schedule is a pure function of `decidedAt`, computed in IST calendar days, from a DATA table** so the Panel can change it without code. ⚠ **OUR reading of *"twice a week for a month, thereafter once a week"*:** days **1–7 daily**; **10, 14, 17, 21, 24, 28, 31, 35** (twice a week through day 37); then **42, 49, 56, 63, 70, 77, 84** (weekly); **stop at day 90**. The exact weekdays are ⛔ not the Panel's to have chosen — flag them in the Dev Notes and keep the table trivially editable. **Day numbering:** day 0 = the IST date of `decided_at`; day N = day 0 + N calendar days (so day 1 is the NEXT calendar day); "at least 90 days" means today's IST date ≥ day 0 + 90 — every boundary test uses this. **Catch-up:** a slot whose date has passed with no record is sent ONCE and recorded `late`; older missed slots are recorded `skipped_superseded` — ⛔ no burst of reminders after an outage. Time of day: ⚠ **no quiet-hours or send-window rule exists** anywhere in the PRD, architecture, UX or epics (grepped) — default **one fixed IST slot per day (10:00)**, a constant.
- **D4 — the stop predicate:** the return row is superseded **OR** `isReturnedClaimResubmitted` holds. A **dead number** stops **family** reminders to that number only — ⚠ **WHEN** it stops (on the finding, on the posting, on the recorded delivery) is ⛔ not ruled: `-230` 3 says *"After this reminder sending to dead number, should be stopped"*; our default is **once the first letter is recorded as posted**, and it is **Q-T**. The District Admin's regular reminders are replaced by ONE reminder 30 days after the first letter's recorded delivery (`-231` F, ⭐ **confirmed by `-232` J**).
- **D5 — a NEW claim-scoped contact table**, ⛔ not on `claims` (a lifecycle anchor) and ⛔ not on `intake_attempts`: ICP merges channels onto one canonical `claim_case_id` (`claims.intake_channels` is an array), so a second-channel write goes against the canonical claim, as the bank routes do. Columns: `claimant_is_nominee`, Tier-1 ciphertext for the nominee address, claimant name, claimant mobile, claimant address; `piiColumn(1,'claim_contact')`; own RLS policy file (model: `claim_nominee_bank_accounts`, `policies/claim-nominee-bank-rls.ts`). ⛔ No mobile blind index (no search requirement in the ruling — INFERENCE). `member_nominees.address_ciphertext` stays optional and ⛔ untouched. **No backfill and no legacy path** — *"code is not in production"* (`-232`).
- **D6 — the screenshot reuses the `claimDocumentStorage` PORT with a distinct key prefix (`…/correction-letter/…`), but a NEW table and handler.** ⛔ Do NOT reuse `claim_documents` / `uploadClaimDocument`: the table is OCR-shaped (`parity_outcome`, `parity_flags`, `ocr_confidence`, `verifier_review_required` are NOT NULL; the `document_type` enum is `death_certificate|ground_inspection_photo|hospital_record`; unique per (claim, type)), the upload core enqueues an OCR job and is gated to `UPLOADABLE_STATES`. ⚠ **No virus-scan hook exists** on the claim-document path (only a no-op `StatementScanner` for bank statements) — record it as a gap.
- **D7 — the name-free family message rides an EXISTING alert category: `alert_published`'s `{title, body}`, with producer-resolved en/hi strings** (Story 10.10's precedent; ⛔ not a 10th category). ⚠ **Not `claim_status_change` / `deadline_reminder`:** their headings are static English and the latter deep-links to `renewals` (T6). ⚠ `alert_published` is in `TELEGRAM_ELIGIBLE_CATEGORIES` — a claim-specific message would be **mirrored to any opted-in Telegram chat**: the composition in `apps/jobs` ⛔ runs no Telegram side-channel for it (the mirror is independent in `fanOutAlert`), and a test proves it. **The recipient path:** `Alert.member_id` is required — set it to the **deceased member as the SUBJECT**, but deliver through an **explicit recipient contact** (the nominee's or claimant's mobile from the contact record and `member_nominees.mobile_ciphertext`), ⛔ **never** through `resolveMemberDeliveryContext`, which would address the deceased's own account. The developer names the concrete shape; ⚠ contingent on Q-P (if the standard channel reaches no non-member, this changes).
- **D8 — four permission keys**, each with its own doc-block reuse-check, minted in ONE author-commit decision in Task 0 ([[project_enum_mint_authority_delegated]] covers *tracking* enums only; `PERMISSION_CATALOG_VERSION` is a governance act — `-195` cl.2's reasoning, `-228`'s precedent): (1) **record a posted letter** — district dimension, `district_admin`; (2) **request closure** — district dimension, `district_admin` (one key per governed act — the 6.18 lesson); (3) **decide a closure** — Pariwar dimension, `pariwar_admin` (like `claim.r9_vote` / `cycle.freeze`; direct `state_trustee` gating is RANK-ORDER BLOCKED); (4) **resolve a declined closure** — `super_admin` only (auto-derives the whole catalog; a super-admin-only key precedent EXISTS: `pariwar.manage_drive_target_visibility` (`permissions.ts`, held by `super_admin` ONLY, `-203`)). Names are the developer's, ⛔ not fixed here. Also decide who may READ the closure state: the four holders of `claim.view_nominee_name_check`, or a new read key. District-dimension keys copy `claims.nominee-name-check.routes.ts` (a preHandler stashes the server-derived posting district; the client never submits it).
- **D9 — the claimant's NAME is ⛔ not English-gated.** `-227` cl.9 scoped the gate to the **two names the check compares**; the claimant's name is never compared, and UX-DR57 requires bilingual input. Say so in the doc-block, as 6.18 did for the ungated output schemas.
- **D10 — reminders are classed as claim-shepherd communications** so that, IF lifecycle suppression is ever wired, it does not mute them (T7 — ⚠ it is architecture prose today, ⛔ not live); whether they are `time_critical` (AR-18, and only if the cost toggle is enabled) is decided in Task 4 with a test.
- **D11 — staff channel: admin push + an in-app queue.** No `users.contact_phone` resolver and no Pariwar-Admin-by-role accessor exist (⛔ do not invent WA/SMS to staff); building the accessor is Task 4. ⚠ Staff push reaches only a device that has a token — the in-app queue is the fallback that cannot be missed.
- **D12 — the day-90 escalation target is the Pariwar Admin** (`-232` N, defaulting to `-231` C's pattern — ⚠ `-232` listed N as "put back to the Panel": it is carried in the routing batch as a low-priority **confirm**, and this default stands unless the Panel objects). ⛔ Not the Panel's; recorded so it is visible.
- **D13 — one story or a split (`-232` cl.4: "decided in the story"): WRITTEN AS ONE, SPLIT RECOMMENDED.** BigDev said *"another story"* (singular). It spans **claim filing** (Task 2: the member app, the helpline intake, contracts, a migration) AND the reminder scheduler, the letter record and the closure workflow. ⭐ **Recommended split, decided in Task 0:** **6.19a = capture at filing (AC1, Tasks 1–2)** — it is the letter track's INPUT and carries its own Panel blockers (L, M, U) — and **6.19b = everything else**. ⛔ Not decided here; BigDev's call.
- **D14 — where AC1's 409 lives.** A claim exists from intake (the `relationship` step, `claim.intake_initiated`); there is ⛔ **no server "filing completed" transition** to gate. So: (1) the contact routes reject an incomplete body (**400**, at the contract); (2) the member-app step gate and the helpline card refuse to complete (conveniences only); (3) the **server boundary** is the approval gate — extend 6.18's `assertNomineeNameCheckForApproval` family (P1 / P3 / P4) to also require a contact record → **409 `claim_contact.required`**, and the letter and closure writers refuse without it; a claim that lacks it **waits, ⛔ never denied** (6.18 AC6's shape). ⚠ Extending 6.18's gate reopens code 6.18 is still patching — do it after 6.18 lands. The exact set of gated paths is the developer's.

## ⚖️ Open Panel questions — the PANEL's (Task 0 batches them into routing notes from the TEMPLATE, §0 gate first)

📄 **DRAFTED 2026-09-20 as five notes** in `_bmad-output/planning-artifacts/`, all `trustee-panel-routing-note-2026-09-20-6-19-<slug>.md` — ⛔ **not sent, ⛔ not committed** — **`reaching-the-family`** (P, L, U, M), **`reached-before-closure`** (O, R), **`declined-closure`** (K), **`refiling-after-closure`** (Q) and **`confirm-our-defaults`** (T, N, D3). Each was grouped by the ONE thing it decides (the template is built for one question per note), had its §0 gate applied, and had its E4 commands run (two came back empty and were explained). Q-S (the go-live gate — counsel) is ⛔ deliberately **not** a Panel note. Each carries **what it blocks**.

- **K — the Super Admin's part.** When the Pariwar Admin declines a closure and it goes to the Super Admin: **what does the Super Admin decide** (close anyway, keep open, something else), and **what happens to the claim and its reminders after a decline** (keep waiting, resume, a new period)? *Blocks AC6 (the decline branch), the Super Admin surface, key (4).*
- **L — who is contacted when the claimant is not the nominee.** The reminders and the **letters**: the nominee, the claimant, or both — and to **whose address**? *Blocks AC1 (which fields are mandatory for which recipient), AC3, AC5.*
- **M — the consent basis for the claimant's data.** ⭐ **Who consents** to the Trust collecting a claimant's name, mobile and address and messaging/writing to them — when the claimant is a **third person who is neither the filer nor the nominee**? Consent (a) `claim_time_dpdpa` is *worded* to cover "deceased + claimant + nominee PII" but its policy is *"un-attested-pending a Story 0.13 legal counsel determination … NOT a settled rule"*, its subject is the **deceased member**, it is given once per claim by the **filer**, and its window is pre-adjudication. *Blocks AC1's go-live, not its build.* ⚠ ⛔ Do **not** add a consent type (a `consent_type` extension needs its own `ADD VALUE` migration and a contracts lockstep) and ⛔ do **not** edit the consent copy without the lockstep with `packages/i18n/locales/{en,hi}/claim.json`.
- **O — what counts as "delivered" when the channel gives no delivery report (T1).** The Panel's precondition is *"sent **and delivered**"*; for SMS that cannot be attested. Does **provider-accepted** satisfy it, or must a delivery-report integration be built first? *Blocks AC3's record semantics and AC6's precondition (Q-R).*
- **P — how the family is reached at all (T7).** May the Trust send **SMS** to a family that has ⛔ not opted in — the planning documents disagree, and PRD §4.10 drops bulk-alert SMS? If not, what is the "standard channel" for a nominee who is not an app member? *Blocks AC3.*
- **Q — may a closed claim be RE-FILED (T9)?** The ruling makes the closure ⛔ non-appealable; the intake code deliberately lets a death be re-filed after `denied`. Is a re-filed claim intended to be a way back, or must the closure block it? *Blocks AC7's scope.*
- **R — what must be true before the closure may be REQUESTED?** `-231` D says *"90 days enough"* (about the second letter); `-229` says *"recording that enough reminder has been sent"*; `-230` 3 says *"All reminders sent and delivered"*. **Two readings, put to the Panel:** **(strict)** the family was **reached** — ≥ 1 reminder `accepted` (or `delivered`, when a signal exists) for each family recipient, **or** a letter recorded with a delivery date; **(permissive)** every scheduled slot merely has a recorded outcome, whatever it was. ⚠ **The permissive reading lets a claim close although NO channel ever reached the family** (every slot `no_target` or `error`) — which contradicts this story's own promise (*"never refused for silence without having been reached"*). ⭐ **Default until answered (author's): STRICT.** ⚠ **`no_target` is ⛔ not a "dead number"** (`-231` C: dead = *"channel reports invalid"*) — so a family that no channel can reach would never start the letter track. **Our reading:** a recipient with `no_target` on every slot is surfaced to the District Admin as **unreachable** and the letter track is offered (also **Q-P**). *Blocks AC6, AC3.*
- **T — the exact anchors of the letter track.** `-231` C says *"reminder after 7 days for district admin for updation daily until 12th day, thereafter escalated"*; the Panel did not say **7 days after what**. ⚠ **Our readings, each a default:** (1) reminders to a dead number stop **once the first letter is recorded as posted** (`-230` 3: *"After this … should be stopped"*); (2) the 7-day chase is anchored on the **posting** date, not the dead-number finding; (3) a **day-14 "overdue" flag** (from *"within 14 days of sending letter"*) is **ours, not the Panel's** — shown, nothing more; (4) letters stay recordable **after day 90**, with no further reminders. ⭐ D3's exact reminder weekdays travel with this as a **confirm**. *Blocks AC3, AC4, AC5.*
- **U — how many nominees, and which address?** `member_nominees` holds **1 or 2** declared nominees (a split); the ruling says *"the nominee"*. ⚠ **Default (author's): one address slot per declared nominee, and the claimant fields once**; the nominee's mobile for reminders is read from `member_nominees.mobile_ciphertext` (Tier-1). Is that the intent? *Blocks AC1, AC3.*
- **N — confirm only:** the day-90 escalation goes to the Pariwar Admin (D12).
- **S — a go-live GATE, ⛔ not a build blocker:** the **privacy policy** (`docs/legal/privacy-policy.md` §3 lists nominee "Name, relationship; bank/IFSC at claim time only" and says data is used "only for the purpose stated at collection") needs a stated purpose for a postal address and a claimant's contact, and PRD FR-43A / §4.14 (internal appeal as the primary grievance path) is ⛔ amended by no one. Counsel's (Story 0.13), tracked like 6.16 D-G. ⚠ Retention for the address, tracking number and screenshot is **not found** anywhere — architecture §2.12 leaves the values to counsel.

## Acceptance Criteria

### AC0 — Governance first (Task 0)
**Then** `-229` → `-232` are **committed** before any code ([[feedback_governance_commits_precede_implementation]]); **and** ONE author-commit decision lands the four keys (D8), the closure modelling (D1), the schedule reading (D3) and the D-decisions above; **and** the Panel questions K L M O P Q R are batched into routing notes written from the template, §0 gate first (over-routing is a cost); **and** `epics.md` gains the Story 6.19 entry under Epic 6 with the `> ⚠ Minted by…` header (and the stale "16 stories" / FR list / cross-cutting-AC lines are ⛔ not "fixed" silently — record them); **and** the new loop nodes (letter record, closure request, Pariwar Admin decision, Super Admin path) get `{primary_actor, fallback_actor, escalation_trigger}` entries in the Story 0.7 fallback-handler ledger (AR-61); **and** the sprint row stays `backlog` until K L M O P Q R are answered.

### AC1 — The address and the claimant are captured at filing (`-232` G; **BLOCKED on L, U**; go-live gated on **M**, **S**)
**Given** the family files in the app or the helpline operator files **Then** a new claim-scoped contact record holds the nominee's **postal address (mandatory — one slot per declared nominee, ⚠ Q-U)**, `claimant_is_nominee`, and — **only when false** — the claimant's **name, mobile and address (all mandatory in that case)**
**And** both surfaces have a route each (a member route and a helpline route, `recordHelpline`, as `claims.nominee-bank.handlers.ts` and `claims.dpdpa-consent.handlers.ts` do) — ⛔ not fields bolted onto the intake body, ⛔ not `claims`, ⛔ not `intake_attempts`; a second-channel intake writes against the **canonical** claim
**And** the boundary is enforced where a server transition exists (D14): an incomplete body is a **400**; approval and the letter / closure writers refuse a claim without a contact record (**409** `claim_contact.required`) — a claim that lacks it **waits, ⛔ never denied** ([[feedback_mechanization_split_commitment]]: the member-app step gate is a convenience, the server is the boundary)
**And** the member app extends `CLAIM_STEPS` (`apps/mobile/lib/claim-steps.ts`) **or** `nominee-review.tsx`; ⚠ each screen hardcodes its next-route literal (typed routes) and `apps/mobile/tests/unit/claim-steps.test.ts` pins the exact list and the "N of 6" totals — edit all of them; ⛔ the draft (`lib/claim-draft.ts`) stays **PII-free**
**And** the columns are Tier-1 ciphertext, RLS + FORCE, encrypt-before-insert in the handler; a read DTO exists only behind a gated, audited route and ⛔ echoes nothing to a member or a public surface; ⛔ no log, event, audit line or error body carries a value
**And** `ClaimantRelationship`'s *"never the claimant's PII"* comment is **untouched**, the claimant name is ⛔ not English-gated (D9), and there is ⛔ no backfill.

### AC2 — The clock and the schedule (`-229`, `-230` 2, 4)
**Given** a live `correction_return` row **Then** the clock starts at its `decided_at`, counted in **IST calendar days** (`istDateOf`, `addCalendarDays` — ⛔ never `ceil` of elapsed milliseconds, ⛔ never `setDate`), and a **second return is a new row and a new clock**
**And** a **pure** `correctionReminderSchedule(decidedAt)` returns the slots from a **data table** (D3); it takes an **injectable clock**; every period is testable without waiting
**And** the schedule **stops** when the return row is superseded **or** `isReturnedClaimResubmitted` holds (D4), and at **day 90**
**And** the sweep is idempotent under at-least-once redelivery: a claim per `(decision_id, slot, recipient kind)` released on failure, a per-entity try/catch, a bounded batch that alarms at its cap, `boss.schedule(… {tz:'Asia/Kolkata'})`
**And** a reminder row is written `attempting` **before** the send and moved to its final state **after** it (UNIQUE `(decision_id, slot, recipient kind)`); a row stuck in `attempting` past a timeout is retried by the sweep — ⛔ a crash between the insert and the send must leave neither a phantom "sent" nor a permanently blocked slot; slots follow D3's day numbering and catch-up rule (a missed slot is sent once, `late`; older ones `skipped_superseded`).

### AC3 — The reminder record and the family message (`-230` 1, 3; **BLOCKED on L, O, P, T, U**)
**Given** a slot is due **Then** one row is written to the reminder record (D2) **before** the send, and updated with **what is known**: `accepted`, `rejected(invalid_number)`, `no_target` or `error` — and `delivered` ⭐ **only** when a real delivery signal arrives (T1). Any status not yet attested is stored as **un-attested**, ⛔ never reconstructed after the fact ([[feedback_record_unattested_no_backfill]])
**And** the family message is **name-free**: a non-name **reference** (`claim_case_id` rides `provenance_refs`; INFERENCE — the exact reference form is the developer's), ⛔ no name, ⛔ no bank detail, ⛔ no reason for the mismatch (6.18 AC5: *"no name in that message"*); **en + hi** via the real `t()` (a member-facing namespace: both locales, both imports, the registry lines in `packages/i18n/src/catalog.ts`, and a test resolving a real key); tone per T6
**And** the message is composed in `apps/jobs` over the existing `dispatch()`; ⛔ `packages/channels/src` is untouched; the recipients per **L**, through **new** resolvers for the nominee contact and the claimant's mobile (T7), on D7's recipient path (`Alert.member_id` = the deceased as SUBJECT, delivery to an explicit contact, ⛔ no Telegram side-channel, ⛔ never `resolveMemberDeliveryContext`)
**And** a **dead number** is set from a send-time `invalid_number` rejection (SMS) or an asynchronous failed status (WhatsApp) — ⚠ the SMS codes are INDICATIVE — and family reminders to that number **stop** — ⚠ **when** is **Q-T** (our default: once the first letter is recorded as posted), recorded. ⚠ **`no_target` on every slot is ⛔ NOT a dead number** (`-231` C: dead = *"channel reports invalid"*): the recipient is surfaced to the District Admin as **unreachable** and the letter track is offered (our reading, **Q-R / Q-P**); the dead-number marker is **per return** — a second return re-evaluates it.

### AC4 — Staff reminders and escalation (`-230` 1, `-231` C, `-232` I, D12)
**Then** the District Admin (the live shepherd) is reminded on the same schedule **until** the family's number is dead **and** the first letter's delivery is recorded — then the regular reminders are **replaced by ONE reminder 30 days after that delivery** (`-231` F, ⭐ **confirmed by `-232` J**)
**And** if a letter is posted and the tracking number / delivery date / screenshot are ⛔ not all recorded, the District Admin is reminded **7 days after posting** (⚠ *anchor = posting* is **our reading**, Q-T), **daily through day 12**, and **at day 12 it is escalated to the Pariwar Admin, who calls the District Admin** — the escalation is a **record and a reminder, ⛔ never an automatic action** (AR-63: time-as-actor is non-punitive only); at day 14 an **overdue** flag is shown, nothing more (⚠ the flag is **ours, ⛔ not the Panel's** — Q-T)
**And** the recipients come from D11 (admin push + an in-app queue); the Pariwar-Admin-by-role accessor is built here.

### AC5 — The posted-letter record (`-230` 3, `-231` D; **BLOCKED on L, T**)
**Given** a family recipient has a dead number **Then** the District Admin (key (1)) records a **letter**: posting date, **tracking number**, and — within **14 days of posting** — the **delivery date** and a **screenshot** (D6); there are **at most two** letters per return; the **second** is due **30 days after the first's recorded delivery**, and if **90 days pass before the second is delivered, nothing further is required**
**And** the address is read from the contact record (AC1), per **L**; the screenshot is stored through the `claimDocumentStorage` port with the new key prefix, type and size limits enforced **before** `put`, read back only through a TTL-limited signed URL
**And** the record is **staff-entered evidence**: an un-recorded field is shown as un-recorded, ⛔ never inferred; every write carries its audit line with the actor's snapshotted display name (family 8); **letters stay recordable after day 90**, with no further reminders (Q-T).

### AC6 — The closure: the system asks, humans decide (`-231` B, `-232` H; **BLOCKED on K, O, R**)
**Given** ≥ 90 calendar days since the return (and, per **R**, a complete record) **Then** the system reminds the District Admin **once a day for 7 days**, then escalates (D12); ⛔ **no job ever calls the closure writer**
**And** the District Admin **requests** the closure (key (2)); ⛔ before day 90 it is refused (**409** `closure.too_early`); ⭐ **and it is refused if the claim has been CORRECTED** — `isReturnedClaimResubmitted` is re-evaluated **under the trustee lock** (**409** `closure.claim_corrected`), so a corrected claim is ⛔ never closed as "no response" (a corrected-but-not-yet-voted claim still has a LIVE return row, so the writer's conditional `UPDATE` alone would succeed — the row is superseded only by the Pariwar Admin's next vote, T2)
**And** the Pariwar Admin (key (3)) **approves** — or **declines with a REQUIRED note**, which goes to the Super Admin (key (4)); what the Super Admin decides is **K**; ⭐ **the approval re-checks `isReturnedClaimResubmitted` under the lock too** — the family may correct BETWEEN the request and the approval (**409** `closure.claim_corrected`)
**And** an approval runs the D1 writer: it supersedes the live return row with the conditional `UPDATE` (0 rows ⇒ 409), **refuses** a live routing row (a typed **409** `closure.claim_routed_to_r9`, T10), and emits the state chain + `claim.denied_no_appeal` in **one** scope-tx under the trustee advisory lock — ⛔ ordinary `voteOnFrozenClaim` is untouched (T2)
**And** the closure is the **second refusal**: terminal, ⛔ not appealable, with a member-facing status string in **en + hi** stating the reason
**And** the family is **told the claim was closed** — a name-free message, en + hi, through the same path as the reminders (AC3) — and the member-app status derives `closed_no_response` from the claim's event stream through a **NEW contract field**, ⛔ never reusing `appeal_exhausted` (`deriveAppealView` in `apps/mobile/lib/appeal-status.ts` shows the **external-remedy disclosure** when it is true — the wrong text for a closure).

### AC7 — The closure cannot be appealed, at every site (`-231` A; scope per **Q**)
**Then** `assertAppealInitiable`, the handler's `can_initiate`, the mobile `AppealStatusCard` and the `can_initiate` contract **all** refuse when a `denied_no_appeal` event exists in the claim's stream (T3); the 409 has its own code (⛔ not the misleading `appeal.not_denied`); ⛔ **ordinary refusals keep 6.16's one appeal, unchanged** — a test proves an ordinary `denied` claim is still appealable. ⚠ **INFERENCE — verify:** the appeal handler's ownership guard is `claimRow.claimantActorId !== memberId` (`claims.appeal.handlers.ts`) and **every production filing path sets `claimantActorId` to null** (helpline, shepherd, and the member-app default), so only a seed that sets it makes an appeal reachable — build the "still appealable" control from a **production-shaped** claim, or the test proves nothing about production (and 6.16's member appeal may be unreachable in production — not this story's to fix; record it).

### AC8 — The surfaces (the Super Admin surface is **BLOCKED on K**)
**Then** the District Admin's **returned-claims list** (⭐ **built by 6.18 D4 = A / Task 6** — ⛔ do not build a second one) gains: the day count, the next reminder, a reminder-record summary, the dead-number flag, the letter state and the closure state; the **letter form** and the **closure request**; the **Pariwar Admin's** closure decision strip (UX-DR54: primary action leftmost, numbered shortcuts, the decline note mandatory **before** submit, UX-DR44 `<AuditTrailEntry>` shown immediately); the **Super Admin's** resolution surface (**K**); staff copy **English-only** in each module's `i18n-en.ts`; the letter-record form is **short** (the District Admin is a 90-second-judgment persona; NFR-8: usable at ≤ 720p)
**And** semantic accessibility (checklist family 13): a container carrying a label is `accessible={true}` (mobile); every role implying interaction has a real handler; every reachable state (`recorded`, `overdue`, `too early`, `declined`, `closed`) is **announced** (`role="status"`/`aria-live`), ⛔ not merely reflected in a prop; WCAG AA (UX-DR67).

### AC9 — PII and audit posture
**Then** new `AuthAuditEventType` entries (`apps/api/src/audit/audit-sink.ts`) for the letter, the closure request, the decision and the Super Admin resolution — each passing a `resourceLocator: 'claim:<uuid>'` so the row can name the claim (6.18 review finding: without it only a hash of `context` survives); a live-DB test **plants** a claimant name, mobile, address, a tracking number and a screenshot as sentinels and finds them in ⛔ no log, event, audit line or error body ([[feedback_stub_must_call_not_transcribe]]-style: real plaintext, not `enc:v1:` strings that decrypt to `unreadable`); the **RTBF gap** is recorded in the story's Dev Notes and `deferred-work.md`, ⛔ not fixed.

### AC10 — Nothing else moves
**Then** ⛔ no new lifecycle state and ⛔ no new claim event beyond the D1 writer's use of the existing ones; `voteOnFrozenClaim` refuses exactly as today; 6.16's one-journey rule and the ordinary appeal are unchanged; `-226` cl.6 (⛔ a claim is not refused *for* a name — this refusal is for **no response**) and `-227` cl.2 (a return is not a denial) are unchanged; ⛔ the closure is **never automatic**.

### AC11 — The proof
**Then** live-DB specs on `twt-test-pg :5433`, **executed** ("written but not run" is ⛔ not a pass): the schedule table (every slot, the day-1 / day-90 boundaries, a second return restarting it, the IST date at midnight), the stop predicate (superseded **and** resubmitted, each alone), **two-connection** races (two sweeps for one slot → exactly one send and one record; two closure decisions; a return racing a closure; a declined closure racing an approval — checklist family 2), the reminder record's `delivered` is **never** set for an accepted send, the closure's whole chain in one tx (a forced failure mid-chain leaves nothing), the three appeal sites, **cross-Pariwar** and **non-human/system-actor** denial per new route, the human-actor CI gate entries for every new mutation route (`scripts/claim-adjudication-human-actor-invariant/check.ts` — ⚠ 6.18's review found that gate hand-maintained, matching on one route, and dropping non-literal paths; an unlisted file is invisible), a `*-shape.spec.ts` for any compound read model, the i18n **real-`t()` leg** in both locales, and a `{ timeout: 20000 }` on any new domain live spec (`packages/domain/vitest.config.ts` sets none). **Also:** a Pariwar Admin approval after the family corrected → **409** `closure.claim_corrected`; a closure request racing a family correction; an approval racing a pending request; a crash between the reminder insert and the send; a late-slot catch-up after an outage (one `late` send, no burst); a closure refused on a live routing row; the Telegram side-channel never runs for a family reminder; and a reminder whose every slot was `no_target` cannot support a closure under the strict default (Q-R).

## Tasks / Subtasks

- [ ] **Task 0 — Governance first** (AC0)
  - [ ] Commit `-229` → `-232`, the routing note, and 6.18's edits **first**.
  - [ ] Write the author-commit decision (D1–D14 — incl. D4, D7, D13 the split and D14 the gate); re-verify every claim under *What already EXISTS* — 6.18 moves under you.
  - [x] ✅ **DRAFTED 2026-09-20** (five notes, ⛔ not sent, ⛔ not committed — see *Open Panel questions*); what remains is sending them and transcribing the rulings. Batch the Panel questions (K L M O P Q R T U — with N and D3 as confirms) into routing notes from `trustee-panel-routing-note-TEMPLATE.md` — §0 gate first, order per the template, E4 commands run (an **empty** result is a finding).
  - [ ] `epics.md` entry + header; the AR-61 ledger entries; record Q-S with the go-live gate (counsel, Story 0.13).
- [ ] **Task 1 — Migrations** (AC1, AC2, AC5, AC6) — ⛔ start only after 6.18 lands; numbers from **0119**
  - [ ] Hand-authored, journal entry each (idx+1, a larger `when`); ⛔ never regenerate an applied migration; any `ADD VALUE` in its **own** file (`IF NOT EXISTS`); RLS hand-supplement (`ENABLE` → `GRANT`/`POLICY` → `FORCE`); new tables: contact, reminder record, letters, closures.
  - [ ] Each table gets a **migration-level policy spec** asserting RLS positive / negative / fail-closed / FORCE, FKs, the UNIQUE keys and CHECKs directly (family 5).
- [ ] **Task 2 — Capture at filing** (AC1) — contracts (⛔ no `@twt/domain` import), the writer, the member + helpline routes, the member-app step, the helpline card; tests incl. ICP two-channel merge.
- [ ] **Task 3 — The schedule and the record** (AC2, AC3) — the pure function + data table, the record writer, the sweep and its child queue, the stop predicate; injectable clock everywhere.
- [ ] **Task 4 — Dispatch composition and the delivery signal** (AC3, AC4) — recipient resolvers (nominee contact, claimant mobile, the Pariwar-Admin-by-role accessor), the name-free copy, the dead-number marker, and **capture `providerMessageId` at send time**; scope the delivery-signal integration to the answer to **O**.
- [ ] **Task 5 — Staff reminders, escalation, the letter record, the day-90 reminder** (AC4, AC5, AC6) — the chase ladder, the letter writer + the screenshot handler, **the day-90 closure-reminder job (daily for 7 days, then escalate to the Pariwar Admin — AC6, D12; ⛔ it never calls the closure writer)**, the audit lines.
- [ ] **Task 6 — The closure** (AC6, AC7) — the D1 writer, the request / decision / Super Admin routes, **the request's and the approval's re-check of `isReturnedClaimResubmitted` under the lock (invariant 2)**, the appeal-site edits (all three), the family closure notice and the NEW `closed_no_response` contract field (⛔ not `appeal_exhausted`), the mobile status string.
- [ ] **Task 7 — Keys and gates** (D8) — mint the four keys (catalog version + counts + `roles.ts` + `permissions.test.ts` + `roles.test.ts`), the human-actor gate entries, the audit types.
- [ ] **Task 8 — Admin and mobile surfaces** (AC8) — extend 6.18's returned-claims list; the letter form; the closure strips; the Super Admin surface; family-13 assertions.
- [ ] **Task 9 — Tests** (AC9, AC11) — **execute** on `twt-test-pg :5433`.
- [ ] **Task 10 — Friction-budget disposition** — one named-payer row if capture at filing adds a required field the family must type (`friction-budget.md`; best-ever ratchet — [[project_friction_budget_baseline_ratchet]]).

## Dev Notes

### Dependency and sequencing
6.18 first: its D1 (the returnable-states change), its return/R9 mutual-exclusion patch, its D4 (the returned-claims list), and migrations 0116–0118. This story's own migrations start at **0119**. ⚠ 6.18's review found its **domain** live specs lack a suite-level timeout and its tests pin defects — do not copy its test helpers blindly (`seedNomineeNameCheck` seeds a passing check unconditionally).

### Files — UPDATE (read each completely before changing it) and NEW
**UPDATE:** `apps/mobile/lib/claim-steps.ts` + `(claim)/index.tsx` + `nominee-review.tsx` + `apps/mobile/tests/unit/claim-steps.test.ts`; `apps/admin/src/modules/helpline-claims/{HelplineConsoleShell,HelplineClaimPage}.tsx` (a new slot beside `bankSlot`); `packages/domain/src/claim/{appeal-eligibility,state-trustee-decision-persist}.ts`; `apps/api/src/modules/claims/claims.appeal.handlers.ts`; `packages/contracts/src/claims/appeal.ts`; the mobile `AppealStatusCard`; `packages/domain/src/rbac/{permissions,roles}.ts`; `apps/api/src/audit/audit-sink.ts`; `packages/queue/src/index.ts` + `apps/jobs/src/boot.ts`; `packages/i18n/src/catalog.ts` + the locales; `scripts/claim-adjudication-human-actor-invariant/check.ts`.
**NEW:** the contact, reminder-record, letters and closures tables + their RLS policy files (`policies/index.ts`, `schema/index.ts`); a reminder sweep module beside `contribution-notify-triggers.ts`; the letter / closure / contact handlers and routes under `apps/api/src/modules/claims/`; the admin modules.
**⛔ NEVER edit:** `packages/channels/src/**` (frozen; compose in `apps/jobs`), `claim_documents` / `uploadClaimDocument`, `voteOnFrozenClaim`'s guard, `ClaimantRelationship`'s comment.

### Testing standards
Live-DB traps recorded for this repo ([[project_live_db_test_gotchas]], [[project_known_livedb_test_failures]], [[project_ci_local_double_run_pollution]]): never regenerate an applied migration (42P07); never `DROP SCHEMA` (42P01); **assert membership, not counts** (a shared `PARIWAR_A` pollutes under `ci:local`, which runs specs in both the unit and integration phases); expect 5 s timeouts under `--concurrency=4`; a fresh Pariwar has no niyamavali clauses; own-committing specs for the sweep and two-connection races; a green turbo run is ⛔ not proof when specs self-skip without `DATABASE_URL`. Exemplars: `apps/jobs/tests/contribution-notify-triggers.test.ts` (mocked deps, `now: () => NOW`), `apps/jobs/tests/pending-match-idempotency-live.test.ts` (live, own-committing, injected clock, revert-sanity), `apps/api/tests/integration/claims/cycle-freeze.spec.ts` and `packages/domain/tests/integration/alert/alert-stream-concurrency.spec.ts` (two-connection races), `apps/jobs/tests/wa-webhook-processor.test.ts` (status callbacks).

### References
- `.decision-log.md` — `2026-09-20-229`, `-230`, `-231`, `-232`; `-226`, `-227`, `-228`; `-195` cl.2.
- `_bmad-output/implementation-artifacts/6-18-nominee-holder-name-on-the-verification-console.md` — `### Review Findings`, AC11, D4, Task 4d (deferred to this story).
- `_bmad-output/implementation-artifacts/6-16-3-stage-claim-denial-appeal-flow-reversed-denial-sahyog-vivran-publish-hook.md` — D-F, D-G.
- `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-09-20-6-18-deny-while-under-correction.md`; `…/trustee-panel-routing-note-TEMPLATE.md`.
- PRD `_bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md` (FR-43A, FR-71/72/73, FR-23, FR-41, FR-47, FR-97, §4.10, §4.14); `architecture.md` (§3.4, §2.7, §2.12, AR-12, AR-15/16/18/19/20/40, AR-58 — and `epics.md` for AR-61 / AR-63, NFR-10/14/18/20/24/8); `ux-design-specification.md` (Stance #5, UX-DR39/44/54/55/57/66/67).
- Code: `packages/domain/src/claim/{state-trustee-decision-persist,appeal-eligibility,appeal-persist,state,read}.ts`, `packages/domain/src/member/overlay.ts`, `packages/channels/src/{dispatch,provider}.ts`, `packages/channels/src/providers/{sms-dlt,sms-errors,whatsapp-status}.ts`, `apps/jobs/src/scheduler/{contribution-notify,contribution-notify-triggers}.ts`, `apps/jobs/src/wa-webhook-processor.ts`, `packages/domain/src/notifications/delivery.ts`, `packages/domain/src/idempotency/keyed-store.ts`, `packages/domain/src/cycle-calendar/holiday-resolver.ts`, `packages/contracts/src/claims/{filing,documents,dpdpa-consent,appeal}.ts`, `packages/domain/src/schema/{claims,claim_nominee_bank_accounts,member_nominees,whatsapp_send_status,claim_shepherd_assignments}.ts`.

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

## Change Log

| Version | Date | Change |
|---|---|---|
| v0.1 | 2026-09-20 | Created by the create-story workflow from `-229` → `-232`, three parallel read-only research passes (planning documents; reminder / scheduler substrate; claim filing / closure / appeal code) and seven live re-verifications. ⚠ `backlog`, ⛔ not `ready-for-dev` — Panel questions K L M O P Q R open. ⛔ Not yet run through `validate`. |
| v0.2 | 2026-09-20 | Applied a fresh-context validator's findings, **each re-verified in the tree first**. **Critical:** the closure guard against an already-CORRECTED claim (AC6, invariant 2 — a corrected-but-unvoted claim still has a LIVE return row, so the conditional `UPDATE` alone would succeed); Q-R rewritten (**strict default**; `no_target` is ⛔ not a dead number); readings that were stated as fact are labelled (new **Q-T**); `-232` J recorded (it ratified our parse of `-231` F); N carried as a confirm; the story split recorded (**D13**); where AC1's 409 lives (**D14**) and multiple nominees (**Q-U**); the family-message design rewritten (**D7**: `alert_published`, `Alert.member_id`, no Telegram mirror). **Should-fix:** private vs exported helper names; lifecycle suppression is prose, not live; a super-admin-only key precedent exists; the `attempting` → final reminder state, day numbering and catch-up; the family closure notice + a `closed_no_response` field; the day-90 reminder job had no Task; the AC7 control must be production-shaped; mis-cited paths and requirement ids; an invariants box. ⚠ Not re-validated after these edits. |
