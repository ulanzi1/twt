// <PoolContributorList> — the Live Contributor List view (Story 8.3; the sibling of 8.2's
// <ActiveContributionCard>, extended from the aggregate progress meter to the NAMED confirmed rows).
// The member-facing live-pool view the My Pool card links to (D8 — NOT rendered inside the card). For an
// `active` member assigned to a pool whose cycle alert is `live` it renders the pool identity + the
// virtualized list of RECONCILIATION-CONFIRMED contributors (first-name + last-initial) + an AGGREGATE
// pending strip (count + percentage, NO member identity). For every other case it renders a calm,
// non-alarming placeholder (never an error wall).
//
// ── Confirmed-only + honestly empty today (AC1/AC4/D1/D2) ───────────────────────────────────────────────
// The confirmed rows source EXCLUSIVELY from `contribution.confirmed` (server-side; the client resolves
// nothing about confirmation status). Epic 9's producer is unbuilt, so the list is `[]` right now and the
// empty state renders honestly — the copy REPORTS STATE ("No confirmed contributions yet."), it never
// attributes responsibility ("Nobody has contributed."). Same neutral register for the pending strip.
//
// ── Virtualization (AC3 / UX-DR80 / D7) ─────────────────────────────────────────────────────────────────
// The confirmed rows are virtualized with `@shopify/flash-list` (the ratified P0-5 choice; the same pattern
// as ShradhanjaliSahyogVivran including the `FlashList as any` React-19 + new-arch prop-typing cast). NO
// full-set render into the native view (the architecture-committed property) — the Sahyog contributor scroll
// reaches ~16k, so FlashList is mandatory at that scale even though the confirmed set is small early in a cycle.
//
// ── Numeral discipline (amendment-A2 / D6) + a11y (AC6) ─────────────────────────────────────────────────
// The pending count/percentage are OPERATIONAL figures → LATIN numerals even in Hindi (never toHindiNumeral;
// the microcopy UX-DR73 gate enforces it). Every row is semantically labeled; the pending strip is the
// surface's SINGLE ambient status, announced `accessibilityLiveRegion="polite"` (never assertive).

import { useT } from '@twt/i18n/react'
import { FlashList } from '@shopify/flash-list'
import { StyleSheet } from 'react-native'
import { Paragraph, Text, View, YStack } from 'tamagui'

import { usePoolContributorsQuery } from './usePoolContributorsQuery'

/** The contribution i18n namespace (shared with 8.2's card copy). */
const NS = { namespace: 'contribution' } as const

/** Estimated row height for FlashList virtualization (mirrors the Shradhanjali contributor scroll). */
const CONTRIBUTOR_ROW_ESTIMATED_HEIGHT = 56

/** A single confirmed-contributor display row — first-name + last-initial (PII-shielded). */
interface ConfirmedRow {
  readonly firstName: string
  readonly lastInitial: string
}

/** Compose the display label for a confirmed contributor (first name + optional last initial). */
function contributorLabel(row: ConfirmedRow): string {
  return row.lastInitial ? `${row.firstName} ${row.lastInitial}` : row.firstName
}

