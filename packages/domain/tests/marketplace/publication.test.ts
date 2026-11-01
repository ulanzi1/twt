// Story 12.2 (`2026-11-01-433` QE4; AC6) — the tone sign-off's content hash + the audit locators. DB-free.

import { describe, expect, it } from 'vitest';

import { moduleResourceLocator, moduleToneContentHash, partnerResourceLocator } from '../../src/marketplace/publication.js';

const MODULE = {
  nameEn: 'HDFC home loan',
  nameHi: 'एचडीएफसी गृह ऋण',
  descriptionEn: 'A home-loan offer for members.',
  descriptionHi: 'सदस्यों के लिए गृह ऋण प्रस्ताव।',
};
const PARTNER = { displayNameEn: 'HDFC', displayNameHi: 'एचडीएफसी' };

describe('moduleToneContentHash (QE4)', () => {
  it('is 64 lower-case hex (the table CHECK) and stable', () => {
    const h = moduleToneContentHash(MODULE, PARTNER);
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(moduleToneContentHash({ ...MODULE }, { ...PARTNER })).toBe(h);
  });

  it('is independent of the INPUT objects’ key order (canonical JSON)', () => {
    const reorderedModule = {
      descriptionHi: MODULE.descriptionHi,
      nameHi: MODULE.nameHi,
      descriptionEn: MODULE.descriptionEn,
      nameEn: MODULE.nameEn,
    };
    const reorderedPartner = { displayNameHi: PARTNER.displayNameHi, displayNameEn: PARTNER.displayNameEn };
    expect(moduleToneContentHash(reorderedModule, reorderedPartner)).toBe(moduleToneContentHash(MODULE, PARTNER));
  });

  it('ignores fields a member does not read (extra columns on the row)', () => {
    expect(moduleToneContentHash({ ...MODULE, leadHandoffUrl: 'https://x.example/' } as typeof MODULE, PARTNER)).toBe(
      moduleToneContentHash(MODULE, PARTNER),
    );
  });

  it.each([
    ['nameEn', 'module'],
    ['nameHi', 'module'],
    ['descriptionEn', 'module'],
    ['descriptionHi', 'module'],
    ['displayNameEn', 'partner'],
    ['displayNameHi', 'partner'],
  ] as const)('changes when %s changes', (field, side) => {
    const base = moduleToneContentHash(MODULE, PARTNER);
    const changed =
      side === 'module'
        ? moduleToneContentHash({ ...MODULE, [field]: `${MODULE[field as keyof typeof MODULE]} ` }, PARTNER)
        : moduleToneContentHash(MODULE, { ...PARTNER, [field]: `${PARTNER[field as keyof typeof PARTNER]}x` });
    expect(changed).not.toBe(base);
  });

  it('distinguishes a value moved between fields (the names are keyed, not concatenated)', () => {
    const a = moduleToneContentHash({ ...MODULE, nameEn: 'AB', descriptionEn: 'C' }, PARTNER);
    const b = moduleToneContentHash({ ...MODULE, nameEn: 'A', descriptionEn: 'BC' }, PARTNER);
    expect(a).not.toBe(b);
  });
});

describe('resource locators', () => {
  it('module/<id> (also the tone sign-off locator) and module_partner/<id>', () => {
    expect(moduleResourceLocator('6ba7b810-9dad-41d1-80b4-00c04fd430c8')).toBe('module/6ba7b810-9dad-41d1-80b4-00c04fd430c8');
    expect(partnerResourceLocator('0f8fad5b-d9cb-469f-a165-70867728950e')).toBe(
      'module_partner/0f8fad5b-d9cb-469f-a165-70867728950e',
    );
  });
});
