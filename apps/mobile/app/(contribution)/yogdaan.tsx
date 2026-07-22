// Yogdaan Bahi route (Story 8.6, Task 4) — the dedicated contribution-passbook screen. Reached from the
// home stack's understated <YogdaanBahiEntry> (→ router.push). This screen OWNS the full-height scroll so
// the passbook's FlatList is the scroll owner and virtualization stays active (AC4/D5) — the P0-5
// prototype's inline home mount nested the FlatList in a parent stack, which this replaces.

import { Stack } from 'expo-router'

import { YogdaanBahi } from '../../components/yogdaan-bahi/YogdaanBahi'

export default function YogdaanScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <YogdaanBahi />
    </>
  )
}
