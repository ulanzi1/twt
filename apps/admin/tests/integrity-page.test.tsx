// Integrity page component tests (Story 1.11b, Task 10.1 / AC-6).
//
// Covers run-now → green, run-now → red banner with all four DD-4 fields, history
// renders, and acknowledge → banner persistence clears. The api-client module is
// mocked with a mutable in-memory history so mutations (run-now / acknowledge)
// mutate it and the invalidated query re-reads it — exercising the real hooks +
// derivation + components.

import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuditIntegrityCheckListItem } from '@twt/contracts';
import { IntegrityPage } from '../src/modules/audit-integrity/IntegrityPage.js';
import { makeItem, renderWithClient } from './_helpers.js';

const h = vi.hoisted(() => ({ checks: [] as AuditIntegrityCheckListItem[] }));

vi.mock('../src/api/client.js', () => {
  class ApiError extends Error {
    public constructor(
      public readonly status: number,
      public readonly code: string,
      message: string,
    ) {
      super(message);
      this.name = 'ApiError';
    }
    public get isUnauthorized(): boolean {
      return this.status === 401;
    }
  }
  return {
    ApiError,
    listIntegrityChecks: vi.fn(async () => h.checks),
    runVerification: vi.fn(async () => {
      const verdict = {
        checkId: `run-${h.checks.length + 1}`,
        verifiedAt: '2026-06-14T06:00:00.000Z',
        chainValid: true,
        startSeq: 1,
        startAuditId: 'run-start',
        endSeq: 8,
        endAuditId: 'run-end',
        firstBrokenSeq: null,
        firstBrokenAuditId: null,
        rowsVerified: 8,
        verifierActor: 'on-demand:tester',
        triggerSource: 'on_demand',
      };
      h.checks = [{ ...verdict, acknowledgement: null }, ...h.checks];
      return verdict;
    }),
    acknowledgeCheck: vi.fn(async (checkId: string, ticketRef: string) => {
      const ack = {
        acknowledgementId: 'ack-1',
        checkId,
        acknowledgedAt: '2026-06-14T07:00:00.000Z',
        acknowledgedBy: 'tester',
        ticketRef,
      };
      h.checks = h.checks.map((c) => (c.checkId === checkId ? { ...c, acknowledgement: ack } : c));
      return ack;
    }),
    getSession: vi.fn(),
    login: vi.fn(),
    passkeyAuthOptions: vi.fn(),
    passkeyAuthVerify: vi.fn(),
    consumeRecovery: vi.fn(),
    logout: vi.fn(),
  };
});

beforeEach(() => {
  h.checks = [];
  vi.clearAllMocks();
});

