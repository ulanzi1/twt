// packages/contracts/src/_common/version.ts
//
// URL-based major versioning per architecture §3.2 line 1849; flat-object
// top-level version literal per §Format patterns line 4106.

import { z } from 'zod';

export const ApiMajorVersion = z.literal('v1');
export type ApiMajorVersion = z.output<typeof ApiMajorVersion>;

export const API_MAJOR_VERSION = 'v1' as const;
