/**
 * Achievement Service
 * Manages health achievements, user unlocks, and myth points
 */

const pool = require('../config/database');

/**
 * Get all available achievements
 */
async function getAllAchievements() {
  const result = await pool.query(`
    SELECT
      id,
      achievement_key AS "achievementKey",
      title,
      description,
      requirement_type AS "requirementType",
      requirement_value AS "requirementValue",
      activity_type AS "activityType",
      myth_points AS "mythPoints",
      xp_reward AS "xpReward",
      title_unlocked AS "titleUnlocked",
      cosmetic_unlocks AS "cosmeticUnlocks",
      rarity,
      created_at AS "createdAt"
    FROM health_achievements
    ORDER BY
      CASE rarity
        WHEN 'legendary' THEN 1
        WHEN 'epic' THEN 2
        WHEN 'rare' THEN 3
        ELSE 4
      END,
      id
  `);

  return result.rows;
}

/**
 * Get achievements unlocked by a user
 */
async function getUserAchievements(userId) {
  const result = await pool.query(`
    SELECT
      ua.id,
      ua.user_id AS "userId",
      ua.character_id AS "characterId",
      ua.achievement_id AS "achievementId",
      ua.earned_at AS "earnedAt",
      ua.progress_snapshot AS "progressSnapshot",
      ha.achievement_key AS "achievementKey",
      ha.title,
      ha.description,
      ha.rarity,
      ha.myth_points AS "mythPoints",
      ha.xp_reward AS "xpReward",
      ha.title_unlocked AS "titleUnlocked"
    FROM user_health_achievements ua
    JOIN health_achievements ha ON ua.achievement_id = ha.id
    WHERE ua.user_id = $1
    ORDER BY ua.earned_at DESC
  `, [userId]);

  return result.rows;
}

/**
 * Calculate total myth points for a user
 */
async function getMythPoints(userId) {
  const result = await pool.query(`
    SELECT COALESCE(SUM(ha.myth_points), 0) AS total
    FROM user_health_achievements ua
    JOIN health_achievements ha ON ua.achievement_id = ha.id
    WHERE ua.user_id = $1
  `, [userId]);

  return parseInt(result.rows[0]?.total || 0);
}

/**
 * Check if user has unlocked a specific achievement
 */
async function hasAchievement(userId, achievementKey) {
  const result = await pool.query(`
    SELECT ua.id
    FROM user_health_achievements ua
    JOIN health_achievements ha ON ua.achievement_id = ha.id
    WHERE ua.user_id = $1 AND ha.achievement_key = $2
  `, [userId, achievementKey]);

  return result.rows.length > 0;
}

/**
 * Unlock an achievement for a user
 */
async function unlockAchievement(userId, achievementKey, characterId = null, progressSnapshot = null) {
  // Get the achievement
  const achResult = await pool.query(`
    SELECT id, title, description, myth_points, xp_reward, rarity, title_unlocked
    FROM health_achievements
    WHERE achievement_key = $1
  `, [achievementKey]);

  if (achResult.rows.length === 0) {
    throw new Error(`Achievement not found: ${achievementKey}`);
  }

  const achievement = achResult.rows[0];

  // Check if already unlocked
  const existing = await pool.query(`
    SELECT id FROM user_health_achievements
    WHERE user_id = $1 AND achievement_id = $2
  `, [userId, achievement.id]);

  if (existing.rows.length > 0) {
    return { alreadyUnlocked: true, achievement };
  }

  // Unlock the achievement
  await pool.query(`
    INSERT INTO user_health_achievements (user_id, character_id, achievement_id, progress_snapshot)
    VALUES ($1, $2, $3, $4)
  `, [userId, characterId, achievement.id, progressSnapshot ? JSON.stringify(progressSnapshot) : null]);

  return {
    alreadyUnlocked: false,
    achievement: {
      id: achievement.id,
      title: achievement.title,
      description: achievement.description,
      mythPoints: achievement.myth_points,
      xpReward: achievement.xp_reward,
      rarity: achievement.rarity,
      titleUnlocked: achievement.title_unlocked,
    }
  };
}

/**
 * Check and unlock achievements based on user progress
 * Call this after activities, streaks, etc.
 */
