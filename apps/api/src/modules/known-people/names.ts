// PEOPLE WHO KNOW ME — the registered names (Story 6.36b, Task 3; 6.36a SW14; AC6, AC7).
//
// A namer sees the named member's registered name ONLY once they accepted; the named member sees the namer's name on the
// request. Both in the member-to-member form the app already shows (`resolveMemberFacingDeceasedName` under the Pariwar's
// presentation mode — the peer-request precedent, `claims/peer-request-core.ts` `resolvePeerRequestMemberName`) — ⛔ a
// new form.
//
// ⭐ TWO HALVES, so ⛔ no KMS runs under a lock or inside the read transaction: `readNameCiphertexts` (inside the read tx —
// DB only) and `decryptNames` (AFTER it commits). A name that cannot be resolved (⛔ a profile, an erased sentinel, a
// failed decrypt) is `null` — ⛔ an error; a decrypt failure logs ONLY the error's name (⛔ the value).

import { kyc as kycDomain, member as memberDomain, notifications, type Db, type ids } from '@twt/domain';
import type { FastifyBaseLogger } from 'fastify';

import type { EncryptionDeps } from '../../context.js';
import { decryptKycField } from '../kyc/kyc-crypto.js';

export interface NameCiphertexts {
  readonly mode: Awaited<ReturnType<typeof kycDomain.resolvePublicNamePresentationMode>>;
  readonly byMember: ReadonlyMap<string, string | null>;
}

/** Inside the read transaction: the Pariwar's presentation mode and each member's name ciphertext (DB only). */
export async function readNameCiphertexts(tx: Db, pariwarId: ids.PariwarId, memberIds: readonly ids.MemberId[]): Promise<NameCiphertexts> {
  const byMember = new Map<string, string | null>();
  const unique = [...new Set(memberIds)];
  if (unique.length === 0) return { mode: 'shielded_name', byMember };
  const mode = await kycDomain.resolvePublicNamePresentationMode(tx, pariwarId);
  for (const id of unique) {
    const profile = await kycDomain.getMemberKycProfile(tx, pariwarId, id);
    byMember.set(id, profile?.nameCiphertext ?? null);
  }
  return { mode, byMember };
}

/** AFTER the read transaction commits: decrypt each name and render the member-to-member form. */
export async function decryptNames(
  read: NameCiphertexts,
  pariwarId: string,
  enc: EncryptionDeps,
  log: FastifyBaseLogger,
): Promise<Map<string, string | null>> {
  const out = new Map<string, string | null>();
  for (const [memberId, ciphertext] of read.byMember) {
    if (ciphertext === null) {
      out.set(memberId, null);
      continue;
    }
    try {
      const stored = await decryptKycField(ciphertext, pariwarId, enc);
      if (stored === memberDomain.ANONYMIZED_SENTINEL) {
        out.set(memberId, null);
        continue;
      }
      const shown = notifications.resolveMemberFacingDeceasedName(read.mode, stored).trim();
      out.set(memberId, shown === '' ? null : shown);
    } catch (err) {
      log.warn({ errName: (err as Error).name }, 'known-people: member name decrypt failed — rendering without a name');
      out.set(memberId, null);
    }
  }
  return out;
}
