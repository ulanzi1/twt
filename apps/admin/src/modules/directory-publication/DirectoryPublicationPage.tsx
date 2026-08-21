// Directory-publication kill-switch page (Story 10.30, Task 4; AC3, AC5) — the [SURFACE] deliverable.
//
// The console surface Decision `2026-08-21-147` cl.1 made a LAUNCH GATE for the public Member
// Directory: a super_admin reads the current state, sees who last changed it and why, and flips it in
// either direction with a required reason — ⛔ without database access, which `2026-08-21-147` cl.1(c)
// withdrew as an acceptable answer.
//
// ⛔ THE SWITCH IS STILL NOT AN OPERATIONAL CONTROL. This page existing does not confer that status;
// only a separate ≥2-trustee ratification does, and launch-gate Row 17 stays `open` until it lands.
//
// `pariwarId` is a prop (from the route) so the page is testable without a router (the
// degraded-mode / feature-flags precedent).
//
// ⛔ NO client-side capability check. `pariwar.manage_directory_publication` is a PARIWAR-dimension
// grant and never appears in an admin session's global grant set, so a client gate modelled on the
// global-scope pattern would deny EVERY operator including super_admin. The server's
// `requirePermissionHook` is the boundary; its 403 surfaces here as a readable page error.

import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';

import { ApiError } from '../../api/client.js';
import {
  useDirectoryPublicationStatus,
  useSetDirectoryPublicationStatus,
} from '../../api/hooks.js';
import { resolveEn as t } from './i18n-en.js';
import { PublicationForm } from './PublicationForm.js';

export interface DirectoryPublicationPageProps {
  pariwarId: string;
}

function errorMessage(error: unknown): string | undefined {
  if (!error) return undefined;
  if (error instanceof ApiError) {
    // The one denial an operator is most likely to hit gets copy that explains it rather than a raw
    // machine code — the server, not this page, decided it (Trap 3).
    if (error.status === 403) return t('directoryPublication.error.forbidden');
    // Any other status is unexpected by design (Task 8's designed-status list is 400/401/403/409) —
    // curated copy, not the raw server code/message, which may carry internal detail (Review Finding).
    return t('directoryPublication.error.unexpected');
  }
  return error instanceof Error ? error.message : 'Something went wrong.';
}

function formatTimestamp(iso: string): string {
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? iso : parsed.toLocaleString();
}

export function DirectoryPublicationPage({
  pariwarId,
}: DirectoryPublicationPageProps): ReactElement {
  const status = useDirectoryPublicationStatus(pariwarId);
  const flip = useSetDirectoryPublicationStatus(pariwarId);
  const [savedEnabled, setSavedEnabled] = useState<boolean | null>(null);
  const [resetToken, setResetToken] = useState(0);

  // Client-side nav between two Pariwars' pages does not remount this component — clear the
  // per-tenant "Saved" banner so it can never leak from the previous Pariwar's view (Review Finding).
  useEffect(() => {
    setSavedEnabled(null);
  }, [pariwarId]);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-lg font-semibold">{t('directoryPublication.header.title')}</h1>
        <p className="text-sm opacity-70">{t('directoryPublication.header.subtitle')}</p>
      </header>

      {/*
        ⭐ AC5 — the propagation-floor disclosure. STANDING copy: rendered unconditionally, above the
        control, on every render, in every state. ⛔ NOT a success-state message and ⛔ not collapsed
        behind a disclosure widget — an operator has to read it BEFORE acting, because the gap it
        describes is the window in which real member names are still being served from warm PoPs.
      */}
      <section
        aria-label={t('directoryPublication.propagation.heading')}
        className="rounded border border-status-warn-fg/40 bg-status-warn-fg/5 p-4"
        data-testid="directory-publication-propagation-notice"
      >
        <h2 className="mb-1 text-sm font-semibold">
          {t('directoryPublication.propagation.heading')}
        </h2>
        <p className="text-sm">{t('directoryPublication.propagation.body')}</p>
      </section>

      <section aria-label={t('directoryPublication.status.heading')} className="rounded border p-4">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide opacity-70">
          {t('directoryPublication.status.heading')}
        </h2>
        {status.isLoading ? (
          <p role="status">{t('directoryPublication.status.loading')}</p>
        ) : status.isError ? (
          <p role="alert" className="text-status-fail-fg" data-testid="directory-publication-status-error">
            {errorMessage(status.error)}
          </p>
        ) : status.data ? (
          <div className="flex flex-col gap-2">
            <p data-testid="directory-publication-state">
              {status.data.enabled
                ? t('directoryPublication.status.published')
                : t('directoryPublication.status.unpublished')}
            </p>

            {/* `configured: false` is reported explicitly — never inferred from all-null fields. */}
            {!status.data.configured ? (
              <p className="text-sm opacity-70" data-testid="directory-publication-unconfigured">
                {t('directoryPublication.status.unconfigured')}
              </p>
            ) : (
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                <dt className="font-medium opacity-70">
                  {t('directoryPublication.status.lastChangedBy')}
                </dt>
                <dd data-testid="directory-publication-changed-by">
                  {status.data.changedByDisplay ?? '—'}
                </dd>
                <dt className="font-medium opacity-70">
                  {t('directoryPublication.status.lastChangedAt')}
                </dt>
                <dd data-testid="directory-publication-changed-at">
                  {status.data.updatedAt ? formatTimestamp(status.data.updatedAt) : '—'}
                </dd>
                <dt className="font-medium opacity-70">
                  {t('directoryPublication.status.lastRationale')}
                </dt>
                <dd data-testid="directory-publication-rationale-shown">
                  {status.data.rationale ?? '—'}
                </dd>
              </dl>
            )}
          </div>
        ) : null}
      </section>

      {status.data && (
        <section aria-label={t('directoryPublication.form.heading')} className="rounded border p-4">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide opacity-70">
            {t('directoryPublication.form.heading')}
          </h2>
          <PublicationForm
            key={pariwarId}
            currentlyEnabled={status.data.enabled}
            pending={flip.isPending}
            submitError={errorMessage(flip.error)}
            resetToken={resetToken}
            onSubmit={(payload) =>
              flip.mutate(payload, {
                onSuccess: (row) => {
                  setSavedEnabled(row.enabled);
                  // Clears the rationale textarea so a prior submit's text can never be silently
                  // resubmitted as the justification for the reverse flip (Review Finding).
                  setResetToken((n) => n + 1);
                },
              })
            }
          />
          {savedEnabled !== null && !flip.isPending && !flip.error && (
            <p role="status" className="mt-3 text-sm" data-testid="directory-publication-saved">
              {savedEnabled
                ? t('directoryPublication.result.savedPublished')
                : t('directoryPublication.result.savedUnpublished')}
            </p>
          )}
        </section>
      )}
    </div>
  );
}
