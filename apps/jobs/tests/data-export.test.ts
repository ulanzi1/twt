// Data-export build worker + hygiene vacuum — live-DB integration (Story 3.11, Task 9).
//
// Drives runDataExportBuild + runDataExportVacuum against real Postgres (:5433) with a fake KMS. The
// worker opens its own withPariwarScope tx on the pool (as in production), so seed data is COMMITTED
// and cleaned up by deleting the member (FK cascade sweeps the export). Assertions:
//   · build → the row flips to `ready`, artifact_ciphertext is a `enc:v1:` envelope (NOT a readable
//     ZIP), expires_at = ready_at + 24h, and the artifact decrypts back to a valid ZIP (jszip loads it).
//   · a missing row → the worker returns `failed` (no phantom `ready`).
//   · vacuum → zeroes artifact_ciphertext for a consumed row + flips a past-window row to `expired`.

import { randomUUID } from 'node:crypto';

import { createDb, encryption, withPariwarScope, type CreatedDb } from '@twt/domain';
import type { JobEnvelope } from '@twt/queue';
import JSZip from 'jszip';
import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  runDataExportBuild,
  runDataExportVacuum,
  type DataExportBuildDeps,
} from '../src/data-export.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);

function fakeEncryption(): Pick<DataExportBuildDeps, 'kms' | 'kekRef'> {
  return {
    kms: encryption.createFakeKmsProvider({
      kekBytes: new Uint8Array(32).fill(3),
      hmacKeyBytes: new Uint8Array(32).fill(5),
    }),
    kekRef: { resourceName: 'fake:jobs-test-kek' },
  };
}

