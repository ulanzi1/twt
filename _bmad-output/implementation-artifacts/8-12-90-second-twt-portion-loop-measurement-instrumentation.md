---
baseline_commit: 3a3bbe062af9a9fcf8db57e566c80bfec3e747fa
---

# Story 8.12: 90-Second TWT-Portion Loop Measurement Instrumentation (SM-1 Demo Beat B21)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As Solo Builder + Trustee Panel demonstrating SM-1 readiness,
I want **measurement instrumentation** that captures the **TWT-portion** of the 90-second contribution loop
separately from the **UPI-app round-trip** portion,
So that the SM-1 demo beat B21 commitment (**TWT-portion ≤ 60s p95; total observed ≤ 90s**) is
**falsifiable on stage with measured evidence**, not asserted from aspiration.

## Scope — what belongs to 8.12 vs what is a reserved seam

> **Story 8.12 is `[GOVERNANCE]`. It OBSERVES the loop; it never CHANGES it.** The entire 90-second loop
> already ships and is demoable end-to-end: 8.2 card → 8.4 UPI Intent + UTR self-attest + yellow pill →
> 8.13 lit the real `pa=` (nominee VPA) so the `upi://pay` hop has a live destination. 8.12 adds a
> **wall-clock timing harness** across the four phase boundaries of that already-built loop, a way to
> **aggregate ≥ 10 real on-device sessions into a p95**, a **validation-results artifact**, and the
> **launch-gate roster row** that makes the ≤ 60s TWT-portion budget a real Phase-1 gate. **It must add
> ZERO member-facing friction, ZERO behavior change to the pay flow, ZERO PII, and ZERO measurable latency
> to the hot path** — a timing mark is a `performance.now()` read.

**This story has two halves — do not conflate them:**

