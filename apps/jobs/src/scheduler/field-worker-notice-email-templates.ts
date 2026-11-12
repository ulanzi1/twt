// The EMAIL of a field worker move notice — its seven templates, one per notice kind (Story 13.1g, Task 3.2; AC6; decision
// `2026-11-12-463` AD4; ADR-0045; Invariants I1, I5).
//
// `-262` FQ3 A's shape (Trustee-ratified): the fact and a link to the console — ⛔ names, ⛔ notes; those stay in the console (the Move
// requests page, `/p/$pariwarId/field-workers/requests`, Story 13.1d). ⭐ The ONLY variable is the page link: the param type admits `link`
// and nothing else (a type-level test pins it), so a name, a mobile, a code, a district, a refusal reason, a cause, a date, a count or a
// worker / request id can ⛔ never reach the email by construction — the notice's kind only SELECTS the template. Every text stays TRUE
// after the request moves on (the Q-2 rule emails moved-on notices too). "Tell the worker." on `accepted` and `refused` only (`-459` Q3
// A; `-461` item 2) — ⛔ on `refused_admin`.
// One plain-text email, Hindi FIRST then English (`email-channel.md`'s bilingual convention): subject `"<hi> / <en>"`; body the Hindi
// body and the Hindi footer, a blank line, the English body and the English footer. Rendered through the REAL `t()` (`t()` THROWS on a
// missing `{token}`), ⛔ a transcribed string ([[feedback_stub_must_call_not_transcribe]]).
// ⚠ Agent-drafted Hindi, ⛔ NOT YET HUMAN-REVIEWED — roster Row 51 (f); the English was approved by BigDev (Q-1 A).
// ⚠ Recorded departures from `email-channel.md` (`drafted`), as 6.25's: a subject over 60 characters (`:27`); the link carries the Pariwar
// UUID (an id, ⛔ a name) against `:50`; plain text only against `:28`.

import { fieldWorker } from '@twt/domain';
import { t } from '@twt/i18n';

/** ⭐ I1 — the ONLY parameter. Adding a field here is a disclosure question for the Panel (`-463` AD4), ⛔ a code change. */
export interface FieldWorkerNoticeEmailParams {
  readonly link: string;
}

export interface RenderedFieldWorkerNoticeEmail {
  readonly subject: string;
  readonly text: string;
}

const NAMESPACE = 'field_worker';
export const FIELD_WORKER_NOTICE_EMAIL_FOOTER_KEY = 'notice_email.footer';
export const fieldWorkerNoticeEmailSubjectKey = (kind: fieldWorker.FieldWorkerNoticeKind): string => `notice_email.${kind}.subject`;
export const fieldWorkerNoticeEmailBodyKey = (kind: fieldWorker.FieldWorkerNoticeKind): string => `notice_email.${kind}.body`;

/** The page the email points to — `${origin}/p/<pariwarId, lower-case>/field-workers/requests` (13.1d's admin route, `router.tsx`). */
export function fieldWorkerNoticeEmailLink(adminAppOrigin: string, pariwarId: string): string {
  return `${adminAppOrigin}/p/${pariwarId.toLowerCase()}/field-workers/requests`;
}

/**
 * Render one kind's email through the REAL `t()`. A kind outside the CLOSED list, or a missing `{link}`, THROWS (a crash — the caller's
 * `render_failed` transient).
 */
export function renderFieldWorkerNoticeEmail(kind: fieldWorker.FieldWorkerNoticeKind, params: FieldWorkerNoticeEmailParams): RenderedFieldWorkerNoticeEmail {
  if (!(fieldWorker.FIELD_WORKER_NOTICE_KINDS as readonly string[]).includes(kind)) {
    throw new Error('[field-worker-notice-email] a notice kind outside FIELD_WORKER_NOTICE_KINDS');
  }
  // ⭐ ONLY `link` is forwarded — even a caller that widens the object at runtime cannot add a token.
  const vars = { link: params.link };
  const say = (key: string, locale: 'hi' | 'en', v: Record<string, string> = {}): string => t(key, v, { locale, namespace: NAMESPACE });
  const subject = `${say(fieldWorkerNoticeEmailSubjectKey(kind), 'hi')} / ${say(fieldWorkerNoticeEmailSubjectKey(kind), 'en')}`;
  const text =
    `${say(fieldWorkerNoticeEmailBodyKey(kind), 'hi', vars)}\n${say(FIELD_WORKER_NOTICE_EMAIL_FOOTER_KEY, 'hi')}\n\n` +
    `${say(fieldWorkerNoticeEmailBodyKey(kind), 'en', vars)}\n${say(FIELD_WORKER_NOTICE_EMAIL_FOOTER_KEY, 'en')}\n`;
  return { subject, text };
}
