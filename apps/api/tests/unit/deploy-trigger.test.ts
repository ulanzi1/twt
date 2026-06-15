// Unit tests for the Story 1.15 deploy seam (AC-3 + AC-5).
//
// (1) deploy-config reader: PURE derivation of the /p/<id>/ path-scope + branding
//     reference from a fixture passport (proves "reads from Passport + path-scoped
//     routing" without a live Dokploy).
// (2) the dev/test FAKE: trigger → 'triggered' + in-memory latest.
// (3) the LIVE Dokploy-API client (mocked fetch): request shape + Bearer auth +
//     2xx→triggered mapping + error→502 BadGatewayError mapping.
// (4) the env resolver: fake by default; live fails CLOSED without creds.

import type { ids } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import { buildDeployConfig, buildPathScope, type DeployConfig } from '../../src/modules/pariwar-provisioning/deploy-config.js';
import {
  createFakeDeployTrigger,
  createLiveDokployDeployTrigger,
  resolveDeployTriggerFromEnv,
} from '../../src/modules/pariwar-provisioning/deploy-trigger.js';

const PID = '11111111-1111-1111-1111-111111111111';
const BRANDING = {
  logo_url: 'https://cdn.twt.local/p/logo.png',
  primary_color: '#0A3D62',
  secondary_color: '#FFFFFF',
};
const CLOCK = (): Date => new Date('2026-06-15T00:00:00.000Z');
const CFG: DeployConfig = { pariwarId: PID, pathScope: buildPathScope(PID), branding: BRANDING };

/** Minimal Response stand-in so the test does not depend on the global `Response`. */
function fakeResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

describe('deploy-config reader (Story 1.15, AC-3)', () => {
  it('buildPathScope returns the /p/<id>/ prefix', () => {
    expect(buildPathScope('abc-123')).toBe('/p/abc-123/');
  });

  it('buildDeployConfig derives path-scope + branding from a fixture passport', () => {
    const cfg = buildDeployConfig({ pariwarId: PID as ids.PariwarId, brandingBundle: BRANDING });
    expect(cfg.pariwarId).toBe(PID);
    expect(cfg.pathScope).toBe(`/p/${PID}/`);
    expect(cfg.branding).toEqual(BRANDING);
  });
});

describe('fake DeployTrigger (Story 1.15, AC-3)', () => {
  it('trigger returns a triggered status with the seam clock + stores latest', async () => {
    const fake = createFakeDeployTrigger(CLOCK);
    const r = await fake.trigger(CFG);
    expect(r.status).toBe('triggered');
    expect(r.deployId).toContain(PID);
    expect(r.triggeredAt.toISOString()).toBe('2026-06-15T00:00:00.000Z');

    const latest = await fake.latest(PID);
    expect(latest?.deployId).toBe(r.deployId);
    expect(await fake.latest('never-deployed')).toBeNull();
  });
});

describe('live Dokploy DeployTrigger (Story 1.15, AC-5)', () => {
  const API_URL = 'https://dokploy.example/api/deploy';
  const API_TOKEN = 'super-secret-token';

  it('POSTs the descriptor with Bearer auth + JSON body, maps 2xx → triggered', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const fetchImpl = (async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return fakeResponse(200, { deploymentId: 'dep-1', message: 'queued' });
    }) as unknown as typeof fetch;

    const live = createLiveDokployDeployTrigger({ apiUrl: API_URL, apiToken: API_TOKEN, fetchImpl, clock: CLOCK });
    const r = await live.trigger(CFG);

    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe(API_URL);
    expect(calls[0]!.init.method).toBe('POST');
    const headers = calls[0]!.init.headers as Record<string, string>;
    expect(headers.authorization).toBe(`Bearer ${API_TOKEN}`);
    expect(headers['content-type']).toBe('application/json');
    const body = JSON.parse(calls[0]!.init.body as string) as { pariwarId: string; pathScope: string };
    expect(body.pariwarId).toBe(PID);
    expect(body.pathScope).toBe(`/p/${PID}/`);

    expect(r.deployId).toBe('dep-1');
    expect(r.status).toBe('triggered');
    expect(r.detail).toBe('queued');
    expect((await live.latest(PID))?.deployId).toBe('dep-1');
  });

  it('maps a non-2xx Dokploy response → 502 deploy_failed (no raw throw)', async () => {
    const fetchImpl = (async () => fakeResponse(500, { message: 'boom' })) as unknown as typeof fetch;
    const live = createLiveDokployDeployTrigger({ apiUrl: API_URL, apiToken: API_TOKEN, fetchImpl, clock: CLOCK });
    await expect(live.trigger(CFG)).rejects.toMatchObject({ statusCode: 502, code: 'provisioning.deploy_failed' });
  });

  it('maps a transport failure → 502 deploy_unreachable', async () => {
    const fetchImpl = (async () => {
      throw new Error('ECONNREFUSED');
    }) as unknown as typeof fetch;
    const live = createLiveDokployDeployTrigger({ apiUrl: API_URL, apiToken: API_TOKEN, fetchImpl, clock: CLOCK });
    await expect(live.trigger(CFG)).rejects.toMatchObject({ statusCode: 502, code: 'provisioning.deploy_unreachable' });
  });
});

describe('resolveDeployTriggerFromEnv (Story 1.15)', () => {
  it('returns the fake for mode=fake', async () => {
    const t = resolveDeployTriggerFromEnv('fake', CLOCK);
    const r = await t.trigger(CFG);
    expect(r.deployId).toContain('fake-deploy');
  });

  it('FAILS CLOSED for mode=live when DOKPLOY_API_URL/TOKEN are absent', () => {
    const prevUrl = process.env['DOKPLOY_API_URL'];
    const prevTok = process.env['DOKPLOY_API_TOKEN'];
    delete process.env['DOKPLOY_API_URL'];
    delete process.env['DOKPLOY_API_TOKEN'];
    try {
      expect(() => resolveDeployTriggerFromEnv('live', CLOCK)).toThrow(/DOKPLOY_API_URL/);
    } finally {
      if (prevUrl !== undefined) process.env['DOKPLOY_API_URL'] = prevUrl;
      if (prevTok !== undefined) process.env['DOKPLOY_API_TOKEN'] = prevTok;
    }
  });
});
