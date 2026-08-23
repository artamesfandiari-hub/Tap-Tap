const {
  getRoom,
  roomSnapshot,
  canStart,
  deleteRoom
} = require("./rooms");

const {
  GAME_DURATION_MS,
  calculateScore,
  sortResults
} = require("./scoring");

const { saveGame } = require("../database/db");

function send(ws, payload) {
  if (ws.readyState === 1) {
    ws.send(JSON.stringify(payload));
  }
}

function broadcast(room, payload) {
  for (const player of room.players.values()) {
    if (player.ws) {
      send(player.ws, payload);
    }
  }
}

function attachSocketToRoom(ws, room, user) {
  const telegramId = Number(user.id);

  const player = room.players.get(telegramId);

  if (!player) {
    send(ws, {
      type: "error",
      error: "PLAYER_NOT_IN_ROOM"
    });

    return;
  }

  player.ws = ws;
  player.connected = true;

  ws.roomCode = room.code;
  ws.telegramId = telegramId;

  send(ws, {
    type: "room_state",
    room: roomSnapshot(room)
  });

  broadcast(room, {
    type: "room_state",
    room: roomSnapshot(room)
  });

  ws.on("close", () => {
    const currentRoom = getRoom(room.code);

    if (!currentRoom) return;

    const currentPlayer =
      currentRoom.players.get(telegramId);

    if (currentPlayer) {
      currentPlayer.connected = false;
      currentPlayer.ws = null;
    }

    broadcast(currentRoom, {
      type: "room_state",
      room: roomSnapshot(currentRoom)
    });
  });
}

function startRoom(room) {
  if (!canStart(room)) {
    return false;
  }

  room.status = "starting";

  broadcast(room, {
    type: "game_countdown",
    seconds: 3
  });

  setTimeout(() => {
    if (room.status !== "starting") return;

    broadcast(room, {
      type: "game_countdown",
      seconds: 2
    });
  }, 1000);

  setTimeout(() => {
    if (room.status !== "starting") return;

    broadcast(room, {
      type: "game_countdown",
      seconds: 1
    });
  }, 2000);

  setTimeout(() => {
    if (room.status !== "starting") return;

    room.status = "playing";
    room.startedAt = Date.now();

    for (const player of room.players.values()) {
      player.taps = 0;
      player.score = 0;
    }

    broadcast(room, {
      type: "game_start",
      duration: GAME_DURATION_MS
    });

    setTimeout(() => {
      finishRoom(room);
    }, GAME_DURATION_MS);
  }, 3000);

  return true;
}

function registerTap(room, telegramId) {
  if (room.status !== "playing") {
    return;
  }

  const player = room.players.get(Number(telegramId));

  if (!player) {
    return;
  }

  if (Date.now() > room.startedAt + GAME_DURATION_MS) {
    return;
  }

  player.taps += 1;
  player.score = calculateScore(player.taps);
}

async function finishRoom(room) {
  if (!room || room.status !== "playing") {
    return;
  }

  room.status = "finished";

  const results = sortResults(
    [...room.players.values()].map((player) => ({
      telegramId: player.telegramId,
      username: player.username,
      firstName: player.firstName,
      taps: player.taps,
      score: player.score
    }))
  );

  broadcast(room, {
    type: "game_result",
    results
  });

  try {
    await saveGame({
      roomCode: room.code,
      winnerTelegramId:
        results[0]?.telegramId || null,
      startedAt: new Date(room.startedAt),
      finishedAt: new Date(),
      players: results
    });
  } catch (error) {
    console.error("Failed to save game:", error);
  }

  setTimeout(() => {
    deleteRoom(room.code);
  }, 60000);
}

function handleSocketMessage(ws, message) {
  let data;

  try {
    data = JSON.parse(message);
  } catch {
    send(ws, {
      type: "error",
      error: "INVALID_MESSAGE"
    });

    return;
  }

  const room = getRoom(ws.roomCode);

  if (!room) {
    send(ws, {
      type: "error",
      error: "ROOM_NOT_FOUND"
    });

    return;
  }

  if (data.type === "start_game") {
    if (room.hostTelegramId !== ws.telegramId) {
      send(ws, {
        type: "error",
        error: "ONLY_HOST_CAN_START"
      });

      return;
    }

    startRoom(room);
    return;
  }

  if (data.type === "tap") {
    registerTap(room, ws.telegramId);
  }
}

module.exports = {
  attachSocketToRoom,
  handleSocketMessage,
  startRoom
};
