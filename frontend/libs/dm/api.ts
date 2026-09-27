import { http } from "@/libs/http/client";
import type { DMConversation, Message } from "@/types/chat";

// ⚠️ Same mount-path assumption as before: /dms and /conversations/:id/messages.
// Verify against your actual route-mounting file if this 404s.

export async function createOrGetDM(otherUserId: string): Promise<DMConversation> {
  const res = await http.post<{ data: DMConversation }>("/dms", {
    userId: otherUserId,
  });
  return res.data.data;
}

export async function getMessageHistory(
  conversationId: string,
  limit = 50
): Promise<Message[]> {
  const res = await http.get<{ data: Message[] }>(
    `/conversations/${conversationId}/messages`,
    { params: { limit } }
  );
  return res.data.data;
}