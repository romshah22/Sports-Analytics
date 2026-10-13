"""Train a pregame model on each team's current-season record BEFORE game day."""
import concurrent.futures
import datetime
import hashlib
import json
import pathlib
import time
import urllib.request

import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, brier_score_loss, log_loss
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

ROOT = pathlib.Path(__file__).resolve().parents[1]
CACHE = ROOT / 'ml' / 'cache'
BASE = 'https://statsapi.mlb.com/api/v1/'
TRAIN_SEASONS = [2021, 2022, 2023, 2024]
TEST_SEASON = 2025
MIN_GAMES = 10
FEATURES = ['season_avg_difference', 'season_era_difference', 'season_ops_difference',
            'season_run_differential_per_game_difference', 'last_10_win_percentage_difference']


def get(endpoint):
    CACHE.mkdir(exist_ok=True)
    file = CACHE / (hashlib.sha256(endpoint.encode()).hexdigest() + '.json')
    if file.exists():
        return json.loads(file.read_text())
    for attempt in range(3):
        try:
            with urllib.request.urlopen(BASE + endpoint, timeout=40) as response:
                data = json.load(response)
            file.write_text(json.dumps(data))
            return data
        except Exception:
            if attempt == 2:
                raise
            time.sleep(attempt + 1)


def completed_games(data):
    # A resumed game may appear on multiple dates. Use its latest schedule date
    # so its completed statistics are not used before the game actually finished.
    games = {}
    for day in data.get('dates', []):
        for game in day.get('games', []):
            if game['status'].get('abstractGameState') != 'Final':
                continue
            key = game['gamePk']
            completion = max(day['date'], game['officialDate'])
            if key not in games or completion > games[key]['completedOn']:
                games[key] = {**game, 'completedOn': completion}
    return games


def game_records(data, games):
    groups = {block['group']['displayName']: block.get('splits', []) for block in data.get('stats', [])}
    pitching = {row['game']['gamePk']: row['stat'] for row in groups.get('pitching', [])}
    records = {}
    for row in groups.get('hitting', []):
        key = row['game']['gamePk']
        if key not in games or key not in pitching:
            continue
        hit, pitch = row['stat'], pitching[key]
        hit_keys = ['hits', 'atBats', 'baseOnBalls', 'hitByPitch', 'sacFlies', 'totalBases', 'runs']
        pitch_keys = ['earnedRuns', 'outs', 'runs']
        if any(not isinstance(hit.get(k), (int, float)) for k in hit_keys):
            continue
        if any(not isinstance(pitch.get(k), (int, float)) for k in pitch_keys):
            continue
        if hit['atBats'] <= 0 or pitch['outs'] <= 0:
            continue
        if not isinstance(row.get('isWin'), bool):
            continue
        records[key] = {
            'gamePk': key, 'date': games[key]['completedOn'],
            'hits': hit['hits'], 'atBats': hit['atBats'], 'walks': hit['baseOnBalls'],
            'hbp': hit['hitByPitch'], 'sacFlies': hit['sacFlies'], 'totalBases': hit['totalBases'],
            'runsFor': hit['runs'], 'runsAgainst': pitch['runs'],
            'earnedRuns': pitch['earnedRuns'], 'outs': pitch['outs'], 'win': int(row['isWin'])
        }
    return sorted(records.values(), key=lambda row: (row['date'], row['gamePk']))


def snapshot(records, before):
    previous = [row for row in records if row['date'] < before]
    if len(previous) < MIN_GAMES:
        return None
    totals = {key: sum(row[key] for row in previous) for key in
              ['hits', 'atBats', 'walks', 'hbp', 'sacFlies', 'totalBases', 'runsFor', 'runsAgainst', 'earnedRuns', 'outs']}
    obp = (totals['hits'] + totals['walks'] + totals['hbp']) / (totals['atBats'] + totals['walks'] + totals['hbp'] + totals['sacFlies'])
    return {
        'avg': totals['hits'] / totals['atBats'],
        'era': 27 * totals['earnedRuns'] / totals['outs'],
        'ops': obp + totals['totalBases'] / totals['atBats'],
        'runDifferential': (totals['runsFor'] - totals['runsAgainst']) / len(previous),
        'recentWinPct': sum(row['win'] for row in previous[-10:]) / 10,
        'games': len(previous), 'lastGameDate': previous[-1]['date']
    }


def feature_vector(home, away):
    return [home[key] - away[key] for key in ['avg', 'era', 'ops', 'runDifferential', 'recentWinPct']]


