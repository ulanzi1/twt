---
baseline_commit: 56e92a7f015e88eafbc215e79fecc961aa0e5ad7
---

# Story 7.10: Pool Engine Onboarding Tutorial

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **new member entering the contribution loop for the first time**,
I want **a 3-screen onboarding tutorial that explains pool-bound semantics, the pool letter code, and the out-of-band contribution policy**,
so that **wrong-pool errors and confusion are minimized at my first contribution**.

This is the last story of Epic 7 and a **UX-DR79 Phase-1 launch-blocker** (`[SURFACE]`). It is member-facing mobile-app work (Expo + Tamagui), Hindi-first, and accessibility-complete per Story 0.10.

## Acceptance Criteria

**AC1 — The 3-screen tutorial surface exists.**
**Given** UX-DR79 (Phase-1 launch-blocker) + Story 0.10 P0-2c VI accessibility findings + Story 2.1 i18n + Story 1.17 design system,
**When** the onboarding tutorial is implemented,
**Then** it renders 3 screens in order with a **skip-and-confirm** affordance:
  - **Screen 1 — "What is a pool?"** explains pool-bound semantics: *each cycle, the system assigns you to one pool; your contribution helps one nominee family.*
  - **Screen 2 — "Your pool's letter code"** explains the letter code (example: *"You're in Pool A"*); explains that a pool may additionally carry a curated name once one is assigned (the dual-identifier concept, per Story 7.2) **without naming a specific example** — TWT-Bihar's naming registry ships empty at launch (Story 7.2: no active Mahabharata labels shipped, dropped after adversarial review M-10 flagged religious-balance risk); explains a canonical identifier exists for audit.
  - **Screen 3 — "If you accidentally pay outside the system"** explains the out-of-band contribution policy (UX-DR76): direct-to-family gifts are honored dignifiedly; if you pay to a wrong pool, the helpdesk **facilitates recovery without breaking your assignment** (links the Story 7.6 facilitated-recovery invariant, gently framed).

**AC2 — Trigger seam + re-viewability.**
**Given** the tutorial "appears on the member's first entry into My Pool card (Epic 8 consumer)",
**When** this story ships (the My Pool card does **not** exist yet — it is Epic 8),
**Then** this story delivers a **first-entry gate seam** (an MMKV-backed local flag + a hook Epic 8 will call to auto-launch the tutorial) — **not** a live auto-launch call site — and delivers a **live** re-view entry from settings so the tutorial is re-viewable now.

**AC3 — Localization + accessibility.**
**Given** Story 2.1 i18n + Story 0.10 accessibility,
**When** the tutorial renders,
**Then** all copy is **Hindi-first** with **Hindi/English parity** enforced by the `i18n:check-parity` gate, and every screen is **assistive-tech accessible** (TalkBack Hindi, ≥44pt targets, focus management across steps, `accessibilityLiveRegion` step announcements, reduced-motion respected).

**AC4 — Completion recorded as a member-level event for analytics; skip permitted; re-viewable.**
**Given** the analytics requirement,
**When** the member completes **or** skips the tutorial,
**Then** the outcome is recorded as a **member-level event** (server-side, analytics-queryable) — completion and skip are distinct — **skipping is permitted**, and the tutorial is **re-viewable from settings**. The local MMKV flag is the **authoritative** first-entry suppressor (offline-resilient); the server event is **best-effort** (a failed POST never blocks completion nor re-shows the tutorial).

**AC5 — Launch-blocker closure criterion.**
**Given** the tutorial is a Phase-1 launch-blocker (UX-DR79),
**When** Phase 1 launch readiness is reviewed,
**Then** "the tutorial exists + is verified-accessible" is a named closure criterion; without it, launch is blocked. This story records that criterion in the Dev Agent Record (evidence of the accessible surface).

## Tasks / Subtasks

- [x] **Task 1 — i18n copy: new `pool-onboarding` namespace (AC1, AC3)**
  - [x] Add `packages/i18n/locales/en/pool-onboarding.json` and `packages/i18n/locales/hi/pool-onboarding.json` with keys for all 3 screens: titles, body paragraphs, the Next/Back/Skip/Confirm-skip/Done button labels, and matching `*_a11y` accessibility labels/hints. Hindi is the primary voice; English is the parity mirror.
  - [x] Register the new domain in `packages/i18n/src/catalog.ts`: add the two JSON imports, the two registry lines (en + hi), and add `'pool-onboarding'` to `KNOWN_NAMESPACES`.
  - [x] Run `pnpm --filter @twt/i18n check-parity` (a.k.a. the `i18n:check-parity` gate) — it must pass (every key present in both locales; no numeral-classification violations). Screen-3 copy MUST honor the no-blame policy (epics.md:3036): **no "you should have gone through the app" framing.** Reuse the semantics of the existing `contribution.wrong_pool.*` dignified copy (Story 7.6) as tone reference.
  - [x] Numeral discipline (Story 1.17 / amendment-A2): pool **letter codes** (A, B, C…) are Latin identifiers; any operational figure stays Latin even inside Devanagari sentences. Prefer no bare numbers in tutorial prose.

