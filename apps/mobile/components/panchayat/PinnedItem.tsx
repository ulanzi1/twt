import { Pressable, StyleSheet } from 'react-native'
import { Text, View, XStack, YStack } from 'tamagui'
import type { PinnedItem as PinnedItemData, PinnedItemCategory } from './sample-data'

// Pinned section row per UX spec line 491:
//   small left-stub colored by type (saffron/green/black per category);
//   tap → detail.
// 4pt colored left stub + hairline rule between rows. Saffron/green/black
// reference Indian noticeboard conventions (bereavement / governance /
// announcement).

type Props = {
  item: PinnedItemData
}

const STUB_COLOR: Record<PinnedItemCategory, string> = {
  saffron: '#FF7F1F',
  green: '#1F7F4F',
  black: '#1A1A1A',
}

const STUB_WIDTH = 4

export function PinnedItem({ item }: Props) {
  const a11yLabel = item.detailHint ? `${item.title}. ${item.detailHint}` : item.title
  return (
    <Pressable
      onPress={() => {
        // Production wires this to the corresponding detail screen
        // (memorial / niyamavali / chakra). Prototype is observation-only.
      }}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      accessibilityHint={`Tap to open ${item.category === 'black' ? 'memorial' : item.category === 'saffron' ? 'governance' : 'cycle'} detail`}
    >
      <XStack
        paddingVertical={10}
        paddingRight={16}
        borderBottomWidth={StyleSheet.hairlineWidth}
        borderBottomColor="$borderColor"
        backgroundColor="$background"
      >
        <View
          width={STUB_WIDTH}
          backgroundColor={STUB_COLOR[item.category]}
        />
        <YStack flex={1} paddingLeft={12} gap={2}>
          <Text fontFamily="$body" fontSize="$4" color="$color" numberOfLines={2}>
            {item.title}
          </Text>
          {item.detailHint && (
            <Text fontFamily="$body" fontSize="$2" color="$colorPress">
              {item.detailHint}
            </Text>
          )}
        </YStack>
      </XStack>
    </Pressable>
  )
}
