const axios = require('axios');

const API_URL = 'http://localhost:3000/api';

// Use the test account we just created
const USERNAME = 'testuser1763518029407';
const PASSWORD = 'TestPass123!';

async function testCombat() {
  try {
    console.log('🎮 Quick Combat Test\n');

    // Login
    console.log('1️⃣  Logging in...');
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      emailOrUsername: USERNAME,
      password: PASSWORD
    });
    const token = loginRes.data.token;
    console.log('✅ Logged in');

    // Get character
    console.log('\n2️⃣  Getting character...');
    const charRes = await axios.get(`${API_URL}/characters/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const character = charRes.data;
    console.log(`✅ Character: ${character.name} (${character.class}, Level ${character.level})`);
    console.log(`   Stats: STR ${character.str}, DEX ${character.dex}, CON ${character.con}`);

    // Test combat interaction
    console.log('\n3️⃣  Triggering combat with "I attack the bandit"...');
    const dmRes = await axios.post(
      `${API_URL}/dm/interact`,
      {
        character: character,  // Send full character object
        action: 'I attack the bandit'
      },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    console.log('\n✅ DM Response:');
    console.log('   Narrative:', dmRes.data.narrative?.substring(0, 200) + '...');

    if (dmRes.data.combatState) {
      console.log('\n⚔️  COMBAT DETECTED!');
      console.log('   Enemies:', dmRes.data.combatState.enemies?.length || 0);
      console.log('   Turn:', dmRes.data.combatState.currentTurn);
      console.log('   Round:', dmRes.data.combatState.roundNumber);
    } else {
      console.log('\n⚠️  No combat state returned (might not be a combat action)');
    }

    if (dmRes.data.skillCheckResult) {
      console.log('\n🎲 Skill Check Detected:');
      console.log('   Skill:', dmRes.data.skillCheckResult.skill);
      console.log('   DC:', dmRes.data.skillCheckResult.dc);
    }

    console.log('\n🎉 Combat test complete! Check frontend at http://localhost:5174/dm');
    console.log('\nLogin with:');
    console.log(`   Username: ${USERNAME}`);
    console.log(`   Password: ${PASSWORD}`);

  } catch (error) {
    console.error('\n❌ Test failed:');
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Error: ${JSON.stringify(error.response.data, null, 2)}`);
    } else {
      console.error(`   ${error.message}`);
    }
  }
}

testCombat();
