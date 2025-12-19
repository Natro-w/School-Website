// Script to check database contents
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'school.db');

async function checkDB() {
  console.log('Checking database...');
  
  if (!fs.existsSync(dbPath)) {
    console.log('Database file does not exist');
    return;
  }
  
  const SQL = await initSqlJs();
  const buffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(buffer);
  
  // Check files table
  const filesResult = db.exec('SELECT COUNT(*) as count FROM files');
  const fileCount = filesResult[0]?.values[0]?.[0] || 0;
  console.log(`Files in database: ${fileCount}`);
  
  if (fileCount > 0) {
    const files = db.exec('SELECT id, filename, mime_type, size FROM files LIMIT 10');
    console.log('\nFirst 10 files:');
    if (files[0]?.values) {
      files[0].values.forEach(row => {
        console.log(`  ID: ${row[0]}`);
        console.log(`  Filename: ${row[1]}`);
        console.log(`  MIME: ${row[2]}`);
        console.log(`  Size: ${row[3]} bytes`);
        console.log('  ---');
      });
    }
  }
  
  db.close();
}

checkDB().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
