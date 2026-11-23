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

Status: done

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

- [x] **Task 0 — Preflight**
  - [x] 0.1 In the worktree: `pnpm install`; confirm `git status` clean and on `story/3-15a-…`; `ListAgents` before touching a shared
        checkout ([[feedback_shared_tree_branch_switch]]). Typed routes in a worktree are blind until regenerated
        ([[project_mobile_typed_routes_worktree]]).
  - [x] 0.2 Re-derive F1, F2, F6, F8, F9, F10, F11 at HEAD by function (⛔ by line number). If `assisted.tsx` or the test moved since
        `f18f934f`, re-read both whole files before editing.
- [x] **Task 1 — V1 in `assisted.tsx` (AC 1, 2)**
  - [x] 1.1 Replace the two `AnnouncedText kind="error"` lines with plain tamagui `Text` (`accessibilityRole="alert"`, `color="$red10"`,
        `fontSize="$2"`, ⛔ `accessibilityLiveRegion`), keeping the `&& focused` render guard and their position under the box. Give each
        a `testID` (`assisted-error-format` / `assisted-error-not-found`) for the Android legs.
  - [x] 1.2 Add the per-set counter (DL2) — bump it everywhere `onContinue` sets `'format'` or `'not_found'` (three sites, F1), in the
        SAME update as the `setError` call. ⛔ bump it on `setError(null)`.
  - [x] 1.3 One effect keyed on `[focused, counter]`: if `focused` and `error !== null`, `AccessibilityInfo.announceForAccessibility(
        error === 'format' ? t('signup.assisted.format') : t('signup.assisted.not_found'))`. ⛔ `t` in the deps. Import
        `AccessibilityInfo` from `react-native`. Leave `AnnouncedText` in use for the saved line (`kind="status"`) unless DL5 changes it.
  - [x] 1.4 Update the file's header comment: the "Accessibility" paragraph (the lines are plain text spoken once — ⛔ a live region —
        3.15a V1, citing [[project_android_live_region_reread_on_rerender]] / 6.36f D1) and the R1 paragraph (Task 2).
- [x] **Task 2 — W2 (i) in `assisted.tsx` (AC 3, 4)**
  - [x] 2.1 Remove `disabled={busy}` from the `Input` only. Keep `busyRef` and the early return in `onChangeText` exactly as they are
        (that guard is now R1's whole mechanism on the box). ⛔ add `editable` / `readOnly`.
  - [x] 2.2 Rewrite the R1 header lines: *"while the POST is open a change to the box is ignored (the box stays editable so focus and
        the keyboard stay — 3.15a W2 (i)); React Native restores the controlled value, so the box shows the code that was SENT"*.
  - [x] 2.3 Sweep every comment that still says the box is locked / unlocked (find them by grepping `unlocked`, ⛔ by line number):
        `assisted.tsx` `onContinue`'s `exitingRef` comment (*"the box is unlocked for the moment before the move"* → the moment
        before the move, with Continue enabled again), and in `assisted-step-render.test.ts` the P3 comments *"KEPT: the box is
        unlocked and the stage is `saved`"* and *"The box is unlocked while the step waits for focus"* (→ Continue is enabled again).
        Comments only — ⛔ change to what those legs assert.
