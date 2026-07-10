// Peer-mesh selection + ping + AR-61 window fallback — live-DB integration (Story 6.6, Task 7).
//
// Drives runClaimPeerMeshSelect / runClaimPeerMeshWindow / claim.recordPeerMeshResponse against
// real Postgres (:5433). The core cases use a FAKE boss (records send() calls — no real queue);
// ONE case uses a REAL pg-boss to prove the window job actually FIRES after the configured delay
// (not just that it enqueues). Asserts membership, never DROP SCHEMA (memory [[project_live_db_test_gotchas]]).
//
//   · select + ping: 5-nearest selected deterministically, selection row + 5 ping rows persisted,
//     claim.peer_mesh_pinged appended, state → verification_in_progress, window job enqueued.
//   · idempotency: run twice → ONE selection, exactly 5 ping rows (not 10), ONE pinged event, stable.
//   · replay (AC5): reload the persisted candidate_snapshot, re-run selectPeerMesh, byte-identical.
//   · response (AC4): a selected member's response appends peer_mesh_responded (identity, state stable);
//     a NON-selected member is rejected (non-manipulability).
//   · fallback (AC6): <3 responses → insufficient_responses_fallback; ≥3 → sufficient; no state advance.
//   · RLS: selection + pings invisible under another Pariwar's scope.
//   · delayed fire (real pg-boss): the window job fires after a 1s window and writes the outcome.

import { randomUUID } from 'node:crypto';

import { claim, createDb, ids, withPariwarScope, type CreatedDb } from '@twt/domain';
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

interface CandidateSpec {
  id: string;
  district: string | null;
  createdAt: string;
}

