import { readModel } from '@/lib/prediction';
export const dynamic = 'force-dynamic';

export default async function ModelPage() {
  let model;
  try { model = await readModel(); }
  catch { return <section className="panel">The model is unavailable. Please check the installed model files.</section>; }
  const metrics = model.metrics;
  const rows = [
    ['Model accuracy', `${(metrics.accuracy * 100).toFixed(2)}%`],
    ['Always pick home baseline', `${(metrics.homeAlwaysBaseline * 100).toFixed(2)}%`],
    ['Training seasons', metrics.trainSeasons.join(', ')],
    ['Training games', metrics.trainGames.toLocaleString()],
    ['Evaluated games', `${metrics.testGames.toLocaleString()} of ${metrics.totalTestSeasonGames.toLocaleString()}`],
    ['Brier score (lower is better)', metrics.brierScore.toFixed(4)],
    ['Log loss (lower is better)', metrics.logLoss.toFixed(4)]
  ];
  return <div>
    <h1 style={{ fontSize: 36, fontWeight: 700 }}>Win prediction model</h1>
    <section className="panel">
      <h2>Current-season performance, before game day</h2>
      <p>The model compares the teams’ batting average, ERA, OPS, run differential per game and last-10 win rate. These inputs are calculated from completed games in the selected season, before the selected game’s date.</p>
      <p>Python learns the relationship between those inputs and wins using logistic regression. The Next.js backend retrieves the matchup’s game logs and applies the saved formula. A learned intercept captures home-field advantage.</p>
      <p>Stats are accumulated from hits, at-bats, earned runs and pitching outs; individual game averages are not simply averaged together.</p>
    </section>
    <section className="panel">
      <h2>Historical evaluation · {metrics.testSeason}</h2>
      <table style={{ width: '100%' }}><tbody>{rows.map(([label, value]) => <tr key={label}><th style={{ textAlign: 'left', padding: 10 }}>{label}</th><td>{value}</td></tr>)}</tbody></table>
      <p>{metrics.method}</p>
    </section>
    <section className="panel">
      <h2>Scope and data coverage</h2>
      <p>Both teams need at least {model.minimumGames} completed games in the current season. The selected date’s games are excluded, including earlier doubleheader games. Suspended games enter team history only after completion.</p>
      <p>This is a team-level pregame estimate. Starting pitchers, announced lineups and injuries are not explicit model inputs, and live scores do not change its probability. ESPN market probabilities and Gemini commentary are separate features.</p>
      <p>Evaluation covers regular-season games. Postseason predictions also include earlier completed playoff games in the inputs; those estimates have not been separately validated. Historical inputs come from MLB records retrieved today, which may include later statistical corrections. Historical accuracy does not guarantee future performance.</p>
      <p className="muted">Training run: {model.trainedAt}</p>
    </section>
  </div>;
}
