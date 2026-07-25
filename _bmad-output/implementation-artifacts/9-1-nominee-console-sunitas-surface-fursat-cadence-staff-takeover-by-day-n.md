---
baseline_commit: 4cd150b01b88994942964e5756959feead99bb9e
---

# Story 9.1: Nominee Console — Sunita's Surface + "Fursat" Cadence + Staff-Takeover by Day N `[SURFACE]`

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As Sunita (a bereaved nominee performing daily bank-statement reconciliation during the 15-day pool window),
I want a Nominee Console that respects "fursat" cadence (grief-paced, unhurried) with staff-takeover available by day N when I disengage,
So that reconciliation duties never feel like a transactional grind during my grief — and donors never see false-yellow forever because a human silently picked up the work.

## Scope — what belongs to 9.1 vs what is a reserved seam

> **Story 9.1 is the FIRST epic-9 story and a `[SURFACE]` SHELL, not a reconciliation engine.** It stands up Sunita's console *frame* — a route + screen that COMPOSES the surfaces reconciliation needs, most of which belong to later stories. Its genuinely-new, load-bearing deliverables are exactly three: (1) the **"fursat" operational-posture invariant** (the AC's own named "load-bearing commitment") mechanized as a tone-lint + tone-guide entry + tone-review gate; (2) the **staff-takeover-by-day-N derivation** (a pure eligibility function + the grey console state + configurable threshold + the engagement-signal seam); (3) the **console shell** that composes the ALREADY-BUILT 8.3 contributor list + 8.11 helpline CTA and leaves first-class `{available:false}` seams for the unbuilt 9.3 upload queue + 9.6 `<StatusPill>`. It NEVER parses a statement, NEVER runs the matcher, NEVER flips a pill.

> **Build-order reality (READ THIS FIRST).** Story 9.1 references Story 9.3 (`<BankStatementUpload>`, upload queue) and Story 9.6 (`<StatusPill>` 5-state) — both **later-numbered and unbuilt**. This is the same shape as `[[project_nominee_vpa_deferred_seam]]` (8.4 shipped with the resolver seam *absent* as first-class `{available:false}`) and `[[project_channels_no_live_dispatch_yet]]` / the 8.3 read-model-before-producer discipline (`[[feedback_record_unattested_no_backfill]]`). The console must render honestly with those sub-surfaces **absent** — a dignified "coming soon / not yet available" placeholder, NEVER a faked upload widget or faked pill. See the open **sequencing question** at the bottom.

