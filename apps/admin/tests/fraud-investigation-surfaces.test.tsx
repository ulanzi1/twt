// Story 6.22 (AC13) — the fraud register's remaining admin surfaces, with the ROUTER STUBBED (code review 2026-11-02, RC8):
//
//   · the District Admin's WORK-LIST view and route — the list, its plain "Closed" label, the Open link's target, the empty /
//     forbidden / error branches, the 401 redirect to sign-in (with the `next` the sign-in now FOLLOWS — RC10);
//     the viewer's OWN flag shown with "another District Admin must record the finding" (R2-6); the empty line a `status` (R2-10);
//   · the nav entry — shown inside a Pariwar, ⛔ at the top level (the server's key check is the boundary, like its siblings);
//   · `newUuid` — a v4 UUID built from `getRandomValues` when `crypto.randomUUID` is missing (RC6).
//
// `fraud-investigation.test.tsx` holds the console panel, the helpline section and the label; the work-list's district SCOPE
// (a row in another district absent) is proven over HTTP — `apps/api/tests/integration/claims/fraud-investigation-routes.spec.ts`.
// (An earlier header here said the view could not be rendered because it "needs the router for `useNavigate`"; nine sibling tests
// stub the router exactly as below.)

import { screen, waitFor, fireEvent } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '../src/api/client.js';
import { renderWithClient } from './_helpers.js';

const navigate = vi.fn();
let params: Record<string, string> = {};
vi.mock('@tanstack/react-router', () => ({
  Link: (p: { children: ReactNode; to: string; 'data-testid'?: string }) => (
    <a href={p.to} data-testid={p['data-testid']}>
      {p.children}
    </a>
  ),
  Outlet: () => null,
  useNavigate: () => navigate,
  useParams: () => params,
  useRouter: () => ({ invalidate: vi.fn() }),
}));

const getSession = vi.fn();
const getOpenFraudInvestigations = vi.fn();
vi.mock('../src/api/client.js', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    getSession: () => getSession(),
    getOpenFraudInvestigations: (...a: unknown[]) => getOpenFraudInvestigations(...a),
  };
});

const { FraudInvestigationsRoute, FraudInvestigationsView } = await import('../src/routes/FraudInvestigationsRoute.js');
const { RootLayout } = await import('../src/routes/RootLayout.js');
const { fraudInvestigationEn: t, verifierConsoleEn } = await import('../src/modules/claim-verification/i18n-en.js');
const { fraudInvestigationsPath } = await import('../src/routes/login-next.js');
const { newUuid } = await import('../src/api/new-uuid.js');
const { fraudInvestigationKey, memberFraudClaimsKey, isNotAnAuditedOnDemandRead, openFraudInvestigationsKey } = await import('../src/api/hooks.js');

const PARIWAR = '44444444-4444-4444-8444-444444444444';
const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const FILED = '2026-09-01T05:30:00.000Z';
const FLAGGED = '2026-10-01T05:30:00.000Z';

beforeEach(() => {
  navigate.mockReset();
  getSession.mockReset();
  getOpenFraudInvestigations.mockReset();
  params = { pariwarId: PARIWAR };
});

