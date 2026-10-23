// packages/contracts/src/member-language/language.ts
//
// The member's chosen APP LANGUAGE — Story 6.35 (Task 2.1; LS2, I1; Decision 2026-10-23-387). Backs
// `GET /api/v1/member/language` and `PUT /api/v1/member/language` (member-session-gated).
//
// ⭐ I1 — the PUT records ONLY an explicit change the member made in the app (the screen or the login switch); the app ⛔ sends it on
// first launch, from the device language, or to adopt the Pariwar's default. The server stores it on the member
// (`members.preferred_locale`), and the neighbours' text and its WhatsApp reminder then follow it.
//
// ── Contracts discipline ──────────────────────────────────────────────────────────────
// ⛔ import `@twt/domain` (the browser-bundle rule). camelCase, every object `.strict()`. A local wire-enum, value-aligned with the
// `locale` pg enum (`schema/pariwar_passport.ts`).

import { z } from 'zod';

/** The two app languages ('hi' | 'en'). NON-PII. */
export const MemberLanguageLocale = z.enum(['hi', 'en']);
export type MemberLanguageLocale = z.output<typeof MemberLanguageLocale>;

/** `PUT /api/v1/member/language` — the member's explicit choice. An absolute value: a repeat is the same state (⛔ Idempotency-Key). */
export const MemberLanguageSetRequest = z
  .object({
    locale: MemberLanguageLocale,
  })
  .strict();
export type MemberLanguageSetRequest = z.output<typeof MemberLanguageSetRequest>;

/**
 * The response of BOTH routes. `chosenLocale` is the member's own recorded choice — `null` until their first explicit change.
 * `pariwarDefaultLocale` is the Pariwar's default — informational: the app does ⛔ display it (LS4 (b) — Hindi until the member
 * picks).
 */
export const MemberLanguageResponse = z
  .object({
    chosenLocale: MemberLanguageLocale.nullable(),
    pariwarDefaultLocale: MemberLanguageLocale,
  })
  .strict();
export type MemberLanguageResponse = z.output<typeof MemberLanguageResponse>;
