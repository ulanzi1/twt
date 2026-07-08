// AI-5-2 — Controlled end-to-end live-dispatch integration test before Epic 6 (Epic 5 retro §7, H-7; :5433).
//
// ── What this spec IS (the load-bearing reconciliation — record it, do not silently invent a composition) ──
// Epic 5 shipped NINE stories of channel primitives with ZERO live `dispatch` call site
// ([[project_channels_no_live_dispatch_yet]]). This spec gives those primitives their FIRST real-path
// exercise — the AR-19 fallback cascade + the honest two-line audit emission + the composed cascade+audit
// interlock — in a CONTROLLED test, so any interlock defect surfaces here and not in Epic 6's ₹50L
// `claim_status_change` hot path.
//
// The retro phrases this as ONE flow ("fan across the ladder AND the fallback fires AND the two audit lines"),
// but the frozen code has TWO distinct primitives that do NOT compose into that one flow today — closing that
// gap is Epic 6's job, not this test's:
//   • `dispatch` (src/dispatch.ts) fans out to EVERY enabled channel INDEPENDENTLY and writes the two audit
//     lines (1 dispatch + 1 per channel that reached send). It has NO cascade — a rejected push does not
//     trigger WA.
//   • `runChannelCascade` (src/cascade.ts) IS the AR-19 fallback ladder (push → WA → SMS, stop at first sent),
//     but writes NO audit (it drives a bare `CascadeSender` seam).
// So "the fallback cascade fires" ⇒ `runChannelCascade` and "the two audit lines" ⇒ the `dispatch`/audit path —
// two different primitives. The single production flow that both cascades AND writes the audit lines is the
// composition Epic 6's first live caller will build; Test (3) MODELS — does not commit — that seam.
//
// ── Guardrails this file honours (story §6) ───────────────────────────────────────────────────────────────
//   • ZERO production source change — touches no `src/**` file; every double/helper lives in this test tree.
//   • NO production live-dispatch call site — Epic 6 remains the first live caller.
//   • NO real timers — the cascade `sleep` seam is a recorder + a trivial `backoffMs`.
//   • MEMBERSHIP, not counts — `writeAuditEntry` own-commits into the GLOBAL hash-chain so rows accumulate;
//     every assertion is keyed on a FRESH per-test `randomUUID()` alert_id via the row `resourceLocator`
//     ([[project_live_db_test_gotchas]]).
//   • `skipIf(!hasDatabase)` — DB-free `pnpm test` stays green; the live assertions run only under `ci:local`
//     + `DATABASE_URL` (twt-test-pg on :5433).

import { randomUUID } from 'node:crypto';

import { Alert } from '@twt/contracts';
import { canonicalJsonStringify, createDb, encryption, schema, type Db } from '@twt/domain';
import { asc, like } from 'drizzle-orm';
import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  alertPayloadDigest,
  CANONICAL_CHANNEL_LADDER,
  createAuditPort,
  createFixtureSmsProvider,
  createRenderedMessageHash,
  dispatch,
  render,
  runChannelCascade,
  sha256Hex,
  type CascadeSender,
  type Channel,
  type ChannelProvider,
  type ChannelSendOutcome,
  type DispatchDeps,
  type ProviderId,
  type SendResult,
  type SendTarget,
} from '../../src/index.js';
import { claimStatusChange } from '../fixtures.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);

const HMAC_KEY_REF: encryption.KmsKeyRef = { resourceName: 'fake/alert-hmac' };

/** The fake KMS (mirrors dispatch-audit.spec.ts) — a deterministic HMAC key so hashes are reproducible. */
function createFakeKms(): encryption.KmsProvider {
  return encryption.createFakeKmsProvider({
    kekBytes: new Uint8Array(32).fill(7),
    hmacKeyBytes: new Uint8Array(32).fill(9),
  });
}

