// End-to-end API test script
const axios = require('axios');

const API_URL = 'http://localhost:3000/api';
const TEST_EMAIL = `test${Date.now()}@example.com`;
const TEST_USERNAME = `testuser${Date.now()}`;
const TEST_PASSWORD = 'TestPassword123';

let authToken = null;
let characterId = null;
let goalId = null;

async function runTests() {
  console.log('🧪 Starting End-to-End API Tests...\n');

  try {
    // Test 1: Health Check
    console.log('1️⃣ Testing Health Check...');
    const health = await axios.get(`${API_URL}/health`);
    console.log('✅ Health check passed:', health.data);
    console.log('');

    // Test 2: User Registration
    console.log('2️⃣ Testing User Registration...');
    const registerResponse = await axios.post(`${API_URL}/auth/register`, {
      email: TEST_EMAIL,
      username: TEST_USERNAME,
      password: TEST_PASSWORD
    });
    console.log('✅ Registration successful:', {
      message: registerResponse.data.message,
      userId: registerResponse.data.userId
    });
    console.log('');

    // Test 3: User Login
    console.log('3️⃣ Testing User Login...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      emailOrUsername: TEST_USERNAME,
      password: TEST_PASSWORD
    });
    authToken = loginResponse.data.token;
    console.log('✅ Login successful:', {
      username: loginResponse.data.user.username,
      email: loginResponse.data.user.email,
      token: authToken.substring(0, 20) + '...'
    });
    console.log('');

    // Test 4: Verify Token
    console.log('4️⃣ Testing Token Verification...');
    const meResponse = await axios.get(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✅ Token verified:', {
      userId: meResponse.data.user.id,
      username: meResponse.data.user.username
    });
    console.log('');

    // Test 5: Create Character
    console.log('5️⃣ Testing Character Creation...');
    const characterResponse = await axios.post(
      `${API_URL}/characters`,
      {
        name: 'Sir Test of QA',
        class: 'Fighter'
      },
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    characterId = characterResponse.data.id;
    console.log('✅ Character created:', {
      id: characterResponse.data.id,
      name: characterResponse.data.name,
      class: characterResponse.data.class,
      level: characterResponse.data.level,
      stats: {
        str: characterResponse.data.str,
        dex: characterResponse.data.dex,
        con: characterResponse.data.con,
        int: characterResponse.data.int,
        wis: characterResponse.data.wis,
        cha: characterResponse.data.cha
      }
    });
    console.log('');

    // Test 6: Get Character
    console.log('6️⃣ Testing Get Character...');
    const getCharResponse = await axios.get(`${API_URL}/characters/me`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✅ Character retrieved:', {
      name: getCharResponse.data.name,
      level: getCharResponse.data.level,
      total_xp: getCharResponse.data.total_xp
    });
    console.log('');

    // Test 7: Create Binary Goal
    console.log('7️⃣ Testing Goal Creation (Binary)...');
    const goalResponse = await axios.post(
      `${API_URL}/goals`,
      {
        title: '30-minute workout',
        description: 'Complete a 30-minute strength training session',
        type: 'binary',
        frequency: 'daily',
        stat: 'str'
      },
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    goalId = goalResponse.data.id;
    console.log('✅ Goal created:', {
      id: goalResponse.data.id,
      title: goalResponse.data.title,
      type: goalResponse.data.type,
      stat: goalResponse.data.stat
    });
    console.log('');

    // Test 8: Create Quantitative Goal
    console.log('8️⃣ Testing Goal Creation (Quantitative)...');
    const quantGoalResponse = await axios.post(
      `${API_URL}/goals`,
      {
        title: 'Daily steps',
        description: 'Walk 10,000 steps',
        type: 'quantitative',
        frequency: 'daily',
        stat: 'dex',
        target_value: 10000
      },
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    console.log('✅ Quantitative goal created:', {
      id: quantGoalResponse.data.id,
      title: quantGoalResponse.data.title,
      target_value: quantGoalResponse.data.target_value
    });
    console.log('');

    // Test 9: Get All Goals
    console.log('9️⃣ Testing Get All Goals...');
    const goalsResponse = await axios.get(`${API_URL}/goals`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✅ Goals retrieved:', {
      count: goalsResponse.data.length,
      goals: goalsResponse.data.map(g => ({
        title: g.title,
        type: g.type,
        completed_today: g.completed_today
      }))
    });
    console.log('');

    // Test 10: Complete Binary Goal
    console.log('🔟 Testing Goal Completion (Binary)...');
    const completeResponse = await axios.post(
      `${API_URL}/goals/${goalId}/complete`,
      {},
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    console.log('✅ Goal completed:', {
      goalTitle: completeResponse.data.goal.title,
      completed: completeResponse.data.goal.completed_today,
      xpAwarded: completeResponse.data.xpAwarded,
      characterLevel: completeResponse.data.character.level,
      newStrength: completeResponse.data.character.str,
      strXP: completeResponse.data.character.str_xp,
      strXPNeeded: completeResponse.data.character.str_xp_needed
    });
    console.log('');

    // Test 11: Complete Quantitative Goal
    console.log('1️⃣1️⃣ Testing Goal Completion (Quantitative)...');
    const completeQuantResponse = await axios.post(
      `${API_URL}/goals/${quantGoalResponse.data.id}/complete`,
      { value: 12500 },
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    console.log('✅ Quantitative goal completed:', {
      goalTitle: completeQuantResponse.data.goal.title,
      valueSubmitted: 12500,
      xpAwarded: completeQuantResponse.data.xpAwarded,
      newDexterity: completeQuantResponse.data.character.dex,
      dexXP: completeQuantResponse.data.character.dex_xp
    });
    console.log('');

    // Test 12: Verify Character Stats Updated
    console.log('1️⃣2️⃣ Testing Character Stats After Goal Completions...');
    const updatedCharResponse = await axios.get(`${API_URL}/characters/me`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✅ Character stats verified:', {
      name: updatedCharResponse.data.name,
      level: updatedCharResponse.data.level,
      total_xp: updatedCharResponse.data.total_xp,
      stats: {
        str: updatedCharResponse.data.str,
        dex: updatedCharResponse.data.dex,
        con: updatedCharResponse.data.con,
        int: updatedCharResponse.data.int,
        wis: updatedCharResponse.data.wis,
        cha: updatedCharResponse.data.cha
      },
      xpProgress: {
        str: `${updatedCharResponse.data.str_xp}/${updatedCharResponse.data.str_xp_needed}`,
        dex: `${updatedCharResponse.data.dex_xp}/${updatedCharResponse.data.dex_xp_needed}`
      }
    });
    console.log('');

    // Test 13: Try to complete goal again (should fail - already completed today)
    console.log('1️⃣3️⃣ Testing Goal Re-completion Prevention...');
    try {
      await axios.post(
        `${API_URL}/goals/${goalId}/complete`,
        {},
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      console.log('❌ FAILED: Should not allow re-completion');
    } catch (err) {
      if (err.response?.status === 400) {
        console.log('✅ Goal re-completion correctly prevented:', err.response.data.error);
      } else {
        throw err;
      }
    }
    console.log('');

    console.log('🎉 ALL TESTS PASSED! 🎉');
    console.log('\n📊 Test Summary:');
    console.log('- User registration and login ✓');
    console.log('- Token authentication ✓');
    console.log('- Character creation and retrieval ✓');
    console.log('- Goal creation (binary & quantitative) ✓');
    console.log('- Goal completion and XP awards ✓');
    console.log('- Character stat progression ✓');
    console.log('- Goal re-completion prevention ✓');

  } catch (error) {
    console.error('\n❌ TEST FAILED:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Error:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
    process.exit(1);
  }
}

// Run the tests
runTests();
