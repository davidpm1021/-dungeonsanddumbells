const axios = require('axios');

const API_URL = 'http://localhost:3000/api';

async function testFullSetup() {
  try {
    console.log('🧪 Testing full user setup flow...\n');

    // Random username to avoid conflicts
    const username = `testuser${Date.now()}`;
    const email = `${username}@example.com`;
    const password = 'TestPass123!';

    // Step 1: Register
    console.log('1️⃣  Registering new user...');
    const registerRes = await axios.post(`${API_URL}/auth/register`, {
      email,
      username,
      password
    });
    console.log('✅ User registered:', registerRes.data);

    // Step 2: Login
    console.log('\n2️⃣  Logging in...');
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      emailOrUsername: username,
      password
    });
    const token = loginRes.data.token;
    console.log('✅ Logged in, token received');

    // Step 3: Create Character
    console.log('\n3️⃣  Creating character...');
    const characterRes = await axios.post(
      `${API_URL}/characters`,
      {
        name: 'Test Hero',
        class: 'Fighter'
      },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    console.log('✅ Character created:', characterRes.data);

    // Step 4: Get Character
    console.log('\n4️⃣  Fetching character...');
    const getCharRes = await axios.get(`${API_URL}/characters/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Character retrieved:', getCharRes.data);

    console.log('\n🎉 All tests passed! Your setup is working correctly.');
    console.log('\n📝 Test credentials:');
    console.log(`   Email: ${email}`);
    console.log(`   Username: ${username}`);
    console.log(`   Password: ${password}`);
    console.log(`   Token: ${token.substring(0, 20)}...`);

  } catch (error) {
    console.error('\n❌ Test failed:');
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Error: ${JSON.stringify(error.response.data, null, 2)}`);
    } else {
      console.error(`   ${error.message}`);
    }
    process.exit(1);
  }
}

testFullSetup();
