# Pivot-Evaluation Decision Tree — P0-5 Native-Stack Validation

**Status:** Author-committed structural-only; substantive pivot-decision content lands at Task 11 IF any pivot path activates.

**Authority cites:** UX spec lines 830-843 (F1-F5 fail-criteria response paths verbatim); UX spec line 762 (FM-2 Devanagari validation gate + tiered escalation); UX spec line 831 (substrate pivot is last resort after exhausted mitigation, not first response); UX spec line 843 (FM-2 tiered escalation discipline); UX spec lines 712-714 (Devanagari typography stack); UX spec line 818 (P2 UPI Intent — PhonePe + GPay + BHIM); UX spec line 820 (P3 push thresholds); architecture §4.6 + line 2913 (FlatList → FlashList migration criteria); `experiment-protocol.md` §8 mitigation discipline; `pass-criteria-evaluation-framework.md` §1-§3; `docs/spec-to-cadence-reconciliation/` (F4 cross-coupling); Decision 2026-06-02-014.

## §1 Discipline

Per UX spec line 831 verbatim: **"substrate pivot is last resort after exhausted mitigation, not first response"**. Per UX spec line 762: "FM-2 — Devanagari validation gate + tiered escalation (empirical, no hardcoded ladder, no auto-pivot)".

**FM-2 tiered escalation is MANDATORY before pivot evaluation.** The tree below commits the **per-criterion candidate response paths**; the substantive pivot decision content lands at Task 11 IF any pivot path activates after exhausted mitigation.

**Pivot is NEVER first response.** If a P-criterion cell measures `fail` at Task 10, the workflow is:
1. FM-2 tiered escalation mitigation attempts per `experiment-protocol.md` §8 — documented in `measurement-template.md` `mitigation_notes_if_fail` column
2. Re-measurement after each mitigation attempt per `re_measurement_after_mitigation` column
3. If mitigation succeeds (re-measured cell flips to `mitigated-pass`): mitigated-then-ratify path per `pass-criteria-evaluation-framework.md` §3
4. If mitigation exhausted (cell remains `fail` after candidate mitigations attempted): pivot path per this decision tree fires

**Most-severe-governs on multi-criterion failure**: if multiple F-criteria activate simultaneously (e.g., F1 Devanagari fail + F3 push fail), the most-severe pivot path governs — i.e., the path with the broadest substrate implications takes precedence (e.g., F2 PWA substrate pivot takes precedence over F1 within-substrate font fallback). Both F-criterion traces are documented in `ratify-decision-template.md` §4 `F_criteria_activated` list field.

## §2 F1 — Devanagari render fails on serif display face

**Triggering measurement** per UX spec line 830: "P1 Devanagari renders matras, conjuncts, or ligatures incorrectly on one or more devices × patterns; visual inspection by BigDev OR Hindi-belt reader flags rendering defect".

**Tiered mitigation per UX spec lines 712-714 + line 1129 (within-substrate first):**

1. **Per-role per-device fallback ladder** within the Tiro/Noto/Plex character commitment:
   - Display role: Tiro Devanagari Hindi → Yatra One → Mukta Mahee (per UX spec line 712 + line 1129)
   - Body role: Noto Sans Devanagari → Hind → Mukta (per UX spec line 713 + line 1129)
   - Tabular numerics role: IBM Plex Mono Devanagari → IBM Plex Sans + `tnum` (per UX spec line 714)
2. **Font-loading tuning** — bundled vs CDN vs OS fallback; Hermes JS engine font-loading flags
3. **Render configuration** — system font fallback ladder refinement; RN Text component `allowFontScaling` + `adjustsFontSizeToFit` tuning; Tamagui theme typography token override per-device
4. **System fallback ladder refinement** — per-platform native font substitution rules (Android NotoSerif fallback chain; iOS .DevanagariMT fallback chain)

**If mitigation exhausted**: F1 pivot evaluation activates.

**F1 pivot path candidates** (substantive decision at Task 11 IF activated):

- **Within-substrate pivot**: substitute one or more typography roles permanently (e.g., adopt Yatra One as display default for all devices); document in token system per UX spec line 1129; this is a **token-system pivot**, NOT a substrate pivot — RN + Tamagui still ratifies with a token system amendment
- **Substrate pivot (last resort)**: if Devanagari rendering is fundamentally broken on the RN + Tamagui substrate (e.g., RN text-shaping pipeline cannot handle Devanagari conjuncts on Android 11) → evaluate Flutter migration per FM-2 (UX spec line 843) — this requires re-litigation discipline per `ratify-decision-template.md` §7 with ≥2-trustee ratification

## §3 F2 — UPI Intent materially worse than acceptable

