import { MigrationBuilder } from "node-pg-migrate";

export const up = (pgm: MigrationBuilder): void => {
  pgm.renameType("student_status", "user_status");
  pgm.renameColumn("users", "student_status", "user_status");
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.renameColumn("users", "user_status", "student_status");
  pgm.renameType("user_status", "student_status");
};