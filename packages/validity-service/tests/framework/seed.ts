// Measured-validation framework — synthetic-dataset SEEDING driver (AI-6-2).
//
// Seeds synthetic members at parameterized scale through the REAL event-log → projector path — NEVER an
// invented column (no geo/district/member_number — [[project_membership_number_deferred_feature]]) and
// NEVER a regenerated migration / DROP SCHEMA reset ([[project_live_db_test_gotchas]]). Own-committing +
// additive: the caller tracks its seeded Pariwar ids and deletes them in afterAll (FK cascade), asserting
// membership, not global counts. Inserts are CHUNKED (see `SEED_CHUNK_SIZE`) — batching rows into fewer,
// bounded-size statements instead of one round trip per member (or one giant multi-hundred-thousand-row
// transaction) at 4L pre-launch scale (review fix: unbounded sequential/single-transaction seeding risked
// a `beforeAll` timeout and WAL/lock bloat, and was structurally unvalidated).
//
// Two seeding surfaces the ONE driver covers:
//   · seedValidityMembers  — the events_log active-member chain + the shared R12 clause; the path
//     `getValidity`/`getValidityCached` read (they replay events_log directly; members.state is not read).
//   · seedSearchMembers    — members + member_search_projection (via the real projector) + member_identities
//     (Tier-1 mobile ciphertext) + member_kyc_profiles (Tier-1 name ciphertext) — the AR-65 admin-search
//     compound-read-model path WITH BOTH per-row Tier-1 decrypt costs `adminMemberSearch` incurs
//     (`decryptMobile` + `decryptKycField`); the existing search bench seeds neither identity row, so it
//     never exercises either decrypt — the precise gap this closes.

import { createHash, randomUUID } from 'node:crypto';

import { bindScopedDb, encryption, ids, member, schema, setPariwarScope, type Db } from '@twt/domain';
import type pg from 'pg';

import { R12_PAYLOAD } from '../fixtures/r12-clause.js';

/** Members/events per batched INSERT (validity) or per chunked transaction (search). Bounds statement/
 *  transaction size at 4L pre-launch scale (400k) without losing per-chunk atomicity. */
const SEED_CHUNK_SIZE = 500;

/** Mirrors `apps/api/src/context.ts` MEMBER_IDENTITY_NAMESPACE — the fixed pre-scope namespace member
 *  mobile Tier-1 encryption keys on (member login runs BEFORE any Pariwar is known). Duplicated as a
 *  literal (not imported) so this framework stays `@twt/domain`-only: `apps/api` depends on
 *  `@twt/validity-service`, never the reverse — importing `apps/api` here would invert that graph. */
const MEMBER_IDENTITY_NAMESPACE = '00000000-0000-0000-0000-000000000001';
/** Mirrors `apps/api/src/context.ts` MEMBER_MOBILE_FIELD_CLASS. */
const MEMBER_MOBILE_FIELD_CLASS = 'member_mobile';
/** Mirrors `apps/api/src/context.ts` MEMBER_KYC_FIELD_CLASS. */
const MEMBER_KYC_FIELD_CLASS = 'member_kyc';

/**
 * The admin-search encryption bundle both the seeding driver (encrypt) and the measurement harness
 * (decrypt) share — mirroring the TWO real field-classes `adminMemberSearch` decrypts per row
 * (`apps/api/src/modules/auth/shared/mobile-index.ts`'s `decryptMobile` + `apps/api/src/modules/kyc/
 * kyc-crypto.ts`'s `decryptKycField`), reimplemented directly over `@twt/domain`'s `encryption`
 * primitives (never importing `apps/api`).
 */
export interface AdminSearchEncryption {
  /** Which adapter produced the ciphertext/decrypt cost — recorded verbatim in the evidence record. */
  cryptoAdapter: 'dev-fake-kms' | 'cloud-kms';
  encryptMobile(plaintext: string): Promise<string>;
  decryptMobile(serialized: string): Promise<string>;
  encryptKycName(plaintext: string, pariwarId: string): Promise<string>;
  decryptKycName(serialized: string, pariwarId: string): Promise<string>;
}

