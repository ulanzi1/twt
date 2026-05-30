# Comprehension Questionnaire — Answer Key + Scoring Rubric

**HELD BY THE TRUSTEE FACILITATOR.** The backup engineer reads the questionnaire cold WITHOUT this file. The trustee facilitator opens this file only after the engineer has submitted answers. Authority: Story 0.5 AC-3.

## Scoring rubric (per question)

For each question, the facilitator scores per:

| Score | Meaning |
|---|---|
| **`correct` (1.0)** | The answer matches the expected coverage; cites are accurate; conclusion is correct. |
| **`partial` (0.5)** | At least 50% of the expected reasoning is present, OR the conclusion is correct but a cite is missing or imprecise. |
| **`incorrect` (0.0)** | The conclusion is wrong, OR the answer cites a wrong source, OR the answer attempts a procedural walkthrough that contradicts the pack. |
| **`unanswerable-from-pack` (0.0 + gap)** | The engineer reports the answer is not reachable from the KT pack. **This is a framework-gap signal.** The pack is insufficient on this question; pack revision per Story 0.5 Task 10 is triggered. |

**80% threshold computation:** `(correct × 1.0 + partial × 0.5) / total_questions ≥ 0.80`.

**Per-section breakdown** is logged alongside total per AC-3.

---

## Section A — ADR awareness (answers)

**Q-A.1.** Name three deferred-ADR slots that are currently `slot-reserved-pre-write`, and for each, name the Story closure that unblocks the ADR authoring.

> **Expected answer:** Any three rows from `docs/knowledge-transfer/adr-index.md` (which has 64 rows). Example acceptable trio: (1) `ADR-NNNN-mirror-destination-platform` (`ADR-NNNN-code-escrow-mirror-destination` in Section E) — unblocked by **Story 0.3 Task 7 ratification**; (2) `ADR-NNNN-paging-integration-degraded-posture` (Section F) — unblocked by **Story 5.x dispatcher OR Story 1.16x CI/observability + operations-policy**; (3) `ADR-NNNN-feature-flag-tool-selection` (Section A) — unblocked by **pre-first-FR-58C-gated-cohort-rollout; DigiLocker-mandatory canary trigger**.
> **Acceptable variations:** any three distinct rows from any section + correctly-cited `expected_close_trigger` column values.
> **`incorrect` signals:** naming the same row three times; naming a row whose status is NOT `slot-reserved-pre-write` (none exist at author-commit); fabricating an ADR slot that does not appear in the index.

**Q-A.2.** What is the difference between an ADR and a runbook?

> **Expected answer:** An ADR records a *decision* (what was chosen + why + alternatives). A runbook records an *operation* (how to perform the chosen thing). They are complementary: when a runbook references a decision, it cites the ADR by ID; when a runbook step needs a decision not yet recorded, it tags `[deferred ADR — placeholder procedure]`. Reference: `docs/adr/README.md` §"Relationship to runbooks" + `docs/runbooks/README.md` §"Relationship to ADRs".
> **`partial` signals:** correct distinction but missing the `[deferred ADR — placeholder procedure]` tagging mechanism OR the cite-by-ID convention.

**Q-A.3.** Where does the `docs/adr/` directory live, and what is the file-naming convention for ADRs?

> **Expected answer:** `docs/adr/` is the directory committed by architecture.md §Workspace Layout (lines 636 + 4170). Files follow the pattern `adr-NNNN-<short-kebab-title>.md` where `NNNN` is monotonically-increasing (zero-padded to four digits) across the directory. Reference: `docs/adr/README.md` §"Naming convention".
> **`partial` signals:** path correct but naming convention imprecise (missing zero-padding OR the monotonically-increasing rule); naming convention correct but path missing the architectural authority cite.

**Q-A.4.** If you discover during implementation that a load-bearing technical decision is being made without an ADR, what do you do?

> **Expected answer:** Per `docs/adr/README.md` §"Authoring discipline" → "No silent decisions": the fix is to open an ADR + cross-link from the surface where the decision was being made (commit-time prose, runbook, framework README, code review). A decision being made without an ADR is a *process violation* — not a permitted shortcut.
> **`partial` signals:** correct corrective action but missing the "process violation" framing OR the cross-linking-back commitment.

