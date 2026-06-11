// Pariwar-Passport contract tests — Story 1.7 (AC-6).
//
// (1) `.strict()` discipline: every pariwar-passport object rejects unknown keys
//     (architecture §Format patterns line 3824-3826).
// (2) contract-↔-domain type assignability: a Drizzle-row wire projection extends
//     the contract (architecture §1.3 line 787-790) — same pattern as
//     _common/event-log-contract assignability, extended for the Passport.

import { describe, expect, it } from 'vitest';
import { schema } from '@twt/domain';

import { assertStrict } from '../src/_common/strict.js';
import {
  BrandingBundle,
  PariwarPassportResponse,
  type PariwarPassportResponse as PariwarPassportResponseType,
} from '../src/pariwar-passport/index.js';

// Inferred Drizzle row (Story 1.7 pariwar_passport table).
type Row = typeof schema.pariwarPassport.$inferSelect;

// Wire projection: the transport boundary serialises `createdAt` / `updatedAt`
// Date → Iso8601 string and re-brands `pariwarId` via Zod parse (the domain TS
// brand and the Zod brand are name-aligned, not symbol-identical — see the
// Story 1.7 "Branded-ID reconciliation" Dev Note). Every OTHER field must align
// structurally; a future Drizzle column change that diverges fails typecheck here.
type WireProjection = Omit<Row, 'createdAt' | 'updatedAt' | 'pariwarId'> & {
  createdAt: string;
  updatedAt: string;
  pariwarId: PariwarPassportResponseType['pariwarId'];
};
type _AssertWireFromDrizzle =
  WireProjection extends PariwarPassportResponseType ? true : never;
const _wireFromDrizzle: _AssertWireFromDrizzle = true;
void _wireFromDrizzle;

const VALID_WIRE = {
  pariwarId: '11111111-1111-1111-1111-111111111111',
  displayNameEn: 'Bihar Trust',
  displayNameHi: 'बिहार ट्रस्ट',
  legalName: 'Bihar Welfare Trust',
  trustRegistrationId: 'BR/2021/0001',
  brandingBundle: {
    logo_url: 'https://cdn.twt.local/bihar/logo.png',
    primary_color: '#0A3D62',
    secondary_color: '#FFFFFF',
  },
  localeDefault: 'hi',
  createdAt: '2026-06-11T00:00:00.000Z',
  createdBy: null,
  updatedAt: '2026-06-11T00:00:00.000Z',
};

describe('pariwar-passport contracts (Story 1.7, AC-6)', () => {
  it('schemas are .strict() (assertStrict does not throw)', () => {
    expect(() => assertStrict(BrandingBundle)).not.toThrow();
    expect(() => assertStrict(PariwarPassportResponse)).not.toThrow();
  });

  it('PariwarPassportResponse parses a valid Drizzle-shaped wire payload', () => {
    const parsed = PariwarPassportResponse.parse(VALID_WIRE);
    expect(parsed.pariwarId).toBe(VALID_WIRE.pariwarId);
    expect(parsed.localeDefault).toBe('hi');
    expect(parsed.brandingBundle.primary_color).toBe('#0A3D62');
    expect(parsed.trustRegistrationId).toBe('BR/2021/0001');
  });

  it('accepts a null trustRegistrationId (tier-3 nullable org field)', () => {
    const r = PariwarPassportResponse.safeParse({ ...VALID_WIRE, trustRegistrationId: null });
    expect(r.success).toBe(true);
  });

  it('rejects an unknown top-level key (.strict())', () => {
    const r = PariwarPassportResponse.safeParse({ ...VALID_WIRE, __extra: 'nope' });
    expect(r.success).toBe(false);
  });

  it('rejects an unknown branding_bundle key (.strict())', () => {
    const r = PariwarPassportResponse.safeParse({
      ...VALID_WIRE,
      brandingBundle: { ...VALID_WIRE.brandingBundle, font: 'Comic Sans' },
    });
    expect(r.success).toBe(false);
  });

  it('rejects a non-hex primary_color', () => {
    const r = PariwarPassportResponse.safeParse({
      ...VALID_WIRE,
      brandingBundle: { ...VALID_WIRE.brandingBundle, primary_color: 'navy' },
    });
    expect(r.success).toBe(false);
  });

  it('rejects an out-of-enum locale_default', () => {
    const r = PariwarPassportResponse.safeParse({ ...VALID_WIRE, localeDefault: 'ta' });
    expect(r.success).toBe(false);
  });

  it('rejects a non-UUID pariwarId', () => {
    const r = PariwarPassportResponse.safeParse({ ...VALID_WIRE, pariwarId: 'not-a-uuid' });
    expect(r.success).toBe(false);
  });

  it('BrandingBundle requires the mandatory keys; optionals may be omitted', () => {
    expect(BrandingBundle.safeParse(VALID_WIRE.brandingBundle).success).toBe(true);
    const missing = { primary_color: '#000000', secondary_color: '#ffffff' };
    expect(BrandingBundle.safeParse(missing).success).toBe(false); // logo_url required
  });
});
