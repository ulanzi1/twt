# Inventory Roster

**Authority:** architecture §Launch Gate Risks (architecture lines 4768-4791) + architecture §Gap Analysis conditional-escalation observations (architecture lines 4802-4815 + 4817-4840) + AR-49 (epics line 331) + PRD §12 Phase 0 line 1467 + Sprint Change Proposal Item 17.

**Schema (per row):** `gate_id` (canonical kebab-case slug) | `gate_name` (verbatim from architecture row label) | `architecture_source_line` | `owner` (verbatim Owner column) | `support` (verbatim Support column) | `closure_criteria` (objective testable signal per `closure-criteria-rubric.md`) | `target_date` (relative-to-fact trigger per `target-date-rationale-template.md` §3; authored at Task 8 ratification; placeholder `<TO-BE-AUTHORED-AT-TASK-8>` until then) | `current_status` (one of `open` / `in-progress` / `closed` / `accepted-risk` / `deferred-per-named-criteria` / `reframed` per architecture line 4773 disposition vocabulary; or `conditional-escalation-pending-predicate` for Rows 12-14 only) | `closure_evidence_link` (populated upon row closure; multi-link permitted) | `missed_target_escalation_log` (append-only per `escalation-protocol.md` §3 schema) | `cross_story_discharge_path` (verbatim Story closure event) | `notes` (substantive — divergence flags, conditional dependencies, P0-N numbering reconciliation).

**Lifecycle discipline (load-bearing):**

- **Append-only.** Rows are never removed once authored. Future Story 0.15-revision rows (e.g., predicate-materialization elevations from Rows 12-14, decomposition sub-rows from Row 11 per `escalation-protocol.md` §3 outcome `decompose-to-sub-gates`, Story-15-supersession rows) append below Row 15 with `gate_id` extended.
- **Forbidden removal.** A row that is `closed` / `accepted-risk` / `deferred-per-named-criteria` / `reframed` is preserved with its closure-evidence-link; it is not deleted. Architecturally, the closed-rows surface is the audit trail for "what was a launch gate at Phase 1 ratification".
- **Supersession-only.** Row-status changes are supersession entries — the prior status is preserved in a supersession-marker (e.g., `<superseded 2026-06-15: open → closed via Decision 2026-06-15-NNN>`); the row's current-state field is updated to the new value. Inherited from Stories 0.3/0.4/0.5/0.6/0.7/0.12/0.13/0.14.
- **Closure-status-aggregation discipline** per [[feedback_closure_language_precision]] + Story 0.15 README §4 invariant 14 — rows flip to `closed` ONLY on substantive Decision supersession entry + Tasks 7-11 external action closure + ratifying trustees ≥2, NOT per-Story framework-author-commit `done` status.
- **Verbatim row labels** — Rows 1-11 cite architecture lines 4778-4788 verbatim; row labels MUST NOT be paraphrased. The architecture-vs-UX/epics P0-4 divergence (Row 6) is documented in `notes`; the row label is preserved verbatim per [[feedback_architecture_vs_prd_boundary]].

---

## Rows 1-11 — architecture §Launch Gate Risks verbatim (architecture lines 4778-4788)

### Row 1 — `a-13-backup-engineer-retainer`

