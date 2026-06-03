# Experiment Protocol — P0-5 Native-Stack Validation

**Status:** Author-committed scaffolding; awaiting Trustee Panel scope ratification (Task 7) + device procurement (Task 8) + ~2-week prototype build (Task 9) + measurement collection (Task 10) + ratify-or-pivot decision (Task 11).

## §1 Authority cites

- **UX spec line 111 verbatim** — "Native-stack validation experiment. RN + Tamagui is the working assumption for the native member-app substrate; a bounded ~2-week engineering experiment validates the assumption with explicit pass/fail criteria before substrate-dependent engineering work begins. Full experiment specification lives in §6 Design System Foundation → *Phase-0 Native-Stack Validation Experiment*. Working assumption ratifies on pass; substrate pivot is last resort after exhausted mitigation per FM-2 tiered escalation. Owner: BigDev. Gate: before §1 Trust Loops engineering work begins"
- **UX spec lines 795-854 verbatim** — §6 Phase-0 Native-Stack Validation Experiment full specification (experiment scope; three named patterns; three test devices; P1-P6 pass criteria; F1-F5 fail criteria; FM-2 tiered escalation; BigDev decision authority; binding-for-v1-substrate; design-spec-work-proceeds-in-parallel-non-blocking timing posture)
- **epics line 688** — "P0-5 native-stack validation experiment — ~2-week prototype of three named patterns (Yogdaan Bahi, Shradhanjali Sahyog Vivran, Panchayat Noticeboard) on three test devices; pass criteria P1-P6 (UX-DR6). Substrate-dependent engineering does not begin without ratify decision"
- **epics line 564** — "Phase-0 prereq gates (P0-1, P0-3, P0-4, P0-5) — gate *all* engineering, not just the epics that explicitly list them"
- **epics line 693** — "P0-5 prototype produces ratify decision logged in `.decision-log.md`. Engineering substrate gate is open"
- **epics line 376 UX-DR6** — pass criteria P1-P6 enumeration verbatim
- **epics line 941** — "re-litigation requires a new ADR plus trustee-ratified justification"
- **architecture line 4784** — §Launch Gate Risks P0-5 row "P0-5 Native-Stack Validation Experiment | BigDev | UX (UI parity assessment)"
- **architecture line 331 AR-49** — "Substrate-conditional implementation commitments not frozen until P0-5 closes; exploration/prototyping/validation may proceed"
- **architecture lines 150-152** — §Deferred Decisions native-mobile-stack row "Native mobile stack (RN + Tamagui) — working assumption; ratifies on P0-5 Native-Stack Validation Experiment per UX §6. Substrate-conditional engineering work cannot begin until P0-5 lands. Pivot evaluation per FM-2 tiered escalation"
- **architecture lines 4873-4878** — §PoC Validation Pending "P0-5 (Native-Stack Validation Experiment) is the only commitment to write working code before architecture finalization"
- **architecture §4.1** — `apps/mobile/` Expo + RN + Tamagui + Expo Router; "P0-5 ratifies the native stack"
- **architecture §4.5** — MMKV operational note "requires Expo's Continuous Native Generation (CNG) workflow, not Expo Go. Consistent with P0-5 native-stack validation experiment scope"
- **architecture §4.6** — list virtualization "Threshold value + benchmark methodology surfaced in P0-5 native-stack validation experiment scope. Architecture commits the *criteria*; specific row-count threshold in P0-5 output"
- **architecture §4.12** — device-support matrix "Android 9+ (Snapdragon 4-series, 3 GB RAM is the floor per UX §6); iOS 16+; CNG workflow (not Expo Go) for MMKV + native modules"

## §2 Working assumption

RN + Tamagui ratifies-unless-fail per UX spec line 799 verbatim: **"validate-or-pivot, not decide-from-scratch"**.

This is the load-bearing scope discipline. The experiment is NOT a "decide native vs PWA from scratch" exercise. The experiment IS a "validate the working assumption with empirical measurement, or pivot via FM-2 tiered escalation if measurement surfaces irrecoverable failure". The default outcome is ratify; pivot is last resort after exhausted mitigation per UX spec line 831.

## §3 Scope discipline

Per UX spec lines 849-854 verbatim:

