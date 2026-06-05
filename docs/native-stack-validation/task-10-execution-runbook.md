# Task 10 Execution Runbook — P0-5 Measurement Day-by-Day Sequence

**Audience:** Solo Builder executing the Task 10 measurement phase per Story 0.14 P0-5 Native-Stack Validation.

**Purpose:** Operationalize `experiment-protocol.md §6` (per-criterion procedure) + `measurement-template.md §3` (54-cell matrix schema) into a day-by-day execution sequence for Days 10-14 of the Task 9 prototype-build timebox.

This runbook does NOT duplicate the protocol or template — it sequences them. For procedure detail, cross-reference the cited sections.

---

## §1 Pre-flight prerequisites (Day 9 complete; checklist before Day 10 begins)

Before Day 10 work begins, verify each item:

- [ ] **Branch state** — currently on `story-0.14-p0-5-prototype` at Day 9 HEAD (`c34a83a`)
- [ ] **Three devices in hand** — Redmi 10 + Redmi Note 8 + iPhone 12 per `device-procurement-roster.md §2`
- [ ] **Each device factory-clean** — cold-boot + factory-reset where applicable + clean Wi-Fi network connection
- [ ] **Android-11 baseline on Redmi Note 8** — original Android 9 release; MIUI upgrade path to Android 11 applied; verify via Settings → About phone
- [ ] **iOS version on iPhone 12** — verify ≥ iOS 16; record exact version in `engagement-ledger.md §4 device_procurement_events.iphone-12.os_version_at_task_8`
- [ ] **Network Link Conditioner** available on iOS for throttled-cellular simulation (Xcode → Open Developer Tool → Network Link Conditioner; or via the Settings → Developer pane on enrolled iOS devices)
- [ ] **Android Developer Options** enabled on both Android devices for cellular throttling (Settings → About phone → tap Build number 7 times)
- [ ] **Screen recording tool** ready (built-in screen record on both Android and iOS suffices for the prototype scope)
- [ ] **Receipts archive path** created at `_bmad-output/research/p0-5-native-stack-validation-evidence/<device>/` per-device subfolder for each device
- [ ] **Hindi-belt reader recruitment** initiated for P1 review session per `experiment-protocol.md §6.1` (P0-2 field-work participants preferred; any native Hindi reader acceptable per documented fallback)

---

## §2 Day 10 — Apple Developer Program enrollment + Firebase + APNs (external dependencies)

**Goal:** unblock the remote-FCM/APNs subset of P3 measurement cells.

### §2.1 Apple Developer Program enrollment

- [ ] Enroll at https://developer.apple.com/programs/enroll/ — Individual account
- [ ] Pay annual fee (~₹9,900 / USD 99) from trustee own fund per Decision 2026-06-05-030 Q14.2
- [ ] Record enrollment date + actual INR fee in `engagement-ledger.md §4 device_procurement_events.iphone-12.apple_developer_program_enrollment_date` + `apple_developer_program_annual_fee_inr`
- [ ] Archive Apple invoice/receipt to `<trustee-accessible-repo-path>` per the ledger field

### §2.2 APNs key (iOS push)

- [ ] In Apple Developer portal → Certificates, Identifiers & Profiles → Keys → create new APNs Auth Key (.p8)
- [ ] Download the .p8 file + record the Key ID + Team ID
- [ ] **Do NOT commit the .p8 to git** — store at a trustee-accessible secure location per the `_envelope-template.md` discipline (high-sensitivity envelope class per Decision 2026-06-05-018)
- [ ] Configure either (a) Expo backend with APNs credentials at https://expo.dev/, OR (b) custom backend using expo-server-sdk + APNs key

### §2.3 Firebase project + google-services.json (Android FCM)

- [ ] Create a Firebase project at https://console.firebase.google.com/ — name "twt-p0-5-prototype" (throwaway; not for production)
- [ ] Add an Android app with package name `org.teacherswelfaretrust.p0prototype` (matches `app.json` Android.package)
- [ ] Download `google-services.json` from Firebase console
- [ ] Place at `apps/mobile/google-services.json`
- [ ] Add `apps/mobile/google-services.json` to `.gitignore` if it isn't already (the file contains project secrets)
- [ ] Run `pnpm dlx expo prebuild --clean` to regenerate `android/` with FCM config baked in

### §2.4 Verify Day 10 readiness

After completing §2.1-§2.3, the P3 measurement matrix expands from:
- Local-notif subset: 3 cells armed
- Remote-FCM-Android subset: deferred → **2 cells armed**
- Remote-APNs-iOS subset: deferred → **1 cell armed**

