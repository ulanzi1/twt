// The TERMINATION-SURFACE fence — Story 10.19 (Task 8; AC10), DB-free source scan.
//
// The mobile harness is pure-Vitest (no @testing-library/react-native available), so this is a
// SOURCE SCAN in the `helpline-cta-presence.test.ts` style — not a mount test. It exists because
// every property below is one a plausible future edit would break SILENTLY, with the app still
// compiling and every other test still green:
//
//   · move the branch into the inner catch  → the terminated response never reaches it, and the
//     member is told their correct code was wrong again;
//   · key on `status === 403`               → collides with every other 403 the verify path can
//     return;
//   · put the surface outside `(auth)`      → the root session guard bounces it to login, so the
//     one screen a terminated member can see becomes unreachable;
//   · add a portal link                     → a CTA that lands on a login wall.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

// apps/mobile/tests/unit → repo root is four levels up (unit → tests → mobile → apps → root).
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const read = (rel: string): string => readFileSync(path.join(repoRoot, rel), 'utf8');

// Strip comments before scanning, per the helpline fence's own review finding: a raw `includes()`
// otherwise matches a stale comment containing the literal, which is the exact false negative these
// scans exist to rule out. This file's comments name every string it asserts on.
const stripComments = (src: string): string =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

const OTP = 'apps/mobile/app/(auth)/otp.tsx';
const SURFACE = 'apps/mobile/app/(auth)/terminated.tsx';

describe('AC10 — the OTP screen routes a terminated member to the termination surface', () => {
  it('⛔ keys on the ERROR CODE, never a bare 403', () => {
    const src = stripComments(read(OTP));
    expect(src).toContain("code === 'auth.member_terminated'");
    // A bare-status branch would fire for unrelated 403s on the verify path.
    expect(src).not.toMatch(/status === 403[\s\S]{0,80}terminated/);
  });

  it('⛔ the branch lives in the OUTER catch — the precedent sits in the inner one, which never sees this error', () => {
    const src = stripComments(read(OTP));
    // The inner `catch (createErr)` wraps `signupCreate` — the SIGNUP path. `auth.member_terminated`
    // is thrown by `completeMemberLogin` on the VERIFY path, so a branch bound to `createErr` would
    // be unreachable code that looks correct in review.
    expect(src).toMatch(/e instanceof ApiError && e\.code === 'auth\.member_terminated'/);
    expect(src).not.toMatch(/createErr[\s\S]{0,120}auth\.member_terminated/);
  });

  it('⛔ the branch is AHEAD of the generic ternary — otherwise it resolves to "invalid code"', () => {
    const src = stripComments(read(OTP));
    const branch = src.indexOf("auth.member_terminated");
    const generic = src.indexOf("auth.otp_error_invalid");
    expect(branch).toBeGreaterThan(-1);
    expect(generic).toBeGreaterThan(-1);
    // This is the copy-truth defect the AC closes: a member whose code was CORRECT being told it
    // was not, on the one surface where the AC promises honesty.
    expect(branch).toBeLessThan(generic);
  });

  it('routes to the (auth)-group surface, carrying the structured payload it renders from', () => {
    const src = stripComments(read(OTP));
    expect(src).toContain("pathname: '/(auth)/terminated'");
    // AC4's payload elements the surface renders. `summary` is deliberately NOT forwarded — it is
    // `{ available: false }` until Story 10.20 and the surface renders no element for it.
    expect(src).toContain('ground_label_key');
    expect(src).toContain('effective_at');
    expect(src).not.toContain('summary');
  });
});

