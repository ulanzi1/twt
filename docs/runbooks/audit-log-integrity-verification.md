# Runbook: Audit-Log Integrity Verification

> **Status:** draft (author-committed; awaiting ≥2-trustee sign-off per ledger)
> **Owner role:** Audit-mirror integrity-check on-call (separately routed from infrastructure on-call per architecture §1.5)
> **Last material edit:** 2026-05-29 by Solo Builder (initial)
> **Architectural authority:** architecture.md §1.5 (Audit log storage — two-tier; hash chain; integrity-check job; Merkle-root publication), §2.10 (Audit log access controls), §2.10a (Isolation Commitment — preserving audit independence), §5.15 (related: audit-mirror integrity-check failure response — distinct runbook)

This runbook covers the verification side: how to confirm the audit chain is intact and how to surface a verified result to trustees. The failure-response side (what to do when chain breaks are detected) is a separate runbook per architecture §5.15 owned outside Story 0.1.

## 1. Prerequisites

- **Two-tier topology operational:** Postgres hot tier (last 90 days, daily partitioning, hash-chain at insert) AND Cloud Storage cold tier (`twt-audit-mirror` project, Bucket Lock + Object Retention Lock per architecture §1.5).
- **Integrity-check job deployed:** `apps/jobs/audit/` workspace per architecture §Workspace Layout. Deployed as a separable workspace per the C-3 fix (architecture §1.5): the job runs against the S3/Cloud Storage canonical copy, NOT operational Postgres.
- **IAM Isolation Commitment honored (architecture §2.10a):** sole-engineer prod credentials cannot reach either the mirror-write or mirror-read role. The integrity-check job uses the mirror-read role in a separate GCP project.
- **Canonical-JSON specification ADR present:** architecture §1.5 commits a single canonical-JSON specification in an ADR; one library, one version across all hash producers and verifiers. Confirm the ADR is current before invoking verification (mismatched canonicalization is a build-time error but is worth confirming during a forensic verification).
- **Merkle-root publication channel reachable (v1-S):** daily aggregate hash published to a trustee-controlled channel (named in ADR). The trustee can read the published roots independently of the verification job's output.

## 2. Step-by-step procedure

### 2.1 Routine daily verification (automated; this runbook documents the manual override)

The integrity-check job runs daily against the canonical S3 copy. This sub-procedure is the manual override — used when triggering a verification outside the cadence (e.g., during an incident, before a deploy, in response to a trustee request).

1. **Confirm job not currently running.** Concurrent runs of the integrity-check job can produce spurious lag alerts. Query the job's last-run state.

2. **Invoke the manual verification.** Trigger the job in `apps/jobs/audit/` with the verification scope (date range to verify; default is "from last verified marker to current head").

3. **Wait for completion.** The job's runtime scales with the number of audit entries in the range. Expect: <minute for incremental (last 24h); minutes-to-hours for full corpus.

4. **Read the result.** The job emits two distinct verdicts per architecture §1.5 "Integrity check distinguishes two failure modes":
   - **Replication-lag verdict:** how far the cold-tier mirror lags behind the hot-tier last-written sequence. Lag below operational threshold = pass; lag above threshold = ops-runbook escalation (separate runbook).
   - **Chain-integrity verdict:** is the hash chain intact up to the last replicated mark, AND does the hot-tier chain after the mark continue cleanly? Any break = P0 incident escalation.

5. **Record verification.** Append to the operational-readiness ledger's "Execution-validation log" if this verification is being run as the Story 0.1 AC-4 execution sample for this runbook. Otherwise record in the operations-policy verification log.

### 2.2 Trustee-facing one-click verification (Epic 1 demoable closure beat C11)

Per Epic 1 demoable closure (epics.md line 972: "Trustee-facing audit-log integrity verification (SM-1 demo beat C11): trustee runs one-click verification job from admin UI; hash chain validates; off-site mirror in separate GCP project (AR-9/10) confirmed; tamper-detection demo"), there is a trustee-facing UI surface for verification. This runbook documents the operational backing for that surface.

1. **Trustee initiates verification from admin UI.** The UI invokes the integrity-check job's manual-verification endpoint.

2. **UI displays job state.** Running → completed → result (pass / fail / lag-warning).

3. **On pass:** UI shows: hash chain intact, off-site mirror in `twt-audit-mirror` project confirmed (architecture §2.10a IAM Isolation Commitment), last-verified entry hash and timestamp.

4. **On fail (chain break):** UI shows a red audit-failure banner with the offending entry ID. Trustee escalation is triggered automatically per the audit-mirror integrity-check failure response runbook (architecture §5.15; owned outside Story 0.1).

5. **On lag-warning:** UI shows a yellow banner with the current lag value and the operational threshold. Trustee can dismiss after acknowledging; ops on-call gets a separate page if lag exceeds escalation threshold.

