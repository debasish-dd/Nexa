import { http } from "@/libs/http/client";
import type { PublicUser } from "@/types/user";

// ⚠️ PLACEHOLDER — this endpoint hasn't been confirmed at all. Assuming
// GET /users/:identifier (accepting either a username or a UUID), returning
// the user flat under "data" like every other endpoint confirmed so far.
// Needs a real controller to match against.
export async function findUser(identifier: string): Promise<PublicUser> {
  const res = await http.get<{ data: PublicUser }>(`/users/${identifier}`);
  return res.data.data;
}