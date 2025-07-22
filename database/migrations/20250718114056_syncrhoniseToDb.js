/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const existsQuestionsTable = await knex.schema.hasTable('questions');
  if (existsQuestionsTable) {
    await knex.raw(`
      CREATE INDEX IF NOT EXISTS idx_questions_survey ON pranesimai.questions USING btree (survey_id);
    `);
  }

  const existsReportsTable = await knex.schema.hasTable('reports');
  if (existsReportsTable) {
    await knex.raw(`
      CREATE INDEX IF NOT EXISTS idx_reports_survey ON pranesimai.reports USING btree (survey_id);
    `);
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.raw(`
    DROP INDEX IF EXISTS pranesimai.idx_questions_survey;
  `);

  await knex.raw(`
    DROP INDEX IF EXISTS pranesimai.idx_reports_survey;
  `);
};
