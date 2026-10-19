// Migration 0171 — the WhatsApp reminder's OWN record (Story 6.31, Task 1; AC1; WR1, WR10, I1). Live DB; per-test ROLLBACK;
// every refusal under a SAVEPOINT so one test can assert several.
//   · I1 — a second row for one ping is refused (23505);
//   · the finished-row trigger — ⛔ delivery column of a finished row changes; while `attempting`: `attempt_count` ⛔ decreases,
//     `first_detail` written once, `aging_since` forward-only, the in-flight marker ⛔ re-stamped (cleared → set again is fine);
//   · `twt_app` cannot UPDATE a non-delivery column (the policy spec covers every one — here the AC1 leg);
//   · the CHECKs by NAME, each with a POSITIVE counterpart: the outcome vocabulary, claimed / aging on `attempting`, the parked
//     biconditional, the in-flight marker's four rules, `accepted` ⇒ wamid + hash, locale / template name;
//   · the `detail` grammar — the CHECK and `PEER_MESH_WA_REMINDER_DETAIL_PATTERN` pinned EQUAL, every documented form accepted
//     and the forbidden ones (a phone number, a space, a `config:` code, `name_too_long`) refused;
//   · ⛔ column of `claim_peer_mesh_pings` added, ⛔ 0156 / 0166 object changed (the ping's delivery-column list is as 0166
//     left it); `anonymize.ts` carries the "nothing to scrub" line (WR15).

import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  PEER_MESH_WA_REMINDER_DETAIL_PATTERN,
  PEER_MESH_WA_REMINDER_SEND_OUTCOMES,
  PEER_MESH_WA_REMINDER_SENT_OUTCOMES,
} from '../../../src/schema/claim_peer_mesh_wa_reminders.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, enterAppScope, seedClaim } from '../_helpers.js';

type Client = ReturnType<typeof getTx>['client'];

const T = 'claim_peer_mesh_wa_reminders';
const AT = '2026-10-19T05:00:00.000Z';

async function seedPing(client: Client) {
  const { tx } = getTx();
  const claimCaseId = await seedClaim(tx, PARIWAR_A);
  const selectionId = randomUUID();
  const memberId = randomUUID();
  await client.query(
    `INSERT INTO claim_peer_mesh_selections (selection_id, claim_case_id, pariwar_id, deceased_member_id, deceased_created_at, metric_id,
       metric_version, selected_member_ids, candidate_snapshot, response_window_expires_at)
     VALUES ($1, $2, $3, $4, now(), 'm', 1, ARRAY[$5]::uuid[], '[]'::jsonb, now() + interval '72 hours')`,
    [selectionId, claimCaseId, PARIWAR_A, randomUUID(), memberId],
  );
  const pingId = randomUUID();
  await client.query(`INSERT INTO claim_peer_mesh_pings (ping_id, selection_id, pariwar_id, member_id) VALUES ($1, $2, $3, $4)`, [
    pingId,
    selectionId,
    PARIWAR_A,
    memberId,
  ]);
  return { claimCaseId, selectionId, pingId, memberId };
}

type Ping = Awaited<ReturnType<typeof seedPing>>;

/** An `attempting` row as a begin writes it. */
const ATTEMPTING = { send_outcome: 'attempting', claimed_at: AT, claimed_by_job: 'job-1', aging_since: AT };

const rowOf = (p: Ping, over: Record<string, unknown> = {}): Record<string, unknown> => ({
  ping_id: p.pingId,
  pariwar_id: PARIWAR_A,
  claim_case_id: p.claimCaseId,
  selection_id: p.selectionId,
  member_id: p.memberId,
  ...ATTEMPTING,
  ...over,
});

function insertRow(client: Client, v: Record<string, unknown>) {
  const cols = Object.keys(v);
  return client.query<{ reminder_id: string }>(
    `INSERT INTO ${T} (${cols.join(', ')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING reminder_id`,
    Object.values(v),
  );
}

