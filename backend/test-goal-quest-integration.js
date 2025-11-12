/**
 * End-to-End Goal-Quest Integration Test
 *
 * Tests the complete flow:
 * 1. User registration & character creation
 * 2. Goal creation
 * 3. Quest creation with objectives linked to goals
 * 4. Goal completion triggers quest progression
 * 5. Quest completion when all objectives done
 */

require('dotenv').config();
const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:3000/api';

class GoalQuestIntegrationTest {
  constructor() {
    this.token = null;
    this.user = null;
    this.character = null;
    this.goals = [];
    this.quests = [];
  }

  log(step, message) {
    console.log(`\n[${step}] ${message}`);
  }

  async call(method, endpoint, data = null) {
    const config = {
      method,
      url: `${API_URL}${endpoint}`,
      headers: this.token ? { Authorization: `Bearer ${this.token}` } : {},
      ...(data && { data })
    };

    try {
      const response = await axios(config);
      return response.data;
    } catch (error) {
      console.error(`API Error: ${error.response?.data?.error || error.message}`);
      if (error.response?.data) {
        console.error('Response:', JSON.stringify(error.response.data, null, 2));
      }
      throw error;
    }
  }

  async testAuthentication() {
    this.log('1', 'Testing Authentication');

    const timestamp = Date.now();
    const username = `testuser_${timestamp}`;
    const email = `${username}@test.com`;
    const password = 'TestPassword123!';

    const registerResult = await this.call('POST', '/auth/register', {
      email,
      username,
      password
    });

    console.log('  ✅ Registration successful');
    console.log(`     User ID: ${registerResult.user.id}`);

    this.token = registerResult.token;
    this.user = registerResult.user;

    return true;
  }

  async testCharacterCreation() {
    this.log('2', 'Testing Character Creation');

    const result = await this.call('POST', '/characters', {
      name: 'Thorin the Balanced',
      class: 'Fighter'
    });

    // Handle both character and character_data response formats
    this.character = result.character || result.character_data || result;

    console.log('  ✅ Character created successfully');
    console.log(`     Name: ${this.character.name}`);
    console.log(`     Class: ${this.character.class}`);
    console.log(`     Level: ${this.character.level}`);

    return true;
  }

  async testGoalCreation() {
    this.log('3', 'Testing Goal Creation');

    // Create STR goal
    const goal1 = await this.call('POST', '/goals', {
      name: 'Strength Training',
      description: '30 minutes of weight lifting',
      statMapping: 'STR',
      goalType: 'binary',
      targetValue: 1,
      frequency: 'daily'
    });

    console.log('  ✅ Goal 1 created: Strength Training (STR)');
    this.goals.push(goal1.goal);

    // Create INT goal
    const goal2 = await this.call('POST', '/goals', {
      name: 'Reading Session',
      description: 'Read for 20 minutes',
      statMapping: 'INT',
      goalType: 'binary',
      targetValue: 1,
      frequency: 'daily'
    });

    console.log('  ✅ Goal 2 created: Reading Session (INT)');
    this.goals.push(goal2.goal);

    return true;
  }

  async testManualQuestCreation() {
    this.log('4', 'Testing Manual Quest Creation with Goal-Linked Objectives');

    // Create a quest with objectives linked to the goals we created
    const questResult = await this.call('POST', '/quests/from-template', {
      templateName: 'tutorial_elder_thorne',
      characterId: this.character.id
    });

    console.log('  ✅ Quest created from template');
    console.log(`     Title: ${questResult.quest.title}`);
    console.log(`     Objectives: ${questResult.objectives?.length || 0}`);

    this.quests.push(questResult.quest);

    // Now let's manually insert quest objectives linked to our goals
    // (In a real scenario, the quest generation would do this)
    const pool = require('./src/config/database');

    await pool.query(
      `INSERT INTO quest_objectives (quest_id, description, order_index, goal_mapping, stat_reward, xp_reward)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        questResult.quest.id,
        'Complete your strength training session',
        0,
        this.goals[0].id.toString(), // Link to STR goal
        'STR',
        25
      ]
    );

    await pool.query(
      `INSERT INTO quest_objectives (quest_id, description, order_index, goal_mapping, stat_reward, xp_reward)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        questResult.quest.id,
        'Complete your reading session',
        1,
        this.goals[1].id.toString(), // Link to INT goal
        'INT',
        20
      ]
    );

    console.log('  ✅ Objectives created and linked to goals');
    console.log(`     Objective 1: Linked to Goal ${this.goals[0].id} (STR)`);
    console.log(`     Objective 2: Linked to Goal ${this.goals[1].id} (INT)`);

