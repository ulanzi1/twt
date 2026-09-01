// <PoolContributorList> — the Live Contributor List view (Story 8.3; the sibling of 8.2's
// <ActiveContributionCard>, extended from the aggregate progress meter to the NAMED confirmed rows).
// The member-facing live-pool view the My Pool card links to (D8 — NOT rendered inside the card). For an
// `active` member assigned to a pool whose cycle alert is `live` it renders the pool identity + the
// virtualized list of RECONCILIATION-CONFIRMED contributors (first-name + last-initial) + an AGGREGATE
// pending strip (count + percentage, NO member identity). For every other case it renders a calm,
// non-alarming placeholder (never an error wall).
//
// ── Confirmed-only, and honestly empty WHEN IT IS EMPTY (AC1/AC4/D1/D2) ─────────────────────────────────
// The confirmed rows source EXCLUSIVELY from `contribution.confirmed` (server-side; the client resolves
// nothing about confirmation status). That producer is LIVE — the Epic 9 matcher has populated it since
// Story 9.4/9.5, so this list is live, not structurally empty (AC10; the contract says the same at
// `pool-contributor-list.ts:7-8`). Never read population from a comment. The empty branch below is the
// honest render of a genuinely empty read: the copy REPORTS STATE, it never attributes responsibility
// ("Nobody has contributed."). Same neutral register for the pending strip.
//
// ⚠ An erased contributor is OMITTED ENTIRELY from `confirmed` — never an anonymized placeholder row
// (11b.2a's D5) — while still counting toward `pending`/`confirmedCount` (D3-aggregate). So `confirmed`
// and the aggregate figures LEGITIMATELY DIVERGE, by design: never assert equality between them.
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
import { deriveContributionRowViewModel } from '@twt/ui'
import type { ContributionRowViewModel } from '@twt/ui'
import type { ConfirmedContributorRow } from '@twt/contracts'
import { StyleSheet } from 'react-native'
import { Paragraph, Text, View, YStack } from 'tamagui'

import { toContributionRowInput } from './contribution-row-input'
import { usePoolContributorsQuery } from './usePoolContributorsQuery'

/** The contribution i18n namespace (shared with 8.2's card copy). */
const NS = { namespace: 'contribution' } as const

/** Estimated row height for FlashList virtualization (mirrors the Shradhanjali contributor scroll). */
const CONTRIBUTOR_ROW_ESTIMATED_HEIGHT = 56

// The row type is the CONTRACT's, imported type-only above — there is deliberately no local mirror of it
// here (D10(a) / Decision 2026-09-01-171 cl.1). `pool-contributor-list.ts:14` declares the discipline in
// terms ("NO type-shadowing"), and the shadow this file used to carry was not even a duplicate: the SDK
// already returns `ConfirmedContributorRow[]`, so it only re-annotated what TypeScript infers. A local
// mirror does not fail typecheck when the contract widens, which is exactly the Story 11b.1 defect class.
//
// ⚠ Its removal is why `renderItem`/`keyExtractor` parameters change SPELLING and lose a `readonly`
// modifier (`z.output` is not readonly). Both are type-level only — AC5's preservation is BEHAVIOURAL,
// not textual — and re-declaring a local type to "restore" `readonly` would reinstate the shadow.

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

  const renderItem = ({ item }: { item: ConfirmedContributorRow }) => {
    // THE ONLY GUARD BETWEEN A RULED THROW AND A RED-BOXED LIST (Trap 1 / 11b.2's D8(a)). The presenter
    // THROWS on an unresolvable name rather than rendering a blank where a name belongs — and this
    // consumer is a FlashList `renderItem`, called once per visible row on EVERY SCROLL FRAME, so an
    // unguarded throw takes the whole list down and hides every good row with the one bad one. The
    // Story 9.12 `<ActiveContributionCard>` shape (`:123-138`): degrade this ONE row, never the list.
    // There is no render arm for the throwing kind — this catch IS its handling.
    let vm: ContributionRowViewModel
    try {
      vm = deriveContributionRowViewModel(toContributionRowInput(item, data.pool.letterCode))
    } catch {
      return null
    }

    // The JOIN lives here, in the render layer, and nowhere upstream: the presenter emits name PARTS and
    // never composes them, because the contributor name FORM is UNRULED (D9(a) / D7-nameform(a), routed
    // to the Trustee Panel). This is the form Story 8.3 already ships — it settles nothing.
    const label = vm.displayName.lastInitial
      ? `${vm.displayName.firstName} ${vm.displayName.lastInitial}`
      : vm.displayName.firstName

    return (
      <View
        px="$5"
        py="$3"
        borderBottomWidth={StyleSheet.hairlineWidth}
        borderBottomColor="$borderColor"
        bg="$background"
        accessible
        accessibilityRole="text"
        // The KEY AND ITS NAMESPACE BOTH COME FROM THE PRESENTER'S REF, never guessed here — `t()`
        // defaults to `common` and THROWS on a miss, and the namespace is the THIRD argument (passing
        // it second lands it in the params slot and throws on every call). The `{name}` param is the
        // render layer's, deliberately: the presenter does not fill it. `row_a11y` is a SINGLE-brace
        // `{name}` token, so omitting the param throws at interpolation — the shape of the 11a.2 defect.
        accessibilityLabel={t(
          vm.rowA11y.ref.key,
          { name: label },
          { namespace: vm.rowA11y.ref.namespace },
        )}
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

      {/* Confirmed rows — virtualized (AC3). The empty branch renders a calm, state-reporting placeholder
          (NOT an error; a low/empty list is not a failure — the 8.2 "low meter is not danger"). It is a
          SIBLING of the list, never a ListEmptyComponent: New-Arch FlashList red-boxes crossing
          empty→populated IN PLACE, and the 60s poll makes that transition routine (Trap 2). */}
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
                // UNCHANGED BY RULING (AC3). The 8.3 code-review deferral on `index` STAYS OPEN: its
                // recorded blocker — the PII-shielded shape carries no stable per-member identifier —
                // is still true, because D5 vacated the `rowKey` that would have supplied one. Its
                // re-trigger is the Epic 11b PUBLIC render (Story 11b.3), not this member surface.
                keyExtractor={(item: ConfirmedContributorRow, index: number) =>
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
          // Family-13 check (a), made EXPLICIT rather than inherited (Story 11b.2b, AC7). RN treats a
          // `Text` as an accessibility element by default, so this strip's label was announced — but
          // relying on that default is exactly how check (a) has failed silently in this codebase
          // before (the 11a.6 `<PinnedItem>` note: dropping the `Pressable` dropped the mechanism that
          // was carrying the guarantee). The label is load-bearing here — it is the ONLY place the
          // aggregate is stated as a sentence — so the element declares itself.
          accessible
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
