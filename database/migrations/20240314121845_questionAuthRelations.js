/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.alterTable('questions', (table) => {
    table.dropColumn('data');
    table.enu('authRelation', ['EMAIL', 'PHONE']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.alterTable('questions', (table) => {
    table.json('data');
    table.dropColumn('authRelation');
  });
};
