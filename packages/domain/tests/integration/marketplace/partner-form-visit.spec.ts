// Story 12.5b (Task 5; AC6, AC8, AC9, AC10; QE8, QE9 (A), QE11–QE13; I3–I5; TR22) — the partner-form domain, live, as `twt_app`.
//
// `openPartnerFormVisit`: ONE visit row + ONE `went_to_partner` count in one savepoint, the stored URL returned BYTE FOR BYTE (⛔ a
// member field, ⛔ the visit id in it — AC6); every QE11 refusal by its reason, writing nothing, with a control write after it (TR22); ⛔
// audit line and ⛔ event for a visit (QE9 (A)). `countPartnerFormEvent`: an IST-day UPSERT, ⛔ member, refuses `trust_sends`.
// `recordPartnerFormTotals`: below 5 stored as "fewer than 5"; `listPartnerFormFigures` floors every figure and shows the newest entry
// per period. Erasure: under FORCE RLS the visit DELETE removes exactly the member's rows; another member's survives (AC8).

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { bindScopedDb } from '../../../src/db.js';
import { createFakeKmsProvider } from '../../../src/encryption/index.js';
import { memberId as toMemberId, moduleId as toModuleId, type PariwarId } from '../../../src/ids/index.js';
import { ModuleNotPartnerFormError, PartnerFormTotalsInvalidError, PartnerFormVisitRefusedError } from '../../../src/marketplace/errors.js';
import {
  countPartnerFormEvent,
  listPartnerFormFigures,
  openPartnerFormVisit,
  recordPartnerFormTotals,
} from '../../../src/marketplace/partner-form.js';
import { anonymizeMember } from '../../../src/member/anonymize.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppScope, seedClaim, seedEvent } from '../_helpers.js';
import { SEEDED_PARTNER_FORM_URL, rawInsertParams, rawInsertSqlWith, seedPartner } from './_fixtures.js';
import { seedMemberRow, seedModule } from './_lead-handoff-fixtures.js';

type Client = ReturnType<typeof getTx>['client'];

const kms = createFakeKmsProvider({ kekBytes: new Uint8Array(32).fill(7), hmacKeyBytes: new Uint8Array(32).fill(9) });
const kekRef = { resourceName: 'fake:rtbf-12-5b-kek' };

const JOINED = [
  { type: 'member.signup_initiated' },
  { type: 'member.kyc_completed' },
  { type: 'member.vyawastha_shulk_paid' },
  { type: 'member.lock_in_expired', payload: { kyc_verified: true } },
];

async function memberEvents(client: Client, pariwarId: string, memberId: string, events: ReadonlyArray<{ type: string; payload?: unknown }>): Promise<void> {
  const tx = bindScopedDb(client);
  for (const [i, e] of events.entries()) {
    await seedEvent(tx, pariwarId, {
      streamId: memberId,
      eventType: e.type,
      payload: e.payload ?? {},
      eventVersion: i + 1,
      occurredAt: new Date(Date.now() - (events.length - i) * 60_000),
    });
  }
}

/** A partner, an ACTIVE partner_form module and a joined member in PARIWAR_A (as the superuser). */
async function world(client: Client) {
  const partnerId = await seedPartner(client, PARIWAR_A);
  const moduleId = await seedModule(client, PARIWAR_A, partnerId, { route: 'partner_form' });
  const memberId = await seedMemberRow(client, PARIWAR_A);
  await memberEvents(client, PARIWAR_A, memberId, JOINED);
  return { partnerId, moduleId, memberId };
}

async function visitsOf(client: Client, memberId: string): Promise<{ visit_id: string; module_id: string }[]> {
  return (await client.query<{ visit_id: string; module_id: string }>('SELECT visit_id, module_id FROM marketplace_partner_form_visits WHERE member_id = $1', [memberId])).rows;
}

async function countOf(client: Client, moduleId: string, kind: string): Promise<number> {
  const { rows } = await client.query<{ n: string | null }>(
    'SELECT sum(count) AS n FROM marketplace_partner_form_counts WHERE module_id = $1 AND kind = $2',
    [moduleId, kind],
  );
  return Number(rows[0]?.n ?? 0);
}

const open = (client: Client, moduleId: string, memberId: string, pariwarId: PariwarId = PARIWAR_A) =>
  openPartnerFormVisit(client, { pariwarId, moduleId: toModuleId(moduleId), memberId: toMemberId(memberId) });

