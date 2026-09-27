export type DMConversation = {
  conversationId: string;
  dmPairId: string;
  user1Id: string;
  user2Id: string;
};

export type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
  deletedAt: string | null;
};