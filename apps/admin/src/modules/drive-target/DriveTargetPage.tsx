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
import { useEffect, useRef, useState } from 'react';

import { ApiError } from '../../api/client.js';
import {
  newIdempotencyKey,
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
    // ⭐⭐ 404 IS A DENIAL, ⛔ NOT A FAULT (code review Pass 2 / G3). The API documents it as a
    // DIFFERENT LAYER from the 403: *404 = "this Pariwar is not yours"; 403 = "it is yours, but you
    // lack this key"*. ⛔ It used to fall through to `unexpected`, which told the operator the server
    // had failed and a reload would help — both false, and the reload loops forever.
    if (error.status === 404) return t('driveTarget.error.notYours');
    if (error.status === 400) {
      // ⚠ THREE registered 400s share a status. Two of them the operator ⛔ CANNOT act on, and the
      // amount-shaped copy actively misleads: they edit the amount, resubmit, it succeeds for an
      // unrelated reason, and they learn a false lesson.
      const code = error.code ?? '';
      if (code === 'pariwar.drive_target_idempotency_key_invalid') {
        return t('driveTarget.error.idempotencyKeyInvalid');
      }
      if (code === 'pariwar.drive_target_effective_from_skew') {
        return t('driveTarget.error.clockSkew');
      }
      return t('driveTarget.error.invalid');
    }
    if (error.status === 409) {
      // ⚠ THREE different 409s share a status and must NOT share copy. Each is branched on its
      // registered code; an unrecognised 409 falls through to the generic copy rather than asserting
      // a specific (probably wrong) cause — the mistake this branch made before 2026-09-06, when
      // anything that was not the version conflict was labelled "your display name is missing".
      const code = error.code ?? '';
      if (code === 'pariwar.drive_target_version_conflict') {
        return t('driveTarget.error.versionConflict');
      }
      if (code === 'pariwar.drive_target_idempotency_in_progress') {
        return t('driveTarget.error.idempotencyInProgress');
      }
      if (code === 'admin.display_name_missing') {
        return t('driveTarget.error.displayNameMissing');
      }
      return t('driveTarget.error.unexpected');
    }
    if (error.status === 422) {
      const code = error.code ?? '';
      if (code === 'pariwar.drive_target_visibility_invalid') {
        return t('driveTarget.error.visibilityInvalid');
      }
      return t('driveTarget.error.invalid');
    }
    // ⭐ 503 — the store could not record the idempotency result. The server's own message is
    // *"retry with the same Idempotency-Key"*, and the write MAY ALREADY HAVE LANDED. ⛔ Telling the
    // operator to RELOAD here is the wrong instruction: the key is held across retries precisely so
    // that pressing Save again is the safe action.
    if (error.status === 503) return t('driveTarget.error.retryable');
    // ⭐ 401 — the session expired. ⚠⛔ It used to fall through to `unexpected`, which asserts TWO
    // things that are false for a 401: nothing went wrong ON THE SERVER, and the change was
    // definitively ⛔ NOT saved (there is no "may"). Its instructed remedy also destroys the
    // operator's work — reloading errors the session query and the route bounces to /login, taking
    // the typed amount and rationale with it, after calling the reload a "check".
    if (error.status === 401) return t('driveTarget.error.sessionExpired');
    // Anything else is genuinely unexpected — curated copy, ⛔ not the raw server code/message.
    return t('driveTarget.error.unexpected');
  }
  // ⚠⛔ ⛔ NEVER RENDER A RAW `Error.message` (Pass 2 / G3). Three reachable producers are ⛔ not
  // `ApiError`: a network drop (the browser's "Failed to fetch" / "Load failed" — the MOST COMMON
  // console failure, which therefore ⛔ never reached the curated copy), a `ZodError` from contract
  // drift (a multi-line JSON dump rendered as the whole status region), and — before this pass —
  // `crypto.randomUUID is not a function` outside a secure context. The comment above promised
  // curated copy; this line used to do the opposite.
  return t('driveTarget.error.unreachable');
}

