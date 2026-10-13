// The neighbours' answer screens — the HANDLER-SIDE core shared by the member routes (PM11) and the helpline routes (PM12),
// Story 6.27a (`2026-10-10-311`).
//
//   · the crypto: a sensitive answer (the date, the cause, the illness) is encrypted under `PEER_MESH_ANSWER_FIELD_CLASS`,
//     and the date's THREE keyed window indexes are computed under `DEATH_DATE_INDEX_FIELD_CLASS` through the ONE shared
//     `deathDateBlindIndex` — HERE, BEFORE the domain writer takes its locks (⛔ no KMS under a lock — Trap 9). The reply's
//     live sensitive answers are decrypted here too (pre-lock) and handed to the writer keyed by `answer_id`; the writer
//     re-verifies them under its locks (a stale read is a 409 the client retries).
//   · the wire: the PINNED version's SERVED definition with its words resolved in en AND hi (`{member}` = the Pariwar's
//     mode-resolved name), and the live answers decrypted for their OWNER (the neighbour, or the operator recording them).
//   · the errors: the domain's peer-request errors → 404 / 409 / 422 — ⛔ never why a request is closed.
// ⛔ NEVER log a decrypted value, the member's name or a link code; ⛔ never put one in an audit line.

import { createHash } from 'node:crypto';

import type { PeerRequestDetailResponse, PeerRequestLiveAnswer, PeerRequestQuestionnaire } from '@twt/contracts';
import {
  PEER_REQUEST_INVALID_ANSWER_CODE,
  PEER_REQUEST_NO_LONGER_OPEN_CODE,
  PEER_REQUEST_STALE_CODE,
  PEER_REQUEST_SUBMITTED_CODE,
} from '@twt/contracts';
import { canonicalJsonStringify, claim, cycleCalendar, encryption, ids, kyc as kycDomain, member as memberDomain, notifications, questionnaires, type Db } from '@twt/domain';
import { t } from '@twt/i18n';
import type { FastifyBaseLogger } from 'fastify';

import { PEER_MESH_ANSWER_FIELD_CLASS, type EncryptionDeps } from '../../context.js';
import { ApiError, ConflictError, NotFoundError } from '../../http-errors.js';
import { decryptKycField } from '../kyc/kyc-crypto.js';
import { deathDateBlindIndex } from './ground-inspection-crypto.js';

/** The ONE not-found code on every peer-request route (member and helpline) — indistinguishable by design. */
export const PEER_REQUEST_NOT_FOUND_CODE = 'peer_request.not_found';

function encContext(pariwarId: string) {
  return { pariwarId, fieldClass: PEER_MESH_ANSWER_FIELD_CLASS };
}

export async function encryptPeerAnswer(plaintext: string, pariwarId: string, enc: EncryptionDeps): Promise<string> {
  const ct = await encryption.encryptTier1(Buffer.from(plaintext, 'utf-8'), encContext(pariwarId), enc.kms, enc.kekRef);
  return encryption.serializeEnvelope(ct);
}

export async function decryptPeerAnswer(serialized: string, pariwarId: string, enc: EncryptionDeps): Promise<string> {
  const bytes = await encryption.decryptTier1(encryption.parseEnvelope(serialized), encContext(pariwarId), enc.kms, enc.kekRef);
  return Buffer.from(bytes).toString('utf-8');
}

/** A sensitive answer's plaintext back to its value (`YYYY-MM-DD` ⇒ a date; else the codes JSON). `null` = unreadable. */
export function sensitivePlaintextToValue(plain: string): questionnaires.QuestionnaireAnswerValue | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(plain)) return { date: plain };
  try {
    const parsed: unknown = JSON.parse(plain);
    if (Array.isArray(parsed) && parsed.every((c) => typeof c === 'string')) return { codes: parsed as string[] };
  } catch {
    // fall through — ⛔ never log the plaintext
  }
  return null;
}

