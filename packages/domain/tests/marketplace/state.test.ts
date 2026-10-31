// Story 12.1 (AC4) — the module lifecycle reducer + `foldModuleProjection`. DB-free.
//
// Asserts every arm; that the documentation `transitions` table and the runtime `reduce` agree on EVERY
// (state × event type) pair (the table is "documentation-only", so only a test keeps them honest); that
// unknown types are identity; prefix replay; and the projection fold, including a malformed genesis.

import { describe, expect, it } from 'vitest';

import { MODULE_EVENT_TYPES } from '../../src/marketplace/events.js';
import {
  MARKETPLACE_MODULE_STATES,
  foldModuleProjection,
  moduleStateMachine,
  nextModuleState,
  toModuleEvent,
} from '../../src/marketplace/state.js';

/** A genesis whose payload does NOT pass the strict schema (it carries only a capacity) — the fold must not throw on it. */
const MALFORMED_GENESIS = {
  type: 'module.authored',
  payload: { slot_capacity: 3 },
  eventVersion: 1,
};

/** A schema-valid genesis payload (the fold reads `slot_capacity` via the strict schema). */
function authoredPayload(slotCapacity: number | null): Record<string, unknown> {
  return {
    from_state: null,
    to_state: 'draft',
    trigger: 'module.author',
    actor: 'operator',
    module_id: '6ba7b810-9dad-41d1-80b4-00c04fd430c8',
    pariwar_id: '11111111-1111-1111-1111-111111111111',
    manifest_schema_version: 1,
    partner_id: '0f8fad5b-d9cb-469f-a165-70867728950e',
    name_en: 'Offer',
    name_hi: 'प्रस्ताव',
    description_en: 'An offer.',
    description_hi: 'एक प्रस्ताव।',
    eligibility_filter: { version: 1, clauses: [] },
    scope_filter: { version: 1, scope: 'members-all' },
    valid_from: '2026-11-01T00:00:00.000Z',
    valid_until: '2026-12-01T00:00:00.000Z',
    slot_capacity: slotCapacity,
    lead_handoff_url: 'https://leads.partner.example/x',
    lead_handoff_signing_key_secret_name: 'k',
    branding_bundle: { version: 1, logo_object_key: null, accent_color_hex: null },
  };
}

const ev = (type: string, eventVersion: number, payload: unknown = {}) => ({ type, payload, eventVersion });

describe('the documentation table (AC4 — exactly)', () => {
  it('lists exactly the seven legal arms and no module.authored row', () => {
    expect(moduleStateMachine.transitions).toEqual([
      { from: 'draft', event: 'module.scheduled', to: 'scheduled' },
      { from: 'draft', event: 'module.activated', to: 'active' },
      { from: 'scheduled', event: 'module.activated', to: 'active' },
      { from: 'active', event: 'module.lead_submitted', to: 'active' },
      { from: 'draft', event: 'module.archived', to: 'archived' },
      { from: 'scheduled', event: 'module.archived', to: 'archived' },
      { from: 'active', event: 'module.archived', to: 'archived' },
    ]);
  });

  it('the pre-genesis initial state is draft', () => {
    expect(moduleStateMachine.initial).toBe('draft');
  });

  it('the state tuple is exactly draft / scheduled / active / archived', () => {
    expect(MARKETPLACE_MODULE_STATES).toEqual(['draft', 'scheduled', 'active', 'archived']);
  });
});

describe('table / reducer agreement over EVERY (state × event type) pair', () => {
  const table = moduleStateMachine.transitions ?? [];
  for (const state of MARKETPLACE_MODULE_STATES) {
    for (const type of [...MODULE_EVENT_TYPES, 'module.restored', 'helpdesk.picked_up']) {
      const row = table.find((t) => t.from === state && t.event === type);
      it(`${state} × ${type} → ${row ? row.to : 'null (identity)'}`, () => {
        expect(nextModuleState(state, type)).toBe(row ? row.to : null);
        expect(moduleStateMachine.step(state, { type, payload: null })).toBe(row ? row.to : state);
      });
    }
  }
});

describe('arms', () => {
  it('a lead is a LEGAL same-state event (active → active), so legality is "not null", ⛔ "changed" (TR1)', () => {
    expect(nextModuleState('active', 'module.lead_submitted')).toBe('active');
    expect(nextModuleState('draft', 'module.lead_submitted')).toBeNull();
    expect(nextModuleState('scheduled', 'module.lead_submitted')).toBeNull();
  });

  it('module.authored is never a transition (TR2) — and is identity in a fold from the initial draft', () => {
    for (const s of MARKETPLACE_MODULE_STATES) expect(nextModuleState(s, 'module.authored')).toBeNull();
    expect(moduleStateMachine.fold([{ type: 'module.authored', payload: null }])).toBe('draft');
  });

  it('archived is terminal in 12.1 (C3)', () => {
    for (const t of MODULE_EVENT_TYPES) expect(nextModuleState('archived', t)).toBeNull();
  });

  it('an unknown / forward-compat type is identity', () => {
    expect(moduleStateMachine.fold([{ type: 'module.authored', payload: null }, { type: 'module.revised', payload: null }])).toBe(
      'draft',
    );
  });
});

