const { schema } = require('../common');

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema
    .withSchema(schema)

    .alterTable('pages', (table) => {
      table.jsonb('dynamicFields');
    })

    .alterTable('questions', (table) => {
      table.jsonb('dynamicFields');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema
    .withSchema(schema)

    .alterTable('pages', (table) => {
      table.dropColumn('dynamicFields');
    })

    .alterTable('questions', (table) => {
      table.dropColumn('dynamicFields');
    });
};
