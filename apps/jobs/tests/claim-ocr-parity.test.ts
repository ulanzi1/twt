// Death-cert OCR + parity job — live-DB integration (Story 6.5, Task 4/Task 7).
//
// Drives runClaimOcrParity against real Postgres (:5433) with a fake KMS, a fake in-memory
// object store, and a controllable OCR provider double. The worker opens its own
// withPariwarScope tx + commits (as in production), so seed data is COMMITTED and cleaned up
// by deleting the claim/member (FK cascade sweeps claim_documents / member_kyc_profiles).
// Asserts (memory [[project_live_db_test_gotchas]] — membership, never DROP SCHEMA):
//   · match + advance: claim_documents row persisted (ciphertext decrypts to the OCR values),
//     parity_outcome='match', verifier_review_required=false, claim → documents_pending,
//     one claim.documents_received event.
//   · idempotency: run twice → ONE doc row, ONE event, state stable.
//   · OCR failure → ambiguous + verifier review, but the claim STILL advances (AC6).
//   · no KYC source → ambiguous, not mismatch (AR-61).
//   · cross-tenant RLS: a claim document is invisible under another Pariwar's scope.

import { randomUUID } from 'node:crypto';

import type { DeathCertificateFields, OcrProvider } from '@twt/contracts';
import { OcrProviderError } from '@twt/contracts';
import {
  claim,
  createDb,
  encryption,
  ids,
  withPariwarScope,
  type CreatedDb,
} from '@twt/domain';
import { createInMemoryClaimDocumentStorage } from '@twt/platform-adapters';
import type { JobEnvelope } from '@twt/queue';
import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  runClaimOcrParity,
  type ClaimOcrParityDeps,
  type ClaimOcrParityPayload,
} from '../src/claim-ocr-parity.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);

const KMS = encryption.createFakeKmsProvider({
  kekBytes: new Uint8Array(32).fill(7),
  hmacKeyBytes: new Uint8Array(32).fill(9),
});
const KEK_REF = { resourceName: 'fake:ocr-test-kek' };
const NOW = new Date('2026-07-09T00:00:00Z');

const MATCHING_FIELDS: DeathCertificateFields = {
  deceasedName: 'Ravi Kumar',
  dateOfBirth: '1955-03-01',
  dateOfDeath: '2026-06-30',
  issuingAuthority: 'Municipal Corporation',
  certificateNumber: 'DC-12345',
  certificateIssueDate: '2026-07-01',
};

/** An OcrProvider double that returns fixed fields at a fixed confidence. */
function providerReturning(fields: DeathCertificateFields, confidence: number): OcrProvider {
  return {
    async extract() {
      return { documentType: 'death_certificate', fields, confidence };
    },
  };
}

/** An OcrProvider double that always throws (simulates a provider failure — AC6). */
function providerThrowing(): OcrProvider {
  return {
    async extract() {
      throw new OcrProviderError('unreadable_document', 'simulated failure');
    },
  };
}

