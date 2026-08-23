const GAME_DURATION_MS = 10000;

function calculateScore(taps) {
  const safeTaps = Math.max(0, Math.floor(Number(taps) || 0));

  return safeTaps;
}

function sortResults(players) {
  return [...players]
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return b.taps - a.taps;
    })
    .map((player, index) => ({
      ...player,
      position: index + 1,
      won: index === 0
    }));
}

module.exports = {
  GAME_DURATION_MS,
  calculateScore,
  sortResults
};
