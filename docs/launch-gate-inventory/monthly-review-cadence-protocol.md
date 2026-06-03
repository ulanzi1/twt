# Monthly-Review Cadence Protocol

**Authority:** Story 0.15 AC-1 wording "inventory is reviewed in the standing trustee-panel meeting at least monthly until all entries close or defer-with-ADR" + architecture §Control-Demonstration-Schedule lines 4942-4959 "first exercise + review cadence" pattern + [[feedback_architecture_vs_adr_boundary]] Enforcement Tier C annual re-attestation cadence.

## §1 — Authority cites

- **AC-1 wording:** "inventory is reviewed in the standing trustee-panel meeting at least monthly until all entries close or defer-with-ADR" — monthly cadence is the floor; standing-Trustee-Panel-meeting integration is the format.
- **Architecture §Control-Demonstration-Schedule lines 4942-4959:** "Pattern is 'first exercise + review cadence'; implementation calibrates within the pattern, not against exact operational schedules." This protocol mirrors the control-schedule pattern — first exercise = Task 9 first monthly review; review cadence = monthly until close-or-defer.
- **[[feedback_architecture_vs_adr_boundary]] Enforcement Tier C:** annual re-attestation cadence; closed-row evidence still holds; accepted-risk rows still valid; deferred-per-named-criteria predicates still operative.

## §2 — Meeting agenda template

Each monthly review covers the following standing agenda items in order:

### 1. Open-row triage

- For each `current_status = open` row of `inventory-roster.md`:
  - Status against `target_date_or_trigger` per `target-date-rationale-template.md` — on-track / at-risk / missed.
  - Predecessor-dependency check — have all `dependency_predecessors` closed?
  - Successor-impact check — what Epic-1+ work is blocked by this row's remaining open status?
- Outcome: surface at-risk rows for Trustee Panel discussion; flag missed-target rows for §3 escalation review item.

### 2. Missed-target escalation review

- For each row that missed `target_date` since previous review (per `escalation-protocol.md` §1 trigger 1):
  - Append `engagement-ledger.md` §6 per-row escalation log entry per `escalation-protocol.md` §4 schema.
  - Trustee Panel decides escalation outcome per `escalation-protocol.md` §3 vocabulary.
  - Update row `missed_target_escalation_log` field with outcome + rationale + next-review-date.
- Outcome: row remains `open` with revised target-date OR transitions to architecture-allowed disposition per outcome vocabulary.

### 3. Newly-elevated conditional rows

- For each `current_status = conditional-escalation-pending-predicate` row (Rows 12-14 + any post-author-commit elevations):
  - Trustee Panel checks whether predicate (per row `closure_criteria` verbatim text) has materialized since previous review.
  - If materialized → row flips to `open` + Trustee Panel ratification + substantive closure-criteria authoring; record elevation in `engagement-ledger.md` §8 conditional-row elevation log.
  - If not materialized → row remains in `conditional-escalation-pending-predicate` state; no log entry required.

### 4. Closure-event ratifications

- For each per-row closure event since previous review (per `escalation-protocol.md` §3 outcomes leading to `current_status` flip):
  - Verify closure-evidence-link integrity per `closure-criteria-rubric.md` §3 testable signals (link resolves; linked artifact in committed/ratified state; conjunction holds for multi-link rows per §6).
  - ≥2-trustee ratification of per-row closure event recorded as `.decision-log.md` Decision 2026-06-03-015 per-row supersession entry with `gate_id` + `closure_date` + `ratifying_trustees` ≥2.
  - Engagement-ledger §5 per-row closure log entry appended.

### 5. Revision proposals

- Per-row `target_date` / `closure_criteria` / `owner` / `disposition` revisions surfaced by trustees or Solo Builder.
- Outcome per `escalation-protocol.md` §3 vocabulary (typically `revise-target-with-rationale`); record in `engagement-ledger.md` §6.

### 6. Next-meeting scheduling

- Confirm next monthly review date per §4 cadence.
- Flag any agenda items requiring Legal Counsel attendance (Rows 3, 8, 9, 10 scope-relevant per §3 quorum) and pre-notify Legal Counsel.

## §3 — Quorum

