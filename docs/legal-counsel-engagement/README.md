# Legal-Counsel-Engagement Framework

**Authority cites:** UX §Phase-0 P0-4 (UX spec line 109); epics line 564 cross-cutting Phase-0 prereq gates; epics line 687 Epic 0 Deliverable P0-4; architecture §External Validation Pending (architecture lines 4842-4860); architecture §Launch Gate Risks subsidiary legal-counsel-naming rows (architecture lines 4785-4788); PRD §4.14.1 regulatory surface inventory (PRD line 1169); PRD §10.1 trust-posture legal caveat (UX spec line 75); Decision 2026-06-02-013.

**Status:** Author-committed; awaiting Trustee Panel scope ratification + counsel shortlist + counsel selection + engagement-letter signature + first-artifact submission + counsel returns + Epic 2/3/6 integration.

## §1 Why a top-level surface

This framework is a new top-level surface under `docs/`, parallel to `docs/runbooks/`, `docs/escrow/`, `docs/degradation-policy/`, `docs/knowledge-transfer/`, `docs/adr/`, `docs/backup-engineer/`, `docs/fallback-handler-ledger/`, and `docs/spec-to-cadence-reconciliation/`. It is broader than any single existing directory's scope — engagement-letter-template + review-scope-charter + review-artifact-roster + counsel-roster + engagement-ledger + per-artifact-return-roster. The unified directory discharges the UX §Phase-0 P0-4 + epics line 564 + 687 + architecture §External Validation Pending Legal counsel commitment as a single trustee-accessible surface.

The rationale mirrors Stories 0.2 / 0.3 / 0.4 / 0.5 / 0.6 / 0.7 / 0.12 README §1 — the legal-counsel-concurrent-review portfolio requires its own unified surface, distinct from but parallel to the other framework portfolios.

## §2 Framework lifecycle

Author-commit → Trustee Panel scope ratification (per `review-scope-charter.md` §1 + §3) → counsel shortlist + selection (per `counsel-roster.md` shortlist criteria + Trustee Panel + Solo Builder process) → engagement letter + NDA + COI disclosure signed (per `engagement-letter-template.md` + counsel return on substantive language) → first artifact submitted within 2 weeks of signing (per `review-artifact-roster.md` priority-1 row = Epic 2 T&C draft) → counsel returns within per-artifact SLA (per `engagement-letter-template.md` §4 + `per-artifact-return-roster.md` substantive content) → Epic 2/3/6 integration (per the affected implementing-Story dependency graph) → ongoing concurrent review + quarterly engagement health + annual term renewal (per `engagement-ledger.md` §9 Periodic re-attestation log).

## §3 Four-way property/control/policy/gap-analysis discipline

Mirroring Story 0.4 + 0.5 + 0.6 + 0.7 + 0.12 pattern, per [[feedback_architecture_vs_adr_boundary]] + [[feedback_architecture_vs_prd_boundary]] + [[feedback_gap_analysis_observational]] + [[feedback_closure_language_precision]]:

