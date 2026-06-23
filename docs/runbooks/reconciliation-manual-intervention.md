# Runbook: Reconciliation Manual-Intervention

> **Status:** signed-off — ≥2-trustee (Dhiraj Rahul + Kalpana Bharti) 2026-06-23 at git SHA `f247e6d` per `operational-readiness-ledger.md` (Decision 2026-06-23-060)
> **Owner role:** Reconciliation operator (helpdesk subsystem per Epic 10) with Engineering Lead on second-line for matcher-internal issues
> **Last material edit:** 2026-05-29 by Solo Builder (initial)
> **Architectural authority:** architecture.md §3.6 (Bank statement intake transport), §3.9 (Read consistency policy), §1.4 (Idempotency keyed store), epics.md Epic 9 (Reconciliation Engine — esp. Stories 9.1 nominee console, 9.4 UTR matching engine, 9.7 mismatch detection, 9.8 review queue, 9.9 dual nominee bank accounts, 9.11 over-payment), epics.md Epic 7 Story 7.6 (Pool-bound payment enforcement: wrong-pool rejected, no refund, facilitated recovery)

This runbook covers operator-side manual intervention when the automated UTR matching engine flags a case the operator must triage. It is **distinct from** the "Reconciliation triage procedure" runbook named in architecture §5.15 (which is owned by Epic 9 Stories 9.1/9.4/9.7/9.8); this Story 0.1 runbook covers the Phase-0 baseline manual-intervention pathway needed for bus-factor mitigation.

## 1. Prerequisites

- **Matcher operational:** the UTR matching engine (Epic 9 Story 9.4) is running on its committed cadence (cron 6×/day per Story 9.4); idempotent; replayable. If the matcher is down, this runbook does NOT cover that scenario — escalate per §5.
- **Bank statement intake:** statement intake transport per architecture §3.6 is operational. The five-bank parser allowlist (Story 9.2) is current; golden files are present per Story 9.2.
- **Operator credentials:** the operator has the reconciliation-operator RBAC role (per architecture §2.6 server-side enforcement; FR-46 12 seeded roles) scoped to the relevant Pariwar.
- **Member/nominee context:** for the case being triaged, the operator has access to the member's contribution record, nominee bank account(s) (dual-account support per Story 9.9 — RBI UPI limit workaround), and the relevant pool's state (per Epic 7 Story 7.1).
- **Pool-bound payment invariant understood:** wrong-pool payments are rejected; no refund; facilitated recovery only (Epic 7 Story 7.6). The operator must NOT attempt automatic refunds — this would violate the architectural commitment.

## 2. Step-by-step procedure

Sub-procedures by intervention type. Use the one that matches the case being triaged; do not mix.

### 2.1 Mismatch detection (matcher flagged a yellow-stuck case)

A contribution recorded by the member (yellow pill per Story 9.5) has not flipped to green (confirmed) within the operational window. The matcher could not auto-correlate the UTR with a bank statement entry.

1. **Read the member's self-attestation.** Per Story 8.4, members self-attest the UTR + amount at contribution time. The yellow pill indicates self-attestation present; green flip is gated on bank-statement match (Story 9.5: `contribution.confirmed` as canonical financial truth).

2. **Open the bank statement intake.** Per architecture §3.6 and Story 9.2, statements arrive via the parser allowlist (5 banks at v1; PDF + OCR is Phase 2 per architecture §3.6). Confirm the statement covering the contribution date is present.

