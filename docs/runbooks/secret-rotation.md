# Runbook: Secret Rotation

> **Status:** draft (author-committed; awaiting ≥2-trustee sign-off per ledger)
> **Owner role:** Infrastructure on-call (Solo Builder primary at v1; backup engineer per A-13) with co-sign for high-sensitivity tier (per architecture §5.9 two-person approval)
> **Last material edit:** 2026-05-29 by Solo Builder (initial)
> **Architectural authority:** architecture.md §5.9 (Secret management + rotation), §2.7 (PII encryption — three-tier KEK), §5.4 (WIF — short-lived service-account tokens), §1.5 (Audit log — KEK-roots destruction alarm)

This runbook covers rotation across five secret classes (per architecture §5.9):

1. KEK rotation (annual or on-suspected-compromise)
2. Service-account credentials (WIF; auto-rotates — included for completeness)
3. Partner JWT signing keys (per partner contract terms)
4. Webhook signing secrets (dual-secret window)
5. Database credentials (via Secret Manager + IAM auth where Cloud SQL supports it)

Specific rotation **cadence** (calendar dates, frequency) belongs in operations policy, NOT in this runbook. This runbook describes *how* to rotate; operations policy commits *when*.

## 1. Prerequisites

- **Secret Manager access:** the executor has IAM permission to read and write to the target secret in GCP Secret Manager (per architecture §5.9).
- **Two-person approval setup (high-sensitivity tier):** for the high-sensitivity tier (KEK roots, partner JWT signing keys, telephony recording-storage credentials, audit-mirror credentials), the Terraform-mediated change requires two approvers. Confirm the co-signer is reachable before starting.
- **Audit-log baseline:** the audit-log integrity check has passed within the operational window. Rotation events are themselves audited; a broken chain pre-rotation means rotation audit entries land in a corrupted store.
- **KMS access (KEK rotation only):** Cloud KMS key versions are visible; old KEK retention policy is verified (architecture §5.9 commits old KEK is retained until 100% DEK re-encryption is verified).
- **Partner coordination (partner JWT signing keys only):** the partner has been notified of the rotation window and has scheduled the public-key update on their side. Cite the partner contract terms.
- **Pre-rotation observability check:** DEK migration status metric (per architecture §5.9 named observability metric) is at 100% baseline (no in-flight re-encryption from a prior rotation). Starting a new rotation while an old one is still draining can corrupt the metric.

## 2. Step-by-step procedure

Sub-procedures by secret class. Use the one that matches the secret being rotated; do not mix.

### 2.1 KEK rotation (annual or on-suspected-compromise)

KEK rotation triggers DEK re-encryption — a saga with per-row checkpoints, resumable across worker crashes, per architecture §5.9. This is the highest-risk rotation; budget for the saga's full runtime.

1. **Confirm trigger.** Annual cadence (per operations policy) OR suspected compromise OR P0-class advisory. Record trigger in the change request.

2. **Two-person approval.** Open a Terraform-mediated change request creating the new KEK version. Co-sign from a second approver per architecture §5.9 "High-sensitivity Secret Manager two-person approval". Both approvers captured in the audit log.

3. **Create the new KEK version in Cloud KMS.** Do NOT mark the old version for destruction yet. Architecture §5.9 commits: old KEK retained until 100% DEK re-encryption is verified.

4. **Initiate the DEK re-encryption saga.** The saga structure is per architecture §1.4 (saga pattern with per-row checkpoint). The saga reads DEKs encrypted with the old KEK, re-encrypts with the new KEK, writes the new ciphertext. Checkpoint allows resumption if the worker crashes.

5. **Monitor DEK migration status metric.** Architecture §5.9 commits this as a named observability metric. Watch progress; alarm if the saga stalls.

6. **Confirm 100% re-encryption.** When the metric reads 100%, run a verification query: every DEK in storage is encrypted with the new KEK version. No row should still reference the old KEK version.

