const healthDataAggregator = require('./healthDataAggregator');
const healthConditionService = require('./healthConditionService');
const healthActivityService = require('./healthActivityService');

/**
 * Health Context Provider
 * Formats health data for inclusion in AI narrative prompts.
 * Provides rich context about player's real-world health state
 * to make narratives more meaningful and personalized.
 */
class HealthContextProvider {

  /**
   * Get comprehensive health context for narrative generation
   * @param {number} userId - User ID
   * @param {number} characterId - Character ID
   * @returns {Promise<Object>} Health context for prompts
   */
  async getHealthContext(userId, characterId) {
    const today = new Date();

    // Gather all health data in parallel
    const [
      dailyData,
      weeklyAverages,
      conditions,
      streaks,
      recentActivities
    ] = await Promise.all([
      healthDataAggregator.getDailyData(userId, today),
      healthDataAggregator.getWeeklyAverages(userId),
      characterId ? healthConditionService.getConditionSummary(characterId) : null,
      healthActivityService.getStreaks(userId),
      healthActivityService.getActivityHistory(userId, { limit: 5 })
    ]);

    return {
      // Current day's health state
      today: this.formatTodayContext(dailyData),

      // Weekly patterns
      weekly: this.formatWeeklyContext(weeklyAverages),

      // Active game conditions (buffs/debuffs)
      conditions: conditions ? this.formatConditionsContext(conditions) : null,

      // Current streaks
      streaks: this.formatStreaksContext(streaks),

      // Recent activities for narrative continuity
      recentActivities: this.formatRecentActivities(recentActivities),

      // Generate narrative hints based on health state
      narrativeHints: this.generateNarrativeHints(dailyData, conditions, streaks)
    };
  }

  /**
   * Format today's health data for narrative context
   * @param {Object} dailyData - Daily health data
   * @returns {Object} Formatted context
   */
  formatTodayContext(dailyData) {
    if (!dailyData) {
      return {
        hasData: false,
        summary: 'No health data synced today'
      };
    }

    const sleepHours = dailyData.sleep_duration_minutes
      ? (dailyData.sleep_duration_minutes / 60).toFixed(1)
      : null;

    return {
      hasData: true,
      sleep: {
        hours: sleepHours,
        quality: dailyData.sleep_quality_score
          ? this.describeScore(dailyData.sleep_quality_score, ['poor', 'fair', 'good', 'excellent'])
          : null,
        deepMinutes: dailyData.sleep_deep_minutes
      },
      activity: {
        steps: dailyData.steps,
        activeMinutes: dailyData.active_minutes,
        workouts: dailyData.workout_count
      },
      vitals: {
        restingHeartRate: dailyData.resting_heart_rate,
        hrv: dailyData.hrv_avg,
        recovery: dailyData.recovery_score
          ? this.describeScore(dailyData.recovery_score, ['low', 'moderate', 'high', 'peak'])
          : null
      },
      summary: this.generateDaySummary(dailyData)
    };
  }

  /**
   * Format weekly health context
   * @param {Object} weeklyAverages - Weekly average data
   * @returns {Object} Formatted context
   */
  formatWeeklyContext(weeklyAverages) {
    if (!weeklyAverages || weeklyAverages.days_tracked === 0) {
      return {
        hasData: false,
        summary: 'Insufficient weekly data'
      };
    }

    return {
      hasData: true,
      daysTracked: parseInt(weeklyAverages.days_tracked),
      averageSleepHours: weeklyAverages.avg_sleep_minutes
        ? (parseFloat(weeklyAverages.avg_sleep_minutes) / 60).toFixed(1)
        : null,
      averageSteps: Math.round(parseFloat(weeklyAverages.avg_steps) || 0),
      totalWorkouts: parseInt(weeklyAverages.total_workouts) || 0,
      totalMeditationMinutes: parseInt(weeklyAverages.total_meditation_minutes) || 0,
      averageRecovery: weeklyAverages.avg_recovery
        ? this.describeScore(parseFloat(weeklyAverages.avg_recovery), ['struggling', 'recovering', 'strong', 'thriving'])
        : null,
      consistency: this.describeConsistency(parseInt(weeklyAverages.days_tracked))
    };
  }

