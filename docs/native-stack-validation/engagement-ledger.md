# Engagement Ledger — P0-5 Native-Stack Validation

**Authority cites:** UX spec line 845 (BigDev decision authority + binding-for-v1-substrate); epics line 941 (re-litigation discipline); architecture line 4784 P0-5 Launch Gate Risks row; architecture lines 150-152 native-mobile-stack deferred-decision; AR-49 architecture line 331; Decision 2026-06-02-014; cross-references to Stories 0.10 + 0.12 + 0.13 + Epic 1.

**Status:** Author-committed schema-only at Task 6; awaiting Trustee Panel scope + device-budget ratification (Task 7) + Solo Builder three-device procurement (Task 8) + ~2-week prototype build (Task 9) + measurement collection (Task 10) + ratify-or-pivot decision + Trustee Panel acknowledgement (Task 11).

## §1 Header

| Field | Value |
|---|---|
| Framework name | Native-Stack-Validation |
| Owning Story | Story 0.14 |
| Authority cites | UX spec line 111 + UX spec lines 795-854 + epics line 564 + 688 + 693 + 376 (UX-DR6) + architecture line 4784 + architecture line 331 (AR-49) + architecture lines 150-152 + architecture lines 4873-4878 + architecture §4.1 + §4.5 + §4.6 + §4.12; Decision 2026-06-02-014 |
| Author | Solo Builder (BigDev) via `bmad-dev-story` Story 0.14 execution |
| Author-commit date | 2026-06-02 |
| Author-commit status | `Author-committed; awaiting Trustee Panel scope + device-budget ratification (Task 7) + Solo Builder three-device procurement (Task 8) + ~2-week prototype build (Task 9) + measurement collection (Task 10) + ratify-or-pivot decision + Trustee Panel acknowledgement (Task 11)` |
| Trustee acknowledgement threshold | ≥1-trustee per BigDev decision authority per UX spec line 845 (distinct from prior Stories ≥2-trustee quorum; documented in `README.md` invariant 14 + §5) |
| Re-litigation threshold | ≥2-trustee ratification + new ADR per epics line 941 + `ratify-decision-template.md` §7 |

## §2 Lifecycle definition

Author-commit → scope-ratified → devices-procured → prototype-built → measurements-run → results-evaluated → ratify-or-pivot-decision-proposed → trustee-acknowledged → Epic 1 substrate-work unblocked → Story 0.10 P0-2c PRECONDITION-2 unblocked.

| Phase | Task | Status |
|---|---|---|
| Author-commit | Task 1-6 | **Closed by [edit]** 2026-06-02 |
| Scope-ratified | Task 7 | `_AWAITING EXTERNAL ACTION_` (Trustee Panel experiment-scope + device-procurement-budget ratification cross-coupled with Story 0.12) |
| Devices-procured | Task 8 | `_AWAITING EXTERNAL ACTION_` (Solo Builder three-device procurement) |
| Prototype-built | Task 9 | `_AWAITING EXTERNAL ACTION_` (Solo Builder ~2-week Expo + RN + Tamagui prototype) |
| Measurements-run | Task 10 | `_AWAITING EXTERNAL ACTION_` (Solo Builder measurement collection + evidence capture) |
| Results-evaluated + ratify-or-pivot-decision-proposed | Task 11 | `_AWAITING EXTERNAL ACTION_` (Solo Builder pass-criteria evaluation + FM-2 escalation if any fail + decision proposal) |
| Trustee-acknowledged | Task 11 | `_AWAITING EXTERNAL ACTION_` (≥1-trustee acknowledgement) |
| Epic 1 substrate-work unblocked | Task 11 closure signal | `_AWAITING EXTERNAL ACTION_` |
| Story 0.10 P0-2c PRECONDITION-2 unblocked | Task 11 closure signal | `_AWAITING EXTERNAL ACTION_` |

## §3 Trustee scope + device-budget ratification log

**Task 7 never-ratifies escalation path**: if the Trustee Panel is unable or unwilling to ratify the experiment scope + device-procurement-budget at Task 7, the retry cadence is: 30-day retry from the first declined session + 90-day hard escalation to a documented `cancel-experiment` or `decide-without-evidence` disposition per the trust's governance process. Emergency single-trustee budget-ratification is valid under documented trustee incapacitation per README §5 quorum-unavailable fallback path.

```yaml
ratification_event:
  date: 2026-06-05
  ratifying_trustees: [Dhiraj Rahul, Kalpana Bharti]  # both trustees signed phase-0-trustee-questionnaire.md 2026-06-05 covering Q14.1-Q14.4
  ratification_mode: pack-as-a-unit
  ratified_experiment_scope:
    three_named_patterns: "Yogdaan Bahi + Shradhanjali Sahyog Vivran + Panchayat Noticeboard per UX spec lines 805-807"
    three_test_devices: "per device-procurement-roster.md Rows 1-3 — FM-2 substitutes per §4 disposition"
    pass_criteria_P1-P6: "verbatim per UX spec lines 814-826"
    fail_criteria_F1-F5: "verbatim per UX spec lines 830-843"
    timebox_~2_weeks: "per UX spec line 801"
    FM-2_tiered_escalation: "per UX spec line 762 + 831 + 843 + device-procurement-roster.md §4 disposition"
  ratified_device_budget:
    device_1_mid_range_android_INR: 0  # Redmi 10 already in Solo Builder's possession (trustee-loan)
    device_2_entry_level_android_INR: 0  # Redmi Note 8 already in possession (trustee-loan)
    device_3_iphone_INR: 0  # iPhone 12 already in possession (trustee-loan)
    apple_developer_program_INR: ~9900  # deferred to Day 10 of Task 9 enrollment event
    total_INR: ~9900  # Apple Developer Program annual fee only
    budget_routing: standalone-trustee-own-fund  # per Decision 2026-06-05-030 Q14.2 (option (c) trustee-own-fund)
  story_0_12_cross_coupling_resolution:
    story_0_12_outcome_status: no-trigger  # per Decision 2026-06-05-028 Q12.1 (ceiling_ratio = 1.497 clears strict-> 1.5x threshold)
    coupling_impact: "Story 0.12 contract-help-path NOT activated; Story 0.14 budget falls to standalone-trustee-own-fund disposition per Q14.2"
  fm2_device_substitution_disposition:
    substitution_event_date: 2026-06-05
    substitute_devices_vs_target:
      row_1_substitute: "Redmi 10 (MediaTek Helio G88) vs Snapdragon 4-series 3GB target — chipset family + GPU family + RAM-higher-than-floor divergence"
      row_2_substitute: "Redmi Note 8 (Snapdragon 665, 3-6GB) vs entry-level 2GB Android 11 target — LOAD-BEARING P5 2GB-floor not exercised"
      row_3_substitute: "iPhone 12 (A14 Bionic, iOS 14-17+) vs iOS 16+ floor — conservative (substitute exceeds floor)"
    measurement_validity_caveats: "P1 Mali-not-Adreno; P5 not-measured-on-2GB-floor; P2 iOS-OS-level-different pre-existing; P3/P4 iOS best-case (A14 Bionic)"
    cross_reference: "device-procurement-roster.md §4 FM-2 Device-Substitution Disposition"
  cross_reference: ".decision-log.md Decision 2026-06-05-030 (Story 0.14 Tasks 7-11 ratification + Task 8 close-out)"
```

**Schema** (preserved for audit baseline; pre-resolution template):

```yaml
ratification_event:
  date: <YYYY-MM-DD>
  ratifying_trustees: [<trustee-name-1>, <trustee-name-2>]  # ≥2 for budget ratification
  ratification_mode: <pack-as-a-unit|per-component>  # per README §5
  ratified_experiment_scope:
    three_named_patterns: <yogdaan-bahi + shradhanjali-sahyog-vivran + panchayat-noticeboard verbatim per UX spec lines 805-807>
    three_test_devices: <per device-procurement-roster.md Rows 1-3>
    pass_criteria_P1-P6: <verbatim per UX spec lines 814-826>
    fail_criteria_F1-F5: <verbatim per UX spec lines 830-843>
    timebox_~2_weeks: <UX spec line 801>
    FM-2_tiered_escalation: <UX spec line 762 + 831 + 843>
  ratified_device_budget:
    device_1_mid_range_android_INR: <substantive estimate at Task 7>
    device_2_entry_level_android_INR: <substantive estimate at Task 7>
    device_3_iphone_INR: <substantive estimate + Apple Developer Program annual fee>
    total_INR: <sum>
    budget_routing: <standalone | story-0.12-contract-help-path>
  story_0_12_cross_coupling_resolution:
    story_0_12_outcome_status: <pending | cut-scope | move-SM-1 | contract-help | hybrid>
    coupling_impact: <description per device-procurement-roster.md §3>
  cross_reference: ".decision-log.md Decision 2026-06-02-014 supersession entry"
```

## §4 Device-procurement log

**Mid-experiment re-procurement path**: if a device fails after Task 8 `received-and-verified` (e.g., physical damage during the build or measurement phase), re-procurement of the same device class proceeds under the original Task 7 budget ratification without requiring new Task 7 re-ratification, provided the replacement device is (a) the same device class as the failed device and (b) within the original cost envelope. A supersession row is appended to `device-procurement-roster.md` referencing the failed device's row. If the replacement cost materially exceeds the original budget, new trustee ratification is required per README §5.

