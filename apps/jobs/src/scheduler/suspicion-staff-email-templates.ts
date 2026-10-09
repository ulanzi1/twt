// The STAFF EMAIL of a `-239` suspicion refusal — its ONE template (Story 6.25, Task 4.3; AC3; `2026-10-09-299` RE9; Invariant 1).
//
// `-262` FQ3 A (Trustee-ratified): *"a claim was refused on suspicion of a nominee change — open the list"* — ⛔ no names and ⛔ no
// note; those stay in the console (`/p/$pariwarId/nominee-refusals`, which PRESENTS the District Admin's note and reason — `-239`
// (a)). ⭐ The ONLY variable is the list link: the param type admits `link` and nothing else (a type-level test pins it), so a
// name, a note, a claim id, a count, a date or a district can ⛔ never reach the email by construction.
// One plain-text email, Hindi FIRST then English (`email-channel.md`'s bilingual convention): subject `"<hi> / <en>"`; body the
// Hindi paragraph, a blank line, the English paragraph. Rendered through the REAL `t()` (`t()` THROWS on a missing `{token}`),
// ⛔ a transcribed string ([[feedback_stub_must_call_not_transcribe]]).
// ⚠ Agent-drafted, ⛔ NOT YET HUMAN-REVIEWED — the Hindi is roster Row 25's; the English stands as drafted (`-299` Status).
// ⚠ Recorded departures from `email-channel.md` (`drafted`): the subject exceeds `:27`'s ≤ 60 chars; the link carries the Pariwar
// UUID (an id, ⛔ a name) against `:50`; plain text only against `:28` (RE6).

import { t } from '@twt/i18n';

/** ⭐ Invariant 1 — the ONLY parameter. Adding a field here is a disclosure question for the Panel (RE9), ⛔ a code change. */
export interface SuspicionStaffEmailParams {
  readonly link: string;
}

export interface RenderedStaffEmail {
  readonly subject: string;
  readonly text: string;
}

export const SUSPICION_STAFF_EMAIL_SUBJECT_KEY = 'suspicion_staff_email.subject';
export const SUSPICION_STAFF_EMAIL_BODY_KEY = 'suspicion_staff_email.body';

/** The list the email points to — `${origin}/p/<pariwarId>/nominee-refusals` (the admin route, `router.tsx`). */
export function suspicionStaffEmailLink(adminAppOrigin: string, pariwarId: string): string {
  return `${adminAppOrigin}/p/${pariwarId}/nominee-refusals`;
}

/** Render the email through the REAL `t()`. A missing `{link}` THROWS (a crash — the caller's `render_failed` transient). */
export function renderSuspicionStaffEmail(params: SuspicionStaffEmailParams): RenderedStaffEmail {
  // ⭐ ONLY `link` is forwarded — even a caller that widens the object at runtime cannot add a token.
  const vars = { link: params.link };
  const subject = `${t(SUSPICION_STAFF_EMAIL_SUBJECT_KEY, {}, { locale: 'hi', namespace: 'claim' })} / ${t(SUSPICION_STAFF_EMAIL_SUBJECT_KEY, {}, { locale: 'en', namespace: 'claim' })}`;
  const text = `${t(SUSPICION_STAFF_EMAIL_BODY_KEY, vars, { locale: 'hi', namespace: 'claim' })}\n\n${t(SUSPICION_STAFF_EMAIL_BODY_KEY, vars, { locale: 'en', namespace: 'claim' })}\n`;
  return { subject, text };
}
