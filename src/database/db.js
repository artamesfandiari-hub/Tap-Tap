const { Pool } = require("pg");

let pool = null;

if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
  });

  pool.on("error", (error) => {
    console.error("PostgreSQL pool error:", error);
  });
}

function hasDatabase() {
  return Boolean(pool);
}

async function query(text, params = []) {
  if (!pool) {
    throw new Error("DATABASE_URL is not configured");
  }

  return pool.query(text, params);
}

async function getOrCreatePlayer(user) {
  const telegramId = Number(user.id);

  const result = await query(
    `
    INSERT INTO players (
      telegram_id,
      username,
      first_name,
      last_name
    )
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (telegram_id)
    DO UPDATE SET
      username = EXCLUDED.username,
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      updated_at = NOW()
    RETURNING *
    `,
    [
      telegramId,
      user.username || null,
      user.first_name || null,
      user.last_name || null
    ]
  );

  return result.rows[0];
}

async function getPlayerStats(telegramId) {
  const result = await query(
    `
    SELECT
      *,
      CASE
        WHEN games_played = 0 THEN 0
        ELSE ROUND((wins::numeric / games_played::numeric) * 100, 1)
      END AS win_rate
    FROM players
    WHERE telegram_id = $1
    `,
    [Number(telegramId)]
  );

  return result.rows[0] || null;
}

async function getLeaderboard(limit = 20) {
  const result = await query(
    `
    SELECT
      telegram_id,
      username,
      first_name,
      total_score,
      best_score,
      games_played,
      wins,
      losses
    FROM players
    ORDER BY total_score DESC, wins DESC, best_score DESC
    LIMIT $1
    `,
    [Math.min(Math.max(Number(limit) || 20, 1), 100)]
  );

  return result.rows;
}

async function saveGame(game) {
  if (!pool) return;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const gameResult = await client.query(
      `
      INSERT INTO games (
        room_code,
        winner_telegram_id,
        started_at,
        finished_at
      )
      VALUES ($1, $2, $3, $4)
      RETURNING id
      `,
      [
        game.roomCode,
        game.winnerTelegramId || null,
        game.startedAt,
        game.finishedAt
      ]
    );

    const gameId = gameResult.rows[0].id;

    for (const player of game.players) {
      await client.query(
        `
        INSERT INTO game_players (
          game_id,
          telegram_id,
          score,
          taps,
          position,
          won
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [
          gameId,
          player.telegramId,
          player.score,
          player.taps,
          player.position,
          player.won
        ]
      );

      const current = await client.query(
        `
        SELECT
          games_played,
          wins,
          losses,
          total_score,
          best_score,
          best_taps,
          current_win_streak,
          best_win_streak
        FROM players
        WHERE telegram_id = $1
        FOR UPDATE
        `,
        [player.telegramId]
      );

      if (!current.rows[0]) continue;

      const p = current.rows[0];

      const gamesPlayed = Number(p.games_played) + 1;
      const wins = Number(p.wins) + (player.won ? 1 : 0);
      const losses = Number(p.losses) + (player.won ? 0 : 1);

      const totalScore =
        Number(p.total_score) + Number(player.score);

      const bestScore = Math.max(
        Number(p.best_score),
        Number(player.score)
      );

      const bestTaps = Math.max(
        Number(p.best_taps),
        Number(player.taps)
      );

      const currentWinStreak = player.won
        ? Number(p.current_win_streak) + 1
        : 0;

      const bestWinStreak = Math.max(
        Number(p.best_win_streak),
        currentWinStreak
      );

      await client.query(
        `
        UPDATE players
        SET
          games_played = $1,
          wins = $2,
          losses = $3,
          total_score = $4,
          best_score = $5,
          best_taps = $6,
          current_win_streak = $7,
          best_win_streak = $8,
          updated_at = NOW()
        WHERE telegram_id = $9
        `,
        [
          gamesPlayed,
          wins,
          losses,
          totalScore,
          bestScore,
          bestTaps,
          currentWinStreak,
          bestWinStreak,
          player.telegramId
        ]
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  hasDatabase,
  query,
  getOrCreatePlayer,
  getPlayerStats,
  getLeaderboard,
  saveGame
};
