# Comprehension Questionnaire — Cold-Read Administration

This questionnaire administers the AR-67 + PRD §9.1.1 comprehension test to the contracted backup engineer per Story 0.6. Authority: Story 0.5 AC-3; questions cover five sections, one per PRD §9.1.1 KT pack component (ADRs / Niyamavali → FR / deployment topology / on-call / dependency inventory).

## Administration discipline (READ BEFORE BEGINNING)

- **Cold-read.** You read the KT pack (the eight component files + the kt-pack-ledger + the ADR scaffold + cross-linked frameworks `docs/runbooks/`, `docs/escrow/`, `docs/degradation-policy/`) without consulting Solo Builder. Time budget: ≤ 4 hours recommended.
- **Bus-factor simulation discipline** (inherited from Stories 0.1 AC-4 + 0.2 AC-3 + 0.3 AC-2 + 0.4 AC-2). Solo Builder is silent for the duration of the administration including side channels. Do not message, call, or email Solo Builder. If you find yourself needing to ask Solo Builder a question, **log the question as an `unanswerable-from-pack` gap signal** — the pack artifact is insufficient. The gap is the value of the administration.
- **Timed conditions.** Trustee facilitator records the start time + end time per Story 0.5 AC-3. Re-reading the pack during answering is permitted; consulting external resources (the architecture.md, PRD, epics) is permitted IF the KT pack cross-links to that source — uncited external references are gaps.
- **Per-question rubric** is in `comprehension-questionnaire-answer-key.md` (held by the trustee facilitator; not shown to you until scoring is complete).
- **80% threshold.** Per AC-3: `(correct × 1.0 + partial × 0.5) / total_questions ≥ 0.80`. `unanswerable-from-pack` answers count 0 toward the score AND surface as framework gaps for pack revision per Task 10.
- **No question lowering.** Per `docs/knowledge-transfer/README.md` §4 invariant 5, the 80% threshold cannot be lowered without a Trustee Panel `.decision-log.md` `[CONTINUITY]` entry.

## Format

Each question carries:

- **Q-N.M.** Section letter + question number (1-indexed within section).
- **Expected coverage cite.** The KT pack component file + section where the answer is reachable.
- **Answer-format hint.** What kind of answer the question expects (cite / procedural walkthrough / escalation-path narrative).

Answer each question in the space below the question. The facilitator scores per the answer key after administration completes.

---

## Section A — ADR awareness (6 questions)

**Q-A.1.** Name three deferred-ADR slots that are currently `slot-reserved-pre-write`, and for each, name the Story closure that unblocks the ADR authoring.

> **Expected coverage cite:** `docs/knowledge-transfer/adr-index.md` Sections A-G
> **Answer-format hint:** cite three rows + the corresponding `expected_close_trigger` column values

> **Your answer:**

**Q-A.2.** What is the difference between an ADR and a runbook?

> **Expected coverage cite:** `docs/adr/README.md` §"Relationship to runbooks + framework READMEs + the `.decision-log.md`" + `docs/runbooks/README.md` §"Relationship to ADRs"
> **Answer-format hint:** 2-3 sentence narrative

> **Your answer:**

**Q-A.3.** Where does the `docs/adr/` directory live, and what is the file-naming convention for ADRs?

> **Expected coverage cite:** `docs/adr/README.md` §"Naming convention" + architecture.md §Workspace Layout L636 + L4170 (cross-referenced from `docs/adr/README.md` §References)
> **Answer-format hint:** path cite + naming-pattern description

> **Your answer:**

**Q-A.4.** If you discover during implementation that a load-bearing technical decision is being made without an ADR (e.g., the team is selecting a paging SaaS in commit-time prose without writing an ADR), what do you do?

> **Expected coverage cite:** `docs/adr/README.md` §"Authoring discipline" → "No silent decisions" rule
> **Answer-format hint:** procedural walkthrough naming the corrective action

> **Your answer:**

**Q-A.5.** Why is the `docs/adr/` directory empty of substantive ADR content at Phase 0?

