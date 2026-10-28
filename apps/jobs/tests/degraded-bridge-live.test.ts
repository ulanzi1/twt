// The degraded-mode cycle-open SMS bridge, end to end through the REAL child, the REAL seam and the REAL record — Story 5.8b
// (Task 8; T18; AC4, AC5, AC3; `2026-10-28-415` FS3 (a), FS4 (d), FS5 (a), FS6 / `-414` Q2 A). Live DB, own-committing.
//
// What the unit suites cannot prove, proven here against Postgres: the bridged child (time-critical cycle-open) reads each member's
// TEXT language (`readMemberTextLanguages` — a member who chose English gets the English text), reads the death overlay set-based
// (`listAccountFrozenMemberIds` — the member whose own death was reported gets ⛔ text), resolves the family's name from a REAL KYC
// envelope through the Pariwar's presentation mode, fits it into the two boxes ONCE, and the seam texts each member FIRST — ONE
// gateway call per member, ONE `alert_sms_sends` row (`cycle_open` / `cycle_open_bridge`) — while the push ladder runs only for
// the member who was not texted. The link before the child — declare → freeze → `openCycleAlert` sets `time_critical` from the
// declaration at the freeze instant — is proven live by `packages/domain/tests/integration/alert/cycle-open-derisk.spec.ts` (AC4 and
// the 5.8b legs); the child payload here carries what that alert's parent copies (`timeCritical: true`).
//
// Skips without `DATABASE_URL`. A skip is NOT evidence: when it skips, this leg is un-attested for that run.

import { randomUUID } from 'node:crypto';

import type { Channel, ChannelProvider, SmsAppClient, SmsGatewayMessage } from '@twt/channels';
import { bindScopedDb, claim, encryption, ids, schema } from '@twt/domain';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildJobsEncryptionDeps } from '../src/deps.js';
import { createAlertSmsSender } from '../src/scheduler/alert-sms-send.js';
import { runContributionNotifyChild, type ContributionNotifyTriggerDeps } from '../src/scheduler/contribution-notify-triggers.js';
import { renderContributionSms } from '../src/scheduler/contribution-sms-templates.js';
import { smsMemberName } from '../src/scheduler/sms-member-name.js';
import { onOwnTx } from './_claim-correction-seed.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);
const enc = buildJobsEncryptionDeps('degraded-bridge-live-pepper');
const NAME = 'Ramesh Kumar Sharma';
const TEMPLATE_ID = '64b0c0ffee0123456789b58b';
/** The child's clock — AFTER the seeded claim events (the overlay is read AT `now`; events carry the DB's real `occurred_at`). */
const NOW = new Date(Date.now() + 10 * 60_000);

function rejecting(channel: Channel): ChannelProvider & { calls: number } {
  const p = {
    id: (channel === 'push' ? 'fcm' : channel) as never,
    channel,
    scope: 'global' as const,
    calls: 0,
    send() {
      p.calls += 1;
      return Promise.resolve({ channel, provider: p.id, status: 'rejected' as const, providerMessageId: null, detail: 'unavailable:x' });
    },
    getStatus: (messageId: string) => Promise.resolve({ providerMessageId: messageId, state: 'unknown' as const }),
  };
  return p;
}

