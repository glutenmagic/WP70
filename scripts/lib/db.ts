// Minimal database client for the one-off scripts.
//
// Two backends:
// - DATABASE_URL set: a direct Postgres connection via `pg`.
// - Otherwise SUPABASE_ACCESS_TOKEN + SUPABASE_PROJECT_REF: the Supabase
//   Management API query endpoint, which runs SQL over HTTPS as `postgres`.
//   Useful where outbound Postgres ports are blocked.
//
// `query` returns the rows of the last statement in `sql`. Use $1, $2...
// placeholders with `params`; never interpolate untrusted values.

import pg from 'pg';

export type Row = Record<string, unknown>;

export interface Db {
  readonly label: string;
  query<T extends Row = Row>(sql: string, params?: unknown[]): Promise<T[]>;
  close(): Promise<void>;
}

export function connect(): Db {
  const url = process.env.DATABASE_URL;
  if (url) return pgDb(url);

  const token = process.env.SUPABASE_ACCESS_TOKEN;
  const ref = process.env.SUPABASE_PROJECT_REF;
  if (token && ref) return managementApiDb(token, ref);

  throw new Error(
    'No database configured. Set DATABASE_URL, or SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF. See .env.example.',
  );
}

function pgDb(url: string): Db {
  const client = new pg.Client({ connectionString: url });
  const ready = client.connect();
  const host = new URL(url).host;
  return {
    label: `postgres ${host}`,
    async query<T extends Row>(sql: string, params: unknown[] = []) {
      await ready;
      // A multi-statement string without params returns one result per statement.
      const res = (await client.query(sql, params.length ? params : undefined)) as
        | pg.QueryResult<T>
        | pg.QueryResult<T>[];
      const last = Array.isArray(res) ? res[res.length - 1] : res;
      return last?.rows ?? [];
    },
    async close() {
      await ready.catch(() => {});
      await client.end();
    },
  };
}

function managementApiDb(token: string, ref: string): Db {
  const endpoint = `https://api.supabase.com/v1/projects/${encodeURIComponent(ref)}/database/query`;
  return {
    label: `supabase project ${ref} (Management API)`,
    async query<T extends Row>(sql: string, params: unknown[] = []) {
      const body: { query: string; parameters?: unknown[] } = { query: sql };
      if (params.length) body.parameters = params;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      if (!res.ok) {
        let message = text;
        try {
          message = (JSON.parse(text) as { message?: string }).message ?? text;
        } catch {
          // Not JSON; keep the raw text.
        }
        throw new Error(`Management API ${res.status}: ${message}`);
      }
      return text ? (JSON.parse(text) as T[]) : [];
    },
    async close() {},
  };
}
