# Scope of Work — Backup Engineer

> **Status:** drafted
> **Owner role:** Trustee Panel (scope ratification per Story 0.6 Task 8); Solo Builder (technical-fit assessment per Launch Gate Risks); Backup Engineer (mode execution)
> **Architectural authority:** PRD §9.1.1 paragraph 6; PRD A-13; architecture §5.10 (lines 3375-3414); architecture §5.4 (lines 3074-3087 — promotion-approver backup + WIF trust-relationship recovery); architecture §5.6 (line 3181 — quarterly capacity review); architecture §2.10a (audit-mirror separation); architecture §5.9 (high-sensitivity tier separation); architecture Cross-Cutting #9 (staff-fallback at every node); architecture Cross-Cutting #2 (audit-line emission); architecture lines 4031-4037 (Multi-actor controls in degraded mode); AR-67

## Property / control / policy assertion

This document commits the **property** + **policy**: the engagement modes + the exclusions. Specific tooling (which CLI tool the Engineer uses for staging deploys; which paging integration handles the activation request; specific GCP role IDs; specific surge billing rate) is **operations-policy + ADR territory** per [[feedback_architecture_vs_adr_boundary]] and is enumerated in `README.md` §8 Open ADR slots + cross-referenced to `../knowledge-transfer/adr-index.md` Section H.

The exclusions (§5) are **bounded + explicit**: any action not enumerated in §1–§4 engagement modes is implicitly out-of-scope; any action enumerated in §5 is explicitly forbidden regardless of engagement mode.

## §1. Engagement mode — Daily-ops read-only investigation

**Trigger:** Continuous (no specific trigger event); the Engineer holds the engagement mode for the entire contract term.

**Activities:**

- **Read-only access** to repo + KT pack + runbooks + escrow framework documents + degradation policy framework documents + architecture / PRD / epics planning artifacts per `access-grant-procedure.md` §2.
- **Quarterly capacity-review participation** per architecture §5.6 + §3181 — "Reviewed by Solo Builder + a trustee (and backup engineer once contracted per A-13). Catches drift before it becomes an incident." The Engineer reviews:
  - Traffic patterns (cycle-open peaks, post-cycle decay, helpdesk volumes);
  - Storage growth (audit log, snapshots, statements, recordings);
  - Cost trends (per-Pariwar, per-environment, per-service);
  - Recovery posture (drill outcomes, RTO/RPO actuals vs targets).
- **Quarterly threat-actor inventory participation** per architecture §2.1 — the Engineer contributes external-threat-model observations from their independent perspective; helps prevent inventory drift (Tier C discipline).
- **Quarterly access-review participation** per architecture §Control-Demonstration Schedule — the Engineer's own IAM grant is part of the audit scope (separation of duties: the Engineer does NOT review their own grant; trustee + Solo Builder review the Engineer's grant); the Engineer reviews other principals' grants to surface anomalies (Tier C discipline).
- **Quarterly friction-budget review participation** — the Engineer contributes member-experience-from-outside observations.

