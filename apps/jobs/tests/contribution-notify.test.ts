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
// Story 5.11 — `fanOutAlertToMembers`' own legs need the scope + the per-member target reads faked (DB-free).
const withPariwarScope = vi.fn();
const resolvePushTargets = vi.fn();
const resolveWaTarget = vi.fn();
const resolveSmsTarget = vi.fn();
const resolveTelegramTarget = vi.fn();
const getMemberLastEngagementAt = vi.fn();
vi.mock('@twt/domain', async (importActual) => {
  const actual = await importActual<typeof import('@twt/domain')>();
  return {
    ...actual,
    withPariwarScope,
    deviceToken: { ...actual.deviceToken, getMemberLastEngagementAt },
    notifications: {
      ...actual.notifications,
      invalidatePushToken,
      resolvePushTargets,
      resolveWaTarget,
      resolveSmsTarget,
      resolveTelegramTarget,
    },
  };
});

const { fanOutAlert, fanOutAlertToMembers, isAlertSmsFallbackEligible, SMS_RUNG_DETAIL } = await import(
  '../src/scheduler/contribution-notify.js'
);
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

/** Story 5.11 — a LIT notice: day 10's reminder carrying its `sms` block (FS7). */
function litReminderAlert(): Alert {
  const base = reminderAlert();
  return {
    ...base,
    payload_data: { ...base.payload_data, sms: { message: 'deadline_not_recorded', values: { pool: 'A', date: '05-08-2026' } } },
  } as Alert;
}

