import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { getPool } from "../../src/db/pool";
import {
  addMember,
  changeMemberRole,
  createGC,
  deleteGroup,
  getGC,
  removeMember,
  transferAdmin,
  updateGroup,
} from "../../src/services/messaging/group.service";
import { createUser, resetDatabase } from "../helpers/db";
import {
  expectApiError,
  getGroupAdminId,
  getRoles,
  seedGroup,
  setRole,
} from "../helpers/groups";

type Who = "admin" | "mod" | "member";

describe("group permissions", () => {
  beforeEach(resetDatabase);

  describe("createGC", () => {
    it("makes the creator the admin, in the group and in the participants", async () => {
      const creator = await createUser();

      const group = await createGC(creator.id, { name: "  My group  " });

      expect(group.name).toBe("My group"); // trimmed
      expect(group.adminId).toBe(creator.id);
      expect(await getRoles(group.conversationId)).toEqual({
        [creator.id]: "admin",
      });
    });

    const badInputs: Array<[string, { name: unknown; groupProfile?: unknown }]> = [
      ["a missing name", { name: undefined }],
      ["a blank name", { name: "   " }],
      ["a name that isn't text", { name: 123 }],
      ["a name over 60 characters", { name: "x".repeat(61) }],
      ["a javascript: avatar URL", { name: "ok", groupProfile: "javascript:alert(1)" }],
    ];

    it.each(badInputs)("rejects %s with 400", async (_label, input) => {
      const creator = await createUser();

      await expectApiError(createGC(creator.id, input), 400);
    });
  });

  describe("getGC", () => {
    it("shows the members, admin first, plus the caller's own role", async () => {
      const g = await seedGroup();

      const details = await getGC(g.conversationId, g.mod.id);

      expect(details.myRole).toBe("mod");
      expect(details.members.map((m) => m.role)).toEqual(["admin", "mod", "member"]);
      expect(details.members[0]?.username).toBe(g.admin.username);
    });

    it("answers 404 to someone outside the group", async () => {
      const g = await seedGroup();

      await expectApiError(getGC(g.conversationId, g.outsider.id), 404);
    });
  });

  describe("updateGroup", () => {
    it("lets the admin and a mod edit", async () => {
      const g = await seedGroup();

      const byAdmin = await updateGroup(g.conversationId, g.admin.id, { name: "By admin" });
      expect(byAdmin.name).toBe("By admin");

      const byMod = await updateGroup(g.conversationId, g.mod.id, { name: "By mod" });
      expect(byMod.name).toBe("By mod");
    });

    it("refuses a plain member (403) and an outsider (404)", async () => {
      const g = await seedGroup();

      await expectApiError(updateGroup(g.conversationId, g.member.id, { name: "Nope" }), 403);
      await expectApiError(updateGroup(g.conversationId, g.outsider.id, { name: "Nope" }), 404);
    });

    it("changes only the fields that were sent", async () => {
      const g = await seedGroup();

      await updateGroup(g.conversationId, g.admin.id, { description: "About us" });
      const renamed = await updateGroup(g.conversationId, g.admin.id, { name: "Renamed" });

      expect(renamed.name).toBe("Renamed");
      expect(renamed.description).toBe("About us");
    });

    it("rejects an update with nothing in it (400)", async () => {
      const g = await seedGroup();

      await expectApiError(updateGroup(g.conversationId, g.admin.id, {}), 400);
    });
  });

  describe("deleteGroup", () => {
    it("refuses a mod (403), a member (403) and an outsider (404)", async () => {
      const g = await seedGroup();

      await expectApiError(deleteGroup(g.conversationId, g.mod.id), 403);
      await expectApiError(deleteGroup(g.conversationId, g.member.id), 403);
      await expectApiError(deleteGroup(g.conversationId, g.outsider.id), 404);
    });

    it("lets the admin delete it, taking the participants with it", async () => {
      const g = await seedGroup();

      await deleteGroup(g.conversationId, g.admin.id);

      const count = async (sql: string): Promise<number> =>
        (await getPool().query(sql, [g.conversationId])).rows[0].n;

      expect(await count("SELECT count(*)::int AS n FROM groups WHERE conversation_id = $1")).toBe(0);
      expect(await count("SELECT count(*)::int AS n FROM conversations WHERE id = $1")).toBe(0);
      expect(
        await count("SELECT count(*)::int AS n FROM conversation_participants WHERE conversation_id = $1")
      ).toBe(0);
    });
  });

  describe("addMember", () => {
    it("lets the admin add someone as a regular member", async () => {
      const g = await seedGroup();

      const added = await addMember(g.conversationId, g.admin.id, g.outsider.id);

      expect(added.role).toBe("member");
      expect(added.username).toBe(g.outsider.username);
    });

    it("lets a mod add someone", async () => {
      const g = await seedGroup();

      await addMember(g.conversationId, g.mod.id, g.outsider.id);

      expect(await getRoles(g.conversationId)).toHaveProperty(g.outsider.id, "member");
    });

    it("refuses a member (403) and an outsider (404)", async () => {
      const g = await seedGroup();
      const someoneNew = await createUser();

      await expectApiError(addMember(g.conversationId, g.member.id, someoneNew.id), 403);
      await expectApiError(addMember(g.conversationId, g.outsider.id, someoneNew.id), 404);
    });

    it("answers 409 when the person is already in", async () => {
      const g = await seedGroup();

      await expectApiError(addMember(g.conversationId, g.admin.id, g.member.id), 409);
    });

    it("answers 404 for a user that doesn't exist", async () => {
      const g = await seedGroup();

      await expectApiError(addMember(g.conversationId, g.admin.id, randomUUID()), 404);
    });

    it("answers 400 for a malformed id", async () => {
      const g = await seedGroup();

      await expectApiError(addMember(g.conversationId, g.admin.id, "not-a-uuid"), 400);
    });
  });

  describe("removeMember", () => {
    const allowedKicks: Array<[Who, Who]> = [
      ["admin", "mod"],
      ["admin", "member"],
      ["mod", "member"],
    ];

    it.each(allowedKicks)("%s can remove a %s", async (caller, target) => {
      const g = await seedGroup();

      await removeMember(g.conversationId, g[caller].id, g[target].id);

      expect(await getRoles(g.conversationId)).not.toHaveProperty(g[target].id);
    });

    it("refuses a mod removing the admin, and a member removing anyone above them (403)", async () => {
      const g = await seedGroup();

      await expectApiError(removeMember(g.conversationId, g.mod.id, g.admin.id), 403);
      await expectApiError(removeMember(g.conversationId, g.member.id, g.mod.id), 403);
      await expectApiError(removeMember(g.conversationId, g.member.id, g.admin.id), 403);

      expect(Object.keys(await getRoles(g.conversationId))).toHaveLength(3);
    });

    it("refuses a mod removing another mod (403)", async () => {
      const g = await seedGroup();
      await setRole(g.conversationId, g.member.id, "mod");

      await expectApiError(removeMember(g.conversationId, g.mod.id, g.member.id), 403);
    });

    it("lets a member and a mod leave", async () => {
      const g = await seedGroup();

      await removeMember(g.conversationId, g.member.id, g.member.id);
      await removeMember(g.conversationId, g.mod.id, g.mod.id);

      expect(await getRoles(g.conversationId)).toEqual({ [g.admin.id]: "admin" });
    });

    it("doesn't let the admin leave (409)", async () => {
      const g = await seedGroup();

      await expectApiError(removeMember(g.conversationId, g.admin.id, g.admin.id), 409);
    });

    it("answers 404 when removing someone who isn't in the group", async () => {
      const g = await seedGroup();

      await expectApiError(removeMember(g.conversationId, g.admin.id, g.outsider.id), 404);
    });
  });

  describe("changeMemberRole", () => {
    it("lets the admin promote a member to mod and demote a mod to member", async () => {
      const g = await seedGroup();

      const promoted = await changeMemberRole(g.conversationId, g.admin.id, g.member.id, "mod");
      expect(promoted.role).toBe("mod");

      const demoted = await changeMemberRole(g.conversationId, g.admin.id, g.mod.id, "member");
      expect(demoted.role).toBe("member");
    });

    it("refuses a mod and a member as the caller (403)", async () => {
      const g = await seedGroup();

      await expectApiError(changeMemberRole(g.conversationId, g.mod.id, g.member.id, "mod"), 403);
      await expectApiError(changeMemberRole(g.conversationId, g.member.id, g.mod.id, "member"), 403);
    });

    it("rejects the role 'admin', unknown roles and changing your own role (400)", async () => {
      const g = await seedGroup();

      await expectApiError(changeMemberRole(g.conversationId, g.admin.id, g.member.id, "admin"), 400);
      await expectApiError(changeMemberRole(g.conversationId, g.admin.id, g.member.id, "owner"), 400);
      await expectApiError(changeMemberRole(g.conversationId, g.admin.id, g.admin.id, "mod"), 400);
    });

    it("answers 404 for someone who isn't in the group", async () => {
      const g = await seedGroup();

      await expectApiError(changeMemberRole(g.conversationId, g.admin.id, g.outsider.id, "mod"), 404);
    });
  });

  describe("transferAdmin", () => {
    it("makes the target the admin and the old admin a mod, in both places", async () => {
      const g = await seedGroup();

      const result = await transferAdmin(g.conversationId, g.admin.id, g.member.id);

      expect(result.adminId).toBe(g.member.id);
      expect(await getGroupAdminId(g.conversationId)).toBe(g.member.id);
      expect(await getRoles(g.conversationId)).toEqual({
        [g.member.id]: "admin",
        [g.admin.id]: "mod",
        [g.mod.id]: "mod",
      });
    });

    it("lets the old admin leave afterwards", async () => {
      const g = await seedGroup();

      await transferAdmin(g.conversationId, g.admin.id, g.member.id);
      await removeMember(g.conversationId, g.admin.id, g.admin.id);

      expect(await getRoles(g.conversationId)).not.toHaveProperty(g.admin.id);
    });

    it("refuses a mod (403), a member (403) and an outsider (404) as the caller", async () => {
      const g = await seedGroup();

      await expectApiError(transferAdmin(g.conversationId, g.mod.id, g.member.id), 403);
      await expectApiError(transferAdmin(g.conversationId, g.member.id, g.mod.id), 403);
      await expectApiError(transferAdmin(g.conversationId, g.outsider.id, g.member.id), 404);
    });

    it("answers 404 when the target isn't in the group", async () => {
      const g = await seedGroup();

      await expectApiError(transferAdmin(g.conversationId, g.admin.id, g.outsider.id), 404);
    });

    it("answers 400 when you transfer to yourself", async () => {
      const g = await seedGroup();

      await expectApiError(transferAdmin(g.conversationId, g.admin.id, g.admin.id), 400);
    });
  });
});