#!/usr/bin/env node

/**
 * Migration Script: Add media_urls column and migrate existing url data
 * 
 * This script:
 * 1. Checks if media_urls column exists in content table
 * 2. If not, adds the media_urls column
 * 3. Migrates any existing url data to media_urls as JSON array
 * 4. Optionally removes the old url column
 */

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'school.db');

async function migrate() {
  console.log('Starting migration to media_urls...\n');

  // Initialize SQL.js
  const SQL = await initSqlJs();
  
  // Load existing database
  if (!fs.existsSync(DB_PATH)) {
    console.error('Database file not found:', DB_PATH);
    process.exit(1);
  }

  const fileBuffer = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(fileBuffer);

  try {
    // Check current schema
    console.log('Checking current content table schema...');
    const tableInfo = db.exec("PRAGMA table_info(content)");
    const columns = tableInfo[0]?.values.map(row => row[1]) || [];
    
    console.log('Current columns:', columns.join(', '));

    const hasMediaUrls = columns.includes('media_urls');
    const hasUrl = columns.includes('url');

    if (hasMediaUrls) {
      console.log('\n✓ media_urls column already exists');
    } else {
      console.log('\n→ Adding media_urls column...');
      db.run('ALTER TABLE content ADD COLUMN media_urls TEXT DEFAULT "[]"');
      console.log('✓ media_urls column added');
    }

    // Migrate existing url data to media_urls
    if (hasUrl) {
      console.log('\n→ Migrating existing url data to media_urls...');
      
      // Get all content with non-null url
      const contentWithUrls = db.exec(`
        SELECT id, url FROM content WHERE url IS NOT NULL AND url != ''
      `);

      if (contentWithUrls.length > 0 && contentWithUrls[0].values.length > 0) {
        const rows = contentWithUrls[0].values;
        console.log(`Found ${rows.length} content items with URLs`);

        // Update each row
        const updateStmt = db.prepare('UPDATE content SET media_urls = ? WHERE id = ?');
        
        rows.forEach(([id, url]) => {
          const urlsArray = JSON.stringify([url]);
          updateStmt.run([urlsArray, id]);
        });

        updateStmt.free();
        console.log(`✓ Migrated ${rows.length} URLs to media_urls`);
      } else {
        console.log('No URLs to migrate');
      }

      // Optional: Remove old url column (commented out for safety)
      // console.log('\n→ Removing old url column...');
      // Note: SQLite doesn't support DROP COLUMN directly, would need to recreate table
      console.log('\n⚠ Note: Old url column kept for backward compatibility');
      console.log('  You can manually remove it later if needed');
    }

    // Save the modified database
    const data = db.export();
    fs.writeFileSync(DB_PATH, data);
    
    console.log('\n✓ Migration completed successfully!');
    console.log('\nUpdated schema:');
    const newTableInfo = db.exec("PRAGMA table_info(content)");
    const newColumns = newTableInfo[0]?.values.map(row => `  - ${row[1]} (${row[2]})`).join('\n') || '';
    console.log(newColumns);

  } catch (error) {
    console.error('\n✗ Migration failed:', error.message);
    process.exit(1);
  } finally {
    db.close();
  }
}

migrate().catch(console.error);