**Q-A.5.** Why is the `docs/adr/` directory empty of substantive ADR content at Phase 0?

> **Expected answer:** Per architecture.md §Implementation Handoff (lines 5069-5096): "PR-2 ADRs are transcription of architectural decisions already documented in Steps 2–6, not net-new architectural work." Substantive ADR drafting is PR-2 / implementation-time work, performed as owning Stories close. Story 0.5 scaffolds the directory (README + template) and inventories the deferred slots in `docs/knowledge-transfer/adr-index.md`; the slot content is authored later.
> **`partial` signals:** correct narrative but missing the PR-2 cite OR the inventory-vs-substantive-content distinction.

**Q-A.6.** The ADR-index has a row for `ADR-NNNN-adr-directory-scaffold`. Why does that row have a special "closure path" note?

> **Expected answer:** The row's closure leg was discharged by Story 0.5 Task 1 (which scaffolded `docs/adr/` per Decision 2026-05-29-003 Open Follow-up #6). The closure path note records that the row will supersede to `superseded` when the first substantive ADR is authored in `docs/adr/` (the directory scaffolding precedes substantive content; the row is the index acknowledgment of that meta-decision). Reference: `docs/knowledge-transfer/adr-index.md` Section E row 6.
> **`partial` signals:** correct identification of Story 0.5 Task 1 closure but missing the Decision 003 Open Follow-up #6 cross-link OR the "first substantive ADR" supersession path.

---

## Section B — Niyamavali → FR comprehension (answers)

**Q-B.1.** Which FR governs the renewal-grace transition?

> **Expected answer:** **FR-1A** (Annual Vyawastha Shulk renewal with 3-month grace). Per `docs/knowledge-transfer/niyamavali-fr-mapping.md` §Account State Machine extract: `active → active_in_grace` triggered by `valid_through + 1 day` per FR-1A; subsequent `active_in_grace → lapsed_unpaid` on grace expiry also per FR-1A.
> **`partial` signals:** correct FR but missing the state-machine transition cite OR the SIE driver location.

**Q-B.2.** Walk through the member-lifecycle state machine from `pending-fee` to `active`.

> **Expected answer:**
> 1. `pending-fee` (entered at signup, when UPI Intent is created and payment is not yet confirmed) — FR-1
> 2. → `lock-in` (entered on first-payment confirmation) — FR-1, FR-3
> 3. → `pending-valid` (entered when lock-in elapses AND DigiLocker is unverified) — FR-2
>     OR → `active` (entered directly from `lock-in` if DigiLocker is verified at lock-in expiry)
> 4. From `pending-valid`, → `active` (entered when trustee approves manual KYC) — FR-2
> Reference: `docs/knowledge-transfer/niyamavali-fr-mapping.md` §Account State Machine extract (verbatim from architecture.md §1.14 lines 1238-1246).
> **`partial` signals:** state names correct but missing the entry triggers OR the FRs; collapsing `pending-valid` and `active` paths.

**Q-B.3.** Which Niyamavali clause(s) govern special-case death rules?

> **Expected answer:** **R5(C.2), R5(D), R5(E), R5(F), R9, R9(A), R14-adapted** per `docs/knowledge-transfer/niyamavali-fr-mapping.md` primary mapping table. Implementing FR is **FR-11** (Special death scenarios + concealment penalty). Owning Story is **Story 4.4** (`4-4-r5-r9-special-death-rules-r14-concealment-flagged-evaluation`).
> **`partial` signals:** subset of the R-classes correct (e.g., only R5/R9 named without R14-adapted) OR the FR cite missing.

**Q-B.4.** If a member is in `active_in_grace` and the grace period elapses without renewal payment, what state do they enter? Can they recover to `active`?

> **Expected answer:** They enter `lapsed_unpaid`. From `lapsed_unpaid`, they can recover to `active` via a renewal payment with **no re-lock-in** (per FR-1A). Reference: `docs/knowledge-transfer/niyamavali-fr-mapping.md` §Account State Machine extract.
> **`partial` signals:** correct state but missing the "no re-lock-in" recovery property; OR incorrectly stating that re-lock-in is required.

**Q-B.5.** Where is the canonical home for the member-state state-machine code?

