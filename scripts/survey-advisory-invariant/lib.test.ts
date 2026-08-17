// The survey-advisory-invariant scanner's own tests (Story 10.15, Task 11).
//
// ⭐ The load-bearing pair: a banned word in a COMMENT passes (that is the record of the decision), a
// banned word in a CODE position fails. A gate that could not tell those apart would force deleting
// the reasoning to go green.

import { describe, expect, it } from 'vitest';

import { scanAdvisoryInvariant, stripComments } from './lib.js';

describe('stripComments', () => {
  it('removes // line comments while preserving line numbering', () => {
    expect(stripComments('const a = 1; // quorum\nconst b = 2;')).toEqual(['const a = 1; ', 'const b = 2;']);
  });

  it('removes SQL -- comments', () => {
    expect(stripComments('SELECT 1; -- quorum note')).toEqual(['SELECT 1; ']);
  });

  it('removes multi-line block comments, keeping the line count intact', () => {
    const src = 'a\n/* quorum\n   quorum */\nb';
    expect(stripComments(src)).toEqual(['a', '', '', 'b']);
  });

  it('removes an inline block comment and keeps the code around it', () => {
    expect(stripComments('const x = /* quorum */ 1;')).toEqual(['const x =  1;']);
  });
});

describe('scanAdvisoryInvariant', () => {
  // ⭐ The whole reason this gate is not a raw grep. Every survey file's header explains WHY the word
  // is banned; a scanner that flagged that prose would force its deletion.
  it('PASSES a banned word that appears only in a comment', () => {
    const src = [
      '// FR-58 calls this a "quorum threshold"; it ships as response_threshold because',
      '// `quorum` already names the TRUSTEE quorum (Deed Cl. 19).',
      'export const responseThreshold = null;',
    ].join('\n');
    expect(scanAdvisoryInvariant('x.ts', src)).toEqual([]);
  });

  it('FAILS a banned word in an identifier', () => {
    const findings = scanAdvisoryInvariant('x.ts', 'export const quorumThreshold = 10;');
    expect(findings).toHaveLength(1);
    expect(findings[0]?.word).toBe('quorum');
    expect(findings[0]?.line).toBe(1);
  });

  it('FAILS a banned word in a SQL column name', () => {
    const findings = scanAdvisoryInvariant('m.sql', '  "quorum_threshold" integer,');
    expect(findings).toHaveLength(1);
  });

  it('FAILS a banned word in a STRING LITERAL — copy is exactly what this protects', () => {
    // [Review][Patch] — code review of 10-15-survey-poll (2026-08-17): corrected — the key AND the
    // label both contain "quorum" on this one line, but the scanner records ONE finding per (line,
    // banned word) pair, not one per occurrence, so this is exactly 1, not "at least 1".
    const findings = scanAdvisoryInvariant('i18n.ts', "  'survey.quorum': 'Quorum reached',");
    expect(findings).toHaveLength(1);
  });

  it('FAILS a JSON copy key or value', () => {
    const findings = scanAdvisoryInvariant('polls.json', '  "threshold_met": "The quorum was reached"');
    expect(findings).toHaveLength(1);
  });

  it('is case-insensitive', () => {
    expect(scanAdvisoryInvariant('x.ts', 'const QUORUM = 1;')).toHaveLength(1);
    expect(scanAdvisoryInvariant('x.ts', 'const Quorum = 1;')).toHaveLength(1);
  });

  // The governance-verb phrases: a survey result must never read as a decision.
  it('FAILS copy claiming the survey passed or decided', () => {
    expect(scanAdvisoryInvariant('i18n.ts', "  msg: 'The survey passed'")).toHaveLength(1);
    expect(scanAdvisoryInvariant('i18n.ts', "  msg: 'the poll decides the matter'")).toHaveLength(1);
    expect(scanAdvisoryInvariant('i18n.ts', "  msg: 'survey was approved by members'")).toHaveLength(1);
  });

  it('permits the honest wording the story requires', () => {
    const ok = "  advisory: 'A survey gathers views. It does not decide anything.'";
    expect(scanAdvisoryInvariant('i18n.ts', ok)).toEqual([]);
  });

  it('reports the file and line so a failure is actionable', () => {
    const findings = scanAdvisoryInvariant('a/b.ts', 'line one\nline two\nconst quorumMet = true;');
    expect(findings[0]).toMatchObject({ file: 'a/b.ts', line: 3 });
    expect(findings[0]?.snippet).toContain('quorumMet');
  });
});
