// Member session token storage (Story 3.2, Task 10).
//
// Access + refresh tokens are SENSITIVE → expo-secure-store (Keychain/Keystore),
// NOT MMKV (lib/mmkv.ts is for non-sensitive offline cache only — architecture line
// 2584). The stable device id (the trusted-device binding key, §2.4 line 1421) also
// lives here so it survives app restarts. Phone+OTP+device is transferable by design
// (Ravi-mode, UX line 263) — we add NO identity binding beyond these three.
//
// Access tokens are short-lived (server MEMBER_ACCESS_TTL_MS, 15 min); the refresh
// token is long-lived (90 days). `getAccessToken` transparently rotates the session
// via /token/refresh when the stored access token has expired, so a member is never
// stranded on 401s mid-session (they only re-OTP when the refresh token itself dies).

import * as SecureStore from 'expo-secure-store'

const ACCESS_KEY = 'twt.accessToken'
const EXPIRES_KEY = 'twt.accessTokenExpiresAt'
const REFRESH_KEY = 'twt.refreshToken'
const MEMBER_KEY = 'twt.memberId'
const PARIWAR_KEY = 'twt.pariwarId'
const DEVICE_KEY = 'twt.deviceId'

// Refresh this many ms BEFORE the token's stated expiry — clock skew + headroom for
// an in-flight request, so a call never departs with a token about to lapse.
const REFRESH_SKEW_MS = 30_000

const API_BASE = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000').replace(/\/$/, '')

export interface StoredSession {
  accessToken: string
  accessTokenExpiresAt: string
  refreshToken: string
  memberId: string
  pariwarId: string
}

export async function saveSession(s: StoredSession): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_KEY, s.accessToken),
    SecureStore.setItemAsync(EXPIRES_KEY, s.accessTokenExpiresAt),
    SecureStore.setItemAsync(REFRESH_KEY, s.refreshToken),
    SecureStore.setItemAsync(MEMBER_KEY, s.memberId),
    SecureStore.setItemAsync(PARIWAR_KEY, s.pariwarId),
  ])
}

export async function loadSession(): Promise<StoredSession | null> {
  const [accessToken, accessTokenExpiresAt, refreshToken, memberId, pariwarId] = await Promise.all([
    SecureStore.getItemAsync(ACCESS_KEY),
    SecureStore.getItemAsync(EXPIRES_KEY),
    SecureStore.getItemAsync(REFRESH_KEY),
    SecureStore.getItemAsync(MEMBER_KEY),
    SecureStore.getItemAsync(PARIWAR_KEY),
  ])
  if (!accessToken || !refreshToken || !memberId || !pariwarId) return null
  // A session persisted before this field existed reports an empty expiry — treated
  // as "expired" by getAccessToken, so the next authenticated call refreshes it.
  return { accessToken, accessTokenExpiresAt: accessTokenExpiresAt ?? '', refreshToken, memberId, pariwarId }
}

export async function clearSession(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_KEY),
    SecureStore.deleteItemAsync(EXPIRES_KEY),
    SecureStore.deleteItemAsync(REFRESH_KEY),
    SecureStore.deleteItemAsync(MEMBER_KEY),
    SecureStore.deleteItemAsync(PARIWAR_KEY),
  ])
}

// Single-flight guard: concurrent authenticated calls that all observe an expired
// token must share ONE refresh. Refresh tokens rotate (are single-use), so a second
// concurrent refresh with the same token would be rejected as already-consumed.
let refreshInFlight: Promise<string | null> | null = null

/**
 * The current access token for the api-client bearer header, refreshing the stored
 * session first when the token is expired (or within REFRESH_SKEW_MS of it). Returns
 * null when there is no session, or when the refresh token is itself rejected — in
 * which case the session is cleared so the next launch routes back to login.
 */
export async function getAccessToken(): Promise<string | null> {
  const [token, expiresAt] = await Promise.all([
    SecureStore.getItemAsync(ACCESS_KEY),
    SecureStore.getItemAsync(EXPIRES_KEY),
  ])
  if (!token) return null
  const expMs = expiresAt ? Date.parse(expiresAt) : Number.NaN
  const stillValid = Number.isFinite(expMs) && Date.now() < expMs - REFRESH_SKEW_MS
  if (stillValid) return token
  if (!refreshInFlight) {
    refreshInFlight = refreshAccessToken().finally(() => {
      refreshInFlight = null
    })
  }
  return refreshInFlight
}

/**
 * Rotate the stored session via POST /token/refresh. A raw `fetch` (not the
 * api-client) so this cannot recurse through `getAccessToken`, and so lib/session
 * stays free of an import cycle with lib/member-api. On success the fresh access +
 * rotated refresh token are persisted and the new access token returned. A 4xx means
 * the refresh token is dead → clear the session and return null; a network error is
 * transient → keep the session and return null (the current call 401s just this once).
 */
async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await SecureStore.getItemAsync(REFRESH_KEY)
  if (!refreshToken) return null
  let res: Response
  try {
    res = await fetch(`${API_BASE}/api/v1/member/auth/token/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
  } catch {
    return null
  }
  if (!res.ok) {
    if (res.status >= 400 && res.status < 500) await clearSession()
    return null
  }
  const full = (await res.json()) as StoredSession
  await saveSession({
    accessToken: full.accessToken,
    accessTokenExpiresAt: full.accessTokenExpiresAt,
    refreshToken: full.refreshToken,
    memberId: full.memberId,
    pariwarId: full.pariwarId,
  })
  return full.accessToken
}

/** A stable, persisted device id (generated once, reused across launches). */
export async function getDeviceId(): Promise<string> {
  const existing = await SecureStore.getItemAsync(DEVICE_KEY)
  if (existing) return existing
  const id = `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
  await SecureStore.setItemAsync(DEVICE_KEY, id)
  return id
}
