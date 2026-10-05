"""Chronological MLB baseline. Prior-season features prevent target-season leakage."""
import argparse, concurrent.futures, datetime, hashlib, json, pathlib, time, urllib.request
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, brier_score_loss, log_loss
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
ROOT = pathlib.Path(__file__).resolve().parents[1]
CACHE = ROOT / 'ml' / 'cache'
BASE = 'https://statsapi.mlb.com/api/v1/'
def get(path):
    CACHE.mkdir(exist_ok=True)
    file = CACHE / (hashlib.sha256(path.encode()).hexdigest()+'.json')
    if file.exists(): return json.loads(file.read_text())
    for attempt in range(3):
        try:
            with urllib.request.urlopen(BASE+path, timeout=60) as response: data=json.load(response)
            file.write_text(json.dumps(data)); return data
        except Exception:
            if attempt==2: raise
            time.sleep(attempt+1)
def team_stats(year):
    result={}
    for group,field in [('hitting','avg'),('pitching','era')]:
        data=get(f'teams/stats?stats=season&group={group}&season={year}&sportIds=1&gameType=R&limit=100')
        for block in data.get('stats',[]):
            for s in block.get('splits',[]):
                result.setdefault(str(s['team']['id']),{})[field]=float(s['stat'][field])
    if len(result)<30 or any(len(v)!=2 for v in result.values()): raise ValueError(f'Incomplete team stats: {year}')
    return result
def rows(year,teams):
    data=get(f'schedule?sportId=1&season={year}&gameType=R')
    output=[]
    for date in data.get('dates',[]):
        for game in date['games']:
            if game['status'].get('abstractGameState')!='Final': continue
            h,a=game['teams']['home'],game['teams']['away']
            home,away=teams.get(str(h['team']['id'])),teams.get(str(a['team']['id']))
            if not home or not away or h.get('score')==a.get('score'): continue
            output.append({'gamePk':game['gamePk'],'date':game['officialDate'],'season':year,'home':h['team']['id'],'away':a['team']['id'],
                'x':[home['avg']-away['avg'],home['era']-away['era']], 'y':int(h['score']>a['score'])})
    # Suspended/resumed games can appear on more than one schedule date.
    unique = {r['gamePk']: r for r in output}
    return sorted(unique.values(),key=lambda r:(r['date'],r['gamePk']))
def train():
    parser=argparse.ArgumentParser();parser.add_argument('--test-season',type=int,default=2025);args=parser.parse_args()
    test=args.test_season
    # Fix the features/model before looking at the held-out season.
    seasons=list(range(test-4,test+1))
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        teamsets=dict(zip(range(test-5,test+1),pool.map(team_stats,range(test-5,test+1))))
        datasets=list(pool.map(lambda y:rows(y,teamsets[y-1]),seasons))
    trainrows=[r for ds in datasets[:-1] for r in ds]; testrows=datasets[-1]
    x=np.array([r['x'] for r in trainrows]);y=np.array([r['y'] for r in trainrows]);xt=np.array([r['x'] for r in testrows]);yt=np.array([r['y'] for r in testrows])
    model=make_pipeline(StandardScaler(),LogisticRegression(C=1.0,max_iter=1000,random_state=42));model.fit(x,y)
    probabilities=model.predict_proba(xt)[:,1]
    scaler,clf=model.steps[0][1],model.steps[1][1]
    report={'testSeason':test,'trainSeasons':seasons[:-1],'trainGames':len(y),'testGames':len(yt),'accuracy':float(accuracy_score(yt,probabilities>=.5)),
      'homeAlwaysBaseline':float(yt.mean()),'brierScore':float(brier_score_loss(yt,probabilities)),'logLoss':float(log_loss(yt,probabilities)),
      'method':'Train on earlier seasons; evaluate once on the following untouched season. Features are prior-season team AVG and ERA differences; intercept learns home advantage. No target-season stats or outcomes are inputs.'}
    artifact={'version':1,'trainedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'features':['home_prior_avg - away_prior_avg','home_prior_era - away_prior_era'],
      'mean':scaler.mean_.tolist(),'scale':scaler.scale_.tolist(),'coefficients':clf.coef_[0].tolist(),'intercept':float(clf.intercept_[0]),'metrics':report,'teamStats':{str(k):v for k,v in teamsets.items()}}
    (ROOT/'models'/'win-model.json').write_text(json.dumps(artifact,indent=2))
    (ROOT/'models'/'evaluation.json').write_text(json.dumps(report,indent=2))
    (ROOT/'models'/'test-predictions.json').write_text(json.dumps([{**r,'homeProbability':float(p)} for r,p in zip(testrows,probabilities)]))
    print(json.dumps(report,indent=2),flush=True)
if __name__=='__main__': train()