/** Derive a deterministic 32-byte fake key from a label (mirrors apps/api `deriveFakeKey`). */
function deriveFakeKey(label: string): Uint8Array {
  return new Uint8Array(createHash('sha256').update(`measured-validation:${label}`).digest());
}

function buildBundle(
  cryptoAdapter: AdminSearchEncryption['cryptoAdapter'],
  kms: encryption.KmsProvider,
  kekRef: encryption.KmsKeyRef,
): AdminSearchEncryption {
  return {
    cryptoAdapter,
    async encryptMobile(plaintext) {
      const ct = await encryption.encryptTier1(
        new TextEncoder().encode(plaintext),
        { pariwarId: MEMBER_IDENTITY_NAMESPACE, fieldClass: MEMBER_MOBILE_FIELD_CLASS },
        kms,
        kekRef,
      );
      return encryption.serializeEnvelope(ct);
    },
    async decryptMobile(serialized) {
      const ct = encryption.parseEnvelope(serialized);
      const bytes = await encryption.decryptTier1(
        ct,
        { pariwarId: MEMBER_IDENTITY_NAMESPACE, fieldClass: MEMBER_MOBILE_FIELD_CLASS },
        kms,
        kekRef,
      );
      return new TextDecoder().decode(bytes);
    },
    async encryptKycName(plaintext, pariwarId) {
      const ct = await encryption.encryptTier1(
        new TextEncoder().encode(plaintext),
        { pariwarId, fieldClass: MEMBER_KYC_FIELD_CLASS },
        kms,
        kekRef,
      );
      return encryption.serializeEnvelope(ct);
    },
    async decryptKycName(serialized, pariwarId) {
      const ct = encryption.parseEnvelope(serialized);
      const bytes = await encryption.decryptTier1(ct, { pariwarId, fieldClass: MEMBER_KYC_FIELD_CLASS }, kms, kekRef);
      return new TextDecoder().decode(bytes);
    },
  };
}

/** Build the fake-KMS Tier-1 envelope crypto used to seed + decrypt identity ciphertext in CI/smoke. */
function makeFakeAdminSearchEncryption(): AdminSearchEncryption {
  const kms = encryption.createFakeKmsProvider({
    kekBytes: deriveFakeKey('kek'),
    hmacKeyBytes: deriveFakeKey('hmac'),
  });
  return buildBundle('dev-fake-kms', kms, { resourceName: 'fake:measured-validation-kek' });
}

/**
 * Build the REAL Cloud KMS-backed admin-search encryption bundle — mirrors `apps/api/src/deps.ts`'s
 * `buildEncryptionDeps` `KMS_TEST_MODE=live` branch EXACTLY (same env var names) so the pre-launch 4L
 * run decrypts against the SAME operator-provisioned KEK the production app uses. Fails closed: throws
 * if any required env var is missing rather than silently falling back to the fake adapter.
 */
function makeCloudAdminSearchEncryption(): AdminSearchEncryption {
  const kekResource = process.env['ADMIN_KEK_RESOURCE_NAME'];
  const hmacResource = process.env['ADMIN_HMAC_RESOURCE_NAME'];
  const projectId = process.env['GOOGLE_CLOUD_PROJECT'];
  const location = process.env['ADMIN_KMS_LOCATION'];
  if (!kekResource || !hmacResource || !projectId || !location) {
    throw new Error(
      '[measured-validation] KMS_TEST_MODE=live requires ADMIN_KEK_RESOURCE_NAME, ADMIN_HMAC_RESOURCE_NAME, ' +
        'GOOGLE_CLOUD_PROJECT, ADMIN_KMS_LOCATION (mirrors apps/api/src/deps.ts buildEncryptionDeps)',
    );
  }
  const kekRef: encryption.KmsKeyRef = { resourceName: kekResource };
  const kms = encryption.createCloudKmsProvider({
    kekRef,
    hmacKeyRef: { resourceName: hmacResource },
    projectId,
    location,
  });
  return buildBundle('cloud-kms', kms, kekRef);
}