/** Map a domain peer-request error to the transport error (⛔ never why a request is closed). Rethrows anything else. */
export function mapPeerRequestError(err: unknown): never {
  if (err instanceof claim.PeerRequestNotFoundError) throw new NotFoundError('Not found', PEER_REQUEST_NOT_FOUND_CODE);
  if (err instanceof claim.PeerRequestNoLongerOpenError) throw new ConflictError('This request is no longer open', PEER_REQUEST_NO_LONGER_OPEN_CODE);
  if (err instanceof claim.PeerRequestSubmittedError) throw new ConflictError('These answers were already sent', PEER_REQUEST_SUBMITTED_CODE);
  if (err instanceof claim.PeerRequestStaleError) throw new ConflictError('Please try again', PEER_REQUEST_STALE_CODE);
  if (err instanceof claim.PeerRequestInvalidAnswerError) {
    throw new ApiError(422, PEER_REQUEST_INVALID_ANSWER_CODE, 'This answer cannot be saved', { reason: err.reason });
  }
  throw err;
}

/**
 * The deceased member's MODE-RESOLVED name (`-181`; `notifications.resolveMemberFacingDeceasedName`) — ⛔ never the public
 * resolver (it omits a mononym). ⛔ No KYC name, an erased one, or a failed decrypt ⇒ `''` (the screen shows the request
 * without a name; 6.27c's text ⛔ never goes for such a death — `no_target:name_*`).
 */
export async function resolvePeerRequestMemberName(
  tx: Db,
  pariwarId: string,
  deceasedMemberId: string,
  enc: EncryptionDeps,
  log: FastifyBaseLogger,
): Promise<string> {
  const pid = ids.pariwarId(pariwarId);
  const profile = await kycDomain.getMemberKycProfile(tx, pid, ids.memberId(deceasedMemberId));
  if (!profile || profile.nameCiphertext === null) return '';
  let stored: string;
  try {
    stored = await decryptKycField(profile.nameCiphertext, pid, enc);
  } catch (err) {
    log.warn({ errName: (err as Error).name }, 'peer-request: member name decrypt failed — rendering without a name');
    return '';
  }
  if (stored === memberDomain.ANONYMIZED_SENTINEL) return '';
  const mode = await kycDomain.resolvePublicNamePresentationMode(tx, pid);
  return notifications.resolveMemberFacingDeceasedName(mode, stored).trim();
}

/** The SERVED definition on the wire, its words resolved in en AND hi on the server (`{member}` interpolated). */
export function toWireQuestionnaire(def: questionnaires.QuestionnaireDefinition, memberName: string): PeerRequestQuestionnaire {
  const served = questionnaires.servedDefinition(def);
  const words = (key: string) => ({
    en: t(key, { member: memberName }, { locale: 'en', namespace: 'claim' }),
    hi: t(key, { member: memberName }, { locale: 'hi', namespace: 'claim' }),
  });
  return {
    versionId: served.versionId,
    pages: served.pages.map((p) => ({
      questions: p.questions.map((q) => ({
        key: q.key,
        kind: q.kind,
        words: words(q.copyKey),
        options: q.options.map((o) => ({ code: o.code, words: words(o.copyKey), exclusive: o.exclusive === true })),
        optional: q.optional,
        showIf: q.showIf === null ? null : { key: q.showIf.key, anyOf: [...q.showIf.anyOf] },
      })),
    })),
    closingNote: words(served.closingNoteCopyKey),
    thankYou: words(served.thankYouCopyKey),
  };
}

/**
 * Decrypt the reply's live SENSITIVE answers (pre-lock), keyed by `answer_id`. A row that cannot be decrypted is
 * left OUT — the writer then refuses the save as stale rather than act on an unknown (fail-closed).
 */
