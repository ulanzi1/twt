# UX-DR Clause-Evaluation Worksheet — P0-2c VI/Low-Vision Member Accessibility Validation

> **This is the AC's load-bearing UX-DR clause-evaluation surface** — distinct from Story 0.8's mental-model-validation surface and Story 0.9's Pattern 4 evaluation surface. The worksheet is the **capture instrument** for the per-clause verdict (the `question-bank.md` §6 is the *prompting instrument*; this worksheet is the *capture instrument*).
>
> **At Task 4 author-commit:** all rows pre-staged with `participant_verdict = pending-session-conduct`. Task 9 populates verdicts post-session.

## Cover-page trustee note (per Story 0.9 P-03 precedent)

**Pre-identified clause-text gaps / ambiguities flagged for trustee awareness:**

1. **UX-DR68 sub-clause #5 (OS-supported Hindi voice input)** — UX spec §13.2 commits "OS-supported Hindi voice input" but does NOT specify which OS versions (Android 10+? Android 12+? iOS 14+?). If participant's OS version cannot support Hindi voice input, the clause is `not-evaluated-due-to-prototype-surface-coverage-gap` (NOT a `wcag-aa-defect-must-fix`).
2. **UX-DR68 sub-clause #3 (Operator zoom 150%)** — applicable to operator surfaces, NOT member surfaces. For Story 0.10's 3 member-facing surfaces (signup / My Pool / Yogdaan Bahi), this clause is `not-applicable` unless the participant uses zoom on member surfaces. Adjacent: the related WCAG 2.1 AA zoom commitment for member surfaces is captured under UX-DR67 (color contrast UI 3:1 + reflow at 320 CSS px / equivalent on RN).
3. **UX-DR68 sub-clause #4 (Field-worker outdoor)** — applicable to field-worker surfaces, NOT member surfaces. For Story 0.10's 3 member-facing surfaces, this clause is `not-applicable`.
4. **UX-DR68 sub-clause #7 (AAA-not-committed-for-v1)** — UX spec line 2578 explicit non-commitment. Any AAA-level finding is `wcag-aaa-aspiration-deferred-with-rationale` classification.

## Cover-page cell-count reference (P-06 review-patch)

**Total verdict-eligible cells: 64** (post D-02 review-patch; previously 62). Breakdown: UX-DR66 (3 cells: 1 clause × 3 surfaces) + UX-DR67 (27 cells: 9 sub-clauses × 3 surfaces, including 3 reduced-motion per-surface rows moved from §6 cross-cutting) + UX-DR68 (18 cells: 6 sub-clauses × 3 surfaces; 6 `not-applicable` cells for operator-zoom and field-worker pre-set per P-05) + UX-DR65 (9 cells: 3 categories × 3 surfaces) + cross-cutting §6 (7 rows: per-element, NOT per-surface) = **3 + 27 + 18 + 9 + 7 = 64**. The 7 cross-cutting rows are per-element (not per-surface) — they are rows, not cells, but are included in the 64 count for consistency with synthesis-schema §4.6 arithmetic.

## Cover-page coverage-gap acknowledgment (per Story 0.9 P-08 precedent)

**Clauses marked `not-evaluated-due-to-prototype-surface-coverage-gap` MUST be re-evaluated at NFR-22 Phase-2 pre-launch accessibility audit** per ethics-protocol §6 review-cadence fallback. The coverage-gap is the load-bearing input to the Phase-2 audit scope.

## §1 — Authority cites

- **UX-DR65** (epics line 462; UX spec §13 lines 1182 + 2307) — Three touch-target categories: minimum 44pt / comfortable / critical ≥56pt
- **UX-DR66** (epics line 463; UX spec §13 lines 2580-2588) — Accessibility ≠ Alternate Experience principle
- **UX-DR67** (epics line 464; UX spec §13 lines 2590-2602) — WCAG AA Baseline (9-row table)
- **UX-DR68** (epics line 465; UX spec §13 lines 2604-2634) — TWT-Specific Accessibility Considerations
- **NFR-20** (epics line 220; PRD §8 line 1354) — WCAG 2.1 AA launch-blocker for member-app primary flows
- **NFR-22** (epics line 222) — Pre-launch accessibility audit gates Phase 2
- **FM-2** (UX spec §6 lines 762-766 + §13.2 lines 2614-2618) — Devanagari rendering validation

