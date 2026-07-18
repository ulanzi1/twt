// Trustee fixed-amount schedule page — Story 7.5 (Task 6; AC1/AC3). The [SURFACE] demoable.
//
// Shows the current effective amount + the full schedule history (standard + emergency, with the
// immutable Emergency Adjustment Records read-only), a standard-change form (a date picker enforcing
// the +365d floor client-side — the server is the REAL gate), and an emergency-override form
// (documented-reason + panel roster + step-up prompt). `pariwarId` is a prop (from the route) so the
// page is testable without a router (the CycleFreezePage precedent). NO client-side grant gate —
// both keys are per-Pariwar grants, so the REAL boundary is the server's requirePermissionHook (+
// requireStepUp on the emergency route); a non-holder / un-elevated actor sees the API 403 here.

import type { ReactElement } from 'react';
import { useState } from 'react';

import { ApiError } from '../../api/client.js';
import {
  useApplyFixedAmountEmergency,
  useFixedAmountView,
  useRequestStepUp,
  useScheduleFixedAmountChange,
  useVerifyStepUp,
} from '../../api/hooks.js';

export interface FixedAmountPageProps {
  pariwarId: string;
}

/** The step-up action context the emergency route is gated on (must match the server's requireStepUp arg). */
const EMERGENCY_STEP_UP_CONTEXT = 'pool_fixed_amount_emergency';

function errorMessage(error: unknown): string | undefined {
  if (!error) return undefined;
  if (error instanceof ApiError) return `${error.code}: ${error.message}`;
  return error instanceof Error ? error.message : 'Something went wrong.';
}

/** A `Date` N days from now, formatted for a `datetime-local` input (`YYYY-MM-DDTHH:mm`). */
function localDatetimeInDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 16);
}

/** A local ISO string ~366 days out — the default the standard-change date picker suggests (server re-checks). */
function defaultStandardEffectiveFrom(): string {
  return localDatetimeInDays(366);
}

/** The `min` attribute for the standard-change picker — 365 days out (the server's real floor; the
 *  picker rejects an earlier pick client-side instead of only discovering it after a round-trip 400). */
const STANDARD_EFFECTIVE_FROM_MIN = localDatetimeInDays(365);

