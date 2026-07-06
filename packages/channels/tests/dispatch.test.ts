// Central-dispatcher tests — Story 5.1 (Task 5, Task 7; AC3, AC4, AC7).
//
// Covers: the FIXED canonical channel order; per-channel category eligibility (Telegram announcements-
// only); the delivery gate; lifecycle suppression at the sole boundary; the two audit lines; the
// HMAC-not-raw-PII per-channel hash (AI-4-3(c)); the P0 immutability-violation path (AC4); and the
// audit-write resilience (AI-4-3(d) — audit failure never poisons dispatch).

import type pg from 'pg';
import { describe, expect, it } from 'vitest';

import {
  CANONICAL_CHANNEL_LADDER,
  TELEGRAM_SIDE_CHANNEL,
  createFixturePushProvider,
  type AuditPort,
  type ChannelProvider,
  type DispatchDeps,
  type SendTarget,
  alertPayloadDigest,
  createAuditPort,
  dispatch,
  isCategoryEligible,
  render,
  sha256Hex,
} from '../src/index.js';
import { canonicalJsonStringify } from '@twt/domain';
import { announcement, claimStatusChange } from './fixtures.js';

const FAKE_HMAC = 'f'.repeat(64);

const ALL_TARGETS: Partial<Record<string, SendTarget>> = {
  push: { channel: 'push', address: 'device-token', platform: 'android' },
  whatsapp: { channel: 'whatsapp', address: '+919999999999' },
  sms: { channel: 'sms', address: '+919999999999' },
  telegram: { channel: 'telegram', address: 'chat-123' },
};

function makeDeps(overrides: Partial<DispatchDeps> = {}): {
  deps: DispatchDeps;
  auditCalls: Parameters<AuditPort>[0][];
} {
  const auditCalls: Parameters<AuditPort>[0][] = [];
  const deps: DispatchDeps = {
    resolveDelivery: () => Promise.resolve(ALL_TARGETS),
    hashRendered: () => Promise.resolve(FAKE_HMAC),
    audit: (input) => {
      auditCalls.push(input);
      return Promise.resolve();
    },
    ...overrides,
  };
  return { deps, auditCalls };
}

describe('canonical channel order (AC3)', () => {
  it('CANONICAL_CHANNEL_LADDER is the fixed tuple [push, whatsapp, sms]', () => {
    expect([...CANONICAL_CHANNEL_LADDER]).toEqual(['push', 'whatsapp', 'sms']);
    expect(TELEGRAM_SIDE_CHANNEL).toBe('telegram');
  });

  it('dispatch attempts channels in canonical order: push, whatsapp, sms, telegram', async () => {
    const { deps, auditCalls } = makeDeps();
    const outcome = await dispatch(announcement(), deps);
    expect(outcome.attempts.map((a) => a.channel)).toEqual(['push', 'whatsapp', 'sms', 'telegram']);
    // The LADDER's send audit lines land in iteration order (proves the serial loop order, not a
    // post-sort). Telegram runs CONCURRENTLY (AC3 fire-and-forget side-channel), so its line's write
    // position is non-deterministic by design — assert presence, not position.
    const sendChannels = auditCalls
      .filter((c) => c.action === 'alert.channel_send')
      .map((c) => c.resourceLocator.match(/channel=([a-z]+)/)?.[1]);
    expect(sendChannels.filter((c) => c !== 'telegram')).toEqual(['push', 'whatsapp', 'sms']);
    expect(sendChannels).toContain('telegram');
  });
});

