# Outstanding Trustee Actions — Register

**Purpose:** one live checklist of every decision / ratification / authorization / sign-off / execution still owed by the Trustee Panel, consolidated from the launch-gate roster, the Phase-0 ledgers, the escrow framework, and the open follow-ups in `.decision-log.md`. This is a **derived view** — the cited sources remain canonical. Update a row when a session closes it; add a row when a new gate appears.

**As of:** 2026-06-24 · **Trustee Panel:** Dhiraj Rahul (T1) · Kalpana Bharti (T2) · **Prepared by:** BigDev (Solo Builder)
**Canonical sources:** `docs/launch-gate-inventory/inventory-roster.md` (current status) · `docs/runbooks/operational-readiness-ledger.md` (Phase-0 figures are "as-of-author-commit" snapshots — may lag) · `docs/escrow/escrow-ledger.md` + `credential-inventory.md` · `.decision-log.md`.

**Readiness key:** **EXECUTE** = authorized, awaiting the trustees to perform · **READY** = artifact authored, a trustee session can sign now · **BLOCKED** = needs an external deliverable first · **FUTURE** = not pending until a predicate fires.

> **Recently cleared (no action):** Decision 059 (18 ADRs) · Decision 060 (9 runbook sign-offs + inventory ratification attested + escrow sealing authorized) · ADR-0011 co-requisite · succession-runbook document gate · A-13 retainer (Row 1 `closed`) · P0-3 (Row 2 `closed`) · Edge/WAF DPDPA (Row 3 `closed`).

---

## 1. EXECUTE — authorized; awaiting the trustees to perform

| # | Action | Owner | Blocked on → unblocks when | Source |
|---|---|---|---|---|
| E1 | **Perform the escrow sealing session** — Task-7 seal the 3 `sealable-now` envelopes (`cloudflare-account-admin`, `dokploy-substrate-admin`, `trust-bank-operational-access`) + Task-8 dry-run + Task-9 table-top | Trustee Panel (≥2) | Schedule the session + confirm each envelope's credential is provisioned → then physically seal | Decision 060; `escrow-ledger.md` Tasks 7–9; Story 0.2 |
| E2 | **Authorize the deploy + rollback drill** — pick the AC-4 path (Path 2 substitute = available now; Path 1 backup engineer = after B3) | Trustee Panel | Choose path + authorize in `.decision-log.md` → then a non-Solo-Builder runs the staging drill (checklist ready) | Decision 060; `operational-readiness-ledger.md` AC-4; `deploy-rollback-execution-validation-checklist.md` |

## 2. READY — artifact authored; a trustee session can sign now (candidates for a next consent sheet)

| # | Action | Owner | Note → unblocks | Source |
|---|---|---|---|---|
| R1 | **Ratify the legal-counsel review scope** (Story 0.13 Task 7) | Trustee Panel (≥2) | The scope charter is authored; ratifying it lets counsel selection (B1) begin — **upstream of the whole legal cluster** | Story 0.13; ledger |
| R2 | **≥2-trustee sign-off of the KT pack** (Story 0.5 Task 8) | Trustee Panel (≥2) | Comprehension administration (Task 9) is a separate downstream leg, gated on the backup engineer (B3) | Story 0.5; ledger |
| R3 | **≥2-trustee sign-off of the degradation policy** (Story 0.4 Task 7) | Trustee Panel (≥2) | Framework is signable now; the 5 comms templates stay **PENDING LEGAL REVIEW** until Story 0.13 counsel returns (carve-out) | Story 0.4; ledger |
| R4 | **Ratify the launch-gate inventory** (Story 0.15 Task 8) + arm the monthly-review cadence (Task 9) | Trustee Panel (≥2) | The **meta-gate** — this register's parent tracker; its own ratification is still pending | Story 0.15; roster |
| R5 | **Ratify the native-stack experiment scope + device-procurement budget** (Story 0.14 Task 7) | Trustee Panel (≥2; budget commitment) | Authorizes the experiment to run; the ratify-or-pivot outcome (B5) comes after | Story 0.14 |

## 3. BLOCKED — needs an external deliverable before the trustee step