**Time commitment:** ≥ 4 hours/quarter at minimum (specific commitment finalized in contract §3 retainer schedule at Task 10). **Story 0.12 note:** The backup engineer retainer budget is a Story 0.12 P0-3 spec-to-cadence reconciliation territory item — if the reconciliation selects a contract-help decision-path (per `docs/spec-to-cadence-reconciliation/reconciliation-decision-framework.md §3(c)`), the retainer-sizing discipline here may interact with the contracted-engineering budget; Trustee Panel funding-decision authority governs both. Story 0.12 P0-3 spec-to-cadence reconciliation framework author-committed 2026-06-01 at `docs/spec-to-cadence-reconciliation/` per Decision 2026-06-01-012; substantive reconciliation outcome pending Tasks 7–11. **Story 0.13 note:** The backup-engineer contract-template §6 NDA + §9 Insurance + §10 Termination + §11 Dispute resolution substantive language counsel-return placeholders cross-reference Story 0.13 legal-counsel-engagement framework author-committed 2026-06-02 at `docs/legal-counsel-engagement/` per Decision 2026-06-02-013; substantive counsel return on contract-template (Story 0.6 Task 9 unblock event) pending Task 11 of Story 0.13 (artifact `backup-engineer-contract-substantive-language-v1` priority-7 row in `docs/legal-counsel-engagement/review-artifact-roster.md`). **Story 0.14 note:** The Story 0.14 P0-5 native-stack validation experiment prototype-build (Story 0.14 Task 9 ~2-week Expo + RN + Tamagui prototype-engineering scope) is a candidate contract-help-path scope per `docs/spec-to-cadence-reconciliation/reconciliation-decision-framework.md` §3(c) Story 0.14 note + Decision 2026-06-01-012 body item 9 ("external native-stack validation engineering" contracted-help-path eligibility); if Story 0.12 reconciliation ratifies a contract-help-path that includes external-native-stack-validation-engineering scope, the backup engineer's surge engagement mode (§3) MAY be the vehicle for that external engineering effort cross-coupled with the Story 0.14 device-procurement budget at `docs/native-stack-validation/device-procurement-roster.md` Rows 1-3. Story 0.14 framework author-committed 2026-06-02 at `docs/native-stack-validation/` per Decision 2026-06-02-014; substantive prototype-build pending Story 0.14 Task 9 — engagement-vehicle decision pending Story 0.12 reconciliation outcome. **Story 0.15 note:** The A-13 backup engineer retainer is Row 1 of the architectural launch-gate inventory per `docs/launch-gate-inventory/inventory-roster.md` (architecture line 4778 verbatim "A-13 backup engineer retainer | Trustee Panel | BigDev (technical-fit assessment)"); Row 1 `current_status = closed` at Story 0.15 author-commit per closure-status-aggregation discipline (framework-leg discharge via Decision 2026-05-30-006). The Story 0.15 monthly review cadence verifies Row 1 closure-evidence-link integrity per `docs/launch-gate-inventory/monthly-review-cadence-protocol.md` §2 agenda item 1 + §7 annual re-attestation walk-through; if Story 0.6 Tasks 7-11 substantive engagement retracts (e.g., backup-engineer-candidate withdraws OR contract terminates), Row 1 supersedes back to `open` per `docs/launch-gate-inventory/escalation-protocol.md` §1 trigger 4 (cross-Story discharge-path Story status retreat). Story 0.15 framework author-committed 2026-06-03 at `docs/launch-gate-inventory/` per Decision 2026-06-03-015.

**Write/admin access:** **None.** Daily-ops mode is strictly read-only. Any write/admin action requires a separate engagement-mode trigger (surge or bus-factor) per §2 or §3.

**Audit-line emission obligation:** Every access (read-only repo clone; KT pack read; framework document read; quarterly review participation) is **automatically audit-logged** per architecture §1.5 + Cross-Cutting #2. The Engineer does NOT need to manually emit audit lines for daily-ops mode; the access logs cover the audit obligation. The trustee-conducted periodic review (per `README.md` §6 quarterly cadence) examines the audit logs to confirm the Engineer's access pattern is consistent with the quarterly cadence.

**Closure:** Daily-ops mode is continuous; there is no per-event closure. The cadence-participation events have per-event closure logged in the respective review's record.

## §2. Engagement mode — Surge engagement

**Trigger:** Solo Builder requests parallel work on a named scope (bug investigation, OCR-parity issue, parser update, observability tuning, ADR drafting collaboration, runbook revision, etc.). Surge engagement may also be triggered by:
- Trustee Panel request for a scope-specific investigation (e.g., audit-log integrity-check anomaly investigation post-Story-1.10);
- Cross-Story-coordination need (e.g., Story 2.4 Niyamavali amendment workflow review collaboration);
- Pre-launch readiness assessment (e.g., Story 0.15 architectural launch-gate inventory contribution).

**Activities:**

- The Engineer executes the named scope per the surge request.
- **Write/admin access is scoped per request** with Solo Builder co-sign per architecture §5.10. The co-sign is a per-action approval, NOT a blanket grant for the surge duration. Example: surge engagement to update the bank-parser allowlist requires Solo Builder co-sign on each commit; the Engineer does NOT receive merge authority for the surge duration.
- **Surge does NOT activate bus-factor.** Solo Builder remains reachable + on-call during surge; the Engineer is supplementary capacity, not replacement.
- **Surge does NOT unlock audit-mirror credentials.** Audit-mirror credential retrieval requires bus-factor activation + trustee co-sign per the §2.10a structural fix (Story 0.2 review Decision 3); surge mode is bounded to non-audit-mirror scope.

