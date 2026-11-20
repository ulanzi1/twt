# Runbook: Data Protection Officer appointment, the Significant Data Fiduciary watch, and the monthly compliance review

> ⚠ **NOT AUTHORITATIVE until signed in `operational-readiness-ledger.md`.** This is a draft written by Story 14.3. No trustee has
> signed it. It appoints nobody: no Data Protection Officer, breach owner or published contact is named by this file or by any decision.

> **Status:** draft (Story 14.3 author-commit 2026-11-20, Decision `2026-11-20-467`); unsigned; launch-gate Row 53 (a) open
> **Owner role:** Trustee Panel (the appointment); the breach owner — `[PENDING PQ1]` — runs the monthly review (interim: Solo Builder)
> **Last material edit:** 2026-11-20 by Solo Builder (initial)
> **Architectural authority:** architecture.md §2.12 (SDF classification reviewed at named triggers; the DPIA lives in governance documentation; its owner identified before launch) · PRD FR-99 (*"monthly compliance review"*), OQ-7 · DPDP Act 2023 ss.2(l), 8(9), 10 · DPDP Rules 2025 Rules 9, 13 · Decision `2026-11-20-467`

**What the law asks, in three lines.** A Data Protection Officer (DPO) is required **only** of a Data Fiduciary the Central
Government notifies as *Significant* (DPDP Act s.10) — one fiduciary or a class; there is **no numeric threshold** to cross, so there
is no count to watch. **Every** Data Fiduciary must publish the business contact of *"a Data Protection Officer, if applicable, or a
person who is able to answer"* (s.8(9)) — that person is launch-gate Row 8. Reporting a breach does not wait for a DPO
(`personal-data-breach-response.md`).

Whether the Trust appoints a DPO before the law requires one, and who owns a breach until then, is the Trustee Panel's decision (PRD
OQ-7; the note is written, not sent). This runbook is ready for either answer.

## 1. Prerequisites

- **For an appointment:** a Trustee Panel decision to appoint (voluntarily, on counsel's advice, or because the Trust or its class has
  been notified under s.10); a candidate who meets §2.1; counsel's written view on independence `[COUNSEL — CQ5]` (not yet asked).
- **For the monthly review:** a Super Admin account (the "Monthly review" panel is on the breach list page,
  `/data-protection/breaches`); access to the e-Gazette (`egazette.gov.in`) and the Ministry's site; this file's log table (§2.4).
- **Private documents:** the draft privacy policy and Terms name "the Data Protection Officer" as a placeholder in several places.
  They live in the private legal repository (Decision `2026-08-28-167`) and are changed there, never in this repository.

## 2. Step-by-step procedure

### 2.1 — Who may be appointed (named-candidate criteria)

From DPDP Act s.10(2)(a), a Data Protection Officer:

1. is **an individual** (not a firm or a committee);
2. is **based in India**;
3. is **responsible to the Board of Trustees** (the Act says *"the Board of Directors or similar governing body"*);
4. is **the point of contact for the grievance redressal mechanism** — the person members reach about their data;
5. **represents** the Trust under the Act.

The Trust adds: the person can be reached every working day, can read the admin app's breach register, and has no duty that conflicts
with judging the Trust's own handling of data. Whether a trustee, the Solo Builder or an outside professional may hold the role, and
what independence the role needs, is `[COUNSEL — CQ5]`. ⛔ Do not appoint on this runbook's reading alone.

### 2.2 — The trigger

- **An SDF notification** — the Central Government notifies the Trust, or a class the Trust falls in, as a Significant Data Fiduciary.
  The appointment ceremony (2.3) then runs **within any window the notification sets**. The Act and the Rules set no fixed window (as
  read on 2026-11-20); if the notification is silent, appoint without delay. From the notification the Trust also owes, **once in
  every period of twelve months**, a Data Protection Impact Assessment and an audit (Rule 13(1)), and an independent data auditor
  (s.10(2)(b)).
- **Or the Trustee Panel decides to appoint earlier** — its ruling on the open question, or counsel's advice `[COUNSEL — CQ4]`.

### 2.3 — The appointment ceremony

1. **The Panel decides**, with at least two trustees, and the decision is recorded in `.decision-log.md` (Trustee-ratified): the
   person's name, their contact, the date the appointment starts, to whom they report, and who stands in when they are away.
2. **Seal the contact path** — the `dpo-contact-path` envelope in `docs/escrow/credential-inventory.md` (Domain 7) is sealed per
   `docs/escrow/` with the officer's identity, the escalation tree and the replacement procedure.
3. **Fill the placeholders in the private legal repository** — the privacy policy and the Terms name the officer and the contact; the
   Hindi versions are reviewed by a person. Members are shown the new text the way the Trust shows any policy change.
4. **Publish the contact** — DPDP Rules 2025 Rule 9: *"prominently publish on its website or app, and mention in every response to a
   communication for the exercise of the rights of a Data Principal"*. The Trust publishes it in both the app and the website.
