import { MigrationBuilder } from "node-pg-migrate";


export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createType("student_status", ["UNVERIFIED", "VERIFIED"]);

  pgm.addColumns("users", {
    email_verified_at: { type: "timestamptz" },
    verification_token: { type: "text" },
    verification_token_expires_at: { type: "timestamptz" },
    student_status: { type: "student_status", notNull: true, default: "UNVERIFIED" },
    college_email: { type: "text", unique: true },
    college_verification_token: { type: "text" },
    college_verification_token_expires_at: { type: "timestamptz" },
    student_verified_at: { type: "timestamptz" },
  });

  pgm.dropColumns("users", ["is_verified"]);

  pgm.createIndex("users", "verification_token", { where: "verification_token IS NOT NULL" });
  pgm.createIndex("users", "college_verification_token", { where: "college_verification_token IS NOT NULL" });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropIndex("users", "college_verification_token");
  pgm.dropIndex("users", "verification_token");

  pgm.addColumns("users", { is_verified: { type: "boolean", notNull: true, default: false } });

  pgm.dropColumns("users", [
    "email_verified_at", "verification_token", "verification_token_expires_at",
    "student_status", "college_email", "college_verification_token",
    "college_verification_token_expires_at", "student_verified_at",
  ]);

  pgm.dropType("student_status");
}