## Verdict enum

| Value | Meaning |
|---|---|
| `lands-as-intended` | Clause is validated against lived AT-walkthrough; design does what the clause commits |
| `requires-revision-with-proposed-clause` | Clause is partially right; specific revision proposed (Hindi+English) routed to Task 11 reconciliation |
| `requires-deeper-redesign` | Clause is structurally wrong; design must be re-thought, not just clause-edited |
| `not-evaluated-due-to-participant-non-engagement` | Participant declined this clause's opt-in OR conversation pacing constraint did not permit (voluntary/pacing only — NOT distress) |
| `not-evaluated-due-to-participant-emotional-state` | Participant showed distress or frustration during walkthrough; researcher invoked ethics-protocol §3.9 distress-pause; clause evaluation stopped for participant wellbeing (P-26/P-27 review-patch: distinct from voluntary non-engagement — causal information preserved for NFR-22 Phase-2 audit) |
| `not-evaluated-due-to-prototype-surface-coverage-gap` | Surface not walked-through OR AT-pre-flight blocked this surface; re-evaluated at NFR-22 Phase-2 audit |
| `pending-session-conduct` | Author-commit default; Task 9 populates post-session |

## Accessibility-debt classification enum

| Value | Meaning |
|---|---|
| `wcag-aa-defect-must-fix` | NFR-20 launch-blocker; CANNOT defer to NFR-22 Phase-2 audit; MUST reconcile via spec-update or design-adjustment |
| `accessibility-debt-tracked-and-fix` | UX-DR68 debt; must close before NFR-22 Phase-2 audit; UX spec line 2612: "Accessibility debt is tracked and resolved; it is never accepted as a permanent condition" |
| `wcag-aaa-aspiration-deferred-with-rationale` | UX spec line 2578 explicit non-commitment; deferral permitted with rationale citing UX spec §13 |
| `participant-class-extension-needed-for-coverage` | Requires second VI/low-vision participant with different AT modality OR different disability type to validate; deferred to Story 0.10-bis or NFR-22 Phase-2 audit |
| `not-applicable` | Clause is outside scope for the surface (e.g., operator zoom on member surface) |
| `pending` | Author-commit default; Task 9 populates post-session |

## Mid-session revision discipline (per Story 0.9 P-20 precedent)

Each clause row carries an optional `mid-session-revision` sub-field. If a participant's verdict on a clause changes during the session (e.g., initial `lands-as-intended` revised to `requires-revision-with-proposed-clause` after a later walkthrough surface failure), researcher records:
- **Original verdict:** [first verdict captured]
- **Revised verdict:** [later verdict captured]
- **Context note:** [what triggered the revision]

The latest revised verdict is authoritative; the original is preserved for synthesis context.

---

## §2 — UX-DR66 per-clause × per-surface matrix

**UX-DR66 verbatim from epics line 463:** "**Accessibility ≠ Alternate Experience** — accessible mode and default mode must remain functionally equivalent; the spec never produces two apps."

UX-DR66 has effectively one load-bearing principle clause that applies to all surfaces.

| clause_id | clause text | surface | participant_verdict | accessibility_debt_classification | participant_observation_paraphrased | proposed_revision | divergence_log_row_id | mid-session-revision |
|---|---|---|---|---|---|---|---|---|
| `ux-dr66-same-product-principle-signup` | Same product principle: VI/low-vision member experiences signup with same functional outcome as default-mode user | signup | pending-session-conduct | pending | — | — | — | — |
| `ux-dr66-same-product-principle-my-pool` | Same product principle applied to My Pool card | my-pool | pending-session-conduct | pending | — | — | — | — |
| `ux-dr66-same-product-principle-yogdaan-bahi` | Same product principle applied to Yogdaan Bahi | yogdaan-bahi | pending-session-conduct | pending | — | — | — | — |

