const { schema } = require('../common');

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.withSchema(schema).alterTable('questionOptions', (table) => {
    table.integer('priority');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.withSchema(schema).alterTable('questionOptions', (table) => {
    table.dropColumn('priority');
  });
};
