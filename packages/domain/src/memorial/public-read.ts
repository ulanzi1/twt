// The family memorial's PUBLIC reads (Story 11b.4a, Task 3.2; `#decision-2026-10-27-412` MP2 / MP4; `-391` item 2 — the words
// and photo appear AS THE TRUST APPROVED THEM; `-411` items 2, 3, 6).
//
// ⭐ WHICH VERSION: exactly one per drive — `chain[latestApprovedIndex(chain)]`, the latest approval with ⛔ no withdrawal of any
// kind (11b.4 MA13). ⚠ ⛔ NEVER keyed on the head's state: `[A-omit, pending]` is `with_the_trust` at the head while v1 is still
// the page's. A take-down writes a `helpline` withdrawal on EVERY un-withdrawn version (MP8 (a)), so `latestApprovedIndex` is
// `-1` after it and ⛔ no older approval comes back (Trap 1).
// ⛔ Nothing here decrypts (the API does, OUTSIDE any lock) and ⛔ nothing here applies the switch or the Pariwar kill switch
// (the API's — MP13, `-160` cl.4(e)). The erasure check is the API's sentinel check for the page (Trap 4); the photo route's
// narrow read checks the deceased's `members.state` instead (Task 0.1 (j): every erasure path projects `anonymized`).

import { and, eq, sql } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { PariwarId, PoolId } from '../ids/index.js';
import { SAHYOG_VIVRAN_VISIBLE_POOL_STATES } from '../pool/sahyog-vivran-read.js';
import { members } from '../schema/members.js';
import { memorialSubmissions } from '../schema/memorial_submissions.js';
import { pools } from '../schema/pools.js';
import { latestApprovedIndex } from './status.js';
import { readMemorialChain, type MemorialChainLink } from './submission.js';
import type { MemorialOmission, MemorialPhotoMime } from './vocab.js';

/** The version the public page shows — ciphertexts AS STORED, the Trust's omissions, and the photo's key (⛔ never serialised). */
export interface PublicMemorialVersion {
  readonly submissionId: string;
  readonly bodyCiphertext: string;
  readonly altTextCiphertext: string | null;
  readonly omissions: readonly MemorialOmission[];
  /** The photo the page may show — `null` when ⛔ none was sent or the Trust left it out. */
  readonly photo: { readonly objectKey: string; readonly mime: MemorialPhotoMime } | null;
}

/** The shown link of a chain, or `null` (`latestApprovedIndex === -1`). */
export function shownMemorialLink(chain: readonly MemorialChainLink[]): MemorialChainLink | null {
  const i = latestApprovedIndex(chain);
  return i < 0 ? null : chain[i]!;
}

function publicPhotoOf(link: MemorialChainLink): PublicMemorialVersion['photo'] {
  const s = link.submission;
  if (s.photoObjectKey === null || s.photoMime === null) return null;
  // The Trust left the photo out (MA6) ⇒ ⛔ never on the page.
  if (link.decision?.photoLeftOutReason != null) return null;
  return { objectKey: s.photoObjectKey, mime: s.photoMime };
}

/**
 * ⭐ The page read (MP2) — inside the page handler's EXISTING public scope transaction (⛔ never a second one), for the pool the
 * drive read already resolved. `null` ⇒ the page carries ⛔ no memorial (`familyMemorial: null`).
 */
export async function readPublicMemorial(
  db: Db,
  { pariwarId, poolId }: { readonly pariwarId: PariwarId; readonly poolId: PoolId },
): Promise<PublicMemorialVersion | null> {
  const chain = await readMemorialChain(db, { pariwarId, poolId });
  const shown = shownMemorialLink(chain);
  if (shown === null) return null;
  return {
    submissionId: shown.submission.submissionId,
    bodyCiphertext: shown.submission.bodyCiphertext,
    altTextCiphertext: shown.submission.altTextCiphertext,
    omissions: shown.decision?.omissions ?? [],
    photo: publicPhotoOf(shown),
  };
}

/**
 * ⭐ THE PHOTO ROUTE'S NARROW READ (MP4, Trap 19) — token → pool, restricted to `SAHYOG_VIVRAN_VISIBLE_POOL_STATES` (the page's
 * own visible-drive predicate, imported — ⛔ never re-declared), then the shown version's photo. ⛔ No contributor read, ⛔ no
 * appeal-reversal audit, ⛔ no decrypt: this is the ONLY thing a photo request reads. `null` for every refusal — an unknown
 * token, a hidden pool, ⛔ no shown version, ⛔ no photo, a photo the Trust left out, an ERASED deceased member (Trap 4 —
 * `members.state = 'anonymized'`; the photo object was deleted best-effort, so ⛔ never point at it).
 */
export async function readPublicMemorialPhotoTarget(
  db: Db,
  pariwarId: PariwarId,
  driveToken: string,
): Promise<{ readonly objectKey: string; readonly mime: MemorialPhotoMime } | null> {
  const [pool] = await db
    .select({ poolId: pools.poolId })
    .from(pools)
    .where(
      and(
        eq(pools.pariwarId, pariwarId),
        eq(pools.publicToken, driveToken),
        sql`${pools.currentState} IN (${sql.join(
          SAHYOG_VIVRAN_VISIBLE_POOL_STATES.map((s) => sql`${s}`),
          sql`, `,
        )})`,
      ),
    )
    .limit(1);
  if (pool === undefined) return null;
  const chain = await readMemorialChain(db, { pariwarId, poolId: pool.poolId as PoolId });
  const shown = shownMemorialLink(chain);
  if (shown === null) return null;
  const photo = publicPhotoOf(shown);
  if (photo === null) return null;
  const [deceased] = await db
    .select({ state: members.state })
    .from(members)
    .innerJoin(
      memorialSubmissions,
      and(eq(memorialSubmissions.deceasedMemberId, members.memberId), eq(memorialSubmissions.submissionId, shown.submission.submissionId)),
    )
    .where(eq(members.pariwarId, pariwarId))
    .limit(1);
  if (deceased === undefined || deceased.state === 'anonymized') return null;
  return photo;
}
