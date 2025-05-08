import knex from 'knex';
// Import knexfile using require since it's a CommonJS module
const config = require('../knexfile.js');

const db = knex(config);
export default db;