- **NOT a "decide native vs PWA from scratch" exercise.** The working assumption RN + Tamagui ratifies unless an F-criterion activates; substrate pivot is last resort after exhausted mitigation per UX spec line 831.
- **NOT a deep accessibility audit.** WCAG 2.1 AA + Radix primitives validation is Story 0.10 P0-2c territory; the P0-5 experiment validates Devanagari rendering as FM-2's validation gate (P1) only.
- **NOT a security review.** Security review is handled separately per PRD §4.13.
- **NOT a full functional test.** Three named patterns are representative samples of the broader Tier-1 + Tier-2 + Tier-3 surface inventory.
- **NOT optional.** Substrate-dependent engineering does not begin without the experiment's ratify decision per Epic 1 Story 1.1 line 990 precondition "Given Story 0.14's ratified substrate decision".

## §4 Per-pattern build checklist

Three named patterns enumerated verbatim from UX spec lines 805-807 + UX §8 Component System patterns (UX spec lines 1156-1158):

### §4.1 Yogdaan Bahi — contribution-history list

Per UX spec line 805 + UX §8 Passbook row pattern (UX spec line 1156):

- ≥50 row entries scrollable on target Android device
- Row structure per UX §8: 56pt fixed height + hairline rule separator + column structure date 100pt + sahyog flex + pool 64pt + amount 96pt
- 5th-row heavier rule (visual grouping per UX spec line 1156)
- Sticky footer with running tally per UX spec line 1156
- Hindi/English numerals stacked discipline per UX spec line 805 (operational surfaces use Gregorian + Latin numerals per UX spec line 1127; Hindi numerals reserved EXCLUSIVELY for memorial Devanagari prose per UX spec line 1122 — Yogdaan Bahi does NOT render Hindi numerals stacked over Gregorian dates per amendment A2)
- Tabular monospace amounts per UX spec line 805 (IBM Plex Mono Devanagari per UX spec line 714)

### §4.2 Shradhanjali Sahyog Vivran — per-claim memorial page

Per UX spec line 806 + UX §8 Memorial column pattern (UX spec line 1157):

- Max-width 360pt mobile + 480pt desktop per UX spec line 1157
- Bordered portrait + parichay (introduction) + kinship lattice
- Contributor scroll rendered at **200+ entries** to exercise list virtualization (FlatList → FlashList threshold per architecture line 2913)
- *दो शब्द स्मृति में* input field per UX spec line 806 + UX spec line 1157 (Hindi prose input + send-flow)
- Memorial header dates MAY render Hindi numerals per UX spec line 1122 (memorial Devanagari prose carve-out — distinct from Yogdaan Bahi discipline)

### §4.3 Panchayat Noticeboard — home-screen layout

Per UX spec line 807 + UX §8 Noticeboard strip pattern (UX spec line 1158):

- Full-width with hairline section separators per UX spec line 1158
- Vertical stack only (no horizontal carousels per UX spec line 1158)
- Section-header letter-spaced caps per UX spec line 1158
- Pinned-section rows with 4pt colored left-stub per UX spec line 1158
- Pinned notices + recent-closings rows + stat strip per UX spec line 807
- FR-19 celebration framing (Hindi prose; Gregorian + Latin numerals per UX spec line 1122 numeral discipline)

## §5 Per-device run checklist

Three test devices enumerated verbatim from UX spec lines 810-812 + architecture §4.12 device-support matrix (architecture line 2821):

### §5.1 Device 1 — Mid-range Snapdragon 4-series Android with 3 GB RAM

Per UX spec line 810 "Mid-range Snapdragon 4-series Android (target device class; 3 GB RAM)" + architecture line 2821 "Android 9+ (Snapdragon 4-series, 3 GB RAM is the floor per UX §6)":

- Cold-boot device
- Factory-reset (where applicable; new device default applies)
- Clean Wi-Fi network configured + minimum apps installed
- Install APK via `adb install` from EAS Build output
- Run patterns per `measurement-template.md` matrix cells for `device-mid-range-snapdragon-4-series-android` × `yogdaan-bahi`/`shradhanjali-sahyog-vivran`/`panchayat-noticeboard` × P1-P6
- Profile measurement per §6

