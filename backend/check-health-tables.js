const db = require('./src/config/database');

async function checkHealthTables() {
  try {
    console.log('📋 Checking health system tables...\n');

    // Check all health-related tables
    const tablesQuery = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND (
          table_name LIKE '%health%'
          OR table_name IN ('wearable_integrations', 'stat_health_mappings', 'daily_activity_caps')
        )
      ORDER BY table_name;
    `;

    const tables = await db.query(tablesQuery);

    const expectedTables = [
      'health_activities',
      'health_streaks',
      'character_health_conditions',
      'health_achievements',
      'user_health_achievements',
      'wearable_integrations',
      'stat_health_mappings',
      'daily_activity_caps'
    ];

    console.log('✅ Existing health tables:');
    const existingTables = tables.rows.map(r => r.table_name);
    existingTables.forEach(name => {
      console.log(`   - ${name}`);
    });

    console.log('\n❓ Missing tables:');
    const missingTables = expectedTables.filter(t => !existingTables.includes(t));
    if (missingTables.length === 0) {
      console.log('   None! All health tables exist.\n');
    } else {
      missingTables.forEach(name => {
        console.log(`   - ${name}`);
      });
    }

    // Check goals table extensions
    const goalsColumnsQuery = `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'goals'
        AND column_name IN ('activity_type', 'difficulty_class', 'verification_required', 'graduated_success')
      ORDER BY column_name;
    `;

    const goalsColumns = await db.query(goalsColumnsQuery);
    console.log('\n✅ Goals table health extensions:');
    if (goalsColumns.rows.length > 0) {
      goalsColumns.rows.forEach(row => {
        console.log(`   - ${row.column_name}`);
      });
    } else {
      console.log('   ⚠️  No health extensions found in goals table');
    }

    // Check stat mappings
    const statMappingsQuery = 'SELECT stat_code, stat_name, array_length(activity_types, 1) as activity_count FROM stat_health_mappings ORDER BY stat_code';
    const statMappings = await db.query(statMappingsQuery);

    console.log('\n✅ Stat-to-health mappings:');
    statMappings.rows.forEach(row => {
      console.log(`   - ${row.stat_code} (${row.stat_name}): ${row.activity_count} activity types`);
    });

    // Summary
    console.log('\n' + '='.repeat(60));
    if (missingTables.length === 0 && goalsColumns.rows.length === 4) {
      console.log('🎉 Health system fully deployed!');
    } else {
      console.log('⚠️  Health system partially deployed. Manual fixes needed.');
    }
    console.log('='.repeat(60) + '\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Check failed:', error.message);
    process.exit(1);
  }
}

checkHealthTables();
