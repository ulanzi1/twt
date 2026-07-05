# Outstanding Trustee Actions — Register

**Purpose:** one live checklist of every decision / ratification / authorization / sign-off / execution still owed by the Trustee Panel, consolidated from the launch-gate roster, the Phase-0 ledgers, the escrow framework, and the open follow-ups in `.decision-log.md`. This is a **derived view** — the cited sources remain canonical. Update a row when a session closes it; add a row when a new gate appears.

**As of:** 2026-07-05 · **Trustee Panel:** Dhiraj Rahul (T1) · Kalpana Bharti (T2) · **Prepared by:** BigDev (Solo Builder)
**Canonical sources:** `docs/launch-gate-inventory/inventory-roster.md` (current status) · `docs/runbooks/operational-readiness-ledger.md` (Phase-0 figures are "as-of-author-commit" snapshots — may lag) · `docs/escrow/escrow-ledger.md` + `credential-inventory.md` · `.decision-log.md`.

**Readiness key:** **EXECUTE** = authorized, awaiting the trustees to perform · **READY** = artifact authored, a trustee session can sign now · **BLOCKED** = needs an external deliverable first · **FUTURE** = not pending until a predicate fires.

> **Recently cleared (no action):** Story 0.15 Task 9 first monthly launch-gate review (2026-07-05 — no rows closed/escalated/elevated; Rows 4+5 flagged at-risk for next review; next review 2026-08-05) · Decision 064 (R1-R4: legal-counsel review scope · KT pack sign-off · degradation-policy framework sign-off · launch-gate inventory ratification + monthly cadence armed) · Decision 059 (18 ADRs) · Decision 060 (9 runbook sign-offs + inventory ratification attested + escrow sealing authorized) · ADR-0011 co-requisite · succession-runbook document gate · A-13 retainer (Row 1 `closed`) · P0-3 (Row 2 `closed`) · Edge/WAF DPDPA (Row 3 `closed`).

> **Register correction (2026-07-05):** the prior "as of 2026-06-24" snapshot listed R5 (Story 0.14 Task 7 — native-stack experiment scope + device-procurement budget) as still pending. It was actually already ratified **2026-06-05** via Decision 2026-06-05-030 (the Q14.1-Q14.4 trustee-questionnaire mechanism), and Story 0.14 had also closed Task 8 (procurement) and most of Task 9 (Days 1-9 of the 14-day prototype build) by that same date — none of which this register had caught up to. No new ratification was recorded for R5 on the 2026-07-05 consent sheet; see the corrected Story 0.14 entry under BLOCKED below. Per [[feedback_record_unattested_no_backfill]], this correction is recorded openly rather than silently reconciled.

---

## 1. EXECUTE — authorized; awaiting the trustees to perform

| # | Action | Owner | Blocked on → unblocks when | Source |
|---|---|---|---|---|
| E1 | **Perform the escrow sealing session** — Task-7 seal the 3 `sealable-now` envelopes (`cloudflare-account-admin`, `dokploy-substrate-admin`, `trust-bank-operational-access`) + Task-8 dry-run + Task-9 table-top | Trustee Panel (≥2) | Schedule the session + confirm each envelope's credential is provisioned → then physically seal | Decision 060; `escrow-ledger.md` Tasks 7–9; Story 0.2 |
| E2 | **Authorize the deploy + rollback drill** — pick the AC-4 path (Path 2 substitute = available now; Path 1 backup engineer = after B3) | Trustee Panel | Choose path + authorize in `.decision-log.md` → then a non-Solo-Builder runs the staging drill (checklist ready) | Decision 060; `operational-readiness-ledger.md` AC-4; `deploy-rollback-execution-validation-checklist.md` |

## 2. READY — artifact authored; a trustee session can sign now (candidates for a next consent sheet)

_(Empty as of 2026-07-05 — the R1-R4 cluster cleared via Decision 064; R5 was already closed 2026-06-05 per the register correction above. No new signature-ready artifact has surfaced since. The next trustee action due is Story 0.15 Task 9 — see "Next up" below — which is a review/meeting event, not a document sign-off, so it is not listed here.)_

## 3. BLOCKED — needs an external deliverable before the trustee step