  /**
   * Format game conditions for narrative context
   * @param {Object} conditions - Condition summary
   * @returns {Object} Formatted context
   */
  formatConditionsContext(conditions) {
    const buffs = (conditions.buffs || []).map(b => ({
      name: b.condition_name,
      source: b.source,
      description: b.description,
      statModifiers: b.stat_modifiers
    }));

    const debuffs = (conditions.debuffs || []).map(d => ({
      name: d.condition_name,
      source: d.source,
      description: d.description,
      statModifiers: d.stat_modifiers
    }));

    return {
      buffs,
      debuffs,
      totalStatModifiers: conditions.statModifiers,
      narrativeState: this.describeConditionState(buffs, debuffs)
    };
  }

  /**
   * Format streaks for narrative context
   * @param {Array} streaks - Active streaks
   * @returns {Object} Formatted context
   */
  formatStreaksContext(streaks) {
    if (!streaks || streaks.length === 0) {
      return {
        hasStreaks: false,
        summary: 'No active streaks'
      };
    }

    const formatted = streaks.map(s => ({
      type: s.activity_type,
      days: s.current_streak,
      level: s.current_level,
      isStrong: s.current_streak >= 7
    }));

    const strongStreaks = formatted.filter(s => s.isStrong);

    return {
      hasStreaks: true,
      streaks: formatted,
      strongestStreak: formatted.reduce((max, s) => s.days > max.days ? s : max, formatted[0]),
      summary: strongStreaks.length > 0
        ? `Maintaining ${strongStreaks.length} strong streak(s)`
        : 'Building consistency'
    };
  }

  /**
   * Format recent activities for narrative continuity
   * @param {Array} activities - Recent activities
   * @returns {Array} Formatted activities
   */
  formatRecentActivities(activities) {
    return (activities || []).map(a => ({
      type: a.activity_type,
      title: a.title,
      duration: a.duration_minutes,
      intensity: a.intensity,
      daysAgo: this.daysAgo(new Date(a.completed_at))
    }));
  }

  /**
   * Generate narrative hints based on health state
   * These hints guide the DM to reference health in meaningful ways
   * @param {Object} dailyData - Today's health data
   * @param {Object} conditions - Active conditions
   * @param {Array} streaks - Active streaks
   * @returns {Array} Narrative hints
   */
  generateNarrativeHints(dailyData, conditions, streaks) {
    const hints = [];

    // Sleep-based hints
    if (dailyData?.sleep_duration_minutes) {
      const sleepHours = dailyData.sleep_duration_minutes / 60;
      if (sleepHours >= 8) {
        hints.push({
          type: 'positive',
          category: 'sleep',
          hint: 'Character feels sharp and alert - describe clear thinking, quick reflexes',
          intensity: 'strong'
        });
      } else if (sleepHours < 6) {
        hints.push({
          type: 'negative',
          category: 'sleep',
          hint: 'Character is fatigued - describe heaviness, slower reactions, occasional yawning',
          intensity: 'moderate'
        });
      }
    }

    // Recovery-based hints
    if (dailyData?.recovery_score) {
      if (dailyData.recovery_score >= 0.85) {
        hints.push({
          type: 'positive',
          category: 'recovery',
          hint: 'Character is at peak readiness - describe vigor, confidence, eagerness for challenge',
          intensity: 'strong'
        });
      } else if (dailyData.recovery_score < 0.5) {
        hints.push({
          type: 'negative',
          category: 'recovery',
          hint: 'Character\'s body needs rest - describe muscle soreness, careful movements',
          intensity: 'moderate'
        });
      }
    }

    // Activity-based hints
    if (dailyData?.steps >= 10000) {
      hints.push({
        type: 'positive',
        category: 'activity',
        hint: 'Character is well-exercised today - describe ease of movement, physical confidence',
        intensity: 'moderate'
      });
    }

    // Streak-based hints
    const strongStreaks = (streaks || []).filter(s => s.current_streak >= 7);
    if (strongStreaks.length > 0) {
      hints.push({
        type: 'positive',
        category: 'consistency',
        hint: `Character's dedication shows - reference ${strongStreaks.length} week(s) of consistent training`,
        intensity: 'strong'
      });
    }

    // Condition-based hints
    if (conditions?.buffs?.length > 0) {
      hints.push({
        type: 'positive',
        category: 'buffs',
        hint: `Active buffs: ${conditions.buffs.map(b => b.condition_name).join(', ')} - weave into descriptions`,
        intensity: 'moderate'
      });
    }

    if (conditions?.debuffs?.length > 0) {
      hints.push({
        type: 'negative',
        category: 'debuffs',
        hint: `Active debuffs: ${conditions.debuffs.map(d => d.condition_name).join(', ')} - subtly reference in narrative`,
        intensity: 'moderate'
      });
    }

    return hints;
  }

