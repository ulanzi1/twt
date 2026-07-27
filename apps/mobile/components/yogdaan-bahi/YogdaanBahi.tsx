import { useCallback, useMemo, type ComponentType } from 'react'
import { FlatList, RefreshControl, StyleSheet } from 'react-native'
import { useT } from '@twt/i18n/react'
import { Button, Text, XStack, YStack } from 'tamagui'

import { CallHelplineCTA } from '../common/CallHelplineCTA'
import { YogdaanBahiRow } from './YogdaanBahiRow'
import { useYogdaanQuery } from './useYogdaanQuery'
import { formatInr, type YogdaanRow } from './sample-data'

// Yogdaan Bahi (contribution passbook) — Story 8.6 (Task 4). Productionized from the P0-5 prototype: the
// data source is the real member contribution-history read (useYogdaanQuery), and the row carries the
// five-state status + cycle + Contribution-Note seam. This surface OWNS its full-height scroll (it is the
// dedicated Yogdaan Bahi screen, NOT nested in the home YStack) so the FlatList is the scroll owner and
// virtualization stays active (AC4/D5 — a FlatList inside a parent ScrollView silently loses it).
//
// FlatList tuning (architecture §4.6): windowSize/maxToRenderPerBatch/initialNumToRender +
// removeClippedSubviews + getItemLayout on the fixed 56pt row — the 50–500-row 60fps/30fps contract
// (FlashList is Epic 11b's 10k Sahyog case, NOT this surface). Sticky running-tally footer (UX line 1156).

const COLUMN_HEADER_HEIGHT = 44
const ROW_HEIGHT = 56
const FOOTER_HEIGHT = 64

const NS = { namespace: 'contribution' } as const

function ColumnHeader() {
  const t = useT()
  return (
    <YStack
      height={COLUMN_HEADER_HEIGHT}
      justify="center"
      px={12}
      borderBottomWidth={1}
      borderBottomColor="$borderColor"
      bg="$background"
      accessible
      accessibilityRole="header"
      accessibilityLabel={t('yogdaan.columns_a11y', undefined, NS)}
    >
      {/* Line 1 — aligned to the row's primary line (date | family | amount). */}
      <XStack items="center">
        <Text width={92} fontFamily="$body" fontSize="$2" fontWeight="500" color="$colorPress">
          {t('yogdaan.col.date', undefined, NS)}
        </Text>
        <Text flex={1} fontFamily="$body" fontSize="$2" fontWeight="500" color="$colorPress" px={8}>
          {t('yogdaan.col.sahyog', undefined, NS)}
        </Text>
        <Text fontFamily="$body" fontSize="$2" fontWeight="500" color="$colorPress" text="right">
          {t('yogdaan.col.amount', undefined, NS)}
        </Text>
      </XStack>
      {/* Line 2 — aligned to the row's secondary line (status | pool·cycle). */}
      <XStack items="center" gap={6} mt={1}>
        <Text fontFamily="$body" fontSize="$1" color="$colorPress">
          {t('yogdaan.col.status', undefined, NS)}
        </Text>
        <Text fontFamily="$body" fontSize="$1" color="$colorPress">
          · {t('yogdaan.col.pool', undefined, NS)}
        </Text>
      </XStack>
    </YStack>
  )
}

function StickyFooter({ totalInr, rowCount }: { totalInr: number; rowCount: number }) {
  const t = useT()
  // This i18n system has no ICU plural support (flat `{param}` interpolation only), so a count-aware
  // key pair is selected client-side rather than relying on a single "{count} entries" string ("1
  // entries" is grammatically wrong).
  const pluralSuffix = rowCount === 1 ? 'one' : 'other'
  return (
    <XStack
      height={FOOTER_HEIGHT}
      items="center"
      px={12}
      borderTopWidth={1.5}
      borderTopColor="$borderColor"
      bg="$background"
      accessible
      accessibilityRole="summary"
      accessibilityLabel={t(`yogdaan.footer.a11y_${pluralSuffix}`, { total: formatInr(totalInr), count: rowCount }, NS)}
    >
      <YStack flex={1}>
        <Text fontFamily="$body" fontSize="$2" color="$colorPress">
          {t('yogdaan.footer.total', undefined, NS)}
        </Text>
        <Text fontFamily="$body" fontSize="$2" color="$colorPress">
          {t(`yogdaan.footer.entries_${pluralSuffix}`, { count: rowCount }, NS)}
        </Text>
      </YStack>
      <Text
        fontFamily="$tabular"
        fontSize="$6"
        fontWeight="500"
        color="$color"
        text="right"
        style={styles.tabularNums}
      >
        {formatInr(totalInr)}
      </Text>
    </XStack>
  )
}

