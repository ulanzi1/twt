// The publish record — Story 12.2 (`2026-11-01-433` QE4, QE9; AC6). 12.1 carried item C12's "12.2's review status" leg.
//
// Publishing a `draft` is ONE transaction on the route: the 12.1 command (`scheduleModule` for a future start, else
// `activateModule`), THEN `recordModulePublication`, then COMMIT — inside the audit wrapper's `mutate` (I2). The row is
// the tone sign-off's persistence (Story 2.2 makes the CONSUMER own it — ADR-0019) and the "who published" record.
//
// ⛔ Audit pairing here (I11): the route owns `withCompensatingAudit` and the `tone_review.signoff` line.

import { createHash } from 'node:crypto';

import { and, eq } from 'drizzle-orm';
import type pg from 'pg';

import { canonicalJsonStringify } from '../canonical-json.js';
import { bindScopedDb, type Db } from '../db.js';
import type { ModuleId, PariwarId } from '../ids/index.js';
import {
  marketplaceModulePublications,
  type MarketplaceModulePublication,
  type ModulePublishedEventType,
} from '../schema/marketplace_module_publications.js';
import type { MarketplaceModule } from '../schema/marketplace_modules.js';
import type { MarketplacePartner } from '../schema/marketplace_partners.js';

/** The constraint a second publish of one module violates (→ 409 `module.already_published`). Keep IN SYNC with 0195. */
export const MODULE_PUBLICATION_PKEY_CONSTRAINT = 'marketplace_module_publications_pkey';

/** The audit `resourceLocator` of a module — ALSO the tone sign-off's locator (QE4). */
export function moduleResourceLocator(moduleId: string): string {
  return `module/${moduleId}`;
}

/** The audit `resourceLocator` of a partner. */
export function partnerResourceLocator(partnerId: string): string {
  return `module_partner/${partnerId}`;
}

/**
 * The content hash the tone sign-off is recorded against (QE4): sha256 hex of `canonicalJsonStringify` of everything a
 * member will read on the card — the module's four texts and the partner's two names. The manifest and the partner are
 * immutable, so the hash is PROVENANCE (which copy was reviewed), ⛔ an edit detector. Key order is canonical.
 */
export function moduleToneContentHash(
  module: Pick<MarketplaceModule, 'nameEn' | 'nameHi' | 'descriptionEn' | 'descriptionHi'>,
  partner: Pick<MarketplacePartner, 'displayNameEn' | 'displayNameHi'>,
): string {
  return createHash('sha256')
    .update(
      canonicalJsonStringify({
        name_en: module.nameEn,
        name_hi: module.nameHi,
        description_en: module.descriptionEn,
        description_hi: module.descriptionHi,
        partner_display_name_en: partner.displayNameEn,
        partner_display_name_hi: partner.displayNameHi,
      }),
    )
    .digest('hex');
}

/**
 * INSERT the module's publication row on the caller's transaction — the SAME one as the publish event (I2). The
 * `pariwarId` comes FROM `module` (⛔ a separate argument), so the row can only ever name the module's own Pariwar. Both
 * confirmations are `true` by type AND by the table's CHECKs. A second publish rethrows the pg 23505 on
 * `MODULE_PUBLICATION_PKEY_CONSTRAINT` UNCHANGED (the route maps it).
 */
export async function recordModulePublication(
  client: pg.PoolClient,
  i: {
    module: Pick<MarketplaceModule, 'moduleId' | 'pariwarId'>;
    publishedEventType: ModulePublishedEventType;
    reviewedBy: string;
    hindiReviewed: true;
    partnerAgreementConfirmed: true;
    contentHash: string;
    auditId: string;
  },
): Promise<MarketplaceModulePublication> {
  const rows = await bindScopedDb(client)
    .insert(marketplaceModulePublications)
    .values({
      moduleId: i.module.moduleId,
      pariwarId: i.module.pariwarId,
      publishedEventType: i.publishedEventType,
      toneSignoffContentHash: i.contentHash,
      reviewedByActorId: i.reviewedBy,
      hindiReviewed: i.hindiReviewed,
      partnerAgreementConfirmed: i.partnerAgreementConfirmed,
      auditId: i.auditId,
    })
    .returning();
  const row = rows[0];
  if (!row) throw new Error(`[marketplace] publication of ${i.module.moduleId} insert returned no row`);
  return row;
}

/** The module's publication row in this Pariwar, or null (an unpublished draft, or another Pariwar's module). */
export async function getModulePublication(
  db: Db,
  pariwarId: PariwarId,
  moduleId: ModuleId,
): Promise<MarketplaceModulePublication | null> {
  const rows = await db
    .select()
    .from(marketplaceModulePublications)
    .where(and(eq(marketplaceModulePublications.pariwarId, pariwarId), eq(marketplaceModulePublications.moduleId, moduleId)))
    .limit(1);
  return rows[0] ?? null;
}