> **Expected answer:** **`packages/domain/member/state.ts`** per architecture.md §1.14 (cross-referenced from `docs/knowledge-transfer/niyamavali-fr-mapping.md` §Account State Machine extract "Canonical home").
> **`partial` signals:** correct workspace but missing the file path; OR file path correct but missing the source-of-truth principle ("Member state is derived from event history; persisted state is an optimization only").

**Q-B.6.** Why does R14-adapted concealment penalty require explicit trustee action and not auto-deny?

> **Expected answer:** Per UX Stance #5 "no punitive auto-action" (cross-referenced from `docs/knowledge-transfer/niyamavali-fr-mapping.md` R14-adapted row Notes). The rule engine flags the claim for State Trustee review with the concealment recommendation; final denial requires explicit trustee action — never auto-denial. The principle is that integrity-violation handling must remain a deliberate human decision under degraded-posture-resistant invariants (cross-link to `docs/degradation-policy/README.md` §4 invariant 1).
> **`partial` signals:** correct conclusion but missing the UX Stance #5 cite OR the degradation-policy cross-link.

---

## Section C — Deployment topology comprehension (answers)

**Q-C.1.** Which GCP region is the production environment in?

> **Expected answer:** **`asia-south1` (Mumbai)** per `docs/knowledge-transfer/deployment-topology.md` §1 + §2 + architecture.md §5.1 reference.
> **`partial` signals:** correct region but missing the §5.1 cite.

**Q-C.2.** Why is the audit-mirror in a separate GCP project?

> **Expected answer:** Per architecture.md §2.10a Isolation Commitment + §5.5: the audit mirror lives in `twt-audit-mirror-prod` (a dedicated GCP project) with cross-project IAM separating mirror-write from mirror-read. The structural property is **audit independence** — sole-engineer prod credentials cannot reach the audit mirror; the integrity-check job runs in a separate project per §1.5. A compromise of the application-tier projects (`twt-prod` etc.) does NOT compromise the audit-mirror chain.
> **`partial` signals:** correct architectural property but missing the §2.10a cite; OR cite correct but missing the "sole-engineer prod credentials cannot reach" property.

**Q-C.3.** What is the deployment substrate at v1, and what triggers the K8s migration?

> **Expected answer:** **Dokploy v1** running in the isolated `twt-dokploy-prod` GCP project. Migration trigger is the **first of**: (a) 2nd Pariwar provisioning, OR (b) sustained ≥70% peak-cycle infra utilization on Dokploy. The successor substrate is Cloud Run OR GKE Autopilot (chosen at migration trigger). Per `docs/knowledge-transfer/deployment-topology.md` §4 + architecture.md §5.3.
> **`partial` signals:** substrate correct but missing the trigger OR migration-target-set.

**Q-C.4.** What is the cross-region replica trigger criterion? Does exposure value alone trigger?

> **Expected answer:** Cross-region replica activates when **any of**: (a) restore drill misses RTO target, (b) business recovery window unacceptable per trustee judgment, (c) trust governance requires it. **Exposure value alone does NOT trigger** — exposure ≠ infrastructure risk. Infrastructure-risk evidence (drill failure, operational signal, governance direction) does. Per `docs/knowledge-transfer/deployment-topology.md` §5 + architecture.md §5.7 L3203-3215.
> **`partial` signals:** trigger conditions correct but missing the "exposure ≠ infrastructure risk" principle.

**Q-C.5.** What is the per-Pariwar isolation strategy at v1? What option set is available at the 2nd-Pariwar trigger?

> **Expected answer:** v1 uses **application-layer isolation** via RLS + `pariwar_id` discipline per architecture §1.2 + §5.14 (single prod environment for TWT-Bihar). 2nd-Pariwar option set: (A) same prod environment, application-layer isolation only; (B) sibling GCP project per Pariwar (separate IAM, billing, VPC); (C) sibling cloud region per Pariwar (geographic isolation; supports per-Pariwar India regional preference + DR posture per Pariwar). The architectural property is that isolation can be tightened **without code rewrites** — the `pariwar_id` discipline already supports all three options.
> **`partial` signals:** v1 mechanism correct but option set incomplete; OR option set complete but missing the "without code rewrites" architectural property.

**Q-C.6.** Backend services default to edge-only ingress. What is the break-glass bypass procedure?

