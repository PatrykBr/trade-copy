// Simple bridge service starter
const { spawn } = require('child_process');
const path = require('path');

// Start the trade bridge service
const bridgeService = spawn('node', [path.join(__dirname, 'dist', 'trade-bridge.js')], {
  stdio: 'inherit',
  env: { ...process.env }
});

bridgeService.on('close', (code) => {
  console.log(`Bridge service exited with code ${code}`);
  process.exit(code);
});

bridgeService.on('error', (err) => {
  console.error('Failed to start bridge service:', err);
  process.exit(1);
});