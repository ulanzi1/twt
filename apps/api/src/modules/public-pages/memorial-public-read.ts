// The family memorial on the public Sahyog Vivran page — the API half (Story 11b.4a, Task 5.2; `#decision-2026-10-27-412`
// MP2 / MP3 / MP13; `-391` item 2, `-411` items 2, 3, 6).
//
// ⭐ `null` (the page carries ⛔ no memorial) iff: the memorial switch is off (MP13); `latestApprovedIndex === -1` (⛔ never keyed
// on the head's state); the words or the photo's description decrypt to the ERASURE SENTINEL (Trap 4 — `anonymizeMember`
// encrypts it, so the decrypt SUCCEEDS); a decrypt fails with a bad envelope (one `error` log; the PAGE stays); or — the FIFTH,
// silent (review R22) — NOTHING IS LEFT TO SHOW: the Trust left out every word and there is ⛔ no photo (none sent, or left out),
// i.e. `{ words: [], photo: null }`, which would draw a memorial with nothing in it. ⚠ A KMS OUTAGE is ⛔ not a bad envelope: it
// RE-THROWS to the page's outage state (the API answers 500; `apps/public` renders its 503 view — the deceased-name precedent;
// an outage published as a quiet omission would be edge-cached as "no memorial").
// ⭐ Read inside the page handler's EXISTING public scope transaction (⛔ never a second one); ⛔ no advisory lock is taken, so
// the decrypt may run inside it (the page's own deceased-name decrypt does).
// The decrypted words ⛔ never reach a log line.

import type { PublicSahyogVivranFamilyMemorial } from '@twt/contracts';
import { memorial, member as memberDomain, type Db, type ids } from '@twt/domain';
import type { FastifyBaseLogger } from 'fastify';

import type { AppDeps, EncryptionDeps } from '../../context.js';
import { KmsOutageError } from '../kyc/name-render.js';
import { decryptMemorialField } from '../memorial/memorial-crypto.js';
import { publicMemorialText } from './memorial-public-text.js';

export async function resolvePublicFamilyMemorial(
  deps: Pick<AppDeps, 'config'>,
  log: FastifyBaseLogger,
  tx: Db,
  input: {
    readonly pariwarId: ids.PariwarId;
    readonly pariwarIdStr: string;
    readonly poolId: ids.PoolId;
    /** The request's crypto deps with `decryptDek` failures CLASSIFIED (`withKmsOutageClassification`). */
    readonly encryption: EncryptionDeps;
  },
): Promise<PublicSahyogVivranFamilyMemorial | null> {
  if (!deps.config.memorialAuthorshipEnabled) return null;
  const shown = await memorial.readPublicMemorial(tx, { pariwarId: input.pariwarId, poolId: input.poolId });
  if (shown === null) return null;

  let body: string;
  let altText: string | null = null;
  try {
    body = await decryptMemorialField(shown.bodyCiphertext, input.pariwarIdStr, input.encryption);
    if (shown.photo !== null && shown.altTextCiphertext !== null) {
      altText = await decryptMemorialField(shown.altTextCiphertext, input.pariwarIdStr, input.encryption);
    }
  } catch (err) {
    if (err instanceof KmsOutageError) throw err;
    log.error(
      { errorName: err instanceof Error ? err.name : typeof err },
      'sahyog-vivran: family memorial decrypt failed — omitting the MEMORIAL, keeping the page',
    );
    return null;
  }
  // ⭐ Trap 4 — the erased member's memorial goes WHOLE: words and photo (the photo object was deleted best-effort).
  // IMPORTED, ⛔ never a retyped literal.
  if (body === memberDomain.ANONYMIZED_SENTINEL || altText === memberDomain.ANONYMIZED_SENTINEL) {
    log.warn('sahyog-vivran: erasure sentinel reached the family memorial — omitting the MEMORIAL, keeping the page');
    return null;
  }

  const text = publicMemorialText({ body, altText, omissions: shown.omissions });
  const words = text.words;
  const photo = shown.photo === null ? null : { altText: text.altText ?? '' };
  if (words.length === 0 && photo === null) return null;
  return { words, photo };
}
