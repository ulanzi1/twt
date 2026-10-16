// Peer-mesh selection + ping + AR-61 window fallback — live-DB integration (Story 6.6, Task 7; Story 6.36, Task 4 — AC12).
//
// Drives runClaimPeerMeshSelect / runClaimPeerMeshWindow / claim.recordPeerMeshResponse against
// real Postgres (:5433). The core cases use a FAKE boss (records send() calls — no real queue);
// ONE case uses a REAL pg-boss to prove the window job actually FIRES after the configured delay
// (not just that it enqueues). Asserts membership, never DROP SCHEMA (memory [[project_live_db_test_gotchas]]).
//
// ⭐ Story 6.36 (AC12): the job's default is now `workplace_named_v1` — every select leg seeds a workplace list, the
// deceased's posting there, colleagues (and/or the people the deceased named), each with an identity row (SW23). The
// 6.6 district legs moved to the pure engine + replay with `district_cohort_v1` PINNED (⛔ through the job).
//   · select + ping: 5 of 7 colleagues, the ranking (7), `source = 'workplace'` on the selection AND every ping;
//   · fewer than five / named / nobody (AC7, AC8): 2 colleagues ⇒ 2; ⛔ colleague + 2 named ⇒ 2 `named_by_member`;
//     neither ⇒ `skipped` + `claim.peer_mesh_none_to_ask` → verification_in_progress + a shepherd; a re-run ⛔ a 2nd event;
//   · the anchor (AC4): a certificate row present still cuts at the filing day; a second claim for the same death cuts
//     at the death's FIRST filing (RF1, `2026-10-16-339` option C), unless an innocence finding lifts the first claim;
//   · the state guard: a select job while `intake_converged` ⇒ ⛔ selection, ⛔ window; after `documents_received` it selects;
//   · the race (two connections), each branch: B holds the job's own transaction up to its edge; A waits on the claim
//     lock; COMMIT B ⇒ exactly ONE edge event;
//   · idempotency, replay from the persisted row alone (and a legacy `district_cohort_v1` row), response, fallback,
//     RLS, the claimant excluded, the DB CHECK.

import { randomUUID } from 'node:crypto';

import { bindScopedDb, claim, createDb, ids, schema, withPariwarScope, type CreatedDb } from '@twt/domain';
import {
  QUEUE_NAMES,
  createQueueClient,
  stopQueueClient,
  type JobEnvelope,
  type QueueClient,
} from '@twt/queue';
import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  DEFAULT_PEER_MESH_WINDOW_SECONDS,
  extendPeerMeshWindowAndReschedule,
  registerClaimPeerMeshWorkers,
  runClaimPeerMeshSelect,
  runClaimPeerMeshWindow,
  type ClaimPeerMeshDeps,
  type ClaimPeerMeshSelectPayload,
  type ClaimPeerMeshWindowPayload,
} from '../src/claim-peer-mesh.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);
const NOW = new Date('2026-07-10T00:00:00Z');
const DAY = 24 * 60 * 60 * 1000;
/** Every seeded "long ago" row is recorded here — well before any filing day the projector stamps (today). */
const LONG_AGO = '2025-01-01T00:00:00Z';

/** A fake boss that records send() calls instead of enqueuing (fast, deterministic core tests). */
function fakeBoss(): { boss: QueueClient; sends: { name: string; data: unknown; options: unknown }[] } {
  const sends: { name: string; data: unknown; options: unknown }[] = [];
  const boss = {
    async send(name: string, data: unknown, options: unknown) {
      sends.push({ name, data, options });
      return 'fake-job-id';
    },
  } as unknown as QueueClient;
  return { boss, sends };
}

interface Seed {
  pariwarId: string;
  deceasedMemberId: string;
  claimCaseId: string;
  /** The deceased's workplace. */
  workplaceId: string;
  /** Every OTHER member seeded (colleagues, then named people). */
  candidateIds: string[];
  colleagueIds: string[];
  namedIds: string[];
}

/** Insert one member (superuser) with an identity row (SW23 requires one). */
async function insertMember(client: pg.PoolClient, pariwarId: string, memberId: string): Promise<void> {
  await client.query(
    `INSERT INTO members (member_id, pariwar_id, state, state_event_version, created_at) VALUES ($1,$2,'active',1,$3)`,
    [memberId, pariwarId, LONG_AGO],
  );
  await client.query(
    `INSERT INTO member_identities (member_id, pariwar_id, mobile_ciphertext, mobile_blind_index) VALUES ($1,$2,'enc:v1:x',$3)`,
    [memberId, pariwarId, `idx-${randomUUID()}`],
  );
}

/** A workplace posting recorded at `at`. */
async function insertPosting(client: pg.PoolClient, pariwarId: string, memberId: string, workplaceId: string, at: string | Date): Promise<void> {
  await client.query(
    `INSERT INTO member_postings (member_id, pariwar_id, district, workplace_id, started_on, created_at) VALUES ($1,$2,'Patna',$3,'2015-06-01',$4)`,
    [memberId, pariwarId, workplaceId, at],
  );
}

/** Advance a claim through the real projector: intake_initiated → intake_converged (→ documents_received). */
async function projectTo(
  client: pg.PoolClient,
  s: { pariwarId: string; deceasedMemberId: string; claimCaseId: string; claimantActorId: string | null },
  target: 'intake_converged' | 'documents_pending',
): Promise<void> {
  const common = {
    claimCaseId: ids.claimId(s.claimCaseId),
    pariwarId: ids.pariwarId(s.pariwarId),
    deceasedMemberId: ids.memberId(s.deceasedMemberId),
    intakeChannels: ['member_app'] as const,
    claimantActorId: s.claimantActorId,
    actorId: null,
  };
  await claim.projectClaimState(client, {
    ...common,
    eventType: 'claim.intake_initiated',
    payload: {
      from_state: null,
      to_state: 'intake_pending',
      trigger: 'seed',
      actor: 'system',
      deceased_member_id: s.deceasedMemberId,
      intake_channel: 'member_app',
      claimant_actor_id: s.claimantActorId,
    },
  });
  await claim.projectClaimState(client, {
    ...common,
    eventType: 'claim.intake_converged',
    payload: { from_state: 'intake_pending', to_state: 'intake_converged', trigger: 'seed', actor: 'system' },
  });
  if (target === 'documents_pending') await documentsReceived(client, s);
}

async function documentsReceived(
  client: pg.PoolClient,
  s: { pariwarId: string; deceasedMemberId: string; claimCaseId: string; claimantActorId: string | null },
): Promise<void> {
  await claim.projectClaimState(client, {
    claimCaseId: ids.claimId(s.claimCaseId),
    pariwarId: ids.pariwarId(s.pariwarId),
    deceasedMemberId: ids.memberId(s.deceasedMemberId),
    intakeChannels: ['member_app'],
    claimantActorId: s.claimantActorId,
    actorId: null,
    eventType: 'claim.documents_received',
    payload: { from_state: 'intake_converged', to_state: 'documents_pending', trigger: 'seed', actor: 'system' },
  });
}

