---
baseline_commit: f079dc56
---

<!--
SPLIT FROM Story 6.19 v0.9 on 2026-09-27 (BigDev: "split it three ways") — D13. The set: 6.19a (`done`) → 6.19b (`done`) → 6.19c (this
file); 6.19d (CC1) `backlog`. AC numbers KEPT from 6.19 v0.9 (decisions and notes cite them); AC8/AC9/AC11 restated per slice; AC18 NEW.
⭐ THE SHARED SPEC IS PART OF THIS STORY: `6-19-correction-return-reminders-and-closure.md` — rulings, invariants 1–11, traps T1–T14, author
decisions D1–D34. ⚠ Its *What already EXISTS* is pinned to `c136b03c` (before 6.19a and 6.19b shipped): for everything this slice touches,
**§ What 6.19b shipped** below is the current record and wins where they differ.
BASELINE `f079dc56` (`main`, 6.19b `done` + `-272`). Two separate facts: ⭐ the pin is an ancestor of `main` (durable); ⚠ the code claims in
this file were re-derived at `f079dc56` on 2026-10-01 by four read-only passes (perishable). Before Task 1 run
`git diff --name-only f079dc56..HEAD -- packages apps scripts` and re-read anything it lists that this file cites.
GLYPH REGISTER: `⛔` sits ONLY on a negation word (not / no / never / nothing / neither); `⭐` key fact or action; `⚠` hazard.
ADDRESSING RULE: ⛔ no `file:NNN` into `.decision-log.md`, `deferred-work.md` or `sprint-status.yaml` — cite decision ids + clauses, item
headings and row keys. `file:NNN` is used ONLY for code, as of `f079dc56`; the function names are the stable handle.
LETTERS: bare `D1`…`D34` are 6.19's own (the shared spec). Other letters are qualified: `-260` G1, `-255` F3, `6.16 D-F`, `6.19b K2`.
-->

# Story 6.19c: The Closure for No Response, the Super Admin's Review and Decision, and Filing Again Through a Person `[SURFACE]`

Status: ready-for-dev

> ⭐ **6.19b is `done`** (its build `40304d9f`, five review passes to `f301f09e`) — the fence this slice waited on is discharged.
> ⭐ **Two author-commits bind this slice before any code:** **`-272`** (a switch back to "the family must act" restarts the CLOCK, ⛔ not the
> letter track — Task 0a) and **`-273`** (this story's validate pass: "reached" reads the whole return; the letter cap never resets on a new
> number; an escalated claim is held and only the Super Admin decides it; a staff case is ⛔ never closable; a stale request lapses; the closure notice's outbox;
> reminders after day 90; the member status; the mismatch highlight; the `-251` gate; the Super Admin's reason). ✅ **`-273` is in `.decision-log.md`** (BigDev inserted it
> 2026-10-01; verified additive-only). ⚠ `-273` owes **two confirms** to the Panel's next note (a staff case directed back to the family; a
> family reached only by post is ⛔ not told of the closure) — ⛔ neither blocks the build.
> ⭐ **With this slice done, 6.18's go-live fence ("not without 6.19") is discharged BY THE BUILD** (`-265` Consequence 4) — annotated at the
> sites Task 7 lists, ⛔ never on the record alone.
> ⚠ **Go-live gates this slice inherits (⛔ none is a build blocker — [[project_not_in_production_merge_is_not_golive]]):** counsel's **M** and
> **S** (`inventory-roster.md` rows 18, 19) gate the closure notice like every family SMS; the DLT templates 3–4 (the closure notice, hi + en)
> are ⛔ not submitted (`-265` §4); the agent-authored Hindi of this slice's new member copy joins **Row 20**'s human review (`-267` §6).

## Read first

- **Rulings:** ⭐ `-258`, `-260` G1–G3, `-251`, `-254`, `-255` F2–F4, `-256`, `-252` cl.1, `-229`, `-230` cl.3/cl.5, `-231` A/B/D, `-232` H/I,
  `-250` #1/#6; and `-226` cl.1/cl.5/cl.6, `-227` cl.2 (what `-251` and `-258` narrow). ⭐ **`-263` Consequence 4** (FQ9 and this slice's
  gate split — see *Sequencing*), `-262` FQ5 / `-261` D4 B (row `6-24`, the same convergence code).
- **Author-commits:** `-265` (D1–D29, the keys), `-266` (D30–D34), `-267`, `-268`, `-269`, `-270`, `-271`, ⭐ **`-272`**, ⭐ **`-273`**.
- **Shared-spec invariants:** 1, 2, 5, 6, 7, 8, 10, 11 — every one binds this slice.
- **Shared-spec traps:** T2, T3, T4, T9, T10, T11. **Decisions:** D1, D8, D14, D17, D18, D19, D22, D23, D26, D27, D29 (in its `-260` G1 form).
- ⭐ **"The full gate"** = `assertClaimApprovable` **and** 6.19a's `assertClaimContactRecorded`, run after it (`-265` §1). The closure writers
  and the three NEW approval writers (the `-251` approve, D27's approve, `-260` G1's approve) each call D14's check.

## Story

As the **District Admin**, the **Pariwar Admin** and — when they disagree, or when staff never put a staff case right — the **Super Admin**,
we want a claim whose family has not answered a correction request for 90 days, **though each person was reached**, to end only by **our**
decisions: the District Admin asks, the Pariwar Admin approves or declines with a note, and a declined closure (or a staff case still open at
day 90) goes to the Super Admin, who may **hold it under review, direct us**, and then decide — so that a claim **never waits forever**, is
**never closed by a timer**, is **never closed for a silence that was not the family's**, and a family whose claim was closed can **file again
through a person**.

## 📜 Policy meaning (AI-10-1)

⭐ This slice introduces **eight predicates that gate a member's claim** (the family's benefit):
1. a sent-back claim may be closed for no response only after **90 calendar days** of the family's run, only if **each person was reached**
   (across the whole return), and only through a **human request and a human approval**;
2. ⭐ only when the return says **the family must act**, and ⛔ never once the family has sent corrected bank details (`-258`, `-268`);
3. a claim **closed for no response cannot be appealed**;
4. a **Super Admin refusal can be appealed once** (unless the appeal was already used);
5. on a claim escalated after a **declined closure**, the Super Admin may approve payment **even though the account is ⛔ not in the
   nominee's name** — every other condition of approval still applies;
6. ⭐ on a **staff case** still unresolved at day 90, the Super Admin may approve **only with a current passing name check**, or refuse
   (`-260` G1) — ⛔ never close; and a return found to need **no correction** can be approved once the District Admin records it (with a
   fresh name check) and the Pariwar Admin agrees (`-258` cl.3);
7. a death whose claim was closed for no response can be **filed again only with a District Admin's or the helpline's confirmation**;
8. ⭐ while a claim is with the Super Admin, the Pariwar Admin **cannot approve or refuse it** — even once the family has corrected the
   details — and the Super Admin decides (`-251`; `-256` cl.1 while under review; ⚠ ours — `-273` §4 — for a staff case ⛔ not under review).

**In the family's terms (ours, for the Panel to correct):** *"If the bank details you gave need correcting, and after 90 days we have still
not heard from you — though we reached each of you by text or by post — the District Admin may ask for your claim to be closed and the
Pariwar Admin decides; if the Pariwar Admin disagrees, the Super Admin looks into it and decides, and may pay to the account you gave even
though the name does not match. If you have already sent corrected details, or if the mistake was ours to put right, your claim is never
closed for no response. A claim closed for no response cannot be appealed, but you can file again through the helpline or the District
Admin. A refusal by the Super Admin for any other reason can be appealed once. While the Super Admin is looking into your claim, the Super
Admin decides it."*

**Checked against the Niyamavali? ⛔ NO** — absent from the public repo by design and ⛔ not ratified
([[feedback_niyamavali_rulebook_not_spec]]). Checked clause by clause against `-229` → `-232`, `-250` → `-256`, `-258`, `-260` and the
author-commits `-268`, `-272`, `-273`. ⚠ It **tensions with the PRD** (FR-43A: internal appeal is the primary grievance path, only Stage 3
non-appealable) and 6.16 D-G's counsel review — **S**, a go-live gate.

## Acceptance Criteria

