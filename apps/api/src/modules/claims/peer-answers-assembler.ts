// `assemblePeerSection` — the neighbours' answers as STAFF see them (Story 6.27a PM13, PM25 (c); `2026-10-10-311`). ONE
// ACTOR-AWARE assembler: the verifier console's peer-mesh section uses it, and 6.27b's every-approver read (PM24) reuses
// it — so the inspector's "form your own view first" hide (PM25 (c)) and the call-back disclosure audit travel WITH it,
// ⛔ never with one caller (second-pass review S13: they lived only in the console wrapper). English only (F22).
//
// ⭐ FIRST, the hide: an actor holding an UN-completed ground-inspection assignment with ⛔ no completed FULL visit gets
// `hidden` — ⛔ no title, ⛔ no counts, ⛔ no "hidden" line. A hide check that cannot RUN is `hidden` too (fail CLOSED —
// review S14: an `unavailable` section would itself show the inspector a title). ⚠ ACCEPTED TRADE-OFF (fourth-pass
// review V11, closing U16 (d)): the reader is unknown when the check fails, so EVERY reader — the District Admin included
// — gets ⛔ section on that transient fault, with only a log line (⛔ Invariant 8's "could not be shown"). The inspector's
// independence is the ratified rule (PM25 (c)); a District Admin's next read shows the section again.
//
// Per neighbour: the NAME (the KYC name, decrypted HERE in the handler — ⛔ never the warning module), the send status for
// EVERY value of the ping's column (6.27c writes it), and — once they answered — EVERY live answer with its question's
// English words (the sensitive ones decrypted here), submitted or not, how it was saved (app / helpline), when, and
// "changed N times"; when the neighbour said YES to a call back, their mobile (decrypted, normalised).
// ⭐ The disclosure callback is REQUIRED and fires only once the WHOLE section has assembled (review S17 — ⛔ an audit
// line for a number the section then failed to deliver); the console route emits the audit lines after its packet is built.
// ⭐ A failed decrypt is `unavailable` ("could not be shown just now") — ⛔ never a blank (Invariant 8); an ERASED
// neighbour (the sentinel) is `none`, for the name AND the mobile (review S23).
// ⛔ The per-answer warning flags arrive with 6.27b (from the warnings read; a failed read ⇒ `null`).
// Reads (each counted by `bump`, each run through `ctx.run` — the console's SAVEPOINT): the hide check, the selection, the
// pings, the responses, the answers (one bounded statement), and — ONLY when there is a ping — the contacts (review S25).

import { PEER_MESH_SEND_STATUSES, type PeerMeshAnswerView, type PeerMeshPingView } from '@twt/contracts';
import { claim, encryption, ids, member as memberDomain, questionnaires, type Db } from '@twt/domain';
import { t } from '@twt/i18n';

import type { EncryptionDeps } from '../../context.js';
import { decryptKycField } from '../kyc/kyc-crypto.js';
import { decryptPeerAnswer, sensitivePlaintextToValue } from './peer-request-core.js';

export interface PeerAnswersContext {
  readonly db: Db;
  readonly pariwarId: string;
  readonly claimCaseId: string;
  /** The READER — PM25 (c)'s hide is judged for THIS actor. */
  readonly actorId: string;
  readonly log?: { warn: (obj: unknown, msg: string) => void };
  /**
   * REQUIRED — called once per call-back mobile SHOWN, after the whole section assembled; the caller audits each
   * (`admin_verifier_console.peer_callback_mobile_shown` — actor, claim, ping; ⛔ never the number).
   */
  readonly onCallbackMobileShown: (pingId: string) => void;
  /**
   * Runs ONE counted read — REQUIRED (third-pass review U11): the console passes its SAVEPOINT wrapper (`underSavepoint`),
   * so a failed read ⛔ never aborts the scope tx under the later sections. A bare read would leave a swallowed hide-check
   * failure inside an ABORTED tx (25P02) — so 6.27b's reuse must pass one too.
   */
  readonly run: <T>(label: string, read: () => Promise<T>) => Promise<T>;
}

export type PeerSection =
  | { readonly kind: 'hidden' }
  | { readonly kind: 'no_selection' }
  | {
      readonly kind: 'present';
      readonly selection: NonNullable<Awaited<ReturnType<typeof claim.getPeerMeshSelectionByClaim>>>;
      readonly pingMemberIds: readonly string[];
      readonly responses: Awaited<ReturnType<typeof claim.getPeerMeshResponses>>;
      readonly pings: PeerMeshPingView[];
    };

const enWords = (key: string, member: string): string => t(key, { member }, { locale: 'en', namespace: 'claim' });

