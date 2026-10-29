import { http } from "@/libs/http/client";
import type { PublicUser, PublicUserProfile, UserSearchResponse } from "@/types/user";

// Calls GET /users/search?q=<text> (the /api/v1 prefix comes from the shared
// axios instance) and returns the matching users.
// ⚠️ Assumes the usual envelope { data: { users: [...] } }. If your backend
// uses a different path or query-param name, this is the one place to fix it.
export async function searchUsers(query: string): Promise<PublicUser[]> {
  const res = await http.get<{ data: UserSearchResponse }>("/users/search", {
    params: { q: query },
  });
  return res.data.data.users;
}

export async function getUserById(userId: string): Promise<PublicUserProfile> {
  const res = await http.get<{ data: { user: PublicUserProfile } }>(
    `/users/${encodeURIComponent(userId)}`
  );
  return res.data.data.user;
}