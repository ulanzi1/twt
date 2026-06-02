# Operator-Workflow-Call-Pattern Observation Worksheet — P0-2d Operator Shadowing

> **This is the AC's load-bearing surface** — distinct from Story 0.8's mental-model-validation surface, Story 0.9's Pattern 4 evaluation surface, and Story 0.10's UX-DR clause-evaluation surface. The worksheet is the **capture instrument** for the per-pattern verdict against lived shadowing data (the `observation-question-bank.md` is the *internal note-prompt cue list*; this worksheet is the *capture instrument*).
>
> **At Task 4 author-commit:** all verdict cells pre-staged with `verdict = pending-shadowing` placeholder. Task 9 populates verdicts post-shadowing-conduct + post-end-of-shift-debrief opt-in.

## Cover-page trustee note (per Story 0.9 P-03 + Story 0.10 precedent)

**Pre-identified pattern-text gaps / ambiguities flagged for trustee awareness:**

1. **§3 SLA-target candidates** — epics line 3296 enumerates `24h first-response` + `5 biz-day resolution` + `10 biz-day resolution` per category, but does NOT specify which categories get which target. The framework pre-stages a default mapping (claim-related/contribution-related/KYC = 5 biz-day; technical = 10 biz-day; complaint = 5 biz-day) for evaluation purposes; if the shadowing reveals a different mapping is needed, the proposed-revision captures it. The default mapping is NOT a TWT commitment — it is a shadowing-evaluation default.
2. **§5 Member-lookup-form patterns** — UX-DR45 commits 4 search criteria (name + mobile + Aadhaar-masked + Pariwar-ID). The host-helpline's existing lookup system MAY use different criteria; the worksheet evaluates whether UX-DR45's 4-criteria match the observed lookup pattern, not whether the host helpline's system is itself correct.
3. **§7 Operator-facing UX-DR55 precise-technical-register** — UX-DR55 operator-facing carve-out (epics line 449: "Operator-facing: precise technical wording permitted") is a permissive clause, not a prescriptive clause. The worksheet evaluates whether the carve-out is *justified* by observed operator workflow OR whether it imposes TWT-internal-jargon overhead.
4. **§9 Verifier-console-context-from-helpline** — Story 6.10 dependency (epics line 2460) is about whether operator-mediated case context flows into Anita's signals panel. The shadowing observes the operator's note-taking + escalation discipline; the inference to Anita's signals panel is shadowing-finding → cross-Story implication, captured at synthesis §8.

## Cover-page structurally-not-evaluable rows

The following rows are **pre-committed to `not-evaluated-due-to-host-helpline-context-mismatch`** at any non-TWT host helpline, because the underlying mechanism is TWT-platform-specific and cannot be observed at an external helpline:

5. **`lookup-scope-respecting` (§5)** — Pariwar-boundary enforcement is a TWT data-model constraint; a non-TWT host helpline has no Pariwar scope concept. Not evaluable via functional analogy. Re-evaluated at NFR-22 Phase-2 audit or post-TWT-deployment shadowing only.
6. **`decision-strip-save-progress` / `decision-strip-finalize-intake` / `decision-strip-transfer-to-supervisor` / `decision-strip-suspend-call` / `decision-strip-option-completeness` / `decision-strip-positioning` / `decision-strip-labeling` (§8)** — Intake Console decision-strip options are TWT-platform UI elements; a non-TWT host helpline uses a different call-management interface. Functional analogy is permitted for §8 *behavioral observations* (e.g., "does the operator have a suspend-call equivalent?") but the verdict must carry `[via-functional-analogy]` and the `not-evaluated-due-to-host-helpline-context-mismatch` fallback applies if no functional analogy exists.

## Cover-page coverage-gap acknowledgment (per Story 0.9 P-08 + Story 0.10 precedent)

**Patterns marked `not-evaluated-due-to-host-helpline-context-mismatch` MUST be re-evaluated at NFR-22 Phase-2 audit or via additional shadowing at substitute host-helpline** per ethics-protocol §6 review-cadence fallback + README §10 P0-2 four-leg joint-discharge anchor. The coverage-gap is the load-bearing input to substitute-host-helpline engagement if needed.

## §1 — Authority cites