export async function decryptLiveSensitive(
  rows: readonly { answerId: string; valueCiphertext: string | null }[],
  pariwarId: string,
  enc: EncryptionDeps,
  log: FastifyBaseLogger,
): Promise<Map<string, questionnaires.QuestionnaireAnswerValue>> {
  const out = new Map<string, questionnaires.QuestionnaireAnswerValue>();
  for (const row of rows) {
    if (row.valueCiphertext === null) continue;
    try {
      const value = sensitivePlaintextToValue(await decryptPeerAnswer(row.valueCiphertext, pariwarId, enc));
      if (value !== null) out.set(row.answerId, value);
    } catch (err) {
      log.warn({ errName: (err as Error).name }, 'peer-request: a live answer could not be decrypted');
    }
  }
  return out;
}

/** Preserve a saved answer's existence even when its sensitive value cannot be shown. */
export function toWireAnswers(
  rows: readonly { answerId: string; questionKey: string; valueCodes: string[] | null; savedAt: Date }[],
  decrypted: ReadonlyMap<string, questionnaires.QuestionnaireAnswerValue>,
): PeerRequestLiveAnswer[] {
  const out: PeerRequestLiveAnswer[] = [];
  for (const row of rows) {
    const value = row.valueCodes !== null ? { codes: row.valueCodes } : decrypted.get(row.answerId);
    if (value === undefined) {
      out.push({ questionKey: row.questionKey, value: { unavailable: true }, savedAt: row.savedAt.toISOString() });
      continue;
    }
    out.push({ questionKey: row.questionKey, value: 'date' in value ? { date: value.date } : { codes: [...value.codes] }, savedAt: row.savedAt.toISOString() });
  }
  return out;
}

/** The detail read, shared by the member route and the helpline list. */
export async function buildPeerRequestDetail(
  tx: Db,
  view: claim.PeerRequestView,
  pariwarId: string,
  enc: EncryptionDeps,
  log: FastifyBaseLogger,
): Promise<PeerRequestDetailResponse> {
  const def = claim.pinnedVersionFor(view.reply, ids.pariwarId(pariwarId));
  const memberName = await resolvePeerRequestMemberName(tx, pariwarId, view.deceasedMemberId, enc, log);
  const rows = view.reply ? await claim.readLivePeerAnswers(tx, ids.pariwarId(pariwarId), view.reply.replyId) : [];
  const decrypted = await decryptLiveSensitive(rows, pariwarId, enc, log);
  return {
    pingId: view.pingId,
    memberName,
    questionnaire: toWireQuestionnaire(def, memberName),
    answers: toWireAnswers(rows, decrypted),
    submitted: view.reply?.submittedAt != null,
  };
}

/** Today in IST — a date answer is ⛔ never in the future. */
export function todayIst(now: Date): string {
  return cycleCalendar.istDateOf(now);
}

export interface PreparedSave {
  readonly prepared: claim.PreparedPeerAnswer;
  readonly decryptedLive: Map<string, questionnaires.QuestionnaireAnswerValue>;
  /** The value AS STORED (codes in option order) — what the save response echoes (review S21). */
  readonly stored: questionnaires.QuestionnaireAnswerValue;
  /** The question's live answer already holds `stored` — the save is a no-op and writes ⛔ no audit line (review S20). */
  readonly unchanged: boolean;
}

function sameAnswer(a: questionnaires.QuestionnaireAnswerValue | undefined, b: questionnaires.QuestionnaireAnswerValue): boolean {
  if (a === undefined) return false;
  if ('date' in a || 'date' in b) return 'date' in a && 'date' in b && a.date === b.date;
  return a.codes.length === b.codes.length && a.codes.every((c, i) => c === b.codes[i]);
}

/**
 * PRE-LOCK preparation of one save: read the request (visibility), its pinned version and live answers, decrypt the
 * sensitive ones, pre-check the value to learn its storage form, then ENCRYPT and INDEX it. The domain writer re-does the
 * check under its locks — this is ⛔ never the authority.
 */
