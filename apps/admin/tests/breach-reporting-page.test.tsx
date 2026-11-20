// The breach register's admin pages (Story 14.3, AC12 / AC9 / AC10 / AC11; decision `2026-11-20-467`).
// The api-client module is mocked with a small in-memory register whose views come from the REAL `deriveBreachIncidentView`, so
// the hooks, the forms' contract validation, the IST conversion, the derivation and the drafts are all the shipped code.

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  BREACH_REHEARSAL_BANNER,
  deriveBreachIncidentView,
  type BreachEntry,
  type BreachIncident,
  type BreachMembersOnRecordResponse,
  type BreachSignalListResponse,
} from '@twt/contracts';

import { BreachDetailPage } from '../src/modules/breach-reporting/BreachDetailPage.js';
import { BreachGateView } from '../src/modules/breach-reporting/BreachGateView.js';
import { BreachListPage } from '../src/modules/breach-reporting/BreachListPage.js';
import { renderWithClient } from './_helpers.js';

const HOUR = 60 * 60 * 1000;
const iso = (ms: number) => new Date(ms).toISOString();

interface Call {
  fn: string;
  body?: unknown;
  key?: string;
  id?: string;
}

const h = vi.hoisted(() => ({
  incidents: new Map<string, { incident: unknown; entries: unknown[] }>(),
  signals: [] as unknown[],
  members: null as unknown,
  calls: [] as { fn: string; body?: unknown; key?: string; id?: string }[],
  /** Errors to throw from the next write, in order: `{ status, code }`. */
  failNext: [] as { status: number; code: string }[],
  navigate: vi.fn(),
  seq: 0,
}));

vi.mock('@tanstack/react-router', () => ({
  Link: (p: { children: ReactNode; to: string; params?: Record<string, string>; 'data-testid'?: string; className?: string }) => (
    <a href={Object.entries(p.params ?? {}).reduce((to, [k, v]) => to.replace(`$${k}`, v), p.to)} data-testid={p['data-testid']}>
      {p.children}
    </a>
  ),
  useNavigate: () => h.navigate,
  useParams: () => ({}),
}));

