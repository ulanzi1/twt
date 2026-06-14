// TanStack Query hooks over the typed client (Story 1.11b, DD-7).
//
// Server state lives in Query (§4.3). The integrity reads are CACHE-DISABLED
// (§4.5 "verifier-console reads cache-disabled" — a strong-consistency surface):
// staleTime/gcTime 0 + refetchOnMount 'always', and NO IndexedDB persister. Run-now
// + acknowledge are pessimistic/server-confirmed mutations (§4.2) that invalidate
// the history so the banner + table re-derive from fresh server state.

import {
  QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import * as api from './client.js';

export const sessionKey = ['session'] as const;
export const integrityChecksKey = ['integrity-checks'] as const;

/** A QueryClient with the cache-disabled defaults this surface requires (§4.5). */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0, gcTime: 0, refetchOnMount: 'always' },
      mutations: { retry: false },
    },
  });
}

/** The current session + global-scope grants (DD-6). Drives the nav + route gate. */
export function useSession() {
  return useQuery({ queryKey: sessionKey, queryFn: api.getSession });
}

/** Recent integrity-check history (default 30, newest-first) + acknowledgements. */
export function useIntegrityChecks() {
  return useQuery({ queryKey: integrityChecksKey, queryFn: () => api.listIntegrityChecks(30) });
}

/** Run an on-demand verification, then refresh the history (AC-3). */
export function useRunVerification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.runVerification,
    onSuccess: () => qc.invalidateQueries({ queryKey: integrityChecksKey }),
  });
}

/** Acknowledge a failed check + ticket ref, then refresh so the banner clears (AC-5). */
export function useAcknowledge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { checkId: string; ticketRef: string }) =>
      api.acknowledgeCheck(vars.checkId, vars.ticketRef),
    onSuccess: () => qc.invalidateQueries({ queryKey: integrityChecksKey }),
  });
}

/** True iff the session carries the `audit.verify` grant at global scope (AC-1). */
export function hasAuditVerify(grants: readonly string[] | undefined): boolean {
  return grants?.includes('audit.verify') ?? false;
}
