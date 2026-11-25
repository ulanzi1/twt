---
baseline_commit: 9df1818e
---

<!--
PINNED: `9df1818e` = `origin/main` on 2026-11-25 (Story 3.15c LANDED — PR #351, `56817eaa` — then its two records commits `c1b7855d`,
`9df1818e`), and the merge-base of this branch: it is cut from it, so `<baseline>..HEAD` is this story's work alone (the code-review range
and AC 1's empty diff). RULE: every later rebase RE-PINS `baseline_commit` (front matter + this comment) to the new
`git merge-base origin/main HEAD`, and Task 0 re-runs `git diff --name-only <baseline>..origin/main -- apps packages` BEFORE trusting any
F-fact below — a pin being an ancestor and a re-verification being current are two different facts.
Authored in its OWN worktree `/Users/dev/Developer/projects/TWT/.claude/worktrees/3-15d-remaining-standing-lines-spoken-again-and-a-language-switch-speaks-one-line`,
branch `story/3-15d-remaining-standing-lines-spoken-again-and-a-language-switch-speaks-one-line`, cut with `--no-track`: upstream UNSET — first push
with an explicit, BRACED refspec (`git push -u origin "${B}:refs/heads/${B}"` — zsh reads `$B:r` as a modifier). The worktree was created
without `node_modules` — `pnpm install` first (Task 0.1). Every F-fact below was traced at `9df1818e` BY FUNCTION (line numbers are hints and
rot); the dev re-derives them by function at HEAD (Task 0.2).

