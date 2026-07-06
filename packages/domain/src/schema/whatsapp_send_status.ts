// `whatsapp_send_status` — the per-send WA delivery-status substrate (Story 5.3, Task 3; AC5).
//
// Keyed by the Meta `wamid` (messages[0].id) — the id `createWhatsappBusinessProvider` returns on
// acceptance. Meta reports delivered/read/failed status ASYNCHRONOUSLY via a webhook (the SAME webhook
// Story 5.4 stands up). Per the Q2 ownership split: 5.3 ships this persistence seam + the pure
// `mapMetaStatus` (whatsapp-status.ts); Story 5.4 owns the HTTP webhook receiver + signature verification +
// parsing, and CALLS `upsertWaSendStatus` with the mapped state. 5.3 builds NO webhook route here.
//
// TENANT-ISOLATED on pariwar_id (mirror member_device_tokens' inline RLS shape). The wamid is a Meta
// opaque id (NOT PII) — plain text, no encryption.
//
// Naming discipline per architecture L3663-3677: DB columns snake_case, TS fields camelCase.

import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import type { PariwarId } from '../ids/index.js';

export const whatsappSendStatus = pgTable('whatsapp_send_status', {
  // The Meta wamid (messages[0].id) — globally unique, so it is the natural primary key.
  wamid: text('wamid').primaryKey(),

  // Tenant scope (RLS predicate column; branded).
  pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),

  // The mapped SendStatus state (mapMetaStatus output: 'unknown'|'queued'|'sent'|'delivered'|'failed').
  state: text('state').notNull(),

  // The raw Meta status string as received (provenance — so a mapping change can be re-derived). Nullable:
  // 5.3 can seed a row at accept time (state='sent', no webhook status yet).
  metaStatus: text('meta_status'),

  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

export type WhatsappSendStatusRow = typeof whatsappSendStatus.$inferSelect;
export type WhatsappSendStatusInsert = typeof whatsappSendStatus.$inferInsert;
