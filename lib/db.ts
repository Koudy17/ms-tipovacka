import { neon } from '@neondatabase/serverless';

export function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('Chybí DATABASE_URL v environment variables.');
  return neon(url);
}

export async function initSchema() {
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      nickname TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      must_change_password BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT TRUE`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS session_token TEXT`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS session_expires_at TIMESTAMP`;
  await sql`
    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY,
      home_team TEXT NOT NULL,
      away_team TEXT NOT NULL,
      kickoff TIMESTAMP NOT NULL,
      home_score INTEGER,
      away_score INTEGER,
      status TEXT DEFAULT 'scheduled',
      stage TEXT,
      matchday INTEGER,
      group_name TEXT
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS tips (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      match_id INTEGER NOT NULL REFERENCES matches(id),
      home_tip INTEGER NOT NULL,
      away_tip INTEGER NOT NULL,
      scorer_tip TEXT,
      points INTEGER,
      scorer_points INTEGER,
      UNIQUE(user_id, match_id)
    )
  `;
  await sql`ALTER TABLE tips ADD COLUMN IF NOT EXISTS scorer_tip TEXT`;
  await sql`ALTER TABLE tips ADD COLUMN IF NOT EXISTS scorer_points INTEGER`;
  await sql`ALTER TABLE matches ADD COLUMN IF NOT EXISTS goal_scorers TEXT`;
  await sql`
    CREATE TABLE IF NOT EXISTS audit_log (
      id SERIAL PRIMARY KEY,
      ts TIMESTAMP DEFAULT NOW(),
      action TEXT NOT NULL,
      entity TEXT,
      details JSONB,
      actor TEXT
    )
  `;
}

export async function auditLog(
  action: string,
  entity: string,
  details: Record<string, unknown>,
  actor: string = 'system'
) {
  try {
    const sql = getSql();
    await sql`
      INSERT INTO audit_log (action, entity, details, actor)
      VALUES (${action}, ${entity}, ${JSON.stringify(details)}, ${actor})
    `;
  } catch {
    // audit log nikdy nesmí shodit hlavní operaci
  }
}
