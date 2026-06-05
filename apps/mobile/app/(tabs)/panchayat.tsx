import { Text, YStack } from 'tamagui'

// Tab 3 — Panchayat Noticeboard placeholder.
// Implementation deferred to Day 4+ per Task 9 prototype-build plan.
export default function PanchayatTab() {
  return (
    <YStack flex={1} alignItems="center" justifyContent="center" backgroundColor="$background" padding="$8">
      <Text fontFamily="$heading" fontSize="$8" color="$color">
        पंचायत सूचना पट्ट
      </Text>
      <Text fontFamily="$body" fontSize="$3" color="$colorPress" marginTop="$4">
        Noticeboard strip pattern · pending Day 4+
      </Text>
      <Text fontFamily="$body" fontSize="$2" color="$colorPress" marginTop="$2">
        UX spec §8 + lines 807 + 1158
      </Text>
    </YStack>
  )
}
