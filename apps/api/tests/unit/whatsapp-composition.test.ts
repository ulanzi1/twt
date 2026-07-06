// WhatsApp provider composition seam — Story 5.3 (Task 6/7; AC1, AC2). DB-FREE unit test: the two domain
// reads (getWaConfig / resolveApprovedTemplate) are mocked; the WA client cache + secret resolver are
// fakes. Asserts the real-vs-fixture branching: a fully-provisioned (Pariwar, category) → the REAL
// per-pariwar provider (token resolved, client built with the approved template); any missing gate → the
// log-only FIXTURE (scope global).

import { beforeEach, describe, expect, it, vi } from 'vitest';

const getWaConfig = vi.fn();
const resolveApprovedTemplate = vi.fn();

vi.mock('@twt/domain', async (importActual) => {
  const actual = await importActual<typeof import('@twt/domain')>();
  return { ...actual, channelConfig: { ...actual.channelConfig, getWaConfig, resolveApprovedTemplate } };
});

const { resolveWhatsappProvider } = await import('../../src/modules/channel-config/composition.js');
const { ids } = await import('@twt/domain');
import type { WhatsappAppCache, WhatsappTemplateMessage } from '@twt/channels';

const PARIWAR = ids.pariwarId('11111111-1111-1111-1111-111111111111');
const DB = {} as never; // never touched — the domain reads are mocked

/** A fake WA client cache that records the config it was built with + the message sent. */
function fakeCache(): { cache: WhatsappAppCache; built: unknown[]; sent: WhatsappTemplateMessage[] } {
  const built: unknown[] = [];
  const sent: WhatsappTemplateMessage[] = [];
  return {
    built,
    sent,
    cache: {
      messagingFor(_pariwarId, config) {
        built.push(config);
        return { send: (m) => { sent.push(m); return Promise.resolve('wamid.X'); } };
      },
    },
  };
}

const FULL_CONFIG = {
  pariwarId: PARIWAR,
  enabled: true,
  displayPhoneNumber: '+91 98765 43210',
  phoneNumberId: '1234567890',
  wabaId: 'waba',
  accessTokenSecretName: 'twt-wa-token',
  graphApiVersion: 'v21.0',
  updatedByActor: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('resolveWhatsappProvider — real-vs-fixture composition (AC1, AC2)', () => {
  beforeEach(() => {
    getWaConfig.mockReset();
    resolveApprovedTemplate.mockReset();
  });

  it('fully provisioned → the REAL per-pariwar provider (token resolved, client built with the template)', async () => {
    getWaConfig.mockResolvedValue(FULL_CONFIG);
    resolveApprovedTemplate.mockResolvedValue({ templateName: 'ann_v1', languageCode: 'en' });
    const { cache, built } = fakeCache();
    const resolveSecret = vi.fn().mockResolvedValue('resolved-token-value');

    const provider = await resolveWhatsappProvider({ db: DB, appCache: cache, resolveSecret }, PARIWAR, 'alert_published');

    expect(provider.scope).toBe('per-pariwar');
    // The token NAME was resolved to a value; the client was built with it + the graph version.
    expect(resolveSecret).toHaveBeenCalledWith('twt-wa-token');
    expect(built[0]).toEqual({ phoneNumberId: '1234567890', accessToken: 'resolved-token-value', graphApiVersion: 'v21.0' });
  });

  it.each([
    ['no config row', null, { templateName: 'ann_v1', languageCode: 'en' }],
    ['toggle off', { ...FULL_CONFIG, enabled: false }, { templateName: 'ann_v1', languageCode: 'en' }],
    ['blank credential NAME', { ...FULL_CONFIG, accessTokenSecretName: null }, { templateName: 'ann_v1', languageCode: 'en' }],
    ['no phone_number_id', { ...FULL_CONFIG, phoneNumberId: null }, { templateName: 'ann_v1', languageCode: 'en' }],
    ['no approved template', FULL_CONFIG, null],
  ])('%s → the log-only FIXTURE (scope global), token never resolved', async (_label, config, template) => {
    getWaConfig.mockResolvedValue(config);
    resolveApprovedTemplate.mockResolvedValue(template);
    const { cache, built } = fakeCache();
    const resolveSecret = vi.fn();

    const provider = await resolveWhatsappProvider({ db: DB, appCache: cache, resolveSecret }, PARIWAR, 'alert_published');

    expect(provider.scope).toBe('global'); // fixture
    expect(resolveSecret).not.toHaveBeenCalled(); // token resolved LAST, only once every gate passes
    expect(built).toHaveLength(0); // no real client built
  });
});
