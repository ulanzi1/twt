// Story 11b.4a (Task 9.2; AC11, AC12, AC14) — the helpline's take-down screens. The operator script renders BEFORE any take-down
// control in BOTH branches (MP8 (b)); the current-nominee line names a different nominee; a decided request after its due date
// says so; a 403 renders the page's own "no access"; a take-down asks for a fresh verification on `auth.step_up_required`.
// Code review 2026-10-27 adds the rest of the operator's path: the focus-refetch opt-out (R3), the list's loading / error states
// (R6), the step-up round trip (R7), the record form's fail-closed gate (R8) and its reset (R9), the announced successes (R10),
// the unreadable-name caution (R18), the two timestamps (R19), and the Idempotency-Key lifecycle (R27 (d)).

import { focusManager, onlineManager, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
    verifyStepUp: vi.fn(),
    searchMembers: vi.fn(),
  };
});

import * as api from '../src/api/client.js';
import { ApiError } from '../src/api/client.js';
import { operatorScript, requestStatus } from '../src/modules/memorial-takedown/derive.js';
import { resolveEn } from '../src/modules/memorial-takedown/i18n-en.js';
import { MemorialTakedownDrivePage, MemorialTakedownListPage } from '../src/modules/memorial-takedown/MemorialTakedownPage.js';
import { createQueryClient, memorialTakedownDriveKey } from '../src/api/hooks.js';
import { renderWithClient } from './_helpers.js';

const PARIWAR = '44444444-4444-4444-8444-444444444444';
const POOL = '55555555-5555-4555-8555-555555555555';
const REQ = '66666666-6666-4666-8666-666666666666';
const MEMBER = '88888888-8888-4888-8888-888888888888';
const MEMBER_ASHA = { memberId: MEMBER, name: 'Asha Devi', maskedMobile: '••••3210' };

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

const decidedAs = (outcome: 'taken_down' | 'kept' | 'superseded') => ({
  outcome,
  decidedAt: '2026-10-27T09:00:00.000Z',
  actorDisplay: 'Op',
  decidedAfterDue: false,
});

/** The drive the mocked API serves NOW. A write that lands swaps it, so the refetch after the write sees what the server would. */
function serve(initial: MemorialTakedownDriveResponse): { set: (d: MemorialTakedownDriveResponse) => void } {
  let current = initial;
  vi.mocked(api.getMemorialTakedownDrive).mockImplementation(async () => current);
  return {
    set: (d) => {
      current = d;
    },
  };
}

const statusText = (): string | null => screen.getByTestId('takedown-status').textContent;
const recordedKeys = (): unknown[] => vi.mocked(api.recordMemorialTakedownRequest).mock.calls.map((c) => c[3]);
const decidedKeys = (): unknown[] => vi.mocked(api.decideMemorialTakedown).mock.calls.map((c) => c[3]);
// `toLocaleString('en-IN')` separates the time from am/pm with a no-break space; the DOM matcher normalises it, the expectation must too.
const when = (iso: string): string => new Date(iso).toLocaleString('en-IN').replace(/\s+/g, ' ');

async function lookUp(mobile: string): Promise<void> {
  fireEvent.change(await screen.findByTestId('takedown-lookup-mobile'), { target: { value: mobile } });
  fireEvent.click(screen.getByRole('button', { name: 'Find' }));
}