export function YogdaanBahi() {
  const t = useT()
  const { data, isFetching, isLoading, isError, refetch } = useYogdaanQuery()

  const rows = data?.rows ?? []
  const totalInr = data?.totalInr ?? 0

  const renderItem = useCallback(
    ({ item, index }: { item: YogdaanRow; index: number }) => <YogdaanBahiRow row={item} rowIndex={index} />,
    [],
  )

  const keyExtractor = useCallback((item: YogdaanRow) => item.contributionId, [])

  const getItemLayout = useCallback(
    (_data: ArrayLike<YogdaanRow> | null | undefined, index: number) => ({
      length: ROW_HEIGHT,
      offset: ROW_HEIGHT * index,
      index,
    }),
    [],
  )

  const ListHeader = useMemo(() => <ColumnHeader />, [])

  // React 19 + RN 0.83 + new arch: FlatList prop typing wrinkle on ListHeaderComponent +
  // stickyHeaderIndices. Widen props to bypass scaffold-noise — runtime is documented FlatList behavior.
  const FlatListAny = FlatList as unknown as ComponentType<Record<string, unknown>>

  // Empty / loading / error render as their OWN branch, OUTSIDE the FlatList — so the list is mounted
  // ONLY when it has data. On the new architecture (Fabric) letting a single FlatList cross the
  // empty→populated transition (data []→N, stickyHeaderIndices []→[0], contentContainerStyle swap, all
  // while maintainVisibleContentPosition anchors) desynced the mounting layer and crashed the surface
  // ("addViewAt: failed to insert view … index=15 count=0" — 15 = initialNumToRender). Gating the mount
  // removes that transition entirely; the list always mounts fresh with rows and a STABLE stickyHeaderIndices.
  // The dignified empty passbook (a member who has attested nothing) is never "no dues"; a genuine load
  // failure (isError) gets its OWN retry branch, never the same "nothing yet" copy (AC1/AC6).
  if (rows.length === 0) {
    return (
      <YStack flex={1} bg="$background">
        <YStack flex={1} items="center" justify="center" px="$5" py="$8" gap="$3">
          <Text
            fontFamily="$body"
            fontSize="$4"
            color="$colorPress"
            text="center"
            accessibilityRole="text"
            accessibilityLabel={isError ? t('yogdaan.load_failed', undefined, NS) : t('yogdaan.empty_a11y', undefined, NS)}
          >
            {isLoading
              ? t('yogdaan.loading', undefined, NS)
              : isError
                ? t('yogdaan.load_failed', undefined, NS)
                : t('yogdaan.empty', undefined, NS)}
          </Text>
          {isError && (
            <Button size="$3" onPress={() => { void refetch() }} accessibilityRole="button">
              {t('yogdaan.retry', undefined, NS)}
            </Button>
          )}
        </YStack>
        <StickyFooter totalInr={0} rowCount={0} />
        {/* Cross-cutting helpline fallback (Story 8.11; UX-DR49 + AR-61), rendered OUTSIDE the list in
            this empty/loading/isError branch — never a FlatList item/header/footer, which would
            reintroduce the empty→populated Fabric remount crash ([[project_fabric_flatlist_empty_populated_crash]]).
            On the isError branch it sits BELOW the Retry button above (self-recovery first, UX-DR62);
            chromeless + ≥56pt keeps it the subordinate third tier, never a second competing primary. */}
        <CallHelplineCTA height={56} />
      </YStack>
    )
  }

  return (
    <YStack flex={1} bg="$background">
      <FlatListAny
        data={rows}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        ListHeaderComponent={ListHeader}
        // Stable now — the list is only mounted when populated (see the empty-branch note above), so this
        // never toggles []↔[0] under Fabric.
        stickyHeaderIndices={[0]}
        // Architecture §4.6 — tuned virtualization for entry-level Android (the 50–500-row contract).
        windowSize={10}
        maxToRenderPerBatch={10}
        initialNumToRender={15}
        removeClippedSubviews
        // Save-and-resume (UX-DR50): keep the visible row anchored across a Note round-trip / refetch.
        maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={() => { void refetch() }} />}
      />
      <StickyFooter totalInr={totalInr} rowCount={rows.length} />
      {/* Cross-cutting helpline fallback (Story 8.11; UX-DR49 + AR-61) — OUTSIDE the FlatList, in the
          populated-list branch. Same stable region as the empty branch above so the affordance is
          present in all three states (populated / empty-loading / isError). Chromeless + ≥56pt: the
          subordinate third tier of the recovery ladder (UX-DR62), never the surface's primary. */}
      <CallHelplineCTA height={56} />
    </YStack>
  )
}

const styles = StyleSheet.create({
  tabularNums: {
    fontVariant: ['tabular-nums'],
  },
})
