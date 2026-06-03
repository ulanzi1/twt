# Pass-Criteria-Evaluation Framework — P0-5 Native-Stack Validation

**Status:** Author-committed; the framework is operational from day one as a *commitment record*; substantive verdict aggregation lands at Task 11.

**Authority cites:** UX spec line 814 (all-must-hold discipline); UX spec line 816 (P1 FM-2 validation gate); UX spec lines 712-714 (Devanagari typography stack); UX spec line 1129 (per-role per-device fallback ladder); [[feedback_closure_language_precision]] (more-protective-governs disposition); `experiment-protocol.md` §6; `measurement-template.md` §3; `ratify-decision-template.md` §1; `pivot-evaluation-decision-tree.md`; Decision 2026-06-02-014.

## §1 All-must-hold discipline

Per UX spec line 814 verbatim: **"Pass criteria — all must hold"**.

The verdict aggregation rule is: ratify decision requires **all 54 cells** = `pass` OR `mitigated-pass` with per-mitigation-evidence. Any single cell with `pass_fail_verdict = fail` (after FM-2 tiered escalation exhausts mitigation) triggers pivot decision per `pivot-evaluation-decision-tree.md`.

The all-must-hold discipline applies at the **per-cell** level — not at the per-criterion-aggregate level. Specifically:

- If P1 Devanagari renders correctly on 8 of 9 cells (3 devices × 3 patterns) and fails on 1 cell, P1 is **NOT** "8/9 = 89% pass"; instead P1 has 1 `fail` cell that triggers FM-2 escalation per F1 path.
- If P5 list-performance measures 60 fps on the mid-range Android + 45 fps on the iPhone + 28 fps on the entry-level Android, the entry-level Android cell is `fail` on P5 (sub-30-fps minimum); the **load-bearing** P5 cell is the entry-level Android per UX spec line 824; the cell verdict is NOT averaged across devices.

The all-must-hold discipline is the load-bearing constraint that prevents quiet acceptance of partial failure as ratify-worthy.

## §2 More-protective-governs disposition

Per [[feedback_closure_language_precision]] — distinguish "Closed by [edit]" (artifact produced) from "Resolved via explicit deferral" (gap intentional, rationale recorded) from "Not addressed". For measurement evaluation, the more-protective-governs disposition is applied as follows:

**Any single P-criterion `fail` verdict on any device triggers FM-2 evaluation** per `pivot-evaluation-decision-tree.md`. Rounding up sub-threshold measurements to escape evaluation is **forbidden**.

**Worked examples:**

- A 28-fps measured value on the older entry-level Android device on P5 is **NOT** rounded to "30 fps minimum" — the cell is `fail` and the pivot-evaluation-decision-tree F-criterion fires. The rationale: a 28-fps user experience is materially worse than a 30-fps user experience; the threshold is a hard floor, not an aspirational midpoint.
- A 93% push delivery rate on P3 is **NOT** rounded to "≥95% delivery success" — the cell is `fail` and F3 evaluation fires. The rationale: a 7-out-of-100 push notification miss rate is materially worse than a 5-out-of-100 miss rate; the threshold is a hard floor.
- A 5.5-second p95 push latency is **NOT** "≈5 seconds" — the cell is `fail` on P3 and F3 evaluation fires. The rationale: the ≤5s threshold is the UX spec's explicit user-experience promise; a 10% threshold violation is a threshold violation.
- A Devanagari ligature that renders "mostly correctly" with one mis-rendered conjunct in one pattern is `fail` on P1 — the cell is `fail` and F1 evaluation fires per UX spec line 816 + UX spec line 1129 (per-role per-device fallback ladder); FM-2 escalation activates per UX spec line 762.

**Anti-pattern (forbidden):**

- Solo BigDev disposition "the 28 fps is close enough; mark pass" → **violates more-protective-governs**; structural violation per `experiment-protocol.md` §6.5
- Solo BigDev disposition "93% delivery rate averaged across devices is acceptable" → **violates all-must-hold + more-protective-governs**; structural violation per UX spec line 814 + this §2

## §3 Verdict aggregation rule

The 54-cell matrix collapses to a ratify-or-pivot decision per the following rules:

