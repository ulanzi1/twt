import { useCallback, useMemo } from 'react'
import { FlatList, StyleSheet } from 'react-native'
import { Text, XStack, YStack } from 'tamagui'
import { YogdaanBahiRow } from './YogdaanBahiRow'
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
      alignItems="center"
      paddingHorizontal={12}
      borderBottomWidth={1}
      borderBottomColor="$borderColor"
      backgroundColor="$background"
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
        paddingHorizontal={8}
      >
        सहयोग
      </Text>
      <Text
        width={64}
        fontFamily="$body"
        fontSize="$2"
        fontWeight="500"
        color="$colorPress"
        textAlign="right"
      >
        पूल
      </Text>
      <Text
        width={96}
        fontFamily="$body"
        fontSize="$2"
        fontWeight="500"
        color="$colorPress"
        textAlign="right"
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
      alignItems="center"
      paddingHorizontal={12}
      borderTopWidth={1.5}
      borderTopColor="$borderColor"
      backgroundColor="$background"
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
        textAlign="right"
        style={styles.tabularNums}
      >
        {formatInr(totalInr)}
      </Text>
    </XStack>
  )
}

export function YogdaanBahi() {
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
    <YStack flex={1} backgroundColor="$background">
      <FlatListAny
        data={SAMPLE_YOGDAAN_ROWS}
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
      />
      <StickyFooter totalInr={SAMPLE_YOGDAAN_TOTAL_INR} rowCount={SAMPLE_YOGDAAN_ROWS.length} />
    </YStack>
  )
}

const styles = StyleSheet.create({
  tabularNums: {
    fontVariant: ['tabular-nums'],
  },
})
