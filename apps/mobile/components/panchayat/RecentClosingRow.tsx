import { StyleSheet } from 'react-native'
import { Text, XStack } from 'tamagui'
import type { RecentClosing } from './sample-data'
import { formatCount } from './sample-data'

// हाल की आहुति row per UX spec line 493:
//   "ruled rows — name + district + contributor count".
// Memorial name in $body Devanagari; district in $body Devanagari smaller;
// contributor count in $tabular Latin numerals per UX spec line 1127.

type Props = {
  closing: RecentClosing
}

export function RecentClosingRow({ closing }: Props) {
  return (
    <XStack
      px={16}
      py={10}
      items="baseline"
      gap="$2"
      borderBottomWidth={StyleSheet.hairlineWidth}
      borderBottomColor="$borderColor"
      bg="$background"
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${closing.memorialName}, ${closing.district}, ${formatCount(closing.contributorCount)} contributors`}
    >
      <Text flex={1} fontFamily="$body" fontSize="$3" color="$color">
        {closing.memorialName}
      </Text>
      <Text fontFamily="$body" fontSize="$2" color="$colorPress">
        {closing.district}
      </Text>
      <Text
        fontFamily="$tabular"
        fontSize="$2"
        color="$colorPress"
        style={styles.tabularNums}
        width={56}
        text="right"
      >
        {formatCount(closing.contributorCount)}
      </Text>
    </XStack>
  )
}

const styles = StyleSheet.create({
  tabularNums: {
    fontVariant: ['tabular-nums'],
  },
})