```yaml
device_procurement_events:
  - device_id: device-mid-range-snapdragon-4-series-android
    procured_model: Redmi 10
    chipset: MediaTek Helio G88
    ram_gb: <verify-exact-SKU-before-Task-10-P5-measurement>  # most common Bihar-retail SKU 4 GB; Solo Builder confirms substantive RAM at Day 1 cold-boot
    storage_gb: <verify-exact-SKU>
    os_version_at_task_8: <verify-at-Day-1-cold-boot>  # Android 11 baseline; MIUI variant; eligible for Android 12+ upgrade
    cost_inr: 0
    acquisition_path: trustee-loan
    procurement_date: 2026-06-05
    received_and_verified_date: <pending-Task-9-Day-1-cold-boot-+-factory-reset-+-clean-wifi-confirmation>
    receipt_archive_path: not-applicable  # trustee-loan, already-owned at Decision 030 ratification
    procurement_status: procured  # transitioned pending-budget-ratification -> procured directly per Decision 2026-06-05-030 Q14.2
    fm2_substitution_disposition: "FM-2 substitute per device-procurement-roster.md §4: MediaTek Helio G88 NOT Snapdragon 4-series; Mali GPU NOT Adreno; 4GB RAM exceeds 3GB target floor. P1 measurement-validity caveat: mali-gpu-not-adreno-baseline."
  - device_id: device-entry-level-2gb-android-11
    procured_model: Redmi Note 8
    chipset: Qualcomm Snapdragon 665
    ram_gb: <verify-exact-SKU-before-Task-10-P5-measurement>  # most common Bihar-retail SKU 4 GB; Solo Builder confirms substantive RAM at Day 1 cold-boot
    storage_gb: <verify-exact-SKU>
    os_version_at_task_8: <verify-at-Day-1-cold-boot>  # original Android 9 launch; Android 11 upgrade path via MIUI — confirm upgrade applied before Task 10
    cost_inr: 0
    acquisition_path: trustee-loan
    procurement_date: 2026-06-05
    received_and_verified_date: <pending-Task-9-Day-1-cold-boot-+-Android-11-upgrade-verification>
    receipt_archive_path: not-applicable
    procurement_status: procured
    fm2_substitution_disposition: "FM-2 substitute per device-procurement-roster.md §4: Snapdragon 665 is 6-series NOT 4-series; 3-6 GB RAM exceeds 2 GB target floor — LOAD-BEARING P5 list-performance measurement-validity caveat: not-measured-on-2GB-floor. Task 11 ratify-decision must surface mitigation path."
  - device_id: device-iphone-ios-16-minimum
    procured_model: iPhone 12
    chipset: Apple A14 Bionic
    ram_gb: 4
    storage_gb: <verify-exact-SKU>
    os_version_at_task_8: <verify-at-Day-1-cold-boot>  # iPhone 12 supports iOS 14-17+; substantive iOS version recorded at Day 1
    cost_inr: 0
    acquisition_path: trustee-loan
    procurement_date: 2026-06-05
    received_and_verified_date: <pending-Task-9-Day-1-cold-boot-+-iOS-version-verification>
    apple_developer_program_enrollment_date: <pending-Day-10-of-Task-9>  # deferred enrollment per Decision 2026-06-05-030 Q14.2 close-out (P3 push-notification dependency only)
    apple_developer_program_annual_fee_inr: ~9900  # USD 99 at INR/USD spot; substantive figure populated at enrollment event
    apple_developer_program_funding_source: trustee-own-fund  # per Decision 2026-06-05-030 Q14.2 option (c)
    testflight_enrollment_date: <pending-post-Apple-Developer-Program-enrollment>
    receipt_archive_path: <trustee-accessible-repo-path-populated-at-Apple-Developer-Program-enrollment>
    procurement_status: procured  # device hardware status; Apple Developer Program enrollment status separately tracked above
    fm2_substitution_disposition: "Conservative substitute — iPhone 12 (A14 Bionic, iOS 14-17+) exceeds iOS 16+ floor. P3/P4 best-case caveat applies (A14 results not iOS 16 floor)."
```

**Apple Developer Program enrollment lifecycle:**

1. **2026-06-05 (Task 8 close-out)** — enrollment status: `pending-day-10-enrollment`; funding source ratified (trustee-own-fund per Decision 2026-06-05-030 Q14.2).
2. **~Task 9 Day 10 (estimated 2026-06-15)** — Solo Builder enrolls in Apple Developer Program; pays ~₹9,900 annual fee from trustee own fund; populates `apple_developer_program_enrollment_date` + substantive `apple_developer_program_annual_fee_inr` (actual INR at conversion).
3. **Post-enrollment** — TestFlight enrollment per `experiment-protocol.md` §5.3; populate `testflight_enrollment_date`.
4. **Pre-enrollment FM-2 path** — if Task 9 schedule slips past Day 10 such that P3 push-notification measurement is delayed, Apple Developer Program enrollment can be deferred further (within the ~2-week Task 9 timebox); the enrollment-on-demand pattern preserves cost-deferral discipline.

**Schema** (preserved for audit baseline; pre-resolution template):

## §5 Prototype-build log

