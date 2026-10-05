# Verification record

Validated during this update:

- `npm ci --dry-run --no-audit --no-fund`: passes with the repaired lockfile (the original failed clean-install validation).
- `npm run build`: passes, including TypeScript compilation and route generation.
- `npm test`: nine focused tests pass. They cover missing/malformed odds, both observed odds schemas, doubleheader disambiguation, correct run-line sign, Python/TypeScript inference parity for every held-out game, unique game IDs, career versus season versus matchup requests, date cutoffs, HTTP failure handling, fuzzy search, agent tool execution, and oversized prompt validation.
- Running HTTP smoke checks: home, Compare, AI Analyst, Win Model, previews, odds and standings return 200. `/api/predict` returns the evaluation; a real MLB game request returns a numerical probability and feature provenance.
- Live MLB checks: player search (including Babe Ruth), year-by-year stats, career batter–pitcher stats, date-bounded team stats, schedules, standings, and historical model data respond successfully.
- Live ESPN check: the scoreboard omitted odds for the checked slate; the implemented summary fallback returned actual `pickcenter` odds for both games on 2026-10-04.
- Missing Gemini credentials: both AI endpoints return an explicit setup message, with no fake/generated fallback output.

Not verified / remaining limitations:

- No Gemini API key was supplied, so real provider generation and actual LLM tool choices were not exercised. The agent loop was tested with a mocked model and data tool.
- Automated browser interaction and screenshot QA could not run because the environment's Chromium download returned invalid archives. HTTP rendering is not a substitute for a full browser interaction test.
- `npm run lint` is not clean. It flags broad `any` types in older/provider-facing code and synchronous state resets in effects, including newer components, plus CommonJS imports in the test harness. These rules are not disabled to hide the results. Production compilation and the behavioral tests pass. Type refinement and effect-structure cleanup remain follow-up work.
- Upstream services may omit older data/markets, change schemas or become unavailable. Odds are provider snapshots and may be pregame/closing lines, not guaranteed real-time executable prices.
- Historical raw data is cached for reproducibility. The model is a prior-season baseline, not a live in-game model, and its measured test accuracy is 56.21%, not 60%+.
- This package was prepared for local use; no public deployment was performed.
