import { MigrationBuilder } from "node-pg-migrate";
import type { ColumnDefinitions } from "node-pg-migrate";
export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
    pgm.createTable("refresh_sessions", {
        id: {
            type: "uuid",
            primaryKey: true,
            default: pgm.func("gen_random_uuid()"),
        },
        refresh_token_hash: { type: "text", notNull: true, unique: true },
        user_id: {
            type: "uuid",
            notNull: true,
            references: "users",
            onDelete: "CASCADE",
        },
        device_type: { type: "text" },
        device_name: { type: "text" },
        user_agent: { type: "text" },
        ip_address: { type: "text" },
        expires_at: { type: "timestamptz", notNull: true },
        revoked_at: { type: "timestamptz" },
        created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
        last_used_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
    });

    pgm.createIndex("refresh_sessions", "user_id");
    pgm.createIndex("refresh_sessions", "refresh_token_hash");
    pgm.createIndex("refresh_sessions", ["user_id", "revoked_at"]);

    pgm.createFunction(
        "set_last_used_at",
        [],
        { returns: "trigger", language: "plpgsql" },
        `
    BEGIN
      NEW.last_used_at = now();
      RETURN NEW;
    END;
    `
    );

    pgm.createTrigger("refresh_sessions", "trg_refresh_sessions_last_used_at", {
        when: "BEFORE",
        operation: "UPDATE",
        function: "set_last_used_at",
        level: "ROW",
    });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
    pgm.dropTable("refresh_sessions");
    pgm.dropFunction("set_last_used_at", []);
}