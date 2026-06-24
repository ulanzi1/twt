// Unit tests for the T&C markdown→sanitized-HTML helper — Story 2.6 (Task 2; AC3).
//
// `body_html_rendered` is served UNAUTHENTICATED + edge-cached, so a stored XSS
// would hit every visitor. These tests PIN the sanitizer behaviour so a future
// schema override cannot silently reintroduce a vector. Explicit cases mandated by
// the story: <script>, event-handler attrs, javascript:/data: URL schemes (both as
// markdown-link syntax and as raw HTML), plus benign-markdown survival.

import { describe, expect, it } from 'vitest';

import { renderTcMarkdown } from '../../src/terms-and-conditions/render-markdown.js';

describe('renderTcMarkdown — XSS vectors are stripped', () => {
  it('removes a raw <script> tag', () => {
    const html = renderTcMarkdown('Hello\n\n<script>alert(1)</script>\n\nWorld');
    expect(html).not.toMatch(/<script/i);
    // The benign surrounding prose still renders.
    expect(html).toContain('Hello');
    expect(html).toContain('World');
  });

  it('strips an inline event-handler attribute (onerror) on raw HTML', () => {
    const html = renderTcMarkdown('<img src=x onerror=alert(1)>');
    expect(html).not.toMatch(/onerror/i);
    // Raw HTML is dropped entirely (no allowDangerousHtml) — no <img survives.
    expect(html).not.toMatch(/<img/i);
  });

  it('neutralizes a javascript: href in markdown link syntax', () => {
    const html = renderTcMarkdown('[click me](javascript:alert(1))');
    expect(html).not.toMatch(/javascript:/i);
    // The link TEXT survives; only the dangerous href is dropped.
    expect(html).toContain('click me');
  });

  it('neutralizes a data: href in markdown link syntax', () => {
    const html = renderTcMarkdown('[x](data:text/html,<script>alert(1)</script>)');
    expect(html).not.toMatch(/data:text\/html/i);
    expect(html).not.toMatch(/<script/i);
  });

  it('drops a raw <a href="javascript:…"> anchor', () => {
    const html = renderTcMarkdown('<a href="javascript:alert(1)">x</a>');
    expect(html).not.toMatch(/javascript:/i);
  });

  it('drops a raw <img src="javascript:…"> image', () => {
    const html = renderTcMarkdown('<img src="javascript:alert(1)">');
    expect(html).not.toMatch(/javascript:/i);
    expect(html).not.toMatch(/<img/i);
  });
});

describe('renderTcMarkdown — benign markdown survives', () => {
  it('renders headings, lists, emphasis, and code', () => {
    const html = renderTcMarkdown(
      ['# Title', '', '- one', '- two', '', '*emphasis* and `code`'].join('\n'),
    );
    expect(html).toMatch(/<h1[^>]*>Title<\/h1>/);
    expect(html).toMatch(/<ul>/);
    expect(html).toMatch(/<li>one<\/li>/);
    expect(html).toMatch(/<em>emphasis<\/em>/);
    expect(html).toMatch(/<code>code<\/code>/);
  });

  it('keeps http(s) links intact', () => {
    const html = renderTcMarkdown('[TWT](https://twt.org/terms)');
    expect(html).toMatch(/<a[^>]+href="https:\/\/twt\.org\/terms"[^>]*>TWT<\/a>/);
  });

  it('is deterministic (same input → same output)', () => {
    const md = '## Section\n\nSome **bold** text.';
    expect(renderTcMarkdown(md)).toBe(renderTcMarkdown(md));
  });
});
