// Migration script to add URL field to content table
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'school.db');

async function addUrlField() {
  console.log('Starting URL field migration...');
  
  if (!fs.existsSync(dbPath)) {
    console.log('❌ Database file not found. Please run the server first to create the database.');
    return;
  }

  const SQL = await initSqlJs();
  const buffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(buffer);

  try {
    // Check if url column already exists
    const tableInfo = db.exec("PRAGMA table_info(content)");
    const columns = tableInfo[0]?.values || [];
    const hasUrlColumn = columns.some(col => col[1] === 'url');

    if (hasUrlColumn) {
      console.log('✅ URL field already exists in content table');
    } else {
      // Add url column
      db.run('ALTER TABLE content ADD COLUMN url TEXT');
      console.log('✅ Added url column to content table');
    }

    // Save the database
    const data = db.export();
    const newBuffer = Buffer.from(data);
    fs.writeFileSync(dbPath, newBuffer);
    console.log('✅ Database saved successfully');

    db.close();
    console.log('✅ Migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    db.close();
    process.exit(1);
  }
}

addUrlField();
