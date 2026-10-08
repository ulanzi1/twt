---
baseline_commit: b6a63a81
---

<!--
⭐ RE-PINNED 2026-10-08 (`bmad-create-story 6.24b`) to `main` at `b6a63a81` — the tree that carries Story 6.24a (PR #263, REBASE-merge;
merged tree `c5d282ec` = branch head `82ed0034`, tree `3d31b753`; the SHA map is the header of
`6-24-true-nominee-refile-after-a-suspicion-refusal.md`). The earlier pin `6bb79afd` is a `main` SHA the rebase did ⛔ not rewrite.
Every `file:NNN` below is AS OF `b6a63a81`, re-derived by four read-only research passes (domain, API, jobs, i18n/docs/gates) — the
pre-pin citations in the copied RF text are kept AS WRITTEN and their current positions are given in `## Re-pin` below.
Branch SHA cited below as written: `2ada8f7b` (`-293`) ⇒ `main` `c31ae2cf`.

STATUS: `ready-for-dev`. ✅ Task 0's author-commit is DONE — RB1–RB18 committed by `2026-10-08-295` (`a6d55b1d`), alone, before any
code ([[feedback_governance_commits_precede_implementation]]). ⚠ Owed to the Panel (⛔ not blocking the build): `-295` §8 Confirms 1–2 —
Confirm 2 must be answered before Row 22 closes.

GLYPH REGISTER, ADDRESSING RULE: as 6.24a's — `⛔` negates the word it precedes · `⭐` = emphasis / action · `⚠` = hazard ·
doubling is volume only. ⛔ No `file:NNN` into `.decision-log.md`, `deferred-work.md` or `sprint-status.yaml` (newest-first files —
cite the entry id / item / row key).
LETTERS: `RF9`, `RF11` and RF12's Q2 paragraph are DEFINED in 6.24a's file (`6-24-true-nominee-refile-after-a-suspicion-refusal.md`,
section *"Decisions — the AUTHOR's"*, tagged [b]) and COMMITTED by `2026-10-07-292` — copied below VERBATIM for the dev's convenience;
where a copy and 6.24a's text ever differ, 6.24a's text and `-292` are the record. This file ⛔ never restates a different version: where
the shipped tree makes a committed detail wrong or unbuildable, the change is PROPOSED as an `RB` for a NEW author-commit
([[feedback_supersede_never_reinterpret]]) — ⛔ never an edit of the copy.
-->

# Story 6.24b: The Filing Code and the Texts to the Nominee in Place at the Death — After a Suspicion Refusal, and When an Allowed Appeal Closes Her Claim `[SURFACE]`

Status: ready-for-dev

> ⭐⭐ **WHAT THIS STORY IS, IN ONE PARAGRAPH.** Split from Story 6.24 on 2026-10-07 (BigDev: *"ok, split it"*). While a refusal on suspicion
> of a post-death nominee change stands (`-239`), the app's **filing code goes to the nominee the District Admin found in place at the
> death** — ⛔ never to the discarded one (`-262` FQ6 B); the system **texts that nominee once**: *"A claim for [member] could not go ahead.
> Please call the helpline."* (FQ7 B); and when an allowed appeal **closes** her own claim (6.24a), she is **texted once**: *"Your claim for
> [member] has been closed. Please call the helpline."* (`2026-10-07-291` Q2 B); and the **refused person is texted once** that the claim
> can be appealed until a date (`2026-10-07-293` item 1 B). ⚠ **All three texts are go-live gated on counsel** (one new roster row); their
> DLT template ids stay unset so every send fails closed. ⭐ **The system still refuses nothing.**

> ⭐ **What 6.24a ships and this story READS — rebuild ⛔ none of it** (all in `packages/domain/src/claim/suspicion-refusal.ts` unless
> named): RF1's fragment `standingSuspicionRefusalSql(alias)` (`:60`) and reader `readStandingSuspicionRefusals` (`:161`, ordered
> `created_at DESC, claim_case_id DESC` — the CLAIM's `created_at` ⇒ `rows[0]` is the most recently CREATED refused claim, ⛔ not the
most recently refused); `isSuspicionRefusalStanding` (`:223`); the 90-day helpers
> `readSuspicionChainStart` (`:239`), `suspicionRefusalAppealUntil` (`:121`), `hasSuspicionRefusalAppealLimitPassed` (`:129`); the
> `closed` state and `claim.closed` (`claim/events.ts:657-665`, trigger `z.literal('suspicion_appeal_allowed')`, payload
> `held_by_claim_case_id`; `SUSPICION_APPEAL_ALLOWED_TRIGGER`, `suspicion-refusal-persist.ts:61`). And from earlier stories: the
> as-at-death nominee (`getEffectiveNomineeDeclaration`, `claim/nominee-effective.ts:328`); the DLT text path to a raw number (6.19b
> `sendClaimCorrectionSms`, `apps/jobs/src/scheduler/claim-correction-reminders.ts:246-313`); the Ravi-mode handover OTP
> (`sendHandoverOtp`, `apps/api/src/modules/claims/claims.service.ts:97-143`); the mode-resolved member name
> (`resolveMemberFacingDeceasedName`, `notifications/pool-identity.ts:141`, `-181`).

## Story

As the **true nominee** of a member whose claim was refused because the nominee was changed after the death —
I want **the app's filing code sent to me rather than to the person who changed the nominee, a text telling me to call the helpline, and a
text if my own claim is later closed** — *and the refused person told, once, until when they can appeal (`-293`)*,
so that **the person who made the change can ⛔ not file again in the app, I am told to call the helpline (and can file in the app
myself if I have access to the member's account — else through the helpline, F14), and ⛔ nobody is accused.**

## The rulings this story builds

| Ruling | Key | Status |
|---|---|---|
| `-262` FQ6 B | *"after a refusal on suspicion, the app sends the filing code to the nominee the District Admin found in place at the death — ⛔ never to a discarded one"* | ⭐ Trustee-ratified |
| `-262` FQ6 reading | *"FQ6 applies only while a `-239` refusal stands for that death"* | ⚠ OUR reading |
| `-262` FQ7 B | *"the system texts the nominee on record at the death, at the mobile from that declaration: 'A claim for [member] could not go ahead. Please call the helpline.' ⛔ It accuses no one."* | ⭐ Trustee-ratified — ⚠ go-live gated on counsel |
| `2026-10-07-291` Q2 B | *"A TEXT, ONCE, when an allowed appeal closes the true nominee's claim: 'Your claim for [member] has been closed. Please call the helpline.' — accusing no one, naming ⛔ no other person."* | ⭐ Trustee-ratified — ⚠ go-live with FQ7's counsel check |
| `-291` reading | Q2's "her" = the nominee in place at the death, resolved as FQ7's | ⚠ OUR reading |
| `-181` | the member-facing name form is MODE-RESOLVED (⛔ never hard-coded) | Author (BigDev) |
| `2026-10-07-293` Q3 item 1 B | *"ONE TEXT TO THE REFUSED PERSON — at the mobile they gave on the claim, or, if they filed as a nominee, the mobile on that nominee entry: 'The claim for [member] could not go ahead. It can be appealed until [date]. Please call the helpline.' — accusing no one."* | ⭐ Trustee-ratified — ⚠ go-live gated on counsel |
| `-293` readings | once per refused claim, ever; while the refusal stands and its 90 days have ⛔ not passed; `[date]` = the last day to appeal (6.24a RF14); locale = the refused claim's own `contact_locale`; ⛔ no contact record ⇒ ⛔ no text | ⚠ OUR reading — ⚠ narrowed by RB13 (⛔ no text once an appeal is filed) and RB6 (the date's form) |
| `2026-10-08-294` | §1 RF6's reversal writers take the intake lock first; §2 Trap 9 corrected; §3 row `6-28-…` | Author — checked: it touches ⛔ none of FQ6 / FQ7 / `-291` Q2 / `-293` item 1; the sweep's lock order must respect §1 (Dev Notes → *Locks*) |

## ⭐ THE INVARIANTS (moved from 6.24)
5. **⛔ No latest-nominee fallback** after a standing refusal: a non-effective determination or an unusable mobile ⇒ the existence-defended
   no-op (the code) / a recorded skip (the text) — ⛔ never the projection's rank-1.
6. **⛔ No plaintext mobile or name** in a log, an audit, an event, a job payload or a table — a keyed hash and a masked last-4 only.
7. *(re-pin)* **The system refuses nothing new**: ⛔ no gate, convergence, appeal, `closed` or approval code is changed (AC9b).

## 📜 Policy meaning (AI-10-1)
- **P4 (RF9 — the filing code):** *"While a refusal on suspicion stands, the app's filing code goes only to the nominee the District Admin
  found in place at the death; if that nominee cannot be reached by text, the family is sent to the helpline — the code ⛔ never goes to
  the discarded nominee. The code is requested from the member's own account, so the person holding that phone can ⛔ no longer file
  in the app, and the true nominee files in the app only if she has access to that account — otherwise through the helpline (F14)."* —
  FQ6 B: consistent for its second half (*"Vikas can keep filing"* — stopped); its first half (*"Sunita cannot file her new claim in
  the app"*, Gap 1 of the `-262` note) is only partly addressed ⇒ a NON-blocking confirm is owed to the Panel (RB17). ⭐ This IS a
  predicate gating access to a benefit (filing a claim in the app) — it is CHANGED here, so the sentence is owed and given.
- **P4′ (re-pin, the code's reach — F16):** *"While that refusal stands, every step in the app that needs the filing code — filing,
  sending a document, giving bank details, uploading a bank statement — needs the code that now goes to the nominee in place at the
  death. A refusal whose appeal was upheld, or whose 90 days passed with ⛔ no appeal, stands for good — so this holds for every later
  claim of that death, including the true nominee's own."* — the code is ONE code (F16); FQ6 B names "the filing code" ⇒ consistent;
  recorded so it is ⛔ never a surprise.
- The texts gate ⛔ no benefit — they tell. ⛔ No predicate that decides who is paid or approved is added or changed here. ⚠ The 90-day
  appeal limit runs whether or not the refused person's text reaches them (`-293` *"does NOT cover"* a filer with ⛔ no number) — the
  text informs; it ⛔ never starts or extends the limit.
- **Niyamavali** (agent-drafted, ⛔ NOT ratified — [[feedback_niyamavali_rulebook_not_spec]]): re-checked 2026-10-08 against
  `docs/legal/niyamavali.md` (the private legal corpus — gitignored, local only) — §6.1 (`:143`, *"the nominee / bereaved relative initiates a claim (including via an assisted proxy flow)"*):
  RF9 narrows only the APP's code; the assisted (helpline) flow is untouched ⇒ ⛔ no conflict. Part 10 (`:330`, *"for specified
  purposes"*): the three texts are a NEW purpose ⇒ the counsel roster row (Task 6.3; its closure includes the privacy-policy purpose,
RB11), ⛔ not a clause conflict. ⛔ No clause on refusal
  notices or filing codes (as checked 2026-10-07).

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
- **[b] RF12 (its `-291` Q2 paragraph only):**
  ⭐ **`-291` Q2 B — the closure text:** *"Your claim for {member} has been closed. Please call the helpline {helpline}."* (copy key
  `claim.suspicionClosedNotice.sms`, en + hi, the Hindi marker), once per closed claim, EVER, through RF11's machinery: the notice table
  gains a `purpose` column (`'suspicion_refusal' | 'closed_after_appeal'`, CHECK + `as const` tuple) and its UNIQUE becomes `(pariwar_id,
  claim_case_id, purpose)`; the sweep's second selector is *"a claim in `closed` whose `claim.closed` trigger is
  `suspicion_appeal_allowed`, with ⛔ no finished `closed_after_appeal` row"* (derived — ⛔ nothing written by the reversal for it); the
  recipient is resolved as RF9 / RF11 do, on the CLOSED claim's own live determination when `effective`, else the reversed claim's (`-291`
  reading); the sibling registry gains its entry, the DLT sheet two rows; the same counsel row covers it (`-291` Consequence 3).

## ⚖️ 6.24b v1.1 — building `-293` item 1 B (⚠ OUR text, ⛔ NOT copied from 6.24a and ⛔ NOT committed by `-292`)
> This paragraph is 6.24b's own (v1.1). Its MECHANICS — `readRefusedFilerRecipient`, the third selector, the copy key, the date's
> form — are committed by ⛔ no entry yet: they join the Task 0.3 author-commit, as amended by RB1 (key), RB6 (date), RB7 (chain head)
> and RB13 (⛔ no text once an appeal is filed). Where this paragraph and an RB differ, the RB is built.

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

## ⭐ FOUND FACTS (copied from 6.24a — F6, F10, F14)
- **F6** — the code goes to the latest nominee (Fact 6) ⇒ RF9.
- **F10** — `getEffectiveNomineeDeclaration` is per CLAIM (⛔ not per death) and fails closed (`undetermined | unversioned | empty |
  incoherent`) ⇒ RF9 / RF11 resolve through the refused claim; any non-`effective` ⇒ ⛔ no recipient.
- **F14** — **Ravi-mode reality (recorded, ⛔ not reopened):** the app session that requests the filing code is the DECEASED's account,
  whose login code goes to the deceased's registered mobile — in the Panel's scenario, the phone the person who changed the nominee holds.
  FQ6 therefore stops THAT person from filing again in the app (the code now reaches the true nominee, ⛔ not them); the true nominee files
  in the app only with access to that session, else through the helpline (which has ⛔ no handover code — `claims.helpline.routes.ts:14`).
  The masked last-4 shown to the phone holder becomes the true nominee's — it tells them only that a refusal exists, which they know.

## ⭐ Re-pin — what the shipped tree says (2026-10-08, at `b6a63a81`)

### New FOUND facts (F16–F37) — each verified by reading; the RB that answers it is named
> Pre-pin cites inside the copied RF text, at their positions as of `b6a63a81`: RF11's `claim-correction-reminders.ts:247-320` ⇒
> `:246-313` (the function; `:257-312` its body); RF11's `:287-290` (the hard-coded `{reference, helpline}`) ⇒ `:282-285`.
- **F16 — the code is ONE code for four flows.** The `claim_handover` elevation that `sendHandoverOtp` mints gates intake
  (`claims.routes.ts:124`), document upload (`:142`, incl. 6.21b's certificate replacement — `apps/mobile/lib/use-handover-otp.ts` is
  shared by `(claim)/handover-otp.tsx` and `(claim)/certificate-replacement.tsx`), nominee bank (`:174`) and reconciliation
  (`apps/api/src/modules/reconciliation/routes.ts:87`). RF9 (as committed — `sendHandoverOtp`, ⛔ no per-flow switch) moves the recipient
  for ALL of them while a refusal stands ⇒ P4′. Verify (`verifyHandoverOtp`, `claims.service.ts:157-180`) keys on the synthetic pool key
  `handover:<deceasedId>` (`:68-70`), ⛔ never the mobile ⇒ ⛔ nothing breaks in verify. ⇒ Task 2.4 traces each flow.
- **F17 — the audit's `recipient` lives only in memory.** `emitAuthAudit` context (`apps/api/src/modules/auth/shared/audit.ts:14-52`)
  reaches the DB only as `requestPayloadHash` (`apps/api/src/audit/audit-log-sink.ts:92-123`) ⇒ assert it on `CapturingAuditSink`
  (`apps/api/tests/integration/_setup.ts:118-126`). ⛔ No test asserts `member_claim.handover_otp_send` at all today.
- **F18 — today a bad envelope is a 500.** `decryptNomineeField` throws on the latest path (`claims.service.ts:110-114`); the domain's
  `resolveCorrectionMobile` throws on a malformed envelope too (*"a data fault, never swallowed"*, `correction-crypto.ts:30`) and returns
  `null` for null/blank and — via `normalizeMobile` — for the erasure sentinel `'[anonymized]'` (`member/anonymize.ts:77`) ⇒ **RB9**.
- **F19 — ⛔ no send core has ever been extracted.** Three callers use `sendClaimCorrectionSms` directly (`claim-correction-reminders.ts:497`,
  `claim-correction-closure.ts:369`, `claim-certificate-reminders.ts:656`); 6.19d ADDED a message to 6.19b's registry. 6.24b's is the
  FIRST extraction ⇒ **RB4**.
- **F20 — 0128's vocabulary differs from RF11's words.** Its status column is **`outcome`** (CHECK `0128:57`: `attempting, accepted,
  rejected_invalid_number, rejected_unreachable, no_target, error, skipped_superseded, recorded`), its claim FK is single-column
  (`0128:53`), and its finaliser expires `attempting` rows at the END OF THE DAY (`claim-correction-reminders.ts:789-805`) — a per-day
  slot's rule; a once-ever notice copied verbatim would turn a crash into a permanent `error` the next morning, i.e. STRANDED, which RF11
  forbids ⇒ **RB2, RB3**. The cleaner copy source is 6.19d's `0138_claim-certificate-reminder.sql` (same outcome set `:49`, same grant
  `:61`, `attempting_idx` `:72`) with its exact-set lockstep (`claim-certificate-reminder-policy-regression.spec.ts:385-389`, `checkValues`
  `:148`). The composite-FK precedent is `0143_claim-warning-approvals.sql:55`.
