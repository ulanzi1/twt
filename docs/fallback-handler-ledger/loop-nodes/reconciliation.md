# Loop Node: reconciliation

**Status:** Author-committed 2026-05-30; awaiting Task 9 substantive role naming + Task 10 rota population + Task 11 synthetic SLA test.

**Ledger row:** [`ledger.md` §3 Row 4: reconciliation](../ledger.md#row-4-reconciliation).

## §1 Loop node identity

- **Canonical slug:** `reconciliation`
- **Owning Epic:** Epic 9 (Reconciliation)
- **Implementing Stories:** Story 9.1 (matcher cron substrate) + Story 9.4 (manual triage queue) + Story 9.7 (self-verify path) + Story 9.8 (reconciliation review queue)
- **Authority cites:**
  - Architecture §3.6 — matcher cron (automated reconciliation substrate)
  - UX §1 — nominee non-engagement rule (Anita-class staff-takeover by day N)
  - Architecture line 349 (AR-61) + lines 296-298 (Cross-Cutting #9) — `{primary_actor, fallback_actor, escalation_trigger}` shape

## §2 Primary actor + automation surface

- **Primary actor:** Matcher cron per architecture §3.6 (automated) + Sunita-class nominee (member-archetype primary actor for nominee-engagement path)
- **Automation surface:**
  - Matcher cron runs on a per-shift cadence (per architecture §3.6 frequency parameters)
  - Cron joins contribution-flow events (per Story 8.6 Yogdaan Bahi) with claim-payout events (per Story 6.x payout completion)
  - Mismatched rows enter the manual triage queue (Story 9.4) for human review
  - Nominee non-engagement path (UX §1): Sunita-class nominee receives outreach to confirm nominee acknowledgment; if no engagement by day N, Anita-class staff takes over per the nominee-non-engagement rule

## §3 Failure modes

- **Matcher cron exception** — backend cron failure during the matcher pass; rows that should be matched remain unmatched in the queue
- **Mismatched-row accumulation** — manual triage queue depth exceeds the operator's ability to drain (operator capacity vs. exception volume mismatch)
- **Nominee non-engagement** — nominee fails to acknowledge by day N per UX §1; staff-takeover-by-day-N is triggered
- **Cross-system reference drift** — contribution-flow ID vs. claim-payout ID mismatch due to upstream event-log inconsistency (rare; Story 1.10 audit-log invariants prevent in steady state)

Failure-mode catalogue references:

- Architecture §3.6 matcher cron
- UX §1 nominee non-engagement rule
- Architecture Cross-Cutting #9 staff-fallback at every node
- Architecture audit-log invariants per Cross-Cutting #2 + Story 1.10

## §4 Fallback actor + role

- **Fallback actor:** Reconciliation triage on-call (matcher exception path) + Sunita-class nominee staff-takeover (Anita-class staff per UX §1 nominee non-engagement rule)
- **Role identity:** `<TO-BE-NAMED-BY-TRUSTEE-PANEL>` (Task 9)
- **Recommended candidates** (per `ledger.md` §3 Row 4 + Story 0.4 `surface-inventory.md` lines 50 + 66): Reconciliation triage on-call (per architecture §3.6 + Story 9.8) + Nominee shepherd / claim-shepherd staff (per surface-inventory.md line 50)

## §5 Funding posture

- **Funding status:** `unfunded` (author-commit default; Task 9 ratification)
- **Recommended posture:** `salary-funded` for reconciliation triage on-call role (volume scales with contribution-flow + claim-flow size; needs always-on coverage during business hours) + `retainer-funded` for nominee shepherd / claim-shepherd staff (lower-volume; on-rota)
- **Rationale subsection:** reconciliation exceptions accumulate quickly in production — once the queue builds up beyond capacity, drain time grows non-linearly. Salary-funded triage on-call ensures the queue is drained on a daily cadence; retainer-funded nominee shepherd handles the lower-volume nominee non-engagement path.

## §6 SLA

- **Acknowledgment window:** ≤1 hr
- **First-action window:** ≤8 hr
- **Completion window:** _(per-exception variable; typical exceptions resolved within 1-2 business days)_
- **Rationale subsection:** reconciliation exceptions accumulate quickly in production; the 1-hr ack matches matcher-cron-frequency constraints (cron typically runs hourly during business hours per architecture §3.6); the 8-hr first action allows for triage analysis (cross-referencing contribution-flow events, claim-payout events, member outreach if needed). Tighter SLAs would require always-on triage coverage; looser SLAs would let the queue grow beyond capacity.
- **Deterministic pass/fail signal:** the fallback handler's first action (exception triage started + per-exception remediation plan logged) within 8 hours of paging-event is the AC-2 pass/fail signal.

## §7 Rota

- **Rota cross-link:** [`rota.md#reconciliation`](../rota.md#reconciliation-rota)
- **Rota cadence:** daily primary + weekly secondary (recommended-default — reconciliation is daily-cadence by nature)
- **NDA discipline:** substantive identity NDA-protected per README §4 invariant 4

## §8 Comms channel

- **Paging surfaces:**
  - `push` (`comms-templates/push-channel.md`) — in-console operator banner per surface-inventory.md line 66
  - `email` (`comms-templates/email-channel.md`) — escalation for queue-depth-threshold breach
- **Comms-template citations:** substantive template content lives in `docs/degradation-policy/comms-templates/`

## §9 Surface-inventory backfill citations

- **Line 50** — "Sunita-mode nominee console" row — `fallback_handler` column carries `P0-1-pending (Nominee shepherd / claim-shepherd staff)` at author-commit; Task 9 substantively backfills with the named role per `ledger.md` §3 Row 4 (nominee shepherd / claim-shepherd staff component)
- **Line 47** — "Yogdaan Bahi" row — `fallback_handler` column carries `P0-1-pending` at author-commit; Task 9 substantively backfills with the named role per `ledger.md` §3 Row 4 (reconciliation triage component covers contribution-timeline reconciliation). **Co-covered with `upi-failure-coach.md` §9** — the Yogdaan Bahi surface is the contribution-timeline read surface; reconciliation surfaces matcher exceptions; upi-failure-coach surfaces per-contribution UPI stuck cases; both loop-node entries discharge the same surface-inventory row from their respective sides. See `backfill-log.md` Row 4 for the co-coverage mapping.
- **Line 66** — "Reconciliation review queue" row — `fallback_handler` column carries `P0-1-pending (Reconciliation triage on-call per architecture §3.6 + Story 9.8)` at author-commit; Task 9 substantively backfills with the named role per `ledger.md` §3 Row 4

Three row-claims discharged (2 unique rows plus 1 co-covered row). Per `backfill-log.md` per-row detail.

## §10 Audit-line emission obligation

Per architecture Cross-Cutting #2 + #9 + Story 1.10 substrate:

- Every fallback-handler engagement event for reconciliation emits an audit line carrying: `loop_node_id = reconciliation` + handler identity + trigger event (e.g., `automation-failure-detected: matcher cron exception — contribution-event ID xyz mismatch`) + outcome (triage-started + per-exception-remediation-plan-logged)
- **Substrate:** Story 1.10 tamper-evident audit log primitive
- **Pre-Story-1.10 status:** committed property + procedure shape

## §11 Escalation path on SLA breach

1. **First tier — Operations Lead** — paged via `push` + `email`
2. **Second tier — Trustee Panel chair** — if Operations Lead is unreachable within 30 min, Trustee Panel chair is paged via `push` + `email`; Trustee Panel chair invokes the substitute-handler-bench fallback per `operations-lead-commitment.md` §4 + README §5
3. **Third tier — Story 0.6 backup engineer** — bus-factor-activation engagement mode (especially relevant for reconciliation since matcher cron substrate may require backend-engineering intervention)
4. **Substitute-handler-bench fallback** — per README §5
5. **Story 0.4 degradation-policy framework activation** — if systemic, escalates to surface-inventory.md "Reconciliation review queue" row's `degraded-mode` posture per `docs/degradation-policy/degradation-policy-ledger.md`

## §12 Cross-references

- **Owning Story:** [Story 0.7](../../../_bmad-output/implementation-artifacts/0-7-p0-1-fallback-handler-ledger-published-with-sla-rota.md)
- **Implementing Stories:** Story 9.1 + Story 9.4 + Story 9.7 + Story 9.8
- **Discharged surface-inventory rows per §9:** `docs/degradation-policy/surface-inventory.md` lines 47 + 50 + 66
- **Comms templates per §8:** `docs/degradation-policy/comms-templates/push-channel.md` + `docs/degradation-policy/comms-templates/email-channel.md`
- **On-call playbook incident class:** reconciliation-triage-engagement
- **ADR slots:** per `docs/knowledge-transfer/adr-index.md` Section I — paging-integration ADR slot for reconciliation; per-loop-node SLA tooling ADR slot; per-loop-node-ADR backlog slot
