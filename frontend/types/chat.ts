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
  editedAt?: string | null;
  deletedAt?: string | null;
  
};

export interface InboxItem {
  conversationId: string;
  otherUser: {
    id: string;
    username: string;
    avatarUrl: string | null;
  };
  lastMessage: {
    id: string;
    senderId: string;
    content: string | null; // null when the message was deleted
    createdAt: string; // JSON turns Dates into strings
    isDeleted: boolean;
  };
}