describe('the work-list view', () => {
  const items = [
    { claim_case_id: A, claim_state: 'verifier_review', claim_filed_at: FILED, flagged_at: FLAGGED, is_flagger: false },
    { claim_case_id: B, claim_state: 'closed', claim_filed_at: FILED, flagged_at: FLAGGED, is_flagger: false },
  ];

  it('⭐ lists each flagged claim — its state, both dates — and a `closed` one plainly "Closed" (⛔ the trigger-blind "another claim … goes ahead")', async () => {
    getOpenFraudInvestigations.mockResolvedValue({ items });
    renderWithClient(<FraudInvestigationsView pariwarId={PARIWAR} />);
    const rowA = await screen.findByTestId(`fraud-investigations-item-${A}`);
    expect(rowA).toHaveTextContent(verifierConsoleEn.nomineeDeclaration.refusals.claimStateLabels['verifier_review']!);
    expect(rowA).toHaveTextContent(t.workList.flaggedOn);
    expect(rowA).toHaveTextContent(t.workList.filedOn);
    const rowB = screen.getByTestId(`fraud-investigations-item-${B}`);
    expect(rowB.querySelector('p.font-medium')!.textContent).toBe(t.result.closedPlain);
    expect(rowB.textContent).not.toContain('goes ahead');
    expect(getOpenFraudInvestigations).toHaveBeenCalledWith(PARIWAR);
  });

  it('⭐ each row\'s Open button has its own accessible name and takes the admin to THAT claim\'s verifier console', async () => {
    getOpenFraudInvestigations.mockResolvedValue({ items });
    renderWithClient(<FraudInvestigationsView pariwarId={PARIWAR} />);
    const openA = await screen.findByTestId(`fraud-investigations-open-${A}`);
    const openB = screen.getByTestId(`fraud-investigations-open-${B}`);
    expect(openA.getAttribute('aria-label')).not.toBe(openB.getAttribute('aria-label'));
    expect(openA.getAttribute('aria-label')).toContain(t.workList.open);
    fireEvent.click(openB);
    expect(navigate).toHaveBeenCalledWith({ to: '/p/$pariwarId/claims/$claimCaseId/verify', params: { pariwarId: PARIWAR, claimCaseId: B } });
  });

  it('an empty list says so; a 403 says only a District Admin can see it; any other failure is the generic line', async () => {
    getOpenFraudInvestigations.mockResolvedValueOnce({ items: [] });
    const first = renderWithClient(<FraudInvestigationsView pariwarId={PARIWAR} />);
    expect(await screen.findByTestId('fraud-investigations-empty')).toHaveTextContent(t.workList.empty);
    expect(screen.getByRole('status')).toHaveTextContent(t.workList.empty); // R2-10 — announced, ⛔ a bare line
    first.unmount();

    getOpenFraudInvestigations.mockRejectedValueOnce(new ApiError(403, 'auth.forbidden', 'x'));
    const second = renderWithClient(<FraudInvestigationsView pariwarId={PARIWAR} />);
    expect(await screen.findByTestId('fraud-investigations-forbidden')).toHaveTextContent(t.workList.forbidden);
    expect(screen.getByRole('alert')).toHaveTextContent(t.workList.forbidden); // R2-11
    expect(screen.queryByTestId('fraud-investigations-list')).toBeNull();
    second.unmount();

    getOpenFraudInvestigations.mockRejectedValueOnce(new ApiError(500, 'http.internal', 'x'));
    renderWithClient(<FraudInvestigationsView pariwarId={PARIWAR} />);
    expect(await screen.findByTestId('fraud-investigations-error')).toHaveTextContent(t.workList.loadError);
    expect(screen.getByRole('alert')).toHaveTextContent(t.workList.loadError); // R2-11
  });

  it('⭐ a claim the VIEWER flagged is SHOWN with "another District Admin must record the finding" — ⛔ hidden; ⛔ that line on anyone else\'s (R2-6)', async () => {
    getOpenFraudInvestigations.mockResolvedValue({ items: [{ ...items[0]!, is_flagger: true }, items[1]!] });
    renderWithClient(<FraudInvestigationsView pariwarId={PARIWAR} />);
    const mine = await screen.findByTestId(`fraud-investigations-item-${A}`);
    expect(screen.getByTestId(`fraud-investigations-you-flagged-${A}`)).toHaveTextContent(t.youFlagged);
    expect(mine).toHaveTextContent(t.youFlagged);
    expect(screen.getByTestId(`fraud-investigations-open-${A}`)).toBeInTheDocument(); // still listed, still openable
    const theirs = screen.getByTestId(`fraud-investigations-item-${B}`);
    expect(screen.queryByTestId(`fraud-investigations-you-flagged-${B}`)).toBeNull();
    expect(theirs.textContent).not.toContain(t.youFlagged);
  });

  it('⭐ a 401 sends the admin to sign-in, asking to come BACK to this list (the `next` the sign-in now follows)', async () => {
    getOpenFraudInvestigations.mockRejectedValue(new ApiError(401, 'auth.unauthorized', 'x'));
    renderWithClient(<FraudInvestigationsView pariwarId={PARIWAR} />);
    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/login', search: { next: fraudInvestigationsPath(PARIWAR) } }));
    expect(fraudInvestigationsPath(PARIWAR.toUpperCase())).toBe(`/p/${PARIWAR}/fraud-investigations`);
  });
});