> **Expected coverage cite:** `docs/adr/README.md` §"Authoring discipline" + architecture.md §Implementation Handoff (lines 5069-5096) cross-referenced from `docs/knowledge-transfer/README.md`
> **Answer-format hint:** 2-3 sentence narrative citing the PR-2 / implementation-time commitment

> **Your answer:**

**Q-A.6.** The ADR-index has a row for `ADR-NNNN-adr-directory-scaffold`. Why does that row have a special "closure path" note?

> **Expected coverage cite:** `docs/knowledge-transfer/adr-index.md` Section E + Decision 2026-05-29-003 Open Follow-up #6 in `.decision-log.md`
> **Answer-format hint:** narrative citing the Decision 003 Open Follow-up #6 closure leg discharged by Story 0.5 Task 1

> **Your answer:**

---

## Section B — Niyamavali → FR comprehension (6 questions)

**Q-B.1.** Which FR governs the renewal-grace transition (the transition from `active` to `active_in_grace` on `valid_through + 1 day`)?

> **Expected coverage cite:** `docs/knowledge-transfer/niyamavali-fr-mapping.md` §Account State Machine extract + Inverse-lookup section
> **Answer-format hint:** FR identifier cite + the state-machine row that shows it

> **Your answer:**

**Q-B.2.** Walk through the member-lifecycle state machine from `pending-fee` to `active`. Name every state, the entry trigger for each, and the FR governing each transition.

> **Expected coverage cite:** `docs/knowledge-transfer/niyamavali-fr-mapping.md` §Account State Machine extract (verbatim transcription of architecture.md §1.14 lines 1238-1246)
> **Answer-format hint:** ordered state walkthrough with FRs cited per transition

> **Your answer:**

**Q-B.3.** Which Niyamavali clause(s) govern special-case death rules (illness vs accident vs suicide), and which FRs implement them?

> **Expected coverage cite:** `docs/knowledge-transfer/niyamavali-fr-mapping.md` primary mapping rows R5(C.2), R5(D), R5(E), R5(F), R9, R9(A), R14-adapted + FR-11
> **Answer-format hint:** R-class cites + implementing-FR cites + owning Story key

> **Your answer:**

**Q-B.4.** If a member is in `active_in_grace` and the grace period elapses without a renewal payment, what state do they enter? Can they recover to `active`?

> **Expected coverage cite:** `docs/knowledge-transfer/niyamavali-fr-mapping.md` §Account State Machine extract + architecture.md §1.14 cross-linked
> **Answer-format hint:** state-name cite + recovery-transition cite

> **Your answer:**

**Q-B.5.** Where is the canonical home for the member-state state-machine code (the file path)?

> **Expected coverage cite:** `docs/knowledge-transfer/niyamavali-fr-mapping.md` §Account State Machine extract + architecture.md §1.14 ("Canonical home: `packages/domain/member/state.ts`")
> **Answer-format hint:** file path

> **Your answer:**

**Q-B.6.** The R14-adapted concealment penalty (concealment denial) does NOT auto-deny a claim — it requires explicit trustee action. Why? Cite the architectural / UX principle.

> **Expected coverage cite:** `docs/knowledge-transfer/niyamavali-fr-mapping.md` primary mapping R14-adapted row Notes + cross-link to UX Stance #5 "no punitive auto-action" via `docs/degradation-policy/README.md` §4 invariant 1
> **Answer-format hint:** principle cite + 1-2 sentence rationale

> **Your answer:**

---

## Section C — Deployment topology comprehension (6 questions)

**Q-C.1.** Which GCP region is the production environment in?

> **Expected coverage cite:** `docs/knowledge-transfer/deployment-topology.md` §1 + §2 (architecture.md §5.1 reference)
> **Answer-format hint:** region cite

> **Your answer:**

**Q-C.2.** Why is the audit-mirror in a separate GCP project (`twt-audit-mirror-prod`) and not colocated with `twt-prod`?

> **Expected coverage cite:** `docs/knowledge-transfer/deployment-topology.md` §1 + cross-link to architecture.md §2.10a Isolation Commitment
> **Answer-format hint:** 2-3 sentence rationale citing §2.10a

> **Your answer:**

**Q-C.3.** What is the deployment substrate at v1, and what triggers the K8s migration?

