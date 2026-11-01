// Story 12.2 (`2026-11-01-433` QE5 — amending `-429` C11 in part; AC4 domain leg; I6) — the author-time scope check
// `assertScopeValuesRecorded` and the options read `listModuleScopeOptions`, on the live DB. One rolled-back transaction
// per test, each in a FRESH `randomUUID()` Pariwar (trees and listed districts are per-Pariwar — TR20).
//
// The check is EXACT membership, ⛔ against the capped option page: a listed district BEYOND the first 200 is accepted;
// a `retired` spelling is refused; values match byte-for-byte.

import { randomUUID } from 'node:crypto';

import type pg from 'pg';
import { describe, expect, it } from 'vitest';

import { bindScopedDb } from '../../../src/db.js';
import { createGeoTreeVersion } from '../../../src/geo-tree/index.js';
import { pariwarId as toPariwarId, type PariwarId } from '../../../src/ids/index.js';
import { ModuleScopeRequiresGeoTreeError, ModuleScopeValueUnknownError } from '../../../src/marketplace/errors.js';
import {
  assertScopeValuesRecorded,
  findListedWorkplaceDistricts,
  listModuleScopeOptions,
} from '../../../src/marketplace/scope-options.js';
import type { GeoTreeNodeJson } from '../../../src/schema/geo_tree_versions.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { enterAppScope } from '../_helpers.js';
import { HOUR_MS, txNow } from './_fixtures.js';

const state = (value: string): GeoTreeNodeJson => ({ dimension: 'state', value, parent_dimension: null, parent_value: null });
const district = (value: string, parent: string | null): GeoTreeNodeJson => ({
  dimension: 'district',
  value,
  parent_dimension: parent === null ? null : 'state',
  parent_value: parent,
});

/** A fresh Pariwar under its own app scope; `at` = the transaction's own now(). */
async function fresh(client: pg.PoolClient): Promise<{ p: PariwarId; at: Date }> {
  const p = toPariwarId(randomUUID());
  await enterAppScope(client, p);
  return { p, at: await txNow(client) };
}

async function publishTree(client: pg.PoolClient, p: PariwarId, at: Date, nodes: GeoTreeNodeJson[]): Promise<void> {
  await createGeoTreeVersion(bindScopedDb(client), { pariwarId: p, nodes, effectiveAt: new Date(at.getTime() - HOUR_MS) });
}

/** Insert listed (and optionally retired) workplace districts for `p` (twt_app holds INSERT under the scope). */
async function listDistricts(client: pg.PoolClient, p: PariwarId, names: string[], status = 'listed'): Promise<void> {
  await client.query(
    `INSERT INTO workplace_districts (pariwar_id, district, status) SELECT $1, d, $3 FROM unnest($2::text[]) AS d`,
    [p, names, status],
  );
}

async function refusal(fn: () => Promise<void>): Promise<unknown> {
  try {
    await fn();
  } catch (e) {
    return e;
  }
  return null;
}

