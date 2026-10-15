// RLS policy declarations for `member_known_people` — Story 6.36b, migration 0162.
// SELECT + INSERT + UPDATE, PER-COMMAND (⛔ never `FOR ALL`, ⛔ no DELETE leg — a link is ⛔ never deleted; erasure moves it
// to `erased`). The UPDATE leg is narrowed by 0162's column grant (`state`, `responded_at`, `ended_at`) and is
// load-bearing: the answer, the removal, the withdrawal, the lazy lapse and `anonymizeMember`'s erasure all UPDATE, and
// each would silently update 0 rows under FORCE without it (`2026-10-04-279` A12).

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { memberKnownPeople } from '../schema/member_known_people.js';
import { appRole } from './_roles.js';

const SCOPE = sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`;

export const memberKnownPeopleTenantIsolationSelect = pgPolicy('member_known_people_tenant_isolation_select', {
  as: 'permissive',
  for: 'select',
  to: appRole,
  using: SCOPE,
}).link(memberKnownPeople);

export const memberKnownPeopleTenantIsolationInsert = pgPolicy('member_known_people_tenant_isolation_insert', {
  as: 'permissive',
  for: 'insert',
  to: appRole,
  withCheck: SCOPE,
}).link(memberKnownPeople);

export const memberKnownPeopleTenantIsolationUpdate = pgPolicy('member_known_people_tenant_isolation_update', {
  as: 'permissive',
  for: 'update',
  to: appRole,
  using: SCOPE,
  withCheck: SCOPE,
}).link(memberKnownPeople);
