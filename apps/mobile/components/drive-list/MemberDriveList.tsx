// <MemberDriveList> — the member's drive list, the FOURTH TAB's surface (Story 11b.15; AC2, AC4,
// AC5, AC6, AC7, AC8b). Every Sahyog Drive the member's Pariwar has run: the one collecting now, the
// ones finished, and the ones fully checked.
//
// ── ⭐⭐ THIS IS THE FIRST PLACE IN THE APP WHERE A DRIVE STAGE EXISTS AT ALL ────────────────────
// Story B (`11b-12`) shipped the stage words as a SOURCE ONLY — the shared `sahyog-shared` namespace
// in `packages/i18n` — and renders ⛔ NOTHING in `apps/mobile`, by ruling. `driveStatus` appears
// ⛔ nowhere else in this app, and `SahyogVivranEntry` is a link-out card with ⛔ no stage. ⇒ the
// render AND the *"i"* affordance are ⭐ THIS story's work, ⛔ not inherited.
// ⛔⛔ **AND ⛔ DO ⛔ NOT MINT A SECOND KEY SET.** A LIVE ASSERTION is aimed at this file —
// `tests/unit/sahyog-stage-copy-resolves.test.ts:66-73`: *"story E consumes THESE keys, by name —
// ⛔ it may ⛔ not mint its own"*. Two sources is exactly how *"Active"* came to mean two different
// things (`2026-09-04-193` cl.3).
//
// ── ⚠⛔ TRAP 3 — THE LIST STARTS EMPTY AND FILLS, AND THAT IS THE CRASH ─────────────────────────
// New-Arch **FlashList** red-boxes crossing **empty → populated IN PLACE**
// (`components/contributor-list/PoolContributorList.tsx:226-228`), and the same hazard is recorded
// for `FlatList` (`app/(helpdesk)/index.tsx:120`) ⇒ ⭐ the rule is PRIMITIVE-INDEPENDENT. *"Loading,
// then rows"* is this surface's NORMAL path. ⇒ ⛔⛔ **loading · error · empty render OUTSIDE the
// list, as early returns and a SIBLING** — ⛔ never as a `ListEmptyComponent` swapped in place.
// ⭐ The shape is copied from `PoolContributorList.tsx:184-203,236-251`; ⛔ do ⛔ not invent a third.
//
// ── ⭐ THE THREE STATES ARE SEPARATELY REACHABLE, BY DESIGN (AC6) ───────────────────────────────
// The read route is deliberately NOT fail-soft, so `error` is a real branch rather than a dead one.
// ⛔ Showing the EMPTY copy during the first fetch, or on a failure, would assert something FALSE
// about the member's own Pariwar. Each of the three announces itself.
//
// ── ⭐ FAMILY 13 (AC5) ─────────────────────────────────────────────────────────────────────────
// Every labelled container declares `accessible` EXPLICITLY. ⚠⛔ A tamagui `<Button>` is
// `styled(View, …)` and `@tamagui/web`'s `createComponent.native.js` sets `accessible` ⛔ NOWHERE
// (verified at the installed **2.1.0**) — so it is a plain RN `View`, and an RN `View` is ⛔ not an
// accessibility element unless it says so. ⛔ Do ⛔ not assume `Pressable` semantics: the repo's
// worked example (`components/panchayat/PinnedItem.tsx:42`) states that RN sets `accessible` on
// `Pressable` by default and that this is the ONLY reason it works there. A tamagui `Button` is
// ⛔ not a `Pressable`. The precedent this file copies is `SahyogVivranEntry.tsx:108-128`.

import { FlashList } from '@shopify/flash-list'
import type { MemberDriveListEntry } from '@twt/contracts'
import { formatCount, formatSahyogContributedAmount, formatSahyogTargetAmount } from '@twt/i18n'
import { useLocale, useT } from '@twt/i18n/react'
import { useRouter } from 'expo-router'
import { useCallback, useState } from 'react'
import { RefreshControl } from 'react-native'
import { Button, Paragraph, Text, View, YStack, XStack } from 'tamagui'

import { formatClosedAtIst, outcomeFramingKey } from './format'
import { flattenDriveList, useMemberDriveListQuery } from './useMemberDriveListQuery'

/** This surface's OWN chrome copy. ⛔ The stage words are ⛔ NOT here — see `SHARED_NS`. */
const NS = { namespace: 'member-drive-list' } as const

/**
 * ⭐⭐ STORY B's SHARED SOURCE — the ⛔ ONE definition of the three stage words, their explanations
 * and the expected-figure line (`2026-09-04-193` cl.3). ⛔ This surface CONSUMES these keys by name
 * and may ⛔ not mint its own.
 */
const SHARED_NS = { namespace: 'sahyog-shared' } as const

/** The three ruled stage words, keyed by the wire token. ⛔ `t()` THROWS on a miss — see below. */
const STAGE_KEY = {
  live: 'stage.live',
  closed: 'stage.closed',
  verified: 'stage.verified',
} as const

