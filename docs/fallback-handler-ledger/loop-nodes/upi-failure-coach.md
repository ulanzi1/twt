# Loop Node: upi-failure-coach

**Status:** Author-committed 2026-05-30; awaiting Task 9 substantive role naming + Task 10 rota population + Task 11 synthetic SLA test.

**Ledger row:** [`ledger.md` §3 Row 8: upi-failure-coach](../ledger.md#row-8-upi-failure-coach).

## §1 Loop node identity

- **Canonical slug:** `upi-failure-coach`
- **Owning Epic:** Epic 8 (Contribution flow)
- **Implementing Stories:** Story 8.5 (UPI failure coach); cross-cuts Story 8.2 (My Pool card) + Story 8.6 (Yogdaan Bahi contribution timeline)
- **Authority cites:**
  - Architecture §3.4 — contribution-loop substrate + fail-graceful pattern
  - Story 8.5 — automated coach guidance for UPI Intent failures
  - Architecture line 349 (AR-61) + lines 296-298 (Cross-Cutting #9) — `{primary_actor, fallback_actor, escalation_trigger}` shape

## §2 Primary actor + automation surface

- **Primary actor:** Automated coach per Story 8.5 (in-app coach guidance + self-attestation fallback) + the contribution-loop substrate per architecture §3.4
- **Automation surface:**
  - Member initiates contribution via UPI Intent per Story 8.5
  - If UPI Intent returns success, contribution flows through the standard substrate
  - If UPI Intent returns failure, the in-app coach activates: explains the failure, offers retry, offers self-attestation path
  - Self-attestation path lets the member declare "I did pay; here's the reference" and the contribution enters reconciliation queue
  - Yellow-pill-stuck (a UX state where the member sees a pending-pill indefinitely): the coach prompts the member to attempt resolution

## §3 Failure modes

- **UPI Intent failure** — payment gateway unavailable; member cannot complete the contribution via the standard path
- **Self-attestation failure** — member chose self-attestation but the entry fails validation (reference format wrong, missing required fields)
- **Yellow-pill-stuck** — contribution appears pending indefinitely; member is confused; coach cannot resolve without staff intervention
- **External-dependency outage** — UPI provider-level outage; multiple members affected simultaneously

Failure-mode catalogue references:

- Architecture §3.4 contribution-loop substrate + fail-graceful pattern
- Story 8.5 UPI failure coach + self-attestation path
- Architecture Cross-Cutting #9 staff-fallback at every node

## §4 Fallback actor + role

- **Fallback actor:** Contribution-loop staff support + helpline operator
- **Role identity:** `<TO-BE-NAMED-BY-TRUSTEE-PANEL>` (Task 9)
- **Recommended candidates** (per `ledger.md` §3 Row 8): Contribution-loop staff support role under Operations Lead (handles per-contribution stuck cases that automated coach cannot resolve) + Helpline Operator pool (catches the helpline-mediated escalation path)

## §5 Funding posture

- **Funding status:** `unfunded` (author-commit default; Task 9 ratification)
- **Recommended posture:** `retainer-funded` for contribution-loop staff support role (per-contribution-stuck-case retainer; volume scales with contribution volume) + `salary-funded` if contribution-failure volume sustains (per-Pariwar density-dependent; salary-funded posture justified once contribution volume per month exceeds threshold)
- **Rationale subsection:** UPI failures are bursty (correlated with UPI provider-level events) but baseline volume is non-trivial (a fraction of attempted contributions fail per any given UPI cycle). Retainer-funded posture matches baseline; salary-funded justified at higher Pariwar density.

## §6 SLA

- **Acknowledgment window:** ≤1 hr
- **First-action window:** ≤8 hr
- **Completion window:** _(per-case variable; typically same-day for straightforward UPI re-try; 1-2 business days for self-attestation reconciliation)_
- **Rationale subsection:** UPI failure during contribution risks the member dropping out of the contribution-cycle attempt (especially for low-tech-fluency members who associate UPI failure with platform unreliability). The 1-hr ack window matches the typical member retry-attempt cadence (members try again within hours; if not staffed within that window, the member may abandon). The 8-hr first-action allows for per-case investigation. Tighter SLAs would over-cost; looser SLAs would risk contribution-cycle drop-off.
- **Deterministic pass/fail signal:** the fallback handler's first action (per-case investigation initiated + member outreach to resolve OR self-attestation-reconciliation initiated) within 8 hours of paging-event is the AC-2 pass/fail signal.

## §7 Rota

- **Rota cross-link:** [`rota.md#upi-failure-coach`](../rota.md#upi-failure-coach-rota)
- **Rota cadence:** daily primary + weekly secondary (recommended-default — contribution cycles are daily-cadence by nature)
- **NDA discipline:** substantive identity NDA-protected per README §4 invariant 4

## §8 Comms channel

- **Paging surfaces:**
  - `push` (`comms-templates/push-channel.md`) — primary paging
  - `helpline-inbound` — member-initiated escalation path (member calls helpline for contribution issue resolution; not a staff on-call paging surface)
  - `<staff-paging-channel — ADR slot per upi-failure-coach loop node>` — the specific mechanism for paging the on-call contribution-loop staff when automated coach cannot resolve (internal chat, dedicated paging tool, staff WA group — substrate choice is deferred ADR territory per [[feedback_architecture_vs_adr_boundary]]; ADR slot reserved in `docs/knowledge-transfer/adr-index.md` Section I per Story 0.7 Task 7)
- **Comms-template citations:** substantive template content lives in `docs/degradation-policy/comms-templates/`

## §9 Surface-inventory backfill citations

- **Line 46** — "My Pool card" row — `fallback_handler` column carries `P0-1-pending (Helpline operator per UX P0-1 expected)` at author-commit; Task 9 substantively backfills with the named role per `ledger.md` §3 Row 8 (contribution-loop staff support + helpline operator)
- **Line 47** — "Yogdaan Bahi" row — `fallback_handler` column carries `P0-1-pending` at author-commit; Task 9 substantively backfills. **Co-covered with reconciliation.md §9** — the Yogdaan Bahi surface is the contribution-timeline read surface; UPI failures show up on this surface as pending-pill states; reconciliation surfaces them as matcher exceptions; both loop-node entries discharge the same surface-inventory row from their respective sides

Two rows discharged (with co-coverage caveat for Yogdaan Bahi). Per `backfill-log.md` per-row detail.

## §10 Audit-line emission obligation

Per architecture Cross-Cutting #2 + #9 + Story 1.10 substrate:

- Every fallback-handler engagement event for upi-failure-coach emits an audit line carrying: `loop_node_id = upi-failure-coach` + handler identity + trigger event (e.g., `external-dependency-outage: UPI provider-level outage — 12 member contributions stuck`) + outcome (per-case-investigation-initiated OR self-attestation-reconciliation-initiated)
- **Substrate:** Story 1.10 tamper-evident audit log primitive
- **Pre-Story-1.10 status:** committed property + procedure shape

## §11 Escalation path on SLA breach

1. **First tier — Operations Lead** — paged via `push` + `email`
2. **Second tier — Trustee Panel chair** — if Operations Lead is unreachable within 30 min, Trustee Panel chair is paged via `push` + `email`; Trustee Panel chair invokes the substitute-handler-bench fallback per `operations-lead-commitment.md` §4 + README §5
3. **Third tier — Story 0.6 backup engineer** — bus-factor-activation engagement mode (relevant when UPI provider integration is degraded structurally)
4. **Substitute-handler-bench fallback** — per README §5
5. **Story 0.4 degradation-policy framework activation** — if systemic (e.g., Pariwar-wide UPI degradation), escalates to surface-inventory.md "My Pool card" + "Yogdaan Bahi" rows' degradation stances per `docs/degradation-policy/degradation-policy-ledger.md`. Note: surface-inventory.md line 46 documents the Pariwar-degraded-mode cycle-open SMS-bridge activation trigger as the suspension condition for "My Pool card" — UPI failures are upstream of that suspension trigger.

## §12 Cross-references

- **Owning Story:** [Story 0.7](../../../_bmad-output/implementation-artifacts/0-7-p0-1-fallback-handler-ledger-published-with-sla-rota.md)
- **Implementing Stories:** Story 8.5; cross-cuts Story 8.2 + Story 8.6
- **Discharged surface-inventory rows per §9:** `docs/degradation-policy/surface-inventory.md` lines 46 + 47 (Yogdaan Bahi co-covered with reconciliation.md)
- **Comms templates per §8:** `docs/degradation-policy/comms-templates/push-channel.md` + `helpline-inbound`
- **On-call playbook incident class:** upi-failure-coach-contribution-loop-engagement
- **ADR slots:** per `docs/knowledge-transfer/adr-index.md` Section I — paging-integration ADR slot for upi-failure-coach; per-loop-node SLA tooling ADR slot; per-loop-node-ADR backlog slot
