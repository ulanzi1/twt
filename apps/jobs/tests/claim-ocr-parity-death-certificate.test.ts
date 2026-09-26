// Story 6.21a — the death-certificate UPLOAD path through the REAL OCR job (AC3, AC8(iv), AC8(viii)).
//
// `2026-09-25-243` (option C): every certificate is kept for as long as claim records are kept. Drives
// `runClaimOcrParity` against real Postgres (:5433) with the in-memory object store and an OCR double — the
// dirty input the production path sees ([[feedback_story_validate_footguns]]: parity = run DIRTY input):
//   · a REPLACEMENT after a rejection: a new upload row, the OLD object still readable, the rejected review no
//     longer current, ⛔ no `documents_received`, ⛔ no peer-mesh select;
//   · OUT OF ORDER: an older upload's job landing after a newer one's is KEPT but ⛔ not made current (T2);
//   · a RETRY writes exactly ONE upload row; a FIRST-upload race between two handlers — run CONCURRENTLY —
//     breaks ⛔ no FK;
//   · ⭐ `2026-09-26-246` §1 (superseding `-245` §2) — under the lock, a late job never displaces an ACCEPTED
//     certificate (in the window, or after it — approval / denial), while an UNREVIEWED current certificate IS
//     replaced by the family's newer one; a TIE on the handler's clock keeps the current one; a kept-but-not-
//     current upload is AUDITED by name (`-246` §5); a retry of the current upload rewrites nothing (`-246` §4);
//   · ⭐ `-245` §1 — each upload row keeps ITS OWN parity verdict, so a replacement never erases it;
//   · TOLERANCE: a payload with ⛔ no `uploadId` writes ⛔ no upload row;
//   · ⭐ AC8(viii) — a review HOLDING the claim row makes the job WAIT (proved with `pg_blocking_pids`); the
//     job's upload then arrives after it (the review REJECTED the current one) and is `not_reviewed`. And a
//     review against an upload the job has
//     already replaced is refused `stale_certificate`.
// Each test mints its own tenant and cleans up by deleting its claim (the cascade sweeps the documents, uploads
// and reviews — the append-only triggers exempt a cascade).

import { randomUUID } from 'node:crypto';

import type { DeathCertificateFields, OcrProvider } from '@twt/contracts';
import {
  bindScopedDb,
  claim,
  createDb,
  encryption,
  ids,
  setPariwarScope,
  withPariwarScope,
  type CreatedDb,
} from '@twt/domain';
import { createInMemoryClaimDocumentStorage } from '@twt/platform-adapters';
import type { JobEnvelope } from '@twt/queue';
import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { runClaimOcrParity, type ClaimOcrParityDeps, type ClaimOcrParityPayload } from '../src/claim-ocr-parity.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);

const KMS = encryption.createFakeKmsProvider({
  kekBytes: new Uint8Array(32).fill(7),
  hmacKeyBytes: new Uint8Array(32).fill(9),
});
const KEK_REF = { resourceName: 'fake:ocr-dc-test-kek' };

const FIELDS: DeathCertificateFields = {
  deceasedName: 'Ravi Kumar',
  dateOfBirth: '1955-03-01',
  dateOfDeath: '2026-06-30',
  issuingAuthority: 'Municipal Corporation',
  certificateNumber: 'DC-12345',
  certificateIssueDate: '2026-07-01',
};
const OCR: OcrProvider = {
  async extract() {
    return { documentType: 'death_certificate', fields: FIELDS, confidence: 1 };
  },
};

interface Seed {
  pariwarId: string;
  deceasedMemberId: string;
  claimCaseId: string;
  claimDocumentId: string;
}