| Layer | What it commits | Where it lives |
|---|---|---|
| **Property** (architecture-equivalent) | Concurrent-review nature; review-scope-charter is append-only; counsel-roster is append-only; engagement-letter is a framework skeleton (substantive legal language is counsel return); per-artifact-return-roster preserves return content with supersession-only lifecycle exit; first-artifact-submission within 2 weeks of signing is a structural property; SLA-breach-tracking-log triggers Trustee Panel review at ≥3 breaches in a quarter; counsel identity is need-to-know per NDA; no member-PII inlined; no counsel-privileged advice inlined; concurrent-review-mode availability is load-bearing | README §4 Structural invariants; `engagement-letter-template.md` §2 + §9; `review-scope-charter.md` §1 + §8 |
| **Policy** (PRD-equivalent) | Concurrent-review-engagement discipline; counsel-selection ratification (Trustee Panel authority + ≥2-trustee + shortlist + interview); re-attestation cadence (quarterly + annual + per-major-architecture-amendment); per-artifact submission priority + SLA; counsel-return integration via supersession events | README §6; `engagement-letter-template.md` §4 + §8 + §11; `engagement-ledger.md` §9 |
| **Control** (ADR territory) | Counsel-side practice-management tool; counsel-side encrypted-document-exchange protocol; counsel-side privileged-advice archive; counsel-side conflict-check mechanism; billing-rate-card vs retainer-fixed; per-artifact priority-classification + surge-pricing; counsel-side handover; multi-counsel coordination; archival policy | README §7 Open ADR slots; `adr-index.md` Section K |
| **Gap analysis** (observational) | Trustee Panel scope ratification surfaces scope-completeness gaps; counsel selection surfaces practice-area-coverage gaps; counsel returns surface substantive-changes-required + open-questions gaps; Epic 2/3/6 integration surfaces upstream-Story-dependency gaps; SLA-breach-tracking surfaces engagement-health gaps | `review-scope-charter.md` §3; `per-artifact-return-roster.md` `return_open_questions` field; `engagement-ledger.md` §8 + §11 |

The gap-analysis layer does NOT prescribe sprint planning or override architecture — it observes incompleteness/risk and proposes conditional escalation paths per [[feedback_gap_analysis_observational]].

## §4 Structural invariants

The following invariants are load-bearing properties of this framework. Violation of any invariant is a framework-discipline breach and triggers an Open Question.

1. **Concurrent-review nature is load-bearing.** Counsel reviews artifacts during drafting and pre-launch per UX spec line 75 "their findings shape the spec, not just check it" — NOT post-hoc audit. This is committed in `engagement-letter-template.md` §2 + §9 and applied across all per-artifact submissions.
2. **Review-scope-charter is append-only.** Forbidden-removal rule. Scope items added at Task 7 ratification or later; scope items are never deleted; supersession is the only allowed lifecycle exit per the Story 0.3 + 0.4 + 0.5 + 0.6 + 0.7 + 0.12 precedent.
3. **Counsel-roster is append-only.** Forbidden-removal rule; termination flips status to `terminated`, not row deletion; supersession-marker entry is logged in the engagement-ledger.
4. **Engagement-letter is a framework skeleton.** Substantive legal language (jurisdiction clauses, indemnification, force majeure, governing law, professional-indemnity coverage specifics, work-product ownership detailed boundaries) is counsel return per [[feedback_architecture_vs_adr_boundary]]. The framework commits the property; legal counsel commits the specific control language.
5. **Per-artifact-return-roster preserves return content with supersession-only lifecycle exit.** Return content is never deleted; corrections appear as new supersession rows; the original return is preserved as the audit baseline.
6. **First-artifact-submission within 2 weeks of signing is a structural property.** AC-1 commits this as a deadline; the post-signature window is the operational-readiness clock; the first artifact is Epic 2 T&C draft per `review-artifact-roster.md` priority-1 row.
7. **SLA-breach-tracking-log triggers Trustee Panel review at ≥3 breaches in a quarter.** Per `engagement-letter-template.md` §11 + `engagement-ledger.md` §8 SLA-breach-tracking-log. Recurring breach is a counsel-engagement-health signal, not a routine event.
8. **Counsel identity is need-to-know per NDA.** Counsel-roster `name` + `firm_affiliation` + `contact` fields are treated as need-to-know per counsel's NDA + the trust's operations-policy redaction discipline. If a public mirror context applies, the field is redacted per the ADR-NNNN-engineer-identity-redaction-public-mirror policy + the Story 0.6 / Story 0.13 cross-coupling.
9. **No member-PII inlined in any framework artifact.** The framework concerns legal-counsel concurrent-review + scope ratification + per-artifact return tracking; no member identity is referenced. Regulatory necessity + general PII-shielding per architecture §1.5.
10. **No counsel-privileged advice inlined.** Counsel's substantive opinions land in `per-artifact-return-roster.md` as summaries (`return_summary` + `return_substantive_changes_required` + `return_open_questions`); specific privileged opinions are counsel-only-archive per operations-policy. Privilege-protected content must NOT be committed to the trustee-accessible repo per the engagement-letter §10 work-product-ownership boundary.
11. **Engagement letter forbids exclusivity clauses that prevent the trust from engaging additional counsel in scope-distinct practice areas.** Trustee Panel may engage multiple counsel (e.g., one for DPDPA + one for trust law + financial-services). The framework does not assume one.
12. **Concurrent-review-mode availability is the load-bearing engagement-term property.** Counsel may not decline availability across the term without breach. Counsel may decline a specific artifact if outside competence with written rationale, but cannot decline availability across the term.
13. **Self-referencing engagement-letter substantive-language dependency is intentional.** The same counsel selected at Task 8 reviews and edits the engagement letter for their own engagement, then signs. This is a known regulatory pattern for self-engaging counsel; documented as Decision 2026-06-02-013 body item 7.

