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

export type GroupRole = "member" | "mod" | "admin";

export interface GroupMember {
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: GroupRole;
  joinedAt: string;
}

export interface GroupInfo {
  conversationId: string;
  adminId: string;
  name: string;
  description: string | null;
  groupProfile: string | null; // avatar URL, null when there is none
  createdAt: string;
}

export interface GroupDetails extends GroupInfo {
  myRole: GroupRole;
  members: GroupMember[];
}

interface InboxMessage {
  id: string;
  senderId: string;
  content: string | null; // null when the message was deleted
  createdAt: string; // JSON turns Dates into strings
  isDeleted: boolean;
}

export interface DMInboxItem {
  type: "dm";
  conversationId: string;
  unreadCount: number;
  otherUser: {
    id: string;
    username: string;
    avatarUrl: string | null;
  };
  lastMessage: InboxMessage;
  lastActivityAt: string;
}

export interface GroupInboxItem {
  type: "gc";
  conversationId: string;
  unreadCount: number;
  group: {
    name: string;
    avatarUrl: string | null;
    memberCount: number;
    myRole: GroupRole;
  };
  // null for a group nobody has written in yet
  lastMessage: (InboxMessage & { senderName: string | null }) | null;
  lastActivityAt: string;
}

export type InboxItem = DMInboxItem | GroupInboxItem;