// The live `dispatch()` fan-out — DB-free unit tests (Story 8.8, Task 8; AC1, AC5, AC6).
//
// Runs with NO `DATABASE_URL`, NO network and NO real timers (the AI-7-1 convention). `fanOutAlert` is
// deliberately DB-free — every impure input is injected — so the whole composition is exercisable with
// fakes, which is what makes the Decision-3 properties below assertable at all.
//
// ── WHY REJECT DOUBLES EXIST — DO NOT replace them with the shipped createFixture*Provider() ────────
// The shipped log-only fixtures ALWAYS return `status: 'accepted'` (they exist so the stack boots with
// zero Firebase/Meta/DLT config — src/providers/fixture-*.ts). A cascade driven by them delivers on
// PUSH and never falls through, so it CANNOT exercise AR-19 at all. These doubles force a non-accept
// outcome on the rungs a test needs to fail, precisely so the ladder advances. They conform to the
// FROZEN `ChannelProvider` contract — no production source is touched. (Carried forward verbatim from
// the AI-5-2 prototype's §3 rationale, which is the reason that harness could prove anything.)
//
// ── The load-bearing property this file exists for ─────────────────────────────────────────────────
// "push accepts ⇒ WA and SMS are never sent" is the cost property ratified Decision 3 buys. It is
// asserted by counting the paid providers' `send` calls at ZERO — not by inspecting the trail, which
// would pass even if a paid send had gone out and been ignored.

import type { Channel, ChannelProvider, ProviderId, SendTarget } from '@twt/channels';
import type { Alert } from '@twt/contracts';
import type { audit as auditDomain } from '@twt/domain';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const invalidatePushToken = vi.fn();
vi.mock('@twt/domain', async (importActual) => {
  const actual = await importActual<typeof import('@twt/domain')>();
  return {
    ...actual,
    notifications: { ...actual.notifications, invalidatePushToken },
  };
});

const { fanOutAlert } = await import('../src/scheduler/contribution-notify.js');
type ContributionNotifyDeps = import('../src/scheduler/contribution-notify.js').ContributionNotifyDeps;
type MemberFanOutContext = import('../src/scheduler/contribution-notify.js').MemberFanOutContext;

const PARIWAR = '11111111-1111-1111-1111-111111111111';
const MEMBER = '22222222-2222-2222-2222-222222222222';
const ALERT = '33333333-3333-3333-3333-333333333333';
const POOL = '44444444-4444-4444-4444-444444444444';

const TARGETS = {
  push: { channel: 'push', address: 'device-token', platform: 'android' } as SendTarget,
  push2: { channel: 'push', address: 'device-token-2', platform: 'android' } as SendTarget,
  whatsapp: { channel: 'whatsapp', address: '+919999999999' } as SendTarget,
  sms: { channel: 'sms', address: '+919999999999' } as SendTarget,
  telegram: { channel: 'telegram', address: 'chat-123' } as SendTarget,
};

// ── Provider doubles ────────────────────────────────────────────────────────────────────────────────

interface CountingProvider {
  readonly provider: ChannelProvider;
  sendCount(): number;
}

function makeProvider(
  id: ProviderId,
  channel: Channel,
  status: 'accepted' | 'rejected' | 'not_implemented',
  detail?: string,
): CountingProvider {
  let count = 0;
  return {
    sendCount: () => count,
    provider: {
      id,
      channel,
      scope: 'global',
      send: () => {
        count += 1;
        return Promise.resolve({
          channel,
          provider: id,
          status,
          providerMessageId: status === 'accepted' ? `${id}-msg` : null,
          ...(detail ? { detail } : {}),
        });
      },
      getStatus: (messageId: string) => Promise.resolve({ providerMessageId: messageId, state: 'unknown' as const }),
    },
  };
}

