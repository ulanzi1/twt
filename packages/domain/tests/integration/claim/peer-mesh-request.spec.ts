// Story 6.27c (Task 3.10; AC1b–AC5b) — the neighbours' text, the domain half, on a live DB. Per-test ROLLBACK (`setupLiveDb`);
// every write runs as `twt_app` in the claim's Pariwar (RLS), after a superuser seed.
//   · the ONE builder's every output passes 0166's CHECK;
//   · R1 — the begin: `attempting`, `attempt_count = 1`, the anchor, `locale_source`, a link code in its form, the ciphertext AS
//     STORED; another job within the lease ⇒ `held_by_other`; the own retry / a parked row / past the lease ⇒ re-claimed (the
//     parked anchor credited, ⛔ a new link code); a finished ping ⇒ `already_final` (once-ever);
//   · AC3 — the window per state × routed (`isStateInAnswerWindow` is the oracle — ⛔ re-composed): out ⇒ `skipped_superseded`;
//   · R3 / R4 / R2 — each peer reason labelled and replaced ONCE from the STORED ranking, in order (a replacement of a
//     replacement too); `name_*` and `superseded:*` ⛔ replaced; a NULL ranking / ⛔ one left ⇒ ⛔ replacement; live pings never
//     exceed the original count; the four labels cover today's predicate;
//   · the re-claimed row (`-297` §2 / `-298` A) — a window or peer failure ⇒ `error` + `exhausted:recheck_*`, ⛔ replaced; a name
//     fault keeps its reason; R6 on a first attempt ⇒ replaced, on a re-claim ⇒ ⛔ (R5, `-343`);
//   · the reads — the due pings, the locale, the by-link answer (R14), the sweep's due claims (R16), park / give-up (RN2 / RN3);
//   · AC5b — ⛔ event from any of it.

import { randomUUID } from 'node:crypto';

import { describe, expect, it, vi } from 'vitest';

// 6.27c review round 2 P3 — the link-code COLLISION leg forces the generator's bytes; every other call passes through to the
// real CSPRNG (an empty queue ⇒ `randomBytes` unchanged).
const forcedBytes = vi.hoisted(() => [] as Buffer[]);
vi.mock('node:crypto', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:crypto')>();
  return { ...actual, randomBytes: (n: number) => forcedBytes.shift() ?? actual.randomBytes(n) };
});

