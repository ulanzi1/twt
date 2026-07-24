// The live `dispatch()` fan-out against real Postgres — Story 8.8 (Task 8; AC6 audit families / :5433).
//
// The fakes suite (`contribution-notify.test.ts`) proves the COMPOSITION — the ladder order, the cost
// property, the multi-device push, the independent Telegram mirror. What it cannot prove is that the
// audit trail those decisions produce actually LANDS, in the real hash-chained `audit_log_entries`
// table, with the PII-safe HMAC the production helper computes. That is this suite.
//
// ── The two rules this file is written around ───────────────────────────────────────────────────────
//   1. MEMBERSHIP, NEVER COUNTS. `writeAuditEntry` own-commits into the GLOBAL hash chain, so rows
//      accumulate across suites and runs. Every assertion keys on a FRESH per-test `randomUUID()`
//      alert id via the row `resourceLocator` ([[project_live_db_test_gotchas]]).
//   2. THE HASH COMES FROM THE PRODUCTION HELPER. The expected per-channel HMAC is computed by the SAME
//      `createRenderedMessageHash` + `render` the audit path used — never a hand-inlined `blindIndex`
//      (the AI-5-2 item-4 rule). A test that re-implements the hash proves only that it can
//      re-implement the hash.
//
// Skips (loudly) without `DATABASE_URL`, exactly like the other live jobs suites. A skip is NOT
// evidence the AC holds — when it skips, this leg is un-attested for that run.

import { createHash, randomUUID } from 'node:crypto';

import {
  createAuditPort,
  createRenderedMessageHash,
  render,
  type Channel,
  type ChannelProvider,
  type ProviderId,
  type SendTarget,
} from '@twt/channels';
import {
  canonicalJsonStringify,
  createDb,
  encryption,
  ids,
  schema,
  type CreatedDb,
} from '@twt/domain';
import { asc, like } from 'drizzle-orm';
import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { fanOutAlert } from '../src/scheduler/contribution-notify.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);

const HMAC_KEY_REF: encryption.KmsKeyRef = { resourceName: 'fake/alert-hmac' };

/** Deterministic fake KMS so the HMAC is reproducible within the run (the dispatch-audit precedent). */
function createFakeKms(): encryption.KmsProvider {
  return encryption.createFakeKmsProvider({
    kekBytes: new Uint8Array(32).fill(7),
    hmacKeyBytes: new Uint8Array(32).fill(9),
  });
}

/** A provider double with a forced verdict — see the fakes suite for why the shipped fixtures cannot
 *  drive a cascade (they always accept, so the ladder never advances). */
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
    getStatus: (messageId: string) =>
      Promise.resolve({ providerMessageId: messageId, state: 'unknown' as const }),
  };
}

const TARGETS: Record<'push' | 'whatsapp' | 'sms', SendTarget> = {
  push: { channel: 'push', address: 'device-token', platform: 'android' },
  whatsapp: { channel: 'whatsapp', address: '+919999999999' },
  sms: { channel: 'sms', address: '+919999999999' },
};

