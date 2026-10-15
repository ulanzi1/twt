// Story 6.36b — the people-who-know-me constants that live twice (contracts can ⛔ import the domain) are held EQUAL here.

import {
  KNOWN_PEOPLE_LIST_LIMIT_MAX,
  KNOWN_PEOPLE_MATCH_MAX_ENTRY_LENGTH,
  KNOWN_PEOPLE_MATCH_MAX_NUMBERS,
  KNOWN_PEOPLE_MAX_LIVE_WIRE,
  KnownPeopleFoundByWire,
} from '@twt/contracts';
import { member as memberDomain, schema } from '@twt/domain';
import { describe, expect, it } from 'vitest';

describe('Story 6.36b — contracts ↔ domain lockstep', () => {
  it('the limits and the found-by vocabulary', () => {
    expect(KNOWN_PEOPLE_MATCH_MAX_NUMBERS).toBe(memberDomain.CONTACT_MATCH_MAX_NUMBERS);
    expect(KNOWN_PEOPLE_MATCH_MAX_ENTRY_LENGTH).toBe(memberDomain.CONTACT_MATCH_MAX_ENTRY_LENGTH);
    expect(KNOWN_PEOPLE_MAX_LIVE_WIRE).toBe(memberDomain.KNOWN_PEOPLE_MAX_LIVE);
    expect(KnownPeopleFoundByWire.options).toEqual([...schema.KNOWN_PEOPLE_FOUND_BY]);
  });

  it('the lists\' page bound — the wire max IS the domain cap (the app prunes saved names against it — review round 6)', () => {
    expect(memberDomain.KNOWN_PEOPLE_HISTORY_LIMIT.cap).toBe(KNOWN_PEOPLE_LIST_LIMIT_MAX);
    expect(memberDomain.KNOWN_PEOPLE_REQUESTS_LIMIT.cap).toBe(KNOWN_PEOPLE_LIST_LIMIT_MAX);
  });
});
