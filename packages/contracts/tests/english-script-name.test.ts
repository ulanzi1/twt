// The English-script name predicate — Story 6.18 (AC12), `2026-09-20-227` cl.9.
//
// *"No transliteration should not be counted as clerical reason. Please use English Name everywhere
// to avoid this."* ⇒ the script problem is solved at CAPTURE, and the name-check vocabulary carries
// ⛔ no transliteration reason at all.
//
// ⛔⛔ THE MOST IMPORTANT TESTS HERE ARE THE OUTPUT-SCHEMA ONES. `serializerCompiler` PARSES
// responses, so attaching this predicate to an output schema would turn every already-stored
// non-Latin name — plus both sentinels — into a 500 at read time. That failure would appear in
// production, on a read, for a person whose name was captured perfectly legitimately before this
// story shipped.

import { describe, expect, it } from 'vitest';

import {
  ENGLISH_NAME_REGEX,
  EnglishScriptName,
  isEnglishScriptName,
  NomineeBankAccountEntry,
  NomineeDeclareEntry,
  NomineeDeclareRequest,
  NomineeNameCheckResponse,
  RecordNomineeBankHelplineRequest,
  RecordNomineeBankRequest,
} from '../src/index.js';

const DEVANAGARI = 'आशा देवी';

describe('EnglishScriptName (AC12)', () => {
  it('accepts ordinary English names', () => {
    for (const name of ['Asha Devi', 'Ram Prasad Yadav', 'Sunita']) {
      expect(EnglishScriptName.safeParse(name).success, name).toBe(true);
    }
  });

  it('⭐ accepts an INITIAL and a HYPHENATED name — the forms `-226` cl.2 calls clerical', () => {
    // If the gate refused these, the three clerical reasons would be unreachable: a filer could not
    // type the initialled or married form the reasons exist to accept.
    for (const name of ['A. Devi', 'R. P. Yadav', 'Bai-Kumari', "D'Souza", "Mary-Anne O'Neill"]) {
      expect(EnglishScriptName.safeParse(name).success, name).toBe(true);
    }
  });

  it('⛔ refuses Devanagari and other non-Latin scripts', () => {
    for (const name of [DEVANAGARI, 'আশা', '阿莎', 'Аша']) {
      expect(EnglishScriptName.safeParse(name).success, name).toBe(false);
    }
  });

  it('⛔ refuses a MIXED-script name — the half-transliterated case cl.9 is really about', () => {
    expect(EnglishScriptName.safeParse('Asha देवी').success).toBe(false);
  });

  it('refuses blank / whitespace-only, and trims', () => {
    expect(EnglishScriptName.safeParse('').success).toBe(false);
    expect(EnglishScriptName.safeParse('   ').success).toBe(false);
    expect(EnglishScriptName.parse('  Asha Devi  ')).toBe('Asha Devi');
  });

  it('requires the name to START with a letter (not a dot, hyphen or apostrophe)', () => {
    for (const name of ['.Asha', '-Asha', "'Asha"]) {
      expect(EnglishScriptName.safeParse(name).success, name).toBe(false);
    }
    expect(ENGLISH_NAME_REGEX.test('Asha')).toBe(true);
  });
});

describe('AC12 — applied to EXACTLY the two INPUT fields', () => {
  const bankEntry = (accountHolderName: string) => ({
    accountHolderName,
    accountNumber: '123456789012',
    ifsc: 'SBIN0000001',
  });

  it('NomineeBankAccountEntry.accountHolderName is gated', () => {
    expect(NomineeBankAccountEntry.safeParse(bankEntry('Asha Devi')).success).toBe(true);
    expect(NomineeBankAccountEntry.safeParse(bankEntry(DEVANAGARI)).success).toBe(false);
  });

  it('NomineeDeclareEntry.name is gated', () => {
    const entry = (name: string) => ({ name, relationship: 'spouse' as const, mobile: '9876543210' });
    expect(NomineeDeclareEntry.safeParse(entry('Asha Devi')).success).toBe(true);
    expect(NomineeDeclareEntry.safeParse(entry(DEVANAGARI)).success).toBe(false);
  });
});