- **PRD FR-52** — Helpdesk first-class subsystem (PRD)
- **PRD FR-37** — Helpline-mediated claim filing flow (PRD)
- **AR-47 Helpdesk first-class subsystem architecture §3.5a** (architecture line 323 + lines 2153-2221)
- **Architecture §3.5 Telephony integration — Helpline Operator console (Persona #7)** (architecture lines 2098-2151)
- **Story 10.1 Helpdesk Subsystem Data Model + Routing-Policy Registry** (epics lines 3310-3322)
- **Story 10.3 Helpline Call-to-Ticket Operator Surface SM-1 demo beat C3** (epics line 3304)
- **Story 6.3 Helpline-mediated Claim Filing Flow** (epics lines 2311-2328)
- **Story 6.10 Verifier Console Signals Panel** (epics lines 2452-2469)
- **UX-DR45 `<MemberLookupForm>`** (UX spec line 2089)
- **UX-DR46 `<ReadBackCard>`** (UX spec line 2089)
- **UX-DR55 Pattern 4 Dignified validation operator-facing carve-out** (epics line 449)
- **UX spec line 1688 Intake-Console-pattern-(b) decision-strip**
- **UX spec line 1513 two-actor design discipline**

## Verdict enum

| Value | Meaning |
|---|---|
| `lands-as-intended` | Pattern is validated against lived shadowing; design does what the pattern commits. If validated via functional analogy at a non-TWT host helpline, record as `lands-as-intended [via-functional-analogy]` and document the analogy in `shadowing_citation`. |
| `requires-revision-with-proposed-change` | Pattern is partially right; specific revision proposed routed to Task 11 reconciliation |
| `requires-deeper-redesign` | Pattern is structurally wrong; design must be re-thought, not just pattern-edited |
| `not-evaluated-due-to-operator-non-engagement-in-debrief` | Operator declined this pattern's opt-in at end-of-shift debrief (per ethics-protocol §3.7) |
| `not-evaluated-due-to-host-helpline-context-mismatch` | Host helpline's existing system / context does not exercise this pattern in observable form; re-evaluated at substitute-host-helpline OR NFR-22 Phase-2 audit |
| `not-evaluated-due-to-observation-coverage-gap` | Pattern not observed during shadowing despite host-helpline context match (e.g., escalation pattern not observed in any shift) |
| `pending-shadowing` | Author-commit default; Task 9 populates post-shadowing-conduct. **`pending-shadowing` is NOT a valid final state after the final shift is complete.** Any row still carrying `pending-shadowing` after the final shift MUST be converted to one of the non-pending verdicts above (including `not-evaluated-due-to-observation-coverage-gap` if the pattern was simply not observed). |

## Mid-engagement revision discipline (per Story 0.9 P-20 + Story 0.10 precedent)

Each pattern row carries an optional `mid-engagement-revision` sub-field. If an operator's verdict on a pattern changes during the engagement (e.g., initial `lands-as-intended` revised to `requires-revision-with-proposed-change` after a later shift surfaces contradicting observation), researcher records:

- **Original verdict:** [first verdict captured]
- **Revised verdict:** [later verdict captured]
- **Context note:** [what triggered the revision]

The latest revised verdict is authoritative; the original is preserved for synthesis context.

**For single-shift engagements** (where only one shift is conducted): `mid-engagement-revision` is `N/A — single-shift engagement` for all rows. The mid-engagement revision mechanism is only meaningful when multiple distinct shifts produce contradicting observations.

---

## §2 — Routing-policy category candidates × verdict matrix

**Authority:** Story 10.1 line 3322 routing-policy categories: `claim-related` + `contribution-related` + `KYC` + `technical` + `complaint`

| pattern_id | pattern (routing-policy category candidate) | verdict | shadowing_citation | proposed_revision | divergence_log_row_id | mid-engagement-revision |
|---|---|---|---|---|---|---|
| `routing-claim-related` | Calls about claim filing, claim status, claim documents, claim decisions, claim appeals route to a `claim-related` category | pending-shadowing | — | — | — | — |
| `routing-contribution-related` | Calls about contribution payment, UTR, payment confirmation, contribution status route to a `contribution-related` category | pending-shadowing | — | — | — | — |
| `routing-kyc` | Calls about KYC submission, DigiLocker failure, KYC document upload route to a `KYC` category | pending-shadowing | — | — | — | — |
| `routing-technical` | Calls about app crashes, login issues, OTP failures, payment app integration route to a `technical` category | pending-shadowing | — | — | — | — |
| `routing-complaint` | Calls about service complaints, operator complaints, design complaints route to a `complaint` category | pending-shadowing | — | — | — | — |
| `routing-sub-category-claim-status-inquiry` | Sub-category under claim-related: status inquiry (caller asking "what's happening with my claim?") | pending-shadowing | — | — | — | — |
| `routing-sub-category-claim-document-submission` | Sub-category under claim-related: document submission (caller submitting death cert, medical records) | pending-shadowing | — | — | — | — |
| `routing-sub-category-claim-decision-appeal` | Sub-category under claim-related: decision appeal (caller appealing claim denial) | pending-shadowing | — | — | — | — |
| `routing-sub-category-contribution-utr-missing` | Sub-category under contribution-related: UTR missing / reconciliation issue | pending-shadowing | — | — | — | — |
| `routing-sub-category-kyc-digilocker-failure` | Sub-category under KYC: DigiLocker callback failure | pending-shadowing | — | — | — | — |
| `routing-category-completeness` | The 5 candidate categories (+ sub-categories) cover all observed call categories OR a new category is needed | pending-shadowing | — | — | — | — |

## §3 — SLA-target candidates × verdict matrix

**Authority:** epics line 3296 `24h first-response` + `5 biz-day resolution` + `10 biz-day resolution`

> **Default mapping (per cover-page trustee note 1, NOT a TWT commitment):**
> - `claim-related` / `contribution-related` / `KYC` → `5 biz-day resolution`
> - `technical` → `10 biz-day resolution`
> - `complaint` → `5 biz-day resolution`
> - All categories → `24h first-response`

| pattern_id | pattern (SLA target candidate) | verdict | shadowing_citation | proposed_revision | divergence_log_row_id | mid-engagement-revision |
|---|---|---|---|---|---|---|
| `sla-24h-first-response-all-categories` | 24-hour first-response SLA applies to all categories | pending-shadowing | — | — | — | — |
| `sla-5-day-claim-related-resolution` | 5 biz-day resolution SLA for claim-related calls | pending-shadowing | — | — | — | — |
| `sla-5-day-contribution-related-resolution` | 5 biz-day resolution SLA for contribution-related calls | pending-shadowing | — | — | — | — |
| `sla-5-day-kyc-resolution` | 5 biz-day resolution SLA for KYC calls | pending-shadowing | — | — | — | — |
| `sla-10-day-technical-resolution` | 10 biz-day resolution SLA for technical calls | pending-shadowing | — | — | — | — |
| `sla-5-day-complaint-resolution` | 5 biz-day resolution SLA for complaint calls | pending-shadowing | — | — | — | — |
| `sla-handling-time-actuals-match-targets` | Observed operator handling time + escalation-time-to-resolution actuals match the SLA target candidates | pending-shadowing | — | — | — | — |
| `sla-target-needs-per-sub-category-refinement` | SLA target needs per-sub-category refinement beyond category-level mapping | pending-shadowing | — | — | — | — |

## §4 — Helpline-call-to-ticket-workflow-step × verdict matrix

**Authority:** Story 10.3 helpline call-to-ticket workflow (SM-1 demo beat C3 — epics line 3304). The 5-step workflow is the framework default for evaluation.

> **5-step workflow (Story 10.3 default for evaluation):**
> 1. Member-lookup (UX-DR45 `<MemberLookupForm>`)
> 2. Category-selection (routing-policy category)
> 3. Body-capture (substantive issue captured)
> 4. Read-back confirmation (UX-DR46 `<ReadBackCard>`)
> 5. Submit → ticket created with `created_via: helpline_call` + `operator_attribution: <operator_id>`

| pattern_id | pattern (workflow step) | verdict | shadowing_citation | proposed_revision | divergence_log_row_id | mid-engagement-revision |
|---|---|---|---|---|---|---|
| `workflow-step-1-member-lookup` | Step 1 member-lookup is the first substantive workflow step after greeting + caller-consent | pending-shadowing | — | — | — | — |
| `workflow-step-2-category-selection` | Step 2 category-selection follows member-lookup | pending-shadowing | — | — | — | — |
| `workflow-step-3-body-capture` | Step 3 body-capture follows category-selection | pending-shadowing | — | — | — | — |
| `workflow-step-4-readback-confirmation` | Step 4 read-back confirmation follows body-capture | pending-shadowing | — | — | — | — |
| `workflow-step-5-submit` | Step 5 submit creates ticket with operator-attribution | pending-shadowing | — | — | — | — |
| `workflow-step-order-correct` | The 5-step order matches the observed operator workflow OR a different order is observed | pending-shadowing | — | — | — | — |
| `workflow-step-completeness` | The 5 steps cover the observed workflow OR additional steps are observed (e.g., supervisor-handover, member-history-review) | pending-shadowing | — | — | — | — |
| `workflow-step-removal` | One of the 5 steps is NOT observed (e.g., read-back-confirmation is skipped for simple calls) | pending-shadowing | — | — | — | — |

## §5 — Member-lookup-form pattern × verdict matrix

**Authority:** UX-DR45 `<MemberLookupForm>` 4-criteria search (UX spec line 2089)

> **4 criteria (UX-DR45 default):**
> 1. Name
> 2. Mobile
> 3. Aadhaar-masked
> 4. Pariwar-ID

| pattern_id | pattern (lookup criterion) | verdict | shadowing_citation | proposed_revision | divergence_log_row_id | mid-engagement-revision |
|---|---|---|---|---|---|---|
| `lookup-criterion-name` | Operator uses name as lookup criterion | pending-shadowing | — | — | — | — |
| `lookup-criterion-mobile` | Operator uses mobile as lookup criterion | pending-shadowing | — | — | — | — |
| `lookup-criterion-aadhaar-masked` | Operator uses Aadhaar-masked as lookup criterion | pending-shadowing | — | — | — | — |
| `lookup-criterion-pariwar-id` | Operator uses Pariwar-ID as lookup criterion | pending-shadowing | — | — | — | — |
| `lookup-criterion-completeness` | The 4 UX-DR45 criteria cover the observed lookup pattern OR additional criteria are observed (e.g., school name + district, member-class identifier) | pending-shadowing | — | — | — | — |
| `lookup-disambiguation-pattern` | When multiple matches surface, how does the operator disambiguate? (caller-confirms / additional criteria / supervisor-escalation) | pending-shadowing | — | — | — | — |
| `lookup-no-match-pattern` | When no match surfaces, how does the operator respond? (re-query / new-member-flow / escalation / informal-improvisation) | pending-shadowing | — | — | — | — |
| `lookup-scope-respecting` | Lookup respects scope (Pariwar-bound; does not cross Pariwar boundary unless member explicitly authorized) | pending-shadowing | — | — | — | — |

## §6 — Read-back-card pattern × verdict matrix

**Authority:** UX-DR46 `<ReadBackCard>` 3-field read-back (UX spec line 2089)

> **3 fields (UX-DR46 default):**
> 1. Member name
> 2. Member mobile (last 4 digits)
> 3. Member school/district

| pattern_id | pattern (read-back field) | verdict | shadowing_citation | proposed_revision | divergence_log_row_id | mid-engagement-revision |
|---|---|---|---|---|---|---|
| `readback-field-name` | Operator reads back member name | pending-shadowing | — | — | — | — |
| `readback-field-mobile-last4` | Operator reads back member mobile last 4 digits | pending-shadowing | — | — | — | — |
| `readback-field-school-district` | Operator reads back member school/district | pending-shadowing | — | — | — | — |
| `readback-field-completeness` | The 3 UX-DR46 fields cover the observed read-back pattern OR additional fields are observed (e.g., member-class, Pariwar-ID, last-event-date) | pending-shadowing | — | — | — | — |
| `readback-caller-verbal-confirmation` | Operator pauses for caller's verbal confirmation of each field OR all fields together | pending-shadowing | — | — | — | — |
| `readback-correction-pattern` | When caller corrects a read-back field, how does the operator respond? (in-place edit / supervisor-escalation / informal note) | pending-shadowing | — | — | — | — |
| `readback-skip-for-simple-calls` | Does the operator skip read-back for simple calls (e.g., status inquiry where member is already known)? | pending-shadowing | — | — | — | — |
| `readback-position-in-workflow` | Read-back occurs after body-capture (Story 10.3 step 4) OR at a different position | pending-shadowing | — | — | — | — |

## §7 — Operator-facing UX-DR55 precise-technical-register × verdict matrix

**Authority:** UX-DR55 Pattern 4 Dignified validation — Operator-facing precise technical wording permitted carve-out (epics line 449)

| pattern_id | pattern (UX-DR55 carve-out) | verdict | shadowing_citation | proposed_revision | divergence_log_row_id | mid-engagement-revision |
|---|---|---|---|---|---|---|
| `ux-dr55-operator-uses-precise-technical-terms` | Operator uses precise-technical terms (e.g., "claim ID", "reconciliation status", "UTR", "intake_pending") during operator-internal workflow steps | pending-shadowing | — | — | — | — |
| `ux-dr55-precise-technical-serves-workflow` | The precise-technical register serves operator workflow efficiency vs. imposes TWT-internal-jargon overhead | pending-shadowing | — | — | — | — |
| `ux-dr55-operator-translates-to-informal-for-caller` | Operator translates precise-technical terms to informal Hindi register when speaking to caller | pending-shadowing | — | — | — | — |
| `ux-dr55-jargon-overhead-evidence` | Evidence of operator confusion or workflow friction caused by TWT-internal-jargon | pending-shadowing | — | — | — | — |
| `ux-dr55-carve-out-justified` | The UX-DR55 operator-facing carve-out (permissive clause) is justified by observed operator workflow OR not justified (operator workflow works equally well with informal Hindi) | pending-shadowing | — | — | — | — |

## §8 — Intake-Console-pattern-(b) decision-strip × verdict matrix

**Authority:** UX spec line 1688 Intake-Console-pattern-(b) decision-strip (4 options)

> **4 decision-strip options (UX spec line 1688 default):**
> 1. `save-progress`
> 2. `finalize-intake`
> 3. `transfer-to-supervisor`
> 4. `suspend-call`

| pattern_id | pattern (decision-strip option) | verdict | shadowing_citation | proposed_revision | divergence_log_row_id | mid-engagement-revision |
|---|---|---|---|---|---|---|
| `decision-strip-save-progress` | Operator uses `save-progress` decision when interrupting intake mid-call to resume later | pending-shadowing | — | — | — | — |
| `decision-strip-finalize-intake` | Operator uses `finalize-intake` decision when intake is complete | pending-shadowing | — | — | — | — |
| `decision-strip-transfer-to-supervisor` | Operator uses `transfer-to-supervisor` decision when escalating non-standard scenarios | pending-shadowing | — | — | — | — |
| `decision-strip-suspend-call` | Operator uses `suspend-call` decision when pausing the call (e.g., caller needs to step away) | pending-shadowing | — | — | — | — |
| `decision-strip-option-completeness` | The 4 options cover the observed decision-points OR additional options are observed (e.g., `case-held-pending-document-receipt`, `transfer-to-peer-operator`) | pending-shadowing | — | — | — | — |
| `decision-strip-positioning` | The decision-strip is positioned where it serves operator workflow OR is awkward / hard to reach | pending-shadowing | — | — | — | — |
| `decision-strip-labeling` | The decision-strip labels are clear OR require operator-facing precise-technical jargon (UX-DR55 carve-out interaction) | pending-shadowing | — | — | — | — |

## §9 — Verifier-console-context-from-helpline × verdict matrix

**Authority:** Story 6.10 verifier console signals panel (epics line 2460); UX-DR39 `<VerificationConsoleShell>` ₹50L design budget

> **Cross-Story implication note:** the shadowing observes the operator's note-taking + escalation discipline; the inference to Anita's signals panel is shadowing-finding → cross-Story implication, captured at synthesis §8. The worksheet rows here capture the *observation evidence* for the cross-Story implication.

| pattern_id | pattern (verifier-console-context flow) | verdict | shadowing_citation | proposed_revision | divergence_log_row_id | mid-engagement-revision |
|---|---|---|---|---|---|---|
| `operator-call-notes-shape` | Operator's call-notes shape: structured fields (per Story 10.1 data model) vs free-text vs hybrid | pending-shadowing | — | — | — | — |
| `operator-supervisor-escalation-context` | Operator's supervisor-escalation context: what context does the operator carry into the escalation? | pending-shadowing | — | — | — | — |
| `operator-caller-disambiguation-signals` | Operator's caller-disambiguation signals: what signals does the operator capture about caller (Pariwar scope, member status)? | pending-shadowing | — | — | — | — |
| `verifier-console-input-informativeness` | Hypothesis: the operator's call-notes + supervisor-escalation-context + caller-disambiguation-signals would flow to Anita's signals panel as informative context vs. noise | pending-shadowing | — | — | — | — |
| `verifier-console-context-load-bearing-fields` | Which fields of operator-mediated case context are load-bearing for verifier-console signals vs. nice-to-have? | pending-shadowing | — | — | — | — |

## §10 — Synthesis cross-link

Operator-workflow-call-pattern observation worksheet rows feed:
- `_bmad-output/research/p0-2d-operator-shadowing.md` §4 operator-workflow-call-pattern observation worksheet evaluation (load-bearing AC surface)
- `_bmad-output/research/p0-2d-operator-shadowing.md` §6 Implications for Epic 10 (Stories 10.1 / 10.2 / 10.3 / 10.4)
- `_bmad-output/research/p0-2d-operator-shadowing.md` §7 Implications for Story 6.3 (helpline-mediated claim filing)
- `_bmad-output/research/p0-2d-operator-shadowing.md` §8 Implications for Story 6.10 (verifier console signals panel)
- `_bmad-output/research/p0-2d-operator-shadowing.md` §9 Cross-cutting findings (operator-caller register grammar)

## §11 — Revision-integration handoff per-Story routing

> **Divergence-log row obligation:** any verdict ∈ {`requires-revision-with-proposed-change`, `requires-deeper-redesign`} MUST have a corresponding row in `divergence-log.md`. Populate the `divergence_log_row_id` column in this worksheet immediately when recording such a verdict.

- §2 Routing-policy category verdicts ∈ {`requires-revision-with-proposed-change`, `requires-deeper-redesign`} → **Story 10.1 routing-policy registry category-set revision** + **Story 10.2 routing-policy registry revision** (if the revision requires a data-model change to the registry itself); routed through Story 10.1 Dev Notes (category/SLA-level changes) or Story 10.2 Dev Notes (registry-structure changes); severity `routing-policy-revision-required`
- §3 SLA-target verdicts ∈ {`requires-revision-with-proposed-change`, `requires-deeper-redesign`} → **Story 10.1 SLA-target revision**; routed through Story 10.1 Dev Notes; severity `sla-target-revision-required`
- §4 Helpline-call-to-ticket-workflow verdicts → **Story 10.3 helpline call-to-ticket workflow revision**; routed through Story 10.3 Dev Notes; severity `helpline-call-to-ticket-flow-revision-required`
- §5 Member-lookup-form verdicts → **UX-DR45 amendment**; routed through UX-edit workflow; severity `helpline-mediated-claim-filing-revision-required` (Story 6.3) OR `helpline-call-to-ticket-flow-revision-required` (Story 10.3) depending on affected Story
- §6 Read-back-card verdicts → **UX-DR46 amendment**; routed through UX-edit workflow; severity `helpline-mediated-claim-filing-revision-required` (Story 6.3)
- §7 UX-DR55 operator-facing carve-out verdicts → **UX-DR55 amendment**; routed through UX-edit workflow; severity `ux-dr55-operator-facing-register-revision-required`
- §8 Intake-Console-pattern-(b) decision-strip verdicts → **UX spec §10 amendment**; routed through UX-edit workflow; severity `intake-console-pattern-b-decision-strip-revision-required`
- §9 Verifier-console-context-from-helpline verdicts → **Story 6.10 verifier console signals panel revision**; routed through Story 6.10 Dev Notes; severity `verifier-console-context-from-helpline-revision-required`

Revisions are integrated into Story-level Dev Notes / PRD FR-52 / UX-DR45/46/55 / architecture §3.5/3.5a via the divergence-log + Task 11 reconciliation **before Epic 10 + Story 6.3 + Story 6.10 design freezes**.

## §12 — Per-row observation coverage acknowledgment

Any pattern marked `not-evaluated-due-to-host-helpline-context-mismatch` OR `not-evaluated-due-to-observation-coverage-gap` **MUST be re-evaluated at substitute-host-helpline engagement OR NFR-22 Phase-2 audit** per ethics-protocol §6 review-cadence fallback. The coverage-gap is the load-bearing input to substitute-host-helpline scope if needed.

**Per Story 0.10 P-17 precedent — `requires-deeper-redesign` minimum content:** when recording a `requires-deeper-redesign` verdict, the `divergence-log.md` `reconciliation_action_plan` field MUST contain at minimum: (a) which Story is affected, (b) what specifically must be re-thought (not just "redesign needed"), and (c) whether substitute-host-helpline engagement is needed to validate the redesign. This minimum content MUST be completed within 24 hours of the shift at which the `requires-deeper-redesign` verdict was recorded.

**`not-evaluated-due-to-host-helpline-context-mismatch` minimum content:** when recording this verdict, the `shadowing_citation` field MUST contain at minimum: (a) what operator behavior was expected / needed for evaluation, (b) what aspect of the host-helpline context made evaluation impossible (e.g., different lookup system, no Pariwar concept, different escalation protocol), and (c) whether substitute-host-helpline engagement or post-TWT-deployment shadowing is the correct re-evaluation path.
