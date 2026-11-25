---
baseline_commit: 8d0c1ae9
---

<!--
PINNED: `8d0c1ae9` = `origin/main` on 2026-11-25, the merge-base of this branch after its rebase (only this story's own commits sit
above it, so `<baseline>..HEAD` is this story's work alone — the code-review range and AC 1's diff). The row itself was added at
`78971e1f` (`records(3.15c): row added as backlog …`, ledger `2026-11-23q`), which reached `main` unchanged when 3.15b LANDED by
fast-forward (`57f541b3`, records `faf3ab7a`, ledger `2026-11-23u`). ⛔ Pin `78971e1f`: `78971e1f..HEAD` carries 3.15b's review code
(`0a56ec0f` — `lib/announce-repeat.ts`, `lib/session-context.tsx`, `eslint.config.mjs`) and ~17 main commits, so AC 1's empty diff
would be RED before any code. RULE: every later rebase RE-PINS `baseline_commit` (front matter + this comment) to the new
`git merge-base origin/main HEAD`.
Authored in its OWN worktree `/Users/dev/Developer/projects/TWT/.claude/worktrees/3-15c-standing-line-spoken-again-and-language-switch-spoken-once`,
branch `story/3-15c-standing-line-spoken-again-and-language-switch-spoken-once`; rebased onto `8d0c1ae9` on 2026-11-25 (backup
`backup/3-15c-pre-rebase-2026-11-25` = the pre-rebase tip `fb813ef8`). Upstream UNSET — first push with an explicit refspec
([[project_story_branch_upstream_is_main]]). The worktree was created without `node_modules` — `pnpm install` first (Task 0.1).
F1–F10 were traced at `78971e1f` and re-checked at `8d0c1ae9`; the dev still re-derives them by function at HEAD (Task 0.2 —
[[feedback_story_validate_footguns]] #11, #24 — RE-LOCATE BY FUNCTION, ⛔ by line number).

§0 GATE (the routing template's, applied FIRST): ⛔ Panel question. Everything here is HOW two existing lines reach a screen reader —
the AUTHOR's. Nothing changes who is credited, told, paid, or what is stored. The remedies the epics block leaves open ("The remedy is the
author's") are chosen below as DL1–DL7, each with its reason and an honest cost; BigDev may overrule any of them at validate or review.
BigDev's scope — *"let's give X1 and X2 an owner"*, then *"New story 3.15c, both"* — is the input, quoted, ⛔ reinterpreted.
-->

# Story 3.15c: An Unchanged Standing Line Said Again Is Spoken Again, and a Language Switch Speaks Its Line Once

Status: review

## Story

As a member who uses a screen reader on Android,
I want an error that stays on screen to be read to me again when my next try fails the same way, and a line to be read once — not
twice — when I change the app's language,
so that what I hear matches what happened.

## 📜 Policy meaning (AI-10-1)

**This story introduces ⛔ predicate that gates a member's access to a benefit, and changes none.** It changes only WHEN two existing
lines are handed to the screen reader (the WhatsApp code form's error line; the language screen's "not recorded" line); what is shown,
accepted, refused, stored or credited is unchanged, and so is every copy key. ⛔ Niyamavali check needed — no predicate.

## The rulings and records this story builds on

- **X1** — `deferred-work.md`, "Deferred from: dev of story 3-15b" (2026-11-23): an identical STANDING error line in `WaCodeEntry`
  (`verify_failed`, `send_failed`) is not spoken again on Android; the epics 3.15b premise ("an identical second wrong code") cannot
  happen (`WA_OPT_IN_CODE_MAX_ATTEMPTS = 2`). Owner line: *"OWNER: Story 3.15c"* (2026-11-23, `78971e1f`).
- **X2** — same section: with the not-recorded line showing, choosing the OTHER language makes the live region speak the new words AND
  the direct announcement send them — two TTS-off log entries ~3 ms apart (15:49:39.951 plain + 15:49:39.954 with one U+00A0). Owner
  line: *"OWNER: Story 3.15c"*. 3.15b review P3 (`57f541b3`, ledger `2026-11-23r`) re-words X2 as *"probably
  UNMASKED by Story 3.15b's suffix"* — before 3.15b the direct send was the plain text, identical to the live region's, and TalkBack drops
  an identical announcement (V4), so it was heard once; the helper now makes it differ. Inference, ⛔ proven. Either way the fix is the same.
- **BigDev, 2026-11-23:** *"let's give X1 and X2 an owner"*, then *"New story 3.15c, both"*.
- `epics.md` Story 3.15c block — AC (1)–(4) in brief; the source of the ACs below (two narrowings stated in DL4 and DL5, and one
  departure stated in DL1: iOS changes — a re-set is now announced — on F1's code evidence, ⛔ on VoiceOver evidence).
- **The pattern this story reuses** — Story 3.15a DL1 (`assisted.tsx`): an error line as PLAIN `Text` (`accessibilityRole="alert"`
  kept — on Android a role description only, ⛔ a live region), sent ONCE by a direct announcement each time it is SET; 6.36f D1 before
  it. Device-shown on `assisted.tsx` (3.15a pass + review P1; 3.15b sweep (k)).
- **Story 3.15b** — `lib/announce.ts` `announce(text, options?)`: on Android the n-th send of the same text carries n trailing U+00A0
  (BigDev heard 1 and 2 as the plain sentence, *"All 3, clean"*); the ESLint fence bars `AccessibilityInfo.announceForAccessibility*`
  outside it. NEW code calls `announce()`.
- Memory [[project_android_live_region_reread_on_rerender]] (a standing live region is re-read at a later PRESS — 6.36f D1, 3.15 V1),
  [[project_talkback_drops_identical_announcement]], [[project_mobile_android_emulator_setup]].

## Found facts (traced at `78971e1f`; re-checked at `8d0c1ae9`)

Re-check at `8d0c1ae9` (2026-11-25): `78971e1f..8d0c1ae9` under `apps/mobile/{app,components,lib}` changes only a blank line in
`assisted.tsx`, the counter clear in `lib/session-context.tsx` and comments in `lib/announce-repeat.ts` (3.15b review `0a56ec0f`), plus
the ESLint fence now naming the PROPERTY only (`announceForAccessibility*` on ANY receiver is an error — new code calls `announce()`).
⛔ file this story edits moved; `<AnnouncedText` usages still 50; the `epics.md` Story 3.15c block and the X1 / X2 lines unchanged.

- **F1 — X1 is not Android-only: an identical re-set sends NOTHING on either platform.** `components/peer-request/announce.tsx`
  `AnnouncedText`: on Android a `Text` with `accessibilityLiveRegion` (it calls nothing); on iOS `useEffect(() => { if (text)
  announceLine(text, kind) }, [text, kind])`. When `WaCodeEntry` sets the same `line` again, `errorText` is the same string, the element
  stays mounted (⛔ `key`), so the Android live region has ⛔ content change AND the iOS effect does ⛔ re-run. The epics block's
  *"iOS behaviour unchanged unless the story shows VoiceOver needs it"* is met by the code, not by VoiceOver: iOS is sent nothing today
  (VoiceOver itself is un-attested — no iOS device in this repo's passes).
- **F2 — the X1 lines and their re-set paths** (`components/notifications/use-wa-code.ts`; `WaCodeEntry.tsx` derives `errorText` from
  `form.line`; ⛔ path clears `line` at a press — `send()` and `confirm()` patch only `busy`):
  (a) `verify_failed` — `confirm()` → a non-`ApiError` (client timeout) or an unlisted `ApiError` (5xx, 429, `invalid_state`) →
  `reread()` → status `PENDING` ⇒ `patch({ line: 'verify_failed' })`, or the re-read throws ⇒ the same. The typed code is ⛔ cleared, so a
  second Confirm of the same six digits is the ordinary retry, and it lands on the same line.
  (b) `send_failed` — `send()` → `ApiError` `wa_opt_in.code_send_failed` with parseable details and ⛔ newly told ⇒ `line: 'send_failed'`;
  with `codesRemaining` 2 or 1 `sendBlocked` stays false and "Send another code" stays (after any wait), so Send again → the same line.
  (c) The `default` arm (`code_unavailable`, `code_not_offered`, `channel_unavailable`, any other 4xx) also writes `send_failed` but
  sets `sendBlocked` — ⛔ a second send, so ⛔ a re-set. (d) `wrong_retry` → `wrong_final`, and `no_longer_valid` / `no_more`, are each
  followed by different words or a closed route — ⛔ an identical re-set in ordinary use (Task 1 re-derives this list — F5).
- **F3 — the baseline on a device is ⛔ known, and may not be "silent".** A standing `AnnouncedText` line on Android was re-read by
  TalkBack at a later PRESS, before any answer (6.36f D1, API stopped), and on the edit that cleared it (3.15 V1). So on the second
  Confirm the `verify_failed` line may be (i) silent, (ii) re-read at the PRESS (≈30 s before the answer — the wrong moment), or (iii)
  re-read at the answer. X1 was ⛔ reached in 3.15a's or 3.15b's pass.
- **F4 — `WaCodeEntry` is very probably REACHABLE locally; "needs Secret Manager" is a production fact, not a local one.**
  `packages/domain/src/secrets.ts` `resolveSecretValue` uses Secret Manager only when `NODE_ENV=production`, `GOOGLE_APPLICATION_CREDENTIALS`
  is set, or `DRIZZLE_FORCE_SECRET_MANAGER=1` — main's git-ignored `apps/api/.env` sets none of the three (key names checked, values ⛔
  read); otherwise it reads an ENV FALLBACK. `apps/api/src/deps.ts` `resolveChannelSecret` derives the env name from the secret NAME
  (`[^A-Za-z0-9]` → `_`, upper-cased). `code-delivery.ts` `availability` needs: a complete config (`phone_number_id`,
  `access_token_secret_name`, `graph_api_version` non-blank) AND a template name for `hi` or `en` matching `TEMPLATE_NAME_FORM` AND a
  non-blank token. `packages/domain/src/wa-opt-in/code.ts` `checkCodeSendAllowed` also needs `enabled` and `display_phone_number`, a
  PENDING opt-in (the WhatsApp step's mint makes it) and the member in a signup state. So a seed of ONE `pariwar_wa_config` row (those
  columns) plus three env vars on the API process — `WA_TEMPLATE_WA_OPT_IN_CODE_HI_<PARIWAR UUID, upper-cased, '-' → '_'>` = a
  form-valid name (e.g. `twt_code_hi`), the same for `_EN_`, and `<TOKEN SECRET NAME upper-cased>` = any non-blank string — should make
  the mint answer `codeAvailable: true` and "WhatsApp on another phone?" show the code form. The template key is
  `packages/channels/src/wa-template-config-key.ts` `waTemplateConfigKey('wa_opt_in.code', locale, pariwarId)` =
  `wa.template.wa_opt_in.code.<hi|en>.<pariwar uuid lower-cased>` ⇒ env `WA_TEMPLATE_WA_OPT_IN_CODE_HI_<UUID>`; `TEMPLATE_NAME_FORM` =
  `/^[a-z0-9_]{1,512}$/` (`twt_code_hi` passes). The 3.15b sweep seeded a `pariwar_wa_config` row and still got `codeAvailable` false —
  consistent with this: with ⛔ env fallback set, `readCodeSecrets` throws ⇒ `template_unresolved`. The API must run with `NODE_ENV` ⛔
  `production` and ⛔ `GOOGLE_APPLICATION_CREDENTIALS` (either one sends every lookup to Secret Manager). ⚠ Un-run (the first pass to
  try it is this story's).
  **The `verify_failed` leg needs ⛔ outbound call:** with the API `kill -STOP`-ed BEFORE Send, the Send times out on the client (15 s,
  `CALL_TIMEOUT_MS`) → a non-`ApiError` → `mayHaveSent` → `sent_uncertain` + the field; type six digits; Confirm → the verify times out
  (15 s) → the re-read times out (15 s) → `verify_failed`; Confirm again → `verify_failed` again (≈30 s each). Then `kill -9` the API —
  ⛔ `kill -CONT`: a resumed process would run the held Send against Meta's real Graph API with a fake token and the seeded member's
  mobile. **The `send_failed` leg (F2 (b)) needs the server's send to ANSWER**, i.e. a real call to `graph.facebook.com` — ⛔ made from a
  dev machine (DL5).
- **F5 — the `AnnouncedText` caller inventory (epics AC (1)) — traced at `78971e1f`** (one read-only pass over every usage in
  `apps/mobile/app` + `apps/mobile/components`; three classifications spot-checked by hand — `address.tsx`, `nominees.tsx` `marksError`,
  `PeerQuestionnaire.tsx` `dateError`). **50 usages: 13 K, 11 S, 21 U, 5 O.** K = keyed, remounted on every set; S = unkeyed, the SAME
  words can be set again while it stays mounted (X1's defect); U = unkeyed, every path clears it first, so a re-set remounts; O = set at
  most once per mount / static.
  **S (11):** `WaCodeEntry.tsx` `errorText` (this story — paths below); `(life-events)/address.tsx` `address_required` (Submit with the
  field empty, Submit again — only `onChange` clears it); `(life-events)/posting.tsx` the "Show more" `history_error` (`hasNextPage &&
  isFetchNextPageError` stays true through a `fetchNextPage` retry — TanStack v5 keeps `status: 'error'` on a refetch that has data);
  `(life-events)/known-people-find.tsx` `find.no_search_results` (type "ab" → none, "abc" → still none — a STATUS line; arguably correct
  to stay quiet); `components/peer-request/PeerQuestionnaire.tsx` `peer_request.unsaved` on the load-error view (Back, Back again),
  `t(actionNotice)` (Next on an unanswered page, Next again — `required`; also `date_unsaved`), `unsavedWarning` (Back while saving,
  Back again), `peer_request.date_invalid` (Save unparseable text, Save again); `components/workplace/WorkplacePicker.tsx`
  `districts_error` once data exists (a failed retry keeps `status: 'error'`) and the "Show more" `search_error` (as `posting.tsx`);
  `components/life-events/MedicalForm.tsx` `ack_required` (Submit unacknowledged, Submit again).
  **K (13):** `known-people-find.tsx` ×2 and `nominee-link-find.tsx` (`message.seq`), `known-people.tsx` `notice.seq` and five
  `errorUpdatedAt` lines, `nominees.tsx` `marksError` / `pickNotice` (`seq: Date.now()` — two sets in one millisecond would collide) and
  `links.errorUpdatedAt`, `nominee-link-requests.tsx` (`Date.now()`, `q.errorUpdatedAt`), `NomineeForm.tsx` `notice` (`Date.now()`) and
  `${errorSeq}:${shownError}`. ⛔ key found that moves on a non-set event. All rely on *"a remounted live region holding the same words
  is spoken"* on Android — ⛔ device-shown.
  **U (21) / O (5)** — the rest (`whatsapp.tsx` `request_failed` O / `link_failed` U; `assisted.tsx` `saved` O; `(withdrawal)/index.tsx`
  U; the workplace question outcome U; the loading lines; …); nothing they say changes here.
  **`line` writes in `use-wa-code.ts`** (15; `busy: true` never touches `line`, so the line STANDS through every call): init; send 200;
  `mayHaveSent`; send `not_pending`; `code_resend_too_soon` (writes `s.line` — the CURRENT value — on purpose when ⛔ newly told; the wait
  is spoken through `waitCount`); `code_send_failed` (`send_failed` or `sent_uncertain`); `code_limit_reached`; the default arm
  (`send_failed` + `sendBlocked`); re-read PENDING (`verify_failed`); re-read other (`no_longer_valid`); re-read threw (`verify_failed`);
  verify `not_pending`; `code_wrong` ×2 (`wrong_retry` / `wrong_final`); `code_no_longer_valid`. Same-value writes in ordinary use:
  `verify_failed` (the code is ⛔ cleared, so Confirm is enabled again) and a released `send_failed` (`codesRemaining` 2 OR 1 leaves
  `sendBlocked` false, so "Send another code" stays). ⚠ The `code_resend_too_soon` arm's `line: told ? 'sent_uncertain' : s.line`
  bumps `lineCount` exactly when `told` (a new SET — `sent_uncertain`) and ⛔ otherwise (the kept line is not a new set; the answer's
  news is the wait, spoken through `waitCount`); DL1 counts only writes that set a line from the answer.
- **F6 — X2's mechanics** (`app/(settings)/language.tsx` `choose`). `setLocale(next)` runs at once, so a line already showing re-renders
  in the NEW language before the PUT's outcome; its `accessibilityLiveRegion="assertive"` speaks the new words AT THE SWITCH. Then a
  `not_recorded` outcome with `alreadyShowing` calls `announce(text)` on both platforms ⇒ twice. Two more cases follow from the same code
  (⛔ device-shown — the 3.15b sweep ran with the API stopped throughout): (i) **a FALSE "not recorded"**: line showing, the member
  switches, the PUT SUCCEEDS — the live region has already spoken "not recorded" in the new language at the switch, then the line is
  removed; (ii) **a press re-read**: the radio press re-renders beside the standing live region (F3's class). The first failure on
  Android is the live region's MOUNT (spoken — the language screen's first failures were logged in the 3.15b sweep). The `-388` item 1
  retry (the account holds the other language → a tap on the SHOWN one) failing again sets the SAME words while showing ⇒ `announce()`
  — the "same-language twice" case 3.15b's review recorded as NOT RUN.
- **F7 — tests that pin today's behaviour** (re-locate by leg name): `tests/unit/language-screen-render.test.ts` *"⭐ a failed PUT keeps
  the new language, leaves pending, shows ONE assertive alert line; announce rule (${os})"* — asserts `aria-live="assertive"`, Android
  `announce` 0 at the first failure, then a switch to Hindi while showing ⇒ announce on BOTH (that second half IS X2's double on
  Android); *"a later successful PUT removes the line"*; *"-388 item 1 … retries it and clears the alert"*. `tests/unit/wa-code-entry-render.test.ts`
  (default `mock.os = 'ios'`; `alertText()` = `screen.queryByRole('alert')?.textContent`): every `send_failed` / `verify_failed` leg reads
  the line through `alertText()` — they keep working if `accessibilityRole="alert"` is kept; ⛔ leg asserts a whole-call count on
  `mock.announce` (filters by words only — checked: `toHaveBeenCalledWith(words['waCode.done'])` and word filters). The `[ios] R2 a 502
  code_send_failed WITH a wait` leg asserts `resend_wait` once with `{ queue: true }`, ⛔ the order. ⛔ existing leg runs `verify_failed`
  under `android` — AC 2's Android legs are the first; set `mock.os` per leg and count with `sentAs` (`tests/unit/announce-text.ts`).
  The file's tamagui mock maps `accessibilityRole === 'alert'` → `role="alert"` and `accessibilityLiveRegion` → `aria-live`, and
  `announcementPlan(os, 'error').liveRegion` is `'assertive'` on BOTH platforms — so AC 2 (f) (⛔ `aria-live`) is RED on iOS too today.
  The language test's mock does the same mapping (its `AccessibilityInfo` has `announceForAccessibility` only — `choose` passes ⛔
  options). In jsdom the X2 double itself (the live region) is visible ONLY as `aria-live`: the announce COUNTS of AC 3 (b) and (c)
  cannot see it.
- **F8 — the iOS order, today.** `send_failed` + a wait in ONE answer: `AnnouncedText` is a CHILD, so its effect (iOS: `send_failed`)
  runs BEFORE `WaCodeEntry`'s own effects (the `waitCount` one queues `resend_wait`) — that is what *"QUEUED (iOS) so it follows a
  `send_failed` line spoken in the same render"* (the file header) relies on. Moving the error announcement INTO `WaCodeEntry` keeps the
  order only if its effect is DECLARED BEFORE the wait effect (effects of one component run in declaration order). On Android RN ignores
  `queue`; the order beside the live region was ⛔ device-proven, and neither is the order of two back-to-back direct announcements.
- **F9 — copy-key scans.** `tests/unit/wa-signup-copy-keys.test.ts` scans `WaCodeEntry.tsx` / `use-wa-code.ts` for LITERAL
  `t('waCode.…')` keys; `tests/unit/language-copy-keys.test.ts` does the same for the language screen — keep every key a literal
  (`translate('language.error_not_recorded', …)` included).
- **F10 — friction-budget AC-4.** All of `apps/mobile/**` is member-facing (3.15b F11), so this story owes a `**Story 3.15c disposition
  (…)**` block in `friction-budget.md`, checked against COMMITTED history ([[project_friction_budget_baseline_ratchet]]).

## Build decisions (the author's — §0; BigDev may overrule at validate / review)

- **DL1 — X1's remedy: `WaCodeEntry`'s error line becomes plain text, spoken ONCE per time it is SET, on both platforms.** (The
  3.15a / 6.36f pattern; `AnnouncedText` itself ⛔ changed.) `use-wa-code.ts` gains `lineCount: number` in `WaCodeState` (initial 0),
  bumped by every write that SETS `line` from an answer — each `patch({ line: … })` and each `setState` that sets `line`, the same value
  included — EXCEPT the `code_resend_too_soon` arm's `line: s.line` keep (F5: that arm bumps only when `told`).
  *The mechanism* (`patch(next)` cannot read `s`, so it cannot bump): ONE helper in the hook,
  `const setLine = useCallback((line: WaCodeLine, rest: Partial<WaCodeState> = {}) => setState((s) => ({ ...s, ...rest, line,
  lineCount: s.lineCount + 1 })), [])`, used by ALL 9 `patch({ line: … })` calls (send `not_pending`; the send `default` arm; re-read
  PENDING / other / threw; verify `not_pending`; `code_wrong` retry and final; `code_no_longer_valid` — the other fields go in `rest`);
  and `lineCount: s.lineCount + 1` written into the 5 `setState` arms that set `line` (send 200, `mayHaveSent`, `code_send_failed`,
  `code_limit_reached`, and `code_resend_too_soon` as `told ? s.lineCount + 1 : s.lineCount`). 9 + 5 + the initial state = F5's 15
  writes. `patch` stays for the writes that never touch `line` (`busy`); add `setLine` to `send` / `confirm`'s `useCallback` deps.
  `WaCodeEntry.tsx` renders `errorText` as a tamagui `Text` (the same font size and colour as `AnnouncedText kind="error"` gives
  it today — `$2`, `$red10`), `accessibilityRole="alert"`, ⛔ `accessibilityLiveRegion`, with a `testID`; and ONE effect, in
  `assisted.tsx`'s shape (its error effect keys on `errorSet` alone): `useEffect(() => { if (errorText) announce(errorText) },
  [form.lineCount])` — ⛔ ref. It runs (a) on every `lineCount` bump, speaking only when the line is an error (a bump to `sent` /
  `sent_uncertain` speaks nothing here — the `sendCount` effect owns those), and (b) on MOUNT, so a view that mounts holding an error
  (an expand after a collapse — today's `AnnouncedText` speaks on mount) speaks it once; kept. `form.line` is ⛔ needed in the deps (every
  change of `line` bumps `lineCount`; the one write that does not keeps the same line). ⛔ `t` / `errorText` in the deps
  ([[project_uset_fresh_closure_memo_trap]] — `useT()` is a fresh closure each render, and a language switch changes `errorText`
  without a new set); the effect body reads the render's `errorText`. Declared BEFORE the `waitCount` effect (F8).
  *Why not re-key `AnnouncedText` (`key={form.lineCount}`) — the shape five callers already use (F5):* it relies on a remounted live region
  holding the SAME words being spoken by TalkBack, which no pass in this repo has shown, and it keeps the standing live region that is
  re-read at a press (F3). *Why not a `seq` prop on `AnnouncedText`:* it changes the shared component other screens rely on (the 3.15b
  epics bar). *Cost:* on Android the line is now a plain announcement — TalkBack ⛔ appends "Alert" (3.15a accepted the same); one more
  screen with its own announce effect instead of the shared component; iOS changes (a re-set is now spoken — F1 shows nothing was sent).
  *A departure from the epics text, stated:* the block says *"iOS behaviour unchanged unless the story shows VoiceOver needs it"*; this
  rests on F1's CODE evidence (iOS is sent nothing on a re-set), ⛔ on VoiceOver evidence (no iOS device in this repo's passes) — BigDev
  may overrule (the alternative: guard the new effect to Android and keep iOS's `AnnouncedText`-equivalent once-per-words rule).
- **DL2 — the X1 baseline is recorded FIRST on the device, then DL1 applies unless the baseline already shows it right.** Before the
  `WaCodeEntry` change (Task 2), on the unchanged code, run F4's `verify_failed` leg and record what TalkBack logs at the second Confirm's
  PRESS and at its ANSWER. If it is logged exactly ONCE, at the answer, and ⛔ at the press → X1 NOT REPRODUCED: STOP and ask BigDev
  whether DL1 still applies (it would still remove the press re-read risk) — ⛔ decide alone. Otherwise (silent, or at the press) → DL1.
  If `WaCodeEntry` cannot be reached (F4 fails) → DL1 applies on F1's code evidence, recorded *"⛔ device-shown"*.
- **DL3 — X2's remedy: the language screen's "not recorded" line becomes plain text, and EVERY `not_recorded` outcome is announced ONCE,
  on both platforms, in the chosen language.** In `choose`: on `not_recorded`, `setNotRecorded(true)` and `announce(translate(
  'language.error_not_recorded', undefined, { locale: next }))` — ⛔ `alreadyShowing || Platform.OS === 'ios'` branch, and
  `notRecordedRef` goes if nothing else reads it. The line: `Text accessibilityRole="alert"`, ⛔ `accessibilityLiveRegion`, same `testID`.
  Result: a switch while showing → ONE announcement, at the failure, in the new language (X2); a switch while showing that SUCCEEDS →
  ⛔ "not recorded" spoken (F6 (i)); the radio press → ⛔ live region to re-read (F6 (ii)); the same-language retry failing again → once,
  as different text (`announce()`); the first failure → once (on Android now by `announce()` instead of the mount's live region). ⛔
  clearing the line at the switch: while the PUT is pending the line keeps showing, in the new language — as today, now silent.
  *Why not keep the live region and skip `announce()` when the words changed:* the live region speaks at the SWITCH — before the outcome,
  and on a success too (F6 (i)). *Cost:* TalkBack ⛔ appends "Alert"; the screen header comment's 3.3c `kyc.tsx` / `contact.tsx` reasoning
  is replaced (rewrite it); iOS is unchanged (it already announced every failure).
- **DL4 — the inventory (epics AC (1)) is RECORDED, and only `WaCodeEntry` is changed — a narrowing, stated.** `AnnouncedText` is ⛔
  changed, so for every other caller nothing it says changes (`git diff` shows `announce.tsx` and every other caller untouched — AC 1).
  The callers F5 classes **S** (an unkeyed line that can be set again with the same words while it stays mounted) carry X1's defect too;
  they are written up as ONE new dated `deferred-work.md` item naming each with its sequence, owner NONE YET (BigDev assigns) — ⛔ fixed
  here: BigDev's scope is X1 (`WaCodeEntry`) and X2. The class **K** callers (keyed remount) are recorded in the same item as relying on
  *"a remounted live region holding the same words is spoken"* — ⛔ device-shown.
- **DL5 — the device pass is bounded by reach and by ⛔ outbound calls.** X2 is reachable (API stopped). X1: F4's seed and env, the
  `verify_failed` leg only; the `send_failed` leg (F2 (b)) is recorded **NOT REACHED** — its only route is a real call from a dev machine
  to Meta's Graph API with a fake token and a member's mobile, which this story does ⛔ make (unit-shown only). If F4's recipe fails,
  record the gate exactly (which check answered false — the API log's `code_unavailable` detail names it) and X1 NOT REACHED. The epics
  AC (3)'s *"each `AnnouncedText` caller the inventory names re-checked for ⛔ new re-reads"* is met by the DIFF for the unchanged callers
  (a narrowing, stated: ⛔ device sweep of ~50 lines whose code did not change) and on the device for the lines that sit on the two changed
  screens — `whatsapp.tsx`'s `request` / `link` lines if they show during the X1 leg.
- **DL6 — the speech-ON listen (epics AC (4)) is asked, ⛔ assumed.** After the TTS-off capture, with TTS re-enabled, BigDev listens to X2's
  switch-while-showing leg (expect: the line once, in the new language). ⛔ Listened → recorded un-attested in BigDev's words (3.15a AC 7
  precedent: *"Not now: un-attested"*). ⛔ inferred from the log.
- **DL7 — ⛔ focus gate on `WaCodeEntry`'s announcement.** `use-wa-code.ts` already drops every late result after a blur (its `version`
  counter, bumped on blur and unmount), so a line is SET only while the step is focused. The commit-to-effect instant across a blur
  (3.15a review P2) is accepted here — recorded, ⛔ fixed: 3.15a's line stayed mounted across the blur; here the step's late results are
  dropped before they are set.

## Acceptance Criteria

1. **The inventory first (epics AC (1); DL4).** Before any code, Task 1 re-derives F5 at HEAD (`grep -rn '<AnnouncedText'
   apps/mobile/app apps/mobile/components`) — every usage classed K / S / U / O with its state trace — and lists any difference from F5
   in the Debug Log. The final `git diff <baseline>..HEAD -- apps/mobile/components/peer-request/announce.tsx apps/mobile/lib/announce.ts
   apps/mobile/lib/announce-repeat.ts apps/mobile/lib/death-certificate-announce.ts` is EMPTY, and every `AnnouncedText` caller other
   than `WaCodeEntry.tsx` is untouched.
2. **X1 — the standing line (DL1, DL2).** In `WaCodeEntry`, each time an error line is SET — the same words included — `announce()` is
   called once with its words, on Android and on iOS; the line is ⛔ a live region (role `alert` kept). Unit legs, under `android` AND
   `ios`: (a) `verify_failed` twice (Confirm → verify rejects with a 503 → status `PENDING`; Confirm again, same) ⇒ two announcements of
   `waCode.verify_failed` (Android: the second is the words + one U+00A0; iOS: identical); (b) a released `send_failed` twice (502
   `code_send_failed`, `codesRemaining: 2`) ⇒ two of `waCode.send_failed`; (c) an unrelated re-render while the line shows — a digit
   typed, a countdown tick, and the `busy` flip of the next press — ⇒ ⛔ further announcement of the line. For the `busy` flip, HOLD the
   next call (`mockReturnValueOnce(new Promise((r) => { resolve = r }))`), press, assert the count unchanged while busy, THEN resolve —
   the answer itself re-sets the line and is announced (that is (a)); (d) collapse → expand with an error
   showing ⇒ spoken once on the mount (kept behaviour); (e) iOS: `send_failed` is announced BEFORE the queued `resend_wait` in one answer
   (F8 — an ORDER assertion added: the index of the `send_failed` call < the index of the `resend_wait` call); (f) the element has
   `role="alert"`, ⛔ `aria-live`, its `testID`, and the look `AnnouncedText kind="error"` gave it — `data-color` `$red10`,
   `data-font-size` `$2` (extend this file's `tamagui` mock to record `color` / `fontSize` as `data-color` / `data-font-size`, the
   `assisted-step-render.test.ts` shape, 3.15a AC 1). RED first (legs (a), (b), (f) fail on today's code, (f) on BOTH platforms — F7;
   (e) is GREEN on today's code, where the child `AnnouncedText`'s effect runs first). Mutations, each RED then restored: in `reread()`
   call `patch` instead of `setLine` for the PENDING arm ⇒ (a) RED; declare the error effect AFTER the `waitCount` effect ⇒ (e) RED.
   Every positive count is awaited (`await waitFor(() => expect(sentAs(…)).toHaveLength(n))`); every "⛔ further announcement" is
   asserted only after a settle (an `act` flush + one macrotask) — a bare assertion straight after `findBy…` races the effect (main's
   `014b7198`, [[project_mobile_announce_after_heading_race]]) and a negative asserted before the effect ran cannot fail.
3. **X2 — the language switch (DL3).** Unit legs, under `android` AND `ios`, every count a RUNNING TOTAL of `mock.announce` calls
   (⛔ a delta — on today's Android code (b) is "one more" too: 0 then 1): (a) the first failure ⇒ total 1, in the chosen language;
   (b) a switch while the line shows, failing ⇒ total 2, the second in the NEW language (the F7 leg's second half rewritten — on Android
   it asserted 1, beside the live region's double); (c) a switch while the line shows, SUCCEEDING ⇒ total stays 1 and the line removed;
   (d) the `-388` item 1 sequence — the switch to the other language fails (total 1), then a tap on the SHOWN language (the account still
   holds the old one, so it retries) fails again ⇒ total 2, both the same words (Android: the second is the words + one U+00A0; iOS:
   identical); (e) the line has `role="alert"` and ⛔ `aria-live`. Every other leg in `language-screen-render.test.ts` green unchanged.
   RED first for (a)-android, (b)-android, (e). In jsdom the live region's own speech (X2's double; F6 (i)'s false "not recorded" at a
   switch that then succeeds) shows ONLY as `aria-live` — (e) is the leg that catches it; the counts of (b) and (c) cannot (F7).
   Totals are awaited and "stays 1" is asserted after a settle, as in AC 2.
4. **The device pass (epics AC (3); DL2, DL5)** on the Android emulator (TalkBack ON, TTS OFF capture; the served bundle checked for a
   code-only marker of THIS branch first — [[project_mobile_android_emulator_setup]] 3.15b additions): **X2** (API stopped): (a), (b),
   (d) above, plus (c) with the API resumed — each with its log lines (timestamps, trailing U+00A0 count) and an outcome **fixed** /
   **not reproduced** / **not reached**. **X1**: DL2's baseline on the unchanged code, then the `verify_failed` leg on the new code; or
   NOT REACHED with the exact gate (DL5). The `send_failed` leg recorded NOT REACHED (DL5 — ⛔ outbound call). The `whatsapp.tsx` lines on
   the same step re-checked for ⛔ new re-read if they show. ⛔ "not seen" for a leg not run ([[feedback_record_unattested_no_backfill]]).
5. **The listen (epics AC (4); DL6).** BigDev's words on X2's switch-while-showing leg with speech ON, or *"un-attested"* in BigDev's words.
6. **Records.** `deferred-work.md`: a dated line under X1 and under X2 — **CLOSED by Story 3.15c** only with device evidence on this
   branch's bundle; otherwise *"addressed in code, ⛔ device-shown"* with the gate ([[feedback_closure_language_precision]]); the X1 line
   states the `send_failed` leg's NOT REACHED and why. The DL4 inventory item (new, dated, owner NONE YET). Under V4 (its 3.15b
   code-review remainder line names `WaCodeEntry` among six "Routed, ⛔ device-shown" sites, trigger *"the next change to any of those
   files"* — this story is that change): a dated line for `language.tsx`'s same-language-twice leg (AC 4 (d)) AND for `WaCodeEntry` —
   the X1 leg's second `verify_failed` is a same-text repeat through `announce()`: its log line and trailing U+00A0 count, or NOT
   REACHED with the gate (its `sendCount` / `waitCount` calls are unchanged — say so). Each a result, ⛔ an owner claim (V4's remainder
   owner stays NONE YET). `friction-budget.md`: `**Story 3.15c disposition (…)**` APPENDED at the END of the file (after the
   `6.36b-announce-test` block, the newest at `8d0c1ae9`) — ⛔ new row, ⛔ row retired, ⛔ row amended, taps unchanged; and it states
   where the cost 3.15b's disposition item 3 left to this story stands (*"may now hear it twice on Android … Story 3.15c's X2 owns the
   fix"*): fixed on the device, or addressed in code ⛔ device-shown. `mobile` `tsc`, `eslint`, whole vitest suite green; the emulator
   restored; ⛔ seed spec, env copy or container committed or left running.

## Tasks / Subtasks

- [x] **Task 0 — Preflight**
  - [x] 0.1 `git fetch origin`; `ListAgents`. The branch was rebased onto `origin/main` `8d0c1ae9` on 2026-11-25 (3.15b LANDED) and
        pinned there. If `origin/main` has moved since: rebase again (expect a `sprint-status.yaml` ledger conflict —
        [[project_rebase_ledger_conflict_separator]]; keep both, verify the YAML parses), then RE-PIN `baseline_commit` (front matter +
        the PINNED comment) to the new `git merge-base origin/main HEAD`. Either way: `git merge-base --is-ancestor <pin> HEAD`, and run
        AC 1's `git diff <pin>..HEAD -- …` now — it must be EMPTY before any code. `pnpm install`.
  - [x] 0.2 Re-derive F1, F2, F4, F6, F7, F8 at HEAD by function; differences → the Debug Log (the grep / the code wins).
- [x] **Task 1 — The inventory (AC 1; DL4) — before any code**
  - [x] 1.1 Re-derive F5 at HEAD; record the table (file:line, words, kind, class, the state trace) in the Debug Log.
- [x] **Task 2 — The device baseline (DL2) — before the `WaCodeEntry` change**
  - [x] 2.1 Throwaway `postgres:16-alpine`, migrated; an env-guarded UNCOMMITTED seed spec (an approved T&C; one `pariwar_wa_config`
        row per F4 — `enabled`, a display number, `phone_number_id`, `access_token_secret_name`). The worktree has ⛔
        `apps/api/.env` / `apps/mobile/.env`: copy main's git-ignored ones (the 3.15a / 3.15b recipe; deleted at 6.4). The API with
        `DATABASE_URL=` and F4's three env vars prefixed (⛔ written into any `.env`), `NODE_ENV` ⛔ `production`, ⛔
        `GOOGLE_APPLICATION_CREDENTIALS` (F4). Fresh member → the WhatsApp step (`twtp05://whatsapp`) → "WhatsApp on another phone?".
        `codeAvailable` false → read the API log's `code_unavailable` detail, fix the seed / env once; still false → X1 NOT REACHED (DL5).
  - [x] 2.2 Reached: TalkBack ON, TTS OFF (`pm disable-user --user 0 com.google.android.tts`), `logcat` captured; F4's `verify_failed`
        sequence on the UNCHANGED code; record the press and answer log lines of BOTH Confirms. `kill -9` the API at the end (⛔ `-CONT`).
        Apply DL2's rule.
- [x] **Task 3 — X1 (AC 2; DL1) — RED first**
  - [x] 3.1 Write AC 2's legs in `wa-code-entry-render.test.ts` (both platforms — `mock.os` set per leg, the file defaults to `ios`;
        reuse `tests/unit/announce-text.ts` `bare` / `NBSP` / `sentAs`); watch (a), (b), (f) fail; (e) passes on today's code.
  - [x] 3.2 `use-wa-code.ts`: `lineCount` (type, `initialWaCodeState`), the `setLine` helper for the 9 `patch({ line })` calls and the
        explicit bump in the 5 `setState` arms (DL1 — F5's 15 writes; `grep -n 'line:' use-wa-code.ts` afterwards, every hit accounted
        for). `WaCodeEntry.tsx`: plain
        `Text` line + the one effect (DL1), declared before the wait effect; header comment rewritten (the `AnnouncedText kind="error"`
        sentence → DL1's why, X1, the order rule F8). `AnnouncedText` import removed if unused.
  - [x] 3.3 Mutations (AC 2): `patch` for `setLine` in `reread()`'s PENDING arm ⇒ (a) RED; move the error effect below the `waitCount` effect ⇒ (e) RED;
        restore each byte-for-byte (`diff` against a saved copy).
- [x] **Task 4 — X2 (AC 3; DL3) — RED first**
  - [x] 4.1 Rewrite the F7 announce-rule leg and add AC 3's legs in `language-screen-render.test.ts` (running totals — AC 3); watch
        (a)-android, (b)-android, (e) fail.
  - [x] 4.2 `language.tsx`: DL3; header comment lines on the announcement rewritten (why plain text: F6, X2; the 3.3c / `contact.tsx`
        sentence replaced). ⛔ `[t]` dependency (the file's own rule).
- [x] **Task 5 — Gates in the package**
  - [x] 5.1 `pnpm --filter @twt/mobile test` (whole suite), `tsc --noEmit`, `eslint .` green; added lines scanned for raw U+00A0 /
        zero-width characters ([[project_unicode_escapes_written_raw]]).
- [x] **Task 6 — The device pass (AC 4, 5; DL5, DL6)**
  - [x] 6.1 Metro `-c` from this worktree; prove the served bundle carries this branch (e.g. `grep -c lineCount` on the bundle URL).
        Reuse the installed dev client only if `git diff <its built sha> HEAD -- apps/ packages/ pnpm-lock.yaml` touches no native dep.
  - [x] 6.2 X2 legs (a)–(d) (API `kill -STOP` / `-CONT`; the account holding the other language for (d) — fail a switch first); X1's
        `verify_failed` leg on the new code (F4; `kill -9` at the end). Record each with log lines and outcome.
  - [x] 6.3 Speech ON: BigDev's listen of X2 (b) (DL6).
  - [x] 6.4 Restore: TalkBack off, Google TTS enabled + `tts_default_synth`, font 1.0, volumes (⛔ restored — their values on arrival were ⛔ read; left at 12: review P5); `adb reverse --remove-all`; API / Metro
        stopped; container removed; seed spec and env copies deleted; `git status` clean except this story's files.
- [x] **Task 7 — Records (AC 6)**
  - [x] 7.1 `deferred-work.md` lines (X1, X2, the DL4 inventory item, the V4 lines — `language.tsx` AND `WaCodeEntry`);
        `friction-budget.md` disposition appended at the END of the file, with the X2 cost's status (AC 6).
  - [x] 7.2 This story: Dev Agent Record, File List, Change Log; Status → `review`. `sprint-status.yaml`: row → `review`, a dated row
        comment, a prepended `# last_updated:` entry + the `last_updated:` block line (read the head LIVE across every branch AND
        worktree for the next free letter — [[project_sprint_status_ledger]]; [[project_sprint_status_safe_prepend]]; YAML parses).
- [ ] **Task 8 — Gates** (8.1 done; 8.2 waits for BigDev's word — push / PR / land come after review)
  - [x] 8.1 Commit on `story/3-15c-…` only, branch checked before each commit ([[feedback_commit_on_story_branch]]); `friction:check`
        after the commit.
  - [ ] 8.2 The gate is GitHub `ci.yml` (ADR-0047, ratified 2026-11-24): the push and the PR are BigDev's word; the story lands only
        when the PR's `ci.yml` run AT THE EXACT TIP SHA concluded `success` on every job (cl.1) — `scripts/land.sh --dry-run <pr>` first,
        then `scripts/land.sh <pr>` (fast-forward; ⛔ squash, ⛔ merge commit). The ledger line cites the run id, the tip SHA and jobs
        passed / total for the PR run AND the push to `main` (cl.2); `code-escrow-mirror` is red on every push — not part of the gate.
        `ci:local` is advisory (cl.3 — not needed for a mobile-only change; if run, a FRESH container, `DATABASE_URL=…?sslmode=disable`);
        the pre-push hook runs it only with `RUN_CI_LOCAL=1` (cl.4 — [[project_prepush_hook_inherits_5432]]).

### Review Findings

Code review 2026-11-25 (`bmad-code-review 3.15c`), pinned range `8d0c1ae9..fb430b00` (= `baseline_commit` = `main`'s tip; code `a47e35c3`),
full mode, worktree clean before and after the layers. All three layers returned findings (Blind Hunter 15, Edge Case Hunter 3, Acceptance
Auditor 10); the reviewer verified each claim against the code and the records at `fb430b00` and deduplicated.
**0 decision-needed, 6 patch, 1 defer, 16 dismissed.** No Panel question: nothing here changes what a person is told, owed or asked to
consent to (§0 holds) — every item is test coverage, records wording or an implementation choice, decided below by the reviewer; BigDev
may overrule any of them. Reviewer-run evidence: `wa-code-entry-render.test.ts` + `language-screen-render.test.ts` green at the tip
(99 tests: 15 + 84); `pnpm friction:check` passes and names this story's disposition.
AC 1, AC 2 and AC 3's CODE are delivered as written (AC 1's diff over the four `announce*` files is empty; all 15 `line` writes are
accounted for; the error effect keys on `[form.lineCount]` only and is declared before the `waitCount` effect; both lines are role
`alert` with no live region; `notRecordedRef` and `Platform` are gone); the patches below are what the layers found AROUND them.

**Checklist (AI-6-5), touched families only** *(as found at round 1 — the REAL GAPs below are closed by the Disposition; round 2's R1 closes the one P1 left)*. 1 — covered-by-construction for the nine `setLine` writes; **REAL GAP** for the
hand-written bumps (P1). 10 — **REAL GAP** in the records (P3, P4, P5); honestly done: `send_failed` NOT REACHED, Task 8.2 left open, the
volumes disclosure, the stated iOS departure. 13 (a) (b) (c) — covered-by-construction (the two changed `Text` nodes carry no label, no
value role and no interaction role). 13 (d) — covered-by-test for `verify_failed`, a released `send_failed` and `not_recorded`;
**REAL GAP** for the other error lines (P1); `send_failed` on a device is UN-ATTESTED.

**UN-ATTESTED by the diff (carried, ⛔ a finding — nothing to patch):** all device evidence (log lines, timestamps, counts, *"Once,
clean"*, the restore). The code commit `a47e35c3` is dated 09:40:49 and every device leg (09:05–09:39) ran on the UNCOMMITTED tree, so
"the 3.15c bundle (`a47e35c3`)" means byte-identical to the commit — which the diff cannot show (the served-bundle markers `lineCount` ×24 /
`wa-code-error` ×1 are the only handle). The X1 baseline (ended 09:14:05) and the new-code Confirm 1 (09:22:41) have Tasks 3–5 between
them. Mutation REDs, the 2385-test figure, `tsc` and `eslint` were not re-run by the reviewer (only the two files above were).

**Disposition (2026-11-25):** BigDev selected option 1, "Apply every patch". P1–P6 applied, ⛔ committed (uncommitted on `story/3-15c-…`).
Production code is ⛔ touched — the patches are one test file and records. Story status stays `review`: `done` is reserved for a story
landed on `main` (the 3.15 round-2 / 3.15b precedent — all patches applied, the row stays `review`); `sprint-status.yaml` is unchanged.
- **P1** — `wa-code-entry-render.test.ts` leg (g): eight sets × two platforms (`wrong_retry`; `wrong_final`; `no_longer_valid` by
  Confirm's `code_no_longer_valid`, Confirm's `not_pending`, the status re-read and Send's `not_pending`; `no_more` by the hand-bumped
  `code_limit_reached` arm; `send_failed` by the default arm), each asserting ONE announcement of its words, after a settle. Mutations,
  each RED then restored with `git checkout --`: `wrong_retry`, `wrong_final`, the default-arm `send_failed` and `code_no_longer_valid`
  reverted to `patch`; the `no_more` arm's `lineCount` bump dropped; the three `no_longer_valid` lapsed sites (Send, re-read, Confirm)
  reverted to `patch` — each turned exactly its own two cases RED (one per platform) and nothing else.
- **P2** — legs (h) (a language switch while an error stands: the words change, the count does not) and (i) (an error set while the
  form is collapsed: nothing then, once on expand), per platform; `toSent` takes an optional `extra` child under the same
  `LocaleProvider`. Mutations: `errorText` added to the effect's deps ⇒ ONLY (h) RED ×2 (no earlier leg caught it); the effect
  skipping its mount run ⇒ (d) and (i) RED ×4.
- **P3 / P4 / P5** — corrected in `deferred-work.md` (the X1, X2 and V4 dated lines; Y1), `friction-budget.md` (item 2) and this file
  (Task 6.4; the Debug Log's F5 sentence). Counts that were never logged are stated as ⛔ recorded, ⛔ backfilled; the listen's count is
  stated with its premise (2 if the counter was not reset by the 401, 1 if it was). The Android order of `send_failed` + `resend_wait` is
  recorded as un-attested; the code remedy stays the author's call, ⛔ made. Change Log row 1.3 is left as written; row 1.4 supersedes
  its "X2 (a)–(d) fixed".
- **P6** — the `text` mock sets `data-selectable`.
- **Verified after the patches:** `wa-code-entry-render.test.ts` 104 passed (84 before: +16 (g), +2 (h), +2 (i)) and
  `language-screen-render.test.ts` 15 (unchanged); mobile `eslint` on the edited test and `tsc --noEmit` exit 0; `pnpm friction:check`
  passes; every edited file valid UTF-8, ⛔ invisible character in an added line. ⛔ re-run: the whole mobile suite (the 2385 figure) —
  the patches add cases to one file and touch no production code.

- [x] [Review][Patch] **P1 — MEDIUM: five of the seven error lines have no announcement-count leg, and a write that forgets its
  `lineCount` bump now drops even a CHANGED line.** [`apps/mobile/components/notifications/use-wa-code.ts` `setLine` sites and the hand-bumped
  arms; `apps/mobile/tests/unit/wa-code-entry-render.test.ts` AC 2 describe] AC 2's legs (a) and (b) count only `verify_failed` and a
  released `send_failed`. `grep` finds no announce-count assertion for `wrong_retry`, `wrong_final`, `no_longer_valid` (four sites),
  `no_more` (the hand-bumped `code_limit_reached` arm) or the default-arm `send_failed`. Before this story `AnnouncedText` spoke every one
  of them whenever its WORDS changed; now the effect keys on `lineCount` alone, so reverting any one site to `patch({ line })` (or
  dropping a hand-written bump) silences a line that used to be spoken — and the whole suite stays green. The dev followed AC 2's list to
  the letter; AC 2's headline sentence ("each time an error line is SET … `announce()` is called once") is wider than its list. Fix: one
  table-driven leg per OS that sets each remaining line once and asserts exactly one announcement of its words (`wrong_retry`,
  `wrong_final`, `no_longer_valid` via the confirm path, `no_more` via `code_limit_reached`, the default-arm `send_failed`); one
  mutation per hand-bumped arm (drop its `lineCount` bump ⇒ RED, restored). *(Auditor #1; Blind #2.)*
- [x] [Review][Patch] **P2 — LOW-MEDIUM: the `[form.lineCount]`-only dependency is not pinned against `errorText`, and "set while
  collapsed" is untested.** [`apps/mobile/components/notifications/WaCodeEntry.tsx` the error effect; the AC 2 describe] The header says a
  language switch changes the words without a new set, so a standing line must stay silent. A change to `[form.lineCount, errorText]`
  passes every current leg (a repeated set bumps `lineCount` anyway; the digit and countdown legs keep the same text); only a `t` dependency
  would be caught (`useT()` is a fresh closure each render). Separately, the mount-time run is what speaks an error set WHILE the form is
  collapsed once it is expanded — leg (d) covers only collapse/expand after the error was set expanded. Fix: two legs — a standing
  `verify_failed`, a locale switch through the test's `LocaleProvider`, count stays 1; an error resolved while collapsed (hold the
  confirm, collapse, resolve, expand) ⇒ spoken once. Mutation: add `errorText` to the deps ⇒ RED, restored. *(Edge #3.)*
- [x] [Review][Patch] **P3 — LOW-MEDIUM (records, Family 10): the Android order of `send_failed` then `resend_wait` from ONE answer is
  un-attested and appears in no record.** [`_bmad-output/implementation-artifacts/deferred-work.md` the X1 dated line; `friction-budget.md`
  disposition items 2–3] A `code_send_failed` answer carrying `retryAfterSeconds` bumps `lineCount` and `waitCount` together, so on Android
  the two effects now send two direct announcements back to back and RN ignores `queue` there. The story's F8 says so at design time
  ("neither is the order of two back-to-back direct announcements" — and the old live-region arrangement was ⛔ device-proven either), and
  test (e) is iOS-only; but neither the X1 line nor the friction disposition carries it, and the `send_failed` leg is NOT REACHED on a
  device. ⚠ NOT a regression the evidence can show — the old order was un-proven too; the risk class changed (live region beside a direct
  call → two direct calls). Fix: one sentence in each record (the pairing, `queue` ignored, order un-attested, the leg NOT REACHED).
  A code remedy (one combined Android string) is the author's call and ⛔ part of this patch. *(Auditor #5; Edge #2; Blind #1.)*
- [x] [Review][Patch] **P4 — MEDIUM-LOW (records, Family 10): the listen's "1 trailing U+00A0" is computed, ⛔ logged, and disagrees with
  the record's own counts; X2's per-leg counts and outcome labels are missing or overstated.** [`deferred-work.md` the X2 and V4 dated
  lines; this file's Debug Log, Task 6] (i) The V4 line gives the listened Hindi line "1 trailing U+00A0 (by the per-text counter, ⛔
  logged)". The same record puts the English lines at 2 (09:30:55.693) and 3 (09:31:16.004) and calls the first "the third send of those
  words in the session" — so the counter was ⛔ reset by the 401 re-sign-in — and the Hindi sends before the listen are 09:25:10.386 and
  09:28:27.226, which makes the listened line the THIRD Hindi send ⇒ 2, not 1. Either value was already heard in 3.15b (V4: "heard only at 1
  and 2"), so V4's remainder is unchanged; the stated number is not. (ii) AC 4 asks each X2 leg for "log lines (timestamps, trailing U+00A0
  count) and an outcome"; (a), (b), (c) carry timestamps but no counts. (iii) (c)'s "(the false announcement the live region made at the
  switch)" is F6 (i), a code inference never shown on the old code — the story itself marks it ⛔ device-shown — yet it is worded as fact;
  and (a) was spoken once by the live region's MOUNT before the fix (F6), so its outcome is "not reproduced / kept", ⛔ "fixed" (row 1.3
  and the V4 line say "fixed" for (a)–(d)). Fix: the listen's count stated as not logged (speech ON logs no text) with its derivation and
  premise, ⛔ a bare 1; the counts that were not logged stated "not recorded", ⛔ backfilled
  ([[feedback_record_unattested_no_backfill]]); (c)'s parenthetical marked a code inference; (a)'s outcome relabelled
  ([[feedback_closure_language_precision]]). *(Auditor #2, #3.)*
- [x] [Review][Patch] **P5 — LOW (records): Y1 miscounts its own sites, and Task 6.4 is ticked with "volumes" not restored.**
  [`deferred-work.md` Y1; this file Task 6.4] Y1 says "nine more `AnnouncedText` lines … (`WaCodeEntry` was the tenth)"; the inventory's S is
  9 INCLUDING `WaCodeEntry` (F5's 11, less the two stated moves), and the sites Y1 lists are eight ⇒ "eight more … the ninth". Y1 says F5
  "did not list those usages one by one" and the Debug Log "F5 listed those usages only in part": F5 names 16 K sites (3 + 6 + 3 + 2 + 2) against its headline of 13, so
  K 13 → 16 is F5's own miscount, ⛔ a reclassification. Task 6.4 lists "volumes" among what is restored and is ticked; the Debug Log
  (honestly) says they were set to 12 for the listen and their arrival values were ⛔ read. Fix: correct the count and the F5 remark;
  annotate the tick ("volumes: ⛔ restored — arrival values not read, left at 12"). *(Auditor #4, #6.)*
- [x] [Review][Patch] **P6 — LOW (test fidelity): the `tamagui` mock's `Text` was REPLACED, not extended — it drops `data-selectable`.**
  [`apps/mobile/tests/unit/wa-code-entry-render.test.ts` the `text` mock beside `container`] AC 2 (f) says "extend this file's `tamagui`
  mock"; `Text: text` maps only `testID`, `alert`, `aria-label`, `aria-live`, `data-color`, `data-font-size`, while `container` also set
  `data-selectable`, and `OtherPhoneDetails.tsx:26,32` render `<Text selectable>`. Nothing in this file asserts it today (verified by
  `grep`), so no leg is wrong — a future one would silently read `undefined`. Fix: add `'data-selectable': props.selectable ? 'true' :
  undefined` to `text`. *(Auditor #9; Blind #6.)*
- [x] [Review][Defer] **W1 — overlapping taps on the language screen announce once PER TAP, each in the language it captured.**
  [`apps/mobile/app/(settings)/language.tsx` `choose`; `apps/mobile/lib/app-language.ts` `flush`] `flush()` hands every same-member,
  same-storage caller the SAME `flushing.result` promise, so two taps inside one PUT window each run their own `.then`, each
  `announce()`s, each in the `next` it closed over — the first in a language that is no longer on screen. Offline, where the PUT holds to
  `CALL_TIMEOUT_MS`, a member trying both languages makes it likely. Verified in the code; the new legs never overlap taps. — deferred,
  pre-existing in shape: the old code also announced for every overlapping `.then` after the first (iOS for all of them), and AC 3 reads
  per outcome; the fix is a design choice (latest-choice-wins vs once per outcome), ⛔ unambiguous. Owner: NONE YET (BigDev assigns).
  *(Edge #1; Blind #4.)*

**Dismissed (16), with the reason:** Blind — the missing `exhaustive-deps` suppression (no `react-hooks` rule in `eslint.config.mjs`); fake
timers "never restored" (`afterEach` calls `vi.useRealTimers()`); NBSP assertions "tautological / order-dependent" (the counter is reset
per test by `setup-announce-repeat.ts`, and the helper's import pre-dates this diff); the "n-th send carries n" comment (0-based, matches
the assertions); "stays" not settled after a positive count (legs (b) and (c) settle the same mechanism); language leg (d) "does not
isolate -388 item 1" (the guard reads `accountChoiceDiffers`, ⛔ the pending record — without the `syncAppLanguage` setup the second tap
returns at the guard, so the setup is load-bearing); the line "stays visible while the retry is in flight" (DL3 states it as the
design, no AC asks otherwise, and the old code did the same); the look test's hard-coded literals (AC 2 (f) names exactly them and
`AnnouncedText`'s defaults are `$2` / `$red10`); `lineCount`'s doc comment calling a thrown-error write "an answer"; re-announce on
every mount (DL1, as `AnnouncedText` did; no StrictMode in `apps/mobile`); per-OS duplication of tests (guards a reintroduced platform
branch); the `⛔` glyph's readability (the project's convention); "the platform claim lives only in comments" (the device pass and 3.15a's
`assisted.tsx` precedent carry it). Auditor — "11 new legs" vs 13 cases (11 counts the two (c) cases as one leg; the 2385 total counts
cases); the countdown leg's bare positive count (`waitFor` hangs under fake timers; the flush is awaited inside `act`); Task 8.1's
missing `friction:check` result (the reviewer ran it: passes).

### Review Findings — second round (review of the patches)

**2026-11-25, BigDev: *"Re-run code review"* (option 2).** The round-1 patch set (then UNCOMMITTED on top of `fb430b00`: one test file and
three records files, +254 / −11) went through the three layers again: Blind Hunter 20, Edge Case Hunter 3, Acceptance Auditor 8 findings.
The reviewer verified each claim against the code and the records and merged them: **0 decision-needed, 4 patch (R1–R4), 0 new defer, 20
dismissed.** No Panel question (the Auditor and the reviewer agree: test coverage and records wording). The worktree was clean before and
after the layers (the same four files). The Auditor confirms **P1–P6 delivered as their stated fixes** and found no error in the counts or
the arithmetic (84 + 16 + 2 + 2 = 104; Y1 eight / ninth; F5's K list = 16; the third-Hindi-send count); what the layers found is what the
patches left AROUND them. **Un-attested by the diff** (carried, ⛔ a finding): every mutation run and its RED / restore (the reviewer ran
them; a diff cannot show them), the 104 / 119 test counts, `tsc` / `eslint` / `friction:check` exits, and all device evidence.

- [x] [Review][Patch] **R1 — MEDIUM-LOW (Families 1 and 13 (d), REAL GAP): leg (g) misses the offline `verify_failed` — `reread()`'s catch
  arm — and its comment still says "EVERY line".** [`apps/mobile/components/notifications/use-wa-code.ts:284`
  `if (current()) setLine('verify_failed')`; `apps/mobile/tests/unit/wa-code-entry-render.test.ts` the `SETS` table] When the verify fails and the
  status re-read ALSO rejects or times out, the catch arm sets `verify_failed`. `grep` finds ⛔ test that rejects `getWaOptInStatus` (every
  call is `mockResolvedValue*`), so reverting `:284` to `patch({ line })` silences the line on both platforms and the suite stays green.
  It is the arm the device X1 leg used (Confirm → verify timeout → re-read timeout, F4), and probably the commonest real `verify_failed`.
  Round 1 missed it too (all three layers). The new comment — "EVERY line the hook SETS is announced once per set" — overclaims: the 11
  error-line write sites are the nine `setLine` calls plus the two hand-bumped error arms, and the table pinned ten. Fix: a row `the
  status re-read rejects` (`atField`, `verifyRejects(err(503, 'http.503'))`, `mock.getWaOptInStatus.mockRejectedValueOnce(new
  TypeError('Network request failed'))`, Confirm ⇒ `waCode.verify_failed` once); the comment reworded "by arm — the 11 sites today";
  mutation `:284` → `patch({ line: 'verify_failed' })` ⇒ RED ×2, restored; and one mutation for the `code_send_failed` arm's own bump
  (the other hand-bumped ERROR arm — P1 asked for one per hand-bumped arm and the Disposition claims only `no_more`'s; the `sent` /
  `sent_uncertain` arms set no error text, so their bumps change nothing audible). *(Edge #1; Auditor #2, #7; Blind — the "EVERY" claim.)*
- [x] [Review][Patch] **R2 — LOW-MEDIUM (records, Family 10): the "fixed" claims P4 superseded still stand where nothing supersedes them.**
  [this file's Completion Notes, "Dev complete" entry; `sprint-status.yaml` ledger `2026-11-25b`; this file's File List] The Completion Notes
  still read "AC 4 — X2 (a), (b), (c), (d) **fixed** on the device" and "V4 dated line (`language.tsx` same-language-twice RUN + fixed …)";
  the ledger entry `2026-11-25b` says "X2 (a)-(d) fixed". The V4 line in `deferred-work.md` now says the opposite, and Change Log row 1.4 is
  the only supersession. The File List's test-file line still reads "AC 2 legs; `Text` mock records its look". Fix: a pointer on the
  Completion Notes entry ("superseded for (a), (c), (d) and V4's same-language leg by Change Log row 1.4"); the File List line updated
  (legs (g) (h) (i), the `extra` child, `data-selectable`); the round-1 checklist paragraph marked "closed by the Disposition below". ⛔ The
  ledger is edited now — a naive rewrite of `sprint-status.yaml` truncates it ([[project_sprint_status_safe_prepend]]), and `2026-11-25b`
  is the dev's entry: this review's own ledger line (written at commit, the next free letter READ LIVE) restates the corrected X2 label;
  say so in the Disposition. *(Auditor #1, #8.)*
- [x] [Review][Patch] **R3 — LOW (records, Family 10): a stray `⛔` inverts the reading P4 (iii) asked for.** [`deferred-work.md`, the X2 (c)
  parenthetical] "`(⛔ the false "not recorded" the live region was inferred to make at the switch — F6 (i), a code inference, ⛔
  device-shown on the old code)`" — in this repo ⛔ means NOT, so the first one reads "not the false 'not recorded'". Fix: drop the first
  ⛔ (keep the second, which is meant). *(Auditor #3.)*
- [x] [Review][Patch] **R4 — LOW (records wording, three imprecisions the P3–P5 patches introduced).** (i) `deferred-work.md` X2: "⛔ recorded
  for (a), (b), (c) … the lines and times are all this record holds for them" — (c) is a PUT 200 that sent nothing, so it has no line, time
  or count; say so. (ii) Y1 and the Debug Log: "its U / O are named only as 'the rest'" — F5 names five of its 26 U / O sites
  (`whatsapp.tsx` `request_failed` / `link_failed`, `assisted.tsx` `saved`, `(withdrawal)/index.tsx`, the workplace question outcome); say
  "names five of its 26 U / O sites". (iii) the V4 listen derivation states "the third Hindi send of the session" with only the 401
  re-sign-in as its premise; add the other premise — no further Hindi send or session boundary in the un-logged window between 09:31:16.004
  and the listen (09:39:16). *(Auditor #4, #5, #6.)*

**Disposition (2026-11-25, second round):** BigDev selected option 1, "Apply every patch". R1–R4 applied, ⛔ committed (uncommitted on
`story/3-15c-…`, with round 1's). Production code is ⛔ touched; story status stays `review`; `sprint-status.yaml` is ⛔ edited.
- **R1** — leg (g) gained the row `the status re-read also rejects (offline)` — `atField`, the verify rejects, `getWaOptInStatus`
  rejects with a `TypeError` — so the table now pins nine rows (+ (a) for the re-read's PENDING arm and (b) / (c) / (e) for the
  `code_send_failed` arm = the 11 error-line write sites); its comment reads "by arm — 11 sites today" and says a NEW site needs its row.
  Mutations, each RED then restored with `git checkout --`: `reread()`'s catch arm reverted to `patch` ⇒ exactly the new row RED ×2 (one per
  platform), nothing else; the `code_send_failed` arm's `lineCount` bump dropped ⇒ the PRE-EXISTING legs (b), (c) and (e) RED (5 cases) —
  that arm was already pinned, and is now shown to be.
- **R2** — a supersession pointer on the Completion Notes' "Dev complete" entry (X2 "fixed" holds only for (b); V4's "RUN + fixed" too);
  the File List's test-file line; round 1's checklist paragraph marked. ⛔ The ledger `2026-11-25b` ("X2 (a)-(d) fixed") is edited — a naive
  rewrite of `sprint-status.yaml` truncates it ([[project_sprint_status_safe_prepend]]) and `2026-11-25b` is the dev's entry. **This
  review's own ledger line — written at commit, the next free letter READ LIVE across every branch and worktree — restates the corrected
  X2 label (CLOSED on (b)'s before / after; (a) not reproduced as a defect; (c) and (d) without a baseline).**
- **R3 / R4** — the stray ⛔ removed from the X2 (c) parenthetical; the X2 counts sentence says (c) sent nothing; Y1 and the Debug Log say F5
  names five of its 26 U / O sites; the listen derivation states its second premise (no further Hindi send or session boundary between
  09:31:16.004 and 09:39:16). The one dismissal worth BigDev's eye stays open: (g) has ⛔ completeness guard.
- **Verified after the patches:** `wa-code-entry-render.test.ts` 106 passed (104 + the 2 new cases) and `language-screen-render.test.ts` 15;
  mobile `eslint` on the edited test and `tsc --noEmit` exit 0; `pnpm friction:check` passes; every edited file valid UTF-8 and ⛔ invisible
  character in an added line. ⛔ re-run: the whole mobile suite (the 2385 figure) — the patches add two cases to one test file and touch no
  production code.

**Dismissed (20), with the reason.** Edge #2 — (h) does not exercise the `sentLine` / `waitLine` guards (`WaCodeEntry.tsx:42`, `:70`):
those guards are pre-existing code this story only moved, and the consequence is an inference; not caused by the patch. Edge #3 and Blind —
`data-selectable` is read by no test here (P6 restored parity because AC 2 (f) says "extend"; it guards nothing yet, by design). Blind — (g)'s
count is scoped to each row's own key (one `setState` per answer sets ONE line, so a second line from the same answer cannot occur; (h) uses
the total where it matters); (g) has ⛔ completeness guard (a source scan or a `patch` type that rejects `line` would add one; ⛔ built — **the
one dismissal worth BigDev's eye**: with R1 the table covers all 11 sites TODAY, and a future site is the Family 1 checklist's half, the
un-mechanized one); row labels name arms the assertion cannot see (the mutation runs proved each row reaches its arm); raw vs `details()`
payloads (the Edge Case Hunter confirmed every payload parses against the strict schema); one `settle()` as the quiet window and the
`waitFor` / `settle` mix (the house shape — AC 2: "an `act` flush + one macrotask"); the `EXPIRED` once being consumed or leaking
(`mockReset` runs in `beforeEach`; the `Once` is queued after `toSent`; `EXPIRED` and `null` share the `else`, and the row still reaches the
labelled arm); (h) never shows a LATER set speaking the new words (the effect body reads the render that bumped `lineCount`, so a stale
string is not constructible with this effect); `hindi` undefined hides a missing key (`hi/common.json` has distinct text, and `toBe(hindi)`
would fail on `undefined`); the `Probe` / locale leakage (`setLocale` is the provider's `useState` dispatcher, stable, ⛔ persisted); (i)'s
premise unproven before its negative (a verify that never ran leaves no line, so the final `alertText()` and the count would fail — ⛔ a
vacuous pass); (i) not pinning "already spoken, then collapse and re-expand" (that is the pre-existing leg (d)); `expand()` read as a toggle;
the unhandled-rejection risk of the held promise (the hook awaits it); the per-OS doubling "inert" (`announce()` reads `Platform.OS` per call,
and AC 2 asks for both); `mock.os` leakage (reset per test); three helpers for one act; the `describe` title; `toSent`'s second child.

## Dev Notes

### Traps

1. **⛔ Change `AnnouncedText`, `announcementPlan`, `lib/announce.ts` or `lib/announce-repeat.ts`** (AC 1; the epics block bars
   `lib/announce.ts`'s rule). The fix is in the two screens.
2. **`lineCount` must move on EVERY write that sets `line` from an answer, the same value included** — one that does not is exactly X1
   again; the one exception is `code_resend_too_soon`'s `line: s.line` keep (F5 — that arm bumps only when `told`). And ONLY on such a write: a bump on `busy` / `code` / `wait` writes would re-speak the line on an unrelated re-render
   (the ⛔ in the epics AC (1)).
3. **Effect order (F8)** — the error effect above the `waitCount` effect, or iOS's queued `resend_wait` no longer follows
   `send_failed`.
4. **`useT()` is a fresh closure every render** — ⛔ `t` or a `t(...)` result in any effect's deps ([[project_uset_fresh_closure_memo_trap]]).
5. **⛔ `kill -CONT` after a held WhatsApp Send** — the API would run the Send against Meta's Graph API (F4). `kill -9`.
6. **⛔ F4's env vars into a committed or copied `.env`** — prefix them on the API command line; nothing secret is in them, but the
   pattern stays clean.
7. **⛔ `uiautomator dump` during a speech capture** (it turns TalkBack off); one `adb input tap` = one press with TalkBack ON.
8. **A stale bundle looks fine** — prove the served bundle before any leg (3.15b's first round ran 3.15a's code).
9. **Unit tests show what is SENT, ⛔ what TalkBack speaks** ([[project_talkback_drops_identical_announcement]]) — "fixed" needs the log.
10. **Hand-format** (Prettier ⛔ enforced — [[project_prettier_not_enforced]]). A `git push` runs ⛔ `ci:local` unless `RUN_CI_LOCAL=1`
    is set (ADR-0047 cl.4); only then does it need `DATABASE_URL=<your container>` (the shell's is `:5432`).
11. **An announcement is made by an EFFECT after the commit** — await positive counts with `waitFor`, settle before a negative (AC 2;
    main's `014b7198` lost that race once on CI).

### What this story does ⛔ do

It does not change `AnnouncedText` or any of its other callers, `announcementPlan`, `lib/announce.ts`'s rule, any copy key, route or
contract, what is stored or credited, or the language screen's visual behaviour; it does not fix the class-S callers (DL4 — recorded),
or make a call to Meta (DL5).

### Project Structure Notes

- Updated: `apps/mobile/components/notifications/use-wa-code.ts`, `apps/mobile/components/notifications/WaCodeEntry.tsx`,
  `apps/mobile/app/(settings)/language.tsx`; tests `apps/mobile/tests/unit/wa-code-entry-render.test.ts`,
  `apps/mobile/tests/unit/language-screen-render.test.ts`; records `deferred-work.md`, `friction-budget.md`, this file,
  `sprint-status.yaml`.
- ⛔ New file in `apps/`, ⛔ package, migration, contract, copy key, decision-log entry.

### Testing

Mobile vitest only (jsdom render tests with mocked `react-native` — the two files' existing harnesses; `announce()` reaches the mocked
`AccessibilityInfo`, and the vitest setup file resets its counter per test). Each new leg RED first; the mutation in Task 3.3 RED, then
restored. The device pass (AC 4) is a required part of done; the listen (AC 5) is asked.

### Previous story intelligence (3.15b, 3.15a)

- 3.15b's sweep found the language screen easy to reach (`twtp05://language`, API stopped) and logged X2; `WaCodeEntry` NOT REACHED
  because "the other-phone details showed the number and phrase only — `codeAvailable` false" — F4 is the first attempt to reach it.
- The TTS-off log line is `E/talkback: SpeechControllerImpl … TTS is not ready … text:<…>`; count trailing U+00A0 with a `python3 -I`
  regex. TTS-off = `pm disable-user` the TTS package (a nonexistent `tts_default_synth` is NOT enough).
- Metro started before a new symbol existed can keep serving an old bundle silently — restart `-c`, `curl` the bundle, grep a marker.
- 3.15a's `assisted.tsx` is the model for a plain-text error line spoken by an effect keyed on a per-set counter (its header comment
  states the why; its `focusedRef` gate is ⛔ needed here — DL7).
- `tests/unit/announce-text.ts` (3.15b) has `NBSP`, `bare`, `sentAs` for Android-row assertions.

### References

- `deferred-work.md` — X1, X2, V4 and their dated lines; the 3.15a / 3.15b sections.
- `3-15b-repeated-announcement-sent-as-different-text.md` — F4, F9, DL7, the Task 7 sweep; `3-15a-…` DL1, review P1 / P2.
- `apps/mobile/components/peer-request/announce.tsx`, `lib/announce.ts`, `components/notifications/use-wa-code.ts`,
  `WaCodeEntry.tsx`, `app/(settings)/language.tsx`, `lib/app-language.ts` `chooseLanguage`.
- `apps/api/src/modules/wa-opt-in/code-handlers.ts` `readCodeOffer`, `code-delivery.ts` `availability` / `readCodeSecrets`,
  `apps/api/src/deps.ts` `resolveChannelSecret`, `packages/domain/src/secrets.ts` `resolveSecretValue`,
  `packages/domain/src/wa-opt-in/code.ts` `checkCodeSendAllowed`.
- `epics.md` Story 3.15c.

## Dev Agent Record

### Agent Model Used

Claude Opus 5.5 (`claude-opus-5-5`), `bmad-dev-story 3.15c`, 2026-11-25.

### Debug Log References

- **Task 0 (2026-11-25).** `git fetch origin`: `origin/main` = `8d0c1ae9` = the pin = `git merge-base origin/main HEAD` — ⛔ rebase, ⛔ re-pin. `ListAgents`: no other session. AC 1's `git diff 8d0c1ae9..HEAD -- announce.tsx lib/announce.ts lib/announce-repeat.ts lib/death-certificate-announce.ts` EMPTY before code (and after — checked again at Task 6.1). `pnpm install --frozen-lockfile`. **0.2:** F1 (AnnouncedText: Android live region, iOS effect on `[text, kind]`), F2 (`send()` / `confirm()` patch only `busy`; the 15 `line` writes), F4 (`resolveSecretValue` — Secret Manager only with `NODE_ENV=production` / GAC / `DRIZZLE_FORCE_SECRET_MANAGER`; `deps.ts` `resolveChannelSecret` env name = `[^A-Za-z0-9]`→`_`, upper-cased; `code-delivery.ts` `readCodeSecrets` / `availability`), F6 (`choose`'s `alreadyShowing || Platform.OS === 'ios'`), F7 (the pinning legs) and F8 (the send / wait effect order) re-derived by function — ⛔ difference. `78971e1f..HEAD` under `apps/mobile/{app,components,lib}`: only `assisted.tsx` (1 line), `lib/announce-repeat.ts`, `lib/session-context.tsx` — as the story's re-check says.
- **Task 1 — the inventory (AC 1; DL4).** `grep -rn '<AnnouncedText' apps/mobile/app apps/mobile/components` = 50 usages in 17 files. Re-derived by one read-only pass (an Explore agent, given the class definitions and ⛔ F5's results), then the two disagreements with F5 checked by hand. **At HEAD: K 16 / S 9 / U 14 / O 11** (F5 at `78971e1f`: 13 / 11 / 21 / 5). **Differences from F5:** `components/life-events/MedicalForm.tsx` `ack_required` is ⛔ S — Submit is `disabled={props.busy || !acknowledged}` (line 228), so the inline line cannot be set by a press (U; S only if that changed); `(life-events)/known-people-find.tsx` `find.no_search_results` is O — one continuing state while typing, ⛔ a re-set (F5 called it "arguably correct to stay quiet"); the K / U / O split differs by classification (F5 named its 16 K sites against a headline of 13 — F5's own miscount — and five of its 26 U / O sites by name, the rest only as "the rest", so a line-by-line diff of the other 21 is ⛔ possible). The table (paths under `apps/mobile/`; PQ = `components/peer-request/PeerQuestionnaire.tsx`, WP = `components/workplace/WorkplacePicker.tsx`):

  | file:line | words | class | trace |
  | --- | --- | --- | --- |
  | `app/(signup)/assisted.tsx:293` | `signup.assisted.saved` | O | set once by a successful Continue; a timer moves on |
  | `app/(signup)/whatsapp.tsx:315` | `waSignup.request_failed` | O | set only in `onContinue`; `attempted` makes later Continues move on |
  | `app/(signup)/whatsapp.tsx:316` | `waSignup.link_failed` | U | `onReopen` calls `setError(null)` before awaiting `openURL` |
  | `known-people.tsx:156` | `error.not_available` | U | Retry → `resetQueries` clears data + error ⇒ unmount |
  | `known-people.tsx:164` | `notice.text` | K | `key={notice.seq}` (a ref counter per `setNotice`) |
  | `known-people.tsx:178 / 219 / 251 / 330 / 338` | `error.load` ×5 | K | `key={…errorUpdatedAt}` — moves on every failure (338 stays mounted through `fetchNextPage` but remounts by key) |
  | `known-people-find.tsx:408 / 517` | `message.text` | K | `key={message.seq}` (counter in `say()`) |
  | `known-people-find.tsx:436` | `find.too_many` / `list.full` | O | a repeat needs mount → failed reload → retry with the same count; ⛔ trigger reaches it today (focus/reconnect refetch off) |
  | `known-people-find.tsx:451` | `find.no_search_results` | O | static empty state; a continuing state, ⛔ a re-set (F5: S) |
  | `address.tsx:78` | `lifeEvents.address_required` / refusal | **S** | Submit empty → required; Submit again → same string, ⛔ clear between (server path clears first) |
  | `nominee-link-find.tsx:364` | `message.text` | K | `key={message.seq}` |
  | `posting.tsx:87` | `saved` | U | "I have been transferred" sets false + unmounts the tree |
  | `posting.tsx:103` | `history_loading` | O | `isPending` state line |
  | `posting.tsx:106 / 119` | `history_error` | U | no-data refetch resets to pending / hidden while `isFetching` |
  | `posting.tsx:161` | `history_error` ("Show more") | **S** | `isFetchNextPageError` stays true through the `fetchNextPage` retry when data exists |
  | `nominees.tsx:511` | `marksError.text` | K | `key={marksError.seq}` (`Date.now()`; null set before each await) |
  | `nominees.tsx:569` | `error.load` | K | `key={links.errorUpdatedAt}` |
  | `nominees.tsx:607` | `form.marked*` | K | `key={pickNotice.seq}` (`Date.now()` per pick return) |
  | `nominee-link-requests.tsx:99 / 105` | `message.text` / `error.load` | K | `Date.now()` key (null first) / `q.errorUpdatedAt` |
  | `(withdrawal)/index.tsx:185` | withdrawal error | U | `setError(null)` before the network await |
  | PQ:178 | `peer_request.unsaved` (load-error view) | **S** | Back with unsent answers, Back again — only "Leave anyway" clears it |
  | PQ:454 | `failureNotice` | U | re-answering deletes the failure synchronously (edge: two generic `invalid` failures stay identical) |
  | PQ:455 | `t(actionNotice)` (`required` / `date_unsaved`) | **S** | Next unanswered, Next again (Back twice for `date_unsaved`) |
  | PQ:456 | `peer_request.unsaved` | **S** | Back while a save is pending / failed, Back again |
  | PQ:484 | `peer_request.submit_error` | U | Submit sets false before `mutateAsync` |
  | PQ:602 | the save line | U | every `save()` publishes `saving` first |
  | PQ:654 | `peer_request.unavailable` | O | static per mount |
  | PQ:665 | `peer_request.date_invalid` | **S** | Save an unparseable date, Save again — cleared only by an edit / Clear |
  | `WorkplaceSuggestionQuestion.tsx:82` | `outcome.text` | U | `onOutcome(null)` before the POST |
  | WP:135 | refusal copy | U | `setError(null)` before the await |
  | WP:143 / 320 | `districts_loading` / `search_loading` | O | state lines |
  | WP:150 | `districts_error` | **S** (U with no data) | ⛔ `!data` guard: cached districts + failed refetch, Retry fails again — `status` stays `error` |
  | WP:326 / 333 | `search_error` / `search_empty` | U | reset to pending / hidden while fetching; every new `q` passes "Searching…" |
  | WP:374 | `search_error` ("Show more") | **S** | as `posting.tsx:161` |
  | WP:434 / 478 | `typed_name_invalid` / `date_invalid` | O | derived validation, ⛔ repeat set event |
  | `MedicalForm.tsx:223` | `inlineError ?? props.error` | U | parents clear before the await; `ack_required` unreachable (Submit disabled) — F5: S |
  | `NomineeForm.tsx:343` | `form.removed` / `form.kept` | K | `key={notice.seq}` (`Date.now()`; ⛔ cleared between taps — a same-millisecond collision) |
  | `NomineeForm.tsx:348` | `shownError` | K | `` key={`${errorSeq}:${shownError}`} ``; the parent clears before each submit |
  | `WaCodeEntry.tsx:106` | `errorText` | **S** → fixed here | `confirm()` / `send()` never clear `line` (X1) |
  | `NomineeMarkControl.tsx:76` | `edit.question*` | O | stays while the question is open; reopen remounts |

- **Task 2 — the device baseline (DL2), 2026-11-25 09:05–09:14 IST.** Throwaway `postgres:16-alpine` `twt-3-15c-pg` on :5461, migrated (188 tables); main's git-ignored `apps/api/.env` / `apps/mobile/.env` copied; an UNCOMMITTED env-guarded seed spec (`SEED_3_15C=1`: an admin through the passkey fake, `pariwar_admin` on `aaaaaaaa-…`, a clause version, a T&C created + approved, one `pariwar_wa_config` row — enabled, `+91 98765 43210`, `phone_number_id` `100000000000001`, `access_token_secret_name` `twt-dev-wa-token-3-15c`). API from the worktree with `WA_TEMPLATE_WA_OPT_IN_CODE_HI_AAAAAAAA_AAAA_4AAA_8AAA_AAAAAAAAAAAA=twt_code_hi`, the `_EN_` twin, `TWT_DEV_WA_TOKEN_3_15C=<non-blank>` on the command line (⛔ `NODE_ENV`, ⛔ GAC). `Pixel_9` booted; the INSTALLED dev client reused (`git diff 8b5f4c01 HEAD -- apps/mobile/package.json pnpm-lock.yaml app.json packages/*/package.json` empty); Metro `-c` from this worktree (bundle 21 MB, 577 worktree-path hits). Fresh member `9876500401` → T&C → `twtp05://whatsapp` → tick + Continue (the API log shows both template env fallbacks read) → back → "WhatsApp on another phone?" → **the code form with "मुझे व्हाट्सएप पर कोड भेजें" — F4's recipe WORKS (first reach in this repo).** TalkBack ON, `pm disable-user com.google.android.tts`, logcat captured, `kill -STOP` the API node process, Send → 15 s → `sent_uncertain` spoken + the field; `123456`; **Confirm 1** (09:11:53.298) → `अभी कोड की जाँच नहीं हो सकी।. Alert` at 09:12:23.500 (the answer), nothing at the press. **Confirm 2**: the first tap MISSED — `sent_uncertain` gave way to `verify_failed`, the status line went and Confirm moved up ~125 px (not counted); re-aimed (09:13:27.212) → **nothing logged** through 09:14:05. Five connections were held at the API (`netstat`, Recv-Q > 0) — Send + verify + re-read + at least one more, so a second Confirm ran. ⇒ X1 REPRODUCED (silent, F3 (i)); ⛔ press re-read seen ⇒ DL1 applies (DL2's rule — ⛔ the "not reproduced" stop). `kill -9` the API (⛔ `-CONT`).
- **Task 3 (AC 2).** 11 new legs in `wa-code-entry-render.test.ts` (the tamagui `Text` mock now records `data-color` / `data-font-size`): per platform (a) verify_failed ×2, (b) released send_failed ×2, (c) a typed digit + the held next press's busy flip, (c) a countdown tick, (d) collapse → expand, (f) the element; plus [ios] (e) the order. **RED on today's code:** 10 failed — (a), (b), (f) on both platforms (Android 0 sent / iOS 1 of 2; `wa-code-error` absent), (c) on both (its positive counts), (d) and (c)-tick on Android (0 sent); (e) and iOS (d) / (c)-tick GREEN (the child `AnnouncedText`'s effect ran first / on mount). Built DL1 (`lineCount`, `setLine` for the 9 `patch({ line })` writes, explicit bumps in the 5 `setState` arms — `grep -n 'line:\|setLine(\|lineCount'` accounts for all 15; plain `Text` + one effect `[form.lineCount]` declared before the wait effect; header rewritten; `AnnouncedText` import removed) → 90/90 (with `wa-signup-copy-keys`). **Mutations:** `patch({ line: 'verify_failed' })` in `reread()`'s PENDING arm ⇒ (a) RED on both platforms (also (c), (d) — same path); the error effect moved below the wait effect ⇒ [ios] (e) RED (`expected 2 to be less than 1`); each restored from a saved copy, `diff` empty.
- **Task 4 (AC 3).** The F7 leg rewritten as AC 3 (a) + (b) + (e) per platform; (c) and (d) added per platform. **RED:** (e) on both (`aria-live` present), (c)-android and (d)-android (0 sent at the first failure). Because (e) is asserted first in the combined leg, (a) / (b) were shown RED on their own in a throwaway copy (the two `aria-live` asserts removed, then (a)'s too): (a)-android `called 0 times` (expected 1), (b)-android `called 1 times` (expected 2); iOS green; the copy restored (`diff` empty). Built DL3 (`notRecordedRef` and `Platform` removed; `announce(translate(…, { locale: next }))` on every `not_recorded`; ⛔ live region; header rewritten) → 18/18 (with `language-copy-keys`).
- **Task 5.** `pnpm --filter`-equivalent in `apps/mobile`: vitest 121 files / 2385 tests green; `tsc --noEmit` clean; `eslint .` clean; added lines scanned for U+00A0 / U+200B-D / U+FEFF / U+2060 — 0.
- **Task 6 — the device pass (AC 4, 5).** Metro restarted `-c`; served bundle: `lineCount` ×24, `wa-code-error` ×1. **X1 on the new code** (fresh member `9876500402`, a new API process, same env): Send held → `sent_uncertain`; Confirm 1 (09:22:41.941) → `अभी कोड की जाँच नहीं हो सकी।` at 09:23:12.063 (0 trailing U+00A0 — and ⛔ "Alert": a plain announcement now); screen re-shot, Confirm at its new place; Confirm 2 (09:23:28.616) → the same words at 09:23:58.773, **1 trailing U+00A0**; nothing at either press; 5 connections held (Send, verify + re-read ×2). `kill -9`. **X2** (`twtp05://language`): first with the API dead — (a) English line once at the failure (09:24:30.017), (b) the switch to हिन्दी while it showed → the Hindi line ONCE (09:25:10.386); the tap on the shown English in between did nothing (the account's language was never read in that session — `-388` item 1 needs a read; by design). A restarted API answered the old session 401 (not pursued — a fresh sign-in, same member). With ONE API process (`kill -STOP` / `-CONT`; no WhatsApp Send held in it): (a) 09:28:18.946 once, 15 s after the tap; a switch to हिन्दी answered **503 `member_language.passport_missing`** (the seed lacked a `pariwar_passport` row — the line spoken once, at that failure, 09:28:27.226; ⛔ counted as (c)); a passport row inserted into the throwaway DB; `-CONT` + a foreground cycle (the pending PUT → 200, the GET → 200); **(c)** a switch to हिन्दी while the line showed, PUT 200 → only "भाषा" logged, the line removed, ⛔ "not recorded"; **(d)** `-STOP`, a switch to English → the line at its failure (09:30:55.693, 2 U+00A0), a tap on the SHOWN English (the account held हिन्दी) → retried, failed → the same words at 09:31:16.004 (3 U+00A0). **Listen (DL6):** TTS re-enabled, volume 12; BigDev answered "Ready"; (b) run 09:39:16–09:39:57 (English switch held → line; हिन्दी switch held → the Hindi line); **BigDev: *"Once, clean"***. **Also seen:** on each switch the signup assisted step under the language screen logged its title in the new language (Y2 in deferred-work). **Restore (6.4):** API `kill -9`, logcat stopped, TalkBack off, Google TTS enabled + `tts_default_synth = com.google.android.tts` (it was `com.example.nonexistent.tts` on arrival — left by an earlier pass), font 1.0, `adb reverse --remove-all`, Metro stopped, emulator shut down (it was off on arrival), container removed, seed spec and both env copies deleted; `git status` = this story's files only. Volumes were set to 12 for the listen (their values on arrival were ⛔ read).

### Completion Notes List

- **Dev complete (`bmad-dev-story 3.15c`, 2026-11-25) — Status `review`.** Code `a47e35c3`. DL1 and DL3 built as written; ⛔ deviation from the decisions. ACs: **AC 1** — inventory re-derived (K 16 / S 9 / U 14 / O 11; the two S → non-S moves stated), AC 1's diff EMPTY, every other caller untouched. **AC 2** — legs (a)–(f) under both platforms, RED first (as the AC predicted, plus (c)/(d) on Android); both mutations RED then restored. **AC 3** — (a)–(e) under both platforms, running totals, settled negatives; RED for (a)-android, (b)-android, (e) (and (c)/(d)-android). **AC 4** — X2 (a), (b), (c), (d) **fixed** on the device; X1 baseline silent (reproduced) → new code **fixed** for `verify_failed`; `send_failed` **NOT REACHED** (needs Meta — DL5); the `whatsapp.tsx` lines did not show. **AC 5** — BigDev: *"Once, clean"*. **AC 6** — deferred-work: X1 (`verify_failed` CLOSED, `send_failed` addressed in code ⛔ device-shown), X2 CLOSED, V4 dated line (`language.tsx` same-language-twice RUN + fixed; `WaCodeEntry` REACHED, `sendCount` / `waitCount` unchanged), new Y1 (the DL4 inventory, owner NONE YET) and Y2 (new observation, owner NONE YET); friction disposition appended at the file's end with the X2 cost FIXED. Gates green. **[Superseded by the code review, Change Log row 1.4 (round-2 R2): "X2 (a), (b), (c), (d) fixed" and V4's "RUN + fixed" hold only for (b), whose before / after the device showed; (a) is not reproduced as a defect, (c) and (d) have no baseline on the old code.]**
- **Open for BigDev:** Task 8.2 — the push, PR and landing (ADR-0047: `ci.yml` at the tip SHA; `scripts/land.sh --dry-run` first). Y1 / Y2 need an owner when you choose. The DL1 departure on iOS (a re-set error is now announced on iOS too) rests on code evidence; VoiceOver un-attested.
- **Found on the way (recorded, ⛔ changed):** F4's recipe reaches `WaCodeEntry` locally — the first time; a fresh local DB also needs a `pariwar_passport` row for the language endpoint (503 `passport_missing` otherwise); with the API held, the app's sixth concurrent request to the host did ⛔ reach the network (5 connections held — consistent with OkHttp's default per-host limit; an inference, ⛔ checked).
- Story created (`bmad-create-story 3.15c`, 2026-11-23; BigDev asked to validate it, none existed — *"Create in new worktree"*): own
  worktree stacked on `story/3-15b-…` at `78971e1f`; facts F1–F10 traced by hand and one read-only inventory pass (F5); DL1–DL7 the
  author's. Ultimate context engine analysis completed - comprehensive developer guide created.

### File List

- `apps/mobile/components/notifications/use-wa-code.ts` — `lineCount`, `setLine` (DL1)
- `apps/mobile/components/notifications/WaCodeEntry.tsx` — plain error line + one effect; header (DL1)
- `apps/mobile/app/(settings)/language.tsx` — plain line, every failure announced once; header (DL3)
- `apps/mobile/tests/unit/wa-code-entry-render.test.ts` — AC 2 legs; `Text` mock records its look and `data-selectable`; review legs (g) (h) (i) and `toSent`'s optional `extra` child
- `apps/mobile/tests/unit/language-screen-render.test.ts` — AC 3 legs (the F7 leg rewritten)
- `_bmad-output/implementation-artifacts/deferred-work.md` — X1, X2, V4 dated lines; new section (Y1, Y2)
- `friction-budget.md` — `**Story 3.15c disposition (…)**`
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — row → `review`, ledger `2026-11-25b`
- `_bmad-output/implementation-artifacts/3-15c-standing-line-spoken-again-and-language-switch-spoken-once.md` — this file

## Change Log

| Version | Date | Change |
| --- | --- | --- |
| 1.0 | 2026-11-23 | Created (`bmad-create-story 3.15c`) in its own worktree stacked on the 3.15b branch (`78971e1f`). §0: ⛔ Panel question. F1: X1 sends nothing on iOS either. F4: `WaCodeEntry` very probably reachable locally (the secrets' env fallback; ⛔ Secret Manager) — the `verify_failed` leg with ⛔ outbound call, the `send_failed` leg ⛔ (it needs Meta). DL1 plain text + one `announce()` per set (`lineCount`); DL3 the same for the language line; DL4 the inventory recorded, only `WaCodeEntry` changed. Row `backlog` → `ready-for-dev`. ⛔ Code. |
| 1.2 | 2026-11-25 | Re-validated (`bmad-create-story validate 3.15c`; BigDev: *"all"*) after rebasing onto `origin/main` `8d0c1ae9` (3.15b LANDED; backup `backup/3-15c-pre-rebase-2026-11-25`). `baseline_commit` re-pinned `78971e1f` → `8d0c1ae9` (AC 1's empty diff was RED at `78971e1f` — `0a56ec0f` changed `lib/announce-repeat.ts`), with a re-pin rule for later rebases. Task 8.2 / Trap 10 follow ADR-0047 (GitHub `ci.yml` at the tip SHA is the gate; `land.sh`; `ci:local` advisory). AC 6: V4 lines for `WaCodeEntry` too (V4's trigger fires on this story); the friction disposition at the file's end, with the X2 cost's status. DL1 names the `setLine` helper (9 + 5 + initial = 15 writes); the AC 2 mutation re-worded. AC 2 (f) asserts the look (`$red10`, `$2`). AC 2 / AC 3: awaited counts, settled negatives. F1–F10 re-checked at `8d0c1ae9`. ⛔ Code. |
| 1.3 | 2026-11-25 | Dev complete (`bmad-dev-story 3.15c`) → `review`. Code `a47e35c3` (DL1 `WaCodeEntry` + `use-wa-code.ts`; DL3 `language.tsx`), tests RED first, two mutations, mobile suite / tsc / eslint green. Device: `WaCodeEntry` reached locally (F4); X1 baseline silent → `verify_failed` fixed; `send_failed` NOT REACHED; X2 (a)–(d) fixed; BigDev's listen *"Once, clean"*. Records: deferred-work X1 / X2 / V4 lines, Y1 (inventory, K16/S9/U14/O11), Y2; friction disposition; ledger `2026-11-25b`. Task 8.2 waits for BigDev. |
| 1.4 | 2026-11-25 | Code review (`bmad-code-review 3.15c`; BigDev: option 1, "Apply every patch") — 0 decision-needed, 6 patch (all applied), 1 defer (W1 → `deferred-work.md`), 16 dismissed. Code: ⛔ production file touched; `wa-code-entry-render.test.ts` +20 cases (P1 leg (g), P2 legs (h) (i)) and the `Text` mock keeps `data-selectable` (P6). Records (P3–P5): the X1, X2 and V4 dated lines and Y1 in `deferred-work.md`, `friction-budget.md` item 2, Task 6.4, the Debug Log's F5 sentence. **Supersedes row 1.3's "X2 (a)–(d) fixed":** X2 is closed on (b)'s before / after; (a) is not reproduced as a defect (the live region's mount spoke it once before), (c) and (d) have no baseline on the old code. Status stays `review`. |
| 1.5 | 2026-11-25 | Code review, second round (`bmad-code-review 3.15c` re-run on the patch set; BigDev: option 1, "Apply every patch") — 0 decision-needed, 4 patch (R1–R4, all applied), 0 new defer, 20 dismissed. Code: ⛔ production file touched; `wa-code-entry-render.test.ts` +2 cases (leg (g) row `the status re-read also rejects (offline)`, ×2 platforms) and the (g) comment now "by arm — 11 sites today". Records: Completion Notes pointer, File List line, the stray ⛔ in X2 (c), the X2 counts sentence, Y1 / Debug Log F5 wording, the listen premise. Sets the ledger note: this review's own ledger line (written at commit) restates the corrected X2 label. Status stays `review`. |
| 1.1 | 2026-11-23 | Validated (`bmad-create-story validate 3.15c`; BigDev: *"all"*). 3.15b's review is COMMITTED (`0a56ec0f` / `57f541b3`, ⛔ any file this story edits) — the PINNED caveat and X2's quote updated, Task 0.1 rebases onto `57f541b3`. AC 3 counts are RUNNING TOTALS (a delta "one more" is green on today's Android code); jsdom sees the live region only as `aria-live` — (e). AC 2 (c) holds the next call for the `busy` flip; (e) gains a mutation (it is green today). DL1 in `assisted.tsx`'s shape (`[form.lineCount]`, ⛔ ref); the `code_resend_too_soon` arm bumps only when `told`; the iOS change stated as a departure from the epics text. F4 adds the template key's source, the env rule, and why 3.15b's seeded row still read false; Task 2.1 copies main's `.env` files. F7: (f) RED on iOS too; the first Android `verify_failed` legs. ⛔ Code. |
