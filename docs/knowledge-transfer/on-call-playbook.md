# Runbook: On-Call Playbook (the meta-playbook above the seven Phase-0 runbooks)

> **Status:** drafted
> **Owner role:** Infrastructure on-call (Solo Builder at v1 per architecture §5.10; backup engineer per Story 0.6 for surge / continuity)
> **Last material edit:** 2026-05-30 by Solo Builder (BigDev)
> **Architectural authority:** architecture.md §5.10 (operations + on-call + Dokploy fallback) · architecture.md §5.6 (observability stack split + capacity-planning indicators) · architecture.md §5.7 (backup + DR) · architecture.md §5.15 (operational runbook inventory) · architecture.md Cross-Cutting #9 (staff-fallback at every node) · architecture.md Cross-Cutting #20 (solo-build operational continuity) · PRD §9.1.1 (bus-factor mitigation) · ADR-NNNN-paging-integration-degraded-posture (slot-reserved-pre-write per `docs/knowledge-transfer/adr-index.md` Section F) · ADR-NNNN-saas-tracing-crash-provider (slot-reserved-pre-write per Section B) · ADR-NNNN-infrastructure-on-call-rotation (slot-reserved-pre-write per Section A)

## Structural invariant — read first

**This is the META-PLAYBOOK above the seven Phase-0 runbooks.** It does NOT replace the per-task runbooks in `docs/runbooks/`; it **routes** an on-call incident to the right runbook OR ADR slot OR escalation path. A substantive operational procedure that lives in this file but should live in a per-task runbook is a framework violation — refactor to the per-task runbook + cross-link from here. Per `docs/knowledge-transfer/README.md` §4 invariant 1.

## 1. Prerequisites

Conditions that must hold before the on-call surface is operational:

- **Named on-call identity.** Solo Builder is the named v1 infrastructure on-call per architecture §5.10 (lines 3380-3382). The backup engineer per Story 0.6 (A-13 retainer) provides surge + continuity coverage per §5.10 L3383-3384. Both identities are recorded in the operational-readiness ledger per Story 0.1 + Story 0.6.
- **Paging surface name.** `[deferred ADR — placeholder procedure]` per architecture §5.10 L3385-3387 (paging integration may use the same SaaS as the tracing / crash-reporting provider; ADR slot `ADR-NNNN-paging-integration-degraded-posture` per `docs/knowledge-transfer/adr-index.md` Section F). **Placeholder procedure:** at v1 pre-paging-SaaS, P0-class alarms route to Solo Builder's primary email + phone with manual acknowledgment; the secondary alarm path is the trustee escalation rota per Story 0.1 contact escalation discipline. The placeholder is replaced when the paging-SaaS ADR ratifies.
- **Backup alert path** per architecture §5.10 L3389-3392 (architectural property: P0-class alerts have at least two delivery paths; mechanism is operational). The backup path is paging SaaS + voice-call rota OR dual-provider configuration. Paging SaaS outage cannot silently fail all alerts.
- **Capacity-planning indicators** per architecture §5.6 L3138-3150 are emitted into Cloud Monitoring with alarms wired. The named indicators are: pool spawn duration · statement-intake queue depth · FR-12A p95 latency rolling window · pg-boss queue depth per class · Cloud SQL connection pool utilization · Cloud Storage write rate · FCM dispatch throughput vs published quota · audit-log replication lag. When a named indicator crosses its threshold, the alert routes to the on-call surface.
- **Audit-mirror integrity-check job posture** per architecture §1.5 — the integrity-check job runs in a separate GCP project (`twt-audit-mirror-prod`) per §2.10a + §5.5. Replication-lag alarm fires at > 3 min (within the 5-min bound per §5.12 NFR budgets).
- **Cross-link to degradation policy.** When degraded posture activates (per `docs/degradation-policy/README.md` §14 activation ceremony), the on-call surface escalates per the trustee-quorum activation path. The degradation policy is the framework above incident response — incident triage operates within degradation policy boundaries when degraded posture is active.
- **Backup engineer access posture** per architecture §5.10 L3394-3402 (read-only default; write/admin requires per-action approval — trustee approval OR co-sign with Solo Builder when both reachable; break-glass path with audit + paging for unreachable-Solo-Builder scenarios). Credential rotation cadence committed in operations policy (operations-policy ADR slot per `adr-index.md` Section F).
- **Multi-actor controls in degraded mode** per architecture L4031-4037: multi-actor controls (≥2-trustee sign-off, ≥2-trustee credential quorum-open, ≥2-trustee KT pack ratification) operate in degraded mode until staffing assumptions hold. The substitute paths per Story 0.1 AC-4 substitute-engineer model apply.

