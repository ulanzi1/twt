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

Status: in-progress

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

- [ ] **Task 0 — Preflight**
  - [ ] 0.1 `git fetch origin`; rebase this branch onto `origin/main` FIRST (3.15a landed at `3e3b888e`; ledger conflict —
        [[project_rebase_ledger_conflict_separator]]; verify the YAML parses). Then RE-PIN `baseline_commit` (front matter + the PINNED
        comment) to the rebased SHA of the row record (`records(3.15b): row added …`) and check `git merge-base --is-ancestor <pin> HEAD`.
        `pnpm install`; `ListAgents`; `git status` clean on `story/3-15b-…`.
  - [ ] 0.2 Re-derive F1, F2 (the grep), F5, F7, F8 at HEAD by function. If the call-site count differs from 32 (19 files), the grep wins — list the
        difference in the Debug Log.
- [ ] **Task 1 — The listen (AC 1; DL1) — BEFORE any code**
  - [ ] 1.1 A debug build of THIS branch (unchanged code = 3.15a's `assisted.tsx`) on the emulator; TTS ENABLED; TalkBack ON; signup to
        the assisted step; 5 digits; Continue ×3 (the 2nd and 3rd carry 1 and 2 U+00A0). Ask BigDev to listen; record their words.
  - [ ] 1.2 Silent → proceed. Audible → DL1's candidates, each heard before adoption; record which. Nobody listens → STOP and ask BigDev.
- [ ] **Task 2 — The helper (AC 2; DL2, DL3) — RED first**
  - [ ] 2.1 `tests/unit/announce-repeat.test.ts` (pure) and `tests/unit/announce.test.ts` (mocks `react-native`, both methods): every AC 2
        leg; watch them fail (no module) then write `lib/announce-repeat.ts` and `lib/announce.ts`.
  - [ ] 2.2 Header comments: why (V4, F1), the per-text rule and its cost (DL3), Android-only (DL2), and that a unit test shows only what
        is SENT ([[project_talkback_drops_identical_announcement]]).
- [ ] **Task 3 — The harness reset (AC 5; DL6)**
  - [ ] 3.1 `tests/unit/setup-announce-repeat.ts` + `setupFiles` in `apps/mobile/vitest.config.ts`.
  - [ ] 3.2 Comment in `vitest.config.ts`: why the reset (F5), and that the setup file must ⛔ import `react-native`.
  - [ ] 3.3 RED-first: in `announce.test.ts`, two tests each sending the same text on `'android'` and expecting the PLAIN text first —
        the second fails without the setup file, passes with it.
- [ ] **Task 4 — Route every call (AC 3; DL4)**
  - [ ] 4.1 Replace each direct call in F2 with `announce(…)` (keep text, guard, deps, `queue` options); `useAnnounceOnChange` and
        `announceLine` in `announce.tsx` included; remove `assisted.tsx`'s `NBSP` constant and `announced` ref (and update its header
        comment's P1 sentence to point at the helper). `contact.tsx`: aliased import, local `announce` wrapper kept (F12).
  - [ ] 4.2 The code-only grep in AC 3 returns only `lib/announce.ts`. `git diff` on `lib/death-certificate-announce.ts`
        (`announcementPlan`), `AnnouncedText`'s JSX, `packages/i18n`: empty.
- [ ] **Task 5 — The fence (AC 4; DL5)**
  - [ ] 5.1 The one rule + the carve-out in `apps/mobile/eslint.config.mjs`, with a comment (V4, DL5, the carve-out's one file, the two
        blind spots).
  - [ ] 5.2 Mutations (each restored byte-for-byte, `diff` against a saved copy): a bare member call, a destructured call, a computed call
        — each `pnpm --filter @twt/mobile lint` RED; the carve-out file itself green. Record each in the Debug Log.
- [ ] **Task 6 — Tests updated (AC 5)**
  - [ ] 6.0 `wa-notifications-screen-render`: add `Platform: { get OS() { return mock.os } }` to its `react-native` mock (`mock.os =
        'android'`, reset in `beforeEach`) — WITHOUT it the whole file throws once `notifications.tsx` is routed (F5). Do this in the same
        commit as Task 4.
  - [ ] 6.1 F7's source pins: pin the same guard / text / deps through `announce(`; ⛔ weaken.
  - [ ] 6.2 F6's Android rows: count by the words; add "the repeat differs from the first". F6's iOS legs and the `ios` rows of its
        `.each` legs: ⛔ change (DL2). F6 Gap: the new Android leg in `nominee-marks-mode-render` (two no-name marks ⇒ the second
        `form.marked_no_name` differs from the first) — RED with mutation 6.4 (i).
  - [ ] 6.3 `assisted-step-render`: the two `ios` P1 legs inverted (identical on iOS — DL2), Android legs unchanged; its local `NBSP` /
        `bare` / `sent` helpers stay valid.
  - [ ] 6.4 Mutation checks, restored each: (i) helper returns `text` on Android → the AC 2 repeat legs and F6's "differs" legs RED;
        (ii) suffix on iOS too → the F6 iOS legs RED; (iii) drop the setup file → Task 3.3's leg RED; (iv) `announce` drops `options` →
        the `{ queue: true }` legs RED. Record each.
  - [ ] 6.5 `pnpm --filter @twt/mobile test` (whole suite), `tsc`, `eslint` green; added lines scanned for invisible characters.
- [ ] **Task 7 — The device sweep (AC 6, 7; DL7, DL8)** — recipe in [[project_mobile_android_emulator_setup]]
  - [ ] 7.1 Throwaway `postgres:16-alpine`, migrated; seed through an env-guarded UNCOMMITTED spec (an approved T&C, a field worker
        code; more only as a case needs it — e.g. a `pariwar_wa_config` row for (b) / (i), channel URLs for (e)). Copy main's git-ignored
        `.env` files. A fresh prebuild + debug build of this branch; Metro with `-c`.
  - [ ] 7.2 TalkBack ON, TTS disabled, `logcat` captured; F3 cases in DL8's order; for each: the sequence run, the log lines (with the
        trailing U+00A0 count), and fixed / not reached / not reproduced. `WaCodeEntry` (F3 (f)) and the F9 standing line: try to reach;
        record.
  - [ ] 7.3 Restore the emulator (TalkBack off, TTS on, font 1.0); drop the container; delete the seed spec, env copies and
        `apps/mobile/android`; `git status` clean except this story's files.