### AC6 — The closure: the system asks, humans decide (`-231` A/B, `-232` H/I, `-252`, `-250` #6, `-268` §3, `-273` §1/§5/§6)
**Given** a live return whose latest mark is `family` and day ≥ 90 of its **latest `family`/`direction` run, open or ended** (6.19b's
`resolveCorrectionChase(…).familyRun`; `isCorrectionRunExpired`) **Then** the District Admin is reminded **daily for 7 days** (run days
90–96), then the claim is **escalated to the Pariwar Admin** (a record + a reminder, `-232` I) — new reminder purposes keyed on the live
return's latest run (`-273` §6; the cadence counts from the family run's day 90, ⛔ never from `slot_day`); the job scans **ended** `day_90`
runs (6.19b's sweep reads only open ones) and reminds **only while a request could pass** `closure.escalated`, `closure.request_pending` and
`closure.claim_corrected`; the day-97 escalation is a record, ⛔ never a hold; ⛔ **no job ever calls a decision writer** (invariant 1)
**And** the District Admin **requests** the closure (key (2)); the request is refused, **first that applies, in this order**:
**409 `closure.no_live_return`** (a certificate wait alone ⛔ never qualifies — invariant 10; 6.19d relies on this code) ·
**`closure.escalated`** (the claim is already with the Super Admin) · **`closure.request_pending`** · **`closure.not_family_action`** (AC17) ·
**`closure.too_early`** · **`closure.claim_routed_to_r9`** (defensive) · **`closure.claim_corrected`** — `isReturnedClaimResubmitted` **or**
`readFamilyPartDoneAt(…) !== null` (invariant 2 as `-268` §3 / `-269` §1 widen it) · **`closure.not_reached`** (D22 read across the whole
return — `-273` §1; the body names ⛔ no person, a count and the roles only) · **`closure.claim_contact_required`** (D14)
**And** a pending request **lapses** (`-273` §3d — derived under the lock, ⛔ never written by the mark writer) when, after it, a mark ⛔ not
`family` is recorded, or `familyRun.runId` is no longer its `request_family_run_id`, or its return stops being live; the Pariwar Admin's
approve **and decline** refuse a lapsed request — **409 `closure.request_lapsed`** — and the decline also re-checks `not_family_action`;
`closure.request_pending` reads only the **live return's** un-lapsed request; the District Admin may ask again at day 90 of a later family run
**And** the Pariwar Admin (key (3)) **approves** — re-checking under the trustee lock **every** request refusal from `not_family_action` on
(⭐ incl. `too_early` against the **current** `familyRun` — a mark switched to `staff` and back after the request opened a new run whose
`day0` is today — and `not_reached`, which a 6.20 number change can turn false) — running the D1 chain in **one** scope-tx, **or declines
with a REQUIRED note**, which writes the escalation (AC14)
**And** the closure is the **second refusal**: terminal, ⛔ not appealable, `claim.denied_no_appeal` emitted (trigger
`correction_closure_approved`, T4); the run is ended `decided` through `endCorrectionRun` **only if still open** (it is a no-op on a run
already ended `day_90`); the **closure notice** is recorded as due on the closure row (an outbox — `-273` §5) and sent by a jobs sweep, once per closure per
recipient; the member sees `closed_no_response` (AC8c,
`-273` §9), ⛔ never `appeal_exhausted`
**And** `voteOnFrozenClaim` refuses exactly as today.

### AC7 — Appealability, at every site (`-231` A, `-255` F2, 6.16 D-F, T3)
**Then** `assertAppealInitiable` (and so the operator's on-behalf initiate, `postOperatorInitiate`) refuses a claim with a `closed` closure
row with its own 409 code (⛔ not `appeal.not_denied`); the member handler's `can_initiate` is `false` for it; the appeal contract
(`MemberAppealStatusResponse`) gains `closed_no_response`, and `deriveAppealView` shows ⛔ no appeal affordance and ⛔ no external-remedy
disclosure for it (a display function — it refuses nothing)
**And** ordinary refusals keep their one appeal — a test proves an ordinary `denied` claim is still appealable **through the operator's
on-behalf initiate** (the production path)
**And** a Super Admin refusal is appealable once and final after a used appeal (D17)
**And** ⚠ two shipped gaps are **recorded in `deferred-work.md`, ⛔ not fixed**: the member appeal routes 404 for every production claim
(`claimantActorId` null), and `AppealStatusCard` is mounted on ⛔ no screen (the card's leg is correct but unreachable — `-273` §9).

### AC10 — Nothing else moves
**Then** ⛔ no new lifecycle state, ⛔ no new claim event type, ⛔ no new `AlertCategory`, ⛔ no `SMS_DLT_TEMPLATE_REGISTRY` entry;
`voteOnFrozenClaim` and `assertClaimApprovable` behave **byte-identically** for P1/P3/P4 (the `-251` composition, `-273` §8, adds a caller —
⛔ never a behaviour change for an existing one); 6.16's one-journey rule is unchanged; `-226` cl.1/cl.6 and `-227` cl.2 are unchanged
**everywhere except** the `-251` Super Admin approve (invariant 7) **and** D27's "no correction needed" approve (`-258` narrows cl.2);
⛔ nothing is automatic.

### AC14 — The Super Admin's review and decision (`-232` H, `-251`, `-255` F2–F4, `-256`, `-273` §3/§4/§7/§8/§10)
**Given** an **escalated** claim — a closure the Pariwar Admin declined, or a staff case at day 90 (AC17) — **Then** it appears on the Super
Admin's queue with its origin, both admins' notes (a declined closure) or the mark history (a staff case), the reminder and letter record,
and the name-differs highlight
**And** while escalated the claim is **held** (T11, `-269` §3, `-271` §2, `-273` §3b): 6.19b's hold hook answers "held" while a closures row
for the **live return** (same `return_decision_id`) is escalated or under review — for **either** origin; the hold ends when that row's
decision is recorded or the return stops being live; a row for an earlier return ⛔ never holds a later one; a mark switch opens ⛔ no run;
⭐ `hold` becomes a **required** input of `writeCorrectionMark` and is threaded at **every** caller (the return, the District Admin's change,
`-260` G2's keep, D27's record)
**And** ⭐ while held, **only the Super Admin decides** (`-273` §4; `-251`, `-256` cl.1): **every** Pariwar Admin decision is refused —
**409 `cycle_freeze.escalated`** — the ordinary vote and a new return at the cycle-freeze route, **and D27's approve** at its own route
(`voteOnFrozenClaim` itself ⛔ not changed); ⭐ records stay allowed (mark writes — they open ⛔ no run — `-260` G2's keep, letters, name
checks, a bank rewrite for the family, "no correction needed", direction responses), and a `-256` cl.3 direction may ask for any of them,
⛔ never a decision
**And** the Super Admin (key (5)) may place it **under review** with a note, and record **directions** (D18) to the named Pariwar Admin or
District Admin, who is reminded (day 7, then weekly) and **records a response** (identity-checked: the actor is the named directee **and**
holds `claim.view_nominee_name_check`); a `restart_family_reminders` direction opens a `direction` run through `openCorrectionRun`, whose
`CorrectionDirectionRunRefusedError` (mark ⛔ not `family`) surfaces as **409 `direction.mark_not_family`**; the Super Admin is reminded every
**30 days from the escalation date** while the claim is escalated, under review or not (`-273` §6 — ⚠ ours, wider than `-256` cl.2's *"while
under review"*; a staff reminder only); the directee's cadence counts from the direction's date; ⛔ no deadline
**And** the Super Admin (key (4)) decides — **close**, **refuse for another reason**, or **approve despite the name** — each with a
**required note** and a **required reason from the new closure-scoped set** (`-273` §10; a refusal also writes the `STATE_TRUSTEE_REASON_CODES`
value the actor chooses — `other` without a note is refused); each under the trustee lock; each supersedes the live return with the
conditional `UPDATE` (0 rows ⇒ 409) and ends any open run `decided`:
- **close** — a **declined-closure** origin only (a staff origin → **409 `closure.staff_case_origin`**, checked **first**, keyed on the row's
  origin, ⛔ never on the mark — `-273` §3c); then every AC6 request refusal from `not_family_action` on, as the Pariwar Admin's approval;
- **approve despite the name** — a declined-closure origin, by origin, whatever the mark now says (⚠ ours, `-273` §8 — in Confirm 1); still
  available when the family's part is done but the claim is ⛔ not resubmitted (`never_checked` waived — `-255` F4); on a staff origin,
  AC17's approve;
- ⭐ a claim the family has since **corrected** (resubmitted) is still decided **here** (`-273` §4 supersedes D17's *"returns to the ordinary
  vote"*): approve through the **full** gate (the full-gate writer — nothing to waive, its mismatch highlight empty) or refuse; only
  **close** → 409 `closure.claim_corrected`
**And** the `-251` approve runs **the full gate minus the name check, by construction** (`-273` §8, T10) — `never_checked`, `stale` and
`does_not_match` all waived; the certificate, the two accounts, the effective determination and D14's check still refuse
**And** the highlight **"approved without a current passing name check"** — worded *"approved despite a name mismatch"* when the recorded
verdict is `does_not_match` — shows on such a claim to all three roles, derived from the approval record and the check's **recorded** state
(`never_checked` / `stale` / `does_not_match`), ⛔ never a name comparison (`-273` §7)
**And** ⛔ nothing is paid, closed or refused by anyone else while escalated; a hold or a direction on a claim that is ⛔ not escalated →
**409 `closure.not_escalated`**; a claim leaves the queue only when its row's decision is recorded or its return stops being live.

### AC15 — Re-filing after a closure for silence (`-254`, D19, T9, `-273` §9)
**Given** a death whose most recent terminal claim has a `closed` closure row **Then** a new claim for it is minted only after a District Admin
or helpline operator (key (6)) records a **confirmation with a required note** — at **both** mint paths, `tryConverge` **and**
`overrideIntakeAttempt`, under their `acquireIntakeLock`; the mint consumes the confirmation in the same tx; otherwise **409
`claim.refile_requires_confirmation`**, mapped (⛔ never a 500) in the member, helpline and override handlers
**And** an ordinary `denied` or a stage-3-upheld claim re-files exactly as today (⚠ until row `6-24` lands — `-261` D4 B keeps a suspicion
refusal's new claim apart; that is `6-24`'s to build, ⛔ not this slice's)
**And** the member app's claim-entry gate routes such a family to the calm *"please call the helpline"* state (en + hi) **while `refile_requires_confirmation`
is true** (a server-computed routing bit = D19's guard, ⛔ never shown — `-273` §9; it narrows `-249` §2's *"a terminal claim falls through to the wizard, UNCHANGED"*; once a
confirmation is recorded the wizard is open again), ⛔ never the wizard (which would only 409) and ⛔ never a bare error; ⭐ the wizard's submit
also maps `claim.refile_requires_confirmation` to the same state (a phone without the filed-claim pointer — a helpline-filed claim, another
device — reaches the wizard).

### AC17 — Only the family's silence can close a claim; "no correction needed"; the staff case at day 90 (`-258`, `-260` G1/G2, `-273` §3)
**Then** a closure request, the Pariwar Admin's approval and a Super Admin close each refuse unless the return's **latest mark is `family`**
— **409 `closure.not_family_action`** — (and a Super Admin close on a **staff-origin** escalation is refused whatever the mark says — **409
`closure.staff_case_origin`**, `-273` §3c) — and the 90 days count from the **family run's** `day0` (the return, or the latest switch to
`family`), read through `resolveCorrectionChase` (⛔ never re-derived)
**And** the District Admin may record **"no correction needed"** (key (8)) with a **required note** (a record — allowed while held); it takes effect only with a **current,
passing name check recorded after it**; it sets the mark to `staff` through `writeCorrectionMark` (with `hold`); the Pariwar Admin then
**approves** through a **NEW writer** (D27 — the **full** gate, ⛔ nothing waived; the conditional supersede of the return; the ordinary
approval events; ⛔ never `voteOnFrozenClaim`; refused while held — `cycle_freeze.escalated`, `-273` §4) **or keeps it sent back**, stating who must act with a note (`-260` G2 — a switch to `family`
opens a new family run, `day0` = that day, unless the claim is held)
**And** a **staff case still unresolved at day 90** of its staff run is **escalated to the Super Admin** by the day-90 job — a closures-table
row of origin "staff case" (⛔ no request, ⛔ no Pariwar Admin decision), a record + a reminder, ⛔ never a decision — and is **held** from that
row on (`-273` §3); the Super Admin may hold it under review and direct (AC14's machinery), incl. directing a switch to `family` and then a
restart; ⭐ **and DECIDE** (`-260` G1): **approve** through the **full** gate (an accepted certificate, two accounts, the as-at-death nominee, a
**current passing name check**, D14 — ⛔ nothing waived) or **refuse for another reason** (appealable once; `denied_no_appeal` only after a
used appeal), each with a required note and reason; ⛔ **never close** — **409 `closure.staff_case_origin`**, keyed on the origin, so a
mark later directed back to `family` does ⛔ not make it closable (⚠ our reading of `-260` G1 — **Confirm 1** for the Panel's next note,
`-273`); a `direction` run on it reaches day 90 with ⛔ no closure reminder
**And** ⛔ no text goes to the family after a Super Admin refusal or approval (`-260` G3 — the app status and the helpline carry it)
**And** a staff case the Super Admin neither decides nor resolves waits — ⛔ no deadline; the 30-day reminder applies (`-260` *"does NOT cover"*).

### AC18 — The letter track is per RETURN (`-272`, `-273` §1/§2; NEW 2026-10-01)
**Then** across every `family`/`direction` run of the live return, for each person: (a) a delivered letter stops SMS to that person's
**current** number; (b) the found-dead fact carries across runs for the same number; (c) **at most two letters per person per return**, the
second only after the first's recorded delivery — ⭐ ⛔ never reset by a 6.20 number change, and a capped person is ⛔ not chased for another
letter; (d) the second-letter reminder is owed once per person per return; a **6.20 correction to a new number** resets (a) and (b) only; for
D21 a person at the cap counts as **delivered**; a **second return** starts everything afresh
**And** D22 "reached" reads the whole return (`-273` §1)
**And** cross-run reads order rows by **time** (`sent_on`, `created_at`), ⛔ never `slot_day` (it means a different day in each run); a
found-dead date carried from an earlier run clamps the letter-chase and day-13-escalation slots to today's run slot (the `6.19b K2` form) —
⛔ never a negative `slot_day` (`claim_correction_reminders_slot_day_check` would roll back the claim's whole sweep); ⚠ a carried found-dead
date may therefore escalate on **day 1** of a reopened run — stated, ⛔ not a defect.

### AC8c — The surfaces (this slice)
**Then** the correction queue gains the closure state and the **closure request** action, every refusal in plain words (*"too early"*, *"not
everyone reached yet"*, *"the family has sent corrected details"*, *"staff must act"*, *"already with the Super Admin"*); the **Pariwar
Admin's** closure decision strip (UX-DR54: primary action leftmost, numbered shortcuts, the decline note mandatory **before** submit,
UX-DR44 `<AuditTrailEntry>` shown immediately); the **Super Admin's** escalated-claim queue (both origins) and decision surface (both
admins' notes, the reminder and letter record, ⭐ the name-differs highlight incl. *"approved without a current passing name check"* /
*"approved despite a name mismatch"* — `-226` cl.5, `-273` §7), the hold and the directions; the **directed admin's** direction inbox with a response form; the helpline's **re-file
confirmation** card; ⭐ every new queue is **reachable from the admin nav** (the Pariwar Admin's and the directee's inside the Pariwar
context; the Super Admin's — a global role — from the top level; cf. `deferred-work.md` 6.18 chunk-3 *"LINKED INSIDE A PARIWAR CONTEXT"*)
**And** the member app: `closed_no_response` (on `MemberDeathCertificateStatusResponse`, `GET /api/v1/member/claims/:claimCaseId/death-certificate`,
read by the gate through `fetch-claim-entry-outcome.ts`) and the *"please call the helpline"* re-file state through the claim-entry gate and
the wizard's submit (`-273` §9),
**en + hi** (the Hindi marked *"not yet human-reviewed"* in its `$comment`, `-267` §6); staff copy **English-only**, in the admin modules'
`i18n-en.ts` (⛔ never an en-only key in `claim.json` — `i18n:check-parity` fails it)
**And** semantic accessibility (family 13): every reachable state (`too early`, `not reached`, `declined`, `under review`, `directed`,
`closed`, `re-file needs confirmation`) is **announced**; a labelled container is `accessible={true}` (mobile); every interactive role has a
real handler; WCAG AA.

### AC9c — PII and audit posture (this slice)
**Then** `AuthAuditEventType` entries for the closure request, the Pariwar Admin's decision, the escalation, the Super Admin's hold /
direction / decision, a direction response, "no correction needed" and a re-file confirmation — each with `resourceLocator:
'claim:<lower-case uuid>'` (else `RESOURCE_LOCATOR_PATTERN`, `apps/api/src/audit/audit-log-sink.ts:70`, silently replaces it); writes inside
`apps/api/src/modules/claims` and `packages/domain/src/claim` go through `withCompensatingAudit` (the access-wrapper gate refuses a bare
`writeAuditEntry`); the notes are Tier-1 ciphertext (the 6.19b mark-note precedent) and ⛔ never echoed to a member; a live-DB test finds a
planted note sentinel in ⛔ no log or error body (6.19b's test-only `logStream` in `apps/api/src/server.ts` is the capture)
**And** `deferred-work.md` records: the member appeal route's production 404 and the unmounted card (AC7); ⛔ no RTBF path reaches the new
tables' Tier-1 columns (invariant 9).

### AC11c — The proof (this slice)
**Then** live-DB specs on `twt-test-pg :5433`, **executed** (`integration-tests`; `test (unit)` runs `env -u DATABASE_URL` and skips them):
- **Migrations:** policy specs for the closures, directions and re-file-confirmations tables (RLS + FORCE, a `cross-pariwar-leak.spec.ts`
  probe each); the `purpose` CHECK ↔ `CORRECTION_REMINDER_PURPOSES` lockstep.
- **Two-connection races** (each → exactly one outcome, the loser a typed 409): two closure decisions; a return racing a closure; a declined
  closure racing an approval; a closure request racing a family correction; a Super Admin decision racing a family correction; D27's approve
  racing a family correction and a mark change.
- **The approval re-checks the request:** a request on day 95, the mark switched to `staff` and back, then the Pariwar Admin's approval →
  `closure.too_early` (the new run's day 0); a 6.20 number change between request and approval → `closure.not_reached`.
- **One tx:** the D1 chain and each D17 chain (a forced failure mid-chain leaves nothing).
- **Every AC6 409** in its order, incl. `claim_corrected` at request **and** approval **and** Super Admin close — ⭐ for **both** legs: a
  resubmitted claim, **and** a family that rewrote on day 10 and was never re-checked (`-268`); a reminder set whose every slot was
  `no_target` cannot support a request without a delivered letter; an accept to an **old** number does ⛔ not count (`-271` §1); a person
  reached only by a run-1 delivered letter **is** reached in run 3 (`-273` §1).
- **Jobs:** the day-90 reminder job **never** calls a writer (a spy); the District Admin's 7 days then the escalation; the staff case's day-90
  escalation row; the job stops once a request is pending, the claim is escalated or corrected; the Super Admin's 30-day reminder counts from
  the escalation date and does ⛔ not move when a `direction` run opens mid-review; the directee's reminders; the closure notice recorded in the
  approving tx, sent once per closure per recipient (⛔ never again on a later day), ⛔ never to a known-dead number (`-273` §5).
- **Appeals:** `denied_no_appeal` on a closure and on a final Super Admin refusal, ⛔ not on an appealable one; the three appeal sites + the
  on-behalf initiate refuse a closed claim with their own code; an ordinary `denied` claim is still appealable on behalf.
- **The `-251` approve:** refused without an accepted certificate / two accounts / an effective determination / D14's record, **permitted**
  with a `does_not_match` check **and** with ⛔ no check at all; `assertNomineeNameCheckForApproval`'s behaviour for P1/P3/P4
  byte-identical (the existing order matrices — *CI gates*); the highlight shows on a `does_not_match` **and** on a ⛔ no-check approval.
- **The hold:** a switch to `family` **and** a switch to `staff` during a hold open ⛔ no run and send the family ⛔ nothing (`-269` §3,
  `-271` §2), for **both** origins; a `restart_family_reminders` direction opens a run, and is refused unless the mark is `family`
  (`-267` §5a); each decision ends an **open** run `decided` (`-267` §3); a hold or direction on a non-escalated claim → 409; an escalation
  row for an **earlier** return holds ⛔ nothing on a later one; while held, the Pariwar Admin's vote and a new return → `cycle_freeze.escalated`;
  a resubmitted escalated claim is approved by the Super Admin through the full gate, and a close on it → `closure.claim_corrected`; ⭐ D27's
  approve on a held claim → `cycle_freeze.escalated` while the District Admin's "no correction needed" record is accepted; a request made in
  a family run then a switch to `staff` → the Pariwar Admin's approve **and decline** → `closure.request_lapsed` with ⛔ no escalation row,
  and a new request at day 90 of a later family run is accepted; a decline racing a vote on a resubmitted claim → exactly one wins; a
  `super_admin` vote on a held claim → `cycle_freeze.escalated`; two directions to one admin on one day → two reminder rows.
- **AC17:** every proof listed in AC17's first draft — a staff-marked return → `closure.not_family_action` at request, approval and Super
  Admin close; a switch to `family` on day 60 → refused until day 90 **of the new run**; "no correction needed" refused without a fresh passing
  check; a Super Admin approve on a staff case **refused** with a stale or failing check and **permitted** with a current passing one; ⭐ a
  staff case directed back to `family` and silent for 90 days → a Super Admin close → `closure.staff_case_origin`, and ⛔ no closure reminder.
- **AC18:** family → staff → family with a delivered run-1 letter (⛔ no SMS to that number, ⛔ no letter chase, a third letter refused, D22
  reached); a run-1 undelivered letter → `first_not_delivered` in run 3 and deliverable there; found dead in run 1 at day ≥ 13 → one
  escalation and ⛔ no 23514; a 6.20 number change between runs → (a)/(b) afresh, the cap ⛔ not reset.
- **Re-file:** **both** mint paths guarded; a mint consuming its confirmation; a stage-3-upheld claim's re-file still free; the entry gate
  routes on `refile_requires_confirmation` — the helpline state before a confirmation, the wizard after it, and ⭐ the wizard again once the
  confirmation is consumed and the new claim is live (the old pointer ⛔ never traps the family); the wizard's submit maps the 409 to the
  same state.
- **Keys:** keys (2), (3), (6), (8) **cross-Pariwar**; keys (4), (5) refused to `pariwar_admin` (403) — a cross-Pariwar test is
  meaningless for the global `super_admin`; every key's **non-human / system-actor** denial.
- **Gates:** every new route file classified in the human-actor gate with its methods; a `*-shape.spec.ts` per compound read model; the
  real-`t()` leg for the member copy; `{ timeout: 20000 }` at least on each new domain live spec (⚠ race specs need more — *Testing*).

## Tasks / Subtasks

- [ ] **Task 0 — Preflight** (all ACs) — ✅ `-273` is in `.decision-log.md` (BigDev inserted it 2026-10-01). Then `git diff --name-only f079dc56..HEAD -- packages apps scripts` and re-read
  every hit this file cites; confirm live: `PERMISSION_CATALOG_VERSION` 49 / 58 keys, migration tail 0130, `COVERAGE_FLOOR` 12.
- [ ] **Task 0a — `-272` + `-273` §1/§2: the letter track per RETURN** (AC18) — 6.19b code, reworked to per-return, current-number
  evaluation (`readReturnFamilyLetters`, `correction-reminder-record.ts:556`, is the model):
  - [ ] `readRunPersonStates` (`correction-reminder-record.ts:671`) / `evaluatePersonRunState` (`correction-chase.ts:715`) /
    `lastEvidentialAttempt` (`correction-reminder-record.ts:643`): join the `family_sms` rows and letters of every family/direction run of the
    live return, ⭐ **ordered by `sent_on`, `created_at`** — ⛔ never `slot_day`.
  - [ ] `beginCorrectionFamilySend`'s delivered-letter re-check (`correction-reminder-record.ts:389`); `assertCorrectionLetterAllowed`
    (`correction-letter.ts:158`, also the address reveal).
  - [ ] `recordCorrectionLetter` (`correction-letter.ts:239`): the count, `limit_reached`, `first_not_delivered`,
    `posted_before_first_delivery`, `sequence` — per person per return, epoch-blind (the cap ⛔ never resets, `-273` §2).
  - [ ] `readCorrectionChaseSummary` (`correction-chase-read.ts:253`): person `status` / `foundDeadOn` / `remindersAccepted`; the DTO's
    `in_current_run` (`packages/contracts/src/claims/correction-chase.ts:115`, `.strict()`) → *"counts toward this return's limit"*
    (rename or redefine — `-272` §3's *"unchanged"* is a naming slip: under per-return every live-return letter is in it); the admin's
    `currentRunLetters` (`CorrectionLetterForm.tsx:98`); the API copy *"…in this run"* (`claims.correction-chase.handlers.ts:126`).
  - [ ] The sweep (`apps/jobs/src/scheduler/claim-correction-reminders.ts`, `planRun`): `hasSecond`; the letter-chase, the +13 escalation and
    `letter_second_due` dedup read the return's staff rows and compare **dates**, ⛔ never slot days; ⭐ the `6.19b K2` clamp-to-today's-slot
    also covers the chase and the escalation; a capped person gets ⛔ no chase; the D30 `removed` / `tracked` reads; D21's replacement
    (`everyoneDelivered`) now reads the return — state it in the code comment.
  - [ ] ⛔ No migration (`-273` §2). ⚠ `claim_correction_letters_person_sequence_uq (run_id, person_key, sequence)` stays a per-run backstop —
    its spec `claim-correction-chase-policy-regression.spec.ts:405` keeps passing and now describes the backstop, ⛔ not the rule: re-word its title.
  - [ ] Update the tests that pin per-run semantics: `packages/domain/tests/integration/claim/correction-chase.spec.ts:1510` (K1 —
    *"sequence restarts per run"*); `apps/admin/tests/correction-chase-forms.test.tsx:633-680` (the `currentRunLetters` describe);
    `apps/jobs/tests/claim-correction-reminders-live.test.ts:1003-1058` and `apps/jobs/tests/claim-correction-control-paths.test.ts:413-530`
    (they mock the readers **by name**, `:22-61`); `packages/domain/tests/claim/correction-person-state.test.ts:158`, `:196` (the slot sort).
  - [ ] AC18's live tests. Mark `deferred-work.md` § *fifth-pass re-review* item *"⏳ `-272`"* **built**; dispose each of § *third pass*
    item *"Nine earlier-pass 6.19b review items"* that this rework touches (KMS before the conflict checks in `recordLetter`, the
    `RunPersonState.state` collision, the multi-day letter-chase gap test) — fixed or re-deferred by name.
- [ ] **Task 1 — Migrations from `0131`** (AC6, AC14, AC15, AC17) — never edit 0126–0130:
  - [ ] **closures** — one live row per **return** (`return_decision_id`, ⛔ never per claim — `-273` §3b): origin (declined closure / staff
    case), the request (+ actor, note, `request_family_run_id` FK to runs) and its derivable `lapsed` state (`-273` §3d), a partial UNIQUE
    `(return_decision_id) WHERE state <> 'lapsed'`, the Pariwar Admin's decision (+ note), the escalation,
    `under_review_since` + note, the Super Admin's decision + closure-scoped reason (⛔ no "no response" reason on a staff origin) + note
    (`-273` §10), the outbox `closure_notice_run_id` (FK, provenance) + `closure_notice_due_at` + `closure_notice_done_at` (`-273` §5); a `closed` state the
    appeal sites and the re-file guard read.
  - [ ] **directions** (D18) and **re-file confirmations** (D19).
  - [ ] **`purpose`**: extend `claim_correction_reminders_purpose_check` (0128) **and** `CORRECTION_REMINDER_PURPOSES`
    (`schema/claim_correction_chase.ts`, *"⚠ LOCKSTEP with 0128"*) and the policy spec's purpose leg; one value per reminder kind
    (`-273` §6 — ⛔ never `staff_reminder` / `escalation`) with its own partial unique index: per day including `purpose` and `subject_key`
    (a directee's rows carry `subject_key = 'direction:<direction_id>'`); the closure notice **once**, `UNIQUE (claim_case_id, recipient_key)
    WHERE purpose = 'closure_notice'`, an errored send retried on the same row, a D30 failure a final row (`-273` §5); update 0128's header
    comment on `subject_key` in the new migration's own comment (⛔ never edit 0128).
  - [ ] RLS files (`policies/index.ts`, `schema/index.ts`), ENABLE + FORCE, journal entries, policy specs + leak probes (⚠ ⛔ no global gate
    enforces any of it — the per-table specs are the only guard).
- [ ] **Task 2 — Keys** (D8; AC11c) — mint **(2)–(6) + (8)** in **ONE** bump, **49 → 50, 58 → 64** (`-265` §2, `permissions.ts:732`);
  `roles.ts` grants for (2), (3), (6), (8); ⛔ no const for the super-admin-only (4), (5) (the drive-target precedent, `roles.ts:284`); names
  match `PERMISSION_KEY_REGEX` (one dot); `permissions.test.ts:54`/`:56`, `roles.test.ts` holder `it`s. `set_by_role` via `matchingGrantRole`.
- [ ] **Task 3 — The closure** (AC6, AC7) — in a **NEW domain module** (⛔ never `state-trustee-decision-persist.ts`: `correction-chase.ts`
  imports it, so it must ⛔ never import back — `correction-chase.ts:37-38`):
  - [ ] the request route (every AC6 409 in order); the Pariwar Admin's decision (approve → D1 in one scope-tx; decline + note → escalation);
    the lock order **advisory lock, then the claim row lock** (as the vote, `state-trustee-decision-persist.ts:509-512`; export or re-query
    `lockClaim` / `hasLiveRoutedRow` — both private today).
  - [ ] the D1 writer: conditional supersede of the return; `state_trustee_frozen` (from `verifier_approved`/`reversed` only),
    `state_trustee_denied` (reason `other` + fixed rationale), `denied_no_appeal`; `endCorrectionRun(…,'decided')` if the run is still open.
  - [ ] the day-90 job (a new queue in `QUEUE_NAMES`, a worker in `boot.ts`): District Admin days 90–96, escalation on 97; the staff case's
    day-90 escalation row (AC17); scans ended `day_90` runs; calls ⛔ no writer.
  - [ ] the closure notice — an **outbox**: the approving tx records it as due on the closure row with the closed run's `run_id` (⛔ never an
    in-tx enqueue: every API enqueuer is post-commit, `apps/api/src/context.ts`; the 10.7 `pending`-row precedent); a jobs sweep sends it
    through `sendClaimCorrectionSms` (`claim-correction-reminders.ts:237`, `message: 'closure_notice'`, `{reference}` + `{helpline}` — `t()`
    throws on a missing param) and records each send under its own purpose with a **once-per-closure** partial UNIQUE (⛔ not per day); a
    reminder row's `attempting` needs `claimed_at` (0128) — write it at send, ⛔ not in the approving tx; recipients per `-273` §5.
  - [ ] the day-90 job's stop condition (AC6) and its cadence from the family run's day 90 (`-273` §6); every 6.19c reminder stops at the
    row's decision or when the return stops being live.
  - [ ] the request's lapse (`-273` §3d): **derived** in the closure module under the trustee lock at every read and act (⛔ never written
    by `writeCorrectionMark`, the hold hook or a return's superseder); materialise `lapsed` only on a `requested` row.
  - [ ] the appeal sites (AC7); `closed_no_response` on `MemberDeathCertificateStatusResponse` and on `MemberAppealStatusResponse` (`-273` §9).
- [ ] **Task 4 — The Super Admin** (AC14) — ⭐ **the `-251` gate composition FIRST, as its own commit with its neutrality proof** (T10,
  `-273` §8): the full gate minus the name check by construction (e.g. an option on `assertClaimApprovable` defaulting to today's behaviour) —
  ⛔ never a hand list of today's conjuncts; keep the fence's required strings in `nominee-name-check.ts` (*CI gates*). Then:
  - [ ] the hold hook filled from the closures table, keyed on the **live return's** row in an escalated / under-review state (`-273` §3b);
    `hold` made **required** on `writeCorrectionMark` (`correction-chase.ts:428`); threaded at `claims.cycle-freeze.handlers.ts:405`,
    `claims.correction-chase.handlers.ts:224` and this slice's two new callers; ⚠ the test callers pass `noCorrectionHold` explicitly —
    `apps/api/tests/integration/claims/correction-chase.spec.ts`, `apps/jobs/tests/_claim-correction-seed.ts`,
    `apps/jobs/tests/claim-correction-reminders-live.test.ts`, `packages/domain/tests/integration/claim/correction-chase{,-shape,-concurrency}.spec.ts`.
  - [ ] the cycle-freeze route's guard: while held, the vote and the return action → **409 `cycle_freeze.escalated`** (`-273` §4) — inside
    the route's scope-tx **after** `acquireCorrectionChaseLock`, for **every** actor (the route also accepts `super_admin`,
    `claims.cycle-freeze.handlers.ts:401`); the same guard on D27's approve route.
    `voteOnFrozenClaim` is ⛔ not changed.
  - [ ] D22's function: per person (`readCorrectionRecipients`), across the return (`-273` §1), an accept counts only when its
    `recipient_number_hash` equals `resolveCorrectionChase(…,{crypto}).currentNumberHashes` (⚠ filled only when `crypto` is passed) — compare
    with the access-wrapper gate's comparator, ⛔ never `===` on HMACs.
  - [ ] the queue reads (both origins, bounded `limit`); hold / direction / response routes; the 30-day and directee reminders;
    `listAdminsByRole` (`admin-directory.ts:43`) extended to `super_admin` (or a sibling reader).
  - [ ] the three D17 decisions (note + closure reason + the lock + the conditional supersede + `decided`; `closure.staff_case_origin`; a
    resubmitted claim decided here, `-273` §4); the highlight leg (`-273` §7) — beside `nominee-name-check-read.ts:155` /
    `cycle-freeze-read.ts:272`, from the approval record and the check's recorded state (`never_checked` / `stale` / `does_not_match`).
- [ ] **Task 5 — The re-file guard** (AC15) — the confirmation routes (district + helpline, key (6), per-request dimension as
  `resolveQueueScopeStash`) in a **new** route file (⚠ ⛔ not `claims.helpline.routes.ts` / `claims.convergence.routes.ts` — both sit in the
  human-actor gate's `ENROLMENT_OWED`, unscanned); the guard at `tryConverge` (`icp.ts:275`) **and** `overrideIntakeAttempt` (`icp.ts:553`),
  keyed on the closure row (⛔ never `denied_no_appeal`); consumption in the mint's tx; the 409 mapped at three handlers; ⭐ the member
  re-file state is **this Task's**: `refile_requires_confirmation` on `MemberDeathCertificateStatusResponse` (exactly D19's guard, a routing
  bit ⛔ never shown); the claim-entry gate's new outcome keyed on it (`ClaimEntryReadOutcome` **and** `ClaimEntryDecision` each gain a kind);
  the wizard's submit mapping the 409 to the same state (`-273` §9).
- [ ] **Task 6 — Surfaces** (AC8c) — the queue column + request action (`ClaimUnderCorrectionItem` is `.strict()` and the response is
  parsed: fill it in the handler and update the typed fixtures `apps/admin/tests/correction-queue.test.tsx:58`,
  `correction-chase-forms.test.tsx:705-708`); the Pariwar Admin strip (in `apps/admin/src/modules/cycle-freeze/{CycleFreezePage,
  PendingCaseCard}.tsx` or a sibling — `CycleFreezeRoute.tsx` is a wrapper); the Super Admin queue + decision surface; the direction inbox;
  the helpline re-file card; the nav links; the member screens for Task 5's state; family-13 assertions.
- [ ] **Task 7 — Gates, tests, discharge** (AC9c, AC10, AC11c) — audit types; the human-actor gate (new route files in `COVERAGE_SET` with
  exact `expectedMethods`, ⭐ raise `COVERAGE_FLOOR` from 12 deliberately — a minimum stays green if forgotten); the no-comparison fence's
  `FENCED_FILES` + floor; **execute** on `twt-test-pg :5433`; `deferred-work.md` records (AC7, AC9c, and each item in *Deferred items this
  slice touches*); the fallback-handler ledger rows **10–14, 17, 18** (`docs/fallback-handler-ledger/ledger.md` — the xref and
  `surface-inventory.md` amendment as 6.19b did for 9, 15, 16; ⚠ rows 12 and 18 carry `<TO-BE-NAMED-BY-TRUSTEE-PANEL>` as `fallback_actor`
  — record it, ⛔ never fill it); annotate 6.18's go-live fence as discharged by this build at **6.18's AC11 blockquote**, the shared spec's
  header, 6.19b's header and `epics.md` §6.19c (⛔ never a rewrite; `-265` Consequence 4 is cited, ⛔ not edited); a `sprint-status.yaml`
  ledger line.
- [ ] **Task 8 — `-258` in the closure** (AC17) — `closure.not_family_action` and the family run's `day0` at AC6's three acts (read the mark
  and the latest family/direction run — open or ended — through `resolveCorrectionChase`); the "no correction needed" record (key (8)) + its
  NEW approve writer (D27; refused while held — `cycle_freeze.escalated`) and the Pariwar Admin's keep stating the mark (`-260` G2), both through `writeCorrectionMark` with `hold`; the
  staff case's day-90 escalation and its two decisions (`-260` G1: approve with the full gate, refuse; ⛔ never close); AC17's tests. Mark
  `deferred-work.md`'s 6.18 chunk-1 item *"A return clears ONLY through a bank rewrite"* **built** (its path was DISCHARGED by `-258`).

## Dev Notes

### Dependency and sequencing
Task 0 → 0a → 1 → 2 → 3 → 4 → 5 → 6 → 7, Task 8 woven through 3–4. ⚠ The `-251` gate composition (Task 4's first commit) touches the most
load-bearing gate in the claim flow — land it alone, with the order matrices green, before anything calls it.
⭐ **`-263` Consequence 4 (FQ9, row `6-26`, `backlog`):** *"whichever lands second carries FQ9 into both halves; ⛔ neither may drop it."* If
6.19c lands first, its composition must let `6-26` add the inspection conjunct **once** and reach the `-251` path without editing it
(`-273` §8); D27's and G1's approves call the full gate and inherit it. ⇒ add a one-line note at the composition site naming `6-26`.
⭐ **Row `6-24` (`backlog`, `-261` D4 B, `-262` FQ5)** edits the same convergence code (`getConvergenceCandidate`, `tryConverge`): a
suspicion refusal's new claim is kept apart and **waits at final approval** for the appeal — which will reach this slice's three new approval
writers too, and FQ5's *"appeal allowed → the new claim is closed"* must ⛔ never write this slice's closure row (the re-file guard keys on it).
Leave a note at the guard naming `6-24`.

### § What 6.19b shipped (re-derived at `f079dc56` — wins over the shared spec's `c136b03c` section)
Migrations 0126 marks · 0127 runs · 0128 reminders · 0129 letters · 0130 letter-chase day purpose ⇒ **this slice starts at 0131**. Catalog
**49 / 58 keys** (6.19b minted (1) `claim.record_correction_letter`, (7) `claim.change_correction_must_act`). Human-actor gate
`COVERAGE_FLOOR = 12`. The admin nav links the correction queue (`RootLayout.tsx`, `nav-correction-queue`); the router takes `?claim=` and
`?escalated=true`. ⛔ Nothing of the day-90 work exists: the sweep ends a run `day_90` and does nothing else
(`claim-correction-reminders.ts:1074-1076`); the only staff escalation is day 12.

| Export | Where (`f079dc56`) | Use in 6.19c |
|---|---|---|
| `resolveCorrectionChase(db, pariwarId, claimCaseId, {crypto?})` | `packages/domain/src/claim/correction-chase.ts:778` | `{liveReturn, mark, familyRun, staffRun, openRun, familyPartDoneAt, currentNumberHashes}`; runs open **or** ended; `familyRun` = latest `family`/`direction`; hashes only with `crypto` |
| `openCorrectionRun(client, {…, kind, anchorId, day0})` | `correction-chase.ts:327` | the `restart_family_reminders` direction run; ends any open run `superseded`; `CorrectionDirectionRunRefusedError` unless mark `family` |
| `endCorrectionRun(client, {…, runId, reason})` | `correction-chase.ts:362` | `decided`; ⚠ a no-op on an ended run |
| `writeCorrectionMark(client, input)` + `CorrectionHoldCheck` / `noCorrectionHold` | `:449` / `:142` / `:144` | every mark write; ⭐ `hold` (`:428`) — this slice fills it and makes it required |
| `readFamilyPartDoneAt(db, pariwarId, claimCaseId, returnedAt)` | `correction-chase.ts:541` | `closure.claim_corrected`'s second leg |
| `acquireCorrectionChaseLock(client, pariwarId, claimCaseId)` | `correction-chase.ts:125` | the trustee advisory lock (key `stateTrusteeDecisionAdvisoryLockKey`, `state-trustee-decision-persist.ts:354`) |
| `readCorrectionRecipients(db, pariwarId, claimCaseId)` | `correction-chase.ts:598` | who must be reached (D22) |
| `readRunFamilyRows` / `readRunPersonStates` / `readReturnFamilyLetters` | `correction-reminder-record.ts:494` / `:671` / `:556` | D22's inputs (Task 0a makes them per return) |
| `isCorrectionRunExpired` / `correctionRunDay` / `CORRECTION_RUN_HORIZON_DAYS` | `correction-schedule.ts:109` / `:104` / `:29` | `too_early`; the day-90 job |
| `readCorrectionChaseSummary` | `correction-chase-read.ts:253` | the queue row; the closure column extends it |
| `sendClaimCorrectionSms(deps, {message, locale, pariwarId, claimCaseId, e164})` | `apps/jobs/src/scheduler/claim-correction-reminders.ts:237` | ⚠ jobs-only deps, ⛔ not in the `@twt/jobs` barrel ⇒ called by a jobs worker |
| `readReturnAccountsRewrite` | `state-trustee-decision-persist.ts:930` | the accounts leg `isReturnedClaimResubmitted` (`:861`) and `-268` share |
| `listAdminsByRole(db, pariwarId, 'pariwar_admin'│'district_admin', scope?)` | `admin-directory.ts:43` | staff reminders; ⚠ no `super_admin` |
| `matchingGrantRole` | `packages/domain/src/rbac/matching-grant.ts` | `set_by_role` (the permission checks never return the grant) |

The return's mark is written by the return route in the same tx (`claims.cycle-freeze.handlers.ts:405`, inside `postDecision`) — ⛔ not by
`returnToDistrictAdmin` (`state-trustee-decision-persist.ts:719`). `assertClaimApprovable` (`nominee-name-check.ts:383`) = certificate
(`death-certificate-approval.ts:393`) → `assertNomineeNameCheckForApproval` (`:418`: accounts ≠ 2 → determination ≠ `effective` →
`never_checked` → `stale` → `does_not_match`); 6.19a's `assertClaimContactRecorded` (`claim-contact-check.ts:175`) runs after it at P1
(`verifier-decision-persist.ts:385`), P3 (`state-trustee-decision-persist.ts:582`), P4 (`r9-voting-persist.ts:633`), per-route 409
`…claim_contact_required`. A vote's approval row is phase `frozen_vote`, `reasonCode` null — mirror it (T10). `claim.denied_no_appeal`
(`events.ts:635-638`), its one emitter (`appeal-persist.ts:472-491`) and one consumer (`member/overlay.ts:50`) are unmoved since `c136b03c`.

### ⚠ Slice traps
- **S-T1 — the import cycle.** New writers that call the mark writer, the resolver or end-run live in a NEW module; typecheck cannot see a
  runtime init cycle ([[project_type_only_import_cycle_trap]]).
- **S-T2 — "under the trustee lock" alone does ⛔ not serialise a family correction.** The bank rewrite (`nominee-bank-persist.ts:164`) and
  the name-check writer (`nominee-name-check-persist.ts:141`) take only the claim row lock — take the advisory lock **then** the row lock.
- **S-T3 — the hold fails open** until `hold` is required: a forgotten caller treats a held claim as not held, invisibly to typecheck.
- **S-T4 — `slot_day` is per run.** Never sort or compare it across runs; never write a negative one (AC18).
- **S-T5 — every run has ended by day 90.** Read ended runs through the resolver; key reminders per `-273` §6; expect `endCorrectionRun` to
  return `false` there.
- **S-T6 — the shipped highlight is empty on a `does_not_match` approval** (`differenceReasons` only when current **and** passing).
- **S-T7 — the member appeal surface is unreachable.** Test the claim-entry gate, ⛔ not the card, for what a family sees.
- **S-T8 — a pending request outliving its ground.** At day ≥ 90 its family run has already ended, so ⛔ no mark write "ends" it: the lapse is
  **derived** from `request_family_run_id` and the latest mark (`-273` §3d), and the decline refuses a lapsed request — else a staff case
  is declined into `-251`'s waiver. Every approving act still re-checks the whole request.
- **S-T9 — a stale hold.** The hold reads the **live return's** row only; a row left by an earlier return must hold ⛔ nothing.

### CI gates and red tests (grep the test tree for every symbol you edit)
- **The no-comparison fence** `packages/domain/tests/claim/nominee-name-no-comparison-fence.test.ts` — `FENCED_FILES` (`:38`, floor `≥ 26`
  at `:134`): every module on the approval path and every highlight surface joins it **in the same commit** (the new approval writers, the
  closure / Super Admin modules, the decision surface); it also requires `nominee-name-check.ts` to keep `assertDeathCertificateAcceptedForApproval`,
  `nomineeNameCheckPasses`, `isNomineeNameCheckCurrent` and ⛔ no `decrypt` (`:286`, `:294-297`).
- **The order matrices** (the T10 neutrality proof): `nominee-name-check.spec.ts:617-631`, `r9-voting.spec.ts:316`, `:415` (*"accounts
  FIRST"*), `state-trustee-cycle-freeze.spec.ts:268`, `nominee-determination.spec.ts:484-529`, `nominee-correction.spec.ts:291-300`.
- **The human-actor gate** `scripts/claim-adjudication-human-actor-invariant/check.ts`: `unclassifiedRouteFiles` (`:237`) fails an
  unclassified `claims/*.routes.ts`; `expectedMethods` is an exact multiset (`:331-339`); `COVERAGE_FLOOR` (`:283`); `ENROLMENT_OWED`
  (`:221-234`) files are unscanned; a direction-response route still composes `requirePermissionHook` + the identity check;
  `FORBIDDEN_HOOK_RE` (`lib.ts`) flags `system|service|machine…` in a preHandler's name.
- **Forced pagination** `apps/api/tests/integration/forced-pagination.spec.ts`: every new `{ items: [] }` GET declares a bounded `limit`
  (name the array `items`, or the guard is vacuous). **`clampLimit`** (`scripts/domain-accessor-invariants/`): every `.limit(x)` in
  `packages/domain/src` is a literal or `clampLimit` — a named constant is dynamic (6.19b's `ADMIN_DIRECTORY_LIMIT` went red).
- **Microcopy** (`microcopy.yaml`): `claim.json` en/hi are in `copy_globs` (member register — `user`, `customer`, `donor` fire; `$comment`s are
  scanned); `apps/admin/src/**` is in `code_globs` — ⚠ `fursat-pressure` (*"final notice"*, *"act now"*, *"last chance"*) and
  `moderation-advice` (*"action required"*, *"overdue for a decision"*) are the likely trips on the Super Admin queue and the inbox; new
  member mobile files are ⛔ not in `code_globs` — add them and to `scripts/microcopy/claim.test.ts:111` (the 6.21b precedent).
- **Access-wrapper** `scripts/access-wrapper-invariants/check.ts:96`: `withCompensatingAudit`, ⛔ never a bare `writeAuditEntry`; invariant (f)
  fires on `===` between runtime hashes.
- **AC10's fences hold and enforce:** `claim-reversed-event.test.ts:69`, `nominee-name-check-events.test.ts:110-144`, `state.test.ts:132`.
  If a new decision **phase/outcome** were added (the plan mirrors `frozen_vote` — ⛔ no new phase), `packages/contracts/tests/claims-cycle-freeze.test.ts:26-52`
  and the parsed `CycleFreezeDecisionResponse.phase` would break.
- **Mobile:** `claim-entry-gate.test.ts` pins five outcomes and two decisions (each gains a kind; its `:22-30` pins `-249` §2's terminal →
  wizard, which `-273` §9 narrows for a closed claim only); `claim-steps.test.ts` pins `CLAIM_STEPS` (add ⛔ no step);
  `apps/mobile/lib/appeal-status.ts:7`'s `MemberAppealStatus` is a hand copy of the contract and mobile tests are outside tsc — update the
  fixture by hand. Real-`t()` precedents: `apps/mobile/tests/unit/{certificate,nominee-name}-copy-resolves.test.ts`; the helpline CTA fence
  `helpline-cta-presence.test.ts` (`<CallHelplineCTA>`).
- **The friction budget:** any `apps/mobile/**` change owes a `friction-budget.md` row (checked against committed history).
- **Seed twins:** `seedNomineeNameCheck` in `packages/domain/tests/integration/_helpers.ts:1099` (`reuseAccounts`) **and**
  `apps/api/tests/integration/_nominee-name-check-fixture.ts:141` (`accountsOnly`, `singleAccount`) — both seed a passing check + a
  determination + a certificate + a contact by default; the `-251` refusal legs need `certificate:'skip'`, `determination:'skip'`,
  `singleAccount` (api twin only), `verdicts:[…,'does_not_match']`. Day-90 job tests reuse `apps/jobs/tests/_claim-correction-seed.ts:67`.

### Files
**UPDATE:** `packages/domain/src/claim/{nominee-name-check,appeal-eligibility,icp,correction-chase,correction-chase-read,correction-letter,
correction-reminder-record,admin-directory,nominee-name-check-read,cycle-freeze-read}.ts`, `schema/claim_correction_chase.ts`,
`apps/jobs/src/scheduler/claim-correction-reminders.ts`, `apps/jobs/src/boot.ts`, `packages/queue/src/index.ts`,
`apps/api/src/modules/claims/{claims.appeal.handlers,claims.service,claims.cycle-freeze.handlers,claims.correction-chase.handlers,
claims.nominee-name-check.handlers,claims.helpline.handlers,claims.convergence.handlers}.ts`, the member death-certificate status handler,
`packages/contracts/src/claims/{appeal,correction-chase,nominee-name-check}.ts` + the death-certificate status contract,
`packages/api-client/src`, `apps/mobile/lib/{appeal-status,claim-entry-gate,fetch-claim-entry-outcome}.ts`, `apps/mobile/app/(claim)/index.tsx`,
`apps/admin/src/modules/{correction-chase,cycle-freeze}/*`, `RootLayout.tsx`, `router.tsx`, `packages/domain/src/rbac/{permissions,roles}.ts`
+ tests, `apps/api/src/audit/audit-sink.ts`, `packages/i18n/locales/{en,hi}/claim.json`, `scripts/claim-adjudication-human-actor-invariant/check.ts`,
`microcopy.yaml`, `friction-budget.md`, `docs/fallback-handler-ledger/ledger.md`, 6.18's story file + 6.19b's + the shared spec + `epics.md`
§6.19c (annotations).
**NEW:** migrations 0131+ (+ RLS files); the closure / Super Admin domain module(s); the closure, Super Admin, direction and re-file route
files + handlers; the day-90 job + the closure-notice worker; the admin modules (Pariwar Admin strip, Super Admin queue, direction inbox,
helpline re-file card).
**⛔ NEVER edit:** `voteOnFrozenClaim`'s guard; `assertClaimApprovable`'s behaviour for P1/P3/P4; the event registry's types; migrations
0126–0130; `packages/channels/src/{dispatch,render,sms-dlt-registry}.ts`.

### Testing standards
As the shared spec's ([[project_live_db_test_gotchas]], [[project_known_livedb_test_failures]]): assert membership, not counts; never
regenerate an applied migration; never `DROP SCHEMA`. ⭐ Two-connection exemplar: **`packages/domain/tests/integration/claim/correction-chase-concurrency.spec.ts`**
(its `overlapped` helper at `:264`; ⚠ `{ timeout: 60000 }` at `:70-72` — a race spec's timeout must sit above its internal lock bounds);
also `apps/api/tests/integration/claims/cycle-freeze.spec.ts`. New FK tables into `claims` are covered by `lockTruncateSetNowait`
(`_helpers.ts:656`). ⚠ `reconciliation/review-queue-read` is a known pre-existing failure — ⛔ not this story's.

### Deferred items this slice touches (`deferred-work.md`, by heading)
- § *fifth-pass re-review* — *"⏳ `-272`"*: **built** by Task 0a.
- § *third pass, the committed branch* — *"Nine earlier-pass 6.19b review items"*: dispose those Task 0a touches (named in Task 0a);
  *"The staff push deep-links into the MEMBER app"*: this slice's staff reminders inherit it — record, ⛔ not fixed.
- § *Story 6.19b dev* — *"D26's `skipped_superseded` markers cover the FAMILY's rows only"*: the closure predicate reads family rows and
  letters only ⇒ ⛔ no staff-row marker needed — record that disposition.
- 6.18 chunk 1 — *"A return clears ONLY through a bank rewrite"*: **built** by Task 8. 6.18 chunk 3 — *"LINKED INSIDE A PARIWAR CONTEXT"*:
  the new queues' reachability (AC8c).

### References
`.decision-log.md` — `-226`, `-227`, `-229` → `-232`, `-250` → `-256`, `-258`, `-260`, `-261` D4, `-262` FQ5, `-263` C4, `-265` → `-273`.
Stories `6-19-correction-return-reminders-and-closure.md` (shared spec), `6-19b-…` (§ Review Findings → Fifth pass), 6.16 (D-E, D-F, D-G),
6.18 (AC11). Routing notes `…-2026-09-20-6-19-{declined-closure,refiling-after-closure}.md`, `…-2026-09-27-6-19-{f1-keep-open,
follow-ups-2,return-not-the-familys-to-fix}.md`. UX `ux-design-specification.md` (Stance #5, UX-DR44/54/57).

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

## Change Log

| Version | Date | Change |
|---|---|---|
| **v2.1** | **2026-10-01** | ⭐ **The fresh-context re-validate of v2.0 and of `-273`'s first draft** (footgun 22), applied before `-273` is inserted: `-273` gains **§4** (while escalated only the Super Admin decides — `-256` cl.1 outranks D17's *"returns to the ordinary vote"*; the vote and a new return refused at the route) and **§3c** (a staff-origin escalation is ⛔ never closable — `closure.staff_case_origin`, keyed on origin — **Confirm 1** for the Panel); §5 becomes an **outbox** (once per closure per recipient) and records **Confirm 2** (a family reached only by post is ⛔ not told); §6's cadence ⛔ never rides `slot_day`; §7's highlight covers `never_checked` / `stale`; §9 names `-249` §2 and the post-confirmation wizard; `-273` renumbered (§4–§9 → §5–§10). **Story:** the Pariwar Admin's approval and the Super Admin's close re-check the **whole** request (`too_early` on the current run, `not_reached`); the hold keyed on the live return's row; the day-90 job's stop condition; AC7's `deriveAppealView` is display-only; the wizard's submit maps the re-file 409; the six test callers of `writeCorrectionMark`; predicate 8 in the Policy meaning; S-T8, S-T9. ⭐ **Second re-validate, same version:** every Pariwar Admin decision (incl. D27's approve) refused while held, records allowed; a pending request **lapses** when its family run or its return ends (`-273` §3d); one live closures row per **return**; the `-251` waiver follows the origin (ours, Confirm 1); `refile_requires_confirmation` routes the gate (a consumed confirmation ⛔ never traps a family); the outbox's columns and once-only key; every 6.19c reminder stops at the decision; a directee's per-direction key; `-273`'s Status line no longer credits BigDev with sections added after BigDev's answers. ⭐ **Third re-validate:** the lapse is **derived** from `request_family_run_id` (the first trigger never fired — at day ≥ 90 the family run has already ended) and the decline refuses a lapsed request (`closure.request_lapsed`); the closures UNIQUE excludes `lapsed`; the cycle-freeze guard runs after the lock for every actor (incl. `super_admin`); the outbox's `closure_notice_done_at`. BigDev approved `-273`'s added sections (*"Approve all"*). ✅ **`-273` inserted by BigDev** (verified additive-only, byte-identical to the staged text) — Task 0's STOP is lifted. |
| v2.0 | 2026-10-01 | ⭐ **RE-DERIVED at `f079dc56`, ⛔ not patched** (`/bmad-create-story validate 6.19c`, four read-only verifiers; BigDev: *"Rewrite v2.0"*). Re-pinned from `c136b03c` (157 code files moved — 6.19a and 6.19b shipped). ⭐ **Author-commit `-273` staged** (BigDev inserts): D22 reads the whole return (the per-run reading deadlocked closure under `-272`); the letter cap ⛔ never resets on a new number (*"No reset"*); an escalated staff case is held (*"Held"*); the closure notice is sent by the jobs app; reminders after day 90 key on the return's latest run; the member status rides the claim-entry gate (*"Claim-entry gate"*); the *"approved despite a name mismatch"* highlight; the `-251` gate composed by construction (carrying `-263` C4); the Super Admin's reason on the closure record. **New:** AC18 (`-272`/`-273`); § What 6.19b shipped; § Slice traps; § CI gates and red tests; § Deferred items; the AC6 409 order incl. `no_live_return` / `escalated` / `request_pending`; AC14's both origins and the required `hold`. **Corrected:** Task 2 mints key (8) in the one bump (49 → 50, 58 → 64); the hold hook is on `writeCorrectionMark`, ⛔ not the run opener; the closure notice cannot be called from the API; the member appeal card is unmounted; the Files list (the import cycle; `CycleFreezePage`); AC10 names D27's narrowing; AC11c gains the `-267`/`-268`/`-269`/`-271`/`-272` proofs; keys (4)/(5) denial; race timeouts; Task 7's discharge sites (`epics.md` §6.18 carries no such fence); the ledger rows 10–14, 17, 18; the Policy meaning (seven predicates; `-258`, `-260` G1, `-268`); four `⛔` on non-negation words. |
| v1.8 | 2026-09-29 | ⚠ **SWEPT by `-271`**: D22's "reached" counts only accepts to the person's CURRENT number (6.19b's resolver exposes its hash); the hold hook also covers a switch to `staff` (⛔ no staff run during a hold). |
| v1.7 | 2026-09-29 | ⚠ **SWEPT by `-269`**: Task 4 fills 6.19b's run-opener hold hook (⛔ no family run on a mark switch during an escalation or review — only a direction); "the family's part is done" now reads the LATEST check (AC6's `closure.claim_corrected` via 6.19b's reader, unchanged in shape). *(v2.0: the hook is on `writeCorrectionMark`, ⛔ not the run opener.)* |
| v1.6 | 2026-09-29 | ⚠ **SWEPT by `-268`**: AC6's `closure.claim_corrected` also fires when the family's part is done (every account rewritten after the return, ⛔ no later `does_not_match`) — through 6.19b's reader, under the trustee lock, at all three closing acts. ⚠ Its AC11c owes the test (a family that rewrote on day 10 and was never re-checked is ⛔ not closable at day 90). |
| v1.5 | 2026-09-29 | ⚠ **SWEPT by `-267`** (6.19b's re-validate): AC6's *"live run"* = the latest family run, open or ended, through 6.19b's resolver; 6.19b's opener ends any open run of the claim and refuses a `direction` run unless the mark is `family`; 6.19c's decisions end the run through 6.19b's end-run function (`decided`); 6.19c's own reminder purposes extend 6.19b's `purpose` CHECK by its own migration. |
| v1.4 | 2026-09-29 | ⚠ **SWEPT by `-266`** (6.19b's validate pass): the closure notice's template/copy are 6.19b's (D32 — this slice sends it); a `restart_family_reminders` direction opens a `direction` run through 6.19b's run opener; the mark and the family run's day 0 are read through 6.19b's exported resolver and written through its mark writer; "reached" keys on `run_id`. ⛔ No AC re-derived — ⚠ this file's own code claims are still pinned to `c136b03c` and owe a re-derivation at its own validate. *(v2.0: "reached" reads the whole return — `-273` §1.)* |
| v1.3 | 2026-09-28 | ⚠ **SWEPT by `-265`** (6.19a Task 0): D1–D24 → D1–D29; D29 in its `-260` G1 form; `claim_contact.required` → `closure.claim_contact_required`; the three new approval writers and the closure writers call D14's check. ⛔ No AC re-derived. |
| v1.2 | 2026-09-27 | ⭐ **`-260` recorded:** AC17's staff case — the Super Admin may approve (full gate) or refuse, ⛔ never close (G1); the Pariwar Admin's keep states the mark (G2); ⛔ no text after a Super Admin decision (G3). |
| v1.1 | 2026-09-27 | ⭐ **`-258` (V, option B) appended:** AC17 and Task 8; key (8) minted here; six predicates in the policy note. |
| v1.0 | 2026-09-27 | Split from Story 6.19 v0.9 (D13, BigDev: *"split it three ways"*). ACs AC6, AC7, AC10, AC14, AC15 carried verbatim; AC8c/AC9c/AC11c restated for this slice; Tasks re-cut. Status `ready-for-dev`, fenced on 6.19b `done`. |