3. **Locate the UTR in the statement.** Match by UTR string exact match (matcher's primary key per Story 9.4). If found:
   - Verify amount matches (idempotent + replayable per Story 9.4).
   - Verify pool-binding is correct (Story 7.6: wrong-pool payment is a separate sub-procedure — §2.2 below).
   - If match is clean, trigger the matcher's reconciliation flow for this entry. Matcher emits `contribution.confirmed` (the canonical financial truth event per Story 9.5). Yellow pill flips to green via Story 9.6's `<StatusPill>` design system component.

4. **If UTR not found in statement (genuine mismatch):**
   - Engage the member via the helpdesk subsystem (Story 10.2). Member may have an incorrect UTR.
   - Mismatch detection surface (Story 9.7 `<SelfVerifySurface>`) prompts member-driven recovery: screenshot upload, re-attestation.
   - If recovery does not resolve, escalate to nominee console operator (Story 9.1) for staff-takeover per "Fursat" cadence — by Day N per Story 9.1.

5. **Record intervention** in the reconciliation review queue (Story 9.8 — ordered by alert-deadline proximity).

### 2.2 Wrong-pool payment (Epic 7 Story 7.6 facilitated recovery)

A member paid to a pool other than their assigned pool. The matcher detects the wrong-pool binding and rejects the payment per architectural commitment.

1. **Confirm pool-binding mismatch.** Read the member's current pool assignment (Story 7.4 deterministic assignment); read the pool the payment landed in. They must not match.

2. **Reject the contribution against the wrong pool.** The matcher does this automatically per Story 7.6. The operator confirms the rejection is recorded.

3. **❌ Do NOT issue a refund.** Story 7.6 commits: wrong-pool payments are rejected, NO refund, facilitated recovery only. Any operator attempting a refund violates the architectural invariant.

4. **Facilitated recovery path.** Operator engages the member via helpdesk (Story 10.2) explaining the pool-binding error. The member's options:
   - **Re-pay to the correct pool.** The wrong-pool amount stays in the trust account; the member's correct-pool obligation is satisfied by a new payment. The wrong-pool amount is held in a facilitated-recovery state per operations policy.
   - **Pool-naming context check.** Per Story 7.2, the dual-identifier UX (UX-DR72) should help members identify pools; if the member was misled by a UI ambiguity, file a helpdesk ticket flagging the UX issue for Story 7.2 owners.

5. **Hold facilitated-recovery state.** Operations policy commits the hold duration and disposition. Do NOT auto-refund after a duration; the architectural invariant is "no refund" — disposition is a trustee decision per operations policy.

### 2.3 Over-payment (Story 9.11 facilitated recovery)

A member paid more than the fixed-amount snapshot for the current cycle (per Story 7.5).

1. **Confirm over-payment.** Compare the contribution amount to the cycle's fixed-amount snapshot (Story 7.5; emergency adjustment override per Story 7.5 if applicable).

2. **Record the over-payment.** Excess amount goes into facilitated-recovery state per Story 9.11.

3. **Engage member via helpdesk.** Explain the over-payment; offer options per operations policy (apply to next cycle within the same pool, refund-via-trustee-approval, hold).

4. **❌ Do NOT auto-refund.** Same architectural invariant as §2.2 (wrong-pool). Refunds, if any, are trustee-ratified actions.

### 2.4 Under-funded cycle close-of-cycle (Story 7.8)

This is a cycle-level intervention, not a per-contribution intervention. The pool engine detects close-of-cycle that did not reach the funded threshold.

1. **Confirm under-funding.** Pool engine emits the close-of-cycle event (Story 7.8 template-driven framing per Pool-Reality #1 and #2).

2. **Apply template-driven framing.** The architectural commitment is template-driven communication, not ad-hoc improvisation per under-funded scenario. Use the template; cite the Pool-Reality applied (#1 or #2 per Story 7.8).

3. **Coordinate with admin operations (Epic 10).** The Trustee-Lite list (Story 10.11), reports & exports (Story 10.7), and member moderation (Story 10.10) surfaces may all be touched during an under-funded close.

4. **Calendar-aware timing applied.** Per Story 8.9 (UX-DR77 — Bihar holiday windows), the close-of-cycle timing is calendar-aware. Operator does NOT override the calendar-aware timing without trustee approval.

### 2.5 Member-uploaded screenshot for self-verify (Story 9.7)

Member used Story 9.7's `<SelfVerifySurface>` to upload a screenshot during a yellow-stuck recovery attempt.

1. **Review screenshot.** Operator reviews via the reconciliation review queue (Story 9.8).

2. **Cross-reference statement.** If the screenshot shows a UTR matching a statement entry, run §2.1's match path.

3. **If screenshot is ambiguous or unmatched, engage member via helpdesk** for additional information. Do NOT make a confirmation decision based on a screenshot alone — the architectural canonical financial truth is the matcher's `contribution.confirmed` event (Story 9.5), not operator judgment on a screenshot.

## 3. Rollback procedure

Reconciliation manual interventions are largely additive (recording state, engaging member, escalating). Rollback considerations:

- **Erroneous matcher trigger.** If the operator triggered the matcher's reconciliation flow on a wrongly-identified entry, the matcher's idempotency keyed store (architecture §1.4) prevents duplicate `contribution.confirmed` events. Investigate the error; correct the underlying mismatch; re-run only if state allows.

- **Erroneous status pill flip.** The architectural commitment per Story 9.5 is "monotonic confirmation invariant" — once green, never goes back. If a green flip was wrong (e.g., wrong UTR matched), the corrective path is NOT to flip back to yellow but to record the discrepancy via Story 9.7 mismatch detection and escalate to trustee review.

- **Wrong-pool re-pay accidentally confirmed against wrong pool again.** If the member's re-pay (§2.2) was somehow recorded against the wrong pool again, that's two wrong-pool payments. Both held in facilitated-recovery state; operator engages member to coordinate a third (correct) payment; escalate to trustee for disposition guidance.

### Forbidden actions

- ❌ Refunding any wrong-pool or over-payment. Architecture-level invariant (Stories 7.6, 9.11).
- ❌ Manually flipping a green pill back to yellow. Architecture-level invariant (Story 9.5 monotonic confirmation).
- ❌ Confirming a contribution based on operator judgment without a matched bank-statement entry. Canonical financial truth is the matcher's `contribution.confirmed` event (Story 9.5).
- ❌ Overriding calendar-aware close-of-cycle timing without trustee approval (Story 8.9).
- ❌ Filing a helpdesk ticket against a member without consent flow per Epic 10 (helpdesk subsystem governance).

## 4. Verification checks

- [ ] **Yellow → green pill flip is matcher-driven.** A green flip in the system corresponds to a `contribution.confirmed` event emitted by the matcher; not from operator UI action.
- [ ] **No refund records exist for wrong-pool or over-payment cases.** Refund column is empty (or the facilitated-recovery state field is populated instead).
- [ ] **Reconciliation review queue ordering:** open cases ordered by alert-deadline proximity per Story 9.8.
- [ ] **Helpdesk engagement logged:** every operator engagement with a member is captured in the helpdesk ticket (Story 10.2 / 10.4 admin console).
- [ ] **Audit-log entry per intervention:** every operator action emits an audit-log entry (per architecture §1.5; FR-47).
- [ ] **Pool-binding invariant intact:** wrong-pool rejection events recorded; no rejected-then-applied transitions.

## 5. Contact escalation list

- **Primary (case triage):** Reconciliation operator (helpdesk subsystem — Story 10.4 admin console).
- **Matcher-internal issue (matcher producing inconsistent verdicts):** Engineering Lead (Solo Builder at v1).
- **Wrong-pool / over-payment disposition (trustee decision required):** Trustee Panel chair on rota.
- **Calendar-aware timing override request:** Trustee Panel chair on rota.
- **Mass mismatch event (matcher producing many flags simultaneously):** Engineering Lead AND Trustee Panel chair on rota (suggests a systemic issue — statement parsing change, UTR format change, bank-side cutoff).
- **Member welfare concern surfaced during engagement (e.g., bereavement-adjacent helpdesk contact):** human shepherd path per Story 6.12 (FR-41 `[v1-M]`).

---

## Changelog

| Date | git SHA | Author | Material edit? | Re-sign required? | Ledger entry |
|---|---|---|---|---|---|
| 2026-05-29 | _initial_ | Solo Builder | initial | yes (≥2 trustees) | _pending_ |
