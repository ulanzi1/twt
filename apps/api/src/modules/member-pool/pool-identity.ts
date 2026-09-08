// The shared per-pool IDENTITY resolver (Story 8.6 D6; extracted here by Story 8.7, Task 3).
//
// "The ONE place this join lives" — the deceased family's name in the Pariwar's chosen form (the family
// the pool supports, NOT the nominee) + the member-facing letter code + the curated Mahabharata name,
// so a pool renders IDENTICALLY everywhere it appears. Story 8.6 introduced it with two
// consumers (the My Pool card + the Yogdaan Bahi passbook); Story 8.7 added the third (the Contribution
// Note PDF), and a divergence between a passbook row and its own Note would read to Sushil as a forgery.
//
// ── RELOCATED to @twt/domain by Story 8.8 (Task 1) — this is now a thin adapter ─────────────────────────
// Story 8.8 adds the FOURTH consumer: the cycle-open push/WA/SMS copy, whose payload AC1 requires to
// carry the letter code + curated name + the deceased family's resolved display name + fixed amount. That fan-out
// runs in `apps/jobs`, which cannot import `apps/api` (apps/api already depends on `@twt/jobs`, so the
// reverse edge is a turbo cycle). A push naming a DIFFERENT family than the card would be the same
// forgery-shaped divergence 8.7 moved this file to prevent — so the join moved down to
// `packages/domain/src/notifications/pool-identity.ts` rather than being duplicated by value.
//
// These wrappers bind the Fastify logger into the domain resolver's injected diagnostic sink (the
// domain layer owns no Fastify types).
//
// ⚠⛔ CORRECTED BY STORY 8.16 — this header used to say the wrappers "keep the exact apps/api
// signatures ... so no apps/api call site changed". THAT IS NO LONGER TRUE, and the correction matters:
// `resolvePoolIdentity` here GAINS the Pariwar's presentation `mode` and forwards it, and all three
// apps/api call sites pass it. It is NOT a pass-through.
//
// ⛔ AND IT COULD NOT HAVE STAYED ONE. `2026-09-02-181` cl.2 rules the mode an INPUT, never a DB read
// inside the resolver. If this wrapper had kept its old signature, the only way the mode could reach
// the domain resolver would be a read INSIDE this wrapper — the forbidden move, for three of the four
// consumers. So the parameter is threaded through deliberately, and each caller reads the mode ONCE
// PER REQUEST (the `public-pages` precedent: "RESOLVED ONCE PER REQUEST, NEVER PER ROW").

import { ids, kyc as kycDomain, notifications, type Db } from '@twt/domain';
import type { FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';

/** The per-pool identity INPUT the shared resolver needs (from the card's chosen pool, or a history
 *  row's pool context) — everything EXCEPT the deceased-family name, which the resolver decrypts.
 *  Excludes the card's member-specific self-state (`attested`/`myContribution`): that is per-member,
 *  not per-pool. */
export type PoolIdentityInput = notifications.PoolIdentityInput;

/** The resolved per-pool identity — card-identical family/letter/name for a pool (D6). */
export type ResolvedPoolIdentity = notifications.ResolvedPoolIdentity;

/**
 * Read the Pariwar's stored public-name presentation mode ONCE for a request, for handing to
 * `resolvePoolIdentity` (Story 8.16 AC2; `2026-09-02-181` cl.2).
 *
 * ⭐ THE READ BELONGS TO THE CALLER, and this is the seam that keeps it there. An absent config row
 * resolves to the RULED default `full_name` — deliberately NOT fail-closed, and no new default is
 * introduced (`2026-08-19-136` cl.1; `public-name.ts`).
 *
 * ⚠ NAMED "for a request" ON PURPOSE. Call it once per handler invocation and pass the value down —
 * NEVER per row and never per pool inside a loop. The mode is per-PARIWAR; a request serves exactly
 * one Pariwar, so a second read in the same request can only ever return the same answer.
 *
 * ⚠ THE SETTING'S SEMANTIC WIDENING, recorded here because this is where the member side reads it:
 * `public_name_presentation_mode` (table `pariwar_public_name_presentation`) now governs
 * MEMBER-FACING surfaces too, not just the public ones its name suggests. ⛔ It is NOT renamed
 * (`2026-09-02-181`) — a governed config table's rename is a migration AND a governance act, and the
 * setting's authority (`super_admin`) and scope (per-Pariwar) are both already correct.
 */
export async function resolvePoolNamePresentationModeForRequest(
  tx: Db,
  pariwarId: ReturnType<typeof ids.pariwarId>,
): Promise<kycDomain.PublicNamePresentationMode> {
  return kycDomain.resolvePublicNamePresentationMode(tx, pariwarId);
}

/** Bind the request logger into the domain resolver's diagnostic sink. Never carries a decrypted name. */
function requestLogSink(request: FastifyRequest): notifications.PoolIdentityLogSink {
  return {
    warn: (message, err, claimCaseId) => {
      request.log.warn({ err, claimCaseId }, `pool-identity: ${message}`);
    },
    error: (message, err, claimCaseId) => {
      request.log.error({ err, claimCaseId }, `pool-identity: ${message}`);
    },
  };
}

/**
 * Resolve a pool's member-facing IDENTITY (D6) — the deceased family's name in the Pariwar's chosen
 * form (the family the pool supports, NOT the nominee) + the letter code + the curated Mahabharata
 * name (else null → letter-code fallback). Consumed by the My Pool card, the Yogdaan Bahi handler and
 * the Contribution Note resolver, so a pool renders identically in all three. Decrypts the claim's
 * deceased-member KYC name at the member-session layer (D11 — NOT the admin path). Returns `null` when
 * the claim / KYC profile / name is unresolvable.
 *
 * NOTE the differing consequence per consumer: the card and the passbook treat `null` as "omit"
 * (fail-soft); the Contribution Note treats it as a 404, because a Note with a blank family name is a
 * DEFECTIVE ARTIFACT rather than a shortened list (Story 8.7 D6). The resolver reports absence the
 * same way to all three; the caller decides what absence means.
 *
 * @param mode the Pariwar's presentation mode from
 *   {@link resolvePoolNamePresentationModeForRequest}, read ONCE by the caller (Story 8.16 AC2).
 */
export async function resolvePoolIdentity(
  deps: AppDeps,
  tx: Db,
  request: FastifyRequest,
  pariwarId: ReturnType<typeof ids.pariwarId>,
  mode: kycDomain.PublicNamePresentationMode,
  input: PoolIdentityInput,
): Promise<ResolvedPoolIdentity | null> {
  return notifications.resolvePoolIdentity(
    tx,
    deps.encryption,
    pariwarId,
    mode,
    input,
    requestLogSink(request),
  );
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
 * the registry — a seam, not a launch gap (the launch value is `null`).
 */
export async function resolveCuratedPoolName(
  tx: Db,
  pariwarId: ReturnType<typeof ids.pariwarId>,
  poolCount: number,
  poolIndex: number,
  request: FastifyRequest,
): Promise<string | null> {
  return notifications.resolveCuratedPoolName(
    tx,
    pariwarId,
    poolCount,
    poolIndex,
    requestLogSink(request),
  );
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
