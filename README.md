# Diamond Stats — MLB Analytics

A Next.js / React / TypeScript dashboard with MLB data, player comparisons, an optional Gemini tool-calling analyst, ESPN odds, and a Python-trained logistic-regression win model.

## Start here

Install Node.js 20.9+ (Node 22 LTS recommended). Unzip this project, open its folder in VS Code, then run:

```bash
npm ci
npm run dev
```

Open http://localhost:3000. All statistics, comparisons, standings, odds and model features work without a Gemini key when the providers are reachable. Internet access is required for MLB and ESPN data. The trained model is included; Python is not needed to run the app.

To enable AI, copy `.env.example` to `.env.local`, paste your Gemini API key into `GEMINI_API_KEY`, and restart the server. Keep the key on your computer; do not put it in chat or commit it. `GEMINI_MODEL` defaults to `gemini-2.5-flash` and can be changed to a model supported by your Google account. Gemini availability and quota depend on that account.

```bash
# macOS / Linux
cp .env.example .env.local
# Windows PowerShell instead:
# Copy-Item .env.example .env.local
```

For a production run:

```bash
npm run build
npm start
```

## What to try

- **Compare:** Search Aaron Judge in both boxes; choose 2024 for one and 2023 for the other. Each player has an independent season selector and career totals. Pick a chart metric or switch batting/pitching. Historical names such as Babe Ruth are supported through MLB search. Fuzzy suggestions use the loaded player list.
- **Players:** Search a player, open their profile, and view their available seasons, career totals and recent game log. Request AI commentary with the button.
- **Head-to-Head:** Choose a batter, pitcher and year (or career). This is direct batter-versus-pitcher history, separate from the comparison page.
- **Tonight's Games:** Select a date. Team form and season-to-date stats stop before that date. Each game shows a trained ML probability separately from available ESPN market probabilities. The model is a pregame estimate even when the game has ended.
- **MLB Odds:** ESPN scoreboard plus game-summary `pickcenter` data. Odds are refreshed every 60 seconds while the page is open. Historical odds can be pregame/closing lines. No odds are fabricated when the provider omits them. Doubleheaders are matched by team and, when needed, game time.
- **Standings:** Official MLB standings, refreshed on server requests with a five-minute cache.
- **AI Analyst:** Ask “How did Aaron Judge perform in 2024 compared with 2023?” The model can request player search, stats, schedule, standings and trained predictions. The page shows the actual tool calls. Each question is independent; this is not a persistent chat session.
- **Win Model:** View the chronological holdout evaluation and limitations.

## Current-season prediction model

For a selected game, the backend downloads both teams' game logs from that season. It uses only completed games before the selected date. Five home-minus-away features describe batting average, ERA, OPS, run differential per game, and last-10 win percentage. The intercept learns home-field advantage.

Both teams need at least 10 prior completed games. Early-season games with insufficient history return a clear unavailable message instead of silently substituting last year's stats. Same-day results are excluded, and suspended games enter the history only after completion. Postseason requests also retrieve prior completed playoff games; evaluation below covers regular-season games only.

| Item | Result |
| --- | --- |
| Algorithm | StandardScaler + logistic regression |
| Training seasons | 2021–2024 |
| Training games | 8,892 |
| Test season | 2025 |
| Eligible test games | 2,243 of 2,430 |
| Accuracy | 54.66% |
| Always pick home baseline, same games | 53.68% |
| Brier score | 0.2452 |
| Log loss | 0.6832 |

The feature specification and regularization were fixed before this run, without a test-season parameter sweep. The previous model also used 2025 as a benchmark, so this is a chronological historical evaluation, not a newly untouched prospective test. Accuracy is lower than the previous prior-season model on its different eligible game set; more recent inputs do not guarantee better predictive performance. Starting pitchers, injuries, announced lineups and market odds are not explicit model inputs. Predictions are pregame estimates, not live win probabilities. No claim of 60% accuracy is supported.

### Reproduce training (optional)

Use Python 3.10+ in a virtual environment:

```bash
python -m venv .venv
# macOS/Linux: source .venv/bin/activate
# Windows: .venv\Scripts\Activate.ps1
python -m pip install -r ml/requirements.txt
python ml/train.py
```

The ZIP contains the raw MLB response cache used for this evaluation, so the same data can be reused. Delete `ml/cache` only if you deliberately want to download fresh historical responses. That may change results if MLB has corrected data. Cache files are excluded from Git by default.

`models/win-model.json` holds the coefficients, scaling parameters and evaluation. `models/evaluation.json` is the concise report; `models/test-predictions.json` contains every held-out game and its prediction. `ml/train.py` exports all three. The runtime evaluates the same formula in TypeScript; it does not start a Python server.

## Architecture

Every interactive data feature follows the same flow:

**React page → Next.js API route → provider or saved model → JSON response → page display.**

| File | Responsibility |
| --- | --- |
| `lib/mlb-api.ts` | Browser helpers that call `/api/mlb`; pages keep the same function names. |
| `app/api/mlb/route.ts` | Validate player IDs, seasons and dates, choose the MLB helper, return JSON. |
| `lib/mlb-server.ts` | Contact MLB and extract player stats, schedules, matchups and standings. |
| `lib/player-search.ts` | Local fuzzy matching using edit distance. |
| `lib/request.ts` | Shared request timeout and HTTP-error handling. |
| `app/api/gemini/route.ts` | Validate a prepared prompt and return Gemini commentary. |
| `app/api/agent/route.ts` | Let Gemini request predefined server tools and return an answer with a lookup trace. |
| `app/api/odds/route.ts` | Retrieve ESPN scoreboard and game-summary odds. |
| `app/api/predict/route.ts` | Return a prediction or model evaluation metadata. |
| `lib/prediction.ts` | Load the exported model and calculate probabilities. |
| `ml/train.py` | Train and evaluate the model offline in Python. |

The agent uses the same server MLB helpers as `/api/mlb`; it does not make an HTTP request back into its own server. Fuzzy suggestions are local string matching, not a remote data request. No database or FastAPI service is used. The current-season model replaces the earlier prior-season baseline. `lib/pregame-features.ts` calculates the same pregame inputs used by Python training.

## Common problems

- **`npm ci` fails:** Check the Node version and that the terminal is in the folder containing `package.json`. This ZIP includes a repaired lockfile.
- **Port 3000 is in use:** `npm run dev -- --port 3001`, then open http://localhost:3001.
- **AI says key missing:** Create `.env.local` in the project root and restart Next.js. Basic features do not require AI.
- **AI quota/model error:** Check the key, Google API quota and configured model name.
- **Stats or odds unavailable:** Check internet access and retry. Some markets/older stats are genuinely absent from upstream data.
- **Model unavailable:** Confirm `models/win-model.json` exists in the extracted folder, or run the training command.

This is a local portfolio app. Public deployment would need authentication/rate limits for the AI endpoints, provider-usage review and operational monitoring. The ZIP does not publish anything or include credentials.
