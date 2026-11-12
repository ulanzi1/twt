// Story 13.1g (Task 3.2; AC6, AC7's jobs leg; decision `2026-11-12-463` AD4; I1, I5) — the seven move-notice email templates, rendered
// through the REAL `t()` (⛔ a transcribed string — TR6: the English is compared to AD4's table, the Hindi structurally). Modelled on
// `staff-email-client.test.ts`'s 6.25 template legs.

import { readFileSync } from 'node:fs';

import { fieldWorker } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import {
  FIELD_WORKER_NOTICE_EMAIL_FOOTER_KEY,
  fieldWorkerNoticeEmailLink,
  renderFieldWorkerNoticeEmail,
  type FieldWorkerNoticeEmailParams,
} from '../src/scheduler/field-worker-notice-email-templates.js';

/** The two catalogs AS FILES — the keys and the Hindi are read, the English is rendered through `t()`. */
const catalog = (locale: 'en' | 'hi'): Record<string, string> =>
  JSON.parse(readFileSync(new URL(`../../../packages/i18n/locales/${locale}/field_worker.json`, import.meta.url), 'utf-8')) as Record<string, string>;
const enCatalog = catalog('en');
const hiCatalog = catalog('hi');

const PARIWAR = '2b7c0a4e-5d1f-4e8a-9c3b-1f2e3d4c5b6a';
const LINK = fieldWorkerNoticeEmailLink('https://admin.twt.example', PARIWAR);

/** AD4's English, as BigDev approved it (Q-1 A, 2026-11-12). */
const ENGLISH: Record<fieldWorker.FieldWorkerNoticeKind, readonly [subject: string, body: string]> = {
  move_request_opened: ['A field worker move request was opened for you', 'A field worker move request was opened for you. Open Move requests: {link}'],
  move_request_accepted: ['Your field worker move request was accepted', 'Your move request was accepted. Tell the worker. Open Move requests: {link}'],
  move_request_refused: ['Your field worker move request was refused', 'Your move request was refused. Tell the worker. The reason is in Move requests: {link}'],
  move_request_refused_admin: ['A field worker move request was refused', 'A move request in your Pariwar was refused. Open Move requests: {link}'],
  move_request_escalated: ['A field worker move request went to the Pariwar Admin', 'A field worker move request went to the Pariwar Admin. Open Move requests: {link}'],
  move_request_superseded: ['A field worker move request is no longer needed', 'A move request is no longer needed. Open Move requests: {link}'],
  moved_by_pariwar_admin: ['A Pariwar Admin moved a field worker', 'A Pariwar Admin moved a field worker into or out of your district. Open Move requests: {link}'],
};
const FOOTER_EN = 'This email names no one. The details are in the admin console.';
const TELL = 'Tell the worker.';