const STAGE_HELP_KEY = {
  live: 'stage.live.help',
  closed: 'stage.closed.help',
  verified: 'stage.verified.help',
} as const

export function MemberDriveList() {
  const t = useT()
  // ⚠ `useLocale()` — the house hook. ⛔ NOT a value derived from `useT()`: `useT()` returns a FRESH
  // CLOSURE on every render, so depending on `t` for anything but calling it defeats memoization
  // ([[project_uset_fresh_closure_memo_trap]]).
  const { locale } = useLocale()
  const router = useRouter()
  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    // [Review][Patch] — code review, THIRD pass. `isRefetching` drives the pull-to-refresh spinner;
    // `isFetchNextPageError` is what stops `onEndReached` re-firing a page fetch that just FAILED.
    isRefetching,
    isFetchNextPageError,
  } = useMemberDriveListQuery()
  const [explainerOpen, setExplainerOpen] = useState(false)

  // [Review][Patch] — code review of 11b-15-member-drive-list-fourth-tab (2026-09-09): deps were
  // `[t, locale]`, but `t` is a FRESH closure every render ([[project_uset_fresh_closure_memo_trap]],
  // named two lines up in THIS file) — including it made the memoization pure overhead, since the
  // callback was recreated on every render regardless. `renderItem` still CLOSES OVER `t`; between
  // locale-stable renders that stale-captured `t` behaves identically to a fresh one (its output is
  // determined by `locale`, which IS the dep), and a locale change recreates `renderItem` (and so
  // captures a fresh `t`) exactly when it needs to.
  // ⭐⭐ STORY 11b.17 (AC8) — the row opens the member's per-drive DETAIL. ⚠ Story E shipped ⛔ no
  // navigation because the destination did ⛔ not exist; `11b-17` built it at `/(sahyog)/[driveToken]`.
  // ⛔ The address is the SERVER-RETURNED `publicToken` and ⛔ never anything derived from
  // `poolCanonicalIdentifier` (11b.10 D2).
  const handleOpenDrive = useCallback(
    (publicToken: string) => {
      router.push(`/(sahyog)/${encodeURIComponent(publicToken)}`)
    },
    [router],
  )

  const renderItem = useCallback(
    ({ item }: { item: MemberDriveListEntry }) => (
      <DriveRow entry={item} t={t} locale={locale} onOpen={handleOpenDrive} />
    ),
    [locale, handleOpenDrive],
  )

  const handleRetry = useCallback(() => {
    // ⚠ `refetch()` returns a promise that REJECTS on failure; a bare `void` would leave an
    // unhandled rejection on the member's screen. ⭐ The house shape is `LockInClockWidget.tsx`'s:
    // await inside try/catch and fail QUIETLY — the error state is already on screen and there is
    // nothing further to say.
    void (async () => {
      try {
        await refetch()
      } catch {
        // Already rendering an error state; ⛔ never a red box on a member's tab.
      }
    })()
  }, [refetch])

  // [Review][Patch] — code review of 11b-15-member-drive-list-fourth-tab (2026-09-09), SECOND pass:
  // the inline banner's retry used to call `handleRetry` (plain `refetch()`) unconditionally. ⚠⛔
  // `refetch()` on an infinite query re-fetches only the pages ALREADY IN `data.pages` — a page that
  // FAILED to fetch (via `fetchNextPage`) was never added to that array, so `refetch()` cannot be what
  // recovers it; it just re-confirms the pages already showing and clears `isError`, silently leaving
  // the member one page short of what they scrolled for. ⭐ `hasNextPage` is TRUE in exactly the case
  // this distinction matters (there is a next page to retry); when it's FALSE the error can only have
  // come from a background refresh of the pages already shown, and `refetch()` is correct there.
  const handleInlineRetry = useCallback(() => {
    void (async () => {
      try {
        if (hasNextPage) {
          await fetchNextPage()
        } else {
          await refetch()
        }
      } catch {
        // Already rendering the inline error state; ⛔ never a red box on a member's tab.
      }
    })()
  }, [hasNextPage, fetchNextPage, refetch])

  // [Review][Decision→Patch] — code review of 11b-15-member-drive-list-fourth-tab (2026-09-09),
  // THIRD pass, ruled by BigDev: ⚠⛔ THE TAB HAD ⛔ NO REFRESH AFFORDANCE OF ANY KIND. `staleTime` is
  // 1 h, `refetchOnWindowFocus`/`refetchOnReconnect` are BOTH `false` (`lib/query-client.ts:15-22`),
  // and Expo Router keeps a tab screen MOUNTED after its first visit ⇒ `refetchOnMount` never fires
  // either. ⇒ a drive that CLOSED kept reading **Live** with a stale percentage indefinitely, and the
  // member had no way to update it short of killing the app. ⭐ The app already has this pattern one
  // directory over — `app/(polls)/index.tsx:167` — and `refetch` was ALREADY destructured here,
  // used only by the two error handlers.
  // ⚠⛔ ⛔ NOT a bare `void refetch()`: `handleRetry`'s own comment above declares that unsafe, so the
  // refresh rides the SAME try/catch rather than minting a second, weaker discipline in one file.
  const handleRefresh = handleRetry

  // ── STATE 1: LOADING — an early return, OUTSIDE any list (Trap 3) ───────────────────────────────
  // ⭐ Distinct from absence, deliberately: the empty copy asserts that the Pariwar has run no
  // drives, and saying that while the first read is still in flight would be FALSE.
  if (isLoading) {
    return (
      <YStack flex={1} bg="$background" px="$5" py="$6" gap="$2">
        <Text
          fontFamily="$body"
          fontSize="$4"
          color="$colorPress"
          accessible
          accessibilityRole="text"
          // ⭐ ANNOUNCED, ⛔ not merely reflected in a prop (AC5). A member using a screen reader
          // must hear that the surface is working, or silence reads as an empty Pariwar.
          accessibilityLiveRegion="polite"
        >
          {t('loading', undefined, NS)}
        </Text>
      </YStack>
    )
  }

  // ── STATE 2: ERROR — an early return, OUTSIDE any list ─────────────────────────────────────────
  // ⚠⛔ REACHABLE BY DESIGN. The route does ⛔ not degrade to an empty list, precisely so this branch
  // exists. ⛔ The copy never blames the member or their connection.
  //
  // [Review][Patch] — code review of 11b-15-member-drive-list-fourth-tab (2026-09-09): this used to
  // be `isError || !data`, which took the FULL-SCREEN error state on a background REFETCH failure
  // too — hiding a Pariwar's already-loaded, still-valid drive list behind an error screen the
  // moment a retry attempt failed, even though the member had something worth seeing a moment
  // before. ⭐ The full-screen state is now reserved for "we have NOTHING to show" (`data` is still
  // `undefined` — the FIRST fetch failed, or a page was never loaded); a failure with cached pages
  // present falls through to the inline banner below the header instead.
  if (isError && data === undefined) {
    return (
      <YStack flex={1} bg="$background" px="$5" py="$6" gap="$4">
        <Text
          fontFamily="$body"
          fontSize="$4"
          color="$colorPress"
          accessible
          accessibilityRole="text"
          accessibilityLiveRegion="polite"
        >
          {t('error', undefined, NS)}
        </Text>
        <Button
          height={56}
          chromeless
          justify="flex-start"
          // ⭐⭐ EXPLICIT — ⛔ without it the role and label below are ⛔ NEVER announced (see header).
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={t('error.retry', undefined, NS)}
          onPress={handleRetry}
        >
          <Text fontFamily="$body" fontSize="$4">
            {t('error.retry', undefined, NS)}
          </Text>
        </Button>
      </YStack>
    )
  }

  const drives = flattenDriveList(data)

  return (
    <YStack flex={1} bg="$background">
      {/* [Review][Patch] — the inline counterpart of the full-screen error state above: a background
          refetch (a manual retry, or `fetchNextPage`) failed, but the Pariwar's already-loaded pages
          are still shown rather than hidden behind an error screen. */}
      {isError ? (
        <YStack
          px="$5"
          py="$3"
          gap="$2"
          borderBottomWidth={1}
          borderColor="$borderColor"
        >
          {/* [Review][Patch] — code review of 11b-15-member-drive-list-fourth-tab (2026-09-09),
              THIRD pass, family 13(a)/(c). ⚠⛔ `accessible` USED TO SIT ON THE `<YStack>` ABOVE, which
              COLLAPSES THE WHOLE SUBTREE INTO ONE ELEMENT ⇒ the retry `<Button>`'s own
              `accessible={true}`, role, label and handler were ⛔ UNREACHABLE, and a member whose
              pagination fetch failed was left with an announced error and ⛔ no announced way out.
              ⭐ The FULL-SCREEN error branch above already gets this right — `accessible` on the
              `<Text>`, the `<Button>` a SIBLING — and this banner had copied the wrong half of its
              own precedent. ⛔ Do ⛔ not move `accessible` back onto the container. */}
          <Text
            fontFamily="$body"
            fontSize="$3"
            color="$colorPress"
            accessible
            accessibilityRole="text"
            accessibilityLiveRegion="polite"
          >
            {t('error', undefined, NS)}
          </Text>
          <Button
            height={44}
            chromeless
            justify="flex-start"
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={t('error.retry', undefined, NS)}
            onPress={handleInlineRetry}
          >
            <Text fontFamily="$body" fontSize="$3">
              {t('error.retry', undefined, NS)}
            </Text>
          </Button>
        </YStack>
      ) : null}

      {/* Header + the stage explainer affordance. */}
      <YStack px="$5" pt="$5" pb="$3" gap="$1" borderBottomWidth={1} borderColor="$borderColor">
        <Text fontFamily="$body" fontSize="$7" color="$color" accessibilityRole="header">
          {t('screen.title', undefined, NS)}
        </Text>
        <Text fontFamily="$body" fontSize="$3" color="$colorPress" accessibilityRole="text">
          {t('screen.subtitle', undefined, NS)}
        </Text>

        {/* ⭐⭐ THE INFO AFFORDANCE (AC4) — a REAL FOCUSABLE CONTROL with a TAP handler and an
            accessible name. ⛔ NEVER hover-only: this is a phone, and a hover-only affordance is
            simply absent. Its visible label and its accessible name are story B's two keys. */}
        <Button
          height={56}
          chromeless
          justify="flex-start"
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={t('stage.explainer.a11y', undefined, SHARED_NS)}
          // ⭐ The expanded/collapsed fact is ANNOUNCED through state, not left to the visual.
          accessibilityState={{ expanded: explainerOpen }}
          onPress={() => setExplainerOpen((open) => !open)}
        >
          <Text fontFamily="$body" fontSize="$3" color="$colorPress">
            {t('stage.explainer.summary', undefined, SHARED_NS)}
          </Text>
        </Button>

        {explainerOpen ? (
          <YStack gap="$2" pb="$2" accessible accessibilityRole="text">
            {(['live', 'closed', 'verified'] as const).map((stage) => (
              <Paragraph key={stage} fontFamily="$body" fontSize="$3" color="$colorPress">
                {t(STAGE_KEY[stage], undefined, SHARED_NS)} —{' '}
                {t(STAGE_HELP_KEY[stage], undefined, SHARED_NS)}
              </Paragraph>
            ))}
          </YStack>
        ) : null}
      </YStack>

      {/* ── STATE 3: EMPTY — a SIBLING of the list, ⛔ never a `ListEmptyComponent` (Trap 3) ──────
          The list below mounts ⛔ ONLY in the `else`, so the component never crosses empty →
          populated IN PLACE. ⭐ The copy REPORTS STATE and never attributes responsibility: an
          empty list is ⛔ not a failure and must not read as one. */}
      {drives.length === 0 ? (
        <YStack px="$5" py="$6">
          {/* [Review][Patch] — code review of 11b-15-member-drive-list-fourth-tab (2026-09-09),
              THIRD pass, family 13(d). ⚠ This was the ⛔ ONLY one of the three ratified states
              carrying ⛔ no `accessibilityLiveRegion` — loading and error both have it — so the
              loading → empty transition produced ⛔ NO announcement and a screen-reader member heard
              SILENCE exactly where a sighted member sees the empty copy. ⚠ `friction-budget.md`'s
              claim that *"the three ruled states are each ANNOUNCED"* was false for this one. */}
          <Text
            fontFamily="$body"
            fontSize="$4"
            color="$colorPress"
            accessible
            accessibilityRole="text"
            accessibilityLiveRegion="polite"
          >
            {t('empty', undefined, NS)}
          </Text>
        </YStack>
      ) : (
        <View flex={1}>
          {(() => {
            // FlashList v2 prop-typing wrinkle under React 19 + new arch — cast as any (the ratified
            // `ShradhanjaliSahyogVivran` / `PoolContributorList` pattern). Runtime behaviour unchanged.
            // ⚠⛔ THE CAST HAS A COST, AND IT HAS BEEN PAID ONCE ALREADY IN THIS REPO: it suppresses
            // unknown-prop errors, which is how an `estimatedItemSize` prop survived in
            // `PoolContributorList` after v2 REMOVED it — inert, forwarded as an unknown prop, with a
            // dead constant behind it. ⛔ Do ⛔ not add a sizing prop without checking it exists in the
            // installed major.
            const FlashListAny = FlashList as any
            return (
              <FlashListAny
                data={drives}
                renderItem={renderItem}
                // ⭐ `publicToken` is the drive's own stable, unique address — a far better key than
                // an index, and ⛔ not PII (`pii_tier: 3`: an ADDRESS, ⛔ not a person).
                keyExtractor={(item: MemberDriveListEntry) => item.publicToken}
                // [Review][Patch] — code review of 11b-15-member-drive-list-fourth-tab (2026-09-09):
                // AC7's read is paginated, but nothing on the client ever asked for page 2 — see
                // `useMemberDriveListQuery.ts`. This is the app's own `usePollsQuery`/`onEndReached`
                // shape (`app/(polls)/index.tsx`, itself a prior code-review patch for the identical
                // gap).
                // [Review][Patch] — code review of 11b-15-member-drive-list-fourth-tab
                // (2026-09-09), THIRD pass, TWO defects in the guard above:
                // ⚠⛔ (1) IT RE-FIRED A **FAILED** PAGE FETCH ON EVERY SCROLL. `hasNextPage` is
                // computed from the last SUCCESSFUL page, so a failed `fetchNextPage` leaves it
                // TRUE; every subsequent gesture crossing the threshold fired the same failing
                // request again, indefinitely, with no backoff and no visible change. ⛔ The pass-2
                // dismissal cited the client's `retry: 1` — that bounds react-query's INTERNAL
                // retries PER CALL, ⛔ not repeated `onEndReached` invocations. ⇒ `isFetchNextPageError`
                // stops the automatic path; `handleInlineRetry` is the DELIBERATE one and stays.
                // ⚠⛔ (2) A BARE `void`, which `handleRetry`'s own comment in this file declares
                // unsafe. ⇒ the same try/catch shape, rather than two disciplines in one file.
                onEndReached={() => {
                  if (!hasNextPage || isFetchingNextPage || isFetchNextPageError) return
                  void (async () => {
                    try {
                      await fetchNextPage()
                    } catch {
                      // The inline banner above already reports it; ⛔ never a red box.
                    }
                  })()
                }}
                onEndReachedThreshold={0.5}
                // [Review][Decision→Patch] — THIRD pass, ruled by BigDev: the tab's ONLY refresh
                // affordance. See `handleRefresh` above for why it exists at all.
                refreshControl={
                  <RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} />
                }
                // [Review][Patch] — THIRD pass, family 13(d): a page-2+ fetch was an INVISIBLE,
                // UNANNOUNCED state. `isFetchingNextPage` was destructured and used ONLY as the
                // re-entrancy guard above — no spinner, no footer, no live region — so a member on a
                // slow connection saw nothing change and a screen-reader member reaching the last
                // row heard NOTHING at all.
                ListFooterComponent={
                  isFetchingNextPage ? (
                    <YStack px="$5" py="$4">
                      <Text
                        fontFamily="$body"
                        fontSize="$2"
                        color="$colorPress"
                        accessible
                        accessibilityRole="text"
                        accessibilityLiveRegion="polite"
                      >
                        {t('loading_more', undefined, NS)}
                      </Text>
                    </YStack>
                  ) : null
                }
              />
            )
          })()}
        </View>
      )}
    </YStack>
  )
}

