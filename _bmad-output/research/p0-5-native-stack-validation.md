# P0-5 Native-Stack Validation — Research Artifact

**Authority cites:** epics line 936 (AC-named research artifact location); UX spec line 111 (P0-5 launch-blocker); UX spec lines 795-854 (§6 Phase-0 Native-Stack Validation Experiment full specification); epics line 688 (Epic 0 Deliverable P0-5); epics line 693 (Epic 0 demoable closure); epics line 376 UX-DR6; architecture line 4784 (§Launch Gate Risks P0-5 row); architecture line 331 AR-49; architecture lines 150-152 (native-mobile-stack deferred-decision); architecture lines 4873-4878 (§PoC Validation Pending); Decision 2026-06-02-014.

## §1 Header

| Field | Value |
|---|---|
| Status | `Author-committed scaffolding; awaiting Tasks 8-11 substantive measurement + ratify-or-pivot decision` |
| Authority cites | UX spec line 111 + UX spec lines 795-854 + epics line 688 + 564 + 693 + 376 (UX-DR6) + architecture line 4784 + architecture line 331 (AR-49) + architecture lines 150-152 + architecture lines 4873-4878 |
| Owning Story | Story 0.14 |
| Framework | `docs/native-stack-validation/` |
| Decision-log entry | `.decision-log.md` Decision 2026-06-02-014 |
| Author-commit date | 2026-06-02 |
| Substantive measurements at | Task 10 (`_AWAITING EXTERNAL ACTION_`) |
| Ratify-or-pivot decision at | Task 11 (`_AWAITING EXTERNAL ACTION_`) |

## §2 Three named patterns

Per UX spec lines 805-807 verbatim + UX §8 Component System (UX spec lines 1156-1158):

### §2.1 Yogdaan Bahi — contribution-history list

Per UX spec line 805 + UX §8 Passbook row pattern (UX spec line 1156). ≥50 row entries scrollable; row structure: 56pt fixed height + hairline rule separator + column structure date 100pt + sahyog flex + pool 64pt + amount 96pt; 5th-row heavier rule; sticky footer with running tally; tabular monospace amounts per UX spec line 805. Hindi-numerals discipline per UX spec line 1127 (operational surfaces use Gregorian + Latin numerals; NOT Hindi numerals stacked over Gregorian dates).

Visual grammar cross-reference: UX spec §5 lines 447-507 (three named patterns); UX spec §8 line 1156 Passbook row pattern.

### §2.2 Shradhanjali Sahyog Vivran — per-claim memorial page

Per UX spec line 806 + UX §8 Memorial column pattern (UX spec line 1157). Max-width 360pt mobile + 480pt desktop; bordered portrait + parichay + kinship lattice; contributor scroll rendered at 200+ entries to exercise list virtualization (FlatList → FlashList threshold per architecture line 2913); *दो शब्द स्मृति में* input field per UX spec line 806 + UX spec line 1157. Memorial header dates MAY render Hindi numerals per UX spec line 1122 (memorial Devanagari prose carve-out).

Visual grammar cross-reference: UX spec §5 + UX spec §8 line 1157 Memorial column pattern.

### §2.3 Panchayat Noticeboard — home-screen layout

Per UX spec line 807 + UX §8 Noticeboard strip pattern (UX spec line 1158). Full-width with hairline section separators; vertical stack only (no horizontal carousels); section-header letter-spaced caps; pinned-section rows with 4pt colored left-stub; pinned notices + recent-closings rows + stat strip per UX spec line 807. FR-19 celebration framing.

Visual grammar cross-reference: UX spec §5 + UX spec §8 line 1158 Noticeboard strip pattern.

## §3 Three test devices

Per UX spec lines 810-812 verbatim + architecture line 2821 device-support matrix:

| # | device_id | target_spec | Load-bearing for |
|---|---|---|---|
| 1 | `device-mid-range-snapdragon-4-series-android` | UX spec line 810: "Mid-range Snapdragon 4-series Android (target device class; 3 GB RAM)" + architecture line 2821 floor | Floor performance baseline + Yogdaan Bahi 50-row scroll + Panchayat Noticeboard home-screen |
| 2 | `device-entry-level-2gb-android-11` | UX spec line 811: "Older entry-level Android (2 GB RAM, Android 11)" | **P5 list-performance measurement** per UX spec line 824 (200+ Shradhanjali contributor entries on this specific device class) |
| 3 | `device-iphone-ios-16-minimum` | UX spec line 812: "iPhone at the target iOS minimum version" + architecture line 2821 = iOS 16+ | iOS substrate validation; P2 UPI Intent has OS-level-different carve-out per UX spec line 818 |

