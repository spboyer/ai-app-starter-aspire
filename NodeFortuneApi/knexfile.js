/** @type {import('knex').Knex.Config} */
module.exports = {
  client: 'sqlite3',
  connection: {
    filename: process.env.NODE_ENV === 'production' ? '/tmp/fortune.sqlite3' : './dev.sqlite3'
  },
  useNullAsDefault: true,
  migrations: {
    directory: './migrations'
  },
  seeds: {
    directory: './seeds'
  }
};