describe.skipIf(!hasDatabase)('Story 12.5b — openPartnerFormVisit (AC6, AC8; QE11)', () => {
  setupLiveDb();

  it('AC6 / AC8: ONE visit row + ONE went_to_partner count; the URL returned is the STORED one, byte for byte, with no member field, member id or visit id in it', async () => {
    const { client } = getTx();
    const w = await world(client);
    await enterAppScope(client, PARIWAR_A);
    const r = await open(client, w.moduleId, w.memberId);
    expect(r.partnerFormUrl).toBe(SEEDED_PARTNER_FORM_URL);
    for (const leaked of [w.memberId, r.visitId, w.memberId.replace(/-/g, '')]) expect(r.partnerFormUrl).not.toContain(leaked);
    await client.query('RESET ROLE');
    const stored = await client.query<{ partner_form_url: string }>('SELECT partner_form_url FROM marketplace_modules WHERE module_id = $1', [w.moduleId]);
    expect(r.partnerFormUrl).toBe(stored.rows[0]!.partner_form_url);
    expect(await visitsOf(client, w.memberId)).toEqual([{ visit_id: r.visitId, module_id: w.moduleId }]);
    expect(await countOf(client, w.moduleId, 'went_to_partner')).toBe(1);
    // The count carries ⛔ member; the day is the IST date from the DB (TR20).
    const day = await client.query<{ ok: boolean }>(
      `SELECT day = (clock_timestamp() AT TIME ZONE 'Asia/Kolkata')::date AS ok FROM marketplace_partner_form_counts WHERE module_id = $1`,
      [w.moduleId],
    );
    expect(day.rows).toEqual([{ ok: true }]);
  });

  it('QE8: ONE row per opening — a second opening is a second row (⛔ dedup), and the count is 2', async () => {
    const { client } = getTx();
    const w = await world(client);
    await enterAppScope(client, PARIWAR_A);
    const a = await open(client, w.moduleId, w.memberId);
    const b = await open(client, w.moduleId, w.memberId);
    expect(a.visitId).not.toBe(b.visitId);
    await client.query('RESET ROLE');
    expect(await visitsOf(client, w.memberId)).toHaveLength(2);
    expect(await countOf(client, w.moduleId, 'went_to_partner')).toBe(2);
  });

  it('QE9 (A): a visit writes ⛔ audit line and ⛔ events_log event', async () => {
    const { client } = getTx();
    const w = await world(client);
    await enterAppScope(client, PARIWAR_A);
    await open(client, w.moduleId, w.memberId);
    await client.query('RESET ROLE');
    // By CONTENT (⛔ global row counts — other specs commit concurrently). ⛔ event on the module's stream, and ⛔ audit line naming the module — the visit wrote neither.
    expect((await client.query(`SELECT 1 FROM events_log WHERE stream_id = $1`, [w.moduleId])).rows).toHaveLength(0);
    expect((await client.query(`SELECT 1 FROM audit_log_entries WHERE resource_locator LIKE '%' || $1 || '%'`, [w.moduleId])).rows).toHaveLength(0);
    expect((await client.query(`SELECT 1 FROM audit_log_entries WHERE resource_locator LIKE '%' || $1 || '%'`, [w.memberId])).rows).toHaveLength(0);
    // And the visit's own transaction wrote ⛔ events_log row at all (this transaction's xid).
    expect((await client.query(`SELECT 1 FROM events_log WHERE xmin::text = txid_current()::text AND stream_id <> $1`, [w.memberId])).rows).toHaveLength(0);
  });

  type Setup = (client: Client, w: Awaited<ReturnType<typeof world>>) => Promise<{ moduleId?: string; memberId?: string }>;
  const cases: [string, Setup][] = [
    ['not_found', async () => ({ moduleId: randomUUID() })],
    [
      'not_partner_form',
      async (client, w) => ({ moduleId: await seedModule(client, PARIWAR_A, w.partnerId) }),
    ],
    [
      'not_active',
      async (client, w) => {
        const id = randomUUID();
        await client.query("SET LOCAL app.marketplace_module_state_writer = 'on'");
        await client.query(rawInsertSqlWith({ route: 'partner_form' }), rawInsertParams(id, PARIWAR_A, { partnerId: w.partnerId, capacity: null }));
        await client.query("SET LOCAL app.marketplace_module_state_writer = 'off'");
        return { moduleId: id };
      },
    ],
    [
      'outside_window',
      async (client, w) => {
        const id = randomUUID();
        const closed = rawInsertSqlWith({ route: 'partner_form' }).replace(
          "now() - interval '1 hour', now() + interval '1 hour', $4,",
          "now() - interval '2 hours', now() - interval '1 hour', $4,",
        );
        expect(closed).toContain("now() - interval '2 hours'");
        await client.query("SET LOCAL app.marketplace_module_state_writer = 'on'");
        await client.query(closed, rawInsertParams(id, PARIWAR_A, { partnerId: w.partnerId, capacity: null }));
        await client.query(`UPDATE marketplace_modules SET current_state = 'active', state_event_version = 2 WHERE module_id = $1`, [id]);
        await client.query("SET LOCAL app.marketplace_module_state_writer = 'off'");
        return { moduleId: id };
      },
    ],
    ['member_not_in_pariwar', async (client) => ({ memberId: await seedMemberRow(client, PARIWAR_B) })],
    [
      'member_erased',
      async (client) => {
        const m = await seedMemberRow(client, PARIWAR_A);
        await memberEvents(client, PARIWAR_A, m, [...JOINED, { type: 'member.withdrawal_completed' }, { type: 'member.rtbf_anonymized' }]);
        return { memberId: m };
      },
    ],
    [
      'member_withdrawn',
      async (client) => {
        const m = await seedMemberRow(client, PARIWAR_A);
        await memberEvents(client, PARIWAR_A, m, [...JOINED, { type: 'member.withdrawal_completed' }]);
        return { memberId: m };
      },
    ],
    [
      'member_terminated',
      async (client) => {
        const m = await seedMemberRow(client, PARIWAR_A);
        await memberEvents(client, PARIWAR_A, m, [
          ...JOINED,
          { type: 'member.moderation.suspended', payload: { reason_code: 'fraud' } },
          { type: 'member.moderation.terminated', payload: { reason_code: 'fraud' } },
        ]);
        return { memberId: m };
      },
    ],
    [
      'account_frozen',
      async (client, w) => {
        await seedEvent(bindScopedDb(client), PARIWAR_A, {
          streamId: randomUUID(),
          eventType: 'claim.intake_initiated',
          payload: { deceased_member_id: w.memberId },
          occurredAt: new Date(Date.now() - 3_600_000),
        });
        return {};
      },
    ],
    [
      'death_reported',
      async (client, w) => {
        // A claim naming the member (the death report — `isDeathReportStanding` reads `claims`), its freeze LIFTED by a settlement.
        const claimId = await seedClaim(bindScopedDb(client), PARIWAR_A, { deceasedMemberId: w.memberId });
        await seedEvent(bindScopedDb(client), PARIWAR_A, { streamId: claimId, eventType: 'claim.intake_initiated', payload: { deceased_member_id: w.memberId }, eventVersion: 1, occurredAt: new Date(Date.now() - 7_200_000) });
        await seedEvent(bindScopedDb(client), PARIWAR_A, { streamId: claimId, eventType: 'claim.settled', payload: { deceased_member_id: w.memberId }, eventVersion: 2, occurredAt: new Date(Date.now() - 3_600_000) });
        return {};
      },
    ],
  ];

  it.each(cases)('QE11: %s refuses with PartnerFormVisitRefusedError, writes NOTHING; the transaction stays usable (a control visit lands)', async (reason, setup) => {
    const { client } = getTx();
    const w = await world(client);
    const over = await setup(client, w);
    const moduleId = over.moduleId ?? w.moduleId;
    const memberId = over.memberId ?? w.memberId;
    const control = await world(client);
    await enterAppScope(client, PARIWAR_A);
    const err = await open(client, moduleId, memberId).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(PartnerFormVisitRefusedError);
    expect((err as PartnerFormVisitRefusedError).reason).toBe(reason);
    expect((err as Error).message).not.toContain(memberId);
    // Control (TR22): the same transaction opens another member's visit.
    await open(client, control.moduleId, control.memberId);
    await client.query('RESET ROLE');
    expect(await visitsOf(client, memberId)).toEqual([]);
    expect(await countOf(client, moduleId, 'went_to_partner')).toBe(0);
    expect(await visitsOf(client, control.memberId)).toHaveLength(1);
  });
});

