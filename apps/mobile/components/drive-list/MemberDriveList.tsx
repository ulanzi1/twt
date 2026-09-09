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

import { useMemberDriveListQuery } from './useMemberDriveListQuery'

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
  const { data, isLoading, isError, refetch } = useMemberDriveListQuery()
  const [explainerOpen, setExplainerOpen] = useState(false)

  const renderItem = useCallback(
    ({ item }: { item: MemberDriveListEntry }) => (
      <DriveRow entry={item} t={t} locale={locale} />
    ),
    [t, locale],
  )

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
  if (isError || !data) {
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
          onPress={() => {
            // ⚠ `refetch()` returns a promise that REJECTS on failure; a bare `void` would leave an
            // unhandled rejection on the member's screen. ⭐ The house shape is
            // `LockInClockWidget.tsx`'s: await inside try/catch and fail QUIETLY — the error state
            // is already on screen and there is nothing further to say.
            void (async () => {
              try {
                await refetch()
              } catch {
                // Already rendering the error state; ⛔ never a red box on a member's tab.
              }
            })()
          }}
        >
          <Text fontFamily="$body" fontSize="$4">
            {t('error.retry', undefined, NS)}
          </Text>
        </Button>
      </YStack>
    )
  }

  const drives = data.items

  return (
    <YStack flex={1} bg="$background">
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
  const rowA11y =
    entry.deceasedMemberName === null
      ? t('row.a11y.no_family', { stage: stageWord, count: confirmedCount, amount }, NS)
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
        {t('row.amount', { amount }, NS)} · {t('row.contributions', { count: confirmedCount }, NS)}
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

      <Text fontFamily="$body" fontSize="$2" color="$colorPress">
        {/* ⭐ An honest absence, ⛔ never a blank cell. */}
        {entry.district ?? t('district.absent', undefined, NS)}
        {entry.nomineeName === null ? '' : ` · ${t('nominee.label', undefined, NS)}: ${entry.nomineeName}`}
      </Text>
    </YStack>
  )
}
