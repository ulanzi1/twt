// The shared handover-trust OTP hook — Story 6.21b (D2).
//
// Extracted from `(claim)/handover-otp.tsx` so BOTH it and the new
// `(claim)/certificate-replacement.tsx`'s step-up leg use ONE request/verify path. Navigation stays
// with each SCREEN: `handover-otp.tsx` keeps pushing `/(claim)/relationship` (unchanged);
// `certificate-replacement.tsx` retries the upload with the file already picked (⛔ never
// `useStepUpGate` — that sends to the SESSION member's phone, while the handover OTP goes to the
// NOMINEE's, `claims.service.ts` `sendHandoverOtp`).

import { useCallback, useState } from 'react'

import { ApiError } from '@twt/api-client'

import { claimApi } from './claim-api'
import { useClaimT } from './claim-i18n'

export interface UseHandoverOtpResult {
  readonly masked: string | null
  readonly noNominee: boolean
  readonly error: string | null
  readonly busy: boolean
  send: () => Promise<void>
  /** Resolves `true` iff the code verified. */
  verify: (code: string) => Promise<boolean>
}

export function useHandoverOtp(): UseHandoverOtpResult {
  const t = useClaimT()
  const [masked, setMasked] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const send = useCallback(async (): Promise<void> => {
    setError(null)
    try {
      const res = await claimApi.requestHandoverOtp()
      // An empty mask means no reachable nominee (existence-defended).
      setMasked(res.nomineeMobileMasked || '')
    } catch (e) {
      setError(e instanceof ApiError && e.status === 429 ? t('otp.error_rate_limit') : t('otp.error_invalid'))
    }
  }, [t])

  const verify = useCallback(
    async (code: string): Promise<boolean> => {
      setBusy(true)
      setError(null)
      try {
        const res = await claimApi.verifyHandoverOtp(code)
        if (res.verified) return true
        setError(t('otp.error_invalid'))
        return false
      } catch (e) {
        setError(e instanceof ApiError && e.status === 429 ? t('otp.error_rate_limit') : t('otp.error_invalid'))
        return false
      } finally {
        setBusy(false)
      }
    },
    [t],
  )

  return { masked, noNominee: masked === '', error, busy, send, verify }
}
