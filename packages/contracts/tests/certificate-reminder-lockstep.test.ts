// Story 6.19d — the certificate reminder's wire vocabularies are in LOCKSTEP with the domain (`2026-10-03-276` CR11).
// The contracts ⛔ never import `@twt/domain` at runtime ([[project_contracts_domain_bundle_boundary]]) — this TEST is the
// only bridge. Plus the request's boundary refusals and the response's ⛔ input-tightened output fields (footgun #29(a)).

import { describe, expect, it } from 'vitest';

import { claim, schema } from '@twt/domain';

import {
  CERTIFICATE_REMINDER_CANNOT_REMIND,
  CERTIFICATE_REMINDER_CAUSES,
  CERTIFICATE_REMINDER_PAUSE_REASONS,
  CERTIFICATE_REMINDER_SMS_STATES,
  CertificateRemindersResponse,
  RecordCertificateLetterRequest,
} from '../src/index.js';

describe('the certificate reminder vocabularies (Story 6.19d)', () => {
  it('⭐ cause, pause reason, "cannot remind" and the SMS state EQUAL the domain tuples, in order', () => {
    expect([...CERTIFICATE_REMINDER_CAUSES]).toEqual([...schema.CERTIFICATE_RUN_CAUSES]);
    expect([...CERTIFICATE_REMINDER_PAUSE_REASONS]).toEqual([...claim.CERTIFICATE_PAUSE_REASONS]);
    expect([...CERTIFICATE_REMINDER_CANNOT_REMIND]).toEqual([...claim.CERTIFICATE_CANNOT_REMIND_REASONS]);
    expect([...CERTIFICATE_REMINDER_SMS_STATES]).toEqual([...claim.CERTIFICATE_PERSON_SMS_STATES]);
  });

  it('the letter request refuses a bad person key, an unreal date and a blank tracking number', () => {
    const ok = { person_key: 'claimant', posted_on: '2026-10-03', tracking_number: 'EE123456789IN' };
    expect(RecordCertificateLetterRequest.safeParse(ok).success).toBe(true);
    expect(RecordCertificateLetterRequest.safeParse({ ...ok, person_key: 'nominee:X' }).success).toBe(false);
    expect(RecordCertificateLetterRequest.safeParse({ ...ok, posted_on: '2026-02-30' }).success).toBe(false);
    expect(RecordCertificateLetterRequest.safeParse({ ...ok, tracking_number: '  ' }).success).toBe(false);
    expect(RecordCertificateLetterRequest.safeParse({ ...ok, extra: 1 }).success).toBe(false);
  });

  it('⛔ footgun #29(a) — the list response parses an UPPER-case person key (⛔ never an input-tightened output field)', () => {
    const parsed = CertificateRemindersResponse.safeParse({
      items: [
        {
          claim_case_id: '11111111-1111-4111-8111-111111111111',
          short_reference: '11111111',
          cause: 'rejected',
          run_state: 'open',
          pause_reason: null,
          run_day: 3,
          next_reminder_on: '2026-10-05',
          cannot_remind: null,
          people: [
            {
              person_key: 'nominee:AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA',
              role: 'nominee',
              position: 'A',
              sms_state: 'reminded',
              letter_eligible: false,
              letter: null,
              escalation_recorded_on: null,
            },
          ],
        },
      ],
    });
    expect(parsed.success).toBe(true);
  });
});