### §5.2 Device 2 — Older entry-level Android with 2 GB RAM + Android 11

Per UX spec line 811 "Older entry-level Android (2 GB RAM, Android 11)":

- Same protocol as §5.1
- Specific attention to P5 list-performance (this is the device where 200+ Shradhanjali contributor scroll performance is most likely to surface fail-criterion; UX spec line 824 specifies this device class)
- 2GB RAM constraint may trigger native-side OOM events under sustained scroll; profile + document

### §5.3 Device 3 — iPhone at target iOS minimum (iOS 16+)

Per UX spec line 812 "iPhone at the target iOS minimum version" + architecture line 2821 "iOS 16+":

- Cold-boot device
- Factory-reset (where applicable)
- Clean Wi-Fi + minimum apps installed
- iOS device enrolled in TestFlight per Solo Builder's Apple Developer Program account (cross-coupled with Apple Developer Program annual fee budget per `device-procurement-roster.md` notes)
- Install build via TestFlight from EAS Build output
- Run patterns per `measurement-template.md` matrix cells for `device-iphone-ios-16-minimum`
- **P2 UPI Intent measurement note**: iPhone iOS UPI Intent behavior is OS-level different and the Android target is the load-bearing measurement surface per UX spec line 818; iPhone P2 cell MAY be tagged `not-applicable-iOS-OS-level-different` with rationale per `measurement-template.md` schema

## §6 Per-criterion measurement procedure

Six pass criteria P1-P6 enumerated verbatim from UX spec lines 814-826 + epics line 376 UX-DR6:

### §6.1 P1 — Devanagari rendering

**Target threshold** per UX spec line 816 verbatim: "Devanagari renders matras, conjuncts, and ligatures correctly across the three named patterns" with "visual inspection by BigDev + at least one Hindi-belt reader (recruit during P0-2 field work)".

**Procedure:**
- Visual inspection by BigDev across all three patterns × all three devices (9 inspection sessions; one per device × pattern)
- Hindi-belt reader review session ≤30 minutes per UX spec line 816 anti-pattern guardrail ("solo BigDev inspection without Hindi-belt reader" = anti-pattern)
- Hindi-belt reader recruited from P0-2 field work participants per UX spec line 816 (cross-coupling: Story 0.8 P0-2a teacher empathy + Story 0.9 P0-2b bereaved spouse Bihar Vaishali-district participants who consent to a separate ≤30-minute Devanagari rendering review session)
- **Fallback if no P0-2 participant available**: if no P0-2 field work participant is able to consent within the ~2-week experiment timebox, any native Hindi-reader (not exclusively a P0-2 participant) may serve as the Hindi-belt reader for the ≤30-minute review session, with rationale for the fallback recruitment path documented in `engagement-ledger.md` §6 measurement-execution log + `mitigation_notes_if_fail` column. BigDev-solo inspection without ANY Hindi-belt reader remains the anti-pattern per UX spec line 816.
- Evidence: screenshots of rendered patterns per device + audio recording of Hindi-belt reader review (consent per Story 0.8/0.9/0.10 ethics-protocol §3)
- Per-role per-device fallback ladder documented in token system if rendering issues surface per UX spec line 1129 (Tiro Devanagari Hindi → Yatra One / Mukta Mahee for display; Noto Sans Devanagari → Hind / Mukta for body; IBM Plex Mono Devanagari → IBM Plex Sans + `tnum` for numerics)
- **FM-2 validation gate**: P1 is FM-2's Devanagari validation gate per UX spec line 762 + 816; any fail triggers FM-2 tiered escalation per `pivot-evaluation-decision-tree.md` F1 path

### §6.2 P2 — UPI Intent integration

**Target threshold** per UX spec line 818 verbatim: "UPI Intent `upi://pay?` URL launches default UPI app (PhonePe + GPay + BHIM), return-handoff preserves session + My Pool context, UTR clipboard paste reliable".

