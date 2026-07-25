# 90-Second Contribution-Loop Measurement — Validation Artifact (SM-1 Demo Beat B21)

**Authority cites:** epics.md:2853 (Epic-8 demoable closure + SM-1 B21 "Measurement fence"); epics.md:3055-3076 (Story 8.12 body); architecture.md:34-36 (canonical 3GB-Android device + `<1s p95` UPI-intent-launch budget); Story 0.10 P0-2c (VI/low-vision device roster) + Story 0.14 P0-5 device roster; AR-49 (launch-gate closure discipline).

> **STATUS: SCAFFOLDED — FIELD RUN OWED, CARRIED UN-ATTESTED-PENDING.**
> The measurement **instrument** ships in Story 8.12 (the on-device timing harness + the off-device p95
> aggregation, both unit-tested). The **≥ 10-session field run** on the canonical validation device under
> throttled cellular is a **manual, on-device activity** — **owner: BigDev, before Phase-1 launch**. Its
> result rows, evidence, and verdict are recorded here as `_PENDING-MEASUREMENT_` / `_PENDING-FIELD-RUN_`
> and carried **un-attested-pending**. **No session figures are fabricated to manufacture a green verdict**
> ([[feedback_record_unattested_no_backfill]] — integrity > appearance; the owed-but-uncaptured evidence is
> recorded openly and carried as an open launch-gate item). This is *Resolved via explicit deferral*, not
> *Not addressed* ([[feedback_closure_language_precision]]).

## §1 Header + gate statement

| Field | Value |
|---|---|
| Gate | **TWT-portion ≤ 60s p95** on the canonical validation device with cold cache; **total observed loop ≤ 90s** (UPI-app round-trip included) |
| Owning Story | Story 8.12 (instrument + scaffold) |
| Field-run owner | **BigDev**, before Phase-1 launch |
| Launch-gate roster row | `sm1-90s-twt-portion-loop-measurement` — `docs/launch-gate-inventory/inventory-roster.md` (Row 16), `current_status: open` |
| Instrument (mobile capture) | `apps/mobile/lib/loop-timing.ts` (pure breakdown) + `loop-timing-session.ts` (in-flight orchestration) + `loop-timing-store.ts` (MMKV export) + the four boundary marks in `_layout.tsx` / `ActiveContributionCard.tsx` / `UPIIntentButton.tsx` / `(contribution)/pay.tsx` |
| Instrument (off-device p95) | `apps/jobs/tests/loop-90s-aggregate.ts` (reuses `@twt/measured-validation` `percentile()`) |
| Data pull | debug screen `apps/mobile/app/(contribution)/loop-timing-debug.tsx` → "Share JSON" → `tsx apps/jobs/tests/loop-90s-aggregate.ts <exported.json>` |

**The loop is already whole** (this story only observes it): 8.2 My Pool card → 8.4 UPI Intent + UTR self-attest + yellow pill → 8.13 lit the real `pa=` (nominee VPA), so `upi://pay` has a live destination. Story 8.12 adds ZERO member-facing friction, ZERO behavior change, ZERO PII, ZERO measurable hot-path latency — a mark is a `performance.now()` read.

## §2 Protocol — device, network, cold-cache, session hygiene

| Item | Requirement |
|---|---|
| **Device** | The canonical validation device — 3GB-class mid-range Android (architecture.md:34; Story 0.14 P0-5 roster Device 1 `device-mid-range-snapdragon-4-series-android`). VI/low-vision accessibility pass cross-refs Story 0.10 P0-2c. |
| **Network** | Throttled cellular (representative 4G, not office Wi-Fi) — the round-trip and segment (b)'s intent fetch must experience real-world latency. |
| **Cold cache** | Each measured session begins from a **cold start** (app fully closed → relaunch), so `app_open → card_render` reflects the honest cold-cache render, not a warm resume. |
| **Continuous session** | One session = one **continuous** contribution attempt from cold `app_open` to the `yellow_pill`. The member proceeds without deliberately pausing. |
| **Interruption / outlier handling** | A session where the member sets the phone down mid-decision (or is interrupted) is **flagged and excluded**, NOT counted as a 90s failure — the harness's `member_think_time` bucket makes such deliberation visible so it never silently inflates the TWT-portion. An incomplete or out-of-order capture is excluded automatically by the `complete` gate (§3). Record the exclusion + reason in the row `notes`. |
| **Sample size** | **≥ 10** representative complete sessions. |
| **Enabling the harness** | Build with `EXPO_PUBLIC_LOOP_TIMING=1` (or a `__DEV__` build). Production member builds capture nothing. |

