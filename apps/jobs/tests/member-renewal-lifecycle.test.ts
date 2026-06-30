// Renewal-lifecycle cron — Story 3.8 (Task 5; AC1/AC3). Live DB (:5433).
//
// Exercises the @twt/domain tick core (`runRenewalLifecycleTick`) directly with a controlled `now`
// (the cron's worker body is a thin wrapper that just publishes the returned reminders). Asserts:
//   · grace_entered fires at +1d (active → active-in-grace) + the Day-0 valid_through_reached marker;
//   · grace_expired fires at +91d (active-in-grace → lapsed-unpaid);
//   · re-running the tick emits NO duplicate events (monotonic + idempotent, Decision 4);
//   · the reminder cadence surfaces a nudge at each of +30/60/75/89 and NOT at an off-cadence day.
//
// Members are SEEDED committed (own-committing writers accumulate rows) — assert MEMBERSHIP not counts,
// and scope every assertion to a FRESH member's stream so per-stream counts stay deterministic. The tick
// processes ALL candidates in the window; we only inspect the member we seeded.

import { randomUUID } from 'node:crypto';

import { ids, member, withPariwarScope, type CreatedDb } from '@twt/domain';
import { createDb } from '@twt/domain';
import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);
const DAY_MS = 24 * 60 * 60 * 1000;

type SeedState = 'active' | 'active-in-grace';
type Json = Record<string, unknown>;

function sequenceFor(target: SeedState): Array<[string, Json]> {
  const seq: Array<[string, Json]> = [
    ['member.signup_initiated', { from_state: null, to_state: 'pending-kyc', trigger: 'signup', actor: 'member' }],
    ['member.kyc_manual_fallback', { from_state: 'pending-kyc', to_state: 'pending-fee', trigger: 'kyc_manual', actor: 'member', reason: 'm' }],
    ['member.vyawastha_shulk_paid', { from_state: 'pending-fee', to_state: 'lock-in', trigger: 'pay', actor: 'member', utr: 'TEST-UTR-0001', amount_inr: 110, kind: 'signup' }],
    ['member.lock_in_expired', { from_state: 'lock-in', to_state: 'active', trigger: 'expiry', actor: 'system', kyc_verified: true }],
  ];
  if (target === 'active') return seq;
  seq.push(['member.grace_entered', { from_state: 'active', to_state: 'active-in-grace', trigger: 'grace', actor: 'system' }]);
  return seq;
}

describe.skipIf(!hasDatabase)('member-renewal-lifecycle tick — live DB (:5433)', () => {
  let pool: pg.Pool;
  let created: CreatedDb;

  beforeAll(() => {
    created = createDb(DATABASE_URL!, { max: 4, ssl: false });
    pool = created.pool;
  });
  afterAll(() => pool.end());

  /** Seed a member at `target` + a receipt at `validThrough` (committed). Returns ids. */
  async function seed(
    target: SeedState,
    validThrough: Date,
  ): Promise<{ memberId: string; pariwarId: string }> {
    const memberId = randomUUID();
    const pariwarId = randomUUID();
    await withPariwarScope(pool, pariwarId, async (_tx, client) => {
      const mid = ids.memberId(memberId);
      const pid = ids.pariwarId(pariwarId);
      for (const [eventType, payload] of sequenceFor(target)) {
        await member.projectMemberState(client, {
          memberId: mid, pariwarId: pid, eventType: eventType as never, actorId: memberId, payload,
        });
      }
    });
    await pool.query(
      `INSERT INTO vyawastha_shulk_receipts (member_id, pariwar_id, tr, utr, amount_inr, payment_method, valid_through)
       VALUES ($1, $2, $3, '123456789012', 110, 'upi_intent', $4)`,
      [memberId, pariwarId, `seed-${randomUUID()}`, validThrough.toISOString()],
    );
    return { memberId, pariwarId };
  }

  async function eventTypes(memberId: string): Promise<string[]> {
    const r = await pool.query<{ event_type: string }>(
      `SELECT event_type FROM events_log WHERE stream_id = $1 ORDER BY event_version`,
      [memberId],
    );
    return r.rows.map((x) => x.event_type);
  }

  async function memberState(memberId: string): Promise<string | undefined> {
    const r = await pool.query<{ state: string }>(`SELECT state FROM members WHERE member_id = $1`, [memberId]);
    return r.rows[0]?.state;
  }

  it('grace_entered at +1d (+ Day-0 marker), grace_expired at +91d, idempotent re-run', async () => {
    // validThrough 2 days ago → "now" is past +1d → grace_entered should fire.
    const validThrough = new Date(Date.now() - 2 * DAY_MS);
    const { memberId } = await seed('active', validThrough);

    // Tick 1 (now): active + now >= validThrough+1d → valid_through_reached + grace_entered.
    await member.runRenewalLifecycleTick(pool, new Date());
    expect(await memberState(memberId)).toBe('active-in-grace');
    let types = await eventTypes(memberId);
    expect(types.filter((e) => e === 'member.valid_through_reached')).toHaveLength(1);
    expect(types.filter((e) => e === 'member.grace_entered')).toHaveLength(1);
    expect(types).not.toContain('member.grace_expired');

    // Tick 2 at validThrough + 91d → active-in-grace + past +91d → grace_expired.
    const at91 = new Date(validThrough.getTime() + 91 * DAY_MS);
    await member.runRenewalLifecycleTick(pool, at91);
    expect(await memberState(memberId)).toBe('lapsed-unpaid');
    types = await eventTypes(memberId);
    expect(types.filter((e) => e === 'member.grace_expired')).toHaveLength(1);

    // Tick 3 (re-run, same now) → no duplicate events (monotonic + idempotent).
    const before = (await eventTypes(memberId)).length;
    await member.runRenewalLifecycleTick(pool, at91);
    const after = await eventTypes(memberId);
    expect(after).toHaveLength(before);
    expect(after.filter((e) => e === 'member.valid_through_reached')).toHaveLength(1);
    expect(after.filter((e) => e === 'member.grace_entered')).toHaveLength(1);
    expect(after.filter((e) => e === 'member.grace_expired')).toHaveLength(1);
  });

  it('reminder cadence: a nudge surfaces at +30/60/75/89, and NOT on an off-cadence day', async () => {
    for (const offset of member.RENEWAL_REMINDER_OFFSETS) {
      const validThrough = new Date(Date.now() - offset * DAY_MS);
      const { memberId } = await seed('active-in-grace', validThrough);
      const result = await member.runRenewalLifecycleTick(pool, new Date());
      const mine = result.remindersDue.filter((r) => r.memberId === memberId);
      expect(mine).toHaveLength(1);
      expect(mine[0]?.reminderOffsetDays).toBe(offset);
      expect(mine[0]?.graceRemainingDays).toBeGreaterThan(0);
    }

    // Off-cadence day (+31) → no nudge for this member.
    const offCadence = new Date(Date.now() - 31 * DAY_MS);
    const { memberId: quietMember } = await seed('active-in-grace', offCadence);
    const result = await member.runRenewalLifecycleTick(pool, new Date());
    expect(result.remindersDue.filter((r) => r.memberId === quietMember)).toHaveLength(0);
  });
});
