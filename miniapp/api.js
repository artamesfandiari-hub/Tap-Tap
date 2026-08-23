const tg =
  window.Telegram?.WebApp || null;

const API_BASE =
  window.location.origin + "/api";

function initTelegram() {
  if (!tg) return;

  tg.ready();
  tg.expand();

  try {
    tg.setHeaderColor("#0b0b10");
    tg.setBackgroundColor("#0b0b10");
  } catch {}
}

function getInitData() {
  return tg?.initData || "";
}

async function apiFetch(
  path,
  options = {}
) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  headers["X-Telegram-Init-Data"] =
    getInitData();

  const response = await fetch(
    `${API_BASE}${path}`,
    {
      ...options,
      headers
    }
  );

  const data =
    await response.json().catch(
      () => ({})
    );

  if (!response.ok) {
    throw new Error(
      data.error ||
      "Request failed"
    );
  }

  return data;
}

async function getMyStats() {
  return apiFetch("/stats");
}

async function getLeaderboard() {
  return apiFetch("/leaderboard");
}

async function createRoom() {
  return apiFetch("/rooms", {
    method: "POST"
  });
}

async function joinRoom(code) {
  return apiFetch("/rooms/join", {
    method: "POST",
    body: JSON.stringify({
      code
    })
  });
}

function createSocket(roomCode) {
  const protocol =
    location.protocol === "https:"
      ? "wss:"
      : "ws:";

  const encodedInitData =
    encodeURIComponent(
      getInitData()
    );

  const encodedRoom =
    encodeURIComponent(
      roomCode
    );

  const url =
    `${protocol}//${location.host}/ws` +
    `?initData=${encodedInitData}` +
    `&room=${encodedRoom}`;

  return new WebSocket(url);
}

initTelegram();
