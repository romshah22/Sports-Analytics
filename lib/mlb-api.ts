const BASE = 'https://statsapi.mlb.com/api/v1';

export type MLBPlayer = {
  id: number;
  fullName: string;
  currentTeam?: { name?: string; abbreviation?: string };
  primaryPosition?: { name?: string; abbreviation?: string };
  batSide?: { description?: string };
  pitchHand?: { description?: string };
};

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

// Get head-to-head stats between a batter and pitcher.
// Omit season for career stats.
export async function getHeadToHead(batterId: number, pitcherId: number, season: number = 2026) {
  const res = await fetch(
    `${BASE}/people/${batterId}/stats?stats=vsPlayer&opposingPlayerId=${pitcherId}&group=hitting&season=${season}`
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

// Get all active MLB players (cached for search)
let playersCache: MLBPlayer[] | null = null;

export async function getAllPlayers(): Promise<MLBPlayer[]> {
  if (playersCache) return playersCache;
  
  try {
    console.log('Fetching all players...');
    const res = await fetch(
      `${BASE}/sports/1/players?sportId=1`,
      { next: { revalidate: 3600 } }
    );
    const data = await res.json();
    const players = data.people || [];
    
    console.log(`getAllPlayers returned ${players.length} players`);
    if (players.length > 0) {
      console.log('Sample player:', players[0]);
    }
    
    // Filter out players without fullName
    const validPlayers = players.filter((p: any) => p.fullName);
    console.log(`After filtering: ${validPlayers.length} valid players`);
    
    playersCache = validPlayers;
    return validPlayers;
  } catch (err) {
    console.error('Error fetching players:', err);
    return [];
  }
}

// Fuzzy string matching — finds similar strings for "did you mean"
export function fuzzyMatch(search: string, targets: string[]): string[] {
  const query = search.toLowerCase();
  
  return targets
    .map(target => ({
      name: target,
      score: calculateSimilarity(query, target.toLowerCase()),
    }))
    .filter(item => item.score > 0.4) // only matches with >40% similarity
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(item => item.name);
}

// Levenshtein distance for similarity scoring
function calculateSimilarity(a: string, b: string): number {
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = getEditDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function getEditDistance(s1: string, s2: string): number {
  const costs = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}
