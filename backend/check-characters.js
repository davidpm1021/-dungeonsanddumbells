/**
 * Check if any characters exist in the database
 */

require('dotenv').config();
const pool = require('./src/config/database');

async function checkCharacters() {
  try {
    const result = await pool.query(
      'SELECT * FROM character_stats LIMIT 5'
    );

    if (result.rows.length === 0) {
      console.log('❌ No characters found in database');
      console.log('\nTo test quest generation, first:');
      console.log('1. Start the backend: npm run dev');
      console.log('2. Start the frontend: cd frontend && npm run dev');
      console.log('3. Register a user and create a character through the UI');
      console.log('4. Then run: node test-quest-generation.js <characterId>');
    } else {
      console.log(`✅ Found ${result.rows.length} character(s):\n`);
      result.rows.forEach(char => {
        console.log(`ID: ${char.id} | Name: ${char.name} | Class: ${char.class} | Level: ${char.level || 1}`);
        console.log(`  Stats: STR ${char.str} DEX ${char.dex} CON ${char.con} INT ${char.int} WIS ${char.wis} CHA ${char.cha}`);
        console.log(`  User ID: ${char.user_id}`);
        console.log();
      });
      console.log('To test quest generation, run:');
      console.log(`node test-quest-generation.js ${result.rows[0].id}`);
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkCharacters();
