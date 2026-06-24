# Trustee Consent Sheet — Outstanding Governance Sign-offs (2026-06-23)

**Purpose:** collect Trustee Panel consent for the governance items that are **blocked on a trustee signature and already have a committed artifact** — the consent-ready signature backlog as of 2026-06-23. One row per item; mark **Sign-off / Defer / Reject** and initial. The broader launch-gate program (legal counsel, trust formation, P0-1/P0-2/P0-5, etc.) is blocked on *external action*, not a signature, and is **NOT on this sheet** — see the scope footnote.

**Trustee Panel (≥2-trustee quorum required):** Dhiraj Rahul (Trustee 1) · Kalpana Bharti (Trustee 2)
**Prepared by:** BigDev (Solo Builder)
**Authority for each flip:** `docs/runbooks/operational-readiness-ledger.md` (runbook authority — "sole source of truth for runbook authority"; ≥2-trustee sign-off at a specific git SHA) · `.decision-log.md` (governance ratifications) · `docs/escrow/escrow-ledger.md` (sealing events).

> **Already discharged (no action):** ADR ratification batch — 18 ADRs (Decision 2026-06-21-059); ADR-0001 credential-escrow mechanism + ADR-0002 mirror destination (2026-06-05); A-13 backup-engineer retainer (launch-gate Row 1 `closed`); P0-3 spec-to-cadence (Row 2 `closed`); ADR-0010 edge/WAF DPDPA (Row 3 `closed`).

---

## Group A — Runbook authority: ≥2-trustee sign-off

A runbook in `docs/runbooks/` is authoritative **only** when the ledger records ≥2-trustee sign-off at a specific git SHA. All nine below are currently `draft — awaiting ≥2-trustee sign-off`. Sign-off is recorded against the runbook's **current git SHA**.

> **Trustee attestation:** By signing a runbook row, the trustee attests that they reviewed the runbook at the git SHA recorded in the operational-readiness ledger and found it suitable for operational use.

| # | Runbook | Why it needs sign-off | Recorded gate | Trustee decision |
|---|---|---|---|---|
| A1 | `deploy.md` | AS-BUILT-reconciled by Story 1.15 (GitHub Actions → Dokploy API leg) — material edit. **ADR-0011 co-requisite.** | Decision 2026-06-21-050 | Sign-off — init __kp & dr__ |
| A2 | `rollback.md` | AS-BUILT-reconciled by Story 1.15 (new-Pariwar rollback + Dokploy redeploy) — material edit. **ADR-0011 co-requisite.** | Decision 2026-06-21-050 | Sign-off - init __kp & dr__ |
| A3 | `multi-pariwar-provisioning.md` | AS-BUILT-reconciled by Story 1.15 — material edit. **ADR-0011 co-requisite.** | Decision 2026-06-21-050 | Sign-off — init __kp & dr__ |
| A4 | `secret-rotation.md` | Story 1.5 Tier-1 KEK + Tier-2 HMAC specifics added (§2.1.1–§2.1.3). | Story 0.1 / Decision 2026-06-05-017 | Sign-off — init __kp & dr__ |
| A5 | `audit-log-integrity-verification.md` | Phase-0 runbook (§1.5 hash chain + Object Lock). | Story 0.1 / Decision 2026-06-05-017 | Sign-off — init __kp & dr__ |
| A6 | `reconciliation-manual-intervention.md` | Phase-0 runbook (§3.6 bank-statement intake). | Story 0.1 / Decision 2026-06-05-017 | Sign-off — init __kp & dr__ |
| A7 | `rbac-seed-reset.md` | Phase-0 runbook (RBAC seed). NB: the OQ-3 seed-matrix amendments (Decision 059 amendment B) are a **separate** pre-production-seed implementation gate, not blocked by this sign-off. | Story 0.1 / Decision 2026-06-05-017 | Sign-off — init __kp & dr__ |
| A8 | `job-queue-operations.md` | Story 1.12 pg-boss job-queue + idempotency-store operations. | Decision (Story 1.12 closure) | Sign-off — init __kp & dr__ |
| A9 | `trustee-credential-loss-succession.md` | **NEW** — admin credential-loss + Super-Admin succession + break-glass. Invariants SA-1…SA-5 (incl. the 2026-06-23 separation-of-duties + 24h break-glass reconciliation amendments). **Discharges the Decision 059 amendment-A go-live gate.** | Decision 2026-06-21-059 amendment A | Sign-off — init __kp & dr__ |

> **A1 + A2 + A3** signed ⇒ discharges the **ADR-0011 co-requisite** (Decision 2026-06-21-050). **A9** signed ⇒ discharges the **Decision 059 amendment-A** "succession runbook before production go-live" gate. (Per `operational-readiness-ledger.md`, material edits require ≥2 trustees; minor edits ≥1.)

---

## Group B — Governance artifact ratification

| # | Artifact | What it is | Recorded gate | Trustee decision |
|---|---|---|---|---|
| B1 | `docs/ux/empty-skeleton-error-inventory.md` | Empty / skeleton / error-state inventory for the Story 2.5 `apps/public` surfaces (Niyamavali list + version/diff sub-views + 404 + 500). Author-committed; no `<TBD>` cells; skeleton recorded N/A-by-design for the zero-hydration SSR surface. | Decision 2026-06-21-058 (≥2-trustee ratification **un-attested-pending**); launch-gate Row 6 |  Ratify — init __kp & dr__ |

> **B1 is PARTIAL** (`apps/public` only). Ratifying it attests the Story 2.5 surface set; launch-gate **Row 6 stays `in-progress`** and closes only at Epic 11a full-Phase-1-surface completion. **Do NOT relax the Row 6 closure criteria.**

