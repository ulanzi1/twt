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
// line for a number the section then failed to deliver); the console route emits the audit lines after its packet is built,
// and 6.27b's approvers' read (PM24) after its response is built — each with its OWN event.
// ⭐ THE CALL-BACK NUMBER — Story 6.27b, `2026-10-13-328` read with its erratum `-329` (`callbackViewer`, REQUIRED, ⛔ never
// defaulted), ONE rule per ping, in this order: (1) a ping ⛔ never texted (`send_outcome` ⛔ `'accepted'`) ⇒ `none`, ⛔ no
// decrypt, for EVERY viewer; (2) the Super Admin ⇒ shown whatever the answer (basis `consented` on a "Yes", else
// `super_admin` — BigDev's reading of "no explicit permission is required", ⛔ Panel words); (3) the District Admin's side
// (the console) ⇒ on a "Yes" of either version; (4) the Pariwar Admin (PM24) ⇒ ONLY on a "Yes" to a question whose
// `callbackAudience` is `'admin'` (v3's words), read from the REPLY's version — a v2 "Yes", or a version that does ⛔ not
// resolve, ⇒ `none` (fail CLOSED; Q1 C in full).
// ⭐ A failed decrypt is `unavailable` ("could not be shown just now") — ⛔ never a blank (Invariant 8); an ERASED
// neighbour (the sentinel) is `none`, for the name AND the mobile (review S23).
// ⭐ The per-answer warning flags (Story 6.27b, PM13's flags) are STITCHED from the warnings read by `stitchPeerAnswerFlags`
// — ⛔ never a second computation; a failed read ⇒ `null`. The assembler keeps each answer's `answerId` for that stitch
// (an UNSTITCHED view); ⛔ it never reaches the wire.
// ⭐ "Changed N times" (`changeCount`, Story 6.27b BD3 A — `2026-10-13-326`, kept as built): every earlier saved version
// of this answer, INCLUDING one removed when an earlier answer changed (a date removed when `has_died` became "not sure")
// and a re-entry of the same value.
// Reads (each counted by `bump`, each run through `ctx.run` — the console's SAVEPOINT): the hide check, the selection, the
// pings, the responses, the answers (one bounded statement), the inspector's discrepancy showings and notes (Story 6.27d —
// two, per claim), and — ONLY when there is a ping — the contacts (review S25).
// ⭐ Story 6.32 (`2026-10-28-413` IQ7 (A); AC8) — the FAMILY's account at the inspection (`familyAccount`) rides THIS section,
// read right AFTER the hide (so a hidden reader sees ⛔ it — the section stays ONE withholding rule) and BEFORE the selection
// (a claim with nobody to ask has ⛔ selection, and its head's letter is the answer that matters there — AC10). The SAME
// audience as the neighbours' answers (CF2); context only — ⛔ a warning, ⛔ a flag. The cause / illness are decrypted HERE
// and the decrypt is covered by the caller's section-read audit line (6.27a S12).

import {
  type GroundInspectionFamilyAccountVisit,
  type InspectionDiscrepancyStaffView,
  PEER_MESH_SEND_STATUSES,
  type PeerMeshAnswerView,
  type PeerMeshPingView,
  type PeerMeshSection,
} from '@twt/contracts';
import { claim, encryption, ids, member as memberDomain, questionnaires, type Db } from '@twt/domain';
import { t } from '@twt/i18n';

import type { EncryptionDeps } from '../../context.js';
import { decryptKycField } from '../kyc/kyc-crypto.js';
import { decryptPeerAnswer, sensitivePlaintextToValue } from './peer-request-core.js';
import { decryptGroundInspectionField } from './ground-inspection-crypto.js';

/**
 * Story 6.27b (`-328` read with `-329`) — WHO is reading, for the call-back number's four rules (the header). Each caller
 * derives it from `rbac.matchingGrantRole` over the key its own gate used: `'super_admin'` ONLY on a `super_admin`
 * match; any other result takes the restrictive rule for that surface (`'district'` on the console, `'pariwar_admin'`
 * on the approvers' read).
 */
