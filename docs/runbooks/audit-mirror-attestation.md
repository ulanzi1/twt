# Runbook: Audit-log off-site mirror — quarterly isolation attestation

> **Status:** draft (substrate landed Story 1.10; live apply + first attestation deferred until the mirror project is provisioned)
> **Owner role:** Infrastructure on-call / Trustee-delegated auditor (the audit-read role MUST be separable from the sole-engineer prod-access role per §2.10a)
> **Last material edit:** 2026-06-12 by BigDev (Story 1.10)
> **Architectural authority:** architecture.md §1.5 (L876-887) · §2.10 / §2.10a (L1655-1730) · §5.2 (L2948, L2968) · FR-47 · ADR-0004 (canonical-JSON, chain) — see also `infra/gcp/audit-mirror.tf`

The §2.10a Isolation Commitment makes four properties auditable. This runbook is
the **quarterly attestation** that they still hold. It is operational (the cadence
is a calendar obligation, not code); the verifiable substrate it attests over is
Story 1.10's `audit-mirror.tf` + the `pushNewAuditLinesToMirror` job, and the
chain-verification primitive (`verifyChainSegment`) that Story 1.11a's job runs.

## 1. Prerequisites

- Environment: **prod** (the dev/staging mirrors are unlocked and not attested).
- The mirror project (`twt-audit-mirror`) is provisioned, billing-linked, and
  `audit-mirror.tf` applied with `enable_retention_lock = true`.
- Auditor credentials: read access to the mirror project's IAM + bucket metadata
  (NOT prod app credentials — the separation is the point). Cite IAM per §5.9.
- The mirror writer SA key exists in Secret Manager (the one-way push credential).

## 2. Step-by-step procedure (quarterly)

1. **Property 1 — compromise of prod creds ⇏ mirror modify.** Confirm the bucket
   IAM lists ONLY `audit-mirror-writer` with `roles/storage.objectCreator`, and
   NO principal holds `objectAdmin` / `objectUser` / `legacyBucketWriter` /
   `storage.admin`:
   ```sh
   gcloud storage buckets get-iam-policy gs://<bucket> --project=twt-audit-mirror
   ```
2. **Property 2 — compromise of audit-read ⇏ prod access.** Confirm the auditor
   role used for this attestation has NO role in the PRIMARY project:
   ```sh
   gcloud projects get-iam-policy <primary-project> --flatten=bindings \
     --filter="bindings.members:<auditor-identity>"   # expect: empty
   ```
3. **Property 3 — sole-engineer prod creds ⇏ audit-write.** Confirm no
   primary-project SA (the app / migrate / deploy SAs) holds ANY role in the
   mirror project:
   ```sh
   gcloud projects get-iam-policy twt-audit-mirror --flatten=bindings \
     --filter="bindings.members:<primary-project-number>"   # expect: empty
   ```
4. **Property 4 — controls survive routine IAM mistakes.** Confirm the Bucket
   Lock retention policy is LOCKED and ≥ 7 years:
   ```sh
   gcloud storage buckets describe gs://<bucket> --project=twt-audit-mirror \
     --format="value(retentionPolicy.isLocked, retentionPolicy.retentionPeriod)"
   # expect: True  220752000 (or greater)
   ```
5. **Chain continuity.** Confirm the mirror is current: the latest segment
   object's `maxSeq` is within one mirror interval (6h) of the live chain tail,
   and `verifyChainSegment` over the mirrored segments reports `chainValid`
   (Story 1.11a job; until it lands, spot-check by downloading the latest segment
   and re-running the verifier).
6. Record the attestation in `docs/runbooks/operational-readiness-ledger.md` with
   the git SHA + date + the four pass/fail signals.

## 3. Rollback procedure

Attestation is read-only — there is nothing to roll back. If any property FAILS:

- Property 1/3/4 failure = a potential tamper-surface. Treat as a **P0 security
  incident**: freeze prod IAM changes, snapshot the offending IAM policy, and
  escalate to the Trustee Panel before remediating. Remediation is forward-only
  (correct the binding / re-lock), never a silent fix.
- Property 2 failure = separation-of-duties breach; rotate the auditor identity.

## 4. Verification checks

- `retentionPolicy.isLocked == True` AND `retentionPeriod >= 220752000` (7y).
- Bucket objectCreator binding members == exactly `[audit-mirror-writer SA]`.
- Zero primary↔mirror cross-project IAM bindings (both directions).
- Latest mirrored segment within one 6h interval of the live `audit_log_entries`
  tail; `verifyChainSegment` over mirrored rows → `chainValid: true`.
- Ledger entry appended with the attestation date + SHA.
