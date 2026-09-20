// `<HelplineClaimPage>` — the helpline-console container (Story 6.3, Task 5; AC1–AC5).
//
// Wires the hooks + state around the pure `<HelplineConsoleShell>`. Orchestration (UX §11):
//   search → select (single match auto-advances) → identity read-back (THE gate) →
//   nominee-summary read-back (advisory) → submit intake → post-intake actions.
//
// The member lookup REUSES the shipped Story 4.7 `<MemberLookupForm>` + `<MemberSearchResults>`
// (exact-match only — no search fork). The search dimension the operator used (`by`) is captured
// as `lookupMethod` and carried on the intake request → recorded as NON-PII audit metadata.
//
// Step-up (§2.2): the freeze-firing intake route requires the operator's OWN fresh admin
// step-up. The console does NOT pre-elevate; instead a StepUpRequiredError (403) from the intake
// POST is the signal to surface the step-up panel (request code → verify → the operator resubmits).

import type {
  ClaimantRelationship,
  HelplineLookupMethod,
  MemberSearchRequest,
  MemberSearchResultItem,
} from '@twt/contracts';
import type { ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';

import { ApiError } from '../../api/client.js';
import {
  useHelplineClaimIntake,
  useNomineeBankStatusHelpline,
  useNomineeNameCheck,
  useRecordHelplineNomineeBank,
  useHelplineOperatorEvent,
  useMemberSearch,
  useRequestStepUp,
  useVerifyStepUp,
} from '../../api/hooks.js';
import { MemberLookupForm } from '../member-status/MemberLookupForm.js';
import { MemberSearchResults } from '../member-status/MemberSearchResults.js';
import { BankDetailsCard } from './BankDetailsCard.js';
import { HelplineConsoleShell, type HelplineIntakeResult } from './HelplineConsoleShell.js';
import { readBackScript, resolveEn } from './i18n-en.js';

function messageOf(err: unknown): string | undefined {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return undefined;
}

const STEP_UP_CONTEXT = 'claim_file';
const NAME_FALLBACK = 'the member';

export interface HelplineClaimPageProps {
  pariwarId: string;
}

export function HelplineClaimPage({ pariwarId }: HelplineClaimPageProps): ReactElement {
  const search = useMemberSearch(pariwarId);
  const intake = useHelplineClaimIntake(pariwarId);
  const requestStepUp = useRequestStepUp();
  const verifyStepUp = useVerifyStepUp();
  const operatorEvent = useHelplineOperatorEvent(pariwarId);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lookupMethod, setLookupMethod] = useState<HelplineLookupMethod>('mobile');
  const [relationship, setRelationship] = useState<ClaimantRelationship | null>(null);
  const [identityConfirmed, setIdentityConfirmed] = useState(false);
  const [nomineeConfirmed, setNomineeConfirmed] = useState(false);
  const [identityCorrections, setIdentityCorrections] = useState<readonly string[]>([]);
  const [nomineeCorrections, setNomineeCorrections] = useState<readonly string[]>([]);
  const [result, setResult] = useState<HelplineIntakeResult | null>(null);
  const [stepUpRequired, setStepUpRequired] = useState(false);
  const [otp, setOtp] = useState('');
  const [escalated, setEscalated] = useState(false);

  const results: readonly MemberSearchResultItem[] = useMemo(
    () => search.data?.results ?? [],
    [search.data],
  );
  const selected = results.find((m) => m.memberId === selectedId) ?? null;

  /** Reset ALL downstream read-back/intake/step-up/escalation state (Review Finding — this must
   * run on EVERY change of the selected member, not just a fresh search, or a confirmed/held
   * state from a PRIOR member can silently carry over onto a newly-selected one — bypassing the
   * AC2 identity gate when the operator switches between disambiguation results). */
  const resetDownstreamState = (): void => {
    setIdentityConfirmed(false);
    setNomineeConfirmed(false);
    setIdentityCorrections([]);
    setNomineeCorrections([]);
    setResult(null);
    setStepUpRequired(false);
    setOtp('');
    setEscalated(false);
    requestStepUp.reset();
    verifyStepUp.reset();
  };

  const selectMember = (id: string | null): void => {
    setSelectedId(id);
    resetDownstreamState();
  };

  // AC1 — a single match auto-advances to the read-back step.
  useEffect(() => {
    if (results.length === 1 && selectedId === null) {
      setSelectedId(results[0]!.memberId);
    }
  }, [results, selectedId]);

  const onSearch = (payload: MemberSearchRequest): void => {
    // Reset the downstream read-back/intake state on a fresh search.
    setSelectedId(null);
    resetDownstreamState();
    setLookupMethod(payload.by);
    search.mutate(payload);
  };

  const confirmIdentity = (confirmed: boolean): void => {
    setIdentityConfirmed(confirmed);
    // Best-effort, non-blocking audit line (Review Finding — AC4's literal "read-back-confirm"
    // requirement). Only fired on the false→true transition, and only once a member is
    // selected (the event is scoped to a specific lookup result).
    if (confirmed && selected) {
      operatorEvent.mutate({ deceasedMemberId: selected.memberId, event: 'readback_confirmed', lookupMethod });
    }
  };

  const escalate = (): void => {
    setEscalated(true);
    // Best-effort, non-blocking audit line (Review Finding — AC4/AC5). A no-match escalation
    // (no member ever selected) has nothing to attribute the line to and is skipped — the local
    // "held" state still applies (AC5's "or not yet minted, for a no-match").
    if (selected) {
      operatorEvent.mutate({ deceasedMemberId: selected.memberId, event: 'escalated', lookupMethod });
    }
  };

  const submitIntake = (): void => {
    if (!selected || !identityConfirmed || relationship === null) return;
    intake.mutate(
      {
        deceasedMemberId: selected.memberId,
        relationship,
        // Derived from the actual confirmed state (Review Finding), not a hardcoded literal —
        // the guard above is the belt, this is the suspenders.
        identityReadBackConfirmed: identityConfirmed,
        lookupMethod,
      },
      {
        onSuccess: (data) => {
          setResult(data);
          setStepUpRequired(false);
        },
        onError: (err) => {
          // A step-up-required 403 is the SIGNAL to elevate — not a hard error (AC4).
          if (err instanceof ApiError && err.code === 'auth.step_up_required') {
            setStepUpRequired(true);
          }
        },
      },
    );
  };

  const verify = (): void => {
    const code = otp.trim();
    if (code === '') return;
    verifyStepUp.mutate(code, {
      onSuccess: () => {
        // Elevation gained — clear the panel; the operator resubmits the intake. Also reset the
        // request mutation so a LATER re-elevation need starts from a fresh "send code" state
        // rather than stale isSuccess (Review Finding).
        setStepUpRequired(false);
        setOtp('');
        requestStepUp.reset();
      },
    });
  };

  const name = selected?.name ?? NAME_FALLBACK;
  const nomineeCount = selected?.nomineeSummary.length ?? 0;
  const identityScript = readBackScript('identity', { name });
  const nomineeScript = readBackScript('nominee', { name, count: nomineeCount });

  // Step-up panel content (only rendered inside the shell when stepUpRequired).
  const stepUpSlot = (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => requestStepUp.mutate(STEP_UP_CONTEXT)}
        disabled={requestStepUp.isPending}
        data-testid="helpline-stepup-request"
        className="self-start rounded border px-3 py-1 text-sm"
      >
        {resolveEn('helpline.stepup.request')}
      </button>
      {requestStepUp.isSuccess && (
        <>
          <label htmlFor="stepup-otp" className="text-sm font-medium">
            {resolveEn('helpline.stepup.otpLabel')}
          </label>
          <div className="flex gap-2">
            <input
              id="stepup-otp"
              className="rounded border px-2 py-1 text-sm"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              data-testid="helpline-stepup-otp"
            />
            <button
              type="button"
              onClick={verify}
              disabled={verifyStepUp.isPending}
              data-testid="helpline-stepup-verify"
              className="rounded border px-3 py-1 text-sm"
            >
              {resolveEn('helpline.stepup.verify')}
            </button>
          </div>
        </>
      )}
      {verifyStepUp.isError && (
        <p role="alert" className="text-sm text-status-fail-fg">
          {messageOf(verifyStepUp.error)}
        </p>
      )}
      {requestStepUp.isError && (
        <p role="alert" className="text-sm text-status-fail-fg">
          {messageOf(requestStepUp.error)}
        </p>
      )}
    </div>
  );

  const lookupSlot = (
    <div className="flex flex-col gap-4">
      <MemberLookupForm onSubmit={onSearch} pending={search.isPending} submitError={messageOf(search.error)} />
      {search.data && (
        <MemberSearchResults items={results} selectedId={selectedId} onSelect={selectMember} />
      )}
    </div>
  );

  const filedClaimCaseId = result?.claimCaseId ?? null;
  const recordBank = useRecordHelplineNomineeBank(pariwarId, filedClaimCaseId ?? '');
  /**
   * ⭐⭐ `recorded` IS A SERVER FACT, ⛔ NOT "did I just submit?" (code review 2026-09-20).
   *
   * It used to be a page-level boolean set once after a successful POST and never reset. Three
   * things fell out of that, all of them silent:
   *   · file claim A, save its accounts, then select member B and file B — B rendered *"Both
   *     accounts are saved"*, hid the form and the `helpline-bank-required` hint, and fired the
   *     AUDITED Tier-1 names read against a claim with no accounts at all. `-226` cl.7's duty was
   *     skipped for B, and A's holder names and account numbers sat in the card's state;
   *   · a reload lost it entirely;
   *   · a claim this operator did not file in THIS session could never show as recorded, so a
   *     legacy claim filed before cl.7 could not be completed.
   */
  const bankStatus = useNomineeBankStatusHelpline(pariwarId, filedClaimCaseId);
  const bankRecorded = (bankStatus.data?.accounts.length ?? 0) === 2;
  // ⭐ The names read is fetched ONLY once the accounts exist — before that there is nothing to
  // check, and the read decrypts a living nominee's name + writes an audit line, so it must not
  // fire speculatively.
  const bankNames = useNomineeNameCheck(pariwarId, filedClaimCaseId, bankRecorded);
  const submitBank = async (body: Parameters<typeof recordBank.mutateAsync>[0]): Promise<void> => {
    await recordBank.mutateAsync(body);
    // ⛔ Nothing to set: the mutation invalidates the presence view, and `recorded` re-derives.
  };

  return (
    <HelplineConsoleShell
      lookupSlot={lookupSlot}
      selected={selected}
      identityScript={identityScript}
      nomineeScript={nomineeScript}
      identityConfirmed={identityConfirmed}
      onIdentityConfirmedChange={confirmIdentity}
      nomineeConfirmed={nomineeConfirmed}
      onNomineeConfirmedChange={setNomineeConfirmed}
      identityCorrections={identityCorrections}
      onAddIdentityCorrection={(n) => setIdentityCorrections((prev) => [...prev, n])}
      nomineeCorrections={nomineeCorrections}
      onAddNomineeCorrection={(n) => setNomineeCorrections((prev) => [...prev, n])}
      relationship={relationship}
      onRelationshipChange={setRelationship}
      onSubmit={submitIntake}
      submitPending={intake.isPending}
      submitError={
        // A step-up-required error is handled via the panel, not surfaced as a hard error.
        intake.isError && !(intake.error instanceof ApiError && intake.error.code === 'auth.step_up_required')
          ? messageOf(intake.error)
          : undefined
      }
      result={result}
      stepUpRequired={stepUpRequired}
      stepUpSlot={stepUpSlot}
      escalated={escalated}
      onEscalate={escalate}
      // Story 6.18 (AC6/AC7) — cl.1 makes the match the operator's duty and cl.7 makes both
      // accounts mandatory; the card is where both are discharged.
      bankRecorded={bankRecorded}
      bankSlot={
        <BankDetailsCard
          // ⭐ `key` on the claim — a belt-and-braces reset of every field the card holds, so a
          // change of claim can never carry another family's typed account numbers across even if a
          // future edit forgets an effect.
          key={filedClaimCaseId ?? 'none'}
          claimCaseId={filedClaimCaseId}
          recorded={bankRecorded}
          onSubmit={submitBank}
          pending={recordBank.isPending}
          error={recordBank.isError ? messageOf(recordBank.error) : null}
          names={bankNames.data}
          namesLoading={bankNames.isLoading}
          namesError={bankNames.isError ? resolveEn('helpline.bank.namesError') : null}
          // AC5 — `-227` cl.11 makes THIS operator the one who types the corrected details.
          correctionNeeded={bankStatus.data?.correctionNeeded === true}
        />
      }
    />
  );
}
