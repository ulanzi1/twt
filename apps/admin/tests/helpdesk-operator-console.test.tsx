// Helpdesk operator-console component tests — Story 10.3 (Task 7; AC1/AC5).
//
// Pure render tests (no router/query context — the shell takes everything as props). Focus areas:
//   · the filing gate: submit is enabled ONLY once a member is selected, a category is chosen, and an
//     issue body is captured (AC1);
//   · the category picker is REGISTRY-DRIVEN — it renders exactly the categories passed in, never a
//     hardcoded v1 set; subcategories appear only for a category that defines them (AC5);
//   · the post-filing confirmation surfaces the routing target + SLA;
//   · the route gate redirects an unauthenticated session (mirrors HelplineClaimRoute's gate).

import type { HelpdeskCategoryListItem, MemberSearchResultItem } from '@twt/contracts';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import {
  HelpdeskOperatorShell,
  type HelpdeskFiledResult,
  type HelpdeskOperatorShellProps,
} from '../src/modules/helpdesk/HelpdeskOperatorShell.js';
import { HelpdeskOperatorGateView } from '../src/routes/HelpdeskOperatorRoute.js';

const MEMBER: MemberSearchResultItem = {
  memberId: '11111111-1111-1111-1111-111111111111',
  state: 'active',
  name: 'Asha Devi',
  maskedMobile: '+91·····4210',
  aadhaarMasked: 'XXXX1234',
  verificationStrength: 'aadhaar_kyc',
  nomineeSummary: [],
  contributionSection: { status: 'producer_unavailable', producer: 'story-10-24' },
  claimSection: { status: 'producer_unavailable', producer: 'epic-6' },
};

const CATEGORIES: HelpdeskCategoryListItem[] = [
  { category: 'kyc-trouble', sub_categories: [] },
  { category: 'payment-failed', sub_categories: ['upi', 'netbanking'] },
];

const FILED: HelpdeskFiledResult = {
  ticketId: '22222222-2222-2222-2222-222222222222',
  routedToRole: 'finance_officer',
  routedToScope: { dimension: 'pariwar', value: '33333333-3333-3333-3333-333333333333' },
  slaFirstResponseDue: '2026-08-04T06:00:00.000Z',
  slaResolutionDue: '2026-08-08T18:30:00.000Z',
};

/** A stateful harness so category/subcategory/body actually update (the shell is controlled). */
function ShellHarness(over: Partial<HelpdeskOperatorShellProps> = {}): ReactElement {
  const [category, setCategory] = useState<string | null>(over.category ?? null);
  const [subCategory, setSubCategory] = useState<string | null>(over.subCategory ?? null);
  const [body, setBody] = useState(over.body ?? '');
  // Story 10.29 — element 1's intake checkbox is controlled too, so the harness must hold its state.
  const [staffMediation, setStaffMediation] = useState(over.memberRequestedStaffMediation ?? false);
  return (
    <HelpdeskOperatorShell
      lookupSlot={<div data-testid="lookup-slot" />}
      selected={MEMBER}
      categories={CATEGORIES}
      categoriesLoading={false}
      category={category}
      onCategoryChange={setCategory}
      subCategory={subCategory}
      onSubCategoryChange={setSubCategory}
      memberRequestedStaffMediation={staffMediation}
      onMemberRequestedStaffMediationChange={setStaffMediation}
      body={body}
      onBodyChange={setBody}
      onSubmit={() => {}}
      submitPending={false}
      result={null}
      onFileAnother={() => {}}
      {...over}
    />
  );
}