const trailOf = (result: { trail: readonly { channel: string; outcome: string; detail?: string }[] }): string[] =>
  result.trail.map((e) => `${e.channel}:${e.outcome}${e.detail ? `:${e.detail}` : ''}`);

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

  // ⭐ Story 5.11 (AC4, F18) — REPLACES "push rejects, WA rejects ⇒ delivers on SMS … nothing after sms:sent": that `sms:sent`
  // was the log fixture's fake (F3). The ladder still walks every rung once, and the SMS rung now ENDS NOT-SENT with a reason.
  it('push rejects, WA rejects ⇒ one attempt per rung; an UNLIT alert\'s SMS rung ends `sms_message_not_lit`, ⛔ sent', async () => {
    const h = harness({
      push: makeProvider('fcm', 'push', 'rejected', 'transient:messaging/internal-error'),
      whatsapp: makeProvider('whatsapp-business', 'whatsapp', 'rejected'),
    });
    const result = await fanOutAlert(h.deps, cycleOpenAlert(), ctx());

    expect(result.delivered).toBe(false);
    expect(result.deliveredChannel).toBeNull();
    expect(trailOf(result)).toEqual([
      'push:rejected:transient:messaging/internal-error',
      'whatsapp:rejected',
      'sms:skipped_no_target:sms_message_not_lit',
    ]);
    // ONE attempt per rung — `backoffMs: []` means no retries are burned (D9).
    expect(result.trail.every((e) => e.attempt === 0)).toBe(true);
    expect(h.sms.sendCount()).toBe(0); // I3 — the SMS provider is ⛔ driven
  });

  // ⭐ Story 5.11 (AC3) — REWRITES the 8.8 leg "a member with NO WhatsApp target advances to SMS" (trail `push:rejected,
  // whatsapp:skipped_no_target, sms:sent`): as RULED by `2026-10-23-390` Q1 B such a member is ELIGIBLE for a lit notice — the
  // rung ends `sms_send_not_wired` (the send is row 5-11b), ⛔ sent.
  it('a member with NO WhatsApp target whose push failed is ELIGIBLE for a lit notice — `sms_send_not_wired`, ⛔ sent', async () => {
    const h = harness({ push: makeProvider('fcm', 'push', 'rejected') });
    const result = await fanOutAlert(h.deps, litReminderAlert(), ctx({ whatsapp: null }));

    expect(trailOf(result)).toEqual([
      'push:rejected',
      'whatsapp:skipped_no_target',
      'sms:skipped_no_target:sms_send_not_wired',
    ]);
    expect(h.whatsapp.sendCount()).toBe(0);
    expect(h.sms.sendCount()).toBe(0);
    expect(result.delivered).toBe(false);
  });

  it('the whole ladder exhausted ⇒ delivered:false (Story 5.11: the caller records `in_app_only`, ⛔ retries)', async () => {
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
  // ⭐ Story 5.11 (FS10 (a), AC5) — REPLACES "a BRIDGED cycle-open sends SMS ONLY — the ladder is skipped": the bridge has ⛔
  // registered words, so its SMS-only send could only reach the log fixture (a fake `sent`, F21). While it stays dark a bridged
  // member runs the NORMAL ladder — they at least get the push.
  it('a BRIDGED cycle-open runs the NORMAL ladder — push delivers; the time-critical alert is never cost-suppressed', async () => {
    const h = harness();
    // `time_critical: true` on an `alert_published` alert IS the resolved cycle-open-SMS-bridge signal
    // (Story 8.1 set it from the degraded-mode read at the cycle-freeze instant).
    const result = await fanOutAlert(
      h.deps,
      cycleOpenAlert({ time_critical: true }),
      ctx({}, { costToggleEnabled: true, lastEngagementAt: new Date('2026-07-23T00:00:00.000Z') }),
    );

    expect(result.bridged).toBe(true); // the request is still reported
    expect(result.deliveredChannel).toBe('push');
    expect(h.push.sendCount()).toBe(1);
    expect(h.sms.sendCount()).toBe(0);
    expect(result.costSuppressedChannels).toEqual([]); // AR-18 — a time-critical alert is never suppressed
  });

  it('a BRIDGED member whom push and WhatsApp miss — the SMS rung ends `sms_bridge_not_lit`, ⛔ sent', async () => {
    const h = harness({
      push: makeProvider('fcm', 'push', 'rejected'),
      whatsapp: makeProvider('whatsapp-business', 'whatsapp', 'rejected'),
    });
    const result = await fanOutAlert(h.deps, cycleOpenAlert({ time_critical: true }), ctx());
    expect(trailOf(result)).toEqual(['push:rejected', 'whatsapp:rejected', 'sms:skipped_no_target:sms_bridge_not_lit']);
    expect(h.sms.sendCount()).toBe(0);
    expect(result.delivered).toBe(false);
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
  // Story 5.11 (FS15 (a)) — the SMS rung ⛔ calls `dispatch`, so the FAKE SMS `alert.channel_send` audit line (the fixture's
  // `sms-dlt`, F3) is gone; push and WhatsApp keep both families. (Was: three dispatch lines, the third `channel=sms`.)
  it('every DISPATCHED rung writes its `alert.dispatch` line + a per-channel `alert.channel_send` line; ⛔ fake SMS line', async () => {
    const h = harness({
      push: makeProvider('fcm', 'push', 'rejected'),
      whatsapp: makeProvider('whatsapp-business', 'whatsapp', 'rejected'),
    });
    await fanOutAlert(h.deps, litReminderAlert(), ctx());

    const dispatchLines = h.auditLines.filter((l) => l.action === 'alert.dispatch');
    const sendLines = h.auditLines.filter((l) => l.action === 'alert.channel_send');
    // One dispatch call per dispatched rung — the necessary consequence of the ratified per-rung composition (D9).
    expect(dispatchLines).toHaveLength(2);
    expect(sendLines.map((l) => l.resourceLocator)).toEqual([
      `alert:${ALERT};channel=push;provider=fcm`,
      `alert:${ALERT};channel=whatsapp;provider=whatsapp-business`,
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

// ─── (7) Story 5.11 — WHO may receive an alert SMS (I2, as RULED by `-390` Q1 B) and the honest rung (I3) ─────────

describe('Story 5.11 AC3 — the ONE predicate (I2), branch by branch', () => {
  const base = { lit: true, pushOutcome: 'rejected', whatsappTarget: true, whatsappOutcome: 'rejected' } as const;

  it.each([
    ['push sent', { ...base, pushOutcome: 'sent' }, false],
    ['push failed + NO WhatsApp target (Pariwar off / no ACTIVE yes) — the ruled widening', { ...base, whatsappTarget: false, whatsappOutcome: 'skipped_no_target' }, true],
    ['push failed + WhatsApp failed', base, true],
    ['push failed + WhatsApp sent', { ...base, whatsappOutcome: 'sent' }, false],
    ['push skipped (no device) + WhatsApp skipped', { ...base, pushOutcome: 'skipped_no_target', whatsappOutcome: 'skipped_no_target' }, true],
    ['an UNLIT message, push and WhatsApp failed', { ...base, lit: false }, false],
  ] as const)('%s ⇒ %s', (_label, input, expected) => {
    expect(isAlertSmsFallbackEligible(input)).toBe(expected);
  });
});

describe('Story 5.11 AC3 / AC4 — the fan-out\'s SMS rung, end to end (⛔ any SMS send)', () => {
  it('push sent ⇒ the SMS rung is never reached, the provider never driven', async () => {
    const h = harness();
    const result = await fanOutAlert(h.deps, litReminderAlert(), ctx());
    expect(trailOf(result)).toEqual(['push:sent']);
    expect(h.sms.sendCount()).toBe(0);
  });

  it('push failed + WhatsApp sent ⇒ no SMS', async () => {
    const h = harness({ push: makeProvider('fcm', 'push', 'rejected') });
    const result = await fanOutAlert(h.deps, litReminderAlert(), ctx());
    expect(trailOf(result)).toEqual(['push:rejected', 'whatsapp:sent']);
    expect(h.sms.sendCount()).toBe(0);
  });

  it('push failed + WhatsApp failed ⇒ ELIGIBLE — `sms_send_not_wired`', async () => {
    const h = harness({
      push: makeProvider('fcm', 'push', 'rejected'),
      whatsapp: makeProvider('whatsapp-business', 'whatsapp', 'rejected'),
    });
    const result = await fanOutAlert(h.deps, litReminderAlert(), ctx());
    expect(trailOf(result).at(-1)).toBe(`sms:skipped_no_target:${SMS_RUNG_DETAIL.notWired}`);
    expect(h.sms.sendCount()).toBe(0);
  });

  it('⭐ FS3 — a switched-on Pariwar whose WhatsApp REFUSES (no approved template) ⇒ the ladder ADVANCES, ELIGIBLE', async () => {
    const h = harness({
      push: makeProvider('fcm', 'push', 'rejected'),
      whatsapp: makeProvider('whatsapp-business', 'whatsapp', 'rejected', 'wa_template_not_approved'),
    });
    const result = await fanOutAlert(h.deps, litReminderAlert(), ctx());
    expect(trailOf(result)).toEqual([
      'push:rejected',
      'whatsapp:rejected:wa_template_not_approved',
      'sms:skipped_no_target:sms_send_not_wired',
    ]);
  });

  it('an UNLIT per-member message (contribution confirmed) ⇒ `sms_message_not_lit`', async () => {
    const h = harness({ push: makeProvider('fcm', 'push', 'rejected'), whatsapp: makeProvider('whatsapp-business', 'whatsapp', 'rejected') });
    const confirmed = {
      ...cycleOpenAlert(),
      alert_category: 'contribution_confirmed',
      payload_data: { pool_id: POOL, amount_paise: 110000, period_label: '2026-07 cycle' },
    } as Alert;
    const result = await fanOutAlert(h.deps, confirmed, ctx());
    expect(trailOf(result).at(-1)).toBe('sms:skipped_no_target:sms_message_not_lit');
  });

  it('a day-5 reminder (same category as day 10, ⛔ `sms` block) ⇒ `sms_message_not_lit` — eligibility is by MESSAGE (T3)', async () => {
    const h = harness({ push: makeProvider('fcm', 'push', 'rejected'), whatsapp: makeProvider('whatsapp-business', 'whatsapp', 'rejected') });
    const result = await fanOutAlert(h.deps, reminderAlert(), ctx());
    expect(trailOf(result).at(-1)).toBe('sms:skipped_no_target:sms_message_not_lit');
  });

  it('a lit, eligible member with no mobile on file ⇒ plain `skipped_no_target`', async () => {
    const h = harness({ push: makeProvider('fcm', 'push', 'rejected') });
    const result = await fanOutAlert(h.deps, litReminderAlert(), ctx({ whatsapp: null, sms: null }));
    expect(trailOf(result).at(-1)).toBe('sms:skipped_no_target');
  });

  it('cost-optimization still suppresses the SMS rung (`cost_optimized`) before any SMS decision', async () => {
    const h = harness({ push: makeProvider('fcm', 'push', 'rejected') });
    const result = await fanOutAlert(
      h.deps,
      litReminderAlert(),
      ctx({}, { costToggleEnabled: true, lastEngagementAt: new Date('2026-07-23T00:00:00.000Z') }),
    );
    expect(trailOf(result).at(-1)).toBe('sms:skipped_no_target:cost_optimized');
  });

  it('⭐ I3 — even an SMS provider that WOULD accept (the shipped fixture\'s posture) is never driven on the alert path', async () => {
    const h = harness({
      push: makeProvider('fcm', 'push', 'rejected'),
      whatsapp: makeProvider('whatsapp-business', 'whatsapp', 'rejected'),
      sms: makeProvider('sms-dlt', 'sms', 'accepted'),
    });
    for (const alert of [litReminderAlert(), reminderAlert(), cycleOpenAlert(), cycleOpenAlert({ time_critical: true })]) {
      const result = await fanOutAlert(h.deps, alert, ctx());
      expect(result.trail.some((e) => e.channel === 'sms' && e.outcome === 'sent')).toBe(false);
      expect(result.delivered).toBe(false);
    }
    expect(h.sms.sendCount()).toBe(0);
  });
});

// ─── (8) Story 5.11 FS14 (a) — `fanOutAlertToMembers`: only a THROWN fan-out is retried ─────────────────────────

describe('Story 5.11 AC4 / FS14 — `retry` holds only a member whose fan-out threw (I4)', () => {
  beforeEach(() => {
    withPariwarScope.mockReset();
    withPariwarScope.mockImplementation((_pool: unknown, _pariwarId: string, fn: (db: unknown) => unknown) => Promise.resolve(fn({})));
    resolvePushTargets.mockResolvedValue([TARGETS.push]);
    resolveWaTarget.mockResolvedValue(null); // no WhatsApp yes — the motivating member
    resolveSmsTarget.mockResolvedValue(TARGETS.sms);
    resolveTelegramTarget.mockResolvedValue(null);
    getMemberLastEngagementAt.mockResolvedValue(null);
  });

  it('⭐ a member NO rung reached (push failed, no WhatsApp, the SMS rung not wired) is a RESULT — `in_app_only`, ⛔ on `retry`', async () => {
    const h = harness({ push: makeProvider('fcm', 'push', 'rejected') });
    const { results, retry } = await fanOutAlertToMembers(h.deps, () => litReminderAlert(), [MEMBER], PARIWAR, new Date('2026-07-23T00:00:00.000Z'));
    expect(retry).toEqual([]);
    expect(results).toHaveLength(1);
    expect(results[0]!.delivered).toBe(false);
    expect(trailOf(results[0]!).at(-1)).toBe('sms:skipped_no_target:sms_send_not_wired');
  });

  it('a member whose fan-out THROWS (a target read fails) is on `retry` — the caller still throws so pg-boss retries', async () => {
    resolvePushTargets.mockRejectedValue(new Error('db blip'));
    const h = harness();
    const { results, retry } = await fanOutAlertToMembers(h.deps, () => litReminderAlert(), [MEMBER], PARIWAR, new Date('2026-07-23T00:00:00.000Z'));
    expect(retry).toEqual([MEMBER]);
    expect(results).toEqual([]);
  });
});
