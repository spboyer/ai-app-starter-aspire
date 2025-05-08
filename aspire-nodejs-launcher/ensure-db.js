// This script is used by Aspire to ensure the database exists before starting the application
// It will be called directly from the launcher

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

function runCommand(command, args, cwd) {
  return new Promise((resolve, reject) => {
    console.log(`Running command: ${command} ${args.join(' ')}`);
    
    const child = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      shell: true
    });
    
    child.on('close', code => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with code ${code}`));
      }
    });
    
    child.on('error', err => {
      reject(err);
    });
  });
}

async function main() {
  const apiPath = path.resolve(__dirname, '../NodeFortuneApi');
  const dbPath = path.join(apiPath, 'dev.sqlite3');
  
  console.log(`Checking for database at: ${dbPath}`);
  
  if (!fs.existsSync(dbPath)) {
    console.log('Database not found. Setting up...');
    
    try {
      await runCommand('npm', ['run', 'setup-db'], apiPath);
      console.log('Database setup complete.');
    } catch (error) {
      console.error('Failed to set up database:', error);
      process.exit(1);
    }
  } else {
    console.log('Database already exists.');
  }
}

main().catch(err => {
  console.error('Error setting up database:', err);
  process.exit(1);
});
