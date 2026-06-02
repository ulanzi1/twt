# Assumption Inventory — P0-2d Operator Shadowing

> **Pre-states the PRD/UX/architecture operator-workflow + routing-policy + SLA + helpline-call-to-ticket assumptions that this shadowing work is designed to validate or refute.**
>
> Pre-stating the assumptions is the **only** way the divergence-log can detect divergence. Without pre-stated assumptions, the synthesis cannot distinguish between "lived data validated the assumption" vs "lived data implicitly diverged from the assumption."
>
> **Critical hypotheses tagged: 17 canonical** per Story 0.9 P-01 + Story 0.10 precedent. The critical hypotheses gate Epic 10 + Story 6.3 + Story 6.10 design freezes.
>
> At Task 4 author-commit, every row carries `validation_status = pending-shadowing`. Task 9 populates `validation_status` per assumption from lived shadowing data.

## Categorization

32 assumption rows across 8 categorizations:

- **Cat-1** — Routing-policy categories (Story 10.1; 6 rows, critical-tagged ×5)
- **Cat-2** — SLA targets (Story 10.1; 4 rows, critical-tagged ×2)
- **Cat-3** — Helpline-call-to-ticket workflow (Story 10.3; 4 rows, critical-tagged ×1)
- **Cat-4** — Member-lookup-form (UX-DR45; 4 rows, critical-tagged ×2)
- **Cat-5** — Read-back-card + operator-attribution + supervisor-escalation (UX-DR46 + Story 6.3; 4 rows, critical-tagged ×2)
- **Cat-6** — UX-DR55 operator-facing precise-technical register (epics line 449; 2 rows, critical-tagged ×1)
- **Cat-7** — Intake-Console-pattern-(b) decision-strip (UX spec line 1688; 3 rows, critical-tagged ×1)
- **Cat-8** — Verifier-console-context-from-helpline + two-actor design + operator-wishlist + operator-improvisation (Story 6.10 + UX spec line 1513; 5 rows, critical-tagged ×2)

**Critical hypotheses tagged (17 canonical):**

A-routing-claim-category-distinct + A-routing-contribution-category-distinct + A-routing-kyc-category-distinct + A-routing-technical-category-distinct + A-routing-complaint-category-distinct + A-sla-24h-first-response + A-sla-5-day-resolution + A-helpline-call-to-ticket-5-step-workflow + A-member-lookup-name-criterion + A-member-lookup-mobile-criterion + A-readback-3-field + A-operator-attribution-id + A-supervisor-escalation-on-non-standard + A-intake-console-4-strip-options + A-ux-dr55-operator-precise-technical + A-two-actor-design + A-operator-improvisation-around-process-gaps

## Validation-status enum

| Value | Meaning |
|---|---|
| `validated` | Lived shadowing data confirms the assumption |
| `refuted` | Lived data contradicts the assumption — divergence-log row required |
| `nuanced` | Assumption is partially right with qualifications — divergence-log row required |
| `not-evaluated-due-to-operator-non-engagement-in-debrief` | Operator declined evaluation at end-of-shift debrief; re-evaluated at substitute-shift or NFR-22 Phase-2 audit |
| `not-evaluated-due-to-host-helpline-context-mismatch` | Host helpline's context does not exercise this assumption in observable form; re-evaluated at substitute-host-helpline |
| `not-evaluated-due-to-observation-coverage-gap` | Assumption not observed during shadowing despite context match |
| `pending-shadowing` | Author-commit default; Task 9 populates post-shadowing |

---

## Assumption rows

