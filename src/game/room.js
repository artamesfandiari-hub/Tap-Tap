const crypto = require("crypto");

const rooms = new Map();

const MAX_PLAYERS = 6;
const MIN_PLAYERS = 2;

function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  let code = "";

  for (let i = 0; i < 6; i++) {
    code += chars[crypto.randomInt(0, chars.length)];
  }

  return code;
}

function createRoom(host) {
  let code;

  do {
    code = generateCode();
  } while (rooms.has(code));

  const room = {
    code,
    hostTelegramId: Number(host.id),
    status: "waiting",
    createdAt: Date.now(),
    startedAt: null,
    players: new Map()
  };

  room.players.set(Number(host.id), {
    telegramId: Number(host.id),
    username: host.username || "",
    firstName: host.first_name || "Player",
    taps: 0,
    score: 0,
    connected: false
  });

  rooms.set(code, room);

  return room;
}

function getRoom(code) {
  if (!code) return null;

  return rooms.get(String(code).toUpperCase()) || null;
}

function joinRoom(room, user) {
  const telegramId = Number(user.id);

  if (room.status !== "waiting") {
    throw new Error("GAME_ALREADY_STARTED");
  }

  if (
    room.players.size >= MAX_PLAYERS &&
    !room.players.has(telegramId)
  ) {
    throw new Error("ROOM_FULL");
  }

  if (!room.players.has(telegramId)) {
    room.players.set(telegramId, {
      telegramId,
      username: user.username || "",
      firstName: user.first_name || "Player",
      taps: 0,
      score: 0,
      connected: false
    });
  }

  return room;
}

function removePlayer(room, telegramId) {
  telegramId = Number(telegramId);

  if (room.hostTelegramId === telegramId) {
    return false;
  }

  room.players.delete(telegramId);

  return true;
}

function roomSnapshot(room) {
  return {
    code: room.code,
    hostTelegramId: room.hostTelegramId,
    status: room.status,
    playerCount: room.players.size,
    maxPlayers: MAX_PLAYERS,
    minPlayers: MIN_PLAYERS,
    players: [...room.players.values()].map((player) => ({
      telegramId: player.telegramId,
      username: player.username,
      firstName: player.firstName,
      taps: player.taps,
      score: player.score,
      connected: player.connected
    }))
  };
}

function canStart(room) {
  return (
    room.status === "waiting" &&
    room.players.size >= MIN_PLAYERS
  );
}

function deleteRoom(code) {
  rooms.delete(String(code).toUpperCase());
}

module.exports = {
  rooms,
  MAX_PLAYERS,
  MIN_PLAYERS,
  createRoom,
  getRoom,
  joinRoom,
  removePlayer,
  roomSnapshot,
  canStart,
  deleteRoom
};
