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
import { clearLinkTarget } from './link-target'
import {
  clearSession,
  loadSession,
  saveSession,
  setRefreshRejectedHandler,
  setTerminatedDuringRefreshHandler,
  type StoredSession,
  type TerminationDuringRefresh,
} from './session'
import { clearAllMemberDrafts } from '../components/life-events/draft-store'
import { clearPeerRequestsCache } from '../components/peer-request/peer-request-cache'
import { clearKnownPeopleCache } from '../components/known-people/known-people-cache'
import { clearSavedNames } from './known-people-saved-names'
import { clearHomeCardDismissals } from './home-card-dismissals'
import { queryClient } from './query-client'

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
      clearPeerRequestsCache(queryClient)
      // The SecureStore side is already cleared by `refreshAccessToken`; this is what makes that
      // clear REACTIVE — without it `session` stays stale in context and the root guard never fires.
      setSession(null)
      // Story 6.36b — the people-who-know-me lists (other members' names) and the names the member SAVED on this phone.
      clearKnownPeopleCache(queryClient)
      clearSavedNames()
      // Story 6.36c (fix-review) — the home cards' dismissals are now namespaced per account (`lib/home-card-dismissals`),
      // so they no longer need clearing here: this handler (registered once, at mount) cannot reliably name the OLD
      // account to target anyway, and a DIFFERENT account signing in next is already isolated by its own key.
      setTerminationNotice(notice)
      // Story 6.30 AL6 (iv) — the termination redirect WINS over any link target.
      clearLinkTarget()
    })
    // Story 6.30 AL6 (i) — every refresh refused with a 4xx makes the SecureStore clear reactive too, so the
    // guard sends the member to login FROM the link's screen (and records it as the target).
    setRefreshRejectedHandler(() => {
      clearPeerRequestsCache(queryClient)
      setSession(null)
      clearKnownPeopleCache(queryClient)
      clearSavedNames()
      // Story 6.36c (fix-review) — see the comment above: the namespaced dismissal key makes this clear unnecessary.
    })
    return () => {
      setTerminatedDuringRefreshHandler(null)
      setRefreshRejectedHandler(null)
    }
  }, [])

  async function signIn(full: MemberFullSession): Promise<void> {
    clearPeerRequestsCache(queryClient)
    clearKnownPeopleCache(queryClient)
    // Story 6.36c (fix-review) — the dismissal key is namespaced per account (`lib/home-card-dismissals`), so a
    // DIFFERENT account's dismissals are already isolated from this one; clearing here would ALSO lose a same-account
    // sign-out/sign-in's own dismissals, which is exactly the bug this fixed.
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
    clearPeerRequestsCache(queryClient)
    clearKnownPeopleCache(queryClient)
    clearSavedNames()
    // Story 6.36c (fix-review) — sign-out IS a reliable point to name the account (`session` is still in scope, below),
    // so its dismissals are cleared here for privacy/cleanup on a shared device.
    clearHomeCardDismissals(session?.memberId)
    // Purge member-scoped drafts before clearing the session so the memberId is still available.
    if (session?.memberId) clearAllMemberDrafts(session.memberId)
    try {
      await memberAuth.logout()
    } catch {
      // Best-effort server revoke; clear locally regardless.
    }
    await clearSession()
    // Story 6.30 AL6 (iv) — a link target ⛔ never survives a sign-out.
    clearLinkTarget()
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
