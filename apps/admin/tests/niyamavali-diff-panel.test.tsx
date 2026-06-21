// DiffPanel render tests (Story 2.4, AC1c). Presentational — no router/query context.

import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { DiffPreviewResponse } from '@twt/contracts';
import { DiffPanel } from '../src/modules/niyamavali-admin/DiffPanel.js';

const DIFF: DiffPreviewResponse = {
  structuredDiff: {
    added: { title_en: 'New title' },
    removed: {},
    changed: { restoration_window_days: { from: 30, to: 45 } },
  },
  renderedDiff: [
    { field: 'restoration_window_days', before: '30', after: '45', changed: true },
    { field: 'rule_code', before: 'R7(A)', after: 'R7(A)', changed: false },
    { field: 'title_en', before: null, after: 'New title', changed: true },
  ],
};

describe('DiffPanel (AC1c)', () => {
  it('renders a rendered-content row per display field with before/after', () => {
    render(<DiffPanel diff={DIFF} />);
    const changedRow = screen.getByTestId('diff-row-restoration_window_days');
    expect(changedRow).toHaveAttribute('data-changed', 'true');
    expect(within(changedRow).getByText('30')).toBeInTheDocument();
    expect(within(changedRow).getByText('45')).toBeInTheDocument();
  });

  it('marks an unchanged field as not changed', () => {
    render(<DiffPanel diff={DIFF} />);
    expect(screen.getByTestId('diff-row-rule_code')).toHaveAttribute('data-changed', 'false');
  });

  it('renders an absent before value as a dash (added field)', () => {
    render(<DiffPanel diff={DIFF} />);
    const addedRow = screen.getByTestId('diff-row-title_en');
    expect(within(addedRow).getByText('New title')).toBeInTheDocument();
    expect(within(addedRow).getByText('—')).toBeInTheDocument();
  });

  it('also exposes the structured payload diff', () => {
    render(<DiffPanel diff={DIFF} />);
    const structured = screen.getByTestId('structured-diff');
    expect(within(structured).getByText(/restoration_window_days/)).toBeInTheDocument();
  });

  it('handles an all-unchanged / empty rendered diff gracefully', () => {
    render(<DiffPanel diff={{ structuredDiff: { added: {}, removed: {}, changed: {} }, renderedDiff: [] }} />);
    expect(screen.getByText(/No display fields to compare/i)).toBeInTheDocument();
  });
});
