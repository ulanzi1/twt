// Shared test fixtures — Story 5.1. Valid, schema-parsed `Alert` payloads for the renderer / dispatcher /
// escaping tests. Parsing through the real Zod schema keeps fixtures honest (a schema change breaks them).

import { Alert } from '@twt/contracts';

export const IDS = {
  alert: '11111111-1111-4111-8111-111111111111',
  pariwar: '22222222-2222-4222-8222-222222222222',
  member: '33333333-3333-4333-8333-333333333333',
  pool: '44444444-4444-4444-8444-444444444444',
  claim: '55555555-5555-4555-8555-555555555555',
} as const;

const ENVELOPE = {
  alert_id: IDS.alert,
  pariwar_id: IDS.pariwar,
  member_id: IDS.member,
  time_critical: false,
  provenance_refs: {},
  created_at: '2026-07-05T10:00:00.000Z',
  created_by_actor: 'system',
} as const;

/** A telegram-eligible announcement (all 4 channels render it). Optionally override the payload_data. */
export function announcement(payload_data?: { title: string; body: string }): Alert {
  return Alert.parse({
    ...ENVELOPE,
    alert_category: 'alert_published',
    payload_data: payload_data ?? { title: 'Monsoon drive', body: 'Join us this Saturday.' },
  });
}

/** A per-member claim update (NOT telegram-eligible). */
export function claimStatusChange(): Alert {
  return Alert.parse({
    ...ENVELOPE,
    alert_category: 'claim_status_change',
    payload_data: { claim_id: IDS.claim, new_status: 'approved' },
  });
}

/** A contribution-confirmed alert (paise → rupee formatting). */
export function contributionConfirmed(amount_paise: number): Alert {
  return Alert.parse({
    ...ENVELOPE,
    alert_category: 'contribution_confirmed',
    payload_data: { pool_id: IDS.pool, amount_paise, period_label: 'Jul 2026' },
  });
}
