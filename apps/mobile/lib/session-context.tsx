// Member session context (Story 3.2, Task 10).
//
// Loads the persisted session from expo-secure-store on mount (session-resume —
// §2.2 line 1343: resume does not require OTP unless a force-re-OTP signal fires)
// and exposes signIn / signOut. The root layout's auth guard reads `session` +
// `isLoading` to redirect unauthenticated users to the login screen.

import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'

import type { MemberFullSession } from '@twt/contracts'

import { memberAuth } from './member-api'
import {
  clearSession,
  loadSession,
  saveSession,
  setTerminatedDuringRefreshHandler,
  type StoredSession,
  type TerminationDuringRefresh,
} from './session'
import { clearAllMemberDrafts } from '../components/life-events/draft-store'

interface SessionContextValue {
  session: StoredSession | null
  isLoading: boolean
  signIn: (full: MemberFullSession) => Promise<void>
  signOut: () => Promise<void>
  /**
   * Story 10.19 (AC5) — set when a background token refresh discovered the member was terminated.
   * The root layout's guard redirects to `/(auth)/terminated` when this is non-null, then clears it.
   */
  terminationNotice: TerminationDuringRefresh | null
  clearTerminationNotice: () => void
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function SessionProvider({ children }: { children: ReactNode }): ReactNode {
  const [session, setSession] = useState<StoredSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [terminationNotice, setTerminationNotice] = useState<TerminationDuringRefresh | null>(null)

  useEffect(() => {
    let active = true
    loadSession()
      .then((s) => {
        if (active) setSession(s)
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    setTerminatedDuringRefreshHandler((notice) => {
      // The SecureStore side is already cleared by `refreshAccessToken`; this is what makes that
      // clear REACTIVE — without it `session` stays stale in context and the root guard never fires.
      setSession(null)
      setTerminationNotice(notice)
    })
    return () => setTerminatedDuringRefreshHandler(null)
  }, [])

  async function signIn(full: MemberFullSession): Promise<void> {
    const s: StoredSession = {
      accessToken: full.accessToken,
      accessTokenExpiresAt: full.accessTokenExpiresAt,
      refreshToken: full.refreshToken,
      memberId: full.memberId,
      pariwarId: full.pariwarId,
    }
    await saveSession(s)
    setSession(s)
  }

  async function signOut(): Promise<void> {
    // Purge member-scoped drafts before clearing the session so the memberId is still available.
    if (session?.memberId) clearAllMemberDrafts(session.memberId)
    try {
      await memberAuth.logout()
    } catch {
      // Best-effort server revoke; clear locally regardless.
    }
    await clearSession()
    setSession(null)
  }

  return (
    <SessionContext.Provider
      value={{
        session,
        isLoading,
        signIn,
        signOut,
        terminationNotice,
        clearTerminationNotice: () => setTerminationNotice(null),
      }}
    >
      {children}
    </SessionContext.Provider>
  )
}

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext)
  if (value === null) {
    throw new Error('useSession() must be used within a <SessionProvider>')
  }
  return value
}
