// Concealment-clause resolver — Story 3.5 (Task 2/6; AC2, AC3, AC6).
//
// The concealment-denial acknowledgment's legal basis is the Niyamavali clause
// `niy.concealment.r14` (FR-11, R14-adapted: flag for State Trustee review, NEVER auto-deny).
// The consent's `consent_artifact_ref` resolves to this clause's `clause_version_id`, and the
// payload stores the EXACT acknowledged wording (`ack_text_en` / `ack_text_hi`) so Epic 4 has
// the provenance of what the member actually acknowledged.
//
// Symmetric with `ima-list.ts` (the catalog resolver): both wrap `niyamavali.resolveByClauseId`
// behind one validated seam so the handler never touches the opaque clause payload directly. A
// `null` return is the AC6 atomic-failure / GET-503 signal (the clause is unprovisioned for the
// Pariwar). `medical/` may import `niyamavali` accessors (both `@twt/domain`-internal — no cycle).

import { z } from 'zod';

import type { Db } from '../db.js';
import { type ClauseId, type ClauseVersionId, type PariwarId, clauseId } from '../ids/index.js';
import { resolveByClauseId } from '../niyamavali/read.js';

/** The stable clause id for the concealment-denial ack legal basis (→ `consent_artifact_ref`). */
export const CONCEALMENT_CLAUSE_ID: ClauseId = clauseId('niy.concealment.r14');

/**
 * The `niy.concealment.r14` payload shape this resolver consumes. `.passthrough()` tolerates the
 * structural `rule_code` / `title_en` / `never_auto_deny` / `provisional` keys the seed carries
 * (the registry payload is opaque to the niyamavali layer; this resolver validates only the ack
 * text it needs). Both locales are required so the screen + consent record always have the copy.
 */
export const ConcealmentPayloadSchema = z
  .object({
    ack_text_en: z.string().min(1),
    ack_text_hi: z.string().min(1),
  })
  .passthrough();
export type ConcealmentPayload = z.output<typeof ConcealmentPayloadSchema>;

/** The resolved concealment clause: the version acknowledged + the bilingual ack copy. */
export interface ResolvedConcealmentClause {
  clauseVersionId: ClauseVersionId;
  ackTextEn: string;
  ackTextHi: string;
}

/**
 * Resolve the current non-deprecated effective `niy.concealment.r14` clause for a Pariwar, parse
 * + validate its ack-text payload, and return the `clause_version_id` (recorded as the consent's
 * `consent_artifact_ref` + on the disclosure row) plus both ack-text locales. Returns `null` when
 * the clause is not resolvable (the registry is unprovisioned) — the caller turns that into the
 * AC6 atomic failure (submit 409) / the GET 503 (Task 6).
 *
 * Tenant-scoped: the caller has set `app.pariwar_id` (RLS) AND passes `pariwarId` explicitly.
 */
export async function resolveConcealmentClause(
  db: Db,
  pariwarId: PariwarId,
): Promise<ResolvedConcealmentClause | null> {
  const row = await resolveByClauseId(db, pariwarId, CONCEALMENT_CLAUSE_ID);
  if (!row) return null;
  const parsed = ConcealmentPayloadSchema.safeParse(row.payload);
  if (!parsed.success) return null;
  return {
    clauseVersionId: row.clauseVersionId,
    ackTextEn: parsed.data.ack_text_en,
    ackTextHi: parsed.data.ack_text_hi,
  };
}

/** Pick the ack text for a locale from a resolved concealment clause. */
export function ackTextForLocale(
  clause: ResolvedConcealmentClause,
  locale: 'en' | 'hi',
): string {
  return locale === 'hi' ? clause.ackTextHi : clause.ackTextEn;
}
