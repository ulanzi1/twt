# Trustee Consent Sheet — Phase-0 Framework Ratifications (R1–R5)

**Purpose:** collect ≥2-trustee ratification / sign-off for the **READY** cluster of the Outstanding Trustee Actions register — the five Phase-0 framework artifacts that are **authored and signable now** (no external deliverable needed for the trustee step itself). One row per item; mark **Ratify / Sign-off / Defer / Reject** and initial. This is the second consent sheet recommended by `outstanding-trustee-actions.md`: it converts the largest signable cluster in one session **and starts the legal-counsel critical path** (R1 → unblocks counsel engagement).

**Trustee Panel (≥2-trustee quorum required):** Dhiraj Rahul (Trustee 1) · Kalpana Bharti (Trustee 2)
**Prepared by:** BigDev (Solo Builder)
**Authority for each flip:** each framework's own ledger (the sole sign-off authority) · `.decision-log.md` (successor ratification entry). Cross-walk: `docs/knowledge-transfer/outstanding-trustee-actions.md` items **R1–R5**.

> **Already cleared (no action):** Decision 060 (9 runbook sign-offs + inventory ratification attested + escrow sealing authorized) · Decision 059 (18 ADRs) · A-13 retainer (Row 1) · P0-3 (Row 2) · Edge/WAF DPDPA (Row 3).
> **Not on this sheet** (see footnote): the **EXECUTE** items (escrow sealing, deploy/rollback drill — authorized separately) and the **BLOCKED** items (counsel engagement, hiring, provisioning, trust formation) which need external action before a trustee step.

---

## Consent table

| # | What you are signing | Artifact | Recorded gate | Caveat | Trustee decision |
|---|---|---|---|---|---|
| **R1** | **Ratify the legal-counsel review *scope*** — the 5 AC-named scope items + the 32-row cross-Story deferred-scope inventory + the 13-row regulatory-surface review + the 6-row pre-launch checkpoint coverage | `docs/legal-counsel-engagement/review-scope-charter.md` | Story 0.13 Task 7 (Decision 2026-06-02-013) → `engagement-ledger.md` §3 | **Upstream gate.** Ratifying the *scope* lets counsel **selection** begin (B1); it does **not** itself engage counsel. | ☐ Ratify ☐ Defer ☐ Reject — init ____ |
| **R2** | **≥2-trustee sign-off of the Knowledge-Transfer pack** — the 5 PRD §9.1.1 components (ADR-index · Niyamavali→FR mapping · deployment-topology · on-call-playbook · third-party-dependency-inventory) + comprehension questionnaire + answer key | `docs/knowledge-transfer/` (components) | Story 0.5 Task 8 (Decision 2026-05-30-005) → `kt-pack-ledger.md` §2 | Comprehension-questionnaire **administration** to the backup engineer (Task 9) is a separate downstream leg, gated on the backup engineer (B3) — **not** part of this sign-off. | ☐ Sign-off ☐ Defer ☐ Reject — init ____ |
| **R3** | **≥2-trustee sign-off of the per-surface degradation policy** — the surface-inventory + the table-top-exercise runbook | `docs/degradation-policy/` (surface-inventory.md, table-top-exercise.md) | Story 0.4 Task 7 (Decision 2026-05-29-004) → `degradation-policy-ledger.md` | **Carve-out:** the 5 comms templates carry **PENDING LEGAL REVIEW** until Story 0.13 counsel returns (B1) — sign off the framework + inventory + table-top now; the templates re-sign after counsel returns. | ☐ Sign-off (framework; templates carve-out) ☐ Defer ☐ Reject — init ____ |
| **R4** | **Ratify the architectural launch-gate inventory** (the 15-row roster) **+ arm the monthly-review cadence** | `docs/launch-gate-inventory/inventory-roster.md` + `monthly-review-cadence-protocol.md` | Story 0.15 Task 8 + Task 9 (Decision 2026-06-03-015) → `engagement-ledger.md` §3 | **Meta-gate.** Ratifies the *tracker* + the review *process*; it does **not** close the individual rows (each closes per its own discharge path). | ☐ Ratify ☐ Defer ☐ Reject — init ____ |
| **R5** | **Ratify the native-stack experiment scope + device-procurement budget** — the RN+Tamagui protocol (3 named patterns × 3 devices × P1–P6 criteria) + the 3-device procurement budget | `docs/native-stack-validation/experiment-protocol.md` + `device-procurement-roster.md` | Story 0.14 Task 7 (Decision 2026-06-02-014) → `engagement-ledger.md` §3 | **Commits spend** (≥2-trustee budget commitment; cross-coupled with the Story 0.12 contract-help-path budget). Authorizes the experiment to **run**; the ratify-or-pivot *outcome* (B5, ≥1-trustee) comes after. | ☐ Ratify ☐ Defer ☐ Reject — init ____ |

---

## Session Resolution

_To be completed by the Trustee Panel:_

- **Panel present (≥2):** ______________________  ·  ______________________
- **Date:** __________
- **Ratified / signed:** ____________________________  · **Deferred / rejected:** ____________
- **Additional directives:** ____________________________________________

---

## After the session — what I do per signed row

Each signed row gets recorded in **its framework's ledger** (the sole sign-off authority) **plus** a `.decision-log.md` successor entry (one consolidated session entry, next free number **`2026-06-2X-061`** — verify at write time, the counter is global):

1. **R1** → `legal-counsel-engagement/engagement-ledger.md` §3 (scope ratification log); discharges Story 0.13 **Task 7** and **unblocks B1** (counsel selection may begin).
2. **R2** → `kt-pack-ledger.md` §2 (Trustee sign-off log) at the KT-pack git SHA; discharges Story 0.5 **Task 8** (Task 9 comprehension administration stays open under B3).
3. **R3** → `degradation-policy-ledger.md` (Trustee sign-off log); discharges Story 0.4 **Task 7** for the framework, with the **comms-templates carve-out** recorded as still-open pending B1 (per closure-language precision — partial, not over-claimed).
4. **R4** → `launch-gate-inventory/engagement-ledger.md` §3 (inventory ratification log); discharges Story 0.15 **Task 8** + arms the **monthly-review cadence** (Task 9). Roster row statuses are unchanged (the ratification is of the tracker, not the rows).
5. **R5** → `native-stack-validation/engagement-ledger.md` §3 (scope + device-budget ratification log); discharges Story 0.14 **Task 7** and authorizes the experiment to run (procurement + build).

I will then refresh `outstanding-trustee-actions.md` (R1–R5 → cleared; note B1 newly unblocked).

Bring back the marked sheet (or just tell me which rows were ratified / deferred / rejected) and I'll run the cascade.

---

## Footnote — NOT on this sheet (scope boundary)

Per the Outstanding Trustee Actions register, the following are **not** signature-ready and are excluded here:

- **EXECUTE (authorized; trustees perform separately):** escrow Task-7 sealing session (E1) · authorize the deploy/rollback drill path (E2).
- **BLOCKED (need external action first):** engage counsel — selection/signing/returns (B1) · regulatory sign-offs (B2) · backup-engineer hire (B3) · fallback-handler staffing (B4) · native-stack ratify-or-pivot *outcome* (B5) · P0-2 empathy validation (B6) · code-escrow mirror verification (B7) · trust formation + legal registration (B8).
- **FUTURE (predicate-triggered):** ADR-0017 successor · conditional escalations (Rows 12–14) · per-partner escrow · Cloud SQL sealing · Row 6 closure at Epic 11a · final go-live sign-off.

Bring those to future sheets as their predicates / deliverables land.
