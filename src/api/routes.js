const express = require("express");

const {
  requireTelegramUser
} = require("./auth");

const {
  createRoom,
  getRoom,
  joinRoom,
  roomSnapshot
} = require("../game/rooms");

const {
  getPlayerStats,
  getLeaderboard,
  getOrCreatePlayer
} = require("../database/db");

const router = express.Router();

router.get("/me", requireTelegramUser, async (req, res) => {
  try {
    const user = req.telegramUser;

    if (process.env.DATABASE_URL) {
      const player = await getOrCreatePlayer(user);

      return res.json({
        ok: true,
        user: player
      });
    }

    res.json({
      ok: true,
      user: {
        telegram_id: user.id,
        username: user.username || null,
        first_name: user.first_name || null,
        last_name: user.last_name || null
      }
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      ok: false,
      error: "SERVER_ERROR"
    });
  }
});

router.get("/stats", requireTelegramUser, async (req, res) => {
  try {
    if (!process.env.DATABASE_URL) {
      return res.json({
        ok: true,
        stats: {
          games_played: 0,
          wins: 0,
          losses: 0,
          total_score: 0,
          best_score: 0,
          best_taps: 0,
          current_win_streak: 0,
          best_win_streak: 0,
          win_rate: 0
        }
      });
    }

    const stats = await getPlayerStats(
      req.telegramUser.id
    );

    res.json({
      ok: true,
      stats
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      ok: false,
      error: "SERVER_ERROR"
    });
  }
});

router.get("/leaderboard", async (req, res) => {
  try {
    if (!process.env.DATABASE_URL) {
      return res.json({
        ok: true,
        leaderboard: []
      });
    }

    const leaderboard = await getLeaderboard(20);

    res.json({
      ok: true,
      leaderboard
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      ok: false,
      error: "SERVER_ERROR"
    });
  }
});

router.post("/rooms", requireTelegramUser, async (req, res) => {
  try {
    const room = createRoom(req.telegramUser);

    res.json({
      ok: true,
      room: roomSnapshot(room)
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      ok: false,
      error: "ROOM_CREATE_FAILED"
    });
  }
});

router.post(
  "/rooms/join",
  requireTelegramUser,
  async (req, res) => {
    try {
      const code = String(req.body.code || "")
        .trim()
        .toUpperCase();

      if (!/^[A-Z0-9]{6}$/.test(code)) {
        return res.status(400).json({
          ok: false,
          error: "INVALID_ROOM_CODE"
        });
      }

      const room = getRoom(code);

      if (!room) {
        return res.status(404).json({
          ok: false,
          error: "ROOM_NOT_FOUND"
        });
      }

      joinRoom(room, req.telegramUser);

      res.json({
        ok: true,
        room: roomSnapshot(room)
      });
    } catch (error) {
      console.error(error);

      const map = {
        ROOM_FULL: 409,
        GAME_ALREADY_STARTED: 409
      };

      res.status(map[error.message] || 500).json({
        ok: false,
        error: error.message || "ROOM_JOIN_FAILED"
      });
    }
  }
);

module.exports = router;
