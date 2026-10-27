// Story 11b.4a (Task 9.2; AC11, AC12, AC14) — the helpline's take-down screens. The operator script renders BEFORE any take-down
// control in BOTH branches (MP8 (b)); the current-nominee line names a different nominee; a decided request after its due date
// says so; a 403 renders the page's own "no access"; a take-down asks for a fresh verification on `auth.step_up_required`.

import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import type { MemorialTakedownDriveResponse, MemorialTakedownRequestView } from '@twt/contracts';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@tanstack/react-router', () => ({
  Link: (p: { children: ReactNode; to: string; 'data-testid'?: string }) => (
    <a href={p.to} data-testid={p['data-testid']}>
      {p.children}
    </a>
  ),
}));

vi.mock('../src/api/client.js', async () => {
  const actual = await vi.importActual<typeof import('../src/api/client.js')>('../src/api/client.js');
  return {
    ...actual,
    getMemorialTakedownDrive: vi.fn(),
    listOpenMemorialTakedownRequests: vi.fn(),
    listMemberMemorialTakedownDrives: vi.fn(),
    recordMemorialTakedownRequest: vi.fn(),
    decideMemorialTakedown: vi.fn(),
    requestMemorialTakedownStepUp: vi.fn(),
    searchMembers: vi.fn(),
  };
});

import * as api from '../src/api/client.js';
import { ApiError } from '../src/api/client.js';
import { operatorScript, requestStatus } from '../src/modules/memorial-takedown/derive.js';
import { resolveEn } from '../src/modules/memorial-takedown/i18n-en.js';
import { MemorialTakedownDrivePage, MemorialTakedownListPage } from '../src/modules/memorial-takedown/MemorialTakedownPage.js';
import { renderWithClient } from './_helpers.js';

const PARIWAR = '44444444-4444-4444-8444-444444444444';
const POOL = '55555555-5555-4555-8555-555555555555';
const REQ = '66666666-6666-4666-8666-666666666666';

const SCRIPT_INTRO =
  'Before you take it down, ask what is troubling them. Offer what is smaller than removal: leaving out a sentence or a name, removing only the photo, or sending a new version.';

function request(over: Partial<MemorialTakedownRequestView> = {}): MemorialTakedownRequestView {
  return {
    requestId: REQ,
    firstContactAt: '2026-10-26T10:00:00.000Z',
    receivedAt: '2026-10-26T11:00:00.000Z',
    dueAt: '2026-11-02T10:00:00.000Z',
    overdue: false,
    actorDisplay: 'Helpline Operator',
    outcome: null,
    ...over,
  };
}

function drive(over: Partial<MemorialTakedownDriveResponse> = {}): MemorialTakedownDriveResponse {
  return {
    poolId: POOL,
    poolCanonicalIdentifier: 'P-2026-10-001',
    memorialState: 'approved_with_omissions',
    shown: {
      submissionId: '77777777-7777-4777-8777-777777777777',
      sentAt: '2026-10-20T10:00:00.000Z',
      words: ['माँ हमेशा मुस्कुराती थीं।'],
      hasPhoto: false,
      photoUrl: null,
      altText: null,
    },
    nomineeToCallBack: { name: 'Asha Devi', mobile: '+919876543210' },
    smallerFix: 'send_now',
    currentNominee: { name: 'Asha Devi', isNomineeToCallBack: true },
    requests: [request()],
    ...over,
  };
}

const follows = (a: Element, b: Element): boolean => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;

afterEach(() => cleanup());
beforeEach(() => {
  for (const fn of [api.getMemorialTakedownDrive, api.listOpenMemorialTakedownRequests, api.decideMemorialTakedown, api.requestMemorialTakedownStepUp]) {
    vi.mocked(fn).mockReset();
  }
});

describe('⭐ AC11 — the operator script renders BEFORE the take-down control, in BOTH branches', () => {
  it.each([
    ['send_now', 'The nominee can send a new version from the app now. This memorial stays on the page until the Trust approves the new one.'],
    ['take_down_first', 'A new version can be sent only after this one is taken down, so the memorial will be off the page while the Trust reviews the new one.'],
  ] as const)('%s', async (smallerFix, branchLine) => {
    vi.mocked(api.getMemorialTakedownDrive).mockResolvedValue(drive({ smallerFix }));
    renderWithClient(<MemorialTakedownDrivePage pariwarId={PARIWAR} poolId={POOL} />);
    const script = await screen.findByTestId('takedown-script');
    expect(script).toHaveTextContent(SCRIPT_INTRO);
    expect(script).toHaveTextContent(branchLine);
    const button = screen.getByTestId('takedown-take-down');
    expect(follows(script, button)).toBe(true);
    // The confirm says how long it takes — ⛔ never "immediately".
    fireEvent.click(button);
    expect(screen.getByTestId('takedown-confirm')).toHaveTextContent('It leaves the page within about 5 minutes.');
    expect(document.body.textContent).not.toMatch(/immediate/i);
  });

  it('the call-back nominee (name + mobile) is shown', async () => {
    vi.mocked(api.getMemorialTakedownDrive).mockResolvedValue(drive());
    renderWithClient(<MemorialTakedownDrivePage pariwarId={PARIWAR} poolId={POOL} />);
    const callBack = await screen.findByTestId('takedown-call-back');
    expect(callBack).toHaveTextContent('Asha Devi');
    expect(callBack).toHaveTextContent('+919876543210');
  });
});

