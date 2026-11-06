import { expect } from "vitest";
import { getPool } from "../../src/db/pool";
import { createUser, type TestUser } from "./db";

export interface SeededGroup {
  conversationId: string;
  admin: TestUser;
  mod: TestUser;
  member: TestUser;
  outsider: TestUser; // exists, but is NOT in the group
}

// Builds a group in a handful of queries, going around the service code on
// purpose: permission tests then don't all break because addMember has a bug.
export async function seedGroup(): Promise<SeededGroup> {
  const [admin, mod, member, outsider] = await Promise.all([
    createUser(),
    createUser(),
    createUser(),
    createUser(),
  ]);

  const { rows } = await getPool().query<{ id: string }>(
    `
    WITH conv AS (
      INSERT INTO conversations (type) VALUES ('gc') RETURNING id
    ),
    grp AS (
      INSERT INTO groups (conversation_id, admin_id, name, group_profile)
      SELECT id, $1::uuid, 'Test group', 'default_url' FROM conv
    )
    INSERT INTO conversation_participants (conversation_id, user_id, role)
    SELECT conv.id, m.user_id, m.role
    FROM conv,
         (VALUES ($1::uuid, 'admin'), ($2::uuid, 'mod'), ($3::uuid, 'member'))
           AS m(user_id, role)
    RETURNING conversation_id AS id
    `,
    [admin.id, mod.id, member.id]
  );

  const conversationId = rows[0]?.id;

  if (!conversationId) {
    throw new Error("seedGroup: nothing was inserted");
  }

  return { conversationId, admin, mod, member, outsider };
}

// { userId: role } for everyone in the conversation.
export async function getRoles(
  conversationId: string
): Promise<Record<string, string>> {
  const { rows } = await getPool().query<{ user_id: string; role: string }>(
    "SELECT user_id, role FROM conversation_participants WHERE conversation_id = $1",
    [conversationId]
  );

  return Object.fromEntries(rows.map((r) => [r.user_id, r.role]));
}

export async function getGroupAdminId(
  conversationId: string
): Promise<string | undefined> {
  const { rows } = await getPool().query<{ admin_id: string }>(
    "SELECT admin_id FROM groups WHERE conversation_id = $1",
    [conversationId]
  );

  return rows[0]?.admin_id;
}

// Changes a role directly in SQL, to set up a situation quickly.
export async function setRole(
  conversationId: string,
  userId: string,
  role: "member" | "mod"
): Promise<void> {
  await getPool().query(
    `
    UPDATE conversation_participants
    SET role = $3
    WHERE conversation_id = $1 AND user_id = $2
    `,
    [conversationId, userId, role]
  );
}

// "ok" if the call worked, the HTTP status if it threw an ApiError,
// or a description if it threw something unexpected (like a raw database error).
export function outcomeOf(
  result: PromiseSettledResult<unknown>
): "ok" | number | string {
  if (result.status === "fulfilled") return "ok";

  const error = result.reason as { statusCode?: number; status?: number };

  return (
    error.statusCode ?? error.status ?? `unexpected: ${String(result.reason)}`
  );
}

// Asserts that the call fails with an ApiError carrying this status code.
export async function expectApiError(
  promise: Promise<unknown>,
  status: number
): Promise<void> {
  let caught: unknown;

  try {
    await promise;
  } catch (error) {
    caught = error;
  }

  expect(caught, "the call should have thrown").toBeDefined();

  const error = caught as { statusCode?: number; status?: number };

  expect(error.statusCode ?? error.status, String(caught)).toBe(status);
}