---

## Group C — Credential escrow: Task-7 sealing execution

The sealing **mechanism + custodial paths are already ratified** (ADR-0001 + Decision 2026-06-05-018): physical tamper-evident envelopes; `prod-credential` custody = trustee residences. What remains is the trustee **execution** of the sealing (Story 0.2 Task 7) for the `sealable-now` `prod-credential` envelopes, plus the Task-8 dry-run. This is an *action* the trustees perform (recorded in `escrow-ledger.md`), not a document sign-off.

| # | Action | Scope | Recorded gate | Trustee decision |
|---|---|---|---|---|
| C1 | Authorize + schedule the **Task-7 sealing session**. Sealing events must be recorded in `escrow-ledger.md` and witnessed by at least one trustee participant. | 3 `sealable-now` `prod-credential` envelopes: `cloudflare-account-admin` · `dokploy-substrate-admin` · `trust-bank-operational-access` | Story 0.2 Task 7 (`AWAITING EXTERNAL ACTION`) |  Authorize — init __kp & dr__ |
| C2 | Authorize the **Task-8 dry-run** quorum-open (≥1 per envelope-class) | `prod-credential` class | Story 0.2 Task 8 | Authorize — init __kp & dr__ |

> Confirm at the session that each envelope's credential is provisioned. The Cloud SQL envelopes (`cloud-sql-service-account-prod`, `cloud-sql-iam-recovery-grant`) stay `pending-task-7` until live prod provisioning (Story 1.15) and are **not** on this sheet.

---

## Session Resolution

> **Standing governance rule:** Any directive that changes an already-ratified ADR, runbook, or launch-gate requirement requires a successor decision-log entry and does not take effect solely through meeting notes.

_To be completed by the Trustee Panel:_

- **Panel present (≥2):** _____Dhiraj Rahul_________________  ·  ______Kalpana Bharti________________
- **Date:** ___23rd June _______
- **Group A — runbooks signed:** ___all_________________________  · **deferred/rejected:** ____________
- **Group B — inventory:** ☑ ratified
- **Group C — escrow sealing:** ☑ authorized (Task-7 sealing execution-pending)
- **Additional directives:** At least one successful, documented **deploy + rollback execution** using the now-signed runbooks is required before production go-live (recorded as a gated execution-validation requirement — Decision 2026-06-23-060).

---

## After the session — what I do per signed row

1. **Group A (runbook signed)** — move the row from the `operational-readiness-ledger.md` "to-be-signed" inventory into the **sign-off table** with the runbook git SHA + trustee signers + date, and flip the runbook header `Status: draft → signed-off`. Then:
   - **A1+A2+A3** → append a `.decision-log.md` entry recording the AS-BUILT sign-offs and **discharging the ADR-0011 co-requisite** (Decision 2026-06-21-050).
   - **A9** → append a `.decision-log.md` entry recording the sign-off and **discharging the Decision 059 amendment-A** go-live gate.
2. **Group B (inventory ratified)** — append a successor `.decision-log.md` entry recording the **attested** ≥2-trustee ratification (supersedes the un-attested-pending leg of Decision 2026-06-21-058); launch-gate Row 6 stays `in-progress`.
3. **Group C (sealing authorized/executed)** — record the seal events in `escrow-ledger.md` "Sealing log" + the dry-run log; link a `.decision-log.md` entry.

> Next `.decision-log.md` number: **`2026-06-2X-060`** (060 is the next free counter as of 2026-06-23; the date prefix = the session date — verify at write time, the counter is global).

**✓ Cascade applied 2026-06-23** (Decision 2026-06-23-060): all rows consented.
- **Group A** — 9 runbooks recorded in `operational-readiness-ledger.md` sign-off table (≥2-trustee, SHA `f247e6d`) and flipped `draft → signed-off`; the ADR-0011 co-requisite (Decision 2026-06-21-050) and the Decision 059 amendment-A document gate are discharged.
- **Group B** — empty/skeleton/error inventory ratification recorded as **attested** (supersedes the un-attested-pending leg of Decision 058); Row 6 stays `in-progress`.
- **Group C** — Task-7 sealing + Task-8 dry-run **authorized** in `escrow-ledger.md`; physical sealing execution-pending (un-attested until sealed).
- **Trustee directive** — deploy + rollback documented execution-validation recorded as a gated, not-yet-executed item in the Execution-validation log.

---

## Footnote — scope boundary (what is NOT on this sheet)

These remain open but are blocked on **external action**, not a trustee signature, so they live on the launch-gate roster (`docs/launch-gate-inventory/inventory-roster.md`), not here. Bring them to a future consent sheet as their artifacts / counsel returns land:

- **P0-1** lifecycle/operational-state coverage (Row 4) · **P0-2** member-class validation (Row 5) · **P0-5** native-stack experiment + budget (Row 7).
- **Legal/regulatory:** DPDPA grievance-officer designation (Row 8) · FR-43A external-forum destination (Row 9) · regulatory-surface sign-off (Row 10) · trust formation + legal registration (Row 11) — these depend on Story 0.13 legal-counsel returns.
- **Phase-0 framework ratifications** awaiting their Tasks 7–11 external action: Story 0.4 (degradation policy), 0.5 (KT pack), 0.7 (fallback-handler ledger), 0.13 (legal-counsel scope), 0.14 (native-stack), 0.15 (launch-gate inventory).
- **Conditional-escalation** candidates (Rows 12–14): feature-flag tool (P1), FR-20 pool-spawn capacity envelope, composed Account-State enumeration — pending their predicates.