§0 GATE (the routing template's, applied FIRST): ⛔ Panel question. Strip the citations and read the bare sentence: *"When an error stays on
screen and the member's next try fails the same way, should a screen reader say it again — and when a member switches language twice in a
row, which language's sentence should it say?"* Nothing here changes who is credited, told, paid, or what is stored or disclosed; no copy
changes. It is HOW existing lines reach a screen reader — the AUTHOR's. The choices the epics block leaves open are made below as DL1–DL7,
each with its reason and an honest cost; BigDev may overrule any of them at validate or review. BigDev's scope — *"create story for
unowned items"* — is the input, quoted, ⛔ reinterpreted: the four items 3.15c recorded as owned by nobody.
-->

# Story 3.15d: The Remaining Standing Lines Are Spoken Again, and a Language Switch Speaks One Line — in the Language Now on Screen

Status: ready-for-dev

## Story

As a member who uses a screen reader,
I want an error that stays on screen to be read to me again when my next try fails the same way — on every screen that shows one, not only
two — and a language switch made twice in a row to read me ONE sentence, in the language now on my screen,
so that what I hear matches what happened.

## 📜 Policy meaning (AI-10-1)

**This story introduces ⛔ predicate that gates a member's access to a benefit, and changes none.** It changes only WHEN existing lines are
handed to the screen reader — eight error lines on four surfaces, and the language screen's one "not recorded" line; what is shown,
accepted, refused, stored or credited is unchanged, and so is every copy key. ⛔ Niyamavali check needed — no predicate.

## The rulings and records this story builds on

Every item is qualified by its owning story — the bare letters `W1`, `Y1`, `Y2` also name other items elsewhere in `deferred-work.md`
(`W1` alone appears in 22 other sections).

- **3.15c-dev Y1** — `deferred-work.md`, "Deferred from: dev of story 3-15c": eight more `AnnouncedText` lines carry X1's defect — set again
  with the same words while they stay mounted, they are sent NOTHING (Android: the live region has no content change; iOS: the effect keys on
  the words). Owner line: *"OWNER: Story 3.15d"* (2026-11-25, this story's authoring).
- **3.15c-dev Y2** — same section: with the language screen opened by deep link over the signup wizard, each switch re-spoke the assisted
  step's title (`useAnnounceOnChange` keyed on the words, no focus gate). Reach UNKNOWN at the time. Owner line: *"OWNER: Story 3.15d"*.
- **3.15c-review W1** — "Deferred from: code review of story 3-15c": two taps inside one PUT window each announce, each in the language it
  closed over. Owner line: *"OWNER: Story 3.15d"*.
- **The leg (g) completeness guard** — the 3.15c story's `### Review Findings — second round`, the dismissal *"(g) has ⛔ completeness guard …
  the one dismissal worth BigDev's eye"*, and the ledger entry that closed 3.15c (read the 3.15c row block's last entry, never a line number).
- **BigDev, 2026-11-25:** *"create story for unowned items"*.
- `epics.md` Story 3.15d block — AC (1)–(6) in brief; the source of the ACs below.
- **The pattern this story reuses** — Story 3.15c DL1 (`WaCodeEntry` + `use-wa-code.ts`): the line is PLAIN `Text` (`accessibilityRole="alert"`
  — on Android a role description only, ⛔ a live region), counted per SET, spoken ONCE per set by `announce()` on both platforms; Story 3.15a
  DL1 (`assisted.tsx`) before it. Device-shown on `assisted.tsx` (3.15a) and on `WaCodeEntry` for `verify_failed` (3.15c).
- **Story 3.15b** — `lib/announce.ts` `announce(text, options?)`: on Android the n-th send of the same text in a session carries n trailing
  U+00A0 (heard at 1 and 2); the ESLint fence bars `announceForAccessibility*` outside it. NEW code calls `announce()`.
- Memory [[project_android_live_region_reread_on_rerender]] (a standing live region is re-read at a later PRESS),
  [[project_talkback_drops_identical_announcement]], [[project_uset_fresh_closure_memo_trap]], [[project_mobile_announce_after_heading_race]],
  [[project_mobile_android_emulator_setup]], [[feedback_gate_scope_semantic_coverage]], [[feedback_mechanization_split_commitment]].

## Found facts (traced at `9df1818e`, BY FUNCTION; `VERIFIED` = read in code, `INFERENCE` = reasoned, not run)

The worktree has no `node_modules`: every claim about what TanStack Query does on a retry is `INFERENCE` (the lockfile pins
`@tanstack/query-core@5.101.0`), resting on the repo's own comments; Task 0.3 proves it with a real `QueryClient`.

- **F1 — the shape to copy.** `use-wa-code.ts`: `lineCount` in `WaCodeState`, bumped in the same `setState` that sets `line` — by the `setLine`
  helper, or hand-written — the same value included; `patch` is used only for `busy`. `WaCodeEntry.tsx`: a tamagui `Text`
  (`fontSize="$2" color="$red10" accessibilityRole="alert" testID`), ⛔ `accessibilityLiveRegion`, and ONE effect
  `useEffect(() => { if (errorText) announce(errorText) }, [form.lineCount])` — counter-only deps (`t` / the words ⛔: `useT()` is a fresh
  closure each render and a language switch changes the words without a new set), runs on MOUNT too. `assisted.tsx` (3.15a): `showError(e)`
  = `setError(e); setErrorSet((n) => n + 1)` and a focus-gated effect on `[focused, errorSet]`. Test shape: `wa-code-entry-render.test.ts`
  leg (a) set twice ⇒ two sends (Android: the second = the words + one U+00A0; iOS identical); (c) a re-render beside the line ⇒ ⛔ further
  send; (d) collapse → expand ⇒ once on mount; (f) role `alert`, ⛔ `aria-live`, the look kept (`data-color`, `data-font-size`). Helpers
  `NBSP`, `bare`, `sentAs` in `tests/unit/announce-text.ts`; `tests/unit/setup-announce-repeat.ts` resets the Android counter per test.
  VERIFIED.
- **F2 — the inventory.** `grep -rn '<AnnouncedText' apps/mobile/app apps/mobile/components` = **49** usages at the pin (VERIFIED). The eight
  S lines (S1–S8 below) leave **41**. Per file: `address.tsx` 1 (S1); `posting.tsx` 5 (S2 is the last, inside the "Show more" block; the others:
  `saved`, `history_loading`, the first-load `history_error`, the page-1-refetch `history_error`); `PeerQuestionnaire.tsx` 8 (S3–S6; the
  others: `failureNotice`, `submit_error`, `SaveLineText`, `unavailable`); `WorkplacePicker.tsx` 9 (S7, S8; the others: the refusal
  `errorLine`, `districts_loading`, `search_loading`, the first/page-1 `search_error`, `search_empty`, `typed_name_invalid`, `date_invalid`).
- **F3 — S1 `address.tsx` `address_required`** (`AddressScreen`). Element: `{error ? <AnnouncedText text={error} kind="error"
  color="#C0392B" /> : null}`; `error` is `useState<string | null>`. SET at two places in `onSubmit`: the empty branch
  (`setError(t('lifeEvents.address_required'))`) and the catch (`setError(t(lifeEventsDeathReportedKey(e) ?? 'lifeEvents.error_generic'))`).
  CLEARED by `onChange` and by `onSubmit` past the empty check (before the await). S sequence: Submit with the field empty, Submit again —
  the second `setError` passes the same string, React bails out, no render, no remount. The catch path is ⛔ S (the clear + `setBusy` flush
  before the await, so the line unmounts and remounts). Tests: `tests/unit/death-report-refusal-announcements.test.ts` is the ONLY test that
  renders `AddressScreen` (`describe.each(['ios','android'])`, surfaces `address`, `withdrawal`, `withdrawal OTP`, `medical`, `medical OTP`
  through ONE `it.each` body); its Android `address` leg asserts `aria-live="assertive"` and `announce` ⛔ called — that assertion CHANGES;
  iOS holds, but the post-`rerender` assertion `toHaveBeenCalledTimes(platform === 'ios' ? 1 : 0)` does NOT for the Android `address` surface (it becomes 1: the new effect calls `announce()` once, awaited with `waitFor`) — BOTH the Android branch and that assertion take a per-surface branch. ⛔ test covers `address_required` (grep: only `address.tsx` + the i18n JSON). Gate:
  `tests/unit/death-report-copy-resolves.test.ts` requires the substring `lifeEventsDeathReportedKey(e)` in `address.tsx` after comments are
  stripped. Not in the microcopy globs. VERIFIED.
- **F4 — S2 `posting.tsx` "Show more" `history_error`** (`WorkplaceScreen`). Element inside `history.hasNextPage &&
  history.isFetchNextPageError` (`history` = `usePostingHistoryQuery()`, a `useInfiniteQuery` in `components/workplace/useWorkplaceQueries.ts`);
  `color="#C0392B"`. SET by a failed `fetchNextPage` (the "Show more" button or its Retry). S sequence: Show more fails (line mounts), Retry
  fails again — `isFetchNextPageError` stays true through the retry with data (the file's header comment says so; `INFERENCE` for TanStack),
  Retry is `disabled` while fetching, no `key=`. Signal: `history.errorUpdatedAt` (`INFERENCE` that it moves on a failed retry-with-data;
  its use as a remount key is VERIFIED at `known-people.tsx`). ⚠ `errorUpdatedAt` ALSO moves on a page-1 refetch failure, which shows the
  OTHER two `history_error` lines (they stay `AnnouncedText`; refetch clears `fetchMeta`, so the lines are mutually exclusive) ⇒ the effect
  re-checks the line's own condition inside its body. ⚠ `WorkplaceScreen` stays mounted when `transferring` swaps the returned tree for
  `<WorkplacePicker>`; today the `AnnouncedText` remounts on return and iOS re-speaks a standing error — an effect placed in the screen
  would not (a child component that owns the line would). The effect lives IN that child (⛔ in `WorkplaceScreen`, where it would not re-speak on return from the picker). Test:
  `tests/unit/workplace-screen-render.test.ts` mocks `usePostingHistoryQuery` with an inline constant object WITHOUT `errorUpdatedAt`,
  `Platform: { OS: 'ios' }` as a constant, tamagui as plain divs ⛔ role / aria; nothing pins `history_error`. Gate:
  `tests/unit/workplace-copy.test.ts` scans every literal `t('…')` in `posting.tsx` and `WorkplacePicker.tsx` against both locales.
- **F5 — S3–S6 `PeerQuestionnaire.tsx`** (three components: `LoadError`, `Questionnaire`, `QuestionField`). All four elements are
  `<AnnouncedText … kind="error" />` with the default colour (`$red10`).
  - **S3** `peer_request.unsaved` on the load-error view (`LoadError`): `{leaveTo !== null && hasUnsent && …}`; SET by the
    `usePreventRemove(hasUnsent && !allowLeave, ({data}) => { setLeaveTo(…) })` callback on EVERY prevented removal (Back); CLEARED by "Leave
    anyway" or unmount. S: Back with unsent answers, Back again (same words, same mounted element). Navigation-driven, ⛔ press-driven.
  - **S4** `t(actionNotice)` (`Questionnaire`; `actionNotice` is `'peer_request.required' | 'peer_request.date_unsaved' | null`): THREE set
    sites on one state variable — the Next handler (dirty date ⇒ `date_unsaved`; `!canLeavePage` ⇒ `required`) and `pageBack` (dirty dates ⇒
    `date_unsaved`); FOUR clears — Next succeeds, `saveAnswer`, `pageBack` on a later page, and the `[dirtyDates.size]` effect, whose
    functional updater compares the STRING (`n === 'peer_request.date_unsaved' ? null : n`). S: Next with a required question unanswered, Next
    again; Back with a dirty date twice. A switch between the two keys changes the words, so it is already spoken.
  - **S5** `unsavedWarning` (`Questionnaire`): `{unsavedWarning && <AnnouncedText text={t('peer_request.unsaved')} …/>}`; SET at two sites —
    `leaveQuestions` (a `useCallback`, deps `[state.pending, state.failed.size, dirtyDates.size, onBack]`) and the `usePreventRemove` callback
    in `Questionnaire`; CLEARED by `saveAnswer`, "Leave anyway", and the `[busy, isSubmitting]` effect. S: Back while a save is pending or
    failed, Back again (`setUnsavedWarning(true)` is a no-op the second time). S3 and S5 share words but ⛔ mount together.
  - **S6** `peer_request.date_invalid` (`QuestionField`, per date question): `dateError` is local `useState(false)`; SET by the date Save
    (`const iso = parseDisplayDate(…); setDateError(iso === null); if (iso === null) return`); CLEARED by `onChangeText`, a PARSEABLE Save (`setDateError(iso === null)`), Clear, any option
    button, the `[savedText]` effect, and unmount (`QuestionField key={q.key}`). S: Save an unparseable date, Save again.
  - Shared: the `notices` fragment (`failureNotice`, `actionNotice`, `unsavedWarning`) is rendered separately in the `pages` and `closing`
    trees; `Questionnaire`'s hooks must sit above `if (phase === 'not_openable') return`. Tests: `tests/unit/peer-questionnaire-render.test.ts`
    (774 lines) — the tamagui mock maps `accessibilityRole` `alert` and `radiogroup` to `role` only, so plain `Text` with role `alert` keeps
    every `getByRole('alert')` assertion green; `getByRole('alert')` needs EXACTLY ONE alert; the RP8 leg captures the prevented-removal
    callback with `vi.mocked(usePreventRemove).mock.lastCall?.[1]` and calls it inside `act`; a second call is "Back again". Gates: the file is
    in `microcopy.yaml` `scope.code_globs` (`apps/mobile/components/peer-request/*.tsx`) — ⛔ hex colour literals (use `color="$red10"`, never
    copy `#C0392B` in), ⛔ "receipt" / "invoice" / "report" / "passbook" in code OR comments; `tests/unit/peer-request.test.ts` has a source
    scan that memos and callbacks depend on `locale`, ⛔ `t` (regex over multi-line deps `/\n {4}\[([^\]]*)\],\n {2}\)/g`, and it expects the
    literal `[editor]`). VERIFIED.
- **F6 — S7–S8 `WorkplacePicker.tsx`** (558 lines; early returns). **S7** `districts_error`: `if (districts.isError) { return (… <AnnouncedText
  text={t('districts_error')} kind="error" color={ERROR_COLOR} /> … <Button … onPress={() => void districts.refetch()}> …` — ⛔ `!data` guard,
  so the error screen replaces the whole picker even when districts are cached. SET when the districts query ends in `error`: a mount-time
  refetch when stale (`staleTime` 10 min), the Retry press, or `invalidateQueries(workplaceKeys.all)` after a refusal. S: cached districts +
  a failed refetch, Retry fails again — with data `status` stays `error` through the refetch (`INFERENCE`), same words, silent. ⛔ S without
  cached data (status goes pending, the words differ). **S8** "Show more" `search_error` in the `search` phase: `{search.hasNextPage &&
  search.isFetchNextPageError ? … <AnnouncedText text={t('search_error')} …/>`; `gcTime: 0`, `staleTime: 0`; a changed `q` is a new query
  key and unmounts it; `errorUpdatedAt` also moves on a page-1 failure, which shows the OTHER `search_error` (stays `AnnouncedText`) ⇒ the
  same re-check. Signals `districts.errorUpdatedAt` / `search.errorUpdatedAt`; focus and reconnect refetch are off (`lib/query-client.ts`),
  default `retry: 1`. The effect must sit above `if (districts.isPending)`. ⚠ **There is NO render test for `WorkplacePicker`**
  (`workplace-screen-render.test.ts` mocks it away; only source scans touch it): a new harness is needed — `@shopify/flash-list` (precedent
  `tests/unit/known-people-find-render.test.ts`), tamagui including `View`, `XStack`, `H2`, `Input`, `Paragraph`, `Spinner`, `Button`,
  `react-native` `ScrollView` / `Platform` (a getter) / `AccessibilityInfo`, `useWorkplaceQueries` (mutable results), `useQueryClient`,
  `lib/member-api`, `lib/workplace-i18n`, `lib/idempotency-key`, the known-people cache. Not in the microcopy globs; `workplace-copy.test.ts`
  applies. VERIFIED except where marked.
- **F7 — 3.15c-review W1's mechanism** (`language.tsx` `choose`; `lib/app-language.ts` `chooseLanguage`, `flush`). Every tap past its guard calls
  `chooseLanguage(next, …)`, which bumps `choiceCounter`, stores the language, OVERWRITES the single pending slot, and returns a FRESH promise
  — `withTimeout(flush(…), CALL_TIMEOUT_MS)` (15 s, started at THAT tap) — over a SHARED single-flight `flush`: while `flushing !== null` for
  the same member and storage, `flush` returns the SAME `flushing.result` to every caller. The `.then` in `choose` closes over its own `next`;
  `notRecorded` is ONE boolean per screen instance; the only ref on the screen is `mountedRef`. The flush loop re-reads the pending slot at
  the top of each iteration (it PUTs "whatever is pending now"), compares-and-clears by VALUE, and on ANY failure returns `failed` at once —
  the latest pending stays on disk for the next sync. So: (a) tap en then hi in one window, PUT fails ⇒ both `.then`s see `not_recorded` in
  one microtask drain ⇒ the English sentence, then the Hindi one (different texts ⇒ ⛔ NBSP), the screen shows ONE line in Hindi; hi's PUT was
  never sent. (b) the same language twice (the `-388` item 1 path; passes the guard only when `accountChoiceDiffers`) ⇒ the same sentence
  twice (Android: the second + one U+00A0). (d) en hangs, hi tapped, the shared flush resolves `recorded` ⇒ both clear the line — ⚠ with
  per-tap timers, A's can fire first: a failure announced for a choice that ends up recorded, then the line removed. Variant: en recorded and
  hi failed ⇒ both `.then`s say not-recorded, A's English sentence about a choice (en) that WAS recorded. VERIFIED by reading; ⛔ run.
  ⚠ Two clicks inside ONE synchronous tick make hi the first PUT (the `run` yields once before `readPending`) — `INFERENCE`.
- **F8 — what already identifies "the latest choice".** `choiceCounter` is module-level, bumped by EVERY `chooseLanguage` (the login
  screen's `(…, null)` and other members' too); its readers are the flush loop (`counterAtStart`) and `syncAppLanguage` (drops a stale GET /
  PUT result) — ⛔ the screen, ⛔ `chooseLanguage`'s outcome. The ratified intent (`-387` LS5) is *"a choice counter that drops stale
  results"* for adopting server values into the DISPLAY, ⛔ for what is spoken. The pending slot identifies the latest LOCALE by value, ⛔ the
  tap. In-repo precedent for a per-instance "latest request wins" ref: `app/(claim)/nominee-review.tsx` — `const seq =
  ++ifscRequestSeq.current[idx]` … `if (!mountedRef.current || ifscRequestSeq.current[idx] !== seq) return`. VERIFIED.
- **F9 — the language tests.** `tests/unit/language-screen-render.test.ts`: ⛔ leg overlaps taps (every tap is followed by `settle()`,
  `findByTestId` or `waitFor`); `mock.memberLanguageSet` resolves INSTANTLY by default; ⛔ hold-open helper (a `deferred()` exists only locally
  in `app-language.test.ts`); real timers (a 15 s hang is untestable — settle a held promise by hand inside `act`); `useSession` returns
  only `{session}`, so `canWrite` is always true. The 3.15c legs AC 3 (a) / (b) / (c) / (d) are all sequential and stay valid. ⚠ A held
  promise MUST be settled before the test ends — the module-level `flushing` slot stays non-null otherwise and later tests (other members)
  queue behind it. Gates: `tests/unit/language-source-pins.test.ts` bans `t` in any `}, [ … ])` deps array in `language.tsx` (a new `useRef`
  adds none); `tests/unit/language-copy-keys.test.ts` needs the literal `t('language.error_not_recorded')` in the RENDER (the `translate(…)`
  call in the `.then` is ⛔ matched). The key's words: en *"Your choice is saved on this phone, but we could not record it on your account
  yet. We will try again."*, hi approved by BigDev 2026-10-23. VERIFIED.
- **F10 — 3.15c-dev Y2's reach** (`useAnnounceOnChange`; navigation). Definition (`components/peer-request/announce.tsx`):
  `useEffect(() => { … if (text) announce(text) }, [text])`, `skipInitial` only skips the FIRST run, ⛔ focus handling. **Nine callers**, all
  fed TRANSLATED words (so all re-speak on a locale change while non-null): `(signup)/assisted.tsx` (title / code label), `(signup)/whatsapp.tsx`
  ×3 (`waSignup.title`, `popup_title`, `waCode.done`), `(life-events)/known-people-find.tsx`, `(life-events)/nominee-link-find.tsx`,
  `PeerRequestNotOpenable.tsx`, `WorkplacePicker.tsx` (`skipInitial: true`), `PeerQuestionnaire.tsx`. The language screen is entered ONLY by
  `router.push('/(settings)/language')` in `components/settings/LanguageSettingsEntry.tsx`, mounted ONLY in `app/(tabs)/index.tsx` (home);
  ⛔ link to it from `(signup)/*`, `(auth)/*` or any `<Link>`. The root guard (`app/_layout.tsx`) checks only `!session && segments[0] !==
  '(auth)'` ⇒ login, and `session && inAuthGroup` ⇒ tabs; `StoredSession` carries ⛔ member state or role ⇒ NOTHING blocks `(settings)/*`
  for a member in signup. Every signup step-to-step move is `router.replace` (the one `router.back()` is in `payment.tsx`), so ONE step is
  mounted; `otp.tsx` is the only entry into `(signup)`. ⇒ **NO IN-APP PATH FOUND BY STATIC TRACE — reproduced only by a DEEP LINK** (`twtp05://language`; the scheme is set in every
  variant by `app.config.ts`; the https app-links file lists only `/peer-request`). A restart mid-signup lands on home (`initialRouteName:
  '(tabs)'`), ⛔ in the wizard, so no step sits under the language screen — `INFERENCE` from grep (⛔ resume-into-wizard path found). ⚠ NOT
  determined: how the observed state had BOTH the WhatsApp step visible and the assisted step mounted (`INFERENCE`: an earlier
  `twtp05://whatsapp` link pushed a second step onto `(signup)`), and whether a production build lets another app fire the scheme. The login
  screen's switch (`login.tsx` `onSwitchLanguage`) sits over nothing that uses the hook. A sign-in / foreground `syncAppLanguage` →
  `setLocale` re-speaks the FOCUSED step's own title — "from the same screen", ⛔ "from under another". Tests: `assisted-step-render.test.ts`
  has the `blur` / `refocus` mock but ⛔ `setLocale` or `useLocale`; `wa-code-entry-render.test.ts` leg (h) is the locale-probe precedent.
- **F11 — the guard's facts** (`use-wa-code.ts`). 14 writes set `line`: **9 through `setLine`** (send `not_pending`; the send default arm; re-read
  PENDING; re-read other-state; re-read CATCH; confirm `not_pending`; `wrong_retry`; `wrong_final`; `code_no_longer_valid`) and **5 hand-written
  `setState` literals** (send 200; the `mayHaveSent` catch; `code_resend_too_soon` — the ONE conditional keep, `told ? s.lineCount + 1 :
  s.lineCount`; `code_send_failed`; `code_limit_reached`); the 11 that can produce an ERROR line are the 9 + `code_send_failed` +
  `code_limit_reached`. `patch` has exactly THREE calls, all `{ busy }`. `tests/**` is excluded from `tsc` (⛔ home for a type test; ⛔
  `expectTypeOf`, ⛔ `@ts-expect-error` in `tests/`). Source-pin precedents: `tests/unit/nominee-screen-draft-pins.test.ts` (comment-stripped
  source, `matchAll(/\bsaveDraft\(/g)`, `toHaveLength(2)` — *"a third writer is a new decision: it must be added here"* — and each call's
  args matched), `language-source-pins.test.ts` (`read()` strips comments; `block(src, opener)` brace-matches),
  `announcement-channels-source-pins.test.ts`. ESLint: ⛔ `no-restricted-syntax` anywhere in the repo; the 3.15b fence is
  `no-restricted-properties` (member ACCESS — it cannot match an object-literal key); a later flat-config entry for the same rule REPLACES
  the earlier one's options; the fence has ⛔ unit test. The same counter-per-set convention exists for `sendCount` / `waitCount` (same hook),
  `assisted.tsx` `errorSet` (one writer), `known-people.tsx` `noticeSeq` (five hand-written sites — the most exposed). VERIFIED.
- **F12 — what freezes `announce.tsx` and `lib/announce.ts`.** ⛔ test reads `announce.tsx`; the ESLint fence covers only the two property
  names. The freeze is the STORIES' rule (the 3.15b epics block: *"⛔ changing `AnnouncedText`'s live region (other screens rely on it)"*; the
  3.15c story's AC 1 empty-diff). Render tests that run the REAL `AnnouncedText` protect it indirectly (`nominee-*`, `known-people-*`,
  `death-report-refusal-announcements`). Nothing in S1–S8 needs either file to change. VERIFIED.
