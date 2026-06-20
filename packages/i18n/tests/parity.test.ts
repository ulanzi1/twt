import { describe, expect, it } from 'vitest';

import { parseClassificationConfig } from '../src/classification.js';
import { checkParity, formatFinding } from '../scripts/lib.js';

const memberDefault = parseClassificationConfig({ default: 'member-facing', namespaces: {} });
const adminCommon = parseClassificationConfig({
  default: 'member-facing',
  namespaces: { admin: 'admin-facing' },
});

describe('checkParity — member-facing parity (rules 1 + 2)', () => {
  it('is clean when every en key has a non-empty hi parity entry', () => {
    const findings = checkParity({
      en: { common: { a: 'A', b: 'B' } },
      hi: { common: { a: 'क', b: 'ख' } },
      classification: memberDefault,
    });
    expect(findings).toEqual([]);
  });

  it('flags a MISSING hi parity entry, naming file + key', () => {
    const findings = checkParity({
      en: { common: { a: 'A', b: 'B' } },
      hi: { common: { a: 'क' } },
      classification: memberDefault,
    });
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ file: 'locales/hi/common.json', key: 'b' });
    expect(findings[0]?.message).toMatch(/MISSING/);
    expect(formatFinding(findings[0]!)).toContain("locales/hi/common.json :: key 'b'");
  });

  it('flags an EMPTY / whitespace-only hi parity entry', () => {
    const findings = checkParity({
      en: { common: { a: 'A' } },
      hi: { common: { a: '   ' } },
      classification: memberDefault,
    });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toMatch(/EMPTY/);
  });

  it('flags every en key when the hi namespace is entirely absent', () => {
    const findings = checkParity({
      en: { common: { a: 'A', b: 'B' } },
      hi: {},
      classification: memberDefault,
    });
    expect(findings.map((f) => f.key).sort()).toEqual(['a', 'b']);
  });
});

describe('checkParity — admin-facing exemption (rule 3)', () => {
  it('allows English-only for an admin-facing namespace', () => {
    const findings = checkParity({
      en: { admin: { x: 'X', y: 'Y' } },
      hi: {},
      classification: adminCommon,
    });
    expect(findings).toEqual([]);
  });

  it('still enforces parity on member-facing namespaces alongside an admin one', () => {
    const findings = checkParity({
      en: { admin: { x: 'X' }, common: { a: 'A' } },
      hi: {},
      classification: adminCommon,
    });
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ namespace: 'common', key: 'a' });
  });
});

describe('checkParity — empty registry no-op', () => {
  it('returns no findings for empty catalogs', () => {
    expect(checkParity({ en: {}, hi: {}, classification: memberDefault })).toEqual([]);
  });
});
