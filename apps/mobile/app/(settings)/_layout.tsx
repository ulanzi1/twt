import { Stack } from 'expo-router'

// Notification-settings route GROUP (Story 5.4, Task 6) — a plain Stack owning the WhatsApp opt-in
// screen (`notifications`). Calm/neutral register — opting in is a member choice, never nagged. The root
// _layout.tsx sets headerShown:false for this group so this inner Stack owns its own header.
export default function SettingsLayout() {
  return <Stack />
}