- [x] **Task 2 — First-entry gate primitive + hook (AC2, AC4)**
  - [x] Add `apps/mobile/components/pool-onboarding/pool-onboarding-gate.ts` — a pure, MMKV-backed store over the shared `mmkv` instance (`lib/mmkv.ts`): a versioned key (e.g. `pool-onboarding.completed.v1`) recording seen-state; helpers `hasSeenPoolOnboarding()`, `markPoolOnboardingCompleted()`, `markPoolOnboardingSkipped()`. This flag is the **authoritative** suppressor (works fully offline).
  - [x] Add `apps/mobile/components/pool-onboarding/usePoolOnboardingGate.ts` — the hook Epic 8's My Pool card will call: returns `{ shouldAutoShow, markCompleted, markSkipped }`. `shouldAutoShow` is `true` only when the member has neither completed nor skipped. **Do NOT wire a live auto-launch call site** — the My Pool card is Epic 8. Document this seam exactly like the lock-in widget documents its Epic-8 My Pool handoff (see `components/lock-in/LockInClockWidget.tsx:1-10`).
  - [x] Unit-test the gate logic (`apps/mobile/tests/unit/pool-onboarding-gate.test.ts`, vitest — the codebase has no RN component-render tests): fresh state → `shouldAutoShow === true`; after complete/skip → `false`; version bump semantics.

