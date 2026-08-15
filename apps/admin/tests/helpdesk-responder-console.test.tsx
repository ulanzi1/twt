// Helpdesk responder-console component + helper tests — Story 10.4 (Task 7; AC1/AC2/AC3/AC5).
//
// Pure tests (no router/query context — the shells take everything as props). Focus areas:
//   · the cross-link nav derivation (built defensively; synthetic cross-linked rows — AC5);
//   · the queue renders rows with SLA/severity/cross-link badges + the state filter (AC1);
//   · the detail exposes the state-legal actions only, gates reply/resolve on a message, and fires the
//     mutation with the typed message (AC2/AC3); a partner-module cross-link renders a disabled seam.

import {
  DPDPA_DATA_RIGHTS_SUBCATEGORY,
  type HelpdeskAdminTicketDetailResponse,
  type HelpdeskCrossLinkRefs,
  type HelpdeskQueueItem,
  type HelpdeskSlaTimer,
} from '@twt/contracts';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { crossLinkNavs } from '../src/modules/helpdesk/crossLinks.js';
import { formatSlaRemaining, severityLabel } from '../src/modules/helpdesk/presentation.js';
import { HelpdeskDetailShell } from '../src/modules/helpdesk/HelpdeskDetailShell.js';
import { HelpdeskQueueShell } from '../src/modules/helpdesk/HelpdeskQueueShell.js';

const PARIWAR = '11111111-1111-1111-1111-111111111111';
const TICKET = '22222222-2222-2222-2222-222222222222';
const CLAIM = '33333333-3333-3333-3333-333333333333';

const noRefs: HelpdeskCrossLinkRefs = { claim_case_id: null, pool_id: null, module_id: null, validity_lookup_id: null };
const timer = (over: Partial<HelpdeskSlaTimer> = {}): HelpdeskSlaTimer => ({
  due_at: '2026-08-04T06:00:00.000Z',
  running: true,
  breached: false,
  ms_remaining: 3_600_000,
  ...over,
});

const queueItem = (over: Partial<HelpdeskQueueItem> = {}): HelpdeskQueueItem => ({
  ticket_id: TICKET,
  category: 'kyc-trouble',
  sub_category: null,
  subject: 'KYC upload failing',
  current_state: 'open',
  created_via: 'member_app',
  routed_to_role: 'helpline_operator',
  routed_to_scope: { dimension: 'pariwar', value: PARIWAR },
  sla_first_response: timer(),
  sla_resolution: timer({ ms_remaining: 400_000_000 }),
  severity: 'on_track',
  cross_links: noRefs,
  created_at: '2026-08-03T06:00:00.000Z',
  updated_at: '2026-08-03T06:00:00.000Z',
  ...over,
});

const detail = (over: Partial<HelpdeskAdminTicketDetailResponse> = {}): HelpdeskAdminTicketDetailResponse => ({
  ...queueItem(),
  subject_member_id: '44444444-4444-4444-4444-444444444444',
  subject_actor_id: null,
  body: 'My KYC upload keeps failing.',
  attachments: [],
  thread: [{ kind: 'opening', author: 'member', body: 'My KYC upload keeps failing.', occurred_at: '2026-08-03T06:00:00.000Z' }],
  operator_attribution: null,
  routing_policy_version: 1,
  assigned_at: '2026-08-03T06:00:00.000Z',
  member_scope_context: { pariwar_id: PARIWAR, state: null, district: null, block: null, subject_member_id: '44444444-4444-4444-4444-444444444444' },
  // Story 10.29 — element 1's captured instant. ⛔ The DEFAULT is null (the member did not ask), which
  // is the ordinary case; the tests that need the fallback enabled pass it explicitly.
  member_staff_mediation_requested_at: null,
  ...over,
});

