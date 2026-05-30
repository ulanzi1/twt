# Activation Procedure — Backup Engineer

> **Status:** drafted
> **Owner role:** Trustee Panel chair (authorizer; never the backup engineer themselves); Backup Engineer (executor under trustee authorization); Solo Builder (silent under bus-factor + activation-scenario + comprehension-administration modes per bus-factor simulation discipline); Legal Counsel per Story 0.13 (contract-scope question escalation)
> **Architectural authority:** architecture §5.10 (backup engineer access posture — read-only default; write/admin per-action approval; break-glass path with audit + paging); architecture §1.5 (audit-log integrity); architecture Cross-Cutting #2 (audit-line emission); architecture Cross-Cutting #9 (staff-fallback at every node); architecture §2.10a (audit-mirror separation); architecture §Enforcement Tiers Tier C protocol (lines 4901-4929); architecture §Control-Demonstration Schedule (Two-person approval workflow activates with A-13); AR-67; Story 0.6 AC-2; Story 0.5 AC-3; Story 0.1 AC-4

---

> **Structural-invariant block.** Activation is a **trustee-authorized event**, never a self-initiated one — the backup engineer does NOT activate themselves; the Trustee Panel chair (or trustee-quorum substitute under Story 0.2 path) records the activation in `.decision-log.md` first. The procedure is the trustee's reference; the engineer's reference is `onboarding-checklist.md` segment (d) bus-factor briefing + `../knowledge-transfer/on-call-playbook.md`. The procedure does NOT replace the per-task runbooks in `../runbooks/`; it routes an activation event to the right runbook OR ADR slot OR escalation path.

---

## §1. Prerequisites

Preconditions that must hold before any activation procedure begins. Cite framework + architecture for non-obvious prerequisites.

- **Signed contract on file** per `contract-template.md` §12 ratification path (Story 0.6 Task 10).
- **Onboarding complete** per `onboarding-checklist.md` §4 verification checks (Story 0.6 Task 11) — including comprehension administration met per Story 0.5 AC-3.
- **IAM grant active** per `access-grant-procedure.md` §4 verification checks.
- **Engineer-roster row in active state** — `engineer-roster.md` row status is `active` (or `surge-engaged` if previously activated, transitioning to a new event).
- **Activation trigger identified** — see §2 for the trigger taxonomy.

`[deferred ADR — placeholder procedure]` The activation paging surface integration (which paging SaaS routes activation requests) is deferred per architecture §5.10 (operations-policy + ADR territory tracked in `../knowledge-transfer/adr-index.md` Section H). Until the ADR lands, the interim activation request mechanism is: Trustee Panel chair direct contact (phone + email per the contact escalation list) → trustee-chair-acknowledgment confirmation in writing → `.decision-log.md` `[CONTINUITY]` entry per §2 activation-mode-specific step.

## §2. Step-by-step activation procedure

Five activation modes are defined, mapping to `scope-of-work.md` §1–§4 + Story 0.6 AC-2 activation-scenario:

### §2.1 Daily-ops activation (quarterly cadence trigger)

**Trigger:** Quarterly cadence event (capacity-review per architecture §5.6 + §3181; threat-actor inventory per §2.1; access-review per §Control-Demonstration Schedule; friction-budget review).

**Procedure:**

1. Trustee Panel chair (or delegated trustee) schedules the cadence event with Solo Builder + backup engineer attendance.
2. Trustee chair confirms cadence-engagement in `backup-engineer-ledger.md` "Activation event log" pre-event row (or "Periodic re-attestation log" depending on cadence-specific record per `README.md` §6).
3. Backup engineer participates in the named review per `scope-of-work.md` §1; contributes observations + reviews per the review's scope.
4. Engagement output (review notes, recommendations, drift findings) logged in the respective review's record + cross-referenced from `backup-engineer-ledger.md` "Periodic re-attestation log".
5. No audit-line emission specific to daily-ops mode beyond the read-access audit logs (per scope-of-work §1 audit-line emission obligation).

**Verification check:** Cadence event occurred per schedule; ledger row populated with attendee list + cadence-output reference.

### §2.2 Surge activation (Solo Builder request)