| Belongs to 9.1 (this story) | Deferred — reserved seam (do NOT build here) |
|---|---|
| The **`<NomineeConsole>` shell** — a member-app route/screen (`apps/mobile/app/(nominee)/…`) that renders only when the signed-in user is a **validated nominee with an active pool** (self-suppress otherwise), composing the sub-surfaces below | The **bank-statement parser + 5-bank allowlist + 50 golden files + normalization schema** → **Story 9.2** (`packages/bank-parsers/`, `packages/domain/bank-statement/`, `apps/api/modules/reconciliation/`). 9.1 never parses. |
| **Composition of BUILT surfaces:** confirmed-contributors-so-far via **Story 8.3** `<PoolContributorList>` (honestly empty until 9.5 `contribution.confirmed`), and the **Story 8.11** `<CallHelplineCTA>` (`components/common/CallHelplineCTA.tsx`) | The **`<BankStatementUpload>` surface + "Hum aapke liye padh lenge" fallback** (today's upload queue) → **Story 9.3**. 9.1 renders a first-class `{available:false}` placeholder card in its slot — never a faked uploader. |
| The **"fursat" operational-posture invariant** — mechanized: a NEW `microcopy.yaml` `tone:` label (`fursat-pressure`) with prohibited-frame regexes (gamification/streaks/badges/completion-% "achievements"; "you're behind"-style urgency; pre-threshold auto-escalation pressure), scoped to the new nominee-console copy globs, **proven with a teeth fixture** ([[feedback_gate_scope_semantic_coverage]]); PLUS a **tone-guide §** documenting the "fursat" register + the prohibited-frames list; PLUS the Story 2.2 **tone-review gate** wired for console-copy changes | The **`<StatusPill>` 5-state design-system component** (per-pool reconciliation status: yellow/green/red/grey/…) → **Story 9.6**. 9.1's per-pool status slot renders a text/neutral placeholder derived from data it already has (or `{available:false}`), NOT the DS pill — importing 9.6's component before it exists is forbidden. |
| The **staff-takeover-by-day-N derivation** — a PURE function `fn(effectiveLastEngagedAt, thresholdDays, now) -> { takeoverEligible, daysSinceEngagement }` where `effectiveLastEngagedAt = last_engaged_at ?? pool_open_at`; a **configurable threshold** (default **7 days**); the **grey "staff-takeover" console state** rendered when eligible; the **engagement-signal READ seam** | The **engagement-heartbeat WRITER** (reset-on-upload / reset-on-console-open that sets `last_engaged_at`) → **Story 9.3** (upload is the primary engagement act). Until it lands, the day-N clock runs from `pool_open_at` — which is the CORRECT behaviour for a fully-disengaged nominee (never engaged ⇒ takeover fires N days after pool open). |
| The **takeover FLAG** feeding the **Story 9.8 reconciliation review queue** (a `nominee.takeover-eligible` derivation/event or read the 9.8 queue consumes) — the *flagging*, member-side; reserved-seam shape while 9.8 is unbuilt | The **Story 9.8 review-queue RENDER** itself + the **admin-side takeover WORK** — "staff completes daily uploads from their side until the nominee re-engages" — is the admin `<BankStatementUpload>` operated by staff → **Story 9.3** (uploader) / **Story 9.8** (queue). 9.1 raises the flag; it builds neither the queue render nor the admin upload console. |
| **UX-DR50 save-and-resume** across every multi-step interaction on the console (auto-save on grief-paced flows; resume on return; MMKV-backed per `[[project_mmkv_asyncstorage_equivalent]]`) — the console shell's own multi-step affordances | The **matcher / UTR-match engine / cron 6×/day / monotonic-confirmation invariant** → **Story 9.4**; the **yellow→green pill flip** → **Story 9.5**; the **`<SelfVerifySurface>` yellow-stuck recovery** → **Story 9.7**; the **`<PoolProgressCard>`** → **Story 9.12**. |
| **Accessibility** (inherited Story 0.10 P0-2c gate — screen-reader-accessible, ≥ touch-target minimums) + **grief-context copy validated against Story 0.9** bereaved-spouse findings; Hindi-first parity (Story 2.1) | The **memorial-page authorship** invitation + close-of-cycle celebration (Journey 4 tail, UX spec L1549/L1701) → close-of-cycle stories (7.8 shipped the template gate) / Epic 11b. Not a 9.1 surface. |

## Acceptance Criteria

**AC1 — The Nominee Console shell renders Sunita's surface by composing built sub-surfaces + first-class seams for unbuilt ones.**
Given UX-DR35 (`<NomineeConsole>`) + UX-DR55 Pattern 4 (validated against Story 0.9) + UX-DR50 save-and-resume, and the account-state-machine posture (UX spec L261 — "Sunita's reconciliation console appears when she's logged in as the validated nominee and a pool is active"),
When the console is implemented,
Then it renders **only** for a signed-in **validated nominee with an active pool** and **self-suppresses to null** otherwise (the 8.3 `ViewContributorsEntry` self-suppress discipline — no drift between an entry affordance and its destination);
And it shows: (a) **today's bank-statement upload queue** — a first-class `{available:false}` placeholder in the Story 9.3 slot (NOT a faked uploader); (b) **reconciliation status across pools** — a neutral text/placeholder in the Story 9.6 `<StatusPill>` slot (NOT the unbuilt DS component); (c) **confirmed-contributors-so-far** via the **built Story 8.3 `<PoolContributorList>`** (honestly empty until 9.5 — never faked, `[[feedback_record_unattested_no_backfill]]`); (d) the **built Story 8.11 `<CallHelplineCTA>`**; (e) **nominee-friendly progress copy** in the "fursat" register;
And the console renders **honestly with the deferred sub-surfaces absent** — an empty/placeholder state, never a fabricated one.

**AC2 — The "fursat" cadence operational-posture invariant (this story's load-bearing commitment) is mechanized, documented, and gated.**
Given the "fursat" cadence operational-posture invariant (epics.md:3156-3162),
When any future throughput optimization, KPI gamification, or workflow streamlining is considered for the Nominee Console,
Then **throughput optimization must not erode nominee dignity or grief-paced workflow pacing**, and the following are **explicitly prohibited** and **mechanically caught**: (a) gamification (streaks, badges, completion-percentage "achievements"); (b) urgency framing ("Sunita, you're behind on uploads — please act"); (c) auto-escalation that pressures the nominee **before** the staff-takeover threshold; (d) optimizations that prioritize matcher throughput over the nominee's emotional pace;
And a **new `microcopy.yaml` `tone:` label** (`fursat-pressure`) with prohibited-frame regexes is added and **scoped to the nominee-console copy globs** (added to `scope.copy_globs`), landing **green-with-teeth** — proven by a fixture that the pattern actually FIRES on a prohibited frame ([[feedback_gate_scope_semantic_coverage]] — a green scan over new files proves nothing; the regex is deliberately non-exhaustive, the paraphrased tail remains the human tone-review's job);
And **the "fursat" register is documented in the tone guide** (`docs/tone-guide.md`) with the prohibited frames listed, and `docs/tone-review-checklist.md` names console copy as gated by Story 2.2 tone-review **before any change ships**;
And **acceptable optimizations are recorded as explicitly permitted**: less typing, better OCR, save-and-resume preservation, field prefilling on return (friction-reducing without rushing);
And a **periodic UX review (≥ once per release cycle)** revisiting console copy + interaction patterns for "fursat" preservation is captured as a standing item (checklist/runbook entry with designer sign-off) — not left as prose.

**AC3 — Staff-takeover by day N: a pure eligibility derivation + configurable threshold + grey console state + engagement seam.**
Given the staff-takeover requirement (epics.md:3154) + the "donors never see false-yellow forever because the human silently picked up the work" posture (UX spec L121),
When the nominee has not engaged for ≥ N days (**configurable, default 7 days**),
Then a **pure derivation** computes `takeoverEligible` from `effectiveLastEngagedAt = last_engaged_at ?? pool_open_at`, the threshold, and `now` — with the **day-N clock running from `pool_open_at`** while no engagement writer exists (a never-engaged nominee is correctly flagged N days after pool open);
And the threshold is **configurable** (default 7) — not a magic literal (respects the FM-14 token/magic-number governance the microcopy gate enforces);
And when eligible, the case is **flagged for District-Admin takeover into the Story 9.8 reconciliation review queue** (a derivation/event that queue can consume — reserved-seam shape while 9.8 is unbuilt; no standalone admin surface) and the console renders the **grey "staff-takeover" state** — strictly neutral, "on record", never "you failed / you're behind" (aligns with the grey-state neutrality of `[[project_yogdaan_status_derivation_convention]]`: grey = neutral, never missed/failed);
And the **engagement-heartbeat WRITER is an explicit reserved seam** (reset-on-upload lands with Story 9.3) — 9.1 wires the READ, documents the seam, and does NOT fake engagement activity;
And the derivation is **replay-deterministic** (pure `fn(inputs) -> verdict`, no wall-clock reads inside the pure core — `now` is injected), unit-tested with frozen vectors including the boundary (exactly N days) and the null-`last_engaged_at` fall-through.

**AC4 — Accessibility + grief-context copy.**
Given the inherited accessibility gate (Story 0.10 P0-2c) + Story 0.9 bereaved-spouse findings,
When the console renders for assistive-tech users and grief-context contexts,
Then it is **screen-reader-accessible** (semantic roles/labels/hints on every affordance, per the 8.3 `accessibilityRole`/`accessibilityLabel`/`accessibilityHint` convention; touch targets ≥ the 0.10 minimum);
And **grief-context copy is validated against Story 0.9 findings** (Pattern 4 dignified-validation grammar — no "Error/Invalid/Failed/Forbidden", no alarming red iconography, no countdowns under emotional load);
And copy is **Hindi-first with English parity** (Story 2.1), the "fursat" cadence never "complete your task."

> **⚠️ Open research risk (do not silently resolve; surface at review).** `A-grief-fursat-cadence` — the hypothesis behind this AC — is still `pending-interview` in the assumption inventory; the Story 0.9 bereaved-spouse interview it depends on is not yet conducted (`_AWAITING_CONVERSATION_CONDUCT_`). `deferred-work.md:949` states a refuted verdict would force a 9.1 re-scope before Epic 9 design freeze. Build AC2/AC4 as specified — the mechanization (tone gate, grey-neutral copy) is correct regardless of the interview outcome — but do NOT treat the "fursat" framing as empirically confirmed in any commit message, PR description, or completion note. Flag this open dependency in the Dev Agent Record.

## Tasks / Subtasks

- [x] **Task 1 — Nominee Console route + shell + validated-nominee gate (AC: 1, 4)**
  - [x] Create `apps/mobile/app/(nominee)/` route group + `_layout.tsx` + `index.tsx` (mirror the `(contribution)` / `(pool-onboarding)` group conventions; expo-router + Tamagui).
  - [x] Add a `useNomineeConsoleQuery` (react-query) that resolves "am I a validated nominee with an active pool?" via a thin server-authoritative read (the 8.2/8.3 `member-pool`/thin-read-seam posture) — self-suppress the whole surface to `null` when not. **No exact-fit nominee-self-auth primitive exists yet — this gate must be designed, not blindly reused.** §2.3 "nominee-shepherd" is **staff/admin** auth for reconciliation-intake staff (not the nominee); Story 8.13 is a *member* declaring their nominee's bank details (no auth model); code-level "shepherd" (`claims.shepherd.handlers.ts`) means a district_admin assigned to a claim. The closest real analog is the `claim_handover` OTP-elevation ("Ravi-mode") session model in `apps/api/src/modules/claims/claims.handlers.ts` — study its shape before designing this gate, but expect differences (that flow elevates a *claimant*, not a *nominee mid-pool*). Still: no new nominee-role primitive, no new identity column — extend the claim-scoped session/elevation pattern, don't invent a parallel one.
  - [x] Compose the built sub-surfaces: `<PoolContributorList>` (Story 8.3) + `<CallHelplineCTA>` (Story 8.11); render `{available:false}` placeholder cards in the Story 9.3 (upload queue) + Story 9.6 (`<StatusPill>`) slots — dignified "coming soon", never faked.
  - [x] New i18n namespace `nominee-console` (hi + en, Hindi-first parity) for all console copy.
- [x] **Task 2 — "fursat" operational-posture invariant: mechanize + document + gate (AC: 2)**
  - [x] Add a new `tone:` label `fursat-pressure` to `microcopy.yaml` with prohibited-frame regex(es): gamification (streak/badge/achievement/`\d+%\s+complete`), urgency ("you're behind", "please act now"), pre-threshold escalation pressure. Case-insensitive, `assertValidRegex`-validated, deliberately non-exhaustive.
  - [x] Add the `nominee-console` copy globs to `microcopy.yaml` `scope.copy_globs` so the rule bites the new surface.
  - [x] Add a **teeth fixture** in `scripts/microcopy/` proving the pattern FIRES on a prohibited frame (not just green over the shipped copy) — mirror `scripts/microcopy/out-of-band.test.ts`.
  - [x] Document the "fursat" register + prohibited frames in `docs/tone-guide.md`; name console copy as tone-review-gated in `docs/tone-review-checklist.md`; record the permitted optimizations + the ≥1/release-cycle UX-review-with-designer-sign-off standing item.
  - [x] Run `pnpm tsx scripts/microcopy/check.ts` (or the package script) — green-with-teeth.
- [x] **Task 3 — Staff-takeover-by-day-N derivation + config + grey state + seam (AC: 3)**
  - [x] **`poolOpenAt` has no ready-made source — build the small read first.** Verified during validation: the `pools` table (migration `0071_pools-lifecycle.sql`) has no `pool_open_at` column; the only signal is the `pool.opened_for_contributions` event, whose timestamp lives on the generic `events_log.occurred_at` with zero existing consumers. Add the minimal read (a projector field or a direct events_log query scoped to this event type — do NOT introduce a new column/migration for this alone; prefer reading it off `events_log` per [[project_member_lifecycle_domain_substrate]]'s "domain reads events_log directly" precedent) that resolves `poolOpenAt` for a given pool before wiring the derivation to it.
  - [x] Author the PURE derivation (home it near the pool/reconciliation domain; `packages/domain/…` or a mobile-side pure lib if the read is server-resolved) — `fn({ lastEngagedAt, poolOpenAt, thresholdDays, now }) -> { takeoverEligible, daysSinceEngagement, effectiveLastEngagedAt }`. NO wall-clock read inside; inject `now`.
  - [x] Configurable threshold (default 7) via config, not a literal.
  - [x] Render the grey "staff-takeover" console state when eligible — neutral copy ("staff is helping with today's uploads"), never blame.
  - [x] Surface the takeover flag **for the Story 9.8 reconciliation review queue** (derivation/event `nominee.takeover-eligible` or a queue-readable read) — flagging only; 9.8 is unbuilt so raise the flag against the shape 9.8 will consume (reserved-seam, no live consumer today). No standalone District-Admin surface; the admin upload console is a 9.3 seam.
  - [x] Document the engagement-heartbeat WRITER as a reserved seam (reset-on-upload → 9.3). Do NOT write `last_engaged_at` from 9.1.
  - [x] Frozen-vector unit tests: boundary (exactly N days), null-`lastEngagedAt` fall-through to `poolOpenAt`, below/above threshold, replay-determinism.
- [x] **Task 4 — Save-and-resume (UX-DR50) + accessibility + grief copy (AC: 1, 4)**
  - [x] Wire UX-DR50 save-and-resume on the console's multi-step affordances (MMKV-backed per `[[project_mmkv_asyncstorage_equivalent]]`; auto-save on grief-paced flows; restore on return).
  - [x] Accessibility pass: `accessibilityRole`/`Label`/`Hint` on every affordance; touch targets ≥ 0.10 minimum; screen-reader walk.
  - [x] Grief-copy validation against Story 0.9 findings (Pattern 4 grammar); Hindi-first parity.
- [x] **Task 5 — Tests + local CI gate**
  - [x] Component/render tests for the console shell (self-suppress, placeholder-seam rendering, grey-state render).
  - [x] Derivation unit tests (Task 3 vectors).
  - [x] Microcopy teeth test (Task 2).
  - [x] `pnpm --filter @twt/mobile lint typecheck test`; run `pnpm ci:local` as the merge gate ([[project_ci_actions_suspension_local_mirror]]).

### Review Findings

- [x] [Review][Defer] `<PoolContributorList>` composes the wrong pool relationship for AC1(c) — resolves the acting member's OWN assigned-contributor pool (member-as-payer), not the nominee-console's death-linked pool. Resolved by BigDev (2026-07-25): defer to 9.2/9.4/9.5 — deferred, 9.1 composes 8.3's built component exactly as the story directs (AC1(c)/decision #1); the precise nominee-family-pool contributor read is a later reconciliation-engine concern; renders honest-empty either way, no fabrication. [apps/mobile/components/nominee-console/NomineeConsole.tsx:183]
- [x] [Review][Defer] UX-DR50 "resume" state is write-only, nothing reads it (`introAcknowledged`/`lastVisitedIso` written on every mount, never branched on). Resolved by BigDev (2026-07-25): defer as forward scaffolding — deferred, acceptable seam for a future multi-step surface (9.3 upload flow); no observable resume behavior exists to build yet since 9.1 has no multi-step flow. Note: Task 4's checklist wording should say "seam", not "complete." [apps/mobile/components/nominee-console/console-resume.ts, NomineeConsole.tsx:75-79]
- [x] [Review][Defer] Scope table promises the Story 2.2 tone-review gate "wired for console-copy changes"; delivered docs instead defer the runtime wiring to "the consuming Epic-9 story." Resolved by BigDev (2026-07-25): matches precedent — deferred, mirrors the same deferred-wiring pattern already used by other rows in the tone-review-checklist table (pool-onboarding/helpline). [docs/tone-review-checklist.md]
- [x] [Review][Patch] `(nominee)` route group is never registered in the root navigator — every sibling group (`(contribution)`, `(pool-onboarding)`, etc.) is explicitly declared with `headerShown:false` in the root `<Stack>`; `(nominee)` is absent, so the default root header will double up on top of the console's own hidden-header layout. Fixed: added the missing `Stack.Screen name="(nominee)"` entry. [apps/mobile/app/_layout.tsx]
- [x] [Review][Patch] `<PoolContributorList>` (FlashList-backed) is nested inside the console's own `<ScrollView>` — breaks virtualization and matches the documented Fabric FlatList empty→populated crash pattern ([[project_fabric_flatlist_empty_populated_crash]]). Fixed: restructured the console so `<PoolContributorList>` renders outside the ScrollView in its own bounded flex region, owning its own scroll; the helpline CTA moved into the scrolling static region above it so it stays reachable. [apps/mobile/components/nominee-console/NomineeConsole.tsx]
- [x] [Review][Patch] `openScopeTx` is called before the try/catch in the read handler — if it throws, the error escapes the documented fail-soft contract ("never a 500") and becomes an unhandled 500. Fixed: moved the call inside the try block, guarded `finally`'s `closeScopeTx` against an unassigned `scopeTx`; added a test proving fail-soft on `openScopeTx` throwing. [apps/api/src/modules/nominee-console/handlers.ts]
- [x] [Review][Patch] `resolveActiveNomineePool` silently drops additional `live` pools with no log signal when a nominee has more than one. Fixed: added `liveCount` to the resolver's return shape and a `request.log.warn` in the handler when `liveCount > 1`; added a test proving the warning fires. [packages/domain/src/nominee-console/read.ts, apps/api/src/modules/nominee-console/handlers.ts]
- [x] [Review][Patch] `formatLastUpdated` renders using device-local time components (`getHours`/`getDate`/etc.) against a UTC server timestamp, inconsistent with the app's IST/Gregorian display discipline. Fixed: reimplemented with `Intl.DateTimeFormat` fixed to `Asia/Kolkata`; tightened the unit test to assert the exact deterministic output instead of only the shape. [apps/mobile/components/nominee-console/console-view.ts]
- [x] [Review][Dismiss — corrected] ~~`nomineeTakeoverThresholdDays` is not range-validated at config load~~ — **correction, not applied:** verified `intEnv` (apps/api/src/config.ts:254-262), the helper `nomineeTakeoverThresholdDays` is built with, already throws at `loadConfig()` boot time on any non-finite or negative value — this finding (originally Blind Hunter) was a false positive; the original reviewer pass did not check `intEnv`'s implementation before triaging it as a patch. No code change made. [apps/api/src/config.ts:254-262]
- [x] [Review][Patch] No guard against an Invalid Date (`NaN` time) flowing into `computeStaffTakeover` — `thresholdDays` is validated but the date inputs aren't. Fixed: added a finite-time guard over `poolOpenAt`/`now`/non-null `lastEngagedAt` that throws on an Invalid Date; added 3 tests. [packages/domain/src/nominee-console/takeover.ts]
- [x] [Review][Patch] AC2's "periodic UX review ... not left as prose" standing item is itself delivered as prose. Fixed: added a `- [ ]` next-review-due checklist line plus a tracked periodic-review-log table (date/reviewer/sign-off/outcome columns) that future reviews append rows to. [docs/tone-review-checklist.md]
- [x] [Review][Patch] `accessibilityHint` — the convention AC4 explicitly cites — is never used on the new static regions (`ComingSoonCard`, the grey takeover banner); only `accessibilityRole`/`accessibilityLabel` are used. Fixed: added a `hint` prop to `ComingSoonCard` and `accessibilityHint` to the takeover banner, sourced from new `*.hint` i18n keys (en+hi, Hindi-first parity preserved). [apps/mobile/components/nominee-console/NomineeConsole.tsx, packages/i18n/locales/{en,hi}/nominee-console.json]
- [x] [Review][Defer] Broad catch-all masks any error into `{isNominee:false}` with only a log line, no alerting/metric hook — deferred, pre-existing (same fail-soft posture as 8.2/8.3, explicitly required by AC1; the missing alerting hook is a pre-existing observability gap, not a 9.1 regression). [apps/api/src/modules/nominee-console/handlers.ts]
- [x] [Review][Defer] `resolvePoolOpenAt`'s "earliest wins on duplicate events" tie-break has no test proving that path — deferred, pre-existing (events_log is append-only elsewhere in the codebase; no evidence this is reachable in practice). [packages/domain/src/nominee-console/read.ts]
- [x] [Review][Defer] sprint-status.yaml's "DB-gated domain(1578)/api(640) suites green" claim is self-reported with no attached evidence — deferred, pre-existing (independently re-ran the microcopy gate + all DB-free nominee-console unit tests during this review, all green; the DB-gated portion remains unverified without a live test Postgres). [_bmad-output/implementation-artifacts/sprint-status.yaml]
- [x] [Review][Defer] AC1(b) "reconciliation status across pools" is structurally single-pool-only — deferred, pre-existing (same root cause as the multi-pool patch above; `resolveActiveNomineePool` deterministically collapses to one live pool, documented as a v1 simplification; a real multi-pool UI is out of scope for 9.1). [packages/domain/src/nominee-console/read.ts]

## Dev Notes

### Current state of the surfaces being composed (READ before building)

- **Story 8.3 `<PoolContributorList>`** — `apps/mobile/components/contributor-list/{PoolContributorList,ViewContributorsEntry,usePoolContributorsQuery}.tsx`. Server-authoritative thin read; confirmed rows source EXCLUSIVELY from `contribution.confirmed` (Epic 9 producer, still unbuilt) ⇒ **legitimately empty today**. `ViewContributorsEntry` self-suppresses to `null` unless the member has a live assigned pool via `usePoolContributorsQuery` (the exact self-suppress pattern to reuse for the console gate). **Do not re-implement; compose.** The confirmed numerator stays empty until **Story 9.5** flips yellow→green — the console must render that empty state honestly.
- **Story 8.11 `<CallHelplineCTA>`** — `apps/mobile/components/common/CallHelplineCTA.tsx`. Cross-cutting affordance; drop it into the console's helpline slot.
- **Mobile conventions** (from `ViewContributorsEntry.tsx`): `useT()` with a `{ namespace }` const; `expo-router` `useRouter().push`; Tamagui `Button`/primitives; `accessibilityRole`/`accessibilityLabel`/`accessibilityHint`; height/touch-target ≥ 44. Route groups live under `apps/mobile/app/(group)/` with a `_layout.tsx`.

### Why this is a shell (build-order)

Story 9.1 is the FIRST epic-9 story yet references **9.3** (upload) and **9.6** (`<StatusPill>`), both later and unbuilt. The house discipline for "surface that needs an unbuilt producer" is **encode the frame + first-class absence seam now, never fake** — the 8.3 read-model-before-producer table, the 8.4 `{available:false}` nominee-VPA resolver seam ([[project_nominee_vpa_deferred_seam]]), and the record-un-attested-no-backfill rule ([[feedback_record_unattested_no_backfill]]). Apply it literally: the upload-queue and status-pill slots render dignified placeholders; the contributor list renders its honest empty state.

### The "fursat" invariant is the real deliverable, and it maps to an EXISTING gate

The codebase already mechanizes tone prohibitions in `microcopy.yaml` `tone:` (scarcity, panic, pool-reality-comparison, out-of-band-blame) enforced by `scripts/microcopy/check.ts` (`checkTone`) — an INVARIANT scan of declared scope globs, not a diff. The "fursat" invariant is a natural new `tone:` label. Follow the established rigor ([[feedback_mechanization_split_commitment]], [[feedback_gate_scope_semantic_coverage]]): the deliverable is **teeth**, not a green scan — add a fixture proving the rule fires on a prohibited frame (see the out-of-band-blame rule's "green on introduction is NOT the deliverable" note + `scripts/microcopy/out-of-band.test.ts`). `scope.copy_globs` already has 6 populated namespaces (niyamavali/terms/close-of-cycle/contribution/pool-onboarding/common) — add `nominee-console` as a 7th so the rule has a surface to bite. Keep the regex non-exhaustive on purpose — the paraphrased/spelled-out tail is the human Story 2.2 tone-review's job (tone-guide §5).

### Staff-takeover: pure derivation, clock-from-pool-open, writer deferred

Cross-reference **Story 0.11 (operator shadowing)** — the project's deferred-work ledger flags it as relevant to how staff takeover should be framed/logged when a District-Admin steps into a nominee's reconciliation duties; check it before finalizing the takeover-flag shape in Task 3 so 9.1's flag doesn't conflict with 0.11's shadowing conventions.

The engagement signal (nominee daily uploads) is **Story 9.3** — unbuilt. So `last_engaged_at` has no writer yet. Rather than block, make the day-N clock run from `pool_open_at` with `effectiveLastEngagedAt = last_engaged_at ?? pool_open_at`. **`pool_open_at` is NOT a ready column** (verified during validation — no such field on `pools`; migration `0071_pools-lifecycle.sql` doesn't carry it) — it must be resolved from the `pool.opened_for_contributions` event's `events_log.occurred_at`, which has no existing reader. Task 3 now scopes this small read as its own subtask; do it before wiring the derivation. This is not a stopgap — it is *correct*: a nominee who never engages should be flagged for takeover N days after the pool opens. Story 9.3 later adds the reset-on-upload writer that pushes `last_engaged_at` forward. Keep the derivation PURE and replay-deterministic (inject `now`, no internal wall-clock) — same discipline as the pool-assignment version-pinned replay-identity work ([[project_pool_assignment_engine]]) and the Yogdaan status pure-derivation ([[project_yogdaan_status_derivation_convention]]). The grey state is **neutral "on record"**, never blame — exactly the grey-neutrality convention from `[[project_yogdaan_status_derivation_convention]]`. Threshold is config, not a literal (the FM-14 magic-number governance the same microcopy gate enforces).

### Architecture references

- Reconciliation intake/matcher live in `apps/api/modules/reconciliation/` + `packages/domain/bank-statement/` + `packages/bank-parsers/<pariwar>/<bank>/` (architecture §3.6, L2224-2271) — **9.2/9.3/9.4 territory, not 9.1.** Nominee-shepherd auth per §2.3 admin auth + claim-scoped check (relevant to how "validated nominee" resolves — reuse, don't invent).
- Daily-delta visibility (UX spec L1560/L1700/L1724): the pool fill updates *after each statement upload*, not real-time; "last updated" timestamp visible on the console. v1 "near-real-time" = react-query polling/refetch-on-foreground (the 8.3 D6 posture) — no websocket infra.
- Contribution event-name contract ([[project_contribution_event_name_contract]]): the console reads `contribution.confirmed` (green, 9.5) derived state via 8.3; it never emits. Carry the AI-8-1 mismatch-name teeth handoff forward — relevant to 9.4/9.5, not produced here.

### Testing standards

- Mobile: component/render tests under `apps/mobile/tests/`; `pnpm --filter @twt/mobile lint typecheck test`.
- Pure derivation: frozen-vector unit tests (boundary at exactly N days; null-`lastEngagedAt`; determinism) — DB-free.
- Microcopy: `scripts/microcopy/*.test.ts` teeth fixture + `scripts/microcopy/check.ts` green.
- Merge gate: `pnpm ci:local` mirrors ci.yml (integration needs `DATABASE_URL` on :5433) — [[project_ci_actions_suspension_local_mirror]], [[project_ci_local_concurrency_oversubscription]].
- New-Arch FlatList gotcha ([[project_fabric_flatlist_empty_populated_crash]]): if the console hosts a sticky-header list that crosses empty→populated in place, render empty/loading/error OUTSIDE the list. Relevant because 8.3's list is honestly empty today and populates later.

### Project Structure Notes

- New route group `apps/mobile/app/(nominee)/` (parallels `(contribution)`, `(pool-onboarding)`), new components under `apps/mobile/components/nominee-console/`, new i18n namespace `packages/i18n/locales/{hi,en}/nominee-console.json`.
- Pure takeover derivation: prefer `packages/domain/` (pool/reconciliation-adjacent) so it is shared + DB-free-testable; if the read is fully server-resolved, a mobile-side pure lib is acceptable — home it where its single input source lives, per [[feedback_no_premature_package]] (no premature package extraction).
- `microcopy.yaml` + `scripts/microcopy/` + `docs/tone-guide.md` + `docs/tone-review-checklist.md` edits for the fursat invariant.
- No new migration expected in 9.1 (no engagement writer here); if a takeover-flag read needs a column, confirm against the live-DB migration discipline ([[project_live_db_test_gotchas]]) — baseline frozen; hand-author + journal, never `db:generate`.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 9.1 (L3142-3166)] — user story, 3 AC blocks, fursat invariant, staff-takeover, accessibility.
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 9 (L3126-3140)] — epic framing, demoable closure, dependencies; UX-DR anchors (UX-DR35/50/55).
- [Source: _bmad-output/planning-artifacts/epics.md#UX-DR35 (L420), UX-DR50 (L441), UX-DR55 Pattern 4 (L449)].
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Journey 4 — Sunita (L1517-1562), fursat/grief posture (L121/L129/L295/L315), daily-delta visibility (L1560/L1700/L1724), save-and-resume (L1709)].
- [Source: _bmad-output/planning-artifacts/architecture.md#§3.6 Bank statement intake (L2224-2271), account-state-machine screen-mode (UX L261)].
- [Source: apps/mobile/components/contributor-list/ViewContributorsEntry.tsx, .../PoolContributorList.tsx — self-suppress + compose pattern].
- [Source: apps/mobile/components/common/CallHelplineCTA.tsx — Story 8.11 helpline CTA].
- [Source: microcopy.yaml (`tone:` list) + scripts/microcopy/check.ts + scripts/microcopy/out-of-band.test.ts + docs/tone-guide.md — the fursat-invariant mechanization target].
- Prior story: [Source: _bmad-output/implementation-artifacts/8-3-real-time-live-contributor-list-pending-contributors-list.md — read-model-before-producer / honest-empty / self-suppress discipline].

### Resolved decisions (BigDev, 2026-07-25 — LOCKED, build to these)

1. **Sequencing — SHELL WITH HONEST SEAMS.** Ship 9.1 as a **shell with first-class `{available:false}` seams** (matching 8.4's nominee-VPA precedent); 9.3 fills the upload slot, 9.6 fills the `<StatusPill>` slot. **Do NOT reorder the epic** and do NOT pull 9.6 forward — the status slot renders a neutral text/placeholder until 9.6 lands. Never fake a pill or an uploader.
2. **Takeover flag transport — FEEDS STORY 9.8.** The takeover derivation flags **into the Story 9.8 reconciliation review queue** as its ops-side consumer. Home the takeover-eligible read/flag so the 9.8 queue can consume it (do NOT stand up a standalone District-Admin surface for it). 9.8 is unbuilt ⇒ 9.1 raises the flag against the shape 9.8 will read; the queue-render is 9.8's job (the same producer-before-consumer discipline as 8.3's read-before-producer). Note: 9.8 is a `[SURFACE]` in the same epic — coordinate the flag shape as a reserved seam, not a live consumer today.
3. **Nominee auth — EXTEND THE CLAIM_HANDOVER PATTERN, NO NEW PRIMITIVE, NO EXACT PRECEDENT.** Verified during validation: **no existing model authenticates a nominee as themselves.** §2.3 "nominee-shepherd" is staff/admin auth (not the nominee); Story 8.13 nominee-VPA has no auth model attached; code-level "shepherd" means a district_admin on a claim. The nearest analog is the `claim_handover` OTP-elevation ("Ravi-mode") session model (`apps/api/src/modules/claims/claims.handlers.ts`) — read it and extend its shape for a nominee-mid-pool session, rather than reusing it verbatim (it elevates a claimant, not an active-pool nominee). **Do NOT introduce a new nominee-role primitive** — no new role, no new identity column (consistent with the "don't invent identity primitives" caution, cf. [[project_membership_number_deferred_feature]]). Treat this as a genuine design task for the dev agent, not a lookup.

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (Claude Code, bmad-dev-story workflow)

### Debug Log References

- `pnpm ci:local` (DATABASE_URL=twt-test-pg on :5433, `twt_dev_app:devpass@localhost:5433/twt_dev?sslmode=disable`): **all 25 static gates green** (lint, typecheck, build, db-check, microcopy, i18n-parity, pool-state-invariant, domain-invariants, etc.). Two transient reds triaged as NON-code: `test (unit)` was the known unbounded-`turbo run test` concurrency-flake ([[project_ci_local_concurrency_oversubscription]] / [[project_known_livedb_test_failures]]) — passed clean on re-run; `crypto-check` was a cascade of that same run — passed clean standalone (FULL TURBO cache hit). `integration-tests` initially failed on a DATABASE_URL SSL/credential mismatch (env, not code) — with the correct URL, `db:migrate` + the DB-gated suites pass: **@twt/domain 1578 passed, @twt/api 640 passed**.
- Per-package green: domain 952 (unit) / 1578 (with live DB); contracts 556; api 244 (unit) / 640 (with live DB); mobile 91; i18n 57; microcopy 183 (incl. the new `fursat.test.ts` 26). `pnpm tsx scripts/microcopy/check.ts` green-with-teeth over 14 copy files + 76 code files.

### Completion Notes List

**All 5 tasks + 3 ACs delivered. This is a `[SURFACE]` SHELL — it composes built 8.3/8.11 surfaces, leaves first-class `{available:false}` seams for the unbuilt 9.3/9.6, and never parses a statement / runs the matcher / flips a pill.**

- **Task 3 (staff-takeover derivation) — the load-bearing pure core.** `nomineeConsole.computeStaffTakeover({ lastEngagedAt, poolOpenAt, thresholdDays, now }) -> { takeoverEligible, daysSinceEngagement, effectiveLastEngagedAt }` in `packages/domain/src/nominee-console/takeover.ts`. PURE + replay-deterministic (`now` injected, no wall-clock inside), inclusive boundary (exactly-N ⇒ eligible), clock-skew clamp, config-guard throw. `effectiveLastEngagedAt = lastEngagedAt ?? poolOpenAt` — the clock runs from pool-open while the engagement WRITER (Story 9.3) is unbuilt (documented reserved seam; 9.1 never writes `last_engaged_at`). Threshold is `deps.config.nomineeTakeoverThresholdDays` (default = the single-source domain constant `DEFAULT_STAFF_TAKEOVER_THRESHOLD_DAYS` = 7, override via `NOMINEE_TAKEOVER_THRESHOLD_DAYS`) — configurable, not a magic literal (FM-14). Frozen-vector tests cover boundary / null-fall-through / below-above / determinism / skew / config-guard.
- **`poolOpenAt` read (Task 3 sub).** Verified: `pools` (migration 0071) has NO `pool_open_at` column — resolved off the `pool.opened_for_contributions` event's `events_log.occurred_at` via `nomineeConsole.resolvePoolOpenAt` (domain reads events_log directly, [[project_member_lifecycle_domain_substrate]]). NO new column/migration (as the story scoped).
- **The takeover FLAG = reserved-seam shape for Story 9.8.** `takeoverEligible` IS the derivation the 9.8 reconciliation review queue consumes (run over live pools). NO `nominee.takeover-eligible` event emitted (no live writer/consumer today — the derivation-as-read is the honest reserved shape, the 8.3 read-before-producer discipline). No standalone District-Admin surface.
- **Nominee auth gate (decision #3, EXTEND claim_handover — genuine design task).** No existing model authenticates a nominee-as-themselves. `resolveActiveNomineePool` resolves "validated nominee with an active pool" = a `live` pool whose originating claim's `deceased_member_id` equals the acting member — EXTENDING the Ravi-mode session-as-deceased identity, NOT a new nominee-role primitive and NOT a new identity column ([[project_membership_number_deferred_feature]]). The READ needs only the member session (the 8.2/8.3 read posture — reads are not step-up-gated); the console's WRITE actions (the 9.3 upload) are documented as a `requireMemberStepUp('claim_handover')` seam, not built here.
- **AC1 shell.** New member-app route group `apps/mobile/app/(nominee)/` + `<NomineeConsole>` composing the BUILT 8.3 `<PoolContributorList>` (honestly empty until 9.5) + 8.11 `<CallHelplineCTA>`, with first-class `{available:false}` `ComingSoonCard` placeholders in the 9.3 (upload) + 9.6 (`<StatusPill>`) slots — dignified "being prepared", never a faked uploader/pill. Server-authoritative gate: `GET /api/v1/member/nominee-console` → discriminated `{ isNominee }` union; the client self-suppresses to null on `!isNominee` (the 8.3 `ViewContributorsEntry` discipline). Render decisions live in the PURE `console-view.ts` (the app has no render-test harness — decisions are node-tested).
- **AC2 fursat invariant.** New `microcopy.yaml` `fursat-pressure` tone rule (gamification / urgency-falling-behind / pre-threshold-escalation, both locales) scoped to the new `nominee-console` copy globs; **green-with-teeth** — `scripts/microcopy/fursat.test.ts` plants prohibited frames in EN+HI that the rule FIRES on ([[feedback_gate_scope_semantic_coverage]]). Deliberately non-exhaustive; the paraphrased tail is the human review's job. Narrowed the gamification arm (bind badge/streak/achievement to a gamification verb/possessive) so admin `code_globs` `<Badge>` identifiers + the register's own reassuring "no hurry" / "कोई जल्दी नहीं" are NOT flagged (the out-of-band-blame narrowing precedent). Documented: tone-guide §3 (prohibited frames) + §4 (fursat + PERMITTED optimizations: less typing / better OCR / save-and-resume / prefilling) + the ≥1/release-cycle designer-sign-off standing item; tone-review-checklist gated + the periodic-review section.
- **AC4 / Task 4.** Accessibility: `accessibilityRole`/`Label`/`Hint` on every affordance, touch targets via composed built components; the loading/absence/takeover states render OUTSIDE any sticky-header list ([[project_fabric_flatlist_empty_populated_crash]] — the composed 8.3 list owns its own honest empty state). Grief copy is Pattern-4 dignified (no Error/Invalid/Failed, no red, no countdowns). Hindi-first parity (i18n-parity gate green). Save-and-resume (UX-DR50): `console-resume.ts` MMKV store ([[project_mmkv_asyncstorage_equivalent]]) — per-pool + versioned, auto-save-on-visit + restore-on-return + intro-acknowledge, fail-soft on corrupt cache. 9.1 owns the console's own resumable state; the upload multi-step draft extends this same store shape when 9.3 lands.

**Composition seam noted for review:** 8.3 `<PoolContributorList>` resolves the member's OWN assigned-contributor pool via `/api/v1/member/pool-contributors` (the member-as-contributor relationship), which is a DIFFERENT relationship than the nominee-as-bereaved-family (the pool spawned from the deceased's claim). 9.1 composes the built component AS THE STORY DIRECTS (AC1(c), decision #1); the precise nominee-family-pool contributor read is a later reconciliation-engine concern (9.2/9.4/9.5). The console renders 8.3's honest empty state either way — no fabrication.

> **⚠️ Open research risk carried forward (surfaced per the story's AC4 warning — NOT silently resolved).** `A-grief-fursat-cadence` is still `pending-interview`; the Story 0.9 bereaved-spouse interview is `_AWAITING_CONVERSATION_CONDUCT_`. `deferred-work.md:949` states a refuted verdict forces a 9.1 re-scope before Epic 9 design freeze. AC2/AC4 were built as specified — the mechanization (tone gate, grey-neutral copy) is correct regardless of the interview outcome — but the "fursat" framing is **NOT treated as empirically confirmed** in any code comment, commit, or this record. It remains an open dependency for the reviewer.

### File List

**Created — domain (staff-takeover derivation + reads):**
- `packages/domain/src/nominee-console/takeover.ts`
- `packages/domain/src/nominee-console/read.ts`
- `packages/domain/src/nominee-console/index.ts`
- `packages/domain/tests/nominee-console/takeover.test.ts`

**Created — contracts (read DTO):**
- `packages/contracts/src/nominee-console/nominee-console.ts`
- `packages/contracts/src/nominee-console/index.ts`
- `packages/contracts/tests/nominee-console.test.ts`

**Created — api (read seam):**
- `apps/api/src/modules/nominee-console/handlers.ts`
- `apps/api/src/modules/nominee-console/routes.ts`
- `apps/api/src/modules/nominee-console/index.ts`
- `apps/api/tests/unit/nominee-console.test.ts`

**Created — i18n (fursat-register copy, Hindi-first parity):**
- `packages/i18n/locales/en/nominee-console.json`
- `packages/i18n/locales/hi/nominee-console.json`

**Created — mobile (shell + pure logic + save-and-resume + tests):**
- `apps/mobile/app/(nominee)/_layout.tsx`
- `apps/mobile/app/(nominee)/index.tsx`
- `apps/mobile/components/nominee-console/NomineeConsole.tsx`
- `apps/mobile/components/nominee-console/useNomineeConsoleQuery.ts`
- `apps/mobile/components/nominee-console/console-view.ts`
- `apps/mobile/components/nominee-console/console-resume.ts`
- `apps/mobile/tests/unit/nominee-console-view.test.ts`
- `apps/mobile/tests/unit/nominee-console-resume.test.ts`

**Created — fursat tone gate teeth:**
- `scripts/microcopy/fursat.test.ts`

**Modified:**
- `packages/domain/src/index.ts` — export the `nomineeConsole` namespace
- `packages/contracts/src/index.ts` — export the nominee-console DTO
- `packages/api-client/src/index.ts` — the `memberNomineeConsole()` SDK method
- `apps/api/src/config.ts` — `nomineeTakeoverThresholdDays` (default = the domain constant)
- `apps/api/src/server.ts` — register the nominee-console module
- `packages/i18n/src/catalog.ts` — register the `nominee-console` namespace + KNOWN_NAMESPACES
- `microcopy.yaml` — the `fursat-pressure` tone rule + the `nominee-console` copy globs
- `docs/tone-guide.md` — fursat prohibited frames (§3) + permitted optimizations & periodic-review standing item (§4)
- `docs/tone-review-checklist.md` — console copy gated by tone-review + the periodic fursat-review section
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — 9-1 ready-for-dev → in-progress → review

## Change Log

| Date | Change |
|---|---|
| 2026-07-25 | Story 9.1 implemented (bmad-dev-story). Nominee Console shell: (1) fursat operational-posture invariant mechanized (`fursat-pressure` microcopy tone rule + `nominee-console` copy globs + green-with-teeth fixture + tone-guide/checklist docs + periodic-review standing item); (2) staff-takeover-by-day-N pure derivation (`computeStaffTakeover`, config threshold default 7, clock-from-pool-open, reserved 9.8-flag + 9.3-writer seams, frozen-vector tests); (3) `<NomineeConsole>` shell composing built 8.3/8.11 with first-class `{available:false}` seams for 9.3/9.6 + server-authoritative gate (`GET /member/nominee-console`) extending the Ravi-mode session identity; (4) UX-DR50 save-and-resume (MMKV) + accessibility + Hindi-first grief copy. All tasks/subtasks complete; `pnpm ci:local` static gates green + DB-gated domain/api integration suites green. Status → review. Open research risk `A-grief-fursat-cadence` (pending-interview) surfaced for reviewer, not treated as confirmed. |
