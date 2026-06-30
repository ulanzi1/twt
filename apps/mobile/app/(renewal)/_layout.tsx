import { Stack } from 'expo-router'

// Renewal payment group — one screen (payment.tsx). A plain Stack so the OS-chrome back button
// returns to the home tab. No wizard progress bar (unlike the signup flow). The root _layout.tsx
// sets headerShown:false for this group so this inner Stack fully owns its own header.
export default function RenewalLayout() {
  return <Stack />
}
