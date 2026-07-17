// Curated-name registry MUTATION seam — live-DB specs (Story 7.2, Task 5; AC5
// "any registry mutation is audit-logged").
//
// A curated name reaching a member surface is a governance-relevant act (the adversarial
// review M-10 religious-balance / omen-sensitivity gate), so "who added this name, when"
// must be answerable from the registry's very first write — long before the trustee-facing
// curation screen exists (a later trustee-tools story).
//
// ⚠ Mixed commit semantics, deliberately: the pool_names INSERT rides the per-test
// transaction (rolled back by setupLiveDb), while `writeAuditEntry` runs on the SERVICE
// pool and COMMITS on its own connection — the audit chain is global + advisory-lock
// serialized, so it structurally cannot join the caller's tx. Audit rows therefore
// ACCUMULATE across runs: every assertion below is by MEMBERSHIP on a run-unique locator,
// never by absolute count ([[project_live_db_test_gotchas]]). In dev/CI the superuser pool
// plays the BYPASSRLS service role (the audit-log integrity-check.spec.ts precedent).
//
// ⚠ NEVER use PARIWAR_A / PARIWAR_B here. This suite COMMITS audit rows, and A/B are the
// shared tenants whose exact-count RLS assertions (cross-pariwar-leak.spec.ts,
// consent-records / clause-versions policy regressions) depend on per-test ROLLBACK
// isolation — committed rows under A would silently break OTHER suites, which is exactly
// what _helpers.ts's PARIWAR_X/Y note warns about. Each test therefore mints a FRESH random
// tenant, the same discipline audit-log/integrity-check.spec.ts follows.

import { createHash, randomUUID } from 'node:crypto';

