// RLS policy declarations for the Trust's announcement channels — Story 5.14, migration 0190 (Task 1). Both tables are
// TENANT-ISOLATED, PER-COMMAND (SELECT + INSERT + UPDATE), ⛔ never `FOR ALL` (which would carry a DELETE leg: the config row is
// switched off, never deleted; a post record is ⛔ pruned). The `alert-sms-send-rls.ts` template. Story 1.6's closed-failure
// construct: an unset scope → '' → nullif → NULL → 0 rows. ⚠ These bind `twt_app` (the API) only — the job's isolation is the
// accessors' explicit `pariwar_id` predicate (I6).

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { announcementChannelPosts } from '../schema/announcement_channel_posts.js';
import { pariwarAnnouncementChannels } from '../schema/pariwar_announcement_channels.js';
import { appRole } from './_roles.js';

const SCOPE = sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`;

export const pariwarAnnouncementChannelsTenantIsolationSelect = pgPolicy('pariwar_announcement_channels_tenant_isolation_select', {
  as: 'permissive',
  for: 'select',
  to: appRole,
  using: SCOPE,
}).link(pariwarAnnouncementChannels);

export const pariwarAnnouncementChannelsTenantIsolationInsert = pgPolicy('pariwar_announcement_channels_tenant_isolation_insert', {
  as: 'permissive',
  for: 'insert',
  to: appRole,
  withCheck: SCOPE,
}).link(pariwarAnnouncementChannels);

export const pariwarAnnouncementChannelsTenantIsolationUpdate = pgPolicy('pariwar_announcement_channels_tenant_isolation_update', {
  as: 'permissive',
  for: 'update',
  to: appRole,
  using: SCOPE,
  withCheck: SCOPE,
}).link(pariwarAnnouncementChannels);

export const announcementChannelPostsTenantIsolationSelect = pgPolicy('announcement_channel_posts_tenant_isolation_select', {
  as: 'permissive',
  for: 'select',
  to: appRole,
  using: SCOPE,
}).link(announcementChannelPosts);

export const announcementChannelPostsTenantIsolationInsert = pgPolicy('announcement_channel_posts_tenant_isolation_insert', {
  as: 'permissive',
  for: 'insert',
  to: appRole,
  withCheck: SCOPE,
}).link(announcementChannelPosts);

export const announcementChannelPostsTenantIsolationUpdate = pgPolicy('announcement_channel_posts_tenant_isolation_update', {
  as: 'permissive',
  for: 'update',
  to: appRole,
  using: SCOPE,
  withCheck: SCOPE,
}).link(announcementChannelPosts);
