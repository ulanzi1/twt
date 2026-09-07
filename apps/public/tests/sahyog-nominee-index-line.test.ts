// ⭐⭐ THE NOMINEE'S NAME ON THE INDEX, AND THE RULED SENTENCE THAT FRAMES IT — Story 11b.14
// (AC7, Task 8). Trustee-ratified 2026-09-05 (Dhiraj Rahul + Kalpana Bharti); `2026-09-07-205`.
//
// ⛔⛔ THE HALF THIS FILE EXISTS FOR IS THE **DOUBLE-ABSENCE** CASE. 11b.12 authored FOUR
// `index_line.*` variants, each naming ONE absent token; ⛔ two combinations have ⛔ NO variant at
// all, and BOTH are default-shaped. ⚠ `t()` THROWS on an unsupplied param ⇒ one such row would 500
// `/sahyog` for the whole Pariwar. ⭐ Ruled: render ⛔ NOTHING — silence (`-205` cl.6).

import { describe, expect, it } from 'vitest';

import { selectIndexLineVariant, visibleSahyogColumns, type SahyogLabels } from '../src/lib/sahyog-render.js';

const labels = {
  columnNominee: 'Nominee Name',
  columnSummary: 'About this drive',
  columnName: 'In memory of',
  columnPool: 'Drive code',
  columnLetter: 'Pool',
  columnOpen: 'Details',
  columnDistrict: 'District',
  columnDate: 'Closed on',
  columnContributions: 'Contributions confirmed',
  columnProgress: 'Progress',
  columnOutcome: 'Close of cycle',
  districtUnknown: 'Not recorded',
  dateUnknown: 'Not recorded',
  viewDrive: 'View drive',
  driveLinkA11y: (code: string) => `View drive ${code}`,
} as unknown as SahyogLabels;

const ids = (stage: 'live' | 'closed' | 'verified') =>
  visibleSahyogColumns(labels, () => true, stage).map((c) => c.fieldId);

describe('⭐ the nominee name is a COLUMN, under its RULED label', () => {
  it('⭐⭐ it renders on ALL THREE stages — the ruling is about the SURFACE, ⛔ not a stage', () => {
    for (const stage of ['live', 'closed', 'verified'] as const) {
      expect(ids(stage)).toContain('nominee_account_holder_name');
    }
  });

  it('⛔⛔ its header is the ruled "Nominee Name" — ⛔ *"Account holder"* may ⛔ NOT be used', () => {
    // `2026-09-04-190` cl.2, Trustee-ratified. ⭐ Asserted at the COLUMN, ⛔ not only in the copy
    // test, because the header is where a reader actually meets the word.
    const col = visibleSahyogColumns(labels, () => true, 'closed').find(
      (c) => c.fieldId === 'nominee_account_holder_name',
    );
    expect(col?.headerLabel).toBe('Nominee Name');
    for (const c of visibleSahyogColumns(labels, () => true, 'closed')) {
      expect(c.headerLabel).not.toMatch(/account holder/i);
    }
  });

  it('⛔ ⛔ NO other nominee-bank value has a column, under any name', () => {
    // `-190` cl.1 + `-191` cl.1 withdrew them from the public surface; `-205` cl.9 authorises the
    // NAME and ⛔ nothing else.
    const all = ids('live').concat(ids('closed'), ids('verified'));
    for (const banned of ['nominee_account_number', 'nominee_ifsc', 'nominee_vpa', 'nominee_bank_name', 'nominee_branch']) {
      expect(all).not.toContain(banned);
    }
  });
});

describe('⭐ the ruled sentence is CLOSED · VERIFIED only — `D5`’s stage split', () => {
  it('⛔ ⛔ NO `index_line` on a Live row — it takes the participation sentence instead', () => {
    // ⭐ The index line was ratified against an index listing `closed` + `settled` ONLY, and it
    // occupies the CLOSE-OF-CYCLE slot — structurally null for a drive that has ⛔ not closed.
    expect(ids('live')).not.toContain('drive_index_line');
    expect(ids('closed')).toContain('drive_index_line');
    expect(ids('verified')).toContain('drive_index_line');
  });
});

describe('⭐⭐ variant selection — ONE variant per absent token (11b.12 ruling 3)', () => {
  const pick = (nomineeName: string | null, familyName: string | null, districtName: string | null) =>
    selectIndexLineVariant({ nomineeName, familyName, districtName });

  it('⭐ all three present ⇒ the FULL line', () => {
    expect(pick('Sunita Devi', 'R K Sharma', 'Lucknow')).toBe('full');
  });

  it('⭐ exactly one absent ⇒ the variant NAMING that token', () => {
    expect(pick(null, 'R K Sharma', 'Lucknow')).toBe('no_nominee');
    expect(pick('Sunita Devi', null, 'Lucknow')).toBe('no_family');
    expect(pick('Sunita Devi', 'R K Sharma', null)).toBe('no_district');
  });

  it('⛔⛔ `no_family` SWALLOWS an absent district too — ⛔ this is ⛔ NOT an oversight', () => {
    // ⚠ *"who served in {district_name} district"* modifies the DECEASED MEMBER. `no_family` drops
    // that clause with its antecedent, so it needs the NOMINEE only — and a row with no family AND
    // no district is therefore fully renderable.
    expect(pick('Sunita Devi', null, null)).toBe('no_family');
  });
});

describe('⛔⛔ THE DOUBLE-ABSENCE CASE — ⭐ SILENCE, ⛔ never a placeholder (`-205` cl.6)', () => {
  const pick = (nomineeName: string | null, familyName: string | null, districtName: string | null) =>
    selectIndexLineVariant({ nomineeName, familyName, districtName });

  it('⛔ nominee + family absent ⇒ ⛔ NO variant', () => {
    // ⚠ DEFAULT-SHAPED, ⛔ not exotic: `family_name` is null whenever publication is not authorised
    // (the fail-closed day-one posture) and `nominee_name` is null when the claim's bank details
    // were never collected (6.8 AC3's absence signal).
    expect(pick(null, null, 'Lucknow')).toBeNull();
    expect(pick(null, null, null)).toBeNull();
  });

  it('⛔ nominee + district absent ⇒ ⛔ NO variant', () => {
    // `no_nominee` needs `{district_name}`; `no_family` and `no_district` both need the nominee.
    expect(pick(null, 'R K Sharma', null)).toBeNull();
  });

  it('⭐⭐ AND `null` IS THE ANSWER, ⛔ NOT A THROW AND ⛔ NOT A FIFTH STRING', () => {
    // ⛔⛔ The two options the deferral offered are one FALSE and one FORBIDDEN: the case is
    // REACHABLE (so "demonstrate it unreachable" fails), and extending the variant set is a COPY
    // ACT on Trustee-ratified text — ⛔ not a dev agent's, and ⛔ never minted at a render site
    // (`2026-09-04-193` cl.3, the two-source defect).
    // ⇒ ⭐ the selector returns `null`, the row renders NO sentence, and the drive's facts still
    // render as columns. ⛔ No placeholder, ⛔ no partial sentence, ⛔ no marker naming what is
    // missing — *an omission that announces itself is an ENUMERATION SIGNAL.*
    expect(() => pick(null, null, null)).not.toThrow();
    expect(pick(null, null, null)).toBeNull();
  });
});