- **Trustee quorum:** ≥2-trustee per Story 0.15 AC-1 wording "signed off by ≥2 trustees" — uniform across inventory-ratification (Task 8) + per-row-closure (Task 10 ongoing) + final sign-off (Task 11).
- **Solo Builder attendance:** Solo Builder presents the inventory + status updates + escalation surface; Solo Builder is non-voting at ratification events per the trustee-governance discipline.
- **Legal Counsel attendance:** required for scope-relevant rows on agenda — specifically Row 3 (Edge/WAF DPDPA-compatibility), Row 8 (DPDPA grievance officer designation), Row 9 (FR-43A external forum destination), Row 10 (Regulatory surface sign-off). Pattern inherited from Story 0.13 standing-attendance discipline; Legal Counsel attends when these rows have open agenda items.
- **Emergency single-trustee fallback:** time-bounded 30 days per Story 0.9 D-02 + Story 0.7 README §5 precedent; second-trustee ratification within 30 days OR the closure is voided. Permitted only when documented unavailability of a second trustee prevents quorum; never used to expedite a routine closure. README §5 sign-off lifecycle commits the discipline.

## §4 — Cadence

### Monthly (default)

- **Trigger:** Inventory ratification at Task 8 closes; first monthly review held within 4 weeks of ratification.
- **Frequency:** Monthly until all `inventory-roster.md` entries reach one of the architecture-allowed dispositions per architecture line 4773 per AC-1 wording "until all entries close or defer-with-ADR".
- **Format:** Integrated with the standing Trustee Panel meeting if such a meeting exists at monthly cadence; standalone meeting otherwise. Integration vs. standalone is an Open ADR slot per `README.md` §7 item 4.

### Quarterly fallback (Tier C)

- **Trigger:** All Phase-0-discharging P0-N rows (Rows 2, 4, 5, 7 per architecture lines 4779/4781/4782/4784) reach `closed` AND only stable open-gates remain (e.g., `trust-formation-and-legal-registration` sub-row decomposition stage; `conditional-escalation-pending-predicate` rows that have not materialized). Row 6 (architecture P0-4 "Empty/Skeleton/Error Inventory") is excluded from this trigger: it is a downstream Epic 1 / Epic 11a UX deliverable with no discharging Phase-0 Story and will remain `open` through Phase 0.
- **Frequency:** Quarterly.
- **Reversion to monthly:** Any escalation event (per `escalation-protocol.md` §1 triggers) OR any predicate materialization (per Rows 12-14) OR any closure-evidence retraction triggers reversion to monthly cadence until the triggering event resolves.

### Annual re-attestation

- **Trigger:** Task 11 final sign-off closes (Phase 1 launch readiness signal armed); first annual re-attestation within 12 months + 30-day grace per `target-date-rationale-template.md` §7.
- **Frequency:** Annual.
- **Scope:** Full inventory walk-through per §7 below.

## §5 — Meeting-minutes schema

Each monthly review produces a meeting-minutes file at `docs/launch-gate-inventory/meeting-minutes/YYYY-MM-DD.md` with the following fields:

| Field | Substance |
|---|---|
| `meeting_date` | YYYY-MM-DD |
| `attending_trustees` | ≥2-trustee names; quorum check |
| `legal_counsel_attendance` | yes / no — per §3 scope-relevance |
| `open_row_count` | count of `current_status = open` rows at meeting start |
| `rows_closed` | per-row supersession entries (gate_id + prior_status + new_status + closure_evidence_link) |
| `rows_escalated` | per-row escalation log entries (gate_id + trigger + outcome + rationale) |
| `rows_newly_elevated` | conditional-row promotions (gate_id + predicate-materialization observation) |
| `revision_proposals` | per-row target/criteria/owner/disposition revisions (gate_id + revision-substance + rationale) |
| `next_meeting_date` | YYYY-MM-DD per §4 cadence |

Subdirectory `docs/launch-gate-inventory/meeting-minutes/` is created at the first monthly review (Task 9), not at Task 7 author-commit. Structure mirrors Story 0.7 + 0.13 meeting-minutes conventions.

## §6 — Emergency review triggers

Out-of-cadence emergency meetings are triggered by:

1. **Any P0 gate slipping target by >1 month** — Rows 2 (P0-3), 4 (P0-1), 5 (P0-2), 7 (P0-5) (Phase-0-discharging P0-N rows per D-02 resolution). P0 gates are on the critical path for Phase 1 launch; >1-month slippage warrants emergency triage.
2. **Closure-evidence retraction** — a previously-closed row gets reopened due to closure-evidence-link integrity failure per `closure-criteria-rubric.md` §3 testable signal 5 OR linked artifact superseded by an inconsistent supersession entry.
3. **Conditional-escalation predicate materializing for Rows 12-14** — predicate-materialization is an unscheduled trigger; emergency meeting confirms materialization + elevates row + initiates substantive closure-criteria authoring.
4. **Legal Counsel return surfacing new regulatory gate** — per Story 0.13 Task 11 trigger; new regulatory surface not in current inventory triggers emergency meeting to elevate as new row (Row 16+).
5. **Cross-Story discharge-path retreat** — a `done` Story whose closure discharges a row reverts to `in-progress` due to a downstream supersession event (e.g., Story 0.6 backup-engineer-candidate withdraws; Story 0.14 ratify-decision retracted). Row supersedes back to `open`; emergency meeting determines remediation path per `escalation-protocol.md` §1 trigger 4.

Emergency meeting follow-up: full agenda per §2; supplementary `engagement-ledger.md` §4 entry with `emergency_trigger` field cited.

## §7 — Annual re-attestation walk-through

Per [[feedback_architecture_vs_adr_boundary]] Enforcement Tier C, the annual walk-through confirms:

1. **Closed-row evidence still holds** — for each `current_status = closed` row, verify `closure_evidence_link` resolves + linked artifact is in committed/ratified state per `closure-criteria-rubric.md` §3 testable signal 5. Examples: ADR substantively populated and not superseded; runbook still operational and not retracted; contract still in force and not terminated.
2. **Accepted-risk rows still valid** — for each `current_status = accepted-risk` row, verify mitigation-plan still operative + risk-acceptance rationale still applicable. If risk-context has materially changed (e.g., a mitigation dependency was removed, a new regulatory requirement materializes that directly addresses the accepted risk), row supersedes back to `open` + Trustee Panel ratification + new closure-criteria authoring per normal monthly review protocol.
3. **Deferred-per-named-criteria predicates still operative** — for each `current_status = deferred-per-named-criteria` row, verify named-criteria specification is still substantive + reversion-trigger has not materialized. If reversion-trigger has materialized, row supersedes back to `open` + Trustee Panel ratification per §6 emergency trigger.
4. **Reframed dispositions still consistent** — for each `current_status = reframed` row, verify supersession-target gate is still operative + has not itself been reframed or closed inconsistently. If supersession-target is retracted or closed inconsistently, row supersedes back to `open` for re-disposition.
5. **Post-Task-11 predicate materializations** — for rows that reached `accepted-risk` or `deferred-per-named-criteria` via Trustee Panel disposition of conditional candidates (Rows 12-14), verify that the deferred predicate has not materialized in the preceding 12 months. Materialization triggers re-opening per §6 emergency trigger 3, even after Task 11 final sign-off.

Annual walk-through outcomes recorded in `engagement-ledger.md` §7 per-row annual re-attestation log per row.

## §8 — Cross-links

- **`inventory-roster.md`** — agenda items 1-5 (per §2) operate on roster row state.
- **`closure-criteria-rubric.md` §3** — testable signals consulted at closure-event-ratification item §2.4.
- **`closure-criteria-rubric.md` §4** — weak-closure-criteria rejection consulted at open-row triage item §2.1.
- **`target-date-rationale-template.md`** — `target_date` rationale informs at-risk assessment at open-row triage item §2.1.
- **`escalation-protocol.md`** — escalation outcomes vocabulary applied at missed-target escalation review item §2.2.
- **`engagement-ledger.md` §4** — per-monthly-review log row appended per meeting.
- **`engagement-ledger.md` §5** — per-row closure log row appended per closure event.
- **`engagement-ledger.md` §6** — per-row escalation log row appended per escalation event.
- **`engagement-ledger.md` §7** — per-row annual re-attestation log row appended per annual walk-through.
- **`engagement-ledger.md` §8** — conditional-row elevation log row appended per predicate-materialization event.
