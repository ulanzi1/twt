// Channel-renderer escaping-discipline tests — Story 5.1 (Task 7; AC6).
//
// A fixture with markdown / template syntax / HTML-injection payloads in admin-authored fields must render
// as INERT TEXT on EVERY channel: angle brackets HTML-encoded, template markers (`{{ }}`, `${ }`) and
// markdown control chars (`* _ [ ] ( ) ~ # \` { } $`) backslash-escaped so no channel interprets them.

import { describe, expect, it } from 'vitest';

import { escapeText } from '../src/render.js';
import { render } from '../src/render.js';
import type { Channel } from '../src/provider.js';
import { announcement } from './fixtures.js';

const INJECTION = '<script>alert(1)</script> **bold** _it_ [l](u) {{tpl}} ${expr} `code`';
// Story 5.2 (D1) + Story 5.3 (AC5): escaping is PER-CHANNEL. The markup channels (SMS/Telegram) HTML-entity
// + markdown escape; `push` is plaintext (its own assertion below); `whatsapp` is a UTILITY-template
// parameter — NOT markup-interpreted, so it is whitespace-normalized + inert-by-non-interpretation (its own
// assertion below), NOT HTML-escaped (that would garble the member's message — the D1 re-trigger).
const MARKUP_CHANNELS: readonly Channel[] = ['sms', 'telegram'];

describe('escapeText (AC6)', () => {
  it('HTML-encodes angle brackets + ampersand', () => {
    const out = escapeText('<b>&</b>');
    expect(out).not.toContain('<');
    expect(out).not.toContain('>');
    expect(out).toContain('&lt;b&gt;');
    expect(out).toContain('&amp;');
  });

  it('neutralizes template markers and markdown control chars', () => {
    const out = escapeText(INJECTION);
    expect(out).not.toContain('{{');
    expect(out).not.toContain('${');
    expect(out).not.toContain('<script>');
    expect(out).toContain('\\*\\*'); // ** escaped
    expect(out).toContain('&lt;script&gt;'); // angle brackets encoded
  });
});

describe('renderer escaping — markup channels (AC6)', () => {
  it('renders injection payloads as inert text on SMS/Telegram', () => {
    const alert = announcement({ title: INJECTION, body: INJECTION });
    for (const channel of MARKUP_CHANNELS) {
      const rendered = render(alert, channel);
      const combined = `${rendered.title ?? ''}\n${rendered.body}`;
      expect(combined, `${channel} must not carry raw <script>`).not.toContain('<script>');
      expect(combined, `${channel} must not carry raw </script>`).not.toContain('</script>');
      expect(combined, `${channel} must not carry active {{ template`).not.toContain('{{');
      expect(combined, `${channel} must not carry active \${ template`).not.toContain('${');
      expect(combined, `${channel} must escape markdown emphasis`).toContain('\\*\\*');
      expect(rendered.deepLink, `${channel} has no deep-link`).toBeNull();
    }
  });
});

describe('renderer escaping — WhatsApp is WHITESPACE-NORMALIZED, not HTML-escaped (Story 5.3 AC5)', () => {
  it('produces a Meta-valid, injection-inert template param (no newlines/tabs/4+ spaces; not HTML-escaped)', () => {
    // Multi-line + wide-whitespace admin prose PLUS injection payloads — the WA body must collapse all
    // whitespace (Meta rejects newlines/tabs/4+ spaces in a template param) yet keep the injection inert.
    const alert = announcement({
      title: `line one\n\nline two\ttabbed     wide`,
      body: INJECTION,
    });
    const rendered = render(alert, 'whatsapp');
    expect(rendered.title, 'whatsapp is body-only (no push title)').toBeNull();
    const body = rendered.body;

    // Meta-validity: no newlines, no tabs, no run of 4+ consecutive spaces anywhere in the param.
    expect(body, 'no newlines').not.toMatch(/\n/);
    expect(body, 'no tabs').not.toMatch(/\t/);
    expect(body, 'no 4+ consecutive spaces').not.toMatch(/ {4,}/);
    expect(body, 'no leading/trailing whitespace').toBe(body.trim());

    // Injection-inert BY NON-INTERPRETATION: the raw text is carried literally (a template param is never
    // markup-interpreted), so it is NOT HTML-entity-encoded (that would garble the member's message — D1).
    expect(body, 'whatsapp must preserve raw text (not HTML-encode)').toContain('<script>alert(1)</script>');
    expect(body, 'whatsapp must NOT HTML-encode angle brackets').not.toContain('&lt;');
    expect(body, 'whatsapp must NOT backslash-escape markdown').not.toContain('\\*\\*');
    expect(rendered.deepLink, 'whatsapp has no deep-link').toBeNull();
  });
});

describe('renderer escaping — push is PLAINTEXT, not HTML-escaped (Story 5.2 D1)', () => {
  it('carries the payload as inert plaintext (no HTML-entity / markdown escaping) on push', () => {
    const alert = announcement({ title: INJECTION, body: INJECTION });
    const rendered = render(alert, 'push');
    const combined = `${rendered.title ?? ''}\n${rendered.body}`;
    // Push is inert BY BEING PLAINTEXT — a notification tray executes no markup — so the raw characters are
    // preserved (NOT HTML-encoded, NOT backslash-escaped). This is the D1 restructure's whole point: admin
    // prose must not reach the tray garbled with `&amp;` / `\#` / `\(`.
    expect(combined, 'push must preserve raw text (not HTML-encode)').toContain('<script>alert(1)</script>');
    expect(combined, 'push must NOT HTML-encode angle brackets').not.toContain('&lt;');
    expect(combined, 'push must NOT backslash-escape markdown').not.toContain('\\*\\*');
    expect(combined, 'push must preserve template-looking text verbatim').toContain('{{tpl}}');
  });

  it('populates the deep-link on push (announcement → announcements/:alert_id)', () => {
    const rendered = render(announcement(), 'push');
    expect(rendered.deepLink).toMatch(/^twt:\/\/p\/[0-9a-f-]+\/announcements\/[0-9a-f-]+$/);
  });
});
