# Trustee Panel routing note — sign off two staff-email designs you already asked for; two other designs, told

> **Status: WRITTEN 2026-11-26; ⛔ NOT YET SENT** (BigDev sends). Prepared for the Panel sitting of late November 2026 as part of
> the agenda `trustee-panel-sitting-2026-11-26-agenda.md`.
> **Prepared by:** BigDev (Solo Builder).
> **2026-11-27 — SENT** to the Panel with the sitting agenda (`trustee-panel-sitting-2026-11-26-agenda.md`, item 6); BigDev: *"agenda sent"*, and confirmed every note named in the agenda went with it. ⚠ The channel, the time and the exact text sent are NOT recorded. Awaiting ruling. Every line above is kept as written.
> **2026-11-27 — RULED** — [`2026-11-27-519`](../../.decision-log.md#decision-2026-11-27-519) (Trustee-ratified, Dhiraj Rahul + Kalpana Bharti, relayed by BigDev): **A** — ADR-0043 and ADR-0045 signed off. ⚠ The channel and the time of the ruling are NOT recorded. "Awaiting ruling" above is kept as written; the ruling is in the block below.

---

> ## ✅ RULED — 2026-11-27, Trustee-ratified (Dhiraj Rahul + Kalpana Bharti), relayed by BigDev
>
> **Verbatim as relayed:** *"by DR and KB / agenda"* and, for this note, *"6. Q A"* — recorded as
> [`2026-11-27-519`](../../.decision-log.md#decision-2026-11-27-519), committed ALONE (`5527fdb1`, with the sitting's `-515` to `-521`).
>
> - **The question — A, for each of the two** (our suggestion, *"A for both"*): **ADR-0043** (the memorial take-down approver email)
>   and **ADR-0045** (the field-worker move-notice email) are signed off by two trustees and marked `ratified` with their names — in
>   each ADR's header, in the ADR index and on roster Row 41 (l) and Row 51 (e). Option A's cost, as put below, is accepted with it.
> - ⚠ One letter was relayed for a table headed "for each of the two"; it is read as A for both, on the agenda's *"A (sign both)"*.
> - **Told, not asked:** ADR-0044 and ADR-0046 were ⛔ signed and stay `drafted`. ⛔ Objection to the told lines is recorded — and
>   ⛔ that is NOT a ratification; they stay ours.
>
> The block below is the one first written; it is kept as written. Everything below it is kept **unedited** as the question **as it
> was put** ([[feedback_supersede_never_reinterpret]]).

---

> ## ⏳ AWAITING PANEL RULING
>
> ⛔ **Nothing is recorded here yet.** When two trustees sign off, record it in `.decision-log.md` as a new decision id, in each ADR's
> header (status `ratified`, the trustees' names), in the ADR index and on the roster rows named below. Everything below is kept
> **unedited** as the question **as it was put**.

---

# The question

**In one sentence:** Will two of you sign off the written designs for two staff emails you have already asked for: the email to staff
who approved a family memorial when it is taken down, and the email to District and Pariwar Admins when a field worker's move is asked
for or made?

**Why it cannot be decided without you:** under the Trust's own rule, a design record (an "ADR") only becomes binding once two trustees
sign it. Both of these widen one you already signed in October (the staff-email design, ADR-0040, recorded 18 October). That design allowed only one way
for the system to look up a staff member's work email, and said any further way needs its own signed record. These are the second and
third ways.

## The one fact that decides it

**You have already asked for both emails, and both are built.** The memorial email carries out your ruling of 23 October (*"An email is
sent to the approver … when it is removed"*), and your ruling of 27 October (*"If an approver has left the Trust, they are not emailed and no one
else is told in their place"*). The field-worker email carries out your ruling of 3 November (*"Both District Admins are told by email
and in the admin console, including when the Pariwar Admin moves a worker"*). What you are signing is how the system finds the right
staff member's email address, not whether to send the email.

---

# What you are choosing between (for each of the two)

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | **Sign it off** (two trustees). | Nothing new. The staff emails you ruled on may be switched on once the rest of their go-live list is done. | The system gains a second and a third way to read one staff member's work email. Each is narrow (one staff member, only to send that one email, never logged) and checked by an automatic test. The field-worker email also accepts that if email has been down for three or more days, the missed notices are not emailed later. They stay in the console. |
| **B** | **Defer.** | Nothing. The two emails stay off. | Two go-live items stay open: the memorial take-down switch (roster Row 41, item l) and field-worker move requests (Row 51, item e). Neither is the only thing holding those back today. |
| **C** | **Reject.** | The staff you ruled should be emailed are not. | Contradicts your own rulings of 23 and 27 October and 3 November, so you would need to change those first. |

**Our reading:** **A for both**, because they carry out emails you have already asked for, they are built, and the only new thing is
a narrow lookup you can check.

---

# Told, not asked: the other two drafted designs

- **ADR-0044 (how a partner offer is stored)** is purely internal. An offer, once written, is never edited: a mistake is fixed by
  withdrawing it and publishing a corrected copy. One thing a member could notice is that correcting an offer resets its places, so a
  member may register interest again on the corrected offer. Nothing waits on it. We leave it drafted and do not ask you to sign it unless
  you wish to.
- **ADR-0046 (how a member's details reach a partner)** carries out your 21 November rulings on partner leads (the four details only;
  removed at once if stopped, 30 days after delivery otherwise; stopped from a reported death). **We suggest you do not sign it yet**,
  for three reasons:
  1. Counsel has not yet been asked about sharing member data with partners, and the 30-day figure is counsel's to change.
  2. It settles two things a member is owed that you have not ruled on: a lead that fails for good still uses up the member's one
     registration, and a partner may receive the same details more than once if it does not check for repeats.
  3. Nothing uses it until the partner registration screen is built.

  We will bring those two questions to you when the first partner agreement comes to you.

---

# What is at stake right now

- **Live today:** nothing. No member and no staff email is live.
- **Blocked:** one item each on two go-live lists (memorial take-downs, field-worker move requests). Other items on both lists are also
  still open.
- **If nothing is decided:** the two emails stay off. Nothing else changes.

---

# How much to trust this note

- **Earlier versions of this question:** none. None of these four designs has been put to you before.
- **Corrected in this note:** while preparing it we found that three of the four written designs said things the system does not do. The
  memorial design said its lookup runs under a restricted database role; it does not, the same as the staff email you signed in
  October, and that gap is tracked as its own go-live item (roster Row 26). Two others had out-of-date lines. Each is corrected by a
  dated line in the design itself, with the original sentence left as written, so you are not asked to sign anything untrue.
- **Caught by the re-check before sending:** the first draft dated your memorial ruling `-411` as 30 October; it is 27 October.
  Running the evidence commands found it (the id greps empty with the wrong date). Corrected throughout.
- **Still uncertain:** nothing about the two asks. The field-worker email's three-day cut-off is a limit on an outage, and we judged it
  not a policy. We tell it to you so you can disagree.

---

# In plain English

You have already decided that staff who approved a memorial are emailed when it is taken down, and that District Admins are emailed when
a field worker moves. Both emails are built. The Trust's rule is that the written design behind them must be signed by two of you before
it is binding. We ask two of you to sign those two. We are not asking you to sign two other designs: one is internal bookkeeping, and the
other should wait until counsel has answered and the first partner agreement comes to you.

---
---

# EVIDENCE — for the record, ⛔ not for the meeting

## E1 — What is already ratified, verbatim

> `2026-10-23-392` item 5 (Trustee-ratified): *"An email is sent to the approver — the person who approved the memorial (the decision's
> recorded actor) — when it is removed."* (kept by `-395`)
>
> `2026-10-27-411` PC3 A (Trustee-ratified), item 5: *"If an approver has left the Trust, they are ⛔ not emailed and ⛔ no one else is
> told in their place."*
>
> `2026-11-03-443` Q1 A (Trustee-ratified): *"Both District Admins are told by email and in the admin console, including when the
> Pariwar Admin moves a worker."* (recipients refined by `-459`, `-461`)
>
> ADR-0040 (ratified, DR + KB, `-358`), its identity-read clause: *"⛔ No other new path is admitted; a third is a new ADR."*
>
> `docs/adr/README.md`: *"`ratified` — Ratified by ≥2 trustees; operationally binding"*.
>
> `2026-11-21-484` (Trustee-ratified): Q3 A *"The four, for every partner."*; Q4 A *"Removed at once if the send is stopped; removed 30
> days after it is delivered or finally fails."*; Q7 A *"Stop from the moment the death is reported, and stay stopped after the claim is
> settled."*

## E2 — What is NOT ratified

- ADR-0043, -0044, -0045 and -0046 are all `drafted`, with "Ratifying trustees: —". None was put to the Panel before (no routing note,
  panel pack or consent sheet names them).
- ADR-0046's member-owed residuals: a finally-failed lead still consumes the member's one registration (`-427` Consequence 3); and
  at-least-once delivery (up to 7 attempts) to a partner that does not de-duplicate. Only the death case is ruled (`-484` Q7 A).
- Counsel on partner data sharing: ⛔ recorded as sent (roster Row 54 (b)).

## E3 — What the code actually does

- Memorial email: built (Story 11b.4a `done`), identity read `memorialApproverEligibleSql`
  (`packages/domain/src/memorial/takedown-approver-email-read.ts`), child wired in `apps/jobs/src/boot.ts`, fenced by
  `apps/jobs/tests/staff-email-identity-read-fence.test.ts`. Runs on the BYPASSRLS service pool with `withPariwarScope` (sets
  `app.pariwar_id` only, `packages/domain/src/db.ts`); ⛔ `SET LOCAL ROLE` in any production jobs / domain file (every hit is a comment).
- Field-worker email: built (Story 13.1g `done`, PR #328), identity read `fieldWorkerNoticeEmailEligibleSql`
  (`packages/domain/src/field-worker/notice-email-eligibility-read.ts`), the "Q-2" three-day cut-off as ADR-0045 §Decision states.
- ADR-0044: `manifest_schema_version IN (1, 2)` (`packages/domain/migrations/0216_marketplace-module-lead-route.sql`). ADR-0046: built
  (Stories 12.5, 12.5b `done`); no caller until Story 12.3 (`backlog`).
- Dated corrections committed `9b21b631` on `governance/panel-sitting-2026-11-26` (ADR-0043 ×2, ADR-0044 ×1, ADR-0046 ×2).

## E4 — Commands to re-verify every claim

```
for a in 0043 0044 0045 0046; do grep -m1 '^> \*\*Status' docs/adr/ADR-$a*.md; grep -m1 'Ratifying trustees' docs/adr/ADR-$a*.md; done
grep -n '^### Decision 2026-10-23-392\|^### Decision 2026-10-27-411\|^### Decision 2026-11-03-443\|^### Decision 2026-11-21-484' .decision-log.md
grep -n 'No other new path is admitted' docs/adr/ADR-0040*.md
grep -rn --include='*.ts' 'SET LOCAL ROLE' apps/jobs/src packages/domain/src | grep -v '/tests/\|\.test\.\|test-utils'   # only comments
grep -n '0043\|0045' docs/launch-gate-inventory/inventory-roster.md | head      # Row 41 (l), Row 51 (e)
grep -n 'Correction (2026-11-26' docs/adr/ADR-004*.md
```
