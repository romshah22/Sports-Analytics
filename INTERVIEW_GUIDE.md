# Explaining Diamond Stats in your Deloitte interview

## A clear 45-second explanation

“Diamond Stats is a full-stack baseball analytics app. The React frontend lets users search players, compare different seasons, inspect matchups and view games and standings. It uses Next.js for routing and backend endpoints, with TypeScript for the application and Python for model training. I integrated MLB data for the statistics, ESPN for available betting lines, and Gemini for optional analysis. The AI analyst can choose tools to retrieve statistics before answering. Separately, a logistic-regression model estimates game outcomes from historical team stats. I evaluated it on a later season that wasn’t used for training, and the baseline achieved about 56% accuracy.”

Use this only after you understand and have run the relevant features. This updated ZIP adds functionality that was absent from the original upload; distinguish the original implementation from these later improvements if asked about your timeline or contribution. Describe AI assistance honestly if asked.

## Walk through a single request

### Comparing Aaron Judge in two seasons

1. A user types a name into a React component. Local fuzzy matching suggests similar names; a debounced MLB search also finds historical players.
2. Selecting the player stores the MLB player ID in React state.
3. The app asks MLB for the seasons in that player's career and displays them in a dropdown.
4. The user chooses 2024 on the left and 2023 on the right. The app fetches both sets of stats independently and in parallel.
5. React renders the table; Recharts plots the selected metric. Missing values stay empty instead of being treated as zero.
6. If the user changes the selection during a request, the effect cleanup prevents an outdated response from replacing the new selection's data.

The player ID is more reliable than using a name as a key: players can share names and names can be misspelled.

### Asking the AI analyst a question

1. The browser sends the question to `/api/agent` on the Next.js server.
2. The server sends Gemini descriptions of five allowed tools and grounding instructions.
3. Gemini might request `search_players` to resolve the ID, then `player_stats` for one or more seasons.
4. The server validates the arguments and runs the requested function. Gemini does not execute arbitrary application code.
5. The server sends the fetched results back to Gemini. Gemini writes an answer using that context.
6. The page displays the answer and a trace of the actual data lookups.

The loop is limited to five rounds and six tool calls per round. Errors become explicit tool results. The API key stays on the server. A question currently has no memory of earlier questions.

**Why call it an agent?** It can choose a tool, inspect the result and request another tool before answering. The older per-page analysis feature is simpler: the app supplies a prepared stats prompt and Gemini produces commentary. Those are different workflows.

**Does this eliminate hallucinations?** No. Retrieval and grounding reduce unsupported claims, but the generated wording still needs scrutiny. Missing facts should be reported as missing. A lookup trace proves which tools ran; it does not prove every generated sentence is correct.

### Predicting a game

1. Offline, Python downloads historical regular-season schedules and team statistics.
2. The target label is 1 for a home win and 0 for an away win.
3. For each game in season Y, inputs come from season Y−1: home minus away batting average and ERA. Home advantage is represented by the fitted intercept.
4. StandardScaler learns a mean and scale from the training data only. Logistic regression learns weights connecting those scaled inputs to the home-win label.
5. The model trains on 2021–2024 and is tested on the separate 2025 season.
6. Python exports the weights, means, scales and metrics to JSON.
7. At runtime, the Next.js server identifies the teams and season, selects their prior-year features and evaluates the saved formula. No retraining happens when the user clicks a game.

Formula: `z = intercept + sum(weight[i] * (feature[i] - mean[i]) / scale[i])`; `P(home win) = 1 / (1 + exp(-z))`.

Logistic regression is a supervised classification model. Despite its name, it estimates class probabilities. Scikit-learn provides the implementation; the work includes defining features, collecting and cleaning data, choosing a valid split, evaluating the result and integrating inference.

## Questions you should be ready for

**Why use prior-season stats?**

Using end-of-season stats to predict games from that same season would leak future information. Prior-season inputs are available before the game. The tradeoff is stale information after roster changes. A next improvement would be rigorously time-stamped current-season rolling statistics and known probable starters, evaluated on a new future holdout.

**Why not randomly split games?**