```yaml
daily_log:
  - date: 2026-06-05
    calendar_day: 1
    branch: story-0.14-p0-5-prototype  # scratchpad per UX spec §6 + story 0.14 line 150 discipline (NOT Epic 1 Story 1.1 turborepo bootstrap)
    work_summary: |
      Day 1 scaffold + Task 8 artefact close-out + FM-2 device-substitution
      disposition recorded. apps/mobile/ scaffolded via
      `pnpm dlx create-tamagui@latest apps/mobile --template expo-router`
      (per architecture §Initialization Commands line 553). Package manager
      switched from bun (template default) to pnpm 10.30.3 per architecture
      preference: removed bun.lock, removed node_modules, ran pnpm install
      (1m 50s; 918 packages). Edited package.json: removed
      "packageManager: bun@1.3.9" → "packageManager: pnpm@10.30.3";
      updated "start" script from "bunx expo start -c" → "expo start -c";
      updated "upgrade:tamagui" from bunx to pnpm dlx.
    per_pattern_completion_status:
      yogdaan_bahi: not-started
      shradhanjali_sahyog_vivran: not-started
      panchayat_noticeboard: not-started
    blocking_dependency_events: []
    F4_velocity_check: on-track  # Day 1 of 14; well within timebox
    FM-2_mitigation_events:
      - mitigation_id: fm2-device-substitution-2026-06-05
        category: device-substitution
        description: |
          Per Decision 2026-06-05-030 Q14.2 trustee-own-fund disposition,
          three substitute devices accepted vs UX spec §6 target classes:
          Row 1 = Redmi 10 (MediaTek Helio G88 vs Snapdragon 4-series target);
          Row 2 = Redmi Note 8 (Snapdragon 665 / 3-6GB RAM vs 2GB target);
          Row 3 = iPhone 12 (A14 Bionic vs iOS 16+ floor).
        outcome: accepted-with-caveats
        cross_reference: docs/native-stack-validation/device-procurement-roster.md §4 FM-2 Device-Substitution Disposition
    artefacts_landed:
      - apps/mobile/  # full Tamagui + Expo Router scaffold; pnpm-lock.yaml generated
      - apps/mobile/package.json  # bun → pnpm switch
      - docs/native-stack-validation/device-procurement-roster.md  # Task 8 close-out + §4 FM-2 disposition (committed to main as 1c15d40)
      - docs/native-stack-validation/engagement-ledger.md  # §3 + §4 substantive ratification + procurement events (committed to main as 1c15d40)
      - _bmad-output/implementation-artifacts/deferred-work.md  # Story 0.14 W-01/W-02/W-03 entries (committed to main as 1c15d40)
    next_day_intent: |
      Day 2: CNG (Continuous Native Generation) workflow configuration per
      architecture §4.5 + §4.12 (apps/mobile/eas.json); Devanagari font
      loading (Tiro Devanagari Hindi + Noto Sans Devanagari + IBM Plex Mono
      Devanagari) per UX spec lines 712-714; per-device cold-boot +
      factory-reset + Android 11 upgrade verification on Redmi Note 8 +
      OS version verification on Redmi 10 + iPhone 12; populate
      `received_and_verified_date` fields in §4 device-procurement log.
    notes: |
      Three devices to verify at Task 9 Day 2 cold-boot:
      - Redmi 10: chipset Helio G88; verify exact RAM SKU (4GB most common)
      - Redmi Note 8: chipset SD665; verify exact RAM SKU + Android 11 upgrade applied
      - iPhone 12: verify current iOS version; defer Apple Dev Program until ~Day 10

  - date: 2026-06-05
    calendar_day: 2
    branch: story-0.14-p0-5-prototype
    work_summary: |
      Day 2 wiring: CNG eas.json + Devanagari font loading + Tamagui font-role
      registration. Three Devanagari font packages installed via pnpm:
      @expo-google-fonts/tiro-devanagari-hindi (display);
      @expo-google-fonts/noto-sans-devanagari (body, 400+500);
      @expo-google-fonts/ibm-plex-sans-devanagari (tabular, 400+500 —
      FM-2 substitute for IBM Plex Mono Devanagari per UX spec line 714).
      @types/node added as dev-dep (scaffold's tsconfig.base.json references it).
      eas.json created with development/preview/production profiles per
      architecture §4.5 + §4.12 CNG discipline. app.json updated:
      name "expo-router-example" → "TWT P0-5 Prototype"; slug → twt-p0-5-prototype;
      version 1.0.0 → 0.1.0 (prototype); scheme "myapp" → "twtp05";
      iOS supportsTablet false; iOS bundleIdentifier +
      Android package = "org.teacherswelfaretrust.p0prototype".
      app/_layout.tsx useFonts dictionary extended from {Inter, InterBold}
      to additionally load {TiroDevanagariHindi_400Regular,
      NotoSansDevanagari_400Regular + 500Medium, IBMPlexSansDevanagari_400Regular
      + 500Medium}; variable renamed interLoaded/interError → fontsLoaded/fontError.
      tamagui.config.ts rewritten: defaultConfig.fonts.heading/body extended with
      Devanagari createFont objects; new "tabular" font role added for
      $tabular references in pattern components.
    per_pattern_completion_status:
      yogdaan_bahi: not-started
      shradhanjali_sahyog_vivran: not-started
      panchayat_noticeboard: not-started
    blocking_dependency_events: []
    F4_velocity_check: on-track  # Day 2 of 14
    FM-2_mitigation_events:
      - mitigation_id: fm2-ibm-plex-mono-devanagari-unavailable-2026-06-05
        category: font-substitution
        description: |
          UX spec line 714 specifies "IBM Plex Mono Devanagari" as the default
          face for the tabular-numerics role. Investigation confirms IBM Plex
          publishes no Mono variant in the Devanagari script family (only
          IBM Plex Sans Devanagari + IBM Plex Sans Devanagari Condensed exist).
          The FM-2 condition "if monospace Devanagari proves unavailable at
          quality" — explicit fallback in UX spec line 714 — materializes
          immediately at Day 2 because no monospace Devanagari font exists.
        fallback_applied: |
          IBM Plex Sans Devanagari (400 Regular + 500 Medium) loaded as the
          tabular-numerics face. The tnum OpenType feature applied per-component
          via fontFeatureSettings on Text style at component implementation time
          (Days 3-7 pattern work). Per UX spec line 714 this fallback is
          explicitly authorized — not a deeper FM-2 escalation.
        outcome: fallback-applied-no-escalation
        cross_reference: "UX spec line 714 + line 1114 + line 1129 FM-2 face-substitution policy"

      - mitigation_id: fm2-tiro-display-weight-500-unavailable-2026-06-05
        category: font-weight-substitution
        description: |
          UX spec line 1108 specifies "weight 500" for display-large (Shradhanjali
          memorial name; Contribution Note heading) using Tiro Devanagari Hindi.
          Google Fonts publishes only Tiro Devanagari Hindi 400 (Regular + Italic);
          no 500-weight variant exists.
        fallback_applied: |
          Tiro Devanagari Hindi 400 Regular used at display-large; visual weight
          gap from spec target (500) noted in P1 rendering measurement at Task 10
          with caveat "tiro-weight-500-substituted-with-400". Trustee acknowledgment
          deferred to Task 11 FM-2 escalation trace. Per UX spec line 712 substitute
          candidates Yatra One (display weight only) or Mukta Mahee remain in
          reserve if 400-weight Tiro proves visually insufficient at P1 review.
        outcome: fallback-applied-with-caveat-recorded
        cross_reference: "UX spec line 712 substitute-candidates + line 1108"

      - mitigation_id: fm2-scaffold-type-noise-2026-06-05
        category: scaffold-type-noise
        description: |
          `pnpm exec tsc --noEmit` surfaces 14 pre-existing type errors from
          the create-tamagui v2.1.0 scaffold: Tamagui v2 component exports
          (Button, XStack, YStack, H2, H4, Paragraph) reported as not-exported-
          members; @react-navigation/native module resolution; @playwright/test
          named-import shape. None of these originate from Day 2 edits; all are
          scaffold defects (template lags Tamagui v2 API shape).
        fallback_applied: |
          Not blocking — metro bundles regardless of tsc errors. Pattern
          implementations (Days 3-7) will surface which scaffold imports
          actually break at runtime; fix narrowly per component if a real
          import fails. Tamagui v2 component imports in pattern files will
          likely need adjustment (e.g., `import { YStack } from 'tamagui'` may
          need to be `import { YStack } from '@tamagui/core'` or similar) —
          handle reactively.
        outcome: deferred-to-pattern-implementation-encounter
        cross_reference: "Tamagui v2 release notes + Day 3+ pattern implementations"
    artefacts_landed:
      - apps/mobile/eas.json  # CNG development/preview/production profiles
      - apps/mobile/app.json  # TWT namespace + bundleIdentifier + package
      - apps/mobile/app/_layout.tsx  # three Devanagari font loads + Inter retained
      - apps/mobile/tamagui.config.ts  # heading/body/tabular Devanagari fonts registered
      - apps/mobile/package.json  # three @expo-google-fonts packages + @types/node
      - apps/mobile/pnpm-lock.yaml  # updated
    next_day_intent: |
      Day 3: per-device cold-boot + factory-reset + Android-11-upgrade
      verification on Redmi Note 8 + OS version verification on Redmi 10 +
      iPhone 12; populate `received_and_verified_date` fields in §4
      device-procurement log. Begin Yogdaan Bahi pattern implementation
      per UX spec §8 Passbook row pattern (56pt fixed height + hairline
      rule + column structure date 100pt / sahyog flex / pool 64pt /
      amount 96pt + 5th-row heavier rule + sticky footer running tally +
      ≥50 row entries scrollable test data).
    notes: |
      Day 2 ends with all three font files loaded + Tamagui font-role API
      surface ready for pattern work. Two FM-2 events recorded (IBM Plex
      Mono Devanagari unavailable; Tiro weight 500 unavailable) — both
      pre-authorized fallbacks per UX spec line 714 + line 712 substitute-
      candidates discipline.

  - date: 2026-06-05
    calendar_day: 3
    branch: story-0.14-p0-5-prototype
    work_summary: |
      Day 3 Yogdaan Bahi pattern implementation per UX spec §8 + lines 805 +
      1156 (passbook row pattern). Tab navigation restructured from scaffold
      defaults ("Tab One" / "Tab Two") to three pattern tabs (Yogdaan Bahi /
      Shradhanjali / Panchayat) with Book / FileText / Megaphone icons from
      @tamagui/lucide-icons-2; Hindi titles for Shradhanjali + Panchayat
      placeholder screens. Yogdaan Bahi tab fully implemented; Shradhanjali +
      Panchayat tabs as stub screens with Day-4+ markers.
    per_pattern_completion_status:
      yogdaan_bahi: complete
      shradhanjali_sahyog_vivran: not-started  # stub-screen-only placeholder
      panchayat_noticeboard: not-started  # stub-screen-only placeholder
    blocking_dependency_events: []
    F4_velocity_check: on-track  # Day 3 of 14 — one of three patterns delivered
    FM-2_mitigation_events:
      - mitigation_id: fm2-flatlist-react19-typing-2026-06-05
        category: scaffold-type-noise-narrow-fix
        description: |
          Two NEW typing errors introduced by Day 3 code (not scaffold-inherited):
          (a) ListRenderItem not exported from 'react-native' in RN 0.83 typings
              that ship with create-tamagui scaffold;
          (b) FlatList ListHeaderComponent prop typing wrinkle under React 19 +
              new arch (Property 'ListHeaderComponent' does not exist).
          Both are TS-only — runtime behavior is the documented FlatList behavior.
        fallback_applied: |
          (a) Removed `import { ListRenderItem }`; inlined the renderItem arrow
              function's parameter type as `{ item: YogdaanRow; index: number }`.
          (b) Cast `FlatList as any` at the JSX call site with comment noting
              the React-19 + new-arch + scaffold-typings interaction; runtime
              FlatList behavior unchanged.
        outcome: fixed-narrowly
        cross_reference: "components/yogdaan-bahi/YogdaanBahi.tsx renderItem + FlatListAny cast"
    artefacts_landed:
      - apps/mobile/components/yogdaan-bahi/sample-data.ts  # 60 rows test data
      - apps/mobile/components/yogdaan-bahi/YogdaanBahiRow.tsx  # passbook row
      - apps/mobile/components/yogdaan-bahi/YogdaanBahi.tsx  # FlatList + sticky footer
      - apps/mobile/app/(tabs)/index.tsx  # repurposed: now renders YogdaanBahi
      - apps/mobile/app/(tabs)/shradhanjali.tsx  # renamed from two.tsx; Day-4+ placeholder
      - apps/mobile/app/(tabs)/panchayat.tsx  # NEW; Day-4+ placeholder
      - apps/mobile/app/(tabs)/_layout.tsx  # 3 tabs with Book / FileText / Megaphone icons
    implementation_details:
      sample_data:
        rows: 60
        date_range: 2026-04-07_to_2026-06-05  # 60 days backward from base
        sahyog_pool: 40 Hindi names (20 common + 15 conjunct/ligature stress-test + 5 female-teacher)
        conjunct_stress_tests:
          - "अंजली श्रीवास्तव (anusvara + conjunct श्र)"
          - "कृष्ण मोहन (conjunct क्ष)"
          - "विद्यानंद (conjunct द्या + nasalization)"
          - "त्रिवेणी प्रसाद (conjunct त्रि)"
          - "ज्ञानेश्वर पंडित (conjunct ज्ञ — challenging)"
          - "हृदय नारायण (conjunct हृ — challenging)"
          - "द्विवेदी प्रसाद (conjunct द्वि)"
          - "श्रद्धा सिंह (conjunct द्ध)"
          - "दुष्यंत झा (conjunct ष्य)"
          - "विश्वनाथ पासवान (conjunct श्व)"
          - "अक्षय भारती (conjunct क्ष)"
          - "महेन्द्र प्रसाद (half-form न + conjunct न्द्र)"
        pool_codes: "C-12 / C-13 / C-14 / C-15 / C-16"
        amount_range: "₹100 – ₹2050 in ₹50 increments (i*137 mod 39 distribution)"
        total_inr: 49500  # SAMPLE_YOGDAAN_TOTAL_INR exported for sticky footer
      row_layout:
        height_pt: 56
        column_structure:
          date: 100pt left
          sahyog: flex
          pool: 64pt right
          amount: 96pt right
        rule_discipline:
          standard: StyleSheet.hairlineWidth
          every_fifth: 1pt
        font_role_assignments:
          date: $tabular + tabular-nums (IBM Plex Sans Devanagari + tnum)
          sahyog: $body (Noto Sans Devanagari) — P1-measurement-load-bearing
          pool: $tabular + tabular-nums
          amount: $tabular + tabular-nums + weight 500
      virtualization:
        list_impl: FlatList
        windowSize: 10
        maxToRenderPerBatch: 10
        initialNumToRender: 15
        removeClippedSubviews: true
        getItemLayout: ROW_HEIGHT-based (56pt) for stable scroll measurement
        flashlist_threshold_TBD: established by Shradhanjali contributor scroll Day 4+
      sticky_footer:
        height_pt: 64
        content:
          left: "कुल योगदान + N entries"
          right: "₹49,500 ($tabular + tabular-nums + weight 500)"
      column_headers:
        height_pt: 40
        titles_devanagari: "दिनांक / सहयोग / पूल / राशि"
        rule_discipline: 1pt bottom rule; sticky at top of scroll via FlatList ListHeaderComponent + stickyHeaderIndices=[0]
    p1_measurement_surface_readiness: |
      Day 3 delivers all P1 measurement surface for Yogdaan Bahi pattern:
      - 60 Devanagari names rendered in $body role (Noto Sans Devanagari 400)
        including 12 conjunct/ligature stress-tests
      - Tabular-numerics columns rendered in $tabular role (IBM Plex Sans
        Devanagari 400) with fontVariant: ['tabular-nums']
      - Latin-numerals discipline preserved (no Hindi numerals in
        Yogdaan Bahi per UX spec line 1127)
      - Column header Hindi labels ("दिनांक / सहयोग / पूल / राशि") render
        in $body 400 — additional small-size Devanagari surface for P1
        rendering review.
      Task 10 P1 measurement on this surface: 3 devices × 1 pattern = 3 cells
      (cells "redmi10.yogdaan.p1", "redminote8.yogdaan.p1", "iphone12.yogdaan.p1").
    next_day_intent: |
      Day 4: per-device cold-boot verification still pending (carried from
      Day 2 intent; physical-world step). Then begin Shradhanjali Sahyog
      Vivran pattern per UX spec §8 + lines 806 + 1157 (memorial column
      pattern: max-width 360pt mobile + 480pt desktop; bordered portrait;
      parichay; kinship lattice; contributor scroll at 200+ entries to
      exercise list virtualization — this is where FlashList threshold
      gets established; दो शब्द स्मृति में input field).
    notes: |
      Tamagui v2 scaffold-noise type errors on Tamagui component imports
      (Text, XStack, YStack) persist across all files — these are NOT
      blocking and persist as scaffold-known-issue per Day 2 record. Day 3
      runtime behavior expected to function correctly via metro bundling.

  - date: 2026-06-05
    calendar_day: 4
    branch: story-0.14-p0-5-prototype
    work_summary: |
      Day 4 Shradhanjali Sahyog Vivran pattern implementation per UX spec §8 +
      lines 464-481 + 806 + 1157 (memorial column with bordered portrait +
      parichay + kinship lattice + memory input + FlashList contributor scroll
      at 250 entries). FlashList @shopify/flash-list 2.3.1 installed; this is
      the first use of FlashList in the prototype + establishes the
      virtualization threshold per architecture line 2913. Shradhanjali tab
      promoted from Day-3 stub-placeholder to full implementation.
    per_pattern_completion_status:
      yogdaan_bahi: complete
      shradhanjali_sahyog_vivran: complete
      panchayat_noticeboard: not-started  # stub-screen-only placeholder
    blocking_dependency_events: []
    F4_velocity_check: on-track  # Day 4 of 14 — two of three patterns delivered
    FM-2_mitigation_events:
      - mitigation_id: fm2-flashlist-react19-typing-2026-06-05
        category: scaffold-type-noise-narrow-fix
        description: |
          @shopify/flash-list 2.3.1 prop-typing stricter under React 19 +
          new arch; FlashList JSX props rejected as not-assignable to
          FlashListProps<Contributor>. Same scaffold-typing wrinkle pattern
          as Day 3's FlatList ListHeaderComponent error.
        fallback_applied: |
          Cast `FlashList as any` at JSX call site via IIFE wrapper to keep
          the scope narrow. Runtime behavior unchanged.
        outcome: fixed-narrowly
        cross_reference: "components/shradhanjali/ShradhanjaliSahyogVivran.tsx FlashListAny IIFE wrapper"
    artefacts_landed:
      - apps/mobile/components/shradhanjali/sample-data.ts  # memorial + 250 contributors
      - apps/mobile/components/shradhanjali/MemorialPortrait.tsx  # nested-borders portrait
      - apps/mobile/components/shradhanjali/KinshipLattice.tsx  # 2-column key-value list
      - apps/mobile/components/shradhanjali/MemoryInput.tsx  # दो शब्द input + counter
      - apps/mobile/components/shradhanjali/ContributorRow.tsx  # memorial-grammar scroll row
      - apps/mobile/components/shradhanjali/ShradhanjaliSahyogVivran.tsx  # composing parent
      - apps/mobile/app/(tabs)/shradhanjali.tsx  # promoted from Day-3 stub
      - apps/mobile/package.json  # @shopify/flash-list 2.3.1 added
      - apps/mobile/pnpm-lock.yaml  # updated
    implementation_details:
      sample_data:
        memorial_subject: "रामेश्वर प्रसाद सिंह (1962-2026, गोपालगंज, राजकीय उच्च विद्यालय छपरा, 34 years teacher)"
        contributors: 250  # exercises FlashList virtualization per architecture line 2669
        contributor_name_pool: 80 unique names (cycled across 250 rows)
        districts: 38 (Bihar districts in Hindi)
        memory_lines_pool: 15 Hindi स्मृति lines (~1 in 3 contributors leave one)
        hindi_numerals_discipline: "Parichay prose '३४ वर्षों की सेवा' (Hindi numerals per UX spec line 1127 amendment A2); contributor month-year dates Latin ('Apr 2026' / 'May 2026' / 'Jun 2026')"
      visual_grammar:
        max_width_mobile_pt: 360
        full_bleed_black_rule: 4pt at top
        portrait:
          size_pt: 160 (square, centered)
          rendering: "nested borders (outer 4pt black + inset 4pt white + 6pt white padding + gray placeholder interior) — NOT box-shadow per UX spec line 471"
          P1_validity: "tests subpixel nested-border crispness on Mali GPU (Redmi 10) vs Adreno baseline"
        name_typography: "$heading (Tiro Devanagari Hindi 400 — weight-500 unavailable per Day 2 FM-2 caveat) at fontSize $10"
        dates: "$tabular + tabular-nums (Latin year–year en-dash separator)"
        parichay: "$body (Noto Sans Devanagari 400) lineHeight 26 left-aligned"
        kinship_lattice: "2-column XStack rows (relation 64pt right-aligned label / names flex left-aligned)"
        bhavpurna_line: "$heading centered letterSpacing 2 marginTop $2"
        memory_input: "60-char cap + live counter + Noto Sans Devanagari placeholder + hairline underline"
      contributor_scroll:
        list_impl: "@shopify/flash-list FlashList"
        estimatedItemSize_pt: 56
        entries: 250
        gesture_strategy: "ScrollView parent owns gesture; FlashList scrollEnabled=false; outer ScrollView paginates"
        per_row_layout: "memory-line (if present; italic-letter-spaced) + name (flex) + district (right) + month-year ($tabular)"
        hairline_rule_between_rows: StyleSheet.hairlineWidth
        no_avatars_no_minute_precision: "per UX spec line 478"
      footer_link:
        text: "योगदान दें"
        styling: "$body fontSize $3 colorPress underline — NOT primary-blue button per UX spec line 479"
        placement: "in ledger footer rule (centered, after hairline)"
    p1_measurement_surface_readiness: |
      Day 4 delivers all P1 measurement surface for Shradhanjali pattern:
      - Display name in Tiro Devanagari Hindi at fontSize $10 (largest test of
        display-weight rendering across devices)
      - Parichay prose in Noto Sans Devanagari with Hindi numerals
        ('३४ वर्षों की सेवा') — tests memorial-prose Hindi-numeral rendering
      - Kinship lattice with relation labels (पत्नी / पुत्र / पुत्री / भाई) + 
        family names — tests body-weight Devanagari at small/mid sizes
      - Bhavpurna shraddhanjali line (Tiro letter-spaced) — tests
        letterSpacing under Devanagari serif rendering
      - Memory input placeholder (Noto Sans Devanagari fallback via direct
        fontFamily — bypasses Tamagui due to TextInput RN limitation)
      - 250 contributor names + districts (heavy Devanagari volume)
      - 83 contributor memory lines (Hindi स्मृति prose)
      P1 measurement cells armed: redmi10.shradhanjali.p1,
      redminote8.shradhanjali.p1, iphone12.shradhanjali.p1.
    p5_measurement_surface_readiness: |
      Day 4 delivers the LOAD-BEARING P5 list-performance measurement surface
      for FlashList over 250 contributor entries.
      Caveat per Story 0.14 §4 FM-2 disposition: substitute entry-level Android
      (Redmi Note 8, 3-6 GB RAM) does NOT exercise the 2 GB RAM floor;
      P5 verdict on this device tagged `not-measured-on-2GB-floor` per
      deferred-work.md Story 0.14 W-01 entry.
      P5 measurement cells armed: redmi10.shradhanjali.p5,
      redminote8.shradhanjali.p5, iphone12.shradhanjali.p5.
    next_day_intent: |
      Day 5: per-device cold-boot verification still pending (carried from
      Day 2). Then begin Panchayat Noticeboard pattern per UX spec §8 +
      lines 483-498 + 807 + 1158 (noticeboard strip pattern with Pariwar
      seal, single quiet stat-line, pinned section with colored left-stubs
      by category, hाल की आहुति recent closings, footer with next monthly
      meeting date).
    notes: |
      Memorial portrait rendered as gray placeholder for prototype P1
      measurement validity (border rendering is what we measure; portrait
      content opt-in per UX spec §1 line 79 DPDPA discipline). Production
      will render consented photo with same border treatment.

  - date: 2026-06-05
    calendar_day: 5
    branch: story-0.14-p0-5-prototype
    work_summary: |
      Day 5 Panchayat Noticeboard pattern implementation per UX spec §8 +
      lines 483-498 + 807 + 1158 (home screen for non-alert moments;
      panchayat-bhavan-noticeboard reference). All three named patterns
      (Yogdaan Bahi + Shradhanjali Sahyog Vivran + Panchayat Noticeboard)
      are now feature-complete in the prototype.
    per_pattern_completion_status:
      yogdaan_bahi: complete
      shradhanjali_sahyog_vivran: complete
      panchayat_noticeboard: complete
    blocking_dependency_events: []
    F4_velocity_check: on-track  # Day 5 of 14 — all three patterns delivered ahead of nominal Day-8 milestone
    FM-2_mitigation_events: []
    artefacts_landed:
      - apps/mobile/components/panchayat/sample-data.ts  # stats + 3 pinned + 5 closings + next meeting
      - apps/mobile/components/panchayat/StatLine.tsx  # 51,204 सदस्य · 38 ज़िले · 7 आहुति पूर्ण
      - apps/mobile/components/panchayat/PinnedItem.tsx  # 4pt colored left-stub row
      - apps/mobile/components/panchayat/RecentClosingRow.tsx  # name+district+count ruled row
      - apps/mobile/components/panchayat/PanchayatNoticeboard.tsx  # composing parent
      - apps/mobile/app/(tabs)/panchayat.tsx  # promoted from Day-3 stub
    implementation_details:
      visual_grammar:
        top_strip: "Pariwar seal (32pt circle with ट placeholder per UX spec line 488 + 679 Stamp atom future-work) left + परिवार की नब्ज़ centered ($heading $6)"
        stat_line: "single XStack — 51,204 सदस्य · 38 ज़िले · इस माह 7 आहुति पूर्ण (counts in $tabular Latin per UX spec line 1127)"
        pinned_section:
          header: "सूचना पट्ट letter-spaced caps in $body $2"
          row_count: 3  # within UX spec line 491 "2-3 items maximum"
          left_stub: "4pt vertical bar colored by category (saffron #FF7F1F / green #1F7F4F / black #1A1A1A)"
          category_meanings:
            saffron: "niyamavali amendment / governance update"
            green: "cycle / pool / disbursement update"
            black: "bereavement notice"
          rows:
            - "BLACK — श्रद्धांजलि: रामेश्वर प्रसाद सिंह, गोपालगंज (cross-link to Shradhanjali tab)"
            - "SAFFRON — नियमावली संशोधन: धारा १४ — पंचायत निर्णय कोरम (Hindi numerals permitted in legal-reference prose per UX spec line 1127 amendment A2)"
            - "GREEN — चक्र C-16 आरंभ — २८० नए सदस्य जुड़े (Hindi numerals in narrative prose; पूल code Latin)"
        recent_closings:
          header: "हाल की आहुति letter-spaced caps"
          row_count: 5  # per UX spec line 493
          per_row: "memorial name (flex left $body) + district ($body smaller right) + contributor count ($tabular Latin right-aligned 56pt)"
        footer:
          label: "अगली मासिक बैठक letter-spaced"
          date: "15 Jul 2026 ($tabular Latin numerals + month-abbr)"
          venue: "पटना — शिक्षा भवन सभागार"
        orthogonal_layout: "per UX spec line 497 — full-width strips, vertical stack, $heading + $body + $tabular at sizes $2-$6 only; no shadowed cards (shadowed cards = ad units per UX spec line 534)"
        hairlines: "5 black full-bleed hairlines separating sections (top-strip / stat-line / pinned-header / pinned-rows / closings-header / closings-rows / footer)"
    p1_measurement_surface_readiness: |
      Day 5 delivers all P1 measurement surface for Panchayat pattern:
      - Stat-line counts (51,204 / 38 / 7) in $tabular tabular-nums + Devanagari labels (सदस्य/ज़िले/आहुति पूर्ण)
      - 3 pinned-section Hindi titles incl. Hindi-numerals in prose ("धारा १४", "२८० नए सदस्य")
      - 5 recent-closing rows (memorial name + Bihar district names)
      - Footer Devanagari labels + Latin date
      - Hindi numerals discipline correctly applied (counts/dates Latin; narrative prose Hindi numerals permitted per UX spec line 1127 amendment A2)
      P1 cells armed: redmi10.panchayat.p1, redminote8.panchayat.p1, iphone12.panchayat.p1.
    p5_measurement_surface_readiness: |
      Day 5 Panchayat surface does NOT exercise list virtualization at scale
      (3 pinned + 5 recent closings = 8 rows). P5 measurement surface for
      Panchayat is N/A; the load-bearing P5 measurement remains the
      Shradhanjali contributor scroll at 250 entries from Day 4.
    cross_pattern_completion_check: |
      All three named patterns from UX spec §6 are feature-complete:
      - Tab 1 (Yogdaan Bahi): 60 rows passbook with sticky footer
      - Tab 2 (Shradhanjali Sahyog Vivran): memorial column with FlashList 250
      - Tab 3 (Panchayat Noticeboard): orthogonal noticeboard layout
      Three patterns × P1 = 9 P1 cells armed across 3 devices = 27 cells.
      Three patterns × P5 (where applicable) = Yogdaan FlatList 60 +
      Shradhanjali FlashList 250 = 6 P5 cells armed across 3 devices =
      18 P5 cells (Panchayat P5 marked N/A in measurement-template).
    next_day_intent: |
      Day 6+: per-device cold-boot verification still pending (carried from
      Day 2). Begin integration work — UPI Intent deep-link (P2), FCM/APNs
      push notifications (P3), MMKV + TanStack Query persistQueryClient
      (P4), RN Accessibility props + Tamagui/Radix accessibility wiring
      per UX spec lines 1199-1201 + 685-687.
    notes: |
      Pattern-implementation work delivered ahead of nominal Day-8
      milestone — three patterns in Days 3-5. Buffer banked for Days 6-12
      integration work (UPI/FCM/APNs/MMKV/accessibility) + Day 13-14
      measurement execution.

  - date: 2026-06-05
    calendar_day: 6
    branch: story-0.14-p0-5-prototype
    work_summary: |
      Day 6 P4 offline-cache surface implementation. Installed react-native-
      mmkv 4.3.1 + @tanstack/react-query 5.101.0 + @tanstack/query-sync-
      storage-persister 5.101.0 + @tanstack/react-query-persist-client
      5.101.0. Wired MMKV → SyncStorage adapter → PersistQueryClientProvider
      at the app root (components/Provider.tsx). Added a useYogdaanQuery hook
      that simulates a remote fetch (300ms latency) and returns rows + total
      + `fetchedAt` timestamp; Yogdaan Bahi screen now displays a P4 cache
      freshness strip ("P4 cache: Cached at HH:MM:SS · refreshing") at the
      top + RefreshControl pull-to-refresh wired to query refetch.
    per_pattern_completion_status:
      yogdaan_bahi: complete + P4-instrumented  # FreshnessStrip + pull-to-refresh
      shradhanjali_sahyog_vivran: complete
      panchayat_noticeboard: complete
    blocking_dependency_events: []
    F4_velocity_check: on-track  # Day 6 of 14; integration phase 1 of 4 done
    FM-2_mitigation_events:
      - mitigation_id: fm2-mmkv-v4-api-discovery-2026-06-05
        category: dependency-version-api-shift
        description: |
          react-native-mmkv v4 (4.3.1) changed API from v3:
            v3: `import { MMKV } from 'react-native-mmkv'; new MMKV({...})`
            v4: `import { createMMKV } from 'react-native-mmkv'; createMMKV({...})`
                — `MMKV` becomes type-only export; old constructor pattern removed
            v3: `mmkv.delete(key)` for removal
            v4: `mmkv.remove(key)` (returns boolean)
        fallback_applied: |
          Refactored lib/mmkv.ts to use createMMKV factory + mmkv.remove(key)
          per v4 API. SyncStorage adapter shape unchanged (TanStack Query's
          SyncStorage contract is stable across MMKV versions).
        outcome: fixed-narrowly
        cross_reference: "lib/mmkv.ts createMMKV import + mmkvStorage.removeItem"
    artefacts_landed:
      - apps/mobile/lib/mmkv.ts  # MMKV instance + SyncStorage adapter
      - apps/mobile/lib/query-client.ts  # QueryClient + createSyncStoragePersister
      - apps/mobile/components/Provider.tsx  # PersistQueryClientProvider wrap
      - apps/mobile/components/yogdaan-bahi/useYogdaanQuery.ts  # NEW useQuery hook
      - apps/mobile/components/yogdaan-bahi/YogdaanBahi.tsx  # FreshnessStrip + RefreshControl
      - apps/mobile/package.json  # 4 packages added
      - apps/mobile/pnpm-lock.yaml  # updated
    implementation_details:
      mmkv:
        version: react-native-mmkv@4.3.1
        instance_id: twt-p0-5
        namespace_rationale: "Future Epic 1 Story 1.1 substrate work re-scaffolds from clean namespace per Story 0.14 line 150 scratchpad-discipline"
        api_used: "createMMKV factory; getString/set/remove methods"
        sync_storage_adapter:
          getItem: "mmkv.getString(key) ?? null"
          setItem: "mmkv.set(key, value)"
          removeItem: "mmkv.remove(key) — discard boolean return"
      query_client:
        defaults:
          staleTime: 1h
          gcTime: 7d
          retry: 1
          refetchOnWindowFocus: false
          refetchOnReconnect: false
        rationale: "Conservative staleTime + generous gcTime support cold-restart-while-offline measurement; no retry storm on offline"
        persister:
          impl: createSyncStoragePersister
          key: "twt-p0-5-cache"
          throttleTime: 1000ms
          maxAge: 7d
      yogdaan_query:
        hook: useYogdaanQuery
        queryKey: "['yogdaan-bahi', 'summary']"
        fetcher: "simulated 300ms async returning rows + total + fetchedAt"
        ui_surface:
          freshness_strip: "top-of-screen XStack with $body 'P4 cache:' label + $tabular timestamp + optional 'refreshing' indicator"
          refresh_control: "wired to refetch; visible during isFetching"
        cache_validation_flow_at_task_10: |
          1. Open app online → query fires → fetchedAt = NOW → data renders
          2. Toggle airplane mode + cold-restart app
          3. Open app offline → cached query returns → fetchedAt = previous timestamp
             → cached data renders without network
          4. Toggle online + pull-to-refresh → query refires → new fetchedAt
    p4_measurement_surface_readiness: |
      Day 6 delivers the P4 offline-cache measurement surface:
      - MMKV instance + SyncStorage adapter operational
      - QueryClient + createSyncStoragePersister wired
      - Yogdaan Bahi useQuery hook + FreshnessStrip + RefreshControl
      - 7-day maxAge cache window
      P4 measurement cells armed: redmi10/redminote8/iphone12.yogdaan.p4
      (P4 for Shradhanjali + Panchayat tabs marked N/A — they don't yet
      use useQuery; can be added in subsequent days if measurement validity
      requires per-pattern P4 cells).
    deferred_to_subsequent_days:
      day_7_intent: "Begin UPI Intent deep-link (P2): construct upi://pay? URL + RN Linking handler + return-handoff session preservation per architecture line 90"
      day_8_intent: "FCM Android setup (google-services.json placeholder + expo-notifications integration); APNs iOS install but enrollment deferred to Day 10"
      day_9_intent: "RN Accessibility props review across three patterns (accessibilityLabel + accessibilityRole + accessibilityHint) per UX spec lines 1199-1201; Tamagui/Radix accessibility wiring per UX spec lines 685-687"
      day_10_intent: "Apple Developer Program enrollment (~₹9,900 from trustee own fund); complete APNs iOS configuration; TestFlight setup"
      day_11_12_intent: "Per-device cold-boot verification (Redmi Note 8 Android 11 upgrade + Redmi 10 + iPhone 12 iOS version); receive-and-verified date field population in §4"
    notes: |
      Yogdaan Bahi sample-data import retained as fallback during query-loading-
      from-cold-cache state (data?.rows ?? SAMPLE_YOGDAAN_ROWS pattern). This
      preserves UI shape during the first 300ms before query resolves. When
      cache is present from prior session, query resolves synchronously from
      cache without the 300ms penalty.

  - date: 2026-06-05
    calendar_day: 7
    branch: story-0.14-p0-5-prototype
    work_summary: |
      Day 7 UPI Intent deep-link (P2 measurement surface) implementation per
      architecture line 90 + PRD FR-27 + UX-DR P2 commitment. Created
      lib/upi-intent.ts with NPCI-spec URL builder + Linking.openURL launcher
      + idempotency-safe transactionRef generator. Wired the Shradhanjali
      "योगदान दें" footer link (UX spec line 479 quiet text link discipline)
      to launch UPI Intent with sample memorial params + transactionRef per
      architecture line 90 `tr=` idempotency contract. Added a P2 diagnostic
      indicator that shows launch outcome (launched/unsupported/error +
      platform + URL) for measurement evidence capture at Task 10.
    per_pattern_completion_status:
      yogdaan_bahi: complete + P4-instrumented
      shradhanjali_sahyog_vivran: complete + P2-instrumented  # योगदान दें → UPI Intent
      panchayat_noticeboard: complete
    blocking_dependency_events: []
    F4_velocity_check: on-track  # Day 7 of 14; integration phase 2 of 4 done
    FM-2_mitigation_events: []
    artefacts_landed:
      - apps/mobile/lib/upi-intent.ts  # NPCI URL builder + launcher + tr generator
      - apps/mobile/components/shradhanjali/ShradhanjaliSahyogVivran.tsx  # Pressable योगदान दें + diagnostic
    implementation_details:
      upi_url_format:
        scheme: upi://pay?
        params:
          pa: payee VPA — sample "twt-test@upi" (production from server config)
          pn: payee name — "Teachers Welfare Trust"
          tr: transaction reference per architecture line 90 idempotency contract
          am: amount in INR (.toFixed(2))
          cu: INR
          tn: transaction note (max 50 chars per NPCI guidance)
      tr_generator:
        prefix: TWT
        ts_encoding: base36 uppercase Date.now()
        rand_suffix: base36 uppercase 16-bit padded to 3 chars
        example: "TWT-MQRX0YZ-A0B"
        production_note: "prototype uses local timestamp+random; production will use server-issued reference per architecture line 90"
      launcher:
        api: Linking.canOpenURL + Linking.openURL
        platform_detection: Platform.OS branched (android | ios | other)
        outcome_shape:
          launched: { kind: "launched", url, platform }
          unsupported: { kind: "unsupported", url, reason }
          error: { kind: "error", url, error }
      yogdaan_link_pressable:
        accessibility:
          role: link
          label: "योगदान दें — UPI के माध्यम से सहयोग करें"
        visual_styling_unchanged: "still $body fontSize $3 colorPress textDecorationLine underline per UX spec line 479 quiet text-link discipline"
      sample_upi_params:
        payeeVpa: "twt-test@upi"
        payeeName: "Teachers Welfare Trust"
        amountInr: 251
        note: "Sahyog · रामेश्वर प्रसाद सिंह"
        transactionRef: "generated on each tap per idempotency discipline"
      diagnostic_indicator:
        visibility: "hidden until first tap; persistent across re-renders within session"
        fields: "kind / url / platform (if launched) / reason (if unsupported) / error (if error)"
        purpose: "Task 10 P2 measurement evidence capture — operator can screenshot the outcome row + verify UPI app chooser launched"
    p2_measurement_surface_readiness: |
      Day 7 delivers the P2 UPI Intent measurement surface:
      - lib/upi-intent.ts production-shape URL builder + launcher
      - Shradhanjali "योगदान दें" link wired to UPI Intent
      - Diagnostic indicator captures outcome for evidence
      P2 measurement cells per UX spec line 818:
        - Android (Redmi 10): LOAD-BEARING — test PhonePe + GPay + BHIM chooser scenarios
        - Android (Redmi Note 8): LOAD-BEARING — same scenarios on entry-level
        - iOS (iPhone 12): TAGGED `not-applicable-iOS-OS-level-different` per UX spec line 818
      Plus FM-2 device-substitution P1 Mali-GPU caveat per Story 0.14 §4 still applies
      to the Pressable rendering on Redmi 10 (visual quality of underlined Devanagari
      text in $body via Noto Sans Devanagari).
    deferred_caveats:
      android_11_queries_clause: |
        Android 11+ (API 30+) requires the app's AndroidManifest.xml to
        declare `<queries>` elements for intent URL schemes it queries via
        Linking.canOpenURL. Without the queries clause, canOpenURL returns
        false even when a UPI app is installed.
        Mitigation path if Task 10 P2 measurement reports
        kind="unsupported" on Android 11+:
        (a) add `expo-build-properties` plugin's `android.queries` field
            (or custom config plugin) with `<intent>` declaring `upi`
            scheme + VIEW action;
        (b) re-run CNG prebuild + rebuild dev client;
        (c) re-run P2 measurement.
        Redmi Note 8 may be on Android 11+ (depends on user's MIUI upgrade
        path); Redmi 10 typically ships Android 11 baseline.
        For Day 7 commit: canOpenURL check left in place as a soft probe.
        If Task 10 surfaces canOpenURL=false on Android 11+ but openURL
        still launches the chooser, the queries clause is the documented
        production-readiness fix.
      ios_universal_links_unconfigured: "iOS Universal Links for UPI apps not configured — iOS P2 cell explicitly tagged not-applicable per UX spec line 818 + measurement-template schema"
    next_day_intent: |
      Day 8: FCM (Android) push notifications setup — install expo-notifications
      + google-services.json placeholder + test-notification batch capability
      for P3 measurement preparation. APNs (iOS) setup deferred to Day 10 post
      Apple Developer Program enrollment.
    notes: |
      The UPI Intent helper is production-shape: same buildUpiIntentUrl
      function will be reused by Epic 8 contribution-loop substrate work
      (PRD FR-27). Only the payeeVpa + payeeName + transactionRef sources
      will swap from prototype constants → server-config in production.

  - date: 2026-06-05
    calendar_day: 8
    branch: story-0.14-p0-5-prototype
    work_summary: |
      Day 8 expo-notifications scaffolding for P3 measurement surface
      stub. Installed expo-notifications 56.0.15 + expo-device 56.0.4.
      Created lib/push-notifications.ts with permission flow + push-token
      retrieval (Expo → device-token fallback) + scheduleTestNotification
      + scheduleTestBatch helpers for local-notification path validation.
      Added P3DiagnosticPanel on Panchayat tab footer with 4 trigger
      buttons (Request permission / Get token / Schedule 1 / Schedule
      batch 5) + live log surface for Task 10 measurement evidence.
      Configured expo-notifications plugin in app.json (icon + color +
      defaultChannel).
    per_pattern_completion_status:
      yogdaan_bahi: complete + P4-instrumented
      shradhanjali_sahyog_vivran: complete + P2-instrumented
      panchayat_noticeboard: complete + P3-instrumented  # diagnostic panel in footer
    blocking_dependency_events: []
    F4_velocity_check: on-track  # Day 8 of 14; integration phase 3 of 4 done
    FM-2_mitigation_events:
      - mitigation_id: fm2-expo-notifications-broken-permission-typing-2026-06-05
        category: dependency-type-defect-narrow-fix
        description: |
          expo-notifications 56.0.15 ships a broken d.ts: its
          NotificationPermissionsStatus interface extends PermissionResponse
          imported from 'expo' (`import type { PermissionResponse } from 'expo'`)
          but the 'expo' package does NOT re-export PermissionResponse.
          Result: TypeScript can't see the status/granted/canAskAgain
          fields on the runtime object even though they're present.
        fallback_applied: |
          Defined local CanonicalPermissionResult type matching the runtime
          shape (status + granted + canAskAgain) and cast getPermissionsAsync
          / requestPermissionsAsync results to it. Runtime behavior
          unchanged; TypeScript now satisfied.
        outcome: fixed-narrowly
        cross_reference: "lib/push-notifications.ts CanonicalPermissionResult cast"
    artefacts_landed:
      - apps/mobile/lib/push-notifications.ts  # permission + token + scheduling helpers
      - apps/mobile/components/panchayat/P3DiagnosticPanel.tsx  # 4-button diagnostic
      - apps/mobile/components/panchayat/PanchayatNoticeboard.tsx  # P3 panel wired into footer
      - apps/mobile/app.json  # expo-notifications plugin added
      - apps/mobile/package.json  # expo-notifications + expo-device added
      - apps/mobile/pnpm-lock.yaml  # updated
    implementation_details:
      packages:
        - expo-notifications 56.0.15
        - expo-device 56.0.4
      notification_handler:
        config: "setNotificationHandler with shouldShowBanner + shouldShowList = true (foreground notifications visible for P3 observability)"
        rationale: "Default behavior suppresses foreground notifications which makes P3 measurement harder to observe — show always for prototype"
      permission_flow:
        device_check: "Device.isDevice — refuses on simulator/emulator with unsupported reason"
        existing_check: "getPermissionsAsync first; skip prompt if already granted"
        prompt_check: "requestPermissionsAsync if not yet determined"
        result_types: granted | denied (with canRetry) | undetermined | unsupported
      token_retrieval:
        primary_path: "Notifications.getExpoPushTokenAsync() — returns Expo push token (works when EAS projectId configured)"
        fallback_path: "Notifications.getDevicePushTokenAsync() — returns raw FCM (Android) / APNs (iOS) token"
        result_types: expo | device | unavailable
      scheduling:
        single: "scheduleTestNotification(delaySeconds=5) → schedule 1 local notification firing in 5s; returns notification id"
        batch: "scheduleTestBatch(count, gapSeconds=1) → schedule N notifications 1s apart for delivery-rate measurement at Task 10"
        triggers: SchedulableTriggerInputTypes.TIME_INTERVAL
      diagnostic_panel:
        location: "Panchayat tab footer (below अगली मासिक बैठक footer)"
        elements:
          - 4 trigger buttons (Request permission / Get token / Schedule 1 / Schedule batch 5)
          - permission status text
          - token text (truncated to 2 lines)
          - scheduled count
          - rolling 10-line event log with HH:MM:SS timestamps
        accessibility: "each button has accessibilityRole=button + accessibilityLabel; prototype-only — production removes this panel"
      app_json_plugin:
        config:
          icon: ./assets/images/icon.png
          color: "#202020"
          defaultChannel: default
        ios_apns_caveat: "iOS APNs delivery requires Apple Developer Program enrollment + APNs key — deferred to Day 10"
        android_fcm_caveat: "Android FCM delivery requires Firebase project + google-services.json placed at apps/mobile/google-services.json — deferred to first remote-delivery test"
    p3_measurement_surface_readiness: |
      Day 8 partial P3 surface:
      - Local-notification path: ✅ ready end-to-end. Operator can trigger
        schedule-1 or schedule-batch-5 from Panchayat footer; notifications
        fire in 5s / 1-5s respectively; verify foreground + background
        delivery via the panel log.
      - Remote-FCM-Android path: ⏳ pending Firebase project + google-services.json.
        Test path: backend uses expo-server-sdk + ExpoPushToken (visible in panel)
        OR direct FCM dispatch using device token.
      - Remote-APNs-iOS path: ⏳ pending Apple Developer Program enrollment (Day 10)
        + APNs key + p8 certificate upload to Expo console or backend.
      P3 measurement cells at Task 10:
      - Local-notification subset: 3 cells armed (redmi10/redminote8/iphone12.local-notif.p3)
      - Remote-FCM-Android subset: 2 cells deferred until Firebase setup (redmi10/redminote8)
      - Remote-APNs-iOS subset: 1 cell deferred until Apple Dev Program (iphone12)
      Per UX spec line 824 ≥95% delivery + ≤5s p95: local subset measurable
      now; remote subset deferred to post-Firebase/post-Apple-Dev.
    next_day_intent: |
      Day 9: RN Accessibility props + Tamagui/Radix accessibility wiring
      across the three patterns. Add accessibilityLabel + accessibilityRole +
      accessibilityHint to interactive elements (Yogdaan rows, Shradhanjali
      "योगदान दें" link already wired Day 7, Panchayat pinned items, memorial
      portrait). P1 visual-inspection level only per UX spec; deep audit is
      Story 0.10 P0-2c VI/low-vision territory.
    notes: |
      P3 partial validation via local-notification path is meaningful for
      the substrate decision: it validates that expo-notifications native
      modules compile + register + fire under CNG workflow. The cross-platform
      FCM/APNs delivery surface for the full ≥95% measurement remains
      deferred to Days 10+ external dependencies.

  - date: 2026-06-05
    calendar_day: 9
    branch: story-0.14-p0-5-prototype
    work_summary: |
      Day 9 RN Accessibility props wired across all three patterns per UX
      spec lines 1199-1201 + 685-687 (P1 visual-inspection level; deep
      audit Story 0.10 P0-2c VI/low-vision territory). accessibilityRole +
      accessibilityLabel + accessibilityHint added to semantic + interactive
      elements. This concludes the keyboard-doable Task 9 prototype-build
      scope; Days 10-14 are physical-world execution by Solo Builder.
    per_pattern_completion_status:
      yogdaan_bahi: complete + P4-instrumented + a11y-wired
      shradhanjali_sahyog_vivran: complete + P2-instrumented + a11y-wired
      panchayat_noticeboard: complete + P3-instrumented + a11y-wired
    blocking_dependency_events: []
    F4_velocity_check: on-track  # Day 9 of 14; integration phase 4 of 4 done
    FM-2_mitigation_events: []
    artefacts_landed:
      - apps/mobile/components/yogdaan-bahi/YogdaanBahiRow.tsx  # accessibilityRole=text + label combining 4 columns
      - apps/mobile/components/yogdaan-bahi/YogdaanBahi.tsx  # ColumnHeader role=header + StickyFooter role=summary
      - apps/mobile/components/shradhanjali/MemorialPortrait.tsx  # role=image + subjectName prop for label
      - apps/mobile/components/shradhanjali/ShradhanjaliSahyogVivran.tsx  # name role=header + पsubjectName passed to portrait + UPI link hint
      - apps/mobile/components/shradhanjali/ContributorRow.tsx  # role=text + label combining memory line + name + district + month-year
      - apps/mobile/components/shradhanjali/KinshipLattice.tsx  # YStack role=list + each XStack role=text with "relation: names" label
      - apps/mobile/components/panchayat/PanchayatNoticeboard.tsx  # title role=header + SectionHeader role=header
      - apps/mobile/components/panchayat/PinnedItem.tsx  # wrapped in Pressable + role=button + category-aware hint
      - apps/mobile/components/panchayat/RecentClosingRow.tsx  # role=text + label "name, district, N contributors"
    accessibility_wiring_details:
      yogdaan_bahi:
        column_header:
          role: header
          label: "Yogdaan Bahi columns: दिनांक, सहयोग, पूल, राशि"
        each_row:
          role: text
          label_pattern: "${date}, ${sahyog}, pool ${pool}, ${amount}"
          example: "2026-06-05, रमेश कुमार, pool C-12, ₹500"
        sticky_footer:
          role: summary
          label_pattern: "कुल योगदान: ${totalInr} across ${rowCount} entries"
        freshness_strip: "no explicit a11y — already visually labelled"
      shradhanjali:
        memorial_portrait:
          role: image
          label: "Memorial portrait of ${subjectName}"
        memorial_name:
          role: header
        kinship_lattice:
          parent_role: list
          parent_label: "दुःखी परिवार — kinship lattice"
          each_row_role: text
          each_row_label_pattern: "${relation}: ${names}"
        contributor_row:
          role: text
          label_pattern_with_memory: "${memoryLine}. ${name}, ${district}, ${monthYear}"
          label_pattern_without_memory: "${name}, ${district}, ${monthYear}"
        memory_input: "Existing accessibility from TextInput (placeholder + value)"
        yogdaan_den_link:
          role: link
          label: "योगदान दें — UPI के माध्यम से सहयोग करें"
          hint: "Opens your UPI app to contribute to this memorial"
      panchayat:
        title_परिवार_की_नब्ज़:
          role: header
        section_headers (सूचना पट्ट + हाल की आहुति + अगली मासिक बैठक):
          role: header
        pinned_item:
          wrapper: Pressable
          role: button
          label_pattern_with_hint: "${title}. ${detailHint}"
          label_pattern_without_hint: "${title}"
          hint_pattern: "Tap to open ${category === 'black' ? 'memorial' : category === 'saffron' ? 'governance' : 'cycle'} detail"
        recent_closing_row:
          role: text
          label_pattern: "${memorialName}, ${district}, ${contributorCount} contributors"
        p3_diagnostic_buttons: "Already wired Day 8 — role=button + label per button"
    p1_secondary_surface_readiness: |
      Day 9 delivers the P1 secondary measurement surface — accessibility
      props for screen-reader inspection at Task 10. Operator can enable
      TalkBack (Android) / VoiceOver (iOS) and verify:
      - Header elements announce as headings
      - Row content announces in reading order (date → name → pool →
        amount on Yogdaan; memory → name → district → month on Shradhanjali
        contributor scroll)
      - Memorial portrait announces with subject name
      - Kinship lattice announces as list with role + each row labelled
      - Pinned items announce as buttons with category-aware hints
      - योगदान दें link announces as link with explicit UPI hint
      P1 a11y cell behavior at Task 10: visual-inspection check per UX spec.
      Deep validation is Story 0.10 P0-2c VI/low-vision territory (AT
      walkthrough with real participant); current wiring is the FOUNDATION
      for that deeper audit.
    keyboard_doable_scope_complete: |
      Day 9 concludes the keyboard-doable Task 9 prototype-build work.
      Summary of what's now in place across 9 commits on the scratchpad:
      - Scaffold + pnpm + Tamagui Expo Router + 3 Devanagari fonts (Days 1-2)
      - 3 patterns with full visual grammar (Days 3-5)
      - MMKV + TanStack Query + RefreshControl (Day 6 P4 surface)
      - UPI Intent + diagnostic indicator (Day 7 P2 surface)
      - expo-notifications + local-notif diagnostic panel (Day 8 P3 partial)
      - RN Accessibility props across patterns (Day 9 P1 secondary)
      Days 10-14 are physical-world Solo Builder execution:
      - Day 10: Apple Dev Program enrollment + APNs config
      - Day 11-12: Per-device cold-boot + Android 11 upgrade verification
      - Day 13: Task 10 measurement execution (54-cell matrix)
      - Day 14: Task 11 ratify-or-pivot decision
    next_day_intent: |
      Day 10+: physical-world execution by Solo Builder. See
      `_bmad-output/research/p0-5-native-stack-validation-evidence/`
      (created at Task 10 measurement time) for per-device evidence capture.
      Apple Dev Program enrollment ~₹9,900 trustee own fund per Decision
      2026-06-05-030 Q14.2.
    notes: |
      Day 9 accessibility wiring is the P1-secondary load-bearing surface
      for the substrate decision: a substrate that cannot support
      accessibility props correctly would fail UX-DR P1 at Task 11.
      The Tamagui + Expo Router + RN combination passes a11y prop
      composition at the type-check level; Task 10 visual-inspection
      validates per-device screen reader rendering.
```

