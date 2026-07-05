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
const CHANNELS: readonly Channel[] = ['push', 'whatsapp', 'sms', 'telegram'];

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

describe('renderer escaping across all channels (AC6)', () => {
  it('renders injection payloads as inert text on every channel', () => {
    const alert = announcement({ title: INJECTION, body: INJECTION });
    for (const channel of CHANNELS) {
      const rendered = render(alert, channel);
      const combined = `${rendered.title ?? ''}\n${rendered.body}`;
      expect(combined, `${channel} must not carry raw <script>`).not.toContain('<script>');
      expect(combined, `${channel} must not carry raw </script>`).not.toContain('</script>');
      expect(combined, `${channel} must not carry active {{ template`).not.toContain('{{');
      expect(combined, `${channel} must not carry active \${ template`).not.toContain('${');
      expect(combined, `${channel} must escape markdown emphasis`).toContain('\\*\\*');
    }
  });
});
