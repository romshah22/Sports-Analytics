export interface OddsData {
  gameId: string;
  awayTeam: string;
  homeTeam: string;
  awayMoneyline: number;
  homeMoneyline: number;
  spread: number;
  overUnder: number;
}

function parseAmericanOdds(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return -110;
  const cleaned = value.replace(/[^+\-\d]/g, '');
  const num = parseInt(cleaned, 10);
  if (Number.isNaN(num)) return -110;
  return cleaned.startsWith('+') || (!cleaned.startsWith('-') && num > 0)
    ? Math.abs(num)
    : -Math.abs(num);
}

function normalizeTeamName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function teamsMatch(a: string, b: string): boolean {
  const na = normalizeTeamName(a);
  const nb = normalizeTeamName(b);
  return na === nb || na.includes(nb) || nb.includes(na);
}

export function formatDateForEspn(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

export function formatOdds(line: number): string {
  if (line > 0) return `+${line}`;
  return line.toString();
}

export function getImpliedProbability(moneyline: number): number {
  if (moneyline > 0) {
    return 100 / (moneyline + 100);
  }
  return Math.abs(moneyline) / (Math.abs(moneyline) + 100);
}

export function findOddsForGame(
  awayName: string,
  homeName: string,
  oddsMap: Map<string, OddsData>
): OddsData | undefined {
  for (const odds of oddsMap.values()) {
    if (teamsMatch(awayName, odds.awayTeam) && teamsMatch(homeName, odds.homeTeam)) {
      return odds;
    }
  }
  return undefined;
}

export async function fetchEspnOdds(date: Date): Promise<Map<string, OddsData>> {
  const odds = new Map<string, OddsData>();
  const dateParam = formatDateForEspn(date);

  try {
    const res = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard?dates=${dateParam}`
    );
    const data = await res.json();

    if (!data.events) return odds;

    data.events.forEach((event: any) => {
      const competitors = event.competitions?.[0]?.competitors || [];
      const homeComp = competitors.find((c: any) => c.homeAway === 'home');
      const awayComp = competitors.find((c: any) => c.homeAway === 'away');
      const awayTeam = awayComp?.team?.displayName || awayComp?.team?.name || '';
      const homeTeam = homeComp?.team?.displayName || homeComp?.team?.name || '';

      const oddsDetail = event.competitions?.[0]?.odds || [];
      let awayLine = -110;
      let homeLine = -110;
      let spread = -1.5;
      let overUnder = 8.5;

      if (oddsDetail.length > 0) {
        const primaryOdds = oddsDetail[0];

        if (primaryOdds.moneyline) {
          awayLine = parseAmericanOdds(
            primaryOdds.moneyline.away?.close?.odds ??
              primaryOdds.moneyline.away?.open?.odds ??
              primaryOdds.moneyline.away
          );
          homeLine = parseAmericanOdds(
            primaryOdds.moneyline.home?.close?.odds ??
              primaryOdds.moneyline.home?.open?.odds ??
              primaryOdds.moneyline.home
          );
        }

        if (primaryOdds.spread !== undefined) {
          if (typeof primaryOdds.spread === 'number') {
            spread = primaryOdds.spread;
          } else if (primaryOdds.spread?.home?.close?.line !== undefined) {
            spread = primaryOdds.spread.home.close.line;
          } else if (primaryOdds.pointSpread?.home?.close?.line !== undefined) {
            spread = primaryOdds.pointSpread.home.close.line;
          }
        }

        if (primaryOdds.overUnder !== undefined) {
          if (typeof primaryOdds.overUnder === 'number') {
            overUnder = primaryOdds.overUnder;
          } else if (primaryOdds.overUnder?.close?.line !== undefined) {
            overUnder = primaryOdds.overUnder.close.line;
          } else if (primaryOdds.total?.over?.close?.line !== undefined) {
            overUnder = primaryOdds.total.over.close.line;
          }
        }
      }

      const key = `${normalizeTeamName(awayTeam)}_${normalizeTeamName(homeTeam)}`;
      odds.set(key, {
        gameId: event.id,
        awayTeam,
        homeTeam,
        awayMoneyline: awayLine,
        homeMoneyline: homeLine,
        spread,
        overUnder,
      });
    });
  } catch (err) {
    console.error('Error fetching ESPN odds:', err);
  }

  return odds;
}
