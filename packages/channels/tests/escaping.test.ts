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
// Story 5.2 (D1): escaping is PER-CHANNEL. The markup channels (WhatsApp/SMS/Telegram) escape; `push` is
// plaintext (a notification tray renders no markup), so it is carved into its OWN assertion below.
const MARKUP_CHANNELS: readonly Channel[] = ['whatsapp', 'sms', 'telegram'];

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
  it('renders injection payloads as inert text on WhatsApp/SMS/Telegram', () => {
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