7. **Old KEK retention period.** Even after 100% re-encryption, do NOT immediately mark the old KEK for destruction. Retain for the operations-policy-defined retention window (the rationale: discovery of an unconverted edge case after declaring success). The retention window must not exceed Cloud KMS's 30-day maximum delayed-destruction window per architecture §5.9.

8. **Two-person approval to schedule destruction.** Per architecture §5.9 "KEK-roots destruction discipline", scheduling destruction on a KEK-roots key requires two-person approval via Terraform co-sign. The workflow rejects single-person scheduling. Both approvers captured in the audit log; KMS operation on KEK-roots keys triggers immediate paging signal.

9. **Update operations-policy log** with the new active KEK version and the scheduled-destruction date for the old version.

### 2.2 Service-account credentials (WIF)

Service-account credentials for CI use WIF (architecture §5.4); short-lived tokens rotate automatically. This sub-procedure is included for completeness: rotation of the WIF trust binding itself.

1. **Confirm trigger.** WIF binding rotation is rare; triggered by a GitHub OIDC issuer change, a claim format change, or a periodic drill (per architecture §5.4 "Periodic recovery drill").

2. **Identify the binding(s).** Per architecture §5.4, WIF claim restrictions differ by environment (dev/staging looser, prod strictest with protected-branch claim enforced).

3. **Create the new binding in staging first.** Validate the new claim format against a staging workflow invocation. Confirm the workflow can authenticate to GCP without long-lived keys.

4. **Cut over staging.** Switch staging workflows to the new binding. Old binding remains active for the rollback window (operations policy duration).

5. **Repeat for prod with the manual-approval gate.** Per architecture §5.4 "WIF trust-relationship recovery", secondary IAM-admin role is granted to ≥3 principals. Any one can repair; rotation is also a 1+1 review (executor + co-signer for prod).

6. **Verify prod authentication.** Trigger a no-op prod-deploy workflow against a staging-equivalent target; confirm WIF auth succeeds.

7. **Decommission the old binding** after the rollback window.

### 2.3 Partner JWT signing keys

Partner JWT signing keys are rotated per partner contract terms; coordinated with the partner-side public-key update.

1. **Confirm partner readiness.** Partner has scheduled their public-key consumer to accept the new key during the rotation window. Cite the partner contract terms.

2. **Generate new signing key.** Two-person approval per architecture §5.9 (high-sensitivity tier). Store in the high-sensitivity GCP project per architecture §5.9 "High-sensitivity secret separation".

3. **Dual-key window: sign with new key, partner accepts both old and new.** Begin signing outbound JWTs with the new key. Partner-side accepts both old and new for the dual-key window length committed in operations policy.

4. **Confirm partner is no longer receiving old-key-signed JWTs.** Coordinate with partner; they confirm the cutover.

5. **Decommission old key.** Two-person approval to schedule destruction (same discipline as KEK roots per §5.9).

### 2.4 Webhook signing secrets

Webhook signing secrets are rotated on a committed cadence; rotation coordinated with the provider via dual-secret window per architecture §5.9.

1. **Generate new webhook signing secret.** Store in Secret Manager (high-sensitivity tier if the provider falls under that classification; otherwise the standard tier).

2. **Configure provider to send with new secret.** Update the provider-side webhook secret. Provider typically supports a dual-secret window where they sign with both old and new during the cutover.

3. **Verify new-secret webhooks validate.** Send a test event from the provider; confirm signature validates with the new secret in the ingress handler (per architecture §3.11 webhook ingress pattern — persist + ack).

4. **Decommission old secret** after the dual-secret window closes.

### 2.5 Database credentials

Database credentials are managed via Secret Manager + IAM authentication where Cloud SQL supports it (per architecture §5.9).

1. **Prefer IAM auth path.** If Cloud SQL supports IAM auth for the role in question, rotation is a no-op at the credential level — IAM tokens are short-lived. This sub-procedure applies to the secret-based fallback.