5. **Give the officer access** — a Super Admin holds the breach permission today; whether the officer gets an account of their own,
   and with what permission, is decided then. ⛔ No `dpo` role exists in the system (Decision `2026-08-14-106` item 8).
6. **Update the gates** — a dated line at launch-gate Row 8 (the published contact) and Row 53 (c); the breach runbook's owner line
   and this file's owner line name the officer; the runbooks are re-signed in the ledger.
7. **Tell the Data Protection Board** if the notification or the Rules then require it (check at the time).

### 2.4 — The monthly compliance review (PRD FR-99)

Once a month the breach owner (interim: Solo Builder) works through this list and adds ONE dated row to the log table below. Nothing is
written to `.decision-log.md` unless something changed.

1. **Open incidents and clocks** — on the breach list page: any open incident, any "Board report overdue".
2. **Signals to assess** — any failed, unacknowledged audit-chain check not yet tied to an incident.
3. **The Gazette** — search the e-Gazette and the Ministry's notifications for: (a) an amendment to DPDP Rules 2025 Rule 1 (the
   commencement periods); (b) any notification under s.10 naming a Significant Data Fiduciary or a class; (c) any corrigendum or
   amendment touching Rule 7. Record what was searched and how — a search that finds nothing is "none found", never "none exists".
4. **The Board** — is the Data Protection Board functional, and how is an intimation filed (portal, address)? Record the route in the
   log so the breach runbook's step 7 has a current answer.
5. **Members on record** — read the "Monthly review" panel: the trust-wide total, the number of Pariwars, the count per state.
   ⚠ This is an input, not a threshold and not an alert. It counts members only. It leaves out people who are not members but whose
   data the Trust holds: nominees, known people, claim contacts, workplace requests, **field workers** (`field_workers` — name and
   mobile) and **the memorial family list** (`memorial_submissions.kinship_ciphertext`).
6. **The SDF watch** — architecture §2.12's named triggers: a member-base milestone, any inclusion of biometric data, a regulatory
   threshold being published. If one has happened, tell the Trustee Panel and counsel.
7. **Gates and counsel** — the status of launch-gate Rows 8 and 53; whether counsel has returned on the breach questions (CQ1–CQ5).
8. **The DPIA owner** — a Data Protection Impact Assessment is required by law only of a Significant Data Fiduciary (Rule 13), but
   architecture §2.12 asks that its owner be identified before launch. The owner is the breach owner's role — the person is
   `[PENDING PQ1]`. The DPIA itself lives in the Trust's governance documentation, not in this repository.

**Review log** (one row per month; never edit an earlier row):

| Date | Reviewer | Open / overdue incidents | Gazette: what was searched, what was found | Board functional? filing route | Members on record (total / Pariwars) | SDF trigger? | Rows 8 / 53; counsel | Changes made |
|---|---|---|---|---|---|---|---|---|
| | | | | | | | | |

## 3. Rollback procedure

- **An appointment that must end** (the officer resigns, is unavailable, or a conflict is found): the Panel records a new decision
  naming the replacement or the stand-in; steps 2–6 of 2.3 are repeated for the new person; the earlier decision is not edited. Until
  a replacement is recorded, the stand-in named at the appointment acts.
- **A contact published in error:** publish the correction at once in the same places, and record it at Row 8.
- **A monthly review missed:** run it when noticed and say in the row that the month before was missed. ⛔ Do not back-fill a row for a
  review that did not happen.

## 4. Verification checks

- [ ] (Appointment) A Trustee-ratified decision names the officer, the contact, the start date and the stand-in.
- [ ] (Appointment) The `dpo-contact-path` envelope is sealed; the contact is published in the app and on the website; the private legal texts no longer carry a placeholder.
- [ ] (Appointment) Launch-gate Rows 8 and 53 carry dated lines; the runbooks are re-signed.
- [ ] (Monthly) The log table has a row for the current month, with every column filled — "none found (how searched)" where nothing was found.
- [ ] (Monthly) No incident shows "Board report overdue" without an entry that explains it.

If any check fails, escalate per §5.

## 5. Contact escalation list

- **Primary:** the breach owner — `[PENDING PQ1]` (interim: Solo Builder).
- **Secondary:** Trustee Panel chair on rota.
- **Legal:** counsel `lc-1` (`docs/legal-counsel-engagement/counsel-roster.md`) — engaged; not yet asked about a DPO, breach reporting or SDF status.
- **Trustee escalation:** an SDF notification, a commencement change, or a missed appointment window goes to the Trustee Panel at once.

---

## Changelog

| Date | git SHA | Author | Material edit? | Re-sign required? | Ledger entry |
|---|---|---|---|---|---|
| 2026-11-20 | (this commit) | Solo Builder (Story 14.3) | yes (initial) | yes (≥2 trustees) — not yet signed | none yet |