- **F21 — the house copy-key form.** `claim.json` keys are flat snake_case `group.key` (`correction_sms.reminder`, `certificate_sms.reminder`,
  `en/claim.json:147-151`), the namespace is the FILE; `claim.suspicionRefusalNotice.sms` would carry a doubled `claim.` and camelCase ⇒
  **RB1**. Interpolation is single-brace `{member}`; a missing param THROWS (`packages/i18n/src/resolver.ts:30,39`).
- **F22 — `{member}` has ⛔ no erasure guard on the 8.8 path.** `resolvePoolIdentity` / `resolveMemberFacingDeceasedName` never check
  `ANONYMIZED_SENTINEL`; an erased deceased's `name_ciphertext` decrypts to `'[anonymized]'` (`anonymize.ts:159-164`) and would RENDER
  (by reading — ⛔ not verified by a test). RF11's *"An unresolvable name (erased, ⛔ none) ⇒ `no_target`"* therefore needs an explicit
  check ⇒ **RB5**; the 8.8 gap itself is ⛔ not this story's (a `deferred-work.md` item, Task 7.3).
- **F23 — ⛔ no "locale date words" helper exists.** ⛔ No 6.19 text renders a date (its lockstep forbids it); ⛔ no Hindi month names in any
  source; `@twt/i18n` exports numbers/currency only (`packages/i18n/src/index.ts:33-44`); the only jobs date is the module-private
  `operationalDate` → `DD-MM-YYYY`, Latin digits, BOTH locales (amendment-A2; `contribution-notify-triggers.ts:269-274`) ⇒ **RB6**.
- **F24 — the 90-day limit has ⛔ no SQL form.** `hasSuspicionRefusalAppealLimitPassed` (`suspicion-refusal.ts:129`, *"⛔ never a second
  derivation"*) is TS-only ⇒ selector (c) projects the chain start and the statement clock in SQL and judges the limit in TS (⛔ a
  per-claim `readSuspicionChainStart` round-trip) ⇒ **RB10**.
- **F25 — the trigger lives only in `events_log`.** ⛔ No column on `claims`, ⛔ no closures table; `current_state = 'closed'` ⇔ trigger
  `suspicion_appeal_allowed` holds TODAY only because the schema admits one literal and there is one writer
  (`closeClaimsHeldBySuspicionAppeal`, `suspicion-refusal-persist.ts:149`). ⛔ No closed-by-trigger reader exists ⇒ **RB10**.
- **F26 — the refused filer's nominee side: linked version vs chain HEAD.** 6.19d resolves a nominee-side claimant at the HEAD of the
  linked version's correction chain (`readCertificateRecipients`, `certificate-reminder.ts:606-653`, CR6); `-293`'s reading says *"the
  nominee version the claimant is linked to"* ⇒ **RB7**.
- **F27 — the house i18n `$comment` marker** is a sibling key `$comment.<group>` present in BOTH locales (parity checks it); ⛔ no gate
  reads the marker (only the roster's closure criteria do).
- **F28 — the anonymizer keeps ⛔ no coverage list** (`member/anonymize.ts` — imperative UPDATEs; the comment at `:186-188`); ⛔ no test fails
  on a missing table ⇒ RF11's *"RECORD that in the anonymizer's coverage list if it keeps one"* resolves to a one-line comment there.
- **F29 — migrations are hand-authored; `db:generate` is unsafe.** `packages/domain/migrations/meta` holds snapshots `0000`–`0020`
  only (AI-6-4: hand-authored from ~0074 on); `drizzle-kit generate` diffs against `0020_snapshot.json` and would emit ~130
  migrations' drift; `db:check` (`packages/domain/package.json:15`) is `drizzle-kit check` — a consistency check, ⛔ not a schema parity proof; 0150's
  header reads *"Hand-authored — ⛔ never regenerate"* ⇒ Task 1.3.
- **F30 — 6.19b's failed-re-check rule (K4).** `skipCorrectionReminder` (`correction-reminder-record.ts:187-228`): on a failed re-check
  THIS job's own `attempting` row with `detail IS NULL` ⇒ `skipped_superseded`; with a `detail` (an attempt already ran — possibly
  after a gateway accept) ⇒ `expireOwnCorrectionReminder` ⇒ `error` / `exhausted:recheck_<reason>`, the transient detail kept in
  `first_detail`, and the caller ALARMS (`claim-correction-reminders.ts:433-445`; 6.19d `claim-certificate-reminders.ts:639-645`)
  ⇒ **RB10**.
