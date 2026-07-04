// The AR-65 admin member-search read accessor — Story 4.7 (Task 1 + Task 2; AC1).
//
// The scope-respecting admin member-search over the `member_search_projection` compound read model. It
// resolves a page of results in ONE query (no per-result fan-out — the N+1 anti-pattern architecture.md
// :3919-3926 flags, the reason AR-65 exists). The projection carries the non-PII sections (state +
// nominee summary + the D2 sentinels); this accessor LEFT-JOINs the encrypted identity columns from
// `member_identities` (mobile) + `member_kyc_profiles` (name / masked-Aadhaar / verification) AS STORED
// — the handler decrypts them (the `getMemberNominees` "returns ciphertext as-stored; the route maps/
// decrypts" precedent). A transport-free PRIMITIVE: NO HTTP, NO audit, NO decryption, NO permission
// check — the apps/api boundary orchestrates those.
//
// ── Search keys (D3-A CONFIRMED — exact-match ONLY) ─────────────────────────────────────────────────
// v1 search = `mobile` (via the existing `member_identities.mobile_blind_index` deterministic HMAC) +
// `member_id` + `pariwar_id` (the plaintext scope key). Blind-index search is EXACT-MATCH ONLY —
// prefix/fuzzy/partial is out of scope by construction (a full-value HMAC cannot do prefix). The blind
// index is computed at the apps/api boundary (the login path's `mobileBlindIndex` helper) and passed in
// here — the domain accessor never sees the plaintext mobile. Name + Aadhaar-as-search-key are DEFERRED
// (they need deterministic blind indexes + a migration + backfill — separate stories, D3); "Aadhaar
// masked" is a DISPLAY field here (the panel identity section), not a v1 search key.
//
// ── Scope (AC1 scope-respecting) ────────────────────────────────────────────────────────────────────
// Every read is scoped by `pariwar_id` — RLS (the caller set `app.pariwar_id`) PLUS an explicit
// predicate (defense-in-depth, the member-nominees-read precedent). A cross-Pariwar search returns
// nothing. The apps/api boundary additionally gates on the `member.view_validity` permission (fail-
// closed) before calling this.

import { and, asc, eq } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { MemberId, PariwarId } from '../ids/index.js';
import { memberIdentities } from '../schema/member_identities.js';
import { memberKycProfiles, type MemberKycVerificationStrength } from '../schema/member_kyc_profiles.js';
import {
  memberSearchProjection,
  type NomineeSummaryEntry,
  type ProducerUnavailableSection,
} from '../schema/member_search_projection.js';
import type { MemberLifecycleState } from './state.js';

/** The exact-match search criteria (D3-A). Exactly one dimension; prefix/fuzzy is out of scope. */
export type MemberSearchCriteria =
  | { by: 'memberId'; memberId: MemberId }
  | { by: 'mobileBlindIndex'; mobileBlindIndex: string }
  | { by: 'pariwar' };

export interface SearchMembersInput {
  pariwarId: PariwarId;
  criteria: MemberSearchCriteria;
  /** Page size (the `pariwar` browse case can be large); clamped by the caller. Default 50. */
  limit?: number;
  offset?: number;
}

/**
 * One admin member-search result. The projection's non-PII sections PLUS the encrypted identity columns
 * AS STORED (nullable — a member may have no identity/KYC row yet). The handler decrypts
 * `mobileCiphertext` / `nameCiphertext` for display and maps `aadhaarMaskedId` straight through (it is
 * already masked to last-4 at the provider boundary — Tier-3, a display field).
 */
export interface MemberSearchResultRow {
  memberId: MemberId;
  pariwarId: PariwarId;
  state: MemberLifecycleState;
  stateEventVersion: number;
  nomineeSummary: NomineeSummaryEntry[];
  contributionSection: ProducerUnavailableSection;
  claimSection: ProducerUnavailableSection;
  /** Tier-1 envelope ciphertext of the mobile (from member_identities); null when no identity row. */
  mobileCiphertext: string | null;
  /** Tier-1 envelope ciphertext of the KYC name; null when no KYC profile yet. */
  nameCiphertext: string | null;
  /** Tier-3 masked Aadhaar last-4 (display field, not a search key); null when none. */
  aadhaarMaskedId: string | null;
  verificationStrength: MemberKycVerificationStrength | null;
}

const DEFAULT_LIMIT = 50;

/**
 * Resolve a page of admin member-search results in ONE query. Scope is enforced by RLS + the explicit
 * `pariwar_id` predicate; the two identity tables are LEFT-JOINed so a member with no KYC/identity row
 * still returns (with null identity fields) rather than being dropped. Ordered by `member_id` for a
 * stable, replay-deterministic page.
 */
export async function searchMembers(
  db: Db,
  input: SearchMembersInput,
): Promise<MemberSearchResultRow[]> {
  const scope = eq(memberSearchProjection.pariwarId, input.pariwarId);
  const where =
    input.criteria.by === 'memberId'
      ? and(scope, eq(memberSearchProjection.memberId, input.criteria.memberId))
      : input.criteria.by === 'mobileBlindIndex'
        ? and(scope, eq(memberIdentities.mobileBlindIndex, input.criteria.mobileBlindIndex))
        : scope;

  const rows = await db
    .select({
      memberId: memberSearchProjection.memberId,
      pariwarId: memberSearchProjection.pariwarId,
      state: memberSearchProjection.state,
      stateEventVersion: memberSearchProjection.stateEventVersion,
      nomineeSummary: memberSearchProjection.nomineeSummary,
      contributionSection: memberSearchProjection.contributionSection,
      claimSection: memberSearchProjection.claimSection,
      mobileCiphertext: memberIdentities.mobileCiphertext,
      nameCiphertext: memberKycProfiles.nameCiphertext,
      aadhaarMaskedId: memberKycProfiles.aadhaarMaskedId,
      verificationStrength: memberKycProfiles.verificationStrength,
    })
    .from(memberSearchProjection)
    .leftJoin(memberIdentities, eq(memberIdentities.memberId, memberSearchProjection.memberId))
    .leftJoin(memberKycProfiles, eq(memberKycProfiles.memberId, memberSearchProjection.memberId))
    .where(where)
    .orderBy(asc(memberSearchProjection.memberId))
    .limit(input.limit ?? DEFAULT_LIMIT)
    .offset(input.offset ?? 0);

  return rows as MemberSearchResultRow[];
}
