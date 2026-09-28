// `<HelplineClaimContact>` — the helpline operator records the claim's CONTACT RECORD on the family's behalf
// (Story 6.19a, AC1 / AC8a): each nominee's postal address, who the claimant is, and the family's AGREEMENT to be
// contacted — read aloud from the SAME copy the app shows (`claim.json` `contact.agreement`, in both languages).
//
// A sibling after the shell, beside `<HelplineNomineeCorrection>` / `<HelplineCertificateReplacement>`, with
// their pick pattern: one live claim ⇒ used as-is; several ⇒ the operator picks; none ⇒ "no open claim".
//
// ⭐ The PRESENCE read drives everything and shows ⛔ no value: which nominee versions still need an address, the
// claimant side, the agreement's state, what the approval check still asks for, and whether this claim's state
// allows a full edit or only COMPLETING what is missing (W5). The PLAINTEXT read-back decrypts and is audited per
// read, so it runs ONLY when the operator asks.
// ⛔ The server decides everything; this card only builds a body from the fields the operator filled.

import type { ClaimContactPresenceResponse, RecordHelplineClaimContactRequest } from '@twt/contracts';
import { CLAIMANT_NOMINEE_RELATIONSHIP_CODES } from '@twt/contracts';
import { t } from '@twt/i18n';
import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';

import { ApiError } from '../../api/client.js';
import {
  useClaimContactDetails,
  useClaimContactPresence,
  useDeathCertificateClaimsForMember,
  useRecordHelplineClaimContact,
} from '../../api/hooks.js';
import { formatIst, nomineeRelationshipLabel } from '../claim-verification/NomineeDeclarationPanel.js';
import { verifierConsoleEn } from '../claim-verification/i18n-en.js';
import { certificateClaimOption, resolveEn } from './i18n-en.js';

const claimStateLabels = verifierConsoleEn.nomineeDeclaration.refusals.claimStateLabels;

/** Each refusal gets its OWN line — ⛔ never a raw code. */
function refusalKey(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code.startsWith('claim_contact.')) {
      const key = `helpline.contact.refusal.${err.code.slice('claim_contact.'.length)}`;
      if (resolveEn(key) !== key) return key;
    }
    if (err.code === 'claim.not_found') return 'helpline.contact.refusal.not_found';
    if (err.status === 400) return 'helpline.contact.refusal.invalid';
  }
  return 'helpline.contact.refusal.generic';
}

type ClaimantChoice = 'unchanged' | 'nominee' | 'someone_else';

