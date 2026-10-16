// Story 6.36 (AC11; I10; `-310` CF2) — where a neighbour came from is a CATEGORY of who: it is stored on the selection and
// its pings ONLY. The inspector's tables (the assignment, its photos, the discrepancy showings and notes) carry ⛔ column
// for it and ⛔ column for the staff line — the inspection screens have nothing to read it from.

import { getTableColumns } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { claimGroundInspectionDiscrepancyNotes, claimGroundInspectionDiscrepancyShowings } from '../../src/schema/claim_ground_inspection_discrepancies.js';
import { claimGroundInspectionPhotos } from '../../src/schema/claim_ground_inspection_photos.js';
import { claimGroundInspections } from '../../src/schema/claim_ground_inspections.js';
import { claimPeerMeshPings } from '../../src/schema/claim_peer_mesh_pings.js';
import { claimPeerMeshSelections } from '../../src/schema/claim_peer_mesh_selections.js';

const dbNames = (t: Parameters<typeof getTableColumns>[0]) => Object.values(getTableColumns(t)).map((c) => c.name);

describe('Story 6.36 (AC11) — the source and the staff line live on the selection and its pings ONLY', () => {
  it('the peer-mesh tables carry them (a sanity pin for the check below)', () => {
    expect(dbNames(claimPeerMeshSelections)).toEqual(expect.arrayContaining(['source', 'recent_change_before_filing', 'ranked_member_ids']));
    expect(dbNames(claimPeerMeshPings)).toContain('source');
  });

  it('⛔ on the ground inspection, its photos, the discrepancy showings or their notes', () => {
    for (const t of [claimGroundInspections, claimGroundInspectionPhotos, claimGroundInspectionDiscrepancyShowings, claimGroundInspectionDiscrepancyNotes]) {
      const names = dbNames(t);
      expect(names).not.toContain('source');
      expect(names).not.toContain('recent_change_before_filing');
      expect(names).not.toContain('ranked_member_ids');
    }
  });
});
