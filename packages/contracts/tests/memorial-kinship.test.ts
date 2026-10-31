// Story 11b.5a — the family list's contracts: the relation tuple pinned to the domain's (a TEST-ONLY domain import), the ONE
// list schema (Send AND every read — KL15), the reviewer's whole-entry omissions in the shared validator (KL6 — all three act
// rules), the no-edit input, and the ONE grouping helper (KL9 / KL10 / KL11).

import { memorial as domainMemorial } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import {
  MEMORIAL_KINSHIP_LABEL_KEYS,
  MEMORIAL_KINSHIP_MAX_ENTRIES,
  MEMORIAL_KINSHIP_NAME_MAX_CODE_POINTS,
  MEMORIAL_KINSHIP_RELATIONS,
  MEMORIAL_SEND_FIELDS,
  MemorialKinshipListSchema,
  MemorialMemberView,
  MemorialReviewDecisionInput,
  MemorialReviewVersion,
  MemorialTakedownDriveResponse,
  PublicSahyogVivranFamilyMemorial,
  groupMemorialKinship,
  memorialKinshipLabelKey,
  validateMemorialDecision,
  type MemorialDecisionCandidate,
} from '../src/index.js';

describe('the fourteen relations (KL3, `-431`)', () => {
  it('by value, EQUAL to the domain tuple', () => {
    expect([...MEMORIAL_KINSHIP_RELATIONS]).toEqual([...domainMemorial.MEMORIAL_KINSHIP_RELATIONS]);
  });

  it('in DISPLAY order, fourteen, ⛔ no `other`', () => {
    expect([...MEMORIAL_KINSHIP_RELATIONS]).toEqual([
      'wife',
      'husband',
      'son',
      'daughter',
      'father',
      'mother',
      'brother',
      'sister',
      'sons_son',
      'daughters_son',
      'sons_daughter',
      'daughters_daughter',
      'daughter_in_law',
      'son_in_law',
    ]);
    expect([...MEMORIAL_KINSHIP_RELATIONS]).not.toContain('other');
  });

  it('the Send allow-list gains exactly `kinship`', () => {
    expect([...MEMORIAL_SEND_FIELDS]).toEqual([
      'body',
      'altText',
      'authorisationCopyVersion',
      'authorisationLocale',
      'keepPreviousPhoto',
      'kinship',
    ]);
  });
});

describe('MemorialKinshipListSchema — the ONE schema for Send and every read (KL4, KL15)', () => {
  const ok = (v: unknown) => MemorialKinshipListSchema.safeParse(v).success;

  it('accepts a list, a tick, and a name kept exactly as typed', () => {
    expect(ok([{ relation: 'wife', name: 'सुनीता देवी' }])).toBe(true);
    expect(ok([{ relation: 'son', name: 'अमित', inPhoto: true }])).toBe(true);
    const typed = '  अमि\u0301त \u202eX  ';
    const parsed = MemorialKinshipListSchema.parse([{ relation: 'son', name: typed }]);
    expect(parsed[0]?.name).toBe(typed); // ⛔ trimmed, ⛔ normalised
  });

  it(`accepts ${MEMORIAL_KINSHIP_MAX_ENTRIES} entries at the ${MEMORIAL_KINSHIP_NAME_MAX_CODE_POINTS}-code-point cap`, () => {
    const name = 'न'.repeat(MEMORIAL_KINSHIP_NAME_MAX_CODE_POINTS);
    const list = Array.from({ length: MEMORIAL_KINSHIP_MAX_ENTRIES }, () => ({ relation: 'son', name }));
    expect(ok(list)).toBe(true);
    // The worst case fits the Send's 32 KiB multipart part (KL4).
    expect(Buffer.byteLength(JSON.stringify(list), 'utf8')).toBeLessThan(32 * 1024);
    const astral = Array.from({ length: MEMORIAL_KINSHIP_MAX_ENTRIES }, () => ({ relation: 'son', name: '\ud800'.repeat(200) }));
    expect(Buffer.byteLength(JSON.stringify(astral), 'utf8')).toBeLessThan(32 * 1024);
  });

  it.each([
    ['an empty array (no list is the ABSENCE of the part)', []],
    ['a non-array', { relation: 'wife', name: 'x' }],
    ['too many entries', Array.from({ length: MEMORIAL_KINSHIP_MAX_ENTRIES + 1 }, () => ({ relation: 'son', name: 'x' }))],
    ['an unknown relation', [{ relation: 'uncle', name: 'x' }]],
    ['`other`', [{ relation: 'other', name: 'x' }]],
    ['a blank name', [{ relation: 'son', name: '  \u200b ' }]],
    ['an empty name', [{ relation: 'son', name: '' }]],
    ['a name over the cap', [{ relation: 'son', name: 'न'.repeat(MEMORIAL_KINSHIP_NAME_MAX_CODE_POINTS + 1) }]],
    ['an extra key', [{ relation: 'son', name: 'x', age: 7 }]],
    ['inPhoto: false', [{ relation: 'son', name: 'x', inPhoto: false }]],
    ['inPhoto: "yes"', [{ relation: 'son', name: 'x', inPhoto: 'yes' }]],
    ['a missing name', [{ relation: 'son' }]],
  ])('refuses %s', (_why, v) => {
    expect(ok(v)).toBe(false);
  });

  it('counts the cap in CODE POINTS, ⛔ UTF-16 units', () => {
    expect(ok([{ relation: 'son', name: '😀'.repeat(MEMORIAL_KINSHIP_NAME_MAX_CODE_POINTS) }])).toBe(true);
  });
});