**Procedure:**
- Per Android device × three UPI apps (PhonePe + GPay + BHIM) × three patterns where UPI Intent is exercised (Yogdaan Bahi contribution + Shradhanjali contribution + Panchayat noticeboard support flow): 18 measurement sessions (2 Android devices × 3 UPI apps × 3 patterns; iPhone P2 cells are `not-applicable-iOS-OS-level-different` per §5.3 + §6.2)
- Scenario: app opens `upi://pay?pa=...&pn=...&am=...&tr=...` URL → default UPI app launches → user completes payment (mock; sandbox UPI envelope per architecture §3 UPI Intent ecosystem) → return-handoff to app → session preserved + My Pool context preserved + UTR clipboard paste reliable
- Evidence: video recording of each scenario (consent per Solo Builder self-recording)
- iPhone P2 cell tagged `not-applicable-iOS-OS-level-different` with rationale per UX spec line 818 + §5.3
- **Fail-criterion F2 trigger**: if UPI Intent materially worse than acceptable (≥1 UPI app fails to launch OR return-handoff drops session OR UTR clipboard paste unreliable), FM-2 escalation per `pivot-evaluation-decision-tree.md` F2 path activates

### §6.3 P3 — Push notifications

**Target threshold** per UX spec line 820 verbatim: "Push notifications reliably deliver via FCM (Android) and APNs (iOS) under intermittent 4G simulation — ≥95% delivery success rate and p95 delivery latency ≤5 seconds when network available".

**Procedure:**
- FCM project configured + APNs key configured (via Solo Builder Apple Developer Program account)
- Test-notification batch: 100+ notifications sent per device × three patterns under intermittent 4G simulation via Network Link Conditioner iOS / developer-options throttling Android (Open ADR slot per README §7 invariant 8 for specific tool selection)
- Per-notification measurement: delivery-status (received y/n) + delivery-latency (send-timestamp → device-arrival-timestamp); cross-device clock-synchronization required (NTP-sync recommended; document in evidence batch CSV)
- Aggregate: delivery success rate % + p95 delivery latency seconds; compare against ≥95% + ≤5s thresholds per UX spec line 820
- Evidence: batch-test CSV with per-notification rows (timestamp + delivery-status + delivery-latency) per device × pattern × test-batch
- **Fail-criterion F3 trigger**: if delivery rate <95% OR p95 latency >5s OR (per pivot-tree F3) delivery rate <95% with mitigation OR p95 latency >30s under mitigation, FM-2 escalation per `pivot-evaluation-decision-tree.md` F3 path activates

### §6.4 P4 — Offline cache

**Target threshold** per UX spec line 822 verbatim: "Offline cache via MMKV persister + TanStack Query persistQueryClient — read-only access to My Pool + contribution history + claim status accessible after initial sync without network + pull-to-refresh on reconnect".

**Procedure:**
- Initial sync executed via Wi-Fi (TanStack Query fetches My Pool + contribution history + claim status; MMKV persister caches per architecture §4.5)
- Airplane-mode toggled ON (all radio off)
- Cold-restart device (kill app process; restart from launcher)
- Verify read-only access to all three Tier-1 surfaces (My Pool card + contribution history list + claim status detail) per UX spec line 822
- Airplane-mode toggled OFF; pull-to-refresh triggered; verify data refresh + UI update
- Evidence: video recording of full airplane-mode cycle per device × pattern; 9 measurement sessions
- **Minimum trial count**: ≥3 successful airplane-mode cycles per device × pattern are required for a P4 cell `pass` verdict per `pass-criteria-evaluation-framework.md` §4 (P4: no latitude — functional test passes or fails per scenario). Document cycle count in `notes` field.
- **Fail-criterion**: if any surface inaccessible offline OR pull-to-refresh fails to recover, cell is `fail` on P4; FM-2 escalation per `pivot-evaluation-decision-tree.md` (cache-strategy adjustment within current substrate)

### §6.5 P5 — List performance

**Target threshold** per UX spec line 824 verbatim: "List performance — Shradhanjali contributor scroll at 200+ entries renders at 60 fps target / 30 fps minimum on the older entry-level Android device".