## §5 Sign-off lifecycle

**Framework-ratification gate:** ≥2-trustee + counsel ratification at Task 9 engagement-letter signature event. The Trustee Panel scope ratification at Task 7 ratifies the substantive scope; the counsel selection at Task 8 ratifies the named counsel; the engagement-letter signature at Task 9 binds the engagement.

**Ratification modes (per Trustee Panel choice):**
- **Pack-as-a-unit** (default) — Trustee Panel ratifies the entire review-scope-charter + counsel-roster shortlist criteria in one session
- **Per-scope-item** — Trustee Panel ratifies each of the five AC-named scope items + the cross-Story deferred-scope inventory items + the regulatory surface items + the ADR slot items individually; requires both trustees to agree on the per-scope-item mode

**Quorum-unavailable fallback path:** emergency single-trustee scope-ratification valid under documented trustee incapacitation, time-bounded 30 days per Story 0.9 D-02 + Story 0.7 README §5 precedent; recorded as `.decision-log.md` `[LEGAL]` entry per the supersession schema; second-trustee re-review required at day 30; if second-trustee reverses, all scope-ratification-dependent edits made under the now-reversed decision must be rolled back via Solo Builder + ≥2-trustee rollback ratification + supersession entry.

**Counsel-unavailable fallback path:** if the named counsel becomes unavailable mid-term, substitute counsel from the shortlist is engaged under a new engagement-letter signature event; the original engagement-letter is preserved as the historical record; the substitution is logged in `engagement-ledger.md` §4 Counsel-selection log + `.decision-log.md` `[LEGAL]` supersession entry.

**Exhausted-shortlist fallback path:** if at Task 8 no shortlisted candidate meets mandatory criteria after the full outreach process (per `counsel-roster.md` outreach paths), the Trustee Panel + Solo Builder restart the shortlist process (Task 8 restart) within 30 days; the review-scope-charter §1 primary scope is preserved; P0-4 reverts to `awaiting-counsel-shortlist` status; if the shortlist gap persists beyond 90 days, P0-4 is escalated to the Trustee Panel as an explicit `.decision-log.md` `[LEGAL]` entry documenting the decision on proceeding without full mandatory-criteria counsel coverage vs. extending the shortlist timeline.

## §6 Re-attestation cadence fallback

