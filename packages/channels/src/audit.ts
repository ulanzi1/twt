// packages/channels/src/audit.ts
//
// The audit + PII-safe-hash ports for dispatch — Story 5.1 (AC7; AI-4-3 checklist items (c) + (d)). This
// is the Epic 5 "access wrapper" surface the AI-4-3 checklist governs (docs/access-wrapper-invariants.md).
//
//   (c) HMAC-not-raw-PII: the per-channel audit line records a hash of the RENDERED message. Rendered
//       messages carry member-facing content (PII), so `hashRenderedMessage` uses the domain HMAC / blind
//       index (server-held key) — NEVER `sha256(rendered)`. The DISPATCH line hashes the alert PAYLOAD,
//       which carries only ids + admin-authored strings (no raw member PII, same posture as the FR-23
//       renewal-reminder seam), so a plain canonical-JSON sha256 is correct there.
//   (d) Isolated best-effort write: `writeAuditEntry` connects its OWN `servicePool` client + commits its
//       OWN transaction — it never runs on a caller tx (the 4.8 poisoning defect). The dispatcher holds no
//       request transaction, and `createAuditPort` wraps the write in try/catch so an audit failure never
//       poisons dispatch (the non-throwing-into-the-caller guarantee is the caller's job — writeAuditEntry
//       itself throws).

import { createHash } from 'node:crypto';

import { audit, canonicalJsonStringify, encryption } from '@twt/domain';
import type pg from 'pg';

import type { RenderedMessage } from './provider.js';

/** The audit sink the dispatcher calls — one call per audit line. Never throws into dispatch. */
export type AuditPort = (input: audit.AuditEntryInput) => Promise<void>;

/**
 * Production audit port: writes each line through the Story 1.10 hash-chain writer on the isolated
 * BYPASSRLS `servicePool` (AI-4-3(d)) and SWALLOWS write failures so a broken audit path never poisons
 * dispatch. `onError` surfaces the failure to a logger/alert without re-throwing; when omitted, failures
 * fall back to stderr — a degraded audit DB must never be an INVISIBLE compliance-trail gap. The fallback
 * logs the action + error only (never the input's locator/hash fields wholesale).
 */
export function createAuditPort(
  servicePool: pg.Pool,
  onError?: (err: unknown, input: audit.AuditEntryInput) => void,
): AuditPort {
  const reportError =
    onError ??
    ((err: unknown, input: audit.AuditEntryInput) => {
      console.error(`[@twt/channels] audit write failed (action=${input.action}):`, err);
    });
  return async (input) => {
    try {
      await audit.writeAuditEntry(servicePool, input);
    } catch (err) {
      reportError(err, input);
    }
  };
}

/** SHA-256 hex of a string (the dispatch-line PAYLOAD digest slot — non-PII payload). */
export function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf-8').digest('hex');
}

/** Canonical-JSON payload digest of the (frozen) alert — the dispatch audit line's `requestPayloadHash`. */
export function alertPayloadDigest(alert: unknown): string {
  return sha256Hex(canonicalJsonStringify(alert));
}

/** Key material for the rendered-message HMAC (AI-4-3(c)). */
export interface RenderedMessageHmacDeps {
  readonly kms: encryption.KmsProvider;
  readonly hmacKeyRef: encryption.KmsKeyRef;
}

/** Computes the PII-safe HMAC of a rendered message for the per-channel audit line. */
export type RenderedMessageHash = (rendered: RenderedMessage, pariwarId: string) => Promise<string>;

/**
 * Build the rendered-message HMAC hash function (AI-4-3(c)). Canonicalizes the rendered message, then
 * blind-indexes it with the server-held HMAC key (per-Pariwar context-bound). Output is a 64-hex HMAC —
 * it fits the audit writer's `requestPayloadHash` SHA-256-hex slot while being a keyed HMAC, not a
 * brute-forceable `sha256(rawPII)`.
 */
export function createRenderedMessageHash(deps: RenderedMessageHmacDeps): RenderedMessageHash {
  return (rendered, pariwarId) =>
    encryption.blindIndex(
      'alert_rendered',
      canonicalJsonStringify(rendered),
      { pariwarId },
      deps.kms,
      deps.hmacKeyRef,
    );
}