/** A push provider whose verdict varies per device address — the multi-device case. */
function makeAddressAwarePushProvider(byAddress: Record<string, 'accepted' | 'rejected'>): CountingProvider {
  let count = 0;
  return {
    sendCount: () => count,
    provider: {
      id: 'fcm',
      channel: 'push',
      scope: 'global',
      send: (_rendered, target: SendTarget) => {
        count += 1;
        const status = byAddress[target.address] ?? 'rejected';
        return Promise.resolve({
          channel: 'push' as const,
          provider: 'fcm' as const,
          status,
          providerMessageId: status === 'accepted' ? 'fcm-msg' : null,
          ...(status === 'rejected' ? { detail: 'unrecoverable_token:messaging/registration-token-not-registered' } : {}),
        });
      },
      getStatus: (messageId: string) => Promise.resolve({ providerMessageId: messageId, state: 'unknown' as const }),
    },
  };
}

/** A sleep recorder (the `tests/cascade.test.ts` convention) — records every wait WITHOUT waiting. */
function sleepRecorder(): { sleep: (ms: number) => Promise<void>; waits: number[] } {
  const waits: number[] = [];
  return { waits, sleep: (ms) => (waits.push(ms), Promise.resolve()) };
}

// ── Harness ─────────────────────────────────────────────────────────────────────────────────────────

interface Harness {
  readonly deps: ContributionNotifyDeps;
  readonly auditLines: auditDomain.AuditEntryInput[];
  readonly waits: number[];
  readonly push: CountingProvider;
  readonly whatsapp: CountingProvider;
  readonly sms: CountingProvider;
  readonly telegram: CountingProvider;
}

function harness(
  overrides: {
    push?: CountingProvider;
    whatsapp?: CountingProvider;
    sms?: CountingProvider;
    telegram?: CountingProvider;
    now?: Date;
  } = {},
): Harness {
  const push = overrides.push ?? makeProvider('fcm', 'push', 'accepted');
  const whatsapp = overrides.whatsapp ?? makeProvider('whatsapp-business', 'whatsapp', 'accepted');
  const sms = overrides.sms ?? makeProvider('sms-dlt', 'sms', 'accepted');
  const telegram = overrides.telegram ?? makeProvider('telegram', 'telegram', 'accepted');
  const auditLines: auditDomain.AuditEntryInput[] = [];
  const recorder = sleepRecorder();

  const deps: ContributionNotifyDeps = {
    pool: {} as never,
    serviceDb: {} as never,
    encryption: {} as never,
    audit: (input) => {
      auditLines.push(input);
      return Promise.resolve();
    },
    // Deterministic 64-hex stand-in for the keyed HMAC — the REAL `createRenderedMessageHash` is
    // exercised by the live-DB suite, where its output can be compared against a production-computed
    // value rather than a hand-inlined one.
    hashRendered: () => Promise.resolve('a'.repeat(64)),
    resolveProviders: () =>
      Promise.resolve({
        // Both push transports registered so `selectProvider` can route fcm-vs-apns.
        push: [push.provider, { ...push.provider, id: 'apns' as const }],
        whatsapp: [whatsapp.provider],
        sms: [sms.provider],
        telegram: [telegram.provider],
      }),
    now: () => overrides.now ?? new Date('2026-07-23T00:00:00.000Z'),
    sleep: recorder.sleep,
    onAlarm: () => undefined,
  };

  return { deps, auditLines, waits: recorder.waits, push, whatsapp, sms, telegram };
}

function cycleOpenAlert(overrides: Partial<Alert> = {}): Alert {
  return {
    alert_id: ALERT,
    pariwar_id: PARIWAR,
    member_id: MEMBER,
    time_critical: false,
    provenance_refs: { pool_id: POOL },
    created_at: '2026-07-23T00:00:00.000Z',
    created_by_actor: 'system',
    alert_category: 'alert_published',
    payload_data: { title: 'Your pool is open — Pool A', body: 'In support of the family.' },
    ...overrides,
  } as Alert;
}