describe.skipIf(!hasDatabase)('assertScopeValuesRecorded — the author-time C11 check (AC4)', () => {
  setupLiveDb();

  it('members-all always passes — with ⛔ tree and ⛔ listed district', async () => {
    const { client } = getTx();
    const { p, at } = await fresh(client);
    await expect(assertScopeValuesRecorded(bindScopedDb(client), p, { version: 1, scope: 'members-all' }, at)).resolves.toBeUndefined();
  });

  it('a state audience with ⛔ tree → ModuleScopeRequiresGeoTreeError (even if workplace districts are listed)', async () => {
    const { client } = getTx();
    const { p, at } = await fresh(client);
    await listDistricts(client, p, ['Patna']);
    const err = await refusal(() => assertScopeValuesRecorded(bindScopedDb(client), p, { version: 1, scope: 'state', values: ['Bihar'] }, at));
    expect(err).toBeInstanceOf(ModuleScopeRequiresGeoTreeError);
  });

  it('a tree with states: a recorded state passes; unknown values → ModuleScopeValueUnknownError naming ONLY them', async () => {
    const { client } = getTx();
    const { p, at } = await fresh(client);
    await publishTree(client, p, at, [state('Bihar'), state('Assam'), district('Patna', 'Bihar')]);
    const db = bindScopedDb(client);
    await expect(assertScopeValuesRecorded(db, p, { version: 1, scope: 'state', values: ['Bihar', 'Assam'] }, at)).resolves.toBeUndefined();
    const err = await refusal(() =>
      assertScopeValuesRecorded(db, p, { version: 1, scope: 'state', values: ['Bihar', 'bihar', 'Patna', 'Goa'] }, at),
    );
    expect(err).toBeInstanceOf(ModuleScopeValueUnknownError);
    // byte-for-byte: 'bihar' is not 'Bihar'; a DISTRICT value is not a state.
    expect(err).toMatchObject({ scope: 'state', values: ['bihar', 'Patna', 'Goa'] });
  });

  it('a tree: a district audience checks the tree’s district nodes — ⛔ the listed workplace districts', async () => {
    const { client } = getTx();
    const { p, at } = await fresh(client);
    await publishTree(client, p, at, [state('Bihar'), district('Patna', 'Bihar')]);
    await listDistricts(client, p, ['Gaya']);
    const db = bindScopedDb(client);
    await expect(assertScopeValuesRecorded(db, p, { version: 1, scope: 'district', values: ['Patna'] }, at)).resolves.toBeUndefined();
    const err = await refusal(() => assertScopeValuesRecorded(db, p, { version: 1, scope: 'district', values: ['Patna', 'Gaya'] }, at));
    expect(err).toMatchObject({ name: 'ModuleScopeValueUnknownError', scope: 'district', values: ['Gaya'] });
  });

  it('a districts-only tree + a state audience → ModuleScopeRequiresGeoTreeError', async () => {
    const { client } = getTx();
    const { p, at } = await fresh(client);
    await publishTree(client, p, at, [district('Patna', null)]);
    const err = await refusal(() => assertScopeValuesRecorded(bindScopedDb(client), p, { version: 1, scope: 'state', values: ['Bihar'] }, at));
    expect(err).toBeInstanceOf(ModuleScopeRequiresGeoTreeError);
  });

  it('a tree whose effective_at is AFTER `at` is not in force: a state audience is refused as no-tree', async () => {
    const { client } = getTx();
    const { p, at } = await fresh(client);
    await createGeoTreeVersion(bindScopedDb(client), { pariwarId: p, nodes: [state('Bihar')], effectiveAt: new Date(at.getTime() + HOUR_MS) });
    const err = await refusal(() => assertScopeValuesRecorded(bindScopedDb(client), p, { version: 1, scope: 'state', values: ['Bihar'] }, at));
    expect(err).toBeInstanceOf(ModuleScopeRequiresGeoTreeError);
  });

  it('⛔ tree: a listed district BEYOND the first 200 is ACCEPTED (exact match); a retired one is refused', async () => {
    const { client } = getTx();
    const { p, at } = await fresh(client);
    const names = Array.from({ length: 205 }, (_, i) => `District ${String(i).padStart(3, '0')}`);
    await listDistricts(client, p, names);
    await listDistricts(client, p, ['Old Patna'], 'retired');
    const db = bindScopedDb(client);

    // The options page is capped at 200 and says so…
    const options = await listModuleScopeOptions(db, p, at);
    expect(options.districtSource).toBe('workplace_districts');
    expect(options.districts).toHaveLength(200);
    expect(options.districtsTruncated).toBe(true);
    expect(options.districts.some((d) => d.value === 'District 204')).toBe(false);
    expect(options.districts.some((d) => d.value === 'Old Patna')).toBe(false);

    // …but the CHECK is exact membership, ⛔ the capped page.
    await expect(
      assertScopeValuesRecorded(db, p, { version: 1, scope: 'district', values: ['District 204', 'District 000'] }, at),
    ).resolves.toBeUndefined();
    const err = await refusal(() =>
      assertScopeValuesRecorded(db, p, { version: 1, scope: 'district', values: ['District 204', 'Old Patna', 'district 204'] }, at),
    );
    expect(err).toMatchObject({ name: 'ModuleScopeValueUnknownError', scope: 'district', values: ['Old Patna', 'district 204'] });
  });

  it('⛔ tree and ⛔ listed district: any district value is unknown; the options are empty', async () => {
    const { client } = getTx();
    const { p, at } = await fresh(client);
    const db = bindScopedDb(client);
    const err = await refusal(() => assertScopeValuesRecorded(db, p, { version: 1, scope: 'district', values: ['Patna'] }, at));
    expect(err).toMatchObject({ name: 'ModuleScopeValueUnknownError', values: ['Patna'] });
    expect(await listModuleScopeOptions(db, p, at)).toEqual({
      geoTreeVersion: null,
      states: [],
      districts: [],
      districtSource: 'workplace_districts',
      districtsTruncated: false,
    });
  });

  it('listModuleScopeOptions with a tree: the tree’s version, states and districts with parents', async () => {
    const { client } = getTx();
    const { p, at } = await fresh(client);
    await publishTree(client, p, at, [state('Bihar'), district('Patna', 'Bihar')]);
    const o = await listModuleScopeOptions(bindScopedDb(client), p, at);
    expect(o).toMatchObject({ geoTreeVersion: 1, districtSource: 'geo_tree', districtsTruncated: false });
    expect(o.states.map((s) => s.value)).toEqual(['Bihar']);
    expect(o.districts.map((d) => [d.value, d.state])).toEqual([['Patna', 'Bihar']]);
  });

  it('findListedWorkplaceDistricts returns only the listed, exactly-matching, own-Pariwar spellings', async () => {
    const { client } = getTx();
    const { p } = await fresh(client);
    await listDistricts(client, p, ['Patna', 'Gaya']);
    await listDistricts(client, p, ['Arrah'], 'retired');
    const found = await findListedWorkplaceDistricts(bindScopedDb(client), p, ['Patna', 'patna', 'Arrah', 'Nowhere']);
    expect([...found]).toEqual(['Patna']);
    expect([...(await findListedWorkplaceDistricts(bindScopedDb(client), p, []))]).toEqual([]);
  });
});