**Billing:** Per-hour billable rate per contract §4 (specific rate finalized at Task 10).

**Surge engagement output** (commits, ADRs, runbook revisions, documentation contributions) is attributed to the Engineer in the audit trail per architecture §1.5 + Cross-Cutting #2.

**Audit-line emission obligation:** Every commit, ADR, runbook revision, or documentation change emits an audit line per architecture §1.5 + Cross-Cutting #2. The audit-line schema for surge engagement carries: `{engagement_mode: "surge", request_id, requesting_actor: "solo_builder" | "trustee_panel", scoped_action, co_sign_actor: "solo_builder", co_sign_reference}`. The co-sign reference is the verifiable signature artifact (commit co-sign, ADR ratification entry, runbook re-sign).

**Closure:** Per-surge-event closure recorded in `backup-engineer-ledger.md` "Surge engagement log" with: request date + Solo-Builder originating event + scope-of-work attestation + duration + billing-event reference + Solo-Builder co-sign reference + audit-log reference.

## §3. Engagement mode — Bus-factor activation

**Trigger:** One of:
- Solo Builder unreachable >7 days per PRD §9.1.1 paragraph 4 (the architectural threshold for bus-factor activation);
- Trustee-declared incapacitation (Solo Builder reachable in principle but trustee-declared unfit for engineering decisions — e.g., medical incapacitation, conflict-of-interest blocking, etc.). **Declaration procedure:** ≥2 trustees must agree on the incapacitation finding; the declaration is recorded as a `.decision-log.md` `[CONTINUITY]` entry citing the triggering condition + the declaring trustees + an estimated incapacitation duration. A single trustee cannot unilaterally declare incapacitation (quorum rule per `README.md` §5 applies). If ≥2 trustees are unavailable (quorum-unavailable scenario), the emergency-single-trustee fallback per `README.md` §5 applies; the single-trustee declaration is time-bounded 90 days and the 90-day expiry consequence per `README.md` §5 governs.
- Bus-factor activation is **always trustee-authorized** per `activation-procedure.md` structural-invariant block + `README.md` §4 invariant 3.

**Activities:**

- The Engineer takes over on-call duties per `../knowledge-transfer/on-call-playbook.md` (the 13 incident classes; the §5 escalation list).
- **Write/admin requires per-action trustee approval** per architecture §5.10 break-glass path. The trustee co-sign mechanism is operations-policy territory per `README.md` §8 deferred-ADR slot 3; until operations policy formalizes the mechanism, the interim is: written `.decision-log.md` `[CONTINUITY]` entry per write/admin action citing trustee approver + action + timestamp + post-action audit-line reference.
- **Audit-mirror credential retrieval becomes available** per the §2.10a structural fix (Story 0.2 review Decision 3): the Engineer is the non-Solo-Builder principal that the structural fix requires; trustee-quorum-open per Story 0.2 sealing-procedure §1 unsealable the audit-mirror-credential envelope; the Engineer retrieves the credentials with trustee co-sign + audit-line emission.
- **Break-glass path with audit + paging** per architecture §5.10 — every break-glass action emits a P0-class audit line AND pages a backup-alert path (per §5.10 backup alert path property: ≥2 delivery paths for P0-class alarms).

**Activation duration:** Per trustee discretion until Solo Builder returns OR succession plan activates. The discretion is bounded by the architecture §Enforcement Tiers Tier C degraded-mode protocol (lines 4914-4929): degraded mode is honest about solo-build reality; it is not an indefinite license to bypass; A-13 contracting activates Tier C controls; bus-factor activation under A-13 keeps Tier C controls active.