## 2. Step-by-step incident triage

The triage taxonomy is incident-class-driven. Each class names: (a) the simulated event; (b) the artifact to consult (per-task runbook OR ADR slot OR cross-referenced framework); (c) the verification check that confirms resolution OR escalation; (d) the escalation trigger per architecture Cross-Cutting #9 (`{primary_actor, fallback_actor, escalation_trigger}`).

### 2.1 Audit-integrity failure (P0 — uncompromisable subsystem)

- **Trigger.** Audit-mirror replication-lag alarm fires at > 3 min (per §1.5 + §5.12 — the 3-min lag alarm is within the 5-min undetectable-loss bound) OR hash-chain verification job fails (per `docs/runbooks/audit-log-integrity-verification.md`).
- **Action.** Execute `docs/runbooks/audit-log-integrity-verification.md` — the runbook covers (i) reproducing the verification job locally to confirm the failure is not transient, (ii) inspecting the chain-break commit + line range, (iii) escalation to the integrity-mirror-administrative on-call surface in the separate GCP project per §2.10a.
- **Verification check.** Re-run the integrity-check job after remediation; chain validates end-to-end + last 6h mirror window is complete + Merkle root publishable per §5.12.
- **Escalation trigger.** Failure persists > 1 hour → escalate to Trustee Panel chair on rota (architecture §2.10a + Story 0.1 contact escalation). Confirmed tamper-detection (synthetic tamper attempt is caught + offending entry id surfaced via the trustee-facing audit-log integrity verification UI per Story 1.11b) → P0 incident; activate Story 0.4 degradation posture; engage Story 0.13 legal counsel for breach assessment per architecture §2.12 DPDPA control surfaces.

### 2.2 P0 capacity-indicator breach

- **Trigger.** Any of the architecture §5.6 capacity-planning indicators crosses its threshold:
  - Pool spawn duration breach → cycle-freeze risk per §5.11 + FR-20 NFR.
  - Statement-intake queue depth breach → reconciliation backlog per §3.6 + Epic 9.
  - FR-12A p95 latency breach → validity service degradation per §1.10 + §1.14.
  - pg-boss queue depth per class breach → class-specific worker starvation per §1.4 + §5.11.
  - Cloud SQL connection pool utilization breach → connection exhaustion per §1.1.
  - Cloud Storage write rate breach → audit-log + snapshot write pressure per §1.5 + §1.6.
  - FCM dispatch throughput vs published quota breach → push-channel throttling per §3.4.
  - Audit-log replication lag breach → see §2.1 above.
- **Action.** Identify the specific indicator from the alarm payload; consult the per-class capacity-planning ADR slot (`adr-index.md` ADR-NNNN-capacity-planning-indicators). At v1 pre-ADR, the placeholder procedure is: (a) confirm the breach is sustained (not a 1-2 sample spike); (b) cross-check against current cycle phase (cycle-open burst is expected; sustained off-cycle breach is not); (c) escalate to architecture §5.10 cold-start mitigation path for Class A workloads OR to the multi-instance trigger ADR for sustained breach.
- **Verification check.** Indicator returns within threshold within 30 minutes; OR the breach is documented in `kt-pack-ledger.md` "Pack-revision log" as a triggering signal for a capacity-planning ADR draft.
- **Escalation trigger.** Sustained breach > 2 hours → engage backup engineer per Story 0.6 (Solo Builder OR backup engineer can extend on-call coverage); engage Trustee Panel if the breach risks a cycle-freeze invariant (per §5.11 + FR-20).

