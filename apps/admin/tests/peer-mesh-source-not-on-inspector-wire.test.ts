// Story 6.36 (AC11; I10; `-310` CF2 — the inspector learns "⛔ never who") — where a neighbour came from (`source`) and the
// staff line (`recentChangeBeforeFiling`) are a CATEGORY of who: ⛔ on the ground-inspection wire. The admin client's
// inspector schemas are NON-STRICT (an unlisted key is STRIPPED), so this drives the REAL client functions over a stubbed
// `fetch` with both keys INJECTED at every level — the parsed results carry ⛔ either — and checks the exported
// assignment schema's shape names neither.

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  GroundInspectionAssignment,
  completeGroundInspection,
  getInspectionDiscrepancy,
  listGroundInspection,
} from '../src/api/client.js';

const PARIWAR = '44444444-4444-4444-8444-444444444444';
const CLAIM = '11111111-1111-4111-8111-111111111111';
const GID = '33333333-3333-4333-8333-333333333333';
const FORBIDDEN = ['source', 'recentChangeBeforeFiling'];
const LEAK = { source: 'workplace', recentChangeBeforeFiling: true };

afterEach(() => vi.unstubAllGlobals());

function stubJson(body: unknown): void {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } })));
}

/** Every key name anywhere in `v`. */
function keysDeep(v: unknown, out = new Set<string>()): Set<string> {
  if (Array.isArray(v)) for (const x of v) keysDeep(x, out);
  else if (v !== null && typeof v === 'object') {
    for (const [k, x] of Object.entries(v)) {
      out.add(k);
      keysDeep(x, out);
    }
  }
  return out;
}

const assignment = {
  groundInspectionId: GID,
  district: 'Patna',
  block: null,
  inspectionStage: 'pre_approval',
  inspectionSiteType: 'home',
  inspectorActorId: 'i',
  scheduledAt: '2026-10-12T00:00:00.000Z',
  status: 'scheduled',
  refusalReason: null,
  supersedesGroundInspectionId: null,
  completedAt: null,
  structuredFindings: null,
  locationDetail: null,
  familyContact: null,
  notes: null,
  notesWithheld: null,
  photos: [],
  originalCertificateVerdict: null,
  comparedCertificateToken: null,
  deathDateSource: null,
  deathDate: null,
  deathTime: null,
};

describe('Story 6.36 (AC11) — ⛔ `source` / `recentChangeBeforeFiling` on the inspector\'s wire', () => {
  it('the assignment schema names neither key', () => {
    for (const k of FORBIDDEN) expect(Object.keys(GroundInspectionAssignment.shape)).not.toContain(k);
  });

  it('the inspector\'s read, completion and discrepancy read carry neither — even when a server sends them', async () => {
    stubJson({ assignments: [{ ...assignment, ...LEAK }], otherClaimsForDeath: null, ...LEAK });
    const read = await listGroundInspection(PARIWAR, CLAIM, { district: 'Patna' });
    expect(read.assignments).toHaveLength(1);
    for (const k of FORBIDDEN) expect(keysDeep(read).has(k)).toBe(false);

    stubJson({ groundInspectionId: GID, status: 'completed', discrepancy: { state: 'shown', questionKeys: ['has_died'], familyDeathDate: null, ...LEAK }, ...LEAK });
    const done = await completeGroundInspection(PARIWAR, CLAIM, GID, {});
    for (const k of FORBIDDEN) expect(keysDeep(done).has(k)).toBe(false);

    stubJson({ discrepancy: { state: 'shown', questionKeys: [], familyDeathDate: null, ...LEAK }, notes: [], ...LEAK });
    const disc = await getInspectionDiscrepancy(PARIWAR, CLAIM, GID);
    for (const k of FORBIDDEN) expect(keysDeep(disc).has(k)).toBe(false);
  });
});