export function FixedAmountPage({ pariwarId }: FixedAmountPageProps): ReactElement {
  const view = useFixedAmountView(pariwarId);
  const standard = useScheduleFixedAmountChange(pariwarId);
  const emergency = useApplyFixedAmountEmergency(pariwarId);
  const requestStepUp = useRequestStepUp();
  const verifyStepUp = useVerifyStepUp();

  // Standard-change form.
  const [stdAmount, setStdAmount] = useState('');
  const [stdEffectiveFrom, setStdEffectiveFrom] = useState(() => defaultStandardEffectiveFrom());

  // Emergency-override form.
  const [emgAmount, setEmgAmount] = useState('');
  const [emgEffectiveFrom, setEmgEffectiveFrom] = useState(() => new Date().toISOString().slice(0, 16));
  const [emgReason, setEmgReason] = useState('');
  const [emgPanel, setEmgPanel] = useState(''); // newline/comma-separated actor UUIDs

  const [stepUpRequired, setStepUpRequired] = useState(false);
  const [otp, setOtp] = useState('');

  const submitStandard = (): void => {
    const amount = Number(stdAmount);
    if (!Number.isInteger(amount) || amount <= 0) return;
    if (!stdEffectiveFrom) return; // an emptied date field must not reach `new Date('')` (Invalid Date)
    standard.mutate({ fixed_amount: amount, effective_from: new Date(stdEffectiveFrom).toISOString() });
  };

  const panelActorIds = (): string[] => {
    const ids = emgPanel
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    return [...new Set(ids)]; // de-dupe client-side (the server rejects duplicates outright)
  };

  const runEmergency = (): void => {
    const amount = Number(emgAmount);
    if (!Number.isInteger(amount) || amount <= 0) return;
    if (!emgEffectiveFrom) return; // an emptied date field must not reach `new Date('')` (Invalid Date)
    const panel = panelActorIds();
    // A lone actor is not a "panel" (POOL_FIXED_AMOUNT_PANEL_MIN — server rejects too).
    if (panel.length < 2 || emgReason.trim() === '') return;
    emergency.mutate(
      {
        fixed_amount: amount,
        effective_from: new Date(emgEffectiveFrom).toISOString(),
        documented_reason: emgReason.trim(),
        panel_actor_ids: panel,
      },
      {
        onSuccess: () => {
          setStepUpRequired(false);
          setOtp('');
          requestStepUp.reset();
        },
        onError: (err) => {
          // A step-up-required 403 is the SIGNAL to elevate — not a hard error (the cycle-freeze precedent).
          if (err instanceof ApiError && err.code === 'auth.step_up_required') setStepUpRequired(true);
        },
      },
    );
  };

  const verify = (): void => {
    const code = otp.trim();
    if (code === '') return;
    verifyStepUp.mutate(code, {
      onSuccess: () => {
        setStepUpRequired(false);
        setOtp('');
        requestStepUp.reset();
        runEmergency(); // re-submit the emergency override now that the session is elevated
      },
    });
  };

  const data = view.data;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-lg font-semibold">Fixed contribution amount — schedule &amp; changes</h1>
        <p className="text-sm opacity-70">
          The per-pool contribution amount snapshotted at spawn. Standard changes must be announced at least
          12 months in advance (FR-15); the emergency override bypasses that notice and requires a
          step-up-attested State-Trustee panel sign-off.
        </p>
      </header>

      {view.isLoading ? (
        <p role="status">Loading schedule…</p>
      ) : view.isError ? (
        <p role="alert" className="text-status-fail-fg">
          {errorMessage(view.error)}
        </p>
      ) : (
        <>
          <section aria-label="Current effective amount" className="rounded border p-4">
            <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide opacity-70">Effective now</h2>
            {data && data.effective_amount !== null ? (
              <p className="text-sm">
                ₹{data.effective_amount} (schedule version {data.effective_version})
              </p>
            ) : (
              <p className="text-sm text-status-warn-fg">
                No effective amount configured — pool spawn will fail until a change is scheduled.
              </p>
            )}
          </section>

          <section aria-label="Standard change" className="rounded border p-4">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide opacity-70">
              Schedule a standard change (12-month notice)
            </h2>
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex flex-col text-xs">
                <span className="opacity-70">New amount (₹, whole rupees)</span>
                <input
                  className="rounded border px-2 py-1 text-sm"
                  inputMode="numeric"
                  value={stdAmount}
                  onChange={(e) => setStdAmount(e.target.value)}
                />
              </label>
              <label className="flex flex-col text-xs">
                <span className="opacity-70">Effective from (≥ 365 days out)</span>
                <input
                  type="datetime-local"
                  className="rounded border px-2 py-1 text-sm"
                  min={STANDARD_EFFECTIVE_FROM_MIN}
                  value={stdEffectiveFrom}
                  onChange={(e) => setStdEffectiveFrom(e.target.value)}
                />
              </label>
              <button
                type="button"
                className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
                disabled={standard.isPending}
                onClick={submitStandard}
              >
                Schedule change
              </button>
            </div>
            {standard.isSuccess && (
              <p role="status" className="mt-2 text-sm text-status-ok-fg">
                Scheduled version {standard.data?.entry.version} — ₹{standard.data?.entry.fixed_amount} effective{' '}
                {standard.data ? new Date(standard.data.entry.effective_from).toLocaleDateString() : ''}.
              </p>
            )}
            {standard.isError && (
              <p role="alert" className="mt-2 text-sm text-status-fail-fg">
                {errorMessage(standard.error)}
              </p>
            )}
          </section>

          <section aria-label="Emergency override" className="rounded border border-status-warn-fg p-4">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide opacity-70">
              Emergency adjustment override
            </h2>
            <p className="mb-2 text-xs text-status-warn-fg">
              The documented reason MUST be a policy/operational justification — reserve adequacy, inflation,
              regulatory change, actuarial review, or financial sustainability — and MUST NOT contain any
              member-specific information. This is a permanent, immutable attestation record.
            </p>
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-end gap-3">
                <label className="flex flex-col text-xs">
                  <span className="opacity-70">New amount (₹, whole rupees)</span>
                  <input
                    className="rounded border px-2 py-1 text-sm"
                    inputMode="numeric"
                    value={emgAmount}
                    onChange={(e) => setEmgAmount(e.target.value)}
                  />
                </label>
                <label className="flex flex-col text-xs">
                  <span className="opacity-70">Effective from (may be immediate)</span>
                  <input
                    type="datetime-local"
                    className="rounded border px-2 py-1 text-sm"
                    value={emgEffectiveFrom}
                    onChange={(e) => setEmgEffectiveFrom(e.target.value)}
                  />
                </label>
              </div>
              <label className="flex flex-col text-xs">
                <span className="opacity-70">Documented reason (policy/operational only — never member-specific)</span>
                <textarea
                  className="rounded border px-2 py-1 text-sm"
                  rows={2}
                  value={emgReason}
                  onChange={(e) => setEmgReason(e.target.value)}
                />
              </label>
              <label className="flex flex-col text-xs">
                <span className="opacity-70">
                  Attesting panel — State-Trustee actor IDs, at least 2 distinct (comma/newline-separated)
                </span>
                <textarea
                  className="rounded border px-2 py-1 font-mono text-xs"
                  rows={2}
                  value={emgPanel}
                  onChange={(e) => setEmgPanel(e.target.value)}
                />
              </label>
              <button
                type="button"
                className="w-fit rounded bg-status-fail-fg px-4 py-2 text-sm text-white disabled:opacity-50"
                disabled={emergency.isPending}
                onClick={runEmergency}
              >
                Apply emergency override
              </button>
            </div>

            {stepUpRequired && (
              <div className="mt-3 flex flex-col gap-2 rounded border border-dashed p-3">
                <p className="text-sm">This action requires step-up verification.</p>
                <button
                  type="button"
                  className="w-fit rounded border px-3 py-1 text-sm disabled:opacity-50"
                  disabled={requestStepUp.isPending}
                  onClick={() => requestStepUp.mutate(EMERGENCY_STEP_UP_CONTEXT)}
                >
                  Send verification code
                </button>
                {requestStepUp.isSuccess && (
                  <div className="flex items-end gap-2">
                    <label className="flex flex-col text-xs">
                      <span className="opacity-70">Enter code</span>
                      <input
                        className="rounded border px-2 py-1 text-sm"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                      />
                    </label>
                    <button
                      type="button"
                      className="rounded bg-black px-3 py-1 text-sm text-white disabled:opacity-50"
                      disabled={verifyStepUp.isPending || otp.trim() === ''}
                      onClick={verify}
                    >
                      Verify &amp; apply
                    </button>
                  </div>
                )}
                {errorMessage(verifyStepUp.error) && (
                  <p role="alert" className="text-xs text-status-fail-fg">
                    {errorMessage(verifyStepUp.error)}
                  </p>
                )}
              </div>
            )}

            {emergency.isSuccess && (
              <p role="status" className="mt-2 text-sm text-status-ok-fg">
                Emergency override applied — version {emergency.data?.entry.version}, ₹
                {emergency.data?.entry.fixed_amount}.
              </p>
            )}
            {emergency.isError &&
              !(emergency.error instanceof ApiError && emergency.error.code === 'auth.step_up_required') && (
                <p role="alert" className="mt-2 text-sm text-status-fail-fg">
                  {errorMessage(emergency.error)}
                </p>
              )}
          </section>

          <section aria-label="Schedule history" className="rounded border p-4">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide opacity-70">Schedule history</h2>
            {!data || data.schedule.length === 0 ? (
              <p className="text-sm opacity-60">No schedule entries yet.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {data.schedule.map((entry) => (
                  <li key={entry.version} className="rounded border p-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">v{entry.version}</span>
                      <span>₹{entry.fixed_amount}</span>
                      <span
                        className={
                          entry.change_type === 'emergency'
                            ? 'rounded bg-status-fail-fg px-1.5 py-0.5 text-xs text-white'
                            : 'rounded border px-1.5 py-0.5 text-xs opacity-70'
                        }
                      >
                        {entry.change_type}
                      </span>
                      <span className="text-xs opacity-60">
                        {new Date(entry.effective_from).toLocaleDateString()} →{' '}
                        {entry.effective_until ? new Date(entry.effective_until).toLocaleDateString() : 'open'}
                      </span>
                    </div>
                    {entry.emergency_record && (
                      <div className="mt-2 rounded bg-black/5 p-2 text-xs">
                        <p className="font-semibold">Emergency Adjustment Record (immutable)</p>
                        <p>Reason: {entry.emergency_record.documented_reason}</p>
                        <p>
                          Attested by {entry.emergency_record.attested_display} on{' '}
                          {new Date(entry.emergency_record.attested_at).toLocaleString()}
                        </p>
                        <p>
                          Panel:{' '}
                          {entry.emergency_record.panel.map((m) => m.actor_display).join(', ')}
                        </p>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {data?.schedule_has_more && (
              <p className="mt-2 text-xs opacity-60">Older entries exist and are not shown on this page.</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