vi.mock('../src/api/client.js', async () => {
  const contracts = await import('@twt/contracts');
  class ApiError extends Error {
    public constructor(
      public readonly status: number,
      public readonly code: string,
      message: string,
      public readonly details?: unknown,
    ) {
      super(message);
      this.name = 'ApiError';
    }
    public get isUnauthorized(): boolean {
      return this.status === 401;
    }
    public get isForbidden(): boolean {
      return this.status === 403;
    }
  }
  const detailOf = (id: string) => {
    const found = h.incidents.get(id);
    if (!found) throw new ApiError(404, 'breach.incident_not_found', 'No such breach incident');
    const incident = found.incident as BreachIncident;
    const entries = found.entries as BreachEntry[];
    return { incident, entries, view: contracts.deriveBreachIncidentView(incident, entries, new Date()) };
  };
  const failIfAsked = () => {
    const f = h.failNext.shift();
    if (f) throw new ApiError(f.status, f.code, f.code);
  };
  return {
    ApiError,
    listBreachIncidents: vi.fn(async () => {
      h.calls.push({ fn: 'list' });
      const items = [...h.incidents.keys()].reverse().map((id) => {
        const d = detailOf(id);
        const { incident, view } = d;
        return {
          incidentId: incident.incidentId,
          title: incident.title,
          isRehearsal: incident.isRehearsal,
          openedAt: incident.openedAt,
          becameAwareAt: incident.becameAwareAt,
          detectionSource: incident.detectionSource,
          status: view.status,
          boardReportDueAt: view.boardReportDueAt,
          boardReportOverdue: view.boardReportOverdue,
          principalsNoticeRecorded: view.principalsNoticeRecorded,
          boardInitialRecorded: view.boardInitialRecorded,
          boardReportRecorded: view.boardReportRecorded,
          signoffRecorded: view.signoffRecorded,
        };
      });
      return { items };
    }),
    openBreachIncident: vi.fn(async (body: Record<string, unknown>, key: string) => {
      h.calls.push({ fn: 'open', body, key });
      failIfAsked();
      h.seq += 1;
      const incidentId = `00000000-0000-4000-8000-${String(h.seq).padStart(12, '0')}`;
      const incident = { incidentId, isRehearsal: body['isRehearsal'], title: body['title'], becameAwareAt: body['becameAwareAt'], openedAt: new Date().toISOString(), detectionSource: body['detectionSource'], detectionSignalRef: body['detectionSignalRef'] ?? null, openedByDisplay: 'Asha Verma' };
      h.incidents.set(incidentId, { incident, entries: [] });
      for (const s of h.signals as { checkId: string; incidentIds: string[] }[]) if (s.checkId === body['detectionSignalRef']) s.incidentIds.push(incidentId);
      return detailOf(incidentId);
    }),
    getBreachIncident: vi.fn(async (id: string) => {
      h.calls.push({ fn: 'detail', id });
      return detailOf(id);
    }),
    appendBreachEntry: vi.fn(async (id: string, body: { kind: string; payload: unknown }, key: string) => {
      h.calls.push({ fn: 'append', id, body, key });
      failIfAsked();
      h.seq += 1;
      h.incidents.get(id)!.entries.push({ entryId: `10000000-0000-4000-8000-${String(h.seq).padStart(12, '0')}`, entrySeq: String(h.seq), kind: body.kind, payload: body.payload, recordedAt: new Date().toISOString(), recordedByDisplay: 'Asha Verma' });
      return detailOf(id);
    }),
    listBreachSignals: vi.fn(async () => {
      h.calls.push({ fn: 'signals' });
      return { items: h.signals };
    }),
    getBreachMembersOnRecord: vi.fn(async () => h.members),
    getSession: vi.fn(),
  };
});

const calls = (fn: string): Call[] => h.calls.filter((c) => c.fn === fn);

function seedIncident(over: Partial<BreachIncident> = {}, entries: BreachEntry[] = []): string {
  h.seq += 1;
  const incidentId = `00000000-0000-4000-8000-${String(h.seq).padStart(12, '0')}`;
  const incident: BreachIncident = {
    incidentId,
    isRehearsal: false,
    title: 'A wrong-address email',
    becameAwareAt: iso(Date.now() - 2 * HOUR),
    openedAt: iso(Date.now() - HOUR),
    detectionSource: 'external_report',
    detectionSignalRef: null,
    openedByDisplay: 'Asha Verma',
    ...over,
  };
  h.incidents.set(incidentId, { incident, entries });
  return incidentId;
}

function entry(kind: BreachEntry['kind'], payload: Record<string, unknown>): BreachEntry {
  h.seq += 1;
  return { entryId: `10000000-0000-4000-8000-${String(h.seq).padStart(12, '0')}`, entrySeq: String(h.seq), kind, payload, recordedAt: iso(Date.now() - HOUR), recordedByDisplay: 'Asha Verma' } as BreachEntry;
}

const ASSESSMENT = {
  nature: 'A spreadsheet went to a wrong address.',
  extent: 'One Pariwar.',
  location: 'Staff email.',
  dataCategories: ['identity', 'contact'],
  estimatedAffected: { count: 40 },
  affectedPariwarIds: [],
  likelyConsequences: 'Unwanted calls.',
  safetyMeasuresForPrincipals: 'Share no code with a caller.',
  contactForPrincipals: 'The helpline.',
};

beforeEach(() => {
  h.incidents.clear();
  h.signals = [];
  h.members = { asOf: iso(Date.now()), pariwarCount: 3, total: 1200, byState: { 'pending-kyc': 5, 'pending-fee': 4, 'pending-valid': 3, 'lock-in': 1000, active: 150, 'active-in-grace': 20, 'lapsed-unpaid': 10, withdrawn: 8, anonymized: 7 } } satisfies BreachMembersOnRecordResponse;
  h.calls = [];
  h.failNext = [];
  h.seq = 0;
  h.navigate.mockReset();
});

