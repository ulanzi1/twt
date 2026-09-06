// Drive-target change form (Story 11b.13, Task 4; AC5).
//
// ⭐⭐ IT OPENS ON THE TRUTH, ⛔ never on a constant. Seeding a blank amount while the Pariwar has a
// target set shows an operator a control that looks like the current state and is not — the exact
// defect a review pass caught on the sibling masking form, where a pre-selected wrong default was
// SATISFIED by every other guard on the path (required rationale, audit anchor, the permission key)
// and could only be caught by the form showing the truth.
//
// ⚠ The disable-until-valid behaviour is a COURTESY, ⛔ not the boundary. The real rejection is the
// contract's `targetInr.positive()` and `rationale.trim().min(1)`, which answer a bad request with a
// 400 regardless of what this component allows. That server path stays reachable and is tested.
//
// ⛔ NO display-name field, and there never may be one — the acting admin's `users.display_name` is
// resolved server-side. ⛔ NO effective-from field either: a caller-supplied instant would let an
// operator BACK-DATE a target, retroactively re-characterising what was in force and when.
//
// ⭐⭐ AND IT CARRIES THE `expectedVersion` IT WAS HANDED, INVISIBLY. `2026-09-05-201` cl.4/cl.5: the
// version is DISPLAYED by the page above and SENT BACK by this form. ⛔ The alternative — dropping
// the version from the UI so it stops implying a guard — was REFUSED by that ruling: it removes the
// operator's provenance view in order to avoid building the guard, on the one surface whose stated
// purpose is provenance. ⛔ Do not make this a hidden input the operator can edit, and ⛔ do not
// default it to `null` when a target exists: that is precisely the stale-write the guard refuses.

import { MAX_DRIVE_TARGET_INR } from '@twt/contracts';
import type { ReactElement } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';

import { resolveEn as t } from './i18n-en.js';

/**
 * The data-sanity ceiling. ⛔ Not a policy ceiling.
 *
 * ⭐⭐ DERIVED FROM THE CONTRACT, ⛔ NOT RE-TYPED (code review Pass 2 / G3). It was a literal
 * `100_000_000` — the FOURTH copy of this number (domain constant, frozen migration `0115`,
 * `@twt/contracts`, here) with a fifth restated in prose in the error copy. G1 mechanized the
 * DB↔domain leg and G2 the contracts leg, each time calling the prose-only "keep in sync" comment
 * exactly the discipline mechanization replaces. ⇒ this leg is now mechanized by CONSTRUCTION: the
 * admin bundle already depends on `@twt/contracts`, so there is no copy left to drift.
 */
const MAX_TARGET = MAX_DRIVE_TARGET_INR;

export interface DriveTargetFormProps {
  /**
   * ⭐ `seededVersion` is the version THE OPERATOR WAS SHOWN when this form was seeded — ⛔ not the
   * freshest value at submit time. The page hands it straight back as `expectedVersion`. See the
   * re-seed effect for why the distinction is load-bearing.
   */
  onSubmit: (payload: {
    targetInr: number;
    rationale: string;
    seededVersion: number | null;
  }) => void;
  pending: boolean;
  submitError?: string;
  /**
   * The target CURRENTLY set, or `null` when the Pariwar has never set one.
   *
   * ⭐ `null` opens the field BLANK, ⛔ never `0`. Zero is not a legal target — Story 11b.14 divides
   * by this figure — and seeding it would put the strictest-looking value on screen as though it
   * were a default the code chose.
   */
  currentTargetInr: number | null;
  /** The `version` in force at seed time — echoed back as `expectedVersion` (`-201` cl.4). */
  currentVersion: number | null;
  /**
   * Bumped by the parent after every successful change. A stale rationale carried over in the
   * textarea would otherwise be silently resubmittable as the justification for a DIFFERENT target
   * on the very next click (the 10.30 review finding, which applies unchanged here).
   */
  resetToken: number;
}

