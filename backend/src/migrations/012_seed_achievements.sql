-- Migration 012: Seed Default Health Achievements
-- Provides starter achievements for the gamification system

-- Clear existing achievements (for idempotent migration)
DELETE FROM health_achievements WHERE achievement_key LIKE 'seed_%' OR achievement_key IN (
  'first_activity', 'first_workout', 'first_meditation', 'first_learning',
  'streak_3', 'streak_7', 'streak_14', 'streak_30', 'streak_100',
  'milestone_10', 'milestone_50', 'milestone_100', 'milestone_500', 'milestone_1000',
  'early_bird', 'night_owl', 'variety_hero', 'consistency_champion', 'marathon_mind',
  'iron_will', 'zen_master', 'scholar_supreme', 'social_butterfly', 'iron_legend'
);

-- ============================================================================
-- COMMON ACHIEVEMENTS (Easy to unlock, introduce the system)
-- ============================================================================

INSERT INTO health_achievements (achievement_key, title, description, requirement_type, requirement_value, activity_type, myth_points, xp_reward, title_unlocked, rarity) VALUES
-- First Activity Achievements
('first_activity', 'First Steps', 'Complete your first health activity of any type', 'milestone', 1, NULL, 1, 25, 'Initiate', 'common'),
('first_workout', 'Iron Initiate', 'Complete your first strength training activity', 'milestone', 1, 'strength', 1, 25, NULL, 'common'),
('first_meditation', 'Inner Peace Begins', 'Complete your first meditation session', 'milestone', 1, 'meditation', 1, 25, NULL, 'common'),
('first_learning', 'The First Page', 'Complete your first learning activity', 'milestone', 1, 'learning', 1, 25, NULL, 'common'),

-- Early Streaks
('streak_3', 'Getting Started', 'Maintain a 3-day activity streak', 'streak', 3, NULL, 2, 50, NULL, 'common'),
('streak_7', 'Week Warrior', 'Maintain a 7-day activity streak', 'streak', 7, NULL, 5, 100, 'Dedicated', 'common');

-- ============================================================================
-- RARE ACHIEVEMENTS (Moderate effort required)
-- ============================================================================

INSERT INTO health_achievements (achievement_key, title, description, requirement_type, requirement_value, activity_type, myth_points, xp_reward, title_unlocked, rarity) VALUES
-- Extended Streaks
('streak_14', 'Fortnight of Focus', 'Maintain a 14-day activity streak', 'streak', 14, NULL, 10, 200, 'Focused', 'rare'),
('streak_30', 'Month of Mastery', 'Maintain a 30-day activity streak', 'streak', 30, NULL, 25, 500, 'Master', 'rare'),

-- Milestones
('milestone_10', 'Double Digits', 'Complete 10 health activities', 'milestone', 10, NULL, 3, 75, NULL, 'rare'),
('milestone_50', 'Half Century', 'Complete 50 health activities', 'milestone', 50, NULL, 10, 200, 'Seasoned', 'rare'),
('milestone_100', 'Centurion', 'Complete 100 health activities', 'milestone', 100, NULL, 20, 400, 'Centurion', 'rare'),

-- Variety
('variety_hero', 'Jack of All Trades', 'Complete activities in 5 different categories', 'consistency', 5, NULL, 10, 150, 'Versatile', 'rare'),

-- Early Bird / Night Owl (special conditions)
('early_bird', 'Dawn Warrior', 'Complete 10 activities before 7 AM', 'milestone', 10, NULL, 8, 150, 'Early Riser', 'rare'),
('night_owl', 'Midnight Scholar', 'Complete 10 activities after 9 PM', 'milestone', 10, NULL, 8, 150, 'Night Owl', 'rare');

-- ============================================================================
-- EPIC ACHIEVEMENTS (Significant commitment)
-- ============================================================================

INSERT INTO health_achievements (achievement_key, title, description, requirement_type, requirement_value, activity_type, myth_points, xp_reward, title_unlocked, rarity) VALUES
-- Long Streaks
('streak_100', 'Century of Commitment', 'Maintain a 100-day activity streak', 'streak', 100, NULL, 100, 2000, 'Legendary', 'epic'),

-- High Milestones
('milestone_500', 'Half Thousand', 'Complete 500 health activities', 'milestone', 500, NULL, 50, 1000, 'Champion', 'epic'),

-- Consistency
('consistency_champion', 'Consistency Champion', 'Complete at least one activity every day for 60 days', 'consistency', 60, NULL, 75, 1500, 'Unwavering', 'epic'),

-- Specialized Mastery
('iron_will', 'Iron Will', 'Complete 100 strength training activities', 'milestone', 100, 'strength', 40, 800, 'Iron', 'epic'),
('zen_master', 'Zen Master', 'Complete 100 meditation sessions', 'milestone', 100, 'meditation', 40, 800, 'Enlightened', 'epic'),
('scholar_supreme', 'Scholar Supreme', 'Complete 100 learning activities', 'milestone', 100, 'learning', 40, 800, 'Scholar', 'epic'),
('marathon_mind', 'Marathon Mind', 'Complete 100 cardio activities', 'milestone', 100, 'cardio', 40, 800, 'Enduring', 'epic'),
('social_butterfly', 'Party Leader', 'Complete 50 social/group activities', 'milestone', 50, 'social', 35, 700, 'Inspiring', 'epic');

-- ============================================================================
-- LEGENDARY ACHIEVEMENTS (Exceptional dedication)
-- ============================================================================

INSERT INTO health_achievements (achievement_key, title, description, requirement_type, requirement_value, activity_type, myth_points, xp_reward, title_unlocked, cosmetic_unlocks, rarity) VALUES
-- Ultimate Milestones
('milestone_1000', 'Thousand Acts', 'Complete 1000 health activities', 'milestone', 1000, NULL, 200, 5000, 'Mythic', '{"avatar_frame": "golden_laurel", "title_color": "gold"}', 'legendary'),

-- Year-long Streak
('streak_365', 'Year of Transformation', 'Maintain a 365-day activity streak', 'streak', 365, NULL, 500, 10000, 'Immortal', '{"avatar_frame": "celestial", "title_effect": "glow", "special_emote": "phoenix"}', 'legendary'),

-- True Mastery
('iron_legend', 'Living Legend', 'Earn all epic achievements', 'milestone', 8, NULL, 300, 7500, 'Living Legend', '{"avatar_frame": "prismatic", "profile_background": "constellation"}', 'legendary'),

-- Ultimate Wellness
('wellness_avatar', 'Avatar of Wellness', 'Reach level 50 on any stat through health activities', 'quantity', 50, NULL, 250, 6000, 'Avatar', '{"character_aura": "radiant", "special_mount": "wellness_phoenix"}', 'legendary'),

-- Total Dedication
('total_hours_500', 'Time Lord', 'Log 500 total hours of health activities', 'quantity', 30000, NULL, 400, 8000, 'Timeless', '{"time_effect": "clock_halo"}', 'legendary');

-- ============================================================================
-- END OF MIGRATION 012
-- ============================================================================
