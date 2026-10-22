// PURE message-key selection for the manual KYC name — Story 3.3c (`-378` decision 6, `-382`).
//
// `-227` cl.1: the member's own name typed in the manual KYC fallback is English-only at INPUT. The
// screen asks these two functions which message to show, so the choice is pinned without a render
// harness (the 6.21b / 6.18 pattern). ONE predicate: `isEnglishScriptName` from `@twt/contracts`,
// the same one the server's `EnglishScriptName` runs — ⛔ a second regex here.

import { ApiError } from '@twt/api-client'
import { isEnglishScriptName } from '@twt/contracts'

export type ManualNameMessageKey = 'kyc.manual_name_required' | 'kyc.manual_name_english'

/** Blank → required; not in English letters → english; else `null` (the name may be submitted). */
export function manualNameMessageKey(name: string): ManualNameMessageKey | null {
  if (name.trim() === '') return 'kyc.manual_name_required'
  if (!isEnglishScriptName(name)) return 'kyc.manual_name_english'
  return null
}

/**
 * A server refusal of the name's SCRIPT → the English-name message; anything else → `null`, and the
 * screen keeps today's mapping. Keyed on `instancePath` AND `keyword`: a `too_big` on `/name` is an
 * English name over 200, ⛔ a script problem. `details` is read defensively — a malformed one → `null`.
 */
export function manualSubmitErrorKey(err: unknown): 'kyc.manual_name_english' | null {
  if (!(err instanceof ApiError) || err.code !== 'request.validation') return null
  const issues = (err.details as { issues?: unknown } | null | undefined)?.issues
  if (!Array.isArray(issues)) return null
  const scriptRefusal = issues.some((issue: unknown) => {
    if (typeof issue !== 'object' || issue === null) return false
    const { instancePath, keyword } = issue as { instancePath?: unknown; keyword?: unknown }
    return instancePath === '/name' && keyword === 'invalid_string'
  })
  return scriptRefusal ? 'kyc.manual_name_english' : null
}