describe.skipIf(!hasDatabase)('contribution-notify live fan-out — audit families (live DB :5433)', () => {
  let created: CreatedDb;
  let pool: pg.Pool;
  const kms = createFakeKms();
  // ONE hashRendered, built once and used BOTH by the production audit path and by the expectation —
  // so the assertion cannot drift from what the code actually computes.
  const hashRendered = createRenderedMessageHash({ kms, hmacKeyRef: HMAC_KEY_REF });

  beforeAll(() => {
    created = createDb(DATABASE_URL!, { ssl: false, max: 4 });
    pool = created.pool;
  });

  afterAll(async () => {
    await pool.end();
  });

  /** Every audit row THIS alert produced — membership by the unique per-alert locator, chain order. */
  async function auditRowsFor(alertId: string) {
    return created.db
      .select({
        action: schema.auditLogEntries.action,
        resourceLocator: schema.auditLogEntries.resourceLocator,
        requestPayloadHash: schema.auditLogEntries.requestPayloadHash,
        responseStatus: schema.auditLogEntries.responseStatus,
      })
      .from(schema.auditLogEntries)
      .where(like(schema.auditLogEntries.resourceLocator, `alert:${alertId}%`))
      .orderBy(asc(schema.auditLogEntries.seq));
  }

  function deps(providers: Record<Channel, readonly ChannelProvider[]>) {
    return {
      pool,
      serviceDb: created.db,
      encryption: { kms, kekRef: HMAC_KEY_REF, hmacKeyRef: HMAC_KEY_REF },
      audit: createAuditPort(pool),
      hashRendered,
      resolveProviders: () => Promise.resolve(providers),
      now: () => new Date('2026-07-23T00:00:00.000Z'),
      sleep: () => Promise.resolve(),
      onAlarm: () => undefined,
    };
  }

  function cycleOpenAlert(alertId: string, pariwarId: string) {
    return {
      alert_id: alertId,
      pariwar_id: pariwarId,
      member_id: randomUUID(),
      time_critical: false,
      provenance_refs: { pool_id: randomUUID() },
      created_at: '2026-07-23T00:00:00.000Z',
      created_by_actor: 'system',
      alert_category: 'alert_published' as const,
      payload_data: { title: 'आपका पूल खुल गया — युधिष्ठिर', body: 'रामेश्वर प्र के परिवार के सहयोग हेतु।' },
    };
  }

  const ctx = {
    targets: { push: [TARGETS.push], whatsapp: TARGETS.whatsapp, sms: TARGETS.sms, telegram: null },
    costToggleEnabled: false,
    lastEngagementAt: null,
  };

  it('a delivered-on-push fan-out writes ONE dispatch line + ONE channel_send line, and stops', async () => {
    const alertId = randomUUID();
    const pariwarId = randomUUID();
    const providers = {
      push: [provider('fcm', 'push', 'accepted'), provider('apns', 'push', 'accepted')],
      whatsapp: [provider('whatsapp-business', 'whatsapp', 'accepted')],
      sms: [provider('sms-dlt', 'sms', 'accepted')],
      telegram: [provider('telegram', 'telegram', 'accepted')],
    };

    const result = await fanOutAlert(deps(providers), cycleOpenAlert(alertId, pariwarId) as never, ctx as never);
    expect(result.deliveredChannel).toBe('push');

    const rows = await auditRowsFor(alertId);
    // ONE dispatch call happened (the push rung delivered), so exactly one of each family.
    expect(rows.filter((r) => r.action === 'alert.dispatch')).toHaveLength(1);
    const sends = rows.filter((r) => r.action === 'alert.channel_send');
    expect(sends).toHaveLength(1);
    expect(sends[0]!.resourceLocator).toBe(`alert:${alertId};channel=push;provider=fcm`);
    expect(sends[0]!.responseStatus).toBe(202); // `accepted` → 202, the honest mapping
  });

  it('the per-channel hash is the PRODUCTION keyed HMAC of the rendered message (AI-4-3(c))', async () => {
    const alertId = randomUUID();
    const pariwarId = randomUUID();
    const alert = cycleOpenAlert(alertId, pariwarId);
    const providers = {
      push: [provider('fcm', 'push', 'accepted'), provider('apns', 'push', 'accepted')],
      whatsapp: [provider('whatsapp-business', 'whatsapp', 'accepted')],
      sms: [provider('sms-dlt', 'sms', 'accepted')],
      telegram: [provider('telegram', 'telegram', 'accepted')],
    };

    await fanOutAlert(deps(providers), alert as never, ctx as never);

    const rows = await auditRowsFor(alertId);
    const send = rows.find((r) => r.action === 'alert.channel_send')!;
    // Computed through the SAME production helper + the SAME production renderer — never re-derived.
    const expected = await hashRendered(render(alert as never, 'push'), pariwarId);
    expect(send.requestPayloadHash).toBe(expected);
    expect(send.requestPayloadHash).toMatch(/^[0-9a-f]{64}$/);

    // …and it must NOT be a plain unkeyed sha256 of the rendered message. That is the ENTIRE point of
    // AI-4-3(c): rendered messages carry member-facing content, so an unkeyed digest of one is
    // brute-forceable against a candidate-message dictionary. A keyed HMAC is not.
    const unkeyed = createHash('sha256')
      .update(canonicalJsonStringify(render(alert as never, 'push')), 'utf-8')
      .digest('hex');
    expect(send.requestPayloadHash).not.toBe(unkeyed);
  });

  it('a full cascade writes one dispatch line + one channel_send line PER RUNG, in ladder order', async () => {
    const alertId = randomUUID();
    const pariwarId = randomUUID();
    const providers = {
      push: [provider('fcm', 'push', 'rejected'), provider('apns', 'push', 'rejected')],
      whatsapp: [provider('whatsapp-business', 'whatsapp', 'rejected')],
      sms: [provider('sms-dlt', 'sms', 'accepted')],
      telegram: [provider('telegram', 'telegram', 'accepted')],
    };

    const result = await fanOutAlert(deps(providers), cycleOpenAlert(alertId, pariwarId) as never, ctx as never);
    expect(result.deliveredChannel).toBe('sms');

    const rows = await auditRowsFor(alertId);
    // Three rungs ⇒ three dispatch lines (the per-rung composition, D9) …
    expect(rows.filter((r) => r.action === 'alert.dispatch')).toHaveLength(3);
    // … and one honest channel_send per rung, in canonical ladder order.
    const sends = rows.filter((r) => r.action === 'alert.channel_send');
    expect(sends.map((s) => s.resourceLocator)).toEqual([
      `alert:${alertId};channel=push;provider=fcm`,
      `alert:${alertId};channel=whatsapp;provider=whatsapp-business`,
      `alert:${alertId};channel=sms;provider=sms-dlt`,
    ]);
    expect(sends.map((s) => s.responseStatus)).toEqual([400, 400, 202]); // rejected/rejected/accepted
  });

  it('no persisted audit row carries a delivery ADDRESS', async () => {
    const alertId = randomUUID();
    const pariwarId = randomUUID();
    const providers = {
      push: [provider('fcm', 'push', 'rejected'), provider('apns', 'push', 'rejected')],
      whatsapp: [provider('whatsapp-business', 'whatsapp', 'accepted')],
      sms: [provider('sms-dlt', 'sms', 'accepted')],
      telegram: [provider('telegram', 'telegram', 'accepted')],
    };
    await fanOutAlert(deps(providers), cycleOpenAlert(alertId, pariwarId) as never, ctx as never);

    const serialized = JSON.stringify(await auditRowsFor(alertId));
    expect(serialized).not.toContain('device-token');
    expect(serialized).not.toContain('+919999999999');
  });
});