Substantive procurement at Task 8; see `docs/native-stack-validation/device-procurement-roster.md`.

## §4 Six pass criteria P1-P6

Verbatim from UX spec lines 814-826 + epics line 376 (UX-DR6):

| Criterion | Verbatim threshold (UX spec) | Measurement procedure |
|---|---|---|
| P1 Devanagari rendering | "Devanagari renders matras, conjuncts, and ligatures correctly" (line 816); visual inspection by BigDev + ≥1 Hindi-belt reader (recruit during P0-2 field work) | `docs/native-stack-validation/experiment-protocol.md` §6.1 |
| P2 UPI Intent integration | "UPI Intent `upi://pay?` URL launches default UPI app (PhonePe + GPay + BHIM), return-handoff preserves session + My Pool context, UTR clipboard paste reliable" (line 818) | `docs/native-stack-validation/experiment-protocol.md` §6.2 |
| P3 Push notifications | "≥95% delivery success rate and p95 delivery latency ≤5 seconds when network available" (line 820) under intermittent 4G simulation | `docs/native-stack-validation/experiment-protocol.md` §6.3 |
| P4 Offline cache | "Read-only access to My Pool + contribution history + claim status accessible after initial sync without network + pull-to-refresh on reconnect" via MMKV persister (line 822) | `docs/native-stack-validation/experiment-protocol.md` §6.4 |
| P5 List performance | "Shradhanjali contributor scroll at 200+ entries renders at 60 fps target / 30 fps minimum on the older entry-level Android device" (line 824) | `docs/native-stack-validation/experiment-protocol.md` §6.5 |
| P6 No blocking external dependencies | "Tamagui or React Native community responses not required for forward progress within the ~2-week timebox" (line 826) | `docs/native-stack-validation/experiment-protocol.md` §6.6 |

**All-must-hold discipline** per UX spec line 814 + `docs/native-stack-validation/pass-criteria-evaluation-framework.md` §1.

## §5 54-cell measurement matrix

Mirror of `docs/native-stack-validation/measurement-template.md` §3. All 54 cells pre-staged at author-commit with `_PENDING-MEASUREMENT_` literal; substantive observed-value + evidence-links land at Task 10.

| Device | Pattern | P1 | P2 | P3 | P4 | P5 | P6 |
|---|---|---|---|---|---|---|---|
| Device 1 (mid-range Android) | Yogdaan Bahi | `_PENDING-MEASUREMENT_` | `_PENDING-MEASUREMENT_` | `_PENDING-MEASUREMENT_` | `_PENDING-MEASUREMENT_` | `_PENDING-MEASUREMENT_` | `_PENDING-MEASUREMENT_` |
| Device 1 | Shradhanjali Sahyog Vivran | `_PENDING-MEASUREMENT_` | `_PENDING-MEASUREMENT_` | `_PENDING-MEASUREMENT_` | `_PENDING-MEASUREMENT_` | `_PENDING-MEASUREMENT_` | `_PENDING-MEASUREMENT_` |
| Device 1 | Panchayat Noticeboard | `_PENDING-MEASUREMENT_` | `_PENDING-MEASUREMENT_` | `_PENDING-MEASUREMENT_` | `_PENDING-MEASUREMENT_` | `_PENDING-MEASUREMENT_` | `_PENDING-MEASUREMENT_` |
| Device 2 (entry-level Android 11) | Yogdaan Bahi | `_PENDING-MEASUREMENT_` | `_PENDING-MEASUREMENT_` | `_PENDING-MEASUREMENT_` | `_PENDING-MEASUREMENT_` | `_PENDING-MEASUREMENT_` | `_PENDING-MEASUREMENT_` |
| Device 2 | Shradhanjali Sahyog Vivran | `_PENDING-MEASUREMENT_` | `_PENDING-MEASUREMENT_` | `_PENDING-MEASUREMENT_` | `_PENDING-MEASUREMENT_` | `_PENDING-MEASUREMENT_` **LOAD-BEARING per UX line 824** | `_PENDING-MEASUREMENT_` |
| Device 2 | Panchayat Noticeboard | `_PENDING-MEASUREMENT_` | `_PENDING-MEASUREMENT_` | `_PENDING-MEASUREMENT_` | `_PENDING-MEASUREMENT_` | `_PENDING-MEASUREMENT_` | `_PENDING-MEASUREMENT_` |
| Device 3 (iPhone iOS 16+) | Yogdaan Bahi | `_PENDING-MEASUREMENT_` | `_PENDING-MEASUREMENT_` (iPhone P2 carve-out per UX line 818) | `_PENDING-MEASUREMENT_` | `_PENDING-MEASUREMENT_` | `_PENDING-MEASUREMENT_` | `_PENDING-MEASUREMENT_` |
| Device 3 | Shradhanjali Sahyog Vivran | `_PENDING-MEASUREMENT_` | `_PENDING-MEASUREMENT_` (P2 carve-out) | `_PENDING-MEASUREMENT_` | `_PENDING-MEASUREMENT_` | `_PENDING-MEASUREMENT_` | `_PENDING-MEASUREMENT_` |
| Device 3 | Panchayat Noticeboard | `_PENDING-MEASUREMENT_` | `_PENDING-MEASUREMENT_` (P2 carve-out) | `_PENDING-MEASUREMENT_` | `_PENDING-MEASUREMENT_` | `_PENDING-MEASUREMENT_` | `_PENDING-MEASUREMENT_` |