The app is intended to predict future games, so training on earlier seasons and testing on a later one better matches that use. Random splits can mix future and past information and overstate usefulness.

**What was the measured accuracy?**

56.21% across 2,430 unique completed regular-season games in 2025. Always picking the home team achieved 54.28%, so the model improved accuracy by approximately 1.93 percentage points on that holdout. Do not call that 60%, a guaranteed betting edge, or proven future performance. Brier score and log loss additionally assess probability quality.

**Why did you deduplicate games?**

A suspended game can appear on multiple dates in a schedule response when it resumes. Deduplicating on `gamePk` prevents counting it multiple times. This corrected the final test count from 2,434 schedule entries to 2,430 unique games; it was a data-cleaning fix, not model tuning.

**Is the LLM making the numerical prediction?**

No. The numerical ML prediction comes from fitted logistic regression. Gemini writes contextual commentary. ESPN odds imply a third, separate probability. The UI labels these sources separately.

**How do betting odds become probabilities?**

For +150, implied probability is `100/(150+100) = 40%`. For −150, it is `150/(150+100) = 60%`. The two sides usually sum to more than 100% because of the bookmaker margin. Dividing each implied probability by their sum gives a normalized market probability. It remains an estimate, not a known true probability.

**What happens if ESPN changes its data?**

The parser supports observed scoreboard/summary structures and only accepts valid moneylines. The server falls back to a game-summary lookup when the scoreboard omits odds. If a line remains unavailable, the UI shows that instead of substituting −110 or a made-up total. Provider changes remain a maintenance risk.

**How does fuzzy search work?**

Levenshtein edit distance counts insertions, deletions and substitutions needed to turn one name into another. The app converts that to a similarity score and ranks likely matches. Fuzzy suggestions come from the loaded player list; historical names can also be found through MLB's search endpoint. This is deterministic string matching, not a trained ML search model.

**What are React, Next.js and TypeScript doing?**

React manages interactive components and state. Next.js provides page routing, server rendering and API routes in the same project. TypeScript checks types before runtime; it does not automatically validate untrusted JSON responses.

**Where is Python used? Is there a database?**

Python handles training and evaluation with NumPy and scikit-learn. Next.js performs runtime inference using exported JSON. There is no FastAPI service and no relational database in this version. Do not claim otherwise.

**Give an actual debugging example.**

“The head-to-head page expected a result with a `stat` property, but the helper returned only the inner statistics object. The API request could succeed while the UI still appeared empty. I traced the data from the helper into the component, fixed their contract and added a test. I also corrected the career request, which had mistakenly requested season statistics.”

Review `lib/mlb-api.ts` and the corresponding test before using this explanation so you can point to the exact mismatch.

**What would you improve next?**

Time-correct current-season features, starting-pitcher information, probability calibration, and evaluation on a new unseen season. On the application side: more runtime schema validation, stronger typing for older components, automated browser tests, persistent caching and rate limits before a public deployment. Avoid promising a specific accuracy increase.

## A short demo order

1. Run the app and open Compare.
2. Compare Aaron Judge 2024 versus Aaron Judge 2023; change the chart to HR.
3. Open a player profile and show career versus season stats.
4. Show a batter–pitcher matchup.
5. Select a date on Tonight's Games and explain ML versus market probabilities.
6. Open Win Model and explain the chronological evaluation.
7. If your Gemini key is configured, ask the AI Analyst a player question and show the lookup trace.

Try this before the interview, with your own internet connection and Gemini account. Do not depend on an untested API key for the live demonstration.

## Accurate résumé wording for this version

- Developed a full-stack MLB analytics dashboard with player search, career and season comparisons, live standings, and a Gemini analyst that retrieves MLB data through validated tools.
- Built and evaluated a Python logistic-regression baseline using historical team batting average, ERA and learned home-field advantage, achieving 56.2% accuracy on a held-out 2025 season; integrated ESPN odds and probability visualizations.
- Implemented fuzzy player suggestions and independent player, season and stat-group filters for side-by-side analysis.

Use these as factual descriptions of the updated version, not as claims that the original upload already contained the new model and agent.
