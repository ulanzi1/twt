# Measurement Template — P0-5 54-Cell Measurement Matrix

**Status:** Author-committed scaffolding with 54 cells pre-staged at `observed_value = _PENDING-MEASUREMENT_` + `pass_fail_verdict = pending-measurement` + `evidence_links = []`; awaiting Task 10 substantive measurements.

**Authority cites:** UX spec lines 814-826 (P1-P6 pass criteria + target thresholds verbatim); UX spec line 814 (all-must-hold discipline); [[feedback_closure_language_precision]] (more-protective-governs disposition forbids rounding-up sub-threshold measurements); `experiment-protocol.md` §6 per-criterion measurement procedure; `pass-criteria-evaluation-framework.md` §1-§6; `_bmad-output/research/p0-5-native-stack-validation.md` §5 (mirror matrix in research artifact); Decision 2026-06-02-014.

## §1 Header

- **Status:** Author-committed scaffolding; awaiting Task 10 substantive measurements (Solo Builder runs measurements on all three devices under throttled cellular + populates each of the 54 cells with `observed_value` + `pass_fail_verdict` + `evidence_links`).
- **Schema discipline (per `pass-criteria-evaluation-framework.md` §6):** Silent-pass forbidden. Any device × pattern × criterion cell with `_PENDING-MEASUREMENT_` literal at ratify-decision time is a structural violation. All 54 cells must be populated before the ratify-decision can be proposed.

## §2 Schema

| Field | Type | Description |
|---|---|---|
| `device_id` | FK → `device-procurement-roster.md` | `device-mid-range-snapdragon-4-series-android` \| `device-entry-level-2gb-android-11` \| `device-iphone-ios-16-minimum` |
| `pattern_id` | enum | `yogdaan-bahi` \| `shradhanjali-sahyog-vivran` \| `panchayat-noticeboard` |
| `criterion_id` | enum | `p1-devanagari` \| `p2-upi-intent` \| `p3-push-notifications` \| `p4-offline-cache` \| `p5-list-performance` \| `p6-no-blocking-deps` |
| `target_threshold` | string | Verbatim from UX spec §6 (see §4) |
| `observed_value` | string \| number | Substantive measurement at Task 10; `_PENDING-MEASUREMENT_` literal at author-commit |
| `pass_fail_verdict` | enum | `pass` \| `fail` \| `mitigated-pass` \| `pending-measurement` \| `not-applicable-iOS-OS-level-different` (P2 iPhone carve-out per `experiment-protocol.md` §5.3 + §6.2) |
| `evidence_links` | list of paths | Screenshot OR video OR profiler-trace paths under `_bmad-output/research/p0-5-native-stack-validation-evidence/<device-subdir>/` per epics line 936 |
| `mitigation_notes_if_fail` | string \| null | Per FM-2 tiered escalation discipline; populated at Task 10/11 if any fail surfaces |
| `re_measurement_after_mitigation` | string \| null | Populated post-mitigation if FM-2 escalation produces mitigation; cells re-measured to validate mitigation success |
| `notes` | string | Free-form |

**Schema discipline:**

- **Append-only.** Cells added at author-commit (54 placeholder cells; 3 devices × 3 patterns × 6 criteria); additional re-measurement cells appended at Task 11 if mitigation cycles produce them (per `re_measurement_after_mitigation` log).
- **Forbidden-removal rule.** Cells are NEVER deleted; failed measurements remain in the matrix as audit baseline; supersession via re-measurement cell append.
- **Forbidden statuses:**
  - **Silent-pass**: a cell with `observed_value` not explicitly populated cannot be marked `pass`; structural violation
  - **Single-point-measurement-without-trial-count**: P3/P5 measurements require ≥1 explicit trial count in `notes` (e.g., "100 notifications sent" for P3; "30-second sustained scroll session" for P5)
  - **Removal**: cells are never removed

## §3 54-Cell Matrix

Format: `device_id` × `pattern_id` × `criterion_id` → `{observed_value, pass_fail_verdict, evidence_links, mitigation_notes_if_fail, re_measurement_after_mitigation, notes}`