- [x] **Task 3 — The tutorial surface (AC1, AC3)**
  - [x] Add `apps/mobile/components/pool-onboarding/PoolOnboardingTutorial.tsx` — a self-contained 3-step component with internal step state (1→2→3), Tamagui + `@twt/i18n/react` `useT()`/`useLocale()`. Follow the calm/passbook register + a11y discipline established in `LockInClockWidget.tsx` (roles, ≥44pt targets, `accessibilityLiveRegion="polite"` for step changes, no urgency theater, no auto-advancing carousel → respects reduced-motion). Controls: **Next / Back**, a persistent **Skip** that opens a confirm ("Skip for now? You can view this anytime from settings"), and **Done** on Screen 3. On Done → `markCompleted()` + fire the completion event; on confirmed Skip → `markSkipped()` + fire the skip event; then dismiss the route.
  - [x] Screen 2 shows the pool identifier **generically as education** — example letter code only (*"Pool A"*), **no example curated name** (TWT-Bihar's Story 7.2 naming registry ships empty at launch; do not fabricate a Mahabharata-name example) — it MUST NOT fetch a live pool assignment (none exists pre-Epic-8). Explain the dual-identifier *concept* (letter code always present; a curated name may additionally apply once one is assigned) without showing a specific name.
  - [x] Screen 3 links the wrong-pool recovery gently; if a "Get help / contact helpdesk" affordance is included, route it to the existing Contact/Madad surface (do not invent a new helpdesk flow — Epic 10 owns that).

- [x] **Task 4 — Route group + settings re-view entry (AC2)**
  - [x] Add route group `apps/mobile/app/(pool-onboarding)/_layout.tsx` (a plain `<Stack />`, mirroring `app/(settings)/_layout.tsx`) and `apps/mobile/app/(pool-onboarding)/index.tsx` rendering `<PoolOnboardingTutorial />`. Register `(pool-onboarding)` in the root `app/_layout.tsx` Stack. No sibling route group uses modal presentation today (only the single boilerplate `modal` screen does, at `app/_layout.tsx:171`), so there's no group-level pattern to mirror — wire it explicitly: `<Stack.Screen name="(pool-onboarding)" options={{ headerShown: false, presentation: 'modal' }} />`.
  - [x] Add `apps/mobile/components/pool-onboarding/PoolOnboardingSettingsEntry.tsx` — an understated home entry mirroring `NotificationSettingsEntry` (chromeless, low-prominence, `accessibilityRole="button"` + label/hint, `router.push('/(pool-onboarding)')`). Add it to the bottom-entries stack in `app/(tabs)/index.tsx` alongside the other settings entries. This is the **live** re-view path (AC2/AC4).

- [x] **Task 5 — Member-level completion/skip event (AC4)** *(substrate ratified: backend endpoint + `audit.writeAuditEntry` — D1/D2 below)*
  - [x] Contracts: add a request schema (`{ outcome: 'completed' | 'skipped' }`) + a `204`/ack response in `packages/contracts` following an existing simple member POST (e.g. wa-opt-in / telegram-opt-in shapes).
  - [x] API: add a member-session-gated `POST /api/v1/member/pool-onboarding-tutorial` route + handler (new module `apps/api/src/modules/pool-onboarding/` OR fold into `member-home`), guarded by `requireMemberSession`. Record the outcome as a member-level action `member.pool_onboarding_tutorial_completed` / `member.pool_onboarding_tutorial_skipped` via `audit.writeAuditEntry` (single-line append — **no** compensating chain, since there is no paired state mutation; contrast wa-opt-in which pairs a consent write). `AuditEntryInput` requires more than `action`: pass `resourceLocator: pariwar/{pariwarId}/member/{memberId}/pool-onboarding-tutorial`, `requestPayloadHash` (SHA-256 hex of the request payload — either a small `poolOnboardingAuditPayloadHash({ outcome })` helper mirroring `waOptIn.waOptInAuditPayloadHash`, or hash `JSON.stringify({ outcome })` directly), and `responseStatus: 204`. Wire the route registration into `apps/api/src/server.ts` (mirror `registerWaOptInModule`'s import + call) — `apps/api/src/route-registry.ts` needs **no edit**; it only auto-collects routes via an `onRoute` hook for the login-wall/pagination CI guards, it is not a manual per-route list.
  - [x] api-client: add a `recordPoolOnboardingOutcome(outcome)` method to the member-auth client in `packages/api-client/src/index.ts` (follow the existing `requestWaOptIn` / `requestTelegramOptIn` method shape).
  - [x] Wire the tutorial to call it **fire-and-forget** (best-effort; catch + swallow — never block dismissal or re-show on failure). MMKV flag remains authoritative.
  - [x] Handler test following the existing member-route test pattern; verify the audit line is written for each outcome.

- [x] **Task 6 — Launch-blocker closure evidence (AC5)**
  - [x] In the Dev Agent Record, record that the tutorial exists + is verified-accessible (the a11y checks exercised: TalkBack-Hindi labels present, ≥44pt targets, step live-region announcements, reduced-motion respected, focus management across steps). This is the named Phase-1 launch-readiness closure criterion.

- [x] **Task 7 — Gate the whole change through `pnpm ci:local`**
  - [x] Run `pnpm --filter @twt/i18n check-parity`, the mobile vitest suite, api tests, typecheck, and lint. Reconcile green locally (GitHub Actions is suspended — `pnpm ci:local` is the merge gate; integration needs `DATABASE_URL` on :5433).

### Review Findings

3-layer adversarial review (Blind Hunter, Edge Case Hunter, Acceptance Auditor) of the Story 7.10 diff (24 files, 897 insertions). Acceptance Auditor found **zero AC violations** — all of AC1-AC5, D1/D2/D3, and the Dev Notes "IS NOT" boundaries are honored. 15 raw findings deduplicated to 4 patch + 1 defer; 10 dismissed as false positives/out-of-scope after verification against source.

**Decision-needed:** none.

**Patch (all applied 2026-07-20):**
- [x] [Review][Patch] `dismiss()` no-ops when there's no back stack, leaving the modal stuck open after Done/Skip [apps/mobile/components/pool-onboarding/PoolOnboardingTutorial.tsx:718-722] — fixed: added an `else` branch falling back to `router.replace('/(tabs)')`.
- [x] [Review][Patch] No re-entrancy guard on Done/confirmed-Skip or the settings-entry press — a double-tap before navigation completes can fire a duplicate `recordPoolOnboardingOutcome` POST (duplicate audit line) and/or push the modal route twice [apps/mobile/components/pool-onboarding/PoolOnboardingTutorial.tsx:724-738, apps/mobile/components/pool-onboarding/PoolOnboardingSettingsEntry.tsx:605-624] — fixed: `recordAndDismiss` now guards with a `hasRecordedRef` latch; the settings entry debounces rapid presses with an 800ms `lastPressAtRef` timestamp guard (non-latching, since the entry stays mounted and must remain usable after the tutorial closes).
- [x] [Review][Patch] `AccessibilityInfo.setAccessibilityFocus` fires synchronously on step change/mount with no deferral (e.g. `InteractionManager.runAfterInteractions`) — a known RN gotcha where the target node isn't yet registered in the native a11y tree during a modal-transition/re-render, risking a dropped focus announcement on the AC3/AC5 load-bearing focus-management requirement [apps/mobile/components/pool-onboarding/PoolOnboardingTutorial.tsx:703-708] — fixed: wrapped in `InteractionManager.runAfterInteractions`, cancelled on cleanup.
- [x] [Review][Patch] Dead i18n keys `skip_confirm.confirm_hint` / `skip_confirm.cancel_hint` in both locales — never read (native `Alert.alert` buttons don't accept accessibility hints) [packages/i18n/locales/en/pool-onboarding.json, packages/i18n/locales/hi/pool-onboarding.json] — fixed: removed both keys from both locale files (parity gate re-verified green).

**Deferred:**
- [x] [Review][Defer] `mmkvStorage.setItem` can throw uncaught if the native MMKV write fails, aborting `recordAndDismiss` before `dismiss()`/the analytics POST run — deferred, pre-existing (the unguarded `lib/mmkv.ts` wrapper pattern used identically by every other MMKV consumer in the app, e.g. `claim-draft.ts`; not introduced by this diff) [apps/mobile/lib/mmkv.ts:26-30]

**Dismissed (10):** gate not written on swipe/hardware-back dismissal (correct per AC4 — only complete/skip require recording); duplicate audit lines on legitimate re-view (by design — audit log is append-only event log, matches every other `member.*` action); `recordPoolOnboardingOutcome` reusing the request schema as a throwaway response schema (verified as the established `logout()` idiom — `call()` short-circuits on 204 before `schema.parse` runs); handler's bare `await audit.writeAuditEntry` with no try/catch ("best-effort" describes the client's POST tolerance, not a server-side swallow mandate; matches existing handler conventions); `Alert.alert` on RN Web (no web target evidenced anywhere in spec or diff); missing test for the MMKV-first/POST-best-effort ordering guarantee (explicitly out of scope per this repo's Testing Standards — mobile tests are pure-logic only, no RN component-render harness); 400-case integration test not asserting the error response body shape (no established convention violated); route schema missing a Fastify-level `response` block (no counterexample exists anywhere in the codebase for a 204 route); Screen-2 "permanent identifier kept for the record" phrasing (directly satisfies AC1's "canonical identifier exists for audit" requirement, deliberately generic per D3); possible duplicate TalkBack announcement from live-region + focus-shift both firing (UX nuance, not an AC violation — the Dev Agent Record already flags on-device TalkBack verification as an outstanding operator step).

## Dev Notes

### What this story IS and IS NOT (read first — prevents the #1 misread)

- **IS:** the tutorial surface + a first-entry **gate seam** (MMKV flag + hook) + a **live** settings re-view entry + a **best-effort** member-level completion/skip event + the launch-blocker closure evidence.
- **IS NOT:** a live auto-launch on first My Pool entry. **The My Pool card does not exist yet — it is Epic 8.** This story provides the hook Epic 8 will call; it does not (and cannot) wire that call site. This is exactly the pattern the lock-in widget uses ("the Epic-8 'My Pool' hand-off is forward-compat, not built yet" — `components/lock-in/LockInClockWidget.tsx:10`) and the channels-dispatch pattern ([[project_channels_no_live_dispatch_yet]] — build the primitive/seam now, live call site lands later). Do **not** try to hook a nonexistent card; the settings entry is the only live launch path this story ships.
- **IS NOT:** a live pool-assignment fetch. Screen 2 is **educational** (generic "Pool A" example). Real per-cycle assignment display is Epic 8's My Pool card.
- **IS NOT:** a helpdesk recovery flow. Screen 3 explains policy + points at the existing Contact/Madad surface. Epic 10 owns the helpdesk console (Story 7.6 reserved `helpdesk/`).
- **Scope note:** UX-DR79 as originally defined (epics.md:479) has three sub-points — pool-bound contributions, **VPA pre-fill** (the mechanism that makes wrong-pool errors structurally unlikely), and non-integration of out-of-Intent payments. This story's AC (epics.md:2827-2829, the later/more specific authority) covers pool-bound semantics and letter-code/dual-identifier education but does not re-explain VPA pre-fill — that's covered by the Intent-flow UI itself, not the tutorial. This is a deliberate scope narrowing, not an oversight.

### Previous story (7.9) — nothing transfers

Story 7.9 (pool-engine measured-validation gate) is backend measurement tooling (`@twt/measured-validation` harness, `apps/jobs` seeders, launch-gate evidence) orthogonal to this story's mobile UI/i18n/settings-entry work. No code patterns, conventions, or gotchas carry forward from it.

### Architecture patterns & conventions to follow

**Mobile stack:** Expo Router (typed routes) + Tamagui + `@twt/i18n/react`. Route groups are `app/(group)/` with a `_layout.tsx` (`<Stack />`) and screen files; each is registered in the root `app/_layout.tsx` Stack. Home bottom-of-list "entry" components (like `NotificationSettingsEntry`) are the app's settings-navigation idiom — there is no dedicated profile screen yet.

- **i18n:** `useT()` for copy, `useLocale()` for the active locale. Copy lives as flat-key JSON at `packages/i18n/locales/{hi,en}/<domain>.json`, statically imported into `catalog.ts`. Adding a domain = add the JSON pair + 2 imports + 2 registry lines + the `KNOWN_NAMESPACES` entry (catalog.ts:14-16 documents this). The `i18n:check-parity` gate enforces hi↔en key parity on every domain automatically. Default locale is Hindi (root layout: `LocaleProvider` → `DEFAULT_LOCALE = 'hi'`).
- **Numerals (Story 1.17 / amendment-A2):** Hindi words are Devanagari; operational figures + identifiers (pool letter codes) are **Latin** even inside Hindi sentences. Never mix two numeral systems at one hierarchy level. See `LockInClockWidget.tsx:12-16`.
- **MMKV (local persistence):** use the shared `mmkv` / `mmkvStorage` from `lib/mmkv.ts` — do **not** add AsyncStorage ([[project_mmkv_asyncstorage_equivalent]]). MMKV v4 API: `createMMKV()` / `mmkv.getString()` / `mmkv.set()` / `mmkv.remove()`. Namespace your key (`pool-onboarding.*`).
- **Member API calls:** the app calls the typed member-auth SDK `memberAuth.*` (`lib/member-api.ts` → `@twt/api-client`), session-token auto-attached. New member endpoints get a method on that client + a `requireMemberSession`-guarded Fastify route + a Zod contract in `@twt/contracts` + a module-registration call wired into `apps/api/src/server.ts` (mirror `registerWaOptInModule`). `route-registry.ts` is not part of this — it only auto-collects routes via an `onRoute` hook for CI guards.

### Accessibility (Story 0.10 / P0-2c — AC3, AC5 load-bearing)

Mirror the a11y discipline in `LockInClockWidget.tsx:22-25` and apply it across the 3 steps:
- Every tappable control ≥44pt; `accessibilityRole` set (`button` / `link`); action-**naming** `accessibilityLabel` (WCAG 2.5.3 Label-in-Name) + `accessibilityHint`. Text nodes carry `accessibilityRole="text"`.
- Step transitions announced via `accessibilityLiveRegion="polite"` (calm ambient — never `"assertive"`, which is for errors).
- **Focus management:** on step change, move screen-reader focus to the new step's heading (so TalkBack reads the new screen, not stale content).
- **Reduced-motion:** no auto-advancing carousel, no per-frame animation; member-driven Next/Back only. Honor the platform reduce-motion setting for any transition.
- **Hindi TalkBack + Devanagari conjunct rendering** are named critical hypotheses gating this story's design freeze (deferred-work.md:943 — A-ux-dr68-hindi-talkback, A-fm-2-devanagari-conjunct-rendering). Ensure Devanagari copy renders and announces correctly.

### Completion/skip event — substrate (Task 5) — SEE DECISIONS D1/D2

`audit.writeAuditEntry` (exported from `@twt/domain` audit module, Story 1.10) is the single-line audit-log append; `action` is a free string (no registry to extend). Existing member-level actions (`member.wa_opt_in_requested`, `member.telegram_opt_in_requested`, `member.medical_disclosed`, …) all record via the audit log — this is the codebase's "member-level event" convention, and analytics derives from it. This story's event is **standalone** (no paired mutation) so it does **not** need `withCompensatingAudit` (ADR-0030) — that pattern exists to pair a rollback-capable mutation with a compensatable audit line (see `apps/api/src/modules/wa-opt-in/handlers.ts:140`). A plain `writeAuditEntry` is correct here, but `AuditEntryInput` is not just `{ action }` — it also requires `resourceLocator`, `requestPayloadHash`, and `responseStatus` (100-599). Use `resourceLocator: pariwar/{pariwarId}/member/{memberId}/pool-onboarding-tutorial`, hash the `{ outcome }` payload for `requestPayloadHash` (mirror `waOptIn.waOptInAuditPayloadHash`, or hash `JSON.stringify({ outcome })` directly), and `responseStatus: 204`.

**Screen-3 policy doc dependency:** the no-blame framing traces to epics.md:3036, which lives inside Story 8.10 (not yet built — `docs/policies/out-of-band-contributions.md` does not exist yet). Derive Screen-3 tone directly from ux-design-specification.md:1046-1069 (UX-DR76), not from a policy-doc reference that doesn't exist yet.

**Offline resilience:** the MMKV flag is authoritative for suppression; the POST is best-effort. A member who completes the tutorial offline is never re-prompted, and the event syncs (or is simply lost — acceptable for analytics) — but the flag must be set **before/independent of** the network call.

### Files being created (all NEW — no risky UPDATEs to existing behavior)

New:
- `packages/i18n/locales/{en,hi}/pool-onboarding.json`
- `apps/mobile/components/pool-onboarding/{PoolOnboardingTutorial,PoolOnboardingSettingsEntry}.tsx`
- `apps/mobile/components/pool-onboarding/{pool-onboarding-gate.ts,usePoolOnboardingGate.ts}`
- `apps/mobile/app/(pool-onboarding)/{_layout,index}.tsx`
- `apps/mobile/tests/unit/pool-onboarding-gate.test.ts`
- `apps/api/src/modules/pool-onboarding/` (route + handler + index) *(or fold into member-home)*
- Contract schema in `packages/contracts` + api-client method

UPDATE (additive, preserve existing behavior — read before editing):
- `packages/i18n/src/catalog.ts` — add the new domain (2 imports, 2 registry lines, `KNOWN_NAMESPACES` entry). Do not touch existing domains.
- `apps/mobile/app/_layout.tsx` — register the `(pool-onboarding)` group in the root Stack alongside existing `Stack.Screen` entries (lines ~117-167). Preserve `initialRouteName: '(tabs)'` and all existing screens.
- `apps/mobile/app/(tabs)/index.tsx` — add `<PoolOnboardingSettingsEntry />` to the bottom-entries `YStack`. Preserve ordering/comments of existing entries.
- `apps/api/src/server.ts` — wire the new module's route registration (mirror `registerWaOptInModule`'s import + call site). Do **not** edit `route-registry.ts` — it auto-collects routes via an `onRoute` hook for CI guards; there is no per-route entry to add there.
- `packages/api-client/src/index.ts` — add the member-auth method.

### Testing standards

- Mobile tests are **vitest, pure-logic only** (`apps/mobile/tests/unit/*.test.ts`) — there is no React Native component-render harness. Test the gate store logic; do not attempt to render `PoolOnboardingTutorial`.
- i18n copy is covered by the `i18n:check-parity` gate (hi↔en parity).
- API handler: add a test following the existing member-route pattern; assert an audit line is written for each outcome.
- Full gate: `pnpm ci:local` (mirrors all ci.yml jobs; `--concurrency=4` already set; integration needs `DATABASE_URL` on :5433). GitHub Actions is suspended — local ci is the merge gate ([[project_ci_actions_suspension_local_mirror]]).

### Project Structure Notes

- The `(pool-onboarding)` route group and `components/pool-onboarding/` folder are new but follow the exact group-per-flow + folder-per-feature convention (`(signup)`, `(claim)`, `(life-events)` / `components/lock-in/`, `components/renewal/`).
- No new package; this is app + i18n-data + a thin API endpoint. Consistent with [[feedback_no_premature_package]].
- Sprint-status: flip `7-10-pool-engine-onboarding-tutorial` → in the completion ledger per [[project_sprint_status_ledger]] when done; epic-7 is already `in-progress`.

### References

- [Source: epics.md#Story 7.10] lines 2816-2836 (the 3-screen AC + launch-blocker closure).
- [Source: epics.md:3036] — Epic-8 dependency line: Screen-3 copy + helpline scripts + Sahyog Vivran must honor the no-blame policy ("no 'you should have gone through the app' framing").
- [Source: ux-design-specification.md] lines 949-953 (Novel Patterns: the "How Pool Engine Works" 3-screen tutorial as Phase-1 launch-blocker); §"Out-of-Band Contribution Policy" lines 1046-1069 (UX-DR76 dignified-resolution policy for Screen 3); line 965 (device-skin push-whitelist help — optional Screen content, not required); lines 1034 (Reena — wrong-pool cost highest, tutorial must land for her).
- [Source: 7-6-pool-bound-payment-enforcement.md] AC3 facilitated-recovery invariant + the `contribution.wrong_pool.*` dignified copy already in `packages/i18n/locales/{en,hi}/contribution.json` (Screen-3 tone reference). [[project_claim_overlay_unfreeze_seam]] is unrelated; the relevant frozen invariant is 7.6's "no silent remap / helpdesk-only recovery".
- [Source: 7-2 pool naming service] — dual-identifier CONCEPT (letter + an optional curated name once assigned). TWT-Bihar's naming registry ships **empty at launch** — no active Mahabharata labels (dropped after adversarial review M-10; see ux-design-specification.md "Mahabharata Pool Naming — Dropped"). Screen 2 must show the letter code only; do not fabricate a name example.
- [Source: components/lock-in/LockInClockWidget.tsx] — the canonical home-surface pattern: self-suppression, numeral discipline, calm tone, a11y (roles/44pt/live-region), Epic-8 My-Pool forward-compat framing.
- [Source: components/notifications/NotificationSettingsEntry.tsx] — the understated settings-entry idiom for Task 4.
- [Source: packages/i18n/src/catalog.ts + scripts/check-parity.ts] — adding an i18n domain + the parity gate.
- [Source: apps/api/src/modules/wa-opt-in/handlers.ts + packages/domain/src/audit/index.ts] — member-level action recording (audit-log; `writeAuditEntry` vs `withCompensatingAudit`).
- Deferred-work: deferred-work.md:935/941/943 — Story 0.10 UX-DR clause-evaluation + critical hypotheses gate this story's a11y **design freeze**; treat the a11y ACs as load-bearing, not decorative.

## Decisions (RATIFIED by BigDev 2026-07-19)

*All three ratified — no open questions remain. These are settled requirements, not options.*

- **D1 — Completion-event substrate → the audit log.** ✅ **RATIFIED.** Record via `audit.writeAuditEntry` (single-line append; `action` = `member.pool_onboarding_tutorial_completed` / `member.pool_onboarding_tutorial_skipped`), consistent with every existing `member.*` member-level action and directly analytics-queryable. **NOT** the `@twt/events` events_log stream. No `withCompensatingAudit` (there is no paired mutation).
- **D2 — A backend endpoint IS required.** ✅ **RATIFIED.** "Recorded as a member-level event **for analytics**" means server-queryable — client-only MMKV cannot satisfy AC4. Build the `POST /api/v1/member/pool-onboarding-tutorial` route + api-client method + contract (Task 5). The MMKV flag remains the authoritative *suppressor*; the POST is best-effort telemetry.
- **D3 — Screen 2 shows a GENERIC educational example.** ✅ **RATIFIED.** "Pool A" letter code only — **not** a live assignment fetch (Epic 8 owns live My Pool data; the member has no assigned pool pre-Epic-8), and **no example curated name**: Story 7.2 ships TWT-Bihar's naming registry empty at launch (no active Mahabharata labels — dropped after adversarial review M-10, ux-design-specification.md "Mahabharata Pool Naming — Dropped"). The tutorial teaches the *concept* of the letter-code + optional dual identifier, not the member's actual pool, and must not fabricate a name that was explicitly reviewed out of production.

## Dev Agent Record

### Agent Model Used

Opus 4.8 (claude-opus-4-8)

### Debug Log References

- `pnpm --filter @twt/i18n i18n:check-parity` — green (every member-facing en/ key has non-empty Hindi parity, incl. the new `pool-onboarding` namespace).
- `pnpm --filter @twt/contracts contracts:emit-openapi` + `contracts:check-openapi-determinism` — green after registering the new path/component; re-emit is byte-identical to the committed `openapi/v1.yaml` (POST `/api/v1/member/pool-onboarding-tutorial` + `PoolOnboardingOutcomeRequest`).
- Mobile vitest: `tests/unit/pool-onboarding-gate.test.ts` 6/6; full mobile unit suite 29/29.
- API integration (`DATABASE_URL` on :5433): `tests/integration/pool-onboarding/pool-onboarding-outcome.spec.ts` 4/4; `tests/integration/login-wall.spec.ts` 3/3 (confirms the new member-session-gated route is recognised as guarded — fails-closed).
- Full `pnpm ci:local` (DATABASE_URL on :5433) — the merge gate (GitHub Actions suspended, [[project_ci_actions_suspension_local_mirror]]).
- Tamagui shorthand gotcha: `minHeight`/`marginTop` are not accepted on `YStack` — used `minH` / `mt`.
- i18n namespace gotcha: `useT()` defaults to the `common` namespace; all `pool-onboarding` copy is resolved with an explicit `{ namespace: 'pool-onboarding' }` option (the tutorial binds a local `t` wrapper; the settings entry passes it per-call).

### Completion Notes List

**What shipped (IS):** the 3-screen tutorial surface + a first-entry **gate seam** (MMKV flag + `usePoolOnboardingGate` hook) + a **live** settings re-view entry + a **best-effort** member-level completion/skip event + this launch-blocker closure evidence.

**What was deliberately NOT built (IS NOT):** no live auto-launch on first My Pool entry (the My Pool card is Epic 8 — this story ships only the hook Epic 8 will call; the settings entry is the only live launch path). No live pool-assignment fetch (Screen 2 is a generic "Pool A" educational example — D3). No helpdesk recovery flow (Screen 3 explains policy + points at the existing Contact/Madad surface; Epic 10 owns the console). VPA pre-fill is out of scope per the AC narrowing (Dev Notes).

**Decisions honored:** D1 — outcome recorded via `audit.writeAuditEntry` (single-line, `member.pool_onboarding_tutorial_completed` / `_skipped`), NOT `@twt/events`, no compensating chain (no paired mutation). D2 — a member-session-gated backend endpoint (`POST /api/v1/member/pool-onboarding-tutorial`) is built (client-only MMKV cannot satisfy "analytics-queryable"). D3 — Screen 2 shows the generic letter-code example only, no fabricated curated name (Story 7.2 registry ships empty).

**Offline resilience (AC4):** the MMKV flag is set **synchronously first** (authoritative suppressor), then the analytics POST is fired **fire-and-forget** (`.catch(() => undefined)`) — a failed/absent network call never blocks dismissal nor re-shows the tutorial.

**Screen-3 tone:** derived from UX-DR76 (ux-design-specification.md:1046-1069) and the existing `contribution.wrong_pool.*` dignified copy (the `docs/policies/out-of-band-contributions.md` policy doc does not exist yet — Story 8.10). No-blame framing: no "you should have gone through the app" language; direct-to-family gifts honored dignifiedly; a wrong-pool payment is recovered by the helpdesk **without breaking the assignment** (7.6 facilitated-recovery invariant, gently framed).

**AC5 — Phase-1 launch-readiness closure criterion (RECORDED):** "the pool-engine onboarding tutorial exists + is verified-accessible." The tutorial surface exists (`PoolOnboardingTutorial.tsx`, reachable live via the settings entry) and the a11y discipline is exercised across all 3 steps:
- **Hindi-first + parity:** all copy Hindi-primary with hi↔en parity enforced by the `i18n:check-parity` gate (green).
- **TalkBack-Hindi labels:** every control carries an action-naming `accessibilityLabel` (WCAG 2.5.3 Label-in-Name) + `accessibilityHint`; body nodes carry `accessibilityRole="text"`; the heading is an accessible `header` node.
- **≥44pt targets:** Back/Next/Done/Skip all `height={44}`.
- **Step live-region announcements:** the heading carries `accessibilityLiveRegion="polite"` with a "Screen two: …" progress label (never `"assertive"`).
- **Focus management:** on each step change screen-reader focus moves to the new step heading via `AccessibilityInfo.setAccessibilityFocus(findNodeHandle(...))`.
- **Reduced-motion:** no auto-advancing carousel and no per-frame animation — member-driven Next/Back only, so the platform reduce-motion setting is honored by construction.

Without this verified-accessible surface, Phase-1 launch is blocked (UX-DR79). Note: on-device Hindi-TalkBack + Devanagari-conjunct rendering (deferred-work.md:943) are named critical hypotheses that this repo's harness cannot exercise (no RN component-render tests — mobile tests are vitest pure-logic only); the a11y **props/structure** are verified here, on-device assistive-tech confirmation remains an operator device check at launch-readiness review.

### File List

**New — i18n copy:**
- `packages/i18n/locales/en/pool-onboarding.json`
- `packages/i18n/locales/hi/pool-onboarding.json`

**New — mobile:**
- `apps/mobile/components/pool-onboarding/pool-onboarding-gate.ts`
- `apps/mobile/components/pool-onboarding/usePoolOnboardingGate.ts`
- `apps/mobile/components/pool-onboarding/PoolOnboardingTutorial.tsx`
- `apps/mobile/components/pool-onboarding/PoolOnboardingSettingsEntry.tsx`
- `apps/mobile/app/(pool-onboarding)/_layout.tsx`
- `apps/mobile/app/(pool-onboarding)/index.tsx`
- `apps/mobile/tests/unit/pool-onboarding-gate.test.ts`

**New — contract + API:**
- `packages/contracts/src/pool-onboarding/tutorial.ts`
- `packages/contracts/src/pool-onboarding/index.ts`
- `apps/api/src/modules/pool-onboarding/handlers.ts`
- `apps/api/src/modules/pool-onboarding/routes.ts`
- `apps/api/src/modules/pool-onboarding/index.ts`
- `apps/api/tests/integration/pool-onboarding/pool-onboarding-outcome.spec.ts`

**Updated (additive):**
- `packages/i18n/src/catalog.ts` — registered the `pool-onboarding` namespace (2 imports, 2 registry lines, `KNOWN_NAMESPACES`).
- `packages/contracts/src/index.ts` — export the new `pool-onboarding` barrel.
- `packages/contracts/scripts/emit-openapi.ts` — import + component + path registration for the outcome endpoint.
- `openapi/v1.yaml` — regenerated (new component + path).
- `packages/api-client/src/index.ts` — `recordPoolOnboardingOutcome(outcome)` member-auth method + base path + imports.
- `apps/api/src/server.ts` — import + `registerPoolOnboardingModule(app, deps)` call.
- `apps/mobile/app/_layout.tsx` — registered the `(pool-onboarding)` modal route group in the root Stack.
- `apps/mobile/app/(tabs)/index.tsx` — added `<PoolOnboardingSettingsEntry />` to the bottom-entries stack.
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — `7-10` status flip + ledger.

### Change Log

- **2026-07-20 — Story 7.10 implemented (Status → review).** New member-facing 3-screen pool-engine onboarding tutorial (Hindi-first, a11y-complete) + MMKV first-entry gate seam + `usePoolOnboardingGate` hook (Epic-8 forward-compat, not a live call site) + live settings re-view entry + best-effort member-level completion/skip audit event (`POST /api/v1/member/pool-onboarding-tutorial`) + launch-blocker closure evidence (AC5). All decisions D1/D2/D3 honored. Gated green through `pnpm ci:local` on :5433.
- **2026-07-20 — Code review (Status: review → done).** 3-layer adversarial review (Blind Hunter, Edge Case Hunter, Acceptance Auditor); Acceptance Auditor found zero AC violations. 15 raw findings deduplicated to 4 patch + 1 defer; 10 dismissed as false positives/out-of-scope after verification against real source (e.g. the api-client's reused request-schema-as-response-schema is the established `logout()` idiom; audit-log "duplication" on re-view is by-design event-log semantics; swipe/back dismissal correctly doesn't record an outcome per AC4). 4 patches applied: `dismiss()` now falls back to `router.replace('/(tabs)')` when there's no back stack instead of leaving the modal stuck open; `recordAndDismiss` gained a `hasRecordedRef` re-entrancy guard and the settings entry an 800ms debounce, closing a double-tap duplicate-audit-line/duplicate-route-push gap; `AccessibilityInfo.setAccessibilityFocus` now fires inside `InteractionManager.runAfterInteractions` (cancelled on cleanup) instead of synchronously, closing a dropped-focus-announcement risk on the AC3/AC5 load-bearing requirement; removed 2 dead i18n keys (`skip_confirm.confirm_hint`/`cancel_hint`) from both locales. 1 deferred (pre-existing unguarded `lib/mmkv.ts` wrapper, logged to `deferred-work.md`). Re-verified after patches: `i18n:check-parity` green, `@twt/mobile` typecheck/lint/test 29/29 green.
