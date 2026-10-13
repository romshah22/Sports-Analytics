import { fetchChecked } from './request';
export { fuzzyMatch } from './player-search';
export type MLBPlayer = {
    id: number;
    fullName: string;
    currentTeam?: {
        name?: string;
        abbreviation?: string;
    };
    primaryPosition?: {
        name?: string;
        abbreviation?: string;
    };
    batSide?: {
        description?: string;
    };
    pitchHand?: {
        description?: string;
    };
};
// Every data request goes to our backend; only the backend contacts MLB.
async function requestMLB<T = any>(action: string, params: Record<string, string | number | undefined> = {}): Promise<T> {
    const query = new URLSearchParams({ action });
    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined)
            query.set(key, String(value));
    }
    const response = await fetchChecked(`/api/mlb?${query}`);
    return response.json();
}
export function searchPlayers(query: string) { return requestMLB('search', { name: query }); }
export function getPlayer(id: number) { return requestMLB('player', { id }); }
export function getPlayerStats(id: number, season?: number) { return requestMLB('stats', { id, season }); }
export function getPlayerGameLog(id: number, season = new Date().getFullYear()) { return requestMLB('gameLog', { id, season }); }
export function getHeadToHead(batterId: number, pitcherId: number, season?: number) { return requestMLB('matchup', { batterId, pitcherId, season }); }
export function getStandings() { return requestMLB('standings'); }
export function getSchedule(date: string) { return requestMLB('schedule', { date }); }
export function getTodaysGames() { return getSchedule(new Date().toISOString().slice(0, 10)); }
export function getGamePreview(gamePk: number) { return requestMLB('preview', { gamePk }); }
export function getTeamRecentForm(teamId: number, before?: string): Promise<string[]> { return requestMLB('recentForm', { teamId, before }); }
export function getTeamSeasonStats(teamId: number, season = new Date().getFullYear(), before?: string) { return requestMLB('teamStats', { teamId, season, before }); }
export function getTeamHeadToHead(team1Id: number, team2Id: number, season = new Date().getFullYear(), before?: string) { return requestMLB('teamMatchup', { team1Id, team2Id, season, before }); }
export function getAllPlayers(): Promise<MLBPlayer[]> { return requestMLB('players'); }
export function getPlayerSeasons(id: number): Promise<number[]> { return requestMLB('seasons', { id }); }
