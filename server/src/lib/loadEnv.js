import dotenv from 'dotenv';

dotenv.config();

/**
 * Builds DATABASE_URL from separate DB_* variables for Prisma.
 * Password is URL-encoded automatically (e.g. @ becomes %40).
 */
export function buildDatabaseUrl() {
  const { DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME } = process.env;

  if (!DB_USER || !DB_HOST || !DB_PORT || !DB_NAME) {
    if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
    throw new Error(
      'Missing database config. Set DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME in .env'
    );
  }

  const password = encodeURIComponent(DB_PASSWORD ?? '');
  return `mysql://${DB_USER}:${password}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;
}

export function applyDatabaseUrl() {
  process.env.DATABASE_URL = buildDatabaseUrl();
  return process.env.DATABASE_URL;
}

// Run when imported
applyDatabaseUrl();
