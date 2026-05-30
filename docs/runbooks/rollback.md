# Runbook: Rollback

> **Status:** draft (author-committed; awaiting ≥2-trustee sign-off per ledger)
> **Owner role:** Infrastructure on-call (Solo Builder primary at v1; backup engineer per A-13)
> **Last material edit:** 2026-05-29 by Solo Builder (initial)
> **Architectural authority:** architecture.md §1.8 (Migration tool — drizzle-kit forward-only), §5.4 (CI/CD pipeline — signed image promotion, tag immutability), §5.3 (Deployment substrate — Dokploy fallback to Cloud Run), §1.5 (Audit log — single-DB-access tampering posture)

This runbook covers rollback in two dimensions: **code rollback** (redeploy of a previously-signed image) and **schema rollback** (a new forward migration that inverts an unwanted effect). These are different procedures with different invariants; do not conflate them.

## 1. Prerequisites

- **Trigger:** a failed post-deploy verification check (per `deploy.md` §4) OR a regression manifesting after deploy. A subjective concern about a recent deploy is NOT sufficient — the trigger should be a deterministic signal (failed check, observability alert, P0 incident).
- **Deploy log access:** the deployment log (per `deploy.md` §2 step 9) is readable. The prior image SHA is identifiable.
- **Image still in registry:** the prior signed image is still present in Artifact Registry. Tag immutability per architecture §5.4 means the SHA cannot have been overwritten; confirm presence with a registry query before invoking the deploy workflow with the prior SHA.
- **Approval gate (prod only):** the same staging→prod manual-approval gate per architecture §5.4 applies to rollback deploys. Approval can come from Solo Builder OR backup engineer.
- **Schema rollback only:** if rolling back schema, the inverse-effect migration must be authored, code-reviewed, and the migration phase rerun. Do not attempt to rollback schema by direct DB-row manipulation (see §3 "Forbidden actions").

## 2. Step-by-step procedure

### 2.1 Code rollback (redeploy prior signed image)

1. **Identify the prior SHA.** Read the deployment log for the target environment. The row immediately prior to the current row identifies the SHA to roll back to.

2. **Confirm signed image presence.** Query Artifact Registry for that SHA. Verify the signature is valid against the trusted signer identity per architecture §5.4.

3. **Open the deploy runbook (`deploy.md`)** and execute its §2 with the prior SHA as the target. The staging→prod manual-approval gate applies; the approver should note "rollback to SHA <prior>" in the approval message.

4. **Run the deploy verification checks (`deploy.md` §4).** They must pass for the rollback target image. If they fail against the prior image, the rollback itself has failed; escalate per §5 of this runbook.

5. **Update the deployment log** with the rollback row: target SHA (the prior one), deployer identity, rollback timestamp, trigger reference (the failed check or incident ID).

### 2.2 Schema rollback (new forward migration inverting effect)

Architecture §1.8 commits forward-only schema migrations. There is no `--down` path. Schema rollback is therefore a **new forward migration** that inverts the unwanted effect.

1. **Stop further code deploys** against the affected schema until the rollback migration lands. The architecture commits "Migration phase precedes code deploy" — leaving the schema in an intermediate state while continuing to deploy code is forbidden.

2. **Author the inverse-effect migration.**
   - If the unwanted migration added a column, the inverse migration drops it (and the application code that referenced it must be rolled back via §2.1 first to avoid runtime failures).
   - If the unwanted migration added a constraint, the inverse migration drops the constraint.
   - If the unwanted migration backfilled data, the inverse migration restores the prior data state from a backup or from re-derived event-log replay (per architecture §1.14 source-of-truth: persisted state is optimization; events are canonical). The audit log and `packages/events` history are the canonical sources for re-derivation.

3. **Code-review and CI-gate the migration.** The same CI gates apply: schema-diff (FR-100), `benefit_mechanism` tag check, RLS regression test. Do not bypass CI for "fast rollback" — a CI bypass means the rollback could itself be wrong.