export type PeerCallbackViewer = 'district' | 'pariwar_admin' | 'super_admin';

/** Why a number was shown — the neighbour's "Yes" (`consented`), or the Super Admin's own reading (`super_admin`). */
export type PeerCallbackBasis = 'consented' | 'super_admin';

export interface PeerAnswersContext {
  readonly db: Db;
  readonly pariwarId: string;
  readonly claimCaseId: string;
  /** The READER — PM25 (c)'s hide is judged for THIS actor. */
  readonly actorId: string;
  /** Story 6.27b — REQUIRED, ⛔ never defaulted: whose rule the call-back number follows (the header). */
  readonly callbackViewer: PeerCallbackViewer;
  readonly log?: { warn: (obj: unknown, msg: string) => void };
  /**
   * REQUIRED — called once per call-back mobile SHOWN, after the whole section assembled, with WHY it was shown; the
   * caller audits each (`admin_verifier_console.peer_callback_mobile_shown` /
   * `admin_claim.peer_callback_mobile_shown` — actor, claim, ping, basis; ⛔ never the number).
   */
  readonly onCallbackMobileShown: (pingId: string, basis: PeerCallbackBasis) => void;
  /**
   * Runs ONE counted read — REQUIRED (third-pass review U11): the console passes its SAVEPOINT wrapper (`underSavepoint`),
   * so a failed read ⛔ never aborts the scope tx under the later sections. A bare read would leave a swallowed hide-check
   * failure inside an ABORTED tx (25P02) — so 6.27b's reuse must pass one too.
   */
  readonly run: <T>(label: string, read: () => Promise<T>) => Promise<T>;
}

/** An answer before its warning flag is stitched (Story 6.27b, the 6.26b `UnstitchedGroundInspectionItem` pattern) — it
 *  carries the live row's `answerId` for the stitch; ⛔ never on the wire. */
export type UnstitchedPeerMeshAnswerView = Omit<PeerMeshAnswerView, 'warningFlag'> & { readonly answerId: string };
export type UnstitchedPeerMeshPingView = Omit<PeerMeshPingView, 'reply'> & {
  readonly reply: { readonly submitted: boolean; readonly answers: UnstitchedPeerMeshAnswerView[] } | null;
};
type PresentPeerMeshSection = Extract<PeerMeshSection, { status: 'present' }>;
export type UnstitchedPeerMeshSection =
  | (Omit<PresentPeerMeshSection, 'transcript'> & {
      readonly transcript: Omit<PresentPeerMeshSection['transcript'], 'pings'> & { readonly pings: UnstitchedPeerMeshPingView[] };
    })
  | Exclude<PeerMeshSection, { status: 'present' }>;

