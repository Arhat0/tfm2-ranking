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
    is_public BOOLEAN DEFAULT FALSE,
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

-- ===== 英雄 BP 统计 =====

CREATE TABLE IF NOT EXISTS heroes (
    id SERIAL PRIMARY KEY,
    key VARCHAR(50) UNIQUE NOT NULL,
    name_en VARCHAR(100) NOT NULL,
    name_zh VARCHAR(100),
    category VARCHAR(20) DEFAULT 'Melee'
);

CREATE TABLE IF NOT EXISTS match_hero_entries (
    id SERIAL PRIMARY KEY,
    match_id INT REFERENCES matches(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    hero_id INT REFERENCES heroes(id),
    action VARCHAR(10) NOT NULL CHECK (action IN ('ban', 'pick')),
    damage_dealt INT DEFAULT 0,
    damage_taken INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hero_entries_match ON match_hero_entries(match_id);
CREATE INDEX IF NOT EXISTS idx_hero_entries_user ON match_hero_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_hero_entries_hero ON match_hero_entries(hero_id);

-- ===== 锦标赛（瑞士轮） =====

CREATE TABLE IF NOT EXISTS tournaments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    format VARCHAR(20) DEFAULT 'swiss',
    status VARCHAR(20) DEFAULT 'registration',
    max_rounds INT DEFAULT 5,
    current_round INT DEFAULT 0,
    settings JSONB DEFAULT '{}',
    created_by INT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    started_at TIMESTAMP,
    finished_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tournament_participants (
    tournament_id INT REFERENCES tournaments(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    seed INT,
    points INT DEFAULT 0,
    wins INT DEFAULT 0,
    losses INT DEFAULT 0,
    byes INT DEFAULT 0,
    buchholz INT DEFAULT 0,
    group_number INT DEFAULT 0,
    eliminated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (tournament_id, user_id)
);

CREATE TABLE IF NOT EXISTS tournament_matches (
    id SERIAL PRIMARY KEY,
    tournament_id INT REFERENCES tournaments(id) ON DELETE CASCADE,
    round_number INT NOT NULL,
    bracket VARCHAR(10) DEFAULT 'main',
    player1_id INT REFERENCES users(id),
    player2_id INT REFERENCES users(id),
    score VARCHAR(20),
    winner_id INT REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'pending',
    reported_by INT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    finished_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tournament_status ON tournaments(status);
CREATE INDEX IF NOT EXISTS idx_tmatch_tournament ON tournament_matches(tournament_id, round_number);
CREATE INDEX IF NOT EXISTS idx_tmatch_player1 ON tournament_matches(player1_id);
CREATE INDEX IF NOT EXISTS idx_tmatch_player2 ON tournament_matches(player2_id);
