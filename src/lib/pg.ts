import { Pool } from 'pg';

let poolInstance: Pool | null = null;

export function getPgPool(): Pool | null {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    return null;
  }

  if (!poolInstance) {
    poolInstance = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000
    });

    poolInstance.on('error', (err) => {
      console.warn('[Postgres Pool Warning]:', err.message);
    });
  }

  return poolInstance;
}

export async function queryPostgres<T = any>(sql: string, params?: any[]): Promise<T[]> {
  const pool = getPgPool();
  if (!pool) return [];

  const client = await pool.connect();
  try {
    const res = await client.query(sql, params);
    return res.rows as T[];
  } finally {
    client.release();
  }
}