/** One opaque target per channel — the reject doubles ignore them; the fixture SMS provider ignores them too. */
const TARGETS: Record<Channel, SendTarget> = {
  push: { channel: 'push', address: 'device-token', platform: 'android' },
  whatsapp: { channel: 'whatsapp', address: '+919999999999' },
  sms: { channel: 'sms', address: '+919999999999' },
  telegram: { channel: 'telegram', address: 'chat-123' },
};

// WHY REJECT DOUBLES EXIST — DO NOT replace with the shipped createFixture*Provider().
// The shipped log-only fixtures (fixture-push/-whatsapp/-sms) ALWAYS return status:'accepted' (they exist so
// the stack boots with zero external config — src/providers/fixture-*.ts). A cascade driven by them delivers
// on PUSH and never falls through, so it CANNOT exercise AR-19 at all. These doubles force a non-accept
// outcome on push+WA precisely so the fallback ladder advances to SMS. They conform to the FROZEN
// ChannelProvider contract (src/provider.ts) — no production source is touched.
function rejectingProvider(id: ProviderId, channel: Channel): ChannelProvider {
  return {
    id,
    channel,
    scope: 'global',
    send: () =>
      Promise.resolve({
        channel,
        provider: id,
        status: 'rejected',
        providerMessageId: null,
        detail: 'test double: forced reject (simulated FCM/Meta unavailable)',
      }),
    getStatus: (messageId) => Promise.resolve({ providerMessageId: messageId, state: 'failed' }),
  };
}

/** A provider wrapped with a send-call counter (proves "stop after SMS": SMS.send is called exactly once). */
interface CountingProvider {
  readonly provider: ChannelProvider;
  sendCount(): number;
}
function withSendCounter(base: ChannelProvider): CountingProvider {
  let count = 0;
  return {
    sendCount: () => count,
    provider: {
      ...base,
      send: (rendered, target) => {
        count += 1;
        return base.send(rendered, target);
      },
    },
  };
}

// The SINGLE honest status→outcome mapping for the whole spec (§3 item 2). MIRRORS dispatch.ts's PRIVATE
// `sendStatusToOutcome` (the canonical source) — never claim 'sent' for a non-accepted send. `dispatch`'s copy
// is module-private and exporting it would be a production-source change this test-only story forbids, so this
// is the one place that reproduces it. If a new SendResult.status is added, update BOTH here and dispatch.ts.
// Used by Test (1) and Test (3).
function toOutcome(result: SendResult): ChannelSendOutcome {
  switch (result.status) {
    case 'accepted':
      return { outcome: 'sent', detail: result.detail };
    case 'rejected':
      return { outcome: 'rejected', detail: result.detail };
    case 'not_implemented':
      return { outcome: 'not_implemented', detail: result.detail };
    default: {
      const unrecognized: never = result.status;
      throw new Error(`toOutcome: unrecognized SendResult.status ${String(unrecognized)}`);
    }
  }
}

/** A sleep recorder (mirrors tests/cascade.test.ts) — records every backoff wait WITHOUT waiting. */
function sleepRecorder(): { sleep: (ms: number) => Promise<void>; waits: number[] } {
  const waits: number[] = [];
  return { waits, sleep: (ms) => (waits.push(ms), Promise.resolve()) };
}

/**
 * The Epic-6 category (§4): drive with the `claimStatusChange()` fixture shape but with FRESH ids per test so
 * every audit row is uniquely keyable by `alert:${alertId}%`. `claim_status_change` is exactly Epic 6's first
 * live send — Telegram is category-INELIGIBLE for it, so it records `skipped_ineligible` and never cascades.
 */
function freshClaimAlert(alertId: string, pariwarId: string): Alert {
  return Alert.parse({ ...claimStatusChange(), alert_id: alertId, pariwar_id: pariwarId, member_id: randomUUID() });
}