function reminderAlert(): Alert {
  return {
    alert_id: ALERT,
    pariwar_id: PARIWAR,
    member_id: MEMBER,
    time_critical: false,
    provenance_refs: { pool_id: POOL },
    created_at: '2026-07-23T00:00:00.000Z',
    created_by_actor: 'system',
    alert_category: 'deadline_reminder',
    payload_data: {
      subject: 'Pool A — your pool is open',
      deadline_at: '2026-08-05T00:00:00.000Z',
      deadline_display: '05-08-2026',
    },
  } as Alert;
}

function ctx(overrides: Partial<MemberFanOutContext['targets']> = {}, rest: Partial<MemberFanOutContext> = {}): MemberFanOutContext {
  return {
    targets: {
      push: [TARGETS.push],
      whatsapp: TARGETS.whatsapp,
      sms: TARGETS.sms,
      telegram: null,
      ...overrides,
    },
    costToggleEnabled: false,
    lastEngagementAt: null,
    ...rest,
  };
}

beforeEach(() => {
  invalidatePushToken.mockReset();
  invalidatePushToken.mockResolvedValue('invalidated');
});

// ─── (1) The Decision-3 cost property ──────────────────────────────────────────────────────────────

describe('AC6 / Decision 3 — stop at the first `sent`', () => {
  it('push accepts ⇒ WA and SMS are NEVER sent (the load-bearing cost property)', async () => {
    const h = harness();
    const result = await fanOutAlert(h.deps, cycleOpenAlert(), ctx());

    expect(result.delivered).toBe(true);
    expect(result.deliveredChannel).toBe('push');
    expect(h.push.sendCount()).toBe(1);
    // Not "the trail shows no WA/SMS" — the PROVIDERS were never driven. A paid send that happened and
    // was then ignored would still cost money; only a zero call count proves it did not happen.
    expect(h.whatsapp.sendCount()).toBe(0);
    expect(h.sms.sendCount()).toBe(0);
  });

  it('push rejects, WA rejects ⇒ delivers on SMS, one attempt per rung, nothing after sms:sent', async () => {
    const h = harness({
      push: makeProvider('fcm', 'push', 'rejected', 'transient:messaging/internal-error'),
      whatsapp: makeProvider('whatsapp-business', 'whatsapp', 'rejected'),
    });
    const result = await fanOutAlert(h.deps, cycleOpenAlert(), ctx());

    expect(result.delivered).toBe(true);
    expect(result.deliveredChannel).toBe('sms');
    expect(result.trail.map((e) => `${e.channel}:${e.outcome}`)).toEqual([
      'push:rejected',
      'whatsapp:rejected',
      'sms:sent',
    ]);
    // ONE attempt per rung — `backoffMs: []` means no retries are burned (D9).
    expect(result.trail.every((e) => e.attempt === 0)).toBe(true);
    expect(h.sms.sendCount()).toBe(1);
    // The AI-5-2 "stop after SMS" property: nothing is attempted after the successful rung.
    expect(result.trail[result.trail.length - 1]!.outcome).toBe('sent');
  });

  it('a member with NO WhatsApp target advances to SMS without burning a retry', async () => {
    const h = harness({ push: makeProvider('fcm', 'push', 'rejected') });
    const result = await fanOutAlert(h.deps, cycleOpenAlert(), ctx({ whatsapp: null }));

    expect(result.trail.map((e) => `${e.channel}:${e.outcome}`)).toEqual([
      'push:rejected',
      'whatsapp:skipped_no_target',
      'sms:sent',
    ]);
    expect(h.whatsapp.sendCount()).toBe(0);
    expect(result.deliveredChannel).toBe('sms');
  });

  it('the whole ladder exhausted ⇒ delivered:false (the caller turns that into a pg-boss retry)', async () => {
    const h = harness({
      push: makeProvider('fcm', 'push', 'rejected'),
      whatsapp: makeProvider('whatsapp-business', 'whatsapp', 'rejected'),
      sms: makeProvider('sms-dlt', 'sms', 'rejected'),
    });
    const result = await fanOutAlert(h.deps, cycleOpenAlert(), ctx());
    expect(result.delivered).toBe(false);
    expect(result.deliveredChannel).toBeNull();
  });

  it('NO WORKER EVER SLEEPS A BACKOFF — the injected sleep is never called (D9)', async () => {
    const h = harness({
      push: makeProvider('fcm', 'push', 'rejected'),
      whatsapp: makeProvider('whatsapp-business', 'whatsapp', 'rejected'),
      sms: makeProvider('sms-dlt', 'sms', 'rejected'),
    });
    await fanOutAlert(h.deps, cycleOpenAlert(), ctx());
    expect(h.waits).toEqual([]); // the 30s/5m/30m default must never run, in CI or in production
  });

  it('honest outcome mapping — a `not_implemented` rung is never reported as `sent`', async () => {
    const h = harness({ push: makeProvider('fcm', 'push', 'not_implemented') });
    const result = await fanOutAlert(h.deps, cycleOpenAlert(), ctx());
    expect(result.trail[0]).toMatchObject({ channel: 'push', outcome: 'not_implemented' });
    expect(result.deliveredChannel).toBe('whatsapp');
  });
});