4. **Apply migration to the target environment** following the deploy runbook's migration phase. Confirm the migrations table reflects the new SHA.

5. **Verify schema state.** Run a schema-diff against the expected target. Confirm the previously-applied unwanted change is no longer present and the system state matches the intended post-rollback state.

6. **Resume code deploys.**

### 2.3 Combined code + schema rollback (most common)

When a deploy that included a schema migration produced a regression, the rollback order matters:

1. **Code rollback first** (§2.1). This removes the application logic that depended on the new schema.
2. **Schema rollback second** (§2.2). With application code reverted, the schema migration can be inverted safely.

Reversing the order can crash the application against a schema it no longer expects. Always: code first, then schema.

## 3. Rollback procedure (i.e., recovering from a failed rollback)

A failed rollback is a P0 incident. The system is now in an unknown state.

1. **Halt automated processes.** Pause pg-boss workers (per architecture §1.4) to prevent further state change. Disable scheduled jobs (cron-style triggers per Epic 9 §3.6 reconciliation matcher cadence, audit-log integrity check per §1.5) until state is reconciled.

2. **Escalate to P0.** Page Trustee Panel chair on rota AND Infrastructure on-call AND (if separately routed) Audit-mirror integrity-check on-call.

3. **Preserve state for forensics.** Do NOT manipulate the production DB directly to "fix" the rollback failure — the single-DB-access tampering posture (architecture §1.5) means direct DB writes break the audit chain and obscure root cause. State recovery uses event-log replay (architecture §1.14) and audit-log canonical history, not ad-hoc SQL.

4. **Open the DR runbook** if the failure indicates infrastructure-level corruption (per `_template.md` "Related runbooks" — DR runbook is owned by Story 0.4 / architecture §5.7).

### Forbidden actions during rollback

- ❌ `drizzle-kit drop` or any equivalent schema reversal command. Forward-only is non-negotiable (architecture §1.8).
- ❌ Direct DB row updates to "undo" a migration. Breaks audit chain (§1.5).
- ❌ Bypassing CI for the rollback migration. A bad rollback migration is worse than the regression.
- ❌ Bypassing the staging→prod manual-approval gate. The same gate applies to rollback deploys (§5.4).
- ❌ Overwriting the prior image tag. Tag immutability (§5.4) makes this structurally impossible for prod; do not attempt workarounds in non-prod that would normalize the wrong behavior.

## 4. Verification checks

- [ ] **Code rollback:** deployed image SHA equals the prior SHA from the deployment log.
- [ ] **Code rollback:** all `deploy.md` §4 verification checks pass against the rolled-back image.
- [ ] **Schema rollback:** migrations table reflects the inverse-effect migration's SHA.
- [ ] **Schema rollback:** schema-diff against the expected target shows no residual of the inverted change.
- [ ] **Combined rollback:** the application starts cleanly against the rolled-back schema (no runtime errors related to schema mismatch).
- [ ] **Audit chain intact.** The integrity-check job's next run shows no chain break introduced by the rollback. See `audit-log-integrity-verification.md`.
- [ ] **Originally-failing check now passes.** The check whose failure triggered the rollback now returns pass.

## 5. Contact escalation list

- **Primary (rollback execution):** Infrastructure on-call.
- **Failed rollback (P0):** Trustee Panel chair on rota.
- **Schema rollback authoring (review needed):** Engineering Lead (Solo Builder at v1) AND backup engineer (per A-13) for ≥2-person review of the inverse-effect migration.
- **Audit chain concern:** Audit-mirror integrity-check on-call.

---

## Changelog

| Date | git SHA | Author | Material edit? | Re-sign required? | Ledger entry |
|---|---|---|---|---|---|
| 2026-05-29 | _initial_ | Solo Builder | initial | yes (≥2 trustees) | _pending_ |