export type PeerSection =
  /** `cause` (code review round 2, X2) — the reader's own visit is pending (`own_visit`) or the hide check FAILED
   *  (`check_failed`, the V11 fail-closed hide); the console words its withheld staff notes by it. */
  | { readonly kind: 'hidden'; readonly cause: 'own_visit' | 'check_failed' }
  | {
      readonly kind: 'no_selection';
      readonly familyAccount: GroundInspectionFamilyAccountVisit[];
      readonly familyAccountInheritedFromClaimId: string | null;
    }
  | {
      readonly kind: 'present';
      /** ⭐ Story 6.32 (IQ7) — the family's account at the inspection (decrypted here). */
      readonly familyAccount: GroundInspectionFamilyAccountVisit[];
      /** ⭐ Story 6.32 (S22 A) — the `-239` source whose inspection this claim inherits (a POINTER, ⛔ its answers), or `null`. */
      readonly familyAccountInheritedFromClaimId: string | null;
      readonly selection: NonNullable<Awaited<ReturnType<typeof claim.getPeerMeshSelectionByClaim>>>;
      readonly pingMemberIds: readonly string[];
      readonly responses: Awaited<ReturnType<typeof claim.getPeerMeshResponses>>;
      readonly pings: UnstitchedPeerMeshPingView[];
      /** ⭐ Story 6.27d (R5) — the claim's recorded inspector discrepancies, with their notes (decrypted here). */
      readonly inspectionDiscrepancies: InspectionDiscrepancyStaffView[];
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
      return { kind: 'hidden', cause: 'own_visit' };
    }
  } catch (err) {
    warn('visibility', err);
    return { kind: 'hidden', cause: 'check_failed' };
  }

  // ⭐ Story 6.32 (IQ7) — AFTER the hide, BEFORE the selection (see the header).
  bump();
  const familyVisits = await run('peer_section_family_account', () => claim.readClaimFamilyAccount(ctx.db, pariwarId, claimCaseId));
  const familyAccount = await familyAccountViews(enc, ctx.pariwarId, familyVisits, memberName, warn);
  // ⭐ Story 6.32 (second review S22, BigDev: "S22 A") — a claim approved on an INHERITED inspection points at the claim the
  // family's answers are recorded on (the ONE inheritance fragment — the approval gate's own); ⛔ its answers are read.
  bump();
  const inherited = await run('peer_section_family_account_inherited', () =>
    claim.getInheritedGroundInspectionSource(ctx.db, pariwarId, claimCaseId),
  );
  const familyAccountInheritedFromClaimId = inherited === null ? null : inherited.toLowerCase();

  bump();
  const selection = await run('peer_section_selection', () => claim.getPeerMeshSelectionByClaim(ctx.db, pariwarId, claimCaseId));
  if (!selection) return { kind: 'no_selection', familyAccount, familyAccountInheritedFromClaimId };
  bump();
  const pingRows = await run('peer_section_pings', () => claim.getPeerMeshPingIntentsBySelection(ctx.db, pariwarId, selection.selectionId));
  bump();
  const responses = await run('peer_section_responses', () => claim.getPeerMeshResponses(ctx.db, claimCaseId));
  bump();
  const { replies, answers } = await run('peer_section_answers', () => claim.readPeerAnswersForClaim(ctx.db, pariwarId, claimCaseId));
  // ⭐ Story 6.27d (R5) — the inspector's discrepancy showings and re-ask notes, PER CLAIM (two reads, ⛔ per assignment),
  // AFTER the hide above: the audience is exactly the one already entitled to every neighbour answer.
  bump();
  const discrepancyShowings = await run('peer_section_discrepancy_showings', () =>
    claim.readClaimInspectionDiscrepancyShowings(ctx.db, pariwarId, claimCaseId),
  );
  bump();
  const discrepancyNotes = await run('peer_section_discrepancy_notes', () =>
    claim.readClaimInspectionDiscrepancyNotes(ctx.db, pariwarId, claimCaseId),
  );
  let contacts = new Map<string, { readonly nameCiphertext: string | null; readonly mobileCiphertext: string | null }>();
  if (pingRows.length > 0) {
    bump();
    contacts = await run('peer_section_contacts', () =>
      claim.readPeerNeighbourContacts(ctx.db, pariwarId, pingRows.map((p) => ids.memberId(p.memberId))),
    );
  }

  const shown: { pingId: string; basis: PeerCallbackBasis }[] = [];
  const pings: UnstitchedPeerMeshPingView[] = [];
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
    let replyView: UnstitchedPeerMeshPingView['reply'] = null;
    let consented = false;
    // `-329` decision 1 — whom the reply's call-back question named (its OWN version; ⛔ never a list of version ids).
    let audience: questionnaires.CallbackAudience | null = null;
    if (reply) {
      const def = questionnaires.getQuestionnaireVersion(reply.questionnaireVersionId);
      const questions = def ? questionnaires.questionsOf(def) : [];
      audience = questions.find((x) => x.key === 'callback_consent')?.callbackAudience ?? null;
      const views: UnstitchedPeerMeshAnswerView[] = [];
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
          answerId: a.answerId,
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

    // ── the call-back mobile — the four rules (`-328` read with `-329`; the header) ──
    const basis = callbackBasisFor(ctx.callbackViewer, { texted: ping.sendOutcome === 'accepted', consented, audience });
    let callbackMobile: PeerMeshPingView['callbackMobile'] = { status: 'none' };
    let callbackBasis: PeerMeshPingView['callbackBasis'] = null;
    if (basis !== null && contact?.mobileCiphertext) {
      try {
        const plain = await encryption.decryptMobile(contact.mobileCiphertext, enc);
        if (plain === memberDomain.ANONYMIZED_SENTINEL) callbackMobile = { status: 'none' }; // erased — ⛔ "just now"
        else {
          const canonical = encryption.normalizeMobile(plain);
          if (canonical === null) callbackMobile = { status: 'unavailable' };
          else {
            callbackMobile = { status: 'shown', text: canonical };
            callbackBasis = basis;
            shown.push({ pingId: ping.pingId, basis });
          }
        }
      } catch (err) {
        warn('mobile', err);
        callbackMobile = { status: 'unavailable' };
      }
    } else if (basis !== null) {
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
      callbackBasis,
      // Story 6.36 (SW24) — the ping row's own column (⛔ a new read); `null` for a `district_cohort_v1` selection.
      source: ping.source ?? null,
    });
  }

  // ── Story 6.27d (R5, R4a) — each recorded showing with its notes; a note that cannot be decrypted (or was erased) is
  // `unavailable`, ⛔ never blank, ⛔ never the sentinel text. ──
  const inspectionDiscrepancies: InspectionDiscrepancyStaffView[] = [];
  for (const sh of discrepancyShowings) {
    const notes: InspectionDiscrepancyStaffView['notes'] = [];
    for (const n of discrepancyNotes.filter((x) => x.groundInspectionId === sh.groundInspectionId)) {
      let note: InspectionDiscrepancyStaffView['notes'][number]['note'];
      try {
        const text = await decryptGroundInspectionField(n.noteCiphertext, ctx.pariwarId, enc);
        note = text === memberDomain.ANONYMIZED_SENTINEL ? { status: 'unavailable' } : text;
      } catch (err) {
        warn('discrepancy_note', err);
        note = { status: 'unavailable' };
      }
      notes.push({ questionKey: n.questionKey, note, notedAt: n.notedAt.toISOString(), authorDisplay: n.authorDisplay });
    }
    inspectionDiscrepancies.push({
      groundInspectionId: sh.groundInspectionId,
      completedAt: sh.completedAt.toISOString(),
      shownAt: sh.shownAt.toISOString(),
      questionKeys: [...sh.questionKeys],
      notes,
    });
  }

  // The section is whole — only NOW is each shown mobile reported (review S17).
  for (const { pingId, basis } of shown) ctx.onCallbackMobileShown(pingId, basis);
  return { kind: 'present', selection, pingMemberIds: pingRows.map((p) => p.memberId), responses, pings, inspectionDiscrepancies, familyAccount, familyAccountInheritedFromClaimId };
}

