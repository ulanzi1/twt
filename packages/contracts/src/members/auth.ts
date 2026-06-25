// packages/contracts/src/members/auth.ts
//
// Member mobile + OTP authentication transport contracts (Story 3.2, AC-1/AC-2).
// The member-identity SURFACE every later Epic-3 signup step + returning-member
// surface sits behind. Mirrors the admin auth/{login,step-up}.ts shapes; ALL objects
// `.strict()` (the members/ directory discipline). The mobile client + Story 3.6 are
// COUPLED on `MemberOtpVerifyResponse` — keep its discriminated-union shape stable.

import { z } from 'zod';

import { Iso8601Datetime, MobileNumber, UuidString } from '../_common/primitives.js';

// ── Login: request OTP ─────────────────────────────────────────────────────────

export const MemberOtpRequestRequest = z.object({ mobile: MobileNumber }).strict();
export type MemberOtpRequestRequest = z.output<typeof MemberOtpRequestRequest>;

export const MemberOtpRequestResponse = z
  .object({
    // Always `true` whether or not the mobile maps to a member (enumeration defense).
    sent: z.literal(true),
    expiresInSeconds: z.number().int().positive(),
  })
  .strict();
export type MemberOtpRequestResponse = z.output<typeof MemberOtpRequestResponse>;

// ── Login: verify OTP → session (discriminated on sessionType) ───────────────────

/** The device the server signed out when binding a 3rd device at cap (R6). */
export const DroppedDevice = z
  .object({
    deviceId: z.string().min(1),
    deviceLabel: z.string().min(1).optional(),
    boundAt: Iso8601Datetime,
  })
  .strict();
export type DroppedDevice = z.output<typeof DroppedDevice>;

/** Returning member — a full session (access + 90d refresh, bound to the device). */
export const MemberFullSession = z
  .object({
    sessionType: z.literal('full_session'),
    accessToken: z.string().min(1),
    accessTokenExpiresAt: Iso8601Datetime,
    refreshToken: z.string().min(1),
    deviceId: z.string().min(1),
    memberId: UuidString,
    pariwarId: UuidString,
    // Present only when a 3rd device was bound and the oldest was dropped (R6).
    droppedDevice: DroppedDevice.optional(),
  })
  .strict();
export type MemberFullSession = z.output<typeof MemberFullSession>;

/** Multi-Pariwar (R2) — the client picks a scope before a full session is issued. */
export const MemberPariwarSelect = z
  .object({
    sessionType: z.literal('pariwar_select'),
    memberships: z.array(
      z.object({ memberId: UuidString, pariwarId: UuidString, pariwarName: z.string() }).strict(),
    ),
    // Short-lived opaque (signed) token; POST to /otp/select-pariwar with the chosen pariwarId.
    selectToken: z.string().min(1),
  })
  .strict();
export type MemberPariwarSelect = z.output<typeof MemberPariwarSelect>;

/** First-signup — no member row yet (R5); the verified-mobile seam Story 3.6 consumes. */
export const MemberSignupContinuation = z
  .object({
    sessionType: z.literal('signup_continuation'),
    signupContinuationToken: z.string().min(1),
    expiresAt: Iso8601Datetime,
  })
  .strict();
export type MemberSignupContinuation = z.output<typeof MemberSignupContinuation>;

export const MemberOtpVerifyRequest = z
  .object({
    mobile: MobileNumber,
    // OTP field width follows the admin step-up precedent.
    otp: z.string().min(6).max(8),
    deviceId: z.string().min(1).max(256),
    deviceLabel: z.string().min(1).max(128).optional(),
  })
  .strict();
export type MemberOtpVerifyRequest = z.output<typeof MemberOtpVerifyRequest>;

export const MemberOtpVerifyResponse = z.discriminatedUnion('sessionType', [
  MemberFullSession,
  MemberPariwarSelect,
  MemberSignupContinuation,
]);
export type MemberOtpVerifyResponse = z.output<typeof MemberOtpVerifyResponse>;

// ── Multi-Pariwar scope selection (R2) ───────────────────────────────────────────

export const MemberSelectPariwarRequest = z
  .object({ selectToken: z.string().min(1), pariwarId: UuidString })
  .strict();
export type MemberSelectPariwarRequest = z.output<typeof MemberSelectPariwarRequest>;

// Selecting a Pariwar issues the same full-session shape.
export const MemberSelectPariwarResponse = MemberFullSession;
export type MemberSelectPariwarResponse = z.output<typeof MemberSelectPariwarResponse>;

// ── Token refresh (rotation-on-use) ──────────────────────────────────────────────

export const MemberTokenRefreshRequest = z.object({ refreshToken: z.string().min(1) }).strict();
export type MemberTokenRefreshRequest = z.output<typeof MemberTokenRefreshRequest>;

// Refresh reissues a full session (a fresh access token + a rotated refresh token).
export const MemberTokenRefreshResponse = MemberFullSession;
export type MemberTokenRefreshResponse = z.output<typeof MemberTokenRefreshResponse>;

// ── Member step-up OTP (AC-2) ────────────────────────────────────────────────────

export const MemberStepUpRequestRequest = z
  .object({ actionContext: z.string().min(1).max(128) })
  .strict();
export type MemberStepUpRequestRequest = z.output<typeof MemberStepUpRequestRequest>;

export const MemberStepUpRequestResponse = z
  .object({ sent: z.literal(true), expiresInSeconds: z.number().int().positive() })
  .strict();
export type MemberStepUpRequestResponse = z.output<typeof MemberStepUpRequestResponse>;

export const MemberStepUpVerifyRequest = z.object({ otp: z.string().min(6).max(8) }).strict();
export type MemberStepUpVerifyRequest = z.output<typeof MemberStepUpVerifyRequest>;

export const MemberStepUpVerifyResponse = z
  .object({ elevated: z.literal(true), elevatedUntil: Iso8601Datetime })
  .strict();
export type MemberStepUpVerifyResponse = z.output<typeof MemberStepUpVerifyResponse>;
