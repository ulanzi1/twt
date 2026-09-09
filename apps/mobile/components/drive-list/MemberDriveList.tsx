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
import { useCallback, useState } from 'react'
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
  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useMemberDriveListQuery()
  const [explainerOpen, setExplainerOpen] = useState(false)

  // [Review][Patch] — code review of 11b-15-member-drive-list-fourth-tab (2026-09-09): deps were
  // `[t, locale]`, but `t` is a FRESH closure every render ([[project_uset_fresh_closure_memo_trap]],
  // named two lines up in THIS file) — including it made the memoization pure overhead, since the
  // callback was recreated on every render regardless. `renderItem` still CLOSES OVER `t`; between
  // locale-stable renders that stale-captured `t` behaves identically to a fresh one (its output is
  // determined by `locale`, which IS the dep), and a locale change recreates `renderItem` (and so
  // captures a fresh `t`) exactly when it needs to.
  const renderItem = useCallback(
    ({ item }: { item: MemberDriveListEntry }) => (
      <DriveRow entry={item} t={t} locale={locale} />
    ),
    [locale],
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
          accessible
          accessibilityRole="text"
          accessibilityLiveRegion="polite"
        >
          <Text fontFamily="$body" fontSize="$3" color="$colorPress">
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
        <YStack px="$5" py="$6" accessible accessibilityRole="text">
          <Text fontFamily="$body" fontSize="$4" color="$colorPress">
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
                onEndReached={() => {
                  if (hasNextPage && !isFetchingNextPage) void fetchNextPage()
                }}
                onEndReachedThreshold={0.5}
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
 * ⚠⛔ **THE WHOLE ROW IS ⛔ NOT PRESSABLE, AND THAT IS DELIBERATE.** Story **F** (`11b-17`) owns the
 * member's per-drive DETAIL view; ⛔ this story ships ⛔ no navigation into one. A row that LOOKED
 * tappable and did nothing would be the *"a role implying interaction has a real handler"* failure
 * AC5 forbids ⇒ ⭐ the row declares `accessibilityRole="text"`, ⛔ never `button`/`link`.
 */
function DriveRow({
  entry,
  t,
  locale,
}: {
  entry: MemberDriveListEntry
  t: ReturnType<typeof useT>
  locale: 'en' | 'hi'
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

  // ⭐⭐ THE ROW'S ACCESSIBLE NAME — and the VARIANT is what stops a crash, ⛔ not a nicety.
  // `deceasedMemberName` is nullable on the wire (an unresolvable family name) and `t()` THROWS on
  // an unsupplied token ⇒ resolving `row.a11y` on such a row would take down the WHOLE list, ⛔ not
  // one row. ⭐ Same structural reason `sahyog-shared` ships `zero_line.no_family`.
  // [Review][Patch] — code review of 11b-15-member-drive-list-fourth-tab (2026-09-09): `{code}`
  // ADDED to the no-family variant. The visible fallback below already distinguishes two nameless
  // rows by `poolLetterCode`; the accessible name did not, so a screen-reader user could not tell
  // two nameless rows apart even though a sighted member could.
  const rowA11y =
    entry.deceasedMemberName === null
      ? t('row.a11y.no_family', { code: entry.poolLetterCode, stage: stageWord, count: confirmedCount, amount }, NS)
      : t(
          'row.a11y',
          {
            family: entry.deceasedMemberName,
            stage: stageWord,
            count: confirmedCount,
            amount,
          },
          NS,
        )

  return (
    <YStack
      px="$5"
      py="$4"
      gap="$1"
      borderBottomWidth={1}
      borderColor="$borderColor"
      // ⭐⭐ EXPLICIT `accessible` — it GROUPS the child text into ONE announcement under the label
      // below. ⛔ Without it a screen reader walks six separate fragments and the row's meaning is
      // lost (the `PoolContributorList.tsx:246` / `panchayat/PinnedItem.tsx:107` precedent).
      accessible
      accessibilityRole="text"
      accessibilityLabel={rowA11y}
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
        {/* [Review][Patch] — code review of 11b-15-member-drive-list-fourth-tab (2026-09-09): the
            `·` separator used to be written directly in this JSX between two separate `t()` calls —
            moved into the composed `row.summary` string so a locale can render the join, not just
            the two operands. */}
        {t('row.summary', { amount, count: confirmedCount }, NS)}
      </Text>

      {/* ⭐⭐ लक्ष्य — rendered where, and ⛔ ONLY where, the Pariwar has revealed it TO MEMBERS
          (`#decision-2026-09-09-211` cl.2). ⚠ The key is ABSENT rather than null when withheld, so
          `=== undefined` is the correct test. ⛔ Fail-closed ⇒ ⛔ nothing renders at launch, for any
          Pariwar, and ⭐ that is correct rather than a gap.
          ⚠⛔ ITS NUMBER FORM IS ⛔ NOT THE AMOUNT'S — the target is exact only below ₹1 lakh, the
          contributed amount below ₹10 lakh. ⛔ TWO RULES ON ONE ROW, deliberately (`-206` cl.3). */}
      {entry.driveTargetInr === undefined ? null : (
        <Text fontFamily="$body" fontSize="$3" color="$colorPress">
          {t('drive_target', { amount: formatSahyogTargetAmount(entry.driveTargetInr, locale) }, SHARED_NS)}
        </Text>
      )}

      {/* [Review][Patch] — code review of 11b-15-member-drive-list-fourth-tab (2026-09-09), AC3's
          floor: the public index shows a LIVE row's confirmed percentage (the meter's printed
          figure); `confirmedPercentage` was on this row all along but was never rendered. ⭐ `null`
          off-Live BY CONTRACT (mirroring the public wire, `2026-09-08-207` cl.1) — the null check
          alone is therefore an equivalent guard to a `status === 'live'` one, and needs no second
          condition. */}
      {entry.confirmedPercentage === null ? null : (
        <Text fontFamily="$body" fontSize="$2" color="$colorPress">
          {t('row.progress', { percent: String(entry.confirmedPercentage) }, NS)}
        </Text>
      )}

      {/* [Review][Patch] — AC3's floor: the public index's `close_of_cycle_framing` composes this
          SAME Trustee-ratified text from the `fundingOutcome` enum; the member row carries the enum
          but never rendered it. ⚠⛔ GATED ON `status !== 'live'`, ⛔ NOT on `fundingOutcome === null`
          alone — the domain computes `fundingOutcome` without a live gate (it can already hold a
          value mid-cycle), and a "the cycle closed" sentence on a still-collecting drive would be
          false. */}
      {entry.fundingOutcome === null || isLive ? null : (
        <Text fontFamily="$body" fontSize="$2" color="$colorPress">
          {t(outcomeFramingKey(entry.fundingOutcome), undefined, NS)}
        </Text>
      )}

      {/* [Review][Patch] — AC3's floor: the public index shows the drive's close/settle date; the
          member row carries `closedAt` (non-null exactly when a close/settle event exists — the
          same condition a `live` row fails by construction) but never rendered it. ⭐ IST-formatted
          the same way the public index does (`apps/public/src/lib/sahyog-render.ts`'s
          `formatClosedAt`) — DUPLICATED rather than lifted into `@twt/i18n`: unlike the two Sahyog
          money forms this story relocated there, this is a plain mechanical date format with no
          Trustee ruling behind it, so a second small copy is not the fork that a second copy of a
          RULED number form would be. */}
      {(() => {
        // [Review][Patch] — code review of 11b-15-member-drive-list-fourth-tab (2026-09-09), SECOND
        // pass: `formatClosedAtIst` now returns `null` for an unparseable instant — checked here too,
        // ⛔ not only inside the formatter, so a malformed date renders NOTHING rather than the
        // literal word "null" interpolated into `row.closed_on`.
        if (entry.closedAt === null) return null
        const formatted = formatClosedAtIst(entry.closedAt)
        if (formatted === null) return null
        return (
          <Text fontFamily="$body" fontSize="$2" color="$colorPress">
            {t('row.closed_on', { date: formatted }, NS)}
          </Text>
        )
      })()}

      <Text fontFamily="$body" fontSize="$2" color="$colorPress">
        {/* ⭐ An honest absence, ⛔ never a blank cell. */}
        {entry.district ?? t('district.absent', undefined, NS)}
        {entry.nomineeName === null ? '' : ` · ${t('nominee.label', undefined, NS)}: ${entry.nomineeName}`}
      </Text>
    </YStack>
  )
}