### 2.3 Push-provider outage (FCM / APNs)

- **Trigger.** Cloud Monitoring alarm on FCM dispatch throughput < 5% of published quota OR APNs auth-token failures > 5/min OR delivery rate < 50% baseline.
- **Action.** Channel-provider abstraction fallback per architecture §3.4 (lines 1915-2097) — the dispatcher routes to the next channel in the per-Pariwar hierarchy (WA → SMS per §3.4 fire-condition matrix). The degradation-policy push template per Story 0.4 (`docs/degradation-policy/comms-templates/push-channel.md`) provides the user-facing copy if push is the affected channel.
- **Verification check.** Push delivery rate returns to baseline; OR fallback channel (WA / SMS) is operationally delivering per `docs/degradation-policy/surface-inventory.md` per-Pariwar stance.
- **Escalation trigger.** Outage > 30 min → activate per-Pariwar degraded-mode cycle-open SMS bridge per architecture §3.4; engage WA Business + telephony provider monitoring owners per `docs/knowledge-transfer/third-party-dependency-inventory.md`.

### 2.4 Paging SaaS outage

- **Trigger.** Paging SaaS health-check failure OR alarm fire-rate from primary path drops to 0 over a 15-min window (the backup-alert-path observability gap — silent paging failure is the worst class of failure).
- **Action.** Activate the backup alert path per architecture §5.10 L3389-3392 architectural property — P0-class alerts route via the secondary delivery path (voice-call rota OR dual-provider configuration). The placeholder procedure per `adr-index.md` Section F + §1 Prerequisites: at v1 pre-paging-SaaS-ADR, the backup path is direct phone + email to Solo Builder + Trustee Panel chair rota.
- **Verification check.** Test alert fires via the backup path within 5 min of activation; primary-path alarm restoration is confirmed via paging-SaaS health endpoint.
- **Escalation trigger.** Backup path also unreachable → engage backup engineer per Story 0.6 (the bus-factor scenario where both Solo Builder and the paging primary fail); engage Trustee Panel chair directly.

### 2.5 Dokploy substrate failure

- **Trigger.** Dokploy admin surface unreachable OR Dokploy-driven deploys failing for > 30 min OR the `twt-dokploy-prod` project IAM authority is lost.
- **Action.** Execute the Dokploy failure fallback per architecture §5.3 L3007-3013 — direct deployment to Cloud Run (backend services are 12-factor containerized per Step 3 R-4; secrets are abstracted per Story 0.2 framework). The fallback runbook step is in `docs/runbooks/deploy.md` (Dokploy failure section); cross-link to `docs/escrow/credential-inventory.md` `dokploy-substrate-admin` envelope for credential recovery if needed.
- **Verification check.** Cloud Run deploy succeeds + traffic-routing health check passes (Private Service Connect verification gate per §5.8 + Cloudflare edge path confirmed); OR Dokploy substrate is restored AND verified via Dokploy admin surface health-check.
- **Escalation trigger.** Failure persists > 2 hours during a live cycle (Days 12-15) → activate Story 0.4 degradation posture per `docs/degradation-policy/README.md` §14 activation ceremony; cycle-open SMS bridge per §3.4 may activate; engage Trustee Panel per Story 0.4 sign-off log.

### 2.6 Cloudflare edge outage

- **Trigger.** Cloudflare status page indicates regional outage OR ingress-path health check fails > 5 min OR Bot Management rule firing rate drops to 0 unexpectedly.
- **Action.** Engage the break-glass bypass per architecture §5.8 L3262-3266 — direct ingress is permitted, time-bounded, audit-logged, rate-limited. Activation requires explicit operator action (not a default); every direct-ingress request is logged with elevated detail per Cross-Cutting #2; rate limits prevent the bypass from becoming the new normal. Cross-link to `adr-index.md` ADR-NNNN-cloudflare-pivot-disposition (§5.8a substitution boundaries — Cloudflare-dependent sections §2.1, §2.11, §3.11, §5.8 identify substitution boundaries).
- **Verification check.** Break-glass ingress accepting traffic + audit log capturing direct-ingress lines + Cloudflare status returning to nominal within auto-revert window OR explicit renewal with re-justification per §5.8 L3257-3260.
- **Escalation trigger.** Outage > 4 hours → consider Cloudflare pivot per §5.8a (if legal review or operational signal warrants); engage Trustee Panel for the substrate-pivot decision (architecture §Architecture sunset → maintenance mode).