**Triggering measurement** per UX spec line 832: "P2 UPI Intent — ≥1 of {PhonePe, GPay, BHIM} fails to launch on `upi://pay?` URL on the target Android device OR return-handoff drops session OR UTR clipboard paste unreliable".

**Tiered mitigation:**

1. **URL scheme tuning** — `upi://pay?` URL parameter encoding (RFC 3986 percent-encoding); `pa` (payee VPA) + `pn` (payee name) + `am` (amount) + `tr` (transaction ref) + `tn` (note) parameter ordering; cross-app behavior testing
2. **Return-handoff session preservation** — Expo Router state persistence via MMKV per architecture §4.5 + §4.7; deep-link return handler implementation
3. **UTR clipboard paste reliability** — Expo Clipboard API integration; pre-population of UTR input field on return-handoff

**If mitigation exhausted**: F2 pivot evaluation activates.

**F2 pivot path candidates** (substantive decision at Task 11 IF activated):

- **Substrate pivot**: PWA-only stack via Android Chrome URL scheme — `intent://` scheme launch from web context; this carries substrate-level implications:
  - Service Worker offline cache for P4 (vs MMKV in RN)
  - Web Push reliability for P3 (vs FCM in RN)
  - Drop the native stack entirely (Tamagui Web + Expo Router Web equivalents)
- **Cross-coupling**: a PWA pivot disrupts Story 0.10 P0-2c PRECONDITION-2 — the React Native Accessibility props per UX spec lines 1199-1201 + Tamagui/Radix accessibility wiring per UX spec lines 685-687 are RN-substrate-specific; PWA equivalents use ARIA + browser-native AT integration; Story 0.10 substantive validation may need re-scoping

## §4 F3 — Push notification delivery unreliable

**Triggering measurement** per UX spec line 834: "P3 push notifications — delivery rate <95% OR p95 latency >5s under intermittent 4G simulation".

**Tiered mitigation:**

1. **FCM/APNs configuration** — payload size optimization; priority flag tuning (`high` for critical alerts); collapse-key tuning
2. **Server-side retry** — exponential backoff retry on FCM/APNs send failures; dead-letter queue for >3 retries
3. **Cross-device clock-synchronization** — ensure measurement clock-skew is not inflating latency observations

**If mitigation exhausted**: F3 pivot evaluation activates.

**F3 pivot path candidates** per UX spec line 834 (substantive decision at Task 11 IF activated):

- **Augmented push strategy** (within native substrate):
  - FCM topic-based fallbacks (per-cohort topic broadcast vs per-user direct)
  - Server-side retry with longer windows
  - **SMS bridge for critical alerts** — fall back to SMS for delivery failures >2 retries; cost-coupled with Story 0.4 degradation-policy comms-templates SMS-channel
- **Substrate pivot**:
  - PWA Web Push for Android (browser-native push)
  - SMS bridge for iOS minority (no Web Push parity on iOS Safari)
  - This pivot path is a partial-substrate-pivot (PWA for Android push; native iOS) which adds substrate complexity; evaluate cost-benefit

## §5 F4 — Engineering velocity materially below SM-1 needs

**Triggering measurement** per UX spec line 836 + `experiment-protocol.md` §7: "P6 timebox observation — prototype takes >3× target timebox (>6 calendar-weeks)".

**Tiered mitigation:**

1. **Blocking-dependency unblocking** — file upstream issues; submit PRs; use community workarounds
2. **Scope reduction within prototype** — reduce per-pattern feature count; defer non-load-bearing measurement cells
3. **Solo Builder engagement-velocity adjustment** — re-allocate calendar-time from non-Story-0.14 work

**If mitigation exhausted**: F4 pivot evaluation activates.

**F4 pivot path candidates** per UX spec line 836 (substantive decision at Task 11 IF activated):

- **Simpler substrate**: PWA-only stack — significantly faster engineering velocity at the cost of native-feature parity; substrate-level implications similar to F2
- **Delayed SM-1 ship target via Story 0.12 reconciliation** — Story 0.12 P0-3 reconciliation `move-SM-1` path activation per `docs/spec-to-cadence-reconciliation/reconciliation-decision-framework.md` §3(b); F4 IS the load-bearing-unknown that Story 0.12 reality-check exists to catch
- **Contract-help-path activation** via Story 0.12 reconciliation `contract-help` path per `docs/spec-to-cadence-reconciliation/README.md` line 19 + line 152 — bring in additional engineering capacity to complete the prototype within revised timebox

**Cross-coupling with Story 0.12**: F4 activation cross-references Story 0.12 P0-3 reconciliation outcome at Task 9 ratification; the F4 pivot decision and Story 0.12 reconciliation outcome must be coherent at the point of Task 11 decision.

