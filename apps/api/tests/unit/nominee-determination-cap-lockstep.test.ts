// Story 6.20 — the determination's marks cap and the domain writer's version cap are ONE number
// (code review 2026-09-24, BigDev option (a)). Contracts never import `@twt/domain`, so the value is written
// twice; the API sees both, so this is where they are held equal. If the wire allowed fewer marks than the
// writer accepts versions, a declaration between the two would be undeterminable by any request (the 64-cap
// defect); if more, the writer's typed `too_many_versions` would never be reached.

import { NOMINEE_DETERMINATION_MAX_MARKS } from '@twt/contracts';
import { claim } from '@twt/domain';
import { describe, expect, it } from 'vitest';

describe('Story 6.20 — the determination cap lockstep', () => {
  it('⭐ the wire cap (contracts) EQUALS the writer cap (domain)', () => {
    expect(NOMINEE_DETERMINATION_MAX_MARKS).toBe(claim.NOMINEE_DETERMINATION_MAX_VERSIONS);
    expect(NOMINEE_DETERMINATION_MAX_MARKS).toBe(1000);
  });
});
