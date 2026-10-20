// The claimant's WhatsApp step — the STOP RECORDER (Story 6.37d, Task 7; AC7, AC8; WS10; I8; `-357` *"STOP … ends WhatsApp
// contact"*; the §3.4 proposal item 4 *"STOP is honoured and audit-logged"*).
//
// A STOP keyword received on a Pariwar's WhatsApp number records a claim-contact STOP for that number in the LADDER's hash space
// (`claim_contact_mobile` — the caller hashes it with the DOMAIN `normalizeMobile` + `correctionNumberHash`; ⛔ the member login
// index — T21), bound to that Pariwar ⇒ every claim of that Pariwar stops sending WhatsApp to that number (`skipped:stopped`). It
// is recorded WHETHER OR NOT the number has a member opt-in — the member's own path (revoke an ACTIVE opt-in) is the worker's,
// unchanged. ⛔ An un-stop path in v1 (disclosed).
// ⭐ AUDIT BEFORE WRITE — through `audit.withCompensatingAudit` ONLY (the intent line commits first; a failed write fires its
// `_rolled_back` line). ⚠ The access-wrapper gate does ⛔ cover this file (it matches only one call shape and ⛔ scans `apps/jobs`):
// this story's own source fence pins the helper here and ⛔ the raw writer. ⛔ PII in the audit line: ids only (the actor is null).

import { createHash, randomUUID } from 'node:crypto';

import { audit, claim as claimDomain, ids, withPariwarScope, type Db } from '@twt/domain';
import type pg from 'pg';

/** The audit action of a recorded claim-contact STOP. */
export const CLAIM_CONTACT_WA_STOPPED_ACTION = 'claim_contact.wa_stopped';

/**
 * Record ONE claim-contact STOP (idempotent on the inbound event — a replay is a no-op, ⛔ a second audit line). Returns
 * `recorded` / `already` (this event's stop exists).
 */
export async function recordClaimContactWaStop(
  pool: pg.Pool,
  input: { readonly pariwarId: string; readonly recipientNumberHash: string; readonly inboundEventId: string },
): Promise<'recorded' | 'already'> {
  const pariwarId = ids.pariwarId(input.pariwarId);
  // The idempotent no-op path is checked BEFORE the helper (ADR-0030 — once invoked, the helper always audits).
  const exists = await withPariwarScope(pool, pariwarId, async (_db: Db, client: pg.PoolClient) => {
    const { rows } = await client.query(`SELECT 1 FROM claim_contact_wa_stops WHERE pariwar_id = $1 AND inbound_event_id = $2`, [pariwarId, input.inboundEventId]);
    return rows.length > 0;
  });
  if (exists) return 'already';
  const stopId = randomUUID();
  const recorded = await audit.withCompensatingAudit(pool, {
    auditIntent: {
      pariwarId,
      actorId: null,
      actorRole: null,
      action: CLAIM_CONTACT_WA_STOPPED_ACTION,
      resourceLocator: `pariwar/${pariwarId}/claim-contact/wa-stop/${stopId}`,
      requestPayloadHash: createHash('sha256').update(JSON.stringify({ stopId, inboundEventId: input.inboundEventId })).digest('hex'),
      traceId: null,
    },
    mutate: () =>
      withPariwarScope(pool, pariwarId, (db: Db) =>
        claimDomain.insertClaimContactWaStop(db, {
          pariwarId,
          recipientNumberHash: input.recipientNumberHash,
          inboundEventId: input.inboundEventId,
          stopId,
        }),
      ),
  });
  return recorded ? 'recorded' : 'already';
}
