// Declare-degraded-mode form (Story 5.8, Task 6; AC4 #10).
//
// Mode select (single v1 option) + optional expiry (datetime-local → ISO) + reason, POSTing the declaration.
// Deliberately MINIMAL (AC4): no Epic-10 polish. `effectiveFrom` is NOT a field — it defaults to now
// server-side (NO BACKDATING is enforced by the contract + server). A blank expiry ⇒ open-ended until
// revocation. Mirrors the channel-config forms' RHF shape, mapping a datetime-local input to the
// Iso8601 the contract validates.

import type { DegradedModeDeclareRequest } from '@twt/contracts';
import type { ReactElement } from 'react';
import { useForm } from 'react-hook-form';

interface DeclareFormValues {
  mode: 'cycle_open_sms_bridge';
  /** A datetime-local string (e.g. "2026-07-08T14:30"), or '' for open-ended. */
  expiresAtLocal: string;
  reason: string;
}

export interface DeclareFormProps {
  onSubmit: (payload: DegradedModeDeclareRequest) => void;
  pending: boolean;
  submitError?: string;
}

export function DeclareForm({ onSubmit, pending, submitError }: DeclareFormProps): ReactElement {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<DeclareFormValues>({
    defaultValues: { mode: 'cycle_open_sms_bridge', expiresAtLocal: '', reason: '' },
  });

  const submit = handleSubmit((values) => {
    // datetime-local has no timezone; interpret in the browser's local zone and emit an offset-bearing ISO.
    if (!values.expiresAtLocal) {
      onSubmit({ mode: values.mode, expiresAt: null, reason: values.reason.trim() });
      return;
    }
    const parsed = new Date(values.expiresAtLocal);
    if (Number.isNaN(parsed.getTime())) {
      setError('expiresAtLocal', { message: 'Enter a valid date and time.' });
      return;
    }
    onSubmit({ mode: values.mode, expiresAt: parsed.toISOString(), reason: values.reason.trim() });
  });

  return (
    <form className="flex flex-col gap-3" onSubmit={(e) => void submit(e)} aria-label="Declare degraded mode">
      <div className="flex flex-col gap-1">
        <label htmlFor="mode" className="text-sm font-medium">Mode</label>
        <select id="mode" className="rounded border px-2 py-1" {...register('mode')} data-testid="degraded-mode-mode">
          <option value="cycle_open_sms_bridge">Cycle-open SMS bridge</option>
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="expiresAtLocal" className="text-sm font-medium">Expires at (optional)</label>
        <input
          id="expiresAtLocal"
          type="datetime-local"
          className="rounded border px-2 py-1"
          {...register('expiresAtLocal')}
          data-testid="degraded-mode-expires"
        />
        <p className="text-xs opacity-60">Leave blank for open-ended (active until manually revoked).</p>
        {errors.expiresAtLocal && (
          <p role="alert" className="text-sm text-status-fail-fg">{errors.expiresAtLocal.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="reason" className="text-sm font-medium">Reason</label>
        <textarea
          id="reason"
          className="rounded border px-2 py-1"
          rows={2}
          {...register('reason', { required: 'A reason is required.', maxLength: { value: 2000, message: 'Too long.' } })}
          data-testid="degraded-mode-reason"
        />
        {errors.reason && <p role="alert" className="text-sm text-status-fail-fg">{errors.reason.message}</p>}
      </div>

      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="rounded bg-black px-4 py-2 text-white disabled:opacity-60"
        data-testid="degraded-mode-declare-submit"
      >
        {pending ? 'Declaring…' : 'Declare degraded mode'}
      </button>

      {submitError && <p role="alert" className="text-sm text-status-fail-fg">{submitError}</p>}
    </form>
  );
}