describe('category eligibility (AC3)', () => {
  it('Telegram is announcements-only', () => {
    expect(isCategoryEligible('telegram', 'alert_published')).toBe(true);
    expect(isCategoryEligible('telegram', 'module_new')).toBe(true);
    expect(isCategoryEligible('telegram', 'niyamavali_amended')).toBe(true);
    expect(isCategoryEligible('telegram', 'claim_status_change')).toBe(false);
    expect(isCategoryEligible('telegram', 'contribution_confirmed')).toBe(false);
    expect(isCategoryEligible('telegram', 'helpdesk_reply')).toBe(false);
  });

  it('ladder channels are eligible for all categories', () => {
    for (const channel of CANONICAL_CHANNEL_LADDER) {
      expect(isCategoryEligible(channel, 'claim_status_change')).toBe(true);
    }
  });

  it('push accepts every category EXCEPT step_up_otp (transport routing, Story 5.2 AC4)', () => {
    // step_up_otp is NOT push-eligible (SMS transport, Story 5.9).
    expect(isCategoryEligible('push', 'step_up_otp')).toBe(false);
    // niyamavali_amended IS eligible — it reaches push as a broadcast (epics L1486), NOT an 8th FR-71
    // category. The 7 FR-71 categories are all eligible too.
    expect(isCategoryEligible('push', 'niyamavali_amended')).toBe(true);
    for (const category of [
      'alert_published',
      'deadline_reminder',
      'contribution_confirmed',
      'contribution_mismatch',
      'claim_status_change',
      'helpdesk_reply',
      'module_new',
    ] as const) {
      expect(isCategoryEligible('push', category), category).toBe(true);
    }
  });

  it('skips Telegram for a per-member category EVEN with a telegram target present', async () => {
    const { deps } = makeDeps();
    const outcome = await dispatch(claimStatusChange(), deps);
    const telegram = outcome.attempts.find((a) => a.channel === 'telegram');
    expect(telegram?.outcome).toBe('skipped_ineligible');
    // push/whatsapp/sms still attempted (all eligible + have targets). push (Story 5.2) + whatsapp
    // (Story 5.3) are now REAL fixture transports (accepted ⇒ 'sent'); sms is still a 5.1 stub.
    expect(outcome.attempts.find((a) => a.channel === 'push')?.outcome).toBe('sent');
    expect(outcome.attempts.find((a) => a.channel === 'whatsapp')?.outcome).toBe('sent');
    expect(outcome.attempts.filter((a) => a.outcome === 'not_implemented').map((a) => a.channel)).toEqual([
      'sms',
    ]);
  });
});

describe('delivery gate (AC3)', () => {
  it('only channels with a resolved target are sent; others are skipped_no_target', async () => {
    const { deps } = makeDeps({
      resolveDelivery: () => Promise.resolve({ sms: { channel: 'sms', address: '+919999999999' } }),
    });
    const outcome = await dispatch(announcement(), deps);
    const byChannel = Object.fromEntries(outcome.attempts.map((a) => [a.channel, a.outcome]));
    expect(byChannel.sms).toBe('not_implemented'); // attempted; the 5.1 stub honestly reports its status
    expect(byChannel.push).toBe('skipped_no_target');
    expect(byChannel.whatsapp).toBe('skipped_no_target');
    expect(byChannel.telegram).toBe('skipped_no_target');
  });

  it('selects apns for an iOS push target, fcm otherwise', async () => {
    const ios = makeDeps({
      resolveDelivery: () =>
        Promise.resolve({ push: { channel: 'push', address: 'tok', platform: 'ios' } }),
    });
    const outIos = await dispatch(announcement(), ios.deps);
    expect(outIos.attempts.find((a) => a.channel === 'push')?.provider).toBe('apns');

    const android = makeDeps({
      resolveDelivery: () =>
        Promise.resolve({ push: { channel: 'push', address: 'tok', platform: 'android' } }),
    });
    const outAndroid = await dispatch(announcement(), android.deps);
    expect(outAndroid.attempts.find((a) => a.channel === 'push')?.provider).toBe('fcm');
  });

  it('errors (never silently falls back to fcm) for an iOS target when no apns provider is registered', async () => {
    const { deps } = makeDeps({
      providers: { push: [createFixturePushProvider('fcm')], whatsapp: [], sms: [], telegram: [] },
      resolveDelivery: () =>
        Promise.resolve({ push: { channel: 'push', address: 'tok', platform: 'ios' } }),
    });
    const outcome = await dispatch(announcement(), deps);
    const push = outcome.attempts.find((a) => a.channel === 'push');
    expect(push?.outcome).toBe('error');
    expect(push?.reason).toContain('apns');
  });
});

describe('audit lines (AC7 / AI-4-3(c))', () => {
  it('writes ONE dispatch line + one per sent channel, with the payload digest on the dispatch line', async () => {
    const alert = announcement();
    const { deps, auditCalls } = makeDeps();
    await dispatch(alert, deps);

    const dispatchLines = auditCalls.filter((c) => c.action === 'alert.dispatch');
    const sendLines = auditCalls.filter((c) => c.action === 'alert.channel_send');
    expect(dispatchLines).toHaveLength(1);
    expect(sendLines).toHaveLength(4); // push, whatsapp, sms, telegram (announcement → all eligible)
    expect(dispatchLines[0]!.responseStatus).toBe(200);
    // The dispatch line records EVERY channel with its honest outcome (AC7 'attempted', not a sent filter).
    expect(dispatchLines[0]!.resourceLocator).toContain(
      'channels=push:sent,whatsapp:sent,sms:not_implemented,telegram:not_implemented',
    );
  });

  it("dispatch-line payload digest matches the VALIDATED payload (parse-at-entry returns a copy)", async () => {
    const alert = announcement();
    const { deps, auditCalls } = makeDeps();
    await dispatch(alert, deps);
    const dispatchLine = auditCalls.find((c) => c.action === 'alert.dispatch');
    expect(dispatchLine!.requestPayloadHash).toBe(alertPayloadDigest(alert));
  });

  it('per-channel hash is the HMAC (not sha256 of the rendered PII)', async () => {
    const alert = announcement();
    const { deps, auditCalls } = makeDeps();
    await dispatch(alert, deps);

    const pushSend = auditCalls.find(
      (c) => c.action === 'alert.channel_send' && c.resourceLocator.includes('channel=push'),
    );
    expect(pushSend!.requestPayloadHash).toBe(FAKE_HMAC);
    // Prove it is NOT the brute-forceable raw sha256 of the rendered message.
    const rawSha = sha256Hex(canonicalJsonStringify(render(alert, 'push')));
    expect(pushSend!.requestPayloadHash).not.toBe(rawSha);
  });
});