import {
  CORRECTION_SEND_LEASE_MS,
  PEER_MESH_REQUEST_PARKED_BY,
  PeerRequestLocaleMissingError,
  beginPeerMeshRequest,
  countWaitingPeerMeshRequestPings,
  expireExhaustedPeerMeshRequests,
  finalisePeerMeshNoSendableNumber,
  finalisePeerMeshRequest,
  isStateInAnswerWindow,
  listDuePeerMeshRequestClaims,
  listDuePeerMeshRequestPings,
  listStalledPeerMeshRequestScopes,
  notePeerMeshRequestTransient,
  parkHeldPeerMeshRequests,
  peerMeshRequestReclaimCutoff,
  readPeerMeshRequestEligibility,
  resolvePariwarDefaultLocale,
  resolvePeerRequestByLinkCode,
  resolvePeerRequestLocale,
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
import { PEER_MESH_LINK_CODE_PATTERN, PEER_MESH_REQUEST_REPLACEABLE_REASONS } from '../../../src/schema/claim_peer_mesh_pings.js';
import { CLAIM_LIFECYCLE_STATES } from '../../../src/schema/claims.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { everyBuiltPeerMeshRequestDetail } from '../../claim/_peer-mesh-request-details.js';
import { enterAppScope, seedClaim, seedPassport } from '../_helpers.js';

type Client = ReturnType<typeof getTx>['client'];

const NOW = new Date();
const JOB = 'job-a';

interface Seeded {
  pid: PariwarId;
  claimCaseId: ClaimId;
  deceased: MemberId;
  selectionId: string;
  /** The stored ranking (the selected prefix first). */
  ranked: MemberId[];
  /** One ping per selected member, in ranking order. */
  pings: { pingId: PeerMeshPingId; memberId: MemberId }[];
}

/** As the superuser: one active member with an identity row (its ciphertext is a MARKER — ⛔ a real envelope). */
async function insertMember(client: Client, pid: string, memberId: string, state = 'active', withIdentity = true): Promise<void> {
  await client.query(`INSERT INTO members (member_id, pariwar_id, state, state_event_version) VALUES ($1, $2, $3, 1)`, [memberId, pid, state]);
  if (withIdentity) {
    await client.query(
      `INSERT INTO member_identities (member_id, pariwar_id, mobile_ciphertext, mobile_blind_index) VALUES ($1, $2, $3, $4)`,
      [memberId, pid, `enc:test:${memberId}`, `idx-${randomUUID()}`],
    );
  }
}

/**
 * As the superuser: a claim in `state`, `ranked` active members, a selection whose first `selected` are pinged (the 0163 prefix)
 * and whose ranking is STORED (or NULL), then `twt_app` in the Pariwar.
 */
async function seedRequestClaim(
  o: {
    state?: string;
    ranked?: number;
    selected?: number;
    rankedNull?: boolean;
    source?: 'workplace' | 'named_by_member' | null;
    localeDefault?: 'hi' | 'en';
    noPassport?: boolean;
  } = {},
): Promise<Seeded> {
  const { tx, client } = getTx();
  const pid = toPariwarId(randomUUID());
  // 📌 Story 6.35 — a fresh begin resolves the recipient's language (LS8), which reads the passport.
  if (!o.noPassport) await seedPassport(tx, pid, { localeDefault: o.localeDefault ?? 'hi' });
  const deceased = toMemberId(randomUUID());
  await insertMember(client, pid, deceased);
  const claimCaseId = toClaimId(await seedClaim(tx, pid, { deceasedMemberId: deceased, currentState: (o.state ?? 'verification_in_progress') as never }));
  const ranked = Array.from({ length: o.ranked ?? 7 }, () => toMemberId(randomUUID()));
  for (const m of ranked) await insertMember(client, pid, m);
  const selected = ranked.slice(0, o.selected ?? Math.min(5, ranked.length));
  const source = o.source === undefined ? 'workplace' : o.source;
  const selectionId = randomUUID();
  await client.query(
    `INSERT INTO claim_peer_mesh_selections (selection_id, claim_case_id, pariwar_id, deceased_member_id, deceased_created_at, metric_id,
       metric_version, selected_member_ids, candidate_snapshot, response_window_expires_at, source, ranked_member_ids)
     VALUES ($1, $2, $3, $4, now(), 'm', 1, $5::uuid[], '[]'::jsonb, now() + interval '72 hours', $6, $7::uuid[])`,
    [selectionId, claimCaseId, pid, deceased, selected, source, o.rankedNull ? null : ranked],
  );
  const pings: Seeded['pings'] = [];
  for (const memberId of selected) {
    const pingId = toPingId(randomUUID());
    await client.query(`INSERT INTO claim_peer_mesh_pings (ping_id, selection_id, pariwar_id, member_id, source) VALUES ($1, $2, $3, $4, $5)`, [
      pingId,
      selectionId,
      pid,
      memberId,
      source,
    ]);
    pings.push({ pingId, memberId });
  }
  await enterAppScope(client, pid);
  return { pid, claimCaseId, deceased, selectionId, ranked, pings };
}

const begin = (
  s: Seeded,
  pingId: PeerMeshPingId,
  o: { jobId?: string; now?: Date; nameFault?: Parameters<typeof beginPeerMeshRequest>[1]['nameFault']; unusable?: ('hi' | 'en')[] } = {},
) =>
  beginPeerMeshRequest(getTx().client, {
    pariwarId: s.pid,
    claimCaseId: s.claimCaseId,
    pingId,
    jobId: o.jobId ?? JOB,
    now: o.now ?? NOW,
    nameFault: o.nameFault ?? null,
    unusableLocales: o.unusable ?? [],
  });

async function pingRow(pingId: string) {
  const { rows } = await getTx().client.query<{
    send_outcome: string | null;
    attempt_count: number;
    detail: string | null;
    first_detail: string | null;
    claimed_by_job: string | null;
    aging_since: Date | null;
    parked_at: Date | null;
    link_code: string | null;
    locale_source: string | null;
    locale: string | null;
    replaces_ping_id: string | null;
    member_id: string;
    source: string | null;
    provider_message_id: string | null;
    recipient_number_hash: string | null;
    send_updated_at: Date | null;
  }>(`SELECT * FROM claim_peer_mesh_pings WHERE ping_id = $1`, [pingId]);
  return rows[0]!;
}

async function pingsOf(selectionId: string) {
  const { rows } = await getTx().client.query<{ ping_id: string; member_id: string; send_outcome: string | null; replaces_ping_id: string | null }>(
    `SELECT ping_id, member_id, send_outcome, replaces_ping_id FROM claim_peer_mesh_pings WHERE selection_id = $1`,
    [selectionId],
  );
  return rows;
}

async function eventCount(claimCaseId: string): Promise<number> {
  const { rows } = await getTx().client.query<{ n: number }>(`SELECT count(*)::int AS n FROM events_log WHERE stream_id = $1`, [claimCaseId]);
  return rows[0]!.n;
}

/** As the superuser, briefly: record a member's language choice (Story 6.35 — the API's setter is `member/preferred-locale.ts`). */
async function chooseLanguage(memberId: string, locale: 'hi' | 'en'): Promise<void> {
  const { client } = getTx();
  await client.query('RESET ROLE');
  await client.query(`UPDATE members SET preferred_locale = $2, preferred_locale_set_at = now() WHERE member_id = $1`, [memberId, locale]);
  await client.query('SET LOCAL ROLE twt_app');
}

/** As the superuser, briefly: set columns of a ping directly (a crash-left / parked / stale fixture). */
async function setPing(pingId: string, set: string): Promise<void> {
  const { client } = getTx();
  await client.query('RESET ROLE');
  await client.query(`UPDATE claim_peer_mesh_pings SET ${set} WHERE ping_id = $1`, [pingId]);
  await client.query('SET LOCAL ROLE twt_app');
}

describe.skipIf(!hasDatabase)('Story 6.27c — the neighbours\' text (domain, live)', { timeout: 20000 }, () => {
  setupLiveDb();

  it('⭐ every builder output passes 0166\'s grammar CHECK on `detail` AND `first_detail`', async () => {
    const s = await seedRequestClaim({ ranked: 1 });
    const { client } = getTx();
    for (const d of everyBuiltPeerMeshRequestDetail()) {
      await client.query('SAVEPOINT d');
      const r = await client.query(`UPDATE claim_peer_mesh_pings SET send_outcome = 'error', attempt_count = 1, detail = $2, first_detail = $2 WHERE ping_id = $1`, [
        s.pings[0]!.pingId,
        d,
      ]);
      // ⛔ vacuous — the row was really written, so the CHECK really ran (6.27c review round 2 P12)
      expect(r.rowCount, d).toBe(1);
      await client.query('ROLLBACK TO SAVEPOINT d');
    }
  });

  describe('R1 — the begin', () => {
    it('a fresh ping is begun: attempting, attempt 1, the anchor, the locale source, a link code in its form, the ciphertext AS STORED', async () => {
      const s = await seedRequestClaim();
      const p = s.pings[0]!;
      const r = await begin(s, p.pingId);
      expect(r.kind).toBe('begun');
      if (r.kind !== 'begun') return;
      expect(r).toMatchObject({ pingId: p.pingId, recipientMemberId: p.memberId, attemptCount: 1, mobileCiphertext: `enc:test:${p.memberId}` });
      expect(r.linkCode).toMatch(new RegExp(PEER_MESH_LINK_CODE_PATTERN));
      const row = await pingRow(p.pingId);
      expect(row).toMatchObject({ send_outcome: 'attempting', attempt_count: 1, claimed_by_job: JOB, locale_source: 'pariwar_default', link_code: r.linkCode });
      expect(row.aging_since).not.toBeNull();
    });

    it('another job within the lease ⇒ held_by_other; the own retry ⇒ re-claimed (attempt 2, the SAME code); past the lease ⇒ taken', async () => {
      const s = await seedRequestClaim();
      const p = s.pings[0]!;
      const first = await begin(s, p.pingId);
      expect((await begin(s, p.pingId, { jobId: 'job-b' })).kind).toBe('held_by_other');
      const retry = await begin(s, p.pingId);
      expect(retry).toMatchObject({ kind: 'begun', attemptCount: 2 });
      expect(retry.kind === 'begun' && first.kind === 'begun' && retry.linkCode === first.linkCode).toBe(true);
      const later = new Date(NOW.getTime() + CORRECTION_SEND_LEASE_MS + 60_000);
      expect(await begin(s, p.pingId, { jobId: 'job-b', now: later })).toMatchObject({ kind: 'begun', attemptCount: 3 });
      expect((await pingRow(p.pingId)).claimed_by_job).toBe('job-b');
    });

    it('⭐ once-ever: a finished ping is `already_final` — a re-run ⛔ begins it again', async () => {
      const s = await seedRequestClaim();
      const p = s.pings[0]!;
      expect((await begin(s, p.pingId)).kind).toBe('begun');
      const db = bindScopedDb(getTx().client);
      expect(await finalisePeerMeshRequest(db, { pariwarId: s.pid, pingId: p.pingId, jobId: JOB, outcome: 'accepted', providerMessageId: 'pm-1', recipientNumberHash: 'h' })).toBe(true);
      expect((await begin(s, p.pingId)).kind).toBe('already_final');
      expect((await begin(s, p.pingId, { jobId: 'job-z' })).kind).toBe('already_final');
      const row = await pingRow(p.pingId);
      expect(row).toMatchObject({ send_outcome: 'accepted', provider_message_id: 'pm-1', recipient_number_hash: 'h', detail: null });
      expect(row.send_updated_at).not.toBeNull();
    });

    it('a PARKED row is re-claimed at once and its anchor credited by the time it sat parked (RN3)', async () => {
      const s = await seedRequestClaim();
      const p = s.pings[0]!;
      // A crash-left row a held sweep parked (written from ⛔ begun — the anchor may ⛔ move backward on a begun row).
      await setPing(
        p.pingId,
        `send_outcome = 'attempting', attempt_count = 1, claimed_at = '2026-01-01T00:00:00Z', aging_since = '2026-01-01T00:00:00Z',
         claimed_by_job = '${PEER_MESH_REQUEST_PARKED_BY}', parked_at = '2026-01-02T00:00:00Z', link_code = 'Pk3dEf7hIj9K'`,
      );
      const at = new Date('2026-01-03T00:00:00Z');
      expect(await begin(s, p.pingId, { jobId: 'job-b', now: at })).toMatchObject({ kind: 'begun', attemptCount: 2 });
      const row = await pingRow(p.pingId);
      expect(row.parked_at).toBeNull();
      expect(row.aging_since?.toISOString()).toBe('2026-01-02T00:00:00.000Z');
    });

    it('the transient note keeps the row `attempting` and is moved to `first_detail` by the re-claim (write-once)', async () => {
      const s = await seedRequestClaim();
      const p = s.pings[0]!;
      await begin(s, p.pingId);
      const db = bindScopedDb(getTx().client);
      expect(await notePeerMeshRequestTransient(db, { pariwarId: s.pid, pingId: p.pingId, jobId: JOB, detail: 'rate_limited:x' })).toBe(true);
      expect(await notePeerMeshRequestTransient(db, { pariwarId: s.pid, pingId: p.pingId, jobId: 'other', detail: 'rate_limited:y' })).toBe(false);
      await begin(s, p.pingId);
      expect(await notePeerMeshRequestTransient(db, { pariwarId: s.pid, pingId: p.pingId, jobId: JOB, detail: 'api_unavailable:timeout' })).toBe(true);
      await begin(s, p.pingId);
      expect(await pingRow(p.pingId)).toMatchObject({ send_outcome: 'attempting', first_detail: 'rate_limited:x', detail: 'api_unavailable:timeout', attempt_count: 3 });
    });
  });

  describe('AC3 — ⛔ a text once the claim can no longer take an answer', () => {
    it('every state × routed / not routed: begun iff `isStateInAnswerWindow`; else `skipped_superseded` (⛔ replaced)', async () => {
      const { client } = getTx();
      for (const state of CLAIM_LIFECYCLE_STATES) {
        for (const routed of [false, true]) {
          await client.query('RESET ROLE');
          await client.query('SAVEPOINT st');
          const s = await seedRequestClaim({ state });
          if (routed) {
            await client.query('RESET ROLE');
            await client.query(
              `INSERT INTO claim_state_trustee_decisions (claim_case_id, pariwar_id, phase, outcome, reason_code, actor_id, actor_display)
               VALUES ($1, $2, 'routing', 'routed_to_r9', 'r9_special_case', 'pa', 'Pariwar Admin')`,
              [s.claimCaseId, s.pid],
            );
            await enterAppScope(client, s.pid);
          }
          const r = await begin(s, s.pings[0]!.pingId);
          const label = `${state} / routed ${String(routed)}`;
          if (isStateInAnswerWindow(state, routed)) {
            expect(r.kind, label).toBe('begun');
          } else {
            expect(r, label).toEqual({ kind: 'superseded', detail: 'superseded:claim_decided' });
            expect((await pingRow(s.pings[0]!.pingId)).send_outcome, label).toBe('skipped_superseded');
            expect(await pingsOf(s.selectionId), label).toHaveLength(s.pings.length);
          }
          await client.query('RESET ROLE');
          await client.query('ROLLBACK TO SAVEPOINT st');
        }
      }
    });
  });

  it('⭐ AC2 — a `link_code` collision (23505) is retried with a NEW code inside the SAVEPOINT; the begin succeeds', async () => {
    try {
      await linkCodeCollisionLeg();
    } finally {
      forcedBytes.length = 0; // ⛔ a leftover forced draw reaching a later `randomBytes` caller in this file
    }
  });

  async function linkCodeCollisionLeg(): Promise<void> {
    const s = await seedRequestClaim();
    // 24 bytes of one value < 62 ⇒ a 12-character code of one letter (the generator's rejection limit is 248).
    const bytesOf = (v: number): Buffer => Buffer.alloc(24, v);
    forcedBytes.push(bytesOf(7));
    const first = await begin(s, s.pings[0]!.pingId);
    expect(first.kind).toBe('begun');
    if (first.kind !== 'begun') return;
    // the SECOND ping's first draw is the SAME code ⇒ `claim_peer_mesh_pings_link_code_uq`; the retry draws again
    forcedBytes.push(bytesOf(7), bytesOf(8));
    const second = await begin(s, s.pings[1]!.pingId);
    expect(forcedBytes).toHaveLength(0); // both draws were taken — the collision really happened and was retried
    expect(second.kind).toBe('begun');
    if (second.kind !== 'begun') return;
    expect(second.linkCode).not.toBe(first.linkCode);
    expect(second.linkCode).toMatch(new RegExp(PEER_MESH_LINK_CODE_PATTERN));
    expect(await pingRow(s.pings[1]!.pingId)).toMatchObject({ send_outcome: 'attempting', attempt_count: 1, link_code: second.linkCode });
    // the transaction is still usable after the rolled-back savepoint
    expect((await pingRow(s.pings[0]!.pingId)).link_code).toBe(first.linkCode);
  }

  describe('R3 / R4 / R2 — the exclusions and the replacement', () => {
    /** As the superuser: make the selected member `m` fail the gate for `reason`. */
    async function exclude(s: Seeded, m: MemberId, reason: (typeof PEER_MESH_REQUEST_REPLACEABLE_REASONS)[number]): Promise<void> {
      const { tx, client } = getTx();
      await client.query('RESET ROLE');
      switch (reason) {
        case 'peer_not_active':
          await client.query(`SET LOCAL app.member_state_writer = 'on'`);
          await client.query(`UPDATE members SET state = 'lapsed-unpaid' WHERE member_id = $1`, [m]);
          await client.query(`SET LOCAL app.member_state_writer = 'off'`);
          break;
        case 'peer_reported_deceased':
          await seedClaim(tx, s.pid, { deceasedMemberId: m });
          break;
        case 'no_sendable_number':
          await client.query(`DELETE FROM member_identities WHERE member_id = $1`, [m]);
          break;
        case 'peer_filed_for_this_death':
          await seedClaim(tx, s.pid, { deceasedMemberId: s.deceased, claimantActorId: m });
          break;
        case 'peer_not_eligible':
          // ⛔ plantable: the four specific labels cover every conjunct of today's predicate (asserted below) — this arm is a
          // no-op, and the `it.each` below filters it out.
          break;
      }
      await enterAppScope(client, s.pid);
    }

    it.each(PEER_MESH_REQUEST_REPLACEABLE_REASONS.filter((r) => r !== 'peer_not_eligible'))(
      '`%s` ⇒ `no_target:<reason>` ⛔ alarm-worthy, and ONE replacement — the ranking\'s NEXT member, the selection\'s source',
      async (reason) => {
        const s = await seedRequestClaim();
        const before = await eventCount(s.claimCaseId);
        await exclude(s, s.pings[0]!.memberId, reason);
        const r = await begin(s, s.pings[0]!.pingId);
        expect(r).toMatchObject({ kind: 'no_target', detail: `no_target:${reason}`, reclaimed: false });
        if (r.kind !== 'no_target') return;
        expect(r.replacementPingId).not.toBeNull();
        const rep = await pingRow(r.replacementPingId!);
        expect(rep).toMatchObject({ member_id: s.ranked[5], replaces_ping_id: s.pings[0]!.pingId, source: 'workplace', send_outcome: null });
        // the replacement is processed like any due ping
        expect((await begin(s, r.replacementPingId!)).kind).toBe('begun');
        expect(await eventCount(s.claimCaseId)).toBe(before); // AC5b — ⛔ event
      },
    );

    it('a replacement that is itself excluded is replaced in turn — and live pings never exceed the original count', async () => {
      const s = await seedRequestClaim({ ranked: 8 });
      await exclude(s, s.pings[0]!.memberId, 'no_sendable_number');
      const r1 = await begin(s, s.pings[0]!.pingId);
      expect(r1.kind === 'no_target' && r1.replacementPingId).toBeTruthy();
      expect((await pingRow((r1 as { replacementPingId: PeerMeshPingId }).replacementPingId)).member_id).toBe(s.ranked[5]);
      // the replacement's own neighbour leaves before ITS send
      await exclude(s, s.ranked[5]!, 'peer_not_active');
      const r2 = await begin(s, (r1 as { replacementPingId: PeerMeshPingId }).replacementPingId);
      expect(r2).toMatchObject({ kind: 'no_target', detail: 'no_target:peer_not_active' });
      const third = await pingRow((r2 as { replacementPingId: PeerMeshPingId }).replacementPingId);
      expect(third.member_id).toBe(s.ranked[6]);
      const all = await pingsOf(s.selectionId);
      expect(all).toHaveLength(s.pings.length + 2); // the five originals + two replacements
      const live = all.filter((p) => p.send_outcome !== 'no_target' && p.send_outcome !== 'skipped_superseded');
      // EXACTLY the original count: four originals still due + the second replacement (6.27c review round 2 P12 — ⛔ `<=`)
      expect(live).toHaveLength(s.pings.length);
    });

    it('⛔ one left in the ranking ⇒ ⛔ replacement; a NULL ranking (`district_cohort_v1`) ⇒ ⛔ replacement', async () => {
      const full = await seedRequestClaim({ ranked: 5 });
      await exclude(full, full.pings[0]!.memberId, 'no_sendable_number');
      expect(await begin(full, full.pings[0]!.pingId)).toMatchObject({ kind: 'no_target', replacementPingId: null });
      const { client } = getTx();
      await client.query('RESET ROLE');
      const legacy = await seedRequestClaim({ ranked: 7, rankedNull: true, source: null });
      await exclude(legacy, legacy.pings[0]!.memberId, 'no_sendable_number');
      expect(await begin(legacy, legacy.pings[0]!.pingId)).toMatchObject({ kind: 'no_target', replacementPingId: null });
    });

    it('a member already pinged in the selection is ⛔ picked again; an ineligible ranked member is skipped over', async () => {
      const s = await seedRequestClaim({ ranked: 8 });
      await exclude(s, s.ranked[5]!, 'peer_reported_deceased');
      await exclude(s, s.pings[0]!.memberId, 'peer_not_active');
      const r = await begin(s, s.pings[0]!.pingId);
      expect((await pingRow((r as { replacementPingId: PeerMeshPingId }).replacementPingId)).member_id).toBe(s.ranked[6]);
    });

    it('`name_*` ⇒ `no_target:name_<reason>` and ⛔ replaced (claim-wide — R3)', async () => {
      const s = await seedRequestClaim();
      for (const [i, fault] of (['name_too_long', 'name_none', 'name_erased', 'name_unresolvable'] as const).entries()) {
        expect(await begin(s, s.pings[i]!.pingId, { nameFault: fault })).toMatchObject({ kind: 'no_target', detail: `no_target:${fault}`, replacementPingId: null });
      }
      expect(await pingsOf(s.selectionId)).toHaveLength(s.pings.length);
    });

    it('⭐ R4 — the four labels cover today\'s predicate: every way the gate fails gets a specific reason (⛔ `peer_not_eligible`)', async () => {
      const s = await seedRequestClaim({ ranked: 6 });
      const db = bindScopedDb(getTx().client);
      const cases: [MemberId, (typeof PEER_MESH_REQUEST_REPLACEABLE_REASONS)[number]][] = [
        [s.ranked[0]!, 'peer_not_active'],
        [s.ranked[1]!, 'peer_reported_deceased'],
        [s.ranked[2]!, 'no_sendable_number'],
        [s.ranked[3]!, 'peer_filed_for_this_death'],
      ];
      for (const [m, reason] of cases) await exclude(s, m, reason);
      // the intake-attempt filer arm of `-341` — a pending second-channel filing that never reached a claim row
      const { client } = getTx();
      await client.query('RESET ROLE');
      const filer = s.ranked[4]!;
      await client.query(
        `INSERT INTO intake_attempts (intake_attempt_id, pariwar_id, deceased_member_id, intake_channel, claimant_actor_id, attempt_status)
         VALUES (gen_random_uuid(), $1, $2, 'helpline'::claim_intake_channel, $3, 'pending'::intake_attempt_status)`,
        [s.pid, s.deceased, filer],
      );
      await enterAppScope(client, s.pid);
      for (const [m, reason] of [...cases, [filer, 'peer_filed_for_this_death'] as const]) {
        expect(await readPeerMeshRequestEligibility(db, { pariwarId: s.pid, memberId: m, deceasedMemberId: s.deceased }), reason).toEqual({ eligible: false, reason });
      }
      expect(await readPeerMeshRequestEligibility(db, { pariwarId: s.pid, memberId: s.ranked[5]!, deceasedMemberId: s.deceased })).toEqual({ eligible: true });
      // ⛔ member row ⇒ the fallback label (the only way to reach it today)
      expect(await readPeerMeshRequestEligibility(db, { pariwarId: s.pid, memberId: toMemberId(randomUUID()), deceasedMemberId: s.deceased })).toEqual({
        eligible: false,
        reason: 'peer_not_eligible',
      });
      // the deceased themself fails the gate (`member_id <> deceased`) and is labelled by the claim naming them — ⛔ the fallback
      expect(await readPeerMeshRequestEligibility(db, { pariwarId: s.pid, memberId: s.deceased, deceasedMemberId: s.deceased })).toEqual({
        eligible: false,
        reason: 'peer_reported_deceased',
      });
    });
  });

  describe('the RE-CLAIMED row (`-297` §2, `-298` A) and R6 / R5', () => {
    it('a re-claimed row whose claim left the window ⇒ `error` + `exhausted:recheck_claim_decided`, ⛔ replaced', async () => {
      const s = await seedRequestClaim();
      const p = s.pings[0]!;
      await begin(s, p.pingId);
      const { client } = getTx();
      await client.query('RESET ROLE');
      await client.query(`SET LOCAL app.claim_state_writer = 'on'`);
      await client.query(`UPDATE claims SET current_state = 'denied' WHERE claim_case_id = $1`, [s.claimCaseId]);
      await client.query(`SET LOCAL app.claim_state_writer = 'off'`);
      await enterAppScope(client, s.pid);
      expect(await begin(s, p.pingId)).toEqual({ kind: 'expired', detail: 'exhausted:recheck_claim_decided' });
      expect(await pingRow(p.pingId)).toMatchObject({ send_outcome: 'error', detail: 'exhausted:recheck_claim_decided' });
      expect(await pingsOf(s.selectionId)).toHaveLength(s.pings.length);
    });

    it('a re-claimed row whose neighbour is now ineligible ⇒ `error` + `exhausted:recheck_peer_ineligible`, ⛔ replaced', async () => {
      const s = await seedRequestClaim();
      const p = s.pings[0]!;
      await begin(s, p.pingId);
      const { tx, client } = getTx();
      await client.query('RESET ROLE');
      await seedClaim(tx, s.pid, { deceasedMemberId: p.memberId });
      await enterAppScope(client, s.pid);
      expect(await begin(s, p.pingId)).toEqual({ kind: 'expired', detail: 'exhausted:recheck_peer_ineligible' });
      expect(await pingsOf(s.selectionId)).toHaveLength(s.pings.length);
    });

    it('a re-claimed row with a name fault keeps its TRUE reason (`-298` A) — `reclaimed`, ⛔ replaced', async () => {
      const s = await seedRequestClaim();
      const p = s.pings[0]!;
      await begin(s, p.pingId);
      expect(await begin(s, p.pingId, { nameFault: 'name_erased' })).toMatchObject({
        kind: 'no_target',
        detail: 'no_target:name_erased',
        reclaimed: true,
        attemptCount: 1,
        replacementPingId: null,
      });
    });

    it('R6 on a FIRST attempt ⇒ `no_target:no_sendable_number` + ONE replacement; on a RE-CLAIMED row ⇒ ⛔ replacement (R5, `-343`)', async () => {
      const s = await seedRequestClaim();
      const [a, b] = s.pings;
      await begin(s, a!.pingId);
      const first = await finalisePeerMeshNoSendableNumber(getTx().client, { pariwarId: s.pid, claimCaseId: s.claimCaseId, pingId: a!.pingId, jobId: JOB });
      expect(first).toMatchObject({ moved: true, attemptCount: 1 });
      expect((await pingRow(first.replacementPingId!)).replaces_ping_id).toBe(a!.pingId);
      await begin(s, b!.pingId);
      await begin(s, b!.pingId); // the own retry — attempt 2
      const again = await finalisePeerMeshNoSendableNumber(getTx().client, { pariwarId: s.pid, claimCaseId: s.claimCaseId, pingId: b!.pingId, jobId: JOB });
      expect(again).toEqual({ moved: true, attemptCount: 2, replacementPingId: null });
      expect(await pingRow(b!.pingId)).toMatchObject({ send_outcome: 'no_target', detail: 'no_target:no_sendable_number' });
      // another job's finalise is a no-op
      const c = s.pings[2]!;
      await begin(s, c.pingId);
      expect(await finalisePeerMeshNoSendableNumber(getTx().client, { pariwarId: s.pid, claimCaseId: s.claimCaseId, pingId: c.pingId, jobId: 'job-z' })).toMatchObject({ moved: false });
    });

    it('R6 after the claim LEFT the window (decided since the begin) ⇒ `no_sendable_number` kept, ⛔ replacement (review round 2 P11)', async () => {
      const s = await seedRequestClaim();
      const p = s.pings[0]!;
      expect((await begin(s, p.pingId)).kind).toBe('begun');
      const { client } = getTx();
      await client.query('RESET ROLE');
      await client.query(`SET LOCAL app.claim_state_writer = 'on'`);
      await client.query(`UPDATE claims SET current_state = 'denied' WHERE claim_case_id = $1`, [s.claimCaseId]);
      await client.query(`SET LOCAL app.claim_state_writer = 'off'`);
      await enterAppScope(client, s.pid);
      expect(await finalisePeerMeshNoSendableNumber(client, { pariwarId: s.pid, claimCaseId: s.claimCaseId, pingId: p.pingId, jobId: JOB })).toEqual({
        moved: true,
        attemptCount: 1,
        replacementPingId: null,
      });
      expect(await pingRow(p.pingId)).toMatchObject({ send_outcome: 'no_target', detail: 'no_target:no_sendable_number' });
      expect(await pingsOf(s.selectionId)).toHaveLength(s.pings.length);
    });
  });

  describe('📌 Story 6.35 AC3 — the language recorded at the begin (LS9, I5; closes W8)', () => {
    it('⭐ a fresh begin writes `locale` + `locale_source` FROM the read — the recipient\'s choice, else the Pariwar\'s default', async () => {
      const s = await seedRequestClaim({ ranked: 2, selected: 2 });
      const [chooser, plain] = s.pings;
      await chooseLanguage(chooser!.memberId, 'en');
      expect(await begin(s, chooser!.pingId)).toMatchObject({ kind: 'begun', locale: 'en' });
      expect(await begin(s, plain!.pingId)).toMatchObject({ kind: 'begun', locale: 'hi' });
      expect(await pingRow(chooser!.pingId)).toMatchObject({ locale: 'en', locale_source: 'member_choice' });
      expect(await pingRow(plain!.pingId)).toMatchObject({ locale: 'hi', locale_source: 'pariwar_default' });
    });

    it('⭐ I5 — a re-claim REUSES the first locale even after the member changed their choice', async () => {
      const s = await seedRequestClaim({ ranked: 1, selected: 1 });
      const p = s.pings[0]!;
      await chooseLanguage(p.memberId, 'en');
      expect(await begin(s, p.pingId)).toMatchObject({ kind: 'begun', locale: 'en', attemptCount: 1 });
      await chooseLanguage(p.memberId, 'hi');
      expect(await begin(s, p.pingId)).toMatchObject({ kind: 'begun', locale: 'en', attemptCount: 2 });
      expect(await pingRow(p.pingId)).toMatchObject({ locale: 'en', locale_source: 'member_choice' });
    });

    it('a re-claim of a pre-6.35 row (`locale IS NULL`) writes the PARIWAR default and keeps `pariwar_default` — ⛔ the member\'s later choice', async () => {
      const s = await seedRequestClaim({ ranked: 1, selected: 1 });
      const p = s.pings[0]!;
      await setPing(
        p.pingId,
        `send_outcome = 'attempting', attempt_count = 1, claimed_at = now(), aging_since = now(), claimed_by_job = '${JOB}',
         locale_source = 'pariwar_default', link_code = 'Pre635Abcdef'`,
      );
      await chooseLanguage(p.memberId, 'en');
      expect(await begin(s, p.pingId)).toMatchObject({ kind: 'begun', locale: 'hi', attemptCount: 2 });
      expect(await pingRow(p.pingId)).toMatchObject({ locale: 'hi', locale_source: 'pariwar_default' });
    });

    it('a row finished WITHOUT a begin (`skipped_superseded`) has ⛔ locale — and the CHECK accepts it', async () => {
      const outOfWindow = CLAIM_LIFECYCLE_STATES.find((st) => !isStateInAnswerWindow(st, false))!;
      const s = await seedRequestClaim({ state: outOfWindow, ranked: 1, selected: 1 });
      expect((await begin(s, s.pings[0]!.pingId)).kind).toBe('superseded');
      expect(await pingRow(s.pings[0]!.pingId)).toMatchObject({ send_outcome: 'skipped_superseded', locale: null, locale_source: null });
    });

    it('⭐ the DB backstops: a finished row\'s `locale` is frozen; an attempting row\'s non-NULL `locale` is written once; R15 still fires', async () => {
      const s = await seedRequestClaim({ ranked: 3, selected: 3 });
      const [done, flying, fresh] = s.pings;
      const db = bindScopedDb(getTx().client);
      await begin(s, done!.pingId);
      expect(await finalisePeerMeshRequest(db, { pariwarId: s.pid, pingId: done!.pingId, jobId: JOB, outcome: 'accepted' })).toBe(true);
      await begin(s, flying!.pingId);
      const { client } = getTx();
      const attempt = async (pingId: string, set: string) => {
        await client.query('SAVEPOINT g');
        try {
          await client.query(`UPDATE claim_peer_mesh_pings SET ${set} WHERE ping_id = $1`, [pingId]);
          return null;
        } catch (err) {
          return (err as { message: string }).message;
        } finally {
          await client.query('ROLLBACK TO SAVEPOINT g');
        }
      };
      expect(await attempt(done!.pingId, `locale = 'en'`)).toMatch(/a finished send \(accepted\) is never rewritten/);
      expect(await attempt(flying!.pingId, `locale = 'en'`)).toMatch(/locale is written once/);
      expect(await attempt(flying!.pingId, `locale = NULL`)).toMatch(/locale is written once/);
      expect(await attempt(flying!.pingId, `attempt_count = 0`)).toMatch(/attempt_count never decreases/); // 0166's R15 arm, copied
      expect(await attempt(fresh!.pingId, `locale = 'fr'`)).toMatch(/claim_peer_mesh_pings_locale_check/);
      expect(await attempt(flying!.pingId, `locale_source = 'pariwar_fallback'`)).toMatch(/claim_peer_mesh_pings_locale_source_check/);
    });
  });

  describe('📌 Story 6.35 AC4 — a ping whose language\'s TEXT template is unusable WAITS (LS10 (b), I4)', () => {
    it('⭐ the begin: `waiting_template` with ⛔ write on a FRESH ping of that language; the other language\'s ping is begun', async () => {
      const s = await seedRequestClaim({ ranked: 2, selected: 2 });
      const [chooser, plain] = s.pings;
      await chooseLanguage(chooser!.memberId, 'en');
      expect(await begin(s, chooser!.pingId, { unusable: ['en'] })).toEqual({ kind: 'waiting_template', locale: 'en' });
      expect(await pingRow(chooser!.pingId)).toMatchObject({ send_outcome: null, attempt_count: 0, locale: null, locale_source: null, link_code: null });
      expect(await begin(s, plain!.pingId, { unusable: ['en'] })).toMatchObject({ kind: 'begun', locale: 'hi' });
      // I4 — ⛔ the other language: the waiting chooser is ⛔ ever begun in Hindi; a switch to a usable language sends (AC4 (x))
      await chooseLanguage(chooser!.memberId, 'hi');
      expect(await begin(s, chooser!.pingId, { unusable: ['en'] })).toMatchObject({ kind: 'begun', locale: 'hi' });
    });

    it('⭐ the begin on a RE-CLAIM: the RECORDED locale decides (a parked row stays parked, ⛔ write); a pre-6.35 NULL ⇒ the default', async () => {
      const s = await seedRequestClaim({ ranked: 2, selected: 2 });
      const [en, legacy] = s.pings;
      await chooseLanguage(en!.memberId, 'en');
      expect(await begin(s, en!.pingId)).toMatchObject({ kind: 'begun', locale: 'en' });
      await setPing(en!.pingId, `claimed_by_job = '${PEER_MESH_REQUEST_PARKED_BY}', parked_at = now()`);
      const before = await pingRow(en!.pingId);
      // the member now prefers Hindi — the RECORDED `en` still decides (I5)
      await chooseLanguage(en!.memberId, 'hi');
      expect(await begin(s, en!.pingId, { jobId: 'job-b', unusable: ['en'] })).toEqual({ kind: 'waiting_template', locale: 'en' });
      expect(await pingRow(en!.pingId)).toEqual(before);
      await setPing(
        legacy!.pingId,
        `send_outcome = 'attempting', attempt_count = 1, claimed_at = now(), aging_since = now(), claimed_by_job = '${JOB}',
         locale_source = 'pariwar_default', link_code = 'Leg635Abcdef'`,
      );
      expect(await begin(s, legacy!.pingId, { unusable: ['hi'] })).toEqual({ kind: 'waiting_template', locale: 'hi' });
      expect((await pingRow(legacy!.pingId)).attempt_count).toBe(1);
    });

    it('⭐ AC4 (vii) — the listing: a claim whose ONLY due pings wait is ⛔ listed; a mixed claim is; ⛔ passport and ⛔ choice is STILL listed (NULL-safe)', async () => {
      const { client } = getTx();
      const onlyEn = await seedRequestClaim({ ranked: 1, selected: 1 });
      await chooseLanguage(onlyEn.pings[0]!.memberId, 'en');
      await client.query('RESET ROLE');
      const mixed = await seedRequestClaim({ ranked: 2, selected: 2 });
      await chooseLanguage(mixed.pings[0]!.memberId, 'en');
      await client.query('RESET ROLE');
      const bare = await seedRequestClaim({ ranked: 1, selected: 1, noPassport: true });
      await client.query('RESET ROLE');
      const enPariwar = await seedRequestClaim({ ranked: 1, selected: 1, localeDefault: 'en' });
      await client.query('RESET ROLE');
      const allow = [onlyEn.pid, mixed.pid, bare.pid, enPariwar.pid];
      const listed = async (unusable: ('hi' | 'en')[]) =>
        (await listDuePeerMeshRequestClaims(client, { now: NOW, after: null, allow, unusableLocales: unusable })).due.map((d) => d.claimCaseId).sort();
      expect(await listed([])).toEqual([onlyEn.claimCaseId, mixed.claimCaseId, bare.claimCaseId, enPariwar.claimCaseId].sort());
      expect(await listed(['en'])).toEqual([mixed.claimCaseId, bare.claimCaseId].sort());
      expect(await listed(['hi'])).toEqual([onlyEn.claimCaseId, mixed.claimCaseId, bare.claimCaseId, enPariwar.claimCaseId].sort());
      // per Pariwar and claim (the sweep tells a held Pariwar's pings from a waiting one's): the three waiting `en` pings
      // (`bare` — ⛔ passport, a NULL locale — is ⛔ counted)
      const byPariwar = (r: { pariwarId: string }, o: { pariwarId: string }) => r.pariwarId.localeCompare(o.pariwarId);
      expect([...(await countWaitingPeerMeshRequestPings(client, { now: NOW, unusableLocales: ['en'], allow }))].sort(byPariwar)).toEqual(
        [
          { pariwarId: onlyEn.pid, claimCaseId: onlyEn.claimCaseId, locale: 'en', waiting: 1 },
          { pariwarId: mixed.pid, claimCaseId: mixed.claimCaseId, locale: 'en', waiting: 1 },
          { pariwarId: enPariwar.pid, claimCaseId: enPariwar.claimCaseId, locale: 'en', waiting: 1 },
        ].sort(byPariwar),
      );
      expect(await countWaitingPeerMeshRequestPings(client, { now: NOW, unusableLocales: [], allow })).toEqual([]);
    });

    it('⭐ AC4 (ix) — an `attempting` row past the lease whose recorded locale is unusable: PARKED in an UN-held scope, ⛔ listed in the window; listed past it', async () => {
      const { client } = getTx();
      const s = await seedRequestClaim({ ranked: 1, selected: 1 });
      const p = s.pings[0]!;
      await chooseLanguage(p.memberId, 'en');
      expect(await begin(s, p.pingId)).toMatchObject({ kind: 'begun', locale: 'en' });
      await setPing(p.pingId, `claimed_at = '${new Date(NOW.getTime() - CORRECTION_SEND_LEASE_MS - 60_000).toISOString()}'`);
      await client.query('RESET ROLE');
      const allow = [s.pid];
      const due = async (unusable: ('hi' | 'en')[]) =>
        (await listDuePeerMeshRequestClaims(client, { now: NOW, after: null, allow, unusableLocales: unusable })).due.length;
      expect(await due([])).toBe(1);
      expect(await due(['en'])).toBe(0);
      expect(await countWaitingPeerMeshRequestPings(client, { now: NOW, unusableLocales: ['en'], allow })).toEqual([
        { pariwarId: s.pid, claimCaseId: s.claimCaseId, locale: 'en', waiting: 1 },
      ]);
      expect(await parkHeldPeerMeshRequests(client, { now: NOW, allow, held: [], unusableLocales: [] })).toEqual([]);
      expect(await parkHeldPeerMeshRequests(client, { now: NOW, allow, held: [], unusableLocales: ['hi'] })).toEqual([]);
      expect(await parkHeldPeerMeshRequests(client, { now: NOW, allow, held: [], unusableLocales: ['en'] })).toEqual([{ pingId: p.pingId, claimCaseId: s.claimCaseId }]);
      // ⛔ given up while parked: the anchor is credited the parked time
      expect(await expireExhaustedPeerMeshRequests(client, { cutoff: peerMeshRequestReclaimCutoff(NOW), now: NOW, allow, scopes: [s.pid] })).toEqual([]);
      // past the window such a row is listed again — ① then finishes it `error` / `recheck:claim_decided` (the held-park precedent)
      const decided = await seedRequestClaim({ state: 'denied', ranked: 1, selected: 1 });
      await client.query('RESET ROLE');
      await client.query(
        `UPDATE claim_peer_mesh_pings SET send_outcome = 'attempting', attempt_count = 1, claimed_at = $2, claimed_by_job = 'dead-job',
           aging_since = now(), locale = 'en', locale_source = 'member_choice', link_code = 'Dec635Abcdef' WHERE ping_id = $1`,
        [decided.pings[0]!.pingId, new Date(NOW.getTime() - CORRECTION_SEND_LEASE_MS - 60_000)],
      );
      const pastWindow = await listDuePeerMeshRequestClaims(client, { now: NOW, after: null, allow: [decided.pid], unusableLocales: ['en'] });
      expect(pastWindow.due.map((d) => d.claimCaseId)).toEqual([decided.claimCaseId]);
    });
  });

  describe('the reads', () => {
    it('the due pings: ⛔ begun and `attempting`, in ping_id order — ⛔ finished ones', async () => {
      const s = await seedRequestClaim();
      const db = bindScopedDb(getTx().client);
      await begin(s, s.pings[0]!.pingId);
      await begin(s, s.pings[1]!.pingId);
      await finalisePeerMeshRequest(db, { pariwarId: s.pid, pingId: s.pings[1]!.pingId, jobId: JOB, outcome: 'accepted' });
      const due = await listDuePeerMeshRequestPings(db, { pariwarId: s.pid, claimCaseId: s.claimCaseId });
      const expected = s.pings.filter((_, i) => i !== 1).map((p) => p.pingId).sort();
      expect(due).toEqual(expected);
    });

    // 📌 Story 6.35 (2026-10-23, AC3) — the ONE read is per RECIPIENT now: `{ pariwarId, memberId }` (was `pariwarId`).
    it('R10 / 6.35 LS8 — ⛔ choice ⇒ the Pariwar\'s default; a choice ⇒ `member_choice`; ⛔ passport throws; the Pariwar-only read', async () => {
      const s = await seedRequestClaim({ ranked: 2, selected: 2 });
      const db = bindScopedDb(getTx().client);
      const [a, b] = s.pings;
      expect(await resolvePeerRequestLocale(db, { pariwarId: s.pid, memberId: a!.memberId })).toEqual({
        locale: 'hi',
        source: 'pariwar_default',
        pariwarDefaultLocale: 'hi',
      });
      await chooseLanguage(b!.memberId, 'en');
      expect(await resolvePeerRequestLocale(db, { pariwarId: s.pid, memberId: b!.memberId })).toEqual({
        locale: 'en',
        source: 'member_choice',
        pariwarDefaultLocale: 'hi',
      });
      // a member who CHOSE the default is still `member_choice` (the reminder's `-385` rule tells them apart by the default)
      await chooseLanguage(a!.memberId, 'hi');
      expect((await resolvePeerRequestLocale(db, { pariwarId: s.pid, memberId: a!.memberId })).source).toBe('member_choice');
      expect(await resolvePariwarDefaultLocale(db, s.pid)).toBe('hi');
      await expect(resolvePeerRequestLocale(db, { pariwarId: toPariwarId(randomUUID()), memberId: a!.memberId })).rejects.toBeInstanceOf(
        PeerRequestLocaleMissingError,
      );
      await expect(resolvePariwarDefaultLocale(db, toPariwarId(randomUUID()))).rejects.toBeInstanceOf(PeerRequestLocaleMissingError);
    });

    it('⭐ 6.35 AC3 / T13 — a member of ANOTHER Pariwar (an `en` choice there) THROWS — on the superuser handle, where RLS masks ⛔ missing predicate', async () => {
      const { tx, client } = getTx();
      const s = await seedRequestClaim({ ranked: 1, selected: 1 });
      const other = toPariwarId(randomUUID());
      const stranger = toMemberId(randomUUID());
      await client.query('RESET ROLE'); // the jobs pool is BYPASSRLS — the query's OWN predicates are the only scope (F23)
      await seedPassport(tx, other, { localeDefault: 'en' });
      await insertMember(client, other, stranger);
      await client.query(`UPDATE members SET preferred_locale = 'en', preferred_locale_set_at = now() WHERE member_id = $1`, [stranger]);
      const db = bindScopedDb(client);
      await expect(resolvePeerRequestLocale(db, { pariwarId: s.pid, memberId: stranger })).rejects.toThrow(/not a member of Pariwar/);
      expect(await resolvePeerRequestLocale(db, { pariwarId: other, memberId: stranger })).toMatchObject({ locale: 'en', source: 'member_choice' });
    });

    it('R14 — the by-link answer: the session member\'s TEXTED ping only; everything else ⇒ null', async () => {
      const s = await seedRequestClaim();
      const db = bindScopedDb(getTx().client);
      const [a, b] = s.pings;
      const ra = await begin(s, a!.pingId);
      const rb = await begin(s, b!.pingId);
      if (ra.kind !== 'begun' || rb.kind !== 'begun') throw new Error('not begun');
      expect(await resolvePeerRequestByLinkCode(db, { pariwarId: s.pid, memberId: a!.memberId, code: ra.linkCode })).toBeNull(); // ⛔ texted yet
      await finalisePeerMeshRequest(db, { pariwarId: s.pid, pingId: a!.pingId, jobId: JOB, outcome: 'accepted' });
      expect(await resolvePeerRequestByLinkCode(db, { pariwarId: s.pid, memberId: a!.memberId, code: ra.linkCode })).toBe(a!.pingId);
      expect(await resolvePeerRequestByLinkCode(db, { pariwarId: s.pid, memberId: b!.memberId, code: ra.linkCode })).toBeNull(); // another member
      expect(await resolvePeerRequestByLinkCode(db, { pariwarId: toPariwarId(randomUUID()), memberId: a!.memberId, code: ra.linkCode })).toBeNull();
      expect(await resolvePeerRequestByLinkCode(db, { pariwarId: s.pid, memberId: a!.memberId, code: 'short' })).toBeNull();
      expect(await resolvePeerRequestByLinkCode(db, { pariwarId: s.pid, memberId: a!.memberId, code: `${ra.linkCode.slice(0, 11)}-` })).toBeNull();
    });

    it('R16 / RN2 / RN3 — the sweep: due claims (window-filtered), stalled scopes, the park, the give-up over un-held scopes', async () => {
      const { client } = getTx();
      const inWindow = await seedRequestClaim();
      await client.query('RESET ROLE');
      const decided = await seedRequestClaim({ state: 'denied' });
      await client.query('RESET ROLE');
      const stalled = await seedRequestClaim({ state: 'denied' });
      const sp = stalled.pings[0]!;
      await client.query('RESET ROLE');
      await client.query(
        `UPDATE claim_peer_mesh_pings SET send_outcome = 'attempting', attempt_count = 1, claimed_at = $2, claimed_by_job = 'dead-job',
           aging_since = '2026-01-01T00:00:00Z' WHERE ping_id = $1`,
        [sp.pingId, new Date(NOW.getTime() - CORRECTION_SEND_LEASE_MS - 60_000)],
      );
      // ⚠ the superuser stands in for the BYPASSRLS pool.
      const allow = [inWindow.pid, decided.pid, stalled.pid];
      const page = await listDuePeerMeshRequestClaims(client, { now: NOW, after: null, allow });
      expect(page.due.map((d) => d.claimCaseId).sort()).toEqual([inWindow.claimCaseId, stalled.claimCaseId].sort());
      expect(await listStalledPeerMeshRequestScopes(client, { now: NOW, allow })).toEqual([stalled.pid]);
      // held ⇒ parked (⛔ given up while held)
      expect(await parkHeldPeerMeshRequests(client, { now: NOW, allow, held: [stalled.pid] })).toEqual([{ pingId: sp.pingId, claimCaseId: stalled.claimCaseId }]);
      expect(await parkHeldPeerMeshRequests(client, { now: NOW, allow, held: [stalled.pid] })).toEqual([]); // ⛔ twice
      expect(await expireExhaustedPeerMeshRequests(client, { cutoff: peerMeshRequestReclaimCutoff(NOW), now: NOW, allow, scopes: [] })).toEqual([]);
      // un-held: a parked row is judged by aging_since + its parked time — parked just now ⇒ still given up (anchor in January)
      const gone = await expireExhaustedPeerMeshRequests(client, { cutoff: peerMeshRequestReclaimCutoff(NOW), now: NOW, allow, scopes: [stalled.pid] });
      expect(gone).toEqual([{ pingId: sp.pingId, claimCaseId: stalled.claimCaseId }]);
      expect(await pingRow(sp.pingId)).toMatchObject({ send_outcome: 'error', detail: 'exhausted:attempting_three_days' });
    });
  });
});