describe.skipIf(!hasDatabase)('Story 12.5b — the counts and the partner\'s totals (AC9, AC10; QE12, QE13)', () => {
  setupLiveDb();

  it('AC9: countPartnerFormEvent UPSERTs (pariwar, module, IST day, kind); refuses a trust_sends offer (ModuleNotPartnerFormError)', async () => {
    const { client } = getTx();
    const w = await world(client);
    const ts = await seedModule(client, PARIWAR_A, w.partnerId);
    await enterAppScope(client, PARIWAR_A);
    for (let i = 0; i < 3; i += 1) await countPartnerFormEvent(client, { pariwarId: PARIWAR_A, moduleId: toModuleId(w.moduleId), kind: 'card_shown' });
    await countPartnerFormEvent(client, { pariwarId: PARIWAR_A, moduleId: toModuleId(w.moduleId), kind: 'came_back' });
    await expect(countPartnerFormEvent(client, { pariwarId: PARIWAR_A, moduleId: toModuleId(ts), kind: 'card_shown' })).rejects.toBeInstanceOf(ModuleNotPartnerFormError);
    // The transaction stays usable after the refusal.
    await countPartnerFormEvent(client, { pariwarId: PARIWAR_A, moduleId: toModuleId(w.moduleId), kind: 'card_shown' });
    await client.query('RESET ROLE');
    const { rows } = await client.query<{ kind: string; count: string }>('SELECT kind, count FROM marketplace_partner_form_counts WHERE module_id = $1 ORDER BY kind', [w.moduleId]);
    expect(rows).toEqual([
      { kind: 'came_back', count: '1' },
      { kind: 'card_shown', count: '4' },
    ]);
  });

  it('AC9: the admin read shows any figure below 5 as "fewer than 5" — the totals and each day', async () => {
    const { client } = getTx();
    const w = await world(client);
    await enterAppScope(client, PARIWAR_A);
    for (let i = 0; i < 5; i += 1) await countPartnerFormEvent(client, { pariwarId: PARIWAR_A, moduleId: toModuleId(w.moduleId), kind: 'card_shown' });
    for (let i = 0; i < 4; i += 1) await countPartnerFormEvent(client, { pariwarId: PARIWAR_A, moduleId: toModuleId(w.moduleId), kind: 'card_opened' });
    const f = await listPartnerFormFigures(bindScopedDb(client), PARIWAR_A, toModuleId(w.moduleId));
    expect(f.counts).toEqual({
      card_shown: { figure: 5, belowFloor: false },
      card_opened: { figure: null, belowFloor: true },
      went_to_partner: { figure: null, belowFloor: true },
      came_back: { figure: null, belowFloor: true },
    });
    expect(f.days).toHaveLength(1);
    expect(f.days[0]!.kinds.card_opened).toEqual({ figure: null, belowFloor: true });
    expect(f.days[0]!.kinds.card_shown).toEqual({ figure: 5, belowFloor: false });
    // ⛔ a figure below 5 anywhere in what leaves.
    expect(JSON.stringify(f)).not.toMatch(/"figure":[0-4][,}]/);
  });

  it('AC10: totals — a figure below 5 is stored below_floor with a NULL figure; the read shows the NEWEST entry per period; refuses trust_sends', async () => {
    const { client } = getTx();
    const w = await world(client);
    const ts = await seedModule(client, PARIWAR_A, w.partnerId);
    await enterAppScope(client, PARIWAR_A);
    const base = { pariwarId: PARIWAR_A, moduleId: toModuleId(w.moduleId), enteredByActorId: randomUUID(), auditId: randomUUID() };
    const first = await recordPartnerFormTotals(client, {
      ...base,
      totals: { period_start: '2026-11-01', period_end: '2026-11-30', stages: [{ label: 'Started', figure: 40 }, { label: 'Entered OTP', figure: 3 }, { label: 'Finished', figure: 12 }] },
    });
    expect(first.stages).toBe(3);
    // A correction of the same period, and another period.
    const corrected = await recordPartnerFormTotals(client, {
      ...base,
      totals: { period_start: '2026-11-01', period_end: '2026-11-30', stages: [{ label: 'Started', figure: 41 }, { label: 'Finished', figure: 2 }] },
    });
    await recordPartnerFormTotals(client, { ...base, totals: { period_start: '2026-10-01', period_end: '2026-10-31', stages: [{ label: 'Started', figure: 9 }] } });
    await expect(recordPartnerFormTotals(client, { ...base, moduleId: toModuleId(ts), totals: { period_start: '2026-11-01', period_end: '2026-11-30', stages: [{ label: 'x', figure: 9 }] } })).rejects.toBeInstanceOf(
      ModuleNotPartnerFormError,
    );
    await client.query('RESET ROLE');
    const stored = await client.query<{ stage_label: string; figure: number | null; below_floor: boolean }>(
      'SELECT stage_label, figure, below_floor FROM marketplace_partner_form_totals WHERE totals_id = $1 ORDER BY stage_order',
      [first.totalsId],
    );
    expect(stored.rows).toEqual([
      { stage_label: 'Started', figure: 40, below_floor: false },
      { stage_label: 'Entered OTP', figure: null, below_floor: true },
      { stage_label: 'Finished', figure: 12, below_floor: false },
    ]);
    await enterAppScope(client, PARIWAR_A);
    const f = await listPartnerFormFigures(bindScopedDb(client), PARIWAR_A, toModuleId(w.moduleId));
    expect(f.partnerTotals.map((t) => [t.totalsId, t.periodStart, t.periodEnd])).toEqual([
      [corrected.totalsId, '2026-11-01', '2026-11-30'],
      [expect.any(String), '2026-10-01', '2026-10-31'],
    ]);
    expect(f.partnerTotals[0]!.stages).toEqual([
      { order: 1, label: 'Started', figure: 41, belowFloor: false },
      { order: 2, label: 'Finished', figure: null, belowFloor: true },
    ]);
  });

  it.each([
    ['an end before the start', { period_start: '2026-11-30', period_end: '2026-11-01', stages: [{ label: 'S', figure: 9 }] }, ['period_end']],
    ['no stages', { period_start: '2026-11-01', period_end: '2026-11-30', stages: [] }, ['stages']],
    ['a negative figure', { period_start: '2026-11-01', period_end: '2026-11-30', stages: [{ label: 'S', figure: -1 }] }, ['stages', 0, 'figure']],
    ['a fractional figure', { period_start: '2026-11-01', period_end: '2026-11-30', stages: [{ label: 'S', figure: 5.5 }] }, ['stages', 0, 'figure']],
    ['a blank label', { period_start: '2026-11-01', period_end: '2026-11-30', stages: [{ label: '  ', figure: 9 }] }, ['stages', 0, 'label']],
    ['a label of 81 characters', { period_start: '2026-11-01', period_end: '2026-11-30', stages: [{ label: 'x'.repeat(81), figure: 9 }] }, ['stages', 0, 'label']],
    ['an impossible date', { period_start: '2026-02-30', period_end: '2026-03-01', stages: [{ label: 'S', figure: 9 }] }, ['period_start']],
    ['a member key', { period_start: '2026-11-01', period_end: '2026-11-30', stages: [{ label: 'S', figure: 9, member_id: 'x' }] }, ['stages', 0]],
  ])('AC10: refuses %s (PartnerFormTotalsInvalidError at its path), writing nothing', async (_l, totals, path) => {
    const { client } = getTx();
    const w = await world(client);
    await enterAppScope(client, PARIWAR_A);
    const err = await recordPartnerFormTotals(client, { pariwarId: PARIWAR_A, moduleId: toModuleId(w.moduleId), totals, enteredByActorId: randomUUID(), auditId: randomUUID() }).catch(
      (e: unknown) => e,
    );
    expect(err).toBeInstanceOf(PartnerFormTotalsInvalidError);
    expect((err as PartnerFormTotalsInvalidError).issues.map((i) => i.path)).toContainEqual(path);
    await client.query('RESET ROLE');
    expect((await client.query('SELECT 1 FROM marketplace_partner_form_totals WHERE module_id = $1', [w.moduleId])).rows).toHaveLength(0);
  });
});

