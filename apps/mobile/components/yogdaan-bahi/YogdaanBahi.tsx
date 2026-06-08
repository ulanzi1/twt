import { useCallback, useMemo } from 'react'
import { FlatList, RefreshControl, StyleSheet } from 'react-native'
import { Text, XStack, YStack } from 'tamagui'
import { YogdaanBahiRow } from './YogdaanBahiRow'
import { useYogdaanQuery } from './useYogdaanQuery'
import {
  SAMPLE_YOGDAAN_ROWS,
  SAMPLE_YOGDAAN_TOTAL_INR,
  formatInr,
  type YogdaanRow,
} from './sample-data'

// Yogdaan Bahi (contribution book) — UX spec §8 Passbook pattern per
// UX spec lines 805 + 1156.
//
// Sticky footer with running tally per UX spec line 1156.
// FlatList with tuned windowSize + maxToRenderPerBatch per architecture
// §4.6 lines 2659-2676 (FlatList is sufficient at 60-row scale; FlashList
// threshold per architecture line 2913 is established by P0-5 measurement
// on a larger Shradhanjali contributor scroll).

const COLUMN_HEADER_HEIGHT = 40
const ROW_HEIGHT = 56
const FOOTER_HEIGHT = 64

function ColumnHeader() {
  return (
    <XStack
      height={COLUMN_HEADER_HEIGHT}
      items="center"
      px={12}
      borderBottomWidth={1}
      borderBottomColor="$borderColor"
      bg="$background"
      accessible
      accessibilityRole="header"
      accessibilityLabel="Yogdaan Bahi columns: दिनांक, सहयोग, पूल, राशि"
    >
      <Text
        width={100}
        fontFamily="$body"
        fontSize="$2"
        fontWeight="500"
        color="$colorPress"
      >
        दिनांक
      </Text>
      <Text
        flex={1}
        fontFamily="$body"
        fontSize="$2"
        fontWeight="500"
        color="$colorPress"
        px={8}
      >
        सहयोग
      </Text>
      <Text
        width={64}
        fontFamily="$body"
        fontSize="$2"
        fontWeight="500"
        color="$colorPress"
        text="right"
      >
        पूल
      </Text>
      <Text
        width={96}
        fontFamily="$body"
        fontSize="$2"
        fontWeight="500"
        color="$colorPress"
        text="right"
      >
        राशि
      </Text>
    </XStack>
  )
}

function StickyFooter({ totalInr, rowCount }: { totalInr: number; rowCount: number }) {
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
      accessibilityLabel={`कुल योगदान: ${formatInr(totalInr)} across ${rowCount} entries`}
    >
      <YStack flex={1}>
        <Text fontFamily="$body" fontSize="$2" color="$colorPress">
          कुल योगदान
        </Text>
        <Text fontFamily="$body" fontSize="$2" color="$colorPress">
          {rowCount} entries
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

function FreshnessStrip({ fetchedAt, isFetching }: { fetchedAt: number | undefined; isFetching: boolean }) {
  const label = fetchedAt
    ? `Cached at ${new Date(fetchedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
    : 'Loading…'
  return (
    <XStack
      px={12}
      py={6}
      bg="$backgroundHover"
      items="center"
      gap="$2"
    >
      <Text fontFamily="$body" fontSize="$1" color="$colorPress">
        P4 cache:
      </Text>
      <Text fontFamily="$tabular" fontSize="$1" color="$colorPress" style={{ fontVariant: ['tabular-nums'] }}>
        {label}
      </Text>
      {isFetching && (
        <Text fontFamily="$body" fontSize="$1" color="$colorPress">
          · refreshing
        </Text>
      )}
    </XStack>
  )
}

export function YogdaanBahi() {
  const { data, isFetching, refetch } = useYogdaanQuery()

  // Cache + sample-data fallback: if the query is still on its first fetch
  // (cold-start no-cache), render the sample data immediately so the UI
  // exercises the same shape. Once the query resolves, swap in the queried
  // data (identical for the prototype — same SAMPLE_YOGDAAN_ROWS).
  const rows = data?.rows ?? SAMPLE_YOGDAAN_ROWS
  const totalInr = data?.totalInr ?? SAMPLE_YOGDAAN_TOTAL_INR

  const renderItem = useCallback(
    ({ item, index }: { item: YogdaanRow; index: number }) => (
      <YogdaanBahiRow row={item} rowIndex={index} />
    ),
    [],
  )

  const keyExtractor = useCallback((item: YogdaanRow) => item.id, [])

  const getItemLayout = useCallback(
    (_data: ArrayLike<YogdaanRow> | null | undefined, index: number) => ({
      length: ROW_HEIGHT,
      offset: ROW_HEIGHT * index,
      index,
    }),
    [],
  )

  const ListHeader = useMemo(() => <ColumnHeader />, [])

  // React 19 + RN 0.83 + new arch: FlatList prop typing wrinkle on
  // ListHeaderComponent + stickyHeaderIndices. Cast props as any to bypass
  // scaffold-noise — runtime behavior is the documented FlatList behavior.
  const FlatListAny = FlatList as any

  return (
    <YStack flex={1} bg="$background">
      <FreshnessStrip fetchedAt={data?.fetchedAt} isFetching={isFetching} />
      <FlatListAny
        data={rows}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        ListHeaderComponent={ListHeader}
        stickyHeaderIndices={[0]}
        // Architecture §4.6 lines 2659-2676 — tuned virtualization for entry-level Android
        windowSize={10}
        maxToRenderPerBatch={10}
        initialNumToRender={15}
        removeClippedSubviews
        // Pull-to-refresh wired to refetch — P4 measurement validates this gesture
        refreshControl={
          <RefreshControl refreshing={isFetching} onRefresh={() => { void refetch() }} />
        }
      />
      <StickyFooter totalInr={totalInr} rowCount={rows.length} />
    </YStack>
  )
}

const styles = StyleSheet.create({
  tabularNums: {
    fontVariant: ['tabular-nums'],
  },
})