interface FormValues {
  amount: string;
  rationale: string;
}

export function DriveTargetForm({
  onSubmit,
  pending,
  submitError,
  currentTargetInr,
  currentVersion,
  resetToken,
}: DriveTargetFormProps): ReactElement {
  const seed = currentTargetInr === null ? '' : String(currentTargetInr);
  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    defaultValues: { amount: seed, rationale: '' },
    mode: 'onChange',
  });
  // ⭐ The version as of the last SEED — what `expectedVersion` must carry.
  const seededVersionRef = useRef<number | null>(currentVersion);
  // Set when a refetch brings a different target while the operator is mid-edit.
  const [changedUnderEdit, setChangedUnderEdit] = useState(false);
  // ⭐ Set on the first submit attempt so a blank form explains BOTH of its problems, not one.
  const [submitAttempted, setSubmitAttempted] = useState(false);

  // ⚠ Re-seeds on `resetToken` (after a successful save) AND whenever the target in force changes —
  // ⛔ the second dependency is not optional: after a save the freshly-refetched target IS the new
  // truth, and resetting to a stale seed would put the form back into the same lying state this
  // component exists to prevent.
  // ⚠ `rationale` is ALWAYS blank — ⛔ never seeded and ⛔ never carried over. A justification
  // belongs to ONE change.
  // ⚠⛔ RE-SEED ONLY AN UNTOUCHED FORM (code review Pass 2 / G3, decision D-C — BigDev option 2).
  // ⛔ It used to `reset()` on EVERY change of the target in force, so a background refetch
  // (window-focus, `staleTime: 0`, `refetchOnMount: 'always'`) WIPED a typed amount and an entire
  // typed rationale mid-edit, with no warning and no way to recover the text.
  // ⭐ The original intent stands and is preserved: ⛔ never sit on a stale baseline. What changes is
  // that a DIRTY form is told rather than overwritten.
  // ⚠ `resetToken` (an explicit parent bump after a successful save) ALWAYS re-seeds — that is the
  // operator's own action, and the rationale must not survive it.
  useEffect(() => {
    seededVersionRef.current = currentVersion;
    setChangedUnderEdit(false);
    reset({ amount: currentTargetInr === null ? '' : String(currentTargetInr), rationale: '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- an explicit parent bump after a save
  }, [resetToken]);

  useEffect(() => {
    if (isDirty) {
      // ⭐ SAY SO, ⛔ do not overwrite. The operator keeps their text; if they submit anyway the
      // seeded `expectedVersion` earns them an honest 409 rather than a silent overwrite.
      setChangedUnderEdit(true);
      return;
    }
    seededVersionRef.current = currentVersion;
    reset({ amount: currentTargetInr === null ? '' : String(currentTargetInr), rationale: '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset() is stable; isDirty is read, not depended on
  }, [currentTargetInr, currentVersion]);

  const rationale = watch('rationale');
  const amount = watch('amount');
  const rationaleIsBlank = (rationale ?? '').trim() === '';
  // ⚠ Parsed, ⛔ not coerced: `Number('')` is 0, so a blank field would submit ₹0 — which is not
  // merely wrong but is the one value Story 11b.14's meter cannot divide by. An explicit
  // digits-only test is the only safe read.
  const parsed = /^\d+$/.test((amount ?? '').trim()) ? Number((amount ?? '').trim()) : Number.NaN;
  const amountInvalid = !Number.isInteger(parsed) || parsed <= 0 || parsed > MAX_TARGET;
  const trimmedAmountEmpty = (amount ?? '').trim() === '';
  // ⭐ The amount error is suppressed while the field is UNTOUCHED and EMPTY (an operator has not
  // made a mistake yet) — but ⛔ NOT after they have tried to submit. Before this, clicking Save on a
  // blank form produced the rationale's `required` message and ⛔ SILENCE about the amount.
  const showAmountError = amountInvalid && (!trimmedAmountEmpty || submitAttempted);
  // ⚠ `/^\d+$/` accepts LEADING ZEROS, so the field could read `0500000` while the request carried
  // `500000` — the screen and the payload disagreeing at the moment of submission, on the one form
  // whose stated principle is "IT OPENS ON THE TRUTH". Normalise the field instead.
  const blocked = pending || rationaleIsBlank || amountInvalid;
  // ⭐ The REASON, in the accessibility tree — ⛔ not inferable from a greyed-out button.
  const blockedReason = pending
    ? undefined
    : amountInvalid && trimmedAmountEmpty
      ? t('driveTarget.form.blockedNeedsAmount')
      : amountInvalid
        ? t('driveTarget.form.amountInvalid')
        : rationaleIsBlank
          ? t('driveTarget.form.blockedNeedsRationale')
          : undefined;
  const trimmedAmount = (amount ?? '').trim();
  useEffect(() => {
    if (/^0\d+$/.test(trimmedAmount)) {
      setValue('amount', String(Number(trimmedAmount)), { shouldDirty: true });
    }
  }, [trimmedAmount, setValue]);

  const submit = handleSubmit(
    (values) => {
      setSubmitAttempted(true);
    // ⛔ The button's `disabled` is a COURTESY, ⛔ not the guard. `handleSubmit` only validates
    // REGISTERED fields, and `amount` has no react-hook-form rule — so an implicit Enter submit or a
    // re-enable race can still reach here with `parsed` === NaN / 0 / over-ceiling and fire a
    // mutation that `JSON.stringify` turns into `null`, giving the operator a generic server 400
    // instead of the inline message. The contract + DB CHECK stay the real boundary; this stops the
    // malformed request leaving the browser. 2026-09-06 review.
    if (amountInvalid) return;
    // ⭐ ⛔ NOT a `disabled` re-check — `pending` is the guard (Pass 2 / G3). Without it a second
    // Enter fires a SECOND mutation; with the key now held in a ref both attempts share it, but a
    // duplicate in-flight request is still wrong, and the server answers the second with
    // `idempotency_in_progress`.
    if (pending) return;
    // ⭐⭐ ⛔ THERE IS DELIBERATELY NO DIRTY CHECK — decision **D-D** (BigDev, 2026-09-06).
    // An operator MAY save an unchanged figure with a fresh rationale: a re-affirmation
    // (*"reaffirmed after the Panel meeting"*) IS a governed act, and this record's whole purpose is
    // the trail. ⚠ THE COST IS ACCEPTED AND STATED: the restatement bumps `version`, which stales
    // every other open console's `expectedVersion` and refuses their next change until they re-read.
    // ⛔ Do not "fix" this by disabling Save on an unchanged value — that is a governance change and
    // owes its own decision entry. (Recorded here because an unrecorded ruling gets re-raised: the
    // sibling D-A ruling was re-discovered FIVE times across three review chunks.)
      onSubmit({
        targetInr: parsed,
        rationale: values.rationale.trim(),
        seededVersion: seededVersionRef.current,
      });
    },
    // ⚠ react-hook-form calls THIS arm when its OWN registered rules fail (the blank rationale).
    // The amount has no RHF rule — it is validated above — so the flag must be set on both paths.
    () => setSubmitAttempted(true),
  );

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => void submit(e)}
      aria-label={t('driveTarget.form.heading')}
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="dt-amount" className="text-sm font-medium">
          {t('driveTarget.form.amountLabel')}
        </label>
        {/*
          ⭐ `aria-invalid` + `aria-describedby` — family 13(d), and this console's OWN convention
          (`AcknowledgeForm.tsx:51-52`; `aria-invalid` also in AddPariwarForm, LoginPage, DraftForm,
          MemberLookupForm, ReasonCodeDropdown). ⛔ Without them a screen-reader user returning focus
          to the field hears only "Target amount (₹), edit text" — no indication it is invalid, no
          route to the message, and no access to the hint, which is the ONLY place the > 0 / ceiling
          bounds exist for assistive tech (the field is `type="text"` by design, so it never carries
          `min`/`max`).
        */}
        <input
          id="dt-amount"
          type="text"
          inputMode="numeric"
          className="w-48 rounded border px-2 py-1"
          aria-invalid={showAmountError}
          aria-describedby={
            showAmountError ? 'dt-amount-hint dt-amount-error' : 'dt-amount-hint'
          }
          {...register('amount')}
          data-testid="drive-target-amount"
        />
        <p id="dt-amount-hint" className="text-xs opacity-60">
          {t('driveTarget.form.amountHint')}
        </p>
        {showAmountError && (
          <p id="dt-amount-error" role="alert" className="text-sm text-status-fail-fg">
            {t('driveTarget.form.amountInvalid')}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="dt-rationale" className="text-sm font-medium">
          {t('driveTarget.form.rationaleLabel')}
        </label>
        <textarea
          id="dt-rationale"
          className="rounded border px-2 py-1"
          rows={3}
          placeholder={t('driveTarget.form.rationalePlaceholder')}
          {...register('rationale', {
            required: t('driveTarget.form.rationaleRequired'),
            maxLength: { value: 2000, message: t('driveTarget.form.rationaleTooLong') },
          })}
          aria-invalid={errors.rationale !== undefined}
          aria-describedby={
            errors.rationale ? 'dt-rationale-hint dt-rationale-error' : 'dt-rationale-hint'
          }
          data-testid="drive-target-rationale"
        />
        <p id="dt-rationale-hint" className="text-xs opacity-60">
          {t('driveTarget.form.rationaleHint')}
        </p>
        {errors.rationale && (
          <p id="dt-rationale-error" role="alert" className="text-sm text-status-fail-fg">
            {errors.rationale.message}
          </p>
        )}
      </div>

      {/*
        ⭐⭐ D-C — the operator is TOLD when the target changed under their edit, ⛔ never silently
        overwritten. Their text stays; if they submit anyway the SEEDED `expectedVersion` earns them
        an honest 409 instead of a silent overwrite of the other operator's change.
      */}
      {changedUnderEdit && (
        <p
          role="status"
          className="rounded border border-status-warn-fg/40 bg-status-warn-fg/5 p-2 text-sm"
          data-testid="drive-target-changed-under-edit"
        >
          {t('driveTarget.form.changedUnderEdit')}
        </p>
      )}

      {/*
        ⚠⛔ `aria-disabled`, ⛔ NOT `disabled` (family 13(d), Pass 2 / G3). A `disabled` button is
        removed from the tab order and skipped by some AT browse modes, so the blank form presented a
        greyed-out control and ⛔ ZERO on-screen text saying why: `amountInvalid` is true but its
        message is suppressed while the field is empty, and react-hook-form's `required` only
        materialises after a submit ATTEMPT — which the disabled button prevented. A reachable state
        whose only representation was a PROP. ⇒ the button stays focusable, announces its blocked
        state, and names the reason.
      */}
      <button
        type="submit"
        aria-disabled={blocked}
        aria-busy={pending}
        aria-describedby={blockedReason ? 'dt-submit-blocked' : undefined}
        className="rounded bg-black px-4 py-2 text-white aria-disabled:opacity-60"
        data-testid="drive-target-submit"
      >
        {pending ? t('driveTarget.form.submitPending') : t('driveTarget.form.submit')}
      </button>
      {blockedReason && (
        <p id="dt-submit-blocked" role="status" className="text-xs opacity-70">
          {blockedReason}
        </p>
      )}

      {submitError && (
        <p role="alert" className="text-sm text-status-fail-fg" data-testid="drive-target-submit-error">
          {submitError}
        </p>
      )}
    </form>
  );
}
