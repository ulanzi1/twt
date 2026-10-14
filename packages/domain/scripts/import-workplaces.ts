// The workplace-list import tool — Story 6.36a, Task 3 (AC2; `2026-10-14-330` SW3, Task 1.1b). See
// `scripts/README-import-workplaces.md` for the profile, the district map, the rename and the go-live checks.
//
//   pnpm --filter @twt/domain workplaces:import -- --pariwar <uuid> --state 10 --file <csv> --district-map <csv> \
//     --source "<name>" --url <url> --retrieved YYYY-MM-DD --licence ODC-BY-1.0 --attribution "<text>" \
//     [--relist-district "<spelling>"]... [--dry-run]
//   pnpm --filter @twt/domain workplaces:import -- --pariwar <uuid> --rename-district "<old>" "<new>" [--dry-run]
//
// The arguments are validated and the file is read and filtered BEFORE the transaction opens (⛔ a connection idle in
// transaction for the read; every file-level refusal fires with nothing open); then ONE transaction under
// `withPariwarScope` — the batch row FIRST, the counts finished at the end. `--dry-run` runs the same work and ROLLS IT
// BACK (⛔ anything written), printing the same counts. The file is STREAMED (⛔ ever 400 MB in memory). ⚠ ⛔ Never fetch
// the real file in a test or in CI.
//
// ⚠ DELIBERATE — ⛔ no HTTP actor, ⛔ no audit line: the batch row IS the record; the operator's database login is the only
// attribution (the module header of `workplace-import.ts` holds the rationale and the re-examination trigger — 6.36c).

import 'dotenv/config';
import { createReadStream } from 'node:fs';

import { createDb, withPariwarScope } from '../src/db.js';
import { pariwarId as toPariwarId } from '../src/ids/index.js';
import { isCalendarDate } from '../src/member/workplace.js';
import {
  csvObjects,
  IDP_REQUIRED_COLUMNS,
  parseCsv,
  readDistrictMap,
  readWorkplaceImportFile,
  renameWorkplaceDistrict,
  WorkplaceImportRefusedError,
  writeWorkplaceImport,
} from '../src/member/workplace-import.js';
import { WORKPLACE_RENAME_SOURCE_NAME } from '../src/schema/workplace_import_batches.js';
import { resolveConnectionString } from '../src/secrets.js';

interface Args {
  readonly pariwar: string;
  readonly dryRun: boolean;
  readonly rename: readonly [string, string] | null;
  readonly values: ReadonlyMap<string, string>;
  readonly relist: readonly string[];
}

const VALUE_FLAGS = ['--state', '--file', '--district-map', '--source', '--url', '--retrieved', '--licence', '--attribution'] as const;

function usage(message: string): never {
  console.error(`[workplaces:import] ${message}\n\nUsage: see packages/domain/scripts/README-import-workplaces.md`);
  process.exit(2);
}

/** An argument VALUE the batch row would refuse — refused here, BEFORE the file is read (exit 1, a plain message). */
function refuse(message: string): never {
  console.error(`[workplaces:import] refused — ${message}`);
  process.exit(1);
}

/** The source-column bound: `source_name` is 1–200 characters (0161's CHECK). */
const SOURCE_NAME_MAX = 200;

/**
 * The source values, checked against what 0161 would refuse — so a calendar-invalid `--retrieved`, an over-long or
 * reserved `--source`, or a blank `--url` / `--licence` / `--attribution` is refused with a plain message BEFORE the
 * 400 MB read, ⛔ as a raw Postgres error after it.
 */
function validateSourceValues(values: ReadonlyMap<string, string>): void {
  const retrieved = values.get('--retrieved')!;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(retrieved)) refuse(`--retrieved "${retrieved}" must be YYYY-MM-DD`);
  if (!isCalendarDate(retrieved)) refuse(`--retrieved "${retrieved}" is not a calendar date`);
  const source = values.get('--source')!.trim();
  const sourceLength = [...source].length;
  if (sourceLength < 1 || sourceLength > SOURCE_NAME_MAX) refuse(`--source must be 1–${SOURCE_NAME_MAX} characters`);
  if (source === WORKPLACE_RENAME_SOURCE_NAME) refuse(`--source "${WORKPLACE_RENAME_SOURCE_NAME}" is reserved for --rename-district`);
  for (const f of ['--url', '--licence', '--attribution'] as const) {
    if (values.get(f)!.trim() === '') refuse(`${f} must not be blank`);
  }
  if (!/^[0-9]{2}$/.test(values.get('--state')!)) refuse(`--state "${values.get('--state')!}" is not a two-digit UDISE state code`);
}

