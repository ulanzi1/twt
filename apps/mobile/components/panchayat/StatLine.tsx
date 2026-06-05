import { Text, XStack } from 'tamagui'
import { StyleSheet } from 'react-native'
import type { StatLine as StatLineData } from './sample-data'
import { formatCount } from './sample-data'

// Single quiet stat-line per UX spec line 489:
//   `[total] सदस्य · [districts] ज़िले · इस माह [N] आहुति पूर्ण`
// No card; full-width horizontal strip, restrained typography.
// Counts in Latin numerals + $tabular font per UX spec line 1127.

type Props = {
  stats: StatLineData
}

export function StatLine({ stats }: Props) {
  return (
    <XStack
      paddingHorizontal={16}
      paddingVertical={12}
      alignItems="center"
      gap="$2"
    >
      <Stat count={stats.totalMembers} label="सदस्य" />
      <Separator />
      <Stat count={stats.districts} label="ज़िले" />
      <Separator />
      <Text fontFamily="$body" fontSize="$2" color="$colorPress">
        इस माह
      </Text>
      <Text
        fontFamily="$tabular"
        fontSize="$3"
        fontWeight="500"
        color="$color"
        style={styles.tabularNums}
      >
        {formatCount(stats.closedThisMonth)}
      </Text>
      <Text fontFamily="$body" fontSize="$2" color="$colorPress">
        आहुति पूर्ण
      </Text>
    </XStack>
  )
}

function Stat({ count, label }: { count: number; label: string }) {
  return (
    <XStack alignItems="baseline" gap="$1">
      <Text
        fontFamily="$tabular"
        fontSize="$3"
        fontWeight="500"
        color="$color"
        style={styles.tabularNums}
      >
        {formatCount(count)}
      </Text>
      <Text fontFamily="$body" fontSize="$2" color="$colorPress">
        {label}
      </Text>
    </XStack>
  )
}

function Separator() {
  return (
    <Text fontFamily="$body" fontSize="$2" color="$colorPress">
      ·
    </Text>
  )
}

const styles = StyleSheet.create({
  tabularNums: {
    fontVariant: ['tabular-nums'],
  },
})
