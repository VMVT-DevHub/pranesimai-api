/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.alterTable('sessions', (table) => {
    table.boolean('auth');
    table.string('email');
    table.string('phone');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.alterTable('sessions', (table) => {
    table.dropColumns(['auth', 'email', 'phone']);
  });
};
