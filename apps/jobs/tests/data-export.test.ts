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
  it('⭐ Story 12.5b (QE8, AC8) — the member\'s partner-form visit records: the strict-parsed profile lists each with the offer\'s names, oldest first; ⛔ another member\'s', async () => {
    const enc = fakeEncryption();
    const { memberId, pariwarId, exportId } = await seedPendingExport();
    const other = randomUUID();
    const partnerId = randomUUID();
    const moduleId = randomUUID();
    try {
      await withPariwarScope(pool, pariwarId, async (_tx, client) => {
        await client.query(
          `INSERT INTO marketplace_partners (partner_id, pariwar_id, display_name_en, display_name_hi, created_by_actor_id, audit_id)
           VALUES ($1, $2, $3, 'एलआईसी', $4, $5)`,
          [partnerId, pariwarId, `LIC ${randomUUID()}`, randomUUID(), randomUUID()],
        );
        await client.query("SET LOCAL app.marketplace_module_state_writer = 'on'");
        await client.query(
          `INSERT INTO marketplace_modules (module_id, pariwar_id, partner_id, name_en, name_hi, description_en, description_hi, eligibility_filter,
             scope_filter, valid_from, valid_until, slot_capacity, branding_bundle, manifest_schema_version, lead_route, partner_form_url,
             current_state, state_event_version, slots_remaining, archive_reason, audit_id)
           VALUES ($1, $2, $3, 'LIC term plan', 'एलआईसी टर्म प्लान', 'd', 'द', '{"version":1,"clauses":[]}', '{"version":1,"scope":"members-all"}',
                   now() - interval '1 hour', now() + interval '1 hour', NULL, '{"version":1,"logo_object_key":null,"accent_color_hex":null}', 2,
                   'partner_form', 'https://partner.example/apply?offer=twt', 'draft', 1, NULL, NULL, $4)`,
          [moduleId, pariwarId, partnerId, randomUUID()],
        );
        await client.query("SET LOCAL app.marketplace_module_state_writer = 'off'");
        await client.query(`INSERT INTO members (member_id, pariwar_id, state, state_event_version) VALUES ($1, $2, 'active', 1)`, [other, pariwarId]);
        for (const [who, at] of [
          [memberId, '2026-11-02T10:00:00Z'],
          [memberId, '2026-11-01T09:00:00Z'],
          [other, '2026-11-01T08:00:00Z'],
        ] as const) {
          await client.query(
            `INSERT INTO marketplace_partner_form_visits (visit_id, pariwar_id, module_id, member_id, opened_at) VALUES ($1, $2, $3, $4, $5::timestamptz)`,
            [randomUUID(), pariwarId, moduleId, who, at],
          );
        }
      });
      // the build STRICT-parses every section against its contract — `ProfileSection.partnerOfferVisits` included (TR12)
      expect((await runDataExportBuild({ pool, ...enc }, { requestId: randomUUID(), pariwarId, actorId: memberId, traceId: randomUUID(), payload: { exportId } })).status).toBe('ready');
      const bytes = await encryption.decryptTier1(encryption.parseEnvelope((await row(exportId)).artifact_ciphertext!), { pariwarId, fieldClass: 'data_export' }, enc.kms, enc.kekRef);
      const zip = await JSZip.loadAsync(Buffer.from(bytes));
      const profile = JSON.parse(await zip.file('profile.json')!.async('string')) as { partnerOfferVisits: unknown[] };
      expect(profile.partnerOfferVisits).toEqual([
        { moduleId, offerNameEn: 'LIC term plan', offerNameHi: 'एलआईसी टर्म प्लान', openedAt: '2026-11-01T09:00:00.000Z' },
        { moduleId, offerNameEn: 'LIC term plan', offerNameHi: 'एलआईसी टर्म प्लान', openedAt: '2026-11-02T10:00:00.000Z' },
      ]);
      expect(JSON.stringify(profile.partnerOfferVisits)).not.toContain('partner.example');
    } finally {
      const c = await pool.connect();
      try {
        await c.query('BEGIN');
        await c.query("SET LOCAL session_replication_role = 'replica'");
        await c.query('DELETE FROM marketplace_partner_form_visits WHERE pariwar_id = $1', [pariwarId]);
        await c.query('DELETE FROM marketplace_modules WHERE pariwar_id = $1', [pariwarId]);
        await c.query('DELETE FROM marketplace_partners WHERE pariwar_id = $1', [pariwarId]);
        await c.query('DELETE FROM members WHERE member_id = ANY($1::uuid[])', [[memberId, other]]);
        await c.query('COMMIT');
      } finally {
        c.release();
      }
    }
  });
  it('⭐ Story 3.13 (DL14 as amended by `-504` item 5, AC13) — the staff identity checks: the strict-parsed profile lists each act, oldest first; ⛔ the staff note (it stays with staff), ⛔ staff attribution', async () => {
    const enc = fakeEncryption();
    const { memberId, pariwarId, exportId } = await seedPendingExport();
    const NOTE_PLAINTEXT = 'ZZ came without an ID';
    const note = await encryption.serializeEnvelope(
      await encryption.encryptTier1(Buffer.from(NOTE_PLAINTEXT, 'utf-8'), { pariwarId, fieldClass: 'member_identity_validation' }, enc.kms, enc.kekRef),
    );
    // ⭐ (code review R5-P9) Positive control: the stored note DECRYPTS to exactly the string the whole-profile check looks for, so
    // `not.toContain(NOTE_PLAINTEXT)` below cannot pass because of a typo or a different seed.
    expect(
      Buffer.from(
        await encryption.decryptTier1(encryption.parseEnvelope(note), { pariwarId, fieldClass: 'member_identity_validation' }, enc.kms, enc.kekRef),
      ).toString('utf-8'),
    ).toBe(NOTE_PLAINTEXT);
    // The staff member who recorded the two acts — captured, so its VALUE can be proven absent from the download (R5-P9).
    const decidedByActor = randomUUID();
    // The two events a check writes, by a STAFF actor (`-505` item 1), and the controls: the same `kyc_completed` type from
    // another trigger, and another staff-written event, keep their actor (⛔ a blanket blanking of every actor).
    const staffActor = randomUUID();
    const controlActor = randomUUID();
    const events: [number, string, Record<string, unknown>, string][] = [
      [1, 'member.identity_validation_recorded', { from_state: 'pending-valid', to_state: 'pending-valid', trigger: 'staff_identity_validation', actor: 'trustee', validation_id: randomUUID(), outcome: 'not_confirmed' }, staffActor],
      [2, 'member.identity_validation_recorded', { from_state: 'pending-valid', to_state: 'pending-valid', trigger: 'staff_identity_validation', actor: 'trustee', validation_id: randomUUID(), outcome: 'confirmed' }, staffActor],
      [3, 'member.kyc_completed', { from_state: 'pending-valid', to_state: 'active', trigger: 'staff_identity_validation', actor: 'trustee', kyc_reference: randomUUID() }, staffActor],
      [4, 'member.kyc_completed', { from_state: 'pending-valid', to_state: 'active', trigger: 'lock_in_expired', actor: 'system' }, controlActor],
      [5, 'member.moderation.suspended', {}, controlActor],
    ];
    for (const [version, eventType, payload, actor] of events) {
      await pool.query(
        `INSERT INTO events_log (stream_id, event_type, payload, event_version, actor_id, pariwar_id, occurred_at)
         VALUES ($1, $2, $3::jsonb, $4, $5, $6, now())`,
        [memberId, eventType, JSON.stringify(payload), version, actor, pariwarId],
      );
    }
    try {
      await withPariwarScope(pool, pariwarId, async (_tx, client) => {
        await client.query(
          `INSERT INTO member_identity_validations (pariwar_id, member_id, outcome, evidence_kind, document_kind, not_confirmed_reason, note_ciphertext,
             kyc_profile_updated_at, decided_by_actor_id, decided_by_display, decided_at, superseded_at, superseded_reason)
           VALUES ($1, $2, 'not_confirmed', 'photo_id_in_person', NULL, 'no_document_shown', $3, now(), $4, 'ZZ-STAFF-NAME', '2026-11-01T09:00:00Z', now(), 're_checked'),
                  ($1, $2, 'confirmed', 'photo_id_video_call', 'passport', NULL, NULL, now(), $4, 'ZZ-STAFF-NAME', '2026-11-02T09:00:00Z', NULL, NULL)`,
          [pariwarId, memberId, note, decidedByActor],
        );
      });
      // the build STRICT-parses every section against its contract — `ProfileSection.identityChecks` included (TR12)
      expect((await runDataExportBuild({ pool, ...enc }, { requestId: randomUUID(), pariwarId, actorId: memberId, traceId: randomUUID(), payload: { exportId } })).status).toBe('ready');
      const bytes = await encryption.decryptTier1(encryption.parseEnvelope((await row(exportId)).artifact_ciphertext!), { pariwarId, fieldClass: 'data_export' }, enc.kms, enc.kekRef);
      const zip = await JSZip.loadAsync(Buffer.from(bytes));
      const profile = JSON.parse(await zip.file('profile.json')!.async('string')) as { identityChecks: unknown[] };
      expect(profile.identityChecks).toEqual([
        { decidedAt: '2026-11-01T09:00:00.000Z', outcome: 'not_confirmed', evidenceKind: 'photo_id_in_person', documentKind: null, notConfirmedReason: 'no_document_shown' },
        { decidedAt: '2026-11-02T09:00:00.000Z', outcome: 'confirmed', evidenceKind: 'photo_id_video_call', documentKind: 'passport', notConfirmedReason: null },
      ]);
      // ⭐ The proof the note is held back is the EXACT key set of every element (code review R3-P23): the export never
      // decrypts, so a leak would be a `noteCiphertext` (or any other) key — ⛔ the plaintext a `not.toContain` looks for.
      // The row in the table HAS a note (seeded above), so this is not "none existed".
      const KEYS = ['decidedAt', 'documentKind', 'evidenceKind', 'notConfirmedReason', 'outcome'];
      for (const el of profile.identityChecks) expect(Object.keys(el as object).sort()).toEqual(KEYS);
      const all = JSON.stringify(profile);
      expect(all).not.toContain('ZZ-STAFF-NAME');
      expect(all).not.toContain(note); // ⛔ the stored ciphertext, anywhere in the profile
      // ⭐ (code review R4-P8) BESIDE the key set, over the WHOLE profile: a decrypted note or a staff-attribution key leaking
      // into ANY other key of the profile is caught too (the row HAS a decryptable note, seeded above).
      expect(all).not.toContain(NOTE_PLAINTEXT);
      expect(all).not.toMatch(/decidedBy|decided_by/);
      // ⭐ `-505` item 1: the two events a staff check writes carry ⛔ staff user id; the controls keep theirs.
      const stream = JSON.parse(await zip.file('event_stream.json')!.async('string')) as {
        records: { eventVersion: number; eventType: string; actorId: string | null }[];
      };
      const actors = stream.records.map((r) => [r.eventVersion, r.eventType, r.actorId]);
      expect(actors).toEqual([
        [1, 'member.identity_validation_recorded', null],
        [2, 'member.identity_validation_recorded', null],
        [3, 'member.kyc_completed', null],
        [4, 'member.kyc_completed', controlActor],
        [5, 'member.moderation.suspended', controlActor],
      ]);
      expect(JSON.stringify(stream)).not.toContain(staffActor);
      // ⭐ (code review R5-P9) The staff user-id VALUES — the acts' `decided_by_actor_id` and the events' staff actor — appear in
      // ⛔ file of the download a check touches: `profile.json` and `event_stream.json` (DL14, `-505` item 1).
      for (const file of ['profile.json', 'event_stream.json']) {
        const text = await zip.file(file)!.async('string');
        expect(text, file).not.toContain(decidedByActor);
        expect(text, file).not.toContain(staffActor);
      }
    } finally {
      await cleanup(memberId);
    }
  });
  // Live-DB suite timeout: these tests run several sequential live-DB round-trips (setup +
  // build/vacuum + row assertions) against a shared :5433 container; under concurrent `turbo`/
  // `ci:local` load they can exceed the 5s vitest default. 20s removes the contention flake without
  // masking a real hang (see apps/jobs/tests/audit/integrity-check.test.ts precedent).
}, { timeout: 20000 });
