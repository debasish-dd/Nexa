/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
    // At most one admin per conversation, enforced by the database itself.
    pgm.sql(`
        CREATE UNIQUE INDEX IF NOT EXISTS one_admin_per_conversation
        ON conversation_participants (conversation_id)
        WHERE role = 'admin';
    `);
};

/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
    pgm.sql("DROP INDEX IF EXISTS one_admin_per_conversation;");
};