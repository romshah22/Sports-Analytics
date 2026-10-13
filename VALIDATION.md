# Current-season model verification

- `npm run typecheck`: passes.
- `npm test`: 15 tests pass, including numerical agreement with every saved Python test prediction.
- A real MLB fixture verifies that Python and TypeScript calculate identical current-season inputs.
- Tests confirm that target-day and future results do not affect a historical input; duplicate games count once; suspended games wait for completion; ERA uses pitching outs; early-season insufficient history is reported.
- Existing tests cover MLB route contracts, odds handling, fuzzy search, request failures and the mocked Gemini tool-calling loop.
- Historical data and fitted model outputs are included for reproducibility. Evaluation uses 2,243 eligible 2025 games; accuracy is 54.66% versus a 53.68% home-team baseline on those games.
- Regular-season validation does not establish postseason accuracy. Starting pitchers, injuries, announced lineups and market odds are not explicit inputs.
- Historical records may contain later corrections from MLB. 2025 was also used by the earlier model as a benchmark.
- No real Gemini key was supplied here; live AI responses remain unverified.
- Public deployment and the user's local installation are not performed by this package.

- Production build succeeds. Live checks: `/model` responds; a July 2025 prediction matches the Python export exactly; a July 2026 prediction uses 87 current-season games through June 30.
- Browser visual verification is unavailable because Chromium is not installed; the prediction UI still needs a visual check on the user’s Mac.

- Live postseason check: an October 8, 2025 matchup used 168 completed games through October 7, including earlier playoff results. Missing unplayed-round logs are handled; other provider failures remain errors.
