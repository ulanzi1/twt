// RLS policy declarations for `known_people_campaigns` — Story 6.36c, migration 0164.
// SELECT + INSERT + UPDATE, PER-COMMAND (⛔ never `FOR ALL`, ⛔ no DELETE leg — a campaign is ⛔ never deleted). The UPDATE
// leg is narrowed by 0164's column grant (`ended_at`, `ended_by_actor_id`) and is load-bearing: `/end` would silently update
// 0 rows under FORCE without it (`2026-10-04-279` A12).

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { knownPeopleCampaigns } from '../schema/known_people_campaigns.js';
import { appRole } from './_roles.js';

const SCOPE = sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`;

export const knownPeopleCampaignsTenantIsolationSelect = pgPolicy('known_people_campaigns_tenant_isolation_select', {
  as: 'permissive',
  for: 'select',
  to: appRole,
  using: SCOPE,
}).link(knownPeopleCampaigns);

export const knownPeopleCampaignsTenantIsolationInsert = pgPolicy('known_people_campaigns_tenant_isolation_insert', {
  as: 'permissive',
  for: 'insert',
  to: appRole,
  withCheck: SCOPE,
}).link(knownPeopleCampaigns);

export const knownPeopleCampaignsTenantIsolationUpdate = pgPolicy('known_people_campaigns_tenant_isolation_update', {
  as: 'permissive',
  for: 'update',
  to: appRole,
  using: SCOPE,
  withCheck: SCOPE,
}).link(knownPeopleCampaigns);
