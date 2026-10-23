import { Stack } from 'expo-router'

// Notification-settings route GROUP (Story 5.4, Task 6) — a plain Stack owning the WhatsApp opt-in
// screen (`notifications`). Calm/neutral register — opting in is a member choice, never nagged. The root
// _layout.tsx sets headerShown:false for this group so this inner Stack owns its own header.
// Story 6.35 (2026-10-23) — the group also owns the app-language screen (`language`); each screen sets its own header
// title (`<Stack.Screen options={{ title }} />`), so the header ⛔ shows the route name.
export default function SettingsLayout() {
  return <Stack />
}
