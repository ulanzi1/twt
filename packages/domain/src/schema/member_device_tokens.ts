// `member_device_tokens` — the per-member / per-admin push device-token registration substrate (Story 5.2,
// Task 3). Backs the `push` channel: the mobile app registers its FCM/APNs token on app open (the Story
// 3.2 consumer); admin device tokens register on admin auth (the Story 1.9 consumer).
//
// TENANT-ISOLATED (mirrors member_nominees / member_medical_disclosures — RLS on `pariwar_id`). A member
// belongs to possibly MANY Pariwars (member_identities); the SAME physical device token is stored as ONE
// independently-encrypted row PER Pariwar under the unique key, so a Firebase not-registered error against
// one Pariwar's send invalidates only THAT Pariwar's row (v1 behavior — no cross-Pariwar raw-token
// correlation; see Story 5.2 Task 3 note). Admin tokens key on the nil-UUID admin-global namespace
// (ADMIN_GLOBAL_NAMESPACE) as their `pariwar_id`, matching the admin-identity family's global sentinel.
//
// ── PII discipline (architecture §3.4 L1937 — device tokens are Tier-1 PII) ────────────────────────────
//   · token → Tier-1 envelope ciphertext (`piiColumn(1, 'member_device_token')`). NEVER stored, logged, or
//     audited in plaintext; the audit hash over a token is the `token_blind_index` HMAC (AI-4-3(c)).
//   · token_blind_index → the HMAC blind index for dedup / lookup-without-decrypt / audit hashing.
//   · principal_type / principal_id / platform / status → non-PII plaintext (constrained by CHECKs in the
//     migration + the contracts enums, not the DB type — the kyc_transactions.status "text for the swap
//     seam" posture).
//
// ── RTBF cascade (Story 3.12) ──────────────────────────────────────────────────────────────────────────
// `member_id` carries an FK → members.member_id `onDelete: 'cascade'` (mirror member_medical_disclosures)
// so a member's device tokens are purged on the withdrawn→anonymized RTBF transition. It is NULLABLE:
// member principals set it (= principal_id); admin principals leave it NULL (an admin is not a member).
//
// Naming discipline per architecture L3663-3677: DB columns snake_case, TS camelCase.

import { check, index, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

import { piiColumn } from '../encryption/column.js';
import type { DeviceTokenId, MemberId, PariwarId } from '../ids/index.js';
import { members } from './members.js';

export const memberDeviceTokens = pgTable(
  'member_device_tokens',
  {
    // Per-row address (UUID). Server-side gen_random_uuid() default. Branded `DeviceTokenId`. The token
    // itself is Tier-1 ciphertext, so the row is keyed by this opaque id, never by the token.
    tokenId: uuid('token_id').defaultRandom().primaryKey().$type<DeviceTokenId>(),

    // Multi-tenant scope (RLS predicate column; branded). Admin tokens use ADMIN_GLOBAL_NAMESPACE.
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),

    // The owning principal KIND: 'member' | 'admin' (CHECK-constrained in the migration).
    principalType: text('principal_type').notNull(),

    // The owning principal's id — a member_id or an admin user id (both UUIDs from distinct spaces; the
    // principal_type disambiguates). Part of the unique key + the rebuild/invalidate lookups.
    principalId: uuid('principal_id').notNull(),

    // RTBF-cascade FK → members.member_id (member principals only; NULL for admin). NOT the RLS column.
    memberId: uuid('member_id')
      .$type<MemberId>()
      .references(() => members.memberId, { onDelete: 'cascade' }),

    // 'android' | 'ios' (CHECK-constrained). Routes fcm-vs-apns at delivery time (5.1 selectProvider).
    platform: text('platform').notNull(),

    // Tier-1 envelope ciphertext (serialized `enc:v1:…`) of the device token. NEVER logged/echoed.
    tokenCiphertext: piiColumn(1, 'member_device_token')('token_ciphertext').notNull(),

    // HMAC blind index of the token — dedup on the unique key + lookup/invalidate without decrypt +
    // the AI-4-3(c) audit hash. NEVER the raw token, NEVER sha256(token).
    tokenBlindIndex: text('token_blind_index').notNull(),

    // 'active' | 'stale' | 'invalid' (CHECK-constrained). App-open rebuild marks siblings 'stale'; an
    // unrecoverable Firebase token error marks 'invalid' (AC5). Default 'active'.
    status: text('status').notNull().default('active'),

    registeredAt: timestamp('registered_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    // Bumped on each re-registration (app open). The stale/invalid cleanup cadence ages off this marker.
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  // Idempotency + dedup: one row per (Pariwar, principal, platform, token). Re-registration upserts on
  // this key (declaration-write latest-wins). token_blind_index carries the token identity WITHOUT decrypt.
  (t) => [
    unique('member_device_tokens_principal_token_uq').on(
      t.pariwarId,
      t.principalType,
      t.principalId,
      t.platform,
      t.tokenBlindIndex,
    ),
    // A member principal MUST carry the RTBF-cascade FK; an admin principal MUST NOT (mirrors 0037's SQL).
    check(
      'member_device_tokens_principal_member_id_ck',
      sql`(${t.principalType} = 'member' AND ${t.memberId} IS NOT NULL) OR (${t.principalType} = 'admin' AND ${t.memberId} IS NULL)`,
    ),
    // Backs the RTBF cascade delete on `members` (Postgres does not auto-index FK columns).
    index('member_device_tokens_member_id_idx').on(t.memberId),
    // Backs the Class C cleanup job's (status, last_seen_at) filter.
    index('member_device_tokens_status_last_seen_idx').on(t.status, t.lastSeenAt),
  ],
);

export type MemberDeviceTokenRow = typeof memberDeviceTokens.$inferSelect;
export type MemberDeviceTokenInsert = typeof memberDeviceTokens.$inferInsert;

/** The owning-principal kinds (the `principal_type` value set — constrained here + by a DB CHECK). */
export const DEVICE_TOKEN_PRINCIPAL_TYPES = ['member', 'admin'] as const;
export type DeviceTokenPrincipalType = (typeof DEVICE_TOKEN_PRINCIPAL_TYPES)[number];

/** The device-token platforms (routes fcm-vs-apns). */
export const DEVICE_TOKEN_PLATFORMS = ['android', 'ios'] as const;
export type DeviceTokenPlatform = (typeof DEVICE_TOKEN_PLATFORMS)[number];

/** The token lifecycle states. */
export const DEVICE_TOKEN_STATUSES = ['active', 'stale', 'invalid'] as const;
export type DeviceTokenStatus = (typeof DEVICE_TOKEN_STATUSES)[number];