describe.skipIf(!hasDatabase)('claim peer-mesh — live DB (:5433)', () => {
  let pool: pg.Pool;
  let created: CreatedDb;

  beforeAll(() => {
    created = createDb(DATABASE_URL!, { max: 6, ssl: false });
    pool = created.pool;
  });
  afterAll(() => pool.end());

  function deps(overrides: Partial<ClaimPeerMeshDeps> = {}): ClaimPeerMeshDeps {
    return { pool, now: () => NOW, onAlarm: () => undefined, ...overrides };
  }

  /** deps() clock advanced past the default response window — for firing the WINDOW job in
   *  tests as if it were the real delayed pg-boss job firing at its actual deadline (review
   *  fix: runClaimPeerMeshWindow now self-defers when `now` is still before the persisted
   *  `response_window_expires_at`, so tests that mean to resolve the outcome must simulate
   *  time having actually passed, not reuse the SAME `now` as selection time). */
  function windowDeps(overrides: Partial<ClaimPeerMeshDeps> = {}): ClaimPeerMeshDeps {
    const later = new Date(NOW.getTime() + DEFAULT_PEER_MESH_WINDOW_SECONDS * 1000 + 1000);
    return { pool, now: () => later, onAlarm: () => undefined, ...overrides };
  }

  /**
   * Seed (committed) a Pariwar with ONE workplace, a deceased posted there long ago, `colleagues` members posted there
   * long ago, `named` members the deceased named (accepted long ago), and a claim advanced to `target` (default
   * `documents_pending`) by the real projector — so its `created_at` (the filing day) is TODAY.
   * `claimantIndex` (a colleague's index): that colleague filed the claim and must never be selected.
   */
  async function seedClaim(
    o: { colleagues?: number; named?: number; claimantIndex?: number; target?: 'intake_converged' | 'documents_pending'; deceasedPostedAt?: string | Date } = {},
  ): Promise<Seed> {
    const pariwarId = randomUUID();
    const deceasedMemberId = randomUUID();
    const claimCaseId = randomUUID();
    const workplaceId = randomUUID();
    const batchId = randomUUID();
    const colleagueIds = Array.from({ length: o.colleagues ?? 7 }, () => randomUUID());
    const namedIds = Array.from({ length: o.named ?? 0 }, () => randomUUID());
    const claimantActorId = o.claimantIndex === undefined ? null : colleagueIds[o.claimantIndex]!;

    await withPariwarScope(pool, pariwarId, async (_db, client) => {
      await client.query(
        `INSERT INTO workplace_import_batches (batch_id, pariwar_id, source_name, source_url, retrieved_on, licence, attribution, state_code)
         VALUES ($1, $2, 'fixture', 'https://example.test/udise', '2026-10-14', 'ODC-BY-1.0', 'fixture attribution', '10')`,
        [batchId, pariwarId],
      );
      await client.query(`INSERT INTO workplace_districts (pariwar_id, district, status, source_batch_id) VALUES ($1, 'Patna', 'listed', $2)`, [
        pariwarId,
        batchId,
      ]);
      await client.query(
        `INSERT INTO workplaces (workplace_id, pariwar_id, kind, name, district, udise_school_code, block_code, source, import_batch_id, status)
         VALUES ($1, $2, 'school', 'Fixture School', 'Patna', $3, '102801', 'import', $4, 'listed')`,
        [workplaceId, pariwarId, String(10280100000 + Math.floor(Math.random() * 99999)), batchId],
      );
      await insertMember(client, pariwarId, deceasedMemberId);
      await insertPosting(client, pariwarId, deceasedMemberId, workplaceId, o.deceasedPostedAt ?? LONG_AGO);
      for (const c of colleagueIds) {
        await insertMember(client, pariwarId, c);
        await insertPosting(client, pariwarId, c, workplaceId, LONG_AGO);
      }
      for (const n of namedIds) {
        await insertMember(client, pariwarId, n);
        await client.query(
          `INSERT INTO member_known_people (pariwar_id, namer_member_id, named_member_id, found_by, state, asked_at, responded_at)
           VALUES ($1, $2, $3, 'contacts', 'accepted', '2025-01-01T00:00:00Z', '2025-01-02T00:00:00Z')`,
          [pariwarId, deceasedMemberId, n],
        );
      }
      await projectTo(client, { pariwarId, deceasedMemberId, claimCaseId, claimantActorId }, o.target ?? 'documents_pending');
    });

    return { pariwarId, deceasedMemberId, claimCaseId, workplaceId, candidateIds: [...colleagueIds, ...namedIds], colleagueIds, namedIds };
  }

  function selectEnvelope(seed: {
    pariwarId: string;
    deceasedMemberId: string;
    claimCaseId: string;
  }): JobEnvelope<ClaimPeerMeshSelectPayload> {
    return {
      requestId: randomUUID(),
      pariwarId: seed.pariwarId,
      actorId: null,
      traceId: randomUUID(),
      payload: { claimCaseId: seed.claimCaseId, deceasedMemberId: seed.deceasedMemberId },
    };
  }

  async function cleanup(seed: { pariwarId?: string; claimCaseId: string; deceasedMemberId: string; candidateIds: string[] }) {
    // claims delete cascades → selections → pings. members delete cascades → postings, identities, links.
    await pool.query(`DELETE FROM claims WHERE claim_case_id = $1 OR deceased_member_id = $2`, [seed.claimCaseId, seed.deceasedMemberId]);
    await pool.query(`DELETE FROM members WHERE member_id = ANY($1::uuid[])`, [
      [seed.deceasedMemberId, ...seed.candidateIds],
    ]);
    if (seed.pariwarId) {
      await pool.query(`DELETE FROM workplaces WHERE pariwar_id = $1`, [seed.pariwarId]);
      await pool.query(`DELETE FROM workplace_districts WHERE pariwar_id = $1`, [seed.pariwarId]);
      await pool.query(`DELETE FROM workplace_import_batches WHERE pariwar_id = $1`, [seed.pariwarId]);
    }
  }

  async function claimState(claimCaseId: string): Promise<string> {
    const r = await pool.query(`SELECT current_state FROM claims WHERE claim_case_id = $1`, [claimCaseId]);
    return r.rows[0]?.current_state;
  }
  async function eventCount(claimCaseId: string, eventType: string): Promise<number> {
    const r = await pool.query(
      `SELECT count(*)::int AS n FROM events_log WHERE stream_id = $1 AND event_type = $2`,
      [claimCaseId, eventType],
    );
    return r.rows[0].n;
  }
  const selectionOf = (seed: Seed) =>
    withPariwarScope(pool, seed.pariwarId, (db) =>
      claim.getPeerMeshSelectionByClaim(db, ids.pariwarId(seed.pariwarId), ids.claimId(seed.claimCaseId)),
    );
  const pingsOf = (seed: Seed, selectionId: string) =>
    withPariwarScope(pool, seed.pariwarId, (db) =>
      claim.getPeerMeshPingIntentsBySelection(db, ids.pariwarId(seed.pariwarId), ids.peerMeshSelectionId(selectionId)),
    );

  it('select + ping: 5 of 7 colleagues selected, the ranking stored, source on the selection AND every ping, state → verification_in_progress', async () => {
    const seed = await seedClaim();
    const { boss, sends } = fakeBoss();
    try {
      const result = await runClaimPeerMeshSelect(boss, deps(), selectEnvelope(seed));
      expect(result.created).toBe(true);
      expect(result.selectedCount).toBe(5);

      const selection = await selectionOf(seed);
      expect(selection).toBeDefined();
      expect(selection!.selectedMemberIds).toHaveLength(5);
      expect(selection!.metricId).toBe('workplace_named_v1');
      expect(selection!.metricVersion).toBe(1);
      // The snapshot captured the 7 colleagues (the audit-replay source); the ranking holds all 7, the five its prefix.
      expect(selection!.candidateSnapshot).toHaveLength(7);
      expect(selection!.rankedMemberIds).toHaveLength(7);
      expect(selection!.rankedMemberIds!.slice(0, 5)).toEqual(selection!.selectedMemberIds);
      expect(selection!).toMatchObject({
        source: 'workplace',
        previousWorkplaceCounted: false,
        recentChangeBeforeFiling: false,
        deceasedWorkplaceId: seed.workplaceId,
        deceasedPreviousWorkplaceId: null,
        anchorClaimCaseId: seed.claimCaseId, // ONE claim ⇒ it anchors itself (`-340` call 1)
        outcome: 'pending',
      });

      const pings = await pingsOf(seed, selection!.selectionId);
      expect(pings).toHaveLength(5);
      // Every ping targets a selected member, carries the selection's source (AC9), and the versioned copy-template key.
      const selectedSet = new Set(selection!.selectedMemberIds);
      for (const ping of pings) {
        expect(selectedSet.has(ping.memberId)).toBe(true);
        expect(ping.source).toBe('workplace');
        expect(ping.messageKey).toBe('peer_mesh_verification_request_v1');
      }

      expect(await claimState(seed.claimCaseId)).toBe('verification_in_progress');
      expect(await eventCount(seed.claimCaseId, 'claim.peer_mesh_pinged')).toBe(1);
      expect(await eventCount(seed.claimCaseId, 'claim.peer_mesh_none_to_ask')).toBe(0);

      // The window job was enqueued delayed (startAfter = window; singletonKey = claim_case_id).
      expect(sends).toHaveLength(1);
      expect(sends[0]!.name).toBe(QUEUE_NAMES.CLAIM_PEER_MESH_WINDOW);
      expect(sends[0]!.options).toMatchObject({
        startAfter: DEFAULT_PEER_MESH_WINDOW_SECONDS,
        singletonKey: seed.claimCaseId,
      });
    } finally {
      await cleanup(seed);
    }
  });

  it('idempotency: running select twice → ONE selection, exactly 5 ping rows (not 10), ONE pinged event', async () => {
    const seed = await seedClaim();
    const { boss } = fakeBoss();
    try {
      await runClaimPeerMeshSelect(boss, deps(), selectEnvelope(seed));
      const second = await runClaimPeerMeshSelect(boss, deps(), selectEnvelope(seed));
      expect(second.created).toBe(false);

      const selRows = await pool.query(
        `SELECT count(*)::int AS n FROM claim_peer_mesh_selections WHERE claim_case_id = $1`,
        [seed.claimCaseId],
      );
      expect(selRows.rows[0].n).toBe(1);
      const pingRows = await pool.query(
        `SELECT count(*)::int AS n FROM claim_peer_mesh_pings p
           JOIN claim_peer_mesh_selections s ON s.selection_id = p.selection_id
          WHERE s.claim_case_id = $1`,
        [seed.claimCaseId],
      );
      expect(pingRows.rows[0].n).toBe(5);
      expect(await eventCount(seed.claimCaseId, 'claim.peer_mesh_pinged')).toBe(1);
      expect(await claimState(seed.claimCaseId)).toBe('verification_in_progress');
    } finally {
      await cleanup(seed);
    }
  });

  it('replay (I7): the PERSISTED row alone re-runs to a byte-identical ranking, selection and source — a LIVE change after selection moves nothing', async () => {
    const seed = await seedClaim();
    const { boss } = fakeBoss();
    try {
      await runClaimPeerMeshSelect(boss, deps(), selectEnvelope(seed));
      const original = await selectionOf(seed);
      // A live change: three colleagues leave for elsewhere, the deceased gets a new posting.
      await withPariwarScope(pool, seed.pariwarId, async (_db, client) => {
        for (const c of seed.colleagueIds.slice(0, 3)) {
          await client.query(`INSERT INTO member_postings (member_id, pariwar_id, district, is_retirement, started_on) VALUES ($1,$2,'Patna',true,'2026-01-01')`, [c, seed.pariwarId]);
        }
      });
      const replay = claim.replayPeerMeshSelection(original!);
      expect(replay.metricId).toBe('workplace_named_v1');
      expect(JSON.stringify(replay.selectedMemberIds)).toBe(JSON.stringify(original!.selectedMemberIds));
      expect(JSON.stringify(replay.rankedMemberIds)).toBe(JSON.stringify(original!.rankedMemberIds));
      expect(replay.source).toBe(original!.source);
    } finally {
      await cleanup(seed);
    }
  });

  it('replay (6.6 legacy): a stored district_cohort_v1 selection still replays through the old comparator — the id PINNED, ⛔ through the job', async () => {
    const seed = await seedClaim({ colleagues: 0 });
    try {
      const district = [
        { memberId: ids.memberId(randomUUID()), district: 'Pune', createdAt: new Date('2020-02-01T00:00:00Z') },
        { memberId: ids.memberId(randomUUID()), district: 'Pune', createdAt: new Date('2020-06-01T00:00:00Z') },
        { memberId: ids.memberId(randomUUID()), district: 'Mumbai', createdAt: new Date('2020-01-05T00:00:00Z') },
        { memberId: ids.memberId(randomUUID()), district: null, createdAt: new Date('2020-01-02T00:00:00Z') },
      ];
      const deceased = { district: 'Pune', createdAt: new Date('2020-01-01T00:00:00Z') };
      const metric = claim.resolvePeerMeshMetric('district_cohort_v1');
      const first = claim.runPeerMeshMetric({
        metric,
        claimCaseId: ids.claimId(seed.claimCaseId),
        anchorClaimCaseId: ids.claimId(seed.claimCaseId), // unread by the ranked metric
        deceasedMemberId: ids.memberId(seed.deceasedMemberId),
        deceased,
        candidates: district,
      });
      const row = await withPariwarScope(pool, seed.pariwarId, (db) =>
        claim.persistPeerMeshSelection(db, {
          claimCaseId: ids.claimId(seed.claimCaseId),
          pariwarId: ids.pariwarId(seed.pariwarId),
          deceasedMemberId: ids.memberId(seed.deceasedMemberId),
          deceased,
          metricId: first.metricId,
          metricVersion: first.metricVersion,
          selectedMemberIds: first.selectedMemberIds,
          candidates: district,
          responseWindowExpiresAt: new Date(NOW.getTime() + DAY),
        }),
      );
      expect(row).toMatchObject({ metricId: 'district_cohort_v1', source: null, rankedMemberIds: null });
      expect(row.selectedMemberIds.slice(0, 2)).toEqual([district[0]!.memberId, district[1]!.memberId]);
      expect(claim.replayPeerMeshSelection(row).selectedMemberIds).toEqual(row.selectedMemberIds);
    } finally {
      await cleanup(seed);
    }
  });


  it('fewer than five (AC7): two colleagues ⇒ two selected, source workplace — ⛔ fill-up from the named people', async () => {
    const seed = await seedClaim({ colleagues: 2, named: 2 });
    const { boss } = fakeBoss();
    try {
      const result = await runClaimPeerMeshSelect(boss, deps(), selectEnvelope(seed));
      expect(result.selectedCount).toBe(2);
      const selection = await selectionOf(seed);
      expect(selection!.source).toBe('workplace');
      expect([...selection!.selectedMemberIds].sort()).toEqual([...seed.colleagueIds].sort());
      // the named people are in the snapshot (replay), ⛔ in the ranking
      expect(selection!.candidateSnapshot).toHaveLength(4);
      expect(selection!.rankedMemberIds).toHaveLength(2);
    } finally {
      await cleanup(seed);
    }
  });

  it('named (AC7): ⛔ colleagues + two named ⇒ two selected, source named_by_member, on every ping', async () => {
    const seed = await seedClaim({ colleagues: 0, named: 2 });
    const { boss, sends } = fakeBoss();
    try {
      const result = await runClaimPeerMeshSelect(boss, deps(), selectEnvelope(seed));
      expect(result.selectedCount).toBe(2);
      const selection = await selectionOf(seed);
      expect(selection!.source).toBe('named_by_member');
      expect([...selection!.selectedMemberIds].sort()).toEqual([...seed.namedIds].sort());
      const pings = await pingsOf(seed, selection!.selectionId);
      expect(pings.map((p) => p.source)).toEqual(['named_by_member', 'named_by_member']);
      expect(await claimState(seed.claimCaseId)).toBe('verification_in_progress');
      expect(sends.map((s) => s.name)).toEqual([QUEUE_NAMES.CLAIM_PEER_MESH_WINDOW]);
    } finally {
      await cleanup(seed);
    }
  });

  it('nobody to ask (AC7, AC8): skipped + claim.peer_mesh_none_to_ask → verification_in_progress, a shepherd, ⛔ window, ⛔ ping; a re-run ⛔ a second event', async () => {
    const seed = await seedClaim({ colleagues: 0, named: 0 });
    const { boss, sends } = fakeBoss();
    const shepherds: string[] = [];
    const withShepherd = deps({
      enqueueShepherdAssign: async (_env, claimCaseId) => {
        shepherds.push(claimCaseId);
      },
    });
    try {
      const result = await runClaimPeerMeshSelect(boss, withShepherd, selectEnvelope(seed));
      expect(result.created).toBe(true);
      expect(result.selectedCount).toBe(0);

      const selection = await selectionOf(seed);
      expect(selection!).toMatchObject({
        outcome: 'skipped',
        skipReason: claim.PEER_MESH_SKIP_REASON_NO_WORKPLACE_COLLEAGUE_OR_NAMED_PERSON,
        selectedMemberIds: [],
        rankedMemberIds: [],
        source: null,
        deceasedWorkplaceId: seed.workplaceId,
      });
      expect(claim.PEER_MESH_SKIP_REASON_NO_WORKPLACE_COLLEAGUE_OR_NAMED_PERSON).toBe('no_workplace_colleague_or_named_person');

      expect(await claimState(seed.claimCaseId)).toBe('verification_in_progress');
      expect(await eventCount(seed.claimCaseId, 'claim.peer_mesh_none_to_ask')).toBe(1);
      expect(await eventCount(seed.claimCaseId, 'claim.peer_mesh_pinged')).toBe(0);
      const ev = await pool.query(`SELECT payload FROM events_log WHERE stream_id = $1 AND event_type = 'claim.peer_mesh_none_to_ask'`, [seed.claimCaseId]);
      expect(ev.rows[0].payload).toEqual({
        from_state: 'documents_pending',
        to_state: 'verification_in_progress',
        trigger: 'peer_mesh_none_to_ask',
        actor: 'system',
        metric_id: 'workplace_named_v1',
        metric_version: 1,
      });
      expect(await pingsOf(seed, selection!.selectionId)).toHaveLength(0);
      // ⛔ window job (nothing to wait for); a shepherd IS assigned.
      expect(sends).toHaveLength(0);
      expect(shepherds).toEqual([seed.claimCaseId]);

      // the claim can now be inspected (the review window includes it), and the certificate reminder's day 0 reads the event
      expect((claim.CLAIM_REVIEW_WINDOW_STATES as readonly string[]).includes('verification_in_progress')).toBe(true);
      const entered = await withPariwarScope(pool, seed.pariwarId, (db) =>
        claim.readCertificateWindowEnteredAt(db, ids.pariwarId(seed.pariwarId), ids.claimId(seed.claimCaseId)),
      );
      const occurred = await pool.query(`SELECT occurred_at FROM events_log WHERE stream_id = $1 AND event_type = 'claim.peer_mesh_none_to_ask'`, [seed.claimCaseId]);
      expect(entered?.getTime()).toBe((occurred.rows[0].occurred_at as Date).getTime());

      // a re-run is a no-op — ⛔ a second event (the shepherd self-heal fires again, harmlessly)
      const again = await runClaimPeerMeshSelect(boss, withShepherd, selectEnvelope(seed));
      expect(again.created).toBe(false);
      expect(await eventCount(seed.claimCaseId, 'claim.peer_mesh_none_to_ask')).toBe(1);
      expect(sends).toHaveLength(0);
    } finally {
      await cleanup(seed);
    }
  });

  it('the state guard (AC8): a select job while the claim is intake_converged ⇒ ⛔ selection, ⛔ window, ⛔ shepherd; after documents_received it selects normally', async () => {
    const seed = await seedClaim({ colleagues: 3, target: 'intake_converged' });
    const { boss, sends } = fakeBoss();
    const shepherds: string[] = [];
    const withShepherd = deps({ enqueueShepherdAssign: async (_e, c) => void shepherds.push(c) });
    try {
      const early = await runClaimPeerMeshSelect(boss, withShepherd, selectEnvelope(seed));
      expect(early).toMatchObject({ created: false, selectedCount: 0 });
      expect(await selectionOf(seed)).toBeUndefined();
      expect(sends).toHaveLength(0);
      expect(shepherds).toHaveLength(0);
      expect(await claimState(seed.claimCaseId)).toBe('intake_converged');

      await withPariwarScope(pool, seed.pariwarId, (_db, client) =>
        documentsReceived(client, { ...seed, claimantActorId: null }),
      );
      const later = await runClaimPeerMeshSelect(boss, withShepherd, selectEnvelope(seed));
      expect(later).toMatchObject({ created: true, selectedCount: 3 });
      expect(await claimState(seed.claimCaseId)).toBe('verification_in_progress');
      expect(sends.map((s) => s.name)).toEqual([QUEUE_NAMES.CLAIM_PEER_MESH_WINDOW]);
      expect(shepherds).toEqual([seed.claimCaseId]);
    } finally {
      await cleanup(seed);
    }
  });

  it('a payload whose deceased is ⛔ the claim\'s own is refused right after the claim lock — before the probe or any snapshot read (it would choose the anchor and the exclusions — `-340`)', async () => {
    const seed = await seedClaim({ colleagues: 2 });
    const { boss, sends } = fakeBoss();
    try {
      await expect(
        runClaimPeerMeshSelect(boss, deps(), selectEnvelope({ ...seed, deceasedMemberId: seed.colleagueIds[0]! })),
      ).rejects.toThrow(/does not match claim/);
      expect(await selectionOf(seed)).toBeUndefined();
      expect(sends).toHaveLength(0);
      expect(await claimState(seed.claimCaseId)).toBe('documents_pending');
    } finally {
      await cleanup(seed);
    }
  });

  it('the anchor (AC4): a certificate row present still cuts at the FILING day — a transfer recorded 10 days before the filing counts', async () => {
    // The deceased moved to the school 10 days ago (recorded); a certificate was uploaded 20 days ago. The job reads ⛔
    // certificate (in v1 its OCR'd date is always empty — SF17), so the cut is today's start: the transfer counts.
    const seed = await seedClaim({ colleagues: 2, deceasedPostedAt: new Date(Date.now() - 10 * DAY) });
    const { boss } = fakeBoss();
    try {
      await withPariwarScope(pool, seed.pariwarId, async (db) => {
        const claimDocumentId = randomUUID();
        const uploadId = randomUUID();
        const key = `pariwar/${seed.pariwarId}/claim/${seed.claimCaseId}/death_certificate/${claimDocumentId}/${uploadId}`;
        await db.insert(schema.claimDocuments).values({
          claimDocumentId: claimDocumentId as never,
          claimCaseId: ids.claimId(seed.claimCaseId),
          pariwarId: ids.pariwarId(seed.pariwarId),
          documentType: 'death_certificate',
          storageObjectKey: key,
          contentType: 'application/pdf',
          byteSize: 1024,
          parityOutcome: 'match',
          parityFlags: {},
          ocrConfidence: 0.9,
          verifierReviewRequired: false,
        });
        await db.insert(schema.claimDeathCertificateUploads).values({
          uploadId: uploadId as never,
          claimCaseId: ids.claimId(seed.claimCaseId),
          pariwarId: ids.pariwarId(seed.pariwarId),
          deceasedMemberId: ids.memberId(seed.deceasedMemberId),
          claimDocumentId: claimDocumentId as never,
          storageObjectKey: key,
          contentType: 'application/pdf',
          byteSize: 1024,
          channel: 'member_app',
          uploadedByActorId: null,
          uploadedAt: new Date(Date.now() - 20 * DAY),
          parityOutcome: 'match',
          parityFlags: {},
          ocrConfidence: 0.9,
        });
      });
      const r = await runClaimPeerMeshSelect(boss, deps(), selectEnvelope(seed));
      expect(r.selectedCount).toBe(2);
      const selection = await selectionOf(seed);
      expect(selection!).toMatchObject({ source: 'workplace', deceasedWorkplaceId: seed.workplaceId, recentChangeBeforeFiling: true });
    } finally {
      await cleanup(seed);
    }
  });

  /**
   * The anchor (AC4 — RF1, `2026-10-16-339`, option C): the deceased's FIRST claim was filed 200 days ago (refused); they were
   * posted to the school 100 days ago (BETWEEN the two filings). The death's first filing is the cut ⇒ the school does ⛔ count
   * — nobody to ask; unless an innocence finding lifts that first claim, when the second claim's own filing counts.
   */
  async function refiled(innocent: boolean) {
    const seed = await seedClaim({ colleagues: 2, deceasedPostedAt: new Date(Date.now() - 100 * DAY) });
    const { boss } = fakeBoss();
    const firstClaim = randomUUID();
    try {
      await withPariwarScope(pool, seed.pariwarId, async (_db, client) => {
        await client.query(`SET LOCAL app.claim_state_writer = 'on'`);
        await client.query(
          `INSERT INTO claims (claim_case_id, pariwar_id, deceased_member_id, intake_channels, current_state, state_event_version, created_at)
           VALUES ($1, $2, $3, ARRAY['member_app']::claim_intake_channel[], 'denied', 1, $4)`,
          [firstClaim, seed.pariwarId, seed.deceasedMemberId, new Date(Date.now() - 200 * DAY)],
        );
        if (innocent) {
          await client.query(
            `INSERT INTO claim_nominee_findings (finding_id, claim_case_id, pariwar_id, kind, recorded_by_actor_id, recorded_by_display)
             VALUES (gen_random_uuid(), $1, $2, 'member_found_innocent', 'seed', 'Seed Investigator')`,
            [firstClaim, seed.pariwarId],
          );
        }
      });
      const r = await runClaimPeerMeshSelect(boss, deps(), selectEnvelope(seed));
      return { r, selection: await selectionOf(seed), state: await claimState(seed.claimCaseId) };
    } finally {
      await pool.query(`DELETE FROM claims WHERE claim_case_id = $1`, [firstClaim]);
      await cleanup(seed);
    }
  }

  it('the anchor (AC4 — the RF1 pin, `-339` C): a SECOND claim for the same death cuts at the death\'s FIRST filing — a transfer recorded between the two ⛔ counts', async () => {
    const { r, selection, state } = await refiled(false);
    expect(r.selectedCount).toBe(0);
    expect(selection!).toMatchObject({ source: null, deceasedWorkplaceId: null, outcome: 'skipped' });
    expect(state).toBe('verification_in_progress');
  });

  it('the anchor (`-339` C): an innocence finding on the first claim lifts it — the second claim\'s own filing counts, the school\'s colleagues are asked', async () => {
    const { r, selection } = await refiled(true);
    expect(r.selectedCount).toBe(2);
    expect(selection!.source).toBe('workplace');
    expect(selection!.anchorClaimCaseId).toBe(selection!.claimCaseId); // the lifted first claim does not salt the ranking either
  });

  it('a refile (`2026-10-16-340` call 1): the second claim for the same death asks the SAME five of twelve as the first — ranked by the first claim', async () => {
    const seed = await seedClaim({ colleagues: 12 });
    const { boss } = fakeBoss();
    const refile = { ...seed, claimCaseId: randomUUID() };
    try {
      await runClaimPeerMeshSelect(boss, deps(), selectEnvelope(seed));
      const first = await selectionOf(seed);
      expect(first!.selectedMemberIds).toHaveLength(5);
      // the first claim is refused; the family files again (the projector stamps it AFTER the first)
      await withPariwarScope(pool, seed.pariwarId, async (_db, client) => {
        await client.query(`SET LOCAL app.claim_state_writer = 'on'`);
        await client.query(`UPDATE claims SET current_state = 'denied' WHERE claim_case_id = $1`, [seed.claimCaseId]);
        await client.query(`SET LOCAL app.claim_state_writer = 'off'`);
        await projectTo(client, { ...refile, claimantActorId: null }, 'documents_pending');
      });
      const r = await runClaimPeerMeshSelect(boss, deps(), selectEnvelope(refile));
      expect(r.created).toBe(true);
      const second = await selectionOf(refile);
      expect(second!.claimCaseId).toBe(refile.claimCaseId);
      expect(second!.anchorClaimCaseId).toBe(seed.claimCaseId);
      expect(second!.selectedMemberIds).toEqual(first!.selectedMemberIds);
      expect(second!.rankedMemberIds).toEqual(first!.rankedMemberIds);
      // and the stored row replays by its stored anchor (I7)
      expect(claim.replayPeerMeshSelection(second!).selectedMemberIds).toEqual(second!.selectedMemberIds);
    } finally {
      await cleanup(seed);
    }
  });

  /**
   * The race (AC8), on two connections: B runs the select job's OWN transaction up to its edge (`lockClaimCase`, the
   * selection, the edge event) and holds it open; A runs the job and must WAIT on the claim lock (seen in
   * `pg_blocking_pids`); COMMIT B; await A ⇒ A finds B's selection and no-ops — exactly ONE edge event.
   */
  async function race(o: { colleagues: number }, edge: 'claim.peer_mesh_pinged' | 'claim.peer_mesh_none_to_ask') {
    const seed = await seedClaim({ colleagues: o.colleagues });
    const { boss, sends } = fakeBoss();
    const b = await pool.connect();
    try {
      await b.query('BEGIN');
      await b.query(`SET LOCAL app.pariwar_id = '${seed.pariwarId}'`);
      const db = bindScopedDb(b);
      const claimRow = await claim.lockClaimCase(db, ids.pariwarId(seed.pariwarId), ids.claimId(seed.claimCaseId));
      const selected = seed.colleagueIds.slice(0, 5).map((c) => ids.memberId(c));
      await claim.persistPeerMeshSelection(db, {
        claimCaseId: ids.claimId(seed.claimCaseId),
        pariwarId: ids.pariwarId(seed.pariwarId),
        deceasedMemberId: ids.memberId(seed.deceasedMemberId),
        deceased: { district: 'Patna', createdAt: new Date(LONG_AGO) },
        metricId: 'workplace_named_v1',
        metricVersion: 1,
        selectedMemberIds: selected,
        candidates: selected.map((memberId) => ({ memberId, group: 'workplace_current' as const, settled: true })),
        workplace: {
          source: selected.length > 0 ? 'workplace' : null,
          previousWorkplaceCounted: false,
          recentChangeBeforeFiling: false,
          deceasedWorkplaceId: ids.workplaceId(seed.workplaceId),
          deceasedPreviousWorkplaceId: null,
          rankedMemberIds: selected,
          anchorClaimCaseId: ids.claimId(seed.claimCaseId),
        },
        responseWindowExpiresAt: new Date(NOW.getTime() + DAY),
      });
      const base = { from_state: 'documents_pending', to_state: 'verification_in_progress', actor: 'system', metric_id: 'workplace_named_v1', metric_version: 1 } as const;
      await claim.projectClaimState(b, {
        claimCaseId: ids.claimId(seed.claimCaseId),
        pariwarId: ids.pariwarId(seed.pariwarId),
        deceasedMemberId: ids.memberId(seed.deceasedMemberId),
        intakeChannels: claimRow!.intakeChannels,
        claimantActorId: null,
        actorId: null,
        ...(edge === 'claim.peer_mesh_pinged'
          ? { eventType: edge, payload: { ...base, trigger: 'peer_mesh_selected', selected_member_ids: [...selected] } }
          : { eventType: edge, payload: { ...base, trigger: 'peer_mesh_none_to_ask' } }),
      });
      // the job's own zero branch disposes the selection in the SAME transaction (review round 2, P3) — so A meets a
      // `skipped` selection, exactly as it would behind a real job
      if (edge === 'claim.peer_mesh_none_to_ask') {
        await claim.skipPeerMesh(db, ids.pariwarId(seed.pariwarId), ids.claimId(seed.claimCaseId), claim.PEER_MESH_SKIP_REASON_NO_WORKPLACE_COLLEAGUE_OR_NAMED_PERSON);
      }
      const bPid = (await b.query<{ pid: number }>(`SELECT pg_backend_pid() AS pid`)).rows[0]!.pid;

      const a = runClaimPeerMeshSelect(boss, deps(), selectEnvelope(seed));
      const deadline = Date.now() + 10_000;
      let waiting = 0;
      while (Date.now() < deadline) {
        const r = await pool.query<{ n: number }>(`SELECT count(*)::int AS n FROM pg_stat_activity WHERE $1 = ANY(pg_blocking_pids(pid))`, [bPid]);
        waiting = r.rows[0]!.n;
        if (waiting > 0) break;
        await new Promise((res) => setTimeout(res, 25));
      }
      expect(waiting).toBeGreaterThan(0);
      await b.query('COMMIT');
      const fromA = await a;
      expect(fromA.created).toBe(false);
      const edges =
        (await eventCount(seed.claimCaseId, 'claim.peer_mesh_pinged')) + (await eventCount(seed.claimCaseId, 'claim.peer_mesh_none_to_ask'));
      expect(edges).toBe(1);
      expect(await eventCount(seed.claimCaseId, edge)).toBe(1);
      // A's no-op re-enqueues a window only while the winner's selection is `pending`: once for the pinged branch, never
      // for the zero branch (already `skipped`)
      const windows = sends.filter((x) => x.name === QUEUE_NAMES.CLAIM_PEER_MESH_WINDOW);
      expect(windows).toHaveLength(edge === 'claim.peer_mesh_pinged' ? 1 : 0);
    } finally {
      await b.query('ROLLBACK').catch(() => undefined);
      b.release();
      await cleanup(seed);
    }
  }

  it('the race (AC8), the pinged branch: two select transactions ⇒ exactly ONE edge event', async () => {
    await race({ colleagues: 6 }, 'claim.peer_mesh_pinged');
  });

  it('the race (AC8), the zero branch: two select transactions ⇒ exactly ONE edge event', async () => {
    await race({ colleagues: 0 }, 'claim.peer_mesh_none_to_ask');
  });

  it('response (AC4): a selected member responds (identity, state stable); a non-selected member is rejected', async () => {
    const seed = await seedClaim();
    const { boss } = fakeBoss();
    try {
      await runClaimPeerMeshSelect(boss, deps(), selectEnvelope(seed));
      const selection = await withPariwarScope(pool, seed.pariwarId, (db) =>
        claim.getPeerMeshSelectionByClaim(db, ids.pariwarId(seed.pariwarId), ids.claimId(seed.claimCaseId)),
      );
      const selectedMember = selection!.selectedMemberIds[0]!;
      // A non-selected member: one of the candidates NOT in the selected 5.
      const nonSelected = seed.candidateIds.find((c) => !selection!.selectedMemberIds.includes(ids.memberId(c)))!;

      await withPariwarScope(pool, seed.pariwarId, (_db, client) =>
        claim.recordPeerMeshResponse(client, {
          claimCaseId: ids.claimId(seed.claimCaseId),
          pariwarId: ids.pariwarId(seed.pariwarId),
          responderMemberId: selectedMember,
          response: 'confirmed',
        }),
      );
      expect(await eventCount(seed.claimCaseId, 'claim.peer_mesh_responded')).toBe(1);
      // Annotation event — state stays verification_in_progress (identity).
      expect(await claimState(seed.claimCaseId)).toBe('verification_in_progress');

      // A non-selected member cannot vote (non-manipulability).
      await expect(
        withPariwarScope(pool, seed.pariwarId, (_db, client) =>
          claim.recordPeerMeshResponse(client, {
            claimCaseId: ids.claimId(seed.claimCaseId),
            pariwarId: ids.pariwarId(seed.pariwarId),
            responderMemberId: ids.memberId(nonSelected),
            response: 'confirmed',
          }),
        ),
      ).rejects.toBeInstanceOf(claim.PeerMeshResponderNotSelectedError);
      // Still exactly one response event (the rejected one appended nothing).
      expect(await eventCount(seed.claimCaseId, 'claim.peer_mesh_responded')).toBe(1);
    } finally {
      await cleanup(seed);
    }
  });

  it('fallback (AC6): <3 responses at the actual deadline → insufficient_responses_fallback; never advances state', async () => {
    const seed = await seedClaim();
    const { boss } = fakeBoss();
    try {
      await runClaimPeerMeshSelect(boss, deps(), selectEnvelope(seed));
      const selection = await withPariwarScope(pool, seed.pariwarId, (db) =>
        claim.getPeerMeshSelectionByClaim(db, ids.pariwarId(seed.pariwarId), ids.claimId(seed.claimCaseId)),
      );
      const selected = selection!.selectedMemberIds;

      // Two responders (< 3), BEFORE the window fires.
      for (const m of selected.slice(0, 2)) {
        await withPariwarScope(pool, seed.pariwarId, (_db, client) =>
          claim.recordPeerMeshResponse(client, {
            claimCaseId: ids.claimId(seed.claimCaseId),
            pariwarId: ids.pariwarId(seed.pariwarId),
            responderMemberId: m,
            response: 'confirmed',
          }),
        );
      }
      const windowEnv: JobEnvelope<ClaimPeerMeshWindowPayload> = {
        requestId: randomUUID(),
        pariwarId: seed.pariwarId,
        actorId: null,
        traceId: randomUUID(),
        payload: { claimCaseId: seed.claimCaseId },
      };
      // windowDeps() simulates the delayed job actually firing AT the real deadline (not the
      // same instant as selection — see the self-defer test for the "fires too early" path).
      const r1 = await runClaimPeerMeshWindow(boss, windowDeps(), windowEnv);
      expect(r1.distinctResponders).toBe(2);
      expect(r1.outcome).toBe('insufficient_responses_fallback');
      expect(await claimState(seed.claimCaseId)).toBe('verification_in_progress'); // never advanced
    } finally {
      await cleanup(seed);
    }
  });

  it('fallback (AC6): ≥3 responses collected BEFORE the deadline → sufficient at the actual deadline; never advances state', async () => {
    const seed = await seedClaim();
    const { boss } = fakeBoss();
    try {
      await runClaimPeerMeshSelect(boss, deps(), selectEnvelope(seed));
      const selection = await withPariwarScope(pool, seed.pariwarId, (db) =>
        claim.getPeerMeshSelectionByClaim(db, ids.pariwarId(seed.pariwarId), ids.claimId(seed.claimCaseId)),
      );
      const selected = selection!.selectedMemberIds;

      // Three responders (≥3), all BEFORE the window fires — outcome is still `pending`, so
      // recordPeerMeshResponse's window-resolved guard does not block any of them.
      for (const m of selected.slice(0, 3)) {
        await withPariwarScope(pool, seed.pariwarId, (_db, client) =>
          claim.recordPeerMeshResponse(client, {
            claimCaseId: ids.claimId(seed.claimCaseId),
            pariwarId: ids.pariwarId(seed.pariwarId),
            responderMemberId: m,
            response: 'confirmed',
          }),
        );
      }
      const windowEnv: JobEnvelope<ClaimPeerMeshWindowPayload> = {
        requestId: randomUUID(),
        pariwarId: seed.pariwarId,
        actorId: null,
        traceId: randomUUID(),
        payload: { claimCaseId: seed.claimCaseId },
      };
      const r1 = await runClaimPeerMeshWindow(boss, windowDeps(), windowEnv);
      expect(r1.distinctResponders).toBe(3);
      expect(r1.outcome).toBe('sufficient');
      expect(await claimState(seed.claimCaseId)).toBe('verification_in_progress'); // never advanced
    } finally {
      await cleanup(seed);
    }
  });

  it('RLS: selection + ping intents are invisible under another Pariwar scope', async () => {
    const seed = await seedClaim();
    const { boss } = fakeBoss();
    try {
      await runClaimPeerMeshSelect(boss, deps(), selectEnvelope(seed));
      // Read the real selection (under the owning Pariwar) to get its selection_id.
      const selection = await withPariwarScope(pool, seed.pariwarId, (db) =>
        claim.getPeerMeshSelectionByClaim(db, ids.pariwarId(seed.pariwarId), ids.claimId(seed.claimCaseId)),
      );
      expect(selection).toBeDefined();

      const otherPariwar = randomUUID();
      // A cross-tenant read of the SAME claim/selection resolves to nothing (the accessors'
      // explicit pariwar_id predicate — the same tenant-isolation assertion the OCR job test makes).
      const visibleSelection = await withPariwarScope(pool, otherPariwar, (db) =>
        claim.getPeerMeshSelectionByClaim(db, ids.pariwarId(otherPariwar), ids.claimId(seed.claimCaseId)),
      );
      expect(visibleSelection).toBeUndefined();

      const visiblePings = await withPariwarScope(pool, otherPariwar, (db) =>
        claim.getPeerMeshPingIntentsBySelection(db, ids.pariwarId(otherPariwar), selection!.selectionId),
      );
      expect(visiblePings).toHaveLength(0);
    } finally {
      await cleanup(seed);
    }
  });

  it('non-manipulability (SW23): the claimant — a colleague who filed — is never selected into their own mesh', async () => {
    const seed = await seedClaim({ colleagues: 7, claimantIndex: 0 });
    const claimantId = seed.colleagueIds[0]!;
    const { boss } = fakeBoss();
    try {
      const result = await runClaimPeerMeshSelect(boss, deps(), selectEnvelope(seed));
      expect(result.created).toBe(true);
      const selection = await selectionOf(seed);
      expect(selection!.selectedMemberIds).not.toContain(ids.memberId(claimantId));
      expect(selection!.candidateSnapshot.map((c) => c.memberId)).not.toContain(claimantId);
      // 6 eligible colleagues remained (7 minus the excluded claimant) — still selects 5.
      expect(selection!.candidateSnapshot).toHaveLength(6);
      expect(selection!.selectedMemberIds).toHaveLength(5);
    } finally {
      await cleanup(seed);
    }
  });

  it('response guards: rejects a SECOND response from an already-responded member (transactional dedup)', async () => {
    const seed = await seedClaim();
    const { boss } = fakeBoss();
    try {
      await runClaimPeerMeshSelect(boss, deps(), selectEnvelope(seed));
      const selection = await withPariwarScope(pool, seed.pariwarId, (db) =>
        claim.getPeerMeshSelectionByClaim(db, ids.pariwarId(seed.pariwarId), ids.claimId(seed.claimCaseId)),
      );
      const member = selection!.selectedMemberIds[0]!;
      const respond = (response: 'confirmed' | 'denied' | 'unknown') =>
        withPariwarScope(pool, seed.pariwarId, (_db, client) =>
          claim.recordPeerMeshResponse(client, {
            claimCaseId: ids.claimId(seed.claimCaseId),
            pariwarId: ids.pariwarId(seed.pariwarId),
            responderMemberId: member,
            response,
          }),
        );

      await respond('confirmed');
      await expect(respond('denied')).rejects.toBeInstanceOf(claim.PeerMeshResponderAlreadyRespondedError);
      // Still exactly one response event — the rejected duplicate appended nothing.
      expect(await eventCount(seed.claimCaseId, 'claim.peer_mesh_responded')).toBe(1);
    } finally {
      await cleanup(seed);
    }
  });

  // ⭐ Story 6.27a (PM8, F39) — INVERTED: a neighbour's answer is taken while an approval is still to come (the answer
  // window), ⛔ no longer refused once the 72-hour label resolves; the label is ⛔ not recounted (monotonic).
  it('response after the AR-61 outcome resolved: ACCEPTED, and the label is NOT recounted (Story 6.27a PM8)', async () => {
    const seed = await seedClaim();
    const { boss } = fakeBoss();
    try {
      await runClaimPeerMeshSelect(boss, deps(), selectEnvelope(seed));
      const windowEnv: JobEnvelope<ClaimPeerMeshWindowPayload> = {
        requestId: randomUUID(),
        pariwarId: seed.pariwarId,
        actorId: null,
        traceId: randomUUID(),
        payload: { claimCaseId: seed.claimCaseId },
      };
      // Resolve the window at its actual deadline (0 responders → insufficient_responses_fallback).
      const resolved = await runClaimPeerMeshWindow(boss, windowDeps(), windowEnv);
      expect(resolved.outcome).toBe('insufficient_responses_fallback');

      const selection = await withPariwarScope(pool, seed.pariwarId, (db) =>
        claim.getPeerMeshSelectionByClaim(db, ids.pariwarId(seed.pariwarId), ids.claimId(seed.claimCaseId)),
      );
      // THREE late answers — enough that a RECOUNT would flip the label (≥ 3), so the re-fire below has teeth
      // (second-pass review S8 (a): the old leg never re-ran the worker, so the assertion could not fail).
      for (const member of selection!.selectedMemberIds.slice(0, 3)) {
        await withPariwarScope(pool, seed.pariwarId, (_db, client) =>
          claim.recordPeerMeshResponse(client, {
            claimCaseId: ids.claimId(seed.claimCaseId),
            pariwarId: ids.pariwarId(seed.pariwarId),
            responderMemberId: member,
            response: 'confirmed',
          }),
        );
      }
      expect(await eventCount(seed.claimCaseId, 'claim.peer_mesh_responded')).toBe(3);
      // EVERY event on the claim's stream, before the re-fire — the delta below proves the re-fire wrote ⛔ event at all
      // (fourth-pass review V10 (b): a fixed total of the responded events could ⛔ move — the worker writes none).
      const streamEvents = async () =>
        (await pool.query(`SELECT count(*)::int AS n FROM events_log WHERE stream_id = $1`, [seed.claimCaseId])).rows[0].n as number;
      const beforeRefire = await streamEvents();
      // A redelivered / re-fired WINDOW job after the late answers: the label stays (MONOTONIC — ⛔ recounted).
      await runClaimPeerMeshWindow(boss, windowDeps(), { ...windowEnv, requestId: randomUUID() });
      const after = await withPariwarScope(pool, seed.pariwarId, (db) =>
        claim.getPeerMeshSelectionByClaim(db, ids.pariwarId(seed.pariwarId), ids.claimId(seed.claimCaseId)),
      );
      expect(after!.outcome).toBe('insufficient_responses_fallback'); // ⛔ recounted
      // …and the re-fire wrote ⛔ event of its own (U15 (c), as a DELTA — V10 (b)).
      expect(await streamEvents()).toBe(beforeRefire);
    } finally {
      await cleanup(seed);
    }
  });

  it('AR-61 outcome is MONOTONIC: a stray re-fire after resolution never flips it', async () => {
    const seed = await seedClaim();
    const { boss } = fakeBoss();
    try {
      await runClaimPeerMeshSelect(boss, deps(), selectEnvelope(seed));
      const windowEnv: JobEnvelope<ClaimPeerMeshWindowPayload> = {
        requestId: randomUUID(),
        pariwarId: seed.pariwarId,
        actorId: null,
        traceId: randomUUID(),
        payload: { claimCaseId: seed.claimCaseId },
      };
      const first = await runClaimPeerMeshWindow(boss, windowDeps(), windowEnv);
      expect(first.outcome).toBe('insufficient_responses_fallback');

      // A stray duplicate/redelivered fire of the SAME window job — must be a pure no-op.
      const again = await runClaimPeerMeshWindow(boss, windowDeps(), windowEnv);
      expect(again.outcome).toBe('insufficient_responses_fallback');

      const selection = await withPariwarScope(pool, seed.pariwarId, (db) =>
        claim.getPeerMeshSelectionByClaim(db, ids.pariwarId(seed.pariwarId), ids.claimId(seed.claimCaseId)),
      );
      expect(selection!.outcome).toBe('insufficient_responses_fallback');
    } finally {
      await cleanup(seed);
    }
  });

  it('window job SELF-DEFERS when the window was extended past this fire, instead of resolving early', async () => {
    const seed = await seedClaim();
    const { boss, sends } = fakeBoss();
    try {
      await runClaimPeerMeshSelect(boss, deps(), selectEnvelope(seed));
      const laterExpiry = new Date(NOW.getTime() + 10 * 60 * 60 * 1000); // +10h
      const rescheduled = await extendPeerMeshWindowAndReschedule(
        boss,
        deps(),
        selectEnvelope(seed),
        seed.pariwarId,
        seed.claimCaseId,
        laterExpiry,
      );
      expect(rescheduled.outcome).toBe('pending');
      expect(rescheduled.responseWindowExpiresAt.getTime()).toBe(laterExpiry.getTime());
      // The reschedule itself sent a new window enqueue (in addition to the select job's own).
      const windowSends = sends.filter((s) => s.name === QUEUE_NAMES.CLAIM_PEER_MESH_WINDOW);
      expect(windowSends.length).toBeGreaterThanOrEqual(1);
      expect(windowSends.at(-1)!.options).toMatchObject({ singletonKey: seed.claimCaseId });

      // Firing the window job "now" (before the NEW deadline) must SELF-DEFER, not resolve.
      const windowEnv: JobEnvelope<ClaimPeerMeshWindowPayload> = {
        requestId: randomUUID(),
        pariwarId: seed.pariwarId,
        actorId: null,
        traceId: randomUUID(),
        payload: { claimCaseId: seed.claimCaseId },
      };
      const fired = await runClaimPeerMeshWindow(boss, deps(), windowEnv);
      expect(fired.outcome).toBe('pending'); // not resolved — deferred

      const selection = await withPariwarScope(pool, seed.pariwarId, (db) =>
        claim.getPeerMeshSelectionByClaim(db, ids.pariwarId(seed.pariwarId), ids.claimId(seed.claimCaseId)),
      );
      expect(selection!.outcome).toBe('pending');
      expect(selection!.responseWindowExpiresAt.getTime()).toBe(laterExpiry.getTime());
    } finally {
      await cleanup(seed);
    }
  });

  it('skipPeerMesh (AC6): rejects an empty/whitespace-only reason', async () => {
    const seed = await seedClaim();
    const { boss } = fakeBoss();
    try {
      await runClaimPeerMeshSelect(boss, deps(), selectEnvelope(seed));
      await expect(
        withPariwarScope(pool, seed.pariwarId, (db) =>
          claim.skipPeerMesh(db, ids.pariwarId(seed.pariwarId), ids.claimId(seed.claimCaseId), '   '),
        ),
      ).rejects.toBeInstanceOf(claim.PeerMeshInvalidSkipReasonError);

      const skipped = await withPariwarScope(pool, seed.pariwarId, (db) =>
        claim.skipPeerMesh(db, ids.pariwarId(seed.pariwarId), ids.claimId(seed.claimCaseId), '  staff override  '),
      );
      expect(skipped.outcome).toBe('skipped');
      expect(skipped.skipReason).toBe('staff override'); // trimmed
    } finally {
      await cleanup(seed);
    }
  });

  it('schema CHECK: selected_member_ids cannot exceed 5 at the DB layer (bypassing app code)', async () => {
    const seed = await seedClaim();
    try {
      const sixIds = [...seed.candidateIds.slice(0, 6)];
      await expect(
        withPariwarScope(pool, seed.pariwarId, (_db, client) =>
          client.query(
            `INSERT INTO claim_peer_mesh_selections
               (claim_case_id, pariwar_id, deceased_member_id, deceased_district, deceased_created_at,
                metric_id, metric_version, selected_member_ids, candidate_snapshot, response_window_expires_at)
             VALUES ($1,$2,$3,'Pune',now(),'district_cohort_v1',1,$4::uuid[],'[]'::jsonb, now() + interval '1 day')`,
            [randomUUID(), seed.pariwarId, seed.deceasedMemberId, sixIds],
          ),
        ),
      ).rejects.toMatchObject({ code: '23514' }); // check_violation
    } finally {
      await cleanup(seed);
    }
  });
});

