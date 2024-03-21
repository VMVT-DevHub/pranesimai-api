const commonFields = (table) => {
  table.timestamp('createdAt');
  table.timestamp('updatedAt');
  table.timestamp('deletedAt');
};

exports.commonFields = commonFields;

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema
    .createTable('surveys', (table) => {
      table.increments('id');
      table.string('title');
      table.text('description');
      table.text('icon');
      table.integer('firstPageId').unsigned();
      table.integer('lastPageId').unsigned();

      commonFields(table);
    })

    .createTable('pages', (table) => {
      table.increments('id');
      table.string('title');
      table.text('description');
      table.enum('type', ['STATIC', 'DYNAMIC']).defaultTo('STATIC');

      commonFields(table);
    })

    .createTable('questions', (table) => {
      table.increments('id');
      table.integer('pageId').unsigned();
      table.integer('surveyId').unsigned();
      table.boolean('required');
      table.boolean('riskEvaluation');
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
      table.string('title');
      table.text('description');
      table.string('hint');
      table.json('condition');
      table.json('data');
      table.integer('nextQuestionId').unsigned();

      commonFields(table);
    })

    .createTable('questionOptions', (table) => {
      table.increments('id');
      table.integer('questionId').unsigned();
      table.string('title');
      table.text('description');
      table.string('hint');
      table.text('icon');
      table.json('data');
      table.integer('nextQuestionId').unsigned();

      commonFields(table);
    })

    .createTable('sessions', (table) => {
      table.increments('id');
      table.string('token');
      table.integer('surveyId').unsigned();
      table.integer('lastResponseId').unsigned();
      table.timestamp('finishedAt');

      commonFields(table);
    })

    .createTable('responses', (table) => {
      table.increments('id');
      table.integer('sessionId').unsigned();
      table.integer('pageId').unsigned();
      table.integer('previousResponseId').unsigned();
      table.json('questions');
      table.json('values');

      commonFields(table);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema
    .dropTable('surveys')
    .dropTable('pages')
    .dropTable('questions')
    .dropTable('questionOptions')
    .dropTable('sessions')
    .dropTable('responses');
};
