// Krátké názvy klubů Premier League pro úzké displeje. Cokoliv, co tu není, se zobrazí tak, jak ho vrací API.
const SHORT_NAMES: Record<string, string> = {
  'Manchester United': 'Man United',
  'Manchester City': 'Man City',
  'Nottingham Forest': "Nott'm Forest",
  'Newcastle United': 'Newcastle',
  'Tottenham Hotspur': 'Tottenham',
  'Wolverhampton Wanderers': 'Wolves',
  'West Ham United': 'West Ham',
  'Brighton & Hove Albion': 'Brighton',
  'Leeds United': 'Leeds',
  'Sheffield United': 'Sheffield Utd',
  'Crystal Palace': 'Crystal Palace',
};

export function shortName(team: string): string {
  return SHORT_NAMES[team] ?? team;
}