describe.skipIf(!hasDatabase)('claim peer-mesh — live DB (:5433)', () => {
  let pool: pg.Pool;
  let created: CreatedDb;

  beforeAll(() => {
    created = createDb(DATABASE_URL!, { max: 4, ssl: false });
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
   * Seed a committed claim in `documents_pending` + a deceased ('Pune') + N active candidates.
   * `claimantActorId` (review fix coverage — excludeActorId): when set to one of the candidate
   * ids, that member filed the claim and must never be selected into their own mesh.
   */
  async function seedClaim(
    candidates: CandidateSpec[],
    options: { claimantActorId?: string } = {},
  ): Promise<{
    pariwarId: string;
    deceasedMemberId: string;
    claimCaseId: string;
    candidateIds: string[];
  }> {
    const pariwarId = randomUUID();
    const deceasedMemberId = randomUUID();
    const claimCaseId = randomUUID();
    const claimantActorId = options.claimantActorId ?? null;

    await withPariwarScope(pool, pariwarId, async (_db, client) => {
      // Deceased member ('Pune' district; excluded from their own mesh).
      await client.query(
        `INSERT INTO members (member_id, pariwar_id, state, state_event_version, created_at) VALUES ($1,$2,'active',1,$3)`,
        [deceasedMemberId, pariwarId, '2020-01-01T00:00:00Z'],
      );
      await client.query(
        `INSERT INTO member_postings (member_id, pariwar_id, district) VALUES ($1,$2,'Pune')`,
        [deceasedMemberId, pariwarId],
      );
      // Candidate members + postings.
      for (const c of candidates) {
        await client.query(
          `INSERT INTO members (member_id, pariwar_id, state, state_event_version, created_at) VALUES ($1,$2,'active',1,$3)`,
          [c.id, pariwarId, c.createdAt],
        );
        if (c.district !== null) {
          await client.query(
            `INSERT INTO member_postings (member_id, pariwar_id, district) VALUES ($1,$2,$3)`,
            [c.id, pariwarId, c.district],
          );
        }
      }
      // Advance the claim to documents_pending via the real projector (events v1..v3).
      const common = {
        claimCaseId: ids.claimId(claimCaseId),
        pariwarId: ids.pariwarId(pariwarId),
        deceasedMemberId: ids.memberId(deceasedMemberId),
        intakeChannels: ['member_app'] as const,
        claimantActorId,
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
          deceased_member_id: deceasedMemberId,
          intake_channel: 'member_app',
          claimant_actor_id: claimantActorId,
        },
      });
      await claim.projectClaimState(client, {
        ...common,
        eventType: 'claim.intake_converged',
        payload: { from_state: 'intake_pending', to_state: 'intake_converged', trigger: 'seed', actor: 'system' },
      });
      await claim.projectClaimState(client, {
        ...common,
        eventType: 'claim.documents_received',
        payload: { from_state: 'intake_converged', to_state: 'documents_pending', trigger: 'seed', actor: 'system' },
      });
    });

    return { pariwarId, deceasedMemberId, claimCaseId, candidateIds: candidates.map((c) => c.id) };
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

  /** 7 candidates so a 5-select is non-trivial (some Pune matches, varied cohorts). */
  function sevenCandidates(): CandidateSpec[] {
    return [
      { id: randomUUID(), district: 'Pune', createdAt: '2020-02-01T00:00:00Z' },
      { id: randomUUID(), district: 'Pune', createdAt: '2020-03-01T00:00:00Z' },
      { id: randomUUID(), district: 'Pune', createdAt: '2020-06-01T00:00:00Z' },
      { id: randomUUID(), district: 'Mumbai', createdAt: '2020-01-05T00:00:00Z' },
      { id: randomUUID(), district: 'Delhi', createdAt: '2020-01-10T00:00:00Z' },
      { id: randomUUID(), district: null, createdAt: '2020-01-02T00:00:00Z' },
      { id: randomUUID(), district: 'Pune', createdAt: '2020-12-01T00:00:00Z' },
    ];
  }

  async function cleanup(seed: { claimCaseId: string; deceasedMemberId: string; candidateIds: string[] }) {
    // claims delete cascades → selections → pings. members delete cascades → postings.
    await pool.query(`DELETE FROM claims WHERE claim_case_id = $1`, [seed.claimCaseId]);
    await pool.query(`DELETE FROM members WHERE member_id = ANY($1::uuid[])`, [
      [seed.deceasedMemberId, ...seed.candidateIds],
    ]);
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

  it('select + ping: 5 nearest selected, selection + 5 ping rows persisted, state → verification_in_progress', async () => {
    const seed = await seedClaim(sevenCandidates());
    const { boss, sends } = fakeBoss();
    try {
      const result = await runClaimPeerMeshSelect(boss, deps(), selectEnvelope(seed));
      expect(result.created).toBe(true);
      expect(result.selectedCount).toBe(5);

      const selection = await withPariwarScope(pool, seed.pariwarId, (db) =>
        claim.getPeerMeshSelectionByClaim(db, ids.pariwarId(seed.pariwarId), ids.claimId(seed.claimCaseId)),
      );
      expect(selection).toBeDefined();
      expect(selection!.selectedMemberIds).toHaveLength(5);
      expect(selection!.metricId).toBe('district_cohort_v1');
      expect(selection!.metricVersion).toBe(1);
      // Snapshot captured the 7 candidates (the audit-replay source).
      expect(selection!.candidateSnapshot).toHaveLength(7);
      expect(selection!.outcome).toBe('pending');

      const pings = await withPariwarScope(pool, seed.pariwarId, (db) =>
        claim.getPeerMeshPingIntentsBySelection(db, ids.pariwarId(seed.pariwarId), selection!.selectionId),
      );
      expect(pings).toHaveLength(5);
      // Every ping targets a selected member; message_key is the versioned copy-template key.
      const selectedSet = new Set(selection!.selectedMemberIds);
      for (const ping of pings) {
        expect(selectedSet.has(ping.memberId)).toBe(true);
        expect(ping.messageKey).toBe('peer_mesh_verification_request_v1');
      }

      expect(await claimState(seed.claimCaseId)).toBe('verification_in_progress');
      expect(await eventCount(seed.claimCaseId, 'claim.peer_mesh_pinged')).toBe(1);

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
    const seed = await seedClaim(sevenCandidates());
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

  it('replay (AC5): reload the persisted snapshot (candidates AND deceased), re-run selectPeerMesh, byte-identical selection', async () => {
    const seed = await seedClaim(sevenCandidates());
    const { boss } = fakeBoss();
    try {
      await runClaimPeerMeshSelect(boss, deps(), selectEnvelope(seed));
      const selection = await withPariwarScope(pool, seed.pariwarId, (db) =>
        claim.getPeerMeshSelectionByClaim(db, ids.pariwarId(seed.pariwarId), ids.claimId(seed.claimCaseId)),
      );
      // Reconstruct the pure-engine input ENTIRELY from the PERSISTED row (createdAt ISO →
      // Date) — review fix: the deceased side is read from `selection.deceasedDistrict` /
      // `selection.deceasedCreatedAt`, NEVER re-queried live (see the regression test below).
      const candidates = selection!.candidateSnapshot.map((c) => ({
        memberId: ids.memberId(c.memberId),
        district: c.district,
        createdAt: new Date(c.createdAt),
      }));
      const replay = claim.selectPeerMesh({
        deceasedMemberId: ids.memberId(seed.deceasedMemberId),
        claimCaseId: seed.claimCaseId,
        deceased: { district: selection!.deceasedDistrict, createdAt: selection!.deceasedCreatedAt },
        candidates,
        metric: claim.resolvePeerMeshMetric(selection!.metricId),
      });
      expect(replay.selectedMemberIds).toEqual(selection!.selectedMemberIds);
      expect(JSON.stringify(replay.selectedMemberIds)).toBe(JSON.stringify(selection!.selectedMemberIds));
    } finally {
      await cleanup(seed);
    }
  });

  it('replay (AC5 regression): a LIVE change to the deceased posting-district after selection does NOT affect replay', async () => {
    const seed = await seedClaim(sevenCandidates());
    const { boss } = fakeBoss();
    try {
      await runClaimPeerMeshSelect(boss, deps(), selectEnvelope(seed));
      const original = await withPariwarScope(pool, seed.pariwarId, (db) =>
        claim.getPeerMeshSelectionByClaim(db, ids.pariwarId(seed.pariwarId), ids.claimId(seed.claimCaseId)),
      );
      expect(original!.deceasedDistrict).toBe('Pune');

      // The deceased gets a NEW live posting (district changes) — must NOT retroactively
      // change what a replay of THIS selection produces (the whole point of persisting the
      // deceased's reference point instead of re-deriving it live at replay time).
      await withPariwarScope(pool, seed.pariwarId, (_db, client) =>
        client.query(`INSERT INTO member_postings (member_id, pariwar_id, district) VALUES ($1,$2,'Mumbai')`, [
          seed.deceasedMemberId,
          seed.pariwarId,
        ]),
      );
      const liveDeceasedNow = await withPariwarScope(pool, seed.pariwarId, (db) =>
        claim.getPeerMeshDeceasedAttributes(db, ids.pariwarId(seed.pariwarId), ids.memberId(seed.deceasedMemberId)),
      );
      expect(liveDeceasedNow!.district).toBe('Mumbai'); // the live value DID change

      const candidates = original!.candidateSnapshot.map((c) => ({
        memberId: ids.memberId(c.memberId),
        district: c.district,
        createdAt: new Date(c.createdAt),
      }));
      const replay = claim.selectPeerMesh({
        deceasedMemberId: ids.memberId(seed.deceasedMemberId),
        claimCaseId: seed.claimCaseId,
        deceased: { district: original!.deceasedDistrict, createdAt: original!.deceasedCreatedAt },
        candidates,
        metric: claim.resolvePeerMeshMetric(original!.metricId),
      });
      // Byte-identical to the ORIGINAL selection — proves replay used the PERSISTED 'Pune',
      // not the now-live 'Mumbai'.
      expect(replay.selectedMemberIds).toEqual(original!.selectedMemberIds);
    } finally {
      await cleanup(seed);
    }
  });

  it('response (AC4): a selected member responds (identity, state stable); a non-selected member is rejected', async () => {
    const seed = await seedClaim(sevenCandidates());
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
    const seed = await seedClaim(sevenCandidates());
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
    const seed = await seedClaim(sevenCandidates());
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
    const seed = await seedClaim(sevenCandidates());
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

  it('non-manipulability: the claimant (excludeActorId) is never selected into their own mesh', async () => {
    const pool7 = sevenCandidates();
    const claimantId = pool7[0]!.id; // the claimant is also an active Pariwar member
    const seed = await seedClaim(pool7, { claimantActorId: claimantId });
    const { boss } = fakeBoss();
    try {
      const result = await runClaimPeerMeshSelect(boss, deps(), selectEnvelope(seed));
      expect(result.created).toBe(true);
      const selection = await withPariwarScope(pool, seed.pariwarId, (db) =>
        claim.getPeerMeshSelectionByClaim(db, ids.pariwarId(seed.pariwarId), ids.claimId(seed.claimCaseId)),
      );
      expect(selection!.selectedMemberIds).not.toContain(ids.memberId(claimantId));
      expect(selection!.candidateSnapshot.map((c) => c.memberId)).not.toContain(claimantId);
      // 6 eligible candidates remained (7 minus the excluded claimant) — still selects 5.
      expect(selection!.candidateSnapshot).toHaveLength(6);
    } finally {
      await cleanup(seed);
    }
  });

  it('zero-candidate disposition (review decision): resolves immediately to skipped, no pinged event, claim stays documents_pending', async () => {
    // A deceased with NO other active members in the Pariwar at all.
    const seed = await seedClaim([]);
    const { boss, sends } = fakeBoss();
    try {
      const result = await runClaimPeerMeshSelect(boss, deps(), selectEnvelope(seed));
      expect(result.created).toBe(true);
      expect(result.selectedCount).toBe(0);

      const selection = await withPariwarScope(pool, seed.pariwarId, (db) =>
        claim.getPeerMeshSelectionByClaim(db, ids.pariwarId(seed.pariwarId), ids.claimId(seed.claimCaseId)),
      );
      expect(selection!.outcome).toBe('skipped');
      expect(selection!.skipReason).toBe(claim.PEER_MESH_SKIP_REASON_NO_ELIGIBLE_CANDIDATES);
      expect(selection!.selectedMemberIds).toEqual([]);

      expect(await eventCount(seed.claimCaseId, 'claim.peer_mesh_pinged')).toBe(0);
      expect(await claimState(seed.claimCaseId)).toBe('documents_pending'); // never advanced

      const pings = await withPariwarScope(pool, seed.pariwarId, (db) =>
        claim.getPeerMeshPingIntentsBySelection(db, ids.pariwarId(seed.pariwarId), selection!.selectionId),
      );
      expect(pings).toHaveLength(0);

      // No window job — nothing to wait for once already resolved.
      expect(sends).toHaveLength(0);
    } finally {
      await cleanup(seed);
    }
  });

  it('response guards: rejects a SECOND response from an already-responded member (transactional dedup)', async () => {
    const seed = await seedClaim(sevenCandidates());
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

  it('response guards: rejects a response once the AR-61 outcome has already resolved', async () => {
    const seed = await seedClaim(sevenCandidates());
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
      const member = selection!.selectedMemberIds[0]!;
      await expect(
        withPariwarScope(pool, seed.pariwarId, (_db, client) =>
          claim.recordPeerMeshResponse(client, {
            claimCaseId: ids.claimId(seed.claimCaseId),
            pariwarId: ids.pariwarId(seed.pariwarId),
            responderMemberId: member,
            response: 'confirmed',
          }),
        ),
      ).rejects.toBeInstanceOf(claim.PeerMeshWindowResolvedError);
      expect(await eventCount(seed.claimCaseId, 'claim.peer_mesh_responded')).toBe(0);
    } finally {
      await cleanup(seed);
    }
  });

  it('AR-61 outcome is MONOTONIC: a stray re-fire after resolution never flips it', async () => {
    const seed = await seedClaim(sevenCandidates());
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
    const seed = await seedClaim(sevenCandidates());
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
    const seed = await seedClaim(sevenCandidates());
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
    const seed = await seedClaim(sevenCandidates());
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
    await withPariwarScope(pool, pariwarId, async (_db, client) => {
      await client.query(
        `INSERT INTO members (member_id, pariwar_id, state, state_event_version, created_at) VALUES ($1,$2,'active',1,$3)`,
        [deceasedMemberId, pariwarId, '2020-01-01T00:00:00Z'],
      );
      await client.query(
        `INSERT INTO members (member_id, pariwar_id, state, state_event_version, created_at) VALUES ($1,$2,'active',1,$3)`,
        [candidateId, pariwarId, '2020-02-01T00:00:00Z'],
      );
      const common = {
        claimCaseId: ids.claimId(claimCaseId),
        pariwarId: ids.pariwarId(pariwarId),
        deceasedMemberId: ids.memberId(deceasedMemberId),
        intakeChannels: ['member_app'] as const,
        claimantActorId: null,
        actorId: null,
      };
      await claim.projectClaimState(client, {
        ...common,
        eventType: 'claim.intake_initiated',
        payload: {
          from_state: null, to_state: 'intake_pending', trigger: 'seed', actor: 'system',
          deceased_member_id: deceasedMemberId, intake_channel: 'member_app', claimant_actor_id: null,
        },
      });
      await claim.projectClaimState(client, {
        ...common,
        eventType: 'claim.intake_converged',
        payload: { from_state: 'intake_pending', to_state: 'intake_converged', trigger: 'seed', actor: 'system' },
      });
      await claim.projectClaimState(client, {
        ...common,
        eventType: 'claim.documents_received',
        payload: { from_state: 'intake_converged', to_state: 'documents_pending', trigger: 'seed', actor: 'system' },
      });
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
    }
  }, 30_000);
});