export function PoolContributorList() {
  const t = useT()
  const { data, isLoading } = usePoolContributorsQuery()

  // Loading is distinct from true absence (Review fix) — showing the "no live pool" copy while the first
  // fetch is still in flight would assert a false claim (this screen is only reached once the member is
  // already known to be assigned). A neutral loading placeholder, never the absence copy, during the fetch.
  if (isLoading) {
    return (
      <YStack flex={1} bg="$background" px="$5" py="$6" gap="$2" accessibilityRole="summary">
        <Text fontFamily="$body" fontSize="$4" color="$colorPress" accessibilityRole="text">
          {t('loading', undefined, { namespace: 'common' })}
        </Text>
      </YStack>
    )
  }

  // Self-suppress / fail-soft (AC1) — a calm placeholder for true absence or error. Never an error wall.
  if (!data || !data.assigned) {
    return (
      <YStack flex={1} bg="$background" px="$5" py="$6" gap="$2" accessibilityRole="summary">
        <Text fontFamily="$body" fontSize="$4" color="$colorPress" accessibilityRole="text">
          {t('contributor_list.no_pool', undefined, NS)}
        </Text>
      </YStack>
    )
  }

  const poolTitle = data.pool.name ?? `Pool ${data.pool.letterCode}`
  const confirmedRows = data.confirmed
  // Operational figures — Latin numerals even in Hindi (amendment-A2 / D6). `String(...)` keeps them Latin.
  const pendingCount = String(data.pending.count)
  const pendingPercentage = String(data.pending.percentage)

  const renderItem = ({ item }: { item: ConfirmedRow }) => {
    const label = contributorLabel(item)
    return (
      <View
        px="$5"
        py="$3"
        borderBottomWidth={StyleSheet.hairlineWidth}
        borderBottomColor="$borderColor"
        bg="$background"
        accessible
        accessibilityRole="text"
        accessibilityLabel={t('contributor_list.row_a11y', { name: label }, NS)}
      >
        <Text fontFamily="$body" fontSize="$4" color="$color">
          {label}
        </Text>
      </View>
    )
  }

  return (
    <YStack flex={1} bg="$background" accessibilityRole="summary">
      {/* Passbook register header — hairline rule below, no fintech chrome. */}
      <YStack px="$5" pt="$5" pb="$3" gap="$1" borderBottomWidth={1} borderColor="$borderColor">
        <Text fontFamily="$body" fontSize="$2" color="$colorPress" accessibilityRole="text">
          {t('contributor_list.title', undefined, NS)}
        </Text>
        <Text fontFamily="$body" fontSize="$7" color="$color" accessibilityRole="header">
          {poolTitle}
        </Text>
        <Text fontFamily="$body" fontSize="$3" color="$colorPress" accessibilityRole="text">
          {t('contributor_list.confirmed_header', undefined, NS)}
        </Text>
      </YStack>

      {/* Confirmed rows — virtualized (AC3). Empty state (0 confirmed today) renders a calm, state-reporting
          placeholder (NOT an error; a low/empty list is not a failure — the 8.2 "low meter is not danger"). */}
      {confirmedRows.length === 0 ? (
        <YStack px="$5" py="$6" accessibilityRole="text">
          <Text fontFamily="$body" fontSize="$4" color="$colorPress">
            {t('contributor_list.empty', undefined, NS)}
          </Text>
        </YStack>
      ) : (
        <View flex={1}>
          {(() => {
            // FlashList v2 prop-typing wrinkle under React 19 + new arch — cast as any (the ratified
            // ShradhanjaliSahyogVivran pattern). Runtime behavior unchanged.
            const FlashListAny = FlashList as any
            return (
              <FlashListAny
                data={confirmedRows}
                renderItem={renderItem}
                keyExtractor={(item: ConfirmedRow, index: number) =>
                  `${item.firstName}-${item.lastInitial}-${index}`
                }
                estimatedItemSize={CONTRIBUTOR_ROW_ESTIMATED_HEIGHT}
              />
            )
          })()}
        </View>
      )}

      {/* Pending strip — AGGREGATE count + percentage ONLY (D3), NO per-member identity. The surface's
          single ambient status, announced polite (never assertive). Neutral/aggregate — no shame framing. */}
      <YStack px="$5" py="$4" borderTopWidth={1} borderColor="$borderColor">
        <Paragraph
          fontFamily="$body"
          fontSize="$3"
          color="$colorPress"
          accessibilityRole="text"
          accessibilityLiveRegion="polite"
          accessibilityLabel={t(
            'contributor_list.pending_strip_a11y',
            { count: pendingCount, percentage: pendingPercentage },
            NS,
          )}
        >
          {t('contributor_list.pending_strip', { count: pendingCount, percentage: pendingPercentage }, NS)}
        </Paragraph>
      </YStack>
    </YStack>
  )
}
