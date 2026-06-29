// packages/contracts/src/members/index.ts
//
// Member-lifecycle transport contracts barrel. Story 3.2 lands the FIRST member
// contracts here (mobile + OTP auth); later Epic-3 stories (3.3 KYC, 3.4 nominees,
// …) add siblings. Consume via the `@twt/contracts` top barrel.

export * from './auth.js';
// Story 3.6a — first-signup member-creation request (response reuses MemberFullSession from auth).
export * from './signup.js';
// Story 3.7 — lock-in home-widget read DTO (GET /member/lock-in-status; reuses MemberLifecycleStateWire).
export * from './lock-in.js';