/**
 * ⭐ Story 6.32 (IQ7; AC8) — the family's account as staff see it: each answer with its question's and options' English
 * words from the visit's PINNED version; a ciphertext decrypted HERE (the cause / illness — a JSON code list); erased (the
 * sentinel), undecryptable or unparseable ⇒ `unavailable`, ⛔ never blank, ⛔ never the sentinel text.
 */
async function familyAccountViews(
  enc: EncryptionDeps,
  pariwarId: string,
  visits: readonly claim.ClaimFamilyAccountVisit[],
  memberName: string,
  warn: (what: string, err: unknown) => void,
): Promise<GroundInspectionFamilyAccountVisit[]> {
  const out: GroundInspectionFamilyAccountVisit[] = [];
  for (const visit of visits) {
    const def = visit.questionnaireVersionId === null ? null : questionnaires.getQuestionnaireVersion(visit.questionnaireVersionId);
    const answers: GroundInspectionFamilyAccountVisit['answers'] = [];
    for (const a of visit.answers) {
      const q = def === null ? undefined : questionnaires.questionsOf(def).find((x) => x.key === a.questionKey);
      const labelOf = (code: string) => {
        const o = q?.options.find((x) => x.code === code);
        return o === undefined ? code : enWords(o.copyKey, memberName);
      };
      let codes: readonly string[] | null = a.valueCodes;
      if (codes === null && a.valueCiphertext !== null) {
        try {
          const plain = await decryptGroundInspectionField(a.valueCiphertext, pariwarId, enc);
          const parsed: unknown = plain === memberDomain.ANONYMIZED_SENTINEL ? null : JSON.parse(plain);
          codes = Array.isArray(parsed) && parsed.every((c) => typeof c === 'string') ? (parsed as string[]) : null;
        } catch (err) {
          warn('family_answer', err);
          codes = null;
        }
      }
      answers.push({
        questionKey: a.questionKey,
        question: q === undefined ? a.questionKey : enWords(q.copyKey, memberName),
        value: codes === null ? { kind: 'unavailable' } : { kind: 'codes', codes: [...codes], labels: codes.map(labelOf) },
        savedAt: a.savedAt.toISOString(),
      });
    }
    out.push({ groundInspectionId: visit.groundInspectionId, completedAt: visit.completedAt?.toISOString() ?? null, answers });
  }
  return out;
}

