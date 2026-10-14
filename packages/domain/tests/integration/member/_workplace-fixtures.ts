// Story 6.36a — a small workplace list for the domain specs, written RAW as the superuser (the import tool's own rules are
// `import-workplaces.spec.ts`'s; these specs pin the readers and the writer).

import { randomUUID } from 'node:crypto';

import type pg from 'pg';

export interface SeededList {
  readonly pariwarId: string;
  readonly batchId: string;
  /** name → workplace_id */
  readonly ids: Readonly<Record<string, string>>;
}

export interface FixtureWorkplace {
  readonly name: string;
  readonly district: string;
  readonly kind?: 'school' | 'office';
  readonly village?: string | null;
  readonly cluster?: string | null;
  readonly status?: 'listed' | 'delisted';
}

/** ONE batch, the given district spellings (listed unless named in `retired`), and the given workplaces. */
export async function seedWorkplaceList(
  client: pg.PoolClient,
  opts: {
    pariwarId?: string;
    districts: readonly string[];
    retired?: readonly string[];
    workplaces: readonly FixtureWorkplace[];
  },
): Promise<SeededList> {
  const pariwarId = opts.pariwarId ?? randomUUID();
  const batchId = randomUUID();
  await client.query(
    `INSERT INTO workplace_import_batches (batch_id, pariwar_id, source_name, source_url, retrieved_on, licence, attribution, state_code)
     VALUES ($1, $2, 'fixture', 'https://example.test/udise', '2026-10-14', 'ODC-BY-1.0', 'fixture attribution', '10')`,
    [batchId, pariwarId],
  );
  for (const d of opts.districts) {
    await client.query(`INSERT INTO workplace_districts (pariwar_id, district, status, source_batch_id) VALUES ($1, $2, $3, $4)`, [
      pariwarId,
      d,
      opts.retired?.includes(d) ? 'retired' : 'listed',
      batchId,
    ]);
  }
  const ids: Record<string, string> = {};
  let code = 10280100100;
  for (const w of opts.workplaces) {
    const id = randomUUID();
    ids[w.name] = id;
    const kind = w.kind ?? 'school';
    code += 1;
    await client.query(
      `INSERT INTO workplaces (workplace_id, pariwar_id, kind, name, district, village_name, cluster_name, udise_school_code, block_code,
         source, import_batch_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        id,
        pariwarId,
        kind,
        w.name,
        w.district,
        w.village ?? null,
        w.cluster ?? null,
        kind === 'school' ? String(code) : null,
        kind === 'school' ? String(code).slice(0, 6) : null,
        kind === 'school' ? 'import' : 'staff',
        kind === 'school' ? batchId : null,
        w.status ?? 'listed',
      ],
    );
  }
  return { pariwarId, batchId, ids };
}
