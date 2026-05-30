# Loop Node: ground-inspection

**Status:** Author-committed 2026-05-30; awaiting Task 9 substantive role naming + Task 10 rota population + Task 11 synthetic SLA test.

**Ledger row:** [`ledger.md` §3 Row 3: ground-inspection](../ledger.md#row-3-ground-inspection).

## §1 Loop node identity

- **Canonical slug:** `ground-inspection`
- **Owning Epic:** Epic 6 (Claim flow — ground verification)
- **Implementing Stories:** Story 6.7 (ground-inspection workflow); cross-cuts Story 13.3 (field-worker dispatch app)
- **Authority cites:**
  - UX spec §Ground Inspection — Vikram-class member archetype + on-site verification of the claim
  - PRD §9.3 — field-worker comp is a cash-flow constraint that must be modeled before recruitment scales
  - Architecture line 349 (AR-61) + lines 296-298 (Cross-Cutting #9) — `{primary_actor, fallback_actor, escalation_trigger}` shape
  - Architecture §3.4 fail-graceful pattern for field-worker dispatch app sync

## §2 Primary actor + automation surface

- **Primary actor:** Field-worker (Vikram-class) dispatched via field-worker dispatch app (Story 13.3)
- **Automation surface:**
  - Claim flow triggers ground-inspection requirement (Story 6.7 — driven by claim documentation patterns OR R9 voting workflow per Story 6.14 — when the documentation pattern requires on-site verification)
  - Dispatch system selects nearest field-worker per geographic / Pariwar locality; assigns the inspection ticket
  - Field-worker receives the ticket in the dispatch app; conducts on-site verification per Story 6.7 workflow
  - Inspection report uploaded via the dispatch app; routes to verifier console (Story 6.10) for review

## §3 Failure modes

- **Field-worker unreachable** — Vikram-class member archetype WA reach failure per UX surface-priority Tier 2 (low-tech-fluency field workers may have unreliable WA / push delivery)
- **Field-worker dispatch app sync failure** — dispatch app backend exception; ticket assignment fails; field worker has no visibility on assigned inspection
- **Inspection-scheduling failure** — automated scheduling cannot find a window that works for both the field worker + the claim's family
- **No nearest field-worker available** — Pariwar locality has no on-rota field worker within the inspection-window distance (cash-flow constraint per PRD §9.3 may limit field-worker density)

Failure-mode catalogue references:

- UX surface-priority Tier 2 — Vikram-class WA reach + push delivery characteristics
- Architecture §3.4 fail-graceful pattern
- Architecture Cross-Cutting #9 staff-fallback at every node
- PRD §9.3 field-worker comp cash-flow constraint

## §4 Fallback actor + role

- **Fallback actor:** Field-worker dispatch supervisor + District Admin role
- **Role identity:** `<TO-BE-NAMED-BY-TRUSTEE-PANEL>` (Task 9)
- **Recommended candidates** (per `ledger.md` §3 Row 3 + Story 0.4 `surface-inventory.md` line 60): Field-worker dispatch supervisor (manually re-routes failed automated dispatches; expands the inspection-window radius if needed) + District Admin role (handles cross-Pariwar field-worker coverage gaps; authorizes cross-district dispatch for high-priority claims)

## §5 Funding posture

- **Funding status:** `unfunded` (author-commit default; Task 9 ratification)
- **Recommended posture:** `retainer-funded` for dispatch supervisor (the supervisor is part-time, on-rota; not always-on) + `salary-funded` for District Admin (the admin role is full-time, multi-district)
- **Rationale subsection:** ground-inspection failures are infrequent but high-impact (a failed inspection blocks the claim flow). Per PRD §9.3 cash-flow constraint, funding requires Trustee Panel + Story 0.12 reconciliation linkage — the field-worker comp model itself is a cash-flow constraint that gates ground-inspection density; the fallback handler funding is structurally downstream of the field-worker comp decision.

## §6 SLA

- **Acknowledgment window:** ≤4 hr
- **First-action window:** ≤48 hr
- **Completion window:** _(governed by the Story 6.7 inspection-window SLA, not by the fallback handler engagement SLA; the fallback handler's first-action is dispatch re-routing or window-expansion authorization, not the inspection itself)_
- **Rationale subsection:** ground inspection is field-time-constrained — dispatch supervisor can re-route within hours but the 48-hr first-action accounts for travel + inspection-window negotiation with the member's family per UX Vikram-class workflow. The 4-hr ack window matches the operational reality that dispatch supervisor is not always-on. Tighter SLAs would over-cost a low-volume loop node; looser SLAs would risk the inspection-window expiring before the manual fallback can engage.
- **Deterministic pass/fail signal:** the fallback handler's first action (re-routed dispatch confirmed OR cross-district dispatch authorized OR family-window-negotiation initiated) within 48 hours of paging-event is the AC-2 pass/fail signal.

## §7 Rota

- **Rota cross-link:** [`rota.md#ground-inspection`](../rota.md#ground-inspection-rota)
- **Rota cadence:** biweekly primary + monthly secondary (recommended-default)
- **NDA discipline:** substantive identity NDA-protected per README §4 invariant 4

## §8 Comms channel

- **Paging surfaces:**
  - `WA` (`comms-templates/whatsapp-channel.md`) — primary paging via Vikram-class WA reach per UX surface-priority
  - `push` (`comms-templates/push-channel.md`) — backup paging
- **Comms-template citations:** substantive template content lives in `docs/degradation-policy/comms-templates/`

## §9 Surface-inventory backfill citations

- **Line 60** — "Field-worker dispatch app" row — `fallback_handler` column carries `P0-1-pending (Field-worker dispatch supervisor; District Admin role)` at author-commit; Task 9 substantively backfills with the named role per `ledger.md` §3 Row 3

One row discharged. Per `backfill-log.md` per-row detail.

## §10 Audit-line emission obligation

Per architecture Cross-Cutting #2 + #9 + Story 1.10 substrate:

- Every fallback-handler engagement event for ground-inspection emits an audit line carrying: `loop_node_id = ground-inspection` + handler identity + trigger event (e.g., `automation-precondition-failure: field-worker unreachable — Pariwar locality density 0 on-rota`) + outcome (re-routed-dispatch-confirmed OR cross-district-dispatch-authorized OR family-window-negotiation-initiated)
- **Substrate:** Story 1.10 tamper-evident audit log primitive
- **Pre-Story-1.10 status:** committed property + procedure shape

## §11 Escalation path on SLA breach

1. **First tier — Operations Lead** — paged via `push` + `email`
2. **Second tier — Trustee Panel chair** — if Operations Lead is unreachable within 30 min, Trustee Panel chair is paged via `push` + `email`; Trustee Panel chair invokes the substitute-handler-bench fallback per `operations-lead-commitment.md` §4 + README §5
3. **Third tier — Story 0.6 backup engineer** — bus-factor-activation engagement mode
4. **Substitute-handler-bench fallback** — per README §5
5. **Story 0.4 degradation-policy framework activation** — if systemic, escalates to surface-inventory.md "Field-worker dispatch app" row's `gracefully-suspended` posture per `docs/degradation-policy/degradation-policy-ledger.md` (degradation stance suspends new-dispatch scheduling; active dispatches continue per surface-inventory.md line 60)

## §12 Cross-references

- **Owning Story:** [Story 0.7](../../../_bmad-output/implementation-artifacts/0-7-p0-1-fallback-handler-ledger-published-with-sla-rota.md)
- **Implementing Stories:** Story 6.7 (ground-inspection workflow); Story 13.3 (field-worker dispatch app)
- **Discharged surface-inventory rows per §9:** `docs/degradation-policy/surface-inventory.md` line 60
- **Comms templates per §8:** `docs/degradation-policy/comms-templates/whatsapp-channel.md` + `docs/degradation-policy/comms-templates/push-channel.md`
- **On-call playbook incident class:** ground-inspection-fallback-handler-engagement
- **ADR slots:** per `docs/knowledge-transfer/adr-index.md` Section I — paging-integration ADR slot for ground-inspection; per-loop-node SLA tooling ADR slot; per-loop-node-ADR backlog slot
