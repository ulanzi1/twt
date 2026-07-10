// RLS policy declarations for the peer-mesh tables — Story 6.6 (Task 3).
//
// TENANT-ISOLATED read + write for BOTH `claim_peer_mesh_selections` and its child
// `claim_peer_mesh_pings` — mirrors `claims-rls.ts` / `claim-documents-rls.ts` EXACTLY,
// NOT the cross-readable passport carve-out. A selection + its ping intents belong to
// exactly one Pariwar; every access (the select job's write, the window-expiry job's
// outcome update, the future dispatch-composition story's read) runs under that Pariwar's
// `app.pariwar_id`.
//
// Uses Story 1.6's closed-failure construct
// `pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`: unset scope →
// '' → nullif → NULL → 0 rows (quiet fail-closed). A cross-tenant reader sees NOTHING on
// either table (Task 7 asserts this).

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { claimPeerMeshSelections } from '../schema/claim_peer_mesh_selections.js';
import { claimPeerMeshPings } from '../schema/claim_peer_mesh_pings.js';
import { appRole } from './_roles.js';

// ── claim_peer_mesh_selections ────────────────────────────────────────────────

export const claimPeerMeshSelectionsTenantIsolationSelect = pgPolicy(
  'claim_peer_mesh_selections_tenant_isolation_select',
  {
    as: 'permissive',
    for: 'select',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(claimPeerMeshSelections);

export const claimPeerMeshSelectionsTenantIsolationWrite = pgPolicy(
  'claim_peer_mesh_selections_tenant_isolation_write',
  {
    as: 'permissive',
    for: 'all',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
    withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(claimPeerMeshSelections);

// ── claim_peer_mesh_pings ─────────────────────────────────────────────────────

export const claimPeerMeshPingsTenantIsolationSelect = pgPolicy(
  'claim_peer_mesh_pings_tenant_isolation_select',
  {
    as: 'permissive',
    for: 'select',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(claimPeerMeshPings);

export const claimPeerMeshPingsTenantIsolationWrite = pgPolicy(
  'claim_peer_mesh_pings_tenant_isolation_write',
  {
    as: 'permissive',
    for: 'all',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
    withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(claimPeerMeshPings);