At author-commit (Task 6), every cell carries:
- `observed_value = _PENDING-MEASUREMENT_`
- `pass_fail_verdict = pending-measurement`
- `evidence_links = []`
- `mitigation_notes_if_fail = null`
- `re_measurement_after_mitigation = null`
- `notes = "Author-committed scaffolding; substantive measurement at Task 10"`

### §3.1 Device 1 — `device-mid-range-snapdragon-4-series-android`

#### Pattern `yogdaan-bahi`

| Cell ID | Criterion | Target threshold (UX spec) | observed_value | pass_fail_verdict | evidence_links |
|---|---|---|---|---|---|
| `1.1.p1` | p1-devanagari | "Devanagari renders matras, conjuncts, and ligatures correctly" (line 816) | `_PENDING-MEASUREMENT_` | `pending-measurement` | `[]` |
| `1.1.p2` | p2-upi-intent | "PhonePe + GPay + BHIM clean launch + return-handoff + UTR paste" (line 818) | `_PENDING-MEASUREMENT_` | `pending-measurement` | `[]` |
| `1.1.p3` | p3-push-notifications | "≥95% delivery success + p95 ≤5s under intermittent 4G" (line 820) | `_PENDING-MEASUREMENT_` | `pending-measurement` | `[]` |
| `1.1.p4` | p4-offline-cache | "read-only access after airplane-mode cold-restart + pull-to-refresh recovery" (line 822) | `_PENDING-MEASUREMENT_` | `pending-measurement` | `[]` |
| `1.1.p5` | p5-list-performance | "60 fps target / 30 fps minimum at 200+ entries" (line 824) | `_PENDING-MEASUREMENT_` | `pending-measurement` | `[]` |
| `1.1.p6` | p6-no-blocking-deps | "no blocking external dependency cycles" (line 826) | `_PENDING-MEASUREMENT_` | `pending-measurement` | `[]` |

#### Pattern `shradhanjali-sahyog-vivran`

| Cell ID | Criterion | Target threshold | observed_value | pass_fail_verdict | evidence_links |
|---|---|---|---|---|---|
| `1.2.p1` | p1-devanagari | (line 816) | `_PENDING-MEASUREMENT_` | `pending-measurement` | `[]` |
| `1.2.p2` | p2-upi-intent | (line 818) | `_PENDING-MEASUREMENT_` | `pending-measurement` | `[]` |
| `1.2.p3` | p3-push-notifications | (line 820) | `_PENDING-MEASUREMENT_` | `pending-measurement` | `[]` |
| `1.2.p4` | p4-offline-cache | (line 822) | `_PENDING-MEASUREMENT_` | `pending-measurement` | `[]` |
| `1.2.p5` | p5-list-performance | **PRIMARY P5 CELL** — 200+ contributor entries on mid-range device (line 824) | `_PENDING-MEASUREMENT_` | `pending-measurement` | `[]` |
| `1.2.p6` | p6-no-blocking-deps | (line 826) | `_PENDING-MEASUREMENT_` | `pending-measurement` | `[]` |

#### Pattern `panchayat-noticeboard`

| Cell ID | Criterion | Target threshold | observed_value | pass_fail_verdict | evidence_links |
|---|---|---|---|---|---|
| `1.3.p1` | p1-devanagari | (line 816) | `_PENDING-MEASUREMENT_` | `pending-measurement` | `[]` |
| `1.3.p2` | p2-upi-intent | (line 818) | `_PENDING-MEASUREMENT_` | `pending-measurement` | `[]` |
| `1.3.p3` | p3-push-notifications | (line 820) | `_PENDING-MEASUREMENT_` | `pending-measurement` | `[]` |
| `1.3.p4` | p4-offline-cache | (line 822) | `_PENDING-MEASUREMENT_` | `pending-measurement` | `[]` |
| `1.3.p5` | p5-list-performance | (line 824) — secondary P5 surface (home-screen layout) | `_PENDING-MEASUREMENT_` | `pending-measurement` | `[]` |
| `1.3.p6` | p6-no-blocking-deps | (line 826) | `_PENDING-MEASUREMENT_` | `pending-measurement` | `[]` |