| assumption_id | category | source (cite + line) | assumption_text | critical | validation_status | synthesis_citation | divergence_log_row | affected_epic_stories |
|---|---|---|---|---|---|---|---|---|
| `A-routing-claim-category-distinct` | Cat-1 | Story 10.1 line 3322 | Calls about claim filing / claim status / claim documents / claim decisions / claim appeals are distinguishably routed to a `claim-related` category by the operator | **yes** | pending-shadowing | pending | pending | Story 10.1 + Story 10.3 + Story 6.3 |
| `A-routing-contribution-category-distinct` | Cat-1 | Story 10.1 line 3322 | Calls about contribution payment / UTR / payment confirmation / contribution status are distinguishably routed to a `contribution-related` category | **yes** | pending-shadowing | pending | pending | Story 10.1 + Epic 8 + Epic 9 |
| `A-routing-kyc-category-distinct` | Cat-1 | Story 10.1 line 3322 | Calls about KYC submission / DigiLocker failure / KYC document upload are distinguishably routed to a `KYC` category | **yes** | pending-shadowing | pending | pending | Story 10.1 + Epic 3 Story 3.3a/3.3b |
| `A-routing-technical-category-distinct` | Cat-1 | Story 10.1 line 3322 | Calls about app crashes / login issues / OTP failures / payment app integration are distinguishably routed to a `technical` category | **yes** | pending-shadowing | pending | pending | Story 10.1 + Epic 1 platform |
| `A-routing-complaint-category-distinct` | Cat-1 | Story 10.1 line 3322 | Calls about service complaints / operator complaints / design complaints are distinguishably routed to a `complaint` category | **yes** | pending-shadowing | pending | pending | Story 10.1 + Story 6.16 appeals |
| `A-routing-sub-category-granularity` | Cat-1 | Story 10.1 implicit | Sub-categories within each top-level category emerge in observed call distribution (e.g., claim-related → claim-status-inquiry vs claim-document-submission) | no | pending-shadowing | pending | pending | Story 10.1 |
| `A-sla-24h-first-response` | Cat-2 | epics line 3296 | 24-hour first-response SLA is achievable AND meaningful across all categories per observed operator handling-time | **yes** | pending-shadowing | pending | pending | Story 10.1 + Story 10.4 |
| `A-sla-5-day-resolution` | Cat-2 | epics line 3296 | 5 biz-day resolution SLA matches observed operator-actuals for claim-related + contribution-related + KYC + complaint categories | **yes** | pending-shadowing | pending | pending | Story 10.1 + Story 10.4 |
| `A-sla-10-day-resolution-technical` | Cat-2 | epics line 3296 | 10 biz-day resolution SLA matches observed operator-actuals for technical category | no | pending-shadowing | pending | pending | Story 10.1 + Story 10.4 |
| `A-sla-per-sub-category-not-needed` | Cat-2 | Story 10.1 implicit | Per-sub-category SLA refinement is NOT needed (category-level SLA targets are sufficient) | no | pending-shadowing | pending | pending | Story 10.1 |
| `A-helpline-call-to-ticket-5-step-workflow` | Cat-3 | Story 10.3 + SM-1 demo beat C3 | The 5-step workflow (member-lookup → category-selection → body-capture → read-back-confirmation → submit) matches observed operator workflow | **yes** | pending-shadowing | pending | pending | Story 10.3 + Story 6.3 |
| `A-helpline-call-to-ticket-step-order` | Cat-3 | Story 10.3 | The 5-step order is correct (no step-reordering observed across shifts) | no | pending-shadowing | pending | pending | Story 10.3 |
| `A-helpline-call-to-ticket-operator-attribution-header` | Cat-3 | Story 10.3 | Member-visible "We filed this for you — Operator [Name]" header carries operator-attribution to the caller as a trust signal | no | pending-shadowing | pending | pending | Story 10.3 |
| `A-helpline-call-to-ticket-created-via-helpline-call-flag` | Cat-3 | Story 10.3 | `created_via: helpline_call` flag is meaningful for downstream ticket processing (vs. self-filed tickets) | no | pending-shadowing | pending | pending | Story 10.3 + Story 10.4 |
| `A-member-lookup-name-criterion` | Cat-4 | UX spec line 2089 | Name is a load-bearing lookup criterion (operator uses name in observed lookups) | **yes** | pending-shadowing | pending | pending | UX-DR45 + Story 6.3 + Story 10.3 |
| `A-member-lookup-mobile-criterion` | Cat-4 | UX spec line 2089 | Mobile is a load-bearing lookup criterion (operator uses mobile in observed lookups) | **yes** | pending-shadowing | pending | pending | UX-DR45 + Story 6.3 + Story 10.3 |
| `A-member-lookup-aadhaar-masked-criterion` | Cat-4 | UX spec line 2089 | Aadhaar-masked is a load-bearing lookup criterion (operator uses Aadhaar-masked in observed lookups) | no | pending-shadowing | pending | pending | UX-DR45 + Story 6.3 + Story 10.3 |
| `A-member-lookup-pariwar-id-criterion` | Cat-4 | UX spec line 2089 | Pariwar-ID is a load-bearing lookup criterion (operator uses Pariwar-ID in observed lookups) | no | pending-shadowing | pending | pending | UX-DR45 + Story 6.3 + Story 10.3 |
| `A-readback-3-field` | Cat-5 | UX spec line 2089 | 3-field read-back (name + mobile last 4 digits + school/district) matches observed operator read-back pattern | **yes** | pending-shadowing | pending | pending | UX-DR46 + Story 6.3 + Story 10.3 |
| `A-readback-caller-verbal-confirmation` | Cat-5 | UX spec line 2089 | Caller's verbal confirmation of each field (or all fields together) is the standard read-back acceptance pattern | no | pending-shadowing | pending | pending | UX-DR46 + Story 6.3 |
| `A-operator-attribution-id` | Cat-5 | Story 10.3 + Story 6.3 | `operator_attribution: <operator_id>` is the data-model way to attribute operator-filed work to the named operator | **yes** | pending-shadowing | pending | pending | Story 10.3 + Story 6.3 + architecture §3.5 |
| `A-supervisor-escalation-on-non-standard` | Cat-5 | Story 6.3 line 2326-2328 | Operator encounters non-standard scenario → escalates to supervisor; case held with `intake_pending` matches observed escalation pattern | **yes** | pending-shadowing | pending | pending | Story 6.3 + Story 10.3 |
| `A-ux-dr55-operator-precise-technical` | Cat-6 | epics line 449 | UX-DR55 operator-facing precise-technical-wording permitted carve-out serves operator workflow efficiency (the permissive clause is justified) | **yes** | pending-shadowing | pending | pending | UX-DR55 + Story 10.3 + Story 6.3 |
| `A-ux-dr55-translation-discipline` | Cat-6 | epics line 449 | Operator translates precise-technical terms to informal Hindi when speaking to caller (the carve-out is operator-internal only) | no | pending-shadowing | pending | pending | UX-DR55 + Story 10.3 |
| `A-intake-console-4-strip-options` | Cat-7 | UX spec line 1688 | The 4 decision-strip options (`save-progress` + `finalize-intake` + `transfer-to-supervisor` + `suspend-call`) match observed operator decision-points | **yes** | pending-shadowing | pending | pending | UX spec §10 Intake-Console-pattern-(b) + Story 10.3 |
| `A-intake-console-decision-strip-positioning` | Cat-7 | UX spec line 1688 | The decision-strip positioning serves operator workflow (reachable, clear, contextually-placed) | no | pending-shadowing | pending | pending | UX spec §10 + Story 10.3 |
| `A-intake-console-decision-strip-labeling` | Cat-7 | UX spec line 1688 | The decision-strip labels are clear without operator-facing precise-technical jargon | no | pending-shadowing | pending | pending | UX spec §10 + UX-DR55 interaction |
| `A-verifier-console-context-from-helpline` | Cat-8 | Story 6.10 line 2460 | Operator's call-notes + supervisor-escalation-context + caller-disambiguation-signals flow into Anita's signals panel as informative context vs. noise | no | pending-shadowing | pending | pending | Story 6.10 + architecture §3.5 + AR-65 |
| `A-two-actor-design` | Cat-8 | UX spec line 1513 | The two-actor design discipline (caller's voice + operator's screen) is validated against observed operator workflow — the operator-facing console behaves as the second actor of a two-actor system | **yes** | pending-shadowing | pending | pending | Story 6.3 + Story 10.3 + UX-DR45 + UX-DR46 |
| `A-operator-wishlist-tooling-gaps` | Cat-8 | epics line 880 | Operators voluntarily mention tooling-wishes during shadowing (the operator-wishlist dimension is populable) | no | pending-shadowing | pending | pending | Story 10.1 + Story 10.3 + Story 10.4 + cross-cutting |
| `A-operator-improvisation-around-process-gaps` | Cat-8 | epics line 880 | Operators improvise around process gaps in observable patterns (the operator-improvisation dimension is populable) | **yes** | pending-shadowing | pending | pending | Story 10.1 + Story 10.3 + Story 10.4 + cross-cutting |
| `A-operator-caller-register-grammar` | Cat-8 | implicit per AC | Cross-cutting operator-caller register grammar (call-opening salutation + closing patterns + pacing under emotional caller load) is observable + categorizable across calls | no | pending-shadowing | pending | pending | UX-DR55 + Pattern 4 cross-link to Story 0.9 |

