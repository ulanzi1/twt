---
baseline_commit: 6bb79afd
---

<!--
⭐ MERGED 2026-10-08 with Story 6.24a as PR #263 (REBASE-merge): the 6.24 SHA this file cites (`2ada8f7b` — `-293`) was rewritten by the
rebase (→ `c31ae2cf` on `main`). The citation is kept AS WRITTEN; the proved map of all 23 commits is the header of
`6-24-true-nominee-refile-after-a-suspicion-refusal.md`. ⚠ RE-PIN at this story's start to the `main` that carries 6.24a (`c5d282ec` or later).
-->

<!--
BASELINE — written 2026-10-07 at the split of Story 6.24 (pin `6bb79afd`, as 6.24a). ⚠ RE-PIN AT THE START: this story begins only once
6.24a is `done` (the 6.21b / 6.23b / 6.26b precedent) and reads 6.24a's SHIPPED build — RF1's fragment `standingSuspicionRefusalSql` /
`readStandingSuspicionRefusals` (`packages/domain/src/claim/suspicion-refusal.ts`), the `closed` state and its `claim.closed` event. Every
`file:NNN` below is as of `6bb79afd` and is RE-DERIVED at the re-pin (`git diff --name-only 6bb79afd..HEAD -- packages apps scripts`).

STATUS: `backlog` (written; flips to `ready-for-dev` at the re-pin once 6.24a is `done`).

GLYPH REGISTER, ADDRESSING RULE: as 6.24a's.
LETTERS: `RF9`, `RF11` and RF12's Q2 paragraph are DEFINED in 6.24a's file (`6-24-true-nominee-refile-after-a-suspicion-refusal.md`,
section *"Decisions — the AUTHOR's"*, tagged [b]) and COMMITTED by `2026-10-07-292` — copied below VERBATIM for the dev's convenience;
where a copy and 6.24a's text ever differ, 6.24a's text and `-292` are the record. This file ⛔ never restates a different version.
-->

# Story 6.24b: The Filing Code and the Texts to the Nominee in Place at the Death — After a Suspicion Refusal, and When an Allowed Appeal Closes Her Claim `[SURFACE]`

Status: backlog

> ⭐⭐ **WHAT THIS STORY IS, IN ONE PARAGRAPH.** Split from Story 6.24 on 2026-10-07 (BigDev: *"ok, split it"*). While a refusal on suspicion
> of a post-death nominee change stands (`-239`), the app's **filing code goes to the nominee the District Admin found in place at the
> death** — ⛔ never to the discarded one (`-262` FQ6 B); the system **texts that nominee once**: *"A claim for [member] could not go ahead.
> Please call the helpline."* (FQ7 B); and when an allowed appeal **closes** her own claim (6.24a), she is **texted once**: *"Your claim for
> [member] has been closed. Please call the helpline."* (`2026-10-07-291` Q2 B); and the **refused person is texted once** that the claim
> can be appealed until a date (`2026-10-07-293` item 1 B). ⚠ **All three texts are go-live gated on counsel** (one new roster row); their
> DLT template ids stay unset so every send fails closed. ⭐ **The system still refuses nothing.**

> ⭐ **What 6.24a ships and this story READS — rebuild ⛔ none of it:** RF1's "a suspicion refusal stands" fragment and reader; the `closed`
> state and `claim.closed` (trigger `suspicion_appeal_allowed`). And from earlier stories: the as-at-death nominee
> (`getEffectiveNomineeDeclaration`, `claim/nominee-effective.ts:328`); the DLT text path to a raw number (6.19b `sendClaimCorrectionSms`);
> the Ravi-mode handover OTP (`sendHandoverOtp`); the mode-resolved member name (`resolveMemberFacingDeceasedName`, `-181`).

## Story

As the **true nominee** of a member whose claim was refused because the nominee was changed after the death —
I want **the app's filing code sent to me rather than to the person who changed the nominee, a text telling me to call the helpline, and a
text if my own claim is later closed** — *and the refused person told, once, until when they can appeal (`-293`)*,
so that **I can file and act, and the person who made the change can ⛔ not file again in the app — while ⛔ nobody is accused.**