### 2.7 Cloud SQL HA failover

- **Trigger.** Cloud SQL zonal failure → automatic failover from primary to standby per architecture §5.7 L3192-3193 + §1.1 regional HA commitment.
- **Action.** Automatic failover is the expected behavior; verify the standby has accepted traffic + connection pool re-establishes per §1.1. The application-tier services (apps/api, apps/admin, apps/jobs) handle the brief connection drop per their pg-boss + Drizzle retry policies.
- **Verification check.** API health-check returns 200 within 60s of failover; pg-boss queue resumes processing; FR-12A validity-service p95 returns within budget per §5.12.
- **Escalation trigger.** Failover does not complete OR primary AND standby both unavailable (the regional event class) → activate cross-region replica trigger consideration per §5.7 L3203-3215; engage DR runbook (`slot-reserved-pre-write` per `adr-index.md` ADR-NNNN-dr-runbook-authoring-scope — interim escalation: Trustee Panel + backup engineer Story 0.6 joint decision).

### 2.8 KMS unavailability

- **Trigger.** Cloud KMS API errors > 10/min OR KEK access denial errors OR HMAC key access denial OR signature verification failures across the Tier 1 PII surfaces (per architecture §1.5 + §2.7).
- **Action.** Cloud KMS unavailability is a P0 incident — every PII-touching surface depends on the KEK + HMAC keys. The immediate response: (a) confirm whether it is a Cloud KMS regional outage (consult GCP status); (b) confirm whether it is an IAM authority failure (KEK rotation procedure per architecture §5.9 may have introduced a misconfiguration); (c) consult `docs/runbooks/secret-rotation.md` for the KEK rotation procedure + emergency-fallback path (`[deferred ADR — placeholder procedure]` — at v1 pre-ADR, the emergency-fallback is graceful degradation to read-only mode for PII-touching surfaces while the KMS access path is restored).
- **Verification check.** KMS operations succeed + PII tier 1 encryption operations resume + FR-12A validity service operates without degradation.
- **Escalation trigger.** Outage > 30 min → activate Story 0.4 degradation posture for member-facing PII surfaces (the surfaces gracefully suspend per `surface-inventory.md`); engage Trustee Panel + backup engineer; consider emergency KEK rotation per `docs/escrow/credential-inventory.md` `kek-root-tier-1-envelope-encryption` envelope (`pending-separation-mechanism` at v1 — pre-ADR sealing is forbidden, so the emergency path uses the existing operational KEK with manual IAM grant under trustee oversight).

### 2.9 DigiLocker integration failure

- **Trigger.** DigiLocker OAuth flow fails > 5% of attempts OR signature verification fails OR govt API status indicates outage.
- **Action.** Per architecture §2.8 + Story 3.3a (DigiLocker provider abstraction) — the provider abstraction fallback routes signup KYC to the manual fallback path per FR-2. The manual fallback ack copy is in the degradation policy push template per Story 0.4. The signature-verification-failure path requires trustee escalation (potential govt-side key compromise per §2.8 ADR).
- **Verification check.** DigiLocker OAuth flow success rate returns to baseline + signature verification succeeds; OR the manual fallback path is operationally accepting signups.
- **Escalation trigger.** Outage > 24 hours during onboarding cycle → engage Trustee Panel for membership-cap discussion (slow signup rate impacts the v1 Bihar growth model); engage govt provider-approval contact per `docs/knowledge-transfer/third-party-dependency-inventory.md`.

### 2.10 WhatsApp Business suspension