describe('the work-list route', () => {
  it('a signed-out visitor is redirected to sign-in with `next`; ⛔ the list is read', async () => {
    getSession.mockRejectedValue(new ApiError(401, 'auth.unauthorized', 'x'));
    renderWithClient(<FraudInvestigationsRoute />);
    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/login', search: { next: fraudInvestigationsPath(PARIWAR) } }));
    expect(getOpenFraudInvestigations).not.toHaveBeenCalled();
  });

  it('a signed-in admin sees the list', async () => {
    getSession.mockResolvedValue({ userId: A, nationalGrants: [] });
    getOpenFraudInvestigations.mockResolvedValue({ items: [] });
    renderWithClient(<FraudInvestigationsRoute />);
    expect(await screen.findByTestId('fraud-investigations-empty')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: t.workList.heading })).toBeInTheDocument();
  });
});

describe('the nav entry', () => {
  beforeEach(() => getSession.mockResolvedValue({ userId: A, nationalGrants: [] }));

  it('⭐ inside a Pariwar the "Flagged claims" link goes to the work-list; at the top level it is ⛔ shown (the siblings\' posture — the server key is the boundary)', async () => {
    params = { pariwarId: PARIWAR };
    const inside = renderWithClient(<RootLayout />);
    const link = await screen.findByTestId('nav-fraud-investigations');
    expect(link).toHaveAttribute('href', '/p/$pariwarId/fraud-investigations');
    expect(link).toHaveTextContent(t.workList.nav);
    inside.unmount();

    params = {};
    // The POSITIVE CONTROL: a top-level link that DOES render for this grant proves the layout has loaded before we assert an absence.
    getSession.mockResolvedValue({ userId: A, nationalGrants: ['claim.review_escalated_closure'] });
    renderWithClient(<RootLayout />);
    expect(await screen.findByTestId('nav-escalations-top')).toBeInTheDocument();
    expect(screen.queryByTestId('nav-fraud-investigations')).toBeNull();
  });
});

describe('the audited on-demand reads are registered (RC3)', () => {
  // `invalidateQueries({ predicate: isNotAnAuditedOnDemandRead })` is how a BROAD invalidation skips a read that decrypts / is audited.
  const asQuery = (queryKey: readonly unknown[]) => ({ queryKey }) as unknown as Parameters<typeof isNotAnAuditedOnDemandRead>[0];

  it('⭐ the fraud console read and the helpline\'s per-member list are SKIPPED by a broad invalidation; the work-list (no decrypt) is not', () => {
    expect(isNotAnAuditedOnDemandRead(asQuery(fraudInvestigationKey('p', 'c')))).toBe(false);
    expect(isNotAnAuditedOnDemandRead(asQuery(memberFraudClaimsKey('p', 'm')))).toBe(false);
    expect(isNotAnAuditedOnDemandRead(asQuery(openFraudInvestigationsKey('p')))).toBe(true); // the CONTROL: an ordinary key is invalidated
  });
});

describe('newUuid (RC6)', () => {
  afterEach(() => vi.unstubAllGlobals());
  const V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

  it('uses `crypto.randomUUID` when it exists — and nothing else (the stub\'s answer is returned, `getRandomValues` is not touched)', () => {
    const fixed = '12345678-1234-4234-8234-123456789abc';
    const getRandomValues = vi.fn();
    vi.stubGlobal('crypto', { randomUUID: () => fixed, getRandomValues });
    expect(newUuid()).toBe(fixed);
    expect(getRandomValues).not.toHaveBeenCalled();
  });

  it('is well-formed and different every time in the real environment', () => {
    expect(newUuid()).toMatch(V4);
    expect(newUuid()).not.toBe(newUuid());
  });

  it('⭐ falls back to a v4 UUID built from `getRandomValues` when `randomUUID` is missing (plain http)', () => {
    const real = globalThis.crypto;
    const getRandomValues = vi.fn(real.getRandomValues.bind(real));
    vi.stubGlobal('crypto', { getRandomValues });
    const ids = Array.from({ length: 50 }, () => newUuid());
    expect(getRandomValues).toHaveBeenCalledTimes(50); // ⛔ the `Math.random` path, which also yields a well-formed v4
    for (const id of ids) expect(id).toMatch(V4);
    expect(new Set(ids).size).toBe(50);
  });

  it('and still yields a well-formed v4 with no `crypto` at all', () => {
    vi.stubGlobal('crypto', undefined);
    expect(newUuid()).toMatch(V4);
  });
});