describe('validateMemorialDecision — whole-entry kinship omissions (KL6)', () => {
  const subject = { body: 'पहला वाक्य।', altText: null, hasPhoto: false, kinshipLength: 3 };
  const leave = (...indexes: number[]) => indexes.map((index) => ({ index, reason: 'identifies_a_child' as const }));
  const awo = (d: Partial<MemorialDecisionCandidate>): MemorialDecisionCandidate => ({ action: 'approved_with_omissions', ...d });

  it('a kinship-only `approved_with_omissions` passes (the DB CHECK agrees)', () => {
    expect(validateMemorialDecision(awo({ kinshipLeftOut: leave(1) }), subject)).toEqual({ ok: true });
    expect(validateMemorialDecision(awo({ kinshipLeftOut: leave(0, 1, 2) }), subject)).toEqual({ ok: true });
  });

  it('`approved` and `not_approved` with any kinship omission are `action_shape` (⛔ never a DB 23514)', () => {
    expect(validateMemorialDecision({ action: 'approved', kinshipLeftOut: leave(0) }, subject)).toEqual({
      ok: false,
      problem: 'action_shape',
    });
    expect(
      validateMemorialDecision({ action: 'not_approved', reasonCode: 'against_the_law', kinshipLeftOut: leave(0) }, subject),
    ).toEqual({ ok: false, problem: 'action_shape' });
    // An empty array is "none" — still valid for both.
    expect(validateMemorialDecision({ action: 'approved', kinshipLeftOut: [] }, subject)).toEqual({ ok: true });
  });

  it.each([
    ['an index past the end', leave(3), 'kinship_index_out_of_range'],
    ['a negative index', leave(-1), 'kinship_index_out_of_range'],
    ['a fractional index', [{ index: 0.5, reason: 'identifies_a_child' as const }], 'kinship_index_out_of_range'],
    ['unsorted', leave(2, 1), 'kinship_order'],
    ['a duplicate', leave(1, 1), 'kinship_order'],
  ])('refuses %s', (_why, kinshipLeftOut, problem) => {
    expect(validateMemorialDecision(awo({ kinshipLeftOut }), subject)).toEqual({ ok: false, problem });
  });

  it('refuses kinship omissions on a version with ⛔ no list', () => {
    expect(validateMemorialDecision(awo({ kinshipLeftOut: leave(0) }), { ...subject, kinshipLength: null })).toEqual({
      ok: false,
      problem: 'kinship_without_list',
    });
  });
});

describe('the no-edit invariant reaches the list (AC5)', () => {
  it('kinshipLeftOut carries an index and a reason — ⛔ a name, ⛔ a relation', () => {
    const base = { action: 'approved_with_omissions' as const };
    expect(MemorialReviewDecisionInput.safeParse({ ...base, kinshipLeftOut: [{ index: 0, reason: 'against_the_law' }] }).success).toBe(true);
    for (const extra of [{ name: 'नया नाम' }, { relation: 'son' }, { text: 'x' }]) {
      expect(
        MemorialReviewDecisionInput.safeParse({ ...base, kinshipLeftOut: [{ index: 0, reason: 'against_the_law', ...extra }] }).success,
      ).toBe(false);
    }
    expect(MemorialReviewDecisionInput.safeParse({ ...base, kinship: [{ relation: 'son', name: 'x' }] }).success).toBe(false);
  });

  it('at most 20 kinship omissions', () => {
    const many = Array.from({ length: 21 }, (_, index) => ({ index, reason: 'against_the_law' }));
    expect(MemorialReviewDecisionInput.safeParse({ action: 'approved_with_omissions', kinshipLeftOut: many }).success).toBe(false);
  });
});