describe('crossLinkNavs (AC5) — defensive nav derivation', () => {
  it('returns no navs for an all-null ref set (the v1 default)', () => {
    expect(crossLinkNavs(PARIWAR, noRefs)).toEqual([]);
  });

  it('a claim ref → the verifier console href', () => {
    const navs = crossLinkNavs(PARIWAR, { ...noRefs, claim_case_id: CLAIM });
    expect(navs).toEqual([{ kind: 'claim', label: 'Claim', href: `/p/${PARIWAR}/claims/${CLAIM}/verify` }]);
  });

  it('a partner-module ref renders a badge but a NULL href (Epic 12 seam — nav disabled)', () => {
    const navs = crossLinkNavs(PARIWAR, { ...noRefs, module_id: CLAIM });
    expect(navs).toEqual([{ kind: 'partner_module', label: 'Partner module', href: null }]);
  });

  it('a reconciliation (pool) ref → the review-queue href; a validity ref → member search', () => {
    const navs = crossLinkNavs(PARIWAR, { ...noRefs, pool_id: CLAIM, validity_lookup_id: CLAIM });
    expect(navs.map((n) => n.kind)).toEqual(['reconciliation', 'validity']);
    expect(navs[0]?.href).toBe(`/p/${PARIWAR}/reconciliation-review`);
    expect(navs[1]?.href).toBe(`/p/${PARIWAR}/members`);
  });
});

describe('presentation helpers', () => {
  it('formatSlaRemaining reads Paused when stopped, Overdue when past due, else "N left"', () => {
    expect(formatSlaRemaining(-5000, false)).toBe('Paused');
    expect(formatSlaRemaining(-3_600_000, true)).toBe('Overdue 1h 0m');
    expect(formatSlaRemaining(90 * 60_000, true)).toBe('1h 30m left');
  });

  it('severityLabel maps the three bands', () => {
    expect(severityLabel('breached')).toBe('Breached');
    expect(severityLabel('due_soon')).toBe('Due soon');
    expect(severityLabel('on_track')).toBe('On track');
  });
});

// The queue shell's non-filter/tickets props, factored out so each test only overrides what it
// exercises (Story 10.4 review follow-up: pagination + role filter + severity sort, AC1/AC4).
const queueChrome = () => ({
  stateFilter: '',
  onStateFilterChange: vi.fn(),
  routedToRoleFilter: '',
  onRoutedToRoleFilterChange: vi.fn(),
  sortBy: 'newest' as const,
  onSortByChange: vi.fn(),
  hasPreviousPage: false,
  hasNextPage: false,
  onPreviousPage: vi.fn(),
  onNextPage: vi.fn(),
  onSelect: vi.fn(),
});

