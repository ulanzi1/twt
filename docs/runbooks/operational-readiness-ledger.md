# Operational Readiness Ledger

This ledger is the sole source of truth for runbook authority. A runbook in `docs/runbooks/` is authoritative only when this ledger records ≥2-trustee sign-off on a specific git SHA of that runbook (per Story 0.1 AC-2 / AC-3 and the README sign-off lifecycle).

Authority: Story 0.1 (epics.md) AC-2 / AC-3 / AC-4. Stored alongside the runbooks under the trustee-accessible repo, with code-escrow mirror coverage inherited from Story 0.3 once 0.3 closes (see "Mirror coverage" note below).

## Sign-off table

Each row records one sign-off event. A runbook may have multiple rows over its lifetime: initial sign-off, re-signs after material edits, etc. Do not delete rows — the ledger preserves history.

| Runbook file | git SHA at sign-off | Trustee signer | Date (YYYY-MM-DD) | Attestation note | Material edit triggering re-sign |
|---|---|---|---|---|---|
| _example_ `deploy.md` | `abc1234` | _Trustee A_ | 2026-MM-DD | "Reviewed; deploy procedure matches §5.3/§5.4. Verified manual-gate step." | initial |
| _example_ `deploy.md` | `abc1234` | _Trustee B_ | 2026-MM-DD | "Concur with Trustee A." | initial |
| _Story 0.1 sign-off rows go here once trustees review_ | | | | | |

**To-be-signed inventory (as of story implementation):**

| Runbook file | First commit SHA (post Story 0.1 implementation) | Awaiting signers |
|---|---|---|
| `deploy.md` | _filled at commit_ | ≥2 trustees |
| `rollback.md` | _filled at commit_ | ≥2 trustees |
| `secret-rotation.md` | _filled at commit_ | ≥2 trustees |
| `audit-log-integrity-verification.md` | _filled at commit_ | ≥2 trustees |
| `reconciliation-manual-intervention.md` | _filled at commit_ | ≥2 trustees |
| `rbac-seed-reset.md` | _filled at commit_ | ≥2 trustees |
| `multi-pariwar-provisioning.md` | _filled at commit_ | ≥2 trustees |

When each row receives ≥2 trustee sign-offs, move the row into the sign-off table above with the SHA at sign-off (which may differ from the first commit SHA if revisions happened between author and review).

## Execution-validation log

Per Story 0.1 AC-4, at least one runbook per topic must have a logged successful execution attempt by a non-Solo-Builder engineer under simulated bus-factor activation. Each row records one execution event. Gaps discovered during execution trigger the AC-3 re-sign protocol (fix → re-sign → re-execute).

| Runbook file | Runbook git SHA at execution | Executor identity | Executor role | Date | Target environment | Outcome (success / gaps) | Linked ledger re-sign (if gaps) |
|---|---|---|---|---|---|---|---|
| _Story 0.1 execution rows go here once Task 5 executes_ | | | | | | | |

**Execution path selected for AC-4 closure:**

- [ ] **Path 1 (sequence):** Story 0.6 closes first; backup engineer executes.
- [ ] **Path 2 (table-top substitute):** Trustee Panel authorizes a substitute engineer for table-top validation; AC-4 provisionally closes; full closure deferred to backup-engineer re-execution after Story 0.6.

Whichever path is selected, record the authorization in `.decision-log.md` and check the box above. Leaving both unchecked means AC-4 is unresolved.

## Mirror coverage

The trustee-accessible storage requirement (Story 0.1 AC-3) is satisfied via the primary git repository (the canonical location of this ledger and all runbooks). Story 0.3 (Code Escrow Auto-Mirror Pipeline Live) extends that coverage to a trustee-controlled mirror destination on every release-branch push.

- **As of Story 0.3 author-commit (`.decision-log.md` Decision 2026-05-29-003):** the code-escrow framework + mirror workflow + restoration procedures are authored. Mirror destination is `pending-ADR` per Story 0.3 Task 7 (`_AWAITING EXTERNAL ACTION_`). Full mirror coverage flips to "verified" when Story 0.3 Tasks 7–9 close per AC-1.
- **Status flips:** When Story 0.3 reaches `verified` (Tasks 7–9 closed; ≥2-trustee read-access verification recorded), this section is updated with the mirror destination name, the verification method (cross-link to `docs/escrow/code-escrow/code-escrow-ledger.md` "Read-access verification log"), and the Story 0.3 final decision-log entry.
- **Cross-link:** `docs/escrow/code-escrow/code-escrow-ledger.md` is the authoritative record for mirror coverage state; this section's status is a derived view.

