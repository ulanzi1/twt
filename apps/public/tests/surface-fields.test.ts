// Field-id derivation — Story 11a.1 (Task 6, AC2; ruling D3(a)).
//
// The tier-leak leg is only as honest as the FIELD SET it is fed. D3 ruled that
// set is derived FROM THE RENDER MODEL'S OWN KEYS: to render a field you must
// first put it in the model, so the coupling is real and a newly-added field
// appears in the snapshot automatically — and fails closed as `unclassified`
// until someone classifies it. ⛔ The rejected alternative was a hand-written
// const per surface: a restatement of the render that drifts silently, which is
// the exact defect class this story exists to close.
//
// ⚠ THE MAPPING IS THE ONE PLACE DRIFT COULD HIDE. Render models are camelCase;
// matrix field ids are snake_case. The story flags this explicitly. So the
// mapping is EXPLICIT and TESTED, never a mechanical case-conversion: a
// convention-based converter would silently invent an id for a key nobody
// classified, which is precisely the failure `deriveFieldIds` must refuse.

import { describe, expect, it } from 'vitest';

import { deriveFieldIds } from '../src/lib/surface-fields.js';

describe('deriveFieldIds (D3(a))', () => {
  it('maps a model\'s own keys to their declared snake_case field ids', () => {
    const ids = deriveFieldIds({ postId: 'x', titleHi: 'y' }, { postId: 'post_id', titleHi: 'title_hi' });
    expect(ids.sort()).toEqual(['post_id', 'title_hi']);
  });

  it('EXCLUDES a key explicitly declared as not-rendered (null)', () => {
    const ids = deriveFieldIds({ title: 't', labels: {} }, { title: 'title', labels: null });
    expect(ids).toEqual(['title']);
  });

  it('THROWS on a model key with no declared mapping (⭐ the fail-closed coupling)', () => {
    // A developer adding a field to the render model and forgetting to classify it
    // is the exact scenario D3(a) exists to catch — and it must fail LOUDLY here,
    // not resolve to a plausible-looking id nobody ruled on.
    expect(() => deriveFieldIds({ title: 't', authorActorId: 'leak' }, { title: 'title' })).toThrow(
      /authorActorId/,
    );
  });

  it('THROWS on a mapping entry for a key the model does not have (the other direction)', () => {
    // Bidirectional, for the same reason the route-coverage leg is: a stale mapping
    // entry means the classification no longer describes the render.
    expect(() => deriveFieldIds({ title: 't' }, { title: 'title', removedField: 'removed_field' })).toThrow(
      /removedField/,
    );
  });

  it('returns ids sorted + deduplicated (deterministic — a snapshot must not reorder)', () => {
    const ids = deriveFieldIds({ b: 1, a: 2 }, { b: 'zeta', a: 'alpha' });
    expect(ids).toEqual(['alpha', 'zeta']);
  });

  it('is PURE — it does not mutate the model it is given', () => {
    const model = { title: 't' };
    deriveFieldIds(model, { title: 'title' });
    expect(Object.keys(model)).toEqual(['title']);
  });
});
