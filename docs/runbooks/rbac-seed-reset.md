# Runbook: RBAC Seed Reset

> **Status:** signed-off — ≥2-trustee (Dhiraj Rahul + Kalpana Bharti) 2026-06-23 at git SHA `f247e6d` per `operational-readiness-ledger.md` (Decision 2026-06-23-060). NB: OQ-3 seed-matrix amendments (Decision 2026-06-21-059 amendment B) remain a separate pre-production-seed gate.
> **Owner role:** Infrastructure on-call (Solo Builder primary at v1; backup engineer per A-13) with Engineering Lead co-sign for prod resets
> **Last material edit:** 2026-05-29 by Solo Builder (initial)
> **Architectural authority:** architecture.md §2.6 (RBAC enforcement — permission keys + scope dimensions), §1.5 (Audit log — every privileged action audited), AR-26 (server-side RBAC enforcement), FR-44 (RBAC permission keys), FR-45 (scope dimensions), FR-46 (12 seeded roles); epics.md Epic 1 Story 1.8 (RBAC permission-keys + scope-dimensions + 12 seeded roles — owns the seed script)

This runbook covers re-seeding the **canonical 12 role definitions** (FR-46) without destroying tenant-assigned role grants. The two concerns are architecturally distinct: role definitions are operator-managed catalog entries; role grants are tenant-managed assignments. A seed reset MUST preserve grants.

## 1. Prerequisites

- **Seed script available:** Epic 1 Story 1.8 commits the canonical seed script for the 12 roles. The script is the sole authority for the role-definition catalog. Confirm the script is the version-pinned current authority (matches the `roles_seed_version` recorded in operations policy).
- **Backup of current grants:** before re-seeding, take a snapshot of all current role grants (per-user, per-Pariwar). If the reset accidentally affects grants, the snapshot is the recovery source.
- **Audit-log baseline:** integrity check has passed within the operational window (per `audit-log-integrity-verification.md`). Re-seed events are themselves audited; a broken chain pre-reset corrupts the audit trail of the reset.
- **Permission-key model understood:** architecture §2.6 commits permission keys + scope dimensions (FR-44, FR-45). A role is a named bundle of (permission_key, scope_dimension) tuples. Re-seeding replaces the bundle; grants are user→role assignments, separate.
- **Server-side enforcement only:** per AR-26, RBAC is enforced server-side; do NOT change client-side role caches as a substitute for re-seeding.
- **Two-person co-sign (prod only):** prod re-seed requires Engineering Lead co-sign per A-13 (backup engineer can co-sign).

## 2. Step-by-step procedure

### 2.1 Diagnose: confirm a reset is actually needed

Seed reset is rare. Triggers:

- **Role-definition drift detected.** The catalog's role-permission mapping diverges from the seed script's intent. Could be from a hand-edit, a partial migration, or a corrupted seed run.
- **New role added to canonical 12 + 1 (e.g., for compliance).** Actually NOT a reset — this is an additive change owned by Story 1.8 or a follow-on story. Mark this case as "out of scope; route to Story 1.8 follow-on."
- **Forensic reset post-incident.** A trust-internal incident requires re-establishing role definitions from canonical source.
- **Per-Pariwar drift.** Re-provisioning a Pariwar's role catalog from canonical (see `multi-pariwar-provisioning.md`).

If the trigger does NOT match one of the above, halt and reassess — a reset for the wrong reason can destroy custom configuration the trust meant to preserve.

### 2.2 Snapshot current grants

1. **Identify scope.** Per-Pariwar (single Pariwar) or trust-wide (all Pariwars).

2. **Export grants.** Query the role-grant table per scope. Capture: user identity, Pariwar (if applicable), role name, scope-dimension values (per FR-45), grant timestamp, grantor.

3. **Store snapshot in audit-accessible location.** Per architecture §1.5, the snapshot is itself a privileged action; the snapshot export emits an audit-log entry.

4. **Verify snapshot row-count.** Compare to a fresh count query against the live table; counts should match (snapshot is point-in-time consistent per architecture §3.9 read-consistency policy).

### 2.3 Diff current catalog against seed-script intent

1. **Run the seed script in dry-run mode.** Story 1.8's seed script supports dry-run per the standard architectural pattern (architecture §1.4 idempotency — applying the seed is itself idempotent).

2. **Read the dry-run diff.** The diff shows: roles to add, roles to update (permission-key bundle differs), roles to remove. A "remove" event during reset is unusual — confirm the role is genuinely not in the canonical 12 + any compliance additions before proceeding.

3. **If "remove" events exist, halt and escalate.** Removing a role definition can leave grants pointing at a non-existent role. The seed script's safe-removal path requires no active grants for that role; verify against the snapshot from §2.2.

