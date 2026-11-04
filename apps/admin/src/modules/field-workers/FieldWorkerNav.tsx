// The three field-worker pages link to one another — Story 13.1a (AC11 (d)): the TopBar carries ONE "Field workers" link (the
// finder), so each page carries the other two and all three are reachable from it.

import { Link } from '@tanstack/react-router';
import type { ReactElement } from 'react';

import { resolveEn as t } from './i18n-en.js';

export type FieldWorkerPage = 'register' | 'approvals' | 'find';

export function FieldWorkerNav({ pariwarId, current }: { pariwarId: string; current: FieldWorkerPage }): ReactElement {
  return (
    <nav aria-label={t('fw.nav.label')} className="flex gap-4 text-sm" data-testid="fw-nav">
      {current !== 'register' && (
        <Link to="/p/$pariwarId/field-workers/register" params={{ pariwarId }} className="underline" data-testid="fw-nav-register">
          {t('fw.nav.register')}
        </Link>
      )}
      {current !== 'approvals' && (
        <Link to="/p/$pariwarId/field-workers/approvals" params={{ pariwarId }} className="underline" data-testid="fw-nav-approvals">
          {t('fw.nav.approvals')}
        </Link>
      )}
      {current !== 'find' && (
        <Link to="/p/$pariwarId/field-workers" params={{ pariwarId }} className="underline" data-testid="fw-nav-find">
          {t('fw.nav.find')}
        </Link>
      )}
    </nav>
  );
}
