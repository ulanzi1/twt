// Story 3.13a (Task 4; AC7, DL9 (b), `-509`) — the staff hint on 3.13's "Could not confirm" form: *"The app shows the member this
// reason."*, under the reason choice, from `i18n-en.ts` (⛔ an inline literal), described-by the reason select. 3.13's own admin
// tests (`identity-checks.test.tsx`) stay as they are. The router and the API client are stubbed (that file's shape).

import { screen, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithClient } from './_helpers.js';

vi.mock('@tanstack/react-router', () => ({
  Link: (p: { children: ReactNode; to: string }) => <a href={p.to}>{p.children}</a>,
  Outlet: () => null,
  useNavigate: () => vi.fn(),
  useParams: () => ({}),
  useRouter: () => ({ invalidate: vi.fn() }),
}));

const getIdentityCheckDetail = vi.fn();
vi.mock('../src/api/client.js', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, getIdentityCheckDetail: (...a: unknown[]) => getIdentityCheckDetail(...a) };
});

const { IdentityCheckDetailView } = await import('../src/modules/identity-checks/IdentityCheckDetailPage.js');
const { identityCheckEn: t } = await import('../src/modules/identity-checks/i18n-en.js');

const PARIWAR = '44444444-4444-4444-8444-444444444444';
const M = '11111111-1111-4111-8111-111111111111';
const detail = (over: Record<string, unknown> = {}) => ({
  member_id: M,
  short_member_id: '11111111',
  state: 'lock-in',
  signed_up_at: '2026-06-01T05:30:00.000Z',
  kyc_source: 'manual',
  identity: { name: 'Sita Devi', date_of_birth: '1971-03-09', photo: null },
  masked_mobile: '+91·····1234',
  posting: { district: 'Patna', workplace_name: null },
  death_reported: false,
  eligible: true,
  history: [] as unknown[],
  ...over,
});

beforeEach(() => getIdentityCheckDetail.mockReset());

describe('Story 3.13a — DL9: the "Could not confirm" form says the app shows the member the reason', () => {
  it('⭐ the line, word for word (DL9 (b)), from the strings file', () => {
    expect(t.form.reasonToldToMember).toBe('The app shows the member this reason.');
  });

  it('⭐ shown in the "Could not confirm" form, directly UNDER the reason select, and the select is described by it', async () => {
    getIdentityCheckDetail.mockResolvedValue(detail());
    renderWithClient(<IdentityCheckDetailView pariwarId={PARIWAR} memberId={M} />);
    const form = await screen.findByTestId('identity-check-not-confirmed-form');
    const hint = within(form).getByTestId('not-confirmed-reason-hint');
    expect(hint).toHaveTextContent(t.form.reasonToldToMember);
    const select = within(form).getByTestId('not-confirmed-reason');
    expect(select).toHaveAttribute('aria-describedby', 'not-confirmed-reason-hint');
    // Directly under it: the hint follows the reason select's label in the form's order.
    expect(select.closest('label')!.nextElementSibling).toBe(hint);
  });

  it('⛔ on the "Confirm identity" form (the control: that form renders)', async () => {
    getIdentityCheckDetail.mockResolvedValue(detail());
    renderWithClient(<IdentityCheckDetailView pariwarId={PARIWAR} memberId={M} />);
    const confirm = await screen.findByTestId('identity-check-confirm-form');
    expect(within(confirm).queryByText(t.form.reasonToldToMember)).toBeNull();
    expect(screen.getAllByText(t.form.reasonToldToMember)).toHaveLength(1);
  });

  it('⛔ an inline literal in the page — the words live in `i18n-en.ts` only', () => {
    const page = readFileSync(resolve(__dirname, '../src/modules/identity-checks/IdentityCheckDetailPage.tsx'), 'utf8');
    expect(page).not.toContain('The app shows the member');
    expect(page).toContain('t.form.reasonToldToMember');
  });
});
