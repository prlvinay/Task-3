module.exports = {
  client: "mysql2",
  connection: {
    host: "localhost",
    user: "root",
    password: "Vinay@2004",
    database: "inventory",
  },
  migrations: {
    tableName: "knex_migrations",
    directory: "./migrations",
  },
};