## Degradation policy coverage

The trust's operational readiness includes a per-surface degradation policy for the "Solo Builder unavailable >7 days" scenario per PRD §9.1.1 paragraph 4 + architecture Cross-Cutting #20 + #9. Story 0.4 (Per-Surface Degradation Policy Authored) authors the framework, the per-surface inventory, the five-channel comms templates, and the table-top-exercise runbook.

- **As of Story 0.4 author-commit (`.decision-log.md` Decision 2026-05-29-004):** the per-surface degradation-policy framework + comms templates + table-top-exercise runbook are authored. ≥2-trustee sign-off is `pending` per Story 0.4 Task 7 (`_AWAITING EXTERNAL ACTION_`); legal-counsel review of comms templates is `pending` per Story 0.13 (the templates carry the PENDING LEGAL REVIEW marker until Story 0.13 returns per-template). Full coverage flips to "verified" when Story 0.4 Tasks 7 + 8 close AND Story 0.13 returns with counsel-ratified templates.
- **Cross-link:** `docs/degradation-policy/degradation-policy-ledger.md` is the authoritative record for degradation-policy coverage state; this section's status is a derived view.
- **30-day takeover joint-discharge:** Story 0.4 AC-1 + AC-2 jointly discharge the PRD §9.1.1 + AR-67 30-day takeover property alongside Story 0.3 AC-1 + AC-2 + Story 0.5 + Story 0.6. The joint-discharge anchor is tracked in `docs/degradation-policy/degradation-policy-ledger.md` Table-top exercise log header.

## KT pack coverage

The trust's operational readiness includes a Knowledge-Transfer pack covering ADRs + Niyamavali → FR mapping + deployment topology + on-call playbook + third-party dependency inventory + comprehension questionnaire per PRD §9.1.1 paragraph 5 + AR-67 + architecture Cross-Cutting #20. Story 0.5 (Knowledge-Transfer Documentation Pack Compiled) authors the framework + the eight component documents + the `docs/adr/` scaffold.

