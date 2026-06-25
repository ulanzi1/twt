import { Stack } from 'expo-router'

// The (auth) route GROUP. Being a group does not make it protected — the auth guard
// lives in the ROOT layout (app/_layout.tsx); this just hides the header for the
// login + OTP screens.
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />
}
