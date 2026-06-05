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
  ratifying_trustees: [<TRUSTEE-1-NAME>, <TRUSTEE-2-NAME>]  # populate with the two trustees who initialed Decision 2026-06-05-030
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

`<PENDING-TASK-9>`

**Schema** (per-day log entry at Task 9 during ~2-week build):

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
