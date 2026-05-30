# Loop Node: claim-filing

**Status:** Author-committed 2026-05-30; awaiting Task 9 substantive role naming + Task 10 rota population + Task 11 synthetic SLA test.

**Ledger row:** [`ledger.md` §3 Row 1: claim-filing](../ledger.md#row-1-claim-filing).

## §1 Loop node identity

- **Canonical slug:** `claim-filing`
- **Owning Epic:** Epic 6 (Claim flow)
- **Implementing Stories:** Story 6.2 (claim creation) + Story 6.3 (claim documentation upload). Cross-cutting AR-61 commitment per epics line 2267 — this loop node is the staff-fallback path for the broader claim-flow Story set (6.2, 6.3, 6.5, 6.10, 6.11, 6.12, 6.14, 6.16); those Stories cite this ledger row rather than re-implementing the staff-fallback path.
- **Authority cites:**
  - UX spec — Ravi-class member archetype (claim-flow dual-path: member app OR helpline-mediated) + Helpline Operator console authority
  - PRD §9.1.1 — claim processing is highest-stakes/dignity coupling; "the degraded posture explicitly does NOT pause claim processing" (cited in `surface-inventory.md` line 49)
  - Architecture §3.5 — helpline path remains primary fallback for claim filing
  - Architecture line 349 (AR-61) + lines 296-298 (Cross-Cutting #9) — `{primary_actor, fallback_actor, escalation_trigger}` shape
  - Epics line 2267 — cross-cutting AR-61 commitment for claim-flow Stories

## §2 Primary actor + automation surface

- **Primary actor:** Member app (Ravi-mode) — the bereaved relative initiates a claim through the member app's claim-filing flow OR the Helpline Operator (when the member's bereavement context requires helpline-mediated path per UX Helpline Operator console authority)
- **Automation surface (what the node does when the software path works):**
  - Member opens the claim-filing screen (Ravi-mode UX optimized for grief-state cognitive constraints)
  - App authenticates the member, links the claim to the deceased member's pariwar
  - App captures the bereavement event (date, cause if member chooses to disclose, relation to deceased)
  - App accepts document uploads (death certificate, ID proof, optional witness statements) per Story 6.3
  - App writes the claim record via `events.claim_created` per Story 6.2 + audit-line per architecture Cross-Cutting #2
  - Helpline Operator path: operator console captures the same fields via a structured intake form when the member calls helpline; the path produces an equivalent `events.claim_created` event

## §3 Failure modes

When the software path fails, the failure modes drive the fallback engagement:

- **Claim-creation API failure** — backend exception during claim record write (database unavailable, schema validation rejection, idempotency-key collision); Ravi-mode member sees error and may abandon the flow at the worst possible moment
- **Document-upload pipeline failure** — file storage write failure, virus-scan timeout, OCR pipeline backpressure; member's upload appears successful but the claim record is incomplete
- **Provider integration failure** — DigiLocker-based identity-proof verification failure per A-4 provider-approval-gating; member cannot complete the claim because the verification step blocks
- **Member-archetype-specific failure** — Ravi-class member (low-tech-fluency, grief-state) cannot complete the app path despite no software failure; the Helpline Operator console captures the claim
- **External-dependency outage** — Helpline carrier-level outbound failure (per architecture §3.5 outbound asymmetry); helpline-mediated path falls to in-app fallback OR public-page-banner cite

Failure-mode catalogue references:

- Architecture §3.4 fail-graceful pattern (in-app banner on next open showing missed alerts)
- Architecture §3.5 inbound/outbound asymmetry
- Architecture Cross-Cutting #9 staff-fallback at every node
- UX §Phase-0 P0-1 launch-blocker statement (this loop node is the canonical instance of the launch-gate property)

## §4 Fallback actor + role

- **Fallback actor:** Helpline Operator + claim-shepherd staff (Task 9 — Trustee Panel + Operations Lead substantively name the role)
- **Role identity:** `<TO-BE-NAMED-BY-TRUSTEE-PANEL>` (per `[deferred ADR — placeholder procedure]` discipline inherited from Stories 0.4 + 0.5 + 0.6)
- **Recommended candidates** (per `ledger.md` §3 Row 1 + Story 0.4 `surface-inventory.md` line 49): Helpline Operator pool (existing UX-spec'd role for helpline-mediated path) + dedicated claim-shepherd staff role (specialized handler for bereavement-context claims, cross-trained on grief-aware communication per UX Ravi-mode design)

## §5 Funding posture

- **Funding status:** `unfunded` (author-commit default; Task 9 ratification)
- **Recommended posture:** `retainer-funded` for Helpline Operator pool (the operator pool is already a `retainer-funded` candidate per the helpline operations model) + `salary-funded` for dedicated claim-shepherd staff (the bereavement-context-specialist role warrants dedicated salary funding given the claim-flow being highest-stakes/dignity coupling)
- **Rationale subsection** (per `README.md` §7 ledger-vs-per-loop-node-file reconciliation): claim-filing is the highest-stakes loop node per PRD §9.1.1; volume-per-week scales with member-base bereavement events; per-Pariwar density-dependent. The retainer/salary split protects the bereavement-context member from a "no one is available" moment by ensuring at least one role is always on the rota.
- **Trustee Panel + Story 0.12 P0-3 spec-to-cadence reconciliation** will determine the substantive retainer-vs-salary-vs-volunteer-bridge posture at Task 9 ratification + per-loop-node negotiation. Funding-tradeoff (claim-shepherd salary vs cut-scope per Story 0.12) is the appropriate forum for the long-term posture.

## §6 SLA

- **Acknowledgment window:** ≤30 min
- **First-action window:** ≤4 hr
- **Completion window:** _(not applicable for first-version SLA — completion windows for claim-flow are governed by Story 6.x SLAs, not by the fallback handler engagement SLA; the fallback handler's first-action is the deterministic pass/fail signal)_
- **Rationale subsection** (per Open Question #5 recommended posture — per-loop-node entry §6 carries the rationale; ledger §3 row carries the one-liner): claim filing is the highest-stakes/dignity coupling per PRD §9.1.1. The 30-minute ack window is justified by the bereavement-context member-facing-immediacy + Helpline Operator console design assumption that members reach a real human within minutes. The 4-hour first-action window accounts for the operator triage cycle (document review, member callback, claim record creation/correction). Tighter SLAs would require always-on dedicated coverage (cost) without proportional member benefit; looser SLAs would risk the bereaved member abandoning the claim flow at the worst possible moment.
- **Deterministic pass/fail signal:** the fallback handler's first action (claim record created OR documented continuation plan for the member) within 4 hours of paging-event is the AC-2 pass/fail signal for synthetic SLA testing per Task 11.
- **Substantive SLA ratification** at Task 9 per-loop-node ratification + Task 10 ≥2-trustee sign-off may amend these windows; the amendment is logged in `ledger.md` §7 Pack-revision log per the supersession schema.

## §7 Rota

- **Rota cross-link:** [`rota.md#claim-filing`](../rota.md#claim-filing-rota) (substantively populated at Task 10; carries `pending-rota-population` placeholders at author-commit)
- **Rota cadence:** weekly primary + biweekly secondary (recommended-default; per-loop-node negotiation at Task 10 — claim-filing's high-stakes nature warrants always-on coverage that biweekly secondary alone may not provide; the rota may evolve to daily primary as Pariwar density grows)
- **NDA discipline:** substantive `primary_handler_contact_ref` + `secondary_handler_contact_ref` are NDA territory per README §4 invariant 4; substantive identity is stored out-of-band per operations policy + recorded with redacted-identity hash + last-engagement-event-date for accountability

## §8 Comms channel

- **Paging surfaces:**
  - `helpline-inbound` (member-facing inbound channel — member calls helpline; helpline inbound carrier routes to available Helpline Operator; helpline outbound is degraded-mode per architecture §3.5; this is not a staff on-call paging surface)
  - `push` (`comms-templates/push-channel.md`) — in-console push notification for the operator pool when the inbound carrier routes a bereavement-context call
  - `public-page-banner` (`comms-templates/public-page-banner.md`) — for cases where the claim landing flows through twt.org public surface (e.g., member opens the claim flow from a public-facing twt.org link)
  - `<staff-paging-channel — ADR slot per claim-filing loop node>` — the specific mechanism for paging the on-call fallback handler when no operator is on shift (internal chat, dedicated paging tool, staff WA group — substrate choice is deferred ADR territory per [[feedback_architecture_vs_adr_boundary]]; ADR slot reserved in `docs/knowledge-transfer/adr-index.md` Section I per Story 0.7 Task 7)
- **Comms-template citations:** the substantive template content lives in `docs/degradation-policy/comms-templates/`; this entry only cross-links

## §9 Surface-inventory backfill citations

The Story 0.4 `surface-inventory.md` rows discharged by this loop-node entry:

- **Line 49** — "Ravi-mode claim filing" row — `fallback_handler` column carries `P0-1-pending (Helpline Operator + claim-shepherd staff per UX P0-1)` at author-commit; Task 9 substantively backfills with the named role per `ledger.md` §3 Row 1
- **Line 57** — "Helpline Operator console" row — `fallback_handler` column carries `P0-1-pending (Helpline shift supervisor; carrier-level auto-attendant per §3.5 inbound fallback)` at author-commit; this row is **co-covered** by `helpdesk` loop-node entry §9 (the Helpline Operator console serves both claim-filing inbound + helpdesk inbound; the `surface_inventory_xref` column in `ledger.md` §3 reflects the multi-loop-node coverage)

Two rows discharged from this entry (with co-coverage caveat). Per `backfill-log.md` per-row detail, each row's citation slot is committed at author-commit; substantive text replacement is Task 9 territory.

## §10 Audit-line emission obligation

Per architecture Cross-Cutting #2 + #9 + Story 1.10 substrate (tamper-evident audit log primitive):

- Every fallback-handler engagement event for this loop node emits an audit line carrying: `loop_node_id = claim-filing` + handler identity (the substantive `fallback_handler_role` from `ledger.md` §3) + trigger event (`automation-failure-detected` qualifier identifying which failure mode per §3) + outcome (handler ack timestamp + first-action timestamp + completion-or-escalation outcome)
- **Substrate:** Story 1.10 tamper-evident audit log primitive (`events.audit_log` table per architecture §audit-log invariants; hash-chained per architecture Cross-Cutting #2)
- **Pre-Story-1.10 status:** committed property + procedure shape; substantive emission lands at Story 1.10 closure. Pre-Story-1.10, the engagement event is logged informally in `ledger.md` §6 Synthetic SLA test log gap-list per the gap-recording discipline
- **Audit-line shape ADR:** reserved in `docs/knowledge-transfer/adr-index.md` Section I per Story 0.7 Task 7 (one framework-level slot + per-loop-node sub-slot for claim-filing-specific audit-line fields if any)

## §11 Escalation path on SLA breach

The escalation path applies when the fallback handler fails to ack within the documented ack window OR fails first-action within the documented first-action window:

1. **First tier — Operations Lead** — Operations Lead is paged via `push` + `email`; takes over the fallback engagement OR re-routes to a different on-rota handler per the substitute-handler procedure
2. **Second tier — Trustee Panel chair** — if Operations Lead is unreachable within 30 min, Trustee Panel chair is paged via `push` + `email`; Trustee Panel chair invokes the substitute-handler-bench fallback per `operations-lead-commitment.md` §4 + README §5
3. **Third tier — Story 0.6 backup engineer** — per `docs/backup-engineer/scope-of-work.md` §3 bus-factor-activation engagement mode; invoked when Operations Lead + Trustee Panel chair are both unreachable (rare — bus-factor-of-one continuity scenario)
4. **Substitute-handler-bench fallback** — invoked per README §5 if Operations Lead hire is deferred; substitute bench (Trustee Panel + Story 0.6 backup engineer + named trustee-on-rota) covers the loop-node fallback at degraded operational responsiveness
5. **Story 0.4 degradation-policy framework activation** — if the SLA breach is systemic (e.g., multiple consecutive synthetic SLA tests failing; multiple real-world breaches in a calendar quarter), the breach is escalated to the surface-inventory.md `Ravi-mode claim filing` row's degradation stance per `docs/degradation-policy/degradation-policy-ledger.md`; the systemic-breach pattern may justify a Pariwar-degraded-mode declaration per Story 0.4 README §3

## §12 Cross-references

- **Owning Story:** [Story 0.7 — P0-1 Fallback-Handler Ledger](../../../_bmad-output/implementation-artifacts/0-7-p0-1-fallback-handler-ledger-published-with-sla-rota.md)
- **Implementing Stories per `owning_epic + stories`:** Story 6.2 (claim creation) + Story 6.3 (claim documentation upload); cross-cuts Stories 6.5, 6.10, 6.11, 6.12, 6.14, 6.16 per Epic 6 line 2267
- **Discharged surface-inventory rows per §9:** `docs/degradation-policy/surface-inventory.md` lines 49 + 57
- **Comms templates per §8:** `docs/degradation-policy/comms-templates/push-channel.md` + `docs/degradation-policy/comms-templates/public-page-banner.md`
- **On-call playbook incident class** (per Story 0.5 KT pack on-call playbook): claim-filing-fallback-handler-engagement (the on-call playbook references this loop-node entry §6 SLA + §11 escalation path)
- **Related continuity surfaces:** README §9 + this framework's `ledger.md` §10
- **ADR slots:** per `docs/knowledge-transfer/adr-index.md` Section I per Story 0.7 Task 7 — paging-integration ADR slot for claim-filing; per-loop-node SLA tooling ADR slot for claim-filing; per-loop-node-ADR backlog slot for claim-filing (slot-reserved-pre-write)