### 2.4 Apply seed reset

1. **Open a Terraform-mediated change or equivalent governance flow** (operations policy commits the specific tool). The change is co-signed in prod per A-13.

2. **Apply the seed script** against the target Pariwar's catalog (or trust-wide if scope dictates). Idempotency means re-running is safe; the script's behavior is deterministic.

3. **Confirm catalog updated.** Run a fresh diff dry-run; expect no pending changes.

4. **Confirm grants preserved.** Compare a fresh snapshot to the §2.2 snapshot; grants should be unchanged. If grants are missing, restore from §2.2 immediately and halt per §3.

5. **Emit reset event to audit log.** Per architecture §1.5, every privileged action emits a hash-chained audit line. The seed reset event captures: scope, executor, co-signer (prod), seed-script version, diff applied, grants-preserved check outcome.

### 2.5 Verify per-Pariwar isolation

Per architecture §1.2 (Postgres RLS via `pariwar_id`) and §5.14 (per-Pariwar isolation strategy), a re-seed on one Pariwar must NOT affect another Pariwar's catalog or grants.

1. **Cross-Pariwar adversarial check.** For each non-target Pariwar, fresh snapshot and diff against pre-reset snapshot; expect zero changes.

2. **RLS adversarial read test.** Run the architectural CI gate locally (architecture §5.4 CI gates: cross-Pariwar adversarial read test); confirm no leak between Pariwars in the role-grant table.

## 3. Rollback procedure

If §2.4 step 4 grants-preserved check fails, OR if post-reset behavior indicates the reset broke things:

1. **Halt RBAC-dependent surfaces.** Admin authentication (Story 1.9) and admin operations (Epic 10) are RBAC-dependent. Pause or surface a maintenance banner via the banner manager (Story 10.9).

2. **Restore from §2.2 snapshot.** Re-apply the grants from the snapshot. Architecture §1.5 commits: the snapshot is point-in-time consistent; restore is a forward operation, not a revert.

3. **Re-run §2.3 dry-run** to confirm catalog state matches expected post-reset; restore did not also corrupt the catalog.

4. **Open incident review.** Capture what diverged; whether the seed script behavior was correct; whether operations-policy needs updating.

### Forbidden actions

- ❌ Hand-editing the role-permission mapping outside the seed script. The seed script is the sole authority per Epic 1 Story 1.8.
- ❌ Re-seeding with grant truncation as a "clean slate". Grants are tenant-managed; trustees did not authorize re-grant.
- ❌ Re-seeding in prod without co-sign per A-13.
- ❌ Cross-Pariwar re-seed in a way that leaks grants across Pariwars (architecture §1.2 RLS commitment).
- ❌ Bypassing audit-log emission. Architecture §1.5 commits every privileged action emits an audit line; bypass invalidates the bus-factor recovery posture.
- ❌ Client-side RBAC cache manipulation as a substitute for re-seed. Architecture AR-26: server-side enforcement only.

## 4. Verification checks

- [ ] **Catalog matches seed-script intent.** Post-reset dry-run shows no pending changes.
- [ ] **Grants count preserved.** Fresh snapshot row-count equals §2.2 snapshot row-count.
- [ ] **Grants content preserved.** Sampled grant rows match the §2.2 snapshot (full diff for small Pariwars; sampled diff for large).
- [ ] **Per-Pariwar isolation intact.** Non-target Pariwars show zero diff.
- [ ] **RLS adversarial read test passes.** No cross-Pariwar grant leakage.
- [ ] **Audit-log entries emitted.** Reset events present with executor + co-signer + scope + diff summary.
- [ ] **Server-side enforcement verified.** A test request from a user without the relevant role is rejected by the server (not just the client).
- [ ] **Admin authentication still works.** Test login via passkey + step-up OTP per Story 1.9.

## 5. Contact escalation list

- **Primary (reset execution):** Infrastructure on-call.
- **Co-signer (prod):** Engineering Lead (Solo Builder at v1) OR backup engineer per A-13.
- **Grants-preserved check failure (rollback required):** Trustee Panel chair on rota (RBAC integrity is trustee-relevant).
- **Seed script behavior anomaly:** Engineering Lead AND Story 1.8 owner (Solo Builder for both at v1).
- **Cross-Pariwar leakage detected (P0; RLS isolation violation):** Trustee Panel chair on rota AND Audit-mirror integrity-check on-call.

---

## Changelog

| Date | git SHA | Author | Material edit? | Re-sign required? | Ledger entry |
|---|---|---|---|---|---|
| 2026-05-29 | _initial_ | Solo Builder | initial | yes (≥2 trustees) | _pending_ |
