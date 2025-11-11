/**
 * Test script to fetch quest data and check objectives
 */

const pool = require('./backend/src/config/database');

async function checkQuestData() {
  try {
    // Get latest quest
    const questResult = await pool.query(
      'SELECT * FROM quests ORDER BY id DESC LIMIT 1'
    );

    if (questResult.rows.length === 0) {
      console.log('No quests found');
      return;
    }

    const quest = questResult.rows[0];
    console.log('\n=== Quest Data ===');
    console.log('ID:', quest.id);
    console.log('Title:', quest.title);
    console.log('Status:', quest.status);
    console.log('XP Reward:', quest.xp_reward);
    console.log('Gold Reward:', quest.gold_reward);
    console.log('Description:', quest.description?.substring(0, 100) + '...');

    // Get objectives
    const objResult = await pool.query(
      'SELECT * FROM quest_objectives WHERE quest_id = $1',
      [quest.id]
    );

    console.log('\n=== Quest Objectives ===');
    console.log('Total objectives:', objResult.rows.length);
    objResult.rows.forEach((obj, idx) => {
      console.log(`\nObjective ${idx + 1}:`);
      console.log('  ID:', obj.id);
      console.log('  Description:', obj.description);
      console.log('  XP Reward:', obj.xp_reward);
      console.log('  Stat Reward:', obj.stat_reward);
      console.log('  Completed:', obj.completed);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkQuestData();
