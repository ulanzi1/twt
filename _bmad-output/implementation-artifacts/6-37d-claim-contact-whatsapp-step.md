---
baseline_commit: 15acb570
---

<!--
PINNED: `15acb570` (2026-10-19 — `main` = `origin/main` after `git fetch`; carries ALL of Story 6.37c, `done`, both review rounds and
the 2nd fix-diff pass, ledger `2026-10-19a`). Built in its OWN worktree `.claude/worktrees/6-37d`, branch
`story/6-37d-claim-contact-whatsapp-step` ([[feedback_commit_on_story_branch]], [[feedback_shared_tree_branch_switch]]). Two facts,
stated separately: (1) the pin is an ancestor of this branch (durable); (2) every `apps/` / `packages/` / `scripts/` cite below was
derived at `15acb570` (perishable — re-check at Task 0.1: `git diff --name-only 15acb570..HEAD -- apps packages scripts`, AND the 6.31
branch, which this story builds on — WS1). Re-locate by FUNCTION, ⛔ by number ([[feedback_story_validate_footguns]] #19, #21, #24).

STATUS: `ready-for-dev` — ⛔ code until Task 0 is done (governance FIRST — [[feedback_governance_commits_precede_implementation]]): BigDev
answers WS1–WS14 and makes the §0 call on PQ1–PQ2; the 6.37d entry is committed ALONE; then the records commit. ⚠ AND (WS1 (a),
recommended) Tasks 1–10 start only once row `6-31-peer-mesh-whatsapp-reminder-at-48-hours` is `done` on `main` — this story builds on
6.31's WhatsApp client work, which today exists ONLY as a story file on an unmerged branch (F3; footgun #23). GO-LIVE (⛔ a merge or
`done` fence — [[project_not_in_production_merge_is_not_golive]]): the NEW roster Row 35 (G3 — WS4) and roster Row 32 (h) (6.37c's ladder).

§0 GATE (the routing template's, applied FIRST — `_bmad-output/planning-artifacts/trustee-panel-routing-note-TEMPLATE.md`): the
BEHAVIOUR is the Panel's and is ALREADY RULED (`-350` ruling 2 (1) the WhatsApp step; `-351` 2 / 4 A the consent and the end rule;
`-352` Q1 B the agreement's channels; `-356` no WhatsApp to a nominee; `-357` the §3.4 claimant exception + G3). Each WS below is the
AUTHOR's — how that ruling is timed, stored, gated, shown to staff, or sequenced. ⚠ SIX WSs have a person-facing half and are FLAGGED
for BigDev's own §0 check at Task 0.2: WS2 (two family-facing lines beyond the agreement), WS3 ("filed under" = the agreement on file),
WS4 (G3 waits for counsel), WS7 (the horizon / pause / window applied to WhatsApp — fewer messages), WS10 (a STOP is honoured
number-wide — fewer messages), WS12 (a delivered WhatsApp ends the follow-up — beyond `-360` Q1 A's literal *"a delivered text"*). ⭐ TWO
questions look like the PANEL's (PQ1, PQ2) — two Trustee-ratified rulings meet at an edge no note put
([[feedback_panel_gate_read_ratified_verbatim]]). ⛔ No new counsel question: counsel's question 3 — whether the reworded agreement is a
sufficient basis for texts, WhatsApp, calls and post to the claimant, and whether its last clause may stay — is ALREADY written by 6.37c
(`counsel-question-2026-10-18-nominee-contact-basis.md`, ⛔ sent) — WS4 makes G3 wait for its answer.

GLYPH REGISTER: `⛔` negates the word it precedes; `⭐` emphasis / action; `⚠` a hazard. ⛔ No `file:NNN` into `.decision-log.md`,
`deferred-work.md` or `sprint-status.yaml` (newest-first files — footgun #19) — cite the decision id, the item's phrase, or the row key.

LETTERS: F = found facts (F1–F24); WS = build decisions (WS1–WS14 — PROPOSED, ⏳ BigDev at Task 0.2); PQ = candidate Panel questions
(PQ1–PQ2); I = invariants (I1–I10); T = traps (T1–T21). Decision-entry letters stay the entry's own (`-350` ruling 2 (1)–(3), `-351`
rulings 1–6, `-352` Q1 / Q2, `-355` decisions 1–18, `-356` calls 1–3, `-363` decisions 1–2; 6.37c's LD1–LD17 and 6.31's WR1–WR16 are
those stories' own). G3 is the §3.4 proposal's go-live condition. This story's OWN decision entry is called **"the 6.37d entry"** below
— its id is the next free one at Task 0.3 (`-364` at this pin; ⛔ written as a number anywhere but here, so it cannot go stale).
-->

# Story 6.37d: When a reminder to the claimant is reported undelivered, the Trust tries WhatsApp four hours later — on the claimant's reworded filing agreement `[PRIMITIVE]`

Status: ready-for-dev

> **WHAT THIS STORY IS, IN ONE PARAGRAPH.** Story 6.37c built the Panel's delivery ladder for the correction and certificate reminders
> with its FIRST step — *"after SMS has been sent and not been delivered for 4 hours, send message over WhatsApp"* (`-350` ruling 2 (1))
> — RECORDED as skipped (`skipped:whatsapp_not_built`), because the claimant's filing agreement did not name WhatsApp and nothing in the
> platform could send WhatsApp to a non-member (6.37c LD1 (a), `-355` decision 1). This story builds that step for the **claimant only**
> (`-356`, `-357`): (1) the filing agreement reworded to `-352` Q1 B (it names text message, WhatsApp, phone call, post and any later
> means — and no longer names the nominees), with a bumped copy version, the old text kept as evidence, and a VERSION-AWARE reader so a
> claim on the old wording keeps SMS, calls and post only (G3); (2) a WhatsApp send to the claimant four hours after a reminder the
> network REPORTS undelivered — the same words as that reminder, a Meta-approved UTILITY template, sent directly (⛔ `dispatch()`), at most
> once per ladder; (3) a delivered WhatsApp ends the ladder and counts as reaching the claimant (`-351` 4 A); (4) STOP ends claim WhatsApp,
> and a claim send can ⛔ change anyone's MEMBER opt-in (the §3.4 exception: *"does not change any member's opt-in state"*); (5) the
> staff view says which channel got through; (6) go-live roster Row 35 carries G3. ⛔ WhatsApp to a nominee (`-356`). ⛔ A second SMS, a
> new DLT template, or any change to the SMS steps, the conclusion, the call record or the nominees' texts and letters.

**What already ships and this story READS — rebuild ⛔ none of it:**
- The ladder (6.37c): `claim_contact_ladders` (0169 / 0170), its pure rules `packages/domain/src/claim/contact-ladder.ts`
  (`ladderWhatsappStep`, `planLadderStart`, `ladderEndReason`, `ladderStepGate`, `dueLadderStep`, `ladderFollowUpOf`), its writers
  `contact-ladder-record.ts` (`insertContactLadder`, `endContactLadder`, `resolveContactLadderStep`, the `begin*LadderSend` re-checks),
  its reads `contact-ladder-read.ts`, the jobs sweep + children `apps/jobs/src/scheduler/claim-contact-ladder.ts`.
- The two chases' ONE reader each and the B1 mapping at read time (`readReturnFamilyRows` / `readClaimCertificateFamilyRows` →
  `applyConcludedLadderMapping`), D22 (`evaluateClosurePersonReach`, `reachedByLadderSms`, `reachedByCall`), the closure hold
  (`ladder_running`).
- The recipients: `readCorrectionRecipients` (`correction-chase.ts`) / `readCertificateRecipients` (`certificate-reminder.ts`) — the
  claimant's person key, number and the claim's `contactLocale`.
- The WhatsApp substrate (Stories 5.3 / 5.4): the Meta Cloud API client `packages/channels/src/providers/whatsapp-app.ts`
  (`createWhatsappAppCache`, `messagingFor`, `WhatsappSendError`), `classifyWhatsappError` (`whatsapp-errors.ts`), the per-Pariwar
  config `getWaConfig` (`packages/domain/src/channel-config/wa-config.ts`, table `pariwar_wa_config`), the signed webhook + persist-and-ack
  (`apps/api/src/modules/channel-webhooks/`) and its worker `apps/jobs/src/wa-webhook-processor.ts` (STOP keywords, block codes,
  `upsertWaSendStatus`), the member opt-in state machine (`member_wa_opt_in`, `packages/domain/src/wa-opt-in/`).
- The agreement (Story 6.19a): `contact.agreement` (`packages/i18n/locales/{en,hi}/claim.json`), the server evidence copy
  `apps/api/src/modules/claims/claim-contact-copy.ts` (`CLAIM_CONTACT_AGREEMENT_COPY_VERSION`, `resolveClaimContactAgreementCopy`), its
  write in `claims.contact.handlers.ts` (a `consent_records` row, type `claim_contact_agreement`, payload `{ checkboxTextShown, locale,
  copyVersion }`), `claim_contacts.agreement_consent_id`, the reader `readClaimContactAgreementState` (`claim-contact-check.ts`).
- 6.31 (WS1 — ⚠ on its branch only at this pin): the additive multi-value / timeout change to `WhatsappTemplateMessage`, the ONE exposed
  `whatsappAppCache`, the exported `resolveChannelSecret`, the outcome rules over `classifyWhatsappError`, and the approved-template-name
  store — AS 6.31's Task 0 decides them.

## Story

As a **claimant** whose family's claim is being chased for a bank-details correction or a death certificate,
I want **a reminder the phone network reports it could not deliver to me to be tried on WhatsApp a few hours later — only because I agreed
to WhatsApp when I filed, never if I said STOP, and without touching my own WhatsApp settings as a member —**
so that **the reminder has a second way to reach me before the Trust falls back to more texts, a call or a letter, and my claim is not
closed for a silence that was really a failed text.**

## The rulings and records this story builds on

| Source | Key (verbatim, abridged) | Status |
|---|---|---|
| `-350` ruling 2 (1) | *"The system does not conclude that a reminder was never delivered until it has: (1) sent the message over WhatsApp, when the SMS has not been delivered 4 hours after it was sent; …"* · ⚠ *"Our reading of the ladder's timing — NOT RATIFIED"*: WhatsApp at hour 4 if no "delivered" report has arrived; *"'Delivered' read as a 'delivered' report for that reminder on either channel."* | Trustee-ratified (the reading: ours) |
| `-250` #5 | *"One message a day, at **10:00 in the morning**."* — *"⇒ the 10:00 hour is now the Panel's."* | Trustee-ratified ⇒ **PQ2** |
| `-351` ruling 1 / 2 / 4 | 1 A *"ONLY A TEXT REPORTED AS FAILED STARTS THE LADDER"* · 2 *"THE CLAIMANT'S AGREEMENT AT FILING IS THE CONSENT TO CONTACT THEM BY SMS, WHATSAPP, CALL OR ANY LATER MEANS"* · 4 A *"any message to that person that IS delivered — a later reminder or a ladder step, on either channel — ends it, and the person counts as reached."* | Trustee-ratified |
| `-352` Q1 B | *"The claimant's filing agreement names text message, WhatsApp, phone call and post, and adds 'or any other means of communication that may appear in future'."* · ⚠ *"Our reading — NOT RATIFIED"*: the English *"I agree that the Trust may contact the claimant named here by text message, WhatsApp, phone call, post or any other means of communication that may appear in future, about this claim."* — nominees removed; *"The Hindi follows through its human review."* · Consequence 3: *"the claimant's WhatsApp step goes live on the new agreement."* | Trustee-ratified (the exact words: ours) |
| `-354` decision 2 | The §3.4 proposal reads the claimant's reworded agreement as meeting §3.4 and NARROWS `-351`'s not-covered (b) (*"is for counsel"*); the Panel is told. | author-commit; told (`-357`) |
| `-355` decision 1 / 3 / 4 / 16 | d1: *"A NEW row `6-37d-claim-contact-whatsapp-step` (`backlog`; after 6.31 and 6-37c) builds the WhatsApp step, the filing agreement's `-352` Q1 wording (a bumped copy version and a version-aware reader — G3), the nominees' removal from that wording (the rewording only — decision 16), the Meta-approved claim-contact templates, a direct non-member sender, a sub-daily step, claim-contact STOP, an absorbing "ever delivered" read, the member-opt-in side-effect isolation, …"* · d3: *"Steps are IST dates on the chases' 10:00 run …"* (our reading, ⛔ ratified) · d4: *"On a day a scheduled reminder is due to that number, that reminder IS the step"* · d16: *"nothing a nominee receives changes until counsel answers; 6-37d keeps only the rewording."* | author-commit ⇒ d3 superseded IN PART (WS6) |
| `-259` | the certificate chase's 10:00 hour — ⚠ a NOT-RATIFIED reading (the correction chase's is `-250` #5's, ratified) | reading ⇒ PQ2 |
| `-356` | *"drop WhatsApp only notification for nominee."* · BigDev's scope (⛔ the Panel's): *"WhatsApp can be in future if nominee has opted to receive the notification, or a case where nominee and claimant is same."* · reading (iii): *"whether it does so for a claimant-nominee is decided at 6-37d's create-story."* | Trustee-ratified ⇒ **PQ1** |
| `-357` | *"Outside the member opt-in flow, WhatsApp may carry messages about a claim — the correction and certificate reminders' delivery ladder — to the CLAIMANT only, on the claim's filing agreement (naming WhatsApp; an explicit affirmative capture recorded per claim, never pre-ticked; withdrawing it, or STOP, ends WhatsApp contact for that claim); no WhatsApp to a nominee under it. Go-live condition **G3**: the claimant's new agreement wording is live (English and reviewed Hindi) before a claimant receives WhatsApp on it; a claim filed under the old wording keeps SMS, calls and post only."* | Trustee-ratified |
| Proposal §3 / G3 (approved *"as presented"*) | G3 *"… (English and reviewed Hindi, **as counsel settles its last clause**) …"* · §3 item 2 *"If counsel advises removing … the production wording omits it … and the Panel is told; no further ruling is needed for that narrowing."* · item 4 *"STOP is honoured and audit-logged; every claim-contact WhatsApp message uses a Meta-approved template."* | approved by `-357` ⇒ WS4 |
| Architecture §3.4 (claim-contact exception bullet) | *"The exception does not change any member's opt-in state and opens WhatsApp to no other surface; the Pariwar's WA toggle and number, Meta-approved templates, and STOP handling apply unchanged."* · §3.4 dual gate: *"Scope: Meta UTILITY templates only"*. | ratified + amended (`-357`) |
| `-360` Q1 / Q2 / Q3 | Q1 A *"Only a delivered text or a call that reaches the family ends the follow-up."* · Q2 A *"Each chase on its own."* · Q3 A *"No follow-up text after day 90 / day 180 or during a pause; the follow-up still runs its days, ends, and asks for a call or a letter."* · told: *"no WhatsApp yet (claimant only, row 6-37d)"* and the 10:00 days | Trustee-ratified ⇒ WS7, WS12 (flagged) |
| `-363` d1 | A reached call answers the ask only when *"`called_on` is on or after the `origin_sent_on` of the person's concluded ladder"*. | author-commit (unchanged here) |
| ADR-0042 (ratified, `-358` — *"ADR-0042's forgery bound as restated for the delivery ladder"*) + its 2026-10-18 dated note | the forgery bound restated *"(no WhatsApp — row 6-37c skips that step)"* | ⚠ becomes FALSE once this ships ⇒ WS14 |
| ADR-0029 §2 (ratified, `-065`) | the worker: *"STOP → REVOKED, Meta block/opt-out status → BLOCKED_BY_META, and message-status callbacks → … `upsertWaSendStatus`"* | ratified ⇒ WS10 / WS11 change it for CLAIM wamids ⇒ a dated changelog note (WS14) |
| Roster Row 19 `claim-contact-privacy-policy-purpose` | the privacy policy names the claim contact record's SMS / postal use | open ⇒ WhatsApp (Meta as processor) widens the use ⇒ a dated note (Task 0.4) |
| Roster Row 18 | testable signal: *"the `claim_contact_agreement` copy's 'pending Story 0.13' marker is replaced by counsel's approved text"* | open ⇒ I6 |

## ⭐ THE INVARIANTS

- **I1 — The claimant only.** A WhatsApp message about a claim goes ONLY to the person the ladder knows as the claim's claimant (PQ1
  decides the claimant who is also a nominee). A nominee's ladder keeps `skipped:nominee_no_whatsapp` for good (`-356`). ⛔ A nominee
  number, ⛔ a member alert path, ⛔ any surface but the ladder.
- **I2 — On the new wording only (G3).** ⛔ A WhatsApp unless the claim's agreement on file is `live` AND its recorded copy version names
  WhatsApp AND — when the claimant agreed in Hindi — that version's Hindi is marked human-reviewed. Unknown / missing version ⇒ ⛔ eligible
  (fail closed). The old wording keeps SMS, calls and post.
- **I3 — Only a REPORTED failure starts it** (`-351` 1 A). The WhatsApp step belongs to a ladder; a ladder exists only after a reported
  `undelivered`. ⛔ A WhatsApp for a text with no report.
- **I4 — Once.** At most ONE WhatsApp per ladder, ever (a DB UNIQUE on the ladder, ⛔ only code). ⛔ A resend on a may-have-sent, ⛔ a
  WhatsApp for a ladder SMS (step 2 / 3) — only step 1 is WhatsApp.
- **I5 — Directly, never the cascade.** ⛔ `dispatch()`, `runChannelCascade`, `resolveWhatsappProviderDeps`, `resolveApprovedTemplate`,
  `AlertCategory`, `pariwar_wa_templates`, the WhatsApp fixture provider (it reports `accepted` — a step "sent" that never went). A
  WhatsApp refusal ⛔ falls back to an SMS (the ladder's own SMS steps are the fallback).
- **I6 — The words.** The WhatsApp body is the SAME words as the reminder that failed (`correction_sms.reminder` /
  `certificate_sms.reminder`), in the claim's contact locale, through a Meta-approved UTILITY template. The agreement copy version keeps
  the `pending-story-0.13` marker until counsel's approved text replaces it (Row 18). ⛔ A new SMS text, ⛔ a new DLT template.
- **I7 — Member opt-in untouched by a claim send.** A claim-contact send, its status callbacks, and its absence ⛔ ever move a
  `member_wa_opt_in` row or a `whatsapp_opt_in` consent (§3.4 exception). (A person's OWN STOP keeps today's member behaviour — WS10.)
- **I8 — STOP ends it.** A STOP from a number ends claim WhatsApp to that number (WS10) — recorded in the ladder's OWN hash space
  (`claim_contact_mobile`, ⛔ the member login key — field-classes.ts keeps the two disjoint on purpose); audit-logged; the step records a
  skip, the ladder runs on with its SMS steps.
- **I9 — The SMS ladder is unchanged.** SMS 2 / SMS 3 dates, the one-text-a-day rule (LD4), the conclusion, the B1 mapping, the escalation,
  the call record, the nominees' texts and letters (`-355` d16) — ⛔ moved, except: a delivered WhatsApp ENDS a ladder and counts as reach
  (`-351` 4 A — AC6).
- **I10 — Fail closed, never stall.** Anything unknown at the WhatsApp step (config, template name, version, number, STOP lookup) ⇒ the
  step records a `skipped:<reason>` and the ladder goes on to SMS 2; ⛔ a held ladder, ⛔ a WhatsApp "to be safe".

## 📜 Policy meaning (AI-10-1)

**This story CHANGES a predicate that gates a family's benefit** — D22, what counts as reaching a person before a claim may be closed for
silence: a delivered claim WhatsApp becomes a reach (`reachedByLadderWhatsapp`), and it ends the ladder that was holding the closure.
In the family's terms: ⭐ *"If you agreed to WhatsApp when the claim was filed and the phone network reports that a reminder text never
reached you, the Trust sends you the same reminder on WhatsApp about four hours later (in the daytime); if that WhatsApp is delivered, you
count as having been told — the same as if the text had arrived — and the extra texts stop; if you reply STOP, no more WhatsApp messages
about claims go to that number."* Its cost to the family: a claim can be closed for silence up to about a week EARLIER than under 6.37c,
because a delivered WhatsApp ends the follow-up that was holding the closure (the same as a delivered text already does). What it does ⛔
mean: a WhatsApp that was only SENT (no delivered report) does ⛔ count; a nominee gets ⛔ WhatsApp; a claim on the old agreement gets ⛔
WhatsApp.
**Niyamavali check:** ⛔ applicable — the Niyamavali (`packages/domain/seed/niyamavali-v1-clauses.sql`) does not speak to how a reminder
is delivered or by which channel, and it is ⛔ ratified ([[feedback_niyamavali_rulebook_not_spec]]). ⚠ Checked against `-350` ruling 2
(1) / `-351` 1, 2, 4 / `-352` Q1 / `-356` / `-357` / `-360` Q1–Q3 / `-250` #5 VERBATIM (the table above), each line MATCH / NARROW / WIDEN:
- a delivered WhatsApp ends the ladder and counts as reached — MATCHES `-351` 4 A (*"on either channel … counts as reached"*); ⚠ GOES
  BEYOND the literal of `-360` Q1 A (later, ratified): *"Only a delivered text or a call that reaches the family ends the follow-up"* — the
  Panel ruled Q1 while told *"no WhatsApp yet"*; WS12 is FLAGGED for BigDev's §0 (author's reading, or a third Panel question);
- WhatsApp four hours after a REPORTED failure — MATCHES `-350` ruling 2 (1) and `-351` 1 A; vs `-250` #5's *"one message a day, at
  10:00"* — **PQ2**; it SUPERSEDES `-355` d3 (author-commit — *"Steps are IST dates on the chases' 10:00 run"*) IN PART for this one step;
- the claimant only — MATCHES `-357`; the claimant who is also a nominee — **PQ1** (`-356` vs `-357`);
- on the new wording only, Hindi reviewed — MATCHES G3; waiting ALSO for counsel's answer (question 3) — MATCHES the approved proposal's
  G3 (*"as counsel settles its last clause"*), stricter only than `-357`'s summary sentence (WS4, flagged);
- no WhatsApp past day 90 / day 180 or in a pause, or at night — NARROWS `-350` ruling 2 (1) the way `-360` Q3 A narrows the texts (WS7,
  flagged — fewer messages);
- STOP honoured number-wide — NARROWS-to-stricter `-357`'s *"for that claim"* (WS10, flagged — fewer messages);
- the agreement no longer names the nominees, and their texts and letters carry on unchanged until counsel answers — `-355` d16 /
  `-354` d5 (*"⛔ changed until then"*), disclosed (F14).

## ⭐ FOUND FACTS

- **F1 — The hook.** `ladderWhatsappStep(role)` (`contact-ladder.ts`) returns `skipped:nominee_no_whatsapp` /
  `skipped:whatsapp_not_built`; `insertContactLadder` writes it at INSERT (both plans in `claim-contact-ladder.ts`); its test (*"a
  claimant's waits for 6-37d"*) pins both values. 0169's comment: *"row 6-37d may add values"*.
- **F2 — The column is IDENTITY.** 0169's `GRANT UPDATE (…)` list has ⛔ `whatsapp_step`; its comment lists *"the WhatsApp step"* among
  the identity columns *"⛔ ever rewritten"*; the CHECK is `^(pending|skipped:[a-z_]{1,48})$`; the policy regression spec
  (`packages/domain/tests/integration/rls/claim-contact-ladder-policy-regression.spec.ts`) pins the UPDATE column list and expects an
  UPDATE of `whatsapp_step` to fail 42501, and `whatsapp_step: 'sent'` to be refused by the CHECK ⇒ WS8.
- **F3 — 6.31 has ⛔ code.** Branch `story/6-31-peer-mesh-whatsapp-reminder-at-48-hours` (worktree `.claude/worktrees/6-31`, `29320851`)
  carries a story file, a Panel note and a ledger edit — `git diff --stat main...` 3 files, ⛔ code; its Task 0 (WR1–WR16) is
  UNANSWERED; `main` shows `6-31-…: backlog`. Its plans, PROPOSED only: WR8 `WhatsappTemplateMessage` becomes a union with `bodyParams:
  readonly string[]` (1–3) + a per-send `timeoutMs`; WR9 expose ONE `whatsappAppCache` on `ContributionProviderWiring`
  (`contribution-providers.ts`) and EXPORT `resolveChannelSecret`; WR10 outcome rules (status 0 or a 2xx without a wamid ⇒
  `may_have_sent`; `template_not_approved` / `auth` / 131008 / 131009 ⇒ a scope-wide park; 502 / 504 ⇒ `may_have_sent`; 429 / rate
  limit ⇒ transient; blocked / invalid ⇒ `rejected_recipient`; else `refused`); WR6 the body in ONE code file with a lockstep test
  against the real `t(…)`, language map `{ en: 'en', hi: 'hi' }` (⛔ `en_US`); WR7 the approved template name per Pariwar in a config
  value read through the DLT config resolver, unset ⇒ HOLD. ⚠ Its planned migration `0167` and decision `-347` are TAKEN on `main` — 6.31
  will take the next free numbers too (T1). The sprint ledger's *"6.31 must take 0170"* (ledger `2026-10-18i`) is STALE — 0170 is
  6.37c's backstops.
- **F4 — The client today.** `whatsapp-app.ts`: `WhatsappTemplateMessage { to, templateName, languageCode, bodyParam }` — ONE `{{1}}`
  value; `FetchInit` = `{ method, headers, body }` (⛔ timeout); resolves to the wamid, throws `WhatsappSendError(message, metaCode,
  httpStatus)` (status 0 on a network failure); one client per Pariwar, built on first call (a rotated token needs a restart). The reminder
  texts have TWO values (`{reference}`, `{helpline}`) ⇒ the single-value client cannot send them (needs 6.31's WR8).
- **F5 — No non-member path.** The one live WhatsApp call site (`contribution-notify.ts` → `notifications.resolveWaTarget`,
  `packages/domain/src/notifications/delivery.ts`) is member-gated: Pariwar toggle → `isOptInActive` → `member_identities`. `dispatch()`
  takes an `Alert` whose `member_id` is mandatory and whose ladder falls back WhatsApp → SMS (`cascade.ts`).
- **F6 — No template store fits.** `pariwar_wa_templates` (0038) is `UNIQUE(pariwar_id, alert_category)` with a CHECK on the nine
  `AlertCategory` values, one `language_code` per row (⛔ en / hi split); approval is an operator attestation. ⛔ A code-side WhatsApp
  registry exists. 6.31 WR7 proposes a per-Pariwar config key instead.
- **F7 — The config gate.** `getWaConfig(db, pariwarId)` (`pariwar_wa_config`: `enabled` DEFAULT false, `phone_number_id`,
  `access_token_secret_name`, `graph_api_version`); the token resolves via Secret Manager or an env fallback (`resolveChannelSecret`,
  module-private in `contribution-providers.ts`). ⛔ Production boot check for WhatsApp; an unprovisioned Pariwar falls back to the
  FIXTURE in the dispatch path (I5 forbids it here).
- **F8 — The status store cannot answer "ever delivered".** `whatsapp_send_status` (0039: `wamid` PK, `state`, `meta_status`,
  `updated_at`) is LATEST-WINS (`upsertWaSendStatus`, `onConflictDoUpdate`); `mapMetaStatus`: sent→sent, delivered/read→delivered,
  failed/deleted/blocked→failed, anything else→unknown; ⛔ error codes, ⛔ recipient stored; ⛔ link to any send row; `getWaSendStatus` has ⛔ production caller. The
  webhook drain marks events processed AT CLAIM (`claimUnprocessedWebhookEvents`) — at-most-once ⇒ a crash mid-batch loses a status.
- **F9 — STOP today is member-only.** `wa-webhook-processor.ts`: keywords `['stop','unsubscribe','cancel','बंद','रोको','रोकें']` (whole
  message, NFKC); `memberMobileBlindIndex(from)` → `getActiveOptInByMobile` → `revokeActiveOptIn` (`member.wa_opt_in_revoked`). No
  ACTIVE row ⇒ `continue` (the event is marked processed) ⇒ **a non-member claimant's STOP is LOST today**; an EXPIRED member's too.
  `MetaInboundMessage` does ⛔ parse `context.id`.
- **F10 — The side effect to isolate.** Same worker: a `failed` status whose error code is in `WA_BLOCK_ERROR_CODES` (131050, 131049,
  131026, 131047) ⇒ `getActiveOptInByMobile(status.recipient_id)` ⇒ `revokeActiveOptIn(… 'BLOCKED_BY_META')` — for ANY wamid. A claim send
  that fails 131026 to a claimant who is ALSO an opted-in member would REVOKE their member opt-in (I7).
- **F11 — The agreement as built.** en `contact.agreement`: *"I agree that the Trust may contact the nominees and the claimant named here,
  by text message and by post, about this claim."*; hi: *"मैं सहमति देता/देती हूँ कि ट्रस्ट इस दावे के बारे में यहाँ दिए गए नॉमिनी और
  दावेदार से टेक्स्ट संदेश और डाक द्वारा संपर्क कर सकता है।"* The server copy `claim-contact-copy.ts` holds the same two strings and
  `CLAIM_CONTACT_AGREEMENT_COPY_VERSION = '2026-09-28.v1-pending-story-0.13'` (*"Bump it (⛔ never edit in place) when the copy changes — a
  row must always be explicable by the text its version names."*). Pinned by `apps/api/tests/unit/claim-contact-copy.test.ts` (JSON ↔
  server byte-identity; the version matches `/pending-story-0\.13/` — Row 18's signal) and by
  `apps/admin/tests/helpline-claim-contact.test.tsx` (asserts the OLD wording verbatim — must change).
- **F12 — Where the version lives.** ONLY in `consent_payload->>'copyVersion'` (⛔ column); `ConsentPayloadSchema`
  (`packages/contracts/src/consent/consent-record.ts`) declares `checkboxTextShown`, `locale`, `ip`, `userAgent` and is `.passthrough()`
  — `copyVersion` is ⛔ declared; the domain `ConsentPayload` has an open index signature. `consent_artifact_ref` is the claimCaseId and
  *"⛔ never a query key (D15)"* — it cannot carry the version. The constant lives in `apps/api` — ⛔ importable by `packages/domain` or
  `apps/jobs` (T6).
- **F13 — The one reader ignores the version.** `readClaimContactAgreementState` selects `revokedAt` and `consentType` only ⇒ `'live' |
  'revoked' | 'missing'`. Its callers: the approval gate `assertClaimContactRecorded`, `readCorrectionRecipients`,
  `readCertificateRecipients`, `assertClosureLetterAllowed`, the W8 re-save rule and the presence read. Many fixtures seed an agreement
  with ⛔ `copyVersion` (e.g. `apps/api/tests/integration/_nominee-name-check-fixture.ts`, `packages/domain/tests/integration/_helpers.ts`,
  `apps/jobs/tests/claim-contact-ladder-live.test.ts`) — a fail-closed reader reads them as the old wording (correct; T7).
- **F14 — Nominees after the rewording.** The nominees' texts, letters and the closure notice are gated today on the claimant's agreement
  being `live` (the recipient readers return NOBODY otherwise). `-355` d16 / `-354` d5: *"⛔ changed until then"* ⇒ those gates keep
  reading `live` / `revoked` ONLY; the rewording leaves the nominees contacted on a basis counsel has ⛔ yet confirmed (counsel question 1 —
  WRITTEN, ⛔ sent). Disclosed, decided — ⛔ a WS.
- **F15 — "Filed under" moves.** `claim-contact-persist.ts` (rule W8): every member re-save records a FRESH agreement row and repoints
  `agreement_consent_id`; a helpline `agreed` does so inside the member's window or when the agreement is missing / revoked; in
  `add_only` states a helpline `agreed` over a live agreement is IGNORED ⇒ WS3.
- **F16 — The agreement is not withdrawable in v1.** 0124: *"⛔ Not revocable in v1"*; deferred-work (6.19a): *"`claim_contact_agreement`
  has no revoke route in the product"*; Row 18 (c) / counsel question 5 ask whether it must be. `-357`'s *"withdrawing it … ends WhatsApp
  contact"* holds by construction (I2 reads `live`), reachable today only by a direct DB change. ⛔ This story builds a withdrawal route.
- **F17 — The claimant who is also a nominee is keyed as a NOMINEE.** `readCorrectionRecipients` adds the `'claimant'` person only when
  `claimant_nominee_version_id IS NULL`; otherwise the claimant is one of the `nominee:<root>` people (`role: 'nominee'`, the nominee
  record's mobile) and `claimantLinkCountsFor(claimantVersion, versionId, index)` identifies which (an UNRESOLVED link ⇒ the claimant is
  in ⛔ person at all — `claimantUnresolved`). `readCertificateRecipients` is SHAPED DIFFERENTLY: it keys people by chain root and folds
  `claimantNomineeVersionId` into the record versions (⛔ `claimantLinkCountsFor`, ⛔ `claimantUnresolved`) — the claimant-nominee is the
  person `nominee:${chainRootOf(claimantNomineeVersionId)}`. Neither `CorrectionPerson` nor the certificate person carries a claimant flag;
  the plans see only `p.role`. ⇒ today such a claimant's ladder records `skipped:nominee_no_whatsapp` ⇒ PQ1. ⚠ A family where a nominee files is likely the
  COMMON case — without PQ1 A the step reaches only claimants who are not nominees.
- **F18 — No clock under a day.** Every ladder action runs on ONE `'0 10 * * *'` Asia/Kolkata sweep (`CONTACT_LADDER_SWEEP_CRON`), the
  only place a ladder STARTS; the ladder stores DATES only (`origin_sent_on`, `sms2_due_on` …). The origin reminder goes at ≈ 10:00 on D
  and its report lands minutes later ⇒ the earliest a ladder exists today is D + 1 at 10:00 — past hour 4. Send rows carry `created_at`
  (the first claim — ⛔ moves; already read by `readLadderOriginCreatedAt`), `claimed_at` (nullable; RE-SET on every re-claim — own retry
  or an expired lease — ⇒ the LATEST attempt's time), `updated_at` (moves on finalise) and a `sent_on` DATE. ⚠ The start block calls
  `advance(started, false)` right after the INSERT (both plans) — a ladder started off-hours would take a due SMS step off the 10:00 hour. Precedents: `'*/15 * * * *'`
  (`STAFF_EMAIL_SWEEP_CRON`), the 09:00–20:00 IST window `isInPeerRequestSendWindow` / `nextPeerRequestSendWindowStart`
  (`claim-peer-mesh-requests.ts`), pg-boss `startAfter` (`claim-peer-mesh.ts`).
- **F19 — The end rule reads SMS only.** `ladderEndReason` ends on a delivered SMS row (`sms_send_deliveries.delivery_state =
  'delivered'`), a reached call, a number change, a stop — ⛔ WhatsApp input. D22's `reachedByLadderSms` counts `ladder_sms` rows only.
- **F20 — The one-a-day check counts texts.** `ladderStepGate`'s `sentToNumberToday` / `correctionNumberTextedOn` read SMS rows; LD4's
  rule is *"never two texts to one number in one chase on one day"*. A WhatsApp is ⛔ a text ⇒ the gate does ⛔ refuse it — PQ2 asks
  whether `-250` #5 does.
- **F21 — What staff see.** `ladderFollowUpOf` → `{ state, started_on, next_step_on, concluded_on }` (`ContactLadderFollowUpDto`,
  `.strict()`, `next_step_on` a DATE; states `running | concluded | ended_delivered | ended_call | ended_other`); ONE admin component
  `ContactLadderLines.tsx` for both chases; `ended_delivered: 'Follow-up ended — a text reached the family.'` names the CHANNEL — wrong for
  WhatsApp. `LadderViewFact` has ⛔ `whatsappStep`.
- **F22 — The forgery bound.** ADR-0042's 2026-10-18 dated note restates the static-token bound as *"(no WhatsApp — row 6-37c skips that
  step)"*; its 2026-10-17 open-item paragraph and a deferred-work line still say a forged `undelivered` starts *"WhatsApp … to the
  claimant and the nominee"*. Once this ships, a forged `undelivered` sends ONE WhatsApp to the claimant (⛔ the nominee) ⇒ WS14.
- **F23 — Meta's opt-in rule (web, 2026-10).** Since the November 2024 Business Messaging Policy update an opt-in may be general (not
  WhatsApp-specific) if it (a) is an affirmative action, (b) makes clear the person will be messaged over WhatsApp, (c) names the
  business. The reworded agreement does (a) and (b); (c) is *"the Trust"* — the Trust's legal name is PENDING (under registration —
  ⛔ hard-code a name). ⇒ Row 35 (d) records a Meta-policy check. UTILITY templates are cheaper than MARKETING and are what §3.4 allows.
- **F24 — Next numbers at this pin.** Decision: the next free id (see the header); roster Row 35; migration `0171` (journal `when` after
  `1794195600014`); ledger: this create-story took `2026-10-19b`, the dev's next is the following letter. ⚠ 6.31 races for the same (T1).

## ⚖️ Build decisions WS1–WS14 (PROPOSED — ⏳ BigDev at Task 0.2)

- **WS1 — Sequencing against 6.31 (`-355` d1: *"AFTER 6.31 and 6-37c"*).** ⭐ **(a) Recommended:** keep the order — Task 0 runs now;
  Tasks 1–10 start only once row 6-31 is `done` on `main`. This story then REUSES, ⛔ rebuilds: 6.31's widened `WhatsappTemplateMessage`
  (multi-value + timeout), the ONE exposed `whatsappAppCache`, the exported `resolveChannelSecret`, its outcome classification and its
  approved-template-name store, each AS 6.31's Task 0 decides it (WS5, WS9 then follow). **Cost:** nothing of this story ships until 6.31
  does (its Task 0 is unanswered); the agreement rewording waits with it (pre-launch, no claim loses coverage —
  [[project_not_in_production_merge_is_not_golive]]). **(b)** split: the agreement half (Tasks 1–2, Row 35) builds now under this row; the
  WhatsApp half becomes a new row after 6.31. **Cost:** one more row and story; two governance passes. **(c)** this story builds the
  client widening itself first and 6.31 rebases onto it — supersedes `-355` d1's order IN PART. **Cost:** decides 6.31's WR8 / WR9 before
  BigDev answers them; two branches editing `whatsapp-app.ts` / `contribution-providers.ts`.
- **WS2 — The agreement's words, versions and evidence (⚠ flagged: two family-facing lines change beyond the agreement).** ⭐ **(a)
  Recommended:** (i) en `contact.agreement` = `-352`'s recorded English VERBATIM; hi drafted by the dev from it and marked ⛔ yet
  human-reviewed with a `"$comment.contact_agreement"` key in BOTH claim.json files (the 6.19b / 6.19d marker pattern), closed by Row 35
  (a); the key is edited IN PLACE (the app shows the current text). (ii) A versioned registry in `packages/domain` (domain-importable;
  `apps/api`'s `claim-contact-copy.ts` re-exports it — T6): `CLAIM_CONTACT_AGREEMENT_VERSIONS`, each `{ en, hi, namesWhatsapp,
  hiReviewed }`; v1 = today's two strings VERBATIM, `namesWhatsapp: false` (evidence, ⛔ ever edited); v2 = the new text, `namesWhatsapp:
  true`, `hiReviewed: false`; `CLAIM_CONTACT_AGREEMENT_COPY_VERSION` → v2's id `<build date>.v2-pending-story-0.13` (keeps Row 18's
  marker — I6). A Hindi review that CHANGES the words mints v3; one that accepts them flips `hiReviewed` in the Row 35 closure commit.
  (iii) `contact.agreement_required` (*"… contact these people …"*) and the helpline's `helpline.contact.duty` (*"… agree that these
  people may be contacted …"*) reworded to say the claimant (the agreement no longer covers the nominees); `contact.help` (it tells the
  filer the NOMINEES are texted or posted — still true for them, F14) and the approval-gate lines unchanged. (iv) `ConsentPayloadSchema` and the
  domain `ConsentPayload` DECLARE `copyVersion` (optional). **Cost:** agent-drafted Hindi a human must review before G3; the two reworded
  lines are family- / staff-facing. **(b)** a new key `contact.agreement_v2`, the old key kept. **Cost:** a dead key; both consumers switch;
  the lockstep test doubles. **(c)** leave (iii) as is. **Cost:** the validation line still says *"these people"* under an agreement that
  names one. ⚠ `contact.help` (*"… we will contact these people by text message or by post …"*) is left as is under (a): true for the
  nominees, it UNDER-describes the claimant (who may now also get WhatsApp and calls) — BigDev may widen it in (a)(iii).
- **WS3 — Which agreement row decides (⚠ flagged — G3 says *"a claim filed under the old wording"*).** ⭐ **(a) Recommended:** the
  claim's CURRENT agreement (`claim_contacts.agreement_consent_id`), read at send time — the newest agreement the claimant gave; a member
  re-save on the new wording moves the claim onto it (they then agreed to WhatsApp, explicitly). Reads *"filed under"* as *"whose
  agreement on file is"* — WIDENS the literal at a re-save. ⚠ In an `add_only` state (after verification) the helpline CANNOT move a claim
  onto the new wording (a helpline `agreed` over a live agreement is ignored — W8); only a member re-save can. **Cost:** that widening
  (disclosed in the 6.37d entry). **(b)** the claim's
  FIRST agreement row. **Cost:** needs a lookup by `consent_artifact_ref` (D15: *"⛔ never a query key"*) or a new column; a later explicit
  agreement to WhatsApp is ignored.
- **WS4 — G3's go-live record: roster Row 35 `claim-contact-claimant-whatsapp-go-live` (⚠ flagged — stricter than `-357`'s call
  text).** ⭐ **(a) Recommended:** closure = (a) v2 (or its successor) live with HUMAN-REVIEWED Hindi — the `$comment` marker removed and
  `hiReviewed` flipped in the same commit; (b) counsel's answer to BOTH halves of question 3 recorded — whether the reworded agreement is a
  sufficient basis for WhatsApp to the claimant, and whether *"or any other means of communication that may appear in future"* may stay;
  the wording narrowed to a new version if counsel advises; *"not sufficient"* ⇒ G3 stays open and the matter returns to BigDev / the
  Panel (it would override `-354` d2) — the approved proposal's *"as counsel settles its last clause"*; the counsel question is WRITTEN,
  ⛔ sent (BigDev sends it); (c) Meta approval of the four templates
  (correction + certificate × en + hi) as UTILITY recorded; (d) a recorded check that the agreement meets Meta's opt-in policy (F23 —
  WhatsApp named, the business named); (e) only then the operator sets each Pariwar's template names. ⛔ A merge fence. Mechanism: ⛔ new
  env switch — the code gate is I2 (the version flags) + the template-name config (unset ⇒ `skipped:whatsapp_not_configured`). **Cost:**
  WhatsApp go-live waits for counsel (b). **(b)** drop (b): go live with the clause, narrow later (proposal §3 item 2: *"no further
  ruling is needed"*). **Cost:** claimants may be messaged on a wording counsel later advises against — and before counsel says whether
  the agreement is a basis for WhatsApp at all.
- **WS5 — Who gets the step (PQ1's build).** ⭐ **(a) Recommended (= PQ1's reading A):** at INSERT, `whatsapp_step = 'pending'` for the
  claimant person (`'claimant'`) AND for the nominee person that `claimantLinkCountsFor` identifies as the claimant (F17); every other
  nominee `skipped:nominee_no_whatsapp`. `CorrectionPerson` and the certificate person gain `isClaimant: boolean`, computed in EACH reader
  (correction: the `'claimant'` person, or the nominee `claimantLinkCountsFor` matches; certificate: the person
  `nominee:${chainRootOf(claimantNomineeVersionId)}` or the claimant person — F17); `ladderWhatsappStep` takes it, ⛔ just `role`. The
  number is the ladder's own (`recipient_number_hash` — the number whose SMS failed). If PQ1 is ruled B, the claimant-nominee keeps
  `skipped:nominee_no_whatsapp` (a one-line change). **Cost:** a field on both person types (the recipient SETS must stay unchanged — a leg). **(b)** the
  claimant person only, until PQ1 is ruled. **Cost:** the common family (a nominee files) gets ⛔ WhatsApp.
- **WS6 — The step's clock (PQ2's build).** ⭐ **(a) Recommended (= PQ2's reading A):** due at the ORIGIN reminder row's `created_at` + 4 h
  (it never moves and `readLadderOriginCreatedAt` already reads it; ⛔ `claimed_at` — re-set on every retry; ⛔ `updated_at`; ⛔ the
  `sent_on` date); taken by the first sweep at or after that moment inside 09:00–20:00 IST (`isInPeerRequestSendWindow`'s window, reused —
  ⛔ a second definition; the pure gate takes `inWindow` / `nextWindowStart` as INPUTS computed in jobs, since domain cannot import
  `apps/jobs` — or both helpers move into domain and peer-mesh re-imports them); outside it, the next 09:00. A report that lands late moves it
  later (the step is due at max(due, ladder start)). Overtaken: once SMS 2 is resolved (`sent` / `satisfied` / `skipped:*`), a pending
  WhatsApp step records `skipped:overtaken` — ⛔ a WhatsApp after the second text. Supersedes `-355` d3 IN PART (this one step is ⛔ on
  the 10:00 run); d4's *"that reminder IS the step"* does ⛔ apply to it (the WhatsApp is a different channel). **Cost:** on day D the claimant may get the 10:00 text
  (undelivered) and a WhatsApp at ≈ 14:00. **(b)** = PQ2 option B: the step at the next 10:00 run. **Cost:** ≈ 24 h, ⛔ 4 h; on days 1–7 it
  lands beside a scheduled reminder.
- **WS7 — The step's limits (⚠ flagged — fewer messages).** ⭐ **(a) Recommended:** the WhatsApp step obeys the same `ladderStepGate`
  horizon and pause as the ladder's texts (correction `runDay >= 90`, certificate `> 180`, a certificate pause ⇒ `skipped:past_horizon` /
  `skipped:paused`) — reading `-360` Q3 A's *"no follow-up text"* as *"no follow-up message"*; plus the daytime window (WS6). The
  horizon / pause HALF of `ladderStepGate` is EXTRACTED and shared (⛔ copied, ⛔ called with its one-a-day `satisfied` branch live — pass
  `scheduledToday: false, sentToNumberToday: false` or split the function); the certificate pause comes ONLY from
  `certificateLadderStopReason`. The one-text-a-day check (LD4) does ⛔ apply (F20 — subject to PQ2). **Cost:** fewer WhatsApp messages at the edges. **(b)** WhatsApp ignores
  the horizon / pause (Q3 A said *"text"*). **Cost:** a WhatsApp after the reminders' end — the opposite of Q3's purpose.
- **WS8 — Where the step is recorded.** ⭐ **(a) Recommended:** (i) a forward migration (`0171` or the next free — T1; ⛔ regenerate 0169 /
  0170 — [[project_live_db_test_gotchas]]): `GRANT UPDATE ("whatsapp_step")` + CHECK widened to `^(pending|sent|skipped:[a-z_]{1,48})$` +
  a BEFORE UPDATE trigger refusing any change of `whatsapp_step` FROM a non-`pending` value (it stays identity once decided — F2); code
  CAS `pending → sent | skipped:*`; ladders already written keep their skip. (ii) A NEW tenant table `claim_contact_wa_sends` — one row per
  ladder (`ladder_id` UNIQUE, FK), `pariwar_id`, `claim_case_id`, `chase`, `recipient_number_hash`, `template_name`, `locale`, `outcome`
  (`attempting | accepted | refused | rejected_recipient | may_have_sent | no_target`), `attempt_count`, `claimed_at`, `detail`,
  `wamid` (UNIQUE when set), `delivered_at` (ABSORBING — set once, ⛔ cleared), `failed_at`, `failure_code`, `created_at`, `updated_at`;
  ENABLE + FORCE RLS, per-command tenant policies, column grants to `twt_app` (the house shape, as 0167 / 0169 — ⚠ ONE jobs pool runs
  every worker, the dev superuser or a prod BYPASSRLS login, so a grant binds `twt_app` ONLY; the real controls for jobs are TRIGGERS:
  `delivered_at` never cleared once set, and the ladder's "only from pending"); its policy declaration file and a policy regression spec
  (the 6.37c pattern); both new tables join roster Row 26 (jobs login grants). The outcome vocabulary ADOPTS 6.31's as decided (WR10 —
  e.g. `error` + detail, `skipped_*`) rather than the names above, which are placeholders; and unlike 6.31's re-park, a scope-wide
  refusal here records + alarms and does ⛔ park (the ladder cannot wait) — a named divergence. The step is `sent` when its row is CLAIMED (6.37c Debug Log (b) 2 — a refusal at send still counts as sent; the ladder
  runs on). **Cost:** a trigger on the ladder table (6.37c had none) and a spec flip. **(b)** WhatsApp as a new purpose on the chase send
  tables. **Cost:** SMS-shaped tables (CRQID, `sms_send_deliveries`, DLT outcomes) carrying a WhatsApp row. **(c)** state only on the new
  table, `whatsapp_step` left `pending`. **Cost:** a `pending` that never moves.
- **WS9 — The words and templates.** ⭐ **(a) Recommended:** the body is the reminder that failed — `correction_sms.reminder` or
  `certificate_sms.reminder` — in the claim's `contactLocale`, values `{{1}}` = the claim reference, `{{2}}` = the helpline (the same
  values the SMS sends); ⛔ header, footer, buttons. FOUR templates (two chases × en / hi), UTILITY, registered in ONE code file
  `apps/jobs/src/scheduler/claim-contact-wa-templates.ts` (`{ correction: { en, hi }, certificate: { en, hi } }`) with a lockstep test
  against the REAL `t(…)` (a stub is a second source — [[feedback_stub_must_call_not_transcribe]]); the approved template NAME per Pariwar
  in 6.31's decided store (WR7 proposes `wa.template.<…>.<locale>.<pariwarId>`; here `claim_contact.correction_reminder` /
  `claim_contact.certificate_reminder`); unset ⇒ `skipped:whatsapp_not_configured`. The Meta body uses `{{1}}` / `{{2}}` — ⛔
  `{#var#}`, ⛔ `DLT_VAR`, ⛔ `sms.dlt.template_id.` in that file (the dlt-typed-variables gate). ⚠ The certificate Hindi is ⛔ yet human-reviewed
  (Row 21) — its WhatsApp twin inherits that. **Cost:** four Meta submissions. **(b)** one shorter WhatsApp-specific text. **Cost:** a new
  family-facing text the Panel never saw.
- **WS10 — STOP (⚠ flagged — honoured number-wide).** ⭐ **(a) Recommended:** in `wa-webhook-processor.ts`, a STOP keyword from a number
  ALSO records a claim-contact stop — a new tenant table `claim_contact_wa_stops (stop_id, pariwar_id, recipient_number_hash, stopped_at,
  inbound_event_id)` keyed in the LADDER's hash space: `correctionNumberHash(normalizeMobile(from), event.pariwarId, enc)` (class
  `claim_contact_mobile` — ⛔ `memberMobileBlindIndex`, the login key: `field-classes.ts` keeps the two disjoint so no claim row is
  joinable to a member's identity); ONE extra HMAC per inbound STOP (rare); the worker's deps gain the KEK ref `correctionNumberHash` needs
  (`FieldCryptoDeps` — `boot.ts` passes only kms + hmacKeyRef today); the child compares with the ladder's own hash (⛔ HMAC there) —
  whether or not the number has a member opt-in; today's member path (revoke an ACTIVE opt-in) is unchanged — the person's own STOP. The WhatsApp
  step refuses any number with a stop (`skipped:stopped`) — for every claim in the Pariwar, ⛔ only the one that messaged it (stricter than
  `-357`'s *"for that claim"*). ⛔ An un-stop path in v1 (disclosed). Audit-logged with its OWN action (e.g. `claim_contact.wa_stopped`,
  actor null, locator `pariwar/<id>/claim-contact/wa-stop/<stopId>`, audit before write — through `withCompensatingAudit` if the recorder
  lives in `packages/domain/src/claim`; today's `auditOptInTransition` needs a member id a non-member lacks). ⚠ The worker matches STOP
  only on `msg.type === 'text'` — a quick-reply button STOP is dropped (the templates have ⛔ buttons, so none is offered). **Cost:** a STOP sent for member alerts also ends claim
  WhatsApp; a stopped number cannot be re-opened. **(b)** a per-claim stop (only claims whose WhatsApp reached that number before the STOP).
  **Cost:** a STOP sent before the first claim message, or about another claim, is ignored.
- **WS11 — Isolation and the absorbing delivered read.** ⭐ **(a) Recommended:** the worker's status branch first looks the wamid up in
  `claim_contact_wa_sends` — inside `withPariwarScope(pool, event.pariwarId, …)` with an explicit `pariwar_id` filter (the event's Pariwar
  comes from the signed per-Pariwar URL), and the worker repeats the RLS-bound-role refusal (6.37c's `canReadAcrossPariwars` guard)
  BEFORE the claim branch — the worker runs cross-tenant on the BYPASSRLS pool today; if jobs ever runs RLS-bound (Row 26), an unscoped
  lookup would return 0 rows and a block code would REVOKE the member's opt-in (I7) — ⛔ silently: if found, it records `delivered_at` (once, on `delivered` / `read`) or `failed_at` + `failure_code` (on
  `failed`) on THAT row and SKIPS the member-block revoke (I7, F10); `upsertWaSendStatus` keeps running as today. A claim row is ⛔
  correlated by recipient. The at-most-once drain (F8) is disclosed: a lost `delivered` is silence — the ladder runs on, as for an SMS with
  no report (`-351` 1 A). **Cost:** the member worker gains a claim branch (5.4's file). **(b)** a separate claim webhook / worker.
  **Cost:** Meta sends one webhook per number; two consumers of one event table.
- **WS12 — A delivered WhatsApp ends the ladder and counts as reached (`-351` 4 A — ratified; the WS is the mechanism; ⚠ flagged —
  beyond `-360` Q1 A's literal *"a delivered text"*).** ⭐ **(a) Recommended:** `ladderEndReason` gains a WhatsApp input — the ladder's own
  `claim_contact_wa_sends` row with `delivered_at IS NOT NULL` ⇒ `ended_delivered`, `end_detail = 'delivered:whatsapp'` (`LadderEnd.detail`
  widens from the literal `'delivered'`; the DB CHECK `^[a-z_:]{1,64}$` already allows it); a `failed_at` or no status ⇒ nothing. ⭐ The
  CLOSURE effect is mostly the hold: an ended ladder lifts `ladder_running`, and on an `ended_delivered` ladder the origin reads as stored
  (the B1 mapping touches only concluded ladders) ⇒ D22 already counts that person reached by the origin. D22
  (`evaluateClosurePersonReach` / `readClosureReach`) exists for the CORRECTION closure only; `reachedByLadderWhatsapp` beside
  `reachedByLadderSms` therefore changes D22 only for a WhatsApp delivered AFTER the ladder concluded — recommended: it COUNTS (4 A's
  *"counts as reached"*), with the row's hash equal to the person's CURRENT hash (as `reachedByLadderSms` checks), while the conclusion and
  letter-eligibility stay (LD17). The certificate chase gets the ladder END only. **Cost:** a post-conclusion WhatsApp can let a correction
  closure proceed (as a post-conclusion SMS would). **(b)** WhatsApp ends the ladder but does ⛔ count as reach. **Cost:** contradicts 4 A's
  *"counts as reached"*. **(c)** a post-conclusion WhatsApp does ⛔ count for D22. **Cost:** the two channels differ after conclusion.
- **WS13 — What staff see.** ⭐ **(a) Recommended:** `ContactLadderFollowUpDto` gains `delivered_by: 'text' | 'whatsapp' | null` (strict
  schema + lockstep legs; `LadderViewFact` gains `endDetail` and both view builders — `correction-chase-read.ts`,
  `certificate-reminder-read.ts` — carry it); the admin line for `ended_delivered` reads by channel (*"Follow-up ended — a WhatsApp message reached the
  family."* beside today's text line); ⛔ new line for a skipped or sent WhatsApp (staff act on the ask, not the step). Microcopy gate
  (T18 of 6.37c: ⛔ the bare word "report"). **Cost:** a contract field. **(b)** a per-step list. **Cost:** a larger DTO staff do not act on.
- **WS14 — Records, alarms, the forgery bound.** ⭐ **(a) Recommended:** (i) ADR-0042 gains a dated note (⛔ its decision text edited): the
  bound `-358` ratified (*"as restated for the delivery ladder"*) WIDENS — a forged `undelivered` now ALSO sends at most ONE WhatsApp to the
  claimant (⛔ a nominee), on the new wording only — a consequence of `-350` ruling 2 (1); the deferred-work line annotated; the Panel TOLD
  at its next sitting (a "told" item, ⛔ a ruling — the 6.37c pack item 5 precedent; BigDev's §0 confirms "told, not ruled"; WRITTEN at
  Task 10, ⛔ "told" until it goes out). ADR-0029 gains a dated changelog row (⛔ decision text edited): the worker also records a
  claim-contact stop on a STOP keyword, and for a wamid in `claim_contact_wa_sends` records the status on that row and does ⛔ drive
  BLOCKED_BY_META (§3.4 exception, `-357`). (ii) Log lines (logs only
  until Row 32 (h)): `contact_ladder.whatsapp` per outcome / skip reason by ids, and an alarm `contact_ladder.whatsapp_refused` on a
  scope-wide refusal (`template_not_approved`, `auth`). (iii) Roster Row 35 (WS4); Row 18 dated note (v2 keeps the marker); Row 19
  dated note (WhatsApp widens the claim contact record's use; Meta a processor); the §3.4 proposal untouched (approved). **Cost:** none.

## 🏛️ Candidate Panel questions (BigDev's §0 check FIRST at Task 0.2 — route, or record as the author's in the 6.37d entry)

- **PQ1 — The claimant who is also a nominee.** Two ratified rulings meet: `-356` *"drop WhatsApp only notification for nominee"* and
  `-357` *"to the CLAIMANT only, on the claim's filing agreement"*. `-356`'s own reading (iii) left it to this create-story; BigDev's scope
  words — *"or a case where nominee and claimant is same"* — were told to the Panel as his, ⛔ ruled, and say *"can be in future"*. §0:
  passes on its face (what the Trust sends a person; two ratified clauses at an edge) — ⚠ BigDev may hold it is his under his own scope
  words; `-356`'s reading (iii) already records A as the author's NOT-RATIFIED reading (*"a nominee who is also the claimant is reached
  as the claimant, on the claimant's filing agreement"*). **Our reading (built unless ruled otherwise — WS5 (a)):** **A** — they are reached as the claimant: they agreed to WhatsApp as
  the claimant, and `-356` was about nominees who never agreed. **Cost:** a nominee's number gets WhatsApp (the same person). **B** — no
  WhatsApp while they are also a nominee. **Cost:** most families (a nominee files) never get the step. **C** — WhatsApp only to a
  claimant-nominee who ALSO opted in as a member. **Cost:** almost no one; the agreement's WhatsApp line means little.
- **PQ2 — WhatsApp at four hours vs "one message a day, at 10:00".** `-250` #5 (ratified for the CORRECTION reminders; for the
  certificate chase the 10:00 hour is `-259`'s not-ratified reading): *"One message a day, at 10:00 in the morning"*; `-350` ruling 2 (1)
  (ratified later): WhatsApp *"when the SMS has not been delivered 4 hours after it was sent"*. Evidence the Panel was told the 10:00 days
  for the ladder: `-360`'s told line and `-355` d3 (our reading). §0: passes (two ratified clauses that may conflict). **The one fact:** the 10:00 text was reported NOT delivered — the WhatsApp
  at ≈ 14:00 is the first message that reaches the family that day. **Our reading (built unless ruled otherwise — WS6 (a)):** **A** — at
  four hours, in the daytime (09:00–20:00); `-350` is the later, specific rule. **Cost:** two messages SENT that day (one never arrived).
  **B** — at the next 10:00. **Cost:** ≈ a day later; on the first week's days it arrives beside a scheduled reminder. **C** — at four
  hours, only when no other reminder is due the next morning. **Cost:** a rule families cannot predict.

⚠ If BigDev routes either: ONE routing note from the TEMPLATE (`trustee-panel-routing-note-YYYY-MM-DD-6-37d-whatsapp-edges.md`), plain
question first, the deciding fact, options with costs, evidence last; WRITTEN at Task 0.3, ⛔ "sent" until it goes out
([[feedback_shown_to_panel_means_sent]]). This row is ⛔ `done` until a routed question is ruled and the code matches.

## Acceptance Criteria

Notation: "the step" = the ladder's WhatsApp step (step 1); "the chase" = correction or certificate; live legs on :5433 with a
controllable clock; every Meta call through an injected fetch (⛔ network in any test).

1. **AC0 — Governance before code.** Task 0 is done before any `apps/` / `packages/` / `scripts/` change: WS1–WS14 answered and recorded
   VERBATIM; PQ1–PQ2 through BigDev's §0 (routed or recorded); the 6.37d entry committed ALONE; the records commit (Row 35, Row 18 note,
   the epics.md dated note, deferred-work, sprint row) after it. Under WS1 (a), Tasks 1–10 start only with row 6-31 `done` on `main` — if
   it is not, STOP and report (⛔ build 6.31's client here).
2. **AC1 — The agreement's new words.** Given the contact step (app) and the helpline form, when shown, then `contact.agreement` reads
   `-352`'s recorded English VERBATIM and its Hindi draft, both carrying a `"$comment.contact_agreement"` ⛔-yet-reviewed marker; the
   server registry holds v1 BYTE-IDENTICAL to today's text and v2 identical to the JSON (a lockstep test); the current version id matches
   `/pending-story-0\.13/`; a recorded agreement's payload carries v2's id and the text shown; `ConsentPayloadSchema` declares
   `copyVersion`; the WS2 (iii) lines reworded; `apps/admin/tests/helpline-claim-contact.test.tsx` asserts the NEW text; a leg pins the
   box UNTICKED by default on both surfaces (§3.4 *"never pre-ticked"* — `contact.tsx`, `HelplineClaimContact.tsx`); the i18n parity
   and microcopy gates pass.
3. **AC2 — The WhatsApp basis reader (G3).** Given an agreement, when the step asks, then a NEW pure-over-read function (e.g.
   `readClaimantWhatsappBasis`) returns eligible ONLY for: consent type `claim_contact_agreement`, ⛔ revoked, a KNOWN version with
   `namesWhatsapp`, and — payload locale `hi` — `hiReviewed`; else a reason (`not_live` / `old_wording` / `unknown_version` /
   `hindi_not_reviewed`); a payload with ⛔ `copyVersion` ⇒ `old_wording`; it reads the claim's CURRENT agreement
   (`claim_contacts.agreement_consent_id`) at send time (WS3). `readClaimContactAgreementState` is UNCHANGED, and the agreement-state gate
   inside each F13 caller (`agreement !== 'live'` ⇒ nobody) is UNCHANGED (a diff fence) — the nominees' texts and letters, the approval
   gate and the closure letter read what they read today (the recipient readers DO gain WS5's `isClaimant` — a leg proves the recipient
   SETS unchanged).
4. **AC3 — Who.** Given a new ladder, when inserted, then `whatsapp_step` is `pending` for the claimant person and (PQ1 A) the nominee
   person identified as the claimant (`isClaimant`), and `skipped:nominee_no_whatsapp` for every other nominee; legs per chase for a
   claimant, a claimant-nominee, a plain nominee; correction — an unresolved claimant link ⇒ ⛔ claimant ladder and ⛔ nominee ladder of
   that claim `pending`; certificate — the claimant's chain-root person is `pending`.
5. **AC4 — When.** Given a running ladder with a pending step, when the quarter-hourly WhatsApp sweep runs, then the step is taken only
   at or after the origin row's `created_at` + 4 h AND inside 09:00–20:00 IST (else the next 09:00); a report arriving late takes the step
   at the first in-window run after the ladder starts; the quarter-hourly sweep may START a ladder ONLY for an origin whose `undelivered`
   report arrived since its previous tick AND that has no ladder (SQL: the report's received time + `NOT EXISTS` ladder — ⛔ the 14-day
   candidate set `listLadderCandidateClaims`), through the SAME extracted START (`planLadderStart` → `insertContactLadder`, under the
   chase lock) as the 10:00 sweep, and it does ⛔ call `advance` — a ladder it starts takes its SMS steps only at the 10:00 sweep (a leg: a
   report first seen D + 2 at 14:00 sends ⛔ SMS 2 until the next 10:00, and its WhatsApp is ⛔ `overtaken` by it); SMS 2's due date is
   unchanged (`ladderFirstDueOn`); once SMS 2 is resolved a pending step becomes `skipped:overtaken`; past the horizon or in a pause ⇒
   `skipped:past_horizon` / `skipped:paused` (WS7); ⛔ HMAC or decrypt in the sweep (T4); a NULL anchor ⇒ `skipped:anchor_unknown` (I10).
6. **AC5 — The send.** Given a due step, when the child runs, then under the chase lock it re-checks: the ladder running and the step
   pending; WS10's stop; I2's basis; the Pariwar's `enabled` + `phone_number_id` + secret; the chase's approved template name for the
   locale (unset ⇒ `skipped:whatsapp_not_configured`); the decrypted number's hash equals the ladder's (else the ladder's own end rule);
   then claims ONE `claim_contact_wa_sends` row (UNIQUE `ladder_id` — a second claim refused by the DB), sets the step `sent`, commits,
   and sends through the 6.31 client (two values, the per-send timeout) — ⛔ `dispatch()` / cascade / fixture (a symbol fence over I5's
   names); finalises the outcome per 6.31's rules (`may_have_sent` ⛔ resent; a scope-wide refusal ⇒ the row `refused` + the alarm, ⛔ a
   park — the ladder cannot wait); the ladder runs on to SMS 2 whatever the outcome; ⛔ an SMS fallback.
7. **AC6 — Delivered ends it and counts.** Given the ladder's WhatsApp row gets `delivered` (or `read`), when the next sweep / child
   re-check runs, then the ladder ends `ended_delivered` / `delivered:whatsapp` (either chase — `-360` Q2 A: a leg with the other chase's
   ladder still running) and a correction ladder's end lifts `ladder_running`; D22 (correction closure only) counts a WhatsApp delivered
   AFTER conclusion as WS12 decides, with the row's hash equal to the person's CURRENT hash; a `failed` status or none ⇒ ⛔ end, ⛔ reach; a
   delivered status after conclusion leaves the conclusion and letter-eligibility as they are (LD17).
8. **AC7 — STOP and isolation.** Given the worker, when a STOP keyword arrives from (a) a non-member, (b) a member with an ACTIVE opt-in,
   (c) an EXPIRED member, then a claim-contact stop is recorded (in the ladder's `claim_contact_mobile` hash space, inside the event's
   Pariwar scope) and audit-logged with its own action in all three; (b)'s member opt-in is REVOKED as today, (a) and (c) touch ⛔ member
   row; the step for that number then records `skipped:stopped`. When a `failed` status with a block code arrives
   for a CLAIM wamid whose recipient is also an opted-in member, then the member's opt-in and consent are UNCHANGED and the claim row
   records `failed_at` + the code — the lookup scoped to the event's Pariwar, after the RLS-bound-role refusal; the same status for a
   MEMBER wamid still blocks as today (a leg each).
9. **AC8 — Records.** The forward migration (WS8): the ladder grant / CHECK / trigger (an UPDATE from a skip or `sent` refused by the DB;
   `pending → sent` allowed); `claim_contact_wa_sends` and `claim_contact_wa_stops` with RLS ENABLE + FORCE, per-command tenant policies,
   column grants to `twt_app`, CHECKs (the outcome vocabulary), a BEFORE UPDATE trigger keeping `delivered_at` once set (a grant binds
   `twt_app` only — jobs bypasses it); the policy declaration files; the policy regression specs updated / added; the access-wrapper gate
   green (it fires on a bare `writeAuditEntry` in `packages/domain/src/claim` — `withCompensatingAudit`).
10. **AC9 — What staff see.** `follow_up.delivered_by` in both chases' DTOs (strict; lockstep legs); the admin line by channel; the
    microcopy gate.
11. **AC10 — Records and close.** ADR-0042's and ADR-0029's dated notes (WS14); the Panel "told" item WRITTEN (⛔ "told" until it goes
    out); the deferred-work 6.37c item *"The ladder's WhatsApp step"* → **Closed
    by 6-37d** (with the commit); new deferred items for what this story discloses (the un-stop path; the at-most-once drain; the inbound
    non-STOP replies nobody reads; the Meta-policy check if Row 35 (d) is open); the sprint row → `review` with a ledger entry; the epics.md
    entry's dated note.
12. **AC11 — Nothing else moves.** A diff fence: `dispatch.ts`, `cascade.ts`, `provider-composition.ts`, `contribution-notify.ts`,
    `pariwar_wa_templates`, the member opt-in state transitions (except AC7's claim branch), the SMS ladder steps / dates / conclusion /
    escalation / call record, the nominees' recipient gates, every DLT template and `sms-dlt-registry.ts`, `correction_sms.*` /
    `certificate_sms.*` copy — unchanged.
13. **AC12 — The proof.** `pnpm ci:local` on :5433 green (load timeouts re-run alone and SAID so — [[project_known_livedb_test_failures]]);
    the fetch recorder shows ⛔ call to `graph.facebook.com` outside injected fakes; the policy specs; contracts vitest run (they are
    outside tsc — [[project_contracts_tests_outside_tsc]]); the gates that bite here — access-wrapper (compensating audit), microcopy,
    i18n parity, dlt-typed-variables (the template file), domain-invariants (any new dynamic `.limit()` ⇒ `clampLimit`). ⚠ ⛔ Existing gate
    forbids a channel-provider import outside the cascade, and ⛔ frozen-file fence names `wa-webhook-processor.ts` — I5's symbol fence and
    AC11's untouched-path diffs are NEW tests this story writes (human-actor and channels-determinism have nothing to scan here).

## Tasks / Subtasks

- [ ] **Task 0 — governance FIRST (AC0). ⛔ No code.**
  - [ ] 0.1 `git fetch origin`; re-pin if `main` moved (`git diff --name-only 15acb570..origin/main -- apps packages scripts`); check
        the 6.31 branch and every worktree for claims on the next decision id, Row 35, migration 0171 (T1); report 6.31's state.
  - [ ] 0.2 Put WS1–WS14 to BigDev, each with its recommendation and cost (incl. the five §0 flags — WS2, WS3, WS4, WS7, WS10); then
        PQ1–PQ2 — BigDev's §0 check FIRST (*"STRIP THE CITATIONS AND READ WHAT IS LEFT"*): route, or record as the author's. Record every
        answer verbatim (Debug Log).
  - [ ] 0.3 Write the 6.37d entry (author-commit; its own §0 per WS; the WS3 widening, the WS4 / WS7 / WS10 stricter readings, F14's
        nominee disclosure, F16's withdrawal fact stated); stage in the scratchpad; insert above the newest `### Decision`
        ([[project_decision_log_writes_user_inserted]] — try, verify additive-only, ask once if refused); it names what it supersedes IN
        PART (`-355` d3 — the WhatsApp step is ⛔ on the 10:00 run) and states WS12's reading of `-360` Q1 A verbatim; commit ALONE. Then, if routed,
        the PQ note (WRITTEN, ⛔ sent).
  - [ ] 0.4 The records commit: roster Row 35 (WS4) + Row 18 dated note (the v2 marker) + Row 19 dated note (WhatsApp, Meta a
        processor) + Row 26 note (two new tenant tables); the epics.md dated note; the sprint row comment; ledger. ⛔ ADR-0042 / ADR-0029 yet
        (Task 10, with the code that makes them true).
  - [ ] 0.5 ⛔ New counsel question — remind BigDev that counsel question 3 (written by 6.37c) is what Row 35 (b) waits on, still unsent.
- [ ] **Task 1 — The agreement's versions and words (AC1; WS2).** ⛔ Before 6.31 is on `main` under WS1 (a).
  - [ ] 1.1 The registry in `packages/domain/src/claim/` (e.g. `claim-contact-agreement-copy.ts`), exported via `index.ts`; v1 verbatim;
        v2; `claim-contact-copy.ts` re-exports (the api's imports unchanged).
  - [ ] 1.2 en / hi `contact.agreement` + the `$comment` markers; WS2 (iii) lines; the admin helpline copy.
  - [ ] 1.3 `ConsentPayloadSchema` / `ConsentPayload` declare `copyVersion`.
  - [ ] 1.4 Tests: the lockstep (JSON ↔ registry current), v1 byte-identity to F11, the marker regex, the admin + mobile tests, parity,
        microcopy.
- [ ] **Task 2 — The basis reader (AC2; WS3).** The reader in `claim-contact-check.ts` (or a sibling), reading `consent_payload`
      `copyVersion` + `locale`; unit legs for every reason; a live leg; the F13 callers' diff fence.
- [ ] **Task 3 — Migration, schema, policies (AC8; WS8, WS10).** Forward migration at the next free number (journal `when` monotonic);
      Drizzle schema files for the two tables; policy declarations; the ladder spec flip + two new specs; apply to :5433 ONLY (⛔ :5432 —
      [[project_prepush_hook_inherits_5432]]).
- [ ] **Task 4 — The pure rules (AC3, AC4, AC6; WS5–WS7, WS12).** `isClaimant` on both person types (in each recipient reader);
      `ladderWhatsappStep` by it; a `ladderWhatsappGate` (due time, `inWindow` / `nextWindowStart` as INPUTS, the extracted horizon / pause
      half of `ladderStepGate`, overtaken, stop, basis, config) returning `send | wait | skipped:<r>`; `ladderEndReason` + D22 WhatsApp
      inputs (`LadderEnd.detail` widened); update the stale JSDoc on `ladderWhatsappStep` and the test title *"a claimant's waits for
      6-37d"*; unit legs for each verdict and order.
- [ ] **Task 5 — The sender (AC5; WS9).** `apps/jobs/src/scheduler/claim-contact-wa-templates.ts` + its lockstep test (real `t()`); the
      send through 6.31's client + cache + secret resolver; outcome mapping per 6.31's rules; ⛔ fixture.
- [ ] **Task 6 — The jobs (AC4, AC5).** A quarter-hourly `claim.contact_ladder.whatsapp_sweep` (queue names in `packages/queue`; IST;
      registered in `registerContactLadderWorkers`, with an expiry / singleton shorter than `CORRECTION_SWEEP_EXPIRE_SECONDS`, ⛔ the daily
      `console.info` summary on every tick) sharing the extracted START with the 10:00 sweep (⛔ `advance`); a child per ladder
      (`singletonKey '<ladderId>:wa'`) with the stale-window guard; the RLS-bound-role refusal (6.37c T24); reading `pariwar_wa_config`
      (granted to `twt_app` only — the Row 26 note).
- [ ] **Task 7 — The webhook worker (AC6, AC7; WS10, WS11).** The RLS-bound-role refusal; the claim branch inside
      `withPariwarScope(event.pariwarId)`; STOP ⇒ the claim stop in the `claim_contact_mobile` hash space (deps gain the KEK ref) + its own
      audit action (+ the member path as today); the status branch by claim wamid ⇒ `delivered_at` / `failed_at`, member revoke skipped;
      `normalizeMobile` byte-identical (a parity test pins it — `apps/api/tests/unit/member-auth-primitives.test.ts` ↔
      `apps/jobs/tests/wa-webhook-processor.test.ts`); legs (a)–(c) and both status legs.
- [ ] **Task 8 — Staff view (AC9; WS13).** `LadderViewFact` / `ladderFollowUpOf` → `delivered_by`; contracts + lockstep; api DTO mapper;
      `ContactLadderLines.tsx` + i18n-en.
- [ ] **Task 9 — Alarms and fences (AC11, AC12; WS14 (ii)).** Log lines; the symbol fence (I5); the untouched-path diffs; `ci:local` on
      :5433; the gates.
- [ ] **Task 10 — Records and close (AC10).** ADR-0042 and ADR-0029 dated notes; the Panel "told" item WRITTEN (the forgery bound's
      widening — ⛔ told until sent); deferred-work dispositions with their status words
      ([[feedback_closure_language_precision]]); Debug Log, Completion Notes, File List; status + sprint row → `review`; ledger.

## Dev Notes

### TRAPS

- **T1 — Numbers race.** 6.31 (unmerged, planning stale 0167 / `-347` / Row 33) will take the next free decision id, roster row and
  migration too. Re-grep `main`, the 6.31 branch and every worktree at Task 0.1 AND before the migration commit.
- **T2 — The fixture lies.** `fixture-whatsapp.ts` reports `accepted` with `providerMessageId: 'fixture-whatsapp'` — a step "sent"
  that never went. ⛔ Any path to it (I5).
- **T3 — `pending` used to be impossible to move.** 0169 made `whatsapp_step` identity (F2); the spec asserts 42501 on its UPDATE. Flip
  the spec deliberately and add the "only from pending" trigger leg — ⛔ delete the old assertion silently.
- **T4 — KMS per HMAC.** One audit line per HMAC under a global lock ([[project_kms_audit_per_hmac_global_lock]]); a quarter-hourly
  sweep that reused the 14-day candidate set would multiply that ≈ 44×/day (`planCertificateLadders` hashes every person of every
  candidate claim on every run). The sweep selects by SQL only and starts ONLY for new reports (AC4) — the certificate start's per-person
  hashing is then paid once per new report. The CORRECTION WhatsApp child hashes ONE number; the CERTIFICATE child hashes every person once
  before the lock (`certificateLadderStopReason` needs all of them — as the certificate SMS child already does). The STOP path pays ONE
  `correctionNumberHash` per inbound STOP.
- **T5 — The anchor.** `created_at` of the ORIGIN row (never moves; `readLadderOriginCreatedAt` already reads it). ⛔ `claimed_at` — it is
  RE-SET on every re-claim (own retry or an expired lease — `correction-reminder-record.ts` / `certificate-reminder-record.ts`), so it is
  the latest attempt's time; ⛔ `updated_at` (finalise moves it); ⛔ `sent_on` (a date). Live fixtures seed `created_at` explicitly.
- **T6 — The import direction.** `packages/domain` / `apps/jobs` cannot import `apps/api`; the registry lives in domain and the api
  re-exports. ⚠ A type-only → value import can materialise a runtime cycle ([[project_type_only_import_cycle_trap]]).
- **T7 — Fixtures without a version.** Many fixtures seed `consent_payload` without `copyVersion`; the reader treats them as the OLD
  wording (correct). Live legs that need an eligible claimant must seed v2's id explicitly — ⛔ loosen the reader.
- **T8 — Two languages, two reviews (and the DLT gate).** The agreement's Hindi (Row 35 (a)) and the certificate reminder's Hindi (Row 21) are separate
  reviews; the WhatsApp templates copy the SMS words byte for byte — a later change to an SMS text must re-submit BOTH its DLT and its Meta
  template.
- **T9 — Meta language codes.** `en`, `hi` (6.31 WR6), ⛔ `en_US`; a template approved in one language is ⛔ approved in the other.
- **T10 — Scope-wide refusals.** `template_not_approved` (132xxx) / `auth` are Pariwar-wide; record + alarm, ⛔ retry every ladder
  (the next ladders will skip on the same refusal — the alarm is the signal).
- **T11 — `may_have_sent` is final.** Status 0 or a 2xx without a wamid ⇒ ⛔ resend (I4); the step stays `sent`.
- **T12 — The window is IST.** Reuse `isInPeerRequestSendWindow` / `nextPeerRequestSendWindowStart` — ⛔ a second window, ⛔ `new Date().getHours()`.
  They live in `apps/jobs/src/scheduler/claim-peer-mesh-requests.ts` — the pure domain gate takes their results as inputs (T6).
- **T13 — One start path.** The quarter-hourly sweep and the 10:00 sweep must call the SAME start function under the SAME chase lock
  (`acquireCorrectionChaseLock` / `lockCertificateClaim`) — a copy drifts; two starts for one origin are ALREADY absorbed
  (`insertContactLadder` is `.onConflictDoNothing()` on `claim_contact_ladders_origin_uq` and the plan `continue`s) — keep it so. The
  quarter-hourly path calls the START only, ⛔ `advance` (F18).
- **T14 — The claimant-nominee number.** For a claimant-nominee the ladder's number is the NOMINEE record's mobile (F17) — the
  WhatsApp goes to the number whose SMS failed, ⛔ a `claim_contacts` claimant mobile.
- **T15 — Status before send row commit.** A status webhook could in theory be processed before the child's finalise writes the wamid;
  the worker finds no claim row ⇒ treats it as a member wamid (a BLOCK code for an opted-in member WOULD revoke). Write the wamid in the
  same statement that records `accepted`; if a guard is added, it compares in the CLAIM hash space —
  `correctionNumberHash(status.recipient_id, event.pariwarId)` against `claim_contact_wa_sends` rows `attempting` in the last few minutes
  (⛔ the worker's member blind index — a different space, never equal); or argue in the Debug Log why the race is closed (the worker's
  one-minute cron vs the child's commit).
- **T16 — The drain is at-most-once (F8).** ⛔ Promise "ever delivered" beyond what arrives; disclose (AC10).
- **T17 — The agreement payload's locale ≠ the claim's contact locale.** I2's Hindi check reads the AGREEMENT's locale (the text the
  claimant saw); the template language is the claim's `contactLocale` (the language they are written to) — two fields, keep both.
- **T18 — Prettier is not enforced** — hand-format; ⛔ `--write` whole files ([[project_prettier_not_enforced]]).
- **T19 — JSDoc emphasis.** `**cl.3**`-style emphasis inside a JSDoc can close it (`**/`) ([[project_markdown_emphasis_closes_jsdoc]]).
- **T20 — Data export.** If any new table is added to a member's data export, its contract field is needed or EVERY export fails
  ([[project_data_export_sections_strict_parsed]]); recommended: ⛔ add (claim-scoped, as 6.37c's ladders are — verify at Task 3).
- **T21 — Hash spaces.** The ladder, its send rows and the new stop table use `claim_contact_mobile` (`correctionNumberHash`); the WhatsApp
  worker and opt-ins use `member_mobile` (`memberMobileBlindIndex`, the login key). ⛔ Ever compare across them; ⛔ store the member index
  on a claim row.

### Reuse map

| Need | Reuse | ⛔ Rebuild |
|---|---|---|
| Ladder start / lock | 6.37c's start part of `planCorrectionLadders` / `planCertificateLadders` (extracted) | a second start |
| Horizon / pause | `ladderStepGate`'s rules | a WhatsApp horizon |
| Window | `isInPeerRequestSendWindow` / `nextPeerRequestSendWindowStart` | a new window |
| WA client / cache / secret | 6.31's (WS1) | a second `createWhatsappAppCache()` |
| Outcome classes | `classifyWhatsappError` + 6.31's rules | new code maps |
| STOP keywords / number hash | the worker's `isStopKeyword`; `normalizeMobile` + `correctionNumberHash` (the claim hash space — T21; the member path keeps `memberMobileBlindIndex`) | a second keyword list |
| Number / locale | the chase recipient readers, `resolveCorrectionMobile`, `correctionNumberHash` (both chases use them) | a new decrypt path |
| Words | `t('correction_sms.reminder')` / `t('certificate_sms.reminder')` | new copy |

### Testing standards

Unit (vitest) for every pure verdict and order; live on :5433 for the migration, RLS / grants / trigger specs, the sweep + child, the
worker legs; an injected fetch for Meta (⛔ network); a controllable clock (ordering tests in separate transactions —
[[project_db_clock_ordering_tests_tie]]); never regenerate an applied migration ([[project_live_db_test_gotchas]]); push with :5433
explicitly ([[project_prepush_hook_inherits_5432]]).

### Project structure notes

New: the domain agreement registry; `claim_contact_wa_sends` / `claim_contact_wa_stops` schema + policies; the WhatsApp gate in
`contact-ladder.ts` (or a sibling `contact-ladder-whatsapp.ts`); `apps/jobs/src/scheduler/claim-contact-wa-templates.ts` and the
WhatsApp sweep / child (in `claim-contact-ladder.ts` or a sibling — keep the 1,288-line file from growing past reason). Updated:
`claim-contact-copy.ts`, the two claim.json files, the helpline admin copy, `consent-record.ts`, `claim-contact-check.ts`,
`contact-ladder*.ts`, `correction-closure*.ts` (D22), `wa-webhook-processor.ts`, `packages/queue/src/index.ts`, `boot.ts`, the ladder
DTO / contracts / `ContactLadderLines.tsx`, the ladder policy spec.

### Sequencing

AFTER 6.37c (`done`) and — WS1 (a) — AFTER 6.31 (`done` on `main`). 6.37e (the short-name fallback) touches the suspicion texts only —
⛔ overlap. Row 32 (h) (alarms reach a person) remains 6.37c's go-live condition and governs this story's alarms too.

### Previous story intelligence (6.37c)

- Review the fix diff before committing ([[feedback_review_the_fix_diff_before_commit]]) — 6.37c's round 2 and its 2nd fix-diff pass
  each found HIGHs (a stranded `attempting` row on a no-number branch; a no-op `ask === 'none'` guard).
- Restore-as-applied + an idempotent forward migration when an applied migration needs a change (0169 → 0170).
- Diff-only review claims were often false — verify against the worktree.
- Load timeouts in integration-tests are known — re-run alone and say so.
- The ladder's step is recorded `sent` at the claim; a refusal at send counts as sent and the ladder runs on — mirror it.

### Git intelligence

The last five commits on `main` are 6.37c's review rounds (`b2aa00ff`, `39b52757`, `cda305df`, `15acb570`) and its dev (`99644db0`):
governance entries committed alone before the patches; migrations 0169 / 0170; tests pinned by policy regression specs.

### Latest tech information

- WhatsApp Cloud API template sends: `POST /{phone-number-id}/messages`, `type: 'template'`, `language.code`, body `parameters`
  positional; the client pins `graph_api_version` per Pariwar (default `v21.0` — check Meta's deprecation calendar at Task 5).
- Opt-in (F23): affirmative action + WhatsApp named + business named; UTILITY for transactional reminders; Meta's quality rating can
  restrict a number that messages people who report spam — a reason for WS10's strict STOP.

### References

- `_bmad-output/implementation-artifacts/6-37c-undelivered-reminder-ladder.md` (LD1, F19–F21, LD2–LD5, LD17, T11, Sequencing)
- `/Users/dev/Developer/projects/TWT/.claude/worktrees/6-31/_bmad-output/implementation-artifacts/6-31-peer-mesh-whatsapp-reminder-at-48-hours.md`
  (WR6–WR10 — unmerged branch)
- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-10-17-whatsapp-claim-contact.md` (§3, G3); `panel-pack-2026-10-17-6-37c.md` item 1
- `_bmad-output/planning-artifacts/architecture.md` §3.4 (the claim-contact exception bullet; Opt-in withdrawal; the dual gate)
- `docs/adr/ADR-0029-whatsapp-webhook-ingress-and-opt-in-lifecycle.md` (§2, §3, Changelog 2026-10-18); `docs/adr/ADR-0042-*` (dated note)
- `_bmad-output/planning-artifacts/counsel-question-2026-10-18-nominee-contact-basis.md` (questions 1, 3, 5)
- `docs/launch-gate-inventory/inventory-roster.md` Rows 18, 21, 32, 34
- Decisions `-250`, `-350`, `-351`, `-352`, `-354`, `-355`, `-356`, `-357`, `-360`, `-363`
- [Meta — Get opt-in for WhatsApp](https://developers.facebook.com/documentation/business-messaging/whatsapp/getting-opt-in)

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

- Story created by `bmad-create-story 6.37d` (2026-10-19) — ultimate context engine analysis completed - comprehensive developer guide created. Four parallel read-only research passes (the governance spine; 6.37c's ladder code; the WhatsApp substrate and the 6.31 branch; the filing agreement).

### File List

## Change Log

- v1.0 (2026-10-19) — created by `bmad-create-story 6.37d` at `15acb570`; WS1–WS14 proposed, PQ1–PQ2 candidate; status `ready-for-dev`.
- v1.1 (2026-10-19) — the create-story's own checklist pass (one fresh-context validator, read-only: 7 HIGH / 12 MEDIUM / 5 LOW, all applied): the STOP key moved to the ladder's `claim_contact_mobile` hash space (⛔ the member login key); the webhook worker's claim branch scoped to the event's Pariwar behind the RLS-bound-role refusal; the quarter-hourly sweep starts ladders only for NEW reports and ⛔ calls `advance`; the 4 h anchor = the origin's `created_at` (⛔ `claimed_at`, re-set on retry); `isClaimant` on both person types (the certificate reader is shaped differently); AC2's fence narrowed to the agreement-state gate; D22 is correction-only and the post-conclusion case decided in WS12; WS12 flagged against `-360` Q1 A; `-355` d3 superseded in part; ADR-0029 / Row 19 / Row 26 notes; grants bind `twt_app` only — triggers are the jobs controls; counsel question 3's two halves; the gate list corrected.