**Procedure:**
- Older entry-level Android (`device-entry-level-2gb-android-11`) is the load-bearing measurement device per UX spec line 824
- 200+ entries seeded into Shradhanjali contributor list via test fixture
- Scroll session: sustained scroll for 30+ seconds at typical user gesture velocity
- Frame-rate profiling: React DevTools profiler (component-render-time) + Android GPU profiler (`setprop debug.hwui.profile visual_bars true`) + iOS Instruments Time Profiler (for cross-device completeness)
- Measure: dropped frames count + average fps + minimum fps observed during sustained scroll
- Threshold per UX spec line 824: 60 fps target; 30 fps minimum (any sustained period <30 fps is `fail`); the more-protective-governs disposition forbids rounding-up (28 fps = `fail`, not "≈30 fps minimum" per `pass-criteria-evaluation-framework.md` §2)
- Evidence: profiler-trace export per device × pattern (only Shradhanjali Sahyog Vivran exercises 200+ entries; Yogdaan Bahi at 50 entries + Panchayat Noticeboard at home-screen layout are secondary cells)
- **Cold-start time (informal, outside 54-cell matrix)**: PRD §8 NFR Performance (PRD line 1350) specifies <3s cold-start on mid-range Android (Snapdragon 4-series, 3 GB RAM). Cold-start time is an informal observation during Task 9 prototype build + Task 10 measurement sessions; it is NOT a P-criterion in the 54-cell matrix and does not affect the ratify-or-pivot decision. Document observed cold-start values in `engagement-ledger.md` §6 measurement-execution log `notes` field.
- **Fail-criterion**: if 30 fps minimum violated on any device, cell is `fail` on P5; FM-2 escalation per `pivot-evaluation-decision-tree.md` (FlatList → FlashList migration per architecture §4.6 + line 2913 — the threshold value is itself a P0-5 experiment output)

### §6.6 P6 — No blocking external dependencies

**Target threshold** per UX spec line 826 verbatim: "No blocking external dependencies — Tamagui or React Native community responses not required for forward progress within the ~2-week timebox".

**Procedure:**
- Daily timebox-budget log entry (per `engagement-ledger.md` §5 Prototype-build log)
- Per-day log: blocking-dependency events (e.g., Tamagui issue filed awaiting upstream response; RN library bug requiring community PR; Expo upgrade blocked on community release)
- Track cumulative blocking-event time across the ~2-week timebox
- **Fail-criterion**: if blocking-dependency events accumulate to ≥3-day blocking time within the ~2-week timebox (15% of timebox per F4 thresholds rationale), cell is `fail` on P6; FM-2 escalation per `pivot-evaluation-decision-tree.md` (substrate pivot evaluation last resort per UX spec line 831)
- **Note — P6 ≥3-day threshold vs F4 calendar-time threshold**: The ≥3-day blocking time is the P6 pass-criterion operationalization (practical measure of "community responses required for forward progress" per UX spec line 826); it is distinct from the F4 fail-criterion (>3× calendar timebox per `experiment-protocol.md` §7). P6 failure fires F4 path in `pivot-evaluation-decision-tree.md`; the ≥3-day threshold is P6's pass/fail boundary, not an F4 trigger.
- Evidence: timebox tracker log entries + per-blocking-event description + per-event mitigation attempt + outcome

## §7 Timebox commitment

**~2 weeks of focused engineering work** per UX spec line 801. F4 fail-criterion if **>3× target timebox** per UX spec line 839 — measured **calendar-time** NOT wall-clock-engineering-time (calendar-time is the load-bearing definition because solo-builder engagement-velocity is not full-time; per Story 0.12 reconciliation work, calendar-week ≠ engineer-week).

**F4 threshold**: 6 calendar-weeks (3 × 2 weeks) is the upper bound. If prototype not measurement-ready at 6 calendar-weeks, F4 activates per `pivot-evaluation-decision-tree.md` F4 path (simpler substrate PWA-only stack OR delayed SM-1 ship target per Story 0.12 P0-3 reconciliation contract-help-path budget cross-coupling).

**Daily timebox-budget check** per §6.6 + `engagement-ledger.md` §5 — log entry per day tracks per-pattern completion progress + blocking-dependency events + mitigation attempts.

## §8 Mitigation discipline per FM-2 tiered escalation

Per UX spec lines 762 + 831 + 843 verbatim. FM-2 tiered escalation is mandatory before pivot evaluation; substrate pivot is last resort after exhausted mitigation.

**Per-criterion mitigation candidates** (substantive mitigation work lands at Task 10/11; this §8 commits the methodology):

