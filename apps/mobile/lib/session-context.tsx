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
import { clearSession, loadSession, saveSession, type StoredSession } from './session'
import { clearAllMemberDrafts } from '../components/life-events/draft-store'

interface SessionContextValue {
  session: StoredSession | null
  isLoading: boolean
  signIn: (full: MemberFullSession) => Promise<void>
  signOut: () => Promise<void>
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function SessionProvider({ children }: { children: ReactNode }): ReactNode {
  const [session, setSession] = useState<StoredSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)

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
    <SessionContext.Provider value={{ session, isLoading, signIn, signOut }}>
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
