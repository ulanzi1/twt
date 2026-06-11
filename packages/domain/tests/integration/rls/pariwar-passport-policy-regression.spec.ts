// pariwar_passport RLS policy-regression integration tests — Story 1.7 (AC-4).
//
// THE CARVE-OUT under test: SELECT is cross-Pariwar readable (the named
// `USING (true)` condition), while WRITE stays tenant-scoped. This is the inverse
// of the events_log SELECT isolation — the Passport is the architecture's single
// pre-authorised cross-readable exception (§1.2 line 726-729). Every assertion
// here is the positive/negative pair the policies/README "Test discipline"
// requires; the cross-read assertions are deliberately the INVERSE of the
// events_log isolation test and are correct behaviour, not a leak.
//
// Live DB only — skips when DATABASE_URL is unset. Per-test BEGIN/ROLLBACK
// isolation (setupLiveDb). Seeds run as the Docker superuser (RLS bypassed)
// BEFORE entering app scope; enforcement assertions `SET LOCAL ROLE twt_app` to
// shed superuser (see _helpers.ts).

import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { getBrandingBundle, getPariwarPassport } from '../../../src/pariwar-passport/index.js';
import { pariwarId as toPariwarId } from '../../../src/ids/index.js';
import * as schema from '../../../src/schema/index.js';
import {
  getTx,
  hasDatabase,
  setupLiveDb,
} from '../../../src/test-utils/integration-setup.js';
import {
  PARIWAR_A,
  PARIWAR_B,
  enterAppRoleNoScope,
  enterAppScope,
  seedPassport,
} from '../_helpers.js';

describe.skipIf(!hasDatabase)('pariwar_passport RLS policy regression (carve-out)', () => {
  setupLiveDb();

  it('(a) positive: owning Pariwar A reads its OWN passport', async () => {
    const { tx, client } = getTx();
    await seedPassport(tx, PARIWAR_A);
    await seedPassport(tx, PARIWAR_B);
    await enterAppScope(client, PARIWAR_A);

    const rows = await tx.select().from(schema.pariwarPassport);
    expect(rows.some((r) => r.pariwarId === PARIWAR_A)).toBe(true);
  });

  it('(b) CARVE-OUT: Pariwar A session reads Pariwar B passport (cross-readable)', async () => {
    const { tx, client } = getTx();
    await seedPassport(tx, PARIWAR_A);
    await seedPassport(tx, PARIWAR_B);
    await enterAppScope(client, PARIWAR_A);

    // The inverse of the events_log isolation test — here the cross-tenant row
    // IS visible, by design (USING true). This is the carve-out, NOT a leak.
    const rows = await tx
      .select()
      .from(schema.pariwarPassport)
      .where(eq(schema.pariwarPassport.pariwarId, PARIWAR_B));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.pariwarId).toBe(PARIWAR_B);
  });

  it('(b2) the typed read accessor reads cross-Pariwar without scope wrapping', async () => {
    const { tx, client } = getTx();
    await seedPassport(tx, PARIWAR_A, { displayNameEn: 'A-corp' });
    await seedPassport(tx, PARIWAR_B, { displayNameEn: 'B-corp' });
    await enterAppScope(client, PARIWAR_A);

    // getPariwarPassport / getBrandingBundle are plain db.select() — they rely on
    // the carve-out SELECT, NOT runAsCrossTenant. A-scope reads B's branding.
    const bRow = await getPariwarPassport(tx, toPariwarId(PARIWAR_B));
    expect(bRow?.displayNameEn).toBe('B-corp');
    const bBranding = await getBrandingBundle(tx, toPariwarId(PARIWAR_B));
    expect(bBranding?.primary_color).toBe('#0A3D62');
  });

  it('(c) write-isolation: A session INSERT for Pariwar B is blocked (withCheck)', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    // Under A's scope, attempt to create B's passport → withCheck violation.
    const err = await seedPassport(tx, PARIWAR_B).catch((e: unknown) => e);
    const cause = (err as { cause?: { code?: string; message?: string } }).cause;
    expect(cause?.code).toBe('42501');
    expect(cause?.message ?? '').toMatch(/row-level security/i);
  });

  it('(c2) write-isolation: A session UPDATE of B passport changes zero rows', async () => {
    const { tx, client } = getTx();
    await seedPassport(tx, PARIWAR_B, { displayNameEn: 'B-original' });
    await enterAppScope(client, PARIWAR_A);

    // The write policy USING clause scopes UPDATE visibility to A, so B's row is
    // not visible-for-update under A's scope → UPDATE matches nothing.
    const updated = await tx
      .update(schema.pariwarPassport)
      .set({ displayNameEn: 'hijacked' })
      .where(eq(schema.pariwarPassport.pariwarId, PARIWAR_B))
      .returning();
    expect(updated).toHaveLength(0);
  });

  it('(d) unset-scope session CAN SELECT (carve-out live) but CANNOT write', async () => {
    const { tx, client } = getTx();
    await seedPassport(tx, PARIWAR_A);
    await seedPassport(tx, PARIWAR_B);
    // Shed superuser, do NOT set scope. The cross-readable SELECT (USING true)
    // returns rows even with no scope — proving the carve-out is live.
    await enterAppRoleNoScope(client);

    const rows = await tx.select().from(schema.pariwarPassport);
    expect(rows.length).toBeGreaterThanOrEqual(2);

    // ...but a write with no scope set fails closed (nullif → NULL → withCheck).
    const err = await seedPassport(tx, PARIWAR_A, { displayNameEn: 'no-scope-write' }).catch(
      (e: unknown) => e,
    );
    const cause = (err as { cause?: { code?: string } }).cause;
    expect(cause?.code).toBe('42501');
  });

  it('FORCE RLS: pariwar_passport has rowsecurity AND forcerowsecurity enabled', async () => {
    const { client } = getTx();
    const { rows } = await client.query<{
      relrowsecurity: boolean;
      relforcerowsecurity: boolean;
    }>(
      `SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname = 'pariwar_passport'`,
    );
    expect(rows[0]?.relrowsecurity).toBe(true);
    expect(rows[0]?.relforcerowsecurity).toBe(true);
  });

  it('updated_at trigger fires on UPDATE, overriding a caller-supplied value (AC-3)', async () => {
    // Postgres now() is the TRANSACTION timestamp (frozen for the whole tx), so
    // within this per-test BEGIN/ROLLBACK envelope created_at == updated_at and a
    // strict greater-than across two writes is impossible. Instead we prove the
    // BEFORE UPDATE trigger FIRES by having it override an explicit stale
    // updated_at: the caller writes year-2000, the trigger must reset it to the
    // transaction now(). In production (separate committed transactions) now()
    // advances per write, so updated_at is a valid freshness marker.
    const { tx, client } = getTx();
    await seedPassport(tx, PARIWAR_A, { displayNameEn: 'before' });
    const before = await getPariwarPassport(tx, toPariwarId(PARIWAR_A));

    await client.query(
      `UPDATE pariwar_passport SET display_name_en = 'after', updated_at = '2000-01-01T00:00:00Z' WHERE pariwar_id = $1`,
      [PARIWAR_A],
    );
    const after = await getPariwarPassport(tx, toPariwarId(PARIWAR_A));

    expect(after?.displayNameEn).toBe('after');
    // The trigger overrode the stale 2000 value back to transaction now().
    expect(after!.updatedAt.getFullYear()).toBeGreaterThan(2000);
    expect(after!.updatedAt.getTime()).toBe(before!.updatedAt.getTime());
  });
});