> **Expected answer:** Per `docs/knowledge-transfer/deployment-topology.md` §3 + architecture.md §5.8 L3251-3266: break-glass bypass is **time-bounded + audit-logged + rate-limited**. Activation requires **explicit operator action** (not a default behavior); every direct-ingress request is logged with elevated detail per Cross-Cutting #2; rate limits prevent the bypass from becoming the new normal. The bypass **auto-reverts at expiry** unless explicitly renewed with re-justification.
> **`partial` signals:** discipline correct but missing the auto-revert OR the explicit-operator-action requirement.

---

## Section D — On-call playbook comprehension (answers)

**Q-D.1.** Audit-mirror replication-lag alarm at 4 minutes — triage path?

> **Expected answer:** Per `docs/knowledge-transfer/on-call-playbook.md` §2.1: execute `docs/runbooks/audit-log-integrity-verification.md` — reproduce the verification job locally to confirm the failure is not transient; inspect the chain-break commit + line range; escalate to the integrity-mirror-administrative on-call surface in `twt-audit-mirror-prod` GCP project per §2.10a. Verification check: re-run the integrity-check job + chain validates end-to-end + last 6h mirror window complete + Merkle root publishable per §5.12. Escalation: failure persists > 1 hour → Trustee Panel chair on rota.
> **`partial` signals:** runbook cite correct but missing the verification check; OR escalation trigger imprecise.

**Q-D.2.** FCM unavailable — channel fallback path?

> **Expected answer:** Per `docs/knowledge-transfer/on-call-playbook.md` §2.3 + architecture.md §3.4: the channel-provider abstraction fallback routes to the next channel in the per-Pariwar hierarchy (WA → SMS per §3.4 fire-condition matrix). The degradation-policy push template at `docs/degradation-policy/comms-templates/push-channel.md` provides the user-facing copy if push is the affected channel.
> **`partial` signals:** channel ladder correct but missing the template cite OR the per-Pariwar-hierarchy property.

**Q-D.3.** Solo Builder unreachable 8h + audit-integrity-check failed 12h — escalation path?

> **Expected answer:** Per `docs/knowledge-transfer/on-call-playbook.md` §2.1 + §3 + §5: (1) Solo Builder unreachable triggers the Story 0.4 degradation policy activation per `docs/degradation-policy/README.md` §14 activation ceremony (≥2-trustee quorum + 7-day-trigger; the 7-day threshold may be compressed for confirmed unreachability). (2) Audit-integrity-check failure for 12 hours is past the 1-hour escalation trigger per §2.1 — escalate to Trustee Panel chair on rota + audit-mirror on-call (separate `twt-audit-mirror-prod` project). (3) Engage backup engineer per Story 0.6 (surge / continuity coverage); the backup engineer's access is read-only by default with write/admin requiring per-action trustee approval. (4) Consider Story 0.13 legal counsel engagement if the audit-integrity failure has DPDPA-breach implications.
> **`partial` signals:** correct framework activation but missing the read-only-by-default backup-engineer access posture; OR missing the Story 0.13 legal-counsel escalation.

**Q-D.4.** Dokploy substrate fails Days 12-15 of live cycle — runbook + ADR + framework?

> **Expected answer:** Per `docs/knowledge-transfer/on-call-playbook.md` §2.5 + architecture.md §5.3 L3007-3013: execute the **Dokploy failure fallback** via direct deployment to Cloud Run (backend services are 12-factor containerized per Step 3 R-4; secrets abstracted per Story 0.2). The fallback runbook step is in `docs/runbooks/deploy.md` Dokploy-failure section. Cross-link to `docs/escrow/credential-inventory.md` `dokploy-substrate-admin` envelope for credential recovery if needed. If failure persists > 2 hours during live cycle → activate Story 0.4 degradation posture per `docs/degradation-policy/README.md` §14 activation ceremony; cycle-open SMS bridge per §3.4 may activate.
> **`partial` signals:** fallback substrate correct but missing the runbook + envelope cross-links; OR framework activation missing.

**Q-D.5.** Difference between on-call playbook and per-task runbooks?

