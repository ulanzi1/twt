// Member app-language handlers — Story 6.35 (Task 2.2; LS2, I1, I7).
//
// Each runs in its OWN scope tx (`openScopeTx` — `twt_app` under RLS) and calls the ONE domain reader / writer
// (`member/preferred-locale.ts`). ⚠ UNLIKE the Life Events precedent (which audits inside the `try`, before commit), the PUT audits
// AFTER the commit — `ok = true` → `closeScopeTx(scopeTx, true)` → then the line — and ONLY when the value CHANGED (`changed`), so a
// rolled-back write or a repeat leaves ⛔ line. `closeScopeTx` rethrows a failed COMMIT and makes the `finally`'s second close a
// no-op (`scope-tx.ts`). Context `{ locale }` only (I7 — ⛔ id, ⛔ name, ⛔ number).
// ⛔ Terminal-state guard: a locale code is harmless, and termination is enforced at login / refresh (the session guard checks ⛔
// state). Domain errors map to 503 (⛔ passport) and 409 (⛔ member row) — ⛔ a bare 500 (T7).

import type { MemberLanguageResponse, MemberLanguageSetRequest } from '@twt/contracts';
import { ids, member as memberDomain } from '@twt/domain';
import type { FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import { ConflictError, ServiceUnavailableError, UnauthorizedError } from '../../http-errors.js';
import { emitAuthAudit } from '../auth/shared/audit.js';
import { closeScopeTx, openScopeTx } from '../multi-tenant/scope-tx.js';

export interface MemberLanguageHandlers {
  get(request: FastifyRequest): Promise<MemberLanguageResponse>;
  set(request: FastifyRequest): Promise<MemberLanguageResponse>;
}

function memberCtx(request: FastifyRequest): { memberIdStr: string; pariwarIdStr: string } {
  const memberIdStr = request.requestContext.actorId;
  const pariwarIdStr = request.requestContext.pariwarId;
  if (!memberIdStr || !pariwarIdStr) throw new UnauthorizedError('Authentication required', 'auth.session_required');
  return { memberIdStr, pariwarIdStr };
}

function mapDomainError(err: unknown): never {
  if (err instanceof memberDomain.MemberLanguagePassportMissingError) {
    throw new ServiceUnavailableError('The Pariwar has no default language', 'member_language.passport_missing');
  }
  if (err instanceof memberDomain.MemberLanguageMemberMissingError) {
    throw new ConflictError('The member has no record in this Pariwar', 'member_language.member_missing');
  }
  throw err;
}

export function createMemberLanguageHandlers(deps: AppDeps): MemberLanguageHandlers {
  return {
    /** GET /api/v1/member/language — a READ: ⛔ records anything (I1). */
    async get(request) {
      const { memberIdStr, pariwarIdStr } = memberCtx(request);
      const scopeTx = await openScopeTx(deps, pariwarIdStr);
      let ok = false;
      try {
        const state = await memberDomain
          .getMemberLanguage(scopeTx.tx, { pariwarId: ids.pariwarId(pariwarIdStr), memberId: ids.memberId(memberIdStr) })
          .catch(mapDomainError);
        ok = true;
        return { chosenLocale: state.chosenLocale, pariwarDefaultLocale: state.pariwarDefaultLocale };
      } finally {
        await closeScopeTx(scopeTx, ok);
      }
    },

    /** PUT /api/v1/member/language — the member's EXPLICIT change; written and audited only when it changes the value. */
    async set(request) {
      const body = request.body as MemberLanguageSetRequest;
      const { memberIdStr, pariwarIdStr } = memberCtx(request);
      const scopeTx = await openScopeTx(deps, pariwarIdStr);
      let ok = false;
      try {
        const result = await memberDomain
          .setMemberLanguage(scopeTx.tx, {
            pariwarId: ids.pariwarId(pariwarIdStr),
            memberId: ids.memberId(memberIdStr),
            locale: body.locale,
          })
          .catch(mapDomainError);
        ok = true;
        await closeScopeTx(scopeTx, true);
        if (result.changed) {
          emitAuthAudit(deps, request, 'member.language_changed', {
            actorId: memberIdStr,
            pariwarId: pariwarIdStr,
            context: { locale: body.locale },
          });
        }
        return { chosenLocale: result.chosenLocale, pariwarDefaultLocale: result.pariwarDefaultLocale };
      } finally {
        await closeScopeTx(scopeTx, ok);
      }
    },
  };
}