describe('replay', () => {
  const stream = [
    ev('module.authored', 1, authoredPayload(2)),
    ev('module.scheduled', 2),
    ev('module.activated', 3),
    ev('module.lead_submitted', 4),
    ev('module.lead_submitted', 5),
    ev('module.archived', 6, { reason: 'slot_capacity_exhausted' }),
  ];

  it('every prefix replays to the state after its last event, deterministically', () => {
    const expected = ['draft', 'scheduled', 'active', 'active', 'active', 'archived'];
    for (let n = 1; n <= stream.length; n += 1) {
      const prefix = stream.slice(0, n);
      expect(moduleStateMachine.fold(prefix)).toBe(expected[n - 1]);
      expect(moduleStateMachine.fold([...prefix])).toBe(expected[n - 1]); // the same answer from a copy: no hidden state
    }
  });

  it('foldModuleProjection: state, last version, places taken, archive reason', () => {
    expect(foldModuleProjection(stream)).toEqual({
      state: 'archived',
      version: 6,
      slotsRemaining: 0,
      archiveReason: 'slot_capacity_exhausted',
    });
    expect(foldModuleProjection(stream.slice(0, 4))).toEqual({
      state: 'active',
      version: 4,
      slotsRemaining: 1,
      archiveReason: null,
    });
  });

  it('foldModuleProjection: an uncapped module keeps slotsRemaining null', () => {
    const s = [ev('module.authored', 1, authoredPayload(null)), ev('module.activated', 2), ev('module.lead_submitted', 3)];
    expect(foldModuleProjection(s)).toEqual({ state: 'active', version: 3, slotsRemaining: null, archiveReason: null });
  });

  it('foldModuleProjection NEVER throws: a malformed genesis yields slotsRemaining null', () => {
    const s = [MALFORMED_GENESIS, ev('module.activated', 2), ev('module.lead_submitted', 3)];
    expect(foldModuleProjection(s)).toEqual({ state: 'active', version: 3, slotsRemaining: null, archiveReason: null });
    expect(foldModuleProjection([ev('module.authored', 1, 'not-an-object')]).slotsRemaining).toBeNull();
  });

  // RP15 — the fold's NEGATIVE paths: an event the reducer does not apply takes no place and moves no state,
  // although the version still advances to the last row (it is the replay anchor).
  it.each([
    [
      'a lead on a DRAFT module',
      [ev('module.authored', 1, authoredPayload(3)), ev('module.lead_submitted', 2)],
      { state: 'draft', version: 2, slotsRemaining: 3, archiveReason: null },
    ],
    [
      'a lead AFTER archive',
      [
        ev('module.authored', 1, authoredPayload(3)),
        ev('module.activated', 2),
        ev('module.archived', 3, { reason: 'trustee_archived' }),
        ev('module.lead_submitted', 4),
      ],
      { state: 'archived', version: 4, slotsRemaining: 3, archiveReason: 'trustee_archived' },
    ],
    [
      'a SECOND archive (archived is terminal — the first reason stands)',
      [
        ev('module.authored', 1, authoredPayload(null)),
        ev('module.archived', 2, { reason: 'trustee_archived' }),
        ev('module.archived', 3, { reason: 'valid_until_reached' }),
      ],
      { state: 'archived', version: 3, slotsRemaining: null, archiveReason: 'trustee_archived' },
    ],
    [
      'a second activate',
      [ev('module.authored', 1, authoredPayload(2)), ev('module.activated', 2), ev('module.activated', 3)],
      { state: 'active', version: 3, slotsRemaining: 2, archiveReason: null },
    ],
    [
      'an unknown event type',
      [ev('module.authored', 1, authoredPayload(2)), ev('module.revised', 2)],
      { state: 'draft', version: 2, slotsRemaining: 2, archiveReason: null },
    ],
  ])('foldModuleProjection: %s changes nothing (RP15)', (_label, stream, expected) => {
    expect(foldModuleProjection(stream)).toEqual(expected);
  });

  it('foldModuleProjection of an empty stream is the pre-genesis draft at version 0', () => {
    expect(foldModuleProjection([])).toEqual({ state: 'draft', version: 0, slotsRemaining: null, archiveReason: null });
  });

  it('an archive with a malformed reason folds to archived with a null reason (never throws)', () => {
    const s = [ev('module.authored', 1, authoredPayload(null)), ev('module.archived', 2, { reason: 'nope' })];
    expect(foldModuleProjection(s)).toEqual({ state: 'archived', version: 2, slotsRemaining: null, archiveReason: null });
  });

  it('toModuleEvent bridges eventType → type and keeps the version', () => {
    expect(toModuleEvent({ eventType: 'module.activated', payload: { a: 1 }, eventVersion: 7 })).toEqual({
      type: 'module.activated',
      payload: { a: 1 },
      eventVersion: 7,
    });
  });
});
