// RLS policy declarations for the GLOBAL member-identity/auth carve-out tables —
// Story 3.2 (Tasks 2, 3, 7, R5). Mirrors `identity-auth-rls.ts` (the admin carve-out).
//
// ⚠ Reconciliation R2 (load-bearing): these tables are GLOBAL, NOT pariwar-scoped.
// Member login + OTP request/verify + token refresh all execute BEFORE any
// `app.pariwar_id` is set — keyed by the mobile blind index (login OTP), the opaque
// refresh token (refresh), or the bearer member id (step-up). Copying the tenant
// construct here would make every pre-scope read return 0 rows and break member auth.
//
// POSTURE (mirrors the admin carve-out, ADR-0009): ENABLE + FORCE RLS for
// consistency + defense-in-depth, with a permissive `USING (true) WITH CHECK (true)`
// policy for `twt_app`. Access is funnelled through the narrow apps/api member-auth
// repo; the stored secrets are hardened regardless (OTP/token are SHA-256 hashes,
// mobile is referenced only by its blind index here — the Tier-1 envelope lives on
// `member_identities`). `member_step_up_elevations` carries no secret at all.

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { memberAuthOtps } from '../schema/member_auth_otps.js';
import { memberPariwarSelects } from '../schema/member_pariwar_selects.js';
import { memberRefreshTokens } from '../schema/member_refresh_tokens.js';
import { memberSignupContinuations } from '../schema/member_signup_continuations.js';
import { memberStepUpElevations } from '../schema/member_step_up_elevations.js';
import { memberTrustedDevices } from '../schema/member_trusted_devices.js';
import { appRole } from './_roles.js';

export const memberAuthOtpsGlobalAccess = pgPolicy('member_auth_otps_global_access', {
  as: 'permissive',
  for: 'all',
  to: appRole,
  using: sql`true`,
  withCheck: sql`true`,
}).link(memberAuthOtps);

export const memberRefreshTokensGlobalAccess = pgPolicy('member_refresh_tokens_global_access', {
  as: 'permissive',
  for: 'all',
  to: appRole,
  using: sql`true`,
  withCheck: sql`true`,
}).link(memberRefreshTokens);

export const memberTrustedDevicesGlobalAccess = pgPolicy('member_trusted_devices_global_access', {
  as: 'permissive',
  for: 'all',
  to: appRole,
  using: sql`true`,
  withCheck: sql`true`,
}).link(memberTrustedDevices);

export const memberStepUpElevationsGlobalAccess = pgPolicy('member_step_up_elevations_global_access', {
  as: 'permissive',
  for: 'all',
  to: appRole,
  using: sql`true`,
  withCheck: sql`true`,
}).link(memberStepUpElevations);

export const memberSignupContinuationsGlobalAccess = pgPolicy(
  'member_signup_continuations_global_access',
  {
    as: 'permissive',
    for: 'all',
    to: appRole,
    using: sql`true`,
    withCheck: sql`true`,
  },
).link(memberSignupContinuations);

export const memberPariwarSelectsGlobalAccess = pgPolicy('member_pariwar_selects_global_access', {
  as: 'permissive',
  for: 'all',
  to: appRole,
  using: sql`true`,
  withCheck: sql`true`,
}).link(memberPariwarSelects);
