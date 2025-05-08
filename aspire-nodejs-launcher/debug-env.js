// Debug script for Aspire environment variables
// Run this script to check what environment variables are available

console.log('Environment Variables Debug');
console.log('==========================');
console.log('');

// Print all environment variables (excluding sensitive ones)
console.log('All Environment Variables:');
Object.keys(process.env)
  .sort()
  .filter(key => !key.toLowerCase().includes('key') && !key.toLowerCase().includes('secret') && !key.toLowerCase().includes('password'))
  .forEach(key => {
    console.log(`${key}=${process.env[key]}`);
  });

// Check specific variables we need
console.log('\nImportant Variables:');
const aspireVars = [
  'PORT',
  'NODE_ENV',
  'services__fortuneapi__http'
];

aspireVars.forEach(varName => {
  console.log(`${varName}=${process.env[varName] || '(not set)'}`);
});

// Check path configuration
console.log('\nPath Information:');
console.log(`Current directory: ${process.cwd()}`);
console.log(`__dirname: ${__dirname}`);

// Exit with success code
process.exit(0);