async function checkAndUnlockAchievements(userId, characterId, context = {}) {
  const unlockedAchievements = [];

  // Get all achievements the user hasn't unlocked yet
  const result = await pool.query(`
    SELECT ha.*
    FROM health_achievements ha
    LEFT JOIN user_health_achievements ua ON ha.id = ua.achievement_id AND ua.user_id = $1
    WHERE ua.id IS NULL
  `, [userId]);

  const lockedAchievements = result.rows;

  for (const achievement of lockedAchievements) {
    let shouldUnlock = false;
    let progressSnapshot = {};

    switch (achievement.requirement_type) {
      case 'streak': {
        // Check if user has a streak of required length
        const streakResult = await pool.query(`
          SELECT MAX(current_streak) as max_streak
          FROM health_streaks
          WHERE user_id = $1
          ${achievement.activity_type ? `AND activity_type = '${achievement.activity_type}'` : ''}
        `, [userId]);

        const maxStreak = streakResult.rows[0]?.max_streak || 0;
        if (maxStreak >= achievement.requirement_value) {
          shouldUnlock = true;
          progressSnapshot = { streakLength: maxStreak };
        }
        break;
      }

      case 'milestone': {
        // Check total count of activities
        const countResult = await pool.query(`
          SELECT COUNT(*) as total
          FROM health_activities
          WHERE user_id = $1 AND success = true
          ${achievement.activity_type ? `AND activity_type = '${achievement.activity_type}'` : ''}
        `, [userId]);

        const total = parseInt(countResult.rows[0]?.total || 0);
        if (total >= achievement.requirement_value) {
          shouldUnlock = true;
          progressSnapshot = { totalCount: total };
        }
        break;
      }

      case 'quantity': {
        // Check total quantity (e.g., total steps, miles)
        const quantityResult = await pool.query(`
          SELECT SUM(quantity_value) as total
          FROM health_activities
          WHERE user_id = $1 AND success = true AND quantity_value IS NOT NULL
          ${achievement.activity_type ? `AND activity_type = '${achievement.activity_type}'` : ''}
        `, [userId]);

        const total = parseFloat(quantityResult.rows[0]?.total || 0);
        if (total >= achievement.requirement_value) {
          shouldUnlock = true;
          progressSnapshot = { totalQuantity: total };
        }
        break;
      }

      case 'consistency': {
        // Check for consistent activity over time (e.g., 30 days with at least 1 activity)
        const consistencyResult = await pool.query(`
          SELECT COUNT(DISTINCT DATE(completed_at)) as active_days
          FROM health_activities
          WHERE user_id = $1
            AND success = true
            AND completed_at >= NOW() - INTERVAL '90 days'
          ${achievement.activity_type ? `AND activity_type = '${achievement.activity_type}'` : ''}
        `, [userId]);

        const activeDays = parseInt(consistencyResult.rows[0]?.active_days || 0);
        if (activeDays >= achievement.requirement_value) {
          shouldUnlock = true;
          progressSnapshot = { activeDays };
        }
        break;
      }
    }

    if (shouldUnlock) {
      const unlockResult = await unlockAchievement(userId, achievement.achievement_key, characterId, progressSnapshot);
      if (!unlockResult.alreadyUnlocked) {
        unlockedAchievements.push(unlockResult.achievement);
      }
    }
  }

  return unlockedAchievements;
}

/**
 * Get achievement progress for a user (for locked achievements)
 */
async function getAchievementProgress(userId, achievementId) {
  const achResult = await pool.query(`
    SELECT * FROM health_achievements WHERE id = $1
  `, [achievementId]);

  if (achResult.rows.length === 0) return null;

  const achievement = achResult.rows[0];
  let current = 0;

  switch (achievement.requirement_type) {
    case 'streak': {
      const result = await pool.query(`
        SELECT MAX(current_streak) as max_streak
        FROM health_streaks
        WHERE user_id = $1
        ${achievement.activity_type ? `AND activity_type = '${achievement.activity_type}'` : ''}
      `, [userId]);
      current = parseInt(result.rows[0]?.max_streak || 0);
      break;
    }

    case 'milestone': {
      const result = await pool.query(`
        SELECT COUNT(*) as total
        FROM health_activities
        WHERE user_id = $1 AND success = true
        ${achievement.activity_type ? `AND activity_type = '${achievement.activity_type}'` : ''}
      `, [userId]);
      current = parseInt(result.rows[0]?.total || 0);
      break;
    }

    case 'quantity': {
      const result = await pool.query(`
        SELECT SUM(quantity_value) as total
        FROM health_activities
        WHERE user_id = $1 AND success = true AND quantity_value IS NOT NULL
        ${achievement.activity_type ? `AND activity_type = '${achievement.activity_type}'` : ''}
      `, [userId]);
      current = parseFloat(result.rows[0]?.total || 0);
      break;
    }

    case 'consistency': {
      const result = await pool.query(`
        SELECT COUNT(DISTINCT DATE(completed_at)) as active_days
        FROM health_activities
        WHERE user_id = $1
          AND success = true
          AND completed_at >= NOW() - INTERVAL '90 days'
        ${achievement.activity_type ? `AND activity_type = '${achievement.activity_type}'` : ''}
      `, [userId]);
      current = parseInt(result.rows[0]?.active_days || 0);
      break;
    }
  }

  return {
    current,
    target: achievement.requirement_value,
    percentage: Math.min((current / achievement.requirement_value) * 100, 100),
  };
}

module.exports = {
  getAllAchievements,
  getUserAchievements,
  getMythPoints,
  hasAchievement,
  unlockAchievement,
  checkAndUnlockAchievements,
  getAchievementProgress,
};
