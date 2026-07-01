import { Stack } from 'expo-router'

// Life Events route GROUP (Story 3.9, Task 8) — a plain Stack: panel index + the four sub-type
// screens (nominees / address / posting / medical). The OS-chrome back button returns to the panel
// index (and thence the home tab). No wizard progress bar (unlike signup) — these are one-off
// self-service updates, not an ordered flow. The root _layout.tsx sets headerShown:false for this
// group so this inner Stack owns its own headers.
export default function LifeEventsLayout() {
  return <Stack />
}