## The rulings this story builds

| Ruling | Key | Status |
|---|---|---|
| `-262` FQ6 B | *"after a refusal on suspicion, the app sends the filing code to the nominee the District Admin found in place at the death — ⛔ never to a discarded one"* | ⭐ Trustee-ratified |
| `-262` FQ6 reading | *"FQ6 applies only while a `-239` refusal stands for that death"* | ⚠ OUR reading |
| `-262` FQ7 B | *"the system texts the nominee on record at the death, at the mobile from that declaration: 'A claim for [member] could not go ahead. Please call the helpline.' ⛔ It accuses no one."* | ⭐ Trustee-ratified — ⚠ go-live gated on counsel |
| `2026-10-07-291` Q2 B | *"a text, once: 'Your claim for [member] has been closed. Please call the helpline.'"* | ⭐ Trustee-ratified — ⚠ go-live with FQ7's counsel check |
| `-291` reading | Q2's "her" = the nominee in place at the death, resolved as FQ7's | ⚠ OUR reading |
| `-181` | the member-facing name form is MODE-RESOLVED (⛔ never hard-coded) | Author (BigDev) |
| `2026-10-07-293` Q3 item 1 B | *"one text … 'The claim for [member] could not go ahead. It can be appealed until [date]. Please call the helpline.'"* — to the REFUSED person, at the mobile they gave on the claim or, if they filed as a nominee, the mobile on that nominee entry | ⭐ Trustee-ratified — ⚠ go-live gated on counsel |
| `-293` readings | once per refused claim, ever; while the refusal stands and its 90 days have ⛔ not passed; `[date]` = the last day to appeal (6.24a RF14); locale = the refused claim's own `contact_locale`; ⛔ no contact record ⇒ ⛔ no text | ⚠ OUR reading |

## ⭐ THE INVARIANTS (moved from 6.24)
5. **⛔ No latest-nominee fallback** after a standing refusal: a non-effective determination or an unusable mobile ⇒ the existence-defended
   no-op (the code) / a recorded skip (the text) — ⛔ never the projection's rank-1.
6. **⛔ No plaintext mobile or name** in a log, an audit, an event, a job payload or a table — a keyed hash and a masked last-4 only.

## 📜 Policy meaning (AI-10-1)
- **P4 (RF9 — the filing code):** *"While a refusal on suspicion stands, the app's filing code goes only to the nominee the District Admin
  found in place at the death; if that nominee cannot be reached by text, the family is sent to the helpline — the code ⛔ never goes to
  the discarded nominee."* — FQ6 B: consistent.
- The texts gate ⛔ no benefit — they tell. ⛔ No predicate that decides who is paid or approved is added or changed here.
- **Niyamavali:** ⛔ no clause on refusal notices or filing codes (checked 2026-10-07).

