exports.up = function(knex) {
  return knex.schema.createTable('change_log', function(table) {
    table.increments('change_id').primary();  // Primary Key
    table.string('table_name').notNullable();
    table.integer('record_id').notNullable();
    table.integer('changed_by').unsigned().references('user_id').inTable('users');  // Foreign Key to users
    table.timestamp('change_date').defaultTo(knex.fn.now());
    table.enum('change_type', ['insert', 'update', 'delete']).notNullable();
    table.text('old_value').nullable();
    table.text('new_value').nullable();
    table.enum('status', ['0', '1', '2', '99']).defaultTo('0');  // Default status is 'created'
    table.timestamps(true, true);  // Created and updated timestamps
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('change_log');
};
