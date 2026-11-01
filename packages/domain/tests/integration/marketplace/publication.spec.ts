// Story 12.2 (`2026-11-01-433` QE4; AC1, AC6 domain leg) — `recordModulePublication` in the SAME transaction as the
// publish event, `getModulePublication`, the one-row-per-module PK, and the table's CHECKs. Live DB, one rolled-back
// transaction per test, each in a FRESH `randomUUID()` Pariwar with its own partner (TR20).

import { randomUUID } from 'node:crypto';

import type pg from 'pg';
import { describe, expect, it } from 'vitest';

import { bindScopedDb } from '../../../src/db.js';
import { pariwarId as toPariwarId, type ModuleId, type PariwarId } from '../../../src/ids/index.js';
import { activateModule, authorModule } from '../../../src/marketplace/commands.js';
import { uniqueViolationConstraint } from '../../../src/marketplace/errors.js';
import {
  MODULE_PUBLICATION_PKEY_CONSTRAINT,
  getModulePublication,
  moduleToneContentHash,
  recordModulePublication,
} from '../../../src/marketplace/publication.js';
import { getModule } from '../../../src/marketplace/read.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { enterAppScope } from '../_helpers.js';
import { expectSqlRejected, manifestInput, newModuleId, seedPartner, txNow } from './_fixtures.js';

const REVIEWER = randomUUID();

async function activeModule(client: pg.PoolClient, p: PariwarId): Promise<ModuleId> {
  const partnerId = await seedPartner(client, p);
  await enterAppScope(client, p);
  const id = newModuleId();
  const base = { pariwarId: p, moduleId: id, actor: 'operator' as const, actorId: randomUUID() };
  await authorModule(client, { ...base, auditId: randomUUID(), manifest: manifestInput(await txNow(client), { partner_id: partnerId }) });
  await activateModule(client, { ...base, auditId: randomUUID() });
  return id;
}

describe.skipIf(!hasDatabase)('marketplace publication record (Story 12.2 AC6)', () => {
  setupLiveDb();

  it('records ONE publication in the publish transaction; the row carries the hash, reviewer, event type, ticks', async () => {
    const { client } = getTx();
    const p = toPariwarId(randomUUID());
    const id = await activeModule(client, p);
    const db = bindScopedDb(client);
    const module = (await getModule(db, p, id))!;
    const contentHash = moduleToneContentHash(module, { displayNameEn: 'HDFC', displayNameHi: 'एचडीएफसी' });
    const auditId = randomUUID();
    const row = await recordModulePublication(client, {
      module,
      publishedEventType: 'module.activated',
      reviewedBy: REVIEWER,
      hindiReviewed: true,
      partnerAgreementConfirmed: true,
      contentHash,
      auditId,
    });
    expect(row).toMatchObject({
      moduleId: id,
      pariwarId: p,
      publishedEventType: 'module.activated',
      toneSignoffContentHash: contentHash,
      reviewedByActorId: REVIEWER,
      hindiReviewed: true,
      partnerAgreementConfirmed: true,
      auditId,
    });
    expect(row.reviewedAt).toBeInstanceOf(Date);
    expect(await getModulePublication(db, p, id)).toEqual(row);
    // Another Pariwar's id reads as null.
    expect(await getModulePublication(db, toPariwarId(randomUUID()), id)).toBeNull();
  });

  it('an unpublished draft has no publication (null)', async () => {
    const { client } = getTx();
    const p = toPariwarId(randomUUID());
    const partnerId = await seedPartner(client, p);
    await enterAppScope(client, p);
    const id = newModuleId();
    await authorModule(client, {
      pariwarId: p, moduleId: id, auditId: randomUUID(), actor: 'operator', actorId: randomUUID(),
      manifest: manifestInput(await txNow(client), { partner_id: partnerId }),
    });
    expect(await getModulePublication(bindScopedDb(client), p, id)).toBeNull();
  });

  it('a SECOND publication of the same module → 23505 marketplace_module_publications_pkey', async () => {
    const { client } = getTx();
    const p = toPariwarId(randomUUID());
    const id = await activeModule(client, p);
    const module = (await getModule(bindScopedDb(client), p, id))!;
    const input = {
      module,
      publishedEventType: 'module.activated' as const,
      reviewedBy: REVIEWER,
      hindiReviewed: true as const,
      partnerAgreementConfirmed: true as const,
      contentHash: 'a'.repeat(64),
      auditId: randomUUID(),
    };
    await recordModulePublication(client, input);
    await client.query('SAVEPOINT again');
    let caught: unknown;
    try {
      await recordModulePublication(client, { ...input, auditId: randomUUID() });
    } catch (e) {
      caught = e;
    }
    await client.query('ROLLBACK TO SAVEPOINT again');
    expect(MODULE_PUBLICATION_PKEY_CONSTRAINT).toBe('marketplace_module_publications_pkey');
    expect(uniqueViolationConstraint(caught)).toBe(MODULE_PUBLICATION_PKEY_CONSTRAINT);
  });

  it.each([
    ['marketplace_module_publications_content_hash', 'an upper-case / short hash', { hash: 'ABC' }],
    ['marketplace_module_publications_event_type', 'an event type other than scheduled / activated', { type: 'module.archived' }],
    ['marketplace_module_publications_hindi_reviewed', 'hindi_reviewed = false', { hindi: false }],
    ['marketplace_module_publications_partner_agreement', 'partner_agreement_confirmed = false', { partner: false }],
  ])('the CHECK %s fires for %s (23514, by name)', async (name, _why, o: { hash?: string; type?: string; hindi?: boolean; partner?: boolean }) => {
    const { client } = getTx();
    const p = toPariwarId(randomUUID());
    const id = await activeModule(client, p);
    await expectSqlRejected(
      client,
      `INSERT INTO marketplace_module_publications
         (module_id, pariwar_id, published_event_type, tone_signoff_content_hash, reviewed_by_actor_id, hindi_reviewed,
          partner_agreement_confirmed, audit_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, p, o.type ?? 'module.activated', o.hash ?? 'f'.repeat(64), REVIEWER, o.hindi ?? true, o.partner ?? true, randomUUID()],
      '23514',
      name,
    );
  });
});
