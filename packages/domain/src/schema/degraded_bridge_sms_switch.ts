// The degraded-mode cycle-open SMS BRIDGE's Super Admin SWITCH — Story 5.8b (Task 2; AC12), migration 0188 (`2026-10-28-415`
// FS17 (a); Panel `2026-10-28-414` Q1 A: *"build a switch that can be turned on/off by Superadmin"*).
//
//   · `degraded_bridge_sms_switch`         — ONE row (id = 1), created OFF; its `enabled` is the switch. The fan-out reads it
//                                            once per bridged job, at the bridge attempt. ⛔ DELETE / TRUNCATE (trigger); an
//                                            UPDATE must name a NEW history row whose `enabled` it copies — one that exists
//                                            and is the NEWEST change (trigger; code review 2026-10-28 (third pass)).
//   · `degraded_bridge_sms_switch_changes` — one row per change (who — id AND the name snapshot —, when, ON / OFF, a REQUIRED
//                                            reason). APPEND-ONLY (trigger); `changed_at` is stamped by the DB (trigger).
//
// GLOBAL (⛔ `pariwar_id` — the switch is Trust-wide); FORCE RLS with a `USING (true)` SELECT policy for `twt_app`
// (policies/degraded-bridge-sms-switch-rls.ts); `twt_app` reads only — the change goes through the BYPASSRLS service pool behind
// `requireGlobalPermission`. The hand-authored half (grants, FORCE RLS, the triggers, the seed row) lives in 0188. PII: a STAFF
// name (`changed_by_display`); ⛔ member PII.

import { sql } from 'drizzle-orm';
import { boolean, check, foreignKey, index, pgTable, smallint, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const degradedBridgeSmsSwitchChanges = pgTable(
  'degraded_bridge_sms_switch_changes',
  {
    changeId: uuid('change_id').defaultRandom().primaryKey(),
    /** The state this change set — ON (`true`) or OFF. */
    enabled: boolean('enabled').notNull(),
    /** The Super Admin (session user id). ⛔ FK — the record outlives the account (the role_grants.created_by rationale). */
    changedByActor: uuid('changed_by_actor').notNull(),
    /** The Super Admin's `users.display_name`, SNAPSHOT at change time (review P2-2; R5) — non-blank; a rename never rewrites it. */
    changedByDisplay: text('changed_by_display').notNull(),
    /** Operator-authored, REQUIRED (non-blank, ≤ 500). */
    reason: text('reason').notNull(),
    /** The audit intent line the change was written under (`withCompensatingAudit`) — NOT NULL (code review 2026-10-28 (second pass)). */
    auditId: uuid('audit_id').notNull(),
    /** The DB's clock at insert — a trigger overwrites any written value (0188; the control row's "newest" guard reads it). */
    changedAt: timestamp('changed_at', { withTimezone: true, mode: 'date' }).notNull().default(sql`clock_timestamp()`),
  },
  (t) => [
    index('degraded_bridge_sms_switch_changes_changed_at_idx').on(t.changedAt),
    check('degraded_bridge_sms_switch_changes_reason_check', sql`char_length(btrim(${t.reason})) BETWEEN 1 AND 500`),
    check('degraded_bridge_sms_switch_changes_display_check', sql`char_length(btrim(${t.changedByDisplay})) >= 1`),
  ],
);
export type DegradedBridgeSmsSwitchChangeRow = typeof degradedBridgeSmsSwitchChanges.$inferSelect;

export const degradedBridgeSmsSwitch = pgTable(
  'degraded_bridge_sms_switch',
  {
    /** Always 1 — the singleton. */
    id: smallint('id').primaryKey().default(1),
    enabled: boolean('enabled').notNull().default(false),
    lastChangeId: uuid('last_change_id'),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().default(sql`clock_timestamp()`),
  },
  (t) => [
    check('degraded_bridge_sms_switch_singleton_check', sql`${t.id} = 1`),
    foreignKey({
      name: 'degraded_bridge_sms_switch_last_change_id_fk',
      columns: [t.lastChangeId],
      foreignColumns: [degradedBridgeSmsSwitchChanges.changeId],
    }),
  ],
);
export type DegradedBridgeSmsSwitchRow = typeof degradedBridgeSmsSwitch.$inferSelect;
