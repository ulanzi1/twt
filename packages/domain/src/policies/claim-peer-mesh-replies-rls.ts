// RLS policy declarations for the neighbours' replies and answers — Story 6.27a, migration 0156 (PM7 (a)).
// SELECT + INSERT + UPDATE, PER-COMMAND (⛔ never `FOR ALL` — ⛔ a DELETE leg: a reply or an answer is ⛔ never deleted; the
// only deletion is the `ON DELETE cascade` from `claims`). The UPDATE legs are narrowed by 0156's column grants
// (`submitted_at`; `superseded_at` + the two erasure columns) and are load-bearing: without the answers' UPDATE policy
// `anonymizeMember`'s scrub silently updates 0 rows under FORCE (`2026-10-04-279` A12).

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { claimPeerMeshReplies, claimPeerMeshReplyAnswers } from '../schema/claim_peer_mesh_replies.js';
import { appRole } from './_roles.js';

const SCOPE = sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`;

export const claimPeerMeshRepliesTenantIsolationSelect = pgPolicy('claim_peer_mesh_replies_tenant_isolation_select', {
  as: 'permissive',
  for: 'select',
  to: appRole,
  using: SCOPE,
}).link(claimPeerMeshReplies);

export const claimPeerMeshRepliesTenantIsolationInsert = pgPolicy('claim_peer_mesh_replies_tenant_isolation_insert', {
  as: 'permissive',
  for: 'insert',
  to: appRole,
  withCheck: SCOPE,
}).link(claimPeerMeshReplies);

export const claimPeerMeshRepliesTenantIsolationUpdate = pgPolicy('claim_peer_mesh_replies_tenant_isolation_update', {
  as: 'permissive',
  for: 'update',
  to: appRole,
  using: SCOPE,
  withCheck: SCOPE,
}).link(claimPeerMeshReplies);

export const claimPeerMeshReplyAnswersTenantIsolationSelect = pgPolicy('claim_peer_mesh_reply_answers_tenant_isolation_select', {
  as: 'permissive',
  for: 'select',
  to: appRole,
  using: SCOPE,
}).link(claimPeerMeshReplyAnswers);

export const claimPeerMeshReplyAnswersTenantIsolationInsert = pgPolicy('claim_peer_mesh_reply_answers_tenant_isolation_insert', {
  as: 'permissive',
  for: 'insert',
  to: appRole,
  withCheck: SCOPE,
}).link(claimPeerMeshReplyAnswers);

export const claimPeerMeshReplyAnswersTenantIsolationUpdate = pgPolicy('claim_peer_mesh_reply_answers_tenant_isolation_update', {
  as: 'permissive',
  for: 'update',
  to: appRole,
  using: SCOPE,
  withCheck: SCOPE,
}).link(claimPeerMeshReplyAnswers);