**Schema** (preserved for audit baseline; per-day log entry at Task 9 during ~2-week build):

```yaml
daily_log:
  - date: <YYYY-MM-DD>
    calendar_day: <1-14 within ~2-week timebox>
    per_pattern_completion_status:
      yogdaan_bahi: <not-started|in-progress|complete>
      shradhanjali_sahyog_vivran: <not-started|in-progress|complete>
      panchayat_noticeboard: <not-started|in-progress|complete>
    blocking_dependency_events: [<event description + duration in hours>]
    F4_velocity_check: <on-track|approaching-threshold|F4-fired>
    FM-2_mitigation_events: [<per-criterion mitigation attempt + outcome>]
    notes: <free-form>
```

## §6 Measurement-execution log

`<PENDING-TASK-10>`

**Schema** (per-device × per-pattern measurement session at Task 10):

```yaml
measurement_sessions:
  - session_id: <session-N>
    date: <YYYY-MM-DD>
    device_id: <device_id from roster>
    pattern_id: <yogdaan-bahi|shradhanjali-sahyog-vivran|panchayat-noticeboard>
    criteria_measured: [<p1-devanagari, p2-upi-intent, p3-push-notifications, p4-offline-cache, p5-list-performance, p6-no-blocking-deps>]
    cells_populated: [<cell-id per measurement-template.md §3, e.g., "1.1.p1", "1.1.p2", ...>]
    observed_value_summary: <summary across populated cells>
    evidence_captured:
      screenshots: [<paths under _bmad-output/research/p0-5-native-stack-validation-evidence/<device-subdir>/>]
      videos: [<paths>]
      profiler_traces: [<paths>]
      csv_batches: [<paths>]
      audio_recordings: [<paths — Hindi-belt reader review per P1 + consent per Story 0.8/0.9/0.10 ethics-protocol §3>]
    throttled_cellular_tool: <Network Link Conditioner iOS|developer-options Android|Charles Proxy|other>
    hindi_belt_reader_review_session: <if applicable; participant pseudonym + recruitment path from P0-2 field work>
    notes: <free-form>
```

