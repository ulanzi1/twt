// Branded ID types — Story 1.7 substantive landing (AC-5).
//
// Architecture §Naming patterns line 3700-3708: "branded types for cross-cutting
// domain IDs" so a `MemberId` can never be silently passed where a `ClaimId` is
// expected. "Branding mandatory on first PR for new IDs" (line 3706) is the
// discipline; the *enforcing* ESLint rule (`*Id` string types must be branded)
// is Story 1.16a — it is NOT built here. This file is the discipline's substrate:
// the canonical brand definitions + UUID-validating smart constructors.
//
// The brand is a compile-time-only phantom property (`__brand`). At runtime a
// `PariwarId` IS a plain string — the constructor merely validates UUID shape and
// returns the same value cast to the branded type. There is no runtime wrapper
// object, so branded IDs serialize/compare exactly like strings (safe for JSONB,
// pg uuid columns, Zod transport, and `===`).
//
// UUID validation reuses the single `UUID_REGEX` already defined (and now
// exported) in `../db.js` — the same matcher `setPariwarScope` guards on — so
// there is exactly one UUID-shape authority in @twt/domain (no re-declaration).
// The constructor lowercases before returning so branded IDs are always in the
// same canonical form as Postgres uuid-column output, keeping cache keys and
// invalidation keys consistent regardless of the caller's input casing.

import { UUID_REGEX } from '../db.js';

/**
 * Phantom-branded string. `Brand<'PariwarId'>` and `Brand<'MemberId'>` are
 * mutually non-assignable at the type level despite both being `string` at
 * runtime. The `__brand` property never exists on the value — it is a
 * type-system marker only.
 */
export type Brand<B extends string> = string & { readonly __brand: B };

/** Thrown when a branded-ID smart constructor receives a non-UUID string. */
export class InvalidBrandedIdError extends Error {
  constructor(
    public readonly brand: string,
    public readonly received: string,
  ) {
    super(`[ids] ${brand} must be a UUID; received ${JSON.stringify(received)}`);
    this.name = 'InvalidBrandedIdError';
  }
}

/**
 * Thrown when the `clauseId` smart constructor receives a string that does not
 * match the AC2 `niy.<section>.<clause>[.<subclause>]` slug format. Mirrors
 * `InvalidBrandedIdError` (brand + received for diagnostics) but is a DISTINCT
 * type — a `ClauseId` is the first branded id that is NOT a UUID (Story 2.3), so
 * the "must be a UUID" message would be misleading. The format authority is
 * `CLAUSE_ID_REGEX` below.
 */
export class InvalidClauseIdError extends Error {
  constructor(public readonly received: string) {
    super(
      `[ids] ClauseId must match niy.<section>.<clause>[.<subclause>] ` +
        `(lowercase kebab-with-dots); received ${JSON.stringify(received)}`,
    );
    this.name = 'InvalidClauseIdError';
  }
}

/**
 * Factory that produces a UUID-validating smart constructor for a given brand.
 * The returned function validates with the shared `UUID_REGEX` and throws
 * `InvalidBrandedIdError` on failure — a typed, defense-in-depth guard against an
 * upstream bug handing an attacker-controlled or malformed value into a domain ID
 * (mirrors the `setPariwarScope` posture). The value is NOT mutated (no
 * lowercasing) — Postgres normalises `uuid` columns on store; callers that need a
 * canonical form should normalise explicitly.
 */
function uuidBrand<B extends string>(brand: B): (value: string) => Brand<B> {
  return (value: string): Brand<B> => {
    if (!UUID_REGEX.test(value)) {
      throw new InvalidBrandedIdError(brand, value);
    }
    return value.toLowerCase() as Brand<B>;
  };
}

// ── Cross-cutting domain IDs (architecture §Naming patterns line 3700-3704) ──
// PariwarId is the one Story 1.7 substantively consumes (Passport PK + tenant
// key); the rest are committed now as the established pattern so downstream
// per-Epic Stories (members 3.x, claims 6.x, pools 7.x, alerts 8.x,
// contributions 9.x) import the brand rather than re-declaring it.

export type PariwarId = Brand<'PariwarId'>;
export type MemberId = Brand<'MemberId'>;
export type ClaimId = Brand<'ClaimId'>;
export type PoolId = Brand<'PoolId'>;
export type AlertId = Brand<'AlertId'>;
export type ContributionId = Brand<'ContributionId'>;
/**
 * The global identity id (Story 1.9, §3.13). Keyed to the human, NOT a Pariwar —
 * a person can admin multiple Pariwars (the `role_grants (user_id, pariwar_id,
 * role)` join carries the tenancy). Branding is mandatory on a new ID's first PR
 * (§Naming L3706); this is that PR for `UserId`.
 */
