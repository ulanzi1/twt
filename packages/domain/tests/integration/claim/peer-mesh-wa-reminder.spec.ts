// Story 6.31 (Task 4; AC2, AC3, AC7; WR2, WR4, WR5, WR10; I1, I3–I5, I8) — the neighbours' WhatsApp reminder, the domain half, on
// a live DB. Per-test ROLLBACK (`setupLiveDb`); every write runs as `twt_app` in the claim's Pariwar (RLS) after a superuser seed —
// except the sweep's cross-tenant reads / finishers, which run as the superuser (the BYPASSRLS pool's stand-in), narrowed by `allow`.
// Time is the DB clock: a ping's `send_updated_at` is seeded relative to `clock_timestamp()` (which advances within a transaction).
//   · the begin — begun (template / locale recorded, the ciphertext AS STORED, the ping's link code); the own retry / a parked row /
//     a lapsed lease re-claimed; another live job ⇒ `held_by_other`; the marker set ⇒ `in_flight` with ⛔ write and ⛔ re-check
//     (even once the neighbour has submitted — ⛔ 23514); a finished row ⇒ `already_final`;
//   · ⛔ write: a non-accepted text, before 48 h, the switch OFF (an existing parked row untouched);
//   · each FINISHED judgement — late (`+ 72 h`), window closed, answered (submitted — a `started` reply is still SENT), not opted
//     in, ineligible, a name fault;
//   · the marker CAS (lease lost ⇒ ⛔), the bounded finalise (needs the marker), the transient note and the park (both clear it),
//     no sendable number;
//   · the sweep's due list (each AC2 conjunct, incl. a text REPORTED undelivered still due), the lapsed in-flight finisher (past the
//     bound, switch OFF), the late marking (parked past `+ 72 h`, on a decided claim too; ⛔ an in-flight row; ⛔ a row created);
//   · I8 — ⛔ event from any of it.

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  CORRECTION_SEND_LEASE_MS,
  PEER_MESH_WA_REMINDER_FINALISE_LOCK_TIMEOUT_MS,
  PEER_MESH_WA_REMINDER_FINALISE_STATEMENT_TIMEOUT_MS,
  PEER_MESH_WA_REMINDER_LATE_BY,
  PEER_MESH_WA_REMINDER_PARKED_BY,
  beginPeerMeshWaReminder,
  finalisePeerMeshWaReminder,
  finishLapsedInFlightPeerMeshWaReminders,
  finishPeerMeshWaReminderNoSendableNumber,
  generatePeerRequestLinkCode,
  isStateInAnswerWindow,
  listClaimDuePeerMeshWaReminderPings,
  listDuePeerMeshWaReminderPings,
  markLatePeerMeshWaReminders,
  markPeerMeshWaReminderInFlight,
  notePeerMeshWaReminderTransient,
  parkPeerMeshWaReminder,
  peerMeshWaReminderDetail,
} from '../../../src/claim/index.js';
import { bindScopedDb } from '../../../src/db.js';
import {
  claimId as toClaimId,
  memberId as toMemberId,
  pariwarId as toPariwarId,
  peerMeshPingId as toPingId,
  type ClaimId,
  type MemberId,
  type PariwarId,
  type PeerMeshPingId,
} from '../../../src/ids/index.js';
import { CLAIM_LIFECYCLE_STATES } from '../../../src/schema/claims.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { enterAppScope, seedClaim } from '../_helpers.js';

type Client = ReturnType<typeof getTx>['client'];

const JOB = 'job-a';
const TEMPLATE = { name: 'peer_mesh_reminder_hi_v1', locale: 'hi', localeSource: 'pariwar_default' } as const;
const MARGIN_MS = 2 * 60 * 1000;
const OUT_OF_WINDOW = CLAIM_LIFECYCLE_STATES.find((s) => !isStateInAnswerWindow(s, false))!;

interface Seeded {
  pid: PariwarId;
  claimCaseId: ClaimId;
  deceased: MemberId;
  selectionId: string;
  pings: { pingId: PeerMeshPingId; memberId: MemberId; linkCode: string }[];
}

async function asSuperuser(client: Client, fn: () => Promise<void>): Promise<void> {
  await client.query('RESET ROLE');
  await fn();
}

async function insertMember(client: Client, pid: string, memberId: string, state = 'active'): Promise<void> {
  await client.query(`INSERT INTO members (member_id, pariwar_id, state, state_event_version) VALUES ($1, $2, $3, 1)`, [memberId, pid, state]);
  await client.query(`INSERT INTO member_identities (member_id, pariwar_id, mobile_ciphertext, mobile_blind_index) VALUES ($1, $2, $3, $4)`, [
    memberId,
    pid,
    `enc:test:${memberId}`,
    `idx-${randomUUID()}`,
  ]);
}

