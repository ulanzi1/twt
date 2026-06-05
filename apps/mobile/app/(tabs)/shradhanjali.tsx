import { Text, YStack } from 'tamagui'

// Tab 2 — Shradhanjali Sahyog Vivran (memorial column) placeholder.
// Implementation deferred to Day 4+ per Task 9 prototype-build plan.
export default function ShradhanjaliTab() {
  return (
    <YStack flex={1} alignItems="center" justifyContent="center" backgroundColor="$background" padding="$8">
      <Text fontFamily="$heading" fontSize="$8" color="$color">
        श्रद्धांजलि सहयोग विवरण
      </Text>
      <Text fontFamily="$body" fontSize="$3" color="$colorPress" marginTop="$4">
        Memorial column pattern · pending Day 4+
      </Text>
      <Text fontFamily="$body" fontSize="$2" color="$colorPress" marginTop="$2">
        UX spec §8 + lines 806 + 1157
      </Text>
    </YStack>
  )
}
