import { randomUUID } from "node:crypto";
import { getPool } from "../../src/db/pool";

export interface TestUser {
  id: string;
  username: string;
  email: string;
}

// Inserts one user. Only username, email and password_hash are required;
// everything else on the users table has a default or allows NULL.
export async function createUser(
  overrides: Partial<Pick<TestUser, "username" | "email">> = {}
): Promise<TestUser> {
  // Random suffix so two users never collide on the unique columns.
  const suffix = randomUUID().slice(0, 8);
  const username = overrides.username ?? `user_${suffix}`;
  const email = overrides.email ?? `user_${suffix}@test.local`;

  const result = await getPool().query<TestUser>(
    `
    INSERT INTO users (username, email, password_hash)
    VALUES ($1, $2, $3)
    RETURNING id, username, email
    `,
    [username, email, "not-a-real-hash"]
  );

  const user = result.rows[0];

  if (!user) {
    throw new Error("createUser: insert returned no row");
  }

  return user;
}

// Empties every table in the public schema except the migration tracker.
export async function resetDatabase(): Promise<void> {
  const pool = getPool();

  // Second safety net, on top of the check in setup.ts: never wipe a
  // database that isn't a test database.
  const dbResult = await pool.query<{ name: string }>(
    "SELECT current_database() AS name"
  );
  const dbName = dbResult.rows[0]?.name;

  if (!dbName || !dbName.endsWith("_test")) {
    throw new Error(`resetDatabase refused: "${dbName}" is not a _test database`);
  }

  // Table names come from the database, so tables you add later are covered
  // automatically. If your migration table isn't called "pgmigrations",
  // change the name below.
  const tables = await pool.query<{ tablename: string }>(
    `
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename <> 'pgmigrations'
    `
  );

  if (tables.rows.length === 0) return;

  const tableList = tables.rows.map((t) => `"${t.tablename}"`).join(", ");

  // One statement: CASCADE follows the foreign keys, so the order of the
  // tables doesn't matter.
  await pool.query(`TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE`);
}