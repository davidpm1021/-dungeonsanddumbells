// Clear all user data for fresh start
const pool = require('./src/config/database');

async function clearDatabase() {
  const client = await pool.connect();
  try {
    console.log('Clearing all user data...\n');

    // Disable foreign key checks temporarily and truncate
    await client.query(`
      TRUNCATE
        users,
        characters,
        quests,
        goals,
        goal_completions,
        narrative_events,
        memory_hierarchy,
        analytics_events
      CASCADE;
    `);

    console.log('✅ Cleared: users, characters, quests, goals, goal_completions');
    console.log('✅ Cleared: narrative_events, memory_hierarchy, analytics_events');

    // Check if health tables exist before truncating
    const healthTablesExist = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'health_activities'
      );
    `);

    if (healthTablesExist.rows[0].exists) {
      await client.query(`
        TRUNCATE health_activities, health_streaks CASCADE;
      `);
      console.log('✅ Cleared: health_activities, health_streaks');
    }

    // Check if character_health_conditions exists
    const healthConditionsExist = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'character_health_conditions'
      );
    `);

    if (healthConditionsExist.rows[0].exists) {
      await client.query(`TRUNCATE character_health_conditions CASCADE;`);
      console.log('✅ Cleared: character_health_conditions');
    }

    console.log('\n🎉 Database cleared! Ready for fresh start.');

  } catch (error) {
    console.error('❌ Error clearing database:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

clearDatabase();