**Audit-line emission obligation:** Every write/admin action during bus-factor activation emits an audit line per architecture §1.5 + Cross-Cutting #2. The audit-line schema for bus-factor mode carries: `{engagement_mode: "bus-factor", activation_event_id, action_class: "write" | "admin" | "audit-mirror-credential-retrieval" | "production-promotion" | "secret-rotation", scoped_resource, trustee_co_sign_actor, co_sign_reference, paging_event_id, post_action_verification_check_result}`. The audit lines are reviewed by the trustee per the §5.10 "Activity audit-logged + periodically reviewed by a trustee" property.

**Closure:** Bus-factor activation event closure recorded in `backup-engineer-ledger.md` "Activation event log" with: activation date + activating trustee + activation reason + activation duration + actions taken + audit-line references + post-event post-mortem reference (per `README.md` §6 on-activation cadence).

**Story 0.7 disjoint-anchor distinction** (added per Story 0.7 Decision 2026-05-30-007 Task 7 cross-reference edit): Bus-factor activation per this §3 is bus-factor-of-one continuity (the engineering layer; Solo Builder unreachable). It is **distinct from** the loop-node operational-responsiveness fallback per Story 0.7 (the operations layer; per-loop-node automation failure). The backup engineer is paged per Story 0.7 only as the **third-tier escalation** per `docs/fallback-handler-ledger/loop-nodes/<id>.md` §11 when Operations Lead + Trustee Panel chair are both unreachable — NOT as the primary per-loop-node fallback handler. The two engagement-mode portfolios have disjoint closure semantics per `docs/fallback-handler-ledger/README.md` §10.

## §4. Engagement mode — Comprehension administration participation

**Trigger:** Story 0.5 Task 9 administration event:
- **First administration:** scheduled as part of `onboarding-checklist.md` §2(e) onboarding session (Story 0.6 Task 11 closure).
- **Annual re-administration:** per Story 0.5 README §6 cadence (annual; trustee-scheduled).
- **Post-pack-revision re-administration:** scheduled after material KT pack revisions per Story 0.5 README §6 + Pack-revision log gap-discharge cycle.
- **Post-failed-administration re-administration:** scheduled after pack-revision per Story 0.5 Task 10 (if a prior administration scored <80% OR surfaced `unanswerable-from-pack` gaps).

**Re-administration retry cap:** consistent with `onboarding-checklist.md` §3.2 two-attempt discipline, re-administration for ongoing engagement follows a two-attempt cycle before triggering Trustee Panel + BigDev technical-fit re-evaluation: first re-administration after pack-revision; if threshold still not met on second re-administration, Trustee Panel + BigDev evaluate whether to scope-narrow the engagement (e.g., retain engineer for surge only, not bus-factor), defer to a third attempt after further remediation, or trigger the alternate-engineer process per `README.md` §8 deferred-ADR slot 5. The re-administration cycle resets after each material pack revision.

**Activities:**

- The Engineer reads the KT pack (`../knowledge-transfer/` — README + adr-index + niyamavali-fr-mapping + deployment-topology + on-call-playbook + third-party-dependency-inventory) **cold** (no Solo Builder consultation; bus-factor simulation discipline applies per Story 0.5 AC-3 inherited from Story 0.1 AC-4 + Story 0.2 AC-3 + Story 0.3 AC-2 + Story 0.4 AC-2).
- Completes the comprehension questionnaire (`../knowledge-transfer/comprehension-questionnaire.md`) under timed conditions (≤ 4 hours recommended per Story 0.5 AC-3).
- The trustee facilitator scores per `../knowledge-transfer/comprehension-questionnaire-answer-key.md` rubric.

**Threshold:** **≥ 80%** computed as `(correct × 1.0 + partial × 0.5) / 30 ≥ 0.80` per Story 0.5 AC-3. **The threshold cannot be lowered** without a Trustee Panel `.decision-log.md` `[CONTINUITY]` entry per `../knowledge-transfer/README.md` §4 invariant 5 (no-question-lowering rule).

**Billing:** Included in the retainer per contract §3 (no separate billing for comprehension administration). **Billing-mode precedence rule:** comprehension administration is always retainer-covered regardless of which engagement mode is concurrently active. If a comprehension re-administration falls due while bus-factor activation (§3) is in progress, the retainer governs for the comprehension session itself — no surge billing applies to the comprehension administration time. Time spent on bus-factor incident response during the same period continues to bill at the surge rate per §3.

