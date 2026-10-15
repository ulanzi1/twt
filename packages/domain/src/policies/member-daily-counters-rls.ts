// RLS policy declarations for `member_daily_counters` + `pariwar_daily_counters` — Story 6.36b, migration 0162.
// SELECT + INSERT + UPDATE, PER-COMMAND (⛔ never `FOR ALL`, ⛔ no DELETE leg). The UPDATE leg (narrowed by 0162's column
// grant to `count`) is load-bearing: the atomic `INSERT … ON CONFLICT DO UPDATE` needs it.

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { memberDailyCounters, pariwarDailyCounters } from '../schema/member_daily_counters.js';
import { appRole } from './_roles.js';

const SCOPE = sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`;

export const memberDailyCountersTenantIsolationSelect = pgPolicy('member_daily_counters_tenant_isolation_select', {
  as: 'permissive',
  for: 'select',
  to: appRole,
  using: SCOPE,
}).link(memberDailyCounters);

export const memberDailyCountersTenantIsolationInsert = pgPolicy('member_daily_counters_tenant_isolation_insert', {
  as: 'permissive',
  for: 'insert',
  to: appRole,
  withCheck: SCOPE,
}).link(memberDailyCounters);

export const memberDailyCountersTenantIsolationUpdate = pgPolicy('member_daily_counters_tenant_isolation_update', {
  as: 'permissive',
  for: 'update',
  to: appRole,
  using: SCOPE,
  withCheck: SCOPE,
}).link(memberDailyCounters);

export const pariwarDailyCountersTenantIsolationSelect = pgPolicy('pariwar_daily_counters_tenant_isolation_select', {
  as: 'permissive',
  for: 'select',
  to: appRole,
  using: SCOPE,
}).link(pariwarDailyCounters);

export const pariwarDailyCountersTenantIsolationInsert = pgPolicy('pariwar_daily_counters_tenant_isolation_insert', {
  as: 'permissive',
  for: 'insert',
  to: appRole,
  withCheck: SCOPE,
}).link(pariwarDailyCounters);

export const pariwarDailyCountersTenantIsolationUpdate = pgPolicy('pariwar_daily_counters_tenant_isolation_update', {
  as: 'permissive',
  for: 'update',
  to: appRole,
  using: SCOPE,
  withCheck: SCOPE,
}).link(pariwarDailyCounters);
