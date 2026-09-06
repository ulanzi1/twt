// Drive-target REVEAL switches (Story 11b.13, Task 4; AC3, AC4, AC5).
//
// ⛔⛔ `super_admin` ONLY. `2026-09-04-190` **cl.7(c)** reserves REVEALING the target to the Trust,
// while cl.7(a) gives SETTING it to the Pariwar Admin. ⚠ This component is rendered ⛔ only when the
// SERVER answered the visibility read — a `pariwar_admin` gets a **403** there and never sees this
// section at all. ⭐ AC5's *"visible only to a super_admin"* is therefore satisfied by the server's
// answer, ⛔ never by a client-side role check (which could not work anyway: both keys are
// pariwar-dimension and never appear in a session's global grant set).
//
// ⭐⭐ TWO INDEPENDENT SWITCHES, ⛔ NOT A TRI-STATE AND ⛔ NOT ORDERED LEVELS. Three of the four
// combinations are legal, and revealing to members without revealing publicly is the ORDINARY case.
// ⛔ Do not "simplify" this into one select — the two decisions are separable by ruling.
//
// ⚠ THE ONE REFUSED COMBINATION is surfaced HERE, in the form, rather than only discovered as a 422:
// public-revealed while members are hidden would show the unauthenticated internet MORE than a
// member of the Pariwar the figure belongs to (`2026-09-04-189` cl.3). ⚠ The client guard is a
// COURTESY; the boundary is the domain refusal AND a DB CHECK. ⛔ Do not remove either believing
// this covers it.

import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import { resolveEn as t } from './i18n-en.js';

export interface RevealSwitchesFormProps {
  onSubmit: (payload: {
    visibility: { revealToMembers: boolean; revealToPublic: boolean };
    rationale: string;
  }) => void;
  pending: boolean;
  submitError?: string;
  /** The reveal posture currently recorded. An unconfigured Pariwar is `false` / `false`. */
  current: { revealToMembers: boolean; revealToPublic: boolean };
  resetToken: number;
}

interface FormValues {
  rationale: string;
}

export function RevealSwitchesForm({
  onSubmit,
  pending,
  submitError,
  current,
  resetToken,
}: RevealSwitchesFormProps): ReactElement {
  const [revealToMembers, setRevealToMembers] = useState(current.revealToMembers);
  const [revealToPublic, setRevealToPublic] = useState(current.revealToPublic);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ defaultValues: { rationale: '' }, mode: 'onChange' });

  // ⭐ Re-seeds from the RECORDED posture on a save and whenever it changes — the form must show the
  // truth, for the same reason the target form does. ⚠ `rationale` is always blank: a justification
  // for a disclosure decision belongs to ONE decision.
  useEffect(() => {
    setRevealToMembers(current.revealToMembers);
    setRevealToPublic(current.revealToPublic);
    reset({ rationale: '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset() runs on an explicit parent bump or a change in the recorded posture
  }, [resetToken, current.revealToMembers, current.revealToPublic]);

  // ⛔ `member ≥ public` — the ONE forbidden combination. ⚠ ONE-WAY: members-without-public is never
  // refused.
  const orderInvalid = revealToPublic && !revealToMembers;

  const submit = handleSubmit((values) => {
    onSubmit({
      visibility: { revealToMembers, revealToPublic },
      rationale: values.rationale.trim(),
    });
  });

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => void submit(e)}
      aria-label={t('driveTarget.reveal.heading')}
    >
      <p className="text-sm">{t('driveTarget.reveal.intro')}</p>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={revealToMembers}
          onChange={(e) => setRevealToMembers(e.target.checked)}
          data-testid="drive-target-reveal-members"
        />
        {t('driveTarget.reveal.members')}
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={revealToPublic}
          onChange={(e) => setRevealToPublic(e.target.checked)}
          data-testid="drive-target-reveal-public"
        />
        {t('driveTarget.reveal.public')}
      </label>
      <p className="text-xs opacity-60">{t('driveTarget.reveal.orderHint')}</p>
      {orderInvalid && (
        <p role="alert" className="text-sm text-status-fail-fg" data-testid="drive-target-reveal-order-error">
          {t('driveTarget.reveal.orderInvalid')}
        </p>
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor="dt-reveal-rationale" className="text-sm font-medium">
          {t('driveTarget.reveal.rationaleLabel')}
        </label>
        <textarea
          id="dt-reveal-rationale"
          className="rounded border px-2 py-1"
          rows={3}
          {...register('rationale', {
            required: t('driveTarget.form.rationaleRequired'),
            maxLength: { value: 2000, message: t('driveTarget.form.rationaleTooLong') },
          })}
          data-testid="drive-target-reveal-rationale"
        />
        <p className="text-xs opacity-60">{t('driveTarget.reveal.rationaleHint')}</p>
        {errors.rationale && (
          <p role="alert" className="text-sm text-status-fail-fg">
            {errors.rationale.message}
          </p>
        )}
      </div>

      {/*
        ⚠⛔ THE HONEST NOTE, and it is ⛔ not optional. Nothing renders the target today — Story
        11b.14 builds the first consumer. An operator who reveals it, goes looking for it on the
        public page and finds nothing must ⛔ not conclude the switch failed.
      */}
      <p className="text-xs opacity-70" data-testid="drive-target-reveal-no-consumer">
        {t('driveTarget.reveal.noConsumerNote')}
      </p>

      <button
        type="submit"
        disabled={pending || orderInvalid}
        aria-busy={pending}
        className="rounded bg-black px-4 py-2 text-white disabled:opacity-60"
        data-testid="drive-target-reveal-submit"
      >
        {pending ? t('driveTarget.reveal.submitPending') : t('driveTarget.reveal.submit')}
      </button>

      {submitError && (
        <p role="alert" className="text-sm text-status-fail-fg" data-testid="drive-target-reveal-error">
          {submitError}
        </p>
      )}
    </form>
  );
}