/** As the superuser: an ACTIVE opt-in with a live window and its consent row (5.4's activation's two rows). */
async function optIn(client: Client, pid: string, memberId: string): Promise<void> {
  const consentId = randomUUID();
  await client.query(
    `INSERT INTO consent_records (consent_id, subject_id, pariwar_id, consent_type, granted_via_actor, consent_payload)
     VALUES ($1, $2, $3, 'whatsapp_opt_in', 'member_self', '{}'::jsonb)`,
    [consentId, memberId, pid],
  );
  await client.query(
    `INSERT INTO member_wa_opt_in (pariwar_id, member_id, state, verification_phrase, mobile_blind_index, window_expires_at, consent_id, matched_at)
     VALUES ($1, $2, 'ACTIVE', $3, $4, clock_timestamp() + interval '20 hours', $5, clock_timestamp())`,
    [pid, memberId, `TWT-${randomUUID().slice(0, 8)}`, `blind-${randomUUID()}`, consentId],
  );
}

/**
 * As the superuser: a claim in `state`, `n` active opted-in neighbours each with an ACCEPTED ping whose text went `hoursAgo` hours
 * ago (DB clock), the Pariwar's WhatsApp switch `switchOn`; then `twt_app` in the Pariwar.
 */
async function seedReminder(
  o: {
    state?: string;
    n?: number;
    hoursAgo?: number;
    /** A finer-grained age than `hoursAgo` alone can express (`make_interval`'s `hours` is an int4) — ADDED to it. */
    secondsAgo?: number;
    switchOn?: boolean;
    optedIn?: boolean;
    outcome?: string | null;
    neighbourState?: string;
  } = {},
): Promise<Seeded> {
  const { tx, client } = getTx();
  await client.query('RESET ROLE');
  const pid = toPariwarId(randomUUID());
  const deceased = toMemberId(randomUUID());
  await insertMember(client, pid, deceased);
  const claimCaseId = toClaimId(await seedClaim(tx, pid, { deceasedMemberId: deceased, currentState: (o.state ?? 'verification_in_progress') as never }));
  const members = Array.from({ length: o.n ?? 1 }, () => toMemberId(randomUUID()));
  for (const m of members) {
    await insertMember(client, pid, m, o.neighbourState ?? 'active');
    if (o.optedIn !== false) await optIn(client, pid, m);
  }
  const selectionId = randomUUID();
  await client.query(
    `INSERT INTO claim_peer_mesh_selections (selection_id, claim_case_id, pariwar_id, deceased_member_id, deceased_created_at, metric_id,
       metric_version, selected_member_ids, candidate_snapshot, response_window_expires_at)
     VALUES ($1, $2, $3, $4, now(), 'm', 1, $5::uuid[], '[]'::jsonb, now() + interval '72 hours')`,
    [selectionId, claimCaseId, pid, deceased, members],
  );
  const pings: Seeded['pings'] = [];
  for (const memberId of members) {
    const pingId = toPingId(randomUUID());
    const linkCode = generatePeerRequestLinkCode();
    const outcome = o.outcome === undefined ? 'accepted' : o.outcome;
    if (outcome === null) {
      await client.query(`INSERT INTO claim_peer_mesh_pings (ping_id, selection_id, pariwar_id, member_id) VALUES ($1, $2, $3, $4)`, [
        pingId,
        selectionId,
        pid,
        memberId,
      ]);
    } else {
      await client.query(
        `INSERT INTO claim_peer_mesh_pings (ping_id, selection_id, pariwar_id, member_id, send_outcome, attempt_count, claimed_at, claimed_by_job,
           aging_since, link_code, locale_source, send_updated_at)
         VALUES ($1, $2, $3, $4, $7, 1, now(), 'job-text', now(), $5, 'pariwar_default', clock_timestamp() - make_interval(hours => $6, secs => $8))`,
        [pingId, selectionId, pid, memberId, linkCode, o.hoursAgo ?? 49, outcome, o.secondsAgo ?? 0],
      );
    }
    pings.push({ pingId, memberId, linkCode });
  }
  await client.query(`INSERT INTO pariwar_wa_config (pariwar_id, enabled, phone_number_id, access_token_secret_name) VALUES ($1, $2, '123', 'tok')`, [
    pid,
    o.switchOn ?? true,
  ]);
  await enterAppScope(client, pid);
  return { pid, claimCaseId, deceased, selectionId, pings };
}

