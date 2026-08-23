let gameSocket = null;

let gameTaps = 0;
let gameStartedAt = 0;
let gameDuration = 10000;
let gameTimer = null;

function startGame(
  socket,
  duration
) {
  gameSocket = socket;

  gameTaps = 0;
  gameDuration =
    Number(duration) || 10000;

  gameStartedAt =
    Date.now();

  document.getElementById(
    "game-score"
  ).textContent = "0";

  document.getElementById(
    "countdown"
  ).textContent = "";

  updateGameTime();

  clearInterval(gameTimer);

  gameTimer =
    setInterval(
      updateGameTime,
      50
    );
}

function updateGameTime() {
  const elapsed =
    Date.now() -
    gameStartedAt;

  const remaining =
    Math.max(
      0,
      gameDuration -
        elapsed
    );

  document.getElementById(
    "game-time"
  ).textContent =
    (remaining / 1000)
      .toFixed(1);

  if (remaining <= 0) {
    clearInterval(
      gameTimer
    );
  }
}

function handleTap() {
  if (
    !gameSocket ||
    gameSocket.readyState !== 1
  ) {
    return;
  }

  if (
    Date.now() >
    gameStartedAt +
      gameDuration
  ) {
    return;
  }

  gameTaps += 1;

  document.getElementById(
    "game-score"
  ).textContent =
    gameTaps;

  gameSocket.send(
    JSON.stringify({
      type: "tap"
    })
  );

  if (
    window.Telegram?.WebApp
  ) {
    try {
      Telegram.WebApp.HapticFeedback
        .impactOccurred(
          "light"
        );
    } catch {}
  }
}

function showResults(results) {
  clearInterval(
    gameTimer
  );

  showScreen(
    "result-screen"
  );

  const list =
    document.getElementById(
      "results-list"
    );

  list.innerHTML = "";

  for (const player of results) {
    const row =
      document.createElement("div");

    row.className =
      "result-row";

    const position =
      document.createElement("div");

    position.className =
      "result-position";

    position.textContent =
      player.position === 1
        ? "🥇"
        : player.position === 2
        ? "🥈"
        : player.position === 3
        ? "🥉"
        : player.position;

    const name =
      document.createElement("div");

    name.className =
      "result-name";

    name.textContent =
      player.username
        ? `@${player.username}`
        : player.firstName;

    const score =
      document.createElement("div");

    score.className =
      "result-score";

    score.textContent =
      `${player.score} ⚡`;

    row.appendChild(
      position
    );

    row.appendChild(
      name
    );

    row.appendChild(
      score
    );

    list.appendChild(
      row
    );
  }
}

document.addEventListener(
  "DOMContentLoaded",
  () => {
    const tapButton =
      document.getElementById(
        "tap-button"
      );

    tapButton.addEventListener(
      "pointerdown",
      (event) => {
        event.preventDefault();
        handleTap();
      }
    );
  }
);
