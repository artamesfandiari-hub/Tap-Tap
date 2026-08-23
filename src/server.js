require("dotenv").config();

const path = require("path");
const http = require("http");

const express = require("express");
const cors = require("cors");
const { WebSocketServer } = require("ws");

const apiRoutes = require("./api/routes");
const {
  validateTelegramInitData
} = require("./api/auth");

const {
  getRoom
} = require("./game/rooms");

const {
  attachSocketToRoom,
  handleSocketMessage
} = require("./game/multiplayer");

const {
  startBot,
  stopBot
} = require("./bot");

const app = express();

const PORT = process.env.PORT || 3000;

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "X-Telegram-Init-Data"
    ]
  })
);

app.use(express.json());

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    service: "tap-tap",
    status: "healthy",
    timestamp: new Date().toISOString()
  });
});

app.use("/api", apiRoutes);

const miniAppPath =
  path.join(__dirname, "..", "miniapp");

app.use(
  "/miniapp",
  express.static(miniAppPath)
);

app.get("/", (req, res) => {
  res.sendFile(
    path.join(
      __dirname,
      "..",
      "public",
      "index.html"
    )
  );
});

const server = http.createServer(app);

const wss = new WebSocketServer({
  server,
  path: "/ws"
});

wss.on("connection", (ws, req) => {
  try {
    const url = new URL(
      req.url,
      `http://${req.headers.host}`
    );

    const initData =
      url.searchParams.get("initData");

    const roomCode =
      String(
        url.searchParams.get("room")
      || "")
      .trim()
      .toUpperCase();

    if (!initData || !roomCode) {
      ws.close(1008, "Authentication required");
      return;
    }

    const user =
      validateTelegramInitData(
        initData,
        process.env.BOT_TOKEN
      );

    if (!user) {
      ws.close(1008, "Invalid authentication");
      return;
    }

    const room = getRoom(roomCode);

    if (!room) {
      ws.close(1008, "Room not found");
      return;
    }

    attachSocketToRoom(
      ws,
      room,
      user
    );

    ws.on("message", (buffer) => {
      handleSocketMessage(
        ws,
        buffer.toString()
      );
    });
  } catch (error) {
    console.error(
      "WebSocket connection error:",
      error
    );

    ws.close(1011, "Server error");
  }
});

server.listen(
  PORT,
  "0.0.0.0",
  async () => {
    console.log(
      `Tap-Tap server listening on ${PORT}`
    );

    try {
      await startBot();
    } catch (error) {
      console.error(
        "Telegram bot failed to start:",
        error
      );

      process.exit(1);
    }
  }
);

function shutdown(signal) {
  console.log(
    `${signal} received. Shutting down...`
  );

  try {
    stopBot();
  } catch {}

  wss.close(() => {
    server.close(() => {
      process.exit(0);
    });
  });

  setTimeout(() => {
    process.exit(0);
  }, 10000);
}

process.once(
  "SIGINT",
  () => shutdown("SIGINT")
);

process.once(
  "SIGTERM",
  () => shutdown("SIGTERM")
);