- **gate_name:** A-13 backup engineer retainer
- **architecture_source_line:** 4778
- **owner:** Trustee Panel
- **support:** BigDev (technical-fit assessment)
- **closure_criteria:** Substantive: Decision 2026-05-30-006 supersession entry recording ratification by ≥2 trustees of A-13 retainer + named backup engineer + signed contract per Story 0.6 Task 11 closure. Testable signal: `inventory-roster.md` row `closure_evidence_link` resolves to `.decision-log.md#decision-2026-05-30-006`; contract signature event recorded with date + signing trustees + named engineer.
- **target_date:** `<TO-BE-AUTHORED-AT-TASK-8>`
- **current_status:** `closed` <superseded 2026-06-05 (Decision 2026-06-05-022 Story 0.6 ≥2-trustee A-13 retainer authorization pack-as-a-unit per Q6.1 + Q6.2; superseding the 2026-06-03 code-review D-01 `in-progress` reversion per Q12.7 cross-link confirmation and Decision 031 body item 6); prior history: closed (author-commit) → in-progress (2026-06-03 D-01 reversion) → closed (2026-06-05 ≥2-trustee ratification)>
- **closure_evidence_link:** [Decision 2026-06-05-022](../../.decision-log.md#decision-2026-06-05-022) (Story 0.6 Tasks 8-12 ratification: A-13 retainer ₹20,000/month authorized pack-as-a-unit; both trustees co-signed Q6.1+Q6.2 initials per addendum sign-off block) + [Decision 2026-05-30-006](../../.decision-log.md#decision-2026-05-30-006) (Story 0.6 author-commit framework) + [Decision 2026-06-05-031](../../.decision-log.md#decision-2026-06-05-031) (Story 0.15 Task 8 inventory ratification confirming Row 1+2 closure) + [Decision 2026-06-05-035](../../.decision-log.md#decision-2026-06-05-035) (Phase-0 provisional closure meta-entry).
- **missed_target_escalation_log:** (empty)
- **cross_story_discharge_path:** Story 0.6 Decision 2026-05-30-006 (framework-leg) + Decision 2026-06-05-022 (≥2-trustee A-13 retainer authorization + outreach timeline + activation-scenario target ratified). Substantive Tasks 9-12 (named engineer + signed contract + IAM grant + onboarding + activation test) remain deferred per Decision 022 Open Follow-ups; per closure-status-aggregation discipline, the ≥2-trustee-ratification-leg flips this row to `closed`, with substantive-execution-leg tracked separately as the Story 0.6 cross-Story discharge path.
- **notes:** Row flipped to `closed` 2026-06-05 per Q12.7 cross-link to Decision 028 ratification event + Decision 022 ≥2-trustee A-13 retainer authorization. Per closure-criteria-rubric.md §5, the trustee-ratification leg of the closure criteria is fully met; the substantive-execution leg (Story 0.6 Tasks 9-12 named engineer + contract + IAM + onboarding + activation) remains tracked as a downstream cross-Story discharge path per Decision 035 Phase-0 provisional closure meta-entry. If a substantive Story 0.6 Tasks 9-12 retraction occurs (e.g., backup-engineer-candidate withdraws), this row supersedes back to `open` per `escalation-protocol.md` §1 trigger 4 (cross-Story discharge-path Story status retreat).

### Row 2 — `p0-3-spec-to-cadence-reality-check`

- **gate_name:** P0-3 Spec-to-Cadence Reality Check
- **architecture_source_line:** 4779
- **owner:** BigDev
- **support:** Trustee Panel (scope decisions)
- **closure_criteria:** Substantive: Decision 2026-06-01-012 + Decision 2026-06-01-012-amend-1 supersession entries recording reconciled engineer-month estimate vs SM-1 with ≥2-trustee ratification per Story 0.12 Task 9 + Task 11 closure. Testable signal: `inventory-roster.md` row `closure_evidence_link` resolves to Decision 012 + 012-amend-1; reconciliation-decision-framework.md substantive Phase-1 scope decision recorded with cut-scope / move-SM-1 / contract-help-path disposition.
- **target_date:** `<TO-BE-AUTHORED-AT-TASK-8>`
- **current_status:** `closed` <superseded 2026-06-05 (Decision 2026-06-05-028 Story 0.12 Task 9 ≥2-trustee composite ratification of Decision 2026-06-04-016 bundled items: no-trigger outcome + Epic 4 + Epic 12 medium-band reassignments + 25→80 hr/week cadence override; both trustees co-signed Q12.4 + QA.1 initials); superseding the 2026-06-03 code-review D-01 `in-progress` reversion per Q12.7 cross-link confirmation and Decision 031 body item 6); prior history: closed (author-commit) → in-progress (2026-06-03 D-01 reversion) → closed (2026-06-05 ≥2-trustee Task 9 ratification)>
- **closure_evidence_link:** [Decision 2026-06-05-028](../../.decision-log.md#decision-2026-06-05-028) (Story 0.12 Task 9 ≥2-trustee composite ratification — bundled supersession of Decision 016) + [Decision 2026-06-04-016](../../.decision-log.md#decision-2026-06-04-016) (Story 0.12 Tasks 7+8 no-trigger sign-off composite) + [Decision 2026-06-01-012](../../.decision-log.md#decision-2026-06-01-012) + [Decision 2026-06-01-012-amend-1](../../.decision-log.md#decision-2026-06-01-012-amend-1) (Story 0.12 framework-leg) + [Decision 2026-06-05-031](../../.decision-log.md#decision-2026-06-05-031) (Story 0.15 Task 8 inventory ratification confirming Row 1+2 closure) + [Decision 2026-06-05-035](../../.decision-log.md#decision-2026-06-05-035) (Phase-0 provisional closure meta-entry).
- **missed_target_escalation_log:** (empty)
- **cross_story_discharge_path:** Story 0.12 Decision 2026-06-01-012 + Decision 2026-06-01-012-amend-1 (framework-leg) + Decision 2026-06-04-016 (Tasks 7+8 no-trigger composite) + Decision 2026-06-05-028 (≥2-trustee Task 9 ratification of bundled items). Step 4 final validation (Task 11) remains deferred per Decision 028 Open Follow-ups; per closure-status-aggregation discipline, the ≥2-trustee-ratification-leg flips this row to `closed`, with Step-4-validation-leg tracked separately.
- **notes:** Row flipped to `closed` 2026-06-05 per Q12.7 cross-link to Decision 028 ratification event. Per closure-criteria-rubric.md §5, the trustee-ratification leg of the closure criteria is fully met via no-trigger outcome (no cut-scope / move-SM-1 / contract-help required); the substantive-execution leg (Story 0.12 Task 11 Step 4 implementation-readiness validation against unchanged reconciled scope) remains tracked as a downstream cross-Story discharge path per Decision 035 Phase-0 provisional closure meta-entry. If Trustee Panel substantively rejects the reconciliation outcome at a later monthly review (e.g., Month-3 re-attestation surfaces drift past 1.5× threshold), this row supersedes back to `open` per `escalation-protocol.md` §1 trigger 4.

### Row 3 — `edge-waf-dpdpa-compatibility-decision`

- **gate_name:** [P0] Edge / WAF DPDPA-compatibility decision (Cloudflare-incompatible → pivot to self-hosted WAF per §5.8a)
- **architecture_source_line:** 4780
- **owner:** Trustee Panel
- **support:** Legal Counsel (review), BigDev (pivot design)
- **closure_criteria:** Substantive: Legal Counsel first-artifact return per Story 0.13 review-scope-charter §1 + `.decision-log.md` Decision ratifying Cloudflare-keep OR self-hosted WAF pivot per architecture §5.8a + ADR substantively authored at `docs/knowledge-transfer/adr-index.md`. Testable signal: ADR index row for Cloudflare/WAF decision flips from `slot-reserved-pre-write` to `committed` with substantive ADR body; `inventory-roster.md` row `closure_evidence_link` resolves to the Decision + ADR + Legal Counsel return artifact.
- **target_date:** `<TO-BE-AUTHORED-AT-TASK-8>`
- **current_status:** `closed`
- **closure_evidence_link:** [Decision 2026-06-21-057](../../.decision-log.md#decision-2026-06-21-057) (Cloudflare-keep ratified; DPDPA legal review cleared) + [ADR-0010](../../adr/ADR-0010-edge-waf-cloudflare-turnstile.md) (ratified 2026-06-21, ≥2-trustee) + Legal Counsel return: Adv. Mohit Agrawal — "Cloudflare acceptable as designed" (Story 0.13 review-scope-charter §1 first-artifact).
- **missed_target_escalation_log:** (empty)
- **cross_story_discharge_path:** Story 0.13 Legal Counsel first-artifact + subsequent-artifact returns per Decision 2026-06-02-013 + Task 11 first-return + `.decision-log.md` decision ratifying Cloudflare-keep OR self-hosted WAF pivot + ADR substantively authored at `docs/knowledge-transfer/adr-index.md`.
- **notes:** Row flipped `open` → `closed` 2026-06-21 per Decision 2026-06-21-057. Closure criteria fully met: (a) Legal Counsel first-artifact return — Adv. Mohit Agrawal cleared the Cloudflare-DPDPA posture for the `asia-south1` target ("acceptable as designed"); (b) `.decision-log.md` Decision ratifying **Cloudflare-keep** (not the self-hosted-WAF pivot) per architecture §5.8a; (c) ADR-0010 substantively authored AND ratified (≥2 trustees: Dhiraj Rahul + Kalpana Bharti). Scope note: the clearance covers the edge design as recorded in ADR-0010; a material change to the edge data-flow re-opens this row. Operational note (per [[feedback_closure_language_precision]]): the live `terraform apply` (deferred-work D1-1.13) remains gated on the *provisioning* half (a live Cloudflare zone) — a deploy-execution item, not a launch-gate-inventory decision gate — so this decision row is `closed`.

### Row 4 — `p0-1-lifecycle-operational-state-coverage`

- **gate_name:** P0-1 Lifecycle Operational-State Coverage
- **architecture_source_line:** 4781
- **owner:** BigDev
- **support:** UX
- **closure_criteria:** Substantive: Decision 2026-05-30-007 supersession entry recording all eight Phase-1 loop-node fallback handlers named, funded, on-rota with SLA + contact rota published per Story 0.7 Task 11 closure + UX-DR4 substantive discharge ("every Phase-1 loop node has named, funded, on-rota fallback handler with SLA + contact rota"). Testable signal: `docs/fallback-handler-ledger/per-loop-node/<node>.md` for all eight loop nodes carry substantive named-handler + funding-status + SLA + contact-rota fields populated (not `<PENDING-TASK-N>` placeholders); synthetic SLA test outcomes recorded per Story 0.7.
- **target_date:** `<TO-BE-AUTHORED-AT-TASK-8>`
- **current_status:** `open`
- **closure_evidence_link:** (empty)
- **missed_target_escalation_log:** (empty)
- **cross_story_discharge_path:** Story 0.7 Decision 2026-05-30-007 + Story 0.7 Task 11 closure (Operations Lead hire OR substitute-handler-bench ratification + all eight loop nodes named, funded, on-rota per UX-DR4).
- **notes:** Story 0.7 sprint-status = `done` reflects framework author-commit closure ONLY; substantive P0-1 closure per UX-DR4 requires Operations Lead hire OR substitute-handler-bench ratification + per-loop-node ratification + synthetic SLA test outcomes — none of which have happened at Story 0.15 author-commit time. Per more-protective-governs disposition per [[feedback_closure_language_precision]], row remains `open` until Story 0.7 Tasks 7-11 substantive closure.

### Row 5 — `p0-2-member-class-validation`

- **gate_name:** P0-2 Member-Class Validation (field work)
- **architecture_source_line:** 4782
- **owner:** UX Researcher
- **support:** Trustee Panel (logistics)
- **closure_criteria:** Substantive: All four P0-2 field work portfolios closed — Decision 2026-05-30-008 (P0-2a teacher empathy) + Decision 2026-05-31-009 (P0-2b bereaved spouse) + Decision 2026-05-31-010 (P0-2c VI/low-vision) + Decision 2026-05-31-011 (P0-2d operator shadowing) supersession entries recording field-work execution + substantive synthesis + ≥1 trustee review + divergence reconciliation + Epic 3/6/8/10/11 design-freeze integration per each Story Task 11. Testable signal: each of `_bmad-output/research/p0-2a-teacher-empathy.md` + `p0-2b-bereaved-spouse.md` + `p0-2c-vi-low-vision-accessibility.md` + `p0-2d-operator-shadowing.md` substantively populated (not `<PENDING-EVIDENCE-CAPTURE>` placeholders).
- **target_date:** `<TO-BE-AUTHORED-AT-TASK-8>`
- **current_status:** `open`
- **closure_evidence_link:** (empty — multi-link populates upon each P0-2a/b/c/d Story Task 11 substantive closure)
- **missed_target_escalation_log:** (empty)
- **cross_story_discharge_path:** Story 0.8 Decision 2026-05-30-008 (P0-2a teacher empathy) + Story 0.9 Decision 2026-05-31-009 (P0-2b bereaved spouse) + Story 0.10 Decision 2026-05-31-010 (P0-2c VI/low-vision) + Story 0.11 Decision 2026-05-31-011 (P0-2d operator shadowing) + each Story Task 11 closure.
- **notes:** Stories 0.8 + 0.9 sprint-status = `done`; Stories 0.10 + 0.11 sprint-status = `review` per sprint-status.yaml lines 92-93. All four reflect framework author-commit closure ONLY; substantive P0-2 closure requires field-work execution + substantive synthesis + Epic design-freeze integration. Per more-protective-governs disposition, row remains `open` until all four sub-Stories' Tasks 7-11 substantively close. Multi-link evidence permitted per `closure-criteria-rubric.md` §6 — row closure is the conjunction of all four sub-Stories' closures.

### Row 6 — `p0-4-empty-skeleton-error-inventory`

- **gate_name:** P0-4 Empty/Skeleton/Error Inventory
- **architecture_source_line:** 4783
- **owner:** UX
- **support:** BigDev
- **closure_criteria:** Substantive: UX-led empty/skeleton/error-state inventory pass covering every Phase-1 screen surface; substantively populated artifact at (likely) `docs/ux/empty-skeleton-error-inventory.md` OR equivalent Epic 1 / Epic 11a deliverable; ≥2-trustee ratification recorded in `.decision-log.md`. Testable signal: per-screen empty-state + skeleton-state + error-state designs enumerated; no `<TBD>` cells; Epic 1 / Epic 11a Story-level discharge cited.
- **target_date:** Epic 11a completion (full Phase-1 surface inventory) — Story 2.5 lands the `apps/public` partial (the `in-progress` flip).
- **current_status:** `in-progress`
- **closure_evidence_link:** `docs/ux/empty-skeleton-error-inventory.md` (Story 2.5 PARTIAL — the `apps/public` surfaces) + `.decision-log.md` Decision 2026-06-21-058 (author-committed; ≥2-trustee ratification un-attested-pending) + `.decision-log.md` Decision 2026-06-23-060 (≥2-trustee ratification **attested** 2026-06-23 — Dhiraj Rahul + Kalpana Bharti).
- **missed_target_escalation_log:** (empty)
- **cross_story_discharge_path:** **ARCHITECTURE-VS-UX/EPICS P0-N DIVERGENCE FLAG** — architecture line 4783 names P0-4 = "Empty/Skeleton/Error Inventory" (UX deliverable) while epics line 687 + UX spec line 109 P0-4 = "legal counsel onboarding" (Story 0.13 discharge); Story 0.13 discharges UX/epics P0-4 + architecture-side subsidiary legal-counsel-naming rows at architecture lines 4785-4788 (Rows 8, 9, 10 of this inventory; Row 3 partially), NOT this architecture line 4783 row. **RE-HOMED (Decision 2026-06-20-054, AI-3):** architectural P0-4 (UX-deliverable empty/skeleton/error-state inventory) is formally attached to **Story 2.5** (apps/public Astro SSR shell — first public surface). Story 2.5 ACs include a UX-led empty/skeleton/error-state inventory covering every screen surface in apps/public at Story 2.5; artifact at `docs/ux/empty-skeleton-error-inventory.md`; ≥2-trustee ratification in .decision-log.md. The inventory is extended at Epic 11a (Member Directory) and Epic 11b (per-claim + In Memoriam); this gate flips `in-progress` at Story 2.5 start and `closed` at Epic 11a full-Phase-1-surface inventory completion.
- **notes:** architecture-vs-UX/epics P0-4 numbering divergence per Stories 0.13 + 0.14 Notes; architecture P0-4 row name = "Empty/Skeleton/Error Inventory" is preserved verbatim per architecture-source-of-truth rule per [[feedback_architecture_vs_prd_boundary]]; UX/epics P0-4 = legal-counsel-onboarding = Story 0.13 discharge is captured separately by Rows 3, 8, 9, 10 of this inventory. A-4 (Epic 0 commitment to fold this into Story 1.17 ACs) was missed — Story 1.17 shipped without it. Re-homed to Story 2.5 via Decision 2026-06-20-054 before Story 2.1 exits review (AI-3). **SUPERSESSION MARKER (Story 2.5, Decision 2026-06-21-058):** `open` → `in-progress` — the UX-led inventory for the `apps/public` 2.5 surfaces (Niyamavali list + version/diff sub-views + 404 + 500) was authored at `docs/ux/empty-skeleton-error-inventory.md` (no `<TBD>` cells; skeleton/loading recorded N/A-by-design for the server-rendered, zero-hydration surface). The inventory is PARTIAL (apps/public only); Row 6 stays `in-progress` and is reserved for `closed` at Epic 11a full-Phase-1-surface completion (closure_criteria preserved verbatim above — NOT relaxed). The ≥2-trustee ratification leg of closure_criteria is recorded **un-attested-pending** in Decision 2026-06-21-058 per [[feedback_record_unattested_no_backfill]] — author-committed artifact, trustee ratification carried as a gated open follow-up, not fabricated. **ATTESTATION (Decision 2026-06-23-060):** the ≥2-trustee ratification leg is now **attested** — the Trustee Panel (Dhiraj Rahul + Kalpana Bharti) ratified the Story 2.5 `apps/public` inventory at the 2026-06-23 consent session. Per [[feedback_closure_language_precision]]: the un-attested leg is now closed, but Row 6 **stays `in-progress`** — the `closed` trigger remains the full-Phase-1-surface inventory at Epic 11a completion (closure_criteria NOT relaxed).

### Row 7 — `p0-5-native-stack-validation-experiment`

- **gate_name:** P0-5 Native-Stack Validation Experiment
- **architecture_source_line:** 4784
- **owner:** BigDev
- **support:** UX (UI parity assessment)
- **closure_criteria:** Substantive: Decision 2026-06-02-014 supersession entry recording ratify-or-pivot decision with ≥1-trustee acknowledgement per Story 0.14 Task 11 closure + ADR-NNNN-native-mobile-stack-ratify substantively authored at `docs/knowledge-transfer/adr-index.md` line 52 (currently `slot-reserved-pre-write`) + architecture line 4784 row flipped to `closed` via PR-2 ADR-transcription + architecture lines 150-152 §Deferred Decisions native-mobile-stack row amended from working-assumption to ratified-with-evidence OR pivoted-with-FM-2-trace. Testable signal: ADR substantively populated; `docs/native-stack-validation/measurement-template.md` 54-cell matrix populated (no `_PENDING-MEASUREMENT_` cells); `_bmad-output/research/p0-5-native-stack-validation.md` substantively populated.
- **target_date:** `<TO-BE-AUTHORED-AT-TASK-8>`
- **current_status:** `open`
- **closure_evidence_link:** (empty)
- **missed_target_escalation_log:** (empty)
- **cross_story_discharge_path:** Story 0.14 Decision 2026-06-02-014 + Story 0.14 Task 11 closure (ratify-or-pivot decision + ≥1-trustee acknowledgement per BigDev decision authority per UX spec line 845) + ADR-NNNN-native-mobile-stack-ratify substantively authored at adr-index.md line 52.
- **notes:** Story 0.14 sprint-status = `done` reflects framework author-commit closure ONLY; substantive P0-5 closure per UX spec line 854 ("Substrate-dependent engineering does not begin without ratify decision") requires Tasks 7-11 closure per Story 0.14 — Trustee Panel scope ratification + device procurement + ~2-week prototype + measurement + ratify-or-pivot decision + ≥1-trustee acknowledgement — none of which have happened at Story 0.15 author-commit time. Per more-protective-governs disposition, row remains `open` until Story 0.14 Task 11 substantive closure with closure-evidence-link to Decision 2026-06-02-014 supersession entry.

### Row 8 — `dpdpa-grievance-officer-designation`

- **gate_name:** DPDPA grievance officer designation
- **architecture_source_line:** 4785
- **owner:** Trustee Panel
- **support:** Legal Counsel + BigDev (helpline architecture fit)
- **closure_criteria:** Substantive: Legal Counsel return per Story 0.13 first-artifact submission (DPDPA grievance officer designation is on the review-scope-charter scope per Story 0.13 §1 ledger ratification) + Trustee Panel designation event recorded in `.decision-log.md` with named officer + contact details + escalation-path. Testable signal: `.decision-log.md` Decision entry with named grievance officer + contact + reporting cadence; cross-reference to PRD §4.14.1 regulatory surface.
- **target_date:** `<TO-BE-AUTHORED-AT-TASK-8>`
- **current_status:** `open`
- **closure_evidence_link:** (empty)
- **missed_target_escalation_log:** (empty)
- **cross_story_discharge_path:** Story 0.13 Legal Counsel return per Decision 2026-06-02-013 + Trustee Panel designation event recorded in `.decision-log.md`.
- **notes:** No Trustee Panel designation event at Story 0.15 author-commit. Discharge depends on Story 0.13 Tasks 7-11 substantive Legal Counsel engagement + return events; row remains `open`.

### Row 9 — `fr-43a-external-forum-destination`

- **gate_name:** FR-43A external forum destination (district / state consumer commission, civil court)
- **architecture_source_line:** 4786
- **owner:** Trustee Panel + Legal Counsel
- **support:** —
- **closure_criteria:** Substantive: Legal Counsel return per Story 0.13 first-artifact (FR-43A denial-appeal flow procedural fairness review = Story 0.13 AC-1 first-artifact scope per Story 0.13 review-scope-charter §1 priority-2) + Trustee Panel ratification recorded in `.decision-log.md` selecting forum destination (district vs state consumer commission vs civil court) + cross-reference to `docs/fallback-handler-ledger/loop-nodes/denial-appeal.md` §3 substantive content. Testable signal: `.decision-log.md` Decision entry with forum-destination selection + rationale + cross-reference to FR-43A flow design.
- **target_date:** `<TO-BE-AUTHORED-AT-TASK-8>`
- **current_status:** `open`
- **closure_evidence_link:** (empty)
- **missed_target_escalation_log:** (empty)
- **cross_story_discharge_path:** Story 0.13 Legal Counsel return per Decision 2026-06-02-013 (FR-43A denial-appeal flow procedural fairness review = AC-1 first-artifact scope) + Trustee Panel ratification recorded in `.decision-log.md`.
- **notes:** No Legal Counsel return + Trustee Panel ratification at Story 0.15 author-commit. Row remains `open`.

### Row 10 — `regulatory-surface-sign-off`

- **gate_name:** Regulatory surface sign-off (trust + DPDPA + UPI)
- **architecture_source_line:** 4787
- **owner:** Trustee Panel + Legal Counsel
- **support:** BigDev (artifact preparation)
- **closure_criteria:** Substantive: Legal Counsel returns per Story 0.13 review-scope-charter §4 13-row regulatory surface review + per-row Trustee Panel sign-off recorded in `.decision-log.md`; multi-link row — covers trust formation regulatory surface (cross-references Row 11) + DPDPA Data Fiduciary registration + UPI/RBI regulatory surface. Testable signal: per-regulatory-surface-row sign-off entry in `.decision-log.md` + cross-reference to substantive Legal Counsel return artifact per Story 0.13 review-artifact-roster.
- **target_date:** `<TO-BE-AUTHORED-AT-TASK-8>`
- **current_status:** `open`
- **closure_evidence_link:** (empty — multi-link populates upon each Legal Counsel return event + Trustee Panel sign-off per regulatory surface row)
- **missed_target_escalation_log:** (empty)
- **cross_story_discharge_path:** Story 0.13 Legal Counsel returns per Decision 2026-06-02-013 review-scope-charter §4 13-row regulatory surface review + per-row Trustee Panel sign-off recorded in `.decision-log.md`.
- **notes:** No Legal Counsel returns across the 13-row regulatory surface at Story 0.15 author-commit. Row remains `open`.

### Row 11 — `trust-formation-and-legal-registration`

- **gate_name:** Trust formation + legal registration
- **architecture_source_line:** 4788
- **owner:** Trustee Panel
- **support:** Legal Counsel
- **closure_criteria:** Substantive: Trust deed filed with state Trust Sub-Registrar + 12A/12AB Income Tax registration certificate + GST registration certificate + DPDPA Data Fiduciary registration confirmation per PRD OQ-16 + Trustee Panel sign-off in `.decision-log.md`. Testable signal: per-registration-event entry in `.decision-log.md` with registration number + filing date + cross-reference to off-repo signed engagement-letter / registration certificates per Story 0.13 §14 off-repo storage. Row is decomposable into sub-rows per `escalation-protocol.md` §3 outcome `decompose-to-sub-gates` (trust-deed-filing + 12A/12AB-registration + GST-registration + DPDPA-Data-Fiduciary-registration) — parent row closure is the conjunction of all sub-row closures.
- **target_date:** `<TO-BE-AUTHORED-AT-TASK-8>`
- **current_status:** `open`
- **closure_evidence_link:** (empty)
- **missed_target_escalation_log:** (empty)
- **cross_story_discharge_path:** Trustee Panel trust-deed filing + 12A/12AB-registration + GST-registration + DPDPA-Data-Fiduciary-registration per PRD OQ-16 + Trustee Panel sign-off in `.decision-log.md`; **not Story-discharged** — Trustee Panel direct ownership; decomposes into sub-rows per `escalation-protocol.md` §3 if substrate-of-record demands.
- **notes:** Trustee Panel direct ownership; no trust-deed filing event at Story 0.15 author-commit. Row remains `open`. Decomposition strategy is an Open ADR slot per README §7 item 2.

---

## Rows 12-14 — architecture §Gap Analysis conditional-escalation candidates (architecture lines 4802-4815 + 4817-4840)

### Row 12 — `feature-flag-tool-selection-p1-conditional`

- **gate_name:** Feature-flag tool selection (P1) — load-bearing dependency observation
- **architecture_source_line:** 4817-4828
- **owner:** (per architecture line 4827 escalation-path: "Gap Analysis findings may elevate unresolved decisions into Launch Gate Risks" — Trustee Panel ratifies elevation; BigDev is primary support)
- **support:** BigDev + Trustee Panel
- **closure_criteria:** Substantive: Predicate per architecture lines 4823-4828 verbatim: "if tool selection lags the first FR-58C-gated rollout, DigiLocker-mandatory migration (PRD A-4) blocks or requires ad-hoc gating that violates Cross-Cutting #15's visibility and no-secret-flags properties." If predicate materializes (DigiLocker-mandatory migration begins OR first FR-58C-gated rollout starts AND tool not selected), row flips from `conditional-escalation-pending-predicate` to `open` per `escalation-protocol.md` §1 trigger 3 + Trustee Panel ratification + tool selection ADR substantively authored at `docs/knowledge-transfer/adr-index.md`. Otherwise at Phase 1 launch flips to `accepted-risk` OR `deferred-per-named-criteria` per Trustee Panel disposition.
- **target_date:** `predicate-decision-point` — checked at every monthly review per `monthly-review-cadence-protocol.md` §2 agenda template "newly-elevated conditional rows" item; latest at Phase 1 launch ratification.
- **current_status:** `predicate-foreclosed-pending-trustee-disposition` (was `conditional-escalation-pending-predicate`; updated 2026-07-31 at Story 10.8 closure)
- **closure_evidence_link:** `docs/adr/ADR-0036-feature-flag-tool-selection.md` (status `drafted`); `_bmad-output/implementation-artifacts/10-8-feature-flags-per-cohort-capability-bar-governance-boundary-invariant.md`; `governance_boundary.yaml` + `scripts/governance-boundary/`
- **missed_target_escalation_log:** (empty — no target was missed; selection landed AHEAD of the decision gate)
- **cross_story_discharge_path:** **Substantively discharged by Story 10.8** (2026-07-31), pending Trustee Panel ratification of ADR-0036. The row's predicate had two conjuncts — a rollout beginning AND *tool not selected*. The second conjunct is now false: ADR-0036 selects in-house Postgres-backed flags and Story 10.8 shipped the implementation, so **the predicate can no longer materialize** and path (a) (elevation to `open`) is foreclosed. Remaining step: Trustee Panel ratification of ADR-0036 (`drafted` → `ratified`), at which point this row closes rather than being dispositioned as `accepted-risk` / `deferred-per-named-criteria`.
- **notes:** Conditional-escalation candidate per [[feedback_gap_analysis_observational]]. Architecture §Gap Analysis observation; not pre-emptively elevated. **Update 2026-07-31 (Story 10.8):** the risk this row tracked was *ad-hoc gating* filling the vacuum left by an unselected tool — "gating that violates Cross-Cutting #15's visibility and no-secret-flags properties." That vacuum is closed: a real mechanism now exists, the inventory is enumerable by `pariwar_admin` + `auditor`, and "no secret flags" is structural (the listing iterates the code registry; no `hidden` field exists in the schema, the contract, or the UI). ⚠ Stated precisely per [[feedback_closure_language_precision]]: this row is **not yet closed** — ADR-0036 is `drafted`, not `ratified`, and the P1 slot in `adr-index.md` reads `drafted` to match. ⚠ Also note ADR-0036 records a **knowing partial delivery of AR-64**: automatic error-spike rollback is un-built (no metrics substrate in-repo; AR-31 observability is itself a deferred ADR) and the audited MANUAL `rolled_back` flip is what ships. That gap is carried as risk in `deferred-work.md`, NOT absorbed into this row's closure.

### Row 13 — `fr-20-pool-spawn-capacity-envelope-conditional`

- **gate_name:** FR-20 pool-spawn capacity envelope — provisional until validated
- **architecture_source_line:** 4830-4840
- **owner:** (per architecture line 4838 escalation-path: "Gap Analysis findings may elevate the unresolved capacity-validation outcome into a Launch Gate Risk" — Trustee Panel ratifies elevation; BigDev is primary support)
- **support:** BigDev (capacity measurement)
- **closure_criteria:** Substantive: Predicate per architecture lines 4832-4837 verbatim: "capacity assumption remains provisional until validated under representative load; if pre-launch measurement reveals the envelope does not hold, the spawn-saga decomposition or the bulk-write mechanism may require revision." Capacity-validation pre-launch measurement is the Epic 7 + architecture §Control-Demonstration-Schedule line 4955 "Push fan-out load test Phase-0" commitment. If measurement reveals envelope fails → predicate materializes → row flips to `open` + revision ADR substantively authored; if measurement reveals envelope holds → row flips directly to `closed` with measurement-evidence-link + ≥2-trustee ratification at the next monthly review per `closure-criteria-rubric.md` §5 `closed` quorum requirement.
- **target_date:** `4L-pre-launch-measurement-execution-event` <superseded 2026-07-19 (Story 7.9): prior `predicate-decision-point` (Push-fan-out-load-test Phase-0 build) → the operator-run 4L/N=50/≥10-run measurement-execution event; the measurement HARNESS is now delivered (`apps/jobs/tests/measured-validation-pool-spawn.test.ts`), so the remaining decision-point is the operator EXECUTING it at representative 4L scale>.
- **current_status:** `conditional-escalation-pending-predicate` <superseded 2026-07-19 (Story 7.9): the predicate TOOLING is delivered + `closure_evidence_link` populated; predicate SHARPENED from "load-test executed" to "operator-run 4L record with `pass === true`". Row is now `closed`-ready-PENDING-4L: on the operator 4L run landing `pass === true` → flips to `closed` w/ ≥2-trustee ratification; on `pass === false` → flips to `open` + revision ADR. Prior status preserved; a per-Story author-commit `done` never flips a launch-gate row — see Decision 2026-07-19-066 + `closure-criteria-rubric.md` §5>.
- **closure_evidence_link:** `_bmad-output/research/pool-engine-validation-gate.md` (the committed measured-validation evidence doc — harness + smoke-proven liveness + the 4L-un-attested status) + Decision 2026-07-19-066. NOTE: the `closed` flip itself remains gated on the operator-run `pre-launch-4L` record (`pass === true`) + ≥2-trustee ratification — this link is `closed`-ready, not `closed`.
- **missed_target_escalation_log:** (empty)
- **cross_story_discharge_path:** **Story-discharged (harness leg) by Story 7.9** — the pre-launch measured-validation harness + evidence doc + this supersession + Decision 2026-07-19-066 are committed. Remaining discharge depends on (a) the operator-run 4L measurement → `pass === true` → row flips to `closed` w/ ≥2-trustee ratification, OR `pass === false` → `open` + revision ADR then `closed` after re-measurement; OR (b) Phase 1 launch with the 4L run not yet executed → Trustee Panel disposition `accepted-risk` / `deferred-per-named-criteria`. The 4L number is carried **un-attested**, never back-filled/faked ([[feedback_record_unattested_no_backfill]]).
- **notes:** Conditional-escalation candidate per [[feedback_gap_analysis_observational]]. Architecture §Control-Demonstration-Schedule commits the load-test as Phase-0 first-exercise; the architecture-side commitment makes the predicate near-certain to be checked before Phase 1 launch. **Story 7.9 (2026-07-19):** landed the measurement harness (reusing the AI-6-2 core, extracted to `@twt/measured-validation`), proved it runs end-to-end against real Postgres at smoke scale (has teeth — `pass` flips `false` on a budget breach; budget pinned at 60_000 ms, no doctored ceiling), and co-attests the assignment-map replay determinism. The 4L/N=50 envelope number is operator-executed + carried un-attested until captured.

### Row 14 — `composed-account-state-enumeration-conditional`

- **gate_name:** Composed Account State enumeration (deferred per architecture lines 4802-4815)
- **architecture_source_line:** 4802-4815
- **owner:** BigDev + Trustee Panel (scope decisions)
- **support:** UX (state-enumeration semantics)
- **closure_criteria:** Substantive: Predicate per architecture lines 4809-4815 verbatim: "consumers of computed Account State (dispatcher suppression §3.4, Module Shelf suppression §4.15, screen-mode parameters Cross-Cutting #9) depend on a contract that is not fully enumerated; today these consumers reference a partial state name list inline" + architecture mitigation lines 4813-4815 verbatim: "each consumer treats its current state-name list as authoritative until the composition workload lands; new state names cannot be introduced without enumerating them in the composition table." When first new state name proposed in an Epic 1+ Story OR pre-launch composition-table-completeness gate fires (e.g., during Epic 14 cross-cutting completeness pass), row flips from `conditional-escalation-pending-predicate` to `open` + Trustee Panel ratification of state-enumeration completion before Epic 1+ Story can land. Otherwise row flips to `deferred-per-named-criteria` at Phase 1 launch per Trustee Panel disposition.
- **target_date:** `predicate-decision-point` — first Epic 1+ Story proposing new Account State name OR Epic 14 cross-cutting completeness pass.
- **current_status:** `conditional-escalation-pending-predicate`
- **closure_evidence_link:** (empty)
- **missed_target_escalation_log:** (empty)
- **cross_story_discharge_path:** Not Story-discharged at present. Discharge depends on (a) Epic 1+ Story proposing new state name → predicate materializes → row flips to `open` + Trustee Panel ratification of composition-table completion; OR (b) Phase 1 launch with no new state name proposed + partial-state-list mitigation operative → row flips to `deferred-per-named-criteria` per Trustee Panel disposition.
- **notes:** Conditional-escalation candidate per [[feedback_gap_analysis_observational]]. Architecture lines 4813-4815 commit a mitigation (each consumer treats current state-name list as authoritative); the mitigation is what makes the pre-enumeration deferral safe. Row tracks the predicate materialization rather than pre-emptively enumerating.

---

## Row 15 — Reserved

### Row 15 — `<RESERVED-FOR-CONDITIONAL-ESCALATION-ELEVATION>`

- **gate_name:** `<RESERVED-FOR-CONDITIONAL-ESCALATION-ELEVATION>`
- **architecture_source_line:** `<TO-BE-AUTHORED-ON-ELEVATION>`
- **owner:** `<TO-BE-AUTHORED-ON-ELEVATION>`
- **support:** `<TO-BE-AUTHORED-ON-ELEVATION>`
- **closure_criteria:** `<TO-BE-AUTHORED-ON-ELEVATION>`
- **target_date:** `<TO-BE-AUTHORED-ON-ELEVATION>`
- **current_status:** `reserved`
- **closure_evidence_link:** (empty)
- **missed_target_escalation_log:** (empty)
- **cross_story_discharge_path:** `<TO-BE-AUTHORED-ON-ELEVATION>`
- **notes:** Reserved slot for post-author-commit conditional-escalation elevation (e.g., new architecture §Gap Analysis observation surfacing during Phase-0 monthly reviews + architecture amendment per ADR + Trustee Panel ratification of elevation). Per append-only discipline, additional reserved slots (Row 16+) append below this row if a sixteenth conditional-escalation candidate elevates before Phase 1 launch.

---

## Row 16 — Story-15-supersession append (epics/PRD-authored SM-1 measurement gate)

> **First row ever appended below Row 15.** Not an architecture-verbatim Row 1-11; an epics/PRD-authored SM-1 measurement gate registered per the append-below-Row-15 / Story-15-supersession convention (Row 15 notes + Lifecycle discipline §9). Per [[feedback_architecture_vs_prd_boundary]] the `architecture_source_line` is `N/A` and the source is cited to epics.md.

### Row 16 — `sm1-90s-twt-portion-loop-measurement`

- **gate_name:** SM-1 B21 90-second-loop TWT-portion measurement
- **architecture_source_line:** N/A — PRD/epics-authored (epics.md:3055-3076; SM-1 B21 "Measurement fence" epics.md:2853); not an architecture-verbatim row
- **owner:** BigDev
- **support:** N/A
- **closure_criteria:** Substantive: **p95 TWT-portion ≤ 60s** across **≥ 10** canonical-device sessions (3GB-class mid-range Android per architecture.md:34 / Story 0.14 P0-5 roster Device 1) under **throttled cellular** with **cold cache**, **AND** total observed loop ≤ 90s (UPI-app round-trip included), recorded in `_bmad-output/research/contribution-loop-90s-validation.md` (§5 results table populated — no `_PENDING-MEASUREMENT_` cells — + §7 verdict = PASS). Testable signal: the validation doc's §5 aggregates + §7 verdict are substantively populated; the exported raw `sessions.json` is archived per §6; p95 computed by `apps/jobs/tests/loop-90s-aggregate.ts` (the shared `@twt/measured-validation` floor-indexed nearest-rank convention).
- **target_date:** before Phase-1 launch (relative-to-fact: the SM-1 demo / Phase-1 transition gate per AR-49; the field run is scheduled ahead of the Phase-1 readiness review).
- **current_status:** `open` — the measurement **instrument** shipped in Story 8.12 (on-device timing harness + off-device p95 aggregation, both unit-tested); the ≥ 10-session **field run** is pending (owner BigDev), so the row is `open`, not `closed`.
- **closure_evidence_link:** `_bmad-output/research/contribution-loop-90s-validation.md` (the scaffolded validation artifact — protocol + mark/segment definitions + the p95 method + the `_PENDING-*` results/verdict) + [Decision 2026-07-25-068](../../.decision-log.md#decision-2026-07-25-068) (Story 8.12 author-commit: instrument landed + this row added). NOTE (mirrors Row 13's `closed`-ready-PENDING pattern): this link records the **instrument-landed** seam; the `closed` flip itself remains gated on the operator-run ≥ 10-session field run landing **PASS** in the validation doc — the p95 number is carried **un-attested**, never back-filled/faked ([[feedback_record_unattested_no_backfill]]).
- **missed_target_escalation_log:** (empty)
- **cross_story_discharge_path:** **Story-discharged (instrument leg) by Story 8.12** — the on-device capture harness (`apps/mobile/lib/loop-timing*.ts` + the four boundary marks), the off-device aggregation (`apps/jobs/tests/loop-90s-aggregate.ts`), the validation-doc scaffold, and this row + Decision 2026-07-25-068 are committed. Remaining discharge depends on (a) the operator-run ≥ 10-session field run → **PASS** → row flips to `closed` w/ evidence-link to the populated validation doc, OR **FAIL** (p95 TWT-portion > 60s) → remediation before Phase-1 launch (segment (b) offender ⇒ 8.13 KMS-on-hot-path per the doc §3/D5) then re-measure; OR (b) Phase 1 launch with the field run not yet executed → Trustee Panel disposition `accepted-risk` / `deferred-per-named-criteria`.
- **notes:** Epics/PRD-authored SM-1 measurement gate appended per the Story-15-supersession convention (Row 15 notes anticipate "additional reserved slots (Row 16+) append below this row") — **not** an architecture-verbatim Row 1-11, so `architecture_source_line: N/A` and the source is cited to epics.md per [[feedback_architecture_vs_prd_boundary]]. Story 8.12 is `[GOVERNANCE]`: it observes the already-shipped 8.2→8.4→8.13 loop, adds ZERO member-facing friction / behavior change / PII / hot-path latency. The instrument's TWT-portion excludes the member's UPI-app round-trip (outside TWT's control) and reports member think-time as its own bucket, so the ≤ 60s budget is judged only on TWT-controlled work.
