# Device-Procurement Roster — P0-5 Native-Stack Validation

**Status:** Author-committed scaffolding with 3 placeholder rows at `procurement_status = pending-budget-ratification`; awaiting Trustee Panel budget ratification (Task 7) + Solo Builder procurement (Task 8).

**Authority cites:** UX spec lines 810-812 (three test devices); architecture line 2821 (device-support matrix); UX spec line 814 (pass-criteria all-must-hold discipline); `docs/spec-to-cadence-reconciliation/README.md` line 19 + line 152 (Story 0.12 contract-help-path device-procurement budget cross-coupling); `docs/spec-to-cadence-reconciliation/reconciliation-decision-framework.md` §3(c) (contract-help path framework); `.decision-log.md` Decision 2026-06-01-012 body item 9 (Story 0.12 external native-stack validation engineering eligibility); Decision 2026-06-02-014.

## §1 Schema

| Field | Type | Constraints |
|---|---|---|
| `device_id` | canonical slug | Append-only; forbidden-removal; lifecycle exit via supersession only |
| `device_class` | enum | `mid-range-snapdragon-4-series-android` \| `older-entry-level-2gb-android-11` \| `iphone-target-ios-minimum` |
| `target_spec` | string | Verbatim from UX spec lines 810-812 + architecture line 2821 |
| `recommended_model` | string | Placeholder at author-commit; substantive choice at Task 8 |
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
| `recommended_model` | `<TO-BE-AUTHORED-AT-TASK-8>` — candidate options: Redmi 10A / Realme C30 / Moto G14 / Samsung Galaxy A05 / Tecno Spark 10C (all Snapdragon 4-series with 3 GB RAM available in Bihar retail); specific choice at Task 8 trustee-or-Solo-Builder discretion |
| `cost_estimate_inr` | `<TO-BE-AUTHORED-AT-TASK-7>` — substantive cost estimate at Task 7 cross-coupled with Story 0.12 contract-help-path budget per `docs/spec-to-cadence-reconciliation/README.md` line 19 |
| `procurement_status` | `pending-budget-ratification` |
| `acquisition_path` | retail-purchase-preferred |
| `procurement_date` | TBD (Task 8) |
| `decommission_disposition` | `retain-as-test-device` (preferred — cross-coupled with Story 0.10 P0-2c PRECONDITION-2 prototype-operability dependency; decommissioning a device prevents downstream Story 0.10 substantive validation session) |
| `notes` | Mid-range floor per UX spec §6; load-bearing for Yogdaan Bahi 50-row scroll + Panchayat Noticeboard performance benchmark |

### Row 2 — `device-entry-level-2gb-android-11`

| Field | Value |
|---|---|
| `device_id` | `device-entry-level-2gb-android-11` |
| `device_class` | `older-entry-level-2gb-android-11` |
| `target_spec` | UX spec line 811 verbatim: "Older entry-level Android (2 GB RAM, Android 11)" |
| `recommended_model` | `<TO-BE-AUTHORED-AT-TASK-8>` — candidate options: Redmi 9A / Lava Yuva 2 / Itel A60 / Samsung Galaxy A04e (all 2 GB RAM Android 11 available in Bihar retail) |
| `cost_estimate_inr` | `<TO-BE-AUTHORED-AT-TASK-7>` |
| `procurement_status` | `pending-budget-ratification` |
| `acquisition_path` | retail-purchase-preferred |
| `procurement_date` | TBD (Task 8) |
| `decommission_disposition` | `retain-as-test-device` (preferred — same rationale as Row 1) |
| `notes` | **Load-bearing for P5 list performance measurement** per UX spec line 824 ("60 fps target / 30 fps minimum at 200+ entries" measured on the older entry-level Android device). 2GB RAM constraint may surface native-side OOM events under sustained scroll; instrument + document per `experiment-protocol.md` §6.5 |

### Row 3 — `device-iphone-ios-16-minimum`