## §7 Pass-criteria-evaluation log

`<PENDING-TASK-11>`

**Schema** (Task 11 evaluation):

```yaml
pass_criteria_evaluation:
  per_criterion_aggregate_verdict:
    p1_devanagari: <pass|fail|mitigated-pass>
    p2_upi_intent: <pass|fail|mitigated-pass>
    p3_push_notifications: <pass|fail|mitigated-pass>
    p4_offline_cache: <pass|fail|mitigated-pass>
    p5_list_performance: <pass|fail|mitigated-pass>
    p6_no_blocking_deps: <pass|fail|mitigated-pass>
  fm_2_escalation_events:
    - event_id: <escalation-event-N>
      triggering_cell_id: <cell-id>
      F_criterion: <F1|F2|F3|F4|F5>
      mitigation_attempts: [<attempt N + outcome>]
      final_outcome: <mitigated-pass|fail-after-exhausted-mitigation>
      cross_reference: <ratify-decision-template.md §4 FM-2 escalation trace>
  more_protective_governs_audit:
    - no_rounding_up_violations_detected: <yes|no>
    - silent_pass_violations_detected: <yes|no>
    - pending_measurement_literals_remaining: <count; must be 0 excluding carve-out cells>
```

**Exhaustion standard note**: `fail-after-exhausted-mitigation` is declared only after a minimum of 2 distinct mitigation attempts per F-criterion with documented outcome evidence in `measurement-template.md`. Single-attempt exhaustion is not sufficient per `experiment-protocol.md` §8.

