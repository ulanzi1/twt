// `getVisibility()` — Story 11a.1 (AC11).
//
// The epic AC: *"the matrix is the single canonical source of visibility truth —
// surfaces query `getVisibility(surface_id, field_id, viewer_context)` and render
// accordingly."* No such function existed anywhere in the repo before this story.
//
// It is the LOOKUP half of the engine whose LEAK-DETECTION half already shipped
// (`evaluateSurfaceRender`): same matrix, same tier ordering, same fail-closed
// posture, asked in the other direction — *may this viewer see this field?*
// rather than *did this render leak?*. Story 11a.2's `<MatrixField>` is the
// intended consumer; ⛔ this story ships the FUNCTION, not the component.
//
// ⭐ THE LOAD-BEARING PROPERTY IS FAIL-CLOSED. An unknown surface, an undeclared
// field, or a surface that declares no fields must NEVER resolve to *visible* —
// a renderer that asks about something the matrix has never heard of must be
// told "no", with a reason, not handed a permissive default.

import { describe, expect, it } from 'vitest';

import { type PublicVsPrivateMatrix, getVisibility } from '../src/public-pages/index.js';

const MATRIX: PublicVsPrivateMatrix = {
  version: 2,
  surfaces: [
    {
      id: 'member-directory',
      route: '/members',
      renders: false,
      search_indexing_policy: 'noindex',
      cache_policy: 'edge_cacheable',
      paginated: false,
      fields: [
        { id: 'member_name', tier: 'public' },
        { id: 'district', tier: 'public' },
        { id: 'joined_on', tier: 'authenticated_member' },
        { id: 'mobile', tier: 'operator_restricted' },
        { id: 'aadhaar', tier: 'never_exposed' },
      ],
    },
  ],
  escalations: [],
  escalation_count: 0,
};

describe('getVisibility — the single canonical lookup (AC11)', () => {
  it('a public field is visible to a public viewer', () => {
    const v = getVisibility(MATRIX, 'member-directory', 'district', 'public');
    expect(v.visible).toBe(true);
    expect(v.tier).toBe('public');
  });

  it('an authenticated_member field is NOT visible to a public viewer, with a reason', () => {
    const v = getVisibility(MATRIX, 'member-directory', 'joined_on', 'public');
    expect(v.visible).toBe(false);
    expect(v.reason).toBe('above_viewer_ceiling');
    expect(v.message).toMatch(/joined_on/);
  });

  it('an authenticated_member field IS visible to a member viewer', () => {
    expect(getVisibility(MATRIX, 'member-directory', 'joined_on', 'authenticated_member').visible).toBe(true);
  });

  it('an operator_restricted field is visible ONLY to an operator viewer', () => {
    expect(getVisibility(MATRIX, 'member-directory', 'mobile', 'public').visible).toBe(false);
    expect(getVisibility(MATRIX, 'member-directory', 'mobile', 'authenticated_member').visible).toBe(false);
    expect(getVisibility(MATRIX, 'member-directory', 'mobile', 'operator_restricted').visible).toBe(true);
  });

  it('a never_exposed field is visible to NOBODY — including an operator', () => {
    for (const viewer of ['public', 'authenticated_member', 'operator_restricted'] as const) {
      const v = getVisibility(MATRIX, 'member-directory', 'aadhaar', viewer);
      expect(v.visible).toBe(false);
      expect(v.tier).toBe('never_exposed');
    }
  });

  it('FAIL-CLOSED — an undeclared field is never visible, and reports `unclassified`', () => {
    const v = getVisibility(MATRIX, 'member-directory', 'bank_account', 'operator_restricted');
    expect(v.visible).toBe(false);
    expect(v.reason).toBe('undeclared_field');
    expect(v.tier).toBe('unclassified');
  });

  it('FAIL-CLOSED — an unknown surface is never visible, and reports `unknown_surface`', () => {
    const v = getVisibility(MATRIX, 'sahyog-drive', 'amount', 'public');
    expect(v.visible).toBe(false);
    expect(v.reason).toBe('unknown_surface');
    expect(v.tier).toBe('unclassified');
  });

  it('matches evaluateSurfaceRender field-for-field (⛔ one tier ordering, not two)', async () => {
    const { evaluateSurfaceRender } = await import('../src/public-pages/index.js');
    const allFields = ['member_name', 'district', 'joined_on', 'mobile', 'aadhaar', 'bank_account'];
    for (const viewer of ['public', 'authenticated_member', 'operator_restricted'] as const) {
      const leaked = new Set(
        evaluateSurfaceRender(MATRIX, 'member-directory', viewer, allFields).map((l) => l.field),
      );
      for (const field of allFields) {
        // A field leaks ⟺ it is not visible. The two halves of the engine cannot disagree.
        expect(getVisibility(MATRIX, 'member-directory', field, viewer).visible).toBe(!leaked.has(field));
      }
    }
  });
});
