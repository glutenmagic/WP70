// Runs every supabase/tests/*.sql file against the configured database.
// Each file wraps itself in a rolled-back transaction and raises on failure.
//
// Usage: npm run db:test

import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { connect } from './lib/db.ts';

const TESTS_DIR = join(import.meta.dirname, '..', 'supabase', 'tests');

const db = connect();
let failed = 0;
try {
  console.log(`Target: ${db.label}`);
  const files = (await readdir(TESTS_DIR)).filter((f) => f.endsWith('.sql')).sort();
  for (const file of files) {
    const sql = await readFile(join(TESTS_DIR, file), 'utf8');
    const started = performance.now();
    try {
      await db.query(sql);
      console.log(`  pass  ${file} (${Math.round(performance.now() - started)} ms)`);
    } catch (err) {
      failed++;
      console.error(`  FAIL  ${file}\n        ${(err as Error).message}`);
      // A failed pg connection is left in an aborted transaction; reset it.
      await db.query('rollback').catch(() => {});
    }
  }
} finally {
  await db.close();
}
if (failed) process.exit(1);
