// Per-send WhatsApp delivery-status accessors — Story 5.3 (Task 3; AC5).
//
// A transport-free PRIMITIVE: NO HTTP, NO signature verification. Persists the per-send WA delivery status
// keyed by the Meta `wamid`. Story 5.4's webhook receiver maps the Meta status via `mapMetaStatus`
// (@twt/channels) and calls `upsertWaSendStatus` with the mapped state — this module is the persistence
// half of that Q2 ownership split. Runs on the passed (scoped) `Db` (RLS enforces the tenant match).

import { eq } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { PariwarId } from '../ids/index.js';
import {
  type WhatsappSendStatusRow,
  whatsappSendStatus,
} from '../schema/whatsapp_send_status.js';

/** One WA send-status update to persist (the 5.4 webhook maps metaStatus → state before calling this). */
export interface WaSendStatusUpsertInput {
  readonly wamid: string;
  readonly pariwarId: PariwarId;
  /** The mapped SendStatus state (mapMetaStatus output). */
  readonly state: string;
  /** The raw Meta status string (provenance). Null at accept-time seeding. */
  readonly metaStatus: string | null;
}

/**
 * Upsert a per-send WA delivery status (latest-wins on the wamid PK; bumps updated_at). Idempotent — a
 * webhook redelivery for the same wamid overwrites with the latest state (Meta statuses are monotonic in
 * practice: sent → delivered → read; a `failed` is terminal). Tenant-scoped (RLS + the pariwar_id column).
 */
export async function upsertWaSendStatus(db: Db, input: WaSendStatusUpsertInput): Promise<void> {
  await db
    .insert(whatsappSendStatus)
    .values({
      wamid: input.wamid,
      pariwarId: input.pariwarId,
      state: input.state,
      metaStatus: input.metaStatus,
    })
    .onConflictDoUpdate({
      target: whatsappSendStatus.wamid,
      set: { state: input.state, metaStatus: input.metaStatus, updatedAt: new Date() },
    });
}

/** Read a persisted WA send status by wamid, or null when none recorded. Tenant-scoped (RLS). */
export async function getWaSendStatus(db: Db, wamid: string): Promise<WhatsappSendStatusRow | null> {
  const rows = await db.select().from(whatsappSendStatus).where(eq(whatsappSendStatus.wamid, wamid));
  return rows[0] ?? null;
}
