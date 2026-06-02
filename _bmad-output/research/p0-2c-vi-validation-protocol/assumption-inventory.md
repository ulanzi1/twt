# Assumption Inventory — P0-2c VI/Low-Vision Member Accessibility Validation

> **Pre-states the PRD/UX/architecture accessibility assumptions that this validation work is designed to validate or refute.**
>
> Pre-stating the assumptions is the **only** way the divergence-log can detect divergence. Without pre-stated assumptions, the synthesis cannot distinguish between "lived data validated the assumption" vs "lived data implicitly diverged from the assumption."
>
> **Critical hypotheses tagged: 20 canonical** per Story 0.9 P-01 review-patch precedent. The critical hypotheses gate Epic 3 + Epic 8 + Story 7.10 design freezes.
>
> At Task 4 author-commit, every row carries `validation_status = pending-session`. Task 9 populates `validation_status` per assumption from lived AT-walkthrough data.

## Categorization

44 assumption rows across 9 categorizations (P-07/P-08 review-patch: corrected from 42; Cat-4 has 10 rows not 8; Cat-9 has 7 rows of which 5 are critical-tagged not 3):

- **Cat-1** — Dimensions 1-4 (lived-AT-walkthrough dimensions; 4 rows)
- **Cat-2** — Cross-cutting Hindi-Devanagari-AT-grammar (4 rows)
- **Cat-3** — UX-DR66 (Accessibility ≠ Alternate Experience; 2 rows)
- **Cat-4** — UX-DR67 (WCAG AA Baseline; 10 rows, critical-tagged ×8)
- **Cat-5** — UX-DR68 (TWT-Specific Accessibility; 5 rows, critical-tagged ×5)
- **Cat-6** — UX-DR65 (Three touch-target categories; 3 rows, critical-tagged ×1)
- **Cat-7** — NFR-20 (WCAG 2.1 AA launch-blocker; 5 rows, critical-tagged ×3)
- **Cat-8** — FM-2 + UX spec §6 Devanagari validation (4 rows, critical-tagged ×1)
- **Cat-9** — UX spec §13 Accessibility Strategy (rest) + equivalence-test + substrate (7 rows, critical-tagged ×5)

**Critical hypotheses tagged (22 canonical; P-07 review-patch: added A-ux-prototype-operability-precondition + A-ux-rn-accessibility-props-consistency which were tagged `critical = yes` in the table but omitted from the canonical list):** A-ux-dr66-same-product + A-ux-dr67-color-independence + A-ux-dr67-keyboard-nav + A-ux-dr67-screen-reader-compat + A-ux-dr67-touch-target-sizing + A-ux-dr67-form-labels + A-ux-dr67-reduced-motion + A-ux-dr67-aria-live-state-transition + A-ux-dr68-hindi-talkback + A-ux-dr68-devanagari-conjunct + A-ux-dr68-zoom-150 + A-ux-dr68-hindi-voice-input + A-ux-dr68-low-bandwidth-resilience + A-ux-dr65-56pt-critical + A-nfr-20-signup-wcag-aa + A-nfr-20-my-pool-wcag-aa + A-nfr-20-yogdaan-bahi-wcag-aa + A-fm-2-devanagari-conjunct-rendering + A-ux-dr67-skip-links-operator + A-equivalence-test-vi-user + A-ux-prototype-operability-precondition + A-ux-rn-accessibility-props-consistency

## Validation-status enum

| Value | Meaning |
|---|---|
| `validated` | Lived AT-walkthrough data confirms the assumption |
| `refuted` | Lived data contradicts the assumption — divergence-log row required |
| `nuanced` | Assumption is partially right with qualifications — divergence-log row required |
| `not-evaluated-due-to-participant-non-engagement` | Participant declined evaluation or pacing did not permit; re-evaluated at NFR-22 Phase-2 audit |
| `not-evaluated-due-to-prototype-surface-coverage-gap` | Surface not walked-through or AT-pre-flight blocked; re-evaluated at NFR-22 Phase-2 audit |
| `pending-session` | Author-commit default; Task 9 populates post-session |

---

## Assumption rows