describe.skipIf(!hasDatabase)('AI-5-2 live-dispatch cascade + audit interlock (live DB) (:5433)', () => {
  let db: Db;
  let pool: pg.Pool;
  const kms = createFakeKms();
  // ONE hashRendered built once and reused everywhere a per-channel hash is produced OR expected (§ item 4) —
  // the test's expected HMAC is computed by the SAME production helper the audit path uses, so it can't drift.
  const hashRendered = createRenderedMessageHash({ kms, hmacKeyRef: HMAC_KEY_REF });

  beforeAll(() => {
    const created = createDb(DATABASE_URL!, { ssl: false, max: 4 });
    db = created.db;
    pool = created.pool;
  });

  afterAll(async () => {
    await pool.end();
  });

  /** All audit rows we wrote for THIS alert (membership by unique per-alert locator), ordered by chain seq. */
  async function auditRowsFor(alertId: string) {
    return db
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

  // (1) AR-19 fallback fires push → WA → SMS and delivers on SMS — real provider doubles + real `render`,
  //     deterministic (recorded sleeps, trivial backoff — no real timers).
  it('AR-19 fallback cascade fires push → WA → SMS and delivers on SMS (deterministic)', async () => {
    const alert = freshClaimAlert(randomUUID(), randomUUID());
    const push = withSendCounter(rejectingProvider('fcm', 'push'));
    const wa = withSendCounter(rejectingProvider('whatsapp-business', 'whatsapp'));
    const sms = withSendCounter(createFixtureSmsProvider()); // shipped ACCEPT rung — reuse over reinvention
    const doubles: Record<Channel, CountingProvider> = {
      push,
      whatsapp: wa,
      sms,
      telegram: withSendCounter(rejectingProvider('telegram', 'telegram')),
    };

    const { sleep, waits } = sleepRecorder();
    const send: CascadeSender = async (channel) => {
      const rendered = render(alert, channel);
      const result = await doubles[channel].provider.send(rendered, TARGETS[channel]);
      return toOutcome(result); // the single shared helper (§3 item 2)
    };

    const result = await runChannelCascade(send, { sleep, backoffMs: [1, 1, 1] });

    expect(result.delivered).toBe(true);
    expect(result.deliveredChannel).toBe('sms');
    // push exhausted (1 initial + 3 retries), whatsapp exhausted (1 + 3), then sms delivers.
    expect(push.sendCount()).toBe(4);
    expect(wa.sendCount()).toBe(4);
    // Item 3 — STOP AFTER SMS: the SMS send was called EXACTLY ONCE (delivery halts the ladder immediately on
    // the first `sent` — no retry burned on SMS)...
    expect(sms.sendCount()).toBe(1);
    // ...and the LAST trail entry is sms:sent with NOTHING after it (SMS is terminal — "stop after SMS" is
    // proven by no SMS retry + no trailing entry, not by a nonexistent lower rung).
    expect(result.trail.at(-1)).toMatchObject({ channel: 'sms', attempt: 0, outcome: 'sent' });
    // Trail ordering follows the frozen ladder; Telegram NEVER enters the cascade.
    const channelsInOrder = [...new Set(result.trail.map((t) => t.channel))];
    expect(channelsInOrder).toEqual([...CANONICAL_CHANNEL_LADDER]);
    expect(result.trail.some((t) => t.channel === 'telegram')).toBe(false);
    expect(result.trail).toHaveLength(9); // push×4 + whatsapp×4 + sms×1
    // Backoff: 3 recorded sleeps per exhausted rung (push, wa) = 6; none before the delivering SMS attempt 0.
    expect(waits).toEqual([1, 1, 1, 1, 1, 1]);
  });

  // (2) `dispatch` writes an HONEST dispatch line + a per-channel send line with a PII-safe HMAC (live DB),
  //     with NON-ACCEPT outcomes — the shipped audit path's first real-path exercise beyond all-accept.
  it('dispatch writes an honest dispatch line + per-channel send lines with a PII-safe HMAC (non-accept outcomes)', async () => {
    const alertId = randomUUID();
    const pariwarId = randomUUID();
    const alert = freshClaimAlert(alertId, pariwarId);

    const providers: Record<Channel, readonly ChannelProvider[]> = {
      push: [rejectingProvider('fcm', 'push')],
      whatsapp: [rejectingProvider('whatsapp-business', 'whatsapp')],
      sms: [createFixtureSmsProvider()],
      telegram: [rejectingProvider('telegram', 'telegram')], // never selected — telegram is category-ineligible
    };
    const deps: DispatchDeps = {
      providers,
      resolveDelivery: () => Promise.resolve(TARGETS),
      hashRendered,
      audit: createAuditPort(pool),
    };

    await dispatch(alert, deps);

    const rows = await auditRowsFor(alertId);
    const dispatchLines = rows.filter((r) => r.action === 'alert.dispatch');
    const sendLines = rows.filter((r) => r.action === 'alert.channel_send');

    // Exactly ONE dispatch line whose `channels=` segment records every channel's TRUE outcome (proves
    // `dispatch` records suppressed/failed channels — not a sent-only filter).
    expect(dispatchLines).toHaveLength(1);
    const locator = dispatchLines[0]!.resourceLocator;
    expect(locator).toContain('push:rejected');
    expect(locator).toContain('whatsapp:rejected');
    expect(locator).toContain('sms:sent');
    expect(locator).toContain('telegram:skipped_ineligible');
    expect(dispatchLines[0]!.requestPayloadHash).toBe(alertPayloadDigest(alert));

    // THREE channel_send lines — push, whatsapp, sms each reached `send` (telegram was ineligible → no line).
    expect(sendLines).toHaveLength(3);
    const pushLine = sendLines.find((r) => r.resourceLocator.includes('channel=push'));
    const waLine = sendLines.find((r) => r.resourceLocator.includes('channel=whatsapp'));
    const smsLine = sendLines.find((r) => r.resourceLocator.includes('channel=sms'));
    expect(pushLine, 'expected an alert.channel_send row for push').toBeDefined();
    expect(waLine, 'expected an alert.channel_send row for whatsapp').toBeDefined();
    expect(smsLine, 'expected an alert.channel_send row for sms').toBeDefined();
    expect(pushLine!.responseStatus).toBe(400); // rejected
    expect(waLine!.responseStatus).toBe(400); // rejected
    expect(smsLine!.responseStatus).toBe(202); // accepted

    // Item 4 — future-proof the HMAC assertion: compute the expected value via the SAME production helper the
    // audit path uses (`hashRendered`), NOT a hand-inlined blindIndex. If the HMAC construction (algorithm,
    // domain-separation label, context binding) ever changes, the expected value tracks it automatically.
    const expectedSmsHash = await hashRendered(render(alert, 'sms'), pariwarId);
    expect(smsLine!.requestPayloadHash).toBe(expectedSmsHash);
    expect(smsLine!.requestPayloadHash).toMatch(/^[0-9a-f]{64}$/);
    // The load-bearing AI-4-3(c) property: a KEYED HMAC, never a brute-forceable raw sha256 of member content.
    expect(smsLine!.requestPayloadHash).not.toBe(sha256Hex(canonicalJsonStringify(render(alert, 'sms'))));
  });

  // (3) The composed Epic-6-shaped PROTOTYPE HARNESS — cascade + audit interlock end-to-end (live DB). The H-7
  //     headline: prove the two primitives COMPOSE into the shape Epic 6 will build.
  //
  // ── BANNER (§5, item 1) — this is a PROTOTYPE HARNESS, NOT a production seam ────────────────────────────
  // This harness COMPOSES the shipped primitives (`runChannelCascade` + `createAuditPort` /
  // `createRenderedMessageHash`) to prove they interlock on the real path. It MODELS — it does NOT commit —
  // the composition Epic 6's first live caller (`claim_status_change`) will build. It is TEST-ONLY: it touches
  // NO frozen primitive (dispatch / cascade / provider / render / audit / CANONICAL_CHANNEL_LADDER) and adds
  // NO production live-dispatch call site — Epic 6 remains the first live caller. If Epic 6 wires the
  // composition differently, this test still validates that the primitives interlock; it does not pin the seam.
  it('[PROTOTYPE HARNESS — models the Epic-6 live-dispatch seam, not production] cascade + audit interlock end-to-end', async () => {
    const alertId = randomUUID();
    const pariwarId = randomUUID();
    const alert = freshClaimAlert(alertId, pariwarId);
    const auditPort = createAuditPort(pool);

    const smsCounter = withSendCounter(createFixtureSmsProvider());
    const doubles: Record<Channel, ChannelProvider> = {
      push: rejectingProvider('fcm', 'push'),
      whatsapp: rejectingProvider('whatsapp-business', 'whatsapp'),
      sms: smsCounter.provider,
      telegram: rejectingProvider('telegram', 'telegram'),
    };

    // Model the top-level dispatch line (as `dispatch` writes it) BEFORE the cascade runs.
    await auditPort({
      pariwarId,
      actorId: null,
      actorRole: null,
      action: 'alert.dispatch',
      resourceLocator: `alert:${alertId};channels=cascade`,
      requestPayloadHash: alertPayloadDigest(alert),
      responseStatus: 200,
      traceId: alertId,
    });

    // The composed sender: per attempt → render → provider.send → toOutcome → WRITE the per-channel
    // alert.channel_send audit line via the REAL audit port + `hashRendered` (PII-safe HMAC).
    const { sleep } = sleepRecorder();
    const send: CascadeSender = async (channel) => {
      const rendered = render(alert, channel);
      const result = await doubles[channel].send(rendered, TARGETS[channel]);
      const renderedHash = await hashRendered(rendered, pariwarId);
      await auditPort({
        pariwarId,
        actorId: null,
        actorRole: null,
        action: 'alert.channel_send',
        resourceLocator: `alert:${alertId};channel=${channel};provider=${doubles[channel].id}`,
        requestPayloadHash: renderedHash,
        responseStatus: result.status === 'accepted' ? 202 : 400,
        traceId: alertId,
      });
      return toOutcome(result); // the single shared helper (§3 item 2)
    };

    const result = await runChannelCascade(send, { sleep, backoffMs: [1, 1, 1] });

    // Cascade delivered on SMS + the SAME "stop after SMS" property as Test (1).
    expect(result.deliveredChannel).toBe('sms');
    expect(smsCounter.sendCount()).toBe(1);
    expect(result.trail.at(-1)).toMatchObject({ channel: 'sms', attempt: 0, outcome: 'sent' });

    // The audit rows for this alert INTERLOCK: one dispatch line + channel_send lines for push, whatsapp, sms
    // (membership by unique alertId — rows accumulate in the global chain).
    const rows = await auditRowsFor(alertId);
    expect(rows.filter((r) => r.action === 'alert.dispatch')).toHaveLength(1);
    const sendChannels = new Set(
      rows
        .filter((r) => r.action === 'alert.channel_send')
        .map((r) => /channel=([a-z]+)/.exec(r.resourceLocator)?.[1]),
    );
    expect(sendChannels.has('push')).toBe(true);
    expect(sendChannels.has('whatsapp')).toBe(true);
    expect(sendChannels.has('sms')).toBe(true);

    // The delivering SMS line carries the PII-safe HMAC (via the same production helper), never a raw sha256.
    const smsLine = rows.find((r) => r.action === 'alert.channel_send' && r.resourceLocator.includes('channel=sms'));
    expect(smsLine, 'expected an alert.channel_send row for sms').toBeDefined();
    expect(smsLine!.requestPayloadHash).toBe(await hashRendered(render(alert, 'sms'), pariwarId));
    expect(smsLine!.requestPayloadHash).toMatch(/^[0-9a-f]{64}$/);
    expect(smsLine!.requestPayloadHash).not.toBe(sha256Hex(canonicalJsonStringify(render(alert, 'sms'))));
  });
});