import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { canonicalJsonStringify } from '../../../src/canonical-json.js';
import type { Db } from '../../../src/db.js';
import { pariwarId as toPariwarId, type PariwarId } from '../../../src/ids/index.js';
import { POOL_NAME_ADD_AUDIT_ACTION, addPoolName, reserveNames } from '../../../src/pool/names.js';
import * as schema from '../../../src/schema/index.js';
import { DATABASE_URL, getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { enterAppScope } from '../_helpers.js';

describe.skipIf(!hasDatabase)('addPoolName — the audit-logged registry mutation seam', () => {
  setupLiveDb();

  let servicePool: pg.Pool;
  let dbAll: Db;

  beforeAll(() => {
    servicePool = new pg.Pool({ connectionString: DATABASE_URL, max: 4, ssl: false });
    dbAll = drizzle(servicePool, { schema }) as unknown as Db;
  });

  afterAll(() => servicePool.end());

  /** A tenant nobody else asserts on — this suite commits, so it must own its rows. */
  const freshPariwar = (): PariwarId => toPariwarId(randomUUID());

  /** Find this run's audit line by its unique resource locator (membership, not count). */
  async function findAuditLine(poolNameId: string) {
    const rows = await dbAll
      .select()
      .from(schema.auditLogEntries)
      .where(
        and(
          eq(schema.auditLogEntries.action, POOL_NAME_ADD_AUDIT_ACTION),
          eq(schema.auditLogEntries.resourceLocator, `pool_name/${poolNameId}`),
        ),
      );
    return rows;
  }

  it('inserts the name and appends exactly one audit line addressing it', async () => {
    const { tx, client } = getTx();
    const pariwar = freshPariwar();
    await enterAppScope(client, pariwar);
    const actorId = randomUUID();

    const poolNameId = await addPoolName(tx, servicePool, {
      pariwarId: pariwar,
      positionInOrderedList: 0,
      displayNameEn: 'Ganga',
      displayNameHi: 'गंगा',
      culturalLineageNote: 'A river name; no lineage sensitivity flagged in review.',
      actorId,
      actorRole: 'trustee',
    });

    // The row landed in the caller's tx…
    const rows = await tx
      .select()
      .from(schema.poolNames)
      .where(eq(schema.poolNames.poolNameId, poolNameId));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      displayNameEn: 'Ganga',
      displayNameHi: 'गंगा',
      createdByActor: actorId,
    });

    // …and the audit chain carries exactly one line for it, attributing the actor.
    const audit = await findAuditLine(poolNameId);
    expect(audit).toHaveLength(1);
    expect(audit[0]).toMatchObject({
      action: POOL_NAME_ADD_AUDIT_ACTION,
      pariwarId: pariwar,
      actorId,
      actorRole: 'trustee',
      responseStatus: 201,
    });
    // A DIGEST of the mutation, never the content itself (the writer's contract).
    expect(audit[0]?.requestPayloadHash).toMatch(/^[0-9a-f]{64}$/);
    expect(audit[0]?.auditHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('the audit hash covers cultural_lineage_note — the durable artifact of the M-10 review', async () => {
    const { tx, client } = getTx();
    const pariwar = freshPariwar();
    await enterAppScope(client, pariwar);
    const input = {
      pariwarId: pariwar,
      positionInOrderedList: 0,
      displayNameEn: 'Ganga',
      displayNameHi: 'गंगा',
      culturalLineageNote: 'A river name; no lineage sensitivity flagged in review.',
    };

    const poolNameId = await addPoolName(tx, servicePool, { ...input, actorId: null });
    const recordedHash = (await findAuditLine(poolNameId))[0]?.requestPayloadHash;

    // Recompute what the digest would be WITH the lineage note (must match the recording —
    // proves the field is genuinely in the hashed payload, not coincidentally identical)…
    const hashWith = createHash('sha256')
      .update(
        canonicalJsonStringify({
          pariwar_id: input.pariwarId,
          position_in_ordered_list: input.positionInOrderedList,
          display_name_en: input.displayNameEn,
          display_name_hi: input.displayNameHi,
          cultural_lineage_note: input.culturalLineageNote,
        }),
        'utf8',
      )
      .digest('hex');
    expect(recordedHash).toBe(hashWith);

    // …and WITHOUT it (must NOT match — a hash that ignored the field would collide here,
    // silently allowing the lineage note to be edited post-hoc without invalidating the
    // digest, which is exactly the governance hole this test closes).
    const hashWithout = createHash('sha256')
      .update(
        canonicalJsonStringify({
          pariwar_id: input.pariwarId,
          position_in_ordered_list: input.positionInOrderedList,
          display_name_en: input.displayNameEn,
          display_name_hi: input.displayNameHi,
        }),
        'utf8',
      )
      .digest('hex');
    expect(recordedHash).not.toBe(hashWithout);
  });

  it('a name lands INERT (pending) — an INSERT alone can never surface it to members', async () => {
    const { tx, client } = getTx();
    const pariwar = freshPariwar();
    await enterAppScope(client, pariwar);

    const poolNameId = await addPoolName(tx, servicePool, {
      pariwarId: pariwar,
      positionInOrderedList: 0,
      displayNameEn: 'Unreviewed',
      displayNameHi: 'अनसमीक्षित',
      actorId: null,
    });

    const rows = await tx
      .select()
      .from(schema.poolNames)
      .where(eq(schema.poolNames.poolNameId, poolNameId));
    expect(rows[0]?.approvalStatus).toBe('pending');

    // The governance gate is STRUCTURAL: the freshly-added name is not reservable, so it
    // cannot reach a member surface until a trustee approves it. The Pariwar now HAS a
    // list (opted in) with nothing approved → a configuration gap, i.e. exhaustion.
    await expect(reserveNames(tx, { pariwarId: pariwar, count: 1 })).rejects.toThrow(
      /exhausted/,
    );
  });

  it('records a system mutation with a null actor (NULL = system / SIE)', async () => {
    const { tx, client } = getTx();
    const pariwar = freshPariwar();
    await enterAppScope(client, pariwar);

    const poolNameId = await addPoolName(tx, servicePool, {
      pariwarId: pariwar,
      positionInOrderedList: 0,
      displayNameEn: 'SystemAdded',
      displayNameHi: 'सिस्टम',
      actorId: null,
    });

    const audit = await findAuditLine(poolNameId);
    expect(audit).toHaveLength(1);
    expect(audit[0]).toMatchObject({ actorId: null, actorRole: null });
  });

  it('rejects a duplicate position for the same Pariwar (a slot is not an upsert)', async () => {
    const { tx, client } = getTx();
    const pariwar = freshPariwar();
    await enterAppScope(client, pariwar);

    await addPoolName(tx, servicePool, {
      pariwarId: pariwar,
      positionInOrderedList: 0,
      displayNameEn: 'First',
      displayNameHi: 'पहला',
      actorId: null,
    });

    await expect(
      addPoolName(tx, servicePool, {
        pariwarId: pariwar,
        positionInOrderedList: 0, // ← same slot
        displayNameEn: 'Clash',
        displayNameHi: 'टकराव',
        actorId: null,
      }),
    ).rejects.toMatchObject({ cause: { code: '23505' } });
  });
});