describe('AC12 — the FOUR bound write routes all inherit the gate from the two field edits', () => {
  // ⭐ The point of this block: AC12 changed exactly TWO fields, and that is supposed to cover FOUR
  // routes. These assertions prove the composition holds, so nobody has to trust the claim:
  //   · member bank        → `claims.routes.ts`            (RecordNomineeBankRequest)
  //   · helpline bank      → `claims.helpline.routes.ts`   (RecordNomineeBankHelplineRequest)
  //   · admin correction   → the SAME helpline route + `correctionReason`, so it re-validates with
  //                          ⛔ no extra leg — which is why it needs no separate schema here.
  //   · nominee declare    → `nominee/nominee.routes.ts`   (NomineeDeclareRequest)
  //   · life-events change → `life-events/routes.ts`       (NomineeDeclareRequest — the SAME schema;
  //                          ⭐ this is the surface behind the post-death rewrite hazard, and it was
  //                          unnamed until the story's v0.7 pass caught it).
  const bank = (holder: string) => ({
    accounts: [
      { accountHolderName: holder, accountNumber: '123456789012', ifsc: 'SBIN0000001' },
      { accountHolderName: 'Ram Prasad', accountNumber: '210987654321', ifsc: 'HDFC0000002' },
    ],
  });
  const declare = (name: string) => ({
    nominees: [{ name, relationship: 'spouse' as const, mobile: '9876543210' }],
  });

  it('⛔ a Devanagari name is refused by every bound request schema', () => {
    expect(RecordNomineeBankRequest.safeParse(bank(DEVANAGARI)).success).toBe(false);
    expect(RecordNomineeBankHelplineRequest.safeParse(bank(DEVANAGARI)).success).toBe(false);
    expect(
      RecordNomineeBankHelplineRequest.safeParse({ ...bank(DEVANAGARI), correctionReason: 'fix' }).success,
    ).toBe(false);
    expect(NomineeDeclareRequest.safeParse(declare(DEVANAGARI)).success).toBe(false);
  });

  it('an English name — including an initialled and a hyphenated one — is accepted by all of them', () => {
    for (const name of ['Asha Devi', 'A. Devi', 'Bai-Kumari']) {
      expect(RecordNomineeBankRequest.safeParse(bank(name)).success, name).toBe(true);
      expect(RecordNomineeBankHelplineRequest.safeParse(bank(name)).success, name).toBe(true);
      expect(NomineeDeclareRequest.safeParse(declare(name)).success, name).toBe(true);
    }
  });
});

describe('⛔⛔ AC12 — the gate is INPUT-ONLY: an already-stored non-Latin name still READS BACK', () => {
  // ⭐ This is the assertion that stops someone "tidying up" by reusing the predicate on the read
  // DTO. A name captured before this story shipped is a real person's real name; it must keep
  // rendering. There is ⛔ NO BACKFILL, and that only works because the gate never runs on output.
  it("the nominee-name-check READ accepts a Devanagari holder name and nominee name", () => {
    const packet = {
      claim_case_id: '00000000-0000-0000-0000-000000000001',
      claim_state: 'verifier_review',
      deceased_member_id: '00000000-0000-0000-0000-000000000002',
      accounts: [
        {
          account_rank: 1 as const,
          account_updated_at: '2026-09-20T10:00:00.000Z',
          holder_name: { state: 'readable' as const, value: DEVANAGARI },
          name_difference_note: null,
        },
        {
          account_rank: 2 as const,
          account_updated_at: '2026-09-20T10:00:00.000Z',
          holder_name: { state: 'readable' as const, value: 'Asha Devi' },
          name_difference_note: { state: 'readable' as const, value: 'the bank shortened it' },
        },
      ],
      accounts_complete: true,
      declared_nominees: [
        {
          rank: 1,
          split_pct: 100,
          relationship: 'spouse',
          nominee_name: { state: 'readable' as const, value: DEVANAGARI },
        },
      ],
      declaration_status: 'effective', // Story 6.20 (AC5) — a required response field; the INPUT-only gate is untouched
      nominee_declaration_token: 'abc123',
      nominee_declared_at: '2026-01-01T00:00:00.000Z',
      claim_filed_at: '2026-09-01T00:00:00.000Z',
      current_check: null,
      latest_check_is_stale: false,
      correction_return: null,
    };
    const parsed = NomineeNameCheckResponse.safeParse(packet);
    expect(parsed.success, JSON.stringify((parsed as { error?: unknown }).error)).toBe(true);
  });

  it('the READ also accepts both SENTINEL states, which a Latin gate would have 500-ed', () => {
    const base = {
      claim_case_id: '00000000-0000-0000-0000-000000000001',
      claim_state: 'verifier_review',
      deceased_member_id: '00000000-0000-0000-0000-000000000002',
      accounts: [
        {
          account_rank: 1 as const,
          account_updated_at: '2026-09-20T10:00:00.000Z',
          // The decrypt-failed state — a real, expected state of a live row.
          holder_name: { state: 'unreadable' as const },
          name_difference_note: null,
        },
        {
          account_rank: 2 as const,
          account_updated_at: '2026-09-20T10:00:00.000Z',
          holder_name: { state: 'readable' as const, value: 'Asha Devi' },
          name_difference_note: null,
        },
      ],
      accounts_complete: true,
      declared_nominees: [
        // The RTBF state — `anonymized` renders as ITSELF, never as a name.
        { rank: 1, split_pct: 100, relationship: 'spouse', nominee_name: { state: 'anonymized' as const } },
      ],
      declaration_status: 'effective', // Story 6.20 (AC5) — a required response field; the INPUT-only gate is untouched
      nominee_declaration_token: 'abc123',
      nominee_declared_at: null,
      claim_filed_at: '2026-09-01T00:00:00.000Z',
      current_check: null,
      latest_check_is_stale: false,
      correction_return: null,
    };
    expect(NomineeNameCheckResponse.safeParse(base).success).toBe(true);
  });
});

