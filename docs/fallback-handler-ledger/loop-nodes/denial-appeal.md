# Loop Node: denial-appeal

**Status:** Author-committed 2026-05-30; awaiting Task 9 substantive role naming + Task 10 rota population + Task 11 synthetic SLA test.

**Ledger row:** [`ledger.md` §3 Row 6: denial-appeal](../ledger.md#row-6-denial-appeal).

## §1 Loop node identity

- **Canonical slug:** `denial-appeal`
- **Owning Epic:** Epic 6 (Claim flow — appeal stage)
- **Implementing Stories:** Story 6.16 (denial-appeal workflow); cross-cuts Story 1.11b (audit-of-Anita UI) + Story 6.13 (State Trustee escalation) + Story 6.14 (R9 voting workflow)
- **Authority cites:**
  - FR-43A — appeal-stage workflow + Stage-1-reviewer ≠ original-decision-maker conflict-of-interest discipline
  - UX audit-of-Anita pattern — conflict-of-interest discipline
  - Architecture line 349 (AR-61) + lines 296-298 (Cross-Cutting #9) — `{primary_actor, fallback_actor, escalation_trigger}` shape

## §2 Primary actor + automation surface

- **Primary actor:** Appeal-stage reviewer per FR-43A (a reviewer distinct from the original decision-maker)
- **Automation surface:**
  - On claim denial, the appeal flow is offered to the member
  - Member submits the appeal with optional new evidence
  - Automated reviewer-assignment selects a distinct reviewer from the original decision-maker (FR-43A conflict-of-interest discipline)
  - Reviewer evaluates the appeal; renders Stage-1 decision per Story 6.16 workflow
  - If still denied, the member may escalate to State Trustee per Story 6.13

## §3 Failure modes

- **Appeal SLA breach** — Stage-1 reviewer fails to complete within the documented appeal-SLA window per Story 6.16
- **Stage-1-reviewer-equals-original-decision-maker conflict** — automated assignment cannot find a distinct reviewer due to small reviewer pool (FR-43A precondition not satisfiable algorithmically)
- **Member-initiated escalation** — member or appeal-shepherd escalates Stage-1 result to State Trustee per Story 6.13
- **Appeal-workflow data-entry failure** — appeal submission lost, evidence upload corrupted

Failure-mode catalogue references:

- FR-43A appeal-stage workflow
- Story 6.13 State Trustee escalation
- Architecture Cross-Cutting #9 staff-fallback at every node

## §4 Fallback actor + role

- **Fallback actor:** State Trustee + appeal-shepherd
- **Role identity:** `<TO-BE-NAMED-BY-TRUSTEE-PANEL>` (Task 9)
- **Recommended candidates** (per `ledger.md` §3 Row 6 + Story 0.4 `surface-inventory.md` line 63): State Trustee (per Story 6.13 escalation role) + appeal-shepherd (member-facing escalation support role; helps the member navigate the appeal process)
- **Conflict-of-interest discipline:** the §11 escalation receiver (Trustee Panel chair or State Trustee) must be a trustee distinct from the active fallback actor for that incident; if the Trustee Panel chair is themselves the active fallback actor for the incident, a different trustee on the panel takes the escalation role; if all remaining trustees are implicated or unavailable, escalate to the State Trustee Panel per Epic 6 Story 6.13; this clause is general (not chair-specific) to cover any configuration of fallback actor and escalation receiver

## §5 Funding posture

- **Funding status:** `unfunded` (author-commit default; Task 9 ratification)
- **Recommended posture:** `retainer-funded` for State Trustee role (existing trustee-class role; per-claim retainer) + `salary-funded` for appeal-shepherd if appeal volume sustains the role (initially `volunteer-rota-bridge` from Operations Lead pool)
- **Rationale subsection:** denial-appeal is structurally lower-volume than claim-filing but higher-stakes (every appeal involves a denied member contesting the decision). Funding posture should scale with appeal volume per quarter; the appeal-shepherd role may be volunteer-bridged in v1 and scaled to salary-funded as appeal volume sustains.

## §6 SLA

- **Acknowledgment window:** ≤24 hr
- **First-action window:** ≤72 hr
- **Completion window:** _(governed by Story 6.16 appeal-stage workflow SLAs; typically 14-30 days per appeal)_
- **Rationale subsection:** denial-appeal is high-stakes but not member-facing-immediate — the appeal process inherently runs days-to-weeks. The 24-hr ack ensures the member sees motion within a business day (vs. days of silence after a denial, which is dignity-corrosive). The 72-hr first-action allows for reviewer-assignment, conflict-of-interest check, member outreach for clarifying evidence. Tighter SLAs would over-cost; looser SLAs would risk dignity erosion.
- **Deterministic pass/fail signal:** the fallback handler's first action (reviewer-reassigned to a distinct reviewer OR member-outreach-initiated for clarifying evidence OR State Trustee escalation triggered) within 72 hours of paging-event is the AC-2 pass/fail signal.

## §7 Rota

- **Rota cross-link:** [`rota.md#denial-appeal`](../rota.md#denial-appeal-rota)
- **Rota cadence:** weekly primary + monthly secondary (recommended-default)
- **NDA discipline:** substantive identity NDA-protected per README §4 invariant 4

## §8 Comms channel

- **Paging surfaces:**
  - `push` (`comms-templates/push-channel.md`)
  - `WA` (`comms-templates/whatsapp-channel.md`)
  - `email` (`comms-templates/email-channel.md`) — trustee-class users prefer email
- **Comms-template citations:** substantive template content lives in `docs/degradation-policy/comms-templates/`

## §9 Surface-inventory backfill citations

- **Line 63** — "R9 voting workflow" row — `fallback_handler` column carries `P0-1-pending (Trustee Panel chair + State Trustee escalation per Story 6.13)` at author-commit; Task 9 substantively backfills with the named role per `ledger.md` §3 Row 6
- **Line 64** — "Audit-of-Anita UI" row — `fallback_handler` column carries `P0-1-pending (Trustee Panel chair)` at author-commit; Task 9 substantively backfills with the named role per `ledger.md` §3 Row 6 (denial-appeal escalates via the audit-of-Anita UI for trustee-class review)

Two rows discharged. Per `backfill-log.md` per-row detail.

## §10 Audit-line emission obligation

Per architecture Cross-Cutting #2 + #9 + Story 1.10 substrate:

- Every fallback-handler engagement event for denial-appeal emits an audit line carrying: `loop_node_id = denial-appeal` + handler identity + trigger event (e.g., `automation-precondition-failure: Stage-1-reviewer-equals-original-decision-maker — small reviewer pool`) + outcome (reviewer-reassigned OR member-outreach-initiated OR State-Trustee-escalation-triggered)
- **Substrate:** Story 1.10 tamper-evident audit log primitive
- **Pre-Story-1.10 status:** committed property + procedure shape

## §11 Escalation path on SLA breach

1. **First tier — Operations Lead** — paged via `push` + `email`
2. **Second tier — Trustee Panel chair** — if Operations Lead is unreachable within 30 min, Trustee Panel chair is paged via `push` + `email`; Trustee Panel chair invokes the substitute-handler-bench fallback per `operations-lead-commitment.md` §4 + README §5; conflict-of-interest discipline applies per §4 — the escalation receiver must be a trustee distinct from the active fallback actor for that incident; if all remaining trustees are implicated or unavailable, escalate to the State Trustee Panel per Epic 6 Story 6.13
3. **Third tier — Story 0.6 backup engineer** — bus-factor-activation engagement mode (rare for denial-appeal; backup engineer is not in the appeal-decision chain; the backup engineer is engaged for operational continuity coordination only and has no appeal-decision authority — appeal-decision authority at SLA-breach escalation is the State Trustee Panel per FR-43A)
4. **Substitute-handler-bench fallback** — per README §5
5. **Story 0.4 degradation-policy framework activation** — if systemic, escalates to the surface-inventory.md "R9 voting workflow" or "Audit-of-Anita UI" rows per `docs/degradation-policy/degradation-policy-ledger.md`

## §12 Cross-references

- **Owning Story:** [Story 0.7](../../../_bmad-output/implementation-artifacts/0-7-p0-1-fallback-handler-ledger-published-with-sla-rota.md)
- **Implementing Stories:** Story 6.16; cross-cuts Story 1.11b + Story 6.13 + Story 6.14
- **Discharged surface-inventory rows per §9:** `docs/degradation-policy/surface-inventory.md` lines 63 + 64
- **Comms templates per §8:** `docs/degradation-policy/comms-templates/push-channel.md` + `docs/degradation-policy/comms-templates/whatsapp-channel.md` + `docs/degradation-policy/comms-templates/email-channel.md`
- **On-call playbook incident class:** denial-appeal-state-trustee-engagement
- **ADR slots:** per `docs/knowledge-transfer/adr-index.md` Section I — paging-integration ADR slot for denial-appeal; per-loop-node SLA tooling ADR slot; per-loop-node-ADR backlog slot