// ── The reminder-suppression read against real event rows (AC2 / D3) ────────────────────────────────

describe.skipIf(!hasDatabase)('listActedMemberIdsForPool — suppression inputs (live DB :5433)', () => {
  let created: CreatedDb;
  let pool: pg.Pool;

  beforeAll(() => {
    created = createDb(DATABASE_URL!, { ssl: false, max: 4 });
    pool = created.pool;
  });

  afterAll(async () => {
    await pool.end();
  });

  it('returns the yellow and green members as SEPARATE, unmerged sets', async () => {
    const { contribution } = await import('@twt/domain');
    const pariwarId = randomUUID();
    const alertId = randomUUID();
    const poolId = randomUUID();
    const attestedMember = randomUUID();
    const confirmedMember = randomUUID();
    const quietMember = randomUUID();

    await created.db.insert(schema.eventsLog).values([
      {
        streamId: alertId,
        eventType: 'contribution.utr-attested',
        payload: {
          actor: 'member',
          trigger: 'test',
          poolId,
          memberId: attestedMember,
          // `events_log` carries a UNIQUE index on `payload->>'tr'` for attested events, and these
          // rows own-commit, so a hardcoded `tr` collides on the SECOND run against the same database
          // ([[project_live_db_test_gotchas]] — the same accumulate-across-runs lesson, applied to a
          // unique key rather than a row count). A fresh uuid per run keeps the suite re-runnable.
          tr: `tr-${randomUUID()}`,
          utr: '123456789012',
          attestation_only: true,
        },
        eventVersion: 1,
        pariwarId,
      },
      {
        streamId: alertId,
        eventType: 'contribution.confirmed',
        payload: { poolId, memberId: confirmedMember },
        eventVersion: 2,
        pariwarId,
      },
    ]);

    const acted = await contribution.listActedMemberIdsForPool(created.db, {
      pariwarId: ids.pariwarId(pariwarId),
      alertId: ids.alertId(alertId),
      poolId: ids.poolId(poolId),
    });

    expect(acted.attested).toEqual([attestedMember]);
    expect(acted.confirmed).toEqual([confirmedMember]);
    // The quiet member appears in NEITHER set — they are the one who still gets nudged.
    expect(acted.attested).not.toContain(quietMember);
    expect(acted.confirmed).not.toContain(quietMember);
    // The two sets are never merged into one "acted" field — a caller cannot conflate them by accident.
    expect(Object.keys(acted).sort()).toEqual(['attested', 'confirmed']);
  });

  it('scopes to the pool — another pool`s attestation never suppresses this pool`s reminder', async () => {
    const { contribution } = await import('@twt/domain');
    const pariwarId = randomUUID();
    const alertId = randomUUID();
    const poolId = randomUUID();
    const otherPoolId = randomUUID();
    const otherPoolMember = randomUUID();

    await created.db.insert(schema.eventsLog).values([
      {
        streamId: alertId,
        eventType: 'contribution.utr-attested',
        payload: {
          actor: 'member',
          trigger: 'test',
          poolId: otherPoolId,
          memberId: otherPoolMember,
          tr: `tr-${randomUUID()}`,
          utr: '123456789013',
          attestation_only: true,
        },
        eventVersion: 1,
        pariwarId,
      },
    ]);

    const acted = await contribution.listActedMemberIdsForPool(created.db, {
      pariwarId: ids.pariwarId(pariwarId),
      alertId: ids.alertId(alertId),
      poolId: ids.poolId(poolId),
    });
    expect(acted.attested).toEqual([]);
    expect(acted.confirmed).toEqual([]);
  });

  it('scopes to the tenant — another Pariwar`s events never leak into this Pariwar`s suppression', async () => {
    const { contribution } = await import('@twt/domain');
    const pariwarId = randomUUID();
    const otherPariwarId = randomUUID();
    const alertId = randomUUID();
    const poolId = randomUUID();

    await created.db.insert(schema.eventsLog).values([
      {
        streamId: alertId,
        eventType: 'contribution.confirmed',
        payload: { poolId, memberId: randomUUID() },
        eventVersion: 1,
        pariwarId: otherPariwarId,
      },
    ]);

    const acted = await contribution.listActedMemberIdsForPool(created.db, {
      pariwarId: ids.pariwarId(pariwarId),
      alertId: ids.alertId(alertId),
      poolId: ids.poolId(poolId),
    });
    expect(acted.confirmed).toEqual([]);
  });
});
