import { Stack } from 'expo-router'

// The (signup) route GROUP (Story 3.3b). Hosts the signup KYC step. Being a group does
// not make it protected — the signup wizard chrome + member-creation-from-continuation
// is Story 3.6 (R2); 3.3b ships the KYC step as a reachable screen. Header hidden, like (auth).
export default function SignupLayout() {
  return <Stack screenOptions={{ headerShown: false }} />
}