### 2.3 Forensic verification (incident-driven)

When a chain break has been alleged or detected, a deeper forensic verification establishes:

1. **Cross-check Merkle-root publication.** The daily aggregate hash published to the trustee channel should match the recomputed Merkle root from the canonical S3 copy for that day. A mismatch indicates either a tampering event after publication or a publication-process failure.

2. **Verify Object Retention Lock posture.** The cold-tier objects are structurally immutable until retention expiry (architecture §1.5: "administrative principals cannot delete or shorten retention during the active retention window"). Query the bucket configuration; confirm Object Retention Lock is active and retention has not been shortened.

3. **Verify IAM Isolation Commitment.** Confirm the audit-mirror-write role lives in `twt-audit-mirror` GCP project (architecture §2.10a) and that no cross-project service-account impersonation or cross-project IAM grant has been added. Org-policy constraints prevent this; verify the constraints are in force.

4. **Verify canonical-JSON spec uniformity.** All hash producers and verifiers use the same canonicalizer per architecture §1.5. Check the library + version inventory across `packages/events/` consumers.

5. **Replay verification.** Architecture §1.14 commits source-of-truth status to event history; persisted state is optimization only. For a forensic verification, replay the event log from a known-good baseline and compare hash chains.

## 3. Rollback procedure

Verification is read-only against the canonical mirror. There is no rollback per se. However, if the verification process itself misbehaves (e.g., produces a false-positive chain break due to a canonicalizer mismatch), the corrective procedure is:

1. **Do NOT modify the audit log.** Architecture §1.5 commits the cold tier is structurally immutable; even an attempt to "fix" a verification false-positive by manipulating the audit log would be detected and would itself be a P0 event.

2. **Pause automated chain-break P0 page** while diagnosing the verification process. Operations policy commits the pause procedure.

3. **Diagnose the verification process.** Common false-positive causes: canonicalizer version drift, clock skew between hot-tier insert and cold-tier replication, mid-replication snapshot read.

4. **Re-run verification after fix.** Confirm the verdict is now consistent across two independent invocations.

5. **Restore automated P0 pager** after consistent green verdicts.

### Forbidden actions

- ❌ Modifying the audit log to make a verification pass. Structural immutability of the cold tier + audit-chain hash makes this both forbidden and ineffective — the chain becomes inconsistent against the next entry.
- ❌ Granting the audit-mirror-write role to sole-engineer or any prod-project principal. Violates architecture §2.10a IAM Isolation Commitment; defeats the C-3 separability.
- ❌ Shortening Object Retention Lock duration. Violates architecture §1.5 commitment.
- ❌ Running the integrity-check job from the operational Postgres credentials. The job's separability (per C-3 fix) is the property that makes single-DB-access tampering catchable.

## 4. Verification checks

- [ ] **Job runs against canonical S3 copy.** Check the job's IAM identity and configured data source; confirm it is reading from `twt-audit-mirror`, not operational Postgres.
- [ ] **Replication-lag verdict observed.** Job emitted a lag value; lag below operational threshold (or, if above, escalated correctly).
- [ ] **Chain-integrity verdict observed.** Job emitted a chain verdict; chain intact (or, if broken, escalated correctly with the offending entry ID surfaced).
- [ ] **Merkle-root publication matches recomputed root (v1-S).** For the day under verification, the published root matches the recomputed Merkle root.
- [ ] **IAM Isolation Commitment in force.** Cross-project IAM audit shows no grants violating architecture §2.10a.
- [ ] **Object Retention Lock in force.** Bucket configuration shows active Object Retention Lock; retention window not shortened from committed value.
- [ ] **Trustee surface mirrors job verdict.** The admin-UI one-click verification surface shows the same verdict the job produced (Epic 1 C11).

## 5. Contact escalation list

- **Primary (verification execution + first-line triage):** Audit-mirror integrity-check on-call (separately routed from infrastructure on-call per architecture §1.5).
- **Chain break (P0):** Trustee Panel chair on rota AND Audit-mirror integrity-check on-call. The chain break triggers the audit-mirror integrity-check failure response runbook (architecture §5.15; owned outside Story 0.1).
- **Replication-lag exceeding escalation threshold:** Infrastructure on-call (operational issue, not integrity issue).
- **IAM Isolation Commitment drift detected (rare):** Trustee Panel chair on rota AND GCP IAM admin secondary (≥3 principals per §5.4).
- **Forensic verification request from trustee or external auditor:** Solo Builder OR backup engineer per A-13; record the request in the operational-readiness ledger.

---

## Changelog

| Date | git SHA | Author | Material edit? | Re-sign required? | Ledger entry |
|---|---|---|---|---|---|
| 2026-05-29 | _initial_ | Solo Builder | initial | yes (≥2 trustees) | _pending_ |
