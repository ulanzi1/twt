// Story 1.5 AC-3: column-transformer integration test.
//
// Live-DB; DATABASE_URL-set-gates-execution per Story 1.3 pattern. Uses the
// fake-KMS provider (no Cloud KMS dependency). Demonstrates:
//   - encrypt-on-write via service-layer helper (encryptTier1)
//   - decrypt-on-read via service-layer helper (decryptTier1)
//   - blind-index equality lookup via service-layer helper (blindIndex)
//   - plaintext-never-in-DB invariant for Tier 1 + Tier 2
//   - Tier 3 plaintext pass-through
//
// piiColumn-auto-encrypt note: Drizzle 0.45's customType requires sync
// toDriver/fromDriver; substantive encryption is performed by service-layer
// helpers per Story 1.5 substrate fallback (see README.md "Drizzle 0.45 sync
// customType constraint" + D14-1.5).
//
// Local invocation:
//   docker run --rm -d -p 5433:5432 \
//     -e POSTGRES_USER=twt_dev_app \
//     -e POSTGRES_PASSWORD=devpass \
//     -e POSTGRES_DB=twt_dev \
//     --name twt-test-pg postgres:16-alpine
//
//   DATABASE_URL=postgresql://twt_dev_app:devpass@127.0.0.1:5433/twt_dev?sslmode=disable \
//     pnpm --filter @twt/domain test -- tests/encryption/column-transformer

import { randomBytes } from 'node:crypto';

import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import { pgTable, uuid } from 'drizzle-orm/pg-core';
import pg from 'pg';
import { afterAll, beforeAll, beforeEach, afterEach, describe, expect, it } from 'vitest';

import {
  blindIndex,
  createFakeKmsProvider,
  decryptTier1,
  encryptTier1,
  parseEnvelope,
  piiColumn,
  serializeEnvelope,
  type EncryptionContext,
  type KmsKeyRef,
  type KmsProvider,
} from '../../src/encryption/index.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);

// Scratch table declared via Drizzle. piiColumn factories attach tier metadata
// (consumed by the Story 1.16b CI gate); columns are TEXT at the SQL level.
const scratch = pgTable('twt_story_1_5_scratch', {
  id: uuid('id').primaryKey(),
  mobileTier1: piiColumn(1, 'mobile')('mobile_tier_1').notNull(),
  mobileHashTier2: piiColumn(2, 'mobile')('mobile_hash_tier_2').notNull(),
  firstNameTier3: piiColumn(3)('first_name_tier_3').notNull(),
});

const KEK_REF: KmsKeyRef = { resourceName: 'fake-kek' };
const HMAC_REF: KmsKeyRef = { resourceName: 'fake-hmac' };
const CTX: EncryptionContext = { pariwarId: 'pariwar-a', fieldClass: 'mobile' };

const PLAINTEXT_MOBILE = '+919999999999';
const PLAINTEXT_NAME = 'Sushil';