describe('<HelpdeskQueueShell> (AC1)', () => {
  it('renders a row with subject, severity, and a claim cross-link badge', () => {
    render(
      <HelpdeskQueueShell
        pariwarId={PARIWAR}
        tickets={[queueItem({ severity: 'breached', cross_links: { ...noRefs, claim_case_id: CLAIM } })]}
        loading={false}
        {...queueChrome()}
      />,
    );
    expect(screen.getByText('KYC upload failing')).toBeTruthy();
    expect(screen.getByText('Breached')).toBeTruthy();
    expect(screen.getByText('Claim')).toBeTruthy();
  });

  it('firing the state filter calls onStateFilterChange; Open calls onSelect with the ticket id', () => {
    const onStateFilterChange = vi.fn();
    const onSelect = vi.fn();
    render(
      <HelpdeskQueueShell
        pariwarId={PARIWAR}
        tickets={[queueItem()]}
        loading={false}
        {...queueChrome()}
        onStateFilterChange={onStateFilterChange}
        onSelect={onSelect}
      />,
    );
    fireEvent.change(screen.getByLabelText('State'), { target: { value: 'in_progress' } });
    expect(onStateFilterChange).toHaveBeenCalledWith('in_progress');
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    expect(onSelect).toHaveBeenCalledWith(TICKET);
  });

  it('shows the empty state when there are no tickets', () => {
    render(<HelpdeskQueueShell pariwarId={PARIWAR} tickets={[]} loading={false} {...queueChrome()} />);
    expect(screen.getByText('No tickets match this filter.')).toBeTruthy();
  });

  it('firing the role filter ("my queue") calls onRoutedToRoleFilterChange with the picked role (AC1)', () => {
    const onRoutedToRoleFilterChange = vi.fn();
    render(
      <HelpdeskQueueShell
        pariwarId={PARIWAR}
        tickets={[queueItem()]}
        loading={false}
        {...queueChrome()}
        onRoutedToRoleFilterChange={onRoutedToRoleFilterChange}
      />,
    );
    fireEvent.change(screen.getByLabelText('My queue'), { target: { value: 'finance_officer' } });
    expect(onRoutedToRoleFilterChange).toHaveBeenCalledWith('finance_officer');
  });

  it('severity sort reorders the rendered rows breached-first without a server refetch (AC4)', () => {
    const onTrack = queueItem({ ticket_id: '55555555-5555-5555-5555-555555555555', subject: 'On track ticket', severity: 'on_track' });
    const breached = queueItem({ ticket_id: '66666666-6666-6666-6666-666666666666', subject: 'Breached ticket', severity: 'breached' });
    render(
      <HelpdeskQueueShell pariwarId={PARIWAR} tickets={[onTrack, breached]} loading={false} {...queueChrome()} sortBy="severity" />,
    );
    const subjects = screen.getAllByText(/ticket$/, { exact: false }).map((el) => el.textContent);
    expect(subjects).toEqual(['Breached ticket', 'On track ticket']);
  });

  it('pagination buttons are disabled/enabled from hasPreviousPage/hasNextPage and fire the handlers (AC1)', () => {
    const onNextPage = vi.fn();
    const onPreviousPage = vi.fn();
    render(
      <HelpdeskQueueShell
        pariwarId={PARIWAR}
        tickets={[queueItem()]}
        loading={false}
        {...queueChrome()}
        hasPreviousPage={true}
        hasNextPage={true}
        onNextPage={onNextPage}
        onPreviousPage={onPreviousPage}
      />,
    );
    const prev = screen.getByRole('button', { name: 'Previous' });
    const next = screen.getByRole('button', { name: 'Next' });
    expect(prev.hasAttribute('disabled')).toBe(false);
    expect(next.hasAttribute('disabled')).toBe(false);
    fireEvent.click(next);
    fireEvent.click(prev);
    expect(onNextPage).toHaveBeenCalledOnce();
    expect(onPreviousPage).toHaveBeenCalledOnce();
  });
});

describe('<HelpdeskDetailShell> (AC2/AC3)', () => {
  const pending = { pickUp: false, reply: false, resolve: false };

  it('an OPEN ticket shows Pick up (open→in_progress is legal) and the reply option; resolve is hidden', () => {
    render(
      <HelpdeskDetailShell
        pariwarId={PARIWAR}
        detail={detail({ current_state: 'open' })}
        loading={false}
        onPickUp={vi.fn()}
        onReply={vi.fn()}
        onResolve={vi.fn()}
        pending={pending}
      />,
    );
    expect(screen.getByText('Pick up')).toBeTruthy();
    expect(screen.getByText('Reply (needs info)')).toBeTruthy();
    expect(screen.queryByText('Resolve')).toBeNull();
  });

  it('an IN_PROGRESS ticket gates reply/resolve on a message and fires onReply with the typed text', () => {
    const onReply = vi.fn();
    render(
      <HelpdeskDetailShell
        pariwarId={PARIWAR}
        detail={detail({ current_state: 'in_progress' })}
        loading={false}
        onPickUp={vi.fn()}
        onReply={onReply}
        onResolve={vi.fn()}
        pending={pending}
      />,
    );
    const replyBtn = screen.getByText('Reply (needs info)') as HTMLButtonElement;
    expect(replyBtn.disabled).toBe(true); // gated: no message yet
    fireEvent.change(screen.getByLabelText('Your message to the member'), { target: { value: 'Please share your UTR.' } });
    expect(replyBtn.disabled).toBe(false);
    fireEvent.click(replyBtn);
    expect(onReply).toHaveBeenCalledWith('Please share your UTR.');
  });

  it('renders the reply thread with role-labelled authors (never a named individual)', () => {
    render(
      <HelpdeskDetailShell
        pariwarId={PARIWAR}
        detail={detail({
          current_state: 'awaiting_member',
          thread: [
            { kind: 'opening', author: 'member', body: 'help', occurred_at: '2026-08-03T06:00:00.000Z' },
            { kind: 'staff_reply', author: 'staff', body: 'Could you share your UTR?', occurred_at: '2026-08-03T07:00:00.000Z' },
          ],
        })}
        loading={false}
        onPickUp={vi.fn()}
        onReply={vi.fn()}
        onResolve={vi.fn()}
        pending={pending}
      />,
    );
    expect(screen.getByText('Could you share your UTR?')).toBeTruthy();
    expect(screen.getByText('Staff')).toBeTruthy();
    expect(screen.getByText('Member')).toBeTruthy();
  });

  it('a partner-module cross-link renders a disabled badge (nav seam), not a link', () => {
    render(
      <HelpdeskDetailShell
        pariwarId={PARIWAR}
        detail={detail({ cross_links: { ...noRefs, module_id: CLAIM } })}
        loading={false}
        onPickUp={vi.fn()}
        onReply={vi.fn()}
        onResolve={vi.fn()}
        pending={pending}
      />,
    );
    const badge = screen.getByText('Partner module');
    expect(badge.tagName).toBe('SPAN'); // a <span>, not an <a> — nav is a documented seam
  });
});

