# Runbook: Personal data breach table-top exercise

> ⚠ **NOT AUTHORITATIVE until signed in `operational-readiness-ledger.md`.** This is a draft written by Story 14.3. The exercise it
> describes has **not been run**: Story 14.3 writes the script; trustees run it (launch-gate Row 53 (b)).

> **Status:** draft (Story 14.3 author-commit 2026-11-20, Decision `2026-11-20-467`); unsigned; never executed
> **Owner role:** Facilitator — the breach owner (designated by the Trustee Panel, Decision `2026-11-20-468`; a Trustee, `dpo@aipwt.org` — `-469`; the Solo Builder facilitates if they cannot), with at least two trustees taking part besides the owner (Decision `2026-11-20-470`)
> **Last material edit:** 2026-11-20 by Solo Builder (initial)
> **Architectural authority:** architecture.md Launch Gate Risks (*"Incident response tabletop | Pre-launch | Semi-annual"*), §2.12 · PRD FR-99 · epics.md Story 14.3 (*"a tabletop exercise validates the breach-reporting flow end-to-end"*) · DPDP Rules 2025 Rule 7 · the shape of `docs/degradation-policy/table-top-exercise.md`

This runbook walks at least two trustees — besides the breach owner, who facilitates — through one made-up breach, from the first signal to a closed record, on
a **rehearsal** record in the admin app. It tests whether `personal-data-breach-response.md` can be followed cold, inside the clocks.

**Output is a gap list, not a pass/fail score.** A run that finds gaps has done its job. A run that finds none is tested again with a
different scenario before anyone trusts it.

**Cadence:** once before launch, then every six months (architecture). Each run is logged as a decision in `.decision-log.md` when it
has happened — never before.

## 1. Prerequisites

- `personal-data-breach-response.md` and `dpo-appointment-and-sdf-watch.md` read by everyone taking part, beforehand.
- A Super Admin account with a display name set, on an environment where the admin app's breach page works (staging, or production
  with a rehearsal record — a rehearsal record is permanent and is marked as one everywhere).
- At least two trustees present for the whole exercise **besides the breach owner**; a note-taker who is not the facilitator.
  The breach owner is a Trustee (Decision `2026-11-20-469`) and does NOT count as one of the two (Decision `2026-11-20-470`): the owner runs the response, so counting them would make one person both the responder and half of the check on it.
- A scenario card (2.1) that the trustees have **not** seen.
- A stopwatch. The exercise compresses the 72 hours: the facilitator announces the simulated time at each step.
- ⛔ No real notice is sent to anyone during a rehearsal. Every draft is headed `REHEARSAL — DO NOT SEND`.

## 2. Step-by-step procedure

### 2.1 — The scenario card (facilitator prepares one; this is the default)

> *Simulated, Tuesday 10:40 IST:* a District Admin phones the helpline. A spreadsheet of one Pariwar's claim contacts — names, mobile
> numbers and addresses of about 40 claimants — was emailed last night to a wrong address outside the Trust. The recipient has replied
> "wrong person". Nobody knows yet whether it was opened or forwarded.

Vary it on later runs: a failed audit-chain check; a public page that showed a member's phone number; a text that reached a wrong
number; a processor (the SMS provider) reporting its own breach.

### 2.2 — Signal → open (simulated T+0)

**Simulated event:** the facilitator reads the card.
**Participants do:** decide who is told first; open an incident, ticking **rehearsal**; enter the awareness time.
**Record:** who was told and how long it took to open the record. *Gap prompts:* Did anyone know who the breach owner is, and how to reach them? Was the
awareness time the call's time or the email's? Could a trustee find the page?

### 2.3 — Assessment (simulated T+2 h)

**Participants do:** record an assessment — nature, extent, location, data categories, the estimated number of people, the Pariwar,
the likely consequences, what a person can do, the contact for questions. Use the breach runbook's appendix to say which tables and
which outside parties are involved.
**Record:** which fields nobody could fill and why. *Gap prompts:* Who is the contact for affected people? Did anyone type a name or a
mobile number into the record?

### 2.4 — The drafts and the two "without delay" notices (simulated T+4 h)