describe('lifecycle suppression (AC3 — the sole boundary)', () => {
  it('suppresses only the named channels; the rest still send', async () => {
    const { deps } = makeDeps({
      suppression: () => Promise.resolve({ suppressed: true, reason: 'frozen_account', channels: ['push'] }),
    });
    const outcome = await dispatch(announcement(), deps);
    expect(outcome.attempts.find((a) => a.channel === 'push')?.outcome).toBe('suppressed');
    expect(outcome.attempts.find((a) => a.channel === 'sms')?.outcome).toBe('not_implemented');
  });

  it("carries the hook's reason on suppressed attempts (forensic 'why did this member get nothing')", async () => {
    const { deps } = makeDeps({
      suppression: () => Promise.resolve({ suppressed: true, reason: 'frozen_account', channels: 'all' }),
    });
    const outcome = await dispatch(announcement(), deps);
    for (const attempt of outcome.attempts) {
      expect(attempt.reason).toBe('frozen_account');
    }
  });

  it("suppression 'all' suppresses every channel", async () => {
    const { deps } = makeDeps({
      suppression: () => Promise.resolve({ suppressed: true, reason: 'frozen_account', channels: 'all' }),
    });
    const outcome = await dispatch(announcement(), deps);
    expect(outcome.attempts.every((a) => a.outcome === 'suppressed')).toBe(true);
  });
});

describe('P0 immutability-violation path (AC4)', () => {
  it('writes an immutability_violation audit line when a renderer mutates the frozen payload', async () => {
    const { deps, auditCalls } = makeDeps({
      // A renderer that ATTEMPTS to mutate the frozen alert → throws in strict mode.
      render: (alert) => {
        (alert as { time_critical: boolean }).time_critical = true;
        return { channel: 'push', title: null, body: 'x', deepLink: null };
      },
    });
    const outcome = await dispatch(announcement(), deps);
    expect(outcome.attempts.find((a) => a.channel === 'push')?.outcome).toBe('error');
    const violations = auditCalls.filter((c) => c.action === 'alert.immutability_violation');
    expect(violations.length).toBeGreaterThanOrEqual(1);
    expect(violations[0]!.responseStatus).toBe(500);
  });
});

describe('audit-write resilience (AI-4-3(d))', () => {
  it('createAuditPort swallows a write failure and never throws into dispatch', async () => {
    const errors: unknown[] = [];
    const downPool = {
      connect: () => Promise.reject(new Error('pool down')),
    } as unknown as pg.Pool;
    const port = createAuditPort(downPool, (err) => errors.push(err));
    await expect(
      port({
        pariwarId: '22222222-2222-4222-8222-222222222222',
        actorId: null,
        actorRole: null,
        action: 'alert.dispatch',
        resourceLocator: 'alert:x',
        requestPayloadHash: 'a'.repeat(64),
        responseStatus: 200,
      }),
    ).resolves.toBeUndefined();
    expect(errors).toHaveLength(1);
  });
});

/** A provider whose send always rejects (the 5.2+ real-transport failure mode). */
function throwingProvider(id: ChannelProvider['id'], channel: ChannelProvider['channel']): ChannelProvider {
  return {
    id,
    channel,
    scope: 'global',
    send: () => Promise.reject(new Error(`${id} transport down`)),
    getStatus: () => Promise.reject(new Error('not used')),
  };
}