## §3 — UX-DR67 per-sub-clause × per-surface matrix (9 sub-clauses × 3 surfaces = 27 cells)

**UX-DR67 verbatim from epics line 464 + UX spec §13 lines 2590-2602:** WCAG 2.1 AA Baseline — 9 evaluable sub-clauses across 3 surfaces. (UX spec lists 9 rows; "reduced motion honored" was previously captured as a single cross-cutting row cc-8 in §6, but D-02 review-patch splits it into 3 per-surface rows here because RN surfaces use `AccessibilityInfo.isReduceMotionEnabled()` while Astro/web surfaces use `prefers-reduced-motion` CSS media query — per-surface behavior diverges at the framework level. P-24 review-patch: this explains the 9→8→9 sub-clause count: originally 9 spec rows, moved 1 to cross-cutting §6 as cc-8, then D-02 moved it back here as 3 per-surface rows.)

UX-DR67 sub-clauses:
1. Color contrast text 4.5:1 (normal) / 3:1 (large)
2. Color contrast UI 3:1
3. Color independence (state never conveyed by color alone)
4. Keyboard navigation (all interactive elements reachable via keyboard)
5. Screen reader compatibility (semantic HTML / ARIA / RN Accessibility props)
6. Touch target sizing (≥44pt minimum)
7. Form labels (every input has visible + programmatic label)
8. Skip links (keyboard users can bypass repeated nav)
9. Reduced motion honored (RN: `AccessibilityInfo.isReduceMotionEnabled()`; web/Astro: `prefers-reduced-motion` CSS media query) — per-surface because RN and web implementations diverge