describe('the current-nominee line (MP8 (b))', () => {
  it('names the current nominee only when they are NOT the nominee who asked', () => {
    expect(operatorScript(drive({ currentNominee: { name: 'Ravi', isNomineeToCallBack: true } })).at(-1)).toBe(
      'A new version is sent by the current nominee.',
    );
    expect(operatorScript(drive({ currentNominee: { name: 'Ravi', isNomineeToCallBack: false } })).at(-1)).toBe(
      'A new version is sent by the current nominee, Ravi, who is not the person who asked.',
    );
    expect(operatorScript(drive({ shown: null, smallerFix: null }))).toEqual([]);
  });

  it('renders the parenthetical on the screen', async () => {
    vi.mocked(api.getMemorialTakedownDrive).mockResolvedValue(drive({ currentNominee: { name: 'Ravi Kumar', isNomineeToCallBack: false } }));
    renderWithClient(<MemorialTakedownDrivePage pariwarId={PARIWAR} poolId={POOL} />);
    expect(await screen.findByTestId('takedown-script')).toHaveTextContent('Ravi Kumar, who is not the person who asked');
  });
});

describe('AC7 — a request decided after its due date says so', () => {
  it('derive', () => {
    const late = request({ outcome: { outcome: 'kept', decidedAt: '2026-11-03T10:00:00.000Z', actorDisplay: 'Op', decidedAfterDue: true } });
    expect(requestStatus(late)).toBe('Kept · decided after the due date');
    expect(requestStatus(request({ overdue: true }))).toBe('Open · Overdue');
  });

  it('on the screen', async () => {
    vi.mocked(api.getMemorialTakedownDrive).mockResolvedValue(
      drive({
        shown: null,
        smallerFix: null,
        currentNominee: null,
        memorialState: 'taken_down',
        requests: [request({ outcome: { outcome: 'taken_down', decidedAt: '2026-11-03T10:00:00.000Z', actorDisplay: 'Op', decidedAfterDue: true } })],
      }),
    );
    renderWithClient(<MemorialTakedownDrivePage pariwarId={PARIWAR} poolId={POOL} />);
    expect(await screen.findByTestId(`takedown-request-${REQ}`)).toHaveTextContent('Taken down · decided after the due date');
    expect(screen.queryByTestId('takedown-take-down')).toBeNull();
  });
});

describe('a 403 renders the page\'s own no-access state', () => {
  it('the drive', async () => {
    vi.mocked(api.getMemorialTakedownDrive).mockRejectedValue(new ApiError(403, 'rbac.forbidden', 'x'));
    renderWithClient(<MemorialTakedownDrivePage pariwarId={PARIWAR} poolId={POOL} />);
    expect(await screen.findByTestId('takedown-no-access')).toHaveTextContent(resolveEn('takedown.noAccess'));
  });

  it('the list', async () => {
    vi.mocked(api.listOpenMemorialTakedownRequests).mockRejectedValue(new ApiError(403, 'rbac.forbidden', 'x'));
    renderWithClient(<MemorialTakedownListPage pariwarId={PARIWAR} />);
    expect(await screen.findByTestId('takedown-no-access')).toBeInTheDocument();
  });
});

describe('the take-down asks for a fresh verification on `auth.step_up_required`; a 409 is plain English', () => {
  it('step-up', async () => {
    vi.mocked(api.getMemorialTakedownDrive).mockResolvedValue(drive());
    vi.mocked(api.decideMemorialTakedown).mockRejectedValue(new ApiError(403, 'auth.step_up_required', 'x'));
    renderWithClient(<MemorialTakedownDrivePage pariwarId={PARIWAR} poolId={POOL} />);
    fireEvent.click(await screen.findByTestId('takedown-take-down'));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm: take it down' }));
    expect(await screen.findByTestId('takedown-step-up')).toHaveTextContent('needs a fresh verification');
    expect(vi.mocked(api.decideMemorialTakedown).mock.calls[0]![2]).toEqual({ outcome: 'taken_down' });
    // The step-up is ⛔ not shown as a "no access".
    expect(screen.queryByTestId('takedown-no-access')).toBeNull();
  });

  it('409 shown_changed', async () => {
    vi.mocked(api.getMemorialTakedownDrive).mockResolvedValue(drive());
    vi.mocked(api.decideMemorialTakedown).mockRejectedValue(new ApiError(409, 'memorial_takedown.shown_changed', 'x'));
    renderWithClient(<MemorialTakedownDrivePage pariwarId={PARIWAR} poolId={POOL} />);
    fireEvent.click(await screen.findByRole('button', { name: 'The nominee chose to keep it' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('no longer the one this nominee asked about'));
  });
});

describe('the open list (AC10)', () => {
  it('marks an overdue request', async () => {
    vi.mocked(api.listOpenMemorialTakedownRequests).mockResolvedValue({
      requests: [{ requestId: REQ, poolId: POOL, poolCanonicalIdentifier: 'P-2026-10-001', firstContactAt: '2026-10-01T10:00:00.000Z', receivedAt: '2026-10-01T11:00:00.000Z', dueAt: '2026-10-08T10:00:00.000Z', overdue: true }],
    });
    renderWithClient(<MemorialTakedownListPage pariwarId={PARIWAR} />);
    expect(await screen.findByTestId(`takedown-open-${REQ}`)).toHaveTextContent('Overdue');
  });
});