- [x] **Task 3 — Tests, RED first (AC 1–5)** — in `apps/mobile/tests/unit/assisted-step-render.test.ts`
  - [x] 3.1 Harness: make the platform switchable (`Platform: { get OS() { return mock.os } }`, default `'ios'`, reset in
        `beforeEach`); make the `Text` mock forward `accessibilityLiveRegion` as `data-live` and `testID` (the 6.36f mock, F10); make the
        `Input` mock RECORD its props per `testID` (as the `Button` mock does) so a leg can assert `disabled` is never passed.
  - [x] 3.2 New `describe('Story 3.15a V1 — the error lines are spoken ONCE, ⛔ a live region')`, `it.each` over `['android', 'ios']`:
        (a) 422 → the not-found line has ⛔ `data-live`, keeps `role="alert"`, `announce` called exactly ONCE with the `not_found`
        text (count calls WITH THAT TEXT — the question and code-label announcements also call `announce`); then a backspace
        (`'48291'`), then a new full code typed with ⛔ press → that count still 1; (b) 5 digits + Continue → ONCE with
        `format`; backspace → still 1; (c) Continue again with the same 5 digits → 2 (a repeat is spoken); (d) a second 422 after a
        retry → spoken again. RED on the current code: Android sees 0 calls and a `data-live` (the live region); write it, watch it
        fail, then Task 1.
  - [x] 3.3 New `describe('Story 3.15a W2 (i) — the box is never locked')`: through a HELD POST (`held()`), the recorded `Input` props
        never carry `disabled: true` (check before, during and after); a change during the POST is ignored (value stays the SENT code);
        Continue is `aria-disabled` during it (CONTROL). ⚠ jsdom cannot show the native focus drop
        ([[project_jsdom_disabled_button_keeps_focus]]) — this leg pins the CAUSE (the prop); the device pass (AC 6 (c)) proves the
        effect. Say so in the leg's comment.
  - [x] 3.4 Update R1's two legs and the P3 `it.each` where they assert `readonly` (F10) — and ONLY that assertion; keep every value /
        request assertion.
  - [x] 3.5 The P3 legs (error after blur → ⛔ spoken while blurred, spoken at re-focus) must pass on Android too: add the `'android'`
        variant to that `it.each` (it is iOS-only today because the mount-time announce is iOS-only — after DL2 both platforms speak).
  - [x] 3.6 Mutation checks, each restored byte-for-byte: (i) bring back `AnnouncedText` for the not-found line → 3.2 RED (Android);
        (ii) key the effect on `error` instead of the counter → 3.2 (c) RED; (iii) drop the `focused` condition → the P3 "⛔ while
        blurred" leg RED; (iv) put `disabled={busy}` back on the `Input` → 3.3 RED; (v) delete R1's `busyRef` early return → R1's
        "value stays SENT" RED. Record each in the Debug Log.
  - [x] 3.7 `pnpm --filter @twt/mobile test` (whole suite), `tsc` and `eslint` in `apps/mobile` green.
