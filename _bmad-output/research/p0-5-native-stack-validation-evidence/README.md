# P0-5 Native-Stack Validation — Evidence Subdir

**Purpose:** per-device subfolders for screenshot + video + profiler-trace + CSV + audio-recording artifacts captured during Task 10 measurement collection per Story 0.14.

**Authority cites:** epics line 936 (AC-named research artifact + evidence subdir convention); `docs/native-stack-validation/measurement-template.md` §5 (evidence-capture protocol); Decision 2026-06-02-014.

## Subdirectories

| Subdirectory | Device class | Procurement reference |
|---|---|---|
| `device-mid-range-snapdragon-4-series-android/` | Mid-range Snapdragon 4-series Android with 3 GB RAM per UX spec line 810 | `docs/native-stack-validation/device-procurement-roster.md` Row 1 |
| `device-entry-level-2gb-android-11/` | Older entry-level Android with 2 GB RAM + Android 11 per UX spec line 811 — **load-bearing for P5** per UX spec line 824 | `docs/native-stack-validation/device-procurement-roster.md` Row 2 |
| `device-iphone-ios-16-minimum/` | iPhone at iOS 16+ floor per UX spec line 812 + architecture line 2821 | `docs/native-stack-validation/device-procurement-roster.md` Row 3 |

## Evidence-capture protocol

Per `docs/native-stack-validation/measurement-template.md` §5:

| Criterion | Evidence type | File-naming convention |
|---|---|---|
| P1 Devanagari | Screenshots + Hindi-belt reader audio | `p1-<device-slug>-<pattern-slug>-<timestamp>.png` + `p1-hindi-reader-review-<pseudonym>-<timestamp>.mp3` |
| P2 UPI Intent | Video recording per UPI app | `p2-<device-slug>-<pattern-slug>-<upi-app>-<timestamp>.mp4` |
| P3 Push notifications | Batch-test CSV | `p3-<device-slug>-<pattern-slug>-batch-<batch-id>-<timestamp>.csv` |
| P4 Offline cache | Video recording of airplane-mode cycle | `p4-<device-slug>-<pattern-slug>-airplane-cycle-<timestamp>.mp4` |
| P5 List performance | Profiler-trace exports | `p5-<device-slug>-<pattern-slug>-profiler-<tool>-<timestamp>.<ext>` |
| P6 Timebox tracker | Daily log entries (consolidated, not per-device) | `../p6-timebox-tracker-<YYYY-MM-DD>.md` |

## Consent + privacy discipline

- Hindi-belt reader audio recordings collected under participant-consent per Story 0.8/0.9/0.10 ethics-protocol §3 cross-coupling (recruitment from P0-2 field work per UX spec line 816 + `docs/native-stack-validation/experiment-protocol.md` §6.1)
- Audio files use participant pseudonym (e.g., `Hindi-Reader-1`, `Hindi-Reader-1A` substitute per Story 0.9 P-07 precedent)
- Video recordings are Solo Builder self-recorded (no participant identifiers); UPI app screens may capture mock-payment data only (sandbox UPI envelope per architecture §3)

## Author-commit status

Subdirectories created at Task 6 author-commit (empty). Substantive evidence files captured at Task 10 measurement collection.
