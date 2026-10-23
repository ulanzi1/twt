// RLS policy declarations for `member_nominee_links` — Story 6.36e, migration 0181.
// SELECT + INSERT + UPDATE, PER-COMMAND (⛔ never `FOR ALL`, ⛔ no DELETE leg — a link is ⛔ never deleted; an end or an
// erasure is a state). The UPDATE leg is narrowed by 0181's column grant (`state`, `answer`, `responded_at`, `ended_at`,
// `end_reason`) and is load-bearing: the declare's end, the marked member's answer and `anonymizeMember`'s erasure all UPDATE,
// and each would silently update 0 rows under FORCE without it (`2026-10-04-279` A12).

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { memberNomineeLinks } from '../schema/member_nominee_links.js';
import { appRole } from './_roles.js';

const SCOPE = sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`;

export const memberNomineeLinksTenantIsolationSelect = pgPolicy('member_nominee_links_tenant_isolation_select', {
  as: 'permissive',
  for: 'select',
  to: appRole,
  using: SCOPE,
}).link(memberNomineeLinks);

export const memberNomineeLinksTenantIsolationInsert = pgPolicy('member_nominee_links_tenant_isolation_insert', {
  as: 'permissive',
  for: 'insert',
  to: appRole,
  withCheck: SCOPE,
}).link(memberNomineeLinks);

export const memberNomineeLinksTenantIsolationUpdate = pgPolicy('member_nominee_links_tenant_isolation_update', {
  as: 'permissive',
  for: 'update',
  to: appRole,
  using: SCOPE,
  withCheck: SCOPE,
}).link(memberNomineeLinks);