describe('BreachGateView — the advisory gate (AC12)', () => {
  const page = <p data-testid="inside">the register</p>;
  it('shows the page only with `breach.manage`; another national grant is not enough', () => {
    const { rerender } = render(<BreachGateView status="success" grants={['breach.manage']}>{page}</BreachGateView>);
    expect(screen.getByTestId('inside')).toBeInTheDocument();
    for (const grants of [[], ['audit.verify', 'pariwar.provision'], undefined]) {
      rerender(<BreachGateView status="success" grants={grants}>{page}</BreachGateView>);
      expect(screen.queryByTestId('inside')).not.toBeInTheDocument();
      expect(screen.getByTestId('breach-access-denied')).toHaveTextContent('breach.manage');
    }
  });
  it('renders neither the page nor the denial while the session loads or has failed', () => {
    const { rerender } = render(<BreachGateView status="loading" grants={undefined}>{page}</BreachGateView>);
    expect(screen.getByRole('status')).toHaveTextContent('Checking your session');
    rerender(<BreachGateView status="error" grants={['breach.manage']}>{page}</BreachGateView>);
    expect(screen.getByRole('status')).toHaveTextContent('Redirecting to sign in');
    expect(screen.queryByTestId('inside')).not.toBeInTheDocument();
    expect(screen.queryByTestId('breach-access-denied')).not.toBeInTheDocument();
  });
});