**Audit-line emission obligation:** The administration event is logged in `../knowledge-transfer/kt-pack-ledger.md` "Comprehension administration log" (primary record per Story 0.5 ownership) + cross-referenced in `backup-engineer-ledger.md` "Comprehension administration log" section.

**Closure:** Per-administration closure recorded in `kt-pack-ledger.md` row with: administering trustee + backup engineer identity + administration date + time taken + per-section score breakdown + gap-list + remediation plan per gap + joint-discharge contribution + re-administration schedule.

## §5. Exclusions — binding regardless of engagement mode

The following actions are **explicitly forbidden** regardless of which engagement mode is active. The Engineer MUST NOT execute any of these without an explicit contract amendment ratified per Story 0.6 Task 8 material-edit threshold + the specific exclusion's removal authorized by the Trustee Panel.

| # | Exclusion | Architecture authority | Rationale |
|---|---|---|---|
| 1 | Member-data access without trustee co-sign + audit-line emission | Cross-Cutting #2 + §1.5 + §2.7 PII tiering | Member data is the trust's highest-sensitivity surface; any access requires explicit dual-authorization |
| 2 | PII-tier credential access without trustee co-sign | §5.9 high-sensitivity tier + §2.7 KEK roots | Tier-1 PII envelope-encryption keys + Tier-2 HMAC blind-index keys are dual-authorization-only |
| 3 | Single-principal write to production | §5.10 backup-engineer access posture (read-only default; write/admin requires per-action approval) | Per-action co-sign is the property; bypassing it collapses the dual-control mechanism |
| 4 | Single-principal staging→prod promotion | §5.4 promotion-approver backup (≥2 principals: Solo Builder + backup engineer minimum) | Promotion is a multi-actor control; single-principal promotion violates the property |
| 5 | KEK-root destruction approval | §5.9 KEK-roots destruction discipline + Multi-actor controls in degraded mode (architecture lines 4031-4037) | KEK destruction is permanent + irreversible; requires the ≥ 2-actor pattern with 30-day delayed-destruction window |
| 6 | Action that bypasses architecture's audit-log emission discipline | Cross-Cutting #9 + §1.5 | Audit-log integrity is structurally enforced; any bypass attempt is a critical breach |
| 7 | Modification of audit-log retention policy or Object Retention Lock terms | §2.10 + §5.2 (Object Retention Lock) | Object Lock is the immutability boundary; modification requires ≥ 2-trustee + legal counsel review |
| 8 | Modification of the Engineer's own contract or IAM grants | Separation of duties (architecture §2.10 + standard control discipline) | The Engineer cannot self-modify scope or self-grant access; trustee + Solo Builder authority required |
| 9 | Niyamavali rule registry modification without trustee + R9-class voting where applicable | §1.10 + Story 2.3 + Epic 4 + PRD §1 Niyamavali governance | Niyamavali clauses are trust-governance instruments; engineer-side modification is forbidden |
| 10 | Production payment-instrument access (UPI signing keys; payment-intent credentials) | §5.9 + PRD §4.5 (no-payment-gateway architecture) + Cross-Cutting #20 credential escrow | Payment instruments are credential-escrow-only per Story 0.2; engineer access requires bus-factor + trustee quorum-open |
| 11 | DigiLocker integration modification without OAuth-flow ADR + Story 3.3a closure | §2.8 + Story 3.3a/3.3b | DigiLocker integration is gov-API-territory; modifications require ADR + Story-closure path |
| 12 | Cloudflare admin modification | §5.8a Cloudflare DPDPA-compatibility decision (pending Cloudflare-pivot ADR) | Cloudflare configuration is regulatory-surface-adjacent; modifications gated on the Cloudflare-pivot ADR closure |
| 13 | Member-mass-event posture activation/deactivation | Story 14.1-14.3 + Cross-Cutting #20 + §FR-98 disaster handling | Member-mass-event posture is trustee-declared per Story 14.1; engineer-side activation is forbidden |
| 14 | Degraded posture activation/deactivation under Story 0.4 framework | Story 0.4 degradation-policy framework + `docs/degradation-policy/README.md` §"Activation ceremony" | Degraded posture activation is trustee-authorized per Story 0.4; engineer participates as executor under trustee authorization, never self-initiates |
| 15 | Member moderation actions (suspend, terminate, restore) | Story 10.10 + Epic 10 + member-class member-state governance | Member moderation is admin-role-territory + trustee oversight; engineer access requires trustee + reason-code per Story 10.10 |

