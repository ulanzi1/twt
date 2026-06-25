// @fastify/jwt registration for the member (mobile) session model (Story 3.2, Task 3).
//
// Members use the §2.4 hybrid: a short-lived ACCESS token (JWT, ≤15 min) + an opaque
// refresh token (NOT a JWT — see member_refresh_tokens). This plugin registers
// @fastify/jwt bound to the asymmetric keypair in `deps.memberJwt`, with the
// algorithm PINNED (§2.4 line 1447): asymmetric ES256/RS256 only — `none` is
// structurally rejected (verification needs the public-key signature) and a
// symmetric (HS256) token fails the `verify.algorithms` allowlist.
//
// Two token TYPES are signed with this key (distinguished by the `typ` claim):
//   · 'access'              — the member session access token (member-session-guard).
//   · 'signup_continuation' — the first-signup seam (R5); single-use enforced in DB.
// Registered globally (decorates `app.jwt` + `request.jwtVerify`); it adds NO
// automatic auth — every protected route calls the member-session guard explicitly,
// so admin/session routes are unaffected.

import fastifyJwt from '@fastify/jwt';
import type { FastifyInstance } from 'fastify';

import type { AppDeps } from '../../context.js';

export const MEMBER_ACCESS_TYP = 'access';
export const SIGNUP_CONTINUATION_TYP = 'signup_continuation';
export const PARIWAR_SELECT_TYP = 'pariwar_select';

/** Access-token claims (the member session bearer). */
export interface MemberAccessClaims {
  readonly typ: typeof MEMBER_ACCESS_TYP;
  /** member_id. */
  readonly sub: string;
  readonly pariwar_id: string;
  readonly device_id: string;
}

/** Signup-continuation claims (the verified-mobile seam Story 3.6 consumes, R5). */
export interface SignupContinuationClaims {
  readonly typ: typeof SIGNUP_CONTINUATION_TYP;
  /** The verified mobile's blind index (Story 3.6 looks up + creates the member). */
  readonly sub: string;
  readonly intent: 'signup';
  /** Single-use anchor — matched against member_signup_continuations. */
  readonly jti: string;
}

/**
 * Multi-Pariwar scope-selection claims (R2). When one mobile resolves to members in
 * several Pariwars, /otp/verify issues this short-lived token; the client posts it
 * with the chosen pariwarId to /otp/select-pariwar to get the full session. Carries
 * the device binding so the chosen-scope session binds the same device.
 */
export interface PariwarSelectClaims {
  readonly typ: typeof PARIWAR_SELECT_TYP;
  /** The verified mobile's blind index (re-resolve memberships on select). */
  readonly sub: string;
  readonly device_id: string;
  readonly device_label?: string;
  /** Masked mobile (last-4 visible) for audit context on /otp/select-pariwar (P13). */
  readonly masked_mobile?: string;
  /** Single-use anchor — matched against member_pariwar_selects (PR-Patch-10). */
  readonly jti: string;
}

export type MemberJwtClaims = MemberAccessClaims | SignupContinuationClaims | PariwarSelectClaims;

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: MemberJwtClaims;
    user: MemberJwtClaims & { iat: number; exp: number };
  }
}

export async function registerMemberJwt(app: FastifyInstance, deps: AppDeps): Promise<void> {
  await app.register(fastifyJwt, {
    secret: {
      private: deps.memberJwt.privateKeyPem,
      public: deps.memberJwt.publicKeyPem,
    },
    // Pin the signing algorithm (asymmetric only).
    sign: { algorithm: deps.memberJwt.algorithm },
    // Pin the accepted verification algorithms — rejects `none` + symmetric (HS256).
    verify: { algorithms: [deps.memberJwt.algorithm] },
  });
}