async function insertOn(client: Client, over: Record<string, unknown> = {}): Promise<{ ping: Ping; id: string }> {
  const ping = await seedPing(client);
  const { rows } = await insertRow(client, rowOf(ping, over));
  return { ping, id: rows[0]!.reminder_id };
}

async function expectPgError(client: Client, run: () => Promise<unknown>, expected: Record<string, unknown>): Promise<void> {
  await client.query('SAVEPOINT expect_pg_error');
  await expect(run()).rejects.toMatchObject(expected);
  await client.query('ROLLBACK TO SAVEPOINT expect_pg_error');
}

async function expectAccepted(client: Client, run: () => Promise<{ rowCount: number | null }>): Promise<void> {
  await client.query('SAVEPOINT expect_ok');
  expect((await run()).rowCount).toBe(1);
  await client.query('ROLLBACK TO SAVEPOINT expect_ok');
}

const CHECK = (constraint: string) => ({ code: '23514', constraint });
const GUARD = (message: RegExp) => ({ code: '23000', message: expect.stringMatching(message) });

const update = (client: Client, id: string, set: string, params: unknown[] = []) =>
  client.query(`UPDATE ${T} SET ${set} WHERE reminder_id = $1`, [id, ...params]);

describe.skipIf(!hasDatabase)('claim_peer_mesh_wa_reminders — migration 0171 (the record)', { timeout: 20000 }, () => {
  setupLiveDb();

  it('⭐ I1 — ONE reminder per ping: a second row for the same ping is refused (23505), even after the first finished', async () => {
    const { client } = getTx();
    const { ping } = await insertOn(client, { send_outcome: 'skipped_answered' });
    await expectPgError(client, () => insertRow(client, rowOf(ping)), { code: '23505', constraint: 'claim_peer_mesh_wa_reminders_ping_uq' });
  });

  it('⭐ the finished-row trigger — ⛔ delivery column of a finished row changes (every outcome but attempting)', async () => {
    const { client } = getTx();
    const finished: Record<string, Record<string, unknown>> = {
      accepted: { send_outcome: 'accepted', send_started_at: AT, provider_message_id: 'wamid.X', recipient_number_hash: 'h' },
      rejected_recipient: { send_outcome: 'rejected_recipient', send_started_at: AT },
      error: { send_outcome: 'error', send_started_at: AT, detail: 'may_have_sent:timeout' },
      no_target: { send_outcome: 'no_target', detail: 'no_target:no_sendable_number' },
      skipped_answered: { send_outcome: 'skipped_answered' },
      skipped_window_closed: { send_outcome: 'skipped_window_closed' },
      skipped_not_opted_in: { send_outcome: 'skipped_not_opted_in' },
      skipped_recipient_ineligible: { send_outcome: 'skipped_recipient_ineligible' },
      skipped_late: { send_outcome: 'skipped_late', claimed_by_job: 'sweep:late' },
    };
    expect(Object.keys(finished).sort()).toEqual(PEER_MESH_WA_REMINDER_SEND_OUTCOMES.filter((o) => o !== 'attempting').sort());
    for (const [outcome, over] of Object.entries(finished)) {
      const { id } = await insertOn(client, over);
      for (const set of [`send_outcome = 'attempting'`, `detail = 'held:x'`, `send_updated_at = clock_timestamp()`, `attempt_count = 2`, `template_name = 'other'`]) {
        await expectPgError(client, () => update(client, id, set), GUARD(new RegExp(`a finished reminder \\(${outcome}\\) is never rewritten`)));
      }
    }
  });

  it('⭐ R7 — new evidence, 2026-10-19: WITHOUT the trigger the SAME forbidden update on a finished row would succeed (mutation-kill of the guard the prior test exercises)', async () => {
    const { client } = getTx();
    const { id } = await insertOn(client, { send_outcome: 'accepted', send_started_at: AT, provider_message_id: 'wamid.X', recipient_number_hash: 'h' });
    await client.query('ALTER TABLE claim_peer_mesh_wa_reminders DISABLE TRIGGER claim_peer_mesh_wa_reminders_guard_delivery');
    await expectAccepted(client, () => update(client, id, `detail = 'held:x'`));
    await client.query('ALTER TABLE claim_peer_mesh_wa_reminders ENABLE TRIGGER claim_peer_mesh_wa_reminders_guard_delivery');
  });

  it('the trigger while attempting: attempt_count ⛔ decreases; first_detail once; aging_since forward-only; the marker ⛔ re-stamped (cleared then set is fine)', async () => {
    const { client } = getTx();
    const { id } = await insertOn(client, { attempt_count: 2, first_detail: 'rate_limited:none', send_started_at: AT });
    await expectPgError(client, () => update(client, id, 'attempt_count = 1'), GUARD(/attempt_count never decreases/));
    await expectPgError(client, () => update(client, id, `first_detail = 'held:x'`), GUARD(/first_detail is written once/));
    await expectPgError(client, () => update(client, id, `aging_since = aging_since - interval '1 second'`), GUARD(/aging_since moves only forward/));
    await expectPgError(client, () => update(client, id, 'aging_since = NULL'), GUARD(/aging_since moves only forward/));
    await expectPgError(client, () => update(client, id, `send_started_at = send_started_at + interval '1 second'`), GUARD(/in-flight marker is set once per send/));
    await expectAccepted(client, () => update(client, id, `attempt_count = 3, aging_since = aging_since + interval '1 second'`));
    // a park clears the marker; a later send sets it again
    expect((await update(client, id, `send_started_at = NULL, detail = 'held:meta_131009'`)).rowCount).toBe(1);
    await expectAccepted(client, () => update(client, id, 'send_started_at = clock_timestamp()'));
  });

  it('`twt_app` cannot UPDATE a non-delivery column (42501) — the ping, the neighbour and the claim are frozen by grant', async () => {
    const { client } = getTx();
    const { id } = await insertOn(client);
    await enterAppScope(client, PARIWAR_A);
    for (const set of ['ping_id = ping_id', 'member_id = member_id', 'claim_case_id = claim_case_id']) {
      await expectPgError(client, () => update(client, id, set), { code: '42501' });
    }
    await expectAccepted(client, () => update(client, id, `detail = 'rate_limited:none'`));
  });

  it('the outcome CHECK names EXACTLY `PEER_MESH_WA_REMINDER_SEND_OUTCOMES` (⛔ an unknown outcome)', async () => {
    const { client } = getTx();
    const { rows } = await client.query<{ def: string }>(
      `SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conname = 'claim_peer_mesh_wa_reminders_send_outcome_check'`,
    );
    expect([...rows[0]!.def.matchAll(/'([a-z_]+)'::text/g)].map((m) => m[1]!).sort()).toEqual([...PEER_MESH_WA_REMINDER_SEND_OUTCOMES].sort());
    const ping = await seedPing(client);
    await expectPgError(client, () => insertRow(client, rowOf(ping, { send_outcome: 'sent' })), CHECK('claim_peer_mesh_wa_reminders_send_outcome_check'));
  });

  it('attempting ⇒ claimed + aging_since; the parked biconditional on every row; ⛔ parked_at on a finished row', async () => {
    const { client } = getTx();
    const p = await seedPing(client);
    await expectPgError(client, () => insertRow(client, rowOf(p, { claimed_at: null })), CHECK('claim_peer_mesh_wa_reminders_attempting_claimed_check'));
    await expectPgError(client, () => insertRow(client, rowOf(p, { aging_since: null })), CHECK('claim_peer_mesh_wa_reminders_attempting_claimed_check'));
    await expectPgError(client, () => insertRow(client, rowOf(p, { claimed_by_job: 'sweep:held' })), CHECK('claim_peer_mesh_wa_reminders_parked_check'));
    await expectPgError(client, () => insertRow(client, rowOf(p, { parked_at: AT })), CHECK('claim_peer_mesh_wa_reminders_parked_check'));
    await expectPgError(client, () => insertRow(client, rowOf(p, { send_outcome: 'skipped_late', claimed_by_job: 'sweep:held', parked_at: AT })),
      CHECK('claim_peer_mesh_wa_reminders_parked_check'));
    await expectAccepted(client, () => insertRow(client, rowOf(p, { claimed_by_job: 'sweep:held', parked_at: AT })));
    await expectAccepted(client, () => insertRow(client, rowOf(p, { send_outcome: 'skipped_late', claimed_by_job: null, claimed_at: null, aging_since: null })));
  });

  it('⭐ the in-flight marker: claimed only; ⛔ on a parked row; ⛔ on a skip / no_target; required on accepted / rejected_recipient / error', async () => {
    const { client } = getTx();
    const p = await seedPing(client);
    await expectPgError(client, () => insertRow(client, rowOf(p, { send_outcome: 'skipped_late', claimed_at: null, claimed_by_job: null, send_started_at: AT })),
      CHECK('claim_peer_mesh_wa_reminders_send_started_claimed_check'));
    await expectPgError(client, () => insertRow(client, rowOf(p, { claimed_by_job: 'sweep:held', parked_at: AT, send_started_at: AT })),
      CHECK('claim_peer_mesh_wa_reminders_send_started_parked_check'));
    for (const outcome of ['skipped_answered', 'skipped_window_closed', 'skipped_not_opted_in', 'skipped_recipient_ineligible', 'skipped_late', 'no_target']) {
      await expectPgError(client, () => insertRow(client, rowOf(p, { send_outcome: outcome, send_started_at: AT })),
        CHECK('claim_peer_mesh_wa_reminders_send_started_outcome_check'));
    }
    expect([...PEER_MESH_WA_REMINDER_SENT_OUTCOMES].sort()).toEqual(['accepted', 'error', 'rejected_recipient']);
    for (const outcome of PEER_MESH_WA_REMINDER_SENT_OUTCOMES) {
      const extra = outcome === 'accepted' ? { provider_message_id: 'wamid.X', recipient_number_hash: 'h' } : {};
      await expectPgError(client, () => insertRow(client, rowOf(p, { send_outcome: outcome, ...extra })), CHECK('claim_peer_mesh_wa_reminders_send_started_outcome_check'));
      await expectAccepted(client, () => insertRow(client, rowOf(p, { send_outcome: outcome, send_started_at: AT, ...extra })));
    }
    // an attempting row may carry the marker or not
    await expectAccepted(client, () => insertRow(client, rowOf(p, { send_started_at: AT })));
    await expectAccepted(client, () => insertRow(client, rowOf(p)));
  });

  it('accepted ⇒ the wamid AND the number hash; locale ∈ en/hi; locale_source; the template name form', async () => {
    const { client } = getTx();
    const p = await seedPing(client);
    const sent = { send_outcome: 'accepted', send_started_at: AT };
    await expectPgError(client, () => insertRow(client, rowOf(p, { ...sent, recipient_number_hash: 'h' })), CHECK('claim_peer_mesh_wa_reminders_accepted_check'));
    await expectPgError(client, () => insertRow(client, rowOf(p, { ...sent, provider_message_id: 'wamid.X' })), CHECK('claim_peer_mesh_wa_reminders_accepted_check'));
    await expectPgError(client, () => insertRow(client, rowOf(p, { locale: 'en_US' })), CHECK('claim_peer_mesh_wa_reminders_locale_check'));
    await expectPgError(client, () => insertRow(client, rowOf(p, { locale_source: 'member_choice' })), CHECK('claim_peer_mesh_wa_reminders_locale_source_check'));
    await expectPgError(client, () => insertRow(client, rowOf(p, { template_name: 'Has Space' })), CHECK('claim_peer_mesh_wa_reminders_template_name_check'));
    await expectAccepted(client, () => insertRow(client, rowOf(p, { locale: 'hi', locale_source: 'pariwar_default', template_name: 'peer_mesh_reminder_hi_v1' })));
  });

  it('⭐ the `detail` grammar — both CHECKs EQUAL the exported pattern; every documented form accepted, the forbidden refused', async () => {
    const { client } = getTx();
    for (const conname of ['claim_peer_mesh_wa_reminders_detail_vocabulary_check', 'claim_peer_mesh_wa_reminders_first_detail_vocabulary_check']) {
      const { rows } = await client.query<{ def: string }>(`SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conname = $1`, [conname]);
      expect(rows[0]!.def).toContain(`'${PEER_MESH_WA_REMINDER_DETAIL_PATTERN}'::text`);
    }
    const pattern = new RegExp(PEER_MESH_WA_REMINDER_DETAIL_PATTERN);
    const good = [
      'rate_limited:none',
      'rate_limited:130429',
      'rate_limited:4',
      'api_unavailable:503',
      'decrypt_failed:tier1',
      'hash_failed:tier1',
      ...['network', 'timeout', 'no_wamid', 'lease_lapsed', 'gateway_502', 'gateway_504', 'unknown'].map((h) => `may_have_sent:${h}`),
      'scope:template_not_approved',
      'scope:meta_131048',
      'scope:http_401',
      'held:param_invalid',
      'held:meta_131009',
      ...['no_sendable_number', 'name_none', 'name_erased', 'name_unresolvable'].map((r) => `no_target:${r}`),
    ];
    const bad = [
      'held:9876543210',
      'scope:meta_1310480',
      'held:has space',
      'held:Meta_1',
      'config:wa_template_missing:en',
      'no_target:name_too_long',
      'sweep:held',
      'rate_limited:+919876543210',
      'may_have_sent:other',
      'exhausted:attempting_three_days',
    ];
    const p = await seedPing(client);
    for (const d of good) {
      expect(pattern.test(d), d).toBe(true);
      await expectAccepted(client, () => insertRow(client, rowOf(p, { detail: d, first_detail: d })));
    }
    for (const d of bad) {
      expect(pattern.test(d), d).toBe(false);
      await expectPgError(client, () => insertRow(client, rowOf(p, { detail: d })), CHECK('claim_peer_mesh_wa_reminders_detail_vocabulary_check'));
      await expectPgError(client, () => insertRow(client, rowOf(p, { first_detail: d })), CHECK('claim_peer_mesh_wa_reminders_first_detail_vocabulary_check'));
    }
  });

  it('⛔ column of `claim_peer_mesh_pings` added and 0166\'s guard untouched — the ping\'s delivery list is as 0166 left it', async () => {
    const { client } = getTx();
    const { rows } = await client.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'claim_peer_mesh_pings' AND table_schema = current_schema() ORDER BY 1`,
    );
    expect(rows.map((r) => r.column_name)).not.toContain('wa_reminder_outcome');
    expect(rows.map((r) => r.column_name).filter((c) => /reminder|whatsapp|wa_/.test(c))).toEqual([]);
    const fn = await client.query<{ src: string }>(`SELECT prosrc AS src FROM pg_proc WHERE proname = 'claim_peer_mesh_pings_guard_delivery'`);
    expect(fn.rows[0]!.src).toContain('Story 6.27c R15');
    expect(fn.rows[0]!.src).not.toMatch(/6\.31|reminder/);
  });

  it('`anonymize.ts` carries the "nothing to scrub" line for the new table (WR15)', () => {
    const src = readFileSync(fileURLToPath(new URL('../../../src/member/anonymize.ts', import.meta.url)), 'utf8');
    expect(src).toMatch(/Story 6\.31 \(WR15, 0171\) — `claim_peer_mesh_wa_reminders` holds ⛔ plaintext[\s\S]{0,200}nothing to scrub/);
  });
});
