// Story 3.13a — the member's own notice when staff could ⛔ confirm their typed-in identity (Task 2; DL5, N3).
//
//   · GET /api/v1/member/identity-check-notice — member session (bearer JWT); the member is the SESSION's, ⛔ a parameter.
//
// `2026-11-25-502` item 4 (Q2 C, Trustee-ratified): the app tells the member, in their language, that their identity could
// not be checked yet and how to arrange it — AND the reason staff recorded (the closed list, ⛔ the private note).
// ⭐ N3 — the wire carries the closed reason code ONLY: ⛔ the note, ⛔ who checked, ⛔ the date, ⛔ which ID was seen, ⛔ the
// attempt count, ⛔ an id. `notice: null` ⇒ the app shows nothing. Every object `.strict()` (the members/ discipline).
// ⚠ A NEW endpoint, ⛔ a field on `lock-in-status`: a new key on an existing `.strict()` member response breaks every
// installed app that parses it. ⚠ A NEW reason code (row 3-16) would make an installed app's parse THROW and the card
// hide — `deferred-work.md` `3.13a-G3`.
// ⛔ OpenAPI entry (`-509`, DL5): ⛔ member-home read is registered in `emit-openapi.ts`; `openapi/v1.yaml` stays as it is.

import { z } from 'zod';

import { IdentityCheckNotConfirmedReason } from './identity-check.js';

export const MemberIdentityCheckNotice = z.object({ reason: IdentityCheckNotConfirmedReason }).strict();
export type MemberIdentityCheckNotice = z.output<typeof MemberIdentityCheckNotice>;

export const MemberIdentityCheckNoticeResponse = z.object({ notice: MemberIdentityCheckNotice.nullable() }).strict();
export type MemberIdentityCheckNoticeResponse = z.output<typeof MemberIdentityCheckNoticeResponse>;
