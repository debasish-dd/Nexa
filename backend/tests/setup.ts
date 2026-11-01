import path from "node:path";
import { config } from "dotenv";
import { afterAll } from "vitest";
import { getPool } from "../src/db/pool";

// 1. Load ONLY .env.test, and let it win over anything already set.
const loaded = config({
  path: path.resolve(process.cwd(), ".env.test"),
  override: true,
  quiet: true,
});

if (loaded.error) {
  throw new Error(
    "Could not read backend/.env.test. Run the tests from the backend folder."
  );
}

// 2. Safety guard: these tests wipe tables, so only run on a *_test database.
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is missing from .env.test.");
}

const databaseName = decodeURIComponent(new URL(databaseUrl).pathname.slice(1));

if (!databaseName.endsWith("_test")) {
  // Prints only the database name, never the URL, because the URL holds the password.
  throw new Error(
    `Refusing to run: database "${databaseName}" does not end in "_test".`
  );
}

// 3. Close the connection pool after every test file, or the run can hang.
afterAll(async () => {
  await getPool().end();
});