// The pure half of the code SMS record — Story 13.1b (Task 2.6; AD12; AC10). `deriveFieldWorkerCodeSmsStatus` is TOTAL over the outcomes,
// and each detail form the sweep writes is pinned to its status, so an unknown-outcome word written outside the prefix fails here.

import { describe, expect, it } from 'vitest';

import { deriveFieldWorkerCodeSmsStatus, isFieldWorkerCodeSmsDetail } from '../../src/field-worker/code-sms.js';
import { FIELD_WORKER_CODE_SMS_OUTCOMES, FIELD_WORKER_CODE_SMS_STATUSES } from '../../src/schema/field_worker_code_sms_sends.js';

const of = (outcome: (typeof FIELD_WORKER_CODE_SMS_OUTCOMES)[number], detail: string | null = null, report: 'delivered' | 'undelivered' | null = null) =>
  deriveFieldWorkerCodeSmsStatus({ outcome, detail, report });

describe('deriveFieldWorkerCodeSmsStatus (AD12)', () => {
  it('no row ⇒ null', () => {
    expect(deriveFieldWorkerCodeSmsStatus(null)).toBeNull();
  });

  it('the table, row by row', () => {
    expect(of('due')).toBe('sending');
    expect(of('due', 'rate_limited:http_429')).toBe('sending');
    expect(of('attempting')).toBe('sending');
    expect(of('accepted')).toBe('sent');
    expect(of('accepted', null, 'delivered')).toBe('delivered');
    expect(of('accepted', null, 'undelivered')).toBe('not_delivered');
    expect(of('rejected_invalid_number', 'invalid_number:bad_length')).toBe('not_delivered');
    expect(of('rejected_unreachable', 'carrier_reject:dnd')).toBe('not_delivered');
    expect(of('skipped_not_active')).toBe('not_delivered');
  });

  it('⭐ total: every outcome answers one of the five words', () => {
    for (const outcome of FIELD_WORKER_CODE_SMS_OUTCOMES) {
      expect(FIELD_WORKER_CODE_SMS_STATUSES).toContain(of(outcome));
    }
  });

  // ⭐ AD12's ONE rule: the prefix. Every form the sweep writes for `error`, each pinned, with the words that decide it.
  const NOT_CONFIRMED = [
    'exhausted:outcome_unknown', // the lease, or a settle that never landed
    'exhausted:outcome_unknown:api_unavailable:timeout',
    'exhausted:outcome_unknown:api_unavailable:http_503',
    'exhausted:outcome_unknown:unknown:http_500',
    'exhausted:outcome_unknown:unknown:no_request_id',
    'exhausted:outcome_unknown:unknown:sms_messaging_unavailable', // the SEND's word: `provider.send` began
    'exhausted:outcome_unknown:unknown:unknown',
  ];
  const NOT_DELIVERED = [
    'exhausted:expired',
    'exhausted:attempts',
    'config:dlt_template_id_missing',
    'config:sms_gateway_unconfigured',
    'config:sms_messaging_unavailable', // PREPARE's word: nothing sent
    'config:pariwar_locale_missing',
    'config:secret_manager_permission_denied',
    'no_code',
    'identity_unreadable:envelope',
    'identity_unreadable:key_rejected',
    'identity_unreadable:authentication',
    'auth:preflight',
    'auth:http_401',
    'dlt_template_not_approved:template_id_malformed',
    'dlt_template_not_approved:preflight_content_mismatch',
  ];

  it.each(NOT_CONFIRMED)('`error` / %s ⇒ not_confirmed: the gateway may have taken it', (detail) => {
    expect(isFieldWorkerCodeSmsDetail(detail)).toBe(true);
    expect(of('error', detail)).toBe('not_confirmed');
  });

  it.each(NOT_DELIVERED)('`error` / %s ⇒ not_delivered: a definite failure', (detail) => {
    expect(isFieldWorkerCodeSmsDetail(detail)).toBe(true);
    expect(of('error', detail)).toBe('not_delivered');
  });

  it('prepare’s and the send’s `sms_messaging_unavailable` read differently (AD12)', () => {
    expect(of('error', 'config:sms_messaging_unavailable')).toBe('not_delivered');
    expect(of('error', 'exhausted:outcome_unknown:unknown:sms_messaging_unavailable')).toBe('not_confirmed');
  });

  it('a report on a row that is not `accepted` changes no status (G18)', () => {
    expect(of('error', 'exhausted:outcome_unknown', 'delivered')).toBe('not_confirmed');
    expect(of('error', 'no_code', 'delivered')).toBe('not_delivered');
  });
});