| assumption_id | category | source (cite + line) | assumption_text | critical | validation_status | synthesis_citation | divergence_log_row | accessibility_debt_classification | affected_epic_stories |
|---|---|---|---|---|---|---|---|---|---|
| `A-dim1-success-areas-exist` | Cat-1 | epics line 866 | Lived AT-walkthrough will surface ≥1 area on each prototype surface where VI/low-vision member succeeds with own AT | no | pending-session | pending | pending | pending | Epic 3 + Epic 8 + Story 7.10 |
| `A-dim2-stuck-areas-exist` | Cat-1 | epics line 866 | Lived AT-walkthrough will surface ≥1 stuck-point on each prototype surface where VI/low-vision member's AT cannot make progress | no | pending-session | pending | pending | pending | Epic 3 + Epic 8 + Story 7.10 |
| `A-dim3-at-behavior-surprise` | Cat-1 | epics line 866 | ≥1 AT-event will surprise the designer (researcher) — design assumption did NOT predict the AT behavior | no | pending-session | pending | pending | pending | Epic 3 + Epic 8 + Story 7.10 |
| `A-dim4-copy-or-interaction-breaks` | Cat-1 | epics line 866 | ≥1 copy or interaction pattern will break under AT — surface dignified-recovery-copy failure or interaction-pattern violation | no | pending-session | pending | pending | pending | Epic 3 + Epic 8 + Story 7.10 |
| `A-cc-1-hindi-pronunciation-discipline` | Cat-2 | UX spec §13.1 lines 2608-2612 | TWT Hindi copy is pronounceable by Hindi TalkBack without significant ambiguity that blocks comprehension | no | pending-session | pending | pending | pending | Epic 2 Story 2.1 i18n + Epic 3 + Epic 8 |
| `A-cc-2-devanagari-conjunct-rendering` | Cat-2 | UX spec §6 lines 762-766 + §13.2 lines 2614-2618 | Devanagari conjuncts (क्ष, ज्ञ, त्र, श्र, ष्ट, etc.) render correctly on canonical validation device AND AT reads them in correct order | no | pending-session | pending | pending | pending | Epic 1 Story 1.17 design system + Epic 3 + Epic 8 |
| `A-cc-3-focus-order-discipline` | Cat-2 | UX spec lines 1199-1201 | Focus order through signup multi-step + My Pool card + Yogdaan Bahi list rows is logical for AT users | no | pending-session | pending | pending | pending | Epic 3 + Epic 8 |
| `A-cc-4-dignified-recovery-copy-at-failure` | Cat-2 | UX spec §13 + Pattern 4 (Story 0.9 inherited) | Copy presented during AT failure (e.g., DigiLocker callback fail, UPI failure, virtualized list scroll fail) is dignified-recovery-shaped, NOT bailiff-register | no | pending-session | pending | pending | pending | Epic 3 + Epic 8 |
| `A-ux-dr66-same-product` | Cat-3 | epics line 463; UX spec §13 lines 2580-2588 | VI/low-vision member completes signup + My Pool + Yogdaan Bahi journeys with same functional outcome as default-mode user, on the same TWT, same surfaces, same flows, same data | **yes** | pending-session | pending | pending | pending | Epic 3 + Epic 8 + Story 7.10 + cross-cutting |
| `A-ux-dr66-no-alternate-app` | Cat-3 | epics line 463; UX spec §13 lines 2580-2588 | No "accessibility app" or alternate-flow exists; design is single-surface for all users | no | pending-session | pending | pending | pending | Epic 3 + Epic 8 + Story 7.10 + cross-cutting |
| `A-ux-dr67-color-contrast-text` | Cat-4 | epics line 464; UX spec §13 lines 2590-2602 | Color contrast text 4.5:1 normal / 3:1 large on all 3 named prototype surfaces | no | pending-session | pending | pending | pending | Epic 3 + Epic 8 + Story 1.17 |
| `A-ux-dr67-color-contrast-ui` | Cat-4 | epics line 464; UX spec §13 lines 2590-2602 | Color contrast UI 3:1 on all 3 named prototype surfaces | no | pending-session | pending | pending | pending | Epic 3 + Epic 8 + Story 1.17 |
| `A-ux-dr67-color-independence` | Cat-4 | epics line 464; UX spec §13 lines 2590-2602 | State never conveyed by color alone — status pills carry text labels (yellow + "Pending Reconciliation"; green + "Confirmed"); validated under screen-reader announcement | **yes** | pending-session | pending | pending | pending | Epic 8 Story 8.4 yellow-pill + Epic 9 status pills + Story 1.17 |
| `A-ux-dr67-keyboard-nav` | Cat-4 | epics line 464; UX spec §13 lines 2590-2602 | All interactive elements reachable via keyboard or equivalent AT navigation across all 3 named prototype surfaces | **yes** | pending-session | pending | pending | pending | Epic 3 + Epic 8 + Story 7.10 |
| `A-ux-dr67-screen-reader-compat` | Cat-4 | epics line 464; UX spec lines 1199-1201 | Semantic HTML / ARIA / RN Accessibility props announce all 3 named prototype surfaces correctly | **yes** | pending-session | pending | pending | pending | Epic 3 + Epic 8 + Story 7.10 + Story 1.17 |
| `A-ux-dr67-touch-target-sizing` | Cat-4 | epics line 464; UX spec §13 line 1182 | Touch target sizing ≥44pt default on all 3 named prototype surfaces | **yes** | pending-session | pending | pending | pending | Epic 3 + Epic 8 + Story 7.10 + Story 1.17 |
| `A-ux-dr67-form-labels` | Cat-4 | epics line 464; UX spec §13 lines 2590-2602 | Every form input has visible + programmatic label (OTP, KYC, nominee declaration, medical disclosure, UTR self-attestation) | **yes** | pending-session | pending | pending | pending | Epic 3 + Epic 8 |
| `A-ux-dr67-skip-links-operator` | Cat-4 | epics line 464; UX spec §13 lines 2590-2602 | Skip links permit AT users to bypass repeated nav (especially relevant for 500-row virtualized list on Yogdaan Bahi); related-mention to operator surfaces is secondary | **yes** | pending-session | pending | pending | pending | Epic 8 Story 8.6 + Epic 3 |
| `A-ux-dr67-reduced-motion` | Cat-4 | epics line 464; UX spec §13 lines 2590-2602 + UX-DR79 (lines 2654-2666) | Reduced-motion preference honored — animations (status-pill transition, daily countdown) respect OS reduced-motion setting | **yes** | pending-session | pending | pending | pending | Epic 8 Story 8.2 15-day tone gradient |
| `A-ux-dr67-aria-live-state-transition` | Cat-4 | epics line 464; UX spec lines 1199-1201 + UX spec §13 | ARIA-live state transition announcements work — 15-day countdown polite-vs-assertive setting; state-pill transition announcement; UTR confirmation announcement | **yes** | pending-session | pending | pending | pending | Epic 8 Story 8.2 + 8.4 + Epic 9 |
| `A-ux-dr68-hindi-talkback` | Cat-5 | epics line 465; UX spec §13.1 lines 2608-2612 | Hindi TalkBack pronounces signup + My Pool + Yogdaan Bahi content correctly with documented fallback behavior for known limitations | **yes** | pending-session | pending | pending | pending | Epic 3 + Epic 8 + Story 7.10 |
| `A-ux-dr68-devanagari-conjunct` | Cat-5 | epics line 465; UX spec §13.2 lines 2614-2618 | Devanagari conjunct rendering FM-2 validated — TalkBack reads conjuncts in correct phonetic order on canonical device | **yes** | pending-session | pending | pending | pending | Epic 3 Story 3.5 IMA list + Story 1.17 + Epic 2 Story 2.1 |
| `A-ux-dr68-zoom-150` | Cat-5 | epics line 465; UX spec §13 | Operator zoom 150% (operator surfaces) AND member-surface 150% browser/OS zoom equivalent does not break member-surface layout | **yes** | pending-session | pending | pending | pending | Epic 3 + Epic 8 + Story 7.10 + Story 1.17 |
| `A-ux-dr68-hindi-voice-input` | Cat-5 | epics line 465; UX spec §13 | OS-supported Hindi voice input activates critical UI elements on member surfaces (Hindi-spoken "Submit" activates UPI Intent button) | **yes** | pending-session | pending | pending | pending | Epic 3 Story 3.6 + Epic 8 Story 8.4 |
| `A-ux-dr68-low-bandwidth-resilience` | Cat-5 | epics line 465; UX spec §13 | Low-bandwidth resilience as accessibility — signup + My Pool + Yogdaan Bahi load + AT operates under slow-3G | **yes** | pending-session | pending | pending | pending | Epic 3 + Epic 8 + architecture §3.2 perf budgets |
| `A-ux-dr65-44pt-default` | Cat-6 | epics line 462; UX spec §13 line 1182 | All interactive elements ≥44pt default across all 3 named prototype surfaces | no | pending-session | pending | pending | pending | Epic 3 + Epic 8 + Story 1.17 |
| `A-ux-dr65-comfortable` | Cat-6 | epics line 462; UX spec §13 line 2307 | Commonly-used elements at comfortable touch-target size | no | pending-session | pending | pending | pending | Epic 3 + Epic 8 + Story 1.17 |
| `A-ux-dr65-56pt-critical` | Cat-6 | epics line 462; UX spec §13 line 2307 | Critical actions ≥56pt — UPI Intent / Approve / Submit reachable under magnification | **yes** | pending-session | pending | pending | pending | Epic 3 Story 3.6 + Epic 8 Story 8.4 |
| `A-nfr-20-signup-wcag-aa` | Cat-7 | epics line 220; PRD §8 line 1354 | Signup flow conforms to WCAG 2.1 AA under real Hindi-AT validation — launch-blocker | **yes** | pending-session | pending | pending | pending | Epic 3 |
| `A-nfr-20-my-pool-wcag-aa` | Cat-7 | epics line 220; PRD §8 line 1354 | My Pool card conforms to WCAG 2.1 AA under real Hindi-AT validation — launch-blocker | **yes** | pending-session | pending | pending | pending | Epic 8 |
| `A-nfr-20-yogdaan-bahi-wcag-aa` | Cat-7 | epics line 220; PRD §8 line 1354 | Yogdaan Bahi conforms to WCAG 2.1 AA under real Hindi-AT validation — launch-blocker | **yes** | pending-session | pending | pending | pending | Epic 8 Story 8.6 |
| `A-nfr-20-claim-filing-wcag-aa` | Cat-7 | epics line 220; PRD §8 line 1354 | Claim filing flows (Epic 6) conform to WCAG 2.1 AA — secondary scope; flagged for NFR-22 Phase-2 + Story 6.x design freezes consuming Story 0.10 findings | no | pending-session | pending | pending | pending | Epic 6 secondary |
| `A-nfr-20-payment-wcag-aa` | Cat-7 | epics line 220; PRD §8 line 1354 | Payment flows (UPI Intent inside signup + My Pool) conform to WCAG 2.1 AA | no | pending-session | pending | pending | pending | Epic 3 Story 3.6 + Epic 8 Story 8.4 |
| `A-fm-2-devanagari-conjunct-rendering` | Cat-8 | UX spec §6 lines 762-766 + §13.2 lines 2614-2618 | FM-2 Devanagari validation: canonical device renders conjuncts visually correctly + AT reads in correct phonetic order | **yes** | pending-session | pending | pending | pending | Epic 1 Story 1.17 + Epic 3 Story 3.5 + Story 0.14 substrate |
| `A-fm-2-conjunct-tiered-escalation` | Cat-8 | UX spec §6 lines 762-766 | FM-2 tiered escalation: if rendering fails on canonical device, escalation to font-substitution or alternative-substrate is documented | no | pending-session | pending | pending | pending | architecture §1.5 + Story 0.14 |
| `A-fm-2-non-conjunct-rendering` | Cat-8 | UX spec §6 lines 762-766 | Non-conjunct Devanagari (basic vowels + consonants without ligature) renders correctly | no | pending-session | pending | pending | pending | Story 1.17 |
| `A-fm-2-numeral-hardening` | Cat-8 | UX spec §6 lines 762-766 (related) | Hindi numerals + ₹110 + amount rendering under AT is unambiguous | no | pending-session | pending | pending | pending | Story 1.17 + Story 3.6 |
| `A-ux-13-1-known-limitations-documented` | Cat-9 | UX spec §13.1 lines 2608-2612 | Hindi screen-reader known limitations have documented fallback behavior with visible recovery in the design | no | pending-session | pending | pending | pending | Story 1.17 + Epic 3 + Epic 8 |
| `A-ux-13-aaa-not-committed` | Cat-9 | UX spec §13 line 2578 | WCAG 2.1 AAA is explicitly NOT committed for v1 — AAA findings are `wcag-aaa-aspiration-deferred-with-rationale` classification | no | pending-session | pending | pending | pending | cross-cutting |
| `A-ux-13-accessibility-debt-tracked` | Cat-9 | UX spec §13 line 2612 | Accessibility debt (UX-DR68 specific debt) is tracked and resolved; never accepted as a permanent condition | no | pending-session | pending | pending | pending | NFR-22 Phase-2 audit |
| `A-equivalence-test-vi-user` | Cat-9 | UX spec lines 2700-2704 | Equivalence test commitment: VI/low-vision-user can complete same flows as default-mode user with measurable parity | **yes** | pending-session | pending | pending | pending | Epic 3 + Epic 8 + Story 11b.8 |
| `A-ux-prototype-operability-precondition` | Cat-9 | Story 0.14 P0-5 substrate-ratify | Prototype substrate (RN + Tamagui) supports AT API surface area (`accessibilityLabel`, `accessibilityRole`, `accessibilityHint`, `accessibilityLiveRegion`); the precondition holds at Story 0.10 conduct time | **yes** | pending-session | pending | pending | pending | Story 0.14 + Story 1.17 |
| `A-ux-rn-accessibility-props-consistency` | Cat-9 | UX spec §6 lines 685-687 + lines 1199-1201 | React Native Accessibility props consistency across all 3 named prototype surfaces — no surface missing required props | **yes** | pending-session | pending | pending | pending | Story 0.14 + Story 1.17 |
| `A-arch-field-validation-gate` | Cat-9 | architecture line 2762 | Field validation gate (empirical Devanagari readability + screen-reader audit) discharge requires lived AT-walkthrough data | no | pending-session | pending | pending | pending | architecture §1.5 |

