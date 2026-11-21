// The partner LEAD envelope — Story 12.5 (Task 2; Decision `2026-11-21-483` QE3 (A), QE6 (A), QE12; AC3; I5). PURE: no I/O, no clock.
//
// ⭐ THE BODY (`LeadEnvelopeV1`, canonical JSON — sorted keys, RFC 8785 via `canonicalJsonStringify`):
//   { envelope_version: 1, lead_id, nonce, module_id, pariwar_id, partner_id, submitted_at, member: <the four QE5 fields>,
//     attribution: { source: 'twt', pariwar_id, module_id, lead_id } }
//   · `member` is EXACTLY the sealed fields the member confirmed (I5) — ⛔ a re-read of their record;
//   · ⛔ `member_id` (an internal id is ⛔ a partner's business; `lead_id` is the join key); ⛔ module text, commission terms or
//     consent text;
//   · nothing depends on the attempt or the clock, so the bytes are IDENTICAL on every attempt (the time lives only in the
//     signature header). Ids are lower-case.
// ⭐ THE HEADERS:
//   · `X-TWT-Signature: t=<unix seconds>, v1=<lower-case hex>` — HMAC-SHA-256 with the module's secret (the `latest` version)
//     over the exact bytes `"<t>." + body`; exactly ONE `v1` (QE3 (A)). Rotation is the RECEIVER's dual-secret window (the ADR).
//   · `X-TWT-Attribution: pariwar=<id>, module=<id>, lead_id=<uuid>` — the epic AC's form, verbatim; the same three ids as the body.
//   · `Idempotency-Key: <lead_id>` — THE dedupe key (QE6 (A)); the body's `nonce` is ⛔ one.
//   · `Content-Type: application/json`.
// ⚠ TWT SIGNS and never VERIFIES, so there is ⛔ compare here (the access-wrapper gate's constant-time leg does not apply).

import { createHmac } from 'node:crypto';

import { canonicalJsonStringify } from '../canonical-json.js';
import { LEAD_ENVELOPE_VERSION } from '../schema/marketplace_lead_handoffs.js';
import type { SealedLeadMemberFieldsV1 } from './lead-member-fields.js';

/** What the body is built from — the handoff row, the module row, and the opened sealed fields. */
export interface LeadEnvelopeInput {
  readonly leadId: string;
  readonly pariwarId: string;
  readonly moduleId: string;
  readonly partnerId: string;
  /** The row's `created_at` — written in the event's own transaction, so it equals `module.lead_submitted`'s `occurred_at`. */
  readonly submittedAt: Date;
  readonly sealed: SealedLeadMemberFieldsV1;
}

/** The body's exact shape (QE12). */
export interface LeadEnvelopeV1 {
  readonly envelope_version: typeof LEAD_ENVELOPE_VERSION;
  readonly lead_id: string;
  readonly nonce: string;
  readonly module_id: string;
  readonly pariwar_id: string;
  readonly partner_id: string;
  readonly submitted_at: string;
  readonly member: {
    readonly full_name: string;
    readonly mobile: string;
    readonly district: string | null;
    readonly preferred_language: 'hi' | 'en';
  };
  readonly attribution: {
    readonly source: 'twt';
    readonly pariwar_id: string;
    readonly module_id: string;
    readonly lead_id: string;
  };
}

/** The body's object (exported for the AC3 key-set leg). */
export function leadEnvelopeV1(input: LeadEnvelopeInput): LeadEnvelopeV1 {
  const leadId = input.leadId.toLowerCase();
  const pariwarId = input.pariwarId.toLowerCase();
  const moduleId = input.moduleId.toLowerCase();
  return {
    envelope_version: LEAD_ENVELOPE_VERSION,
    lead_id: leadId,
    nonce: input.sealed.nonce,
    module_id: moduleId,
    pariwar_id: pariwarId,
    partner_id: input.partnerId.toLowerCase(),
    submitted_at: input.submittedAt.toISOString(),
    member: {
      full_name: input.sealed.full_name,
      mobile: input.sealed.mobile,
      district: input.sealed.district,
      preferred_language: input.sealed.preferred_language,
    },
    attribution: { source: 'twt', pariwar_id: pariwarId, module_id: moduleId, lead_id: leadId },
  };
}

/** ⭐ The body's BYTES (UTF-8 of the canonical JSON) — what is signed, sent, and hashed into the attempted audit line. */
export function buildLeadEnvelopeBody(input: LeadEnvelopeInput): Buffer {
  return Buffer.from(canonicalJsonStringify(leadEnvelopeV1(input)), 'utf-8');
}

/** The `v1` HMAC: SHA-256 keyed with the secret's UTF-8 bytes AS RESOLVED (⛔ trimmed) over `"<t>." + body`. */
export function leadSignatureV1(secret: string, t: number, body: Buffer): string {
  return createHmac('sha256', Buffer.from(secret, 'utf-8'))
    .update(Buffer.from(`${String(t)}.`, 'utf-8'))
    .update(body)
    .digest('hex');
}

/** `t=<unix seconds>, v1=<hex>` — exactly ONE `v1` (QE3 (A)). `t` must be a whole, non-negative number of seconds. */
export function leadSignatureHeader(secret: string, t: number, body: Buffer): string {
  if (!Number.isSafeInteger(t) || t < 0) throw new RangeError('leadSignatureHeader: t must be whole unix seconds');
  return `t=${String(t)}, v1=${leadSignatureV1(secret, t, body)}`;
}

/** `pariwar=<id>, module=<id>, lead_id=<uuid>` — the epic AC's form, verbatim, lower-case. */
export function leadAttributionHeader(ids: { readonly pariwarId: string; readonly moduleId: string; readonly leadId: string }): string {
  return `pariwar=${ids.pariwarId.toLowerCase()}, module=${ids.moduleId.toLowerCase()}, lead_id=${ids.leadId.toLowerCase()}`;
}

/** The four request headers (QE3, QE6, QE12). ⛔ Any other header carries a member field or a secret. */
export function leadRequestHeaders(input: {
  readonly secret: string;
  readonly t: number;
  readonly body: Buffer;
  readonly pariwarId: string;
  readonly moduleId: string;
  readonly leadId: string;
}): Readonly<Record<'Content-Type' | 'X-TWT-Attribution' | 'X-TWT-Signature' | 'Idempotency-Key', string>> {
  return {
    'Content-Type': 'application/json',
    'X-TWT-Attribution': leadAttributionHeader(input),
    'X-TWT-Signature': leadSignatureHeader(input.secret, input.t, input.body),
    'Idempotency-Key': input.leadId.toLowerCase(),
  };
}