describe('AC6 — the seven texts (I1, I5)', () => {
  it('⭐ sync: the template keys are EXACTLY the notice kinds × {subject, body} + the footer — no more, no fewer — in en AND hi', () => {
    const expected = [...fieldWorker.FIELD_WORKER_NOTICE_KINDS.flatMap((k) => [`notice_email.${k}.subject`, `notice_email.${k}.body`]), FIELD_WORKER_NOTICE_EMAIL_FOOTER_KEY].sort();
    for (const catalog of [enCatalog, hiCatalog]) {
      expect(Object.keys(catalog).filter((k) => k.startsWith('notice_email.')).sort()).toEqual(expected);
      expect(Object.keys(catalog)).toContain('$comment.notice_email');
    }
    expect(Object.keys(ENGLISH).sort()).toEqual([...fieldWorker.FIELD_WORKER_NOTICE_KINDS].sort());
    // The comment marks the Hindi un-reviewed (Row 51 (f)), the same text in both files.
    expect(enCatalog['$comment.notice_email']).toBe(hiCatalog['$comment.notice_email']);
    expect(enCatalog['$comment.notice_email']).toMatch(/NOT YET HUMAN-REVIEWED - go-live gate Row 51 \(f\)/);
  });

  it.each([...fieldWorker.FIELD_WORKER_NOTICE_KINDS])('⭐ %s — `<hi> / <en>`; Hindi body + footer, a blank line, English body + footer; the link twice; ⛔ unresolved token', (kind) => {
    const { subject, text } = renderFieldWorkerNoticeEmail(kind, { link: LINK });
    const [enSubject, enBody] = ENGLISH[kind];
    const hiSubject = hiCatalog[`notice_email.${kind}.subject`]!;
    const hiBody = hiCatalog[`notice_email.${kind}.body`]!.replace('{link}', LINK);
    const hiFooter = hiCatalog[FIELD_WORKER_NOTICE_EMAIL_FOOTER_KEY]!;
    expect(subject).toBe(`${hiSubject} / ${enSubject}`);
    // AD4's layout, exactly.
    expect(text).toBe(`${hiBody}\n${hiFooter}\n\n${enBody.replace('{link}', LINK)}\n${FOOTER_EN}\n`);
    // Hindi FIRST: the first line is Devanagari, the English after the blank line.
    const [hiPart, enPart] = text.split('\n\n');
    expect(hiPart).toMatch(/[ऀ-ॿ]/);
    expect(enPart).not.toMatch(/[ऀ-ॿ]/);
    expect(text.split(LINK)).toHaveLength(3);
    expect(text.split(FOOTER_EN)).toHaveLength(2);
    expect(text.split(hiFooter)).toHaveLength(2);
    expect(`${subject}${text}`).not.toMatch(/\{\w+\}/);
  });

  it('"Tell the worker." in `accepted` and `refused` ONLY — ⛔ on `refused_admin` (`-459` Q3 A; `-461` item 2)', () => {
    for (const kind of fieldWorker.FIELD_WORKER_NOTICE_KINDS) {
      const { text } = renderFieldWorkerNoticeEmail(kind, { link: LINK });
      expect(text.includes(TELL), kind).toBe(kind === 'move_request_accepted' || kind === 'move_request_refused');
    }
  });

  it('⭐ I1 / I5 — a smuggled name, mobile, code, district, reason, cause, date, worker id and request id NEVER appear; ⛔ digit outside the link', () => {
    const smuggled = {
      link: LINK,
      worker: 'Ramesh Kumar',
      officer: 'Anita Devi',
      mobile: '9876543210',
      code: '482913',
      from: 'Patna',
      to: 'Gaya',
      reason: 'no_capacity',
      cause: 'worker_ended',
      date: '2026-11-12',
      fieldWorkerId: '9d8c7b6a-1111-4222-8333-444455556666',
      moveRequestId: '1a2b3c4d-5555-4666-8777-888899990000',
    };
    for (const kind of fieldWorker.FIELD_WORKER_NOTICE_KINDS) {
      // At RUNTIME a widened object is ignored — only `link` is forwarded.
      const { subject, text } = renderFieldWorkerNoticeEmail(kind, smuggled as unknown as FieldWorkerNoticeEmailParams);
      const rest = `${subject}\n${text.split(LINK).join('')}`; // the link's own UUID holds digits — judge the text WITHOUT it
      for (const v of Object.values(smuggled).filter((x) => x !== LINK)) expect(rest.includes(v), `${kind}: ${v}`).toBe(false);
      expect(rest, kind).not.toMatch(/\d/);
      expect(rest, kind).not.toMatch(/[०-९]/); // ⛔ Devanagari digit either
    }
  });

  it('a kind outside the closed list THROWS (the child\'s `render_failed`), and so does a missing link', () => {
    expect(() => renderFieldWorkerNoticeEmail('move_request_withdrawn' as fieldWorker.FieldWorkerNoticeKind, { link: LINK })).toThrow(/outside FIELD_WORKER_NOTICE_KINDS/);
    expect(() => renderFieldWorkerNoticeEmail('move_request_opened', {} as FieldWorkerNoticeEmailParams)).toThrow(/missing interpolation param 'link'/);
  });

  it('⭐ TYPE-LEVEL — the param type admits `link` ONLY', () => {
    // @ts-expect-error — a second field is a disclosure question for the Panel (`-463` AD4), ⛔ a code change.
    const widened: FieldWorkerNoticeEmailParams = { link: LINK, district: 'Patna' };
    // @ts-expect-error — and `link` is required.
    const empty: FieldWorkerNoticeEmailParams = {};
    expect([widened, empty]).toHaveLength(2);
  });
});

describe('AC7 (jobs leg) — the link is the admin app\'s REAL route AND what its sign-in allowlist follows (three copies, ONE path)', () => {
  const adminSrc = (rel: string) => readFileSync(new URL(`../../admin/src/${rel}`, import.meta.url), 'utf-8');

  it('the link: lower-case Pariwar id, the Move requests path', () => {
    expect(LINK).toBe(`https://admin.twt.example/p/${PARIWAR}/field-workers/requests`);
    expect(fieldWorkerNoticeEmailLink('https://admin.twt.example', PARIWAR.toUpperCase())).toBe(LINK);
  });

  it('(1) exactly ONE admin route ends in `field-workers/requests`, and the link is it with the Pariwar id filled in', () => {
    const routes = [...adminSrc('router.tsx').matchAll(/path:\s*'([^']*field-workers\/requests)'/g)].map((m) => m[1]!);
    expect(routes).toEqual(['/p/$pariwarId/field-workers/requests']);
    expect(new URL(LINK).pathname).toBe(routes[0]!.replace('$pariwarId', PARIWAR));
  });

  it('(2) the sign-in return: the page\'s own `next` and the allowlist regex name the SAME path', () => {
    const loginNext = adminSrc('routes/login-next.ts');
    expect(loginNext).toContain('return `/p/${pariwarId.toLowerCase()}/field-workers/requests`;');
    const allow = /const FIELD_WORKER_REQUESTS_PATH = \/(.+)\/;/.exec(loginNext)?.[1];
    expect(allow).toBeDefined();
    expect(new RegExp(allow!).exec(new URL(LINK).pathname)?.[1]).toBe(PARIWAR);
  });
});
