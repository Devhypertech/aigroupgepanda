// Simple test to check if server can start
console.log('Testing server startup...');
console.log('Node version:', process.version);
console.log('Current directory:', process.cwd());

// Check if .env exists
const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '.env');
console.log('.env exists:', fs.existsSync(envPath));

// Try to load dotenv
try {
  require('dotenv').config({ path: envPath });
  console.log('STREAM_API_KEY:', process.env.STREAM_API_KEY ? 'SET' : 'NOT SET');
  console.log('STREAM_API_SECRET:', process.env.STREAM_API_SECRET ? 'SET' : 'NOT SET');
} catch (e) {
  console.error('Error loading .env:', e.message);
}

// Try to import the main file
console.log('\nAttempting to import index.ts...');
try {
  // This will fail but show us the error
  require('./src/index.ts');
} catch (e) {
  console.error('Import error:', e.message);
  console.error('Stack:', e.stack);
}