- **Per-artifact 5-10 biz days SLA** (default) — `engagement-letter-template.md` §4 default response window; expedited 2-3 biz days if surge-priced per the per-artifact-rate-card per `adr-index.md` Section K deferred ADR
- **Quarterly engagement-health review** — `engagement-ledger.md` §9 Periodic re-attestation log; review covers SLA-breach-tracking + practice-area-coverage gaps + ongoing-disclosure COI events + Trustee Panel satisfaction
- **Annual term renewal** — `engagement-letter-template.md` §8 auto-renewal mechanism; auto-renews unless either party terminates with 60-day notice
- **Per-major-architecture-amendment scope refresh** — major = ≥1 new scope item OR ≥1 new regulatory regime per PRD §4.14.1 OR ≥10% architecture line-count delta in legal-counsel-touching sections (any one condition is sufficient); Solo Builder + ≥1-trustee co-sign required if 'major' is contested; mirrors Story 0.12 README §6 precedent
- **On-counsel-event post-mortem** — significant counsel-event (e.g., COI emergence, SLA-breach escalation, counsel-side practice-area gap surfacing) triggers post-mortem entry in `engagement-ledger.md` §10 Pack-revision log
- **Pre-launch checkpoint coverage** — per `review-scope-charter.md` §6, counsel commits availability at each named pre-launch checkpoint (Phase-0 closure, T&C version-pin lock per Story 2.6, first-claim SM-1 pre-launch, public-launch gate); attendance + outcome logged in `engagement-ledger.md` §9

## §7 Open ADR slots

Per [[feedback_architecture_vs_adr_boundary]], the framework commits the property; specific control mechanisms are ADR territory. The following slots are deferred-with-ADR:

1. **Counsel-side practice-management tool selection** — counsel-firm matter-management system (e.g., Clio, MyCase, PracticePanther, Indian-jurisdiction-specific tool); selection at first-engagement or first-renewal cycle
2. **Counsel-side encrypted-document-exchange protocol** — encrypted email + counsel-side portal + DocSign + courier-delivery + in-person; selection at engagement-letter §7 NDA counsel-return event
3. **Counsel-side privileged-advice archive integration** — counsel-only-archive mechanism for privilege-protected opinions; trust-side archive for non-privileged summaries; the boundary policy
4. **Counsel-side conflict-check mechanism for ongoing-disclosure** — engagement-letter §6 commits ongoing-disclosure requirement; the specific check mechanism (annual COI questionnaire + counsel-side conflict-check tooling + trustee-side review) is ADR
5. **Counsel-side billing-rate-card vs retainer-fixed model** — engagement-letter §5 commits pricing-shape options; specific amount + per-artifact rate-card + retainer-fixed-amount + surge-pricing-multiplier is ADR + cross-reference to Story 0.12 reconciliation contract-help-path
6. **Per-artifact priority-classification + surge-pricing rate-card** — `review-artifact-roster.md` priority ordering + surge-priced 2-3 biz days SLA per surge-pricing multiplier; ADR commits the multiplier + classification taxonomy
7. **Counsel-side handover protocol for term-end or termination** — `engagement-letter-template.md` §13 commits termination triggers; the specific handover protocol (active-artifact transfer + privilege-protected content transfer + NDA-survival mechanism) is ADR
8. **Multi-counsel coordination protocol if >1 counsel engaged** — README §4 invariant 11 + counsel-roster header permit multiple counsel; the specific coordination mechanism (per-scope-area lead + cross-counsel referral protocol + Trustee Panel as ultimate-coordinator) is ADR
9. **Archival policy for completed-review-cycles** — `per-artifact-return-roster.md` rows for completed reviews remain in the roster (append-only) but the substantive return content may be archived to an annex after N years; the archival cadence + storage location is ADR

## §8 Related continuity + governance surfaces table