/**
 * Build the peer-mesh section for `ctx.actorId`. `bump` is called once per counted source read (the console's read
 * ceiling). `memberName` interpolates the question words (`{member}`).
 */
export async function assemblePeerSection(
  enc: EncryptionDeps,
  ctx: PeerAnswersContext,
  bump: () => void,
  memberName: string,
): Promise<PeerSection> {
  const pariwarId = ids.pariwarId(ctx.pariwarId);
  const claimCaseId = ids.claimId(ctx.claimCaseId);
  const run = ctx.run;
  const warn = (what: string, err: unknown) =>
    ctx.log?.warn({ errName: (err as Error | null)?.name, what, claimCaseId: ctx.claimCaseId }, 'peer-answers: a field could not be shown');

  // ── PM25 (c) — FIRST, and fail CLOSED ──
  bump();
  try {
    if (await run('peer_section_visibility', () => claim.isPeerSectionHiddenFromActor(ctx.db, pariwarId, claimCaseId, ctx.actorId))) {
      return { kind: 'hidden' };
    }
  } catch (err) {
    warn('visibility', err);
    return { kind: 'hidden' };
  }

  bump();
  const selection = await run('peer_section_selection', () => claim.getPeerMeshSelectionByClaim(ctx.db, pariwarId, claimCaseId));
  if (!selection) return { kind: 'no_selection' };
  bump();
  const pingRows = await run('peer_section_pings', () => claim.getPeerMeshPingIntentsBySelection(ctx.db, pariwarId, selection.selectionId));
  bump();
  const responses = await run('peer_section_responses', () => claim.getPeerMeshResponses(ctx.db, claimCaseId));
  bump();
  const { replies, answers } = await run('peer_section_answers', () => claim.readPeerAnswersForClaim(ctx.db, pariwarId, claimCaseId));
  let contacts = new Map<string, { readonly nameCiphertext: string | null; readonly mobileCiphertext: string | null }>();
  if (pingRows.length > 0) {
    bump();
    contacts = await run('peer_section_contacts', () =>
      claim.readPeerNeighbourContacts(ctx.db, pariwarId, pingRows.map((p) => ids.memberId(p.memberId))),
    );
  }

  const shown: string[] = [];
  const pings: PeerMeshPingView[] = [];
  for (const ping of pingRows) {
    // ── the send status — a value the contract does ⛔ not know degrades THIS section, ⛔ the whole packet (review S24) ──
    const sendStatus = ping.sendOutcome ?? 'not_sent';
    if (!(PEER_MESH_SEND_STATUSES as readonly string[]).includes(sendStatus)) {
      throw new Error(`[peer-answers] send status '${sendStatus}' is not in the console contract`);
    }

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
      const views: PeerMeshAnswerView[] = [];
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
        views.push({
          questionKey: a.questionKey,
          question: q ? enWords(q.copyKey, memberName) : a.questionKey,
          value,
          savedVia: a.savedVia,
          savedAt: a.savedAt.toISOString(),
          changeCount: Math.max(0, a.versions - 1),
        });
      }
      replyView = { submitted: reply.submittedAt !== null, answers: views };
    }

    // ── the call-back mobile (only on a "yes") ──
    let callbackMobile: PeerMeshPingView['callbackMobile'] = { status: 'none' };
    if (consented && contact?.mobileCiphertext) {
      try {
        const plain = await encryption.decryptMobile(contact.mobileCiphertext, enc);
        if (plain === memberDomain.ANONYMIZED_SENTINEL) callbackMobile = { status: 'none' }; // erased — ⛔ "just now"
        else {
          const canonical = encryption.normalizeMobile(plain);
          if (canonical === null) callbackMobile = { status: 'unavailable' };
          else {
            callbackMobile = { status: 'shown', text: canonical };
            shown.push(ping.pingId);
          }
        }
      } catch (err) {
        warn('mobile', err);
        callbackMobile = { status: 'unavailable' };
      }
    } else if (consented) {
      callbackMobile = { status: 'unavailable' };
    }

    pings.push({
      pingId: ping.pingId,
      memberId: ping.memberId,
      responderName,
      sendStatus: sendStatus as PeerMeshPingView['sendStatus'],
      noTargetReason: ping.sendOutcome === 'no_target' ? (ping.detail ?? null) : null,
      reply: replyView,
      callbackMobile,
    });
  }

  // The section is whole — only NOW is each shown mobile reported (review S17).
  for (const pingId of shown) ctx.onCallbackMobileShown(pingId);
  return { kind: 'present', selection, pingMemberIds: pingRows.map((p) => p.memberId), responses, pings };
}
