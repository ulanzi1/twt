// Story 6.27d (Task 4.4) — the completion's `discrepancy` survives the REAL admin client's parse. The shared write schema
// is NON-STRICT (an unlisted key is STRIPPED), so a complete-only schema carries it: this drives the client functions
// themselves over a stubbed `fetch` — the completion KEEPS `discrepancy`, and schedule / findings / refusal still parse a
// response WITHOUT it.

import { INSPECTION_DISCREPANCY_QUESTION_KEYS } from '@twt/contracts';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  INSPECTION_DISCREPANCY_KEYS,
  completeGroundInspection,
  getInspectionDiscrepancy,
  recordGroundInspectionFindings,
  recordInspectionDiscrepancyNote,
  refuseGroundInspection,
  scheduleGroundInspection,
} from '../src/api/client.js';

const PARIWAR = '44444444-4444-4444-8444-444444444444';
const CLAIM = '11111111-1111-4111-8111-111111111111';
const GID = '33333333-3333-4333-8333-333333333333';

afterEach(() => vi.unstubAllGlobals());

function stubJson(body: unknown, status = 200): void {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })));
}

describe('the admin client — Story 6.27d', () => {
  it('the completion KEEPS `discrepancy` (each of the three shapes)', async () => {
    for (const discrepancy of [
      null,
      { state: 'withheld', reason: 'own_visit' },
      { state: 'shown', questionKeys: ['death_date'], familyDeathDate: { status: 'shown', date: '2026-06-15' }, familyAnswers: null },
    ]) {
      stubJson({ groundInspectionId: GID, status: 'completed', photoCount: 2, discrepancy });
      expect((await completeGroundInspection(PARIWAR, CLAIM, GID, {})).discrepancy).toEqual(discrepancy);
    }
  });

  it('a completion response WITHOUT `discrepancy` is refused (the field is REQUIRED on the complete-only schema)', async () => {
    stubJson({ groundInspectionId: GID, status: 'completed' });
    await expect(completeGroundInspection(PARIWAR, CLAIM, GID, {})).rejects.toThrow();
  });

  it('schedule / findings / refusal still parse a response WITHOUT it (the SHARED schema is unchanged)', async () => {
    stubJson({ groundInspectionId: GID, status: 'scheduled', created: true });
    await expect(
      scheduleGroundInspection(PARIWAR, CLAIM, { district: 'Patna', inspectionStage: 'initial', inspectionSiteType: 'family_residence', inspectorActorId: 'x', scheduledAt: 'y' }, 'k'),
    ).resolves.toMatchObject({ groundInspectionId: GID });
    stubJson({ groundInspectionId: GID, status: 'scheduled' });
    await expect(recordGroundInspectionFindings(PARIWAR, CLAIM, GID, {})).resolves.toMatchObject({ status: 'scheduled' });
    stubJson({ groundInspectionId: GID, status: 'photo_refused' });
    await expect(refuseGroundInspection(PARIWAR, CLAIM, GID, { disposition: 'photo_refused', refusalReason: 'r', reasonNote: 'n' })).resolves.toMatchObject({ status: 'photo_refused' });
  });

  it('the re-read and the note write parse their responses (notes with their author; an `unavailable` note)', async () => {
    const read = {
      discrepancy: { state: 'shown', questionKeys: ['has_died'], familyDeathDate: null, familyAnswers: null },
      notes: [{ questionKey: 'has_died', note: { status: 'unavailable' }, notedAt: '2026-07-10T13:05:00.000Z', authorActorId: 'a', authorDisplay: 'A' }],
    };
    stubJson(read);
    expect(await getInspectionDiscrepancy(PARIWAR, CLAIM, GID)).toEqual(read);
    const written = { questionKey: 'has_died', notedAt: '2026-07-10T13:05:00.000Z', authorActorId: 'a', authorDisplay: 'A' };
    stubJson(written, 201);
    expect(await recordInspectionDiscrepancyNote(PARIWAR, CLAIM, GID, { questionKey: 'has_died', note: 'x' })).toEqual(written);
  });

  it('⭐ code review round 2 (R2-14) — a neighbour\'s name / value / count on the wire is STRIPPED by the parse (completion, re-read, note write)', async () => {
    const neighbour = { neighbourName: 'Asha', valueCodes: ['not_died'], neighbourDate: '2026-06-01', count: 2 };
    const shown = { state: 'shown', questionKeys: ['has_died'], familyDeathDate: null, familyAnswers: null };
    const note = { questionKey: 'has_died', note: 'At home.', notedAt: '2026-07-10T13:05:00.000Z', authorActorId: 'a', authorDisplay: 'A' };

    stubJson({ groundInspectionId: GID, status: 'completed', ...neighbour, discrepancy: { ...shown, ...neighbour } });
    const completion = await completeGroundInspection(PARIWAR, CLAIM, GID, {});
    expect(completion).toEqual({ groundInspectionId: GID, status: 'completed', discrepancy: shown });

    stubJson({ ...neighbour, discrepancy: { ...shown, ...neighbour }, notes: [{ ...note, ...neighbour }] });
    const read = await getInspectionDiscrepancy(PARIWAR, CLAIM, GID);
    expect(read).toEqual({ discrepancy: shown, notes: [note] });

    const written = { questionKey: 'has_died', notedAt: '2026-07-10T13:05:00.000Z', authorActorId: 'a', authorDisplay: 'A' };
    stubJson({ ...written, ...neighbour, note: 'echoed text' }, 201);
    expect(await recordInspectionDiscrepancyNote(PARIWAR, CLAIM, GID, { questionKey: 'has_died', note: 'x' })).toEqual(written);
  });
});

// ⭐ Story 6.27d code review round 3 (R3-12) — the admin client's OWN key list (its completion, re-read and note schemas
// `z.enum` it) is LOCKSTEP with the contracts' (which round 2's R2-16 pins to the domain): when row 6-32 makes a key
// comparable, this goes red BEFORE the completion's parse throws after a committed completion.
describe('Story 6.27d — the admin client\'s discrepancy keys are LOCKSTEP with the contracts', () => {
  it('client = contracts, in order', () => {
    expect([...INSPECTION_DISCREPANCY_KEYS]).toEqual([...INSPECTION_DISCREPANCY_QUESTION_KEYS]);
  });
});