- **Trigger.** Meta-side template approval revocation OR account suspension OR delivery rate drops to 0 for > 30 min.
- **Action.** Channel-provider abstraction fallback per architecture §3.4 — the dispatcher routes from WA to the next channel in the per-Pariwar hierarchy (SMS per §3.4 fire-condition matrix — per-member transactional fallback OR cycle-open SMS bridge depending on alarm cause). The degradation-policy WA template per Story 0.4 carries the suspension framing for member-facing comms.
- **Verification check.** WA delivery rate restored OR SMS fallback delivering per `docs/degradation-policy/surface-inventory.md` per-Pariwar stance.
- **Escalation trigger.** Suspension persists > 48 hours → engage Meta support contact (BSP / Meta direct per `adr-index.md` ADR-NNNN-whatsapp-business-provider); consider per-Pariwar admin toggle to disable WA channel until resolution per `docs/degradation-policy/comms-templates/whatsapp-channel.md` discipline.

### 2.11 Helpdesk SLA breach

- **Trigger.** Helpdesk ticket queue SLA tracking per FR-52 + Epic 10 — tickets exceed the per-routing-policy-category SLA.
- **Action.** Per architecture §3.5a helpdesk lifecycle + Epic 10 — escalate per the operator escalation runbook (`slot-reserved-pre-write` per `adr-index.md` Section C; placeholder: re-assign to next-tier operator + notify routing-policy administrator). Cross-link to `docs/runbooks/README.md` "Related runbooks expected from other stories" row for the helpline-operator escalation procedure (Story 10.3 candidate).
- **Verification check.** Backlog clears + SLA returns to baseline; OR operator capacity is scaled per the routing-policy registry per Story 10.1.
- **Escalation trigger.** Backlog persists + SLA breach affects claim processing → engage Trustee Panel chair per Story 0.4 degradation policy (helpdesk is a Tier 2 operator surface; degraded-mode stance may apply per `surface-inventory.md`).

### 2.12 Member-mass-event (cycle-open burst OR claim-burst)

- **Trigger.** Cycle-open burst (Days 1-3 of cycle) hits the §3.4 dispatcher hard; OR claim-burst (disaster event) hits multiple claim filings concurrently.
- **Action.** Per architecture §5.11 + Cross-Cutting (capacity envelopes are designed for cycle-open and claim-bursts); Class A pg-boss workers run on persistent worker pools per §5.10 L3407-3411. If capacity-planning indicators breach (see §2.2 above), activate degradation policy per Story 0.4 if Solo Builder is unreachable.
- **Verification check.** Burst dissipates within expected window; cycle-freeze invariant per §5.11 + FR-20 is preserved; no claim-filing failures.
- **Escalation trigger.** Sustained breach OR cycle-freeze invariant at risk → trustee-class disaster declaration per Story 14.1 (disaster window + alert engine throttling); engage Trustee Panel chair.

### 2.13 [v1-pending] DPDPA breach response

`[deferred to Story 14.3]` — DPDPA breach reporting operational readiness lives in Epic 14 Story 14.3 (`14-3-dpo-breach-reporting-operational-readiness`). The DPDPA breach response procedure is `slot-reserved-pre-write` at Story 0.5 author-commit time; cross-link to `adr-index.md` (no dedicated row yet — Story 14.3 closure populates it) + `docs/escrow/credential-inventory.md` Domain 7 rows (`dpo-breach-reporting-portal`, `incident-response-tooling-credentials`, `dpo-contact-path`). Interim escalation: any suspected breach → Solo Builder + Trustee Panel chair + Story 0.13 legal counsel (when engaged).

## 3. Rollback / failure-mode procedure

When triage at §2 cannot resolve within the per-incident-class SLA, escalate via the following framework paths:

