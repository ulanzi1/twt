// Story 6.19d — the certificate sweep's and child's GUARD paths with mocked deps (⛔ no DB): a test-only allowlist is
// REFUSED in production and when EMPTY (⛔ never a silently disabled or narrowed sweep — 6.19b's rule), and a child with
// ⛔ no Pariwar does nothing. The live suite (`claim-certificate-reminders-live.test.ts`) proves everything else.

import { describe, expect, it, vi } from 'vitest';

import {
  runCertificateFamilySmsChild,
  runCertificateReminderSweep,
  type ClaimCertificateReminderDeps,
} from '../src/scheduler/claim-certificate-reminders.js';

function deps(over: Partial<ClaimCertificateReminderDeps> = {}): { deps: ClaimCertificateReminderDeps; alarms: string[]; query: ReturnType<typeof vi.fn> } {
  const alarms: string[] = [];
  const query = vi.fn();
  return {
    alarms,
    query,
    deps: {
      pool: { query } as never,
      encryption: {} as never,
      smsAppClient: { isConfigured: () => true, messaging: () => ({ send: vi.fn() }) } as never,
      resolveConfig: () => Promise.resolve(null),
      onAlarm: (m) => alarms.push(m),
      ...over,
    },
  };
}

const boss = { send: vi.fn() } as never;

describe('the certificate sweep — refused, loudly, on a misused test allowlist', () => {
  it('an EMPTY allowlist ⇒ nothing swept (⛔ a query), one alarm', async () => {
    const d = deps({ pariwarAllowlist: [] });
    const r = await runCertificateReminderSweep(d.deps, boss);
    expect(r.scannedClaims).toBe(0);
    expect(d.query).not.toHaveBeenCalled();
    expect(d.alarms.join('\n')).toMatch(/REFUSED .*EMPTY/);
  });

  it('ANY allowlist while NODE_ENV is production ⇒ nothing swept, one alarm', async () => {
    const prior = process.env['NODE_ENV'];
    process.env['NODE_ENV'] = 'production';
    try {
      const d = deps({ pariwarAllowlist: ['44444444-4444-4444-8444-444444444444'] });
      const r = await runCertificateReminderSweep(d.deps, boss);
      expect(r.scannedClaims).toBe(0);
      expect(d.query).not.toHaveBeenCalled();
      expect(d.alarms.join('\n')).toMatch(/REFUSED .*production/);
    } finally {
      process.env['NODE_ENV'] = prior;
    }
  });
});

describe('the certificate child', () => {
  it('a job with ⛔ no Pariwar does nothing and alarms (ids only)', async () => {
    const d = deps();
    const r = await runCertificateFamilySmsChild(
      d.deps,
      {
        pariwarId: null,
        requestId: 'r',
        actorId: null,
        traceId: 't',
        payload: { runId: 'run-1', claimCaseId: '11111111-1111-4111-8111-111111111111', slotDay: 1, personKey: 'claimant', sentOn: '2026-10-04', late: false },
      } as never,
      'job-1',
    );
    expect(r).toEqual({ status: 'noop', reason: 'missing_pariwar' });
    expect(d.query).not.toHaveBeenCalled();
    expect(d.alarms).toEqual(['[jobs] claim-certificate-sms: missing pariwarId for run run-1']);
  });
});