- **P1 Devanagari fail**: alternative font face within role-character commitment (Tiro Devanagari Hindi → Yatra One → Mukta Mahee for display; Noto Sans Devanagari → Hind → Mukta for body; IBM Plex Mono Devanagari → IBM Plex Sans + `tnum`); font-loading tuning (bundled vs CDN vs OS fallback); render configuration (Hermes JS engine font-loading flags); system fallback ladder refinement
- **P2 UPI Intent fail**: substrate-level evaluation if UPI Intent behavior on RN is materially worse than expected; cross-coupling with PWA-only stack F2 pivot path
- **P3 push fail**: augmented-push strategy (FCM topic-based fallbacks; server-side retry; SMS bridge for critical alerts) OR PWA Web Push for Android + SMS bridge for iOS minority (F3 pivot path candidate)
- **P4 cache fail**: cache-strategy adjustment (MMKV configuration; TanStack Query persistQueryClient settings; offline-first vs sync-first pattern)
- **P5 list-performance fail**: FlatList → FlashList migration per architecture §4.6 + line 2913 (the threshold value is itself a P0-5 experiment output); item-render optimization; image-preload tuning per Expo Image §4.11.2
- **P6 blocking-dependency fail**: substrate pivot evaluation last resort per UX spec line 831

**Re-measurement after mitigation** is mandatory per `measurement-template.md` `re_measurement_after_mitigation` column. Mitigated cells must produce evidence of mitigation success; silent flip from `fail` to `mitigated-pass` is forbidden per `pass-criteria-evaluation-framework.md` §6.

**Exhaustion standard**: FM-2 mitigation is declared exhausted only after a minimum of **2 distinct mitigation attempts** per activated F-criterion have been documented with outcome evidence in `measurement-template.md` `mitigation_notes_if_fail` + `re_measurement_after_mitigation` columns. A single failed mitigation attempt does not constitute exhausted mitigation; the second attempt must be substantively different from the first (e.g., different font face vs font-loading mechanism for P1; different FCM configuration vs server-retry strategy for P3).

## §9 Decision authority

**BigDev per UX spec line 845** — "Owner: BigDev. Gate: before §1 Trust Loops engineering work begins". The ratify (or pivot) decision is BigDev's call; the Trustee Panel acknowledges per `.decision-log.md` Decision 2026-06-02-014.

**Binding-for-v1-substrate per UX spec line 845** — the substrate-binding-language for Epic 1 (per `ratify-decision-template.md` §5) is the verbatim text Epic 1 Story 1.1 line 990 consumes via "Given Story 0.14's ratified substrate decision".

**Re-litigation requires new ADR plus trustee-ratified justification per epics line 941** — any future proposal to amend the substrate decision post-Epic-1 requires a new ADR superseding ADR-NNNN-native-mobile-stack-ratify + a new `.decision-log.md` Decision entry with **≥2-trustee ratification** (heightened threshold per substrate-change-disruption-cost discipline).

**Trustee threshold at Task 11**: ≥1-trustee acknowledgement per BigDev decision authority per UX spec line 845 (distinct from prior Stories ≥2-trustee quorum per README §5 + invariant 14). Document the distinction explicitly to prevent quorum-confusion at Task 11.

## §10 Cross-link

- `measurement-template.md` — 54-cell measurement matrix populated at Task 10
- `pass-criteria-evaluation-framework.md` — all-must-hold discipline + more-protective-governs disposition + verdict aggregation rule
- `ratify-decision-template.md` — §1-§8 decision schema; substantive content at Task 11
- `pivot-evaluation-decision-tree.md` — F1-F5 fail-criteria response paths verbatim from UX spec lines 830-843
- `device-procurement-roster.md` — 3 placeholder rows; Task 7 budget + Task 8 procurement
- `engagement-ledger.md` — 11 §-log sections tracking the experiment lifecycle
- `_bmad-output/research/p0-5-native-stack-validation.md` — AC-named research artifact per epics line 936
- `.decision-log.md` Decision 2026-06-02-014 — author-commit entry; supersession entry at Task 11
- `docs/knowledge-transfer/adr-index.md` line 52 — ADR-NNNN-native-mobile-stack-ratify slot
