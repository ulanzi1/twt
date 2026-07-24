// The shared per-pool IDENTITY resolver — Story 8.6 (D6) / extracted by 8.7; RELOCATED here by 8.8.
//
// "The ONE place this join lives" — the deceased family's first-name + last-initial (PII-shielded; the
// family the pool supports, NOT the nominee) + the member-facing letter code + the curated Mahabharata
// name, so a pool renders IDENTICALLY everywhere it appears. Story 8.6 introduced it for the My Pool
// card + the Yogdaan Bahi passbook; 8.7 added the Contribution Note PDF; Story 8.8 adds the FOURTH
// consumer — the cycle-open push/WA/SMS copy — and that consumer runs in `apps/jobs`, which cannot
// import `apps/api`.
//
// A divergence between the push a member receives and the card they open would read to Sushil as two
// different pools, so the resolver moves to `@twt/domain` rather than being duplicated by value.
// `apps/api/src/modules/member-pool/pool-identity.ts` keeps its exact exported signature and delegates
// here, so no apps/api call site changed. The implementation is UNCHANGED from 8.6/8.7 apart from the
// logger becoming an injected `onWarn`/`onError` sink (apps/api passes `request.log`; apps/jobs passes
// a console alarm) — the domain layer owns no Fastify types.

import * as claimDomain from '../claim/index.js';
import type { Db } from '../db.js';
import type { FieldCryptoDeps } from '../encryption/field-classes.js';
import { decryptKycField } from '../encryption/member-fields.js';
import type { ClaimId, PariwarId } from '../ids/index.js';
import * as kycDomain from '../kyc/index.js';
import { splitFirstNameLastInitial } from '../kyc/name.js';
import * as poolDomain from '../pool/index.js';

/** The per-pool identity INPUT the resolver needs — everything EXCEPT the deceased-family name, which
 *  the resolver decrypts here. Excludes any per-MEMBER self-state (that is not per-pool). */
export interface PoolIdentityInput {
  readonly claimCaseId: ClaimId;
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

/** The injected diagnostic sink — apps/api passes `request.log`-backed closures, apps/jobs a console
 *  alarm. Never receives a decrypted name (only the error + the claim id). */
export interface PoolIdentityLogSink {
  readonly warn: (message: string, err: unknown, claimCaseId: string) => void;
  readonly error: (message: string, err: unknown, claimCaseId: string) => void;
}

/** The default sink — stderr. Callers with a real logger pass their own. */
const consoleSink: PoolIdentityLogSink = {
  warn: (message, err, claimCaseId) =>
    console.warn(`[pool-identity] ${message} (claim=${claimCaseId}):`, err),
  error: (message, err, claimCaseId) =>
    console.error(`[pool-identity] ${message} (claim=${claimCaseId}):`, err),
};

/**
 * Resolve a pool's member-facing IDENTITY (D6) — the deceased family's first-name + last-initial
 * (PII-shielded — the family the pool supports, NOT the nominee) + the letter code + the curated
 * Mahabharata name (else `null` → letter-code fallback). Decrypts the claim's deceased-member KYC name
 * under the caller's Tier-1 material. Returns `null` when the claim / KYC profile / name is
 * unresolvable.
 *
 * NOTE the differing consequence per consumer: the card and the passbook treat `null` as "omit"
 * (fail-soft); the Contribution Note treats it as a 404; the Story 8.8 cycle-open fan-out SKIPS the
 * pool's notification (a push naming no family is a defective artifact, and inventing a placeholder
 * name would be worse). The resolver reports absence the same way to all of them; the caller decides
 * what absence means.
 */
export async function resolvePoolIdentity(
  db: Db,
  encryption: FieldCryptoDeps,
  pariwarId: PariwarId,
  input: PoolIdentityInput,
  log: PoolIdentityLogSink = consoleSink,
): Promise<ResolvedPoolIdentity | null> {
  const claimCase = await claimDomain.getClaimCase(db, pariwarId, input.claimCaseId);
  if (!claimCase) return null;
  const kycProfile = await kycDomain.getMemberKycProfile(db, pariwarId, claimCase.deceasedMemberId);
  if (!kycProfile || kycProfile.nameCiphertext === null) return null;
  // A branded PariwarId IS a string (brand is compile-time only) — the KYC decrypt context keys on it.
  // A decrypt failure (bad ciphertext, transient KMS error) must degrade the SAME way as an
  // unresolvable profile — skip THIS pool's identity, never propagate out (letting it throw would
  // blank an entire passbook / abort an entire cycle's fan-out instead of omitting one pool).
  let fullName: string;
  try {
    fullName = await decryptKycField(kycProfile.nameCiphertext, pariwarId, encryption);
  } catch (err) {
    log.warn('deceased name decrypt failed — omitting', err, input.claimCaseId);
    return null;
  }
  const { firstName, lastInitial } = splitFirstNameLastInitial(fullName);
  if (firstName === '') return null; // an unresolvable name — fail-soft (no undignified blank)

  // `poolLetterCode` throws `PoolLetterCodeRangeError` for a negative/non-integer poolIndex — a data
  // defect, not something this resolver should propagate: every other unresolvable-input path here
  // (the KYC decrypt above, `resolveCuratedPoolName` below) degrades to skipping THIS pool rather than
  // failing the caller's whole batch.
  let poolLetterCode: string;
  try {
    poolLetterCode = poolDomain.poolLetterCode(input.poolIndex);
  } catch (err) {
    log.error('pool letter code unresolvable — omitting', err, input.claimCaseId);
    return null;
  }
  const poolName = await resolveCuratedPoolName(
    db,
    pariwarId,
    input.poolCount,
    input.poolIndex,
    log,
    input.claimCaseId,
  );

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
 * Locale note (documented seam, unchanged from 8.6): the reservation carries both locales, but this
 * read layer has no viewer locale, so it returns the Hindi-primary name (Hindi-first product). Full
 * bilingual name-by-locale resolution is deferred until a tenant actually configures the registry.
 * Its own try/catch so a config gap degrades to the letter code WITHOUT suppressing the whole surface.
 */
export async function resolveCuratedPoolName(
  db: Db,
  pariwarId: PariwarId,
  poolCount: number,
  poolIndex: number,
  log: PoolIdentityLogSink = consoleSink,
  claimCaseIdForLog = '-',
): Promise<string | null> {
  try {
    const names = await poolDomain.reserveNames(db, { pariwarId, count: poolCount });
    if (names.length === 0) return null; // opted out — letter code (the committed launch behavior)
    const reserved = names[poolIndex];
    return reserved ? reserved.displayNameHi : null;
  } catch (err) {
    if (err instanceof poolDomain.PoolNameListExhaustedError) {
      // A trustee CONFIGURATION GAP (names.ts), not a benign opt-out — surface it loudly so it can be
      // acted on, while still degrading THIS surface to the letter code rather than suppressing it.
      log.error(
        'pool-name registry exhausted — trustee must extend the curated list',
        err,
        claimCaseIdForLog,
      );
      return null;
    }
    log.warn('pool-name registry unresolved — letter-code fallback', err, claimCaseIdForLog);
    return null;
  }
}
