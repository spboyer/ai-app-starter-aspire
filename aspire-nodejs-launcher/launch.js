// This is a helper script that's used by .NET Aspire to launch Node.js applications
// It ensures proper environment variable handling and service communication

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Retrieve command line arguments
const [, , projectDir, ...npmArgs] = process.argv;

// Default to 'start' script if no arguments are provided
const args = npmArgs.length > 0 ? npmArgs : ['start'];

console.log(`Starting Node.js app in ${projectDir} with command: npm ${args.join(' ')}`);
console.log(`Current working directory: ${process.cwd()}`);
console.log(`Project directory: ${projectDir}`);

// Resolve the full project path (handle relative paths)
const fullProjectPath = path.resolve(projectDir);
console.log(`Full project path: ${fullProjectPath}`);

// Check if package.json exists
const packageJsonPath = path.join(fullProjectPath, 'package.json');
if (!fs.existsSync(packageJsonPath)) {
  console.error(`Error: package.json not found at ${packageJsonPath}`);
  process.exit(1);
}

// Read package.json to get project name
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
console.log(`Starting ${packageJson.name} (${packageJson.description || 'No description'})`);

// Print environment variables passed from Aspire
console.log('\nUsing environment variables:');
['PORT', 'NODE_ENV', 'services__fortuneapi__http'].forEach(key => {
  if (process.env[key]) {
    console.log(`  ${key}=${process.env[key]}`);
  }
});

// First run the database setup if this is the API
if (packageJson.name === 'node-fortune-api') {
  // Ensure the database is initialized before starting the API
  try {
    if (!fs.existsSync(path.join(fullProjectPath, 'dev.sqlite3'))) {
      console.log('Setting up the database...');
      // Run migrations and seeds
      const setupProcess = spawn('npm', ['run', 'setup-db'], {
        cwd: fullProjectPath,
        stdio: 'inherit',
        shell: true
      });
      
      setupProcess.on('close', (code) => {
        if (code !== 0) {
          console.error(`Database setup failed with code ${code}`);
          process.exit(code);
        }
        startNpmProcess();
      });
    } else {
      startNpmProcess();
    }
  } catch (error) {
    console.error('Error during database setup:', error);
    process.exit(1);
  }
} else {
  startNpmProcess();
}

function startNpmProcess() {
  // Launch the npm process with the provided arguments
  const npmProcess = spawn('npm', args, {
    cwd: fullProjectPath,
    stdio: 'inherit',
    shell: true,
    env: process.env
  });

  // Handle process events
  npmProcess.on('error', (err) => {
    console.error(`Failed to start npm process: ${err}`);
    process.exit(1);
  });

  npmProcess.on('close', (code) => {
    console.log(`npm process exited with code ${code}`);
    process.exit(code);
  });

  // Forward signals to the child process
  ['SIGINT', 'SIGTERM'].forEach(signal => {
    process.on(signal, () => {
      if (!npmProcess.killed) {
        npmProcess.kill(signal);
      }
    });
  });
}
