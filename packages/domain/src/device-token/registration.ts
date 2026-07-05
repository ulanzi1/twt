// member_device_tokens registration accessors — Story 5.2 (Task 3).
//
// A transport-free PRIMITIVE: NO HTTP, NO audit, NO encryption. The route encrypts the token (Tier-1) +
// computes its blind index in the app layer (the member_nominees precedent) and passes ciphertext +
// blind index in; the accessor persists them. Runs its statements DIRECTLY on the passed (scoped) `Db`, so
// a member caller is already inside its `SET LOCAL app.pariwar_id` tx (RLS enforces the tenant match).
//
// ── App-open rebuild (architecture §3.3) ──────────────────────────────────────────────────────────────
// `upsertActiveToken` marks the principal's OTHER same-platform tokens `stale`, then upserts THIS token
// `active` — so the next app open rebuilds the active-token set (a re-installed app / rotated token
// supersedes the old one without a manual unregister). Idempotent on the unique key.

import { and, eq, ne, sql } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { MemberId, PariwarId } from '../ids/index.js';
import {
  type DeviceTokenPlatform,
  type DeviceTokenPrincipalType,
  type MemberDeviceTokenRow,
  memberDeviceTokens,
} from '../schema/member_device_tokens.js';

/** One device-token registration to persist. Ciphertext + blind index are computed in the app layer. */
export interface DeviceTokenUpsertInput {
  readonly pariwarId: PariwarId;
  readonly principalType: DeviceTokenPrincipalType;
  /** The owning principal's id (member_id or admin user id). */
  readonly principalId: string;
  /** Set for member principals (= principalId) so RTBF cascades; NULL for admin. */
  readonly memberId: MemberId | null;
  readonly platform: DeviceTokenPlatform;
  /** Tier-1 envelope ciphertext (serialized) of the device token. */
  readonly tokenCiphertext: string;
  /** HMAC blind index of the token (dedup on the unique key + lookup without decrypt). */
  readonly tokenBlindIndex: string;
}

/**
 * Register a device token for a principal: mark the principal's OTHER same-platform `active` tokens
 * `stale` (app-open rebuild), then upsert THIS token `active` (latest-wins on the unique key). Idempotent
 * — re-registering the same token re-activates it + bumps `last_seen_at`. One scoped tx (the caller's).
 */
export async function upsertActiveToken(db: Db, input: DeviceTokenUpsertInput): Promise<void> {
  // Serialize concurrent registrations for the SAME (pariwarId, principalType, principalId, platform) —
  // without this, two concurrent first-registrations can each run the "mark siblings stale" UPDATE before
  // either commits its INSERT, leaving two rows simultaneously `active` for one platform. The lock is
  // transaction-scoped (auto-releases at COMMIT/ROLLBACK, `db` is always the caller's scope tx) and
  // serializes even when no rows exist yet (a row-level lock alone can't, since there's nothing to lock on
  // a first registration) — mirrors `packages/domain/src/idempotency/keyed-store.ts`'s claim-lock pattern.
  const lockKey = `member_device_tokens:${input.pariwarId}:${input.principalType}:${input.principalId}:${input.platform}`;
  await db.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`);

  // Stale the principal's OTHER same-platform active tokens (exclude THIS token's blind index so a
  // re-register of the same token does not first-stale-then-reactivate needlessly).
  await db
    .update(memberDeviceTokens)
    .set({ status: 'stale' })
    .where(
      and(
        eq(memberDeviceTokens.pariwarId, input.pariwarId),
        eq(memberDeviceTokens.principalType, input.principalType),
        eq(memberDeviceTokens.principalId, input.principalId),
        eq(memberDeviceTokens.platform, input.platform),
        eq(memberDeviceTokens.status, 'active'),
        ne(memberDeviceTokens.tokenBlindIndex, input.tokenBlindIndex),
      ),
    );

  // Upsert THIS token active. On conflict (same Pariwar/principal/platform/token) re-activate + bump
  // last_seen_at (DB clock) — a previously stale/invalid token re-registered on app open comes back active.
  await db
    .insert(memberDeviceTokens)
    .values({
      pariwarId: input.pariwarId,
      principalType: input.principalType,
      principalId: input.principalId,
      memberId: input.memberId,
      platform: input.platform,
      tokenCiphertext: input.tokenCiphertext,
      tokenBlindIndex: input.tokenBlindIndex,
      status: 'active',
    })
    .onConflictDoUpdate({
      target: [
        memberDeviceTokens.pariwarId,
        memberDeviceTokens.principalType,
        memberDeviceTokens.principalId,
        memberDeviceTokens.platform,
        memberDeviceTokens.tokenBlindIndex,
      ],
      set: { status: 'active', lastSeenAt: sql`now()`, tokenCiphertext: input.tokenCiphertext },
    });
}

/**
 * List a principal's `active` device tokens within a Pariwar (the delivery-resolver read: the composition
 * layer decrypts each token + routes fcm-vs-apns by `platform`). Returns `[]` when none are active.
 * Tenant-scoped (RLS + the explicit predicate).
 */
export async function listActiveTokens(
  db: Db,
  pariwarId: PariwarId,
  principalType: DeviceTokenPrincipalType,
  principalId: string,
): Promise<MemberDeviceTokenRow[]> {
  return db
    .select()
    .from(memberDeviceTokens)
    .where(
      and(
        eq(memberDeviceTokens.pariwarId, pariwarId),
        eq(memberDeviceTokens.principalType, principalType),
        eq(memberDeviceTokens.principalId, principalId),
        eq(memberDeviceTokens.status, 'active'),
      ),
    );
}

/**
 * Mark a token `invalid` (AC5) — the best-effort isolated write the send-result seam calls on an
 * UNRECOVERABLE Firebase token error. Filters on the FULL ownership tuple the table's own unique key
 * models — `(pariwar_id, principal_type, principal_id, platform, token_blind_index)` — so this can only
 * ever match the ONE row it's scoped to. `pariwar_id` is filtered EXPLICITLY so it is correct on the
 * BYPASSRLS `servicePool` (AI-4-3(d) — the invalidation write never runs on the caller's tx). Returns the
 * number of rows marked (0 or 1 — no ambiguity, since the filter IS the unique key).
 *
 * ── Why the full tuple, not blind-index alone (code-review fix, 2026-07-05) ─────────────────────────────
 * `token_blind_index` is an HMAC of `(token, pariwarId)` ONLY — it does NOT key on the principal. Filtering
 * on blind-index alone meant two DIFFERENT principals in the SAME Pariwar who register the IDENTICAL raw
 * token string (e.g. a shared family device) would collide, and one principal's unrecoverable send failure
 * would invalidate the OTHER principal's still-good token — breaking the table's own ownership model
 * (pariwar + principal + platform + token). Scoping on the full tuple closes that gap.
 */
export async function markInvalid(
  db: Db,
  pariwarId: PariwarId,
  principalType: DeviceTokenPrincipalType,
  principalId: string,
  platform: DeviceTokenPlatform,
  tokenBlindIndex: string,
): Promise<number> {
  const rows = await db
    .update(memberDeviceTokens)
    .set({ status: 'invalid' })
    .where(
      and(
        eq(memberDeviceTokens.pariwarId, pariwarId),
        eq(memberDeviceTokens.principalType, principalType),
        eq(memberDeviceTokens.principalId, principalId),
        eq(memberDeviceTokens.platform, platform),
        eq(memberDeviceTokens.tokenBlindIndex, tokenBlindIndex),
      ),
    )
    .returning({ tokenId: memberDeviceTokens.tokenId });
  return rows.length;
}