describe('<HelpdeskOperatorShell> — the filing gate (AC1)', () => {
  it('injects the lookup slot (search is NOT re-implemented)', () => {
    render(<ShellHarness selected={null} />);
    expect(screen.getByTestId('lookup-slot')).toBeTruthy();
  });

  it('disables submit until a member + category + body are all present', () => {
    // No category / no body yet.
    render(<ShellHarness />);
    expect(screen.getByTestId('helpdesk-submit').hasAttribute('disabled')).toBe(true);
    expect(screen.getByTestId('helpdesk-gate-hint')).toBeTruthy();
  });

  it('enables submit once a member is selected, a category is chosen, and a body is captured', () => {
    render(<ShellHarness category="kyc-trouble" body="my kyc keeps failing" />);
    expect(screen.getByTestId('helpdesk-submit').hasAttribute('disabled')).toBe(false);
  });

  it('a whitespace-only body does NOT satisfy the gate', () => {
    render(<ShellHarness category="kyc-trouble" body="    " />);
    expect(screen.getByTestId('helpdesk-submit').hasAttribute('disabled')).toBe(true);
  });

  it('fires onSubmit when the enabled button is clicked', () => {
    const onSubmit = vi.fn();
    render(<ShellHarness category="kyc-trouble" body="issue" onSubmit={onSubmit} />);
    fireEvent.click(screen.getByTestId('helpdesk-submit'));
    expect(onSubmit).toHaveBeenCalledOnce();
  });
});

describe('<HelpdeskOperatorShell> — registry-driven category picker (AC5)', () => {
  it('renders exactly the categories passed in (never a hardcoded set)', () => {
    render(<ShellHarness />);
    const select = screen.getByTestId('helpdesk-category') as HTMLSelectElement;
    const values = Array.from(select.options).map((o) => o.value).filter((v) => v !== '');
    expect(values).toEqual(['kyc-trouble', 'payment-failed']);
  });

  it('shows the subcategory picker ONLY for a category that defines subcategories', () => {
    // kyc-trouble has no subcategories → no subcategory select.
    const { rerender } = render(<ShellHarness category="kyc-trouble" />);
    expect(screen.queryByTestId('helpdesk-subcategory')).toBeNull();
    // payment-failed defines two → the picker appears with them.
    rerender(<ShellHarness category="payment-failed" />);
    const sub = screen.getByTestId('helpdesk-subcategory') as HTMLSelectElement;
    const subValues = Array.from(sub.options).map((o) => o.value).filter((v) => v !== '');
    expect(subValues).toEqual(['upi', 'netbanking']);
  });

  it('surfaces the category-load error and disables the picker', () => {
    render(<ShellHarness categoriesError="boom" />);
    expect(screen.getByRole('alert').textContent).toContain('category');
    expect((screen.getByTestId('helpdesk-category') as HTMLSelectElement).disabled).toBe(true);
  });
});

describe('<HelpdeskOperatorShell> — the "filed" confirmation', () => {
  it('shows the routing target + SLA and hides the form once a result is present', () => {
    render(<ShellHarness result={FILED} />);
    expect(screen.getByTestId('helpdesk-filed-result')).toBeTruthy();
    expect(screen.getByTestId('helpdesk-routed-to').textContent).toContain('finance_officer');
    // The intake form (submit button) is gone once filed.
    expect(screen.queryByTestId('helpdesk-submit')).toBeNull();
  });

  it('fires onFileAnother from the confirmation', () => {
    const onFileAnother = vi.fn();
    render(<ShellHarness result={FILED} onFileAnother={onFileAnother} />);
    fireEvent.click(screen.getByTestId('helpdesk-file-another'));
    expect(onFileAnother).toHaveBeenCalledOnce();
  });
});

describe('HelpdeskOperatorGateView — session gate', () => {
  it('shows a checking message while loading', () => {
    render(<HelpdeskOperatorGateView status="loading"><div data-testid="page" /></HelpdeskOperatorGateView>);
    expect(screen.getByRole('status').textContent).toContain('session');
    expect(screen.queryByTestId('page')).toBeNull();
  });

  it('shows a redirect message on error (unauthenticated → /login)', () => {
    render(<HelpdeskOperatorGateView status="error"><div data-testid="page" /></HelpdeskOperatorGateView>);
    expect(screen.getByRole('status').textContent).toContain('sign in');
    expect(screen.queryByTestId('page')).toBeNull();
  });

  it('renders the console on success', () => {
    render(<HelpdeskOperatorGateView status="success"><div data-testid="page" /></HelpdeskOperatorGateView>);
    expect(screen.getByTestId('page')).toBeTruthy();
  });
});
