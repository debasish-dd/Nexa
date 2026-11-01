import { beforeEach, describe, expect, it } from "vitest";
import { getPool } from "../src/db/pool";
import { createUser, resetDatabase } from "./helpers/db";

describe("test helpers", () => {
  // Every test in this file starts from empty tables.
  beforeEach(resetDatabase);

  it("createUser inserts users with unique ids, usernames and emails", async () => {
    const a = await createUser();
    const b = await createUser();

    expect(a.id).not.toBe(b.id);
    expect(a.username).not.toBe(b.username);
    expect(a.email).not.toBe(b.email);

    const { rows } = await getPool().query(
      "SELECT count(*)::int AS n FROM users"
    );
    expect(rows[0].n).toBe(2);
  });

  it("resetDatabase empties the tables but keeps the migrations table", async () => {
    await createUser();
    await resetDatabase();

    const users = await getPool().query(
      "SELECT count(*)::int AS n FROM users"
    );
    expect(users.rows[0].n).toBe(0);

    const migrations = await getPool().query(
      "SELECT count(*)::int AS n FROM pgmigrations"
    );
    expect(migrations.rows[0].n).toBeGreaterThan(0);
  });
});