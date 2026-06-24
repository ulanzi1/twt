// Consent registry write path — Story 2.7 (Task 2; AC2, AC3, AC4).
//
// recordConsent (grant) / revokeConsent (mutate, never delete). Mirrors
// `terms-and-conditions/write.ts`: NO HTTP, NO auth, NO audit-or-throw orchestration
// (those are the CONSUMER route's job — Epic 3 signup / Epic 6 claim). The typed
// errors are the transport seams.
//
// ── Transaction contract ─────────────────────────────────────────────────────
// These accessors run their statements DIRECTLY on the passed `db` and do NOT open
// their own transaction. RLS scope (`SET LOCAL app.pariwar_id`) is
// transaction-scoped, so any scoped caller is already inside a transaction —
// `withPariwarScope` opens it on the consumer route path; the per-test harness
// opens it in tests.
//
// ── Audit linkage is a CONSUMER obligation (why these accept a caller id) ──────
// The `audit_id` / `revoked_audit_id` FKs point at the Story 1.10 hash chain. The
// audit-or-throw orchestration — write the audit line FIRST (it needs the actor
// session), then thread its id in, throw → scope tx rolls back → no consent without
// an audit line — is the CONSUMER route's job. 2.7 has no route/session, so these
// accessors merely ACCEPT a caller-supplied `auditId` / `revokedAuditId` (mirror
// `createTcVersion`'s caller-supplied `auditId`). The domain tests pass `null`.
// ⚠ Epic 3/6 MUST write the audit line first and thread the id, or the row carries
// `audit_id = NULL` (a compliance gap the FK alone cannot force).

import { and, eq, isNull, sql } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { ConsentId, PariwarId } from '../ids/index.js';
import {
  type ConsentGrantedVia,
  type ConsentPayload,
  type ConsentRecordRow,
  type ConsentType,
  consentRecords,
} from '../schema/consent_records.js';
import { ConsentNotFoundError, ConsentStateError } from './errors.js';
import { resolveConsentById } from './read.js';

// ── recordConsent (AC2, AC4) ─────────────────────────────────────────────────

export interface RecordConsentInput {
  pariwarId: PariwarId;
  /** The member-or-pre-member-applicant id (polymorphic — see the schema header). */
  subjectId: string;
  consentType: ConsentType;
  /**
   * The specific artifact version consented to (e.g. a `tc_version_id`). Omit for
   * consents with no versioned artifact (such as `marketing`).
   */
  consentArtifactRef?: string | null;
  grantedViaActor: ConsentGrantedVia;
  /** Operational context (checkbox text shown, locale, IP, user-agent). */
  consentPayload: ConsentPayload;
  /**
   * The grant-transition audit line id, written FIRST by the consumer route (mirror
   * `createTcVersion`'s caller-supplied `auditId`). Null at the domain level (2.7
   * has no actor session — see the module header).
   */
  auditId?: string | null;
  /**
   * Optional caller-supplied row address (defaults to DB gen_random_uuid()). The
   * audit-or-throw path PRE-GENERATES this so the audit line — written FIRST —
   * references the exact `consent_id` in its provenance (mirror `createTcVersion`).
   */
  consentId?: ConsentId;
  /** DB-authoritative grant instant override (defaults to DB now()). */
  grantedAt?: Date;
}

/**
 * Record a consent grant (AC2): inserts ONE new row. `granted_at` defaults to DB
 * `now()` (§1.11 DB-authoritative) unless overridden. A NEW `consent_id` is minted
 * per grant — re-recording after a revoke is a fresh row by design (AC3; there is no
 * unique constraint on `(subject_id, consent_type)`). Returns the inserted row.
 */
export async function recordConsent(
  db: Db,
  input: RecordConsentInput,
): Promise<ConsentRecordRow> {
  const inserted = await db
    .insert(consentRecords)
    .values({
      consentId: input.consentId ?? undefined,
      subjectId: input.subjectId,
      pariwarId: input.pariwarId,
      consentType: input.consentType,
      consentArtifactRef: input.consentArtifactRef ?? null,
      grantedAt: input.grantedAt ?? undefined,
      grantedViaActor: input.grantedViaActor,
      consentPayload: input.consentPayload,
      auditId: input.auditId ?? null,
    })
    .returning();
  const row = inserted[0];
  if (!row) {
    throw new Error('[recordConsent] insert returned no row — check session scope');
  }
  return row;
}

// ── revokeConsent (AC2, AC3) ─────────────────────────────────────────────────

export interface RevokeConsentInput {
  pariwarId: PariwarId;
  consentId: ConsentId;
  /** The caller-supplied reason for revocation (stored on the row). */
  reason: string;
  /**
   * The revoke-transition audit line id, written FIRST by the consumer route (its
   * OWN audit line, distinct from the grant `audit_id`). Null at the domain level.
   */
  revokedAuditId?: string | null;
  /** DB-authoritative revoke instant override (defaults to DB now()). */
  revokedAt?: Date;
}

/**
 * Revoke a consent (AC3): set `revoked_at` (DB `now()` default), `revocation_reason`,
 * and `revoked_audit_id` on the EXISTING row — the row is NEVER deleted (historical
 * proof preserved; a deleted row would corrupt the time-travel `consentExists`
 * query). Guards:
 *   · `ConsentNotFoundError` if no row with `consent_id` exists for the Pariwar.
 *   · `ConsentStateError` if the row is already revoked (`revoked_at` set) —
 *     double-revoke is an illegal transition.
 * Returns the mutated row.
 *
 * The UPDATE WHERE clause includes `isNull(revokedAt)` so that a concurrent
 * revocation that commits between our SELECT and UPDATE produces 0 rows instead of
 * silently overwriting the first reason. If 0 rows are returned we re-read to
 * surface the correct typed error (ConsentStateError on concurrent revoke, or
 * ConsentNotFoundError if the row vanished — impossible under current grants but
 * handled defensively).
 */
export async function revokeConsent(
  db: Db,
  input: RevokeConsentInput,
): Promise<ConsentRecordRow> {
  const current = await resolveConsentById(db, input.pariwarId, input.consentId);
  if (!current) {
    throw new ConsentNotFoundError(input.pariwarId, input.consentId);
  }
  if (current.revokedAt !== null) {
    throw new ConsentStateError(input.consentId, 'consent is already revoked');
  }

  const updated = await db
    .update(consentRecords)
    .set({
      revokedAt: input.revokedAt ?? sql`now()`,
      revocationReason: input.reason,
      revokedAuditId: input.revokedAuditId ?? null,
    })
    .where(
      and(
        eq(consentRecords.pariwarId, input.pariwarId),
        eq(consentRecords.consentId, input.consentId),
        isNull(consentRecords.revokedAt),
      ),
    )
    .returning();
  const row = updated[0];
  if (!row) {
    // Zero rows updated despite the pre-check — a concurrent revokeConsent committed
    // first. Re-read to throw the correct typed error.
    const reloaded = await resolveConsentById(db, input.pariwarId, input.consentId);
    if (!reloaded) {
      throw new ConsentNotFoundError(input.pariwarId, input.consentId);
    }
    throw new ConsentStateError(input.consentId, 'consent is already revoked');
  }
  return row;
}