| Field | Value |
|---|---|
| `device_id` | `device-iphone-ios-16-minimum` |
| `device_class` | `iphone-target-ios-minimum` |
| `target_spec` | UX spec line 812: "iPhone at the target iOS minimum version"; architecture line 2821: "iOS 16+" |
| `recommended_model` | `<TO-BE-AUTHORED-AT-TASK-8>` — candidate options: iPhone SE 2nd-gen / iPhone 8 / iPhone XR (all support iOS 16+); cost-vs-spec tradeoff at Task 8 |
| `cost_estimate_inr` | `<TO-BE-AUTHORED-AT-TASK-7>` — note: Apple Developer Program annual fee (~₹8,000-9,000 INR equivalent) is a cross-coupled cost requiring Task 7 budget envelope coverage; TestFlight enrollment per `experiment-protocol.md` §5.3 |
| `procurement_status` | `pending-budget-ratification` |
| `acquisition_path` | retail-purchase-preferred (Apple-refurbished or retail-new) |
| `procurement_date` | TBD (Task 8) |
| `decommission_disposition` | `retain-as-test-device` (preferred — iPhone retention for Story 0.10 P0-2c PRECONDITION-2 + ongoing iOS validation work post-P0-5) |
| `notes` | **P2 UPI Intent measurement caveat per UX spec line 818**: iPhone iOS UPI Intent behavior is OS-level different; the Android target is the load-bearing measurement surface; iPhone P2 cell MAY be tagged `not-applicable-iOS-OS-level-different` with rationale per `measurement-template.md` schema |

## §3 Story 0.12 P0-3 reconciliation device-procurement budget cross-coupling

Per `docs/spec-to-cadence-reconciliation/README.md` line 19 verbatim: "Stories 0.6 ... 0.13 ... and 0.14 (prototype device-procurement budget) all park funding-tradeoff cross-references here rather than re-litigating each per-Story". Per `docs/spec-to-cadence-reconciliation/README.md` line 152: "Story 0.12 closure unblocks ... Story 0.14". Per `.decision-log.md` Decision 2026-06-01-012 body item 9: "external native-stack validation engineering" contracted-help-path eligibility includes the device-procurement cost envelope.

**Cross-coupling discharge path:**

- The substantive `cost_estimate_inr` authoring at Task 7 routes through Story 0.12 contract-help-path budget reconciliation rather than ad-hoc per-Story funding.
- Task 7 trustee budget ratification cross-couples with the Story 0.12 reconciliation outcome at Story 0.12 Task 9 closure:
  - If Story 0.12 ratifies the `contract-help` path: Story 0.14 device-procurement budget is included in the contract-help cost envelope; Story 0.14 Task 7 ratification is standalone-on-the-record but funded through the Story 0.12 envelope.
  - If Story 0.12 ratifies `cut-scope` (no contract-help): Story 0.14 device-procurement budget requires standalone Trustee Panel ratification at Task 7 with no shared envelope.
  - If Story 0.12 ratifies `move-SM-1` (delayed ship target with funding flexibility): Story 0.14 device-procurement budget is Trustee Panel discretionary at Task 7.
- The `backfill-log.md` row (per `docs/spec-to-cadence-reconciliation/backfill-log.md`) tracks this Story-0.12 ↔ Story-0.14 budget cross-coupling at citation-slot-committed status pending Task 7 substantive authoring.

**Apple Developer Program annual fee cross-coupling:**

- Row 3 `notes` flags the Apple Developer Program annual fee (~₹8,000-9,000 INR equivalent) as a cross-coupled cost requiring Task 7 budget envelope coverage.
- This is a recurring annual cost (post-Phase-0); the Task 7 budget ratification should commit to either (a) including the recurring cost in the Story 0.12 contract-help-path envelope, OR (b) deferring the recurring-cost decision to a separate ADR after v1 launch.

## §4 Open ADR slots

Per `README.md` §7 Open ADR slots #1-#3:

1. **Specific Snapdragon 4-series Android model choice** (Row 1) — candidate options listed; selection at Task 8 trustee-or-Solo-Builder discretion
2. **Specific 2GB-RAM Android 11 model choice** (Row 2) — candidate options listed; selection at Task 8
3. **Specific iPhone iOS 16+ model choice** (Row 3) — candidate options listed; cost-vs-spec tradeoff at Task 8

## §5 Cross-link

- `experiment-protocol.md` §5 Per-device run checklist — operational protocol for each device
- `measurement-template.md` — 54-cell measurement matrix populated at Task 10 with `device_id` foreign-key to this roster
- `engagement-ledger.md` §4 Device-procurement log — per-device procurement event log at Task 8
- `docs/spec-to-cadence-reconciliation/README.md` line 19 + line 152 — Story 0.12 P0-3 reconciliation device-procurement budget cross-coupling
- `docs/spec-to-cadence-reconciliation/reconciliation-decision-framework.md` §3(c) — contract-help path framework
- `docs/spec-to-cadence-reconciliation/backfill-log.md` — backfill row tracking Story 0.12 ↔ Story 0.14 budget cross-coupling
- `.decision-log.md` Decision 2026-06-01-012 body item 9 — Story 0.12 contract-help-path includes external native-stack validation engineering
- `.decision-log.md` Decision 2026-06-02-014 — Story 0.14 author-commit + Task 7 budget ratification supersession entry
