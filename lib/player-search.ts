// Fuzzy string matching — finds similar strings for "did you mean"
export function fuzzyMatch(search: string, targets: string[]): string[] {
    const query = search.toLowerCase();
    return targets
        .map(target => ({
        name: target,
        score: calculateSimilarity(query, target.toLowerCase()),
    }))
        .filter(item => item.score > 0.4) // only matches with >40% similarity
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map(item => item.name);
}
// Levenshtein distance for similarity scoring
function calculateSimilarity(a: string, b: string): number {
    const longer = a.length > b.length ? a : b;
    const shorter = a.length > b.length ? b : a;
    if (longer.length === 0)
        return 1.0;
    const editDistance = getEditDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
}
function getEditDistance(s1: string, s2: string): number {
    const costs = [];
    for (let i = 0; i <= s1.length; i++) {
        let lastValue = i;
        for (let j = 0; j <= s2.length; j++) {
            if (i === 0) {
                costs[j] = j;
            }
            else if (j > 0) {
                let newValue = costs[j - 1];
                if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
                    newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
                }
                costs[j - 1] = lastValue;
                lastValue = newValue;
            }
        }
        if (i > 0)
            costs[s2.length] = lastValue;
    }
    return costs[s2.length];
}