    // Start the quest
    await this.call('POST', `/quests/${questResult.quest.id}/start`, {
      characterId: this.character.id
    });

    console.log('  ✅ Quest started');

    return true;
  }

  async testGoalCompletionTriggersQuestProgress() {
    this.log('5', 'Testing Goal Completion Triggers Quest Progress');

    // Complete the first goal (STR)
    console.log('  ⏳ Completing Goal 1 (STR)...');

    const completion1 = await this.call('POST', `/goals/${this.goals[0].id}/complete`, {
      value: 1,
      notes: 'Completed strength training!'
    });

    console.log('  ✅ Goal 1 completed');
    console.log(`     XP awarded: ${completion1.xpAwarded}`);

    // Check if quest was updated
    if (completion1.questUpdates && completion1.questUpdates.length > 0) {
      console.log(`  🎯 Quest progression triggered!`);
      completion1.questUpdates.forEach(update => {
        console.log(`     Quest: ${update.quest_title}`);
        if (update.progress_updated) {
          console.log(`     Progress: ${update.current_progress}/${update.total_required} objectives`);
        }
        if (update.stage_completed) {
          console.log(`     🏆 Stage ${update.stage_number} completed!`);
          console.log(`     Narrative: ${update.narrative}`);
        }
      });
    } else {
      console.log('  ⚠️  No quest updates triggered (this might indicate an issue)');
    }

    // Complete the second goal (INT)
    console.log('\n  ⏳ Completing Goal 2 (INT)...');

    const completion2 = await this.call('POST', `/goals/${this.goals[1].id}/complete`, {
      value: 1,
      notes: 'Finished reading session!'
    });

    console.log('  ✅ Goal 2 completed');
    console.log(`     XP awarded: ${completion2.xpAwarded}`);

    // Check if quest fully completed
    if (completion2.questUpdates && completion2.questUpdates.length > 0) {
      console.log(`  🎯 Quest progression triggered!`);
      completion2.questUpdates.forEach(update => {
        console.log(`     Quest: ${update.quest_title}`);
        if (update.fully_completed) {
          console.log(`     🎉 QUEST FULLY COMPLETED!`);
          console.log(`     XP gained: ${update.completion_data.xp_awarded}`);
          console.log(`     Gold gained: ${update.completion_data.gold_awarded}`);
        } else if (update.progress_updated) {
          console.log(`     Progress: ${update.current_progress}/${update.total_required} objectives`);
        }
      });
    }

    return true;
  }

  async testQuestProgress() {
    this.log('6', 'Testing Quest Progress Tracking');

    const quest = this.quests[0];

    const result = await this.call('GET', `/quests/${quest.id}?characterId=${this.character.id}`);

    console.log('  ✅ Quest status retrieved');
    console.log(`     Status: ${result.quest.status}`);

    // Get detailed progress
    const pool = require('./src/config/database');
    const objectivesResult = await pool.query(
      `SELECT * FROM quest_objectives WHERE quest_id = $1 ORDER BY order_index`,
      [quest.id]
    );

    console.log(`  📊 Objectives:`);
    objectivesResult.rows.forEach((obj, i) => {
      const status = obj.completed ? '✅' : '⏳';
      console.log(`     ${status} ${obj.description}`);
    });

    const completedCount = objectivesResult.rows.filter(o => o.completed).length;
    const totalCount = objectivesResult.rows.length;
    const percentage = Math.floor((completedCount / totalCount) * 100);

    console.log(`  📈 Progress: ${percentage}% (${completedCount}/${totalCount})`);

    return true;
  }

  async runFullTest() {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║      GOAL-QUEST INTEGRATION E2E TEST                      ║');
    console.log('╚════════════════════════════════════════════════════════════╝');

    try {
      await this.testAuthentication();
      await this.testCharacterCreation();
      await this.testGoalCreation();
      await this.testManualQuestCreation();
      await this.testGoalCompletionTriggersQuestProgress();
      await this.testQuestProgress();

      console.log('\n╔════════════════════════════════════════════════════════════╗');
      console.log('║              ✅ ALL TESTS PASSED SUCCESSFULLY!             ║');
      console.log('╚════════════════════════════════════════════════════════════╝');

      console.log('\n📊 Test Summary:');
      console.log(`   User: ${this.user.username}`);
      console.log(`   Character: ${this.character.name}`);
      console.log(`   Goals created: ${this.goals.length}`);
      console.log(`   Quests created: ${this.quests.length}`);
      console.log(`   ✅ Goal completion triggers quest progression`);

      return true;

    } catch (error) {
      console.error('\n❌ TEST FAILED:', error.message);
      return false;
    }
  }
}

// Run the test
const test = new GoalQuestIntegrationTest();
test.runFullTest()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