describe('the wire shapes (KL9 / KL10 / KL11 / KL16)', () => {
  it('the member view and the review version carry the list and the declaration flag', () => {
    expect(Object.keys(MemorialMemberView.shape)).toEqual(expect.arrayContaining(['kinship', 'kinshipLeftOut', 'guardianDeclaration']));
    expect(Object.keys(MemorialReviewVersion.shape)).toEqual(expect.arrayContaining(['kinship', 'guardianDeclaration']));
    expect(Object.keys(MemorialReviewVersion.shape.decision.unwrap().shape)).toContain('kinshipLeftOut');
  });

  it('the public wire takes grouped rows only — ⛔ index, ⛔ reason, ⛔ inPhoto, ⛔ name-level keys', () => {
    const ok = (kinship: unknown) => PublicSahyogVivranFamilyMemorial.safeParse({ words: ['x'], photo: null, kinship }).success;
    expect(ok([])).toBe(true);
    expect(ok([{ relation: 'son', names: ['अमित', 'राहुल'] }])).toBe(true);
    expect(ok([{ relation: 'son', names: [] }])).toBe(false); // an empty row is ⛔ never sent
    expect(ok([{ relation: 'son', names: [''] }])).toBe(false);
    expect(ok([{ relation: 'son', names: ['x'], inPhoto: true }])).toBe(false);
    expect(ok([{ relation: 'son', names: ['x'], index: 0 }])).toBe(false);
    expect(ok([{ relation: 'son', names: ['x'], leftOut: 1 }])).toBe(false);
    expect(ok([{ relation: 'uncle', names: ['x'] }])).toBe(false);
    // `kinship` is REQUIRED on the wire (the guard demands exactly `kinship,photo,words`).
    expect(PublicSahyogVivranFamilyMemorial.safeParse({ words: ['x'], photo: null }).success).toBe(false);
  });

  it('the take-down `shown` block carries grouped rows, ⛔ no tick', () => {
    const shown = MemorialTakedownDriveResponse.shape.shown.unwrap();
    expect(Object.keys(shown.shape)).toContain('kinship');
    const row = shown.shape.kinship.unwrap().element;
    expect(row.safeParse({ relation: 'wife', names: ['x'] }).success).toBe(true);
    expect(row.safeParse({ relation: 'wife', names: ['x'], inPhoto: true }).success).toBe(false);
  });
});

describe('groupMemorialKinship — THE grouping helper (KL10)', () => {
  const list = [
    { relation: 'son' as const, name: 'अमित' },
    { relation: 'wife' as const, name: 'सुनीता देवी', inPhoto: true as const },
    { relation: 'son' as const, name: 'राहुल' },
    { relation: 'daughters_daughter' as const, name: 'मीरा' },
    { relation: 'son' as const, name: 'अमित' },
  ];

  it('groups in the fourteen\u2019s order, names in the family\u2019s order, duplicates kept', () => {
    expect(groupMemorialKinship(list)).toEqual([
      { relation: 'wife', names: ['सुनीता देवी'] },
      { relation: 'son', names: ['अमित', 'राहुल', 'अमित'] },
      { relation: 'daughters_daughter', names: ['मीरा'] },
    ]);
  });

  it('a left-out entry leaves ⛔ no trace — the same rows as a list that never held it (interleaved input)', () => {
    const interleaved = [
      { relation: 'son' as const, name: 'अमित' },
      { relation: 'wife' as const, name: 'सुनीता देवी' },
      { relation: 'son' as const, name: 'छोड़ा गया' },
    ];
    const never = [
      { relation: 'wife' as const, name: 'सुनीता देवी' },
      { relation: 'son' as const, name: 'अमित' },
    ];
    expect(groupMemorialKinship(interleaved, [2])).toEqual(groupMemorialKinship(never));
  });

  it('a relation whose every name was left out yields ⛔ no row; all left out yields []', () => {
    expect(groupMemorialKinship(list, [3]).map((r) => r.relation)).toEqual(['wife', 'son']);
    expect(groupMemorialKinship(list, [0, 1, 2, 3, 4])).toEqual([]);
    expect(groupMemorialKinship([])).toEqual([]);
  });

  it('DROPS `inPhoto` (KL15 — ⛔ never public)', () => {
    expect(JSON.stringify(groupMemorialKinship(list))).not.toContain('inPhoto');
  });
});

describe('the label keys (KL9 — the ONE home; copy 5.2)', () => {
  it('singular for one name; a plural only where English has one', () => {
    expect(memorialKinshipLabelKey('son', 1)).toBe('kinship.son');
    expect(memorialKinshipLabelKey('son', 2)).toBe('kinship.son_plural');
    expect(memorialKinshipLabelKey('wife', 2)).toBe('kinship.wife');
    expect(memorialKinshipLabelKey('mother', 3)).toBe('kinship.mother');
  });

  it('fourteen singular + ten plural keys', () => {
    expect(MEMORIAL_KINSHIP_LABEL_KEYS).toHaveLength(24);
    expect(MEMORIAL_KINSHIP_LABEL_KEYS.filter((k) => k.endsWith('_plural'))).toHaveLength(10);
  });
});
