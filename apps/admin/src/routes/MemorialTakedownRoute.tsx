// The /p/:pariwarId/memorial-takedowns routes + their session gate — Story 11b.4a (Task 9.2, AC11).
//
// The helpline's take-down of a family memorial at the nominee's request. Authorization is enforced SERVER-SIDE on every call
// (`memorial.takedown` at `dimension:'pariwar'`), so the client gate is only "is there a live session" — the real boundary is the
// handler. An unauthenticated session (401) bounces to /login; a 403 is the page's own "no access".
//
// `MemorialTakedownGateView` is its OWN local copy (the moderation-appeals / memorial-review precedent).

import { useNavigate, useParams } from '@tanstack/react-router';
import type { ReactElement, ReactNode } from 'react';
import { useEffect } from 'react';

import { useSession } from '../api/hooks.js';
import { MemorialTakedownDrivePage, MemorialTakedownListPage } from '../modules/memorial-takedown/MemorialTakedownPage.js';

export interface MemorialTakedownGateViewProps {
  status: 'loading' | 'error' | 'success';
  children: ReactNode;
}

export function MemorialTakedownGateView({ status, children }: MemorialTakedownGateViewProps): ReactElement {
  if (status === 'loading') return <p role="status">Checking your session…</p>;
  if (status === 'error') return <p role="status">Redirecting to sign in…</p>;
  return <>{children}</>;
}

function useSessionGate(): 'loading' | 'error' | 'success' {
  const session = useSession();
  const navigate = useNavigate();
  useEffect(() => {
    if (session.isError) void navigate({ to: '/login' });
  }, [session.isError, navigate]);
  return session.isLoading ? 'loading' : session.isError ? 'error' : 'success';
}

export function MemorialTakedownRoute(): ReactElement {
  const status = useSessionGate();
  const { pariwarId } = useParams({ from: '/p/$pariwarId/memorial-takedowns' });
  return (
    <MemorialTakedownGateView status={status}>
      <MemorialTakedownListPage key={pariwarId} pariwarId={pariwarId} />
    </MemorialTakedownGateView>
  );
}

export function MemorialTakedownDriveRoute(): ReactElement {
  const status = useSessionGate();
  const { pariwarId, poolId } = useParams({ from: '/p/$pariwarId/memorial-takedowns/$poolId' });
  return (
    <MemorialTakedownGateView status={status}>
      {/* `key` — the page's state (the ticked attestation, the OTP, the Idempotency-Keys) belongs to ONE drive. */}
      <MemorialTakedownDrivePage key={`${pariwarId}:${poolId}`} pariwarId={pariwarId} poolId={poolId} />
    </MemorialTakedownGateView>
  );
}
