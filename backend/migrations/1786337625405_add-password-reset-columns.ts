// migrations/<timestamp>_add-password-reset-columns.ts
import type { MigrationBuilder } from "node-pg-migrate";

export const up = (pgm: MigrationBuilder): void => {
  pgm.addColumns("users", {
    password_reset_token_hash: { type: "text" },
    password_reset_expires_at: { type: "timestamptz" },
    
  });
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.dropColumns("users", [
    "password_reset_token_hash",
    "password_reset_expires_at",
  ]);
};