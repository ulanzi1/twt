---
baseline_commit: f055e408ee59d4e2e624d459aaa8d1af423059d4
---
# Story 3.7: Lock-In Clock Widget on Home Screen (WI-13)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a member in the `lock-in` state on the home screen of TWT,
I want a topmost widget showing my lock-in countdown + rationale + unlock date with a tap-target into the Niyamavali clause explaining lock-in,
so that I understand why I cannot withdraw yet and when I will be eligible for claim coverage.

`[SURFACE]` story. Epic 3 (Member Lifecycle). Depends on: Story 3.1 (lifecycle state machine + `member.lock_in_entered` event), Story 3.6b (the production emitter of `lock_in_entered` with the FR-8 snapshot payload), Story 2.1 (i18n bilingual contract + numeral discipline), Story 2.5 (public Niyamavali render — the deep-link target), Story 0.10 (P0-2c accessibility gate). Forward-couples to Epic 8 (the "My Pool" / `ActiveContributionCard` consumer that replaces this widget after lock-in expires).

## Acceptance Criteria

From epics.md §"Story 3.7" (lines 1739-1755) — verbatim BDD, numbered for traceability:

**AC1 — Conditional topmost render with countdown + clause ref + unlock date**
**Given** FR-3 + Story 3.1 lifecycle state (`lock-in`) + Niyamavali clause `niy.lock-in.policy` (Epic 2 registry)
**When** the widget is implemented
**Then** the widget appears as the topmost element on the home screen **ONLY** for members in `lock-in` state; shows **days remaining until unlock**, the current lock-in policy **clause reference** (`clause_id`), and an **unlock date** formatted per locale.

**AC2 — Rationale copy with deep-link tap-target into the Niyamavali clause**
**And** the widget surfaces the **rationale copy** with a tap-target link to the Niyamavali public page (Story 2.5) **deep-linked to the relevant `clause_id`**.

**AC3 — Lock-in expiry transition (forward-compat)**
**And** when the lock-in expires (Story 3.1 emits `lock-in.expired`), the widget transitions to "My Pool" card on the next alert cycle entry (Epic 8 `ActiveContributionCard` consumer). *(Epic 8 is not built yet — see Dev Notes "AC3 scope"; for this story the widget MUST stop rendering once the member is no longer in `lock-in` state.)*

**AC4 — Accessibility: ARIA-live countdown, ≥44pt tap-target, Hindi-first parity**
**Given** the inherited accessibility gate (Story 0.10 P0-2c)
**When** the widget renders for assistive-tech users
**Then** the countdown is announced with appropriate **ARIA-live politeness**; the tap-target is **≥ 44pt**; **Hindi-first parity** contract enforced (Story 2.1).

## Tasks / Subtasks

- [x] **Task 1 — Domain read accessor for the lock-in clock** (AC1)
  - [x] Add `getLockInClock(db, memberId)` to `packages/domain/src/member/read.ts` (or a sibling `member/lock-in-read.ts`). It reads `events_log` directly (domain owns the table; cannot import `@twt/events` — same precedent as `getMemberStateAt`, see `read.ts` header). Query shape: `where(and(eq(eventsLog.streamId, memberId), eq(eventsLog.eventType, 'member.lock_in_entered')))` `.orderBy(desc(eventsLog.eventVersion)).limit(1)` — requires `{ and, desc, eq }` from `'drizzle-orm'` (unlike `getMemberStateAt` which uses `asc`; note the opposite sort for "most-recent"). The payload is `jsonb` (typed `unknown` by Drizzle) — parse it: `const parsed = LockInEnteredPayloadSchema.safeParse(row.payload)` (same `.safeParse` discipline as `resolveLockInPolicy` in `lock-in.ts:64`; treat a malformed payload as `null`). Returns `{ enteredAt: Date, lockInDaysAtJoin: number, lockInPolicyVersion: string } | null`. The `lock_in_days_at_join` + `lock_in_policy_version` come from the event **payload** (the authoritative record — `members.lock_in_days_at_join` is only a read-cache mirror; see `events.ts` lines 138-154). `null` when no such event exists.
  - [x] Export it from `packages/domain/src/member/index.ts` so the API consumes it as `member.getLockInClock(...)`.
  - [x] Unit test in `packages/domain/tests/member/` (replay fixture: stream with `lock_in_entered` → returns the snapshot; stream without → `null`).
- [x] **Task 2 — Transport contract** (AC1, AC2)
  - [x] Add `packages/contracts/src/members/lock-in.ts` exporting `MemberLockInStatusResponse` (`.strict()`, members/ directory discipline). Shape (recommended): `{ state: MemberLifecycleStateWire, lockIn: { enteredAt: Iso8601Datetime, unlockDate: Iso8601Datetime, daysRemaining: number(int, ≥0), lockInDays: number(int, >0), clauseId: string, clauseVersion: string } | null }`. `lockIn` is `null` (or omit via discriminated union) whenever `state !== 'lock-in'`.
  - [x] **DO NOT create a new lifecycle-state enum.** `MemberLifecycleStateWire` already exists in `packages/contracts/src/kyc/signup.ts:41-51` (the full 9-state `z.enum` mirroring `MEMBER_LIFECYCLE_STATES`) and is already barrel-exported from `@twt/contracts`. Import it with `import { MemberLifecycleStateWire } from '../kyc/signup.js'` — a relative intra-contracts import is fine (the no-`@twt/domain` rule applies to that package only). Creating a third lifecycle-state enum would introduce lockstep-drift risk.
  - [x] Barrel-export from `packages/contracts/src/members/index.ts`.
