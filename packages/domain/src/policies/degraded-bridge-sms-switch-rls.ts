// RLS policy declarations for the degraded-mode bridge's Super Admin switch — Story 5.8b (AC12), migration 0188.
//
// GLOBAL tables (⛔ `pariwar_id` — the switch is Trust-wide): the audit_integrity_acknowledgements posture. ENABLE + FORCE RLS
// with an explicit `USING (true)` SELECT policy — "no row is hidden from a `twt_app` reader". `twt_app` is granted SELECT only;
// the change endpoint writes through the BYPASSRLS service role, so ⛔ write policy is needed (a BYPASSRLS session is exempt from
// every policy anyway).
// ⚠ PII minimality (code review 2026-10-28 (second pass), family 6): the history holds a staff NAME (`changed_by_display`) and the
// reason. The read endpoint uses the service pool, but the jobs' send-point read (`readDegradedBridgeSmsSwitch`, which JOINs the
// history) is modelled as `twt_app` while the jobs login's posture is open (roster Row 26) — so the history policy stays. Narrow
// that read to the control row first, then drop the history's `twt_app` SELECT and this policy.

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { degradedBridgeSmsSwitch, degradedBridgeSmsSwitchChanges } from '../schema/degraded_bridge_sms_switch.js';
import { appRole } from './_roles.js';

export const degradedBridgeSmsSwitchGlobalSelect = pgPolicy('degraded_bridge_sms_switch_global_select', {
  as: 'permissive',
  for: 'select',
  to: appRole,
  using: sql`true`,
}).link(degradedBridgeSmsSwitch);

export const degradedBridgeSmsSwitchChangesGlobalSelect = pgPolicy('degraded_bridge_sms_switch_changes_global_select', {
  as: 'permissive',
  for: 'select',
  to: appRole,
  using: sql`true`,
}).link(degradedBridgeSmsSwitchChanges);