function parseArgs(argv: readonly string[]): Args {
  const args = argv[0] === '--' ? argv.slice(1) : [...argv];
  let pariwar = '';
  let dryRun = false;
  let rename: [string, string] | null = null;
  const values = new Map<string, string>();
  const relist: string[] = [];
  for (let i = 0; i < args.length; i += 1) {
    const a = args[i]!;
    const next = (): string => {
      const v = args[i + 1];
      if (v === undefined || v.startsWith('--')) usage(`${a} needs a value`);
      i += 1;
      return v;
    };
    if (a === '--') continue;
    if (a === '--pariwar') pariwar = next();
    else if (a === '--dry-run') dryRun = true;
    else if (a === '--relist-district') relist.push(next());
    else if (a === '--rename-district') rename = [next(), next()];
    else if ((VALUE_FLAGS as readonly string[]).includes(a)) values.set(a, next());
    else usage(`unknown argument "${a}"`);
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pariwar)) usage('--pariwar <uuid> is required');
  if (rename !== null && (values.size > 0 || relist.length > 0)) usage('--rename-district runs alone (with --pariwar and --dry-run only)');
  if (rename === null) {
    for (const f of VALUE_FLAGS) if (!values.has(f)) usage(`${f} is required`);
    validateSourceValues(values);
  }
  return { pariwar, dryRun, rename, values, relist };
}

/** Thrown inside the transaction to roll a `--dry-run` back after it has produced its counts. */
class DryRunRollback<T> extends Error {
  public constructor(public readonly result: T) {
    super('dry run — rolled back');
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const { pool } = createDb(await resolveConnectionString(), { max: 1, logger: false });
  const pariwarId = toPariwarId(args.pariwar);
  const inScope = async <T>(fn: Parameters<typeof withPariwarScope<T>>[2]): Promise<T> => {
    try {
      return await withPariwarScope(pool, pariwarId, async (db, client) => {
        const result = await fn(db, client);
        if (args.dryRun) throw new DryRunRollback(result);
        return result;
      });
    } catch (err) {
      if (err instanceof DryRunRollback) return err.result as T;
      throw err;
    }
  };
  const tag = args.dryRun ? ' (DRY RUN — nothing was written)' : '';
  try {
    if (args.rename !== null) {
      const [from, to] = args.rename;
      const r = await inScope((db) => renameWorkplaceDistrict(db, { pariwarId, from, to }));
      console.log(`[workplaces:import] renamed "${from}" → "${to}"${tag}`);
      console.log(`  workplaces moved: ${r.workplacesMoved}   open requests moved: ${r.requestsMoved}   batch: ${r.batchId}`);
      console.log(`  ⚠ postings still carrying "${from}": ${r.postingsOnOld}`);
      if (r.postingsOnOld > 0) {
        console.log(
          `  ⚠ Each posting keeps the spelling it was written with (they are never rewritten). Until those members post again, a\n` +
            `    District Admin's grant must cover BOTH "${from}" and "${to}", or that admin can no longer reach those members' claims.`,
        );
      }
      return;
    }
    const v = args.values;
    const districtMap = await readDistrictMap(parseCsv(createReadStream(v.get('--district-map')!, { encoding: 'utf8' })));
    const rows = csvObjects(parseCsv(createReadStream(v.get('--file')!, { encoding: 'utf8', highWaterMark: 1 << 20 })), IDP_REQUIRED_COLUMNS);
    const input = {
      pariwarId,
      stateCode: v.get('--state')!,
      districtMap,
      relistDistricts: args.relist,
      source: {
        name: v.get('--source')!.trim(),
        url: v.get('--url')!.trim(),
        retrievedOn: v.get('--retrieved')!,
        licence: v.get('--licence')!.trim(),
        attribution: v.get('--attribution')!.trim(),
      },
    };
    // Phase ONE — the file, read and filtered with ⛔ a transaction open (every file-level refusal fires here).
    const file = await readWorkplaceImportFile({ ...input, rows });
    // Phase TWO — ONE transaction: the batch row FIRST, the counts finished at the end.
    const c = await inScope((db) => writeWorkplaceImport(db, input, file));
    console.log(`[workplaces:import] finished${tag} — batch ${c.batchId}`);
    console.log(
      [
        `  rows read: ${c.rowsRead} (another state: ${c.rowsOtherState})`,
        `  inserted: ${c.rowsInserted}   updated: ${c.rowsUpdated}   re-listed: ${c.rowsRelisted}   delisted: ${c.rowsDelisted}`,
        `  refused: ${c.rowsRefused}   duplicate codes: ${c.rowsDuplicate}   kept staff rows: ${c.rowsSkippedStaff}`,
        `  district spellings added: ${c.districtsAdded}   listed again: ${c.districtsRelisted}`,
      ].join('\n'),
    );
  } catch (err) {
    if (err instanceof WorkplaceImportRefusedError) {
      console.error(err.message);
      process.exitCode = 1;
      return;
    }
    throw err;
  } finally {
    await pool.end().catch(() => undefined);
  }
}

main().catch((err: unknown) => {
  console.error('[workplaces:import] failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
