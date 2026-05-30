# Loop Node: peer-mesh

**Status:** Author-committed 2026-05-30; awaiting Task 9 substantive role naming + Task 10 rota population + Task 11 synthetic SLA test.

**Ledger row:** [`ledger.md` §3 Row 2: peer-mesh](../ledger.md#row-2-peer-mesh).

## §1 Loop node identity

- **Canonical slug:** `peer-mesh`
- **Owning Epic:** Epic 6 (Claim flow — peer verification)
- **Implementing Stories:** Story 6.6 (peer-mesh evaluator — deterministic-5-nearest-selection algorithm)
- **Authority cites:**
  - UX spec §Peer Mesh (see Story 6.6 spec cross-reference for UX line citation) — peer-verifier-class proximity-based peer selection; 5-nearest deterministic selection; 24-hour outreach window
  - Architecture line 349 (AR-61) + lines 296-298 (Cross-Cutting #9) — `{primary_actor, fallback_actor, escalation_trigger}` shape
  - Story 6.6 deterministic-5-nearest-selection algorithm specification

## §2 Primary actor + automation surface

- **Primary actor:** Automated peer-mesh evaluator per Story 6.6 (deterministic-5-nearest-selection algorithm)
- **Automation surface (what the node does when the software path works):**
  - On claim-documentation upload completion (Story 6.3), the peer-mesh evaluator selects the 5 nearest peer-verifier candidates from the claim's Pariwar locality
  - Selected peers are notified via `comms-templates/push-channel.md` + `comms-templates/whatsapp-channel.md`
  - Peers review the claim documentation in the peer-verifier console; each peer submits an approve / hold / reject signal
  - Peer-mesh evaluator aggregates the peer signals; advances the claim to next stage when threshold is reached
  - Peer-mesh window is constrained (default 24-hour outreach window per Story 6.6)

## §3 Failure modes

- **5-nearest peers cannot be selected** — insufficient Pariwar density (the Pariwar has fewer than 5 eligible peer-verifier-class members within the proximity radius); the algorithm exhausts candidates without reaching 5
- **All candidate peers unreachable / unresponsive within the 24-hr window** — Pariwar density is sufficient but peer-outreach surfaces fail to elicit peer engagement (WA push delivery failures, push notification opt-out, peers offline)
- **External-dependency outage** — WA push provider unavailable; in-app push delivery rate below threshold per architecture §3.4
- **Peer-verifier console failure** — peers receive the notification but the verifier console is unavailable for review submission

Failure-mode catalogue references:

- Story 6.6 deterministic-5-nearest-selection algorithm + window constraint
- Architecture §3.4 fail-graceful pattern
- Architecture Cross-Cutting #9 staff-fallback at every node

## §4 Fallback actor + role

- **Fallback actor:** Peer-mesh coordinator (staff role) — Task 9 substantively names
- **Role identity:** `<TO-BE-NAMED-BY-TRUSTEE-PANEL>` (per `[deferred ADR — placeholder procedure]` discipline)
- **Recommended candidates** (per `ledger.md` §3 Row 2): peer-mesh coordinator role — a staff role that (a) manually selects peer-verifier candidates when the algorithm cannot reach 5, (b) re-notifies via alternate channels (helpline call, in-Pariwar admin outreach), (c) escalates to Trustee Panel if peer-mesh window expires without sufficient signals

## §5 Funding posture

- **Funding status:** `unfunded` (author-commit default; Task 9 ratification)
- **Recommended posture:** `volunteer-rota-bridge` initially (peer-mesh coordinator can be a rotating volunteer drawn from Pariwar admin pool when Pariwar density is low), transitioning to `retainer-funded` as Pariwar density grows (volume scales with claim count per quarter)
- **Rationale subsection:** peer-mesh failures are rare at low Pariwar density (only one Pariwar in v1 launch) but become more frequent as Pariwar count grows; the funding posture should scale with the structural risk. Volunteer-rota-bridge is a v1-acceptable posture; the transition to retainer-funded is Story 0.12 spec-to-cadence reconciliation territory.

## §6 SLA

- **Acknowledgment window:** ≤2 hr
- **First-action window:** ≤24 hr
- **Completion window:** _(matches the Story 6.6 peer-mesh window — 24 hours; the fallback handler's first action initiates the manual-peer-selection or re-notification path within the 24-hour Story 6.6 window)_
- **Rationale subsection:** peer-mesh window is the substantive constraint — the 24-hr first-action matches the Story 6.6 peer-outreach window. The 2-hr ack window allows for the peer-mesh coordinator to be paged during business hours (peer-mesh coordinator is unlikely to be always-on). Tighter SLAs would over-cost a low-volume loop node; looser SLAs would risk the peer-mesh window expiring before the manual fallback can engage.
- **Deterministic pass/fail signal:** the fallback handler's first action (manual peer selection OR re-notification via alternate channel OR escalation-to-Trustee-Panel for Pariwar-density-insufficient cases) within 24 hours of paging-event is the AC-2 pass/fail signal.

## §7 Rota

- **Rota cross-link:** [`rota.md#peer-mesh`](../rota.md#peer-mesh-rota)
- **Rota cadence:** weekly primary + monthly secondary (recommended-default; per-loop-node negotiation at Task 10 — peer-mesh's low-volume nature warrants lower cadence than claim-filing)
- **NDA discipline:** substantive identity NDA-protected per README §4 invariant 4

## §8 Comms channel

- **Paging surfaces:**
  - `WA` (`comms-templates/whatsapp-channel.md`) — primary paging via the in-Pariwar WA reach
  - `push` (`comms-templates/push-channel.md`) — backup paging
- **Comms-template citations:** substantive template content lives in `docs/degradation-policy/comms-templates/`

## §9 Surface-inventory backfill citations

- **None in `surface-inventory.md` at author-commit** — peer-mesh-specific surface is not yet enumerated in Story 0.4 surface-inventory.md. Surface-inventory amendment is Story 6.6 territory at closure (when Story 6.6 ships, the peer-mesh surface SHOULD be added to surface-inventory.md per the Story 0.4 supersession schema; this loop-node entry's coverage will discharge that future surface-inventory row).
- **Cross-reference impact:** no `backfill-log.md` row for this loop node at author-commit; future Story 6.6 closure will add a surface-inventory row + a corresponding `backfill-log.md` citation slot (per the per-Story-closure rota update cadence committed in README §6).

## §10 Audit-line emission obligation

Per architecture Cross-Cutting #2 + #9 + Story 1.10 substrate:

- Every fallback-handler engagement event for peer-mesh emits an audit line carrying: `loop_node_id = peer-mesh` + handler identity + trigger event (e.g., `automation-precondition-failure: 5-nearest peers cannot be selected — Pariwar density 3`) + outcome (manual-peer-selection-completed OR re-notification-attempted OR Trustee-Panel-escalation-triggered)
- **Substrate:** Story 1.10 tamper-evident audit log primitive
- **Pre-Story-1.10 status:** committed property + procedure shape; substantive emission lands at Story 1.10 closure

## §11 Escalation path on SLA breach

1. **First tier — Operations Lead** — paged via `push` + `email`
2. **Second tier — Trustee Panel chair** — if Operations Lead is unreachable within 30 min, Trustee Panel chair is paged via `push` + `email`; Trustee Panel chair invokes the substitute-handler-bench fallback per `operations-lead-commitment.md` §4 + README §5
3. **Third tier — Story 0.6 backup engineer** — bus-factor-activation engagement mode
4. **Substitute-handler-bench fallback** — per README §5
5. **Story 0.4 degradation-policy framework activation** — if systemic, escalates to the (future) surface-inventory row for peer-mesh

## §12 Cross-references

- **Owning Story:** [Story 0.7](../../../_bmad-output/implementation-artifacts/0-7-p0-1-fallback-handler-ledger-published-with-sla-rota.md)
- **Implementing Stories:** Story 6.6 (peer-mesh evaluator)
- **Discharged surface-inventory rows per §9:** none at author-commit (future Story 6.6 closure may add)
- **Comms templates per §8:** `docs/degradation-policy/comms-templates/whatsapp-channel.md` + `docs/degradation-policy/comms-templates/push-channel.md`
- **On-call playbook incident class:** peer-mesh-coordinator-engagement
- **ADR slots:** per `docs/knowledge-transfer/adr-index.md` Section I — paging-integration ADR slot for peer-mesh; per-loop-node SLA tooling ADR slot for peer-mesh; per-loop-node-ADR backlog slot for peer-mesh