/**
 * ONE drive row.
 *
 * ⚠⛔⛔ **SUPERSEDED AT STORY 11b.17 (AC8) — ⭐ NAMED, ⛔ NOT OVERWRITTEN**
 * ([[feedback_supersede_never_reinterpret]]). ⛔ **WHAT IT SAID, kept verbatim as the record:**
 * *"**THE WHOLE ROW IS ⛔ NOT PRESSABLE, AND THAT IS DELIBERATE.** Story **F** (`11b-17`) owns the
 * member's per-drive DETAIL view; ⛔ this story ships ⛔ no navigation into one. A row that LOOKED
 * tappable and did nothing would be the *'a role implying interaction has a real handler'* failure
 * AC5 forbids ⇒ ⭐ the row declares `accessibilityRole="text"`, ⛔ never `button`/`link`."*
 *
 * ⭐⭐ **THE GROUND IS GONE, ⛔ NOT THE RULE.** Story E's AC5 declared the row `text` because there was
 * **nowhere to go** — the detail view did ⛔ not exist. ⭐ Story `11b-17` **built it**
 * (`/(sahyog)/[driveToken]`), and its **AC8** carries the routed obligation from E's own THIRD
 * code-review pass (2026-09-09, BigDev, `11b-15:860-861`): *"⭐ **THIS** story owns the per-drive
 * view, so the affordance belongs here — and it must be a REAL focusable control with a real handler
 * and an accessible name."*
 * ⇒ ⭐⭐ **THE RULE E WAS ENFORCING IS NOW SATISFIED THE OTHER WAY:** the row carries
 * `accessibilityRole="button"` **AND** a real `onPress` that navigates. ⚠⛔ ⛔ The failure E named — *a
 * role implying interaction with ⛔ no handler* — is still forbidden, and it is what a reviewer must
 * check: ⛔ **never** re-declare `button`/`link` without a working handler, and ⛔ never strip the
 * handler while leaving the role.
 *
 * ⚠⛔ **`button`, ⛔ NOT `link`** — ⭐ deliberately the opposite of `SahyogVivranEntry` and of the
 * detail screen's own public-page CTA, which are `link` because they **LEAVE THE APP** for the public
 * site. ⛔ This row navigates **IN-APP**, to a session-guarded screen.
 */