describe.skipIf(!hasDatabase)('Story 5.8b — the bridge, end to end through the real child, seam and record (T18)', { timeout: 60_000 }, () => {
  let pool: pg.Pool;
  const pariwars: string[] = [];
  const alertIds: string[] = [];

  beforeAll(() => {
    pool = new pg.Pool({ connectionString: DATABASE_URL, max: 6, ssl: false, connectionTimeoutMillis: 5000 });
  });
  afterAll(async () => {
    try {
      if (pariwars.length === 0) return;
      const c = await pool.connect();
      try {
        await c.query('BEGIN');
        await c.query("SET LOCAL session_replication_role = 'replica'");
        const { rows } = await c.query<{ table_name: string }>(
          `SELECT c.table_name FROM information_schema.columns c
             JOIN information_schema.tables t ON t.table_schema = c.table_schema AND t.table_name = c.table_name
            WHERE c.table_schema = 'public' AND c.column_name = 'pariwar_id' AND t.table_type = 'BASE TABLE'`,
        );
        for (const { table_name } of rows) await c.query(`DELETE FROM "${table_name}" WHERE pariwar_id::text = ANY($1)`, [pariwars]);
        for (const a of alertIds) await c.query(`DELETE FROM idempotency_keys WHERE key LIKE $1`, [`contribution.notify:${a}:%`]);
        await c.query('COMMIT');
      } catch (e) {
        await c.query('ROLLBACK').catch(() => undefined);
        throw e;
      } finally {
        c.release();
      }
    } finally {
      await pool.end();
    }
  });

  /**
   * A fresh Pariwar (passport `hi`); the deceased (a REAL KYC name envelope) and their claim through the projector; three rostered
   * members with REAL mobile envelopes — `en` (chose English), `hi` (never chose), `frozen` (their OWN death reported: a claim intake
   * naming them); a committed `alerts` row for the cycle. `shielded` — the Pariwar's presentation mode row says `shielded_name`
   * (8.16; code review 2026-10-28, second pass — AC4 / T12 through the REAL resolver).
   */
  async function world(o: { readonly shielded?: boolean } = {}) {
    const pid = randomUUID();
    pariwars.push(pid);
    await pool.query(
      `INSERT INTO pariwar_passport (pariwar_id, display_name_en, display_name_hi, legal_name, branding_bundle, locale_default)
       VALUES ($1, 'Test Pariwar EN', 'परीक्षण परिवार', 'Test Welfare Trust', $2, 'hi')`,
      [pid, JSON.stringify({ logo_url: 'https://x/l.png', primary_color: '#0A3D62', secondary_color: '#FFFFFF' })],
    );
    if (o.shielded) {
      await pool.query(`INSERT INTO pariwar_public_name_presentation (pariwar_id, mode) VALUES ($1, 'shielded_name')`, [pid]);
    }
    const deceased = randomUUID();
    const claimCaseId = randomUUID();
    const m = { en: randomUUID(), hi: randomUUID(), frozen: randomUUID() };
    const mobiles = { [m.en]: '+919876500001', [m.hi]: '+919876500002', [m.frozen]: '+919876500003' } as Record<string, string>;
    await onOwnTx(pool, pid, async (client) => {
      const db = bindScopedDb(client);
      const p = ids.pariwarId(pid);
      await db.insert(schema.members).values({ memberId: ids.memberId(deceased), pariwarId: p, state: 'active', stateEventVersion: 1 });
      await db.insert(schema.memberKycProfiles).values({
        memberId: ids.memberId(deceased),
        pariwarId: p,
        nameCiphertext: await encryption.encryptKycField(NAME, pid, enc),
        dobCiphertext: await encryption.encryptKycField('1950-01-01', pid, enc),
        verificationStrength: 'self_declared',
        source: 'manual',
      });
      for (const id of Object.values(m)) {
        await client.query(`INSERT INTO members (member_id, pariwar_id, state, state_event_version) VALUES ($1, $2, 'active', 1)`, [id, pid]);
        await client.query(`INSERT INTO member_identities (member_id, pariwar_id, mobile_ciphertext, mobile_blind_index) VALUES ($1, $2, $3, $4)`, [
          id,
          pid,
          await encryption.encryptMobile(mobiles[id]!, enc),
          `idx-${randomUUID()}`,
        ]);
      }
      const emit = (claimId: string, deceasedId: string) =>
        claim.projectClaimState(client, {
          claimCaseId: ids.claimId(claimId),
          pariwarId: p,
          deceasedMemberId: ids.memberId(deceasedId),
          intakeChannels: ['member_app'],
          claimantActorId: null,
          eventType: 'claim.intake_initiated' as never,
          payload: { from_state: null, to_state: 'intake_pending', trigger: 'test', actor: 'system', deceased_member_id: deceasedId, intake_channel: 'member_app', claimant_actor_id: null } as never,
          actorId: null,
        });
      await emit(claimCaseId, deceased);
      // FS4 (d) — the rostered member whose OWN death has now been reported (the `account-frozen` overlay).
      await emit(randomUUID(), m.frozen);
    });
    // The member who chose English (6.35) — as the owner (the column grant is the app's own write path's).
    await pool.query(`UPDATE members SET preferred_locale = 'en', preferred_locale_set_at = now() WHERE member_id = $1`, [m.en]);
    const alertId = randomUUID();
    const cycleId = randomUUID();
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      await c.query("SET LOCAL app.alert_state_writer = 'on'");
      await c.query(
        `INSERT INTO alerts (alert_id, cycle_id, pariwar_id, pool_count, current_state, state_event_version, created_by_actor)
         VALUES ($1, $2, $3, 1, 'live', 3, 'system')`,
        [alertId, cycleId, pid],
      );
      await c.query('COMMIT');
    } finally {
      c.release();
    }
    alertIds.push(alertId);
    return { pid, claimCaseId, m, mobiles, alertId, cycleId };
  }

  function harness() {
    const sent: SmsGatewayMessage[] = [];
    const alarms: string[] = [];
    const push = rejecting('push');
    const smsAppClient: SmsAppClient = {
      isConfigured: () => true,
      messaging: () => ({
        send: (msg) => {
          sent.push(msg);
          return Promise.resolve(`gw-${randomUUID()}`);
        },
      }),
    };
    const deps: ContributionNotifyTriggerDeps = {
      pool,
      serviceDb: {} as never,
      encryption: enc,
      audit: () => Promise.resolve(),
      hashRendered: () => Promise.resolve('a'.repeat(64)),
      resolveProviders: () => Promise.resolve({ push: [push, { ...push, id: 'apns' as never }], whatsapp: [rejecting('whatsapp')], sms: [rejecting('sms')], telegram: [] }),
      now: () => NOW,
      onAlarm: (msg) => alarms.push(msg),
      readBridgeSwitch: () => Promise.resolve(true),
      alertSms: createAlertSmsSender({
        pool,
        smsAppClient,
        resolveConfig: (key) => Promise.resolve(key.startsWith('sms.dlt.template_id.contribution.cycle_open_bridge.') ? TEMPLATE_ID : null),
        onAlarm: (msg) => alarms.push(msg),
        finaliseBackoffMs: [0, 0],
      }),
    };
    return { deps, sent, alarms, push };
  }

  const payload = (w: Awaited<ReturnType<typeof world>>) => ({
    kind: 'cycle_open' as const,
    alertId: w.alertId,
    cycleId: w.cycleId,
    poolId: randomUUID(),
    poolIndex: 2,
    poolCanonicalIdentifier: 'TWT-TEST-2026-10-C',
    claimCaseId: w.claimCaseId,
    fixedAmount: 100,
    poolCount: 3,
    memberIds: [w.m.en, w.m.hi, w.m.frozen],
    timeCritical: true,
  });

  it('⭐ each rostered member is texted ONCE, FIRST, in their own language, naming the family from the real KYC envelope; the member whose death was reported is ⛔ texted; ONE row each', async () => {
    const w = await world();
    const h = harness();
    const result = await runContributionNotifyChild(
      h.deps,
      { requestId: 'req', pariwarId: w.pid, actorId: null, traceId: 'trace', payload: payload(w) },
      { id: 'job-e2e', retryCount: 0, retryLimit: 4 },
    );
    expect(result).toMatchObject({ attempted: 3, delivered: 2, inAppOnly: 1 });

    const boxes = smsMemberName(NAME);
    if (boxes.kind === 'too_long') throw new Error('fixture does not fit');
    const values = (pool: string) => [
      { name: 'pool', value: pool },
      { name: 'member1', value: boxes.boxes[0] },
      { name: 'member2', value: boxes.boxes[1] },
    ];
    const byTo = new Map(h.sent.map((s) => [s.to, s]));
    expect([...byTo.keys()].sort()).toEqual([w.mobiles[w.m.en], w.mobiles[w.m.hi]].sort());
    // en — the letter code (the curated pool name is Hindi — T10); hi — the letter code too here (⛔ curated name configured).
    expect(byTo.get(w.mobiles[w.m.en]!)).toMatchObject({
      templateId: TEMPLATE_ID,
      values: values('C'),
      body: renderContributionSms('cycle_open_bridge', 'en', { pool: 'C', member1: boxes.boxes[0], member2: boxes.boxes[1] }),
    });
    expect(byTo.get(w.mobiles[w.m.hi]!)).toMatchObject({
      values: values('C'),
      body: renderContributionSms('cycle_open_bridge', 'hi', { pool: 'C', member1: boxes.boxes[0], member2: boxes.boxes[1] }),
    });
    expect(byTo.get(w.mobiles[w.m.en]!)!.body).toContain(NAME);

    const { rows } = await pool.query<{ member_id: string; occasion: string; message: string; locale: string; outcome: string }>(
      `SELECT member_id, occasion, message, locale, outcome FROM alert_sms_sends WHERE alert_id = $1 ORDER BY locale`,
      [w.alertId],
    );
    expect(rows).toEqual([
      { member_id: w.m.en, occasion: 'cycle_open', message: 'cycle_open_bridge', locale: 'en', outcome: 'accepted' },
      { member_id: w.m.hi, occasion: 'cycle_open', message: 'cycle_open_bridge', locale: 'hi', outcome: 'accepted' },
    ]);
    // The texted members' push was ⛔ run (FS3 (a)); only the death-overlay member ran the ladder (one device-less push rung ⇒ 0 sends).
    expect(h.push.calls).toBe(0);
    // ⛔ a name in any alarm (T11).
    expect(h.alarms.join('\n')).not.toContain('Ramesh');

    // A job retry / sweep re-run: ⛔ second text (the keyed store AND the send row).
    const again = await runContributionNotifyChild(
      h.deps,
      { requestId: 'req', pariwarId: w.pid, actorId: null, traceId: 'trace', payload: payload(w) },
      { id: 'job-e2e', retryCount: 1, retryLimit: 4 },
    );
    expect(again.alreadySent).toBe(3);
    expect(h.sent).toHaveLength(2);
  });
  // ⭐ Code review 2026-10-28 (second pass) — AC4 / T12: the unit legs fed the shielded string in; here the Pariwar's REAL
  // presentation-mode row drives the REAL resolver (8.16), and the text carries the SHIELDED form — first name + last initial — never
  // the full legal name.
  it('⭐ AC4 / T12 — a `shielded_name` Pariwar: the bridge text names the family in the SHIELDED form from the real resolver (⛔ the full name anywhere on the wire)', async () => {
    const w = await world({ shielded: true });
    const h = harness();
    await runContributionNotifyChild(
      h.deps,
      { requestId: 'req', pariwarId: w.pid, actorId: null, traceId: 'trace', payload: payload(w) },
      { id: 'job-shielded', retryCount: 0, retryLimit: 4 },
    );
    const SHIELDED = 'Ramesh S.';
    const boxes = smsMemberName(SHIELDED);
    if (boxes.kind === 'too_long') throw new Error('fixture does not fit');
    expect(h.sent).toHaveLength(2);
    for (const msg of h.sent) {
      expect(msg.values.slice(1)).toEqual([
        { name: 'member1', value: boxes.boxes[0] },
        { name: 'member2', value: boxes.boxes[1] },
      ]);
      expect(msg.body).toContain(SHIELDED);
      expect(msg.body).not.toContain('Kumar');
      expect(msg.body).not.toContain('Sharma');
    }
    expect(h.alarms.join('\n')).not.toContain('Ramesh');
  });
});