describe('BreachListPage — open, signals, the list, the monthly review', () => {
  it('⭐ opens an incident: the IST time becomes an instant, ONE Idempotency-Key, then it goes to the detail page and refreshes the list and the signals', async () => {
    const user = userEvent.setup();
    renderWithClient(<BreachListPage />);
    await screen.findByTestId('breach-signals-none');
    const before = { list: calls('list').length, signals: calls('signals').length };

    await user.click(screen.getByTestId('breach-open-rehearsal'));
    await user.type(screen.getByTestId('breach-open-title'), 'Table-top November');
    fireEvent.change(screen.getByTestId('breach-open-aware'), { target: { value: '2026-11-19T12:00' } });
    await user.selectOptions(screen.getByTestId('breach-open-source'), 'external_report');
    await user.click(screen.getByTestId('breach-open-submit'));

    await waitFor(() => expect(h.navigate).toHaveBeenCalledTimes(1));
    const [open] = calls('open');
    // 12:00 IST is 06:30 UTC — whatever zone this test runs in.
    expect(open!.body).toEqual({ isRehearsal: true, title: 'Table-top November', becameAwareAt: '2026-11-19T06:30:00.000Z', detectionSource: 'external_report' });
    expect(open!.key).toMatch(/\S+/);
    const incidentId = [...h.incidents.keys()][0]!;
    expect(h.navigate).toHaveBeenCalledWith({ to: '/data-protection/breaches/$incidentId', params: { incidentId } });
    await waitFor(() => {
      expect(calls('list').length).toBeGreaterThan(before.list);
      expect(calls('signals').length).toBeGreaterThan(before.signals);
    });
  });

  it('the form refuses a blank title and a missing or future time WITHOUT calling the server', async () => {
    const user = userEvent.setup();
    renderWithClient(<BreachListPage />);
    await user.click(screen.getByTestId('breach-open-submit'));
    expect(await screen.findAllByRole('alert')).not.toHaveLength(0);
    expect(screen.getByText('Enter a date and time.')).toBeInTheDocument();
    await user.type(screen.getByTestId('breach-open-title'), 'x');
    fireEvent.change(screen.getByTestId('breach-open-aware'), { target: { value: '2999-01-01T10:00' } });
    await user.click(screen.getByTestId('breach-open-submit'));
    expect(await screen.findByText('This cannot be in the future.')).toBeInTheDocument();
    expect(calls('open')).toEqual([]);
  });

  it('⭐ a retry of the SAME attempt carries the SAME key; a 409 `admin.display_name_missing` reads "set your display name first"; an edited body gets a NEW key', async () => {
    const user = userEvent.setup();
    renderWithClient(<BreachListPage />);
    await user.type(screen.getByTestId('breach-open-title'), 'Retry me');
    fireEvent.change(screen.getByTestId('breach-open-aware'), { target: { value: '2026-11-19T12:00' } });

    h.failNext.push({ status: 409, code: 'admin.display_name_missing' }, { status: 503, code: 'idempotency.record_failed' });
    await user.click(screen.getByTestId('breach-open-submit'));
    expect(await screen.findByTestId('breach-open-error')).toHaveTextContent('Set your display name first');
    await user.click(screen.getByTestId('breach-open-submit'));
    await waitFor(() => expect(screen.getByTestId('breach-open-error')).toHaveTextContent('it will not be recorded twice'));
    await user.click(screen.getByTestId('breach-open-submit'));
    await waitFor(() => expect(h.navigate).toHaveBeenCalledTimes(1));
    const keys = calls('open').map((c) => c.key);
    expect(keys).toHaveLength(3);
    expect(new Set(keys).size).toBe(1);

    // A different body is a different attempt.
    await user.clear(screen.getByTestId('breach-open-title'));
    await user.type(screen.getByTestId('breach-open-title'), 'Another incident');
    await user.click(screen.getByTestId('breach-open-submit'));
    await waitFor(() => expect(calls('open')).toHaveLength(4));
    expect(calls('open')[3]!.key).not.toBe(keys[0]);
  });

  it('⭐ a signal offers "Open an incident from this" and fills the source, the reference and the awareness time; once an incident exists it shows "Incident opened" + a link INSTEAD', async () => {
    const user = userEvent.setup();
    const checkId = '22222222-2222-4222-8222-222222222222';
    h.signals = [{ checkId, verifiedAt: '2026-11-19T06:30:00.000Z', firstBrokenSeq: '7', rowsVerified: 6, triggerSource: 'cron', incidentIds: [] }] satisfies BreachSignalListResponse['items'];
    renderWithClient(<BreachListPage />);

    await user.click(await screen.findByTestId(`breach-signal-${checkId}-open`));
    expect(screen.getByTestId('breach-open-prefilled')).toBeInTheDocument();
    expect(screen.getByTestId('breach-open-source')).toHaveValue('audit_chain_break');
    expect(screen.getByTestId('breach-open-ref')).toHaveValue(checkId);
    expect(screen.getByTestId('breach-open-aware')).toHaveValue('2026-11-19T12:00');

    await user.type(screen.getByTestId('breach-open-title'), 'Chain break 19 Nov');
    await user.click(screen.getByTestId('breach-open-submit'));
    await waitFor(() => expect(h.navigate).toHaveBeenCalledTimes(1));
    expect(calls('open')[0]!.body).toEqual({ isRehearsal: false, title: 'Chain break 19 Nov', becameAwareAt: '2026-11-19T06:30:00.000Z', detectionSource: 'audit_chain_break', detectionSignalRef: checkId });

    const opened = await screen.findByTestId(`breach-signal-${checkId}-opened`);
    expect(opened).toHaveTextContent('Incident opened');
    expect(within(opened).getByRole('link')).toHaveAttribute('href', `/data-protection/breaches/${[...h.incidents.keys()][0]!}`);
    expect(screen.queryByTestId(`breach-signal-${checkId}-open`)).not.toBeInTheDocument();
  });

  it('the list shows the rehearsal and "Board report overdue" badges; the monthly review is labelled "Members on record" and shows no threshold', async () => {
    const overdue = seedIncident({ title: 'Late one', becameAwareAt: iso(Date.now() - 80 * HOUR), openedAt: iso(Date.now() - 79 * HOUR) });
    const rehearsal = seedIncident({ title: 'A rehearsal', isRehearsal: true });
    renderWithClient(<BreachListPage />);

    expect(await screen.findByTestId(`breach-incident-${overdue}-overdue`)).toHaveTextContent('Board report overdue');
    expect(screen.queryByTestId(`breach-incident-${overdue}-rehearsal`)).not.toBeInTheDocument();
    expect(screen.getByTestId(`breach-incident-${rehearsal}-rehearsal`)).toHaveTextContent('Rehearsal');
    expect(screen.queryByTestId(`breach-incident-${rehearsal}-overdue`)).not.toBeInTheDocument();
    expect(within(screen.getByTestId(`breach-incident-${rehearsal}`)).getByRole('link')).toHaveAttribute('href', `/data-protection/breaches/${rehearsal}`);

    const review = await screen.findByTestId('breach-monthly-review');
    await within(review).findByTestId('breach-members-on-record');
    expect(review).toHaveTextContent('Members on record');
    expect(within(review).getByTestId('breach-members-total')).toHaveTextContent('1200');
    expect(within(review).getByTestId('breach-members-pariwars')).toHaveTextContent('3');
    expect(within(review).getByTestId('breach-members-state-anonymized')).toHaveTextContent('anonymized: 7');
    expect(review).toHaveTextContent('not a threshold');
    expect(review.textContent).not.toMatch(/data principals/i);
    expect(document.body.textContent).not.toMatch(/urgent/i);
  });
});

