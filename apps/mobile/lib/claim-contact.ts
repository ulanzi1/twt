// The claim CONTACT step's pure logic (Story 6.19a, AC1) — kept out of the route file so it is unit-testable
// and expo-router sees only the screen. Builds the member's FULL record (W1: by rank), or names what is missing.
// ⛔ Nothing here is persisted: the draft stays PII-free.

import type { NomineeStatusResponse, RecordMemberClaimContactRequest } from '@twt/contracts'
import { CLAIMANT_NOMINEE_RELATIONSHIP_CODES } from '@twt/contracts'

type NomineeSummary = NomineeStatusResponse['nominees'][number]
export type ClaimantChoice = { kind: 'rank'; rank: 1 | 2 } | { kind: 'someone_else' } | null
export type ClaimantNomineeRelationshipCode = (typeof CLAIMANT_NOMINEE_RELATIONSHIP_CODES)[number]

/** Pure: build the member's FULL record, or name what is missing. */
export function buildMemberContactBody(input: {
  nominees: readonly Pick<NomineeSummary, 'rank'>[]
  addresses: Readonly<Record<number, string>>
  claimant: ClaimantChoice
  block: { name: string; mobile: string; address: string }
  relationships: Readonly<Record<number, ClaimantNomineeRelationshipCode | undefined>>
  agreed: boolean
  locale: 'hi' | 'en'
}): { ok: true; body: RecordMemberClaimContactRequest } | { ok: false; reason: 'incomplete' | 'agreement_required' } {
  const nominees = input.nominees.map((n) => ({ rank: n.rank, address: (input.addresses[n.rank] ?? '').trim() }))
  if (nominees.some((n) => n.address === '')) return { ok: false, reason: 'incomplete' }
  // With ⛔ no declared nominee there is nobody to be — the claimant is someone else.
  const claimant: ClaimantChoice = input.nominees.length === 0 ? { kind: 'someone_else' } : input.claimant
  if (claimant === null) return { ok: false, reason: 'incomplete' }
  if (claimant.kind === 'someone_else') {
    const b = { name: input.block.name.trim(), mobile: input.block.mobile.trim(), address: input.block.address.trim() }
    if (b.name === '' || b.mobile === '' || b.address === '') return { ok: false, reason: 'incomplete' }
    if (input.nominees.some((n) => !input.relationships[n.rank])) return { ok: false, reason: 'incomplete' }
    if (!input.agreed) return { ok: false, reason: 'agreement_required' }
    return {
      ok: true,
      body: {
        locale: input.locale,
        nominees: nominees.map((n) => ({ ...n, relationship: input.relationships[n.rank]! })),
        claimant: b,
        agreed: true,
      },
    }
  }
  if (!input.agreed) return { ok: false, reason: 'agreement_required' }
  return { ok: true, body: { locale: input.locale, nominees, claimantNomineeRank: claimant.rank, agreed: true } }
}
