// The neighbours' WhatsApp REMINDER body ↔ the ruled words — the LOCKSTEP (Story 6.31, Task 5.1; AC5; WR6, I6, T6, T7). In both
// locales the REAL `t(PEER_MESH_WA_REMINDER_COPY_KEY)` — `peer_mesh_wa.reminder` since Story 6.37e (`2026-10-22-380` decision 8; ⛔ a stub,
// ⛔ a hand copy of the JSON — [[feedback_stub_must_call_not_transcribe]]) with the three Meta variables as its values renders EXACTLY the
// body. ⚠ That key holds the neighbours' SMS words AS THEY STOOD before `2026-10-22-379`; the SMS (`peer_mesh_sms.request`) has moved on,
// so this pins the reminder to ITS OWN key, ⛔ to the SMS. Also: each variable lands once, in order; ⛔ "TWT"; ⛔ two
// variables adjacent; the Hindi starts and ends with words (S1); the language map is exactly `en` / `hi`; and ⛔ marker of the DLT
// SMS registry appears in the template file (the dlt-typed-variables gate scans it — F16).

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { t } from '@twt/i18n';
import { describe, expect, it } from 'vitest';

import {
  PEER_MESH_WA_REMINDER_BODY,
  PEER_MESH_WA_REMINDER_COPY_KEY,
  PEER_MESH_WA_REMINDER_LANGUAGE,
  PEER_MESH_WA_REMINDER_LOCALES,
} from '../src/scheduler/peer-mesh-wa-templates.js';
import { waTemplateConfigKey } from '../src/scheduler/wa-template-config-key.js';

const SOURCE = readFileSync(fileURLToPath(new URL('../src/scheduler/peer-mesh-wa-templates.ts', import.meta.url)), 'utf-8');

describe("the WhatsApp reminder body (WR6 — the words of its own key, the SMS's as they stood before -379)", () => {
  it.each(PEER_MESH_WA_REMINDER_LOCALES)('⭐ %s — the REAL t() with {{1}} / {{2}} / {{3}} renders EXACTLY the body', (locale) => {
    const rendered = t(PEER_MESH_WA_REMINDER_COPY_KEY, { member: '{{1}}', link: '{{2}}', helpline: '{{3}}' }, { namespace: 'claim', locale });
    expect(rendered).toBe(PEER_MESH_WA_REMINDER_BODY[locale]);
  });

  it.each(PEER_MESH_WA_REMINDER_LOCALES)('%s — each variable once, in order; ⛔ two adjacent; ⛔ "TWT"; ⛔ a fourth', (locale) => {
    const body = PEER_MESH_WA_REMINDER_BODY[locale];
    for (const v of ['{{1}}', '{{2}}', '{{3}}']) expect(body.split(v), v).toHaveLength(2);
    expect(body.indexOf('{{1}}')).toBeLessThan(body.indexOf('{{2}}'));
    expect(body.indexOf('{{2}}')).toBeLessThan(body.indexOf('{{3}}'));
    expect(body).not.toMatch(/\}\}\s*\{\{/);
    expect(body).not.toMatch(/\{\{[04-9]\}\}/);
    expect(body).not.toContain('TWT');
    // S1 — ⛔ a variable at the START; the English END is recorded (`{{3}}.`), the Hindi ends with words.
    expect(body.startsWith('{{')).toBe(false);
  });

  it('S1 — the English body ends `{{3}}.` (only Meta answers whether that is "trailing"); the Hindi ends with words', () => {
    expect(PEER_MESH_WA_REMINDER_BODY.en.endsWith('{{3}}.')).toBe(true);
    expect(PEER_MESH_WA_REMINDER_BODY.hi.endsWith('{{3}} पर कॉल करें।')).toBe(true);
  });

  it('WR6 — the language map is EXACTLY en / hi (⛔ en_US, ⛔ en_IN)', () => {
    expect(PEER_MESH_WA_REMINDER_LANGUAGE).toEqual({ en: 'en', hi: 'hi' });
  });

  it('T6 / F16 — the template file carries ⛔ marker of the DLT SMS registry, comments included', () => {
    expect(SOURCE).not.toContain('{#var#}');
    expect(SOURCE).not.toContain('DLT_VAR');
    expect(SOURCE).not.toContain('sms.dlt.template_id.');
  });

  it('WR7 — the key family: wa.template.<purpose>.<locale>.<pariwarId lower-cased>', () => {
    expect(waTemplateConfigKey('peer_mesh.reminder', 'hi', 'AAAA1111-2222-3333-4444-555566667777')).toBe(
      'wa.template.peer_mesh.reminder.hi.aaaa1111-2222-3333-4444-555566667777',
    );
  });
});
