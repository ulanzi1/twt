// A HIDDEN READER's staff notes — Story 6.27b code review round 2, AC7's D1 B + V1 A (BigDev, 2026-10-13 / 2026-10-14).
//
// For a reader the neighbours' section is hidden from on a claim (their OWN ground visit there is pending — PM25 (c)'s ONE
// predicate, `peerSectionHiddenFromActorSql`), EVERY prior staff NOTE on that claim is WITHHELD — approval, denial,
// escalation, R9 vote (approve or deny), the Pariwar Admin's return, the correction-closure notes — on every surface that
// decrypts one for them: a District Admin who acts on a contradicting neighbour must escalate and SAY WHY (P1), so any of
// those notes can carry a neighbour's answer (`-310` CF2: *"the inspector ⛔ nothing before completing their own
// record"*). UNIFORM for the hidden reader, so a blank carries ⛔ no per-note signal (D1 A's per-record withholding did);
// the hidden reader loses their OWN earlier notes too. Every other reader sees every note.
// ⭐ X1 A (X6) — and every OTHER free-text staff note on the claim's records (visit notes and photo captions, the
// death-certificate review note, nominee determination / correction notes, a direction addressed to them) that the reader
// did ⛔ not write themselves (`isSameActorId`); a note whose author is ⛔ recorded is withheld whoever wrote it (fail
// CLOSED). ⚠ The V6 surfaces above withhold even the reader's OWN notes (the asymmetry is recorded).
// ⭐ X2 — ONE explicit representation (`@twt/contracts` `withheld-note.ts`): a `state` union gains
// `{ state: 'withheld', reason }`; a plain-string field keeps its text empty and sets its `…_withheld` / `…Withheld`
// sibling. The reason: `own_visit` (the reader's own visit is pending) or `check_failed` (the hide read FAILED).
// ⛔ Never decrypted, ⛔ never a placeholder that says "hidden" or names the neighbours.
// ⭐ FAIL CLOSED: a hide read that FAILS ⇒ `null` from `readClaimsHiddenFromReader` ⇒ `withheldReasonOn` is
// `check_failed` for every claim on that surface (the reader's hide is unknown — the V11 trade-off, recorded).

import type { NoteWithheldReason, WithheldNote } from '@twt/contracts';
import { claim, ids, type Db } from '@twt/domain';

import { underSavepoint } from './later-approval-warnings.js';

/** The claims (lower-case ids) hidden from the reader, or `null` when the hide read FAILED (⇒ withhold everywhere). */
export type HiddenClaims = ReadonlySet<string> | null;

/**
 * The claims among `claimCaseIds` whose neighbours' section is hidden from `actorId` — ONE set-based statement (≤ 500 ids
 * each, `readOwnVisitPendingClaimIds`) under a raw SAVEPOINT named `label`, so a failure ⛔ never aborts the request's
 * transaction. ⛔ No claim ⇒ ⛔ no read. A failure is logged (ids only) and returns `null`.
 */
export async function readClaimsHiddenFromReader(
  client: { query(text: string): Promise<unknown> },
  db: Db,
  pariwarId: string,
  claimCaseIds: readonly string[],
  actorId: string,
  opts: { readonly label: string; readonly log?: { warn: (obj: unknown, msg: string) => void } },
): Promise<HiddenClaims> {
  if (claimCaseIds.length === 0) return new Set();
  try {
    return await underSavepoint(client, opts.label, () =>
      claim.readOwnVisitPendingClaimIds(db, ids.pariwarId(pariwarId), claimCaseIds, actorId),
    );
  } catch (err) {
    opts.log?.warn(
      { err: err instanceof Error ? err.name : 'unknown', label: opts.label },
      'hidden-reader notes: the own-visit read failed; withholding every staff note on this surface',
    );
    return null;
  }
}

/** WHY the notes on `claimCaseId` are withheld from this reader — `null` ⇔ ⛔ withheld. */
export function withheldReasonOn(hidden: HiddenClaims, claimCaseId: string): NoteWithheldReason | null {
  if (hidden === null) return 'check_failed';
  return hidden.has(claimCaseId.toLowerCase()) ? 'own_visit' : null;
}

/** The same for a one-claim hide flag (`true` hidden, `false` ⛔ hidden, `null` the read FAILED). */
export function withheldReasonOf(hidden: boolean | null): NoteWithheldReason | null {
  return hidden === null ? 'check_failed' : hidden ? 'own_visit' : null;
}

/**
 * X6 — the reason a note AUTHORED by `authorActorId` is withheld from `readerActorId`: ⛔ withheld when the reader wrote
 * it themselves (`isSameActorId`); `authorActorId === null` (⛔ author recorded) is withheld (fail CLOSED).
 */
export function withheldUnlessAuthor(reason: NoteWithheldReason | null, authorActorId: string | null, readerActorId: string): NoteWithheldReason | null {
  if (reason === null) return null;
  return authorActorId !== null && claim.isSameActorId(authorActorId, readerActorId) ? null : reason;
}

/** The `state`-union variant for a withheld note. */
export function withheldNote(reason: NoteWithheldReason): WithheldNote {
  return { state: 'withheld', reason };
}
