import {
    findConversationById,
    getConversationType,
    getGroupInboxForUser,
    getInboxForUser,
    type GroupInboxRow,
} from "../../repositories/messaging/conversation.repository";
import { ApiError } from "../../utils/api-error";
import {
    advanceLastReadMessage,
    isParticipant,
} from "../../repositories/messaging/participant.repository";
import { resolveGroupAvatar } from "../../utils/group-avatar";


// The placeholder avatar stored when nobody chose one.

interface InboxMessage {
    id: string;
    senderId: string;
    content: string | null;
    createdAt: Date;
    isDeleted: boolean;
}

export interface DMInboxItem {
    type: "dm";
    conversationId: string;
    unreadCount: number;
    otherUser: { id: string; username: string; avatarUrl: string | null };
    lastMessage: InboxMessage;
    lastActivityAt: Date;
}

export interface GroupInboxItem {
    type: "gc";
    conversationId: string;
    unreadCount: number;
    group: {
        name: string;
        avatarUrl: string | null;
        memberCount: number;
        myRole: "member" | "mod" | "admin";
    };
    // null for a group nobody has written in yet
    lastMessage: (InboxMessage & { senderName: string | null }) | null;
    lastActivityAt: Date;
}

export type InboxItem = DMInboxItem | GroupInboxItem;


const DEFAULT_INBOX_LIMIT = 30;
const MAX_INBOX_LIMIT = 100;


export const getConversation = async (conversationId: string) => {
    return findConversationById(conversationId);
};


export const getConversationTypeById = async (conversationId: string) => {
    return getConversationType(conversationId);
};


export const getInbox = async (
    userId: string,
    limit: number = DEFAULT_INBOX_LIMIT,
    options: { includeGroups?: boolean } = {},
): Promise<InboxItem[]> => {
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_INBOX_LIMIT) {
        throw new ApiError(
            400,
            `Limit must be a whole number between 1 and ${MAX_INBOX_LIMIT}`,
        );
    }

    const [dmRows, groupRows] = await Promise.all([
        getInboxForUser(userId, limit),
        options.includeGroups
            ? getGroupInboxForUser(userId, limit)
            : Promise.resolve<GroupInboxRow[]>([]),
    ]);

    const dmItems: DMInboxItem[] = dmRows.map((row) => ({
        type: "dm",
        conversationId: row.conversationId,
        unreadCount: row.unreadCount,
        otherUser: {
            id: row.otherUserId,
            username: row.otherUsername,
            avatarUrl: row.otherUserAvatar,
        },
        lastMessage: {
            id: row.lastMessageId,
            senderId: row.lastMessageSenderId,
            content: row.lastMessageContent,
            createdAt: row.lastMessageCreatedAt,
            isDeleted: row.lastMessageDeletedAt !== null,
        },
        lastActivityAt: row.lastMessageCreatedAt,
    }));

    const groupItems: GroupInboxItem[] = groupRows.map((row) => ({
        type: "gc",
        conversationId: row.conversationId,
        unreadCount: row.unreadCount,
                group: {
            name: row.groupName,
            avatarUrl: resolveGroupAvatar(row.groupProfile),
            memberCount: row.memberCount,
            myRole: row.myRole,
        },
        lastMessage:
            row.lastMessageId &&
            row.lastMessageSenderId &&
            row.lastMessageCreatedAt
                ? {
                      id: row.lastMessageId,
                      senderId: row.lastMessageSenderId,
                      senderName: row.lastMessageSenderName,
                      content: row.lastMessageContent,
                      createdAt: row.lastMessageCreatedAt,
                      isDeleted: row.lastMessageDeletedAt !== null,
                  }
                : null,
        lastActivityAt: row.lastMessageCreatedAt ?? row.groupCreatedAt,
    }));

    // Newest activity first. Each query was limited on its own, so the newest
    // `limit` of the combined list are guaranteed to be inside the two sets.
    return [...dmItems, ...groupItems]
        .sort((a, b) => b.lastActivityAt.getTime() - a.lastActivityAt.getTime())
        .slice(0, limit);
};


export const markConversationRead = async (
    conversationId: string,
    userId: string,
    messageId: string,
) => {
    const participant = await isParticipant(conversationId, userId);

    if (!participant) {
        throw new ApiError(
            403,
            "User is not a participant in this conversation",
        );
    }

    try {
        await advanceLastReadMessage(conversationId, userId, messageId);
    } catch (error) {
        // 22P02 = malformed id
        if (
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            error.code === "22P02"
        ) {
            throw new ApiError(400, "Invalid message id");
        }
        throw error;
    }
};

