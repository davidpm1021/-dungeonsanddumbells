/**
 * Test quest API endpoint to see what data is returned
 */

const axios = require('axios');

async function testQuestAPI() {
  try {
    // Use a test character ID (you'll need to replace with actual ID)
    const characterId = 33; // Replace with your character ID

    const response = await axios.get(`http://localhost:3000/api/quests`, {
      params: { characterId },
      headers: {
        Authorization: 'Bearer ' + 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MzEsImVtYWlsIjoiZEBnLmNvbSIsInVzZXJuYW1lIjoiZGciLCJpYXQiOjE3MzEyNjUyMjAsImV4cCI6MTczMTg3MDAyMH0.m2VCQOqOJATQzP4QI1O3jKWpF_bkMdBttB4RXDXBpQw' // You'll need to use a valid token
      }
    });

    console.log('\n=== Quest API Response ===');
    console.log('Status:', response.status);
    console.log('Quests count:', response.data.quests?.length || 0);

    if (response.data.quests && response.data.quests.length > 0) {
      const quest = response.data.quests[0];
      console.log('\n=== First Quest ===');
      console.log('ID:', quest.id);
      console.log('Title:', quest.title);
      console.log('Status:', quest.status);
      console.log('Description:', quest.description?.substring(0, 100) + '...');
      console.log('XP Reward:', quest.xpReward);
      console.log('Gold Reward:', quest.goldReward);
      console.log('\n=== Objectives ===');
      console.log('Objectives type:', typeof quest.objectives);
      console.log('Objectives:', JSON.stringify(quest.objectives, null, 2));
    }

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testQuestAPI();
