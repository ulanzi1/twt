// Consent registry read accessors — Story 2.7 (Task 2; AC2, AC3, AC4).
//
// All reads are tenant-scoped: the caller sets `app.pariwar_id` (RLS) AND passes
// `pariwarId` explicitly — the explicit predicate matches the
// `(pariwar_id, subject_id, consent_type)` index and is cross-tenant
// defense-in-depth. Mirrors the `terms-and-conditions/read.ts` module shape
// (read / write / errors / index split).

import { and, desc, eq, gt, isNull, lte, or, sql } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { ConsentId, PariwarId } from '../ids/index.js';
import {
  type ConsentRecordRow,
  type ConsentType,
  consentRecords,
} from '../schema/consent_records.js';

/**
 * The canonical registry query (epics.md L1555: "did this member have valid X
 * consent at time Y?"). Returns a boolean — TRUE iff the subject has a consent of
 * `consentType` whose validity window contains `validAt`:
 *   `granted_at <= validAt AND (revoked_at IS NULL OR validAt < revoked_at)`.
 *
 * `validAt` defaults to DB `now()` (NOT an app-server clock — §1.11 DB-authoritative
 * time), exactly like `getEffectiveTc`. Because there is NO unique constraint on
 * `(subject_id, consent_type)`, grant→revoke→re-grant produces multiple rows over
 * time; the window predicate resolves whichever ONE is valid at `validAt` (and the
 * existence of any such row is all this boolean needs — `LIMIT 1`).
 *
 * This is exactly why revoke must NOT delete: a deleted row would make a
 * pre-revocation `consentExists(..., pastTimestamp)` wrongly return false (AC3
 * requires it return true).
 */
export async function consentExists(
  db: Db,
  pariwarId: PariwarId,
  subjectId: string,
  consentType: ConsentType,
  validAt?: Date,
): Promise<boolean> {
  // Default to DB now() when no explicit instant is supplied (DB-authoritative) —
  // identical predicate construction to getEffectiveTc.
  const lowerBound =
    validAt === undefined
      ? sql`${consentRecords.grantedAt} <= now()`
      : lte(consentRecords.grantedAt, validAt);
  const upperBound =
    validAt === undefined
      ? sql`(${consentRecords.revokedAt} IS NULL OR now() < ${consentRecords.revokedAt})`
      : or(isNull(consentRecords.revokedAt), gt(consentRecords.revokedAt, validAt));

  const rows = await db
    .select({ one: sql`1` })
    .from(consentRecords)
    .where(
      and(
        eq(consentRecords.pariwarId, pariwarId),
        eq(consentRecords.subjectId, subjectId),
        eq(consentRecords.consentType, consentType),
        lowerBound,
        upperBound,
      ),
    )
    .limit(1);
  return rows.length > 0;
}

export interface ListConsentsOptions {
  /** Filter to a single consent type. */
  consentType?: ConsentType;
  /**
   * Include rows that have been revoked (`revoked_at` set). Default false — only
   * currently-valid (never-revoked) rows are returned. Note: this is a coarse
   * "has it ever been revoked" filter, distinct from the point-in-time window
   * `consentExists` evaluates.
   */
  includeRevoked?: boolean;
  /** Story 1.14 forced-pagination ceiling (default 50, hard cap 200). */
  limit?: number;
}

/**
 * Story 1.14 forced-pagination list of a subject's consents within a Pariwar,
 * newest `granted_at` first, with an optional `consentType` filter and an optional
 * `includeRevoked` toggle. (No trustee read endpoint ships in 2.7 — this is the
 * audit/test read + the substrate Epic 3/admin will consume.)
 */
export async function listConsents(
  db: Db,
  pariwarId: PariwarId,
  subjectId: string,
  opts: ListConsentsOptions = {},
): Promise<ConsentRecordRow[]> {
  const filters = [
    eq(consentRecords.pariwarId, pariwarId),
    eq(consentRecords.subjectId, subjectId),
  ];
  if (opts.consentType !== undefined) {
    filters.push(eq(consentRecords.consentType, opts.consentType));
  }
  if (opts.includeRevoked !== true) {
    filters.push(isNull(consentRecords.revokedAt));
  }

  return db
    .select()
    .from(consentRecords)
    .where(and(...filters))
    .orderBy(desc(consentRecords.grantedAt))
    .limit(Math.max(1, Math.min(opts.limit ?? 50, 200)));
}

/**
 * Resolve a single consent record by its `consent_id` within a Pariwar — backs the
 * `revokeConsent` guard (mirror `resolveByTcVersionId`). Takes an explicit
 * `pariwarId` for defense-in-depth alongside RLS. Returns null when no such row
 * exists for the Pariwar. The row is returned REGARDLESS of revoked state (the
 * revoke guard inspects `revoked_at` to reject a double-revoke).
 */
export async function resolveConsentById(
  db: Db,
  pariwarId: PariwarId,
  consentId: ConsentId,
): Promise<ConsentRecordRow | null> {
  const rows = await db
    .select()
    .from(consentRecords)
    .where(
      and(
        eq(consentRecords.pariwarId, pariwarId),
        eq(consentRecords.consentId, consentId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}