**Cell count audit**: 54 cells (3 × 3 × 6). Verified.

## §6 Per-device evidence section

Per-device evidence stored under `_bmad-output/research/p0-5-native-stack-validation-evidence/<device-subdir>/` per epics line 936. Sub-folders pre-created at Task 6 author-commit.

### §6.1 device-mid-range-snapdragon-4-series-android

`_PENDING-EVIDENCE-CAPTURE_` (Task 10)

**Expected evidence types** (per `docs/native-stack-validation/measurement-template.md` §5):

- Screenshots of rendered patterns (P1)
- Video recordings of UPI Intent round-trip (P2)
- Batch-test CSV (P3)
- Video recording of airplane-mode cycle (P4)
- Profiler-trace export (P5)

### §6.2 device-entry-level-2gb-android-11

`_PENDING-EVIDENCE-CAPTURE_` (Task 10)

**Expected evidence types**: as §6.1, **with P5 profiler-trace as the load-bearing artifact** (200+ Shradhanjali contributor entries at 60 fps target / 30 fps minimum per UX spec line 824).

### §6.3 device-iphone-ios-16-minimum

`_PENDING-EVIDENCE-CAPTURE_` (Task 10)

**Expected evidence types**: as §6.1, with P2 cells carrying `not-applicable-iOS-OS-level-different` carve-out evidence (documented rationale per UX spec line 818).

## §7 Per-criterion evidence section

`_PENDING-EVIDENCE-CAPTURE_` (Task 10)

### §7.1 P1 Devanagari rendering

- BigDev visual-inspection notes per device × pattern (9 inspection sessions)
- Hindi-belt reader review session ≤30 minutes per UX spec line 816
  - Recruitment path: P0-2 field work participant (Story 0.8 P0-2a teacher OR Story 0.9 P0-2b bereaved spouse Bihar Vaishali-district) who consents to a separate ≤30-minute Devanagari rendering review session
  - Consent per Story 0.8/0.9/0.10 ethics-protocol §3 cross-coupling
- Audio recording of Hindi-belt reader review session (consent-bound)
- Per-role per-device fallback ladder activation notes if rendering issues surface (Tiro/Yatra/Mukta + Noto/Hind/Mukta + Plex Mono/Sans+tnum per UX spec lines 712-714 + 1129)

### §7.2 P2 UPI Intent integration

- Test logs with PhonePe + GPay + BHIM
- Per-Android-device × per-UPI-app × per-pattern test result (3 devices × 3 apps × 3 patterns − iPhone carve-out = 18 substantive cells)
- Video recordings of `upi://pay?` URL launch + return-handoff + UTR paste

### §7.3 P3 Push notifications

