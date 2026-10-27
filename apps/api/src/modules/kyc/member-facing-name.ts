// The SESSION member's registered name for a member-facing screen of their own app — the 11b.21 chain (decrypt →
// `publicNameTokens` → `resolveMemberFacingDeceasedName(presentationMode, …)` → `normalisePublicName`), in the Pariwar's
// member-facing form (`2026-09-02-181` cl.1).
//
// MOVED here from `memorial/handlers.ts` (`resolveIntroName`, Story 11b.4 MA14) when it gained a SECOND consumer: the claim-filing
// screens' name (`2026-10-27-409`) — [[feedback_no_premature_package]]. The behaviour is unchanged.
//
// FAIL-SOFT: a KMS outage, a null ciphertext or the erasure sentinel ⇒ `null` (the caller's no-name copy), ⛔ never a 500. ⚠ A
// deliberate difference from 11b.21's drive surfaces, which re-throw `KmsOutageError`: here an outage degrades the NAME only.
// Decrypt OUTSIDE any transaction (⛔ KMS inside a tx) — the caller reads the ciphertext and the mode in its tx, then calls this.

import { kyc as kycDomain, member as memberDomain, notifications, type ids } from '@twt/domain';
import type { FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import type { resolvePoolNamePresentationModeForRequest } from '../member-pool/pool-identity.js';
import { decryptKycField } from './kyc-crypto.js';
import { KmsOutageError, normalisePublicName, withKmsOutageClassification } from './name-render.js';

export type MemberFacingNameMode = Awaited<ReturnType<typeof resolvePoolNamePresentationModeForRequest>>;

/** `decrypted` ⇔ a KMS decrypt ran (the caller's `fields_decrypted` audit count). `label` prefixes the fail-soft log lines. */
export async function resolveMemberFacingName(
  deps: AppDeps,
  request: FastifyRequest,
  args: { readonly pariwarId: ids.PariwarId; readonly ciphertext: string | null; readonly presentationMode: MemberFacingNameMode },
  label: string,
): Promise<{ readonly name: string | null; readonly decrypted: boolean }> {
  if (args.ciphertext === null) return { name: null, decrypted: false };
  let stored: string;
  try {
    stored = await decryptKycField(args.ciphertext, args.pariwarId, withKmsOutageClassification(deps.encryption));
  } catch (err) {
    request.log.warn(
      { errorName: err instanceof Error ? err.name : typeof err, outage: err instanceof KmsOutageError },
      `${label}: name decrypt failed — the no-name copy`,
    );
    return { name: null, decrypted: false };
  }
  if (stored === memberDomain.ANONYMIZED_SENTINEL) return { name: null, decrypted: true };
  try {
    const name = normalisePublicName(
      notifications.resolveMemberFacingDeceasedName(args.presentationMode, kycDomain.publicNameTokens(stored).join(' ')),
    );
    return { name, decrypted: true };
  } catch (err) {
    request.log.warn({ errorName: err instanceof Error ? err.name : typeof err }, `${label}: name resolution failed`);
    return { name: null, decrypted: true };
  }
}