- **F31 — every 6.19 cross-tenant statement takes a Pariwar allowlist.** The finaliser's `AND ($2::uuid[] IS NULL OR pariwar_id =
  ANY($2::uuid[]))` (`claim-correction-reminders.ts:795-798`; `claim-certificate-reminders.ts:183-187`), the selectors' `allow`
  (`claim-certificate-reminders.ts:261, :279`), the empty / production refusals (`claim-correction-reminders.ts:765-774`); each
  live harness sets `pariwarAllowlist: [PARIWAR]` (`claim-certificate-reminders-live.test.ts:241`) ⇒ Tasks 4.1, 4.4, 5.2, 5.4.
- **F32 — RF1 STANDS while an appeal is `open` or `upheld_final`.** `standingSuspicionRefusalSql` excludes only a `reversed` anchor
  and a `closed` claim (`suspicion-refusal.ts:51-80`, *"A stage-3 uphold (`upheld_final`) STANDS"*); `appealPositionOf` (`:209-217`)
  returns `not_filed` only for ⛔ no anchor within the 90 days ⇒ "stands + within 90 days" texts *"It can be appealed until [date]"*
  to a person who has ALREADY appealed ⇒ **RB13**.
- **F33 — a config fault is FINAL in 6.19's send.** An unset template id / helpline / gateway, or a known Secret Manager fault,
  returns `{ kind: 'final', outcome: 'error', … alarm: true }` (`claim-correction-reminders.ts:258-281`); `error` is a FINISHED
  outcome ⇒ for a once-ever notice it burns the only slot (6.19's reminders recover at the next slot) ⇒ **RB12**.
- **F34 — the 6.19 DLT sheet's gate names Rows 18 / 19 only.** `dlt-template-requests-6-19.md`'s *"What it gates"* names *"the **real** sends of
  Stories 6.19b, 6.19c and 6.19d"*, *"additionally gated on counsel's M and S (`inventory-roster.md` rows 18, 19)"*, under *"## The
  six templates owed"* ⇒ templates 7–12 appended there with ⛔ no Row-22 link could be provisioned when Rows 18 / 19 close ⇒ **RB11**.
- **F35 — a declared version always carries a mobile.** `0119_nominee-declaration-history.sql:47-62` `kind_coherence_check` (`kind =
  'declared' AND … mobile_ciphertext IS NOT NULL`); effective entries are declared-only (`nominee-effective.ts`, `survivors = …
  kind === 'declared'`); `twt_app` has ⛔ no DELETE on the table (`0119:73`) ⇒ a NULL rank-1 mobile and an empty
  `getNomineeVersionsByIds` result are UNREACHABLE (data faults); the sentinel IS reachable (the anonymizer encrypts
  `'[anonymized]'`; `GRANT UPDATE (mobile_ciphertext)` `0119:75`) ⇒ **RB9**, AC6b.
- **F36 — S's own allowed appeal never closes S.** `closeClaimsHeldBySuspicionAppeal` closes the OTHER claims
  (`ne(claims.claimCaseId, input.reversedClaimCaseId)`); S only gets `claim_appeals.status = 'reversed'` ⇒ after the reversal S is
  ⛔ not standing (`reversed`) and R is ⛔ not standing (`closed`). A `closed` S needs TWO refused claims (S1 closed by S2's
  allowed appeal) ⇒ AC6b.
- **F37 — a refused or closed claim's determination is FROZEN.** A determination is recordable — and a 6.20 correction can supersede
  one (⇒ `undetermined`, `nominee-effective.ts:22`) — only in `CLAIM_REVIEW_WINDOW_STATES` (`review-window.ts:15-21`:
  `verification_in_progress`, `verifier_review`, `verifier_approved`, `reversed`, `state_trustee_freeze`;
  `nominee-determination-persist.ts:180-183`, `nominee-correction-persist.ts:79`), and a correction supersedes only its OWN claim's.
  A standing refused S (`denied` / `appeal_stage_*`) and a `closed` R are outside it ⇒ their status is FINAL for the sweep; a
  `closed` R keeps its determination (`endLiveProcesses`, `suspicion-refusal-persist.ts:215-240`). The reversed S IS inside the window
  (`reversed`): approving it after a certificate re-review forces a re-determination (`death-certificate-approval.ts:438-440,
  :453-476`, `determination_stale`) whose marks follow the NEW death date ⇒ the post-death version can stand at rank 1 ⇒ **RB15**
  (RB14 withdrawn).

### Build decisions RB1–RB18 — ⚠ the author's; ✅ committed by `2026-10-08-295`
> §0 gate: each is *"the code should do X"*, a key name, a column name, or a reading of an UNRATIFIED reading — ⛔ none changes what the
> Trust owes or discloses (checked against the template's §0). RB6, RB7 and RB13 AMEND `-293` readings; RB15 amends a `-291` reading
> and supersedes `-292` RF12's fallback mechanism; RB18 narrows OUR reading of `-291` Q2 toward its ratified words (*"the true nominee's claim"*) (⚠ OUR, ⛔ not ratified) — by the new entry, ⛔ never by editing `-293` / `-291`. RB7's basis is the RATIFIED word *"the
> mobile on that nominee **entry**"* (an entry, ⛔ a version). **ANSWERED by BigDev 2026-10-08 — EVERY RB as recommended:** RB13, RB17 and RB12's policy (validate pass); at Task 0.2, RB1–RB5,
> RB8–RB11, RB12's MECHANISM (the sweep-side config check) and RB16 (*"Accept all (Recommended)"*), RB15 (*"S's, as of R's closure"*),
> RB18 (*"Skip it, alarm"*), RB6 (*"DD-MM-YYYY"*), RB7 (*"Head of the chain"*). RB14 is WITHDRAWN. ✅ **COMMITTED by `2026-10-08-295`** (`a6d55b1d`,
> alone, before any code) — with, after its fresh-context check, RB13 + RB18's narrowing put to the Panel as `-295` §8 Confirm 2
> (BigDev: *"Keep + Panel confirm (Recommended)"*), answered before Row 22 closes.

- **RB1 — the copy keys (F21).** House form, namespace `claim`: `suspicion_sms.refusal_notice` (FQ7), `suspicion_sms.closed_notice`
  (`-291` Q2), `suspicion_sms.appeal_notice` (`-293` item 1), plus `$comment.suspicion_sms` in en AND hi (the NOT-YET-HUMAN-REVIEWED
  marker + *"must match the registered DLT content byte for byte"*, the `$comment.certificate_reminder` precedent, `en/claim.json:150`).
  Supersedes the SPELLING only of RF11's `claim.suspicionRefusalNotice.sms`, RF12's `claim.suspicionClosedNotice.sms` and this file's
  `claim.suspicionRefusalAppealNotice.sms`. *(Alt: keep RF11's spelling — a doubled `claim.` prefix and the file's only camelCase keys.)*
- **RB2 — the table's vocabulary (F20).** Copy **0138** (6.19d), ⛔ not the words "status": the column is **`outcome`**, its CHECK the
  EXACT 0128/0138 set (all 8 values — ⛔ invent none, ⛔ drop none; `recorded` stays unused HERE — 6.19d uses it only for its staff
  purposes, 0141 `purpose_outcome_check`), `attempting_claimed_check`, the `attempting_idx` partial index on `claimed_at`, and the
  per-attempt columns `attempt_count`, `detail`, `first_detail`, `provider_message_id`, `claimed_by_job` (all `text` but
  `attempt_count`, as 0138). `pariwar_id`, `claim_case_id`, `purpose`, `outcome` NOT NULL. The composite FK `(pariwar_id,
  claim_case_id)` → `claims` as RF11 says (0143's form, target `claims_pariwar_claim_case_uq`); `recipient_version_id` FK →
  `member_nominee_versions(version_id)` ON DELETE no action (0128 `:54`, 0138 `:46`; nullable — a non-nominee claimant has none). ⛔ No `run_id`, `slot_day`,
  `sent_on`, `recipient_key`, `subject_key`, `late`, `delivered_at` (per-day/per-slot columns a once-ever notice has ⛔ no use for).
- **RB3 — reclaim and give-up for a ONCE-EVER notice (F20).** Each (claim, purpose) is enqueued as ONE pg-boss child job (6.19b's
  `CHILD_RETRY_LIMIT` 4 / delay 60 / backoff); its `singletonKey` is a LABEL only (`packages/queue/src/index.ts:369` — the `standard` policy enforces ⛔ no uniqueness): the UNIQUE + the lease are the dedup. A
  transient failure keeps the row `attempting` (`detail` noted) and throws for a pg-boss retry; a row left `attempting` is RECLAIMED by
  the next daily sweep (the selector is *"⛔ no FINISHED row"*; the child takes over past `CORRECTION_SEND_LEASE_MS`,
  `correction-reminder-record.ts:59`, `attempt_count + 1`, `first_detail` kept — 6.19b's `claimCorrectionReminder` rule, `:134-185`;
  same-day pg-boss retries reclaim at once as `ownRetry`, `:162-165`). The finaliser gives up only after THREE IST calendar days
  from `created_at` (⛔ executed runs — a skipped sweep day still counts): `outcome = 'attempting' AND created_at <
  istMidnightAt(addCalendarDays(todayIst, -2))` ⇒ `error` / `exhausted:attempting_three_days` + an alarm listing the claim ids
  (`SUSPICION_NOTICE_RECLAIM_DAYS = 3`, one named constant; a config gap CREATES ⛔ row, RB12 — only a crash-left row meets this). ⚠
  **At-least-once (6.19b's, `claim-correction-reminders.ts:46` — recorded, ⛔ never hidden):** a timeout or a crash after a
  gateway accept may produce a second text; `attempt_count` and `first_detail` record it. *"Once ever"* holds for FINISHED rows.
  *(Alt: 6.19b's end-of-day finaliser verbatim — one crash = a permanent `error`, contradicting RF11's "never stranded".)*
- **RB4 — the extraction (F19).** New `apps/jobs/src/scheduler/claim-dlt-sms-send.ts` exports `sendClaimDltSms(deps, { dltTemplateIdConfigKey,
  pariwarId, e164, render: (helpline: string) => string })` (sufficient: the body uses only `deps.{smsAppClient, resolveConfig,
  sendTimeoutMs}`, the two config keys and the render; it never alarms or logs — callers add ids). The core keeps
  `claim-correction-reminders.ts:258-281` and `:286-312` VERBATIM (one token excepted: `template.dltTemplateIdConfigKey` ⇒
  `input.dltTemplateIdConfigKey`, since `:257`'s lookup stays in the wrapper), and calls `input.render(helpline.trim())` at `:282`'s position —
  after the gateway check, OUTSIDE the `try` (a `t()` throw stays a crash ⇒ a pg-boss retry, ⛔ a final `error`). `:257`'s registry
  lookup stays in the wrapper. `sendClaimCorrectionSms` becomes a wrapper that passes its registry's key and `render = (h) =>
  renderClaimCorrectionSms(message, locale, { reference: claimShortReference(id), helpline: h })` — behaviour byte-identical, PROVED by
  `apps/jobs/tests/claim-correction-send.test.ts` passing UNCHANGED (⛔ not one line edited). What moves: `CORRECTION_SEND_TIMEOUT_MS`
  (`:112`) and `ClaimCorrectionSmsResult` (`:205`) — both RE-EXPORTED from `claim-correction-reminders.ts`; `withTimeout` (`:219`) and
  `SendTimeoutError` (`:217`) — module-PRIVATE today, they stay private in the new module. The core's deps type is declared
  structurally there (or imported type-only) — ⛔ no VALUE import from `claim-correction-reminders.ts` (a reminders ↔ dlt-send runtime
  cycle, [[project_type_only_import_cycle_trap]]). The helpline key is 6.19b's `claimCorrectionHelplineConfigKey` (the SAME
  per-Pariwar number, RF11). The sibling's DLT keys: `sms.dlt.template_id.suspicion_notice.<message>.<locale>`, messages `refusal_notice |
  closed_notice | appeal_notice`.
- **RB5 — `{member}` (F22).** After `decryptKycField`: the plaintext `=== ANONYMIZED_SENTINEL` (import from `@twt/domain`'s `member`
  namespace) ⇒ `no_target` / `name:erased`; `resolveMemberFacingDeceasedName(mode, name) === ''` ⇒ `no_target` / `name:unresolvable`; ⛔ no
  KYC profile / null ciphertext ⇒ `no_target` / `name:none`; a decrypt THROW ⇒ transient (`decrypt_failed:kyc`), as 6.19b's
  `decrypt_failed:tier1`. The mode is read ONCE per child with `kycDomain.resolvePublicNamePresentationMode` (`kyc/presentation-policy.ts:63-69`;
  absent row ⇒ `full_name`) in its OWN `withPariwarScope`, BEFORE the claiming transaction (the read-once precedent is
  `contribution-notify-triggers.ts:713-724`); a mode-read failure ⇒ transient + alarm. ⛔ Never catch a DB error inside the claiming
  transaction: a failed statement aborts the PG transaction (`withPariwarScope` takes ⛔ no SAVEPOINT), the COMMIT silently rolls the
  claim back, and the child sends on a row it does not hold ⇒ a second text next day. ⛔ Never `resolvePoolIdentity` itself (it takes a pool input and reads `getClaimCase`; this path has
  neither need).
- **RB6 — `{date}` (F23).** The `begun` result's `appealUntil` (6.24a's `suspicionRefusalAppealUntil` — a `CalendarDateString` `YYYY-MM-DD`, IST) rendered
  `DD-MM-YYYY`, Latin digits, in BOTH locales — the amendment-A2 form `operationalDate` uses — by a pure reorder of the string's parts
  (⛔ never a `Date` round-trip, ⛔ never `operationalDate` itself — it is UTC-based and private). Amends `-293`'s reading *"in the
  recipient's locale's date words"*. ⚠ The refused person then meets TWO forms of the same date — this text's `DD-MM-YYYY` and 6.24a's
  helpline read-back, which shows raw `YYYY-MM-DD` (`deferred-work.md` item *"The appeal date is read to the family as raw
  `YYYY-MM-DD`"*) — recorded; that item's fix should adopt this form. *(Alt: en/hi month names — new vocabulary, a Hindi month list to
  review, ⛔ no precedent.)*
- **RB7 — the refused filer, nominee side (F26).** The mobile at the HEAD of the correction chain that `claimantNomineeVersionId` belongs
  to — a correction is the SAME person's entry corrected. 6.19d CR6's order: the chain ROOT first, then its head (`certificate-reminder.ts:630-632`;
  on a fork the head of the linked version and the head of the root can differ). Exported helpers only: root = the last element of
  `correctionChainOf(v, index)` (`claim-contact-check.ts:85`; index from `readVersionChainIndex`, `:71`), head = `chainHeadOf(root,
  versions)` (`certificate-reminder.ts:548`, over `listNomineeDeclarationVersions`). ⛔ `chainRootOf` (`certificate-reminder.ts:577`)
  is private — ⛔ never a copy of it. `chainHeadOf` is structural (it reads ⛔ no determination marks), so it resolves a version the
  determination DISCARDED. Build the index and the `ChainVersion[]` (`{ versionId, correctsVersionId, versionNo }`, the
  `certificate-reminder.ts:617-622` mapping) from ONE `listNomineeDeclarationVersions` read. `recipient_version_id` = that head. Amends `-293`'s reading *"the mobile on the nominee version the claimant is linked to"*. *(Alt:
  the linked version itself — a corrected number is ⛔ never used.)* ⛔ No filing-agreement gate (`-293` names none; 6.19's agreement is
  the filer's consent to contact OTHERS — recorded).
- **RB8 — where the code lives.** `readSuspicionRefusalRecipient` in `suspicion-refusal.ts` (it returns a `versionId` only — the module
  stays *"ref-only"*; NW1-safe: `nominee-effective.ts` reaches ⛔ none of NW1's forbidden files — verified). Everything the sweep needs
  in the domain — the three selectors, the claim-row lock, the re-checks, `readRefusedFilerRecipient` (it RETURNS ciphertext, so ⛔ not in
  the ref-only module), the closed-claim source read and the claim / finalise / expire / transient row helpers — in a NEW
  `packages/domain/src/claim/suspicion-notice.ts`, ⛔ not an NW1 entry, joining `FENCED_FILES`
  (`nominee-name-no-comparison-fence.test.ts:38-115`, pin `:164` 38 → 39, reason recorded), exported from `claim/index.ts` (the
  `:94-100` form) so jobs reach it as `claimDomain.*`. ⛔ Nothing in the domain decrypts. ⚠ *"Ref-only"* is today a CONVENTION —
  `FENCED_FILES` forbids only name comparison (`:124-141`), and the fence's 6.24a comment (`:110-112`, *"⛔ no decrypt (asserted
  below)"*) has ⛔ no assertion behind it ⇒ Task 2.1 adds one. ⚠ `suspicion-notice.ts` imports `SUSPICION_APPEAL_ALLOWED_TRIGGER` from
  `suspicion-refusal-persist.ts` (⇒ `project.ts` ⇒ `events.ts`) — allowed: it is a WRITE module, ⛔ not an NW1 read module (Trap 12's
  *"never import `claim/events.ts`"* binds `suspicion-refusal.ts` and `nominee-effective.ts`, ⛔ this module).
- **RB9 — RF9's data fault (F18, F35).** A malformed envelope on the at-death path THROWS (500), exactly as today's latest path — ⛔ never
  swallowed into the no-op; so does an EMPTY `getNomineeVersionsByIds` result for the rank-1 `versionId` (unreachable — F35 — a data
  fault). Every no-op (⛔ nominee, unsendable, `none`, sentinel) returns through ONE shared helper `noOp(recipient)` (today's two
  bodies are identical: `await timingEqualizeDelay(); return { sent: true, nomineeMobileMasked: '', otpHash: null }`,
  `claims.service.ts:104-108`, `:116-120`) so the shape and the pad cannot drift. `recipient` on every outcome: `'latest'` on the
  latest path (incl. its no-ops); `'at_death'` on `at_death` (sent or unsendable / sentinel) AND on `none`. The latest path is
  BEHAVIOUR-identical (same body, same delivery, same pad — only the internal outcome gains `recipient`), ⛔ byte-identical; and the
  RF1 read now runs FIRST on every send — a data fault there (`readStandingSuspicionRefusals` throws on a null chain start or an
  unexpected anchor status, `suspicion-refusal.ts:193-195, :216`) is a 500 for the whole death, the latest path included.
- **RB10 — the selectors (F24, F25, F30, F32).** Every selector and the finaliser take `allow: readonly string[] | null` (the
  `$2::uuid[]` filter, F31); raw SQL keyset-paged on the UNFILTERED SQL page (the cursor and the last-page test ⛔ see the TS filter
  below) and bounded by `LIMIT ${clampLimit(…)}` (the `suspicion-refusal.ts:166, :187` form — the
  domain-invariants gate sees only AST `.limit(`, so its green proves nothing here). (a) `suspicion_refusal`: RF1 stands on the claim
  AND ⛔ no finished row. (b) `closed_after_appeal`: `current_state = 'closed'` AND EXISTS its `claim.closed` event — `events_log e`
  joined `e.pariwar_id = c.pariwar_id AND e.stream_id = c.claim_case_id AND e.event_type = 'claim.closed' AND e.payload->>'trigger' =
  SUSPICION_APPEAL_ALLOWED_TRIGGER` (`events_log` has ⛔ no `claim_case_id` column; the claim stream id IS the claim id,
  `project.ts:51`; index `events_log_pariwar_stream_idx`) (⛔ never `current_state` alone) AND ⛔ no finished row; the reversed claim =
  that event's `held_by_claim_case_id`. (c) `refusal_appeal_notice`: RF1 stands AND ⛔ no finished row in SQL (it MAY also exclude a
  claim with any `claim_appeals` row — a prefilter only); the statement projects `suspicionChainStartedAtSql(…)` (`:91`, exported) and
  `clock_timestamp()` (the `readStandingSuspicionRefusals` `:176, :181` precedent) and TS drops a claim whose
  `hasSuspicionRefusalAppealLimitPassed(chainStartedAt, clock)` is true before enqueueing (⛔ a SQL re-derivation of the 90 days, ⛔ a
  per-claim round-trip; the timestamps converted to `Date` — `suspicion-refusal.ts`'s `toDate` is private). ⭐ **Every selector ALSO
  returns a claim that already has an `attempting` row of that purpose** (a crash left it) — bypassing the predicate, the TS 90-day
  filter and the prefilter — so its locked re-check runs and finishes it (⛔ a row stranded once its predicate turns false). ⚠ (c)
  re-scans a standing refusal past its 90 days every day (⛔ no row is written for it) — cheap only because refusals are rare;
  recorded. Under the lock, (c) is decided by 6.24a's ONE derivation: `readStandingSuspicionRefusals(db, pariwarId,
  deceasedMemberId)`, ON the locked transaction's client → this claim's row → `appeal === 'not_filed'` (RB13 — it folds in both the
  anchor and the 90 days, on the statement's clock; ⛔ an injected `now`); `{date}` = that SAME row's `appealUntil` (carried in the
  `begun` result — ⛔ recomputed from a chain start). This claim's row ABSENT (⛔ standing, or beyond `STANDING_READ_CAP` = 50,
  `:152`) = a failed re-check. A claim whose 90 days passed, or whose appeal was filed, writes ⛔ NO row (so a revision away
  and back, a new chain, still gets its first and only text — `-293`). **A failed re-check — ONE rule for all three purposes, 6.19b's K4
  (F30) EXTENDED:** a FRESH claim ⇒ ⛔ no row; an existing `attempting` row of THIS job ⇒ as K4 — `detail IS NULL` ⇒
  `skipped_superseded`; `detail` set ⇒ `error` / `exhausted:recheck_<reason>` (the detail kept in `first_detail`) + an alarm, ids only.
  ⭐ The extension (⛔ in 6.19b, which leaves another job's row alone): another job's `attempting` row PAST `CORRECTION_SEND_LEASE_MS`
  is taken over first (the claim rule), then judged as THIS job's; one still WITHIN the lease ⇒ `held_by_other`, left alone. ⚠ RB15's `no_target` and RB18's exclusion are ⛔ re-check failures — the predicate HELD; they FINISH the slot (a
  `no_target` row); RB10's no-row rule does ⛔ apply to them. ⚠ Accepted edge: a reclaimed NULL-`detail` row finished `skipped_superseded` blocks that
  purpose for that claim for good (UNIQUE) — nothing was sent, and a later standing refusal of the SAME claim gets ⛔ no text;
  recorded, ⛔ not engineered around.
- **RB11 — the go-live records (F34).** ONE new roster row (Row 22, counsel's basis for all three texts — ⛔ not Row 18 / 19) whose
  closure needs (a) counsel's basis, (b) a privacy-policy revision naming these purposes and (c) the Panel's answer to `-295` §8
  Confirm 2 (RB13 + RB18) (the Row 18 / Row 19 split is the
  precedent; Row 19's purpose covers *"the claim contact record and its SMS / postal use"*, while FQ7's and Q2's texts use the
  DECLARATION mobile); and ONE Hindi human-review row (Row 23, the Row 21 precedent — `-262`, `-291` and `-293` each list the Hindi
  wording under *"does NOT cover"*; the en wording was settled by `-292` RF11). The DLT sheet gains templates 7–12 as a NEW section of
  `dlt-template-requests-6-19.md` (6.19d's precedent — ⛔ no sibling sheet), its owed table and its Record table — AND its *"What it
  gates"* paragraph names Rows 22 / 23 for 7–12, the *"six templates owed"* heading is renamed, and the 7–12 section and its Record
  row say ⭐ *"⛔ do not provision the ids of 7–12 until Row 22 closes"*. Row 22's blockquote carries Row 18's sentence (every deploy
  before counsel clears is a dev / staging deploy, where the DLT template ids stay unset).
- **RB12 — a missing config never uses up the slot (F33).** ✅ **BigDev 2026-10-08** chose the POLICY (*"keep the slot open … once
  go-live sets the ids, the texts go"*); the MECHANISM below was revised over two re-validate rounds (parking `attempting` rows stranded
  them and let a config note mask a possible send; a child-side summary alarm had ⛔ no channel back to the sweep) — ⚠ put to BigDev at
  Task 0.2. **The SWEEP checks the config** once per run, BEFORE it enqueues: `smsAppClient.isConfigured()`; each needed template key
  (`resolveConfig(<the sibling's key for message + locale>)` — for `appeal_notice` BOTH locales' keys, since its locale is resolved
  only under the lock); and `resolveConfig(claimCorrectionHelplineConfigKey(pariwarId))` once per Pariwar seen (the sweep's deps,
  `Omit<ClaimCorrectionReminderDeps, 'push'>`, carry all three). A claim whose purpose / Pariwar has a gap — `null` / blank /
  unconfigured, or ANY Secret Manager fault (known or transient, `classifySecretManagerFault`) — is ⛔ enqueued and ⛔ written; the
  sweep ends with ONE alarm listing, per purpose, the count and the claim ids (ids only). The next daily sweep re-selects it (⛔ no
  finished row) ⇒ once go-live sets the ids, every notice still due is sent; `refusal_appeal_notice` stops being selected once its 90
  days pass or an appeal is filed (⛔ no row is ever written). **The child repeats the same check** as a race guard before claiming a
  row: a gap ⇒ ⛔ row, ⛔ decrypt, an alarm with ids only (now rare). ⚠ **Accepted edges, recorded:** (i) config that VANISHES between
  the child's check and the send hits the shared core's own check ⇒ `error` (`config:*`, final + alarm — 6.19's rule, RB4 unchanged);
  (ii) a PROVIDER-side config fault after the check (`dlt_template_not_approved`, `auth`, `unknown` — the core's default branch) is
  final `error` too ⇒ the DLT sheet's 7–12 section says *"set the ids only after the operator confirms each template's approval"*;
  (iii) a crash-left `attempting` row whose claim meets a config gap OUTLASTING three IST days is ⛔ re-checked and reaches RB3's
  finaliser (`error`, even with `detail` NULL) — one slot used, alarmed by the finaliser's claim-id alarm. Each costs one notice and is alarmed; ⛔ none is silent.
- **RB13 — the refused-person text only while ⛔ no appeal is filed (F32).** ✅ **BigDev 2026-10-08.** Selector (c) and its locked
  re-check require the claim's appeal position `not_filed`. An appeal filed (`open`) or upheld (`upheld_final`) before the sweep ⇒ ⛔ no
  text, ⛔ no row (a row left `attempting` by a crash ⇒ RB10's K4). Amends `-293`'s reading *"while the refusal stands and its 90 days have ⛔ not
  passed"* — a person who has appealed is ⛔ never told they can appeal. ⚠ This narrows WHEN `-293` item 1's ratified text goes ⇒ put
  to the Panel as `-295` §8 Confirm 2 (a), answered before Row 22 closes.
- **RB14 — WITHDRAWN at the re-validate (F37 corrected).** v2.1 proposed *"`undetermined` ⇒ not due"*; a standing S's or a closed R's
  determination ⛔ cannot change (F37), so the rule would re-select the claim daily for ever and its AC leg could ⛔ never be built. ⇒
  RF11's rule stands as written: any non-`effective` status ⇒ `no_target` (finished). ⛔ No rule here.
- **RB15 — the closure text's fallback is S's determination AS IT STOOD when R was closed (`-291` reading; `-292` RF12; F37).**
  Traced from code: R can be closed in ANY state but `settled` / `approved` / `state_trustee_approved` / `closed` (`state.ts:359-364`;
  `suspicion-refusal-persist.ts:186`), incl. `intake_pending` / `documents_pending`, and a determination is recordable only from
  `verification_in_progress` on ⇒ an R closed early has ⛔ NO determination, so RF12's fallback is NEEDED. But S's LIVE determination
  is the wrong source: the reversed S is in the review window, approving it forces a re-determination against the moved death date
  (`death-certificate-approval.ts:438-440, :453-476`), and `getEffectiveNomineeDeclaration` reads the live determination's highest
  standing version per rank (`nominee-effective.ts:10`) ⇒ S's rank 1 can become the POST-DEATH version — the person whose appeal won.
  ⇒ `closed_after_appeal`'s recipient: R's OWN live determination's rank 1 when `effective`; else S's determination AS OF R's
  `claim.closed` event — S's `nominee_determinations` row live at the event's `occurred_at` (half-open: `d.decided_at <= e.occurred_at
  AND (d.superseded_at IS NULL OR d.superseded_at > e.occurred_at)`; a redetermination stamps the old `superseded_at` and the new
  `decided_at` with the same `now()`, `nominee-determination-persist.ts:293-294`, so at most one row matches — a `correction_applied` supersession leaves a gap, unreachable for a frozen S; `0119:152-153`). S
  stands, and its determination is frozen (F37), until that same reversal ⇒ it is the finding made at the refusal. Rank 1 is
  resolved by the SAME rule as `getEffectiveNomineeDeclaration`: a determination selector (id or instant) added to `readRaw` in
  `nominee-effective.ts`, routed through the unchanged `resolveEffectiveNomineeDeclaration` — ⛔ a copy of its rule (⛔ new import ⇒
  NW1 stays green); the disqualification findings it reads bounded `recorded_at <= T` too (latent — ⛔ production writer until 6-22).
  For BOTH of (b)'s sources the mobile is taken at the chain head RB7's way (root first: the last of `correctionChainOf`, then
  `chainHeadOf(root, versions)`) — a 6.20 correction of the same person's entry is followed, ⛔ an old number texted. ⚠ Recorded:
  purpose (a) (RF9 / RF11, copied) texts the rank-1 version's OWN mobile, so after a correction raised on another claim of the death,
  (a) and (b) can reach the same person at two numbers. Else `no_target` **+ an alarm (ids only)**: the DOMAIN writes a FINISHED `no_target` row (`detail = 'no_target:closed_no_determination'`)
  in the claiming transaction and returns `{ kind: 'no_target', reason: 'closed_no_determination' }`; the child alarms once and
  returns — so a ratified text is ⛔ lost unseen (⚠ accepted edge: a crash between the commit and the alarm loses the alarm, ⛔ the
  record — the finished row and its `detail` stay). Supersedes, as a MECHANISM, `-292` RF12's *"else the reversed claim's"* (S's LIVE determination) and amends the
  matching `-291` reading — both named in the author-commit. PROPOSED (recommended) at Task 0.2. *(Alt: S's live determination, as
  RF12 is written — can text the person whose appeal won "Your claim … has been closed".)*
- **RB16 — the no-deadline deny-list stays (6.19 S4 / T6).** `assertNoDeadlineThreat` (`claim-correction-sms-templates.test.ts:47` —
  Hindi `दिन / भीतर / अंतिम / तुरंत / अन्यथा …`, en `days|within|deadline|urgent|last chance`, Devanagari digits) applies to all three
  texts; for `appeal_notice` ONLY the `{date}` slot is exempt (the Panel's ratified *"until [date]"* — the assertion runs on the body
  rendered with a non-digit `{date}` marker; the real date's Latin digits are ⛔ Devanagari, RB6). The helper and `HINDI_DEADLINE_TERMS`
  (`:27`) are private to 6.19's test file, which AC9b keeps unchanged ⇒ the sibling test holds its own copy of both (test-only; the
  list copied whole — ⛔ a shortened list). The S4 / T6 carve-out is recorded
  beside D33's in the author-commit and in the sibling registry's header; the DLT sheet's 6.19 note (*"⛔ No name … ⛔ no deadline"*)
  states the 7–12 carve-outs.
- **RB17 — F14 is disclosed to the Panel, ⛔ blocking nothing.** ✅ **BigDev 2026-10-08.** The user story and P4 say what FQ6 does and
  does ⛔ not do (above). A NON-blocking confirm goes into the NEXT Trustee Panel routing note (the `-284` E5 precedent): *"FQ6 stops
  the person who made the change from filing in the app. The filing code is requested from the member's own account, so the true
  nominee files and completes her claim in the app only if she has access to that account — otherwise through the helpline — and
  whoever holds that phone sees
  the last four digits of her number. Confirm."* The author-commit records the confirm as OWED; ⛔ no 6.24b work waits on it.
- **RB18 — ⛔ closure text about a claim the person who made the change filed.** Selector (b) as written texts EVERY claim closed by
  the trigger — incl. one filed by the post-death nominee, so the true nominee would be told *"Your claim … has been closed"* about a
  claim she never filed, while the ratified Q2 B is *"when an allowed appeal closes the true nominee's claim"*. A `-239` refusal does
  ⛔ mark the filer's side (`assertPostDeathRefusalGrounded`, `verifier-decision-persist.ts:143-157`, needs only a `discarded`
  item in the claim's OWN determination, and every claim of the death judges the same versions — so the true nominee's own refiled
  claim can carry `-239` too). ⇒ the test is WHO FILED, judged ONLY under the lock in `beginSuspicionNotice`, AFTER RB15 has chosen
  its source: if RB15 gives `no_target`, that row is written and RB18 is ⛔ evaluated; else R is excluded when its
  `claim_contacts.claimant_nominee_version_id`'s correction chain (`correctionChainOf`, child → root) holds a version that RB15's
  chosen (effective) determination marks `discarded` — a version positioned on or after the certificate day (the D6 guard; a
  pre-death version is ⛔ ever `discarded`). Version ids only (NW1- and fence-safe). An exclusion: the DOMAIN writes a FINISHED `no_target` row
  (`detail = 'excluded:claimant_discarded_version'`) in the claiming transaction and returns `{ kind: 'no_target', reason:
  'excluded_claimant' }`; the child alarms ONCE (ids only) and returns (RB15's crash-before-alarm edge applies) — safe to finish:
  a `closed` claim is terminal, R's determination is frozen (F37) and S's as-of read is pinned to an instant, so the verdict ⛔ can
  change. ⚠ Residuals, recorded: (i) ⛔ contact row, or a NON-nominee claimant ⇒ texted; (ii) a post-death version that re-declares
  the TRUE nominee herself (e.g. her new number entered after the death) ⇒ her own claim linked to it is EXCLUDED (alarmed); (iii)
  before R is determined, a claimant filing as the rank-1 nominee can only be linked to the CURRENT (post-death) version
  (`claim-contact-persist.ts:187-207` — the member app always, the admin surface until R's determination is effective) ⇒ such a claim
  is excluded (alarmed); (iv) a claim filed by a rank-2 true nominee (a pre-death version) still texts rank-1. ⚠ (ii)–(iii) can withhold
  `-291` Q2 B's ratified text from the true nominee about her OWN claim ⇒ `-295` §8 Confirm 2 (b), answered before Row 22 closes. PROPOSED (recommended)
  at Task 0.2. *(Alt: text every closed claim — a confusing text about a claim she did not file.)*

## Acceptance Criteria

### AC0b — Governance and re-pin (Task 0)
6.24a is `done`; the baseline is re-pinned to 6.24a's merged tree (`b6a63a81`) and every code claim re-derived; ⛔ no decision after `-292`
(other than `-293`) touches FQ6 / FQ7 / `-291` Q2 / `-293` item 1 (`-294` checked); RB1–RB18, the v1.1 `-293` paragraph's mechanics, the
D33 and S4 / T6 carve-outs and the RB17 confirm (recorded as OWED) are COMMITTED as one author-commit, ALONE, before any code; work is on
`story/6-24b-filing-code-and-texts-to-the-nominee-in-place-at-the-death`. ⛔ No code before.

### AC6b — The filing code (FQ6; RF9, F6, F10, F14, F16–F18, F35, F36; RB8, RB9)
**Given** the deceased's declaration had version 1 (nominee A, mobile …1111) and a post-death version 2 (nominee B, mobile …2222), and the
District Admin's determination on claim S marks v1 `stands` / v2 `discarded`, and S is refused `-239`, **when** the Ravi-mode session
requests the handover code, **then** it goes to …1111 (the masked hint ends 1111; `stepUpDelivery.last.resolvedMobile` is A's E.164), the
audit line `member_claim.handover_otp_send` carries `recipient: 'at_death'`, and ⛔ neither A's 10-digit nor E.164 number appears anywhere
in the captured audit events (the masked `+91·····1111` is expected there). **Before** any refusal, **after** S's appeal is allowed (S's
anchor `reversed` — F36), and after a revision off `-239`, the code goes to the latest nominee as today (`recipient: 'latest'`); a
**closed** refused claim: S1 and S2 both refused, S2's appeal allowed ⇒ S1 `closed` ⇒ `latest`. **Given** a standing refusal whose
determination is ⛔ not `effective`, or whose rank-1 mobile is the erasure sentinel or unsendable (a non-Indian number), **then** the
response is the existence-defended no-op (`toStrictEqual` the ⛔-nominee branch's body, zero deliveries, the same `noOp` helper, audit
`recipient: 'at_death'`) — ⛔ never …2222. (A NULL rank-1 mobile is unreachable — F35 — ⛔ no test leg.) A two-nominee effective set
sends to rank 1. Two standing refusals ⇒ the most recently CREATED refused claim's determination (the test creates the claims in the
OPPOSITE order to their refusals). A malformed envelope ⇒ 500 on both paths (RB9).

### AC7b — The texts (FQ7; `-291` Q2 B; `-293` item 1 B; RF11, RF12, RF14 (b); RB1–RB7, RB10, RB12, RB13, RB15, RB16, RB18)
**Given** a standing `-239` refusal, **when** the sweep runs, **then** ONE notice row is written and one text is sent to the refused claim's
rank-1 effective nominee, in Hindi (RF11), naming the member in the Pariwar's mode-resolved form (`-181`; both modes tested), carrying the
helpline number; ⛔ no plaintext number or name is stored, logged, alarmed, enqueued or audited. A second run sends ⛔ nothing; a refusal
revised away before the sweep's locked re-check sends ⛔ nothing (a FRESH claim writes ⛔ no row); a revision away and back ⛔ never
re-texts; a non-`effective` determination (final for a standing or closed claim — F37), an unusable mobile or an erased /
unresolvable member name records `no_target`; a crash after the claiming commit is reclaimed by the next run (also once its predicate
has turned false — the selector returns any claim with an `attempting` row) and given up only after three IST days (RB3); a row whose
locked re-check fails follows RB10's one rule (`detail` NULL ⇒ `skipped_superseded`; set ⇒ `error` / `exhausted:recheck_<reason>` +
alarm). ⚠ Delivery is at-least-once
(RB3) — recorded in `attempt_count` / `first_detail`, ⛔ never hidden. **With the DLT template ids unset** (as shipped), the send fails closed — ⛔ never a send on a
wrong template — the SWEEP's config check finds it, enqueues and writes ⛔ nothing, and its ONE end-of-run alarm lists the claim (the
child's own check is a race guard); **when the ids are
later set, the next run sends it** (RB12); the same for a missing helpline number or an unconfigured gateway. The SIBLING registry's lockstep test (6.19's
stays unchanged — and `claim-correction-send.test.ts` passes UNEDITED, RB4) incl. the no-deadline deny-list (RB16), `i18n-parity`,
`microcopy` and an assertion that `$comment.suspicion_sms` carries the NOT-YET-HUMAN-REVIEWED marker in BOTH locales pass; the DLT
request sheet and the go-live roster gain their rows (counsel basis + privacy-policy purpose + the Panel's answer to `-295` §8 Confirm 2, for FQ7's
text, `-291` Q2's closure text AND `-293`'s refusal-appeal text — ONE NEW row, ⛔ not Row 18, which is the filer's agreement, ⛔ nor Row 19; and the Hindi review row);
the sheet says 7–12 are ⛔ provisioned before Row 22 closes (RB11).
**And (`-291` Q2 B)** given a claim R `closed` by S's allowed appeal, the sweep texts R's rank-1 effective nominee once (R's own live
determination when `effective`, else S's determination AS OF R's `claim.closed` event, else `no_target` + an alarm — RB15), in Hindi;
legs: R closed in `documents_pending` (⛔ determination of its own) ⇒ texted at S's as-of rank 1 (A); S re-determined after the reversal
so that its LIVE rank 1 is the post-death nominee ⇒ the text still goes to A, ⛔ the post-death nominee; a closed claim whose claimant is
the post-death nominee (F36's S1) ⇒ ⛔ text, a finished `no_target` row, ONE alarm (RB18 — judged under the lock, after RB15); the true nominee's own refiled claim, itself `-239`-refused and
closed ⇒ texted. Two claims of one death closed by the same reversal, with the same nominee, get two texts to one number — deliberate (once per
closed claim, `-291`'s reading) and tested.
**And (`-293` item 1 B)** given a standing `-239` refusal within its 90 days whose appeal is ⛔ not filed (RB13), the sweep texts the
REFUSED filer once, in the refused claim's `contact_locale`, with the last date to appeal (`DD-MM-YYYY`, RB6): a non-nominee claimant at
their contact mobile; a nominee-claimant at the mobile on the HEAD of the chain their linked version belongs to (RB7; the post-death one
in the Panel's scenario); ⛔ no contact record ⇒ `no_target`; a refusal whose 90 days passed before the sweep ⇒ ⛔ no text and ⛔ no row;
an appeal filed before the sweep ⇒ ⛔ no text and ⛔ no row; a revision away and back after an upheld appeal ⇒ ⛔ no text; a revision away
and back ⛔ never re-texts; the true nominee is ⛔ never this text's recipient unless she IS the refused filer (then she gets both texts —
a test).

### AC9b — Nothing else moves (Task 7.5)
⛔ No new permission key; ⛔ no change to the gate, convergence, the appeal or `closed` (6.24a's); ⛔ no `apps/public` change; ⛔ no
`apps/mobile` change (the hint is already `nomineeMobileMasked`; `otp.help`'s *"the nominee's phone"* stays true); ⛔ no contract SHAPE
change (`HandoverOtpResponse` unchanged — its doc comment only, Task 2.3); 6.19's registry, its texts and its lockstep test unchanged; the
sweep, its child, the send core, the sibling registry and `suspicion-notice.ts` write ⛔ no claim decision, event or state (Task 5.5).

### AC10b — The proof
Every test passes; each load-bearing one red-checked (Debug Log: the regression planted, the red, the revert); `pnpm ci:local` green with
`DATABASE_URL` at :5433 (34/34 incl. `integration-tests` — domain, API, jobs); migration 0151 applied to BOTH :5432 and :5433, its CHECKs
verified BY NAME on each ([[project_live_db_test_gotchas]]).

## Tasks / Subtasks

- [ ] **Task 0 — Governance (AC0b)** — ⛔ no code before 0.3 is committed.
  - [ ] 0.1 `git fetch origin`; confirm `main` still carries 6.24a and no new `.decision-log.md` entry after `-294` touches FQ6 / FQ7 / `-291`
    Q2 / `-293` item 1 / RF9 / RF11 / RF12; if `main` moved, re-derive the `file:NNN`s of the files this story edits.
  - [x] 0.2 Put RB1–RB11, RB15, RB16 and RB18 to BigDev (each with its recommended option), and RB12's MECHANISM (the policy is answered);
    RB13 and RB17 are answered (2026-10-08); RB14 is withdrawn (recorded, ⛔ committed as a rule).
  - [x] 0.3 Author-commit (✅ `2026-10-08-295`, `a6d55b1d`) (next free id, `2026-10-0X-295` or later): RB1–RB18 as answered; the v1.1 `-293` paragraph's mechanics (as
    amended by RB1 / RB6 / RB7 / RB13); the D33 carve-out sentence (RF11: *"recorded in the author-commit"* — the sibling registry names
    the member because the Panel's ratified texts do; 6.19's D33 is ⛔ not weakened) and the S4 / T6 carve-out for `appeal_notice`'s
    `{date}` (RB16); the RB17 confirm recorded as OWED to the next routing note. Each answer the user gave is quoted as given; anything
    added after an answer is put to BigDev before the insert. Stage in the scratchpad, try the insert
    ([[project_decision_log_writes_user_inserted]]); commit it ALONE (`governance(6.24b): …`).
  - [x] 0.4 The story's `RB` block gains each answer (the copied RF text is ⛔ never edited); per `-295` Consequence 1, RB11, RB13,
    RB18, AC7b and Task 6.3 gain Confirm 2 / Row 22's (c), and RB17's precedent cite is `-284` E5.
- [ ] **Task 1 — Migration 0151 + schema (AC7b, AC10b; RF11, RB2)**
  - [ ] 1.1 `packages/domain/migrations/0151_claim-suspicion-notices.sql`, HAND-AUTHORED (F29), plus its `meta/_journal.json` entry (idx
    151, the 0150 entry's shape `{ idx, version: '7', when, tag, breakpoints: true }`; ⚠ idx 140 is a pre-existing gap — leave it):
    table `claim_suspicion_notices` — `notice_id uuid PK DEFAULT gen_random_uuid()`, `pariwar_id uuid NOT NULL`, `claim_case_id uuid NOT
    NULL`, `purpose text NOT NULL`, `outcome text NOT NULL`, `recipient_version_id uuid NULL` (FK → `member_nominee_versions(version_id)`
    ON DELETE no action), `recipient_number_hash text NULL`, `provider_message_id text`, `detail text`, `first_detail text`,
    `attempt_count integer DEFAULT 1 NOT NULL` (`>= 1`), `claimed_at timestamptz`, `claimed_by_job text`, `created_at` / `updated_at`
    `timestamptz DEFAULT clock_timestamp() NOT NULL`; composite FK `(pariwar_id, claim_case_id)` → `claims(pariwar_id, claim_case_id)`
    ON DELETE cascade (0143 `:55`; target `claims_pariwar_claim_case_uq`, 0143 `:53`); CHECK `purpose IN ('suspicion_refusal',
    'closed_after_appeal', 'refusal_appeal_notice')`; CHECK `outcome IN (<0138's 8>)`; `attempting_claimed_check`; UNIQUE
    `(pariwar_id, claim_case_id, purpose)`; `CREATE INDEX … (claimed_at) WHERE outcome = 'attempting'`; `GRANT SELECT, INSERT` + column
    `GRANT UPDATE (outcome, provider_message_id, detail, first_detail, recipient_version_id, recipient_number_hash, attempt_count,
    claimed_at, claimed_by_job, updated_at)` to `twt_app` (⛔ no DELETE); ENABLE + FORCE RLS; three policies (select / insert / update) on
    `pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid` — copy 0138 `:49-72` line for line where they apply.
    Nothing names `'closed'` (an enum literal — and this is a text table anyway).
  - [ ] 1.2 `packages/domain/src/schema/claim_suspicion_notices.ts` (Drizzle; `SUSPICION_NOTICE_PURPOSES` and `SUSPICION_NOTICE_OUTCOMES`
    `as const` — the outcomes tuple may RE-EXPORT 6.19d's `CERTIFICATE_REMINDER_OUTCOMES`, `claim_certificate_reminder.ts:53`, ⛔ never a
    hand copy) + schema index export; `packages/domain/src/policies/claim-suspicion-notice-rls.ts` (the
    `claim-correction-reminder-rls.ts:13-34` template) + its `policies/index.ts` line.
  - [ ] 1.3 ⛔ Never run `pnpm db:generate` — it diffs against the `0020` snapshot and would emit ~130 migrations' drift (F29).
    Schema ↔ migration parity is proved by Task 1.4 (CHECKs by name, the `checkValues` exact-set lockstep). Apply to :5432 AND :5433;
    verify by name.
  - [ ] 1.4 `packages/domain/tests/integration/rls/claim-suspicion-notice-policy-regression.spec.ts` — the 0138 spec's
    (`claim-certificate-reminder-policy-regression.spec.ts`) shape: cross-tenant SELECT / INSERT refused, ⛔-scope fail-closed (`:175-180`
    form), FORCE RLS (`:182-190` form), denied columns 42501 + one positive UPDATE of every granted column (`:290-323` form), both
    CHECKs EXACT-SET vs the tuples (`checkValues`, `:148`, `:385-389`), the UNIQUE, the composite FK.
  - [ ] 1.5 `member/anonymize.ts` near `:186-191`: one comment line — `claim_suspicion_notices` holds ⛔ no plaintext (a keyed hash, ids)
    ⇒ nothing to scrub (RF11; F28).
- [ ] **Task 2 — API: the filing code (AC6b; RF9, RB8, RB9)**
  - [ ] 2.1 Domain `readSuspicionRefusalRecipient(db, pariwarId, deceasedMemberId)` in `suspicion-refusal.ts`: `readStandingSuspicionRefusals`
    → `[]` ⇒ `null`; else `getEffectiveNomineeDeclaration(db, pariwarId, rows[0].claimCaseId)` → `status === 'effective'` and
    `entries.find(e => e.rank === 1)` ⇒ `{ kind: 'at_death', versionId }`, else `{ kind: 'none' }`. ⛔ No ciphertext. Unit + integration
    tests (`packages/domain/tests/integration/claim/` — `_suspicion-refusal-fixtures.ts` `refusedClaim(…, { ground: true })` seeds the
    two versions + a stands/discarded determination; its placeholder mobiles cannot decrypt — fine for domain specs); NW1 stays green
    (`approval-warnings.test.ts:355-365` already lists the module). ⭐ Add the missing ref-only assertion to
    `nominee-name-no-comparison-fence.test.ts` (RB8): `suspicion-refusal.ts`'s source (comments stripped) contains ⛔ none of
    `mobileCiphertext`, `nameCiphertext`, `decrypt`, `getMemberNominees`, `getNomineeVersionsByIds`; red-check it.
  - [ ] 2.2 `sendHandoverOtp` (`claims.service.ts:97-143`): call it first; `null` ⇒ today's body, behaviour-identical, `recipient:
    'latest'`; `none` ⇒ `noOp('at_death')`; `at_death` ⇒ `nominee.getNomineeVersionsByIds(scopeTx.tx, pariwarId, [versionId])` (empty ⇒
    THROW, RB9) → `claim.resolveCorrectionMobile(row.mobileCiphertext, 'member_nominee', pariwarId, deps.encryption)` (`AppDeps.encryption`
    is structurally `FieldCryptoDeps`; the same `normalizeMobile` as the latest path) → `null` ⇒ `noOp('at_death')`; else mask +
    `requestOtp` + `deliver` exactly as today. `HandoverOtpSendOutcome` gains `recipient: 'latest' | 'at_death'` (internal); the
    handler's `emitAuthAudit` context gains `recipient` (`claims.handlers.ts:72-83`). ⛔ Never `getMemberNominees` on the `none` /
    `at_death` paths. RB9's `noOp(recipient)` serves every no-op, the latest path's two included.
  - [ ] 2.3 Stale text corrected where it lives (the RF16 rule) — name both recipients: `apps/api/src/audit/audit-sink.ts:210-221` (*"sent
    to the nominee's declared mobile"*); `packages/contracts/src/claims/filing.ts:71-75` (*"Story 3.4 `member_nominees`"* → the RF9 rule);
    `claims.service.ts:4-5` (*"sent to the NOMINEE's declared mobile"*), `:19-22`, the outcome comments `:73-77`, and `:83-88` (*"…the
    deceased's PRIMARY nominee's declared mobile … Reads the nominee row"* — also move it above `sendHandoverOtp`, it sits orphaned
    above `timingEqualizeDelay`'s own docstring); `claims.handlers.ts:4` and `:59-60`. Leave `apps/mobile/lib/use-handover-otp.ts:7-8`
    (still true). Contract SHAPE ⛔ unchanged.
  - [ ] 2.4 Trace F16's four flows (intake, upload incl. certificate replacement, nominee bank, reconciliation) and record per flow in
    the Debug Log whether a family of a claim with a standing refusal can reach it — ⛔ no code change (P4′). Record too what is ⛔ NOT
    behind the code (`claims.routes.ts`, by path): `…/:claimCaseId/contact`, `…/dpdpa-consent` and `…/dpdpa-consent/revoke` —
    session only; `…/:claimCaseId/nominee-corrections` — the `nominee_change` step-up, whose code goes to the SESSION member's registered mobile (the phone
    holder, F14). And the two leftover windows: a code sent to the latest nominee before the refusal stays verifiable for
    `stepUpOtpTtlMs` (verify keys only on `handover:<id>`), and a `claim_handover` elevation lasts `STEP_UP_ELEVATED_MS` (`config.ts:384`).
  - [ ] 2.5 Specs, `apps/api/tests/integration/claims/handover-otp-suspicion.spec.ts`: AC6b's legs — at-death (hint …1111,
    `resolvedMobile` via `CapturingStepUpDelivery.last` / `.deliveries`, `_setup.ts:162-172`; audit `recipient` on `CapturingAuditSink`
    filtered by `context.deceased_member_id` — the `auditsFor` filter form, `nominee-declaration.spec.ts:194-195`; A's 10-digit and E.164 forms
    absent from `JSON.stringify` of those events), latest before / after an allowed appeal / after a revision off `-239` / for a
    `closed` S1, not-effective, sentinel / unsendable mobile (`toStrictEqual` + zero deliveries), two nominees, two refusals (the claims
    created in the opposite order to their refusals), malformed envelope → 500. Fixtures: `nominee-declaration.spec.ts`'s `world()`
    (`:122-188`), `determineHonestly` (`:237-251`) and the `-239` refusal (`claim.adjudicateClaim(… reasonCode:
    'post_death_nominee_change' …)`, `:694-705`) are CLOSURES inside its `describe` (⛔ importable) and need its admin passkey harness ⇒
    COPY the pattern into the new spec, or (simpler) seed the determination with the domain writer `claim.recordNomineeDetermination`
    (the real-writer form at `apps/api/tests/integration/_nominee-name-check-fixture.ts:518`). Either way: REAL envelopes, a DISTINCT mobile per version
    (`world()` writes ONE mobile for every version, `:147`); ⛔ `suspicion-refusal-routes.spec.ts`'s `'enc:v1:m'` placeholder (`:173`)
    cannot decrypt. Also ONE spec asserting today's `member_claim.handover_otp_send` line (F17 — none exists).
- [ ] **Task 3 — The send core and the sibling registry (AC7b; RF11, RB1, RB4, RB6, RB16)**
  - [ ] 3.1 Extract `sendClaimDltSms` (RB4) into `apps/jobs/src/scheduler/claim-dlt-sms-send.ts`; `sendClaimCorrectionSms` becomes the
    wrapper; `CORRECTION_SEND_TIMEOUT_MS` and `ClaimCorrectionSmsResult` move and are re-exported from `claim-correction-reminders.ts`;
    `withTimeout` and `SendTimeoutError` move and stay private; ⛔ no value import back into `claim-correction-reminders.ts`. Run, with ⛔ no
    test line edited: `claim-correction-send.test.ts`, `claim-correction-control-paths.test.ts`, `claim-certificate-reminders.test.ts`,
    and the 6.19b / 6.19c / 6.19d live tests — any test line edited = the extraction is wrong.
  - [ ] 3.2 `apps/jobs/src/scheduler/suspicion-notice-sms-templates.ts` (the name RF11 gives, `suspicion-refusal-sms-templates.ts`, is also
    fine — ⚠ avoid a `SuspicionRefusalNotice` export: that identifier is 6.24a's console component, `SignalsPanel.tsx:38`): header carries
    the D33 and S4 / T6 carve-out sentences; `SuspicionNoticeSmsMessage = 'refusal_notice' | 'closed_notice' | 'appeal_notice'`; locale
    `'hi' | 'en'`; per entry `{ copyKey, dltTemplateIdConfigKey, registeredText }` with `{#var#}` slots; variables `{ member, helpline }`
    and, for `appeal_notice`, `{ member, date, helpline }`; `renderSuspicionNoticeSms(message, locale, vars)` through the REAL `t()`
    (`t(key, params, { locale, namespace: 'claim' })`); `formatAppealUntil(d: CalendarDateString): string` → `DD-MM-YYYY` (RB6, a pure
    string reorder, unit-tested incl. a year boundary).
  - [ ] 3.3 `apps/jobs/tests/suspicion-notice-sms-templates.test.ts` (the 6.19 test's shape, ⛔ its D33 name assertion): the real `t()` with
    distinct markers renders EXACTLY `registeredText`; each variable once, in the order of the Panel's words; the slot count (2 or 3); the
    DLT sheet contains each text and each key; the key equals `sms.dlt.template_id.suspicion_notice.${message}.${locale}`; ⛔ no unfilled
    `{x}`; the en texts pinned byte-for-byte to the Panel's words (+ `{helpline}`); RB16's no-deadline deny-list on every body (its own
    copy of `assertNoDeadlineThreat` + the full `HINDI_DEADLINE_TERMS`; `appeal_notice` rendered with a non-digit `{date}` marker); and
    `$comment.suspicion_sms` contains `NOT YET HUMAN-REVIEWED` in BOTH `en` and `hi` `claim.json` (F27 — ⛔ no other gate reads it).
- [ ] **Task 4 — The domain half of the sweep (AC7b; RB2, RB3, RB5, RB7, RB8, RB10, RB13, RB15, RB18)** — new `packages/domain/src/claim/suspicion-notice.ts`
  (exported from `claim/index.ts`):
  - [ ] 4.1 Cross-tenant selectors on the BYPASSRLS pool, keyset-paged, raw SQL with explicit aliases (⛔ a Drizzle correlated subquery —
    [[project_epic6_drizzle_correlated_subquery_bug]]), `LIMIT ${clampLimit(…)}` (RB10 — the gate is blind to raw SQL ⇒ a spec asserts
    the page cap): `selectDueSuspicionNotices(db, { purpose, after, limit, allow })` per RB10; *"finished"* = `outcome <> 'attempting'`;
    (b) joins `events_log` on `stream_id` (RB10) — RB18 is judged ONLY under the lock (Task 4.2), ⛔ here; (c) projects the chain start + `clock_timestamp()` and
    is filtered in TS. Row shape: `{ pariwarId, claimCaseId, hasAttemptingRow }` (+ `chainStartedAt`, `clock` for (c)); every TS
    filter — RB10's 90 days, RB12's hold — runs AFTER the page, so the keyset cursor and the last-page test see the UNFILTERED page.
  - [ ] 4.2 `beginSuspicionNotice(client, { pariwarId, claimCaseId, purpose, jobId, now })`: `SET LOCAL lock_timeout`; the claim row
    `FOR UPDATE` — ONE statement, inline (the `suspicion-refusal-persist.ts:179-183` form; `lockClaimCase`, `read.ts:95-106`, is
    equally acceptable since this module is ⛔ not an NW1 entry); RE-CHECK the purpose's predicate (a: `isSuspicionRefusalStanding`;
    b: still `closed` + the trigger; c: this claim's row of `readStandingSuspicionRefusals` has `appeal === 'not_filed'` — RB13);
    resolve the recipient (`{ versionId | null, mobileCiphertext | null, source: 'member_nominee' | 'claim_contact', locale,
    deceasedMemberId, appealUntil | null }` — for purpose b, RB15 chooses the source, then RB18 is judged BEFORE any mobile is read; if
    either ends the slot, the domain writes the FINISHED `no_target` row here (`no_target:closed_no_determination` /
    `excluded:claimant_discarded_version`) and returns `{ kind: 'no_target', reason }` — ⛔ a re-check failure (RB10). That write goes through the claim's OWN INSERT … ON
    CONFLICT path: insert as `no_target`; on conflict a FINISHED row ⇒ `already_final` (⛔ second alarm), an `attempting` row (own, or
    another job's past the lease) ⇒ compare-and-set to `no_target`, `attempt_count` / `first_detail` kept, another job's row within
    the lease ⇒ `held_by_other`; purpose c's `appealUntil` from the SAME `readStandingSuspicionRefusals` row that decided
    `not_filed`, for `{date}`); claim the row (`claimCorrectionReminder`'s INSERT … ON CONFLICT + lease-takeover rule,
    `correction-reminder-record.ts:134-185`, for this table). Returns `{ kind: 'begun', … } | 'already_final' | 'held_by_other' |
    'not_due' | { kind: 'skipped', expiredAttempt } | { kind: 'no_target', reason: 'closed_no_determination' | 'excluded_claimant' }` (`not_due` = a FRESH claim whose locked re-check failed — ⛔ row written). A failed re-check follows RB10's ONE rule (a FRESH claim writes ⛔ no row; an
    existing `attempting` row — own, or another job's past the lease, taken over first — ⇒ `skipped_superseded` when `detail IS NULL`,
    else `error` / `exhausted:recheck_<reason>` with `expiredAttempt: true`; another job's row within the lease ⇒ `held_by_other`).
  - [ ] 4.3 Recipients: purposes a / b — RF9's rule via `getEffectiveNomineeDeclaration` + `getNomineeVersionsByIds` (b: the CLOSED claim's
    OWN live determination when `effective`, else the reversed claim S's determination AS OF R's `claim.closed` event — S =
    `held_by_claim_case_id`; the rank-1 rule shared with `getEffectiveNomineeDeclaration`, ⛔ copied — else `no_target` + an alarm (the row written by 4.2),
    RB15; RB18 judged after RB15's source is chosen, before any mobile is read; the mobile at the chain head, root first, for BOTH
    sources — RB15 / RB7); locale `'hi'`. Purpose c — `readRefusedFilerRecipient`:
    `readClaimContact` (`claim-contact-check.ts:49-64`) → ⛔ row ⇒ none; `contact.claimantNomineeVersionId === null` ⇒
    `contact.claimantMobileCiphertext`, source `claim_contact`; else the chain HEAD's `mobileCiphertext` (RB7: root = last of
    `correctionChainOf`, head = `chainHeadOf(root, versions)`), source `member_nominee`; locale = `contact.contactLocale`.
  - [ ] 4.4 `finaliseSuspicionNotice` (CAS on `outcome = 'attempting' AND claimed_by_job = $job`), `noteSuspicionNoticeTransient`,
    `expireExhaustedSuspicionNotices(db, { cutoff, allow })` (RB3; cross-tenant, the
    "DELIBERATE" justification block of `claim-correction-reminders.ts:778-788` copied in spirit) — `correction-reminder-record.ts:187-321`'s
    shapes for this table.
  - [ ] 4.5 Add the module to `FENCED_FILES` (38 → 39, the reason in the pin's comment); ⛔ not to NW1's entry list.
  - [ ] 4.6 Domain integration specs (`packages/domain/tests/integration/claim/suspicion-notice.spec.ts`): each selector incl. `allow`
    (a reversed S, a `closed` R, an appeal filed, a refusal ≥ 1 day either side of its 90-day limit — the ±1 ms boundary is 6.24a's
    `hasSuspicionRefusalAppealLimitPassed` test, ⛔ re-run here: the statement clock cannot be injected); the locked re-check (revise
    away between selection and lock — two connections, COMMITTED txns [[project_db_clock_ordering_tests_tie]]); RB10's re-check rule
    (NULL and set `detail`; another job's row past and within the lease); a row whose predicate turned false is still selected and
    finished; RB15's as-of read (the half-open boundary at `occurred_at`; S redetermined AFTER the closure ⇒ still the as-of rank 1;
    a corrected rank-1 entry ⇒ its chain head; ⛔ effective ⇒ a finished `no_target:closed_no_determination` row + `{ kind: 'no_target' }`); RB18's exclusion under the lock, after RB15
    (a post-death-nominee claimant ⇒ a finished `no_target` row; a non-nominee claimant texted — residual i; a second run silent); a duplicate child after a committed `no_target` ⇒ `already_final`, ⛔ second alarm; RB15 and RB18 both
    applying ⇒ ONE row, detail `no_target:closed_no_determination` (RB18 ⛔ evaluated); the lease takeover ± 1 ms (`packages/domain/tests/integration/claim/correction-chase.spec.ts:1046-1056` form); once-ever under UNIQUE; both claimant sides + a corrected chain head + a FORKED chain (root's head ≠ the linked
    version's head); ⛔ contact ⇒ none; the page cap.
- [ ] **Task 5 — The jobs sweep (AC7b, AC9b; RF11, RB3, RB5, RB12, RB15, RB18)** — `apps/jobs/src/scheduler/claim-suspicion-notices.ts`:
  - [ ] 5.1 Queues in `packages/queue/src/index.ts` (beside `:365-405`): `CLAIM_SUSPICION_NOTICE_SWEEP: 'claim.suspicion.notice.sweep'`,
    `CLAIM_SUSPICION_NOTICE_SMS: 'claim.suspicion.notice.sms'`; register in `apps/jobs/src/boot.ts` after 6.19d (`:612`) with the shared
    `claimCorrectionDeps` (`:591-601`; deps type `Omit<ClaimCorrectionReminderDeps, 'push'>`, 6.19d's form); cron `'0 10 * * *'`
    `CLAIM_CORRECTION_TZ`; the bound and budget IMPORTED as 6.19d does (`claim-certificate-reminders.ts:36-52`, `:713-734`):
    `DEFAULT_CORRECTION_SWEEP_MAX_RUNS`, `DEFAULT_CORRECTION_SWEEP_BUDGET_MS`, `CORRECTION_SWEEP_EXPIRE_SECONDS` (set on BOTH
    `createQueue` and `schedule`), `CORRECTION_SWEEP_RETRY` — the expiry > budget rule (stated `claim-correction-reminders.ts:98-104`, applied `:1424-1477`).
  - [ ] 5.2 The sweep: (1) `expireExhaustedSuspicionNotices` + an alarm listing claim ids; (2) RB12's config check —
    `isConfigured()` and each needed template key once per run (`appeal_notice`: both locales); the helpline LAZILY, memoised per
    Pariwar, as (3)'s pages reveal Pariwars; any gap or ANY Secret Manager fault ⇒ that purpose / Pariwar's claims are ⛔ enqueued and
    are collected (a post-page filter); (3) per purpose, page the selector and enqueue one child per (claim, purpose) — payload ids only; a summary
    `console.info` (`:1017` form). ⛔ `dispatch()`. The Pariwar allowlist exactly as 6.19b's (`:765-774`): an EMPTY allowlist is refused,
    and an allowlist in production is refused; `allow` passed to every selector and the finaliser; (4) ONE end-of-run alarm for the
    claims held by (2) — per purpose, the count and the claim ids (RB12).
  - [ ] 5.3 The child: RB12's race-guard check first (the same three — a gap or a Secret Manager fault ⇒ return `held_config`, ⛔ no
    row, ⛔ decrypt, an alarm with ids only) → read
    the presentation mode ONCE in its OWN `withPariwarScope` (RB5) → `withPariwarScope` → `beginSuspicionNotice`
    → COMMIT (⛔ a caught DB error inside it); `skipped` + `expiredAttempt` ⇒ alarm (ids only, the `claim-correction-reminders.ts:433-445`
    form); `{ kind: 'no_target', reason }` ⇒ ONE alarm (ids + reason) and return — ⛔ decrypt, ⛔ hash, ⛔ finalise (RB15 / RB18);
    then (⛔ no KMS under the row lock) `decryptKycField` the deceased's name → RB5 → `resolveCorrectionMobile(cipher, source,
    pariwarId, enc)` (`null` ⇒ `no_target`; throw ⇒ transient `decrypt_failed:tier1`) → `correctionNumberHash` (throw ⇒ transient
    `hash_failed:tier1`) → `sendClaimDltSms` with the sibling's key and render (`appeal_notice`: `{ date:
    formatAppealUntil(begun.appealUntil) }`) → `finaliseSuspicionNotice` (a `config:*` or provider-side config result here is final `error` +
    alarm — RB12's recorded edges i / ii) (hash + version + outcome); `alarm: true` ⇒ `onAlarm`; `!moved` ⇒
    alarm. Transient ⇒ note + throw `ClaimCorrectionTransientError` (reuse it). Detail names: 6.19b's `no_target:no_sendable_number`
    (`claim-correction-reminders.ts:486`) — ⛔ never `mobile_unreachable` / `mobileUnreachable` (forbidden by `delivery-terminology-gate.test.ts:45-71`).
  - [ ] 5.4 Specs: `apps/jobs/tests/claim-suspicion-notices-live.test.ts` (6.19d's harness form — `pariwarAllowlist: [PARIWAR]`
    (`claim-certificate-reminders-live.test.ts:241`), a `resolveConfig` map answering the `sms.dlt.template_id.suspicion_notice.` prefix
    (6.19d's answers only `…claim_correction.`, `:235`), `gateway`, `onAlarm`, `setNow`; seed with real envelopes as
    `_claim-correction-seed.ts` does) — AC7b's legs for ALL THREE purposes: one row + one text; second run silent; revised away ⇒
    nothing; away-and-back ⇒ nothing; appeal filed ⇒ nothing (c); `no_target` (non-effective, erased mobile, erased NAME, ⛔ contact);
    R closed before its own determination ⇒ texted at S's as-of rank 1; S re-determined to the post-death nominee afterwards ⇒ still A
    (RB15); RB18 — a closed claim filed by the post-death nominee ⇒ a `no_target` row + ONE alarm, ⛔ text, silent on the second run; the
    true nominee's own `-239`-refused claim closed ⇒ texted (A seeded as a NON-nominee claimant, or linked to her pre-death version via
    the admin surface once R is effective — ⛔ the member app's rank-1 link, residual iii); both name modes; Hindi default for a/b and `contact_locale` en for c; the
    true nominee as refused filer gets BOTH texts; two closures of one death ⇒ two texts (deliberate); template id `null` ⇒ the sweep
    enqueues ⛔ child, writes ⛔ row, ONE end-of-run alarm naming the claim, then id set ⇒ sent next run (RB12); `appeal_notice` with ONE
    locale's id unset ⇒ held (both are checked); helpline missing, gateway unconfigured and a transient Secret Manager fault (same);
    config vanishing between the sweep's check and the child's ⇒ `held_config`, ⛔ row, an alarm; config vanishing between the child's
    check and the send ⇒ `error` + alarm (the recorded edge); R undetermined and S's as-of ⛔ effective ⇒ `no_target` + alarm (RB15); `INVALID_NUMBER` / `CARRIER_REJECT` / 503 classification; crash-after-claim reclaimed next day, given up after
    three IST days (RB3); ⛔ plaintext: `JSON.stringify({ enqueued, alarms, rows })` contains ⛔ neither mobile nor the deceased's name
    (the `claim-correction-reminders-live.test.ts:606-620` form).
  - [ ] 5.5 `apps/jobs/tests/claim-suspicion-notice-no-decision.test.ts` — 6.19d's `claim-certificate-reminder-no-decision.test.ts` form
    (comments stripped; a source scan, since a runtime spy cannot see module-internal calls): `claim-suspicion-notices.ts`,
    `claim-dlt-sms-send.ts`, `suspicion-notice-sms-templates.ts` and `packages/domain/src/claim/suspicion-notice.ts` reference ⛔ none of
    its FORBIDDEN list (`adjudicateClaim`, `appendEvent`, `projectClaimState`, …) plus 6.24a's writers (`closeClaimsHeldBySuspicionAppeal`,
    …); a positive control that `beginSuspicionNotice` IS referenced (invariant 7, AC9b). Red-check it.
- [ ] **Task 6 — i18n and the go-live records (AC7b; 6.4 → AC6b; RB1, RB11, RB16)**
  - [ ] 6.1 `packages/i18n/locales/{en,hi}/claim.json`: the three `suspicion_sms.*` keys + `$comment.suspicion_sms` in BOTH files. en =
    the Panel's words + `{helpline}`: *"A claim for {member} could not go ahead. Please call the helpline {helpline}."* · *"Your claim for
    {member} has been closed. Please call the helpline {helpline}."* · *"The claim for {member} could not go ahead. It can be appealed until
    {date}. Please call the helpline {helpline}."* Hindi agent-authored, marked, ⛔ a deadline word (RB16 — ⚠ `दिनांक` contains `दिन` and
    `अंतिम तिथि` contains `अंतिम`: both fail; *"{date} तक अपील की जा सकती है"* passes). `classification.json` needs
    ⛔ nothing (namespace default member-facing). `i18n-parity`, `microcopy` (it scans `claim.json`, `microcopy.yaml:386-387`, line by line
    — `$comment` text included, `scripts/microcopy/lib.ts:307`: ⚠ avoid the always-on terms, e.g. `report`, `by mistake`, in the
    comment) green.
  - [ ] 6.2 `docs/launch-gate-inventory/dlt-template-requests-6-19.md` (RB11): owed rows 7–12 (3 messages × hi/en, the sibling's keys,
    slots), a `## The wording of templates 7–12 (Story 6.24b — the text to register)` section stating the D33 / S4 carve-outs, a cost
    line, a Record row (still not submitted); *"What it gates"* names Rows 22 / 23 for 7–12; *"## The six templates owed"* renamed; the
    7–12 section and its Record row: *"⛔ do not provision the ids of 7–12 until Row 22 closes"* and *"set each id only after the
    operator confirms that template's approval"* (RB12 edge ii).
  - [ ] 6.3 `docs/launch-gate-inventory/inventory-roster.md`: **Row 22** `suspicion-notice-counsel-basis` (counsel's basis for texting
    the nominee in place at the death, the true nominee on closure, and the refused person — `-262` *"does NOT cover"*, `-291` Consequence
    3, `-293` Consequence 2; closure needs (a) counsel's basis, (b) a privacy-policy revision naming these purposes AND (c) the Panel's
    answer to `-295` §8 Confirm 2 (RB13 + RB18); its blockquote
    carries Row 18's *"every deploy before counsel clears is a dev / staging deploy, where the DLT template ids stay unset"*; owner
    Trustee Panel / counsel Story 0.13; the row itself is ⛔ not a Panel routing note — Confirm 2 travels in the NEXT routing note, `-295`
    Consequence 2) and **Row 23** `suspicion-notice-hindi-human-review` (Row 21's form —
    `-262`, `-291`, `-293` each exclude the Hindi; closure replaces the marker in the same commit + re-registers any corrected Hindi
    template). The appended-row heading + blockquote + bullet order exactly as Rows 18–21.
  - [ ] 6.4 `friction-budget.md`: one voluntary `forced` row (6.19b's precedent — its row in that file) — *"the family of a member whose
    claim was refused on suspicion of a post-death nominee change (the app's filing code now goes only to the nominee in place at the
    death; the person who made the change files through the helpline)"* — payer/subsystem per FQ6 B. The gate is path-dormant
    (`MEMBER_FACING_PREFIXES`, `scripts/friction-budget/lib.ts:453`); if its committed-diff check refuses a voluntary row, drop it and
    record why ([[project_friction_budget_baseline_ratchet]]).
- [ ] **Task 7 — Records and proof (AC9b, AC10b)**
  - [ ] 7.1 Red-checks in the Debug Log, at least: RF9 → `getMemberNominees` on the at-death path; the selector's *"finished"* → *"no row"*;
    the locked re-check removed; RB13's `not_filed` removed; RB10's `detail` branch removed; RB12's sweep check removed (⇒ the "enqueues ⛔ child" leg red); the child's race guard removed (⇒ its leg red; both removed ⇒ a row burnt); RB15's as-of read swapped for S's LIVE determination (⇒ the "still A" leg red); RB15's alarm removed; RB18's exclusion removed (⇒ its leg red); RB5's
    sentinel check removed; RB6's reorder swapped; the ref-only assertion (Task 2.1); the no-decision fence (Task 5.5); the UNIQUE dropped
    (in a throwaway DB).
  - [ ] 7.2 `pnpm ci:local` with `DATABASE_URL=…:5433` → 34/34 ([[project_ci_local_double_run_pollution]]); typecheck, lint; `pnpm
    domain-invariants:check` (every AST `.limit()` clamped — raw SQL is Task 4.1's spec).
  - [ ] 7.3 `deferred-work.md`: F22's 8.8 gap (an erased deceased's name would render `[anonymized]` in a contribution text — by reading,
    ⛔ not verified) as a new item.
  - [ ] 7.4 `sprint-status.yaml` via the SAFE prepend ([[project_sprint_status_safe_prepend]]); commit on the story branch.
  - [ ] 7.5 AC9b proved: `git diff --exit-code origin/main -- apps/mobile apps/public apps/jobs/src/scheduler/claim-correction-sms-templates.ts
    apps/jobs/tests/claim-correction-sms-templates.test.ts apps/jobs/tests/claim-correction-send.test.ts` is empty; the permission
    pins (`permissions.test.ts`) unchanged; `HandoverOtpResponse`'s schema unchanged.

## Dev Notes

### Traps (moved from 6.24 — numbers kept; 15–29 added at the re-pin)
10. **The latest-nominee fallback** — after a standing refusal ⛔ never `getMemberNominees`; `none` ⇒ the no-op (invariant 5).
11. **Reusing `readCorrectionRecipients` for FQ7 or Q3** — it requires S's filing agreement (the filer may be the person who made the
    change) and returns S's effective nominees plus a non-nominee claimant — ⛔ never the right set for either (F10 / RF11 / RF14).
    *(Re-pin: `correction-chase.ts:601-653`; for a nominee-side claimant it sets `claimantUnresolved` and returns ⛔ no number at all.)*
12. **Decrypting in the wrong layer / leaking the number** — the API decrypts with `decryptNomineeField`; jobs with the domain helper; the
    domain read modules never decrypt or import `claim/events.ts`. ⛔ No number, name or code in a log, audit, payload or job data.
    *(Re-pin: RF9 offers either; RB-default is the domain's `resolveCorrectionMobile` for BOTH apps — one null / sentinel / normalise rule.)*
13. **Texting on the decision event** — a revised decision would text wrongly or twice. The sweep re-checks RF1 under the claim lock; the
    UNIQUE makes it once ever.
14. **The `[member]` placeholder** — the Pariwar's MODE-RESOLVED form (`-181`, `resolveMemberFacingDeceasedName`), ⛔ never a hard-coded
    form; ⛔ never stretch the 6.19 registry (its D33 *"⛔ No name"* pin stays) — a sibling registry.
15. **A copy of the send** — the classification and fail-closed body exist ONCE (RB4). A second copy drifts the day a provider error class
    is added.
16. **6.19b's end-of-day finaliser verbatim** — strands a once-ever notice as `error` after one crash (F20; RB3).
17. **`current_state = 'closed'` as the trigger** — true today by coincidence (F25); select by the event's `trigger`.
18. **A SQL re-derivation of the 90 days** — `hasSuspicionRefusalAppealLimitPassed` is the one rule (F24).
19. **KMS under the row lock** — decrypt / hash only AFTER the claiming commit (RF11's order; 6.19b's child). A KMS stall under a
    claim-row lock stalls every writer of that claim.
20. **`'[anonymized]'` in a text** — RB5's explicit check; `resolveMemberFacingDeceasedName` will happily shorten it (F22).
21. **Writing a row for "90 days passed"** — blocks the first text of a later chain (RB10). ⛔ No row.
22. **`pnpm db:generate`** — diffs against the `0020` snapshot; ~130 migrations of drift (F29). Hand-author 0151 and its journal entry.
23. **`skipped_superseded` on a row that already tried to send** — erases the evidence of a possible text (F30). K4: `detail` set ⇒
    `error` + alarm.
24. **A cross-tenant statement without `allow`** — the live suite then texts other suites' claims (F31).
25. **Catching a DB error inside the claiming transaction** — the COMMIT silently rolls the claim back; the child sends on a row it
    does not hold (RB5).
26. **"Stands" as "may appeal"** — RF1 stands while an appeal is `open` or `upheld_final` (F32); the appeal text needs `not_filed` (RB13).
27. **A config fault as a row** — a finished one burns the only slot before go-live (F33); a parked one strands once its predicate turns
    false and lets a config note mask a possible send. RB12: the sweep checks config first and writes ⛔ no row.
29. **Revising a refusal off `-239` in a test while another claim of the death is open** — 6.24a's reason lock (`-293` item 2 A,
    `verifier-decision-persist.ts:637-657`) refuses it. *"Revised away"* / *"away and back"* legs need a single-claim death (or the
    others closed).
28. **`mobile_unreachable` / `mobileUnreachable`** — forbidden names (`delivery-terminology-gate.test.ts`); use `no_target:no_sendable_number`.

### Locks (re-pin — `-294` §1)
Writers that touch a death's claims take, in order: the intake key → `suspicion-reversal:` → a claim's `appeal:` / `r9:` / trustee keys →
that claim's ROW (`suspicion-refusal-persist.ts:28-32, 104-108, 175-178`). The sweep takes ONLY a claim row (`FOR UPDATE`, `SET LOCAL
lock_timeout`), ⛔ no advisory key, and ⛔ never a second claim's row while holding one ⇒ it can only WAIT behind a writer, ⛔ never form a
cycle. ⛔ Never `acquireIntakeLock` / `intakeAdvisoryLockKey` here. RF9's read takes ⛔ no lock (a read in the request's scope tx; a race
with a reversal resolves to either recipient — both correct at their instant).

### The existing code each change touches — current state, the change, what must be preserved
- **`sendHandoverOtp`** (`claims.service.ts:97-143`): `getMemberNominees` → `[0]` → `decryptNomineeField` → `normalizeMobile` → mask →
  `requestOtp` (writes through `deps.pool`, ⛔ the scope tx — `member-otp.service.ts:28-54`) → `stepUpDelivery.deliver({ intent: 'login',
  resolvedMobile, destinationHint })`. Two no-op branches (⛔ nominee, unsendable) pad with `timingEqualizeDelay` (`:93-95`, private, 150–300 ms);
  the real send has ⛔ no pad. PRESERVE: the latest path's behaviour when no refusal stands (same body, delivery and pad — its two no-ops
  now go through `noOp('latest')`, RB9); the throttle (`memberClaimHandoverSendThrottle`,
  key `claim-handover:${memberId}`); the pool key; the response shape `{ sent: true, nomineeMobileMasked }`.
- **`sendClaimCorrectionSms`** (`claim-correction-reminders.ts:246-313`): config faults via `classifySecretManagerFault`
  (`contribution-providers.ts:170-179`); unset template id / helpline / gateway ⇒ `error` + alarm; provider classes `invalid_number` →
  `rejected_invalid_number`, `carrier_reject` (and DND) → `rejected_unreachable`, `rate_limited` / `api_unavailable` / timeout →
  transient, else `error` + alarm. PRESERVE every one (RB4's proof). The render runs OUTSIDE the `try` (`:282` vs `:286`) — keep it there.
  The shared core is unchanged; RB12's config check lives in the 6.24b sweep (and child, as a race guard), ⛔ in the core.
- **6.19's registry** (`claim-correction-sms-templates.ts`): untouched — ⛔ no fourth message there.
- **`claim.json`**: append only; ⛔ an existing key re-worded (each must byte-match a registered DLT text).

### Config and environment
DLT template ids and the helpline number are Secret Manager names with an env fallback (`resolveSmsDltConfig`,
`contribution-providers.ts:108-119`; `NOT_FOUND` ⇒ `null` ⇒ fail closed). ⛔ No config table. Tests inject a `resolveConfig` map
(`claim-correction-send.test.ts:36-41`). ⛔ Nothing is provisioned by this story — the ids stay unset until go-live (Row 22).

### Testing standards
- Live-DB: `DATABASE_URL` at :5433; suite-level `{ timeout: 20000 }` ([[project_known_livedb_test_failures]]); order tests need separate
  COMMITTED transactions ([[project_db_clock_ordering_tests_tie]]); assert membership, ⛔ global counts; ⛔ never regenerate an applied
  migration, ⛔ never DROP SCHEMA ([[project_live_db_test_gotchas]]); an FK to `member_nominee_versions` joins its TRUNCATE CASCADE set —
  mind the lock order in cleanup ([[project_fk_truncate_cascade_deadlock]]).
- Contracts tests are outside tsc — run vitest if any contract file changes ([[project_contracts_tests_outside_tsc]]).
- Prettier is ⛔ not enforced — hand-format, ⛔ `prettier --write` ([[project_prettier_not_enforced]]). After any JSDoc edit grep `\*\*/`
  ([[project_markdown_emphasis_closes_jsdoc]]).
- Stubs CALL, ⛔ transcribe: the template test renders through the real `t()` ([[feedback_stub_must_call_not_transcribe]]).

### Project Structure Notes
- New: `packages/domain/migrations/0151_claim-suspicion-notices.sql` (+ its journal entry), `src/schema/claim_suspicion_notices.ts`,
  `src/policies/claim-suspicion-notice-rls.ts`, `src/claim/suspicion-notice.ts`; `apps/jobs/src/scheduler/{claim-dlt-sms-send.ts,
  suspicion-notice-sms-templates.ts, claim-suspicion-notices.ts}`; tests as named in the Tasks (incl. Task 5.5's fence).
- Modified: `suspicion-refusal.ts` (+1 export), `nominee-effective.ts` (RB15's as-of selector on `readRaw`), `claim/index.ts` (+1 `export *`), `claims.service.ts`, `claims.handlers.ts`, `audit-sink.ts` (comment),
  `contracts/src/claims/filing.ts` (comment), `claim-correction-reminders.ts` (the wrapper), `packages/queue/src/index.ts`,
  `apps/jobs/src/boot.ts`, `claim.json` × 2, `nominee-name-no-comparison-fence.test.ts` (pin + the ref-only assertion), `anonymize.ts` (comment), the two
  launch-gate docs, `friction-budget.md`, `deferred-work.md`, `sprint-status.yaml`, the schema/policy index files, the migration journal.
- ⛔ No new package ([[feedback_no_premature_package]]): the send core stays in `apps/jobs`.

### References
- `.decision-log.md`: `-262` FQ6, FQ7, readings, *"does NOT cover"* · `2026-10-07-291` Q2 B · `2026-10-07-292` (RF9, RF11, RF12, RF14 (b))
  · `2026-10-07-293` (item 1 B, readings, Consequences 1–2) · `2026-10-08-294` §1 (locks) · `-181` · `-253` M · `-255` F7.
- 6.24a's file (the RF definitions, F1–F15, RF1's fragment, the SHA map); `trustee-panel-routing-note-2026-09-28-6-20-follow-ups.md` (FQ6 /
  FQ7, Gaps 1–2); `trustee-panel-routing-note-2026-10-07-6-24-telling-the-refused-person.md` (Q3 item 1).
- 6.19b's story (the SMS path, migration `0128`), 6.19d's (`0138`, the chain-head recipients, the registry addition), 6.19a (W6 — the
  claimant side), 8.8 (the jobs name path).
- `_bmad-output/planning-artifacts/epics.md:3208-3226` (`### Story 6.24b`).

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

## Change Log

| Version | Date | Change |
|---|---|---|
| 2.2 | 2026-10-08 | ✅ **Task 0 DONE.** Task 0.2: BigDev answered every RB as recommended. Task 0.3: `2026-10-08-295` committed ALONE (`a6d55b1d`) after three fresh-context rounds on the draft (1 BLOCKER + 2 HIGH → 1 HIGH → 0); the blocker — RB18 (residuals ii–iii) and RB13 narrow WHEN a ratified text goes — was put back to BigDev (*"Keep + Panel confirm"*) ⇒ `-295` §8 Confirm 2, answered before Row 22 closes. Task 0.4: the RB block records the answers; per `-295` Consequence 1, RB11, RB13, RB18, AC7b and Task 6.3 gain Confirm 2 / Row 22's closure item (c); RB17's precedent cite corrected to `-284` E5. |
| 2.1 | 2026-10-08 | ⭐ **VALIDATED (`bmad-create-story validate 6.24b`; four read-only verifiers — domain, API, jobs / gates, governance / copy; 0 BLOCKER, 6 HIGH, 20 MEDIUM, ~25 LOW; all applied).** New FOUND F29–F37. BigDev answered three: **RB12** (a config fault keeps the once-ever slot open), **RB13** (the refused-person text only while ⛔ no appeal is filed), **RB17** (F14 disclosed to the Panel as a NON-blocking confirm; the user story and P4 reworded — FQ6 half-closes the note's Gap 1). Added RB14 (`undetermined` ⇒ not due), RB15 (trace the closure fallback), RB16 (the no-deadline deny-list stays); RB2 / RB3 / RB4 / RB5 / RB7–RB11 corrected (K4's re-check rule, the Pariwar allowlist, at-least-once, the extraction's cycle and private helpers, the mode read outside the claiming tx, `chainRootOf` private, the ref-only assertion, `noOp(recipient)`, the `events_log` join, the DLT sheet's Row-22 link + the privacy-policy purpose). `db:generate` removed (F29). The `-293` paragraph moved under its own heading (⛔ committed by `-292`). AC6b / AC7b / AC9b rewritten; Tasks 1.3, 2.1–2.5, 3.1, 3.3, 4.1–4.6, 5.1–5.4 corrected; new Tasks 5.5 (no-decision fence) and 7.5 (AC9b's proof); Traps 22–28; stale cites fixed. The copied RF text (RF9, RF11, RF12) is byte-unchanged. **Fresh-context re-validate of v2.1 itself: 3 HIGH, 5 MEDIUM — all in this pass's own additions, all applied:** RB14 WITHDRAWN (F37 corrected — a standing or closed claim's determination is FROZEN, so `undetermined ⇒ not due` looped for ever); RB12's MECHANISM revised to a config PRE-CHECK that writes ⛔ no row (parked rows stranded once their predicate turned false, and a config note could mask a possible send) — BigDev's answer was the policy, the mechanism is put back at Task 0.2; RB15 RESOLVED from code (S's re-determination can name the post-death nominee ⇒ the fallback is dropped, PROPOSED); every selector also returns a claim with an `attempting` row; ONE re-check rule; `{date}` from the same row's `appealUntil`; Trap 29 (the reason lock in test fixtures); cites fixed. **Round 2 (narrow): 2 HIGH, 3 MEDIUM, all applied:** RB12's summary alarm had ⛔ no channel from the children ⇒ the config check moved into the SWEEP (both locales for `appeal_notice`; any Secret Manager fault held and alarmed; the child's check is a race guard; edges i–iii recorded); RB15 re-traced — an R closed before verification has ⛔ determination of its own, so the fallback is NEEDED ⇒ S's determination AS OF R's closure (⛔ S's live one) + an alarm on `no_target`; new RB18 (⛔ closure text for a closed claim the changer's side filed); `not_due` defined; cites fixed. **Round 3 (narrow): 1 HIGH, 4 MEDIUM, all applied:** RB18's `-239` predicate did ⛔ mark the filer (grounding is per death) ⇒ the test is the CLAIMANT's chain holding a discarded version, judged at selection and under the lock, every exclusion alarmed; RB15's as-of read uses the real columns (`occurred_at`, `decided_at`, half-open) and follows the rank-1 entry's correction chain head; RB15's `no_target` alarm reaches the child (`noTargetReason`); RB12's hold is a post-page filter with a lazy per-Pariwar helpline check; the child's return renamed `held_config`; red-checks and specs for every new rule. **Round 4 (narrow): 1 HIGH, 3 MEDIUM, all applied:** RB18 judged ONLY under the lock after RB15 (a finished `no_target` row + one alarm — a closed claim's verdict cannot change), its residuals (ii)–(iv) recorded; the chain-head rule for both of (b)'s sources moved into Task 4.3, the (a)/(b) two-number divergence recorded; `nominee-effective.ts` added to Modified. **Round 5 (narrow): 1 HIGH, 1 MEDIUM, applied:** RB15's and RB18's `no_target` are both written FINISHED by the domain in the claiming transaction and returned as `{ kind: 'no_target', reason }`; the child alarms once and stops; both stated as ⛔ re-check failures. **Round 6 (narrow): 0 BLOCKER, 0 HIGH ⇒ rounds stop;** its MEDIUM applied (the `no_target` write uses the claim's INSERT … ON CONFLICT path — a duplicate child ⇒ `already_final`, ⛔ second alarm). |
| 2.0 | 2026-10-08 | ⭐ **RE-PINNED (`bmad-create-story 6.24b`) to `b6a63a81` (6.24a merged, PR #263) ⇒ `ready-for-dev`.** Four read-only research passes re-derived every code claim. New FOUND F16–F28 (the code's four flows; the audit lives in memory; a bad envelope is a 500; ⛔ no send core ever extracted; 0128 says `outcome`, single-column FK, an end-of-day finaliser; the house key form; ⛔ no erasure guard on the 8.8 name path; ⛔ no date-words helper; the 90 days have ⛔ no SQL form; the trigger lives only in `events_log`; chain head vs linked version; the marker; ⛔ no anonymizer list). **RB1–RB11 PROPOSED** (the author-commit owed at Task 0.3, ⛔ no code before); P4′ + the Niyamavali re-check; AC6b / AC7b / AC9b / AC10b sharpened; Tasks rebuilt 0–7; Traps 15–21; Locks. The copied RF text is unedited. |
| 1.1 | 2026-10-07 | ✅ `2026-10-07-293` Q3 item 1 **B** (committed alone `2ada8f7b`): the THIRD text — to the refused filer, once, with the last date to appeal — joins this story (activating `-292` RF14 (b)'s recorded B branch): `readRefusedFilerRecipient`, purpose `refusal_appeal_notice` in the notice table from the start, AC7b's legs, Task 6.2c. Status stays `backlog`. |
| 1.0 | 2026-10-07 | Split from Story 6.24 v2.0 (BigDev: *"ok, split it"*): RF9, RF11 and RF12's Q2 text, with P4, invariants 5–6, F6 / F10 / F14, AC6 / AC7 (→ AC6b / AC7b), Tasks 1.2 / 5.2 / 6 / 7.2's SMS key and Traps 10–14 — copied verbatim. Status `backlog` until 6.24a is `done`. |
