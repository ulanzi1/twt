// packages/channels/src/render.ts
//
// Per-channel PURE renderers — Story 5.1 (AC4, AC5, AC6). Each `render(alert, channel)` is a pure function
// of the IMMUTABLE alert payload: NO clock reads, NO randomness, NO external I/O (the Epic 4 determinism
// lesson — a renderer that reads `Date.now()` breaks byte-identical replay). Presentation varies per
// channel (push title vs WA body vs concise SMS vs Telegram announcement) but the semantic payload meaning,
// provenance, and classification are never altered — the input is `DeepReadonly<Alert>`, so a renderer
// cannot even express a mutation (AC4 type layer).
//
// ── Escaping discipline — now PER-CHANNEL (Story 5.1 AC6 + Story 5.2 D1) ──────────────────────────────
// EVERY variable substituted from the payload is a potential injection surface: admin-authored strings
// (announcement titles/bodies, module titles, amendment summaries) where an admin who types markdown /
// template syntax / HTML must render as INERT TEXT. Static template text (headings the code owns) is safe
// and never transformed.
//
// Story 5.1 escaped UNCONDITIONALLY for all channels. Story 5.2 (deferred-work.md D1) parameterizes it:
// the `content(alert, esc)` builder takes a per-channel transform. Story 5.3 adds the third arm:
//   · SMS/Telegram — `escapeText` (markup channels; unchanged behavior).
//   · push — the IDENTITY transform (a push tray renders no markup; HTML-entity-encoding `&`→`&amp;` /
//     backslash-escaping there would garble admin prose in the tray — the bug deferred-work.md:1812 flags).
//   · whatsapp — IDENTITY substitution + WHITESPACE-NORMALIZATION of the assembled body (Story 5.3, AC5).
//     WA UTILITY-template parameters are NOT markup-interpreted, so HTML-entity encoding would GARBLE the
//     member's message (the same D1 bug) — and Meta REJECTS a template parameter containing newlines/tabs/
//     4+ consecutive spaces. So WA's correct transform is: keep substitutions raw (inert-by-non-
//     interpretation) and collapse all whitespace runs to single spaces so the single `{{1}}` body param is
//     Meta-valid (Q1=A: one pre-composed body string, no RenderedMessage shape change).

import type { Alert } from '@twt/contracts';
import { deepLinkTargetForAlert, formatDeepLink } from '@twt/contracts';

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

/** The identity transform — used for `push`/`whatsapp` substitutions (no markup interpretation; Story 5.2 D1). */
function identity(value: string): string {
  return value;
}

/**
 * Whitespace-normalize a WA template body (Story 5.3, AC5): collapse every run of whitespace (spaces, tabs,
 * newlines — including the 4+ consecutive spaces Meta rejects) to a SINGLE space and trim the ends. This
 * makes the single `{{1}}` body parameter Meta-valid (Meta rejects a template param with newlines/tabs/4+
 * spaces). Injection stays inert because a template parameter is never markup-interpreted — the raw text is
 * carried literally, just with its whitespace flattened. Pure + deterministic.
 */
function whitespaceNormalize(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

/**
 * Category → a `{ heading, line }` pair. Payload-derived substitutions pass through `esc` (per-channel:
 * `escapeText` for markup channels, IDENTITY for plaintext push). Static template text the code owns
 * (headings) is never transformed. The 8 non-broadcast + the niyamavali broadcast = all 9 categories are
 * handled exhaustively so a new category is a compile error, not a silent blank.
 */
function content(alert: RenderableAlert, esc: (value: string) => string): { heading: string; line: string } {
  switch (alert.alert_category) {
    case 'alert_published':
      return { heading: esc(alert.payload_data.title), line: esc(alert.payload_data.body) };
    case 'deadline_reminder':
      // `deadline_display` is the PRODUCER-formatted human-readable deadline (never the raw ISO-8601
      // `deadline_at` — a machine timestamp in UTC is not member-facing copy, and render must stay a pure
      // function of the payload, so formatting cannot happen here).
      return {
        heading: 'Deadline reminder',
        line: `${esc(alert.payload_data.subject)} — due ${esc(alert.payload_data.deadline_display)}`,
      };
    case 'contribution_confirmed':
      return {
        heading: 'Contribution recorded',
        line: `${rupees(alert.payload_data.amount_paise)} for ${esc(alert.payload_data.period_label)}`,
      };
    case 'contribution_mismatch':
      // Story 9.7 (FR-32) — DIGNIFIED, never alarming: the producer resolves a locale-correct `body` from
      // the reason-code (mapped to Pattern-4 copy, never the raw enum / "Error/Failed"). The pre-9.7
      // "expected X, recorded Y" line was both alarming AND impossible (the verdict carries no amount
      // comparison, and `wrong_pool` has no amounts) — so render drives off `body`, with a dignified generic
      // fallback for a hand-built payload that omits it (the producer always sets it).
      return {
        heading: 'Payment update',
        line: esc(alert.payload_data.body ?? 'We could not match your payment yet — tap to fix it.'),
      };
    case 'claim_status_change':
      return {
        heading: 'Claim update',
        line: `Your claim is now ${esc(alert.payload_data.new_status)}`,
      };
    case 'helpdesk_reply':
      return { heading: 'Helpdesk reply', line: 'You have a new reply on your ticket.' };
    case 'module_new':
      return { heading: 'New module', line: esc(alert.payload_data.module_title) };
    case 'step_up_otp':
      return {
        heading: 'Verification code',
        line: `A code was requested for ${esc(alert.payload_data.purpose)}.`,
      };
    case 'niyamavali_amended':
      return { heading: 'Rule amended', line: esc(alert.payload_data.amendment_summary) };
  }
}

/**
 * Derive the push deep-link URI from the frozen payload (Story 5.2, AC4). PURE — the target is a function
 * of `alert_category` + `payload_data` only (contracts' `deepLinkTargetForAlert`). `null` for a category
 * with no push deep-link (`step_up_otp`). Reading the frozen alert never mutates it, so purity/immutability
 * hold. The `Alert` param is mutable-typed but only READ — a `DeepReadonly<Alert>` reads structurally.
 */
function pushDeepLink(alert: RenderableAlert): string | null {
  const target = deepLinkTargetForAlert(alert as Alert);
  return target === null ? null : formatDeepLink(target);
}

/** The pure renderer for ONE channel — the AC5 byte-identical-replay unit. */
export function render(alert: RenderableAlert, channel: Channel): RenderedMessage {
  // Push + WhatsApp own NON-markup substitution semantics (Story 5.2 D1 / 5.3 AC5) — HTML-entity encoding
  // would garble admin prose in a push tray / a WA template param; SMS/Telegram keep `escapeText` (AC6).
  const esc = channel === 'push' || channel === 'whatsapp' ? identity : escapeText;
  const { heading, line } = content(alert, esc);
  switch (channel) {
    case 'push':
      return { channel, title: heading, body: line, deepLink: pushDeepLink(alert) };
    case 'whatsapp':
      // The single `{{1}}` template body parameter: the assembled body, whitespace-normalized so it is
      // Meta-valid (no newlines/tabs/4+ spaces). Injection stays inert (params are not markup-interpreted).
      return { channel, title: null, body: whitespaceNormalize(`${heading}. ${line}`), deepLink: null };
    case 'sms':
      return { channel, title: null, body: `${heading}: ${line}`, deepLink: null };
    case 'telegram':
      return { channel, title: null, body: `📢 ${heading}\n${line}`, deepLink: null };
  }
}
