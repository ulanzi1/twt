// The full-ladder-advances-on-reject END-TO-END armor — AI-8-3 (Task 5; §9a-ii). PERMANENT regression armor
// for the push trap (§4).
//
// Because the FIXTURE push ALWAYS accepts (fixture-push.ts), a partially-wired system can look healthy while
// never sending a real notification: push "accepts" on the fixture and the cascade stops at push, never
// reaching WhatsApp/SMS. This suite drives the UNCHANGED Story 8.8 `fanOutAlert` with a `resolveProviders`
// built from PROVIDER DOUBLES ONLY (no network — the AI-5-2 reject-double convention) and proves:
//   (a) real push `rejected` → WhatsApp attempted → WhatsApp `rejected` → the SMS rung, trail push→whatsapp→sms
//       in order, SMS TERMINAL (Story 5.11: the SMS rung ⛔ dispatches — an unlit alert ends `sms_message_not_lit`,
//       a lit notice's eligible member `sms_send_not_wired`; either way undelivered, ⛔ a fake `sent`);
//   (b) Telegram is the INDEPENDENT mirror — fires once for an eligible category (alert_published) with a
//       chat_id and its failure leaves the ladder outcome unchanged; SILENT for a contribution-loop category;
//   (c) an outage in `resolveProviders` PROPAGATES out of the fan-out (no fixture fallback);
//   (d) honest audit lines land for the real rungs.
//
// ── WHY REJECT DOUBLES EXIST (the AI-5-2 rationale-comment convention) ───────────────────────────────────────
// The shipped fixtures cannot drive a cascade: they unconditionally return `accepted`, so the ladder never
// advances past push. A provider double that FORCES a non-accept is the only way to exercise the cascade's
// advance-on-failure behaviour — the exact behaviour this story exists to make real. Test 2 below pins the
// fixture-push trap in place as a NEGATIVE control: it goes RED the day someone leaves push on the fixture.
//
// Membership, never counts (writeAuditEntry own-commits into the global hash chain): every assertion keys on a
// FRESH per-test alert id via the row resourceLocator ([[project_live_db_test_gotchas]]). Skips loudly without
// DATABASE_URL — a skip is NOT evidence the invariant holds.

import { randomUUID } from 'node:crypto';

import {
  createAuditPort,
  createPushProviders,
  createRenderedMessageHash,
  type Channel,
  type ChannelProvider,
  type ProviderId,
  type SendTarget,
} from '@twt/channels';
import { createDb, encryption, schema, type CreatedDb } from '@twt/domain';
import { asc, like } from 'drizzle-orm';
import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { fanOutAlert } from '../src/scheduler/contribution-notify.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);

const HMAC_KEY_REF: encryption.KmsKeyRef = { resourceName: 'fake/alert-hmac' };

function createFakeKms(): encryption.KmsProvider {
  return encryption.createFakeKmsProvider({
    kekBytes: new Uint8Array(32).fill(7),
    hmacKeyBytes: new Uint8Array(32).fill(9),
  });
}

/** A provider double with a forced verdict — the ONLY way to drive the cascade (the fixtures always accept). */
function provider(id: ProviderId, channel: Channel, status: 'accepted' | 'rejected'): ChannelProvider {
  return {
    id,
    channel,
    scope: 'global',
    send: () =>
      Promise.resolve({
        channel,
        provider: id,
        status,
        providerMessageId: status === 'accepted' ? `${id}-msg` : null,
        ...(status === 'rejected' ? { detail: 'transient: forced reject (test double)' } : {}),
      }),
    getStatus: (messageId: string) => Promise.resolve({ providerMessageId: messageId, state: 'unknown' as const }),
  };
}

const TARGETS: Record<'push' | 'whatsapp' | 'sms' | 'telegram', SendTarget> = {
  push: { channel: 'push', address: 'device-token', platform: 'android' },
  whatsapp: { channel: 'whatsapp', address: '+919999999999' },
  sms: { channel: 'sms', address: '+919999999999' },
  telegram: { channel: 'telegram', address: 'chat-12345' },
};

