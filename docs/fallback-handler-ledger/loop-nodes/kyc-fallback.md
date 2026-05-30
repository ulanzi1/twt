# Loop Node: kyc-fallback

**Status:** Author-committed 2026-05-30; awaiting Task 9 substantive role naming + Task 10 rota population + Task 11 synthetic SLA test.

**Ledger row:** [`ledger.md` §3 Row 7: kyc-fallback](../ledger.md#row-7-kyc-fallback).

## §1 Loop node identity

- **Canonical slug:** `kyc-fallback`
- **Owning Epic:** Epic 3 (KYC + onboarding)
- **Implementing Stories:** Story 3.3a (DigiLocker provider-interface-abstraction) + Story 3.3b (manual KYC fallback)
- **Authority cites:**
  - A-4 — provider-approval-gating-failure (provider integration unavailability is a structural risk)
  - Story 3.3a — provider-interface-abstraction for KYC providers
  - Architecture line 349 (AR-61) + lines 296-298 (Cross-Cutting #9) — `{primary_actor, fallback_actor, escalation_trigger}` shape

## §2 Primary actor + automation surface

- **Primary actor:** DigiLocker per Story 3.3a (external dependency mediated through the provider-interface-abstraction)
- **Automation surface:**
  - Member initiates KYC during onboarding (Epic 3)
  - App invokes the DigiLocker integration per the provider-interface-abstraction
  - DigiLocker returns the member's verified identity document + signature
  - App validates the document + signature; advances the member to next onboarding step

## §3 Failure modes

- **DigiLocker downtime** — provider unavailable; KYC cannot complete via the automated path
- **Signature-verification failure** — DigiLocker returns document but signature validation fails (cryptographic mismatch, expired certificate)
- **Provider-approval-gating-failure per A-4** — the trust's DigiLocker integration approval is revoked or rate-limited
- **Document-quality rejection** — DigiLocker returns document but the document is not the expected class (e.g., wrong identity-document type)

Failure-mode catalogue references:

- A-4 provider-approval-gating
- Story 3.3a provider-interface-abstraction
- Architecture Cross-Cutting #9 staff-fallback at every node

## §4 Fallback actor + role

- **Fallback actor:** Manual KYC reviewer (staff role)
- **Role identity:** `<TO-BE-NAMED-BY-TRUSTEE-PANEL>` (Task 9)
- **Recommended candidates** (per `ledger.md` §3 Row 7): manual KYC reviewer role under Operations Lead — a staff role that (a) accepts manually-uploaded identity documents from the member, (b) verifies the document against known patterns, (c) approves the member's KYC step manually + logs the approval

## §5 Funding posture

- **Funding status:** `unfunded` (author-commit default; Task 9 ratification)
- **Recommended posture:** `retainer-funded` initially (KYC fallback volume is low when DigiLocker works; spikes during provider outages), transitioning to `salary-funded` as KYC fallback volume sustains
- **Rationale subsection:** KYC fallback is structurally bursty — low baseline volume but spikes during DigiLocker outages or provider-approval-gating events. Retainer-funded posture matches the bursty profile; salary-funded would only be justified if structural baseline volume rose (e.g., if the trust onboards demographics where DigiLocker uptake is low).

## §6 SLA

- **Acknowledgment window:** ≤2 hr
- **First-action window:** ≤24 hr
- **Completion window:** _(typically same-day for straightforward manual KYC; 1-2 business days for edge cases)_
- **Rationale subsection:** KYC fallback is onboarding-window-constrained — members in the joining flow expect KYC completion within a day to proceed (the joining-flow drop-off rate scales with KYC-completion latency). The 2-hr ack ensures Operations Lead is paged within business hours; the 24-hr first-action matches typical manual-KYC review cycles. Tighter SLAs would over-cost the low-baseline-volume role; looser SLAs would risk joining-flow drop-off.
- **Deterministic pass/fail signal:** the fallback handler's first action (manual review initiated + member outreach for additional documents if needed) within 24 hours of paging-event is the AC-2 pass/fail signal.

## §7 Rota

- **Rota cross-link:** [`rota.md#kyc-fallback`](../rota.md#kyc-fallback-rota)
- **Rota cadence:** weekly primary + biweekly secondary (recommended-default)
- **NDA discipline:** substantive identity NDA-protected per README §4 invariant 4

## §8 Comms channel

- **Paging surfaces:**
  - `push` (`comms-templates/push-channel.md`)
  - `WA` (`comms-templates/whatsapp-channel.md`)
- **Comms-template citations:** substantive template content lives in `docs/degradation-policy/comms-templates/`

## §9 Surface-inventory backfill citations

- **None in `surface-inventory.md` at author-commit** — KYC-specific surface not yet enumerated in Story 0.4 surface-inventory.md. Surface-inventory amendment is Story 3.3b territory at closure (when Story 3.3b ships, the KYC fallback surface SHOULD be added to surface-inventory.md per the Story 0.4 supersession schema; this loop-node entry's coverage will discharge that future surface-inventory row).
- **Cross-reference impact:** no `backfill-log.md` row for this loop node at author-commit; future Story 3.3b closure will add a surface-inventory row + a corresponding `backfill-log.md` citation slot.

## §10 Audit-line emission obligation

Per architecture Cross-Cutting #2 + #9 + Story 1.10 substrate:

- Every fallback-handler engagement event for kyc-fallback emits an audit line carrying: `loop_node_id = kyc-fallback` + handler identity + trigger event (e.g., `external-dependency-outage: DigiLocker downtime — provider unavailable since timestamp T`) + outcome (manual-review-initiated OR member-outreach-for-additional-documents)
- **Substrate:** Story 1.10 tamper-evident audit log primitive
- **Pre-Story-1.10 status:** committed property + procedure shape

## §11 Escalation path on SLA breach

1. **First tier — Operations Lead** — paged via `push` + `email`
2. **Second tier — Trustee Panel chair** — if Operations Lead is unreachable within 30 min, Trustee Panel chair is paged via `push` + `email`; Trustee Panel chair invokes the substitute-handler-bench fallback per `operations-lead-commitment.md` §4 + README §5
3. **Third tier — Story 0.6 backup engineer** — bus-factor-activation engagement mode (relevant when DigiLocker integration is degraded; backup engineer may diagnose provider-integration issues)
4. **Substitute-handler-bench fallback** — per README §5
5. **Story 0.4 degradation-policy framework activation** — if systemic, escalates to the (future) surface-inventory row for KYC fallback

## §12 Cross-references

- **Owning Story:** [Story 0.7](../../../_bmad-output/implementation-artifacts/0-7-p0-1-fallback-handler-ledger-published-with-sla-rota.md)
- **Implementing Stories:** Story 3.3a + Story 3.3b
- **Discharged surface-inventory rows per §9:** none at author-commit (future Story 3.3b closure may add)
- **Comms templates per §8:** `docs/degradation-policy/comms-templates/push-channel.md` + `docs/degradation-policy/comms-templates/whatsapp-channel.md`
- **On-call playbook incident class:** kyc-fallback-manual-reviewer-engagement
- **ADR slots:** per `docs/knowledge-transfer/adr-index.md` Section I — paging-integration ADR slot for kyc-fallback; per-loop-node SLA tooling ADR slot; per-loop-node-ADR backlog slot
