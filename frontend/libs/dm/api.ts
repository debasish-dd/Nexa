import { http } from "@/libs/http/client";
import type { DMConversation, InboxItem, Message } from "@/types/chat";



// ---------- DMs ----------

// Start a DM with someone, or get the existing one. Safe to call many times.
export async function createOrGetDM(otherUserId: string): Promise<DMConversation> {
  const res = await http.post<{ data: DMConversation }>("/dms", {
    userId: otherUserId,
  });
  
  return res.data.data;
}


// Deletes the whole conversation for BOTH users.
export async function deleteDM(conversationId: string): Promise<void> {
  await http.delete(`/dms/${conversationId}`);
}

// ---------- Messages ----------

export async function getMessageHistory(
  conversationId: string,
  limit = 50,
  before?: string
): Promise<Message[]> {
  const res = await http.get<{ data: Message[] }>(
    `/conversations/${conversationId}/messages`,
    { params: { limit, before } }
  );
  return res.data.data;
}

export async function sendMessage(
  conversationId: string,
  content: string
): Promise<Message> {
  const res = await http.post<{ data: Message }>(
    `/conversations/${conversationId}/messages`,
    { content }
  );
  return res.data.data;
}

// Only works on your own messages (the backend enforces this).
export async function editMessage(
  conversationId: string,
  messageId: string,
  content: string
): Promise<Message> {
  const res = await http.patch<{ data: Message }>(
    `/conversations/${conversationId}/messages/${messageId}`,
    { content }
  );
  return res.data.data;
}

// Soft delete: the message comes back with deletedAt set.
export async function deleteMessage(
  conversationId: string,
  messageId: string
): Promise<Message> {
  const res = await http.delete<{ data: Message }>(
    `/conversations/${conversationId}/messages/${messageId}`
  );
  return res.data.data;
}

export async function markConversationRead(
  conversationId: string,
  messageId: string
): Promise<void> {
  await http.post(`/conversations/${conversationId}/read`, { messageId });
}


// ⚠️ Same mount-path assumption: the conversation router lives at /conversations.
export async function getInbox(limit = 30): Promise<InboxItem[]> {
  const res = await http.get<{ data: InboxItem[] }>("/conversations", {
    params: { limit },
  });
  return res.data.data;
}