**Re-measurement mandate note**: any cell with `_PENDING-MEASUREMENT_` literal at Task 11 decision time must be measured before the ratify-decision proceeds; if infeasible, auto-fail triggers the relevant F-criterion escalation per `pass-criteria-evaluation-framework.md` §6.

## §8 Ratify-or-pivot decision log

`<PENDING-TASK-11>`

**Schema** (Task 11 decision outcome):

```yaml
ratify_or_pivot_decision:
  decision_outcome: <ratify|pivot|mitigated-then-ratify>
  substrate_binding_language_for_epic_1: <verbatim text per ratify-decision-template.md §5>
  trustee_panel_acknowledgement_event:
    date: <YYYY-MM-DD>
    acknowledging_trustees: [<trustee-name-1, ...>]  # ≥1 per UX spec line 845
    trustee_notes: <free-form>
  decision_log_supersession_entry: ".decision-log.md Decision 2026-06-02-014 supersession entry"
  adr_substantive_content_authored: "docs/knowledge-transfer/adr-index.md line 52 ADR-NNNN-native-mobile-stack-ratify substantive content per architecture §Implementation Handoff PR-2"
```

## §9 Epic 1 substrate-work unblock signal

`<PENDING-TASK-11>`

**Schema** (Task 11 closure signal):

