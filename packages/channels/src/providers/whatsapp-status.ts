// WhatsApp delivery-status mapping seam — Story 5.3 (AC5; Task 3).
//
// Meta reports delivery status (delivered / read / failed / …) ASYNCHRONOUSLY via a webhook callback — the
// SAME webhook Story 5.4 stands up. This module owns ONLY the pure mapping from Meta's status string to the
// port's `SendStatus['state']`. Per the Q2 ownership split (CONFIRMED): 5.3 EXPORTS `mapMetaStatus` (+ a
// per-send status-update repository seam in @twt/domain); Story 5.4 OWNS the HTTP webhook receiver, Meta
// signature verification, payload parsing, retries, and the 5s ack — and CONSUMES this function. 5.3 builds
// NO webhook route/endpoint/verification.
//
// PURE + total: an unknown/absent Meta status maps to `unknown` (honest — never fabricate `delivered`).

import type { SendStatus } from '../provider.js';

/** The Meta message-status values a delivery webhook carries (indicative — verify at 5.4 implement time). */
export type MetaDeliveryStatus = 'sent' | 'delivered' | 'read' | 'failed' | 'deleted' | 'blocked' | (string & {});

/**
 * Map a Meta delivery-status string to the port's `SendStatus['state']`. `read` collapses to `delivered`
 * (the port has no `read` state; a read message was necessarily delivered). `deleted`/`blocked` collapse to
 * `failed` (the message did not reach the member as an intact delivery). Any unrecognized status → `unknown`.
 */
export function mapMetaStatus(metaStatus: string): SendStatus['state'] {
  switch (metaStatus) {
    case 'sent':
      return 'sent';
    case 'delivered':
    case 'read':
      return 'delivered';
    case 'failed':
    case 'deleted':
    case 'blocked':
      return 'failed';
    default:
      return 'unknown';
  }
}
