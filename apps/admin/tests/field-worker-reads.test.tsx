// Story 13.1a code review round 2 (CR2, CR10, CR16 (c), (f)) — the identity panel (`WorkerDetail`) on its own:
//   · it reads the identity EXACTLY ONCE — also inside <StrictMode>, whose simulated unmount used to destroy the in-flight query
//     (the cleanup removed it) and make the remount read — and audit — a second time;
//   · Close removes the identity from the cache BY ITSELF: the client here has an infinite `gcTime`, so only the explicit removal
//     can empty the cache (a `gcTime: 0` client would pass without it);
//   · the term / description pairs are right (the state is a description of "Status", not a term), and the "Approved by" line
//     renders when the identity carries an approver (the finder opens it for an ACTIVE worker — `-448` — and its own test proves
//     that flow; this is the panel's unit proof).

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { StrictMode, useEffect, useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const navigate = vi.fn();
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }));

const getFieldWorkerIdentity = vi.fn();
vi.mock('../src/api/client.js', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, getFieldWorkerIdentity: (p: string, id: string) => getFieldWorkerIdentity(p, id) };
});

const { WorkerDetail } = await import('../src/modules/field-workers/index.js');
const { resolveEn: t } = await import('../src/modules/field-workers/i18n-en.js');

const P = '11111111-1111-4111-8111-111111111111';
const W = '00000000-0000-4000-8000-000000000001';
const identity = (over: Record<string, unknown> = {}) => ({
  field_worker_id: W,
  name: 'Ramesh Kumar',
  district: 'Patna',
  current_state: 'pending_kyc',
  kyc_status: 'pending',
  registered_by_display: 'Asha Verma',
  created_at: '2026-11-04T05:00:00.000Z',
  mobile: '+919876500010',
  approved_by_display: null,
  ...over,
});

/** A client that NEVER garbage-collects: only an explicit removal can empty its cache. */
const keepingClient = (): QueryClient => new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
const identityEntries = (qc: QueryClient) => qc.getQueryCache().findAll({ queryKey: ['field-workers', P, 'identity'] });

function Host({ onClosed }: { onClosed?: () => void }) {
  const [open, setOpen] = useState(true);
  return open ? (
    <WorkerDetail
      pariwarId={P}
      fieldWorkerId={W}
      onClose={() => {
        setOpen(false);
        onClosed?.();
      }}
    />
  ) : (
    <p data-testid="closed">closed</p>
  );
}

beforeEach(() => {
  getFieldWorkerIdentity.mockReset();
  navigate.mockReset();
  getFieldWorkerIdentity.mockResolvedValue(identity());
});

describe('CR2 — one click, one audited read', () => {
  it('rendering the panel inside <StrictMode> reads the identity EXACTLY ONCE', async () => {
    let mounts = 0;
    function Probe() {
      useEffect(() => {
        mounts += 1;
      }, []);
      return null;
    }
    const qc = keepingClient();
    render(
      <StrictMode>
        <QueryClientProvider client={qc}>
          <Probe />
          <WorkerDetail pariwarId={P} fieldWorkerId={W} onClose={() => undefined} />
        </QueryClientProvider>
      </StrictMode>,
    );
    await screen.findByTestId('fw-detail-mobile');
    expect(mounts).toBe(2); // NON-VACUITY: StrictMode really did mount, unmount and remount the effects
    expect(getFieldWorkerIdentity).toHaveBeenCalledTimes(1);
  });

  it('Close removes the identity from the cache even though the client would keep it for ever', async () => {
    const qc = keepingClient();
    const closed = vi.fn();
    render(
      <QueryClientProvider client={qc}>
        <Host onClosed={closed} />
      </QueryClientProvider>,
    );
    expect((await screen.findByTestId('fw-detail-mobile')).textContent).toBe('+919876500010');
    expect(identityEntries(qc)).toHaveLength(1); // NON-VACUITY: it is held while the panel is open
    fireEvent.click(screen.getByTestId('fw-detail-close'));
    await screen.findByTestId('closed');
    expect(closed).toHaveBeenCalledTimes(1);
    expect(identityEntries(qc)).toHaveLength(0);
    expect(JSON.stringify(qc.getQueryCache().getAll().map((q) => q.state.data))).not.toContain('+919876500010');
  });
});

describe('CR10 — what the panel says', () => {
  it('the heading takes focus when the panel opens', async () => {
    render(
      <QueryClientProvider client={keepingClient()}>
        <WorkerDetail pariwarId={P} fieldWorkerId={W} onClose={() => undefined} />
      </QueryClientProvider>,
    );
    await screen.findByTestId('fw-detail-mobile');
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: t('fw.detail.title') }));
  });

  it('every term has its own description: the STATE is the description of "Status", the registration of "Registration"', async () => {
    render(
      <QueryClientProvider client={keepingClient()}>
        <WorkerDetail pariwarId={P} fieldWorkerId={W} onClose={() => undefined} />
      </QueryClientProvider>,
    );
    await screen.findByTestId('fw-detail-mobile');
    const dl = screen.getByTestId('fw-detail').querySelector('dl')!;
    const pairs: [string, string][] = [];
    for (const dt of dl.querySelectorAll('dt')) {
      const dd = dt.nextElementSibling;
      expect(dd?.tagName, dt.textContent ?? '').toBe('DD'); // never a term followed by a term, or a description with no term
      pairs.push([dt.textContent ?? '', dd?.textContent ?? '']);
    }
    expect(dl.querySelectorAll('dd')).toHaveLength(pairs.length);
    expect(pairs).toEqual([
      [t('fw.register.name'), 'Ramesh Kumar'],
      [t('fw.detail.mobile'), '+919876500010'],
      [t('fw.district'), 'Patna'],
      [t('fw.detail.state'), t('fw.state.pending_kyc')],
      [t('fw.detail.registration'), `${t('fw.registeredBy', { name: 'Asha Verma' })} · ${t('fw.registeredOn', { date: '4 Nov 2026' })}`],
    ]);
  });
});

describe('CR16 (f) — the "Approved by" line', () => {
  it('renders when the identity carries an approver, as its own term / description pair', async () => {
    getFieldWorkerIdentity.mockResolvedValue(identity({ current_state: 'active', kyc_status: 'completed', approved_by_display: 'Meera Rao' }));
    render(
      <QueryClientProvider client={keepingClient()}>
        <WorkerDetail pariwarId={P} fieldWorkerId={W} onClose={() => undefined} />
      </QueryClientProvider>,
    );
    const line = await screen.findByTestId('fw-detail-approved-by');
    expect(line.textContent).toBe(t('fw.detail.approvedBy', { name: 'Meera Rao' }));
    expect(line.tagName).toBe('DD');
    expect(line.previousElementSibling?.textContent).toBe(t('fw.detail.approval'));
    expect(screen.getByText(t('fw.state.active'))).toBeTruthy();
  });

  it('is absent when there is no approver (NON-VACUITY for the line above)', async () => {
    render(
      <QueryClientProvider client={keepingClient()}>
        <WorkerDetail pariwarId={P} fieldWorkerId={W} onClose={() => undefined} />
      </QueryClientProvider>,
    );
    await screen.findByTestId('fw-detail-mobile');
    expect(screen.queryByTestId('fw-detail-approved-by')).toBeNull();
    expect(screen.queryByText(t('fw.detail.approval'))).toBeNull();
    await waitFor(() => expect(getFieldWorkerIdentity).toHaveBeenCalledTimes(1));
  });
});
