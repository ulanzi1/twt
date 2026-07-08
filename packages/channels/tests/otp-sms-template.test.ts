// OTP DLT template registry — Story 5.9 (AC2; Task 6 unit).
// DB-FREE unit tests: the pure per-intent OTP DLT template registry + body renderer.

import { describe, expect, it } from 'vitest';

import {
  OTP_DLT_TEMPLATE_REGISTRY,
  renderOtpBody,
  resolveDltTemplate,
  resolveOtpTemplate,
} from '../src/index.js';

describe('OTP DLT template registry (Story 5.9)', () => {
  it('resolves TWO templates keyed by intent, each with its own NAME pointer', () => {
    const login = resolveOtpTemplate('login');
    const stepUp = resolveOtpTemplate('step_up');
    // Distinct NAME pointers (separately TRAI-registered — BigDev 2026-07-07).
    expect(login.dltTemplateIdConfigKey).toBe('sms.dlt.template_id.otp_login');
    expect(stepUp.dltTemplateIdConfigKey).toBe('sms.dlt.template_id.otp_step_up');
    expect(login.dltTemplateIdConfigKey).not.toBe(stepUp.dltTemplateIdConfigKey);
    expect(login.version).toBeGreaterThanOrEqual(1);
    expect(stepUp.version).toBeGreaterThanOrEqual(1);
  });

  it('carries the two committed TTLs in the registered wording (login 5 min, step-up 3 min — R2)', () => {
    expect(resolveOtpTemplate('login').contentTemplate).toContain('5 min');
    expect(resolveOtpTemplate('step_up').contentTemplate).toContain('3 min');
  });

  it('renders the 6-digit code into the single variable slot', () => {
    const body = renderOtpBody(resolveOtpTemplate('login'), '048213');
    expect(body).toContain('048213');
    // The slot marker is fully substituted (no residual template syntax).
    expect(body).not.toContain('{#var#}');
    expect(body).toBe('048213 is your TWT login code. Valid 5 min. Do not share.');
  });

  it('renders the step_up template exactly — byte-match the registered copy (Story 5.9 review)', () => {
    // The gateway byte-matches `body` against its OWN registered copy (module doc comment) — an exact
    // assertion here, not a substring check, so a wording drift fails the test rather than slipping through.
    const body = renderOtpBody(resolveOtpTemplate('step_up'), '048213');
    expect(body).toBe('048213 is your TWT verification code. Valid 3 min. Do not share.');
  });

  it('the NAME pointer is the config KEY, never a TRAI id — no digits-only id text baked in', () => {
    for (const t of Object.values(OTP_DLT_TEMPLATE_REGISTRY)) {
      expect(t.dltTemplateIdConfigKey).toMatch(/^sms\.dlt\.template_id\./);
    }
  });

  it("is DISTINCT from the 5.6 transactional registry — resolveDltTemplate('step_up_otp') stays null", () => {
    // 5.6 deliberately excluded step_up_otp from the transactional path; 5.9 must NOT re-add it there.
    expect(resolveDltTemplate('step_up_otp')).toBeNull();
  });
});
