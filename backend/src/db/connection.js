import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

let poolPromise;

function getDatabaseConfig() {
  if (process.env.DATABASE_URL) {
    return { connectionString: process.env.DATABASE_URL };
  }

  return {
    host: process.env.PGHOST ?? '127.0.0.1',
    port: Number(process.env.PGPORT ?? '5432'),
    database: process.env.PGDATABASE ?? 'pmp_learning_app',
    user: process.env.PGUSER ?? 'postgres',
    password: process.env.PGPASSWORD ?? 'postgres',
  };
}

export async function getPool() {
  if (!poolPromise) {
    poolPromise = import('pg').then(({ Pool }) => new Pool(getDatabaseConfig()));
  }

  return poolPromise;
}

export async function query(text, params = []) {
  const pool = await getPool();
  return pool.query(text, params);
}

export async function runSqlFile(filePath) {
  const sql = (await readFile(filePath, 'utf8')).replace(/^\uFEFF/, '');
  await query(sql);
}

export function resolveProjectPath(...parts) {
  const currentFile = fileURLToPath(import.meta.url);
  const projectRoot = path.resolve(path.dirname(currentFile), '..', '..');
  return path.join(projectRoot, ...parts);
}

export async function closePool() {
  if (!poolPromise) {
    return;
  }

  const pool = await poolPromise;
  await pool.end();
  poolPromise = undefined;
}
