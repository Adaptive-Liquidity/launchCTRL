import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { getEnv } from '@launchctrl/config';
import * as schema from './schema.js';

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let _pool: Pool | null = null;

export function getDb() {
  if (_db) return _db;
  const env = getEnv();
  _pool = new Pool({ connectionString: env.DATABASE_URL });
  _db = drizzle(_pool, { schema });
  return _db;
}

export async function closeDb() {
  if (_pool) {
    await _pool.end();
    _pool = null;
    _db = null;
  }
}

export { schema };
export type Db = ReturnType<typeof getDb>;
