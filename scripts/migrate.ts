// Applies supabase/migrations/*.sql in order, each in its own transaction.
//
// Records applied versions in supabase_migrations.schema_migrations, the same
// table the Supabase CLI uses, so `supabase db push` stays in step if you
// switch to the CLI later.
//
// Usage: npm run db:migrate [-- --dry-run]

import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { connect } from './lib/db.ts';

const MIGRATIONS_DIR = join(import.meta.dirname, '..', 'supabase', 'migrations');
const dryRun = process.argv.includes('--dry-run');

const db = connect();
try {
  console.log(`Target: ${db.label}`);

  await db.query(`
    create schema if not exists supabase_migrations;
    create table if not exists supabase_migrations.schema_migrations (
      version text primary key,
      statements text[],
      name text
    );
  `);

  const applied = new Set(
    (await db.query<{ version: string }>('select version from supabase_migrations.schema_migrations')).map(
      (r) => r.version,
    ),
  );

  const files = (await readdir(MIGRATIONS_DIR)).filter((f) => /^\d+_.+\.sql$/.test(f)).sort();
  let count = 0;
  for (const file of files) {
    const [, version, name] = file.match(/^(\d+)_(.+)\.sql$/)!;
    if (applied.has(version)) {
      console.log(`  skip   ${file} (already applied)`);
      continue;
    }
    if (dryRun) {
      console.log(`  would apply ${file}`);
      continue;
    }
    const sql = await readFile(join(MIGRATIONS_DIR, file), 'utf8');
    // The body runs as a plain multi-statement string; the bookkeeping insert
    // is inlined with dollar quoting so the whole file commits or fails as one.
    const tag = `$wp70_${version}$`;
    if (sql.includes(tag)) throw new Error(`${file} contains the reserved quote tag ${tag}`);
    await db.query(`
      begin;
      ${sql}
      ;
      insert into supabase_migrations.schema_migrations (version, name, statements)
      values ('${version}', ${tag}${name}${tag}, array[${tag}${sql}${tag}]);
      commit;
    `);
    console.log(`  apply  ${file}`);
    count++;
  }
  console.log(dryRun ? 'Dry run complete.' : `Applied ${count} migration(s).`);
} finally {
  await db.close();
}