// ─── (2) Multi-device push + token invalidation ────────────────────────────────────────────────────

describe('AC6 — multi-device push is resolved in the COMPOSITION, not in dispatch', () => {
  it('two devices, one dead one live ⇒ the rung is `sent` and the paid channels are never reached', async () => {
    const push = makeAddressAwarePushProvider({
      'device-token': 'rejected', // the stale token
      'device-token-2': 'accepted', // the live device
    });
    const h = harness({ push });
    const result = await fanOutAlert(
      h.deps,
      cycleOpenAlert(),
      ctx({ push: [TARGETS.push, TARGETS.push2] }),
    );

    expect(result.deliveredChannel).toBe('push');
    expect(push.sendCount()).toBe(2); // every device is addressed, not just the first
    expect(h.whatsapp.sendCount()).toBe(0);
    expect(h.sms.sendCount()).toBe(0);
  });

  it('an UNRECOVERABLE token rejection feeds the shipped invalidation seam (reused, not re-classified)', async () => {
    const push = makeAddressAwarePushProvider({
      'device-token': 'rejected',
      'device-token-2': 'accepted',
    });
    const h = harness({ push });
    await fanOutAlert(h.deps, cycleOpenAlert(), ctx({ push: [TARGETS.push, TARGETS.push2] }));

    expect(invalidatePushToken).toHaveBeenCalledTimes(1);
    expect(invalidatePushToken.mock.calls[0]![1]).toBe(PARIWAR);
    expect((invalidatePushToken.mock.calls[0]![2] as SendTarget).address).toBe('device-token');
  });

  it('a TRANSIENT push rejection does NOT invalidate the token (a live device survives a quota blip)', async () => {
    const h = harness({ push: makeProvider('fcm', 'push', 'rejected', 'transient:messaging/internal-error') });
    await fanOutAlert(h.deps, cycleOpenAlert(), ctx());
    expect(invalidatePushToken).not.toHaveBeenCalled();
  });

  it('no active device at all ⇒ the push rung is skipped_no_target and the ladder advances', async () => {
    const h = harness();
    const result = await fanOutAlert(h.deps, cycleOpenAlert(), ctx({ push: [] }));
    expect(result.trail[0]).toMatchObject({ channel: 'push', outcome: 'skipped_no_target' });
    expect(result.deliveredChannel).toBe('whatsapp');
  });
});

// ─── (3) The composition ORDER: bridge first, then cost-optimization ───────────────────────────────

