const BASE = 'https://statsapi.mlb.com/api/v1';

// Search players by name
export async function searchPlayers(query: string) {
  const res = await fetch(
    `${BASE}/people/search?names=${encodeURIComponent(query)}&sportId=1`
  );
  const data = await res.json();
  return data.people || [];
}

// Get a single player's full profile info
export async function getPlayer(id: number) {
  const res = await fetch(`${BASE}/people/${id}?hydrate=currentTeam`);
  const data = await res.json();
  return data.people?.[0] || null;
}

// Get a player's season stats — pass in the year (or null for career)
export async function getPlayerStats(id: number, season?: number) {
  const seasonParam = season ? `&season=${season}` : '';
  const res = await fetch(
    `${BASE}/people/${id}/stats?stats=season&group=hitting,pitching${seasonParam}&sportId=1`
  );
  const data = await res.json();
  return data.stats || [];
}

// Get a player's game log — pass in the year
export async function getPlayerGameLog(id: number, season: number = 2026) {
  const res = await fetch(
    `${BASE}/people/${id}/stats?stats=gameLog&group=hitting,pitching&season=${season}`
  );
  const data = await res.json();
  const splits = data.stats?.[0]?.splits || [];
  return splits.slice(-10).reverse();
}

// Get career head-to-head stats between a batter and pitcher
export async function getHeadToHead(batterId: number, pitcherId: number) {
  const res = await fetch(
    `${BASE}/people/${batterId}/stats?stats=vsPlayer&opposingPlayerId=${pitcherId}&group=hitting&season=2026`
  );
  const data = await res.json();
  return data.stats?.[0]?.splits?.[0]?.stat || null;
}

// Get 2026 AL and NL standings
export async function getStandings() {
  const res = await fetch(
    `${BASE}/standings?leagueId=103,104&season=2026&standingsTypes=regularSeason&hydrate=team,division`,
    { next: { revalidate: 300 } } // refresh every 5 minutes
  );
  const data = await res.json();
  return data.records || [];
}

// Get games for a specific date — "2026-04-01"
export async function getSchedule(date: string) {
  const res = await fetch(
    `${BASE}/schedule?sportId=1&date=${date}&hydrate=team,linescore`,
    { next: { revalidate: 30 } } // refresh every 30 seconds for live scores
  );
  const data = await res.json();
  return data.dates?.[0]?.games || [];
}

// NEW — Get today's games with live scores
export async function getTodaysGames() {
  const today = new Date().toISOString().split('T')[0];
  return getSchedule(today);
}

// NEW — Get a full game preview: starting pitchers, team stats, recent form
export async function getGamePreview(gamePk: number) {
  const res = await fetch(
    `${BASE}/game/${gamePk}/boxscore`,
    { next: { revalidate: 60 } }
  );
  const data = await res.json();
  return data;
}

// NEW — Get team's last 10 games for recent form
export async function getTeamRecentForm(teamId: number) {
  const res = await fetch(
    `${BASE}/teams/${teamId}/stats?stats=gameLog&group=hitting&season=2026&gameType=R`
  );
  const data = await res.json();
  const splits = data.stats?.[0]?.splits || [];
  return splits.slice(-10).reverse();
}