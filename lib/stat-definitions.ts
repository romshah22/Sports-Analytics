export const statDefinitions: Record<string, { label: string; description: string; simple: string }> = {
  // Batting
  'AVG': {
    label: 'Batting Average',
    description: 'Hits divided by At-Bats. Measures how often a batter gets a hit.',
    simple: 'How often they get a hit (higher = better)',
  },
  'HR': {
    label: 'Home Runs',
    description: 'Number of times the batter hit the ball out of the park for an automatic run.',
    simple: 'Out of the park hits (higher = better)',
  },
  'RBI': {
    label: 'Runs Batted In',
    description: 'Number of runs that scored as a direct result of the batter\'s hit.',
    simple: 'Runs they helped score (higher = better)',
  },
  'OPS': {
    label: 'On-Base Plus Slugging',
    description: 'Combination of OBP and SLG. Measures overall offensive production.',
    simple: 'Overall hitting power (higher = better)',
  },
  'OBP': {
    label: 'On-Base Percentage',
    description: 'Percentage of times the batter reaches base (hits, walks, hit-by-pitch).',
    simple: 'How often they get on base (higher = better)',
  },
  'SLG': {
    label: 'Slugging Percentage',
    description: 'Total bases per at-bat. Measures power hitting.',
    simple: 'How much power they hit with (higher = better)',
  },
  'K': {
    label: 'Strikeouts',
    description: 'Times the batter struck out.',
    simple: 'Times they strike out (lower = better)',
  },
  'BB': {
    label: 'Walks',
    description: 'Times the pitcher threw 4 balls before 3 strikes, batter goes to first base.',
    simple: 'Times they got walked (higher = better)',
  },
  'SB': {
    label: 'Stolen Bases',
    description: 'Times the batter safely advanced a base while the pitcher was throwing.',
    simple: 'How many bases they stole (higher = better)',
  },
  'H': {
    label: 'Hits',
    description: 'Times the batter hit the ball and reached base safely.',
    simple: 'Total safe hits (higher = better)',
  },
  'R': {
    label: 'Runs',
    description: 'Times the batter crossed home plate to score a run.',
    simple: 'Times they scored (higher = better)',
  },
  'AB': {
    label: 'At-Bats',
    description: 'Number of times the batter came to the plate to hit (excludes walks).',
    simple: 'Times they got to bat',
  },
  'G': {
    label: 'Games Played',
    description: 'Number of games the player appeared in.',
    simple: 'Games they played in',
  },
  '2B': {
    label: 'Doubles',
    description: 'Hits where the batter safely reached second base.',
    simple: 'Two-base hits (higher = better)',
  },
  '3B': {
    label: 'Triples',
    description: 'Hits where the batter safely reached third base.',
    simple: 'Three-base hits (higher = better)',
  },

  // Pitching
  'ERA': {
    label: 'Earned Run Average',
    description: 'Average number of earned runs allowed per 9 innings pitched.',
    simple: 'Runs allowed per game (lower = better)',
  },
  'W': {
    label: 'Wins',
    description: 'Games the pitcher was credited with winning.',
    simple: 'Games they won (higher = better)',
  },
  'L': {
    label: 'Losses',
    description: 'Games the pitcher was credited with losing.',
    simple: 'Games they lost (lower = better)',
  },
  'WHIP': {
    label: 'Walks + Hits per Innings Pitched',
    description: 'Average number of baserunners per inning. Lower is better.',
    simple: 'Baserunners allowed per inning (lower = better)',
  },
  'IP': {
    label: 'Innings Pitched',
    description: 'Total innings the pitcher threw.',
    simple: 'Total innings pitched',
  },
  'GS': {
    label: 'Games Started',
    description: 'Number of games where the pitcher was the starting pitcher.',
    simple: 'Games they started',
  },
  'SV': {
    label: 'Saves',
    description: 'Games the pitcher finished and won while meeting specific criteria.',
    simple: 'Close games they finished and won (higher = better)',
  },
  'BAA': {
    label: 'Batting Average Against',
    description: 'Batting average of hitters facing this pitcher.',
    simple: 'Batting average against them (lower = better)',
  },
  'K/9': {
    label: 'Strikeouts per 9 Innings',
    description: 'Average strikeouts per 9 innings pitched.',
    simple: 'Strikeouts per game (higher = better)',
  },
};

export function getStatInfo(stat: string) {
  return statDefinitions[stat] || null;
}