**Trigger:** Solo Builder requests parallel work on a named scope per `scope-of-work.md` §2 (bug investigation, OCR-parity issue, parser update, observability tuning, ADR drafting collaboration, runbook revision, etc.).

**Procedure:**

1. **Request submission:** Solo Builder requests via direct contact (preferred) OR via paging surface (if Solo-Builder-side issue prevents direct contact). Request specifies:
   - Scope (named work item with concrete acceptance criteria);
   - Estimated duration;
   - Per-hour billable rate confirmation per contract §4;
   - Solo Builder availability for co-sign during surge.
2. **Solo Builder co-signs the surge engagement** in `backup-engineer-ledger.md` "Surge engagement log" pre-event row.
3. **Engineer acknowledges per 4-hour SLA** per contract §8 (response-time SLA: 4 business hours from receipt of activation request).
4. **Engagement begins per 24-hour SLA** per contract §8.
5. **Per-action write/admin requires Solo Builder co-sign** during surge per `access-grant-procedure.md` §2.7 + `scope-of-work.md` §2. Co-sign mechanism is per-action (not blanket); example: surge engagement to update bank-parser allowlist requires Solo Builder co-sign on each commit.
6. **Audit-line emission per action** per scope-of-work §2 audit-line emission obligation: `{engagement_mode: "surge", request_id, requesting_actor: "solo_builder" | "trustee_panel", scoped_action, co_sign_actor: "solo_builder", co_sign_reference}`.
7. **Engagement closure:** Engineer reports completion to Solo Builder + trustee facilitator; surge engagement log row updated with: completion time + actions taken + audit-line references + billing-event reference; per-hour billing reconciled per contract §4 invoicing cadence.

**Verification check:** Surge engagement log row populated with completion + audit-line references; commits attributed to engineer with Solo Builder co-sign present; billing event invoiced within 7 days of closure per contract §4.

### §2.3 Bus-factor activation (Solo Builder unreachable >7 days OR trustee-declared incapacitation)

**Trigger:** One of:
- Solo Builder unreachable >7 days per PRD §9.1.1 paragraph 4 (the architectural threshold);
- Trustee-declared incapacitation (Solo Builder reachable in principle but trustee-declared unfit for engineering decisions — medical, conflict-of-interest, etc.);
- Bus-factor activation is **always trustee-authorized** per the structural-invariant block.

**Procedure:**

1. **Paging:** Trustee Panel chair (or delegated trustee) initiates via `../knowledge-transfer/on-call-playbook.md` §5 escalation list → backup engineer's primary contact per `engineer-roster.md`.
   - If primary contact unreachable: secondary contact per roster;
   - If both unreachable: substitute engineer per Story 0.1 AC-4 path 2 model + trustee authorization in `.decision-log.md`;
   - Paging surface mechanism is per `[deferred ADR]` in §1 — interim is trustee-chair direct contact.
