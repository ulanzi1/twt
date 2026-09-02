// Nominee-bank masking-schedule page (Story 11b.3a, Task 5; AC5, AC6) — the [SURFACE] deliverable.
//
// ⭐⭐ THE PROJECT'S FIRST SELF-SERVE PRESENTATION-TOGGLE UI, and that is recorded rather than
// discovered. Story 11a.1 shipped ⛔ NO admin toggle screen, deliberately, as a scope boundary:
// presentation changes were governed by a WRITE PATH with required rationale + actor + audit anchor
// and ⛔ no screen at all. ⛔ That was ⛔ not a reason to refuse this screen — `2026-09-02-178` put
// the authority centrally, and a lever with no surface is what `2026-08-21-147` cl.1(c) withdrew as
// an acceptable answer for the sibling kill switch.
//
// A `super_admin` reads what is in force, sees who last set it and why, and changes it in EVERY
// direction with a required reason — ⛔ without database access.
//
// `pariwarId` is a prop (from the route) so the page is testable without a router (the
// directory-publication / degraded-mode / feature-flags precedent).
//
// ⛔ NO client-side capability check. `pariwar.manage_nominee_bank_masking` is a PARIWAR-dimension
// grant and never appears in an admin session's global grant set, so a client gate modelled on the
// global-scope pattern would deny EVERY operator including super_admin. The server's
// `requirePermissionHook` is the boundary; its 403 surfaces here as a readable page error.

import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';

import { ApiError } from '../../api/client.js';
import {
  useNomineeBankMaskingSchedule,
  useSetNomineeBankMaskingSchedule,
} from '../../api/hooks.js';
import { resolveEn as t } from './i18n-en.js';
import { MaskingScheduleForm } from './MaskingScheduleForm.js';

export interface MaskingSchedulePageProps {
  pariwarId: string;
}

function errorMessage(error: unknown): string | undefined {
  if (!error) return undefined;
  if (error instanceof ApiError) {
    // The one denial an operator is most likely to hit gets copy that explains it — and names the
    // RULING, because "you lack a permission" invites a catalog edit and "the Panel ruled this is
    // held centrally" does not.
    if (error.status === 403) return t('nomineeBankMasking.error.forbidden');
    // Any other status is unexpected by design (the designed list is 400/401/403/409) — curated
    // copy, ⛔ not the raw server code/message, which may carry internal detail.
    return t('nomineeBankMasking.error.unexpected');
  }
  return error instanceof Error ? error.message : 'Something went wrong.';
}

function formatTimestamp(iso: string): string {
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? iso : parsed.toLocaleString();
}

/**
 * Describe the setting in force, in words.
 *
 * ⭐⭐ `0` GETS ITS OWN SENTENCE, ⛔ not "0 days" rendered through the N-days template. It is
 * cl.10(c)'s zero-day setting — masked from the close instant — and reads as a different decision to
 * the person holding the knob —
 * and a template that says *"stay visible for 0 days"* is exactly the phrasing that makes a reader
 * wonder whether the setting took.
 * ⚠⛔ AND `permanent` SAYS *"at all times, including while a drive is still collecting"* — the
 * TERMINAL RUNG (`2026-09-02-183` cl.4). ⛔ Do not soften it to "after a drive closes": an operator
 * choosing it must know it also covers the active campaign.
 */
function describeSetting(
  setting: { mode: 'after_days'; maskAfterDays: number } | { mode: 'permanent' },
): string {
  if (setting.mode === 'permanent') return t('nomineeBankMasking.status.permanent');
  if (setting.maskAfterDays === 0) return t('nomineeBankMasking.status.afterDaysZero');
  return t('nomineeBankMasking.status.afterDays').replace(
    '{days}',
    String(setting.maskAfterDays),
  );
}