## Reconciliation routing summary

- **`validated`** assumptions → no divergence-log row; synthesis row notes "validated per `Operator-1 shift-N call-X §dimension-Y`"
- **`refuted` / `nuanced`** assumptions → divergence-log row required; severity classification applied per affected Story:
  - Cat-1 (routing-policy categories) → `routing-policy-revision-required` → Story 10.1
  - Cat-2 (SLA targets) → `sla-target-revision-required` → Story 10.1
  - Cat-3 (helpline-call-to-ticket workflow) → `helpline-call-to-ticket-flow-revision-required` → Story 10.3
  - Cat-4 (member-lookup-form) + Cat-5 (read-back-card) → `helpline-mediated-claim-filing-revision-required` → Story 6.3 OR Story 10.3 depending on affected surface
  - Cat-6 (UX-DR55) → `ux-dr55-operator-facing-register-revision-required` → UX-DR55 amendment
  - Cat-7 (Intake-Console-pattern-(b)) → `intake-console-pattern-b-decision-strip-revision-required` → UX spec §10 amendment
  - Cat-8 (verifier-console-context-from-helpline + cross-cutting) → `verifier-console-context-from-helpline-revision-required` → Story 6.10
- **`not-evaluated-due-to-operator-non-engagement-in-debrief` / `not-evaluated-due-to-host-helpline-context-mismatch` / `not-evaluated-due-to-observation-coverage-gap`** → recorded in synthesis §5 + re-evaluated at substitute-host-helpline OR NFR-22 Phase-2 audit per Story 0.10 P-08 precedent

