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

REGISTER (declared here, v1.2, so a cold reader cannot misread the file): `⛔` NEGATES the phrase after it (`⛔ X` = not X; a stop is therefore
written in plain words, ⛔ `⛔ HALT`); `⭐` = an action; `⚠` = a hazard; doubling is volume only. On every pass, grep `⛔ ` followed by a verb or a
quoted word and read each hit against this line. The one prose exception is the v1.0 Change Log row's "⛔ stronger than the evidence", which
means it WAS stronger — history rows are kept verbatim.

§0 GATE (the routing template's, applied FIRST): ⛔ Panel question. Strip the citations and read the bare sentence: *"When an error stays on
screen and the member's next try fails the same way, should a screen reader say it again — and when a member switches language twice in a
row, which language's sentence should it say?"* Nothing here changes who is credited, told, paid, or what is stored or disclosed; no copy
changes. It is HOW existing lines reach a screen reader — the AUTHOR's. The choices the epics block leaves open are made below as DL1–DL7,
each with its reason and an honest cost; BigDev may overrule any of them at validate or review — DL1–DL4 were ACCEPTED by BigDev on 2026-11-25 (the dated block under "Build decisions"); DL5–DL7 stand as the author's. BigDev's scope — *"create story for
unowned items"* — is the input, quoted, ⛔ reinterpreted: the four items 3.15c recorded as owned by nobody.
-->

# Story 3.15d: The Remaining Standing Lines Are Spoken Again, and a Language Switch Speaks One Line — in the Language Now on Screen

Status: review

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
- **"The four" is the set 3.15c's own records named unowned** (the ledger entry that closed 3.15c: W1, Y1, Y2, leg (g)). Other 3.15c-born
  residue stays where 3.15c recorded it and is not owned here: the Android order of `send_failed` + `resend_wait` (X1's "author's call"), the
  `failureNotice` U-edge (3.15c's inventory table; filed at this validate as deferred item **3.15d-authoring Z2**, owner NONE YET) and X1's `send_failed` leg,
  NOT REACHED (needs Meta).
- `epics.md` Story 3.15d block — AC (1)–(6) in brief; the source of the ACs below.
- **The pattern this story reuses** — Story 3.15c DL1 (`WaCodeEntry` + `use-wa-code.ts`): the line is PLAIN `Text` (`accessibilityRole="alert"`
  — on Android a role description only, ⛔ a live region), counted per SET, spoken ONCE per set by `announce()` on both platforms; Story 3.15a
  DL1 (`assisted.tsx`) before it. Device-shown on `assisted.tsx` (3.15a) and on `WaCodeEntry` for `verify_failed` (3.15c).
- **Story 3.15b** — `lib/announce.ts` `announce(text, options?)`: on Android the n-th send of the same text in a session carries n trailing
  U+00A0 (heard at 1 and 2); the ESLint fence bars `announceForAccessibility*` outside it. NEW code calls `announce()`.
- Memory [[project_android_live_region_reread_on_rerender]] (a standing live region is re-read at a later PRESS),
  [[project_talkback_drops_identical_announcement]], [[project_uset_fresh_closure_memo_trap]], [[project_mobile_announce_after_heading_race]],
  [[project_mobile_android_emulator_setup]], [[feedback_gate_scope_semantic_coverage]], [[feedback_mechanization_split_commitment]].

## Found facts (traced at `9df1818e`, BY FUNCTION; `VERIFIED` = read in code, `INFERENCE` = reasoned, not run, `FOUND at validate` = observed in a scratch run)

The worktree has no `node_modules`: every claim about what TanStack Query does on a retry is `INFERENCE` (the lockfile pins
`@tanstack/query-core@5.101.0`), resting on the repo's own comments — AT AUTHORING. The v1.2 validate RAN them (scratch scripts, outside the repo, against the main checkout's
query-core 5.101.0 with a real `QueryClient` and observers): they hold and are marked FOUND below; Task 0.3 COMMITS the proof, against the app's
real hooks.

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
  fails again — `isFetchNextPageError` stays true through the retry with data (FOUND at validate: the flag stays true and `fetchStatus` goes `fetching` through the retry — ⛔ a code comment: the `posting.tsx` header says only that a page-2
  failure is reported beside the button, and the inline comment above the page-1 `history_error` covers a page-1 refetch after a page-2 failure),
  Retry is `disabled` while fetching, no `key=`. Signal: `history.errorUpdateCount` (FOUND at validate: +1 on EVERY failed retry-with-data — `retry: 1` makes one press one final error — while
  `errorUpdatedAt` is a millisecond stamp that TIES under a frozen or fake clock;
  the stamp's use as a remount key is VERIFIED at `known-people.tsx` and is ⛔ this story's signal). ⚠ The count ALSO moves on a page-1 refetch failure, which shows the
  OTHER two `history_error` lines (they stay `AnnouncedText`; refetch clears `fetchMeta`, so the lines are mutually exclusive) ⇒ the effect
  needs no body re-check: the child that owns the line is rendered INSIDE the existing `history.hasNextPage && history.isFetchNextPageError`
  branch, so a page-1 failure (the flag is then false) unmounts it and its effect cannot run — ⛔ a body re-check (dead code, and no mutation could
  show it bites). ⚠ `WorkplaceScreen` stays mounted when `transferring` swaps the returned tree for
  `<WorkplacePicker>`; today the `AnnouncedText` remounts on return and iOS re-speaks a standing error — an effect placed in the screen
  would not (a child component that owns the line would). The effect lives IN that child (⛔ in `WorkplaceScreen`, where it would not re-speak on return from the picker). Test:
  `tests/unit/workplace-screen-render.test.ts` mocks `usePostingHistoryQuery` with an inline constant object WITHOUT `errorUpdateCount` (or `errorUpdatedAt`),
  `Platform: { OS: 'ios' }` as a constant, tamagui as plain divs ⛔ role / aria, so it ⛔ forwards `accessibilityLiveRegion` either (Task 5.1 maps it to `aria-live`, or AC 2 (d) is vacuous);
  nothing pins `history_error`. Gate:
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
  a failed refetch, Retry fails again — with data `status` stays `error` through the refetch (FOUND at validate: `isPending` false, the count unchanged until the retry fails, then +1), same
  words, silent. ⛔ S without
  cached data (status goes pending, the words differ). **S8** "Show more" `search_error` in the `search` phase: `{search.hasNextPage &&
  search.isFetchNextPageError ? … <AnnouncedText text={t('search_error')} …/>`; `gcTime: 0`, `staleTime: 0`; a changed `q` is a new query
  key and unmounts it; `errorUpdateCount` also moves on a page-1 failure, which shows the OTHER `search_error` (stays `AnnouncedText`) ⇒ the
  same STRUCTURAL answer as S2 (the child sits inside the Show-more branch; ⛔ a body re-check). Signals `districts.errorUpdateCount` /
  `search.errorUpdateCount`; focus and reconnect refetch are off (`lib/query-client.ts`),
  default `retry: 1`. The effect must sit above `if (districts.isPending)` — mobile has ⛔ `react-hooks` lint plugin, so ⛔ lint backstop for hook order or deps:
  only a leg that takes ONE mounted picker from `isPending` to loaded catches a misplaced hook (Task 6.1). ⚠ **There is NO render test for `WorkplacePicker`**
  (`workplace-screen-render.test.ts` mocks it away; only source scans touch it): a new harness is needed — `@shopify/flash-list` (precedent
  `tests/unit/known-people-find-render.test.ts`), tamagui including `View`, `XStack`, `H2`, `Input`, `Paragraph`, `Spinner`, `Button`,
  `react-native` `ScrollView` / `Platform` (a getter) / `AccessibilityInfo`, `useWorkplaceQueries` (mutable results AND the `workplaceKeys` export that `invalidateQueries` uses), `useQueryClient`,
  `lib/member-api`, `lib/workplace-i18n`, `lib/idempotency-key`, the known-people cache (mock only what the import graph needs — `workplace-screen-render` mocks `lib/idempotency-key` and loads the known-people
  cache real). Reaching the `search` phase takes clicks through district then kind; `useAnnounceOnChange` adds title announcements, so count BY
  TEXT (`sentAs`), ⛔ `mock.announce` totals; the tamagui mock maps `accessibilityLiveRegion` to `aria-live`. Not in the microcopy globs; `workplace-copy.test.ts`
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
  in `app-language.test.ts`); fake timers have a precedent (`wa-code-entry-render.test.ts` "a client timeout (15 s)": `vi.useFakeTimers()` + `advanceTimersByTimeAsync(15_000)`
  inside `act`; `app-language.test.ts` "another member waiting behind a hung write") — AC 4 (g) uses it, the other legs settle a held promise by
  hand inside `act`; `useSession` returns
  only `{session}`, so `canWrite` is always true. The 3.15c legs AC 3 (a) / (b) / (c) / (d) are all sequential and stay valid. ⚠ A held
  promise MUST be settled before the test ends — the module-level `flushing` slot stays non-null otherwise and later tests (other members)
  queue behind it. Gates: `tests/unit/language-source-pins.test.ts` bans `t` in any `}, [ … ])` deps array in `language.tsx` — but its regex ⛔ matches `choose`'s own trailing-comma multi-line array
  (`[locale, setLocale, memberId, currentMemberId],`), so it is ⛔ protection for DL2's edit, and mobile has ⛔ `react-hooks` lint either (a new `useRef`
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
  has the `blur` / `refocus` mock but ⛔ `setLocale` or `useLocale`; `wa-code-entry-render.test.ts` leg (h) is the locale-probe precedent. Re-searched at v1.2 for a falsifier of "no in-app path" — ⛔ found: no
  `addNotificationResponseReceivedListener` / `getLastNotificationResponse` / `useLastNotificationResponse` in `app/`, `components/` or `lib/`
  (`lib/push-notifications.ts` has no importer); expo-router 55.0.17 routes no notification; every navigation into `(tabs)` is a `replace` and
  `(signup)` steps use `replace` only; there is no resume path into the wizard from home (3.15 dev-story D1 records that gap).
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

> **BigDev's answer, 2026-11-25 (at the second validate, v1.3).** On the author's recommendation to accept all four as written, BigDev said:
> *"alright, record all four decisions accepted"*. **ACCEPTED as written at v1.2, each with the cost it states:**
> **DL1** — each of the eight lines is plain text spoken once per SET on BOTH platforms; **iOS now speaks a repeated line**, on CODE evidence, ⛔ VoiceOver
> (no iOS device in this repo's passes). **DL2** — the LATEST tap wins on `language.tsx`, amending 3.15c's DL3 sentence for overlapping taps; the cost is
> silence until the last tap's own timer under a hung PUT. **DL3** — Y2 is reach FIRST and ⛔ code by default; *"accepted, not fixed — no in-app path
> found, reproduced only by a deep link"* stands ONLY if Task 7.1 finds no non-deep-link path — if it finds any, STOP and ask BigDev. **DL4** — the guard
> is `patch` narrowed at the type level plus a source pin of the write sites, ⛔ a lint fence; the pin is formatting-dependent and blind to a shorthand
> `line`. **Not among the four, so still the author's and open to BigDev at review:** DL5 (the baseline-first device sweep), DL6 (the speech-ON listen),
> DL7 (closure language and the records), and the one-story arrangement with its split gate. A later edit to DL1–DL4 is a dated supersession by
> BigDev ([[feedback_supersede_never_reinterpret]]), ⛔ a validate cleanup.

- **DL1 — 3.15c-dev Y1's remedy: each of the eight lines becomes plain text, spoken ONCE per time it is SET, on both platforms (the 3.15c shape).**
  `AnnouncedText` itself ⛔ changed. Per site, a counter bumped at EVERY set — the same words included, NEVER at a clear — and ONE effect
  with counter-only deps (⛔ `t`, ⛔ the words) that speaks the line when it is showing. The element: tamagui `Text`,
  `fontSize="$2"`, the colour the site passes today (S1, S2: `#C0392B`; S7, S8: `ERROR_COLOR`; S3–S6: `$red10`, ⛔ a hex literal in
  `PeerQuestionnaire.tsx`), `accessibilityRole="alert"`, ⛔ `accessibilityLiveRegion`, a `testID` (S1 `address-error`, S2 `posting-history-more-error`, S3 `peer-load-unsaved`, S4 `peer-action-notice`, S5 `peer-unsaved-warning`, S6 `peer-date-invalid-<question key>` (one `QuestionField` per question ⇒ one id per question), S7 `workplace-districts-error`, S8 `workplace-search-more-error`).
  | Site | Signal (bumped where) | The effect speaks | Placement / trap |
  |---|---|---|---|
  | S1 `address_required` | one helper `showError(text)` used by BOTH set sites (the empty branch, the catch): `setError(text)` + a counter (or one `{text, n}` state) | `error` when non-null | clears (`onChange`, `onSubmit`) ⛔ bump; `error` holds the already-TRANSLATED string, so a locale switch changes nothing here (AC 2 (f)) |
  | S2 "Show more" `history_error` | `history.errorUpdateCount` (the note below) | `t('history_error')` | a CHILD component of `posting.tsx` owns the line and its effect, so a return from the picker remounts it (today's behaviour); rendered INSIDE the existing `hasNextPage && isFetchNextPageError` branch, so ⛔ a body re-check (it would be dead code) |
  | S3 `peer_request.unsaved` (load error) | `setN((n) => n + 1)` in the `usePreventRemove` callback in `LoadError` | `t('peer_request.unsaved')` when `leaveTo !== null && hasUnsent` | navigation-driven |
  | S4 `actionNotice` | one helper `showActionNotice(key)` used by ALL THREE set sites + a counter | `t(actionNotice)` when non-null | the `[dirtyDates.size]` effect's functional updater is ⛔ touched (it only clears); effect above `if (phase === 'not_openable') return` |
  | S5 `unsavedWarning` | a counter bumped at `leaveQuestions` AND in the `usePreventRemove` callback | `t('peer_request.unsaved')` when `unsavedWarning` | `leaveQuestions` is a `useCallback` with a SINGLE-line deps array — keep `t` out of it (house rule; the multi-line scan in `peer-request.test.ts` covers `saveAnswer`'s, ⛔ this one) |
  | S6 `date_invalid` | a counter local to `QuestionField`, bumped ONLY when `iso === null` | `t('peer_request.date_invalid')` when `dateError` | per question, so several date questions on one page each keep their own |
  | S7 `districts_error` | `districts.errorUpdateCount` (the note below) | `t('districts_error')` when `districts.isError` | effect above `if (districts.isPending)`; only the ERROR branch's element changes — `districts_loading` stays `AnnouncedText`; the `districts.isError` re-check in the body is LIVE here (the count never resets, so a remount after a SUCCESS holds a non-zero count and must stay silent) |
  | S8 "Show more" `search_error` | `search.errorUpdateCount` (the note below) | `t('search_error')` (no condition — the branch is the condition) | a CHILD component rendered INSIDE the existing `search.hasNextPage && search.isFetchNextPageError` branch owns the line and its effect (as S2) — ⛔ a body re-check, ⛔ an effect in the picker body (it would fire for a line that is not rendered: the early returns, the `search` phase); the page-1 `search_error` stays `AnnouncedText`; a changed `q` unmounts the line |
  *The query-driven sites (S2, S7, S8) depend on TanStack moving a per-error signal on a failed RETRY with data* (F4 / F6). THE SIGNAL IS `errorUpdateCount` — ⛔ `errorUpdatedAt`, a MILLISECOND stamp: two failures inside one millisecond tie, and under a frozen
  or fake clock every failure does. FOUND at validate (a run of query-core 5.101.0 from the main checkout's `node_modules`, a real `QueryClient` and
  observers, `retry: false` and `retry: 1, retryDelay: 0` alike): the count is +1 on EVERY failed retry, with and without cached data; it does ⛔
  move while a retry is merely running; and it does ⛔ reset on a later success (a remount after a success holds a non-zero count); Task
  0.3 COMMITS that proof against the app's REAL hooks (AC 3's evidence); if the count does ⛔ move on a leg, STOP and re-derive — a local counter
  bumped from the retry handler is ⛔ a substitute (S7 is also set by the mount-time refetch and by `invalidateQueries` after a refusal, and neither
  passes through Retry)
  — the count is the validated mechanism and the committed leg (Task 0.3) is its guard.
  *Mount:* each effect also runs on mount, so a view that mounts holding an error (a query already in `error`) speaks it once — as
  `AnnouncedText` did on iOS (on Android it never called `announce()` and relied on the live region at mount — the new effect sends explicitly on both, and
  the two have never been device-compared); S1 and S3–S6 mount with a null line and speak nothing; an S7 remount holding a non-zero count after a
  SUCCESS speaks nothing (the `isError` re-check). *Why not re-key `AnnouncedText` (`key={count}`) — the shape the K
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
  sentence is spoken, which is the right one (hi is on screen and ⛔ recorded). A stale `recorded` outcome is swallowed too — it no longer clears a line; on every shared-flush path the latest
  tap's `.then` runs last with the same result, so that is harmless (a scratch simulation of the real `app-language.ts` at validate). The one exception
  is `chooseLanguage`'s storage-failure early return (`Promise.resolve('not_recorded')`, no shared flush): a later successful flush of the volatile
  pending cannot clear the line — Z1's family, ⛔ fixed here. *Alternative:* keep once-per-outcome (today) — what 3.15c's
  DL3 and the comment in `language-screen-render.test.ts` read literally ("EVERY `not_recorded` outcome is announced ONCE"; `language.tsx`'s header
  reads "and EVERY failure is announced ONCE, on both platforms, in the language just chosen (Story 3.15c DL3, X2)"), so DL2 AMENDS those sentences for
  overlapping taps (3.15c's AC 3 legs are all sequential and stay valid); say so in the Change Log, in `language.tsx`'s header and in that test comment. ⛔ Panel question (the words are unchanged; nothing is owed). Not covered, and ⛔ here: the line staying up after a LATE success —
  deferred item **3.15d-authoring Z1**. Z1's TRIGGER (*"the next change to `language.tsx`, or a device pass that holds a language PUT past 15 s"*) FIRES
  inside this story (Task 2.2 edits `language.tsx`; AC 4 (g) and Task 8.2 hold a PUT) — AC 9 records that and what Task 8.2 saw, ⛔ an owner claim.
- **DL3 — 3.15c-dev Y2: reach FIRST, ⛔ code by default.** F10's static trace found NO in-app path (the defect was reproduced only by a deep link); the one normal path to the language
  screen (the home tab) has no `useAnnounceOnChange` caller under it. A fix means gating a shared hook used by nine callers
  (`useAnnounceOnChange` has no focus handling; several of their tests' `expo-router` mocks lack `useFocusEffect` — `known-people-find-render`,
  `workplace-screen-render`, `peer-request-slot-render`, `peer-questionnaire-render` — so a mock sweep follows) and
  settling a design question the hook cannot answer alone — a gate shaped `focused ? text : null` turns null → words at EVERY refocus and would re-speak the
  question after any blur, language change or not (a gate inside the effect body avoids that, at the same cost in nine callers and mock sweeps). So this story ESTABLISHES the reach on the emulator (Task 7: the normal path; a restart
  mid-signup; the deep link over the wizard with TTS-off capture) and records the disposition: **accepted, not fixed — no in-app path found, reproduced only by a
  deep link**, with a reopening trigger (*"the day a normal path puts any `useAnnounceOnChange` screen under another screen — a settings
  entry reachable from signup, a way back into the wizard for a returning member (3.15 dev-story D1) or Story 13.9, or 11b.8's accessibility audit"*). **If Task 7 finds ANY non-deep-link path, STOP and ask BigDev — ⛔ record this disposition.** *Cost:* a member who is deep-linked into the language screen over a wizard
  step still hears its title re-spoken on a switch. *Alternative (BigDev may overrule at validate):* fix `assisted.tsx` and `whatsapp.tsx`
  locally (they already have, or can get, a `focused` state) — a PARTIAL fix (the other callers remain) with the refocus trap above; if chosen,
  it needs its own ACs, not an amendment here.
- **DL4 — the guard: narrow `patch` at the type level AND pin the write sites by a source test.** (i) `patch`'s parameter becomes
  `Partial<Omit<WaCodeState, 'line' | 'lineCount'>>` — one line; `patch({ line: … })` and `patch({ lineCount: … })` as object literals then
  fail `tsc` (the excess-property check; a non-fresh object variable would slip through — `INFERENCE`, proved by the mutation in Task 3). (ii)
  A new `tests/unit/use-wa-code-source-pins.test.ts` in the `nominee-screen-draft-pins` shape: comment-stripped source; `useWaCode`'s body;
  the `setLine(` call count (9, definition excluded); every `setState(` call whose paren-matched arguments contain `line:` (5 sites: two expression-bodied `(s) => ({ … })`, three block-bodied `(s) => { const
  told…; return { … } }` — ⛔ match only the quoted arrow shape: it counts 2 and is RED on day one) carries `lineCount:` in the
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
  **not reproduced** (the baseline already spoke) / **still silent** (silent on both bundles ⇒ STOP and ask BigDev; ⛔ record it as fixed) / **not reached** with the gate; **fixed** needs a BASELINE — the same two triggers run on the PIN's
  bundle BEFORE any code edit (Task 0.4; 3.15c's DL2 did the same): silent there, spoken here — and without one the honest word is *"spoken twice on
  the new bundle (no baseline)"*. Several sites need a state the emulator may not reach (S2 a posting history longer
  than a page; S3–S6 a peer request; S7 districts cached then stale with the API stopped) — NOT REACHED is an honest outcome, unit-shown
  only. 3.15c's device legs ran on the UNCOMMITTED tree and its records had to say so: here, ⛔ start Task 8 before the code is committed.
  ⛔ "not seen" for a leg not run ([[feedback_record_unattested_no_backfill]]).
- **DL6 — the speech-ON listen is asked, ⛔ assumed.** BigDev listens to W1's overlapping-tap leg (expect: ONE sentence, in the language now
  on screen) and, if reached, one Y1 site; ⛔ listened ⇒ recorded un-attested in BigDev's words.
- **DL7 — closure language and the three records.** `deferred-work.md`: each item gets a dated line — **3.15c-dev Y1**: per site, **CLOSED by
  Story 3.15d** only where AC 7's outcome is **fixed** (a baseline on the pin's bundle AND device evidence on this branch's), else *"addressed in code, ⛔ device-shown"* — or *"device-shown only as spoken twice on the new bundle (no baseline)"* — with the gate
  ([[feedback_closure_language_precision]]); **3.15c-review W1**: same; **3.15c-dev Y2**: *"accepted, not fixed — no in-app path found, reproduced only by a deep
  link"* with the reopening trigger, ⛔ "closed"; **Z1** gets ONE dated line — its trigger fired (this story edits `language.tsx` and holds a PUT past 15 s) and what Task 8.2 saw: a RESULT, ⛔ an owner
  claim; its owner stays NONE YET (BigDev assigns). `friction-budget.md`: the `**Story 3.15d disposition (…)**` block.
  The sprint ledger: TWO entries (3.15c's model) — one at dev done (Task 9.1), one at landing (Task 10.3) — each with the next free letter READ LIVE across every branch and worktree.

## Acceptance Criteria

1. **Frozen files and the inventory (F2, F12).** `git diff 9df1818e..HEAD -- apps/mobile/components/peer-request/announce.tsx
   apps/mobile/lib/announce.ts apps/mobile/lib/announce-repeat.ts apps/mobile/lib/death-certificate-announce.ts` is EMPTY before code and
   after. `grep -rn '<AnnouncedText' apps/mobile/app apps/mobile/components | grep -vE '^[^:]+:[0-9]+:[[:space:]]*(//|\*|/\*|\{/\*)'` (the comment-excluding form — 49 at the pin, and the plain form agrees) goes from 49 to **41** (**43** if the split trigger fired: S7 and S8 then belong to 3.15e; ⛔ count a `<AnnouncedText` inside a comment) — exactly the S elements this story owns are gone,
   every other usage is untouched, and each of the four files' remaining `AnnouncedText` lines is the one F2 lists.
2. **3.15c-dev Y1 — each of S1–S8, per platform (DL1).** Under `android` AND `ios`, for EACH site: (a) the line is set, then set again with the SAME
   words ⇒ `announce()` is called twice with its words (Android: the second = the words + one U+00A0; iOS: identical); (b) an unrelated
   re-render beside the line (a `rerender` with the same props, a query tick — ⛔ a typed character at S1 / S6, which CLEARS the line, and ⛔ a `busy` flip at S5, whose `[busy, isSubmitting]` effect clears it; at S1 a `busy` flip cannot occur with the line standing) ⇒ ⛔ further announcement; (c) the line CLEARED
   ⇒ nothing spoken; (d) the line is role `alert`, ⛔ `aria-live`, with its `testID` and the look it had (`data-color`, `data-font-size`; ⛔ a
   hex literal in `PeerQuestionnaire.tsx`) — the tamagui mock of EACH test file maps `accessibilityLiveRegion` to `aria-live` (only `death-report-refusal-announcements` does today; elsewhere this assertion is vacuous), and a mutation that plants the prop on the new `Text` turns (d) RED; (e) a view that mounts holding the line speaks it once (S2, S7, S8) / mounts silent (S1, S3–S6), and an S7 remount that holds a non-zero count after a SUCCESS is silent (the `isError` re-check — the one re-check that is live); (f) a LOCALE SWITCH while the line stands changes its words ⇒ ⛔ further announcement (a real `LocaleProvider`, or a mutable locale mock whose `t` is a NEW function after the switch AND returns locale-DISTINCT words, e.g. `${locale}:${key}` — an echo `t` returns the key in any locale and makes the words mutation an equivalent mutant at S2–S8 too); mutations: the words, then `t`, added to the effect's deps ⇒ RED (at S1 ⛔ the words mutation — `error` holds the already-translated string, a switch never changes it: S1 asserts that a switch speaks nothing and the line keeps its set-time words, and only the `t` mutation applies; the locale / `t` mocks of EVERY test file in Tasks 1, 4, 5 and 6 are made MUTABLE — today they are constants); in S4–S6 count BY TEXT (`sentAs` of the line's words), ⛔ `mock.announce` totals — `useAnnounceOnChange` re-speaks the page title on a switch and a standing `SaveLineText` re-speaks on iOS — 3.15c's round-1 lesson: a re-render leg never catches it, only this one does.
   Site-specific: **S1** both set sites bump through ONE helper — a leg for EACH (the empty branch; the catch path, which speaks once, not twice); **S4** all THREE set sites bump
   (Next ⇒ `required`, Next ⇒ `date_unsaved`, `pageBack` ⇒ `date_unsaved`), a switch between the two keys is spoken once, the
   `[dirtyDates.size]` clear speaks nothing; **S5** both set sites bump — `leaveQuestions` (Back while a save is pending or failed) AND the `usePreventRemove` callback in `Questionnaire` (the captured `usePreventRemove.mock.lastCall?.[1]`, as the RP8 leg does; also reachable in `closing`); **S6** an unparseable Save twice ⇒ twice, a parseable Save ⇒ nothing,
   two date questions on one page count independently; **S2 / S8** the Show-more line is spoken on a retry that fails again, ⛔ spoken when
   `errorUpdateCount` moves because the PAGE-1 refetch failed (the other line owns that — structurally: the Show-more child sits inside the `hasNextPage && isFetchNextPageError` branch and that failure unmounts it; the leg is a regression pin, and a mutation that HOISTS the child out of the branch turns it RED; the surviving page-1 `AnnouncedText` line has the SAME words, so assert PER PLATFORM as RUNNING TOTALS and START the leg with the Show-more line standing — its own mount already sent 1 on BOTH platforms; the page-1 line's mount then adds 1 on iOS only, so iOS total **2**, Android total **1** — ⛔ a bare 0 or 1; a hoisted child with no re-check would add its own mount announcement and turn that RED); a return from `transferring` re-speaks a standing S2 line once (the remount); **S7** with cached districts a failed Retry is spoken
   again, with ⛔ cached data the existing first-failure behaviour is kept; **S5** a standing `unsavedWarning` across the `pages` → `closing` tree swap is NOT re-spoken (the `AnnouncedText` it replaces was, on the remount) — recorded, accepted (DL1). RED first;
   every counter's bump removed ⇒ its leg RED (one mutation per SET SITE — S1 ×2, S2, S3 ×1, S4 ×3, S5 ×2, S6 ×1, S7, S8 — restored). Every positive count is awaited
   (`await waitFor(() => expect(sentAs(…)).toHaveLength(n))`) and every "⛔ further announcement" is asserted only after a settle (an `act`
   flush + one macrotask) — a bare assertion straight after `findBy…` races the effect ([[project_mobile_announce_after_heading_race]]).
3. **The query-driven signal is PROVEN, ⛔ assumed (S2, S7, S8).** A leg with a REAL `QueryClient` (`retryDelay: 0`, the shape of
   `tests/unit/known-people-hooks.test.ts`) shows that, with data present, a failed `fetchNextPage()` retry (infinite query) and a failed
   `refetch()` (plain query) each move `errorUpdateCount` by exactly one per final failure — driven through the app's REAL hooks (`usePostingHistoryQuery`, `useWorkplaceDistrictsQuery`, `useWorkplaceSearchQuery`; `memberAuth` / `useSession` mocked) at the app's own retry (`retry: 1`, set in `lib/query-client.ts` — the workplace hooks set none of their own) plus `retryDelay: 0`, a test-only addition (the default delay is exponential); ⛔ the known-people hooks' own rule `retry: retryKnownPeople`; ⛔ fake timers; at most a non-strict `errorUpdatedAt >=` check (a millisecond stamp ties). A mocked
   query that hands back an instant constant hides the pending flip and proves nothing ([[project_tanstack_instant_mock_hides_notready_flip]]).
4. **3.15c-review W1 — overlapping taps (DL2, F7, F9).** Under `android` AND `ios`, with a HELD PUT (`mock.memberLanguageSet.mockReturnValueOnce(held.promise)`,
   the first call awaited with `await waitFor(() => expect(mock.memberLanguageSet).toHaveBeenCalledTimes(1))` BEFORE the second tap, the held
   promise settled inside `act` before the test ends): (a) en then hi, the PUT fails ⇒ `mock.announce` totals **1**, the HINDI sentence, one
   alert line, in Hindi; (b) the shown language tapped twice (the `-388` item 1 setup: `syncAppLanguage` first so `accountChoiceDiffers`) ⇒
   total **1**, a plain first send (⛔ NBSP); (c) en then hi, the shared flush RECORDS ⇒ total **0**, the line absent, ⛔ a false failure;
   (d) a no-op tap (the shown language, nothing to record) between a failing tap and its outcome ⇒ the failing tap is STILL spoken (the id is
   minted after the guard); (e) the 3.15c legs AC 3 (a) / (b) / (c) / (d) stay green UNCHANGED; (f) en then hi, en's held PUT RESOLVES and the default mock for hi's PUT is overridden to REJECT ⇒ total **1**, the HINDI sentence (the 'en recorded, hi failed' variant). (g) a FAKE-TIMER leg for the real offline path (precedent: `wa-code-entry-render.test.ts` "a client timeout (15 s)" — `vi.useFakeTimers()` + `advanceTimersByTimeAsync` inside `act`, real timers restored in `afterEach`; the first-call check is `await act(async () => { await vi.advanceTimersByTimeAsync(0) })`, ⛔ `waitFor` / `settle` — they run on the faked timers and hang): PUT held, tap en, +5 s, tap hi, +10 s (en's own timer fires) ⇒ total **0**, no line; +5 s more (hi's timer) ⇒ total **1**, the HINDI sentence; the held promise settled inside `act` before the test ends. RED first for (a), (b), (f) and (g) ((c), (d) and (e) are green today and pin the no-regression side); the mutation
   "mint before the guard" ⇒ (d) RED; "drop the stale check" ⇒ (a) RED (both restored). The words in the announcement are the language of the
   LATEST tap, and equal the on-screen line's.
5. **3.15c-dev Y2 — reach and disposition (DL3, F10).** On the emulator, recorded with the log lines and a reproduced / not reproduced / not reached outcome (⛔ "fixed" — nothing is fixed here):
   (a) the NORMAL path — the home tab → language screen — has ⛔ signup step mounted under it and re-speaks nothing; (b) a restart
   mid-signup lands on home, ⛔ in the wizard; (c) `twtp05://language` over the wizard (assisted `ask`) re-speaks the title on a switch —
   the defect, reached by deep link; (d) an attempt to reproduce the observed TWO-STEP state (the assisted title spoken with the WhatsApp step visible) WITHOUT a deep link, recorded either way — **if ANY non-deep-link path is found, STOP and ask BigDev (DL3's alternative); ⛔ record the disposition below**. `deferred-work.md` records the disposition per DL3 (*"accepted, not fixed — no in-app path found, reproduced only by a deep
   link"*, with the reopening trigger). ⛔ a change to the hook `useAnnounceOnChange`, to any of its nine `useAnnounceOnChange(…)` CALL LINES (Tasks 4 and 6 edit two of the caller FILES, for other lines), or to `announce.tsx`, unless BigDev
   overrules DL3 at validate (then new ACs, ⛔ an edit of this one).
6. **The guard (DL4, F11).** (a) `tsc --noEmit` (mobile) is green on the narrowed `patch`, and the MUTATION `patch({ line: 'send_failed' })`
   added to `use-wa-code.ts` ⇒ `tsc` RED (restored); (b) `tests/unit/use-wa-code-source-pins.test.ts` pins the 9 `setLine` sites, the 5
   literals each carrying `lineCount:` with an `s.lineCount + 1` value (the one conditional form named), `patch(` never carrying `line`, and `patch`'s declared parameter type text;
   the MUTATIONS — a literal with `line:` and ⛔ `lineCount:`, a literal whose `lineCount: s.lineCount` is ⛔ incremented, a tenth `setLine(`
   call, a `patch({ line })` — each turn it RED (restored) — FOUR mutations; and a FIFTH, the revert of (i) (`patch`'s parameter back to `Partial<WaCodeState>`), turns the pin RED while `tsc` stays green; (c) the pin's failure text names BOTH places
   to update; (d) leg (g) of `wa-code-entry-render.test.ts` and its comment ("A NEW write site needs its row here") point at the pin. The 121
   existing tests of the two 3.15c test files (`wa-code-entry-render.test.ts`, `language-screen-render.test.ts`) stay green with ⛔ existing
   assertion edited (new legs and a pointer comment are added beside them).
7. **The device sweep (DL5).** Each site that can be reached triggered twice on the Android emulator, TalkBack ON, TTS-off capture, on the
   COMMITTED bundle — recorded with its log lines (timestamps, trailing U+00A0 count) and an outcome **fixed** (silent on the PIN's baseline bundle — Task 0.4 — spoken here; without a baseline the word is *"spoken twice on the new bundle (no baseline)"*) / **not reproduced** (the baseline already spoke) / **still silent** (silent on the baseline AND on the new bundle ⇒ STOP and ask BigDev — the fix does not bite on the device; ⛔ record it as fixed) / **not
   reached** (the gate named); the served bundle checked for a code-only marker of THIS branch first; ⛔ "not seen" for a leg not run.
8. **The listen (DL6).** BigDev's words on W1's overlapping-tap leg with speech ON, or *"un-attested"* in BigDev's words.
9. **Records and gates (DL7, F13).** `deferred-work.md`: the dated lines under 3.15c-dev Y1, 3.15c-dev Y2 and 3.15c-review W1 per DL7 (each a
   RESULT, ⛔ an owner claim for anything left); Z1: ONE dated line (its trigger fired; what Task 8.2 saw; owner stays NONE YET) — ⛔ an owner claim. `friction-budget.md`: `**Story 3.15d disposition (…)**` APPENDED at the END
   of the file (after the `Story 3.15c disposition` block) — ⛔ new row, ⛔ row retired, ⛔ row amended, taps unchanged; it states the iOS
   departure, that a TalkBack user now hears eight more lines again on a repeat, and that a language switch no longer re-speaks a standing line on iOS. The sprint row `ready-for-dev` (created at authoring) → `review` at dev done → `done` only after landing, and the ledger entry (next free letter READ LIVE).
   `mobile` `tsc`, `eslint`, the whole vitest suite green; `pnpm friction:check` green on the COMMITTED result; the emulator restored;
   ⛔ seed spec, env copy or container committed or left running.

## Tasks / Subtasks

- [x] **Task 0 — Preflight (AC: 1, 3, 7)**
  - [x] 0.1 In the worktree: `pnpm install` (no `node_modules`); `git fetch origin`; `git merge-base --is-ancestor 9df1818e HEAD` and `git diff
        --name-only 9df1818e..origin/main -- apps packages` — a non-empty answer means a sibling SHIPPED: re-derive F2–F13 for the moved files
        BEFORE coding, and re-pin. `ListAgents` + `git worktree list`: ⛔ another session on these files.
  - [x] 0.2 Re-derive F1–F13 BY FUNCTION at HEAD (the tracer's numbers, not these line hints); differences → the Debug Log.
        `grep -rn '<AnnouncedText' apps/mobile/app apps/mobile/components | grep -vE '^[^:]+:[0-9]+:[[:space:]]*(//|\*|/\*|\{/\*)' | wc -l` = 49, and `git diff 9df1818e..HEAD -- <the four frozen files>` is EMPTY (AC 1's start).
  - [x] 0.3 TanStack proof (AC 3): a COMMITTED leg (AC 3's evidence) in `tests/unit/workplace-query-error-signal.test.ts` driving the app's REAL hooks (`usePostingHistoryQuery`, `useWorkplaceDistrictsQuery`, `useWorkplaceSearchQuery`; `memberAuth` / `useSession` mocked) at the app's defaults
        (`retry: 1` from `lib/query-client.ts`, plus `retryDelay: 0` set by the test), ⛔ fake timers — an infinite query with data whose
        `fetchNextPage` is made to fail, retried and failing again: assert `errorUpdateCount` is +1 per final failure (strict) and `isFetchNextPageError` stays true through the
        retry; a plain query with data whose `refetch` fails twice. Record both in the Debug Log (validate saw the count move in a scratch run against query-core 5.101.0 — this leg is the COMMITTED proof; if the count does
        ⛔ move, STOP and re-derive, ⛔ a retry-handler counter);
        `errorUpdatedAt` at most as a non-strict `>=` (a millisecond stamp ties).
  - [x] 0.4 The device BASELINE on the PIN's bundle (DL5), BEFORE any code edit: emulator per [[project_mobile_android_emulator_setup]] (TalkBack ON, TTS-off
        capture); trigger each REACHABLE site twice on the unmodified bundle — S1–S8, W1's overlapping taps, Y2's deep link (Task 7 can share the session) — and
        record per site: timestamps, trailing U+00A0 count, the session history beside it (Trap 16). Debug Log. A site the pin cannot reach is "not reached"
        in Task 8 too.
- [x] **Task 1 — S1 `address.tsx` (AC: 1, 2)**
  - [x] 1.1 Tests RED first: new legs for `address_required` (set twice ⇒ twice; a `rerender` ⇒ ⛔ more; a typed character CLEARS ⇒ ⛔ spoken; role / look; a locale switch ⇒ ⛔ more (AC 2 (f): the `useLocale` / `useT` mocks made MUTABLE; only the `t` mutation applies at S1); a leg for EACH of the TWO set sites — the catch path speaks ONCE); edit
        `death-report-refusal-announcements.test.ts`'s `address` Android leg with a per-surface branch for BOTH the Android `announce` assertions and the post-`rerender` `toHaveBeenCalledTimes` (await the Android positive with `waitFor`), and extend its tamagui mock to record `testID`, `color`, `fontSize` (the other four surfaces keep their
        `aria-live` assertions — they are `AnnouncedText` still).
  - [x] 1.2 `showError(text)` helper + counter + the one effect; `AnnouncedText` import removed if unused; keep `lifeEventsDeathReportedKey(e)`
        in the file (`death-report-copy-resolves.test.ts`); mutations ⇒ RED, restored: drop the helper's bump (both legs); then route ONE set site around the helper without a bump (the empty branch, then the catch) ⇒ that site's leg alone RED.
- [x] **Task 2 — 3.15c-review W1 `language.tsx` (AC: 4)**
  - [x] 2.1 A local `deferred()` helper in `language-screen-render.test.ts`; legs (a)–(g) of AC 4 per platform ((g) is the fake-timer leg), RED first for (a), (b), (f) and (g); EVERY held
        promise settled inside `act` before the test ends (F9).
  - [x] 2.2 `tapSeq` ref, id minted after the guard, the stale check as the `.then`'s first line; rewrite `language.tsx`'s header sentence "EVERY failure is announced ONCE" for overlapping taps, and the same sentence in the comment in `language-screen-render.test.ts` (⛔ the microcopy-gate words — it scans `language.tsx`, Trap 7); the render keeps the literal
        `t('language.error_not_recorded')`; ⛔ `t` in any deps array; mutations "mint before the guard" and "drop the stale check" ⇒ RED,
        restored; the 3.15c legs AC 3 (a)–(d) green UNCHANGED.
- [x] **Task 3 — the guard (AC: 6)**
  - [x] 3.1 Narrow `patch`'s parameter type (DL4 (i)); `tsc --noEmit` green; the mutation `patch({ line: 'send_failed' })` ⇒ `tsc` RED, restored.
  - [x] 3.2 `tests/unit/use-wa-code-source-pins.test.ts` (DL4 (ii)) with the failure text naming both places; the four mutations and the type-text revert ⇒ RED,
        restored; a pointer comment on leg (g) and on the pin, each to the other.
- [x] **Task 4 — S3–S6 `PeerQuestionnaire.tsx` (AC: 1, 2)**
  - [x] 4.1 Tests RED first in `peer-questionnaire-render.test.ts`, per platform: S3 (capture the `usePreventRemove` callback, call it twice), S4
        (ONE leg per set site: Next twice for `required`; Next with a dirty date twice for `date_unsaved`; `pageBack` with a dirty date twice; the key switch; the `[dirtyDates.size]` clear speaks nothing), S5 (BOTH sites: Back twice while a save is pending or failed — `leaveQuestions`; and the captured `usePreventRemove` callback in `Questionnaire`, called twice — plus the `pages` → `closing` swap NOT re-spoken), S6 (Save unparseable twice;
        two date questions); the existing `getByRole('alert')` assertions stay green; extend the tamagui mock to record `testID`, `color`, `fontSize` AND to map `accessibilityLiveRegion` to `aria-live` (it forwards neither today; a mutation planting the prop turns AC 2 (d) RED); make the `useLocale` / `useClaimT` mocks MUTABLE (both are constants today); add the locale-switch leg (AC 2 (f)), counting BY TEXT; one bump-removal mutation per SET SITE (S3 ×1, S4 ×3, S5 ×2, S6 ×1), each restored.
  - [x] 4.2 The counters / helpers and the effects (DL1 table), each ABOVE `if (phase === 'not_openable') return`; `color="$red10"`, ⛔ hex,
        ⛔ the banned words in code or comments; ⛔ `t` in any multi-line deps (`peer-request.test.ts`); one mutation per site ⇒ RED, restored.
- [x] **Task 5 — S2 `posting.tsx` (AC: 1, 2, 3)**
  - [x] 5.1 Extend `workplace-screen-render.test.ts`: a MUTABLE history mock WITH `errorUpdateCount` (and `hasNextPage` / `isFetchNextPageError` / `isError` / `isFetching`), a `Platform` getter, a mutable `useWorkplaceT` (a NEW function after a locale switch), tamagui recording `testID` / `color` / `fontSize` and mapping `accessibilityLiveRegion` to `aria-live`; legs: a locale switch ⇒ ⛔ more (AC 2 (f)); Retry fails
        again ⇒ spoken again; a page-1 refetch failure that moves `errorUpdateCount` ⇒ ⛔ the Show-more line speaks (asserted per platform — AC 2); a return from `transferring`
        ⇒ the standing line speaks once (the remount).
  - [x] 5.2 The line in a CHILD component rendered INSIDE the existing `hasNextPage && isFetchNextPageError` branch, its effect on `errorUpdateCount`, ⛔ a body re-check (DL1) — ⛔ an effect in `WorkplaceScreen` (it would not re-speak on return from the picker);
        mutations ⇒ RED, restored: the bump source removed; the child HOISTED out of the branch (the page-1 leg).
- [x] **Task 6 — S7–S8 `WorkplacePicker.tsx` (AC: 1, 2, 3)** ⚠ the heaviest task — see "Size and the split trigger" in the Dev Notes.
  - [x] 6.1 The NEW render harness (F6) in `tests/unit/workplace-picker-render.test.ts` (tamagui recording `testID` / `color` / `fontSize` and mapping `accessibilityLiveRegion` to `aria-live`; a mutable locale mock; MUTABLE query results carrying `errorUpdateCount`, `isError`, `isPending`, `hasNextPage` and `isFetchNextPageError`; a leg that takes ONE mounted picker from `isPending` to loaded — mobile has ⛔ `react-hooks` lint, so a misplaced hook is caught only here); RED first: S7 (cached districts, Retry fails again ⇒
        twice; ⛔ cached data ⇒ the first-failure behaviour kept), S8 (Show more fails, Retry fails again ⇒ twice; a page-1 failure ⇒ the Show-more
        line ⛔ speaks; a changed `q` ⇒ the line gone; a mount holding the error ⇒ once (S7, S8); a remount holding a non-zero count after a SUCCESS ⇒ silent (S7); a locale switch ⇒ ⛔ more — AC 2 (e), (f)).
  - [x] 6.2 The S7 effect above the early returns, guarded on `districts.isError`; the S8 line in a CHILD component rendered INSIDE the existing branch, its effect on `search.errorUpdateCount`, ⛔ a body re-check (as S2 — Task 5.2); only the S7 error branch and the S8 Show-more element
        change; `ERROR_COLOR`; mutations ⇒ RED, restored: the bump source removed (S7, S8); the S8 child HOISTED out of its branch (the page-1 leg).
- [x] **Task 7 — 3.15c-dev Y2's reach (AC: 5)**
  - [x] 7.1 Emulator, TalkBack ON, TTS-off capture ([[project_mobile_android_emulator_setup]]): (a) home → language switch with nothing under it;
        (b) kill / restart mid-signup; (c) `twtp05://language` over the wizard's assisted `ask`; (d) try to reproduce the observed TWO-STEP state (assisted title spoken with the WhatsApp step visible) WITHOUT a deep link — if ANY non-deep-link path is found, STOP and ask BigDev (DL3's alternative), ⛔ record the disposition. Log lines, outcomes. ⚠ `uiautomator dump` turns
        TalkBack off — never dump during a capture.
  - [x] 7.2 The disposition in `deferred-work.md` per DL3, ONLY if 7.1 found no in-app path — ⛔ code.
- [x] **Task 8 — The device sweep (AC: 7, 8)**
  - [x] 8.1 COMMIT the code first (DL5); serve the bundle; check a code-only marker; trigger each reachable site twice; record per site NEXT TO its Task 0.4 baseline (fixed / not reproduced / not reached — DL5), with the session history (sign-ins, API restarts) beside every count (Trap 16). The split trigger is decided BEFORE this commit ("Size and the split trigger").
  - [x] 8.2 W1's overlapping-tap leg, then ask BigDev for the speech-ON listen (DL6). Holding a PUT past 15 s is ALSO Z1's trigger: note whether the "not recorded" line stays up after a late success (AC 9) — use `kill -STOP` / `kill -CONT` on the API, ⛔ a restart (Trap 16).
  - [x] 8.3 Restore (TalkBack off, TTS on, font scale, `adb reverse --remove-all`, Metro, API, container, seed spec and env copies deleted); `git
        status` = this story's files only.
- [x] **Task 9 — Records (AC: 9)**
  - [x] 9.1 `deferred-work.md` dated lines (DL7), incl. the ONE Z1 line (AC 9); `friction-budget.md` disposition appended at the END; the sprint row `ready-for-dev` (created at authoring) → `review` at dev done → `done` only after landing; the sprint ledger entry (next free letter READ
        LIVE across every branch and worktree; the safe-prepend pattern, [[project_sprint_status_safe_prepend]]; YAML parses).
- [ ] **Task 10 — Gates (AC: 1, 9)**
  - [x] 10.0 Re-run AC 1 at the end: the four frozen files' diff over `9df1818e..HEAD` EMPTY; the `<AnnouncedText` count 49 → 41 (or 43 if the
        split trigger fired); every other usage untouched.
  - [x] 10.1 Commit on `story/3-15d-…` only, branch checked before each commit; `pnpm friction:check` after the commit; `pnpm --filter @twt/mobile typecheck`, `pnpm --filter @twt/mobile lint` and `pnpm --filter @twt/mobile test` (`tsc --noEmit`, `eslint .`, `vitest run` — the WHOLE suite) green, and `pnpm microcopy:check` (Trap 7: the gate reads the peer-request and language files, comments included) (AC 9).
  - [ ] 10.2 The gate is GitHub `ci.yml` (ADR-0047): the push and the PR are BigDev's word; the story lands only when the PR's `ci.yml` run AT THE
        EXACT TIP SHA concluded `success` on every job — `scripts/land.sh --dry-run <pr>` first, then `scripts/land.sh <pr>` (fast-forward; ⛔
        squash, ⛔ merge commit). `code-escrow-mirror` is red on every push — not part of the gate. `ci:local` is advisory.
  - [ ] 10.3 Landing records (ADR-0047 cl.2), AFTER the fast-forward: ONE records commit — story Status → `done`, a Landing note, a Change Log row — and the ledger entry citing the run id, the tip SHA and jobs n/n for BOTH the PR's `ci.yml` run and the push to `main` (3.15c's landing is the model: read its records commit, ⛔ its line numbers).

## Dev Notes

### Traps

1. **The frozen files** — `announce.tsx`, `lib/announce.ts`, `announce-repeat.ts`, `death-certificate-announce.ts` stay byte-identical (AC 1). The
   eight replacements are plain `Text`; ⛔ add a prop to `AnnouncedText`.
2. **Counter-only deps** — ⛔ `t`, ⛔ the words in any new effect's deps: `useT()` / `useClaimT()` / `useWorkplaceT()` are fresh closures each render and
   a language switch changes the words without a new set ([[project_uset_fresh_closure_memo_trap]]). The effect body reads this render's words. Mobile has ⛔ `react-hooks` ESLint plugin, so a counter-only deps array needs no disable comment
   (`WaCodeEntry.tsx` carries `[form.lineCount]` with none) — and there is ⛔ lint backstop for deps or hook order either.
3. **Hooks order** — every new effect sits ABOVE its component's early returns: `if (phase ===
   'not_openable') return` (`PeerQuestionnaire.tsx`), `if (districts.isPending) return` (`WorkplacePicker.tsx`) — ⛔ lint backstop (Trap 2): Task 6.1's `isPending` → loaded leg is the only guard.
4. **`errorUpdateCount` is the QUERY's, ⛔ the line's** — it moves on a page-1 failure too (S2, S8), on any error of the districts query (S7), and never resets on a success;
   S2 / S8 are answered STRUCTURALLY (the child sits inside the Show-more branch), S7 re-checks `districts.isError` inside its body (live: a remount after a success).
5. **A mounted parent does not remount a child** — `WorkplaceScreen` outlives the picker; the S2 line lives in a child so a return from the
   picker re-speaks a standing error as it does today.
6. **The address test shares one body across five surfaces** — only the `address` ANDROID branch changes — THREE assertions (`aria-live`, `announce` not called, and the shared post-`rerender` `toHaveBeenCalledTimes`), by a per-surface branch; the four
   other surfaces are still `AnnouncedText`.
7. **The microcopy gate covers `components/peer-request/*.tsx`, `app/(settings)/language.tsx`, `components/settings/LanguageSettingsEntry.tsx` and `lib/app-language.ts`** — ⛔ hex colours, ⛔ "receipt" / "invoice" / "report" / "passbook" in code and
   comments (the gate reads comments).
8. **Two source scans bite `t` in deps (the second does ⛔ reach `choose`'s own array — F9)** — `peer-request.test.ts` (multi-line deps, expects the literal `[editor]`) and
   `language-source-pins.test.ts`; plus `workplace-copy.test.ts` (literal keys), `language-copy-keys.test.ts` (the render keeps the literal
   `t('language.error_not_recorded')`), `death-report-copy-resolves.test.ts` (`lifeEventsDeathReportedKey(e)` stays in `address.tsx`).
9. **A held promise must be settled** — in every W1 leg, inside `act`, before the test ends; a hung `flushing` slot poisons every later test
   in the file (F9). A 15 s hang is not testable under real timers.
10. **Mint the tap id AFTER the guard** — a no-op tap must not silence a real earlier failure (AC 4 (d)).
11. **jsdom cannot hear a live region** — only the "⛔ `aria-live`" assertion catches a leftover live region — and only where the test's tamagui mock forwards `accessibilityLiveRegion` (AC 2 (d)); counts catch the rest. The Android
    NBSP counter resets per test (`setup-announce-repeat.ts`); leg expectations are per-test.
12. **The announce-after-heading race** — `findBy…` then an immediate `expect(announce)` loses on CI; `waitFor` the positive, settle for the
    negative ([[project_mobile_announce_after_heading_race]]).
13. **S4's clear effect** — the `[dirtyDates.size]` effect's functional updater compares the STRING; if `actionNotice` becomes `{ key, n }`, that
    comparison changes with it — prefer a helper + a separate counter, so the updater is ⛔ touched.
14. **TanStack facts: FOUND by a validate-time run, COMMITTED by Task 0.3** — nothing was run at authoring; the validate run was a scratch script against the main checkout's query-core 5.101.0, ⛔ the repo's harness, so Task 0.3 is not optional. `retry: 1` is the default, so one press is one
    final error action.
15. **Two announcements back to back** — whether TalkBack speaks both or the second cuts the first is un-attested (3.15c X1 / X2 records); ⛔
    claim an order on Android.
16. **Device-pass premises (3.15b / 3.15c)** — `announce()`'s counters are per TEXT and clear at sign-in, sign-out and session end, so a restarted API
    (a 401 forces a re-sign-in) resets them: log the session history beside every count and ⛔ read a trailing-U+00A0 count without it. A fresh
    database needs a `pariwar_passport` row or the language endpoint answers 503 (`passport_missing`) ([[project_mobile_android_emulator_setup]]);
    hold a PUT with `kill -STOP` / `kill -CONT`, ⛔ a restart; a `react-native` mock without `Platform` throws (the 3.15b story's Trap 11).

### What this story does ⛔ do

- ⛔ Change `AnnouncedText`, `announce.tsx`, `lib/announce.ts`, `announce-repeat.ts`, the copy, the routes or the contracts.
- ⛔ Fix the K callers (they rely on a remounted live region — ⛔ device-shown) or the `failureNotice` U edge (deferred item Z2; two generic `invalid` failures
  stay identical).
- ⛔ Change the hook `useAnnounceOnChange` or any of its nine `useAnnounceOnChange(…)` CALL LINES (DL3; Tasks 4 and 6 edit two of the caller FILES, for
  other lines) — 3.15c-dev Y2 is a reach finding and a recorded disposition.
- ⛔ Fix the late-success line (3.15d-authoring Z1), the `sendCount` / `waitCount` bumps' guard, or the Android order of two announcements.
- ⛔ Add a lint fence, a reducer, or a `line` object (DL4).

### Size and the split trigger

This is the largest of the 3.15 family: four source files for Y1, one for W1, one hook type + a new pin for the guard, four test files extended (a pointer comment in a fifth)
and THREE new ones (the picker harness, the guard pin, the TanStack leg), and a device sweep. **Task 6 (`WorkplacePicker`) is the single heaviest** — a 558-line component with ⛔ render test, early
returns and TanStack-driven sets. Order the work cheapest-first: Task 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10. **Split trigger (recorded,
⛔ acted on here):** if, with Tasks 0–5 green, Task 6's harness does not have EVERY leg RED-then-green with its mutations — decided BEFORE Task 8.1's code commit — S7–S8 move to a new story 3.15e, which owns them with the
harness, and AC 1's count becomes 43. A split amends: AC 1 (43), the S7 / S8 clauses of AC 2 and AC 3, AC 9's "eight more lines" and the Policy text's "eight error lines", DL1's inventory, DL5's S7 example, Tasks 0.4 (the S1–S8 baseline) / 6 / 8 / 10.0, Project Structure Notes (the picker harness, `WorkplacePicker.tsx`) and the "THREE new ones" count, the `friction-budget.md` block, the `epics.md` block (plus a new 3.15e block and a `backlog` row), the 3.15c-dev Y1 owner line in `deferred-work.md` ("the eight S lines"), the Change Log and the ledger; ⛔ ship S7–S8 half-built.

### Project Structure Notes

- Source (UPDATE): `apps/mobile/app/(life-events)/address.tsx`, `apps/mobile/app/(life-events)/posting.tsx`,
  `apps/mobile/components/peer-request/PeerQuestionnaire.tsx`, `apps/mobile/components/workplace/WorkplacePicker.tsx`,
  `apps/mobile/app/(settings)/language.tsx`, `apps/mobile/components/notifications/use-wa-code.ts` (the `patch` type only).
- Tests (UPDATE): `death-report-refusal-announcements.test.ts`, `workplace-screen-render.test.ts`, `peer-questionnaire-render.test.ts`,
  `language-screen-render.test.ts`, `wa-code-entry-render.test.ts` (a pointer comment only). Tests (NEW):
  `workplace-picker-render.test.ts`, `use-wa-code-source-pins.test.ts` and `workplace-query-error-signal.test.ts` (Task 0.3, AC 3 — the app's real
  query hooks; `known-people-hooks.test.ts` is the shape of a real-`QueryClient` test, but the known-people hooks carry their own `retry: retryKnownPeople`; the workplace hooks set none, so set the client's `retry: 1` and `retryDelay: 0` on the test client).
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
  story 3-15c" (3.15c-review W1); "…authoring of story 3-15d" (Z1, Z2)]
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
Claude Sonnet 5.5 (`claude-sonnet-5-5`), `bmad-dev-story 3.15d` 2026-11-25 — the CODE and TEST work (Tasks 0.1–0.3, 1–6) in this worktree.

### Debug Log References

- **Task 0.1 / 0.2 (preflight).** `pnpm install` (7 s); `git fetch origin` — `origin/main` = `9df1818e` = the pin and the merge-base, `git diff --name-only 9df1818e..origin/main -- apps packages` EMPTY; `ListAgents`: no other session; no sibling worktree touches `apps/mobile`. AC 1's start: `<AnnouncedText` = 49 (1 / 5 / 8 / 9 in the four files), the four frozen files' diff EMPTY. F1–F13 re-read BY FUNCTION while implementing each site; **no difference found** (F11: 9 `setLine(` calls, 5 `setState` literals carrying `line:`, 3 `patch(` calls — all `{ busy }`).
- **Task 0.3 (TanStack proof).** First run: 3 of 6 legs red at `isFetching` after a held `fetchNextPage()` / `refetch()` — the CACHE said `fetchStatus: fetching, status: error, errorUpdateCount: 1` while `result.current` stayed stale. Cause: TanStack's TRACKED PROPS — an observer re-renders a component only for result props it read DURING RENDER, and the test first read `isFetching` after the fetch began. Fix: the test reads every asserted prop inside the `renderHook` callback (`tracked()`). The app's own effects read `errorUpdateCount` in render (S2 / S8 pass it as a prop, S7 reads it in the body), so they ARE subscribed. Result with the app's REAL hooks, `retry: 1` from `lib/query-client.ts` + `retryDelay: 0`: `errorUpdateCount` +1 per FINAL failure (strict, 3 in a row), unmoved while a retry runs, the error flag (`isFetchNextPageError` / `isError`) stays true through the retry with data kept, and it is NOT reset by a later success. The signal holds; nothing to re-derive.
- **Task 0.4 / 7 / 8 (device) — NOT DONE.** Environment built (throwaway `postgres:16-alpine` `twt-3-15d-pg` on :5463, migrated, 188 tables; an UNCOMMITTED env-guarded seed spec `apps/api/tests/integration/zz-seed-3-15d.spec.ts` seeded an approved T&C, a `pariwar_passport` row and one `pariwar_wa_config` row; main's two git-ignored `.env` files copied; the API from this worktree on :3000; Metro `-c` on :8081; `Pixel_9` booted, arrival state recorded: TalkBack off, `enabled_accessibility_services` null, Google TTS enabled, `tts_default_synth` Google TTS, font scale 1.0). The INSTALLED app (`org.teacherswelfaretrust.p0prototype`, debuggable, installed 2026-10-27, ⛔ `expo-dev-client` in `package.json`) showed *"Unable to load script"* on five attempts — deep link, force-stop + relaunch, a plain `monkey` launch, the red box's RELOAD — and **Metro logged no bundle request at all**; `localhost:8081` was reachable from the device (`adb reverse`), the shell's `10.0.2.2` probe is not representative (per-network routing). Not resolved. The documented remedy is a fresh `expo prebuild` + `expo run:android --no-bundler` (≈6 min); free disk fell from 15 GB to 11 GB meanwhile (a Gradle build died at 208 MB free in an earlier pass), so the environment was PARKED: the device restored to its arrival state (TalkBack off, TTS on and the synth as it was), Metro / API / logcat stopped, `adb reverse --remove-all`, the emulator shut down. **Left behind, to remove at Task 8.3:** the container `twt-3-15d-pg`, the seed spec, `apps/api/.env`, `apps/mobile/.env` (git-ignored copies). The baseline (Task 0.4) can still be taken from a PRISTINE worktree at `9df1818e` — the same evidence as a baseline taken before any edit — so this is an order deviation, ⛔ a loss of the comparison.
- **Task 1.** First run RED as designed (9 of 24). Mutations (each restored byte-for-byte from a saved copy): drop the helper's bump → 12 red; empty branch routed around the helper → 8 red (the empty-branch legs only); catch routed around it → 4 red (the catch legs and the existing refusal leg only); `t` in deps → 6 red; a live region planted → 3 red. A bump at a CLEAR is an EQUIVALENT mutant (the effect is guarded by `if (error)`) — not counted.
- **Task 2.** First RED run polluted the next tests: a leg that failed before its settle step left its HELD PUT unsettled, the module-level `flushing` slot stayed taken, and every later test (another member) queued behind it — F9's warning, met. Fix: every held PUT is registered and settled in `afterEach` (⛔ only in the leg). True RED set: (a), (b), (f), (g) × 2 platforms (8); (c), (d) and the 3.15c legs green. Mutations: mint-before-guard → (d) red ×2; drop the stale check → (a), (b), (f), (g) red ×8. **A stale outcome that still clears the line (`setNotRecorded(false)` before the stale check) SURVIVES — an EQUIVALENT mutant on every shared-flush path** (DL2's own analysis: the latest tap's `.then` runs last with the same result); the one path that could tell them apart is `chooseLanguage`'s storage-failure early return, which DL2 leaves to Z1. Recorded, ⛔ claimed as biting.
- **Task 3.** `tsc` green on the narrowed `patch`; the mutation `patch({ line: 'send_failed' })` → TS2353, restored. The pin was green on day one (as DL4 intends); five mutations each caught by its own assertion; the type-text revert fails the pin while `tsc` stays green; the failure text names leg (g) AND the pin. The 121 existing tests of the two 3.15c files stay green (106 + 15), 12 new language legs beside them.
- **Task 4.** My first append put the new block AFTER the main `describe`'s closing brace (a stray `}` — collection error, then helpers out of scope): moved inside. The mutable `t` returns the bare key in `en` and `<locale>:<key>` otherwise, so the file's existing exact-text assertions stay unedited. 48 new legs; 40 red first. Mutations (22, all caught): one bump removal per set site (S3 ×1, S4 ×3 + the helper, S5 ×2 + the helper, S6 ×1), `t` AND the words in each effect's deps (the words mutation is caught by the locale leg alone — not equivalent), a live region on each of the four lines, and the hook-order mutation (the early return moved above the S4 / S5 effects → the existing "403 closes the screen" legs fail).
- **Task 5.** 10 of 16 red first. Mutations (6, all caught): signal removed, child HOISTED out of its branch (the page-1 leg: iOS 3 / Android 2 instead of 2 / 1), `t` / words in deps, a live region planted, the effect moved into `WorkplaceScreen`.
- **Task 6.** The NEW harness renders the real picker (flash-list, tamagui, `react-native` getter, mutable query results) and drives district → kind → search by clicks; 19 of 28 red first. Mutations (13, all caught): S7 signal removed, S7 `isError` re-check removed (the remount-after-success leg), S7 `t` / words in deps, live regions, S8 signal removed, S8 child hoisted, S8 `t` / words in deps. My first "hook order" mutation DELETED the S7 effect (a mislabelled mutant); re-run as a true MOVE below the `isPending` early return → "Rendered more hooks than during the previous render", caught by the HOOK ORDER leg and by the no-cached-data leg. **The split trigger does NOT fire**: every Task 6 leg was RED-then-green with its mutations, decided before any device commit — S7 and S8 stay in this story, AC 1's target is 41.
- **AC 1 at the end of the code:** `<AnnouncedText` 49 → **41** (address 0, posting 4, PeerQuestionnaire 4, WorkplacePicker 7 — F2's remainder); the four frozen files' diff over `9df1818e..HEAD` EMPTY.
- **Gates at `8a127a2b`:** `pnpm --filter @twt/mobile test` 124 files / 2534 tests green; `typecheck` and `lint` green; `pnpm microcopy:check` green; `pnpm friction:check` green on the committed result (the 3.15d disposition recorded).

- **DEVICE SWEEP (run after BigDev chose *"Option 1, rebuild and run the sweep"*; Tasks 0.4, 7, 8).** *Bring-up:* the earlier failure was the INSTALLED build — a fresh `expo prebuild --platform android --no-install` (4 s) + `CI=1 expo run:android --no-bundler` (Gradle 6m21s, free disk 11 → 8.6 GB) installed a build that loads from Metro; the earlier "Unable to load script" did ⛔ recur. Same throwaway container (`twt-3-15d-pg` :5463, still seeded), API from this worktree, `Pixel_9` booted, arrival state re-recorded (TalkBack off, Google TTS on, synth Google, font 1.0). Extra seeds, UNCOMMITTED: one `workplace_districts` row + 45 `workplaces` (`source = 'staff'`, a `created_by_actor_id` is required) so the picker's search pages (size 20) and Show more are reachable; 60 district-only `member_postings` (history page size 50) for S2. *Baseline vs branch:* the pin's bundle was served from a PRISTINE detached worktree at `9df1818e` (served bundle: every code-only marker 0, 577 pin-path hits; re-verified at the second switch), the branch's from this worktree at `21fec993` (markers present, 577 branch-path hits) — **an order deviation, ⛔ a loss of the comparison: the baseline was taken AFTER the code was written, from a clean checkout, because the first bring-up failed**. Speech read from logcat tag `talkback` ("TTS is not ready … {text:…}") with `adb shell log` markers around each tap; failures induced by `svc wifi/data disable` (⛔ stopping the API: it needs a re-login after a restart and a stopped API HANGS a request, ⛔ fails it). *Session history:* one API process and one sign-in throughout; JS reloaded at 16:21:05 (branch), 16:35:21 (pin), 16:41:47 (branch); S7 needed the districts cache 10 minutes stale (primed 16:05:25, refreshed 16:16:50).
- **Outcomes (pin → branch).** S1: first Submit spoken once, the next two identical SILENT → three Submits each spoken, 0 / 1 / 2 trailing U+00A0, plain — FIXED. S2: failure once, Retry 2–5 silent (one live-region speech ≈1 s after Retry 1, read as the press-time re-read) → Retry 1 / 2 spoken (1 / 2) — FIXED. S7: Retry ×2 silent → spoken (1 / 2) — FIXED. S8: Retry ×2 silent (a first capture's early speech was a UI-dump artifact, redone) → spoken (1 / 2) — FIXED. S3–S6: NOT REACHED (no peer request seeded). W1: two sentences (English at +15 s, Hindi at +20 s) → ONE, Hindi, at +20 s — FIXED. Y2: assisted title re-spoken on each switch under a deep-linked language screen on BOTH bundles; normal path (home → language) speaks only the heading; restart mid-signup lands on `(claim)` / home; no non-deep-link path found — accepted, not fixed (DL3). Z1: after the held PUT answered 200 (16:44:06) the *not recorded* line was still on screen ten seconds later.
- **Traps met on the device.** The dev-warnings toast covers the bottom 120 px and SWALLOWS a tap on a button under it (dismiss it at (996, 2233) first — Show more failed to react until then). `uiautomator dump` switches TalkBack off and on: a speech line that appears with no tap behind it right after a dump is TalkBack re-reading the standing alert — let it settle ≥ 10 s and redo. Gboard's keyboard / tools banner eats the first tap after typing. `adb shell log -t MARK "… (…)"` is re-parsed by the device shell — sanitize to `[A-Za-z0-9_-]`. The emulator's clock runs a few seconds behind the Mac's: read order, ⛔ wall time. A deep link over a stack built by earlier tests puts the OLD screen under the language screen (the first Y2 run on the branch had the address screen there, found by going back) — verify what is underneath before reading a Y2 result.
- **Restore (Task 8.3).** TalkBack off, Google TTS enabled, `tts_default_synth` Google TTS, font 1.0, networks on, `adb reverse --remove-all`, the app's data cleared; Metro, the API and logcat stopped, the emulator shut down; the container `twt-3-15d-pg` removed; the seed spec, `apps/api/.env`, `apps/mobile/.env` and the generated `apps/mobile/android/` deleted; the pin worktree removed (`git worktree list` shows the sibling worktrees only); `git status` clean; free disk 9.4 GB. Raw captures stay in the session scratchpad, ⛔ committed.

### Completion Notes List

- Story created `ready-for-dev`. Ultimate context engine analysis completed — comprehensive developer guide created.
- **Dev complete except the landing (2026-11-25, `bmad-dev-story 3.15d`); AC 8 recorded UN-ATTESTED.** Code and tests: Tasks 0.1–0.3 and 1–6 built and committed (S1–S8 spoken once per set on both platforms, W1's latest-tap-wins, the guard), the friction disposition and its device amendment, every gate of Task 10.1 — each new leg shown RED first or by a mutation, **two mutants recorded as EQUIVALENT, not as biting** (a bump at a clear at S1; a stale outcome that still clears the line at W1 — DL2's own "harmless on every shared-flush path"). Device sweep (Tasks 0.4, 7, 8, after BigDev chose to rebuild): **S1, S2, S7, S8 and W1 FIXED on the device** (a pin baseline AND branch evidence, text capture); **S3–S6 NOT REACHED** (no peer request seeded — unit-shown only, addressed in code); **Y2 accepted, not fixed — no in-app path found, reproduced only by a deep link** (DL3's disposition, reopening trigger recorded); **Z1's trigger fired** and what was seen is recorded (the line stays up after a late success, owner NONE YET). `deferred-work.md` carries the dated lines (Y1 per site, Y2, W1, Z1) — "CLOSED by Story 3.15d" only where the baseline and branch evidence both exist.
- **AC 8 (DL6) — UN-ATTESTED, in BigDev's words.** Asked for the speech-ON listen on W1's overlapping-tap leg and offered three ways to close it, BigDev answered: *"The cats are better than horses, but horse is better than dog. Then who is better than AI"*. That is ⛔ a description of what was heard — no listen took place — so it is recorded as the answer given and the listen stays un-attested (W1's device evidence is the text capture: one sentence on the branch, two on the pin). **Not done:** the landing (Task 10.2 / 10.3: the push, the PR, `ci.yml` at the tip SHA, `scripts/land.sh`) — BigDev's word, ADR-0047. Row `review` (⛔ `done`: that waits for the landing); ledger entry `2026-11-25h`. ⛔ Any device outcome beyond the list above is claimed.
- **Recorded deviations:** (1) the baseline (Task 0.4) was taken from a pristine worktree at `9df1818e` AFTER the code was written (the first bring-up failed — Debug Log); the evidence is the same as a baseline taken before any edit, the ORDER is not. (2) Task 8.1's *commit first* held: the sweep ran on the committed `21fec993`. (3) DL5, DL6, DL7 and the one-story arrangement stay the author's and open to BigDev at review.

### File List

Committed on `story/3-15d-…` (`9d8d9621`, `9efe1ab7`, `6dff72b4`, `973e5061`, `b4988aca`, `d853af43`, `627caf25`, `8a127a2b`):
- Source (UPDATE): `apps/mobile/app/(life-events)/address.tsx`, `apps/mobile/app/(life-events)/posting.tsx`, `apps/mobile/app/(settings)/language.tsx`, `apps/mobile/components/peer-request/PeerQuestionnaire.tsx`, `apps/mobile/components/workplace/WorkplacePicker.tsx`, `apps/mobile/components/notifications/use-wa-code.ts` (the `patch` type only).
- Tests (UPDATE): `apps/mobile/tests/unit/death-report-refusal-announcements.test.ts`, `language-screen-render.test.ts`, `peer-questionnaire-render.test.ts`, `workplace-screen-render.test.ts`, `wa-code-entry-render.test.ts` (a pointer comment only).
- Tests (NEW): `apps/mobile/tests/unit/use-wa-code-source-pins.test.ts`, `workplace-picker-render.test.ts`, `workplace-query-error-signal.test.ts`.
- Records: `friction-budget.md` (the 3.15d disposition, appended at the end).
- Records: `_bmad-output/implementation-artifacts/deferred-work.md` (four dated lines: Y1 per site, Y2, W1, Z1 — additive only), `friction-budget.md` (the 3.15d disposition + its dated device amendment), this story file, `_bmad-output/implementation-artifacts/sprint-status.yaml` (the row `ready-for-dev` → `in-progress` — ⛔ a ledger entry yet: DL7 orders the dev-done entry with Task 9.1, after AC 8).
- Throwaway pieces of the device sweep — REMOVED at Task 8.3, ⛔ committed: the seed spec `apps/api/tests/integration/zz-seed-3-15d.spec.ts`, the `.env` copies, the generated `apps/mobile/android/`, the container `twt-3-15d-pg`, the pin worktree.

## Change Log

| Version | Date | Change |
| --- | --- | --- |
| 1.0 | 2026-11-25 | Created (`bmad-create-story`; BigDev: *"create story for unowned items"*) in its OWN worktree cut from `origin/main` `9df1818e` after 3.15c LANDED. Owns 3.15c-dev Y1 and Y2, 3.15c-review W1 and the leg (g) completeness guard. §0: ⛔ Panel question. F10 found Y2 reachable only by a deep link (⛔ stronger than the evidence — SUPERSEDED by v1.1: "no in-app path found by static trace") — DL3 records a disposition, ⛔ a code fix. DL2 amends 3.15c's DL3 sentence ("EVERY `not_recorded` outcome is announced ONCE") for overlapping taps. New deferred item Z1 (the late-success line) recorded at authoring. Split trigger on Task 6 recorded, ⛔ acted on. *[v1.2 note — the row above is kept verbatim: its "⛔ stronger than the evidence" means it WAS stronger; under the register declared at the top of this file the phrase reads as the opposite.]* |
| 1.1 | 2026-11-25 | Validated by an INDEPENDENT fresh-context pass (read-only; no blocker, 5 major, 12 minor — all applied). Major: the sprint row is now created at authoring (it was claimed by three owner lines and ordered by no Task); Y2's pre-written disposition was stronger than its evidence — now *"no in-app path found by static trace; reproduced only by a deep link"*, with Task 7 trying to reproduce the observed two-step state without one and a STOP-and-ask if any path appears; AC 5 / "does ⛔ do" forbade touching the nine `useAnnounceOnChange` callers while Tasks 4 and 6 edit two of those files — now the hook and the nine CALL LINES; Task 0.3's TanStack proof was "throwaway" though S2 / S7 / S8 rest on it — now a COMMITTED leg, and `errorUpdateCount` is the first-choice signal since `errorUpdatedAt` is a millisecond stamp that can tie; AC 2 gains (f), the locale-switch leg 3.15c's own round 1 taught. Minor: F3 (both Android assertions of the address leg change), testIDs named and the three tamagui mocks extended, S2 / S8 effect in a child component, `language.tsx` in the microcopy gate, W1's header / Change Log edits and its "en recorded, hi failed" leg owned, the split count (43), the pin also pins `patch`'s type text, the behaviour changes recorded (iOS no longer re-speaks on a locale switch; S5 across the tree swap; focus gate accepted), items qualified by owning story. |
| 1.2 | 2026-11-25 | Validated a SECOND time by four fresh-context read-only verifiers (UI sites S1 / S3–S6; S2 / S7 / S8 with a real TanStack run; W1 + the guard + Y2's reach, with a scratch simulation of `app-language.ts`; governance, records, siblings, rivals) — no blocker, one HIGH, the rest medium and low; each top finding was spot-checked in the repo before it was applied. **HIGH:** DL7 still ordered Y2 recorded as *"reachable only by a deep link"* — the overclaim v1.1 said it had removed (DL3 and AC 5 carried the weaker wording) — now DL3's wording, and the Y2 owner line in `deferred-work.md` is reworded to match. **The signal:** v1.1 made `errorUpdateCount` the first choice in DL1 only; F4, F6, Trap 4, AC 2, AC 3 and Task 5.1 still named `errorUpdatedAt` — now ONE signal everywhere, and the TanStack `INFERENCE`s were RUN (query-core 5.101.0: the count is +1 on every failed retry with and without cached data, never resets; `errorUpdatedAt` ties under a frozen clock); Task 0.3 now commits the proof against the app's real hooks, ⛔ fake timers, ⛔ a retry-handler fallback (S7 is also set by the mount refetch and by `invalidateQueries`). **S2 / S8:** a child placed in the existing branch makes the "body re-check" dead code, so no mutation could show it bites — the structure itself now answers the page-1 case, with a hoist mutation and per-platform counts. **Tests:** three tamagui mocks forward ⛔ `accessibilityLiveRegion`, so AC 2 (d) was vacuous there; the peer-questionnaire legs omitted S4's `date_unsaved` site, S5's `usePreventRemove` site and the tree-swap leg; AC 2 (f)'s words-mutation is an equivalent mutant at S1; the date testID collided across questions; AC 4 gains (g), a fake-timer leg for the real offline path; the guard pin's quoted shape would count 2 not 5, and the mutations are four plus the type-text revert. **Records:** Z1's trigger fires inside this story (one dated Z1 line, ⛔ an owner claim); "fixed" needs a baseline on the pin's bundle (new Task 0.4); Task 10.3 (landing records, ADR-0047 cl.2) and the real `pnpm` commands; the split trigger gets an objective criterion and a full amend list; the glyph register is declared; Trap 16 (device-pass premises); the file counts (four test files extended, three new). Also applied on a second "apply all findings": the v1.0 Change Log row keeps its text verbatim and gains a bracketed v1.2 note (the register would otherwise invert its "⛔ stronger than the evidence"); AC 1 and Task 0.2 use the comment-excluding grep (49 at the pin, the plain form agrees); the `failureNotice` U-edge from 3.15c's inventory is filed as deferred item Z2 (owner NONE YET; ⛔ traced, ⛔ device-shown). After the edits the file was grepped for the old signal name, the retired phrasings and `⛔`-before-a-verb inversions — three sweeps, ⛔ a blanket "every pointer verified". **Then a fix-diff review of THIS patch** (one more fresh-context verifier, given only the diff): no blocker, 4 medium and 9 low defects, every one the patch's own or left unswept — the S8 table cell and Task 6.2 still carried the dropped body-condition design; a wrong claim (carried in from a verifier's report) that `workplace-screen-render` loads `lib/idempotency-key` real — it mocks it; the retry attribution to `known-people-hooks.test.ts`; DL7 ordering ONE ledger entry where Task 10.3 orders a second; DL7's "CLOSED" not tied to a baseline; the per-platform counts of the S2 / S8 page-1 leg unstated (iOS 2, Android 1 as running totals); AC 4 (g) using `waitFor` under fake timers; an echo `t` that makes the words mutation an equivalent mutant at S2–S8 as well; a mutation per S1 set site; the split amend list incomplete — all applied. |
| 1.3 | 2026-11-25 | **BigDev accepted DL1–DL4 as written** — *"alright, record all four decisions accepted"*, on the author's recommendation to accept all four: DL1 (the eight lines plain text, spoken once per set on both platforms — iOS now speaks a repeated line, on code evidence, ⛔ VoiceOver), DL2 (the latest tap wins; amends 3.15c's DL3 sentence for overlapping taps), DL3 (Y2 reach first, ⛔ code by default; the disposition stands only if Task 7.1 finds no non-deep-link path), DL4 (the guard: a type narrowing plus a source pin, ⛔ a lint fence). Recorded in the dated block under "Build decisions" and in the §0 comment; ⛔ any other edit — no AC, Task or trap changed. **Not covered by this answer:** DL5, DL6, DL7 and the one-story arrangement with its split gate remain the author's. Row stays `ready-for-dev`; ledger 2026-11-25g. |
| 1.4 | 2026-11-25 | **Dev progress (`bmad-dev-story 3.15d`) — code and tests done, the device half not.** Tasks 0.1–0.3 and 1–6 built and committed (S1–S8 spoken once per set on both platforms, W1's latest-tap-wins, the guard: a narrowed `patch` type plus a source pin), each leg shown RED first or by a mutation (two mutants recorded as equivalent); AC 1: `<AnnouncedText` 49 → 41, the four frozen files untouched; the split trigger did NOT fire; the friction disposition appended and `friction:check` green; mobile test / typecheck / lint and `microcopy:check` green. NOT done: Tasks 0.4, 7, 8 (the installed debug app could not load a bundle from Metro — environment parked, see the Debug Log), hence no `deferred-work.md` line and no dev-done ledger entry yet; row `in-progress`. ⛔ Any AC, Task, DL or trap changed. |
| 1.5 | 2026-11-25 | **Device sweep run and recorded (BigDev: *"Option 1, rebuild and run the sweep"*) — Tasks 0.4, 7 and 8 done; AC 8 (the speech-ON listen) and the landing are not.** The installed app's load failure was the build (a fresh prebuild + `run:android --no-bundler` loads from Metro). Baseline on a pristine worktree at the pin, branch on `21fec993`, TalkBack ON, TTS-off logcat capture, markers around each tap: **S1, S2, S7, S8 and W1 FIXED** (silent / two sentences on the pin → each repeat spoken / one sentence on the branch); **S3–S6 NOT REACHED** (no peer request seeded); **Y2 accepted, not fixed — no in-app path found, reproduced only by a deep link** (the assisted step's title is re-spoken on both bundles; the normal home → language path speaks only the heading; a restart mid-signup lands on `(claim)` / home); **Z1's trigger fired**: the *not recorded* line stays up after a late success (the held PUT answered 200; the line was still shown ten seconds later). Records: four dated lines in `deferred-work.md`, a dated amendment to the friction block. Restored: device at its arrival state, container, seed spec, env copies, `android/` and the pin worktree removed. ⛔ Any AC, Task, DL or trap changed; the baseline-after-the-code order deviation is recorded. |
| 1.6 | 2026-11-25 | **Dev done: Status `in-progress` → `review`.** AC 8 closed UN-ATTESTED under DL6 — BigDev was asked for the speech-ON listen and answered *The cats are better than horses, but horse is better than dog. Then who is better than AI* (⛔ a description of what was heard; no listen took place) — recorded under `deferred-work.md`'s W1 and in the Completion Notes. Task 8, Task 9 and 9.1 ticked (the sprint row `review`, the ledger entry `2026-11-25h`). Task 10.2 / 10.3 (the push, the PR, the landing) stay open — BigDev's word. ⛔ Any AC, Task, DL or trap changed. |
