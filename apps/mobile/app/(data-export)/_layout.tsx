import { Stack } from 'expo-router'

// DPDPA data-export route GROUP (Story 3.11, Task 7) — a plain Stack: the single request → poll →
// step-up → download screen (`index`). Calm/neutral register — the export is a right, not a
// transaction. The root _layout.tsx sets headerShown:false for this group so this inner Stack owns its
// own header. Reached from an understated home-tab entry (DataExportEntry).
export default function DataExportLayout() {
  return <Stack />
}