describe('AC6 — degraded-mode bridge FIRST, then cost-optimization', () => {
  it('a BRIDGED cycle-open sends SMS ONLY — the ladder is skipped and cost-opt is bypassed', async () => {
    const h = harness();
    // `time_critical: true` on an `alert_published` alert IS the resolved cycle-open-SMS-bridge signal
    // (Story 8.1 set it from the degraded-mode read at the cycle-freeze instant).
    const result = await fanOutAlert(
      h.deps,
      cycleOpenAlert({ time_critical: true }),
      // Recent engagement + the toggle ON would normally suppress the paid channels — the bridge must
      // override that, which is what makes this the composition-ORDER assertion and not a bridge test.
      ctx({}, { costToggleEnabled: true, lastEngagementAt: new Date('2026-07-23T00:00:00.000Z') }),
    );

    expect(result.bridged).toBe(true);
    expect(result.deliveredChannel).toBe('sms');
    expect(h.sms.sendCount()).toBe(1);
    expect(h.push.sendCount()).toBe(0); // NOT a ladder run — the bridge does not wait for push to fail
    expect(h.whatsapp.sendCount()).toBe(0);
    expect(result.costSuppressedChannels).toEqual([]); // cost-opt never even consulted
  });

  it('the bridge NEVER widens past cycle-open — a time-critical reminder still runs the ladder', async () => {
    const h = harness();
    const alert = { ...reminderAlert(), time_critical: true } as Alert;
    const result = await fanOutAlert(h.deps, alert, ctx());
    expect(result.bridged).toBe(false);
    expect(result.deliveredChannel).toBe('push');
  });

  it('NOT bridged + recent engagement ⇒ WA and SMS omitted, push still fires (push is never suppressed)', async () => {
    const h = harness({ push: makeProvider('fcm', 'push', 'rejected') });
    const result = await fanOutAlert(
      h.deps,
      reminderAlert(),
      ctx({}, { costToggleEnabled: true, lastEngagementAt: new Date('2026-07-23T00:00:00.000Z') }),
    );

    expect(result.costSuppressedChannels).toEqual(['whatsapp', 'sms']);
    expect(h.push.sendCount()).toBe(1); // push fired even though it failed — never suppressed
    expect(h.whatsapp.sendCount()).toBe(0);
    expect(h.sms.sendCount()).toBe(0);
    expect(result.delivered).toBe(false);
    // The suppression is recorded as an audit line, PII-free.
    const suppressionLine = h.auditLines.find((l) => l.action === 'alert.cost_suppression');
    expect(suppressionLine).toBeDefined();
    expect(suppressionLine!.resourceLocator).toContain(`member:${MEMBER}`);
  });

  it('a TIME-CRITICAL alert can never be cost-suppressed (the AR-18 override, checked first)', async () => {
    const h = harness();
    const result = await fanOutAlert(
      h.deps,
      { ...reminderAlert(), time_critical: true } as Alert,
      ctx({}, { costToggleEnabled: true, lastEngagementAt: new Date('2026-07-23T00:00:00.000Z') }),
    );
    expect(result.costSuppressedChannels).toEqual([]);
  });
});

// ─── (4) Telegram is independent of the ladder ─────────────────────────────────────────────────────