export function HelplineClaimContact({
  pariwarId,
  memberId,
  identityConfirmed,
  onStepUpRequired,
  stepUpRequired,
}: {
  pariwarId: string;
  memberId: string | null;
  identityConfirmed: boolean;
  /** The save needs the operator's own fresh admin step-up — the page shows its step-up panel. */
  onStepUpRequired: () => void;
  /** While the page's step-up panel is open, Save stays blocked (a second write could race the elevation). */
  stepUpRequired: boolean;
}): ReactElement {
  const ready = memberId !== null && identityConfirmed;
  const claimsQ = useDeathCertificateClaimsForMember(pariwarId, memberId, ready);
  const claims = claimsQ.data?.member_id === memberId ? claimsQ.data.claims : [];
  const [picked, setPicked] = useState<string | null>(null);
  const lone = claims.length === 1 ? claims[0]!.claim_case_id : null;
  useEffect(() => {
    setPicked(null);
  }, [memberId]);
  const chosen = claims.some((c) => c.claim_case_id === picked) ? picked : lone;

  const presenceQ = useClaimContactPresence(pariwarId, ready ? chosen : null);
  const presence = presenceQ.data?.claimCaseId === chosen ? presenceQ.data : undefined;
  const [showDetails, setShowDetails] = useState(false);
  const detailsQ = useClaimContactDetails(pariwarId, ready ? chosen : null, showDetails);
  const save = useRecordHelplineClaimContact(pariwarId, chosen);

  // The form — reset whenever the claim changes, so ⛔ no family's typed address can cross to another claim.
  const [locale, setLocale] = useState<'hi' | 'en'>('hi');
  const [addresses, setAddresses] = useState<Record<string, string>>({});
  const [relationships, setRelationships] = useState<Record<string, string>>({});
  const [claimantChoice, setClaimantChoice] = useState<ClaimantChoice>('unchanged');
  const [claimantVersion, setClaimantVersion] = useState<string>('');
  const [claimant, setClaimant] = useState({ name: '', mobile: '', address: '' });
  const [agreed, setAgreed] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const resetSave = save.reset;
  useEffect(() => {
    setAddresses({});
    setRelationships({});
    setClaimantChoice('unchanged');
    setClaimantVersion('');
    setClaimant({ name: '', mobile: '', address: '' });
    setAgreed(false);
    setShowDetails(false);
    setLocalError(null);
    resetSave();
  }, [chosen, memberId, resetSave]);

  const askRelationship =
    claimantChoice === 'someone_else' || (claimantChoice === 'unchanged' && presence?.claimantSide === 'claimant');

  function buildBody(p: ClaimContactPresenceResponse): RecordHelplineClaimContactRequest | null {
    const rows = p.nominees
      .map((n) => {
        const address = (addresses[n.nomineeVersionId] ?? '').trim();
        const relationship = askRelationship ? relationships[n.nomineeVersionId] : undefined;
        if (address === '' && !relationship) return null;
        return {
          nomineeVersionId: n.nomineeVersionId,
          ...(address !== '' ? { address } : {}),
          ...(relationship ? { relationship: relationship as (typeof CLAIMANT_NOMINEE_RELATIONSHIP_CODES)[number] } : {}),
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);
    const body: RecordHelplineClaimContactRequest = { locale };
    if (rows.length > 0) body.nominees = rows;
    if (claimantChoice === 'nominee' && claimantVersion !== '') body.claimantNomineeVersionId = claimantVersion;
    if (claimantChoice === 'someone_else') {
      const block = { name: claimant.name.trim(), mobile: claimant.mobile.trim(), address: claimant.address.trim() };
      if (block.name === '' || block.mobile === '' || block.address === '') return null;
      body.claimant = block;
    }
    if (agreed) body.agreed = true;
    const empty = !body.nominees && !body.claimant && !body.claimantNomineeVersionId && !body.agreed;
    return empty ? null : body;
  }

  function onSave(): void {
    if (!presence || !chosen) return;
    const body = buildBody(presence);
    if (body === null) {
      setLocalError(resolveEn(claimantChoice === 'someone_else' ? 'helpline.contact.claimantIncomplete' : 'helpline.contact.nothingToSave'));
      return;
    }
    setLocalError(null);
    const savedFor = chosen;
    save.mutate(body, {
      onError: (err) => {
        if (savedFor === chosen && err instanceof ApiError && err.code === 'auth.step_up_required') onStepUpRequired();
      },
      onSuccess: () => {
        setAddresses({});
        setRelationships({});
        setClaimant({ name: '', mobile: '', address: '' });
        setAgreed(false);
      },
    });
  }

  let source: ReactElement | null = null;
  if (!ready) {
    source = <p className="text-sm" data-testid="helpline-contact-need-member">{resolveEn('helpline.contact.needMember')}</p>;
  } else if (claimsQ.isLoading) {
    source = <p role="status" className="text-sm">{resolveEn('helpline.contact.claimsLoading')}</p>;
  } else if (claimsQ.isError) {
    source = (
      <div role="alert" className="text-sm">
        <p>{resolveEn('helpline.contact.claimsError')}</p>
        <button type="button" className="underline" onClick={() => void claimsQ.refetch()}>
          {resolveEn('helpline.contact.retry')}
        </button>
      </div>
    );
  } else if (claims.length === 0) {
    source = <p className="text-sm" data-testid="helpline-contact-no-claim">{resolveEn('helpline.contact.noClaim')}</p>;
  } else if (claims.length > 1) {
    source = (
      <fieldset className="text-sm" data-testid="helpline-contact-pick">
        <legend>{resolveEn('helpline.contact.pickClaim')}</legend>
        {claims.map((c) => (
          <label key={c.claim_case_id} className="flex items-center gap-2">
            <input
              type="radio"
              name="helpline-contact-claim"
              checked={picked === c.claim_case_id}
              disabled={save.isPending}
              onChange={() => setPicked(c.claim_case_id)}
              data-testid={`helpline-contact-claim-${c.claim_case_id}`}
            />
            {certificateClaimOption(claimStateLabels[c.claim_state] ?? '—', formatIst(c.created_at))}
          </label>
        ))}
      </fieldset>
    );
  }

  const notWritable = presence?.writeMode === 'not_writable';
  const stepUpError = save.error instanceof ApiError && save.error.code === 'auth.step_up_required';

  return (
    <section className="mt-6 border-t pt-4" aria-label={resolveEn('helpline.contact.heading')} data-testid="helpline-contact">
      <h3>{resolveEn('helpline.contact.heading')}</h3>
      <p className="text-sm">{resolveEn('helpline.contact.duty')}</p>
      {source}
      {ready && chosen !== null && presenceQ.isLoading ? (
        <p role="status" className="text-sm">{resolveEn('helpline.contact.presenceLoading')}</p>
      ) : null}
      {ready && chosen !== null && presenceQ.isError ? (
        <div role="alert" className="text-sm" data-testid="helpline-contact-presence-error">
          <p>{resolveEn('helpline.contact.presenceError')}</p>
          <button type="button" className="underline" onClick={() => void presenceQ.refetch()}>
            {resolveEn('helpline.contact.retry')}
          </button>
        </div>
      ) : null}
      {ready && presence ? (
        <div className="mt-2 flex flex-col gap-3 text-sm" data-testid="helpline-contact-presence">
          <p data-testid="helpline-contact-mode">{resolveEn(`helpline.contact.mode.${presence.writeMode}`)}</p>
          {presence.missing !== null ? (
            <p data-testid="helpline-contact-missing">{verifierConsoleEn.claimContact.approvalGate[presence.missing]}</p>
          ) : (
            <p data-testid="helpline-contact-complete">{resolveEn('helpline.contact.complete')}</p>
          )}
          <p>{resolveEn(`helpline.contact.agreement.${presence.agreement}`)}</p>
          <ul className="list-disc pl-5">
            {presence.nominees.map((n) => (
              <li key={n.nomineeVersionId} data-testid={`helpline-contact-nominee-${n.rank}`}>
                {resolveEn('helpline.contact.nomineeLabel').replace('{rank}', String(n.rank))}:{' '}
                {resolveEn(n.addressPresent ? 'helpline.contact.addressOnFile' : 'helpline.contact.addressMissing')}
                {n.row === 'chain' ? ` ${resolveEn('helpline.contact.carried')}` : ''}
                {presence.claimantSide === 'claimant'
                  ? ` · ${resolveEn(n.relationshipPresent ? 'helpline.contact.relationshipOnFile' : 'helpline.contact.relationshipMissing')}`
                  : ''}
              </li>
            ))}
          </ul>
          <p>{resolveEn(`helpline.contact.claimant.${presence.claimantSide}`)}</p>

          {presence.recorded ? (
            <div>
              {!showDetails ? (
                <button type="button" className="underline" onClick={() => setShowDetails(true)} data-testid="helpline-contact-show-details">
                  {resolveEn('helpline.contact.showDetails')}
                </button>
              ) : detailsQ.isLoading ? (
                <p role="status">{resolveEn('helpline.contact.detailsLoading')}</p>
              ) : detailsQ.isError ? (
                <p role="alert">{resolveEn('helpline.contact.detailsError')}</p>
              ) : detailsQ.data ? (
                <dl data-testid="helpline-contact-details">
                  {detailsQ.data.nominees.map((n) => (
                    <div key={n.nomineeVersionId}>
                      <dt>{resolveEn('helpline.contact.nomineeLabel').replace('{rank}', String(n.rank))}</dt>
                      <dd>{n.address ?? '—'}</dd>
                      {n.relationship ? <dd>{nomineeRelationshipLabel(n.relationship)}</dd> : null}
                    </div>
                  ))}
                  {detailsQ.data.claimant ? (
                    <div>
                      <dt>{resolveEn('helpline.contact.claimantHeading')}</dt>
                      <dd>{detailsQ.data.claimant.name}</dd>
                      <dd>{detailsQ.data.claimant.mobile}</dd>
                      <dd>{detailsQ.data.claimant.address}</dd>
                    </div>
                  ) : null}
                  <p className="opacity-80">{resolveEn('helpline.contact.detailsAudited')}</p>
                </dl>
              ) : null}
            </div>
          ) : null}

          {notWritable ? null : (
            <form
              className="flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                onSave();
              }}
              data-testid="helpline-contact-form"
            >
              <fieldset>
                <legend>{resolveEn('helpline.contact.language')}</legend>
                {(['hi', 'en'] as const).map((l) => (
                  <label key={l} className="mr-4">
                    <input type="radio" name="helpline-contact-locale" checked={locale === l} onChange={() => setLocale(l)} />{' '}
                    {resolveEn(`helpline.contact.language.${l}`)}
                  </label>
                ))}
              </fieldset>
              {presence.nominees.map((n) => (
                <label key={n.nomineeVersionId} className="flex flex-col">
                  {resolveEn('helpline.contact.addressFor').replace('{rank}', String(n.rank))}
                  <textarea
                    value={addresses[n.nomineeVersionId] ?? ''}
                    maxLength={500}
                    onChange={(e) => setAddresses((a) => ({ ...a, [n.nomineeVersionId]: e.target.value }))}
                    data-testid={`helpline-contact-address-${n.rank}`}
                  />
                </label>
              ))}
              <fieldset>
                <legend>{resolveEn('helpline.contact.claimantQuestion')}</legend>
                {(['unchanged', 'nominee', 'someone_else'] as const).map((c) => (
                  <label key={c} className="mr-4">
                    <input
                      type="radio"
                      name="helpline-contact-claimant"
                      checked={claimantChoice === c}
                      onChange={() => setClaimantChoice(c)}
                      data-testid={`helpline-contact-claimant-${c}`}
                    />{' '}
                    {resolveEn(`helpline.contact.claimantChoice.${c}`)}
                  </label>
                ))}
              </fieldset>
              {claimantChoice === 'nominee' ? (
                <label className="flex flex-col">
                  {resolveEn('helpline.contact.whichNominee')}
                  <select value={claimantVersion} onChange={(e) => setClaimantVersion(e.target.value)} data-testid="helpline-contact-claimant-version">
                    <option value="">—</option>
                    {presence.nominees.map((n) => (
                      <option key={n.nomineeVersionId} value={n.nomineeVersionId}>
                        {resolveEn('helpline.contact.nomineeLabel').replace('{rank}', String(n.rank))}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              {claimantChoice === 'someone_else' ? (
                <div className="flex flex-col gap-2" data-testid="helpline-contact-claimant-block">
                  {(['name', 'mobile', 'address'] as const).map((f) => (
                    <label key={f} className="flex flex-col">
                      {resolveEn(`helpline.contact.claimantField.${f}`)}
                      <input
                        value={claimant[f]}
                        maxLength={f === 'address' ? 500 : 200}
                        onChange={(e) => setClaimant((c) => ({ ...c, [f]: e.target.value }))}
                        data-testid={`helpline-contact-claimant-${f}`}
                      />
                    </label>
                  ))}
                </div>
              ) : null}
              {askRelationship
                ? presence.nominees.map((n) => (
                    <label key={n.nomineeVersionId} className="flex flex-col">
                      {/* ⭐ The DIRECTION is fixed: "the claimant is the nominee's …" (inverse pairs). */}
                      {resolveEn('helpline.contact.relationshipQuestion').replace('{rank}', String(n.rank))}
                      <select
                        value={relationships[n.nomineeVersionId] ?? ''}
                        onChange={(e) => setRelationships((r) => ({ ...r, [n.nomineeVersionId]: e.target.value }))}
                        data-testid={`helpline-contact-relationship-${n.rank}`}
                      >
                        <option value="">—</option>
                        {CLAIMANT_NOMINEE_RELATIONSHIP_CODES.map((code) => (
                          <option key={code} value={code}>
                            {nomineeRelationshipLabel(code)}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))
                : null}
              <fieldset className="rounded border p-2" data-testid="helpline-contact-agreement">
                <legend>{resolveEn('helpline.contact.agreementHeading')}</legend>
                <p className="text-xs opacity-80">{resolveEn('helpline.contact.readAloud')}</p>
                {/* The SAME copy the app shows — read aloud in the caller's language (AC1). */}
                <p lang="hi">{t('contact.agreement', undefined, { locale: 'hi', namespace: 'claim' })}</p>
                <p lang="en">{t('contact.agreement', undefined, { locale: 'en', namespace: 'claim' })}</p>
                <label>
                  <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} data-testid="helpline-contact-agreed" />{' '}
                  {resolveEn('helpline.contact.agreedLabel')}
                </label>
              </fieldset>
              <button type="submit" disabled={save.isPending || stepUpRequired} className="self-start rounded border px-3 py-1" data-testid="helpline-contact-save">
                {resolveEn(save.isPending ? 'helpline.contact.saving' : 'helpline.contact.save')}
              </button>
            </form>
          )}
          {localError ? (
            <p role="alert" data-testid="helpline-contact-local-error">{localError}</p>
          ) : null}
          {save.isSuccess ? (
            <p role="status" data-testid="helpline-contact-saved">
              {resolveEn(save.data.agreementIgnored ? 'helpline.contact.savedAgreementIgnored' : 'helpline.contact.saved')}
            </p>
          ) : null}
          {save.isError ? (
            <p role="alert" className="text-status-fail-fg" data-testid="helpline-contact-error">
              {resolveEn(stepUpError ? 'helpline.contact.stepUpRequired' : refusalKey(save.error))}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
