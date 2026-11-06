import { beforeEach, describe, expect, it } from "vitest";
import { getPool } from "../../src/db/pool";
import {
  addMember,
  createGC,
  removeMember,
  transferAdmin,
} from "../../src/services/messaging/group.service";
import { createUser, resetDatabase } from "../helpers/db";
import { getGroupAdminId, getRoles, outcomeOf, seedGroup } from "../helpers/groups";

describe("group concurrency", () => {
  beforeEach(resetDatabase);

  it("a transfer racing the admin leaving always ends with exactly one admin", async () => {
    for (let round = 0; round < 6; round++) {
      await resetDatabase();
      const g = await seedGroup();

      const results = await Promise.allSettled([
        transferAdmin(g.conversationId, g.admin.id, g.member.id),
        removeMember(g.conversationId, g.admin.id, g.admin.id),
      ]);

      const admins = Object.entries(await getRoles(g.conversationId)).filter(
        ([, role]) => role === "admin"
      );

      expect(admins, `round ${round}`).toHaveLength(1);
      expect(await getGroupAdminId(g.conversationId), `round ${round}`).toBe(admins[0]?.[0]);

      // The transfer always works. The leave is either refused (409, it ran
      // first) or works (it ran after the transfer turned the admin into a mod).
      expect(outcomeOf(results[0]!), `round ${round}`).toBe("ok");
      expect(["ok", 409], `round ${round}`).toContain(outcomeOf(results[1]!));
    }
  }, 60_000);

  it("two simultaneous transfers: one wins, the other is refused, one admin remains", async () => {
    const g = await seedGroup();

    const results = await Promise.allSettled([
      transferAdmin(g.conversationId, g.admin.id, g.mod.id),
      transferAdmin(g.conversationId, g.admin.id, g.member.id),
    ]);

    const outcomes = results.map(outcomeOf);

    expect(outcomes.filter((o) => o === "ok")).toHaveLength(1);
    expect(outcomes.filter((o) => o === 403)).toHaveLength(1);

    const admins = Object.entries(await getRoles(g.conversationId)).filter(
      ([, role]) => role === "admin"
    );

    expect(admins).toHaveLength(1);
    expect(await getGroupAdminId(g.conversationId)).toBe(admins[0]?.[0]);
  });

  it("adding the same person 10 times at once creates one membership and clean 409s", async () => {
    const g = await seedGroup();

    const results = await Promise.allSettled(
      Array.from({ length: 10 }, () =>
        addMember(g.conversationId, g.admin.id, g.outsider.id)
      )
    );

    const outcomes = results.map(outcomeOf);

    expect(outcomes.filter((o) => o === "ok")).toHaveLength(1);
    expect(outcomes.filter((o) => o === 409)).toHaveLength(9);
    // admin, mod, member, plus the one new person
    expect(Object.keys(await getRoles(g.conversationId))).toHaveLength(4);
  });

  it("a member leaving while a mod kicks them ends cleanly", async () => {
    const g = await seedGroup();

    const results = await Promise.allSettled([
      removeMember(g.conversationId, g.mod.id, g.member.id), // the kick
      removeMember(g.conversationId, g.member.id, g.member.id), // the leave
    ]);

    const outcomes = results.map(outcomeOf);

    expect(outcomes.filter((o) => o === "ok")).toHaveLength(1);
    expect(outcomes.filter((o) => o === 404)).toHaveLength(1);
    expect(await getRoles(g.conversationId)).not.toHaveProperty(g.member.id);
  });

  it("the database refuses a second admin even if the code is bypassed", async () => {
    const g = await seedGroup();

    await expect(
      getPool().query(
        `
        UPDATE conversation_participants
        SET role = 'admin'
        WHERE conversation_id = $1 AND user_id = $2
        `,
        [g.conversationId, g.mod.id]
      )
    ).rejects.toMatchObject({ code: "23505" });
  });

  it("creates 15 groups at once without exhausting the connection pool", async () => {
    const creator = await createUser();

    const results = await Promise.allSettled(
      Array.from({ length: 15 }, (_, i) => createGC(creator.id, { name: `Group ${i}` }))
    );

    expect(results.filter((r) => r.status === "rejected")).toHaveLength(0);

    const ids = results.map((r) => (r.status === "fulfilled" ? r.value.conversationId : null));

    expect(new Set(ids).size).toBe(15);
  });
});