- **Activate degradation policy per Story 0.4 §14 activation ceremony.** ≥2-trustee quorum, 7-day trigger (or shorter for confirmed multi-day Solo Builder unreachability), contact-attempt log, declaration recording in `docs/degradation-policy/degradation-policy-ledger.md` "Activation declaration log". The activation extends operational coverage to the degraded posture across all member-facing + admin-facing surfaces per `surface-inventory.md`.
- **Open credential escrow per Story 0.2 ≥2-trustee quorum-open** if a credential is the blocker. Use the sealing procedure's reverse path (`docs/escrow/sealing-procedure.md` rollback section); record the open event in `escrow-ledger.md` "Quorum-open log" per Story 0.2 framework.
- **Switch to mirror per Story 0.3 AC-2** if primary repo is the blocker. Execute `docs/escrow/code-escrow/restoration-procedure.md` AC-2 path (continuity-of-development, not continuity-of-deployment). Record in `code-escrow-ledger.md` "Bus-factor switch-to-mirror log".
- **Escalate to State Trustee per Story 6.13** for claim-processing decisions if the incident affects the claim path under degraded posture.
- **Engage Story 0.13 legal counsel** for legal-flagged incidents (DPDPA breach, regulatory inquiry, claimant legal action). Pre-Story-0.13-closure, the escalation routes to the Trustee Panel chair + pre-existing legal counsel contact.

## 4. Verification checks

Every triage step in §2 has its own verification check (named inline). The cross-class verification baseline:

- [ ] Incident class identified + matched to §2 sub-section
- [ ] Triage action completed OR escalation triggered per the sub-section's escalation criterion
- [ ] Sub-section verification check returns pass/fail per its named condition
- [ ] Incident logged in operational-readiness ledger (`docs/runbooks/operational-readiness-ledger.md`) with class, triage timeline, resolution OR escalation path
- [ ] If escalation triggered: appropriate framework ledger (degradation-policy, escrow, code-escrow, kt-pack) has a row recording the escalation event
- [ ] Post-incident review scheduled (within 30 days for P0; within 90 days for P1) per `docs/knowledge-transfer/README.md` §6 review cadence fallback (on-incident post-mortem trigger)

If any check fails, do not declare resolution; escalate per §5.

## 5. Contact escalation list

Roles, not individuals where possible. Specific contacts live in operations policy + `docs/knowledge-transfer/third-party-dependency-inventory.md` for vendor-side escalation.

- **Primary on-call.** Solo Builder (BigDev) at v1 per architecture §5.10 + Story 0.1 contact escalation discipline.
- **Surge / continuity coverage.** Backup engineer per Story 0.6 (A-13 retainer); read-only access by default; write/admin requires per-action trustee approval OR co-sign with Solo Builder.
- **Trustee escalation.** Trustee Panel chair on rota per Story 0.1 contact escalation; the rota is recorded in `docs/runbooks/operational-readiness-ledger.md`.
- **Audit-mirror on-call.** Integrity-mirror-administrative on-call surface in the separate `twt-audit-mirror-prod` GCP project per §2.10a + Story 1.10. At v1 pre-Story-1.10-closure, the audit-mirror access is read-only + Solo-Builder-mediated per architecture §2.10a IAM-Isolation Commitment.
- **Legal counsel.** Story 0.13 engagement (`slot-reserved-pre-write` per `adr-index.md` Section A); pre-Story-0.13-closure, escalation routes via Trustee Panel chair.
- **Helpline operator team.** Per Story 10.3 candidate owner; pre-Story-10.3-closure, helpline operator escalation is per the Trustee Panel chair rota.
- **Vendor-side escalation.** Per `docs/knowledge-transfer/third-party-dependency-inventory.md` — every external dependency has a named monitoring owner per §3.10 (Solo Builder default at v1; Trustee Panel for regulatory-gate rows; legal counsel for legal-flagged events).
- **Cross-link to Story 0.4 degradation policy contact escalation.** Once degradation posture activates, the `docs/degradation-policy/table-top-exercise.md` §5 contact escalation list applies in parallel — the on-call playbook does NOT supersede; the two frameworks operate jointly.

---

## Changelog

| Date | git SHA | Author | Material edit? | Re-sign required? | Ledger entry |
|---|---|---|---|---|---|
| 2026-05-30 | n/a (pre-git at author-commit) | Solo Builder (BigDev) via bmad-dev-story | n/a (initial author-commit) | n/a (initial author-commit; ≥2-trustee sign-off pending per Story 0.5 Task 8) | `docs/knowledge-transfer/kt-pack-ledger.md` Framework-commit record (Story 0.5 row) |
