import { beforeEach, describe, expect, it } from "vitest";
import { getPool } from "../../src/db/pool";
import {
  createMessage,
  getMessages,
} from "../../src/repositories/messaging/message.repository";
import { createDM } from "../../src/services/messaging/dm.service";
import { createUser, resetDatabase } from "../helpers/db";

const PAGE_SIZE = 50;
const TOTAL = 120;

// Inserts TOTAL messages that all carry the exact same timestamp.
async function seedTiedMessages() {
  const a = await createUser();
  const b = await createUser();
  const { conversationId } = await createDM(a.id, b.id);

  await getPool().query(
    `
    INSERT INTO messages (conversation_id, sender_id, content, created_at)
    SELECT $1::uuid, $2::uuid, 'message ' || n, $3::timestamptz
    FROM generate_series(1, $4::int) AS n
    `,
    [conversationId, a.id, new Date("2026-01-01T00:00:00.000Z"), TOTAL]
  );

  const { rows } = await getPool().query<{ id: string }>(
    "SELECT id FROM messages WHERE conversation_id = $1",
    [conversationId]
  );

  return { a, b, conversationId, allIds: rows.map((r) => r.id) };
}

describe("getMessages paging", () => {
  beforeEach(resetDatabase);

  it("walks through 120 messages with identical timestamps without skipping or repeating any", async () => {
    const { conversationId, allIds } = await seedTiedMessages();

    const seen: string[] = [];
    let before: string | undefined;

    // The loop limit is only a safety net, so a bug can't loop forever.
    for (let i = 0; i < 10; i++) {
      const page = await getMessages(conversationId, PAGE_SIZE, before);
      seen.push(...page.map((m) => m.id));

      if (page.length < PAGE_SIZE) break;

      // Results are newest-first, so the last one is the oldest on this page.
      before = page[page.length - 1]!.id;
    }

    expect(seen).toHaveLength(TOTAL);
    expect(new Set(seen).size).toBe(TOTAL);
    expect(new Set(seen)).toEqual(new Set(allIds));
  });

  it("new messages arriving mid-scroll don't shift or duplicate the pages", async () => {
    const { a, conversationId, allIds } = await seedTiedMessages();

    const first = await getMessages(conversationId, PAGE_SIZE);
    expect(first).toHaveLength(PAGE_SIZE);

    // Someone sends 5 new messages while the user is scrolling up.
    for (let i = 0; i < 5; i++) {
      await createMessage(conversationId, a.id, `new ${i}`);
    }

    const rest: string[] = [];
    let before = first[first.length - 1]!.id;

    for (let i = 0; i < 10; i++) {
      const page = await getMessages(conversationId, PAGE_SIZE, before);
      rest.push(...page.map((m) => m.id));

      if (page.length < PAGE_SIZE) break;
      before = page[page.length - 1]!.id;
    }

    const all = [...first.map((m) => m.id), ...rest];

    expect(new Set(all).size).toBe(all.length); // no duplicates
    expect(all).toHaveLength(TOTAL); // none skipped, and none of the 5 new ones
    expect(new Set(all)).toEqual(new Set(allIds));
  });

  it("a cursor from another conversation returns nothing", async () => {
    const { a, conversationId } = await seedTiedMessages();

    const c = await createUser();
    const other = await createDM(a.id, c.id);
    const foreign = await createMessage(other.conversationId, a.id, "elsewhere");

    const page = await getMessages(conversationId, PAGE_SIZE, foreign.id);

    expect(page).toEqual([]);
  });
});