- [x] **Task 3 — API read endpoint** (AC1, AC2)
  - [x] Create `apps/api/src/modules/member-home/` (handlers.ts + routes.ts + index.ts) — own module, NOT folded into `vyawastha-shulk/` (that is the payment surface). Mirror the `vyawastha-shulk` module shape (no repo.ts; handler opens its own scope-tx and calls `@twt/domain` accessors).
  - [x] `GET /api/v1/member/lock-in-status`, member-session-gated (`requireMemberSession` preHandler — token-bearer, see `member-session-guard.ts`). Read `getMemberStateAt(now)` for `state`; if `state === 'lock-in'`, call `getLockInClock`, compute `unlockDate = enteredAt + lockInDays days` (use `setDate`/date math, **not** fixed-ms — leap-safe, mirror 3.6b P9 `validThrough` note in `vyawastha-shulk/handlers.ts:138`) and `daysRemaining = max(0, ceil((unlockDate − now)/1 day))`; `clauseId` is the constant `niy.lock-in.policy` (`LOCK_IN_POLICY_CLAUSE_ID` in `domain/src/member/lock-in.ts`). Return `lockIn: null` for every non-`lock-in` state.
  - [x] Register `registerMemberHomeModule(app, deps)` in `apps/api/src/server.ts` (next to `registerVyawasthaShulkModule`). The route is session-gated → it is automatically covered by the Story 1.14 login-wall CI gate (do NOT add to the allowlist).
  - [x] Integration test in `apps/api/tests/integration/` against the live test DB (`:5433`): seed a member through to `lock-in`, assert the payload; assert a non-lock-in member returns `lockIn: null`; assert 401 without a session. **Seeding pattern:** mirror `apps/api/tests/integration/vyawastha-shulk/vyawastha-shulk.spec.ts:34-71` (`seedMember` using `projectMemberState` inside a `openScopeTx`/`closeScopeTx` pair) — extend through the full lock-in sequence (signup_initiated → kyc_manual_fallback → nominees_declared → medical_disclosed → vyawastha_shulk_paid → lock_in_entered). That file's `seedWithdrawnMember` helper (line 74) shows the full transition chain; adapt it to stop at `lock_in_entered`. Assert membership not counts (own-committing writers accumulate rows).
- [x] **Task 4 — api-client SDK method** (AC1)
  - [x] Add `memberLockInStatus(): Promise<MemberLockInStatusResponse>` to `packages/api-client/src/index.ts` (GET, response-validated against the contract — the single-source-of-transport-types rule; mirror `vyawasthaShulkStatus`).
- [x] **Task 5 — Mobile widget component** (AC1, AC2, AC4)
  - [x] Create `apps/mobile/components/lock-in/LockInClockWidget.tsx` + `useLockInClockQuery.ts` (React Query hook calling `memberAuth.memberLockInStatus()`; mirror `components/yogdaan-bahi/useYogdaanQuery.ts` + the real-fetch pattern in `(signup)/payment.tsx`). The hook keys e.g. `['member', 'lock-in-status']`.
  - [x] Render only when `data.state === 'lock-in'` and `data.lockIn` is present — otherwise return `null` (the widget self-suppresses; AC1 "ONLY for members in `lock-in` state" + AC3 expiry behavior).
  - [x] Show: lock-in title; **days remaining** (Latin numerals — see Dev Notes "Numeral discipline"); **unlock date** formatted per locale; the **clause reference** (`clauseId`); rationale copy; the deep-link tap-target.
  - [x] Calm visual register (passbook strip, hairline rules, no shadow/rounded-card, **no urgency theater / no red countdown** — UX spec lines 299/313/973). Use Tamagui primitives + design tokens (Story 1.17) like the signup screens.