Total P3 cells armed: 9 (matching 3 devices × 3 patterns per the original 54-cell matrix).

---

## §3 Day 11-12 — Per-device cold-boot + prototype install + smoke test

**Goal:** verify each device runs the prototype end-to-end before measurement begins.

### §3.1 Build the dev client per device

For each device, run:

```bash
cd apps/mobile
pnpm dlx expo run:android   # for Redmi 10 + Redmi Note 8
pnpm dlx expo run:ios       # for iPhone 12 (requires Xcode + Apple Dev cert from §2.1)
```

The first `expo run:android` per Android device builds + installs the dev client. iOS requires the device to be enrolled in the Apple Dev account.

### §3.2 Smoke test per device (≤10 min per device)

For each device, after install:

- [ ] App launches without crash
- [ ] All three tabs (Yogdaan Bahi / Shradhanjali / Panchayat) are reachable
- [ ] Yogdaan Bahi renders 60 rows scrollable + sticky footer total visible
- [ ] Shradhanjali renders memorial portrait + name + parichay + kinship + 250 contributors scrollable
- [ ] Panchayat renders top strip + stat-line + pinned items + recent closings + P3 diagnostic panel
- [ ] Devanagari glyphs visible across all three patterns (gross check — actual P1 measurement is §4)
- [ ] No layout-breaking errors visible

Record per-device smoke-test outcome in `engagement-ledger.md §6 Measurement-execution log` as the first row per device, with `criteria_measured: smoke-test` + `notes: pre-measurement-baseline`.

### §3.3 Populate `received_and_verified_date`

After each device's smoke test passes, update `engagement-ledger.md §4 device_procurement_events.<device>.received_and_verified_date` with today's date.

If a device fails smoke test, follow §1 schema mid-experiment-re-procurement-path in `device-procurement-roster.md` (replacement under original budget envelope).

---

## §4 Day 13 — Measurement execution (54 cells)

**Goal:** populate every cell in `measurement-template.md §3` with `observed_value` + `pass_fail_verdict` + `evidence_links`.

**Execution sequence — batched by criterion** to minimize device-switching overhead (per device, run all six criteria sequentially before moving to next device).

### §4.1 Per-device measurement loop

For each of the three devices (Redmi 10 → Redmi Note 8 → iPhone 12):

#### Setup (≤5 min)
- [ ] Open `_bmad-output/research/p0-5-native-stack-validation-evidence/<device>/` evidence folder
- [ ] Start screen recording (background recording for the whole session — easier to extract clips than re-record)
- [ ] Verify dev client running latest scratchpad-branch build (rebuild if needed via `pnpm dlx expo run:<platform>`)
- [ ] Network in normal mode (will switch to throttled per-criterion below)