- [x] **Task 4 — Device pass on the Android emulator (AC 6, 7, 8)** — recipe in [[project_mobile_android_emulator_setup]]
  - [x] 4.1 Throwaway `postgres:16-alpine` container (`twt_dev_app` / `devpass`, DB `twt_dev`), `NODE_ENV=development
        DATABASE_URL=…?sslmode=disable pnpm db:migrate`; seed through an env-guarded UNCOMMITTED spec: one approved T&C version (a fresh
        DB has none — signup stops at step 1) and one ACTIVE field worker with a code (for the 201 leg; Story 13.2's door). Copy main's
        git-ignored `apps/api/.env` and `apps/mobile/.env`. API with `DATABASE_URL=` prefixed. `expo run:android --no-bundler` with
        `CI=1`; Metro with `CI=1 … < /dev/null`.
  - [x] 4.2 TalkBack ON, TTS engine DISABLED (`pm disable-user com.google.android.tts`), `logcat` filtered on the TTS line: legs AC 6
        (a), (b), (e) — one fresh member per leg (`pm clear …` + a new mobile; OTP = `"devCode"` in the API log). In (a), after the
        422 and before any tap: `dumpsys input_method | grep mInputShown` (allowed — it is ⛔ a `uiautomator dump`). ⛔ `uiautomator dump`.
  - [x] 4.3 TalkBack OFF: AC 6 (c) (focus + `mInputShown=true` after the 422, no tap) and (d) (held POST: `kill -STOP`; a single
        backspace → screenshot; a held / multi-key backspace → screenshot; select-all + paste of six other digits → screenshot;
        `kill -CONT`, then the `member_attribution` row's code). A dump is allowed here.
  - [x] 4.4 Speech ON (AC 7): TTS re-enabled; the not-found line after a 422 and the saved line after a 201. Ask BigDev to listen, or
        record that it was not heard — ⛔ infer.
  - [x] 4.5 AC 8: `whatsapp.tsx` `request` line (fail the request by stopping / holding the API past 15 s), then a later press — re-read?
        `WaCodeEntry` — try to reach it; if `codeAvailable` cannot be had locally (F11), record NOT REACHED and why.
  - [x] 4.6 Restore the emulator (font scale 1.0, Gboard English only, TalkBack off, TTS on); drop the container; delete the seed spec
        and env copies; `git status` clean except this story's files.
- [x] **Task 5 — Conditional fixes from the pass** (only what the pass SAW)
  - [x] 5.1 DL3 fallback if AC 4 failed on the device (record the evidence; re-run Task 3's mutations for the new shape).
  - [x] 5.2 DL5 if the saved line was heard cut; DL7 if the not-found line was heard cut.
  - [x] 5.3 DL6 for `whatsapp.tsx` / `WaCodeEntry.tsx` if a re-read was seen (RED-first test each; F12's W3 if `whatsapp.tsx` changes).
        Re-run the affected device leg after any fix.
- [x] **Task 6 — Records (AC 9)**
  - [x] 6.1 `deferred-work.md` dated lines under V1, V2, W2, W3 (if it fired) and a line for the `whatsapp.tsx` / `WaCodeEntry.tsx`
        check — closure language exact ([[feedback_closure_language_precision]]: "closed by Story 3.15a" only with evidence;
        "not reproduced" / "not reached" / "still un-attested" otherwise).
  - [x] 6.2 `friction-budget.md`: the `**Story 3.15a disposition (…)**` block (F13), after the Story 3.15 disposition.
  - [x] 6.3 This story: Dev Agent Record, File List, Change Log; Status → `review`.
  - [x] 6.4 `sprint-status.yaml`: row → `review`, a dated comment line on the row, and a prepended `# last_updated:` entry (read the
        head LIVE for the next free letter; the safe prepend — [[project_sprint_status_safe_prepend]]; verify the YAML parses).
- [x] **Task 7 — Gates and push**
  - [x] 7.1 Commit on `story/3-15a-…` only ([[feedback_commit_on_story_branch]]); check the branch before every commit.
  - [x] 7.2 `git push` runs `ci:local` through the pre-push hook: prefix `DATABASE_URL=<a fresh container's URL>?sslmode=disable`
        ([[project_prepush_hook_inherits_5432]]); first push with an explicit refspec (upstream unset). Run it in the background; it
        takes many minutes. A friction-budget red at commit time is F13, ⛔ a flake.

### Review Findings

Code review 2026-11-23 (`bmad-code-review`), baseline `f18f934f` through `be38140c`, full mode. All three layers returned findings
(Blind Hunter, Edge Case Hunter, Acceptance Auditor); the reviewer verified and deduplicated them. **0 decision-needed, 3 patch,
0 new defer, 5 dismissed.** No Panel question: these are implementation and validation obligations under the existing ACs.

**Disposition (2026-11-23):** BigDev selected option 2, "Leave as action items". P1-P3 remain unchecked; no implementation patches
were applied. Story and sprint status: `review` -> `in-progress`.

- [x] [Review][Patch] **P1 — HIGH: repeated identical errors are silent on TalkBack.** [`apps/mobile/app/(signup)/assisted.tsx:136`]
  AC 2 / DL2 (a) requires a second error-setting press to be spoken again. The new counter sends the same announcement text again,
  but the committed device record (`deferred-work.md`, Story 3.15a V4) explicitly reports silence for repeated format errors,
  fresh errors after editing, and a repeated 422. A mocked API-call count does not establish speech delivery. Fix repeated-error
  delivery locally without restoring a live region or losing the code box's focus, and verify it with TalkBack. V4 is an open
  acceptance failure of this story; its existing deferred entry does not discharge AC 2. Correct the unconditional delivery claims
  in the source comments and friction-budget disposition when recording the outcome. Sources: blind + edge + auditor.
- [x] [Review][Patch] **P2 — MEDIUM: an error can be announced after the route has blurred.** [`apps/mobile/app/(signup)/assisted.tsx:137`]
  AC 2 / P3 forbids speech while blurred. The new passive effect checks captured `focused` state but ignores the existing synchronous
  `focusedRef.current`. A blur between the error's commit and its passive effect leaves the captured value true, so it speaks over
  the next route. Reproduced with the existing harness plus an alert ref callback that calls `mock.blur()` at commit: the line was
  removed, but the format announcement still fired. A test-only Vite transform adding `!focusedRef.current` to the guard made the
  same regression pass, including one announcement at refocus. Add that guard and a lasting regression for this window; retain the
  focus dependency so delivery waits for refocus. Sources: reviewer reproduction + auditor confirmation.
- [x] [Review][Patch] **P3 — MEDIUM: the required clipboard-paste leg remains unverified.** [`_bmad-output/implementation-artifacts/deferred-work.md:42`]
  AC 4 / AC 6 (d) and Task 4.3 require select-all plus a real clipboard paste during a held POST. The record explicitly says only
  typed replacement was exercised; a real paste is un-attested. That does not prove the native paste path restores the SENT code.
  Run the actual paste leg, capture the displayed six SENT digits, then verify the stored attribution after releasing the POST.
  Until it can be run, leave the paste portion of Task 4.3 explicitly open rather than treating the typed replacement as completion.
  This is a validation gap, not a demonstrated restoration failure. Sources: blind + auditor.

Validation: the existing `assisted-step-render.test.ts` passed **47/47** in this review. The separate blur-window reproducer failed
on the committed implementation and passed with the test-only synchronous-ref guard; production source was not modified. Temporary
worktree test/config files were removed; copies are at `/private/tmp/twt-3-15a-blur-repro.test.ts` and
`/private/tmp/twt-3-15a-blur-control.config.ts` (restore to their original mobile test/config locations to rerun). The existing device
records support P1 and P3; no new emulator pass or heard-audio claim is made here.

Touched invariant families: **1** — outcome/guard paths covered by the existing AC6, R1, R2, P3 and P7 tests, with P2's timing gap
and P3's native validation gap remaining open; **10** — covered by construction, since missing evidence is disclosed and the record
of BigDev's accepted un-attested AC 7 is respected; **13** — REAL GAP for repeated delivery (P1) and blurred speech (P2). The loading
element's accessible label has an existing test; buttons have handlers; no measurable-value role was introduced. Untouched families
were skipped. Existing V2, W2 (ii)/(iii), sibling-screen limitations and V5 remain in their existing records; no duplicate deferrals.

Dismissed: additional iOS device coverage beyond this story's specified pass; an unproven delayed-native-event failure; AC 7's
already accepted lack of heard audio; speculative bundle-revision mismatch; and push-authorization bookkeeping outside this review.
Test wording, refocus delivery concerns and unconditional speech claims were merged into P1 rather than counted separately.

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

Claude Opus 5.5 (`claude-opus-5-5`), `bmad-dev-story 3.15a`, 2026-11-23, in the story's own worktree.

### Debug Log References

- **Task 0.** `origin/main` unmoved at `f18f934f` after `git fetch origin`; `ListAgents` empty. F1, F2, F3, F6, F8, F9, F10, F11 re-derived at
  HEAD by function: `assisted.tsx` and its test unchanged since the pin (only records commits after it); RN 0.83.6 —
  `TextInput.js` `lastNativeText` (3 hits), `ReactEditText.kt` `canUpdateWithEventCount = eventCounter >= nativeEventCount`,
  `ReactTextInputManager.kt` `view.isEnabled = editable`, `ReactAccessibilityDelegate.kt` `ALERT -> roleDescription`;
  `@tamagui/input` `editable: !disabled && !readOnly`. All hold.
- **RED (Task 3, before Tasks 1–2):** 10 failed / 37 passed — V1 legs (android + ios) on the missing `testID` / the live region; the 400
  legs on `data-live`; W2 (i) on `disabled: true` recorded during the POST; R1 on `readonly`; P3 android 422 / 400 on the missing
  re-focus announce. **GREEN:** 47 / 47.
- **Mutations (3.6), each restored byte-for-byte (`diff` against a saved copy):** (i) `AnnouncedText` back for the not-found line → the
  two V1 422 legs RED (android + ios); (ii) effect keyed on `error` instead of `errorSet` → the two V1 format-repeat legs RED; (iii)
  `focused` dropped from the effect's condition → the four P3 error legs RED; (iv) `disabled={busy}` back on the `Input` → R1 leg 1 and
  the W2 (i) leg RED; (v) R1's `busyRef` early return deleted → both R1 legs and the W2 (i) leg RED.
- **3.7:** `@twt/mobile` 118 files / 2341 tests green; `tsc --noEmit` clean; `eslint .` clean. Added lines scanned for invisible
  characters: none. `announce.tsx`, `death-certificate-announce.ts`, `packages/i18n` — `git diff` empty.
- **Disk.** The first `expo run:android` failed `No space left on device` (208 MB free of 228 GB). My own build output removed; then,
  BigDev's choice, the 3.15 worktree's git-ignored `apps/mobile/android` removed and `docker volume prune` (13.5 GB; `fstrim` in the
  Docker VM returned it to macOS) → 15 GB free. A stale Gradle daemon from the failed build held the hash-cache lock; stopped, rebuilt:
  BUILD SUCCESSFUL in 3m 14s, installed 11:43.
- **Device pass (Task 4)** — `Pixel_9` / Android 15, app Hindi, Gboard, font 1.0; throwaway `postgres:16-alpine` on :5449, migrated;
  UNCOMMITTED seed spec (one approved T&C, three active workers: `413973`, `644932`, `916914`); API and Metro from the worktree.
  - (c) TalkBack OFF: `111111` + Continue → 422 → with ⛔ tap `mInputShown=true`, served view the focused `ReactEditText`
    (`VFED..CL. .F......`); screenshot: cursor in the box, number pad up, not-found line under it.
  - (d) TalkBack OFF: `413973`, API `kill -STOP`, Continue (spinner) → one backspace → box `413973`; five backspaces in one
    `input keyevent` → `413973`; `keycombination CTRL+A` + `input text 999999` → `413973` (screenshots e1–e3, keyboard up throughout);
    `kill -CONT` → saved, KYC; `member_attribution.attribution_source = 413973`. A first attempt was DISCARDED: its Continue tap missed
    (the cleared error line had moved the button), no POST was sent (POST count and row count unchanged) — recorded, not counted.
  - (a) TalkBack ON, TTS off: 422 → not-found line logged ONCE (11:51:19.666); `mInputShown=true` with TalkBack on, ⛔ tap; backspace
    → "1 deleted"; backspace → "1 deleted"; four more + `135790` → digits only. ⛔ re-read.
  - (b) TalkBack ON: `48291` + Continue → format line logged ONCE (11:53:56.320); backspace → "1 deleted" only. The repeat press
    (same 5 digits) logged NOTHING. Investigated: with TalkBack OFF, `uiautomator events` showed the app sending one
    `TYPE_ANNOUNCEMENT` ("कोड में 6 अंक होते हैं।") per press (two repeats + one press after an edit), ⛔ one on the backspace; with
    TalkBack ON the repeat 422 (it reached the server) was silent too, while a DIFFERENT text right after (not-found after format)
    was spoken. ⇒ the app does DL2 (a); TalkBack does not re-speak an identical announcement → `deferred-work.md` V4. A probe that
    made each text unique (`+ ' PROBE' + errorSet`, uncommitted) never reached the device — the dev client kept serving an older
    bundle (no "PROBE" in any logged or event text, so every leg above ran the COMMITTED code); reverted, `git diff HEAD` empty.
  - (e) TalkBack ON: `644932` → saved line logged, 0.8 s later "keyboard hidden", then "चरण 8 में से 3" + KYC heading; none with
    `flushGlobalTtsQueue:true`; row stored `644932`.
  - AC 7 (speech ON): ⛔ heard — BigDev: *"Not now: un-attested"*. Not inferred from the log.
  - AC 8: `pariwar_wa_config` row inserted (enabled) so the WhatsApp step shows; the wizard could not be walked past the nominee step
    (no scroll — V5), so the step was opened by deep link `twtp05://whatsapp`. Request held past 15 s → `request` line logged ONCE;
    untick / retick → nothing logged; later press → "चरण 8 में से 8", ⛔ re-read. `WaCodeEntry`: NOT REACHED (no code offer on this
    setup; F11).
  - Restored: TalkBack off, `accessibility_enabled 0`, TTS `enabled`, font 1.0; `adb reverse` removed; API and Metro stopped;
    container `twt-3-15a-pg` removed; seed spec, env copies and `apps/mobile/android` deleted. The 3.15 pass's two containers
    (`twt-3-15-pg`, `twt-3-15-push2-pg`) were found running and left as they were (not this story's).
- **`ci:local` (run directly, ⛔ pushed):** `ci:local PASSED — 41 job(s) green` at `98db8f78`, `DATABASE_URL` = a fresh `postgres:16-alpine`
  (:5450, removed after); friction-budget AC-4 read the committed `Story 3.15a disposition`.
- **Task 5:** 5.1 not triggered (AC 4 held on the device); 5.2 not triggered (nothing heard — un-attested, ⛔ "not cut"); 5.3 not
  triggered (`whatsapp.tsx` re-read not seen; `WaCodeEntry` not reached).
- **Review follow-up (2026-11-23, `bmad-dev-story 3.15a`, v1.4).** Review record committed FIRST (`e7625e94`), then the code (`8b5f4c01`).
  - **P1 — the remedy, the author's (§0; BigDev may overrule):** within the reviewer's bounds (⛔ a live region, ⛔ losing the box's
    focus) and the story's (⛔ copy key, ⛔ `AnnouncedText`), the one lever left is the TEXT: RN's Android `announceForAccessibility`
    (`AccessibilityInfoModule.kt`) sends a bare `TYPE_ANNOUNCEMENT` carrying only the text, and V4 showed a DIFFERENT text was spoken.
    So each announcement of the same line after its first carries one more trailing U+00A0 (built with `String.fromCharCode`, ⛔
    typed), counted per line in a ref (`announced`), so the FIRST of each line is the copy exactly and a re-focus re-speak (DL2 (d))
    differs from the first too. NBSP, ⛔ an ASCII space: `String.trim()` / `strip()` do not remove it. Not chosen: moving accessibility
    focus to the line (takes the screen-reader member off the box). A web search for TalkBack's rule settled nothing; the device did.
  - **P2:** the effect's guard is now `!focused || !focusedRef.current || error === null` (the reviewer's guard); the `focused` dep
    re-runs it at re-focus.
  - **RED first:** 9 new legs failed on `e7625e94` (P1 ×5 — repeats sent identical; P2 ×4 — `expected 1 to be +0`, the line spoken
    while blurred, AFTER the leg's control showed the blur landed inside the commit); harness: the `Text` mock's ref callback blurs on
    the next alert mount (`mock.blurOnAlert`, the reviewer's reproducer, now lasting); `spoken()` counts a repeat's words. **GREEN:**
    56 / 56. **Mutations,** each restored and `diff`-checked: (vi) drop the `focusedRef` guard → the 4 P2 legs RED; (vii) drop the
    suffix → the 5 P1 legs RED; (viii) one counter for both lines → the two 422 legs + P5 (d) RED; (ix) suffix keyed on `errorSet` →
    the 422 legs, the re-focus leg and P5 (d) RED. `@twt/mobile` 118 files / 2350 tests, `tsc`, `eslint` green; added lines scanned —
    ⛔ raw U+00A0 / zero-width characters.
  - **Device pass (P1, P3)** — `Pixel_9` / Android 15, Hindi, Gboard, a fresh prebuild + debug build of `8b5f4c01`; throwaway
    `postgres:16-alpine` on :5451, migrated; UNCOMMITTED seed spec (one approved T&C; workers `657454`, `687409`, `163417`); Metro started
    with `-c`. One fresh member (`9876500101`). `adb shell input tap` is delivered to the app window, ⛔ intercepted by TalkBack's touch
    exploration — one tap = one press with TalkBack ON (two parallel taps logged "Inconsistent event" and closed the keyboard; recorded,
    not counted). Device clock ≈ 3.5 s behind the Mac's.
    - P1, TalkBack ON, TTS off (`TTS is not ready … text:` lines; trailing U+00A0 counted by a script): 5 digits, four presses →
      the format line logged four times with 0 / 1 / 2 / 3 no-break spaces (the pass before this fix logged only the first); a
      backspace → "1 deleted" only; a fresh format set after the edit → logged (4); `111111` → 422 → not-found logged (0), with
      `mInputShown=true`; the same press again → logged (1); backspace + `1` + press → logged (2). The suffixes show the device ran the
      new bundle.
    - P3, TalkBack OFF: CONTROL — `999999` typed, select-all, `KEYCODE_COPY`; `123123` typed; select-all + `KEYCODE_PASTE` → the box
      showed `999999`. Held leg — `657454` typed; 0 rows; API `kill -STOP`; Continue (spinner); select-all + `KEYCODE_PASTE` → the box
      showed `657454`, spinner on (screenshots). `kill -CONT` ≈ 18 s after the press — past the 15 s bound, so the step most likely moved
      on by its timeout (⛔ saved line seen); it was on KYC. `member_attribution`: one row, `attribution_source = 657454`.
    - P2: ⛔ a device leg — the window (a blur between a commit and its passive effect) cannot be hit by hand; unit-only.
    - Restored: TTS enabled, TalkBack off (`accessibility_enabled 0`, services deleted), font 1.0 (unchanged), Gboard untouched;
      `adb reverse` removed; API and Metro stopped; container `twt-3-15a-p-pg` removed; seed spec, env copies and `apps/mobile/android`
      deleted; `git status` clean. Not done: speech ON (no one listened — whether the no-break spaces are silent is un-attested).
  - **`ci:local` (run directly, ⛔ pushed):** `ci:local PASSED — 41 job(s) green` at `de099c1f`, `DATABASE_URL` = a fresh
    `postgres:16-alpine` (:5452, removed after). `friction:check` passed on committed history (AC-4 read the 3.15a disposition).
- **Landed (BigDev: *"push it, open the PR, land when CI is green"*, then *"land it when ci is green"*).** `git push` at `78393b18`
  (first push, explicit refspec): the pre-push hook's `ci:local PASSED — 41 job(s) green` on a fresh container (:5453, removed after).
  PR #339; GitHub CI 41 / 41 on the PR. Fast-forward: `git push origin 78393b18:main` (`f18f934f..78393b18`, 9 commits, SHAs unchanged;
  no squash, no merge commit); GitHub marked #339 merged (2026-11-23T08:55:35Z). The push to `main`: CI run `45142550627` 41 / 41
  success; `code-escrow-mirror` red as on every push (its secret unset). Merged ≠ live: nothing is in production.

### Completion Notes List

- **V1 (AC 1, 2):** the not-found and format lines are plain tamagui `Text` (`accessibilityRole="alert"`, `$red10`, `$2`,
  `testID` `assisted-error-format` / `assisted-error-not-found`, ⛔ `accessibilityLiveRegion`), spoken by ONE
  `announceForAccessibility` from an effect keyed on `[focused, errorSet]`; `errorSet` is bumped with every `setError('format' |
  'not_found')` (helper `showError`, three sites), ⛔ on clear. `AnnouncedText` stays for the saved line. On the device: spoken once,
  ⛔ re-read on the backspaces that clear it.
- **W2 (i) (AC 3, 4):** `disabled={busy}` removed from the `Input` only; Continue keeps `disabled` + spinner; Skip unchanged; R1 is
  the `busyRef` guard plus RN's controlled-value revert. On the device: focus and keyboard kept after a 422 (TalkBack off and on), and
  a held POST's single, multi and select-replace edits all left the SENT code, which is what was stored.
- **Tests:** harness — switchable `Platform.OS`, `Text` mock forwards `accessibilityLiveRegion` (`data-live`), colour and size,
  `Input` mock records every render's props; new V1 legs (422 once / backspace / new code / second 422; format once / repeat / backspace;
  400) on android AND ios; new W2 (i) leg (held POST: ⛔ `disabled` / `readOnly` / `editable={false}` before, during, after; change
  ignored; Continue disabled CONTROL); R1's `readonly` assertion inverted, its value / retry assertions kept; P3 error legs on both
  platforms. 47 / 47.
- **Findings for BigDev (recorded in `deferred-work.md`, owner NONE YET):** **V4** — TalkBack does not speak an announcement equal to
  the last one, so DL2 (a)'s repeat is silent on Android (the app sends it; also bears on `use-wa-code.ts` and `ChannelLinkError`);
  **V5** — the signup nominee step has no scroll container and its lower half was not reachable on a Pixel 9 (pre-existing; possibly
  blocks signup on such phones — not established). V2 and AC 7: un-attested (not heard).
- **Not done here:** Task 7.2 (`git push`, which runs `ci:local` through the pre-push hook) — an outward action, left for BigDev's
  word.
- ✅ Resolved review finding [HIGH]: P1 — repeated identical errors silent on TalkBack. A repeat is sent as different text (trailing
  no-break spaces, per line); on the emulator every repeat (format ×4, 422 ×3, after an edit and without one) was passed to speech
  (TTS-off capture, ⛔ heard). Source comments say SENT, ⛔ "spoken"; the friction-budget disposition corrected the same way. V4: dated
  line — `assisted.tsx` addressed; `use-wa-code.ts` / `ChannelLinkError` ⛔ addressed (owner NONE YET).
- ✅ Resolved review finding [MEDIUM]: P2 — an error could be announced after the route blurred. `focusedRef` added to the effect's
  guard; a lasting regression on both platforms for the 422 and the format line (blur inside the commit → ⛔ spoken; once at re-focus).
- ✅ Resolved review finding [MEDIUM]: P3 — the clipboard-paste leg. Run with a real `KEYCODE_PASTE` (control first: it pastes into the
  idle box); during the held POST the box kept the SENT code and the stored row is the sent code. The earlier note that adb cannot
  paste was wrong and is corrected by a dated line in `deferred-work.md` (W2). ⚠ The hold ran past the 15 s bound; a paste from
  Gboard's clipboard chip was ⛔ run.

### File List

- `apps/mobile/app/(signup)/assisted.tsx` (modified)
- `apps/mobile/tests/unit/assisted-step-render.test.ts` (modified)
- `friction-budget.md` (modified — the Story 3.15a disposition)
- `_bmad-output/implementation-artifacts/deferred-work.md` (modified — dated lines on V1, V2, W2; the 3.15a device-pass section)
- `_bmad-output/implementation-artifacts/3-15a-assisted-step-error-spoken-once-and-focus-kept.md` (this file)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified — row and ledger)

## Change Log

| Version | Date | Change |
| --- | --- | --- |
| 1.0 | 2026-11-23 | Created (`bmad-create-story 3.15a`) in its own worktree off `f18f934f`. §0: ⛔ Panel question. DL1–DL6 decided by the author (DL3: ⛔ lock the box — F7 / F8). Row `backlog` → `ready-for-dev`. ⛔ Code. |
| 1.1 | 2026-11-23 | Validate pass (`bmad-create-story validate 3.15a`; BigDev: *"all"*). F1–F14 re-traced at `f18f934f` and found to hold (`origin/main` unmoved). Added: F8 the dropped-revert case (`canUpdateWithEventCount`), with a rapid multi-edit in AC 4 / AC 6 (d) / Task 4.3 and in DL3's fallback trigger; AC 6 (a) / Task 4.2 `mInputShown` read with TalkBack ON (`dumpsys`, ⛔ a dump); DL7 (the not-found line heard cut — the DL5 rule), wired into AC 7 / Task 5.2; DL2 records its narrowing of epics AC (1)'s *"where the error is set"*; Task 2.3 sweeps the stale "unlocked" comments; Task 3.2 (a) counts calls by text. Status stays `ready-for-dev`. ⛔ Code. |
| 1.2 | 2026-11-23 | Implemented (`bmad-dev-story 3.15a`): V1 and W2 (i) in `assisted.tsx` (`40feef55`), tests RED-first (10) then 47 / 47, mutations (i)–(v) RED; mobile suite / `tsc` / `eslint` green. Device pass on the Android emulator: V1 and W2 (i) CLOSED with evidence; AC 4 held (single, multi, select-replace); AC 7 un-attested (not heard — BigDev); AC 8 `whatsapp.tsx` re-read not seen, `WaCodeEntry` not reached. New findings V4 (TalkBack drops an identical repeated announcement) and V5 (signup nominee step does not scroll) in `deferred-work.md`, owner NONE YET. Friction-budget disposition. Status → `review`; ⛔ pushed (Task 7.2 awaits BigDev). |
| 1.3 | 2026-11-23 | Code review at `be38140c`: three layers completed; 0 decision-needed, 3 patch, 0 new defer, 5 dismissed. P1 repeated errors silent on TalkBack; P2 blur-to-effect announcement race reproduced; P3 actual clipboard-paste validation outstanding. Existing targeted tests 47/47 passed; blur reproduction failed on current code and passed with a test-only synchronous-ref guard. BigDev selected option 2, "Leave as action items"; P1-P3 remain unchecked, no implementation patches applied. Story and sprint status `review` -> `in-progress`. |
| 1.4 | 2026-11-23 | Review follow-up (`bmad-dev-story 3.15a`): review record `e7625e94` first; code `8b5f4c01`. P1 — a repeat of the same error line is sent with one more trailing no-break space (per line; the first is the copy); P2 — `focusedRef` in the error effect's guard. 9 legs RED first, then 56 / 56; mutations (vi)–(ix) RED; mobile 2350 / 2350, `tsc`, `eslint` green. Emulator: every repeated error passed to speech (TalkBack ON, TTS-off capture); a real clipboard paste during a held POST left the SENT code, which was stored. Records: `deferred-work.md` V4 and W2 dated lines; friction-budget disposition claims corrected (SENT, not heard). Status → `review`; ⛔ pushed (Task 7.2 awaits BigDev). |
| 1.5 | 2026-11-23 | LANDED on `main` by fast-forward (PR #339, `f18f934f..78393b18`, SHAs unchanged): pre-push `ci:local` 41 / 41 on a fresh container; GitHub CI 41 / 41 on the PR and on the push to `main` (run `45142550627`); `code-escrow-mirror` red as on every push. Task 7.2 done. Status `review` → `done`. Merged ≠ live. |
