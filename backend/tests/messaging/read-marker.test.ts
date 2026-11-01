import { beforeEach, describe, expect, it } from "vitest";
import { getPool } from "../../src/db/pool";
import { createMessage } from "../../src/repositories/messaging/message.repository";
import { advanceLastReadMessage } from "../../src/repositories/messaging/participant.repository";
import { createDM } from "../../src/services/messaging/dm.service";
import { createUser, resetDatabase } from "../helpers/db";

const getMarker = async (conversationId: string, userId: string) => {
  const { rows } = await getPool().query<{ id: string | null }>(
    `
    SELECT last_read_message_id AS id
    FROM conversation_participants
    WHERE conversation_id = $1 AND user_id = $2
    `,
    [conversationId, userId]
  );
  return rows[0]?.id ?? null;
};

const setMarker = async (
  conversationId: string,
  userId: string,
  messageId: string | null
) => {
  await getPool().query(
    `
    UPDATE conversation_participants
    SET last_read_message_id = $3
    WHERE conversation_id = $1 AND user_id = $2
    `,
    [conversationId, userId, messageId]
  );
};

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j] as T, copy[i] as T];
  }
  return copy;
}

// A reader, a sender, their DM, and three messages sent one after another.
async function setup() {
  const reader = await createUser();
  const sender = await createUser();
  const { conversationId } = await createDM(reader.id, sender.id);

  const m1 = await createMessage(conversationId, sender.id, "one");
  const m2 = await createMessage(conversationId, sender.id, "two");
  const m3 = await createMessage(conversationId, sender.id, "three");

  return { reader, sender, conversationId, m1, m2, m3 };
}

describe("advanceLastReadMessage", () => {
  beforeEach(resetDatabase);

  it("ends on the newest message, whatever order the requests arrive in", async () => {
    const { reader, conversationId, m1, m2, m3 } = await setup();

    for (let round = 0; round < 20; round++) {
      await setMarker(conversationId, reader.id, null);

      await Promise.all(
        shuffle([m1.id, m2.id, m3.id]).map((id) =>
          advanceLastReadMessage(conversationId, reader.id, id)
        )
      );

      expect(
        await getMarker(conversationId, reader.id),
        `round ${round}`
      ).toBe(m3.id);
    }
  });

  it("moves forward but never backward", async () => {
    const { reader, conversationId, m1, m2, m3 } = await setup();

    expect(await advanceLastReadMessage(conversationId, reader.id, m2.id)).toBe(true);
    expect(await getMarker(conversationId, reader.id)).toBe(m2.id);

    expect(await advanceLastReadMessage(conversationId, reader.id, m3.id)).toBe(true);
    expect(await getMarker(conversationId, reader.id)).toBe(m3.id);

    // Trying to go back to an older message changes nothing.
    expect(await advanceLastReadMessage(conversationId, reader.id, m1.id)).toBe(false);
    expect(await getMarker(conversationId, reader.id)).toBe(m3.id);
  });

  it("ignores a message that belongs to a different conversation", async () => {
    const { reader, sender, conversationId } = await setup();

    const other = await createUser();
    const otherDM = await createDM(sender.id, other.id);
    const foreign = await createMessage(otherDM.conversationId, sender.id, "elsewhere");

    const moved = await advanceLastReadMessage(conversationId, reader.id, foreign.id);

    expect(moved).toBe(false);
    expect(await getMarker(conversationId, reader.id)).toBeNull();
  });

  it("ignores someone who isn't in the conversation", async () => {
    const { conversationId, m1 } = await setup();
    const stranger = await createUser();

    const moved = await advanceLastReadMessage(conversationId, stranger.id, m1.id);

    expect(moved).toBe(false);
  });
});