// Shared test helpers (Story 1.11b, Task 10.1).

import { QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderResult } from '@testing-library/react';
import type { ReactElement } from 'react';

import type {
  AuditIntegrityAcknowledgement,
  AuditIntegrityCheckListItem,
} from '@twt/contracts';
import { createQueryClient } from '../src/api/hooks.js';

let seq = 1000;
function uuid(): string {
  seq += 1;
  return `00000000-0000-0000-0000-${String(seq).padStart(12, '0')}`;
}

/** Build a history list item with sensible defaults; override any field. */
export function makeItem(
  over: Partial<AuditIntegrityCheckListItem> = {},
): AuditIntegrityCheckListItem {
  return {
    checkId: uuid(),
    verifiedAt: '2026-06-14T02:00:00.000Z',
    chainValid: true,
    startSeq: 1,
    startAuditId: uuid(),
    endSeq: 6,
    endAuditId: uuid(),
    firstBrokenSeq: null,
    firstBrokenAuditId: null,
    rowsVerified: 6,
    verifierActor: 'cron',
    triggerSource: 'cron',
    acknowledgement: null,
    ...over,
  };
}

export function makeAck(
  over: Partial<AuditIntegrityAcknowledgement> = {},
): AuditIntegrityAcknowledgement {
  return {
    acknowledgementId: uuid(),
    checkId: uuid(),
    acknowledgedAt: '2026-06-14T04:00:00.000Z',
    acknowledgedBy: uuid(),
    ticketRef: 'JIRA-1234',
    ...over,
  };
}

/** Render a component wrapped in a fresh cache-disabled QueryClient. */
export function renderWithClient(ui: ReactElement): RenderResult {
  const client = createQueryClient();
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}