```yaml
epic_1_unblock_signal:
  story_1_1_precondition_satisfied: <yes|no>
  story_1_1_precondition_text: "Given Story 0.14's ratified substrate decision"  # epics line 990 verbatim
  substrate_binding_text_consumed_by_story_1_1: <verbatim per ratify-decision-template.md §5>
  architecture_launch_gate_p0_5_row_flip:
    architecture_line_4784_status: <pre-flip=open|post-flip=closed>
    flip_date: <YYYY-MM-DD>
    flip_pr: <PR-2 ADR-transcription per architecture §Implementation Handoff>
  architecture_deferred_decisions_native_mobile_stack_amendment:
    architecture_lines_150_152_pre_amendment: "working-assumption"
    architecture_lines_150_152_post_amendment: <"ratified-with-evidence" | "pivoted-with-FM-2-trace">
    amendment_pr: <PR-2 ADR-transcription>
  story_0_10_p0_2c_precondition_2_unblock_signal: <yes|no>
  story_0_10_p0_2c_precondition_2_unblock_evidence: "substantive prototype-operability artifacts (Yogdaan Bahi + signup flow + My Pool card + minimum viable navigation) operable on ratified substrate per 0-10-...md Task 7 PRECONDITION-2"
```

## §10 Pack-revision log