**Known measurement-fidelity limitations (accepted, code review 2026-07-25):**

- **`upi_return` noise.** The mark is stamped on the first `AppState` background→active transition after `intent_fire` — there is no OS-level signal distinguishing a genuine return from the UPI app versus an incidental interruption (a phone call, a notification-shade pull-down, or the member pressing home and back) that happens to land in the same window. The operator should treat any session with an implausibly short or long `upiRoundTripMs` as a candidate for the interruption/outlier exclusion above and record the reason in the row `notes`, rather than accept it at face value.
- **Field-run build ≠ production build.** The build used for this field run (`EXPO_PUBLIC_LOOP_TIMING=1`) necessarily bundles the debug-gated instrumentation (the timing marks, the MMKV store writes, the debug screen) that a real member's production build never loads. This is accepted as a negligible cost of the instrument itself — the marks are additive `performance.now()` reads and MMKV writes, not a behavior or rendering change to the pay flow — but it means the measured binary is not byte-identical to what ships, and the figures below carry that caveat.

## §3 Mark + segment definitions (from AC1 — the load-bearing measurement contract)

Seven wall-clock marks (`performance.now()` ms), captured at each boundary of a continuous attempt:

| Mark | Boundary |
|---|---|
| `app_open` | cold-start / home mount |
| `card_render` | `<ActiveContributionCard>` first paints the assigned live pool |
| `cta_tap` | the card's contribute CTA press |
| `intent_fire` | immediately after `Linking.openURL(upiUrl)` resolves (last TWT instant before hand-off) |
| `upi_return` | the `AppState` background→active transition after `intent_fire` (first TWT instant after hand-off) |
| `utr_confirm` | the `/attest` completes |
| `yellow_pill` | the attested pill renders |

**Three DISJOINT buckets** — the decomposition is the whole story (get it right):

