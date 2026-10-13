import * as mlb from '@/lib/mlb-server';
class InputError extends Error {
}
function positiveInteger(params: URLSearchParams, key: string): number {
    const value = params.get(key);
    if (!value || !/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) < 1) {
        throw new InputError(`Invalid ${key}`);
    }
    return Number(value);
}
function season(params: URLSearchParams): number | undefined {
    if (!params.has('season'))
        return undefined;
    const year = positiveInteger(params, 'season');
    if (year < 1876 || year > new Date().getFullYear())
        throw new InputError('Invalid season');
    return year;
}
function date(params: URLSearchParams, key: string, required = false): string | undefined {
    const value = params.get(key);
    if (value === null && !required)
        return undefined;
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value))
        throw new InputError(`Invalid ${key}`);
    const parsed = new Date(`${value}T12:00:00Z`);
    if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value)
        throw new InputError(`Invalid ${key}`);
    return value;
}
// Receive a page request, validate its inputs, retrieve MLB data, return JSON.
export async function GET(request: Request) {
    const params = new URL(request.url).searchParams;
    try {
        let result;
        switch (params.get('action')) {
            case 'search': {
                const name = params.get('name');
                if (!name?.trim() || name.length > 100)
                    throw new InputError('Invalid player name');
                result = await mlb.searchPlayers(name);
                break;
            }
            case 'player':
                result = await mlb.getPlayer(positiveInteger(params, 'id'));
                break;
            case 'stats':
                result = await mlb.getPlayerStats(positiveInteger(params, 'id'), season(params));
                break;
            case 'gameLog':
                result = await mlb.getPlayerGameLog(positiveInteger(params, 'id'), season(params));
                break;
            case 'matchup':
                result = await mlb.getHeadToHead(positiveInteger(params, 'batterId'), positiveInteger(params, 'pitcherId'), season(params));
                break;
            case 'standings':
                result = await mlb.getStandings();
                break;
            case 'schedule':
                result = await mlb.getSchedule(date(params, 'date', true)!);
                break;
            case 'preview':
                result = await mlb.getGamePreview(positiveInteger(params, 'gamePk'));
                break;
            case 'recentForm':
                result = await mlb.getTeamRecentForm(positiveInteger(params, 'teamId'), date(params, 'before'));
                break;
            case 'teamStats':
                result = await mlb.getTeamSeasonStats(positiveInteger(params, 'teamId'), season(params), date(params, 'before'));
                break;
            case 'teamMatchup':
                result = await mlb.getTeamHeadToHead(positiveInteger(params, 'team1Id'), positiveInteger(params, 'team2Id'), season(params), date(params, 'before'));
                break;
            case 'players':
                result = await mlb.getAllPlayers();
                break;
            case 'seasons':
                result = await mlb.getPlayerSeasons(positiveInteger(params, 'id'));
                break;
            default: throw new InputError('Unknown MLB request');
        }
        return Response.json(result);
    }
    catch (error) {
        const status = error instanceof InputError ? 400 : 502;
        return Response.json({ error: error instanceof Error ? error.message : 'MLB data unavailable' }, { status });
    }
}
