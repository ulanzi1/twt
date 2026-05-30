# Loop Node: helpdesk

**Status:** Author-committed 2026-05-30; awaiting Task 9 substantive role naming + Task 10 rota population + Task 11 synthetic SLA test.

**Ledger row:** [`ledger.md` §3 Row 5: helpdesk](../ledger.md#row-5-helpdesk).

## §1 Loop node identity

- **Canonical slug:** `helpdesk`
- **Owning Epic:** Epic 10 (Helpdesk + helpline-mediated paths)
- **Implementing Stories:** Story 10.2 (helpline call routing) + Story 10.3 (helpdesk operator console) + Story 10.4 (ticket SLA tracking)
- **Authority cites:**
  - Architecture §3.5 — inbound / outbound asymmetry (inbound carrier routes to operator console; outbound is degraded-mode)
  - UX Helpline Operator console authority
  - Architecture line 349 (AR-61) + lines 296-298 (Cross-Cutting #9) — `{primary_actor, fallback_actor, escalation_trigger}` shape

## §2 Primary actor + automation surface

- **Primary actor:** Helpdesk operator per Story 10.3 (helpline-mediated path)
- **Automation surface:**
  - Member dials helpline inbound number; carrier routes to operator console per architecture §3.5
  - Carrier-level auto-attendant (per architecture §3.5 inbound fallback) handles routing when operator pool capacity is exceeded or the carrier route is temporarily degraded — the auto-attendant is an automated system, not a staff fallback handler
  - Operator authenticates the member; logs the inquiry as a ticket per Story 10.2
  - Operator handles the inquiry OR escalates to specialized role (claim-shepherd, nominee shepherd, etc.)
  - Ticket SLA tracked per Story 10.4; SLA breaches generate alerts

## §3 Failure modes

- **Inbound call routing failure** — carrier-level outage; member cannot reach helpline; calls drop
- **Operator pool overloaded** — high call volume exceeds operator capacity; queue depth grows; SLA breaches accumulate
- **Ticket SLA breach** — per Story 10.4; operator failed to first-action a ticket within the documented window
- **Member-initiated escalation** — member explicitly requests supervisor; operator does not have authority to resolve

Failure-mode catalogue references:

- Architecture §3.5 inbound / outbound asymmetry
- Story 10.4 ticket SLA tracking
- Architecture Cross-Cutting #9 staff-fallback at every node

## §4 Fallback actor + role

- **Fallback actor:** Helpline shift supervisor + helpdesk on-call
- **Role identity:** `<TO-BE-NAMED-BY-TRUSTEE-PANEL>` (Task 9)
- **Recommended candidates** (per `ledger.md` §3 Row 5 + Story 0.4 `surface-inventory.md` line 57): Helpline shift supervisor (per-shift operations oversight; escalation authority within the shift) + helpdesk on-call (after-hours coverage rota). Note: carrier-level auto-attendant (per architecture §3.5) is an automated system and cannot satisfy UX §0 Stance #6 "named, funded, on-rota" — it is part of the automation surface (§2) not the fallback actor

## §5 Funding posture

- **Funding status:** `unfunded` (author-commit default; Task 9 ratification)
- **Recommended posture:** `salary-funded` for shift supervisor (always-on per-shift; multiple shifts daily) + `retainer-funded` for helpdesk on-call rota (after-hours coverage)
- **Rationale subsection:** helpdesk is the most member-facing-immediate of the loop nodes; per-shift supervisor coverage is required by the inbound-call-routing model. Per-helpdesk-shift coverage requires per-loop-node negotiation at Trustee Panel — the shift count + per-shift staffing depth is a Story 0.12 reconciliation territory item.

## §6 SLA

- **Acknowledgment window:** ≤15 min
- **First-action window:** ≤2 hr
- **Completion window:** _(per Story 10.4 ticket SLA — typically 24-48 hours per ticket class)_
- **Rationale subsection:** inbound-helpline is the most member-facing-immediate of the loop nodes; the tight ack window is justified by carrier-level inbound timeouts (members hang up if not reached within minutes). The 2-hr first-action matches Story 10.4 ticket SLA assumptions. Tighter SLAs would over-cost without proportional member benefit (members already on the line are handled by the inbound carrier routing); looser SLAs would risk member abandonment.
- **Deterministic pass/fail signal:** the fallback handler's first action (operator pool re-staffed OR escalation taken to specialized role OR carrier-level routing fix authorized) within 2 hours of paging-event is the AC-2 pass/fail signal.

## §7 Rota

- **Rota cross-link:** [`rota.md#helpdesk`](../rota.md#helpdesk-rota)
- **Rota cadence:** per-shift primary + daily secondary (recommended-default — helpdesk is per-shift by nature)
- **NDA discipline:** substantive identity NDA-protected per README §4 invariant 4

## §8 Comms channel

- **Paging surfaces:**
  - `helpline-inbound` (per architecture §3.5) — member-facing inbound carrier path (routes member calls to available operators; this is not a staff on-call paging surface)
  - `push` (`comms-templates/push-channel.md`) — in-console operator banner for the operator pool
  - `<staff-paging-channel — ADR slot per helpdesk loop node>` — the specific mechanism for paging the on-call shift supervisor when operator pool capacity is exceeded or no operator is on shift (internal chat, dedicated paging tool, staff WA group — substrate choice is deferred ADR territory per [[feedback_architecture_vs_adr_boundary]]; ADR slot reserved in `docs/knowledge-transfer/adr-index.md` Section I per Story 0.7 Task 7)
- **Comms-template citations:** substantive template content lives in `docs/degradation-policy/comms-templates/`

## §9 Surface-inventory backfill citations

- **Line 57** — "Helpline Operator console" row — `fallback_handler` column carries `P0-1-pending (Helpline shift supervisor; carrier-level auto-attendant per §3.5 inbound fallback)` at author-commit; Task 9 substantively backfills with the named role per `ledger.md` §3 Row 5. This row is **co-covered** by the claim-filing loop-node entry §9 (the Helpline Operator console serves both helpdesk inbound + claim-filing inbound; `surface_inventory_xref` in `ledger.md` §3 reflects the multi-loop-node coverage)

One row discharged (with co-coverage caveat per claim-filing.md §9). Per `backfill-log.md` per-row detail.

## §10 Audit-line emission obligation

Per architecture Cross-Cutting #2 + #9 + Story 1.10 substrate:

- Every fallback-handler engagement event for helpdesk emits an audit line carrying: `loop_node_id = helpdesk` + handler identity + trigger event (e.g., `automation-failure-detected: inbound call routing failure — carrier outage detected`) + outcome (re-staffed-OR-carrier-fix-authorized)
- **Substrate:** Story 1.10 tamper-evident audit log primitive
- **Pre-Story-1.10 status:** committed property + procedure shape

## §11 Escalation path on SLA breach

1. **First tier — Operations Lead** — paged via `push` + `email`
2. **Second tier — Trustee Panel chair** — if Operations Lead is unreachable within 30 min, Trustee Panel chair is paged via `push` + `email`; Trustee Panel chair invokes the substitute-handler-bench fallback per `operations-lead-commitment.md` §4 + README §5
3. **Third tier — Story 0.6 backup engineer** — bus-factor-activation engagement mode (especially for carrier-level integration issues)
4. **Substitute-handler-bench fallback** — per README §5
5. **Story 0.4 degradation-policy framework activation** — if systemic, surface-inventory.md "Helpline Operator console" row's `degraded-mode` outbound posture remains active per `docs/degradation-policy/degradation-policy-ledger.md`

## §12 Cross-references

- **Owning Story:** [Story 0.7](../../../_bmad-output/implementation-artifacts/0-7-p0-1-fallback-handler-ledger-published-with-sla-rota.md)
- **Implementing Stories:** Story 10.2 + Story 10.3 + Story 10.4
- **Discharged surface-inventory rows per §9:** `docs/degradation-policy/surface-inventory.md` line 57 (co-covered with claim-filing.md)
- **Comms templates per §8:** `helpline-inbound` (architecture §3.5) + `docs/degradation-policy/comms-templates/push-channel.md`
- **On-call playbook incident class:** helpdesk-shift-supervisor-engagement
- **ADR slots:** per `docs/knowledge-transfer/adr-index.md` Section I — paging-integration ADR slot for helpdesk; per-loop-node SLA tooling ADR slot; per-loop-node-ADR backlog slot