// ── Delayed-fire proof (real pg-boss) — the window job actually FIRES after the window ────────────
describe.skipIf(!hasDatabase)('claim peer-mesh — window job fires after the delay (real pg-boss)', () => {
  let pool: pg.Pool;
  let created: CreatedDb;
  let boss: QueueClient;

  beforeAll(async () => {
    created = createDb(DATABASE_URL!, { max: 4, ssl: false });
    pool = created.pool;
    boss = createQueueClient(DATABASE_URL!, { applicationName: 'twt-jobs-test' });
    await boss.start();
    // windowSeconds: 1 — a tiny window so the delayed job fires within the test timeout.
    await registerClaimPeerMeshWorkers(boss, { pool, windowSeconds: 1, onAlarm: () => undefined });
  }, 30_000);

  afterAll(async () => {
    await stopQueueClient(boss).catch(() => undefined);
    await pool.end();
  });

  async function seedDocsPending(): Promise<{ pariwarId: string; deceasedMemberId: string; claimCaseId: string; candidateId: string }> {
    const pariwarId = randomUUID();
    const deceasedMemberId = randomUUID();
    const claimCaseId = randomUUID();
    const candidateId = randomUUID();
    const workplaceId = randomUUID();
    const batchId = randomUUID();
    await withPariwarScope(pool, pariwarId, async (_db, client) => {
      // Story 6.36 — the candidate is the deceased's colleague (`workplace_named_v1`), with an identity row (SW23).
      await client.query(
        `INSERT INTO workplace_import_batches (batch_id, pariwar_id, source_name, source_url, retrieved_on, licence, attribution, state_code)
         VALUES ($1, $2, 'fixture', 'https://example.test/udise', '2026-10-14', 'ODC-BY-1.0', 'fixture attribution', '10')`,
        [batchId, pariwarId],
      );
      await client.query(`INSERT INTO workplace_districts (pariwar_id, district, status, source_batch_id) VALUES ($1, 'Patna', 'listed', $2)`, [
        pariwarId,
        batchId,
      ]);
      await client.query(
        `INSERT INTO workplaces (workplace_id, pariwar_id, kind, name, district, udise_school_code, block_code, source, import_batch_id, status)
         VALUES ($1, $2, 'school', 'Fixture School', 'Patna', $3, '102801', 'import', $4, 'listed')`,
        [workplaceId, pariwarId, String(10280100000 + Math.floor(Math.random() * 99999)), batchId],
      );
      for (const m of [deceasedMemberId, candidateId]) {
        await insertMember(client, pariwarId, m);
        await insertPosting(client, pariwarId, m, workplaceId, LONG_AGO);
      }
      await projectTo(client, { pariwarId, deceasedMemberId, claimCaseId, claimantActorId: null }, 'documents_pending');
    });
    return { pariwarId, deceasedMemberId, claimCaseId, candidateId };
  }

  it('enqueue SELECT → select runs → window job fires ~1s later and writes the outcome', async () => {
    const seed = await seedDocsPending();
    try {
      // Enqueue the SELECT job onto the REAL queue; the registered worker runs the whole chain.
      await boss.send(QUEUE_NAMES.CLAIM_PEER_MESH_SELECT, {
        requestId: randomUUID(),
        pariwarId: seed.pariwarId,
        actorId: null,
        traceId: randomUUID(),
        payload: { claimCaseId: seed.claimCaseId, deceasedMemberId: seed.deceasedMemberId },
      } satisfies JobEnvelope<ClaimPeerMeshSelectPayload>);

      // Poll until the window job has fired + resolved the outcome (0 responders → fallback).
      const deadline = Date.now() + 25_000;
      let outcome = 'pending';
      while (Date.now() < deadline) {
        const r = await pool.query(
          `SELECT outcome FROM claim_peer_mesh_selections WHERE claim_case_id = $1`,
          [seed.claimCaseId],
        );
        outcome = r.rows[0]?.outcome ?? 'pending';
        if (outcome !== 'pending') break;
        await new Promise((res) => setTimeout(res, 500));
      }
      expect(outcome).toBe('insufficient_responses_fallback');
    } finally {
      await pool.query(`DELETE FROM claims WHERE claim_case_id = $1`, [seed.claimCaseId]);
      await pool.query(`DELETE FROM members WHERE member_id = ANY($1::uuid[])`, [
        [seed.deceasedMemberId, seed.candidateId],
      ]);
      await pool.query(`DELETE FROM workplaces WHERE pariwar_id = $1`, [seed.pariwarId]);
      await pool.query(`DELETE FROM workplace_districts WHERE pariwar_id = $1`, [seed.pariwarId]);
      await pool.query(`DELETE FROM workplace_import_batches WHERE pariwar_id = $1`, [seed.pariwarId]);
    }
  }, 30_000);
});
