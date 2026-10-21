// RLS policy declarations for the WhatsApp code store — Story 5.13, migration 0178 (WC2).
// `member_wa_opt_in_codes`: SELECT + INSERT + UPDATE, PER-COMMAND (⛔ never `FOR ALL` — ⛔ a DELETE leg: a code row is ⛔ never
// deleted; the only deletion is the `ON DELETE cascade` from its opt-in). The UPDATE leg is narrowed by 0178's column grant
// (the outcome / attempt / consume columns only) and its guard trigger.

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { memberWaOptInCodes } from '../schema/member_wa_opt_in_codes.js';
import { appRole } from './_roles.js';

const SCOPE = sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`;

export const memberWaOptInCodesTenantIsolationSelect = pgPolicy('member_wa_opt_in_codes_tenant_isolation_select', {
  as: 'permissive',
  for: 'select',
  to: appRole,
  using: SCOPE,
}).link(memberWaOptInCodes);

export const memberWaOptInCodesTenantIsolationInsert = pgPolicy('member_wa_opt_in_codes_tenant_isolation_insert', {
  as: 'permissive',
  for: 'insert',
  to: appRole,
  withCheck: SCOPE,
}).link(memberWaOptInCodes);

export const memberWaOptInCodesTenantIsolationUpdate = pgPolicy('member_wa_opt_in_codes_tenant_isolation_update', {
  as: 'permissive',
  for: 'update',
  to: appRole,
  using: SCOPE,
  withCheck: SCOPE,
}).link(memberWaOptInCodes);
