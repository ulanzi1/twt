import { Stack } from 'expo-router'

// The `/peer-request` route GROUP (Story 6.30, `2026-10-10-312` AL16) — a plain Stack, the house pattern
// (`(data-export)`): the root _layout.tsx sets headerShown:false for this group so this inner Stack owns
// its own header. Its one screen is the app-link route shell `peer-request.tsx`; Story 6.27a fills it.
export default function PeerRequestLayout() {
  return <Stack />
}