| Aggregate state | Decision outcome | Action at Task 11 |
|---|---|---|
| All 54 cells = `pass` | **ratify** | Substrate-binding-language for Epic 1 = "Expo + React Native + Tamagui is the v1 native member-app substrate per Decision 2026-06-02-014"; ADR-NNNN-native-mobile-stack-ratify substantive content authored per architecture §Implementation Handoff PR-2 |
| Cells include `pass` + `mitigated-pass` (with per-mitigation-evidence); no `fail` | **mitigated-then-ratify** | Substrate-binding-language as above, with `ratify-decision-template.md` §4 FM-2 escalation trace documenting the per-mitigation-evidence cycle |
| Any cell = `fail` after FM-2 tiered escalation exhausts mitigation | **pivot** | Substrate-binding-language reflects the pivot path per `pivot-evaluation-decision-tree.md` F1-F5; ADR-NNNN-native-mobile-stack-ratify substantive content cites pivot-substrate + FM-2 escalation trace |
| Any cell = `pending-measurement` literal at ratify-decision time | **structural violation** | Per §6 silent-pass forbidden rule; ratify-decision cannot be proposed until all 54 cells are populated |
| Cells include `not-applicable-iOS-OS-level-different` (P2 iPhone carve-out per `experiment-protocol.md` §5.3 + §6.2) | counted as **non-blocking-pass** for aggregation | These cells do not block ratify; the substantive Android P2 measurement is the load-bearing surface per UX spec line 818; the iPhone P2 cell carries documented rationale |

**Mixed verdict examples:**

- 51 cells `pass` + 3 cells `mitigated-pass` (with per-mitigation-evidence) + 0 cells `fail` + 0 cells `pending-measurement` → **mitigated-then-ratify** outcome
- 51 cells `pass` + 3 cells `not-applicable-iOS-OS-level-different` + 0 cells `fail` → **ratify** outcome (51 + 3-non-blocking = effectively 54 of 54 in aggregation)
- 53 cells `pass` + 1 cell `fail` (post-mitigation, mitigation exhausted) → **pivot** outcome

## §4 Per-criterion judgment latitude

Different criteria require different evaluation methodologies. Per UX spec line 816 (P1 visual inspection) + UX spec line 818 (P2 user-perceptible quality) + UX spec line 820 (P3 quantitative) + UX spec line 822 (P4 functional) + UX spec line 824 (P5 quantitative) + UX spec line 826 (P6 timebox-observation):

| Criterion | Evaluation methodology | Judgment latitude scope |
|---|---|---|
| P1 Devanagari | Visual inspection by BigDev + ≥1 Hindi-belt reader | Hindi-belt reader can flag "rendered correctly" OR "rendered incorrectly with specific issue X"; BigDev cannot override Hindi-belt reader judgment without documented rationale in `mitigation_notes_if_fail` |
| P2 UPI Intent | User-perceptible quality threshold (3 UPI apps × 3 patterns) | Per-scenario pass/fail: launch clean = pass on launch; return-handoff drops session = fail on return-handoff; UTR paste fails = fail on paste; per-UPI-app verdict aggregates per Android device |
| P3 Push notifications | Quantitative threshold (≥95% delivery rate + p95 ≤5s) | No latitude — quantitative thresholds applied per more-protective-governs disposition (§2); 94.5% = fail; 5.1s = fail |
| P4 Offline cache | Functional pass/fail (read-only access + pull-to-refresh) | No latitude — functional test passes or fails per scenario; ≥3 airplane-mode cycles per device × pattern required per `experiment-protocol.md` §6.4 |
| P5 List performance | Quantitative threshold (60 fps target / 30 fps minimum) | No latitude per more-protective-governs; 28 fps = fail; 29.5 fps = fail; 30 fps minimum is the hard floor |
| P6 Timebox observation | Solo Builder timebox tracker over ~2-week period | Latitude: per-day blocking-event log + cumulative-blocking-time threshold; ≥3-day blocking time within ~2-week timebox = fail per `experiment-protocol.md` §6.6 |

## §5 WCAG 2.1 AA cross-coupling

**P1 Devanagari rendering is FM-2's validation gate** per UX spec line 816. FM-2 tiered escalation is documented in UX spec line 762: "FM-2 — Devanagari validation gate + tiered escalation (empirical, no hardcoded ladder, no auto-pivot)".

**Per-role per-device fallback ladder documented in token system if rendering issues surface** per UX spec line 1129. Substantive fallback substitutions per UX spec lines 712-714:

