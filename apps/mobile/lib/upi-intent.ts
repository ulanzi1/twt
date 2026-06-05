import { Linking, Platform } from 'react-native'

// UPI Intent deep-link per architecture line 90 + PRD FR-27 (UPI Intent
// payment flow) + UX-DR P2 commitment (PhonePe + GPay + BHIM scenarios).
//
// NPCI UPI URL scheme: `upi://pay?<params>`
// Parameters (per NPCI Specification v2.7):
//   pa  = payee VPA (Virtual Payment Address) — required
//   pn  = payee name — required
//   tr  = transaction reference ID — recommended for idempotency per
//         architecture line 90 (`tr=` is the idempotency key the trust
//         uses to dedupe payment-completion webhook claims)
//   am  = amount in INR
//   cu  = currency (INR)
//   tn  = transaction note (max 50 chars per NPCI guidance)
//
// iOS caveat per UX spec line 818: iPhone iOS UPI Intent behavior is
// OS-level different; the Android target is the load-bearing P2 measurement
// surface. iOS may launch a chooser, may launch directly, or may show
// "Open in App Store" depending on installed UPI apps + iOS version.

export type UpiIntentParams = {
  payeeVpa: string
  payeeName: string
  /** Idempotency key — generate per transaction; deduped server-side */
  transactionRef: string
  /** Amount in INR; null/undefined for "user-chooses-amount" flows */
  amountInr?: number
  /** Optional transaction note (max 50 chars per NPCI) */
  note?: string
}

export type UpiLaunchOutcome =
  | { kind: 'launched'; url: string; platform: 'android' | 'ios' | 'other' }
  | { kind: 'unsupported'; url: string; reason: string }
  | { kind: 'error'; url: string; error: string }

/**
 * Build a UPI Intent URL per NPCI spec.
 * Encodes all parameters via encodeURIComponent.
 */
export function buildUpiIntentUrl(params: UpiIntentParams): string {
  const search = new URLSearchParams()
  search.set('pa', params.payeeVpa)
  search.set('pn', params.payeeName)
  search.set('tr', params.transactionRef)
  if (typeof params.amountInr === 'number') {
    search.set('am', params.amountInr.toFixed(2))
    search.set('cu', 'INR')
  }
  if (params.note) {
    // NPCI caps note at 50 chars; trim defensively
    search.set('tn', params.note.slice(0, 50))
  }
  return `upi://pay?${search.toString()}`
}

/**
 * Launch the UPI Intent URL.
 *
 * Android: triggers the system UPI app chooser (PhonePe / GPay / BHIM / etc).
 * iOS: behavior is OS-level different — may chooser, may launch directly,
 *      may show "no app" prompt. Captured for P2 measurement; iOS P2 cell
 *      may be tagged `not-applicable-iOS-OS-level-different` per UX spec
 *      line 818 + measurement-template.md.
 */
export async function launchUpiIntent(params: UpiIntentParams): Promise<UpiLaunchOutcome> {
  const url = buildUpiIntentUrl(params)
  const platform = Platform.OS === 'android' ? 'android' : Platform.OS === 'ios' ? 'ios' : 'other'

  try {
    const supported = await Linking.canOpenURL(url)
    if (!supported) {
      return {
        kind: 'unsupported',
        url,
        reason:
          platform === 'ios'
            ? 'iOS reports no UPI handler — install PhonePe / GPay / BHIM OR test on Android per UX spec line 818'
            : 'No UPI app installed to handle the upi:// scheme',
      }
    }
    await Linking.openURL(url)
    return { kind: 'launched', url, platform }
  } catch (err) {
    return {
      kind: 'error',
      url,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

/**
 * Generate an idempotency-safe transaction reference. Prototype impl uses
 * timestamp + random suffix; production should use a server-issued reference
 * or a cryptographic identifier per architecture line 90 `tr=` discipline.
 */
export function generateTransactionRef(prefix = 'TWT'): string {
  const ts = Date.now().toString(36).toUpperCase()
  const rand = Math.floor(Math.random() * 0xffff)
    .toString(36)
    .toUpperCase()
    .padStart(3, '0')
  return `${prefix}-${ts}-${rand}`
}