- [x] **Task 6 — Deep-link to the Niyamavali clause** (AC2)
  - [x] Tap-target opens `{PUBLIC_SITE_ORIGIN}/niyamavali?clause={clauseId}&lang={locale}` (the public Astro route's accepted params — `apps/public/src/pages/niyamavali.astro:43` `clause` + `:29` `lang`). Open via `Linking.openURL(...)` (same mechanism `payment.tsx` uses for the UPI URL).
  - [x] Source the origin from a new public env `EXPO_PUBLIC_PUBLIC_SITE_ORIGIN` (mirror `EXPO_PUBLIC_API_URL` in `lib/member-api.ts`; matches the public app's `PUBLIC_SITE_ORIGIN`, default `https://twt.org`). Add a small `lib/niyamavali-link.ts` helper (or inline) — keep the URL grammar one place (cf. deep-links contract README). **Do NOT add an env block to `eas.json`** — the actual `eas.json` has no `env` sections in any build profile (not even `EXPO_PUBLIC_API_URL`; that is code-defaulted in `lib/member-api.ts:13`). Follow the same pattern: declare `const publicSiteOrigin = (process.env.EXPO_PUBLIC_PUBLIC_SITE_ORIGIN ?? 'https://twt.org').replace(/\/$/, '')` at module level in the helper/component, defaulting to production. For non-default environments, operators set the env var at build time via EAS environment or `.env.local`.
- [x] **Task 7 — Home-screen integration** (AC1, AC3)
  - [x] Render `<LockInClockWidget />` as the **topmost** element of the home tab `apps/mobile/app/(tabs)/index.tsx`. **Current state of that file (9 lines):** it returns `<YogdaanBahi />` directly with no wrapper. You must introduce a wrapping `<YStack flex={1}>` (or equivalent Tamagui container), place `<LockInClockWidget />` first, then `<YogdaanBahi />` below it. For a non-lock-in member the widget renders `null` and the existing home content shows unchanged. Do not error-wall the home if the status fetch fails — the widget simply does not render (fail-soft); existing content stays.
- [x] **Task 8 — i18n keys (bilingual, Hindi-first)** (AC4)
  - [x] Add flat dotted keys to `packages/i18n/locales/en/common.json` **and** `hi/common.json` (the catalog uses flat keys like `payment.title`; namespace `common`). Suggested: `lock_in.title`, `lock_in.days_remaining` (with a count param), `lock_in.unlock_date_label`, `lock_in.rationale`, `lock_in.clause_link`, `lock_in.clause_link_hint`, `lock_in.clause_ref_label`. Hindi is the primary surface — author Hindi with care, not machine-translation. Keep both locales key-for-key in parity (Story 2.1 parity contract; there is a parity CI check — see Dev Notes).
- [x] **Task 9 — Accessibility** (AC4)
  - [x] Countdown announced via `accessibilityLiveRegion="polite"` (RN → `aria-live="polite"` on web; "appropriate politeness" = polite, NOT assertive — this is calm ambient status, never an alert; contrast `payment.tsx`'s `assertive` error banner).
  - [x] Deep-link tap-target ≥ 44pt: set `minHeight`/`height` ≥ 44 (signup CTAs use 48/56) and `hitSlop` if the visual is smaller; `accessibilityRole="link"` (or `"button"`), `accessibilityLabel` that NAMES the action (WCAG 2.5.3 Label-in-Name — 3.6a P7), `accessibilityHint`.
  - [x] Every text element carries `accessibilityRole="text"`; the unlock date + days-remaining read naturally for a screen reader (consider an `accessibilityLabel` that expands "12 days" rather than relying on the visual glyphs).
- [x] **Task 10 — Verify** (all)
  - [x] Backend: `pnpm --filter @twt/domain test`, `pnpm --filter @twt/contracts ...`, and the API integration suite with `DATABASE_URL` on `:5433`. Run `pnpm ci:local` (mirrors all ci.yml jobs — the merge gate; CI Actions are suspended, reconcile locally).
  - [x] Mobile: `pnpm --filter twt-mobile typecheck` + `lint` (the mobile `build`/`test` scripts are intentional no-ops — verification is typecheck + lint; see Dev Notes "Testing reality").

### Review Findings

- [x] [Review][Patch] `formatUnlockDate` catch block self-defeats on Invalid Date — `d.toISOString()` always throws `RangeError` when `d` is `Invalid Date`, so the defensive fallback re-throws instead of guarding [`apps/mobile/components/lock-in/LockInClockWidget.tsx:44`]
- [x] [Review][Patch] E2E `daysRemaining` assertion `toBe(30)` fragile on DB/app clock skew — when DB container `now()` is ahead of app `deps.clock()` by even 1ms the `ceil` rounds to 31; use `>= 29 && <= 31` tolerance or seed with an explicit `occurredAt` [`apps/api/tests/integration/member-home/lock-in-status.spec.ts:121`]
- [x] [Review][Patch] `getLockInClock` has no `occurredAt <= now` bound — a `lock_in_entered` event timestamped slightly in the future (DB/app clock skew) is returned while `getMemberStateAt` would not see it, causing `daysRemaining` to read ~31 on day 0; fix: pass and filter by `atTimestamp` mirroring `getMemberStateAt` [`packages/domain/src/member/read.ts:118`]
- [x] [Review][Patch] Unlock-date `<Text>` has no expanded `accessibilityLabel` — asymmetric with the countdown element which has `lock_in.days_remaining_a11y`; a screen reader user hears only the formatted date string with no sentence frame [`apps/mobile/components/lock-in/LockInClockWidget.tsx:98`]
- [x] [Review][Patch] Handler comment "NOT fixed-ms" is inaccurate — `daysRemaining` is computed with millisecond subtraction; the "NOT fixed-ms" claim applies only to `unlockDate` (the `setDate` addition); misleads future reviewers auditing the 3.6b P9 pattern [`apps/api/src/modules/member-home/handlers.ts:14`]
- [x] [Review][Defer] `clauseId` sourced from compile-time constant `LOCK_IN_POLICY_CLAUSE_ID` not from the event payload snapshot — if the policy clause is ever renamed a member's deep-link targets the new clause ID with their old `clauseVersion` UUID [deferred, pre-existing design choice per spec; fix requires event payload schema change] [`packages/domain/src/member/lock-in.ts:26`]
- [x] [Review][Defer] Server `setDate`/`getDate` uses local timezone — latent off-by-one near DST transitions if server ever moves off UTC; no current bug (server is UTC) — deferred, pre-existing [apps/api/src/modules/member-home/handlers.ts:71]
- [x] [Review][Defer] No `memberExists` guard — event-less member silently returns `{ state: 'pending-kyc', lockIn: null }` (200); pre-existing pattern across all read endpoints, not 3.7-introduced — deferred, pre-existing [`apps/api/src/modules/member-home/handlers.ts:53`]
- [x] [Review][Defer] Dev Agent Record "all 16 static jobs green" enumerates 17 items and conflicts with project memory's 14-job `ci:local` count — bookkeeping inconsistency in the record only, not a code defect — deferred, pre-existing
- [x] [Review][Defer] React Query `refetchOnWindowFocus` is a no-op in React Native without AppState wiring — spec explicitly accepts home-tab remount as sufficient for day-granular calm cadence; adding AppState focus wiring is separate scope — deferred, pre-existing [`apps/mobile/components/lock-in/useLockInClockQuery.ts`]

## Dev Notes

### What this story actually is

A read-only, conditionally-rendered home-screen widget for members who are in the `lock-in` lifecycle state. It is a thin SURFACE over data that already exists in the event stream — **but the read path to expose that data does not exist yet**, so the bulk of the new code is a small full-stack read seam (domain accessor → contract → API route → api-client → widget), plus the mobile widget and its home integration. There is **no new write path, no new event, no schema/migration change.**

### Where the data lives (and the gap)

Story 3.6b (`apps/api/src/modules/vyawastha-shulk/handlers.ts`) is the production emitter. When the 5-condition lock-in gate is satisfied it emits, in one scope-tx:
1. `member.vyawastha_shulk_paid` (`pending-fee → lock-in`) — the authoritative state transition.
2. `member.lock_in_entered` (`lock-in → lock-in`, a non-transition **marker**) carrying the FR-8 snapshot payload `{ lock_in_days_at_join, lock_in_policy_version }`, then mirrors `lock_in_days_at_join` into the `members` read-cache column.

The events.ts header is explicit: *"`lock_in_entered` — the lock-in clock-start marker … Story 3.7's clock widget keys off this event's `occurred_at`"* (`packages/domain/src/member/events.ts:94-96`). So:
- **Clock start** = the `member.lock_in_entered` event `occurred_at`.
- **Countdown length** = `lock_in_days_at_join` (from the event payload — the authoritative copy; the column is a mirror, `events.ts:144`).
- **Unlock date** = `occurred_at + lock_in_days_at_join` days.
- **Policy clause** = `niy.lock-in.policy` (constant `LOCK_IN_POLICY_CLAUSE_ID`, `domain/src/member/lock-in.ts:26`); the specific version is `lock_in_policy_version`.

**Existing reads do NOT expose this.** `getMemberStateAt` returns only the state string (`domain/src/member/read.ts:60`). `GET /vyawastha-shulk/status` returns `{ paid, validThrough, lockInEntered, outstanding }` — note `lockInEntered` is `true` for `lock-in` **or any past state** (`LOCK_IN_OR_PAST` set in `handlers.ts:44`), and it carries neither `occurred_at` nor the clause — so it cannot drive the countdown. **Build the new accessor + read endpoint (Tasks 1-4).** Do not overload `/vyawastha-shulk/status`; this is lifecycle/home, not payment.

### Server-authoritative computation (recommended)

Compute `unlockDate` and `daysRemaining` on the **server** (from `deps.clock()`), so the figure is canonical and the client does not drift or re-derive policy. Return ISO `enteredAt` + ISO `unlockDate` + integer `daysRemaining`. The widget displays; it does not compute the clock. **No per-second ticking** — the countdown is day-granular and calm; re-fetch on screen focus is enough. Use leap-safe date math (`setDate`/`setFullYear`), mirroring the 3.6b P9 fix that replaced fixed-ms arithmetic for `validThrough` (`vyawastha-shulk/handlers.ts:138-140`).

### Numeral discipline — Latin numerals for the countdown (load-bearing for AC4)

Per the amendment-A2 numeral contract (Story 2.1 / Story 1.17 numeral hardening, `packages/i18n/src/number.ts:3-15`): **Devanagari digits (०-९) are reserved EXCLUSIVELY for ceremonial/memorial Devanagari prose.** The lock-in **days-remaining counter and unlock date are operational figures → render in LATIN numerals even in Hindi locale.** Do NOT call `toHindiNumeral` on the countdown. This is the same rule the My Pool card and stat-values follow. (The Hindi *words* around the number are Devanagari; the number itself is Latin — never mix two numeral systems at the same hierarchy level, `number.ts:11-12`.) Use the Devanagari **tabular** numeric font role only if you ever render Devanagari numerals — which here you do not.

### Tone — calm presence, no urgency theater (load-bearing for the UX register)

The lock-in clock is named repeatedly in the UX spec as the canonical example of *calm*: *"The lock-in clock counts down without her having to track dates"* (line 299), *"The lock-in clock counts down calmly"* (line 313), *"calm is default; precision tightens as deadlines approach; never panic. Manufactured urgency theater (countdowns at 3-day, red alerts, animations) is anti-pattern"* (line 973). Visual register is **passbook entry, not fintech card**: full-width strip, hairline rules above/below, no shadow, no rounded corners, no red, no animated/pulsing countdown (UX spec line 977-979, applied there to the My Pool card — the same discipline governs this widget as the topmost home element). The rationale should read as *"here is why you wait and when you're covered,"* not *"act now."*

### Deep-link target (AC2)

The public Niyamavali render (Story 2.5, `apps/public/src/pages/niyamavali.astro`) accepts `?clause=<clauseId>&lang=<locale>` (`:43` reads `clause`, `:29` reads `lang`, malformed clause → unknown-clause view `:47-51`). Build `{PUBLIC_SITE_ORIGIN}/niyamavali?clause=niy.lock-in.policy&lang={locale}` and open with `Linking.openURL`. `PUBLIC_SITE_ORIGIN` defaults to `https://twt.org` (`apps/public/astro.config.mjs:21`). The mobile app has no public-site origin env yet — add `EXPO_PUBLIC_PUBLIC_SITE_ORIGIN` (mirror `EXPO_PUBLIC_API_URL`, `lib/member-api.ts:13`). The `clauseId` value should come from the server read (server-authoritative), not be hardcoded in the widget.

### Home-screen placement (AC1, AC3) — read carefully

`apps/mobile/app/(tabs)/index.tsx` is the home tab; it currently renders the `YogdaanBahi` **prototype** (Story 0.14 P0-5 native-stack validation, sample-data — not the real member home). The real "home card" stack is an Epic-8-era concern (My Pool / Panchayat noticeboard). Per AC1 the widget is the **topmost element on the home screen**; per AC3 it later yields to the Epic 8 `ActiveContributionCard`. **Epic 8 does not exist yet** — so:
- Scope for THIS story: render `<LockInClockWidget />` as the topmost element of `(tabs)/index.tsx`, gated on `state === 'lock-in'`. Keep the existing home content below it, unchanged, for everyone.
- AC3's "transition to My Pool card" is **forward-compat**, not implementable now (no `ActiveContributionCard`). The implementable half of AC3 is: **once the member leaves `lock-in` (lock-in expired → `pending-valid`/`active`), the widget stops rendering** (it self-suppresses on `state !== 'lock-in'`). Document this explicitly in the completion notes so the reviewer doesn't read AC3 as unmet.

The signup payment screen already routes here on lock-in entry: `router.replace('/(tabs)')` with the comment *"Story 3.7's clock widget renders on the tabs"* (`apps/mobile/app/(signup)/payment.tsx:3,109`). That is the entry path your widget completes.

### Mobile patterns to mirror (do not reinvent)

- **Data fetch:** React Query (`@tanstack/react-query`) via `memberAuth.*` (`lib/member-api.ts`). Mirror `components/yogdaan-bahi/useYogdaanQuery.ts` for the hook shape and `payment.tsx` for the real authenticated-fetch + loading/error handling.
- **i18n:** `useT()` + `useLocale()` from `@twt/i18n/react`. Locale is **Hindi-default** (`app/_layout.tsx` LocaleProvider initialLocale = hi, Epic 3 intro). Keys are flat dotted strings in `common.json`.
- **UI primitives:** Tamagui (`YStack`, `Text`, `Paragraph`, `H2`, `Button`) + design tokens (Story 1.17 — `@twt/tokens`). The Devanagari font roles are already wired in `_layout.tsx` (Tiro display / Noto body / IBM Plex Sans tabular numerics).
- **Accessibility props:** `accessibilityRole`, `accessibilityLabel` (name the action), `accessibilityHint`, `accessibilityLiveRegion` ("polite" here), `accessibilityState`. Tap-target height ≥ 44 (signup uses 48/56). All per `payment.tsx`.

### Backend patterns to mirror

- **Route module:** `apps/api/src/modules/vyawastha-shulk/{routes,handlers,index}.ts` is the closest template (no repo.ts; handler opens its own scope-tx; member-session-gated; registered in `server.ts`). The new module's GET handler is much simpler — two domain reads + a date computation.
- **Session gate:** `requireMemberSession(deps)` preHandler back-fills `request.requestContext.actorId` (= member_id) + `.pariwarId` (`auth/shared/member-session-guard.ts`). Read them via the `memberCtx`-style helper (`vyawastha-shulk/handlers.ts:59`).
- **Scope-tx / RLS:** open/close via `openScopeTx`/`closeScopeTx` (`modules/multi-tenant/scope-tx.ts`); domain reads filter by `stream_id` and RLS enforces the Pariwar.
- **Contracts discipline:** `.strict()` on every object; contracts source MUST NOT import `@twt/domain` (browser-bundle rule) — use `_common` primitives (`Iso8601Datetime`) and mirror the state enum locally.

### Testing reality

- **Mobile:** `apps/mobile` `build` is an intentional EAS no-op and `test`/`test:web` are `true` (no-ops) — there is no unit-test runner wired. Verification for the widget is **`typecheck` (tsc --noEmit) + `lint` (eslint)**. The one Playwright test (`tests/export.test.ts`) is a static-export hydration smoke test, not a per-component suite; do not block on it. (Per the established 3.5/3.6a/3.6b note: "Mobile build/test are repo no-ops → verified by typecheck + lint.")
- **Backend:** the domain accessor gets a real unit test (replay fixture). The API endpoint gets a real integration test against the Dockerized test DB `twt-test-pg` on `:5433` (set `DATABASE_URL`). Live-DB gotchas apply: never regenerate an applied migration; own-committing writers accumulate rows → assert membership not counts (no schema change here, so low risk).
- **Merge gate:** GitHub Actions are suspended (account under review) — run `pnpm ci:local` (mirrors all 14 ci.yml jobs) as the gate; integration needs `DATABASE_URL` on `:5433`.

### CI gates that will react to this change

- **Login-wall gate (Story 1.14):** any member-authenticated route must carry `requireMemberSession` (tagged `MEMBER_SESSION_GUARD`) or be allowlisted, else CI fails. The new GET route is session-gated → compliant; do **not** allowlist it.
- **i18n parity (Story 2.1):** Hindi and English `common.json` must stay key-for-key in parity — add the same keys to both, or the parity check fails. Verify with the i18n package's lint/test.
- **Schema-diff gate (Story 1.16c):** no schema change here, so it should be a no-op — if you find yourself touching `members` columns or migrations, stop; this story needs none.
- **Friction-budget gate (Story 1.16a):** the mobile surface (`twt-member-mobile`) is a no-op until `apps/mobile/dist/bundle-manifest.json` exists (EAS build is a no-op) — adding the widget does not trip it. Not a concern for this story.
- **Benefit-mechanism / PII-scrape gates:** no benefit copy and no PII in the payload (state + dates + clause id are non-PII) — no action expected; keep the event/audit payloads PII-free if you add any (you should not need to).

### Project Structure Notes

- New files: `packages/domain/src/member/{read.ts add fn | lock-in-read.ts}`, `packages/contracts/src/members/lock-in.ts`, `apps/api/src/modules/member-home/{routes,handlers,index}.ts`, `apps/mobile/components/lock-in/{LockInClockWidget,useLockInClockQuery}.tsx/.ts`, `apps/mobile/lib/niyamavali-link.ts` (optional helper).
- Edited files: `packages/domain/src/member/index.ts` (export), `packages/contracts/src/members/index.ts` (barrel), `packages/api-client/src/index.ts` (SDK method), `apps/api/src/server.ts` (register module), `apps/mobile/app/(tabs)/index.tsx` (mount widget), `packages/i18n/locales/{en,hi}/common.json` (keys), `apps/mobile/eas.json` (env, if other EXPO_PUBLIC vars live there).
- **Module-naming variance (intentional):** new `modules/member-home/` rather than the architecture's generic `modules/member/` or `modules/payment/`. Rationale mirrors 3.6b's explicit choice to keep a self-contained module and avoid premature coupling with the Epic-8 surface shape (`vyawastha-shulk/index.ts` header). If a `modules/member/` already exists by dev time, prefer adding the route there instead of a new folder — check first.
- **No turbo cycle risk:** the read is `@twt/domain`-internal (reads `events_log` directly); domain still must NOT import `@twt/events` (see `member/project.ts` / `read.ts` headers). The contract mirrors the state enum rather than importing it.

### Open decisions for the dev (recommendation in brackets)

1. **Response shape:** flat `{ state, lockIn: {...}|null }` vs a discriminated union on `state`. [Recommend the nullable-`lockIn` object — simplest for the client `if (data.lockIn)` guard.]
2. **`daysRemaining` rounding:** `ceil` vs `floor` of the remaining interval. [Recommend `ceil`, clamped to ≥0 — "3 days remaining" should not drop to "2" mid-final-day; aligns with calm/honest-time framing. Document the choice.]
3. **Deep-link origin:** client-composed from `EXPO_PUBLIC_PUBLIC_SITE_ORIGIN` vs server-returned full URL. [Recommend client-composed from the env + server-returned `clauseId` — keeps URL grammar a frontend concern per deep-links README, and avoids adding a public-origin to API config.]
4. **`accessibilityLiveRegion` politeness:** [Recommend "polite" — calm ambient status, never "assertive" (which is for errors, per `payment.tsx`).]

### References

- Epic + ACs: `_bmad-output/planning-artifacts/epics.md` §"Story 3.7" (lines 1739-1755); Epic 3 framing (lines 1575-1593); FR-3 listed (line 1577).
- Lock-in event semantics + payload: `packages/domain/src/member/events.ts` (lines 94-96 clock-key note; 138-154 `LockInEnteredPayloadSchema`; 160-199 vocabulary/map).
- Policy clause + snapshot write: `packages/domain/src/member/lock-in.ts` (`LOCK_IN_POLICY_CLAUSE_ID` :26; `resolveLockInPolicy` :58; `setLockInDaysAtJoin` :77).
- State read precedent: `packages/domain/src/member/read.ts` (`getMemberStateAt` :60; events_log-direct rationale, header).
- Lifecycle states: `packages/domain/src/schema/members.ts` (`MEMBER_LIFECYCLE_STATES` :59; `lock-in` :63).
- Production emitter (3.6b): `apps/api/src/modules/vyawastha-shulk/handlers.ts` (confirm path :110; status read :379; leap-safe date :138; `LOCK_IN_OR_PAST` :44).
- Module template: `apps/api/src/modules/vyawastha-shulk/{routes.ts,index.ts}`; session gate `apps/api/src/modules/auth/shared/member-session-guard.ts`; registration site `apps/api/src/server.ts` (:24-28).
- Contract template + enum-mirror discipline: `packages/contracts/src/payments/vyawastha-shulk.ts` (`LockInGateStep` mirror); members barrel `packages/contracts/src/members/index.ts`.
- api-client SDK pattern: `packages/api-client/src/index.ts` (header + `MemberAuthClientOptions`).
- Mobile patterns: `apps/mobile/app/(signup)/payment.tsx` (auth-fetch + a11y + lock-in entry route, esp. :3,:108-110,:128-132); `apps/mobile/components/yogdaan-bahi/useYogdaanQuery.ts`; home tab `apps/mobile/app/(tabs)/index.tsx`; root layout / locale / fonts `apps/mobile/app/_layout.tsx`.
- i18n: catalog `packages/i18n/src/catalog.ts` (namespaces; `common`); numeral discipline `packages/i18n/src/number.ts` (:3-15); keys `packages/i18n/locales/{en,hi}/common.json`.
- Deep-link target: `apps/public/src/pages/niyamavali.astro` (:29 `lang`, :43 `clause`); origin `apps/public/astro.config.mjs:21` (`PUBLIC_SITE_ORIGIN`).
- Tone/UX: `_bmad-output/planning-artifacts/ux-design-specification.md` (lines 299, 313, 389, 973, 977-979, 955 status-as-ambient-context).
- Testing reality + CI: mobile scripts `apps/mobile/package.json`; `pnpm ci:local` merge gate; friction-budget scope `friction-budget.yaml`.

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (BMad dev-story workflow).

### Debug Log References

- Domain unit test (DB-free): `pnpm --filter @twt/domain test tests/member/lock-in-clock.test.ts` → 5 passed.
- API integration (live DB :5433): `DATABASE_URL=… pnpm --filter @twt/api test tests/integration/member-home/lock-in-status.spec.ts` → 3 passed.
- Per-package typecheck green: `@twt/contracts`, `@twt/api`, `@twt/api-client`, `@twt/mobile`.
- i18n parity gate: `pnpm --filter @twt/i18n i18n:check-parity` → passed (every member-facing en key has Hindi parity).
- Mobile verification (build/test are repo no-ops): `@twt/mobile` typecheck + lint → clean.
- Merge gate: `DATABASE_URL=… pnpm ci:local` — **all 16 static jobs green** (lint, typecheck, build,
  unit test, db-check, contracts-determinism, crypto-check, tokens-theme, i18n-parity, pii-scrape,
  friction-budget, schema-diff, benefit-mechanism, microcopy, domain-invariants, member-state-invariant,
  kyc-provider-boundary). Full `@twt/api` suite green standalone: **263 tests / 30 files**, incl.
  `login-wall.spec.ts` (new route is session-guard compliant) + `member-home/lock-in-status.spec.ts`.
- **Pre-existing live-DB failures (NOT this story — investigated + root-caused, recorded openly):** under
  the global `DATABASE_URL`, two integration specs in code this story never touches failed in the parallel
  `turbo` run. Both root causes are independent of Story 3.7:
  - `@twt/domain tests/integration/terms-and-conditions/tc-registry.spec.ts` (2) — **stale test vs.
    implementation**, NOT accumulated state. Story 2.6 wrote `getEffectiveTc` with no status filter;
    Story 3.6a added `legalReviewStatus = 'approved'` (read.ts:52) for the member T&C-acceptance surface
    (members must never be served un-reviewed terms — confirmed by both consumers: public `/terms` +
    member-terms handlers) but did not update these two 2.6 tests, which seed a `pending` genesis and
    assert it is returned effective → impl returns approved-only → "expected undefined to be <uuid>".
    **FIXED in this session** (at the user's request, during review): the two tests now `approveTcVersion`
    before asserting effective, and assert `null` while pending — all 8 tc-registry tests green. An
    opportunistic Epic-2.6 test-fix, NOT part of Story 3.7's ACs.
  - `@twt/jobs tests/audit/integrity-check.test.ts` (1, chunk-boundary) — **5000ms vitest timeout under
    concurrent turbo DB load** (`5004ms`; its sibling tests passed at 740/474/2997ms). Passes in ISOLATION:
    all 11 green, the chunk-boundary case in 1142ms. A resource-contention flake, not a correctness defect.
    **FIXED in this session** (at the user's request): a suite-level `{ timeout: 20000 }` on the
    `verifyAuditChain (live DB)` describe block — removes the flake without masking a real hang. An
    opportunistic apps/jobs chore, NOT part of Story 3.7's ACs.
  - This story's own surfaces (domain member read, the API route, the login-wall gate) are fully green; the
    full `@twt/api` suite is 263/30 green standalone. The two specs above are owned by their respective
    epics, not 3.7.

### Completion Notes List

- **What this is:** a thin full-stack READ seam over data that already exists on the event stream (the
  3.6b `member.lock_in_entered` marker) + the mobile widget. NO new write path, NO new event, NO
  schema/migration change (the schema-diff gate stays a no-op).
- **Server-authoritative clock:** `unlockDate` + `daysRemaining` are computed in the API handler from
  `deps.clock()`, leap-safe via `setDate` (mirrors the 3.6b P9 `validThrough` fix), not fixed-ms.
  `daysRemaining` uses `ceil` clamped to ≥0 (Open-decision #2: a final day should read "1 day", not
  drop to "0"). The widget DISPLAYS; it never re-derives policy and never ticks per-second.
- **Response shape:** chose the nullable-`lockIn` object (Open-decision #1) — `lockIn` is `null` for
  every non-`lock-in` state; the client guards with `if (data.lockIn)`. Reused the existing
  `MemberLifecycleStateWire` enum (kyc/signup.ts) — no third lifecycle enum (lockstep-drift avoided).
- **AC3 scope (documented so the reviewer does not read it as unmet):** the Epic-8 "My Pool" /
  `ActiveContributionCard` hand-off is forward-compat and NOT buildable now (Epic 8 does not exist).
  The IMPLEMENTABLE half of AC3 is realized: once the member leaves `lock-in` the widget self-suppresses
  (server returns `lockIn: null` → the widget renders `null`).
- **Numeral discipline (AC4):** the days-remaining counter + unlock date are operational figures →
  Latin numerals even in Hindi. The count is interpolated by `t()` (already Latin); the date is
  formatted with an explicit `-u-nu-latn` numbering override (and CLDR `hi` defaults to Latin anyway).
  `toHindiNumeral` is NOT called.
- **Accessibility (AC4):** countdown announced `accessibilityLiveRegion="polite"` (calm ambient status,
  never `assertive`); the deep-link tap-target is `height={44}` with `accessibilityRole="link"`, an
  action-naming `accessibilityLabel` (WCAG 2.5.3), and a hint; text carries `accessibilityRole="text"`;
  the live-region label expands "N days remaining…" rather than relying on the visual glyph.
- **Fail-soft home (Task 7):** the home tab wraps `<LockInClockWidget />` (topmost) + `<YogdaanBahi />`
  in a `YStack flex={1}`. A loading/error/absent status renders nothing — the existing home content is
  never error-walled.
- **CI gates:** the GET route is `requireMemberSession`-gated → login-wall gate compliant (NOT
  allowlisted). i18n parity satisfied. No PII in the payload (state + dates + clause id).
- **Deviation from the recommended unit-test framing:** Task 1's "replay fixture" unit test exercises a
  small pure `deriveLockInClock` seam (DB-free, mirrors `getMemberStateAt`→`replayMemberState`); the
  live `getLockInClock` DB query is covered end-to-end by the Task 3 API integration test. Naming note:
  the mobile package is `@twt/mobile` (the story said `twt-mobile`).

### File List

**New:**
- `packages/domain/tests/member/lock-in-clock.test.ts`
- `packages/contracts/src/members/lock-in.ts`
- `apps/api/src/modules/member-home/handlers.ts`
- `apps/api/src/modules/member-home/routes.ts`
- `apps/api/src/modules/member-home/index.ts`
- `apps/api/tests/integration/member-home/lock-in-status.spec.ts`
- `apps/mobile/lib/niyamavali-link.ts`
- `apps/mobile/components/lock-in/useLockInClockQuery.ts`
- `apps/mobile/components/lock-in/LockInClockWidget.tsx`

**Modified:**
- `packages/domain/src/member/read.ts` (added `LockInClock`, `deriveLockInClock`, `getLockInClock`)
- `packages/contracts/src/members/index.ts` (barrel-export lock-in)
- `packages/api-client/src/index.ts` (`memberLockInStatus` SDK method)
- `apps/api/src/server.ts` (register `registerMemberHomeModule`)
- `apps/mobile/app/(tabs)/index.tsx` (mount widget as topmost home element)
- `packages/i18n/locales/en/common.json` (`lock_in.*` keys)
- `packages/i18n/locales/hi/common.json` (`lock_in.*` keys, Hindi-first)
- `packages/domain/tests/integration/terms-and-conditions/tc-registry.spec.ts` (opportunistic fix of a pre-existing **stale** Epic-2.6 test — outside 3.7's ACs; see Debug Log)
- `apps/jobs/tests/audit/integrity-check.test.ts` (opportunistic fix of a pre-existing live-DB **timeout flake** — suite-level 20s timeout; outside 3.7's ACs; see Debug Log)

## Change Log

| Date       | Change                                                                                  |
| ---------- | --------------------------------------------------------------------------------------- |
| 2026-06-29 | Implemented Story 3.7 — lock-in clock home widget read seam (domain accessor → contract → API route → api-client → mobile widget + home mount + bilingual i18n + a11y). |
