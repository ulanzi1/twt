// Per-Pariwar drive-target contract barrel — Story 11b.13 (Task 4). Re-exported from the
// `@twt/contracts` top barrel (no subpath export wired — the repo convention). Backs the FOUR
// admin endpoints: the `pariwar_admin` target read/write and the ⛔ `super_admin`-only reveal
// read/write.
//
// ⛔⛔ THESE ARE ADMIN SHAPES AND THE ONLY ONES. ⛔ Do not re-export them from a public or member
// contract barrel — `2026-09-04-190` cl.7(b) makes the figure invisible to both, and Story 11b.14
// consumes it SERVER-SIDE only.

export {
  DriveTargetInr,
  DriveTargetResponse,
  DriveTargetVisibility,
  DriveTargetVisibilityResponse,
  MAX_DRIVE_TARGET_INR,
  SetDriveTargetRequest,
  SetDriveTargetVisibilityRequest,
} from './drive-target.js';