/**
 * Resolve the admin-search encryption bundle per the established `KMS_TEST_MODE` convention
 * (`packages/domain/src/encryption/fake-kms-provider.ts`; mirrors `apps/api/src/deps.ts`'s
 * `buildEncryptionDeps`): default `fake` for CI/local smoke, `live` for the operator-run pre-launch 4L
 * measurement against the real Cloud KMS adapter (review fix D2: this switch previously did not exist —
 * the harness could never actually produce a `cloud-kms`-labelled number).
 */
export function resolveAdminSearchEncryption(): AdminSearchEncryption {
  const mode = process.env['KMS_TEST_MODE'] ?? 'fake';
  if (mode === 'live') return makeCloudAdminSearchEncryption();
  if (mode !== 'fake') {
    throw new Error(`[measured-validation] KMS_TEST_MODE must be 'fake' or 'live', got ${JSON.stringify(mode)}`);
  }
  return makeFakeAdminSearchEncryption();
}

/** Insert the shared R12 (`niy.retirement-coverage.r12`) clause version for a Pariwar. */
export async function seedR12Clause(db: Db, pariwarId: ids.PariwarId): Promise<void> {
  await db.insert(schema.clauseVersions).values({
    clauseVersionId: ids.clauseVersionId(randomUUID()),
    clauseId: ids.clauseId('niy.retirement-coverage.r12'),
    pariwarId,
    version: 1,
    effectiveDate: new Date('2000-01-01T00:00:00Z'),
    payload: { ...R12_PAYLOAD },
    benefitMechanism: 'pool',
  });
}

/** The active-member event chain (mirrors validity-cache.spec) — replays to `active` at read time. */
function activeMemberEventRows(
  pariwarId: ids.PariwarId,
  memberId: ids.MemberId,
  joinedAt: Date,
): (typeof schema.eventsLog.$inferInsert)[] {
  const at = (n: number): Date => new Date(joinedAt.getTime() + n * 1000);
  return [
    { streamId: memberId, eventType: 'member.signup_initiated', payload: {}, eventVersion: 1, actorId: null, pariwarId, occurredAt: joinedAt },
    { streamId: memberId, eventType: 'member.kyc_completed', payload: {}, eventVersion: 2, actorId: null, pariwarId, occurredAt: at(2) },
    { streamId: memberId, eventType: 'member.vyawastha_shulk_paid', payload: {}, eventVersion: 3, actorId: null, pariwarId, occurredAt: at(3) },
    { streamId: memberId, eventType: 'member.lock_in_expired', payload: { kyc_verified: true }, eventVersion: 4, actorId: null, pariwarId, occurredAt: at(4) },
  ];
}

export interface SeedValidityInput {
  scale: number;
  pariwarId: ids.PariwarId;
  /** Base join instant; each member is offset a few days so the seeded set is not degenerate. */
  joinedAt?: Date;
}

/**
 * Seed `scale` synthetic active members into a fresh Pariwar through the real event-log path + the shared
 * R12 clause. Returns the member ids. The FR-12A cached-path + real-path determinism harnesses read these
 * via `getValidityCached` / `getValidity` (which replay events_log — no members.state / projection needed).
 * Rows are batched in chunks of {@link SEED_CHUNK_SIZE} members (one INSERT per chunk — atomic per
 * statement) rather than one sequential round trip per member.
 */
export async function seedValidityMembers(db: Db, input: SeedValidityInput): Promise<ids.MemberId[]> {
  const joinBase = (input.joinedAt ?? new Date('2012-06-01T00:00:00Z')).getTime();
  await seedR12Clause(db, input.pariwarId);
  const memberIds: ids.MemberId[] = [];
  for (let chunkStart = 0; chunkStart < input.scale; chunkStart += SEED_CHUNK_SIZE) {
    const chunkEnd = Math.min(chunkStart + SEED_CHUNK_SIZE, input.scale);
    const rows: (typeof schema.eventsLog.$inferInsert)[] = [];
    for (let i = chunkStart; i < chunkEnd; i++) {
      const memberId = ids.memberId(randomUUID());
      memberIds.push(memberId);
      rows.push(...activeMemberEventRows(input.pariwarId, memberId, new Date(joinBase + i * 86_400_000)));
    }
    await db.insert(schema.eventsLog).values(rows);
  }
  return memberIds;
}

