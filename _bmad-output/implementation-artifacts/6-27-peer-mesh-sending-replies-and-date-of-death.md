---
baseline_commit: 5946e411
---

<!--
⭐ PINNED 2026-10-10 (`bmad-create-story 6.27`) to `main` at `5946e411` (= `origin/main`, fetched 2026-10-10; Story 6.29's code-review
commit). Every `file:NNN` below is AS OF `5946e411`, derived by four read-only research passes (the peer-mesh substrate as built by 6.6 /
6.10; the approval-warnings machinery as built by 6.23a / 6.23b / 6.26b; the SMS send core + the member app + member API conventions; the
governance trail `-255` … `-302`) and the load-bearing ones re-read by the author. ⚠ Before Task 1, run
`git diff --name-only 5946e411..HEAD -- packages apps scripts` — any cited file in that list is re-read.

STATUS: `ready-for-dev` — ⛔⛔ NO CODE until Task 0 is done: (i) ✅ DONE 2026-10-10 — the Panel ruled Q1 A (with a language rider)
and Q2 A, transcribed as `2026-10-10-303` and into the routing note; (ii) BigDev has answered PM1–PM22 (below); (iii) ONE author-commit
recording them is committed ALONE ([[feedback_governance_commits_precede_implementation]]). ⭐ The RECOMMENDED answers were taken, so
⛔ no "Re-plan by answer" branch applies; the rider adds PM22 and amends PM3 / PM7 (v1.4).

⭐ §0 gate (template `trustee-panel-routing-note-TEMPLATE.md`): TWO questions are the Panel's and are routed (Q1: texting five members,
naming the member — what the Trust DISCLOSES, to whom, by what means; Q2: `-263` FQ10 A *"can ⛔ never block a claim on their own"* vs
`-277` Q3 B's wait — two ratified clauses meeting, owed by `-279` A6 / Consequence 2). Every PM below strips to "the code should do X".
⚠ A PM BECOMES the Panel's if the build (i) shows a neighbour's answer — or who answered — to the FAMILY or the PUBLIC (FR-39's
*"verifier names are published"* is unruled at every tier, 11b.3b `verifierName`), (ii) says MORE in the text than the routed wording
(a claim, money, the family, the nominee, who reported it, a deadline), or (iii) lets a neighbour's answer REFUSE a claim or stand in
for the ground inspection (FQ9 / FQ10 A). Traps 1–3 fence all three.

GLYPH REGISTER, ADDRESSING RULE: as 6.24a / 6.24b / 6.25 / 6.29 — `⛔` sits ONLY on a negation word · `⭐` = key fact / action · `⚠` =
hazard. ⛔ No `file:NNN` into `.decision-log.md`, `deferred-work.md` or `sprint-status.yaml` (newest-first files — cite entry id + clause,
item heading, row key). `file:NNN` is used ONLY for code, as of `5946e411`.
LETTERS: `PM` = this story's build decisions (the author's, PROPOSED — committed by ONE author-commit at Task 0.4); `F` = FOUND facts;
`Q1` / `Q2` = the routing note's Panel questions. Foreign letters cited: `NW` / `EA` (6.23a/b, `-278`), `GI` (6.26, `-282`), `RF`
(6.24a, `-292`), `RB` (6.24b, `-295`), `RE` (6.25, `-299`), `RN` (6.29, `-302`). `PM` is used by ⛔ no earlier story (grepped 2026-10-10).
-->

# Story 6.27: The Five Neighbours Are Actually Asked — a Text, an Answer Screen, the Helpline, the Date of Death, and Two Warnings `[SURFACE]`

Status: ready-for-dev

