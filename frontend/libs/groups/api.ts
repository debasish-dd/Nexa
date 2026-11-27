import { http } from "@/libs/http/client";
import type {
  DMInboxItem,
  GroupDetails,
  GroupInboxItem,
  GroupInfo,
  GroupMember,
} from "@/types/chat";
import type { DiscoverablePage } from "@/types/community";

// ⚠️ Paths are relative to /api/v1. Check that the group router is mounted at /groups.

export async function createGroup(input: {
  name: string;
  description?: string | undefined;
}): Promise<GroupInfo> {
  const res = await http.post<{ data: GroupInfo }>("/groups", input);
  return res.data.data;
}

// Members only. Everyone else gets a 404.
export async function getGroup(conversationId: string): Promise<GroupDetails> {
  const res = await http.get<{ data: GroupDetails }>(`/groups/${conversationId}`);
  return res.data.data;
}


export async function getGroupInbox(
  limit = 10,
): Promise<GroupInboxItem[]> {
  const res = await http.get<{ data: GroupInboxItem[] }>(
    "/groups/conversations",
    {
      params: { limit },
    },
  );

  return res.data.data;
}


export async function getInbox(
  limit = 30,
): Promise<DMInboxItem[]> {
  const res = await http.get<{ data: DMInboxItem[] }>("/conversations", {
    params: { limit },
  });

  return res.data.data;
}
export async function updateGroup(
  conversationId: string,
  input: { name?: string | undefined; description?: string | null | undefined }
): Promise<GroupInfo> {
  const res = await http.patch<{ data: GroupInfo }>(
    `/groups/${conversationId}`,
    input
  );
  return res.data.data;
}

export async function deleteGroup(conversationId: string): Promise<void> {
  await http.delete(`/groups/${conversationId}`);
}

export async function addGroupMember(
  conversationId: string,
  userId: string
): Promise<GroupMember> {
  const res = await http.post<{ data: GroupMember }>(
    `/groups/${conversationId}/members`,
    { userId }
  );
  return res.data.data;
}

// Your own id means "leave the group".
export async function removeGroupMember(
  conversationId: string,
  userId: string
): Promise<void> {
  await http.delete(`/groups/${conversationId}/members/${userId}`);
}

export async function changeGroupMemberRole(
  conversationId: string,
  userId: string,
  role: "member" | "mod"
): Promise<GroupMember> {
  const res = await http.patch<{ data: GroupMember }>(
    `/groups/${conversationId}/members/${userId}/role`,
    { role }
  );
  return res.data.data;
}

export async function transferGroupAdmin(
  conversationId: string,
  userId: string
): Promise<GroupInfo> {
  const res = await http.post<{ data: GroupInfo }>(
    `/groups/${conversationId}/transfer-admin`,
    { userId }
  );
  return res.data.data;
}
export async function getDiscoverableGroups(
  offset = 0,
  limit = 20,
): Promise<DiscoverablePage> {
  const res = await http.get<{ data: DiscoverablePage }>(
    "/groups/discoverable",
    { params: { limit, offset } },
  );

  return res.data.data;
}

export async function joinDiscoverableGroup(
  conversationId: string,
): Promise<{ conversationId: string; joined: boolean }> {
  const res = await http.post<{
    data: { conversationId: string; joined: boolean };
  }>(`/groups/${conversationId}/join`);

  return res.data.data;
}