2. **Trustee chair confirms bus-factor activation in `.decision-log.md`** `[CONTINUITY]` entry per the Story 0.1 + 0.2 + 0.3 + 0.4 + 0.5 + 0.6 supersession schema. Entry cites: activation trigger (which condition was met); estimated duration; engineer identity; scope (full bus-factor vs. scope-narrowed); audit-mirror credential retrieval needed (yes/no).
3. **Backup engineer acknowledges per 4-hour SLA** per contract §8 + scope-of-work §3 + `engineer-roster.md` row status flips to `bus-factor-activated`.
4. **Bus-factor-silence discipline activates for Solo Builder** per Story 0.1 AC-4 + Story 0.2 AC-3 + Story 0.3 AC-2 + Story 0.4 AC-2 + Story 0.5 AC-3 — Solo Builder is silent including side channels; the engineer accesses repo + KT pack + runbooks + escrow framework documents read-only.
5. **Write/admin actions queue for per-action trustee co-sign** per architecture §5.10 break-glass path. Per-action co-sign mechanism is operations-policy territory per `[deferred ADR]` in §1; interim is written `.decision-log.md` `[CONTINUITY]` entry per write/admin action citing trustee approver + action + timestamp + post-action audit-line reference.
6. **Audit-mirror credential retrieval becomes available** per the §2.10a structural fix per `access-grant-procedure.md` §2.6 + Story 0.2 sealing-procedure §1; trustee + engineer jointly retrieve credentials from escrow envelope under quorum-open; audit-mirror access is per-activation-event scoped, not persistent.
7. **Engineer triages incidents per on-call playbook 13 incident classes** + executes per-task runbooks as needed; every action emits an audit line per scope-of-work §3 audit-line emission obligation: `{engagement_mode: "bus-factor", activation_event_id, action_class, scoped_resource, trustee_co_sign_actor, co_sign_reference, paging_event_id, post_action_verification_check_result}`.
8. **Surge billing applies** for the duration of bus-factor activation per contract §3 + §4 (bus-factor activation is continuously billable at the surge rate).
9. **Closure (deactivation condition depends on which trigger activated bus-factor):**
   - **Unreachable-trigger path** (Solo Builder unreachable >7 days): deactivation when Trustee Panel confirms Solo Builder is reachable AND operationally capable of resuming engineering duties. Mere contact without operational capacity does not deactivate — the Trustee Panel makes the capability determination.
   - **Incapacitation-trigger path** (trustee-declared incapacitation): deactivation when the Trustee Panel (≥2 trustees, per declaration quorum) records a `.decision-log.md` `[CONTINUITY]` entry declaring Solo Builder operationally capable of resuming. Being reachable is necessary but not sufficient; the same quorum that declared incapacitation must declare restoration.
   
   In both cases: Trustee Panel chair records bus-factor deactivation in `.decision-log.md` `[CONTINUITY]` entry → engineer hands off any in-flight work per the deactivation entry → `engineer-roster.md` row status flips back to `active` → post-mortem scheduled per `README.md` §6 on-activation cadence.

**Verification check:** All write/admin actions during bus-factor have trustee co-sign reference + audit-line reference; bus-factor-silence discipline verified by trustee facilitator (Solo Builder did not respond to engineer questions); deactivation logged in ledger; post-mortem completed within 30 days.

### §2.4 Activation-scenario exercise (rehearsal per Story 0.6 AC-2)

**Trigger:** Trustee Panel chair schedules the activation-scenario test per Story 0.6 AC-2 + Story 0.6 Task 12 (rehearsal, NOT real bus-factor — Solo Builder remains reachable but observes bus-factor-silence discipline).

**Procedure:**

