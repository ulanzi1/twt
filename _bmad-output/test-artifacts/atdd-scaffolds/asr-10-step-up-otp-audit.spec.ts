/**
 * ASR-10 — Step-up OTP: audit-per-send AND audit-per-consume, both tagged
 * with the operation identifier.
 *
 * Target stories: Story 1.9 (Admin auth + step-up) + Story 5.9 (Step-up OTP
 *                 Channel Delivery + Audit-Per-Send-Per-Consume)
 * Target final location: apps/api/__tests__/auth/step-up-otp-audit.spec.ts
 * Risks burned down: SEC-6 (session theft → step-up bypass), NFR-28, NFR-29
 *
 * RED-PHASE STATUS: test.skip(). Activation blocked on:
 *   - Story 1.9 admin auth scaffolding
 *   - AR-21 SMS DLT-transactional provider
 *
 * Lane: PR (nightly for the full per-operation matrix).
 *
 * Execution:  pnpm playwright test --grep "@P0 @Auth @StepUp"
 */

import { test, expect } from '@seontechnologies/playwright-utils/api-request/fixtures';
import { faker } from '@faker-js/faker';

// Full per-operation matrix per architecture §2.2 / AR-24.
// Every operation in this list MUST require step-up and emit BOTH audit lines.
const STEP_UP_OPERATIONS = [
  'mobile_change',
  'account_recovery',
  'self_deactivation',
  'account_deletion_ack',
  'digilocker_relink',
  'nominee_change',
  'bank_ifsc_change',
  'claim_filing',
  'trust_payout_authorization',
  'refund_claw_back_initiation',
  'staff_privilege_escalation',
  'role_grant',
  'niyamavali_amendment',
  'pariwar_branding_change',
  'disaster_window_declaration',
] as const;

test.describe('@P0 @Auth @StepUp audit-per-send + audit-per-consume', () => {
  for (const operation of STEP_UP_OPERATIONS) {
    test.skip(`${operation}: send and consume each emit one audit line tagged with operation_id`, async ({
      apiRequest,
    }) => {
      const operation_id = `${operation}-${faker.string.uuid()}`;
      const actor_id = 'actor-step-up-test';

      // Step 1: send OTP — emit audit-per-send.
      const sendRes = await apiRequest({
        method: 'POST',
        path: '/api/auth/step-up/send',
        body: { operation_id, operation, actor_id },
      });
      expect(sendRes.status).toBe(200);

      const sendAudit = await apiRequest({
        method: 'GET',
        path: `/api/admin/audit?operation_id=${operation_id}`,
      });
      expect(sendAudit.status).toBe(200);
      const sendLines: Array<{ kind: string; operation_id: string; operation: string }> =
        sendAudit.body.entries ?? [];
      const sentLines = sendLines.filter((l) => l.kind === 'step_up_otp_sent');
      expect(sentLines).toHaveLength(1);
      expect(sentLines[0].operation_id).toBe(operation_id);
      expect(sentLines[0].operation).toBe(operation);

      // Step 2: consume OTP — emit audit-per-consume.
      const consumeRes = await apiRequest({
        method: 'POST',
        path: '/api/auth/step-up/consume',
        body: { operation_id, code: '000000' /* test-only fixture */, actor_id },
      });
      expect(consumeRes.status).toBe(200);

      const consumeAudit = await apiRequest({
        method: 'GET',
        path: `/api/admin/audit?operation_id=${operation_id}`,
      });
      const consumedLines: Array<{ kind: string; operation_id: string }> =
        (consumeAudit.body.entries ?? []).filter(
          (l: { kind: string }) => l.kind === 'step_up_otp_consumed',
        );
      expect(consumedLines).toHaveLength(1);
      expect(consumedLines[0].operation_id).toBe(operation_id);

      // Step 3: replay consume → must fail (single-use NFR-28).
      const replay = await apiRequest({
        method: 'POST',
        path: '/api/auth/step-up/consume',
        body: { operation_id, code: '000000', actor_id },
      });
      expect(replay.status).toBe(409); // already-consumed
    });
  }

  test.skip('OTP TTL is 3 min — code expires at t=181s', async ({ apiRequest }) => {
    const operation_id = `mobile_change-${faker.string.uuid()}`;
    await apiRequest({
      method: 'POST',
      path: '/api/auth/step-up/send',
      body: { operation_id, operation: 'mobile_change', actor_id: 'a' },
    });

    // Advance clock by 3:01 via test-clock endpoint (depends on TC-4).
    await apiRequest({
      method: 'POST',
      path: '/test/clock/advance',
      body: { seconds: 181 },
    });

    const expired = await apiRequest({
      method: 'POST',
      path: '/api/auth/step-up/consume',
      body: { operation_id, code: '000000', actor_id: 'a' },
    });
    expect(expired.status).toBe(410); // expired
  });

  test.skip('high-trust operation without valid step-up token is rejected', async ({ apiRequest }) => {
    // Direct mobile-change attempt without step-up token MUST fail 403.
    const res = await apiRequest({
      method: 'PUT',
      path: '/api/members/me/mobile',
      body: { new_mobile: '+919999999999' },
      headers: { /* no x-step-up-token */ },
    });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/step.up required/i);
  });
});
