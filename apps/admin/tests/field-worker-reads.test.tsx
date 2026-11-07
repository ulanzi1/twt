// Story 13.1a code review round 2 (CR2, CR10, CR16 (c), (f)) — the identity panel (`WorkerDetail`) on its own:
//   · it reads the identity EXACTLY ONCE — also inside <StrictMode>, whose simulated unmount used to destroy the in-flight query
//     (the cleanup removed it) and make the remount read — and audit — a second time;
//   · Close removes the identity from the cache BY ITSELF, in the tick of the press: the hook's own `gcTime: 0` (review CR48) only
//     empties it a timer later, and that backstop has its own leg;
//   · the term / description pairs are right (the state is a description of "Status", not a term), and the "Approved by" line
//     renders when the identity carries an approver (the finder opens it for an ACTIVE worker — `-448` — and its own test proves
//     that flow; this is the panel's unit proof).

import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
const { ApiError } = await import('../src/api/client.js');

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
  code_sms_status: null,
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
    expect(identityEntries(qc)).toHaveLength(0); // same tick: the handler's removal, not the hook's `gcTime: 0` timer (review CR48)
    await screen.findByTestId('closed');
    expect(closed).toHaveBeenCalledTimes(1);
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

describe('Story 13.1b (AD12) — the code SMS pair', () => {
  it('⭐ renders as its own term / description pair, in the words of the status', async () => {
    getFieldWorkerIdentity.mockResolvedValue(identity({ current_state: 'active', kyc_status: 'completed', code_sms_status: 'not_confirmed' }));
    render(
      <QueryClientProvider client={keepingClient()}>
        <WorkerDetail pariwarId={P} fieldWorkerId={W} onClose={() => undefined} />
      </QueryClientProvider>,
    );
    const line = await screen.findByTestId('fw-detail-code-sms');
    expect(line.textContent).toBe(t('fw.codeSms.not_confirmed'));
    // Story 13.1c AD10 (a) — the by-hand advice holds only for an active worker, and says so.
    expect(line.textContent).toContain('if the worker is active, give the code by hand');
    expect(line.tagName).toBe('DD');
    expect(line.previousElementSibling?.textContent).toBe(t('fw.detail.codeSms'));
    expect(line.closest('[aria-live]')).toBeNull();
  });

  it('`null` renders neither the term nor the description', async () => {
    getFieldWorkerIdentity.mockResolvedValue(identity({ code_sms_status: null }));
    render(
      <QueryClientProvider client={keepingClient()}>
        <WorkerDetail pariwarId={P} fieldWorkerId={W} onClose={() => undefined} />
      </QueryClientProvider>,
    );
    await screen.findByTestId('fw-detail-mobile');
    expect(screen.queryByTestId('fw-detail-code-sms')).toBeNull();
    expect(screen.queryByText(t('fw.detail.codeSms'))).toBeNull();
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

describe('review round 3 — the fix diff', () => {
  const renderDetail = (qc: QueryClient = keepingClient()) => {
    render(
      <QueryClientProvider client={qc}>
        <WorkerDetail pariwarId={P} fieldWorkerId={W} onClose={() => undefined} />
      </QueryClientProvider>,
    );
    return qc;
  };

  it('CR39 — one status region, there from the start, says loading and then that the details have loaded', async () => {
    let resolve!: (v: ReturnType<typeof identity>) => void;
    getFieldWorkerIdentity.mockReturnValueOnce(new Promise((r) => (resolve = r)));
    renderDetail();
    const region = screen.getByTestId('fw-detail-status');
    expect(region.getAttribute('role')).toBe('status');
    expect(region.textContent).toBe(t('fw.loading'));
    await act(async () => resolve(identity()));
    await waitFor(() => expect(region.textContent).toBe(t('fw.detail.loaded')));
    expect(screen.getByTestId('fw-detail-status')).toBe(region);
    expect(region.textContent).not.toContain('Ramesh Kumar'); // the line carries no identity
  });

  it('CR42 — a retryable failure offers Try again: it keeps focus in the panel and reads once more', async () => {
    getFieldWorkerIdentity.mockRejectedValueOnce(new ApiError(503, 'field_worker.decrypt_unavailable', 'down'));
    renderDetail();
    const retry = await screen.findByTestId('fw-detail-retry');
    retry.focus();
    fireEvent.click(retry);
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: t('fw.detail.title') }));
    await screen.findByTestId('fw-detail-mobile');
    expect(getFieldWorkerIdentity).toHaveBeenCalledTimes(2);
    expect(screen.queryByTestId('fw-detail-retry')).toBeNull();
  });

  it('CR57 — a retry while offline says it is loading, not an empty panel, and finishes on reconnect', async () => {
    getFieldWorkerIdentity.mockRejectedValueOnce(new ApiError(503, 'field_worker.decrypt_unavailable', 'down'));
    renderDetail();
    const retry = await screen.findByTestId('fw-detail-retry');
    act(() => onlineManager.setOnline(false));
    try {
      fireEvent.click(retry);
      await waitFor(() => expect(screen.getByTestId('fw-detail-status').textContent).toBe(t('fw.loading')));
      expect(getFieldWorkerIdentity).toHaveBeenCalledTimes(1); // paused: nothing was sent
    } finally {
      act(() => onlineManager.setOnline(true));
    }
    await screen.findByTestId('fw-detail-mobile');
    expect(getFieldWorkerIdentity).toHaveBeenCalledTimes(2);
  });

  it('CR42 — a failure retrying cannot help offers no Try again', async () => {
    getFieldWorkerIdentity.mockRejectedValueOnce(new ApiError(500, 'field_worker.identity_unreadable', 'no'));
    renderDetail();
    expect((await screen.findByTestId('fw-detail-error')).textContent).toBe(t('fw.list.unreadable'));
    expect(screen.queryByTestId('fw-detail-retry')).toBeNull();
  });

  it.each([
    ['field_worker.authorization_stale', 409, 1],
    ['field_worker.decrypt_unavailable', 503, 0],
  ])('CR47 — %s (%i) on the identity read invalidates the lists this many times: %i', async (code, status, times) => {
    const qc = keepingClient();
    const refresh = vi.spyOn(qc, 'invalidateQueries');
    getFieldWorkerIdentity.mockRejectedValueOnce(new ApiError(status, code, 'no'));
    renderDetail(qc);
    await screen.findByTestId('fw-detail-error');
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 30));
    });
    expect(refresh).toHaveBeenCalledTimes(times); // outside a `waitFor`, which would stop at the first match
    if (times === 1) expect(refresh).toHaveBeenCalledWith({ queryKey: ['field-workers', P, 'list'] });
  });

  it('CR48 — the hook itself drops a decrypted identity on an unmount no handler saw, whatever the client’s default', async () => {
    const qc = keepingClient();
    const { unmount } = render(
      <QueryClientProvider client={qc}>
        <WorkerDetail pariwarId={P} fieldWorkerId={W} onClose={() => undefined} />
      </QueryClientProvider>,
    );
    await screen.findByTestId('fw-detail-mobile');
    expect(identityEntries(qc)).toHaveLength(1);
    unmount();
    await waitFor(() => expect(identityEntries(qc)).toHaveLength(0));
  });
});
