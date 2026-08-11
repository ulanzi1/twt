// AC5's client-side reach — Story 10.19 code-review follow-up.
//
// AC5 requires the refresh path to close "the same way, through the SAME seam" as login. The
// server-side half (`resolveSessionDenial` on both call sites) is proven by
// `apps/api/tests/integration/member-moderation/termination-access-block.spec.ts`. This file proves
// the CLIENT half: a refresh-triggered `auth.member_terminated` 403 must reach the same termination
// surface `otp.tsx` reaches, not degrade to a silent, unexplained logout.
//
// Source-scan, in the `terminated-surface.test.ts` style — the mobile harness is pure-Vitest with no
// @testing-library/react-native, so this asserts the wiring exists rather than mounting the tree.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const read = (rel: string): string => readFileSync(path.join(repoRoot, rel), 'utf8');
const stripComments = (src: string): string =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

const SESSION = 'apps/mobile/lib/session.ts';
const SESSION_CONTEXT = 'apps/mobile/lib/session-context.tsx';
const ROOT_LAYOUT = 'apps/mobile/app/_layout.tsx';

describe('AC5 — a refresh-triggered termination reaches the termination surface', () => {
  it('⛔ session.ts keys the refresh-401/403 handling on the ERROR CODE, never a bare status', () => {
    const src = stripComments(read(SESSION));
    expect(src).toContain("code === 'auth.member_terminated'");
  });

  it('the refresh path forwards a registered handler, mirroring the otp.tsx payload fields', () => {
    const src = stripComments(read(SESSION));
    expect(src).toContain('setTerminatedDuringRefreshHandler');
    expect(src).toContain('onTerminatedDuringRefresh');
    expect(src).toContain('ground_label_key');
    expect(src).toContain('effective_at');
    expect(src).toContain('further_communication');
  });

  it('session-context registers the handler and makes the SecureStore-level clear REACTIVE', () => {
    const src = stripComments(read(SESSION_CONTEXT));
    expect(src).toContain('setTerminatedDuringRefreshHandler');
    // Without a `setSession(null)` inside the handler, `session` stays stale in React state after
    // `refreshAccessToken` has already cleared SecureStore, and the root guard never fires.
    expect(src).toMatch(/setTerminatedDuringRefreshHandler\(\(notice\)\s*=>\s*\{[\s\S]{0,120}setSession\(null\)/);
    expect(src).toContain('terminationNotice');
  });

  it('the root layout guard redirects to the (auth)/terminated surface, not a bare login bounce', () => {
    const src = stripComments(read(ROOT_LAYOUT));
    expect(src).toContain('terminationNotice');
    expect(src).toContain("pathname: '/(auth)/terminated'");
    // The termination redirect must be checked (and returned from) BEFORE the plain
    // `!session && !inAuthGroup` login-bounce, so a terminated member never flashes the login screen.
    const terminationCheck = src.indexOf('terminationNotice) {');
    const loginBounce = src.indexOf("router.replace('/(auth)/login')");
    expect(terminationCheck).toBeGreaterThan(-1);
    expect(loginBounce).toBeGreaterThan(-1);
    expect(terminationCheck).toBeLessThan(loginBounce);
  });
});
