// Story 6.36e (code review 2026-10-24) — the contracts and the domain each spell some values by VALUE (the contracts cannot import
// the domain): how a mark was found, the requests page's cap. The domain's tuples are pinned to the SQL CHECKs
// (`member-nominee-links-policy-regression.spec.ts`); nothing tied the contracts' copies to either, so a value added on one
// side only would pass the wire and fail at the database (or be refused at the wire while the database allows it). The export's
// `state` / `answer` enums are the same kind of copy: a state added to the domain and not to the export contract would fail the
// strict parse of the WHOLE member export for everyone who holds such a link.
import { NOMINEE_LINK_REQUESTS_LIMIT_MAX, NomineeLinkFoundByWire, ProfileSection } from '@twt/contracts';
import { nominee as nomineeDomain, schema } from '@twt/domain';
import { describe, expect, it } from 'vitest';

describe('the contracts\' by-value twins match the domain', () => {
  it('how a mark was found: the wire enum is EXACTLY the domain tuple (the one the CHECK is pinned to)', () => {
    expect([...NomineeLinkFoundByWire.options].sort()).toEqual([...schema.NOMINEE_LINK_FOUND_BY].sort());
  });

  it('the export\'s states: every domain state but `erased` parses on BOTH lists, `erased` is read as `ended` (so ⛔ exported), and a state the domain lacks is refused', () => {
    const lists = ProfileSection.shape.nomineeLinks;
    const at = '2026-10-24T10:00:00.000Z';
    const marked = (state: string) => ({ rank: 1, versionNo: 1, state, answer: null, askedAt: at, name: null });
    const namedBy = (state: string) => ({ state, answer: null, askedAt: at, name: null });
    const exported = schema.NOMINEE_LINK_STATES.filter((s) => s !== 'erased')
    // the EXACT set, not a probe: the `marked` element's enum (the `namedBy` one sits behind a refinement and has no `.shape`) is the
    // domain's states minus `erased` — a value added on one side only differs here whatever word it is
    const markedFields = lists.shape.marked.element.shape
    expect([...markedFields.state.options].sort()).toEqual([...exported].sort())
    expect([...markedFields.answer.unwrap().options].sort()).toEqual([...schema.NOMINEE_LINK_ANSWERS].sort());
    expect(exported.length).toBe(schema.NOMINEE_LINK_STATES.length - 1); // `erased` IS a domain state — and the only one not exported
    for (const state of exported) {
      expect(lists.safeParse({ marked: [marked(state)], namedBy: [namedBy(state)] }).success, state).toBe(true);
    }
    expect(lists.safeParse({ marked: [marked('erased')], namedBy: [] }).success).toBe(false);
    expect(lists.safeParse({ marked: [], namedBy: [namedBy('erased')] }).success).toBe(false);
    expect(lists.safeParse({ marked: [marked('lapsed')], namedBy: [] }).success).toBe(false);
  });

  it('the export\'s answers: every domain answer parses on BOTH lists, and no other word does', () => {
    const lists = ProfileSection.shape.nomineeLinks;
    const at = '2026-10-24T10:00:00.000Z';
    for (const answer of schema.NOMINEE_LINK_ANSWERS) {
      expect(lists.safeParse({ marked: [{ rank: 2, versionNo: 3, state: 'live', answer, askedAt: at, name: null }], namedBy: [{ state: 'live', answer, askedAt: at, name: null }] }).success, answer).toBe(true);
    }
    expect(lists.safeParse({ marked: [], namedBy: [{ state: 'live', answer: 'yes', askedAt: at, name: null }] }).success).toBe(false); // the REQUEST word, ⛔ the stored one
  });

  it('the requests page cap: the contract\'s maximum is the domain\'s clamp', () => {
    expect(NOMINEE_LINK_REQUESTS_LIMIT_MAX).toBe(nomineeDomain.NOMINEE_LINK_REQUESTS_LIMIT.cap);
  });
});
