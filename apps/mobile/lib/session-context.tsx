// Member session context (Story 3.2, Task 10).
//
// Loads the persisted session from expo-secure-store on mount (session-resume —
// §2.2 line 1343: resume does not require OTP unless a force-re-OTP signal fires)
// and exposes signIn / signOut. The root layout's auth guard reads `session` +
// `isLoading` to redirect unauthenticated users to the login screen.
//
// Story 6.35 (2026-10-23, LS3 / LS5) — the app language is reconciled with the member's server record HERE: ONE effect
// keyed on `session?.memberId` (sign-in AND start with a stored session) and ONE app-level `AppState` → `active`
// listener (the resync), both calling `syncAppLanguage` (`lib/app-language.ts`). The three member-data clear paths
// (sign-out and the two refresh handlers below) do NOT clear the language keys (`app-language.v1`, `app-language.pending.v1`):
// they are a PHONE setting, like the OS language, and are kept DELIBERATELY — a pending choice tagged with another member
// is dropped by `syncAppLanguage` itself.

import { createContext, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { AppState } from 'react-native'

import type { MemberFullSession } from '@twt/contracts'
import { useLocale } from '@twt/i18n/react'

import { memberAuth } from './member-api'
import { syncAppLanguage } from './app-language'
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
import { clearNomineeLinksCache } from '../components/nominee-links/nominee-links-cache'
import { clearAnswerKeys } from '../components/workplace/suggestion-answer-key-cache'
import { clearSavedNames } from './known-people-saved-names'
import { clearHomeCardDismissals, clearSessionSuggestionDismissals } from './home-card-dismissals'
import { queryClient } from './query-client'

interface SessionContextValue {
  session: StoredSession | null
  isLoading: boolean
  signIn: (full: MemberFullSession) => Promise<void>
  signOut: () => Promise<void>
  /** Read at the actual handoff of a queued language write, including after this screen unmounts. */
  currentMemberId: () => string | null
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
  const { setLocale } = useLocale()
  // Story 6.35 (LS5) — the session's member NOW, read by the foreground listener and by an in-flight sync (a result for a
  // member who is no longer signed in is dropped) — ⛔ a stale closure.
  const memberIdRef = useRef<string | null>(null)
  const memberId = session?.memberId ?? null

  useEffect(() => {
    memberIdRef.current = memberId
    if (memberId === null) return
    void syncAppLanguage(memberId, { setLocale, currentMemberId: () => memberIdRef.current })
  }, [memberId, setLocale])

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return
      const current = memberIdRef.current
      if (current === null) return
      void syncAppLanguage(current, { setLocale, currentMemberId: () => memberIdRef.current })
    })
    return () => sub.remove()
  }, [setLocale])

  useEffect(() => {
    let active = true
    loadSession()
      .then((s) => {
        if (active) {
          memberIdRef.current = s?.memberId ?? null
          setSession(s)
        }
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
      memberIdRef.current = null
      clearPeerRequestsCache(queryClient)
      // The SecureStore side is already cleared by `refreshAccessToken`; this is what makes that
      // clear REACTIVE — without it `session` stays stale in context and the root guard never fires.
      setSession(null)
      // Story 6.36b — the people-who-know-me lists (other members' names) and the names the member SAVED on this phone.
      clearKnownPeopleCache(queryClient)
      // Story 6.36e — the nominee marks (other members' names), the form session's matched contacts and pick.
      clearNomineeLinksCache(queryClient)
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
      memberIdRef.current = null
      clearPeerRequestsCache(queryClient)
      setSession(null)
      clearKnownPeopleCache(queryClient)
      // Story 6.36e — the nominee marks (other members' names), the form session's matched contacts and pick.
      clearNomineeLinksCache(queryClient)
      clearSavedNames()
      // Story 6.36c (fix-review) — see the comment above: the namespaced dismissal key makes this clear unnecessary.
    })
    return () => {
      setTerminatedDuringRefreshHandler(null)
      setRefreshRejectedHandler(null)
    }
  }, [])

  async function signIn(full: MemberFullSession): Promise<void> {
    // Block queued language writes BEFORE the secure-store bearer changes, not only after React commits the session.
    memberIdRef.current = null
    clearPeerRequestsCache(queryClient)
    clearKnownPeopleCache(queryClient)
    // Story 6.36e — the nominee marks (other members' names), the form session's matched contacts and pick.
    clearNomineeLinksCache(queryClient)
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
    memberIdRef.current = s.memberId
    setSession(s)
  }

  async function signOut(): Promise<void> {
    memberIdRef.current = null
    clearPeerRequestsCache(queryClient)
    clearKnownPeopleCache(queryClient)
    // Story 6.36e — the nominee marks (other members' names), the form session's matched contacts and pick.
    clearNomineeLinksCache(queryClient)
    clearSavedNames()
    // Story 6.36c (fix-review) — sign-out IS a reliable point to name the account (`session` is still in scope, below),
    // so its dismissals are cleared here for privacy/cleanup on a shared device.
    clearHomeCardDismissals(session?.memberId)
    // Code review round 2 — and the two IN-MEMORY 6.36c stores, which outlived a sign-out for the rest of the app
    // process: the suggestion card's session-only "Not now" (`lib/home-card-dismissals`) and the confirm question's
    // shared Idempotency-Keys (`components/workplace/suggestion-answer-key-cache`).
    clearSessionSuggestionDismissals()
    clearAnswerKeys()
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
        currentMemberId: () => memberIdRef.current,
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