> **Expected answer:** Per `docs/knowledge-transfer/on-call-playbook.md` §"Structural invariant — read first": **the on-call playbook is the META-PLAYBOOK above the seven Phase-0 runbooks**. It does NOT replace per-task runbooks; it **routes** an on-call incident to the right runbook OR ADR slot OR escalation path. A substantive operational procedure that lives in the on-call playbook but should live in a per-task runbook is a **framework violation** — refactor to the per-task runbook + cross-link from the on-call playbook.
> **`partial` signals:** meta-playbook framing correct but missing the framework-violation-guard rule.

**Q-D.6.** §2.13 DPDPA breach response — why deferred to Story 14.3, and interim escalation?

> **Expected answer:** Per `docs/knowledge-transfer/on-call-playbook.md` §2.13: DPDPA breach response operational readiness lives in **Story 14.3** (`14-3-dpo-breach-reporting-operational-readiness`); the procedure is `slot-reserved-pre-write` at Story 0.5 author-commit. **Interim escalation:** any suspected breach → Solo Builder + Trustee Panel chair + Story 0.13 legal counsel (when engaged). Cross-link to `docs/escrow/credential-inventory.md` Domain 7 (`dpo-breach-reporting-portal`, `incident-response-tooling-credentials`, `dpo-contact-path` — all `pending-system-availability` at Story 0.5 closure).
> **`partial` signals:** deferral cite correct but missing the interim escalation; OR interim escalation correct but missing the credential-envelope cross-links.

---

## Section E — Dependency inventory comprehension (answers)

**Q-E.1.** Monitoring owner for DigiLocker per §3.10?

> **Expected answer:** Per `docs/knowledge-transfer/third-party-dependency-inventory.md` Section B (DigiLocker row): **primary = Solo Builder** (per architecture §3.10 default at v1); **secondary = Trustee Panel** (DigiLocker-mandatory-cutover is an FR-58C-gated migration per PRD A-4 timeline 6-12 months post-launch). Vendor contact: govt DigiLocker partner-onboarding portal.
> **`partial` signals:** primary owner correct but missing the secondary OR the rationale; OR primary owner imprecise (e.g., "the team" rather than Solo Builder).

**Q-E.2.** Apple Developer Program renewal cadence + credential location?

> **Expected answer:** Per `docs/knowledge-transfer/third-party-dependency-inventory.md` Section C (iOS distribution row): **annual** Apple Developer Program renewal (~US$99/year as of 2026); signing certificate renewal annually; APNs auth-token rotation per Apple cadence (typically 6-month max validity). Credentials are sealed via the Story 0.2 framework (`prod-credential` envelope class) — held in `docs/escrow/credential-inventory.md`.
> **`partial` signals:** annual cadence correct but missing the credential-envelope cross-link OR the APNs auth-token sub-cadence.

**Q-E.3.** Cloudflare DPDPA-incompatible policy change — response procedure?

> **Expected answer:** Per `docs/knowledge-transfer/third-party-dependency-inventory.md` Section B (Edge/WAF row) + architecture.md §5.8a pivot disposition: the pivot path is named — Cloudflare-dependent sections (§2.1, §2.11, §3.11, §5.8) identify substitution boundaries and avoid irreversible coupling. The response procedure: (1) engage legal counsel per Story 0.13 to confirm the incompatibility; (2) execute the pivot per §5.8a — the replacement provider is selected by ADR (`ADR-NNNN-cloudflare-pivot` slot category) and must satisfy the §5.8a capability bar (rate limiting + bot management + ingress signature verification + edge-only ingress + DPDPA-compatible posture + observable edge metrics); (3) the new ADR replaces the substitution boundaries; (4) cross-link to `docs/knowledge-transfer/on-call-playbook.md` §2.6 for the operational steps during the cutover.
> **`partial` signals:** pivot path correct but missing the capability-bar OR the legal-counsel engagement.

**Q-E.4.** WhatsApp Business template-approval cadence — where recorded?

> **Expected answer:** Per `docs/knowledge-transfer/third-party-dependency-inventory.md` Section B (WhatsApp Business row): **quarterly provider review + per-template approval cycle** (specific dates pending Story 5.3 closure). Architectural authority is architecture.md §3.4 (channel-provider abstraction). Monitoring owner: Solo Builder (per §3.10) + Trustee Panel for suspension risk. Vendor contact: Meta Business support portal + BSP support (pending `ADR-NNNN-whatsapp-business-provider`).
> **`partial` signals:** cadence correct but missing the source-of-truth pointer to architecture §3.4 OR the per-template-approval-cycle sub-cadence.

