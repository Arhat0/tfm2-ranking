-- Teamfight Manager 2 1v1 Ranking System - Database Schema (PostgreSQL)

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    game_id VARCHAR(100) UNIQUE NOT NULL,
    avatar VARCHAR(255),
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS player_profiles (
    user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    rank_score INT DEFAULT 1200,
    wins INT DEFAULT 0,
    losses INT DEFAULT 0,
    win_streak INT DEFAULT 0,
    best_streak INT DEFAULT 0,
    tier VARCHAR(20) DEFAULT 'Bronze',
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS matches (
    id SERIAL PRIMARY KEY,
    player1_id INT REFERENCES users(id),
    player2_id INT REFERENCES users(id),
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    room_password VARCHAR(20),
    result JSONB,
    reported_by INT REFERENCES users(id),
    winner_id INT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    started_at TIMESTAMP,
    reported_at TIMESTAMP,
    finished_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rank_history (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    match_id INT REFERENCES matches(id),
    score_before INT,
    score_after INT,
    change INT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS disputes (
    id SERIAL PRIMARY KEY,
    match_id INT REFERENCES matches(id) ON DELETE CASCADE,
    raised_by INT REFERENCES users(id),
    reason TEXT,
    status VARCHAR(20) DEFAULT 'open',
    admin_note TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    resolved_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_player1 ON matches(player1_id);
CREATE INDEX IF NOT EXISTS idx_matches_player2 ON matches(player2_id);
CREATE INDEX IF NOT EXISTS idx_rank_history_user ON rank_history(user_id);
CREATE INDEX IF NOT EXISTS idx_player_profiles_score ON player_profiles(rank_score DESC);
