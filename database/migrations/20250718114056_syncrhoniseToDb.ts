import { Knex } from 'knex';

// NOTE: Some changes were applied directly to the database without using knex,
// this migration is to synchronize those changes.
// After comparing the SQL dump files, the differences found were a few views and indices.

export async function up(knex: Knex): Promise<void> {
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

  await knex.raw(`
    CREATE VIEW IF NOT EXISTS pranesimai.sp_reports AS
    SELECT r.id, r.survey_id AS survey, s.title, r.auth, r.email, r.phone, r.created_at AS date, r.answers
    FROM pranesimai.reports r
    LEFT JOIN pranesimai.surveys s ON r.survey_id = s.id;
  `);

  await knex.raw(`
    CREATE VIEW IF NOT EXISTS pranesimai.sp_surveys AS
    SELECT s.id AS survey, s.sp_list, q.id AS question, q.sp_field
    FROM pranesimai.surveys s
    LEFT JOIN pranesimai.questions q ON s.id = q.survey_id
    WHERE q.sp_field IS NOT NULL;
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    DROP INDEX IF EXISTS pranesimai.idx_questions_survey;
  `);

  await knex.raw(`
    DROP INDEX IF EXISTS pranesimai.idx_reports_survey;
  `);

  await knex.raw(`
    DROP VIEW IF EXISTS pranesimai.sp_reports;
  `);

  await knex.raw(`
    DROP VIEW IF EXISTS pranesimai.sp_surveys;
  `);
}