| Bucket | Marks | In the TWT-portion budget? |
|---|---|---|
| (a) app-open → card render | `app_open → card_render` | **YES** |
| member think-time | `card_render → cta_tap` | **NO** — reported separately; neither TWT nor round-trip |
| (b) tap CTA → intent fire (incl. `/pay` nav + intent fetch) | `cta_tap → intent_fire` | **YES** |
| UPI-app round-trip | `intent_fire → upi_return` | **NO** — the explicitly EXCLUDED portion (member's UPI app + bank + network) |
| (c-ui) return → UTR-confirm | `upi_return → utr_confirm` | **YES** |
| (d) attest → yellow pill | `utr_confirm → yellow_pill` | **YES** |

- **TWT-portion = (a) + (b) + (c-ui) + (d).**
- **Total observed = `app_open → yellow_pill`** (all three buckets).
- The classic error — TWT-portion = total − round-trip — **wrongly folds member think-time in** and can fail the ≤ 60s gate on the member's own deliberation. Sum only the four TWT segments; report think-time on its own line.
- A session is **complete** iff all seven marks are present **and** monotonically ordered; incomplete / out-of-order sessions are excluded (never a NaN in a results row). The already-attested shortcut paths (D1a) legitimately produce incomplete, correctly-excluded sessions.

**Segment-(b) cross-link (D5):** segment (b) includes `POST /api/v1/member/contribution/intent`, on which Story 8.13 put up to two live KMS decrypts (nominee-VPA ciphertext), flagging the architecture's `<1s p95` UPI-intent-launch budget (architecture.md:36) as a re-check this measurement depends on. **If segment (b) is the p95 offender, the 8.13 KMS-on-hot-path is the prime suspect.** The server-side intent p95 is a separate, already-tooled measurement (the `@twt/measured-validation` core, server-side); this artifact measures (b) end-to-end from the device.

## §4 p95 method (from AC2)

The **p95 TWT-portion** and **p95 total** are computed **off-device** by `apps/jobs/tests/loop-90s-aggregate.ts`, reusing `@twt/measured-validation`'s `percentile()` — the fixed **floor-indexed nearest-rank** convention (`sortedAsc[floor((p/100) * n)]`, clamped). This is a deliberate, fixed convention: a different one (e.g. linear interpolation) would report a different number for the same sample, so pinning it keeps the figure reproducible and comparable across runs. The aggregation is pure + unit-tested (`apps/jobs/tests/loop-90s-aggregate.test.ts`: seeded sample → asserted floor-indexed p95; incomplete sessions dropped before aggregation).

`@twt/measured-validation` is **never imported into `apps/mobile`** — it transitively deps `@twt/domain` → `pg`, which would leak into the Metro bundle ([[project_contracts_domain_bundle_boundary]]). The mobile harness captures + exports raw per-session breakdowns only. The synthetic `measureP95` / `runPool` concurrency driver is deliberately **not** used — the loop is human-driven, one real session at a time; there is no `op` to pool (D3).

## §5 Results — ≥ 10 sessions (`_PENDING-MEASUREMENT_`)

All cells `_PENDING-MEASUREMENT_` until the field run. TWT-portion = (a)+(b)+(c-ui)+(d); round-trip + think-time are the two excluded buckets; total = all three.

| Session | TWT-portion | UPI round-trip | member think-time | total | notes |
|---|---|---|---|---|---|
| 1 | `_PENDING-MEASUREMENT_` | `_PENDING-MEASUREMENT_` | `_PENDING-MEASUREMENT_` | `_PENDING-MEASUREMENT_` | `_PENDING-MEASUREMENT_` |
| 2 | `_PENDING-MEASUREMENT_` | `_PENDING-MEASUREMENT_` | `_PENDING-MEASUREMENT_` | `_PENDING-MEASUREMENT_` | `_PENDING-MEASUREMENT_` |
| 3 | `_PENDING-MEASUREMENT_` | `_PENDING-MEASUREMENT_` | `_PENDING-MEASUREMENT_` | `_PENDING-MEASUREMENT_` | `_PENDING-MEASUREMENT_` |
| 4 | `_PENDING-MEASUREMENT_` | `_PENDING-MEASUREMENT_` | `_PENDING-MEASUREMENT_` | `_PENDING-MEASUREMENT_` | `_PENDING-MEASUREMENT_` |
| 5 | `_PENDING-MEASUREMENT_` | `_PENDING-MEASUREMENT_` | `_PENDING-MEASUREMENT_` | `_PENDING-MEASUREMENT_` | `_PENDING-MEASUREMENT_` |
| 6 | `_PENDING-MEASUREMENT_` | `_PENDING-MEASUREMENT_` | `_PENDING-MEASUREMENT_` | `_PENDING-MEASUREMENT_` | `_PENDING-MEASUREMENT_` |
| 7 | `_PENDING-MEASUREMENT_` | `_PENDING-MEASUREMENT_` | `_PENDING-MEASUREMENT_` | `_PENDING-MEASUREMENT_` | `_PENDING-MEASUREMENT_` |
| 8 | `_PENDING-MEASUREMENT_` | `_PENDING-MEASUREMENT_` | `_PENDING-MEASUREMENT_` | `_PENDING-MEASUREMENT_` | `_PENDING-MEASUREMENT_` |
| 9 | `_PENDING-MEASUREMENT_` | `_PENDING-MEASUREMENT_` | `_PENDING-MEASUREMENT_` | `_PENDING-MEASUREMENT_` | `_PENDING-MEASUREMENT_` |
| 10 | `_PENDING-MEASUREMENT_` | `_PENDING-MEASUREMENT_` | `_PENDING-MEASUREMENT_` | `_PENDING-MEASUREMENT_` | `_PENDING-MEASUREMENT_` |

**Aggregates (from `loop-90s-aggregate.ts`):** p95 TWT-portion = `_PENDING-MEASUREMENT_`; p95 total = `_PENDING-MEASUREMENT_` (p50/p99 for context = `_PENDING-MEASUREMENT_`).

## §6 Evidence (`_PENDING-FIELD-RUN_`)

- Screenshots / screen-recording of ≥ 1 representative session: `_PENDING-FIELD-RUN_`
- The exported `sessions.json` (raw per-session breakdowns, no PII) archived alongside this doc: `_PENDING-FIELD-RUN_`
- Device + OS build + network-throttle attestation: `_PENDING-FIELD-RUN_`

## §7 Verdict (`_PENDING-FIELD-RUN_`)

**Pass/fail rule (spelled out so the verdict is falsifiable, not asserted):**

- **PASS** ⇔ p95 TWT-portion ≤ 60s **AND** p95 total observed ≤ 90s, across ≥ 10 complete canonical-device sessions under throttled cellular with cold cache.
- **FAIL** ⇔ p95 TWT-portion > 60s (**remediation required before Phase-1 launch** — if segment (b) is the offender, start at the 8.13 KMS-on-hot-path per §3/D5) OR p95 total > 90s.

**Verdict:** `_PENDING-FIELD-RUN_` — the instrument is shipped; the on-device measurement is a launch-gate activity (owner BigDev, before Phase-1 launch), recorded here un-attested-pending and tracked open at roster Row 16.
