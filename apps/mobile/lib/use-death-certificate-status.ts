// The shared death-certificate status hook — Story 6.21b (D1, D3).
//
// Fetches a FRESH server read, then applies the marker precedence (`death-certificate-view.ts`,
// pure/tested) to produce the notice both `shepherd.tsx` and `certificate-replacement.tsx` render
// through `<DeathCertificateNotice>`. `-249` §1 (B1) — on a failed/offline read, `notice` is `null`
// and NOTHING is cached: this hook holds no fallback state of its own.

import { useCallback, useEffect, useRef, useState } from 'react'

import { AppState } from 'react-native'

import type { MemberDeathCertificateStatusResponse } from '@twt/contracts'

import { claimApi } from './claim-api'
import { resolveCertificateNotice, type CertificateNoticeView } from './death-certificate-view'
import { clearCertificatePendingMarker, loadCertificatePendingMarker } from './filed-claim'

export interface DeathCertificateStatusState {
  readonly phase: 'loading' | 'ready' | 'error'
  /** The RAW fresh read (⛔ marker-unresolved) — a screen offering an upload needs this to build the
   *  marker's write context (D1's `serverStatusAtWrite` / `tokenAtWrite`). `null` outside `ready`. */
  readonly freshRead: MemberDeathCertificateStatusResponse | null
  /** `null` ⇒ render no certificate notice at all (loading, error, or offline). */
  readonly notice: CertificateNoticeView | null
}

export interface UseDeathCertificateStatusResult extends DeathCertificateStatusState {
  /** Resolves with the freshly-read state once the refetch settles (never rejects) — lets a caller
   *  (the replacement screen's `upload_not_allowed` handling, BW-J6) act on the RESULT. */
  refetch: () => Promise<DeathCertificateStatusState>
}

export interface UseDeathCertificateStatusOptions {
  /** Re-read when the app returns to the foreground — for a screen that can sit open in the background
   *  (the shepherd), so a notice like "has not been refused" never outlives a denial made meanwhile
   *  (`-249` §1's class). ⛔ Off for the replacement screen: a re-read there would flash the loading gate
   *  over an OTP entry in progress. */
  readonly refetchOnForeground?: boolean
}

export function useDeathCertificateStatus(
  claimCaseId: string | undefined,
  options: UseDeathCertificateStatusOptions = {},
): UseDeathCertificateStatusResult {
  const [state, setState] = useState<DeathCertificateStatusState>({
    phase: 'loading',
    freshRead: null,
    notice: null,
  })

  // Only the LATEST read may land (the shepherd fires one on mount AND one on first focus; two reads can
  // resolve out of order), and nothing lands after unmount.
  const seqRef = useRef(0)
  const mountedRef = useRef(true)
  useEffect(
    () => () => {
      mountedRef.current = false
    },
    [],
  )

  const load = useCallback((): Promise<DeathCertificateStatusState> => {
    const seq = ++seqRef.current
    const land = (next: DeathCertificateStatusState): DeathCertificateStatusState => {
      if (mountedRef.current && seq === seqRef.current) setState(next)
      return next
    }
    if (!claimCaseId) {
      return Promise.resolve(land({ phase: 'error', freshRead: null, notice: null }))
    }
    setState((s) => ({ ...s, phase: 'loading' }))
    return claimApi
      .getDeathCertificateStatus(claimCaseId)
      .then((data) => {
        // The marker read/clear are best-effort and never throw (`filed-claim.ts`); the resolver is pure.
        const marker = loadCertificatePendingMarker(claimCaseId)
        const resolution = resolveCertificateNotice(data, marker, Date.now())
        if (resolution.clearMarker) clearCertificatePendingMarker(claimCaseId)
        return land({ phase: 'ready', freshRead: data, notice: resolution.notice })
      })
      // Offline / transient / not-owned — `-249` §1: no notice, no cache. (`refetch` never rejects.)
      .catch(() => land({ phase: 'error', freshRead: null, notice: null }))
  }, [claimCaseId])

  useEffect(() => {
    void load()
  }, [load])

  const refetchOnForeground = options.refetchOnForeground === true
  useEffect(() => {
    if (!refetchOnForeground) return
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') void load()
    })
    return () => sub.remove()
  }, [refetchOnForeground, load])

  return { ...state, refetch: load }
}
