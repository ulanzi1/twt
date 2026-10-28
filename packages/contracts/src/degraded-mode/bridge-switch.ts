// The degraded-mode bridge's Super Admin switch — Story 5.8b (Task 6; AC12; `2026-10-28-415` FS17 (a); Panel `2026-10-28-414`
// Q1 A: *"build a switch that can be turned on/off by Superadmin, in case later we decide to turn it off"*).
//
// ONE Trust-wide switch for the bridge's cycle-open TEXT (created OFF). The read is for everyone who can see the degraded-mode page;
// the change is `degraded_mode.switch_bridge_sms` (`super_admin` only) with a REQUIRED reason. HTTP endpoints → these DO register in
// openapi/v1.yaml. Timestamps are Iso8601 strings; every object `.strict()`.

import { z } from 'zod';

import { Iso8601Datetime } from '../_common/primitives.js';

/** The longest reason (the history CHECK's bound — migration 0188). */
export const DEGRADED_BRIDGE_SMS_SWITCH_REASON_MAX = 500;

/** What the switch says now, and the change that set it (all three null while it has never been changed — the migration's OFF). */
export const DegradedBridgeSmsSwitchResponse = z
  .object({
    enabled: z.boolean(),
    changedAt: Iso8601Datetime.nullable(),
    changedByActor: z.string().uuid().nullable(),
    reason: z.string().nullable(),
  })
  .strict();
export type DegradedBridgeSmsSwitchResponse = z.output<typeof DegradedBridgeSmsSwitchResponse>;

/** Turn the bridge text ON or OFF for every Pariwar — a REQUIRED reason (trimmed, non-blank, ≤ 500). */
export const DegradedBridgeSmsSwitchSetRequest = z
  .object({
    enabled: z.boolean(),
    reason: z.string().trim().min(1).max(DEGRADED_BRIDGE_SMS_SWITCH_REASON_MAX),
  })
  .strict();
export type DegradedBridgeSmsSwitchSetRequest = z.output<typeof DegradedBridgeSmsSwitchSetRequest>;