| # | Action | Owner | Blocked on → unblocks when | Source |
|---|---|---|---|---|
| B1 | **Engage legal counsel** — selection (Task 8) → engagement letter + NDA + COI (Task 9) → counsel returns (Tasks 10–11) | Trustee Panel + Solo Builder | Outreach / interview / contracting (needs R1 first). ⭐ **Critical path** — unblocks B2, R3 templates, and Rows 8–11 | Story 0.13 |
| B2 | **Per-regulatory-surface sign-offs** — DPDPA grievance-officer designation (Row 8), FR-43A external-forum destination (Row 9), regulatory-surface sign-off (Row 10) | Trustee Panel | Story 0.13 counsel returns (B1) | Roster Rows 8–10 |
| B3 | **Backup engineer** — named-engineer selection + contract signature + IAM grant + onboarding + activation-scenario (Story 0.6 Tasks 10–12) | Trustee Panel + Solo Builder | Hiring + the Story 0.13 contract template (B1). Retainer already authorized (Row 1). Unblocks AC-4 Path 1 (E2) + R2's comprehension admin | Story 0.6 |
| B4 | **Fallback-handler staffing** (P0-1) — Operations-Lead hire OR substitute-handler-bench ratification (Task 8) + per-loop-node role/funding (Task 9) + ≥2-trustee ledger sign-off (Task 10) | Trustee Panel | Hire / funding decision | Story 0.7; roster Row 4 |
| B5 | **Native-stack ratify-or-pivot decision** (P0-5) + ≥1-trustee acknowledgement (Story 0.14 Task 11) | BigDev + ≥1 trustee | The ~2-week RN+Tamagui experiment running (needs R5 budget + device procurement) | Story 0.14; roster Row 7 |
| B6 | **P0-2 member-class validation** — per-leg pre-recruitment Trustee approval (0.9/0.10/0.11) + ≥1-trustee synthesis review (Task 10) + reconciliation (Task 11), across all four empathy legs | Trustee Panel (≥1 per leg) | Field-work execution (recruitment + Hindi interviews + synthesis); P0-2c (0.10) is also coupled to B5 prototype operability | Stories 0.8–0.11; roster Row 5 |
| B7 | **Code-escrow mirror verification** — ≥2-trustee read-access verification + restoration drill + bus-factor switch-to-mirror (Story 0.3 Tasks 7–9) | Trustee Panel (≥2) | Provisioning the GitLab mirror destination. Mirror destination already ratified (ADR-0002) | Story 0.3 |
| B8 | **Trust formation + legal registration** (Row 11) + DPDPA Data-Fiduciary registration / UPI-RBI surface (within Row 10) | Trustees (legal) | Trust legal-formation activities | Roster Row 11 |

## 4. FUTURE — not pending until a predicate fires

| # | Action | Trigger | Source |
|---|---|---|---|
| F1 | **ADR-0017 successor ADR** (replace the interim local-CI-mirror gate) | GitHub Actions restored | Decision 2026-06-20-052 |
| F2 | **Conditional-escalation ratifications** — feature-flag tool (P1), FR-20 pool-spawn capacity envelope, composed Account-State enumeration | Each row's predicate materializes | Roster Rows 12–14 |
| F3 | **Per-partner escrow envelopes** | First partner contract signed (Epic 12) | `credential-inventory.md` |
| F4 | **Cloud SQL escrow sealing** (`cloud-sql-service-account-prod`, `cloud-sql-iam-recovery-grant`) | Live prod provisioning (Story 1.15) | `credential-inventory.md` |
| F5 | **Empty/skeleton/error inventory — Row 6 closure** (ratify the extended inventory) | Epic 11a full-Phase-1-surface completion | Roster Row 6 |
| F6 | **Final go-live sign-off** — all-rows-closed sign-off → arm the Phase-1 launch-readiness signal (Story 0.15 Task 11) | Every row above closed/deferred | Story 0.15; roster |

---

## Critical path

**B1 (engage legal counsel)** is the single biggest unblocker — it gates B2 (Rows 8–10), R3's comms templates, and feeds B3's contract template. **R1** (ratify the counsel scope) is its cheap prerequisite and is signable today. **R4 / F6** (launch-gate inventory ratification → final go-live sign-off) is the meta-gate that ultimately arms Phase-1 launch readiness once everything else closes.

A pragmatic next step: a **second consent sheet** collecting the READY items (R1–R5) — the same instrument that cleared the runbook backlog — would convert the largest signable cluster in one session and start the legal-counsel critical path.

## Maintenance

- This register is **derived**. On any change, update the canonical source first (roster row / ledger / decision-log entry), then reflect it here.
- The Phase-0 figures (R1–R5, B3–B7) come from "as-of-author-commit" ledger snapshots that can lag the canonical roster; treat the roster `current_status` and the latest `.decision-log.md` entry as authoritative if they disagree.
- Suggested cadence: refresh at each trustee session and at the Story 0.15 monthly launch-gate review.
