#!/usr/bin/env node

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'school.db');

async function verifySchema() {
  console.log('Verifying database schema...\n');

  const SQL = await initSqlJs();
  
  if (!fs.existsSync(DB_PATH)) {
    console.error('Database file not found:', DB_PATH);
    process.exit(1);
  }

  const fileBuffer = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(fileBuffer);

  try {
    // Check content table schema
    console.log('=== CONTENT TABLE SCHEMA ===');
    const tableInfo = db.exec("PRAGMA table_info(content)");
    if (tableInfo.length > 0) {
      console.log('\nColumns:');
      tableInfo[0].values.forEach(row => {
        console.log(`  - ${row[1]} (${row[2]})${row[3] ? ' NOT NULL' : ''}${row[4] ? ` DEFAULT ${row[4]}` : ''}`);
      });
    }

    // Check if there's any content
    const contentCount = db.exec("SELECT COUNT(*) as count FROM content");
    const count = contentCount[0]?.values[0]?.[0] || 0;
    console.log(`\nTotal content items: ${count}`);

    // Check if there's any content with URLs
    const urlContent = db.exec("SELECT COUNT(*) as count FROM content WHERE url IS NOT NULL AND url != ''");
    const urlCount = urlContent[0]?.values[0]?.[0] || 0;
    console.log(`Content with old URL field: ${urlCount}`);

    const mediaUrlsContent = db.exec("SELECT COUNT(*) as count FROM content WHERE media_urls IS NOT NULL AND media_urls != '[]'");
    const mediaUrlsCount = mediaUrlsContent[0]?.values[0]?.[0] || 0;
    console.log(`Content with media_urls field: ${mediaUrlsCount}`);

    console.log('\n✓ Schema verification complete!');

  } catch (error) {
    console.error('\n✗ Verification failed:', error.message);
    process.exit(1);
  } finally {
    db.close();
  }
}

verifySchema().catch(console.error);