| clause_id | clause text | surface | participant_verdict | accessibility_debt_classification | participant_observation_paraphrased | proposed_revision | divergence_log_row_id | mid-session-revision |
|---|---|---|---|---|---|---|---|---|
| `ux-dr67-color-contrast-text-signup` | Color contrast text 4.5:1 normal / 3:1 large | signup | pending-session-conduct | pending | — | — | — | — |
| `ux-dr67-color-contrast-text-my-pool` | Color contrast text 4.5:1 normal / 3:1 large | my-pool | pending-session-conduct | pending | — | — | — | — |
| `ux-dr67-color-contrast-text-yogdaan-bahi` | Color contrast text 4.5:1 normal / 3:1 large | yogdaan-bahi | pending-session-conduct | pending | — | — | — | — |
| `ux-dr67-color-contrast-ui-signup` | Color contrast UI 3:1 | signup | pending-session-conduct | pending | — | — | — | — |
| `ux-dr67-color-contrast-ui-my-pool` | Color contrast UI 3:1 | my-pool | pending-session-conduct | pending | — | — | — | — |
| `ux-dr67-color-contrast-ui-yogdaan-bahi` | Color contrast UI 3:1 | yogdaan-bahi | pending-session-conduct | pending | — | — | — | — |
| `ux-dr67-color-independence-signup` | State never conveyed by color alone (status pill carries text label) | signup | pending-session-conduct | pending | — | — | — | — |
| `ux-dr67-color-independence-my-pool` | State never conveyed by color alone (yellow / green pill + text label) | my-pool | pending-session-conduct | pending | — | — | — | — |
| `ux-dr67-color-independence-yogdaan-bahi` | State never conveyed by color alone (Yogdaan Bahi list row state pills + text labels) | yogdaan-bahi | pending-session-conduct | pending | — | — | — | — |
| `ux-dr67-keyboard-navigation-signup` | All interactive elements reachable via keyboard / equivalent AT navigation | signup | pending-session-conduct | pending | — | — | — | — |
| `ux-dr67-keyboard-navigation-my-pool` | All interactive elements reachable via keyboard / equivalent AT navigation | my-pool | pending-session-conduct | pending | — | — | — | — |
| `ux-dr67-keyboard-navigation-yogdaan-bahi` | All interactive elements reachable via keyboard / equivalent AT navigation | yogdaan-bahi | pending-session-conduct | pending | — | — | — | — |
| `ux-dr67-screen-reader-compat-signup` | Semantic HTML / ARIA / RN Accessibility props announce signup screen correctly | signup | pending-session-conduct | pending | — | — | — | — |
| `ux-dr67-screen-reader-compat-my-pool` | Semantic HTML / ARIA / RN Accessibility props announce My Pool card correctly | my-pool | pending-session-conduct | pending | — | — | — | — |
| `ux-dr67-screen-reader-compat-yogdaan-bahi` | Semantic HTML / ARIA / RN Accessibility props announce Yogdaan Bahi correctly | yogdaan-bahi | pending-session-conduct | pending | — | — | — | — |
| `ux-dr67-touch-target-44pt-signup` | Touch target sizing ≥44pt default | signup | pending-session-conduct | pending | — | — | — | — |
| `ux-dr67-touch-target-44pt-my-pool` | Touch target sizing ≥44pt default | my-pool | pending-session-conduct | pending | — | — | — | — |
| `ux-dr67-touch-target-44pt-yogdaan-bahi` | Touch target sizing ≥44pt default | yogdaan-bahi | pending-session-conduct | pending | — | — | — | — |
| `ux-dr67-form-labels-signup` | Every form input has visible + programmatic label (OTP entry, KYC step inputs, nominee declaration inputs, medical disclosure inputs) | signup | pending-session-conduct | pending | — | — | — | — |
| `ux-dr67-form-labels-my-pool` | Every form input has visible + programmatic label (UTR self-attestation input) | my-pool | pending-session-conduct | pending | — | — | — | — |
| `ux-dr67-form-labels-yogdaan-bahi` | Every form input has visible + programmatic label (filter / search inputs if present) | yogdaan-bahi | pending-session-conduct | pending | — | — | — | — |
| `ux-dr67-skip-links-signup` | Skip links permit AT users to bypass repeated nav | signup | pending-session-conduct | pending | — | — | — | — |
| `ux-dr67-skip-links-my-pool` | Skip links permit AT users to bypass repeated nav | my-pool | pending-session-conduct | pending | — | — | — | — |
| `ux-dr67-skip-links-yogdaan-bahi` | Skip links permit AT users to bypass repeated nav (especially relevant for 500-row virtualized list) | yogdaan-bahi | pending-session-conduct | pending | — | — | — | — |
| `ux-dr67-reduced-motion-signup` | Reduced motion honored on signup (RN: `AccessibilityInfo.isReduceMotionEnabled()`) | signup | pending-session-conduct | pending | — | — | — | — |
| `ux-dr67-reduced-motion-my-pool` | Reduced motion honored on My Pool card (RN: `AccessibilityInfo.isReduceMotionEnabled()`) | my-pool | pending-session-conduct | pending | — | — | — | — |
| `ux-dr67-reduced-motion-yogdaan-bahi` | Reduced motion honored on Yogdaan Bahi (web/Astro: `prefers-reduced-motion` CSS media query) | yogdaan-bahi | pending-session-conduct | pending | — | — | — | — |

## §4 — UX-DR68 per-sub-clause × per-surface matrix (6 sub-clauses × 3 surfaces = 18 cells)

