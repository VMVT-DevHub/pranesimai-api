const { commonFields, schema } = require('../common');

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema
    .withSchema(schema)
    .createTable('reports', (table) => {
      table.increments('id');
      table.integer('sessionId').unsigned();
      table.integer('surveyId').unsigned();
      table.timestamp('startedAt');
      table.timestamp('finishedAt');
      table.boolean('auth');
      table.string('email');
      table.string('phone');
      table.json('answers');
      table.text('csv');

      commonFields(table);
    })

    .alterTable('pages', (table) => {
      table.dropColumn('progress');
    })

    .alterTable('responses', (table) => {
      table.json('progress');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema
    .withSchema(schema)
    .dropTable('reports')

    .alterTable('pages', (table) => {
      table.json('progress');
    })

    .alterTable('responses', (table) => {
      table.dropColumn('progress');
    });
};
