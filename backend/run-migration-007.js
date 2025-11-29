const fs = require('fs');
const path = require('path');
const db = require('./src/config/database');

async function runMigration() {
  try {
    console.log('🚀 Running Migration 007: Health Tracking System...\n');

    // Read migration file
    const migrationPath = path.join(__dirname, 'src', 'migrations', '007_health_tracking_system.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Execute migration
    await db.query(sql);

    console.log('✅ Migration 007 completed successfully!\n');

    // Verify tables created
    console.log('📋 Verifying health tables...');
    const tablesQuery = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name LIKE '%health%'
        OR table_name IN ('wearable_integrations', 'stat_health_mappings', 'daily_activity_caps')
      ORDER BY table_name;
    `;

    const result = await db.query(tablesQuery);

    console.log('\n✅ Health tables created:');
    result.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });

    // Verify stat mappings data
    const statMappingsQuery = 'SELECT stat_code, stat_name FROM stat_health_mappings ORDER BY stat_code';
    const statMappings = await db.query(statMappingsQuery);

    console.log('\n✅ Stat-to-health mappings:');
    statMappings.rows.forEach(row => {
      console.log(`   - ${row.stat_code}: ${row.stat_name}`);
    });

    // Verify goals table extensions
    const goalsColumnsQuery = `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'goals'
        AND column_name IN ('activity_type', 'difficulty_class', 'verification_required', 'graduated_success')
      ORDER BY column_name;
    `;

    const goalsColumns = await db.query(goalsColumnsQuery);
    console.log('\n✅ Goals table extensions:');
    goalsColumns.rows.forEach(row => {
      console.log(`   - ${row.column_name}`);
    });

    console.log('\n🎉 Health system database ready!\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

runMigration();