- **F13 — the member-facing gate.** `friction-budget` treats every path under `apps/mobile/` as member-facing, tests included
  (conservative by design — PR #350's precedent): a `**Story 3.15d disposition (…)**` block must be APPENDED at the END of
  `friction-budget.md`, heading shape `**Story <id-no-space> disposition` (3.15c's block is the model). VERIFIED.

## Build decisions (the author's — §0; BigDev may overrule at validate / review)

- **DL1 — 3.15c-dev Y1's remedy: each of the eight lines becomes plain text, spoken ONCE per time it is SET, on both platforms (the 3.15c shape).**
  `AnnouncedText` itself ⛔ changed. Per site, a counter bumped at EVERY set — the same words included, NEVER at a clear — and ONE effect
  with counter-only deps (⛔ `t`, ⛔ the words) that speaks the line when it is showing. The element: tamagui `Text`,
  `fontSize="$2"`, the colour the site passes today (S1, S2: `#C0392B`; S7, S8: `ERROR_COLOR`; S3–S6: `$red10`, ⛔ a hex literal in
  `PeerQuestionnaire.tsx`), `accessibilityRole="alert"`, ⛔ `accessibilityLiveRegion`, a `testID` (S1 `address-error`, S2 `posting-history-more-error`, S3 `peer-load-unsaved`, S4 `peer-action-notice`, S5 `peer-unsaved-warning`, S6 `peer-date-invalid`, S7 `workplace-districts-error`, S8 `workplace-search-more-error`).
  | Site | Signal (bumped where) | The effect speaks | Placement / trap |
  |---|---|---|---|
  | S1 `address_required` | one helper `showError(text)` used by BOTH set sites (the empty branch, the catch): `setError(text)` + a counter (or one `{text, n}` state) | `error` when non-null | clears (`onChange`, `onSubmit`) ⛔ bump |
  | S2 "Show more" `history_error` | `history`'s error signal (the note below) | `t('history_error')` | a CHILD component of `posting.tsx` owns the line and its effect, so a return from the picker remounts it (today's behaviour); body re-checks `hasNextPage && isFetchNextPageError` |
  | S3 `peer_request.unsaved` (load error) | `setN((n) => n + 1)` in the `usePreventRemove` callback in `LoadError` | `t('peer_request.unsaved')` when `leaveTo !== null && hasUnsent` | navigation-driven |
  | S4 `actionNotice` | one helper `showActionNotice(key)` used by ALL THREE set sites + a counter | `t(actionNotice)` when non-null | the `[dirtyDates.size]` effect's functional updater is ⛔ touched (it only clears); effect above `if (phase === 'not_openable') return` |
  | S5 `unsavedWarning` | a counter bumped at `leaveQuestions` AND in the `usePreventRemove` callback | `t('peer_request.unsaved')` when `unsavedWarning` | `leaveQuestions` is a `useCallback`: ⛔ `t` in its deps (multi-line deps scan) |
  | S6 `date_invalid` | a counter local to `QuestionField`, bumped ONLY when `iso === null` | `t('peer_request.date_invalid')` when `dateError` | per question, so several date questions on one page each keep their own |
  | S7 `districts_error` | `districts`' error signal (the note below) | `t('districts_error')` when `districts.isError` | effect above `if (districts.isPending)`; only the ERROR branch's element changes — `districts_loading` stays `AnnouncedText` |
  | S8 "Show more" `search_error` | `search`'s error signal (the note below) | `t('search_error')` when `search.hasNextPage && search.isFetchNextPageError` | a CHILD component owns the line and its effect (as S2) — the effect must ⛔ fire for a line that is not rendered (the picker's early returns, the `search` phase); the page-1 `search_error` stays `AnnouncedText`; a changed `q` unmounts the line |
  *The query-driven sites (S2, S7, S8) depend on TanStack moving a per-error signal on a failed RETRY with data* (`INFERENCE`, F4 / F6). `errorUpdatedAt` is a MILLISECOND stamp — two failures inside one millisecond tie — so the first choice is `errorUpdateCount` (monotonic; `INFERENCE` that v5 exposes it); Task
  0.3 proves WHICH of the two moves on every failed retry, with a real `QueryClient` (the leg is COMMITTED — AC 3's evidence); if NEITHER does, the signal becomes a local counter bumped from the retry handler
  (`fetchNextPage()` / `refetch()` resolve with a result object — read its shape at the pin) — the AC is the behaviour, ⛔ the mechanism.
  *Mount:* each effect also runs on mount, so a view that mounts holding an error (a query already in `error`) speaks it once — as
  `AnnouncedText` did; S1 and S3–S6 mount with a null line and speak nothing. *Why not re-key `AnnouncedText` (`key={count}`) — the shape the K
  callers use:* it relies on a remounted live region holding the SAME words being spoken, which no pass has shown on a device, and it keeps
  the standing live region that is re-read at a press. *Why not a `seq` prop on `AnnouncedText`:* it changes the shared component other
  screens rely on. *Cost:* on Android each line is now a plain announcement — TalkBack ⛔ appends "Alert" (3.15a and 3.15c accepted the same);
  eight more screens with an effect of their own; **iOS changes** (a re-set is now spoken; F1 shows it was sent nothing) — a departure from
  the "iOS unchanged" reading of the 3.15 family, on CODE evidence, ⛔ VoiceOver (no iOS device in this repo's passes) — BigDev may overrule
  (the alternative: guard each new effect to Android). *Three more behaviour changes, recorded:* (a) a locale switch while a standing line shows is no longer re-spoken on iOS (the words changed, so the old effect re-ran) — an improvement, and the very reason the effect keys on the counter; (b) S5's `unsavedWarning` can stand across the `pages` → `closing` tree swap (`notices` is rendered in both) and is NOT re-spoken there, where the `AnnouncedText` it replaces was, on the remount; (c) ⛔ focus gate: the lines are spoken regardless of focus, as `AnnouncedText` was (query-driven sets can land while a screen is blurred) — accepted, and different from 3.15a's `assisted.tsx` error effect, which is gated.
- **DL2 — 3.15c-review W1's remedy: the LATEST tap wins.** On `language.tsx`: `const tapSeq = useRef(0)`; in `choose`, AFTER the early-`return` guard, `const
  mine = ++tapSeq.current`; in the `.then`, `if (!mountedRef.current || tapSeq.current !== mine) return` as the FIRST line — a stale
  outcome sets nothing (not `notRecorded`, ⛔ `setNotRecorded(false)` either) and speaks nothing. Screen-local; ⛔ lib change. *Why mint after
  the guard:* a no-op tap (the shown language with nothing to record) must not make an earlier REAL failure stale and silent. *Why a ref, ⛔
  `choiceCounter`:* it is process-wide (the login screen's and other members' taps bump it) and `chooseLanguage` would have to change its
  exported `ChooseOutcome`; the lib leg "another member waiting behind a hung write…" in `app-language.test.ts` would then flip. *What the
  member hears under each option* (F7; sequences (a)–(d)): today (once per outcome) — two sentences, the first in a language no longer shown;
  DL2 — one sentence, in the language on screen; sequential taps (the existing legs) are unchanged because no tap is stale when its `.then`
  runs. *Cost:* under a hung PUT the thens fire at their own timers, so the member hears nothing until the LAST tap's timer (up to the tap
  gap later than the first tap's own 15 s) — and a stale first failure never shows a line; in the "en recorded, hi failed" variant only the hi
  sentence is spoken, which is the right one (hi is on screen and ⛔ recorded). *Alternative:* keep once-per-outcome (today) — what 3.15c's
  DL3 and `language.tsx`'s header comment read literally ("EVERY `not_recorded` outcome is announced ONCE"), so DL2 AMENDS that sentence for
  overlapping taps (3.15c's AC 3 legs are all sequential and stay valid); say so in the Change Log and in `language.tsx`'s header. ⛔ Panel question (the words are unchanged; nothing is owed). Not covered, and ⛔ here: the line staying up after a LATE success —
  deferred item **3.15d-authoring Z1**.
- **DL3 — 3.15c-dev Y2: reach FIRST, ⛔ code by default.** F10's static trace found NO in-app path (the defect was reproduced only by a deep link); the one normal path to the language
  screen (the home tab) has no `useAnnounceOnChange` caller under it. A fix means gating a shared hook used by nine callers
  (`useAnnounceOnChange` has no focus handling; several of their tests' `expo-router` mocks lack `useFocusEffect` — `known-people-find-render`,
  `workplace-screen-render`, `peer-request-slot-render`, `peer-questionnaire-render` — so a mock sweep follows) and
  settling a design question the hook cannot answer alone — a gate shaped `focused ? text : null` turns null → words at EVERY refocus and would re-speak the
  question after any blur, language change or not (a gate inside the effect body avoids that, at the same cost in nine callers and mock sweeps). So this story ESTABLISHES the reach on the emulator (Task 7: the normal path; a restart
  mid-signup; the deep link over the wizard with TTS-off capture) and records the disposition: **accepted, not fixed — no in-app path found, reproduced only by a
  deep link**, with a reopening trigger (*"the day a normal path puts any `useAnnounceOnChange` screen under another screen — a settings
  entry reachable from signup, or 11b.8's accessibility audit"*). **If Task 7 finds ANY non-deep-link path, STOP and ask BigDev — ⛔ record this disposition.** *Cost:* a member who is deep-linked into the language screen over a wizard
  step still hears its title re-spoken on a switch. *Alternative (BigDev may overrule at validate):* fix `assisted.tsx` and `whatsapp.tsx`
  locally (they already have, or can get, a `focused` state) — a PARTIAL fix (the other callers remain) with the refocus trap above; if chosen,
  it needs its own ACs, not an amendment here.
- **DL4 — the guard: narrow `patch` at the type level AND pin the write sites by a source test.** (i) `patch`'s parameter becomes
  `Partial<Omit<WaCodeState, 'line' | 'lineCount'>>` — one line; `patch({ line: … })` and `patch({ lineCount: … })` as object literals then
  fail `tsc` (the excess-property check; a non-fresh object variable would slip through — `INFERENCE`, proved by the mutation in Task 3). (ii)
  A new `tests/unit/use-wa-code-source-pins.test.ts` in the `nominee-screen-draft-pins` shape: comment-stripped source; `useWaCode`'s body;
  the `setLine(` call count (9, definition excluded); every `setState((s) => ({ … line: … }))` literal (5 sites) carries `lineCount:` in the
  same literal AND its value contains `s.lineCount + 1` — a bare `lineCount: s.lineCount` (present, ⛔ incremented) must FAIL;
  `code_resend_too_soon`'s `told ? s.lineCount + 1 : s.lineCount` is the ONE named conditional form; `patch`'s declared parameter type is exactly `Partial<Omit<WaCodeState, 'line' | 'lineCount'>>` (so a revert of (i) fails the pin, ⛔ only `tsc`); `patch(`'s arguments never mention
  `line`; each failing message says *"a new error-line writer is a new decision: add its row to leg (g) of
  `wa-code-entry-render.test.ts` AND to this pin"*. *Why not an ESLint fence:* there is ⛔ `no-restricted-syntax` in the repo, the `:has()`
  selector it would need is `INFERENCE`-supported on ESLint 9, a later flat-config entry REPLACES an earlier one's options, and the 3.15b
  fence itself has ⛔ unit test — a positive control would be new tooling. *Why not a reducer or a `line` object:* `WaCodeEntry` reads
  `form.line` in seven places; the blast radius buys nothing the pin does not. *Cost:* the pin is formatting-dependent (Prettier is not
  enforced) and counts must be bumped by whoever adds a writer — that friction is the point; it is blind to a `line` set by shorthand
  (`{ ...s, line }`) or a literal built in a variable. ⛔ covered here: the `sendCount` / `waitCount` bumps (the same shape could — a
  follow-up, not owed).
- **DL5 — the device pass is a bounded SWEEP, ⛔ a gate, and it runs on the COMMITTED bundle.** Each site triggered twice on the Android
  emulator (TalkBack ON, TTS-off capture; the served bundle checked for a code-only marker of THIS branch first), recorded **fixed** /
  **not reproduced** / **not reached** with the gate. Several sites need a state the emulator may not reach (S2 a posting history longer
  than a page; S3–S6 a peer request; S7 districts cached then stale with the API stopped) — NOT REACHED is an honest outcome, unit-shown
  only. 3.15c's device legs ran on the UNCOMMITTED tree and its records had to say so: here, ⛔ start Task 8 before the code is committed.
  ⛔ "not seen" for a leg not run ([[feedback_record_unattested_no_backfill]]).
- **DL6 — the speech-ON listen is asked, ⛔ assumed.** BigDev listens to W1's overlapping-tap leg (expect: ONE sentence, in the language now
  on screen) and, if reached, one Y1 site; ⛔ listened ⇒ recorded un-attested in BigDev's words.
- **DL7 — closure language and the three records.** `deferred-work.md`: each item gets a dated line — **3.15c-dev Y1**: per site, **CLOSED by
  Story 3.15d** only with device evidence on this branch's bundle, else *"addressed in code, ⛔ device-shown"* with the gate
  ([[feedback_closure_language_precision]]); **3.15c-review W1**: same; **3.15c-dev Y2**: *"accepted, not fixed — reachable only by a deep
  link"* with the reopening trigger, ⛔ "closed"; **Z1** stays NONE YET. `friction-budget.md`: the `**Story 3.15d disposition (…)**` block.
  The sprint ledger: ONE combined entry at completion, the next free letter READ LIVE across every branch and worktree.

## Acceptance Criteria

1. **Frozen files and the inventory (F2, F12).** `git diff 9df1818e..HEAD -- apps/mobile/components/peer-request/announce.tsx
   apps/mobile/lib/announce.ts apps/mobile/lib/announce-repeat.ts apps/mobile/lib/death-certificate-announce.ts` is EMPTY before code and
   after. `grep -rn '<AnnouncedText' apps/mobile/app apps/mobile/components` goes from 49 to **41** (**43** if the split trigger fired: S7 and S8 then belong to 3.15e; ⛔ count a `<AnnouncedText` inside a comment) — exactly the S elements this story owns are gone,
   every other usage is untouched, and each of the four files' remaining `AnnouncedText` lines is the one F2 lists.
2. **3.15c-dev Y1 — each of S1–S8, per platform (DL1).** Under `android` AND `ios`, for EACH site: (a) the line is set, then set again with the SAME
   words ⇒ `announce()` is called twice with its words (Android: the second = the words + one U+00A0; iOS: identical); (b) an unrelated
   re-render beside the line (a `rerender` with the same props, a query tick, a `busy` flip — ⛔ a typed character at S1 / S6, which CLEARS the line) ⇒ ⛔ further announcement; (c) the line CLEARED
   ⇒ nothing spoken; (d) the line is role `alert`, ⛔ `aria-live`, with its `testID` and the look it had (`data-color`, `data-font-size`; ⛔ a
   hex literal in `PeerQuestionnaire.tsx`); (e) a view that mounts holding the line speaks it once (S2, S7, S8) / mounts silent (S1, S3–S6); (f) a LOCALE SWITCH while the line stands changes its words ⇒ ⛔ further announcement (a real `LocaleProvider`, or a mutable locale mock whose `t` is a NEW function after the switch); mutations: the words, then `t`, added to the effect's deps ⇒ RED — 3.15c's round-1 lesson: a re-render leg never catches it, only this one does.
   Site-specific: **S1** both set sites bump through ONE helper, the catch path speaks once (not twice); **S4** all THREE set sites bump
   (Next ⇒ `required`, Next ⇒ `date_unsaved`, `pageBack` ⇒ `date_unsaved`), a switch between the two keys is spoken once, the
   `[dirtyDates.size]` clear speaks nothing; **S5** both set sites bump; **S6** an unparseable Save twice ⇒ twice, a parseable Save ⇒ nothing,
   two date questions on one page count independently; **S2 / S8** the Show-more line is spoken on a retry that fails again, ⛔ spoken when
   `errorUpdatedAt` moves because the PAGE-1 refetch failed (the other line owns that); **S7** with cached districts a failed Retry is spoken
   again, with ⛔ cached data the existing first-failure behaviour is kept; **S5** a standing `unsavedWarning` across the `pages` → `closing` tree swap is NOT re-spoken (the `AnnouncedText` it replaces was, on the remount) — recorded, accepted (DL1). RED first;
   every counter's bump removed ⇒ its leg RED (one mutation per site, restored). Every positive count is awaited
   (`await waitFor(() => expect(sentAs(…)).toHaveLength(n))`) and every "⛔ further announcement" is asserted only after a settle (an `act`
   flush + one macrotask) — a bare assertion straight after `findBy…` races the effect ([[project_mobile_announce_after_heading_race]]).
3. **The query-driven signal is PROVEN, ⛔ assumed (S2, S7, S8).** A leg with a REAL `QueryClient` (`retryDelay: 0`, the shape of
   `tests/unit/known-people-hooks.test.ts`) shows that, with data present, a failed `fetchNextPage()` retry (infinite query) and a failed
   `refetch()` (plain query) each move `errorUpdatedAt` — or the DL1 fallback counter is built and its leg shows the same behaviour. A mocked
   query that hands back an instant constant hides the pending flip and proves nothing ([[project_tanstack_instant_mock_hides_notready_flip]]).
4. **3.15c-review W1 — overlapping taps (DL2, F7, F9).** Under `android` AND `ios`, with a HELD PUT (`mock.memberLanguageSet.mockReturnValueOnce(held.promise)`,
   the first call awaited with `await waitFor(() => expect(mock.memberLanguageSet).toHaveBeenCalledTimes(1))` BEFORE the second tap, the held
   promise settled inside `act` before the test ends): (a) en then hi, the PUT fails ⇒ `mock.announce` totals **1**, the HINDI sentence, one
   alert line, in Hindi; (b) the shown language tapped twice (the `-388` item 1 setup: `syncAppLanguage` first so `accountChoiceDiffers`) ⇒
   total **1**, a plain first send (⛔ NBSP); (c) en then hi, the shared flush RECORDS ⇒ total **0**, the line absent, ⛔ a false failure;
   (d) a no-op tap (the shown language, nothing to record) between a failing tap and its outcome ⇒ the failing tap is STILL spoken (the id is
   minted after the guard); (e) the 3.15c legs AC 3 (a) / (b) / (c) / (d) stay green UNCHANGED; (f) en then hi, en's held PUT RESOLVES and the default mock for hi's PUT is overridden to REJECT ⇒ total **1**, the HINDI sentence (the 'en recorded, hi failed' variant). RED first for (a) and (b); the mutation
   "mint before the guard" ⇒ (d) RED; "drop the stale check" ⇒ (a) RED (both restored). The words in the announcement are the language of the
   LATEST tap, and equal the on-screen line's.
5. **3.15c-dev Y2 — reach and disposition (DL3, F10).** On the emulator, recorded with the log lines and a fixed / not reproduced / not reached outcome:
   (a) the NORMAL path — the home tab → language screen — has ⛔ signup step mounted under it and re-speaks nothing; (b) a restart
   mid-signup lands on home, ⛔ in the wizard; (c) `twtp05://language` over the wizard (assisted `ask`) re-speaks the title on a switch —
   the defect, reached by deep link; (d) an attempt to reproduce the observed TWO-STEP state (the assisted title spoken with the WhatsApp step visible) WITHOUT a deep link, recorded either way — **if ANY non-deep-link path is found, STOP and ask BigDev (DL3's alternative); ⛔ record the disposition below**. `deferred-work.md` records the disposition per DL3 (*"accepted, not fixed — no in-app path found, reproduced only by a deep
   link"*, with the reopening trigger). ⛔ a change to the hook `useAnnounceOnChange`, to any of its nine `useAnnounceOnChange(…)` CALL LINES (Tasks 4 and 6 edit two of the caller FILES, for other lines), or to `announce.tsx`, unless BigDev
   overrules DL3 at validate (then new ACs, ⛔ an edit of this one).
6. **The guard (DL4, F11).** (a) `tsc --noEmit` (mobile) is green on the narrowed `patch`, and the MUTATION `patch({ line: 'send_failed' })`
   added to `use-wa-code.ts` ⇒ `tsc` RED (restored); (b) `tests/unit/use-wa-code-source-pins.test.ts` pins the 9 `setLine` sites, the 5
   literals each carrying `lineCount:` with an `s.lineCount + 1` value (the one conditional form named), `patch(` never carrying `line`, and `patch`'s declared parameter type text;
   the MUTATIONS — a literal with `line:` and ⛔ `lineCount:`, a literal whose `lineCount: s.lineCount` is ⛔ incremented, a tenth `setLine(`
   call, a `patch({ line })` — each turn it RED (restored); (c) the pin's failure text names BOTH places
   to update; (d) leg (g) of `wa-code-entry-render.test.ts` and its comment ("A NEW write site needs its row here") point at the pin. The 121
   existing tests of the two 3.15c test files (`wa-code-entry-render.test.ts`, `language-screen-render.test.ts`) stay green with ⛔ existing
   assertion edited (new legs and a pointer comment are added beside them).
7. **The device sweep (DL5).** Each site that can be reached triggered twice on the Android emulator, TalkBack ON, TTS-off capture, on the
   COMMITTED bundle — recorded with its log lines (timestamps, trailing U+00A0 count) and an outcome **fixed** / **not reproduced** / **not
   reached** (the gate named); the served bundle checked for a code-only marker of THIS branch first; ⛔ "not seen" for a leg not run.
8. **The listen (DL6).** BigDev's words on W1's overlapping-tap leg with speech ON, or *"un-attested"* in BigDev's words.
9. **Records and gates (DL7, F13).** `deferred-work.md`: the dated lines under 3.15c-dev Y1, 3.15c-dev Y2 and 3.15c-review W1 per DL7 (each a
   RESULT, ⛔ an owner claim for anything left); Z1 untouched. `friction-budget.md`: `**Story 3.15d disposition (…)**` APPENDED at the END
   of the file (after the `Story 3.15c disposition` block) — ⛔ new row, ⛔ row retired, ⛔ row amended, taps unchanged; it states the iOS
   departure, that a TalkBack user now hears eight more lines again on a repeat, and that a language switch no longer re-speaks a standing line on iOS. The sprint row `ready-for-dev` (created at authoring) → `review` at dev done → `done` only after landing, and the ledger entry (next free letter READ LIVE).
   `mobile` `tsc`, `eslint`, the whole vitest suite green; `pnpm friction:check` green on the COMMITTED result; the emulator restored;
   ⛔ seed spec, env copy or container committed or left running.

## Tasks / Subtasks

- [ ] **Task 0 — Preflight (AC: 1, 3)**
  - [ ] 0.1 In the worktree: `pnpm install` (no `node_modules`); `git fetch origin`; `git merge-base --is-ancestor 9df1818e HEAD` and `git diff
        --name-only 9df1818e..origin/main -- apps packages` — a non-empty answer means a sibling SHIPPED: re-derive F2–F13 for the moved files
        BEFORE coding, and re-pin. `ListAgents` + `git worktree list`: ⛔ another session on these files.
  - [ ] 0.2 Re-derive F1–F13 BY FUNCTION at HEAD (the tracer's numbers, not these line hints); differences → the Debug Log.
        `grep -rn '<AnnouncedText' apps/mobile/app apps/mobile/components | wc -l` = 49, and `git diff 9df1818e..HEAD -- <the four frozen files>` is EMPTY (AC 1's start).
  - [ ] 0.3 TanStack proof (AC 3): a COMMITTED leg (AC 3's evidence) in `tests/unit/workplace-query-error-signal.test.ts` with a REAL `QueryClient` (`retryDelay: 0`) — an infinite query with data whose
        `fetchNextPage` is made to fail, retried and failing again: does `errorUpdateCount` exist and move, does `errorUpdatedAt` (a millisecond stamp — use fake timers so two failures differ) move, does `isFetchNextPageError` stay true through the
        retry; a plain query with data whose `refetch` fails twice. Record both in the Debug Log; if NEITHER signal moves, DL1's fallback
        applies to that site.
- [ ] **Task 1 — S1 `address.tsx` (AC: 1, 2)**
  - [ ] 1.1 Tests RED first: new legs for `address_required` (set twice ⇒ twice; a `rerender` ⇒ ⛔ more; a typed character CLEARS ⇒ ⛔ spoken; role / look; a locale switch ⇒ ⛔ more (AC 2 (f))); edit
        `death-report-refusal-announcements.test.ts`'s `address` Android leg with a per-surface branch for BOTH the Android `announce` assertions and the post-`rerender` `toHaveBeenCalledTimes` (await the Android positive with `waitFor`), and extend its tamagui mock to record `testID`, `color`, `fontSize` (the other four surfaces keep their
        `aria-live` assertions — they are `AnnouncedText` still).
  - [ ] 1.2 `showError(text)` helper + counter + the one effect; `AnnouncedText` import removed if unused; keep `lifeEventsDeathReportedKey(e)`
        in the file (`death-report-copy-resolves.test.ts`); mutation: drop the helper's bump ⇒ RED, restored.
- [ ] **Task 2 — 3.15c-review W1 `language.tsx` (AC: 4)**
  - [ ] 2.1 A local `deferred()` helper in `language-screen-render.test.ts`; legs (a)–(f) of AC 4 per platform, RED first for (a) and (b); EVERY held
        promise settled inside `act` before the test ends (F9).
  - [ ] 2.2 `tapSeq` ref, id minted after the guard, the stale check as the `.then`'s first line; rewrite `language.tsx`'s header sentence "EVERY failure is announced ONCE" for overlapping taps (⛔ the microcopy-gate words — it scans this file, Trap 7); the render keeps the literal
        `t('language.error_not_recorded')`; ⛔ `t` in any deps array; mutations "mint before the guard" and "drop the stale check" ⇒ RED,
        restored; the 3.15c legs AC 3 (a)–(d) green UNCHANGED.
- [ ] **Task 3 — the guard (AC: 6)**
  - [ ] 3.1 Narrow `patch`'s parameter type (DL4 (i)); `tsc --noEmit` green; the mutation `patch({ line: 'send_failed' })` ⇒ `tsc` RED, restored.
  - [ ] 3.2 `tests/unit/use-wa-code-source-pins.test.ts` (DL4 (ii)) with the failure text naming both places; the three mutations ⇒ RED,
        restored; a pointer comment on leg (g) and on the pin, each to the other.
- [ ] **Task 4 — S3–S6 `PeerQuestionnaire.tsx` (AC: 1, 2)**
  - [ ] 4.1 Tests RED first in `peer-questionnaire-render.test.ts`, per platform: S3 (capture the `usePreventRemove` callback, call it twice), S4
        (Next twice for `required`; Back with a dirty date twice; the key switch), S5 (Back twice while saving), S6 (Save unparseable twice;
        two date questions); the existing `getByRole('alert')` assertions stay green; extend the tamagui mock to record `testID`, `color`, `fontSize`; add the locale-switch leg (AC 2 (f)).
  - [ ] 4.2 The counters / helpers and the effects (DL1 table), each ABOVE `if (phase === 'not_openable') return`; `color="$red10"`, ⛔ hex,
        ⛔ the banned words in code or comments; ⛔ `t` in any multi-line deps (`peer-request.test.ts`); one mutation per site ⇒ RED, restored.
- [ ] **Task 5 — S2 `posting.tsx` (AC: 1, 2, 3)**
  - [ ] 5.1 Extend `workplace-screen-render.test.ts`: a MUTABLE history mock WITH the error signal, a `Platform` getter, a mutable `useWorkplaceT` (a NEW function after a locale switch), tamagui recording `testID` / `color` / `fontSize`; legs: a locale switch ⇒ ⛔ more (AC 2 (f)); Retry fails
        again ⇒ spoken again; a page-1 refetch failure that moves `errorUpdatedAt` ⇒ ⛔ the Show-more line speaks; a return from `transferring`
        ⇒ the standing line speaks once (the remount).
  - [ ] 5.2 The line in a CHILD component with the effect on the error signal and the body's re-check (DL1) — ⛔ an effect in `WorkplaceScreen` (it would not re-speak on return from the picker);
        mutation ⇒ RED, restored.
- [ ] **Task 6 — S7–S8 `WorkplacePicker.tsx` (AC: 1, 2, 3)** ⚠ the heaviest task — see "Size and the split trigger" in the Dev Notes.
  - [ ] 6.1 The NEW render harness (F6) in `tests/unit/workplace-picker-render.test.ts` (tamagui recording `testID` / `color` / `fontSize`; a mutable locale mock); RED first: S7 (cached districts, Retry fails again ⇒
        twice; ⛔ cached data ⇒ the first-failure behaviour kept), S8 (Show more fails, Retry fails again ⇒ twice; a page-1 failure ⇒ the Show-more
        line ⛔ speaks; a changed `q` ⇒ the line gone; a mount holding the error ⇒ once (S7, S8); a locale switch ⇒ ⛔ more — AC 2 (e), (f)).
  - [ ] 6.2 The S7 effect above the early returns, guarded on `districts.isError`; the S8 line in a CHILD component (as S2); only the S7 error branch and the S8 Show-more element
        change; `ERROR_COLOR`; mutation per site ⇒ RED, restored.
- [ ] **Task 7 — 3.15c-dev Y2's reach (AC: 5)**
  - [ ] 7.1 Emulator, TalkBack ON, TTS-off capture ([[project_mobile_android_emulator_setup]]): (a) home → language switch with nothing under it;
        (b) kill / restart mid-signup; (c) `twtp05://language` over the wizard's assisted `ask`; (d) try to reproduce the observed TWO-STEP state (assisted title spoken with the WhatsApp step visible) WITHOUT a deep link — if ANY non-deep-link path is found, STOP and ask BigDev (DL3's alternative), ⛔ record the disposition. Log lines, outcomes. ⚠ `uiautomator dump` turns
        TalkBack off — never dump during a capture.
  - [ ] 7.2 The disposition in `deferred-work.md` per DL3, ONLY if 7.1 found no in-app path — ⛔ code.
- [ ] **Task 8 — The device sweep (AC: 7, 8)**
  - [ ] 8.1 COMMIT the code first (DL5); serve the bundle; check a code-only marker; trigger each reachable site twice; record per site.
  - [ ] 8.2 W1's overlapping-tap leg, then ask BigDev for the speech-ON listen (DL6).
  - [ ] 8.3 Restore (TalkBack off, TTS on, font scale, `adb reverse --remove-all`, Metro, API, container, seed spec and env copies deleted); `git
        status` = this story's files only.
- [ ] **Task 9 — Records (AC: 9)**
  - [ ] 9.1 `deferred-work.md` dated lines (DL7); `friction-budget.md` disposition appended at the END; the sprint row `ready-for-dev` (created at authoring) → `review` at dev done → `done` only after landing; the sprint ledger entry (next free letter READ
        LIVE across every branch and worktree; the safe-prepend pattern, [[project_sprint_status_safe_prepend]]; YAML parses).
- [ ] **Task 10 — Gates (AC: 1, 9)**
  - [ ] 10.0 Re-run AC 1 at the end: the four frozen files' diff over `9df1818e..HEAD` EMPTY; the `<AnnouncedText` count 49 → 41 (or 43 if the
        split trigger fired); every other usage untouched.
  - [ ] 10.1 Commit on `story/3-15d-…` only, branch checked before each commit; `pnpm friction:check` after the commit; `mobile` `tsc --noEmit`, `eslint .` and the whole vitest suite green (AC 9).
  - [ ] 10.2 The gate is GitHub `ci.yml` (ADR-0047): the push and the PR are BigDev's word; the story lands only when the PR's `ci.yml` run AT THE
        EXACT TIP SHA concluded `success` on every job — `scripts/land.sh --dry-run <pr>` first, then `scripts/land.sh <pr>` (fast-forward; ⛔
        squash, ⛔ merge commit). `code-escrow-mirror` is red on every push — not part of the gate. `ci:local` is advisory.

## Dev Notes

### Traps

1. **The frozen files** — `announce.tsx`, `lib/announce.ts`, `announce-repeat.ts`, `death-certificate-announce.ts` stay byte-identical (AC 1). The
   eight replacements are plain `Text`; ⛔ add a prop to `AnnouncedText`.
2. **Counter-only deps** — ⛔ `t`, ⛔ the words in any new effect's deps: `useT()` / `useClaimT()` / `useWorkplaceT()` are fresh closures each render and
   a language switch changes the words without a new set ([[project_uset_fresh_closure_memo_trap]]). The effect body reads this render's words.
3. **Hooks order** — every new effect sits ABOVE its component's early returns: `if (phase ===
   'not_openable') return` (`PeerQuestionnaire.tsx`), `if (districts.isPending) return` (`WorkplacePicker.tsx`).
4. **`errorUpdatedAt` is the QUERY's, ⛔ the line's** — it moves on a page-1 failure too (S2, S8) and on any error of the districts query (S7);
   each effect re-checks its own line's condition inside its body.
5. **A mounted parent does not remount a child** — `WorkplaceScreen` outlives the picker; the S2 line lives in a child so a return from the
   picker re-speaks a standing error as it does today.
6. **The address test shares one body across five surfaces** — only the `address` Android assertion changes (a per-surface branch); the four
   other surfaces are still `AnnouncedText`.
7. **The microcopy gate covers `components/peer-request/*.tsx`, `app/(settings)/language.tsx`, `components/settings/LanguageSettingsEntry.tsx` and `lib/app-language.ts`** — ⛔ hex colours, ⛔ "receipt" / "invoice" / "report" / "passbook" in code and
   comments (the gate reads comments).
8. **Two source scans bite `t` in deps** — `peer-request.test.ts` (multi-line deps, expects the literal `[editor]`) and
   `language-source-pins.test.ts`; plus `workplace-copy.test.ts` (literal keys), `language-copy-keys.test.ts` (the render keeps the literal
   `t('language.error_not_recorded')`), `death-report-copy-resolves.test.ts` (`lifeEventsDeathReportedKey(e)` stays in `address.tsx`).
9. **A held promise must be settled** — in every W1 leg, inside `act`, before the test ends; a hung `flushing` slot poisons every later test
   in the file (F9). A 15 s hang is not testable under real timers.
10. **Mint the tap id AFTER the guard** — a no-op tap must not silence a real earlier failure (AC 4 (d)).
11. **jsdom cannot hear a live region** — only the "⛔ `aria-live`" assertion catches a leftover live region; counts catch the rest. The Android
    NBSP counter resets per test (`setup-announce-repeat.ts`); leg expectations are per-test.
12. **The announce-after-heading race** — `findBy…` then an immediate `expect(announce)` loses on CI; `waitFor` the positive, settle for the
    negative ([[project_mobile_announce_after_heading_race]]).
13. **S4's clear effect** — the `[dirtyDates.size]` effect's functional updater compares the STRING; if `actionNotice` becomes `{ key, n }`, that
    comparison changes with it — prefer a helper + a separate counter, so the updater is ⛔ touched.
14. **TanStack facts are `INFERENCE`** — nothing was run at authoring; Task 0.3 is not optional. `retry: 1` is the default, so one press is one
    final error action.
15. **Two announcements back to back** — whether TalkBack speaks both or the second cuts the first is un-attested (3.15c X1 / X2 records); ⛔
    claim an order on Android.

### What this story does ⛔ do

- ⛔ Change `AnnouncedText`, `announce.tsx`, `lib/announce.ts`, `announce-repeat.ts`, the copy, the routes or the contracts.
- ⛔ Fix the K callers (they rely on a remounted live region — ⛔ device-shown) or the `failureNotice` U edge (two generic `invalid` failures
  stay identical).
- ⛔ Change the hook `useAnnounceOnChange` or any of its nine `useAnnounceOnChange(…)` CALL LINES (DL3; Tasks 4 and 6 edit two of the caller FILES, for
  other lines) — 3.15c-dev Y2 is a reach finding and a recorded disposition.
- ⛔ Fix the late-success line (3.15d-authoring Z1), the `sendCount` / `waitCount` bumps' guard, or the Android order of two announcements.
- ⛔ Add a lint fence, a reducer, or a `line` object (DL4).

### Size and the split trigger

This is the largest of the 3.15 family: four source files for Y1, one for W1, one hook type + a new pin for the guard, three test files extended
and TWO new ones, and a device sweep. **Task 6 (`WorkplacePicker`) is the single heaviest** — a 558-line component with ⛔ render test, early
returns and TanStack-driven sets. Order the work cheapest-first: Task 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10. **Split trigger (recorded,
⛔ acted on here):** if Task 6's harness is not green after the other tasks are, S7–S8 move to a new story 3.15e, which owns them with the
harness, and AC 1's count becomes 43 — amend AC 1, the `epics.md` block and the 3.15c-dev Y1 owner line in `deferred-work.md` ("the eight S lines"), and say so in the Change Log and the ledger; ⛔ ship S7–S8 half-built.

### Project Structure Notes

- Source (UPDATE): `apps/mobile/app/(life-events)/address.tsx`, `apps/mobile/app/(life-events)/posting.tsx`,
  `apps/mobile/components/peer-request/PeerQuestionnaire.tsx`, `apps/mobile/components/workplace/WorkplacePicker.tsx`,
  `apps/mobile/app/(settings)/language.tsx`, `apps/mobile/components/notifications/use-wa-code.ts` (the `patch` type only).
- Tests (UPDATE): `death-report-refusal-announcements.test.ts`, `workplace-screen-render.test.ts`, `peer-questionnaire-render.test.ts`,
  `language-screen-render.test.ts`, `wa-code-entry-render.test.ts` (a pointer comment only). Tests (NEW):
  `workplace-picker-render.test.ts`, `use-wa-code-source-pins.test.ts`, and the real-`QueryClient` leg (AC 3) in the file the dev finds fits
  (`known-people-hooks.test.ts` is the shape).
- Records: `deferred-work.md`, `friction-budget.md`, `sprint-status.yaml`, this file. All under `apps/mobile/` and `_bmad-output/`; ⛔ a
  package, ⛔ `packages/contracts`, ⛔ `apps/api`.

### Testing

- Per site and per platform (`mock.os`): the 3.15c leg set — set twice, re-render beside, clear, element look, mount. Counts are RUNNING TOTALS
  of `announce` calls (⛔ deltas); positives awaited, negatives after a settle. A mutation per site, RED then restored from a SAVED COPY (`git checkout --` on an uncommitted implementation reverts it to the pin — commit each green task first, or diff the restored file against the copy);
  ⛔ run a mutation while another process reads the tree.
- `workplace-picker-render.test.ts` is new: use `known-people-find-render.test.ts` for the flash-list mock and
  `wa-code-entry-render.test.ts` for the platform / announce wiring.
- Green proves nothing alone ([[feedback_gate_scope_semantic_coverage]]): each new leg is shown RED by a mutation before the story says it
  bites.

### Previous story intelligence (3.15c, 3.15b, 3.15a)

- 3.15c's review found its OWN patch set incomplete twice: (1) five of seven error lines had ⛔ announcement-count leg, (2) the offline
  `verify_failed` arm — the catch arm of `reread()` — was missed by all three layers, because no test rejected the status read. ⇒ for every
  S site, list EVERY set path (including catch arms and navigation callbacks) and give each a leg.
- 3.15c's device legs ran on the uncommitted tree; its records had to say "byte-identical is ⛔ shown by the diff". ⇒ DL5.
- A byte-mode `perl` regex mistook `⚠` (its last byte is `A0`) for U+00A0 and a "fix" corrupted it; scan with `python3 -I` or `perl -CSD`
  and run `iconv -f UTF-8 -t UTF-8` after any in-place edit ([[project_unicode_escapes_written_raw]]).
- 3.15c's `wa-code-entry-render.test.ts` leg (h) is the locale-probe precedent; leg (g)'s `SETS` table is the model a per-site table follows.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Story 3.15d, and 3.15a / 3.15b / 3.15c above it]
- [Source: `_bmad-output/implementation-artifacts/deferred-work.md` — "Deferred from: dev of story 3-15c" (3.15c-dev Y1, Y2); "…code review of
  story 3-15c" (3.15c-review W1); "…authoring of story 3-15d" (Z1)]
- [Source: `_bmad-output/implementation-artifacts/3-15c-standing-line-spoken-again-and-language-switch-spoken-once.md` — DL1 (the shape), Review
  Findings round 2 (the guard), Landing]
- [Source: `3-15a-assisted-step-error-spoken-once-and-focus-kept.md`, `3-15b-repeated-announcement-sent-as-different-text.md`]
- [Source: `apps/mobile/components/notifications/{use-wa-code.ts,WaCodeEntry.tsx}`, `apps/mobile/app/(signup)/assisted.tsx`,
  `apps/mobile/lib/{announce.ts,announce-repeat.ts,app-language.ts,with-timeout.ts}`, `apps/mobile/app/(claim)/nominee-review.tsx`
  (`ifscRequestSeq`)]
- [Source: `.githooks/pre-push`, `.github/workflows/ci.yml`, `scripts/land.sh` — ADR-0047]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5.5 (`claude-sonnet-5-5`), `bmad-create-story` 2026-11-25 (three read-only tracers: the eight Y1 sites; W1; Y2 + the guard).

### Debug Log References

### Completion Notes List

- Story created `ready-for-dev`. Ultimate context engine analysis completed — comprehensive developer guide created.

### File List

## Change Log

| Version | Date | Change |
| --- | --- | --- |
| 1.0 | 2026-11-25 | Created (`bmad-create-story`; BigDev: *"create story for unowned items"*) in its OWN worktree cut from `origin/main` `9df1818e` after 3.15c LANDED. Owns 3.15c-dev Y1 and Y2, 3.15c-review W1 and the leg (g) completeness guard. §0: ⛔ Panel question. F10 found Y2 reachable only by a deep link (⛔ stronger than the evidence — SUPERSEDED by v1.1: "no in-app path found by static trace") — DL3 records a disposition, ⛔ a code fix. DL2 amends 3.15c's DL3 sentence ("EVERY `not_recorded` outcome is announced ONCE") for overlapping taps. New deferred item Z1 (the late-success line) recorded at authoring. Split trigger on Task 6 recorded, ⛔ acted on. |
| 1.1 | 2026-11-25 | Validated by an INDEPENDENT fresh-context pass (read-only; no blocker, 5 major, 12 minor — all applied). Major: the sprint row is now created at authoring (it was claimed by three owner lines and ordered by no Task); Y2's pre-written disposition was stronger than its evidence — now *"no in-app path found by static trace; reproduced only by a deep link"*, with Task 7 trying to reproduce the observed two-step state without one and a STOP-and-ask if any path appears; AC 5 / "does ⛔ do" forbade touching the nine `useAnnounceOnChange` callers while Tasks 4 and 6 edit two of those files — now the hook and the nine CALL LINES; Task 0.3's TanStack proof was "throwaway" though S2 / S7 / S8 rest on it — now a COMMITTED leg, and `errorUpdateCount` is the first-choice signal since `errorUpdatedAt` is a millisecond stamp that can tie; AC 2 gains (f), the locale-switch leg 3.15c's own round 1 taught. Minor: F3 (both Android assertions of the address leg change), testIDs named and the three tamagui mocks extended, S2 / S8 effect in a child component, `language.tsx` in the microcopy gate, W1's header / Change Log edits and its "en recorded, hi failed" leg owned, the split count (43), the pin also pins `patch`'s type text, the behaviour changes recorded (iOS no longer re-speaks on a locale switch; S5 across the tree swap; focus gate accepted), items qualified by owning story. |
