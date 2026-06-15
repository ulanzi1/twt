// Multi-Pariwar provisioning contract tests — Story 1.15 (AC-2).
//
// (1) `.strict()` discipline on every object contract.
// (2) REUSE proof: AddPariwarRequest embeds the 1.7 BrandingBundle (#RRGGBB hex)
//     + LocaleDefault (hi|en) shapes — not redefined copies. A non-hex colour or
//     an unknown branding key is rejected by the inherited passport rules.
// (3) The status view embeds the full PariwarPassportResponse.

import { describe, expect, it } from 'vitest';

import { assertStrict } from '../src/_common/strict.js';
import {
  AddPariwarRequest,
  DeployStatus,
  DeployStatusView,
  DeployTriggerResponse,
  ProvisionedPariwar,
} from '../src/pariwar-provisioning/index.js';

const VALID_ADD = {
  displayNameEn: 'Maharashtra Trust',
  displayNameHi: 'महाराष्ट्र ट्रस्ट',
  legalName: 'Maharashtra Welfare Trust',
  trustRegistrationId: 'MH/2024/0007',
  localeDefault: 'hi' as const,
  brandingBundle: {
    logo_url: 'https://cdn.twt.local/mh/logo.png',
    primary_color: '#0A3D62',
    secondary_color: '#FFFFFF',
  },
};

const VALID_DEPLOY_VIEW = {
  deployId: 'dep-abc123',
  status: 'triggered' as const,
  triggeredAt: '2026-06-15T00:00:00.000Z',
};

describe('pariwar-provisioning contracts (Story 1.15, AC-2)', () => {
  it('schemas are .strict() (assertStrict does not throw)', () => {
    expect(() => assertStrict(AddPariwarRequest)).not.toThrow();
    expect(() => assertStrict(DeployStatusView)).not.toThrow();
    expect(() => assertStrict(DeployTriggerResponse)).not.toThrow();
    expect(() => assertStrict(ProvisionedPariwar)).not.toThrow();
  });

  it('AddPariwarRequest parses a valid form payload', () => {
    const parsed = AddPariwarRequest.parse(VALID_ADD);
    expect(parsed.displayNameHi).toBe('महाराष्ट्र ट्रस्ट');
    expect(parsed.brandingBundle.primary_color).toBe('#0A3D62');
    expect(parsed.localeDefault).toBe('hi');
  });

  it('AddPariwarRequest treats trustRegistrationId as optional (omitted is OK)', () => {
    const withoutTrust = {
      displayNameEn: VALID_ADD.displayNameEn,
      displayNameHi: VALID_ADD.displayNameHi,
      legalName: VALID_ADD.legalName,
      localeDefault: VALID_ADD.localeDefault,
      brandingBundle: VALID_ADD.brandingBundle,
    };
    expect(AddPariwarRequest.safeParse(withoutTrust).success).toBe(true);
    expect(AddPariwarRequest.safeParse({ ...withoutTrust, trustRegistrationId: null }).success).toBe(true);
  });

  it('does NOT accept a server-minted field like pariwarId (.strict())', () => {
    const r = AddPariwarRequest.safeParse({ ...VALID_ADD, pariwarId: '11111111-1111-1111-1111-111111111111' });
    expect(r.success).toBe(false);
  });

  it('REUSES the passport BrandingBundle — rejects a non-hex colour', () => {
    const r = AddPariwarRequest.safeParse({
      ...VALID_ADD,
      brandingBundle: { ...VALID_ADD.brandingBundle, primary_color: 'navy' },
    });
    expect(r.success).toBe(false);
  });

  it('REUSES the passport BrandingBundle — rejects an unknown branding key', () => {
    const r = AddPariwarRequest.safeParse({
      ...VALID_ADD,
      brandingBundle: { ...VALID_ADD.brandingBundle, font: 'Comic Sans' },
    });
    expect(r.success).toBe(false);
  });

  it('REUSES LocaleDefault — rejects an out-of-enum locale', () => {
    const r = AddPariwarRequest.safeParse({ ...VALID_ADD, localeDefault: 'ta' });
    expect(r.success).toBe(false);
  });

  it('DeployStatus is the closed lifecycle set', () => {
    expect(DeployStatus.options).toEqual(['unknown', 'triggered', 'succeeded', 'failed']);
  });

  it('DeployTriggerResponse parses a valid response', () => {
    const parsed = DeployTriggerResponse.parse({
      pariwarId: '22222222-2222-2222-2222-222222222222',
      pathScope: '/p/22222222-2222-2222-2222-222222222222/',
      deploy: VALID_DEPLOY_VIEW,
    });
    expect(parsed.deploy.status).toBe('triggered');
    expect(parsed.pathScope).toMatch(/^\/p\/.+\/$/);
  });

  it('ProvisionedPariwar embeds the full passport + a nullable latestDeploy', () => {
    const parsed = ProvisionedPariwar.parse({
      passport: {
        pariwarId: '22222222-2222-2222-2222-222222222222',
        displayNameEn: VALID_ADD.displayNameEn,
        displayNameHi: VALID_ADD.displayNameHi,
        legalName: VALID_ADD.legalName,
        trustRegistrationId: VALID_ADD.trustRegistrationId,
        brandingBundle: VALID_ADD.brandingBundle,
        localeDefault: 'hi',
        createdAt: '2026-06-15T00:00:00.000Z',
        createdBy: null,
        updatedAt: '2026-06-15T00:00:00.000Z',
      },
      pathScope: '/p/22222222-2222-2222-2222-222222222222/',
      latestDeploy: null,
    });
    expect(parsed.latestDeploy).toBeNull();
    expect(parsed.passport.localeDefault).toBe('hi');
  });
});
