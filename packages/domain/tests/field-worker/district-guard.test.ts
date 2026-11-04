// Story 13.1, review R4 (QE9, QE17) — `assertDistrictRecorded` refuses a district holding the NUL character AS UNKNOWN, before
// any read. DB-free: the `db` is a Proxy that throws on ANY use, so a leg that passes did so without touching the database.
// Why it matters: with no geo tree in force the district is bound as an `IN` parameter, and Postgres cannot bind NUL in a text
// parameter (22021 ⇒ an unmapped 500 instead of the 422 QE9 promises). The NUL is BUILT (⛔ an escape in this source).

import { describe, expect, it } from 'vitest';

import { FieldWorkerDistrictUnknownError } from '../../src/field-worker/errors.js';
import { assertDistrictRecorded } from '../../src/field-worker/read.js';
import { pariwarId } from '../../src/ids/index.js';
import type { Db } from '../../src/db.js';

const P = pariwarId('11111111-1111-1111-1111-111111111111');
const NUL = String.fromCharCode(0);
const AT = new Date('2026-11-04T06:00:00Z');

const untouchableDb = new Proxy(
  {},
  {
    get() {
      throw new Error('the database was touched');
    },
  },
) as unknown as Db;

describe('assertDistrictRecorded — NUL in the district (review R4)', () => {
  it.each([
    ['in the middle', `Pat${NUL}na`],
    ['at the start', `${NUL}Patna`],
    ['at the end', `Patna${NUL}`],
    ['alone', NUL],
  ])('NUL %s ⇒ FieldWorkerDistrictUnknownError, and the database is never touched', async (_label, district) => {
    await expect(assertDistrictRecorded(untouchableDb, P, district, AT)).rejects.toBeInstanceOf(FieldWorkerDistrictUnknownError);
  });

  // CONTROL: the same untouchable db IS reached for a district without NUL — so the legs above passed because of the guard.
  it('CONTROL: a district without NUL goes on to read (the Proxy proves it is reached)', async () => {
    await expect(assertDistrictRecorded(untouchableDb, P, 'Patna', AT)).rejects.toThrow('the database was touched');
  });
});
