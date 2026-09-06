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
import { useEffect, useRef, useState } from 'react';
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
  /** ⭐ Fired the instant an edit begins — the parent drops a stale "Saved" line (code review Pass 3). */
  onEdit?: () => void;
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
  onEdit,
}: RevealSwitchesFormProps): ReactElement {
  const [revealToMembers, setRevealToMembers] = useState(current.revealToMembers);
  const [revealToPublic, setRevealToPublic] = useState(current.revealToPublic);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<FormValues>({ defaultValues: { rationale: '' }, mode: 'onChange' });
  const [changedUnderEdit, setChangedUnderEdit] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  // ⭐ Re-seeds from the RECORDED posture on a save and whenever it changes — the form must show the
  // truth, for the same reason the target form does. ⚠ `rationale` is always blank: a justification
  // for a disclosure decision belongs to ONE decision.
  // ⚠⛔ RE-SEED ONLY AN UNTOUCHED FORM (Pass 2 / G3, decision D-C — BigDev option 2). ⛔ This used to
  // reset BOTH toggles AND the rationale on every change of the recorded posture, so a background
  // refetch wiped a disclosure decision the operator was in the middle of making. ⭐ On THIS form it
  // was worse than on its sibling: the Save button's `disabled` omits a rationale check, so after
  // the wipe the operator could submit a BLANK rationale on the disclosure control.
  const touched =
    isDirty || revealToMembers !== current.revealToMembers || revealToPublic !== current.revealToPublic;
  useEffect(() => {
    setRevealToMembers(current.revealToMembers);
    setRevealToPublic(current.revealToPublic);
    setChangedUnderEdit(false);
    setSubmitAttempted(false);
    reset({ rationale: '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- an explicit parent bump after a save
  }, [resetToken]);

  useEffect(() => {
    if (touched) {
      setChangedUnderEdit(true);
      return;
    }
    setRevealToMembers(current.revealToMembers);
    setRevealToPublic(current.revealToPublic);
    reset({ rationale: '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `touched` is read, not depended on
  }, [current.revealToMembers, current.revealToPublic]);

  // ⭐ Tell the parent the moment an edit begins, so a stale "Saved" line from the PREVIOUS
  // disclosure change stops rendering above this unsaved one (code review Pass 3). Read through a
  // ref so an inline parent closure does not re-fire the effect.
  const onEditRef = useRef(onEdit);
  onEditRef.current = onEdit;
  useEffect(() => {
    if (touched) onEditRef.current?.();
  }, [touched]);

  // ⛔ `member ≥ public` — the ONE forbidden combination. ⚠ ONE-WAY: members-without-public is never
  // refused.
  const orderInvalid = revealToPublic && !revealToMembers;
  // ⚠⛔ REACT-HOOK-FORM'S `required` DOES ⛔ NOT TRIM (verified in the installed 7.79.0: `isEmpty`
  // tests `=== ''`), so `'   '` PASSED it — and this button's `disabled` omitted a rationale check
  // entirely, unlike its sibling's. ⇒ a whitespace-only rationale was submittable on the DISCLOSURE
  // control, and the server's 400 rendered as *"check that the AMOUNT is a whole number of rupees …
  // and that the reason is not excessively LONG"* — on a form with no amount field, telling the
  // operator their EMPTY reason was too LONG. (Pass 2 / G3.)
  const rationaleIsBlank = (watch('rationale') ?? '').trim() === '';
  const blocked = pending || orderInvalid || rationaleIsBlank;
  const blockedReason = pending
    ? undefined
    : orderInvalid
      ? t('driveTarget.reveal.orderInvalid')
      : rationaleIsBlank
        ? t('driveTarget.form.blockedNeedsRationale')
        : undefined;

  const submit = handleSubmit((values) => {
    setSubmitAttempted(true);
    // ⛔ The button's `disabled` is a COURTESY, ⛔ not the guard: `handleSubmit` validates only the
    // registered `rationale`, so an implicit Enter submit / re-enable race could still fire the ONE
    // forbidden combination (public-revealed while members hidden) and get a generic 422 instead of
    // the inline message. The domain refusal + DB CHECK stay the boundary. 2026-09-06 review.
    if (orderInvalid) return;
    if (pending) return;
    // ⭐ Trimmed HERE too — RHF's `required` cannot see whitespace.
    if (values.rationale.trim() === '') return;
    // ⭐⭐ ⛔ NO DIRTY CHECK, DELIBERATELY — decision **D-D** (BigDev, 2026-09-06). Re-affirming an
    // unchanged posture with a fresh rationale IS a governed act. ⛔ Do not add one without a
    // decision entry. See `DriveTargetForm` for the full statement of the accepted cost.
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

      {/*
        ⭐⭐ FAMILY 13(d), THE SHARPEST INSTANCE. `orderInvalid` is a state AC4 RATIFIES as reachable
        and a test PINS — and ⛔ NEITHER checkbox the operator must change to clear it was marked
        invalid or linked to the message. ⇒ a screen-reader user heard the alert once, then found
        two unremarkable checkboxes with no route back to why. `aria-describedby` also finally binds
        `orderHint` (the `member ≥ public` rule) and `noConsumerNote` — the honesty note this story
        calls "⛔ not optional" — to the controls, so someone who tabs straight here meets them.
      */}
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={revealToMembers}
          onChange={(e) => setRevealToMembers(e.target.checked)}
          aria-invalid={orderInvalid}
          aria-describedby={
            orderInvalid
              ? 'dt-reveal-order-hint dt-reveal-order-error dt-reveal-no-consumer'
              : 'dt-reveal-order-hint dt-reveal-no-consumer'
          }
          data-testid="drive-target-reveal-members"
        />
        {t('driveTarget.reveal.members')}
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={revealToPublic}
          onChange={(e) => setRevealToPublic(e.target.checked)}
          aria-invalid={orderInvalid}
          aria-describedby={
            orderInvalid
              ? 'dt-reveal-order-hint dt-reveal-order-error dt-reveal-no-consumer'
              : 'dt-reveal-order-hint dt-reveal-no-consumer'
          }
          data-testid="drive-target-reveal-public"
        />
        {t('driveTarget.reveal.public')}
      </label>
      <p id="dt-reveal-order-hint" className="text-xs opacity-60">
        {t('driveTarget.reveal.orderHint')}
      </p>
      {orderInvalid && (
        <p
          id="dt-reveal-order-error"
          role="alert"
          className="text-sm text-status-fail-fg"
          data-testid="drive-target-reveal-order-error"
        >
          {t('driveTarget.reveal.orderInvalid')}
        </p>
      )}
      {changedUnderEdit && (
        <p
          role="status"
          className="rounded border border-status-warn-fg/40 bg-status-warn-fg/5 p-2 text-sm"
          data-testid="drive-target-reveal-changed-under-edit"
        >
          {t('driveTarget.reveal.changedUnderEdit')}
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
          aria-invalid={errors.rationale !== undefined || (submitAttempted && rationaleIsBlank)}
          aria-describedby={
            errors.rationale
              ? 'dt-reveal-rationale-hint dt-reveal-rationale-error'
              : 'dt-reveal-rationale-hint'
          }
          data-testid="drive-target-reveal-rationale"
        />
        <p id="dt-reveal-rationale-hint" className="text-xs opacity-60">
          {t('driveTarget.reveal.rationaleHint')}
        </p>
        {errors.rationale && (
          <p id="dt-reveal-rationale-error" role="alert" className="text-sm text-status-fail-fg">
            {errors.rationale.message}
          </p>
        )}
      </div>

      {/*
        ⚠⛔ THE HONEST NOTE, and it is ⛔ not optional. Nothing renders the target today — Story
        11b.14 builds the first consumer. An operator who reveals it, goes looking for it on the
        public page and finds nothing must ⛔ not conclude the switch failed.
      */}
      <p
        id="dt-reveal-no-consumer"
        className="text-xs opacity-70"
        data-testid="drive-target-reveal-no-consumer"
      >
        {t('driveTarget.reveal.noConsumerNote')}
      </p>

      {/* ⚠ `aria-disabled`, ⛔ not `disabled` — see `DriveTargetForm` for why. */}
      <button
        type="submit"
        aria-disabled={blocked}
        aria-busy={pending}
        aria-describedby={blockedReason ? 'dt-reveal-submit-blocked' : undefined}
        className="rounded bg-black px-4 py-2 text-white aria-disabled:opacity-60"
        data-testid="drive-target-reveal-submit"
      >
        {pending ? t('driveTarget.reveal.submitPending') : t('driveTarget.reveal.submit')}
      </button>
      {blockedReason && (
        <p id="dt-reveal-submit-blocked" role="status" className="text-xs opacity-70">
          {blockedReason}
        </p>
      )}

      {submitError && (
        <p role="alert" className="text-sm text-status-fail-fg" data-testid="drive-target-reveal-error">
          {submitError}
        </p>
      )}
    </form>
  );
}