**Exclusion violation handling:**

- **Inadvertent violation** (engineer-side mistake without intent): logged as gap in `backup-engineer-ledger.md` "Activation event log" gap-list row; trustee review; remediation per the gap-discharge cycle; may inform annual contract renewal review.
- **Documented breach** (intentional bypass or willful negligence): triggers contract §10 for-cause termination per Story 0.6 contract template; immediate access revocation per `access-grant-procedure.md` §3.
- **Repeated inadvertent violations** (≥ 3 in any rolling 12-month window): trigger Trustee Panel review; may inform renewal-decline decision per contract §5.

## §6. Out-of-scope clarifications

The following are explicitly **outside** the engagement scope but commonly confused with engagement-mode activities:

- **DR runbook authoring** — per architecture §5.7; not in Story 0.6 scope; deferred per Story 0.4 Decision 004 Open Follow-up.
- **ADR substantive content drafting** — per architecture §Implementation Handoff lines 5069-5096 (PR-2 / implementation-time work); the Engineer MAY contribute to ADR drafting during surge engagement under the surge-mode discipline, but the ADR drafting cadence + ownership is per the owning Story / PR-2 plan, not the Engineer's independent initiative.
- **Production-load testing** — the Engineer may contribute to pre-launch capacity-validation per Story 7.9 + Story 0.14 under surge engagement; production-load testing per se is forbidden (impacts member-facing surface).
- **Member-facing surface design or copy authoring** — UX is BigDev/Sally territory; the Engineer may review surfaces for accessibility per quarterly cadence but does not author copy or design surfaces.
- **Trustee governance decisions** — the Engineer informs trustee decisions through quarterly cadence participation; the Engineer does not make trustee-class decisions (Niyamavali amendments, fixed-amount setting, R9 voting, etc.).
- **Legal counsel substitution** — the Engineer is not a substitute for legal counsel engaged under Story 0.13. Legal questions about the engagement, NDA, or trust matters are routed to legal counsel per `activation-procedure.md` §5 contact escalation list.

## Cross-references

- `README.md` — framework lifecycle + invariants + cadence + property/control/policy table (§3)
- `contract-template.md` §2 — engagement scope cross-references this document
- `access-grant-procedure.md` — IAM grant supporting the engagement modes' access requirements
- `onboarding-checklist.md` §2(c) — operational continuity framework walkthrough covers this scope-of-work
- `activation-procedure.md` — operational procedure for each engagement mode's activation
- `engineer-roster.md` — last-activity dates per engagement mode track engagement-cadence drift
- `backup-engineer-ledger.md` — per-event logs for surge + bus-factor + activation-scenario events
- `../knowledge-transfer/on-call-playbook.md` — 13 incident classes the Engineer triages during bus-factor mode
- `../knowledge-transfer/kt-pack-ledger.md` — comprehension administration log (primary)
- `../escrow/sealing-procedure.md` §5.1 + §5.3 — the Engineer as non-Solo-Builder principal under bus-factor for audit-mirror credentials
- `../escrow/credential-inventory.md` — credential envelopes the Engineer accesses post-Tasks-8-10
- `../escrow/code-escrow/restoration-procedure.md` §2.5b + §3.x — the Engineer as primary executor for restoration drills
- `../degradation-policy/table-top-exercise.md` — the Engineer as preferred facilitator under bus-factor
- `../../.decision-log.md` — Decision 2026-05-30-006 + Tasks 8/10/11 supersession entries

## Changelog

| Date | git SHA | Author | Material edit? | Re-sign required? | Ledger entry |
|---|---|---|---|---|---|
| 2026-05-30 | n/a (pre-git at author-commit) | Solo Builder (BigDev) via dev-story agent | initial author-commit | yes (≥2 trustees per Task 8) | `backup-engineer-ledger.md` Framework-commit record row |