2. **Create new credential.** In Secret Manager, add a new version of the credential. Do NOT immediately disable the old version.

3. **Cut over consumers.** Update the connection strings or trigger the consumer's secret-reload. Most consumers should pick up the new version via Secret Manager's standard rotation hook.

4. **Verify new credential works.** Test a connection from each consumer. Confirm queries succeed.

5. **Disable old credential** after the operations-policy-defined overlap window.

## 3. Rollback procedure

If a rotation step produces an unexpected outcome (auth failures, partner integration broken, application unable to read encrypted data):

### 3.1 KEK rotation rollback

- If the DEK re-encryption saga stalls or produces errors: HALT the saga. Do not retry until root cause identified. The old KEK is still active per the retention policy; existing DEKs remain decryptable. Diagnose, fix, resume the saga from its last checkpoint.
- If a DEK has been re-encrypted but the application cannot read it: this indicates a verification gap. Roll forward: identify the affected DEK, restore from the audit-log canonical copy if needed, re-run the re-encryption for that row.
- ❌ Do NOT mark the old KEK for destruction during rollback. Do NOT manipulate Cloud KMS to "undo" the new KEK creation.

### 3.2 Other rotations

- **WIF binding:** revert to the old binding (it is still active during the rollback window). Investigate the new binding's misconfiguration.
- **Partner JWT signing:** continue signing with the old key (still active during the dual-key window). Coordinate with partner to delay cutover.
- **Webhook signing secret:** provider's dual-secret window covers rollback; revert to old secret on both sides if the new one is broken.
- **Database credentials:** revert to the prior credential (still active during the overlap window).

### Forbidden actions during rotation rollback

- ❌ Marking the old KEK for destruction "to force the new one to work". Old KEK retention is the safety net.
- ❌ Manually re-encrypting individual DEKs outside the saga. Bypasses checkpoint and audit.
- ❌ Sharing rotation secrets via insecure channels (chat, email). Use Secret Manager; if the executor cannot reach Secret Manager, escalate per §5.

## 4. Verification checks

- [ ] **Rotation logged in audit log.** A rotation event entry exists with the executor identity, co-signer identity (high-sensitivity tier), date, secret class, action.
- [ ] **KEK rotation: DEK migration status = 100%.** The named observability metric (architecture §5.9) shows 100%; all DEKs encrypted with new KEK version; old KEK retained but not yet scheduled for destruction.
- [ ] **WIF rotation: target workflow authenticates.** A no-op workflow invocation against the rotated binding succeeds.
- [ ] **Partner JWT rotation: dual-key window observed; partner confirms cutover.** Both keys validated during overlap; partner sign-off recorded.
- [ ] **Webhook signing rotation: provider sign-off; signature validation passes on new secret.** Test event from provider validates.
- [ ] **DB credential rotation: consumers connect using new credential.** Each consumer's last-successful-connection timestamp post-rotation.
- [ ] **High-sensitivity tier: two-person approval logged.** Both approvers captured in audit log.
- [ ] **Audit-log chain intact.** Integrity-check job's next run shows no chain break introduced by rotation events.

## 5. Contact escalation list

- **Primary (operational issue during rotation):** Infrastructure on-call.
- **Two-person co-signer (high-sensitivity tier):** designated co-signer per operations policy (Solo Builder + backup engineer at v1, per architecture §5.9).
- **KEK rotation gone wrong (P0):** Trustee Panel chair on rota; Audit-mirror integrity-check on-call.
- **Partner JWT rotation issue:** Partner contract contact per operations-policy registry.
- **WIF trust binding broken (rare; recovery requires GCP IAM admin):** IAM-admin secondary (≥3 principals per §5.4 "WIF trust-relationship recovery").

---

## Changelog

| Date | git SHA | Author | Material edit? | Re-sign required? | Ledger entry |
|---|---|---|---|---|---|
| 2026-05-29 | _initial_ | Solo Builder | initial | yes (≥2 trustees) | _pending_ |