**Q-E.5.** 5-bank parser format change — response path?

> **Expected answer:** Per `docs/knowledge-transfer/third-party-dependency-inventory.md` Section B (per-bank rows) + architecture.md §3.6 + §3.10: monitoring owner = Solo Builder per §3.10 default + Trustee Panel for format-change escalation. The response path: (1) monitoring owner detects the format change (typically via bank announcement, parser CI test failure, OR statement-intake parsing error); (2) update the per-bank parser in `packages/bank-parsers/bihar/<bank>/` per Story 9.2 framework + 50-golden-file test suite; (3) if claim-time disruption occurs during the change window, escalate per `docs/knowledge-transfer/on-call-playbook.md` §2.11 (helpdesk SLA breach) OR §2.2 (capacity-indicator breach if backlog grows); (4) if multiple banks change simultaneously, consider Story 0.4 degradation policy activation for the reconciliation-queue surface.
> **`partial` signals:** detection mechanism correct but missing the framework activations; OR per-bank update path missing.

**Q-E.6.** Trustee-Panel-as-primary monitoring owner — which row class and why?

> **Expected answer:** Per `docs/knowledge-transfer/third-party-dependency-inventory.md` Section E (regulatory + governance — 7 rows: Indian Trust Act, 12A/12AB, GST, 80G, DPDPA, RBI/UPI, TDS §194H). The rationale: regulatory + governance rows have **trust-legal accountability** (the Trust as a legal entity, not the engineer, is the registered party); Solo Builder is secondary because the engineer's role is operational-implementation, not legal-accountability. Cross-link to Story 0.13 legal counsel for legal escalation. The "Open Question #5 (resolved)" note (per `docs/knowledge-transfer/README.md` §3, end of the property/control/policy table) cites this distinction explicitly.
> **`partial` signals:** row class correct but missing the trust-legal-accountability rationale; OR Story 0.13 cross-link missing.

---

## Score sheet template

The trustee facilitator records administration outcomes in the following template, which is transcribed into `docs/knowledge-transfer/kt-pack-ledger.md` "Comprehension administration log":

```
Administration date: YYYY-MM-DD
Facilitator (trustee): <name>
Engineer (backup engineer): <name>
Time taken: <hours:minutes>

Section A (ADR awareness):    correct=__ / partial=__ / incorrect=__ / unanswerable=__   (total=6)
Section B (Niyamavali → FR):  correct=__ / partial=__ / incorrect=__ / unanswerable=__   (total=6)
Section C (Deployment topology): correct=__ / partial=__ / incorrect=__ / unanswerable=__ (total=6)
Section D (On-call playbook):    correct=__ / partial=__ / incorrect=__ / unanswerable=__ (total=6)
Section E (Dependency inventory): correct=__ / partial=__ / incorrect=__ / unanswerable=__ (total=6)

Total: correct=__ / partial=__ / incorrect=__ / unanswerable=__   (total=30)
Score: (correct × 1.0 + partial × 0.5) / 30 = __
80% threshold met? Yes / No

Gap list (unanswerable-from-pack questions):
- Q-?.?: <rationale for why the pack is insufficient> → remediation owner: <name>, target date: <date>
- Q-?.?: <rationale> → remediation owner: <name>, target date: <date>
- ...

Re-administration scheduled? Yes / No → <date> (if any pack revisions per Story 0.5 Task 10 are required, re-administration is gated on revision completion)
```

## References

- [Source: `_bmad-output/implementation-artifacts/0-5-knowledge-transfer-documentation-pack-compiled.md`, AC-3] — questionnaire + answer-key + rubric commitment
- [Source: `docs/knowledge-transfer/comprehension-questionnaire.md`] — the questionnaire itself
- [Source: `docs/knowledge-transfer/kt-pack-ledger.md`] — administration log schema + 30-day-takeover joint-discharge anchor
- Memory: [[feedback_closure_language_precision]] — `unanswerable-from-pack` is a gap signal, distinct from `incorrect`