#### P1 — Devanagari rendering (per `experiment-protocol.md §6.1`)
- [ ] Walk through all 3 patterns; screenshot each pattern's main surface
- [ ] Walk through Shradhanjali contributor scroll — screenshot at least 3 different scroll positions (top, middle around contributor #125, bottom)
- [ ] Solo Builder visual inspection: mark each cell pass/fail/mitigated
- [ ] Schedule a separate ≤30-min session with Hindi-belt reader for the 3 patterns × this device (if reader can do all 3 devices in one session that's more efficient — record audio per Story 0.8/0.9/0.10 ethics-protocol §3)
- [ ] Per FM-2 disposition (§4 of device-procurement-roster), tag P1 cells for Redmi 10 with `mali-gpu-not-adreno-baseline` caveat in `measurement-template.md`

**Evidence per cell:** screenshots saved to `<device>/p1-<pattern>-<timestamp>.png`; audio of Hindi-belt reader review saved separately

#### P2 — UPI Intent (per `experiment-protocol.md §6.2`)
- [ ] On Android devices only (iOS cells = N/A per UX spec line 818)
- [ ] Open Shradhanjali tab → scroll to footer → tap "योगदान दें"
- [ ] Verify the UPI app chooser appears OR a UPI app launches directly
- [ ] Test 3 scenarios per Android device: PhonePe / GPay / BHIM (install each from Play Store if needed)
- [ ] Tap-through the contribution flow in each UPI app (do not actually pay — abort at the confirmation screen)
- [ ] Return to TWT app + verify Shradhanjali tab is still on the same memorial (session preservation per architecture line 90)
- [ ] If `canOpenURL` returns false on Android 11+ but `openURL` still launches the chooser: see `engagement-ledger.md §5 Day 7 deferred_caveats.android_11_queries_clause`
- [ ] iPhone P2 cells: tag `not-applicable-iOS-OS-level-different` per UX spec line 818

**Evidence per cell:** screen recording of each PhonePe/GPay/BHIM scenario; mark UPI app launched + return-handoff outcome per the P2 diagnostic indicator

#### P3 — Push notifications (per `experiment-protocol.md §6.3`)
- [ ] Open Panchayat tab → scroll to P3 diagnostic panel footer
- [ ] Tap "Request permission" → verify permission state appears in panel
- [ ] Tap "Get token" → verify token appears (expo or device platform-specific)
- [ ] **Local-notification subset (all 3 devices):**
  - [ ] Tap "Schedule 1" → verify notification fires within 6s
  - [ ] Tap "Schedule batch 5" → verify all 5 notifications fire within ~7s
  - [ ] Measure ack window (time-to-display) per notification; target ≤5s p95 per UX spec line 824
- [ ] **Remote-FCM-Android subset (Redmi 10 + Redmi Note 8 only, after Day 10 Firebase setup):**
  - [ ] From a separate dispatching script/tool, send a batch of 20 notifications via FCM to the device token from §3 above
  - [ ] Measure delivery rate (target ≥95%) + ack window (target ≤5s p95)
- [ ] **Remote-APNs-iOS subset (iPhone 12 only, after Day 10 Apple Dev enrollment):**
  - [ ] Same dispatch test via APNs key
  - [ ] Switch network to throttled 4G via Network Link Conditioner → repeat dispatch → measure delivery rate under degraded network

**Evidence per cell:** CSV log of dispatch timestamps + delivery timestamps; screen recording showing notifications arriving

#### P4 — Offline cache (per `experiment-protocol.md §6.4`)
- [ ] Open Yogdaan Bahi tab → verify "P4 cache: Cached at HH:MM:SS" strip shows current timestamp
- [ ] Force-quit app (swipe up from recents)
- [ ] Toggle airplane mode ON
- [ ] Reopen app + navigate to Yogdaan Bahi tab
- [ ] **Verify:** cache strip still shows the PRIOR timestamp + 60 rows render without network
- [ ] Toggle airplane mode OFF
- [ ] Pull-to-refresh on Yogdaan tab → verify strip updates to new timestamp
- [ ] Repeat for Shradhanjali + Panchayat tabs (cells N/A per Day 6 record — they don't use useQuery; mark cells N/A with rationale "useQuery not wired for this pattern in Day 6 scope")

**Evidence per cell:** screen recording of airplane-mode + cold-restart + cache-hit sequence

#### P5 — List performance (per `experiment-protocol.md §6.5`)
- [ ] On Redmi Note 8 (entry-level Android per UX spec line 824):
  - [ ] Open Shradhanjali tab
  - [ ] Scroll the contributor list at sustained ~150 px/s for 30 seconds
  - [ ] Capture frame-rate via React DevTools Profiler OR Android GPU Profiler
  - [ ] Target: 60 fps; minimum: 30 fps
  - [ ] **Caveat per Story 0.14 §4 FM-2 disposition:** Redmi Note 8 has 3-6 GB RAM, NOT the 2 GB RAM floor target. Tag P5 cell with `not-measured-on-2GB-floor` caveat per `deferred-work.md` Story 0.14 W-01
- [ ] On other devices (Redmi 10 + iPhone 12): same protocol; cross-device comparison data
- [ ] Yogdaan Bahi list (60 rows) is not load-bearing for P5; quick scroll check for completeness

**Evidence per cell:** profiler trace export saved to `<device>/p5-<pattern>-<timestamp>-profiler.json`; screen recording of sustained scroll

#### P6 — Timebox (per `experiment-protocol.md §6.6`)
- [ ] Per-day daily-log entry in `engagement-ledger.md §5` — already populated for Days 1-9
- [ ] At Task 10 close, verify Days 10-13 entries appended
- [ ] F4 velocity-fail check: any pattern requiring >3× target time? Document per `pivot-evaluation-decision-tree.md` F4 path

### §4.2 Cell verdict discipline (per `pass-criteria-evaluation-framework.md`)

For each cell, the verdict must be one of:
- `pass` — target threshold met without mitigation
- `mitigated-pass` — initial fail + mitigation applied + re-measurement passes (populate `mitigation_notes_if_fail` + `re_measurement_after_mitigation`)
- `fail` — target threshold not met after FM-2 mitigation exhausted (triggers Task 11 pivot decision per `pivot-evaluation-decision-tree.md` F1-F5 paths)
- `not-applicable` — cell not measurable on this device class (e.g., P2 iOS UPI Intent; populate rationale)
- `mitigated-pass-with-caveat` — meets threshold but with documented validity caveat (e.g., P5 on Redmi Note 8 tagged `not-measured-on-2GB-floor`; P1 on Redmi 10 tagged `mali-gpu-not-adreno-baseline`)

Per `[[feedback_closure_language_precision]]`: never collapse "mitigated-pass-with-caveat" with "pass". Task 11 ratify-decision must surface every caveat in the FM-2 escalation trace.

---

## §5 Day 14 — Task 11 ratify-or-pivot decision

**Goal:** author the substrate-binding decision per `ratify-decision-template.md` + `pivot-evaluation-decision-tree.md`.

### §5.1 All-must-hold + more-protective-governs evaluation

Per `pass-criteria-evaluation-framework.md`:
- **If every cell ∈ {pass, mitigated-pass, mitigated-pass-with-caveat, not-applicable-with-rationale}** → author **ratify decision**
- **If any cell = fail and FM-2 mitigation exhausted** → author **pivot decision** per the F1-F5 path triggered

### §5.2 Ratify decision authoring (happy path)

- [ ] Copy `ratify-decision-template.md` → `_bmad-output/research/p0-5-native-stack-validation.md §9`
- [ ] Populate with substrate-binding language: "Expo + React Native + Tamagui is the v1 native member-app substrate per Decision 2026-06-05-030 supersession entry"
- [ ] Cross-reference Days 1-9 commits (afe1310 → c34a83a on `story-0.14-p0-5-prototype`)
- [ ] Cross-reference per-criterion evidence in `_bmad-output/research/p0-5-native-stack-validation-evidence/`
- [ ] Document all FM-2 caveats from Days 1-9 + Task 10:
  - Day 1 FM-2 device-substitution (Redmi 10 Mali GPU; Redmi Note 8 3-6 GB RAM; iPhone 12 A14 best-case)
  - Day 2 FM-2 IBM Plex Mono Devanagari → IBM Plex Sans + tnum
  - Day 2 FM-2 Tiro weight 500 → Tiro weight 400
  - Day 3 FM-2 FlatList typing
  - Day 4 FM-2 FlashList typing
  - Day 6 FM-2 MMKV v4 API
  - Day 8 FM-2 expo-notifications permission typing
  - Task 10 P5 not-measured-on-2GB-floor caveat
  - Task 10 P1 Mali-GPU-not-Adreno-baseline caveat
- [ ] Submit to Trustee Panel per Q14.4 ≥1-trustee acknowledgment threshold

### §5.3 Pivot decision authoring (if needed)

If any cell remains `fail` after FM-2 mitigation:
- [ ] Identify which F-path triggered (F1 Devanagari / F2 UPI Intent / F3 push / F4 velocity / F5 platform-specific)
- [ ] Follow `pivot-evaluation-decision-tree.md` per the activated F-path
- [ ] Document substrate alternatives considered (likely Flutter per UX spec line 1129 "Substrate pivot to Flutter ... is the last resort after exhausted mitigation")
- [ ] Author **pivot decision** with FM-2 escalation trace + pivot-substrate-binding-language

### §5.4 Decision-log + ADR slot population

- [ ] Append `.decision-log.md` Decision 2026-06-02-014 supersession entry per Story 0.7 + 0.12 + 0.13 supersession schema:
  - Title: "Decision 2026-MM-DD-NNN: Story 0.14 P0-5 ratify decision — Expo+RN+Tamagui ratified" (or pivot variant)
  - Status: `Acknowledged YYYY-MM-DD by [trustees]; substrate-binding for v1 is Expo+RN+Tamagui`
  - Body: ratify/pivot outcome + per-criterion evidence summary + FM-2 caveats + Epic 1 Story 1.1 substrate-bootstrap-may-begin attestation
- [ ] Flip `docs/knowledge-transfer/adr-index.md` line 52 `ADR-NNNN-native-mobile-stack-ratify` slot from `slot-reserved-pre-write` to `committed`; author substantive ADR body
- [ ] Architecture §Launch Gate Risks P0-5 row at architecture line 4784: flip `open` → `closed` via PR-2 architecture-edit (Story 0.15 may close the architecture-edit; Story 0.14 produces closure-evidence)
- [ ] Architecture §Deferred Decisions native-mobile-stack row at architecture lines 150-152: amend via PR-2 from working-assumption to ratified-with-evidence (or pivoted-with-FM-2-trace)

### §5.5 Downstream unblock signals

After Day 14 ratify-decision closure:
- [ ] **Epic 1 Story 1.1 substrate-work** — precondition "Given Story 0.14's ratified substrate decision" structurally satisfied per epics line 990; Epic 1 substrate-bootstrap can begin
- [ ] **Story 0.10 P0-2c PRECONDITION-2** — prototype-operability artifacts available on ratified substrate; Story 0.10 VI/low-vision Hindi AT-walkthrough session can proceed per Decision 2026-05-31-010 + Decision 2026-06-05-030 Q14.3 sequencing
- [ ] Update `_bmad-output/implementation-artifacts/sprint-status.yaml` Story 0.14 entry from `in-progress` → `done`

---

## §6 Common gotchas + narrow fixes (likely to surface at Task 10)

### §6.1 Android 11+ `<queries>` clause for UPI canOpenURL
**Symptom:** P2 cells on Android 11+ device report `kind="unsupported"` in UPI diagnostic.
**Fix:** Add `expo-build-properties` `android.extraIntents` config in `app.json` OR custom config plugin declaring the `upi` scheme query. Re-run `pnpm dlx expo prebuild --clean`.
**Documented at:** `engagement-ledger.md §5 Day 7 deferred_caveats.android_11_queries_clause`.

### §6.2 react-native-mmkv requires CNG (not Expo Go)
**Symptom:** "Cannot find module 'react-native-mmkv'" at runtime if running in Expo Go.
**Fix:** Use `pnpm dlx expo run:android` / `run:ios` (dev client builds with native modules), NOT `pnpm start` + Expo Go.
**Documented at:** `engagement-ledger.md §5 Day 2 work_summary` (CNG workflow per architecture §4.5).

### §6.3 Tamagui v2 component imports look broken in TS
**Symptom:** `pnpm exec tsc --noEmit` reports "Module 'tamagui' has no exported member 'XStack'/'YStack'/etc" — 14 pre-existing errors.
**Fix:** Not blocking — Tamagui v2 babel plugin handles these at build time. Metro bundles correctly; runtime works. Documented as scaffold-noise per `engagement-ledger.md §5 Day 2 + Day 3` notes.

### §6.4 FlashList prop typing rejection under React 19 + new arch
**Symptom:** `pnpm exec tsc --noEmit` reports FlashList prop type mismatch.
**Fix:** Already applied in Shradhanjali via `(FlashList as any)` IIFE wrapper per Day 4 FM-2 mitigation. Runtime behavior unchanged.

### §6.5 expo-notifications permission status invisible to TypeScript
**Symptom:** `result.status` / `result.granted` / `result.canAskAgain` reported as missing.
**Fix:** Already applied via `CanonicalPermissionResult` cast in `lib/push-notifications.ts` per Day 8 FM-2 mitigation. Runtime API correct.

### §6.6 Apple Developer Program enrollment > 24 hours
**Symptom:** APNs key creation fails immediately after enrollment.
**Fix:** Apple takes up to 24 hours to fully activate accounts. Schedule Day 10 enrollment with buffer before Day 13 measurement.

### §6.7 Firebase project requires android.package match
**Symptom:** Push notifications via FCM fail with "MismatchSender" error.
**Fix:** Verify `apps/mobile/app.json` `android.package` (currently `org.teacherswelfaretrust.p0prototype`) matches the package name registered in Firebase project.

---

## §7 Cross-link

- `experiment-protocol.md §6` — per-criterion measurement procedure (detail)
- `measurement-template.md §3` — 54-cell matrix (where evidence + verdicts land)
- `pass-criteria-evaluation-framework.md` — verdict rules (all-must-hold + more-protective-governs)
- `pivot-evaluation-decision-tree.md` — FM-2 F1-F5 paths (if any cell fails)
- `ratify-decision-template.md` — Task 11 ratify decision authoring template
- `engagement-ledger.md §5` — daily log (Days 1-9 complete; Days 10-13 appended at Task 10 execution; Day 14 ratify event recorded)
- `device-procurement-roster.md §4` — FM-2 device-substitution disposition (caveat surfaces for P1 + P5)
- `_bmad-output/implementation-artifacts/deferred-work.md` Story 0.14 W-01/W-02/W-03 — Phase-1 pre-launch follow-on actions
- `.decision-log.md` Decision 2026-06-02-014 + 2026-06-05-030 — Story 0.14 author-commit + Tasks 7-11 ratification