### §3.2 Device 2 — `device-entry-level-2gb-android-11`

#### Pattern `yogdaan-bahi`

| Cell ID | Criterion | Target threshold | observed_value | pass_fail_verdict | evidence_links |
|---|---|---|---|---|---|
| `2.1.p1` | p1-devanagari | (line 816) | `_PENDING-MEASUREMENT_` | `pending-measurement` | `[]` |
| `2.1.p2` | p2-upi-intent | (line 818) | `_PENDING-MEASUREMENT_` | `pending-measurement` | `[]` |
| `2.1.p3` | p3-push-notifications | (line 820) | `_PENDING-MEASUREMENT_` | `pending-measurement` | `[]` |
| `2.1.p4` | p4-offline-cache | (line 822) | `_PENDING-MEASUREMENT_` | `pending-measurement` | `[]` |
| `2.1.p5` | p5-list-performance | (line 824) | `_PENDING-MEASUREMENT_` | `pending-measurement` | `[]` |
| `2.1.p6` | p6-no-blocking-deps | (line 826) | `_PENDING-MEASUREMENT_` | `pending-measurement` | `[]` |

#### Pattern `shradhanjali-sahyog-vivran`

| Cell ID | Criterion | Target threshold | observed_value | pass_fail_verdict | evidence_links |
|---|---|---|---|---|---|
| `2.2.p1` | p1-devanagari | (line 816) | `_PENDING-MEASUREMENT_` | `pending-measurement` | `[]` |
| `2.2.p2` | p2-upi-intent | (line 818) | `_PENDING-MEASUREMENT_` | `pending-measurement` | `[]` |
| `2.2.p3` | p3-push-notifications | (line 820) | `_PENDING-MEASUREMENT_` | `pending-measurement` | `[]` |
| `2.2.p4` | p4-offline-cache | (line 822) | `_PENDING-MEASUREMENT_` | `pending-measurement` | `[]` |
| `2.2.p5` | p5-list-performance | **LOAD-BEARING P5 CELL** — UX spec line 824 names this device class for 60 fps target / 30 fps minimum at 200+ entries | `_PENDING-MEASUREMENT_` | `pending-measurement` | `[]` |
| `2.2.p6` | p6-no-blocking-deps | (line 826) | `_PENDING-MEASUREMENT_` | `pending-measurement` | `[]` |

#### Pattern `panchayat-noticeboard`

| Cell ID | Criterion | Target threshold | observed_value | pass_fail_verdict | evidence_links |
|---|---|---|---|---|---|
| `2.3.p1` | p1-devanagari | (line 816) | `_PENDING-MEASUREMENT_` | `pending-measurement` | `[]` |
| `2.3.p2` | p2-upi-intent | (line 818) | `_PENDING-MEASUREMENT_` | `pending-measurement` | `[]` |
| `2.3.p3` | p3-push-notifications | (line 820) | `_PENDING-MEASUREMENT_` | `pending-measurement` | `[]` |
| `2.3.p4` | p4-offline-cache | (line 822) | `_PENDING-MEASUREMENT_` | `pending-measurement` | `[]` |
| `2.3.p5` | p5-list-performance | (line 824) | `_PENDING-MEASUREMENT_` | `pending-measurement` | `[]` |
| `2.3.p6` | p6-no-blocking-deps | (line 826) | `_PENDING-MEASUREMENT_` | `pending-measurement` | `[]` |

### §3.3 Device 3 — `device-iphone-ios-16-minimum`

#### Pattern `yogdaan-bahi`

