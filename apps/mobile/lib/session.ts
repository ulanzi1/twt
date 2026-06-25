// Member session token storage (Story 3.2, Task 10).
//
// Access + refresh tokens are SENSITIVE → expo-secure-store (Keychain/Keystore),
// NOT MMKV (lib/mmkv.ts is for non-sensitive offline cache only — architecture line
// 2584). The stable device id (the trusted-device binding key, §2.4 line 1421) also
// lives here so it survives app restarts. Phone+OTP+device is transferable by design
// (Ravi-mode, UX line 263) — we add NO identity binding beyond these three.

import * as SecureStore from 'expo-secure-store'

const ACCESS_KEY = 'twt.accessToken'
const REFRESH_KEY = 'twt.refreshToken'
const MEMBER_KEY = 'twt.memberId'
const PARIWAR_KEY = 'twt.pariwarId'
const DEVICE_KEY = 'twt.deviceId'

export interface StoredSession {
  accessToken: string
  refreshToken: string
  memberId: string
  pariwarId: string
}

export async function saveSession(s: StoredSession): Promise<void> {
  await SecureStore.setItemAsync(ACCESS_KEY, s.accessToken)
  await SecureStore.setItemAsync(REFRESH_KEY, s.refreshToken)
  await SecureStore.setItemAsync(MEMBER_KEY, s.memberId)
  await SecureStore.setItemAsync(PARIWAR_KEY, s.pariwarId)
}

export async function loadSession(): Promise<StoredSession | null> {
  const [accessToken, refreshToken, memberId, pariwarId] = await Promise.all([
    SecureStore.getItemAsync(ACCESS_KEY),
    SecureStore.getItemAsync(REFRESH_KEY),
    SecureStore.getItemAsync(MEMBER_KEY),
    SecureStore.getItemAsync(PARIWAR_KEY),
  ])
  if (!accessToken || !refreshToken || !memberId || !pariwarId) return null
  return { accessToken, refreshToken, memberId, pariwarId }
}

export async function clearSession(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_KEY),
    SecureStore.deleteItemAsync(REFRESH_KEY),
    SecureStore.deleteItemAsync(MEMBER_KEY),
    SecureStore.deleteItemAsync(PARIWAR_KEY),
  ])
}

/** The current access token (for the api-client bearer header), or null. */
export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(ACCESS_KEY)
}

/** A stable, persisted device id (generated once, reused across launches). */
export async function getDeviceId(): Promise<string> {
  const existing = await SecureStore.getItemAsync(DEVICE_KEY)
  if (existing) return existing
  const id = `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
  await SecureStore.setItemAsync(DEVICE_KEY, id)
  return id
}