(hasDatabase ? describe : describe.skip)(
  'piiColumn + service-layer helpers (live DB)',
  () => {
    let pool: pg.Pool;
    let client: pg.PoolClient;
    let kms: KmsProvider;
    const rowId = '11111111-1111-1111-1111-111111111111';

    beforeAll(async () => {
      pool = new pg.Pool({
        connectionString: DATABASE_URL,
        max: 4,
        ssl: false,
        connectionTimeoutMillis: 5000,
      });
      pool.on('error', (err) => {
        console.error('[encryption-integration] idle client error:', err.message);
      });
      kms = createFakeKmsProvider({
        kekBytes: randomBytes(32),
        hmacKeyBytes: randomBytes(32),
      });
    });

    afterAll(async () => {
      if (pool) await pool.end();
    });

    beforeEach(async () => {
      client = await pool.connect();
      await client.query('BEGIN');
      await client.query(
        'CREATE TEMP TABLE twt_story_1_5_scratch (id uuid PRIMARY KEY, mobile_tier_1 text NOT NULL, mobile_hash_tier_2 text NOT NULL, first_name_tier_3 text NOT NULL) ON COMMIT DROP',
      );
    });

    afterEach(async () => {
      try {
        await client.query('ROLLBACK');
      } finally {
        client.release();
      }
    });

    it('encrypt-on-write + decrypt-on-read + plaintext-never-in-DB', async () => {
      const db = drizzle(client);

      // Service-layer encrypt-on-write.
      const envelope = serializeEnvelope(
        await encryptTier1(Buffer.from(PLAINTEXT_MOBILE, 'utf-8'), CTX, kms, KEK_REF),
      );
      const mobileHash = await blindIndex(
        'mobile',
        PLAINTEXT_MOBILE,
        { pariwarId: CTX.pariwarId },
        kms,
        HMAC_REF,
      );

      await db.insert(scratch).values({
        id: rowId,
        mobileTier1: envelope,
        mobileHashTier2: mobileHash,
        firstNameTier3: PLAINTEXT_NAME,
      });

      // Raw SELECT — Tier 1 + Tier 2 must not echo plaintext.
      const raw = await client.query<{ mobile_tier_1: string; mobile_hash_tier_2: string; first_name_tier_3: string }>(
        'SELECT mobile_tier_1, mobile_hash_tier_2, first_name_tier_3 FROM twt_story_1_5_scratch WHERE id = $1',
        [rowId],
      );
      expect(raw.rows[0]).toBeTruthy();
      expect(raw.rows[0]?.mobile_tier_1).not.toContain(PLAINTEXT_MOBILE);
      expect(raw.rows[0]?.mobile_tier_1.startsWith('enc:v1:')).toBe(true);
      expect(raw.rows[0]?.mobile_hash_tier_2).not.toContain(PLAINTEXT_MOBILE);
      expect(raw.rows[0]?.mobile_hash_tier_2).toMatch(/^[0-9a-f]{64}$/);
      expect(raw.rows[0]?.first_name_tier_3).toBe(PLAINTEXT_NAME);

      // Drizzle SELECT — Tier 1 round-trips through service-layer decrypt.
      const rows = await db.select().from(scratch).where(sql`id = ${rowId}`);
      expect(rows.length).toBe(1);
      const row = rows[0]!;
      const decrypted = await decryptTier1(parseEnvelope(row.mobileTier1), CTX, kms, KEK_REF);
      expect(Buffer.from(decrypted).toString('utf-8')).toBe(PLAINTEXT_MOBILE);
      expect(row.mobileHashTier2).toBe(mobileHash);
      expect(row.firstNameTier3).toBe(PLAINTEXT_NAME);
    });

    it('blind-index equality lookup matches the row by HMAC', async () => {
      const db = drizzle(client);
      const envelope = serializeEnvelope(
        await encryptTier1(Buffer.from(PLAINTEXT_MOBILE, 'utf-8'), CTX, kms, KEK_REF),
      );
      const mobileHash = await blindIndex(
        'mobile',
        PLAINTEXT_MOBILE,
        { pariwarId: CTX.pariwarId },
        kms,
        HMAC_REF,
      );
      await db.insert(scratch).values({
        id: rowId,
        mobileTier1: envelope,
        mobileHashTier2: mobileHash,
        firstNameTier3: PLAINTEXT_NAME,
      });

      const lookupHash = await blindIndex(
        'mobile',
        PLAINTEXT_MOBILE,
        { pariwarId: CTX.pariwarId },
        kms,
        HMAC_REF,
      );
      const found = await db.select().from(scratch).where(sql`mobile_hash_tier_2 = ${lookupHash}`);
      expect(found.length).toBe(1);
      expect(found[0]?.id).toBe(rowId);

      // Different pariwar HMAC should NOT match.
      const otherHash = await blindIndex(
        'mobile',
        PLAINTEXT_MOBILE,
        { pariwarId: 'pariwar-b' },
        kms,
        HMAC_REF,
      );
      const notFound = await db.select().from(scratch).where(sql`mobile_hash_tier_2 = ${otherHash}`);
      expect(notFound.length).toBe(0);
    });
  },
);

(hasDatabase ? describe.skip : describe)(
  'piiColumn + service-layer helpers (live-DB skipped)',
  () => {
    it('skipped — DATABASE_URL not set', () => {
      expect(hasDatabase).toBe(false);
    });
  },
);
