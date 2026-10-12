// `assemblePeerAnswers` — the neighbours' answers as STAFF see them (Story 6.27a PM13, PM25 (c); `2026-10-10-311`). ONE
// actor-aware assembler: the verifier console's peer-mesh section uses it here, and 6.27b's every-approver read (PM24)
// reuses it. English only (the admin console is English-only — F22).
//
// Per neighbour: the NAME (the KYC name, decrypted HERE in the handler — ⛔ never the warning module), the send status for
// EVERY value of the ping's column (6.27c writes it), and — once they answered — EVERY live answer with its question's
// English words (the sensitive ones decrypted here), submitted or not, how it was saved (app / helpline), when, and
// "changed N times"; when the neighbour said YES to a call back, their mobile (decrypted, normalised; EACH showing reported
// through `onCallbackMobileShown` so the route audits it — ⛔ never the number in the audit).
// ⭐ A failed decrypt is `unavailable` ("could not be shown just now") — ⛔ never a blank (Invariant 8).
// ⛔ The per-answer warning flags arrive with 6.27b (from the warnings read; a failed read ⇒ `null`).
// Reads: the answers (one bounded statement) + the neighbours' contacts (one statement) — each counted by the caller.

import type { PeerMeshAnswerView, PeerMeshPingView } from '@twt/contracts';
import { claim, encryption, ids, member as memberDomain, questionnaires, type Db } from '@twt/domain';
import { t } from '@twt/i18n';

import type { EncryptionDeps } from '../../context.js';
import { decryptKycField } from '../kyc/kyc-crypto.js';
import { decryptPeerAnswer, sensitivePlaintextToValue } from './peer-request-core.js';

export interface PeerAnswersContext {
  readonly db: Db;
  readonly pariwarId: string;
  readonly claimCaseId: string;
  readonly log?: { warn: (obj: unknown, msg: string) => void };
  /** Called once for EVERY call-back mobile shown (the route audits it — `admin_verifier_console.peer_callback_mobile_shown`). */
  readonly onCallbackMobileShown?: (pingId: string) => void;
}

type PingRow = {
  readonly pingId: string;
  readonly memberId: string;
  readonly sendOutcome: string | null;
  readonly detail: string | null;
};

const enWords = (key: string, member: string): string => t(key, { member }, { locale: 'en', namespace: 'claim' });

/**
 * Build every ping's staff view. `bump` is called once per counted source read (the console's read ceiling).
 * `memberName` interpolates the question words (`{member}`).
 */
export async function assemblePeerAnswers(
  enc: EncryptionDeps,
  ctx: PeerAnswersContext,
  pings: readonly PingRow[],
  bump: () => void,
  memberName: string,
): Promise<PeerMeshPingView[]> {
  const pariwarId = ids.pariwarId(ctx.pariwarId);
  bump();
  const { replies, answers } = await claim.readPeerAnswersForClaim(ctx.db, pariwarId, ids.claimId(ctx.claimCaseId));
  bump();
  const contacts = await claim.readPeerNeighbourContacts(ctx.db, pariwarId, pings.map((p) => ids.memberId(p.memberId)));

  const warn = (what: string, err: unknown) => ctx.log?.warn({ errName: (err as Error | null)?.name, what, claimCaseId: ctx.claimCaseId }, 'peer-answers: a field could not be shown');

  const views: PeerMeshPingView[] = [];
  for (const ping of pings) {
    // ── the neighbour's name ──
    const contact = contacts.get(ping.memberId);
    let responderName: PeerMeshPingView['responderName'] = { status: 'none' };
    if (contact?.nameCiphertext) {
      try {
        const name = await decryptKycField(contact.nameCiphertext, ctx.pariwarId, enc);
        responderName = name === memberDomain.ANONYMIZED_SENTINEL ? { status: 'none' } : { status: 'shown', text: name };
      } catch (err) {
        warn('name', err);
        responderName = { status: 'unavailable' };
      }
    }

    // ── the answers ──
    const reply = replies.find((r) => r.pingId === ping.pingId) ?? null;
    let replyView: PeerMeshPingView['reply'] = null;
    let consented = false;
    if (reply) {
      const def = questionnaires.getQuestionnaireVersion(reply.questionnaireVersionId);
      const questions = def ? questionnaires.questionsOf(def) : [];
      const views_: PeerMeshAnswerView[] = [];
      for (const a of answers.filter((x) => x.replyId === reply.replyId)) {
        const q = questions.find((x) => x.key === a.questionKey);
        const label = (code: string) => {
          const option = q?.options.find((o) => o.code === code);
          return option ? enWords(option.copyKey, memberName) : code;
        };
        let value: PeerMeshAnswerView['value'];
        if (a.valueCodes !== null) {
          value = { kind: 'codes', codes: a.valueCodes, labels: a.valueCodes.map(label) };
        } else {
          try {
            const v = sensitivePlaintextToValue(await decryptPeerAnswer(a.valueCiphertext!, ctx.pariwarId, enc));
            value = v === null ? { kind: 'unavailable' } : 'date' in v ? { kind: 'date', date: v.date } : { kind: 'codes', codes: [...v.codes], labels: v.codes.map(label) };
          } catch (err) {
            warn('answer', err);
            value = { kind: 'unavailable' };
          }
        }
        if (a.questionKey === 'callback_consent' && value.kind === 'codes' && value.codes.length === 1 && value.codes[0] === 'yes') consented = true;
        views_.push({
          questionKey: a.questionKey,
          question: q ? enWords(q.copyKey, memberName) : a.questionKey,
          value,
          savedVia: a.savedVia,
          savedAt: a.savedAt.toISOString(),
          changeCount: Math.max(0, a.versions - 1),
        });
      }
      replyView = { submitted: reply.submittedAt !== null, answers: views_ };
    }

    // ── the call-back mobile (only on a "yes") ──
    let callbackMobile: PeerMeshPingView['callbackMobile'] = { status: 'none' };
    if (consented) {
      try {
        const canonical = contact?.mobileCiphertext ? encryption.normalizeMobile(await encryption.decryptMobile(contact.mobileCiphertext, enc)) : null;
        if (canonical === null) callbackMobile = { status: 'unavailable' };
        else {
          callbackMobile = { status: 'shown', text: canonical };
          ctx.onCallbackMobileShown?.(ping.pingId);
        }
      } catch (err) {
        warn('mobile', err);
        callbackMobile = { status: 'unavailable' };
      }
    }

    views.push({
      pingId: ping.pingId,
      memberId: ping.memberId,
      responderName,
      sendStatus: (ping.sendOutcome ?? 'not_sent') as PeerMeshPingView['sendStatus'],
      noTargetReason: ping.sendOutcome === 'no_target' ? ping.detail : null,
      reply: replyView,
      callbackMobile,
    });
  }
  return views;
}
