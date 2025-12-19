#!/usr/bin/env node

/**
 * Production Server Entry Point
 * 
 * This script:
 * 1. Builds the React frontend (if not already built)
 * 2. Starts the Express backend API server
 * 3. The backend serves both API routes and static frontend files
 * 
 * Usage:
 *   node server.js
 *   NODE_ARGS="--port 8080" node server.js
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting School Management System...\n');

// Check if dist folder exists
const distPath = path.join(__dirname, 'dist');
if (!fs.existsSync(distPath)) {
  console.log('📦 Building frontend...');
  const build = spawn('npm', ['run', 'build'], {
    stdio: 'inherit'
  });

  build.on('close', (code) => {
    if (code !== 0) {
      console.error('❌ Build failed!');
      process.exit(1);
    }
    console.log('✅ Build complete!\n');
    startServer();
  });
} else {
  console.log('✅ Frontend already built\n');
  startServer();
}

function startServer() {
  console.log('🔌 Starting backend server...\n');
  
  // Start the backend server
  const server = spawn('node', ['server/index.cjs'], {
    stdio: 'inherit',
    env: { ...process.env }
  });

  server.on('close', (code) => {
    console.log(`Server exited with code ${code}`);
    process.exit(code);
  });

  // Handle termination signals
  process.on('SIGINT', () => {
    console.log('\n👋 Shutting down gracefully...');
    server.kill('SIGINT');
  });

  process.on('SIGTERM', () => {
    console.log('\n👋 Shutting down gracefully...');
    server.kill('SIGTERM');
  });
}