describe('IntegrityPage', () => {
  it('renders the history table with one row per check', async () => {
    h.checks = [makeItem({ chainValid: true }), makeItem({ chainValid: true })];
    renderWithClient(<IntegrityPage />);

    const table = await screen.findByTestId('history-table');
    expect(within(table).getAllByTestId('history-row')).toHaveLength(2);
    expect(await screen.findByTestId('status-banner')).toHaveAttribute('data-status', 'ok');
  });

  it('run verification now → shows progress then a green banner (AC-3)', async () => {
    const user = userEvent.setup();
    const client = await import('../src/api/client.js');
    h.checks = [];

    // Hold the mutation so we can assert the progress indicator before it resolves.
    let resolveRun!: () => void;
    const held = new Promise<void>((r) => { resolveRun = r; });
    (client.runVerification as ReturnType<typeof vi.fn>).mockImplementationOnce(async () => {
      await held;
      const verdict = {
        checkId: 'run-ac3',
        verifiedAt: '2026-06-14T06:00:00.000Z',
        chainValid: true,
        startSeq: 1,
        startAuditId: 'run-ac3-start',
        endSeq: 8,
        endAuditId: 'run-ac3-end',
        firstBrokenSeq: null,
        firstBrokenAuditId: null,
        rowsVerified: 8,
        verifierActor: 'on-demand:tester',
        triggerSource: 'on_demand',
      };
      h.checks = [{ ...verdict, acknowledgement: null }, ...h.checks];
      return verdict;
    });

    renderWithClient(<IntegrityPage />);
    await waitFor(() =>
      expect(screen.getByTestId('status-banner')).toHaveAttribute('data-status', 'empty'),
    );

    // Fire the click without awaiting — the mutation is now in-flight.
    void user.click(screen.getByTestId('run-now'));

    // Progress indicator must be present while the mutation is pending.
    await screen.findByTestId('run-progress');

    // Release the mutation → history invalidates → banner turns green.
    resolveRun();
    await waitFor(() =>
      expect(screen.getByTestId('status-banner')).toHaveAttribute('data-status', 'ok'),
    );
  });

  it('a broken latest check renders a red banner with all four DD-4 fields (AC-4)', async () => {
    h.checks = [
      makeItem({
        chainValid: false,
        verifiedAt: '2026-06-14T02:00:00.000Z',
        firstBrokenAuditId: 'BROKEN-ROW-ID',
        firstBrokenSeq: 7,
        endAuditId: 'PRIOR-VALID-ID',
        endSeq: 6,
      }),
      makeItem({
        chainValid: true,
        verifiedAt: '2026-06-13T02:00:00.000Z',
        endAuditId: 'LAST-GOOD-ID',
        endSeq: 6,
      }),
    ];
    renderWithClient(<IntegrityPage />);

    const banner = await screen.findByTestId('status-banner');
    expect(banner).toHaveAttribute('data-status', 'fail');
    expect(banner).toHaveAttribute('role', 'alert');
    expect(banner).toHaveAttribute('aria-live', 'assertive');

    // (1) failing row, (2) prior-valid row, (3) tamper window endpoints,
    // (4) last provably-good (cold-mirror hot-chain proxy) + the deferred line.
    expect(within(banner).getByText(/BROKEN-ROW-ID/)).toBeInTheDocument();
    expect(within(banner).getByText(/PRIOR-VALID-ID/)).toBeInTheDocument();
    expect(within(banner).getByText(/2026-06-13T02:00:00\.000Z → 2026-06-14T02:00:00\.000Z/)).toBeInTheDocument();
    expect(within(banner).getByText(/LAST-GOOD-ID/)).toBeInTheDocument();
    expect(within(banner).getByText(/cold-mirror cross-verification: deferred/i)).toBeInTheDocument();
  });

  it('acknowledging a failure clears the persistent red banner (AC-5)', async () => {
    const user = userEvent.setup();
    h.checks = [
      makeItem({
        chainValid: false,
        firstBrokenAuditId: 'BROKEN-ROW-ID',
        firstBrokenSeq: 7,
      }),
    ];
    renderWithClient(<IntegrityPage />);

    const banner = await screen.findByTestId('status-banner');
    expect(banner).toHaveAttribute('data-status', 'fail');

    // Open the Radix acknowledge dialog, fill the ticket ref, confirm.
    await user.click(screen.getByTestId('open-acknowledge'));
    await user.type(await screen.findByLabelText(/investigation ticket reference/i), 'JIRA-555');
    await user.click(screen.getByRole('button', { name: /confirm acknowledgement/i }));

    // The banner de-escalates to the muted acknowledged state; the trigger is gone.
    await waitFor(() =>
      expect(screen.getByTestId('status-banner')).toHaveAttribute('data-status', 'fail-acknowledged'),
    );
    expect(screen.queryByTestId('open-acknowledge')).not.toBeInTheDocument();
    expect(screen.getByTestId('acknowledged-note')).toHaveTextContent('JIRA-555');
  });

  it('an empty-string ticket is rejected by the form (no acknowledge call)', async () => {
    const user = userEvent.setup();
    const client = await import('../src/api/client.js');
    h.checks = [makeItem({ chainValid: false, firstBrokenAuditId: 'X', firstBrokenSeq: 7 })];
    renderWithClient(<IntegrityPage />);

    await screen.findByTestId('status-banner');
    await user.click(screen.getByTestId('open-acknowledge'));
    await user.click(await screen.findByRole('button', { name: /confirm acknowledgement/i }));

    // RHF + Zod blocks the submit; the client is never called.
    expect(client.acknowledgeCheck).not.toHaveBeenCalled();
  });
});