export function MaskingSchedulePage({ pariwarId }: MaskingSchedulePageProps): ReactElement {
  const schedule = useNomineeBankMaskingSchedule(pariwarId);
  const change = useSetNomineeBankMaskingSchedule(pariwarId);
  const [saved, setSaved] = useState(false);
  const [resetToken, setResetToken] = useState(0);

  // Client-side nav between two Pariwars' pages does not remount this component — clear the
  // per-tenant "Saved" banner so it can never leak from the previous Pariwar's view.
  useEffect(() => {
    setSaved(false);
  }, [pariwarId]);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-lg font-semibold">{t('nomineeBankMasking.header.title')}</h1>
        <p className="text-sm opacity-70">{t('nomineeBankMasking.header.subtitle')}</p>
      </header>

      {/*
        ⭐ AC6 — the propagation-floor disclosure. STANDING copy: rendered unconditionally, above the
        control, on every render, in every state. ⛔ NOT a success-state message and ⛔ not collapsed
        behind a disclosure widget — an operator has to read it BEFORE acting, because the gap it
        describes is the window in which a FULL ACCOUNT NUMBER is still being served from warm PoPs.
      */}
      <section
        aria-label={t('nomineeBankMasking.propagation.heading')}
        className="rounded border border-status-warn-fg/40 bg-status-warn-fg/5 p-4"
        data-testid="nominee-bank-masking-propagation-notice"
      >
        <h2 className="mb-1 text-sm font-semibold">
          {t('nomineeBankMasking.propagation.heading')}
        </h2>
        <p className="text-sm">{t('nomineeBankMasking.propagation.body')}</p>
      </section>

      <section aria-label={t('nomineeBankMasking.status.heading')} className="rounded border p-4">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide opacity-70">
          {t('nomineeBankMasking.status.heading')}
        </h2>
        {schedule.isLoading ? (
          <p role="status">{t('nomineeBankMasking.status.loading')}</p>
        ) : schedule.isError ? (
          <p role="alert" className="text-status-fail-fg" data-testid="nominee-bank-masking-status-error">
            {errorMessage(schedule.error)}
          </p>
        ) : schedule.data ? (
          <div className="flex flex-col gap-2">
            {/*
              ⛔ `configured: false` is reported EXPLICITLY, ⛔ never inferred from all-null fields —
              and on this control it is the most consequential state: no setting has ever been
              recorded, so the complete details stay visible after a drive closes (`D8-default`
              FAIL-OPEN, `2026-09-02-179` cl.1). An operator must not read silence as safety.
            */}
            {!schedule.data.configured || schedule.data.setting === null ? (
              <p data-testid="nominee-bank-masking-unconfigured">
                {t('nomineeBankMasking.status.unconfigured')}
              </p>
            ) : (
              <>
                <p data-testid="nominee-bank-masking-setting">
                  {describeSetting(schedule.data.setting)}
                </p>
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                  <dt className="font-medium opacity-70">
                    {t('nomineeBankMasking.status.lastChangedBy')}
                  </dt>
                  <dd data-testid="nominee-bank-masking-changed-by">
                    {schedule.data.changedByDisplay ?? '—'}
                  </dd>
                  <dt className="font-medium opacity-70">
                    {t('nomineeBankMasking.status.inForceSince')}
                  </dt>
                  <dd data-testid="nominee-bank-masking-effective-from">
                    {schedule.data.effectiveFrom ? formatTimestamp(schedule.data.effectiveFrom) : '—'}
                  </dd>
                  <dt className="font-medium opacity-70">
                    {t('nomineeBankMasking.status.lastRationale')}
                  </dt>
                  <dd data-testid="nominee-bank-masking-rationale-shown">
                    {schedule.data.rationale ?? '—'}
                  </dd>
                  <dt className="font-medium opacity-70">
                    {t('nomineeBankMasking.status.version')}
                  </dt>
                  <dd data-testid="nominee-bank-masking-version">
                    {schedule.data.version ?? '—'}
                  </dd>
                </dl>
              </>
            )}
          </div>
        ) : null}
      </section>

      {schedule.data && (
        <section aria-label={t('nomineeBankMasking.form.heading')} className="rounded border p-4">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide opacity-70">
            {t('nomineeBankMasking.form.heading')}
          </h2>
          <MaskingScheduleForm
            key={pariwarId}
            pending={change.isPending}
            submitError={errorMessage(change.error)}
            resetToken={resetToken}
            onSubmit={(payload) =>
              change.mutate(payload, {
                onSuccess: () => {
                  setSaved(true);
                  // Clears the form so a prior submit's text can never be silently resubmitted as
                  // the justification for a DIFFERENT setting.
                  setResetToken((n) => n + 1);
                },
              })
            }
          />
          {saved && !change.isPending && !change.error && (
            <p role="status" className="mt-3 text-sm" data-testid="nominee-bank-masking-saved">
              {t('nomineeBankMasking.result.saved')}
            </p>
          )}
        </section>
      )}
    </div>
  );
}
