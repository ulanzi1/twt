/**
 * ASR-6 — UPI Intent canonicalization: typed `UPIIntentURL` builder with
 * property-based assertions on (`pa`, `am`, `cu`, `tr`, `tn`, `mc`).
 *
 * Per-UPI-app parity (BHIM/PhonePe/GPay/Paytm) is a manual device-lab matrix
 * (see test-design-qa.md §Tooling & Access). This scaffold owns the canonical
 * URL contract only.
 *
 * Target stories: Story 7.7 (Idempotent payment ref + amount-lock) + Story 8.4
 *                 (`<UPIIntentButton>` + UTR self-attestation)
 * Target final location: packages/domain/__tests__/upi-intent/url-builder.spec.ts
 * Risks burned down: SEC-5 (malformed URL → ₹310 to wrong VPA), FR-17, FR-18
 *
 * RED-PHASE STATUS: test.skip(). No blocker — can begin once monorepo is up.
 *
 * Execution:  pnpm vitest --grep "@P0 @UPI"
 */

import { describe, expect, test } from 'vitest';
import fc from 'fast-check';

// Imports do NOT exist yet — they land with Story 7.7.
// import { buildUPIIntentURL, parseUPIIntentURL } from '@twt/domain/upi-intent';

type UPIIntentInput = {
  pa: string; // payee VPA
  am: number; // amount in INR (integer paise downstream)
  cu: 'INR';
  tr: string; // transaction reference, idempotency key
  tn: string; // transaction note (legal-reviewed)
  mc?: string; // merchant code (optional)
};

declare function buildUPIIntentURL(input: UPIIntentInput): string;
declare function parseUPIIntentURL(url: string): UPIIntentInput;

describe('@P0 @UPI @Builder canonical UPI Intent URL contract', () => {
  test.skip('round-trip: build then parse returns input verbatim (lossless)', () => {
    fc.assert(
      fc.property(
        validVpa(),
        fc.integer({ min: 1, max: 100_000 }),
        fc.string({ minLength: 1, maxLength: 36 }).filter((s) => /^[\w-]+$/.test(s)),
        fc.string({ minLength: 1, maxLength: 50 }).filter((s) => !/[#&?]/.test(s)),
        (pa, am, tr, tn) => {
          const url = buildUPIIntentURL({ pa, am, cu: 'INR', tr, tn });
          const parsed = parseUPIIntentURL(url);
          expect(parsed.pa).toBe(pa);
          expect(parsed.am).toBe(am);
          expect(parsed.cu).toBe('INR');
          expect(parsed.tr).toBe(tr);
          expect(parsed.tn).toBe(tn);
        },
      ),
    );
  });

  test.skip('URL starts with upi://pay? and encodes all required params', () => {
    fc.assert(
      fc.property(
        validVpa(),
        fc.integer({ min: 1, max: 100_000 }),
        validRef(),
        (pa, am, tr) => {
          const url = buildUPIIntentURL({ pa, am, cu: 'INR', tr, tn: 'TWT' });
          expect(url.startsWith('upi://pay?')).toBe(true);
          expect(url).toContain(`pa=${encodeURIComponent(pa)}`);
          expect(url).toContain(`am=${am}`);
          expect(url).toContain('cu=INR');
          expect(url).toContain(`tr=${encodeURIComponent(tr)}`);
        },
      ),
    );
  });

  test.skip('rejects invalid VPA: must match <handle>@<provider>', () => {
    const invalids = ['', ' ', 'plain', 'no-at-sign.com', '@only-provider', 'has@two@signs'];
    for (const pa of invalids) {
      expect(() => buildUPIIntentURL({ pa, am: 310, cu: 'INR', tr: 't-1', tn: 'x' })).toThrow();
    }
  });

  test.skip('rejects non-INR currency (v1 is INR-only)', () => {
    expect(() =>
      buildUPIIntentURL({
        pa: 'mrs.sharma@upi',
        am: 310,
        // @ts-expect-error — INR-only is a compile-time and runtime guarantee
        cu: 'USD',
        tr: 't-1',
        tn: 'x',
      }),
    ).toThrow();
  });

  test.skip('rejects amount ≤ 0 or non-integer', () => {
    for (const am of [0, -1, 1.5, NaN, Infinity]) {
      expect(() =>
        buildUPIIntentURL({ pa: 'mrs.sharma@upi', am, cu: 'INR', tr: 't-1', tn: 'x' }),
      ).toThrow();
    }
  });

  test.skip('idempotent `tr=`: same (member_id, alert_id) produces identical tr', () => {
    // tr= is the idempotency key per FR-17. The builder should derive tr
    // deterministically from (member_id, alert_id) when called via the
    // factory: buildUPIIntentURL.forMemberAlert({ member_id, alert_id, ... }).
    // We assert the deterministic helper here.
    fc.assert(
      fc.property(
        fc.string({ minLength: 6, maxLength: 36 }),
        fc.string({ minLength: 6, maxLength: 36 }),
        (member_id, alert_id) => {
          // The helper API is part of Story 7.7. Use forMemberAlert when it lands.
          // const url1 = buildUPIIntentURL.forMemberAlert({ member_id, alert_id, ... });
          // const url2 = buildUPIIntentURL.forMemberAlert({ member_id, alert_id, ... });
          // expect(parseUPIIntentURL(url1).tr).toBe(parseUPIIntentURL(url2).tr);
          // RED-phase placeholder:
          expect(member_id).toBeDefined();
          expect(alert_id).toBeDefined();
        },
      ),
    );
  });
});

// ─── arbitraries ────────────────────────────────────────────────────────────

function validVpa() {
  return fc.tuple(
    fc.string({ minLength: 3, maxLength: 30 }).filter((s) => /^[a-zA-Z0-9._-]+$/.test(s)),
    fc.constantFrom('upi', 'okicici', 'okhdfcbank', 'oksbi', 'paytm', 'ybl', 'apl'),
  ).map(([handle, provider]) => `${handle}@${provider}`);
}

function validRef() {
  return fc.string({ minLength: 8, maxLength: 32 }).filter((s) => /^[A-Za-z0-9-]+$/.test(s));
}