| Cell ID | Criterion | Target threshold | observed_value | pass_fail_verdict | evidence_links |
|---|---|---|---|---|---|
| `3.1.p1` | p1-devanagari | (line 816) | `_PENDING-MEASUREMENT_` | `pending-measurement` | `[]` |
| `3.1.p2` | p2-upi-intent | (line 818) — iPhone P2 carve-out per `experiment-protocol.md` §5.3 + §6.2; iPhone iOS UPI Intent behavior is OS-level different; Android target is the load-bearing measurement surface per UX spec line 818 | `not-applicable-iOS-OS-level-different` | `not-applicable-iOS-OS-level-different` | `[]` |
| `3.1.p3` | p3-push-notifications | (line 820) | `_PENDING-MEASUREMENT_` | `pending-measurement` | `[]` |
| `3.1.p4` | p4-offline-cache | (line 822) | `_PENDING-MEASUREMENT_` | `pending-measurement` | `[]` |
| `3.1.p5` | p5-list-performance | (line 824) | `_PENDING-MEASUREMENT_` | `pending-measurement` | `[]` |
| `3.1.p6` | p6-no-blocking-deps | (line 826) | `_PENDING-MEASUREMENT_` | `pending-measurement` | `[]` |

#### Pattern `shradhanjali-sahyog-vivran`

| Cell ID | Criterion | Target threshold | observed_value | pass_fail_verdict | evidence_links |
|---|---|---|---|---|---|
| `3.2.p1` | p1-devanagari | (line 816) | `_PENDING-MEASUREMENT_` | `pending-measurement` | `[]` |
| `3.2.p2` | p2-upi-intent | (line 818) — iPhone P2 carve-out per `experiment-protocol.md` §5.3 + §6.2; iPhone iOS UPI Intent behavior is OS-level different; Android target is the load-bearing measurement surface per UX spec line 818 | `not-applicable-iOS-OS-level-different` | `not-applicable-iOS-OS-level-different` | `[]` |
| `3.2.p3` | p3-push-notifications | (line 820) | `_PENDING-MEASUREMENT_` | `pending-measurement` | `[]` |
| `3.2.p4` | p4-offline-cache | (line 822) | `_PENDING-MEASUREMENT_` | `pending-measurement` | `[]` |
| `3.2.p5` | p5-list-performance | (line 824) | `_PENDING-MEASUREMENT_` | `pending-measurement` | `[]` |
| `3.2.p6` | p6-no-blocking-deps | (line 826) | `_PENDING-MEASUREMENT_` | `pending-measurement` | `[]` |

#### Pattern `panchayat-noticeboard`

| Cell ID | Criterion | Target threshold | observed_value | pass_fail_verdict | evidence_links |
|---|---|---|---|---|---|
| `3.3.p1` | p1-devanagari | (line 816) | `_PENDING-MEASUREMENT_` | `pending-measurement` | `[]` |
| `3.3.p2` | p2-upi-intent | (line 818) — iPhone P2 carve-out per `experiment-protocol.md` §5.3 + §6.2; iPhone iOS UPI Intent behavior is OS-level different; Android target is the load-bearing measurement surface per UX spec line 818 | `not-applicable-iOS-OS-level-different` | `not-applicable-iOS-OS-level-different` | `[]` |
| `3.3.p3` | p3-push-notifications | (line 820) | `_PENDING-MEASUREMENT_` | `pending-measurement` | `[]` |
| `3.3.p4` | p4-offline-cache | (line 822) | `_PENDING-MEASUREMENT_` | `pending-measurement` | `[]` |
| `3.3.p5` | p5-list-performance | (line 824) | `_PENDING-MEASUREMENT_` | `pending-measurement` | `[]` |
| `3.3.p6` | p6-no-blocking-deps | (line 826) | `_PENDING-MEASUREMENT_` | `pending-measurement` | `[]` |

**Cell count audit:** 3 devices × 3 patterns × 6 criteria = **54 cells**. Verified.

## §4 Per-criterion target-threshold reference

Verbatim from UX spec §6 lines 814-826. The threshold is the AC's load-bearing pass-fail boundary per the all-must-hold discipline (UX spec line 814 + `pass-criteria-evaluation-framework.md` §1).