**UX-DR68 verbatim from epics line 465 + UX spec §13 lines 2604-2634:** TWT-Specific Accessibility Considerations — 6 evaluable sub-clauses. (UX spec lists 7 items but #7 — "AAA-not-committed-for-v1" — is non-commitment, not a verdict-eligible clause; flagged at cover-page §1.)

UX-DR68 sub-clauses:
1. Hindi screen-reader compatibility (TalkBack Hindi pronunciation)
2. Devanagari conjunct rendering (FM-2 validation)
3. Operator zoom 150% (operator surfaces; member-surface applicability flagged at cover-page)
4. Field-worker outdoor high-contrast + offline-tolerant (field-worker surfaces; member-surface applicability flagged)
5. OS-supported Hindi voice input
6. Low-bandwidth resilience as accessibility (slow-3G simulation)

| clause_id | clause text | surface | participant_verdict | accessibility_debt_classification | participant_observation_paraphrased | proposed_revision | divergence_log_row_id | mid-session-revision |
|---|---|---|---|---|---|---|---|---|
| `ux-dr68-hindi-talkback-signup` | Hindi TalkBack pronounces signup screen content correctly | signup | pending-session-conduct | pending | — | — | — | — |
| `ux-dr68-hindi-talkback-my-pool` | Hindi TalkBack pronounces My Pool card content correctly | my-pool | pending-session-conduct | pending | — | — | — | — |
| `ux-dr68-hindi-talkback-yogdaan-bahi` | Hindi TalkBack pronounces Yogdaan Bahi list rows correctly | yogdaan-bahi | pending-session-conduct | pending | — | — | — | — |
| `ux-dr68-devanagari-conjunct-signup` | FM-2 Devanagari conjunct rendering on signup (IMA list, nominee names, medical disclosure copy) | signup | pending-session-conduct | pending | — | — | — | — |
| `ux-dr68-devanagari-conjunct-my-pool` | FM-2 Devanagari conjunct rendering on My Pool card (pariwar name, status pill, copy) | my-pool | pending-session-conduct | pending | — | — | — | — |
| `ux-dr68-devanagari-conjunct-yogdaan-bahi` | FM-2 Devanagari conjunct rendering on Yogdaan Bahi list rows | yogdaan-bahi | pending-session-conduct | pending | — | — | — | — |
| `ux-dr68-operator-zoom-150-signup` | Operator zoom 150% — not-applicable for member surfaces per cover-page note; member-surface zoom is captured under UX-DR67 reflow clause (P-05 review-patch) | signup | not-applicable | not-applicable | — | — | — | — |
| `ux-dr68-operator-zoom-150-my-pool` | Operator zoom 150% — not-applicable for member surfaces | my-pool | not-applicable | not-applicable | — | — | — | — |
| `ux-dr68-operator-zoom-150-yogdaan-bahi` | Operator zoom 150% — not-applicable for member surfaces | yogdaan-bahi | not-applicable | not-applicable | — | — | — | — |
| `ux-dr68-field-worker-outdoor-signup` | Field-worker outdoor — not-applicable for member surfaces per cover-page note (P-05 review-patch) | signup | not-applicable | not-applicable | — | — | — | — |
| `ux-dr68-field-worker-outdoor-my-pool` | Field-worker outdoor — not-applicable for member surfaces | my-pool | not-applicable | not-applicable | — | — | — | — |
| `ux-dr68-field-worker-outdoor-yogdaan-bahi` | Field-worker outdoor — not-applicable for member surfaces | yogdaan-bahi | not-applicable | not-applicable | — | — | — | — |
| `ux-dr68-hindi-voice-input-signup` | OS-supported Hindi voice input activates signup critical controls | signup | pending-session-conduct | pending | — | — | — | — |
| `ux-dr68-hindi-voice-input-my-pool` | OS-supported Hindi voice input activates UPI button on My Pool | my-pool | pending-session-conduct | pending | — | — | — | — |
| `ux-dr68-hindi-voice-input-yogdaan-bahi` | OS-supported Hindi voice input activates Yogdaan Bahi list filtering / drilling | yogdaan-bahi | pending-session-conduct | pending | — | — | — | — |
| `ux-dr68-low-bandwidth-signup` | Low-bandwidth resilience as accessibility — signup loads + AT operates under slow-3G | signup | pending-session-conduct | pending | — | — | — | — |
| `ux-dr68-low-bandwidth-my-pool` | Low-bandwidth resilience — My Pool card loads + AT operates under slow-3G | my-pool | pending-session-conduct | pending | — | — | — | — |
| `ux-dr68-low-bandwidth-yogdaan-bahi` | Low-bandwidth resilience — Yogdaan Bahi virtualized list loads + AT operates under slow-3G | yogdaan-bahi | pending-session-conduct | pending | — | — | — | — |

## §5 — UX-DR65 per-touch-target-category × per-surface matrix (3 categories × 3 surfaces = 9 cells)

**UX-DR65 verbatim from epics line 462; UX spec §13 lines 1182 + 2307:** Three touch-target categories — minimum 44pt default / comfortable / critical ≥56pt (UPI Intent / Approve / Submit).

UX-DR65 sub-categories:
1. Minimum 44pt default (all interactive elements)
2. Comfortable (commonly-used elements; framework leaves comfortable-size value open per UX spec)
3. Critical ≥56pt (UPI Intent / Approve / Submit / equivalent decisive actions)

| clause_id | clause text | surface | participant_verdict | accessibility_debt_classification | participant_observation_paraphrased | proposed_revision | divergence_log_row_id | mid-session-revision |
|---|---|---|---|---|---|---|---|---|
| `ux-dr65-44pt-default-signup` | All signup interactive elements ≥44pt | signup | pending-session-conduct | pending | — | — | — | — |
| `ux-dr65-44pt-default-my-pool` | All My Pool interactive elements ≥44pt | my-pool | pending-session-conduct | pending | — | — | — | — |
| `ux-dr65-44pt-default-yogdaan-bahi` | All Yogdaan Bahi interactive elements ≥44pt (especially virtualized-list row controls) | yogdaan-bahi | pending-session-conduct | pending | — | — | — | — |
| `ux-dr65-comfortable-signup` | Commonly-used signup elements at comfortable size | signup | pending-session-conduct | pending | — | — | — | — |
| `ux-dr65-comfortable-my-pool` | Commonly-used My Pool elements at comfortable size | my-pool | pending-session-conduct | pending | — | — | — | — |
| `ux-dr65-comfortable-yogdaan-bahi` | Commonly-used Yogdaan Bahi elements at comfortable size | yogdaan-bahi | pending-session-conduct | pending | — | — | — | — |
| `ux-dr65-critical-56pt-signup` | Critical signup actions ≥56pt (₹110 Vyawastha Shulk UPI Intent button) | signup | pending-session-conduct | pending | — | — | — | — |
| `ux-dr65-critical-56pt-my-pool` | Critical My Pool actions ≥56pt (UPI Intent button on My Pool card) | my-pool | pending-session-conduct | pending | — | — | — | — |
| `ux-dr65-critical-56pt-yogdaan-bahi` | Critical Yogdaan Bahi actions ≥56pt (if any decisive action — Call Helpline CTA mirror if present) | yogdaan-bahi | pending-session-conduct | pending | — | — | — | — |

## §6 — Cross-cutting accessibility-grammar verdict (7 rows)

Cross-cutting elements that span all 3 surfaces; per-element verdict NOT per-surface. (D-02 review-patch: reduced-motion was previously `cc-8` here; moved to §3 as 3 per-surface UX-DR67 rows because RN and web/Astro implementations diverge — total worksheet count updated to 64.)

| element_id | element | participant_verdict | accessibility_debt_classification | participant_observation_paraphrased | proposed_revision | divergence_log_row_id | mid-session-revision |
|---|---|---|---|---|---|---|---|
| `cc-1-hindi-talkback-pronunciation` | Hindi TalkBack pronunciation discipline (cross-surface) | pending-session-conduct | pending | — | — | — | — |
| `cc-2-devanagari-conjunct-rendering-quality` | Devanagari conjunct rendering quality (cross-surface; FM-2) | pending-session-conduct | pending | — | — | — | — |
| `cc-3-focus-order-discipline` | Focus-order discipline (cross-surface) | pending-session-conduct | pending | — | — | — | — |
| `cc-4-dignified-recovery-copy-under-at-failure` | Dignified-recovery copy under AT failure (cross-surface) | pending-session-conduct | pending | — | — | — | — |
| `cc-5-status-pill-color-independence` | Status-pill color-independence verification (cross-surface; relates to UX-DR67 sub-clause but inspected as cross-cutting grammar) | pending-session-conduct | pending | — | — | — | — |
| `cc-6-56pt-critical-touch-target-magnification` | ≥56pt critical-touch-target reachability under magnification (cross-surface) | pending-session-conduct | pending | — | — | — | — |
| `cc-7-voice-control-activation-reliability` | Voice-control activation reliability (cross-surface) | pending-session-conduct | pending | — | — | — | — |

## §7 — Synthesis cross-link

UX-DR clause-evaluation worksheet rows feed:
- `_bmad-output/research/p0-2c-vi-validation.md` §4 UX-DR clause evaluation (load-bearing AC surface)
- `_bmad-output/research/p0-2c-vi-validation.md` §9 Cross-cutting accessibility-grammar findings

## §8 — Revision-integration handoff

> **P-09/P-32 review-patch — divergence-log row obligation reminder:** any verdict ∈ {`requires-revision-with-proposed-clause`, `requires-deeper-redesign`} MUST have a corresponding row in `divergence-log.md`. Populate the `divergence_log_row_id` column in this worksheet immediately when recording such a verdict. Failure to create the divergence-log row while recording a revision-required verdict is **forbidden state #3** per `divergence-log.md` §Forbidden states.

> **P-23 review-patch — AT-behavior observation withdrawal cascade:** if a participant exercises granular withdrawal of an AT-behavior observation post-synthesis (ethics-protocol §5 variant 5), any worksheet row whose `participant_observation_paraphrased` or `evidence_notes` was grounded solely in that withdrawn observation must be flagged `evidential-basis-withdrawn` in the `mid-session-revision` column. The verdict itself is preserved (it is a researcher judgment, not participant data), but the evidentiary basis is marked as withdrawn for trustee review.

> **P-17 cross-ref — `requires-deeper-redesign` minimum content:** when recording a `requires-deeper-redesign` verdict, the `divergence-log.md` `reconciliation_action_plan` field MUST contain at minimum: (a) which Epic/Story is affected, (b) what specifically must be re-thought (not just "redesign needed"), and (c) whether a participant-class extension is needed to validate the redesign.

- Any verdict ∈ {`requires-revision-with-proposed-clause`, `requires-deeper-redesign`} triggers a **divergence-log row** + **Task 11 reconciliation** to:
  - UX-DR66/67/68 epics update (epics lines 463-465)
  - UX spec §13 update
  routed through the UX-edit + epics-edit workflows BEFORE Epic 3 + Epic 8 + Story 7.10 design freezes.
- Any verdict with `accessibility_debt_classification = wcag-aa-defect-must-fix` is **launch-blocker per NFR-20** and gates Epic 3 + Epic 8 substrate work absolutely. CANNOT defer to NFR-22 Phase-2 audit.
- Any verdict with `accessibility_debt_classification = accessibility-debt-tracked-and-fix` is recorded in the **accessibility-debt tracker** for NFR-22 Phase-2 audit closure (epics line 222) — UX spec line 2612: "Accessibility debt is tracked and resolved; it is never accepted as a permanent condition."

## §9 — Per-surface coverage-gap acknowledgment

Any clause marked `not-evaluated-due-to-prototype-surface-coverage-gap` **MUST be re-evaluated at NFR-22 Phase-2 pre-launch accessibility audit** per Story 0.9 P-08 review-patch precedent. The coverage-gap is the load-bearing input to the Phase-2 audit scope per epics line 222 + Story 11b.8 dependency citation at epics lines 3918-3919.
