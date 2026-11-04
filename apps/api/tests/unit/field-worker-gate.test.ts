// Story 13.1a (Task 5.3; AD4; TR2) — the field-worker gate TARGETS, no DB. (a) The per-worker loader stashes the worker's CURRENT
// district, or `null` for a missing / foreign worker — and a `null` target is a 403 for EVERYONE, a Pariwar Admin included (the
// real RBAC check, `rbac.hasPermission`, shows it). (b) The list gates at `district` for a named district, at `pariwar` otherwise.

import { rbac } from '@twt/domain';
import type { FastifyRequest } from 'fastify';
import { describe, expect, it, vi } from 'vitest';

const getFieldWorker = vi.hoisted(() => vi.fn());
vi.mock('@twt/domain', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@twt/domain')>();
  return { ...actual, fieldWorker: { ...actual.fieldWorker, getFieldWorker } };
});

const { fieldWorkerGateDistrict, listGateDimension, listGateValue, loadFieldWorkerGateDistrict } = await import('../../src/modules/field-worker/gate.js');

const P = '11111111-1111-4111-8111-111111111111';
const FW = '6ba7b810-9dad-41d1-80b4-00c04fd430c8';

const req = (over: Partial<Record<'params' | 'query' | 'scopeTx', unknown>> = {}) =>
  ({ params: { fieldWorkerId: FW }, query: {}, scopeTx: { pariwarId: P, tx: {} }, ...over }) as unknown as FastifyRequest;

describe('loadFieldWorkerGateDistrict (AD4 a)', () => {
  it('found ⇒ the worker’s CURRENT district, verbatim; missing / another Pariwar’s (RLS hides it) ⇒ null', async () => {
    const hook = loadFieldWorkerGateDistrict();
    getFieldWorker.mockResolvedValueOnce({ district: 'Patna ' });
    const found = req();
    await (hook as (r: FastifyRequest) => Promise<void>)(found);
    expect(found.fieldWorkerGateDistrict).toBe('Patna ');
    expect(getFieldWorker).toHaveBeenLastCalledWith({}, P, FW);
    getFieldWorker.mockResolvedValueOnce(null);
    const missing = req();
    await (hook as (r: FastifyRequest) => Promise<void>)(missing);
    expect(missing.fieldWorkerGateDistrict).toBeNull();
    expect(fieldWorkerGateDistrict(missing)).toBeNull();
    expect(fieldWorkerGateDistrict(req())).toBeNull(); // never stashed ⇒ deny
  });

  it('a NULL target is refused for a Pariwar Admin too (the real check) — CONTROL: the same grant passes a real district', () => {
    const pa = [{ pariwarId: P, role: 'pariwar_admin', scopeDimension: 'pariwar', scopeValue: P }] as const;
    for (const key of ['field_worker.approve', 'field_worker.read_code', 'field_worker.view']) {
      expect(rbac.hasPermission([...pa], key, { pariwarId: P, dimension: 'district', value: null }), key).toBe(false);
      expect(rbac.hasPermission([...pa], key, { pariwarId: P, dimension: 'district', value: 'Patna' }), key).toBe(true);
    }
  });

  it('no scope ⇒ 401 (a route registered without the scope hook)', async () => {
    await expect((loadFieldWorkerGateDistrict() as (r: FastifyRequest) => Promise<void>)(req({ scopeTx: undefined }))).rejects.toMatchObject({ statusCode: 401 });
  });
});

describe('the list gate (AD4 b) — the four cases', () => {
  it.each<[string, Record<string, unknown>, 'district' | 'pariwar', string]>([
    ['a named district', { state: 'active', district: 'Patna' }, 'district', 'Patna'],
    ['a named district, verbatim (⛔ trimmed)', { state: 'active', district: ' Patna ' }, 'district', ' Patna '],
    ['no district', { state: 'active' }, 'pariwar', P],
    ['a non-string district (never reaches here after validation) is ignored', { state: 'active', district: 7 }, 'pariwar', P],
  ])('%s', (_n, query, dimension, value) => {
    const r = req({ query });
    expect(listGateDimension(r)).toBe(dimension);
    expect(listGateValue(r)).toBe(value);
  });

  it('a District Admin passes only at a district it holds; at the pariwar dimension it fails (the real check)', () => {
    const da = [{ pariwarId: P, role: 'district_admin', scopeDimension: 'district', scopeValue: 'Patna' }] as const;
    expect(rbac.hasPermission([...da], 'field_worker.view', { pariwarId: P, dimension: 'district', value: 'Patna' })).toBe(true);
    expect(rbac.hasPermission([...da], 'field_worker.view', { pariwarId: P, dimension: 'pariwar', value: P })).toBe(false);
  });
});