**Participants do:** open the three drafts; clear the missing lines; say aloud, step by step, how the first intimation would reach
the Board and how the notice would reach each of the 40 people (which channel exists for that Pariwar today); who translates the
member notice into Hindi; whether CERT-In is told. Record a *first intimation*, a *notice to affected people* and a *CERT-In report*
entry as if sent.
**Record:** every point where the answer was "we do not know how". *Gap prompts:* Is there a way to file with the Board today? Which
channel reaches a claimant who is not a member and has no app account?

### 2.5 — The 72-hour report (simulated T+60 h)

**Participants do:** record mitigation, cause findings and remedial measures; open the 72-hour report draft and check every
sub-item is filled; record it as sent. Then the facilitator announces T+73 h on a second, unreported rehearsal record and the
participants find the "Board report overdue" marker and decide what they would do (a written extension request).
**Record:** time taken; anything the draft lacked.

### 2.6 — Owner review → recorded sign-off → close

**Participants do:** the breach owner records an owner review; the two trustees — neither of them the breach owner — sign the summary by their own means and the operator
records **Sign-off recorded** with their names; the incident is closed; one more entry is attempted and is refused.
**Record:** whether the trustees understood that the operator records their signing — they do not sign in the app.

### 2.7 — The gap list

The note-taker reads the gap list aloud. For each gap: is it in a runbook (amend it), in the app (a story), in the law's unknowns
(counsel) or in who-is-who (the Panel)? Each gets an owner and a date, or is homed in `deferred-work.md`.

**Recording — only after the run has happened:** a decision in `.decision-log.md` (who took part, the scenario, the gap list and each
gap's owner); a dated line at launch-gate Row 53 (b); the rehearsal record's id. ⛔ None of these is written by Story 14.3.

## 3. Rollback procedure

A table-top changes no real state; "rollback" means handling a run that goes wrong.

- **A rehearsal record opened as real by mistake** — it cannot be changed. Close it with a note saying it was a rehearsal opened in
  error, tell the breach owner, and open a rehearsal record. ⛔ Send nothing from it.
- **A rehearsal draft was sent to someone** — that is a real incident of its own: follow `personal-data-breach-response.md`.
- **Fewer than two trustees besides the owner stay to the end** — record what was done as a partial run, reschedule the rest; it does not close
  Row 53 (b).
- **The facilitator has to answer for the participants** — that is a gap; write it down and carry on.

## 4. Verification checks

- [ ] Every step 2.2–2.6 has a recorded outcome, with the simulated time and the real time taken.
- [ ] The rehearsal record shows the rehearsal banner, and all three drafts are headed `REHEARSAL — DO NOT SEND`.
- [ ] The gap list exists, and every gap has an owner and a date or a `deferred-work.md` item.
- [ ] A zero-gap run has been repeated with a different scenario before being recorded as clean.
- [ ] A decision entry and a dated line at Row 53 (b) were written AFTER the run, by the people who ran it.

If any check fails, the run does not count toward Row 53 (b); escalate per §5.

## 5. Contact escalation list

- **Primary:** the facilitator (the breach owner — designated by the Trustee Panel, Decision `2026-11-20-468`; interim: Solo Builder).
- **Secondary:** Trustee Panel chair on rota.
- **If a rehearsal turns into a real incident:** `personal-data-breach-response.md` §5.

---

## Changelog

| Date | git SHA | Author | Material edit? | Re-sign required? | Ledger entry |
|---|---|---|---|---|---|
| 2026-11-20 | (this commit) | Solo Builder (Story 14.3) | yes (initial) | yes (≥2 trustees) — not yet signed | none yet |
| 2026-11-20 | (this commit) | Solo Builder (Story 14.3) | yes — the owner lines, after the Panel's ruling (Decision `2026-11-20-468`) | yes (≥2 trustees) — not yet signed | none yet |
| 2026-11-20 | (this commit) | Solo Builder (Story 14.3) | yes — the owner's contact and capacity (Decision `2026-11-20-469`) | yes (≥2 trustees) — not yet signed | none yet |
| 2026-11-20 | (this commit) | Solo Builder (Story 14.3) | yes — two trustees BESIDES the breach owner (Decision `2026-11-20-470`) | yes (≥2 trustees) — not yet signed | none yet |
