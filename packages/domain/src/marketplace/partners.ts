// The per-Pariwar partner registry — Story 12.2 (`2026-11-01-433` QE3 (A), QE12, QE18; AC3).
//
// A partner is registered ONCE per Pariwar (`marketplace_partners`, insert-only) and named by id from every module it
// offers (`marketplace_modules_partner_fk`, composite on `pariwar_id`). Its display names are what the member's card
// shows as the partner's brand (12.3) — so they follow the QE12 display-text rules.
//
// ⛔ Audit pairing here (I11 / `-427` QE15): the 12.2 route wraps `createPartner` in `withCompensatingAudit`
// (`module_partner.created`, `module_partner/<id>`). The route calls the PURE `parsePartnerDisplayNames` FIRST, as a
// PRE-CHECK before the wrapper (QE18), so a refused name writes ⛔ audit line; `createPartner` takes ALREADY-PARSED values
// and re-asserts nothing that could refuse inside `mutate` beyond the DB's case-insensitive name unique (23505
// `marketplace_partners_pariwar_name_en_unique` → 409 `module_partner.name_taken`, mapped by the route).

import { and, asc, eq, sql } from 'drizzle-orm';
import type pg from 'pg';
import { z } from 'zod';

import { bindScopedDb, type Db } from '../db.js';
import type { PariwarId, PartnerId } from '../ids/index.js';
import { clampLimit } from '../pagination.js';
import { marketplacePartners, type MarketplacePartner } from '../schema/marketplace_partners.js';
import { ModulePartnerNameInvalidError } from './errors.js';
import { partnerDisplayNameEnSchema, partnerDisplayNameHiSchema } from './filters.js';

/** The admin partners list's page size — default AND cap (⛔ cursor: a Pariwar with > 200 partners is carried). */
export const LIST_PARTNERS_LIMIT = { default: 200, cap: 200 } as const;

/** The constraint a duplicate English name (any case) violates. Keep IN SYNC with migration 0195. */
export const PARTNER_NAME_EN_UNIQUE_CONSTRAINT = 'marketplace_partners_pariwar_name_en_unique';

const PartnerDisplayNamesSchema = z
  .object({ display_name_en: partnerDisplayNameEnSchema, display_name_hi: partnerDisplayNameHiSchema })
  .strict();

/** Parsed (trimmed) partner display names. */
export interface PartnerDisplayNames {
  readonly displayNameEn: string;
  readonly displayNameHi: string;
}

/**
 * PURE. Validate a partner's two display names against the QE12 rules (each 1–120 after trim; the Hindi one must hold a
 * Devanagari letter). Issue paths are the wire names `display_name_en` / `display_name_hi`.
 *
 * @throws ModulePartnerNameInvalidError
 */
export function parsePartnerDisplayNames(input: { displayNameEn: unknown; displayNameHi: unknown }): PartnerDisplayNames {
  const parsed = PartnerDisplayNamesSchema.safeParse({
    display_name_en: input.displayNameEn,
    display_name_hi: input.displayNameHi,
  });
  if (!parsed.success) throw new ModulePartnerNameInvalidError(parsed.error);
  return { displayNameEn: parsed.data.display_name_en, displayNameHi: parsed.data.display_name_hi };
}

/**
 * Register a partner in `pariwarId` (one INSERT on the caller's scoped transaction). `partnerId` is SERVER-minted by the
 * caller (QE13); the names must come from `parsePartnerDisplayNames`. A duplicate English name rethrows the pg 23505
 * UNCHANGED (the route maps it by constraint name).
 */
export async function createPartner(
  client: pg.PoolClient,
  i: PartnerDisplayNames & { pariwarId: PariwarId; partnerId: PartnerId; actorId: string; auditId: string },
): Promise<MarketplacePartner> {
  const rows = await bindScopedDb(client)
    .insert(marketplacePartners)
    .values({
      partnerId: i.partnerId,
      pariwarId: i.pariwarId,
      displayNameEn: i.displayNameEn,
      displayNameHi: i.displayNameHi,
      createdByActorId: i.actorId,
      auditId: i.auditId,
    })
    .returning();
  const row = rows[0];
  if (!row) throw new Error(`[marketplace] partner ${i.partnerId} insert returned no row`);
  return row;
}

/** This Pariwar's partners, A–Z by `lower(display_name_en)` (then id), at most 200 (`LIST_PARTNERS_LIMIT`). */
export async function listPartnersForPariwar(
  db: Db,
  pariwarId: PariwarId,
  opts: { limit?: number } = {},
): Promise<MarketplacePartner[]> {
  return db
    .select()
    .from(marketplacePartners)
    .where(eq(marketplacePartners.pariwarId, pariwarId))
    .orderBy(sql`lower(${marketplacePartners.displayNameEn})`, asc(marketplacePartners.partnerId))
    .limit(clampLimit(opts.limit, LIST_PARTNERS_LIMIT));
}

/** One partner of this Pariwar, or null (another Pariwar's id reads as null — RLS + the explicit predicate). */
export async function getPartner(db: Db, pariwarId: PariwarId, partnerId: PartnerId): Promise<MarketplacePartner | null> {
  const rows = await db
    .select()
    .from(marketplacePartners)
    .where(and(eq(marketplacePartners.pariwarId, pariwarId), eq(marketplacePartners.partnerId, partnerId)))
    .limit(1);
  return rows[0] ?? null;
}