export async function prepareSave(
  tx: Db,
  input: {
    readonly pariwarId: string;
    readonly pingId: string;
    readonly memberId: string;
    readonly questionKey: string;
    readonly value: questionnaires.QuestionnaireAnswerValue;
    readonly todayIst: string;
  },
  enc: EncryptionDeps,
  log: FastifyBaseLogger,
): Promise<PreparedSave> {
  const pid = ids.pariwarId(input.pariwarId);
  const view = await claim.readPeerRequest(tx, pid, ids.peerMeshPingId(input.pingId), ids.memberId(input.memberId));
  if (!view.inWindow) throw new claim.PeerRequestNoLongerOpenError();
  if (view.reply?.submittedAt != null) throw new claim.PeerRequestSubmittedError();
  const def = claim.pinnedVersionFor(view.reply, pid);
  const rows = view.reply ? await claim.readLivePeerAnswers(tx, pid, view.reply.replyId) : [];
  const decryptedLive = await decryptLiveSensitive(rows, input.pariwarId, enc, log);
  const live = new Map<string, readonly string[] | null>();
  for (const row of rows) {
    const v = row.valueCodes !== null ? { codes: row.valueCodes } : decryptedLive.get(row.answerId);
    if (v !== undefined) live.set(row.questionKey, 'codes' in v ? v.codes : null);
  }
  const check = questionnaires.checkAnswer(questionnaires.servedDefinition(def), input.questionKey, input.value, live, input.todayIst);
  if (!check.ok) {
    // ⭐ Review S22 — a condition we could ⛔ not evaluate (THIS question's sensitive `showIf` PARENT would not decrypt just
    // now) is a transient STALE (409, retried), ⛔ never a permanent 422 "condition not met" for a fault that is ours.
    // Third-pass review U9: ONLY the parent counts — an unrelated unreadable answer leaves a genuine 422 a 422.
    // Fifth-pass review W1 — the DIRECT parent of the SERVED definition (the one `checkAnswer` used) and ONLY it:
    // `isShowIfMet` reads the direct parent alone, so an unreadable GRANDPARENT can never be why a condition failed
    // (the fourth pass's V8 chain walk turned genuine 422s into retry loops and is reverted).
    const served = questionnaires.questionsOf(questionnaires.servedDefinition(def));
    const parentKey = served.find((q) => q.key === input.questionKey)?.showIf?.key ?? null;
    const parentRow = parentKey === null ? undefined : rows.find((r) => r.questionKey === parentKey);
    const parentUnreadable = parentRow !== undefined && parentRow.valueCiphertext !== null && !decryptedLive.has(parentRow.answerId);
    if (check.reason === 'condition_not_met' && parentUnreadable) throw new claim.PeerRequestStaleError();
    throw new claim.PeerRequestInvalidAnswerError(check.reason);
  }
  const s = check.storage;
  const stored: questionnaires.QuestionnaireAnswerValue =
    s.form === 'codes' ? { codes: [...s.codes] } : check.codes === null ? { date: s.plaintext } : { codes: [...check.codes] };
  const liveRow = rows.find((r) => r.questionKey === input.questionKey);
  const current = liveRow === undefined ? undefined : liveRow.valueCodes !== null ? { codes: liveRow.valueCodes } : decryptedLive.get(liveRow.answerId);
  const unchanged = sameAnswer(current, stored);
  if (s.form === 'codes') return { prepared: { form: 'codes', codes: s.codes }, decryptedLive, stored, unchanged };
  const ciphertext = await encryptPeerAnswer(s.plaintext, input.pariwarId, enc);
  const dateWindowIndexes =
    s.dateWindow === null
      ? null
      : ((await Promise.all(s.dateWindow.map((d) => deathDateBlindIndex(d, input.pariwarId, enc)))) as [string, string, string]);
  return { prepared: { form: 'encrypted', ciphertext, dateWindowIndexes }, decryptedLive, stored, unchanged };
}

/** The audit intent's payload hash — the ping and the question KEY only (⛔ never the value). */
export function peerRequestPayloadHash(shape: Record<string, unknown>): string {
  return createHash('sha256').update(canonicalJsonStringify(shape), 'utf8').digest('hex');
}
