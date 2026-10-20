---
baseline_commit: 0e88ddd1
---

<!--
PINNED: `0e88ddd1` (2026-10-20 — `main` after `git fetch`; carries ALL of Story 6.37c and ALL of Story 6.31 (`47397e6a`, PR #291,
`done`, both review rounds), ledger `2026-10-19i`). The v1.0 / v1.1 pin `15acb570` is an ancestor (this branch was REBASED onto
`0e88ddd1` at the v1.2 validate; both ledger conflicts kept both sides). Built in its OWN worktree `.claude/worktrees/6-37d`, branch
`story/6-37d-claim-contact-whatsapp-step` ([[feedback_commit_on_story_branch]], [[feedback_shared_tree_branch_switch]]). Two facts,
stated separately: (1) the pin is an ancestor of this branch (durable); (2) every `apps/` / `packages/` / `scripts/` cite below was
re-derived at `0e88ddd1` (perishable — re-check at Task 0.1: `git diff --name-only 0e88ddd1..origin/main -- apps packages scripts`).
Re-locate by FUNCTION, ⛔ by number ([[feedback_story_validate_footguns]] #19, #21, #24).

STATUS: `in-progress` — ⭐ **TASK 0 DONE (2026-10-20):** BigDev answered WS1–WS14 and PQ1–PQ3 (Debug Log (a)); the 6.37d entry is
Decision `2026-10-20-367` (`5ab99fc0`, committed ALONE); the records commit followed (the G3 roster row = **Row 36**, the routing note
`trustee-panel-routing-note-2026-10-20-6-37d-whatsapp-edges.md` WRITTEN, ⛔ sent). ⭐ **Where `-367` changed this file, the `-367`
OUTCOME block below governs** — read it before any WS / AC. Code may start (Tasks 1–10). ⚠ Row 6-37d is ⛔ `done` until the routing
note (PQ2 + the clause) is RULED and the code matches — ⭐ RULED 2026-10-20 by Decision `2026-10-20-368` (Trustee-ratified, Q1 A, Q2 A);
the code must still match. WS1's precondition (row 6-31 `done` on `main`) is MET (F3). GO-LIVE (⛔ a merge or `done` fence — [[project_not_in_production_merge_is_not_golive]]): the
G3 roster Row 36 `claim-contact-claimant-whatsapp-go-live` (WS4); roster Row 32 — ALL its legs, incl. (h) alarms and (i) the claim-text
template ids (6.37c's ladder); Row 33 (MSG91's delivery reports — without a reported `undelivered` ⛔ ladder starts); Row 35 (a) / (e)
(each Pariwar's WhatsApp provisioning and the alarm route — SHARED with 6.31, ⛔ duplicated); Row 21 (the certificate reminder's Hindi,
which its WhatsApp twin inherits).

§0 GATE (the routing template's, applied FIRST — `_bmad-output/planning-artifacts/trustee-panel-routing-note-TEMPLATE.md`): the
BEHAVIOUR is the Panel's and is ALREADY RULED (`-350` ruling 2 (1) the WhatsApp step; `-351` 2 / 4 A the consent and the end rule;
`-352` Q1 B the agreement's channels; `-356` no WhatsApp to a nominee; `-357` the §3.4 claimant exception + G3). Each WS below is the
AUTHOR's — how that ruling is timed, stored, gated, shown to staff, or sequenced. ⚠ SIX WSs have a person-facing half and are FLAGGED
for BigDev's own §0 check at Task 0.2: WS2 (two family-facing lines beyond the agreement), WS3 ("filed under" = the agreement on file),
WS4 (G3 waits for counsel), WS7 (the horizon / pause / window applied to WhatsApp — fewer messages), WS10 (a STOP is honoured
Pariwar-wide — fewer messages), WS12 (a delivered WhatsApp ends the follow-up and counts as reach — beyond `-360` Q1 A's literal *"a
delivered text"*). ⭐ THREE questions look like the PANEL's (PQ1, PQ2, PQ3) — two Trustee-ratified rulings meet at an edge no note put,
or a ratified text assumes a fact the code does not record ([[feedback_panel_gate_read_ratified_verbatim]]). ⛔ No NEW counsel
question: counsel's question 3 (whether the reworded agreement is a sufficient basis for texts, WhatsApp, calls and post to the
claimant, and whether its last clause may stay) is ALREADY written by 6.37c (`counsel-question-2026-10-18-nominee-contact-basis.md`, ⛔
sent) — WS4 makes G3 wait for its answer; ⚠ PQ3 / F25 propose REVISING that question before it is sent (who ticks the box).

GLYPH REGISTER: `⛔` negates the word it precedes; `⭐` emphasis / action; `⚠` a hazard. ⛔ No `file:NNN` into `.decision-log.md`,
`deferred-work.md`, `sprint-status.yaml` or `inventory-roster.md` (newest-first or growing files — footgun #19) — cite the decision id,
the item's phrase, or the row key.

NUMBERS (`-366` decision 6, verbatim: *"the number belongs to the first COMMIT that takes it on any branch; a later branch that planned
the same number takes the next free one at its own commit"*): this file names ⛔ untaken number — ⛔ decision id, ⛔ roster row number,
⛔ migration number, ⛔ ledger letter. Each is "the next free one" at the commit that takes it (Task 0.1 / 0.3 / 0.4 / 3). The G3 row is
named by its KEY `claim-contact-claimant-whatsapp-go-live`, its legs **G3 (a)–(h)**; "Row 35" below ALWAYS means 6.31's
`peer-mesh-wa-reminder-template-approved`.

LETTERS: F = found facts (F1–F25); WS = build decisions (WS1–WS14 — PROPOSED, ⏳ BigDev at Task 0.2); PQ = candidate Panel questions
(PQ1–PQ3); I = invariants (I1–I10); T = traps (T1–T30). Decision-entry letters stay the entry's own (`-350` ruling 2 (1)–(3), `-351`
rulings 1–6, `-352` Q1 / Q2, `-355` decisions 1–18, `-356` calls 1–3, `-363` decisions 1–2, `-365` WR1–WR16, `-366` decisions 1–6;
6.37c's LD1–LD17 are that story's own). G3 is the §3.4 proposal's go-live condition. This story's OWN decision entry is called **"the
6.37d entry"** below — its id is the next free one at Task 0.3.
-->

# Story 6.37d: When a reminder to the claimant is reported undelivered, the Trust tries WhatsApp four hours later — on the claimant's reworded filing agreement `[PRIMITIVE]`

Status: done — code review v1.6/v1.7/v1.8 applied all 9 findings (R1–R9); GO-LIVE still fenced (roster Row 36 etc. — [[project_not_in_production_merge_is_not_golive]])

> ## ⭐ `-367` OUTCOME — Task 0, 2026-10-20 (governs every earlier sentence it contradicts; the text below is kept as PROPOSED, ⛔ edited)
>
> - **WS1–WS14: ALL AS RECOMMENDED** (BigDev: *"accept all recommended"*), with: **WS3** — BigDev's note *"code is not in production"*
>   (⛔ production claim exists on any wording; the re-save widening touches test data only until go-live). **WS4** — option (a) **without
>   G3 (c)** (*"drop G3 (c)"*, *"Drop entirely, disclose"*): ⛔ go-live leg records the four templates' UTILITY approval or a 12-hour
>   time-to-live — an ACCEPTED, disclosed risk (Row 36 notes; deferred-work). The G3 row is **Row 36**; its legs are (a), (b), (d)–(h).
> - **WS2's v2 English (decided — `-367` decision 2):** *"I agree that the Trust may contact me by text message, WhatsApp, phone call or
>   post, about this claim."* — FIRST person, WITHOUT *"or any other means of communication that may appear in future"* (routed —
>   below). `contact.agreement_required` → *"… so that we can contact you about this claim"*; `helpline.contact.duty` → the caller as the
>   claimant. If the Panel KEEPS the clause, a v3 restores it before *"about this claim"*.
> - **PQ1 — the author's, reading A** (*"Mine — reading A"*): a nominee who is the claimant is reached as the claimant (WS5 as written).
> - **PQ2 — ROUTED to the Panel** (*"Route to the Panel"*) in `trustee-panel-routing-note-2026-10-20-6-37d-whatsapp-edges.md` (WRITTEN, ⛔
>   sent), with the clause drop and, for information, the first-person wording. Build WS6 (reading A) meanwhile.
> - **PQ3 — DISSOLVED** (`-367` decision 17): BigDev — *"claimant is anyone who files for claim, whether the person is nominee or
>   relative"* (the Panel's own words in `-351` 2: *"when a claimant files a claim, he/she will be asked to agree"*). The person who ticks
>   IS the claimant ⇒ Meta's *"opt-in permission from the recipient"* and DPDPA §6(1) are met by the tick. **F25's premise is WITHDRAWN**;
>   ⛔ "who agreed" question, ⛔ IVR, ⛔ counsel revision (BigDev: *"Isn't Meta policy clear enough?"*).
> - **The clause *"or any other means …"* — DROP, ROUTED** (`-367` decision 18 — it is part of `-352` Q1 B's ratified wording, and §3 item
>   2's pre-cleared path needs counsel's advice, ⛔ sought).
> - **DPDPA §6(4) withdrawal and §5 notice — DEFERRED, a RISK** (`-367` decision 19; *"Defer, record as risk"*): two deferred-work items;
>   ⛔ a Row 36 leg; to close before 13 May 2027 (computed).
> - **Supersedes** `-355` d3 IN PART; **narrows** `-365` Consequence 2 for this row (WS8 / WS9's named divergences).
> - ⭐⭐ **RULED 2026-10-20 — Decision `2026-10-20-368` (Trustee-ratified, DR + KB: *"Q1 A, Q2 A"*):** Q1 A — the WhatsApp goes about four
>   hours after the failed text, between 9 am and 8 pm (a later failure waits for 9 am) — WS6 as written now stands on a ruling
>   (supersedes `-250` #5's 10:00 hour for this one step only); Q2 A — *"or any other means of communication that may appear in future"*
>   is REMOVED (supersedes `-352` Q1 B in part): v2 (first person, without the clause) is FINAL, the v3 contingency is MOOT. The
>   first-person sentence was shown for information and drew no objection (it stays the author's wording). Counsel's question 3 now asks
>   sufficiency only (Row 36 (b)).

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
> staff view says which channel got through; (6) the go-live roster row `claim-contact-claimant-whatsapp-go-live` carries G3. ⛔ WhatsApp
> to a nominee (`-356`). ⛔ A second SMS, a
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
- Story 6.31's direct WhatsApp send (SHIPPED, `47397e6a`; decided by `-365` WR7–WR10, amended / corrected by `-366`; `-365`
  Consequence 2: *"Row 6-37d builds on WR7–WR10 as decided here"* — details F3): the multi-value + timeout client (`bodyParams`,
  `WhatsappSendOptions.timeoutMs`, `WhatsappSendError.transport`, `WhatsappTemplateParamError`), the ONE `whatsappAppCache` on
  `ContributionProviderWiring`, the exported `resolveChannelSecret`, the exported classifier `classifyDirectWaSendFailure`, the template-name
  key builder `waTemplateConfigKey` / `WaTemplatePurpose`, the template-copy file + real-`t()` lockstep test pattern
  (`peer-mesh-wa-templates.ts`), and the once-ever send record with its in-flight marker (`packages/domain/src/claim/peer-mesh-wa-reminder.ts`,
  migration `0171_peer-mesh-wa-reminders.sql`) — the MODEL for this story's send record (WS8).

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
| `-355` decision 1 / 3 / 4 / 16 | d1: *"A NEW row `6-37d-claim-contact-whatsapp-step` (`backlog`; after 6.31 and 6-37c) builds the WhatsApp step, the filing agreement's `-352` Q1 wording (a bumped copy version and a version-aware reader — G3), the nominees' removal from that wording (the rewording only — decision 16), the Meta-approved claim-contact templates, a direct non-member sender, a sub-daily step, claim-contact STOP, an absorbing "ever delivered" read, the member-opt-in side-effect isolation, …"* · d3: *"Steps are IST dates on the chases' 10:00 run …"* (our reading, ⛔ ratified) · d4: *"On a day a scheduled reminder is due to that number, that reminder IS the step"* · d16: *"nothing a nominee receives changes until counsel answers; 6-37d keeps only the rewording."* | author-commit ⇒ d3 superseded IN PART (WS6); ⚠ d1's elided "…" also lists a nominee-WhatsApp half that `-356` (ratified) dropped |
| `-259` | the certificate chase's 10:00 hour — ⚠ a NOT-RATIFIED reading (the correction chase's is `-250` #5's, ratified) | reading ⇒ PQ2 |
| `-356` | *"drop WhatsApp only notification for nominee."* · BigDev's scope (⛔ the Panel's): *"WhatsApp can be in future if nominee has opted to receive the notification, or a case where nominee and claimant is same."* · reading (iii): *"whether it does so for a claimant-nominee is decided at 6-37d's create-story."* | Trustee-ratified ⇒ **PQ1** |
| `-357` | *"Outside the member opt-in flow, WhatsApp may carry messages about a claim — the correction and certificate reminders' delivery ladder — to the CLAIMANT only, on the claim's filing agreement (naming WhatsApp; an explicit affirmative capture recorded per claim, never pre-ticked; withdrawing it, or STOP, ends WhatsApp contact for that claim); no WhatsApp to a nominee under it. Go-live condition **G3**: the claimant's new agreement wording is live (English and reviewed Hindi) before a claimant receives WhatsApp on it; a claim filed under the old wording keeps SMS, calls and post only."* | Trustee-ratified |
| Proposal §3 / G3 (approved *"as presented"*) | G3 *"… (English and reviewed Hindi, **as counsel settles its last clause**) …"* · §3 item 2 *"If counsel advises removing … the production wording omits it … and the Panel is told; no further ruling is needed for that narrowing."* · item 4 *"STOP is honoured and audit-logged; every claim-contact WhatsApp message uses a Meta-approved template."* | approved by `-357` ⇒ WS4 |
| Architecture §3.4 (claim-contact exception bullet) | *"The exception does not change any member's opt-in state and opens WhatsApp to no other surface; the Pariwar's WA toggle and number, Meta-approved templates, and STOP handling apply unchanged."* · §3.4 dual gate: *"Scope: Meta UTILITY templates only"*. | ratified + amended (`-357`) |
| `-360` Q1 / Q2 / Q3 | Q1 A *"Only a delivered text or a call that reaches the family ends the follow-up."* · Q2 A *"Each chase on its own."* · Q3 A *"No follow-up text after day 90 / day 180 or during a pause; the follow-up still runs its days, ends, and asks for a call or a letter."* · told: *"no WhatsApp yet (claimant only, row 6-37d)"* and the 10:00 days | Trustee-ratified ⇒ WS7, WS12 (flagged) |
| `-363` d1 | A reached call answers the ask only when *"`called_on` is on or after the `origin_sent_on` of the person's concluded ladder"*. | author-commit (unchanged here) |
| `-364` (option A) | A member's WhatsApp yes lasts until the member takes it back (in the app, or by STOP), after four conditions — incl. (3) *"STOP always works — today a STOP from a member past the 24 hours is ignored"* and (4) a withdrawal ends every earlier yes; built by row `5-12-whatsapp-yes-lasts-until-withdrawn` (backlog). Its reading (i) (⛔ ratified): *"it does ⛔ touch the claimant's WhatsApp on the filing agreement (`-357`, its own basis) or a nominee (`-356`)"*. | Trustee-ratified ⇒ ⛔ gates this story; row 5-12 edits the SAME STOP / block branches (Sequencing, AC7) |
| 6.31's routing note `trustee-panel-routing-note-2026-10-17-6-31-how-long-a-whatsapp-yes-lasts.md` (sent and ruled 2026-10-19 ⇒ `-364`), fact (1) | The Panel was TOLD, as fact: *"we read it [the claimant's yes] as lasting until withdrawn, for that claim only."* | told, ⛔ ruled — MATCHES I2 (the agreement read at send time); WS10's Pariwar-wide STOP is stricter than *"for that claim"* (flagged) |
| `-365` WR7 / WR10 / Consequence 2 | WR7: *"`wa.template.<purpose>.<locale>.<pariwarId>` (purpose `peer_mesh.reminder`; row 6-37d reuses the family); unset ⇒ HOLD; an unreadable key ⇒ HOLD with one alarm."* · WR10: the classifier; *"any other refusal (incl. 131008 / 131009) ⇒ park and CONTINUE"* · Consequence 2: *"Row 6-37d builds on WR7–WR10 as decided here."* | author-commit ⇒ BINDS; every divergence NAMED in WS8 / WS9 and recorded by the 6.37d entry as narrowing Consequence 2 for this row (⛔ a re-reading) |
| `-366` d1 / d2 / d6 | d1: *"A fetch that fails BEFORE a connection to Meta opens … proves the request never left … `classifyDirectWaSendFailure` returns `transient` … Every OTHER thrown fetch … stays `may_have_sent` — ⛔ resent … Row 6-37d inherits the classifier with this rule."* · d2: *"0 a parameter error ⇒ park; 1 may have reached Meta ⇒ `error`; 2 a 502 / 504 ⇒ `error`; 4 the account-wide codes and classes AND 401 / 403 — tested BEFORE the status test …; 5 the recipient codes; 3 a 429, a rate-limit code or another 5xx ⇒ retried; 6 any other refusal ⇒ park and continue. Row 6-37d reads THIS order."* · d6: the numbering rule (header). | author-commit ⇒ BINDS (F3, WS8, the header) |
| ADR-0042 (ratified, `-358` — *"ADR-0042's forgery bound as restated for the delivery ladder"*) + its 2026-10-18 dated note | the forgery bound restated *"(no WhatsApp — row 6-37c skips that step)"* | ⚠ becomes FALSE once this ships ⇒ WS14 |
| ADR-0029 §2 (ratified, `-065`) + its two 2026-10-19 changelog rows (`-364` "ratified — amended"; `-365` the reminder reads the dual gate) | the worker: *"STOP → REVOKED, Meta block/opt-out status → BLOCKED_BY_META, and message-status callbacks → … `upsertWaSendStatus`"* | ratified ⇒ WS10 / WS11 change it for CLAIM sends ⇒ a dated changelog row (WS14) |
| ADR-0028 + its 2026-10-19 dated row (`-365`: 6.31 a *"second, DIRECT caller"*) | the alert cascade is the one WhatsApp path | this story is a THIRD direct caller ⇒ a dated row (WS14) |
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
- **I4 — Once.** At most ONE send row per ladder (a DB UNIQUE on the ladder, ⛔ only code); ⛔ a resend on a may-have-sent; a second
  MESSAGE is possible only under `-366` d2's taxonomy, as
  6.31 inherits it: a post-send 429 / rate-limit code / other 5xx (⛔ 502 / 504) is treated as unsent and retried, and a 500 / 503 is ⛔
  PROVABLY unsent — a second message after one Meta acted on is possible there (disclosed; an AC10 deferred item). ⛔ A
  WhatsApp for a ladder SMS (step 2 / 3) — only step 1 is WhatsApp.
- **I5 — Directly, never the cascade.** ⛔ `dispatch()`, `runChannelCascade`, `resolveWhatsappProviderDeps`,
  `createContributionProviderResolver`, `resolveApprovedTemplate`, `AlertCategory`, `pariwar_wa_templates`, `sendClaimDltSms`,
  `smsAppClient`, the WhatsApp fixture provider `createFixtureWhatsappProvider` (it reports `accepted` — a step "sent" that never went),
  and a second `createWhatsappAppCache(` (the ONE cache is `ContributionProviderWiring.whatsappAppCache`). A WhatsApp refusal ⛔ falls
  back to an SMS (the ladder's own SMS steps are the fallback).
- **I6 — The words.** The WhatsApp body is the SAME words as the reminder that failed (`correction_sms.reminder` /
  `certificate_sms.reminder`), in the claim's contact locale, through a Meta-approved UTILITY template. The agreement copy version keeps
  the `pending-story-0.13` marker until counsel's approved text replaces it (Row 18). ⛔ A new SMS text, ⛔ a new DLT template.
- **I7 — Member opt-in untouched by a claim send.** A claim-contact send, its status callbacks, and its absence ⛔ ever move a
  `member_wa_opt_in` row or a `whatsapp_opt_in` consent (§3.4 exception). (A person's OWN STOP keeps today's member behaviour — WS10.)
- **I8 — STOP ends it.** A STOP from a number ends claim WhatsApp to that number from the Pariwar whose WhatsApp number received it
  (WS10 — the hash key is per Pariwar) — recorded in the ladder's OWN hash space (`claim_contact_mobile`, ⛔ the member login key —
  field-classes.ts keeps the two disjoint on purpose); audit-logged; the step records a skip, the ladder runs on with its SMS steps.
- **I9 — The SMS ladder is unchanged.** SMS 2 / SMS 3 dates, the one-text-a-day rule (LD4), the conclusion, the B1 mapping, the escalation,
  the call record, the nominees' texts and letters (`-355` d16) — ⛔ moved, except: a delivered WhatsApp ENDS a ladder and counts as reach
  (`-351` 4 A — AC6).
- **I10 — Fail closed, never stall, never silent.** Anything unknown at the WhatsApp step (config, template name, version, number, STOP
  lookup) ⇒ the step records a `skipped:<reason>` and the ladder goes on to SMS 2; ⛔ a held ladder, ⛔ a WhatsApp "to be safe". A skip
  caused by a FAULT (an unreadable config / template-name key / token secret, a malformed template name, an unreadable helpline, a
  number that cannot be decrypted or hashed on the final attempt) also raises an alarm
  (WS14 (ii)) — ⛔ a once-only step spent silently on an outage. (A divergence from `-365` WR7's *"HOLD"*, named in WS9.)

## 📜 Policy meaning (AI-10-1)

**This story CHANGES a predicate that gates a family's benefit** — D22, what counts as reaching a person before a claim may be closed for
silence: a delivered claim WhatsApp becomes a reach (`reachedByLadderWhatsapp`, standing on its OWN send row — WS12), and it ends the
ladder that was holding the closure.
In the family's terms: ⭐ *"If you agreed to WhatsApp when the claim was filed and the phone network reports that a reminder text never
reached you, the Trust sends you the same reminder on WhatsApp about four hours after the text was sent (in the daytime); if that
WhatsApp is delivered, you count as having been told — the same as if the text had arrived — and the follow-up texts stop (the regular
reminders carry on); if you reply STOP, no more WhatsApp messages about claims go to that number from that Pariwar."* Its cost to the
family: a claim can be closed for silence SOONER. The follow-up that was holding the closure (up to eight days — SMS 2 at origin + 2, SMS
3 two days later, the conclusion four days after that) ends on the delivered WhatsApp; and where EVERY text to the claimant fails, the
claim no longer has to wait for a District Admin's call that reaches the family or a delivered letter before the claimant counts as told
— under 6.37c a concluded ladder maps those texts to unreachable (the B1 mapping) and only a call or a letter could reach them. What it
does ⛔ mean: a WhatsApp that was only SENT (no delivered report) does ⛔ count; a nominee gets ⛔ WhatsApp; a claim on the old agreement
gets ⛔ WhatsApp.
**Niyamavali check:** ⛔ applicable — the Niyamavali (`packages/domain/seed/niyamavali-v1-clauses.sql`) does not speak to how a reminder
is delivered or by which channel, and it is ⛔ ratified ([[feedback_niyamavali_rulebook_not_spec]]). ⚠ Checked against `-350` ruling 2
(1) / `-351` 1, 2, 4 / `-352` Q1 / `-356` / `-357` / `-360` Q1–Q3 / `-250` #5 / `-364` VERBATIM (the table above), each line MATCH /
NARROW / WIDEN:
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
- STOP honoured Pariwar-wide (every claim of the Pariwar whose WhatsApp number received it) — NARROWS-to-stricter `-357`'s *"for that
  claim"* (WS10, flagged — fewer messages);
- the agreement's tick counted as the CLAIMANT's opt-in when the filer or helpline caller may be someone else — ⚠ an ASSUMPTION every
  ratified text makes and the code does ⛔ record (F25) ⇒ **PQ3**;
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
- **F3 — 6.31 SHIPPED (`47397e6a`, `done` on `main`; `-365` WR7–WR10 as amended / corrected by `-366`).** What exists, ⭐ reuse it:
  (i) **the client** `packages/channels/src/providers/whatsapp-app.ts` — `WhatsappTemplateMessage` is a union of the single-value
  `{ to, templateName, languageCode, bodyParam }` and `{ …, bodyParams: readonly string[] }` (1–`WHATSAPP_MAX_BODY_PARAMS` = 3 values,
  each non-blank, checked BEFORE the fetch — a bad value throws `WhatsappTemplateParamError`); `send(message, options?:
  WhatsappSendOptions { timeoutMs? })`; `WhatsappSendError(message, metaCode, httpStatus, transport?: 'timeout' | 'connect' |
  'network')` with `WHATSAPP_PRE_CONNECT_CODES` (`ENOTFOUND`, `EAI_AGAIN`, `ECONNREFUSED`, `UND_ERR_CONNECT_TIMEOUT` ⇒ `connect`) — all
  exported from `@twt/channels`. (ii) **The cache and secret** — `ContributionProviderWiring.whatsappAppCache` (*"THE one per-process
  cache"*) and the EXPORTED `resolveChannelSecret` (`apps/jobs/src/scheduler/contribution-providers.ts`); `boot.ts` passes
  `whatsappAppCache`, `resolveSecret: resolveChannelSecret`, `resolveConfig: resolveSmsDltConfig` to
  `registerClaimPeerMeshWaReminderWorkers`. (iii) **The classifier** `classifyDirectWaSendFailure(err): DirectWaSendFailure`
  (`packages/channels/src/providers/whatsapp-direct-send-outcome.ts` — pure, ⛔ context, ⛔ peer-mesh specifics; its header: *"6.37d records
  its own way"*). FIVE kinds, in `-366` d2's order: a `WhatsappTemplateParamError` ⇒ `unknown_scope` (`param_invalid` — nothing sent);
  status 0 with `transport: 'connect'` ⇒ **`transient`** `api_unavailable:000` (`-366` d1); any other status 0, a non-`WhatsappSendError`
  throw, a 2xx without a wamid ⇒ `may_have_sent` (`network` / `timeout` / `unknown` / `no_wamid`); 502 / 504 ⇒ `may_have_sent`
  (`gateway_502` / `gateway_504`); `DIRECT_WA_SCOPE_CODES` {131048, 131031, 131042, 131045, 131057, 133010, 368}, the classes
  `template_not_approved` / `auth` (every 132000–132999 is `template_not_approved` in `classifyWhatsappError`) and 401 / 403 ⇒
  `scope` — tested BEFORE any status (131048 arrives on a 429, 131057 on a 503);
  `DIRECT_WA_RECIPIENT_CODES` {131026, 131021} ONLY ⇒ `recipient`; a 429, `DIRECT_WA_RATE_LIMIT_CODES` {130429, 131056, 80007} or another
  5xx ⇒ `transient` (`rate_limited:<code|none>` / `api_unavailable:<status>`); anything else (incl. 131008 / 131009) ⇒
  `unknown_scope`. (iv) **The template-name key** `waTemplateConfigKey(purpose, locale, pariwarId)`
  (`apps/jobs/src/scheduler/wa-template-config-key.ts`) ⇒ `wa.template.<purpose>.<locale>.<pariwarid lower-cased>`, read through
  `resolveSmsDltConfig` (`null` = not provisioned; a throw = an outage); `WaTemplatePurpose = 'peer_mesh.reminder'` is a CLOSED union whose
  doc-block reads *"Row 6-37d adds `claim_contact.correction_reminder` / `…certificate_reminder`"*; the VALUE must match 6.31's
  module-private `TEMPLATE_NAME_FORM` `^[a-z0-9_]{1,512}$` (and 0171's `template_name` CHECK). (v) **The copy pattern**
  `apps/jobs/src/scheduler/peer-mesh-wa-templates.ts` (body per locale + `{ en: 'en', hi: 'hi' }`) and its real-`t()` lockstep
  `apps/jobs/tests/peer-mesh-wa-templates.test.ts`. (vi) **The once-ever send record** `packages/domain/src/claim/peer-mesh-wa-reminder.ts`
  + `0171_peer-mesh-wa-reminders.sql`: begin under a lock; an in-flight marker `send_started_at` set by its OWN committed CAS
  immediately before Meta (`markPeerMeshWaReminderInFlight` ⇒ `'marked' | 'late' | 'lost'`, lease margin on the child's clock — `-366`
  d4 (a)); CHECKs tying the marker to each outcome; a trigger refusing a re-stamp and freezing every delivery column once the row is no
  longer `attempting`; a transient note CAS'd on the marker (pre-send: marker unset; post-send: marker set — `-366` d4 (b), round-2 P2);
  `finishLapsedInFlightPeerMeshWaReminders` (a lapsed MARKED row ⇒ `may_have_sent:lease_lapsed`, ⛔ re-claimed; an unmarked one is
  re-claimable); `finishPeerMeshWaReminderNoSendableNumber`; the window re-checked at begin, at the marker and after the marker commits
  (`claim-peer-mesh-wa-reminders.ts`); the detail grammar `isPeerMeshWaReminderDetail` (⛔ a 7-digit run). (vii) **Gaps that alarm**
  (6.31 Debug Log): `config:wa_template_invalid:<locale>`, `config:helpline_unreadable`. 6.31's own record PARKS a refusal of unknown
  scope (WR10) and HOLDS on an unset name (WR7) — this story cannot wait (a ladder runs on), so it diverges, NAMED in WS8 / WS9.
- **F4 — The reminder texts and Meta's template rules.** The two values (`{reference}`, `{helpline}`) go through `bodyParams` (F3 (i)).
  All four bodies START with a word (*"Claim"* / *"दावा"*) and END with words (*"Your claim is still open."* / *"आपका दावा अब भी खुला
  है।"*), the two variables are ⛔ adjacent ⇒ Meta's *"Leading or trailing parameters not allowed"* (2388299) is ⛔ hit (unlike 6.31's
  English body, which ends `{{3}}.`) — "the same words" (I6) is satisfiable with `{{1}}` / `{{2}}`. ⚠ A parameter VALUE with a newline,
  a tab or 4+ spaces is refused (third-party documented, ⛔ Meta's own page) — the helpline config value is the exposed one (deferred
  W9, T27).
- **F5 — No non-member path.** The live WhatsApp call sites are member-gated: the alert path (`contribution-notify.ts` →
  `notifications.resolveWaTarget`, `packages/domain/src/notifications/delivery.ts`: Pariwar toggle → `isOptInActive` →
  `member_identities`) and 6.31's direct reminder (`isPeerMeshWaReminderOptedIn` — its recipients are opted-in members). `dispatch()`
  takes an `Alert` whose `member_id` is mandatory and whose ladder falls back WhatsApp → SMS (`cascade.ts`). This story is the FIRST
  non-member WhatsApp send.
- **F6 — No alert template store fits.** `pariwar_wa_templates` (0038) is `UNIQUE(pariwar_id, alert_category)` with a CHECK on the nine
  `AlertCategory` values, one `language_code` per row (⛔ en / hi split); approval is an operator attestation. The template NAME store is
  6.31's key family (F3 (iv)).
- **F7 — The config gate.** `getWaConfig(db, pariwarId)` (`pariwar_wa_config`: `enabled` DEFAULT false, `phone_number_id`,
  `access_token_secret_name`, `graph_api_version` — default `v21.0`, which Meta EXPIRES 2027-01-21); ONE writer
  (`packages/domain/src/channel-config/wa-config.ts`, behind the admin channel-config API) — ⛔ seed or migration enables a Pariwar ⇒ on
  day one ⛔ Pariwar has WhatsApp (Row 35 (a) provisions it). The token resolves via Secret Manager or an env fallback
  (`resolveChannelSecret`, exported — F3 (ii)). ⛔ Production boot check for WhatsApp; an unprovisioned Pariwar falls back to the FIXTURE
  in the dispatch path (I5 forbids it here). ⚠ A dotted Secret Manager name (`wa.template.…`) may be refused `INVALID_ARGUMENT` (GCP ids
  allow letters, digits, `-`, `_` — deferred-work's *"Dotted Secret Manager names (UNVERIFIED)"*); `resolveSmsDltConfig` returns `null`
  ONLY on `NOT_FOUND` and RETHROWS everything else (`INVALID_ARGUMENT` included) ⇒ under WS9's "a throw ⇒ skipped" every claimant's step
  would skip — hence G3 (e) and the fault alarm (I10).
- **F8 — The status store cannot answer "ever delivered".** `whatsapp_send_status` (0039: `wamid` PK, `state`, `meta_status`,
  `updated_at`) is LATEST-WINS (`upsertWaSendStatus`, `onConflictDoUpdate`); `mapMetaStatus`: sent→sent, delivered/read→delivered,
  failed/deleted/blocked→failed, anything else→unknown; ⛔ error codes, ⛔ recipient stored; ⛔ link to any send row; `getWaSendStatus` has ⛔ production caller. The
  webhook drain marks events processed AT CLAIM (`claimUnprocessedWebhookEvents`) — at-most-once ⇒ a crash mid-batch loses a status.
- **F9 — STOP today is member-only.** `wa-webhook-processor.ts`: keywords `['stop','unsubscribe','cancel','बंद','रोको','रोकें']` (whole
  message, NFKC); `memberMobileBlindIndex(from)` → `getActiveOptInByMobile` → `revokeActiveOptIn` (`member.wa_opt_in_revoked`). No
  ACTIVE row ⇒ `continue` (the event is marked processed) ⇒ **a non-member claimant's STOP is LOST today**; an EXPIRED member's too — ⚠
  `-364` condition 3 (*"STOP always works"*) RULES that member half to change, built by row `5-12-whatsapp-yes-lasts-until-withdrawn`
  (backlog; its sprint comment: *"⚠ Shares the STOP path in `wa-webhook-processor.ts` with row 6-37d — sequence them"*). 6.31 did ⛔ change
  this worker. `MetaInboundMessage` does ⛔ parse `context.id`; `MetaChangeValue` carries `messages` / `statuses` only (⛔
  `metadata.phone_number_id`).
- **F10 — The side effect to isolate.** Same worker: a `failed` status whose error code is in `WA_BLOCK_ERROR_CODES` (131050, 131049,
  131026, 131047) ⇒ `getActiveOptInByMobile(status.recipient_id)` ⇒ `revokeActiveOptIn(… 'BLOCKED_BY_META')` — for ANY wamid. A claim send
  that fails 131026 to a claimant who is ALSO an opted-in member would REVOKE their member opt-in (I7). ⚠ deferred-work's item
  *"`WA_BLOCK_ERROR_CODES` revokes a member's WhatsApp consent on signals that are not consent"* (only 131050 is a consent signal; 131026 =
  not on WhatsApp, 131047 = outside the 24 h window, 131049 = Meta's per-user MARKETING cap) has the trigger *"row 5-12 … or the first
  production WhatsApp send"* — this story records these codes on CLAIM rows only and does ⛔ adopt the member mapping; the member side
  stays 5-12's.
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
  and its report lands minutes later for a hard failure — ≈ 4 h later for a phone switched off (MSG91 keeps such a report pending up to
  4 h) ⇒ the earliest a ladder exists today is D + 1 at 10:00 — past hour 4. Send rows carry `created_at`
  (the first claim — ⛔ moves; already read by `readLadderOriginCreatedAt`), `claimed_at` (nullable; RE-SET on every re-claim — own retry
  or an expired lease — ⇒ the LATEST attempt's time), `updated_at` (moves on finalise) and a `sent_on` DATE. ⚠ The start block calls
  `advance` right after the INSERT — the correction plan `advance(started, false)`, the certificate plan `advance(started, await
  stopOf(started.runId, started.personKey))` — a ladder started off-hours would take a due SMS step off the 10:00 hour. Ladder ENDS
  (`ladderEndReason`, the chase stops) are evaluated ONLY by that daily sweep. The delivery report's own times: `sms_send_deliveries`
  `first_reported_at` / `reported_at` (LEAST / GREATEST of the reports' `received_at`; the correlator runs every minute and may correlate
  late) — ⛔ watermark of "the previous tick" exists. Precedents: `'*/15 * * * *'`
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
- **F23 — Meta's rules (web, re-read 2026-10-20).** (i) Opt-in — Meta's *"Get opt-in for WhatsApp"* page
  (developers.facebook.com/documentation/business-messaging/whatsapp/getting-opt-in): *"Businesses must clearly state that a person is
  opting in to receive communication from the business"*, *"Businesses must clearly state the business's name that a person is opting in
  to receive messages from"*, *"Businesses must comply with applicable law"*; the opt-in *"can be general and not specifically for
  WhatsApp"* (naming WhatsApp is §3.4's / `-357`'s requirement, ⛔ Meta's). (ii) The Business Messaging Policy
  (whatsappbusiness.com/policy): *"You may only contact people on WhatsApp if: (a) they have given you their mobile phone number or
  username; and (b) you have received opt-in permission from the recipient …"* ⇒ F25 / PQ3; and *"You must respect all requests (either
  on or off WhatsApp) by a person to block, discontinue, or otherwise opt out of communications from you via WhatsApp"* (also quoted in
  `-364` condition 3) ⇒ T25. (iii) The business named: the agreement says *"the Trust"* (legal name PENDING — ⛔ hard-code a name —
  [[project_legal_name_pending]]), while the message arrives from the PARIWAR's WhatsApp number, whose display name is the Pariwar's ⇒ G3
  (d). (iv) UTILITY fits a reminder about the recipient's own claim (*"clearly related to their … account, services, or transactions"*;
  "Reminders" is Meta's example) and is what §3.4 allows; Meta may re-file a template as MARKETING with one day's notice, effective the
  first of the next month, the template staying `APPROVED` and sendable (a `template_category_update` webhook nobody handles — deferred
  item *"⛔ handling of Meta's `template_category_update` webhook"*) ⇒ G3 (f), WS9. (v) Time-to-live: a utility template's default TTL is
  30 days (settable 30 s – 12 h via `message_send_ttl_seconds`) — a WhatsApp to a switched-off phone could arrive weeks later ⇒ WS9 sets
  12 h. (vi) Pricing per DELIVERED message since 2025-07-01 — a 131026 (not on WhatsApp) costs nothing. (vii) Status webhooks: a message
  delivered and read at once sends `read` WITHOUT `delivered`; Meta's Webhooks overview (⛔ the cited status page) describes retries for up to 7 days — ⚠ UNVERIFIED here; treat duplicates as
  possible either way.
- **F24 — Numbers.** Every number v1.1 planned is TAKEN by 6.31 (`-364`, `-365`, `-366`, Row 35, migration 0171, ledger
  `2026-10-19c`–`i`). Per `-366` d6 (header NUMBERS) this file names ⛔ untaken number; each is taken at its own commit after a re-grep of
  `main`, every branch and every worktree (T1). The migration journal's `when` must exceed the highest on `main` AND every branch.
- **F25 — Who ticks the agreement is ⛔ recorded, and need ⛔ be the claimant.** App: the contact step runs inside `ClaimProxyFlowShell`
  (*"Filing on behalf of [Name]"* — a family member in the deceased member's session, Ravi mode); the person on the device answers *"Is
  the person making this claim one of the nominees?"* (⇒ *"No, someone else"* types the claimant's details) and ticks the box
  (`contact.tsx`). Helpline: the operator reads the text aloud and ticks *"The caller heard this and agreed"*
  (`HelplineClaimContact.tsx`, `apps/admin/src/modules/helpline-claims/i18n-en.ts`) — the caller may be anyone in the family. Persist
  (`claims.contact.handlers.ts`): `subjectId` = the DECEASED member, `grantedViaActor` = `member_self` | `staff_assisted`, payload
  `{ checkboxTextShown, locale, copyVersion }` — ⛔ claimant identity, ⛔ number, ⛔ "the agreeing person is the claimant". `-352`'s
  English is third-person (*"the Trust may contact the claimant named here"*). Every ratified text (`-351` 2, `-357`, §3.4's *"the
  claimant, on the claim's filing agreement"*) ASSUMES the claimant agreed; the counsel question asserts it (*"the person filing (the
  claimant) is asked to tick this agreement"*); Meta's policy requires opt-in *"from the recipient"* (F23 (ii)) ⇒ **PQ3**.
  ⚠ **WITHDRAWN 2026-10-20 (`-367` decision 17):** the facts above hold, the PREMISE does ⛔ — by BigDev's definition the claimant IS the
  person who files the claim (nominee or relative), so the person who ticks is the claimant; the record's subject being the deceased is
  a record-keeping note (the claimant is traceable through `claim_contacts.agreement_consent_id`), ⛔ a consent gap. Kept, ⛔ deleted.

## ⚖️ Build decisions WS1–WS14 (PROPOSED — ⏳ BigDev at Task 0.2)

- **WS1 — Sequencing (`-355` d1: *"AFTER 6.31 and 6-37c"*) — ⭐ PRECONDITION MET (dated 2026-10-20).** Row 6-31 is `done` on `main`
  (`47397e6a`, PR #291, fast-forward; ledger `2026-10-19i`); 6-37c is `done`. v1.1's options (b) split and (c) build the client here are
  MOOT. ⭐ This story REUSES, ⛔ rebuilds, 6.31's shipped shapes (F3) — as `-365` Consequence 2 binds it — and NAMES every divergence
  (WS8, WS9). ⚠ The remaining sequencing question is row `5-12-whatsapp-yes-lasts-until-withdrawn` (backlog), which edits the SAME
  STOP and failed-status branches of `wa-webhook-processor.ts` (F9, F10): ⭐ **(a) Recommended:** this story goes first; its claim branch
  sits BEFORE the member lookup in both branches and is self-contained, so 5-12's later widening of the member half (STOP for an EXPIRED
  member, the block codes) cannot change it; AC7's member legs assert the member path *"as `main` stands at build"*. **Cost:** 5-12 rebases
  over this story's worker edit. **(b)** 5-12 first. **Cost:** this story waits on a backlog row with ⛔ story file.
- **WS2 — The agreement's words, versions and evidence (⚠ flagged: two family-facing lines change beyond the agreement).** ⭐ **(a)
  Recommended:** (i) en `contact.agreement` = `-352`'s recorded English VERBATIM (⚠ DECIDED otherwise by `-367` decision 2 — first person, ⛔ the clause;
  see the `-367` OUTCOME block); hi drafted by the dev from it — WhatsApp written
  **व्हाट्सएप** (the repo's form: `hi/common.json` `waNotifications.*` and `-364`; the one outlier `shepherd.whatsapp` in `hi/claim.json`
  writes व्हाट्सऐप — noted, ⛔ changed here) — and marked ⛔ yet human-reviewed with a `"$comment.contact_agreement"` key in BOTH claim.json
  files (the 6.19b / 6.19d marker pattern), closed by G3 (a); the key is edited IN PLACE (the app shows the current text). (ii) A
  versioned registry in `packages/domain` (domain-importable; `apps/api`'s `claim-contact-copy.ts` re-exports it — T6; the domain declares
  its OWN `'en' | 'hi'` locale type — `packages/domain` has ⛔ `@twt/contracts` dependency, and today's file uses contracts'
  `ClaimContactLocale`): `CLAIM_CONTACT_AGREEMENT_VERSIONS`, each `{ en, hi, namesWhatsapp, hiReviewed }`; v1 = today's two strings
  VERBATIM, `namesWhatsapp: false` (evidence, ⛔ ever edited); v2 = the new text, `namesWhatsapp: true`, `hiReviewed: false`;
  `CLAIM_CONTACT_AGREEMENT_COPY_VERSION` → v2's id `<build date>.v2-pending-story-0.13` (keeps Row 18's marker — I6). A Hindi review that
  CHANGES the words mints v3; one that accepts them flips `hiReviewed` in the G3 (a) closure commit. (iii) `contact.agreement_required`
  (*"… contact these people …"*) and the helpline's `helpline.contact.duty` (`apps/admin/src/modules/helpline-claims/i18n-en.ts`; *"…
  agree that these people may be contacted …"*) reworded to say the claimant (the agreement no longer covers the nominees);
  `contact.help` (it tells the filer the NOMINEES are texted or posted — still true for them, F14) and the approval-gate lines unchanged.
  ⚠ Two admin lines then MISDESCRIBE an old-wording claim under WS3 in an `add_only` state — `helpline.contact.savedAgreementIgnored`
  (*"already on file, so the tick was not recorded again"*: true, but the claim stays on the OLD wording, ⛔ WhatsApp) and `helpline.contact.agreement.live`
  (*"The family’s agreement to be contacted is on file."*) — recommended: `savedAgreementIgnored` gains *"(the agreement on file is the earlier wording)"* when the live row's version ⛔ names
  WhatsApp. (iv) `ConsentPayloadSchema` and the domain `ConsentPayload` DECLARE `copyVersion` (optional). (v) The wording is ⛔ changed by
  the author to answer PQ3 (F25) — that is the Panel's / counsel's. **Cost:** agent-drafted Hindi a human must review before G3; the two reworded
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
- **WS4 — G3's go-live record: a NEW roster row `claim-contact-claimant-whatsapp-go-live` (the next free row number at the records
  commit — ⛔ "Row 35", which is 6.31's) (⚠ flagged — stricter than `-357`'s call text).** ⭐ **(a) Recommended:** closure = ALL of:
  **G3 (a)** v2 (or its successor) live with HUMAN-REVIEWED Hindi — the `$comment` marker removed and `hiReviewed` flipped in the same
  commit; **G3 (b)** counsel's answer to BOTH halves of question 3 recorded — whether the reworded agreement is a sufficient basis for
  WhatsApp to the claimant, and whether *"or any other means of communication that may appear in future"* may stay — AND (if PQ3 is
  routed or BigDev so decides) whether a tick given by a filer or helpline caller who is ⛔ the claimant is a basis (F25); the wording
  narrowed to a new version if counsel advises; *"not sufficient"* ⇒ G3 stays open and the matter returns to BigDev / the Panel (it
  would override `-354` d2) — the approved proposal's *"as counsel settles its last clause"*; the counsel question is WRITTEN, ⛔ sent
  (BigDev sends it); **G3 (c)** (⚠ DROPPED by `-367` decision 4 — an accepted, disclosed risk; ⛔ a Row 36 leg) Meta approval of the four templates (correction + certificate × en + hi) as UTILITY, registered under
  EXACTLY `en` / `hi`, each created with `message_send_ttl_seconds` = 43200 (WS9); **G3 (d)** a recorded check that the agreement meets
  Meta's opt-in policy (F23 (i)–(iii)) — INCLUDING that it is the recipient's own permission when the filer or caller is ⛔ the claimant
  (F25 / PQ3's answer), and that the business the agreement names matches the WhatsApp display name the claimant sees (the Pariwar's vs
  *"the Trust"*); **G3 (e)** each `wa.template.claim_contact.*` key proven to RESOLVE in production (the dotted-name risk — F7; 6.31's Row
  35 (b) leg, for these four keys); **G3 (f)** the re-categorisation re-check (Row 35 (f)'s procedure) covers the four claim templates;
  **G3 (g)** the absence of an off-WhatsApp opt-out route (a request made to the helpline, a free-text reply — T25) is ACCEPTED by
  BigDev, or the route is built, before go-live; **G3 (h)** only then the operator sets each Pariwar's template names. SHARED, ⛔
  duplicated: each Pariwar's WhatsApp provisioning (Row 35 (a) — the same `pariwar_wa_config`, the restart on a rotated token) and the
  alarm route (Row 35 (e) ⇒ Row 32 (h)), and Row 21 (the certificate Hindi template is submitted to Meta only after Row 21's review
  closes) — the G3 row CITES them as preconditions. ⛔ A merge fence. Mechanism: ⛔ new env switch — the
  code gate is I2 (the version flags) + the template-name config (unset ⇒ `skipped:whatsapp_not_configured`). **Cost:** WhatsApp go-live
  waits for counsel (G3 (b)). **(b)** drop G3 (b): go live with the clause, narrow later (proposal §3 item 2: *"no further ruling is
  needed"*). **Cost:** claimants may be messaged on a wording counsel later advises against — and before counsel says whether the
  agreement is a basis for WhatsApp at all.
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
  `apps/jobs` — ⛔ moving the helpers, which would edit 6.31's fenced modules, AC11); outside it, the next 09:00. A report that lands late moves it
  later (the step is due at max(due, ladder start)). Overtaken: once SMS 2 is resolved (`sent` / `satisfied` / `skipped:*`), a pending
  WhatsApp step records `skipped:overtaken` — ⛔ a WhatsApp after the second text. Supersedes `-355` d3 IN PART (this one step is ⛔ on
  the 10:00 run); d4's *"that reminder IS the step"* does ⛔ apply to it (the WhatsApp is a different channel). **Cost:** on day D the claimant may get the 10:00 text
  (undelivered) and a WhatsApp at ≈ 14:00. **(b)** = PQ2 option B: the step at the next 10:00 run. **Cost:** ≈ 24 h, ⛔ 4 h; on days 1–7 it
  lands beside a scheduled reminder.
  ⚠ (a)'s known edge: a ladder the 10:00 sweep both STARTS and advances on SMS 2's own date (a report seen only then — a missed
  quarter-hourly window, or correlated 09:45–10:00 on origin + 2) takes SMS 2 in that run ⇒ its WhatsApp is `skipped:overtaken` before any
  WhatsApp tick sees it — recorded, ⛔ fixed (the text went the same morning). And a quarter-hourly start AFTER that day's 10:00 run must
  store `sms2_due_on = max(ladderFirstDueOn(originSentOn, today), <the date of the next 10:00 run>)` — `ladderFirstDueOn` alone returns
  `today` when origin + 2 = today (`due < today` is false), the step is then taken tomorrow, and when it resolves `satisfied` / `skipped:*`
  `nextAfter` anchors SMS 3 on the DUE date ⇒ one day after the step, ⛔ two (⛔ pass the next run's date AS `today` — that returns the day
  AFTER it). An AC4 leg.
- **WS7 — The step's limits (⚠ flagged — fewer messages).** ⭐ **(a) Recommended:** the WhatsApp step obeys the same `ladderStepGate`
  horizon and pause as the ladder's texts (correction `runDay >= 90`, certificate `> 180`, a certificate pause ⇒ `skipped:past_horizon` /
  `skipped:paused`) — reading `-360` Q3 A's *"no follow-up text"* as *"no follow-up message"*; plus the daytime window (WS6). The
  horizon / pause HALF of `ladderStepGate` is EXTRACTED and shared (⛔ copied, ⛔ called with its one-a-day `satisfied` branch live — pass
  `scheduledToday: false, sentToNumberToday: false` or split the function); the certificate pause comes ONLY from
  `certificateLadderStopReason`. The one-text-a-day check (LD4) does ⛔ apply (F20 — subject to PQ2). **Cost:** fewer WhatsApp messages at the edges. **(b)** WhatsApp ignores
  the horizon / pause (Q3 A said *"text"*). **Cost:** a WhatsApp after the reminders' end — the opposite of Q3's purpose.
- **WS8 — Where the step is recorded, and how a send stays once-only through a crash.** ⭐ **(a) Recommended:**
  (i) **The ladder column.** A forward migration (the next free number — T1; ⛔ regenerate 0169 / 0170 / 0171 —
  [[project_live_db_test_gotchas]]): `GRANT UPDATE ("whatsapp_step")` + CHECK widened to `^(pending|sent|skipped:[a-z_]{1,48})$` (the
  Drizzle `check()` copy in `packages/domain/src/schema/claim_contact_ladders.ts` widened in LOCKSTEP) + a BEFORE UPDATE trigger refusing
  any change of `whatsapp_step` FROM a non-`pending` value (it stays identity once decided — F2); code CAS `pending → sent | skipped:*`;
  ladders already written keep their skip.
  (ii) **The send record `claim_contact_wa_sends` — 6.31's SHAPE (F3 (vi)), ⛔ a fresh design.** One row per ladder (`ladder_id`
  UNIQUE, FK), `pariwar_id`, `claim_case_id`, `chase`, `recipient_number_hash`, `template_name` (CHECK `^[a-z0-9_]{1,512}$`), `locale`,
  `send_outcome` (`attempting | accepted | rejected_recipient | may_have_sent | refused | skipped | no_target` — the FINISHED vocabulary
  this story records; 6.31's `error` + detail grammar may replace the names, but every kind of F3 (iii) maps to exactly one), `detail` /
  `first_detail` (a grammar like `isPeerMeshWaReminderDetail` — ⛔ a 7-digit run), `attempt_count`, `claimed_at`, `claimed_by_job`,
  `aging_since`, `send_started_at` (the IN-FLIGHT MARKER), `provider_message_id` (the wamid, UNIQUE when set), `delivered_at` (ABSORBING —
  set once, ⛔ cleared), `failed_at`, `failure_code`, `created_at`, `updated_at`. **The marker:** set by its OWN committed CAS immediately
  before Meta, on THIS job's `attempting` row with lease margin on the child's clock (`markPeerMeshWaReminderInFlight`'s form) — answers
  `marked | lost` ONLY (⛔ `late`: 6.31's `late` is its own `+ 72 h` give-up, and this story has ⛔ 72-hour bound); `lost` ⇒ a transient (a
  retry re-judges). **The window** (09:00–20:00 IST) is re-checked at the claim, AT the marker and AFTER the marker commits; outside it ⇒
  ⛔ send: before the marker the child simply stops, after it the marker is RELEASED (`releasePeerMeshWaReminderInFlight`'s form — Meta
  was never called); either way the child RE-ENQUEUES itself with `startAfter = nextPeerRequestSendWindowStart(now)` and the ladder id
  (6.31's `deferToMorning` form) — the next morning's child re-judges under (iii). **The marker CHECK — 6.37d's own mapping (⛔ 0171's
  copied, which ties the marker to `accepted | rejected_recipient | error` and would 23514 on every `refused` here):** marker NOT NULL ⇔
  `send_outcome IN ('accepted', 'rejected_recipient', 'may_have_sent', 'refused')` among finished rows — a refusal FINISHES with its
  marker set (6.31 parks, which clears it); `skipped` / `no_target` ⇒ marker NULL (a `skipped` row may follow a post-send transient whose
  note cleared the marker — its `first_detail` holds the first noted transient, the log the last); the bound values are validated BEFORE the marker (`WhatsappTemplateParamError`
  is thrown pre-fetch by the client's module-private `assertBodyParams` — EXPORT it from `@twt/channels` (an AC11 exception) and call it
  first; a failure ⇒ the row finished `skipped:helpline_unreadable` (marker NULL) + `contact_ladder.whatsapp_config_fault`, so
  a bad VALUE never reaches the marker; a leg per outcome); a trigger refusing a re-stamp — 0171's predicate VERBATIM (OLD and NEW both non-NULL and different ⇒ refused; clearing to NULL is
  allowed — the release, the note and the one-statement finish need it). ⭐ `recipient_number_hash` is NOT NULL and
  written AT THE CLAIM from the ladder's own `recipient_number_hash` (6.31 writes it only at the finalise — copied, an in-flight or
  lapsed row would carry NULL and WS11 (2)'s isolation could never match it); AC5 (3)'s recomputed hash must equal it (else
  `no_target`); the finalise never changes it. ⭐ ONE lease constant `CONTACT_LADDER_WA_LEASE_MS` (≥ 45 min — above the ≈ 30-min worst-case pg-boss
  backoff (`retry_delay × 2^n × (1 + random)` with `CHILD_RETRY_LIMIT` = 4, `CHILD_RETRY_DELAY_SECONDS` = 60) of retries that fail BEFORE
  the re-claim, plus their runtimes — every attempt reaching (iii) (2) re-stamps `claimed_at`; the child's `expireInSeconds` stated and ≤
  10 min (⛔ 6.31's 45); the lease is a LIVENESS bound, ⛔ the safety control: the marker CAS (`claimed_by_job` = this job AND `send_started_at IS NULL`) is —
  a re-take by another job makes the old attempt's CAS answer `lost`, and a same-job-id pg-boss twin (after a ≤ 10-min expiry, which
  does ⛔ stop the old handler) is serialised by `send_started_at IS NULL`, the loser answering `lost`; runtimes are assumed seconds, and
  an over-long run only yields `held_by_other` no-ops; ⛔ 6.31's
  `CORRECTION_SEND_LEASE_MS` = 10 min) used by the marker CAS, the re-check, the sweep's lapsed selection and the lapsed finisher.
  ⚠ 0171's trigger FREEZES every delivery column once the row is ⛔ `attempting` — copied as is, it would refuse the webhook worker's
  writes (WS11): `delivered_at`, `failed_at`, `failure_code` sit OUTSIDE the freeze, each settable at most once (NULL → value), only on an
  `accepted` row with a wamid; every other delivery column frozen as in 0171. ENABLE + FORCE RLS, per-command tenant policies, column
  grants to `twt_app` (⚠ ONE jobs pool runs every worker — the dev superuser or a prod BYPASSRLS login — so a grant binds `twt_app` ONLY;
  the real controls for jobs are the TRIGGERS); its policy declaration file and a policy regression spec (the 6.37c pattern); both new
  tables join roster Row 26 (jobs login grants).
  (iii) **The step is `sent` when its row is CLAIMED** (6.37c Debug Log (b) 2 — a refusal at send still counts as sent; the ladder runs
  on). ⚠ So the AC4 selection's "pending step" never re-finds a claimed row, and a RETRY's re-check is ⛔ "the step pending" (it is
  `sent`). Two consequences: (1) **re-selection** — the quarter-hourly due-step selection ALSO lists every ladder whose
  `claim_contact_wa_sends` row is `attempting` with `send_started_at IS NULL` and a LAPSED lease (6.31's per-claim
  CHILD list `listClaimDuePeerMeshWaReminderPings` does the like — *"an `attempting` row WITHOUT the marker is listed whoever holds it"*;
  here the SWEEP must, because a claimed step is no longer `pending` and nothing else finds it) — a crash before the
  marker, a lost pg-boss job, a deferral that never ran are all re-taken; (2) **the retry / re-take re-check**, under the chase lock, in TWO
  halves. FIRST the row's state, which ⛔ writes when it fails (`beginPeerMeshWaReminder`'s order): ⛔ row, or ⛔ `attempting` ⇒
  `already_final`; the marker SET ⇒ `in_flight` (the lapsed finisher owns it — ⛔ finish, ⛔ clear: a sent message must keep its marker so
  it ends `may_have_sent:lease_lapsed`); held by ANOTHER job whose lease is live ⇒ `held_by_other`; else (an own retry, or a lapsed
  lease) RE-CLAIMED by this job (`claimed_at` re-stamped, `attempt_count + 1` — `beginPeerMeshWaReminder`'s re-claim). THEN the
  verdicts: the ladder `running`, SMS 2 still `pending`, within the horizon, ⛔ paused, ⛔ stopped (WS10), I2's basis still eligible, AC5's
  ends / stops, and AC5 (1)'s config verdicts (`whatsapp_not_configured` / `whatsapp_config_unreadable` / `whatsapp_template_invalid` /
  `helpline_unreadable`); a false verdict FINISHES the row `skipped:<reason>` (`overtaken` / `past_horizon` / `paused` / `stopped` / the basis
  reason itself — `old_wording`, `hindi_not_reviewed` … — / `ended`; a transient note kept in `first_detail`), CAS'd on `send_outcome =
  'attempting' AND claimed_by_job = <this job> AND send_started_at IS NULL`, and ⛔ sent. Outside the window ⇒ DEFERRED (ii), ⛔
  finished.
  (iv) **Each classifier kind (F3 (iii), `-366` d2's order), recorded THIS story's way:** `may_have_sent` ⇒ finished `may_have_sent:<token>`,
  ⛔ resent (I4); `transient` (incl. `api_unavailable:000` — `-366` d1, and a marker `lost`) ⇒ the transient note CAS'd on the marker
  (pre-send: marker unset; post-send: marker set — 6.31's round-2 P2 rule), the job THROWS for a pg-boss retry (`CHILD_RETRY_LIMIT`), each
  retry re-checking (iii); on the FINAL attempt (`retryCount >= retryLimit` — 6.37c's `finalAttempt` form in `claim-contact-ladder.ts`)
  the child FINISHES the row `skipped:transient_exhausted` (`first_detail` holds the FIRST noted transient; the FINAL token is
  logged on `contact_ladder.whatsapp` — the row alone cannot prove a post-send 5xx happened) instead of throwing (the same CAS
  as (iii) (2); after a POST-send transient the note and the finish are ONE statement — `SET send_outcome = 'skipped', send_started_at =
  NULL, first_detail = COALESCE(first_detail, detail, $transient), detail = … WHERE … AND claimed_by_job = <this job> AND send_started_at IS NOT
  NULL` — the CHECK holds at statement end, and a crash cannot leave an unmarked row owned by a finally-failed job) (pg-boss's final
  failure only `fail()`s the job — nothing else would write the row); (iii) false ⇒ finished as (iii) says — ⛔ waits beyond SMS 2 (6.31's
  72-hour bound does ⛔ apply: the ladder cannot wait); `recipient` ⇒ finished `rejected_recipient:<token>`; `scope` (incl. EVERY 132xxx —
  `classifyWhatsappError` files 132000–132999 as `template_not_approved`, so deferred W9's per-value 132005 / 132012 / 132018 land here,
  ⛔ in `unknown_scope`) ⇒ finished `refused:<token>` + the alarm `contact_ladder.whatsapp_refused` (Pariwar-wide; the next ladders refuse
  the same way until fixed — T10); `unknown_scope` (131008 / 131009 and any code outside the sets; `param_invalid` cannot arrive here —
  (ii) validates first, and the per-send timeout is a constant in [1, 2^31 − 1] (a unit leg); the client also throws it for a bad
  `timeoutMs` inside `send()`, AFTER the marker — unreachable while that unit leg holds; were it reached, `refused:param_invalid` WITH
  the marker, CHECK-legal — the one marked row Meta never saw) ⇒ finished `refused:<token>` + the same alarm. A crash: a lapsed row WITH the marker ⇒ `may_have_sent:lease_lapsed`
  by the quarter-hourly sweep's finisher (`finishLapsedInFlightPeerMeshWaReminders`'s form), ⛔ re-claimed; WITHOUT the marker ⇒ re-taken
  by (iii) (1) (Meta was never called). A no-number / hash-mismatch AFTER the claim ⇒ finished `no_target` with the marker unset (6.37c
  round 2's stranded-`attempting` class — `finishPeerMeshWaReminderNoSendableNumber`'s form). The lease is `CONTACT_LADDER_WA_LEASE_MS` ((ii); footgun #40(d)). Legs: a final-attempt transient; a crash before the marker on the final attempt
  (re-taken by (iii) (1)); a release at 20:00 and the 09:00 re-take; a crash after the marker.
  (v) **Divergences from `-365` WR10, NAMED (the 6.37d entry records each as narrowing `-365` Consequence 2 for this row — ⛔ a
  re-reading, [[feedback_supersede_never_reinterpret]]):** `scope` ⇒ recorded + alarmed, ⛔ parked (6.31 parks and ENDS the claim's run);
  `unknown_scope` ⇒ recorded + alarmed, ⛔ parked (6.31: *"park and CONTINUE"*); a transient bound = SMS 2 / the window / the retries, ⛔
  72 h. **Cost:** a once-only step spent on a refusal that a fix might have cleared within the day (the SMS steps still run). The
  alternative — park like 6.31 — costs a parked step that SMS 2 overtakes anyway (parking buys at most hours).
  **Cost of (a) overall:** a trigger on the ladder table (6.37c had none), a spec flip, and a send table as heavy as 0171. **(b)**
  WhatsApp as a new purpose on the chase send tables. **Cost:** SMS-shaped tables (CRQID, `sms_send_deliveries`, DLT outcomes) carrying a
  WhatsApp row. **(c)** state only on the new table, `whatsapp_step` left `pending`. **Cost:** a `pending` that never moves.
- **WS9 — The words and templates.** ⭐ **(a) Recommended:** the body is the reminder that failed — `correction_sms.reminder` or
  `certificate_sms.reminder` — in the claim's `contactLocale`, values `{{1}}` = the claim reference, `{{2}}` = the helpline (the same
  values the SMS sends, through `bodyParams` — F3 (i)); ⛔ header, footer, buttons. FOUR templates (two chases × en / hi), UTILITY,
  registered in ONE code file `apps/jobs/src/scheduler/claim-contact-wa-templates.ts` (`{ correction: { en, hi }, certificate: { en, hi }
  }` + the language map `{ en: 'en', hi: 'hi' }` — the `peer-mesh-wa-templates.ts` shape) with a lockstep test against the REAL `t(…)`
  (the `peer-mesh-wa-templates.test.ts` shape; a stub is a second source — [[feedback_stub_must_call_not_transcribe]]); each template
  CREATED with `message_send_ttl_seconds` = 43200 (12 h, Meta's maximum for a utility template — a message ⛔ delivered within 12 h is
  dropped and reads as no delivered report, `-351` 1 A; F23 (v)). The approved template NAME per Pariwar per locale through 6.31's key
  builder: `WaTemplatePurpose` WIDENED to `'peer_mesh.reminder' | 'claim_contact.correction_reminder' |
  'claim_contact.certificate_reminder'` (its doc-block already names them), read through `resolveSmsDltConfig`; the value checked
  against `^[a-z0-9_]{1,512}$` (6.31's `TEMPLATE_NAME_FORM` — export it, ⛔ a second regex) and the table CHECK. **Divergence from `-365`
  WR7, NAMED (the 6.37d entry):** WR7's *"unset ⇒ HOLD; an unreadable key ⇒ HOLD with one alarm"* becomes, here: `null` (unset) ⇒
  `skipped:whatsapp_not_configured` (a Pariwar that has not gone live — ⛔ alarm); a THROW (an outage, or a dotted name refused
  `INVALID_ARGUMENT` — F7) ⇒ `skipped:whatsapp_config_unreadable`; a malformed value ⇒ `skipped:whatsapp_template_invalid`; an unreadable
  helpline (or one Meta would refuse — T27) ⇒ `skipped:helpline_unreadable` — each + the alarm `contact_ladder.whatsapp_config_fault`
  (the class 6.31 logs as `config:wa_template_invalid:<locale>` / `config:helpline_unreadable`) — because a ladder cannot wait for a fix. **Cost:** a step spent on an outage (alarmed). The Meta body uses
  `{{1}}` / `{{2}}` — ⛔ `{#var#}`, ⛔ `DLT_VAR`, ⛔ `sms.dlt.template_id.` in that file (the dlt-typed-variables gate). If Meta files or
  re-files a claim template as MARKETING (F23 (iv)), the operator UNSETS that key (⇒ `skipped:whatsapp_not_configured`) — ⛔ re-worded here
  (`-366` d5 (vi)'s reading for 6.31, applied the same way). ⚠ The certificate Hindi is ⛔ yet human-reviewed (Row 21) — its WhatsApp
  twin inherits that. **Cost:** four Meta submissions. **(b)** one shorter WhatsApp-specific text. **Cost:** a new family-facing text
  the Panel never saw.
- **WS10 — STOP (⚠ flagged — honoured Pariwar-wide).** ⭐ **(a) Recommended:** in `wa-webhook-processor.ts`, a STOP keyword from a
  number ALSO records a claim-contact stop — a new tenant table `claim_contact_wa_stops (stop_id, pariwar_id, recipient_number_hash,
  stopped_at, inbound_event_id)` keyed in the LADDER's hash space: `correctionNumberHash(encryption.normalizeMobile(from),
  event.pariwarId, enc)` — the DOMAIN `normalizeMobile` (`member-fields.ts`), the same one the ladder's hash input passes through
  (`resolveCorrectionMobile`), ⛔ the worker's private copy; class `claim_contact_mobile` — ⛔ `memberMobileBlindIndex`, the login key:
  `field-classes.ts` keeps the two disjoint so no claim row is joinable to a member's identity. `correctionNumberHash(e164, pariwarId,
  enc: FieldCryptoDeps)` uses only `enc.kms` + `enc.hmacKeyRef` (the KEK ref is required by the TYPE only) — the worker's deps take the
  full `jobsEncryption` (`boot.ts` has it in scope and today passes `{ kms, hmacKeyRef }` — the same `hmacKeyRef` the ladder uses, so the
  hashes match). The key is bound to the Pariwar ⇒ a stop matches only that Pariwar's ladders: **Pariwar-wide**, ⛔ number-wide across
  Pariwars. ONE extra HMAC per inbound STOP (rare); the child compares with the ladder's own hash (⛔ HMAC there) — whether or not the
  number has a member opt-in; today's member path (revoke an ACTIVE opt-in) is unchanged — the person's own STOP (row 5-12 will widen
  it — WS1). The WhatsApp step refuses any number with a stop (`skipped:stopped`) — for every claim in the Pariwar, ⛔ only the one that
  messaged it (stricter than `-357`'s *"for that claim"*). ⛔ An un-stop path in v1 (disclosed). Audit-logged with its OWN action (e.g.
  `claim_contact.wa_stopped`, actor null, locator `pariwar/<id>/claim-contact/wa-stop/<stopId>`, audit before write) through
  `audit.withCompensatingAudit` (`(pool, { auditIntent, mutate })`; `actorId` nullable) — ⚠ the access-wrapper gate does ⛔ cover this
  (it matches only `audit.writeAuditEntry(` and does ⛔ scan `apps/jobs`), so this story's own source fence pins ⛔ `writeAuditEntry` in
  the recorder's file; today's `auditOptInTransition` needs a member id a non-member lacks. ⚠ The worker matches STOP only on `msg.type
  === 'text'` — a quick-reply button STOP is dropped (the templates have ⛔ buttons, so none is offered). ⚠ Meta also requires honouring
  opt-out requests made OFF WhatsApp (F23 (ii)) — a claimant who tells the helpline "no WhatsApp", or replies in free text, has ⛔ route
  in v1 (⛔ a withdrawal route — F16): disclosed, a deferred item, G3 (g). **Cost:** a STOP sent for member alerts also ends claim
  WhatsApp; a stopped number cannot be re-opened. **(b)** a per-claim stop (only claims whose WhatsApp reached that number before the
  STOP). **Cost:** a STOP sent before the first claim message, or about another claim, is ignored.
- **WS11 — Isolation and the absorbing delivered read.** ⭐ **(a) Recommended:** the worker's status branch first looks the wamid up in
  `claim_contact_wa_sends` — inside `withPariwarScope(pool, event.pariwarId, …)` with an explicit `pariwar_id` filter (the event's Pariwar
  comes from the signed per-Pariwar URL), and the worker repeats the RLS-bound-role refusal (6.37c's `canReadAcrossPariwars` guard)
  BEFORE the claim branch — the worker runs cross-tenant on the BYPASSRLS pool today; if jobs ever runs RLS-bound (Row 26), an unscoped
  lookup would return 0 rows and a block code would REVOKE the member's opt-in (I7) — ⚠ and silently. A refusal ENDS the tick before any
  event is claimed (⛔ marked processed) — it never falls through to the member path. ⚠ The event's Pariwar is the URL's
  (`/api/v1/webhooks/whatsapp/:pariwarId`, verified with THAT Pariwar's app secret) — right only if each Pariwar's Meta app posts to its
  own URL; `pariwar_wa_config.phone_number_id` is ⛔ unique and the worker reads ⛔ `metadata.phone_number_id` today ⇒ the claim branch
  parses `value.metadata.phone_number_id` and acts ONLY when it equals the event Pariwar's configured `phone_number_id` (else a log line
  and ⛔ claim action — an AC7 leg). If found by wamid, it records `delivered_at` (once, on `delivered` OR `read` — Meta sends `read`
  WITHOUT `delivered` when both happen at once) or `failed_at` + `failure_code` (on `failed`) on THAT row and SKIPS the member-block
  revoke (I7, F10); `upsertWaSendStatus` keeps running as today (it stores every wamid). ⚠ **Matching by wamid alone misses three
  paths** (a finalise that failed after Meta accepted ⇒ a lapsed `may_have_sent` row with ⛔ wamid; a `may_have_sent:timeout | network`
  row; a status drained before the finalise wrote the wamid — the worker runs every minute, a send may take its full per-send timeout)
  — the honest rule: (1) **delivered** = the row's `delivered_at`, OR — at finalise and in the 10:00 end check — `whatsapp_send_status.state
  = 'delivered'` for the row's wamid (latest-wins, disclosed — F8; `mapMetaStatus` maps `read` to `delivered`) — and when that second
  disjunct is what is true, the SAME transaction COPIES it into the row's `delivered_at` (set-once, on the `accepted` row with the wamid —
  the trigger allows it) BEFORE `ladderEndReason` reads, so D22's own-row read (WS12) sees every delivery the end rule saw; a delivery to a no-wamid `may_have_sent` row is UNOBSERVABLE
  (disclosed); (2) **member-block isolation** keys on the RECIPIENT in the CLAIM hash space: for a block-coded `failed` status with ⛔
  claim row by wamid, `const e164 = encryption.normalizeMobile(status.recipient_id)` (`null` ⇒ ⛔ isolation match — the member path as
  today), then `correctionNumberHash(e164, event.pariwarId, jobsEncryption)` matching any
  `claim_contact_wa_sends` row of that Pariwar that is in flight, `may_have_sent` or `accepted` in the last 7 days ⇒ the member revoke is
  SKIPPED (one HMAC per block-coded failed status — rare; ⛔ the member blind index — T21). The at-most-once drain (F8) is disclosed: a
  lost `delivered` is silence — the ladder runs on, as for an SMS with no report (`-351` 1 A); Meta's webhook retries make
  duplicates possible — every write is set-once. (6.31's sends need ⛔ such isolation: its recipients are opted-in members and `-365` WR11
  keeps 5.4's block rule.) **Cost:** the member worker gains a claim branch (5.4's file). **(b)** a separate claim webhook / worker.
  **Cost:** Meta sends one webhook per number; two consumers of one event table.
- **WS12 — A delivered WhatsApp ends the ladder and counts as reached (`-351` 4 A — ratified; the WS is the mechanism; ⚠ flagged —
  beyond `-360` Q1 A's literal *"a delivered text"*).** ⭐ **(a) Recommended:** `ladderEndReason` gains a WhatsApp input — the ladder's own
  `claim_contact_wa_sends` row with `delivered_at IS NOT NULL` ⇒ `ended_delivered`, `end_detail = 'delivered:whatsapp'` (`LadderEnd.detail`
  widens from the literal `'delivered'`; the DB CHECK `^[a-z_:]{1,64}$` already allows it); a `failed_at` or no status ⇒ nothing. ⭐ The
  CLOSURE effect: an ended ladder lifts `ladder_running`; and on an `ended_delivered` ladder the reported-undelivered origin still reads
  `accepted` (the B1 mapping rewrites only rows of epochs with a CONCLUDED ladder) — and `reachedBySms` counts any `accepted` family row on
  the current hash WHATEVER its `deliveryState` ⇒ D22 says "reached by SMS": the right verdict, recorded under the wrong channel, and ⚠
  FRAGILE: a LATER ladder in the same epoch that concludes undelivered maps EVERY undelivered accepted row of that epoch, *"EARLIER rows
  included"* — the first ladder's origin turns `rejected_unreachable` and the person reads UNREACHED although a WhatsApp was delivered
  (the no-restart rule blocks only `concluded_undelivered`; the "already reached" filter in `planLadderStart` reads SMS rows only ⇒ a
  second ladder CAN start after a WhatsApp-ended one). The SMS twin is safe: a delivered `ladder_sms` row is never mapped. ⇒ D22
  (`evaluateClosurePersonReach` / `readClosureReach`, the CORRECTION closure only) gains `reachedByLadderWhatsapp` = ANY
  `claim_contact_wa_sends` row of a correction ladder of the live return FOR THIS PERSON with `delivered_at IS NOT NULL` and
  `recipient_number_hash` equal to the person's CURRENT hash — WHATEVER the ladder's state and WHENEVER it was delivered (before or after
  a conclusion) — standing on its OWN row, as a delivered `ladder_sms` does (4 A's *"counts as reached"*); the conclusion and
  letter-eligibility stay as recorded (LD17). ⚠ `correction-closure.ts` is fenced against decrypting
  (`packages/domain/tests/claim/nominee-name-no-comparison-fence.test.ts` forbids `decryptTier1` / `resolveCorrectionMobile` there) — the read compares stored hashes only. The
  certificate chase gets the ladder END only. **Cost:** a WhatsApp delivered to the claimant lets a correction closure proceed without a
  call or a letter even where every text failed (the Policy meaning note). **(b)** WhatsApp ends the ladder but does ⛔ count as reach.
  **Cost:** contradicts 4 A's *"counts as reached"* — and the hold lifts with the person still counted by the (undelivered) origin. **(c)**
  count only while ⛔ later ladder concluded (v1.1's scope). **Cost:** a delivered WhatsApp un-counted by a later failure — the SMS twin
  would stay counted.
- **WS13 — What staff see.** ⭐ **(a) Recommended:** `ContactLadderFollowUpDto` gains `delivered_by: 'text' | 'whatsapp' | null` (strict
  schema + lockstep legs; `LadderViewFact` gains `endDetail` and both view builders — `correction-chase-read.ts`,
  `certificate-reminder-read.ts` — carry it); the admin line for `ended_delivered` reads by channel (*"Follow-up ended — a WhatsApp message reached the
  family."* beside today's text line); ⛔ new line for a skipped or sent WhatsApp (staff act on the ask, not the step). Microcopy gate
  (T18 of 6.37c: ⛔ the bare word "report"). **Cost:** a contract field. **(b)** a per-step list. **Cost:** a larger DTO staff do not act on.
- **WS14 — Records, alarms, the forgery bound.** ⭐ **(a) Recommended:** (i) ADR-0028 gains a dated row: a THIRD direct caller of the
  Meta client (after 6.31's, recorded 2026-10-19), and the first to a NON-member. ADR-0042 gains a dated note (⛔ its decision text edited): the
  bound `-358` ratified (*"as restated for the delivery ladder"*) WIDENS — a forged `undelivered` now ALSO sends at most ONE WhatsApp to the
  claimant (⛔ a nominee), on the new wording only — a consequence of `-350` ruling 2 (1); the start-burst alarm (≥ 3 ladders in one Pariwar on one IST day — part of that restated bound)
  still bounds it, whichever sweep starts the ladders (AC4); the deferred-work line annotated; the Panel TOLD
  at its next sitting (a "told" item, ⛔ a ruling — the 6.37c pack item 5 precedent; BigDev's §0 confirms "told, not ruled"; WRITTEN at
  Task 10, ⛔ "told" until it goes out). ADR-0029 gains a dated changelog row (⛔ decision text edited): the worker also records a
  claim-contact stop on a STOP keyword, and for a wamid in `claim_contact_wa_sends` records the status on that row and does ⛔ drive
  BLOCKED_BY_META (§3.4 exception, `-357`). (ii) Log lines (logs only
  until Row 32 (h)): `contact_ladder.whatsapp` per outcome / skip reason by ids; the alarm `contact_ladder.whatsapp_refused` on a `scope`
  or `unknown_scope` refusal (WS8 (iv) — the scope set of F3 (iii), ⛔ only `template_not_approved` / `auth`), naming the Pariwar; 6.37c's
  `contact_ladder.hash_unavailable` on a child's final-attempt `skipped:hash_unavailable`; the alarm
  `contact_ladder.whatsapp_config_fault` on every FAULT skip of WS9 (an unreadable key or token, a malformed name, an unreadable helpline —
  I10). (iii) The G3 roster row `claim-contact-claimant-whatsapp-go-live` (WS4); Row 18 dated note (v2 keeps the marker); Row 19 dated
  note (WhatsApp widens the claim contact record's use; Meta a processor); the §3.4 proposal untouched (approved). **Cost:** none.

## 🏛️ Candidate Panel questions (BigDev's §0 check FIRST at Task 0.2 — route, or record as the author's in the 6.37d entry)

- **PQ1 — The claimant who is also a nominee.** Two ratified rulings meet: `-356` *"drop WhatsApp only notification for nominee"* and
  `-357` *"to the CLAIMANT only, on the claim's filing agreement"*. `-356`'s own reading (iii) left it to this create-story; BigDev's scope
  words — *"or a case where nominee and claimant is same"* — were told to the Panel as his, ⛔ ruled, and say *"can be in future"*. §0:
  passes on its face (what the Trust sends a person; two ratified clauses at an edge) — ⚠ BigDev may hold it is his under his own scope
  words; `-356`'s reading (iii) already records A as the author's NOT-RATIFIED reading (*"a nominee who is also the claimant is reached
  as the claimant, on the claimant's filing agreement"*). **Our reading (built unless ruled otherwise — WS5 (a)):** **A** — they are reached as the claimant: they agreed to WhatsApp as
  the claimant, and `-356` was about nominees who never agreed. **Cost:** a nominee's number gets WhatsApp (the same person). **B** — no
  WhatsApp while they are also a nominee. **Cost:** most families (a nominee files) never get the step. **C** — WhatsApp only to a
  claimant-nominee who ALSO opted in as a member. **Cost:** only those with a standing member yes (wider once row 5-12 ships `-364` —
  a yes then lasts until withdrawn — and row 5-10's signup box); it rests a claim message on a member opt-in that `-356`'s reading (ii) (⛔
  ratified) says does ⛔ count by itself; the agreement's WhatsApp line means little.
- **PQ2 — WhatsApp at four hours vs "one message a day, at 10:00".** `-250` #5 (ratified for the CORRECTION reminders; for the
  certificate chase the 10:00 hour is `-259`'s not-ratified reading): *"One message a day, at 10:00 in the morning"*; `-350` ruling 2 (1)
  (ratified later): WhatsApp *"when the SMS has not been delivered 4 hours after it was sent"*. Evidence the Panel was told the 10:00 days
  for the ladder: `-360`'s told line and `-355` d3 (our reading). §0: passes (two ratified clauses that may conflict). **The one fact:** the 10:00 text was reported NOT delivered — the WhatsApp
  at ≈ 14:00 is the first message that reaches the family that day. **Our reading (built unless ruled otherwise — WS6 (a)):** **A** — at
  four hours, in the daytime (09:00–20:00); `-350` is the later, specific rule. **Cost:** two messages SENT that day (one never arrived).
  **B** — at the next 10:00. **Cost:** ≈ a day later; on the first week's days it arrives beside a scheduled reminder. **C** — at four
  hours, only when no other reminder is due the next morning. **Cost:** a rule families cannot predict.

- **PQ3 — Whose "yes" is it? (F25).** `-351` 2 (*"THE CLAIMANT'S AGREEMENT AT FILING IS THE CONSENT"*; the Panel's own words: *"when
  a claimant files a claim, he/she will be asked to agree to T&C …"*), `-357` (*"to the CLAIMANT
  only, on the claim's filing agreement (naming WhatsApp; an explicit affirmative capture recorded per claim, never pre-ticked …)"*) and
  §3.4 all ASSUME the claimant ticked the box; none says WHO ticks it. As built, whoever files ticks it — in the app a family member in the
  deceased member's session, at the helpline the caller (relayed by staff) — and the record holds ⛔ claimant identity; `-352`'s wording
  is third-person (*"the Trust may contact the claimant named here"*); Meta's policy requires opt-in *"from the recipient"*. §0: STRIP
  THE CITATIONS — "may the Trust WhatsApp a person on a tick someone else gave for them?" is about what the Trust may send a person and on
  whose word ⇒ the Panel's (and counsel's), ⛔ the author's; matched against the ratified sentence it is a PREMISE gap, ⛔ a narrowing or
  widening. **The one fact:** the agreement record names the deceased member as subject and does ⛔ say who agreed. **Our reading
  (built unless ruled otherwise):** **A** — build as `-357` reads (the agreement on file is the claimant's consent) and make G3 (b) / (d)
  wait for counsel's answer to a REVISED question 3 that states the filer or caller may ⛔ be the claimant. **Cost:** if counsel says a
  third party's tick is ⛔ a basis, the wording / capture changes before go-live (a new version — the registry absorbs it). **B** — the
  agreement becomes first-person and claimant-only (*"I am the claimant and I agree …"*), with a helpline check that the caller IS the
  claimant. **Cost:** a new ratified-adjacent wording (the Panel's), a helpline step, and claims filed by a non-claimant have ⛔ WhatsApp
  basis. **C** — WhatsApp only when the claimant also confirms on WhatsApp first (a reply to a first message). **Cost:** the first message
  itself needs a basis — circular. ⚠ ⛔ The author changes the wording under PQ3 (WS2 (v)); Task 0.5 revises counsel question 3 BEFORE it
  is sent (the precedent: the document's own *"Revised 2026-10-18, before sending"* note).

⭐ **Dispositions (2026-10-20, `-367` decisions 15–17):** PQ1 — the AUTHOR's, reading A. PQ2 — ROUTED (the note below) and RULED 2026-10-20 by `-368`: Q1 A
(and the clause: Q2 A — removed). PQ3 — DISSOLVED by the claimant's definition (see the `-367` OUTCOME block); its options B / C are moot.

⚠ If BigDev routes any: ONE routing note from the TEMPLATE (`trustee-panel-routing-note-YYYY-MM-DD-6-37d-whatsapp-edges.md`), plain
question first, the deciding fact, options with costs, evidence last; WRITTEN at Task 0.3, ⛔ "sent" until it goes out
([[feedback_shown_to_panel_means_sent]]). This row is ⛔ `done` until a routed question is ruled and the code matches.

## Acceptance Criteria

Notation: "the step" = the ladder's WhatsApp step (step 1); "the chase" = correction or certificate; live legs on :5433 with a
controllable clock; every Meta call through an injected fetch (⛔ network in any test).

1. **AC0 — Governance before code.** Task 0 is done before any `apps/` / `packages/` / `scripts/` change: WS1–WS14 answered and recorded
   VERBATIM; PQ1–PQ3 through BigDev's §0 (routed or recorded); the 6.37d entry committed ALONE (naming every divergence from `-365` WR7 /
   WR10 as narrowing `-365` Consequence 2 for this row); the records commit (the G3 roster row, Row 18 / 19 / 26 notes, the epics.md
   dated note, deferred-work, sprint row) after it. Row 6-31 is `done` on `main` (WS1 — met); if `main` has since moved under F3's
   shapes, re-derive before building.
2. **AC1 — The agreement's new words.** Given the contact step (app) and the helpline form, when shown, then `contact.agreement` reads
   `-367` decision 2's v2 English VERBATIM (*"I agree that the Trust may contact me by text message, WhatsApp, phone call or post, about
   this claim."* — first person, ⛔ the clause) and its Hindi draft (WhatsApp as व्हाट्सएप), both carrying a `"$comment.contact_agreement"`
   ⛔-yet-reviewed marker; the server registry holds v1 BYTE-IDENTICAL to today's text and v2 identical to the JSON (a lockstep test); the
   current version id matches `/pending-story-0\.13/`; a recorded agreement's payload carries v2's id and the text shown;
   `ConsentPayloadSchema` declares `copyVersion`; the WS2 (iii) lines reworded (incl. `helpline.contact.savedAgreementIgnored`'s
   earlier-wording clause); `apps/admin/tests/helpline-claim-contact.test.tsx` asserts the NEW text; a leg pins the box UNTICKED by
   default on both surfaces (§3.4 *"never pre-ticked"* — `contact.tsx`, `HelplineClaimContact.tsx`); the i18n parity and microcopy gates
   pass.
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
5. **AC4 — When, and the quarter-hourly start.** Given a running ladder with a pending step, when the quarter-hourly WhatsApp sweep
   runs, then the step is taken only at or after the origin row's `created_at` + 4 h AND inside 09:00–20:00 IST (else the next 09:00); a
   report arriving late takes the step at the first in-window run after the ladder starts. The quarter-hourly sweep may START a ladder
   ONLY for an origin whose report is `undelivered` with `sms_send_deliveries.reported_at >= now() - interval '2 hours'` (⛔ a "previous tick"
   watermark, which does ⛔ exist; a missed tick is covered by the overlap, a duplicate start absorbed by `claim_contact_ladders_origin_uq`
   + `.onConflictDoNothing()`; ⚠ `reported_at` is GREATEST of the reports' `received_at` — the time WE received a report, ⛔ when the
   correlator settled it: a report the correlator settles later than 2 h after receipt (its 2 h / 6 h retries), or a flip to
   `undelivered` by an earlier-received report, is started by the next 10:00 sweep instead — disclosed, a leg) AND that has no ladder (`NOT EXISTS`) — ⛔ the 14-day
   candidate set `listLadderCandidateClaims` — through the SAME extracted START (`planLadderStart` → `insertContactLadder`, under the chase
   lock) as the 10:00 sweep, and it does ⛔ call `advance` — a ladder it starts takes its SMS steps only at the 10:00 sweep (a leg: a report
   first seen D + 2 at 14:00 sends ⛔ SMS 2 until the next 10:00, and its WhatsApp is ⛔ `overtaken` by it); a start after that day's 10:00
   run stores `sms2_due_on = max(ladderFirstDueOn(originSentOn, today), <next 10:00 run's date>)` (WS6 — a leg where SMS 2 resolves
   `satisfied` and SMS 3 still falls two days after the DUE date); the 10:00-start-on-SMS-2-day edge records `skipped:overtaken` (a leg);
   once SMS 2 is resolved a pending step becomes `skipped:overtaken`; past the horizon or in a pause ⇒ `skipped:past_horizon` /
   `skipped:paused` (WS7); a NULL anchor ⇒ `skipped:anchor_unknown` (I10). ⚠ The due-step SELECTION is SQL-only (⛔ HMAC, ⛔ decrypt); the
   START pays its existing per-new-report hashing (T4 — the certificate start hashes every person, the correction start's
   `readReturnPersonStates` / `correctionFamilyStopReason` may hash); the per-ladder VERDICTS that need hashes (the certificate pause from
   `certificateLadderStopReason`, the stops) run in the CHILD (AC5). The quarter-hourly cron runs around the clock (a report at 21:00 still
   starts its ladder that night; its WhatsApp waits for 09:00); the WhatsApp CHILDREN are enqueued only for steps due inside the window.
   The due-step selection ALSO lists every ladder whose WhatsApp row is `attempting` with ⛔ marker and a lapsed lease, WHATEVER the
   ladder's state (a ladder that ended mid-backoff still owes its row a finish) — enqueued, like due steps, ONLY inside the window, and
   every child DEFERS at its own start when outside it, BEFORE the re-check's first half (6.31's `if (!isInPeerRequestSendWindow(now))
   return deferToMorning(now)`) — else a night re-take re-claims the row every 45 min and the 09:00 child answers `held_by_other` (WS8 (iii) (1) —
   a leg each: a crash before the marker; a final-attempt crash; a lost deferral), and the sweep runs the lapsed-marker finisher (WS8
   (iv)). ⭐ The quarter-hourly START runs 6.37c's LD13 tail for its OWN starts — the per-Pariwar IST-day burst check over
   `laddersStartedToday` (`contact_ladder.burst:<n>` fires on the run whose starts cross
   `CONTACT_LADDER_BURST_THRESHOLD` — ⚠ the 10:00 quarter-hourly tick and the daily sweep running together may each fire once; disclosed:
   both may fire, neither can miss — each reads after its own commit; ⛔ a lock around the tail alone dedupes it) and the `contact_ladder.hash_unavailable` alarm — because once new reports are started within 15
   minutes the 10:00 run starts almost none and its tail would never fire, while ADR-0042's ratified bound counts on that alarm (a leg:
   three ladders started by quarter-hourly ticks raise ONE `contact_ladder.burst:3`).
6. **AC5 — The send.** WHERE A SKIP IS WRITTEN: step `pending` ⇒ the ladder column under the chase lock (CAS `pending →
   skipped:<reason>`, ⛔ a send row); step `sent` (a retry or a re-take) ⇒ the send ROW finished `skipped:<reason>` (WS8 (iii) (2)'s
   CAS) — including (1)'s config skips and an end or stop found in (2) (⛔ a write to the step, which WS8 (i)'s trigger refuses and would
   leave the row re-taken for ever); reasons are `[a-z_]` words (`old_wording`, ⛔ a second colon — the step CHECK). A pre-claim
   transient on a `pending` step writes nothing (⛔ row exists) — the job throws; on its final attempt the step records
   `skipped:hash_unavailable` for a hash failure, otherwise it stays `pending` for the next tick. ⭐ (1) only READS: its config verdicts
   (and the certificate hashes) are INPUTS, judged and WRITTEN in (2) — on a `pending` step under the chase lock; on a `sent` step only
   AFTER WS8 (iii) (2)'s first half has RE-CLAIMED the row for this job (a re-take is always a NEW pg-boss job id — the sweep's child or
   the 09:00 re-enqueue — so a write before the re-claim matches ⛔ row and the row would be re-taken every tick); ⛔ a write in (1). A
   leg: a row released at 20:00 whose Pariwar turns WhatsApp off overnight ⇒ the 09:00 child (a new job id) finishes it
   `skipped:whatsapp_not_configured`; ⛔ re-selected at 09:15. Given a due step, when the child runs, then IN THIS ORDER: (1) OUTSIDE any lock — the Pariwar's `enabled` +
   `phone_number_id` (`enabled` false or ⛔ `phone_number_id` ⇒ `skipped:whatsapp_not_configured`, ⛔ alarm) + the token secret (a throw
   ⇒ `skipped:whatsapp_config_unreadable` + alarm), the chase's template name for the locale (WS9's split: unset ⇒ `skipped:whatsapp_not_configured`;
   a throw ⇒ `skipped:whatsapp_config_unreadable` + alarm; malformed ⇒ `skipped:whatsapp_template_invalid` + alarm), the helpline value
   (unreadable ⇒ `skipped:helpline_unreadable` + alarm) — network I/O ⛔ under the chase lock (the certificate chase's CR7, `certificate-reminder.ts`; 6.31 *"⛔ KMS under a lock"*); the
   certificate child's person hashes taken here too (as the certificate SMS child does — CR7: ⛔ KMS under the CERTIFICATE claim lock;
   verified under the lock with `samePersonSource`; a hash failure there is the same pre-send transient). (2) UNDER the chase lock — DB reads, plus, for the CORRECTION chase only, the HMAC
   that `correctionFamilyStopReason(..., crypto)` already takes under the trustee lock in `beginCorrectionLadderSend` (that precedent; a
   `CorrectionNumberHashUnavailableError` OR a returned `personState.hashFailed` ⇒ a pre-send transient (WS8 (iv) — ⛔
   `beginCorrectionLadderSend`'s immediate `skipped:hash_unavailable`, which would spend the once-only step on one KMS blip); on the FINAL attempt finished `skipped:hash_unavailable` +
   `contact_ladder.hash_unavailable`, 6.37c's name), ⛔ other KMS or network call — the
   ladder `running` and the step `pending` (or WS8 (iii)'s retry form); the chase's stop predicate (`correctionFamilyStopReason(...,
   forLadder: true)` / `certificateLadderStopReason`) and `ladderEndReason` WITH the WhatsApp input — exactly as `begin*LadderSend` does;
   an end or stop ENDS the ladder and records nothing for the step (a leg: a call reached at 12:00 ⇒ ⛔ WhatsApp at 14:00; a correction
   resubmitted at 11:00 ⇒ ⛔ WhatsApp); WS10's stop; I2's basis; the horizon / pause / overtaken / window; THEN the config verdicts —
   AFTER the ends / stops, so an ended ladder records nothing for the step — with `enabled` + `phone_number_id` RE-READ here under the
   lock (`getWaConfig` is a DB read, ⛔ network — 6.31's begin reads the switch under its lock too), so a switch turned OFF after (1)
   is honoured; only the secrets / template name / helpline come from (1) (seconds stale — disclosed; a switch turned ON between (1)
   and (2) loses that ladder's step); then claims ONE
   `claim_contact_wa_sends` row (UNIQUE `ladder_id` — a second claim refused by the DB) and sets the step `sent`; COMMIT. (3) Decrypt,
   normalise, hash the number (a decrypt / KMS failure ⇒ a pre-send transient; on the final attempt `skipped:hash_unavailable` +
   `contact_ladder.hash_unavailable`); ≠ the ladder's hash ⇒ the row finished `no_target` (marker unset) and the ladder's own end rule; validate the bound values (the
   client's own `WhatsappTemplateParamError` rules) BEFORE the marker. (4) The marker (WS8 (ii) — `lost` ⇒ a transient; outside the window
   before it or after it commits ⇒ ⛔ sent, released if set, the child re-enqueued for the next 09:00). (5) Send through 6.31's client (`bodyParams` two values, the per-send timeout) — ⛔
   `dispatch()` / cascade / fixture (I5's symbol fence). (6) Finalise per WS8 (iv) — every kind of F3 (iii) mapped, in `-366` d2's
   order: `may_have_sent` ⛔ resent; `transient` (incl. `api_unavailable:000`) retried under WS8 (iii)'s re-check, else finished `skipped`;
   on the FINAL attempt finished `skipped:transient_exhausted`; `recipient` ⇒ `rejected_recipient`; `scope` (every 132xxx included) /
   `unknown_scope` ⇒ `refused` + the alarm, ⛔ a park. A crash after the marker ⇒ the sweep's finisher records
   `may_have_sent:lease_lapsed` (a leg); before it ⇒ re-taken by the sweep's lapsed-unmarked selection (a leg). The ladder runs on to SMS 2 whatever
   the outcome; ⛔ an SMS fallback.
7. **AC6 — Delivered ends it and counts.** Given the ladder's WhatsApp row gets `delivered` (or `read` with ⛔ `delivered` — a leg), when
   the next sweep / child re-check runs, then the ladder ends `ended_delivered` / `delivered:whatsapp` (either chase — `-360` Q2 A: a leg
   with the other chase's ladder still running) and a correction ladder's end lifts `ladder_running`; D22 (correction closure only)
   counts `reachedByLadderWhatsapp` per WS12 — the row's own `delivered_at`, its hash equal to the person's CURRENT hash, whatever the
   ladder's state (a leg: ladder 1 ended by a delivered WhatsApp, ladder 2 in the same epoch concludes undelivered ⇒ the person is STILL
   reached; a leg: a WhatsApp delivered after conclusion counts); a `failed` status or none ⇒ ⛔ end, ⛔ reach; a delivered status after
   conclusion leaves the conclusion and letter-eligibility as they are (LD17); a duplicate `delivered` (Meta's retries) changes nothing; a leg: the status is drained BEFORE the finalise wrote the wamid, the ladder
   ends through `whatsapp_send_status` (WS11 (1)) and `delivered_at` is copied — then a later ladder in the epoch concludes ⇒ still
   reached.
8. **AC7 — STOP and isolation.** Given the worker, when a STOP keyword arrives from (a) a non-member, (b) a member with an ACTIVE opt-in,
   (c) an EXPIRED member, then a claim-contact stop is recorded (in the ladder's `claim_contact_mobile` hash space, hashed from the DOMAIN
   `normalizeMobile`, inside the event's Pariwar scope) and audit-logged with its own action in all three; the member side is AS `main`
   STANDS AT BUILD — today (b)'s opt-in is REVOKED and (a) / (c) touch ⛔ member row (row 5-12 will change (c) under `-364` condition 3;
   the claim stop is recorded in every case); the step for that number then records `skipped:stopped`. When a `failed` status with a
   block code arrives for a CLAIM send whose recipient is also an opted-in member — matched by wamid OR, without a wamid match, by the
   recipient's CLAIM-space hash against the Pariwar's recent claim sends (WS11 (2)) — then the member's opt-in and consent are UNCHANGED
   and a wamid-matched claim row records `failed_at` + the code; the same status for a MEMBER-only send still blocks as today (a leg
   each). The claim branch acts only when `value.metadata.phone_number_id` equals the event Pariwar's configured `phone_number_id` (a leg:
   a mismatch ⇒ ⛔ claim action, a log line); the RLS-bound-role refusal ends the tick before any event is claimed (a leg).
9. **AC8 — Records.** The forward migration (WS8): the ladder grant / CHECK / trigger (an UPDATE from a skip or `sent` refused by the
   DB; `pending → sent | skipped:*` allowed) and the Drizzle `check()` copy in lockstep; `claim_contact_wa_sends` (6.31's marker shape —
   the marker-outcome CHECK in WS8 (ii)'s 6.37d mapping, ⛔ 0171's copied; a leg per outcome, the re-stamp trigger, the finished-row freeze EXCLUDING `delivered_at` / `failed_at` / `failure_code`, each
   set-once on an `accepted` row with a wamid; `recipient_number_hash` NOT NULL, written at the claim; `template_name` CHECK) and `claim_contact_wa_stops`, with RLS ENABLE + FORCE, per-command
   tenant policies, column grants to `twt_app` (a grant binds `twt_app` only — jobs bypasses it; the triggers are the jobs controls); the
   policy declaration files; the policy regression specs updated / added. ⚠ The access-wrapper gate does ⛔ cover the STOP recorder (it
   matches only `audit.writeAuditEntry(` and does ⛔ scan `apps/jobs`) — this story's own source fence pins `audit.withCompensatingAudit`
   and ⛔ `writeAuditEntry` in the recorder's file.
10. **AC9 — What staff see.** `follow_up.delivered_by` in both chases' DTOs (strict; lockstep legs); the admin line by channel; the
    microcopy gate.
11. **AC10 — Records and close.** ADR-0042's, ADR-0029's and ADR-0028's dated notes (WS14); the Panel "told" item WRITTEN (⛔ "told"
    until it goes out); the deferred-work 6.37c item *"The ladder's WhatsApp step"* → **Closed by 6-37d** (with the commit); W9 annotated
    (6.37d classifies a per-value 132xxx as `scope` and records it `refused` + alarm); the numbering-race item (annotated at Task 0.4); new deferred items for what this story discloses (the un-stop path; the at-most-once drain; the inbound non-STOP replies
    nobody reads; off-WhatsApp opt-out requests (T25); a delivery to a no-wamid `may_have_sent` row is unobservable; a post-send 500 / 503 retried under `-366` d2 may send twice (I4); the Meta-policy check
    if G3 (d) is open); the sprint row → `review` with a ledger entry; the epics.md entry's dated note.
12. **AC11 — Nothing else moves.** A diff fence: `dispatch.ts`, `cascade.ts`, `provider-composition.ts`, `contribution-notify.ts`,
    `pariwar_wa_templates`, the member opt-in state transitions (except AC7's claim branch), the SMS ladder steps / dates / conclusion /
    escalation / call record, the nominees' recipient gates, `apps/jobs/src/scheduler/claim-correction-sms-templates.ts` (both reminders'
    DLT templates live there) and `packages/channels/src/sms-dlt-registry.ts`, `correction_sms.*` / `certificate_sms.*` copy, 6.31's
    `peer-mesh-wa-reminder.ts` / `claim-peer-mesh-wa-reminders.ts` / `classifyDirectWaSendFailure` (reused, ⛔ edited — except
    `WaTemplatePurpose` widened, `TEMPLATE_NAME_FORM` exported, and `assertBodyParams` exported from `whatsapp-app.ts` / `@twt/channels`) — unchanged.
13. **AC12 — The proof.** `pnpm ci:local` on :5433 green (load timeouts re-run alone and SAID so — [[project_known_livedb_test_failures]]);
    the fetch recorder shows ⛔ call to `graph.facebook.com` outside injected fakes; the policy specs; contracts vitest run (they are
    outside tsc — [[project_contracts_tests_outside_tsc]]); the gates that bite here — microcopy (`claim.json` is in `copy_globs`;
    `apps/admin/src/**` in `code_globs`), i18n parity, dlt-typed-variables (it scans the new `apps/jobs/src` template file, comments
    included). ⚠ Gates that do ⛔ cover this story's new code — the access-wrapper gate (AC8) and domain-invariants' `clampLimit`, which
    scans Drizzle `.limit(` in `packages/domain/src` ONLY (a raw-SQL `LIMIT` or any `apps/jobs` query is clamped BY HAND, with a test).
    I5's symbol fence MIRRORS 6.31's `describe('I2 / AC8')` in `apps/jobs/tests/claim-peer-mesh-wa-reminders.test.ts` (`MODULES`,
    `stripComments`, `FORBIDDEN` + `createFixtureWhatsappProvider`, `sendClaimCorrectionSms`, `CLAIM_CORRECTION_SMS_TEMPLATES` — the
    ladder's OWN SMS path, which 6.31's list does ⛔ name — and a "the fence bites" leg that scans `claim-contact-ladder.ts` and finds
    `sendClaimCorrectionSms`) over this story's WhatsApp modules — which therefore live in a SIBLING of `claim-contact-ladder.ts` (T29); 6.31's "exactly ONE
    `createWhatsappAppCache(` in apps/jobs/src" leg must stay green. AC11's untouched-path diffs are NEW tests (human-actor and
    channels-determinism have nothing to scan here).

## Tasks / Subtasks

- [x] **Task 0 — governance FIRST (AC0). ⛔ No code.** ⭐ DONE 2026-10-20 — Debug Log (a).
  - [x] 0.1 `git fetch origin`; re-pin if `main` moved (`git diff --name-only 0e88ddd1..origin/main -- apps packages scripts`; re-derive
        any F3 shape that moved); re-grep `main`, EVERY branch (`git branch -a`) and every worktree for the next free decision id, roster
        row number, migration number + journal `when`, and ledger letter (T1; `-366` d6); check row 5-12's state (WS1). ⛔ File edits here — the decision entry
        (0.3) commits ALONE.
  - [x] 0.2 Put WS1–WS14 to BigDev, each with its recommendation and cost (incl. the §0 flags — WS2, WS3, WS4, WS7, WS10, WS12 — and
        WS8 (v) / WS9's NAMED divergences from `-365` WR7 / WR10); then PQ1–PQ3 — BigDev's §0 check FIRST (*"STRIP THE CITATIONS AND READ
        WHAT IS LEFT"*): route, or record as the author's. Record every answer verbatim (Debug Log).
  - [x] 0.3 Write the 6.37d entry (author-commit; its own §0 per WS; the WS3 widening, the WS4 / WS7 / WS10 stricter readings, F14's
        nominee disclosure, F16's withdrawal fact, F25's premise and PQ3's disposition stated; each divergence from `-365` WR7 / WR10
        recorded as NARROWING `-365` Consequence 2 for this row — ⛔ a re-reading); stage in the scratchpad; re-grep every branch for the
        id right before inserting; insert above the newest `### Decision` ([[project_decision_log_writes_user_inserted]] — try, verify
        additive-only, ask once if refused); it names what it supersedes IN PART (`-355` d3 — the WhatsApp step is ⛔ on the 10:00 run)
        and states WS12's reading of `-360` Q1 A verbatim; commit ALONE; write the SHA after the commit, ⛔ before. Then, if routed, the PQ
        note (WRITTEN, ⛔ sent).
  - [x] 0.4 The records commit: the G3 roster row `claim-contact-claimant-whatsapp-go-live` at the next free row number (WS4 — legs
        G3 (a)–(h), citing Row 35 (a) / (e) and Row 21 as shared preconditions) + deferred-work: the numbering-race item annotated (⛔
        fired — the plans moved to the next free numbers) + Row 18 dated note (the v2 marker) + Row 19 dated note (WhatsApp,
        Meta a processor) + Row 26 note (two new tenant tables); the epics.md entry's dated note (WS1 met; the G3 row named); this row's
        sprint comment (dated — the G3 row by key, ⛔ "Row 35"); ledger. ⛔ ADR-0028 / ADR-0042 / ADR-0029 yet (Task 10, with the code that
        makes them true).
  - [x] 0.5 ⛔ NEW counsel question. Counsel question 3 (written by 6.37c, ⛔ sent) is what G3 (b) waits on — REVISE it before it is sent
        (a dated *"Revised … before sending"* note, the document's own precedent): state that the filer or helpline caller may ⛔ be the
        claimant and ask whether that tick is a basis for WhatsApp to the claimant (F25, PQ3 — unless BigDev rules PQ3 otherwise); remind
        BigDev it is still unsent. ⚠ **As done:** ⛔ revision for PQ3 (dissolved — `-367` decision 17); a dated note records that question
        3's second half is moot if the Panel drops the clause, and the first-person wording.
- [x] **Task 1 — The agreement's versions and words (AC1; WS2).**
  - [x] 1.1 The registry in `packages/domain/src/claim/` (e.g. `claim-contact-agreement-copy.ts`, its own `'en' | 'hi'` type), exported
        via `index.ts`; v1 verbatim; v2; `claim-contact-copy.ts` re-exports (the api's imports unchanged).
  - [x] 1.2 en / hi `contact.agreement` = `-367` decision 2's v2 (first person, ⛔ the clause; Hindi WhatsApp = व्हाट्सएप) + the `$comment` markers; WS2 (iii) lines; the admin helpline copy
        (`apps/admin/src/modules/helpline-claims/i18n-en.ts`: `helpline.contact.duty`, `helpline.contact.savedAgreementIgnored`).
  - [x] 1.3 `ConsentPayloadSchema` / `ConsentPayload` declare `copyVersion`.
  - [x] 1.4 Tests: the lockstep (JSON ↔ registry current), v1 byte-identity to F11, the marker regex, the admin + mobile tests, parity,
        microcopy.
- [x] **Task 2 — The basis reader (AC2; WS3).** The reader in `claim-contact-check.ts` (or a sibling), reading `consent_payload`
      `copyVersion` + `locale`; unit legs for every reason; a live leg; the F13 callers' diff fence.
- [x] **Task 3 — Migration, schema, policies (AC8; WS8, WS10).** Forward migration at the next free number (journal `when` greater than
      the highest on `main` AND every branch — re-grep before the commit); the ladder `GRANT UPDATE ("whatsapp_step")` + the BEFORE UPDATE trigger refusing any change FROM a
      non-`pending` value + the ladder CHECK + its Drizzle `check()` copy in
      `packages/domain/src/schema/claim_contact_ladders.ts` in LOCKSTEP; Drizzle schema files for the two tables (`claim_contact_wa_sends`
      on 0171's marker shape with WS8 (ii)'s 6.37d marker-outcome CHECK — ⛔ 0171's `send_started_outcome_check` — `recipient_number_hash`
      NOT NULL, and the delivery-status columns outside the freeze); policy declarations; the ladder spec flip
      (T3) + two new specs; ⛔ data-export section (T20); apply to :5433 ONLY (⛔ :5432 — [[project_prepush_hook_inherits_5432]]).
- [x] **Task 4 — The pure rules (AC3, AC4, AC6; WS5–WS7, WS12).** `isClaimant` on both person types (in each recipient reader);
      `ladderWhatsappStep` by it; a `ladderWhatsappGate` (due time, `inWindow` / `nextWindowStart` as INPUTS, the extracted horizon / pause
      half of `ladderStepGate`, overtaken, stop, basis, config) returning `send | wait | skipped:<r>`; `ladderEndReason` WhatsApp input
      (`LadderEnd.detail` widened); D22's `reachedByLadderWhatsapp` on its OWN row (WS12 — the two-ladder leg); the quarter-hourly start's
      `sms2_due_on` rule (WS6); update the stale JSDoc on `ladderWhatsappStep` and the test title *"a claimant's waits for 6-37d"*
      (`contact-ladder.ts`, `contact-ladder.test.ts`) and 0169's *"row 6-37d may add values"* comment's successor in the new migration;
      unit legs for each verdict and order.
- [x] **Task 5 — The sender (AC5; WS8, WS9).** `apps/jobs/src/scheduler/claim-contact-wa-templates.ts` + its lockstep test (real `t()`,
      the `peer-mesh-wa-templates` shape); `WaTemplatePurpose` widened; `TEMPLATE_NAME_FORM` exported from 6.31's module and reused; the
      domain begin (with the two-half re-check — WS8 (iii) (2)) / marker / release / transient-note / finalise / final-attempt finish /
      row skip (AC5's preamble) / lapsed-finisher / no-target functions on 6.31's shapes (`peer-mesh-wa-reminder.ts`), with
      `CONTACT_LADDER_WA_LEASE_MS` and the claim-time `recipient_number_hash`; `assertBodyParams` exported; the send through 6.31's client + the ONE cache + `resolveChannelSecret`; every classifier kind mapped
      per WS8 (iv); ⛔ fixture.
- [x] **Task 6 — The jobs (AC4, AC5).** A quarter-hourly `claim.contact_ladder.whatsapp_sweep` (queue names in `packages/queue`; IST;
      around the clock; registered beside `registerContactLadderWorkers` from a SIBLING module (the I5 fence — AC12), with an expiry /
      singleton shorter than `CORRECTION_SWEEP_EXPIRE_SECONDS`, ⛔ the daily `console.info` summary on every tick): the lapsed-marker
      finisher; the START for new reports (AC4's `reported_at` window, ⛔ `advance`) sharing the extracted START with the 10:00 sweep, and
      6.37c's LD13 tail for its own starts (the IST-day burst check, the `hash_unavailable` alarm — AC4); the due-step selection (SQL
      only — pending steps AND lapsed unmarked `attempting` rows whatever the ladder's state, WS8 (iii) (1)) enqueuing children only inside the window; a child per ladder (`singletonKey '<ladderId>:wa'` — a LABEL only: on a standard-policy queue pg-boss 12 does ⛔ dedupe it, so the
      chase lock, the UNIQUE `ladder_id` and the holder CAS are the dedup and a duplicate exits `held_by_other`) in
      AC5's ORDER with the stale-window guard, the `finalAttempt` finish (WS8 (iv)) and the self-re-enqueue for the next 09:00 (WS8 (ii)); the RLS-bound-role refusal (6.37c T24); reading `pariwar_wa_config` (granted to `twt_app`
      only — the Row 26 note); any raw-SQL `LIMIT` clamped by hand (AC12).
- [x] **Task 7 — The webhook worker (AC6, AC7; WS10, WS11).** The RLS-bound-role refusal (ends the tick before any claim); parse
      `value.metadata.phone_number_id` and act on the claim branch only on a match; the claim branch inside
      `withPariwarScope(event.pariwarId)`; STOP ⇒ the claim stop in the `claim_contact_mobile` hash space (deps take the full
      `jobsEncryption`; hashed from the DOMAIN `encryption.normalizeMobile`) + its own audit action through `audit.withCompensatingAudit`
      (+ the member path as `main` stands); the status branch: by claim wamid ⇒ `delivered_at` (on `delivered` or `read`) / `failed_at`,
      set-once; a block-coded `failed` with ⛔ wamid match ⇒ the recipient's claim-space hash against recent claim sends ⇒ member revoke
      skipped (WS11 (2)); legs (a)–(c), both status legs, the `read`-only leg, the metadata-mismatch leg, the duplicate-status leg.
      A leg pins that the stop hash and the ladder hash agree for the same number written several ways (`+91…`, `91…`, a bare 10
      digits) — both through the DOMAIN `normalizeMobile` (v1.1's worker ↔ api parity pair is the wrong pair).
- [x] **Task 8 — Staff view (AC9; WS13).** `LadderViewFact` / `ladderFollowUpOf` → `delivered_by`; contracts + lockstep; api DTO mapper;
      `ContactLadderLines.tsx` + i18n-en.
- [x] **Task 9 — Alarms and fences (AC11, AC12; WS14 (ii)).** Log lines and the two alarms; the symbol fence (I5, mirroring 6.31's); the
      recorder's audit source fence (AC8); the untouched-path diffs; `ci:local` on :5433; the gates.
- [x] **Task 10 — Records and close (AC10).** ADR-0028, ADR-0042 and ADR-0029 dated notes; the Panel "told" item WRITTEN (the forgery
      bound's widening — ⛔ told until sent); deferred-work dispositions with their status words ([[feedback_closure_language_precision]]) and
      the new items AC10 lists; the epics.md entry's dated note; Debug Log, Completion Notes, File List; status + sprint row → `review`; ledger.

### Review Findings

**Code review, 2026-10-20 — full branch `0e88ddd1..d1e4e974`: 77 files, 6,997 additions / 116 removals.**
Three independent layers (Blind Hunter, Edge Case Hunter, Acceptance Auditor), followed by source verification and isolated
reproductions. **0 decision-needed, 9 patch (4 HIGH / 4 MEDIUM / 1 LOW), 0 defer, 2 dismissed.**
All retained findings are engineering decisions under the routing template's §0; none needs a trustee ruling.
⭐ **Patches applied 2026-10-20 (see "Patches applied" below) — all 9 findings fixed, R1–R9, all adversarially re-verified
in a fresh context (zero new bugs across both the production-code patches and the R8 test additions).**

- [x] [Review][Patch] **R1 — HIGH: honour every STOP sender within one webhook.**
  [apps/jobs/src/claim-contact-wa-stop.ts:32] — AC7 / I8 / WS10. The worker loops through all messages but passes the enclosing
  event ID to every STOP recorder call. Both the precheck and migration 0172's `claim_contact_wa_stops_event_uq` identify only
  `(pariwar_id, inbound_event_id)`: the second sender is treated as an already-recorded replay. Live reproduction: two different
  senders in one payload produce ONE stop, so the other number remains eligible. Scope replay identity to the individual message
  or `(event, recipient hash)` in BOTH the recorder and the DB constraint; prove a batched payload and its replay.
- [x] [Review][Patch] **R2 — HIGH: re-check current claimant status under the send lock.**
  [packages/domain/src/claim/contact-ladder-whatsapp-record.ts:328] — I1 / AC3 / AC5 / WS5. `isClaimant` selects `pending` only at
  ladder insertion. The begin re-loads the current recipient but checks only that the person exists, not that they remain the
  claimant. Certificate reproduction through the REAL `writeClaimContact` in a full-writable state: start nominee A's pending
  ladder; save nominee B as claimant with a fresh v2 agreement; A remains a normal nominee and A's old ladder sends WhatsApp.
  Carry current `isClaimant` into the locked verdict, terminally skip former claimants on first visits AND retries, and prove
  both chase paths. This is distinct from R3: this case DOES record a fresh agreement for B.
- [x] [Review][Patch] **R3 — HIGH: do not transfer a first-person WhatsApp agreement to a replacement claimant.**
  [packages/domain/src/claim/claim-contact-whatsapp-basis.ts:75] — I2 / AC2 / the explicit affirmative capture in `-357`.
  The new basis reader verifies a claim-wide agreement's version and revocation but never associates it with the recipient
  who agreed. The existing helpline full-write path can change claimant without `agreed` and keeps the old agreement
  (`claim-contact-persist.ts`, W6 / W8). Certificate reproduction through the REAL writer: A's live v2 agreement; change to B
  without a new tick; start B's ladder; WhatsApp is accepted using A's agreement. Preserve evidence of which claimant/number
  supplied the agreement and fail the WhatsApp basis after a recipient change until a fresh affirmative agreement covers that
  recipient. Preserve the existing non-WhatsApp agreement gates; correcting only R2 does not close this path.
- [x] [Review][Patch] **R4 — HIGH: keep claim-status member isolation when the configured WhatsApp number changes.**
  [apps/jobs/src/wa-webhook-processor.ts:419] — I7 / AC7 / WS11. A legitimate callback from the old number fails the comparison
  against today's `phone_number_id`, leaving `claimOwned = false`; the subsequent MEMBER block path runs even when its wamid
  identifies an accepted claim send. Live reproduction: accepted claim send to an ACTIVE member, rotate the Pariwar's number,
  process the old number's failed callback (131026) — the member becomes `BLOCKED_BY_META`. Keep the claim-write metadata guard,
  but do not let its rejection authorize a member revocation for a claim callback; retain ownership across configuration
  changes or fail closed for that status. The person's own inbound STOP remains a separate action.
- [x] [Review][Patch] **R5 — MEDIUM: age claim-send isolation from the current attempt.**
  [packages/domain/src/claim/contact-ladder-whatsapp-record.ts:858] — I7 / AC7 / WS8 / WS11. The fallback ownership lookup ages
  an in-flight row by immutable `created_at`, although a crashed UNMARKED row can be reclaimed much later and this story has no
  72-hour send bound. A freshly reclaimed attempt on an eight-day-old row is excluded before its wamid has been finalised;
  its block callback falls into member revocation. Live reproduction with old `created_at` and current `claimed_at` changes
  an ACTIVE member to `BLOCKED_BY_META`. Use the current claim/send attempt time (and retain in-flight protection) so the
  seven-day lookback does not expire a send made now. Add a reclaim-before-finalise callback leg.
- [x] [Review][Patch] **R6 — MEDIUM: concurrent sweeps can suppress the burst alarm entirely.**
  [apps/jobs/src/scheduler/claim-contact-ladder.ts:349] — AC4 / WS14 / ADR-0042's disclosed forgery bound. The daily and new
  quarter-hourly sweep can each commit three disjoint starts for one Pariwar before either reads the day's count. Both read
  six and calculate `n - mine = 3`, so neither emits an alarm. The comment/spec claim that neither can miss is false.
  A deterministic reproduction calls the REAL alarm helper with two tallies of three and the committed count of six: zero
  alarms. Coordinate threshold notification durably or accept duplicate alarms above the threshold; prove the overlapping
  sweeps and correct the corresponding concurrency claim in the records.
- [x] [Review][Patch] **R7 — MEDIUM: enforce the two-hour report window on each selected origin.**
  [apps/jobs/src/scheduler/claim-contact-ladder-whatsapp.ts:182] — AC4 / T4. The scan filters recent reports, then discards
  their origin IDs and passes only claim IDs to `startContactLaddersForClaim`. Both shared planners consider the whole claim's
  fourteen-day candidate set. Live reproduction: a recent failure for person A and an unladdered three-hour-old report for B
  start TWO ladders during the quarter-hourly tick; B's origin was supposed to wait for the daily sweep. Carry eligible origin
  IDs or the report cutoff into the shared start and apply it to the actual origin, for both chases.
  **Regression leg added 2026-10-20:** `apps/jobs/tests/claim-contact-ladder-whatsapp-live.test.ts` "R7 — the quarter-hourly
  start enforces the two-hour window per ORIGIN" — two people on one claim, a fresh report and a 3-hour-old report; RED
  before the fix (2 ladders), green after (1 now, the second at the next 10:00 sweep) — confirmed by temporarily disabling
  the fix's two gating lines and re-running.
- [x] [Review][Patch] **R8 — MEDIUM: complete the required live acceptance and concurrency proof.**
  [packages/domain/tests/integration/claim/contact-ladder-whatsapp.spec.ts:135] — AC3–AC6 / AC12 / checklist families 2 and 10.
  The new record wrapper hardcodes `chase: 'correction'`, and the new jobs live suite also covers correction only; the distinct
  certificate prelock/source/pause branch lacks its required WhatsApp legs. Holder and marker tests are sequential on one
  connection, not true two-connection races. Also absent are the required late-correlator (>2-hour receipt lag), 20:00 release
  -> 09:00 new-job/config-off finish, delivery first arriving after conclusion, and other-chase independence legs. Add those
  live proofs and accurately qualify completed-task/proof claims until they pass. Temporary review reproductions are not a
  substitute for committed acceptance tests.
  **Patched 2026-10-20 — all six named legs added, in two passes.** Pass 1: ONE true two-connection race
  (`apps/jobs/tests/claim-contact-ladder-whatsapp-live.test.ts`, "R8 — two concurrent children on the SAME ladder, two
  separate connections") — two real `runContactLadderWhatsappChild` calls on separate pool connections racing the SAME
  send row; exactly one `sent` / one `noop` / one real request. Pass 2 (same file unless noted): **the late-correlator
  leg** ("R8 — the late-correlator leg") — a report whose `received_at` is 3 h old though the correlator's write lands
  now; the quarter-hourly start misses it, the 10:00 sweep does not. **The 20:00 release → 09:00 config-off finish leg**
  ("R8 — a row released at 20:00…") — the real `beginContactLadderWhatsapp` → `markContactLadderWhatsappInFlight` →
  `releaseContactLadderWhatsappInFlight` chain, on its OWN Pariwar (⛔ the shared `PARIWAR` constant left disabled for
  later tests); the lapsed-unmarked row is re-taken by a NEW job id the next 09:00 and finishes
  `skipped:whatsapp_not_configured`; ⛔ re-selected at 09:15. **The certificate-chase happy path** ("R8 — CERTIFICATE
  chase…") — `seedCertWait` (ported from `claim-contact-ladder-live.test.ts`'s `seedWait`, + a v2 WhatsApp-eligible
  agreement that fixture lacks) reaches a genuinely running, `pending`-step certificate ladder through the REAL
  `runCertificateReminderSweep` / `runContactLadderWhatsappSweep` / `runContactLadderWhatsappChild` path (CR7 pre-lock
  included) — the row ends `accepted`. **Other-chase independence** (domain spec,
  `contact-ladder-whatsapp.spec.ts`) — proved at `readClaimLadders`'s `chase` SQL filter directly (a sweep-level version
  was attempted first and abandoned: `seedReturnedClaim`'s baked-in ACCEPTED certificate makes ANY certificate run on
  that claim self-stop immediately under CR5, in both `missing` and `rejected` causes — not a fixture one can route
  around, so the mechanism-level proof is the correct one, not a lesser one). **Delivered after the ladder's own
  conclusion** (same domain spec file) — the SAME ladder set `concluded_undelivered` BEFORE its delivery is known;
  `reachedByLadderWhatsapp` flips false → true on the late `recordClaimContactWaStatus` call, while `state` /
  `concluded_on` stay exactly as concluded (LD17). Verification: `tsc` clean; 362 tests green on :5433 (263 domain + 99
  jobs across 4 files, zero regressions, each file run alone per the known cross-file DB-lock-contention gotcha); a
  fresh-context adversarial review of all six new tests (vacuous-assertion, pollution, false-precision, fixture-shortcut
  checks) — all CONFIRMED-SOUND, none flawed.
- [x] [Review][Patch] **R9 — LOW: document the new deliberate cross-tenant bypass completely.**
  [apps/jobs/src/scheduler/claim-contact-ladder-whatsapp.ts:168] — checklist family 9. `listNewReportClaims` identifies its
  BYPASSRLS pool but lacks the required explicit `DELIBERATE` block with rationale and a re-examination trigger. Document the
  intended IDs-only cross-tenant scan, scoped locked mutations and conditions requiring re-review, following the new domain
  due-selector/finisher's existing pattern.

**Verification recorded by this review:**

- Existing domain record + both policy suites: **112/112 passed** on :5433. Existing jobs WhatsApp live/rules/templates and
  webhook suites: **82/82 passed** on :5433. Full `ci:local` was not re-run by this review.
- Isolated review harnesses live under `/private/tmp/twt-6-37d-review/`, outside the repository. Their expected-behaviour
  assertions are RED for R1–R7: batched STOP, former claimant (including a certificate transition through the real writer),
  replacement claimant without a new tick, number rotation, old-row/current-attempt isolation, burst suppression, report window.
  R5 uses a seeded reclaimed-row shape; R6 injects the committed day count into the real helper, not a live two-sweep race.
- Re-run from the worktree with local :5433 `DATABASE_URL`:
  `pnpm exec vitest run --config /private/tmp/twt-6-37d-review/vitest.config.mjs -t 'review repro'`.
  Every WhatsApp call in those reproductions uses injected fake fetches. The first certificate harness attempt hit its test
  gateway request-ID CHECK; the fixture was corrected before the claimant assertions reproduced. That fixture error is not a
  product finding. Initial sandbox `EPERM` DB failures were re-run outside the sandbox; the 194 existing tests then passed.
- Dismissed candidates (2): an old installed client being stamped v2 was not established against a supported mixed-version
  deployment contract here; recovery of an unmatched pre-finalise FAILED callback is not part of the specified delivery-only
  reconciliation, and no additional required behaviour regression was established. Previously disclosed/deferred risks remain
  disclosed; they were not counted as new findings.

**Load-bearing invariant lens (only the touched families):**

| Family | Verdict / evidence |
|---|---|
| 1 — state guards | **REAL GAP R2**; otherwise chase stop/end rechecks and absorbing step/finished-row triggers cover by construction. |
| 2 — concurrency/idempotency | **REAL GAP R1, R6, R8**; sequential holder/marker tests do not establish live races. |
| 3 — tenant/actor boundaries | **Covered by test:** policy specs' scope A/B, fail-closed, cross-tenant INSERT, and worker RLS-role refusal legs. Human-route actor rejection is **not constructible here:** no new human mutation route. |
| 4 — consumer payloads | **Covered by construction:** ID-only jobs retain tenant/claim/ladder correlation; no new claim event/reducer case is owed. |
| 5 — DB backstops | **REAL GAP R1** in stop uniqueness; other CHECK/FK/FORCE/grant/trigger legs passed in the two policy suites. |
| 6 — projection/snapshot discipline | **Covered by construction:** explicit projections, preserved v1 evidence, immutable send identity and bounded detail grammar; recipient/basis correctness separately has **REAL GAP R2/R3**. |
| 7 — aggregates | **REAL GAP R6:** direct counts avoid fan-out but their threshold coordination is not concurrency-safe. |
| 8 — audit/attribution | **Covered by test:** NON-member STOP audit/replay leg; compensating audit precedes writes by construction. True concurrent proof remains **REAL GAP R8**. |
| 9 — deliberate bypass | **REAL GAP R9**; domain selector/finisher already carry explicit deliberate blocks. |
| 10 — closure honesty | **REAL GAP R8:** required evidence is missing. Accepted risks are disclosed and not reclassified. |
| 11 — policy meaning | **Covered by construction:** the story states the family-facing reach/earlier-closure consequence and governing rulings; no Niyamavali delivery-channel clause is asserted. |
| 12 — cross-member ownership | **REAL GAP R2/R3/R4/R5**; tenant/claim/chase resource matching and finished-send rejection otherwise cover by construction. |
| 13 — semantic accessibility | **Covered by construction:** changed web surfaces retain semantic text and `role="status"`; no new native labelled container, measurable role or handlerless interaction. |

**Patches applied, 2026-10-20 — "Apply every patch" (BigDev).** All nine findings fixed. R8's own line above has the
full six-leg breakdown.

- **R1** — `claim_contact_wa_stops_event_uq` widened to `(pariwar_id, inbound_event_id, recipient_number_hash)` by a NEW
  FORWARD migration **0173** `0173_claim-contact-wa-stop-per-sender.sql` (migration 0172 is already applied on :5433 —
  [[project_live_db_test_gotchas]] — never edited in place); the schema's `unique()` call and the pre-check SELECT in
  `claim-contact-wa-stop.ts` widened to match.
- **R2** — `ChaseFacts.person`'s `Pick` widened to carry `isClaimant` (already computed live by `readCorrectionRecipients` /
  `readCertificateRecipients` under the same lock); `beginContactLadderWhatsapp` now skips `no_longer_claimant` right after
  the existing `facts.person === null` check, covering first-visit and re-take alike through the existing `recordSkip`.
- **R3** — two new `claim_contacts` columns (migration **0174** `0174_claim-contact-agreement-claimant-generation.sql`):
  `claimant_generation` (bumped on every W6 `writeSide` write) and `agreement_claimant_generation` (stamped to it on every
  W8 `recordFresh` write, same statement, same resulting number). `readClaimantWhatsappBasis` fails `claimant_changed` when
  they disagree.
- **R4** — the status-callback ownership match (`wa-webhook-processor.ts`) no longer gated behind `isClaimBranchOpen()`
  (a `phone_number_id`-vs-today's-config check); the STOP-recording path keeps that gate, untouched.
- **R5** — `hasRecentClaimContactWaSendTo`'s 7-day isolation window now filters on `updated_at` (bumped by every claim /
  reclaim / marker / finalise / status write), not the immutable `created_at`.
- **R6** — `raiseLadderStartAlarms`'s de-dup conjunct (`n - mine < THRESHOLD`) removed; any run that both started something
  today and sees the day at/past threshold alarms — duplicates accepted over a silent miss (onAlarm is log-only today,
  disclosed, roster Row 32 (h)).
- **R7** — `listNewReportClaims` now returns each claim's full `reminderIds` set (`array_agg` under a `GROUP BY`, keyset
  pagination re-verified sound); `StartsOnly.eligibleOriginRowIds` carries it into `planCorrectionLadders` /
  `planCertificateLadders`, which skip a chosen origin that is not in that set. A regression leg added 2026-10-20 (two
  people, one claim, one fresh / one 3-hour-old report) — RED before the fix, green after, confirmed by disabling it.
- **R8** — see its own line above for the full six-leg breakdown (two-connection race, late-correlator, 20:00→09:00
  config-off finish, the certificate-chase happy path, other-chase independence, delivered-after-conclusion) — all six
  of AC3–AC6/AC12's named gaps now have a live test.
- **R9** — `listNewReportClaims` now carries the `DELIBERATE` / `RE-EXAMINE when:` block this file's sibling functions use.

**Verification:** `tsc --noEmit` clean on `@twt/domain` and `@twt/jobs`. Migrations 0173/0174 applied on :5433 and checked
against `information_schema` directly. 362 tests green on :5433, zero regressions, run file-by-file (a combined 4-file run
hit an unrelated cross-file DB-lock-contention hang in `wa-webhook-processor.test.ts`'s `afterAll` — confirmed NOT a
regression by re-running that file alone, 15/15 green in 460 ms): domain 263/263 (`contact-ladder.test.ts`,
`claim-contact-whatsapp-basis.test.ts`, `claim-contact-agreement-gate-fence.test.ts`, the claim-contact / contact-ladder-whatsapp /
contact-call integration specs, both RLS policy-regression specs — incl. the new "other-chase independence" and
"delivered after conclusion" R8 legs); jobs 99/99 across `wa-webhook-processor.test.ts` (15),
`claim-contact-ladder-live.test.ts` (24), `claim-contact-ladder-whatsapp-live.test.ts` (27, incl. the R8 race test, the
R7 regression leg — confirmed RED by temporarily disabling the fix, then green again — the late-correlator leg, the
20:00-release/config-off-finish leg and the certificate-chase happy path), `claim-contact-ladder-whatsapp.test.ts` (33).
Three parallel fresh-context adversarial reviews of the production-code patches' OWN diff (grouped R1+R4, R2+R3+R5,
R6+R7+R9) — CONFIRMED-FIXED on all nine, zero new bugs found — plus a FOURTH, separate fresh-context review of the six
new R8 test additions for vacuous assertions, cross-test pollution and fixture shortcuts — all CONFIRMED-SOUND.

## Dev Notes

### TRAPS

- **T1 — Numbers.** `-366` d6: *"the number belongs to the first COMMIT that takes it on any branch"*. v1.1's planned `-364` / Row 35 /
  0171 were taken by 6.31 (with ledger `19c`–`19i`; `19b` is this story's own create-story letter). Re-grep `main`, EVERY branch and every worktree at Task 0.1, again right before the decision
  insert (0.3), the records commit (0.4) and the migration commit (Task 3); write a SHA only after its commit.
- **T2 — The fixture lies.** `createFixtureWhatsappProvider` (`fixture-whatsapp.ts`) reports `accepted` with `providerMessageId:
  'fixture-whatsapp'` — a step "sent" that never went. ⛔ Any path to it (I5; the symbol fence names it).
- **T3 — `pending` used to be impossible to move.** 0169 made `whatsapp_step` identity (F2); the spec asserts 42501 on its UPDATE and
  the CHECK refusing `'sent'`. Flip the spec deliberately and add the "only from pending" trigger leg — ⛔ delete the old assertion
  silently.
- **T4 — KMS per HMAC.** One audit line per HMAC under a global lock ([[project_kms_audit_per_hmac_global_lock]]); a quarter-hourly
  sweep that reused the 14-day candidate set would multiply that ≈ 96×/day around the clock (`planCertificateLadders` hashes every person
  of every candidate claim on every run). The due-step selection is SQL only and the sweep starts ONLY for new reports (AC4) — the
  START's per-person hashing is then paid once per new report. The CORRECTION WhatsApp child hashes its one number at AC5 (3), plus whatever `correctionFamilyStopReason(..., crypto)` already hashes
  under the trustee lock (AC5 (2), the `beginCorrectionLadderSend` precedent); the CERTIFICATE child
  hashes every person once before the lock (`certificateLadderStopReason` needs all of them — as the certificate SMS child already does).
  The STOP path pays ONE `correctionNumberHash` per inbound STOP; the block-code isolation one per block-coded failed status (WS11).
- **T5 — The anchor.** `created_at` of the ORIGIN row (never moves; `readLadderOriginCreatedAt` already reads it). ⛔ `claimed_at` — it is
  RE-SET on every re-claim (own retry or an expired lease — `correction-reminder-record.ts` / `certificate-reminder-record.ts`), so it is
  the latest attempt's time; ⛔ `updated_at` (finalise moves it); ⛔ `sent_on` (a date). Live fixtures seed `created_at` explicitly.
- **T6 — The import direction.** `packages/domain` / `apps/jobs` cannot import `apps/api`; the registry lives in domain and the api
  re-exports; `packages/domain` has ⛔ `@twt/contracts` dependency (its own locale type). ⚠ A type-only → value import can materialise a
  runtime cycle ([[project_type_only_import_cycle_trap]]).
- **T7 — Fixtures without a version.** Many fixtures seed `consent_payload` without `copyVersion`; the reader treats them as the OLD
  wording (correct). Live legs that need an eligible claimant must seed v2's id explicitly — ⛔ loosen the reader.
- **T8 — Two languages, two reviews (and the DLT gate).** The agreement's Hindi (G3 (a)) and the certificate reminder's Hindi (Row 21)
  are separate reviews; the WhatsApp templates copy the SMS words byte for byte — a later change to an SMS text must re-submit BOTH its
  DLT and its Meta template.
- **T9 — Meta language codes.** `en`, `hi` (6.31's shipped `{ en: 'en', hi: 'hi' }`), ⛔ `en_US`; a template approved in one language is
  ⛔ approved in the other.
- **T10 — Scope-wide refusals.** The `scope` kind (F3 (iii): `DIRECT_WA_SCOPE_CODES`, `template_not_approved` / `auth`, 401 / 403) is
  Pariwar-wide; record + alarm, ⛔ retry every ladder (the next ladders will refuse the same way — the alarm is the signal). 131048 arrives
  on a 429 and 131057 on a 503 — the classifier tests scope BEFORE status; ⛔ re-order it.
- **T11 — `may_have_sent` is final; a connect failure is ⛔ may-have-sent.** Status 0 with ⛔ `transport: 'connect'`, a 2xx without a
  wamid, a 502 / 504 ⇒ ⛔ resend (I4); the step stays `sent`. A connection that never opened (`api_unavailable:000`, `-366` d1) is a
  `transient` — retried under WS8 (iii).
- **T12 — The window is IST.** Reuse `isInPeerRequestSendWindow` / `nextPeerRequestSendWindowStart` (`(now: Date)`, 09:00–20:00 IST) —
  ⛔ a second window, ⛔ `new Date().getHours()`. They live in `apps/jobs/src/scheduler/claim-peer-mesh-requests.ts` (6.31 reuses them too)
  — the pure domain gate takes their results as inputs (T6). Re-checked at the claim, at the marker and after the marker (WS8 (ii)).
- **T13 — One start path.** The quarter-hourly sweep and the 10:00 sweep must call the SAME start function under the SAME chase lock
  (`acquireCorrectionChaseLock` / `lockCertificateClaim`) — a copy drifts; two starts for one origin are ALREADY absorbed
  (`insertContactLadder` is `.onConflictDoNothing()` on `claim_contact_ladders_origin_uq` and the plan `continue`s) — keep it so. The
  quarter-hourly path calls the START only, ⛔ `advance` (F18), with WS6's `sms2_due_on` rule.
- **T14 — The claimant-nominee number.** For a claimant-nominee the ladder's number is the NOMINEE record's mobile (F17) — the
  WhatsApp goes to the number whose SMS failed, ⛔ a `claim_contacts` claimant mobile.
- **T15 — A status the claim row cannot match.** Three paths leave a claim send's status with ⛔ wamid match (WS11): a lapsed
  `may_have_sent` row, a `may_have_sent:timeout | network` row, a status drained before the finalise. Write the wamid in the same
  statement that records `accepted`; then WS11's rule — delivered also read from `whatsapp_send_status` at finalise / the 10:00 end
  check and COPIED into `delivered_at` (so D22 sees it); block isolation by the recipient's CLAIM-space hash
  (`encryption.normalizeMobile(status.recipient_id)` ⇒ `null` ⇒ ⛔ match, else `correctionNumberHash(e164, event.pariwarId,
  jobsEncryption)` — ⛔ the worker's member blind index, a different space, never equal).
- **T16 — The drain is at-most-once (F8).** ⛔ Promise "ever delivered" beyond what arrives; disclose (AC10).
- **T17 — The agreement payload's locale ≠ the claim's contact locale.** I2's Hindi check reads the AGREEMENT's locale (the text the
  claimant saw); the template language is the claim's `contactLocale` (the language they are written to) — two fields, keep both.
- **T18 — Prettier is not enforced** — hand-format; ⛔ `--write` whole files ([[project_prettier_not_enforced]]).
- **T19 — JSDoc emphasis.** `**cl.3**`-style emphasis inside a JSDoc can close it (`**/`) ([[project_markdown_emphasis_closes_jsdoc]]).
- **T20 — Data export.** `data-export/assemble.ts` reads ⛔ claim-contact or WhatsApp table — ⛔ add the new tables (a new section needs
  its contract field or EVERY export fails — [[project_data_export_sections_strict_parsed]]).
- **T21 — Hash spaces.** The ladder, its send rows and the new stop table use `claim_contact_mobile` (`correctionNumberHash`); the WhatsApp
  worker and opt-ins use `member_mobile` (`memberMobileBlindIndex`, the login key). ⛔ Ever compare across them; ⛔ store the member index
  on a claim row.
- **T22 — Row 5-12 shares the worker.** `5-12-whatsapp-yes-lasts-until-withdrawn` (backlog, `-364`) changes the member STOP half (an
  EXPIRED member's STOP will revoke) and is the trigger of the `WA_BLOCK_ERROR_CODES` deferred item. Keep the claim branch BEFORE and
  independent of the member lookup; AC7's member legs assert *"as `main` stands at build"* — ⛔ hard-code today's EXPIRED behaviour as a
  requirement.
- **T23 — A gate that looks like coverage.** The access-wrapper gate matches only `audit.writeAuditEntry(` (a property access on an
  identifier `audit`) and scans `CHANNEL_ROOTS` + `CLAIM_ROOTS` — ⛔ `apps/jobs`; `domain-accessor-invariants` scans Drizzle `.limit(` in
  `packages/domain/src` only. Green proves nothing for this story's jobs code ([[feedback_gate_scope_semantic_coverage]]) — its own
  fences carry it (AC8, AC12).
- **T24 — A late WhatsApp.** Meta's default TTL for a utility template is 30 days: a message to a switched-off phone can land after
  SMS 2 / 3, after the conclusion, after the claim moved on (*"Your claim is still open."*). The 12 h TTL is set ON THE TEMPLATE at
  creation — the code cannot set it per send. ⚠ G3 (c), which would have checked it, was DROPPED (`-367` decision 4): set it when the
  templates are created anyway; its absence is an ACCEPTED risk (Row 36 notes).
- **T25 — Off-WhatsApp opt-outs.** Meta's policy: *"You must respect all requests (either on or off WhatsApp)"*. v1 honours only a STOP
  keyword in a `text` message; a request to the helpline or a free-text reply has ⛔ route — disclosed, deferred, G3 (g).
- **T26 — Which Pariwar sent it.** The event's Pariwar is the URL's; the claim branch also checks `value.metadata.phone_number_id`
  against that Pariwar's configured `phone_number_id` (WS11) — ⛔ act on a mismatch.
- **T27 — A helpline value can break the send.** A parameter value with a newline, a tab or 4+ spaces is refused by Meta, and a per-value
  132005 / 132012 / 132018 is classified `scope` (every 132xxx is `template_not_approved` — deferred W9: *"filed as scope-wide … Row
  6-37d is a second consumer"*); the helpline is a config value.
  Validate it before the send (⇒ `skipped:helpline_unreadable` + the alarm `contact_ladder.whatsapp_config_fault` — the class 6.31 logs as
  `config:helpline_unreadable`) so one bad value is ⛔ a Meta refusal on every ladder.
- **T28 — Copying 0171's freeze.** 0171's trigger freezes every delivery column once the row is ⛔ `attempting`; the webhook worker writes
  `delivered_at` / `failed_at` / `failure_code` on an `accepted` row — exclude them (set-once) or every delivered status raises
  `integrity_constraint_violation` (WS8 (ii)).
- **T29 — The fence needs a sibling module.** `claim-contact-ladder.ts` sends SMS through `sendClaimCorrectionSms` /
  `CLAIM_CORRECTION_SMS_TEMPLATES` — symbols 6.31's `FORBIDDEN` does ⛔ name (its file scans clean against that list), so this story's
  fence ADDS them (AC12); a WhatsApp sweep / child inside that file could then never pass it. Put them in a sibling (e.g. `claim-contact-ladder-whatsapp.ts`) — which also keeps the 1,288-line file
  from growing.
- **T30 — Graph API version.** `pariwar_wa_config.graph_api_version` defaults to `v21.0`, which Meta expires 2027-01-21 — provision ≥
  `v23.0` at Row 35 (a) / G3; the client pins whatever the row says.

### Reuse map

| Need | Reuse | ⛔ Rebuild |
|---|---|---|
| Ladder start / lock | 6.37c's start part of `planCorrectionLadders` / `planCertificateLadders` (extracted) | a second start |
| Stops / ends before a send | `correctionFamilyStopReason(..., forLadder: true)` / `certificateLadderStopReason` + `ladderEndReason`, as `begin*LadderSend` | a WhatsApp-only stop list |
| Horizon / pause | `ladderStepGate`'s rules (horizon, then pause — separable) | a WhatsApp horizon |
| Window | `isInPeerRequestSendWindow` / `nextPeerRequestSendWindowStart` | a new window |
| WA client / cache / secret | `bodyParams` + `timeoutMs`; `ContributionProviderWiring.whatsappAppCache`; `resolveChannelSecret` (F3) | a second `createWhatsappAppCache()` |
| Outcome classes | `classifyDirectWaSendFailure` (F3 (iii)), unedited | a new code table |
| Send record / marker / finisher | `peer-mesh-wa-reminder.ts` + 0171's shapes (WS8) | a fresh once-only design |
| Template name | `waTemplateConfigKey` (purpose widened) + `resolveSmsDltConfig` + `TEMPLATE_NAME_FORM` | a second key family |
| Template copy + lockstep | `peer-mesh-wa-templates.ts` / its test | a stubbed `t()` |
| Symbol fence | 6.31's `describe('I2 / AC8')` | a prose "nothing else moves" |
| STOP keywords / number hash | the worker's `isStopKeyword`; the DOMAIN `normalizeMobile` + `correctionNumberHash` (the claim hash space — T21; the member path keeps `memberMobileBlindIndex`) | a second keyword list |
| Number / locale | the chase recipient readers, `resolveCorrectionMobile`, `correctionNumberHash` (both chases use them) | a new decrypt path |
| Audit (non-member) | `audit.withCompensatingAudit` (`actorId` nullable) | `auditOptInTransition` (needs a member id) |
| Words | `t('correction_sms.reminder')` / `t('certificate_sms.reminder')` | new copy |

### Testing standards

Unit (vitest) for every pure verdict and order; live on :5433 for the migration, RLS / grants / trigger specs, the sweep + child, the
worker legs; an injected fetch for Meta (⛔ network; a zero-call recorder where "⛔ send" is asserted — a throwing stub proves nothing once a
failure is classified); a controllable clock (ordering tests in separate transactions — [[project_db_clock_ordering_tests_tie]]); never
regenerate an applied migration ([[project_live_db_test_gotchas]]); push with :5433 explicitly ([[project_prepush_hook_inherits_5432]]).

### Project structure notes

New: the domain agreement registry; `claim_contact_wa_sends` / `claim_contact_wa_stops` schema + policies; the WhatsApp send record's
domain functions (a sibling of `contact-ladder-record.ts`, on 6.31's shapes); the WhatsApp gate in `contact-ladder.ts` (or a sibling
`contact-ladder-whatsapp.ts`); `apps/jobs/src/scheduler/claim-contact-wa-templates.ts`; the WhatsApp sweep / child in a SIBLING of
`claim-contact-ladder.ts` (T29). Updated: `claim-contact-copy.ts`, the two claim.json files, the helpline admin copy, `consent-record.ts`,
`claim-contact-check.ts`, `contact-ladder*.ts`, `schema/claim_contact_ladders.ts`, `correction-closure*.ts` (D22),
`wa-webhook-processor.ts`, `wa-template-config-key.ts` (purpose widened), `claim-peer-mesh-wa-reminders.ts` (`TEMPLATE_NAME_FORM`
exported only), `packages/queue/src/index.ts`, `boot.ts`, the ladder DTO / contracts / `ContactLadderLines.tsx`, the ladder policy spec.

### Sequencing

AFTER 6.37c (`done`) and 6.31 (`done` on `main` — WS1 met). Row 5-12 (backlog) shares the worker's STOP / block branches — WS1's
sequencing, T22. Row 6-36d (nominees out of the five) changes peer-mesh selection only — ⛔ overlap. 6.37e (the short-name fallback)
touches the suspicion texts only — ⛔ overlap. Row 32 (h) (alarms reach a person) governs this story's alarms too.

### Previous story intelligence (6.37c, 6.31)

- Review the fix diff before committing ([[feedback_review_the_fix_diff_before_commit]]) — 6.37c's round 2 and its 2nd fix-diff pass
  each found HIGHs (a stranded `attempting` row on a no-number branch; a no-op `ask === 'none'` guard).
- Restore-as-applied + an idempotent forward migration when an applied migration needs a change (0169 → 0170).
- Diff-only review claims were often false — verify against the worktree.
- Load timeouts in integration-tests are known — re-run alone and say so.
- The ladder's step is recorded `sent` at the claim; a refusal at send counts as sent and the ladder runs on — mirror it.
- 6.31's review rounds found the once-only send's hard edges: a same-job-id twin clearing a live send's marker (the transient note CAS'd
  on the marker), the lease judged on the child's clock, the marker sampled in its own transaction, quiet hours re-checked after the
  marker, a sibling's rows written for steps never due (bound the child's list by the sweep's DB-clock `dueAsOf`), a connect failure
  wrongly "may have sent" (`-366` d1). Each is a WS8 rule here.

### Git intelligence

`main` @ `0e88ddd1`: 6.31's dev (`5a445c1c`, `8ce00c3a`, `ce850dd2`, `b6285f86`), its review rounds (`036398ed`, `5745ad5d`, `5ac6b060`
= `-366` committed alone, `47397e6a`) and the roster note `0e88ddd1`; before them 6.37c (`b2aa00ff`, `39b52757`, `cda305df`,
`15acb570`). Pattern: governance entries committed alone before the patches; one forward migration per story (0169 / 0170 / 0171);
tests pinned by policy regression specs and source fences.

### Latest tech information

- WhatsApp Cloud API template sends: `POST /{phone-number-id}/messages`, `type: 'template'`, `language.code`, body `parameters`
  positional (6.31's client builds them from `bodyParams`); `graph_api_version` per Pariwar (T30).
- F23: opt-in elements, the recipient clause, off-WhatsApp opt-outs, UTILITY and re-categorisation, TTL, per-delivered-message pricing,
  status webhooks (`read` without `delivered`; 7-day retries). Meta's quality rating can restrict a number that messages people who
  report spam — a reason for WS10's strict STOP.

### References

- `_bmad-output/implementation-artifacts/6-37c-undelivered-reminder-ladder.md` (LD1, F19–F21, LD2–LD5, LD17, T11, Sequencing)
- `_bmad-output/implementation-artifacts/6-31-peer-mesh-whatsapp-reminder-at-48-hours.md` (on `main`; WR6–WR10, its header's DOWNSTREAM,
  Debug Log, round-2 Review Findings)
- `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-17-6-31-how-long-a-whatsapp-yes-lasts.md` (fact (1) — told)
- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-10-17-whatsapp-claim-contact.md` (§3, G3); `panel-pack-2026-10-17-6-37c.md` item 1
- `_bmad-output/planning-artifacts/architecture.md` §3.4 (the claim-contact exception bullet; Opt-in withdrawal; the dual gate; the
  `-364` / `-365` dated notes)
- `docs/adr/ADR-0028-whatsapp-provider-selection.md` (Changelog 2026-10-19); `docs/adr/ADR-0029-whatsapp-webhook-ingress-and-opt-in-lifecycle.md`
  (§2, §3, Changelog 2026-10-18 and the two 2026-10-19 rows); `docs/adr/ADR-0042-msg91-delivery-report-ingress.md` (dated note)
- `_bmad-output/planning-artifacts/counsel-question-2026-10-18-nominee-contact-basis.md` (questions 1, 3, 5; its *"Revised 2026-10-18"*
  note)
- `docs/launch-gate-inventory/inventory-roster.md` Rows 18, 19, 21, 26, 32, 33, 35
- deferred-work items: *"The ladder's WhatsApp step"* (6.37c); *"`WA_BLOCK_ERROR_CODES` revokes a member's WhatsApp consent on signals
  that are not consent"*; *"⛔ handling of Meta's `template_category_update` webhook"*; W9 (*"A 132xxx refusal that is about ONE value"*);
  *"Dotted Secret Manager names (UNVERIFIED)"*; the 6-37c vs 6-31 numbering-race item
- Decisions `-250`, `-350`, `-351`, `-352`, `-354`, `-355`, `-356`, `-357`, `-360`, `-363`, `-364`, `-365`, `-366`
- [Meta — Get opt-in for WhatsApp](https://developers.facebook.com/documentation/business-messaging/whatsapp/getting-opt-in) ·
  [WhatsApp Business Messaging Policy](https://whatsappbusiness.com/policy/) ·
  [Template categorization](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/template-categorization) ·
  [Time-to-live](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/time-to-live/) ·
  [Status webhooks](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/reference/messages/status) ·
  [Graph API versions](https://developers.facebook.com/docs/graph-api/changelog/versions)

## Dev Agent Record

### Agent Model Used

Claude Opus 5.5 (1M context) — `claude-opus-5-5[1m]` — `bmad-dev-story 6.37d` (Tasks 1–10), 2026-10-20.

### Debug Log References

- **(a) Task 0 — 2026-10-20.** 0.1: `origin/main` = `0e88ddd1` (unmoved); next free numbers on `main`, every branch and worktree:
  decision `-367`, roster Row 36, migration 0172 (journal `when` > `1794282000015`), ledger `2026-10-20`; row 5-12 `backlog`. 0.2 —
  BigDev's answers VERBATIM: *"accept all recommended, note for WS3 - code is not in production. WS4 - option (a) but drop G3 (c)."* · on
  G3 (c)'s rule and TTL: *"Drop entirely, disclose"* · PQ1: *"Mine — reading A (Recommended)"* · PQ2: *"Route to the Panel
  (Recommended)"* · on PQ3: *"Can helpline operator transfer call to IVRS for consent, or even before helpline operator answer IVRS
  should ask for consent?"* — *"Wny do we need counsel again ? Isn't Meta policy clear enough ?"* — *"what's the difference between "I am
  the claimant" or "I am filing for someone else" ? Also what DPDPA has to say on agreement, is it sufficient. drop "or any other means
  of communication that may appear in future"."* — *"I presume your wording says claimant is nominee, or atleast that's what I infer when
  person says "I am the claimant""* — *"no name based wording. I want to know who is claimant as per your understanding? As per my under
  claimant is anyone who files for claim, whether the person is nominee or relative."* · the clause's route: *"Add to PQ2's Panel note
  (Recommended)"* · the DPDPA gaps: *"Defer, record as risk"* · the draft: *"yes, draft -367"*, *"You are right, make the correction to
  Decision 2. And drop it from Decision 19."*, *"insert it"*. 0.3: `-367` committed ALONE (`5ab99fc0`, 44 lines added, ⛔ removed); the
  routing note written. 0.4: the records commit (Row 36; Rows 18 / 19 / 26 notes; epics.md; counsel question dated note; deferred-work;
  sprint row → `in-progress`, ledger `2026-10-20b`). 0.5: ⛔ new counsel question.
- **(b) Dev — 2026-10-20 (Tasks 1–10).** (1) **The worktree had ⛔ `node_modules`** — `.claude/worktrees/6-37d` sits under the repo
  root, so every `@twt/*` import resolved to the MAIN checkout's sources (a test of main, ⛔ this branch). `pnpm install
  --frozen-lockfile --prefer-offline` in the worktree (⛔ a new dependency; 1,954 packages linked from the store). (2) **Numbers**,
  re-grepped on `main`, every branch and every worktree right before use: migration **0172** (journal `when` 1794368400016 > 0171's
  1794282000015), ledger **`2026-10-20d`**; `origin/main` unmoved at `0e88ddd1` (⛔ re-pin). (3) **0172 on :5433 ONLY** (`DATABASE_URL`
  explicit — [[project_prepush_hook_inherits_5432]]); TWICE rolled back on :5433 by a scoped script (drop 0172's objects, restore 0169's
  CHECK, revoke the column grant, delete the journal row) and re-applied — 0172 was committed NOWHERE, and :5432 was checked untouched
  (latest migration 0171, ⛔ `claim_contact_wa_sends`): (i) PostgreSQL caps a regex repeat bound at 255 — `template_name ~ '^[a-z0-9_]{1,512}$'`
  is accepted at CREATE and fails at RUN time, so EVERY insert raised "invalid regular expression" ⇒ 0171's `'^[a-z0-9_]+$' AND
  char_length(...) <= 512`; (ii) the outcome/detail CHECK passed a NULL `detail` (`NULL LIKE …` is NULL and a CHECK passes on NULL) ⇒
  `COALESCE("detail", '')`. Both caught by the new policy spec's legs (⛔ a guess). (4) **RED evidence** (a fix hand-disabled, the leg
  run, the fix restored and re-run green): (i) the worker's `!claimOwned` guard removed ⇒ the two I7 legs RED (the member opt-in
  `BLOCKED_BY_META` by a claim send's block code, matched by wamid and by the claim-space hash); (ii) `reachedByLadderWhatsapp` removed
  from D22's `reached` ⇒ the two-ladder D22 leg RED. ⚠ Every OTHER new leg was written with or after its code — ⛔ recorded RED run
  (named here, ⛔ claimed). (5) **Deliberate expectation changes:** 6.37c's jobs live test pinned `skipped:nominee_no_whatsapp` for a
  claimant-nominee's ladder and `skipped:whatsapp_not_built` for a claimant's — now `pending` (WS5, `-367` PQ1 A), each with a dated
  comment; the ladder policy spec FLIPPED (T3 — `whatsapp_step` joins the UPDATE grant, `sent` is a CHECK value, the trigger legs
  added; the old 42501 assertion replaced, ⛔ deleted silently). (6) **Design as built:** the begin writes a skip on the STEP for a
  first visit and FINISHES the ROW on a re-take (0172's trigger refuses a second step write); the quarter-hourly START reuses 6.37c's
  `planCorrectionLadders` / `planCertificateLadders` in a STARTS-ONLY mode (⛔ running ladders, ⛔ `advance`, ⛔ pushes; SMS 2 by
  `ladderFirstDueOnForLateStart`) — T13's one start path; LD13's tail EXTRACTED (`raiseLadderStartAlarms`) and run by both sweeps;
  `settleContactLadderWhatsappDeliveries` is a LEAF module (the WhatsApp record imports the ladder writers — a back-import would be a
  cycle) and is called by the WhatsApp begin, both SMS begins and both 10:00 plans, so a delivered WhatsApp ends the ladder whichever
  path looks first; WS2 (iii)'s earlier-wording line needs to know the agreement on file's version ⇒ a new response field
  `agreementOnFileEarlierWording` threaded persist → contract → api → admin; the webhook worker's `enc` is now the FULL jobs KMS deps
  (a superset — the member blind index unchanged); the STOP recorder is its own file (`claim-contact-wa-stop.ts`) so the source fence
  can pin `audit.withCompensatingAudit` there (the worker file already holds the member path's raw writer).
  (7) **The proof (AC12) — `pnpm ci:local` on :5433 ran with TWO jobs red, both LOAD timeouts, each re-run ALONE green (SAID so —
  [[project_known_livedb_test_failures]]):** lint, typecheck, build and EVERY gate green (db-check, contracts determinism, crypto,
  i18n parity, microcopy, dlt-typed-variables, access-wrapper, domain-invariants, schema-diff, friction-budget, the AI-10-5 guard, …).
  (i) `test (unit)` — four admin jsdom files timed out under the 4-way load (`ground-inspection-discrepancy`, `ground-inspection-page`,
  `correction-queue`, `integrity-page` — ⛔ module this story touched; one file failed a DIFFERENT test on each loaded run); the admin
  suite alone 76 files / 1263 green, the discrepancy file 37/37 twice in the worktree and twice on the untouched `main` checkout; the whole
  unit stage re-run with `--continue` 37/37 tasks. (ii) `integration-tests` — 8 domain tests in 7 files timed out (suspicion-notice /
  R9 voting / workplace concurrency, one-payment-per-death, cycle freeze, the workplace import — ⛔ area this story touched); the seven
  files alone 106/106; turbo had then CANCELLED the other packages, so they were run in the same shape (`--concurrency=1 --continue`):
  jobs 72 files / 1294, api 174 / 1992 (+1 skipped), channels 442, events 36, niyamavali-engine 144, validity-service 284 — all green.
  This story's own live suites: the domain record spec 29, the 0172 + ladder policy specs 83, the jobs live suite 22 (incl. the AC4
  late-start leg added after the run, then run alone), the worker 15, the ladder live suite 24. ⛔ A network call (the fetch spy at zero).

### Completion Notes List

- Story created by `bmad-create-story 6.37d` (2026-10-19) — ultimate context engine analysis completed - comprehensive developer guide created. Four parallel read-only research passes (the governance spine; 6.37c's ladder code; the WhatsApp substrate and the 6.31 branch; the filing agreement).
- Validated by `bmad-create-story validate 6.37d` (2026-10-20, v1.2) — branch rebased onto `main` `0e88ddd1` and re-pinned; four parallel fresh-context read-only verifiers (governance staleness; code cites at HEAD; mechanism; premise + Meta's own pages); every finding applied (BigDev: *"all"*).
- **Dev (2026-10-20) — Tasks 1–10 implemented.** What was BUILT and how it is proven:
  - **AC1 / WS2 — the agreement.** A domain registry (`claim-contact-agreement-copy.ts`): v1 VERBATIM (`namesWhatsapp: false`), v2 =
    `-367` decision 2's first-person English without the clause (`-368` Q2 A) + an agent-drafted Hindi (व्हाट्सएप), `hiReviewed: false`;
    the current id `2026-10-20.v2-pending-story-0.13` (Row 18's marker kept); `apps/api`'s copy module re-exports it. Both claim.json
    files carry `contact.agreement` / `contact.agreement_required` v2 and a `$comment.contact_agreement` "NOT YET HUMAN-REVIEWED" marker
    (Row 36 (a)); `helpline.contact.duty` names the caller as the claimant; a tick ignored over an EARLIER-wording agreement says so
    (`savedAgreementIgnoredEarlierWording`). `copyVersion` declared on both payload types. Legs: the registry (v1 byte-identity, v2 ↔ the
    JSON, the marker), the api's stored payload (v2's id + words), the admin and mobile surfaces (the new words; the box UNTICKED by
    default on both).
  - **AC2 / WS3 — the basis reader** (`claim-contact-whatsapp-basis.ts`, a sibling — `claim-contact-check.ts` is byte-identical):
    eligible ONLY on a live `claim_contact_agreement` whose KNOWN version names WhatsApp and — agreed in Hindi (or an unrecorded locale)
    — whose Hindi is reviewed; read through the claim's CURRENT agreement. Unit legs per reason; live legs (old wording, a member re-save
    on v2 moving the claim onto it, Hindi, revoked); the F13 gate fence (each caller's gate pinned verbatim, ⛔ a basis read).
  - **AC8 — migration 0172** (the step moves ONCE under a trigger; `claim_contact_wa_sends` with 6.37d's marker mapping, the identity /
    finished-row / set-once-status trigger; `claim_contact_wa_stops`), the Drizzle schema + the ladder's `check()` copy in lockstep, the
    policies; the ladder spec flipped and a new 0172 spec (37 legs — RLS, grants, every CHECK by name with a positive counterpart, the
    trigger).
  - **AC3–AC7 / WS5–WS12 — the rules, the record, the jobs, the worker.** `isClaimant` on both recipient types (the claimant-nominee
    reached as the claimant — PQ1 A); `ladderWhatsappStep` / `ladderWhatsappGate` / `ladderHorizonVerdict` (extracted) /
    `ladderFirstDueOnForLateStart` / `ladderEndReason`'s WhatsApp input; D22's `reachedByLadderWhatsapp` on its own row; the domain send
    record (`contact-ladder-whatsapp-record.ts` — the two-half begin under the chase lock, the marker, the release, the notes, the
    exhausted finish in ONE statement, the finalise copying an early `delivered`, the lapsed finisher, the SQL-only due selection, the
    worker's status / stop / isolation writes); the quarter-hourly sweep + child (`claim-contact-ladder-whatsapp.ts` — around the clock,
    children only 09:00–20:00, the real client over the ONE cache); the worker's claim branch. Live legs: the domain record spec (29),
    the jobs live suite (22 — the REAL client over an injected fetch; ⛔ network), the worker (10 new legs incl. the RLS-bound refusal).
  - **AC9 / WS13 — staff see the channel** (`delivered_by` — domain, contract, api mapper, the admin line).
  - **AC10 — records.** ADR-0028 / ADR-0029 / ADR-0042 dated notes (⛔ decision text edited); the Panel "told" item
    `trustee-panel-told-2026-10-20-6-37d-whatsapp-and-forged-reports.md` WRITTEN and TOLD 2026-10-20 (sent by BigDev — *"report has been sent"*); deferred-work — 6.37c's "The ladder's
    WhatsApp step" **Closed by Story 6.37d**, W9 and the forged-report item annotated, a new section of eight disclosed items; the
    epics.md entry's dated note.
  - **AC11 / AC12 — fences.** The symbol fence over the five WhatsApp modules (6.31's list + the fixture provider, the ladder's own SMS
    path, a second cache) with a "fence bites" leg; the recorder's audit fence; the lease inequality; eleven untouched files sha256-PINNED
    and both reminders' SMS words pinned; the raw-SQL clamps.
  - ⚠ **GO-LIVE is untouched by this story's code:** nothing is SENT until roster Row 36 closes (and Row 35 (a) provisions a Pariwar's
    WhatsApp, Row 32 / 33 / 21) — every Pariwar's switch is OFF, the claim template names are unset, and v2's Hindi is unreviewed.

### File List

- `_bmad-output/implementation-artifacts/6-37d-claim-contact-whatsapp-step.md` (Tasks, Dev Agent Record, Change Log, Status)
- `_bmad-output/implementation-artifacts/deferred-work.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/planning-artifacts/epics.md`
- `_bmad-output/planning-artifacts/trustee-panel-told-2026-10-20-6-37d-whatsapp-and-forged-reports.md` (new)
- `docs/adr/ADR-0028-whatsapp-provider-selection.md`
- `docs/adr/ADR-0029-whatsapp-webhook-ingress-and-opt-in-lifecycle.md`
- `docs/adr/ADR-0042-msg91-delivery-report-ingress.md`
- `packages/domain/migrations/0172_claim-contact-whatsapp-step.sql` (new)
- `packages/domain/migrations/0173_claim-contact-wa-stop-per-sender.sql` (new, code review R1 — 2026-10-20)
- `packages/domain/migrations/0174_claim-contact-agreement-claimant-generation.sql` (new, code review R3 — 2026-10-20)
- `packages/domain/migrations/meta/_journal.json`
- `packages/domain/src/claim/claim-contact-agreement-copy.ts` (new)
- `packages/domain/src/claim/claim-contact-whatsapp-basis.ts` (new)
- `packages/domain/src/claim/contact-ladder-whatsapp-delivery.ts` (new)
- `packages/domain/src/claim/contact-ladder-whatsapp-record.ts` (new)
- `packages/domain/src/claim/certificate-reminder.ts`
- `packages/domain/src/claim/claim-contact-persist.ts`
- `packages/domain/src/claim/contact-ladder.ts`
- `packages/domain/src/claim/contact-ladder-read.ts`
- `packages/domain/src/claim/contact-ladder-record.ts`
- `packages/domain/src/claim/correction-chase.ts`
- `packages/domain/src/claim/correction-closure.ts`
- `packages/domain/src/claim/index.ts`
- `packages/domain/src/policies/claim-contact-wa-rls.ts` (new)
- `packages/domain/src/policies/index.ts`
- `packages/domain/src/schema/claim_contact_wa_sends.ts` (new)
- `packages/domain/src/schema/claim_contact_ladders.ts`
- `packages/domain/src/schema/claim_contacts.ts` (code review R3 — 2026-10-20: `claimantGeneration` / `agreementClaimantGeneration`)
- `packages/domain/src/schema/consent_records.ts`
- `packages/domain/src/schema/index.ts`
- `packages/domain/tests/claim/claim-contact-agreement-gate-fence.test.ts` (new)
- `packages/domain/tests/claim/claim-contact-whatsapp-basis.test.ts` (new)
- `packages/domain/tests/claim/contact-ladder.test.ts`
- `packages/domain/tests/integration/claim/certificate-reminder.spec.ts`
- `packages/domain/tests/integration/claim/claim-contact.spec.ts`
- `packages/domain/tests/integration/claim/contact-ladder-whatsapp.spec.ts` (new)
- `packages/domain/tests/integration/claim/correction-chase.spec.ts`
- `packages/domain/tests/integration/rls/claim-contact-ladder-policy-regression.spec.ts`
- `packages/domain/tests/integration/rls/claim-contact-wa-policy-regression.spec.ts` (new)
- `packages/contracts/src/claims/contact-ladder.ts`
- `packages/contracts/src/claims/contact.ts`
- `packages/contracts/src/consent/consent-record.ts`
- `packages/contracts/tests/certificate-reminder-lockstep.test.ts`
- `packages/channels/src/index.ts`
- `packages/channels/src/providers/whatsapp-app.ts`
- `packages/queue/src/index.ts`
- `packages/i18n/locales/en/claim.json`
- `packages/i18n/locales/hi/claim.json`
- `apps/jobs/src/boot.ts`
- `apps/jobs/src/claim-contact-wa-stop.ts` (new)
- `apps/jobs/src/scheduler/claim-contact-ladder.ts`
- `apps/jobs/src/scheduler/claim-contact-ladder-whatsapp.ts` (new)
- `apps/jobs/src/scheduler/claim-contact-wa-templates.ts` (new)
- `apps/jobs/src/scheduler/claim-peer-mesh-wa-reminders.ts` (`TEMPLATE_NAME_FORM` exported only)
- `apps/jobs/src/scheduler/wa-template-config-key.ts`
- `apps/jobs/src/wa-webhook-processor.ts`
- `apps/jobs/tests/claim-contact-ladder-live.test.ts`
- `apps/jobs/tests/claim-contact-ladder-whatsapp-live.test.ts` (new)
- `apps/jobs/tests/claim-contact-ladder-whatsapp.test.ts` (new)
- `apps/jobs/tests/claim-contact-wa-templates.test.ts` (new)
- `apps/jobs/tests/wa-webhook-processor.test.ts`
- `apps/api/src/modules/claims/claim-contact-copy.ts`
- `apps/api/src/modules/claims/claims.contact.handlers.ts`
- `apps/api/src/modules/claims/contact-ladder-dto.ts`
- `apps/api/tests/integration/claims/claim-contact.spec.ts`
- `apps/api/tests/unit/claim-contact-copy.test.ts`
- `apps/admin/src/modules/correction-chase/ContactLadderLines.tsx`
- `apps/admin/src/modules/correction-chase/i18n-en.ts`
- `apps/admin/src/modules/helpline-claims/HelplineClaimContact.tsx`
- `apps/admin/src/modules/helpline-claims/i18n-en.ts`
- `apps/admin/tests/certificate-reminders.test.tsx`
- `apps/admin/tests/contact-call-form.test.tsx`
- `apps/admin/tests/correction-chase-forms.test.tsx`
- `apps/admin/tests/helpline-claim-contact.test.tsx`
- `apps/mobile/tests/unit/claim-contact.test.ts`

## Change Log

- v1.5 (2026-10-20) — `bmad-dev-story 6.37d`: Tasks 1–10 implemented (Debug Log (b), Completion Notes, File List). Migration 0172; the
  agreement's v2 + the basis reader; the step's rules, record, quarter-hourly sweep and child; the webhook worker's claim branch; D22's
  WhatsApp reach; staff see the channel; ADR-0028 / -0029 / -0042 dated notes; the Panel "told" item WRITTEN and TOLD 2026-10-20 (BigDev: *"report has been sent"*); deferred-work
  dispositions. ci:local on :5433 — every gate green; the two red jobs were load timeouts, each re-run alone green (Debug Log (b) 7).
  Status `in-progress` → `review`.

- v1.6 (2026-10-20) — `bmad-code-review 6.37d`, "apply every patch": R1–R7 / R9 of the round-1 findings fixed (migrations 0173 /
  0174 — both FORWARD, 0172 is already applied on :5433 and never edited; `isClaimant` re-checked live under the send lock;
  the agreement bound to a claimant generation; the webhook's claim-ownership match freed from `isClaimBranchOpen()`; the
  isolation window aged by `updated_at`; the burst alarm's de-dup removed; the quarter-hourly start's origin set threaded
  through `StartsOnly.eligibleOriginRowIds`; the `listNewReportClaims` DELIBERATE block). R8 PARTIAL — one true
  two-connection race added, the certificate-chase / late-correlator / 20:00→09:00 / other-chase-independence legs NOT
  added (its own Review Findings line says so — stays an open action item). `tsc` clean on domain + jobs; 345 tests green
  on :5433, zero regressions; three parallel fresh-context adversarial reviews of this patch's own diff, all nine
  CONFIRMED-FIXED, zero new bugs. Status stays `in-progress` (R8 unresolved — Review Findings govern).

- v1.7 (2026-10-20) — autonomous follow-up (continuing "apply every patch"): added the R7 regression leg
  `apps/jobs/tests/claim-contact-ladder-whatsapp-live.test.ts` "R7 — the quarter-hourly start enforces the two-hour window
  per ORIGIN" that v1.6 had not covered (two people, one claim, one fresh / one 3-hour-old report); confirmed RED against
  the pre-fix code by temporarily disabling the fix's two gating lines and re-running, then restored and green again.
  R8 is otherwise unchanged (still PARTIAL — the certificate-chase, late-correlator, 20:00→09:00 and
  other-chase-independence legs remain open). Status stays `in-progress`.

- v1.8 (2026-10-20) — "close out R8": the remaining five named legs added, all in live/integration tests, closing R8
  completely. `apps/jobs/tests/claim-contact-ladder-whatsapp-live.test.ts` gains the late-correlator leg, the 20:00
  release → 09:00 config-off-finish leg (its own isolated Pariwar — never left the shared `PARIWAR` constant's
  WhatsApp disabled for later tests), and the certificate-chase happy path (`seedCertWait`, ported from
  `claim-contact-ladder-live.test.ts`'s `seedWait` + a v2 WhatsApp-eligible agreement, through the REAL sweep/child/CR7
  path). `packages/domain/tests/integration/claim/contact-ladder-whatsapp.spec.ts` gains other-chase independence
  (proved at `readClaimLadders`'s SQL `chase` filter, after a sweep-level attempt was abandoned — `seedReturnedClaim`'s
  baked-in accepted certificate makes any certificate run on that claim self-stop immediately under CR5, in both
  `missing` and `rejected` causes, so a mechanism-level proof is the correct one here) and delivered-after-conclusion
  (the SAME ladder concluded before its own delivery is known; `reachedByLadderWhatsapp` still flips true, `state` /
  `concluded_on` stand). `tsc` clean; 362 tests green on :5433, zero regressions; a fresh-context adversarial review of
  all six R8 test additions (vacuous-assertion / pollution / false-precision / fixture-shortcut checks) — all
  CONFIRMED-SOUND. All 9 code-review findings (R1–R9) now closed. Status `in-progress` → `done` (GO-LIVE still fenced
  separately — roster Row 36 etc.).

- v1.0 (2026-10-19) — created by `bmad-create-story 6.37d` at `15acb570`; WS1–WS14 proposed, PQ1–PQ2 candidate; status `ready-for-dev`.
- v1.1 (2026-10-19) — the create-story's own checklist pass (one fresh-context validator, read-only: 7 HIGH / 12 MEDIUM / 5 LOW, all applied): the STOP key moved to the ladder's `claim_contact_mobile` hash space (⛔ the member login key); the webhook worker's claim branch scoped to the event's Pariwar behind the RLS-bound-role refusal; the quarter-hourly sweep starts ladders only for NEW reports and ⛔ calls `advance`; the 4 h anchor = the origin's `created_at` (⛔ `claimed_at`, re-set on retry); `isClaimant` on both person types (the certificate reader is shaped differently); AC2's fence narrowed to the agreement-state gate; D22 is correction-only and the post-conclusion case decided in WS12; WS12 flagged against `-360` Q1 A; `-355` d3 superseded in part; ADR-0029 / Row 19 / Row 26 notes; grants bind `twt_app` only — triggers are the jobs controls; counsel question 3's two halves; the gate list corrected.
- v1.4 (2026-10-20) — the Panel RULED the routing note: Decision `2026-10-20-368` (Trustee-ratified, *"Q1 A, Q2 A"*; `041d5f17`,
  committed alone) and its records commit; the `-367` OUTCOME block gains the ruling; the header's done-gate and the PQ dispositions note
  it. Status stays `in-progress`.
- v1.3 (2026-10-20) — Task 0 DONE: Decision `2026-10-20-367` (`5ab99fc0`, alone) and the records commit; the `-367` OUTCOME block added
  under Status (it governs); F25 withdrawn (kept); PQ dispositions; AC1 → v2's first-person English without the clause; WS2 (i), WS4's
  G3 (c), T24 annotated; Task 0 ticked; Debug Log (a). Status `in-progress`.
- v1.2 (2026-10-20) — `bmad-create-story validate 6.37d`: REBASED onto `main` `0e88ddd1` (16 behind; 6.31 shipped; both ledger conflicts kept both sides) and re-pinned; four parallel fresh-context verifiers (governance / code / mechanism / premise + Meta), 41 findings, all applied (BigDev: *"all"*). ⭐ 6.31 SHIPPED ⇒ WS1's precondition MET, F3 rewritten as built (client, cache, `resolveChannelSecret`, `classifyDirectWaSendFailure` and `-366`'s order, `waTemplateConfigKey`, the once-ever record + in-flight marker), F4–F7 corrected; every v1.1 number TAKEN (`-364`/`-365`/`-366`, Row 35, 0171) ⇒ the G3 row named by key with legs G3 (a)–(h), ⛔ untaken number in the file (`-366` d6); `-364`/`-365`/`-366` and 6.31's told reading added to the rulings table; WS8 rebuilt on 6.31's crash-safe shape (marker, lapsed finisher, window at the marker, a transient rule, every classifier kind mapped, the freeze excluding the status columns) with `-365` WR7 / WR10 divergences NAMED; AC5 re-ordered (config outside the lock; the chase stops and ladder ends re-checked before a send); WS12 / D22: `reachedByLadderWhatsapp` stands on its own row (a later ladder's conclusion maps the earlier origin) and the Policy meaning cost restated (where every text fails, ⛔ more waiting for a call or a letter); ⭐ NEW F25 / PQ3 — the agreement is ticked by whoever files (or the helpline caller) and records ⛔ claimant, while Meta requires opt-in from the recipient — counsel question 3 to be revised before sending; AC4's start keyed on a `reported_at` window (⛔ watermark exists) and its HMAC claim corrected; WS11's honest status rule (three paths with ⛔ wamid; the metadata phone-number check); row 5-12's shared STOP path sequenced (WS1, T22); G3 legs for TTL (12 h), re-categorisation, key resolution, off-WhatsApp opt-outs, the display name; the access-wrapper and clamp gates disclosed as ⛔ covering the jobs code; 6.31's symbol fence reused (a sibling module — T29); AC11's DLT file corrected; T1/T10/T11/T15 rewritten, T22–T30 added; References, Sequencing, Git intelligence refreshed. Then two fresh-context re-validators of the pass's OWN diff (claims: 3 H / 4 M / 4 L; consistency: 1 H / 2 M / 11 L — every HIGH the pass's own), all applied: a claimed step is never `pending` again, so the sweep also re-takes lapsed unmarked `attempting` rows, the final pg-boss attempt finishes the row, the marker answers `marked | lost` (6.31's `late` is its 72-hour give-up) and a window miss defers the child to 09:00; the quarter-hourly START runs 6.37c's burst / hash alarms (ADR-0042's bound counts on them); a status-table delivery is copied into `delivered_at` so D22 sees it; every 132xxx is `scope`; 6.37d's own marker-outcome CHECK (0171's would 23514 every `refused`); the fence adds the ladder's own SMS symbols; `reported_at`'s lag disclosed; the config / hash faults named and alarmed; the numbering-race note moved to Task 0.4 (the decision commits alone); Row 21 a G3 precondition. A ROUND 2 re-validator then found 2 H / 4 M / 3 L in those patches, all applied: the re-check in two halves (a SET marker or another live holder ⇒ ⛔ write — finishing it would lose a sent message's `may_have_sent`), `recipient_number_hash` written at the claim (6.31 writes it at the finalise ⇒ WS11's isolation could never match an in-flight row), where each skip is written (step vs row), both hash-failure shapes transient, one lease constant ≥ 45 min, `assertBodyParams` exported, the burst alarm's concurrency disclosed, `singletonKey` a label only. A ROUND 3 re-validator found 1 H / 6 L in those, all applied: AC5 (1) only READS — its config verdicts are written in (2) after the re-claim (a re-take is a new job id, so an earlier write matched ⛔ row and re-took the row every tick); I4 discloses `-366` d2's 500 / 503 retry; the post-send note-and-finish is ONE statement; the lease reasoning and the child's `expireInSeconds`; the burst disclosure; `contact_ladder.hash_unavailable` named; `param_invalid` via `timeoutMs`. A ROUND 4 re-validator found ⛔ HIGH (3 M / 4 L), all applied: the WhatsApp switch re-read under the lock and the config verdicts placed after the ends / stops; `first_detail` keeps the first transient and the log the last; re-takes only inside the window, every child deferring at its start at night; the lease a liveness bound (the marker CAS the safety control, the same-job-id twin named); 0171's re-stamp predicate verbatim; `param_invalid` after the marker named; I4's headline narrowed.
