CREATE TABLE IF NOT EXISTS players (
    id BIGSERIAL PRIMARY KEY,
    telegram_id BIGINT UNIQUE NOT NULL,
    username TEXT,
    first_name TEXT,
    last_name TEXT,

    games_played INTEGER NOT NULL DEFAULT 0,
    wins INTEGER NOT NULL DEFAULT 0,
    losses INTEGER NOT NULL DEFAULT 0,

    total_score BIGINT NOT NULL DEFAULT 0,
    best_score INTEGER NOT NULL DEFAULT 0,
    best_taps INTEGER NOT NULL DEFAULT 0,

    current_win_streak INTEGER NOT NULL DEFAULT 0,
    best_win_streak INTEGER NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS games (
    id BIGSERIAL PRIMARY KEY,

    room_code VARCHAR(6) NOT NULL,
    winner_telegram_id BIGINT,

    started_at TIMESTAMPTZ NOT NULL,
    finished_at TIMESTAMPTZ NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS game_players (
    id BIGSERIAL PRIMARY KEY,

    game_id BIGINT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    telegram_id BIGINT NOT NULL,

    score INTEGER NOT NULL DEFAULT 0,
    taps INTEGER NOT NULL DEFAULT 0,
    position INTEGER NOT NULL,

    won BOOLEAN NOT NULL DEFAULT FALSE,

    UNIQUE(game_id, telegram_id)
);

CREATE INDEX IF NOT EXISTS idx_players_score
ON players(total_score DESC);

CREATE INDEX IF NOT EXISTS idx_players_wins
ON players(wins DESC);

CREATE INDEX IF NOT EXISTS idx_game_players_telegram
ON game_players(telegram_id);
