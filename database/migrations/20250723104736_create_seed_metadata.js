/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const exists = await knex.schema.withSchema('pranesimai').hasTable('seed_metadata');
  if (!exists) {
    await knex.schema.withSchema('pranesimai').createTable('seed_metadata', (table) => {
      table.increments('id').primary();
      table.string('key').notNullable().unique();
      table.string('hash').notNullable();
      table.string('version');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.withSchema('pranesimai').dropTableIfExists('seed_metadata');
};