## Arithmetic check (per Story 0.9 P-09 + Story 0.10 precedent)

- **Total assumption rows: 32**
- **Critical-tagged: 17 (canonical)**
- **Per-category breakdown:**
  - Cat-1 = 6 (routing-policy categories) — 5 critical-tagged
  - Cat-2 = 4 (SLA targets) — 2 critical-tagged (A-sla-24h-first-response + A-sla-5-day-resolution)
  - Cat-3 = 4 (helpline-call-to-ticket workflow) — 1 critical-tagged (A-helpline-call-to-ticket-5-step-workflow)
  - Cat-4 = 4 (member-lookup-form) — 2 critical-tagged (A-member-lookup-name-criterion + A-member-lookup-mobile-criterion)
  - Cat-5 = 4 (read-back-card + operator-attribution + supervisor-escalation) — 3 critical-tagged (A-readback-3-field + A-operator-attribution-id + A-supervisor-escalation-on-non-standard)
  - Cat-6 = 2 (UX-DR55 operator-facing precise-technical register) — 1 critical-tagged (A-ux-dr55-operator-precise-technical)
  - Cat-7 = 3 (Intake-Console-pattern-(b) decision-strip) — 1 critical-tagged (A-intake-console-4-strip-options)
  - Cat-8 = 5 (verifier-console-context-from-helpline + two-actor + wishlist + improvisation + register) — 2 critical-tagged (A-two-actor-design + A-operator-improvisation-around-process-gaps)
- **Sum:** 6 + 4 + 4 + 4 + 4 + 2 + 3 + 5 = **32** ✓
- **Critical-tagged sum:** 5 + 2 + 1 + 2 + 3 + 1 + 1 + 2 = **17** *(discrepancy from 16 canonical: re-checking Cat-5 — A-readback-3-field + A-operator-attribution-id + A-supervisor-escalation-on-non-standard = 3 critical-tagged is correct; Cat-8 — A-two-actor-design + A-operator-improvisation-around-process-gaps = 2 critical-tagged is correct; revised canonical list = 16 corresponds to the AC-named canonical list above (A-routing-x5 + A-sla-x2 + A-helpline-call-to-ticket-5-step + A-member-lookup-name + A-member-lookup-mobile + A-readback-3-field + A-operator-attribution-id + A-supervisor-escalation + A-intake-console-4-strip + A-ux-dr55-operator-precise-technical + A-two-actor-design = 5+2+1+1+1+1+1+1+1+1+1 = 16). A-operator-improvisation-around-process-gaps was tagged critical=yes in the table at row 31; the canonical-16 list at line 24 omits it. Either: (a) add A-operator-improvisation-around-process-gaps to canonical list (total 17 canonical) OR (b) demote A-operator-improvisation-around-process-gaps in table to critical=no. Adopting (a): canonical critical count = 17, including A-operator-improvisation-around-process-gaps. Synthesis §5 should use 17 canonical.)*

> **Note (arithmetic resolution applied):** Canonical critical hypotheses list = **17** including A-operator-improvisation-around-process-gaps. The Story 0.11 AC at line 27 named 15+ critical hypotheses; this inventory satisfies the ≥15 threshold with 17.
