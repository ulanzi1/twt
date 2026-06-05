# Device-Procurement Roster — P0-5 Native-Stack Validation

**Status:** Task 7 trustee-ratified per Decision 2026-06-05-030 Q14.1 + Q14.2 (experiment scope + device-procurement scope = trustee-own-fund with three devices already in Solo Builder's possession); Task 8 close-out applied 2026-06-05 with **FM-2 device-substitution disposition** (substitute devices accepted with measurement-validity caveats — see §4); Apple Developer Program enrollment deferred to ~Day 10 of Task 9 prototype build (P3 push-notification dependency).

**Authority cites:** UX spec lines 810-812 (three test devices); architecture line 2821 (device-support matrix); UX spec line 814 (pass-criteria all-must-hold discipline); UX spec line 839 (F4 velocity-fail >3× target timebox); UX spec line 845 (≥1-trustee acknowledgment threshold); `docs/spec-to-cadence-reconciliation/README.md` line 19 + line 152 (Story 0.12 contract-help-path device-procurement budget cross-coupling — **resolved at no-trigger per Decision 2026-06-05-028**); `docs/spec-to-cadence-reconciliation/reconciliation-decision-framework.md` §3(c) (contract-help path framework); `.decision-log.md` Decision 2026-06-01-012 body item 9 (Story 0.12 external native-stack validation engineering eligibility — **resolved standalone per Decision 2026-06-05-030 Q14.2**); Decision 2026-06-02-014 (framework-leg author-commit); **Decision 2026-06-05-030 (Tasks 7-11 ratification + FM-2 device-substitution disposition supersession)**.

## §1 Schema

| Field | Type | Constraints |
|---|---|---|
| `device_id` | canonical slug | Append-only; forbidden-removal; lifecycle exit via supersession only |
| `device_class` | enum | `mid-range-snapdragon-4-series-android` \| `older-entry-level-2gb-android-11` \| `iphone-target-ios-minimum` |
| `target_spec` | string | Verbatim from UX spec lines 810-812 + architecture line 2821 |
| `recommended_model` | string | Placeholder at author-commit; substantive choice at Task 8 |
| `procured_model` | string | Substantive model identifier populated at Task 8 close-out (2026-06-05) |
| `divergence_notes` | string \| null | FM-2 substitution disposition notes when `procured_model` diverges from `target_spec`; cross-link to §4 |
| `cost_estimate_inr` | string \| number | `<TO-BE-AUTHORED-AT-TASK-7>` at author-commit; substantive estimate at Task 7 |
| `procurement_status` | enum | `pending-budget-ratification` \| `budget-ratified` \| `procurement-in-progress` \| `procured` \| `received-and-verified` \| `decommissioned-post-experiment` |
| `acquisition_path` | enum | `retail-purchase` \| `trustee-loan` \| `rental` |
| `procurement_date` | date \| TBD | Populated at Task 8 |
| `decommission_disposition` | enum | `return-to-trustee` \| `retain-as-test-device` \| `donate-to-Bihar-school` |
| `notes` | string | Free-form |

**Schema discipline:**

- **Append-only.** Rows added at author-commit (3 placeholder rows for the three device classes) + at Task 8 procurement if multi-device-per-class (e.g., two different Snapdragon 4-series candidates procured for fallback). Existing rows are NEVER deleted.
- **Forbidden-removal rule.** Decommissioned devices (post-experiment) flip `procurement_status` to `decommissioned-post-experiment` with `decommission_disposition` populated; row remains in roster as audit baseline.
- **Supersession-only lifecycle exit.** If a device is replaced (e.g., DOA on receipt; replaced under retail warranty), a new supersession row is appended with the original row's `device_id` referenced; the original row is preserved as the historical baseline. Inherited from Stories 0.3/0.4/0.5/0.6/0.7/0.12/0.13 framework discipline.
- **Mid-experiment re-procurement**: if a device fails after Task 8 `received-and-verified`, re-procurement of the same device class under the original Task 7 budget ratification is authorized without new trustee re-ratification, provided: (a) same device class as the failed device and (b) within the original `cost_estimate_inr` envelope ratified at Task 7. Append a supersession row referencing the failed device's `device_id`. If the replacement cost materially exceeds the original budget, new ≥2-trustee ratification is required per `README.md` §5.

## §2 Rows

### Row 1 — `device-mid-range-snapdragon-4-series-android`

| Field | Value |
|---|---|
| `device_id` | `device-mid-range-snapdragon-4-series-android` |
| `device_class` | `mid-range-snapdragon-4-series-android` |
| `target_spec` | UX spec line 810 verbatim: "Mid-range Snapdragon 4-series Android (target device class; 3 GB RAM)"; architecture line 2821 floor: "Android 9+ (Snapdragon 4-series, 3 GB RAM is the floor per UX §6)" |
| `recommended_model` | (superseded by `procured_model` at 2026-06-05 close-out) Candidate options at framework-author time: Redmi 10A / Realme C30 / Moto G14 / Samsung Galaxy A05 / Tecno Spark 10C |
| `procured_model` | **Redmi 10** (MediaTek Helio G88; common Bihar-retail SKU 4 GB / 64 GB — exact RAM SKU to verify before Task 10 P5 measurement scheduling) |
| `divergence_notes` | **FM-2 substitute per Decision 2026-06-05-030 Q14.2 + 2026-06-05 close-out.** Two divergences from `target_spec`: (a) chipset family — MediaTek Helio G88 NOT Snapdragon 4-series (Mali GPU rendering surface differs from Adreno baseline); (b) RAM — 4 GB exceeds 3 GB target floor. **P1 Devanagari rendering measurement-validity caveat**: results on Mali GPU may not generalize to Adreno-based Snapdragon 4-series baseline expected in Bihar retail. Cross-link to §4 FM-2 disposition + Task 11 ratify-or-pivot decision FM-2 escalation trace. |
| `cost_estimate_inr` | **₹0** (trustee-loan — device already in Solo Builder's possession at Decision 2026-06-05-030 ratification per Q14.2 trustee-own-fund disposition; no procurement spend) |
| `procurement_status` | `procured` (transitioned `pending-budget-ratification` → `procured` directly per Decision 2026-06-05-030 Q14.2 — skipped intermediate states because devices already in possession; `received-and-verified` pending Task 9 day-1 cold-boot + factory-reset + clean Wi-Fi network confirmation) |
| `acquisition_path` | `trustee-loan` (already-owned by Solo Builder at ratification; treated as in-kind trustee-fund contribution per Q14.2 trustee-own-fund disposition) |
| `procurement_date` | 2026-06-05 (Decision 030 ratification date — devices already in possession at this date) |
| `decommission_disposition` | `retain-as-test-device` (cross-coupled with Story 0.10 P0-2c PRECONDITION-2 prototype-operability dependency; decommissioning prevents downstream Story 0.10 substantive validation session) |
| `notes` | Mid-range floor per UX spec §6; load-bearing for Yogdaan Bahi 50-row scroll + Panchayat Noticeboard performance benchmark. **Measurement-validity caveat (see `divergence_notes`)**: P1 Devanagari rendering measurements on this MediaTek Helio G88 device do not generalize to the Snapdragon 4-series Adreno baseline; Task 11 ratify-or-pivot decision MUST account for this in the FM-2 escalation trace. |

### Row 2 — `device-entry-level-2gb-android-11`

| Field | Value |
|---|---|
| `device_id` | `device-entry-level-2gb-android-11` |
| `device_class` | `older-entry-level-2gb-android-11` |
| `target_spec` | UX spec line 811 verbatim: "Older entry-level Android (2 GB RAM, Android 11)" |
| `recommended_model` | (superseded by `procured_model` at 2026-06-05 close-out) Candidate options at framework-author time: Redmi 9A / Lava Yuva 2 / Itel A60 / Samsung Galaxy A04e |
| `procured_model` | **Redmi Note 8** (Qualcomm Snapdragon 665 — 6-series NOT 4-series; common Bihar-retail SKU 4 GB / 64 GB — exact RAM SKU to verify before Task 10 P5 measurement scheduling; original Android 9 release with Android 11 upgrade path via MIUI) |
| `divergence_notes` | **FM-2 substitute per Decision 2026-06-05-030 Q14.2 + 2026-06-05 close-out.** Two divergences from `target_spec`: (a) RAM — 4 GB (or 3 GB SKU if user has that variant) exceeds 2 GB target floor; (b) chipset — Snapdragon 665 is a higher-tier 6-series chip than the entry-level 4-series the target spec implies. **LOAD-BEARING P5 LIST-PERFORMANCE MEASUREMENT-VALIDITY CAVEAT**: this is the critical measurement-validity divergence in the experiment. UX spec line 824 specifies "60 fps target / 30 fps minimum at 200+ entries" measured on the 2GB-RAM-floor device specifically because native-side OOM events under sustained Shradhanjali contributor scroll are expected to surface at the 2GB floor and NOT at 3GB+. A pass verdict on Redmi Note 8 (3/4/6 GB RAM) does NOT discharge the 2GB-floor measurement obligation. Task 11 ratify-or-pivot decision MUST flag P5 verdict on this device with `not-measured-on-2GB-floor` caveat + propose mitigation path (e.g., follow-on procurement of Redmi 9A / Itel A60 at ~₹6,500-8,000 before Phase-1 launch). Cross-link to §4 FM-2 disposition + `_bmad-output/implementation-artifacts/deferred-work.md` Story 0.14 entry. |
| `cost_estimate_inr` | **₹0** (trustee-loan — device already in Solo Builder's possession at Decision 2026-06-05-030 ratification per Q14.2 trustee-own-fund disposition; no procurement spend) |
| `procurement_status` | `procured` (transitioned `pending-budget-ratification` → `procured` directly per Decision 2026-06-05-030 Q14.2; `received-and-verified` pending Task 9 day-1 cold-boot + factory-reset + Android 11 upgrade verification confirmation) |
| `acquisition_path` | `trustee-loan` (already-owned by Solo Builder at ratification; in-kind trustee-fund contribution per Q14.2) |
| `procurement_date` | 2026-06-05 (Decision 030 ratification date) |
| `decommission_disposition` | `retain-as-test-device` (cross-coupled with Story 0.10 P0-2c PRECONDITION-2 + ongoing entry-level Android validation work post-P0-5; rationale parallels Row 1) |
| `notes` | **Load-bearing for P5 list performance measurement** per UX spec line 824 — but see `divergence_notes` measurement-validity caveat. 2GB RAM constraint surface NOT exercised by this substitute device; native-side OOM events under sustained scroll likely NOT to surface here. Instrument + document per `experiment-protocol.md` §6.5; explicitly mark P5 cell with `mitigated-with-caveat-not-measured-on-2GB-floor` verdict + escalate in Task 11 FM-2 trace. |

### Row 3 — `device-iphone-ios-16-minimum`

| Field | Value |
|---|---|
| `device_id` | `device-iphone-ios-16-minimum` |
| `device_class` | `iphone-target-ios-minimum` |
| `target_spec` | UX spec line 812: "iPhone at the target iOS minimum version"; architecture line 2821: "iOS 16+" |
| `recommended_model` | (superseded by `procured_model` at 2026-06-05 close-out) Candidate options at framework-author time: iPhone SE 2nd-gen / iPhone 8 / iPhone XR |
| `procured_model` | **iPhone 12** (Apple A14 Bionic; 4 GB RAM; supports iOS 14 → iOS 17+ — verify current iOS version installed before Task 9 day-1 verification) |
| `divergence_notes` | **No device-class divergence**: iPhone 12 (iOS 14→17+ supported) exceeds iOS 16+ floor per UX spec line 812; A14 Bionic exceeds expected A12-A13 baseline implied by candidate options. Higher-spec substitute is conservative — P3 push-notification latency + P4 offline-cache measurements on A14 represent best-case iOS performance, not iOS 16 floor. **Apple Developer Program enrollment deferred** to ~Day 10 of Task 9 prototype build per Q14.2 close-out — P3 push-notification measurement is the load-bearing Apple Developer Program dependency; enrollment immediately is wasteful spend if Task 9 schedule slips. |
| `cost_estimate_inr` | **₹0** (trustee-loan — device already in Solo Builder's possession at Decision 2026-06-05-030 ratification per Q14.2 trustee-own-fund disposition) + **₹~9,900 deferred** (Apple Developer Program annual fee, USD 99 ≈ ₹9,900 at INR/USD spot rate, funded via trustee own fund per Q14.2; enrollment-to-occur at ~Day 10 of Task 9 — `apple_developer_program_enrollment_date` field in `engagement-ledger.md` §4 populated at enrollment event) |
| `procurement_status` | `procured` (device hardware — transitioned `pending-budget-ratification` → `procured` directly per Decision 2026-06-05-030 Q14.2; `received-and-verified` pending Task 9 day-1 cold-boot + iOS version verification confirmation). Apple Developer Program enrollment status separately tracked at `engagement-ledger.md` §4 — `pending-day-10-enrollment` at 2026-06-05 close-out. |
| `acquisition_path` | `trustee-loan` (already-owned by Solo Builder at ratification; in-kind trustee-fund contribution per Q14.2) |
| `procurement_date` | 2026-06-05 (Decision 030 ratification date — device hardware). Apple Developer Program enrollment date populated at Day-10 enrollment event. |
| `decommission_disposition` | `retain-as-test-device` (iPhone retention for Story 0.10 P0-2c PRECONDITION-2 + ongoing iOS validation work post-P0-5) |
| `notes` | **P2 UPI Intent measurement caveat per UX spec line 818**: iPhone iOS UPI Intent behavior is OS-level different; the Android target is the load-bearing measurement surface; iPhone P2 cell MAY be tagged `not-applicable-iOS-OS-level-different` with rationale per `measurement-template.md` schema. **A14-Bionic best-case caveat (see `divergence_notes`)**: P3/P4 results on this device are best-case iOS performance, not iOS 16 floor — Task 11 ratify-or-pivot decision should note this conservative substitution direction. |

## §3 Story 0.12 P0-3 reconciliation device-procurement budget cross-coupling — RESOLVED

**Resolution status (2026-06-05):** RESOLVED. Story 0.12 closed at no-trigger per Decision 2026-06-05-028 (Q12.1 ratification: `ceiling_ratio = 1.497` clears strict-`>` 1.5× threshold; no contract-help-path activated). Decision 2026-06-05-030 Q14.2 then ratified Story 0.14 device-procurement budget as **standalone trustee-own-fund disposition** — devices already in Solo Builder's possession (no procurement spend) + Apple Developer Program annual fee (~₹9,900) funded via trustee own fund. The conditional cross-coupling enumerated below is preserved for audit baseline but no longer load-bearing for Story 0.14 execution.

**Original cross-coupling discharge path (pre-resolution, audit baseline):**

Per `docs/spec-to-cadence-reconciliation/README.md` line 19 verbatim: "Stories 0.6 ... 0.13 ... and 0.14 (prototype device-procurement budget) all park funding-tradeoff cross-references here rather than re-litigating each per-Story". Per `docs/spec-to-cadence-reconciliation/README.md` line 152: "Story 0.12 closure unblocks ... Story 0.14". Per `.decision-log.md` Decision 2026-06-01-012 body item 9: "external native-stack validation engineering" contracted-help-path eligibility includes the device-procurement cost envelope.

- The substantive `cost_estimate_inr` authoring at Task 7 routes through Story 0.12 contract-help-path budget reconciliation rather than ad-hoc per-Story funding.
- Task 7 trustee budget ratification cross-couples with the Story 0.12 reconciliation outcome at Story 0.12 Task 9 closure:
  - If Story 0.12 ratifies the `contract-help` path: Story 0.14 device-procurement budget is included in the contract-help cost envelope; Story 0.14 Task 7 ratification is standalone-on-the-record but funded through the Story 0.12 envelope. **— Path NOT activated; Story 0.12 ratified no-trigger per Decision 2026-06-05-028.**
  - If Story 0.12 ratifies `cut-scope` (no contract-help): Story 0.14 device-procurement budget requires standalone Trustee Panel ratification at Task 7 with no shared envelope. **— Path NOT activated; Story 0.12 ratified no-trigger.**
  - If Story 0.12 ratifies `move-SM-1` (delayed ship target with funding flexibility): Story 0.14 device-procurement budget is Trustee Panel discretionary at Task 7. **— Path NOT activated; Story 0.12 ratified no-trigger.**
- The `backfill-log.md` row (per `docs/spec-to-cadence-reconciliation/backfill-log.md`) tracks this Story-0.12 ↔ Story-0.14 budget cross-coupling at citation-slot-committed status — **flip to `substantive-backfill-applied` per the no-trigger + trustee-own-fund standalone resolution**.

**Apple Developer Program annual fee — RESOLVED:**

- Per Decision 2026-06-05-030 Q14.2: Apple Developer Program annual fee included in scope and funded via trustee own fund.
- Recurring annual cost (post-Phase-0) — the Q14.2 funding disposition commits trustee-own-fund for the initial enrollment; recurring-cost decision for post-launch years deferred to a separate ADR after v1 launch (per the original "(b)" option in the pre-resolution framework).

## §4 FM-2 Device-Substitution Disposition (2026-06-05 Task 8 close-out)

**Authority:** Decision 2026-06-05-030 Q14.2 ratification (trustee-own-fund disposition; devices already in Solo Builder's possession); UX spec §6 F4 velocity-fail + FM-2 tiered escalation discipline (UX spec line 839); `[[feedback_closure_language_precision]]`; `[[feedback_gap_analysis_observational]]`.

**Disposition:** Solo Builder + Trustee Panel chose to accept the available devices (in Solo Builder's possession) as FM-2 substitutes for the UX spec §6 target device classes rather than (a) procure spec-compliant devices at additional cost or (b) re-ratify the device-procurement scope via supersession question. The substitution is recorded here as an explicit FM-2 disposition event — NOT a silent acceptance.

**Substitute devices vs target spec:**

| Row | Target spec (UX §6) | Substitute device | Divergence severity |
|---|---|---|---|
| 1 | Mid-range Snapdragon 4-series Android, 3 GB RAM | Redmi 10 (MediaTek Helio G88, 4 GB RAM, Mali GPU) | **Material**: chipset family + GPU family + RAM-higher-than-floor |
| 2 | Older entry-level Android, 2 GB RAM, Android 11 | Redmi Note 8 (Snapdragon 665, 3-6 GB RAM, Android 9→11 upgrade) | **Critical**: 2GB-RAM floor NOT exercised (load-bearing for P5) |
| 3 | iPhone iOS 16+ floor | iPhone 12 (A14 Bionic, iOS 14→17+) | **Conservative**: substitute exceeds floor (best-case results) |

**Measurement-validity caveats applied to Task 10 + Task 11:**

1. **P1 Devanagari rendering** (Row 1 MediaTek Helio G88 / Mali GPU substitution) — results do not generalize to Snapdragon 4-series Adreno baseline expected in Bihar retail. Task 10 P1 cells tagged with `mali-gpu-not-adreno-baseline` caveat in `measurement-template.md`. Task 11 ratify-decision MUST surface this caveat in the FM-2 escalation trace.

2. **P5 list-performance on entry-level Android** (Row 2 Redmi Note 8 substitution) — **LOAD-BEARING DIVERGENCE**: native-side OOM events under sustained Shradhanjali contributor scroll at 200+ entries are expected to surface at the 2GB-RAM floor and NOT at 3GB+. A pass verdict on Redmi Note 8 does NOT discharge the 2GB-floor measurement obligation. Task 11 ratify-decision MUST tag P5 verdict with `not-measured-on-2GB-floor` + propose mitigation path (follow-on procurement of Redmi 9A or Itel A60 at ~₹6,500-8,000 before Phase-1 launch, OR explicit-deferral-with-rationale per `[[feedback_closure_language_precision]]`).

3. **P2 UPI Intent on iOS** (Row 3 iPhone 12) — pre-existing caveat per UX spec line 818 (iOS UPI Intent OS-level different) holds; iPhone 12 substitution does not change this.

4. **P3/P4 best-case caveat** (Row 3 iPhone 12 A14 Bionic substitution) — push-notification latency + offline-cache results represent best-case iOS performance, NOT iOS 16 floor. Conservative direction; results expected to be best-case for the iOS surface.

**FM-2 escalation discipline (per UX spec §6 + pivot-evaluation-decision-tree.md):**

- Device substitution is itself an FM-2 mitigation event recorded BEFORE Task 10 measurements begin.
- The substitution is logged in `engagement-ledger.md` §5 Prototype-build log at Day 1 + cross-referenced from §7 Pass-criteria-evaluation log at Task 11.
- Per [[feedback_closure_language_precision]]: this disposition is "Closed by [edit]" for the Task 8 close-out leg (artefact updates applied); the underlying measurement-validity concerns are "Resolved via explicit deferral" pending Task 11 ratify-decision FM-2 escalation trace + post-launch P5 2GB-floor follow-on measurement.
- A `_bmad-output/implementation-artifacts/deferred-work.md` entry SHOULD be appended documenting the P5 2GB-floor follow-on measurement obligation as a Phase-1 pre-launch action.

**Mid-experiment re-procurement path (if devices fail):** Per §1 schema discipline, replacement under the original Q14.2 trustee-own-fund disposition is authorized without new trustee ratification provided the replacement is (a) same substitute class as the failed device and (b) within the original ₹0 envelope (trustee-loan). If replacement requires retail spend, new ≥2-trustee ratification required per `README.md` §5.

## §5 Open ADR slots

Per `README.md` §7 Open ADR slots #1-#3 — **closed at 2026-06-05 Task 8 close-out**:

1. ~~**Specific Snapdragon 4-series Android model choice** (Row 1)~~ — CLOSED: Redmi 10 (FM-2 substitute, see §4)
2. ~~**Specific 2GB-RAM Android 11 model choice** (Row 2)~~ — CLOSED: Redmi Note 8 (FM-2 substitute, see §4); load-bearing P5 2GB-floor follow-on procurement deferred per §4
3. ~~**Specific iPhone iOS 16+ model choice** (Row 3)~~ — CLOSED: iPhone 12 (no divergence; conservative direction)

## §6 Cross-link

- `experiment-protocol.md` §5 Per-device run checklist — operational protocol for each device
- `measurement-template.md` — 54-cell measurement matrix populated at Task 10 with `device_id` foreign-key to this roster + measurement-validity caveats per §4
- `engagement-ledger.md` §3 Trustee scope + device-budget ratification log — Decision 2026-06-05-030 ratification event
- `engagement-ledger.md` §4 Device-procurement log — per-device procurement event log at Task 8 close-out
- `engagement-ledger.md` §5 Prototype-build log — FM-2 device-substitution event recorded Day 1 per §4 disposition
- `engagement-ledger.md` §7 Pass-criteria-evaluation log — Task 11 FM-2 escalation trace cross-references §4 disposition
- `docs/spec-to-cadence-reconciliation/README.md` line 19 + line 152 — Story 0.12 P0-3 reconciliation device-procurement budget cross-coupling — **resolved at no-trigger per Decision 2026-06-05-028**
- `docs/spec-to-cadence-reconciliation/reconciliation-decision-framework.md` §3(c) — contract-help path framework (path not activated)
- `docs/spec-to-cadence-reconciliation/backfill-log.md` — backfill row tracking Story 0.12 ↔ Story 0.14 budget cross-coupling — flip to `substantive-backfill-applied` at 2026-06-05 close-out
- `_bmad-output/implementation-artifacts/deferred-work.md` — Story 0.14 P5 2GB-floor follow-on measurement obligation entry per §4
- `.decision-log.md` Decision 2026-06-01-012 body item 9 — Story 0.12 contract-help-path includes external native-stack validation engineering (path not activated)
- `.decision-log.md` Decision 2026-06-02-014 — Story 0.14 author-commit + Task 7 budget ratification supersession entry (superseded by Decision 030)
- `.decision-log.md` Decision 2026-06-05-030 — Story 0.14 Tasks 7-11 ratification + this Task 8 close-out FM-2 device-substitution disposition
