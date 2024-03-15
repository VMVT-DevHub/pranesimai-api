/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema
    .alterTable('questions', (table) => {
      table.integer('priority');
    })
    .alterTable('surveys', (table) => {
      table.integer('priority');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema
    .alterTable('questions', (table) => {
      table.dropColumn('priority');
    })
    .alterTable('surveys', (table) => {
      table.dropColumn('priority');
    });
};
