// SQLite Database Setup using sql.js
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'school.db');
let db = null;

// Initialize database
async function initDB() {
  const SQL = await initSqlJs();
  
  // Load existing database or create new one
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }
  
  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON');
  
  return db;
}

// Save database to file
function saveDB() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

// Wrapper functions for compatibility
const dbWrapper = {
  prepare: (sql) => ({
    run: (...params) => {
      try {
        db.run(sql, params);
        saveDB();
        return { changes: db.getRowsModified() };
      } catch (error) {
        console.error('DB run error:', error, 'SQL:', sql);
        throw error;
      }
    },
    get: (...params) => {
      try {
        const stmt = db.prepare(sql);
        stmt.bind(params);
        if (stmt.step()) {
          const row = stmt.getAsObject();
          stmt.free();
          return row;
        }
        stmt.free();
        return null;
      } catch (error) {
        console.error('DB get error:', error, 'SQL:', sql);
        throw error;
      }
    },
    all: (...params) => {
      try {
        const stmt = db.prepare(sql);
        stmt.bind(params);
        const rows = [];
        while (stmt.step()) {
          rows.push(stmt.getAsObject());
        }
        stmt.free();
        return rows;
      } catch (error) {
        console.error('DB all error:', error, 'SQL:', sql);
        throw error;
      }
    }
  }),
  exec: (sql) => {
    try {
      db.run(sql);
      saveDB();
    } catch (error) {
      console.error('DB exec error:', error, 'SQL:', sql);
      throw error;
    }
  }
};

// Initialize database schema
async function initDatabase() {
  await initDB();
  
  // Create subjects table
  dbWrapper.exec(`
    CREATE TABLE IF NOT EXISTS subjects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create users table
  dbWrapper.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      full_name TEXT,
      role TEXT DEFAULT 'user' CHECK(role IN ('admin', 'teacher', 'user')),
      profile_picture TEXT,
      assigned_subject_id TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (assigned_subject_id) REFERENCES subjects(id) ON DELETE SET NULL
    )
  `);

  // Create content table
  dbWrapper.exec(`
    CREATE TABLE IF NOT EXISTS content (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      body TEXT,
      type TEXT NOT NULL CHECK(type IN ('news', 'preparation', 'material')),
      subject_id TEXT,
      author_id TEXT,
      url TEXT,
      media_urls TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL,
      FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  // Create files table
  dbWrapper.exec(`
    CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY,
      content_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      stored_filename TEXT NOT NULL UNIQUE,
      mime_type TEXT NOT NULL,
      size INTEGER NOT NULL,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE
    )
  `);

  // Create indexes
  dbWrapper.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    CREATE INDEX IF NOT EXISTS idx_content_type ON content(type);
    CREATE INDEX IF NOT EXISTS idx_content_subject_id ON content(subject_id);
    CREATE INDEX IF NOT EXISTS idx_content_author_id ON content(author_id);
    CREATE INDEX IF NOT EXISTS idx_content_created_at ON content(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_files_content_id ON files(content_id);
    CREATE INDEX IF NOT EXISTS idx_files_stored_filename ON files(stored_filename);
  `);

  // Insert default subjects
  const insertSubject = dbWrapper.prepare(`
    INSERT OR IGNORE INTO subjects (id, name, description) VALUES (?, ?, ?)
  `);

  const subjects = [
    ['1', 'رياضيات', 'Mathematics'],
    ['2', 'عربي', 'Arabic Language'],
    ['3', 'إنكليزي', 'English Language'],
    ['4', 'أمن الشبكات', 'Network Security'],
    ['5', 'حماية أنظمة التشغيل', 'Operating System Protection'],
    ['6', 'القرآن الكريم', 'Holy Quran'],
    ['7', 'التطبيقات', 'Applications'],
    ['8', 'أساسيات الأمن السيبراني', 'Cybersecurity Fundamentals']
  ];

  subjects.forEach(subject => insertSubject.run(...subject));

  // Create default admin user if no users exist
  const userCount = dbWrapper.prepare('SELECT COUNT(*) as count FROM users').get();
  if (userCount.count === 0) {
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    dbWrapper.prepare(`
      INSERT INTO users (id, username, password, full_name, role)
      VALUES (?, ?, ?, ?, ?)
    `).run('admin-1', 'admin', hashedPassword, 'Administrator', 'admin');
    
    console.log('✅ Default admin user created: username=admin, password=admin123');
  }

  // Migration: Add media_urls column if it doesn't exist
  try {
    const contentTableInfo = dbWrapper.prepare("PRAGMA table_info(content)").all();
    const hasMediaUrls = contentTableInfo.some(col => col.name === 'media_urls');
    
    if (!hasMediaUrls) {
      console.log('🔄 Running migration: Adding media_urls column...');
      dbWrapper.exec(`ALTER TABLE content ADD COLUMN media_urls TEXT DEFAULT '[]'`);
      console.log('✅ Migration complete: media_urls column added');
    }
  } catch (error) {
    console.error('⚠️  Migration warning:', error.message);
  }

  console.log('✅ Database initialized successfully');
}

module.exports = { dbWrapper, initDatabase, saveDB };
