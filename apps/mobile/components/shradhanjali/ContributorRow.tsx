import { memo } from 'react'
import { StyleSheet } from 'react-native'
import { Text, XStack, YStack } from 'tamagui'
import type { Contributor } from './sample-data'

// Single contributor row in the Shradhanjali scroll per UX spec line 478:
// "line + contributor name + district, hairline-separated, no avatars,
// no minute-precision timestamps (month-year only)".
//
// If contributor left a memory line, render it above the name+district line
// in $body italic-style (RN doesn't render Tiro italic well; visual italic
// via letterSpacing nudge per UX spec discipline).

type Props = {
  contributor: Contributor
}

function ContributorRowComponent({ contributor }: Props) {
  const hasMemory = contributor.memoryLine !== null

  return (
    <YStack
      paddingHorizontal={12}
      paddingVertical={hasMemory ? 8 : 10}
      borderBottomWidth={StyleSheet.hairlineWidth}
      borderBottomColor="$borderColor"
      backgroundColor="$background"
    >
      {hasMemory && (
        <Text
          fontFamily="$body"
          fontSize="$3"
          color="$color"
          marginBottom={4}
          // Light letter-spacing to suggest reflection cadence per memorial register
          letterSpacing={0.2}
        >
          {contributor.memoryLine}
        </Text>
      )}
      <XStack alignItems="baseline" gap="$2">
        <Text flex={1} fontFamily="$body" fontSize="$3" color="$color">
          {contributor.name}
        </Text>
        <Text fontFamily="$body" fontSize="$2" color="$colorPress">
          {contributor.district}
        </Text>
        <Text
          fontFamily="$tabular"
          fontSize="$2"
          color="$colorPress"
          style={styles.tabularNums}
        >
          {contributor.monthYear}
        </Text>
      </XStack>
    </YStack>
  )
}

const styles = StyleSheet.create({
  tabularNums: {
    fontVariant: ['tabular-nums'],
  },
})

export const ContributorRow = memo(ContributorRowComponent)