| Framework portfolio | Owning Story | Discharges | Location |
|---|---|---|---|
| Operational runbooks | Story 0.1 | Operational-readiness ledger + 7 Phase-0 runbooks | `docs/runbooks/` |
| Credential escrow | Story 0.2 | Production credentials sealed; trustee quorum recovery | `docs/escrow/` |
| Code escrow | Story 0.3 | Repo auto-mirror to trustee-controlled location | (Story 0.3 framework path) |
| Degradation policy | Story 0.4 | Per-surface stance + 5-channel comms templates + table-top runbook | `docs/degradation-policy/` |
| Knowledge transfer pack | Story 0.5 | ADRs + Niyamavali→FR mapping + deployment topology + on-call playbook + third-party-dependency inventory | `docs/knowledge-transfer/` |
| Backup engineer | Story 0.6 | A-13 retainer + scope-of-work + access-grant + onboarding + activation procedure | `docs/backup-engineer/` |
| Fallback-handler ledger | Story 0.7 | Per-loop-node fallback-handler ledger + SLA + rota + Operations Lead | `docs/fallback-handler-ledger/` |
| Spec-to-cadence reconciliation | Story 0.12 | Engineer-month estimate vs SM-1 6-9 month reconciliation + cut-scope/move-SM-1/contract-help framework | `docs/spec-to-cadence-reconciliation/` |
| **Legal-counsel-engagement** | **Story 0.13** | **Concurrent-review engagement covering 5 AC-named scope items + ~32-row cross-Story deferred-scope inventory + regulatory surface + ADR slot review** | **`docs/legal-counsel-engagement/` (this directory)** |
| Native-stack ratify | Story 0.14 | ~2-week prototype + P1-P6 pass criteria + ratify decision | `docs/native-stack-validation/` (framework author-committed 2026-06-02 per Decision 2026-06-02-014; Tasks 7-11 awaiting external action) |
| Architectural launch-gate inventory | Story 0.15 | All architecture §Launch Gate Risks entries scheduled with named owner + closure criteria + target date | `docs/launch-gate-inventory/` (framework author-committed 2026-06-03 per Decision 2026-06-03-015; Rows 3, 8, 9, 10 of `inventory-roster.md` = Edge/WAF DPDPA-compatibility decision + DPDPA grievance officer designation + FR-43A external forum destination + Regulatory surface sign-off at `current_status = open` pending Story 0.13 Legal Counsel first-artifact + subsequent-artifact returns + per-return Trustee Panel ratification per Decision 2026-06-02-013 + Story 0.13 Task 11 closure; Story 0.15 monthly-review-cadence-protocol §3 Quorum requires Legal Counsel attendance for Rows 3, 8, 9, 10 when on-agenda; Tasks 8-11 awaiting external action) |

## §9 Disjoint anchor — Story 0.13 is the FIFTH Phase-0 portfolio

Story 0.13 is **distinct from four preceding Phase-0 portfolios** and constitutes a fifth:

- **Bus-factor-of-one mitigation portfolio (Stories 0.1-0.6)** discharges "the trust survives Solo Builder unavailability >7 days"
- **Loop-node operational-responsiveness portfolio (Story 0.7)** discharges "every Phase-1 loop node has a named, funded, on-rota fallback handler reachable within SLA when automation fails"
- **Empathy field-work portfolio (Stories 0.8-0.11)** discharges "downstream design decisions in Epics 3, 6, 8, 10 are grounded in lived experience, not assumption"
- **Spec-to-cadence-funding-reconciliation portfolio (Story 0.12)** discharges "the engineer-month estimate vs SM-1 6-9 month target mismatch is resolved on-the-record via cut-scope / move-SM-1 / contract-help before Epic 1 substrate work commits"
- **Legal-counsel-concurrent-review portfolio (Story 0.13)** discharges "trust-posture copy + DPDPA consent flow + denial-appeal flow procedural fairness + Account State Machine transition table + dual-path claim authority-to-file evidentiary specification gain counsel review BEFORE Epic 1 substrate work commits — concurrent review, not post-hoc audit"

The five portfolios have **disjoint closure semantics**:

- Bus-factor portfolio fully discharged but Story 0.13 undischarged → trust ships Phase-1 with legal-exposure surface unreviewed; FR-94 trust posture clauses + FR-43A denial-appeal procedural fairness + DPDPA consent flow + Account State Machine + dual-path claim authority-to-file ship without counsel substantive review; first court challenge or first DPDPA Data Fiduciary inspection surfaces gaps
- Story 0.13 fully discharged but loop-node portfolio undischarged → trust ships Phase-1 with no fallback handlers reachable when automation fails
- Story 0.13 fully discharged but Story 0.12 undischarged → trust ships Phase-1 on aspirational 6-9 month timeline despite the 3-4× mismatch; silent runway-driven shipping
- Story 0.13 fully discharged but empathy portfolio undischarged → trust ships Phase-1 with PRD/UX assumptions unvalidated against lived experience
- **All five portfolios required for Phase-1 launch readiness.** Story 0.13 closure unblocks the Epic 1 substrate work P0-4 leg + downstream Epic 2 + Epic 3 + Epic 6 demoable closures by providing the concurrent-review engagement within which the regulatory + compliance + legal-posture artifacts gain substantive review.

The 30-day-takeover joint-discharge anchor (per Story 0.3 Decision 003 + Story 0.4 Decision 004 + Story 0.5 Decision 005 + Story 0.6 Decision 006 + Story 0.7 disjoint-anchor + Story 0.12 disjoint-anchor) is the bus-factor-portfolio joint-discharge; Story 0.13 does NOT contribute to it. The UX §Phase-0 P0-4 + epics line 564 + 687 discharge is the legal-counsel-portfolio closure; Stories 0.1-0.12 do NOT contribute to it.

## §10 Domain glossary