describe.skipIf(!hasDatabase)('claim OCR + parity job — live DB (:5433)', () => {
  let pool: pg.Pool;
  let created: CreatedDb;

  beforeAll(() => {
    created = createDb(DATABASE_URL!, { max: 4, ssl: false });
    pool = created.pool;
  });
  afterAll(() => pool.end());

  function deps(ocr: OcrProvider): ClaimOcrParityDeps {
    return {
      pool,
      storage: seededStorage(),
      ocr,
      kms: KMS,
      kekRef: KEK_REF,
      now: () => NOW,
      onAlarm: () => undefined,
    };
  }

  /** A fresh in-memory store pre-loaded with the document bytes at the well-known key. */
  function seededStorage() {
    const s = createInMemoryClaimDocumentStorage();
    return s;
  }

  /** Seed a committed claim in `intake_converged` (+ optional KYC profile). Returns ids/key. */
  async function seedClaim(opts: { withKyc: boolean }): Promise<{
    pariwarId: string;
    deceasedMemberId: string;
    claimCaseId: string;
    objectKey: string;
  }> {
    const pariwarId = randomUUID();
    const deceasedMemberId = randomUUID();
    const claimCaseId = randomUUID();
    const objectKey = `pariwar/${pariwarId}/claim/${claimCaseId}/death_certificate`;

    await withPariwarScope(pool, pariwarId, async (_db, client) => {
      // A member row (KYC profile FK target). state/version are arbitrary for this test.
      await client.query(
        `INSERT INTO members (member_id, pariwar_id, state, state_event_version) VALUES ($1, $2, 'active', 4)`,
        [deceasedMemberId, pariwarId],
      );
      if (opts.withKyc) {
        const nameCt = encryption.serializeEnvelope(
          await encryption.encryptTier1(
            Buffer.from(MATCHING_FIELDS.deceasedName!, 'utf-8'),
            { pariwarId, fieldClass: 'member_kyc' },
            KMS,
            KEK_REF,
          ),
        );
        const dobCt = encryption.serializeEnvelope(
          await encryption.encryptTier1(
            Buffer.from(MATCHING_FIELDS.dateOfBirth!, 'utf-8'),
            { pariwarId, fieldClass: 'member_kyc' },
            KMS,
            KEK_REF,
          ),
        );
        await client.query(
          `INSERT INTO member_kyc_profiles
             (member_id, pariwar_id, name_ciphertext, dob_ciphertext, verification_strength, source)
           VALUES ($1, $2, $3, $4, 'self_declared', 'manual')`,
          [deceasedMemberId, pariwarId, nameCt, dobCt],
        );
      }
      // Seed the claim to intake_converged via the real projector (builds events v1 + v2).
      await claim.projectClaimState(client, {
        claimCaseId: ids.claimId(claimCaseId),
        pariwarId: ids.pariwarId(pariwarId),
        deceasedMemberId: ids.memberId(deceasedMemberId),
        intakeChannels: ['member_app'],
        claimantActorId: null,
        eventType: 'claim.intake_initiated',
        payload: {
          from_state: null,
          to_state: 'intake_pending',
          trigger: 'seed',
          actor: 'system',
          deceased_member_id: deceasedMemberId,
          intake_channel: 'member_app',
          claimant_actor_id: null,
        },
        actorId: null,
      });
      await claim.projectClaimState(client, {
        claimCaseId: ids.claimId(claimCaseId),
        pariwarId: ids.pariwarId(pariwarId),
        deceasedMemberId: ids.memberId(deceasedMemberId),
        intakeChannels: ['member_app'],
        claimantActorId: null,
        eventType: 'claim.intake_converged',
        payload: { from_state: 'intake_pending', to_state: 'intake_converged', trigger: 'seed', actor: 'system' },
        actorId: null,
      });
    });
    return { pariwarId, deceasedMemberId, claimCaseId, objectKey };
  }

  function envelope(
    seed: { pariwarId: string; deceasedMemberId: string; claimCaseId: string; objectKey: string },
    claimDocumentId: string,
  ): JobEnvelope<ClaimOcrParityPayload> {
    return {
      requestId: randomUUID(),
      pariwarId: seed.pariwarId,
      actorId: null,
      traceId: randomUUID(),
      payload: {
        claimDocumentId,
        claimCaseId: seed.claimCaseId,
        deceasedMemberId: seed.deceasedMemberId,
        documentType: 'death_certificate',
        storageObjectKey: seed.objectKey,
        contentType: 'application/pdf',
        byteSize: 4,
      },
    };
  }

  async function cleanup(seed: { claimCaseId: string; deceasedMemberId: string }): Promise<void> {
    // claim_documents cascades on the claims delete; events_log is append-only (AR-8), so its
    // rows are left orphaned (harmless — fresh UUIDs per test; assert membership, not counts).
    await pool.query(`DELETE FROM claims WHERE claim_case_id = $1`, [seed.claimCaseId]);
    await pool.query(`DELETE FROM members WHERE member_id = $1`, [seed.deceasedMemberId]);
  }

  async function docRow(claimCaseId: string) {
    const r = await pool.query(
      `SELECT * FROM claim_documents WHERE claim_case_id = $1`,
      [claimCaseId],
    );
    return r.rows;
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

  it('match: persists the doc row (ciphertext decrypts to OCR values) + advances to documents_pending', async () => {
    const seed = await seedClaim({ withKyc: true });
    const d = deps(providerReturning(MATCHING_FIELDS, 1));
    // Pre-load the object bytes the job fetches by key.
    await d.storage.put(seed.objectKey, new Uint8Array([1, 2, 3, 4]), { contentType: 'application/pdf' });
    try {
      const result = await runClaimOcrParity(d, envelope(seed, randomUUID()));
      expect(result.outcome).toBe('match');

      const rows = await docRow(seed.claimCaseId);
      expect(rows).toHaveLength(1);
      expect(rows[0].parity_outcome).toBe('match');
      expect(rows[0].verifier_review_required).toBe(false);
      expect(rows[0].storage_object_key).toBe(seed.objectKey);
      // The extracted name is Tier-1 ciphertext (NOT the plaintext) and decrypts back.
      expect(rows[0].deceased_name_ciphertext).not.toContain('Ravi');
      const name = Buffer.from(
        await encryption.decryptTier1(
          encryption.parseEnvelope(rows[0].deceased_name_ciphertext),
          { pariwarId: seed.pariwarId, fieldClass: 'claim_document' },
          KMS,
          KEK_REF,
        ),
      ).toString('utf-8');
      expect(name).toBe('Ravi Kumar');

      expect(await claimState(seed.claimCaseId)).toBe('documents_pending');
      expect(await eventCount(seed.claimCaseId, 'claim.documents_received')).toBe(1);

      // The verifier read model (Task 6) bundles the claim + documents + deceased KYC in one read.
      const review = await withPariwarScope(pool, seed.pariwarId, async (db) =>
        claim.getClaimDocumentReview(db, ids.pariwarId(seed.pariwarId), ids.claimId(seed.claimCaseId)),
      );
      expect(review).not.toBeNull();
      expect(review!.documents).toHaveLength(1);
      expect(review!.deceasedKyc).not.toBeNull();
      expect(review!.claim.currentState).toBe('documents_pending');
    } finally {
      await cleanup(seed);
    }
  });

  it('idempotency: running the job twice yields ONE doc row, ONE event, stable state', async () => {
    const seed = await seedClaim({ withKyc: true });
    const claimDocumentId = randomUUID();
    const d = deps(providerReturning(MATCHING_FIELDS, 1));
    await d.storage.put(seed.objectKey, new Uint8Array([1, 2, 3, 4]), { contentType: 'application/pdf' });
    try {
      await runClaimOcrParity(d, envelope(seed, claimDocumentId));
      await runClaimOcrParity(d, envelope(seed, claimDocumentId));
      expect(await docRow(seed.claimCaseId)).toHaveLength(1);
      expect(await eventCount(seed.claimCaseId, 'claim.documents_received')).toBe(1);
      expect(await claimState(seed.claimCaseId)).toBe('documents_pending');
    } finally {
      await cleanup(seed);
    }
  });

  it('OCR failure → ambiguous + verifier review, but the claim STILL advances (AC6 non-blocking)', async () => {
    const seed = await seedClaim({ withKyc: true });
    const d = deps(providerThrowing());
    await d.storage.put(seed.objectKey, new Uint8Array([1, 2, 3, 4]), { contentType: 'application/pdf' });
    try {
      const result = await runClaimOcrParity(d, envelope(seed, randomUUID()));
      expect(result.outcome).toBe('ambiguous');
      const rows = await docRow(seed.claimCaseId);
      expect(rows[0].parity_outcome).toBe('ambiguous');
      expect(rows[0].verifier_review_required).toBe(true);
      // Non-blocking: the claim still advanced.
      expect(await claimState(seed.claimCaseId)).toBe('documents_pending');
      expect(await eventCount(seed.claimCaseId, 'claim.documents_received')).toBe(1);
    } finally {
      await cleanup(seed);
    }
  });

  it('no KYC source → ambiguous (AR-61), not mismatch', async () => {
    const seed = await seedClaim({ withKyc: false });
    const d = deps(providerReturning(MATCHING_FIELDS, 1));
    await d.storage.put(seed.objectKey, new Uint8Array([1, 2, 3, 4]), { contentType: 'application/pdf' });
    try {
      const result = await runClaimOcrParity(d, envelope(seed, randomUUID()));
      expect(result.outcome).toBe('ambiguous');
      expect((await docRow(seed.claimCaseId))[0].verifier_review_required).toBe(true);
    } finally {
      await cleanup(seed);
    }
  });

  it('cross-tenant RLS: a claim document is invisible under another Pariwar scope', async () => {
    const seed = await seedClaim({ withKyc: true });
    const d = deps(providerReturning(MATCHING_FIELDS, 1));
    await d.storage.put(seed.objectKey, new Uint8Array([1, 2, 3, 4]), { contentType: 'application/pdf' });
    try {
      await runClaimOcrParity(d, envelope(seed, randomUUID()));
      const otherPariwar = randomUUID();
      const visible = await withPariwarScope(pool, otherPariwar, async (db) =>
        claim.getClaimDocuments(db, ids.pariwarId(otherPariwar), ids.claimId(seed.claimCaseId)),
      );
      expect(visible).toHaveLength(0);
    } finally {
      await cleanup(seed);
    }
  });
});
