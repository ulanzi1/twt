// The /p/$pariwarId/drive-target route component (Story 11b.13, Task 4).
//
// A `/p/:pariwarId/`-scoped admin route, mirroring NomineeBankMaskingRoute EXACTLY. Reads the
// path-scoped `pariwarId` and threads it into the tenant-scoped API calls. An unauthenticated
// session (401) bounces to /login.
//
// ⛔ THERE IS NO CLIENT-SIDE GRANT GATE, AND ADDING ONE WOULD BREAK THE PAGE FOR EVERYONE.
// `pariwar.manage_drive_target` and `pariwar.manage_drive_target_visibility` are BOTH
// PARIWAR-dimension grants and are therefore never present in the session's GLOBAL grant set — a
// gate modelled on the global-scope pattern (`nationalGrants.includes(...)`, correct for
// global-dimension permissions) would deny every operator, super_admin included. The REAL boundary
// is the server's `requirePermissionHook`.
//
// ⭐⭐ AND THE TWO GATES DENY DIFFERENT PEOPLE, WHICH IS THE DESIGN. A `pariwar_admin` passes the
// TARGET gate and is denied at the VISIBILITY gate (`2026-09-04-190` cl.7(c) reserves revealing to
// the Trust). The page treats that second 403 as an ORDINARY outcome and simply omits the reveal
// section — ⛔ it is not rendered as an error, which is the one thing that would make a Pariwar
// Admin believe the page is broken.
//
// ⛔ Deliberately NOT linked from any nav menu — no per-Pariwar admin hub exists for any sibling tool
// (nominee-bank-masking, directory-publication, degraded-mode, feature-flags and cycle-freeze are
// all direct-URL and un-linked). This follows that convention; adding a hub is unrelated scope.

import { useNavigate, useParams } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { useEffect } from 'react';

import { useSession } from '../api/hooks.js';
import { DriveTargetPage } from '../modules/drive-target/DriveTargetPage.js';

export function DriveTargetRoute(): ReactElement {
  const session = useSession();
  const navigate = useNavigate();
  const params = useParams({ strict: false }) as { pariwarId?: string };
  const pariwarId = params.pariwarId;

  useEffect(() => {
    if (session.isError) void navigate({ to: '/login' });
  }, [session.isError, navigate]);

  if (session.isLoading) return <p role="status">Checking your session…</p>;
  if (session.isError) return <p role="status">Redirecting to sign in…</p>;
  if (!pariwarId)
    return <p role="alert">Missing Pariwar in route — cannot load the drive target.</p>;
  return <DriveTargetPage pariwarId={pariwarId} />;
}