describe.skipIf(!hasDatabase)('Story 6.21a — death-certificate uploads through the real OCR job (:5433)', { timeout: 20000 }, () => {
  let pool: pg.Pool;
  let created: CreatedDb;
  const storage = createInMemoryClaimDocumentStorage();
  const peerMeshCalls: string[] = [];
  const seeds: Seed[] = [];

  beforeAll(() => {
    created = createDb(DATABASE_URL!, { max: 6, ssl: false });
    pool = created.pool;
  });
  afterAll(async () => {
    for (const s of seeds) {
      await pool.query('DELETE FROM claims WHERE claim_case_id = $1', [s.claimCaseId]).catch(() => undefined);
      await pool.query('DELETE FROM members WHERE member_id = $1', [s.deceasedMemberId]).catch(() => undefined);
    }
    await pool.end();
  });

  const deps: (ocr?: OcrProvider) => ClaimOcrParityDeps = (ocr = OCR) => ({
    pool,
    storage,
    ocr,
    kms: KMS,
    kekRef: KEK_REF,
    onAlarm: () => undefined,
    enqueuePeerMeshSelect: async ({ claimCaseId }) => {
      peerMeshCalls.push(claimCaseId);
    },
  });

  async function emit(client: pg.PoolClient, s: Seed, from: string | null, to: string, eventType: string, extra: Record<string, unknown> = {}) {
    await claim.projectClaimState(client, {
      claimCaseId: ids.claimId(s.claimCaseId),
      pariwarId: ids.pariwarId(s.pariwarId),
      deceasedMemberId: ids.memberId(s.deceasedMemberId),
      intakeChannels: ['member_app'],
      claimantActorId: null,
      eventType: eventType as never,
      payload: { from_state: from, to_state: to, trigger: 'seed', actor: 'system', ...extra } as never,
      actorId: null,
    });
  }

  /** A committed claim in `intake_converged`, fresh tenant. */
  async function seedClaim(): Promise<Seed> {
    const s: Seed = {
      pariwarId: randomUUID(),
      deceasedMemberId: randomUUID(),
      claimCaseId: randomUUID(),
      claimDocumentId: randomUUID(),
    };
    seeds.push(s);
    await withPariwarScope(pool, s.pariwarId, async (_db, client) => {
      await client.query(
        `INSERT INTO members (member_id, pariwar_id, state, state_event_version) VALUES ($1, $2, 'active', 4)`,
        [s.deceasedMemberId, s.pariwarId],
      );
      await emit(client, s, null, 'intake_pending', 'claim.intake_initiated', {
        deceased_member_id: s.deceasedMemberId,
        intake_channel: 'member_app',
        claimant_actor_id: null,
      });
      await emit(client, s, 'intake_pending', 'intake_converged', 'claim.intake_converged');
    });
    return s;
  }

  /** Move a `documents_pending` claim into the review window (`verifier_review`). */
  async function intoReview(s: Seed) {
    await withPariwarScope(pool, s.pariwarId, async (_db, client) => {
      await emit(client, s, 'documents_pending', 'verification_in_progress', 'claim.peer_mesh_pinged', {
        selected_member_ids: [randomUUID()],
        metric_id: 'district_cohort_v1',
        metric_version: 1,
      });
      await emit(client, s, 'verification_in_progress', 'verifier_review', 'claim.verifier_reviewing');
    });
  }

  /** What the upload HANDLER does: a fresh upload id + its own object, then the envelope. */
  async function upload(
    s: Seed,
    opts: { uploadedAt?: Date; claimDocumentId?: string; withUploadId?: boolean } = {},
  ): Promise<{ env: JobEnvelope<ClaimOcrParityPayload>; uploadId: string; key: string }> {
    const uploadId = randomUUID();
    const cdid = opts.claimDocumentId ?? s.claimDocumentId;
    const withUploadId = opts.withUploadId !== false;
    const key = `pariwar/${s.pariwarId}/claim/${s.claimCaseId}/death_certificate/${cdid}` + (withUploadId ? `/${uploadId}` : '');
    await storage.put(key, new Uint8Array([uploadId.charCodeAt(0), 2, 3, 4]), { contentType: 'application/pdf' });
    const env: JobEnvelope<ClaimOcrParityPayload> = {
      requestId: randomUUID(),
      pariwarId: s.pariwarId,
      actorId: randomUUID(),
      traceId: randomUUID(),
      payload: {
        claimDocumentId: cdid,
        claimCaseId: s.claimCaseId,
        deceasedMemberId: s.deceasedMemberId,
        documentType: 'death_certificate',
        storageObjectKey: key,
        contentType: 'application/pdf',
        byteSize: 4,
        ...(withUploadId
          ? { uploadId, uploadedAt: (opts.uploadedAt ?? new Date()).toISOString(), channel: 'helpline' as const }
          : {}),
      },
    };
    return { env, uploadId, key };
  }

  async function snapshot(s: Seed) {
    return withPariwarScope(pool, s.pariwarId, (db) =>
      claim.readDeathCertificateSnapshot(db, ids.pariwarId(s.pariwarId), ids.claimId(s.claimCaseId)),
    );
  }

  async function review(s: Seed, token: string, verdict: 'accepted' | 'rejected', client?: pg.PoolClient) {
    const run = async (c: pg.PoolClient) => {
      const snap = await claim.readDeathCertificateSnapshot(
        bindScopedDb(c),
        ids.pariwarId(s.pariwarId),
        ids.claimId(s.claimCaseId),
      );
      return claim.recordDeathCertificateReview(c, {
        claimCaseId: ids.claimId(s.claimCaseId),
        pariwarId: ids.pariwarId(s.pariwarId),
        verdict,
        certificateToken: token,
        acceptedDate: verdict === 'accepted' ? '2026-06-30' : null,
        acceptedDateCiphertext: verdict === 'accepted' ? 'enc:v1:d' : null,
        rejectionReason: verdict === 'rejected' ? 'date_of_death_unclear' : null,
        noteCiphertext: 'enc:v1:n',
        expectedLiveReviewId: (snap.liveReview?.reviewId as string | undefined) ?? null,
        actorId: randomUUID(),
        actorDisplay: 'A District Admin',
        actor: 'operator',
      });
    };
    if (client) return run(client);
    return withPariwarScope(pool, s.pariwarId, (_db, c) => run(c));
  }

  async function uploadRows(s: Seed) {
    const r = await pool.query<{ upload_id: string; claim_document_id: string; storage_object_key: string; channel: string }>(
      'SELECT upload_id, claim_document_id, storage_object_key, channel FROM claim_death_certificate_uploads WHERE claim_case_id = $1 ORDER BY uploaded_at',
      [s.claimCaseId],
    );
    return r.rows;
  }
  async function verdicts(s: Seed) {
    const r = await pool.query<{ upload_id: string; parity_outcome: string | null; parity_flags: Record<string, string> | null; ocr_confidence: number | null }>(
      'SELECT upload_id, parity_outcome, parity_flags, ocr_confidence FROM claim_death_certificate_uploads WHERE claim_case_id = $1',
      [s.claimCaseId],
    );
    return new Map(r.rows.map((row) => [row.upload_id, row]));
  }
  async function currentKey(s: Seed) {
    const r = await pool.query<{ storage_object_key: string }>(
      "SELECT storage_object_key FROM claim_documents WHERE claim_case_id = $1 AND document_type = 'death_certificate'",
      [s.claimCaseId],
    );
    return r.rows[0]?.storage_object_key ?? null;
  }
  async function keptAudits(uploadId: string) {
    const r = await pool.query<{ action: string }>(
      'SELECT action FROM audit_log_entries WHERE resource_locator = $1',
      [`death_certificate_upload:${uploadId.toLowerCase()}`],
    );
    return r.rows.map((row) => row.action);
  }
  async function eventCount(s: Seed, type: string) {
    const r = await pool.query<{ n: number }>('SELECT count(*)::int AS n FROM events_log WHERE stream_id = $1 AND event_type = $2', [s.claimCaseId, type]);
    return r.rows[0]!.n;
  }

  it('⭐⭐ AC3 — a REPLACEMENT after a rejection: kept as a NEW upload, the OLD object still readable, the rejection no longer current, ⛔ no documents_received, ⛔ no peer-mesh select', async () => {
    const s = await seedClaim();
    const a = await upload(s, { uploadedAt: new Date(Date.now() - 60_000) });
    await runClaimOcrParity(deps(), a.env);
    expect(peerMeshCalls).toContain(s.claimCaseId); // the FIRST upload triggers the mesh, as before
    await intoReview(s);
    await review(s, a.uploadId, 'rejected');
    expect(claim.deathCertificateStatus(await snapshot(s))).toBe('rejected');
    const meshBefore = peerMeshCalls.filter((c) => c === s.claimCaseId).length;
    const pingsBefore = await eventCount(s, 'claim.peer_mesh_pinged');

    const b = await upload(s);
    await runClaimOcrParity(deps(), b.env);

    const rows = await uploadRows(s);
    expect(rows.map((r) => r.upload_id)).toEqual([a.uploadId, b.uploadId]);
    expect(rows.map((r) => r.claim_document_id)).toEqual([s.claimDocumentId, s.claimDocumentId]);
    expect(rows[1]!.channel).toBe('helpline');
    // ⭐ invariant 3 — the OLD certificate's bytes are still there (⛔ never overwritten).
    expect(a.key).not.toBe(b.key);
    expect(await storage.getBytes(a.key)).toBeDefined();
    const snap = await snapshot(s);
    expect(snap.currentUploadId).toBe(b.uploadId);
    expect(snap.currentReview).toBeNull(); // the rejection judged A, ⛔ not B
    expect(claim.deathCertificateStatus(snap)).toBe('awaiting_review');
    expect(await eventCount(s, 'claim.documents_received')).toBe(1);
    expect(peerMeshCalls.filter((c) => c === s.claimCaseId).length).toBe(meshBefore);
    expect(await eventCount(s, 'claim.peer_mesh_pinged')).toBe(pingsBefore);
  });

  it('⭐ T2 — OUT OF ORDER: an older upload whose job lands AFTER a newer one’s is KEPT but ⛔ not made current', async () => {
    const s = await seedClaim();
    const older = await upload(s, { uploadedAt: new Date(Date.now() - 120_000) });
    const newer = await upload(s, { uploadedAt: new Date(Date.now() - 60_000) });
    await runClaimOcrParity(deps(), newer.env); // the newer job first …
    await runClaimOcrParity(deps(), older.env); // … the older one late
    expect((await uploadRows(s)).map((r) => r.upload_id).sort()).toEqual([older.uploadId, newer.uploadId].sort());
    const doc = await pool.query('SELECT storage_object_key FROM claim_documents WHERE claim_case_id = $1', [s.claimCaseId]);
    expect(doc.rows[0].storage_object_key).toBe(newer.key);
    expect((await snapshot(s)).currentUploadId).toBe(newer.uploadId);
    expect(await keptAudits(older.uploadId)).toEqual(['claim_document.death_certificate_kept_not_current']); // `-246` §5
  });

  it('⭐ a RETRIED job writes exactly ONE upload row, and the current certificate is unchanged', async () => {
    const s = await seedClaim();
    const a = await upload(s);
    await runClaimOcrParity(deps(), a.env);
    await runClaimOcrParity(deps(), a.env);
    expect((await uploadRows(s)).map((r) => r.upload_id)).toEqual([a.uploadId]);
    expect((await snapshot(s)).currentUploadId).toBe(a.uploadId);
  });

  it('⭐ a FIRST-upload race: two handlers minted DIFFERENT row ids and their jobs run CONCURRENTLY — both uploads reference the ONE surviving row (⛔ no FK break)', async () => {
    const s = await seedClaim();
    const first = await upload(s, { claimDocumentId: randomUUID(), uploadedAt: new Date(Date.now() - 60_000) });
    const second = await upload(s, { claimDocumentId: randomUUID() });
    // Two live connections (each job opens its own scope tx on the pool) — the claim-row lock serialises them.
    await Promise.all([runClaimOcrParity(deps(), first.env), runClaimOcrParity(deps(), second.env)]);
    const doc = await pool.query<{ claim_document_id: string }>('SELECT claim_document_id FROM claim_documents WHERE claim_case_id = $1', [s.claimCaseId]);
    expect(doc.rows).toHaveLength(1);
    const rows = await uploadRows(s);
    expect(rows).toHaveLength(2);
    expect(new Set(rows.map((r) => r.claim_document_id))).toEqual(new Set([doc.rows[0]!.claim_document_id]));
    // Whichever job committed first minted the surviving row; either way it is ONE of the two handlers' ids,
    // and the LATER upload is current (forward-only, whatever the commit order).
    expect([first.env.payload.claimDocumentId, second.env.payload.claimDocumentId]).toContain(doc.rows[0]!.claim_document_id);
    expect(await currentKey(s)).toBe(second.key);
  });

  it('TOLERANCE — a payload with ⛔ no `uploadId` (enqueued before 6.21a) writes ⛔ no upload row and keeps the old behaviour', async () => {
    const s = await seedClaim();
    const legacy = await upload(s, { withUploadId: false });
    await runClaimOcrParity(deps(), legacy.env);
    expect(await uploadRows(s)).toEqual([]);
    const snap = await snapshot(s);
    expect(snap.certificateRowExists).toBe(true);
    expect(snap.currentUploadId).toBeNull(); // T12 — no token: never reviewable
  });

  it('⭐⭐ AC8(viii) — a review HOLDING the claim row makes the job WAIT; the job’s upload then lands after it and is `not_reviewed`', async () => {
    // The holder REJECTS the current certificate, so the waiting upload is one D6 allows (`-245` §2): had it
    // ACCEPTED, the job would keep the upload but ⛔ not make it current — the next test.
    const s = await seedClaim();
    const a = await upload(s, { uploadedAt: new Date(Date.now() - 60_000) });
    await runClaimOcrParity(deps(), a.env);
    await intoReview(s);
    const b = await upload(s);

    const holder = await pool.connect();
    let holderOpen = true;
    try {
      await holder.query('BEGIN');
      await setPariwarScope(holder, s.pariwarId);
      await review(s, a.uploadId, 'rejected', holder);
      const holderPid = Number((await holder.query<{ pid: number }>('SELECT pg_backend_pid() AS pid')).rows[0]!.pid);

      const job = runClaimOcrParity(deps(), b.env);
      // ⭐ "WAITS" is proved from the server: some backend is blocked BY the holder.
      let waited = false;
      for (const deadline = Date.now() + 5000; Date.now() < deadline && !waited; ) {
        const r = await pool.query('SELECT 1 FROM pg_stat_activity WHERE $1 = ANY(pg_blocking_pids(pid))', [holderPid]);
        waited = r.rows.length > 0;
        if (!waited) await new Promise((res) => setTimeout(res, 25));
      }
      await holder.query('COMMIT');
      holderOpen = false;
      await job;
      expect(waited, 'the job did not wait for the review').toBe(true);
    } finally {
      if (holderOpen) await holder.query('ROLLBACK').catch(() => undefined);
      holder.release();
    }
    const snap = await snapshot(s);
    expect(snap.currentUploadId).toBe(b.uploadId);
    expect(claim.deathCertificateStatus(snap)).toBe('awaiting_review'); // `not_reviewed` at the gate
    expect(snap.liveReview?.uploadId).toBe(a.uploadId);
  });

  it('⭐ …and the other order: a review against an upload the job has already replaced is refused `stale_certificate`', async () => {
    const s = await seedClaim();
    const a = await upload(s, { uploadedAt: new Date(Date.now() - 60_000) });
    await runClaimOcrParity(deps(), a.env);
    await intoReview(s);
    await review(s, a.uploadId, 'rejected');
    const b = await upload(s);
    await runClaimOcrParity(deps(), b.env);
    await expect(review(s, a.uploadId, 'accepted')).rejects.toSatisfy(
      (err: unknown) => err instanceof claim.DeathCertificateReviewRefusedError && err.reason === 'stale_certificate',
    );
  });
  // ── `2026-09-26-245` §2 — D6 RE-APPLIED by the job, under the claim-row lock ───────────────────────────
  it('⭐⭐ `-245` §2 — a job landing AFTER an ACCEPTANCE keeps its upload but ⛔ never displaces the accepted certificate', async () => {
    const s = await seedClaim();
    const a = await upload(s, { uploadedAt: new Date(Date.now() - 180_000) });
    await runClaimOcrParity(deps(), a.env);
    await intoReview(s);
    await review(s, a.uploadId, 'rejected');
    // While A stands rejected, the handler lets BOTH B and C through (its check is lock-free and the upload row
    // only exists once a job has run).
    const b = await upload(s, { uploadedAt: new Date(Date.now() - 120_000) });
    const c = await upload(s, { uploadedAt: new Date(Date.now() - 60_000) });
    await runClaimOcrParity(deps(), b.env);
    await review(s, b.uploadId, 'accepted');
    // C's job lands late (a queue delay, a retry) — strictly later on the clock, but B is ACCEPTED.
    await runClaimOcrParity(deps(), c.env);
    const snap = await snapshot(s);
    expect(snap.currentUploadId).toBe(b.uploadId);
    expect(claim.deathCertificateStatus(snap)).toBe('accepted');
    expect(await currentKey(s)).toBe(b.key);
    expect((await uploadRows(s)).map((r) => r.upload_id)).toEqual([a.uploadId, b.uploadId, c.uploadId]); // C is KEPT
    expect(await keptAudits(c.uploadId)).toEqual(['claim_document.death_certificate_kept_not_current']); // `-246` §5
  });

  it('⭐⭐ `-246` §1 — AFTER APPROVAL (the claim has left the window): a late job ⛔ never displaces the accepted certificate', async () => {
    const s = await seedClaim();
    const a = await upload(s, { uploadedAt: new Date(Date.now() - 120_000) });
    await runClaimOcrParity(deps(), a.env);
    await intoReview(s);
    const c = await upload(s, { uploadedAt: new Date(Date.now() - 60_000) }); // sent, its job delayed
    await review(s, a.uploadId, 'accepted');
    await withPariwarScope(pool, s.pariwarId, (_db, client) =>
      emit(client, s, 'verifier_review', 'state_trustee_approved', 'claim.r9_outcome', {
        outcome: 'approved',
        clause_id: 'r9-seed',
        clause_version_id: randomUUID(),
        voting_requirement: 'majority',
        approve_count: 3,
        deny_count: 0,
      }),
    );
    await runClaimOcrParity(deps(), c.env);
    const snap = await snapshot(s);
    expect(snap.currentUploadId).toBe(a.uploadId);
    expect(claim.deathCertificateStatus(snap)).toBe('accepted');
    expect(await keptAudits(c.uploadId)).toEqual(['claim_document.death_certificate_kept_not_current']);
  });

  it('⭐ `-246` §1 — outside the window even a REJECTED certificate is ⛔ not replaced by a late job (a denied claim)', async () => {
    const s = await seedClaim();
    const a = await upload(s, { uploadedAt: new Date(Date.now() - 120_000) });
    await runClaimOcrParity(deps(), a.env);
    await intoReview(s);
    await review(s, a.uploadId, 'rejected');
    const c = await upload(s, { uploadedAt: new Date(Date.now() - 60_000) });
    await withPariwarScope(pool, s.pariwarId, (_db, client) => emit(client, s, 'verifier_review', 'denied', 'claim.verifier_denied'));
    await runClaimOcrParity(deps(), c.env);
    expect((await snapshot(s)).currentUploadId).toBe(a.uploadId);
  });

  it('⭐⭐ `-246` §1 — two uploads sent before the first job committed: the NEWER one replaces the UNREVIEWED current certificate (⛔ never stranded)', async () => {
    const s = await seedClaim();
    const a = await upload(s, { uploadedAt: new Date(Date.now() - 180_000) });
    await runClaimOcrParity(deps(), a.env);
    await intoReview(s);
    await review(s, a.uploadId, 'rejected');
    const b = await upload(s, { uploadedAt: new Date(Date.now() - 120_000) });
    const c = await upload(s, { uploadedAt: new Date(Date.now() - 60_000) });
    await runClaimOcrParity(deps(), b.env);
    await runClaimOcrParity(deps(), c.env);
    const snap = await snapshot(s);
    expect(snap.currentUploadId).toBe(c.uploadId); // the family's NEWEST certificate is the one to review
    expect(claim.deathCertificateStatus(snap)).toBe('awaiting_review');
    expect((await uploadRows(s)).map((r) => r.upload_id)).toEqual([a.uploadId, b.uploadId, c.uploadId]); // B is KEPT
    expect(await keptAudits(c.uploadId)).toEqual([]); // made current: ⛔ no kept-not-current line
    // …and a District Admin who was reviewing B is refused, ⛔ never recorded against a replaced certificate.
    await expect(review(s, b.uploadId, 'accepted')).rejects.toSatisfy(
      (err: unknown) => err instanceof claim.DeathCertificateReviewRefusedError && err.reason === 'stale_certificate',
    );
  });

  it('⭐ `-246` §4 — a RETRY of the current upload rewrites ⛔ nothing: its reading stays the one its upload row records', async () => {
    const s = await seedClaim();
    const LOW: OcrProvider = {
      async extract() {
        return { documentType: 'death_certificate', fields: FIELDS, confidence: 0.1 };
      },
    };
    const a = await upload(s);
    await runClaimOcrParity(deps(), a.env); // first run: confidence 1
    await runClaimOcrParity(deps(LOW), a.env); // a redelivery whose OCR reads differently
    const doc = await pool.query<{ ocr_confidence: number }>(
      "SELECT ocr_confidence FROM claim_documents WHERE claim_case_id = $1 AND document_type = 'death_certificate'",
      [s.claimCaseId],
    );
    expect(doc.rows[0]!.ocr_confidence).toBe(1);
    expect((await verdicts(s)).get(a.uploadId)!.ocr_confidence).toBe(1);
  });

  it('⭐ `-245` §2 — a TIE on the handler\'s clock between two DIFFERENT uploads keeps the one already current', async () => {
    const s = await seedClaim();
    const at = new Date(Date.now() - 60_000);
    const first = await upload(s, { uploadedAt: at });
    const second = await upload(s, { uploadedAt: at });
    await runClaimOcrParity(deps(), first.env);
    await runClaimOcrParity(deps(), second.env);
    expect(await currentKey(s)).toBe(first.key); // commit order must ⛔ never decide
    expect((await uploadRows(s)).map((r) => r.upload_id).sort()).toEqual([first.uploadId, second.uploadId].sort());
    // …while a retry of the CURRENT upload re-applies it (idempotent by identity).
    await runClaimOcrParity(deps(), first.env);
    expect(await currentKey(s)).toBe(first.key);
  });

  // ── `2026-09-26-245` §1 — each upload keeps its OWN parity verdict ────────────────────────────────────
  it('⭐ `-245` §1 — a replacement ⛔ never erases the verdict the replaced certificate received', async () => {
    const s = await seedClaim();
    const LOW: OcrProvider = {
      async extract() {
        return { documentType: 'death_certificate', fields: FIELDS, confidence: 0.1 };
      },
    };
    const a = await upload(s, { uploadedAt: new Date(Date.now() - 60_000) });
    await runClaimOcrParity(deps(LOW), a.env); // a poor scan → ambiguous, flagged low confidence
    await intoReview(s);
    await review(s, a.uploadId, 'rejected');
    const b = await upload(s);
    await runClaimOcrParity(deps(), b.env);
    const v = await verdicts(s);
    // (No KYC record is seeded, so both outcomes are `ambiguous`; the CONFIDENCE tells the two verdicts apart.)
    expect(v.get(a.uploadId)).toMatchObject({ parity_outcome: 'ambiguous', ocr_confidence: 0.1 });
    expect(v.get(a.uploadId)!.parity_flags).not.toBeNull();
    expect(v.get(b.uploadId)).toMatchObject({ parity_outcome: 'ambiguous', ocr_confidence: 1 });
    // claim_documents now carries B's verdict — A's survives ONLY on its own upload row.
    const doc = await pool.query<{ ocr_confidence: number }>(
      "SELECT ocr_confidence FROM claim_documents WHERE claim_case_id = $1 AND document_type = 'death_certificate'",
      [s.claimCaseId],
    );
    expect(doc.rows[0]!.ocr_confidence).toBe(1);
  });
});
