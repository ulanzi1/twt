import { Stack } from 'expo-router'

// The `/peer-request` route GROUP (Story 6.30, `2026-10-10-312` AL16) — a plain Stack, the house pattern
// (`(data-export)`): the root _layout.tsx sets headerShown:false for this group, so the header is this inner
// Stack's to show or hide. Today its one screen — the app-link route shell `peer-request.tsx`, rendering the
// 6.30 placeholder slot — HIDES it (⛔ no header, ⛔ no visible back affordance on a cold-start link); Story
// 6.27a decides the header when it fills the slot.
export default function PeerRequestLayout() {
  return <Stack />
}
