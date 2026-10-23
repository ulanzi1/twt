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
//   · ⭐ Story 6.36d (`2026-10-23-386` ND3 / ND6; AC3, AC9 — M3, M8, M8b–M8e, M9, M14): the deceased declared a nominee whose
//     number (stored RAW, with spaces and `+91` — G5) is a colleague's SIGN-UP number — a REAL envelope and a REAL login index
//     (G16, TR8): the colleague is ⛔ in the candidates, the five or the ranking; a no-op / wrong-state run makes ⛔ KMS call; ⛔ KMS
//     call while this job holds a pool client; a KMS fault ⇒ alarm + rethrow, the final attempt's 1 h self re-send (carrying the
//     first-failure instant), another deferral before 24 h, and the EMPTY `nominee_check_unavailable` finish at 24 h; the anchor
//     moving between the pre-read and the lock ⇒ a retryable throw, ⛔ selection.

import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { bindScopedDb, claim, createDb, encryption, ids, schema, withPariwarScope, type CreatedDb } from '@twt/domain';
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
  CLAIM_PEER_MESH_SELECT_RETRY,
  ClaimPeerMeshNomineeCheckError,
  ClaimPeerMeshNomineeIndexesStaleError,
  DEFAULT_PEER_MESH_WINDOW_SECONDS,
  PEER_MESH_NOMINEE_CHECK_DEFER_SECONDS,
  PEER_MESH_NOMINEE_CHECK_RETRY_SPAN_MS,
  claimPeerMeshSelectAttemptOf,
  enqueueClaimPeerMeshSelect,
  extendPeerMeshWindowAndReschedule,
  nomineeCheckFirstFailureInstant,
  registerClaimPeerMeshWorkers,
  runClaimPeerMeshSelect,
  runClaimPeerMeshWindow,
  type ClaimPeerMeshDeps,
  type ClaimPeerMeshSelectPayload,
  type ClaimPeerMeshWindowPayload,
} from '../src/claim-peer-mesh.js';
import { buildJobsEncryptionDeps } from '../src/deps.js';
import { CHILD_RETRY_DELAY_SECONDS, CHILD_RETRY_LIMIT } from '../src/scheduler/claim-correction-reminders.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);
const NOW = new Date('2026-07-10T00:00:00Z');
const DAY = 24 * 60 * 60 * 1000;
/** Every seeded "long ago" row is recorded here — well before any filing day the projector stamps (today). */
const LONG_AGO = '2025-01-01T00:00:00Z';
/** Story 6.36d — the test KMS (fake mode) and the nominee's number: stored RAW in the declaration, canonical at sign-up. */
const enc = buildJobsEncryptionDeps('claim-peer-mesh-6-36d-pepper');
const NOMINEE_TYPED = '+91 98765 43210';
const NOMINEE_SIGNUP = '9876543210';

/** A KMS whose calls are counted; `probe` runs at each call (6.27c's Proxy form). `fail` ⇒ every decrypt throws (code 14). */
function countingKms(o: { fail?: boolean; probe?: () => void } = {}): { kms: typeof enc.kms; calls: () => number; decrypts: () => number } {
  let calls = 0;
  let decrypts = 0;
  const kms = new Proxy(enc.kms, {
    get(target, prop, receiver) {
      const v = Reflect.get(target, prop, receiver) as unknown;
      if (typeof v !== 'function') return v;
      const fn = v as (...a: unknown[]) => unknown;
      return (...a: unknown[]) => {
        calls += 1;
        o.probe?.();
        if (prop === 'decryptDek') {
          decrypts += 1;
          if (o.fail) return Promise.reject(Object.assign(new Error('kms unavailable'), { code: 14 }));
        }
        return fn.apply(target, a);
      };
    },
  });
  return { kms, calls: () => calls, decrypts: () => decrypts };
}