describe.skipIf(!hasDatabase)('Story 12.5b — erasure meets the visit records (AC8; QE8)', () => {
  setupLiveDb();

  it('under FORCE RLS, anonymizeMember (as twt_app) DELETEs exactly the member\'s two visit rows; another member\'s control row survives', async () => {
    const { client } = getTx();
    const w = await world(client);
    const other = await world(client);
    await enterAppScope(client, PARIWAR_A);
    await open(client, w.moduleId, w.memberId);
    await open(client, other.moduleId, w.memberId);
    const control = await open(client, w.moduleId, other.memberId);
    await client.query('RESET ROLE');
    expect(await visitsOf(client, w.memberId)).toHaveLength(2);
    await enterAppScope(client, PARIWAR_A);
    await anonymizeMember(bindScopedDb(client), { kms, kekRef }, { memberId: toMemberId(w.memberId), pariwarId: PARIWAR_A });
    await client.query('RESET ROLE');
    // The superuser sees every row: the member's two are GONE (the DELETE matched 2 under FORCE — ⛔ 0 silently), the control kept.
    expect(await visitsOf(client, w.memberId)).toEqual([]);
    expect(await visitsOf(client, other.memberId)).toEqual([{ visit_id: control.visitId, module_id: w.moduleId }]);
    // The anonymous counts are untouched (⛔ member on them).
    expect(await countOf(client, w.moduleId, 'went_to_partner')).toBe(2);
  });
});