| Date | Revised file(s) | Revision summary | Rationale | Supersession marker |
|---|---|---|---|---|
| 2026-06-02 | README + experiment-protocol + device-procurement-roster + measurement-template + pass-criteria-evaluation-framework + ratify-decision-template + pivot-evaluation-decision-tree + engagement-ledger (this file) | Initial author-commit per Story 0.14 Tasks 1-6 | Story 0.14 author-commit; framework-leg = Closed by [edit] per [[feedback_closure_language_precision]] | N/A (initial) |

## §11 Cross-links to related framework ledgers

This native-stack-validation engagement-ledger is the **parallel ledger** of the native-stack-validation portfolio, distinct from the prior nine framework portfolios. The cross-link table:

| Framework portfolio | Owning Story | Engagement-ledger / readiness-ledger path |
|---|---|---|
| Operational runbooks | Story 0.1 | `docs/runbooks/operational-readiness-ledger.md` |
| Credential escrow | Story 0.2 | `docs/escrow/escrow-ledger.md` (or equivalent) |
| Code escrow | Story 0.3 | (Story 0.3 framework path) |
| Degradation policy | Story 0.4 | `docs/degradation-policy/degradation-policy-ledger.md` |
| Knowledge transfer pack | Story 0.5 | `docs/knowledge-transfer/kt-pack-ledger.md` |
| Backup engineer | Story 0.6 | `docs/backup-engineer/backup-engineer-ledger.md` |
| Fallback-handler ledger | Story 0.7 | `docs/fallback-handler-ledger/` (entire framework is the ledger) |
| Spec-to-cadence reconciliation | Story 0.12 | `docs/spec-to-cadence-reconciliation/` (entire framework + `backfill-log.md`) |
| Legal-counsel engagement | Story 0.13 | `docs/legal-counsel-engagement/engagement-ledger.md` |
| **Native-stack validation** | **Story 0.14** | **`docs/native-stack-validation/engagement-ledger.md` (this file)** |
| Architectural launch-gate inventory | Story 0.15 | (Story 0.15 framework path; pending) |

**Cross-Story coupling discharge surfaces:**

| Cross-Story | Coupling | Discharge surface |
|---|---|---|
| Story 0.10 P0-2c PRECONDITION-2 prototype-operability | Story 0.10 depends on Story 0.14 P0-5 ratify-decision closure | This ledger §9 Epic 1 substrate-work unblock signal → Story 0.10 PRECONDITION-2 unblock signal |
| Story 0.12 P0-3 reconciliation device-procurement budget | Story 0.14 device-procurement budget routes through Story 0.12 contract-help-path | This ledger §3 trustee-scope-ratification log device-budget cross-coupling + `docs/spec-to-cadence-reconciliation/backfill-log.md` row |
| Story 0.13 P0-4 legal counsel concurrent-review | Both Story 0.13 + 0.14 must close before Epic 1 substrate work begins per epics line 564 | This ledger §11 cross-link + `docs/legal-counsel-engagement/README.md` §8 |
| Story 0.15 architectural launch-gate inventory | Story 0.15 consumes Story 0.14 closure as closure-evidence for architecture line 4784 P0-5 row | This ledger §9 Epic 1 substrate-work unblock signal + architecture line 4784 flip |
| Epic 1 Story 1.1 substrate-bootstrap | Epic 1 Story 1.1 line 990 precondition "Given Story 0.14's ratified substrate decision" | This ledger §9 Epic 1 substrate-work unblock signal |

## §12 Open questions

(populated as questions surface during Tasks 7-11)

`<PENDING-TASK-7-11>`