> ⭐⭐ **WHAT THIS STORY IS, IN ONE PARAGRAPH.** Story 6.6 (`done`) chooses the five members nearest a member who has died and writes a
> request for each — and ⛔ nothing ever sends it, ⛔ nothing can answer it, so **every claim ends its 72 hours with zero answers**
> (`2026-09-28-263`'s FINDING). This story makes the check with neighbours real: each of the five is **texted** (Q1 A — once ever per
> request, through 6.24b's shared DLT send core); answers in a short **app screen** or by **calling the helpline**, where the operator
> records the answer; is asked *"Do you know them? Do you believe they have died? If you know, on what date?"* (`-262` FQ8 E); and the
> District Admin and every later approver **see the answers** (6.10's deferred item). Two answers become **warnings** under the ONE rule
> 6.23a built (`-264` FQ12): a neighbour saying the member **has not died**, and a date **more than a day** away from the accepted
> certificate's (`-263` FQ10 A) — approving while one shows needs a chosen reason and a written note from every approver, and one that
> arrives after the District Admin approved makes the final approval **wait** for the District Admin (Q2 A).
> ⭐ **A neighbour's answer never refuses a claim, and ⛔ never stands in for the ground inspection.**

> ⭐ **What already ships and this story READS or EXTENDS — rebuild ⛔ none of it:**
> · **6.6's substrate** — `claim_peer_mesh_selections` / `claim_peer_mesh_pings` (0054), the pure `selectPeerMesh`, the SELECT / WINDOW
>   workers `apps/jobs/src/claim-peer-mesh.ts`, the writer `recordPeerMeshResponse` (`packages/domain/src/claim/peer-mesh-persist.ts:222`),
>   the reads `peer-mesh-read.ts`. The selection is ⛔ not changed (determinism, replay — Trap 8).
> · **6.24b / 6.29's SMS discipline** — `sendClaimDltSms` (`apps/jobs/src/scheduler/claim-dlt-sms-send.ts:70`) used UNCHANGED; the
>   0151 / 0155 record shape, sweep, hold / park / give-up (`packages/domain/src/claim/suspicion-notice.ts`,
>   `apps/jobs/src/scheduler/claim-suspicion-notices.ts`) as the DESIGN TEMPLATE, ⛔ not edited.
> · **6.23a / 6.23b / 6.26b's warnings** — `packages/domain/src/claim/approval-warnings.ts`: this story adds TWO KINDS, ⛔ never a rule.
> · **6.10's console** — `assemblePeerMesh` (`apps/api/src/modules/claims/claims.verifier-console.handlers.ts:772-805`) and `PeerMeshView`
>   (`apps/admin/src/modules/claim-verification/SignalsPanel.tsx:158-192`).
> · **10.15's Polls** member answer pattern (`apps/api/src/modules/surveys/member-routes.ts:68,84`; `apps/mobile/app/(polls)/`) and
>   **6.3's helpline chain** (`apps/api/src/modules/claims/claims.helpline.routes.ts`).

> ⚠⚠ **FIVE FACTS — read before anything else** (re-derived at `5946e411`).
> 1. ⭐ **Members cannot be notified in the app.** The mobile app never registers a device token (`apps/mobile/lib/push-notifications.ts`
>    has ⛔ no importer; ⛔ no `device-tokens` call in `apps/mobile` or `packages/api-client`), there is ⛔ no member inbox, and the app's
>    URL scheme (`twtp05`, `apps/mobile/app.json`) does ⛔ not match the contracts deep-link grammar (`'twt'`,
>    `packages/contracts/src/deep-links/deep-link.ts:33`); the app still carries the P0 prototype's identity
>    (`org.teacherswelfaretrust.p0prototype`), reads ⛔ no incoming URL, and ⛔ no app-link verification file exists anywhere.
>    ⇒ `dispatch()` push reaches ⛔ nobody, and TODAY a text cannot open a screen.
>    ⭐ **2026-10-10 (BigDev: *"separate story"*):** the text CARRIES an `https://` link that opens the question screen directly —
>    built by THIS story (PM21: the code, the path, the app route, the resolver) — and the plumbing that makes an `https://` link open
>    the app at all (the app's real identity, Android App Links / iOS Universal Links, the two hosted verification files, the plain
>    fallback page, the operator's URL whitelisting, the Trust's domain) is **row `6-30-app-links-open-the-app-from-a-text`**. The
>    domain is expected the week of 2026-10-12; it is ONE config value, so ⛔ nothing here waits for it. The app ALSO shows open
>    requests by PULL (6.12's precedent) and the text keeps the helpline — a member whose link does not open still has two ways in.
>    ⭐ **2026-10-10 (BigDev: *"48 hours, separate story 6-31"*):** ONE WhatsApp reminder at 48 hours, with the same words, to those of
>    the five who have ⛔ not answered AND have opted in to WhatsApp (Story 5.4) — **row `6-31-peer-mesh-whatsapp-reminder-at-48-hours`**,
>    built AFTER this story's sending half. It is put to the Panel inside Q1 (option A *"with the reminder"*). ⛔ No 6.27 task builds
>    it; 6.27's only duty is Trap 17.
> 2. ⚠ **Members are ⛔ never texted today except for a login code** (architecture §3.4: *"they do not receive transactional-fallback
>    SMS"*; F7's widening reaches a claim's family only). ⇒ Q1 is the Panel's — the text is ⛔ not built to send until it is ruled.
> 3. ⚠⚠ **Today a reply is refused the moment it matters.** `recordPeerMeshResponse` throws `PeerMeshClaimNotInVerificationError` once
>    the claim leaves `verification_in_progress` and `PeerMeshWindowResolvedError` once the 72 hours resolve (`peer-mesh-persist.ts:222-279`)
>    — so a *"they have not died"* sent after the District Admin approved, or at hour 73, is thrown away. ⇒ PM8 widens the acceptance to
>    every state in which an approval is still to come — which is what makes a LATE neighbour key reachable, and why Q2 exists.
> 4. ⚠⚠ **"More than a day" cannot be one index comparison.** The warning module never decrypts (fence:
>    `packages/domain/tests/claim/nominee-name-no-comparison-fence.test.ts:345-353`); 6.26b compares dates as keyed-INDEX EQUALITY
>    (`deathDateComparison`, `approval-warnings.ts:204-223`) — "differs" there means ANY different date. FQ8 E's *"by more than a day"*
>    needs a tolerance ⇒ PM9 stores the keyed indexes of the neighbour's date AND the day before AND the day after; the key is present
>    ⇔ the accepted certificate's index is none of the three.
> 5. ⚠ **The 6.6 reply vocabulary conflates two answers.** `claim.peer_mesh_responded`'s `response` is `confirmed | denied | unknown`
>    (`packages/domain/src/claim/events.ts:157-161`) — a "no" to *"do you know this person and do you believe they have died?"* is
>    either *"I don't know them"* or *"they have not died"*, and FQ10's warning is ONLY the second. ⇒ PM7 asks three separate questions,
>    stores them on a reply row, and maps them onto the event's enum without loss of the warning (`denied` ⇔ *"has not died"* ONLY).

## Story

As **one of the five members the Trust asks about a reported death** —
I want **to be told I have been asked, and to answer in a minute in the app or by phoning the helpline**,
so that **the Trust hears from people who knew the member before it pays a family —**

and as **the District Admin and every approver after me** —
I want **to see each neighbour's answer, and to be warned when one says the member has not died or gives a date more than a day away
from the certificate's**,
so that **⛔ no claim a neighbour disputes is approved without a named person's chosen reason and written note — while ⛔ no family is
ever refused because of a neighbour's answer.**

## The rulings this story builds

| Ruling | Key (verbatim, abridged) | Status |
|---|---|---|
| `-263` FINDING + Consequence 2 | 6.6's requests are ⛔ never sent, ⛔ cannot be answered, staff ⛔ cannot see answers ⇒ row 6-27: *"send the five requests (the wording, en + hi), a reply screen for the five, record replies through `recordPeerMeshResponse`, show them to staff (6.10's deferred item), and FQ8 E, with FQ10's warnings. ⚠ A new member-facing message — DLT / channel scope as `-255` F7"* | ⭐ Trustee-ratified (the finding is the record) |
| `-263` FQ10 A | the check with neighbours is a SIGNAL, ⛔ not a gate; fewer than 3 replies in 72 h ⇒ the inspection is the main check (as built); a *"they have not died"* or a differing date is shown to the District Admin **as a warning**; *"the neighbours can ⛔ never block a claim on their own"* | ⭐ Trustee-ratified |
| `-262` FQ8 E | the five are also asked *"If you know, on what date did they die?"*; the District Admin is shown answers that differ from the certificate by **more than a day** | ⭐ Trustee-ratified |
| `-264` FQ12 | ONE rule for every warning — incl. *"a date of death that differs … from the neighbours, FQ8 E"* and *"a neighbour saying the member has not died"* — approving needs a reason and a note | ⭐ Trustee-ratified |
| `-277` Q2 C / Q3 B | every approver gives a reason and a note; a late warning makes the final approval wait for the District Admin | ⭐ Trustee-ratified |
| `-261` C3 | the true nominee's refile inherits the ground inspection — *"and nothing else carries over (… the checks with neighbours …)"* | ⭐ Trustee-ratified ⇒ ⛔ no inherited neighbour key (Trap 7) |
| `-279` A6 + Consequence 2 | *"a new warning kind enters the wait only by a decision (6-26 / 6-27) … row 6-27's neighbour replies (FQ10 A, 'can ⛔ never block a claim on their own') can arrive after approval … its producer row decides or routes that before extending this list"* | author-commit ⇒ **ROUTED** as Q2 |
| `-255` F7 · architecture §3.4 | SMS widened to a claim's family only; members get ⛔ no ordinary text | Trustee-ratified / plan ⇒ **ROUTED** as Q1 |
| **Q1** (routing note 2026-10-10) → **`2026-10-10-303`** | the five are texted, naming the member, with the link and the helpline, plus one WhatsApp reminder at 48 h (option A as put); ⭐ **rider:** *"Send Text in Hindi to those whose preferred langauge is Hindi and in English to those whose preferred language in English"* | ⭐ Trustee-ratified (A + rider) |
| **Q2** (routing note 2026-10-10) → **`2026-10-10-303`** | a neighbour's late warning makes the final approval wait for the District Admin's reason and note — ⛔ never a refusal | ⭐ Trustee-ratified (A) — discharges `-279` A6 for this row |
| `-303` reading | "preferred language" = the language the member chose in the app, recorded on the server; ⛔ none recorded ⇒ the Pariwar's default; the app screen asks exactly TWO questions | ⚠ OUR reading — PM22 / PM7 |
| `-282` GI7 · `-281` Q1 B | the two precedents for a kind entering the wait (author call where ⛔ no carve-out; Panel where there is one) | precedent |
| `-295` RB4 / RB5 / RB11 / RB12 / RB16 · `-302` RN2–RN8 | one send core, ⛔ never copied; the mode-resolved name or `no_target`; go-live rows; a held config never uses up the slot; the deadline-word deny-list; 0155's backstops | author-commit — the TEMPLATE |
| `-292` Consequence 4 · `-282` Consequence 4 | rows 6-24 / 6-25 / 6-27 share the gate and writers — *"whichever lands second rebases; ⛔ none drops another's check"* | ⭐ every sibling is `done` ⇒ 6.27 rebases onto all of them (Trap 5) |

**⛔ Not covered by any ruling (stays open, ⛔ not built here):** whether the family or the public ever sees who answered or what they said
(FR-39 / FR-77's *"verifier names are published"* — unruled, 11b.3b `verifierName`); FR-39's *"non-response after 72 hours → escalate
to block admin"* (⛔ not built, ⛔ not superseded — PM19); what an approver must weigh under a neighbour's warning; counsel's basis for the text
(go-live row, PM16); whose data an answer is for erasure on the RESPONDER's side (PM17).

## ✅ THE TWO PANEL QUESTIONS — RULED 2026-10-10 (`2026-10-10-303`: Q1 A + the language rider, Q2 A). Kept below as planned.

The note: `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-10-6-27-asking-the-neighbours.md` (written 2026-10-10,
from the template; its E4 commands were RUN at `5946e411` and hold).
- **Q1 — may the Trust text the five neighbours, naming the member?** A: a text naming the member (**our reading**) · B: a text naming
  ⛔ no one · C: ⛔ no text, the helpline phones the five · D: ⛔ no text, the request waits in the app.
- **Q2 — a neighbour's answer after the District Admin approved.** A: one rule — the final approval waits for the District Admin's
  reason and note (**our reading**) · B: shown, every later approver gives a reason and note, ⛔ nothing waits · C: answers are taken
  only until the District Admin decides.
- ⭐ **Re-plan by answer** (each PM carries its own line): Q1 B ⇒ PM3's text loses `{member}` (D33 kept; one template pair still);
  Q1 C ⇒ Tasks 2–3 are dropped and Task 7 gains an operator CALL LIST on the console (the five, their numbers decrypted behind
  `claim.file`'s step-up, a "called — no answer" record); Q1 D ⇒ Tasks 2–3 are dropped, ⛔ nothing else moves. Q2 B ⇒ PM9's kinds need
  a per-kind exclusion in the wait — an edit of the assertion `-278` NW1 forbids ⇒ a NEW author-commit superseding NW1 for these two
  kinds, and Task 9.4's wait legs invert; Q2 C ⇒ PM8's acceptance narrows to `verification_in_progress` / `verifier_review`, and the
  kinds still enter the wait (a late date key can still arise through a certificate re-review — F21 — the GI7 precedent).

## ⭐ THE INVARIANTS

1. **A neighbour's answer never refuses a claim and never replaces the inspection.** Each kind is a condition on the FORM of an
   approval (a reason + a note) or a WAIT; ⛔ never a denial, ⛔ never a gate conjunct, ⛔ never read by `assertGroundInspectionCompleteForApproval`.
2. **ONE rule, ONE derivation** — two kinds, two keys, ONE producer table; the assertion is ⛔ never edited (NW1); both warning readers share
   the pure derivation and ONE SQL fragment.
3. **⛔ No decrypt in the warning module** — keyed indexes and plaintext codes only (6.23a invariant 7; the fence at
   `nominee-name-no-comparison-fence.test.ts:345-353`).
4. **The selection is ⛔ not changed.** Who the five are stays 6.6's deterministic, replayable answer; a peer this story will ⛔ not text is
   recorded as such on its ping, ⛔ never replaced.
5. **Once ever per request.** Each ping is texted at most once (at-least-once RECORDED, ⛔ not hidden — RB3); each ping has at most ONE
   answer, and an answer is final.
6. **⛔ No PII in an event, a log, an alarm, an audit row or a `detail`.** The neighbour's date is Tier-1 (6.26a's
   `death_date_ciphertext` precedent); audit carries codes and counts only (NW12, GI14).
7. **The answers are the Trust's staff's only** — the District Admin and the later approvers in scope; ⛔ never the family, ⛔ never
   the claimant, ⛔ never a public page (Trap 1).
8. **An unknown is ⛔ never shown as "no warning"** (6.18's fail-closed rule): a failed warnings read makes each answer's warning flag
   `null` (*"could not be checked just now"*), ⛔ never `false`; a failed decrypt of a neighbour's date shows *"could not be shown just
   now"*, ⛔ never a blank.

## 📜 Policy meaning (AI-10-1)

⭐ **This story ADDS two conjuncts to an existing benefit-gating predicate** (the approval-warning rule that decides the FORM an approval of
a family's claim must take, and whether the final approval waits). In the member's terms:
- **P1 (PM9 `peer_says_not_died`):** *"If one of the members the Trust asked about a death answers that the member has not died, anyone
  approving the family's claim must choose a reason and write a note; and if that answer arrives after the District Admin approved, the
  claim waits until the District Admin has done so — a neighbour's answer never refuses the claim."* — `-263` FQ10 A + `-264` FQ12 +
  Q2 A: ✅ consistent — Q2 A ratified the wait clause (`-303`).
- **P2 (PM9 `peer_death_date_differs`):** *"If one of the members the Trust asked gives a date of death two or more days away from the
  date on the certificate the Trust accepted, anyone approving the family's claim must choose a reason and write a note, with the same
  wait — never a refusal."* — `-262` FQ8 E (*"more than a day"*) + FQ12: consistent; ⚠ *"two or more days"* is OUR reading of *"more
  than a day"* (PM9).
- **PM8 (the acceptance window) adds ⛔ no predicate on the family** — it changes WHEN a neighbour may answer, ⛔ not who may be paid; PM1
  (who is ⛔ not texted) changes ⛔ nothing about who may be paid.
- **Niyamavali check:** §6.2 (*"The Trust verifies the qualifying event …"*) — consistent; ⛔ no clause mentions neighbours or the peer
  mesh (grepped `docs/legal/niyamavali.md` 2026-10-10); the Niyamavali is ⛔ not ratified ([[feedback_niyamavali_rulebook_not_spec]]).

## ⭐ FOUND FACTS (each ⇒ the PM it feeds)

**6.6's substrate:**
- **F1 — the five are opaque member ids.** `selected_member_ids uuid[]` (CHECK `cardinality <= 5`) on `claim_peer_mesh_selections`; one
  `claim_peer_mesh_pings` row per (selection, member) — `ping_id`, `selection_id`, `pariwar_id`, `member_id`, `message_key` (default
  `'peer_mesh_verification_request_v1'`, `schema/claim_peer_mesh_pings.ts:32`), `constructed_at`; `UNIQUE (selection_id, member_id)`;
  ⛔ no dispatch columns (0054 `:64-72`) ⇒ PM4.
- **F2 — the delivery columns are PRE-AUTHORISED here.** `schema/claim_peer_mesh_pings.ts:3-13` (D1): *"Those are the dispatch-composition
  story's to add via its OWN migration"* — this is that story ⇒ PM4. ⚠ The same header's *"There is still NO live `dispatch()` caller
  anywhere"* is STALE (`contribution-notify.ts`, `claim-correction-reminders.ts:597`) ⇒ PM18.
- **F3 — "nearest" = same latest posting district, then nearest `created_at`, then `member_id`** (`district_cohort_v1`,
  `peer-mesh-metric-registry.ts:65,113`); candidates = every `members.state='active'` member of the Pariwar except the deceased and the
  claimant (`peer-mesh-read.ts:73-105` — ⚠ the correlated-subquery fix at `:60-87`, [[project_epic6_drizzle_correlated_subquery_bug]];
  ⛔ never "simplify" it). ⚠ A suspended member CAN be chosen (`member/moderation/index.ts:22` forbids a moderation predicate there), and a
  member who has themselves died stays `active` ([[project_death_is_an_overlay_not_a_state]]) ⇒ PM1.
- **F4 — the window runs from SELECTION, ⛔ not from any send:** `response_window_expires_at = now + 72 h`
  (`apps/jobs/src/claim-peer-mesh.ts:46,226`; env `CLAIM_PEER_MESH_WINDOW_SECONDS`, `boot.ts:172-176`); the WINDOW worker resolves
  `sufficient` (≥ 3 distinct responders, `:49`) or `insufficient_responses_fallback` through the monotonic `resolvePeerMeshOutcome`
  (`WHERE outcome='pending'`) and ⛔ never moves the claim ⇒ PM6.
- **F5 — `claim.peer_mesh_pinged` is the ONLY edge into checking** (`documents_pending → verification_in_progress`, `state.ts:131-133`) and
  6.19d's day-0 anchor (CR3, `certificate-reminder.ts:132-169`) ⇒ PM5 (⛔ never a second pinged event, ⛔ never moved).
- **F6 — the SELECT worker calls itself frozen and takes injected hooks** — the 6.12 shepherd enqueue precedent
  (`claim-peer-mesh.ts:346-356`; boot wiring `boot.ts:512-523`) ⇒ PM5.
- **F7 — `recordPeerMeshResponse`** (`peer-mesh-persist.ts:222-279`): raw `pg.PoolClient` (caller owns the scope tx); refuses ⛔ no selection
  (`PeerMeshSelectionNotFoundError`), a non-selected responder (`PeerMeshResponderNotSelectedError`), a resolved window
  (`PeerMeshWindowResolvedError`), a claim ⛔ not in `verification_in_progress` (`PeerMeshClaimNotInVerificationError`), a second answer
  (`PeerMeshResponderAlreadyRespondedError`, by `SELECT … FOR UPDATE` on the ping row); emits `claim.peer_mesh_responded` with
  `actor: 'member'`, `actorId = responder` (`:267-279`). ⛔ No production caller ⇒ PM7, PM8, PM12.
- **F8 — the event payload** `requireIdentityTransition({ ...auditShape, responder_member_id, response: z.enum(['confirmed','denied','unknown']) })`
  (`events.ts:157-161`; registry `packages/events/src/registry.ts:212`); reducer = identity (`state.ts:138-139`); ⛔ no date, ⛔ no free text ⇒ PM7.
- **F9 — the operator affordances exist only as functions** (`extendPeerMeshWindowAndReschedule`, `claim-peer-mesh.ts:458-478`;
  `extendPeerMeshWindow` / `skipPeerMesh`, `peer-mesh-persist.ts:325-375`) — ⛔ no route, ⛔ no UI, ⛔ no alert ⇒ PM19 (⛔ not built here).
- **F10 — a refile gets a FRESH selection** (a new `claim_case_id` through OCR → `documents_pending` → SELECT) — usually the SAME five
  (deterministic over the same roster); the refused claim's selection stays `pending` but inert (6.24a's file) ⇒ PM1 (a second text to the
  same five for the same death is EXPECTED and recorded), Trap 7.
- **F11 — the zero-candidate stall:** a claim whose selection finds ⛔ no candidate is `skipped` and ⛔ never leaves `documents_pending`
  (`claim-peer-mesh.ts:249-264`; deferred-work item *"A claim whose peer mesh finds ZERO candidates never leaves documents_pending"*) ⇒
  PM20 (⛔ not taken here).

**6.10's console:**
- **F12 — the transcript has ⛔ no outcome, ⛔ no window, ⛔ no skip reason, ⛔ no name, ⛔ no time, ⛔ no date.** `PeerMeshTranscript
  {selectionId, distinctResponderCount, pingedMemberIds, responses, verifierAnnotations}`, `PeerMeshResponseItem {responderMemberId,
  response}` (`packages/contracts/src/claims/verifier-console.ts:150-187`); the UI prints each responder as a raw UUID
  (`SignalsPanel.tsx:158-192`); `verifierAnnotations` is hard-coded `{status:'not_available_yet'}` (handlers `:795`; a `present` variant is
  REJECTED by `packages/contracts/tests/claims-verifier-console.test.ts:247`). `VERIFIER_CONSOLE_MAX_READS = 21` (handlers `:187`); the
  section costs 1 read empty, 3 present ⇒ PM13.

**The warnings machinery (6.23a / 6.23b / 6.26b):**
- **F13 — the kinds list and its pin.** `APPROVAL_WARNING_KINDS` (`approval-warnings.ts:100-113`) = `post_death_version,
  recent_nominee_change, inspection_death_date_differs, original_certificate_mismatch, register_check_mismatch`; pinned by
  `packages/domain/tests/claim/approval-warnings.test.ts:57-70` with the 6-27 tripwire message; contracts mirror
  `packages/contracts/src/claims/verification-decision.ts:129-137` with the lockstep test
  `packages/contracts/tests/claims-verifier-decision.test.ts:225-229` ⇒ PM9.
- **F14 — two readers, one pure derivation.** `readClaimApprovalWarnings` (`:427-540`) and `readClaimApprovalWarningsBulk` /
  `readClaimApprovalWarningsSlice` (`:567-676`, `BULK_READ_SLICE = 500` `:551`) both map through `deriveClaimApprovalWarnings`
  (`:737-806`, ⛔ not exported); 6.26b's shared column fragment `deathFactColumnsSql()` (`:372-418`) is the pattern; the death-fact kinds derive
  OUTSIDE the `postDeath === 'evaluated'` block (`:762-776`) ⇒ PM9.
- **F15 — lateness is set membership, ⛔ never a timestamp.** `lateWarningKeys` (`:930-933`) = current keys ∖ the District Admin approval's
  `covered_keys`; ⛔ no "first seen" exists. ⇒ (i) if the District Admin approved with ⛔ no warning, there is ⛔ no approval row
  (`verifier-decision-persist.ts:482`) and every later key is late; (ii) a key present at approval is covered for good ⇒ the SUBJECT
  choice is a ruling-sized choice (6.26b Trap 16) ⇒ PM9 keys per ANSWER.
- **F16 — the wait has ⛔ no per-kind filter.** `assertLateWarningsCovered` (`:893-903`) → `lateWarningWait` → `uncoveredKeys` (`:816-830`)
  ⇒ a new kind enters the wait by construction ⇒ Q2.
- **F17 — the correction queue's late arm needs a disjunct per source.** `lateArm` (`correction-queue-read.ts:155-187`): a live approved
  `v` AND ((1) a determination `decided_at > v.decided_at`, (2) an inspection `completed_at > v.decided_at`, (3) relies on an inherited
  visit); used as the `lateWarningCandidate` column AND the WHERE; scan states `CORRECTABLE_SCAN_STATES` (`:53`) + `state_trustee_approved`
  while R9-routed (`:245`) ⇒ PM10.
- **F18 — the gate order** (`assertClaimApprovable`, `nominee-name-check.ts:403-435`): certificate → name check → ground inspection (GI1)
  → suspicion appeal (`step==='final'`, RF5) → the wait (EA2, *"stays LAST"*, `:434`). ⇒ ⛔ no new conjunct (Invariant 1).
- **F19 — the cycle-freeze commit ⛔ never re-reads warnings** (`commitCycleFreeze`, `state-trustee-decision-persist.ts:1308-1340` — *"⛔ Never
  the full gate"*) ⇒ a key that appears AFTER the final vote is checked by ⛔ nothing ⇒ PM8 closes the acceptance at the final vote.
- **F20 — the revise lock** (NW7): `reviseDecision` refuses once `records.length > 0 || kinds.length > 0` (`warning_approval_final`,
  `verifier-decision-persist.ts:669-675`) ⇒ a late neighbour key also makes the District Admin's approval unrevisable — RECORDED (PM9),
  ⛔ not changed.
- **F21 — a late DATE key is reachable even without PM8**: a certificate re-review after approval can move the accepted date from equal
  to differing against an existing answer (`-289` L5(f)'s path); the queue's determination arm (1) already fires for it (GI7) ⇒ PM10.
- **F22 — the console's kind words are typed.** `kindLine` (`apps/admin/src/modules/claim-verification/i18n-en.ts:138-150`) `satisfies
  Record<ApprovalWarningKind, string>` ⇒ typecheck forces each new kind's words; renderers iterate generically
  (`VerificationDecisionStrip.tsx:342,427`, `LaterApprovalWarnings.tsx:87-89`); `apps/admin/tests/verifier-console.test.tsx:396` forbids a
  date in any `kindLine`. ⚠ The admin console is English-only (⛔ no `i18n-hi.ts` in `apps/admin`) ⇒ PM13.

**Sending, mobiles, the app, the API:**
- **F23 — the send core** `sendClaimDltSms(deps, { dltTemplateIdConfigKey, pariwarId, e164, render: (helpline) => string })`
  (`claim-dlt-sms-send.ts:70`) ALWAYS resolves the per-Pariwar helpline (`claimCorrectionHelplineConfigKey`) and fails CLOSED (missing id /
  helpline / gateway ⇒ final `error` + `alarm: true`); classification `:110-125` (`invalid_number` ⇒ `rejected_invalid_number`,
  `carrier_reject` ⇒ `rejected_unreachable`, `rate_limited` / `api_unavailable` / timeout ⇒ transient, else `error` + alarm); it ⛔ never logs and
  ⛔ never alarms (callers do) ⇒ PM2, PM3.
- **F24 — 0151 is the wrong home** (`UNIQUE (pariwar_id, claim_case_id, purpose)` = one recipient per claim; `recipient_version_id` FK to
  `member_nominee_versions`; suspicion-specific re-check vocabulary) ⇒ PM4 puts the record on the ping row.
- **F25 — a member's mobile:** `member_identities.mobile_ciphertext` (Tier-1, `schema/member_identities.ts:45`) read by
  `waOptIn.getMemberMobileCiphertext` (`packages/domain/src/wa-opt-in/read.ts:118`), decrypted by `decryptMobile`
  (`encryption/member-fields.ts:137`), then `normalizeMobile` (`:92`). ⚠ Erasure writes an ENCRYPTED `'[anonymized]'` sentinel
  (`member/anonymize.ts:77,156`) and `resolveSmsTarget` (`notifications/delivery.ts:157-175`) does ⛔ not normalise ⇒ it would return the
  sentinel as an address ⇒ PM1 decrypts → normalises → `null` ⇒ `no_target`. ⛔ Never `mobile_blind_index` as a hash namespace — the row's
  number hash is `claim.correctionNumberHash(e164, pariwarId, enc)` (`claim/correction-crypto.ts:58`).
- **F26 — members have ⛔ no locale column**; 6.24b's (a)/(b) texts are `hi`-only for the same reason (`LOCALES_OF`,
  `claim-suspicion-notices.ts:92-94`, RF11) ⇒ PM3.
- **F27 — the member answer pattern is Polls** (`GET /api/v1/p/:pariwarId/member/surveys`, `POST …/surveys/:surveyId/responses` —
  Turnstile header + `Idempotency-Key`, one final response per member; `apps/api/src/modules/surveys/member-routes.ts:68,84`); member
  routes take `requireMemberSession(deps)` (`auth/shared/member-session-guard.ts:25`), a `perMemberKey` write budget
  (`helpdesk/member-routes.ts:47-52`), open their OWN `openScopeTx` (`modules/multi-tenant/scope-tx.ts:34`), map a path `pariwarId` that is
  ⛔ not the session's to a 404 (`helpdesk/member-handlers.ts:261-273`), and write inside `audit.withCompensatingAudit`
  ([[project_helpdesk_member_surface_102]]) ⇒ PM11.
- **F28 — the helpline chain** `[requireAdminSession, scopeResolutionHook, requirePermissionHook('claim.file'), requireStepUp('claim_file')]`
  (`claims.helpline.routes.ts:93-218`), trust anchor = the operator's step-up + a verbal read-back; `claimActorSchema` admits `'operator'`
  (`claim/events.ts:61`) ⇒ PM12.
- **F29 — the go-live roster ends at Row 26** (`docs/launch-gate-inventory/inventory-roster.md`, `jobs-db-role` — the production jobs login
  holds ⛔ no privileges on claim tables ⇒ any new jobs sweep fails 42501 in production until it closes); the DLT sheet
  (`docs/launch-gate-inventory/dlt-template-requests-6-19.md`) carries templates 1–12 ⇒ PM16.

## ⚖️ Build decisions PM1–PM22 (PROPOSED — answered by BigDev at Task 0.3, committed by ONE author-commit at Task 0.4)

- **PM1 — who is texted: the five 6.6 chose, minus those the Trust must ⛔ not text — ⛔ never replaced.** At send time (the child's locked
  re-check, PM5) a ping is finished `no_target` with a fixed detail when its member: is ⛔ not `members.state = 'active'`
  (`no_target:peer_not_active`); has ANY claim filed naming them as the deceased (`no_target:peer_reported_deceased` — ⚠ includes a
  wrongly filed claim against a living member, who is locked by `-238` anyway); has an erased or unresolvable mobile after decrypt →
  `normalizeMobile` (`no_target:no_sendable_number`). The selection, its ping rows and FQ10's 3-reply count are ⛔ not changed; ⛔ no
  sixth member is chosen (Invariant 4). ⚠ RECORDED, ⛔ not fixed: the deceased's family members who are themselves members (other than the
  claimant) are ⛔ not excluded by 6.6 and ⛔ not here — the Trust has ⛔ no family-link data (deferred-work item, Task 12.4). ⚠ A refile texts the
  same five again for the same death (F10) — expected.
- **PM2 — the channel (Q1 A): one DLT text per ping, through `sendClaimDltSms` UNCHANGED** (RB4 — moved once, ⛔ never copied), with a sibling
  registry `apps/jobs/src/scheduler/peer-mesh-sms-templates.ts` (the `suspicion-notice-sms-templates.ts` shape: `copyKey`,
  `dltTemplateIdConfigKey`, `registeredText`; ⛔ not `SMS_DLT_TEMPLATE_REGISTRY`, ⛔ not `dispatch()`, ⛔ no `AlertCategory`). Config keys
  `sms.dlt.template_id.peer_mesh.request.<locale>`; the helpline slot is the per-Pariwar key the core already resolves (F23).
  ⚠ Re-plan: Q1 B ⇒ PM3 only; Q1 C / D ⇒ this PM, PM3–PM5 and Tasks 2–3 drop (see *"Re-plan by answer"*).
- **PM3 — what the text says (Q1 A).** Copy key `peer_mesh_sms.request` in `packages/i18n/locales/{en,hi}/claim.json` (+
  `$comment.peer_mesh_sms` in BOTH: NOT-YET-HUMAN-REVIEWED + *"must match the registered DLT content byte for byte"*, RB1's form).
  en: *"We have been told that {member} has died. If you knew them, please answer two short questions: {link} — or call the helpline
  {helpline}."* (the routing note's wording minus its *"TWT:"* prefix — the DLT header names the sender; `{link}` per PM21; the slots in
  order: member, link, helpline). ⚠ Hindi is Unicode — 70 characters per segment (67 when concatenated) — so the Hindi text with a name,
  a link and a number is likely THREE segments: the DLT sheet's cost section records the per-text segment count (`-255` consequence 2's
  cost-per-message line). ⚠ **v1.3 (6.30 SIX FACTS #3):** TRAI's 18 Nov 2025 Direction requires TYPED variables — `{member}` registers
  as `{#alphanumeric#}` (≤ 40 chars — ⚠ whether it accepts Devanagari with spaces is UNCONFIRMED: ask the provider at registration; a
  name that cannot fit ⇒ `no_target:name_too_long`, ⛔ never a truncated name), `{link}` as `{#url#}`, `{helpline}` as `{#cbn#}` (both
  checked against the operator's whitelist). hi: agent-authored,
  human review = Row 28. ⚠ **v1.4 — `-303`'s rider:** sent in the member's PREFERRED language (PM22) — `hi` (template 13) or `en`
  (template 14), both registered AND both sent; the sweep's config check needs BOTH locales' ids (the `appeal_notice` precedent); the
  locale is read once per child OUTSIDE the claiming transaction, with the name. `{member}` =
  the Pariwar's mode-resolved name (`-181`; `notifications.resolveMemberFacingDeceasedName`), read once per child OUTSIDE the claiming
  transaction; erased / unresolvable / ⛔ no KYC name ⇒ `no_target:name_<reason>` (RB5) — ⛔ never a blank. ⛔ No claim, money, family,
  nominee, claimant or reporter; ⛔ no deadline word (6.19's S4 / T6 deny-list holds in full — RB16). ⭐ D33 carve-out recorded: 6.19's
  registry stays name-free; this registry names the member because the routed text does (Q1 A).
- **PM4 — the record: delivery columns on `claim_peer_mesh_pings` (F2), with 0151 / 0155 parity** — migration `0156_claim-peer-mesh-request-sms.sql`
  (hand-authored; journal entry; applied to :5432 AND :5433, proven from zero — [[project_live_db_test_gotchas]]): `send_outcome text NULL`
  (`NULL` = ⛔ not yet begun; else 0138's eight values — invent ⛔ none), `attempt_count int`, `claimed_at`, `claimed_by_job`, `aging_since`,
  `parked_at`, `detail`, `first_detail`, `provider_message_id`, `recipient_number_hash`, `send_updated_at`; CHECKs mirroring 0155
  (`attempting` ⇒ `claimed_at` and `claimed_by_job`; the parked CHECK `claimed_by_job = 'sweep:held'` ⇔ `parked_at`; `detail` /
  `first_detail` ≤ 200 + a grammar CHECK mirroring a NEW `PEER_MESH_REQUEST_DETAIL_PATTERN` with the `(?!.*[0-9]{7})` lookahead); a
  finished-row trigger (a finished `send_outcome` is ⛔ never rewritten; `aging_since` forward-only); `UPDATE` grant narrowed to exactly these
  columns (the 6.6 INSERT stays); the partial index `(aging_since, claimed_at) WHERE send_outcome = 'attempting'`. ⭐ ONE `detail` builder
  in the domain, asserted by every writer, CHECKed by the DB (RN5 — a RAW gateway code is SANITISED before it is stored, 6.29 F13 / Trap 4).
- **PM5 — when it is sent.** (i) The SELECT worker, after its commit, enqueues one child per ping through an INJECTED
  `enqueuePeerMeshRequestSend` dep (F6 — the only edit to `claim-peer-mesh.ts` is the hook call; ⛔ never a second `claim.peer_mesh_pinged`, F5).
  (ii) A daily sweep (`'30 10 * * *'` IST) is the backstop, with 6.29's hold / park / give-up (RN2: a held (Pariwar) scope parks its stalled
  rows, ⛔ no new row; RN3: give up three IST days from `aging_since`, credited only parked time; RN7: the re-claim re-checks the lease).
  (iii) **Quiet hours:** a child that would send outside 09:00–20:00 IST is re-enqueued with `startAfter` = the next 09:00 IST (⛔ never a text
  at night about a death). (iv) **The locked re-check** (claim row lock, then COMMIT, then decrypt — ⛔ no KMS under a lock): the claim is
  still in `verification_in_progress` or `verifier_review` (⛔ no text once the District Admin has decided — that would only manufacture late
  answers) ⇒ else `skipped_superseded` / `superseded:claim_decided`; then PM1's exclusions.
- **PM6 — the 72 hours are ⛔ not changed** (FQ10 A *"as built"*): still from selection; the outcome label still `sufficient` /
  `insufficient_responses_fallback`, monotonic. ⚠ RECORDED: a held send shortens the time a neighbour had before the label resolves —
  harmless, because the label gates ⛔ nothing (FQ9 requires the inspection anyway) and PM8 keeps answers open past it.
- **PM7 — the answer: TWO questions, a reply row, the event kept** (⚠ v1.4 — the ratified text promises *"two short questions"*, and the
  Panel asked to see them; the answer relayed is recorded in the routing note's ruling block). ① *"Has {member} died?"* — *Yes, they have
  died* (`died`) · *No, they have not died* (`not_died`) · *I am not sure* (`not_sure`) · *I did not know them* (`did_not_know`); ② ONLY
  after `died`: *"If you know, on what date did they die?"* — a date or *"I don't know the date"*. Then *"Thank you. Your answer has been
  sent to the Trust."* The helpline operator asks the same two (PM12). Words en + hi exactly as in the routing note's ruling block
  (copy keys under `peer_request.*`; the Hindi agent-written — Row 28). Stored on a NEW table `claim_peer_mesh_replies` (migration `0157_claim-peer-mesh-replies.sql`): `reply_id` PK
  (the warning SUBJECT), `pariwar_id`, `claim_case_id`, `selection_id`, `ping_id` UNIQUE (FK), `responder_member_id`,
  `answer text NOT NULL CHECK IN ('died','not_died','not_sure','did_not_know')`, `death_date_ciphertext` (Tier-1 `piiColumn`, field
  class `DEATH_DATE_INDEX_FIELD_CLASS`'s sibling as 6.26a's), `death_date_window_indexes bytea[]` (exactly 3, NULL ⇔ ⛔ no date; CHECK both
  NULL or both set, and ⛔ no date unless `answer = 'died'`), `recorded_via text CHECK IN ('member_app','helpline')`, `recorded_by_actor_id`,
  `recorded_at timestamptz DEFAULT clock_timestamp()` (RD1 / K3's clock — PM10 orders on it). RLS ENABLE + FORCE, four tenant policies;
  `GRANT SELECT, INSERT` only (an answer is final — ⛔ no UPDATE, ⛔ no DELETE). The date: ⛔ never in the future (IST today), ⛔ never before 1900-01-01.
  The event `claim.peer_mesh_responded` keeps its payload ⛔ not changed — `response` mapped: `died` ⇒ `confirmed`;
  `not_died` ⇒ `denied`; `not_sure` and `did_not_know` ⇒ `unknown` (⭐ `denied` ⇔ *"has not died"* ONLY — F5 of the FIVE FACTS). The date ⛔ never rides the
  event (Invariant 6).
- **PM8 — when an answer is taken: while an approval is still to come.** `recordPeerMeshResponse` drops its `verification_in_progress` and
  `pending`-window guards and accepts an answer while the claim is in `CLAIM_REVIEW_WINDOW_STATES` (`claim/review-window.ts:15` —
  `verification_in_progress`, `verifier_review`, `verifier_approved`, `reversed`, `state_trustee_freeze`); keeps the not-selected and
  already-answered guards; ⛔ never accepts in `state_trustee_approved` or any closed / refused state (F19 — nothing would read it). A refused
  answer tells the member *"Thank you — this request is no longer open"* (⛔ not why). The 72-hour label counts only answers before it resolved
  (monotonic, ⛔ no recount). ⚠ RECORDED: an R9-routed claim sitting in `state_trustee_approved` takes ⛔ no answers (6.26a's `-283` A1 widened the
  INSPECTION there, ⛔ not this). ⚠ Re-plan: Q2 C ⇒ the window narrows to `verification_in_progress` / `verifier_review`. ⚠ A reply racing an
  approval in flight is BENIGN by construction: its key misses the approval's `covered_keys` ⇒ late ⇒ the wait and the queue catch it
  (F15) — prove it with an own-committing ordering test (Task 11.3), ⛔ never add a lock.
- **PM9 — the two kinds** (appended to `APPROVAL_WARNING_KINDS` after `register_check_mismatch`; ⛔ not in `NOMINEE_VERSION_WARNING_KINDS`):
  - **`peer_says_not_died:<reply_id>`** — present ⇔ a reply of THIS claim has `answer = 'not_died'`. It needs ⛔ no certificate.
  - **`peer_death_date_differs:<reply_id>`** — present ⇔ the reply's `death_date_window_indexes` is non-null AND the current accepted review's
    `accepted_date_index` is non-null AND is ⛔ none of the three. ⛔ No accepted certificate, or a pre-6.26b review (`accepted_date_index`
    NULL) ⇒ ⛔ no key (6.26b L4 / `not_indexed`). *"More than a day"* = **two or more calendar days apart** (the window = the neighbour's
    date D, D−1, D+1, computed in the API at write time by plain `YYYY-MM-DD` calendar arithmetic — month / year / leap-day boundaries —
    each keyed under `DEATH_DATE_INDEX_FIELD_CLASS` by `deathDateBlindIndex`, `apps/api/src/modules/claims/ground-inspection-crypto.ts:63-65`;
    ⛔ never a second field class — GI5). Re-evaluates by itself when a certificate re-review moves the accepted date.
  - Both: own claim ONLY (⛔ never inherited — `-261` C3, Trap 7); derived OUTSIDE the `postDeath` block; ONE SQL fragment
    (`peerReplyColumnsSql()`) selected by BOTH readers, the bulk one included; ONE exported pure helper called by `deriveClaimApprovalWarnings`.
  - **Enter the wait (Q2 A)** — ⛔ no edit to the assertion; the pin test's message keeps the tripwire sentence and adds the discharge
    (*"6-27's kinds enter by `<Q2 ruling id>`"*). ⚠ RECORDED: a late neighbour key also makes the District Admin's approval unrevisable
    (F20). ⚠ Re-plan: Q2 B / C — see above.
- **PM10 — the correction queue's FOURTH source.** `lateArm` (`correction-queue-read.ts:155-187`) gains ONE hoisted disjunct: `EXISTS
  (SELECT 1 FROM claim_peer_mesh_replies r WHERE r.claim_case_id = c.claim_case_id AND r.recorded_at > v.decided_at)` — used by the
  column AND the WHERE (6.26b RD2 — ⛔ never two copies); the *"THREE sources"* comment amended, ⛔ never deleted. ⛔ No change to the scan states (PM8
  takes ⛔ no answer in `state_trustee_approved`). F21's re-review path rides arm (1) already — proven, ⛔ not re-built.
- **PM11 — the member's answer screen (pull).** Contracts `packages/contracts/src/claims/peer-request.ts`; routes (`apps/api/src/modules/claims/`,
  the Polls shape, F27): `GET /api/v1/p/:pariwarId/member/peer-requests` → the session member's OPEN requests `{ pingId, memberName
  (mode-resolved), askedOn (IST date) }`; `POST /api/v1/p/:pariwarId/member/peer-requests/:pingId/reply` body `{ answer,
  deathDate? }` → 201; Turnstile + `Idempotency-Key` + `perMemberKey` budget; 404 (⛔ never 403) when the ping is ⛔ not the session member's or ⛔
  open; 409 `peer_request.no_longer_open` / `peer_request.already_answered`. **Open** = ⛔ no reply AND the claim is in PM8's window AND
  `send_outcome IS DISTINCT FROM 'no_target'` (a peer PM1 decided ⛔ not to ask is ⛔ never shown the request). api-client factory
  (`createMemberPeerRequestClient`); mobile: a card on `app/(tabs)/index.tsx` while ≥ 1 request is open (*"The Trust has asked you about
  a member"*), ONE route file `app/(peer-request)/peer-request.tsx` (URL `/peer-request` — ⚠ v1.3: a group-only `index.tsx` or
  `[code].tsx` would collide with the TEN existing `/` files and the two root-level catch-alls, 6.30 F5 / AL16) that shows the list, or —
  with `?c=` — resolves the code (PM21 (d)) and opens the two-question screen, en + hi in the mobile claim namespace (`lib/claim-i18n.ts`;
  `$comment` marker; Row 28). The screen shows ⛔ no claim, ⛔ no family, ⛔ no amount — the name only. The empty / loading / error states
  render OUTSIDE any list ([[project_fabric_flatlist_empty_populated_crash]]); depend on `locale`, ⛔ never `t`
  ([[project_uset_fresh_closure_memo_trap]]). ⭐ The same screen is also reached from the text's link (PM21).
- **PM12 — the helpline records an answer for a neighbour who phones.** `GET /api/v1/p/:pariwarId/claims/helpline/members/:memberId/peer-requests`
  and `POST /api/v1/p/:pariwarId/claims/helpline/peer-requests/:pingId/reply` on 6.3's chain (F28 — `claim.file` + step-up; ⛔ no new
  permission key, ⛔ no RBAC catalog bump — RECORDED as a reuse, 6.21b D5's precedent); the operator finds the caller by 6.3's member lookup,
  reads back, records the same three answers; `recorded_via = 'helpline'`, `recorded_by_actor_id` = the operator; the event carries
  `actor: 'operator'`, `actorId` = the operator, `responder_member_id` = the neighbour (✅ checked 2026-10-10: `requireIdentityTransition` only refines `from_state === to_state` on a strict object, and `actor` is
  `claimActorSchema`, which admits `'operator'` — `claim/events.ts:61`, `:92`, `:98-103` ⇒ ⛔ no schema change; ⚠ `from_state` /
  `to_state` are the claim's CURRENT state, which PM8 widens beyond `verification_in_progress`). Admin UI: a
  *"Requests to confirm a death"* panel on the helpline member-lookup screen.
- **PM13 — what staff see** (the verifier console's peer-mesh section, `assemblePeerMesh` + `PeerMeshView`; English only, F22):
  the 72-hour line (*"Fewer than 3 answers in 72 hours — the ground inspection is the main check"* / *"3 or more answers"* / *"Still
  open until {date}"* / *"⛔ No neighbour could be chosen"*); per ping: the neighbour's NAME (staff form, decrypted in the HANDLER — ⛔ never the
  warning module), the send status (*"text sent"* / *"⛔ not texted — {reason}"* / *"text failed"* / *"not sent yet"*), and the answer
  (the answer / *"answered in the app"* or *"recorded by the helpline"* / the IST time), the date given (decrypted in the handler —
  FQ8 E: *"the District Admin is shown answers"*) with *"more than a day from the certificate"* from the WARNINGS read (Invariant 8);
  the two `kindLine`s (⛔ no date in them — `verifier-console.test.tsx:396`). `VERIFIER_CONSOLE_MAX_READS` bumped to the exact new ceiling
  with a ledger line and a `toBe`. `verifierAnnotations` STAYS `not_available_yet` — staff NOTE capture on an answer is ⛔ not built (the
  reason + note under the rule is the staff's written response); the deferred item is updated, ⛔ not closed. The family's app, the claim
  status page and every public page show ⛔ nothing new (Invariant 7).
- **PM14 — ⛔ no new events beyond the existing one.** Sending writes the ping row only (0151's precedent); `claim.peer_mesh_pinged` stays the
  selection's (F5).
- **PM15 — alarms: ids only** — the end-of-run held-scope alarm, a final `error`, a re-claimed `attempting` that fails its re-check
  (`-297` §2 ⇒ `error` + alarm, ⛔ never `skipped_superseded`), a `no_target` on a re-claimed row (`-298` *"may have sent"*); ⛔ no alarm for
  PM1's `no_target`s (expected outcomes). ⚠ The named owner is Row 27 (d) — ⛔ not fixed here (`-296` *"no owner was ruled"*).
- **PM16 — the go-live records.** NEW roster rows (decision-authored, appended after Row 26): **Row 27 `peer-mesh-request-counsel-basis`**
  — closes on ALL of (a) counsel's basis for telling five members of a reported death, (b) a privacy-policy revision naming the purpose,
  (c) the Panel's Q1, (d) the alarms reaching a named owner through a real transport (Row 22 (d)'s bar), (e) the link works —
  row 6-30 `done`, the domain set as `APP_LINKS_BASE_URL` and whitelisted with the operator (PM21 (f)); **Row 28
  `peer-mesh-request-hindi-human-review`** — the SMS and the app screen's Hindi. DLT templates **13 (hi) / 14 (en)** in the sheet, *"⛔ never
  provision the ids until Row 27 closes"*; unset ids ⇒ the sweep HOLDS and alarms (RB12), ⛔ never uses up a slot. ⚠ Row 26 (`jobs-db-role`)
  applies to the new sweep — RECORDED on Row 26, ⛔ not fixed (6.29's scope call). ⭐ Go-live gates ⛔ never block a merge
  ([[project_not_in_production_merge_is_not_golive]]).
- **PM17 — erasure.** On erasure of the DECEASED member: each reply's `death_date_ciphertext` and `death_date_window_indexes` are erased
  exactly as GI13 erases `claim_ground_inspections`' death facts (`member/anonymize.ts`; the rtbf pins). On erasure of the RESPONDER: their
  ⛔ no identity is in the reply (an id only); the answers stay as claim evidence — ⚠ whose data an answer is stays OPEN (GI13's deferred item
  gains this table; ⛔ not decided here).
- **PM18 — stale text corrected in the files this story touches** (⛔ no standalone edits): `schema/claim_peer_mesh_pings.ts:9-10` (*"NO live
  dispatch() caller"*); `apps/jobs/src/claim-peer-mesh.ts:22-23` and `packages/queue/src/index.ts:138` (*"the operator signal the verifier
  console reads"* — it now does); `packages/contracts/src/claims/verifier-console.ts:160-162` (*"No owning producer story exists yet"*);
  the deferred-work 6.10 item's stale `events.ts:125-134` cite (now `:157-161`); the memory `project_claim_verification_signals_unfinished`
  (staff DO see responses today — as raw ids).
- **PM19 — ⛔ not built, recorded:** FR-39's *"non-response after 72 hours → escalate to block admin"* and 6.6 AC6's operator extend / skip
  (F9) — the console's 72-hour line (PM13) is the signal; since FQ9 the inspection gates every approval, so ⛔ no alert is owed by any ruling.
  A deferred-work item, ⛔ never a supersession (FR-39 is PRD text, ⛔ not amended by any ruling here).
- **PM20 — ⛔ not taken: the zero-candidate stall** (F11) — the deferred item stays open; this story's console line shows *"⛔ No neighbour
  could be chosen"* for a `skipped` selection so the stall is at least VISIBLE.
- **PM21 — the link in the text (BigDev 2026-10-10: *"separate story"* — the plumbing is row `6-30`, THIS story owns the code, the path,
  the route and the resolver).**
  (a) **The code.** A `link_code` column on `claim_peer_mesh_pings` (migration 0156): 12 characters base62 from a CSPRNG (~71 bits),
  `UNIQUE`, written ONCE by the child's begin UPDATE (in the narrowed UPDATE grant) and ⛔ never rewritten (the finished-row trigger
  also refuses a change once set). It carries ⛔ no name, ⛔ no Pariwar, ⛔ no claim id and ⛔ no login: it is ⛔ not a credential.
  (b) **The URL** `{link}` = `buildAppLinkUrl(APP_LINKS_BASE_URL, 'peerRequest', link_code)` = `<origin>/peer-request?c=<link_code>`
  (⚠ **v1.3 — 6.30 AL2 / AL3 / AL5:** the code is a QUERY STRING, ⛔ never a path segment — India's operators whitelist the FIXED part
  and refuse dynamic paths; the builder and the path list are 6.30's `packages/contracts/src/app-links/` — ⛔ never re-created here; the
  base is the ENV VAR `APP_LINKS_BASE_URL`, validated every run by 6.30's `resolveAppLinksBaseUrl` — ⛔ not Secret Manager, whose dotted
  id `app_links.base_url` would hit the recorded INVALID_ARGUMENT defect); ⛔ not set or invalid ⇒ the sweep HOLDS (`config:app_links_base_url_invalid`) and alarms (RB12 — a missing config ⛔ never uses up a
  slot), so ⛔ no text is ever sent with a broken or placeholder link. The path is this story's; row `6-30` makes the domain's paths
  open the app and serves a plain fallback page for any of them.
  (c) **The app route** `app/(peer-request)/peer-request.tsx` serves `/peer-request` and reads `c` with `useLocalSearchParams()`
  (route GROUPS ⛔ never appear in a URL) → logged out ⇒ log in, then back to it (6.30 AL6 builds the return — ⛔ never worked around
  here) → the resolver → the two-question screen of PM11.
  (d) **The resolver** `GET /api/v1/p/:pariwarId/member/peer-requests/by-link/:code` → `{ pingId }` ONLY when the code's ping belongs
  to the SESSION member in that Pariwar; else **404** (unknown, someone else's, other Pariwar — one indistinguishable answer, ⛔ never an
  oracle); a closed request resolves and the screen says *"Thank you — this request is no longer open"*. `perMemberKey` read budget.
  ⇒ a forwarded link is useless to anyone but the person it was sent to.
  (e) The code is ⛔ never in a log, an alarm, an audit row or a `detail` (treated like a number even though it is not secret).
  (f) **Go-live:** a text carries a link ⇒ Row 27 gains closure condition (e) *"row 6-30 is `done`, the Trust's domain is set as
  `APP_LINKS_BASE_URL`, and the domain's URL is whitelisted with the SMS operator"* — ⚠ v1.3: 6.30 AL12's roster row (`app-links-live`,
  expected Row 29) carries the detail; Row 27 (e) points at it.
  ⚠ Re-plan: Q1 B ⇒ the name-free text keeps `{link}`; Q1 C / D ⇒ ⛔ no text ⇒ PM21 (a) / (b) / (f) drop; (c) / (d) stay only if row 6-30
  is wanted for other texts.
- **PM22 — the member's preferred language (`-303`'s rider; our reading, ⛔ not ratified).** The system stores ⛔ no preferred language
  today (FOUND 2026-10-10: the app's language choice lives only on the phone; `member_addresses.locale` / `consent_records.locale` record
  the language a FORM was shown in — ⛔ not a preference; `pariwar_passport.locale_default`, `schema/pariwar_passport.ts:86`, is the
  Pariwar's). ⇒ (a) NEW table `member_language_preferences` (migration 0158): `(pariwar_id, member_id)` PK, `locale` CHECK `IN ('hi','en')`,
  `updated_at`; RLS ENABLE + FORCE; ⛔ no PII. (b) The app writes it when the member CHANGES the language in the app, and once on the first
  signed-in launch when the server holds none (the language the app is showing then) — `PUT /api/v1/p/:pariwarId/member/preferences/language`
  `{ locale }`, `requireMemberSession`, 404-⛔-403, `perMemberKey` budget; ⛔ never written by staff, ⛔ never inferred from a form. (c) The sender reads
  it; ⛔ no row ⇒ the Pariwar's `locale_default` (Hindi for Bihar); ⛔ neither ⇒ `hi` (RF11's reason) — and the choice is logged as a CODE
  (`locale_source: preference | pariwar_default | fallback`), ⛔ never the language itself in any alarm. (d) Row `6-31`'s WhatsApp reminder
  reads the SAME preference (*"the same words"*). ⚠ A member who changed the language on the phone BEFORE this story shipped is recorded at
  their next signed-in launch — RECORDED. ⚠ A split is possible (the preference is app-wide and will serve every later member text) —
  BigDev's call at Task 0.3, ⛔ not made here.

## Acceptance Criteria

1. **AC1 — Task 0 first.** ⛔ No code is committed before (i) the Panel's Q1 / Q2 ruling is transcribed into the routing note's ⏳
   block and `.decision-log.md` (a new id), and (ii) ONE author-commit recording PM1–PM22 as answered (and re-planned per the ruling) is
   committed ALONE; the epics.md `### Story 6.27` entry, the two roster rows and the DLT sheet rows follow it, before Task 1.
2. **AC2 — each of the five is texted once (Q1 A).** Given a claim whose selection has pings, when the SELECT worker commits, then one
   child per ping is enqueued; each child, under the claim lock, re-checks PM5 (iv) and PM1, then (after COMMIT) decrypts, normalises,
   hashes and sends through `sendClaimDltSms` with the template of the member's PREFERRED language (PM22 — `peer_mesh.request.hi` or `.en`), rendering exactly the registered text with the
   mode-resolved name, the ping's link (PM21 — its code written once at begin) and the Pariwar's helpline; ⛔ no valid `APP_LINKS_BASE_URL` ⇒
   held like a missing template id (AC3); the ping row records `accepted` / a rejection / `no_target` / `error` per 0155's
   vocabulary; a second child or a sweep re-run ⛔ never sends again (once ever); a send outside 09:00–20:00 IST is deferred to 09:00 IST.
3. **AC3 — a held config uses up ⛔ nothing.** Given a missing template id, helpline or gateway, then ⛔ no ping is begun, one ids-only
   alarm is raised per run, and a row already `attempting` in a held scope is PARKED and given up only three IST days of UN-parked time
   later (RN2 / RN3 parity); once the config is set, every request still due is sent.
4. **AC4 — ⛔ no text after the District Admin decides, and ⛔ no text to a peer the Trust must ⛔ not ask.** A claim that has left
   `verification_in_progress` / `verifier_review` ⇒ `skipped_superseded`; a peer ⛔ not active, reported deceased, or with ⛔ no sendable
   number ⇒ `no_target` with its fixed detail; ⛔ no replacement peer; the selection rows unchanged.
5. **AC5 — the member answers in the app.** Given a member with an open request, the home screen shows the card; the screen asks the
   TWO questions (the date only after *"Yes, they have died"*; the words as in the routing note's ruling block); submitting records ONE reply row (`member_app`) and ONE
   `claim.peer_mesh_responded` event with PM7's mapping; a second submit is `already_answered` (or the idempotent replay of the first);
   a request that is ⛔ not the member's is 404; a closed claim is *"no longer open"*; ⛔ no claim, family or amount appears on any screen.
   ⭐ Opening the text's link (PM21) on a phone with the app lands on the same screen (after a login if needed); the resolver answers
   404 for an unknown code, another member's code and another Pariwar's code alike.
6. **AC6 — the helpline records an answer** for a neighbour who phones, on 6.3's chain with step-up; `recorded_via = 'helpline'`,
   the operator as actor; the same validation and the same final-answer rule.
7. **AC7 — answers are taken while an approval is still to come** (PM8): accepted in each of the five review-window states, including
   after the 72 hours resolved and after the District Admin approved; refused in `state_trustee_approved` and every closed / refused
   state; the 72-hour label ⛔ not recounted.
8. **AC8 — staff see the answers** (PM13): the 72-hour line, each neighbour's name, the send status, each answer, its time and how it was
   recorded, the date given and whether it is more than a day from the accepted certificate; a failed decrypt or warnings read shows
   *"could not be shown / checked just now"*, ⛔ never blank or "no warning"; the read ceiling is the exact bumped number.
9. **AC9 — the two warnings** (PM9): `peer_says_not_died:<reply_id>` for every *"has not died"*; `peer_death_date_differs:<reply_id>`
   exactly when the accepted certificate's date is two or more calendar days from the neighbour's (a one-day difference, either way,
   across a month / year / leap-day boundary, is ⛔ not a warning); ⛔ no key without an accepted certificate; ⛔ no inherited key on a refile; the
   single and bulk readers agree.
10. **AC10 — the one rule reaches every approver.** With a neighbour key showing, an un-reasoned approval is refused at the District
    Admin, the final vote, the escalation resolution, R9 vote / finalize, the Super Admin's G1 decision and the Pariwar Admin's
    no-correction approval — exactly as for 6.26b's kinds; a refusal or escalation is ⛔ never gated.
11. **AC11 — a late neighbour answer waits for the District Admin (Q2 A)** and lists the claim in their correction queue (PM10): the
    final vote and the other gated approvals refuse with `LateWarningReasonRequiredError` until the District Admin records a late reason;
    the queue lists the claim (own-committing ordering legs — a reply before vs after the approval's `decided_at`); a certificate
    re-review that moves the date from equal to differing is listed through arm (1).
12. **AC12 — ⛔ no PII escapes.** The neighbour's date is ⛔ never in an event, a log, an alarm, an audit row or a `detail`; `detail` /
    `first_detail` match the grammar CHECK; the warning module and every new domain module pass the decrypt fence.
13. **AC13 — erasure** (PM17): erasing the deceased member erases every reply's date ciphertext and window indexes; the rtbf pins cover
    the new table; the policy-regression specs cover both new / changed tables' RLS.
14. **AC14 — the records** (PM16 / PM18): Rows 27 and 28, DLT templates 13–14 with the exact registered text (proved by the lockstep
    test), the epics.md 6.6 / 6.10 annotations, the deferred-work updates, the stale comments corrected; `pnpm ci:local` green.

## Tasks / Subtasks

- [ ] **Task 0 — governance FIRST (AC1).** ⛔ No code.
  - [ ] 0.1 Put the routing note to the Panel (BigDev relays). ⛔ Never edit the note's question sections after sending.
  - [ ] 0.2 Transcribe the ruling into the note's ⏳ block AND `.decision-log.md` (next id after `-302`; *"what this ruling does ⛔ NOT
        cover"* included). If the answer is ⛔ not Q1 A / Q2 A, re-plan this file per *"Re-plan by answer"* BEFORE 0.3, and re-check P1 / P2.
  - [ ] 0.3 Put PM1–PM22 to BigDev (short option summaries — the 6.24b / 6.29 form); record each answer here.
  - [ ] 0.4 ONE author-commit (decision entry) recording PM1–PM22 as answered — committed ALONE; stage it in the scratchpad and try the
        insert first ([[project_decision_log_writes_user_inserted]]).
  - [ ] 0.5 epics.md `### Story 6.27` entry (after 6.26b; a dated "Added … Task 0.5" source line, ⛔ never a merge fence); annotate Story 6.6's
        AC (*"pinged via Story 5.1 dispatcher"* → the routed channel) and Story 6.10's AC2(c) — ⛔ never rewrites.
  - [ ] 0.6 Roster Rows 27 / 28 (PM16); DLT sheet templates 13–14 (text from Task 2.1, filled after it is fixed); a line on Row 26.
  - [ ] 0.7 Sprint ledger: a reverse-chron `last_updated` comment line ([[project_sprint_status_ledger]], [[project_sprint_status_safe_prepend]]).
- [ ] **Task 1 — migrations 0156 / 0157 / 0158 (AC2, AC3, AC5, AC12, AC13; 0158 = PM22's `member_language_preferences`).** Hand-authored, journal entries, applied to :5432 AND :5433 and proven
      from zero; Drizzle schema files updated (`schema/claim_peer_mesh_pings.ts` incl. PM21's `link_code`, NEW
      `schema/claim_peer_mesh_replies.ts`); RLS policy
      files + policy-regression specs; ⛔ never regenerate an applied migration.
- [ ] **Task 2 — the request SMS: copy, registry, domain record (AC2–AC4, AC12).**
  - [ ] 2.1 `peer_mesh_sms.request` en + hi + `$comment` in `claim.json` (slots member, link, helpline); `peer-mesh-sms-templates.ts`;
        the `APP_LINKS_BASE_URL` dep + its hold (PM21 (b) — 6.30's validator); typed DLT variables (PM3 v1.3); lockstep test proving the real `t()`
        renders exactly `registeredText` and that the DLT sheet carries it ([[feedback_stub_must_call_not_transcribe]]).
  - [ ] 2.2 NEW `packages/domain/src/claim/peer-mesh-request.ts` (cloned in SHAPE from `suspicion-notice.ts`, ⛔ never copied blindly): begin
        under the claim lock with PM5 (iv) + PM1's state / death-claim checks; the CAS finalise; the transient note; `peerMeshRequestDetail`
        builder mirroring the CHECK; `listStalledPeerMeshRequestScopes`, `parkHeldPeerMeshRequests`, the give-up by `aging_since`; it returns
        ciphertext as stored and ⛔ never decrypts; added to the decrypt fence (`nominee-name-no-comparison-fence.test.ts:378-392` arm) in the
        SAME commit.
- [ ] **Task 3 — the jobs child + sweep (AC2, AC3).** NEW `apps/jobs/src/scheduler/claim-peer-mesh-requests.ts` (child + daily sweep +
      registration; queue names in `packages/queue/src/index.ts`); the injected `enqueuePeerMeshRequestSend` in `claim-peer-mesh.ts` + boot
      wiring (`boot.ts`, beside the shepherd hook); quiet hours; decrypt → `normalizeMobile` → `correctionNumberHash` after COMMIT; ids-only
      alarms (PM15).
- [ ] **Task 4 — the answer writer (AC5–AC7, AC12).** Widen `recordPeerMeshResponse` per PM8 (keep its two member guards; new
      `PeerMeshRequestNoLongerOpenError`); insert the reply row (PM7) and the event in the caller's tx; the actor variants (member /
      operator, PM12); unit + integration tests for every state in and out of the window and the 72-hour label ⛔ not recounted.
- [ ] **Task 5 — the member API + contracts + api-client (AC5).** PM11's routes / handlers / contracts; the date-window indexes computed
      in the handler (`deathDateBlindIndex` ×3, PM9) and the ciphertext written; 404-⛔-403; Turnstile / Idempotency-Key / per-member
      budget; PM21 (d)'s by-link resolver; PM22's `PUT …/member/preferences/language`; route tests incl. the cross-Pariwar 404, the not-selected 404, and the resolver's three
      indistinguishable 404s.
- [ ] **Task 6 — the mobile screens (AC5).** PM22's write (on a language change, and once on the first signed-in launch when the
      server holds none); the home card, the list, the two-question screen, and PM21 (c)'s ONE route file
      `app/(peer-request)/peer-request.tsx` (`/peer-request`, `?c=`; 6.30's AL16 route-map test must pass); en + hi; component tests with a REAL `t()` leg; the FlatList rule. ⚠ Proving a REAL `https://` link opens it
      on a device is row 6-30's acceptance, ⛔ not this story's — here, test the route by navigating to the path.
- [ ] **Task 7 — the helpline recording (AC6).** PM12's two routes on 6.3's chain; the admin panel on the member-lookup screen; tests incl.
      ⛔ no step-up ⇒ refused.
- [ ] **Task 8 — what staff see (AC8).** Contracts (`PeerMeshTranscript` gains `outcome`, `windowExpiresAt`, per-ping `sendStatus`,
      `responderName`, `reply`); `assemblePeerMesh` (the decrypts in the handler, fail-closed); `PeerMeshView`; the read-ceiling bump with an
      exact `toBe`; `claims-verifier-console.test.ts:247` stays (annotations still `not_available_yet`).
- [ ] **Task 9 — the two kinds (AC9–AC11).** 9.1 `APPROVAL_WARNING_KINDS` + contracts mirror + `kindLine` (⛔ no date); 9.2
      `peerReplyColumnsSql()` in both readers + `RawWarningsRow` + one exported pure helper; 9.3 the pin test (tripwire kept + discharge
      cited); 9.4 live tests — every approver refused un-reasoned, the late wait at the final vote / Super Admin / Pariwar Admin, R9 votes
      short at finalize, bulk-vs-single parity, fixtures raise ⛔ no neighbour key by default.
- [ ] **Task 10 — the queue's fourth source (AC11).** PM10's disjunct (one hoisted fragment); a NEW own-committing spec
      (`correction-queue-late-peer-reply.spec.ts`, legs in SEPARATE committed transactions — [[project_db_clock_ordering_tests_tie]]);
      the fault path asserts "⛔ not a candidate", never a count.
- [ ] **Task 11 — erasure, fences, races (AC12, AC13).** 11.1 `member/anonymize.ts` + rtbf pins (PM17); 11.2 `FENCED_FILES` bumped for each
      new domain module + the import-discipline entry list (`approval-warnings.test.ts:338-370`); 11.3 the reply-vs-approval ordering test
      (PM8) and the two-connection begin race for the child (6.29's shape).
- [ ] **Task 12 — records and close (AC14).** 12.1 the stale comments (PM18); 12.2 deferred-work: 6.10's item updated (replies shown,
      annotation capture still open), PM17's erasure question onto GI13's item, PM19's item, F3's family-member item, PM20 noted on the
      zero-candidate item; 12.3 this file's Change Log + File List; 12.4 `pnpm ci:local` green — run it, paste the summary, ⛔ never claim it.

## Dev Notes

### ⚠ TRAPS (each has bitten an earlier story)

1. **Showing an answer to the family or the public is a Panel question** (Invariant 7) — ⛔ never add a neighbour's name or answer to the claim
   status page, the Sahyog Vivran shell, `verifierName`, or any member-facing contract. FR-39's *"published with profile links"* stays unbuilt.
2. **The text says only the routed words.** ⛔ Never add the claim, the family, the amount, *"within 72 hours"* or any deadline word — S4 / T6
   applies in full, and a wording change is a re-registration AND a Panel matter (Q1).
3. **⛔ No conjunct in the gate.** A neighbour kind is a WARNING (FQ10 A); ⛔ never does `assertGroundInspectionCompleteForApproval` read it, ⛔
   a refusal is ever caused by it, ⛔ nothing is gated by the 72-hour label.
4. **⛔ Never edit the assertion or the approver writers** (NW1). Add the kind, its key, its producer — they pick it up by construction (F16).
   Re-judge any exclusion at EVERY coverage reader (the queue, the gate, R9 finalize, the console) — 6.26b's previous-story lesson.
5. **Rebase onto every sibling** (`-292` / `-282` Consequence 4): the gate order (F18), RF5's required `step`, RF15 (⛔ no lock on another
   claim after the gate), the NW1 transitive import scan (RF1 in its entry list), `FENCED_FILES`, the console read ceiling, 6.25's
   `standingSuspicionRefusalSql` (⛔ never change refusal semantics).
6. **Both warning readers or neither** — the bulk reader is a SEPARATE statement (`readClaimApprovalWarningsSlice`); a column added to one
   only breaks parity silently. The parity test is the guard.
7. **⛔ Never inherit a neighbour key** (`-261` C3). 6.26b's `inheritedGroundInspectionSourceSql` pattern is for the INSPECTION ONLY.
8. **⛔ Never touch the selection.** ⛔ No moderation predicate in `peer-mesh-read.ts` (`member/moderation/index.ts:22`), ⛔ no metric change, ⛔
   "simplified" correlated subquery (`peer-mesh-read.ts:60-87`). PM1's exclusions live in the SEND path.
9. **⛔ No KMS under a lock; ⛔ no number in a log.** Claim the row, COMMIT, then decrypt (6.24b's child); the number hash only on the row.
10. **The erased sentinel is a "mobile".** `decryptMobile` of an erased identity returns `'[anonymized]'` — ALWAYS `normalizeMobile` and
    treat `null` as `no_target` (F25); ⛔ never use `resolveSmsTarget`.
11. **A RAW gateway code in `detail` breaks the CHECK after a successful send** ⇒ a pg-boss retry ⇒ a duplicate text (6.29 F13 / Trap 4).
    Sanitise through the ONE builder before the finalise.
12. **`clock_timestamp()` for `recorded_at`**, ⛔ never `now()` — one transaction makes every `now()` equal and the queue's `>` ordering ties
    ([[project_db_clock_ordering_tests_tie]]; 6.26b RD1 / K3).
13. **An answer racing an approval is benign** (PM8) — ⛔ never "fix" it with a lock on the claim from the member route; prove it with the ordering
    test instead.
14. **Markdown emphasis closes a JSDoc** — `**PM8**/` contains `**/`; grep `\*\*/` after every doc-block edit
    ([[project_markdown_emphasis_closes_jsdoc]]).
15. **Contracts tests are outside tsc** — a new required field on `PeerMeshTranscript` breaks contracts / admin fixtures silently; run
    vitest ([[project_contracts_tests_outside_tsc]]).
16. **Prettier is ⛔ not enforced** — hand-format; ⛔ never `prettier --write` ([[project_prettier_not_enforced]]).
17. **Leave room for row 6-31's reminder — ⛔ never build it here.** 6-31 reads each ping's send record, the reply table and PM5 (iv)'s
    "before the District Admin decides" re-check; keep them readable by a second sender (⛔ never hard-wire the SMS as the only send on a
    ping, ⛔ never give the text's finished-row trigger a rule that would refuse a SEPARATE reminder record). The reminder needs its own record
    and send path: the WA template registry is keyed by `AlertCategory` (`schema/pariwar_wa_templates.ts`), and `dispatch()`'s
    WA-undelivered SMS fallback would send a SECOND text.

### Reuse map (⛔ never reinvent)
| Need | Reuse |
|---|---|
| send a text | `sendClaimDltSms` (`apps/jobs/src/scheduler/claim-dlt-sms-send.ts:70`) |
| template registry / lockstep | `suspicion-notice-sms-templates.ts` + `apps/jobs/tests/suspicion-notice-sms-templates.test.ts` |
| record / hold / park / give-up shape | `packages/domain/src/claim/suspicion-notice.ts`, 0151 + 0155, `apps/jobs/src/scheduler/claim-suspicion-notices.ts` |
| member's name in a text | `notifications.resolveMemberFacingDeceasedName` (`notifications/pool-identity.ts:141`) |
| member's mobile | `waOptIn.getMemberMobileCiphertext` → `decryptMobile` → `normalizeMobile`; hash `claim.correctionNumberHash` |
| date index | `deathDateBlindIndex` (`apps/api/src/modules/claims/ground-inspection-crypto.ts:63-65`), `DEATH_DATE_INDEX_FIELD_CLASS` |
| Tier-1 date column | 0147's `death_date_ciphertext` / `death_date_index` on `claim_ground_inspections` |
| warning kind threading | 6.26b's commit `bdb01014` (63 files — `git show --stat bdb01014`) |
| member answer route | Polls (`surveys/member-routes.ts`), helpdesk member handlers (`openScopeTx`, 404-⛔-403, `withCompensatingAudit`) |
| helpline write | `claims.helpline.routes.ts` chain |
| queue late arm | `correction-queue-read.ts:155-187` (6.26b's hoisted fragment) |
| injected post-commit enqueue | 6.12's `enqueueShepherdAssign` in `claim-peer-mesh.ts:346-356` + `boot.ts:512-523` |

### Testing standards
- Unit (vitest): the window arithmetic (month / year / leap boundaries, ±1 vs ±2), the response mapping, the detail builder vs the CHECK's
  regex (every literal), the pure warning helper's table, the kind pin, the contracts lockstep.
- Integration (live DB, :5433): migrations from zero; RLS policy regressions; the writer in every state; the child's begin race (two
  connections); the queue legs in separate committed transactions; bulk-vs-single parity; every approver refused; erasure.
- Jobs live: hold → park → resume; give-up credited only parked time; quiet hours; once-ever under a re-run; a re-claimed row's alarms.
- API: member routes (404 cross-Pariwar / not selected / not open; idempotent replay; Turnstile); helpline routes (step-up); console shape
  + ceiling `toBe`.
- Admin / mobile: `kindLine` render, the peer section's states incl. *"could not be shown just now"*, the screens with a REAL `t()` leg.
- Assert MEMBERSHIP, ⛔ never counts, on shared tables ([[project_live_db_test_gotchas]]); suite-level `{timeout:20000}` on live specs
  ([[project_known_livedb_test_failures]]). `pnpm ci:local` before review.

### Project structure notes
- New files: `packages/domain/migrations/0156_*.sql`, `0157_*.sql`; `packages/domain/src/schema/claim_peer_mesh_replies.ts`;
  `packages/domain/src/claim/peer-mesh-request.ts`; `apps/jobs/src/scheduler/peer-mesh-sms-templates.ts`,
  `claim-peer-mesh-requests.ts`; `packages/contracts/src/claims/peer-request.ts`; member + helpline route modules under
  `apps/api/src/modules/claims/`; `apps/mobile/app/(peer-request)/`; tests beside each.
- ⚠ Migration numbers: re-check `ls packages/domain/migrations | tail` at Task 1 — another branch may have taken 0156.
- ⚠ Do ⛔ not extract a shared "DLT notice" package for two consumers' worth of shape ([[feedback_no_premature_package]]) — clone the shape.

### Previous story intelligence
- **6.29** (the latest): the 0151 parity bar — hold / park / give-up, the `detail` grammar CHECK, the finished-row trigger, the lease
  re-check — is the floor for ANY new once-ever SMS record; a 0155-style CHECK applied to raw gateway codes would have caused duplicate
  texts (its Trap 4). Its code review ran three layers in parallel, read-only — [[feedback_review_layers_one_at_a_time]].
- **6.26b**: adding a kind = touching ~60 files; derive ONLY in the shared helper; one hoisted queue fragment; fixture defaults must raise
  ⛔ no warning; `null` is ⛔ never `false`; the key's stability is a ruling-sized choice; re-judge exclusions at every reader.
- **6.24b**: the send core moved ONCE; the name carve-out recorded, ⛔ never assumed; the Hindi `$comment` marker tied to a roster row.
- **6.6**: the SELECT worker is "frozen" — extend through injected deps only.

### Git intelligence (last 5 commits, `main`)
`5946e411` 6.29 code review · `19839bc6` 6.29 Task 6 docs · `36eb7b46` 6.29 build (0155) · `f3649aed` 6.29 governance records ·
`5ecc7eb9` `-302` author-commit — the house order: decision entry → records → build → review. REBASE-merge, ⛔ never squash
([[project_story_automator_ops]]); commit on `story/6-27-peer-mesh-sending-replies-and-date-of-death` ([[feedback_commit_on_story_branch]]).

### Latest tech information
⛔ No new library or version. Expo-router / TanStack Query / Fastify + `fastify-type-provider-zod` / pg-boss / Drizzle as already pinned in
the repo — read the neighbouring code, ⛔ never upgrade anything.

### ⚠ A split is likely worth it (BigDev's call, ⛔ not made here)
The 6.21b / 6.23b / 6.24b / 6.26b precedent: **6.27a** = Tasks 1–8 (send, answer in the app and by the helpline, record, show) and
**6.27b** = Tasks 9–10 (the two kinds, the wait, the queue). 6.27a can ship on Q1 alone; 6.27b needs Q2. Until 6.27b lands, a neighbour's
*"has not died"* is SHOWN but asks nothing of an approver — a go-live coupling, ⛔ never a merge fence.
⭐ Row `6-30` (the app-link plumbing) is a SEPARATE story (BigDev, 2026-10-10). ⛔ No 6.27 task waits for it: the link's code, path,
route and resolver are built and tested here against a config base URL; only the first REAL text (go-live, Row 27 (e)) needs 6-30 `done`.

### References
- `.decision-log.md`: `2026-09-28-261` C3 · `-262` FQ8 E · `-263` FQ9 / FQ10 / FINDING / Consequences 2–4 · `-264` FQ12 · `-255` F7 ·
  `-253` M · `-277` Q2 C / Q3 B · `-278` NW1 / NW7 / NW12 / EA2 / EA10 · `-279` A1–A6 · `-281` Q1 B · `-282` GI5 / GI6 / GI7 / GI13 ·
  `-288` K3 · `-289` L4 / L5 · `-292` RF1 / RF5 / RF15 / Consequence 4 · `-295` RB1–RB18 · `-296` · `-297` §2 · `-298` · `-302` RN2–RN9.
- PRD `prd-TWT-2026-05-22/prd.md` FR-39, FR-40 (+ its 2026-09-28 annotation); architecture §3.4 (+ its 6.19a annotation).
- `epics.md` Story 6.6 (+ annotation), 6.7, 6.10; story files 6-6, 6-10, 6-23, 6-23b, 6-24b, 6-26b, 6-29.
- `deferred-work.md` items: 6.10's verifier-annotation item; the zero-candidate item; GI13's erasure item.
- `docs/launch-gate-inventory/inventory-roster.md` (Rows 18–26), `dlt-template-requests-6-19.md`.
- Routing note `trustee-panel-routing-note-2026-10-10-6-27-asking-the-neighbours.md`; template `trustee-panel-routing-note-TEMPLATE.md`.

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List
- 2026-10-10 — created by `bmad-create-story 6.27` (Opus 5.5): ultimate context engine analysis completed — comprehensive developer guide
  created. Four read-only research passes at `5946e411`; the Panel note written from the template (Q1, Q2) with its E4 commands run;
  PM1–PM22 PROPOSED. ⛔ No code; ⛔ no decision entry yet (Task 0).

### File List

## Change Log
| Date | Version | Change |
|---|---|---|
| 2026-10-10 | 1.0 | Created (`bmad-create-story 6.27`); pinned `5946e411`; routing note Q1 / Q2 written; PM1–PM20 proposed. |
| 2026-10-10 | 1.4 | ⭐ The Panel RULED (`2026-10-10-303`): Q1 A (with the WhatsApp reminder) + a language rider (Hindi / English by preferred language), Q2 A. STATUS (i) done; rulings table, the Panel-questions heading and P1 updated; PM3 sends both locales; PM7 asks exactly TWO questions (`answer` = `died` / `not_died` / `not_sure` / `did_not_know`; the words in the routing note's ruling block, as relayed to the Panel); NEW PM22 (the preferred language — our reading); `-279` A6 discharged for this row. |
| 2026-10-10 | 1.3 | Aligned with Story 6.30 (created the same day): the link is `<origin>/peer-request?c=<code>` (a query string — operators refuse dynamic paths), built by 6.30's contracts `app-links` builder; the base is the env var `APP_LINKS_BASE_URL` (⛔ not Secret Manager — the dotted-id defect); ONE route file `app/(peer-request)/peer-request.tsx` (the old group-only files would collide); typed DLT variables (`{#alphanumeric#}` / `{#url#}` / `{#cbn#}`); Row 27 (e) → 6.30's roster row. ⛔ No PM added; PM3, PM11, PM21 amended (⛔ not yet committed — ⛔ no decision superseded). |
| 2026-10-10 | 1.2 | BigDev: a WhatsApp reminder at 48 hours to opted-in members who have ⛔ not answered — *"48 hours, separate story 6-31"*. FIVE FACTS #1 note + Trap 17 (leave room, ⛔ not built here); the routing note's Q1 option A gains the reminder BEFORE sending (disclosed there). ⛔ No PM, AC or task of 6.27 changes. |
| 2026-10-10 | 1.1 | BigDev: the text should open the questions directly — *"separate story"*. PM21 added (the link's code, path, route, resolver, config hold, go-live condition); PM3's text gains `{link}`; FIVE FACTS #1, AC2, AC5, Tasks 1 / 2.1 / 5 / 6 and the split note updated; the plumbing = new row `6-30-app-links-open-the-app-from-a-text` (domain expected week of 2026-10-12, ONE config value). The routing note's quoted texts updated BEFORE sending (disclosed there). |
