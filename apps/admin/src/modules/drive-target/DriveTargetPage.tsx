// Drive-target admin page (Story 11b.13, Task 4; AC5) — the surface deliverable.
//
// A **Pariwar Admin** records what a drive in their Pariwar needs to raise; a **Super Admin**
// additionally decides whether anyone may see it. `2026-09-04-190` cl.7(a)'s *"from day 1"* — a
// target nobody can set is not set.
//
// ══════════════════════════════════════════════════════════════════════════════════════════════
// ⛔⛔ THE PAGE'S HARDEST JOB IS SAYING WHAT THE CONTROL DOES ⛔ NOT DO
// ══════════════════════════════════════════════════════════════════════════════════════════════
// The target is rendered **NOWHERE** (cl.7(b)), and Story 11b.14 is its first consumer. ⇒ an
// operator sets a number and **⛔ nothing anywhere changes**. ⭐ That is correct and intended
// (Trap 3) — ⛔ do ⛔ not "finish the job" by adding a preview of what the bar would look like. ⚠ But
// it means an operator who assumes the figure becomes visible has ⛔ nothing to contradict them. ⇒
// the *"shown to nobody"* disclosure is STANDING copy, above the control, in every state.
//
// ── ⭐⭐ THE REVEAL SECTION IS SERVER-GATED, ⛔ NOT ROLE-CHECKED HERE ─────────────────────────────
// AC5: the reveal switches are visible ⛔ only to a `super_admin`. This page asks for them on a
// SEPARATE endpoint, and a `pariwar_admin` gets a **403** — so the section simply does not render.
// ⛔ THERE IS NO CLIENT-SIDE CAPABILITY CHECK, and adding one would break the page for everyone:
// both keys are PARIWAR-dimension grants and never appear in an admin session's global grant set, so
// a gate modelled on the global-scope pattern would deny every operator including `super_admin`.
// ⚠ A 403 on the VISIBILITY query is therefore an ORDINARY, EXPECTED outcome — ⛔ it must not be
// rendered as a page error, which is the one thing that would make a Pariwar Admin think the page
// is broken.
//
// `pariwarId` is a prop (from the route) so the page is testable without a router (the
// nominee-bank-masking / directory-publication / feature-flags precedent).

import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';

import { ApiError } from '../../api/client.js';
import {
  useDriveTarget,
  useDriveTargetVisibility,
  useSetDriveTarget,
  useSetDriveTargetVisibility,
} from '../../api/hooks.js';
import { DriveTargetForm } from './DriveTargetForm.js';
import { resolveEn as t } from './i18n-en.js';
import { RevealSwitchesForm } from './RevealSwitchesForm.js';

export interface DriveTargetPageProps {
  pariwarId: string;
}

function errorMessage(error: unknown): string | undefined {
  if (!error) return undefined;
  if (error instanceof ApiError) {
    // ⭐ EVERY DESIGNED STATUS GETS ITS OWN ANSWER. ⛔ A catch-all `unexpected` — whose copy says the
    // change "may not have been saved" and tells the operator to reload — is BOTH unhelpful and
    // untrue for most of these: nothing was written, and a reload fixes none of them.
    if (error.status === 403) return t('driveTarget.error.forbidden');
    if (error.status === 400) return t('driveTarget.error.invalid');
    if (error.status === 409) {
      // ⚠ TWO different 409s share a status and must NOT share copy. The version conflict is the one
      // that needs explaining — the operator's change was refused precisely so it would not quietly
      // undo somebody else's, and telling them to "reload and check" is the correct, true advice.
      const code = error.code ?? '';
      if (code === 'pariwar.drive_target_version_conflict') {
        return t('driveTarget.error.versionConflict');
      }
      return t('driveTarget.error.displayNameMissing');
    }
    if (error.status === 422) {
      const code = error.code ?? '';
      if (code === 'pariwar.drive_target_visibility_invalid') {
        return t('driveTarget.error.visibilityInvalid');
      }
      return t('driveTarget.error.invalid');
    }
    // ⚠ 401 keeps the generic copy deliberately: a session that expired mid-form IS resolved by
    // reloading, which is exactly what `unexpected` instructs.
    // Anything else is genuinely unexpected — curated copy, ⛔ not the raw server code/message.
    return t('driveTarget.error.unexpected');
  }
  return error instanceof Error ? error.message : 'Something went wrong.';
}

/** Indian-grouping rupee formatting for the status line. ⛔ Display only — never parsed back. */
function formatInr(amount: number): string {
  return new Intl.NumberFormat('en-IN').format(amount);
}

