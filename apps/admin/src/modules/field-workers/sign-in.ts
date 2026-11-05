// Go to sign-in when the server says the session has ended — Story 13.1a (AC11 (b); review CR5). ONE place for every surface
// that can meet a 401 (the register form, the lists, the identity panel, approve, show code): the "Redirecting to sign in…" line
// is a promise, and this keeps it. The route gate redirects only when `useSession()` flips, which waits for a focus or a mount.

import { useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';

/** Navigates to `/login` once when `signIn` turns true (it re-arms only after it has been false). */
export function useSignInRedirect(signIn: boolean): void {
  const navigate = useNavigate();
  useEffect(() => {
    if (signIn) void navigate({ to: '/login' });
  }, [signIn, navigate]);
}
