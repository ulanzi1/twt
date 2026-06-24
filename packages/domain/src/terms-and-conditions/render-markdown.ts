// T&C markdown → sanitized-HTML helper — Story 2.6 (Task 2; AC3).
//
// `renderTcMarkdown` is a PURE, deterministic markdown→HTML transform that runs
// ONCE at write time (consumed by `createTcVersion`) and stores its output in
// `terms_and_conditions_versions.body_html_rendered`. The public `/terms` page
// then emits that stored HTML with Astro `set:html` and needs NO markdown
// dependency of its own (keeps markdown libs out of the apps/public graph and
// makes the page cache-safe).
//
// ── Security is non-negotiable (AC3) ─────────────────────────────────────────
// The stored HTML is served UNAUTHENTICATED and edge-cached, so a stored XSS
// would be served to every visitor. Two layers strip every vector:
//   1. `remark-rehype` runs with its DEFAULT config (no `allowDangerousHtml`), so
//      raw HTML embedded in the markdown — `<script>`, `<img onerror=…>`,
//      `<a href="javascript:…">` — is DROPPED at the mdast→hast boundary and never
//      reaches the output. (No `rehype-raw`: raw HTML passthrough is the thing we
//      are refusing.)
//   2. `rehype-sanitize` applies its default allowlist schema to whatever survives:
//      it strips event-handler attributes and neutralizes `javascript:` / `data:`
//      URL schemes on markdown-syntax links/images (`[x](javascript:…)`), which
//      remark-rehype DOES carry through as proper hast nodes.
//
// The co-located test (tests/terms-and-conditions/render-markdown.test.ts) pins
// every vector + asserts benign markdown (headings, lists, http(s) links,
// emphasis, code) survives, so a future schema override cannot silently regress it.

import rehypeSanitize from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';

// Build the processor ONCE at module load (the plugin chain is stateless; unified
// processors are reusable across calls). All four plugins are synchronous
// transforms, so `processSync` is valid (and keeps the helper a plain `=> string`).
const tcMarkdownProcessor = unified()
  .use(remarkParse)
  // DEFAULT remark-rehype: raw HTML is NOT passed through (no allowDangerousHtml).
  .use(remarkRehype)
  // Allowlist sanitizer (default schema strips event handlers + javascript:/data:).
  .use(rehypeSanitize)
  .use(rehypeStringify)
  .freeze();

/**
 * Render trustee-authored T&C markdown to sanitized, cache-safe HTML.
 * Deterministic and side-effect-free. Strips `<script>`, inline event handlers,
 * and `javascript:`/`data:` URL schemes; no raw-HTML passthrough.
 */
export function renderTcMarkdown(markdown: string): string {
  return String(tcMarkdownProcessor.processSync(markdown));
}