function DriveRow({
  entry,
  t,
  locale,
  onOpen,
}: {
  entry: MemberDriveListEntry
  t: ReturnType<typeof useT>
  locale: 'en' | 'hi'
  onOpen: (publicToken: string) => void
}) {
  const isLive = entry.status === 'live'

  // ⭐ OPERATIONAL FIGURES — LATIN numerals in BOTH locales (amendment-A2 / UX-DR73). `formatCount`
  // and the two `formatSahyog*Amount` helpers carry that discipline; ⛔ never `toHindiNumeral`.
  // ⚠⛔ `formatCount` takes ⛔ NO locale, deliberately — a count renders LATIN in both locales, so a
  // `locale` argument would imply a per-locale difference that does ⛔ not exist. ⛔ Do ⛔ not "fix"
  // this by passing one for symmetry with `formatSahyogContributedAmount`, which needs it only for
  // the WORD (lakh / लाख).
  const confirmedCount = formatCount(entry.confirmedContributionCount)
  // ⛔⛔ THE RULED FORM, FROM THE ⛔ ONE SHARED PRODUCER — exact below ₹10 lakh, cut off at and above
  // it, and the short form ⛔ ONLY on a Live row. ⛔ Do ⛔ not re-derive it here: it was relocated
  // into `@twt/i18n` by this story precisely so this surface and the public index cannot disagree.
  const amount = formatSahyogContributedAmount(entry.amountRaisedInr, locale, isLive)
  const stageWord = t(STAGE_KEY[entry.status], undefined, SHARED_NS)

  // ── ⭐⭐ EVERY VISIBLE LINE IS COMPUTED AS A STRING FIRST, AND THE ACCESSIBLE NAME IS BUILT FROM
  //    THE SAME STRINGS ───────────────────────────────────────────────────────────────────────────
  // [Review][Patch] — code review of 11b-15-member-drive-list-fourth-tab (2026-09-09), THIRD pass,
  // family 13(d). ⚠⛔ **THE ROW ANNOUNCED FOUR FACTS AND RENDERED TEN.** The container below is an
  // accessibility element with an explicit label, which by construction REPLACES its children's
  // announcements — so लक्ष्य (AC8b), the percentage, the outcome framing, the close date, the
  // district and the nominee were all rendered visually and ⛔ NEVER announced. ⭐ It was the INVERSE
  // of the defect the FIRST review pass fixed: that pass added three AC3 floor fields to the VISUAL
  // render and ⛔ never extended `row.a11y` to match, so the screen-reader member LOST ground in the
  // very patch that gained it for everyone else — and this file's own `$comment.row_a11y` ("*states
  // the SAME facts the row renders visually*") became false in that same commit.
  // ⇒ ⭐⭐ **THE PARITY IS NOW STRUCTURAL, ⛔ NOT A PROMISE:** each line is computed ONCE, rendered,
  // and joined into the label. ⛔ A future field cannot be rendered without being announced unless a
  // later author deliberately breaks this shape. ⛔ Do ⛔ not go back to interpolating a fixed
  // sentence.

  // ⭐⭐ THE ZERO-DAY LINE — [Review][Decision→Patch], THIRD pass, ruled by BigDev.
  // ⚠⛔ A `live` drive with ZERO confirmed contributions used to render `row.summary` unconditionally
  // ⇒ **"₹ 0 contributed · 0 confirmed"**, on DAY ONE of every drive. ⛔ The public index does ⛔ not:
  // it renders `zero_line.*` INSTEAD of its live line (`apps/public/src/pages/sahyog.astro:167-170`),
  // because **the Panel GAVE that wording, in BOTH languages, when a code review showed them what a
  // drive renders on its first day** (`2026-09-07-206` cl.4). ⇒ `member ≥ public` (AC3) read as
  // violated by the member getting the very string the Panel replaced.
  // ⭐ The keys already existed in both locales and this surface already imports `sahyog-shared`;
  // ⛔ nothing is minted here — AC4's ONE shared source, consumed by name.
  // ⚠⛔ THE VARIANT CHOICE IS THE SAFETY PROPERTY, ⛔ not a nicety: `deceasedMemberName` is nullable
  // and `t()` THROWS on an unsupplied token, so `.full` on a nameless drive would 500 the WHOLE list.
  const isZeroDayLive = isLive && entry.confirmedContributionCount === 0
  const summaryLine = isZeroDayLive
    ? entry.deceasedMemberName === null
      ? t('zero_line.no_family', undefined, SHARED_NS)
      : t('zero_line.full', { family_name: entry.deceasedMemberName }, SHARED_NS)
    : t('row.summary', { amount, count: confirmedCount }, NS)

  // ⭐⭐ लक्ष्य — present where, and ⛔ ONLY where, the Pariwar has revealed it TO MEMBERS
  // (`#decision-2026-09-09-211` cl.2). ⚠ The key is ABSENT rather than null when withheld, so
  // `=== undefined` is the correct test. ⛔ Fail-closed ⇒ ⛔ nothing at launch, for any Pariwar.
  // ⚠⛔ ITS NUMBER FORM IS ⛔ NOT THE AMOUNT'S — the target is exact only below ₹1 lakh, the
  // contributed amount below ₹10 lakh. ⛔ TWO RULES ON ONE ROW, deliberately (`-206` cl.3).
  const targetLine =
    entry.driveTargetInr === undefined
      ? null
      : t(
          'drive_target',
          { amount: formatSahyogTargetAmount(entry.driveTargetInr, locale) },
          SHARED_NS,
        )

  // AC3's floor: the public index shows a LIVE row's confirmed percentage. ⭐ `null` off-Live BY
  // CONTRACT (`2026-09-08-207` cl.1), so the null check alone is an equivalent guard to `isLive`.
  // ⚠⛔ ⛔ NOT suppressed on a zero-day row: the public meter and its printed figure render at 0 too
  // (`sahyog.astro:703-737` gates on `typeof fill === 'number'`, ⛔ not on a non-zero count), so
  // hiding it here would put the member BELOW the public and break AC3 in the other direction.
  const progressLine =
    entry.confirmedPercentage === null
      ? null
      : t('row.progress', { percent: String(entry.confirmedPercentage) }, NS)

  // AC3's floor: the public index's `close_of_cycle_framing`, composed from the SAME Trustee-ratified
  // text. ⚠⛔ GATED ON `!isLive`, ⛔ NOT on `fundingOutcome === null` alone — the domain computes the
  // outcome without a live gate, and "the cycle closed" on a still-collecting drive would be false.
  const outcomeLine =
    entry.fundingOutcome === null || isLive
      ? null
      : t(outcomeFramingKey(entry.fundingOutcome), undefined, NS)

  // AC3's floor: the drive's close/settle date, IST-formatted the way the public index does.
  // ⚠ `formatClosedAtIst` returns `null` for an unparseable instant (SECOND pass) — checked HERE too,
  // ⛔ not only inside the formatter, so a malformed date renders NOTHING rather than the literal
  // word "null" interpolated into `row.closed_on`.
  const closedIst = entry.closedAt === null ? null : formatClosedAtIst(entry.closedAt)
  const closedLine = closedIst === null ? null : t('row.closed_on', { date: closedIst }, NS)

  // ⭐ An honest absence, ⛔ never a blank cell.
  // [Review][Patch] — THIRD pass: the separator, the colon AND the label/value word order used to be
  // composed directly in this JSX — ⛔ the exact defect `row.summary` was minted to fix a few lines
  // above, shipped in the SAME commit. ⇒ composed through the i18n layer, so a locale can render the
  // JOIN and not merely the two operands.
  // ⚠⛔⛔ **ITS LAST SENTENCE IS SUPERSEDED AT STORY 11b.17 — ⭐ NAMED, ⛔ NOT DELETED**
  // ([[feedback_supersede_never_reinterpret]]). ⛔ **WHAT IT SAID:** *"`nominee.label` stays a TOKEN so
  // the label keeps ONE definition and story F (`11b-17`) reuses it rather than re-minting it."*
  // ⛔⛔ **STORY F DOES ⛔ NOT REUSE IT, AND ⛔ MUST NOT.** `nominee.label` resolves to **`"Nominee"`**
  // (hi: `"नॉमिनी"`) — ⛔ **not** the Trustee-ratified *"Nominee Name"* (`2026-09-04-190` **cl.2**) —
  // so following this instruction would have shipped a label that FAILS `11b-17` AC4's own first
  // sentence. ⭐ The token that DOES render the ruled string is **`sahyog-vivran`'s
  // `label.account_holder`** (whose KEY name says `account_holder` and whose VALUE is *"Nominee
  // Name"* — ⛔ do ⛔ not "fix" the key).
  // ⭐ **WHAT SURVIVES, AND IT IS THE POINT THE SENTENCE WAS MAKING:** the label keeps **ONE**
  // definition and is composed through the i18n layer. ⚠ This row's own label is a **ROW-LOCAL**
  // string for a one-line list cell, and it is ⛔ not the ruled per-field label — ⛔ two keys,
  // ⛔ deliberately, and ⛔ not a double-mint.
  const districtText = entry.district ?? t('district.absent', undefined, NS)
  const districtLine =
    entry.nomineeName === null
      ? districtText
      : t(
          'row.district_nominee',
          {
            district: districtText,
            nominee_label: t('nominee.label', undefined, NS),
            nominee: entry.nomineeName,
          },
          NS,
        )

  // ⭐⭐ THE ROW'S ACCESSIBLE NAME — the VARIANT is what stops a crash, ⛔ not a nicety.
  // `deceasedMemberName` is nullable on the wire and `t()` THROWS on an unsupplied token ⇒ resolving
  // `row.a11y` on such a row would take down the WHOLE list, ⛔ not one row. ⭐ Same structural reason
  // `sahyog-shared` ships `zero_line.no_family`.
  // [Review][Patch] — SECOND pass: `{code}` ADDED to the no-family variant so a screen-reader user
  // can tell two nameless rows apart, matching the visible fallback which already could.
  // [Review][Patch] — FOURTH pass: `isZeroDayLive` gates a THIRD/FOURTH variant carrying NO
  // `count`/`amount` tokens. Before this, `headA11y` announced the raw pre-ratified
  // "0 contributions confirmed. ₹0 contributed so far." UNCONDITIONALLY, even on a zero-day row whose
  // VISIBLE summary the Panel replaced with softer copy (`zero_line.*`, below) — a screen-reader
  // member heard the exact figures `2026-09-07-206` cl.4 exists to hide, which `$comment.row_a11y`'s
  // own "SAME facts, ⛔ never extra information" invariant forbids. The zero-day variant states only
  // name/code + stage; `rowA11y` below already appends the softened `summaryLine` right after it.
  const headA11y = isZeroDayLive
    ? entry.deceasedMemberName === null
      ? t('row.a11y.zero_no_family', { code: entry.poolLetterCode, stage: stageWord }, NS)
      : t('row.a11y.zero', { family: entry.deceasedMemberName, stage: stageWord }, NS)
    : entry.deceasedMemberName === null
      ? t(
          'row.a11y.no_family',
          { code: entry.poolLetterCode, stage: stageWord, count: confirmedCount, amount },
          NS,
        )
      : t(
          'row.a11y',
          { family: entry.deceasedMemberName, stage: stageWord, count: confirmedCount, amount },
          NS,
        )

  // ⚠ `summaryLine` joins the announcement ⛔ ONLY on a zero-day row: off that path its two facts
  // (count, amount) are ALREADY in `headA11y`, and repeating them would make the row announce itself
  // twice. On a zero-day row `headA11y` carries neither (see above), so the Panel's sentence is
  // genuinely absent from the head and must be added.
  const rowA11y = [
    headA11y,
    isZeroDayLive ? summaryLine : null,
    targetLine,
    progressLine,
    outcomeLine,
    closedLine,
    districtLine,
  ]
    .filter((line): line is string => line !== null)
    .join(' ')

  return (
    <YStack
      px="$5"
      py="$4"
      gap="$1"
      borderBottomWidth={1}
      borderColor="$borderColor"
      // ⭐⭐ EXPLICIT `accessible` — it GROUPS the child text into ONE announcement under the label
      // below. ⛔ Without it a screen reader walks the fragments separately and the row's meaning is
      // lost (the `PoolContributorList.tsx:246` / `panchayat/PinnedItem.tsx:107` precedent).
      // ⚠⛔ AND BECAUSE IT GROUPS, THE LABEL IS THE ⛔ ONLY THING ANNOUNCED — which is why `rowA11y`
      // is BUILT FROM the same strings rendered below rather than written as a fixed sentence.
      accessible
      // ⭐⭐ STORY 11b.17 (AC8) — `button` + a REAL handler. ⚠⛔ The two travel TOGETHER: E declared
      // `text` because the detail view did ⛔ not exist, and *"a role implying interaction has a real
      // handler"* is the rule BOTH stories enforce. ⛔ Never one without the other.
      // ⭐ THE ROW GROUPS ITS OWN LEAVES AND WRAPS ⛔ NO NESTED CONTROL, so `accessible` here does
      // ⛔ not collapse anything reachable — the 13(a) hazard (`:233-240`) is about a container
      // wrapping a Button, which this is not.
      accessibilityRole="button"
      accessibilityLabel={rowA11y}
      accessibilityHint={t('row.open_hint', undefined, NS)}
      // ⭐ The address is the SERVER-RETURNED opaque token and ⛔ nothing derived from
      // `poolCanonicalIdentifier` — that counter is monotonic per (pariwar, month), and rebuilding an
      // address from it would re-create inside the client the guessability 11b.10 D2 removed.
      onPress={() => onOpen(entry.publicToken)}
    >
      <XStack gap="$2" items="center">
        <Text fontFamily="$body" fontSize="$5" color="$color">
          {/* ⭐ `deceasedMemberName` is `null` when unresolvable — the row still carries the DRIVE.
              ⛔ NULL OMITS THE NAME, ⛔ NEVER THE ROW: the public index keeps a nameless row, so
              dropping one here would show a member LESS than a stranger (`-189` cl.3). */}
          {entry.deceasedMemberName ?? entry.poolLetterCode}
        </Text>
        <Text fontFamily="$body" fontSize="$2" color="$colorPress">
          {stageWord}
        </Text>
      </XStack>

      <Text fontFamily="$body" fontSize="$3" color="$colorPress">
        {summaryLine}
      </Text>

      {targetLine === null ? null : (
        <Text fontFamily="$body" fontSize="$3" color="$colorPress">
          {targetLine}
        </Text>
      )}

      {progressLine === null ? null : (
        <Text fontFamily="$body" fontSize="$2" color="$colorPress">
          {progressLine}
        </Text>
      )}

      {outcomeLine === null ? null : (
        <Text fontFamily="$body" fontSize="$2" color="$colorPress">
          {outcomeLine}
        </Text>
      )}

      {closedLine === null ? null : (
        <Text fontFamily="$body" fontSize="$2" color="$colorPress">
          {closedLine}
        </Text>
      )}

      <Text fontFamily="$body" fontSize="$2" color="$colorPress">
        {districtLine}
      </Text>
    </YStack>
  )
}