afterEach(() => {
  cleanup();
  focusManager.setFocused(undefined);
  onlineManager.setOnline(true);
});
beforeEach(() => {
  // EVERY mocked client function — a leg that mocks one of these must not leak into the next.
  for (const fn of [
    api.getMemorialTakedownDrive,
    api.listOpenMemorialTakedownRequests,
    api.listMemberMemorialTakedownDrives,
    api.recordMemorialTakedownRequest,
    api.decideMemorialTakedown,
    api.requestMemorialTakedownStepUp,
    api.verifyStepUp,
    api.searchMembers,
  ]) {
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

describe('R18 — an unreadable current-nominee name keeps the caution', () => {
  it('a DIFFERENT nominee whose name cannot be read is still "not the person who asked" (the callBack panel\'s own words stand in)', () => {
    expect(operatorScript(drive({ currentNominee: { name: null, isNomineeToCallBack: false } })).at(-1)).toBe(
      'A new version is sent by the current nominee, Not readable just now, who is not the person who asked.',
    );
  });

  it('the SAME nominee with no readable name gets the plain line', () => {
    expect(operatorScript(drive({ currentNominee: { name: null, isNomineeToCallBack: true } })).at(-1)).toBe(
      'A new version is sent by the current nominee.',
    );
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

  it('RT4 — another operator decided first: the 409 `already_decided` refetch closes the decide section, and the reason STAYS on screen', async () => {
    const server = serve(drive());
    vi.mocked(api.decideMemorialTakedown).mockImplementation(async () => {
      server.set(drive({ requests: [request({ outcome: decidedAs('kept') })] }));
      throw new ApiError(409, 'memorial_takedown.already_decided', 'x');
    });
    renderWithClient(<MemorialTakedownDrivePage pariwarId={PARIWAR} poolId={POOL} />);
    fireEvent.click(await screen.findByRole('button', { name: 'The nominee chose to keep it' }));
    // The section WAS there (RU5: ⛔ a vacuous "is gone") …
    expect(screen.getByTestId('takedown-decide')).toBeInTheDocument();
    // … the refetch shows the request decided ⇒ the decide section is gone, the request reads as decided …
    await waitFor(() => expect(screen.queryByTestId('takedown-decide')).toBeNull());
    expect(screen.getByTestId(`takedown-request-${REQ}`)).toHaveTextContent(requestStatus(request({ outcome: decidedAs('kept') })));
    // … and the sentence that says why is still there, right AFTER where the section was (beside its buttons, ⛔ at the top of the page).
    const why = screen.getByTestId('takedown-decide-error');
    expect(why).toHaveTextContent('already been decided');
    expect(follows(screen.getByTestId('takedown-call-back'), why)).toBe(true);
    expect(follows(why, screen.getByTestId('takedown-requests'))).toBe(true);
  });

  it('RU2 — a REFUSED take-down disarms the confirm step: the next request\'s section mounts unarmed', async () => {
    const server = serve(drive());
    vi.mocked(api.decideMemorialTakedown).mockImplementation(async () => {
      server.set(drive({ requests: [request({ outcome: decidedAs('kept') })] }));
      throw new ApiError(409, 'memorial_takedown.already_decided', 'x');
    });
    renderWithClient(<MemorialTakedownDrivePage pariwarId={PARIWAR} poolId={POOL} />);
    fireEvent.click(await screen.findByTestId('takedown-take-down'));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm: take it down' }));
    await waitFor(() => expect(screen.queryByTestId('takedown-decide')).toBeNull());
    // The nominee calls again: the operator records a NEW request; the refetch shows it open.
    vi.mocked(api.recordMemorialTakedownRequest).mockImplementation(async () => {
      server.set(drive({ requests: [request({ outcome: decidedAs('kept') }), request({ requestId: '99999999-9999-4999-8999-999999999999' })] }));
      return { requestId: '99999999-9999-4999-8999-999999999999', poolId: POOL, dueAt: '2026-11-02T10:00:00.000Z' };
    });
    const form = await screen.findByTestId('takedown-record');
    fireEvent.click(within(form).getByRole('checkbox'));
    fireEvent.click(within(form).getByRole('button', { name: 'Record the request' }));
    await screen.findByTestId('takedown-decide');
    expect(screen.queryByTestId('takedown-confirm')).toBeNull();
    expect(screen.getByTestId('takedown-take-down')).toBeInTheDocument();
  });

  it('RU2 / RU3 — a take-down refused `shown_changed` whose refetch shows NOTHING: ⛔ the confirm step, ⛔ "kept"; "changed" is the way to close it', async () => {
    const server = serve(drive());
    vi.mocked(api.decideMemorialTakedown).mockImplementation(async () => {
      server.set(drive({ shown: null, smallerFix: null, currentNominee: null }));
      throw new ApiError(409, 'memorial_takedown.shown_changed', 'x');
    });
    renderWithClient(<MemorialTakedownDrivePage pariwarId={PARIWAR} poolId={POOL} />);
    fireEvent.click(await screen.findByTestId('takedown-take-down'));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm: take it down' }));
    await waitFor(() => expect(screen.getByTestId('takedown-decide-error')).toHaveTextContent('If a version is shown now'));
    await waitFor(() => expect(screen.queryByTestId('takedown-shown')).toBeNull());
    expect(screen.queryByTestId('takedown-confirm')).toBeNull();
    expect(screen.queryByRole('button', { name: 'The nominee chose to keep it' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Close: the memorial on the page has changed' })).toBeInTheDocument();
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

describe('⛔⛔ R3 — a window focus or a reconnect does ⛔ not re-read the drive (each read decrypts and writes an audit line)', () => {
  it.each([
    [
      'focus',
      () => {
        focusManager.setFocused(false);
        focusManager.setFocused(true);
      },
    ],
    [
      'reconnect',
      () => {
        onlineManager.setOnline(false);
        onlineManager.setOnline(true);
      },
    ],
  ] as const)('%s', async (_event, trigger) => {
    vi.mocked(api.getMemorialTakedownDrive).mockResolvedValue(drive());
    const probe = vi.fn(async () => 'read');
    function Probe(): null {
      useQuery({ queryKey: ['memorial-takedown-probe'], queryFn: probe });
      return null;
    }
    renderWithClient(
      <>
        <MemorialTakedownDrivePage pariwarId={PARIWAR} poolId={POOL} />
        <Probe />
      </>,
    );
    await screen.findByTestId('takedown-drive');
    await waitFor(() => expect(probe).toHaveBeenCalledTimes(1));

    act(trigger);

    // ⭐ NON-VACUITY: the event really fired — a query on the app's own defaults, beside the drive, was read again.
    await waitFor(() => expect(probe.mock.calls.length).toBeGreaterThan(1));
    expect(api.getMemorialTakedownDrive).toHaveBeenCalledTimes(1);
  });
});

describe('R6 — the list page never renders blank on a pending or failed read', () => {
  it('the open requests: loading, then a failure is an alert — ⛔ not a blank that reads as "nothing is overdue"', async () => {
    vi.mocked(api.listOpenMemorialTakedownRequests).mockReturnValue(new Promise(() => {}));
    renderWithClient(<MemorialTakedownListPage pariwarId={PARIWAR} />);
    expect(await screen.findByText('Loading the open requests…')).toHaveAttribute('role', 'status');
    cleanup();

    vi.mocked(api.listOpenMemorialTakedownRequests).mockRejectedValue(new ApiError(500, 'internal_error', 'x'));
    renderWithClient(<MemorialTakedownListPage pariwarId={PARIWAR} />);
    const alert = await screen.findByText('Could not load the open requests. Please reload.');
    expect(alert).toHaveAttribute('role', 'alert');
    expect(screen.queryByText('No request is open.')).toBeNull();
    expect(screen.queryByText('Loading the open requests…')).toBeNull();
  });

  it('the chosen member\'s drives: loading, then a failure is an alert', async () => {
    vi.mocked(api.listOpenMemorialTakedownRequests).mockResolvedValue({ requests: [] });
    vi.mocked(api.searchMembers).mockResolvedValue({ results: [MEMBER_ASHA] } as never);
    vi.mocked(api.listMemberMemorialTakedownDrives).mockReturnValueOnce(new Promise(() => {}));
    renderWithClient(<MemorialTakedownListPage pariwarId={PARIWAR} />);
    await lookUp('9876543210');
    fireEvent.click(within(await screen.findByTestId('takedown-lookup-results')).getByRole('button'));
    expect(await screen.findByText('Loading this member’s drives…')).toHaveAttribute('role', 'status');
    cleanup();

    vi.mocked(api.listMemberMemorialTakedownDrives).mockRejectedValue(new ApiError(500, 'internal_error', 'x'));
    renderWithClient(<MemorialTakedownListPage pariwarId={PARIWAR} />);
    await lookUp('9876543210');
    fireEvent.click(within(await screen.findByTestId('takedown-lookup-results')).getByRole('button'));
    const alert = await screen.findByText('Could not load this member’s drives. Please try again.');
    expect(alert).toHaveAttribute('role', 'alert');
    expect(screen.queryByText('This member has no memorial on any Sahyog Vivran page.')).toBeNull();
  });
});

describe('the member lookup (MP12) — by REGISTERED MOBILE, then that member\'s drives', () => {
  beforeEach(() => {
    vi.mocked(api.listOpenMemorialTakedownRequests).mockResolvedValue({ requests: [] });
  });

  it('searches by the trimmed mobile; the drives are read only once a member is chosen', async () => {
    vi.mocked(api.searchMembers).mockResolvedValue({ results: [MEMBER_ASHA] } as never);
    vi.mocked(api.listMemberMemorialTakedownDrives).mockResolvedValue({
      drives: [{ poolId: POOL, poolCanonicalIdentifier: 'P-2026-10-001', hasOpenRequest: true }],
    });
    renderWithClient(<MemorialTakedownListPage pariwarId={PARIWAR} />);
    await lookUp('  9876543210 ');
    const results = await screen.findByTestId('takedown-lookup-results');
    expect(api.searchMembers).toHaveBeenCalledWith(PARIWAR, { by: 'mobile', value: '9876543210' });
    expect(results).toHaveTextContent('Asha Devi');
    expect(results).toHaveTextContent('(••••3210)');
    expect(api.listMemberMemorialTakedownDrives).not.toHaveBeenCalled();

    fireEvent.click(within(results).getByRole('button'));
    const drives = await screen.findByTestId('takedown-member-drives');
    expect(api.listMemberMemorialTakedownDrives).toHaveBeenCalledWith(PARIWAR, MEMBER);
    expect(drives).toHaveTextContent('P-2026-10-001');
    expect(drives).toHaveTextContent('A request is open');
  });

  it('a blank mobile searches nothing', async () => {
    renderWithClient(<MemorialTakedownListPage pariwarId={PARIWAR} />);
    await lookUp('   ');
    await screen.findByText('No request is open.');
    expect(api.searchMembers).not.toHaveBeenCalled();
  });

  it('no match, a failed search, and a member with no memorial each say so', async () => {
    vi.mocked(api.searchMembers).mockResolvedValueOnce({ results: [] } as never);
    renderWithClient(<MemorialTakedownListPage pariwarId={PARIWAR} />);
    await lookUp('9876543210');
    expect(await screen.findByText('No member has this registered mobile number.')).toBeInTheDocument();

    vi.mocked(api.searchMembers).mockRejectedValueOnce(new ApiError(500, 'internal_error', 'x'));
    await lookUp('9876543211');
    expect(await screen.findByText('Could not search just now. Please try again.')).toHaveAttribute('role', 'alert');

    vi.mocked(api.searchMembers).mockResolvedValueOnce({ results: [MEMBER_ASHA] } as never);
    vi.mocked(api.listMemberMemorialTakedownDrives).mockResolvedValue({ drives: [] });
    await lookUp('9876543212');
    fireEvent.click(within(await screen.findByTestId('takedown-lookup-results')).getByRole('button'));
    expect(await screen.findByText('This member has no memorial on any Sahyog Vivran page.')).toBeInTheDocument();
  });
});

describe('the record form (AC6; `-395` item 3) — the attestation gates the write', () => {
  it('⛔ cannot be submitted until "I called the nominee back" is ticked; then it posts the attestation and the time as entered', async () => {
    vi.mocked(api.getMemorialTakedownDrive).mockResolvedValue(drive({ requests: [] }));
    vi.mocked(api.recordMemorialTakedownRequest).mockResolvedValue({ requestId: REQ, poolId: POOL, dueAt: '2026-11-02T10:00:00.000Z' });
    renderWithClient(<MemorialTakedownDrivePage pariwarId={PARIWAR} poolId={POOL} />);
    const form = await screen.findByTestId('takedown-record');
    const submit = within(form).getByRole('button', { name: 'Record the request' });
    expect(submit).toBeDisabled();
    // Not even a forced submit (Enter in the time field) records anything while the attestation is unticked.
    fireEvent.submit(form);
    expect(api.recordMemorialTakedownRequest).not.toHaveBeenCalled();

    fireEvent.change(within(form).getByLabelText(/When the nominee first asked/), { target: { value: '2026-10-26T09:30' } });
    fireEvent.click(within(form).getByRole('checkbox'));
    expect(submit).toBeEnabled();
    fireEvent.click(submit);
    await waitFor(() => expect(api.recordMemorialTakedownRequest).toHaveBeenCalledTimes(1));
    expect(vi.mocked(api.recordMemorialTakedownRequest).mock.calls[0]!.slice(0, 3)).toEqual([
      PARIWAR,
      POOL,
      {
        calledBack: true,
        firstContactAt: new Date('2026-10-26T09:30').toISOString(),
        // R1 — the version this operator was looking at, echoed back from the drive view.
        shownSubmissionId: '77777777-7777-4777-8777-777777777777',
      },
    ]);
  });

  it('R1 — a record refused because another version is now shown says to reload and call back, ⛔ not the decide sentence "close the request as changed"', async () => {
    vi.mocked(api.getMemorialTakedownDrive).mockResolvedValue(drive({ requests: [] }));
    vi.mocked(api.recordMemorialTakedownRequest).mockRejectedValue(new ApiError(409, 'memorial_takedown.shown_changed', 'x'));
    renderWithClient(<MemorialTakedownDrivePage pariwarId={PARIWAR} poolId={POOL} />);
    const form = await screen.findByTestId('takedown-record');
    fireEvent.click(within(form).getByRole('checkbox'));
    fireEvent.click(within(form).getByRole('button', { name: 'Record the request' }));
    const alert = await within(form).findByRole('alert');
    expect(alert).toHaveTextContent('changed while you were on the call, so nothing was recorded');
    expect(alert).toHaveTextContent('call them back before recording');
    expect(alert).not.toHaveTextContent('Close the request as changed');
  });
});

describe('R8 — fail closed: ⛔ no number on screen, ⛔ no attestation that it was called', () => {
  it.each([
    ['the nominee\'s mobile cannot be read', { name: 'Asha Devi', mobile: null }],
    ['the whole nominee cannot be read', null],
  ] as const)('%s', async (_case, nomineeToCallBack) => {
    vi.mocked(api.getMemorialTakedownDrive).mockResolvedValue(drive({ requests: [], nomineeToCallBack }));
    renderWithClient(<MemorialTakedownDrivePage pariwarId={PARIWAR} poolId={POOL} />);
    const unavailable = await screen.findByTestId('takedown-record-unavailable');
    expect(unavailable).toHaveTextContent('Not readable just now');
    expect(screen.queryByTestId('takedown-record')).toBeNull();
    expect(screen.queryByRole('checkbox')).toBeNull();
  });
});

describe('the Idempotency-Key lifecycle (R27 (d)) — one key per user-initiated attempt', () => {
  it('record: a RETRY after a failure reuses the key; the next attempt after a success mints a new one; the form returns clean (R9)', async () => {
    const served = serve(drive({ requests: [] }));
    vi.mocked(api.recordMemorialTakedownRequest)
      .mockRejectedValueOnce(new ApiError(500, 'internal_error', 'x'))
      .mockImplementation(async () => {
        served.set(drive({ requests: [request()] }));
        return { requestId: REQ, poolId: POOL, dueAt: '2026-11-02T10:00:00.000Z' };
      });
    vi.mocked(api.decideMemorialTakedown).mockImplementation(async () => {
      served.set(drive({ requests: [request({ outcome: decidedAs('kept') })] }));
      return { requestId: REQ, outcome: 'kept', decidedAt: '2026-10-27T09:00:00.000Z' };
    });
    renderWithClient(<MemorialTakedownDrivePage pariwarId={PARIWAR} poolId={POOL} />);

    const form = await screen.findByTestId('takedown-record');
    fireEvent.change(within(form).getByLabelText(/When the nominee first asked/), { target: { value: '2020-01-02T03:04' } });
    fireEvent.click(within(form).getByRole('checkbox'));
    fireEvent.click(within(form).getByRole('button', { name: 'Record the request' }));
    expect(await within(form).findByRole('alert')).toHaveTextContent('Could not record this. Please reload and try again.');

    fireEvent.click(within(form).getByRole('button', { name: 'Record the request' }));
    await screen.findByTestId('takedown-decide');
    const [first, retry] = recordedKeys();
    expect(first).toEqual(expect.any(String));
    expect(retry).toBe(first);
    // R10 — the success is announced in the persistent region, not by a form that is about to unmount.
    expect(statusText()).toBe('Request recorded.');

    // The request is closed; the form returns for the NEXT one — clean (R9 (a)), and decided "Recorded." stays announced.
    fireEvent.click(screen.getByRole('button', { name: 'The nominee chose to keep it' }));
    const again = await screen.findByTestId('takedown-record');
    expect(within(again).getByRole('checkbox')).not.toBeChecked();
    expect(within(again).getByLabelText(/When the nominee first asked/)).not.toHaveValue('2020-01-02T03:04');
    expect(statusText()).toBe('Recorded.');

    fireEvent.click(within(again).getByRole('checkbox'));
    fireEvent.click(within(again).getByRole('button', { name: 'Record the request' }));
    await screen.findByTestId('takedown-decide');
    expect(recordedKeys()).toHaveLength(3);
    expect(recordedKeys()[2]).toEqual(expect.any(String));
    expect(recordedKeys()[2]).not.toBe(first);
    // R9 (c) — the new request does not show the previous request's "Recorded."
    expect(statusText()).toBe('Request recorded.');
  });

  it('decide: a RETRY of the same outcome reuses the key', async () => {
    vi.mocked(api.getMemorialTakedownDrive).mockResolvedValue(drive());
    vi.mocked(api.decideMemorialTakedown)
      .mockRejectedValueOnce(new ApiError(500, 'internal_error', 'x'))
      .mockResolvedValue({ requestId: REQ, outcome: 'kept', decidedAt: '2026-10-27T09:00:00.000Z' });
    renderWithClient(<MemorialTakedownDrivePage pariwarId={PARIWAR} poolId={POOL} />);
    const keep = await screen.findByRole('button', { name: 'The nominee chose to keep it' });
    fireEvent.click(keep);
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not record this.');

    fireEvent.click(keep);
    await waitFor(() => expect(api.decideMemorialTakedown).toHaveBeenCalledTimes(2));
    const [first, retry] = decidedKeys();
    expect(first).toEqual(expect.any(String));
    expect(retry).toBe(first);
  });

  it('decide: a DIFFERENT outcome is a new attempt with a new key', async () => {
    vi.mocked(api.getMemorialTakedownDrive).mockResolvedValue(drive());
    vi.mocked(api.decideMemorialTakedown)
      .mockRejectedValueOnce(new ApiError(500, 'internal_error', 'x'))
      .mockResolvedValue({ requestId: REQ, outcome: 'superseded', decidedAt: '2026-10-27T09:00:00.000Z' });
    renderWithClient(<MemorialTakedownDrivePage pariwarId={PARIWAR} poolId={POOL} />);
    fireEvent.click(await screen.findByRole('button', { name: 'The nominee chose to keep it' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not record this.');

    fireEvent.click(screen.getByRole('button', { name: 'Close: the memorial on the page has changed' }));
    await waitFor(() => expect(api.decideMemorialTakedown).toHaveBeenCalledTimes(2));
    const [kept, superseded] = decidedKeys();
    expect(kept).toEqual(expect.any(String));
    expect(superseded).toEqual(expect.any(String));
    expect(superseded).not.toBe(kept);
  });
});

describe('R7 — the step-up round trip: send a code, verify it, and the SAME attempt is retried', () => {
  /** A drive whose take-down is refused with `auth.step_up_required` until `verifyStepUp` lands. */
  function needsVerification() {
    const served = serve(drive());
    let elevated = false;
    vi.mocked(api.decideMemorialTakedown).mockImplementation(async (_pariwar, _request, body) => {
      if (body.outcome === 'taken_down' && !elevated) throw new ApiError(403, 'auth.step_up_required', 'x');
      served.set(
        drive({
          shown: null,
          smallerFix: null,
          currentNominee: null,
          memorialState: 'taken_down',
          requests: [request({ outcome: decidedAs(body.outcome) })],
        }),
      );
      return { requestId: REQ, outcome: body.outcome, decidedAt: '2026-10-27T09:00:00.000Z' };
    });
    vi.mocked(api.requestMemorialTakedownStepUp).mockResolvedValue({ sent: true, expiresInSeconds: 300 });
    vi.mocked(api.verifyStepUp).mockImplementation(async () => {
      elevated = true;
      return { elevated: true, elevatedUntil: '2026-10-27T09:10:00.000Z' };
    });
  }

  async function takeDownUntilVerificationIsAsked(): Promise<HTMLElement> {
    renderWithClient(<MemorialTakedownDrivePage pariwarId={PARIWAR} poolId={POOL} />);
    fireEvent.click(await screen.findByTestId('takedown-take-down'));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm: take it down' }));
    return screen.findByTestId('takedown-step-up');
  }

  it('⭐ code sent ⇒ verified ⇒ the take-down is retried with the same Idempotency-Key, and "Recorded." outlives the decide section', async () => {
    needsVerification();
    const stepUp = await takeDownUntilVerificationIsAsked();
    const verify = within(stepUp).getByRole('button', { name: 'Verify' });
    expect(verify).toBeDisabled();

    fireEvent.click(within(stepUp).getByRole('button', { name: 'Send me a code' }));
    await waitFor(() => expect(statusText()).toBe('Code sent. Enter it below.'));
    expect(api.requestMemorialTakedownStepUp).toHaveBeenCalledTimes(1);

    fireEvent.change(within(stepUp).getByLabelText('Code'), { target: { value: ' 123456 ' } });
    fireEvent.click(verify);

    await waitFor(() => expect(api.decideMemorialTakedown).toHaveBeenCalledTimes(2));
    expect(api.verifyStepUp).toHaveBeenCalledWith('123456');
    const [first, retry] = vi.mocked(api.decideMemorialTakedown).mock.calls;
    expect(first![2]).toEqual({ outcome: 'taken_down' });
    expect(retry).toEqual(first);
    // R10 — the refetch shows the request decided and the decide section goes; the confirmation does not.
    await waitFor(() => expect(screen.queryByTestId('takedown-decide')).toBeNull());
    expect(statusText()).toBe('Recorded.');
    expect(screen.getByTestId(`takedown-request-${REQ}`)).toHaveTextContent('Taken down');
  });

  it('a code that cannot be sent, and a code that does not verify, are TOLD — and the take-down is ⛔ retried on a wrong code', async () => {
    needsVerification();
    vi.mocked(api.requestMemorialTakedownStepUp).mockRejectedValueOnce(new ApiError(500, 'internal_error', 'x'));
    vi.mocked(api.verifyStepUp).mockReset();
    vi.mocked(api.verifyStepUp).mockRejectedValueOnce(new ApiError(401, 'auth.step_up_invalid', 'x'));
    const stepUp = await takeDownUntilVerificationIsAsked();

    fireEvent.click(within(stepUp).getByRole('button', { name: 'Send me a code' }));
    expect(await screen.findByText('Could not send a code just now. Please try again.')).toHaveAttribute('role', 'alert');
    fireEvent.click(within(stepUp).getByRole('button', { name: 'Send me a code' }));
    await waitFor(() => expect(statusText()).toBe('Code sent. Enter it below.'));
    expect(screen.queryByText('Could not send a code just now. Please try again.')).toBeNull();

    fireEvent.change(within(stepUp).getByLabelText('Code'), { target: { value: '000000' } });
    fireEvent.click(within(stepUp).getByRole('button', { name: 'Verify' }));
    const wrong = await screen.findByText('Could not verify that code. Check it, or send a new code, and try again.');
    expect(wrong).toHaveAttribute('role', 'alert');
    expect(api.decideMemorialTakedown).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('takedown-step-up')).toBeInTheDocument();
  });

  it('Verify is disabled while the verification is in flight', async () => {
    needsVerification();
    let release!: () => void;
    vi.mocked(api.verifyStepUp).mockReset();
    vi.mocked(api.verifyStepUp).mockImplementation(
      () => new Promise((resolve) => (release = () => resolve({ elevated: true, elevatedUntil: '2026-10-27T09:10:00.000Z' }))),
    );
    const stepUp = await takeDownUntilVerificationIsAsked();
    fireEvent.change(within(stepUp).getByLabelText('Code'), { target: { value: '123456' } });
    const verify = within(stepUp).getByRole('button', { name: 'Verify' });
    fireEvent.click(verify);
    await waitFor(() => expect(verify).toBeDisabled());
    expect(api.verifyStepUp).toHaveBeenCalledTimes(1);
    release();
    await waitFor(() => expect(api.decideMemorialTakedown).toHaveBeenCalledTimes(2));
  });
});

describe('R10 — "kept" and "superseded" need no verification, and the success is announced after the decide section has gone', () => {
  it.each([
    ['kept', 'The nominee chose to keep it', 'Kept'],
    ['superseded', 'Close: the memorial on the page has changed', 'Superseded'],
  ] as const)('%s', async (outcome, button, line) => {
    const served = serve(drive());
    vi.mocked(api.decideMemorialTakedown).mockImplementation(async () => {
      served.set(drive({ requests: [request({ outcome: decidedAs(outcome) })] }));
      return { requestId: REQ, outcome, decidedAt: '2026-10-27T09:00:00.000Z' };
    });
    renderWithClient(<MemorialTakedownDrivePage pariwarId={PARIWAR} poolId={POOL} />);
    fireEvent.click(await screen.findByRole('button', { name: button }));

    await waitFor(() => expect(screen.queryByTestId('takedown-decide')).toBeNull());
    expect(statusText()).toBe('Recorded.');
    expect(screen.getByTestId('takedown-status')).toHaveAttribute('role', 'status');
    expect(screen.getByTestId(`takedown-request-${REQ}`)).toHaveTextContent(line);
    expect(vi.mocked(api.decideMemorialTakedown).mock.calls[0]!.slice(0, 3)).toEqual([PARIWAR, REQ, { outcome }]);
    expect(api.requestMemorialTakedownStepUp).not.toHaveBeenCalled();
    expect(screen.queryByTestId('takedown-step-up')).toBeNull();
  });
});

describe('R19 — each request shows when it was recorded and when it is due', () => {
  it('beside when the nominee first asked', async () => {
    const r = request();
    vi.mocked(api.getMemorialTakedownDrive).mockResolvedValue(drive({ requests: [r] }));
    renderWithClient(<MemorialTakedownDrivePage pariwarId={PARIWAR} poolId={POOL} />);
    const line = await screen.findByTestId(`takedown-request-${REQ}`);
    expect(line).toHaveTextContent(when(r.firstContactAt));
    expect(line).toHaveTextContent(`Recorded ${when(r.receivedAt)}`);
    expect(line).toHaveTextContent(`Due ${when(r.dueAt)}`);
  });
});

describe('R26 — the screens\' own labels come through the resolver; no table header is empty', () => {
  it('the open table', async () => {
    vi.mocked(api.listOpenMemorialTakedownRequests).mockResolvedValue({
      requests: [{ requestId: REQ, poolId: POOL, poolCanonicalIdentifier: 'P-2026-10-001', firstContactAt: '2026-10-01T10:00:00.000Z', receivedAt: '2026-10-01T11:00:00.000Z', dueAt: '2026-10-08T10:00:00.000Z', overdue: true }],
    });
    renderWithClient(<MemorialTakedownListPage pariwarId={PARIWAR} />);
    const table = await screen.findByTestId('takedown-open-table');
    expect(within(table).getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Drive', 'Nominee first asked', 'Due', 'Status']);
  });

  it('the drive\'s script and decide regions', async () => {
    vi.mocked(api.getMemorialTakedownDrive).mockResolvedValue(drive());
    renderWithClient(<MemorialTakedownDrivePage pariwarId={PARIWAR} poolId={POOL} />);
    expect(await screen.findByRole('region', { name: 'Before you take it down' })).toBe(screen.getByTestId('takedown-script'));
    expect(screen.getByRole('region', { name: 'Decide the request' })).toBe(screen.getByTestId('takedown-decide'));
  });
});

describe('RR2 — the call-back attestation belongs to the nominee and the version it was ticked for', () => {
  const NEW_VERSION = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

  it('⭐ a record refused with `shown_changed` leaves the NEW form unticked — one click cannot attest a call that was never made to the new nominee', async () => {
    const served = serve(drive({ requests: [] }));
    vi.mocked(api.recordMemorialTakedownRequest).mockImplementation(async () => {
      // While the operator was on the call another version was approved, under a different nominee.
      served.set(
        drive({
          requests: [],
          shown: { ...drive().shown!, submissionId: NEW_VERSION },
          nomineeToCallBack: { name: 'Bela Devi', mobile: '+919000000000' },
        }),
      );
      throw new ApiError(409, 'memorial_takedown.shown_changed', 'x');
    });
    renderWithClient(<MemorialTakedownDrivePage pariwarId={PARIWAR} poolId={POOL} />);
    const form = await screen.findByTestId('takedown-record');
    fireEvent.click(within(form).getByRole('checkbox'));
    fireEvent.click(within(form).getByRole('button', { name: 'Record the request' }));

    await waitFor(() => expect(screen.getByTestId('takedown-call-back')).toHaveTextContent('Bela Devi'));
    const after = screen.getByTestId('takedown-record');
    expect(within(after).getByRole('alert')).toHaveTextContent('changed while you were on the call');
    expect(within(after).getByRole('checkbox')).not.toBeChecked();
    expect(within(after).getByRole('button', { name: 'Record the request' })).toBeDisabled();
    // Not even a forced submit records anything for the new nominee… (flushed first: `mutate` reaches `mutationFn` a microtask
    // later, so an unflushed count would read 1 whether or not the submit called it — review RS5)
    await act(async () => {
      fireEvent.submit(after);
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(api.recordMemorialTakedownRequest).toHaveBeenCalledTimes(1);
    // …and ticking it again is a NEW attestation, for the version and the number now on screen.
    fireEvent.click(within(after).getByRole('checkbox'));
    vi.mocked(api.recordMemorialTakedownRequest).mockResolvedValue({ requestId: REQ, poolId: POOL, dueAt: '2026-11-02T10:00:00.000Z' });
    fireEvent.click(within(after).getByRole('button', { name: 'Record the request' }));
    await waitFor(() => expect(api.recordMemorialTakedownRequest).toHaveBeenCalledTimes(2));
    expect(vi.mocked(api.recordMemorialTakedownRequest).mock.calls[1]![2]).toMatchObject({ calledBack: true, shownSubmissionId: NEW_VERSION });
  });

  it('control: a refusal that leaves the SAME nominee and version (a server error) keeps the tick, so a retry of the same attempt still works', async () => {
    serve(drive({ requests: [] }));
    vi.mocked(api.recordMemorialTakedownRequest).mockRejectedValueOnce(new ApiError(500, 'internal_error', 'x'));
    renderWithClient(<MemorialTakedownDrivePage pariwarId={PARIWAR} poolId={POOL} />);
    const form = await screen.findByTestId('takedown-record');
    fireEvent.click(within(form).getByRole('checkbox'));
    fireEvent.click(within(form).getByRole('button', { name: 'Record the request' }));
    expect(await within(form).findByRole('alert')).toHaveTextContent('Could not record this');
    await waitFor(() => expect(api.getMemorialTakedownDrive).toHaveBeenCalledTimes(2));
    await act(async () => {
      await vi.mocked(api.getMemorialTakedownDrive).mock.results[1]!.value; // …and has LANDED, not merely started (review RS5)
    });
    expect(within(screen.getByTestId('takedown-record')).getByRole('checkbox')).toBeChecked();
    expect(within(screen.getByTestId('takedown-record')).getByRole('button', { name: 'Record the request' })).toBeEnabled();
  });
});

describe('RR5 — nothing of a spent step-up, or of the last decision, announces or prefills what comes next', () => {
  it('a take-down that asks AGAIN after a verified code does not say "Code sent", and the spent code is not left in the box', async () => {
    serve(drive());
    let refusals = 2;
    vi.mocked(api.decideMemorialTakedown).mockImplementation(async () => {
      if (refusals > 0) {
        refusals -= 1;
        throw new ApiError(403, 'auth.step_up_required', 'x');
      }
      return { requestId: REQ, outcome: 'taken_down', decidedAt: '2026-10-27T09:00:00.000Z' };
    });
    vi.mocked(api.requestMemorialTakedownStepUp).mockResolvedValue({ sent: true, expiresInSeconds: 300 });
    vi.mocked(api.verifyStepUp).mockResolvedValue({ elevated: true, elevatedUntil: '2026-10-27T09:10:00.000Z' });
    renderWithClient(<MemorialTakedownDrivePage pariwarId={PARIWAR} poolId={POOL} />);
    fireEvent.click(await screen.findByTestId('takedown-take-down'));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm: take it down' }));
    const first = await screen.findByTestId('takedown-step-up');
    fireEvent.click(within(first).getByRole('button', { name: 'Send me a code' }));
    await waitFor(() => expect(statusText()).toBe('Code sent. Enter it below.'));
    fireEvent.change(within(first).getByLabelText('Code'), { target: { value: '123456' } });
    fireEvent.click(within(first).getByRole('button', { name: 'Verify' }));

    // The elevation lapsed again: the retry is refused, the prompt comes back — for a code nobody has sent yet.
    await waitFor(() => {
      expect(api.decideMemorialTakedown).toHaveBeenCalledTimes(2);
      expect(within(screen.getByTestId('takedown-step-up')).getByLabelText('Code')).toHaveValue('');
      expect(statusText()).toBe('');
    });
  });

  it('a record that FAILS after a decision does not leave that decision\'s "Recorded." standing as the status', async () => {
    const served = serve(drive());
    vi.mocked(api.decideMemorialTakedown).mockImplementation(async () => {
      served.set(drive({ requests: [request({ outcome: decidedAs('kept') })] }));
      return { requestId: REQ, outcome: 'kept', decidedAt: '2026-10-27T09:00:00.000Z' };
    });
    vi.mocked(api.recordMemorialTakedownRequest).mockRejectedValue(new ApiError(500, 'internal_error', 'x'));
    renderWithClient(<MemorialTakedownDrivePage pariwarId={PARIWAR} poolId={POOL} />);
    fireEvent.click(await screen.findByRole('button', { name: 'The nominee chose to keep it' }));
    await waitFor(() => expect(statusText()).toBe('Recorded.'));

    const form = await screen.findByTestId('takedown-record');
    fireEvent.click(within(form).getByRole('checkbox'));
    fireEvent.click(within(form).getByRole('button', { name: 'Record the request' }));
    expect(await within(form).findByRole('alert')).toHaveTextContent('Could not record this');
    expect(statusText()).toBe('');
  });
});

describe('RR8 — a "not readable" nominee has a way back that is the operator\'s own click', () => {
  it('"Try again" reads the drive once more; when the number can now be read the form appears', async () => {
    const served = serve(drive({ requests: [], nomineeToCallBack: { name: 'Asha Devi', mobile: null } }));
    renderWithClient(<MemorialTakedownDrivePage pariwarId={PARIWAR} poolId={POOL} />);
    const unavailable = await screen.findByTestId('takedown-record-unavailable');
    expect(screen.queryByTestId('takedown-record')).toBeNull();
    expect(api.getMemorialTakedownDrive).toHaveBeenCalledTimes(1);

    served.set(drive({ requests: [] })); // the decrypt works this time
    fireEvent.click(within(unavailable).getByRole('button', { name: 'Try again' }));
    expect(await screen.findByTestId('takedown-record')).toBeInTheDocument();
    expect(api.getMemorialTakedownDrive).toHaveBeenCalledTimes(2);
    expect(screen.queryByTestId('takedown-record-unavailable')).toBeNull();
  });
});

describe('RR9 — a decrypted name is substituted literally, never as a replacement pattern', () => {
  it('`$&`, `$\'` and a backtick pattern in the name come out as typed', () => {
    const name = "A $& B $' C $` D";
    expect(operatorScript(drive({ currentNominee: { name, isNomineeToCallBack: false } })).at(-1)).toBe(
      `A new version is sent by the current nominee, ${name}, who is not the person who asked.`,
    );
  });
});

/** A page on a client of its own, so a test can force the refetch a write would cause. */
function renderPage() {
  const client = createQueryClient();
  const utils = render(
    <QueryClientProvider client={client}>
      <MemorialTakedownDrivePage pariwarId={PARIWAR} poolId={POOL} />
    </QueryClientProvider>,
  );
  const refetch = () => act(async () => void (await client.invalidateQueries({ queryKey: memorialTakedownDriveKey(PARIWAR, POOL) })));
  return { client, refetch, ...utils };
}

const NEW_VERSION = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const bela = (): MemorialTakedownDriveResponse =>
  drive({ requests: [], shown: { ...drive().shown!, submissionId: NEW_VERSION }, nomineeToCallBack: { name: 'Bela Devi', mobile: '+919000000000' } });
const recordBox = (): HTMLElement => within(screen.getByTestId('takedown-record')).getByRole('checkbox');

describe('RS1 — the form\'s per-attempt state belongs to one scope (version, number, request count)', () => {
  it('(a) swap and swap-back: a tick made for A does not come back when A is shown again', async () => {
    const served = serve(drive({ requests: [] }));
    const { refetch } = renderPage();
    await screen.findByTestId('takedown-record');
    fireEvent.click(recordBox());
    expect(recordBox()).toBeChecked();

    served.set(bela());
    await refetch();
    await waitFor(() => expect(screen.getByTestId('takedown-call-back')).toHaveTextContent('Bela Devi'));
    expect(recordBox()).not.toBeChecked();

    served.set(drive({ requests: [] })); // back to the first nominee and version
    await refetch();
    await waitFor(() => expect(screen.getByTestId('takedown-call-back')).toHaveTextContent('Asha Devi'));
    expect(recordBox()).not.toBeChecked();
  });

  it('(b) an open request appears and is decided ELSEWHERE: the form returns UNTICKED, with no stale refusal', async () => {
    const served = serve(drive({ requests: [] }));
    vi.mocked(api.recordMemorialTakedownRequest).mockImplementation(async () => {
      served.set(drive({ requests: [request()] })); // another session recorded one first
      throw new ApiError(409, 'memorial_takedown.request_open', 'x');
    });
    const { refetch } = renderPage();
    const form = await screen.findByTestId('takedown-record');
    fireEvent.click(within(form).getByRole('checkbox'));
    fireEvent.click(within(form).getByRole('button', { name: 'Record the request' }));
    await screen.findByTestId('takedown-decide'); // the open request is on screen; the form has gone

    // Decided in another session — THIS page never ran a decision, so only the scope change can clear the old refusal and the tick.
    served.set(drive({ requests: [request({ outcome: decidedAs('kept') })] }));
    await refetch();
    await waitFor(() => expect(screen.getByTestId('takedown-record')).toBeInTheDocument());
    expect(recordBox()).not.toBeChecked();
    expect(within(screen.getByTestId('takedown-record')).queryByRole('alert')).toBeNull();
  });

  it('(c) a record whose answer was LOST (it committed) leaves no key behind: the next call-back gets a new Idempotency-Key', async () => {
    const served = serve(drive({ requests: [] }));
    vi.mocked(api.recordMemorialTakedownRequest).mockImplementationOnce(async () => {
      served.set(drive({ requests: [request()] })); // it committed…
      throw new ApiError(500, 'internal_error', 'x'); // …but the answer never arrived
    });
    vi.mocked(api.decideMemorialTakedown).mockImplementation(async () => {
      served.set(drive({ requests: [request({ outcome: decidedAs('kept') })] }));
      return { requestId: REQ, outcome: 'kept', decidedAt: '2026-10-27T09:00:00.000Z' };
    });
    renderPage();
    let form = await screen.findByTestId('takedown-record');
    fireEvent.click(within(form).getByRole('checkbox'));
    fireEvent.click(within(form).getByRole('button', { name: 'Record the request' }));
    fireEvent.click(await screen.findByRole('button', { name: 'The nominee chose to keep it' }));

    // A NEW call-back, to the same nominee, after that request was closed.
    vi.mocked(api.recordMemorialTakedownRequest).mockResolvedValue({ requestId: REQ, poolId: POOL, dueAt: '2026-11-02T10:00:00.000Z' });
    form = await screen.findByTestId('takedown-record');
    fireEvent.click(within(form).getByRole('checkbox'));
    fireEvent.click(within(form).getByRole('button', { name: 'Record the request' }));
    await waitFor(() => expect(api.recordMemorialTakedownRequest).toHaveBeenCalledTimes(2));
    const [first, second] = recordedKeys();
    expect(first).toBeTruthy();
    expect(second).toBeTruthy();
    expect(second).not.toBe(first);
  });

  it('(d) the first-contact time — where the 7-day clock starts — does not survive a change of nominee', async () => {
    const served = serve(drive({ requests: [] }));
    const { refetch } = renderPage();
    const form = await screen.findByTestId('takedown-record');
    fireEvent.change(within(form).getByLabelText(/When the nominee first asked/), { target: { value: '2020-01-02T03:04' } });
    expect(within(form).getByLabelText(/When the nominee first asked/)).toHaveValue('2020-01-02T03:04');

    served.set(bela());
    await refetch();
    await waitFor(() => expect(screen.getByTestId('takedown-call-back')).toHaveTextContent('Bela Devi'));
    expect(within(screen.getByTestId('takedown-record')).getByLabelText(/When the nominee first asked/)).not.toHaveValue('2020-01-02T03:04');
  });
});

describe('RS2 — every decide attempt starts from a clean step-up, status and confirm state', () => {
  /** An open request whose take-down is refused for a verification until `verifyStepUp` lands; kept / superseded never are. */
  function stepUpWorld() {
    const served = serve(drive());
    vi.mocked(api.decideMemorialTakedown).mockImplementation(async (_p, _r, body) => {
      if (body.outcome === 'taken_down') throw new ApiError(403, 'auth.step_up_required', 'x');
      return { requestId: REQ, outcome: body.outcome, decidedAt: '2026-10-27T09:00:00.000Z' };
    });
    vi.mocked(api.requestMemorialTakedownStepUp).mockResolvedValue({ sent: true, expiresInSeconds: 300 });
    return served;
  }
  async function askForTakeDown(): Promise<HTMLElement> {
    fireEvent.click(await screen.findByTestId('takedown-take-down'));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm: take it down' }));
    return screen.findByTestId('takedown-step-up');
  }

  it('(a) a step-up left unverified does not announce "Code sent", or keep its code, for the NEXT prompt', async () => {
    stepUpWorld();
    renderPage();
    const first = await askForTakeDown();
    fireEvent.click(within(first).getByRole('button', { name: 'Send me a code' }));
    await waitFor(() => expect(statusText()).toBe('Code sent. Enter it below.'));
    fireEvent.change(within(first).getByLabelText('Code'), { target: { value: '111111' } });

    fireEvent.click(screen.getByRole('button', { name: 'The nominee chose to keep it' })); // the operator changes their mind
    await waitFor(() => expect(screen.queryByTestId('takedown-step-up')).toBeNull());

    const second = await askForTakeDown(); // …and later a take-down asks again
    expect(within(second).getByLabelText('Code')).toHaveValue('');
    expect(statusText()).toBe('');
  });

  it('(b) a wrong code\'s alert is cleared when a new code is requested', async () => {
    stepUpWorld();
    vi.mocked(api.verifyStepUp).mockRejectedValue(new ApiError(401, 'auth.step_up_invalid', 'x'));
    renderPage();
    const prompt = await askForTakeDown();
    fireEvent.change(within(prompt).getByLabelText('Code'), { target: { value: '000000' } });
    fireEvent.click(within(prompt).getByRole('button', { name: 'Verify' }));
    expect(await screen.findByText('Could not verify that code. Check it, or send a new code, and try again.')).toBeInTheDocument();

    fireEvent.click(within(prompt).getByRole('button', { name: 'Send me a code' }));
    await waitFor(() => expect(screen.queryByText('Could not verify that code. Check it, or send a new code, and try again.')).toBeNull());
  });

  it('(c) "Request recorded." does not stand beside a decision that is pending or has failed', async () => {
    const served = serve(drive({ requests: [] }));
    vi.mocked(api.recordMemorialTakedownRequest).mockImplementation(async () => {
      served.set(drive({ requests: [request()] }));
      return { requestId: REQ, poolId: POOL, dueAt: '2026-11-02T10:00:00.000Z' };
    });
    vi.mocked(api.decideMemorialTakedown).mockRejectedValue(new ApiError(500, 'internal_error', 'x'));
    renderPage();
    const form = await screen.findByTestId('takedown-record');
    fireEvent.click(within(form).getByRole('checkbox'));
    fireEvent.click(within(form).getByRole('button', { name: 'Record the request' }));
    await waitFor(() => expect(statusText()).toBe('Request recorded.'));

    fireEvent.click(await screen.findByRole('button', { name: 'The nominee chose to keep it' }));
    expect(await screen.findByText('Could not record this. Please reload and try again.')).toBeInTheDocument();
    expect(statusText()).toBe('');
  });

  it.each([
    ['kept', async () => fireEvent.click(await screen.findByRole('button', { name: 'The nominee chose to keep it' }))],
    ['a successful take-down', async () => fireEvent.click(screen.getByRole('button', { name: 'Confirm: take it down' }))],
  ] as const)('(d) "Confirm: take it down" is not left armed for the NEXT request after %s', async (_how, decideBy) => {
    const NEXT = '99999999-9999-4999-8999-999999999999';
    const served = serve(drive());
    vi.mocked(api.decideMemorialTakedown).mockImplementation(async (_p, _r, body) => {
      served.set(drive({ requests: [request({ outcome: decidedAs(body.outcome) })] }));
      return { requestId: REQ, outcome: body.outcome, decidedAt: '2026-10-27T09:00:00.000Z' };
    });
    vi.mocked(api.recordMemorialTakedownRequest).mockImplementation(async () => {
      served.set(drive({ requests: [request({ outcome: decidedAs('kept') }), request({ requestId: NEXT })] }));
      return { requestId: NEXT, poolId: POOL, dueAt: '2026-11-02T10:00:00.000Z' };
    });
    renderPage();
    fireEvent.click(await screen.findByTestId('takedown-take-down')); // the operator arms it…
    expect(screen.getByTestId('takedown-confirm')).toBeInTheDocument();
    await decideBy();

    const form = await screen.findByTestId('takedown-record'); // …the request ends, and a new call-back is recorded
    fireEvent.click(within(form).getByRole('checkbox'));
    fireEvent.click(within(form).getByRole('button', { name: 'Record the request' }));
    expect(await screen.findByTestId('takedown-take-down')).toBeInTheDocument();
    expect(screen.queryByTestId('takedown-confirm')).toBeNull();
  });
});

describe('RS3 — "Try again" cannot make the page worse, and is offered only where it can help', () => {
  it('(a) a retry that FAILS keeps the page, its button and an alert — ⛔ not a dead-end page', async () => {
    serve(drive({ requests: [], nomineeToCallBack: { name: 'Asha Devi', mobile: null } }));
    renderPage();
    const unavailable = await screen.findByTestId('takedown-record-unavailable');
    vi.mocked(api.getMemorialTakedownDrive).mockRejectedValueOnce(new ApiError(500, 'internal_error', 'x'));
    fireEvent.click(within(unavailable).getByRole('button', { name: 'Try again' }));

    expect(await screen.findByTestId('takedown-refresh-error')).toHaveTextContent('Could not load this drive. Please reload.');
    expect(screen.getByTestId('takedown-record-unavailable')).toBeInTheDocument();
    expect(within(screen.getByTestId('takedown-record-unavailable')).getByRole('button', { name: 'Try again' })).toBeEnabled();
  });

  it('(b) no nominee on record: the panel says so and offers no retry that could never succeed', async () => {
    serve(drive({ requests: [], nomineeToCallBack: null }));
    renderPage();
    const unavailable = await screen.findByTestId('takedown-record-unavailable');
    expect(unavailable).toHaveTextContent('Not readable just now');
    expect(within(unavailable).queryByRole('button', { name: 'Try again' })).toBeNull();
  });
});