  /**
   * Generate XML context block for AI prompts
   * @param {number} userId - User ID
   * @param {number} characterId - Character ID
   * @returns {Promise<string>} XML-formatted health context
   */
  async getHealthContextXML(userId, characterId) {
    const context = await this.getHealthContext(userId, characterId);

    let xml = '<health_context>\n';

    // Today's state
    if (context.today.hasData) {
      xml += '  <today>\n';
      xml += `    <summary>${context.today.summary}</summary>\n`;
      if (context.today.sleep.hours) {
        xml += `    <sleep_hours>${context.today.sleep.hours}</sleep_hours>\n`;
        xml += `    <sleep_quality>${context.today.sleep.quality || 'unknown'}</sleep_quality>\n`;
      }
      if (context.today.activity.steps) {
        xml += `    <steps>${context.today.activity.steps}</steps>\n`;
      }
      if (context.today.vitals.recovery) {
        xml += `    <recovery>${context.today.vitals.recovery}</recovery>\n`;
      }
      xml += '  </today>\n';
    }

    // Weekly patterns
    if (context.weekly.hasData) {
      xml += '  <weekly>\n';
      xml += `    <consistency>${context.weekly.consistency}</consistency>\n`;
      xml += `    <total_workouts>${context.weekly.totalWorkouts}</total_workouts>\n`;
      if (context.weekly.averageRecovery) {
        xml += `    <average_recovery>${context.weekly.averageRecovery}</average_recovery>\n`;
      }
      xml += '  </weekly>\n';
    }

    // Active conditions
    if (context.conditions) {
      xml += '  <game_conditions>\n';
      if (context.conditions.buffs.length > 0) {
        xml += '    <buffs>\n';
        context.conditions.buffs.forEach(b => {
          xml += `      <buff name="${b.name}">${b.description}</buff>\n`;
        });
        xml += '    </buffs>\n';
      }
      if (context.conditions.debuffs.length > 0) {
        xml += '    <debuffs>\n';
        context.conditions.debuffs.forEach(d => {
          xml += `      <debuff name="${d.name}">${d.description}</debuff>\n`;
        });
        xml += '    </debuffs>\n';
      }
      xml += '  </game_conditions>\n';
    }

    // Narrative hints
    if (context.narrativeHints.length > 0) {
      xml += '  <narrative_hints>\n';
      context.narrativeHints.forEach(hint => {
        xml += `    <hint type="${hint.type}" category="${hint.category}">${hint.hint}</hint>\n`;
      });
      xml += '  </narrative_hints>\n';
    }

    xml += '</health_context>';

    return xml;
  }

  // ==========================================
  // Helper methods
  // ==========================================

  describeScore(score, labels) {
    if (score >= 0.85) return labels[3];
    if (score >= 0.70) return labels[2];
    if (score >= 0.50) return labels[1];
    return labels[0];
  }

  describeConsistency(daysTracked) {
    if (daysTracked >= 6) return 'excellent';
    if (daysTracked >= 4) return 'good';
    if (daysTracked >= 2) return 'building';
    return 'starting';
  }

  describeConditionState(buffs, debuffs) {
    if (buffs.length > debuffs.length) return 'empowered';
    if (debuffs.length > buffs.length) return 'challenged';
    if (buffs.length > 0) return 'balanced';
    return 'neutral';
  }

  generateDaySummary(dailyData) {
    const parts = [];

    if (dailyData.sleep_duration_minutes) {
      const hours = (dailyData.sleep_duration_minutes / 60).toFixed(1);
      parts.push(`${hours}h sleep`);
    }

    if (dailyData.steps) {
      parts.push(`${dailyData.steps.toLocaleString()} steps`);
    }

    if (dailyData.workout_count) {
      parts.push(`${dailyData.workout_count} workout(s)`);
    }

    if (dailyData.recovery_score) {
      const recovery = Math.round(dailyData.recovery_score * 100);
      parts.push(`${recovery}% recovery`);
    }

    return parts.length > 0 ? parts.join(', ') : 'Awaiting data';
  }

  daysAgo(date) {
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }
}

module.exports = new HealthContextProvider();