const begin = (s: Seeded, i = 0, o: { jobId?: string; now?: Date; nameFault?: 'name_none' | 'name_erased' | 'name_unresolvable' | null } = {}) =>
  beginPeerMeshWaReminder(getTx().client, {
    pariwarId: s.pid,
    claimCaseId: s.claimCaseId,
    pingId: s.pings[i]!.pingId,
    jobId: o.jobId ?? JOB,
    now: o.now ?? new Date(),
    nameFault: o.nameFault ?? null,
    template: TEMPLATE,
  });

interface Row {
  reminder_id: string;
  send_outcome: string;
  attempt_count: number;
  claimed_by_job: string | null;
  claimed_at: Date | null;
  parked_at: Date | null;
  send_started_at: Date | null;
  detail: string | null;
  first_detail: string | null;
  provider_message_id: string | null;
  recipient_number_hash: string | null;
  template_name: string | null;
  locale: string | null;
  locale_source: string | null;
  aging_since: Date | null;
}

async function rows(s: Seeded): Promise<Row[]> {
  const { client } = getTx();
  const r = await client.query<Row>(`SELECT * FROM claim_peer_mesh_wa_reminders WHERE pariwar_id = $1 ORDER BY created_at`, [s.pid]);
  return r.rows;
}

async function only(s: Seeded): Promise<Row> {
  const r = await rows(s);
  expect(r).toHaveLength(1);
  return r[0]!;
}

/** FIXTURE ONLY, as the superuser: a reminder row in a given state (the begin would judge a past-the-bound ping late at once). */
async function insertReminderRow(s: Seeded, i: number, over: Record<string, unknown>): Promise<void> {
  const { client } = getTx();
  const v: Record<string, unknown> = {
    ping_id: s.pings[i]!.pingId,
    pariwar_id: s.pid,
    claim_case_id: s.claimCaseId,
    selection_id: s.selectionId,
    member_id: s.pings[i]!.memberId,
    send_outcome: 'attempting',
    claimed_at: new Date(),
    claimed_by_job: JOB,
    aging_since: new Date(),
    ...over,
  };
  const cols = Object.keys(v);
  await asSuperuser(client, async () => {
    await client.query(`INSERT INTO claim_peer_mesh_wa_reminders (${cols.join(', ')}) VALUES (${cols.map((_, k) => `$${k + 1}`).join(', ')})`, Object.values(v));
  });
  await enterAppScope(client, s.pid);
}

const ref = (s: Seeded, r: Row, jobId = JOB) => ({ pariwarId: s.pid, reminderId: r.reminder_id, jobId });
const db = () => bindScopedDb(getTx().client);

