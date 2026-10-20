// The claimant's WhatsApp step — the DELIVERY read the ladder's ENDS share (Story 6.37d, WS11 (1), WS12). A LEAF (schema +
// db only): the 10:00 sweep, the SMS begins (`contact-ladder-record.ts`) and the WhatsApp begin all ask it under the chase lock,
// so a delivered WhatsApp ends a ladder whichever path looks first — ⛔ an import cycle ([[project_type_only_import_cycle_trap]]).

import { and, inArray, isNotNull, eq, sql } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { PariwarId } from '../ids/index.js';
import { claimContactWaSends } from '../schema/claim_contact_wa_sends.js';

/**
 * ⭐ WS11 (1) — which of these ladders' WhatsApp was DELIVERED. The honest rule: the row's own `delivered_at`, OR the status
 * store's `delivered` for its wamid (`whatsapp_send_status` — latest-wins; `mapMetaStatus` maps `read` to `delivered`) — and when
 * that second disjunct is what is true, the SAME transaction COPIES it into `delivered_at` (set once, on the `accepted` row with
 * the wamid — 0172's trigger allows it) so D22's own-row read (WS12) sees every delivery the end rule saw. A delivery to a
 * no-wamid `may_have_sent` row is UNOBSERVABLE (disclosed). Tenant-scoped; call it under the chase lock.
 */
export async function settleContactLadderWhatsappDeliveries(
  db: Db,
  pariwarId: PariwarId,
  ladderIds: readonly string[],
): Promise<Set<string>> {
  if (ladderIds.length === 0) return new Set();
  const list = sql.param([...new Set(ladderIds)]);
  await db.execute(sql`
    UPDATE claim_contact_wa_sends wd_s
       SET delivered_at = wd_w.updated_at, updated_at = clock_timestamp()
      FROM whatsapp_send_status wd_w
     WHERE wd_s.pariwar_id = ${pariwarId}
       AND wd_s.ladder_id = ANY(${list}::uuid[])
       AND wd_s.send_outcome = 'accepted'
       AND wd_s.provider_message_id IS NOT NULL
       AND wd_s.delivered_at IS NULL
       AND wd_w.pariwar_id = wd_s.pariwar_id
       AND wd_w.wamid = wd_s.provider_message_id
       AND wd_w.state = 'delivered'`);
  const rows = await db
    .select({ ladderId: claimContactWaSends.ladderId })
    .from(claimContactWaSends)
    .where(
      and(
        eq(claimContactWaSends.pariwarId, pariwarId),
        inArray(claimContactWaSends.ladderId, [...new Set(ladderIds)]),
        isNotNull(claimContactWaSends.deliveredAt),
      ),
    );
  return new Set(rows.map((r) => r.ladderId));
}
