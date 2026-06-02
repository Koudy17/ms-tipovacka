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
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
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
}