// ── Story 10.29 (D5, code-review addition) — the staff-mediated fallback's presentational courtesy ──
describe('<HelpdeskDetailShell> (D5) — the staff-mediation fallback courtesy', () => {
  const pending = { pickUp: false, reply: false, resolve: false };
  const dataRightsDetail = (over: Partial<HelpdeskAdminTicketDetailResponse> = {}) =>
    detail({ sub_category: DPDPA_DATA_RIGHTS_SUBCATEGORY, ...over });

  it('element 1 NOT captured — the fallback stays disabled even with an attestation typed, and the explaining line renders', () => {
    render(
      <HelpdeskDetailShell
        pariwarId={PARIWAR}
        detail={dataRightsDetail({ member_staff_mediation_requested_at: null })}
        loading={false}
        onPickUp={vi.fn()}
        onReply={vi.fn()}
        onResolve={vi.fn()}
        pending={pending}
        onDeliverStaffMediated={vi.fn()}
        deliveryPending={{ memberDirect: false, staffMediated: false }}
        canFulfilDataRights={true}
      />,
    );
    fireEvent.change(screen.getByTestId('helpdesk-datarights-attestation'), {
      target: { value: 'Caller states the registered handset was lost.' },
    });
    const fallbackBtn = screen.getByTestId('helpdesk-datarights-fallback') as HTMLButtonElement;
    expect(fallbackBtn.disabled, 'the server will refuse — the button must not invite the attempt').toBe(true);
    expect(screen.getByTestId('helpdesk-datarights-no-request')).toBeTruthy();
  });

  it('element 1 CAPTURED — the fallback enables once an attestation is typed, the explaining line is absent, and the typed attestation is fired', () => {
    const onDeliverStaffMediated = vi.fn();
    render(
      <HelpdeskDetailShell
        pariwarId={PARIWAR}
        detail={dataRightsDetail({ member_staff_mediation_requested_at: '2026-08-15T04:00:00.000Z' })}
        loading={false}
        onPickUp={vi.fn()}
        onReply={vi.fn()}
        onResolve={vi.fn()}
        pending={pending}
        onDeliverStaffMediated={onDeliverStaffMediated}
        deliveryPending={{ memberDirect: false, staffMediated: false }}
        canFulfilDataRights={true}
      />,
    );
    expect(screen.queryByTestId('helpdesk-datarights-no-request')).toBeNull();
    const fallbackBtn = screen.getByTestId('helpdesk-datarights-fallback') as HTMLButtonElement;
    expect(fallbackBtn.disabled, 'still gated on a typed attestation').toBe(true);
    fireEvent.change(screen.getByTestId('helpdesk-datarights-attestation'), {
      target: { value: 'Caller states the registered handset was lost; identity confirmed by read-back.' },
    });
    expect(fallbackBtn.disabled).toBe(false);
    fireEvent.click(fallbackBtn);
    expect(onDeliverStaffMediated).toHaveBeenCalledWith(
      'Caller states the registered handset was lost; identity confirmed by read-back.',
    );
  });
});