/**
 * ⭐ The call-back number's FOUR rules (Story 6.27b; `-328` read with `-329`), in order — the basis to show it on, or
 * `null` (⛔ shown, ⛔ decrypted). PURE.
 */
export function callbackBasisFor(
  viewer: PeerCallbackViewer,
  ping: { readonly texted: boolean; readonly consented: boolean; readonly audience: questionnaires.CallbackAudience | null },
): PeerCallbackBasis | null {
  if (!ping.texted) return null; // (1) ⛔ never for a neighbour who was never texted — for EVERY viewer (`-329` decision 4)
  if (viewer === 'super_admin') return ping.consented ? 'consented' : 'super_admin'; // (2)
  if (!ping.consented) return null;
  if (viewer === 'district') return 'consented'; // (3) a "Yes" of either version
  return ping.audience === 'admin' ? 'consented' : null; // (4) the Pariwar Admin: a "Yes" to v3's words ONLY
}

/**
 * Story 6.27b (BF20) — the WIRE section from the assembler, ONE copy for the console (`assemblePeerMesh`) and the
 * approvers' read (PM24). `assemble` is a THUNK: the selection / pings / answers reads throw INSIDE
 * `assemblePeerSection`, before any section exists ⇒ caught here as `unavailable` ("could not be shown just now").
 * `undefined` ⇔ the section is HIDDEN from this reader (PM25 (c) — the field ABSENT, ⛔ a variant). Still UNSTITCHED:
 * the caller runs `stitchPeerAnswerFlags` once its warnings read exists.
 */
export async function assemblePeerMeshSection(
  assemble: () => Promise<PeerSection>,
  opts: { readonly claimCaseId: string; readonly log?: { warn: (obj: unknown, msg: string) => void } },
): Promise<UnstitchedPeerMeshSection | undefined> {
  try {
    const section = await assemble();
    if (section.kind === 'hidden') return undefined;
    if (section.kind === 'no_selection') {
      return { status: 'empty', familyAccount: section.familyAccount, familyAccountInheritedFromClaimId: section.familyAccountInheritedFromClaimId };
    }
    const { selection, responses } = section;
    return {
      status: 'present',
      transcript: {
        selectionId: selection.selectionId,
        distinctResponderCount: claim.distinctPeerMeshResponderCount(responses),
        pingedMemberIds: [...section.pingMemberIds],
        // Append-order responses; a non-response is simply ABSENT and is NEVER inferred as `denied` (AC2c).
        responses: responses.map((r) => ({ responderMemberId: r.responderMemberId, response: r.response })),
        // AC2c's verifier annotations have no owning producer yet — explicit not_available_yet, never fabricated.
        verifierAnnotations: { status: 'not_available_yet' },
        outcome: selection.outcome,
        windowExpiresAt: selection.responseWindowExpiresAt.toISOString(),
        pings: section.pings,
        // Story 6.27d (R5) — REQUIRED, possibly empty.
        inspectionDiscrepancies: section.inspectionDiscrepancies,
        // Story 6.36 (SW20) — the staff line, from the selection row in hand; `null` for `district_cohort_v1`.
        recentChangeBeforeFiling: selection.recentChangeBeforeFiling ?? null,
      },
      // ⭐ Story 6.32 (IQ7) — REQUIRED, possibly empty; (S22) the inherited source, or `null`.
      familyAccount: section.familyAccount,
      familyAccountInheritedFromClaimId: section.familyAccountInheritedFromClaimId,
    };
  } catch (err) {
    opts.log?.warn({ err, claimCaseId: opts.claimCaseId }, 'peer-answers: the peer-mesh section is unavailable');
    return { status: 'unavailable' };
  }
}