| Role | Primary | Fallback 1 | Fallback 2 |
|---|---|---|---|
| Display (Devanagari Hindi serif) | Tiro Devanagari Hindi (UX spec line 712) | Yatra One (UX spec line 1129) | Mukta Mahee (UX spec line 1129) |
| Body (Devanagari sans-serif) | Noto Sans Devanagari (UX spec line 713) | Hind (UX spec line 1129) | Mukta (UX spec line 1129) |
| Tabular numerics (Devanagari monospace) | IBM Plex Mono Devanagari (UX spec line 714) | IBM Plex Sans + `tnum` (UX spec line 714) | (no further fallback documented; if exhausted, P1 fail → F1 escalation) |

**FM-2 escalation discipline** — empirical, no hardcoded ladder, no auto-pivot. The fallback ladder above is the **candidate** mitigation order; specific mitigation work at Task 10/11 may surface alternative orderings based on measured evidence (e.g., Yatra One renders well on Devices 1+2 but fails on Device 3 → escalate directly to Mukta Mahee for Device 3 only).

**WCAG 2.1 AA boundary**: this framework's P1 validation is **NOT** a deep accessibility audit per `experiment-protocol.md` §3 + UX spec line 851. Deep WCAG 2.1 AA validation (NFR-20 launch-blocker) is Story 0.10 P0-2c territory. The P1 cell in this framework validates the typography stack renders correctly; the broader WCAG audit (color contrast + keyboard navigation + screen reader compat + touch target sizing + form labels + reduced motion + Hindi TalkBack + Devanagari conjunct AT compatibility + zoom 150% + Hindi voice input + low-bandwidth resilience + 56pt critical surfaces + signup WCAG + My Pool WCAG + Yogdaan Bahi WCAG) is Story 0.10's load-bearing surface.

## §6 Silent-pass forbidden rule

**Any device × pattern × criterion cell with `_PENDING-MEASUREMENT_` literal at ratify-decision time is a structural violation.**

All 54 cells must be populated with substantive `observed_value` + `pass_fail_verdict` + `evidence_links` before the ratify-decision can be proposed at Task 11.

**Cells excluded from silent-pass discipline (by carve-out, not violation):**

- `not-applicable-iOS-OS-level-different` cells (P2 iPhone) — per `experiment-protocol.md` §5.3 + §6.2; rationale: iPhone iOS UPI Intent behavior is OS-level different per UX spec line 818; carve-out tagged explicitly with rationale in `notes` column

**Cells that must be substantively populated even if "obvious" (no carve-out permitted):**

- P5 cells on non-load-bearing devices (mid-range Android + iPhone) — UX spec line 824 names the entry-level Android as the load-bearing device, but P5 cells on the other two devices still require measurement (cross-device baseline + secondary surface validation)
- P3 cells across all 3 devices × 3 patterns — push notifications require per-device measurement (FCM Android × 2 devices + APNs iOS); cell aggregation per device is across patterns (3 cells per device)

**Audit at Task 11**: before ratify-decision is proposed, count remaining `_PENDING-MEASUREMENT_` literals across the 54-cell matrix; if count > 0 (excluding carve-out cells), structural violation; ratify-decision proposal is blocked.

**Re-measurement mandate**: any cell that remains `_PENDING-MEASUREMENT_` at the time the ratify-decision is proposed must be substantively measured before the decision proceeds. The ratify-decision cannot be proposed with any `_PENDING-MEASUREMENT_` literals remaining (excluding `not-applicable-iOS-OS-level-different` carve-outs). If measurement is infeasible within the timebox, the cell auto-fails and triggers the relevant F-criterion escalation path.

**Evidence-link integrity gate**: any cell with `pass` or `mitigated-pass` verdict MUST have a non-empty `evidence_links` list before the ratify-decision is proposed. A cell with `pass_fail_verdict = pass` and `evidence_links = []` is a structural violation equivalent to silent-pass. The pre-ratify-decision audit at Task 11 must count cells with empty `evidence_links` alongside remaining `_PENDING-MEASUREMENT_` literals.

## §7 Cross-link

- `experiment-protocol.md` §6 Per-criterion measurement procedure
- `measurement-template.md` §3 54-cell matrix + §4 per-criterion target-threshold reference + §5 evidence-capture protocol
- `ratify-decision-template.md` §1 decision outcome + §2 per-criterion evidence summary + §3 per-device evidence summary + §4 FM-2 escalation trace
- `pivot-evaluation-decision-tree.md` F1-F5 fail-criteria response paths
- `_bmad-output/research/p0-5-native-stack-validation.md` §5-§9 substantive evidence sections
- `.decision-log.md` Decision 2026-06-02-014 — supersession entry at Task 11 with ratify-or-pivot outcome