/** A REAL `declared` nominee version of `deceased` (the declaration writer's envelope — class `member_nominee`, the real Pariwar). */
async function declareNominee(client: pg.PoolClient, pariwarId: string, deceased: string, typed: string, at: string | Date): Promise<void> {
  const ct = encryption.serializeEnvelope(
    await encryption.encryptTier1(Buffer.from(typed, 'utf-8'), { pariwarId, fieldClass: encryption.MEMBER_NOMINEE_FIELD_CLASS }, enc.kms, enc.kekRef),
  );
  await client.query(
    `INSERT INTO member_nominee_versions (member_id, pariwar_id, rank, version_no, declaration_id, kind, source, name_ciphertext,
                                          relationship, mobile_ciphertext, split_pct, recorded_at, effective_at)
     VALUES ($1, $2, 1, 1, gen_random_uuid(), 'declared', 'member', 'enc:v1:n', 'spouse', $3, 100, $4, $4)`,
    [deceased, pariwarId, ct, at],
  );
}

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
    return { pool, encryption: enc, now: () => NOW, onAlarm: () => undefined, ...overrides };
  }

  /** deps() clock advanced past the default response window — for firing the WINDOW job in
   *  tests as if it were the real delayed pg-boss job firing at its actual deadline (review
   *  fix: runClaimPeerMeshWindow now self-defers when `now` is still before the persisted
   *  `response_window_expires_at`, so tests that mean to resolve the outcome must simulate
   *  time having actually passed, not reuse the SAME `now` as selection time). */
  function windowDeps(overrides: Partial<ClaimPeerMeshDeps> = {}): ClaimPeerMeshDeps {
    const later = new Date(NOW.getTime() + DEFAULT_PEER_MESH_WINDOW_SECONDS * 1000 + 1000);
    return { pool, encryption: enc, now: () => later, onAlarm: () => undefined, ...overrides };
  }

  /**
   * Seed (committed) a Pariwar with ONE workplace, a deceased posted there long ago, `colleagues` members posted there
   * long ago, `named` members the deceased named (accepted long ago), and a claim advanced to `target` (default
   * `documents_pending`) by the real projector — so its `created_at` (the filing day) is TODAY.
   * `claimantIndex` (a colleague's index): that colleague filed the claim and must never be selected.
   */
  async function seedClaim(
    o: {
      colleagues?: number;
      named?: number;
      claimantIndex?: number;
      target?: 'intake_converged' | 'documents_pending';
      deceasedPostedAt?: string | Date;
      /** Story 6.36d — this colleague signs up with `NOMINEE_SIGNUP` (a REAL login index), and the deceased declares it (raw). */
      nomineeIndex?: number;
    } = {},
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
      if (o.nomineeIndex !== undefined) {
        await client.query(`UPDATE member_identities SET mobile_blind_index = $2 WHERE member_id = $1`, [
          colleagueIds[o.nomineeIndex]!,
          await encryption.mobileBlindIndex(NOMINEE_SIGNUP, enc),
        ]);
        await declareNominee(client, pariwarId, deceasedMemberId, NOMINEE_TYPED, LONG_AGO);
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

  it('⭐ Story 6.27c R8 — the neighbour-text hook fires after COMMIT whenever a selection WITH PINGS exists: the fresh run AND the no-op re-run; ⛔ for nobody-to-ask, ⛔ before a selection', async () => {
    const calls: { pariwarId: string; claimCaseId: string }[] = [];
    const hook = { enqueuePeerMeshRequestSend: async (input: { pariwarId: string; claimCaseId: string }) => void calls.push({ ...input }) };
    const { boss } = fakeBoss();
    const pinged = await seedClaim();
    const nobody = await seedClaim({ colleagues: 0 });
    const early = await seedClaim({ target: 'intake_converged' });
    try {
      await runClaimPeerMeshSelect(boss, deps(hook), selectEnvelope(pinged));
      expect(calls).toEqual([{ pariwarId: pinged.pariwarId, claimCaseId: pinged.claimCaseId }]);
      // the no-op re-run (a lost enqueue self-heals) — keyed on the selection's pings, ⛔ `advanced`
      await runClaimPeerMeshSelect(boss, deps(hook), selectEnvelope(pinged));
      expect(calls).toHaveLength(2);
      // the zero branch and the state guard ⛔ fire it
      await runClaimPeerMeshSelect(boss, deps(hook), selectEnvelope(nobody));
      await runClaimPeerMeshSelect(boss, deps(hook), selectEnvelope(nobody));
      await runClaimPeerMeshSelect(boss, deps(hook), selectEnvelope(early));
      expect(calls).toHaveLength(2);
      // ⛔ a second edge event from the re-run
      expect(await eventCount(pinged.claimCaseId, 'claim.peer_mesh_pinged')).toBe(1);
      // a failing hook alarms and never fails the select
      const alarms: string[] = [];
      await expect(
        runClaimPeerMeshSelect(boss, deps({ onAlarm: (m) => alarms.push(m), enqueuePeerMeshRequestSend: () => Promise.reject(new Error('queue down')) }), selectEnvelope(pinged)),
      ).resolves.toMatchObject({ created: false });
      expect(alarms.some((a) => a.includes('neighbour texts') && a.includes(pinged.claimCaseId))).toBe(true);
    } finally {
      await cleanup(pinged);
      await cleanup(nobody);
      await cleanup(early);
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

  describe('⭐ Story 6.36d — the deceased\'s nominees are ⛔ among the five (ND3 / ND6)', () => {
    const final = (createdOn: Date) => ({ retryCount: 4, retryLimit: 4, createdOn });
    const nomineeOf = (seed: Seed) => seed.colleagueIds[2]!;

    it('M3 — a colleague signing in with the number the deceased typed for a nominee (raw: spaces, +91) is ⛔ a candidate, ⛔ selected, ⛔ ranked; five still asked', async () => {
      const seed = await seedClaim({ colleagues: 7, nomineeIndex: 2 });
      const k = countingKms();
      const { boss } = fakeBoss();
      try {
        const result = await runClaimPeerMeshSelect(boss, deps({ encryption: { ...enc, kms: k.kms } }), selectEnvelope(seed));
        expect(result).toMatchObject({ created: true, selectedCount: 5 });
        const sel = (await selectionOf(seed))!;
        expect(sel.selectedMemberIds).toHaveLength(5);
        expect(sel.selectedMemberIds).not.toContain(nomineeOf(seed));
        expect(sel.rankedMemberIds).toHaveLength(6);
        expect(sel.rankedMemberIds).not.toContain(nomineeOf(seed));
        expect(JSON.stringify(sel.candidateSnapshot)).not.toContain(nomineeOf(seed));
        // the positive control: the nominee read really decrypted (⛔ a vacuous empty-nominee fixture)
        expect(k.decrypts()).toBeGreaterThanOrEqual(1);
        // AC8 — nothing new leaves the process: ⛔ index or number in the selection row or the event
        const row = await pool.query(`SELECT row_to_json(s)::text AS j FROM claim_peer_mesh_selections s WHERE claim_case_id = $1`, [seed.claimCaseId]);
        expect(row.rows[0].j).not.toContain(await encryption.mobileBlindIndex(NOMINEE_SIGNUP, enc));
        expect(row.rows[0].j).not.toContain('98765');
      } finally {
        await cleanup(seed);
      }
    });

    it('M14 — a no-op re-run (a selection exists) and a wrong-state run make ⛔ KMS call', async () => {
      const seed = await seedClaim({ colleagues: 7, nomineeIndex: 2 });
      const early = await seedClaim({ colleagues: 3, nomineeIndex: 0, target: 'intake_converged' });
      const { boss } = fakeBoss();
      try {
        await runClaimPeerMeshSelect(boss, deps(), selectEnvelope(seed));
        const k = countingKms();
        const again = await runClaimPeerMeshSelect(boss, deps({ encryption: { ...enc, kms: k.kms } }), selectEnvelope(seed));
        expect(again.created).toBe(false);
        const wrong = await runClaimPeerMeshSelect(boss, deps({ encryption: { ...enc, kms: k.kms } }), selectEnvelope(early));
        expect(wrong).toMatchObject({ created: false, selectedCount: 0 });
        expect(k.calls()).toBe(0);
      } finally {
        await cleanup(seed);
        await cleanup(early);
      }
    });

    it('M9 — ⛔ KMS call while this job holds a pool client (the decrypt / HMAC run with ⛔ transaction open)', async () => {
      const seed = await seedClaim({ colleagues: 7, nomineeIndex: 2 });
      const { boss } = fakeBoss();
      const baseline = pool.totalCount - pool.idleCount;
      const held: number[] = [];
      const k = countingKms({ probe: () => held.push(pool.totalCount - pool.idleCount) });
      try {
        await runClaimPeerMeshSelect(boss, deps({ encryption: { ...enc, kms: k.kms } }), selectEnvelope(seed));
        expect(held.length).toBeGreaterThanOrEqual(2); // ≥ 1 decrypt + 1 HMAC
        expect(Math.max(...held)).toBe(baseline);
      } finally {
        await cleanup(seed);
      }
    });

    it('M8 — a KMS fault before the final attempt: ONE ids-only alarm, the job THROWS, ⛔ selection, ⛔ event', async () => {
      const seed = await seedClaim({ colleagues: 7, nomineeIndex: 2 });
      const alarms: string[] = [];
      const k = countingKms({ fail: true });
      const { boss, sends } = fakeBoss();
      try {
        await expect(
          runClaimPeerMeshSelect(boss, deps({ encryption: { ...enc, kms: k.kms }, onAlarm: (m) => alarms.push(m) }), selectEnvelope(seed), {
            retryCount: 1,
            retryLimit: 4,
          }),
        ).rejects.toBeInstanceOf(ClaimPeerMeshNomineeCheckError);
        expect(k.decrypts()).toBeGreaterThanOrEqual(1);
        expect(await selectionOf(seed)).toBeUndefined();
        expect(await claimState(seed.claimCaseId)).toBe('documents_pending');
        expect(await eventCount(seed.claimCaseId, 'claim.peer_mesh_none_to_ask')).toBe(0);
        expect(sends).toHaveLength(0);
        expect(alarms).toHaveLength(1);
        expect(alarms[0]).toContain('peer_mesh_nominee_exclusion');
        expect(alarms[0]).toContain(seed.claimCaseId);
        expect(alarms[0]).not.toContain('98765'); // ⛔ the number (a UUID can hold a digit run — ⛔ a generic digit test)
        // no metadata (absent ⇒ ⛔ the final attempt) also rethrows
        await expect(runClaimPeerMeshSelect(boss, deps({ encryption: { ...enc, kms: k.kms } }), selectEnvelope(seed))).rejects.toBeInstanceOf(
          ClaimPeerMeshNomineeCheckError,
        );
      } finally {
        await cleanup(seed);
      }
    });

    it('M8b — the FINAL attempt re-sends the select job 1 h later with the child retry policy and the first-failure instant (its createdOn), and COMPLETES — ⛔ selection', async () => {
      const seed = await seedClaim({ colleagues: 7, nomineeIndex: 2 });
      const k = countingKms({ fail: true });
      const { boss, sends } = fakeBoss();
      const alarms: string[] = [];
      const createdOn = new Date(NOW.getTime() - 15 * 60_000);
      try {
        const r = await runClaimPeerMeshSelect(boss, deps({ encryption: { ...enc, kms: k.kms }, onAlarm: (m) => alarms.push(m) }), selectEnvelope(seed), final(createdOn));
        expect(r).toEqual({ claimCaseId: seed.claimCaseId, created: false, selectedCount: 0, nomineeCheck: 'deferred' });
        // ND6 (a) "alarm each cycle": exactly ONE alarm, emitted AFTER the send succeeded, ids only
        expect(alarms).toHaveLength(1);
        expect(alarms[0]).toContain('re-sent in 1 h');
        expect(alarms[0]).toContain(seed.claimCaseId);
        expect(sends).toHaveLength(1);
        expect(sends[0]!.name).toBe(QUEUE_NAMES.CLAIM_PEER_MESH_SELECT);
        expect((sends[0]!.data as JobEnvelope<ClaimPeerMeshSelectPayload>).payload).toEqual({
          claimCaseId: seed.claimCaseId,
          deceasedMemberId: seed.deceasedMemberId,
          nomineeCheckFailingSince: createdOn.toISOString(),
        });
        expect(sends[0]!.options).toEqual({
          retryLimit: CHILD_RETRY_LIMIT,
          retryDelay: CHILD_RETRY_DELAY_SECONDS,
          retryBackoff: true,
          startAfter: PEER_MESH_NOMINEE_CHECK_DEFER_SECONDS,
          singletonKey: seed.claimCaseId,
        });
        expect(PEER_MESH_NOMINEE_CHECK_DEFER_SECONDS).toBe(3600);
        expect(await selectionOf(seed)).toBeUndefined();
        expect(await claimState(seed.claimCaseId)).toBe('documents_pending');
      } finally {
        await cleanup(seed);
      }
    });

    it('M8d — a deferred job failing again BEFORE 24 h defers again, carrying the SAME first-failure instant — ⛔ selection', async () => {
      const seed = await seedClaim({ colleagues: 7, nomineeIndex: 2 });
      const k = countingKms({ fail: true });
      const { boss, sends } = fakeBoss();
      const since = new Date(NOW.getTime() - 23 * 60 * 60_000).toISOString();
      try {
        const env = selectEnvelope(seed);
        const deferred = { ...env, payload: { ...env.payload, nomineeCheckFailingSince: since } };
        const r = await runClaimPeerMeshSelect(boss, deps({ encryption: { ...enc, kms: k.kms } }), deferred, final(NOW));
        expect(r.nomineeCheck).toBe('deferred');
        expect((sends[0]!.data as JobEnvelope<ClaimPeerMeshSelectPayload>).payload.nomineeCheckFailingSince).toBe(since);
        expect(await selectionOf(seed)).toBeUndefined();
      } finally {
        await cleanup(seed);
      }
    });

    it('M8f — a job that sat QUEUED for 30 h and fails only now is DEFERRED, ⛔ finished: the first-failure instant is clamped to one retry span', async () => {
      const seed = await seedClaim({ colleagues: 7, nomineeIndex: 2 });
      const k = countingKms({ fail: true });
      const { boss, sends } = fakeBoss();
      try {
        const queuedFor30h = new Date(NOW.getTime() - 30 * 60 * 60_000);
        const r = await runClaimPeerMeshSelect(boss, deps({ encryption: { ...enc, kms: k.kms } }), selectEnvelope(seed), final(queuedFor30h));
        expect(r.nomineeCheck).toBe('deferred');
        expect((sends[0]!.data as JobEnvelope<ClaimPeerMeshSelectPayload>).payload.nomineeCheckFailingSince).toBe(
          new Date(NOW.getTime() - PEER_MESH_NOMINEE_CHECK_RETRY_SPAN_MS).toISOString(),
        );
        expect(await selectionOf(seed)).toBeUndefined();
        expect(await claimState(seed.claimCaseId)).toBe('documents_pending');
      } finally {
        await cleanup(seed);
      }
    });

    it('M8g — a carried first-failure instant that is ⛔ the exact ISO form we write (unparsable, or a FINITE-but-ancient V8 parse) is treated as absent: the job DEFERS, ⛔ finishes after one failure', async () => {
      const seed = await seedClaim({ colleagues: 7, nomineeIndex: 2 });
      const k = countingKms({ fail: true });
      const { boss, sends } = fakeBoss();
      const createdOn = new Date(NOW.getTime() - 15 * 60_000);
      try {
        const env = selectEnvelope(seed);
        // 'garbage' / '' parse to NaN; '0', 'garbage 1', null and a date-only string parse to FINITE dates (1970 / 2000 / 2001 / a day)
        for (const bad of ['garbage', '', '0', 'garbage 1', '2026-07-09', null]) {
          sends.length = 0;
          const corrupt = { ...env, payload: { ...env.payload, nomineeCheckFailingSince: bad as never } };
          const r = await runClaimPeerMeshSelect(boss, deps({ encryption: { ...enc, kms: k.kms } }), corrupt, final(createdOn));
          expect(r.nomineeCheck).toBe('deferred');
          expect((sends[0]!.data as JobEnvelope<ClaimPeerMeshSelectPayload>).payload.nomineeCheckFailingSince).toBe(createdOn.toISOString());
          expect(await selectionOf(seed)).toBeUndefined();
        }
      } finally {
        await cleanup(seed);
      }
    });

    it('M8h — the 1 h re-send THROWING on the final attempt: ONE chain-LOST alarm (ids only), the error rethrown, ⛔ a "re-sent" alarm', async () => {
      const seed = await seedClaim({ colleagues: 7, nomineeIndex: 2 });
      const k = countingKms({ fail: true });
      const alarms: string[] = [];
      const boom = new Error('queue down');
      const boss = {
        async send() {
          throw boom;
        },
      } as unknown as QueueClient;
      try {
        await expect(
          runClaimPeerMeshSelect(boss, deps({ encryption: { ...enc, kms: k.kms }, onAlarm: (m) => alarms.push(m) }), selectEnvelope(seed), final(NOW)),
        ).rejects.toBe(boom);
        expect(alarms).toHaveLength(1);
        expect(alarms[0]).toContain('LOST');
        expect(alarms[0]).toContain(seed.claimCaseId);
        expect(alarms[0]).not.toContain('queue down'); // ⛔ the cause (TR12)
        expect(alarms.join('\n')).not.toContain('re-sent in 1 h');
        expect(await selectionOf(seed)).toBeUndefined();
      } finally {
        await cleanup(seed);
      }
    });

    it('M8j — a re-send that CREATES NO JOB (`send` resolves null) is a failed re-send: the chain-LOST alarm, ⛔ a "re-sent" alarm, an error', async () => {
      const seed = await seedClaim({ colleagues: 7, nomineeIndex: 2 });
      const k = countingKms({ fail: true });
      const alarms: string[] = [];
      const boss = {
        async send() {
          return null;
        },
      } as unknown as QueueClient;
      try {
        await expect(
          runClaimPeerMeshSelect(boss, deps({ encryption: { ...enc, kms: k.kms }, onAlarm: (m) => alarms.push(m) }), selectEnvelope(seed), final(NOW)),
        ).rejects.toThrow(/created no job/);
        expect(alarms).toHaveLength(1);
        expect(alarms[0]).toContain('LOST');
        expect(alarms.join('\n')).not.toContain('re-sent in 1 h');
      } finally {
        await cleanup(seed);
      }
    });

    it('M8k — the PRE-READ failing on the last attempt alarms (ids only) and rethrows; before the last attempt it only rethrows', async () => {
      const seed = await seedClaim({ colleagues: 3 });
      const { boss, sends } = fakeBoss();
      const alarms: string[] = [];
      const down = new Error('db down');
      const brokenPool = { connect: () => Promise.reject(down) } as unknown as pg.Pool;
      try {
        await expect(
          runClaimPeerMeshSelect(boss, deps({ pool: brokenPool, onAlarm: (m) => alarms.push(m) }), selectEnvelope(seed), final(NOW)),
        ).rejects.toBe(down);
        expect(alarms).toHaveLength(1);
        expect(alarms[0]).toContain('FAILED on the final attempt');
        expect(alarms[0]).toContain(seed.claimCaseId);
        expect(alarms[0]).not.toContain('db down');
        alarms.length = 0;
        await expect(
          runClaimPeerMeshSelect(boss, deps({ pool: brokenPool, onAlarm: (m) => alarms.push(m) }), selectEnvelope(seed), { retryCount: 1, retryLimit: 4 }),
        ).rejects.toBe(down);
        expect(alarms).toEqual([]);
        expect(sends).toHaveLength(0);
      } finally {
        await cleanup(seed);
      }
    });

    it('M8i — the REGISTERED select worker maps pg-boss metadata onto the attempt (hand-built job objects carrying pg-boss 12.19.1\'s metadata field names — ⛔ a real queue): retryCount = retryLimit defers; fewer rethrows; none rethrows', async () => {
      const seed = await seedClaim({ colleagues: 7, nomineeIndex: 2 });
      const k = countingKms({ fail: true });
      const sends: { name: string; data: unknown; options: unknown }[] = [];
      const works: { queue: string; options: unknown; handler: (jobs: unknown[]) => Promise<unknown> }[] = [];
      const boss = {
        async createQueue() {
          return undefined;
        },
        async work(queue: string, a: unknown, b?: unknown) {
          works.push(typeof a === 'function' ? { queue, options: undefined, handler: a as never } : { queue, options: a, handler: b as never });
          return 'worker-id';
        },
        async send(name: string, data: unknown, options: unknown) {
          sends.push({ name, data, options });
          return 'fake-job-id';
        },
      } as unknown as QueueClient;
      try {
        await registerClaimPeerMeshWorkers(boss, deps({ encryption: { ...enc, kms: k.kms } }));
        const select = works.find((w) => w.queue === QUEUE_NAMES.CLAIM_PEER_MESH_SELECT)!;
        expect(select.options).toEqual({ includeMetadata: true });
        const job = (meta: Record<string, unknown>) => ({ id: randomUUID(), name: QUEUE_NAMES.CLAIM_PEER_MESH_SELECT, data: selectEnvelope(seed), ...meta });
        const res = await select.handler([job({ retryCount: 4, retryLimit: 4, createdOn: new Date(NOW.getTime() - 15 * 60_000) })]);
        expect(res).toMatchObject({ processed: 1, results: [{ nomineeCheck: 'deferred' }] });
        expect(sends).toHaveLength(1);
        await expect(select.handler([job({ retryCount: 1, retryLimit: 4 })])).rejects.toBeInstanceOf(ClaimPeerMeshNomineeCheckError);
        await expect(select.handler([job({})])).rejects.toBeInstanceOf(ClaimPeerMeshNomineeCheckError);
        expect(sends).toHaveLength(1);
      } finally {
        await cleanup(seed);
      }
    });

    it('M8c / M8e — 24 h after the first failure the final attempt FINISHES: an EMPTY selection, `nominee_check_unavailable`, `claim.peer_mesh_none_to_ask`, a shepherd, two alarms', async () => {
      const seed = await seedClaim({ colleagues: 7, nomineeIndex: 2 });
      const k = countingKms({ fail: true });
      const alarms: string[] = [];
      const shepherds: string[] = [];
      const { boss, sends } = fakeBoss();
      const since = new Date(NOW.getTime() - 24 * 60 * 60_000).toISOString();
      try {
        const env = selectEnvelope(seed);
        const deferred = { ...env, payload: { ...env.payload, nomineeCheckFailingSince: since } };
        const r = await runClaimPeerMeshSelect(
          boss,
          deps({
            encryption: { ...enc, kms: k.kms },
            onAlarm: (m) => alarms.push(m),
            enqueueShepherdAssign: async (_e, cid) => void shepherds.push(cid),
          }),
          deferred,
          final(NOW),
        );
        expect(r).toEqual({ claimCaseId: seed.claimCaseId, created: true, selectedCount: 0, nomineeCheck: 'unavailable' });
        const sel = (await selectionOf(seed))!;
        expect(sel).toMatchObject({
          outcome: 'skipped',
          skipReason: claim.PEER_MESH_SKIP_REASON_NOMINEE_CHECK_UNAVAILABLE,
          selectedMemberIds: [],
          rankedMemberIds: [],
          candidateSnapshot: [],
          deceasedWorkplaceId: seed.workplaceId,
          anchorClaimCaseId: seed.claimCaseId,
          recentChangeBeforeFiling: false,
        });
        expect(claim.PEER_MESH_SKIP_REASON_NOMINEE_CHECK_UNAVAILABLE).toBe('nominee_check_unavailable');
        expect(await claimState(seed.claimCaseId)).toBe('verification_in_progress');
        expect(await eventCount(seed.claimCaseId, 'claim.peer_mesh_none_to_ask')).toBe(1);
        expect(await pingsOf(seed, sel.selectionId)).toHaveLength(0);
        expect(sends).toHaveLength(0); // ⛔ re-send, ⛔ window job
        expect(shepherds).toEqual([seed.claimCaseId]);
        expect(alarms).toHaveLength(2);
        for (const a of alarms) expect(a).not.toContain('98765');
      } finally {
        await cleanup(seed);
      }
    });

    it('a final-attempt fault of any OTHER kind is RETHROWN as today — a payload deceased mismatch THROWS (⛔ re-send, ⛔ finish); the only addition is ONE alarm, and only when no retry is left', async () => {
      const seed = await seedClaim({ colleagues: 3 });
      const { boss, sends } = fakeBoss();
      const alarms: string[] = [];
      try {
        const env = selectEnvelope(seed);
        const wrong = { ...env, payload: { ...env.payload, deceasedMemberId: randomUUID() } };
        await expect(runClaimPeerMeshSelect(boss, deps({ onAlarm: (m) => alarms.push(m) }), wrong, final(NOW))).rejects.toThrow(/does not match/);
        expect(sends).toHaveLength(0);
        expect(await selectionOf(seed)).toBeUndefined();
        expect(alarms).toHaveLength(1);
        expect(alarms[0]).toContain('FAILED on the final attempt');
        expect(alarms[0]).toContain(seed.claimCaseId);
        // not the last attempt: pg-boss retries, so nothing is lost and nothing alarms
        alarms.length = 0;
        await expect(
          runClaimPeerMeshSelect(boss, deps({ onAlarm: (m) => alarms.push(m) }), wrong, { retryCount: 1, retryLimit: 4 }),
        ).rejects.toThrow(/does not match/);
        expect(alarms).toEqual([]);
      } finally {
        await cleanup(seed);
      }
    });

    it('ND3 — the anchor moving between the pre-read and the lock (an earlier claim for the death, committed during KMS) ⇒ a retryable throw, ⛔ selection; the retry selects', async () => {
      const seed = await seedClaim({ colleagues: 7, nomineeIndex: 2 });
      const { boss } = fakeBoss();
      let inserted = false;
      let sideInsert: Promise<void> | undefined;
      const k = countingKms({
        probe: () => {
          if (inserted) return;
          inserted = true;
          // a separate committed transaction while the nominee read runs (⛔ awaited HERE — the KMS call proceeds; the proxy
          // below and the end of the test await it, so a failing insert fails the test instead of an unhandled rejection)
          sideInsert = (async () => {
            const c = await pool.connect();
            try {
              await c.query('BEGIN');
              await c.query(`SET LOCAL app.claim_state_writer = 'on'`);
              await c.query(
                `INSERT INTO claims (claim_case_id, pariwar_id, deceased_member_id, intake_channels, current_state, state_event_version, created_at)
                 VALUES (gen_random_uuid(), $1, $2, ARRAY['helpline']::claim_intake_channel[], 'denied', 1, '2026-01-01T06:00:00Z')`,
                [seed.pariwarId, seed.deceasedMemberId],
              );
              await c.query('COMMIT');
            } finally {
              c.release();
            }
          })();
        },
      });
      try {
        // wait for the side insert to COMMIT before the locked transaction reads the anchor (the first KMS call starts it)
        const slowKms = new Proxy(k.kms, {
          get(target, prop, receiver) {
            const v = Reflect.get(target, prop, receiver) as unknown;
            if (typeof v !== 'function') return v;
            const fn = v as (...a: unknown[]) => Promise<unknown>;
            return async (...a: unknown[]) => {
              const out = await fn.apply(target, a);
              await sideInsert;
              return out;
            };
          },
        });
        await expect(runClaimPeerMeshSelect(boss, deps({ encryption: { ...enc, kms: slowKms } }), selectEnvelope(seed))).rejects.toBeInstanceOf(
          ClaimPeerMeshNomineeIndexesStaleError,
        );
        await sideInsert; // awaited, never fire-and-forget: a failed insert fails THIS leg instead of passing it for the wrong reason
        expect(await selectionOf(seed)).toBeUndefined();
        const retry = await runClaimPeerMeshSelect(boss, deps(), selectEnvelope(seed));
        expect(retry.created).toBe(true);
        expect((await selectionOf(seed))!.selectedMemberIds).not.toContain(nomineeOf(seed));
      } finally {
        await cleanup(seed);
      }
    });

    it('the select job\'s retry policy is the claim children\'s (the OCR hook and the re-send share it)', () => {
      expect(CLAIM_PEER_MESH_SELECT_RETRY).toEqual({ retryLimit: CHILD_RETRY_LIMIT, retryDelay: CHILD_RETRY_DELAY_SECONDS, retryBackoff: true });
    });
  });

  it('the race (AC8), the pinged branch: two select transactions ⇒ exactly ONE edge event', async () => {
    await race({ colleagues: 6 }, 'claim.peer_mesh_pinged');
  });

  it('the race (AC8), the zero branch: two select transactions ⇒ exactly ONE edge event', async () => {
    await race({ colleagues: 0 }, 'claim.peer_mesh_none_to_ask');
  });

  it('response (AC4): a selected member responds (identity, state stable); a member with ⛔ ping is rejected (Story 6.27c R7)', async () => {
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

      // A member with ⛔ ping in the selection cannot vote (non-manipulability — Story 6.27c R7 reads the PING ROWS).
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

  it('⭐ Story 6.27c R7 — a REPLACEMENT neighbour (⛔ in `selected_member_ids`) responds: the save succeeds and counts ONCE', async () => {
    const seed = await seedClaim();
    const { boss } = fakeBoss();
    try {
      await runClaimPeerMeshSelect(boss, deps(), selectEnvelope(seed));
      const pid = ids.pariwarId(seed.pariwarId);
      const cid = ids.claimId(seed.claimCaseId);
      const selection = (await withPariwarScope(pool, seed.pariwarId, (db) => claim.getPeerMeshSelectionByClaim(db, pid, cid)))!;
      // Skip the first ping at send time for a PEER reason, then replace it from the stored ranking (R2) — one transaction.
      const replacementPingId = await withPariwarScope(pool, seed.pariwarId, async (db, client) => {
        const first = await client.query<{ ping_id: string }>(
          `SELECT ping_id FROM claim_peer_mesh_pings WHERE selection_id = $1 AND member_id = $2`,
          [selection.selectionId, selection.selectedMemberIds[0]],
        );
        await client.query(
          `UPDATE claim_peer_mesh_pings SET send_outcome = 'no_target', attempt_count = 1, detail = 'no_target:peer_not_active' WHERE ping_id = $1`,
          [first.rows[0]!.ping_id],
        );
        return claim.insertPeerMeshReplacementPing(db, {
          pariwarId: pid,
          selectionId: selection.selectionId,
          replacesPingId: ids.peerMeshPingId(first.rows[0]!.ping_id),
          deceasedMemberId: ids.memberId(seed.deceasedMemberId),
          nomineeMatch: { mobileIndexes: [], memberIds: [] },
        });
      });
      expect(replacementPingId).not.toBeNull();
      const replacement = await withPariwarScope(pool, seed.pariwarId, async (_db, client) =>
        (await client.query<{ member_id: string }>(`SELECT member_id FROM claim_peer_mesh_pings WHERE ping_id = $1`, [replacementPingId])).rows[0]!,
      );
      // The ranking's NEXT member (⛔ re-ranked) — and ⛔ one of the immutable selected five.
      expect(replacement.member_id).toBe(selection.rankedMemberIds![5]);
      expect(selection.selectedMemberIds).not.toContain(replacement.member_id);
      const respond = () =>
        withPariwarScope(pool, seed.pariwarId, (_db, client) =>
          claim.recordPeerMeshResponse(client, { claimCaseId: cid, pariwarId: pid, responderMemberId: ids.memberId(replacement.member_id), response: 'confirmed' }),
        );
      await respond();
      expect(await eventCount(seed.claimCaseId, 'claim.peer_mesh_responded')).toBe(1);
      await expect(respond()).rejects.toBeInstanceOf(claim.PeerMeshResponderAlreadyRespondedError);
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
    await registerClaimPeerMeshWorkers(boss, { pool, encryption: enc, windowSeconds: 1, onAlarm: () => undefined });
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

// ── Story 6.36d review patches — NO database: the pure ND6 helpers and the wiring that activates them ─────────────────────────
// (the live legs above skip silently without DATABASE_URL — the house `env -u DATABASE_URL` run reads only these)
describe('claim peer-mesh — ND6 helpers and wiring (no DB)', () => {
  const now = new Date('2026-07-10T12:00:00Z');
  const SPAN = PEER_MESH_NOMINEE_CHECK_RETRY_SPAN_MS;

  describe('nomineeCheckFirstFailureInstant', () => {
    it('a parseable carried instant wins — never later than now', () => {
      const t = new Date(now.getTime() - 23 * 60 * 60_000);
      expect(nomineeCheckFirstFailureInstant(t.toISOString(), new Date(0), now)).toEqual(t);
      expect(nomineeCheckFirstFailureInstant(new Date(now.getTime() + DAY).toISOString(), undefined, now)).toEqual(now);
    });

    it('a carried instant that is ⛔ the exact ISO form we write is absent — NaN AND the finite-but-ancient V8 parses (either would FINISH the job after one failure)', () => {
      const created = new Date(now.getTime() - 10 * 60_000);
      // NaN: 'garbage', '', '2026-13-45'. FINITE in V8: '0' (2000), '1' (2001), 'garbage 1' (2001), null / 0 (1970), true (1970), a date-only string
      for (const bad of ['garbage', '', '2026-13-45', '0', '1', 'garbage 1', '2026-07-09', null, 0, true, {}]) {
        const at = nomineeCheckFirstFailureInstant(bad, created, now);
        expect(Number.isFinite(at.getTime())).toBe(true);
        expect(at).toEqual(created);
      }
      // the exact form we write (`toISOString()`) is the only thing that wins
      const written = new Date(now.getTime() - 3 * 60 * 60_000).toISOString();
      expect(nomineeCheckFirstFailureInstant(written, created, now)).toEqual(new Date(written));
    });

    it('absent: createdOn within one retry span stands; older is clamped to one span before now; none, future or invalid ⇒ now', () => {
      const within = new Date(now.getTime() - SPAN + 1);
      expect(nomineeCheckFirstFailureInstant(undefined, within, now)).toEqual(within);
      expect(nomineeCheckFirstFailureInstant(undefined, new Date(now.getTime() - 30 * 60 * 60_000), now)).toEqual(new Date(now.getTime() - SPAN));
      expect(nomineeCheckFirstFailureInstant(undefined, undefined, now)).toEqual(now);
      expect(nomineeCheckFirstFailureInstant(undefined, new Date(now.getTime() + 60_000), now)).toEqual(now);
      expect(nomineeCheckFirstFailureInstant(undefined, new Date(Number.NaN), now)).toEqual(now);
    });

    it('the retry span covers the longest backoff of the CURRENT select retry policy (equal jitter: each delay ≤ 2 × 60 s × 2^(c-1)) — raising retryLimit / retryDelay fails HERE until the span is revisited', () => {
      let longest = 0;
      for (let c = 1; c <= CLAIM_PEER_MESH_SELECT_RETRY.retryLimit; c += 1) longest += CLAIM_PEER_MESH_SELECT_RETRY.retryDelay * 2 ** c * 1000;
      expect(SPAN).toBeGreaterThanOrEqual(longest);
    });
  });

  describe('claimPeerMeshSelectAttemptOf', () => {
    const job = (extra: Record<string, unknown>) => ({ id: 'j', name: 'q', data: {}, ...extra }) as never;

    it('maps pg-boss metadata onto the attempt; anything else is undefined (⛔ final)', () => {
      const createdOn = new Date('2026-07-10T00:00:00Z');
      expect(claimPeerMeshSelectAttemptOf(job({ retryCount: 4, retryLimit: 4, createdOn }))).toEqual({ retryCount: 4, retryLimit: 4, createdOn });
      expect(claimPeerMeshSelectAttemptOf(job({ retryCount: 1, retryLimit: 4, createdOn: '2026-07-10' }))).toEqual({ retryCount: 1, retryLimit: 4 });
      expect(claimPeerMeshSelectAttemptOf(job({}))).toBeUndefined();
      expect(claimPeerMeshSelectAttemptOf(job({ retryCount: '4', retryLimit: 4 }))).toBeUndefined();
    });
  });

  // `boot.ts`'s one-line call is pinned by SOURCE (the repo's precedent for boot.ts one-liners: claim-peer-mesh-wa-reminders.test.ts) —
  // ⛔ exercised: it is not run here, so a wrong argument at that call is for tsc.
  describe('the select job\'s wiring, up to boot.ts', () => {
    it('boot.ts hands the OCR hook the retry-carrying helper — ⛔ an inline `boss.send` to the SELECT queue (a source pin)', () => {
      const boot = readFileSync(fileURLToPath(new URL('../src/boot.ts', import.meta.url)), 'utf-8');
      expect(boot).toMatch(/enqueuePeerMeshSelect: \(input\) => enqueueClaimPeerMeshSelect\(boss, input\)/);
      expect(boot).not.toMatch(/QUEUE_NAMES\.CLAIM_PEER_MESH_SELECT/);
    });

    it('the helper behind the OCR hook\'s send carries the claim children\'s retry policy and a label singletonKey', async () => {
      const sends: { name: string; data: unknown; options: unknown }[] = [];
      const boss = {
        async send(name: string, data: unknown, options: unknown) {
          sends.push({ name, data, options });
          return 'fake-job-id';
        },
      } as unknown as QueueClient;
      await enqueueClaimPeerMeshSelect(boss, { claimCaseId: 'c1', deceasedMemberId: 'd1', pariwarId: 'p1', actorId: null, traceId: 't1' });
      expect(sends).toEqual([
        {
          name: QUEUE_NAMES.CLAIM_PEER_MESH_SELECT,
          data: { requestId: 't1', pariwarId: 'p1', actorId: null, traceId: 't1', payload: { claimCaseId: 'c1', deceasedMemberId: 'd1' } },
          options: { singletonKey: 'c1', retryLimit: CHILD_RETRY_LIMIT, retryDelay: CHILD_RETRY_DELAY_SECONDS, retryBackoff: true },
        },
      ]);
    });

    it('the SELECT worker is registered with `includeMetadata` — ⛔ without it `attempt` is always undefined and the arms never run', async () => {
      const works: { queue: string; args: unknown[] }[] = [];
      const boss = {
        async createQueue() {
          return undefined;
        },
        async work(queue: string, ...args: unknown[]) {
          works.push({ queue, args });
          return 'worker-id';
        },
      } as unknown as QueueClient;
      await registerClaimPeerMeshWorkers(boss, { pool: {} as never, encryption: enc });
      const select = works.find((w) => w.queue === QUEUE_NAMES.CLAIM_PEER_MESH_SELECT)!;
      expect(select.args).toHaveLength(2);
      expect(select.args[0]).toEqual({ includeMetadata: true });
      expect(typeof select.args[1]).toBe('function');
    });
  });
});