- Batch-test CSV with timestamp + delivery-status + delivery-latency per notification
- Aggregate computation: delivery success rate % + p95 latency seconds
- FCM Android + APNs iOS infrastructure configuration notes

### §7.4 P4 Offline cache

- Airplane-mode cycle test logs per device × pattern
- MMKV persister configuration notes (per architecture §4.5)
- TanStack Query persistQueryClient configuration

### §7.5 P5 List performance

- Profiler-trace exports from React DevTools + Android GPU profiler + iOS Instruments
- FlatList tuning vs FlashList comparison notes
- 200+ entry test fixture seeding for Shradhanjali contributor scroll
- FlatList → FlashList threshold value determination (P0-5 output per architecture line 2913)

### §7.6 P6 No blocking external dependencies

- Daily timebox-log entries per `docs/native-stack-validation/engagement-ledger.md` §5
- Per-event description + duration + mitigation attempt + outcome
- Cumulative blocking-time across ~2-week timebox

## §8 FM-2 escalation trace

`<TO-BE-AUTHORED-AT-TASK-11>` — populated if any P-criterion fails

**Schema** per `docs/native-stack-validation/ratify-decision-template.md` §4 + `docs/native-stack-validation/pivot-evaluation-decision-tree.md`:

- Triggering cell ID + criterion + device + pattern
- Fail verdict observed value
- F-criterion activated (F1-F5)
- Mitigation attempts + outcomes per `experiment-protocol.md` §8 candidates
- Final outcome (mitigated-pass | fail-after-exhausted-mitigation)

## §9 Ratify-or-pivot decision proposal

`<TO-BE-AUTHORED-AT-TASK-11>`

**Schema** per `docs/native-stack-validation/ratify-decision-template.md`:

- §1 Decision outcome (ratify | pivot | mitigated-then-ratify)
- §2 Per-criterion evidence summary
- §3 Per-device evidence summary
- §4 FM-2 escalation trace (if applicable)
- §5 Substrate-binding-language for Epic 1
- §6 Trustee acknowledgement record (≥1-trustee)
- §7 Re-litigation discipline

## §10 Trustee acknowledgement record

`<TO-BE-AUTHORED-AT-TASK-11>`

**Schema**:

- Date
- Acknowledging trustees (≥1 per UX spec line 845 BigDev decision authority)
- Decision outcome acknowledged
- Substrate-binding name
- Trustee notes
- Cross-reference to `.decision-log.md` Decision 2026-06-02-014 supersession entry

## §11 Cross-link to Decision 2026-06-02-014

- **Author-commit entry**: `.decision-log.md` Decision 2026-06-02-014 (appended at top of "## Decisions" section at Task 6 author-commit; status = "Author-committed; awaiting Tasks 7-11")
- **Supersession entry**: `.decision-log.md` Decision 2026-06-02-014 (re-author at Task 11 with substantive ratify-or-pivot outcome; supersession marker; status = "Acknowledged YYYY-MM-DD by [trustees]; substrate-binding for v1 is [substrate-name]")
- **ADR**: `docs/knowledge-transfer/adr-index.md` line 52 ADR-NNNN-native-mobile-stack-ratify slot — `slot-reserved-pre-write` at author-commit; substantive content at Task 11 per architecture §Implementation Handoff PR-2 ADR-transcription discipline
- **Architecture amendments at Task 11**:
  - architecture line 4784 §Launch Gate Risks P0-5 row flip from `open` to `closed`
  - architecture lines 150-152 §Deferred Decisions native-mobile-stack row amendment from "working-assumption" to "ratified-with-evidence" (or "pivoted-with-FM-2-trace")

## §12 Cross-Story coupling

- **Story 0.10 P0-2c PRECONDITION-2** prototype-operability (Task 11 closure unblock signal)
- **Story 0.12 P0-3 reconciliation** device-procurement budget (Task 7 ratification cross-coupling)
- **Story 0.13 P0-4 legal counsel concurrent-review** (both Story 0.13 + 0.14 must close before Epic 1 substrate work begins per epics line 564)
- **Story 0.15 architectural launch-gate inventory** (architecture line 4784 closure-evidence path)
- **Epic 1 Story 1.1 substrate-bootstrap** (epics line 990 precondition consumer)
