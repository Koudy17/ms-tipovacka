import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'data', 'tipovacka.db');
const API_KEY = process.env.FOOTBALL_API_KEY;

if (!API_KEY) {
  console.error('Chybí FOOTBALL_API_KEY. Spusť: $env:FOOTBALL_API_KEY="tvuj_klic"; node scripts/seed-from-api.mjs');
  process.exit(1);
}

const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// Vytvoř tabulky pokud neexistují
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nickname TEXT UNIQUE NOT NULL COLLATE NOCASE,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY,
    home_team TEXT NOT NULL,
    away_team TEXT NOT NULL,
    kickoff TEXT NOT NULL,
    home_score INTEGER,
    away_score INTEGER,
    status TEXT DEFAULT 'scheduled',
    stage TEXT,
    matchday INTEGER,
    group_name TEXT
  );
  CREATE TABLE IF NOT EXISTS tips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    match_id INTEGER NOT NULL REFERENCES matches(id),
    home_tip INTEGER NOT NULL,
    away_tip INTEGER NOT NULL,
    points INTEGER,
    UNIQUE(user_id, match_id)
  );
`);

console.log('Načítám zápasy z football-data.org...');

const res = await fetch('https://api.football-data.org/v4/competitions/2000/matches', {
  headers: { 'X-Auth-Token': API_KEY }
});

if (!res.ok) {
  console.error(`API chyba: ${res.status} ${await res.text()}`);
  process.exit(1);
}

const data = await res.json();
const matches = data.matches ?? [];

console.log(`Načteno ${matches.length} zápasů.`);

// Přeložení názvů do češtiny
const NAMES = {
  'Mexico': 'Mexiko', 'South Africa': 'Jižní Afrika', 'South Korea': 'Jižní Korea',
  'Czechia': 'Česko', 'Canada': 'Kanada', 'Bosnia-Herzegovina': 'Bosna a Hercegovina',
  'United States': 'USA', 'Panama': 'Panama', 'Argentina': 'Argentina',
  'Morocco': 'Maroko', 'Spain': 'Španělsko', 'Serbia': 'Srbsko',
  'Germany': 'Německo', 'Japan': 'Japonsko', 'New Zealand': 'Nový Zéland',
  'Portugal': 'Portugalsko', 'France': 'Francie', 'Uruguay': 'Uruguay',
  'Belgium': 'Belgie', 'Netherlands': 'Nizozemsko', 'Croatia': 'Chorvatsko',
  'England': 'Anglie', 'Brazil': 'Brazílie', 'Australia': 'Austrálie',
  'Colombia': 'Kolumbie', 'Italy': 'Itálie', 'Ecuador': 'Ekvádor',
  'Switzerland': 'Švýcarsko', 'Sweden': 'Švédsko', 'Denmark': 'Dánsko',
  'Norway': 'Norsko', 'Poland': 'Polsko', 'Romania': 'Rumunsko',
  'Hungary': 'Maďarsko', 'Slovakia': 'Slovensko', 'Ukraine': 'Ukrajina',
  'Turkey': 'Turecko', 'Saudi Arabia': 'Saúdská Arábie', 'Iran': 'Írán',
  'Nigeria': 'Nigérie', 'Cameroon': 'Kamerun', 'Senegal': 'Senegal',
  'Ghana': 'Ghana', 'Egypt': 'Egypt', 'Ivory Coast': 'Pobřeží slonoviny',
  'Algeria': 'Alžírsko', 'Tunisia': 'Tunisko', 'Mali': 'Mali',
  'Kenya': 'Keňa', 'Paraguay': 'Paraguay', 'Chile': 'Chile',
  'Venezuela': 'Venezuela', 'Peru': 'Peru', 'Bolivia': 'Bolívie',
  'Qatar': 'Katar', 'Australia': 'Austrálie', 'Indonesia': 'Indonésie',
  'Honduras': 'Honduras', 'Guatemala': 'Guatemala', 'Costa Rica': 'Kostarika',
  'Jamaica': 'Jamajka', 'Trinidad and Tobago': 'Trinidad a Tobago',
  'Cuba': 'Kuba', 'Haiti': 'Haiti', 'El Salvador': 'Salvador',
};

function czName(name) {
  return NAMES[name] ?? name;
}

// Převod UTC na středoevropský čas (UTC+2 v létě)
function toLocalIso(utcDate) {
  const d = new Date(utcDate);
  // Uložíme jako lokální čas pro ČR (UTC+2)
  const offset = 2 * 60;
  const local = new Date(d.getTime() + offset * 60 * 1000);
  return local.toISOString().replace('Z', '').slice(0, 16) + ':00';
}

// Přidej sloupce pokud chybí (pro upgrade)
try { db.exec('ALTER TABLE matches ADD COLUMN stage TEXT'); } catch {}
try { db.exec('ALTER TABLE matches ADD COLUMN matchday INTEGER'); } catch {}
try { db.exec('ALTER TABLE matches ADD COLUMN group_name TEXT'); } catch {}

// Smaž staré vygenerované zápasy (zachovej existující tipy)
const existingMatchIds = new Set(
  (db.prepare('SELECT id FROM matches').all()).map(r => r.id)
);

const insert = db.prepare(`
  INSERT INTO matches (id, home_team, away_team, kickoff, home_score, away_score, status, stage, matchday, group_name)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    home_team = excluded.home_team,
    away_team = excluded.away_team,
    kickoff = excluded.kickoff,
    stage = excluded.stage,
    matchday = excluded.matchday,
    group_name = excluded.group_name
`);

let inserted = 0;
for (const m of matches) {
  const homeGoals = m.score?.fullTime?.home ?? null;
  const awayGoals = m.score?.fullTime?.away ?? null;
  const status = m.status === 'FINISHED' ? 'finished' : 'scheduled';

  const homeName = m.homeTeam?.name ? czName(m.homeTeam.name) : 'TBD';
  const awayName = m.awayTeam?.name ? czName(m.awayTeam.name) : 'TBD';

  insert.run(
    m.id,
    homeName,
    awayName,
    toLocalIso(m.utcDate),
    homeGoals,
    awayGoals,
    status,
    m.stage,
    m.matchday,
    m.group ?? null
  );
  inserted++;
}

// Odstraň staré zápasy které nejsou v API (jen ty bez tipů)
const apiIds = new Set(matches.map(m => m.id));
for (const oldId of existingMatchIds) {
  if (!apiIds.has(oldId)) {
    const hasTips = db.prepare('SELECT COUNT(*) as c FROM tips WHERE match_id = ?').get(oldId).c;
    if (hasTips === 0) {
      db.prepare('DELETE FROM matches WHERE id = ?').run(oldId);
      console.log(`  Smazán starý zápas ID ${oldId}`);
    }
  }
}

console.log(`✅ Hotovo! Naplněno/aktualizováno ${inserted} zápasů.`);
db.close();