/** Indian-grouping rupee formatting for the status line. ⛔ Display only — never parsed back. */
function formatInr(amount: number): string {
  return new Intl.NumberFormat('en-IN').format(amount);
}

/**
 * ⭐ A provenance timestamp, WITH ITS ZONE (code review Pass 2 / G3).
 *
 * ⚠ `toLocaleString()` alone renders in the viewer's zone with ⛔ no offset shown, so two operators
 * in different zones read the SAME audit record as different times and ⛔ neither can tell — on a
 * screen whose stated purpose is provenance ("In force since", "Last changed").
 * ⭐ The `NaN` guard falling back to the raw ISO string is correct and stays.
 */
function formatTimestamp(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleString(undefined, { timeZoneName: 'short' });
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
  // ⭐⭐ ONE `Idempotency-Key` PER OPERATOR DECISION, held across their retries — the
  // `FeatureFlagsPage` / `CustomFieldsPage` pattern. ⚠⛔ The key used to be minted INSIDE the
  // mutation, i.e. fresh on every attempt, which defeated `-201` control #1 in the only case that
  // matters: a 503 whose server message is literally *"retry with the same Idempotency-Key"*, and a
  // double-submit that sent two keys with one `expectedVersion` and came back blaming a colleague.
  const targetIdemKeyRef = useRef<string | null>(null);
  const revealIdemKeyRef = useRef<string | null>(null);

  // Client-side nav between two Pariwars' pages does not remount this component — clear the
  // per-tenant "Saved" banners AND any stale mutation error / pending state so neither leaks from
  // the previous Pariwar's view into this one's fresh form (the form remounts via `key={pariwarId}`,
  // but the mutation objects do not). 2026-09-06 review.
  useEffect(() => {
    setSavedTarget(false);
    setSavedReveal(false);
    // ⚠ A tenant switch is a NEW decision — drop any key held for the previous Pariwar's.
    targetIdemKeyRef.current = null;
    revealIdemKeyRef.current = null;
    changeTarget.reset();
    changeVisibility.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset() is stable; this runs only on a tenant switch
  }, [pariwarId]);

  // ⭐⭐ A 403 HERE IS AN ORDINARY OUTCOME, ⛔ NOT AN ERROR TO RENDER. It means the operator holds
  // the target key and not the reveal key — i.e. they are a Pariwar Admin, which is the common case.
  // ⇒ the whole section is omitted. ⛔ Do not surface it as a page error.
  const revealForbidden =
    visibility.isError && visibility.error instanceof ApiError && visibility.error.status === 403;
  // ⭐⭐ A 404 IS ALSO A DENIAL, ⛔ NOT A LOAD FAILURE (Pass 2 / G3). `revealForbidden` keyed on 403
  // ALONE, so a wrong-tenant URL made `revealLoadError` true and the page announced *"This is not a
  // permissions problem"* about a condition that is PURELY authorization — while the status region
  // simultaneously blamed the server. Two contradictory messages, both false, plus a retry button
  // that could ⛔ never succeed.
  const revealNotYours =
    visibility.isError && visibility.error instanceof ApiError && visibility.error.status === 404;
  // ⚠ ONLY the 403 is the ruled "render nothing" outcome (a Pariwar Admin does not hold the reveal
  // key). Any OTHER error on the visibility read — a transient 500, a network drop, a 401 — must
  // surface as a retryable error, ⛔ not silently omit the whole section, which for a super_admin
  // would be indistinguishable from the ordinary 403. `retry: false` on the query means there is no
  // auto-recovery, so the retry has to be offered here. 2026-09-06 review.
  // ⚠⛔ THE OFFLINE / `paused` CELL (Pass 2 / G3). `createQueryClient` sets no `networkMode`, so the
  // default `'online'` PAUSES a fetch when connectivity drops — and a paused query has
  // `isLoading === false`, `isError === false`, `data === undefined`, a cell the old three-way
  // ternary ended in `: null`. ⇒ the reveal section rendered NOTHING, which for a `super_admin` is
  // BYTE-IDENTICAL to the ruled 403 — exactly the "indistinguishable from the ordinary 403" outcome
  // the retry affordance exists to prevent, with the retry button unreachable in the one state that
  // needs it. ⛔ Never let a paused query fall through to `null`.
  const targetPaused = target.fetchStatus === 'paused' && target.data === undefined;
  const revealPaused = visibility.fetchStatus === 'paused' && visibility.data === undefined;
  const revealLoadError = visibility.isError && !revealForbidden && !revealNotYours;
  // ⚠⛔ `revealForbidden` / `revealNotYours` MUST gate this too (code review Pass 3). A failed refetch
  // RETAINS `data`, so after a `super_admin` loaded the switches and a later refetch 403s (a grant
  // revoked mid-session, or any 403 blip — `refetchOnMount: 'always'` + `staleTime: 0` make refetches
  // routine), `visibility.data !== undefined` AND `revealForbidden` were BOTH true ⇒ the page rendered
  // "you don't hold the reveal control" AND the full editable form together. `revealStale` did not
  // catch it either — `revealLoadError` already excludes the 403.
  const showReveal = visibility.data !== undefined && !revealForbidden && !revealNotYours;
  // ⭐ A FAILED REFETCH RETAINS `data`, so an error and a live form can co-exist. The operator must
  // be told the values are stale rather than shown a red alert above a Save button they can press.
  const revealStale = revealLoadError && showReveal;
  const targetStale = target.isError && target.data !== undefined;

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
        {targetPaused ? (
          // ⭐ The offline cell — ⛔ never `null`. Says which state this is and that it resumes itself.
          <p role="status" data-testid="drive-target-status-offline">
            {t('driveTarget.status.offline')}
          </p>
        ) : target.isLoading ? (
          <p role="status">{t('driveTarget.status.loading')}</p>
        ) : target.isError && !targetStale ? (
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

      {/*
        ⚠⛔ A FAILED REFETCH RETAINS `data` (Pass 2 / G3), so `isError` and a populated form used to
        render TOGETHER: a red alert reading "the change may not have been saved" — voiced for a
        mutation the operator never made — directly above a live Save button whose `expectedVersion`
        came from the very read the page had just declared failed. ⇒ say the values are stale.
      */}
      {targetStale && (
        <p
          role="status"
          className="rounded border border-status-warn-fg/40 bg-status-warn-fg/5 p-3 text-sm"
          data-testid="drive-target-status-stale"
        >
          {t('driveTarget.status.stale')}
        </p>
      )}
      {target.data && (
        <section aria-label={t('driveTarget.form.heading')} className="rounded border p-4">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide opacity-70">
            {t('driveTarget.form.heading')}
          </h2>
          <DriveTargetForm
            key={pariwarId}
            currentTargetInr={target.data.targetInr}
            currentVersion={target.data.version}
            pending={changeTarget.isPending}
            submitError={errorMessage(changeTarget.error)}
            resetToken={targetResetToken}
            onEdit={() => setSavedTarget(false)}
            onSubmit={(payload) =>
              changeTarget.mutate(
                {
                  // ⚠ `seededVersion` is DESTRUCTURED OUT, ⛔ never spread into the body — the wire
                  // contract is `.strict()` and an unknown field is a 400.
                  body: {
                    targetInr: payload.targetInr,
                    rationale: payload.rationale,
                    // ⭐⭐ `expectedVersion` IS THE VERSION THE OPERATOR WAS SHOWN WHEN THEY BEGAN —
                    // `2026-09-05-201` cl.4. ⚠⛔ IT USED TO READ `target.data.version`, i.e. the
                    // FRESHEST query data at SUBMIT time (Pass 2 / G3). A background refetch
                    // therefore UPGRADED it silently, so a change made against a stale view
                    // SUCCEEDED and overwrote the other operator — while the page's own copy
                    // promised, unconditionally, that it would be refused instead.
                    // ⇒ the form captures the version at seed time and hands it back here.
                    expectedVersion: payload.seededVersion,
                  },
                  idempotencyKey: (targetIdemKeyRef.current ??= newIdempotencyKey()),
                },
                {
                  onSuccess: () => {
                    setSavedTarget(true);
                    // ⭐ One key per operator DECISION: cleared only on success, so every retry of
                    // THIS decision — including one the server asks for with a 503 — reuses it.
                    targetIdemKeyRef.current = null;
                    // Clears the form so a prior submit's text can never be silently resubmitted as
                    // the justification for a DIFFERENT target.
                    setTargetResetToken((n) => n + 1);
                  },
                },
              )
            }
          />
          {/* ⚠ Cleared by `onEdit` the instant a NEW edit begins (code review Pass 3), so "Saved.
              This is now the target of record" cannot sit beside an UNSAVED change. The Pass-2 /
              G3 `targetResetToken > 0` guard did NOT do this — that token only advances on a
              successful save — it is kept only to suppress the line before the first-ever save. */}
          {savedTarget && targetResetToken > 0 && !changeTarget.isPending && !changeTarget.error && (
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
      {/*
        ⚠⛔ `!revealForbidden` WAS DEAD here (Pass 2 / G3) — `revealForbidden` requires `isError`,
        which is mutually exclusive with `isLoading`. Dropped rather than left as a false guard.
        ⚠ The copy also used to raise a question the page then declined to answer: for a
        `pariwar_admin` — THE COMMON CASE — it announced "Checking whether you hold the reveal
        control…" and was then replaced by NOTHING. Raising it and going silent is worse than never
        raising it, so the standing notice below now carries the answer for the denied case.
      */}
      {visibility.isLoading && (
        <p role="status" data-testid="drive-target-reveal-loading">
          {t('driveTarget.reveal.loading')}
        </p>
      )}
      {revealPaused && (
        <p role="status" data-testid="drive-target-reveal-offline">
          {t('driveTarget.reveal.offline')}
        </p>
      )}
      {/*
        ⭐ THE ANSWER TO THE QUESTION THE LOADING LINE RAISES. A ruled 403 renders no CONTROL — that
        is AC5 — but silence about it is not the same thing as an answer, and this is the state the
        common-case operator lands in.
      */}
      {revealForbidden && (
        <p className="text-sm opacity-70" data-testid="drive-target-reveal-not-held">
          {t('driveTarget.reveal.notHeld')}
        </p>
      )}
      {revealNotYours && (
        <p role="alert" className="text-status-fail-fg" data-testid="drive-target-reveal-not-yours">
          {t('driveTarget.error.notYours')}
        </p>
      )}
      {revealLoadError && !revealStale && (
        <section aria-label={t('driveTarget.reveal.heading')} className="rounded border p-4">
          {/* ⭐ A heading, like every sibling section — it had an `aria-label` and none. */}
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide opacity-70">
            {t('driveTarget.reveal.heading')}
          </h2>
          <p
            role="alert"
            className="text-status-fail-fg"
            data-testid="drive-target-reveal-load-error"
          >
            {t('driveTarget.reveal.loadError')}
          </p>
          <button
            type="button"
            onClick={() => void visibility.refetch()}
            className="mt-2 rounded border px-3 py-1 text-sm"
            data-testid="drive-target-reveal-retry"
          >
            {t('driveTarget.reveal.retry')}
          </button>
        </section>
      )}
      {revealStale && (
        <p
          role="status"
          className="rounded border border-status-warn-fg/40 bg-status-warn-fg/5 p-3 text-sm"
          data-testid="drive-target-reveal-stale"
        >
          {t('driveTarget.reveal.stale')}
        </p>
      )}
      {/* ⚠ `showReveal && visibility.data` was redundant — `showReveal` IS that check. */}
      {showReveal && (
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
            onEdit={() => setSavedReveal(false)}
            onSubmit={(payload) =>
              changeVisibility.mutate(
                {
                  body: payload,
                  idempotencyKey: (revealIdemKeyRef.current ??= newIdempotencyKey()),
                },
                {
                  onSuccess: () => {
                    setSavedReveal(true);
                    revealIdemKeyRef.current = null;
                    setRevealResetToken((n) => n + 1);
                  },
                },
              )
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