| Half | What it is | Who owns closure |
|---|---|---|
| **(1) The buildable, testable harness (THIS story's code)** — on-device capture of the four phase marks + the UPI round-trip split, per-session breakdown (pure, unit-tested), MMKV-persisted session store, an off-device p95 aggregation reusing `@twt/measured-validation`, the validation-doc scaffold, and the launch-gate roster row. | Dev agent, this PR. |
| **(2) The manual field run (a LAUNCH GATE, not code)** — the actual ≥ 10 sessions on the **canonical validation device under throttled cellular**, with screenshots/video, producing the p95 verdict. | BigDev (named owner), **before Phase-1 launch**. Recorded **un-attested-pending** in the validation doc + carried as an open launch-gate item — **NEVER fabricated** ([[feedback_record_unattested_no_backfill]]). |

| Belongs to 8.12 (this story) | Deferred / reserved / do NOT do here |
|---|---|
| A **pure per-session timing module** (`apps/mobile/lib/loop-timing.ts`) — the phase-mark vocabulary + `computeLoopBreakdown(marks)` that derives the four TWT segments, the excluded UPI round-trip, the residual member think-time, the total, and mark-ordering/completeness validation | **Re-implementing a percentile on-device** — `@twt/measured-validation` transitively deps `@twt/domain` (`pg`); importing it into the Metro bundle is the [[project_contracts_domain_bundle_boundary]] leak. p95 is computed **off-device** (see D3) |
| The **capture wiring** at the four boundaries: `app_open`, `card_render`, `cta_tap`, `intent_fire`, `upi_return`, `utr_confirm`, `yellow_pill` — additive marks in `_layout.tsx` / `ActiveContributionCard` / `UPIIntentButton` / `pay.tsx`, incl. the **first scoped `AppState` listener** for the background→active (returned-from-UPI) mark | **A global `focusManager`/`AppState` refetch bridge** — TanStack Query's focus-refetch is deliberately un-wired (`usePoolContributorsQuery.ts:18`); do NOT wire it as a side effect. The AppState listener here is scoped to the pay flow's timing only |
| An **MMKV-persisted session store** (`loop-timing-store.ts`, debug-gated) that appends a completed session breakdown, lists them, clears, and **exports JSON** for off-device analysis | **Any member-visible timing UI** on the normal navigation. Sushil never sees a stopwatch. The inspection/export affordance is **debug-gated** (`__DEV__` / an `EXPO_PUBLIC_*` flag), off the member path |
| An **off-device aggregation** (reuses `@twt/measured-validation` `percentile()`) that reads the exported sessions → **p95 TWT-portion + p95 total** using the framework's fixed floor-indexed nearest-rank convention → the versioned figures for the doc | **The synthetic concurrency driver** `measureP95`/`runPool` — the loop is **human-driven, one real session at a time**; you cannot run it under a concurrency pool. Reuse only `percentile()` + the evidence discipline (D3) |
| The **validation-results artifact** `_bmad-output/research/contribution-loop-90s-validation.md` — protocol + segment definitions + the ≥ 10-session results table (placeholders) + the p95 method + the pass/fail gate | **Fabricating the ≥ 10 sessions.** The field run is half (2) — scaffold the doc; mark the run `_PENDING-FIELD-RUN_`; carry it un-attested ([[feedback_record_unattested_no_backfill]]) |
| The **launch-gate roster row** appended to `docs/launch-gate-inventory/inventory-roster.md` (owner + closure criteria + target date) + the `.decision-log.md` author-commit entry | **Re-opening / editing the frozen loop** — 8.2 card, 8.4 intent+attest+yellow, 8.13 VPA. 8.12 changes none of their behavior. Instrumentation is purely additive |

## Acceptance Criteria

**AC1 — The instrumentation captures the four phase boundaries on-device and splits the TWT-portion from the UPI-app round-trip (the load-bearing measurement contract).**
Given SM-1 demo beat B21 (`epics.md:2853`, "Measurement fence") + the already-shipped loop (8.2 card render → 8.4 `<UPIIntentButton>` fire → return → UTR paste → yellow pill; 8.13 lit the real `pa=`),
When the instrumentation is wired,
Then wall-clock marks are captured at each boundary of a **continuous** contribution attempt: **`app_open`** (cold start / home mount), **`card_render`** (the `<ActiveContributionCard>` first paints the assigned live pool), **`cta_tap`** (the card's contribute CTA press), **`intent_fire`** (immediately after `Linking.openURL(upiUrl)` resolves), **`upi_return`** (the `AppState` background→active transition after `intent_fire`), **`utr_confirm`** (the `/attest` completes), **`yellow_pill`** (the attested pill renders);
And the **four TWT-portion segments** are derived as **(a)** `card_render − app_open`, **(b)** `intent_fire − cta_tap`, **UI-side of (c)** `utr_confirm − upi_return`, **(d)** `yellow_pill − utr_confirm`, and **TWT-portion = (a) + (b) + (c-ui) + (d)**;
And the **UPI-app round-trip** = `upi_return − intent_fire` is captured **separately and EXCLUDED** from the TWT-portion (it is outside TWT's control — the member's chosen UPI app + bank + network);
And the residual **member think-time** (`cta_tap − card_render`, i.e. reading the card and deciding) is captured as its **own third bucket** — neither TWT-portion nor round-trip — so it can never silently inflate the TWT-portion nor hide a real render latency;
And the harness **changes no loop behavior** — every mark is an additive `performance.now()` read; the 8.4/8.13 pay flow, intent construction, attest write, and yellow-pill semantics are byte-for-byte unchanged.

**AC2 — The budget is explicit and computed with the shared, versioned percentile convention (off-device — bundle-boundary preserved).**
Given the B21 fence (TWT-portion ≤ 60s; total observed ≤ 90s) + the `[[project_measured_validation_framework]]` "one percentile core / no duplicate tooling / versioned-evidence" discipline,
When ≥ 10 captured sessions are aggregated,
Then the **p95 TWT-portion** and **p95 total** are computed **off-device** by reusing `@twt/measured-validation`'s `percentile()` (the fixed **floor-indexed nearest-rank** convention — a different convention would report a different number for the same sample);
And the budget commitment is stated explicitly and testably: **TWT-portion ≤ 60s p95** on the canonical validation device with **cold cache**; **total observed loop ≤ 90s** with the UPI-app round-trip included;
And the aggregation is a **pure, unit-tested** step (seeded sample → asserted p95) so the number in the doc is reproducible, not hand-computed;
And `@twt/measured-validation` is **never imported into `apps/mobile`** — the mobile harness captures + exports raw per-session breakdowns only; the domain-dependent percentile core stays off the Metro bundle ([[project_contracts_domain_bundle_boundary]]).

**AC3 — The pre-launch validation run is protocol-scaffolded, recorded, and honestly un-attested until the field run happens.**
Given pre-launch validation on the canonical validation device (Story 0.10 P0-2c / Story 0.14 device roster) under throttled cellular,
When the measurement is to run across **≥ 10 representative sessions**,
Then a results artifact exists at **`_bmad-output/research/contribution-loop-90s-validation.md`** carrying: the protocol (device, network throttle, cold-cache, continuous-session + interruption/outlier handling), the exact segment/mark definitions from AC1, the p95 method from AC2, a ≥ 10-row results table (per-session TWT-portion / round-trip / think-time / total), and the **gate verdict** (p95 TWT-portion ≤ 60s **passes**; p95 ≥ 60s **fails** → remediation required before Phase-1 launch);
And because the field run is a **manual, on-device activity** (half (2), owner BigDev), the results rows + screenshots/video + verdict are scaffolded as **`_PENDING-MEASUREMENT_` / `_PENDING-FIELD-RUN_`** and carried **un-attested-pending** — the doc records openly that the run is owed, and **no session figures are fabricated** to manufacture a green verdict ([[feedback_record_unattested_no_backfill]], [[feedback_closure_language_precision]] — *Resolved via explicit deferral*, not "not addressed").

**AC4 — The gate appears in the Story 0.15 launch-gate inventory with a named owner, closure criteria, and target date.**
Given the Story 0.15 architectural launch-gate inventory (`docs/launch-gate-inventory/inventory-roster.md`) + AR-49 ("all entries must reach closure or explicit disposition before Phase-1 transition"),
When this measurement gate is scheduled,
Then a **new appended row** (below the reserved Row 15, per the roster's append-only convention) records: `gate_id` (e.g. `sm1-90s-twt-portion-loop-measurement`), **owner = BigDev**, **closure_criteria** = "p95 TWT-portion ≤ 60s across ≥ 10 canonical-device sessions under throttled cellular AND total observed ≤ 90s, recorded in `_bmad-output/research/contribution-loop-90s-validation.md`", **target_date** = before Phase-1 launch (relative-to-fact trigger), **current_status = `open`** (instrumentation shipped; field run pending), and **cross_story_discharge_path = Story 8.12**;
And a `.decision-log.md` author-commit entry records the row addition; the `notes` field flags that this is an **epics/PRD-authored SM-1 measurement gate** appended per the Story-15-supersession convention (not one of the architecture-verbatim Rows 1-11) per [[feedback_architecture_vs_prd_boundary]].

## Tasks / Subtasks

- [x] **Task 1 — Pure per-session timing module (AC1).**
  - [x] Author `apps/mobile/lib/loop-timing.ts` — the mark vocabulary `LoopPhaseMark = 'app_open' | 'card_render' | 'cta_tap' | 'intent_fire' | 'upi_return' | 'utr_confirm' | 'yellow_pill'`, a `LoopSession` = `{ marks: Partial<Record<LoopPhaseMark, number>> }` (monotonic `performance.now()` ms), and a pure `computeLoopBreakdown(session): LoopBreakdown` returning `{ segA_ms, segB_ms, segCui_ms, segD_ms, twtPortionMs, upiRoundTripMs, memberThinkMs, totalMs, complete }` per the AC1 arithmetic. `complete` is true iff all seven marks are present **and** monotonically ordered; an incomplete/out-of-order session returns `complete:false` and is excluded from aggregation (never a NaN in a results row).
  - [x] Keep it **framework-free and dependency-free** (no RN imports, no `@twt/*` imports) so it unit-tests in the node-only Vitest env (the 8.4/8.13 "mobile mount tests are a repo no-op" posture) and never risks the bundle boundary. This is the primary testable surface.

- [x] **Task 2 — MMKV-persisted, debug-gated session store + export (AC1, AC2-capture side).**
  - [x] Author `apps/mobile/lib/loop-timing-store.ts` — a namespaced MMKV store (`createMMKV({ id: 'twt-loop-90s' })`, mirroring `lib/mmkv.ts` and the `filed-claim.ts` / `claim-draft.ts` MMKV-backed helpers): `recordSession(breakdown)`, `listSessions()`, `clearSessions()`, `exportSessionsJson()`. Persist only the **numeric breakdowns** (no member id, no pool id, no UTR, no VPA — this is timing, not identity: **zero PII**).
  - [x] Gate all capture + persistence behind a single **debug flag** (`__DEV__` OR `process.env.EXPO_PUBLIC_LOOP_TIMING === '1'`) so a production member build captures nothing and pays nothing. Expose a tiny **debug-only** inspection/export affordance (a debug screen or a settings-debug tile guarded by the same flag) that shows the session list + a "Copy/Share JSON" action for pulling the ≥ 10 sessions off-device. It must NOT appear on any normal member surface.
  - [x] Unit-test the store with a mocked `react-native-mmkv` (the `filed-claim.test.ts` / `claim-draft.test.ts` precedent): append/list/clear/round-trip an exported→re-parsed JSON; assert no PII keys are ever written.

- [x] **Task 3 — Capture wiring at the four boundaries (AC1) — additive, behavior-preserving.**
  - [x] `apps/mobile/app/_layout.tsx` (or the home tab): mark **`app_open`** at cold-start mount (the honest "app open" for the cold-cache measurement). Provide a re-arm so a fresh loop attempt starts a new session cleanly (a member who backgrounds and returns to start over is a new session, not a resumed one). **Session-boundary guard:** both `app_open` and `card_render` must be **mount-once** marks (an empty-dependency effect / a session-id ref that only re-arms on an explicit new-session boundary — e.g. after a completed or cleared session), never re-fired by a query-data dependency. `useActiveContributionQuery` has no `refetchInterval` and defaults to `staleTime: 1h` / `refetchOnWindowFocus: false`, so today `data` genuinely doesn't change mid-session — but the mark must still be written so a future refetch/invalidation can never re-stamp `app_open`/`card_render` mid-loop and corrupt segment (a).
  - [x] `apps/mobile/components/active-contribution/ActiveContributionCard.tsx`: mark **`card_render`** when the card first paints the **assigned live pool**, via a **mount-once** effect or `onLayout` on the assigned-state container (guarded so it fires exactly once per session, not on every re-render of the resolved assigned data — not on the loading/suppressed states). Mark **`cta_tap`** in the contribute CTA `onPress` (the same `onContribute` that navigates to `/pay`). Note: when `data.myContribution === 'attested'` on load, `hasAttested` is already true and the component renders the yellow pill directly with **no Contribute CTA** (`ActiveContributionCard.tsx:205-234`) — no `cta_tap` is possible from that render, which is correct (the member already attested; see D1a).
  - [x] `apps/mobile/components/active-contribution/UPIIntentButton.tsx`: mark **`intent_fire`** immediately after `await Linking.openURL(upiUrl)` resolves (the `onLaunched()` path) — the last TWT-controlled instant before the UPI app takes over.
  - [x] `apps/mobile/app/(contribution)/pay.tsx`: add the **first scoped `AppState` listener** (`AppState.addEventListener('change', …)`, cleaned up on unmount) that marks **`upi_return`** on the first `background → active` transition **after** `intent_fire`. Mark **`utr_confirm`** in `onConfirm` after `memberContributionAttest` resolves. Mark **`yellow_pill`** in the `attested` render path (an effect on `attested === true`). On a complete, ordered session → `recordSession(computeLoopBreakdown(...))`. Note: the already-attested shortcut paths (`myContribution === 'attested'` on mount, or attested-elsewhere mid-flow — both route straight to the yellow-pill confirmation without calling `onConfirm`) never fire `utr_confirm`; the resulting session is correctly excluded by the `complete` gate (Task 1) — this is expected, not a harness bug (see D1a). **Do NOT** wire a global `focusManager` refetch bridge — the listener exists only to timestamp the return (the `usePoolContributorsQuery.ts:18` note explicitly flags focus-refetch as un-wired; leave it that way).
  - [x] Every mark is a guarded, debug-flag-gated call — with the flag off, the wiring is inert. Confirm the pay flow's behavior (intent fetch, switch-account, failure coach, attest, yellow pill) is unchanged.

- [x] **Task 4 — Off-device p95 aggregation reusing `@twt/measured-validation` (AC2).**
  - [x] Author a small **node-context** aggregation (NOT in `apps/mobile`) that reads the exported session JSON and computes **p95 TWT-portion** + **p95 total** (+ p50/p99 for context) via `@twt/measured-validation`'s `percentile()` (sort ascending, then `percentile(sortedAsc, 95)`). Home it where a node workspace already deps `@twt/measured-validation` to avoid a premature package ([[feedback_no_premature_package]]) — e.g. a script/tool under `apps/jobs` (Story 7.9's consumer) or a `tools/loop-90s/` node entry; do **not** create a new published package.
  - [x] Reuse **only** `percentile()` (+ optionally the `buildRecord`/`EVIDENCE_SCHEMA_VERSION` evidence shape). Do **NOT** use `measureP95`/`runPool` — the human loop cannot be driven under a concurrency pool; misapplying the synthetic driver would be a category error (state this in a header comment so a future reader doesn't "fix" it by wiring the driver).
  - [x] Unit-test the aggregation: a seeded sample of ≥ 10 breakdowns → assert the p95 TWT-portion equals the floor-indexed nearest-rank value (pin the convention), and that incomplete sessions are excluded before aggregation.

- [x] **Task 5 — Validation-results artifact scaffold (AC3).**
  - [x] Create `_bmad-output/research/contribution-loop-90s-validation.md` (model the section discipline on `p0-5-native-stack-validation.md`): §1 header + gate statement (TWT-portion ≤ 60s p95, total ≤ 90s); §2 canonical device + network-throttle protocol (Story 0.10 P0-2c / Story 0.14 roster; cold cache; **continuous-session definition + interruption/outlier handling** — a session where the member sets the phone down mid-decision is flagged, not counted as a 90s failure); §3 the exact mark/segment definitions from AC1; §4 the p95 method from AC2 (cite the `@twt/measured-validation` percentile convention); §5 the **≥ 10-session results table** (columns: session, TWT-portion, UPI round-trip, member think-time, total, notes) with every cell `_PENDING-MEASUREMENT_`; §6 evidence (screenshots/video) `_PENDING-FIELD-RUN_`; §7 the verdict `_PENDING-FIELD-RUN_` with the pass/fail rule spelled out.
  - [x] State plainly at the top that the field run is **owed (BigDev, before Phase-1 launch)** and is carried **un-attested-pending** — the instrumentation is shipped; the on-device measurement is a launch-gate activity, not fabricated here ([[feedback_record_unattested_no_backfill]]).

- [x] **Task 6 — Launch-gate roster row + decision-log (AC4).**
  - [x] Append a new row (below Row 15 — this is the **first** row ever appended there; no prior Story-15-supersession precedent exists) to `docs/launch-gate-inventory/inventory-roster.md` populating **all 11 schema fields** (the roster's own schema line + every existing row, including the still-`reserved` Row 15, populate the full set — do not drop columns for a non-architecture row): `gate_id: sm1-90s-twt-portion-loop-measurement`, `gate_name` (SM-1 B21 90-second-loop TWT-portion measurement), `architecture_source_line: N/A — PRD/epics-authored (epics.md:3055-3076); not an architecture-verbatim row`, `owner: BigDev`, `support: N/A`, `closure_criteria` (the AC4 testable signal — p95 TWT-portion ≤ 60s over ≥ 10 sessions + total ≤ 90s, recorded in the validation doc), `target_date` (before Phase-1 launch, relative-to-fact), `current_status: open`, `closure_evidence_link:` (empty — populated on closure), `missed_target_escalation_log:` (empty), `cross_story_discharge_path: Story 8.12`, `notes` (epics/PRD-authored SM-1 gate appended per the Story-15-supersession convention — not an architecture-verbatim Row 1-11; [[feedback_architecture_vs_prd_boundary]]).
  - [x] Add a `.decision-log.md` author-commit entry recording the row addition + this story's discharge; cross-link it from the row's `closure_evidence_link` seam (the row stays `open` — closure is the field run).

- [x] **Task 7 — Friction-budget disposition + sprint-status ledger + regression gate.**
  - [x] Add the **Story 8.12 disposition** to `friction-budget.md` (the 8.4/8.5/8.13 precedent): **declaration affirmed, no new row** — the timing harness is a **debug-gated measurement instrument** in `apps/mobile` (EAS build a no-op → `member-app-native` stays a no-op), introduces **no member-facing friction** (Sushil sees no stopwatch), **no PII**, and touches **no public `apps/public` surface**, so the page-weight baseline is unchanged. Do NOT ratchet ([[project_friction_budget_baseline_ratchet]]).
  - [x] Flip `development_status[8-12-90-second-twt-portion-loop-measurement-instrumentation]` → `review` + add the top-of-file reverse-chron COMMENT ledger entry ([[project_sprint_status_ledger]]).
  - [x] No new **member-facing** i18n keys (the harness shows nothing to members; any debug surface is dev-English, excluded from the parity gate). Run `pnpm ci:local` (`--concurrency=4`, DB on :5433) — all gates green ([[project_ci_actions_suspension_local_mirror]], [[project_ci_local_concurrency_oversubscription]]); the new `loop-timing` / store / aggregation unit tests are load-bearing for "done."

### Review Findings

- [x] [Review][Patch] Session re-arm gap — FIXED: added `markCtaTap()` in `loop-timing-session.ts` — re-arms `app_open`/`card_render`/all marks when a NEW `cta_tap` fires while `intent_fire` is already set from a prior attempt (a genuine retry resets so stale marks can never leak in; the retry is then correctly excluded as incomplete rather than polluting `memberThinkMs`/`totalMs`), and ignores a same-attempt double-press (see next item). `ActiveContributionCard.tsx` now calls `markCtaTap()` instead of the generic `markLoopPhase('cta_tap')`. Covered by 2 new tests in `loop-timing-session.test.ts`. [apps/mobile/lib/loop-timing-session.ts, apps/mobile/components/active-contribution/ActiveContributionCard.tsx]
- [x] [Review][Patch] `markUpiReturn` noise-transition limitation — FIXED: added a "Known measurement-fidelity limitations" caveat to §2 of the validation doc, directing the field-run operator to flag/exclude sessions with an implausible round-trip via the existing interruption/outlier exclusion. [_bmad-output/research/contribution-loop-90s-validation.md §2]
- [x] [Review][Patch] Field-run build divergence from production — FIXED: added a caveat to §2 of the validation doc noting the field-run build necessarily bundles the debug-gated instrumentation and is not byte-identical to the shipped production build. [_bmad-output/research/contribution-loop-90s-validation.md §2]
- [x] [Review][Patch] No minimum-sample-count (≥10) enforcement in the off-device aggregation — FIXED: `aggregateLoopSessions` now throws below `MINIMUM_COMPLETE_SESSIONS = 10` (was only checking for zero). New test asserts a 5-complete-session run throws. [apps/jobs/tests/loop-90s-aggregate.ts]
- [x] [Review][Patch] `loop-90s-aggregate.ts` CLI entrypoint had no error handling for a missing/malformed/non-array JSON file — FIXED: wrapped read/parse in try/catch + validated the parsed value is an array, both exiting with a clear message instead of a raw stack trace. [apps/jobs/tests/loop-90s-aggregate.ts]
- [x] [Review][Patch] The `AppState` listener in `pay.tsx` subscribed/tore down unconditionally on every mount even when loop-timing is fully disabled — FIXED: the subscription itself is now gated behind `loopTimingEnabled()`, so a production build never registers the listener. [apps/mobile/app/(contribution)/pay.tsx]
- [x] [Review][Patch] `cta_tap` mark was not `once`-guarded — FIXED as part of the `markCtaTap()` re-arm fix above: a same-attempt double-press (no `intent_fire` yet) is now a no-op. Covered by a new test in `loop-timing-session.test.ts`. [apps/mobile/lib/loop-timing-session.ts]
- [x] [Review][Patch] `utr_confirm` mark was duplicated across two call sites with no shared helper — FIXED: extracted `markAttestedAndRefresh()` in `pay.tsx`, called from both the main attest path and the stale-pool retry path. [apps/mobile/app/(contribution)/pay.tsx]
- [x] [Review][Patch] `loop-timing.test.ts` only exercised one out-of-order case — FIXED: added a parameterized test walking all 6 adjacent-mark-pair inversions in `LOOP_PHASE_ORDER`. [apps/mobile/tests/unit/loop-timing.test.ts]
- [x] [Review][Patch] Sprint-status ledger comment misstated the transition as `ready-for-dev -> in-progress -> review` — FIXED: corrected to `backlog -> review`, noting no separate ready-for-dev step was recorded. [_bmad-output/implementation-artifacts/sprint-status.yaml]
- [x] [Review][Defer] p95 at n=10 under the fixed floor-indexed nearest-rank convention reduces to "the maximum of the 10 samples" — a single slow session fails the whole gate. Inherent to the frozen shared percentile convention ([[project_measured_validation_framework]]); not fixable here without violating "one percentile core" discipline. — deferred, pre-existing convention
- [x] [Review][Defer] MMKV session-store has no schema version tag; a future `LoopBreakdown` shape change would silently mis-parse or drop old persisted sessions. Low severity — disposable field-run artifacts, not durable app state. [apps/mobile/lib/loop-timing-store.ts] — deferred, low severity
- [x] [Review][Defer] Debug screen shows only ✓/(incomplete) per session with no reason code for why a session is incomplete, making field-run troubleshooting harder. [apps/mobile/app/(contribution)/loop-timing-debug.tsx] — deferred, nice-to-have
- [x] [Review][Defer] `app_open` is stamped inside a JS-thread `useEffect`, necessarily excluding native launch time before the JS thread starts — segment (a) systematically undercounts true cold-start latency. Inherent to RN's JS-only instrumentation surface. [apps/mobile/app/_layout.tsx:74-76] — deferred, pre-existing platform limitation

## Dev Notes

### D0 — Read 8.4 AND 8.13 first; the loop you are measuring is already whole
8.4 built the write path (UPI Intent → UTR self-attest → yellow pill) and shipped with the `pa=` seam dark (no VPA substrate). 8.13 discharged that seam — it collects the nominee VPA at claim-time, decrypts it at the intent boundary, and re-enables a **real** `upi://pay`, so the epic's demoable 90-second loop (`epics.md:2853`) now runs **end-to-end to the yellow pill on the canonical device**. 8.12 is the story that makes that loop's timing **falsifiable**. Nothing in 8.12 changes the loop — it is a passive observer. The pay flow you are instrumenting is `apps/mobile/app/(contribution)/pay.tsx` (fetch intent on mount → `<UPIIntentButton>` → `AppState` return → UTR paste → `onConfirm` → `attested` yellow pill); the card that opens it is `ActiveContributionCard.tsx` (contribute CTA → `/pay`).

### D1 — The measurement definition is the whole story; get the three buckets right
The AC is precise and the dev MUST honor it exactly. The loop wall-clock decomposes into **three disjoint buckets**, not two:

| Bucket | Marks | In TWT-portion budget? |
|---|---|---|
| **(a)** app-open → card render | `app_open → card_render` | **YES** |
| **member think-time** (reading the card, deciding to pay) | `card_render → cta_tap` | **NO** — reported separately; neither TWT nor round-trip |
| **(b)** tap CTA → UPI Intent fire (incl. `/pay` nav + intent fetch) | `cta_tap → intent_fire` | **YES** |
| **UPI-app round-trip** (member's UPI app + bank + network) | `intent_fire → upi_return` | **NO** — the explicitly EXCLUDED portion |
| **UI-side of (c)** return → UTR-confirm (member pastes on TWT's surface) | `upi_return → utr_confirm` | **YES** |
| **(d)** attest → yellow pill render | `utr_confirm → yellow_pill` | **YES** |

**TWT-portion = (a) + (b) + (c-ui) + (d).** **Total observed = `app_open → yellow_pill`** (includes all three buckets). The classic mistake is to compute TWT-portion as `total − round-trip` — that WRONGLY folds member think-time into TWT-portion and can fail the ≤ 60s gate on the member's own deliberation. The other mistake is folding a slow `card_render` into the round-trip and hiding real render latency. Instrument each **named** boundary; sum only the four TWT segments; report think-time as its own line. (`intent_fire` is the last TWT instant before hand-off; `upi_return` is the first TWT instant after — the round-trip between them is not ours.)

### D1a — Already-attested shortcuts produce correctly-excluded incomplete sessions, not harness bugs
Two existing paths bypass the marked boundaries entirely: (1) `pay.tsx` routes straight to the confirmation view without calling `onConfirm` when `myContribution === 'attested'` on load or when the member attests elsewhere mid-flow; (2) `ActiveContributionCard.tsx`'s `hasAttested` conditional renders the yellow pill with **no Contribute CTA** at all when the member already attested (e.g., via the 8.10 out-of-band path), so `cta_tap` never fires. Both leave a session missing marks (`utr_confirm` and/or `cta_tap`) while `yellow_pill` may still fire. This is **expected** — the `complete` gate in `computeLoopBreakdown` (Task 1) excludes any session missing a mark, so these never pollute the p95. If you see incomplete sessions in the debug store during testing, check whether they originated from an already-attested state before assuming the timing wiring is broken.

### D2 — `AppState` is net-new; scope it to timing, do NOT wire a focus-refetch bridge
No `AppState` listener exists anywhere in the app yet, and TanStack Query's `focusManager` is deliberately un-wired (`apps/mobile/components/contributor-list/usePoolContributorsQuery.ts:18` says so explicitly). 8.12 adds the **first** `AppState.addEventListener('change', …)` — but **only** to timestamp the `background → active` return after `intent_fire`, scoped to and cleaned up by the `pay.tsx` screen. Do NOT take this as license to wire `focusManager` (global refetch-on-focus) — that is a behavior change with its own correctness surface (stale-while-revalidate on every app resume) and is out of scope. The listener reads a clock; it does not touch queries.

### D3 — p95 lives OFF-device; reuse the shared convention, never the synthetic driver
Two hard constraints collide here, and both must hold:
- **Bundle boundary:** `@twt/measured-validation` deps `@twt/domain`, which pulls `pg`. Importing it into `apps/mobile` leaks `pg` into the Metro bundle — the exact [[project_contracts_domain_bundle_boundary]] failure. So the **mobile side captures raw per-session breakdowns and exports JSON**; the **p95 is computed off-device** (a node context that already deps the package — `apps/jobs` or a `tools/` script).
- **Right tool, right use:** reuse `percentile()` (the fixed floor-indexed nearest-rank convention — the whole point of the versioned-evidence discipline is that the SAME convention produces the SAME number, so the doc's p95 is comparable and reproducible). Do **NOT** reuse `measureP95`/`runPool`: those drive an `op` under a concurrency pool for synthetic-load benching (validity FR-12A, 4.7 search, 7.9 pool engine). The 90-second loop is a **human on a real device, one session at a time** — there is no `op` to pool. Reusing the driver would be a category error; the reuse is `percentile()` (+ optionally the evidence-record shape) only. Leave a header comment saying so, so a future reader doesn't "helpfully" wire the driver.

### D4 — The field run is a launch gate, not a green checkmark you author
The ≥ 10-session on-device run under throttled cellular is a **manual activity on the canonical validation device** (Story 0.10 P0-2c / Story 0.14 roster) that the dev PR cannot execute. Build the instrument, scaffold the doc, register the gate — then record the run as **owed** (BigDev, before Phase-1 launch) and **un-attested-pending**. Do NOT type ten plausible-looking session rows to make the verdict green ([[feedback_record_unattested_no_backfill]] — integrity > appearance; the promised-but-uncaptured evidence is recorded openly and carried as open risk). The `_PENDING-FIELD-RUN_` verdict + the `open` roster row are the honest, correct end state for this PR. This mirrors how Story 0.14's P0-5 research artifact ships scaffolded with `_PENDING-MEASUREMENT_` cells and Tasks awaiting the external device run.

### D5 — Cross-link the intent-endpoint `<1s p95` budget (8.4 AC1 / 8.13 re-check)
Segment **(b)** (`cta_tap → intent_fire`) includes the `POST /api/v1/member/contribution/intent` fetch — and 8.13 put **up to two live KMS decrypts** on that endpoint (nominee-VPA ciphertext), flagging the architecture's **`<1s p95` UPI-intent-launch budget** (architecture.md:36) as a re-check that "**Story 8.12's SM-1 demo measurement depends on**" (8.13 Task 3 guardrail). So if segment (b) is the p95 offender, the 8.13 KMS-on-hot-path is the prime suspect. The **server-side** intent p95 is a separate, already-tooled measurement (the `[[project_measured_validation_framework]]` core, server-side); 8.12's client-side (b) segment measures it end-to-end from the device. Note the linkage in the validation doc so a slow (b) points at the right subsystem; do not re-tool the server-side p95 here.

### D6 — Zero PII, zero member-facing surface, zero behavior change (the governance invariants)
- **No PII:** persist only numeric durations. Never store `member_id`, `pool_id`, `alert_id`, `tr`, UTR, or VPA in the timing store — a stopwatch does not need identity. (Keeps the pii-scrape posture trivially clean and the store shareable for analysis.)
- **No member surface:** the capture + the inspection/export affordance are **debug-gated** (`__DEV__` / `EXPO_PUBLIC_LOOP_TIMING`). Sushil never sees a timer. This is why the friction-budget disposition is "no new row" and the page-weight baseline is untouched.
- **No behavior change:** marks are additive `performance.now()` reads on existing code paths; the loop's intent construction, attest write, switch-account, failure coach, and yellow-pill semantics are unchanged. If the debug flag is off, the wiring is inert.

### D7 — Reuse, do NOT re-invent
- **MMKV store:** `createMMKV({ id: … })` + the `mmkvStorage` shape (`apps/mobile/lib/mmkv.ts`); the persisted-helper pattern in `lib/filed-claim.ts` / `lib/claim-draft.ts` (+ their mocked-mmkv unit tests) — copy that shape for `loop-timing-store.ts` and its test.
- **Percentile:** `@twt/measured-validation` `percentile()` (off-device only) — the fixed convention. Do NOT hand-roll a percentile (apples-to-oranges risk the framework header warns against), and do NOT pull the package into mobile.
- **Validation-doc discipline:** `_bmad-output/research/p0-5-native-stack-validation.md` §-structure + `_PENDING-*` placeholder convention (Story 0.14) — model the new doc on it.
- **Launch-gate roster:** the Row schema + append-below-Row-15 convention in `docs/launch-gate-inventory/inventory-roster.md`; the `closure-criteria-rubric.md` / `target-date-rationale-template.md` for the row's fields.

### D8 — Do NOT touch (frozen / other-owned)
The 8.4/8.13 pay flow behavior (`pay.tsx`, `UPIIntentButton.tsx`, `intent.ts`, the attest write); the intent construction / `deriveContributionReference` / amount-lock / `tn` grammar; the 8.2 confirmed-only meter + tone gradient; the `@twt/measured-validation` core (reuse `percentile()` unchanged — do not re-pin the convention or add an on-device copy); the architecture-verbatim launch-gate Rows 1-11 (this is a NEW appended row). No migration, no new event, no new API endpoint — 8.12 is client-capture + off-device aggregation + docs/governance only.

### Testing standards
- **Pure unit (node-only Vitest, the 8.4/8.13 posture — `apps/mobile` mount tests are a repo no-op):** `loop-timing.ts` — the four-segment math, TWT-portion sum, round-trip exclusion, think-time as its own bucket, `complete` gating on presence + monotonic order, incomplete/out-of-order → excluded (never NaN). This is the load-bearing test.
- **Store unit (mocked `react-native-mmkv`, the `filed-claim.test.ts` precedent):** append/list/clear, export→re-parse round-trip, and a **no-PII-keys** assertion on what is written.
- **Aggregation unit (node, off-device):** a seeded ≥ 10-session sample → assert p95 TWT-portion == the floor-indexed nearest-rank value (pin the convention) and that incomplete sessions are dropped before aggregation.
- **RN wiring** (the `AppState` listener, the boundary marks) is verified by **typecheck + lint** (no mount harness); assert by inspection that the flag-off path is inert and the pay-flow behavior is unchanged.
- **No live-DB, no migration, no i18n-parity** obligation (no member copy). Merge gate = `pnpm ci:local` green.

### Project Structure Notes
- **New:** `apps/mobile/lib/loop-timing.ts` (pure module) + `apps/mobile/tests/unit/loop-timing.test.ts`; `apps/mobile/lib/loop-timing-store.ts` (MMKV, debug-gated) + its unit test; the off-device aggregation (`apps/jobs/…` or `tools/loop-90s/…`) + its unit test; the debug inspection/export affordance (debug-gated, off the member path); `_bmad-output/research/contribution-loop-90s-validation.md`.
- **Edit:** `apps/mobile/app/_layout.tsx` (or home tab — `app_open` mark); `apps/mobile/components/active-contribution/ActiveContributionCard.tsx` (`card_render`, `cta_tap`); `apps/mobile/components/active-contribution/UPIIntentButton.tsx` (`intent_fire`); `apps/mobile/app/(contribution)/pay.tsx` (`AppState` `upi_return`, `utr_confirm`, `yellow_pill`, `recordSession`); `docs/launch-gate-inventory/inventory-roster.md` (new row); `.decision-log.md` (author-commit entry); `friction-budget.md` (8.12 disposition); `_bmad-output/implementation-artifacts/sprint-status.yaml` (ledger).
- **Bundle-boundary variance (recorded):** the p95 core is deliberately OFF `apps/mobile` (it deps `@twt/domain`→`pg`); mobile exports raw breakdowns, node aggregates — this is the [[project_contracts_domain_bundle_boundary]] discipline applied to measurement tooling, not an oversight.

### References
- [Source: `_bmad-output/planning-artifacts/epics.md:3055-3076`] — Story 8.12 epic body (the three Given/When/Then).
- [Source: `_bmad-output/planning-artifacts/epics.md:2853`] — Epic-8 demoable closure + the SM-1 B21 "Measurement fence" (TWT-portion ≤ 60s; round-trip separate; total ≤ 90s).
- [Source: `apps/mobile/app/(contribution)/pay.tsx`] — the loop being instrumented (return handling, `onConfirm`, `attested` yellow pill).
- [Source: `apps/mobile/components/active-contribution/ActiveContributionCard.tsx` + `UPIIntentButton.tsx`] — the `card_render` / `cta_tap` / `intent_fire` boundaries.
- [Source: `apps/mobile/components/contributor-list/usePoolContributorsQuery.ts:18`] — the un-wired `AppState`/`focusManager` note (D2).
- [Source: `packages/measured-validation/src/percentiles.ts` + `src/index.ts`] — `percentile()` (reuse), `measureP95`/`runPool` (do NOT use); the floor-indexed nearest-rank convention + versioned-evidence discipline.
- [Source: `apps/mobile/lib/mmkv.ts` + `lib/filed-claim.ts` + `apps/mobile/tests/unit/filed-claim.test.ts`] — MMKV store + mocked-mmkv test precedent.
- [Source: `docs/launch-gate-inventory/inventory-roster.md`] — the Row schema + append-below-Row-15 convention (AC4).
- [Source: `_bmad-output/research/p0-5-native-stack-validation.md`] — the `_PENDING-*`-scaffolded research-artifact discipline to model the validation doc on.
- [Source: `_bmad-output/implementation-artifacts/8-13-…re-enable.md` Task 3 guardrails] — the `<1s p95` intent-endpoint re-check that 8.12's segment (b) depends on (D5).
- Memories: [[project_measured_validation_framework]] · [[feedback_no_premature_package]] · [[project_contracts_domain_bundle_boundary]] · [[feedback_record_unattested_no_backfill]] · [[feedback_closure_language_precision]] · [[feedback_architecture_vs_prd_boundary]] · [[project_friction_budget_baseline_ratchet]] · [[project_mmkv_asyncstorage_equivalent]] · [[project_sprint_status_ledger]] · [[project_ci_actions_suspension_local_mirror]] · [[project_ci_local_concurrency_oversubscription]].

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (Opus 4.8) — bmad-dev-story workflow.

### Debug Log References

- `pnpm --filter @twt/mobile test` → 12 files / 68 tests pass (incl. the 3 new pure suites: loop-timing 8, loop-timing-store 7, loop-timing-session 5).
- `pnpm --filter @twt/jobs exec vitest run tests/loop-90s-aggregate.test.ts` → 6 tests pass.
- `pnpm --filter @twt/mobile typecheck && lint` + `pnpm --filter @twt/jobs typecheck && lint` → clean. Two typecheck fixes during dev: tamagui `ScrollView` `contentContainerStyle` typing (use RN `ScrollView` in the debug screen), and a `noUncheckedIndexedAccess` index guard in the monotonic-order check.
- Merge gate `pnpm ci:local` (DATABASE_URL `…:5433/twt_dev?sslmode=disable`) → **PASSED, 28 jobs green** incl. test(unit), crypto-check, integration-tests, friction-budget, pii-scrape, i18n-parity, all invariants. (A first run flaked test(unit)+crypto-check under concurrency — both confirmed green in isolation — and integration failed only on a wrong DB URL without `sslmode=disable`.)

### Completion Notes List

- **`[GOVERNANCE]` — observes the loop, never changes it.** All seven marks are additive `performance.now()` reads gated behind `__DEV__ || EXPO_PUBLIC_LOOP_TIMING`; with the flag off the whole harness is inert (recordSession is a no-op, the AppState listener still runs but every mark call short-circuits). The 8.4/8.13 pay-flow behavior (intent construction, attest write, switch-account, failure coach, yellow pill) is byte-for-byte unchanged.
- **The three-bucket decomposition (D1) is the load-bearing contract.** TWT-portion = (a)+(b)+(c-ui)+(d); the UPI-app round-trip is captured separately and EXCLUDED; member think-time is its own third bucket. The primary test explicitly guards the `total − round-trip` trap (with think-time > 0 the two are provably different).
- **Bundle boundary held (D3).** `@twt/measured-validation` is imported ONLY in `apps/jobs/tests/` (off-device); `apps/mobile` captures + exports raw JSON and never touches the pg-transitive package. Aggregation reuses `percentile()` (floor-indexed nearest-rank) only — a header comment documents why `measureP95`/`runPool` must NOT be wired.
- **Field run owed, un-attested-pending (D4).** The ≥10-session field run is a launch-gate activity (owner BigDev, before Phase-1). The validation doc's results/verdict are scaffolded `_PENDING-MEASUREMENT_`/`_PENDING-FIELD-RUN_`; roster Row 16 is `open`; no session figures were fabricated ([[feedback_record_unattested_no_backfill]]).
- **AppState (D2).** Added the app's FIRST `AppState.addEventListener` — scoped to `pay.tsx`, cleaned up on unmount, timestamps the background→active return only; `markUpiReturn` guards it to the first transition AFTER `intent_fire`. Did NOT wire a `focusManager` refetch bridge (left un-wired per `usePoolContributorsQuery.ts:18`).
- **Substitution note:** the story references `AsyncStorage`-style local persistence; used MMKV per the app standard ([[project_mmkv_asyncstorage_equivalent]]) — `createMMKV({ id: 'twt-loop-90s' })`, its own namespace so clearing timing data never touches real caches.
- **Governance artifacts:** launch-gate Row 16 (first-ever append below Row 15) + Decision 2026-07-25-068 + the friction-budget 8.12 disposition (no new row, no ratchet — [[project_friction_budget_baseline_ratchet]]).

### File List

**New (code):**
- `apps/mobile/lib/loop-timing.ts` — pure per-session breakdown (Task 1)
- `apps/mobile/lib/loop-timing-store.ts` — debug-gated MMKV session store + export (Task 2)
- `apps/mobile/lib/loop-timing-session.ts` — in-flight session orchestrator (Task 3)
- `apps/mobile/app/(contribution)/loop-timing-debug.tsx` — debug-only inspection/Share-JSON screen (Task 2)
- `apps/jobs/tests/loop-90s-aggregate.ts` — off-device p95 aggregation + CLI (Task 4)

**New (tests):**
- `apps/mobile/tests/unit/loop-timing.test.ts` (8)
- `apps/mobile/tests/unit/loop-timing-store.test.ts` (7)
- `apps/mobile/tests/unit/loop-timing-session.test.ts` (5)
- `apps/jobs/tests/loop-90s-aggregate.test.ts` (6)

**New (docs/governance):**
- `_bmad-output/research/contribution-loop-90s-validation.md` — validation artifact scaffold (Task 5)

**Edited (capture wiring — additive marks only):**
- `apps/mobile/app/_layout.tsx` — `app_open`
- `apps/mobile/components/active-contribution/ActiveContributionCard.tsx` — `card_render`, `cta_tap`
- `apps/mobile/components/active-contribution/UPIIntentButton.tsx` — `intent_fire`
- `apps/mobile/app/(contribution)/pay.tsx` — AppState `upi_return`, `utr_confirm`, `yellow_pill`, finalize

**Edited (governance/tracking):**
- `docs/launch-gate-inventory/inventory-roster.md` — Row 16 (Task 6)
- `.decision-log.md` — Decision 2026-07-25-068 (Task 6)
- `friction-budget.md` — Story 8.12 disposition (Task 7)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — ledger flip → `review` (Task 7)

## Change Log

| Date | Change |
|---|---|
| 2026-07-25 | Story 8.12 implemented (Tasks 1-7). On-device 90-second-loop timing harness (pure breakdown + in-flight orchestrator + debug-gated MMKV store + debug screen + four additive boundary marks), off-device p95 aggregation reusing `@twt/measured-validation` `percentile()`, validation-doc scaffold (`_PENDING-*`), launch-gate Row 16 + Decision 2026-07-25-068, friction-budget disposition (no new row). 26 new unit tests; `pnpm ci:local` green (28 jobs). Status → review. |
