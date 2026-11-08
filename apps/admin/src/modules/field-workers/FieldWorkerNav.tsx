// The field-worker pages link to one another — Story 13.1a (AC11 (d)): the TopBar carries ONE "Field workers" link (the
// finder), so each page carries the others and all are reachable from it. Story 13.1d (AD10) adds "Move requests", whose link carries
// the officer's UNSEEN notices, counted on the notices' FIRST page when the nav mounts (⛔ polling; `RootLayout` unchanged). A notices
// read that fails shows the plain link — the count is a convenience, the page itself shows every notice.

import { Link } from '@tanstack/react-router';
import type { ReactElement } from 'react';

import { useFieldWorkerNotices } from '../../api/hooks.js';
import { resolveEn as t } from './i18n-en.js';

export type FieldWorkerPage = 'register' | 'approvals' | 'find' | 'requests';

export function FieldWorkerNav({ pariwarId, current }: { pariwarId: string; current: FieldWorkerPage }): ReactElement {
  const notices = useFieldWorkerNotices(pariwarId);
  const unseen = notices.data?.items.filter((n) => n.seen_at === null).length ?? 0;
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
      {current !== 'requests' && (
        <Link to="/p/$pariwarId/field-workers/requests" params={{ pariwarId }} className="underline" data-testid="fw-nav-requests">
          {unseen > 0 ? t('fw.nav.requestsUnseen', { count: unseen }) : t('fw.nav.requests')}
        </Link>
      )}
    </nav>
  );
}
