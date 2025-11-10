-- Migration 001: Create users and characters tables

-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for faster lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);

-- Characters table
CREATE TABLE characters (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  class VARCHAR(20) NOT NULL CHECK (class IN ('Fighter', 'Mage', 'Rogue')),
  level INTEGER DEFAULT 1,
  gold INTEGER DEFAULT 0,

  -- Stat XP tracking (base stat is 10, each point costs increasing XP)
  str_xp INTEGER DEFAULT 0,
  dex_xp INTEGER DEFAULT 0,
  con_xp INTEGER DEFAULT 0,
  int_xp INTEGER DEFAULT 0,
  wis_xp INTEGER DEFAULT 0,
  cha_xp INTEGER DEFAULT 0,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  CONSTRAINT positive_xp CHECK (
    str_xp >= 0 AND dex_xp >= 0 AND con_xp >= 0 AND
    int_xp >= 0 AND wis_xp >= 0 AND cha_xp >= 0
  ),
  CONSTRAINT positive_gold CHECK (gold >= 0),
  CONSTRAINT positive_level CHECK (level >= 1)
);

-- Index for faster user lookups
CREATE INDEX idx_characters_user_id ON characters(user_id);

-- Function to calculate stat value from XP
-- XP costs: 100, 120, 140, 160, 180, 200 (capped at 200)
-- Returns: 10 (base) + earned stat points
CREATE OR REPLACE FUNCTION calculate_stat(xp INTEGER)
RETURNS INTEGER AS $$
DECLARE
  stat_points INTEGER := 0;
  remaining_xp INTEGER := xp;
  cost INTEGER := 100;
BEGIN
  WHILE remaining_xp >= cost LOOP
    remaining_xp := remaining_xp - cost;
    stat_points := stat_points + 1;

    -- Increase cost (100, 120, 140, 160, 180, 200 cap)
    IF cost < 200 THEN
      cost := cost + 20;
    END IF;
  END LOOP;

  RETURN 10 + stat_points; -- Base 10 + earned points
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- View for character stats (computed from XP)
-- This makes it easy to query characters with their actual stat values
CREATE VIEW character_stats AS
SELECT
  id,
  user_id,
  name,
  class,
  level,
  gold,
  calculate_stat(str_xp) as str,
  calculate_stat(dex_xp) as dex,
  calculate_stat(con_xp) as con,
  calculate_stat(int_xp) as int,
  calculate_stat(wis_xp) as wis,
  calculate_stat(cha_xp) as cha,
  str_xp,
  dex_xp,
  con_xp,
  int_xp,
  wis_xp,
  cha_xp,
  created_at,
  last_active
FROM characters;

-- Comments for documentation
COMMENT ON TABLE users IS 'Application users';
COMMENT ON TABLE characters IS 'Player characters (one per user)';
COMMENT ON FUNCTION calculate_stat IS 'Converts XP to stat value (10 base + points)';
COMMENT ON VIEW character_stats IS 'Characters with computed stat values';