> **Expected coverage cite:** `docs/knowledge-transfer/deployment-topology.md` §4 (architecture.md §5.3 reference)
> **Answer-format hint:** substrate name + migration trigger conditions

> **Your answer:**

**Q-C.4.** What is the cross-region replica trigger criterion per architecture §5.7? Does exposure value alone trigger?

> **Expected coverage cite:** `docs/knowledge-transfer/deployment-topology.md` §5 + cross-link to architecture.md §5.7 L3203-3215
> **Answer-format hint:** enumerated trigger conditions + the "exposure ≠ infrastructure risk" property

> **Your answer:**

**Q-C.5.** What is the per-Pariwar isolation strategy at v1? What option set is available at the 2nd-Pariwar trigger?

> **Expected coverage cite:** `docs/knowledge-transfer/deployment-topology.md` §6 (architecture.md §5.14 reference)
> **Answer-format hint:** v1 isolation mechanism + 3-option set for 2nd-Pariwar

> **Your answer:**

**Q-C.6.** Backend services default to edge-only ingress. What is the break-glass bypass procedure, and what are its discipline constraints?

> **Expected coverage cite:** `docs/knowledge-transfer/deployment-topology.md` §3 + cross-link to architecture.md §5.8 L3251-3266
> **Answer-format hint:** procedural narrative covering time-bounded + audit-logged + rate-limited + explicit operator action + auto-revert

> **Your answer:**

---

## Section D — On-call playbook comprehension (6 questions)

**Q-D.1.** If the audit-mirror replication-lag alarm fires at 4 minutes, what is the triage path?

> **Expected coverage cite:** `docs/knowledge-transfer/on-call-playbook.md` §2.1 (audit-integrity failure)
> **Answer-format hint:** procedural walkthrough — runbook to execute, verification check, escalation trigger

> **Your answer:**

**Q-D.2.** If FCM is unavailable for push delivery, what is the channel fallback path?

> **Expected coverage cite:** `docs/knowledge-transfer/on-call-playbook.md` §2.3 (push-provider outage) + cross-link to architecture.md §3.4 + `docs/degradation-policy/comms-templates/push-channel.md`
> **Answer-format hint:** channel-fallback ladder + the template that provides user-facing copy

> **Your answer:**

**Q-D.3.** Solo Builder is unreachable for 8 hours. The audit-integrity-check job has failed for 12 hours. What is the escalation path?

> **Expected coverage cite:** `docs/knowledge-transfer/on-call-playbook.md` §2.1 + §3 Rollback + §5 Contact escalation + cross-link to `docs/degradation-policy/README.md` §14 activation ceremony
> **Answer-format hint:** procedural walkthrough naming Story 0.4 activation + Trustee Panel + audit-mirror on-call

> **Your answer:**

**Q-D.4.** If Dokploy substrate fails during Days 12-15 of a live cycle, what runbook + ADR + framework do you consult?

> **Expected coverage cite:** `docs/knowledge-transfer/on-call-playbook.md` §2.5 (Dokploy substrate failure) + cross-link to architecture.md §5.3 L3007-3013 + `docs/runbooks/deploy.md` + Story 0.4 framework
> **Answer-format hint:** named runbook + ADR slot + framework path

> **Your answer:**

**Q-D.5.** What is the difference between the on-call playbook and the per-task runbooks in `docs/runbooks/`?

> **Expected coverage cite:** `docs/knowledge-transfer/on-call-playbook.md` §"Structural invariant — read first"
> **Answer-format hint:** 2-3 sentence narrative naming the meta-playbook vs per-task-runbook distinction + the framework-violation guard

> **Your answer:**

**Q-D.6.** The on-call playbook §2 lists 13 incident classes. One of them (§2.13) is `[deferred to Story 14.3]`. Why is DPDPA breach response deferred, and what is the interim escalation if a suspected breach occurs before Story 14.3 closes?

> **Expected coverage cite:** `docs/knowledge-transfer/on-call-playbook.md` §2.13 + cross-link to `docs/escrow/credential-inventory.md` Domain 7 + Story 0.13 legal counsel cross-link
> **Answer-format hint:** rationale + interim path naming Solo Builder + Trustee Panel chair + Story 0.13 legal counsel