describe('AC6 — the Telegram side-channel fires INDEPENDENTLY of the ladder', () => {
  it('eligible for `alert_published` and fired outside the ladder (push still delivered)', async () => {
    const h = harness();
    const result = await fanOutAlert(h.deps, cycleOpenAlert(), ctx({ telegram: TARGETS.telegram }));

    expect(result.telegramMirrored).toBe(true);
    expect(h.telegram.sendCount()).toBe(1);
    // It is NOT a rung: the ladder still delivered on push, and telegram never appears on the trail.
    expect(result.deliveredChannel).toBe('push');
    expect(result.trail.some((e) => (e.channel as string) === 'telegram')).toBe(false);
  });

  it('NOT eligible for `deadline_reminder` — a per-member nudge is never mirrored to a group channel', async () => {
    const h = harness();
    const result = await fanOutAlert(h.deps, reminderAlert(), ctx({ telegram: TARGETS.telegram }));
    expect(result.telegramMirrored).toBe(false);
    expect(h.telegram.sendCount()).toBe(0);
  });

  it('NOT eligible for `contribution_confirmed` either', async () => {
    const h = harness();
    const confirmed = {
      ...cycleOpenAlert(),
      alert_category: 'contribution_confirmed',
      payload_data: { pool_id: POOL, amount_paise: 110000, period_label: '2026-07 cycle' },
    } as Alert;
    const result = await fanOutAlert(h.deps, confirmed, ctx({ telegram: TARGETS.telegram }));
    expect(result.telegramMirrored).toBe(false);
    expect(h.telegram.sendCount()).toBe(0);
  });

  it('a Telegram FAILURE changes neither `delivered` nor `deliveredChannel`', async () => {
    const h = harness({ telegram: makeProvider('telegram', 'telegram', 'rejected') });
    const result = await fanOutAlert(h.deps, cycleOpenAlert(), ctx({ telegram: TARGETS.telegram }));
    expect(result.delivered).toBe(true);
    expect(result.deliveredChannel).toBe('push');
  });
});

// ─── (5) The audit families (AC6) ──────────────────────────────────────────────────────────────────

describe('AC6 — both audit families are written through the frozen port', () => {
  it('every rung writes its `alert.dispatch` line + a per-channel `alert.channel_send` line', async () => {
    const h = harness({
      push: makeProvider('fcm', 'push', 'rejected'),
      whatsapp: makeProvider('whatsapp-business', 'whatsapp', 'rejected'),
    });
    await fanOutAlert(h.deps, cycleOpenAlert(), ctx());

    const dispatchLines = h.auditLines.filter((l) => l.action === 'alert.dispatch');
    const sendLines = h.auditLines.filter((l) => l.action === 'alert.channel_send');
    // One dispatch call per rung — the necessary consequence of the ratified per-rung composition (D9).
    expect(dispatchLines).toHaveLength(3);
    expect(sendLines.map((l) => l.resourceLocator)).toEqual([
      `alert:${ALERT};channel=push;provider=fcm`,
      `alert:${ALERT};channel=whatsapp;provider=whatsapp-business`,
      `alert:${ALERT};channel=sms;provider=sms-dlt`,
    ]);
    // AI-4-3(c): the per-channel hash is the keyed HMAC of the RENDERED message, never raw copy.
    expect(sendLines.every((l) => /^[0-9a-f]{64}$/.test(l.requestPayloadHash))).toBe(true);
  });

  it('no audit line carries a delivery ADDRESS (device token / mobile / chat id)', async () => {
    const h = harness({ push: makeProvider('fcm', 'push', 'rejected') });
    await fanOutAlert(h.deps, cycleOpenAlert(), ctx({ telegram: TARGETS.telegram }));
    const serialized = JSON.stringify(h.auditLines);
    expect(serialized).not.toContain('device-token');
    expect(serialized).not.toContain('+919999999999');
    expect(serialized).not.toContain('chat-123');
  });
});

// ─── (6) The result record is NON-PII ──────────────────────────────────────────────────────────────

describe('the recorded fan-out result is NON-PII (channels + outcomes only)', () => {
  it('carries no address anywhere in the record', async () => {
    const h = harness({ push: makeProvider('fcm', 'push', 'rejected') });
    const result = await fanOutAlert(h.deps, cycleOpenAlert(), ctx({ telegram: TARGETS.telegram }));
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('device-token');
    expect(serialized).not.toContain('+919999999999');
    expect(serialized).not.toContain('chat-123');
    expect(result.memberId).toBe(MEMBER);
  });
});