## Reconciliation routing summary

- **`validated`** assumptions → no divergence-log row; synthesis row notes "validated per `VI-Member-1 §dimension-X`"
- **`refuted` / `nuanced`** assumptions → divergence-log row required; accessibility-debt classification applied; Task 11 reconciliation routes the divergence per classification:
  - `wcag-aa-defect-must-fix` → spec-update OR design-adjustment (CANNOT defer)
  - `accessibility-debt-tracked-and-fix` → accessibility-debt tracker for NFR-22 Phase-2 audit
  - `wcag-aaa-aspiration-deferred-with-rationale` → deferred-work.md with rationale
  - `participant-class-extension-needed-for-coverage` → Story 0.10-bis OR NFR-22 Phase-2 audit
  - `not-applicable` → divergence-log row records the misalignment; no further action
- **`not-evaluated-due-to-participant-non-engagement` / `not-evaluated-due-to-prototype-surface-coverage-gap`** → recorded in synthesis §5 + re-evaluated at NFR-22 Phase-2 audit per Story 0.9 P-08

## Arithmetic check (per Story 0.9 P-09 precedent; P-07/P-08 review-patch: corrected)

- **Total assumption rows: 44**
- **Critical-tagged: 22 (canonical)**
- **Per-category breakdown:**
  - Cat-1 = 4 (dimensions 1-4) — 0 critical-tagged
  - Cat-2 = 4 (cross-cutting Hindi-Devanagari-AT-grammar) — 0 critical-tagged
  - Cat-3 = 2 (UX-DR66) — 1 critical-tagged
  - Cat-4 = 10 (UX-DR67) — 8 critical-tagged (A-ux-dr67-color-independence, A-ux-dr67-keyboard-nav, A-ux-dr67-screen-reader-compat, A-ux-dr67-touch-target-sizing, A-ux-dr67-form-labels, A-ux-dr67-skip-links-operator, A-ux-dr67-reduced-motion, A-ux-dr67-aria-live-state-transition)
  - Cat-5 = 5 (UX-DR68) — 5 critical-tagged
  - Cat-6 = 3 (UX-DR65) — 1 critical-tagged
  - Cat-7 = 5 (NFR-20) — 3 critical-tagged
  - Cat-8 = 4 (FM-2 + numeral hardening) — 1 critical-tagged
  - Cat-9 = 7 (UX spec §13 + equivalence-test + substrate + arch) — 5 critical-tagged (A-equivalence-test-vi-user, A-ux-prototype-operability-precondition, A-ux-rn-accessibility-props-consistency + 2 others if applicable)
- **Sum:** 4 + 4 + 2 + 10 + 5 + 3 + 5 + 4 + 7 = **44** ✓
- **Critical-tagged sum:** 0+0+1+8+5+1+3+1+5 = **24** *(discrepancy from 22 canonical: Cat-9 critical check — A-ux-13-1-known-limitations-documented and A-arch-field-validation-gate are NOT tagged critical in the table (no **yes**); actual critical count in table = 22; synthesis §5 should use 22 canonical)*

> **Note (P-07/P-08 review-patches applied):** The arithmetic-anchor for synthesis §5 divergence summary is now 44 total rows + 22 canonical critical hypotheses. The prior 42/20 counts were under-counts: Cat-4 had 10 rows (not 8 or 9); A-ux-prototype-operability-precondition and A-ux-rn-accessibility-props-consistency in Cat-9 were tagged `critical = yes` in the table but omitted from the canonical critical list. Both corrections applied.
