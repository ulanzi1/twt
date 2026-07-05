// packages/channels/src/render.ts
//
// Per-channel PURE renderers — Story 5.1 (AC4, AC5, AC6). Each `render(alert, channel)` is a pure function
// of the IMMUTABLE alert payload: NO clock reads, NO randomness, NO external I/O (the Epic 4 determinism
// lesson — a renderer that reads `Date.now()` breaks byte-identical replay). Presentation varies per
// channel (push title vs WA body vs concise SMS vs Telegram announcement) but the semantic payload meaning,
// provenance, and classification are never altered — the input is `DeepReadonly<Alert>`, so a renderer
// cannot even express a mutation (AC4 type layer).
//
// ── Escaping discipline (AC6) ─────────────────────────────────────────────────────────────────────────
// EVERY variable substituted from the payload passes through `escapeText`. Admin-authored strings
// (announcement titles/bodies, module titles, amendment summaries) are the injection surface: an admin who
// types markdown / template syntax / HTML must render as INERT TEXT on every channel. Static template
// text (headings the code owns) is safe and not escaped.

import type { Alert } from '@twt/contracts';

import type { DeepReadonly } from './freeze.js';
import type { Channel, RenderedMessage } from './provider.js';

/** An alert as seen by a renderer: deeply immutable (AC4). */
export type RenderableAlert = DeepReadonly<Alert>;

/**
 * Neutralize a payload-derived string into inert text (AC6). Two passes:
 *   1. HTML-encode the `& < >` vectors (`&` first, so we don't double-encode the entities we emit).
 *   2. Backslash-escape markdown/template control chars so `**bold**`, `[x](y)`, `` `code` ``, `{{tpl}}`,
 *      and `${expr}` render as literal characters on channels that would otherwise interpret them.
 * Deterministic (a pure single-pass mapping) but NOT idempotent — `escapeText(escapeText('&'))` yields
 * `&amp;amp;`. A downstream per-channel renderer (5.2–5.6) must escape the RAW payload field exactly once,
 * never re-escape this function's output. Per-channel escaping semantics (plaintext SMS/push need no
 * entity encoding; Telegram MarkdownV2 has its own reserved set) are an explicitly deferred obligation on
 * each provider story — see the Story 5.1 review deferral (deferred-work.md, 2026-07-05).
 */
export function escapeText(value: string): string {
  const htmlEncoded = value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  // Escape backslash FIRST (it is inside the class) so the backslashes we add are not themselves rescanned
  // — String.replace is a single left-to-right pass, so inserted `\` are never re-matched.
  return htmlEncoded.replace(/[\\`*_[\]()~#{}$]/g, (ch) => `\\${ch}`);
}

/** Paise → a fixed 2-decimal rupee string (deterministic; no locale/Intl clock dependence). */
function rupees(paise: number): string {
  return `₹${(paise / 100).toFixed(2)}`;
}

/**
 * Category → a `{ heading, line }` pair with all payload-derived substitutions ESCAPED. The channel
 * renderers below assemble these into channel-specific presentation.
 */
function content(alert: RenderableAlert): { heading: string; line: string } {
  switch (alert.alert_category) {
    case 'alert_published':
      return { heading: escapeText(alert.payload_data.title), line: escapeText(alert.payload_data.body) };
    case 'deadline_reminder':
      // `deadline_display` is the PRODUCER-formatted human-readable deadline (never the raw ISO-8601
      // `deadline_at` — a machine timestamp in UTC is not member-facing copy, and render must stay a pure
      // function of the payload, so formatting cannot happen here).
      return {
        heading: 'Deadline reminder',
        line: `${escapeText(alert.payload_data.subject)} — due ${escapeText(alert.payload_data.deadline_display)}`,
      };
    case 'contribution_confirmed':
      return {
        heading: 'Contribution recorded',
        line: `${rupees(alert.payload_data.amount_paise)} for ${escapeText(alert.payload_data.period_label)}`,
      };
    case 'contribution_mismatch':
      return {
        heading: 'Contribution mismatch',
        line: `expected ${rupees(alert.payload_data.expected_paise)}, recorded ${rupees(alert.payload_data.actual_paise)}`,
      };
    case 'claim_status_change':
      return {
        heading: 'Claim update',
        line: `Your claim is now ${escapeText(alert.payload_data.new_status)}`,
      };
    case 'helpdesk_reply':
      return { heading: 'Helpdesk reply', line: 'You have a new reply on your ticket.' };
    case 'module_new':
      return { heading: 'New module', line: escapeText(alert.payload_data.module_title) };
    case 'step_up_otp':
      return {
        heading: 'Verification code',
        line: `A code was requested for ${escapeText(alert.payload_data.purpose)}.`,
      };
    case 'niyamavali_amended':
      return { heading: 'Rule amended', line: escapeText(alert.payload_data.amendment_summary) };
  }
}

/** The pure renderer for ONE channel — the AC5 byte-identical-replay unit. */
export function render(alert: RenderableAlert, channel: Channel): RenderedMessage {
  const { heading, line } = content(alert);
  switch (channel) {
    case 'push':
      return { channel, title: heading, body: line };
    case 'whatsapp':
      return { channel, title: null, body: `${heading}\n\n${line}` };
    case 'sms':
      return { channel, title: null, body: `${heading}: ${line}` };
    case 'telegram':
      return { channel, title: null, body: `📢 ${heading}\n${line}` };
  }
}