describe('AC10 — the termination surface itself', () => {
  it('⛔ lives in the (auth) group, where the root session guard does not bounce it', () => {
    // `app/_layout.tsx:112-117` redirects any non-`(auth)` route to login when `session` is null.
    // A terminated member HAS no session by construction (AC12), so anywhere else is unreachable.
    expect(() => read(SURFACE)).not.toThrow();
    expect(SURFACE).toContain('(auth)/');
  });

  it('⛔ offers NO portal link and NO CTA that would need a session', () => {
    const src = stripComments(read(SURFACE));
    for (const authenticatedGroup of ['(tabs)', '(membership)', '(helpdesk)', '(data-export)', '(signup)']) {
      expect(src).not.toContain(authenticatedGroup);
    }
    // The only in-app navigation is back to login — a route that works without a session.
    expect(src).toContain("router.replace('/(auth)/login')");
  });

  it('⭐ preserves access to PUBLIC TRUST CONTENT without authentication', () => {
    const src = stripComments(read(SURFACE));
    // Not an in-app route: everything outside `(auth)` is behind the session guard, so public Trust
    // content is the public Astro site, reached by an OUTBOUND link. This is a PRESERVATION
    // requirement — the AC is that nothing in this story breaks it.
    expect(src).toContain('publicSiteHomeUrl');
    expect(src).toContain('Linking.openURL');
  });

  it('renders the payload elements, and NO element for the structurally-absent summary', () => {
    const src = stripComments(read(SURFACE));
    expect(src).toContain('groundLabelKey');
    expect(src).toContain('effectiveAt');
    expect(src).toContain('auth.terminated_further_communication');
    // ⛔ Q2 option (a): absent must be STRUCTURALLY absent — never a blank paragraph, which a reader
    // parses as prose that failed to load.
    expect(src).not.toContain('summary');
  });

  it('⛔ degrades instead of throwing when the server sends a reason code with no copy', () => {
    // `t()` THROWS on an unknown key (`packages/i18n/src/resolver.ts:62-65`) — the same trap that
    // took down a whole notice batch in `moderation-notify.ts`. The ground key is SERVER-supplied,
    // so a code shipped ahead of its copy would otherwise crash the one screen this member has.
    const src = stripComments(read(SURFACE));
    expect(src).toContain('try {');
    expect(src).toContain('memberStatus.moderationReason.unspecified');
  });
});

describe('AC10 — the copy exists in both locales, Hindi included', () => {
  const KEYS = [
    'auth.terminated_title',
    'auth.terminated_body',
    'auth.terminated_body_with_reason',
    'auth.terminated_effective',
    'auth.terminated_further_communication',
    'auth.terminated_public_site',
    'auth.terminated_back',
  ] as const;

  for (const locale of ['en', 'hi'] as const) {
    it(`${locale}: every key the surface renders is present and non-empty`, () => {
      const catalog = JSON.parse(read(`packages/i18n/locales/${locale}/common.json`)) as Record<string, string>;
      for (const key of KEYS) {
        expect(catalog[key], `${locale} missing ${key}`).toBeTruthy();
        expect(catalog[key]!.trim().length).toBeGreaterThan(0);
      }
    });
  }

  it('⛔ the copy does NOT tell the member their code was wrong — it says the opposite', () => {
    const en = JSON.parse(read('packages/i18n/locales/en/common.json')) as Record<string, string>;
    // The whole point of AC10: identity verification SUCCEEDED. The copy affirms it explicitly
    // rather than merely omitting the false claim, because "your membership ended" alone would still
    // leave a member wondering whether they mistyped.
    expect(en['auth.terminated_body']).toMatch(/verified your identity/i);
    expect(en['auth.terminated_body']).toMatch(/code was correct/i);
    expect(en['auth.terminated_body']).not.toMatch(/isn't right|invalid/i);
  });

  it('⚠ the further-communication copy is honest about what exists TODAY', () => {
    // Story 10.21 (the off-portal records route) is `backlog`. The copy therefore names the
    // HELPLINE, which exists, and promises no route that does not.
    const en = JSON.parse(read('packages/i18n/locales/en/common.json')) as Record<string, string>;
    expect(en['auth.terminated_further_communication']).toMatch(/helpline/i);
    expect(en['auth.terminated_further_communication']).not.toMatch(/portal|download|sign in/i);
  });
});