> **Your answer:**

---

## Section E — Dependency inventory comprehension (6 questions)

**Q-E.1.** Who is the monitoring owner for DigiLocker per architecture §3.10?

> **Expected coverage cite:** `docs/knowledge-transfer/third-party-dependency-inventory.md` Section B (DigiLocker row) + architecture.md §3.10
> **Answer-format hint:** monitoring-owner cite + secondary escalation cite

> **Your answer:**

**Q-E.2.** What is the renewal cadence for the Apple Developer Program? Where is the credential held?

> **Expected coverage cite:** `docs/knowledge-transfer/third-party-dependency-inventory.md` Section C (iOS distribution row) + cross-link to `docs/escrow/credential-inventory.md` (Apple Developer Program credentials sealed via Story 0.2 framework)
> **Answer-format hint:** cadence cite + credential-envelope cite

> **Your answer:**

**Q-E.3.** If Cloudflare announces a DPDPA-incompatible policy change, what is the response procedure?

> **Expected coverage cite:** `docs/knowledge-transfer/third-party-dependency-inventory.md` Section B (Edge/WAF row) + cross-link to architecture.md §5.8a pivot disposition + `docs/knowledge-transfer/on-call-playbook.md` §2.6 + `docs/knowledge-transfer/adr-index.md` ADR-NNNN-cloudflare-pivot (substitution boundaries)
> **Answer-format hint:** procedural walkthrough naming the pivot path + the framework consultations

> **Your answer:**

**Q-E.4.** Where is the WhatsApp Business template-approval cadence recorded?

> **Expected coverage cite:** `docs/knowledge-transfer/third-party-dependency-inventory.md` Section B (WhatsApp Business row) + cross-link to architecture.md §3.4 (channel-provider abstraction)
> **Answer-format hint:** path cite + cadence-naming convention

> **Your answer:**

**Q-E.5.** If a 5-bank parser format changes (e.g., SBI revises its statement export format), what is the response path?

> **Expected coverage cite:** `docs/knowledge-transfer/third-party-dependency-inventory.md` Section B (Bank statement intake — SBI row) + cross-link to architecture.md §3.6 + §3.10 + `docs/knowledge-transfer/on-call-playbook.md` §2.11 (helpdesk escalation if claim-time disruption)
> **Answer-format hint:** monitoring-owner detection + per-bank-Story (9.2) update path + escalation if disruption is widespread

> **Your answer:**

**Q-E.6.** The dependency inventory has rows where the monitoring owner is **Trustee Panel** (not Solo Builder). Which row class is this, and why?

> **Expected coverage cite:** `docs/knowledge-transfer/third-party-dependency-inventory.md` Section E (regulatory + governance) + Open Question #5 resolution cited in `docs/knowledge-transfer/README.md` §3 property/control/policy table
> **Answer-format hint:** row-class cite + rationale (regulatory accountability + trust governance)

> **Your answer:**

---

## End of administration

**Total questions:** 30 (6 per section × 5 sections).

**80% threshold:** `(correct × 1.0 + partial × 0.5) / 30 ≥ 0.80` → equivalent to at least 24 questions correct OR 24 partial-credit-points-equivalent.

**Gap discharge:** any `unanswerable-from-pack` gap → trigger pack revision per Story 0.5 Task 10 before re-administration.

The facilitator records the administration outcome + per-section score breakdown + gap list in `docs/knowledge-transfer/kt-pack-ledger.md` "Comprehension administration log".

---

## References

- [Source: `_bmad-output/implementation-artifacts/0-5-knowledge-transfer-documentation-pack-compiled.md`, AC-3] — questionnaire schema commitment
- [Source: PRD §9.1.1 paragraph 5] — KT pack content commitment (5 components → 5 sections)
- [Source: `docs/knowledge-transfer/comprehension-questionnaire-answer-key.md`] — deterministic answer key + per-question rubric (held by trustee facilitator)
- [Source: `docs/knowledge-transfer/kt-pack-ledger.md` "Comprehension administration log"] — administration outcome recording surface
- Memory: [[feedback_closure_language_precision]] — 80% threshold + gap-discharge precision
