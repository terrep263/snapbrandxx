const { spawn } = require('child_process');
const { exec } = require('child_process');

// Start Next.js dev server
const nextDev = spawn('npm', ['run', 'dev'], {
  stdio: 'inherit',
  shell: true
});

// Wait a bit for server to start, then open Chrome
setTimeout(() => {
  exec('start chrome http://localhost:3000', (error) => {
    if (error) {
      console.log('Could not open Chrome automatically. Please open http://localhost:3000 manually.');
    }
  });
}, 3000);

nextDev.on('close', (code) => {
  process.exit(code);
});