- **As of Story 0.5 author-commit (`.decision-log.md` Decision 2026-05-30-005):** the KT pack framework + the five PRD §9.1.1 mandated components (ADR-index with 64 deferred-ADR slots; Niyamavali → FR mapping with 14 clause rows; deployment-topology reader's map; on-call-playbook meta-playbook; third-party-dependency-inventory with 30 rows) + the comprehension-questionnaire (30 questions) + the answer key + the kt-pack-ledger are authored at `docs/knowledge-transfer/`. The `docs/adr/` directory is also scaffolded (README + template) per Decision 2026-05-29-003 Open Follow-up #6 closure. ≥2-trustee sign-off is `pending` per Story 0.5 Task 8 (`_AWAITING EXTERNAL ACTION_`); comprehension-questionnaire administration to the contracted backup engineer is `pending` per Story 0.5 Task 9 (Story 0.6 closure gate). Full coverage flips to "verified" when Story 0.5 Tasks 8 + 9 + 10 close.
- **Cross-link:** `docs/knowledge-transfer/kt-pack-ledger.md` is the authoritative record for KT pack coverage state; this section's status is a derived view.
- **30-day takeover joint-discharge:** Story 0.5 AC-1 + AC-2 + AC-3 jointly discharge the PRD §9.1.1 + AR-67 30-day takeover property alongside Story 0.3 AC-1 + AC-2 + Story 0.4 AC-1 + AC-2 + Story 0.6. The joint-discharge anchor is tracked in `docs/knowledge-transfer/kt-pack-ledger.md` Comprehension administration log header.

## Backup-engineer framework coverage

The trust's operational readiness includes a named contracted backup engineer with read-access + ₹15–25k/month retainer per A-13 + AR-67 + PRD §9.1.1 paragraph 6. Story 0.6 (Backup Engineer Contracted with Trustee Authorization) authors the framework at `docs/backup-engineer/` — README + contract-template + scope-of-work + access-grant-procedure + onboarding-checklist + activation-procedure + engineer-roster + ledger.

- **As of Story 0.6 author-commit (`.decision-log.md` Decision 2026-05-30-006):** the backup-engineer framework + eight component files + the cross-reference edits to Stories 0.1/0.2/0.3/0.4/0.5 framework artifacts are authored. Trustee Panel ≥2-trustee A-13 retainer authorization is `pending` per Story 0.6 Task 8 (`_AWAITING EXTERNAL ACTION_`); substantive contract template per Story 0.13 counsel return is `pending` per Story 0.6 Task 9; named engineer selection + contract signature + IAM grant provisioning is `pending` per Story 0.6 Task 10; onboarding session + first comprehension administration is `pending` per Story 0.6 Task 11 (Story 0.5 AC-3 first-administration unblock event); activation-scenario test is `pending` per Story 0.6 Task 12 (Story 0.1 AC-4 path 1 discharge event). Full coverage flips to "verified" when Story 0.6 Tasks 8–12 close.
- **Story 0.1 AC-4 path 1 status:** as of Story 0.6 author-commit, the backup-engineer framework is authored; the named engineer + signed contract + IAM grant + onboarding + activation-scenario exercise are pending per Tasks 8-12 (`_AWAITING EXTERNAL ACTION_`); **Story 0.1 AC-4 path 1 execution becomes available once Tasks 8-11 close** — the activation-scenario exercise per Task 12 is the Story 0.1 AC-4 path 1 execution event; until then, Path 2 substitute-engineer remains the interim per `Execution path selected for AC-4 closure` section above.
- **Cross-link:** `docs/backup-engineer/backup-engineer-ledger.md` is the authoritative record for backup-engineer framework coverage state; this section's status is a derived view.
- **30-day takeover joint-discharge:** Story 0.6 AC-1 + AC-2 jointly discharge the PRD §9.1.1 + AR-67 30-day takeover property alongside Story 0.3 AC-1 + AC-2 + Story 0.4 AC-1 + AC-2 + Story 0.5 AC-1 + AC-2 + AC-3. The joint-discharge anchor is tracked in `docs/backup-engineer/backup-engineer-ledger.md` §6 Activation event log header + the three sibling-ledger anchors (`docs/knowledge-transfer/kt-pack-ledger.md` Comprehension administration log header + `docs/degradation-policy/degradation-policy-ledger.md` Table-top exercise log header + `docs/escrow/code-escrow/code-escrow-ledger.md` Bus-factor switch-to-mirror log header).

## Fallback-handler-ledger framework coverage

The trust's operational readiness includes a named, funded, on-rota fallback handler per Phase-1 loop node per UX §0 Stance #6 + UX-DR4 + AR-61 + UX §Phase-0 P0-1 launch-blocker statement. Story 0.7 (P0-1 Fallback-Handler Ledger Published with SLA + Rota) authors the framework at `docs/fallback-handler-ledger/` — README + ledger + loop-nodes/ × 8 (claim-filing, peer-mesh, ground-inspection, reconciliation, helpdesk, denial-appeal, kyc-fallback, upi-failure-coach) + rota + operations-lead-commitment + backfill-log.

- **As of Story 0.7 author-commit (`.decision-log.md` Decision 2026-05-30-007):** the fallback-handler-ledger framework + thirteen component files + the cross-reference edits to Stories 0.1/0.4/0.5/0.6 framework artifacts + `_bmad-output/implementation-artifacts/deferred-work.md` are authored; the 23-row P0-1-pending citation-slot backfill is committed via `docs/fallback-handler-ledger/backfill-log.md`. Trustee Panel Operations Lead hire decision OR substitute-handler-bench formal ratification is `pending` per Story 0.7 Task 8 (`_AWAITING EXTERNAL ACTION_`); per-loop-node named role + funding + per-loop-node ratification + 23-row substantive P0-1-pending backfill is `pending` per Story 0.7 Task 9; rota population + ≥2-trustee ledger sign-off is `pending` per Story 0.7 Task 10; synthetic loop-node automation-failure SLA test per loop node is `pending` per Story 0.7 Task 11. Full coverage flips to "verified" when Story 0.7 Tasks 8–11 close for all eight loop nodes.
- **UX-DR4 + AR-49 P0-1 Launch Gate Risks discharge:** Story 0.7 Task 11 closure for all eight loop nodes discharges the UX-DR4 launch-gate property + the AR-49 P0-1 Launch Gate Risks row at architecture line 4781; cross-referenced from Story 0.15 once that Story closes.
- **Cross-link:** `docs/fallback-handler-ledger/ledger.md` §3 (eight per-loop-node ledger rows) is the authoritative record for fallback-handler-ledger framework coverage state; this section's status is a derived view.
- **Disjoint-anchor discipline per `docs/fallback-handler-ledger/README.md` §10:** Story 0.7 is the **parallel** loop-node-operational-responsiveness portfolio, distinct from the bus-factor-of-one mitigation portfolio (Stories 0.1–0.6). Closure of Story 0.7 does NOT contribute to the 30-day-takeover joint discharge; the two portfolios have disjoint closure semantics.

## Spec-to-cadence-reconciliation framework coverage

The trust's operational readiness requires a reconciled scope-vs-cadence plan before §1 Trust Loops engineering work begins per UX §Phase-0 P0-3 + AR-49 P0-3 Launch Gate Risks (architecture line 4779). Story 0.12 (P0-3 Spec-to-Cadence Reality Check Reconciled) authors the framework at `docs/spec-to-cadence-reconciliation/` — README + estimation-methodology + estimation-worksheet + per-loop-node-estimates × 8 (claim-filing, peer-mesh, ground-inspection, reconciliation, helpdesk, denial-appeal, kyc-fallback, upi-failure-coach) + per-tier-surface-estimates × 3 (tier-1-member-primary, tier-2-staff-primary, tier-3-admin-audit) + reconciliation-decision-framework + backfill-log.

- **As of Story 0.12 author-commit (`.decision-log.md` Decision 2026-06-01-012):** the spec-to-cadence-reconciliation framework + sixteen component files + the cross-reference edits to Stories 0.1/0.4/0.5/0.6/0.7 framework artifacts + `_bmad-output/implementation-artifacts/deferred-work.md` are authored; the 19-row funding-tradeoff citation-slot backfill is committed via `docs/spec-to-cadence-reconciliation/backfill-log.md`. Substantive engineer-month estimate authoring is `pending` per Story 0.12 Task 7 (`_AWAITING EXTERNAL ACTION_`); mismatch-ratio computation + reconciliation-decision proposal is `pending` per Story 0.12 Task 8; ≥2-trustee ratification is `pending` per Story 0.12 Task 9; Epic List + sprint plan updates is `pending` per Story 0.12 Task 10; Step 4 final validation against reconciled scope is `pending` per Story 0.12 Task 11. Full coverage flips to "verified" when Story 0.12 Tasks 7–11 close.
- **AR-49 P0-3 + UX §Phase-0 P0-3 Launch Gate Risks discharge:** Story 0.12 Task 9 + Task 11 closure discharges the AR-49 P0-3 Launch Gate Risks row at architecture line 4779 + the UX §Phase-0 P0-3 launch-blocker. AR-49 P0-3 discharge evidence: `.decision-log.md` Decision 2026-06-01-012 supersession entry (Task 9) + `_bmad-output/planning-artifacts/implementation-readiness-report-post-reconciliation-YYYY-MM-DD.md` (Task 11). Cross-referenced from Story 0.15 once that Story closes.
- **Cross-link:** `docs/spec-to-cadence-reconciliation/estimation-worksheet.md §8` (total estimate + SM-1 reconciliation row) + `reconciliation-decision-framework.md §1` (mismatch-ratio computation) are the authoritative records for spec-to-cadence-reconciliation framework coverage state; this section's status is a derived view.
- **Disjoint-anchor discipline per `docs/spec-to-cadence-reconciliation/README.md §9`:** Story 0.12 is the scope-vs-cadence-funding-reconciliation governance surface — distinct from the bus-factor-of-one mitigation portfolio (Stories 0.1–0.6), the loop-node operational-responsiveness portfolio (Story 0.7), and the empathy field-work portfolio (Stories 0.8–0.11). Closure of Story 0.12 does NOT contribute to the 30-day-takeover joint discharge; it discharges the AR-49 P0-3 row per its own closure semantics.

## Legal-counsel-engagement framework coverage

The trust's operational readiness requires legal counsel concurrent-review coverage of the five AC-named scope items (trust-posture copy + DPDPA consent flow + denial-appeal procedural fairness + Account State Machine transition-table + dual-path claim authority-to-file evidentiary specification) before §1 Trust Loops engineering work begins per UX §Phase-0 P0-4 + epics line 564 + 687 + architecture §External Validation Pending (architecture lines 4842-4860). Story 0.13 (P0-4 Legal Counsel Concurrent-Review Engagement Signed) authors the framework at `docs/legal-counsel-engagement/` — README + engagement-letter-template + review-scope-charter (5 AC-named scope items + 32-row cross-Story deferred-scope inventory + 13-row regulatory surface review + 6-row pre-launch checkpoint coverage) + review-artifact-roster (19 priority-ordered rows; priority-1 = Epic 2 T&C draft within-2-weeks-of-signing per AC-1) + per-artifact-return-roster + counsel-roster (shortlist criteria + single template row at `pending-trustee-selection`) + engagement-ledger (11 §-log sections).

- **As of Story 0.13 author-commit (`.decision-log.md` Decision 2026-06-02-013):** the legal-counsel-engagement framework + seven component files + the cross-reference edits to Stories 0.2/0.4/0.5/0.6/0.7/0.12 framework artifacts + `_bmad-output/implementation-artifacts/deferred-work.md` are authored; 9 deferred-ADR slots added to `docs/knowledge-transfer/adr-index.md` Section K. Trustee Panel scope ratification is `pending` per Story 0.13 Task 7 (`_AWAITING EXTERNAL ACTION_`); counsel shortlist + selection is `pending` per Story 0.13 Task 8 (depends on Trustee Panel + Solo Builder outreach + interview process); engagement-letter signature + NDA + COI disclosure is `pending` per Story 0.13 Task 9 (depends on selected counsel + counsel substantive language return); first-artifact submission within 2 weeks of signing is `pending` per Story 0.13 Task 10; counsel returns + Epic 2/3/6 integration is `pending` per Story 0.13 Task 11. Full coverage flips to "verified" when Story 0.13 Tasks 7–11 close.
- **UX §Phase-0 P0-4 + epics line 564 + 687 launch-gate discharge:** Story 0.13 Task 11 closure across the AC-1 first-submission scope discharges the UX §Phase-0 P0-4 launch-blocker + epics line 564 + 687 P0-4 launch-gate property + the architecture §Launch Gate Risks subsidiary legal-counsel-naming rows at architecture lines 4785-4788 (DPDPA grievance officer designation + FR-43A external forum destination + Regulatory surface sign-off + Trust formation + legal registration). Cross-referenced from Story 0.15 once that Story closes.
- **Cross-link:** `docs/legal-counsel-engagement/engagement-ledger.md` §5 Engagement-signature log + §7 Return-receipt log + `review-artifact-roster.md` integration_status column + `per-artifact-return-roster.md` per-row return content are the authoritative records for legal-counsel-engagement framework coverage state; this section's status is a derived view.
- **Disjoint-anchor discipline per `docs/legal-counsel-engagement/README.md §9`:** Story 0.13 is the legal-counsel-concurrent-review governance surface — the **FIFTH Phase-0 portfolio** distinct from bus-factor-of-one mitigation portfolio (Stories 0.1–0.6), loop-node operational-responsiveness portfolio (Story 0.7), empathy field-work portfolio (Stories 0.8–0.11), and spec-to-cadence-funding-reconciliation portfolio (Story 0.12). Closure of Story 0.13 does NOT contribute to the 30-day-takeover joint discharge; it discharges the UX §Phase-0 P0-4 + epics line 564 + 687 + architecture §Launch Gate Risks subsidiary rows per its own closure semantics + unblocks the eleven prior upstream framework artifacts' pending-legal-review-return state (Story 0.4 comms-templates × 5; Story 0.6 contract-template §6/§9/§10/§11; Story 0.5 ADR slots × 5; Story 0.2 DPO-breach-reporting envelope; Story 0.5 third-party-dependency-inventory Section E × 7; Story 0.7 denial-appeal node; Story 0.12 contract-help-path budget).
- **Concurrent-review nature is load-bearing per UX spec line 75:** counsel reviews artifacts during drafting and pre-launch — NOT post-hoc audit. The engagement is event-driven per-artifact-submission rather than calendar-cycle batched.

## Re-sign protocol (reference; full text in README §"Sign-off lifecycle")

- **Minor edits** (clarifications, link updates, prerequisite-cite refinements): ≥1 trustee re-attestation noted as a new row in the sign-off table.
- **Material edits** (rollback procedure, contact escalation, verification check): ≥2 trustees re-attest as two new rows.
- **Author judgment** on minor vs material is conservative: if in doubt, treat as material and request ≥2 sign-offs.

## Cadence

Per architecture §5.15, the inventory is reviewed at the same cadence as the threat-actor inventory (§2.1) and the data-class retention matrix (§2.12). Specific cadence belongs in operations policy. Each periodic review adds a row to the "Periodic review log" below; the log makes review drift visible.

## Periodic review log

| Review date | Reviewer (≥1 trustee) | Inventory status | Drift findings | Re-signs triggered |
|---|---|---|---|---|
| _first review row goes here once cadence begins_ | | | | |

## Cross-references

- `.decision-log.md` — canonical decisions log; trustee authorizations for Story 0.1 (execution path, substitute engineer if Path 2) are mirrored there.
- `README.md` — sign-off lifecycle, property/control/policy discipline, Phase-0 runbook inventory.
- Architecture §5.15 — directory commitment, review cadence.
- PRD §9.1.1 — bus-factor mitigation rationale.
- Epics.md Story 0.1 — original AC text and trustee gates.
