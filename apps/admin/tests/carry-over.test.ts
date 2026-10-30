// Story 6.33 review RV7 — the pure hand-over rule shared by the helpline card and the inspector's panel (the mobile app's
// `mergeCarried`, same semantics): answers carried IN but not yet applied, then the editor's own unsent drafts.

import { describe, expect, it } from 'vitest';

import { mergeCarried } from '../src/modules/helpline-claims/carry-over.js';

const a = (questionKey: string, code: string) => ({ questionKey, value: { codes: [code] } });

describe('mergeCarried', () => {
  it('nothing in, nothing out', () => {
    expect(mergeCarried([], [])).toEqual([]);
  });

  it('the not-yet-applied answers come first, then the editor’s own drafts (oldest first)', () => {
    expect(mergeCarried([a('q1', 'x'), a('q2', 'y')], [a('q3', 'z')])).toEqual([a('q1', 'x'), a('q2', 'y'), a('q3', 'z')]);
  });

  it('a draft that touches the same question WINS and moves to the END (a prerequisite is saved before its dependant)', () => {
    expect(mergeCarried([a('q1', 'old'), a('q2', 'y')], [a('q1', 'new')])).toEqual([a('q2', 'y'), a('q1', 'new')]);
  });

  it('an older answer to a question no draft touched STAYS — the instance may be replaced again before it applied anything', () => {
    expect(mergeCarried([a('q1', 'x')], [])).toEqual([a('q1', 'x')]);
  });

  it('does not mutate its inputs', () => {
    const pending = [a('q1', 'x')];
    const drafts = [a('q1', 'y')];
    mergeCarried(pending, drafts);
    expect(pending).toEqual([a('q1', 'x')]);
    expect(drafts).toEqual([a('q1', 'y')]);
  });
});
