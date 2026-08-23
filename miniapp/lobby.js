let currentRoom = null;
let socket = null;

function setLobbyMessage(message) {
  const el =
    document.getElementById(
      "lobby-message"
    );

  if (el) {
    el.textContent = message || "";
  }
}

function renderRoom(room) {
  currentRoom = room;

  document.getElementById(
    "room-code"
  ).textContent = room.code;

  document.getElementById(
    "player-count"
  ).textContent =
    `${room.playerCount}/${room.maxPlayers}`;

  const list =
    document.getElementById(
      "players-list"
    );

  list.innerHTML = "";

  for (const player of room.players) {
    const row =
      document.createElement("div");

    row.className =
      "player-row";

    const name =
      document.createElement("div");

    name.className =
      "player-name";

    name.textContent =
      player.username
        ? `@${player.username}`
        : player.firstName;

    if (
      Number(player.telegramId) ===
      Number(room.hostTelegramId)
    ) {
      const badge =
        document.createElement("span");

      badge.className =
        "host-badge";

      badge.textContent =
        "HOST";

      name.appendChild(badge);
    }

    const status =
      document.createElement("span");

    status.textContent =
      player.connected
        ? "🟢"
        : "⚪";

    row.appendChild(name);
    row.appendChild(status);

    list.appendChild(row);
  }

  const me =
    window.TAP_USER_ID;

  const startButton =
    document.getElementById(
      "start-game-btn"
    );

  startButton.disabled =
    Number(me) !==
      Number(room.hostTelegramId) ||
    room.playerCount < room.minPlayers;

  if (
    room.playerCount <
    room.minPlayers
  ) {
    setLobbyMessage(
      `حداقل ${room.minPlayers} نفر برای شروع لازم است.`
    );
  } else if (
    Number(me) ===
    Number(room.hostTelegramId)
  ) {
    setLobbyMessage(
      "همه آماده‌اند. بازی را شروع کن."
    );
  } else {
    setLobbyMessage(
      "منتظر Host بمان..."
    );
  }
}

async function openRoom(room) {
  renderRoom(room);

  showScreen("lobby-screen");

  connectRoomSocket(room.code);
}

function connectRoomSocket(roomCode) {
  if (socket) {
    try {
      socket.close();
    } catch {}
  }

  socket =
    createSocket(roomCode);

  socket.addEventListener(
    "open",
    () => {
      setLobbyMessage(
        "متصل شدی. منتظر بازیکنان باش..."
      );
    }
  );

  socket.addEventListener(
    "message",
    (event) => {
      let data;

      try {
        data =
          JSON.parse(event.data);
      } catch {
        return;
      }

      if (
        data.type ===
        "room_state"
      ) {
        renderRoom(
          data.room
        );
      }

      if (
        data.type ===
        "game_countdown"
      ) {
        startCountdown(
          data.seconds
        );
      }

      if (
        data.type ===
        "game_start"
      ) {
        startGame(
          socket,
          data.duration
        );
      }

      if (
        data.type ===
        "game_result"
      ) {
        showResults(
          data.results
        );
      }

      if (
        data.type ===
        "error"
      ) {
        setLobbyMessage(
          data.error
        );
      }
    }
  );

  socket.addEventListener(
    "close",
    () => {
      if (
        currentRoom &&
        currentRoom.status ===
          "waiting"
      ) {
        setLobbyMessage(
          "اتصال به سرور قطع شد."
        );
      }
    }
  );
}

function startCountdown(seconds) {
  showScreen("game-screen");

  const countdown =
    document.getElementById(
      "countdown"
    );

  countdown.textContent =
    seconds;

  if (
    window.navigator.vibrate
  ) {
    navigator.vibrate(20);
  }
}

function sendStartGame() {
  if (
    !socket ||
    socket.readyState !== 1
  ) {
    return;
  }

  socket.send(
    JSON.stringify({
      type: "start_game"
    })
  );
}

function shareCurrentRoom() {
  if (!currentRoom) return;

  const botUsername =
    window.TAP_BOT_USERNAME ||
    "";

  const link =
    botUsername
      ? `https://t.me/${botUsername}?startapp=room_${currentRoom.code}`
      : `${location.origin}/miniapp/?room=${currentRoom.code}`;

  if (
    window.Telegram?.WebApp?.switchInlineQuery
  ) {
    Telegram.WebApp.switchInlineQuery(
      `Join my Tap-Tap game: ${currentRoom.code}`
    );
  }

  if (
    navigator.share
  ) {
    navigator.share({
      title: "Tap-Tap",
      text:
        `Join my Tap-Tap game! Code: ${currentRoom.code}`,
      url: link
    }).catch(() => {});
  } else if (
    navigator.clipboard
  ) {
    navigator.clipboard
      .writeText(link)
      .then(() => {
        setLobbyMessage(
          "لینک بازی کپی شد."
        );
      });
  }
}

document.addEventListener(
  "DOMContentLoaded",
  () => {
    document
      .getElementById(
        "start-game-btn"
      )
      .addEventListener(
        "click",
        sendStartGame
      );

    document
      .getElementById(
        "copy-code-btn"
      )
      .addEventListener(
        "click",
        async () => {
          if (!currentRoom) return;

          try {
            await navigator.clipboard.writeText(
              currentRoom.code
            );

            setLobbyMessage(
              "کد اتاق کپی شد."
            );
          } catch {}
        }
      );

    document
      .getElementById(
        "share-room-btn"
      )
      .addEventListener(
        "click",
        shareCurrentRoom
      );
  }
);