describe('per-channel failure isolation (the critical review finding)', () => {
  it("a rejecting provider marks ONLY that channel 'error'; the rest of the ladder still runs and the dispatch line is written", async () => {
    const { deps, auditCalls } = makeDeps({
      providers: {
        push: [throwingProvider('fcm', 'push')],
        whatsapp: [throwingProvider('whatsapp-business', 'whatsapp')],
        sms: [], // empty registry entry → provider-selection error, also isolated per-channel
        telegram: [throwingProvider('telegram', 'telegram')],
      },
    });
    const outcome = await dispatch(announcement(), deps);
    const byChannel = Object.fromEntries(outcome.attempts.map((a) => [a.channel, a.outcome]));
    expect(byChannel.push).toBe('error');
    expect(byChannel.whatsapp).toBe('error');
    expect(byChannel.sms).toBe('error'); // no provider registered → isolated error, not a thrown dispatch
    expect(byChannel.telegram).toBe('error');
    // The AC7 dispatch line is STILL written, recording every channel's error.
    const dispatchLine = auditCalls.find((c) => c.action === 'alert.dispatch');
    expect(dispatchLine).toBeDefined();
    expect(dispatchLine!.resourceLocator).toContain('push:error');
  });

  it('a hashRendered (KMS) failure after send does not abort the remaining channels', async () => {
    const { deps, auditCalls } = makeDeps({
      hashRendered: () => Promise.reject(new Error('KMS down')),
    });
    const outcome = await dispatch(announcement(), deps);
    // Every send happened (stubs resolve) but hashing failed → per-channel 'error' with the reason, and
    // the dispatch line still records all four channels.
    for (const attempt of outcome.attempts) {
      expect(attempt.outcome).toBe('error');
      expect(attempt.reason).toContain('hashRendered');
    }
    expect(auditCalls.filter((c) => c.action === 'alert.dispatch')).toHaveLength(1);
  });

  it("a telegram failure never affects the ladder outcome (AC3 fire-and-forget)", async () => {
    const { deps } = makeDeps({
      providers: {
        push: [createFixturePushProvider('fcm')],
        whatsapp: [throwingProvider('whatsapp-business', 'whatsapp')],
        sms: [throwingProvider('sms-dlt', 'sms')],
        telegram: [throwingProvider('telegram', 'telegram')],
      },
    });
    const outcome = await dispatch(announcement(), deps);
    expect(outcome.attempts.find((a) => a.channel === 'telegram')?.outcome).toBe('error');
    expect(outcome.attempts.find((a) => a.channel === 'push')?.outcome).toBe('sent');
    // Order in the record is still canonical: ladder then side-channel.
    expect(outcome.attempts.map((a) => a.channel)).toEqual(['push', 'whatsapp', 'sms', 'telegram']);
  });
});

describe('honest send outcomes (audit trail must not claim delivery)', () => {
  it("a provider 'rejected' status yields outcome 'rejected', never 'sent'", async () => {
    const rejecting: ChannelProvider = {
      id: 'sms-dlt',
      channel: 'sms',
      scope: 'global',
      send: (rendered) =>
        Promise.resolve({
          channel: rendered.channel,
          provider: 'sms-dlt',
          status: 'rejected',
          providerMessageId: null,
        }),
      getStatus: () => Promise.reject(new Error('not used')),
    };
    const { deps, auditCalls } = makeDeps({
      providers: { push: [], whatsapp: [], sms: [rejecting], telegram: [] },
      resolveDelivery: () => Promise.resolve({ sms: { channel: 'sms', address: '+919999999999' } }),
    });
    const outcome = await dispatch(announcement(), deps);
    expect(outcome.attempts.find((a) => a.channel === 'sms')?.outcome).toBe('rejected');
    const sendLine = auditCalls.find((c) => c.action === 'alert.channel_send');
    expect(sendLine!.responseStatus).toBe(400);
  });
});

describe('input validation at the dispatch boundary', () => {
  it('rejects a schema-invalid alert BEFORE any send or audit write', async () => {
    const invalid = { ...announcement(), pariwar_id: 'not-a-uuid' } as Parameters<typeof dispatch>[0];
    const sends: string[] = [];
    const { deps, auditCalls } = makeDeps({
      providers: {
        push: [
          {
            id: 'fcm',
            channel: 'push',
            scope: 'global',
            send: (rendered) => {
              sends.push(rendered.channel);
              return Promise.resolve({ channel: 'push', provider: 'fcm', status: 'accepted', providerMessageId: 'x' });
            },
            getStatus: () => Promise.reject(new Error('not used')),
          },
        ],
        whatsapp: [],
        sms: [],
        telegram: [],
      },
    });
    await expect(dispatch(invalid, deps)).rejects.toThrow();
    expect(sends).toHaveLength(0);
    expect(auditCalls).toHaveLength(0);
  });

  it("freezes the validated COPY, not the caller's object (parse-at-entry semantics)", async () => {
    const alert = announcement();
    const { deps } = makeDeps();
    await dispatch(alert, deps);
    expect(Object.isFrozen(alert)).toBe(false);
  });
});