## ⚖️ Decisions built here — copied VERBATIM from 6.24a's file (✅ committed by `2026-10-07-292`)
- **RF9 — THE FILING CODE (FQ6).** `sendHandoverOtp` first calls a new domain read `readSuspicionRefusalRecipient(db, pariwarId,
  deceasedMemberId)` → `null` (⛔ no standing refusal ⇒ today's path, unchanged) | `{ kind: 'at_death', versionId }` | `{ kind: 'none' }`.
  It takes the MOST RECENT standing refusal (RF1's order), reads `getEffectiveNomineeDeclaration` on THAT claim, and returns the
  `versionId` of the entry with `rank === 1` (after 6.20's re-rank) when `status === 'effective'`; else `none`. The API reads the version's
  `mobile_ciphertext` (`getNomineeVersionsByIds`, `nominee/declaration-history.ts:128`) and resolves it with the domain's
  `resolveCorrectionMobile(serialized, 'member_nominee', pariwarId, enc)` (`claim/correction-crypto.ts:~50` — it already handles null, the
  erasure sentinel and normalisation; or `decryptNomineeField` + `normalizeMobile`, the same field class) — `none`, a null/sentinel ciphertext or an unsendable number ⇒ the SAME existence-defended no-op (`sent: true`, empty
  hint, `timingEqualizeDelay`) as today's ⛔-nominee branch. ⛔ Never `getMemberNominees` once a refusal stands. The send audit
  (`member_claim.handover_otp_send`) gains a non-PII `recipient: 'latest' | 'at_death'`. A determination with a NULL
  `death_certificate_review_id` (0119-era) is trusted as `effective` (⛔ not in production — ⛔ never backfilled).
- **RF11 — THE TEXT (FQ7).** A jobs sweep beside 6.19b's (`apps/jobs/src/scheduler/`), ⛔ never `dispatch()`: select claims with a
  standing refusal (RF1) and ⛔ no notice row; per claim, lock it, RE-CHECK RF1 under the lock, resolve the recipient exactly as RF9 does
  (the refused claim's rank-1 effective version — ⛔ never `readCorrectionRecipients`, which requires a live filing agreement and returns S's effective nominees plus a non-nominee claimant — a different set), insert a
  notice row in its claiming status, commit; then decrypt (the domain's `resolveCorrectionMobile`, `claim/correction-crypto.ts:~50`), send
  through `sendClaimCorrectionSms`'s path (`claim-correction-reminders.ts:247-320` — its fail-closed and error classification), and
  compare-and-set the outcome. New table `claim_suspicion_notices` (migration 0151 — v1.2: it carries both texts, RF12): `notice_id`, `pariwar_id`, `claim_case_id`
  (composite FK to `claims`), `recipient_version_id`, `recipient_number_hash` (keyed), `status`, `claimed_at`, `created_at`,
  `updated_at`, `purpose` (`'suspicion_refusal' | 'closed_after_appeal'` — a CHECK + an `as const` tuple in LOCKSTEP; v1.4); UNIQUE
  `(pariwar_id, claim_case_id, purpose)` — ⭐ ONCE per claim per purpose, EVER (a revision away and back ⛔ never re-texts; a second
  refused claim of the death is its own notice). ⚠ If Q3 is answered B, a third purpose joins (one recipient — the refused claim's
  FILER), a CHECK widening in its own migration. ⚠ **v1.1 (validator M9) — invent ⛔ no vocabulary:** the status set, `claimed_at`, the
  partial index on the claiming status and the exhausted-row finaliser are COPIED from 6.19b's reminder table (migration `0128` — its
  `attempting | accepted | no_target | …` set and its retry / stale-claim handling; read it, mirror it, a CHECK + an `as const` tuple in
  LOCKSTEP) — so a crash after the claiming commit is RECLAIMED by the next run, ⛔ never stranded (the selector is *"⛔ no FINISHED row"*,
  ⛔ never *"⛔ no row"*). **Locale:** `hi` (the system default, `claim_contacts.contact_locale`'s default) — ⛔ never S's `contact_locale`,
  which the person who made the change may have written; ⛔ no member locale is stored (checked). RLS + grants as 6.19b's tables; the anonymizer — ⛔ nothing
  to scrub (⛔ no plaintext; the hash is keyed) — RECORD that in the anonymizer's coverage list if it keeps one. Words: copy key
  `claim.suspicionRefusalNotice.sms` (en + hi, `packages/i18n/locales/{en,hi}/claim.json`) — en verbatim from FQ7: *"A claim for {member}
  could not go ahead. Please call the helpline {helpline}."* ⚠ `{helpline}` is the per-Pariwar number 6.19b's texts carry
  (`sms.claim_correction.helpline_number.<pariwarId>`), an addition to the Panel's words in ⛔ nothing but that it supplies the number the Panel
  told her to call. ⚠ **v1.1 (validator H4) — `{member}` is MODE-RESOLVED** (`-181`: the member-facing name form reads the stored
  per-Pariwar presentation mode, ⛔ never hard-coded): the 8.8 jobs path — decrypt the deceased's KYC name (`decryptKycField`) and pass it
  through `resolveMemberFacingDeceasedName(mode, name)` (`packages/domain/src/notifications/pool-identity.ts:141`; `resolvePoolIdentity`,
  `:201-228`, is the composed precedent; the caller reads the mode ONCE — `contribution-notify-triggers.ts:716`). ⛔ Never
  `splitFirstNameLastInitial` directly, ⛔ never the 1.16b PII-scrape rule (that gate covers `apps/public` pages, ⛔ not texts). An unresolvable
  name (erased, ⛔ none) ⇒ `no_target` — ⛔ never a text with a blank name. Hindi carries the "NOT YET HUMAN-REVIEWED" `$comment` marker.
  ⚠ **v1.1 (validator H5) — the 6.19 registry can ⛔ not take this message as is:** `renderClaimCorrectionSms` / `sendClaimCorrectionSms`
  hard-code the variables `{reference, helpline}` (`claim-correction-sms-templates.ts:93-96`, `claim-correction-reminders.ts:287-290`) and
  the lockstep test pins every entry name-free with the reference first (`apps/jobs/tests/claim-correction-sms-templates.test.ts:62-87`;
  the registry header D33: *"⛔ No name"*). ⇒ a SIBLING registry `suspicion-refusal-sms-templates.ts` with its own variables type
  `{ member, helpline }`, its own render function and lockstep test, and a send variant that reuses `sendClaimCorrectionSms`'s provider /
  classification / fail-closed core by extraction (⛔ never a copy). D33's *"⛔ No name"* is ⛔ not weakened — this message names the member
  because FQ7's ratified text does; the carve-out is recorded in the author-commit and in the sibling's header. The DLT request sheet
  gains the two rows (a new section in `docs/launch-gate-inventory/dlt-template-requests-6-19.md`, or a sibling sheet — the dev picks and
  records). Template ids stay UNSET ⇒ the send fails closed
  (`error` + alarm) until go-live.
- **⭐ `-293` Q3 item 1 B ACTIVATES the B branch `-292` RF14 (b) recorded in advance** (6.24a's file — *"If Q3 is answered B, a once-ever text
  to the REFUSED FILER with the date joins RF11 as a third purpose, through a NEW resolver covering BOTH claimant sides of 6.19a W6 …"*):
  a THIRD purpose `refusal_appeal_notice`, ONE row per refused claim (the same UNIQUE `(pariwar_id, claim_case_id, purpose)`), recipient by
  a NEW domain resolver `readRefusedFilerRecipient(db, pariwarId, claimCaseId)` → the refused claim's `claim_contacts` row: a non-nominee
  claimant's contact mobile, OR the `member_nominee_versions.mobile_ciphertext` of its `claimantNomineeVersionId`; ⛔ no contact record /
  null / sentinel / unsendable ⇒ `no_target`. ⛔ Never `readCorrectionRecipients`. Words: copy key `claim.suspicionRefusalAppealNotice.sms`,
  en verbatim from the ruling with `{member}`, `{date}` and `{helpline}`; locale = the refused claim's `contact_locale`; `{date}` = 6.24a's
  `suspicionRefusalAppealUntil(...)` rendered as that locale's date words. The sweep's third selector: a claim on which RF1 STANDS, whose
  90 days have ⛔ not passed, with ⛔ no finished `refusal_appeal_notice` row; re-checked under the claim lock. ⚠ Per `-293` Consequence 1
  the purpose is in 6.24b's notice-table migration FROM THE START — RF11's *"a CHECK widening in its own migration"* is superseded as a
  mechanic only (the migration is unbuilt).
- **[b] RF12 (its `-291` Q2 paragraph only):**
  ⭐ **`-291` Q2 B — the closure text:** *"Your claim for {member} has been closed. Please call the helpline {helpline}."* (copy key
  `claim.suspicionClosedNotice.sms`, en + hi, the Hindi marker), once per closed claim, EVER, through RF11's machinery: the notice table
  gains a `purpose` column (`'suspicion_refusal' | 'closed_after_appeal'`, CHECK + `as const` tuple) and its UNIQUE becomes `(pariwar_id,
  claim_case_id, purpose)`; the sweep's second selector is *"a claim in `closed` whose `claim.closed` trigger is
  `suspicion_appeal_allowed`, with ⛔ no finished `closed_after_appeal` row"* (derived — ⛔ nothing written by the reversal for it); the
  recipient is resolved as RF9 / RF11 do, on the CLOSED claim's own live determination when `effective`, else the reversed claim's (`-291`
  reading); the sibling registry gains its entry, the DLT sheet two rows; the same counsel row covers it (`-291` Consequence 3).

## ⭐ FOUND FACTS (copied from 6.24a — F6, F10, F14)
- **F6** — the code goes to the latest nominee (Fact 6) ⇒ RF9.
- **F10** — `getEffectiveNomineeDeclaration` is per CLAIM (⛔ not per death) and fails closed (`undetermined | unversioned | empty |
  incoherent`) ⇒ RF9 / RF11 resolve through the refused claim; any non-`effective` ⇒ ⛔ no recipient.
- **F14** — **Ravi-mode reality (recorded, ⛔ not reopened):** the app session that requests the filing code is the DECEASED's account,
  whose login code goes to the deceased's registered mobile — in the Panel's scenario, the phone the person who changed the nominee holds.
  FQ6 therefore stops THAT person from filing again in the app (the code now reaches the true nominee, ⛔ not them); the true nominee files
  in the app only with access to that session, else through the helpline (which has ⛔ no handover code — `claims.helpline.routes.ts:14`).
  The masked last-4 shown to the phone holder becomes the true nominee's — it tells them only that a refusal exists, which they know.

## Acceptance Criteria

### AC0b — Governance and re-pin (Task 0)
6.24a is `done`; the baseline is re-pinned to 6.24a's merged tree and every code claim re-derived; ⛔ no decision after `-292` (other than a
`-293`) touches FQ6 / FQ7 / `-291` Q2 / `-293` item 1; work is on
`story/6-24b-filing-code-and-texts-to-the-nominee-in-place-at-the-death`. ⛔ No code before.

### AC6b — The filing code (FQ6; RF9, F6, F10, F14)
**Given** the deceased's declaration had version 1 (nominee A, mobile …1111) and a post-death version 2 (nominee B, mobile …2222), and the
District Admin's determination on claim S marks v1 `stands` / v2 `discarded`, and S is refused `-239`, **when** the Ravi-mode session
requests the handover code, **then** it goes to …1111 (the masked hint ends 1111), the audit carries `recipient: 'at_death'` and ⛔ no
number. **Before** any refusal, and **after** S's refusal is reversed, the code goes to the latest nominee as today (`recipient: 'latest'`).
**Given** a standing refusal whose determination is ⛔ not `effective`, or whose rank-1 mobile is null / erased / unsendable, **then** the
response is the existence-defended no-op (identical shape and timing pad) — ⛔ never …2222. A two-nominee effective set sends to rank 1.

### AC7b — The texts (FQ7; `-291` Q2 B; `-293` item 1 B; RF11, RF12, RF14 (b))
**Given** a standing `-239` refusal, **when** the sweep runs, **then** ONE notice row is written and one text is sent to the refused claim's
rank-1 effective nominee, in Hindi (RF11), naming the member in the Pariwar's mode-resolved form (`-181`), carrying the helpline number; ⛔ no
plaintext number or name is stored, logged or audited. A second run sends ⛔ nothing; a refusal revised away before the sweep's locked
re-check sends ⛔ nothing; a revision away and back ⛔ never re-texts; a non-effective determination or unusable mobile records
`no_target`; a crash after the claiming commit is reclaimed by the next run. **With the DLT template ids unset** (as shipped), the send fails closed (`error` + alarm) — ⛔ never a send on a
wrong template. The SIBLING registry's lockstep test (6.19's stays unchanged), `i18n-parity`, `microcopy`, `pii-scrape` and the Hindi marker pass; the DLT request
sheet and the go-live roster gain their rows (counsel basis for FQ7's text, `-291` Q2's closure text AND `-293`'s refusal-appeal text —
ONE NEW row, ⛔ not Row 18, which is the filer's agreement, ⛔ nor Row 19; and the Hindi review row).
**And (`-293` item 1 B)** given a standing `-239` refusal within its 90 days, the sweep texts the REFUSED filer once, in the refused claim's
`contact_locale`, with the last date to appeal: a non-nominee claimant at their contact mobile; a nominee-claimant at the mobile on the
version they are linked to (the post-death one in the Panel's scenario); ⛔ no contact record ⇒ `no_target`; a refusal whose 90 days passed
before the sweep ⇒ ⛔ no text; a revision away and back ⛔ never re-texts; the true nominee is ⛔ never this text's recipient unless she IS
the refused filer (then she gets both texts — a test).

### AC9b — Nothing else moves
⛔ No new permission key; ⛔ no change to the gate, convergence, the appeal or `closed` (6.24a's); ⛔ no `apps/public` change.

### AC10b — The proof
Every test passes; each load-bearing one red-checked; `pnpm ci:local` green with `DATABASE_URL` at :5433 (domain, API, jobs, contracts,
i18n, microcopy); the notice-table migration applied to BOTH :5432 and :5433, its CHECKs verified by name on each.

## Tasks / Subtasks

- [ ] **Task 0 — Re-pin (AC0b)** — 6.24a `done`; `git fetch origin`; re-pin to 6.24a's merged tree; re-derive every `file:NNN` here; read
  6.24a's shipped `suspicion-refusal.ts` and `closed`; check `.decision-log.md` after `-292`; a fresh-context validate is offered to BigDev.
- [ ] **Task 1 — Migration (AC7b; RF11)** — the next free migration number at the re-pin (6.24a takes 0150):
  - [ ] 1.1 (with `refusal_appeal_notice` in the `purpose` CHECK from the start — `-293`) `0151_claim-suspicion-notices.sql`: the RF11 table (`claim_suspicion_notices`), composite FK `(pariwar_id, claim_case_id)` →
    `claims` (the 0143 UNIQUE target), the status CHECK, the `purpose` column + its CHECK, `recipient_number_hash`, the ONE UNIQUE `(pariwar_id, claim_case_id, purpose)` (RF11 v1.4), RLS policy + `twt_app` grants exactly as 6.19b's `claim_correction_reminders` (read its
    migration — `SELECT, INSERT` + `UPDATE` on the outcome columns only). ⛔ Nothing references `'closed'`. Journal idx 151.
- [ ] **Task 2 — API: the filing code (AC6b; RF9)**
  - [ ] 2.1 `sendHandoverOtp` — RF9 (domain `readSuspicionRefusalRecipient` in `suspicion-refusal.ts`; the API reads + decrypts the version
    mobile); the audit's `recipient` field.
  - [ ] 2.2 Specs (`apps/api/tests/integration/claims/`): AC6b's four legs incl. the no-op shape + timing (byte-identical in shape to
    the ⛔-nominee branch).
- [ ] **Task 3 — Jobs: the texts (AC7b; RF11)**
  - [ ] 6.1 The sweep module + its registration in the scheduler (beside 6.19b's — read `apps/jobs/src/boot.ts:591-612`); the domain reads
    it needs (the standing refusals without a notice row; the recipient — RF9's read; the member's name decrypt through the 8.8 jobs path).
  - [ ] 6.2 The SIBLING registry (RF11) + config keys; its own lockstep test (6.19's untouched); the shared send core extracted; the DLT request sheet rows; the go-live roster rows
    (`docs/launch-gate-inventory/inventory-roster.md` — a NEW row for the counsel basis of FQ7's text AND `-291` Q2's closure text — Row
    18 is the filer's agreement on others' behalf and Row 19 names only the correction and certificate purposes, so ⛔ neither covers
    them — and the Hindi review row).
  - [ ] 6.2b The second purpose (RF12 / `-291` Q2 B): its copy key, sibling-registry entry, DLT rows and the sweep's second selector.
  - [ ] 6.2c The THIRD purpose (`-293` item 1 B): `readRefusedFilerRecipient` (both claimant sides), its copy key, sibling-registry entry,
    DLT rows and the sweep's third selector (RF1 stands AND within the 90 days).
  - [ ] 6.3 Specs: AC7b's legs for ALL THREE purposes incl. the locked re-check (revise away between selection and lock), once-ever, fail-closed on unset template
    ids, the error classification (invalid number / carrier reject / transient), ⛔ no plaintext anywhere (assert the row's columns and the
    captured logs).

- [ ] **Task 4 — i18n** — the SMS copy keys (en + hi, the Hindi marker) through the real `t()`; `classification.json`; `i18n-parity`,
  `microcopy`, `pii-scrape`.
- [ ] **Task 5 — Records and proof (AC9b, AC10b)** — `pnpm ci:local`; red-checks in the Debug Log; `sprint-status.yaml` via the safe
  prepend; commit on the story branch.

## Dev Notes

### Traps (moved from 6.24 — numbers kept)
10. **The latest-nominee fallback** — after a standing refusal ⛔ never `getMemberNominees`; `none` ⇒ the no-op (invariant 5).
11. **Reusing `readCorrectionRecipients` for FQ7 or Q3** — it requires S's filing agreement (the filer may be the person who made the
    change) and returns S's effective nominees plus a non-nominee claimant — ⛔ never the right set for either (F10 / RF11 / RF14).
12. **Decrypting in the wrong layer / leaking the number** — the API decrypts with `decryptNomineeField`; jobs with the domain helper; the
    domain read modules never decrypt or import `claim/events.ts`. ⛔ No number, name or code in a log, audit, payload or job data.
13. **Texting on the decision event** — a revised decision would text wrongly or twice. The sweep re-checks RF1 under the claim lock; the
    UNIQUE makes it once ever.
14. **The `[member]` placeholder** — the Pariwar's MODE-RESOLVED form (`-181`, `resolveMemberFacingDeceasedName`), ⛔ never a hard-coded
    form; ⛔ never stretch the 6.19 registry (its D33 *"⛔ No name"* pin stays) — a sibling registry.

### References
- `.decision-log.md`: `-262` FQ6, FQ7, readings, *"does NOT cover"* · `2026-10-07-291` Q2 B · `2026-10-07-292` (RF9, RF11, RF12) · `-181`
  · `-253` M · `-255` F7.
- 6.24a's file (the RF definitions, F1–F15, RF1's fragment); `trustee-panel-routing-note-2026-09-28-6-20-follow-ups.md` (FQ6 / FQ7, Gaps
  1–2); `trustee-panel-routing-note-2026-10-07-6-24-telling-the-refused-person.md` (Q3 item 1).
- 6.19b's story (the SMS path, migration `0128`), 6.19a (W6 — the claimant side), 8.8 (the jobs name path).

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

## Change Log

| Version | Date | Change |
|---|---|---|
| 1.1 | 2026-10-07 | ✅ `2026-10-07-293` Q3 item 1 **B** (committed alone `2ada8f7b`): the THIRD text — to the refused filer, once, with the last date to appeal — joins this story (activating `-292` RF14 (b)'s recorded B branch): `readRefusedFilerRecipient`, purpose `refusal_appeal_notice` in the notice table from the start, AC7b's legs, Task 6.2c. Status stays `backlog`. |
| 1.0 | 2026-10-07 | Split from Story 6.24 v2.0 (BigDev: *"ok, split it"*): RF9, RF11 and RF12's Q2 text, with P4, invariants 5–6, F6 / F10 / F14, AC6 / AC7 (→ AC6b / AC7b), Tasks 1.2 / 5.2 / 6 / 7.2's SMS key and Traps 10–14 — copied verbatim. Status `backlog` until 6.24a is `done`. |