describe.skipIf(!hasDatabase)('AI-8-3 — full-ladder-advances-on-reject armor (live DB :5433)', () => {
  let created: CreatedDb;
  let pool: pg.Pool;
  const kms = createFakeKms();
  const hashRendered = createRenderedMessageHash({ kms, hmacKeyRef: HMAC_KEY_REF });

  beforeAll(() => {
    created = createDb(DATABASE_URL!, { ssl: false, max: 4 });
    pool = created.pool;
  });

  afterAll(async () => {
    await pool.end();
  });

  async function auditRowsFor(alertId: string) {
    return created.db
      .select({
        action: schema.auditLogEntries.action,
        resourceLocator: schema.auditLogEntries.resourceLocator,
        responseStatus: schema.auditLogEntries.responseStatus,
      })
      .from(schema.auditLogEntries)
      .where(like(schema.auditLogEntries.resourceLocator, `alert:${alertId}%`))
      .orderBy(asc(schema.auditLogEntries.seq));
  }

  /** Build fan-out deps around a resolveProviders that returns the given registry (or throws on outage). */
  function deps(resolveProviders: NonNullable<Parameters<typeof fanOutAlert>[0]['resolveProviders']>) {
    return {
      pool,
      serviceDb: created.db,
      encryption: { kms, kekRef: HMAC_KEY_REF, hmacKeyRef: HMAC_KEY_REF },
      audit: createAuditPort(pool),
      hashRendered,
      resolveProviders,
      now: () => new Date('2026-07-25T00:00:00.000Z'),
      sleep: () => Promise.resolve(),
      onAlarm: () => undefined,
    };
  }

  function announcementAlert(alertId: string, pariwarId: string) {
    return {
      alert_id: alertId,
      pariwar_id: pariwarId,
      member_id: randomUUID(),
      time_critical: false,
      provenance_refs: { pool_id: randomUUID() },
      created_at: '2026-07-25T00:00:00.000Z',
      created_by_actor: 'system',
      alert_category: 'alert_published' as const,
      payload_data: { title: 'आपका पूल खुल गया', body: 'सहयोग हेतु।' },
    };
  }

  function contributionConfirmedAlert(alertId: string, pariwarId: string) {
    return {
      alert_id: alertId,
      pariwar_id: pariwarId,
      member_id: randomUUID(),
      time_critical: false,
      provenance_refs: {},
      created_at: '2026-07-25T00:00:00.000Z',
      created_by_actor: 'system',
      alert_category: 'contribution_confirmed' as const,
      payload_data: { pool_id: randomUUID(), amount_paise: 50000, period_label: 'जुलाई 2026' },
    };
  }

  /** Story 5.11 — a LIT notice: day 10's reminder carrying its `sms` block (FS7). */
  function litReminderAlert(alertId: string, pariwarId: string) {
    return {
      alert_id: alertId,
      pariwar_id: pariwarId,
      member_id: randomUUID(),
      time_critical: false,
      provenance_refs: { pool_id: randomUUID() },
      created_at: '2026-07-25T00:00:00.000Z',
      created_by_actor: 'system',
      alert_category: 'deadline_reminder' as const,
      payload_data: {
        subject: 'पूल A — आपका योगदान अभी दर्ज नहीं हुआ है',
        deadline_at: '2026-08-05T00:00:00.000Z',
        deadline_display: '05-08-2026',
        sms: { message: 'deadline_not_recorded' as const, locale: 'en' as const, values: { pool: 'A', date: '05-08-2026' } },
      },
    };
  }

  /** All four channels addressed. Telegram target controlled per test. */
  const ctxWith = (telegram: SendTarget | null) => ({
    targets: { push: [TARGETS.push], whatsapp: TARGETS.whatsapp, sms: TARGETS.sms, telegram },
    costToggleEnabled: false,
    lastEngagementAt: null,
  });

  // ⭐ Story 5.11 (AC4, F18) — was "… → SMS: the ladder ADVANCES and delivers on SMS": that SMS delivery was the provider
  // double standing in for the log fixture's fake `sent` (F3). The ladder still ADVANCES through every rung; the SMS rung now
  // decides lit / eligible itself, ⛔ dispatches, and an announcement (unlit) ends `sms_message_not_lit`.
  it('(a) real push rejected → WhatsApp rejected → the SMS rung: the ladder ADVANCES, in order, and ⛔ fakes a send', async () => {
    const alertId = randomUUID();
    const pariwarId = randomUUID();
    const providers = {
      push: [provider('fcm', 'push', 'rejected'), provider('apns', 'push', 'rejected')],
      whatsapp: [provider('whatsapp-business', 'whatsapp', 'rejected')],
      sms: [provider('sms-dlt', 'sms', 'accepted')],
      telegram: [provider('telegram', 'telegram', 'accepted')],
    };

    const result = await fanOutAlert(
      deps(() => Promise.resolve(providers)),
      announcementAlert(alertId, pariwarId) as never,
      ctxWith(null) as never,
    );

    // The whole point: push did NOT short-circuit — the ladder walked to the SMS rung.
    expect(result.trail.map((t) => t.channel)).toEqual(['push', 'whatsapp', 'sms']);
    expect(result.trail.map((t) => t.outcome)).toEqual(['rejected', 'rejected', 'skipped_no_target']);
    expect(result.trail[2]!.detail).toBe('sms_message_not_lit');
    // I3 — an SMS provider that WOULD accept is ⛔ reached: nothing is reported sent.
    expect(result.delivered).toBe(false);
    expect(result.deliveredChannel).toBeNull();

    // (d) honest audit lines for the two DISPATCHED rungs, in canonical order — ⛔ an SMS line (5.11: the fake one is gone).
    const rows = await auditRowsFor(alertId);
    const sends = rows.filter((r) => r.action === 'alert.channel_send');
    expect(sends.map((s) => s.resourceLocator)).toEqual([
      `alert:${alertId};channel=push;provider=fcm`,
      `alert:${alertId};channel=whatsapp;provider=whatsapp-business`,
    ]);
    expect(sends.map((s) => s.responseStatus)).toEqual([400, 400]); // rejected/rejected
  });

  it('(a-NEGATIVE) the fixture push short-circuits the ladder — the exact regression this armors against', async () => {
    // If push is left on the FIXTURE (the unwired state H-1), it "accepts" and the cascade STOPS at push:
    // WhatsApp/SMS are never attempted and no real bytes are ever sent. This test PINS that trap so test (a)
    // above is meaningful — leave push on the fixture and (a) goes red while this one documents why.
    const alertId = randomUUID();
    const pariwarId = randomUUID();
    const providers = {
      push: createPushProviders(null), // the log-only fixture — always accepts
      whatsapp: [provider('whatsapp-business', 'whatsapp', 'rejected')],
      sms: [provider('sms-dlt', 'sms', 'rejected')],
      telegram: [provider('telegram', 'telegram', 'accepted')],
    };

    const result = await fanOutAlert(
      deps(() => Promise.resolve(providers)),
      announcementAlert(alertId, pariwarId) as never,
      ctxWith(null) as never,
    );

    expect(result.deliveredChannel).toBe('push'); // "delivered" on the fixture — no real bytes
    expect(result.trail.map((t) => t.channel)).toEqual(['push']); // stops at push; WA/SMS never attempted

    const rows = await auditRowsFor(alertId);
    const sends = rows.filter((r) => r.action === 'alert.channel_send');
    expect(sends).toHaveLength(1);
    expect(sends[0]!.resourceLocator).toBe(`alert:${alertId};channel=push;provider=fcm`);
  });

  // ⭐ Story 5.11 (AC3 / AC4) — was "SMS is TERMINAL — a rejected SMS exhausts the ladder ⇒ undelivered (the caller fails the
  // job)": the SMS rung no longer dispatches, and an unreached member is `in_app_only` (FS14), ⛔ a failed job. A LIT notice's
  // eligible member ends `sms_send_not_wired` (the send is row 5-11b).
  it('(a) SMS is TERMINAL — a LIT notice, push and WhatsApp rejected ⇒ `sms_send_not_wired`, undelivered, ⛔ SMS audit line', async () => {
    const alertId = randomUUID();
    const pariwarId = randomUUID();
    const providers = {
      push: [provider('fcm', 'push', 'rejected'), provider('apns', 'push', 'rejected')],
      whatsapp: [provider('whatsapp-business', 'whatsapp', 'rejected')],
      sms: [provider('sms-dlt', 'sms', 'accepted')],
      telegram: [provider('telegram', 'telegram', 'accepted')],
    };

    const result = await fanOutAlert(
      deps(() => Promise.resolve(providers)),
      litReminderAlert(alertId, pariwarId) as never,
      ctxWith(null) as never,
    );

    expect(result.delivered).toBe(false);
    expect(result.deliveredChannel).toBeNull();
    expect(result.trail.map((t) => `${t.channel}:${t.outcome}`)).toEqual(['push:rejected', 'whatsapp:rejected', 'sms:skipped_no_target']);
    expect(result.trail[2]!.detail).toBe('sms_send_not_wired');
    const sends = (await auditRowsFor(alertId)).filter((r) => r.action === 'alert.channel_send');
    expect(sends.some((s) => s.resourceLocator.includes('channel=sms'))).toBe(false);
  });

  it('(b) Telegram is the INDEPENDENT mirror — fires once for an eligible category, its failure unchanged by the ladder', async () => {
    const alertId = randomUUID();
    const pariwarId = randomUUID();
    const providers = {
      // Push delivers, so the ladder outcome is push — independent of the telegram mirror below.
      push: [provider('fcm', 'push', 'accepted'), provider('apns', 'push', 'accepted')],
      whatsapp: [provider('whatsapp-business', 'whatsapp', 'accepted')],
      sms: [provider('sms-dlt', 'sms', 'accepted')],
      telegram: [provider('telegram', 'telegram', 'rejected')], // mirror FAILS — must not change the outcome
    };

    const result = await fanOutAlert(
      deps(() => Promise.resolve(providers)),
      announcementAlert(alertId, pariwarId) as never,
      ctxWith(TARGETS.telegram) as never,
    );

    expect(result.deliveredChannel).toBe('push'); // unaffected by the telegram mirror's failure
    expect(result.telegramMirrored).toBe(true);

    // It fired ONCE, independently — exactly one telegram channel_send audit line.
    const rows = await auditRowsFor(alertId);
    const telegramSends = rows.filter(
      (r) => r.action === 'alert.channel_send' && r.resourceLocator.includes('channel=telegram'),
    );
    expect(telegramSends).toHaveLength(1);
  });

  it('(b) Telegram is SILENT for a contribution-loop category even with a chat_id on file (not eligible)', async () => {
    const alertId = randomUUID();
    const pariwarId = randomUUID();
    const providers = {
      push: [provider('fcm', 'push', 'accepted'), provider('apns', 'push', 'accepted')],
      whatsapp: [provider('whatsapp-business', 'whatsapp', 'accepted')],
      sms: [provider('sms-dlt', 'sms', 'accepted')],
      telegram: [provider('telegram', 'telegram', 'accepted')],
    };

    const result = await fanOutAlert(
      deps(() => Promise.resolve(providers)),
      contributionConfirmedAlert(alertId, pariwarId) as never,
      ctxWith(TARGETS.telegram) as never, // chat_id present, but the category is not telegram-eligible
    );

    expect(result.telegramMirrored).toBe(false);
    const rows = await auditRowsFor(alertId);
    const telegramSends = rows.filter(
      (r) => r.action === 'alert.channel_send' && r.resourceLocator.includes('channel=telegram'),
    );
    expect(telegramSends).toHaveLength(0);
  });

  it('(c) an outage in resolveProviders PROPAGATES out of the fan-out — never a silent fixture fallback', async () => {
    const alertId = randomUUID();
    const pariwarId = randomUUID();
    // A Secret-Manager / DB outage surfaces as a thrown resolveProviders. fanOutAlert does NOT swallow it into
    // a fixture send — it propagates, so fanOutAlertToMembers records the member undelivered ⇒ the pg-boss job
    // fails and retries. A masked outage would fake delivery (the opposite of this program's integrity).
    await expect(
      fanOutAlert(
        deps(() => Promise.reject(new Error('secret-manager outage'))),
        announcementAlert(alertId, pariwarId) as never,
        ctxWith(null) as never,
      ),
    ).rejects.toThrow(/outage/);
  });
});
