// Story 6.28 (OP14 (d)) — the ground-inspection read's `otherClaimsForDeath` survives the REAL admin client's parse. The
// client's response schema is NON-STRICT (an unlisted key is STRIPPED, ⛔ an error), so a mocked `listGroundInspection` alone
// would prove nothing about the wire: this drives `listGroundInspection` itself over a stubbed `fetch`.

import { afterEach, describe, expect, it, vi } from 'vitest';

import { listGroundInspection } from '../src/api/client.js';

const PARIWAR = '44444444-4444-4444-8444-444444444444';
const CLAIM = '11111111-1111-4111-8111-111111111111';

afterEach(() => vi.unstubAllGlobals());

function stubJson(body: unknown): void {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } })));
}

describe('listGroundInspection — Story 6.28 OP14 (d) through the REAL client parse', () => {
  it('keeps `otherClaimsForDeath` (count, references + stages, the two visit booleans)', async () => {
    const other = { count: 1, claims: [{ reference: 'A1B2C3D4', stage: 'paid' }], visitedElsewhere: true, alreadyVisited: true };
    stubJson({ assignments: [], otherClaimsForDeath: other });
    const out = await listGroundInspection(PARIWAR, CLAIM, { district: 'Patna' });
    expect(out.otherClaimsForDeath).toEqual(other);
  });

  it('`null` (⛔ an in-scope assignment) parses as `null`', async () => {
    stubJson({ assignments: [], otherClaimsForDeath: null });
    expect((await listGroundInspection(PARIWAR, CLAIM, { district: 'Patna' })).otherClaimsForDeath).toBeNull();
  });
});
