// The shared per-pool IDENTITY resolver (Story 8.6 D6; extracted here by Story 8.7, Task 3).
//
// "The ONE place this join lives" — the deceased family's first-name + last-initial (PII-shielded; the
// family the pool supports, NOT the nominee) + the member-facing letter code + the curated Mahabharata
// name, so a pool renders IDENTICALLY everywhere it appears. Story 8.6 introduced it with two
// consumers (the My Pool card + the Yogdaan Bahi passbook); Story 8.7 adds the third (the Contribution
// Note PDF), and a divergence between a passbook row and its own Note would read to Sushil as a
// forgery — so the resolver moved out of `handlers.ts` into its own module rather than being reached
// through a circular import. The implementation is UNCHANGED from 8.6; only its home moved.

import { claim as claimDomain, ids, kyc as kycDomain, pool as poolDomain, type Db } from '@twt/domain';
import type { FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import { decryptKycField } from '../kyc/kyc-crypto.js';
import { splitFirstNameLastInitial } from './name.js';

/** The per-pool identity INPUT the shared resolver needs (from the card's chosen pool, or a history
 *  row's pool context) — everything EXCEPT the deceased-family name, which the resolver decrypts here.
 *  Excludes the card's member-specific self-state (`attested`/`myContribution`): that is per-member,
 *  not per-pool. */
export interface PoolIdentityInput {
  readonly claimCaseId: ReturnType<typeof ids.claimId>;
  readonly poolIndex: number;
  readonly poolCanonicalIdentifier: string;
  /** The SNAPSHOTTED `pools.fixed_amount` (whole INR; echoed through unchanged — never recomputed). */
  readonly fixedAmount: number;
  /** N — the number of pools in the cycle (the curated-name `reserveNames` count). */
  readonly poolCount: number;
}

/** The resolved per-pool identity — card-identical family/letter/name for a pool (D6). */
export interface ResolvedPoolIdentity {
  readonly deceasedFirstName: string;
  readonly deceasedLastInitial: string;
  readonly poolLetterCode: string;
  readonly poolName: string | null;
  readonly poolCanonicalIdentifier: string;
  readonly fixedAmount: number;
}

/**
 * Resolve a pool's member-facing IDENTITY (D6) — the deceased family's first-name + last-initial
 * (PII-shielded, AC2 — the family the pool supports, NOT the nominee) + the letter code + the curated
 * Mahabharata name (else null → letter-code fallback). Consumed by the My Pool card, the Yogdaan Bahi
 * handler and the Contribution Note resolver, so a pool renders identically in all three. Decrypts the
 * claim's deceased-member KYC name at the member-session layer (D11 — NOT the admin path). Returns
 * `null` when the claim / KYC profile / name is unresolvable.
 *
 * NOTE the differing consequence per consumer: the card and the passbook treat `null` as "omit"
 * (fail-soft); the Contribution Note treats it as a 404, because a Note with a blank family name is a
 * DEFECTIVE ARTIFACT rather than a shortened list (Story 8.7 D6). The resolver reports absence the
 * same way to all three; the caller decides what absence means.
 */
export async function resolvePoolIdentity(
  deps: AppDeps,
  tx: Db,
  request: FastifyRequest,
  pariwarId: ReturnType<typeof ids.pariwarId>,
  input: PoolIdentityInput,
): Promise<ResolvedPoolIdentity | null> {
  const claimCase = await claimDomain.getClaimCase(tx, pariwarId, input.claimCaseId);
  if (!claimCase) return null;
  const kycProfile = await kycDomain.getMemberKycProfile(tx, pariwarId, claimCase.deceasedMemberId);
  if (!kycProfile || kycProfile.nameCiphertext === null) return null;
  // A branded PariwarId IS a string (brand is compile-time only) — the KYC decrypt context keys on it.
  // A decrypt failure (bad ciphertext, transient KMS error) must degrade the SAME way as an unresolvable
  // profile — skip THIS pool's identity, not propagate out (the `resolveContributorList` precedent):
  // for the history handler, letting this throw would blank the ENTIRE passbook via the outer fail-soft
  // catch instead of omitting just the rows for this one pool.
  let fullName: string;
  try {
    fullName = await decryptKycField(kycProfile.nameCiphertext, pariwarId, deps.encryption);
  } catch (err) {
    request.log.warn({ err, claimCaseId: input.claimCaseId }, 'pool-identity: deceased name decrypt failed — omitting');
    return null;
  }
  const { firstName, lastInitial } = splitFirstNameLastInitial(fullName);
  if (firstName === '') return null; // an unresolvable name — fail-soft (no undignified blank)

  const poolLetterCode = poolDomain.poolLetterCode(input.poolIndex);
  const poolName = await resolveCuratedPoolName(tx, pariwarId, input.poolCount, input.poolIndex, request);

  return {
    deceasedFirstName: firstName,
    deceasedLastInitial: lastInitial,
    poolLetterCode,
    poolName,
    poolCanonicalIdentifier: input.poolCanonicalIdentifier,
    fixedAmount: input.fixedAmount,
  };
}

/**
 * The curated Mahabharata-rooted pool name for THIS pool, or `null` (→ the letter-code fallback). The
 * name is NOT stored per pool (Story 7.2 `names.ts`: `pools` has no name column); it is re-derived by
 * reserving the cycle's N names in position order and indexing by the pool's ordering. Returns:
 *   · `null`   — the Pariwar opted OUT (empty registry — TWT-Bihar launch → letter code everywhere), or
 *                the registry is under-configured (exhaustion) / any read error → letter-code fallback.
 *   · a name   — the position-ordered curated name for `poolIndex`.
 *
 * Locale note (documented seam): the reservation carries both locales, but this read layer has no
 * viewer locale (requestContext exposes none), so it returns the Hindi-primary name (Hindi-first
 * product). Full bilingual name-by-locale resolution is deferred until a tenant actually configures
 * the registry — a seam, not a launch gap (the launch value is `null`). Its own try/catch so a config
 * gap degrades to the letter code WITHOUT suppressing the whole card.
 */
export async function resolveCuratedPoolName(
  tx: Db,
  pariwarId: ReturnType<typeof ids.pariwarId>,
  poolCount: number,
  poolIndex: number,
  request: FastifyRequest,
): Promise<string | null> {
  try {
    const names = await poolDomain.reserveNames(tx, { pariwarId, count: poolCount });
    if (names.length === 0) return null; // opted out — letter code (the committed launch behavior)
    const reserved = names[poolIndex];
    return reserved ? reserved.displayNameHi : null;
  } catch (err) {
    if (err instanceof poolDomain.PoolNameListExhaustedError) {
      // A trustee CONFIGURATION GAP (names.ts), not a benign opt-out — surface it loudly so it can be
      // acted on, while still degrading THIS card to the letter code rather than suppressing it.
      request.log.error({ err }, 'active-contribution: pool-name registry exhausted — trustee must extend the curated list');
      return null;
    }
    request.log.warn({ err }, 'active-contribution: pool-name registry unresolved — letter-code fallback');
    return null;
  }
}

/**
 * The member-facing cycle reference (Story 8.6 AC1) — the cycle's freeze MONTH, `YYYY-MM` (Gregorian +
 * Latin, the operational-numeral discipline). Letter codes repeat across cycles ("every cycle has a
 * Pool A"), so this disambiguates which cycle a row (or a Note) belongs to. UTC so it is deterministic
 * (no viewer-tz drift).
 */
export function cycleRefFromCommittedAt(committedAt: Date): string {
  const year = committedAt.getUTCFullYear().toString().padStart(4, '0');
  const month = (committedAt.getUTCMonth() + 1).toString().padStart(2, '0');
  return `${year}-${month}`;
}