function formatTimestamp(iso: string): string {
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? iso : parsed.toLocaleString();
}

export function DriveTargetPage({ pariwarId }: DriveTargetPageProps): ReactElement {
  const target = useDriveTarget(pariwarId);
  const visibility = useDriveTargetVisibility(pariwarId);
  const changeTarget = useSetDriveTarget(pariwarId);
  const changeVisibility = useSetDriveTargetVisibility(pariwarId);
  const [savedTarget, setSavedTarget] = useState(false);
  const [savedReveal, setSavedReveal] = useState(false);
  const [targetResetToken, setTargetResetToken] = useState(0);
  const [revealResetToken, setRevealResetToken] = useState(0);

  // Client-side nav between two Pariwars' pages does not remount this component — clear the
  // per-tenant "Saved" banners so they can never leak from the previous Pariwar's view.
  useEffect(() => {
    setSavedTarget(false);
    setSavedReveal(false);
  }, [pariwarId]);

  // ⭐⭐ A 403 HERE IS AN ORDINARY OUTCOME, ⛔ NOT AN ERROR TO RENDER. It means the operator holds
  // the target key and not the reveal key — i.e. they are a Pariwar Admin, which is the common case.
  // ⇒ the whole section is omitted. ⛔ Do not surface it as a page error.
  const revealForbidden =
    visibility.isError && visibility.error instanceof ApiError && visibility.error.status === 403;
  const showReveal = visibility.data !== undefined;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-lg font-semibold">{t('driveTarget.header.title')}</h1>
        <p className="text-sm opacity-70">{t('driveTarget.header.subtitle')}</p>
      </header>

      {/*
        ⭐ AC5 — the "shown to nobody" disclosure. STANDING copy: rendered unconditionally, above the
        control, on every render, in every state. ⛔ NOT a success-state message and ⛔ not collapsed
        behind a disclosure widget — an operator has to read it BEFORE acting, because there is
        nothing anywhere else that would correct the assumption.
      */}
      <section
        aria-label={t('driveTarget.notice.heading')}
        className="rounded border border-status-warn-fg/40 bg-status-warn-fg/5 p-4"
        data-testid="drive-target-hidden-notice"
      >
        <h2 className="mb-1 text-sm font-semibold">{t('driveTarget.notice.heading')}</h2>
        <p className="text-sm">{t('driveTarget.notice.body')}</p>
      </section>

      <section aria-label={t('driveTarget.status.heading')} className="rounded border p-4">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide opacity-70">
          {t('driveTarget.status.heading')}
        </h2>
        {target.isLoading ? (
          <p role="status">{t('driveTarget.status.loading')}</p>
        ) : target.isError ? (
          <p role="alert" className="text-status-fail-fg" data-testid="drive-target-status-error">
            {errorMessage(target.error)}
          </p>
        ) : target.data ? (
          <div className="flex flex-col gap-2">
            {/*
              ⛔ `configured: false` is reported EXPLICITLY, ⛔ never inferred from a null amount.
              An unset target and a small target are different facts: Story 11b.14 renders NO
              progress bar at all for the first.
            */}
            {!target.data.configured || target.data.targetInr === null ? (
              <p data-testid="drive-target-unconfigured">{t('driveTarget.status.unconfigured')}</p>
            ) : (
              <>
                <p data-testid="drive-target-amount-shown">
                  {t('driveTarget.status.amount').replace(
                    '{amount}',
                    formatInr(target.data.targetInr),
                  )}
                </p>
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                  <dt className="font-medium opacity-70">
                    {t('driveTarget.status.lastChangedBy')}
                  </dt>
                  <dd data-testid="drive-target-changed-by">
                    {target.data.changedByDisplay ?? '—'}
                  </dd>
                  <dt className="font-medium opacity-70">
                    {t('driveTarget.status.inForceSince')}
                  </dt>
                  <dd data-testid="drive-target-effective-from">
                    {target.data.effectiveFrom ? formatTimestamp(target.data.effectiveFrom) : '—'}
                  </dd>
                  <dt className="font-medium opacity-70">
                    {t('driveTarget.status.lastRationale')}
                  </dt>
                  <dd data-testid="drive-target-rationale-shown">{target.data.rationale ?? '—'}</dd>
                  <dt className="font-medium opacity-70">{t('driveTarget.status.version')}</dt>
                  <dd data-testid="drive-target-version">{target.data.version ?? '—'}</dd>
                </dl>
                {/*
                  ⭐⭐ `2026-09-05-201` cl.5 REFUSED dropping the version from this screen — the cheap
                  option, and the wrong one. It stays, and this line is what makes it MEAN something
                  to the operator rather than look like a debugging artefact.
                */}
                <p className="text-xs opacity-60" data-testid="drive-target-version-hint">
                  {t('driveTarget.status.versionHint')}
                </p>
              </>
            )}
          </div>
        ) : null}
      </section>

      {target.data && (
        <section aria-label={t('driveTarget.form.heading')} className="rounded border p-4">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide opacity-70">
            {t('driveTarget.form.heading')}
          </h2>
          <DriveTargetForm
            key={pariwarId}
            currentTargetInr={target.data.targetInr}
            pending={changeTarget.isPending}
            submitError={errorMessage(changeTarget.error)}
            resetToken={targetResetToken}
            onSubmit={(payload) =>
              changeTarget.mutate(
                // ⭐⭐ `expectedVersion` IS THE VERSION ON SCREEN — `2026-09-05-201` cl.4. ⛔ Never
                // defaulted to `null` when a target exists: that is exactly the stale write the
                // guard refuses, and defaulting it here would defeat the control from the one
                // caller it was built for.
                { ...payload, expectedVersion: target.data.version },
                {
                  onSuccess: () => {
                    setSavedTarget(true);
                    // Clears the form so a prior submit's text can never be silently resubmitted as
                    // the justification for a DIFFERENT target.
                    setTargetResetToken((n) => n + 1);
                  },
                },
              )
            }
          />
          {savedTarget && !changeTarget.isPending && !changeTarget.error && (
            <p role="status" className="mt-3 text-sm" data-testid="drive-target-saved">
              {t('driveTarget.result.saved')}
            </p>
          )}
        </section>
      )}

      {/*
        ⭐⭐ THE REVEAL SECTION — rendered ⛔ ONLY when the server answered the visibility read.
        A `pariwar_admin` gets a 403 there and sees nothing here at all, which is AC5 satisfied by
        the SERVER's answer. ⛔ `revealForbidden` renders NOTHING — it is an ordinary outcome, and
        showing an error would tell a Pariwar Admin the page is broken when it is working exactly as
        ruled.
      */}
      {visibility.isLoading && !revealForbidden && (
        <p role="status" data-testid="drive-target-reveal-loading">
          {t('driveTarget.reveal.loading')}
        </p>
      )}
      {showReveal && visibility.data && (
        <section aria-label={t('driveTarget.reveal.heading')} className="rounded border p-4">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide opacity-70">
            {t('driveTarget.reveal.heading')}
          </h2>
          {!visibility.data.configured && (
            <p className="mb-3 text-sm" data-testid="drive-target-reveal-unconfigured">
              {t('driveTarget.reveal.unconfigured')}
            </p>
          )}
          {visibility.data.configured && (
            <dl className="mb-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
              <dt className="font-medium opacity-70">{t('driveTarget.reveal.lastChangedBy')}</dt>
              <dd data-testid="drive-target-reveal-changed-by">
                {visibility.data.changedByDisplay ?? '—'}
              </dd>
              <dt className="font-medium opacity-70">{t('driveTarget.reveal.updatedAt')}</dt>
              <dd data-testid="drive-target-reveal-updated-at">
                {visibility.data.updatedAt ? formatTimestamp(visibility.data.updatedAt) : '—'}
              </dd>
              <dt className="font-medium opacity-70">{t('driveTarget.reveal.lastRationale')}</dt>
              <dd data-testid="drive-target-reveal-rationale-shown">
                {visibility.data.rationale ?? '—'}
              </dd>
            </dl>
          )}
          <RevealSwitchesForm
            key={pariwarId}
            current={visibility.data.visibility}
            pending={changeVisibility.isPending}
            submitError={errorMessage(changeVisibility.error)}
            resetToken={revealResetToken}
            onSubmit={(payload) =>
              changeVisibility.mutate(payload, {
                onSuccess: () => {
                  setSavedReveal(true);
                  setRevealResetToken((n) => n + 1);
                },
              })
            }
          />
          {savedReveal && !changeVisibility.isPending && !changeVisibility.error && (
            <p role="status" className="mt-3 text-sm" data-testid="drive-target-reveal-saved">
              {t('driveTarget.result.revealSaved')}
            </p>
          )}
        </section>
      )}
    </div>
  );
}
