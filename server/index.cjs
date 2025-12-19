// Express Server with SQLite Backend
const express = require('express');
const http = require('http');
const cors = require('cors');
const compression = require('compression');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const crypto = require('crypto');
const geoip = require('geoip-lite');
const { dbWrapper: db, initDatabase } = require('./database.cjs');

const app = express();
const PORT = process.env.PORT || 8083;
const JWT_SECRET = process.env.JWT_SECRET || 'school-management-secret-key-2025';
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-randomstring-originalname
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(file.originalname);
    const nameWithoutExt = path.basename(file.originalname, ext);
    const uniqueName = `${timestamp}-${randomString}-${nameWithoutExt}${ext}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 1024, // 1GB per file
  }
});

// Helper function to properly decode filename from multer
function decodeFilename(filename) {
  try {
    // Multer uses latin1 encoding by default, we need to convert to UTF-8
    return Buffer.from(filename, 'latin1').toString('utf8');
  } catch (error) {
    console.error('Error decoding filename:', error);
    return filename;
  }
}

// Initialize database before starting server
initDatabase().then(() => {
  console.log('Database ready');
}).catch(err => {
  console.error('Database initialization failed:', err);
  process.exit(1);
});

// Middleware - Increase payload size limits
app.use(cors());

// Enable gzip compression for all responses
app.use(compression({
  level: 6, // Compression level (0-9, 6 is default)
  threshold: 1024, // Only compress responses larger than 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// Geo-restriction middleware - Configurable via environment variable
// Set ENABLE_GEO_RESTRICTION=true to enable, or leave unset/false to disable
const ENABLE_GEO_RESTRICTION = process.env.ENABLE_GEO_RESTRICTION === 'true';
const ALLOWED_COUNTRIES = (process.env.ALLOWED_COUNTRIES || 'IQ').split(',').map(c => c.trim());

app.use((req, res, next) => {
  // Skip geo-restriction if disabled
  if (!ENABLE_GEO_RESTRICTION) {
    return next();
  }

  // Get client IP address
  let clientIp = req.headers['x-forwarded-for'] || 
                 req.headers['x-real-ip'] || 
                 req.connection.remoteAddress || 
                 req.socket.remoteAddress;
  
  // Handle IPv6 localhost and IPv4-mapped IPv6 addresses
  if (clientIp === '::1' || clientIp === '::ffff:127.0.0.1' || clientIp === '127.0.0.1') {
    // Allow localhost for development
    return next();
  }
  
  // Extract IPv4 from IPv6-mapped address
  if (clientIp && clientIp.startsWith('::ffff:')) {
    clientIp = clientIp.substring(7);
  }
  
  // Get geolocation data
  const geo = geoip.lookup(clientIp);
  
  // Allow if no geo data (localhost or private network)
  if (!geo) {
    console.log(`⚠️  No geo data for IP: ${clientIp} - Allowing access`);
    return next();
  }
  
  // Check if country is in allowed list
  if (ALLOWED_COUNTRIES.includes(geo.country)) {
    console.log(`✅ Access granted from ${geo.country} - IP: ${clientIp}`);
    return next();
  }
  
  // Block access from other countries
  console.log(`🚫 Access denied from ${geo.country} - IP: ${clientIp}`);
  
  // If it's an API request, return JSON
  if (req.path.startsWith('/api/')) {
    return res.status(403).json({
      error: 'Access Denied',
      message: `This website is only accessible from: ${ALLOWED_COUNTRIES.join(', ')}`,
      country: geo.country
    });
  }
  
  // For web requests, return HTML page
  return res.status(403).send(`
    <!DOCTYPE html>
    <html lang="en" dir="ltr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Access Denied</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .container {
          background: white;
          border-radius: 16px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          padding: 48px;
          max-width: 500px;
          text-align: center;
        }
        .icon {
          font-size: 64px;
          margin-bottom: 24px;
        }
        h1 {
          color: #1a202c;
          font-size: 32px;
          margin-bottom: 16px;
          font-weight: 700;
        }
        p {
          color: #4a5568;
          font-size: 18px;
          line-height: 1.6;
          margin-bottom: 12px;
        }
        .country {
          display: inline-block;
          background: #fed7d7;
          color: #c53030;
          padding: 8px 16px;
          border-radius: 8px;
          font-weight: 600;
          margin-top: 16px;
        }
        .footer {
          margin-top: 32px;
          color: #718096;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">🚫</div>
        <h1>Access Denied</h1>
        <p>This website is only accessible from Iraq.</p>
        <p>Your current location has been detected as:</p>
        <div class="country">${geo.country}</div>
        <div class="footer">
          If you believe this is an error, please contact the administrator.
        </div>
      </div>
    </body>
    </html>
  `);
});

// Log all incoming requests
app.use((req, res, next) => {
  const contentLength = req.headers['content-length'];
  console.log(`${req.method} ${req.path} - Content-Length: ${contentLength ? (parseInt(contentLength) / 1024 / 1024).toFixed(2) + 'MB' : 'N/A'}`);
  next();
});

app.use(express.json({ 
  limit: '500mb',
  parameterLimit: 100000
}));
app.use(express.urlencoded({ 
  limit: '500mb', 
  extended: true,
  parameterLimit: 100000
}));

// Add raw body parser for large uploads
app.use(express.raw({ 
  limit: '500mb',
  type: 'application/octet-stream'
}));

// Serve static files from React build (for production)
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath, {
  maxAge: '1d', // Cache static files for 1 day
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    // Cache assets for longer
    if (filePath.match(/\.(js|css|woff|woff2|ttf|eot|svg|png|jpg|jpeg|gif|ico)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day
    }
    // Don't cache HTML files
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }
}));

// Error handling for payload too large
app.use((err, req, res, next) => {
  console.error('Error middleware caught:', err.type, err.message);
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ 
      error: 'File too large. Maximum size is 500MB.',
      code: 'PAYLOAD_TOO_LARGE'
    });
  }
  if (err.status === 413) {
    return res.status(413).json({ 
      error: 'Request entity too large. Maximum size is 500MB.',
      code: 'PAYLOAD_TOO_LARGE'
    });
  }
  next(err);
});

// Auth middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
}

// Helper to check if user is admin
function isAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// ============================================================================
// AUTH ROUTES
// ============================================================================

// Login
app.post('/api/auth/login', (req, res) => {
  try {
    const { username, password } = req.body;

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is disabled' });
    }

    const validPassword = bcrypt.compareSync(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { password: _, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword, token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Register (admin only)
app.post('/api/auth/register', authenticateToken, isAdmin, (req, res) => {
  try {
    const { username, password, full_name, role } = req.body;

    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existing) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const id = `user-${Date.now()}`;

    // Convert undefined to null for SQL compatibility
    db.prepare(`
      INSERT INTO users (id, username, password, full_name, role)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, username || null, hashedPassword || null, full_name || null, role || 'user');

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    const { password: _, ...userWithoutPassword } = user;

    res.status(201).json(userWithoutPassword);
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Change password
app.post('/api/auth/change-password', authenticateToken, (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

    const validPassword = bcrypt.compareSync(currentPassword, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, req.user.id);

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// ============================================================================
// USER ROUTES
// ============================================================================

// Get all users
app.get('/api/users', authenticateToken, (req, res) => {
  try {
    const users = db.prepare('SELECT * FROM users ORDER BY created_at DESC').all();
    const usersWithoutPasswords = users.map(({ password, ...user }) => user);
    res.json(usersWithoutPasswords);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get user by ID
app.get('/api/users/:id', authenticateToken, (req, res) => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Update user
app.put('/api/users/:id', authenticateToken, (req, res) => {
  try {
    const { username, password, full_name, profile_picture, assigned_subject_id, role, is_active } = req.body;
    const userId = req.params.id;

    // Only admin can change role and is_active
    if ((role || is_active !== undefined) && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Users can only update their own profile (except role and is_active)
    if (userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updates = [];
    const values = [];

    // Check if username already exists (if changing username)
    if (username !== undefined) {
      const existingUser = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, userId);
      if (existingUser) {
        return res.status(400).json({ error: 'Username already exists' });
      }
      updates.push('username = ?');
      values.push(username);
    }

    // Hash password if provided
    if (password !== undefined && password.trim() !== '') {
      const hashedPassword = bcrypt.hashSync(password, 10);
      updates.push('password = ?');
      values.push(hashedPassword);
    }

    if (full_name !== undefined) {
      updates.push('full_name = ?');
      values.push(full_name);
    }
    if (profile_picture !== undefined) {
      updates.push('profile_picture = ?');
      values.push(profile_picture);
    }
    if (assigned_subject_id !== undefined && req.user.role === 'admin') {
      updates.push('assigned_subject_id = ?');
      values.push(assigned_subject_id);
    }
    if (role !== undefined && req.user.role === 'admin') {
      updates.push('role = ?');
      values.push(role);
    }
    if (is_active !== undefined && req.user.role === 'admin') {
      updates.push('is_active = ?');
      values.push(is_active ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    values.push(userId);
    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user (admin only)
app.delete('/api/users/:id', authenticateToken, isAdmin, (req, res) => {
  try {
    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// ============================================================================
// SUBJECT ROUTES
// ============================================================================

// Get all subjects
app.get('/api/subjects', (req, res) => {
  console.log('GET /api/subjects called');
  try {
    const subjects = db.prepare('SELECT * FROM subjects ORDER BY name').all();
    console.log('Subjects fetched:', subjects.length);
    res.json(subjects);
  } catch (error) {
    console.error('Get subjects error:', error);
    res.status(500).json({ error: 'Failed to fetch subjects' });
  }
});

// Create subject (admin only)
app.post('/api/subjects', authenticateToken, isAdmin, (req, res) => {
  try {
    const { name, description } = req.body;
    const id = `subject-${Date.now()}`;

    db.prepare(`
      INSERT INTO subjects (id, name, description)
      VALUES (?, ?, ?)
    `).run(id, name, description);

    const subject = db.prepare('SELECT * FROM subjects WHERE id = ?').get(id);
    res.status(201).json(subject);
  } catch (error) {
    console.error('Create subject error:', error);
    res.status(500).json({ error: 'Failed to create subject' });
  }
});

// Update subject (admin only)
app.put('/api/subjects/:id', authenticateToken, isAdmin, (req, res) => {
  try {
    const { name, description } = req.body;
    
    db.prepare(`
      UPDATE subjects SET name = ?, description = ? WHERE id = ?
    `).run(name, description, req.params.id);

    const subject = db.prepare('SELECT * FROM subjects WHERE id = ?').get(req.params.id);
    res.json(subject);
  } catch (error) {
    console.error('Update subject error:', error);
    res.status(500).json({ error: 'Failed to update subject' });
  }
});

// Delete subject (admin only)
app.delete('/api/subjects/:id', authenticateToken, isAdmin, (req, res) => {
  try {
    db.prepare('DELETE FROM subjects WHERE id = ?').run(req.params.id);
    res.json({ message: 'Subject deleted successfully' });
  } catch (error) {
    console.error('Delete subject error:', error);
    res.status(500).json({ error: 'Failed to delete subject' });
  }
});

// ============================================================================
// FILE ROUTES
// ============================================================================

// Upload files with error handling
app.post('/api/files/upload', authenticateToken, (req, res) => {
  upload.array('files', 10)(req, res, (err) => {
    if (err) {
      console.error('Multer error:', err);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ 
          error: `File too large. Maximum file size is 1GB per file.`,
          code: 'FILE_TOO_LARGE'
        });
      }
      return res.status(400).json({ 
        error: err.message || 'File upload failed',
        code: err.code
      });
    }

    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
      }

    const { content_id } = req.body;
    if (!content_id) {
      // Clean up uploaded files
      req.files.forEach(file => {
        fs.unlinkSync(file.path);
      });
      return res.status(400).json({ error: 'content_id is required' });
    }

    // Save file metadata to database
    const uploadedFiles = [];
    for (const file of req.files) {
      const fileId = `file-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
      const decodedFilename = decodeFilename(file.originalname);
      
      db.prepare(`
        INSERT INTO files (id, content_id, filename, stored_filename, mime_type, size)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        fileId,
        content_id,
        decodedFilename,
        file.filename,
        file.mimetype,
        file.size
      );

      uploadedFiles.push({
        id: fileId,
        filename: decodedFilename,
        mime_type: file.mimetype,
        size: file.size
      });
    }

    res.status(201).json({
      message: 'Files uploaded successfully',
      files: uploadedFiles
    });
  } catch (error) {
    console.error('File upload error:', error);
    // Clean up uploaded files on error
    if (req.files) {
      req.files.forEach(file => {
        try {
          fs.unlinkSync(file.path);
        } catch (e) {
          console.error('Error deleting file:', e);
        }
      });
    }
    res.status(500).json({ error: 'Failed to upload files' });
    }
  });
});

// Get files for content
app.get('/api/files/content/:content_id', (req, res) => {
  try {
    const files = db.prepare(`
      SELECT id, filename, mime_type, size, uploaded_at
      FROM files
      WHERE content_id = ?
      ORDER BY uploaded_at ASC
    `).all(req.params.content_id);

    res.json(files);
  } catch (error) {
    console.error('Get files error:', error);
    res.status(500).json({ error: 'Failed to fetch files' });
  }
});

// Download/stream file
app.get('/api/files/download/:file_id', (req, res) => {
  try {
    const file = db.prepare(`
      SELECT * FROM files WHERE id = ?
    `).get(req.params.file_id);

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    const filePath = path.join(UPLOADS_DIR, file.stored_filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found on disk' });
    }

    // Set appropriate headers with proper UTF-8 encoding for Arabic filenames
    // RFC 5987: Use both ASCII fallback and UTF-8 encoded filename
    const filename = file.filename;
    const encodedFilename = encodeURIComponent(filename);
    
    // Create ASCII-safe fallback filename (replace non-ASCII with underscore)
    const asciiFallback = filename.replace(/[^\x00-\x7F]/g, '_');
    
    res.setHeader('Content-Type', file.mime_type);
    // Support both old and new browsers
    // Use ASCII fallback for old browsers, UTF-8 encoded for modern browsers
    res.setHeader('Content-Disposition', `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodedFilename}`);
    res.setHeader('Content-Length', file.size);

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
    fileStream.on('error', (error) => {
      console.error('File stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to stream file' });
      }
    });
  } catch (error) {
    console.error('Download file error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to download file' });
    }
  }
});

// Delete file
app.delete('/api/files/:file_id', authenticateToken, (req, res) => {
  try {
    const file = db.prepare('SELECT * FROM files WHERE id = ?').get(req.params.file_id);
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Check permissions - only admin or content author can delete
    const content = db.prepare('SELECT author_id FROM content WHERE id = ?').get(file.content_id);
    if (req.user.role !== 'admin' && content.author_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete file from disk
    const filePath = path.join(UPLOADS_DIR, file.stored_filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete from database
    db.prepare('DELETE FROM files WHERE id = ?').run(req.params.file_id);

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// ============================================================================
// CONTENT ROUTES
// ============================================================================

// Get all content
app.get('/api/content', (req, res) => {
  try {
    const { type, subject_id, page = '1', limit = '20' } = req.query;
    
    // Parse pagination parameters
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const offset = (pageNum - 1) * limitNum;
    
    // Validate pagination parameters
    if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({ error: 'Invalid pagination parameters' });
    }
    
    let query = `
      SELECT c.*, u.username as author_name, u.full_name as author_full_name
      FROM content c
      LEFT JOIN users u ON c.author_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (type) {
      query += ' AND c.type = ?';
      params.push(type);
    }

    if (subject_id) {
      query += ' AND c.subject_id = ?';
      params.push(subject_id);
    }

    // Get total count for pagination
    const countQuery = query.replace(
      'SELECT c.*, u.username as author_name, u.full_name as author_full_name',
      'SELECT COUNT(*) as total'
    );
    const { total } = db.prepare(countQuery).get(...params);

    // Add pagination
    query += ' ORDER BY c.created_at DESC LIMIT ? OFFSET ?';
    params.push(limitNum, offset);

    const content = db.prepare(query).all(...params);
    
    // Parse media_urls JSON for each content item
    content.forEach(item => {
      if (item.media_urls) {
        try {
          item.media_urls = JSON.parse(item.media_urls);
        } catch (e) {
          item.media_urls = [];
        }
      } else {
        item.media_urls = [];
      }
    });
    
    res.json({
      data: content,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasMore: offset + content.length < total
      }
    });
  } catch (error) {
    console.error('Get content error:', error);
    res.status(500).json({ error: 'Failed to fetch content' });
  }
});

// Get content by ID
app.get('/api/content/:id', (req, res) => {
  try {
    const content = db.prepare(`
      SELECT c.*, u.username as author_name, u.full_name as author_full_name
      FROM content c
      LEFT JOIN users u ON c.author_id = u.id
      WHERE c.id = ?
    `).get(req.params.id);

    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    // Parse media_urls JSON string back to array
    if (content.media_urls) {
      try {
        content.media_urls = JSON.parse(content.media_urls);
      } catch (e) {
        content.media_urls = [];
      }
    } else {
      content.media_urls = [];
    }

    res.json(content);
  } catch (error) {
    console.error('Get content error:', error);
    res.status(500).json({ error: 'Failed to fetch content' });
  }
});

// Create content
app.post('/api/content', authenticateToken, (req, res) => {
  try {
    const { title, body, type, subject_id, urls } = req.body;

    // Check permissions
    if (req.user.role === 'teacher') {
      const user = db.prepare('SELECT assigned_subject_id FROM users WHERE id = ?').get(req.user.id);
      if (subject_id && subject_id !== user.assigned_subject_id) {
        return res.status(403).json({ error: 'Teachers can only post to their assigned subject' });
      }
    }

    const id = `content-${Date.now()}`;

    // Convert urls array to JSON string, default to empty array
    const mediaUrlsJson = urls && Array.isArray(urls) ? JSON.stringify(urls) : '[]';

    // Convert undefined to null for SQL compatibility
    db.prepare(`
      INSERT INTO content (id, title, body, type, subject_id, author_id, media_urls)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, 
      title || null, 
      body || null, 
      type || null, 
      subject_id || null, 
      req.user.id || null,
      mediaUrlsJson
    );

    const content = db.prepare(`
      SELECT c.*, u.username as author_name, u.full_name as author_full_name
      FROM content c
      LEFT JOIN users u ON c.author_id = u.id
      WHERE c.id = ?
    `).get(id);

    // Parse media_urls JSON string back to array
    if (content && content.media_urls) {
      try {
        content.media_urls = JSON.parse(content.media_urls);
      } catch (e) {
        content.media_urls = [];
      }
    } else {
      content.media_urls = [];
    }

    res.status(201).json(content);
  } catch (error) {
    console.error('Create content error:', error);
    res.status(500).json({ error: 'Failed to create content' });
  }
});

// Update content
app.put('/api/content/:id', authenticateToken, (req, res) => {
  try {
    const { title, body, type, subject_id, urls } = req.body;
    const contentId = req.params.id;

    const content = db.prepare('SELECT * FROM content WHERE id = ?').get(contentId);
    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    // Check permissions
    if (req.user.role !== 'admin' && content.author_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updates = [];
    const values = [];

    if (title !== undefined) {
      updates.push('title = ?');
      values.push(title);
    }
    if (body !== undefined) {
      updates.push('body = ?');
      values.push(body);
    }
    if (type !== undefined) {
      updates.push('type = ?');
      values.push(type);
    }
    if (subject_id !== undefined) {
      updates.push('subject_id = ?');
      values.push(subject_id);
    }
    if (urls !== undefined) {
      updates.push('media_urls = ?');
      values.push(Array.isArray(urls) ? JSON.stringify(urls) : '[]');
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(contentId);

    db.prepare(`UPDATE content SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    const updatedContent = db.prepare(`
      SELECT c.*, u.username as author_name, u.full_name as author_full_name
      FROM content c
      LEFT JOIN users u ON c.author_id = u.id
      WHERE c.id = ?
    `).get(contentId);

    // Parse media_urls JSON string back to array
    if (updatedContent && updatedContent.media_urls) {
      try {
        updatedContent.media_urls = JSON.parse(updatedContent.media_urls);
      } catch (e) {
        updatedContent.media_urls = [];
      }
    } else {
      updatedContent.media_urls = [];
    }

    res.json(updatedContent);
  } catch (error) {
    console.error('Update content error:', error);
    res.status(500).json({ error: 'Failed to update content' });
  }
});

// Delete content
app.delete('/api/content/:id', authenticateToken, (req, res) => {
  try {
    const content = db.prepare('SELECT * FROM content WHERE id = ?').get(req.params.id);
    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    // Check permissions
    if (req.user.role !== 'admin' && content.author_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get all files associated with this content
    const files = db.prepare('SELECT * FROM files WHERE content_id = ?').all(req.params.id);
    
    // Delete physical files from disk
    files.forEach(file => {
      const filePath = path.join(UPLOADS_DIR, file.stored_filename);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (e) {
          console.error('Error deleting file:', e);
        }
      }
    });

    // Delete content (CASCADE will delete file records from database)
    db.prepare('DELETE FROM content WHERE id = ?').run(req.params.id);
    res.json({ message: 'Content deleted successfully' });
  } catch (error) {
    console.error('Delete content error:', error);
    res.status(500).json({ error: 'Failed to delete content' });
  }
});

// ============================================================================
// DATABASE MANAGEMENT ROUTES
// ============================================================================

// Get database statistics
app.get('/api/database/stats', authenticateToken, isAdmin, (req, res) => {
  try {
    const stats = {
      users: db.prepare('SELECT COUNT(*) as count FROM users').get().count,
      subjects: db.prepare('SELECT COUNT(*) as count FROM subjects').get().count,
      content: db.prepare('SELECT COUNT(*) as count FROM content').get().count,
      files: db.prepare('SELECT COUNT(*) as count FROM files').get().count,
      totalFileSize: db.prepare('SELECT COALESCE(SUM(size), 0) as total FROM files').get().total,
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Get database stats error:', error);
    res.status(500).json({ error: 'Failed to get database statistics' });
  }
});

// Export database
app.get('/api/database/export', authenticateToken, isAdmin, (req, res) => {
  try {
    const data = {
      users: db.prepare('SELECT id, username, full_name, role, subject_id, active, created_at FROM users').all(),
      subjects: db.prepare('SELECT * FROM subjects').all(),
      content: db.prepare('SELECT * FROM content').all(),
      files: db.prepare('SELECT * FROM files').all(),
      exportedAt: new Date().toISOString(),
      version: '2.0.0'
    };
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="school_database_${new Date().toISOString().split('T')[0]}.json"`);
    res.json(data);
  } catch (error) {
    console.error('Export database error:', error);
    res.status(500).json({ error: 'Failed to export database' });
  }
});

// Import database
app.post('/api/database/import', authenticateToken, isAdmin, express.json({ limit: '50mb' }), (req, res) => {
  try {
    const data = req.body;
    
    if (!data || !data.version) {
      return res.status(400).json({ error: 'Invalid database file' });
    }
    
    // Start transaction
    db.prepare('BEGIN TRANSACTION').run();
    
    try {
      // Clear existing data (except admin user)
      db.prepare('DELETE FROM files').run();
      db.prepare('DELETE FROM content').run();
      db.prepare('DELETE FROM subjects').run();
      db.prepare("DELETE FROM users WHERE username != 'admin'").run();
      
      // Import subjects
      if (data.subjects && Array.isArray(data.subjects)) {
        const insertSubject = db.prepare('INSERT OR REPLACE INTO subjects (id, name, description, created_at) VALUES (?, ?, ?, ?)');
        for (const subject of data.subjects) {
          insertSubject.run(subject.id, subject.name, subject.description, subject.created_at);
        }
      }
      
      // Import users (skip admin)
      if (data.users && Array.isArray(data.users)) {
        const insertUser = db.prepare('INSERT OR REPLACE INTO users (id, username, password, full_name, role, subject_id, active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
        for (const user of data.users) {
          if (user.username !== 'admin') {
            insertUser.run(user.id, user.username, user.password, user.full_name, user.role, user.subject_id, user.active, user.created_at);
          }
        }
      }
      
      // Import content
      if (data.content && Array.isArray(data.content)) {
        const insertContent = db.prepare('INSERT OR REPLACE INTO content (id, title, body, type, subject_id, author_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
        for (const content of data.content) {
          insertContent.run(content.id, content.title, content.body, content.type, content.subject_id, content.author_id, content.created_at, content.updated_at);
        }
      }
      
      // Import files metadata (note: actual files won't be restored)
      if (data.files && Array.isArray(data.files)) {
        const insertFile = db.prepare('INSERT OR REPLACE INTO files (id, content_id, filename, stored_filename, mime_type, size, uploaded_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
        for (const file of data.files) {
          insertFile.run(file.id, file.content_id, file.filename, file.stored_filename, file.mime_type, file.size, file.uploaded_at);
        }
      }
      
      // Commit transaction
      db.prepare('COMMIT').run();
      
      res.json({ 
        message: 'Database imported successfully',
        warning: 'Note: File metadata imported, but actual files need to be restored separately'
      });
    } catch (error) {
      // Rollback on error
      db.prepare('ROLLBACK').run();
      throw error;
    }
  } catch (error) {
    console.error('Import database error:', error);
    res.status(500).json({ error: 'Failed to import database' });
  }
});

// Clear all data (except admin)
app.post('/api/database/clear', authenticateToken, isAdmin, (req, res) => {
  try {
    // Start transaction
    db.prepare('BEGIN TRANSACTION').run();
    
    try {
      // Delete all files from disk
      const files = db.prepare('SELECT stored_filename FROM files').all();
      for (const file of files) {
        const filePath = path.join(UPLOADS_DIR, file.stored_filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      
      // Clear database tables
      db.prepare('DELETE FROM files').run();
      db.prepare('DELETE FROM content').run();
      db.prepare('DELETE FROM subjects').run();
      db.prepare("DELETE FROM users WHERE username != 'admin'").run();
      
      // Commit transaction
      db.prepare('COMMIT').run();
      
      res.json({ message: 'Database cleared successfully' });
    } catch (error) {
      // Rollback on error
      db.prepare('ROLLBACK').run();
      throw error;
    }
  } catch (error) {
    console.error('Clear database error:', error);
    res.status(500).json({ error: 'Failed to clear database' });
  }
});

// ============================================================================
// SEARCH ENDPOINTS
// ============================================================================

// Search content, subjects, and users
app.get('/api/search', (req, res) => {
  try {
    const { q, type, limit = 20 } = req.query;
    
    if (!q || q.trim().length === 0) {
      return res.json({
        content: [],
        subjects: [],
        users: [],
        total: 0
      });
    }
    
    const searchTerm = `%${q.trim()}%`;
    const searchLimit = Math.min(parseInt(limit) || 20, 100);
    
    const results = {
      content: [],
      subjects: [],
      users: [],
      total: 0
    };
    
    // Search content (if type is 'all' or 'content')
    if (!type || type === 'all' || type === 'content') {
      const contentQuery = `
        SELECT 
          c.*,
          u.username as author_name,
          u.full_name as author_full_name,
          s.name as subject_name
        FROM content c
        LEFT JOIN users u ON c.author_id = u.id
        LEFT JOIN subjects s ON c.subject_id = s.id
        WHERE c.title LIKE ? OR c.body LIKE ?
        ORDER BY c.created_at DESC
        LIMIT ?
      `;
      results.content = db.prepare(contentQuery).all(searchTerm, searchTerm, searchLimit);
    }
    
    // Search subjects (if type is 'all' or 'subjects')
    if (!type || type === 'all' || type === 'subjects') {
      const subjectsQuery = `
        SELECT * FROM subjects
        WHERE name LIKE ? OR description LIKE ?
        ORDER BY name ASC
        LIMIT ?
      `;
      results.subjects = db.prepare(subjectsQuery).all(searchTerm, searchTerm, searchLimit);
    }
    
    // Search users (admin only, if type is 'all' or 'users')
    if ((!type || type === 'all' || type === 'users') && req.user && req.user.role === 'admin') {
      const usersQuery = `
        SELECT id, username, full_name, role, is_active, created_at
        FROM users
        WHERE username LIKE ? OR full_name LIKE ?
        ORDER BY username ASC
        LIMIT ?
      `;
      results.users = db.prepare(usersQuery).all(searchTerm, searchTerm, searchLimit);
    }
    
    results.total = results.content.length + results.subjects.length + results.users.length;
    
    res.json(results);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// ============================================================================
// SERVE REACT APP (Catch-all route for production)
// ============================================================================

// All other GET routes serve the React app (Express 5 compatible)
app.get(/^\/(?!api\/).*/, (req, res) => {
  // Serve React app for all non-API routes
  res.sendFile(path.join(distPath, 'index.html'));
});

// ============================================================================
// START SERVER
// ============================================================================

console.log('About to start server on port', PORT);

// Create HTTP server
const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📊 Database: SQLite (server/school.db)`);
  console.log(`🔐 Default admin: username=admin, password=admin123`);
  console.log(`📦 Max upload size: 500MB`);
  if (ENABLE_GEO_RESTRICTION) {
    console.log(`🌍 Geo-restriction: ENABLED - Allowed countries: ${ALLOWED_COUNTRIES.join(', ')}`);
  } else {
    console.log(`🌍 Geo-restriction: DISABLED - All countries allowed`);
  }
});

server.on('error', (err) => {
  console.error('Server error:', err);
  process.exit(1);
});

console.log('Server listen called, server object:', !!server);