- [ ] **Task 8 — Records (AC 7, 8)**
  - [ ] 8.1 `deferred-work.md`: dated lines under V4 (per AC 8) and the new F9 item (DL7).
  - [ ] 8.2 `friction-budget.md`: the `**Story 3.15b disposition (…)**` block, after Story 3.15a's (F11). `pnpm friction:check` after the
        commit.
  - [ ] 8.3 This story: Dev Agent Record, File List, Change Log; Status → `review`. `sprint-status.yaml`: row → `review`, a dated row
        comment, a prepended `# last_updated:` entry (read the head LIVE across branches for the next free letter —
        [[project_sprint_status_ledger]]; the safe prepend — [[project_sprint_status_safe_prepend]]; verify the YAML parses).
- [ ] **Task 9 — Gates**
  - [ ] 9.1 Commit on `story/3-15b-…` only ([[feedback_commit_on_story_branch]]); check the branch before every commit.
  - [ ] 9.2 `ci:local` on a FRESH container (`DATABASE_URL=…?sslmode=disable` — [[project_prepush_hook_inherits_5432]]). The push is
        BigDev's word (3.15a precedent).

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

### Debug Log References

### Completion Notes List

- Story created (`bmad-create-story 3.15b`, 2026-11-23): call-site inventory by two read-only passes over `apps/mobile` at `78393b18`;
  facts F1–F11; DL1–DL8 the author's.
- Validated (`bmad-create-story validate 3.15b`, 2026-11-23; BigDev: *"all"*): F2 (32 calls / 19 files), F5, F8, F9
  (`WA_OPT_IN_CODE_MAX_ATTEMPTS = 2`), F10 re-checked at `78393b18` and found to hold; 3.15a found LANDED (`3e3b888e`).

### File List

## Change Log

| Version | Date | Change |
| --- | --- | --- |
| 1.0 | 2026-11-23 | Created (`bmad-create-story 3.15b`) in its own worktree off `78393b18` (row record `034c3aa5`). §0: ⛔ Panel question. DL1–DL8 decided by the author (DL1: the listen is a gate; DL2: Android only — changes 3.15a's iOS repeat behaviour; DL7: the epics AC (5) premise corrected by F9). Row `backlog` → `ready-for-dev`. ⛔ Code. |
| 1.1 | 2026-11-23 | Validated (`bmad-create-story validate 3.15b`; BigDev: "all"). 3.15a LANDED (`3e3b888e`): Task 0.1 rebases and RE-PINS `baseline_commit` (the rebase rewrites `034c3aa5`). F5: `wa-notifications-screen-render`'s mock has no `Platform` — the file would throw once routed (Task 6.0); DL3 reads `Platform.OS` per call. F6 re-sorted by each leg's real platform (`nominee-marks-mode-render` and the memorial blur-then-focus leg are iOS; the `.each` legs change their `android` row only) + a new Android nominees leg. AC 3: a code-only grep (two comment lines in `lib/death-certificate-announce.ts` are expected and the file stays unedited). F12: `contact.tsx`'s local `announce` — aliased import. DL5: one `no-restricted-properties` rule (it already catches destructuring and the computed form in ESLint 9.39.4), the blind spots recorded, ⛔ `no-restricted-imports` in mobile's config. DL7: the epics AC (5) narrowing stated (⛔ fixed even if seen; owner NONE YET — none named at validate). F11: all of `apps/mobile/**` is member-facing. DL4: per-mount vs per-session count. Row stays `ready-for-dev`; ⛔ code. |