export interface SeedSearchInput {
  scale: number;
  pariwarId: ids.PariwarId;
  /** The resolved admin-search encryption bundle (fake or real — see {@link resolveAdminSearchEncryption}). */
  encryption: AdminSearchEncryption;
}

/**
 * Seed `scale` synthetic members into a fresh Pariwar via the REAL projector (`projectMemberState` writes
 * members.state + the AR-65 member_search_projection row under the write-guards) PLUS a member_identities
 * row (Tier-1 mobile ciphertext) AND a member_kyc_profiles row (Tier-1 name ciphertext) per member. This
 * is the admin-search compound-read-model path WITH BOTH per-row Tier-1 identity ciphertexts — so a
 * browse page decrypts BOTH fields per row, matching `adminMemberSearch`'s full per-row cost. Runs in
 * CHUNKED scoped, own-committing transactions (`SET LOCAL ROLE twt_app` + Pariwar scope per chunk) rather
 * than one open transaction spanning the whole `scale` — bounds WAL/lock footprint at 4L pre-launch scale.
 */
export async function seedSearchMembers(pool: pg.Pool, input: SeedSearchInput): Promise<ids.MemberId[]> {
  const memberIds: ids.MemberId[] = [];
  const client = await pool.connect();
  try {
    for (let chunkStart = 0; chunkStart < input.scale; chunkStart += SEED_CHUNK_SIZE) {
      const chunkEnd = Math.min(chunkStart + SEED_CHUNK_SIZE, input.scale);
      await client.query('BEGIN');
      try {
        await client.query('SET LOCAL ROLE twt_app');
        await setPariwarScope(client, input.pariwarId);
        const db = bindScopedDb(client);
        const identityRows: (typeof schema.memberIdentities.$inferInsert)[] = [];
        const kycRows: (typeof schema.memberKycProfiles.$inferInsert)[] = [];
        for (let i = chunkStart; i < chunkEnd; i++) {
          const memberId = ids.memberId(randomUUID());
          memberIds.push(memberId);
          // Real projector: appends the signup event, writes members.state + the search-projection row.
          await member.projectMemberState(client, {
            memberId,
            pariwarId: input.pariwarId,
            eventType: 'member.signup_initiated',
            payload: { from_state: null, to_state: 'pending-kyc', trigger: 'signup', actor: 'member' },
            actorId: null,
          });
          const mobileCiphertext = await input.encryption.encryptMobile(`+9198${String(10_000_000 + i).slice(-8)}`);
          identityRows.push({ memberId, pariwarId: input.pariwarId, mobileCiphertext, mobileBlindIndex: `bi_${randomUUID()}` });
          // Both KYC ciphertexts are Tier-1/NOT NULL; only `nameCiphertext` is on adminMemberSearch's
          // decrypt path (dobCiphertext is never read by the search display), but the row still needs one.
          const nameCiphertext = await input.encryption.encryptKycName(`Synthetic Member ${i}`, input.pariwarId);
          const dobCiphertext = await input.encryption.encryptKycName('1990-01-01', input.pariwarId);
          kycRows.push({
            memberId,
            pariwarId: input.pariwarId,
            nameCiphertext,
            dobCiphertext,
            verificationStrength: 'self_declared',
            source: 'manual',
          });
        }
        await db.insert(schema.memberIdentities).values(identityRows);
        await db.insert(schema.memberKycProfiles).values(kycRows);
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK').catch(() => undefined);
        throw err;
      }
    }
  } finally {
    client.release();
  }
  return memberIds;
}
