// Story 6.18 (AC11) — the admin card's returnable-state mirror is held EQUAL to the domain's window.
//
// ⭐ The admin app cannot import `@twt/domain` (it would pull `pg` into the bundle), so the card reads
// `CYCLE_FREEZE_RETURNABLE_STATES` from `@twt/contracts`. This test is the only thing that stops the
// two lists drifting — a drift in one direction offers a Return the server always refuses (the
// 2026-09-23b finding), in the other hides one the Pariwar Admin is entitled to.

import { CYCLE_FREEZE_RETURNABLE_STATES } from '@twt/contracts';
import { claim } from '@twt/domain';
import { describe, expect, it } from 'vitest';

describe('CYCLE_FREEZE_RETURNABLE_STATES ↔ TRUSTEE_RETURNABLE_STATES', () => {
  it('is exactly the domain window — same members, same order', () => {
    expect([...CYCLE_FREEZE_RETURNABLE_STATES]).toEqual([...claim.TRUSTEE_RETURNABLE_STATES]);
  });
});
