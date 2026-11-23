---
baseline_commit: f18f934f
---

<!--
PINNED: `f18f934f` = `origin/main` on 2026-11-23 (after `git fetch origin`), the commit that added this row as `backlog` with the
epics.md Story 3.15a block and the owner lines on V1, V2 and W2 in `deferred-work.md` (ledger `2026-11-23d`). Authored in its OWN
worktree `/Users/dev/Developer/projects/TWT/.claude/worktrees/3-15a-assisted-step-error-spoken-once-and-focus-kept`, branch
`story/3-15a-assisted-step-error-spoken-once-and-focus-kept` (upstream UNSET — first push with an explicit refspec,
[[project_story_branch_upstream_is_main]]). Stacked on nothing; lands on its own. Every `apps/` claim below was traced by hand at
`f18f934f`; RE-LOCATE BY FUNCTION, ⛔ by line number ([[feedback_story_validate_footguns]] #24). The worktree was created without
`node_modules` — run `pnpm install` in it before any test (Task 0.1).

§0 GATE (the routing template's, applied FIRST): ⛔ Panel question. Everything here is HOW a screen Story 3.15 built speaks an error
and keeps the cursor — the AUTHOR's. Nothing changes who is credited, who is told what, or what is stored. The two choices the epics
block leaves open ("the story chooses between restoring focus after the lock … and not locking the input") are made below as DL1–DL7,
each with its reason and an honest cost; BigDev may overrule any of them at validate or review. BigDev's ruling that W2 (i) is a defect
("I think we should fix W2 (i)") is the input, quoted, ⛔ reinterpreted.
-->

# Story 3.15a: The "Did Someone Help You?" Step — the Error Spoken Once, and the Code Box Keeps Focus After a Wrong Code

Status: ready-for-dev

## Story

As a person signing up who uses a screen reader, or who mistypes the helper's code,
I want the "wrong code" message read to me once and the cursor left in the code box,
so that I can correct the code without hearing the error again or having to find the box.

## 📜 Policy meaning (AI-10-1)

**This story introduces ⛔ predicate that gates a member's access to a benefit, and changes none.** It changes only how the signup
step's error lines are spoken and whether the code box keeps focus; what is accepted, refused, stored or credited is unchanged
(Story 3.15's route and DL1–DL14 untouched). ⛔ Niyamavali check needed — no predicate.

## The rulings and records this story builds on

- **The device pass that found it** — `deferred-work.md`, "Deferred from: device pass of story 3-15-assisted-signup-field-worker-code
  (Android emulator, 2026-11-23)": **V1** (TalkBack re-read the not-found line *"between the first and second '1 deleted'"*, i.e. on the
  backspace that removes it), **V2** (the saved line possibly cut by the heading, un-attested — TTS-off capture shows what was queued,
  not what was heard). Owner lines for both: *"OWNER: Story 3.15a"* (2026-11-23).
- **W2 (i)** — `deferred-work.md`, "Deferred from: code review of story 3-15 …, round 2": *"CONFIRMED — DL8's 'focus stays' does not
  hold on Android. Pressing Continue with the keyboard up: the box goes non-editable, the keyboard closes (`mInputShown=false`) and focus
  leaves the box; after the 422 the box is editable again but unfocused with the keyboard down"*. BigDev: *"I think we should fix W2 (i)"*
  — **RULED A DEFECT TO FIX; OWNER: Story 3.15a.** (ii) / (iii) stay owned by "the next device pass, which 3.15a's pass can be".
- **The precedent fix** — Story 6.36f device-run D1 (`6-36f-nominee-mark-only-save.md`, Completion Notes, 2026-10-27, `b543e703`):
  clearing the line was *"NOT enough — on the device it was still re-read at the press"*; the fix was *"plain visible text, SPOKEN ONCE
  by `announceForAccessibility` when set (`sayMarksNotice`)"*. Memory [[project_android_live_region_reread_on_rerender]].
- **Story 3.15** (`3-15-assisted-signup-field-worker-code.md`, `done`, landed PR #337) — review R1 (*"while the POST is open the box is
  read-only and a change is ignored: a capture is permanent, so the screen must never say 'saved' (or show a not-found line) beside
  digits other than the ones it SENT"*), R2 / P3 (continuations bound to focus; a POST that settles while blurred keeps its result,
  spoken at re-focus), P7 (Skip enabled during the POST), N1 (never blocks a signup). **All of these must still hold.**
- epics.md Story 3.15a block (AC (1)–(4) in brief) — the source of the ACs below.

## Found facts (traced at `f18f934f`)

- **F1 — the error lines.** `apps/mobile/app/(signup)/assisted.tsx`, the `code` stage: `{error === 'format' && focused ? <AnnouncedText
  kind="error" …format/> : null}` and the same for `not_found` (≈ lines 225–226). The error is SET in `onContinue` at three places — the
  client check (`!SIX_DIGITS.test(value)` → `'format'`), a 422 → `'not_found'`, a 400 → `'format'` — and CLEARED at the POST start
  (`setError(null)`) and on every edit (`onChangeText` → `setError(null)`). The edit that clears it is the re-render TalkBack re-read on.
- **F2 — why it is re-read.** `apps/mobile/components/peer-request/announce.tsx` `AnnouncedText`: on Android the line is a live region
  (`accessibilityLiveRegion = announcementPlan(Platform.OS, kind).liveRegion` → `'assertive'` for `error`, `'polite'` for `status`); on
  iOS it calls `announceForAccessibility` in an effect keyed on `[text, kind]`. `lib/death-certificate-announce.ts` `announcementPlan`.
  A live region is re-read by TalkBack on a nearby re-render, whether the line stays or is being removed (6.36f D1).
- **F3 — `accessibilityRole="alert"` is NOT a live region on Android.** React Native 0.83.6, `ReactAndroid/…/uimanager/
  ReactAccessibilityDelegate.kt` (`AccessibilityRole.ALERT -> nodeInfo.roleDescription = …alert_description`) — it only sets the role
  description (the *". Alert"* TalkBack logged). Live regions come only from `accessibilityLiveRegion`
  (`BaseViewManager.java` `setAccessibilityLiveRegion`). So the role can stay `alert` without bringing the re-read back.
- **F4 — the house shapes for "spoken once".** `app/(life-events)/nominees.tsx` `sayMarksNotice` (set the notice + ONE
  `AccessibilityInfo.announceForAccessibility`, render a plain `<Text … accessibilityRole="text">`); `components/announcement-channels/
  ChannelLinkError.tsx` (plain `Text` with `accessibilityRole="alert"`, ⛔ live region; spoken where the failure is SET, on BOTH
  platforms, *"a REPEAT failure (the same words) included"*); `components/notifications/WaCodeEntry.tsx` / `use-wa-code.ts` (a send
  counter `sendCount` keys the announcement so a second identical line is spoken again).
- **F5 — ⛔ touch `AnnouncedText`.** It is imported by ~30 screens/components (`grep -rln AnnouncedText apps/mobile/app apps/mobile/
  components`); the epics block forbids changing it (*"other screens rely on its live region"*).
- **F6 — what drops the focus (W2 (i)).** `assisted.tsx` passes `disabled={busy}` to tamagui's `Input`. `@tamagui/input` 2.1.0
  `src/Input.native.tsx` maps it to `editable: !disabled && !readOnly`; RN 0.83.6 `ReactTextInputManager.kt` `setEditable` does
  `view.isEnabled = editable` — a disabled Android view loses focus and the IME closes. That is the whole mechanism of W2 (i).
- **F7 — why "restore focus after the lock" is fragile on Android.** Restoring would need `ref.current.focus()` after `busy` flips back.
  Fabric's `MountItemDispatcher.kt` executes **view commands FIRST** in a dispatch (*"As an optimization, execute all ViewCommands
  first"*; `disableEarlyViewCommandExecution()` defaults to `false` in `ReactNativeFeatureFlagsDefaults.kt`), and `focus()` is a view
  command — so a `focus()` issued from the effect that follows the unlocking commit can run while the `EditText` is still
  `isEnabled=false`, and silently do nothing. It would need a deferral whose timing only a device can prove. (The tamagui ref does
  reach the RN `TextInput`: `@tamagui/element/src/useNativeRef.ts` `useNativeInputRef`.) No screen in `apps/mobile` calls `.focus()`
  today — only `autoFocus` (login, otp, handover-otp, certificate-replacement).
- **F8 — why "don't lock the input" keeps R1's guarantee.** `onChangeText` already returns early while `busyRef.current` (R1's guard, ⛔
  `setCode`). RN 0.83.6 `Libraries/Components/TextInput/TextInput.js` keeps an internal `lastNativeText` state that every native change
  updates, and a layout effect that calls `viewCommands.setTextAndSelection` when `lastNativeText !== props.value` — so an ignored
  change is REVERTED on screen to the controlled `value` (the SENT code). And the box holds exactly 6 digits during any POST (the client
  sends only `/^\d{6}$/`), so `maxLength={6}` refuses an insert natively; only a delete / select-replace / paste can produce a change,
  and that change is reverted. ⚠ **The revert can be DROPPED:** the command carries JS's `mostRecentEventCount`, and
  `ReactEditText.kt` `maybeSetText` returns early unless `canUpdateWithEventCount(jsEventCounter)` (`eventCounter >= nativeEventCount`).
  During a rapid multi-edit (a held backspace) native is already ahead, so each revert but the LAST is discarded. Each change event
  triggers a fresh revert at its own count, so in theory the box settles on the SENT code after the last edit. Only a device can show
  that, and the single backspace is the easy case — AC 4 runs a multi-edit too.
- **F9 — the focus rules the fix must keep (R2 / P3).** The error and saved lines render only while `focused` (state set by
  `useFocusEffect`); `focusedRef` is the synchronous copy. Test `Review P3 … '%s after blur: the error line is kept and spoken at
  re-focus (⛔ while blurred)'` pins: an error that lands while blurred is ⛔ spoken then, and IS spoken at re-focus. Today that works
  because the line MOUNTS at re-focus and `AnnouncedText` speaks on mount (iOS path; the test mocks `Platform.OS = 'ios'`).
- **F10 — the test harness** (`apps/mobile/tests/unit/assisted-step-render.test.ts`, 597 lines): `Platform: { OS: 'ios' }` fixed; the
  tamagui `Text` mock forwards only `role="alert"` (⛔ `accessibilityLiveRegion`), so an Android live region is INVISIBLE to it today;
  the `Input` mock maps `disabled` → `readOnly` and still forwards changes (so the guard is tested); R1's legs assert
  `toHaveAttribute('readonly')` during the POST and `not.toHaveAttribute('readonly')` after (≈ lines 312, 329, and the P3 `it.each`
  ≈ 474). Many legs query the lines by `getByRole('alert')` — keeping the role (F3) keeps them valid. The 6.36f precedent for a
  live-region-visible mock: `nominee-marks-mode-render.test.ts` (`'data-live': accessibilityLiveRegion`, leg `device run D1`); Android
  platform mocks exist in `kyc-manual-render.test.ts`, `announcement-channels-render.test.ts`.
- **F11 — the two screens to CHECK (AC (4)).** `app/(signup)/whatsapp.tsx`: `error === 'request'` / `'link'` lines are `AnnouncedText
  kind="error"` (≈ 314–315); the error clears at the next action (`setError(null)` in the send / reopen handlers), ⛔ on an edit (the step
  has no text box). `components/notifications/WaCodeEntry.tsx`: `{errorText ? <AnnouncedText kind="error" text={errorText} /> : null}`
  (≈ 106); `use-wa-code.ts` `setCode` does ⛔ clear `line`, so a wrong-code line STANDS while the member types the next code — every
  keystroke re-renders beside a standing live region, the 6.36f D1 shape. `WaCodeEntry` is mounted only by `OtherPhoneCodeHint`, only
  from `whatsapp.tsx`, only when the mint answers `codeAvailable || liveCode` — `apps/api/src/modules/wa-opt-in/code-handlers.ts`:
  `codeAvailable` needs the Settings switch AND a delivery whose availability reads Secret Manager. ⚠ Likely ⛔ reachable on a local
  throwaway setup — if so it is recorded as NOT REACHED with the reason, ⛔ as "not seen".
- **F12 — W3's trigger.** `deferred-work.md` W3 (`whatsapp.tsx:227` Spinner label on a container that is not `accessible`): *"Owner:
  NONE YET. Trigger: the next change to `whatsapp.tsx`"*. If this story changes `whatsapp.tsx` (only if AC (4)'s re-read is seen),
  that trigger FIRES — fix it in the same change (`accessible` on the Spinner, the 3.15 P5 copy) or record why not.
- **F13 — friction-budget AC-4.** `scripts/friction-budget/lib.ts` `evaluateDeclaration`: any committed change under a member-facing
  path (`apps/mobile/app/…`) with ⛔ change to `friction-budget.md` FAILS `ci:local` — and it diffs COMMITTED history, so it passes
  vacuously until the commit ([[project_friction_budget_baseline_ratchet]]). This story owes a `**Story 3.15a disposition (…)**` block.
- **F14 — 400 is unreachable from the UI.** The client refuses non-6-digit input before any POST, so the server's 400 → `'format'` arm is
  exercised only by the unit test.

## Build decisions (the author's — §0; BigDev may overrule at validate / review)

- **DL1 — V1: the not-found and format lines become plain text, spoken ONCE where they are set.** Render them as tamagui `Text` with
  `accessibilityRole="alert"` (kept — F3: a role description, ⛔ a live region; a member swiping to the line still hears "Alert"), the
  same colour / size `AnnouncedText` gives `kind="error"` (`$red10`, `$2`), ⛔ `accessibilityLiveRegion`, ⛔ `AnnouncedText`. Speak with
  ONE `AccessibilityInfo.announceForAccessibility(text)` on BOTH platforms (⛔ `announcementPlan` — it exists to split live region vs
  iOS announce, and there is no live region now). *Cost:* the line is no longer re-announced by the platform if something else redraws
  it — which is exactly the defect being removed.
- **DL2 — "spoken once" is keyed on each time an error is SET, and waits for focus.** Keep a counter bumped at every `setError('format'
  | 'not_found')` (the `use-wa-code.ts` `sendCount` shape, F4) and speak from ONE effect keyed on `[focused, thatCounter]`: speak when
  the step is focused and an error is showing. Consequences, each deliberate: (a) a repeat press answered by the same error is spoken
  again (ChannelLinkError's *"a REPEAT failure … included"*); (b) an edit, a backspace, a press — anything that does not SET an error —
  speaks nothing; (c) an error set while the step is BLURRED is ⛔ spoken then and IS spoken at the next focus (keeps P3's pinned
  behaviour, F9); (d) an error still showing when the step regains focus is spoken again at that re-focus (today's mount-time
  behaviour, W2 (iii)). ⛔ `t` in the deps ([[project_uset_fresh_closure_memo_trap]]) — resolve the text inside the effect (the
  repo has no `react-hooks` lint rule, so omitting `error` and `t` from the deps passes `eslint`).
  *Narrows the epics text:* epics AC (1) says *"spoken ONCE … where the error is set"*. DL2 speaks from the effect after that render,
  ⛔ at the set site — a call at the set site would speak a 422 that lands while the step is blurred over another screen (P3, F9).
  Recorded here, ⛔ silently.
  *Cost:* (d) means a member who left with the line showing hears it again on return; that is today's behaviour, kept.
- **DL3 — W2 (i): ⛔ lock the code box; keep R1's guard. (The epics block's second option.)** Remove `disabled={busy}` from the `Input`
  ONLY (Continue keeps `disabled={busy}` and its spinner; Skip stays enabled, P7). The box never goes non-editable, so focus and the
  keyboard never leave it, and after a 422 the member is still in the box with the keyboard up. R1 holds by the existing `busyRef` guard
  in `onChangeText` plus RN's controlled-value revert (F8); the code sent, the code on screen and the code the result speaks about stay
  the same. *Why not "restore focus after the lock":* F7 — on Fabric a `focus()` after the unlock can run before the unlock is mounted
  and do nothing; it would need a timed deferral proven only on a device, and the keyboard would still close and re-open across every
  POST (up to `CALL_TIMEOUT_MS`, 15 s). *On "its regression stays green" (epics AC (2)):* R1's legs assert two things — the box is
  `readonly` during the POST, and the change is ignored so the SENT code stays. The first is the mechanism this option removes, so
  that one assertion is inverted; the second is R1's guarantee and stays exactly as written (AC 4). *Cost of DL3:* during a POST the box LOOKS editable; a delete there is undone with no message
  (TalkBack may echo the deletion and then the restored text — un-attested until the pass). **Fallback, decided now:** if the device
  pass shows the revert does NOT happen — after a single backspace OR after a rapid multi-edit (F8's dropped-revert case) — and the box
  ends up showing digits other than the ones sent, DL3 is wrong — put `disabled={busy}`
  back, restore focus after the unlock with a deferral that the device proves takes (F7), and record which deferral and why in the
  Debug Log. ⛔ ship a box that can show other digits than the ones sent.
- **DL4 — every error that keeps the member on the box keeps the box usable: 422, the server 400 and the client format line.** The epics
  AC names *"after a 422"*; the 400 travels the same POST path (F14) and the client format line never locked (no POST). Under DL3 all
  three keep focus with no extra code. This widens the epics text by the 400 only; recorded here, ⛔ silently.
- **DL5 — V2 is checked, and fixed ONLY if heard.** With speech ON, listen to the saved line on a 201. Heard in full → close V2 as "not
  reproduced with speech on (emulator)". Cut by the heading → fix here with the smallest change the device proves (candidates: speak the
  saved line once AFTER the code box and buttons have unmounted; or keep focus off the heading) — ⛔ a change to `AnnouncedText`;
  ⛔ a new copy key. Heard cut but no change proven within the story → a dated deferred item with an owner (⛔ silent).
- **DL6 — `whatsapp.tsx` / `WaCodeEntry.tsx`: CHECK, ⛔ change unless the re-read is seen.** Seen → the same DL1/DL2 shape in that file
  (⛔ in `AnnouncedText`), with its own RED-first test; and F12's W3 trigger fires for `whatsapp.tsx`. Not seen → record what was done
  and what was heard. Not reached (F11) → record "NOT REACHED" with the reason and keep a deferred item (owner: NONE YET — BigDev
  assigns). ⛔ write "not seen" for a leg that was not run ([[feedback_record_unattested_no_backfill]]).
- **DL7 — the not-found line heard CUT (AC 7): the same rule as DL5.** One likely cutter: the 422's render also swaps Continue's
  spinner back to its label, and TalkBack may speak that change on the focused button. Heard in full → recorded. Heard cut → fix here
  with the smallest change the device proves (candidate: speak the line one frame after the render that re-enables Continue), with its
  own RED-first unit leg where one can be written — ⛔ a change to `AnnouncedText`; ⛔ a new copy key. Heard cut but no change proven
  within the story → a dated deferred item with an owner (⛔ silent). Not heard by anyone → "un-attested" (AC 7).

## Acceptance Criteria

1. **V1 — the not-found and format lines are ⛔ live regions.** On `apps/mobile/app/(signup)/assisted.tsx` both lines render with ⛔
   `accessibilityLiveRegion` and ⛔ through `AnnouncedText`; they keep `accessibilityRole="alert"` and their visible text, colour and
   place (under the box). `AnnouncedText` and `announcementPlan` are byte-for-byte unchanged (`git diff` shows neither file).
2. **V1 — each error is spoken exactly once per time it is set, on both platforms.** A 422 → `announceForAccessibility` called ONCE
   with `signup.assisted.not_found`; the client check or a 400 → ONCE with `signup.assisted.format`; then a backspace, any further edit
   that clears the line, typing a new code, or a press that does not set an error → ⛔ further call with that text. A second press that
   sets the error again → spoken again (DL2 (a)). An error set while the step is blurred → ⛔ spoken while blurred, spoken at re-focus
   (DL2 (c)); the existing P3 legs stay green unchanged in meaning. Unit-tested with `Platform.OS` = `'android'` AND `'ios'`.
3. **W2 (i) — the code box keeps focus and the keyboard through the POST and after a wrong code.** The `Input` is ⛔ `disabled` /
   ⛔ `readOnly` / ⛔ `editable={false}` at any time on this step (DL3); Continue stays disabled with its spinner during the POST; Skip
   stays enabled (P7). On the device: after a 422 the box has input focus and the keyboard is up (`dumpsys input_method` →
   `mInputShown=true`), with no tap.
4. **R1 still holds.** During a POST a change to the box is ignored and the box shows the SENT code; the saved / not-found result refers
   to the code that was sent; a retry after a 422 sends the new code. The R1 legs are updated only where they asserted `readonly`
   (now: ⛔ read-only, and the change still ignored); their "value stays the SENT code" and "the retry sends the new code" assertions are
   kept. On the device: during a held POST (`kill -STOP <api pid>`), a single backspace leaves the box showing all six SENT digits
   (screenshot); then a RAPID multi-edit — a held backspace (`adb shell input keyevent --longpress KEYCODE_DEL`, or several `KEYCODE_DEL`
   in one `input keyevent` call) and a select-all + paste of six other digits — also ends with the six SENT digits (screenshot after
   each, F8's dropped-revert case); the stored row after `kill -CONT` carries the sent code. If any of these fails → DL3's fallback,
   recorded.
5. **Nothing else changes.** N1 (409 / 429 / 5xx / timeout / no network → on to KYC, ⛔ message, ⛔ error spoken), P3 (a result that lands
   while blurred is kept), R2 (⛔ navigation while blurred), R3 (the code label announced on Yes), P7, the saved line and its timer, the
   copy keys (⛔ change to `packages/i18n/locales/{en,hi}/common.json`), the route and the contracts — every existing leg in
   `assisted-step-render.test.ts` stays green, changed only as AC 4 allows.
6. **Shown on the Android emulator** with the Story 3.15 device-pass setup (memory [[project_mobile_android_emulator_setup]], "Device-pass
   recipe that worked 2026-11-23"): Hindi, Gboard, `Pixel_9` / Android 15, a debug build of THIS branch. TalkBack speech captured with
   the TTS engine disabled (every utterance logged as `TTS is not ready … text:…`), ⚠ ⛔ `uiautomator dump` during a speech capture (it
   turns TalkBack off); drive by coordinates. Legs, each recorded with what was seen: (a) 422 → the not-found line logged ONCE, and —
   with TalkBack still ON, so the screen-reader member's case — `adb shell dumpsys input_method | grep mInputShown` →
   `mInputShown=true` with no tap (`dumpsys` is ⛔ a `uiautomator dump` and leaves TalkBack on); then backspace ×2 and a new code typed →
   ⛔ second utterance of it; (b) 5 digits + Continue → the format line ONCE; backspace → ⛔ re-read; (c) after the 422 the box is
   focused with the keyboard up (TalkBack OFF for this leg, so a dump is allowed); (d) AC 4's held-POST single backspace AND rapid
   multi-edit; (e) a 201 → the saved line, then KYC.
7. **Speech ON** (TTS re-enabled, TalkBack on, audio heard by BigDev or recorded — say which): the not-found line is heard in FULL after
   the 422 (not cut by a keyboard or field announcement, nor by Continue's label returning — DL7), or heard cut → DL7; V2's saved line
   heard in full or cut (DL5). Whatever cannot be heard by the agent is recorded as un-attested, ⛔ inferred from the TTS-off log.
8. **The two sibling screens are checked** (DL6): `whatsapp.tsx`'s `request` line (reachable by holding or stopping the API so the
   request fails) → a later press: re-read or not; `WaCodeEntry.tsx`'s wrong-code line → typing the next code: re-read or not — or NOT
   REACHED with the reason. Each result is recorded in `deferred-work.md`; a re-read that is seen is fixed here (DL6) or carried with an
   owner.
9. **Records.** `deferred-work.md` gets dated lines (⛔ edits to the old text): V1 → *closed by Story 3.15a* (with the device evidence);
   W2 (i) → *closed by Story 3.15a*; W2 (ii) / (iii) → what the pass exercised, or "still un-attested"; V2 → DL5's result; the
   `whatsapp.tsx` / `WaCodeEntry.tsx` results; W3 if F12 fired. `friction-budget.md` gets a `**Story 3.15a disposition (…)**` block (F13):
   ⛔ new row, ⛔ row retired, ⛔ row amended — the step's taps are unchanged; a member who mistypes the code no longer has to tap the box
   again. The emulator is restored afterwards (font scale 1.0, Gboard English only, TalkBack off, TTS on) and ⛔ seed spec, env copy or
   throwaway container is committed or left running.

## Tasks / Subtasks

- [ ] **Task 0 — Preflight**
  - [ ] 0.1 In the worktree: `pnpm install`; confirm `git status` clean and on `story/3-15a-…`; `ListAgents` before touching a shared
        checkout ([[feedback_shared_tree_branch_switch]]). Typed routes in a worktree are blind until regenerated
        ([[project_mobile_typed_routes_worktree]]).
  - [ ] 0.2 Re-derive F1, F2, F6, F8, F9, F10, F11 at HEAD by function (⛔ by line number). If `assisted.tsx` or the test moved since
        `f18f934f`, re-read both whole files before editing.
- [ ] **Task 1 — V1 in `assisted.tsx` (AC 1, 2)**
  - [ ] 1.1 Replace the two `AnnouncedText kind="error"` lines with plain tamagui `Text` (`accessibilityRole="alert"`, `color="$red10"`,
        `fontSize="$2"`, ⛔ `accessibilityLiveRegion`), keeping the `&& focused` render guard and their position under the box. Give each
        a `testID` (`assisted-error-format` / `assisted-error-not-found`) for the Android legs.
  - [ ] 1.2 Add the per-set counter (DL2) — bump it everywhere `onContinue` sets `'format'` or `'not_found'` (three sites, F1), in the
        SAME update as the `setError` call. ⛔ bump it on `setError(null)`.
  - [ ] 1.3 One effect keyed on `[focused, counter]`: if `focused` and `error !== null`, `AccessibilityInfo.announceForAccessibility(
        error === 'format' ? t('signup.assisted.format') : t('signup.assisted.not_found'))`. ⛔ `t` in the deps. Import
        `AccessibilityInfo` from `react-native`. Leave `AnnouncedText` in use for the saved line (`kind="status"`) unless DL5 changes it.
  - [ ] 1.4 Update the file's header comment: the "Accessibility" paragraph (the lines are plain text spoken once — ⛔ a live region —
        3.15a V1, citing [[project_android_live_region_reread_on_rerender]] / 6.36f D1) and the R1 paragraph (Task 2).
- [ ] **Task 2 — W2 (i) in `assisted.tsx` (AC 3, 4)**
  - [ ] 2.1 Remove `disabled={busy}` from the `Input` only. Keep `busyRef` and the early return in `onChangeText` exactly as they are
        (that guard is now R1's whole mechanism on the box). ⛔ add `editable` / `readOnly`.
  - [ ] 2.2 Rewrite the R1 header lines: *"while the POST is open a change to the box is ignored (the box stays editable so focus and
        the keyboard stay — 3.15a W2 (i)); React Native restores the controlled value, so the box shows the code that was SENT"*.
  - [ ] 2.3 Sweep every comment that still says the box is locked / unlocked (find them by grepping `unlocked`, ⛔ by line number):
        `assisted.tsx` `onContinue`'s `exitingRef` comment (*"the box is unlocked for the moment before the move"* → the moment
        before the move, with Continue enabled again), and in `assisted-step-render.test.ts` the P3 comments *"KEPT: the box is
        unlocked and the stage is `saved`"* and *"The box is unlocked while the step waits for focus"* (→ Continue is enabled again).
        Comments only — ⛔ change to what those legs assert.
- [ ] **Task 3 — Tests, RED first (AC 1–5)** — in `apps/mobile/tests/unit/assisted-step-render.test.ts`
  - [ ] 3.1 Harness: make the platform switchable (`Platform: { get OS() { return mock.os } }`, default `'ios'`, reset in
        `beforeEach`); make the `Text` mock forward `accessibilityLiveRegion` as `data-live` and `testID` (the 6.36f mock, F10); make the
        `Input` mock RECORD its props per `testID` (as the `Button` mock does) so a leg can assert `disabled` is never passed.
  - [ ] 3.2 New `describe('Story 3.15a V1 — the error lines are spoken ONCE, ⛔ a live region')`, `it.each` over `['android', 'ios']`:
        (a) 422 → the not-found line has ⛔ `data-live`, keeps `role="alert"`, `announce` called exactly ONCE with the `not_found`
        text (count calls WITH THAT TEXT — the question and code-label announcements also call `announce`); then a backspace
        (`'48291'`), then a new full code typed with ⛔ press → that count still 1; (b) 5 digits + Continue → ONCE with
        `format`; backspace → still 1; (c) Continue again with the same 5 digits → 2 (a repeat is spoken); (d) a second 422 after a
        retry → spoken again. RED on the current code: Android sees 0 calls and a `data-live` (the live region); write it, watch it
        fail, then Task 1.
  - [ ] 3.3 New `describe('Story 3.15a W2 (i) — the box is never locked')`: through a HELD POST (`held()`), the recorded `Input` props
        never carry `disabled: true` (check before, during and after); a change during the POST is ignored (value stays the SENT code);
        Continue is `aria-disabled` during it (CONTROL). ⚠ jsdom cannot show the native focus drop
        ([[project_jsdom_disabled_button_keeps_focus]]) — this leg pins the CAUSE (the prop); the device pass (AC 6 (c)) proves the
        effect. Say so in the leg's comment.
  - [ ] 3.4 Update R1's two legs and the P3 `it.each` where they assert `readonly` (F10) — and ONLY that assertion; keep every value /
        request assertion.
  - [ ] 3.5 The P3 legs (error after blur → ⛔ spoken while blurred, spoken at re-focus) must pass on Android too: add the `'android'`
        variant to that `it.each` (it is iOS-only today because the mount-time announce is iOS-only — after DL2 both platforms speak).
  - [ ] 3.6 Mutation checks, each restored byte-for-byte: (i) bring back `AnnouncedText` for the not-found line → 3.2 RED (Android);
        (ii) key the effect on `error` instead of the counter → 3.2 (c) RED; (iii) drop the `focused` condition → the P3 "⛔ while
        blurred" leg RED; (iv) put `disabled={busy}` back on the `Input` → 3.3 RED; (v) delete R1's `busyRef` early return → R1's
        "value stays SENT" RED. Record each in the Debug Log.
  - [ ] 3.7 `pnpm --filter @twt/mobile test` (whole suite), `tsc` and `eslint` in `apps/mobile` green.
- [ ] **Task 4 — Device pass on the Android emulator (AC 6, 7, 8)** — recipe in [[project_mobile_android_emulator_setup]]
  - [ ] 4.1 Throwaway `postgres:16-alpine` container (`twt_dev_app` / `devpass`, DB `twt_dev`), `NODE_ENV=development
        DATABASE_URL=…?sslmode=disable pnpm db:migrate`; seed through an env-guarded UNCOMMITTED spec: one approved T&C version (a fresh
        DB has none — signup stops at step 1) and one ACTIVE field worker with a code (for the 201 leg; Story 13.2's door). Copy main's
        git-ignored `apps/api/.env` and `apps/mobile/.env`. API with `DATABASE_URL=` prefixed. `expo run:android --no-bundler` with
        `CI=1`; Metro with `CI=1 … < /dev/null`.
  - [ ] 4.2 TalkBack ON, TTS engine DISABLED (`pm disable-user com.google.android.tts`), `logcat` filtered on the TTS line: legs AC 6
        (a), (b), (e) — one fresh member per leg (`pm clear …` + a new mobile; OTP = `"devCode"` in the API log). In (a), after the
        422 and before any tap: `dumpsys input_method | grep mInputShown` (allowed — it is ⛔ a `uiautomator dump`). ⛔ `uiautomator dump`.
  - [ ] 4.3 TalkBack OFF: AC 6 (c) (focus + `mInputShown=true` after the 422, no tap) and (d) (held POST: `kill -STOP`; a single
        backspace → screenshot; a held / multi-key backspace → screenshot; select-all + paste of six other digits → screenshot;
        `kill -CONT`, then the `member_attribution` row's code). A dump is allowed here.
  - [ ] 4.4 Speech ON (AC 7): TTS re-enabled; the not-found line after a 422 and the saved line after a 201. Ask BigDev to listen, or
        record that it was not heard — ⛔ infer.
  - [ ] 4.5 AC 8: `whatsapp.tsx` `request` line (fail the request by stopping / holding the API past 15 s), then a later press — re-read?
        `WaCodeEntry` — try to reach it; if `codeAvailable` cannot be had locally (F11), record NOT REACHED and why.
  - [ ] 4.6 Restore the emulator (font scale 1.0, Gboard English only, TalkBack off, TTS on); drop the container; delete the seed spec
        and env copies; `git status` clean except this story's files.
- [ ] **Task 5 — Conditional fixes from the pass** (only what the pass SAW)
  - [ ] 5.1 DL3 fallback if AC 4 failed on the device (record the evidence; re-run Task 3's mutations for the new shape).
  - [ ] 5.2 DL5 if the saved line was heard cut; DL7 if the not-found line was heard cut.
  - [ ] 5.3 DL6 for `whatsapp.tsx` / `WaCodeEntry.tsx` if a re-read was seen (RED-first test each; F12's W3 if `whatsapp.tsx` changes).
        Re-run the affected device leg after any fix.
- [ ] **Task 6 — Records (AC 9)**
  - [ ] 6.1 `deferred-work.md` dated lines under V1, V2, W2, W3 (if it fired) and a line for the `whatsapp.tsx` / `WaCodeEntry.tsx`
        check — closure language exact ([[feedback_closure_language_precision]]: "closed by Story 3.15a" only with evidence;
        "not reproduced" / "not reached" / "still un-attested" otherwise).
  - [ ] 6.2 `friction-budget.md`: the `**Story 3.15a disposition (…)**` block (F13), after the Story 3.15 disposition.
  - [ ] 6.3 This story: Dev Agent Record, File List, Change Log; Status → `review`.
  - [ ] 6.4 `sprint-status.yaml`: row → `review`, a dated comment line on the row, and a prepended `# last_updated:` entry (read the
        head LIVE for the next free letter; the safe prepend — [[project_sprint_status_safe_prepend]]; verify the YAML parses).
- [ ] **Task 7 — Gates and push**
  - [ ] 7.1 Commit on `story/3-15a-…` only ([[feedback_commit_on_story_branch]]); check the branch before every commit.
  - [ ] 7.2 `git push` runs `ci:local` through the pre-push hook: prefix `DATABASE_URL=<a fresh container's URL>?sslmode=disable`
        ([[project_prepush_hook_inherits_5432]]); first push with an explicit refspec (upstream unset). Run it in the background; it
        takes many minutes. A friction-budget red at commit time is F13, ⛔ a flake.

## Dev Notes

### Traps

1. **⛔ Fix it in `AnnouncedText`.** ~30 callers rely on its live region (F5). The fix is local to `assisted.tsx`.
2. **⛔ Clear-on-edit is not a fix.** 6.36f proved the live region is re-read whether the line stays or is cleared (F2). The line must
   have no live region at all.
3. **⛔ `announcementPlan` for these lines.** It is the live-region-vs-iOS split; with no live region the announce runs on BOTH platforms.
   Using it would leave TalkBack silent.
4. **⛔ Key the announcement on the error value.** `'format'` → `'format'` is no state change; a repeat press must still be spoken (DL2
   (a)). Use the counter.
5. **⛔ Speak while blurred.** An error that lands while another route is in front must wait for focus (P3, F9) — the `focused` state in
   the effect's condition, and the effect re-runs when `focused` turns true.
6. **⛔ "Restore focus with `ref.focus()`" unless DL3's fallback is triggered.** F7: Fabric runs view commands before the batch's prop
   updates; a focus right after the unlock can land on a disabled `EditText` and do nothing — invisible to jsdom.
7. **A jsdom "focus kept" assertion is vacuous** ([[project_jsdom_disabled_button_keeps_focus]]): pin the prop, prove the effect on the
   device.
8. **`uiautomator dump` turns TalkBack off** — never during a speech capture (`dumpsys input_method` does ⛔, and is how the
   TalkBack-ON leg reads `mInputShown`). Gboard's "useful tools" banner eats a tap. Changing font
   scale restarts the activity at step 1 (V3 (c)).
9. **Friction-budget AC-4 fires only after the commit** (F13) — write the disposition before pushing.
10. **Every `git push` needs `DATABASE_URL=<your container>`**; hand-format (Prettier ⛔ enforced — [[project_prettier_not_enforced]]);
    no Devanagari typed into code or tests here (the copy keys exist) — scan added lines for invisible characters
    ([[project_unicode_escapes_written_raw]]).

### What this story does ⛔ do

It does not change `AnnouncedText`, the copy, the route, the contracts, what is stored or credited, the saved line (unless DL5), Skip's
behaviour, the wizard order, the Devanagari-digit question (W1, still un-attested on other keyboards), or V3's wizard-wide items.

### Project Structure Notes

- Updated: `apps/mobile/app/(signup)/assisted.tsx`, `apps/mobile/tests/unit/assisted-step-render.test.ts`; records `friction-budget.md`,
  `_bmad-output/implementation-artifacts/deferred-work.md`, this file, `sprint-status.yaml`.
- Conditional (Task 5 only): `apps/mobile/app/(signup)/whatsapp.tsx`, `apps/mobile/components/notifications/WaCodeEntry.tsx` and their
  tests (`wa-signup-step-render.test.ts`, `wa-code-entry-render.test.ts`).
- ⛔ New file in `apps/` or `packages/`. ⛔ migration, ⛔ contract, ⛔ copy key, ⛔ decision-log entry.

### Testing

Mobile vitest only (no API or DB code changes): the whole `@twt/mobile` suite, `tsc`, `eslint`. `ci:local` via the pre-push hook.
Each new leg shown RED before the fix; each mutation in Task 3.6 RED, then restored. The device pass is a required part of done (AC 6–8),
⛔ optional.

### References

- `deferred-work.md` — "Deferred from: device pass of story 3-15 …" (V1, V2, V3) and "… code review of story 3-15 …, round 2" (W1–W3).
- `3-15-assisted-signup-field-worker-code.md` — R1, R2, R3, P3, P5, P7, N1, DL8; v1.9 (the device pass).
- `6-36f-nominee-mark-only-save.md` — device-run D1 (Completion Notes, 2026-10-27) and its test `device run D1` in
  `nominee-marks-mode-render.test.ts`.
- `apps/mobile/components/announcement-channels/ChannelLinkError.tsx`, `apps/mobile/app/(life-events)/nominees.tsx` `sayMarksNotice`.
- React Native 0.83.6 (root `node_modules/react-native`): `ReactAccessibilityDelegate.kt`, `BaseViewManager.java`
  `setAccessibilityLiveRegion`, `ReactTextInputManager.kt` `setEditable`, `fabric/mounting/MountItemDispatcher.kt`,
  `Libraries/Components/TextInput/TextInput.js`. `@tamagui/input` 2.1.0 `src/Input.native.tsx`.
- epics.md Story 3.15a.

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

## Change Log

| Version | Date | Change |
| --- | --- | --- |
| 1.0 | 2026-11-23 | Created (`bmad-create-story 3.15a`) in its own worktree off `f18f934f`. §0: ⛔ Panel question. DL1–DL6 decided by the author (DL3: ⛔ lock the box — F7 / F8). Row `backlog` → `ready-for-dev`. ⛔ Code. |
| 1.1 | 2026-11-23 | Validate pass (`bmad-create-story validate 3.15a`; BigDev: *"all"*). F1–F14 re-traced at `f18f934f` and found to hold (`origin/main` unmoved). Added: F8 the dropped-revert case (`canUpdateWithEventCount`), with a rapid multi-edit in AC 4 / AC 6 (d) / Task 4.3 and in DL3's fallback trigger; AC 6 (a) / Task 4.2 `mInputShown` read with TalkBack ON (`dumpsys`, ⛔ a dump); DL7 (the not-found line heard cut — the DL5 rule), wired into AC 7 / Task 5.2; DL2 records its narrowing of epics AC (1)'s *"where the error is set"*; Task 2.3 sweeps the stale "unlocked" comments; Task 3.2 (a) counts calls by text. Status stays `ready-for-dev`. ⛔ Code. |