| # | Action | Owner | Blocked on → unblocks when | Source |
|---|---|---|---|---|
| B1 | **Engage legal counsel** — selection (Task 8, **now unblocked** — R1 ratified 2026-07-05) → engagement letter + NDA + COI (Task 9) → counsel returns (Tasks 10–11) | Trustee Panel + Solo Builder | Outreach / interview / contracting can begin now. ⭐ **Critical path** — unblocks B2, R3 templates, and Rows 8–11 | Story 0.13 |
| B2 | **Per-regulatory-surface sign-offs** — DPDPA grievance-officer designation (Row 8), FR-43A external-forum destination (Row 9), regulatory-surface sign-off (Row 10) | Trustee Panel | Story 0.13 counsel returns (B1) | Roster Rows 8–10 |
| B3 | **Backup engineer** — named-engineer selection + contract signature + IAM grant + onboarding + activation-scenario (Story 0.6 Tasks 10–12) | Trustee Panel + Solo Builder | Hiring + the Story 0.13 contract template (B1). Retainer already authorized (Row 1). Unblocks AC-4 Path 1 (E2) + R2's comprehension admin | Story 0.6 |
| B4 | **Fallback-handler staffing** (P0-1) — Operations-Lead hire OR substitute-handler-bench ratification (Task 8) + per-loop-node role/funding (Task 9) + ≥2-trustee ledger sign-off (Task 10) | Trustee Panel | Hire / funding decision | Story 0.7; roster Row 4 — **flagged at-risk at the 2026-07-05 monthly review**; revisit 2026-08-05 |
| B5 | **Native-stack ratify-or-pivot decision** (P0-5) + ≥1-trustee acknowledgement (Story 0.14 Task 11) | BigDev + ≥1 trustee | Scope/budget (Task 7), procurement (Task 8), and Days 1-9 of the prototype build (Task 9) already closed 2026-06-05 per Decision 2026-06-05-030. What remains: Task 10 (Solo Builder measurement collection across 3 devices — not yet run) → Task 11 (ratify-or-pivot proposal + ≥1-trustee acknowledgement). No trustee action pending until Task 10 produces evidence. | Story 0.14; roster Row 7 — assessed on-track at the 2026-07-05 monthly review |
| B6 | **P0-2 member-class validation** — per-leg pre-recruitment Trustee approval (0.9/0.10/0.11) + ≥1-trustee synthesis review (Task 10) + reconciliation (Task 11), across all four empathy legs | Trustee Panel (≥1 per leg) | Field-work execution (recruitment + Hindi interviews + synthesis); P0-2c (0.10) is also coupled to B5 prototype operability | Stories 0.8–0.11; roster Row 5 — **flagged at-risk at the 2026-07-05 monthly review**; revisit 2026-08-05 |
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

**B1 (engage legal counsel)** is the single biggest unblocker — it gates B2 (Rows 8–10), R3's comms templates, and feeds B3's contract template. Its prerequisite (R1, ratify the counsel scope) closed 2026-07-05 — **B1 counsel selection (Task 8) can start now.** **R4 / F6** (launch-gate inventory ratification → final go-live sign-off) is the meta-gate; its ratification also closed 2026-07-05, arming the monthly-review cadence.

## Next up (2026-07-05, post-review)

**Story 0.15 Task 9 (first monthly review) is now closed** — held 2026-07-05, signed by both trustees, no rows closed/escalated/elevated. Two trustee-assessment flags carried forward (not formal escalations): **Row 4 (B4, fallback-handler staffing)** and **Row 5 (B6, P0-2 member-class validation)** are **at-risk**; revisit at the 2026-08-05 review. The Panel's recorded directive: proceed with legal-counsel selection under the ratified R1 scope, continue B1/B4/B6/B8, and review progress next session.

No new document is signature-ready today (the READY cluster is still empty — see §2). The concrete next actions are:

1. **B1 — legal-counsel selection (Story 0.13 Task 8).** Trustee-directed to proceed now. Execution by Trustee Panel + Solo Builder (outreach → shortlist → interviews); no new signature needed until the engagement letter (Task 9) is ready. **Critical path.**
2. **B4 / B6 — address the at-risk flags** before 2026-08-05: B4 needs a hire/funding decision (Operations Lead vs substitute-handler-bench); B6 needs empathy-interview field-work execution across the 4 legs. Neither is blocked on a trustee document today — both need Trustee-Panel-driven progress to avoid a formal escalation at the next review.
3. **Story 0.14 Task 10 — Solo Builder runs the native-stack measurements.** Execution-only; produces the evidence Task 11's ratify-or-pivot proposal needs. No trustee action until then.
4. **Next monthly review: 2026-08-05.** Standing agenda per `monthly-review-cadence-protocol.md` §2, opening with a status check on the two at-risk rows.

The next **consent sheet** (signature instrument) will surface once one of: (a) B1 produces a named-counsel engagement letter, (b) a future monthly review closes/escalates a roster row, or (c) Story 0.14 Task 11's ratify-or-pivot proposal is ready for ≥1-trustee acknowledgement.

## Maintenance

- This register is **derived**. On any change, update the canonical source first (roster row / ledger / decision-log entry), then reflect it here.
- The Phase-0 figures (R1–R5, B3–B7) come from "as-of-author-commit" ledger snapshots that can lag the canonical roster; treat the roster `current_status` and the latest `.decision-log.md` entry as authoritative if they disagree.
- Suggested cadence: refresh at each trustee session and at the Story 0.15 monthly launch-gate review.
