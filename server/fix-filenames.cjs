// Script to fix existing filenames in the database
// This converts filenames from latin1 to UTF-8 encoding

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'school.db');

async function fixFilenames() {
  console.log('Starting filename fix...');
  
  const SQL = await initSqlJs();
  const buffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(buffer);
  
  // Get all files
  const files = db.exec('SELECT id, filename FROM files');
  
  if (files.length === 0 || !files[0].values) {
    console.log('No files found in database');
    return;
  }
  
  let fixedCount = 0;
  
  for (const row of files[0].values) {
    const [id, filename] = row;
    
    try {
      // Try to decode from latin1 to UTF-8
      const decodedFilename = Buffer.from(filename, 'latin1').toString('utf8');
      
      // Only update if the decoded version is different
      if (decodedFilename !== filename) {
        const stmt = db.prepare('UPDATE files SET filename = ? WHERE id = ?');
        stmt.run([decodedFilename, id]);
        stmt.free();
        
        console.log(`Fixed: ${filename} -> ${decodedFilename}`);
        fixedCount++;
      }
    } catch (error) {
      console.error(`Error fixing filename for ID ${id}:`, error);
    }
  }
  
  // Save the database
  const data = db.export();
  fs.writeFileSync(dbPath, data);
  
  console.log(`\nFixed ${fixedCount} filenames`);
  console.log('Database saved successfully');
  
  db.close();
}

fixFilenames().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