export type UserId = Brand<'UserId'>;

/** Smart constructor: validates UUID shape, returns a branded `PariwarId`. */
export const pariwarId = uuidBrand('PariwarId');
/** Smart constructor: validates UUID shape, returns a branded `MemberId`. */
export const memberId = uuidBrand('MemberId');
/** Smart constructor: validates UUID shape, returns a branded `ClaimId`. */
export const claimId = uuidBrand('ClaimId');
/** Smart constructor: validates UUID shape, returns a branded `PoolId`. */
export const poolId = uuidBrand('PoolId');
/** Smart constructor: validates UUID shape, returns a branded `AlertId`. */
export const alertId = uuidBrand('AlertId');
/** Smart constructor: validates UUID shape, returns a branded `ContributionId`. */
export const contributionId = uuidBrand('ContributionId');
/** Smart constructor: validates UUID shape, returns a branded `UserId`. */
export const userId = uuidBrand('UserId');

// ── Niyamavali rule-registry IDs (Story 2.3, AC1/AC2/AC7) ────────────────────
// Two NEW branded ids land here per the §Naming "branding mandatory on a new
// ID's first PR" discipline (L3700-3708): `ClauseVersionId` (a UUID row address)
// and `ClauseId` (the FIRST non-UUID branded id in the codebase — a stable,
// trustee-allocated, human-readable slug that survives amendment/version history).

/**
 * Per-row address of a clause version (`clause_versions.clause_version_id`). It
 * IS a UUID, so it reuses the shared `uuidBrand` validator — unlike `ClauseId`.
 */
export type ClauseVersionId = Brand<'ClauseVersionId'>;
/** Smart constructor: validates UUID shape, returns a branded `ClauseVersionId`. */
export const clauseVersionId = uuidBrand('ClauseVersionId');

/**
 * The stable, human-readable clause identifier (AC2). NOT a UUID — it is the
 * `niy.<section>.<clause>[.<subclause>]` slug, allocated by the trustee at
 * clause-create time (AC3), immutable across amendment / deprecation / version
 * increment, and never reused. Because it is not a UUID it has a bespoke
 * format-validating constructor (`clauseId` below), not `uuidBrand`.
 */
export type ClauseId = Brand<'ClauseId'>;

/**
 * AC2 format authority for `ClauseId`: `niy.<section-slug>.<clause-slug>` with an
 * OPTIONAL `.<subclause-slug>`. Each slug segment is lowercase kebab —
 * `[a-z0-9]+` groups joined by single hyphens (no leading/trailing/double
 * hyphen, no uppercase). Examples: `niy.contribution-discipline.r7-a`,
 * `niy.ninety-percent-rule.r8`, `niy.special-death.r9-suicide-murder`.
 *
 * Exported so the transport contract (`@twt/contracts` `ClauseIdSchema`) imports
 * the SAME pattern rather than re-declaring it — one regex authority, no drift
 * (contracts → domain is the legal import direction).
 */
export const CLAUSE_ID_REGEX =
  /^niy\.[a-z0-9]+(?:-[a-z0-9]+)*\.[a-z0-9]+(?:-[a-z0-9]+)*(?:\.[a-z0-9]+(?:-[a-z0-9]+)*)?$/;

/**
 * Smart constructor: validates the AC2 slug format, returns a branded `ClauseId`.
 * Throws `InvalidClauseIdError` (typed, mirrors `InvalidBrandedIdError`) on a
 * malformed slug. The value is returned UNCHANGED — the regex already constrains
 * it to lowercase, so no normalisation is applied (AC2: the slug is lowercase by
 * construction).
 */
export function clauseId(value: string): ClauseId {
  if (!CLAUSE_ID_REGEX.test(value)) {
    throw new InvalidClauseIdError(value);
  }
  return value as ClauseId;
}

// ── Niyamavali draft-store id (Story 2.4, Task 1) ────────────────────────────
// The server-persisted draft row address (`clause_drafts.draft_id`). A UUID row
// address (unlike `ClauseId`), so it reuses the shared `uuidBrand` validator. The
// draft store is the central net-new design of Story 2.4 (ADR-0021): a clause's
// pending content lives here until publish mints the immutable `clause_versions`
// row — the non-author reviewer loads the draft by this id.

/** Per-row address of a Niyamavali clause draft (`clause_drafts.draft_id`). */
export type ClauseDraftId = Brand<'ClauseDraftId'>;
/** Smart constructor: validates UUID shape, returns a branded `ClauseDraftId`. */
export const clauseDraftId = uuidBrand('ClauseDraftId');