1. **Pre-event preparation:**
   - Trustee Panel selects target non-production operational task from Story 0.1 runbook inventory. Candidate tasks per Story 0.6 AC-2 Given:
     - Deploy a documentation-only change to staging per `../runbooks/deploy.md`;
     - Execute the audit-log integrity verification per `../runbooks/audit-log-integrity-verification.md` against staging audit-mirror (**recommended default** per Open Question #5 resolution — exercises the most KT pack + runbook surfaces in one task);
     - Execute the RBAC seed reset per `../runbooks/rbac-seed-reset.md` against dev;
     - Execute the multi-Pariwar provisioning rehearsal per `../runbooks/multi-pariwar-provisioning.md` against staging.
   - Selection logged in `backup-engineer-ledger.md` "Activation event log" pre-event row.
2. **Trustee Panel chair triggers the exercise** per `.decision-log.md` `[CONTINUITY]` entry citing: exercise date + target task + selected runbook + facilitating trustee + bus-factor-silence engagement (Solo Builder reachable but silent for the duration).
3. **Solo Builder confirms bus-factor-silence engagement** — no consultation permitted for the duration; side channels included; the trustee facilitator observes.
4. **Engineer acknowledges per 4-hour SLA** per contract §8.
5. **Engineer executes the selected non-production operational task using ONLY** the KT pack (`../knowledge-transfer/`) + runbooks (`../runbooks/`) + activation-procedure (this file). No consultation with Solo Builder permitted for the duration of the exercise. **Safety exception:** if the engineer reaches a genuinely unsafe decision point (risk of irreversible production impact, data loss, or security breach) that the runbooks and KT pack cannot resolve, the engineer pauses execution and pages the Trustee Panel chair (NOT Solo Builder). The trustee either authorizes continuation under per-action co-sign OR halts the exercise. A paused-for-safety event is logged as a gap-list row and does NOT count as a bus-factor-silence breach (it is an escalation to the trustee, not to Solo Builder). The gap signals a runbook or KT pack insufficiency requiring remediation before re-rehearsal.
6. **Completion window: 48 hours per Story 0.6 AC-2** (4-hour acknowledgment + 24-hour engagement-start + task-specific execution window per the originating runbook).
7. **Gap-list recording discipline** (inherited from Story 0.5 Task 9): every question the engineer asks Solo Builder is a gap; every runbook step that required consultation is a gap; every KT pack reference that was insufficient is a gap. Gaps cite the runbook step + the KT pack section + the rationale + the proposed remediation.
8. **Exercise outcome logged in BOTH:**
   - `backup-engineer-ledger.md` "Activation event log" with: activation date + exercising trustee + backup engineer identity + selected task + runbook git SHA + start time + completion time + bus-factor-silence verification + gap list + remediation plan per gap + Story 0.1 AC-4 path 1 discharge marker.
   - `../runbooks/operational-readiness-ledger.md` "Execution-validation log" — this discharges Story 0.1 AC-4 path 1. The Story 0.1 AC-4 row carries: runbook file + git SHA + executor identity (backup engineer per Story 0.6 + named engineer per `engineer-roster.md`) + executor role + date + target environment + outcome + linked ledger re-sign (if gaps surface a runbook revision).
9. **Closure-language precision** per [[feedback_closure_language_precision]]:
   - Successful exercise (task completed within 48 hours + no `unanswerable-from-runbook` gaps) → AC-2 closes as **Closed by [edit]** + Story 0.1 AC-4 path 1 closes as **Closed by [edit]**.
   - Successful exercise with gaps → AC-2 closes as **Provisionally closed; full closure pending gap remediation per the Pack-revision log**.
   - Unsuccessful exercise (task not completed within 48 hours OR bus-factor-silence broken) → AC-2 does NOT close; re-rehearsal scheduled after framework / runbook revisions.
10. **30-day-takeover joint-discharge full closure trigger** — once AC-2 closes AND Stories 0.3 + 0.4 + 0.5 + 0.6 conditions all close, a follow-up `.decision-log.md` `[CONTINUITY]` entry records the joint-discharge achievement per the eight-condition union.

**Verification check:** Activation event log row populated with completion + bus-factor-silence verification + gap list; operational-readiness-ledger execution-validation log row populated; Story 0.1 AC-4 path 1 discharge marker recorded.

### §2.5 Comprehension-administration session (Story 0.5 Task 9 procedure)

**Trigger:** Story 0.5 Task 9 administration event per `scope-of-work.md` §4:
- First administration as part of `onboarding-checklist.md` §2(e) onboarding session (Story 0.6 Task 11 closure);
- Annual re-administration per Story 0.5 README §6 cadence;
- Post-pack-revision re-administration per Story 0.5 README §6;
- Post-failed-administration re-administration per Story 0.5 Task 10.

**Procedure:**

1. **Trustee facilitator schedules the administration** per Story 0.5 Task 9 procedure. The facilitator MUST be a trustee (NOT Solo Builder; bus-factor simulation discipline requires Solo Builder silent for the duration).
2. **Backup engineer reads the KT pack** (`../knowledge-transfer/` — README + adr-index + niyamavali-fr-mapping + deployment-topology + on-call-playbook + third-party-dependency-inventory) **cold** (no Solo Builder consultation; bus-factor simulation discipline applies).
3. **Backup engineer completes the comprehension questionnaire** (`../knowledge-transfer/comprehension-questionnaire.md`) under timed conditions (≤4 hours recommended per Story 0.5 AC-3).
4. **Trustee facilitator scores** per `../knowledge-transfer/comprehension-questionnaire-answer-key.md` rubric.
5. **80% threshold computed** as `(correct × 1.0 + partial × 0.5) / 30 ≥ 0.80` per Story 0.5 AC-3.
6. **Administration logged in BOTH:**
   - `../knowledge-transfer/kt-pack-ledger.md` "Comprehension administration log" (primary per Story 0.5 ownership) with: administering trustee + backup engineer identity + administration date + time taken + per-section score breakdown + gap list + remediation plan per gap + joint-discharge contribution + re-administration schedule.
   - `backup-engineer-ledger.md` "Comprehension administration log" (cross-reference).
7. **Closure-language precision** per [[feedback_closure_language_precision]] — as `onboarding-checklist.md` §2(e) closure rules.

**Verification check:** Administration row populated in both ledgers; 80% threshold met; gap-list rows routed to Story 0.5 Task 10 pack-revision if `unanswerable-from-pack` gaps surfaced.

## §3. Rollback per failure mode

What to do when activation procedure fails partway or encounters an unexpected condition.

### 3.1 Backup engineer unreachable at activation

1. **Route to substitute engineer per Story 0.1 AC-4 path 2** with trustee authorization recorded in `.decision-log.md` `[CONTINUITY]` entry.
2. Substitute engineer per the Story 0.1 AC-4 path 2 substitute-engineer model: trustee-authorized non-Solo-Builder principal; access scoped per-event (not persistent); audit-line emission per the substitute engineer's actions.
3. Backup engineer's unreachability logged in `backup-engineer-ledger.md` "Activation event log" with: paging-event reference + unreachability duration + escalation reference; may inform SLA breach handling per contract §8.

### 3.2 Engineer encounters a write/admin requirement without reachable trustee

1. **Pause execution** — do NOT proceed with the write/admin action without per-action trustee co-sign per `access-grant-procedure.md` §2.7 + `scope-of-work.md` §3.
2. **Page Trustee Panel chair** via the escalation list; document the pause in `backup-engineer-ledger.md` "Activation event log" gap row.
3. **If no trustee reachable within 4 hours:** invoke the quorum-unavailable fallback path per `README.md` §5 (90-day emergency single-trustee authorization); record as gap-list row + escalation entry. Note: the `README.md` §5 fallback governs here — Story 0.2 sealing-procedure §1 does not contain a quorum-unavailable fallback path.
4. **Resume execution only after trustee co-sign is recorded** per `.decision-log.md` `[CONTINUITY]` entry citing the trustee approver + action + timestamp.

### 3.3 Activation triggered erroneously

1. **Trustee-initiated stand-down** with audit-line emission + ledger entry per architecture Cross-Cutting #2.
2. Trustee Panel chair records stand-down in `.decision-log.md` `[CONTINUITY]` entry per the supersession schema; entry cites: original activation entry being superseded + stand-down reason + post-action verification check result (any in-flight actions reversed or completed safely).
3. `engineer-roster.md` row status flipped back to prior state (e.g., `bus-factor-activated` → `active`).
4. Post-mortem scheduled to investigate the erroneous trigger source + framework-revision triggers per `README.md` §6 on-activation cadence.

### 3.4 Bus-factor activation reveals a runbook insufficient for execution

1. **Engineer pauses execution** at the insufficient step; logs gap in `backup-engineer-ledger.md` "Activation event log" gap-list row citing: runbook + step + insufficiency rationale.
2. **Trustee chair authorizes one of:**
   - Engineer improvises with trustee per-action co-sign per scope-of-work §3 (recorded as `unanswerable-from-runbook` gap for post-event runbook revision);
   - Engineer escalates to Solo Builder under exception (recorded as bus-factor-silence-broken gap; Solo Builder's involvement logged; the exception is itself a gap signal for framework drift detection);
   - Engineer routes to substitute path per §3.1 if scope is beyond contracted scope-of-work.
3. **Post-event runbook revision** scheduled per `../runbooks/operational-readiness-ledger.md` re-sign protocol (≥2-trustee re-attestation for material edits).

## §4. Verification checks

Per engagement mode (each mode has its own deterministic pass/fail signal):

- [ ] **Daily-ops:** Activity audit log shows backup engineer access pattern consistent with quarterly cadence per `gcloud logging read` (specific command operations-policy territory; not inlined). Cadence-event record references the engineer's contribution.
- [ ] **Surge:** Per-request scope-of-work attestation in `backup-engineer-ledger.md` Surge engagement log matches actual work performed (cross-check via git log + audit log); Solo Builder co-sign reference present per action.
- [ ] **Bus-factor:** At least one non-production operational task completed within 48 hours per AC-2 + on-call playbook §2 incident-class triage steps executed per the runbook authority; trustee co-sign reference present per write/admin action; bus-factor-silence verified.
- [ ] **Comprehension administration:** 80% threshold per Story 0.5 AC-3 (computed in `kt-pack-ledger.md` Comprehension administration log row); pack-revision per Story 0.5 Task 10 for `unanswerable-from-pack` gaps triggered if applicable.
- [ ] **Activation-scenario:** 48-hour completion + no `unanswerable-from-runbook` gaps + Story 0.1 AC-4 path 1 execution row appended to `operational-readiness-ledger.md`.

If any check fails for the relevant mode, do not declare success; escalate per §5.

## §5. Contact escalation list

Roles, not individuals where possible. Specific contacts live in operations policy.

- **Primary:** Trustee Panel chair (or delegated trustee with activation-authorization authority).
- **Secondary:** Solo Builder if reachable (surge mode); OR silent (bus-factor + activation-scenario + comprehension administration modes per bus-factor simulation discipline).
- **Tertiary (contract-scope questions; NDA questions):** Legal Counsel per Story 0.13.
- **Substitute engineer** per Story 0.1 AC-4 path 2 model — if backup engineer unreachable per §3.1.
- **GCP support** — out-of-band per operations policy; for IAM-grant action coordination if needed during write/admin escalation.
- **Trustee Panel chair on rota** when operation affects trustee-relevant invariants (audit-mirror credential retrieval; KEK-roots access — though scope-of-work §5 exclusions forbid the latter; production-promotion; etc.).

---

## Cross-references

- `README.md` §4 invariants — Activation is trustee-authorized never self-initiated (invariant 3); scope-of-work exclusions are bounded (invariant 4); access posture is read-only by default (invariant 8)
- `README.md` §6 — on-activation post-mortem cadence; quarterly cadence triggers daily-ops mode
- `README.md` §10 — 30-day-takeover joint-discharge anchor (Story 0.6 AC-2 contributes the exercised leg)
- `contract-template.md` §8 — response-time SLA referenced in §2 procedures
- `scope-of-work.md` §1 (daily-ops), §2 (surge), §3 (bus-factor), §4 (comprehension administration), §5 (exclusions binding regardless of mode)
- `access-grant-procedure.md` §2.6 (audit-mirror access path under bus-factor), §2.7 (write/admin per-action only)
- `onboarding-checklist.md` §2(d) bus-factor briefing + §2(e) on-call playbook walkthrough — informs engineer's bus-factor execution
- `engineer-roster.md` — status column flips per activation event; primary + secondary contact for paging
- `backup-engineer-ledger.md` — "Activation event log" + "Surge engagement log" + "Comprehension administration log" + "Periodic re-attestation log"
- `../knowledge-transfer/on-call-playbook.md` — 13 incident classes the engineer triages during bus-factor; §5 escalation list
- `../knowledge-transfer/kt-pack-ledger.md` "Comprehension administration log" — primary record per Story 0.5 ownership
- `../knowledge-transfer/adr-index.md` Section H — `[deferred ADR]` slots for this procedure
- `../runbooks/_template.md` — five-section runbook template followed verbatim by this procedure
- `../runbooks/operational-readiness-ledger.md` "Execution-validation log" — Story 0.1 AC-4 path 1 discharge surface for §2.4 activation-scenario closure
- `../runbooks/deploy.md` + `audit-log-integrity-verification.md` + `rbac-seed-reset.md` + `multi-pariwar-provisioning.md` — candidate target tasks for §2.4 activation-scenario
- `../escrow/sealing-procedure.md` §1 — audit-mirror credential retrieval under bus-factor + §5.1 + §5.3 backup-engineer-as-non-Solo-Builder-principal
- `../escrow/code-escrow/restoration-procedure.md` §2.5b + §3.x — backup engineer as primary executor for restoration drills under §2.3 bus-factor or §2.4 activation-scenario
- `../degradation-policy/table-top-exercise.md` — backup engineer as preferred facilitator under §2.3 bus-factor activation
- `../../.decision-log.md` — Decision 006 + per-activation `[CONTINUITY]` entries per the supersession schema

## Changelog

| Date | git SHA | Author | Material edit? | Re-sign required? | Ledger entry |
|---|---|---|---|---|---|
| 2026-05-30 | n/a (pre-git at author-commit) | Solo Builder (BigDev) via dev-story agent | initial author-commit | yes (≥2 trustees per Task 8) | `backup-engineer-ledger.md` Framework-commit record row |