describe.skipIf(!hasDatabase)('Story 6.31 — the WhatsApp reminder, the domain half', { timeout: 30_000 }, () => {
  setupLiveDb();

  // ── the begin ──────────────────────────────────────────────────────────────────────────────────────────────────────────

  it('⭐ begins a DUE ping: attempting, attempt 1, the template recorded, the ciphertext AS STORED, the ping\'s link code', async () => {
    const s = await seedReminder();
    const r = await begin(s);
    expect(r).toMatchObject({ kind: 'begun', attemptCount: 1, recipientMemberId: s.pings[0]!.memberId, linkCode: s.pings[0]!.linkCode });
    expect(r.kind === 'begun' && r.mobileCiphertext).toBe(`enc:test:${s.pings[0]!.memberId}`);
    expect(await only(s)).toMatchObject({
      send_outcome: 'attempting',
      attempt_count: 1,
      claimed_by_job: JOB,
      send_started_at: null,
      template_name: TEMPLATE.name,
      locale: 'hi',
      locale_source: 'pariwar_default',
    });
    expect((await only(s)).aging_since).not.toBeNull();
  });

  it('re-claim grounds: another LIVE job ⇒ held_by_other; the own retry, a parked row, a lapsed lease ⇒ re-claimed (attempt + 1)', async () => {
    const s = await seedReminder();
    await begin(s);
    expect((await begin(s, 0, { jobId: 'job-b' })).kind).toBe('held_by_other');
    expect(await begin(s)).toMatchObject({ kind: 'begun', attemptCount: 2 });
    expect(await parkPeerMeshWaReminder(db(), { ...ref(s, await only(s)), detail: 'held:meta_131009' })).toBe(true);
    expect(await begin(s, 0, { jobId: 'job-b' })).toMatchObject({ kind: 'begun', attemptCount: 3 });
    expect(await only(s)).toMatchObject({ claimed_by_job: 'job-b', parked_at: null, first_detail: 'held:meta_131009' });
    const later = new Date(Date.now() + CORRECTION_SEND_LEASE_MS + 60_000);
    expect(await begin(s, 0, { jobId: 'job-c', now: later })).toMatchObject({ kind: 'begun', attemptCount: 4 });
  });

  it('⭐ the in-flight test is FIRST: the marker set ⇒ in_flight, ⛔ write and ⛔ re-check — even after the neighbour SUBMITTED (⛔ 23514)', async () => {
    const s = await seedReminder();
    await begin(s);
    expect(await markPeerMeshWaReminderInFlight(db(), { ...ref(s, await only(s)), leaseMarginMs: MARGIN_MS, now: new Date() })).toBe(true);
    const before = await only(s);
    await asSuperuser(getTx().client, async () => {
      await getTx().client.query(
        `INSERT INTO claim_peer_mesh_replies (pariwar_id, claim_case_id, selection_id, ping_id, responder_member_id, questionnaire_version_id, submitted_at)
         VALUES ($1, $2, $3, $4, $5, 'peer_mesh.v1', clock_timestamp() + interval '1 second')`,
        [s.pid, s.claimCaseId, s.selectionId, s.pings[0]!.pingId, s.pings[0]!.memberId],
      );
    });
    await enterAppScope(getTx().client, s.pid);
    expect((await begin(s)).kind).toBe('in_flight');
    expect(await only(s)).toEqual(before);
  });

  it('once ever: a FINISHED row ⇒ already_final (⛔ write)', async () => {
    const s = await seedReminder();
    await begin(s);
    await markPeerMeshWaReminderInFlight(db(), { ...ref(s, await only(s)), leaseMarginMs: MARGIN_MS, now: new Date() });
    await finalisePeerMeshWaReminder(getTx().client, { ...ref(s, await only(s)), outcome: 'accepted', providerMessageId: 'wamid.A', recipientNumberHash: 'h' });
    const before = await only(s);
    expect((await begin(s, 0, { jobId: 'job-b' })).kind).toBe('already_final');
    expect(await only(s)).toEqual(before);
  });

  it('⛔ write for a text that did ⛔ go (each non-accepted outcome) or is ⛔ yet 48 h old (DB clock)', async () => {
    const early = await seedReminder({ hoursAgo: 47 });
    expect((await begin(early)).kind).toBe('not_due');
    expect(await rows(early)).toHaveLength(0);
    for (const outcome of ['attempting', 'rejected_invalid_number', 'rejected_unreachable', 'no_target', 'error', 'skipped_superseded', null]) {
      const s = await seedReminder({ outcome });
      expect((await begin(s)).kind, String(outcome)).toBe('not_due');
      expect(await rows(s)).toHaveLength(0);
      expect(await dueOf(s), String(outcome)).toEqual([]);
    }
  });

  it('the switch OFF under the lock ⇒ switch_off, ⛔ row; an EXISTING parked row is left untouched', async () => {
    const off = await seedReminder({ switchOn: false });
    expect((await begin(off)).kind).toBe('switch_off');
    expect(await rows(off)).toHaveLength(0);
    const s = await seedReminder();
    await begin(s);
    await parkPeerMeshWaReminder(db(), { ...ref(s, await only(s)), detail: 'scope:template_not_approved' });
    const parked = await only(s);
    await asSuperuser(getTx().client, async () => {
      await getTx().client.query(`UPDATE pariwar_wa_config SET enabled = false WHERE pariwar_id = $1`, [s.pid]);
    });
    await enterAppScope(getTx().client, s.pid);
    expect((await begin(s, 0, { jobId: 'job-b' })).kind).toBe('switch_off');
    expect(await only(s)).toEqual(parked);
  });

  it('WR5 — at or past `+ 72 h` a begin writes skipped_late (a fresh row; a parked one keeps its note in first_detail)', async () => {
    const fresh = await seedReminder({ hoursAgo: 73 });
    expect(await begin(fresh)).toEqual({ kind: 'skipped', outcome: 'skipped_late' });
    expect(await only(fresh)).toMatchObject({ send_outcome: 'skipped_late', send_started_at: null, attempt_count: 1 });
    const s = await seedReminder({ hoursAgo: 73 });
    await insertReminderRow(s, 0, { claimed_by_job: PEER_MESH_WA_REMINDER_PARKED_BY, parked_at: new Date(), detail: 'scope:meta_131048' });
    expect(await begin(s, 0, { jobId: 'job-b' })).toEqual({ kind: 'skipped', outcome: 'skipped_late' });
    expect(await only(s)).toMatchObject({ send_outcome: 'skipped_late', claimed_by_job: 'job-b', parked_at: null, detail: 'scope:meta_131048', first_detail: 'scope:meta_131048' });
  });

  it('the finished judgements: window closed, answered (submitted), not opted in, ineligible, a name fault — each a FINISHED row', async () => {
    const decided = await seedReminder({ state: OUT_OF_WINDOW });
    expect(await begin(decided)).toEqual({ kind: 'skipped', outcome: 'skipped_window_closed' });

    const answered = await seedReminder();
    await asSuperuser(getTx().client, async () => {
      await getTx().client.query(
        `INSERT INTO claim_peer_mesh_replies (pariwar_id, claim_case_id, selection_id, ping_id, responder_member_id, questionnaire_version_id, submitted_at)
         VALUES ($1, $2, $3, $4, $5, 'peer_mesh.v1', clock_timestamp() + interval '1 second')`,
        [answered.pid, answered.claimCaseId, answered.selectionId, answered.pings[0]!.pingId, answered.pings[0]!.memberId],
      );
    });
    await enterAppScope(getTx().client, answered.pid);
    expect(await begin(answered)).toEqual({ kind: 'skipped', outcome: 'skipped_answered' });

    const notOpted = await seedReminder({ optedIn: false });
    expect(await begin(notOpted)).toEqual({ kind: 'skipped', outcome: 'skipped_not_opted_in' });

    const ineligible = await seedReminder({ neighbourState: 'withdrawn' });
    expect(await begin(ineligible)).toEqual({ kind: 'skipped', outcome: 'skipped_recipient_ineligible' });

    const erased = await seedReminder();
    expect(await begin(erased, 0, { nameFault: 'name_erased' })).toEqual({ kind: 'no_target', detail: 'no_target:name_erased' });

    for (const [s, outcome] of [
      [decided, 'skipped_window_closed'],
      [answered, 'skipped_answered'],
      [notOpted, 'skipped_not_opted_in'],
      [ineligible, 'skipped_recipient_ineligible'],
      [erased, 'no_target'],
    ] as const) {
      await enterAppScope(getTx().client, s.pid);
      expect(await only(s), outcome).toMatchObject({ send_outcome: outcome, send_started_at: null });
      expect((await begin(s, 0, { jobId: 'job-z' })).kind, outcome).toBe('already_final');
    }
  });

  it('WR2 (iii) (b) — a STARTED reply (⛔ submitted) still gets the reminder', async () => {
    const s = await seedReminder();
    await asSuperuser(getTx().client, async () => {
      await getTx().client.query(
        `INSERT INTO claim_peer_mesh_replies (pariwar_id, claim_case_id, selection_id, ping_id, responder_member_id, questionnaire_version_id)
         VALUES ($1, $2, $3, $4, $5, 'peer_mesh.v1')`,
        [s.pid, s.claimCaseId, s.selectionId, s.pings[0]!.pingId, s.pings[0]!.memberId],
      );
    });
    await enterAppScope(getTx().client, s.pid);
    expect((await begin(s)).kind).toBe('begun');
  });

  // ── the writes after the commit ───────────────────────────────────────────────────────────────────────────────────────

  it('⭐ the marker CAS: once; ⛔ by another job; ⛔ once the lease has less than the margin left', async () => {
    const s = await seedReminder();
    await begin(s);
    const r = await only(s);
    expect(await markPeerMeshWaReminderInFlight(db(), { ...ref(s, r, 'job-b'), leaseMarginMs: MARGIN_MS, now: new Date() })).toBe(false);
    expect(await markPeerMeshWaReminderInFlight(db(), { ...ref(s, r), leaseMarginMs: MARGIN_MS, now: new Date() })).toBe(true);
    expect(await markPeerMeshWaReminderInFlight(db(), { ...ref(s, r), leaseMarginMs: MARGIN_MS, now: new Date() })).toBe(false);

    const old = await seedReminder();
    await begin(old, 0, { now: new Date(Date.now() - (CORRECTION_SEND_LEASE_MS - MARGIN_MS) - 5_000) });
    expect(await markPeerMeshWaReminderInFlight(db(), { ...ref(old, await only(old)), leaseMarginMs: MARGIN_MS, now: new Date() })).toBe(false);
    expect((await only(old)).send_started_at).toBeNull();
  });

  it(
    '⭐ R1 — the marker rechecks WR5\'s 72-hour deadline too: a slow decrypt/hash crossing it ⇒ skipped_late, ⛔ sent (⛔ left attempting for a wasted re-claim)',
    async () => {
      // 2 seconds of margin left on the 72-hour bound at seed time (the "ping seeded two seconds before its deadline" repro).
      const s = await seedReminder({ hoursAgo: 71, secondsAgo: 59 * 60 + 58 });
      expect((await begin(s)).kind).toBe('begun'); // in_time still true — 2 s of margin left
      const r = await only(s);
      await new Promise((resolve) => setTimeout(resolve, 3_000)); // the "three-second HMAC delay" — crosses the deadline
      expect(await markPeerMeshWaReminderInFlight(db(), { ...ref(s, r), leaseMarginMs: MARGIN_MS, now: new Date() })).toBe(false);
      expect(await only(s)).toMatchObject({ send_outcome: 'skipped_late', send_started_at: null, claimed_by_job: PEER_MESH_WA_REMINDER_LATE_BY });
    },
    10_000,
  );

  it('the finalise needs the marker; accepted writes the wamid + hash; it is BOUNDED (both SET LOCALs in its transaction)', async () => {
    const s = await seedReminder();
    await begin(s);
    const r = await only(s);
    expect(await finalisePeerMeshWaReminder(getTx().client, { ...ref(s, r), outcome: 'accepted', providerMessageId: 'wamid.X', recipientNumberHash: 'h' })).toBe(false);
    await markPeerMeshWaReminderInFlight(db(), { ...ref(s, r), leaseMarginMs: MARGIN_MS, now: new Date() });
    expect(await finalisePeerMeshWaReminder(getTx().client, { ...ref(s, r, 'job-b'), outcome: 'accepted', providerMessageId: 'wamid.X', recipientNumberHash: 'h' })).toBe(false);
    expect(await finalisePeerMeshWaReminder(getTx().client, { ...ref(s, r), outcome: 'accepted', providerMessageId: 'wamid.X', recipientNumberHash: 'h' })).toBe(true);
    expect(await only(s)).toMatchObject({ send_outcome: 'accepted', provider_message_id: 'wamid.X', recipient_number_hash: 'h' });
    const { rows: t } = await getTx().client.query<{ lock: string; stmt: string }>(`SELECT current_setting('lock_timeout') AS lock, current_setting('statement_timeout') AS stmt`);
    expect(t[0]).toEqual({ lock: `${String(PEER_MESH_WA_REMINDER_FINALISE_LOCK_TIMEOUT_MS / 1000)}s`, stmt: `${String(PEER_MESH_WA_REMINDER_FINALISE_STATEMENT_TIMEOUT_MS / 1000)}s` });
  });

  it('may_have_sent finalises `error`; rejected_recipient finalises; a detail outside the grammar is refused BEFORE the statement', async () => {
    const s = await seedReminder({ n: 2 });
    await begin(s, 0);
    await begin(s, 1);
    const [a, b] = await rows(s);
    for (const r of [a!, b!]) await markPeerMeshWaReminderInFlight(db(), { ...ref(s, r), leaseMarginMs: MARGIN_MS, now: new Date() });
    await expect(finalisePeerMeshWaReminder(getTx().client, { ...ref(s, a!), outcome: 'error', detail: 'may_have_sent:9876543210' })).rejects.toThrow(/fixed grammar/);
    expect(await finalisePeerMeshWaReminder(getTx().client, { ...ref(s, a!), outcome: 'error', detail: peerMeshWaReminderDetail({ kind: 'may_have_sent', how: 'timeout' }) })).toBe(true);
    expect(await finalisePeerMeshWaReminder(getTx().client, { ...ref(s, b!), outcome: 'rejected_recipient' })).toBe(true);
    expect((await rows(s)).map((r) => [r.send_outcome, r.detail])).toEqual([
      ['error', 'may_have_sent:timeout'],
      ['rejected_recipient', null],
    ]);
  });

  it('the transient note and the park CLEAR the marker and keep the row attempting; ⛔ on a finished row', async () => {
    const s = await seedReminder();
    await begin(s);
    let r = await only(s);
    await markPeerMeshWaReminderInFlight(db(), { ...ref(s, r), leaseMarginMs: MARGIN_MS, now: new Date() });
    expect(await notePeerMeshWaReminderTransient(db(), { ...ref(s, r), detail: 'rate_limited:none' })).toBe(true);
    expect(await only(s)).toMatchObject({ send_outcome: 'attempting', detail: 'rate_limited:none', send_started_at: null, claimed_by_job: JOB });
    await markPeerMeshWaReminderInFlight(db(), { ...ref(s, r), leaseMarginMs: MARGIN_MS, now: new Date() });
    expect(await parkPeerMeshWaReminder(db(), { ...ref(s, r), detail: 'scope:meta_131048' })).toBe(true);
    r = await only(s);
    expect(r).toMatchObject({ send_outcome: 'attempting', claimed_by_job: PEER_MESH_WA_REMINDER_PARKED_BY, detail: 'scope:meta_131048', send_started_at: null });
    expect(r.parked_at).not.toBeNull();
    expect(await parkPeerMeshWaReminder(db(), { ...ref(s, r), detail: 'held:x' })).toBe(false);
  });

  it('no sendable number ⇒ no_target:no_sendable_number (only before the marker)', async () => {
    const s = await seedReminder();
    await begin(s);
    expect(await finishPeerMeshWaReminderNoSendableNumber(db(), ref(s, await only(s)))).toBe(true);
    expect(await only(s)).toMatchObject({ send_outcome: 'no_target', detail: 'no_target:no_sendable_number' });
  });

  // ── the sweep ────────────────────────────────────────────────────────────────────────────────────────────────────────

  async function dueOf(s: Seeded, now = new Date()): Promise<string[]> {
    await asSuperuser(getTx().client, async () => undefined);
    const page = await listDuePeerMeshWaReminderPings(getTx().client, { now, after: null, allow: [s.pid] });
    await enterAppScope(getTx().client, s.pid);
    return page.due.map((d) => d.pingId);
  }

  it('⭐ AC2 — the due list: 48 h due; 47 h ⛔; 72 h ⛔; a decided claim ⛔; switch OFF ⛔; a REPORTED-undelivered text still due', async () => {
    const due = await seedReminder({ hoursAgo: 48 });
    expect(await dueOf(due)).toEqual([due.pings[0]!.pingId]);
    expect(await listClaimDuePeerMeshWaReminderPings(db(), { pariwarId: due.pid, claimCaseId: due.claimCaseId, now: new Date() })).toEqual([due.pings[0]!.pingId]);
    expect(await dueOf(await seedReminder({ hoursAgo: 47 }))).toEqual([]);
    expect(await dueOf(await seedReminder({ hoursAgo: 72 }))).toEqual([]);
    expect(await dueOf(await seedReminder({ state: OUT_OF_WINDOW }))).toEqual([]);
    expect(await dueOf(await seedReminder({ switchOn: false }))).toEqual([]);
    const reported = await seedReminder();
    await asSuperuser(getTx().client, async () => {
      await getTx().client.query(
        `INSERT INTO sms_send_deliveries (send_kind, send_row_id, pariwar_id, request_id, delivery_state, status_code, first_reported_at, reported_at)
         VALUES ('pm', $1, $2, 'REQ1', 'undelivered', '2', now(), now())`,
        [reported.pings[0]!.pingId, reported.pid],
      );
    });
    expect(await dueOf(reported)).toEqual([reported.pings[0]!.pingId]);
  });

  it('AC2 — rows: a finished ⛔ listed; a parked listed; a lapsed one WITHOUT the marker listed; one WITH the marker ⛔ (the finisher\'s)', async () => {
    const s = await seedReminder({ n: 4 });
    const old = new Date(Date.now() - CORRECTION_SEND_LEASE_MS - 60_000);
    await begin(s, 0); // finished below
    await begin(s, 1); // parked below
    await begin(s, 2, { now: old }); // lapsed, ⛔ marker
    await begin(s, 3, { now: old }); // lapsed WITH the marker
    const [r0, r1, , r3] = await rows(s);
    await markPeerMeshWaReminderInFlight(db(), { ...ref(s, r0!), leaseMarginMs: MARGIN_MS, now: new Date() });
    await finalisePeerMeshWaReminder(getTx().client, { ...ref(s, r0!), outcome: 'rejected_recipient' });
    await parkPeerMeshWaReminder(db(), { ...ref(s, r1!), detail: 'held:meta_131009' });
    await getTx().client.query(`UPDATE claim_peer_mesh_wa_reminders SET send_started_at = claimed_at, detail = 'rate_limited:none' WHERE reminder_id = $1`, [r3!.reminder_id]);
    expect((await dueOf(s)).sort()).toEqual([s.pings[1]!.pingId, s.pings[2]!.pingId].sort());
  });

  it('the CHILD\'s list includes a row a LIVE job holds (the begin judges the holder — its own pg-boss retry re-claims it); the SWEEP\'s does ⛔', async () => {
    const s = await seedReminder();
    await begin(s);
    await notePeerMeshWaReminderTransient(db(), { ...ref(s, await only(s)), detail: 'rate_limited:none' });
    expect(await dueOf(s)).toEqual([]);
    expect(await listClaimDuePeerMeshWaReminderPings(db(), { pariwarId: s.pid, claimCaseId: s.claimCaseId, now: new Date() })).toEqual([s.pings[0]!.pingId]);
    expect(await begin(s)).toMatchObject({ kind: 'begun', attemptCount: 2 });
    await markPeerMeshWaReminderInFlight(db(), { ...ref(s, await only(s)), leaseMarginMs: MARGIN_MS, now: new Date() });
    expect(await listClaimDuePeerMeshWaReminderPings(db(), { pariwarId: s.pid, claimCaseId: s.claimCaseId, now: new Date() })).toEqual([]);
  });

  it('⭐ the lapsed in-flight finisher: the marker set + the lease lapsed ⇒ error / may_have_sent:lease_lapsed — past the bound and switch OFF too; a live one untouched', async () => {
    const s = await seedReminder({ n: 2, hoursAgo: 71 });
    const old = new Date(Date.now() - CORRECTION_SEND_LEASE_MS - 60_000);
    await begin(s, 0, { now: old });
    await begin(s, 1);
    const [lapsed, live] = await rows(s);
    await getTx().client.query(`UPDATE claim_peer_mesh_wa_reminders SET send_started_at = claimed_at, detail = 'rate_limited:none' WHERE reminder_id = $1`, [lapsed!.reminder_id]);
    await markPeerMeshWaReminderInFlight(db(), { ...ref(s, live!), leaseMarginMs: MARGIN_MS, now: new Date() });
    await asSuperuser(getTx().client, async () => {
      await getTx().client.query(`UPDATE pariwar_wa_config SET enabled = false WHERE pariwar_id = $1`, [s.pid]);
      const finished = await finishLapsedInFlightPeerMeshWaReminders(getTx().client, { now: new Date(), allow: [s.pid] });
      expect(finished.map((f) => f.reminderId)).toEqual([lapsed!.reminder_id]);
    });
    await enterAppScope(getTx().client, s.pid);
    const [a, b] = await rows(s);
    expect(a).toMatchObject({ send_outcome: 'error', detail: 'may_have_sent:lease_lapsed', first_detail: 'rate_limited:none', claimed_by_job: 'sweep:lapsed' });
    expect(b).toMatchObject({ send_outcome: 'attempting', claimed_by_job: JOB });
  });

  it('⭐ the late marking: parked past `+ 72 h` ⇒ skipped_late (on a DECIDED claim too); ⛔ an in-flight row; ⛔ a row within the bound; ⛔ a row created', async () => {
    // Past the bound, on a claim DECIDED since, the switch OFF: a parked row, a transient row and an in-flight row.
    const s = await seedReminder({ n: 3, hoursAgo: 73, state: OUT_OF_WINDOW, switchOn: false });
    await insertReminderRow(s, 0, { claimed_by_job: PEER_MESH_WA_REMINDER_PARKED_BY, parked_at: new Date(), detail: 'scope:meta_131048' });
    await insertReminderRow(s, 1, { detail: 'api_unavailable:503' });
    await insertReminderRow(s, 2, { send_started_at: new Date() });
    const [p0, p1] = await rows(s);
    // Within the bound: a parked row is ⛔ marked. An accepted ping past the bound with ⛔ row: ⛔ row created.
    const within = await seedReminder({ hoursAgo: 71 });
    await insertReminderRow(within, 0, { claimed_by_job: PEER_MESH_WA_REMINDER_PARKED_BY, parked_at: new Date(), detail: 'held:meta_100' });
    const noRow = await seedReminder({ hoursAgo: 80 });
    await asSuperuser(getTx().client, async () => {
      const marked = await markLatePeerMeshWaReminders(getTx().client, { allow: [s.pid, within.pid, noRow.pid] });
      expect(marked.map((m) => m.reminderId).sort()).toEqual([p0!.reminder_id, p1!.reminder_id].sort());
    });
    await enterAppScope(getTx().client, within.pid);
    expect((await only(within)).send_outcome).toBe('attempting');
    await enterAppScope(getTx().client, s.pid);
    const [a, b, c] = await rows(s);
    expect(a).toMatchObject({ send_outcome: 'skipped_late', claimed_by_job: 'sweep:late', parked_at: null, detail: 'scope:meta_131048', first_detail: 'scope:meta_131048' });
    expect(b).toMatchObject({ send_outcome: 'skipped_late', detail: 'api_unavailable:503' });
    expect(c).toMatchObject({ send_outcome: 'attempting' });
    expect(c!.send_started_at).not.toBeNull();
    await enterAppScope(getTx().client, noRow.pid);
    expect(await rows(noRow)).toHaveLength(0);
  });

  it('I8 — ⛔ event from a begin, a finalise, a park or a sweep finisher', async () => {
    const s = await seedReminder({ n: 2 });
    const count = async () => (await getTx().client.query<{ n: number }>(`SELECT count(*)::int AS n FROM events_log WHERE pariwar_id = $1`, [s.pid])).rows[0]!.n;
    const before = await count();
    await begin(s, 0);
    await begin(s, 1);
    const [a, b] = await rows(s);
    await markPeerMeshWaReminderInFlight(db(), { ...ref(s, a!), leaseMarginMs: MARGIN_MS, now: new Date() });
    await finalisePeerMeshWaReminder(getTx().client, { ...ref(s, a!), outcome: 'accepted', providerMessageId: 'wamid.Z', recipientNumberHash: 'h' });
    await parkPeerMeshWaReminder(db(), { ...ref(s, b!), detail: 'held:meta_100' });
    expect(await count()).toBe(before);
  });
});
