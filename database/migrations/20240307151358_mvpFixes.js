/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema
    .alterTable('surveys', (table) => {
      table.dropColumn('lastPageId');
      table.enum('authType', ['OPTIONAL', 'REQUIRED', 'NONE']);
    })
    .alterTable('pages', (table) => {
      table.json('progress');
      table.dropColumn('type');
    })
    .alterTable('questions', (table) => {
      table.dropColumn('type');
    })
    .alterTable('questions', (table) => {
      table
        .enum('type', [
          'DATE',
          'DATETIME',
          'SELECT',
          'MULTISELECT',
          'RADIO',
          'EMAIL',
          'INPUT',
          'TEXT',
          'FILES',
          'CHECKBOX',
          'LOCATION',
        ])
        .defaultTo('INPUT');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema
    .alterTable('surveys', (table) => {
      table.integer('firstPageId').unsigned();
      table.dropColumn('authType');
    })
    .alterTable('pages', (table) => {
      table.dropColumn('progress');
      table.enum('type', ['STATIC', 'DYNAMIC']).defaultTo('STATIC');
    })
    .alterTable('questions', (table) => {
      table.dropColumn('type');
    })
    .alterTable('questions', (table) => {
      table
        .enum('type', [
          'AUTH',
          'DATE',
          'DATETIME',
          'SELECT',
          'MULTISELECT',
          'RADIO',
          'EMAIL',
          'INPUT',
          'TEXT',
          'FILES',
          'CHECKBOX',
          'LOCATION',
        ])
        .defaultTo('INPUT');
    });
};