## §6 F5 — Tamagui or RN community direction shifts

**Triggering measurement** per UX spec line 838 + UX spec line 842: "P6 — Tamagui or React Native community-direction shift surfaces during the ~2-week timebox: breaking release announced, maintainer departure, license change, published critical CVE without timely patch".

**Tiered mitigation:**

1. **Wait-and-see for community resolution** — if announced shift has scheduled resolution within the timebox, defer F5 evaluation
2. **Workaround via library pinning** — pin specific Tamagui/RN versions; freeze upgrade cadence; document in `engagement-ledger.md` §10 Pack-revision log
3. **Pre-emptive PR contribution** — if Solo Builder has capacity to file a community PR resolving the shift, attempt

**If mitigation exhausted**: F5 pivot evaluation activates.

**F5 pivot path candidates** per UX spec line 842 (substantive decision at Task 11 IF activated):

- **Hand-rolled native primitives via FM-1 adapter swap** — replace Tamagui with thin RN primitive layer; keep RN substrate; FM-1 substrate-agnostic adapter layer per architecture handles the abstraction
- **Flutter migration per FM-2** — full substrate pivot to Flutter; this is the deepest pivot path; requires substantial Phase-0 re-litigation; ≥2-trustee ratification per `ratify-decision-template.md` §7 re-litigation discipline

## §7 Decision-tree summary

| F-criterion | Triggering measurement | Within-substrate mitigation | Pivot path (last resort) |
|---|---|---|---|
| F1 Devanagari fail | P1 visual inspection / Hindi-belt reader flag | Per-role fallback ladder Tiro/Yatra/Mukta + Noto/Hind/Mukta + IBM Plex Mono/Sans+tnum | Flutter migration per FM-2 |
| F2 UPI Intent fail | P2 launch / return-handoff / UTR paste fail | URL scheme tuning + session preservation + clipboard API tuning | PWA-only stack via Android Chrome URL scheme |
| F3 Push fail | P3 <95% delivery OR >5s p95 | FCM/APNs config + server-retry + clock-sync | Augmented push (FCM topic + SMS) OR PWA Web Push + SMS bridge |
| F4 Velocity fail | P6 >3× timebox (>6 calendar-weeks) | Unblock + scope-reduce + velocity-adjust | Simpler substrate (PWA-only) OR move-SM-1 OR contract-help per Story 0.12 reconciliation |
| F5 Community shift | Breaking release / maintainer / license / CVE | Wait + library-pin + PR-contribute | Hand-rolled native primitives via FM-1 OR Flutter migration per FM-2 |

## §8 Discipline reminders

- **FM-2 tiered escalation is mandatory** before any F-N pivot path activation per UX spec line 762 + line 831 + line 843
- **Substrate pivot is last resort** — within-substrate mitigation is exhausted first
- **No auto-pivot** — pivot decisions are explicit BigDev + ≥1-trustee acknowledgement events at Task 11
- **No hardcoded ladder** — the tiered mitigation sequences in §2-§6 are CANDIDATE orderings; substantive mitigation work at Task 10/11 may surface alternative orderings based on measured evidence (empirical discipline per UX spec line 762)
- **Re-litigation discipline** — F-pivot decisions that flip the substrate (F1 Flutter; F2 PWA; F3 partial-pivot; F4 simpler-substrate; F5 Flutter/native-primitives) require new ADR + ≥2-trustee ratification per `ratify-decision-template.md` §7 + `README.md` invariant 6

## §9 Cross-link

- `experiment-protocol.md` §8 Mitigation discipline per FM-2 tiered escalation
- `pass-criteria-evaluation-framework.md` §3 verdict aggregation rule
- `measurement-template.md` §3 54-cell matrix + `mitigation_notes_if_fail` + `re_measurement_after_mitigation` columns
- `ratify-decision-template.md` §4 FM-2 escalation trace + §5 substrate-binding-language + §7 re-litigation discipline
- `docs/spec-to-cadence-reconciliation/reconciliation-decision-framework.md` §3(b) move-SM-1 + §3(c) contract-help — F4 pivot cross-coupling
- `_bmad-output/planning-artifacts/ux-design-specification.md` lines 830-843 — F1-F5 verbatim spec
- `_bmad-output/planning-artifacts/ux-design-specification.md` line 762 — FM-2 tiered escalation discipline
- `_bmad-output/planning-artifacts/ux-design-specification.md` line 831 — substrate pivot is last resort
- `_bmad-output/planning-artifacts/architecture.md` §4.6 + line 2913 — FlatList → FlashList threshold (P0-5 output)
- `engagement-ledger.md` §7 Pass-criteria-evaluation log + §8 Ratify-or-pivot decision log + §10 Pack-revision log