describe.skipIf(!hasDatabase)('data-export build + vacuum — live DB (:5433)', () => {
  let pool: pg.Pool;
  let created: CreatedDb;

  beforeAll(() => {
    created = createDb(DATABASE_URL!, { max: 4, ssl: false });
    pool = created.pool;
  });
  afterAll(() => pool.end());

  /** Seed an active member + a `pending` data_exports row (committed). Returns ids. */
  async function seedPendingExport(): Promise<{ memberId: string; pariwarId: string; exportId: string }> {
    const memberId = randomUUID();
    const pariwarId = randomUUID();
    let exportId = '';
    // runDataExportVacuum discovers tenants via `SELECT pariwar_id FROM pariwar_passport`
    // (data-export.ts) — without this row the vacuum sweep never visits this test's
    // pariwarId at all, so its seeded data_exports rows are structurally invisible to it.
    await pool.query(
      `INSERT INTO pariwar_passport
         (pariwar_id, display_name_en, display_name_hi, legal_name, branding_bundle, locale_default)
       VALUES ($1, 'Test Pariwar EN', 'परीक्षण परिवार', 'Test Welfare Trust', $2, 'en')
       ON CONFLICT (pariwar_id) DO NOTHING`,
      [pariwarId, JSON.stringify({ logo_url: 'https://x/l.png', primary_color: '#0A3D62', secondary_color: '#FFFFFF' })],
    );
    await withPariwarScope(pool, pariwarId, async (_tx, client) => {
      await client.query(
        `INSERT INTO members (member_id, pariwar_id, state, state_event_version) VALUES ($1, $2, 'active', 4)`,
        [memberId, pariwarId],
      );
      const res = await client.query<{ export_id: string }>(
        `INSERT INTO data_exports (member_id, pariwar_id, status, requested_at)
         VALUES ($1, $2, 'pending', now()) RETURNING export_id`,
        [memberId, pariwarId],
      );
      exportId = res.rows[0]!.export_id;
    });
    return { memberId, pariwarId, exportId };
  }

  async function cleanup(memberId: string): Promise<void> {
    await pool.query(`DELETE FROM members WHERE member_id = $1`, [memberId]);
  }

  async function row(exportId: string): Promise<{
    status: string;
    artifact_ciphertext: string | null;
    ready_at: Date | null;
    expires_at: Date | null;
    artifact_bytes: number | null;
  }> {
    const r = await pool.query(
      `SELECT status, artifact_ciphertext, ready_at, expires_at, artifact_bytes FROM data_exports WHERE export_id = $1`,
      [exportId],
    );
    return r.rows[0];
  }

  it('build: flips row to ready, envelope-encrypts the ZIP, expires_at = ready_at + 24h', async () => {
    const enc = fakeEncryption();
    const { memberId, pariwarId, exportId } = await seedPendingExport();
    try {
      const now = new Date('2026-07-02T09:00:00Z');
      const envelope: JobEnvelope<{ exportId: string }> = {
        requestId: randomUUID(),
        pariwarId,
        actorId: memberId,
        traceId: randomUUID(),
        payload: { exportId },
      };
      const result = await runDataExportBuild({ pool, ...enc, now: () => now }, envelope);
      expect(result.status).toBe('ready');

      const r = await row(exportId);
      expect(r.status).toBe('ready');
      expect(r.artifact_ciphertext).toMatch(/^enc:v1:/); // ciphertext at rest, NOT a readable ZIP
      expect(r.ready_at?.toISOString()).toBe(now.toISOString());
      expect(r.expires_at?.toISOString()).toBe(new Date(now.getTime() + 86_400_000).toISOString());
      expect(r.artifact_bytes).toBeGreaterThan(0);

      // Decrypt the artifact back to a valid ZIP that contains all eight files.
      const ct = encryption.parseEnvelope(r.artifact_ciphertext!);
      const bytes = await encryption.decryptTier1(
        ct,
        { pariwarId, fieldClass: 'data_export' },
        enc.kms,
        enc.kekRef,
      );
      const zip = await JSZip.loadAsync(Buffer.from(bytes));
      expect(Object.keys(zip.files).sort()).toEqual([
        'audit_history.json',
        'claim_history.json',
        'consent_records.json',
        'contribution_history.json',
        'event_stream.json',
        'manifest.json',
        'payment_receipts.json',
        'profile.json',
      ]);
      // Story 6.35 (LS12 (a)) — the strict-parsed profile carries the member's chosen language (`null` ⇒ never chose).
      const profile = JSON.parse(await zip.file('profile.json')!.async('string')) as { preferredLanguage: unknown };
      expect(profile.preferredLanguage).toBeNull();
    } finally {
      await cleanup(memberId);
    }
  });

  it('build: a missing row → failed (no phantom ready)', async () => {
    const enc = fakeEncryption();
    const { memberId, pariwarId } = await seedPendingExport();
    try {
      const envelope: JobEnvelope<{ exportId: string }> = {
        requestId: randomUUID(),
        pariwarId,
        actorId: memberId,
        traceId: randomUUID(),
        payload: { exportId: randomUUID() }, // no such row
      };
      const result = await runDataExportBuild({ pool, ...enc }, envelope);
      expect(result.status).toBe('failed');
    } finally {
      await cleanup(memberId);
    }
  });

  it('vacuum: zeroes a consumed artifact + flips a past-window row to expired', async () => {
    const { memberId, pariwarId, exportId } = await seedPendingExport();
    try {
      const vacuumNow = new Date('2026-07-02T12:00:00Z');
      const past = new Date(vacuumNow.getTime() - 3_600_000); // 1 hour before vacuumNow
      // A consumed, ready row that still holds ciphertext → should be zeroed.
      await pool.query(
        `UPDATE data_exports SET status='ready', artifact_ciphertext='enc:v1:xxx', ready_at=now(),
           expires_at=now() + interval '24 hours', consumed_at=now() WHERE export_id=$1`,
        [exportId],
      );
      // A second, past-window unconsumed row → should flip to expired + be zeroed.
      let expiredId = '';
      await withPariwarScope(pool, pariwarId, async (_tx, client) => {
        const r = await client.query<{ export_id: string }>(
          `INSERT INTO data_exports (member_id, pariwar_id, status, requested_at, ready_at, expires_at, artifact_ciphertext)
           VALUES ($1, $2, 'ready', now(), now(), $3, 'enc:v1:yyy') RETURNING export_id`,
          [memberId, pariwarId, past.toISOString()],
        );
        expiredId = r.rows[0]!.export_id;
      });

      const res = await runDataExportVacuum({ pool, now: () => vacuumNow });
      expect(res.zeroed).toBeGreaterThanOrEqual(2);

      expect((await row(exportId)).artifact_ciphertext).toBeNull();
      const expired = await row(expiredId);
      expect(expired.status).toBe('expired');
      expect(expired.artifact_ciphertext).toBeNull();
    } finally {
      await cleanup(memberId);
    }
  });
  it('⭐ Story 6.36e (NE10, AC8) — a member who MARKED nominees and is MARKED by another: the strict-parsed profile carries `nomineeLinks` on BOTH sides, a name only where the member saw one', async () => {
    const enc = fakeEncryption();
    const { memberId, pariwarId, exportId } = await seedPendingExport();
    const [confirmedB, askedD, declarerC, erasedE, removedF, chainG, erasedH] = [randomUUID(), randomUUID(), randomUUID(), randomUUID(), randomUUID(), randomUUID(), randomUUID()];
    try {
      await withPariwarScope(pool, pariwarId, async (_tx, client) => {
        const name = (v: string) => encryption.encryptKycField(v, pariwarId, { ...enc, hmacKeyRef: enc.kekRef })
        for (const [id, who] of [
          [confirmedB, 'Meena Kumari'],
          [askedD, 'Sita Devi'],
          [declarerC, 'Ravi Kumar'],
          [erasedE, 'Geeta Rani'],
          [removedF, 'Farah Khan'],
          [chainG, 'Gopal Das'],
          [erasedH, '[anonymized]'], // an ERASED nominee: their stored name IS the sentinel (`anonymizeMember`)
        ] as const) {
          await client.query(`INSERT INTO members (member_id, pariwar_id, state, state_event_version) VALUES ($1, $2, 'active', 1)`, [id, pariwarId]);
          await client.query(
            `INSERT INTO member_kyc_profiles (member_id, pariwar_id, name_ciphertext, dob_ciphertext, verification_strength, source)
             VALUES ($1, $2, $3, $4, 'aadhaar_kyc', 'digilocker')`,
            [id, pariwarId, await name(who), await name('1980-01-01')],
          );
        }
        // REAL envelopes (class `member_nominee`) — the export decrypts every version for `nomineeHistory[]`
        const nomineeField = async (v: string) =>
          encryption.serializeEnvelope(
            await encryption.encryptTier1(Buffer.from(v, 'utf-8'), { pariwarId, fieldClass: encryption.MEMBER_NOMINEE_FIELD_CLASS }, enc.kms, enc.kekRef),
          )
        const version = async (member: string, rank: number, versionNo = 1, recordedAt = '2026-01-01T00:00:00Z') =>
          (
            await client.query<{ version_id: string }>(
              `INSERT INTO member_nominee_versions (member_id, pariwar_id, rank, version_no, declaration_id, kind, source, name_ciphertext,
                                                    relationship, mobile_ciphertext, split_pct, recorded_at, effective_at)
               VALUES ($1, $2, $3, $7, gen_random_uuid(), 'declared', 'member', $4, 'spouse', $5, $6, $8::timestamptz, $8::timestamptz)
               RETURNING version_id`,
              [member, pariwarId, rank, await nomineeField('Nominee Name'), await nomineeField('9876543210'), rank === 1 ? 75 : 25, versionNo, recordedAt],
            )
          ).rows[0]!.version_id
        const link = (declarer: string, versionId: string, rank: number, nominee: string, confirmed: boolean) =>
          client.query(
            `INSERT INTO member_nominee_links (pariwar_id, declarer_member_id, version_id, rank, nominee_member_id, found_by, answer, asked_at, responded_at)
             VALUES ($1, $2, $3, $4, $5, 'contacts', $6::text, '2026-01-01T00:00:00Z', CASE WHEN $6::text IS NULL THEN NULL ELSE '2026-01-02T00:00:00Z'::timestamptz END)`,
            [pariwarId, declarer, versionId, rank, nominee, confirmed ? 'confirmed' : null],
          )
        await link(memberId, await version(memberId, 1), 1, confirmedB, true)
        await link(memberId, await version(memberId, 2), 2, askedD, false)
        await link(declarerC, await version(declarerC, 1), 1, memberId, false)
        // `2026-10-24-399` — a declarer whose ERASURE ended a mark naming the member: it exports as `ended`, ⛔ `erased`, ⛔ name
        await client.query(
          `INSERT INTO member_nominee_links (pariwar_id, declarer_member_id, version_id, rank, nominee_member_id, found_by, asked_at, state, ended_at, end_reason)
           VALUES ($1, $2, $3, 1, $4, 'contacts', '2025-12-01T00:00:00Z', 'erased', '2026-01-03T00:00:00Z', 'erased')`,
          [pariwarId, erasedE, await version(erasedE, 1), memberId],
        )
        // A mark the declarer REMOVED within minutes: the member's app never listed it — `ended`, ⛔ name, the word ⛔ `removed`.
        await client.query(
          `INSERT INTO member_nominee_links (pariwar_id, declarer_member_id, version_id, rank, nominee_member_id, found_by, asked_at, state, ended_at, end_reason)
           VALUES ($1, $2, $3, 1, $4, 'contacts', '2025-11-01T00:00:00Z', 'ended', '2025-11-01T00:05:00Z', 'removed_by_declarer')`,
          [pariwarId, removedF, await version(removedF, 1), memberId],
        )
        // A mark CARRIED through a re-save (v1 ended `redeclared`, v2 live, `asked_at` copied): ONE row for the member — ⛔ the
        // declarer's re-save count — and, being listed, the declarer's name.
        const g1 = await client.query<{ link_id: string }>(
          `INSERT INTO member_nominee_links (pariwar_id, declarer_member_id, version_id, rank, nominee_member_id, found_by, asked_at, state, ended_at, end_reason)
           VALUES ($1, $2, $3, 1, $4, 'contacts', '2025-10-01T00:00:00Z', 'ended', '2025-10-02T00:00:00Z', 'redeclared') RETURNING link_id`,
          [pariwarId, chainG, await version(chainG, 1, 1, '2025-10-01T00:00:00Z'), memberId],
        )
        await client.query(
          `INSERT INTO member_nominee_links (pariwar_id, declarer_member_id, version_id, rank, nominee_member_id, found_by, carried_from_link_id, asked_at)
           VALUES ($1, $2, $3, 1, $4, 'contacts', $5, '2025-10-01T00:00:00Z')`,
          [pariwarId, chainG, await version(chainG, 1, 2, '2025-10-02T00:00:00Z'), memberId, g1.rows[0]!.link_id],
        )
        // The member's OWN mark of a nominee who then ERASED their account (a confirmed answer): `ended` — ⛔ `erased` — and, the
        // stored name being the sentinel, none (the residual `-335` call 2 accepted for 6.36b, extended by `-399`).
        await client.query(
          `INSERT INTO member_nominee_links (pariwar_id, declarer_member_id, version_id, rank, nominee_member_id, found_by, answer, asked_at, responded_at, state, ended_at, end_reason)
           VALUES ($1, $2, $3, 1, $4, 'contacts', 'confirmed', '2026-01-05T00:00:00Z', '2026-01-05T01:00:00Z', 'erased', '2026-01-06T00:00:00Z', 'erased')`,
          [pariwarId, memberId, await version(memberId, 1, 2, '2026-01-05T00:00:00Z'), erasedH],
        )
      });
      const envelope: JobEnvelope<{ exportId: string }> = { requestId: randomUUID(), pariwarId, actorId: memberId, traceId: randomUUID(), payload: { exportId } };
      // the build STRICT-parses every section against its contract (`ProfileSection` included) — a shape drift fails here
      expect((await runDataExportBuild({ pool, ...enc }, envelope)).status).toBe('ready');
      const bytes = await encryption.decryptTier1(encryption.parseEnvelope((await row(exportId)).artifact_ciphertext!), { pariwarId, fieldClass: 'data_export' }, enc.kms, enc.kekRef);
      const zip = await JSZip.loadAsync(Buffer.from(bytes));
      const profile = JSON.parse(await zip.file('profile.json')!.async('string')) as {
        nomineeLinks: { marked: { rank: number; versionNo: number; state: string; answer: string | null; name: string | null }[]; namedBy: { state: string; answer: string | null; name: string | null }[] };
      };
      const { marked, namedBy } = profile.nomineeLinks;
      expect(marked.map((m) => [m.rank, m.versionNo, m.state, m.answer])).toEqual([
        [1, 1, 'live', 'confirmed'],
        [2, 1, 'live', null],
        [1, 2, 'ended', 'confirmed'], // the erased NOMINEE: `ended`, ⛔ `erased`
      ]);
      expect(marked[0]!.name).toMatch(/^Meena/); // confirmed ⇒ the registered name the member was shown
      expect(marked[1]!.name).toBeNull(); // ⛔ confirmed ⇒ ⛔ name (`-309`)
      expect(marked[2]!.name).toBeNull(); // the stored name is the sentinel — the residual `-335` call 2 accepted
      // oldest ask first: the carried chain (ONE row), the removed mark, the erased declarer, the live one
      expect(namedBy.map((m) => [m.state, m.answer])).toEqual([
        ['live', null], // chainG — v1 `redeclared` + v2 live ⇒ ONE row, the head, listed
        ['ended', null], // removedF — removed within minutes
        ['ended', null], // erasedE — the declarer's erasure
        ['live', null], // declarerC
      ]);
      expect(namedBy.map((m) => m.name)).toEqual([expect.stringMatching(/^Gopal/), null, null, expect.stringMatching(/^Ravi/)]);
      const json = JSON.stringify(profile.nomineeLinks);
      expect(json).not.toContain('erased');
      expect(json).not.toContain('removed');
      expect(json).not.toContain('redeclared');
      for (const who of ['Geeta', 'Farah', 'anonymized']) expect(json).not.toContain(who);
      for (const id of [confirmedB, askedD, declarerC, erasedE, removedF, chainG, erasedH]) expect(json).not.toContain(id); // ⛔ a member id
    } finally {
      await pool.query(`DELETE FROM members WHERE member_id = ANY($1::uuid[])`, [[memberId, confirmedB, askedD, declarerC, erasedE, removedF, chainG, erasedH]]);
    }
  });
  // Live-DB suite timeout: these tests run several sequential live-DB round-trips (setup +
  // build/vacuum + row assertions) against a shared :5433 container; under concurrent `turbo`/
  // `ci:local` load they can exceed the 5s vitest default. 20s removes the contention flake without
  // masking a real hang (see apps/jobs/tests/audit/integrity-check.test.ts precedent).
}, { timeout: 20000 });