def train():
    seasons = TRAIN_SEASONS + [TEST_SEASON]
    schedules = {year: completed_games(get(f'schedule?sportId=1&season={year}&gameType=R')) for year in seasons}
    jobs = [(year, team) for year, games in schedules.items() for team in sorted({
        game['teams'][side]['team']['id'] for game in games.values() for side in ['home', 'away']})]
    logs = {}

    def download(job):
        year, team = job
        data = get(f'teams/{team}/stats?stats=gameLog&group=hitting,pitching&season={year}&gameType=R')
        return job, game_records(data, schedules[year])

    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        for count, (job, rows) in enumerate(pool.map(download, jobs), 1):
            logs[job] = rows
            if count % 15 == 0:
                print(f'Loaded team game logs: {count}/{len(jobs)}', flush=True)

    rows = []
    eligible_counts = {}
    for year in seasons:
        eligible_counts[year] = len(schedules[year])
        for game in schedules[year].values():
            home, away = game['teams']['home'], game['teams']['away']
            # Suspended games completed on a later date are excluded as targets.
            if game['completedOn'] != game['officialDate'] or home.get('score') == away.get('score'):
                continue
            home_id, away_id = home['team']['id'], away['team']['id']
            h = snapshot(logs[(year, home_id)], game['officialDate'])
            a = snapshot(logs[(year, away_id)], game['officialDate'])
            if h is None or a is None:
                continue
            rows.append({'gamePk': game['gamePk'], 'date': game['officialDate'], 'season': year,
                         'home': home_id, 'away': away_id, 'inputs': {'home': h, 'away': a},
                         'x': feature_vector(h, a), 'y': int(home['score'] > away['score'])})
    rows.sort(key=lambda row: (row['date'], row['gamePk']))
    training = [row for row in rows if row['season'] in TRAIN_SEASONS]
    testing = [row for row in rows if row['season'] == TEST_SEASON]
    x, y = np.array([row['x'] for row in training]), np.array([row['y'] for row in training])
    xt, yt = np.array([row['x'] for row in testing]), np.array([row['y'] for row in testing])
    # Fixed feature list and regularization; no test-season hyperparameter search.
    pipeline = make_pipeline(StandardScaler(), LogisticRegression(C=1.0, max_iter=1000, random_state=42))
    pipeline.fit(x, y)
    probabilities = pipeline.predict_proba(xt)[:, 1]
    scaler, classifier = pipeline.steps[0][1], pipeline.steps[1][1]
    metrics = {
        'testSeason': TEST_SEASON, 'trainSeasons': TRAIN_SEASONS,
        'trainGames': len(training), 'testGames': len(testing),
        'totalTestSeasonGames': eligible_counts[TEST_SEASON],
        'accuracy': float(accuracy_score(yt, probabilities >= .5)),
        'homeAlwaysBaseline': float(yt.mean()), 'brierScore': float(brier_score_loss(yt, probabilities)),
        'logLoss': float(log_loss(yt, probabilities)),
        'method': 'Train on 2021–2024; evaluate on eligible 2025 regular-season games. Each input uses only completed current-season games before the target date. Both teams need 10 prior games; delayed-completion targets are excluded. The previous model also used 2025 as a benchmark, so this is not a newly untouched prospective test.'
    }
    artifact = {
        'version': 2, 'trainedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'features': FEATURES, 'minimumGames': MIN_GAMES,
        'mean': scaler.mean_.tolist(), 'scale': scaler.scale_.tolist(),
        'coefficients': classifier.coef_[0].tolist(), 'intercept': float(classifier.intercept_[0]),
        'metrics': metrics
    }
    (ROOT / 'models/win-model.json').write_text(json.dumps(artifact, indent=2))
    (ROOT / 'models/evaluation.json').write_text(json.dumps(metrics, indent=2))
    (ROOT / 'models/test-predictions.json').write_text(json.dumps([
        {**row, 'homeProbability': float(probability)} for row, probability in zip(testing, probabilities)]))
    # A real provider fixture lets tests compare Python and TypeScript feature building.
    fixture_year, fixture_team = TEST_SEASON, 147
    log_data = get(f'teams/{fixture_team}/stats?stats=gameLog&group=hitting,pitching&season={fixture_year}&gameType=R')
    schedule_data = get(f'schedule?sportId=1&season={fixture_year}&gameType=R')
    fixture = {'logs': log_data, 'schedule': schedule_data, 'before': '2025-07-01',
               'expected': snapshot(logs[(fixture_year, fixture_team)], '2025-07-01')}
    (ROOT / 'tests/pregame-fixture.json').write_text(json.dumps(fixture))
    print(json.dumps(metrics, indent=2), flush=True)


if __name__ == '__main__':
    train()
