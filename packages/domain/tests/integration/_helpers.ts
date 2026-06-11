// Shared helpers for the Story 1.6 live-DB integration tests.
//
// Not a `.spec.ts`, so the vitest integration glob does not collect it as a
// suite — it is imported by the policy-regression + cross-pariwar-leak specs.
//
// ⚠ RLS-in-tests model (see Story 1.6 dev notes): the test login role
// (twt_dev_app) is a Docker/CI superuser and BYPASSES RLS. To exercise the
// policies we `SET LOCAL ROLE twt_app` on the per-test transaction client to
// shed superuser, then `setPariwarScope`. Seeding happens BEFORE entering app
// scope (as superuser, RLS bypassed) so both tenants' rows land regardless of
// the withCheck policy. afterEach ROLLBACK (setupLiveDb) reverts the SET LOCAL
// role + scope + seed rows.

import { randomUUID } from 'node:crypto';

import type pg from 'pg';

import { setPariwarScope, type Db } from '../../src/db.js';
import { pariwarId as toPariwarId } from '../../src/ids/index.js';
import type { ScopeDimension } from '../../src/rbac/scope.js';
import * as schema from '../../src/schema/index.js';
import type { BrandingBundle } from '../../src/schema/pariwar_passport.js';

// Branded PariwarId constants (Story 1.7). A PariwarId IS a string, so these stay
// drop-in for the events_log helpers (string columns / setPariwarScope) AND
// satisfy the branded pariwar_passport.pariwar_id column in `eq(...)` comparisons.
export const PARIWAR_A = toPariwarId('11111111-1111-1111-1111-111111111111');
export const PARIWAR_B = toPariwarId('22222222-2222-2222-2222-222222222222');

// Dedicated tenants for the runAsCrossTenant helper tests, which COMMIT rows
// (the append-only trigger blocks cleanup, so they persist). Kept distinct from
// A/B so the exact-count RLS-enforcement assertions — which scope to A/B and
// rely on per-test ROLLBACK isolation — never observe these committed rows.
export const PARIWAR_X = toPariwarId('33333333-3333-3333-3333-333333333333');
export const PARIWAR_Y = toPariwarId('44444444-4444-4444-4444-444444444444');

export interface SeedOptions {
  streamId?: string;
  eventVersion?: number;
  eventType?: string;
  payload?: unknown;
}

/** Insert one events_log row. Returns the streamId used (random by default). */
export async function seedEvent(
  tx: Db,
  pariwarId: string,
  opts: SeedOptions = {},
): Promise<string> {
  const streamId = opts.streamId ?? randomUUID();
  await tx.insert(schema.eventsLog).values({
    streamId,
    eventType: opts.eventType ?? 'test.created',
    payload: opts.payload ?? {},
    eventVersion: opts.eventVersion ?? 1,
    actorId: null,
    pariwarId,
  });
  return streamId;
}

const DEFAULT_BRANDING: BrandingBundle = {
  logo_url: 'https://cdn.twt.local/test/logo.png',
  primary_color: '#0A3D62',
  secondary_color: '#FFFFFF',
};

export interface SeedPassportOptions {
  displayNameEn?: string;
  displayNameHi?: string;
  legalName?: string;
  trustRegistrationId?: string | null;
  brandingBundle?: BrandingBundle;
  localeDefault?: 'hi' | 'en';
  createdBy?: string | null;
}

/**
 * Insert one pariwar_passport row. Like seedEvent, this is meant to run BEFORE
 * entering app scope (as the Docker superuser, RLS bypassed) so both tenants'
 * rows land regardless of the write-isolation policy; afterEach ROLLBACK
 * (setupLiveDb) reverts it (the Passport table is NOT append-only, so a rollback
 * — or even DELETE — would also work, but the per-test tx keeps it clean).
 * `id` is branded via the `pariwarId()` smart constructor (validates UUID shape).
 */
export async function seedPassport(
  tx: Db,
  id: string,
  opts: SeedPassportOptions = {},
): Promise<void> {
  await tx.insert(schema.pariwarPassport).values({
    pariwarId: toPariwarId(id),
    displayNameEn: opts.displayNameEn ?? 'Test Pariwar EN',
    displayNameHi: opts.displayNameHi ?? 'परीक्षण परिवार',
    legalName: opts.legalName ?? 'Test Welfare Trust',
    trustRegistrationId: opts.trustRegistrationId ?? null,
    brandingBundle: opts.brandingBundle ?? DEFAULT_BRANDING,
    localeDefault: opts.localeDefault ?? 'en',
    createdBy: opts.createdBy ?? null,
  });
}

export interface SeedRoleGrantOptions {
  userId?: string;
  role?: string;
  scopeDimension?: ScopeDimension;
  scopeValue?: string | null;
  createdBy?: string | null;
}

/**
 * Insert one role_grants row (Story 1.8). Like seedEvent/seedPassport, run this
 * BEFORE entering app scope (as the Docker superuser, RLS bypassed) so rows for
 * BOTH tenants land regardless of the write-isolation policy; afterEach ROLLBACK
 * (setupLiveDb) reverts it. role_grants is a SCOPED table — cross-Pariwar reads
 * must return 0 rows (asserted by cross-pariwar-leak.spec.ts). Returns the userId.
 */
export async function seedRoleGrant(
  tx: Db,
  pariwarId: string,
  opts: SeedRoleGrantOptions = {},
): Promise<string> {
  const userId = opts.userId ?? randomUUID();
  await tx.insert(schema.roleGrants).values({
    userId,
    pariwarId: toPariwarId(pariwarId),
    role: opts.role ?? 'district_admin',
    scopeDimension: opts.scopeDimension ?? 'district',
    scopeValue: opts.scopeValue ?? 'Patna',
    createdBy: opts.createdBy ?? null,
  });
  return userId;
}

/** Shed Docker superuser (SET ROLE twt_app) + set the pariwar scope, in-tx. */
export async function enterAppScope(
  client: pg.PoolClient,
  pariwarId: string,
): Promise<void> {
  await client.query('SET LOCAL ROLE twt_app');
  await setPariwarScope(client, pariwarId);
}

/** Shed superuser without setting a scope — for the fail-closed probe. */
export async function enterAppRoleNoScope(client: pg.PoolClient): Promise<void> {
  await client.query('SET LOCAL ROLE twt_app');
}
