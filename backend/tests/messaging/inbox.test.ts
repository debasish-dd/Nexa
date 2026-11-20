import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMessage } from "../../src/repositories/messaging/message.repository";
import { advanceLastReadMessage } from "../../src/repositories/messaging/participant.repository";
import { getInbox } from "../../src/services/messaging/conversation.service";
import { createDM } from "../../src/services/messaging/dm.service";
import { resetDatabase } from "../helpers/db";
import { seedGroup } from "../helpers/groups";
import { getPool } from "../../src/db/pool";

const onlyGroup = async (userId: string) => {
  const items = await getInbox(userId, 30, { includeGroups: true });
  const item = items.find((i) => i.type === "gc");

  if (!item || item.type !== "gc") {
    throw new Error("expected a group in the inbox");
  }

  return item;
};

const DEFAULT_AVATAR = "https://example.test/default.png";

describe("inbox with groups", () => {
  beforeEach(async () => {
    vi.stubEnv("DEFAULT_GROUP_PROFILE", DEFAULT_AVATAR);
    await resetDatabase();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("includes groups only when asked", async () => {
    const g = await seedGroup();

    expect(await getInbox(g.admin.id, 30)).toEqual([]);
    expect(await getInbox(g.admin.id, 30, { includeGroups: true })).toHaveLength(1);
  });

  it("shows a group nobody has written in yet, with its details", async () => {
    const g = await seedGroup();

    const item = await onlyGroup(g.admin.id);

    expect(item.conversationId).toBe(g.conversationId);
    expect(item.lastMessage).toBeNull();
    expect(item.unreadCount).toBe(0);
    expect(item.group).toEqual({
      name: "Test group",
      avatarUrl: DEFAULT_AVATAR, // the "default_url" placeholder never leaves the backend
      memberCount: 3,
      myRole: "admin",
    });
  });

  it("shows the last message with the sender's name and counts unread ones for others", async () => {
    const g = await seedGroup();

    await createMessage(g.conversationId, g.member.id, "one");
    await createMessage(g.conversationId, g.member.id, "two");

    const adminSees = await onlyGroup(g.admin.id);
    expect(adminSees.unreadCount).toBe(2);
    expect(adminSees.lastMessage?.content).toBe("two");
    expect(adminSees.lastMessage?.senderName).toBe(g.member.username);

    // Your own messages are never unread for you.
    const senderSees = await onlyGroup(g.member.id);
    expect(senderSees.unreadCount).toBe(0);
  });

  it("clears the unread count once the newest message is read", async () => {
    const g = await seedGroup();

    await createMessage(g.conversationId, g.member.id, "one");
    const newest = await createMessage(g.conversationId, g.member.id, "two");

    await advanceLastReadMessage(g.conversationId, g.admin.id, newest.id);

    expect((await onlyGroup(g.admin.id)).unreadCount).toBe(0);
  });

  it("mixes DMs and groups, newest activity first", async () => {
    const g = await seedGroup();

    await createMessage(g.conversationId, g.member.id, "in the group");

    const dm = await createDM(g.admin.id, g.outsider.id);
    await createMessage(dm.conversationId, g.outsider.id, "in the DM");

    let items = await getInbox(g.admin.id, 30, { includeGroups: true });
    expect(items.map((i) => i.type)).toEqual(["dm", "gc"]);

    await createMessage(g.conversationId, g.member.id, "group again");

    items = await getInbox(g.admin.id, 30, { includeGroups: true });
    expect(items.map((i) => i.type)).toEqual(["gc", "dm"]);
  });

  it("doesn't show a group to someone who isn't in it", async () => {
    const g = await seedGroup();

    expect(await getInbox(g.outsider.id, 30, { includeGroups: true })).toEqual([]);
  });
    it("passes a custom group avatar through unchanged", async () => {
    const g = await seedGroup();

    await getPool().query(
      "UPDATE groups SET group_profile = $2 WHERE conversation_id = $1",
      [g.conversationId, "https://example.test/custom.png"]
    );

    expect((await onlyGroup(g.admin.id)).group.avatarUrl).toBe(
      "https://example.test/custom.png"
    );
  });
});