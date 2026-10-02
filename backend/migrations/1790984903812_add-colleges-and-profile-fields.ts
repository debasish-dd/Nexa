import type { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
    pgm.createTable("colleges", {
        id: {
            type: "uuid",
            primaryKey: true,
            default: pgm.func("gen_random_uuid()"),
        },
        name: { type: "text", notNull: true },
        short_name: { type: "text", notNull: true },
        email_domain: {
            type: "text",
            notNull: true,
            unique: true,
            check: "email_domain = lower(email_domain)",
        },
        created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
    });

    pgm.addColumns("users", {
        college_id: { type: "uuid", references: "colleges", onDelete: "RESTRICT" },
        graduation_year: { type: "smallint" },
        display_name: { type: "varchar(50)" },
        pending_college_email: { type: "text" },
    });

    pgm.addConstraint("users", "users_college_emails_lowercase", {
        check:
            "college_email = lower(college_email) AND pending_college_email = lower(pending_college_email)",
    });

    pgm.createIndex("users", "college_id");

    pgm.renameColumn("users", "college_verification_token", "college_verification_token_hash");

    pgm.sql(`
    INSERT INTO colleges (name, short_name, email_domain)
    VALUES ('RCC Institute of Information Technology', 'RCCIIT', 'rcciit.org.in')
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
    pgm.renameColumn("users", "college_verification_token_hash", "college_verification_token");
    pgm.dropConstraint("users", "users_college_emails_lowercase");
    pgm.dropColumns("users", [
        "college_id",
        "graduation_year",
        "display_name",
        "pending_college_email",
    ]);
    pgm.dropTable("colleges");
}