/**
 * ⭐ Story 6.32 (second review S15; AC8 "audited as the section's read already is") — what the read line records of the
 * FAMILY's account the section carried: counts only (⛔ a key's value, ⛔ a code). `family_health_answer_count` = the cause /
 * illness answers DECRYPTED for this reader (the Tier-1 read the line must show). ⛔ section (hidden / unavailable) ⇒ zeros.
 */
export function familyAccountAuditCounts(
  section:
    | {
        readonly status: string;
        readonly familyAccount?: readonly GroundInspectionFamilyAccountVisit[];
        readonly familyAccountInheritedFromClaimId?: string | null;
      }
    | undefined,
): {
  readonly family_visit_count: number;
  readonly family_answer_count: number;
  readonly family_health_answer_count: number;
  readonly family_account_inherited: boolean;
} {
  const visits = section?.familyAccount ?? [];
  const answers = visits.flatMap((v) => v.answers);
  const health: readonly string[] = questionnaires.GROUND_INSPECTION_SENSITIVE_QUESTION_KEYS;
  return {
    family_visit_count: visits.length,
    family_answer_count: answers.length,
    family_health_answer_count: answers.filter((a) => health.includes(a.questionKey) && a.value.kind === 'codes').length,
    // ⭐ S22 — a flag, ⛔ the source's id (the line's locator already names THIS claim).
    family_account_inherited: (section?.familyAccountInheritedFromClaimId ?? null) !== null,
  };
}

/**
 * ⭐ Story 6.27b (PM13's flags; AC8; Invariant 8) — each answer's `warningFlag`, STITCHED from the warnings read (the
 * SAME keys the ONE rule uses — ⛔ never a second computation) and `answerId` dropped (⛔ on the wire). PURE:
 *   · a question that can ⛔ never warn (⛔ in `PEER_MESH_WARNING_QUESTION_KEYS` — CF3 (b)) ⇒ `false`;
 *   · the warnings read FAILED (`peerAnswerFlags === null`) ⇒ `null` ("could not be checked just now");
 *   · the answer in the read's map ⇒ its value; ⛔ in it (saved between the two READ COMMITTED statements) ⇒ `null`.
 * ⛔ Never `false` for an unknown.
 */
export function stitchPeerAnswerFlags(
  section: UnstitchedPeerMeshSection,
  read: { readonly peerAnswerFlags: ReadonlyMap<string, boolean> | null },
): PeerMeshSection {
  if (section.status !== 'present') return section;
  const warningKeys: readonly string[] = questionnaires.PEER_MESH_WARNING_QUESTION_KEYS;
  return {
    ...section,
    transcript: {
      ...section.transcript,
      pings: section.transcript.pings.map((ping) => ({
        ...ping,
        reply:
          ping.reply === null
            ? null
            : {
                submitted: ping.reply.submitted,
                answers: ping.reply.answers.map(({ answerId, ...answer }) => ({
                  ...answer,
                  warningFlag: !warningKeys.includes(answer.questionKey)
                    ? false
                    : read.peerAnswerFlags === null
                      ? null
                      : (read.peerAnswerFlags.get(answerId.toLowerCase()) ?? null),
                })),
              },
      })),
    },
  };
}
