// `member_step_up_elevations` — member step-up elevation records (Story 3.2, Task 7).
//
// GLOBAL member-identity/auth carve-out (R4): the admin step-up stores
// `elevatedUntil`/`elevatedAction` on the server `@fastify/session`; members are
// JWT/bearer with NO server session, so elevation is a SERVER-SIDE RECORD here —
// revocable + auditable, consistent with the Postgres-only posture. Embedding the
// elevation solely in a client token is rejected (it would break per-OTP
// revocability, §2.2).
//
// The `requireMemberStepUp(deps, actionContext)` gate passes only when a FRESH row
// (`elevated_until > now`) exists for this member AND `action_context` matches
// EXACTLY — an elevation for action A never satisfies a gate on action B. The OTP
// TTL (3 min, to enter the code) and the elevation/commit window (~5 min) are two
// distinct timers (`stepUpOtpTtlMs` vs `stepUpElevatedMs`).

import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import type { MemberId } from '../ids/index.js';

export const memberStepUpElevations = pgTable(
  'member_step_up_elevations',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    // Plain uuid (no FK to the RLS-forced `members`; this global table is bearer-keyed).
    memberId: uuid('member_id').$type<MemberId>().notNull(),

    // The exact operation this elevation authorizes (action-context binding).
    actionContext: text('action_context').notNull(),

    // The ~5-min commit window the gate checks (`elevated_until > now`).
    elevatedUntil: timestamp('elevated_until', { withTimezone: true, mode: 'date' }).notNull(),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    // The gate's freshest-elevation lookup for (member, action_context).
    index('member_step_up_elevations_member_action_idx').on(t.memberId, t.actionContext),
  ],
);

export type MemberStepUpElevationRow = typeof memberStepUpElevations.$inferSelect;
export type MemberStepUpElevationInsert = typeof memberStepUpElevations.$inferInsert;