- **P0-4** — Phase-0 prereq gate #4 per epics line 564 + 687 + UX spec line 109. Discharged by Story 0.13.
- **UX §Phase-0 P0-4** — UX spec line 109 launch-blocker statement: "Legal counsel onboarded with concurrent-review scope before §1 Trust Loops drafting begins"
- **Architecture's AR-49 P0-4** — architecture line 4783 names "P0-4 Empty/Skeleton/Error Inventory" (a UX deliverable; P0-N numbering divergence with UX/epics — see Story 0.13 Open Question #2). Story 0.13 discharges UX/epics's P0-4, NOT architecture's AR-49 line 4783 row. Architecture-side legal-counsel-coverage is in subsidiary rows at architecture lines 4785-4788 (DPDPA grievance officer designation + FR-43A external forum destination + Regulatory surface sign-off + Trust formation + legal registration).
- **Epics line 564 Phase-0 prereq gate** — "Phase-0 prereq gates (P0-1, P0-3, P0-4, P0-5) — gate *all* engineering, not just the epics that explicitly list them."
- **DPDPA** — Digital Personal Data Protection Act, 2023 — India's data protection statute. Compliance scope per PRD §4.14.1 + architecture §2.12.
- **CPA 2019** — Consumer Protection Act, 2019 — Indian statute governing consumer-service relationships. PRD §4.14.1 commits "trust's 'service' is in scope; internal appeal flow (FR-43A) is the mitigation."
- **FR-43A** — Internal claim-denial appeal flow per PRD lines 712-727; three-stage taxonomy (Stage 1 District Admin review + Stage 2 State Trustee panel vote + Stage 3 Trustee discretion). Counsel reviews procedural fairness.
- **FR-94** — Trust posture in T&C lawyer-reviewed clauses per PRD lines 1190-1204. Counsel review sign-off recorded in `.decision-log.md` pre-launch.
- **Account State Machine** — first-class UX surface + architectural primitive per UX §0 Stance #2 + UX Design Challenge #2 + Cross-Cutting #12. Five states `active → claim-filed-frozen → disbursed-frozen-readable → disabled-T+90 → public-record-∞`. Counsel reviews transition-table for notice/service formalities.
- **ICP (Intake Convergence Point)** — UX topology primitive per UX §164; dual-path death-claim intake converges on a single case object. Counsel reviews dual-path authority-to-file evidentiary basis.
- **Dual-path claim** — relative-as-deceased (app, via deceased's phone+OTP) + helpline-mediated (phone). Counsel reviews authority-to-file evidentiary specification.
- **Concurrent review** — counsel reviews artifacts during drafting and pre-launch (NOT post-hoc audit). Load-bearing engagement-term property per UX spec line 75 + `engagement-letter-template.md` §2 + §9.
- **Per-artifact SLA** — 5-10 biz days per `engagement-letter-template.md` §4; expedited 2-3 biz days if surge-priced.
- **COI disclosure** — Conflict-of-Interest disclosure per `engagement-letter-template.md` §6; counsel discloses relevant practice-area engagements that could conflict; acknowledgment of no TSCT/operating-mutual-aid conflict; ongoing-disclosure requirement during term.
- **NDA** — Non-Disclosure Agreement; binding through and beyond engagement termination per counsel's standard NDA; substantive NDA language is counsel return at engagement-letter §7.
- **Engagement letter** — `engagement-letter-template.md` framework skeleton + substantive counsel-return language. Bound at Task 9 signature event.
- **Review-scope-charter** — `review-scope-charter.md`; the substantive scope commitment for the concurrent-review engagement; Trustee-Panel-ratified at Task 7; counsel-accepted at Task 9.
- **Review-artifact-roster** — `review-artifact-roster.md`; one row per artifact submitted to counsel for review; priority-ordered; populated through the engagement lifecycle.
- **Counsel-roster** — `counsel-roster.md`; the named-counsel inventory + shortlist criteria; supports multiple counsel.
- **Engagement-ledger** — `engagement-ledger.md`; the lifecycle log + 11 §-log sections tracking scope-ratification + counsel-selection + engagement-signature + first-artifact-submission + return-receipt + SLA-breach-tracking + periodic re-attestation + pack-revision + cross-links.
- **Per-artifact-return-roster** — `per-artifact-return-roster.md`; per-artifact return-content tracking + integration lifecycle.
- **Substitute counsel** — counsel from the shortlist engaged if the named counsel becomes unavailable mid-term per §5 fallback path.
- **TSCT** — the precedent + benchmark operating mutual-aid trust referenced in the engagement framework. Prior counsel engagement with TSCT constitutes a privileged-information conflict per the `counsel-roster.md` mandatory criteria. The TSCT board's network is one outreach path for counsel shortlisting at Task 8, subject to the no-TSCT-conflict COI clearance.
- **Quarterly engagement-health review** — `engagement-ledger.md` §9 review covering SLA-breach-tracking + practice-area-coverage gaps + ongoing-disclosure COI events + Trustee Panel satisfaction.
- **Pre-launch checkpoint** — per `review-scope-charter.md` §6 named pre-launch event (Phase-0 closure, T&C version-pin lock per Story 2.6, first-claim SM-1 pre-launch, public-launch gate).
- **Self-referencing engagement-letter substantive-language dependency** — the named counsel selected at Task 8 reviews and edits the engagement letter for their own engagement, then signs. Documented as Decision 2026-06-02-013 body item 7.

## §11 File index

| File | Purpose | Authored |
|---|---|---|
| `README.md` | Framework overview + structural invariants + lifecycle + cross-references | This document |
| `engagement-letter-template.md` | Engagement letter framework skeleton (14 sections) with counsel-return placeholder markers | Task 2 |
| `review-scope-charter.md` | Substantive scope commitment: 5 AC-named items + ~32-row cross-Story deferred-scope inventory + 13-row regulatory surface + ADR slot review + pre-launch checkpoints | Task 3 |
| `review-artifact-roster.md` | Per-artifact submission roster with priority ordering + lifecycle status | Task 4 |
| `per-artifact-return-roster.md` | Per-artifact return content + integration lifecycle | Task 4 |
| `counsel-roster.md` | Counsel-roster schema + shortlist criteria + single template row at `pending-trustee-selection` | Task 5 |
| `engagement-ledger.md` | 11-section lifecycle log: scope-ratification + counsel-selection + engagement-signature + first-artifact-submission + return-receipt + SLA-breach-tracking + periodic re-attestation + pack-revision + cross-links | Task 5 |