- **P1 Devanagari rendering** (line 816): "Devanagari renders matras, conjuncts, and ligatures correctly across the three named patterns" — visual inspection by BigDev + ≥1 Hindi-belt reader per `experiment-protocol.md` §6.1
- **P2 UPI Intent integration** (line 818): "UPI Intent `upi://pay?` URL launches default UPI app (PhonePe + GPay + BHIM), return-handoff preserves session + My Pool context, UTR clipboard paste reliable" per `experiment-protocol.md` §6.2
- **P3 Push notifications** (line 820): "≥95% delivery success rate and p95 delivery latency ≤5 seconds when network available" under intermittent 4G simulation per `experiment-protocol.md` §6.3
- **P4 Offline cache** (line 822): "Read-only access to My Pool + contribution history + claim status accessible after initial sync without network + pull-to-refresh on reconnect" via MMKV persister per `experiment-protocol.md` §6.4
- **P5 List performance** (line 824): "Shradhanjali contributor scroll at 200+ entries renders at 60 fps target / 30 fps minimum on the older entry-level Android device" per `experiment-protocol.md` §6.5
- **P6 No blocking external dependencies** (line 826): "Tamagui or React Native community responses not required for forward progress within the ~2-week timebox" per `experiment-protocol.md` §6.6

## §5 Evidence-capture protocol

Per-criterion evidence types stored under `_bmad-output/research/p0-5-native-stack-validation-evidence/<device-subdir>/` per epics line 936:

| Criterion | Evidence type | File-naming convention |
|---|---|---|
| P1 Devanagari | Screenshots of rendered patterns + audio recording of Hindi-belt reader review | `p1-<device-slug>-<pattern-slug>-<timestamp>.png` + `p1-hindi-reader-review-<participant-pseudonym>-<timestamp>.mp3` |
| P2 UPI Intent | Video recording of UPI Intent round-trip per device × UPI app (PhonePe + GPay + BHIM) | `p2-<device-slug>-<pattern-slug>-<upi-app>-<timestamp>.mp4` |
| P3 Push notifications | Batch-test CSV with per-notification rows (timestamp + delivery-status + delivery-latency) | `p3-<device-slug>-<pattern-slug>-batch-<batch-id>-<timestamp>.csv` |
| P4 Offline cache | Video recording of airplane-mode cycle (pre-airplane → airplane-on → cold-restart → read-only verification → airplane-off → pull-to-refresh) | `p4-<device-slug>-<pattern-slug>-airplane-cycle-<timestamp>.mp4` |
| P5 List performance | Profiler-trace export (React DevTools profiler JSON + Android GPU profiler trace + iOS Instruments .trace bundle) | `p5-<device-slug>-<pattern-slug>-profiler-<tool>-<timestamp>.<ext>` |
| P6 Timebox tracker | Daily timebox-log entries with blocking-event timestamps + per-event description + mitigation outcome | `p6-timebox-tracker-<YYYY-MM-DD>.md` (consolidated across devices/patterns) |

**Evidence-capture discipline:**

- All evidence stored under `_bmad-output/research/p0-5-native-stack-validation-evidence/<device-subdir>/` with per-device subfolders (`device-mid-range-snapdragon-4-series-android/`, `device-entry-level-2gb-android-11/`, `device-iphone-ios-16-minimum/`)
- Evidence file paths populated in the `evidence_links` field of each cell at Task 10
- Hindi-belt reader audio recordings collected under participant-consent per Story 0.8/0.9/0.10 ethics-protocol §3 cross-coupling (recruitment from P0-2 field work per UX spec line 816 + `experiment-protocol.md` §6.1)

## §6 Cross-link

- `experiment-protocol.md` §6 Per-criterion measurement procedure — operational protocol for each measurement session
- `pass-criteria-evaluation-framework.md` §1 all-must-hold + §2 more-protective-governs + §3 verdict aggregation rule + §6 silent-pass forbidden rule
- `ratify-decision-template.md` §2 Per-criterion evidence summary + §3 Per-device evidence summary
- `device-procurement-roster.md` — `device_id` foreign-key for each cell
- `_bmad-output/research/p0-5-native-stack-validation.md` §5 — mirror 54-cell matrix in research artifact (populated at Task 10)
- `engagement-ledger.md` §6 Measurement-execution log — per-device × per-pattern measurement session date + evidence-captured links + observed-value summaries
