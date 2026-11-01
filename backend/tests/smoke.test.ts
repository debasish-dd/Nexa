import { describe, expect, it } from "vitest";
import { getPool } from "../src/db/pool";

describe("test database", () => {
  it("is connected, and the database name ends in _test", async () => {
    const result = await getPool().query("SELECT current_database() AS name");

    expect(result.rows[0].name.endsWith("_test")).toBe(true);
  });
});