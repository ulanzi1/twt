import { ScrollView, StyleSheet } from 'react-native'
import { Text, View, XStack, YStack } from 'tamagui'
import { StatLine } from './StatLine'
import { PinnedItem } from './PinnedItem'
import { RecentClosingRow } from './RecentClosingRow'
import { P3DiagnosticPanel } from './P3DiagnosticPanel'
import {
  SAMPLE_NEXT_MEETING,
  SAMPLE_PINNED,
  SAMPLE_RECENT_CLOSINGS,
  SAMPLE_STATS,
} from './sample-data'

// Panchayat Noticeboard (home screen for non-alert moments) per UX spec §8 +
// lines 483-498 + 807 + 1158.
//
// Reference: panchayat bhavan noticeboard + RTPS portal scheme-list +
// Jagran front-page density. NOT a feed; NOT shadowed cards (those would
// be ads not memorials per UX spec line 534).
//
// Orthogonal layout throughout per UX spec line 497: full-width strips,
// vertical stack, one typeface family at small set of sizes/weights.
//
// Visual grammar per UX spec lines 488-495:
//   Top strip: Pariwar seal left, परिवार की नब्ज़ center
//   Stat line: single quiet stat-line, no card
//   Hairline
//   Pinned section header सूचना पट्ट; 2-3 items max; colored left stubs
//   Hairline
//   हाल की आहुति: last 5 closed pools
//   Hairline
//   Footer: next monthly Pariwar meeting date

export function PanchayatNoticeboard() {
  return (
    <YStack flex={1} backgroundColor="$background">
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Top strip per UX spec line 488 — Pariwar seal left, title center */}
        <XStack
          paddingHorizontal={16}
          paddingVertical={16}
          alignItems="center"
        >
          {/* Pariwar seal stub — production uses Stamp atom per UX spec line 679 */}
          <View
            width={32}
            height={32}
            borderWidth={1.5}
            borderColor="$color"
            borderRadius={16}
            alignItems="center"
            justifyContent="center"
          >
            <Text fontFamily="$heading" fontSize="$2" color="$color">
              ट
            </Text>
          </View>
          <Text
            flex={1}
            fontFamily="$heading"
            fontSize="$6"
            color="$color"
            textAlign="center"
            // Visual balance: seal width on right side as spacer
            paddingRight={32}
          >
            परिवार की नब्ज़
          </Text>
        </XStack>

        {/* Quiet stat-line, no card */}
        <StatLine stats={SAMPLE_STATS} />

        <Hairline />

        {/* Pinned section header सूचना पट्ट per UX spec line 491 */}
        <SectionHeader title="सूचना पट्ट" />
        {SAMPLE_PINNED.map((item) => (
          <PinnedItem key={item.id} item={item} />
        ))}

        <Hairline />

        {/* हाल की आहुति per UX spec line 493 */}
        <SectionHeader title="हाल की आहुति" />
        {SAMPLE_RECENT_CLOSINGS.map((closing) => (
          <RecentClosingRow key={closing.id} closing={closing} />
        ))}

        <Hairline />

        {/* Footer: next monthly Pariwar meeting per UX spec line 495 */}
        <YStack paddingHorizontal={16} paddingVertical={16} gap={4}>
          <Text fontFamily="$body" fontSize="$2" color="$colorPress" letterSpacing={1}>
            अगली मासिक बैठक
          </Text>
          <XStack alignItems="baseline" gap="$2">
            <Text
              fontFamily="$tabular"
              fontSize="$5"
              fontWeight="500"
              color="$color"
              style={styles.tabularNums}
            >
              {SAMPLE_NEXT_MEETING.date} {SAMPLE_NEXT_MEETING.monthYear}
            </Text>
            <Text flex={1} fontFamily="$body" fontSize="$3" color="$colorPress">
              {SAMPLE_NEXT_MEETING.venue}
            </Text>
          </XStack>
        </YStack>

        {/* P3 diagnostic panel — Task 10 measurement evidence surface.
            Prototype-only; production removes this. */}
        <P3DiagnosticPanel />
      </ScrollView>
    </YStack>
  )
}

function SectionHeader({ title }: { title: string }) {
  return (
    <XStack paddingHorizontal={16} paddingTop={16} paddingBottom={8}>
      <Text
        fontFamily="$body"
        fontSize="$2"
        color="$colorPress"
        letterSpacing={2}
      >
        {title}
      </Text>
    </XStack>
  )
}

function Hairline() {
  return (
    <View
      height={StyleSheet.hairlineWidth}
      backgroundColor="#000000"
      width="100%"
    />
  )
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 24,
  },
  tabularNums: {
    fontVariant: ['tabular-nums'],
  },
})
