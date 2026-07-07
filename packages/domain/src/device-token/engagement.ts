// member_device_tokens engagement read — Story 5.7 (Task 3; AC4).
//
// The v1 in-app-engagement signal the cost-optimization policy (Story 5.7) reads: the member's LAST APP-OPEN
// instant, proxied by `MAX(last_seen_at)` over their ACTIVE device tokens. `last_seen_at` is bumped at app
// open when the client re-registers its push token (the active-token set is rebuilt at app-open — architecture
// §3.4 L1911-1913 / registration.ts's app-open rebuild). The architecture's ideal is per-NOTIFICATION
// engagement (a read-receipt on the specific alert); no such substrate exists yet, so v1 pins the coarse
// app-open proxy (the epic AC's "last app-open timestamp from session activity"; per-notification engagement
// is a later refinement — deferred-work.md).
//
// A transport-free PRIMITIVE — reads ONLY the non-PII `last_seen_at` TIMESTAMP, NEVER the Tier-1 token
// ciphertext (contrast resolveSmsTarget, which decrypts the mobile — this read needs NO decrypt). Runs its
// statement DIRECTLY on the passed (scoped) `Db`; RLS on the session enforces the tenant match.
//
// ── Signature: no pariwarId param (deliberate) ───────────────────────────────────────────────────────────
// Mirrors `getMemberStateAt(db, memberId, at)`'s RLS-ONLY convention (member_id is globally unique), NOT
// `memberExists(db, pariwarId, memberId)`'s defense-in-depth convention. The composition-seam caller
// (`resolveMemberLastEngagement`) is the tenant-scope boundary; RLS on the session covers this accessor. The
// `member_id` filter naturally excludes ADMIN rows (their `member_id` is NULL) — this is MEMBER engagement.
//
// The `member_device_tokens_status_last_seen_idx` index on `(status, last_seen_at)` (migration 0037) backs
// this `WHERE status = 'active'` + `MAX(last_seen_at)` read; NO new index is needed.

import { and, eq, max } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { MemberId } from '../ids/index.js';
import { memberDeviceTokens } from '../schema/member_device_tokens.js';

/**
 * The member's last in-app-engagement instant: `MAX(last_seen_at)` over their ACTIVE device tokens, or `null`
 * when the member has NO active token (⇒ no engagement signal — the cost-optimization policy fails toward
 * reach and does not suppress). Tenant scope is enforced by RLS (the caller has set `app.pariwar_id`); the
 * `member_id` predicate is globally unique. Reads only the timestamp — never the Tier-1 token.
 */
export async function getMemberLastEngagementAt(db: Db, memberId: MemberId): Promise<Date | null> {
  const rows = await db
    .select({ lastSeenAt: max(memberDeviceTokens.lastSeenAt) })
    .from(memberDeviceTokens)
    .where(and(eq(memberDeviceTokens.memberId, memberId), eq(memberDeviceTokens.status, 'active')));
  return rows[0]?.lastSeenAt ?? null;
}
