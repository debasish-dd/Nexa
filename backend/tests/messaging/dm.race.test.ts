import { beforeEach, describe, expect, it } from "vitest";
import { getPool } from "../../src/db/pool";
import { createDM } from "../../src/services/messaging/dm.service";
import { createUser, resetDatabase } from "../helpers/db";

const countRows = async (table: string): Promise<number> => {
  const { rows } = await getPool().query(
    `SELECT count(*)::int AS n FROM ${table}`
  );
  return rows[0].n;
};

describe("createDM", () => {
  beforeEach(resetDatabase);

  it("20 simultaneous calls, in both argument orders, create exactly one DM", async () => {
    const a = await createUser();
    const b = await createUser();

    // Half the calls are (A, B) and half are (B, A).
    const calls = Array.from({ length: 20 }, (_, i) =>
      i % 2 === 0 ? createDM(a.id, b.id) : createDM(b.id, a.id)
    );

    // allSettled instead of all, so a failure reports every reason, not just the first.
    const results = await Promise.allSettled(calls);

    // 1. No call may throw. A call that loses the race must recover and
    //    return the DM that the winner created.
    const failures = results.flatMap((r) =>
      r.status === "rejected" ? [String(r.reason)] : []
    );
    expect(failures).toEqual([]);

    // 2. Every call returned the same conversation.
    const ids = results.flatMap((r) =>
      r.status === "fulfilled" ? [r.value.conversationId] : []
    );
    expect(ids).toHaveLength(20);
    expect(new Set(ids).size).toBe(1);

    // 3. The database holds exactly one DM, and the returned id is that DM.
    expect(await countRows("dm_pairs")).toBe(1);
    expect(await countRows("conversations")).toBe(1);
    expect(await countRows("conversation_participants")).toBe(2);

    const { rows } = await getPool().query(
      "SELECT conversation_id AS id FROM dm_pairs"
    );
    expect(ids[0]).toBe(rows[0].id);
  });

  it("returns the same DM when called again later, in either order", async () => {
    const a = await createUser();
    const b = await createUser();

    const first = await createDM(a.id, b.id);
    const second = await createDM(b.id, a.id);

    expect(second.conversationId).toBe(first.conversationId);
    expect(await countRows("dm_pairs")).toBe(1);
  });
});