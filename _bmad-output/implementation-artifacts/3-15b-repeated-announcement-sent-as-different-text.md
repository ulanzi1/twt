---
baseline_commit: d686c419
---

<!--
PINNED: `d686c419` = this branch's row-added record REBASED onto `origin/main` `3e3b888e` at dev start (2026-11-23; was `034c3aa5` on top of `78393b18`); originally on top of `78393b18` (the Story 3.15a branch tip, pushed; it lands on `main` by
fast-forward, so its SHAs do not change). Authored in its OWN worktree
`/Users/dev/Developer/projects/TWT/.claude/worktrees/3-15b-repeated-announcement-sent-as-different-text`, branch
`story/3-15b-repeated-announcement-sent-as-different-text` (upstream UNSET — first push with an explicit refspec,
[[project_story_branch_upstream_is_main]]). 3.15a LANDED on `main` by fast-forward (`3e3b888e`, one records commit past `78393b18`
— `git diff 78393b18 origin/main` touches only the 3.15a story file and `sprint-status.yaml`, ⛔ `apps/`). So Task 0.1 REBASES this branch
onto `origin/main` (expect a `sprint-status.yaml` ledger conflict — [[project_rebase_ledger_conflict_separator]]) and then RE-PINS
`baseline_commit` to the rebased SHA of the row record: the rebase rewrites `034c3aa5`, which would leave the pin a non-ancestor of HEAD
([[feedback_story_validate_footguns]] #11). Every `apps/` claim below was traced at `78393b18` (and re-checked there at validate,
2026-11-23) by function; RE-LOCATE BY FUNCTION, ⛔ by line number ([[feedback_story_validate_footguns]] #24).

§0 GATE (the routing template's, applied FIRST): ⛔ Panel question. Everything here is HOW the app's existing announcements reach a screen
reader — the AUTHOR's. Nothing changes who is credited, told, paid, or what is stored. The choices are made below as DL1–DL8, each with
its reason and an honest cost; BigDev may overrule any of them at validate or review. BigDev's choice of scope — *"option 3, create it as
story 3.15b"* (one shared helper + a lint fence + a device sweep, with a speech-ON listen first) — is the input, quoted, ⛔ reinterpreted.
-->

# Story 3.15b: A Repeated Announcement Is Spoken Again on Android — One Shared Helper, a Lint Fence, and a Device Sweep

Status: done

## Story

As a member who uses a screen reader on Android,
I want a message the app says again — the same error after a second press, a second "code sent" — to be read to me again,
so that I know my second action was answered.

## 📜 Policy meaning (AI-10-1)

**This story introduces ⛔ predicate that gates a member's access to a benefit, and changes none.** It changes only the TEXT the app hands to
the screen reader when the same announcement is sent a second time on Android (invisible trailing characters); what is shown, accepted,
refused, stored or credited is unchanged. ⛔ Niyamavali check needed — no predicate.

## The rulings and records this story builds on

- **V4** — `deferred-work.md`, "Deferred from: device pass of story 3-15a" (2026-11-23): the app sent one `TYPE_ANNOUNCEMENT` per press
  (attested with TalkBack OFF by `uiautomator events`), but with TalkBack ON only the FIRST of identical texts was spoken; a DIFFERENT
  text right after was spoken. Owner line: *"OWNER: Story 3.15b"* (2026-11-23, `034c3aa5`).
- **3.15a review P1** (`3-15a-assisted-step-error-spoken-once-and-focus-kept.md` v1.4, code `8b5f4c01`): the remedy — each announcement
  of the same line after its first carries one more trailing U+00A0 (built with `String.fromCharCode(0xa0)`, counted per line in a ref).
  On the emulator (TalkBack ON, TTS-off capture) every repeat was then passed to speech (format ×4 with 0/1/2/3 NBSP; 422 ×3). The dated
  V4 line: *"the cause recorded above … is now supported: the same words with different text were spoken. Still open: whether the
  no-break spaces are silent with speech ON (⛔ heard)"*.
- **BigDev, 2026-11-23:** *"option 3, create it as story 3.15b"* — option 3 as proposed: a shared helper routed through every direct
  call, a source fence, and an emulator sweep of each repeatable case, each recorded fixed / not reached / not reproduced; FIRST a
  speech-ON listen (*"if it turns out to be audible, the remedy changes … and it's better to know before spreading it to 30 call sites"*).
- `epics.md` Story 3.15b block — AC (1)–(5) in brief; the source of the ACs below (AC (5) is CORRECTED by F9 / DL7 — recorded, ⛔ silently).
- Memory [[project_talkback_drops_identical_announcement]], [[project_android_live_region_reread_on_rerender]],
  [[project_mobile_android_emulator_setup]] (incl. the 2026-11-23 additions: `adb input tap` is a press with TalkBack ON; a real paste via
  `KEYCODE_PASTE`; Metro `-c`).

## Found facts (traced at `78393b18`)

- **F1 — the Android send.** RN 0.83.6 `ReactAndroid/…/modules/accessibilityinfo/AccessibilityInfoModule.kt` `announceForAccessibility`:
  builds a bare `AccessibilityEvent.TYPE_ANNOUNCEMENT` whose ONLY distinguishing content is `event.text.add(message)` (no source view).
  So the text is the only lever; two identical announcements are indistinguishable to TalkBack.
- **F2 — the direct call sites (32 calls, 19 files — the grep below at `78393b18`), by platform.** Android-capable (both platforms): `(signup)/whatsapp.tsx` (two, the
  `sentTitle` effect), `(signup)/kyc.tsx` `onManualSubmit`, `(signup)/assisted.tsx` (the error effect — already has its OWN 3.15a
  suffix), `(claim)/closed-helpline.tsx`, `(claim)/cannot-file.tsx`, `(claim)/refile-helpline.tsx`, `(settings)/notifications.tsx`,
  `(life-events)/known-people-find.tsx` (three), `(life-events)/nominees.tsx` (four of five), `components/announcement-channels/
  ChannelLinkError.tsx` `onFailed`, `components/panchayat/PanchayatNoticeboard.tsx` `onDismiss`, `components/peer-request/announce.tsx`
  `useAnnounceOnChange`, `components/notifications/WaCodeEntry.tsx` (two — the second is `announceForAccessibilityWithOptions(…,
  { queue: true })`), `components/memorial-authorship/useMemorialAnnounce.ts` (three; one is iOS-only when `hasLiveRegion`).
  iOS-only (guarded by `Platform.OS === 'ios'` or `announcementPlan(…).iosAnnounce`): `(claim)/nominee-review.tsx` (two),
  `(claim)/contact.tsx`, `(claim)/certificate-replacement.tsx` (two), `(memorial)/family.tsx`, `(life-events)/nominees.tsx` `[locked]`
  effect, `components/peer-request/announce.tsx` `announceLine` (inside `AnnouncedText`), `(settings)/language.tsx` (both platforms, but
  on Android only when the line is ALREADY showing — its first failure is a live region).
  Re-derive with `grep -rn "announceForAccessibility" apps/mobile/app apps/mobile/components apps/mobile/lib`.
- **F3 — which can send the SAME text back-to-back on Android** (the inventory; each is a sweep candidate, AC 6):
  (a) `kyc.tsx` `kyc.manual_name_english` — Submit twice with a non-English name (easy: signup KYC → `kyc.manual_cta`);
  (b) `whatsapp.tsx` `waSignup.sent_title` — the 2 s grace fires, then the return from WhatsApp sends it again (`sentSpoken`
  `'grace'` → `'return'`); reachability needs a working `requestWaOptIn` and `openURL` (unknown);
  (c) `known-people-find.tsx` `retrySlots` failure `error.load` — Retry fails twice (needs contacts permission + matches, then the API
  stopped; moderate);
  (d) `nominees.tsx` — `form.marked_no_name` (mark two no-name members in turn), `marks.title` (enter marks mode, back, enter again),
  `form.removed` / `form.kept` (twice) (needs a member with nominee links; moderate);
  (e) `ChannelLinkError` `announcementChannels.link_error` — a failing join tapped twice (needs channel URLs configured and the browser
  disabled — `pm disable-user` Chrome; hard-ish);
  (f) `WaCodeEntry` `waCode.sent` (Send, then "Send another code", both `delivery: 'sent'`) and `waCode.resend_wait` (a second refused
  press after the countdown) — `WaCodeEntry` is mounted only by `OtherPhoneCodeHint` when `codeAvailable || liveCode` (Pariwar WhatsApp
  config + secrets + Meta's Graph API) — likely NOT REACHABLE locally (3.15a found the same);
  (g) `PanchayatNoticeboard` `NOTICEBOARD_ROW_DISMISSED_A11Y_KEY` — only if the dismiss write fails and the member dismisses again (needs
  a live banner; how to seed one unknown);
  (h) `useMemorialAnnounce` over-limit lines (`write.over_limit` with the same count after delete-then-retype) and screen titles on
  re-focus (needs a memorial-eligible member; unknown);
  (i) `useAnnounceOnChange` — only on X → null → X (e.g. `waSignup.popup_title` open / close / open) or a remount;
  (j) `language.tsx` `language.error_not_recorded` — the same language failing ≥ 2 times while its line shows (API down; easy);
  (k) `assisted.tsx` — the 3.15a behaviour, re-shown after the migration (easy).
  NOT back-to-back (a different announcement always between): `notifications.tsx`; `known-people-find` `:127`; `nominees.tsx` `marks.saved`.
  Repeat only on a REMOUNT (hard to reach): `closed-helpline`, `cannot-file`, `refile-helpline`.
- **F4 — `AnnouncedText` on Android never calls the API.** `announcementPlan` returns `iosAnnounce: platform === 'ios'`; Android gets a
  live region. So the helper does ⛔ reach the 50 `AnnouncedText` lines on Android — their repeat behaviour is the live region's (F9).
- **F5 — the test harness has NO shared setup.** `apps/mobile/vitest.config.ts`: `include: ['tests/unit/**/*.test.ts']`, `environment:
  'node'`, ⛔ `setupFiles`. Every render test mocks `react-native` per file (`AccessibilityInfo: { announceForAccessibility: mock.announce }`
  from `vi.hoisted`) and resets the MOCK in `beforeEach` — ⛔ module state. vitest isolates modules per FILE, ⛔ per test: a module-level
  counter in a helper survives from one test to the next in the same file. The inventory found this breaks, without a per-test reset:
  `announcement-channels-render` (exact `[['announcementChannels.link_error']]` after an earlier test fired it), `known-people-find-render`
  (`find.checking` / `find.matches_count` in nearly every test), `wa-notifications-screen-render` (a loop sending the same text twice),
  `language-screen-render` (the android leg then the ios leg), `assisted-step-render` (exact suffix sequences), `wa-signup-step-render`
  (`sentSpoken()` `toBe(1)` in later tests).
  ⚠ **`wa-notifications-screen-render`'s `react-native` mock has NO `Platform` key** (it never needed one: `notifications.tsx` does not
  read it). Once `notifications.tsx` calls `announce()`, the helper reads `Platform.OS` from that mock, and vitest throws on access to an
  export a `vi.mock` factory did not return — the WHOLE file goes red. Its mock gets `Platform: { get OS() { return mock.os } }` with
  `mock.os = 'android'` (the loop leg keeps its Android meaning; Task 6.0). Every other render test that mocks `react-native` and
  asserts on `announceForAccessibility` already has a `Platform` key; 8 of them switch it per leg through a getter (`mock.os` /
  `mock.platform`) — so the helper must read `Platform.OS` on EACH call (DL3).
- **F6 — tests that count IDENTICAL repeats and will change meaning under the helper** (re-locate by leg name; each leg's platform
  read from the file's `Platform` mock and its `beforeEach` / `describe.each` / `it.each`):
  **Android rows (change):** `wa-signup-step-render` the grace-then-return leg (`sentSpoken()` exact filter `toBe(2)`) — it sits inside
  `describe.each(['ios', 'android'])` (AC8), so ONLY its `android` row changes; `wa-code-entry-render` the two-sends leg
  (`it.each(['ios', 'android'])`, exact `waCode.sent` filter `toHaveLength(2)`) — `android` row only — and the two-waits leg (`spoken()`
  2; check its platform the same way). Also `wa-signup-step-render`'s exact `waSignup.title` / `waSignup.popup_title` legs
  (`useAnnounceOnChange`, inside the same `describe.each`) — they break only where ONE leg sends the same text twice on Android (popup
  open / close / open); check each.
  **iOS (unchanged under DL2):** `nominee-marks-mode-render` the two-no-name-marks leg (`toHaveBeenCalledWith('Marked as a member')` after
  `mockClear`) — the file pins `Platform: { OS: 'ios' }`, so it is ⛔ an Android leg and a "the repeat differs" assertion there would be
  RED; `memorial-screens-render` the blur-then-focus leg (`arrivals()` `[write.title, write.title]` — the file's `beforeEach` sets
  `mock.os = 'ios'`); `memorial-screens-render` `family.tsx` row-incomplete (`first + 2`), the iOS preview refusal (2);
  `known-people-screen-render` (two `toHaveLength(2)`); the `ios` rows of the two `.each` legs above (exact counts kept).
  **Gap:** no Android-row unit leg sends a nominees-screen repeat (`form.marked_no_name` twice) — Task 6.2 adds one to
  `nominee-marks-mode-render` (a leg that sets `Platform.OS = 'android'` — make the mock's `OS` a getter for it) so the routed
  `nominees.tsx` call is shown sending a DIFFERENT second text; the device side stays sweep case F3 (d).
- **F7 — source pins that quote the bare call** (they break when the call is routed through the helper): `closed-copy-resolves`
  (`'announceForAccessibility(body)'` and `'announceForAccessibility'`), `cannot-file-copy-resolves`, `refile-copy-resolves`,
  `claim-contact` (`'AccessibilityInfo.announceForAccessibility'`), `nominee-review-announcements` (four pins incl. the iOS gate and
  `[showBeingChecked]`), `nominee-history-copy` (regex `if (locked && Platform.OS === 'ios') {\s*AccessibilityInfo.announceForAccessibility(`).
- **F8 — options pass-through.** `WaCodeEntry`'s wait line uses `announceForAccessibilityWithOptions(text, { queue: true })`;
  `wa-code-entry-render` asserts `call[1]` equals `{ queue: true }` (iOS). The helper must forward options unchanged.
- **F9 — the epics AC (5) premise is WRONG as stated.** *"an identical second wrong code"* cannot happen: `WA_OPT_IN_CODE_MAX_ATTEMPTS = 2`,
  so the first wrong guess shows `wrong_retry` and the next `wrong_final` (different words); a new code between sets `sent`. An identical
  STANDING error line IS possible for `verify_failed` (Confirm while a 5xx / timeout, and the status re-read says pending or fails) and
  `send_failed` (a released send failing again): `patch` writes the same `line`, the `AnnouncedText` text is unchanged, so the Android
  live region gets ⛔ content change and the member hears nothing new. That is a LIVE-REGION mechanism inside `AnnouncedText` — ⛔ a
  direct call, ⛔ reached by the helper (F4).
- **F10 — the fence's home.** `scripts/ci-local.sh` runs `pnpm turbo run lint`, which includes `apps/mobile` (`eslint.config.mjs`, a flat
  config re-exporting `@twt/eslint-config-twt`). ESLint carve-out globs are cwd-RELATIVE per package ([[project_eslint_config_per_package_cwd]]).
  Tests do not call `AccessibilityInfo.announceForAccessibility` as code (only inside string literals in F7's pins). ESLint is 9.39.4:
  its `no-restricted-properties` already reports a destructuring (`const { x } = AccessibilityInfo`, an `ObjectPattern` under a
  `VariableDeclarator` or `AssignmentExpression`) and a computed string-literal access (`AccessibilityInfo['x']`, via
  `getStaticPropertyName`). The shared config sets `no-restricted-imports` and `@typescript-eslint/no-restricted-imports` (cross-package
  import bans) and ⛔ `no-restricted-properties` / `no-restricted-syntax` — so adding the latter two in `apps/mobile` overrides nothing.
- **F11 — friction-budget AC-4.** `scripts/friction-budget/lib.ts` treats ALL of `apps/mobile/**` as member-facing — `lib/`, `tests/`,
  `eslint.config.mjs` and `vitest.config.ts` included, ⛔ only `app/` and `components/`. So any committed change in this story needs a
  `**Story 3.15b disposition (…)**` block in `friction-budget.md`, checked against COMMITTED history ([[project_friction_budget_baseline_ratchet]]).
- **F12 — a name already taken.** `(claim)/contact.tsx` declares its own local `function announce(text: string): void` (the iOS-only
  wrapper around the direct call), and calls it four times. Importing `announce` from `lib/announce.ts` into that file is a duplicate
  identifier (`tsc` error). Import it aliased (`import { announce as sendAnnouncement } from '../../lib/announce'`) and keep the local
  wrapper's name, its iOS guard and its four call sites unchanged (the `claim-contact` pin reads this function — F7).

## Build decisions (the author's — §0; BigDev may overrule at validate / review)

- **DL1 — the speech-ON listen is a GATE, ⛔ a formality.** Task 1 runs before any code: with TTS enabled and TalkBack ON, BigDev listens
  to a repeat carrying 1 and 3 trailing U+00A0 (the `assisted.tsx` format line, 3.15a's code). Heard as silence → proceed. Heard as a sound
  (a click, "space", a pause that cuts) → the remedy changes: try the candidates in DL1's order, each shown on the emulator with speech ON
  before adoption — (i) U+200B ZERO WIDTH SPACE, (ii) alternating between the plain text and one U+00A0 (fewer characters) — and record
  which and why. ⚠ If nobody can listen: STOP and ask BigDev whether to proceed un-attested (3.15a's AC 7 precedent was "Not now:
  un-attested"); ⛔ roll the helper out to 32 call sites on an inference from a TTS-off log.
- **DL2 — the helper changes ANDROID only; iOS gets the text unchanged.** The defect is TalkBack's (F1, V4); VoiceOver was never seen to
  drop a repeat and has no device pass in this repo; iOS tests that count identical repeats (F6) stay as they are. *Cost:* 3.15a shipped
  the suffix on BOTH platforms (its `ios` P1 legs assert distinct texts) — this story CHANGES that: `assisted.tsx` on iOS sends the copy
  unchanged on a repeat, and those two `ios` legs are inverted (recorded, ⛔ silently).
- **DL3 — the shape: a PURE module plus a thin sender.** `apps/mobile/lib/announce-repeat.ts` (pure, ⛔ imports `react-native`):
  `distinctAnnouncement(text: string, platform: string): string` — Android: the n-th send of the SAME text (n from 0) returns
  `text + U+00A0 × n` (a per-text counter in a module-level `Map`); any other platform: `text`. Plus `resetAnnouncementRepeats(): void`.
  `apps/mobile/lib/announce.ts`: `announce(text: string, options?: { queue?: boolean }): void` — calls
  `AccessibilityInfo.announceForAccessibilityWithOptions(distinct, options)` when `options` is given, else
  `AccessibilityInfo.announceForAccessibility(distinct)`; `distinct = distinctAnnouncement(text, Platform.OS)`, with `Platform.OS`
  read INSIDE `announce()` on every call — ⛔ captured in a module-level constant (8 render tests switch the mocked platform per leg
  through a getter — F5). NBSP built with
  `String.fromCharCode(0xa0)`, ⛔ typed ([[project_unicode_escapes_written_raw]]). *Why per-text, ⛔ "only if equal to the last":* whether
  TalkBack compares to the LAST announcement or to a longer history is ⛔ known; per-text is safe either way. *Cost:* a text's first send
  on a later screen may carry spaces from an earlier one — invisible and, after DL1, silent; the Map grows by one entry per distinct text
  (a few hundred strings at most in a session).
  ⚠ **Amended at code review (2026-11-23), recorded, ⛔ silently:** (P1) the Map's keys are the announced STRINGS, some holding another
  member's name, so `session-context.tsx` clears it at every session boundary (sign-in, sign-out, a refused refresh, a termination) —
  the "a few hundred strings" bound becomes one session's; (P5) "silent" is attested for 1 and 2 trailing spaces on one Hindi line, ⛔
  for three or more — the suffix is ⛔ capped (a cycle would re-open the last-vs-history question above); (P3) on the language screen
  the helper probably unmasks a double-speak (a live region plus the direct send, which used to be dropped as identical) — deferred-work
  X2, now Story 3.15c's.
- **DL4 — every direct call goes through `announce()`, the iOS-only ones included.** One rule, so the fence (DL5) has no exceptions but
  the helper itself. Platform guards at the call sites STAY (`if (Platform.OS === 'ios') announce(…)`) — the helper does not replace them.
  `assisted.tsx` loses its own `NBSP` / `announced` ref and calls `announce()` (its 3.15a tests keep their Android meaning — the per-text
  counter gives the same sequence within a test). *The one difference:* 3.15a's counter is per MOUNT and per error kind (`useRef({
  format: 0, not_found: 0 })`), the helper's per TEXT for the whole session — so a remount of the step inside ONE test (or, on a device, a
  return to the step) continues the count instead of restarting at the plain text. Invisible and silent (DL1); a test that remounts and
  expects the plain text again must expect the continued count. `contact.tsx` imports the helper aliased (F12).
- **DL5 — the fence is ESLint in `apps/mobile`: ONE rule.** `no-restricted-properties` with two entries — `{ object: 'AccessibilityInfo',
  property: 'announceForAccessibility' }` and `{ object: 'AccessibilityInfo', property: 'announceForAccessibilityWithOptions' }` —
  each message naming `lib/announce.ts`; a files-override turns it off for `lib/announce.ts` ONLY (cwd-relative glob, F10). That one rule
  also covers the destructured and the computed forms (F10) — ⛔ a `no-restricted-syntax` selector beside it. Shown RED by mutation: a
  bare member call, a destructured call (`const { announceForAccessibility } = AccessibilityInfo`), and the computed form
  `AccessibilityInfo['announceForAccessibility']` in a component each make `pnpm --filter @twt/mobile lint` fail; if any is NOT caught,
  record it (⛔ silently) and only then add a selector for it. *Blind spots, recorded in the config comment:* an aliased import
  (`import { AccessibilityInfo as A11y }`) and a namespace import (`RN.AccessibilityInfo.…`) are ⛔ caught — neither exists in `apps/mobile`
  at `78393b18`; AC 3's grep backs the fence up for the aliased form only by review. ⚠ ⛔ widen the fence with `no-restricted-imports` or
  `@typescript-eslint/no-restricted-imports` in `apps/mobile/eslint.config.mjs`: the shared config already sets both, and a later
  flat-config entry for the same rule REPLACES its options — it would silently drop the shared cross-package import bans.
  ⚠ **Superseded at code review (2026-11-23, P2), ⛔ reinterpreted:** the two entries now name the PROPERTY only — `{ property:
  'announceForAccessibility' }` and `{ property: 'announceForAccessibilityWithOptions' }` — because an entry with `object:
  'AccessibilityInfo'` missed an aliased import, a namespace import, a variable alias and a `require(…)` chain (the "blind spots" above,
  and two more). Over `app components lib tests` the only reports are the two calls in the carve-out file; each of those forms is shown
  RED, and the carve-out file clean. What is left: a computed key built at run time.
- **DL6 — the per-test reset lives in a NEW vitest setup file.** `apps/mobile/tests/unit/setup-announce-repeat.ts`:
  `beforeEach(() => resetAnnouncementRepeats())`, importing ONLY `lib/announce-repeat.ts` (a `react-native` import there would load the
  real module before each file's `vi.mock`). Wired as `setupFiles` in `vitest.config.ts`. Shown by a RED-first leg (Task 3.3).
- **DL7 — AC (5): checked and recorded, ⛔ fixed here — a NARROWING of the epics block, stated.** The epics AC (5) reads *"fixed here
  only if seen, else a dated deferred item with an owner"*. Two of its parts are narrowed, each for a reason: (i) **⛔ fixed here even if
  seen** — F9 corrects the premise: the identical standing line is `verify_failed` / `send_failed`, a live region INSIDE `AnnouncedText`,
  so the only fix changes `AnnouncedText`, which the same epics block bars (*"⛔ changing `AnnouncedText`'s live region (other screens rely
  on it)"*); `WaCodeEntry` is also likely ⛔ reachable (F3 (f)). (ii) **owner NONE YET** — BigDev did not name an owner at validate
  (2026-11-23, *"all"* to the findings that offered "name one, or NONE YET"), so the item is written with owner NONE YET and this narrowing
  of *"with an owner"* is recorded in the item itself. Record the analysis in `deferred-work.md` as a NEW dated item (owner: NONE YET;
  trigger: the next change to `WaCodeEntry` / `use-wa-code.ts`, or a setup that reaches it), with "un-attested — ⛔ reached" if the sweep
  cannot reach it. ⛔ write "not seen" for a leg that was not run ([[feedback_record_unattested_no_backfill]]).
- **DL8 — the sweep is time-boxed by REACH, ⛔ by hope.** Run the easy cases first (F3 (a), (j), (k), then (i), (c), (d)); for each
  case that cannot be reached in the pass, record NOT REACHED with the concrete gate (e.g. "`codeAvailable` needs Secret Manager"). A case
  is "fixed" only when the TTS-off log shows the repeat passed to speech WITH the suffix on THIS branch's bundle (the suffix in the log is
  also the proof the bundle is new — 3.15a's probe never reached the device once).

## Acceptance Criteria

1. **The listen first (DL1).** Before Task 2: with speech ON (TTS enabled, TalkBack ON), a repeat carrying trailing U+00A0 is heard by
   BigDev (or recorded audio, said which) as silent, or the remedy is changed per DL1 and the replacement heard silent. Not heard by anyone
   → STOP and ask (DL1); ⛔ inferred from the TTS-off log.
2. **The helper (DL2, DL3).** `lib/announce-repeat.ts` and `lib/announce.ts` exist as DL3 says. Unit-tested: on `'android'` the first
   send of a text is the text exactly, the 2nd and 3rd carry 1 and 2 trailing U+00A0; two different texts count separately; `'ios'` returns
   the text unchanged every time; `resetAnnouncementRepeats()` returns the next send to the plain text; `announce(text)` calls
   `announceForAccessibility` and `announce(text, { queue: true })` calls `announceForAccessibilityWithOptions(text, { queue: true })`
   (options forwarded unchanged — F8). ⛔ raw U+00A0 / zero-width characters in any added line.
3. **Every direct call routed (DL4).** The CODE-ONLY grep
   `grep -rn "AccessibilityInfo.announceForAccessibility" apps/mobile/app apps/mobile/components apps/mobile/lib | grep -vE '^[^:]+:[0-9]+:\s*(//|/?\*)'`
   finds ONLY `lib/announce.ts` (at `78393b18` it returns the 32 calls of F2). The same grep WITHOUT the filter also returns two COMMENT
   lines in `lib/death-certificate-announce.ts` (the header line and the `iosAnnounce` doc-comment) — expected, and that file stays
   ⛔ edited (it holds `announcementPlan`, below). Every call site in F2 calls `announce(…)` with the SAME text it sent before and the SAME
   platform guard (`contact.tsx` through its aliased import — F12); `assisted.tsx` has ⛔ own suffix logic left. `AnnouncedText`'s live region, `announcementPlan`, the copy keys
   (`packages/i18n`), the routes and the contracts: `git diff` shows ⛔ change to them (only `announce.tsx`'s two call lines change).
4. **The fence (DL5).** `pnpm --filter @twt/mobile lint` fails on each mutation in DL5 (recorded in the Debug Log, each restored
   byte-for-byte) and passes on the final tree; `ci:local`'s `lint` job runs it.
5. **The tests (DL6).** The setup file resets the helper before every test (a RED-first leg shows a second test in the same file seeing
   the plain text). F7's source pins are updated to pin the SAME thing through `announce(` (the iOS gate, the deps, the text) — ⛔ a pin
   weakened to "contains announce". F6's Android rows count by the words (trailing U+00A0 stripped) and ALSO assert the repeat's text
   differs from the first; F6's iOS legs and the `ios` rows of its `.each` legs are ⛔ changed (DL2); the new Android nominees leg (F6
   Gap) shows the second `form.marked_no_name` sent as different text; `wa-notifications-screen-render`'s mock carries `Platform`
   (F5); 3.15a's two `ios` P1 legs in `assisted-step-render` are inverted (DL2). Whole `@twt/mobile` suite, `tsc`, `eslint` green.
6. **The sweep (DL8)** on the Android emulator (Story 3.15 / 3.15a recipe; TalkBack ON, TTS OFF; `adb input tap` = a press): every case in
   F3 (a)–(k) recorded as one of — **fixed** (the repeat logged as speech WITH its suffix, timestamps), **not reached** (the gate that
   stopped it), **not reproduced** (reached, and the repeat cannot be produced) — ⛔ "not seen" for a leg not run. At minimum (a), (j), (k)
   are reached (they are easy); a red there is a defect of THIS story.
7. **AC (5) of the epics block, corrected (DL7).** `deferred-work.md` gets the F9 analysis as a new dated item with an owner line
   (NONE YET — BigDev named none at validate), its reach status, and one sentence stating both narrowings of the epics wording and why
   (⛔ fixed even if seen: the fix is inside `AnnouncedText`; ⛔ owner yet).
8. **Records.** `deferred-work.md`: a dated line under V4 — *"addressed by Story 3.15b"* for each call site the sweep FIXED, with the
   evidence; "routed, ⛔ device-shown" for the rest (closure language: [[feedback_closure_language_precision]]); V4 CLOSED only if every
   Android-capable repeatable case is fixed or not reproduced — otherwise it stays open with what remains. `friction-budget.md`:
   `**Story 3.15b disposition (…)**` (⛔ new row, ⛔ row retired, ⛔ row amended — taps unchanged; a screen-reader member now hears a
   repeated answer on Android). The emulator restored (TalkBack off, TTS on, font 1.0); ⛔ seed spec, env copy or throwaway container
   committed or left running.

## Tasks / Subtasks

- [x] **Task 0 — Preflight**
  - [x] 0.1 `git fetch origin`; rebase this branch onto `origin/main` FIRST (3.15a landed at `3e3b888e`; ledger conflict —
        [[project_rebase_ledger_conflict_separator]]; verify the YAML parses). Then RE-PIN `baseline_commit` (front matter + the PINNED
        comment) to the rebased SHA of the row record (`records(3.15b): row added …`) and check `git merge-base --is-ancestor <pin> HEAD`.
        `pnpm install`; `ListAgents`; `git status` clean on `story/3-15b-…`.
  - [x] 0.2 Re-derive F1, F2 (the grep), F5, F7, F8 at HEAD by function. If the call-site count differs from 32 (19 files), the grep wins — list the
        difference in the Debug Log.
- [x] **Task 1 — The listen (AC 1; DL1) — BEFORE any code**
  - [x] 1.1 A debug build of THIS branch (unchanged code = 3.15a's `assisted.tsx`) on the emulator; TTS ENABLED; TalkBack ON; signup to
        the assisted step; 5 digits; Continue ×3 (the 2nd and 3rd carry 1 and 2 U+00A0). Ask BigDev to listen; record their words.
  - [x] 1.2 Silent → proceed. Audible → DL1's candidates, each heard before adoption; record which. Nobody listens → STOP and ask BigDev.
- [x] **Task 2 — The helper (AC 2; DL2, DL3) — RED first**
  - [x] 2.1 `tests/unit/announce-repeat.test.ts` (pure) and `tests/unit/announce.test.ts` (mocks `react-native`, both methods): every AC 2
        leg; watch them fail (no module) then write `lib/announce-repeat.ts` and `lib/announce.ts`.
  - [x] 2.2 Header comments: why (V4, F1), the per-text rule and its cost (DL3), Android-only (DL2), and that a unit test shows only what
        is SENT ([[project_talkback_drops_identical_announcement]]).
- [x] **Task 3 — The harness reset (AC 5; DL6)**
  - [x] 3.1 `tests/unit/setup-announce-repeat.ts` + `setupFiles` in `apps/mobile/vitest.config.ts`.
  - [x] 3.2 Comment in `vitest.config.ts`: why the reset (F5), and that the setup file must ⛔ import `react-native`.
  - [x] 3.3 RED-first: in `announce.test.ts`, two tests each sending the same text on `'android'` and expecting the PLAIN text first —
        the second fails without the setup file, passes with it.
- [x] **Task 4 — Route every call (AC 3; DL4)**
  - [x] 4.1 Replace each direct call in F2 with `announce(…)` (keep text, guard, deps, `queue` options); `useAnnounceOnChange` and
        `announceLine` in `announce.tsx` included; remove `assisted.tsx`'s `NBSP` constant and `announced` ref (and update its header
        comment's P1 sentence to point at the helper). `contact.tsx`: aliased import, local `announce` wrapper kept (F12).
  - [x] 4.2 The code-only grep in AC 3 returns only `lib/announce.ts`. `git diff` on `lib/death-certificate-announce.ts`
        (`announcementPlan`), `AnnouncedText`'s JSX, `packages/i18n`: empty.
- [x] **Task 5 — The fence (AC 4; DL5)**
  - [x] 5.1 The one rule + the carve-out in `apps/mobile/eslint.config.mjs`, with a comment (V4, DL5, the carve-out's one file, the two
        blind spots).
  - [x] 5.2 Mutations (each restored byte-for-byte, `diff` against a saved copy): a bare member call, a destructured call, a computed call
        — each `pnpm --filter @twt/mobile lint` RED; the carve-out file itself green. Record each in the Debug Log.
- [x] **Task 6 — Tests updated (AC 5)**
  - [x] 6.0 `wa-notifications-screen-render`: add `Platform: { get OS() { return mock.os } }` to its `react-native` mock (`mock.os =
        'android'`, reset in `beforeEach`) — WITHOUT it the whole file throws once `notifications.tsx` is routed (F5). Do this in the same
        commit as Task 4.
  - [x] 6.1 F7's source pins: pin the same guard / text / deps through `announce(`; ⛔ weaken.
  - [x] 6.2 F6's Android rows: count by the words; add "the repeat differs from the first". F6's iOS legs and the `ios` rows of its
        `.each` legs: ⛔ change (DL2). F6 Gap: the new Android leg in `nominee-marks-mode-render` (two no-name marks ⇒ the second
        `form.marked_no_name` differs from the first) — RED with mutation 6.4 (i).
  - [x] 6.3 `assisted-step-render`: the two `ios` P1 legs inverted (identical on iOS — DL2), Android legs unchanged; its local `NBSP` /
        `bare` / `sent` helpers stay valid.
  - [x] 6.4 Mutation checks, restored each: (i) helper returns `text` on Android → the AC 2 repeat legs and F6's "differs" legs RED;
        (ii) suffix on iOS too → the F6 iOS legs RED; (iii) drop the setup file → Task 3.3's leg RED; (iv) `announce` drops `options` →
        the `{ queue: true }` legs RED. Record each.
  - [x] 6.5 `pnpm --filter @twt/mobile test` (whole suite), `tsc`, `eslint` green; added lines scanned for invisible characters.
- [x] **Task 7 — The device sweep (AC 6, 7; DL7, DL8)** — recipe in [[project_mobile_android_emulator_setup]]
  - [x] 7.1 Throwaway `postgres:16-alpine`, migrated; seed through an env-guarded UNCOMMITTED spec (an approved T&C, a field worker
        code; more only as a case needs it — e.g. a `pariwar_wa_config` row for (b) / (i), channel URLs for (e)). Copy main's git-ignored
        `.env` files. A fresh prebuild + debug build of this branch; Metro with `-c`.
  - [x] 7.2 TalkBack ON, TTS disabled, `logcat` captured; F3 cases in DL8's order; for each: the sequence run, the log lines (with the
        trailing U+00A0 count), and fixed / not reached / not reproduced. `WaCodeEntry` (F3 (f)) and the F9 standing line: try to reach;
        record.
  - [x] 7.3 Restore the emulator (TalkBack off, TTS on, font 1.0); drop the container; delete the seed spec, env copies and
        `apps/mobile/android`; `git status` clean except this story's files.
- [x] **Task 8 — Records (AC 7, 8)**
  - [x] 8.1 `deferred-work.md`: dated lines under V4 (per AC 8) and the new F9 item (DL7).
  - [x] 8.2 `friction-budget.md`: the `**Story 3.15b disposition (…)**` block, after Story 3.15a's (F11). `pnpm friction:check` after the
        commit.
  - [x] 8.3 This story: Dev Agent Record, File List, Change Log; Status → `review`. `sprint-status.yaml`: row → `review`, a dated row
        comment, a prepended `# last_updated:` entry (read the head LIVE across branches for the next free letter —
        [[project_sprint_status_ledger]]; the safe prepend — [[project_sprint_status_safe_prepend]]; verify the YAML parses).
- [x] **Task 9 — Gates**
  - [x] 9.1 Commit on `story/3-15b-…` only ([[feedback_commit_on_story_branch]]); check the branch before every commit.
  - [x] 9.2 `ci:local` on a FRESH container (`DATABASE_URL=…?sslmode=disable` — [[project_prepush_hook_inherits_5432]]). The push is
        BigDev's word (3.15a precedent).

### Review Findings

Code review 2026-11-23 (`bmad-code-review 3.15b`), pinned range `d686c419..faea140c` (`apps/` identical at HEAD `78971e1f`, a 3.15c
records commit), full mode. All three layers returned findings (Blind Hunter, Edge Case Hunter, Acceptance Auditor); the reviewer
verified each claim against the code at `faea140c` and deduplicated. **0 decision-needed, 6 patch, 0 new defer, 15 dismissed.**
No Panel question: nothing here changes what a person is told, owed or asked to consent to (§0 holds); every item is an
implementation, lint or records-wording call, decided below by the reviewer — BigDev may overrule any of them. AC 1–8 are delivered
as written (the Auditor traced all 32 calls hunk by hunk; the code-only grep finds only `lib/announce.ts`; no raw U+00A0 or
zero-width character in any changed file); the patches below are what the layers found AROUND them.

**Disposition (2026-11-23):** BigDev selected option 1, "Apply every patch". P1–P6 applied (see Completion Notes, "Code review follow-up"). Story status stays `review` — `done` is reserved for a story landed on `main`
(the 3.15 round-2 precedent: all patches applied, row stays `review`).

- [x] [Review][Patch] **P1 — MEDIUM: the announce counter keeps other members' names for the whole app process; sign-out does not
  clear it.** [`apps/mobile/lib/announce-repeat.ts:22-30`, `apps/mobile/lib/session-context.tsx:117,135,152,174`] On Android
  `distinctAnnouncement` stores every announced string as a Map key and nothing but the vitest setup file ever clears it. Some keys
  hold another member's name: `nominees.tsx:154` announces `ltRef.current('form.marked', { name })`. `session-context.tsx` clears
  exactly this class at every session boundary — *"the nominee marks (other members' names)"* beside `clearNomineeLinksCache`, and
  *"the two IN-MEMORY 6.36c stores, which outlived a sign-out for the rest of the app process"* — so the new module store is the
  one that outlives it (it is never read back, so nothing is shown; it is the cleanup convention for a shared phone). iOS stores
  nothing (the `platform !== 'android'` return is before `sent.set`). Fix: call `resetAnnouncementRepeats()` beside each of the four
  `clearNomineeLinksCache(queryClient)` calls (the two session-end paths, `signIn`, `signOut`), say so in the `announce-repeat.ts`
  header (it also bounds the Map per session — DL3's "a few hundred strings" becomes true by construction), and add a unit leg: a
  text sent twice on `'android'`, a reset, then the plain text again. *(Blind #1 + Edge #1.)*
- [x] [Review][Patch] **P2 — LOW-MEDIUM: the fence has more blind spots than its comment admits.** [`apps/mobile/eslint.config.mjs`
  the `no-restricted-properties` block] Both entries carry `object: 'AccessibilityInfo'`, so an aliased import, a namespace import
  (the two the comment names), `const AI = AccessibilityInfo; AI.announceForAccessibility(…)` and
  `require('react-native').AccessibilityInfo.announceForAccessibility(…)` all pass lint (the Auditor probed three of them through
  `eslint --stdin`). **Verified read-only by the reviewer:** the same two entries WITHOUT `object`, run over `app components lib
  tests` with `--no-cache`, report exactly two errors — `lib/announce.ts:19` and `:21`, the carve-out — and nothing else, so
  dropping `object` costs no false positive today and closes every receiver form. Fix: drop `object` from both entries (the
  `lib/announce.ts` carve-out stays); rewrite the comment's blind-spot sentence (what is left: a computed key built at run time);
  show the aliased, namespace and variable-alias mutations RED and restore them byte-for-byte (Task 5.2 style); re-run `pnpm
  --filter @twt/mobile lint`. This overrides DL5's `{ object, property }` wording on the reviewer's call (lint coverage is
  engineering, not the Panel's). *(Edge #2 + Blind #3 + Auditor #7.)*
- [x] [Review][Patch] **P3 — MEDIUM (records): 3.15b's suffix plausibly UNMASKS a double-speak on the language screen, and the records
  call it "not 3.15b's" and the language case "ADDRESSED".** [`deferred-work.md` X2 and the V4 dated line; `friction-budget.md`
  "Cost, recorded"; DL3's cost] `language.tsx:98` sends `if (alreadyShowing || Platform.OS === 'ios') announce(text)` while the same
  line is an `assertive` live region (`:126`) whose words follow the chosen language. Before 3.15b the direct send was the plain
  text, identical to the live region's, and TalkBack drops an identical announcement (V4) — heard once. From the second direct send
  of a text in a session the helper makes it differ, so both can be spoken: the TTS-off log in X2 shows `plain` and `1×U+00A0` 3 ms
  apart. X2's heading says *"observed, ⛔ 3.15b's"* (⛔ = not) and DL3 / the friction "Cost" list name only the invisible suffix.
  Second, the sweep **alternated** हिन्दी / English (F3 (j) is the SAME language failing twice), so the log shows the suffix applied
  and the double-send — not an adjacent identical repeat cured; the V4 line lists `language.tsx` under *ADDRESSED*. Fix (records
  only): reword X2's heading and body to say the helper is the probable cause (an inference, un-attested with speech ON) and that
  the code half is Story 3.15c's X2 (`78971e1f` already owns it: *"spoken once on a language switch"*); add it to the friction
  "Cost" and DL3's cost; move `language.tsx` in the V4 line from *ADDRESSED* to *routed; suffix logged on a non-adjacent repeat;
  the same-language-twice case not run* — or run that case on the emulator (the same language failing twice) and keep ADDRESSED.
  *(Auditor #1 + #3; Blind #2 in part.)*
- [x] [Review][Patch] **P4 — LOW (records): V4's remainder has no owner or trigger, and its owner line still names this story.**
  [`deferred-work.md` V4, the 2026-11-23 *OWNER: Story 3.15b* line and the not-reached list] The V4 dated line leaves `known-people-find`,
  `nominees`, `ChannelLinkError`, `WaCodeEntry`, `PanchayatNoticeboard` and `useMemorialAnnounce` as *routed, ⛔ device-shown*; five of
  the six gates are "not seeded", an effort gate, not a structural one. AC 8 only requires "stays open with what remains", so this is
  not an AC miss — it is the same ownerless-residue shape the story's own DL7 narrowing was careful to state for X1. Fix: one dated
  line under V4 — *"Owner of the remainder: NONE YET (BigDev assigns). Trigger: the next change to any of those six files, or a setup
  that reaches them"* — plus the un-attested ≥3-suffix scope from P5. (The name is BigDev's to assign; NONE YET is the established
  form.) *(Auditor #2.)*
- [x] [Review][Patch] **P5 — LOW (records): three closure-language overstatements.** [`sprint-status.yaml` 2026-11-23p; `deferred-work.md`
  V4 dated line] (i) The ledger says *"the trailing U+00A0 are silent with speech ON"* — unscoped. The listen covered **1 and 2**
  trailing U+00A0 on **one** Hindi line (Google TTS), where AC 1 / DL1 said "1 and 3" (the Debug Log discloses the difference);
  the counter has no cap, so a text sent four or more times carries three or more, **never heard**. *Reviewer's call (Blind #1,
  Edge #1):* do ⛔ cap the suffix — a cycle would re-open the question DL3 deliberately closed (does TalkBack compare with the last
  announcement only, or a longer history?) — and record the scope instead: *silent with speech ON for 1 and 2; ≥3 un-attested*.
  (ii) The V4 line and the ledger say *"iOS unchanged"*; for `assisted.tsx` on iOS that is false against 3.15a (3.15a sent the suffix on
  both platforms; DL2 and Task 6.3 record the inversion, the V4 line does not). Say *"iOS gets the copy exactly (`assisted.tsx` on iOS
  loses 3.15a's suffix — DL2)"*. (iii) `assisted.tsx` sits under *ADDRESSED by Story 3.15b* though 3.15a's review P1 addressed it; 3.15b
  only moved it onto the helper — say *"re-shown through the helper (addressed by 3.15a P1)"*. *(Auditor #4, #5, #6; Blind #1.)*
- [x] [Review][Patch] **P6 — NIT: a blank line was dropped.** [`apps/mobile/app/(signup)/assisted.tsx:56-57`] Removing 3.15a's NBSP
  constant left `const SIX_DIGITS = /^\d{6}$/` and `type Stage = …` on adjacent lines (the baseline had a blank line between them).
  Restore it. *(Auditor #9, first nit.)*

**Dismissed (15), so BigDev can overrule:** *Blind* — #2 "blanket behaviour change speaks every redundant path twice" (a repeat being
spoken is the design, DL4 / F3 (h); the one real instance is P3); #3 second half "no test shows the fence fires / the carve-out turns
the whole rule off" (Task 5.2 mutations are recorded; the Auditor re-probed `lib/announce.ts` clean and the same content at another
path red; the shared config sets no `no-restricted-properties`, so nothing is replaced); #4 "iOS reverted on absence of evidence"
(DL2 decided it and recorded its cost; the wording is P5 (ii)); #5 "Android `AnnouncedText` repeats not covered" (F4 / F9 / DL7 — X1,
now Story 3.15c); #6 "`distinctAnnouncement` is not pure, a throw burns a count, the reset is public" (the header says *PURE: it does
not import `react-native`*; the setup file needs the export; a burnt count is invisible); #7 "empty text sends a lone NBSP" (the sites
read — `if (text)`, `if (!text) return`, `spokenKey === null` — guard it, and no call site was shown to pass `''`; not reachable as
found); #8 "source pins are substring matches" (the Auditor found them equal or stricter than before, and the fence is the real guard);
#9 "the reset pair is order-dependent" (it is RED when the setup file is dropped — mutation (iii) — and only vacuous when run alone with
`-t`); #10 "conditional assertions in the `.each` legs" (each platform row carries its own distinguishing assertion); #11 "two modules
named `announce`" (naming; `contact.tsx` is aliased on purpose, F12); #12 "Hindi NBSP not shown" (the listen WAS the Hindi assisted
line); #13 "smaller items" (unknown platforms plain by design; comment length; a test-side NBSP constant is deliberately independent).
*Auditor* — #8 "(b) is *not reproduced*, should be *not reached*" (AC 6 defines not reproduced as *reached, and the repeat cannot be
produced*, and the Debug Log states why: `openURL` left at once); #9 "the `epics.md` 3.15b block keeps the premise F9 corrects" (the
correction is recorded where AC 7 requires it — X1); #9 "`death-refusal-claim-screens.test.ts:4` mentions `announceForAccessibility`"
(a historical 6.38 comment about another file's old pin; nothing depends on it).

**Not constructible here, stated:** whether the language-screen double (P3) and a ≥3-suffix are heard with speech ON needs a device
and a listener — both are carried as un-attested in P3 / P5, ⛔ closed by this review.

### Review Findings — second round (adversarial review of the patches)

**2026-11-23, BigDev: *"run adversarial review on patches, then open pr"*.** The patch set above (then uncommitted, on top of
`78971e1f`) went through the three layers again: Blind Hunter 12, Edge Case Hunter 4, Acceptance Auditor 5 findings (plus three
informational notes). Verified against the code and deduplicated: **0 decision-needed, 6 patch (R1–R6), 0 new defer, 10 dismissed.**
No Panel question (the Auditor and the reviewer agree: in-memory cleanup, lint coverage and records wording).

- [x] [Review][Patch] **R1 — MEDIUM: `signOut` cleared the counter only at its START.** [`apps/mobile/lib/session-context.tsx` `signOut`]
  The reset sits beside the other stores, before `await memberAuth.logout()` and `await clearSession()`; the screens stay mounted
  until `setSession(null)`, so a line announced while the logout is in flight re-seeded the counter with the old account's strings. The
  new held-logout leg proves it: RED on the first code (*expected `Marked Sita Devi as a nominee`, received it plus one no-break space*),
  green after `signOut` clears AGAIN after its last await (`clearLinkTarget()`, before `setSession(null)`). `signIn`'s only await is
  `saveSession` and it follows a signed-out state, so it keeps its single clear. *(Edge #1; Blind #4 (b).)*
- [x] [Review][Patch] **R2 — LOW: the `announce-repeat.ts` header claimed more than the boundary reset can promise.** It said per-text
  is "safe either way" and also that a cap "would re-open the question"; yet a reset sets the next send of a text back to plain, so the
  SAME text being the last announcement before a boundary and the first after it (on a screen that survives it) could be dropped.
  The header now says per-text is safe within a session, names that across-boundary case as un-attested (sign-out leaves the screen, so
  other speech normally sits between), and says "NOT capped" in words. ⛔ built: remembering a hash of the last text across the reset
  (the Edge suggestion) — more machinery than a rare, un-attested case earns; it stays recorded here. *(Blind #1; Edge #2.)*
- [x] [Review][Patch] **R3 — LOW: the new test leaned on things it did not state.** `beforeEach` now resets the counter itself (it
  depended on the vitest setup file), clears `ctx.current` (a stale provider from an earlier leg could be driven), the rejected and
  terminated legs are no longer `async` without an `await`, and the `signIn` leg says it is a sign-in OVER a present session (the only
  way `signIn` is a boundary of its own). *(Blind #2, #12, #9 in part; Edge #4.)*
- [x] [Review][Patch] **R4 — LOW: comments in the patch read the wrong way round or lost their context.** "⛔ capped" and "⛔ the
  receiver" are now "NOT capped" and "not the receiver" in the source comments; each reset call in `session-context.tsx` carries its own
  one-line comment (it sat under the nominee-marks comment). *(Blind #8.)*
- [x] [Review][Patch] **R5 — MEDIUM (records): the first patch round left claims it said it had fixed.** The ledger line `2026-11-23p`
  still read "iOS unchanged" in both copies though the `2026-11-23r` entry said it was reworded, and still called `(j) language` FIXED
  (also the row comment, the Debug Log line and Completion Notes AC 6); the friction-budget item 2 still listed the language screen as
  friction removed in its first sentence, and its "written for changes committed at" line was silent about the amendment. All reworded;
  Change Log 1.2 is dated history and stays as written, the corrections are carried by 1.4 and 1.5. *(Auditor #1, #2, #3.)*
- [x] [Review][Patch] **R6 — LOW (records): finding labels and evidence.** P5's sources now read "Auditor #4, #5, #6; Blind #1" (it
  cited a dismissed Blind item) and P6's "Auditor #9, first nit"; the per-form probe results for P2 are recorded in the Debug Log below.
  *(Auditor #4, #5.)*

**Dismissed (10), so BigDev can overrule:** *Blind* — #3 "the test cannot tell the map emptied from counts zeroed" (the implementation
is `sent.clear()`, one line and unit-tested; the Map is private and exporting it only for this is more API than the property earns);
#4 (c) "a sync `act` around a handler that returns a promise" (both handlers return `void`); #5 "four hand-copied sites; a shared
helper" (out of scope — the four legs fence these four, and another boundary would be a new story); #6 "the suffix is unbounded"
(decided at P5 and recorded); #7 "the property-only rule widens the false-positive surface" (the Auditor probed 431 files: two reports,
both in the carve-out; an object-literal key in a mock is not reported; recorded in the config comment); #8 (a) "the P-labels are
unresolvable" (the repo's comments cite review rounds the same way); #9 "the test overstates what it executes" (its header says what
is real and what is mocked); #10 "the control leg is weaker than its title" (it shows the count continues; R3's local reset removes the
doubt about what else clears); #11 "the blank line is unexplained noise" (it is P6, deliberate). *Edge* — #3 "a test spy named
`mock.announceForAccessibility` is a false positive" (none exists; the message names `lib/announce.ts`, and the existing tests name
their spy `mock.announce`). *Auditor informational* — "0 new defer", "BigDev's option 1 is not checkable from the repo", "`ci:local`
not re-run": stated, not findings.

## Dev Notes

### Traps

1. **⛔ Change `AnnouncedText` or `announcementPlan`.** Fifty lines rely on the live region (F4); the helper is for DIRECT calls only.
2. **⛔ Import `react-native` in `lib/announce-repeat.ts` or the setup file** — the setup file runs before each test file's `vi.mock`.
3. **⛔ Type U+00A0.** Build it (`String.fromCharCode(0xa0)`); scan added lines (`LC_ALL=C grep -P '\xc2\xa0'`).
4. **⛔ Weaken a source pin.** F7's pins guard real decisions (iOS-only gates, deps); move them to `announce(`, keep what they pin.
5. **⛔ Count a sweep case "fixed" without the suffix in the log** — it may be an old bundle (3.15a's PROBE never reached the device).
6. **⛔ `uiautomator dump` during a speech capture** (it turns TalkBack off); `dumpsys` is fine. One `adb input tap` = one press with
   TalkBack ON; ⛔ parallel taps ("Inconsistent event").
7. **The suffix grows per text for the whole session** — a test that sends the same text in two `it`s needs the setup reset (DL6), not a
   local workaround.
8. **Friction-budget AC-4 fires only on committed history** (F11) — write the disposition before `ci:local`.
9. **Hand-format** (Prettier ⛔ enforced — [[project_prettier_not_enforced]]); every `git push` needs `DATABASE_URL=<your container>`.
10. **⛔ Add `no-restricted-imports` / `@typescript-eslint/no-restricted-imports` to `apps/mobile/eslint.config.mjs`** — a later entry
    REPLACES the shared config's options for that rule and drops its cross-package import bans (DL5, F10).
11. **⛔ A mock without `Platform`.** The helper reads `Platform.OS`; a `react-native` mock that lacks it throws on the first routed
    announcement (F5 — `wa-notifications-screen-render`).
12. **`contact.tsx` already has an `announce`** — alias the import (F12).

### What this story does ⛔ do

It does not change `AnnouncedText` or its live region, `announcementPlan`, any copy key, any route or contract, what is stored or
credited, VoiceOver's text on a repeat (DL2), or the F9 standing-line behaviour (DL7 — recorded, not fixed).

### Project Structure Notes

- New: `apps/mobile/lib/announce-repeat.ts`, `apps/mobile/lib/announce.ts`, `apps/mobile/tests/unit/announce-repeat.test.ts`,
  `apps/mobile/tests/unit/announce.test.ts`, `apps/mobile/tests/unit/setup-announce-repeat.ts`.
- Updated: the 19 files in F2; `apps/mobile/eslint.config.mjs`; `apps/mobile/vitest.config.ts`; the tests in F6 / F7 and
  `assisted-step-render.test.ts`; records `friction-budget.md`, `deferred-work.md`, this file, `sprint-status.yaml`.
- ⛔ New package (`lib/` in `apps/mobile` — [[feedback_no_premature_package]] — one app consumes it). ⛔ migration, contract, copy key,
  decision-log entry.

### Testing

Mobile vitest only: the whole `@twt/mobile` suite, `tsc`, `eslint` (the fence). Each new leg RED first; each mutation in Tasks 5.2 / 6.4
RED, then restored. The device sweep (AC 6) and the listen (AC 1) are required parts of done.

### Previous story intelligence (3.15a)

- The remedy and its evidence (V4, P1). The TTS-off log line is `E/talkback: SpeechControllerImpl … TTS is not ready … text:<…>, earcons`;
  count trailing U+00A0 with a script (3.15a used a `python3 -I` regex over `fragments:[{text:(.*?), earcons:`).
- Device facts: the emulator clock runs ~3.5 s behind the Mac's; a cold `pm clear` launch can ANR; taps shift when a line appears under a
  box — re-shoot before each tap; `twtp05://<route>` deep links open a wizard step; Gboard's clipboard chip / `KEYCODE_PASTE`.
- 3.15a's `assisted-step-render.test.ts` already has `NBSP`, `bare()`, `spoken()`, `sent()` helpers — reuse the shape (⛔ a second copy
  of the regex — consider moving `bare` into a small shared test helper if three files need it).

### References

- `deferred-work.md` — V4 and its dated lines; the 3.15a section.
- `3-15a-assisted-step-error-spoken-once-and-focus-kept.md` — DL1, DL2, review P1, Debug Log "Review follow-up".
- RN 0.83.6 `AccessibilityInfoModule.kt` `announceForAccessibility`.
- `apps/mobile/components/peer-request/announce.tsx`, `apps/mobile/lib/death-certificate-announce.ts`.
- `epics.md` Story 3.15b.

## Dev Agent Record

### Agent Model Used

Claude Opus 5.5 (`claude-opus-5-5`), `bmad-dev-story 3.15b`, in the story worktree.

### Debug Log References

- **Task 0 (2026-11-23).** `git fetch origin`; `origin/main` = `3e3b888e` (3.15a LANDED, records only past `78393b18`). Rebased: the three
  records commits rewritten — `034c3aa5` → `d686c419` (row added), `13ed8eb3` → `1d0a46f5` (created), `2e99ab82` → `398b5195` (validated).
  Each `sprint-status.yaml` conflict was the ledger head / `last_updated` block / the 3.15a row: both sides kept in letter order
  (`n`, `m`, `l`, `k`), 3.15a's row kept as `done` (main's), 3.15b's row kept; ⛔ `---` separator involved; YAML parses. `baseline_commit`
  re-pinned to `d686c419` (`git merge-base --is-ancestor d686c419 HEAD` ✓). `ListAgents`: no other session. Ledger head read LIVE across
  every branch and worktree: highest `2026-11-23n` (this branch) → dev start is `2026-11-23o` (`6e893ad7`).
  Re-derived at HEAD by function: F1 (`AccessibilityInfoModule.kt` `announceForAccessibility` — a bare `TYPE_ANNOUNCEMENT`, `event.text.add(message)`,
  no source view) holds; F2 grep = 32 calls in 19 files, the same files and counts (⛔ difference); F5 (`vitest.config.ts` ⛔ `setupFiles`) holds;
  F7 (the six pins) holds; F8 (`WaCodeEntry` `announceForAccessibilityWithOptions(waitLine, { queue: true })`) holds.
- **Task 1 — the listen (AC 1), 2026-11-23 ~15:24 IST.** `Pixel_9` / Android 15 emulator; the INSTALLED dev client (built 13:09 today for
  3.15a's `8b5f4c01`; `git diff 78393b18 HEAD -- apps/ packages/ pnpm-lock.yaml` is EMPTY, so the native side is this branch's) pointed at a
  Metro started from THIS worktree with `-c` (bundled 4587 modules); throwaway `postgres:16-alpine` `twt-3-15b-pg` on :5460, migrated (188
  tables); UNCOMMITTED env-guarded seed spec (an approved T&C; three active workers `248551`, `193500`, `805887`); API from the worktree.
  Found on arrival: `tts_default_synth = com.example.nonexistent.tts` (speech effectively OFF — left by an earlier TTS-off capture; the
  3.15a "TTS enabled" restore did not reset it). Set `tts_default_synth = com.google.android.tts`, TalkBack ON, accessibility + media
  volume 12/15. Fresh member `9876500301` → T&C → assisted step → हाँ → `48291` → Continue ×3 (Mac 15:24:15.3 / 20.9 / 26.5; the 2nd and
  3rd send 1 and 2 trailing U+00A0 — 3.15a's code). **BigDev, asked "What did you hear on the three Continue presses?": *"All 3, clean"***
  (the option read: the sentence spoken 3 times, presses 2 and 3 sounded exactly like press 1 — no click, no "space", no odd pause).
  ⇒ DL1 passes; the remedy stays U+00A0; ⛔ DL1 candidate tried. Note: with TTS ON TalkBack logs ⛔ the spoken text (the "TTS is not ready …
  text:" lines exist only with TTS off) — the log shows one accessibility audio-focus request at 15:24:13.3 (device clock) and its
  abandon at 15:24:22.6; the attestation is BigDev's ear, ⛔ the log. Checked at 1 and 2 NBSP (the AC 1 wording says "1 and 3"; Task 1.1's
  sequence gives 1 and 2) — recorded.
- **Task 2 — the helper (AC 2), RED first.** `announce-repeat.test.ts` (5 legs) and `announce.test.ts` (6 legs) failed to load
  (`Failed to load url ../../lib/announce-repeat` / `../../lib/announce`), then `lib/announce-repeat.ts` (pure, ⛔ `react-native`; NBSP
  built with `String.fromCharCode(0xa0)`) and `lib/announce.ts` (`Platform.OS` read inside `announce()`, `options` forwarded as-is) →
  green except 3 `announce.test.ts` legs that leaked the previous test's count — the Task 3.3 RED.
- **Task 3 — the harness reset (AC 5).** RED first: without a setup file, `harness reset (2 of 2)` failed (`expected [ [ 'Harness reset
  probe' + U+00A0 ] ]`) as did the repeat and per-call-OS legs (state from earlier tests). `tests/unit/setup-announce-repeat.ts`
  (imports ONLY `lib/announce-repeat.ts`) wired as `setupFiles` in `vitest.config.ts` → 11 / 11.
- **Task 4 — routing (AC 3).** 31 calls rewritten by a script (code lines only; `AccessibilityInfo` dropped from each `react-native`
  import once unused; `import { announce } from '../../lib/announce'` placed in sort order among the relative imports; `contact.tsx`
  `import { announce as sendAnnouncement }`, its local `announce` wrapper, iOS guard and four call sites unchanged) + `assisted.tsx` by
  hand (its `NBSP` constant and `announced` ref removed; header and effect comments point at the helper). `useAnnounceOnChange` and
  `announceLine` in `announce.tsx` routed. AC 3's code-only grep → `lib/announce.ts:19` and `:21` only; without the filter, also the two
  comment lines of `lib/death-certificate-announce.ts` (unedited). `git diff` on `lib/death-certificate-announce.ts` and `packages/i18n`:
  empty. `announce.tsx` changes its two call lines and its two import lines (the `AccessibilityInfo` import removed, the helper's added) —
  the import change is the call change's, recorded. ⛔ local name `announce` in any other routed file (checked per file).
  First whole-suite run after routing: 24 failed / 2337 — exactly F5 (`wa-notifications` ×9, the missing `Platform`), F7 (8 pins in 6
  files), F6's two Android rows, 3.15a's two `ios` P1 legs, and ONE leg F6 did not list: `memorial-screens-render` "the 20th row …
  spoken once; again at the next 20th" (`it.each` over locale × `ios` / `android`) — its `android` rows send `family.limit_reached` twice
  through `useMemorialAnnounce`. Recorded as an F6 gap; its `android` rows now expect `[limit, limit + U+00A0]`, the `ios` rows unchanged.
  F6's "two-waits" leg in `wa-code-entry-render` runs on iOS (the file's `beforeEach` sets `mock.os = 'ios'`) → unchanged.
- **Task 5 — the fence (AC 4).** One `no-restricted-properties` entry (two properties) + a `files: ['lib/announce.ts']` carve-out in
  `apps/mobile/eslint.config.mjs`; the shared config sets neither `no-restricted-properties` nor `no-restricted-syntax` (grep), so nothing is
  overridden. Mutations in `components/announcement-channels/ChannelLinkError.tsx` (appended, each restored from a saved copy, `diff`
  identical after): (1) `AccessibilityInfo.announceForAccessibility('x')`, (2) `const { announceForAccessibility } = AccessibilityInfo`,
  (3) `AccessibilityInfo['announceForAccessibility']('x')`, (4) `AccessibilityInfo.announceForAccessibilityWithOptions('x', { queue:
  true })` — each `pnpm --filter @twt/mobile lint` exit 1 with `no-restricted-properties`; ⛔ selector needed. Final tree: lint exit 0
  (the carve-out file included).
- **Task 6 — tests (AC 5).** 6.0 `wa-notifications-screen-render`: `Platform` getter (`mock.os = 'android'`, reset in `beforeEach`); its
  two-mount "not on" leg now asserts each mount sends it once and the second is the words + U+00A0. 6.1 the F7 pins now pin the same
  thing through the helper: `announce(body)` unconditional + the import (`closed`), `` announce(`${title}. ${body}`) `` + import (`refile`,
  `cannot-file`), `if (Platform.OS === 'ios') sendAnnouncement(text)` + the aliased import (`claim-contact`), the iOS gates / `[showBeingChecked]`
  deps / texts (`nominee-review-announcements`), the `[locked]` iOS gate with its full text + import (`nominee-history-copy`) — each as
  strict as before or stricter. 6.2 Android rows count by the words (`bare`) and assert the repeat is the first + U+00A0 (and the first is
  the copy exactly); the `ios` rows keep the exact text. New shared `tests/unit/announce-text.ts` (`NBSP`, `bare`, `sentAs`), used by 5
  files; `assisted-step-render` keeps its own. F6 gap leg added to `nominee-marks-mode-render` (the mock's `OS` now a getter, default
  `ios`). 6.3 `assisted-step-render`: the two `.each(['android','ios'])` P1 legs split — `android` unchanged, `ios` inverted (the copy
  exactly each time). 6.4 mutations, each restored (`diff` identical): (i) the helper returns `text` on Android → 15 RED (the AC 2 repeat
  legs, every F6 Android "differs" leg, the new nominees leg, the memorial `android` rows, 3.15a's three Android P1 legs); (ii) the suffix on
  iOS too → 26 RED (the AC 2 iOS legs and every iOS repeat leg, F6's included); (iii) no `setupFiles` → `announce.test.ts` 3 RED incl. the
  harness leg; (iv) `options` replaced by `{}` → the F8 leg, the repeat leg and `wa-code-entry`'s `[ios] R2` `{ queue: true }` leg RED;
  (iv-b) the options branch never taken → the same three RED; (v) `Platform.OS` captured once at module load → the per-call-OS leg RED.
  6.5 `@twt/mobile` 120 files / 2362 tests green, `tsc --noEmit` exit 0, `eslint .` exit 0; added lines and new files scanned — 0 raw
  U+00A0 / U+200B–D / U+FEFF.
- **Task 7 — the sweep (AC 6), 2026-11-23 15:40–15:57 IST.** Same emulator / container / API / Metro as Task 1; TalkBack ON with TTS OFF.
  ⚠ Setting `tts_default_synth` to a nonexistent engine was NOT enough: TalkBack fell back to Google TTS and spoke (no text in the log);
  TTS-off = `pm disable-user com.google.android.tts` (3.15a's "TTS `enabled`" restore meant this package). ⚠ A first round (15:40–15:45)
  ran an OLD bundle: Metro (started before `lib/announce.ts` existed) answered the bundle request with `UnableToResolveError … ../../lib/announce`,
  so the dev client kept 3.15a's bundle; caught on the language screen (`uiautomator events`, TalkBack OFF: the third हिन्दी failure SENT
  with 0 U+00A0) — that round is DISCARDED (its assisted numbers equal 3.15a's own counter). Metro restarted with `-c` → the served bundle
  contains `distinctAnnouncement` (3 hits) → app relaunched. Results (counts are trailing U+00A0 in the logged speech text):
  - (j) `language.tsx` — **[re-labelled at code review: routed; suffix logged on a NON-ADJACENT repeat — the two languages alternated, same-language-twice NOT RUN; see deferred-work V4 / X2]** was written *fixed*: API stopped; हिन्दी, English, हिन्दी, English, हिन्दी; the second English send logged 1 (15:49:39.954),
    the second हिन्दी 1 (15:49:46.101); each first send 0; the live region's plain entry logged beside each (see X2).
  - (k) `assisted.tsx` — **fixed**: fresh member `9876500303`; 5 digits, Continue ×3 → 0 / 1 / 2 (15:52:09.103 / 13.228 / 17.504);
    `111111` → 422 ×2 → 0 / 1 (15:52:32.737 / 38.368). (A Continue tap after the line appeared missed once — the line moves the button
    ~80 px; re-aimed, not counted.)
  - (a) `kyc.tsx` — **fixed**: manual entry, name `Ram1` (digits fail `ENGLISH_NAME_REGEX`; `adb input text` cannot type Devanagari),
    Submit ×3 → 0 / 1 / 2 (15:53:11.654 / 15.863 / 20.015).
  - (i) `useAnnounceOnChange` — **fixed on a remount**, **not reproduced within one mount**: `pariwar_wa_config` row enabled; the WhatsApp
    step by deep link; Continue unticked → `popup_title` (0); Go back; Continue → straight to step 8 (the reminder opens once per mount —
    `reminder.current = 'shown'`). Back → tabs; deep link again (a new mount) → `waSignup.title` 1 (15:55:00.739); Continue →
    `popup_title` 1 (15:55:06.418).
  - (b) `whatsapp.tsx` `sent_title` — **not reproduced**: box ticked + Continue → `openURL` opened Chrome AT ONCE (no 2 s grace);
    back → the line logged once (0, 15:56:35.674); "open again" + back → not sent again (once per departure, by design). The grace →
    return repeat needs a late departure.
  - (f) `WaCodeEntry` and the F9 standing line — **not reached**: "WhatsApp on another phone?" showed the number + phrase, no code entry
    (`codeAvailable` false here).
  - (c) `known-people-find` — **not reached**: the screen opens (deep link), but the emulator's contacts provider is empty and no
    matchable member was seeded. (d) `nominees.tsx` marks mode — **not reached**: needs an active member with a saved declaration (V5
    blocks the wizard's nominee step); not seeded. (e) `ChannelLinkError` — **not reached**: no channel URL seeded. (g)
    `PanchayatNoticeboard` — **not reached**: no live banner seeded. (h) `useMemorialAnnounce` — **not reached**: no memorial-eligible
    member seeded.
  - Restored (Task 7.3): TalkBack off (`accessibility_enabled 0`, services deleted), Google TTS package enabled and `tts_default_synth =
    com.google.android.tts`, font 1.0 (unchanged), accessibility / media volume back to 6 / 5; `adb reverse --remove-all`; API and Metro
    stopped; container `twt-3-15b-pg` removed (with its `pariwar_wa_config` row); seed spec and both env copies deleted; `apps/mobile/android`
    never created (the installed dev client was used — native side unchanged); `git status` clean except this story's files.

- **Task 9.** Every commit made on `story/3-15b-…` (branch checked before each). `ci:local PASSED — 41 job(s) green` at `264912aa`,
  `DATABASE_URL` = a fresh `postgres:16-alpine` (:5461, `?sslmode=disable`, removed after) — run directly, ⛔ pushed (the push is
  BigDev's word). `friction:check` passed on committed history (AC-4 read the `Story 3.15b disposition`).
- **Code review follow-up — verification record (2026-11-23).** `eslint --no-cache --stdin --stdin-filename …` from `apps/mobile`
  (writes nothing), each `no-restricted-properties` count: bare call 1; destructured call 1; computed literal 1; aliased import 1;
  namespace import with `…WithOptions` 1; variable alias 1; `require('react-native').AccessibilityInfo…` 1; the same code as
  `lib/announce.ts` 0; the same code as `lib/other.ts` 2 (the Auditor, independently: a run-time-built key 0 — the stated blind spot —
  and an object-literal key in a mock 0). With the carve-out removed through a scratchpad config, `app components lib tests` reported
  `lib/announce.ts:19` and `:21` only (431 files). New test, first run: 4 failed / the control passed (session boundaries); second
  round, the held-logout leg RED on the first code, then 6/6. Final tree: `tsc --noEmit` 0, `eslint .` 0, `vitest run` 121 files /
  2368 tests passed. Not run: `ci:local` for this tree at the time of writing; any device.

- **Landing (2026-11-23).** The pre-push hook's `ci:local PASSED — 41 job(s) green` at `57f541b3` on a fresh container (:5461, removed
  after), first push with an explicit refspec. PR #340; GitHub CI 41 / 41 on the PR. Fast-forward: `git push origin 57f541b3:refs/heads/main`
  (`3e3b888e..57f541b3`, 10 commits, SHAs unchanged; no squash, no merge commit; the hook skipped `ci:local` for already-pushed commits);
  GitHub marked #340 merged (2026-11-23T12:15:58Z). The push to `main`: CI run `45172653375` 41 / 41 success; `code-escrow-mirror`
  (`45172653644`) red as on every push (its secret unset). Merged ≠ live: nothing is in production.

### Completion Notes List

- Story created (`bmad-create-story 3.15b`, 2026-11-23): call-site inventory by two read-only passes over `apps/mobile` at `78393b18`;
  facts F1–F11; DL1–DL8 the author's.
- Validated (`bmad-create-story validate 3.15b`, 2026-11-23; BigDev: *"all"*): F2 (32 calls / 19 files), F5, F8, F9
  (`WA_OPT_IN_CODE_MAX_ATTEMPTS = 2`), F10 re-checked at `78393b18` and found to hold; 3.15a found LANDED (`3e3b888e`).
- Dev (`bmad-dev-story 3.15b`, 2026-11-23). **AC 1:** BigDev listened with speech ON — *"All 3, clean"* — the U+00A0 remedy stays (⛔ DL1
  candidate needed). **AC 2:** `lib/announce-repeat.ts` (pure per-text counter, Android only) + `lib/announce.ts` (the one sender,
  `Platform.OS` per call, options forwarded), 11 unit legs, RED first. **AC 3:** all 32 direct calls in 19 files routed (`contact.tsx`
  aliased; `assisted.tsx`'s own counter removed); the code-only grep finds only `lib/announce.ts`; `announcementPlan`, `AnnouncedText`'s
  JSX, `packages/i18n`, routes, contracts unchanged. **AC 4:** one `no-restricted-properties` rule + the `lib/announce.ts` carve-out; four
  mutations (member, destructured, computed, `…WithOptions`) each RED. **AC 5:** the vitest `setupFiles` reset (RED-first leg); F7 pins
  moved to the helper at equal or greater strictness; F6 Android rows count by the words and assert the repeat differs; the new Android
  nominees leg; the `wa-notifications` `Platform` mock; 3.15a's `ios` P1 legs inverted; one F6 gap found and fixed (the memorial limit-line
  `android` rows); mutations (i)–(v) each RED; 120 files / 2362 tests, `tsc`, `eslint` green. **AC 6:** (a), (k) and (i) (on a
  remount) **fixed** with the suffix in the TTS-off log on the new bundle; (b) and (i) within one mount **not reproduced**; (c), (d), (e),
  (f), (g), (h) **not reached**, each with its gate (Debug Log Task 7). A first round on an OLD bundle (Metro had not resolved the new
  module) was caught and discarded. **AC 7:** deferred-work X1 (the F9 analysis, owner NONE YET, both narrowings stated). **AC 8:** V4's
  dated line (addressed / not reproduced / routed-not-device-shown; V4 stays OPEN); also X2 (observed: the language line may be spoken
  twice when the language switches while it shows — owner NONE YET); the `Story 3.15b disposition` in `friction-budget.md`; the emulator
  restored. ⛔ Panel question, ⛔ decision entry, ⛔ migration, ⛔ copy key.

**Code review follow-up (2026-11-23, `bmad-code-review 3.15b`; BigDev: "apply every patch"), all six patches applied.**
P1 — `lib/session-context.tsx` calls `resetAnnouncementRepeats()` beside each of the four `clearNomineeLinksCache(queryClient)` calls; the
new `tests/unit/announce-repeat-session-end.test.ts` drives the REAL `SessionProvider` through sign-out, sign-in, a refused refresh and a
termination (RED first: 4 failed, the control passed; then 5/5; a sixth, held-logout leg was added after the second review round, below). P2 — `eslint.config.mjs` entries name the property only; probed by
`eslint --stdin` (writes nothing): a bare call, a destructured call, a computed literal, an aliased import, a namespace import with
`…WithOptions`, a variable alias and a `require(…)` chain each report `no-restricted-properties`; the same code as `lib/announce.ts` reports
nothing. P3, P4, P5 — records only: deferred-work X2 (heading and body), the V4 line (`language.tsx` moved from ADDRESSED to *routed; suffix
logged on a non-adjacent repeat*, `assisted.tsx` to *re-shown through the helper*, "iOS unchanged" and the speech-ON scope reworded, a new
dated line with the remainder's owner NONE YET), the friction-budget disposition (language screen, the Cost list), DL3 / DL5 amended
above, the sprint-status ledger line `2026-11-23p` reworded. P6 — the blank line restored in `assisted.tsx`. Same-language-twice on the
language screen was ⛔ run (the record says so). On the final tree: mobile `tsc` 0, `eslint .` 0, `vitest` 121 files / 2368 tests green
(2362 + the 6 new). `ci:local` NOT re-run for this tree (the pre-push hook runs it); the device is ⛔ re-visited.

### File List

- `apps/mobile/lib/announce-repeat.ts` (new)
- `apps/mobile/lib/announce.ts` (new)
- `apps/mobile/tests/unit/announce-repeat.test.ts` (new)
- `apps/mobile/tests/unit/announce.test.ts` (new)
- `apps/mobile/tests/unit/announce-text.ts` (new — shared test helpers)
- `apps/mobile/tests/unit/setup-announce-repeat.ts` (new)
- `apps/mobile/tests/unit/announce-repeat-session-end.test.ts` (new — code review P1)
- `apps/mobile/lib/session-context.tsx` (code review P1 — the counter cleared at each session boundary)
- `apps/mobile/vitest.config.ts`
- `apps/mobile/eslint.config.mjs`
- `apps/mobile/app/(claim)/cannot-file.tsx`, `certificate-replacement.tsx`, `closed-helpline.tsx`, `contact.tsx`, `nominee-review.tsx`,
  `refile-helpline.tsx`
- `apps/mobile/app/(life-events)/known-people-find.tsx`, `nominees.tsx`
- `apps/mobile/app/(memorial)/family.tsx`
- `apps/mobile/app/(settings)/language.tsx`, `notifications.tsx`
- `apps/mobile/app/(signup)/assisted.tsx`, `kyc.tsx`, `whatsapp.tsx`
- `apps/mobile/components/announcement-channels/ChannelLinkError.tsx`
- `apps/mobile/components/memorial-authorship/useMemorialAnnounce.ts`
- `apps/mobile/components/notifications/WaCodeEntry.tsx`
- `apps/mobile/components/panchayat/PanchayatNoticeboard.tsx`
- `apps/mobile/components/peer-request/announce.tsx`
- `apps/mobile/tests/unit/assisted-step-render.test.ts`, `cannot-file-copy-resolves.test.ts`, `claim-contact.test.ts`,
  `closed-copy-resolves.test.ts`, `memorial-screens-render.test.ts`, `nominee-history-copy.test.ts`, `nominee-marks-mode-render.test.ts`,
  `nominee-review-announcements.test.ts`, `refile-copy-resolves.test.ts`, `wa-code-entry-render.test.ts`,
  `wa-notifications-screen-render.test.ts`, `wa-signup-step-render.test.ts`
- `_bmad-output/implementation-artifacts/deferred-work.md`
- `friction-budget.md`
- `_bmad-output/implementation-artifacts/3-15b-repeated-announcement-sent-as-different-text.md` (this file)
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Change Log

| Version | Date | Change |
| --- | --- | --- |
| 1.0 | 2026-11-23 | Created (`bmad-create-story 3.15b`) in its own worktree off `78393b18` (row record `034c3aa5`). §0: ⛔ Panel question. DL1–DL8 decided by the author (DL1: the listen is a gate; DL2: Android only — changes 3.15a's iOS repeat behaviour; DL7: the epics AC (5) premise corrected by F9). Row `backlog` → `ready-for-dev`. ⛔ Code. |
| 1.1 | 2026-11-23 | Validated (`bmad-create-story validate 3.15b`; BigDev: "all"). 3.15a LANDED (`3e3b888e`): Task 0.1 rebases and RE-PINS `baseline_commit` (the rebase rewrites `034c3aa5`). F5: `wa-notifications-screen-render`'s mock has no `Platform` — the file would throw once routed (Task 6.0); DL3 reads `Platform.OS` per call. F6 re-sorted by each leg's real platform (`nominee-marks-mode-render` and the memorial blur-then-focus leg are iOS; the `.each` legs change their `android` row only) + a new Android nominees leg. AC 3: a code-only grep (two comment lines in `lib/death-certificate-announce.ts` are expected and the file stays unedited). F12: `contact.tsx`'s local `announce` — aliased import. DL5: one `no-restricted-properties` rule (it already catches destructuring and the computed form in ESLint 9.39.4), the blind spots recorded, ⛔ `no-restricted-imports` in mobile's config. DL7: the epics AC (5) narrowing stated (⛔ fixed even if seen; owner NONE YET — none named at validate). F11: all of `apps/mobile/**` is member-facing. DL4: per-mount vs per-session count. Row stays `ready-for-dev`; ⛔ code. |
| 1.2 | 2026-11-23 | Dev (`bmad-dev-story 3.15b`): rebased onto `3e3b888e`, baseline re-pinned to `d686c419`; the listen passed (BigDev: "All 3, clean"); the helper, the fence, the harness reset, 32 calls routed, tests updated (code `044e62d3`); device sweep (a)/(j)/(k)/(i) fixed, (b) not reproduced, (c)–(h) not reached; deferred-work V4 dated line + X1 (F9, owner NONE YET) + X2 (observed); friction-budget disposition. |
| 1.3 | 2026-11-23 | `ci:local` 41 / 41 at `264912aa` on a fresh container (not pushed). Status → `review`. |
| 1.4 | 2026-11-23 | Code review (`bmad-code-review 3.15b`, range `d686c419..faea140c`, all three layers): 0 decision-needed, 6 patch, 0 new defer, 15 dismissed; BigDev: "apply every patch" — all six applied. P1 the counter cleared at every session boundary (new `announce-repeat-session-end.test.ts`, RED first); P2 the fence names the property only (DL5 superseded, stated); P3 X2 / `language.tsx` closure reworded; P4 V4 remainder's owner (NONE YET); P5 the speech-ON scope, "iOS unchanged" and `assisted.tsx` credit reworded; P6 a blank line. Status stays `review`. |
| 1.5 | 2026-11-23 | Second, adversarial review of those patches (three layers; BigDev: "run adversarial review on patches, then open pr"): 0 decision-needed, 6 patch (R1–R6), 0 new defer, 10 dismissed. `signOut` also clears the counter AFTER its awaits (a held-logout leg, RED first); the `announce-repeat.ts` header states the boundary caveat and "not capped" in plain words; the new test resets locally and clears `ctx.current`; the ledger 2026-11-23p "iOS unchanged" and "(j) fixed", the friction wording and the finding labels corrected. Status stays `review`. |
| 1.6 | 2026-11-23 | LANDED on `main` by fast-forward (PR #340, `3e3b888e..57f541b3`, SHAs unchanged): pre-push `ci:local` 41 / 41 on a fresh container; GitHub CI 41 / 41 on the PR and on the push to `main` (run `45172653375`); `code-escrow-mirror` red as on every push. Status `review` → `done`. Merged ≠ live; V4 stays open (remainder owner NONE YET); X1 / X2 are Story 3.15c's. |