// ── The boundaries (code review 2026-09-20) ───────────────────────────────────────────────────
//
// ⚠ NONE of these was covered before. The suite tested `D'Souza` with a U+0027 apostrophe only, so
// the ONE character a real phone actually produces — U+2019, inserted by iOS smart punctuation into
// a React Native TextInput — was never fed to the predicate at all, and the defect it caused
// (`D’Souza` refused with "Please enter the name in English", and no way for the user to tell why)
// was invisible.
describe('EnglishScriptName — the typographic boundaries', () => {
  it("⭐ ACCEPTS a smart apostrophe (U+2019) — what a phone inserts for '", () => {
    expect(EnglishScriptName.safeParse('D’Souza').success).toBe(true);
    expect(EnglishScriptName.safeParse('D‘Souza').success).toBe(true);
    expect(EnglishScriptName.safeParse('DʼSouza').success).toBe(true);
    // The plain ASCII form keeps working — this widened, it did not move.
    expect(EnglishScriptName.safeParse("D'Souza").success).toBe(true);
  });

  it('⭐ ACCEPTS an interior non-breaking space (U+00A0) — what a paste from a document carries', () => {
    expect(EnglishScriptName.safeParse('Asha Devi').success).toBe(true);
    expect(EnglishScriptName.safeParse('Asha Devi').success).toBe(true);
  });

  it('⛔ REFUSES accented Latin letters — an explicit decision (BigDev 2026-09-20), not an oversight', () => {
    // `-227` cl.1's intent is the name AS PRINTED ON THE PASSBOOK, and an Indian bank passbook
    // prints ASCII. Widening this is a product decision; this test is what would have to change.
    for (const name of ['José', 'Zoë Fernandes', 'Ahmét']) {
      expect(EnglishScriptName.safeParse(name).success, name).toBe(false);
    }
  });

  it('⛔ REFUSES digits, interior control characters and a leading non-letter', () => {
    for (const name of ['Asha Devi 2', 'Asha\tDevi', 'Asha\nDevi', "'Asha", '-Asha', '1Asha', '.Asha']) {
      expect(EnglishScriptName.safeParse(name).success, JSON.stringify(name)).toBe(false);
    }
  });

  it('pins the length boundary exactly: 200 accepted, 201 refused', () => {
    expect(EnglishScriptName.safeParse('A'.repeat(200)).success).toBe(true);
    expect(EnglishScriptName.safeParse('A'.repeat(201)).success).toBe(false);
  });

  it('⛔ still REFUSES every non-Latin script — the widening is typographic, not linguistic', () => {
    for (const name of [DEVANAGARI, '张伟', 'Анна', 'أحمد', 'Asha देवी']) {
      expect(EnglishScriptName.safeParse(name).success, name).toBe(false);
    }
  });

  it('⭐ isEnglishScriptName is the SHARED predicate and agrees with the schema on every case above', () => {
    // ⚠ The three client forms each hand-rolled `ENGLISH_NAME_REGEX.test(x.trim())`. This pins that
    // the exported predicate and the server schema cannot disagree — the drift that would otherwise
    // show up as a name the app refuses and the server accepts.
    for (const name of [
      'Asha Devi',
      'D’Souza',
      'Asha Devi',
      '  Asha Devi  ',
      DEVANAGARI,
      'José',
      'Asha Devi 2',
      '',
    ]) {
      expect(isEnglishScriptName(name), JSON.stringify(name)).toBe(EnglishScriptName.safeParse(name).success);
    }
  });
});