describe('BreachDetailPage — the banner, the clock, the timeline, the forms, the drafts', () => {
  it('⭐ a REHEARSAL shows the banner and heads all three drafts; a real incident shows neither', async () => {
    const rehearsal = seedIncident({ isRehearsal: true }, [entry('assessment', ASSESSMENT)]);
    const { unmount } = renderWithClient(<BreachDetailPage incidentId={rehearsal} />);
    expect(await screen.findByTestId('breach-rehearsal-banner')).toHaveTextContent('REHEARSAL');
    for (const name of ['principalsNotice', 'boardInitial', 'boardReport']) {
      expect((screen.getByTestId(`breach-draft-${name}-text`) as HTMLTextAreaElement).value.split('\n')[0]).toBe(BREACH_REHEARSAL_BANNER);
    }
    unmount();

    const real = seedIncident({}, [entry('assessment', ASSESSMENT)]);
    renderWithClient(<BreachDetailPage incidentId={real} />);
    await screen.findByTestId('breach-detail-page');
    expect(screen.queryByTestId('breach-rehearsal-banner')).not.toBeInTheDocument();
    expect((screen.getByTestId('breach-draft-boardReport-text') as HTMLTextAreaElement).value).not.toContain('REHEARSAL');
  });

  it('⭐ the drafts are read-only with Copy, name what is missing, and ⛔ nothing on the page is a send control', async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
    const id = seedIncident({}, [entry('assessment', ASSESSMENT)]);
    renderWithClient(<BreachDetailPage incidentId={id} />);

    const notice = await screen.findByTestId('breach-draft-principalsNotice-text');
    expect(notice).toHaveAttribute('readonly');
    expect((notice as HTMLTextAreaElement).value).toContain('7(1)(b)');
    expect((notice as HTMLTextAreaElement).value).toContain('[TRUST LEGAL NAME]');
    expect(screen.getByTestId('breach-draft-principalsNotice-state')).toHaveTextContent('Missing: mitigation');
    expect(screen.getByTestId('breach-draft-boardInitial-state')).toHaveTextContent('Complete');
    expect(screen.getByTestId('breach-draft-boardReport')).toHaveAttribute('data-complete', 'false');

    await user.click(screen.getByTestId('breach-draft-boardInitial-copy'));
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText.mock.calls[0]![0]).toBe((screen.getByTestId('breach-draft-boardInitial-text') as HTMLTextAreaElement).value);
    expect(await screen.findByText('Copied')).toBeInTheDocument();

    for (const control of [...screen.getAllByRole('button'), ...screen.queryAllByRole('link')]) {
      expect(control.textContent ?? '', control.textContent ?? '').not.toMatch(/\bsend\b|\bnotify\b|\bdispatch\b|\bemail\b|\bsms\b/i);
    }
  });

  it('⭐ appends an entry through its kind\'s form: the contract shapes the payload, IST times become instants, the detail and the list refresh', async () => {
    const user = userEvent.setup();
    const id = seedIncident();
    renderWithClient(<BreachDetailPage incidentId={id} />);
    await screen.findByTestId('breach-record-entry');
    expect(screen.getByTestId('breach-pii-hint')).toHaveTextContent('never by name');
    const readsBefore = calls('detail').length;

    await user.selectOptions(screen.getByTestId('breach-entry-kind'), 'principals_notice_recorded');
    fireEvent.change(screen.getByTestId('breach-entry-sentAt'), { target: { value: '2026-11-19T15:00' } });
    await user.type(screen.getByTestId('breach-entry-channel'), 'Phone call from the helpline');
    await user.type(screen.getByTestId('breach-entry-reachedCount'), '38');
    await user.click(screen.getByTestId('breach-entry-submit'));

    await screen.findByTestId('breach-entry-saved');
    const [append] = calls('append');
    expect(append).toMatchObject({ id, body: { kind: 'principals_notice_recorded', payload: { sentAt: '2026-11-19T09:30:00.000Z', channel: 'Phone call from the helpline', reachedCount: 38, note: '' } } });
    await waitFor(() => expect(calls('detail').length).toBeGreaterThan(readsBefore));
    await waitFor(() => expect(screen.getByTestId('breach-flag-principals')).toHaveTextContent('Yes'));
    expect(screen.getByTestId('breach-timeline')).toHaveTextContent('Phone call from the helpline');
    expect((screen.getByTestId('breach-draft-boardReport-text') as HTMLTextAreaElement).value).toContain('Phone call from the helpline; reached 38');
  });

  it('an assessment with categories and an unknown count; then a sign-off needs two different names and says who signs', async () => {
    const user = userEvent.setup();
    const id = seedIncident();
    renderWithClient(<BreachDetailPage incidentId={id} />);
    await screen.findByTestId('breach-entry-form-assessment');
    await user.type(screen.getByTestId('breach-entry-nature'), 'A file went astray.');
    await user.click(screen.getByTestId('breach-entry-dataCategories-contact'));
    await user.click(screen.getByTestId('breach-entry-dataCategories-kyc'));
    await user.click(screen.getByTestId('breach-entry-estimatedAffected-unknown'));
    await user.click(screen.getByTestId('breach-entry-submit'));
    await waitFor(() => expect(calls('append')).toHaveLength(1));
    expect(calls('append')[0]!.body).toEqual({
      kind: 'assessment',
      payload: { nature: 'A file went astray.', extent: '', location: '', dataCategories: ['contact', 'kyc'], estimatedAffected: { unknown: true }, affectedPariwarIds: [], likelyConsequences: '', safetyMeasuresForPrincipals: '', contactForPrincipals: '' },
    });

    await user.selectOptions(screen.getByTestId('breach-entry-kind'), 'signoff_recorded');
    expect(screen.getByTestId('breach-entry-kind-note')).toHaveTextContent('Trustees do not sign in this app');
    expect(screen.getByRole('option', { name: 'Record that trustees signed' })).toBeInTheDocument();
    // Decision `2026-11-20-470`: the breach owner is a trustee and is not one of the two — the label says so (the app cannot check it).
    expect(screen.getByLabelText('Trustees who signed, one name per line (at least two, not counting the breach owner)')).toBe(screen.getByTestId('breach-entry-signers'));
    fireEvent.change(screen.getByTestId('breach-entry-signedOn'), { target: { value: '2026-01-05' } });
    await user.type(screen.getByTestId('breach-entry-signers'), 'Trustee One{enter}trustee  one');
    await user.click(screen.getByTestId('breach-entry-submit'));
    expect(await screen.findByText('Check this value.')).toBeInTheDocument();
    expect(calls('append')).toHaveLength(1);
    await user.clear(screen.getByTestId('breach-entry-signers'));
    await user.type(screen.getByTestId('breach-entry-signers'), 'Trustee One{enter}Trustee Two');
    await user.click(screen.getByTestId('breach-entry-submit'));
    await waitFor(() => expect(calls('append')).toHaveLength(2));
    expect(calls('append')[1]!.body).toEqual({ kind: 'signoff_recorded', payload: { signers: ['Trustee One', 'Trustee Two'], signedOn: '2026-01-05', note: '' } });
  });

  it('⭐ a 409 `breach.incident_closed` REFETCHES the incident: the closed state shows and the forms are gone; a closed incident opens with no form at all', async () => {
    const user = userEvent.setup();
    const id = seedIncident();
    renderWithClient(<BreachDetailPage incidentId={id} />);
    await screen.findByTestId('breach-record-entry');
    await user.selectOptions(screen.getByTestId('breach-entry-kind'), 'note');
    await user.type(screen.getByTestId('breach-entry-text'), 'One more thing');
    // Someone else closes it; this append then comes back 409.
    h.incidents.get(id)!.entries.push(entry('closed', { summary: 'Closed elsewhere.' }));
    h.failNext.push({ status: 409, code: 'breach.incident_closed' });
    const readsBefore = calls('detail').length;
    await user.click(screen.getByTestId('breach-entry-submit'));

    await waitFor(() => expect(calls('detail').length).toBeGreaterThan(readsBefore));
    expect(await screen.findByTestId('breach-closed-note')).toHaveTextContent('This incident is closed');
    expect(screen.queryByTestId('breach-record-entry')).not.toBeInTheDocument();
    expect(screen.getByTestId('breach-detail-status')).toHaveTextContent('Closed');
    expect(screen.getByTestId('breach-detail-page')).toHaveAttribute('data-status', 'closed');
    // The drafts stay readable after closing.
    expect(screen.getByTestId('breach-drafts')).toBeInTheDocument();
  });

  it('the clock shows IST times and "Board report overdue" only when it is; an unknown incident says so', async () => {
    const aware = Date.parse('2026-11-01T06:30:00.000Z');
    const late = seedIncident({ becameAwareAt: iso(aware), openedAt: iso(aware + HOUR) });
    const { unmount } = renderWithClient(<BreachDetailPage incidentId={late} />);
    expect(await screen.findByTestId('breach-clock-overdue')).toHaveTextContent('Board report overdue');
    expect(screen.getByTestId('breach-clock-aware')).toHaveTextContent(/1 Nov 2026, 12:00/);
    expect(screen.getByTestId('breach-clock-due')).toHaveTextContent(/4 Nov 2026, 12:00/);
    expect(screen.getByTestId('breach-clock-due').textContent).toBe(
      new Date(deriveBreachIncidentView({ isRehearsal: false, becameAwareAt: iso(aware) }, [], new Date()).boardReportDueAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }),
    );
    unmount();

    const fresh = seedIncident();
    const second = renderWithClient(<BreachDetailPage incidentId={fresh} />);
    await screen.findByTestId('breach-clock');
    expect(screen.queryByTestId('breach-clock-overdue')).not.toBeInTheDocument();
    second.unmount();

    renderWithClient(<BreachDetailPage incidentId="99999999-9999-4999-8999-999999999999" />);
    expect(await screen.findByTestId('breach-detail-error')).toHaveTextContent('No such incident');
  });
});
