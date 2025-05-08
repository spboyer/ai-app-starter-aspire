import knex from 'knex';
// Import knexfile using require since it's a CommonJS module
const config = require('../knexfile.js');

// Initialize the database connection
const db = knex(config);

async function setupDatabase() {
  try {
    console.log('Running migrations...');
    await db.migrate.latest();
    
    console.log('Running seeds...');
    await db.seed.run();
    
    console.log('Database setup complete.');
    
    // Close the connection
    await db.destroy();
    
    process.exit(0);
  } catch (error) {
    console.error('Error setting up database:', error);
    
    // Close the connection
    await db.destroy();
    
    process.exit(1);
  }
}

// Run the setup
setupDatabase();
